// Attori animati: il Custode (giocatore), le presenze erranti generate dalla
// matrice di spawn, le presenze piazzabili (zombie, fantasmi), l'animale
// domestico della casetta e il corteo funebre. Movimento delle presenze "a torre" sugli assi X/Z: se
// incontrano un ostacolo cambiano direzione; i fantasmi attraversano tutto.

import * as THREE from 'three';
import { CUSTODE_SPEED, MAP_SIZE } from '../game/balance.ts';
import { isPetHouse, PRESENCE_TYPES, rotatedFootprint, visualOf } from '../game/catalog.ts';
import { createRng, hashString } from '../game/rng.ts';
import type { RoamerKind, SpawnRequest } from '../game/spawn.ts';
import type { ArtStyle, Placed, SaveData } from '../game/state.ts';
import type { Rect } from '../game/world.ts';
import type { Atmosphere, AnchorHandle } from './Atmosphere.ts';
import { animateRig, buildRig, rigLightPos, type CharacterKind, type Pose, type Rig } from './characters.ts';
import { DEFAULT_LOOK, lookKey, type CustodeLook } from '../game/look.ts';
import { handPos, HUMAN_PIVOTS } from '../render/lowpoly/v2/custode.ts';
import { broom2LP, mysticStaffLP } from '../render/lowpoly/newItems2.ts';
import { animateNotes, attachProp, lpMesh, playPose, presenceLayout, scenePropObject, type Instrument, type PresenceRole, type PresenceTier, type PropKind } from './presences.ts';
export { BUSINESS_PRESENCES, type PresenceTier } from './presences.ts';
import { instantiate, lightWorldPos, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { BIKE, BIKE_SCALE, bicycleLP } from '../render/lowpoly/extraItems.ts';
import type { LPModel } from '../render/lowpoly/kit.ts';
import type { LightAnchor } from '../render/shape.ts';
import { findPath, type Cell } from './pathfinding.ts';
import { boneMesh, Den, Glyphs } from './petFx.ts';
import { cellCenter, HALF, worldToCell } from './WorldView.ts';

const LIFESPAN: Record<RoamerKind, number> = { ghost: 26, cat: 32, crow: 22, gravedigger: 34, priest: 36, rat: 15, zombie: 30 };
const SPEED: Record<RoamerKind, number> = { ghost: 0.9, cat: 1.6, crow: 3.2, gravedigger: 1.1, priest: 0.9, rat: 2.6, zombie: 0.85 };
const RIG_FOR: Record<RoamerKind, CharacterKind> = { ghost: 'ghost', cat: 'cat', crow: 'crow', gravedigger: 'gravedigger', priest: 'priest', rat: 'rat', zombie: 'zombie' };
const PET_KINDS: CharacterKind[] = ['petDog', 'petCat', 'petRabbit', 'petDuck', 'petCrow'];
const PET_LABELS = ['Cane', 'Gatto', 'Coniglio', 'Papera', 'Corvo'];
/** Quale animale vive in una casetta (ogni animale ha la sua casetta in Bottega). */
const petKind = (h: Placed) => visualOf(h.type, h.variant).variant;

const FADE_OUT = 0.6;

/** Oggetti che portano con sé presenze animate. */
const PRESENCE_HOMES = PRESENCE_TYPES;

/** Andatura zoppa dello zombie: avanza quando poggia la gamba buona, quasi si ferma trascinando l'altra (media ≈ 0,6). */
export function zombieLurch(phase: number): number {
  return 0.28 + 1.05 * Math.max(0, Math.sin(phase * 2.2));
}

interface Walker {
  rig: Rig;
  pos: THREE.Vector3;
  path: THREE.Vector3[];
  speed: number;
  phase: number;
  pose: Pose;
  facing: number;
  lightHandles: AnchorHandle[];
  /** Ombra a disco (qualità Auto con ombre ferme). */
  blob?: THREE.Mesh;
  /** Sollevato da terra (la pedana del bar). */
  lift?: number;
}

export interface Roamer extends Walker {
  id: string;
  kind: RoamerKind;
  rare: boolean;
  graveId?: string;
  /** Fantasma di un ricordo affidato all'Albero dei ricordi. */
  memoryId?: string;
  /** Becchino e prete: un giro con delle tappe, poi se ne vanno da dove sono venuti. */
  visit?: Visit;
  heading: Cell;
  age: number;
  life: number;
  pause: number;
  hitbox: THREE.Mesh;
  dying: number; // >0 durante la dissolvenza
  perched: boolean;
  /** Zombie: ha già sporcato una tomba (al massimo una), e le tombe su cui ha già tentato la sorte. */
  muddied?: boolean;
  tried?: Set<string>;
}

/** Una tappa del giro: una tomba o un oggetto (cella e ingombro). */
export interface VisitStop { id: string; x: number; y: number; fp: [number, number] }

interface Visit {
  stops: VisitStop[];
  i: number;
  stage: 'go' | 'work' | 'leave';
  timer: number;
  planned: boolean;
  exit: THREE.Vector3;
  onStop: (id: string) => void;
  onDone: () => void;
}

interface Presence extends Walker {
  placeId: string;
  role: PresenceRole;
  home: THREE.Vector3;
  radius: number;
  angle: number;
  hidden: boolean;
  extra?: THREE.Object3D;
  /** Ruolo 'still': la posa che tiene sul posto (barista, avventori, contadino). */
  still?: Pose;
  /** Cosa tiene in mano (si riattacca quando si ricostruisce il rig). */
  prop?: PropKind;
  /** Grandezza (fantasmi del picnic e della panchina più piccoli). */
  size?: number;
}

/** Bicicletta sotto il Custode: telaio, ruote e pedivelle che girano, fanalino. */
interface Ride {
  group: THREE.Group;
  frame: THREE.Group;
  wheels: THREE.Group[];
  crank: THREE.Group;
  lamp: { anchor: LightAnchor; handle: AnchorHandle } | null;
  /** Strada fatta in sella (fa girare ruote e pedali). */
  dist: number;
  last: THREE.Vector3;
}

const bikeModel = (m: LPModel) => ({ geometries: m.geometries, lights: m.lights, height: 1, mats: LOWPOLY_MATERIALS, dedicated: true });
let bikeParts: { frame: ReturnType<typeof bikeModel>; wheel: ReturnType<typeof bikeModel>; crank: ReturnType<typeof bikeModel> } | null = null;
/** I pezzi della bici si costruiscono una volta sola. */
function getBikeParts() {
  bikeParts ??= { frame: bikeModel(bicycleLP(false, 0, 'frame')), wheel: bikeModel(bicycleLP(false, 0, 'wheel')), crank: bikeModel(bicycleLP(false, 0, 'crank')) };
  return bikeParts;
}

/**
 * Animale domestico della casetta. Può essere libero (gira per il cimitero e
 * ogni tanto torna a dormire in tana), seguire il Custode o stare a cuccia.
 */
export type PetMode = 'free' | 'follow' | 'home';
type PetAct = 'roam' | 'rest' | 'enter' | 'sleep' | 'follow' | 'wait' | 'fetch' | 'bring' | 'happy';

export interface Pet extends Walker {
  placeId: string;
  label: string;
  variant: number;
  home: THREE.Vector3;
  /** Punto dentro l'arco della casetta (da qui entra ed esce). */
  door: THREE.Vector3;
  /** Cella libera davanti alla casetta. */
  porch: Cell;
  mode: PetMode;
  act: PetAct;
  timer: number;
  repath: number;
  roams: number;
  /** Sta inseguendo il Custode (con isteresi: non si ferma e riparte a scatti). */
  chasing: boolean;
  broken: boolean;
  hitbox: THREE.Mesh;
  den: Den;
}

const PET_SPEED = { roam: 1.3, run: 3.5, dash: 5 };

/**
 * Rito dell'Albero dei ricordi: il corteo arriva alla tomba, la bara esce dalla
 * terra, due portatori la portano all'albero (prete davanti, gli altri dietro,
 * tutti sullo stesso percorso), la posano davanti alla cavità e la terra la accoglie.
 */
interface Rite {
  members: Walker[]; // prete, portatore davanti, portatore dietro, due dolenti
  stage: 'arrive' | 'lift' | 'carry' | 'place' | 'pray' | 'absorb' | 'leave';
  timer: number;
  route: THREE.Vector3[];
  cum: number[];
  s: number;
  coffin: THREE.Object3D;
  fx: THREE.Group;
  ring: THREE.Mesh;
  sparks: Array<{ m: THREE.Mesh; from: THREE.Vector3; t: number }>;
  rest: THREE.Vector3;
  spots: THREE.Vector3[];
  starts: THREE.Vector3[];
  carryFrom: THREE.Vector3;
  canopy: THREE.Vector3;
  onLift: () => void;
  onDone: () => void;
  exit: THREE.Vector3;
}

/** Distanze lungo il corteo (rispetto alla bara): prete, portatori, dolenti. */
const RITE_OFFSETS = [2.1, 0.72, -0.72, -1.9, -3.0];
const RITE_KINDS: CharacterKind[] = ['priest', 'gravedigger', 'mourner', 'mournerB', 'mourner'];
const RITE_GLOW = '#ffd98a';
/** Passo del corteo quando arriva e se ne va (portando la bara è più lento). */
const CORTEGE_SPEED = 2.3;

interface Funeral {
  members: Walker[];
  stage: 'arrive' | 'rite' | 'leave';
  timer: number;
  target: THREE.Vector3;
  onDone: () => void;
  exit: THREE.Vector3;
}

const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const UP = new THREE.Vector3(0, 1, 0);
/** Altezza del manico della scopa sotto il Custode in volo. */
const BROOM_Y = 0.75;
const SPARK_MAT = new THREE.MeshBasicMaterial({ color: '#fff0a0' });

let roamerSeq = 0;

export class Actors {
  readonly group = new THREE.Group();
  avatar: Walker;
  readonly roamers = new Map<string, Roamer>();
  private presences: Presence[] = [];
  private presenceSig = '';
  private funeral: Funeral | null = null;
  private rite: Rite | null = null;
  /** Chi è uscito dal cancello e sta svanendo: secondi rimasti. */
  private fading = new Map<Walker, number>();
  /** Chi ha finito (corteo, rito) e se ne va: cammina fino all'uscita per conto suo, nessun tocco lo fa sparire. */
  private departing: Walker[] = [];
  private style: ArtStyle;
  private area: Rect = { x: 9, y: 9, w: 14, h: 14 };
  private blocked: (x: number, y: number) => boolean = () => false;
  private arrive: (() => void) | null = null;
  private readonly atmosphere: Atmosphere;
  readonly hitboxes: THREE.Object3D[] = [];
  avatarMoving = false;
  private readonly pets = new Map<string, Pet>();
  private readonly glyphs = new Glyphs();
  /** L'osso: in volo (lanciato dal Custode), a terra o in bocca all'animale. */
  private readonly bone = { obj: boneMesh(), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, dur: 0, flying: false, landed: false, carrier: null as Pet | null };
  private ground: (p: THREE.Vector3) => number = () => 0;

  /** Aspetto del Custode (personalizzazione, solo low-poly). */
  private look: CustodeLook | undefined;

  constructor(scene: THREE.Scene, atmosphere: Atmosphere, style: ArtStyle, start: THREE.Vector3, look?: CustodeLook) {
    this.atmosphere = atmosphere;
    this.style = style;
    this.look = look;
    this.group.name = 'attori';
    scene.add(this.group);
    this.avatar = this.makeWalker('custode', start, CUSTODE_SPEED.walk);
    this.group.add(this.glyphs.group, this.bone.obj);
  }

  private makeWalker(kind: CharacterKind, pos: THREE.Vector3, speed: number): Walker {
    const rig = buildRig(kind, this.style, kind === 'custode' ? this.look : undefined);
    rig.root.position.copy(pos);
    this.group.add(rig.root);
    rig.root.updateMatrixWorld(true);
    const lightHandles = rig.lights.map((l, i) => this.atmosphere.addAnchor(rigLightPos(rig, i), l.anchor));
    return { rig, pos: pos.clone(), path: [], speed, phase: Math.random() * 6, pose: 'idle', facing: 0, lightHandles };
  }

  /**
   * Ombre a disco: con le ombre della scena ferme (qualità Auto) i personaggi
   * non entrano nella mappa delle ombre (resterebbero indietro) e hanno un
   * disco scuro sotto i piedi che li segue.
   */
  private blobShadows = false;
  private readonly blobGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  private readonly blobMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

  setBlobShadows(on: boolean) { this.blobShadows = on; }

  private blobRadius(w: Walker): number {
    const sp = w.rig.spec;
    return sp.flier ? 0.17 : sp.quadruped ? 0.26 : 0.34;
  }

  private disposeWalker(w: Walker) {
    if (w.blob) { this.group.remove(w.blob); w.blob = undefined; }
    this.group.remove(w.rig.root);
    for (const h of w.lightHandles) this.atmosphere.removeAnchor(h);
  }

  /** Nuovo aspetto del Custode: si ricostruisce solo il suo rig. */
  setAvatarLook(look: CustodeLook) {
    this.look = look;
    const w = this.avatar;
    this.disposeWalker(w);
    const fresh = this.makeWalker('custode', w.pos, w.speed);
    w.rig = fresh.rig;
    w.lightHandles = fresh.lightHandles;
    w.rig.root.rotation.y = w.facing;
    this.remount();
  }

  setStyle(style: ArtStyle) {
    this.style = style;
    const rebuild = (w: Walker) => {
      const kind = w.rig.kind;
      this.disposeWalker(w);
      const fresh = this.makeWalker(kind, w.pos, w.speed);
      w.rig = fresh.rig;
      w.lightHandles = fresh.lightHandles;
      w.rig.root.rotation.y = w.facing;
    };
    rebuild(this.avatar);
    this.remount();
    for (const r of this.roamers.values()) { rebuild(r); r.rig.root.add(r.hitbox); }
    for (const p of this.pets.values()) { rebuild(p); p.rig.root.add(p.hitbox); p.rig.root.visible = p.act !== 'sleep'; }
    for (const p of this.presences) { rebuild(p); this.attachProp(p); if (p.size) p.rig.root.scale.setScalar(p.size); p.rig.root.visible = !p.hidden; }
    if (this.funeral) for (const m of this.funeral.members) rebuild(m);
    if (this.rite) for (const m of this.rite.members) rebuild(m);
    for (const d of this.departing) rebuild(d);
  }

  setWorld(area: Rect, blocked: (x: number, y: number) => boolean) {
    this.area = area;
    this.blocked = blocked;
  }

  private walkable = (x: number, y: number) =>
    x >= this.area.x && y >= this.area.y && x < this.area.x + this.area.w && y < this.area.y + this.area.h && !this.blocked(x, y);

  /** Dove può andare il Custode: sulla scopa vola sopra tombe e oggetti (ma resta nel recinto). */
  private canGo = (x: number, y: number) =>
    this.broom ? x >= this.area.x && y >= this.area.y && x < this.area.x + this.area.w && y < this.area.y + this.area.h : this.walkable(x, y);

  // ── Custode ──────────────────────────────────────────────────────────

  /** Cammina verso una cella; `onArrive` quando arriva (o subito se già lì). */
  walkTo(goal: Cell, onArrive?: () => void): boolean {
    const start = worldToCell(this.avatar.pos);
    let target = goal;
    if (!this.canGo(goal.x, goal.y)) {
      const alt = this.nearestWalkable(goal, start);
      if (!alt) return false;
      target = alt;
    }
    const path = findPath(start, target, (x, y) => !this.canGo(x, y) && !(x === start.x && y === start.y), MAP_SIZE);
    if (!path) return false;
    this.avatar.path = path.slice(1).map((c) => cellCenter(c.x, c.y, [1, 1]));
    if (this.avatar.path.length) this.avatar.path[this.avatar.path.length - 1] = this.cellPoint(target, goal);
    this.arrive = onArrive ?? null;
    if (!this.avatar.path.length && this.arrive) { const cb = this.arrive; this.arrive = null; cb(); }
    return true;
  }

  /** Punto d'arrivo: centro cella, leggermente spostato verso l'obiettivo. */
  private cellPoint(c: Cell, toward: Cell): THREE.Vector3 {
    const p = cellCenter(c.x, c.y, [1, 1]);
    const t = cellCenter(toward.x, toward.y, [1, 1]);
    return p.lerp(t, (c.x !== toward.x || c.y !== toward.y) ? 0.15 : 0);
  }

  /** Cammina accanto a un ingombro (preferendo il lato frontale, a sud). */
  walkNextTo(x: number, y: number, fp: [number, number], onArrive: () => void): boolean {
    const start = worldToCell(this.avatar.pos);
    const ring: Cell[] = [];
    for (let i = -1; i <= fp[0]; i++) { ring.push({ x: x + i, y: y + fp[1] }); ring.push({ x: x + i, y: y - 1 }); }
    for (let j = 0; j < fp[1]; j++) { ring.push({ x: x - 1, y: y + j }); ring.push({ x: x + fp[0], y: y + j }); }
    const inside = start.x >= x - 1 && start.x <= x + fp[0] && start.y >= y - 1 && start.y <= y + fp[1];
    if (inside) { this.avatar.path = []; this.faceTowards(cellCenter(x, y, fp)); onArrive(); return true; }
    const candidates = ring.filter((c) => this.walkable(c.x, c.y))
      .sort((a, b) => (a.y === y + fp[1] ? -1.5 : 0) - (b.y === y + fp[1] ? -1.5 : 0) + Math.hypot(a.x - start.x, a.y - start.y) * 0.3 - Math.hypot(b.x - start.x, b.y - start.y) * 0.3);
    for (const c of candidates) {
      const center = cellCenter(x, y, fp);
      if (this.walkTo(c, () => { this.faceTowards(center); onArrive(); })) return true;
    }
    return false;
  }

  private nearestWalkable(goal: Cell, from: Cell): Cell | null {
    let best: Cell | null = null, bd = 1e9;
    for (let r = 1; r < 4 && !best; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const c = { x: goal.x + dx, y: goal.y + dy };
        if (!this.walkable(c.x, c.y)) continue;
        const d = Math.hypot(c.x - from.x, c.y - from.y) * 0.1 + Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = c; }
      }
    }
    return best;
  }

  faceTowards(p: THREE.Vector3) {
    const dx = p.x - this.avatar.pos.x, dz = p.z - this.avatar.pos.z;
    if (Math.hypot(dx, dz) > 0.01) this.avatar.facing = Math.atan2(dx, dz);
  }

  /** Controllo diretto (tastiera): direzione in spazio mondo, normalizzata. */
  steer(dir: THREE.Vector3, dt: number) {
    if (dir.lengthSq() < 1e-4) return;
    this.avatar.path = [];
    this.arrive = null;
    const next = this.avatar.pos.clone().addScaledVector(dir, this.avatar.speed * dt);
    const tryMove = (p: THREE.Vector3) => {
      const c = worldToCell(p);
      if (this.canGo(c.x, c.y)) { this.avatar.pos.copy(p); return true; }
      return false;
    };
    if (!tryMove(next)) {
      tryMove(new THREE.Vector3(next.x, 0, this.avatar.pos.z)) || tryMove(new THREE.Vector3(this.avatar.pos.x, 0, next.z));
    }
    this.avatar.facing = Math.atan2(dir.x, dir.z);
    this.avatar.phase += this.avatar.speed * dt * 2.6;
    this.avatar.pose = 'walk';
    this.steered = 0.12;
  }
  private steered = 0;

  work(seconds = 1.1) { this.avatar.pose = 'work'; this.workTimer = seconds; }
  private workTimer = 0;

  cheer(seconds = 1.2) { this.avatar.pose = 'cheer'; this.workTimer = seconds; }

  teleport(p: THREE.Vector3) { this.avatar.pos.copy(p); this.avatar.path = []; }

  // ── Bicicletta ───────────────────────────────────────────────────────

  private ride: Ride | null = null;
  get riding() { return !!this.ride; }

  /** In sella (velocità doppia) o a piedi: la bici compare sotto il Custode e sparisce quando scende. */
  setRiding(on: boolean) {
    if (on === this.riding) return;
    if (on) { this.setFlying(false); this.mount(); }
    else this.dismount();
    this.avatar.speed = CUSTODE_SPEED.walk * (on ? CUSTODE_SPEED.bike : 1);
  }

  // ── Scopa volante e bastone mistico ─────────────────────────────────

  private broom: { group: THREE.Group; sparks: THREE.Mesh[] } | null = null;
  get flying() { return !!this.broom; }

  /** A cavalcioni della scopa: vola sopra tombe e oggetti, più veloce della bici. */
  setFlying(on: boolean) {
    if (on === this.flying) return;
    if (on) { this.setRiding(false); this.mountBroom(); }
    else this.dismountBroom();
    this.avatar.speed = CUSTODE_SPEED.walk * (on ? CUSTODE_SPEED.broom : 1);
  }

  private mountBroom() {
    const a = this.avatar;
    const group = new THREE.Group();
    group.name = 'scopa';
    const broom = lpMesh(broom2LP());
    broom.scale.setScalar(1.25);
    broom.position.set(0, BROOM_Y - 0.02, 0);
    broom.rotation.x = -0.08;
    group.add(broom);
    // scia di stelline dietro la saggina
    const sparks: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.03 - i * 0.003), SPARK_MAT); m.raycast = () => undefined; group.add(m); sparks.push(m); }
    a.rig.root.add(group);
    // il Custode si siede sul manico: l'anca all'altezza della scopa
    const inner = a.rig.root.children[0];
    animateRig(a.rig, 'idle', 0, 0);
    inner.position.set(0, 0, 0);
    a.rig.root.updateMatrixWorld(true);
    const hip = a.rig.root.worldToLocal(a.rig.parts.legL!.getWorldPosition(new THREE.Vector3()));
    inner.position.set(0, BROOM_Y - hip.y + 0.03, -0.05);
    this.broom = { group, sparks };
  }

  private dismountBroom() {
    const b = this.broom;
    if (!b) return;
    b.group.removeFromParent();
    const a = this.avatar;
    a.rig.root.children[0].position.set(0, 0, 0);
    if (a.rig.parts.body) a.rig.parts.body.rotation.x = 0;
    a.lift = 0;
    this.broom = null;
    // si atterra su una cella libera (in volo poteva essere sopra una tomba)
    const c = worldToCell(a.pos);
    if (!this.walkable(c.x, c.y)) {
      const free = this.nearestWalkable(c, c);
      if (free) { a.pos.copy(cellCenter(free.x, free.y, [1, 1])); a.path = []; }
    }
  }

  /** A cavalcioni: gambe ai lati del manico, mani avanti, busto chino; si ondeggia in volo. */
  private poseBroom(t: number) {
    const b = this.broom!;
    const a = this.avatar;
    a.lift = 0.12 + Math.sin(t * 2.1) * 0.05;
    const root = a.rig.root;
    root.updateMatrixWorld(true);
    const p = a.rig.parts;
    const v = new THREE.Vector3();
    const aim = (part: THREE.Group | undefined, x: number, y: number, z: number) => {
      if (!part) return;
      const from = root.worldToLocal(part.getWorldPosition(v));
      part.rotation.x = -Math.atan2(z - from.z, -(y - from.y));
      part.rotation.z = Math.atan2(x - from.x, -(y - from.y)) * 0.9;
    };
    for (const s of [-1, 1]) {
      aim(s < 0 ? p.legL : p.legR, s * 0.2, BROOM_Y - 0.2, 0.18);
      if (a.pose === 'idle' || a.pose === 'walk') aim(s < 0 ? p.armL : p.armR, s * 0.07, BROOM_Y + 0.02, 0.45);
    }
    if (p.body) p.body.rotation.x = 0.18;
    if (p.head) p.head.rotation.x = -0.1;
    b.sparks.forEach((m, i) => { m.position.set(Math.sin(t * 3 + i * 2.1) * 0.12, BROOM_Y + Math.cos(t * 2.5 + i * 1.7) * 0.08, -1.0 - i * 0.18); m.rotation.y = t * 4 + i; });
  }

  /** Il bastone mistico in mano (al posto di niente: la pala resta, il bastone si aggiunge a destra). */
  private staff: THREE.Object3D | null = null;
  setStaff(on: boolean) {
    if (!!this.staff === on) return;
    if (this.staff) { this.staff.removeFromParent(); this.staff = null; }
    if (!on) return;
    const arm = this.avatar.rig.parts.armR;
    if (!arm) return;
    const h = handPos(1), pv = HUMAN_PIVOTS.armR;
    // impugnato nella mano e inclinato di ~25° in fuori (e appena in avanti), non dritto lungo il corpo
    const grip = new THREE.Group();
    grip.name = 'bastone';
    grip.position.set(h.x - pv[0], h.y - pv[1], h.z - pv[2] + 0.02);
    grip.rotation.set(0.12, 0, -0.42);
    const staff = lpMesh(mysticStaffLP(true));
    staff.position.set(0, -0.42, 0);
    grip.add(staff);
    arm.add(grip);
    this.staff = grip;
  }

  private mount() {
    const parts = getBikeParts();
    const group = new THREE.Group();
    group.name = 'bici';
    const frame = instantiate(parts.frame, { castShadow: true });
    const S = BIKE_SCALE;
    const wheels = [BIKE.rearZ, BIKE.frontZ].map((z) => {
      const g = new THREE.Group();
      g.position.set(0, BIKE.R * S, z * S);
      g.add(instantiate(parts.wheel, { castShadow: true }));
      return g;
    });
    const crank = new THREE.Group();
    crank.position.set(0, BIKE.bb[1] * S, BIKE.bb[2] * S);
    crank.add(instantiate(parts.crank, { castShadow: true }));
    group.add(frame, ...wheels, crank);
    const a = this.avatar;
    a.rig.root.add(group);
    // il Custode si siede: l'anca sulla sella, un po' indietro
    const inner = a.rig.root.children[0];
    animateRig(a.rig, 'idle', 0, 0);
    inner.position.set(0, 0, 0);
    a.rig.root.updateMatrixWorld(true);
    const hip = a.rig.root.worldToLocal(a.rig.parts.legL!.getWorldPosition(new THREE.Vector3()));
    inner.position.set(0, 0.47 * S - hip.y + 0.02, -0.12 * S - hip.z);
    const anchor = parts.frame.lights[0];
    const lamp = anchor ? { anchor, handle: this.atmosphere.addAnchor(a.pos.clone(), anchor) } : null;
    const prev = this.ride;
    this.ride = { group, frame, wheels, crank, lamp, dist: prev?.dist ?? 0, last: a.pos.clone() };
  }

  private dismount() {
    const r = this.ride;
    if (!r) return;
    r.group.removeFromParent();
    this.atmosphere.removeAnchor(r.lamp?.handle);
    const a = this.avatar;
    a.rig.root.children[0].position.set(0, 0, 0);
    if (a.rig.parts.body) a.rig.parts.body.rotation.x = 0;
    this.ride = null;
  }

  /** Il rig del Custode è stato ricostruito (stile, aspetto): bici, scopa e bastone tornano con lui. */
  private remount() {
    if (this.staff) { this.staff = null; this.setStaff(true); }
    if (this.broom) { this.broom = null; this.mountBroom(); }
    const r = this.ride;
    if (!r) return;
    this.atmosphere.removeAnchor(r.lamp?.handle);
    r.group.removeFromParent();
    this.ride = null;
    this.mount();
    this.ride!.dist = r.dist;
  }

  /** In sella: piedi sui pedali, mani sulle manopole, busto in avanti; ruote e pedali girano con la strada fatta. */
  private poseRider(dt: number) {
    const r = this.ride!;
    const a = this.avatar;
    const S = BIKE_SCALE;
    const moved = Math.hypot(a.pos.x - r.last.x, a.pos.z - r.last.z);
    r.last.copy(a.pos);
    if (moved < 1) r.dist += moved; // un teletrasporto non fa girare le ruote
    const wheel = r.dist / (BIKE.R * S);
    for (const w of r.wheels) w.rotation.x = wheel;
    const crank = wheel * 0.5;
    r.crank.rotation.x = crank;
    const root = a.rig.root;
    root.updateMatrixWorld(true);
    const p = a.rig.parts;
    const v = new THREE.Vector3();
    const aim = (part: THREE.Group | undefined, x: number, y: number, z: number) => {
      if (!part) return;
      const from = root.worldToLocal(part.getWorldPosition(v));
      part.rotation.x = -Math.atan2(z - from.z, -(y - from.y));
      part.rotation.z = 0;
    };
    for (const s of [-1, 1]) {
      const c = crank + (s > 0 ? 0 : Math.PI);
      aim(s < 0 ? p.legL : p.legR, s * 0.09, (BIKE.bb[1] + Math.cos(c) * 0.07) * S, (BIKE.bb[2] + Math.sin(c) * 0.07) * S);
      // le mani restano sul manubrio (tranne quando lavora o festeggia)
      if (a.pose === 'idle' || a.pose === 'walk') aim(s < 0 ? p.armL : p.armR, s * 0.2 * S, 0.56 * S, 0.1 * S);
    }
    if (p.body) p.body.rotation.x = 0.1;
    if (r.lamp) {
      root.updateMatrixWorld(true);
      this.atmosphere.moveAnchor(r.lamp.handle, lightWorldPos(r.lamp.anchor, v).applyMatrix4(r.frame.matrixWorld));
    }
    void dt;
  }

  // ── Presenze erranti ─────────────────────────────────────────────────

  spawnRoamer(req: SpawnRequest, near?: THREE.Vector3): Roamer {
    const id = `r${++roamerSeq}`;
    const a = this.area;
    let start: THREE.Vector3;
    if (near) start = near.clone();
    else {
      // dal cancello (sud) o da un bordo del recinto
      const rng = createRng(id + Date.now());
      const side = rng.int(4);
      const t = rng.int(Math.max(1, a.w - 2)) + 1;
      const cell = side === 0 ? { x: a.x + Math.floor(a.w / 2), y: a.y + a.h - 1 } : side === 1 ? { x: a.x, y: a.y + t } : side === 2 ? { x: a.x + a.w - 1, y: a.y + t } : { x: a.x + t, y: a.y };
      start = cellCenter(cell.x, cell.y, [1, 1]);
    }
    const rigKind = req.kind === 'ghost' && req.rare ? 'ghostRare' : RIG_FOR[req.kind];
    const w = this.makeWalker(rigKind, start, SPEED[req.kind]);
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(1.1, req.kind === 'ghost' ? 1.8 : 1.4, 1.1), hitMat);
    hitbox.position.y = 0.6;
    hitbox.userData.roamerId = id;
    w.rig.root.add(hitbox);
    this.hitboxes.push(hitbox);
    const dirs: Cell[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    const r: Roamer = {
      ...w, id, kind: req.kind, rare: !!req.rare, graveId: req.graveId, memoryId: req.memoryId,
      heading: dirs[Math.floor(Math.random() * 4)], age: 0, life: LIFESPAN[req.kind] * (req.rare ? 0.6 : 1),
      pause: 0, hitbox, dying: 0, perched: false,
    };
    if (req.kind === 'crow') { r.pos.y = 3; r.path = []; }
    this.roamers.set(id, r);
    return r;
  }

  /**
   * Becchino o prete in visita: entra da `start`, fa le sue tappe (lavora o prega
   * accanto a ciascuna) e se ne va da `exit`. Non svanisce se lo si tocca.
   */
  spawnVisitor(kind: 'priest' | 'gravedigger', start: THREE.Vector3, exit: THREE.Vector3, stops: VisitStop[], onStop: (id: string) => void, onDone: () => void): Roamer {
    const r = this.spawnRoamer({ kind }, start);
    r.speed = kind === 'gravedigger' ? 1.9 : 1.6;
    r.visit = { stops, i: 0, stage: 'go', timer: 0, planned: false, exit, onStop, onDone };
    return r;
  }

  /** Percorso a piedi fino a una cella (si può partire anche da una cella occupata); null se non c'è. */
  private visitPath(from: THREE.Vector3, to: Cell): THREE.Vector3[] | null {
    const a = worldToCell(from);
    const p = findPath(a, to, (x, y) => !this.walkable(x, y) && !(x === a.x && y === a.y) && !(x === to.x && y === to.y), MAP_SIZE);
    return p ? p.slice(1).map((c) => cellCenter(c.x, c.y, [1, 1])) : null;
  }

  private stepVisit(r: Roamer, v: Visit, dt: number) {
    if (v.stage === 'go') {
      if (!v.planned) {
        const s = v.stops[v.i];
        if (!s) {
          v.stage = 'leave';
          const p = this.visitPath(r.pos, worldToCell(v.exit));
          r.path = [...(p ?? []), v.exit.clone()];
          return;
        }
        // una cella libera accanto alla tappa (meglio davanti), la più vicina
        const from = worldToCell(r.pos);
        const ring: Cell[] = [];
        for (let i = -1; i <= s.fp[0]; i++) { ring.push({ x: s.x + i, y: s.y + s.fp[1] }); ring.push({ x: s.x + i, y: s.y - 1 }); }
        for (let j = 0; j < s.fp[1]; j++) { ring.push({ x: s.x - 1, y: s.y + j }); ring.push({ x: s.x + s.fp[0], y: s.y + j }); }
        const near = ring.filter((c) => this.walkable(c.x, c.y)).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y) + (a.y === s.y + s.fp[1] ? -1 : 0) - (b.y === s.y + s.fp[1] ? -1 : 0));
        let path: THREE.Vector3[] | null = null;
        for (const c of near.slice(0, 4)) { path = this.visitPath(r.pos, c); if (path) { path.push(cellCenter(c.x, c.y, [1, 1])); break; } }
        if (!path) { v.i++; return; } // irraggiungibile: passa alla prossima
        r.path = path;
        v.planned = true;
      }
      if (this.followPath(r, dt)) { r.pose = 'walk'; return; }
      const s = v.stops[v.i];
      const c = cellCenter(s.x, s.y, s.fp);
      r.facing = Math.atan2(c.x - r.pos.x, c.z - r.pos.z);
      v.stage = 'work';
      v.timer = r.kind === 'gravedigger' ? 2.2 : 2.8;
    } else if (v.stage === 'work') {
      r.pose = r.kind === 'gravedigger' ? 'work' : 'pray';
      v.timer -= dt;
      if (v.timer <= 0) {
        v.onStop(v.stops[v.i].id);
        v.i++;
        v.stage = 'go';
        v.planned = false;
      }
    } else if (this.followPath(r, dt)) r.pose = 'walk';
    else { const done = v.onDone; v.onDone = () => undefined; done(); r.visit = undefined; this.removeRoamer(r.id, true); }
  }

  removeRoamer(id: string, animate = true) {
    const r = this.roamers.get(id);
    if (!r) return;
    if (animate) { r.dying = 0.6; return; }
    this.disposeWalker(r);
    r.hitbox.geometry.dispose();
    const i = this.hitboxes.indexOf(r.hitbox);
    if (i >= 0) this.hitboxes.splice(i, 1);
    this.roamers.delete(id);
  }

  private stepRoamer(r: Roamer, dt: number, t: number, graves: THREE.Vector3[]) {
    r.age += dt;
    if (r.dying > 0) {
      r.dying -= dt;
      const s = Math.max(0.01, r.dying / 0.6);
      r.rig.root.scale.setScalar(s);
      if (r.kind === 'zombie') r.pos.y -= dt * 1.5;
      if (r.dying <= 0) this.removeRoamer(r.id, false);
      return;
    }
    if (r.visit) { this.stepVisit(r, r.visit, dt); return; }
    if (r.age > r.life) { r.dying = 0.6; return; }
    if (r.kind === 'crow') {
      // vola verso una lapide, si posa, riparte
      if (!r.path.length && !r.perched && graves.length) {
        const g = graves[Math.floor(Math.random() * graves.length)];
        r.path = [g.clone().setY(1.75)];
      }
      if (r.perched) {
        r.pause -= dt;
        r.pose = 'idle';
        if (r.pause <= 0) { r.perched = false; r.path = [r.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 3, (Math.random() - 0.5) * 10))]; }
      } else if (this.followPath(r, dt)) {
        r.pose = 'fly';
      } else {
        r.perched = true;
        r.pause = 4 + Math.random() * 5;
      }
      if (!graves.length && !r.path.length) r.path = [r.pos.clone().add(new THREE.Vector3(Math.random() * 6 - 3, 0, Math.random() * 6 - 3))];
      return;
    }
    if (r.pause > 0) { r.pause -= dt; r.pose = r.kind === 'priest' ? 'pray' : r.kind === 'gravedigger' ? 'work' : 'idle'; return; }
    // movimento "a torre": da un centro di cella al successivo; la direzione si
    // sceglie una volta sola, all'arrivo in ogni cella (prima la scelta si
    // ripeteva a ogni frame e, con frame regolari, il personaggio veniva
    // riportato al centro di continuo: restava fermo a girare su se stesso)
    if (!r.path.length) {
      const ghost = r.kind === 'ghost';
      const cell = worldToCell(r.pos);
      if (r.kind === 'zombie' && !r.muddied) this.zombieStep?.(r, cell);
      const free = (d: Cell) => {
        const nx = cell.x + d.x, ny = cell.y + d.y;
        const inArea = nx >= this.area.x && ny >= this.area.y && nx < this.area.x + this.area.w && ny < this.area.y + this.area.h;
        return inArea && (ghost || !this.blocked(nx, ny));
      };
      const turnChance = r.kind === 'rat' ? 0.4 : r.kind === 'zombie' ? 0.3 : 0.2;
      if (!free(r.heading) || Math.random() < turnChance) {
        const options: Cell[] = [{ x: r.heading.y, y: r.heading.x }, { x: -r.heading.y, y: -r.heading.x }].filter(free);
        if (options.length) r.heading = options[Math.floor(Math.random() * options.length)];
        else if (free({ x: -r.heading.x, y: -r.heading.y })) r.heading = { x: -r.heading.x, y: -r.heading.y };
        else { r.pause = 0.5; r.pose = 'idle'; return; }
        if ((r.kind === 'cat' || r.kind === 'priest' || r.kind === 'gravedigger') && Math.random() < 0.3) { r.pause = 1.5 + Math.random() * 2.5; return; }
      }
      // lo zombie ogni tanto si ferma, ciondola e si guarda intorno
      if (r.kind === 'zombie' && Math.random() < 0.12) { r.pause = 1 + Math.random() * 1.8; r.pose = 'idle'; return; }
      r.path = [cellCenter(cell.x + r.heading.x, cell.y + r.heading.y, [1, 1])];
    }
    this.followPath(r, dt);
    r.pose = 'walk';
    void t;
  }

  /** Avanza lungo il percorso; ritorna true se sta ancora camminando. */
  private followPath(w: Walker, dt: number): boolean {
    if (!w.path.length) return false;
    const target = w.path[0];
    const d = new THREE.Vector3(target.x - w.pos.x, target.y - w.pos.y, target.z - w.pos.z);
    const dist = d.length();
    // lo zombie zoppica: scatta in avanti sulla gamba buona e trascina l'altra
    const step = w.speed * dt * (w.rig.kind === 'zombie' ? zombieLurch(w.phase) : 1);
    if (dist <= step) { w.pos.copy(target); w.path.shift(); }
    else w.pos.addScaledVector(d, step / dist);
    if (Math.hypot(d.x, d.z) > 0.01) w.facing = Math.atan2(d.x, d.z);
    w.phase += step * 2.6;
    return true;
  }

  // ── Presenze piazzabili ──────────────────────────────────────────────

  syncPresences(state: SaveData, now: Date) {
    this.syncPets(state);
    const homes = state.placeables.filter((p) => PRESENCE_HOMES.has(p.type));
    const sig = `${this.presenceTier}|${this.night}|${this.look ? lookKey(this.look) : ''}|` + homes.map((p) => `${p.id}:${p.x}:${p.y}:${p.rot}:${p.variant}:${p.broken}`).join('|');
    if (sig === this.presenceSig) return;
    this.presenceSig = sig;
    for (const p of this.presences) { this.disposeWalker(p); if (p.extra) this.group.remove(p.extra); }
    this.presences = [];
    for (const p of homes) this.addPresences(p, now);
  }

  /** Fascia del dispositivo: quante presenze animano bar e orto. */
  private presenceTier: PresenceTier = 'high';
  setPresenceTier(t: PresenceTier) { this.presenceTier = t; }

  /** Ogni cella raggiunta da uno zombie (la vista decide se sporca una tomba lì accanto). */
  zombieStep: ((r: Roamer, cell: Cell) => void) | null = null;

  /** Notte: il vampiro esce dalla cripta, i fantasmi vanno a ballare nel gazebo. */
  private night = false;
  setNight(on: boolean) { this.night = on; }

  private addPresences(p: Placed, _now: Date) {
    const center = cellCenter(p.x, p.y, rotatedFootprint(p.type, p.rot));
    // gli oggetti ruotati portano con sé chi li abita (posizioni nello spazio dell'oggetto)
    const turn = -p.rot * Math.PI / 2;
    const local = (x: number, z: number) => new THREE.Vector3(x, 0, z).applyAxisAngle(UP, turn).add(center);
    const { cast, props } = presenceLayout(p, { night: this.night, tier: this.presenceTier });
    const made = cast.map((c) => {
      const w = this.makeWalker(c.kind, local(c.x, c.z), c.speed ?? 0.6);
      const home = c.around ? local(c.around[0], c.around[1]) : center.clone();
      const pr: Presence = { ...w, placeId: p.id, role: c.role, home, radius: c.radius ?? 0, angle: (c.angle ?? 0) - turn, hidden: !!c.hidden };
      pr.still = c.pose; pr.lift = c.lift; pr.prop = c.prop; pr.size = c.size;
      pr.facing = (c.facing ?? 0) + turn;
      pr.rig.root.rotation.y = pr.facing;
      if (c.size) pr.rig.root.scale.setScalar(c.size);
      if (c.hidden) pr.rig.root.visible = false;
      this.attachProp(pr);
      this.presences.push(pr);
      return pr;
    });
    for (const sp of props) {
      const obj = scenePropObject(sp.kind, this.look ?? DEFAULT_LOOK);
      const at = local(sp.x, sp.z);
      obj.position.set(at.x, this.ground(at) + sp.y, at.z);
      obj.rotation.y = sp.yaw + turn;
      // la quota del terreno si riprende a ogni frame (la palla-teschio la muovono i fantasmi)
      if (sp.kind !== 'skullBall') obj.userData.lift = sp.y;
      this.group.add(obj);
      made[sp.owner].extra = obj;
    }
  }

  /** Rimette in mano boccale, zappa o strumento (anche dopo che il rig è stato ricostruito). */
  private attachProp(pr: Presence) { attachProp(pr.rig, pr.prop); }

  /** Gli scheletri della banda suonano. */
  private play(pr: Presence, t: number) { playPose(pr.rig, pr.prop as Instrument, t + pr.pos.x); }

  /** L'avventore alza il boccale: ogni tanto beve un sorso, poi brinda. */
  private sip(pr: Presence, t: number) {
    const arm = pr.rig.parts.armR;
    if (!arm) return;
    const k = (((t * 0.35 + pr.pos.x * 0.37) % 1) + 1) % 1;
    arm.rotation.x = k < 0.18 ? -1.35 - Math.sin((k / 0.18) * Math.PI) * 0.4 : -0.75 + Math.sin(t * 2.3) * 0.08;
    if (k < 0.18 && pr.rig.parts.head) pr.rig.parts.head.rotation.x = -0.3;
  }

  private stepPresence(pr: Presence, dt: number, t: number) {
    if (pr.hidden) return;
    switch (pr.role) {
      case 'still': pr.pose = pr.still ?? 'idle'; break;
      case 'sit': pr.pose = 'sit'; break;
      case 'dance':
        pr.angle += dt * 0.9;
        pr.pos.set(pr.home.x + Math.cos(pr.angle) * pr.radius, 0, pr.home.z + Math.sin(pr.angle) * pr.radius);
        pr.facing = -pr.angle;
        pr.pose = 'dance';
        break;
      case 'circle':
        pr.angle += dt * pr.speed / pr.radius;
        pr.pos.set(pr.home.x + Math.cos(pr.angle) * pr.radius, 0, pr.home.z + Math.sin(pr.angle) * pr.radius);
        pr.facing = Math.atan2(-Math.sin(pr.angle), Math.cos(pr.angle));
        pr.pose = 'walk';
        break;
      case 'goalie': {
        // il teschio rimbalza da un fantasma all'altro: chi lo colpisce alza le braccia
        const k = (Math.sin(t * 1.6) + 1) / 2;
        const mine = pr.facing > 0 ? 1 - k : k;
        pr.pose = mine > 0.85 ? 'cheer' : 'idle';
        if (pr.extra) {
          pr.extra.position.set(pr.home.x - 0.55 + k * 1.1, 0.35 + Math.abs(Math.sin(t * 3.2)) * 0.7, pr.home.z);
          pr.extra.rotation.set(t * 3, t * 2, 0);
        }
        break;
      }
      case 'wander':
        if (!pr.path.length) {
          if (Math.random() < dt * 0.5) {
            const a = Math.random() * Math.PI * 2, d = Math.random() * pr.radius;
            pr.path = [new THREE.Vector3(pr.home.x + Math.cos(a) * d, 0, pr.home.z + Math.sin(a) * d)];
          }
          pr.pose = 'idle';
        } else {
          this.followPath(pr, dt);
          pr.pose = 'walk';
        }
        break;
    }
  }

  // ── Animale domestico ────────────────────────────────────────────────

  /** Una casetta = un animale: si creano, spostano e tolgono con le casette. */
  private syncPets(state: SaveData) {
    const houses = state.placeables.filter((p) => isPetHouse(p.type));
    for (const [id, pet] of this.pets) if (!houses.some((h) => h.id === id)) this.removePet(pet);
    for (const h of houses) {
      let pet = this.pets.get(h.id);
      if (pet && pet.variant !== petKind(h)) { this.removePet(pet); pet = undefined; }
      if (!pet) { pet = this.makePet(h); this.pets.set(h.id, pet); }
      const fp = rotatedFootprint(h.type, h.rot);
      const home = cellCenter(h.x, h.y, fp);
      if (!home.equals(pet.home)) { // casetta spostata: l'animale la segue
        pet.home.copy(home);
        pet.door.copy(home).add(new THREE.Vector3(0, 0, 0.42));
        pet.porch = this.porchOf(h);
        pet.den.place(home);
        if (pet.act === 'sleep' || pet.act === 'enter') { pet.pos.copy(pet.door); pet.path = []; pet.act = 'sleep'; }
      }
      pet.porch = this.porchOf(h); // gli oggetti attorno possono cambiare
      pet.broken = h.broken;
      if (pet.broken && pet.act !== 'sleep') this.goHome(pet); // casetta rotta: resta in tana finché non la ripari
    }
  }

  private porchOf(h: Placed): Cell {
    const fp = rotatedFootprint(h.type, h.rot);
    const front = [{ x: h.x + Math.floor(fp[0] / 2), y: h.y + fp[1] }, { x: h.x + Math.floor(fp[0] / 2) - 1, y: h.y + fp[1] }];
    return front.find((c) => this.walkable(c.x, c.y)) ?? this.nearestWalkable(front[0], front[0]) ?? front[0];
  }

  private makePet(h: Placed): Pet {
    const fp = rotatedFootprint(h.type, h.rot);
    const home = cellCenter(h.x, h.y, fp);
    const door = home.clone().add(new THREE.Vector3(0, 0, 0.42));
    const kind = petKind(h);
    const w = this.makeWalker(PET_KINDS[kind % PET_KINDS.length], door, PET_SPEED.roam);
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), hitMat);
    hitbox.position.y = 0.4;
    hitbox.userData.petId = h.id;
    w.rig.root.add(hitbox);
    w.rig.root.visible = false;
    const den = new Den('#8ff0dc');
    den.place(home);
    this.group.add(den.group);
    // riprende quello che faceva (salvato nella casetta); libero, si sveglia dopo poco
    return {
      ...w, placeId: h.id, label: PET_LABELS[kind % PET_LABELS.length], variant: kind, home, door, porch: this.porchOf(h),
      mode: h.petMode ?? 'free', act: 'sleep', timer: h.petMode === 'follow' ? 0.3 : 2 + createRng(h.id).next() * 10, repath: 0, roams: 0, chasing: false, broken: h.broken, hitbox, den,
    };
  }

  private removePet(pet: Pet) {
    if (this.bone.carrier === pet) { this.bone.carrier = null; this.bone.obj.visible = false; }
    this.disposeWalker(pet);
    this.group.remove(pet.den.group);
    pet.hitbox.geometry.dispose();
    this.pets.delete(pet.placeId);
  }

  /** Percorso fino a una cella (il punto di partenza può essere occupato); se non c'è, dritto. */
  private pathTo(from: THREE.Vector3, goal: Cell, final?: THREE.Vector3): THREE.Vector3[] {
    const start = worldToCell(from);
    const path = findPath(start, goal, (x, y) => !this.walkable(x, y) && !(x === start.x && y === start.y) && !(x === goal.x && y === goal.y), MAP_SIZE);
    const pts = (path ?? []).slice(1).map((c) => cellCenter(c.x, c.y, [1, 1]));
    if (final) { if (pts.length) pts[pts.length - 1] = final.clone(); else pts.push(final.clone()); }
    return pts.length ? pts : [cellCenter(goal.x, goal.y, [1, 1])];
  }

  /** Linea libera da un punto all'altro (campionata lungo il segmento). */
  private clearLine(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const start = worldToCell(from);
    const len = Math.hypot(to.x - from.x, to.z - from.z);
    const steps = Math.ceil(len / 0.2);
    const p = new THREE.Vector3();
    for (let i = 1; i <= steps; i++) {
      p.lerpVectors(from, to, i / steps);
      const c = worldToCell(p);
      if (!(c.x === start.x && c.y === start.y) && !this.walkable(c.x, c.y)) return false;
    }
    return true;
  }

  /** Percorso "tirato": salta i centri delle celle quando il punto dopo è già in vista (niente zig-zag). */
  private pullPath(w: Walker) {
    while (w.path.length > 1 && this.clearLine(w.pos, w.path[1])) w.path.shift();
  }

  /**
   * Insegue il Custode in modo fluido: dritto se la via è libera, altrimenti
   * lungo un percorso tirato; tiene il passo e rallenta arrivando, e si
   * ferma/riparte con un po' di margine (niente scatti avanti e indietro).
   */
  private chase(pet: Pet, dt: number, stop: number): boolean {
    const a = this.avatar.pos;
    const d = Math.hypot(a.x - pet.pos.x, a.z - pet.pos.z);
    pet.chasing = pet.chasing ? d > stop : d > stop + 0.6;
    if (!pet.chasing) { pet.path = []; return false; }
    const target = a.clone().add(pet.pos.clone().sub(a).setY(0).normalize().multiplyScalar(stop - 0.05));
    target.y = 0;
    pet.repath -= dt;
    if (this.clearLine(pet.pos, target)) pet.path = [target];
    else if (pet.repath <= 0 || !pet.path.length) { pet.repath = 0.6; pet.path = this.pathTo(pet.pos, worldToCell(a), target); }
    this.pullPath(pet);
    // se è lontano (appena uscito dalla cuccia, o rimasto indietro) corre di più, ma ci arriva sempre a piedi
    pet.speed = THREE.MathUtils.clamp((d - stop) * 3, 0.8, d > 6 ? PET_SPEED.dash : PET_SPEED.run);
    return this.followPath(pet, dt);
  }

  /** Esce dalla tana dall'arco e si ferma sul davanzale. */
  private wake(pet: Pet) {
    pet.pos.copy(pet.door);
    pet.rig.root.visible = true;
    pet.path = [cellCenter(pet.porch.x, pet.porch.y, [1, 1])];
    pet.act = pet.mode === 'follow' ? 'follow' : 'roam';
    pet.roams = 0;
  }

  /** Torna alla casetta ed entra dall'arco. */
  private goHome(pet: Pet) {
    if (pet.act === 'sleep') return;
    pet.speed = pet.mode === 'home' ? PET_SPEED.run : PET_SPEED.roam;
    pet.path = [...this.pathTo(pet.pos, pet.porch), pet.door.clone()];
    pet.act = 'enter';
  }

  /** Riprende quello che stava facendo (dopo coccole e giochi). */
  private resume(pet: Pet) {
    if (pet.broken || pet.mode === 'home') this.goHome(pet);
    else { pet.act = pet.mode === 'follow' ? 'follow' : 'roam'; pet.path = []; pet.timer = 0.5; }
  }

  private randomRoamTarget(pet: Pet): Cell | null {
    const c = worldToCell(pet.pos);
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, d = 3 + Math.random() * 7;
      const t = { x: Math.round(c.x + Math.cos(a) * d), y: Math.round(c.y + Math.sin(a) * d) };
      if (this.walkable(t.x, t.y)) return t;
    }
    return null;
  }

  private stepPet(pet: Pet, dt: number) {
    const a = this.avatar.pos;
    const toAvatar = Math.hypot(a.x - pet.pos.x, a.z - pet.pos.z);
    const face = (p: THREE.Vector3) => { const dx = p.x - pet.pos.x, dz = p.z - pet.pos.z; if (Math.hypot(dx, dz) > 0.05) pet.facing = Math.atan2(dx, dz); };
    pet.den.sleeping = pet.act === 'sleep';
    switch (pet.act) {
      case 'sleep':
        pet.rig.root.visible = false;
        pet.pose = 'idle';
        // libero: dopo un sonnellino esce di nuovo; al seguito (salvato così): esce subito dal Custode
        if (pet.mode !== 'home' && !pet.broken) { pet.timer -= dt; if (pet.timer <= 0) this.wake(pet); }
        return;
      case 'enter':
        this.pullPath(pet);
        if (this.followPath(pet, dt)) { pet.pose = 'walk'; return; }
        pet.act = 'sleep';
        pet.timer = 18 + Math.random() * 25;
        pet.rig.root.visible = false;
        return;
      case 'roam':
        pet.speed = PET_SPEED.roam;
        this.pullPath(pet);
        if (this.followPath(pet, dt)) { pet.pose = 'walk'; return; }
        pet.act = 'rest';
        pet.timer = 1.5 + Math.random() * 3.5;
        pet.pose = 'idle';
        return;
      case 'rest':
        pet.pose = 'idle';
        pet.timer -= dt;
        if (pet.timer > 0) return;
        // dopo qualche giro torna a farsi un pisolino in tana
        if (++pet.roams > 4 + Math.floor(Math.random() * 4)) { this.goHome(pet); return; }
        { const t = this.randomRoamTarget(pet); pet.path = t ? this.pathTo(pet.pos, t) : []; pet.act = 'roam'; }
        return;
      case 'follow': {
        if (this.chase(pet, dt, 1.2)) pet.pose = 'walk';
        else { pet.pose = 'idle'; face(a); }
        return;
      }
      case 'wait': // fermo ad aspettare le coccole
        pet.pose = 'idle';
        face(a);
        pet.timer -= dt;
        if (pet.timer <= 0) this.resume(pet);
        return;
      case 'fetch':
        pet.speed = PET_SPEED.run;
        this.pullPath(pet);
        if (this.followPath(pet, dt)) { pet.pose = 'walk'; return; }
        if (!this.bone.landed) { pet.pose = 'idle'; face(this.bone.obj.position); return; }
        // l'osso è a terra: lo prende e lo riporta
        this.bone.carrier = pet;
        pet.act = 'bring';
        pet.repath = 0;
        return;
      case 'bring': {
        pet.chasing = true; // corre a consegnarlo, senza margine
        if (toAvatar > 1.0 && this.chase(pet, dt, 1.0)) { pet.pose = 'walk'; return; }
        // consegnato: lascia l'osso ai piedi del Custode, tutto contento
        this.bone.carrier = null;
        this.bone.obj.visible = false;
        this.happy(pet, 1.8);
        return;
      }
      case 'happy':
        pet.pose = 'cheer';
        face(a);
        pet.timer -= dt;
        if (pet.timer <= 0) this.resume(pet);
        return;
    }
  }

  private happy(pet: Pet, seconds: number) {
    pet.act = 'happy';
    pet.timer = seconds;
    pet.path = [];
    for (let i = 0; i < 3; i++) {
      const p = pet.pos;
      this.glyphs.spawn('heart', new THREE.Vector3(p.x + (i - 1) * 0.18, this.ground(p) + 0.75 + i * 0.12, p.z), { size: 0.24, life: 1.4 + i * 0.2, vel: new THREE.Vector3((i - 1) * 0.08, 0.5, 0) });
    }
  }

  private updateBone(dt: number) {
    const b = this.bone;
    if (b.flying) {
      b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      b.obj.position.lerpVectors(b.from, b.to, k);
      b.obj.position.y += Math.sin(k * Math.PI) * 1.4;
      b.obj.rotation.set(0, k * 9, k * 14);
      if (k >= 1) { b.flying = false; b.landed = true; b.obj.rotation.set(0, b.obj.rotation.y, 0); }
    } else if (b.carrier) {
      // in bocca: davanti al muso, di traverso
      const head = b.carrier.rig.parts.head;
      if (head) { head.updateWorldMatrix(true, false); b.obj.position.copy(head.localToWorld(new THREE.Vector3(0, 0.02, 0.27))); }
      b.obj.rotation.set(0, b.carrier.rig.root.rotation.y, 0);
    }
  }

  /** Animali delle casette (per i menù). */
  petList(): Array<{ id: string; label: string; mode: PetMode; sleeping: boolean; broken: boolean }> {
    return [...this.pets.values()].map((p) => ({ id: p.placeId, label: p.label, mode: p.mode, sleeping: p.act === 'sleep', broken: p.broken }));
  }

  petAt(id: string) { const p = this.pets.get(id); return p ? { label: p.label, mode: p.mode, sleeping: p.act === 'sleep', broken: p.broken } : null; }

  /** Punto sopra la testa dell'animale (per il menù), o sopra la casetta se dorme. */
  petTop(id: string): THREE.Vector3 | null {
    const p = this.pets.get(id);
    if (!p) return null;
    return p.act === 'sleep' ? p.home.clone().setY(1.4) : p.pos.clone().setY(this.ground(p.pos) + 0.9);
  }

  /** Raggiunge il Custode: esce dalla tana (se dorme) e lo segue per il cimitero. */
  callPet(id: string): string {
    const p = this.pets.get(id);
    if (!p) return '';
    if (p.broken) return `La casetta è rotta: riparala e ${p.label.toLowerCase()} tornerà fuori.`;
    p.mode = 'follow';
    if (p.act === 'sleep') this.wake(p);
    else if (!['fetch', 'bring', 'happy', 'wait'].includes(p.act)) { p.act = 'follow'; p.path = []; }
    return `${p.label} ti raggiunge e ti segue.`;
  }

  /** A cuccia: torna alla casetta e resta a dormire finché non lo richiami. */
  sendPetHome(id: string): string {
    const p = this.pets.get(id);
    if (!p) return '';
    p.mode = 'home';
    if (this.bone.carrier === p) { this.bone.carrier = null; this.bone.obj.visible = false; }
    if (p.act !== 'sleep') this.goHome(p);
    return `${p.label} va a cuccia.`;
  }

  /** Libero: gira per il cimitero e ogni tanto torna in tana. */
  freePet(id: string): string {
    const p = this.pets.get(id);
    if (!p) return '';
    p.mode = 'free';
    if (p.act === 'sleep') { p.timer = 1.5; return `${p.label} esce a fare un giro.`; }
    if (p.act === 'follow') { p.act = 'rest'; p.timer = 0.5; p.path = []; }
    return `${p.label} è libero di girare.`;
  }

  /** Coccole: il Custode si avvicina, l'animale aspetta e poi scodinzola. */
  petPet(id: string, done?: () => void) {
    const p = this.pets.get(id);
    if (!p || p.act === 'sleep') return;
    p.act = 'wait';
    p.timer = 8;
    p.path = [];
    const a = this.avatar.pos;
    const spot = p.pos.clone().add(a.clone().sub(p.pos).setY(0).normalize().multiplyScalar(0.9));
    const pet = () => {
      this.faceTowards(p.pos);
      this.work(1.3);
      this.happy(p, 1.9);
      done?.();
    };
    if (Math.hypot(a.x - p.pos.x, a.z - p.pos.z) < 1.3 || !this.walkTo(worldToCell(spot), pet)) pet();
  }

  /** Lancia l'osso: vola in un punto libero lì vicino, l'animale corre a prenderlo e lo riporta. */
  throwBone(id: string): boolean {
    const p = this.pets.get(id);
    if (!p || p.act === 'sleep' || this.bone.flying || this.bone.carrier) return false;
    const a = this.avatar.pos;
    const c = worldToCell(a);
    let target: Cell | null = null;
    for (let i = 0; i < 16 && !target; i++) {
      const ang = Math.random() * Math.PI * 2, d = 3 + Math.random() * 2.5;
      const t = { x: Math.round(c.x + Math.cos(ang) * d), y: Math.round(c.y + Math.sin(ang) * d) };
      if (this.walkable(t.x, t.y)) target = t;
    }
    if (!target) return false;
    const to = cellCenter(target.x, target.y, [1, 1]);
    this.avatar.path = [];
    this.faceTowards(to);
    this.cheer(0.6);
    const b = this.bone;
    b.from.copy(a).setY(this.ground(a) + 0.75);
    b.to.copy(to).setY(this.ground(to) + 0.04);
    b.t = 0; b.dur = 0.9; b.flying = true; b.landed = false; b.carrier = null;
    b.obj.visible = true;
    p.act = 'fetch';
    p.path = this.pathTo(p.pos, target, to);
    return true;
  }

  // ── Funerale ─────────────────────────────────────────────────────────

  startFuneral(graveCenter: THREE.Vector3, gateCell: Cell, onDone: () => void) {
    // un corteo precedente ancora qui non sparisce: si avvia all'uscita e chiude il suo funerale
    const prev = this.funeral;
    if (prev) {
      this.funeral = null;
      prev.members.forEach((m) => { m.rig.root.visible = true; });
      if (prev.stage !== 'leave') this.depart(prev.members, prev.exit); else this.departing.push(...prev.members);
      prev.onDone();
    }
    const gate = cellCenter(gateCell.x, gateCell.y, [1, 1]);
    // a semicerchio davanti alla tomba, ben distanziati: teste e cappelli grandi non si toccano
    const spots = [
      new THREE.Vector3(0, 0, 1.65), new THREE.Vector3(-1.25, 0, 1.75), new THREE.Vector3(1.25, 0, 1.75), new THREE.Vector3(-0.65, 0, 2.75), new THREE.Vector3(0.75, 0, 2.8),
    ];
    const kinds: CharacterKind[] = ['priest', 'mourner', 'mournerB', 'mourner', 'gravedigger'];
    const members = kinds.map((k, i) => {
      const w = this.makeWalker(k, gate.clone().add(new THREE.Vector3((i - 2) * 0.7, 0, 0.5 + i * 0.45)), CORTEGE_SPEED);
      const dest = graveCenter.clone().add(spots[i]);
      const path = findPath(worldToCell(w.pos), worldToCell(dest), (x, y) => !this.walkable(x, y), MAP_SIZE);
      w.path = (path ?? []).slice(1).map((c) => cellCenter(c.x, c.y, [1, 1]));
      w.path.push(dest);
      return w;
    });
    this.funeral = { members, stage: 'arrive', timer: 0, target: graveCenter.clone(), onDone, exit: gate };
  }

  /** Un corteo occupa la scena finché non se ne va: nel frattempo non se ne può avviare un altro rito. */
  get funeralActive() { return (!!this.funeral && this.funeral.stage !== 'leave') || (!!this.rite && this.rite.stage !== 'leave'); }

  /** Manda chi ha finito verso l'uscita: da qui in poi cammina da solo. */
  private depart(members: Walker[], exit: THREE.Vector3) {
    for (const m of members) {
      const from = worldToCell(m.pos);
      const path = findPath(from, worldToCell(exit), (x, y) => !this.walkable(x, y) && !(from.x === x && from.y === y), MAP_SIZE);
      m.path = (path ?? []).slice(1).map((c) => cellCenter(c.x, c.y, [1, 1]));
      m.path.push(exit.clone().add(new THREE.Vector3(0, 0, 2)));
      m.speed = CORTEGE_SPEED;
      this.departing.push(m);
    }
  }

  // ── Rito dell'Albero dei ricordi ─────────────────────────────────────

  /**
   * Avvia il rito: `grave` è il centro della tomba, `graveFront` la cella libera
   * davanti, `tree` il centro dell'albero (fronte verso +z), `treeFront` la cella
   * davanti al varco. `onLift` quando la bara esce (si nasconde la tomba),
   * `onDone` quando la terra l'ha accolta (o se si salta il rito).
   */
  startRite(o: { grave: THREE.Vector3; graveFront: Cell; tree: THREE.Vector3; treeFront: Cell; gate: Cell; coffin: THREE.Object3D; onLift: () => void; onDone: () => void }) {
    this.endRite();
    const blockedFor = (allow: Cell[]) => (x: number, y: number) => !this.walkable(x, y) && !allow.some((c) => c.x === x && c.y === y);
    const path = findPath(o.graveFront, o.treeFront, blockedFor([o.graveFront, o.treeFront]), MAP_SIZE);
    const route = [o.grave.clone().setY(0), ...(path ?? [o.graveFront, o.treeFront]).map((c) => cellCenter(c.x, c.y, [1, 1]))];
    const cum = [0];
    for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + route[i].distanceTo(route[i - 1]));
    const gate = cellCenter(o.gate.x, o.gate.y, [1, 1]);
    const rest = o.tree.clone().add(new THREE.Vector3(0, 0, 1.95)).setY(0);
    // attorno alla bara posata, ai lati (nessuno davanti: dalla camera la bara resta in vista)
    const spots = [[-1.0, 1.5], [1.0, 1.5], [-1.75, 2.55], [1.75, 2.55], [-2.25, 1.3]].map(([x, z]) => o.tree.clone().add(new THREE.Vector3(x, 0, z)).setY(0));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.95, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: RITE_GLOW, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    const fx = new THREE.Group();
    fx.add(ring);
    this.group.add(fx, o.coffin);
    o.coffin.visible = false;
    const r: Rite = {
      members: [], stage: 'arrive', timer: 0, route, cum, s: 0, coffin: o.coffin, fx, ring, sparks: [],
      rest, spots, starts: [], carryFrom: new THREE.Vector3(), canopy: o.tree.clone().add(new THREE.Vector3(0, 3.8, 0)),
      onLift: o.onLift, onDone: o.onDone, exit: gate,
    };
    r.members = RITE_KINDS.map((k, i) => {
      const w = this.makeWalker(k, gate.clone().add(new THREE.Vector3((i - 2) * 0.7, 0, 0.5 + i * 0.45)), CORTEGE_SPEED);
      const dest = this.routeAt(r, RITE_OFFSETS[i]).p;
      const p = findPath(worldToCell(w.pos), worldToCell(dest), (x, y) => !this.walkable(x, y), MAP_SIZE);
      w.path = (p ?? []).slice(1).map((c) => cellCenter(c.x, c.y, [1, 1]));
      w.path.push(dest);
      return w;
    });
    this.rite = r;
  }

  /** Punto e direzione a distanza `s` lungo il percorso (oltre gli estremi prosegue dritto). */
  private routeAt(r: Rite, s: number): { p: THREE.Vector3; dir: THREE.Vector3 } {
    const { route, cum } = r;
    const n = route.length;
    if (n < 2) return { p: route[0].clone(), dir: new THREE.Vector3(0, 0, 1) };
    let i = 1;
    while (i < n - 1 && cum[i] < s) i++;
    const a = route[i - 1], b = route[i];
    const dir = b.clone().sub(a).setY(0);
    const len = dir.length() || 1;
    dir.divideScalar(len);
    const p = a.clone().addScaledVector(dir, s - cum[i - 1]);
    return { p, dir };
  }

  private endRite() {
    const r = this.rite;
    if (!r) return;
    for (const m of r.members) this.disposeWalker(m);
    this.group.remove(r.fx, r.coffin);
    r.ring.geometry.dispose();
    (r.ring.material as THREE.Material).dispose();
    for (const sp of r.sparks) sp.m.geometry.dispose();
    this.rite = null;
  }

  private stepRite(dt: number) {
    const r = this.rite!;
    r.timer += dt;
    const g = (p: THREE.Vector3) => this.ground(p);
    const total = r.cum[r.cum.length - 1];
    const face = (m: Walker, at: THREE.Vector3) => { const d = at.clone().sub(m.pos); m.facing = Math.atan2(d.x, d.z); };
    const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
    if (r.stage === 'arrive') {
      let moving = false;
      for (const m of r.members) { if (this.followPath(m, dt)) { moving = true; m.pose = 'walk'; } else { m.pose = 'idle'; face(m, r.route[0]); } }
      // se qualcuno resta indietro, l'ultimo tratto lo fa dritto (mai teletrasportato)
      if (moving && r.timer > 25) r.members.forEach((m, i) => { if (m.path.length > 1) m.path = [this.routeAt(r, RITE_OFFSETS[i]).p]; });
      if (!moving) {
        r.stage = 'lift'; r.timer = 0;
        r.onLift();
        r.coffin.visible = true;
      }
    }
    if (r.stage === 'lift') {
      // la bara esce dalla terra e i portatori la sollevano
      const { p, dir } = this.routeAt(r, 0);
      const k = smooth(r.timer / 1.6);
      r.coffin.position.set(p.x, g(p) - 0.35 + k * 0.9, p.z);
      r.coffin.rotation.y = Math.atan2(dir.x, dir.z);
      r.members.forEach((m, i) => { m.pose = i === 1 || i === 2 ? 'work' : 'pray'; face(m, p); });
      if (r.timer > 1.8) { r.stage = 'carry'; r.timer = 0; }
    } else if (r.stage === 'carry') {
      const speed = 1.5;
      r.s = Math.min(total, r.s + speed * dt);
      const c = this.routeAt(r, r.s);
      r.coffin.position.set(c.p.x, g(c.p) + 0.55, c.p.z);
      let dy = Math.atan2(c.dir.x, c.dir.z) - r.coffin.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      r.coffin.rotation.y += dy * Math.min(1, dt * 6);
      r.members.forEach((m, i) => {
        const q = this.routeAt(r, Math.min(total, r.s + RITE_OFFSETS[i]));
        if (q.p.distanceToSquared(m.pos) > 1e-6) m.phase += speed * dt * 2.6;
        m.pos.copy(q.p);
        m.facing = Math.atan2(q.dir.x, q.dir.z);
        m.pose = 'walk';
      });
      if (r.s >= total) {
        r.stage = 'place'; r.timer = 0;
        r.starts = r.members.map((m) => m.pos.clone());
        r.carryFrom = r.coffin.position.clone();
      }
    } else if (r.stage === 'place') {
      // la bara viene posata davanti alla cavità; gli altri si dispongono ai lati
      const k = smooth(r.timer / 1.8);
      const at = r.carryFrom.clone().lerp(r.rest, k);
      r.coffin.position.set(at.x, THREE.MathUtils.lerp(r.carryFrom.y, g(r.rest) + 0.02, k), at.z);
      let dy = 0 - r.coffin.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      r.coffin.rotation.y += dy * Math.min(1, dt * 4);
      r.members.forEach((m, i) => {
        const prev = m.pos.clone();
        m.pos.copy(r.starts[i].clone().lerp(r.spots[i], k));
        if (k < 1) { m.pose = 'walk'; m.phase += prev.distanceTo(m.pos) * 2.6; face(m, r.spots[i]); }
        else { m.pose = 'pray'; face(m, r.rest); }
      });
      if (r.timer > 2.2) { r.stage = 'pray'; r.timer = 0; }
    } else if (r.stage === 'pray') {
      r.members.forEach((m) => { m.pose = 'pray'; face(m, r.rest); });
      if (r.timer > 2.6) { r.stage = 'absorb'; r.timer = 0; r.fx.position.set(r.rest.x, g(r.rest) + 0.06, r.rest.z); }
    } else if (r.stage === 'absorb') {
      // la terra accoglie la bara: un anello di luce, la bara sprofonda, lucciole salgono verso la chioma
      const k = r.timer / 3.2;
      (r.ring.material as THREE.MeshBasicMaterial).opacity = 0.45 * Math.sin(Math.min(1, k) * Math.PI);
      r.ring.scale.setScalar(0.85 + 0.25 * Math.min(1, k));
      r.coffin.position.y = g(r.rest) + 0.02 - smooth(k * 1.1) * 0.6;
      r.members[0].pose = k > 0.35 ? 'cheer' : 'pray';
      if (r.sparks.length < 28 && Math.random() < dt * 12) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.025, 6, 4), new THREE.MeshBasicMaterial({ color: Math.random() < 0.7 ? RITE_GLOW : '#fff4d6', toneMapped: false }));
        const from = r.rest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.7, g(r.rest) + 0.1, (Math.random() - 0.5) * 1.2));
        m.position.copy(from);
        this.group.add(m);
        r.sparks.push({ m, from, t: 0 });
      }
      if (k >= 1) {
        r.stage = 'leave'; r.timer = 0;
        r.coffin.visible = false;
        this.depart(r.members, r.exit);
        r.members = [];
        const done = r.onDone; r.onDone = () => undefined; done();
      }
    } else if (r.stage === 'leave') {
      (r.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (r.ring.material as THREE.MeshBasicMaterial).opacity - dt);
      // resta solo da far svanire l'anello e le ultime lucciole
      if (!r.sparks.length || r.timer > 6) { this.endRite(); return; }
    }
    // lucciole: salgono a spirale verso la chioma e svaniscono
    for (const sp of r.sparks) {
      sp.t += dt / 2.4;
      const a = sp.t * 9 + sp.from.x * 5;
      const p = sp.from.clone().lerp(r.canopy, sp.t);
      sp.m.position.set(p.x + Math.cos(a) * 0.3 * (1 - sp.t), p.y + Math.sin(sp.t * Math.PI) * 0.4, p.z + Math.sin(a) * 0.3 * (1 - sp.t));
      sp.m.scale.setScalar(1 - sp.t * 0.6);
    }
    for (const sp of r.sparks.filter((q) => q.t >= 1)) { this.group.remove(sp.m); sp.m.geometry.dispose(); }
    r.sparks = r.sparks.filter((q) => q.t < 1);
  }

  private endFuneral() {
    if (!this.funeral) return;
    for (const m of this.funeral.members) this.disposeWalker(m);
    this.funeral = null;
  }

  /** Il corteo cammina sullo stesso sentiero: chi è troppo vicino viene scostato, così non si compenetrano. */
  private keepApart(ms: Walker[], dt: number, min = 1) {
    const k = Math.min(1, dt * 6);
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i].pos, b = ms[j].pos;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d >= min) continue;
      const [ux, uz] = d > 1e-4 ? [dx / d, dz / d] : [Math.cos(i + j), Math.sin(i + j)];
      const push = ((min - d) / 2) * k;
      a.x -= ux * push; a.z -= uz * push;
      b.x += ux * push; b.z += uz * push;
    }
  }

  private stepFuneral(dt: number) {
    const f = this.funeral!;
    f.timer += dt;
    if (f.stage !== 'rite') this.keepApart(f.members.filter((m) => m.rig.root.visible), dt);
    if (f.stage === 'arrive') {
      let moving = false;
      for (const m of f.members) {
        if (this.followPath(m, dt)) { moving = true; m.pose = 'walk'; }
        else { m.pose = 'idle'; const d = f.target.clone().sub(m.pos); m.facing = Math.atan2(d.x, d.z); }
      }
      if (!moving || f.timer > 18) { f.stage = 'rite'; f.timer = 0; }
    } else if (f.stage === 'rite') {
      f.members.forEach((m, i) => { m.pose = i === 4 ? 'work' : 'pray'; });
      if (f.timer > 5.5) {
        this.depart(f.members, f.exit);
        f.members = [];
        const done = f.onDone; f.onDone = () => undefined;
        this.funeral = null;
        done();
      }
    } else {
      let moving = false;
      for (const m of f.members) { if (this.followPath(m, dt)) { moving = true; m.pose = 'walk'; } else m.rig.root.visible = false; }
      if (!moving || f.timer > 20) this.endFuneral();
    }
  }

  // ── Aggiornamento ────────────────────────────────────────────────────

  update(dt: number, t: number, graves: THREE.Vector3[], ground: (p: THREE.Vector3) => number) {
    const a = this.avatar;
    if (this.followPath(a, dt)) {
      a.pose = 'walk';
      this.avatarMoving = true;
    } else {
      this.avatarMoving = false;
      if (this.arrive) { const cb = this.arrive; this.arrive = null; cb(); }
      if (this.workTimer > 0) this.workTimer -= dt;
      else if (this.steered > 0) this.steered -= dt;
      else a.pose = 'idle';
    }
    for (const r of [...this.roamers.values()]) this.stepRoamer(r, dt, t, graves);
    for (const p of this.presences) this.stepPresence(p, dt, t);
    this.ground = ground;
    for (const p of this.pets.values()) this.stepPet(p, dt);
    if (this.funeral) this.stepFuneral(dt);
    if (this.rite) this.stepRite(dt);
    for (const d of [...this.departing]) {
      if (!this.fading.has(d) && this.followPath(d, dt)) { d.pose = 'walk'; continue; }
      // arrivati fuori dal cancello svaniscono rimpicciolendo, come le altre presenze (mai di colpo)
      const f = (this.fading.get(d) ?? FADE_OUT) - dt;
      if (f > 0) { this.fading.set(d, f); d.pose = 'idle'; d.rig.root.scale.setScalar(Math.max(0.01, f / FADE_OUT)); continue; }
      this.fading.delete(d);
      this.disposeWalker(d);
      this.departing.splice(this.departing.indexOf(d), 1);
    }

    const apply = (w: Walker) => {
      const y = (w.pos.y > 0.5 ? w.pos.y : ground(w.pos)) + (w.lift ?? 0);
      w.rig.root.position.set(w.pos.x, y, w.pos.z);
      // rotazione morbida
      let d = w.facing - w.rig.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      w.rig.root.rotation.y += d * Math.min(1, dt * 12);
      // in sella non si cammina: si pedala (gambe e braccia le mette poseRider)
      const riding = w === a && (this.ride || this.broom);
      animateRig(w.rig, riding && w.pose === 'walk' ? 'idle' : w.pose, t + w.phase, w.phase);
      if (riding && this.ride) this.poseRider(dt);
      else if (riding) this.poseBroom(t);
      else if ((w as Presence).prop === 'mug') this.sip(w as Presence, t);
      else if ((w as Presence).prop && (w as Presence).prop !== 'hoe') this.play(w as Presence, t);
      // ombra vera nella mappa delle ombre, oppure disco sotto i piedi
      const cast = !this.blobShadows;
      if (w.rig.root.userData.cast !== cast) {
        w.rig.root.traverse((o) => {
          if (!(o as THREE.Mesh).isMesh) return;
          if (o.userData.cast0 === undefined) o.userData.cast0 = o.castShadow;
          o.castShadow = cast && o.userData.cast0;
        });
        w.rig.root.userData.cast = cast;
      }
      if (this.blobShadows && w.rig.root.visible && w.rig.spec.bucket !== 'ghost') {
        if (!w.blob) { w.blob = new THREE.Mesh(this.blobGeo, this.blobMat); w.blob.renderOrder = 1; this.group.add(w.blob); }
        const gy = ground(w.pos);
        const lift = Math.max(0, y - gy);
        w.blob.visible = true;
        w.blob.position.set(w.pos.x, gy + 0.03, w.pos.z);
        w.blob.scale.setScalar(this.blobRadius(w) * w.rig.root.scale.x * Math.max(0.35, 1 - lift * 0.18));
      } else if (w.blob) w.blob.visible = false;
      if (w.lightHandles.length) {
        w.rig.root.updateMatrixWorld(true);
        w.lightHandles.forEach((h, i) => this.atmosphere.moveAnchor(h, rigLightPos(w.rig, i)));
      }
    };
    apply(a);
    for (const r of this.roamers.values()) apply(r);
    for (const p of this.presences) {
      if (!p.hidden) apply(p);
      if (p.extra && p.extra.userData.lift !== undefined) p.extra.position.y = ground(p.extra.position) + p.extra.userData.lift;
      if (p.extra?.userData.notes) animateNotes(p.extra, t);
    }
    for (const p of this.pets.values()) { if (p.rig.root.visible) apply(p); p.den.group.position.y = ground(p.home); p.den.update(dt, t, this.glyphs); }
    if (this.funeral) for (const m of this.funeral.members) apply(m);
    if (this.rite) for (const m of this.rite.members) apply(m);
    for (const d of this.departing) apply(d);
    this.updateBone(dt);
    this.glyphs.update(dt);
  }

  /** Oggetti toccabili: presenze erranti e animali fuori dalla tana. */
  pickables(): THREE.Object3D[] {
    return [...this.hitboxes, ...[...this.pets.values()].filter((p) => p.rig.root.visible).map((p) => p.hitbox)];
  }

  avatarCell(): Cell { return worldToCell(this.avatar.pos); }

  roamerAt(id: string) { return this.roamers.get(id); }

  stats() { return { roamers: this.roamers.size, presences: this.presences.length, pets: this.pets.size }; }
}

export function graveSpots(state: SaveData): THREE.Vector3[] {
  return state.graves.map((g) => cellCenter(g.x, g.y, [2, 2]).add(new THREE.Vector3(0, 0, -0.6)));
}

export const MAP_HALF = HALF;
export { hashString };
