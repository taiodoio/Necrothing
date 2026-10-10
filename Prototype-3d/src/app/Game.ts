// Controller principale: possiede stato di gioco, scena, camera, attori e UI.
// Ogni azione del giocatore passa da `act()`: regola pura → ricompense →
// espansione/achievement → salvataggio → sincronizzazione della vista.

import * as THREE from 'three';
import { FOREST_MARGIN, GRAVE_FOOTPRINT, LIVE_TICK_MS } from '../game/balance.ts';
import { CATALOG, rotatedFootprint } from '../game/catalog.ts';
import type { GraveVisualState } from '../game/graves.ts';
import { graveVisualState } from '../game/graves.ts';
import * as R from '../game/rules.ts';
import { catchUpMessage, liveTick, runCatchUp } from '../game/simulation.ts';
import { createNewGame, type ArtStyle, type CameraMode, type Quality, type SaveData, type TimeOverride } from '../game/state.ts';
import { dayPhaseForHour, type DayPhase } from '../game/time.ts';
import { areaForLevel, buildOccupancy, canPlaceAt, gateCells, nearestFreeSpot } from '../game/world.ts';
import { applyStyleUniforms, cacheStats, clearAll, getModel, LOWPOLY_MATERIALS, LOWPOLY_TERRAIN, MATERIALS } from '../render/modelCache.ts';
import '../render/lowpoly/index.ts';
import { setVoxelResolution, voxelResolution, voxelsPerWorldUnit } from '../render/voxelMesher.ts';
import { graveModel } from '../render/models/graves.ts';
import { placeableKey, placeableModel, type PVis } from '../render/models/registry.ts';
import { UI } from '../ui/UI.ts';
import { floater, toast } from '../ui/dom.ts';
import { Actors, graveSpots } from '../view/Actors.ts';
import { Atmosphere } from '../view/Atmosphere.ts';
import { CameraRig } from '../view/CameraRig.ts';
import { Effects } from '../view/Effects.ts';
import { ForestMist } from '../view/ForestMist.ts';
import { PostFX } from '../view/PostFX.ts';
import { cellCenter, HALF, worldToCell, WorldView } from '../view/WorldView.ts';
import { Input } from './Input.ts';
import { loadSave, saveNow, scheduleSave } from './persistence.ts';

export type Selection = { kind: 'grave' | 'placeable'; id: string } | null;

export type EntityAction =
  | 'detail' | 'clean' | 'repair' | 'flowers' | 'light' | 'shop' | 'rotate' | 'variant' | 'store' | 'confirm' | 'exhume' | 'move';

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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const now = new Date();
    const params = new URLSearchParams(location.search);
    const urlSeed = Number(params.get('seed'));
    this.state = loadSave() ?? createNewGame(now, Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : undefined);
    // flag di sviluppo: ?style=voxel|miniature|lowpoly (alias ?renderer=legacy|lowpoly)
    const forced = params.get('style') ?? ({ legacy: 'voxel', lowpoly: 'lowpoly' } as Record<string, string>)[params.get('renderer') ?? ''];
    if (forced === 'voxel' || forced === 'miniature' || forced === 'lowpoly') this.state.settings.style = forced;
    const q = this.state.settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: false });
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
    this.world.quality = q;
    if (params.get('mist') !== '0') this.mist = new ForestMist(this.scene, q);
    const report = runCatchUp(this.state, now);
    R.afterAction(this.state, now);
    this.world.sync(this.state);
    const shop = this.state.placeables.find((p) => p.type === 'shop');
    const start = shop ? cellCenter(shop.x + 1, shop.y + 4, [1, 1]) : new THREE.Vector3();
    this.actors = new Actors(this.scene, this.atmosphere, this.state.settings.style, start);
    this.refreshWalkable();
    this.actors.syncPresences(this.state, now);
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
    this.applyQuality(q);
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
  }

  start() {
    this.renderer.setAnimationLoop(this.tick);
  }

  now() { return new Date(); }

  // ── Loop ─────────────────────────────────────────────────────────────

  private readonly tick = () => {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    this.steerFromKeys(dt);
    this.actors.update(dt, t, graveSpots(this.state), (p) => this.groundAt(p));
    this.collectNearbyWisps();
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
    if (this.hudTimer <= 0) { this.hudTimer = 1; this.ui.refreshClock(); }

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
    this.atmosphere.setPhase(phase, weather);
    this.mist?.setConditions(phase, weather, force);
    this.effects.setConditions(phase, weather, true);
    this.ui.refreshClock();
  }

  getPhase() { return this.phase; }

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
    if (document.hidden) { saveNow(this.state); this.clock.stop(); return; }
    this.clock.start();
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
    const { achievements, expanded } = R.afterAction(this.state, now);
    for (const a of achievements) toast(`Traguardo: ${a.name}`, 'ach');
    if (expanded) toast(`Il recinto si allarga: ${areaForLevel(this.state.world.expansionLevel).w}×${areaForLevel(this.state.world.expansionLevel).h}!`, 'ach');
    scheduleSave(this.state);
    this.world.sync(this.state);
    if (expanded) this.updateCameraWorld();
    this.refreshWalkable();
    this.actors.syncPresences(this.state, now);
    this.ui.refreshHud();
    this.ui.refreshContext();
  }

  private refreshWalkable() {
    const occ = buildOccupancy(this.state);
    this.actors.setWorld(areaForLevel(this.state.world.expansionLevel), (x, y) => occ.blocked.has(`${x},${y}`));
  }

  private collectNearbyWisps() {
    const a = this.actors.avatar.pos;
    for (const w of this.state.world.looseWisps) {
      const p = cellCenter(w.x, w.y, [1, 1]);
      if (Math.hypot(p.x - a.x, p.z - a.z) < 0.65) {
        const id = w.id;
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
    this.ui.refreshContext();
  }

  /** Esegue un'azione su tomba/oggetto: il Custode va lì e lavora. */
  performEntityAction(id: string, action: EntityAction) {
    const cells = this.entityCells(id);
    if (!cells) return;
    const center = cellCenter(cells.x, cells.y, cells.fp).setY(1.2);
    const grave = this.state.graves.find((g) => g.id === id);
    const instant: EntityAction[] = ['detail', 'shop', 'rotate', 'variant', 'store', 'confirm', 'exhume', 'move'];
    const run = () => {
      switch (action) {
        case 'clean': this.actors.work(); this.act((s, n) => (grave ? R.cleanGrave(s, id, n) : R.cleanPlaceable(s, id, n)), center); break;
        case 'repair': this.actors.work(1.6); this.act((s, n) => (grave ? R.repairGrave(s, id, n) : R.repairPlaceable(s, id, n)), center); break;
        case 'flowers': this.actors.work(0.8); this.act((s, n) => R.bringFlowers(s, id, n), center); break;
        case 'light': this.act((s) => R.toggleLight(s, id), center); break;
        case 'rotate': this.act((s) => R.rotateEntity(s, id)); break;
        case 'variant': this.act((s) => R.cycleVariant(s, id)); break;
        case 'store': this.act((s) => R.storePlaceable(s, id)); this.select(null); break;
        case 'exhume': this.act((s) => R.exhumeGrave(s, id)); this.select(null); break;
        case 'confirm': this.select(null); toast('Posizionato. Riposi in pace.'); break;
        case 'detail': this.ui.openDetail(id); break;
        case 'shop': this.ui.openShop(); break;
        case 'move': this.setEditMode(true); this.select(this.selection); break;
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

  private pick(x: number, y: number): { entityId?: string; wispId?: string; roamerId?: string } | null {
    this.raycaster.setFromCamera(this.ndc(x, y), this.rig.camera);
    const hits = this.raycaster.intersectObjects([...this.actors.hitboxes, ...this.world.hitboxes], false);
    if (!hits.length) return null;
    // priorità: presenze erranti > fuochi fatui > entità
    const order = (o: THREE.Object3D) => (o.userData.roamerId ? 0 : o.userData.wispId ? 1 : 2);
    hits.sort((a, b) => order(a.object) - order(b.object) || a.distance - b.distance);
    const u = hits[0].object.userData;
    return { entityId: u.entityId, wispId: u.wispId, roamerId: u.roamerId };
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
    if (this.actors.funeralActive) { this.actors.skipFuneral(); return; }
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
    if (hit?.wispId) {
      const w = this.state.world.looseWisps.find((q) => q.id === hit.wispId);
      if (w && !this.editMode) { this.actors.walkTo({ x: w.x, y: w.y }); this.rig.follow = this.actors.avatar.pos; }
      return;
    }
    if (hit?.entityId) {
      const id = hit.entityId;
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
      this.actors.walkTo(g.cell);
      this.rig.follow = this.actors.avatar.pos;
    }
  }

  private tapRoamer(id: string) {
    const r = this.actors.roamerAt(id);
    if (!r || r.dying > 0) return;
    const at = r.pos.clone().setY(1.4);
    const cell = worldToCell(r.pos);
    this.actors.faceTowards(r.pos);
    this.actors.cheer(0.9);
    this.act((s, n) => R.interactRoamer(s, r.kind, n, { rare: r.rare, graveId: r.graveId, x: cell.x, y: cell.y }), at);
    this.effects.puff(r.pos, r.kind === 'ghost' ? '#cfeee6' : r.kind === 'zombie' ? '#9bd34a' : '#e8dfcc');
    this.actors.removeRoamer(id);
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
    this.ui.refreshContext();
  }

  // ── Tastiera ─────────────────────────────────────────────────────────

  private onKey(k: string, down: boolean) {
    if (!down) return;
    if (k === 'escape') { this.ui.escape(); return; }
    if (k === 'c') this.setCamera(this.state.settings.camera === 'angled' ? 'top' : 'angled');
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

  setCamera(mode: CameraMode) {
    this.state.settings.camera = mode;
    this.rig.setMode(mode);
    scheduleSave(this.state);
    this.ui.refreshSettingsButtons();
  }

  setQuality(q: Quality) {
    this.state.settings.quality = q;
    this.applyQuality(q);
    scheduleSave(this.state);
    this.ui.refreshSettingsButtons();
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
    this.applyQuality(this.state.settings.quality);
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
    const shop = next.placeables.find((p) => p.type === 'shop');
    if (shop) this.actors.teleport(cellCenter(shop.x + 1, shop.y + 4, [1, 1]));
    this.rig.setMode(next.settings.camera);
    this.applyQuality(next.settings.quality);
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
