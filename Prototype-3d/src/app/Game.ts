// Controller principale: possiede stato di gioco, scena, camera, attori e UI.
// Ogni azione del giocatore passa da `act()`: regola pura → ricompense →
// espansione/achievement → salvataggio → sincronizzazione della vista.

import * as THREE from 'three';
import { BAT, BUSINESS, FOREST_MARGIN, GRAVE_FOOTPRINT, KEEPER_LAMP, LIVE_TICK_MS, SOUL_BELL, STAFF, ZOMBIE_MUD } from '../game/balance.ts';
import { CATALOG, CATALOG_LIST, EDIT_ONLY, rotatedFootprint, TRACEABLE } from '../game/catalog.ts';
import { applyTheme, uiNext, uiPlay, uiPreview } from './uiNext.ts';
import { watchLifecycle } from './platform.ts';
import { askReminderPermission, clearReminders, remindersAvailable, syncReminders } from './reminders.ts';
import type { GraveVisualState } from '../game/graves.ts';
import { graveVisualState } from '../game/graves.ts';
import * as R from '../game/rules.ts';
import { catchUpMessage, liveTick, runCatchUp } from '../game/simulation.ts';
import { createNewGame, type FpsSetting, type ThemeSetting, type Quality, type QualitySetting, type SaveData, type TimeOverride } from '../game/state.ts';
import { dayPhaseForHour, type DayPhase } from '../game/time.ts';
import type { CustodeLook } from '../game/look.ts';
import { areaForLevel, buildOccupancy, canPlaceAt, gateCells, nearestFreeSpot } from '../game/world.ts';
import { applyStyleUniforms, cacheStats, clearAll, getModel, instantiate, LOWPOLY_MATERIALS, LOWPOLY_TERRAIN, MATERIALS, setLiteMaterials } from '../render/modelCache.ts';
import '../render/lowpoly/index.ts';
import { setVoxelResolution, voxelResolution, voxelsPerWorldUnit } from '../render/voxelMesher.ts';
import { graveModel } from '../render/models/graves.ts';
import { placeableKey, placeableModel, placeableSeed, seedCount, type PVis } from '../render/models/registry.ts';
import { UI } from '../ui/UI.ts';
import { confirmDialog, drawerOpen, floater, toast } from '../ui/dom.ts';
import { npcNote, type NpcNote } from '../ui/npcNote.ts';
import { custodePortrait } from '../ui/lookThumbs.ts';
import { ROAMER_LABELS } from '../game/spawn.ts';
import type { CharacterKind } from '../view/characters.ts';
import { Actors, graveSpots, type PetMode, type VisitStop } from '../view/Actors.ts';
import { Atmosphere } from '../view/Atmosphere.ts';
import { CameraRig } from '../view/CameraRig.ts';
import { Effects } from '../view/Effects.ts';
import { ForestMist, mistOptimized } from '../view/ForestMist.ts';
import { PostFX } from '../view/PostFX.ts';
import { cellCenter, HALF, worldToCell, WorldView } from '../view/WorldView.ts';
import { WalkTarget } from '../view/walkTarget.ts';
import { AutoGovernor, detectTier, newAutoProfile, PROFILES, QUALITY_LABELS, type AutoProfile, type QualityProfile } from './AutoQuality.ts';
import { Input } from './Input.ts';
import { loadSave, persistenceOn, saveNow, scheduleSave } from './persistence.ts';
import { closedCoffinLP } from '../render/lowpoly/memoryTree.ts';

export type Selection = { kind: 'grave' | 'placeable'; id: string } | null;

export type EntityAction =
  | 'detail' | 'clean' | 'repair' | 'flowers' | 'light' | 'shop' | 'rotate' | 'store' | 'confirm' | 'exhume' | 'move' | 'entrust' | 'memories' | 'ring' | 'registry' | 'house';

const PET_STATUS: Record<PetMode, string> = { free: 'Gira libero', follow: 'Ti segue', home: 'A cuccia' };

export interface Placement {
  kind: 'grave' | 'item';
  draft?: R.BurialDraft;
  type?: string;
  x: number;
  y: number;
  rot: number;
  valid: boolean;
  /** Strumento a traccia (interfaccia nuova): i tratti già tirati e quello sotto il dito. */
  trace?: { segs: R.TraceCell[][]; live: R.TraceCell[] | null };
}


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
  /** Interfaccia nuova: il menù dell'oggetto toccato compare solo quando il Custode ci è arrivato. */
  ctxReady = true;
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
  /** FPS disegnati e quante volte al secondo il browser chiama il loop (per le statistiche). */
  private fps = { frames: 0, time: 0, value: 0, calls: 0, callsValue: 0 };
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
    for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'] as const) window.addEventListener(ev, this.markActive, { passive: true });
    const now = new Date();
    const params = new URLSearchParams(location.search);
    const urlSeed = Number(params.get('seed'));
    this.state = opts.state ?? loadSave() ?? createNewGame(now, Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : undefined);
    this.state.settings.style = 'lowpoly'; // l'unico stile del gioco (voxel e miniatura erano prove)
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
    this.world.staticShadows = this.profile().shadows === 'still';
    this.world.quality = q;
    if (params.get('mist') !== '0') this.mist = new ForestMist(this.scene, q);
    // la Casa del Custode c'è sempre, accanto alla Bottega (anche nei salvataggi di prima)
    if (uiPreview()) R.ensureKeeperHouse(this.state, now);
    const report = runCatchUp(this.state, now);
    R.afterAction(this.state, now);
    this.world.sync(this.state);
    const start = this.homeSpot(this.state);
    this.actors = new Actors(this.scene, this.atmosphere, this.state.settings.style, start, this.state.player.look);
    this.scene.add(this.walkMark.group);
    this.refreshWalkable();
    this.actors.setNight(this.isNight());
    this.actors.syncPresences(this.state, now);
    this.actors.zombieStep = (r, cell) => this.zombieStep(r, cell);
    this.actors.setStaff(this.staffOn);
    this.actors.setPace(R.keeperPace(this.state));
    this.rig.setMode(this.state.settings.camera);
    this.rig.jumpTo(start);
    this.rig.follow = this.actors.avatar.pos;
    this.rig.snap();
    if (uiNext()) applyTheme(this.state.settings.theme);
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
    this.stopLifecycle = watchLifecycle({
      pause: this.onPause,
      resume: this.onResume,
      // visibile ma senza focus (centro notifiche, chiamata, split view): al minimo
      blur: () => { this.unfocused = true; },
      focus: () => { this.unfocused = false; this.markActive(); },
    });
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
    this.renderer.setAnimationLoop(this.loop);
  }

  /** Il loop dei frame (la pagina di misura ci mette attorno il suo cronometro). */
  private customLoop: ((time?: number) => void) | null = null;
  private get loop() { return this.customLoop ?? this.tick; }
  setLoop(fn: (time?: number) => void) {
    this.customLoop = fn;
    if (!this.paused) this.renderer.setAnimationLoop(fn);
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

  // ── Frame al secondo (batteria) ──────────────────────────────────────

  /**
   * Meno frame = meno lavoro per GPU e CPU = meno batteria. Il tetto viene
   * dalla fluidità scelta (Auto: 60 in Alta, 30 in Media e Bassa); da fermo
   * (nessun tocco da IDLE_MS, il Custode fermo) si scende a IDLE_FPS e sotto
   * i menù a MENU_FPS.
   */
  private frameCap = 60;
  private idleSaver = true;
  private lastFrameAt = 0;
  private lastActiveAt = 0;
  /** Frame disegnati davvero (quelli saltati dal tetto non contano). */
  framesDrawn = 0;
  private readonly markActive = () => { this.lastActiveAt = performance.now(); };

  /** Pagina di misura: nebbia del bosco ottimizzata (quella del gioco) o la precedente, per confronto. */
  setMistOptimized(on: boolean) { this.mist?.setOptimized(on); }
  get mistOptimized() { return mistOptimized(); }
  /** Pagina di misura: sfocatura ai bordi a mezza risoluzione (quella del gioco) o piena, per confronto. */
  setHalfResBlur(on: boolean) { this.postfx.setHalfRes(on); }
  get halfResBlur() { return this.postfx.half; }

  /** Solo per la pagina di misura: senza rallentamento da fermo (la camera gira da sola, senza tocchi). */
  setIdleSaver(on: boolean) { this.idleSaver = on; this.lastActiveAt = performance.now(); }

  /** Frame al secondo attesi con la fluidità scelta. */
  private targetFps(): 30 | 60 {
    const f = this.state.settings.fps;
    return f === '30' ? 30 : f === '60' ? 60 : this.profile().fps;
  }

  private currentCap(now: number): number {
    // visibile ma senza focus: quasi fermo (vale anche nella pagina di misura)
    if (this.unfocused) return Math.min(this.frameCap, UNFOCUSED_FPS);
    if (!this.idleSaver) return this.frameCap;
    if (drawerOpen()) return Math.min(this.frameCap, MENU_FPS);
    const still = now - this.lastActiveAt > IDLE_MS && !this.actors.avatarMoving && !this.placement && !this.drag;
    return still ? Math.min(this.frameCap, IDLE_FPS) : this.frameCap;
  }

  private readonly tick = (time?: number) => {
    if (this.disposed) return;
    // l'ora del frame data dal browser (allineata allo schermo): quella presa qui dentro
    // ritarda di qualche ms quando il frame prima era pesante, e un frame a 60 FPS
    // sembrerebbe arrivato troppo presto e verrebbe saltato (su iPhone si scendeva verso 30)
    const now = time ?? performance.now();
    this.fps.calls++;
    const cap = this.currentCap(now);
    // frame saltato: niente lavoro (il tempo si accumula e il prossimo frame lo recupera); un po' di
    // tolleranza perché sugli schermi a 120 Hz 60 FPS restino 60 e non scendano a 40
    if (now - this.lastFrameAt < (1000 / cap) * 0.85) return;
    this.lastFrameAt = now;
    this.framesDrawn++;
    const raw = this.clock.getDelta();
    const dt = Math.min(0.05, raw);
    const t = this.clock.elapsedTime;
    // Auto giudica solo i frame al ritmo pieno (da fermo o sotto un menù il gioco rallenta apposta)
    if (this.auto) { if (cap === this.frameCap) this.autoFrame(raw); else this.auto.hold(); }

    this.steerFromKeys(dt);
    // le posizioni delle tombe cambiano solo quando cambia la scena: niente array nuovi a ogni frame
    if (this.spotsVersion !== this.world.version) { this.spots = graveSpots(this.state); this.spotsVersion = this.world.version; }
    this.actors.update(dt, t, this.spots, (p) => this.groundAt(p));
    if (this.batUntil) this.stepBat(now);
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
    if (this.fps.time >= 0.5) {
      this.fps.value = Math.round(this.fps.frames / this.fps.time);
      this.fps.callsValue = Math.round(this.fps.calls / this.fps.time);
      this.fps.frames = 0; this.fps.time = 0; this.fps.calls = 0;
      this.ui.refreshDebug(this.debugInfo());
    }
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

  /** In background (app in pausa, scheda nascosta): si salva e si ferma il loop, niente frame né timer. */
  private paused = false;
  private unfocused = false;
  private stopLifecycle: () => void = () => undefined;

  private readonly onPause = () => {
    this.paused = true;
    saveNow(this.state);
    this.renderer.setAnimationLoop(null);
    // i promemoria si ripianificano adesso: da qui in poi il gioco non gira
    void syncReminders(this.state, this.now());
    this.onPaused?.();
  };

  /** Chi vuole sapere quando l'app va in pausa. */
  onPaused: (() => void) | null = null;

  /**
   * Dopo la prima sepoltura (nell'app): «vuoi un promemoria?». Il permesso
   * di sistema si chiede solo se il giocatore dice di sì, e una volta sola.
   */
  private async offerReminders(name: string) {
    if (!remindersAvailable() || this.state.settings.reminders !== null) return;
    const yes = await confirmDialog({
      title: 'Promemoria',
      message: `Vuoi che ti avvisi il giorno dell’anniversario di ${name}, e quando una tomba sta per rompersi?`,
      ok: 'Sì, avvisami', cancel: 'No, grazie',
    });
    this.setReminders(yes);
  }

  /** Accende o spegne i promemoria (accendendo si chiede il permesso al sistema). */
  async setReminders(on: boolean) {
    const granted = on ? await askReminderPermission() : false;
    this.state.settings.reminders = granted;
    if (on && !granted) toast('Le notifiche sono spente nelle impostazioni del telefono.');
    scheduleSave(this.state);
    if (granted) void syncReminders(this.state, this.now()); else void clearReminders();
    this.ui.refreshSettingsButtons();
  }

  private readonly onResume = () => {
    this.paused = false;
    // scarta la pausa senza azzerare l'orologio: Clock.start()/stop()
    // riportavano il tempo a 0 e le animazioni basate sul tempo trascorso
    // (es. un fuoco fatuo che stava comparendo) diventavano enormi
    this.clock.getDelta();
    this.lastFrameAt = 0;
    this.markActive();
    const report = runCatchUp(this.state, this.now());
    this.afterChange();
    const msg = catchUpMessage(report);
    if (msg) toast(msg);
    this.renderer.setAnimationLoop(this.loop);
  };

  // ── Azioni ───────────────────────────────────────────────────────────

  /**
   * Esegue un'azione di gioco; ritorna false se fallita (con toast). `quiet`: niente
   * toast del messaggio (lo dicono già il «+1» sul posto o la notifica del personaggio).
   */
  act(fn: (s: SaveData, now: Date) => R.ActionResult | void, at?: THREE.Vector3, quiet: boolean | 'rewarded' = false): boolean {
    const now = this.now();
    try {
      const result = fn(this.state, now);
      if (result) {
        // 'rewarded': zitto se c'è una ricompensa (la dice il «+N» sul posto), altrimenti il messaggio serve («È già in ordine»)
        const silent = quiet === true || (quiet === 'rewarded' && !!(result.xp || result.wisps));
        if (result.message && !silent) toast(result.message);
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
    this.actors.setPace(R.keeperPace(this.state));
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
        this.act((s) => R.collectWisp(s, id), p.clone().setY(1), true); // basta il «+1» che vola
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
    if (this.riteIds?.includes(id) && !['detail', 'memories', 'shop', 'registry', 'house'].includes(action)) { toast('Aspetta che il corteo finisca il rito.'); return; }
    const instant: EntityAction[] = ['detail', 'shop', 'rotate', 'store', 'confirm', 'exhume', 'move', 'entrust', 'memories', 'registry', 'house'];
    const run = () => {
      switch (action) {
        case 'clean': this.actors.work(); this.act((s, n) => (grave ? R.cleanGrave(s, id, n) : R.cleanPlaceable(s, id, n)), center, 'rewarded'); break;
        case 'repair': this.actors.work(1.6); this.act((s, n) => (grave ? R.repairGrave(s, id, n) : R.repairPlaceable(s, id, n)), center, 'rewarded'); break;
        case 'flowers': this.actors.work(0.8); this.act((s, n) => R.bringFlowers(s, id, n), center, 'rewarded'); break;
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
        case 'registry': this.ui.openRegistry(); break;
        case 'house': this.ui.openHouse(); break;
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
    // interfaccia nuova: sentieri, recinti e muretti si tracciano col dito
    if (uiNext() && TRACEABLE.has(type)) { this.startTrace(type); return; }
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

  private startTrace(type: string) {
    const c = this.viewCenterCell();
    this.select(null);
    this.placement = { kind: 'item', type, x: c.x, y: c.y, rot: 0, valid: false, trace: { segs: [], live: null } };
    this.rig.follow = null;
    this.refreshPlacement();
  }

  /** Celle del tracciato in ordine, senza doppioni (gli angoli li hanno due tratti). */
  private traceCells(): R.TraceCell[] {
    const t = this.placement!.trace!;
    const seen = new Set<string>();
    return [...t.segs.flat(), ...(t.live ?? [])].filter((c) => {
      const k = `${c.x},${c.y}`;
      return !seen.has(k) && !!seen.add(k);
    });
  }

  /** Tratto dritto da a verso b, sull'asse dove il dito si è mosso di più. */
  private traceLine(a: { x: number; y: number }, b: { x: number; y: number }): R.TraceCell[] {
    const dx = b.x - a.x, dy = b.y - a.y;
    const alongX = Math.abs(dx) >= Math.abs(dy);
    const n = alongX ? Math.abs(dx) : Math.abs(dy);
    return Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (alongX ? Math.sign(dx) * i : 0), y: a.y + (alongX ? 0 : Math.sign(dy) * i), rot: alongX ? 0 : 1 }));
  }

  /** Per la barra in basso: quanti se ne posano, quanti mancano, quanti cadono su spazi occupati. */
  traceInfo() {
    const p = this.placement;
    if (!p?.trace) return null;
    const status = R.traceStatus(this.state, p.type!, this.traceCells());
    const count = (k: R.TraceStatus) => status.filter((x) => x === k).length;
    return { have: R.ownedCount(this.state, p.type!), ok: count('ok'), busy: count('busy'), short: count('short'), segs: p.trace.segs.length };
  }

  undoTrace() {
    const t = this.placement?.trace;
    if (!t?.segs.length) return;
    t.segs.pop();
    this.refreshPlacement();
  }

  /** Compra in Bottega quelli che mancano per finire il tracciato. */
  buyTraceShortfall() {
    const p = this.placement, info = this.traceInfo();
    if (!p || !info?.short) return;
    if (this.act((s, n) => R.buy(s, p.type!, info.short, n))) { this.ui.refreshHud(); this.refreshPlacement(); }
  }

  private placementFp(): [number, number] {
    const p = this.placement!;
    return p.kind === 'grave' ? GRAVE_FOOTPRINT : rotatedFootprint(p.type!, p.rot);
  }

  private refreshPlacement() {
    const p = this.placement;
    this.refreshKeeperArea();
    if (!p) { this.world.hideGhost(); this.ui.refreshPlacementBar(); return; }
    const style = this.state.settings.style;
    if (p.trace) {
      const cells = this.traceCells();
      const status = R.traceStatus(this.state, p.type!, cells);
      const turn = !!CATALOG[p.type!].rotatable;
      const v: PVis = { type: p.type!, variant: 0, dirty: false, broken: false, lit: true, seed: 0 };
      this.world.showTrace(`${style}|${placeableKey(v)}`, () => getModel(placeableKey(v), style, () => placeableModel(v), 0),
        cells.map((c, i) => ({ x: c.x, y: c.y, rot: turn ? c.rot : 0, ok: status[i] === 'ok' })));
      p.valid = status.includes('ok');
      this.ui.refreshPlacementBar();
      return;
    }
    const fp = this.placementFp();
    p.valid = canPlaceAt(p.x, p.y, fp, buildOccupancy(this.state), areaForLevel(this.state.world.expansionLevel));
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
    if (p.trace) {
      const type = p.type!, cells = this.traceCells();
      if (this.act((s, n) => R.placeTrace(s, type, cells, n))) {
        this.placement = null;
        this.refreshPlacement();
      }
      return;
    }
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
        this.custodeSays('Silenzio…', 'Il corteo funebre arriva…');
        this.actors.startFuneral(center, { x: gate[0], y: gate[1] }, () => {
          this.custodeSays('Riposa in pace.', result.message, result);
          this.showRewards(center.clone().setY(1.5), result);
          this.ui.refreshHud();
          void this.offerReminders(grave.name);
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

  private pick(x: number, y: number): { entityId?: string; wispId?: string; roamerId?: string; petId?: string; vampireId?: string } | null {
    this.raycaster.setFromCamera(this.ndc(x, y), this.rig.camera);
    // la tomba affidata, mentre la sua bara è in viaggio, non c'è più
    const hits = this.raycaster.intersectObjects([...this.actors.pickables(), ...this.world.hitboxes], false)
      .filter((h) => !h.object.userData.entityId || !this.world.isHidden(h.object.userData.entityId))
      // il vampiro si tocca solo con la casa e le sue novità accese (uiPreview): il morso
      .filter((h) => !h.object.userData.vampireId || uiPreview());
    if (!hits.length) return null;
    // priorità: presenze erranti e animali > fuochi fatui > entità
    const order = (o: THREE.Object3D) => (o.userData.roamerId || o.userData.petId || o.userData.vampireId ? 0 : o.userData.wispId ? 1 : 2);
    hits.sort((a, b) => order(a.object) - order(b.object) || a.distance - b.distance);
    const u = hits[0].object.userData;
    return { entityId: u.entityId, wispId: u.wispId, roamerId: u.roamerId, petId: u.petId, vampireId: u.vampireId };
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
    if (this.placement?.trace) {
      // un tocco posa una cella sola, nel verso dell'ultimo tratto
      const g = this.groundCell(x, y), t = this.placement.trace;
      if (!g) return;
      t.segs.push([{ x: g.cell.x, y: g.cell.y, rot: t.segs.at(-1)?.at(-1)?.rot ?? 0 }]);
      this.refreshPlacement();
      return;
    }
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
    if (hit?.vampireId && !this.editMode) { this.tapVampire(hit.vampireId); return; }
    if (hit?.wispId) {
      const w = this.state.world.looseWisps.find((q) => q.id === hit.wispId);
      if (w && !this.editMode && this.actors.walkTo({ x: w.x, y: w.y })) { this.markWalk(); this.rig.follow = this.actors.avatar.pos; }
      return;
    }
    // interfaccia nuova: sentieri, recinzioni, erba alta & co. si toccano solo in Modifica, fuori ci si cammina sopra
    const background = hit?.entityId && !this.editMode && uiNext() && EDIT_ONLY.has(this.state.placeables.find((p) => p.id === hit.entityId)?.type ?? '');
    if (hit?.entityId && !background) {
      const id = hit.entityId;
      // bar e orto con l'incasso pronto: toccandoli si riscuote
      if (!this.editMode && R.businessPending(this.state, id, this.now()) > 0) { this.collectBusiness(id); return; }
      this.goTo(id);
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

  /** Seleziona una tomba o un oggetto e ci manda il Custode (il menù compare quando arriva). */
  goTo(id: string) {
    // interfaccia nuova: l'oggetto si evidenzia subito, il menù compare quando il Custode arriva
    const later = uiNext() && !this.editMode;
    this.ctxReady = !later;
    this.select({ kind: this.kindOf(id), id });
    if (this.editMode) return;
    const c = this.entityCells(id)!;
    const arrived = () => { if (later && this.selection?.id === id && !this.ctxReady) { this.ctxReady = true; this.ui.refreshContext(); } };
    const going = this.actors.walkNextTo(c.x, c.y, c.fp, arrived);
    if (!going) arrived(); // non ci si arriva: il menù compare subito
    else if (later && !this.ctxReady) this.markWalk();
    this.rig.follow = this.actors.avatar.pos;
  }

  /**
   * Dal registro: la camera va sulla tomba (o sull'Albero dei ricordi, per
   * chi gli è stato affidato), la seleziona e il Custode si incammina.
   */
  locate(id: string) {
    const target = this.state.graves.some((g) => g.id === id) ? id : R.memoryTree(this.state)?.id;
    if (!target || !this.entityCells(target)) { toast('Non si trova più sulla mappa.'); return; }
    if (this.editMode) this.setEditMode(false);
    this.goTo(target);
    // la camera resta sulla tomba: il Custode arriva nell'inquadratura
    this.focusEntity(target);
  }

  /** Dove il Custode comincia: sulla soglia di casa o (senza casa) davanti alla Bottega. */
  private homeSpot(s: SaveData): THREE.Vector3 {
    const house = uiPreview() ? s.placeables.find((p) => p.type === 'keeper_house') : undefined;
    const shop = s.placeables.find((p) => p.type === 'shop');
    // la casa: nel cortile, davanti alla porta (il vialetto si percorre); la Bottega: davanti all'ingresso
    const door = house ? { x: house.x + 1, y: house.y + 2 } : shop ? { x: shop.x + 1, y: shop.y + 4 } : null;
    if (!door) return new THREE.Vector3();
    // davanti alla porta, se lì si può stare (dentro il recinto, niente sopra); se no la cella libera più vicina:
    // con la casa contro il recinto la soglia cadrebbe fuori, e il Custode non potrebbe più muoversi
    const area = areaForLevel(s.world.expansionLevel), occ = buildOccupancy(s);
    const ok = (x: number, y: number) => x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h && !occ.blocked.has(`${x},${y}`);
    for (let r = 0; r < 12; r++) {
      let best: { x: number; y: number } | null = null, bd = Infinity;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !ok(door.x + dx, door.y + dy)) continue;
        const d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = { x: door.x + dx, y: door.y + dy }; }
      }
      if (best) return cellCenter(best.x, best.y, [1, 1]);
    }
    return cellCenter(door.x, door.y, [1, 1]);
  }

  /**
   * Menù dell'animale (ognuno il suo, così se ne gestiscono più d'uno):
   * raggiungere il Custode, liberarlo, mandarlo a cuccia, coccolarlo, giocarci.
   * Le voci che ora non hanno senso restano visibili ma disattivate (nell'interfaccia nuova non si mostrano).
   */
  petMenu(id: string): Array<{ label: string; icon: string; cls?: string; disabled?: boolean; run: () => void }> {
    const p = this.actors.petAt(id);
    if (!p) return [];
    const off = p.broken;
    return [
      { label: 'Raggiungi il Custode', icon: uiNext() ? 'whistle' : 'paw', disabled: off || p.mode === 'follow', run: () => this.petCommand(id, this.actors.callPet(id)) },
      { label: uiNext() ? 'Lascialo girare' : 'Libera', icon: uiNext() ? 'paw' : 'sun', disabled: off || p.mode === 'free', run: () => this.petCommand(id, this.actors.freePet(id)) },
      { label: 'A cuccia', icon: 'kennel', disabled: off || p.mode === 'home', run: () => this.petCommand(id, this.actors.sendPetHome(id)) },
      { label: 'Accarezza', icon: 'heart', cls: 'primary', disabled: off || p.sleeping, run: () => this.actors.petPet(id) },
      { label: 'Lancia l’osso', icon: 'bone', disabled: off || p.sleeping, run: () => { if (!this.actors.throwBone(id)) toast('Qui non c’è spazio per lanciare l’osso.'); } },
    ];
  }

  /** Un personaggio parla: notifica col ritratto (interfaccia nuova) o toast. */
  private say(n: NpcNote) {
    if (uiNext()) npcNote(n); else toast(n.text);
  }
  private sayText(kind: CharacterKind, name: string, text: string) { this.say({ kind, name, text }); }
  /** Il Custode commenta quello che fa, col suo ritratto (lo stesso dell'HUD). */
  private custodeSays(say: string, text: string, r?: R.ActionResult | null) {
    this.say({ kind: 'custode', name: this.state.player.name, say, text, wisps: r?.wisps && r.wisps > 0 ? r.wisps : undefined, xp: r?.xp || undefined, img: custodePortrait(this.state.player.look, uiPlay()) || undefined });
  }

  /** Dopo un comando l'animale ricorda cosa fa (salvato nella sua casetta). */
  private petCommand(id: string, message: string) {
    const pet = this.actors.petAt(id);
    if (pet) this.sayText(pet.kind, pet.label, message); else toast(message);
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

  // ── Il morso del vampiro ─────────────────────────────────────────────

  /** Fine del volo da pipistrello (performance.now()), o null se si è Custode. */
  private batUntil: number | null = null;
  get isBat(): boolean { return this.actors.isBat; }
  /** Secondi di volo che restano (arrotondati per eccesso). */
  batSecondsLeft(): number { return this.batUntil ? Math.max(0, Math.ceil((this.batUntil - performance.now()) / 1000)) : 0; }

  /** Toccando il vampiro: il suo menù, con «Fatti mordere». */
  private tapVampire(cryptId: string) {
    if (!this.actors.vampire(cryptId)) return;
    this.ui.openActorMenu('Vampiro', this.isBat ? 'Sei già un pipistrello' : 'Ha sete, ma è un gentiluomo', [
      { label: 'Fatti mordere', icon: 'fangs', cls: 'primary', disabled: this.isBat, run: () => this.getBitten(cryptId) },
    ], () => this.actors.vampire(cryptId)?.top ?? null);
  }

  /** Il Custode va dal vampiro (che intanto passeggia), si fa mordere e diventa pipistrello. */
  private getBitten(cryptId: string, tries = 3) {
    const v = this.actors.vampire(cryptId);
    if (!v || this.isBat) return;
    const near = () => this.actors.avatar.pos.distanceTo(v.pos) < 1.6;
    const bite = () => {
      if (!near()) { if (tries > 0) this.getBitten(cryptId, tries - 1); else this.say({ kind: 'vampire', name: 'Vampiro', say: 'Hmpf.', text: 'Il vampiro si è allontanato. Riprova.' }); return; }
      this.actors.holdVampire(cryptId, 1.8, this.actors.avatar.pos);
      this.actors.face(v.pos);
      // il morso, poi lo sbuffo di nuvolette: il cambio avviene mentre il Custode ne è coperto
      setTimeout(() => {
        if (this.disposed || this.isBat) return;
        this.effects.cloudPuff(this.actors.avatar.pos.clone().setY(this.groundAt(this.actors.avatar.pos)));
        setTimeout(() => {
          if (this.disposed || this.isBat) return;
          this.actors.setBat(true);
          this.batUntil = performance.now() + BAT.seconds * 1000;
          this.rig.follow = this.actors.avatar.pos;
          this.say({ kind: 'vampire', name: 'Vampiro', text: 'Il vampiro ti morde: ti trasformi in un pipistrello!' });
          this.ui.refreshSettingsButtons();
        }, 170);
      }, 800);
    };
    this.rig.follow = this.actors.avatar.pos;
    if (near()) { bite(); return; }
    if (this.actors.walkTo(worldToCell(v.pos), bite)) this.markWalk();
    else bite();
  }

  /** Torna Custode: allo scadere del minuto o quando lo si sceglie (poi serve un altro morso). */
  endBat(message = 'Torni Custode. Per volare ancora serve un altro morso.') {
    if ((!this.isBat && !this.batUntil) || this.batEnding) return;
    this.batEnding = true;
    // lo stesso sbuffo di nuvolette, attorno al pipistrello: quando si dirada c'è di nuovo il Custode
    const at = this.actors.batPos();
    if (at) this.effects.cloudPuff(at.setY(at.y - 0.6));
    this.batUntil = null;
    this.ui.refreshSettingsButtons();
    setTimeout(() => {
      if (this.disposed) return;
      this.batEnding = false;
      this.actors.setBat(false);
      this.custodeSays('Puff!', message);
      this.ui.refreshSettingsButtons();
    }, 170);
  }

  private lastBatSecond = -1;
  /** Lo sbuffo del ritorno è partito (il cambio arriva un attimo dopo). */
  private batEnding = false;
  private stepBat(now: number) {
    // sceso per salire in bici o sulla scopa: il volo finisce lì
    if (!this.actors.isBat) { this.batUntil = null; this.ui.refreshSettingsButtons(); return; }
    if (now >= this.batUntil!) { this.endBat('Il minuto è passato: torni Custode.'); return; }
    const left = this.batSecondsLeft();
    if (left !== this.lastBatSecond) { this.lastBatSecond = left; this.ui.refreshBatButton(); }
  }

  private tapRoamer(id: string) {
    const r = this.actors.roamerAt(id);
    if (!r || r.dying > 0) return;
    // becchino e prete in visita: non svaniscono, raccontano cosa stanno facendo
    if (r.visit) {
      const v = r.visit, left = Math.max(0, v.stops.length - v.i);
      const back = (kind: 'priest' | 'gravedigger', home: string) => (this.visitorHome(kind) ? home : 'da dove è venuto');
      if (r.kind === 'gravedigger') {
        this.sayText('gravedigger', 'Becchino', v.stage === 'leave' || !left
          ? (v.stops.length ? `Il becchino ha finito il giro (${v.i} cose ripulite) e torna ${back('gravedigger', 'a casa')}.` : `Il becchino ha controllato: niente da pulire. Torna ${back('gravedigger', 'a casa')}.`)
          : `Il becchino fa il giro e ripulisce metà delle cose sporche del cimitero: ${v.i} fatte, ancora ${left}. Poi torna ${back('gravedigger', 'a casa')}.`);
      } else {
        this.sayText('priest', 'Prete', v.stage === 'leave' || !left
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
    this.act((s, n) => (visit = R.interactRoamer(s, r.kind, n, { rare: r.rare, graveId: r.graveId, memoryId: r.memoryId, x: cell.x, y: cell.y })), at, !r.memoryId);
    // la notifica col ritratto (il fantasma di un ricordo ha la sua scheda, sotto)
    const met = visit as R.ActionResult | null;
    if (met && !r.memoryId) this.say({ kind: r.kind === 'ghost' && r.rare ? 'ghostRare' : r.kind, name: ROAMER_LABELS[r.kind], text: met.message, wisps: met.wisps, xp: met.xp });
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
    let rang: R.ActionResult | null = null;
    if (!this.act((s, n) => (rang = R.ringBell(s, id, n)), center.clone().setY(2.6), true)) return;
    if (rang) this.say({ kind: 'ghost', name: 'Anime', say: 'Din… don…', text: 'Le anime del cimitero accorrono alla campana.' });
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
      if (Math.random() >= R.zombieMudChance(this.state)) continue;
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
      else {
        let first: R.ActionResult | null = null;
        this.act((s, n) => (first = R.priestBless(s, id, n, !blessed)), top, true);
        if (!blessed && first) this.say({ kind: 'priest', name: 'Prete', text: (first as R.ActionResult).message, wisps: (first as R.ActionResult).wisps, xp: (first as R.ActionResult).xp });
        blessed = true;
      }
    }, () => {
      if (kind === 'gravedigger' && cleaned) this.say({ kind: 'gravedigger', name: 'Becchino', text: `Ha finito il giro: ${cleaned} ${cleaned === 1 ? 'cosa ripulita' : 'cose ripulite'}.` });
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
    this.custodeSays('Addio…', 'Il corteo arriva per accompagnarlo all’albero…');
    this.riteIds = [graveId, t.id];
    this.actors.startRite({
      grave, graveFront: { x: g.x, y: g.y + 2 }, tree: t.center, treeFront: t.front, gate: { x: gate[0], y: gate[1] }, coffin,
      onLift: () => { this.world.setHidden(graveId, true); if (this.selection?.id === graveId) this.select(null); this.effects.puff(grave, '#8a7a62'); },
      onDone: () => {
        this.riteIds = null;
        let kept: R.ActionResult | null = null;
        if (!this.act((s, n) => (kept = R.entrustGrave(s, graveId, n)), t.center.clone().setY(3), true)) this.world.setHidden(graveId, false);
        else if (kept) this.custodeSays('Riposa tra le radici.', (kept as R.ActionResult).message, kept);
        this.ui.refreshHud();
      },
    });
  }

  private onDragStart(x: number, y: number): boolean {
    this.ui.closeBubble();
    const g = this.groundCell(x, y);
    if (!g) return false;
    if (this.placement?.trace) {
      // un dito traccia (due dita spostano la vista): il tratto parte dalla casella toccata (toccando
      // la fine del tratto prima l'angolo è in comune, toccando quella accanto si parte da lì)
      const t = this.placement.trace;
      t.live = this.traceLine(g.cell, g.cell);
      this.refreshPlacement();
      return true;
    }
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
    const t = this.placement?.trace;
    if (owned && t?.live) {
      const g = this.groundCell(x, y);
      if (!g) return;
      t.live = this.traceLine(t.live[0], g.cell);
      this.refreshPlacement();
      return;
    }
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
    const t = this.placement?.trace;
    if (owned && t?.live) {
      // alzando il dito il tratto resta (un tratto di una cella sola è il dito che si posa per il pizzico)
      if (t.live.length > 1) t.segs.push(t.live);
      t.live = null;
      this.refreshPlacement();
      return;
    }
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

  /** Personalizzazione del Custode: salva e ricostruisce subito il personaggio. */
  setLook(look: CustodeLook) {
    this.state.player.look = look;
    this.actors.setAvatarLook(look);
    scheduleSave(this.state);
    this.ui.refreshHud(); // il ritratto nel riquadro segue l'aspetto
  }

  // ── Bicicletta ───────────────────────────────────────────────────────

  /** La bici si usa da dove si trova il Custode: si sale e si scende con l'icona (o il tasto B). */
  ownsBike(): boolean { return R.ownedCount(this.state, 'bike') > 0; }

  get riding(): boolean { return this.actors.riding; }

  toggleBike() {
    if (!this.ownsBike()) { toast('Prima compra la bicicletta in Bottega (Extra).'); return; }
    this.actors.setRiding(!this.actors.riding);
    if (this.actors.riding) this.custodeSays('Si parte!', 'In sella: si va al doppio della velocità.'); else this.custodeSays('Ecco fatto.', 'Il Custode scende dalla bici.');
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
    if (this.actors.flying) this.custodeSays('Si vola!', 'A cavalcioni della scopa: si vola sopra tombe e recinti.'); else this.custodeSays('Terra!', 'Il Custode atterra e scende dalla scopa.');
    this.ui.refreshSettingsButtons();
  }

  /** Impugna o posa il bastone mistico: impugnato, i fuochi fatui accorrono da lontano. */
  toggleStaff() {
    if (!this.ownsStaff()) { toast('Il bastone mistico si sblocca raccogliendo 500 fuochi fatui.'); return; }
    this.state.settings.staffEquipped = !this.state.settings.staffEquipped;
    this.actors.setStaff(this.staffOn);
    if (this.staffOn) this.custodeSays('A me!', 'Bastone impugnato: i fuochi fatui accorrono da lontano.'); else this.custodeSays('Riposo.', 'Bastone posato.');
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
    let got: R.ActionResult | null = null;
    if (this.act((s, now) => (got = R.collectBusiness(s, id, now)), at, true)) {
      // chi lavora lì racconta l'incasso
      const res = got as R.ActionResult | null, n = res?.wisps ?? 0, type = this.state.placeables.find((p) => p.id === id)?.type;
      const pl = n === 1 ? 'fuoco fatuo' : 'fuochi fatui';
      if (type === 'witch_corner') this.say({ kind: 'witch', name: 'Strega', text: `Ha venduto ${n} ${n === 1 ? 'pozione' : 'pozioni'} ai visitatori.`, wisps: n });
      else if (type === 'zombie_bar') this.say({ kind: 'zombie', name: 'Bar degli zombie', say: 'Salute!', text: `Al bar si è brindato alla tua: ${n} ${pl} di incasso.`, wisps: n });
      else if (type === 'brain_farm') this.say({ kind: 'gardener', name: 'Orto dei cervelli', text: `Il raccolto dei cervelli rende ${n} ${pl}.`, wisps: n });
      else this.custodeSays('Che raccolto!', `L’orto dietro casa rende ${n} ${pl}.`, res);
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

  /** Tema dell'interfaccia nuova: chiaro, scuro o quello del telefono. */
  setTheme(t: ThemeSetting) {
    this.state.settings.theme = t;
    applyTheme(t);
    scheduleSave(this.state);
    this.ui.refreshSettingsButtons();
  }

  /** Fluidità: «auto» (60 in Alta, 30 in Media e Bassa), 30 o 60 FPS. */
  setFps(f: FpsSetting) {
    this.state.settings.fps = f;
    this.applyFrameCap();
    scheduleSave(this.state);
    this.ui.refreshSettingsButtons();
  }

  // ── Livelli di qualità e Auto ────────────────────────────────────────

  /** Regolatore della qualità Auto (null con un livello fisso). */
  private auto: AutoGovernor | null = null;
  private spots: THREE.Vector3[] = [];
  private spotsVersion = -1;
  private shadowSig = '';
  private materialSig = '';

  /** Il livello in uso: quello scelto, o quello a cui è arrivata Auto. */
  private level(): Quality {
    const q = this.state.settings.quality;
    return q === 'auto' ? this.auto?.tier ?? 'medium' : q;
  }

  private profile(): QualityProfile { return PROFILES[this.level()]; }

  /** Densità di bosco e prato, nebbia e particelle del livello in uso. */
  private baseQuality(): Quality { return this.profile().bake; }

  /** Applica il livello in uso (scelto o di Auto): mondo, luci, materiali, ombre, risoluzione, sfocatura, fluidità. */
  private applySettingQuality() {
    const p = this.profile();
    // ombre ferme: ciò che si muove non proietta ombra (ce l'ha a disco), le altre si ridisegnano solo se cambia la vista
    const still = p.shadows === 'still';
    if (this.world.staticShadows !== still) {
      this.world.staticShadows = still;
      this.world.setStyle(this.state.settings.style, this.state, true); // ricrea ciò che si muove senza ombra
    }
    this.actors.setBlobShadows(p.shadows !== 'live');
    this.renderer.shadowMap.enabled = p.shadows !== 'off';
    this.renderer.shadowMap.autoUpdate = p.shadows === 'live';
    this.renderer.shadowMap.needsUpdate = true;
    this.world.setLite(p.lite, this.state); // rifà prato e bosco se cambia
    this.world.setMergeStatic(true); // oggetti fermi fusi per zona: stesso aspetto, meno draw call
    this.atmosphere.setFakeLights(p.fakeLights);
    if (!p.fakeLights) this.atmosphere.setLightBudget(null);
    this.actors.setPresenceTier(p.presences);
    this.actors.syncPresences(this.state, this.now());
    this.applyQuality(p.bake);
    // dopo ogni ricostruzione: il materiale semplice vale anche per ciò che è appena nato
    setLiteMaterials(p.liteMaterials, this.scene);
    this.postfx.setSamples(p.msaa);
    this.postfx.configure(this.state.settings.edgeBlur, p.blurRadius);
    this.applyResolution();
    this.applyFrameCap();
    if (this.auto) saveAutoProfile(this.auto.profile());
    this.prepareShaders();
  }

  /** Risoluzione: il gradino di Auto, o la più alta del livello scelto. */
  private applyResolution() {
    const steps = this.profile().dpr;
    const dpr = steps[this.auto ? Math.min(this.auto.step, steps.length - 1) : steps.length - 1];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dpr));
    this.resize();
  }

  private applyFrameCap() {
    this.frameCap = this.targetFps();
    this.lastActiveAt = performance.now();
    this.auto?.hold();
  }

  /**
   * Shader pronti prima di servire: dopo un cambio di livello (o al caricamento)
   * si compilano tutti in una volta, invece che a pezzi nei frame successivi.
   * (compileAsync di three si rompe dove manca KHR_parallel_shader_compile.)
   */
  private prepareShaders() {
    try { this.renderer.compile(this.scene, this.rig.camera); } catch { /* si compileranno al primo disegno */ }
  }

  private autoFrame(raw: number) {
    const auto = this.auto!;
    const d = auto.frame(raw, this.frameCap);
    if (d === 'step') { this.applyResolution(); saveAutoProfile(auto.profile()); }
    else if (d === 'tier') this.applySettingQuality();
  }

  /** Ombre ferme: si ridisegnano solo se si muove la camera o il sole, o se cambia la scena. */
  private refreshStaticShadows() {
    const sun = this.atmosphere.sun.position, tg = this.rig.target;
    const sig = `${tg.x.toFixed(2)}|${tg.z.toFixed(2)}|${this.rig.viewHeight.toFixed(2)}|${sun.x.toFixed(2)}|${sun.y.toFixed(2)}|${sun.z.toFixed(2)}|${this.world.version}`;
    if (sig !== this.shadowSig) { this.shadowSig = sig; this.renderer.shadowMap.needsUpdate = true; }
  }

  /** Per le statistiche tecniche: livello, risoluzione, fluidità, ombre e luci. */
  qualityInfo(): string {
    const p = this.profile(), a = this.auto;
    const level = a ? `auto · ${QUALITY_LABELS[a.tier]} (max ${QUALITY_LABELS[a.top]}) · gradino ${a.step + 1}/${p.dpr.length}` : QUALITY_LABELS[this.level()];
    const shadows = p.shadows === 'off' ? 'no' : p.shadows === 'still' ? 'ferme' : 'vive';
    return `qualità ${level} · dpr ${this.renderer.getPixelRatio()} · tetto ${this.currentCap(performance.now())}/${this.frameCap} FPS · ombre ${shadows} · luci ${p.fakeLights ? 'finte' : 'vere'}${p.liteMaterials ? ' · materiale semplice' : ''}${p.lite ? ' · mondo leggero' : ''}`;
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
    // ricompilare tutto costa secondi sui telefoni: solo se cambiano le ombre (accese/spente o tipo)
    const sig = `${this.renderer.shadowMap.enabled}|${this.renderer.shadowMap.type}`;
    if (sig !== this.materialSig) {
      this.materialSig = sig;
      for (const m of [...Object.values(MATERIALS), ...Object.values(LOWPOLY_MATERIALS), LOWPOLY_TERRAIN]) m.needsUpdate = true;
    }
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

  /** Camera sulla Casa del Custode, selezionata (dopo un acquisto in Bottega). */
  focusHouse() {
    const house = this.state.placeables.find((p) => p.type === 'keeper_house');
    if (!house) return;
    this.focusEntity(house.id);
    this.select({ kind: 'placeable', id: house.id });
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
    if (uiPreview()) R.ensureKeeperHouse(next, this.now());
    this.actors.teleport(this.homeSpot(next));
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
      `FPS ${this.fps.value} · il browser ne offre ${this.fps.callsValue}/s`,
      this.qualityInfo(),
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
    this.stopLifecycle();
    saveNow(this.state);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}

// ── Profilo della qualità Auto (per dispositivo: resta nel browser, non nel salvataggio) ──

const AUTO_KEY = 'necro3d:auto-quality';
/** Cresce quando cambia la stima del dispositivo: i profili ricordati prima si rifanno (v2: iPhone in Alta). */
const AUTO_VERSION = 2;
/** Dopo quanto senza tocchi il gioco rallenta, e a quanti frame al secondo (sotto i menù ancora meno). */
const IDLE_MS = 4000, IDLE_FPS = 15, MENU_FPS = 10, UNFOCUSED_FPS = 5;
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
    const saved = JSON.parse(localStorage.getItem(AUTO_KEY) ?? 'null') as (AutoProfile & { gpu: string; v?: number }) | null;
    if (saved && saved.v === AUTO_VERSION && saved.gpu === info.gpu && saved.tier in PROFILES && saved.top in PROFILES) return saved;
  } catch { /* profilo illeggibile: si riparte */ }
  return newAutoProfile(detectTier(info));
}

function saveAutoProfile(p: AutoProfile) {
  if (!persistenceOn()) return;
  try { localStorage.setItem(AUTO_KEY, JSON.stringify({ ...p, gpu: gpuName ?? deviceInfo().gpu, v: AUTO_VERSION })); } catch { /* storage pieno o bloccato */ }
}
