// Controller principale: possiede stato di gioco, scena, camera, attori e UI.
// Ogni azione del giocatore passa da `act()`: regola pura → ricompense →
// espansione/achievement → salvataggio → sincronizzazione della vista.

import * as THREE from 'three';
import { BUSINESS, FOREST_MARGIN, GRAVE_FOOTPRINT, KEEPER_LAMP, LIVE_TICK_MS, SOUL_BELL, STAFF, ZOMBIE_MUD } from '../game/balance.ts';
import { CATALOG, CATALOG_LIST, rotatedFootprint } from '../game/catalog.ts';
import type { GraveVisualState } from '../game/graves.ts';
import { graveVisualState } from '../game/graves.ts';
import * as R from '../game/rules.ts';
import { catchUpMessage, liveTick, runCatchUp } from '../game/simulation.ts';
import { createNewGame, type ArtStyle, type Quality, type QualitySetting, type SaveData, type TimeOverride } from '../game/state.ts';
import { dayPhaseForHour, type DayPhase } from '../game/time.ts';
import type { CustodeLook } from '../game/look.ts';
import { areaForLevel, buildOccupancy, canPlaceAt, gateCells, nearestFreeSpot } from '../game/world.ts';
import { applyStyleUniforms, cacheStats, clearAll, getModel, instantiate, LOWPOLY_MATERIALS, LOWPOLY_TERRAIN, MATERIALS } from '../render/modelCache.ts';
import '../render/lowpoly/index.ts';
import { setVoxelResolution, voxelResolution, voxelsPerWorldUnit } from '../render/voxelMesher.ts';
import { graveModel } from '../render/models/graves.ts';
import { placeableKey, placeableModel, placeableSeed, seedCount, type PVis } from '../render/models/registry.ts';
import { UI } from '../ui/UI.ts';
import { drawerOpen, floater, toast } from '../ui/dom.ts';
import { Actors, graveSpots, type PetMode, type VisitStop } from '../view/Actors.ts';
import { Atmosphere } from '../view/Atmosphere.ts';
import { CameraRig } from '../view/CameraRig.ts';
import { Effects } from '../view/Effects.ts';
import { ForestMist } from '../view/ForestMist.ts';
import { PostFX } from '../view/PostFX.ts';
import { cellCenter, HALF, worldToCell, WorldView } from '../view/WorldView.ts';
import { WalkTarget } from '../view/walkTarget.ts';
import { AUTO_STEPS, AutoGovernor, detectTier, TIER_LABELS, TIERS, type AutoProfile } from './AutoQuality.ts';
import { Input } from './Input.ts';
import { loadSave, persistenceOn, saveNow, scheduleSave } from './persistence.ts';
import { closedCoffinLP } from '../render/lowpoly/memoryTree.ts';

export type Selection = { kind: 'grave' | 'placeable'; id: string } | null;

export type EntityAction =
  | 'detail' | 'clean' | 'repair' | 'flowers' | 'light' | 'shop' | 'rotate' | 'store' | 'confirm' | 'exhume' | 'move' | 'entrust' | 'memories' | 'ring';

const PET_STATUS: Record<PetMode, string> = { free: 'Gira libero', follow: 'Ti segue', home: 'A cuccia' };

export interface Placement {
  kind: 'grave' | 'item';
  draft?: R.BurialDraft;
  type?: string;
  x: number;
  y: number;
  rot: number;
  valid: boolean;
}

export const STYLE_CYCLE: ArtStyle[] = ['lowpoly', 'voxel', 'miniature'];
export const STYLE_LABELS: Record<ArtStyle, string> = { lowpoly: 'Gothic Low-Poly', voxel: 'Gothic Voxel', miniature: 'Miniatura' };

/** Densità dei voxel per qualità (voxel per unità di design; 10 unità = 1 cella). */
const VOXEL_RES: Record<Quality, number> = { low: 1.0, medium: 1.6, high: 2.0 };

export class Game {
  state: SaveData;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig = new CameraRig();
  readonly atmosphere: Atmosphere;
  readonly world: WorldView;
  readonly actors: Actors;
  readonly effects: Effects;
  readonly ui: UI;
  readonly input: Input;
  readonly raycaster = new THREE.Raycaster();
  selection: Selection = null;
  editMode = false;
  placement: Placement | null = null;
  /** Tomba affidata e albero mentre il corteo del rito è in scena: non si spostano né si tolgono. */
  private riteIds: string[] | null = null;
  private drag: { id: string; x: number; y: number; valid: boolean; grab: THREE.Vector3 } | null = null;
  private clock = new THREE.Clock();
  private phase: DayPhase = 'night';
  /** Nebbia in movimento nel bosco attorno al recinto (?mist=0 la spegne, per sviluppo). */
  private mist: ForestMist | null = null;
  private liveTimer = 6;
  private liveSalt = 0;
  private phaseTimer = 0;
  private hudTimer = 0;
  private fps = { frames: 0, time: 0, value: 0 };
  private disposed = false;
  private canvas: HTMLCanvasElement;
  private postfx: PostFX;
  private focusNdc = new THREE.Vector3();
  /** Il cerchio dorato sul punto dove sta andando il Custode. */
  private readonly walkMark = new WalkTarget();

  /**
   * `state`: parte da questo stato invece che dal salvataggio; `prewarm: false` non genera modelli in anticipo;
   * `antialias: false` toglie l'antialiasing dello schermo (pagina delle misure: lì lo decide la sfocatura).
   */
  constructor(canvas: HTMLCanvasElement, opts: { state?: SaveData; prewarm?: boolean; antialias?: boolean } = {}) {
    this.canvas = canvas;
    const now = new Date();
    const params = new URLSearchParams(location.search);
    const urlSeed = Number(params.get('seed'));
    this.state = opts.state ?? loadSave() ?? createNewGame(now, Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : undefined);
    // flag di sviluppo: ?style=voxel|miniature|lowpoly (alias ?renderer=legacy|lowpoly)
    const forced = params.get('style') ?? ({ legacy: 'voxel', lowpoly: 'lowpoly' } as Record<string, string>)[params.get('renderer') ?? ''];
    if (forced === 'voxel' || forced === 'miniature' || forced === 'lowpoly') this.state.settings.style = forced;
    if (this.state.settings.quality === 'auto') this.auto = new AutoGovernor(loadAutoProfile());
    const q = this.baseQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.antialias ?? q !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;
    this.postfx = new PostFX(this.renderer);

    setVoxelResolution(VOXEL_RES[q]);
    applyStyleUniforms(this.state.settings.style, voxelsPerWorldUnit());
    this.atmosphere = new Atmosphere(this.scene, q);
    this.effects = new Effects(this.scene, q);
    this.world = new WorldView(this.scene, this.atmosphere, this.state.settings.style);
    this.world.staticShadows = !!this.auto && TIERS[this.auto.tier].staticShadows;
    if (this.auto) { this.world.forestScale = TIERS[this.auto.tier].forest; this.world.decorLod = TIERS[this.auto.tier].decor; }
    this.world.quality = q;
    if (params.get('mist') !== '0') this.mist = new ForestMist(this.scene, q);
    const report = runCatchUp(this.state, now);
    R.afterAction(this.state, now);
    this.world.sync(this.state);
    const shop = this.state.placeables.find((p) => p.type === 'shop');
    const start = shop ? cellCenter(shop.x + 1, shop.y + 4, [1, 1]) : new THREE.Vector3();
    this.actors = new Actors(this.scene, this.atmosphere, this.state.settings.style, start, this.state.player.look);
    this.scene.add(this.walkMark.group);
    this.refreshWalkable();
    this.actors.setNight(this.isNight());
    this.actors.syncPresences(this.state, now);
    this.actors.zombieStep = (r, cell) => this.zombieStep(r, cell);
    this.actors.setStaff(this.staffOn);
    this.rig.setMode(this.state.settings.camera);
    this.rig.jumpTo(start);
    this.rig.follow = this.actors.avatar.pos;
    this.rig.snap();
    this.ui = new UI(this);
    this.input = new Input(canvas, {
      tap: (x, y) => this.onTap(x, y),
      dragStart: (x, y) => this.onDragStart(x, y),
      dragMove: (x, y, dx, dy, owned) => this.onDragMove(x, y, dx, dy, owned),
      dragEnd: (x, y, owned) => this.onDragEnd(x, y, owned),
      zoom: (f) => this.rig.zoomBy(f),
      key: (k, down) => this.onKey(k, down),
    });
    this.applySettingQuality();
    this.updatePhase(true);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); toast('La scena si sta ripristinando…'); });
    canvas.addEventListener('webglcontextrestored', () => { this.world.setStyle(this.state.settings.style, this.state, true); this.actors.setStyle(this.state.settings.style); });
    this.resize();
    saveNow(this.state);
    const msg = catchUpMessage(report);
    if (msg) setTimeout(() => toast(msg), 900);
    this.ui.refreshHud();
    this.ui.maybeTutorial();
    // un'area sbloccata mentre il gioco era chiuso: lo si dice appena aperto
    setTimeout(() => this.offerExpansion(), 2500);
    if (opts.prewarm !== false) setTimeout(() => this.prewarmModels(), 4000);
  }

  start() {
    this.renderer.setAnimationLoop(this.tick);
  }

  now() { return new Date(); }

  // ── Loop ─────────────────────────────────────────────────────────────

  /** Mette il cerchio dorato sulla meta appena scelta (l'ultimo punto del percorso). */
  private markWalk() {
    const end = this.actors.avatar.path[this.actors.avatar.path.length - 1];
    if (!end) return;
    this.walkMark.show(new THREE.Vector3(end.x, this.world.heightAt(end.x, end.z), end.z));
  }

  /** Il cerchio svanisce quando il Custode arriva o cambia meta (altro tocco, tastiera, oggetto). */
  private stepWalkMark(dt: number, t: number) {
    const end = this.actors.avatar.path[this.actors.avatar.path.length - 1];
    const at = this.walkMark.group.position;
    if (!end || Math.hypot(end.x - at.x, end.z - at.z) > 0.05) this.walkMark.hide();
    this.walkMark.update(dt, t);
  }

  private readonly tick = () => {
    if (this.disposed) return;
    const raw = this.clock.getDelta();
    const dt = Math.min(0.05, raw);
    const t = this.clock.elapsedTime;
    if (this.auto) this.autoFrame(raw);

    this.steerFromKeys(dt);
    // le posizioni delle tombe cambiano solo quando cambia la scena: niente array nuovi a ogni frame
    if (this.spotsVersion !== this.world.version) { this.spots = graveSpots(this.state); this.spotsVersion = this.world.version; }
    this.actors.update(dt, t, this.spots, (p) => this.groundAt(p));
    this.collectNearbyWisps();
    this.stepWalkMark(dt, t);
    this.world.watch(this.actors.avatar.pos);
    this.world.update(dt, t);
    this.mist?.update(dt, (this.scene.fog as THREE.Fog).color);
    this.rig.update(dt);
    const radius = this.rig.groundRadius();
    this.atmosphere.focus(this.rig.target, radius, this.rig.distance);
    this.atmosphere.update(dt, t, this.rig.camera);
    this.effects.focus(this.rig.target, radius);
    this.effects.update(dt, t);

    this.liveTimer -= dt;
    if (this.liveTimer <= 0) { this.liveTimer = LIVE_TICK_MS / 1000; this.onLiveTick(); }
    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0) { this.phaseTimer = 5; this.updatePhase(false); }
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 1; this.ui.refreshClock(); this.refreshBusinesses(); }

    if (!this.renderer.shadowMap.autoUpdate) this.refreshStaticShadows();
    this.world.updateDecorLod(this.rig.camera);
    this.renderer.info.reset();
    this.updateFocus();
    this.postfx.render(this.scene, this.rig.camera);
    this.ui.frame();

    this.fps.frames++; this.fps.time += dt;
    if (this.fps.time >= 0.5) { this.fps.value = Math.round(this.fps.frames / this.fps.time); this.fps.frames = 0; this.fps.time = 0; this.ui.refreshDebug(this.debugInfo()); }
  };

  private groundAt(p: THREE.Vector3): number {
    return this.world.heightAt(p.x, p.z);
  }

  private onLiveTick() {
    const now = this.now();
    const res = liveTick(this.state, now, ++this.liveSalt);
    for (const s of res.spawns) {
      if (s.memoryId) { this.spawnMemoryGhost(s.memoryId); continue; }
      if (s.kind === 'priest' || s.kind === 'gravedigger') { this.spawnVisitor(s.kind); continue; }
      const g = s.graveId ? this.state.graves.find((x) => x.id === s.graveId) : undefined;
      this.actors.spawnRoamer(s, g ? cellCenter(g.x, g.y + 2, [2, 1]) : undefined);
    }
    if (res.wisp) { this.world.sync(this.state); scheduleSave(this.state); }
  }

  updatePhase(force: boolean) {
    const o: TimeOverride = this.state.settings.timeOverride;
    const phase = o === 'auto' ? dayPhaseForHour(this.now().getHours()) : o;
    const weather = this.state.settings.weatherEffects ? this.state.world.weather : 'clear';
    if (!force && phase === this.phase && weather === this.atmosphere.getWeather()) return;
    this.phase = phase;
    this.actors?.setNight(this.isNight());
    this.actors?.syncPresences(this.state, this.now());
    this.atmosphere.setPhase(phase, weather);
    this.mist?.setConditions(phase, weather, force);
    this.effects.setConditions(phase, weather, true);
    this.ui.refreshClock();
  }

  getPhase() { return this.phase; }

  /** Notte (anche forzata dalle impostazioni): il vampiro esce, i fantasmi ballano nel gazebo. */
  private isNight(): boolean {
    const o: TimeOverride = this.state.settings.timeOverride;
    return (o === 'auto' ? dayPhaseForHour(this.now().getHours()) : o) === 'night';
  }

  private readonly resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w, h);
    this.postfx?.setSize();
    this.rig.minView = 6;
    this.updateCameraWorld();
    if (!this.resized) { this.rig.setView(w < 700 ? 24 : 22); this.resized = true; }
  };
  private resized = false;

  private readonly onVisibility = () => {
    if (document.hidden) { saveNow(this.state); return; }
    // scarta la pausa senza azzerare l'orologio: Clock.start()/stop()
    // riportavano il tempo a 0 e le animazioni basate sul tempo trascorso
    // (es. un fuoco fatuo che stava comparendo) diventavano enormi
    this.clock.getDelta();
    const report = runCatchUp(this.state, this.now());
    this.afterChange();
    const msg = catchUpMessage(report);
    if (msg) toast(msg);
  };

  // ── Azioni ───────────────────────────────────────────────────────────

  /** Esegue un'azione di gioco; ritorna false se fallita (con toast). */
  act(fn: (s: SaveData, now: Date) => R.ActionResult | void, at?: THREE.Vector3): boolean {
    const now = this.now();
    try {
      const result = fn(this.state, now);
      if (result) {
        if (result.message) toast(result.message);
        if (at) this.showRewards(at, result);
      }
      this.afterChange();
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Qualcosa è andato storto.');
      return false;
    }
  }

  private showRewards(at: THREE.Vector3, r: R.ActionResult) {
    const p = this.project(at);
    if (!p) return;
    if (r.wisps) floater(p.x + 18, p.y - 6, `${r.wisps > 0 ? '+' : ''}${r.wisps}`, 'wisp');
    if (r.xp) floater(p.x - 18, p.y + 10, `+${r.xp} XP`, 'xp');
  }

  /** Dopo ogni cambiamento: espansione/achievement, salvataggio, vista, HUD. */
  afterChange() {
    const now = this.now();
    const { achievements } = R.afterAction(this.state, now);
    for (const a of achievements) toast(`Traguardo: ${a.name}`, 'ach');
    scheduleSave(this.state);
    const area = this.world.area;
    this.world.sync(this.state);
    if (area.w !== this.world.area.w) this.updateCameraWorld();
    this.refreshWalkable();
    this.actors.syncPresences(this.state, now);
    this.ui.refreshHud();
    this.ui.refreshContext();
    this.refreshShrink();
    this.offerExpansion();
  }

  // ── Ampiezza del recinto (a scelta) ──────────────────────────────────

  /** Riduzione in corso: l'area scelta, finché dentro non c'entra tutto. */
  shrink: { level: number } | null = null;

  /**
   * Il prestigio ha sbloccato una nuova area: lo si dice una volta sola e il
   * giocatore sceglie se ampliare ora o più tardi (dalle Impostazioni). Se è
   * impegnato (una scheda aperta, un posizionamento) si aspetta.
   */
  private offerExpansion() {
    const w = this.state.world;
    if (w.unlockedLevel <= w.notifiedLevel || !this.ui) return;
    if (!this.state.settings.shopTutorialDone || drawerOpen() || this.placement || this.shrink || this.actors.funeralActive) return;
    w.notifiedLevel = w.unlockedLevel;
    scheduleSave(this.state);
    if (w.expansionLevel < w.unlockedLevel) this.ui.openExpansionOffer(w.unlockedLevel);
  }

  /** Allarga o stringe il recinto (stringere solo se dentro c'entra già tutto). */
  setExpansion(level: number): boolean {
    if (!this.act((s) => R.setExpansionLevel(s, level))) return false;
    this.updateCameraWorld();
    // il Custode non resta fuori dal recinto
    const a = areaForLevel(level), c = this.actors.avatarCell();
    if (c.x < a.x || c.y < a.y || c.x >= a.x + a.w || c.y >= a.y + a.h) {
      const spot = nearestFreeSpot(a.x + a.w / 2, a.y + a.h / 2, [1, 1], buildOccupancy(this.state), a);
      if (spot) this.actors.teleport(cellCenter(spot.x, spot.y, [1, 1]));
    }
    return true;
  }

  /** Restringere con elementi fuori: si torna sulla mappa con l'area scelta in evidenza. */
  startShrink(level: number) {
    this.shrink = { level };
    this.select(null);
    this.world.showAreaOutline(areaForLevel(level));
    this.rig.setView(this.rig.maxView);
    this.refreshShrink();
    this.ui.refreshEditBanner();
    this.showNextOutside();
  }

  private outsideIdx = 0;

  /** Porta la vista sul prossimo elemento ancora fuori dall'area (a giro). */
  showNextOutside() {
    if (!this.shrink) return;
    const out = R.outsideArea(this.state, this.shrink.level);
    if (!out.length) { this.rig.follow = null; this.rig.jumpTo(new THREE.Vector3(0, 0, 0)); return; }
    this.focusEntity(out[this.outsideIdx++ % out.length].id);
  }

  private refreshShrink() {
    if (!this.shrink) return;
    const out = R.outsideArea(this.state, this.shrink.level);
    this.world.setMarked(out.map((o) => o.id));
    this.ui.refreshAreaBanner(out.length);
  }

  cancelShrink() {
    if (!this.shrink) return;
    this.shrink = null;
    this.world.showAreaOutline(null);
    this.world.setMarked([]);
    this.setEditMode(false);
    this.ui.refreshAreaBanner(null);
  }

  /** Salva: se dentro c'entra tutto, il recinto si stringe all'ampiezza scelta. */
  finishShrink() {
    if (!this.shrink) return;
    const out = R.outsideArea(this.state, this.shrink.level);
    if (out.length) { toast(`${out.length === 1 ? 'Manca ancora un elemento' : `Mancano ancora ${out.length} elementi`}: quelli in rosso sono fuori dall'area.`); return; }
    const level = this.shrink.level;
    this.cancelShrink();
    this.setExpansion(level);
  }

  private refreshWalkable() {
    const occ = buildOccupancy(this.state);
    this.actors.setWorld(areaForLevel(this.state.world.expansionLevel), (x, y) => occ.blocked.has(`${x},${y}`));
  }

  private collectNearbyWisps() {
    const a = this.actors.avatar.pos;
    // col bastone mistico i fuochi fatui accorrono da lontano
    const reach = this.staffOn ? STAFF.radius : 0.65;
    for (const w of this.state.world.looseWisps) {
      const p = cellCenter(w.x, w.y, [1, 1]);
      if (Math.hypot(p.x - a.x, p.z - a.z) < reach) {
        const id = w.id;
        if (reach > 0.65) this.effects.puff(p.clone().setY(0.8), '#8ff0dc');
        this.act((s) => R.collectWisp(s, id), p.clone().setY(1));
        this.ui.bumpWisps();
        return;
      }
    }
  }

  // ── Selezione & interazione ──────────────────────────────────────────

  entityCells(id: string): { x: number; y: number; fp: [number, number] } | null {
    const g = this.state.graves.find((x) => x.id === id);
    if (g) return { x: g.x, y: g.y, fp: GRAVE_FOOTPRINT };
    const p = this.state.placeables.find((x) => x.id === id);
    if (p) return { x: p.x, y: p.y, fp: rotatedFootprint(p.type, p.rot) };
    return null;
  }

  select(sel: Selection) {
    this.selection = sel;
    this.world.select(sel?.id ?? null);
    this.refreshKeeperArea();
    this.ui.refreshContext();
  }

  /**
   * Area del Lampione del Custode: si vede mentre lo si posa, e in Modifica
   * quando lo si seleziona (le luci dentro non si rompono).
   */
  private refreshKeeperArea() {
    const p = this.placement;
    let at: THREE.Vector3 | null = null;
    if (p?.kind === 'item' && p.type === 'keeper_lamp') at = cellCenter(p.x, p.y, [1, 1]);
    else if (this.editMode && this.selection) {
      const k = this.state.placeables.find((x) => x.id === this.selection!.id && x.type === 'keeper_lamp');
      const c = k && this.entityCells(k.id);
      if (c) at = cellCenter(this.drag?.id === k.id ? this.drag.x : c.x, this.drag?.id === k.id ? this.drag.y : c.y, [1, 1]);
    }
    // semilato: raggio in celle tra i centri + mezza cella (l'area copre le celle intere)
    this.world.showKeeperArea(at, KEEPER_LAMP.radius + 0.5);
  }

  /** Esegue un'azione su tomba/oggetto: il Custode va lì e lavora. */
  performEntityAction(id: string, action: EntityAction) {
    const cells = this.entityCells(id);
    if (!cells) return;
    const center = cellCenter(cells.x, cells.y, cells.fp).setY(1.2);
    const grave = this.state.graves.find((g) => g.id === id);
    // durante il rito la tomba affidata e l'albero restano dove sono finché il corteo non ha finito
    if (this.riteIds?.includes(id) && !['detail', 'memories', 'shop'].includes(action)) { toast('Aspetta che il corteo finisca il rito.'); return; }
    const instant: EntityAction[] = ['detail', 'shop', 'rotate', 'store', 'confirm', 'exhume', 'move', 'entrust', 'memories'];
    const run = () => {
      switch (action) {
        case 'clean': this.actors.work(); this.act((s, n) => (grave ? R.cleanGrave(s, id, n) : R.cleanPlaceable(s, id, n)), center); break;
        case 'repair': this.actors.work(1.6); this.act((s, n) => (grave ? R.repairGrave(s, id, n) : R.repairPlaceable(s, id, n)), center); break;
        case 'flowers': this.actors.work(0.8); this.act((s, n) => R.bringFlowers(s, id, n), center); break;
        case 'light': this.act((s) => R.toggleLight(s, id), center); break;
        case 'rotate': this.act((s) => R.rotateEntity(s, id)); break;
        case 'store': this.act((s) => R.storePlaceable(s, id)); this.select(null); break;
        case 'exhume': this.act((s) => R.exhumeGrave(s, id)); this.select(null); break;
        case 'confirm': this.select(null); toast('Posizionato. Riposi in pace.'); break;
        case 'detail': this.ui.openDetail(id); break;
        case 'shop': this.ui.openShop(); break;
        case 'move': this.setEditMode(true); this.select(this.selection); break;
        case 'entrust': this.select(null); this.ui.openEntrust(id); break;
        case 'memories': this.select(null); this.ui.openMemoryTree(); break;
        case 'ring': this.ringBell(id); break;
      }
    };
    if (instant.includes(action)) { run(); return; }
    this.ui.closeContext();
    const ok = this.actors.walkNextTo(cells.x, cells.y, cells.fp, run);
    if (!ok) run();
  }

  setEditMode(on: boolean) {
    this.editMode = on;
    if (!on) { this.world.endPreview(); this.select(null); }
    this.refreshKeeperArea();
    this.ui.refreshEditBanner();
    this.ui.refreshContext();
  }

  // ── Posizionamento (sepoltura & inventario) ──────────────────────────

  private viewCenterCell() {
    return worldToCell(this.rig.target);
  }

  startGravePlacement(draft: R.BurialDraft) {
    const occ = buildOccupancy(this.state);
    const c = this.viewCenterCell();
    const spot = nearestFreeSpot(c.x, c.y, GRAVE_FOOTPRINT, occ, areaForLevel(this.state.world.expansionLevel));
    if (!spot) { toast('Non c’è più spazio: allarga il recinto con il prestigio.'); return; }
    this.select(null);
    this.placement = { kind: 'grave', draft, x: spot.x, y: spot.y, rot: 0, valid: true };
    this.rig.follow = null;
    this.rig.jumpTo(cellCenter(spot.x, spot.y, GRAVE_FOOTPRINT));
    this.refreshPlacement();
  }

  startItemPlacement(type: string) {
    const fp = rotatedFootprint(type, 0);
    const occ = buildOccupancy(this.state);
    const c = this.viewCenterCell();
    const spot = nearestFreeSpot(c.x, c.y, fp, occ, areaForLevel(this.state.world.expansionLevel));
    if (!spot) { toast('Non c’è spazio libero per questo oggetto.'); return; }
    this.select(null);
    this.placement = { kind: 'item', type, x: spot.x, y: spot.y, rot: 0, valid: true };
    this.rig.follow = null;
    this.rig.jumpTo(cellCenter(spot.x, spot.y, fp));
    this.refreshPlacement();
  }

  private placementFp(): [number, number] {
    const p = this.placement!;
    return p.kind === 'grave' ? GRAVE_FOOTPRINT : rotatedFootprint(p.type!, p.rot);
  }

  private refreshPlacement() {
    const p = this.placement;
    this.refreshKeeperArea();
    if (!p) { this.world.hideGhost(); this.ui.refreshPlacementBar(); return; }
    const fp = this.placementFp();
    p.valid = canPlaceAt(p.x, p.y, fp, buildOccupancy(this.state), areaForLevel(this.state.world.expansionLevel));
    const style = this.state.settings.style;
    if (p.kind === 'grave') {
      const type = p.draft!.graveType!;
      const key = `g:${type}:clean:0`;
      this.world.showGhost(`${style}|${key}`, () => getModel(key, style, () => graveModel(type, 'clean' as GraveVisualState, 0), 0), fp, p.x, p.y, 0, p.valid);
    } else {
      const v: PVis = { type: p.type!, variant: 0, dirty: false, broken: false, lit: true, seed: 0 };
      this.world.showGhost(`${style}|${placeableKey(v)}`, () => getModel(placeableKey(v), style, () => placeableModel(v), 0), fp, p.x, p.y, p.rot, p.valid);
    }
    this.ui.refreshPlacementBar();
  }

  rotatePlacement() {
    const p = this.placement;
    if (!p || p.kind !== 'item' || !CATALOG[p.type!].rotatable) return;
    p.rot = (p.rot + 1) % 4;
    this.refreshPlacement();
  }

  cancelPlacement() {
    const was = this.placement;
    this.placement = null;
    this.refreshPlacement();
    if (was?.kind === 'grave') this.ui.reopenBurial(was.draft!);
  }

  confirmPlacement() {
    const p = this.placement;
    if (!p) return;
    if (!p.valid) { toast('Spazio occupato: scegli un punto libero.'); return; }
    const now = this.now();
    if (p.kind === 'grave') {
      try {
        const { grave, result } = R.bury(this.state, p.draft!, p.x, p.y, now);
        this.placement = null;
        this.refreshPlacement();
        this.afterChange();
        const center = cellCenter(grave.x, grave.y, GRAVE_FOOTPRINT);
        this.rig.jumpTo(center);
        const area = areaForLevel(this.state.world.expansionLevel);
        const gate = [...gateCells(area)][1].split(',').map(Number);
        toast('Il corteo funebre arriva…');
        this.actors.startFuneral(center, { x: gate[0], y: gate[1] }, () => {
          toast(result.message);
          this.showRewards(center.clone().setY(1.5), result);
          this.ui.refreshHud();
        });
        this.ui.refreshPlacementBar();
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Sepoltura non riuscita.');
      }
      return;
    }
    const type = p.type!;
    const ok = this.act((s, n) => { R.placeFromInventory(s, type, p.x, p.y, p.rot, n); return { message: `${CATALOG[type].label} posizionato.`, xp: 0, wisps: 0 }; });
    if (ok) {
      this.placement = null;
      this.refreshPlacement();
      if ((this.state.inventory[type] ?? 0) > 0) toast(`Te ne restano ${this.state.inventory[type]}: “Inserisci” dall’inventario per posarne altri.`);
    }
  }

  // ── Picking ──────────────────────────────────────────────────────────

  private ndc(x: number, y: number) {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  }

  private pick(x: number, y: number): { entityId?: string; wispId?: string; roamerId?: string; petId?: string } | null {
    this.raycaster.setFromCamera(this.ndc(x, y), this.rig.camera);
    // la tomba affidata, mentre la sua bara è in viaggio, non c'è più
    const hits = this.raycaster.intersectObjects([...this.actors.pickables(), ...this.world.hitboxes], false).filter((h) => !h.object.userData.entityId || !this.world.isHidden(h.object.userData.entityId));
    if (!hits.length) return null;
    // priorità: presenze erranti e animali > fuochi fatui > entità
    const order = (o: THREE.Object3D) => (o.userData.roamerId || o.userData.petId ? 0 : o.userData.wispId ? 1 : 2);
    hits.sort((a, b) => order(a.object) - order(b.object) || a.distance - b.distance);
    const u = hits[0].object.userData;
    return { entityId: u.entityId, wispId: u.wispId, roamerId: u.roamerId, petId: u.petId };
  }

  groundCell(x: number, y: number) {
    const p = this.rig.groundAt(this.ndc(x, y), this.raycaster, (wx, wz) => this.world.heightAt(wx, wz));
    return p ? { p, cell: worldToCell(p) } : null;
  }

  project(p: THREE.Vector3): { x: number; y: number } | null {
    const v = p.clone().project(this.rig.camera);
    if (v.z > 1) return null;
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  private kindOf(id: string): 'grave' | 'placeable' {
    return this.state.graves.some((g) => g.id === id) ? 'grave' : 'placeable';
  }

  private onTap(x: number, y: number) {
    this.ui.closeBubble();
    this.ui.closeActorMenu();
    if (this.placement) {
      const g = this.groundCell(x, y);
      if (!g) return;
      const fp = this.placementFp();
      this.placement.x = g.cell.x - Math.floor(fp[0] / 2);
      this.placement.y = g.cell.y - Math.floor(fp[1] / 2);
      this.refreshPlacement();
      return;
    }
    const hit = this.pick(x, y);
    if (hit?.roamerId) { this.tapRoamer(hit.roamerId); return; }
    if (hit?.petId && !this.editMode) { this.tapPet(hit.petId); return; }
    if (hit?.wispId) {
      const w = this.state.world.looseWisps.find((q) => q.id === hit.wispId);
      if (w && !this.editMode && this.actors.walkTo({ x: w.x, y: w.y })) { this.markWalk(); this.rig.follow = this.actors.avatar.pos; }
      return;
    }
    if (hit?.entityId) {
      const id = hit.entityId;
      // bar e orto con l'incasso pronto: toccandoli si riscuote
      if (!this.editMode && R.businessPending(this.state, id, this.now()) > 0) { this.collectBusiness(id); return; }
      this.select({ kind: this.kindOf(id), id });
      if (!this.editMode) {
        const c = this.entityCells(id)!;
        this.actors.walkNextTo(c.x, c.y, c.fp, () => undefined);
        this.rig.follow = this.actors.avatar.pos;
      }
      return;
    }
    // tap sul terreno: il Custode cammina lì
    if (this.selection) { this.select(null); if (this.editMode) return; }
    const g = this.groundCell(x, y);
    if (g && !this.editMode) {
      if (this.actors.walkTo(g.cell)) this.markWalk();
      this.rig.follow = this.actors.avatar.pos;
    }
  }

  /**
   * Menù dell'animale (ognuno il suo, così se ne gestiscono più d'uno):
   * raggiungere il Custode, liberarlo, mandarlo a cuccia, coccolarlo, giocarci.
   * Le voci che ora non hanno senso restano visibili ma disattivate.
   */
  petMenu(id: string): Array<{ label: string; icon: string; cls?: string; disabled?: boolean; run: () => void }> {
    const p = this.actors.petAt(id);
    if (!p) return [];
    const off = p.broken;
    return [
      { label: 'Raggiungi il Custode', icon: 'paw', disabled: off || p.mode === 'follow', run: () => this.petCommand(id, this.actors.callPet(id)) },
      { label: 'Libera', icon: 'sun', disabled: off || p.mode === 'free', run: () => this.petCommand(id, this.actors.freePet(id)) },
      { label: 'A cuccia', icon: 'kennel', disabled: off || p.mode === 'home', run: () => this.petCommand(id, this.actors.sendPetHome(id)) },
      { label: 'Accarezza', icon: 'heart', cls: 'primary', disabled: off || p.sleeping, run: () => this.actors.petPet(id) },
      { label: 'Lancia l’osso', icon: 'bone', disabled: off || p.sleeping, run: () => { if (!this.actors.throwBone(id)) toast('Qui non c’è spazio per lanciare l’osso.'); } },
    ];
  }

  /** Dopo un comando l'animale ricorda cosa fa (salvato nella sua casetta). */
  private petCommand(id: string, message: string) {
    toast(message);
    const house = this.state.placeables.find((p) => p.id === id);
    const mode = this.actors.petAt(id)?.mode;
    if (house && mode && house.petMode !== mode) { house.petMode = mode; scheduleSave(this.state); }
  }

  /** Stato dell'animale in breve (sotto il nome nel menù). */
  petStatus(id: string): string {
    const p = this.actors.petAt(id);
    if (!p) return '';
    if (p.broken) return 'Casetta rotta: riparala per farlo uscire';
    if (p.sleeping) return p.mode === 'home' ? 'A cuccia, dorme' : 'Dorme in tana';
    return PET_STATUS[p.mode];
  }

  /** Toccando l'animale si apre il suo menù, che lo segue mentre si muove. */
  private tapPet(id: string) {
    const pet = this.actors.petAt(id);
    if (!pet) return;
    this.ui.openActorMenu(pet.label, this.petStatus(id), this.petMenu(id), () => this.actors.petTop(id));
  }

  private tapRoamer(id: string) {
    const r = this.actors.roamerAt(id);
    if (!r || r.dying > 0) return;
    // becchino e prete in visita: non svaniscono, raccontano cosa stanno facendo
    if (r.visit) {
      const v = r.visit, left = Math.max(0, v.stops.length - v.i);
      const back = (kind: 'priest' | 'gravedigger', home: string) => (this.visitorHome(kind) ? home : 'da dove è venuto');
      if (r.kind === 'gravedigger') {
        toast(v.stage === 'leave' || !left
          ? (v.stops.length ? `Il becchino ha finito il giro (${v.i} cose ripulite) e torna ${back('gravedigger', 'a casa')}.` : `Il becchino ha controllato: niente da pulire. Torna ${back('gravedigger', 'a casa')}.`)
          : `Il becchino fa il giro e ripulisce metà delle cose sporche del cimitero: ${v.i} fatte, ancora ${left}. Poi torna ${back('gravedigger', 'a casa')}.`);
      } else {
        toast(v.stage === 'leave' || !left
          ? `Il prete ha benedetto il cimitero (più fuochi fatui fino a domani) e torna ${back('priest', 'al santuario')}.`
          : `Il prete prega sulle tombe e benedice il cimitero: più fuochi fatui fino a domani. Ancora ${left} ${left === 1 ? 'tomba' : 'tombe'}, poi torna ${back('priest', 'al santuario')}.`);
      }
      return;
    }
    const at = r.pos.clone().setY(1.4);
    const cell = worldToCell(r.pos);
    this.actors.faceTowards(r.pos);
    this.actors.cheer(0.9);
    let visit: R.ActionResult | null = null;
    this.act((s, n) => (visit = R.interactRoamer(s, r.kind, n, { rare: r.rare, graveId: r.graveId, memoryId: r.memoryId, x: cell.x, y: cell.y })), at);
    this.effects.puff(r.pos, r.kind === 'ghost' ? '#cfeee6' : r.kind === 'zombie' ? '#9bd34a' : '#e8dfcc');
    this.actors.removeRoamer(id);
    // il fantasma di un ricordo dell'albero: dopo la ricompensa si apre la sua scheda
    if (r.memoryId && visit) this.ui.openMemory(r.memoryId, visit);
  }

  // ── Campana delle anime e zombie che infangano ──────────────────────

  /** Il Custode suona la campana: dal cimitero accorrono alcune anime (toccandole si guadagna come sempre). */
  private ringBell(id: string) {
    const c = this.entityCells(id);
    if (!c) return;
    const center = cellCenter(c.x, c.y, c.fp);
    this.actors.faceTowards(center);
    this.actors.cheer(1.2);
    if (!this.act((s, n) => R.ringBell(s, id, n), center.clone().setY(2.6))) return;
    this.effects.puff(center.clone().setY(2.2), '#cfeee6');
    const graves = this.state.graves;
    for (let i = 0; i < SOUL_BELL.ghosts; i++) {
      const a = (i / SOUL_BELL.ghosts) * Math.PI * 2 + Math.random() * 0.8, d = 2.2 + Math.random() * 1.2;
      const g = graves.length ? graves[Math.floor(Math.random() * graves.length)] : undefined;
      setTimeout(() => this.actors.spawnRoamer({ kind: 'ghost', graveId: g?.id, rare: !!g && !g.legacy && Math.random() < 0.25 }, center.clone().add(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d))), 400 + i * 450);
    }
  }

  /**
   * Uno zombie arriva in una cella: se accanto c'è una tomba su cui non ha
   * ancora tentato la sorte, con una certa probabilità la sporca (una sola
   * per zombie) e ci lascia le impronte; se era già sporca, la rottura si avvicina.
   */
  private zombieStep(r: { muddied?: boolean; tried?: Set<string> }, cell: { x: number; y: number }) {
    const reach = ZOMBIE_MUD.reach;
    const near = R.gravesNear(this.state, cell.x, cell.y, reach).filter((g) => !r.tried?.has(g.id));
    if (!near.length) return;
    r.tried ??= new Set();
    for (const g of near) {
      r.tried.add(g.id);
      if (Math.random() >= ZOMBIE_MUD.chance) continue;
      const now = this.now();
      if (!R.zombieTrample(this.state, g.id, now)) continue;
      r.muddied = true;
      this.effects.puff(cellCenter(g.x, g.y, GRAVE_FOOTPRINT).setY(0.3), '#5a4632');
      this.afterChange();
      return;
    }
  }

  // ── Becchino e prete in visita ───────────────────────────────────────

  /** La casa del becchino o il santuario (se ci sono e funzionano): da lì escono e lì tornano. */
  private visitorHome(kind: 'priest' | 'gravedigger') {
    return this.state.placeables.find((p) => p.type === (kind === 'gravedigger' ? 'gravedigger_house' : 'shrine') && !p.broken);
  }

  /**
   * Arriva il becchino (pulisce metà delle cose sporche) o il prete (prega su
   * qualche tomba e benedice il cimitero): fa il giro e se ne va da dove è venuto.
   */
  spawnVisitor(kind: 'priest' | 'gravedigger') {
    if ([...this.actors.roamers.values()].some((r) => r.kind === kind && r.visit)) return; // uno alla volta
    const home = this.visitorHome(kind);
    let door: THREE.Vector3;
    if (home) {
      const fp = rotatedFootprint(home.type, home.rot);
      door = cellCenter(home.x + Math.floor(fp[0] / 2), home.y + fp[1], [1, 1]);
    } else {
      const gate = [...gateCells(areaForLevel(this.state.world.expansionLevel))][1].split(',').map(Number);
      door = cellCenter(gate[0], gate[1], [1, 1]).add(new THREE.Vector3(0, 0, 1.5));
    }
    const ids = kind === 'gravedigger'
      ? R.gravediggerRound(this.state)
      : [...this.state.graves].sort(() => Math.random() - 0.5).slice(0, 3).map((g) => g.id);
    // tappe in ordine di vicinanza, partendo dalla porta
    const stops: VisitStop[] = [];
    const left = ids.map((id) => ({ id, ...this.entityCells(id)! })).filter((s) => s.fp);
    let at = worldToCell(door);
    while (left.length) {
      left.sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y));
      const s = left.shift()!;
      stops.push(s);
      at = { x: s.x, y: s.y };
    }
    let cleaned = 0, blessed = false;
    this.actors.spawnVisitor(kind, door, door.clone(), stops, (id) => {
      const c = this.entityCells(id);
      const top = c ? cellCenter(c.x, c.y, c.fp).setY(1.4) : undefined;
      if (kind === 'gravedigger') { this.act((s, n) => { const r = R.gravediggerClean(s, id, n); if (r.xp) cleaned++; return r; }, top); }
      else { this.act((s, n) => R.priestBless(s, id, n, !blessed), top); blessed = true; }
    }, () => {
      if (kind === 'gravedigger' && cleaned) toast(`Il becchino ha finito il giro: ${cleaned} ${cleaned === 1 ? 'cosa ripulita' : 'cose ripulite'}.`);
    });
  }

  // ── Albero dei ricordi ───────────────────────────────────────────────

  /** Centro dell'albero e cella libera davanti al varco (dove arriva il corteo). */
  private treeSpot(): { id: string; center: THREE.Vector3; front: { x: number; y: number } } | null {
    const t = R.memoryTree(this.state);
    if (!t) return null;
    const fp = rotatedFootprint(t.type, t.rot);
    return { id: t.id, center: cellCenter(t.x, t.y, fp), front: { x: t.x + Math.floor(fp[0] / 2), y: t.y + fp[1] } };
  }

  /** Il fantasma di un ricordo esce dall'albero (uguale agli altri: la sorpresa è toccarlo). */
  spawnMemoryGhost(memoryId: string) {
    const t = this.treeSpot();
    if (!t) return;
    const a = Math.random() * Math.PI * 2;
    this.actors.spawnRoamer({ kind: 'ghost', memoryId }, t.center.clone().add(new THREE.Vector3(Math.cos(a) * 1.2, 0, 2.4 + Math.abs(Math.sin(a)) * 0.8)));
  }

  /**
   * Affida una tomba all'albero con il rito: il corteo porta la bara all'albero
   * e la terra la accoglie; solo allora la tomba lascia il cimitero (se si
   * salta il rito, avviene subito).
   */
  entrust(graveId: string) {
    const g = this.state.graves.find((x) => x.id === graveId);
    const t = this.treeSpot();
    if (!g || !t) { toast('Serve l’Albero dei ricordi.'); return; }
    if (this.actors.funeralActive) { toast('Aspetta che finisca il rito in corso.'); return; }
    const area = areaForLevel(this.state.world.expansionLevel);
    const gate = [...gateCells(area)][1].split(',').map(Number);
    const grave = cellCenter(g.x, g.y, GRAVE_FOOTPRINT);
    const coffinModel = closedCoffinLP();
    // con le ombre ferme la bara in viaggio non proietta ombra (resterebbe indietro)
    const coffin = instantiate({ geometries: coffinModel.geometries, lights: [], height: 0.4, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: !this.world.staticShadows });
    this.rig.jumpTo(grave.clone().lerp(t.center, 0.5));
    this.rig.follow = null;
    toast('Il corteo arriva per accompagnarlo all’albero…');
    this.riteIds = [graveId, t.id];
    this.actors.startRite({
      grave, graveFront: { x: g.x, y: g.y + 2 }, tree: t.center, treeFront: t.front, gate: { x: gate[0], y: gate[1] }, coffin,
      onLift: () => { this.world.setHidden(graveId, true); if (this.selection?.id === graveId) this.select(null); this.effects.puff(grave, '#8a7a62'); },
      onDone: () => {
        this.riteIds = null;
        if (!this.act((s, n) => R.entrustGrave(s, graveId, n), t.center.clone().setY(3))) this.world.setHidden(graveId, false);
        this.ui.refreshHud();
      },
    });
  }

  private onDragStart(x: number, y: number): boolean {
    this.ui.closeBubble();
    const g = this.groundCell(x, y);
    if (!g) return false;
    if (this.placement) {
      const fp = this.placementFp();
      const p = this.placement;
      const inside = g.cell.x >= p.x - 1 && g.cell.x <= p.x + fp[0] && g.cell.y >= p.y - 1 && g.cell.y <= p.y + fp[1];
      if (inside) this.drag = { id: '__placement', x: p.x, y: p.y, valid: p.valid, grab: g.p.clone().sub(cellCenter(p.x, p.y, fp)) };
      return inside;
    }
    if (!this.editMode) return false;
    const hit = this.pick(x, y);
    const id = hit?.entityId;
    if (!id) return false;
    if (this.riteIds?.includes(id)) { toast('Aspetta che il corteo finisca il rito.'); return false; }
    if (this.selection?.id !== id) this.select({ kind: this.kindOf(id), id });
    const c = this.entityCells(id)!;
    this.drag = { id, x: c.x, y: c.y, valid: true, grab: g.p.clone().sub(cellCenter(c.x, c.y, c.fp)) };
    this.ui.closeContext();
    return true;
  }

  private onDragMove(x: number, y: number, dx: number, dy: number, owned: boolean) {
    if (!owned || !this.drag) { this.rig.panPixels(dx, dy); return; }
    const g = this.groundCell(x, y);
    if (!g) return;
    const id = this.drag.id;
    const fp = id === '__placement' ? this.placementFp() : this.entityCells(id)!.fp;
    const center = g.p.clone().sub(this.drag.grab);
    const nx = Math.round(center.x + HALF - fp[0] / 2), ny = Math.round(center.z + HALF - fp[1] / 2);
    if (id === '__placement') {
      this.placement!.x = nx; this.placement!.y = ny;
      this.refreshPlacement();
      return;
    }
    const valid = canPlaceAt(nx, ny, fp, buildOccupancy(this.state, id), areaForLevel(this.state.world.expansionLevel));
    this.drag.x = nx; this.drag.y = ny; this.drag.valid = valid;
    this.world.previewMove(id, nx, ny, valid);
    this.refreshKeeperArea();
  }

  private onDragEnd(_x: number, _y: number, owned: boolean) {
    const d = this.drag;
    this.drag = null;
    if (!owned || !d) return;
    if (d.id === '__placement') return;
    this.world.endPreview();
    if (d.valid) this.act((s) => R.moveEntity(s, d.id, d.x, d.y));
    else { toast('Spazio occupato: torna al suo posto.'); this.world.sync(this.state); }
    this.world.select(d.id);
    this.refreshKeeperArea();
    this.ui.refreshContext();
  }

  // ── Tastiera ─────────────────────────────────────────────────────────

  private onKey(k: string, down: boolean) {
    if (!down) return;
    if (k === 'escape') { this.ui.escape(); return; }
    if (k === 'b') this.toggleBike();
    else if (k === 'f' && this.ownsBroom()) this.toggleBroom();
    else if (k === 'v') this.setStyle(STYLE_CYCLE[(STYLE_CYCLE.indexOf(this.state.settings.style) + 1) % STYLE_CYCLE.length]);
    else if (k === 'e') this.interactNearest();
  }

  private steerFromKeys(dt: number) {
    const keys = this.input.keys;
    let fx = 0, fz = 0;
    if (keys.has('w') || keys.has('arrowup')) fz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) fz += 1;
    if (keys.has('a') || keys.has('arrowleft')) fx -= 1;
    if (keys.has('d') || keys.has('arrowright')) fx += 1;
    if (!fx && !fz) return;
    // direzioni relative alla camera (su = verso il fondo dello schermo)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.rig.camera.quaternion).setY(0).normalize();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rig.camera.quaternion).setY(0);
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); else fwd.normalize();
    const dir = right.multiplyScalar(fx).addScaledVector(fwd, -fz).normalize();
    this.actors.steer(dir, dt);
    this.rig.follow = this.actors.avatar.pos;
  }

  private interactNearest() {
    const a = this.actors.avatar.pos;
    let best: string | null = null, bd = 2.2;
    for (const [id, e] of this.world.entities) {
      const d = Math.hypot(e.group.position.x - a.x, e.group.position.z - a.z) - Math.max(...e.fp) / 2;
      if (d < bd) { bd = d; best = id; }
    }
    if (best) this.select({ kind: this.kindOf(best), id: best });
    else toast('Avvicinati a una tomba o a un oggetto.');
  }

  // ── Impostazioni ─────────────────────────────────────────────────────

  /**
   * Genera in anticipo, nei momenti di calma, i modelli degli oggetti che si
   * possono posare (prima quelli in inventario), così posarli non fa scattare
   * il gioco. Uno per volta: se si sta giocando, aspetta.
   */
  private prewarmModels() {
    const style = this.state.settings.style;
    // prima quello che hai in inventario, poi quello che puoi comprare, poi il resto
    const now = this.now();
    const buyable = CATALOG_LIST.filter((d) => ['ok', 'funds'].includes(R.shopAvailability(this.state, d.id, now))).map((d) => d.id);
    const types = [...new Set([...Object.keys(this.state.inventory), ...buyable, ...CATALOG_LIST.map((d) => d.id)])];
    const queue: PVis[] = [];
    for (const type of types) {
      if (!CATALOG[type] || CATALOG[type].category === 'extra') continue;
      for (let seed = 0; seed < seedCount(type); seed++) queue.push({ type, variant: 0, seed: placeableSeed(type, seed), dirty: false, broken: false, lit: true });
    }
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 300 }) : setTimeout(cb, 60));
    const step = () => {
      if (this.disposed || this.state.settings.style !== style) return; // cambiata resa: le forme nuove si generano quando servono
      // mentre il Custode cammina o si sta posando qualcosa si lascia lavorare il gioco
      if (this.actors.avatarMoving || this.placement || this.drag) { setTimeout(() => idle(step), 600); return; }
      const v = queue.shift();
      if (!v) return;
      getModel(placeableKey(v), style, () => placeableModel(v), v.seed);
      idle(step);
    };
    idle(step);
  }

  setStyle(style: ArtStyle) {
    if (this.state.settings.style === style) return;
    this.state.settings.style = style;
    const sel = this.selection;
    applyStyleUniforms(style, voxelsPerWorldUnit());
    this.world.setStyle(style, this.state);
    this.actors.setStyle(style);
    this.select(sel);
    if (this.placement) this.refreshPlacement();
    scheduleSave(this.state);
    this.ui.refreshSettingsButtons();
    toast(`Resa: ${STYLE_LABELS[style]}`);
  }

  /** Personalizzazione del Custode: salva e ricostruisce subito il personaggio. */
  setLook(look: CustodeLook) {
    this.state.player.look = look;
    this.actors.setAvatarLook(look);
    scheduleSave(this.state);
  }

  // ── Bicicletta ───────────────────────────────────────────────────────

  /** La bici si usa da dove si trova il Custode: si sale e si scende con l'icona (o il tasto B). */
  ownsBike(): boolean { return R.ownedCount(this.state, 'bike') > 0; }

  get riding(): boolean { return this.actors.riding; }

  toggleBike() {
    if (!this.ownsBike()) { toast('Prima compra la bicicletta in Bottega (Extra).'); return; }
    this.actors.setRiding(!this.actors.riding);
    toast(this.actors.riding ? 'In sella: si va al doppio della velocità.' : 'Il Custode scende dalla bici.');
    this.ui.refreshSettingsButtons();
  }

  /** Comprati o venduti gli Extra: le icone compaiono o spariscono (e se non ci sono più, si scende o si posa il bastone). */
  private extrasSig = '';
  refreshBike() {
    const bike = this.ownsBike(), broom = this.ownsBroom(), staff = this.ownsStaff();
    if (!bike && this.actors.riding) this.actors.setRiding(false);
    if (!broom && this.actors.flying) this.actors.setFlying(false);
    this.actors.setStaff(this.staffOn);
    const sig = `${bike}${broom}${staff}`;
    if (sig !== this.extrasSig) { this.extrasSig = sig; this.ui.refreshSettingsButtons(); }
  }

  ownsBroom(): boolean { return R.ownedCount(this.state, 'broom') > 0; }
  ownsStaff(): boolean { return R.ownedCount(this.state, 'mystic_staff') > 0; }
  get flying(): boolean { return this.actors.flying; }
  /** Il bastone è impugnato (resta impugnato anche riaprendo il gioco). */
  get staffOn(): boolean { return this.ownsStaff() && this.state.settings.staffEquipped; }

  /** Sulla scopa si vola sopra tombe e oggetti, più veloci della bici. */
  toggleBroom() {
    if (!this.ownsBroom()) { toast('Prima compra la scopa volante in Bottega (Extra).'); return; }
    this.actors.setFlying(!this.actors.flying);
    toast(this.actors.flying ? 'A cavalcioni della scopa: si vola sopra tombe e recinti.' : 'Il Custode atterra e scende dalla scopa.');
    this.ui.refreshSettingsButtons();
  }

  /** Impugna o posa il bastone mistico: impugnato, i fuochi fatui accorrono da lontano. */
  toggleStaff() {
    if (!this.ownsStaff()) { toast('Il bastone mistico si sblocca raccogliendo 500 fuochi fatui.'); return; }
    this.state.settings.staffEquipped = !this.state.settings.staffEquipped;
    this.actors.setStaff(this.staffOn);
    toast(this.staffOn ? 'Bastone impugnato: i fuochi fatui accorrono da lontano.' : 'Bastone posato.');
    scheduleSave(this.state);
    this.ui.refreshSettingsButtons();
  }

  /** Usa un Extra dalla Bottega o dall'inventario (bici, scopa, bastone). */
  useExtra(id: string) {
    if (id === 'broom') this.toggleBroom();
    else if (id === 'mystic_staff') this.toggleStaff();
    else this.toggleBike();
  }

  /** Il pulsante d'uso di un Extra, a seconda di com'è ora. */
  extraLabel(id: string): string {
    if (id === 'broom') return this.flying ? 'Scendi dalla scopa' : 'Sali sulla scopa';
    if (id === 'mystic_staff') return this.staffOn ? 'Posa il bastone' : 'Impugna il bastone';
    return this.riding ? 'Scendi' : 'Sali in sella';
  }

  // ── Bar e orto ───────────────────────────────────────────────────────

  /** Etichette degli incassi da riscuotere sopra bar e orto (e l'icona della bici, se è cambiata). */
  private refreshBusinesses() {
    const now = this.now();
    for (const p of this.state.placeables) if (p.type in BUSINESS) this.world.setEarnings(p.id, R.businessPending(this.state, p.id, now));
    this.refreshBike();
  }

  private collectBusiness(id: string) {
    const e = this.world.entities.get(id);
    const at = e ? e.group.position.clone().setY(e.height + 0.5) : undefined;
    if (this.act((s, now) => R.collectBusiness(s, id, now), at)) {
      this.world.setEarnings(id, 0);
      this.ui.bumpWisps();
    }
  }

  setQuality(q: QualitySetting) {
    this.state.settings.quality = q;
    this.auto = q === 'auto' ? new AutoGovernor(loadAutoProfile()) : null;
    this.applySettingQuality();
    scheduleSave(this.state);
    this.ui.refreshSettingsButtons();
  }

  // ── Qualità Auto ─────────────────────────────────────────────────────

  /** Regolatore della qualità Auto (null con un livello fisso). */
  private auto: AutoGovernor | null = null;
  private spots: THREE.Vector3[] = [];
  private spotsVersion = -1;
  private shadowSig = '';

  /** Il livello di base da usare: quello scelto, o quello della fascia del dispositivo in Auto. */
  private baseQuality(): Quality {
    const q = this.state.settings.quality;
    return q === 'auto' ? TIERS[this.auto?.tier ?? 'mid'].bake : q;
  }

  /** Applica la qualità scelta: un livello fisso (come sempre) o Auto (fascia + gradino). */
  private applySettingQuality() {
    const auto = this.auto;
    const tier = auto ? TIERS[auto.tier] : null;
    // ombre ferme e ombre a disco solo in Auto (fascia economica e media)
    const still = !!tier?.staticShadows;
    if (this.world.staticShadows !== still) {
      this.world.staticShadows = still;
      this.world.setStyle(this.state.settings.style, this.state, true); // ricrea ciò che si muove senza ombra
    }
    this.actors.setBlobShadows(still);
    this.renderer.shadowMap.autoUpdate = !still;
    this.renderer.shadowMap.needsUpdate = true;
    this.atmosphere.setLightBudget(tier ? tier.lights : null);
    // fase 2: bosco più fitto (media e top), prato a due versioni, oggetti fermi fusi per zona
    this.world.forestScale = tier?.forest ?? 1;
    this.world.decorLod = tier ? tier.decor : null;
    this.world.setMergeStatic(!!tier);
    // bar e orto: più zombie dove il dispositivo regge (fascia in Auto, livello scelto altrimenti)
    const q = this.state.settings.quality;
    this.actors.setPresenceTier(auto ? auto.tier : q === 'low' ? 'low' : q === 'medium' ? 'mid' : 'high');
    this.actors.syncPresences(this.state, this.now());
    if (!auto) this.postfx.setSamples(4);
    this.applyQuality(this.baseQuality());
    if (auto) this.applyAutoStep();
  }

  /** Gradino corrente della qualità Auto: pixel ratio, mappa ombre, sfocatura, MSAA. */
  private applyAutoStep() {
    const auto = this.auto;
    if (!auto) return;
    const st = AUTO_STEPS[auto.step];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, st.dpr));
    this.atmosphere.setShadowSize(st.shadow);
    this.renderer.shadowMap.needsUpdate = true;
    this.postfx.setSamples(st.msaa);
    this.postfx.configure(st.blur && this.state.settings.edgeBlur, auto.tier === 'high' ? 5 : 3.5);
    this.resize();
    saveAutoProfile(auto.profile());
  }

  private autoFrame(raw: number) {
    const d = this.auto!.frame(raw);
    if (d === 'up' || d === 'down') this.applyAutoStep();
    else if (d === 'tierDown') { this.applySettingQuality(); saveAutoProfile(this.auto!.profile()); }
  }

  /** Ombre ferme: si ridisegnano solo se si muove la camera o il sole, o se cambia la scena. */
  private refreshStaticShadows() {
    const sun = this.atmosphere.sun.position, tg = this.rig.target;
    const sig = `${tg.x.toFixed(2)}|${tg.z.toFixed(2)}|${this.rig.viewHeight.toFixed(2)}|${sun.x.toFixed(2)}|${sun.y.toFixed(2)}|${sun.z.toFixed(2)}|${this.world.version}`;
    if (sig !== this.shadowSig) { this.shadowSig = sig; this.renderer.shadowMap.needsUpdate = true; }
  }

  /** Per le statistiche tecniche: fascia e gradino della qualità Auto. */
  autoInfo(): string | null {
    const a = this.auto;
    if (!a) return null;
    const st = AUTO_STEPS[a.step];
    return `auto · ${TIER_LABELS[a.tier]} · gradino ${a.step}/${a.ceiling} · dpr ${this.renderer.getPixelRatio()} · ombre ${st.shadow}${TIERS[a.tier].staticShadows ? ' ferme' : ''} · luci ${TIERS[a.tier].lights} · sfocatura ${st.blur && this.state.settings.edgeBlur ? 'sì' : 'no'}`;
  }

  /** La fascia nitida segue il Custode (o la selezione), senza scatti. */
  private updateFocus() {
    if (!this.postfx.enabled) return;
    const sel = this.selection ? this.world.entities.get(this.selection.id) : null;
    const p = sel ? sel.group.position : this.actors.avatar.pos;
    this.focusNdc.set(p.x, 0.5, p.z).project(this.rig.camera);
    const fx = THREE.MathUtils.clamp(this.focusNdc.x * 0.5 + 0.5, 0.3, 0.7);
    const fy = THREE.MathUtils.clamp(this.focusNdc.y * 0.5 + 0.5, 0.3, 0.7);
    this.postfx.focus.x += (fx - this.postfx.focus.x) * 0.08;
    this.postfx.focus.y += (fy - this.postfx.focus.y) * 0.08;
  }

  /** La vista può scorrere sul recinto e su una fascia di bosco, mai oltre il terreno. */
  private updateCameraWorld() {
    const a = this.world.area;
    const half = Math.max(a.w, a.h) / 2;
    // si scorre fino a poco oltre il recinto e lo zoom massimo inquadra il
    // cimitero con una fascia sottile di bosco: il protagonista è il recinto
    this.rig.setWorld(HALF + FOREST_MARGIN, half + 3, half + 7);
    this.mist?.setWorld(a, HALF, HALF + FOREST_MARGIN, (x, z) => this.world.heightAt(x, z));
  }

  private applyQuality(q: Quality) {
    if (VOXEL_RES[q] !== voxelResolution()) {
      setVoxelResolution(VOXEL_RES[q]);
      applyStyleUniforms(this.state.settings.style, voxelsPerWorldUnit());
      clearAll();
      this.world.setStyle(this.state.settings.style, this.state, true);
      this.actors.setStyle(this.state.settings.style);
      this.select(this.selection);
    }
    const cap = q === 'low' ? 1 : q === 'medium' ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this.renderer.shadowMap.type = q === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.atmosphere.setQuality(q);
    this.effects.setQuality(q);
    this.mist?.setQuality(q);
    this.world.quality = q;
    this.world.sync(this.state);
    this.resize();
    this.postfx.configure(q !== 'low' && this.state.settings.edgeBlur, q === 'high' ? 5 : 3.5);
    for (const m of [...Object.values(MATERIALS), ...Object.values(LOWPOLY_MATERIALS), LOWPOLY_TERRAIN]) m.needsUpdate = true;
  }

  setTimeOverride(o: TimeOverride) {
    this.state.settings.timeOverride = o;
    scheduleSave(this.state);
    this.updatePhase(true);
    this.ui.refreshSettingsButtons();
  }

  setEdgeBlur(on: boolean) {
    this.state.settings.edgeBlur = on;
    this.applySettingQuality();
    scheduleSave(this.state);
  }

  setWeatherEffects(on: boolean) {
    this.state.settings.weatherEffects = on;
    scheduleSave(this.state);
    this.updatePhase(true);
  }

  recenter() {
    this.rig.follow = this.actors.avatar.pos;
  }

  centerOnShop() {
    const shop = this.state.placeables.find((p) => p.type === 'shop');
    if (!shop) return;
    this.rig.follow = null;
    this.rig.jumpTo(cellCenter(shop.x, shop.y, rotatedFootprint('shop', shop.rot)));
    this.select({ kind: 'placeable', id: shop.id });
  }

  focusEntity(id: string) {
    const c = this.entityCells(id);
    if (!c) return;
    this.rig.follow = null;
    this.rig.jumpTo(cellCenter(c.x, c.y, c.fp));
  }

  /** Cattura un rettangolo (px CSS) della scena in bianco e nero. */
  capture(rect: { x: number; y: number; w: number; h: number }): string {
    this.postfx.render(this.scene, this.rig.camera);
    const src = this.renderer.domElement;
    const sx = src.width / src.clientWidth, sy = src.height / src.clientHeight;
    const out = document.createElement('canvas');
    const scale = Math.min(1, 1200 / Math.max(rect.w * sx, rect.h * sy));
    out.width = Math.round(rect.w * sx * scale);
    out.height = Math.round(rect.h * sy * scale);
    const g = out.getContext('2d')!;
    g.drawImage(src, rect.x * sx, rect.y * sy, rect.w * sx, rect.h * sy, 0, 0, out.width, out.height);
    const img = g.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      let l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      l = Math.max(0, Math.min(255, (l - 128) * 1.12 + 132));
      d[i] = d[i + 1] = d[i + 2] = l;
    }
    g.putImageData(img, 0, 0);
    return out.toDataURL('image/jpeg', 0.9);
  }

  replaceState(next: SaveData) {
    this.state = next;
    this.select(null);
    this.placement = null;
    this.world.setStyle(next.settings.style, next, true);
    this.actors.setStyle(next.settings.style);
    this.actors.setAvatarLook(next.player.look);
    const shop = next.placeables.find((p) => p.type === 'shop');
    if (shop) this.actors.teleport(cellCenter(shop.x + 1, shop.y + 4, [1, 1]));
    this.rig.setMode(next.settings.camera);
    this.auto = next.settings.quality === 'auto' ? new AutoGovernor(loadAutoProfile()) : null;
    this.applySettingQuality();
    this.afterChange();
    this.updatePhase(true);
    saveNow(next);
  }

  graveState(id: string): GraveVisualState | null {
    const g = this.state.graves.find((x) => x.id === id);
    return g ? graveVisualState(g) : null;
  }

  debugInfo() {
    const info = this.renderer.info.render;
    const cs = cacheStats();
    return [
      `FPS ${this.fps.value}`,
      ...(this.autoInfo() ? [this.autoInfo()!] : []),
      `draw calls ${info.calls} · tri ${info.triangles.toLocaleString('it-IT')}`,
      `stile ${this.state.settings.style} · camera ${this.state.settings.camera}`,
      `seed ${this.state.seed} · fase ${this.phase} · meteo ${this.state.world.weather}`,
      `tombe ${this.state.graves.length} · oggetti ${this.state.placeables.length}`,
      `presenze ${this.actors.stats().roamers}+${this.actors.stats().presences} · modelli ${cs.models}`,
    ].join('\n');
  }

  /** Solo sviluppo/test: piazza un oggetto del catalogo senza pagarlo. */
  debugPlace(type: string, x: number, y: number, variant = 0, rot = 0) {
    this.state.inventory[type] = (this.state.inventory[type] ?? 0) + 1;
    const p = R.placeFromInventory(this.state, type, x, y, rot, this.now());
    p.variant = variant;
    this.afterChange();
    return p.id;
  }

  /** Solo sviluppo/test: forza la comparsa di una presenza. */
  debugSpawn(kind: Parameters<Actors['spawnRoamer']>[0]['kind'], rare = false) {
    const g = this.state.graves[0];
    this.actors.spawnRoamer({ kind, rare, graveId: g?.id }, g && kind === 'ghost' ? cellCenter(g.x, g.y + 2, [2, 1]) : undefined);
  }

  dispose() {
    this.disposed = true;
    saveNow(this.state);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}

// ── Profilo della qualità Auto (per dispositivo: resta nel browser, non nel salvataggio) ──

const AUTO_KEY = 'necro3d:auto-quality';
let gpuName: string | null = null;

/** GPU e memoria del dispositivo (per stimare la fascia). */
function deviceInfo() {
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    gpu = String((ext && gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl?.getParameter(gl.RENDERER) || '');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* nessuna informazione: si parte da «medio» */ }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  gpuName = gpu;
  return { gpu, memory: nav.deviceMemory, cores: navigator.hardwareConcurrency, mobile };
}

/** Il profilo ricordato per questo dispositivo, o uno nuovo dalla fascia stimata. */
function loadAutoProfile(): AutoProfile {
  const info = deviceInfo();
  try {
    const saved = JSON.parse(localStorage.getItem(AUTO_KEY) ?? 'null') as (AutoProfile & { gpu: string }) | null;
    if (saved && saved.gpu === info.gpu && saved.tier in TIERS) return saved;
  } catch { /* profilo illeggibile: si riparte */ }
  const tier = detectTier(info);
  return { tier, step: TIERS[tier].startStep, ceiling: TIERS[tier].maxStep };
}

function saveAutoProfile(p: AutoProfile) {
  if (!persistenceOn()) return;
  try { localStorage.setItem(AUTO_KEY, JSON.stringify({ ...p, gpu: gpuName ?? deviceInfo().gpu })); } catch { /* storage pieno o bloccato */ }
}
