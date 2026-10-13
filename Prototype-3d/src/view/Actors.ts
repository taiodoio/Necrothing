// Attori animati: il Custode (giocatore), le presenze erranti generate dalla
// matrice di spawn, le presenze piazzabili (zombie, fantasmi), l'animale
// domestico della casetta e il corteo funebre. Movimento delle presenze "a torre" sugli assi X/Z: se
// incontrano un ostacolo cambiano direzione; i fantasmi attraversano tutto.

import * as THREE from 'three';
import { MAP_SIZE } from '../game/balance.ts';
import { CATALOG, rotatedFootprint } from '../game/catalog.ts';
import { createRng, hashString } from '../game/rng.ts';
import type { RoamerKind, SpawnRequest } from '../game/spawn.ts';
import type { ArtStyle, Placed, SaveData } from '../game/state.ts';
import type { Rect } from '../game/world.ts';
import type { Atmosphere, AnchorHandle } from './Atmosphere.ts';
import { animateRig, buildRig, rigLightPos, type CharacterKind, type Pose, type Rig } from './characters.ts';
import { LP } from '../render/lowpoly/kit.ts';
import type { CustodeLook } from '../game/look.ts';
import { skull } from '../render/lowpoly/extras.ts';
import { instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { findPath, type Cell } from './pathfinding.ts';
import { boneMesh, Den, Glyphs } from './petFx.ts';
import { cellCenter, HALF, worldToCell } from './WorldView.ts';

const LIFESPAN: Record<RoamerKind, number> = { ghost: 26, cat: 32, crow: 22, gravedigger: 34, priest: 36, rat: 15, zombie: 30 };
const SPEED: Record<RoamerKind, number> = { ghost: 0.9, cat: 1.6, crow: 3.2, gravedigger: 1.1, priest: 0.9, rat: 2.6, zombie: 0.55 };
const RIG_FOR: Record<RoamerKind, CharacterKind> = { ghost: 'ghost', cat: 'cat', crow: 'crow', gravedigger: 'gravedigger', priest: 'priest', rat: 'rat', zombie: 'zombie' };
const PET_KINDS: CharacterKind[] = ['petDog', 'petCat', 'petRabbit', 'petDuck', 'petCrow'];

interface Walker {
  rig: Rig;
  pos: THREE.Vector3;
  path: THREE.Vector3[];
  speed: number;
  phase: number;
  pose: Pose;
  facing: number;
  lightHandles: AnchorHandle[];
}

export interface Roamer extends Walker {
  id: string;
  kind: RoamerKind;
  rare: boolean;
  graveId?: string;
  heading: Cell;
  age: number;
  life: number;
  pause: number;
  hitbox: THREE.Mesh;
  dying: number; // >0 durante la dissolvenza
  perched: boolean;
}

interface Presence extends Walker {
  placeId: string;
  role: 'sit' | 'dance' | 'wander' | 'circle' | 'goalie';
  home: THREE.Vector3;
  radius: number;
  angle: number;
  hidden: boolean;
  extra?: THREE.Object3D;
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
  /** Sta inseguendo il padrone (con isteresi: non si ferma e riparte a scatti). */
  chasing: boolean;
  broken: boolean;
  hitbox: THREE.Mesh;
  den: Den;
}

const PET_SPEED = { roam: 1.3, run: 3.5 };

interface Funeral {
  members: Walker[];
  stage: 'arrive' | 'rite' | 'leave';
  timer: number;
  target: THREE.Vector3;
  onDone: () => void;
  exit: THREE.Vector3;
}

const hitMat = new THREE.MeshBasicMaterial({ visible: false });
let roamerSeq = 0;

export class Actors {
  readonly group = new THREE.Group();
  avatar: Walker;
  readonly roamers = new Map<string, Roamer>();
  private presences: Presence[] = [];
  private presenceSig = '';
  private funeral: Funeral | null = null;
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
    this.avatar = this.makeWalker('custode', start, 3.1);
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

  private disposeWalker(w: Walker) {
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
    for (const r of this.roamers.values()) { rebuild(r); r.rig.root.add(r.hitbox); }
    for (const p of this.pets.values()) { rebuild(p); p.rig.root.add(p.hitbox); p.rig.root.visible = p.act !== 'sleep'; }
    for (const p of this.presences) rebuild(p);
    if (this.funeral) for (const m of this.funeral.members) rebuild(m);
  }

  setWorld(area: Rect, blocked: (x: number, y: number) => boolean) {
    this.area = area;
    this.blocked = blocked;
  }

  private walkable = (x: number, y: number) =>
    x >= this.area.x && y >= this.area.y && x < this.area.x + this.area.w && y < this.area.y + this.area.h && !this.blocked(x, y);

  // ── Custode ──────────────────────────────────────────────────────────

  /** Cammina verso una cella; `onArrive` quando arriva (o subito se già lì). */
  walkTo(goal: Cell, onArrive?: () => void): boolean {
    const start = worldToCell(this.avatar.pos);
    let target = goal;
    if (!this.walkable(goal.x, goal.y)) {
      const alt = this.nearestWalkable(goal, start);
      if (!alt) return false;
      target = alt;
    }
    const path = findPath(start, target, (x, y) => !this.walkable(x, y) && !(x === start.x && y === start.y), MAP_SIZE);
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
      if (this.walkable(c.x, c.y)) { this.avatar.pos.copy(p); return true; }
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
      ...w, id, kind: req.kind, rare: !!req.rare, graveId: req.graveId,
      heading: dirs[Math.floor(Math.random() * 4)], age: 0, life: LIFESPAN[req.kind] * (req.rare ? 0.6 : 1),
      pause: 0, hitbox, dying: 0, perched: false,
    };
    if (req.kind === 'crow') { r.pos.y = 3; r.path = []; }
    this.roamers.set(id, r);
    return r;
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
    // movimento "a torre": avanza lungo l'asse, cambia direzione su ostacolo
    const ghost = r.kind === 'ghost';
    const cell = worldToCell(r.pos);
    const center = cellCenter(cell.x, cell.y, [1, 1]);
    const atCenter = Math.hypot(r.pos.x - center.x, r.pos.z - center.z) < r.speed * dt * 1.2;
    if (atCenter) {
      r.pos.x = center.x; r.pos.z = center.z;
      const free = (d: Cell) => {
        const nx = cell.x + d.x, ny = cell.y + d.y;
        const inArea = nx >= this.area.x && ny >= this.area.y && nx < this.area.x + this.area.w && ny < this.area.y + this.area.h;
        return inArea && (ghost || !this.blocked(nx, ny));
      };
      const turnChance = r.kind === 'rat' ? 0.35 : 0.12;
      if (!free(r.heading) || Math.random() < turnChance * dt * 10) {
        const options: Cell[] = [{ x: r.heading.y, y: r.heading.x }, { x: -r.heading.y, y: -r.heading.x }].filter(free);
        if (options.length) r.heading = options[Math.floor(Math.random() * options.length)];
        else if (free({ x: -r.heading.x, y: -r.heading.y })) r.heading = { x: -r.heading.x, y: -r.heading.y };
        else { r.pause = 0.5; return; }
        if ((r.kind === 'cat' || r.kind === 'priest' || r.kind === 'gravedigger') && Math.random() < 0.3) { r.pause = 1.5 + Math.random() * 2.5; return; }
      }
    }
    r.pos.x += r.heading.x * r.speed * dt;
    r.pos.z += r.heading.y * r.speed * dt;
    r.facing = Math.atan2(r.heading.x, r.heading.y);
    r.phase += r.speed * dt * 2.6;
    r.pose = 'walk';
    void t;
  }

  /** Avanza lungo il percorso; ritorna true se sta ancora camminando. */
  private followPath(w: Walker, dt: number): boolean {
    if (!w.path.length) return false;
    const target = w.path[0];
    const d = new THREE.Vector3(target.x - w.pos.x, target.y - w.pos.y, target.z - w.pos.z);
    const dist = d.length();
    const step = w.speed * dt;
    if (dist <= step) { w.pos.copy(target); w.path.shift(); }
    else w.pos.addScaledVector(d, step / dist);
    if (Math.hypot(d.x, d.z) > 0.01) w.facing = Math.atan2(d.x, d.z);
    w.phase += step * 2.6;
    return true;
  }

  // ── Presenze piazzabili ──────────────────────────────────────────────

  syncPresences(state: SaveData, now: Date) {
    this.syncPets(state);
    const homes = state.placeables.filter((p) => ['zombies_play', 'zombies_dance', 'zombie_walker', 'ghosts_roam', 'ghosts_ball'].includes(p.type));
    const sig = homes.map((p) => `${p.id}:${p.x}:${p.y}:${p.variant}:${p.broken}`).join('|');
    if (sig === this.presenceSig) return;
    this.presenceSig = sig;
    for (const p of this.presences) { this.disposeWalker(p); if (p.extra) this.group.remove(p.extra); }
    this.presences = [];
    for (const p of homes) this.addPresences(p, now);
  }

  private addPresences(p: Placed, _now: Date) {
    const center = cellCenter(p.x, p.y, rotatedFootprint(p.type, p.rot));
    const add = (kind: CharacterKind, role: Presence['role'], offset: THREE.Vector3, radius = 0, angle = 0, speed = 0.6) => {
      const w = this.makeWalker(kind, center.clone().add(offset), speed);
      const pr: Presence = { ...w, placeId: p.id, role, home: center.clone(), radius, angle, hidden: false };
      this.presences.push(pr);
      return pr;
    };
    switch (p.type) {
      case 'zombies_play': {
        const a = add('zombie', 'sit', new THREE.Vector3(-0.72, 0, 0)); a.facing = Math.PI / 2;
        const b = add('zombie', 'sit', new THREE.Vector3(0.72, 0, 0)); b.facing = -Math.PI / 2;
        break;
      }
      case 'zombies_dance':
        add('zombie', 'dance', new THREE.Vector3(0.5, 0, 0), 0.5, 0);
        add('zombie', 'dance', new THREE.Vector3(-0.5, 0, 0), 0.5, Math.PI);
        break;
      case 'zombie_walker': add('zombie', 'wander', new THREE.Vector3(), 2.5, 0, 0.5); break;
      case 'ghosts_roam':
        add('ghost', 'circle', new THREE.Vector3(1.4, 0, 0), 1.4, 0, 0.7);
        add('ghost', 'circle', new THREE.Vector3(-1.4, 0, 0), 1.4, Math.PI, 0.7);
        break;
      case 'ghosts_ball': {
        const g1 = add('ghost', 'goalie', new THREE.Vector3(-0.6, 0, 0)); g1.facing = Math.PI / 2;
        const g2 = add('ghost', 'goalie', new THREE.Vector3(0.6, 0, 0)); g2.facing = -Math.PI / 2;
        // la "palla" è un teschio (vedi descrizione del catalogo)
        const ball = new THREE.Group();
        const skullLP = new LP('ghostball:skull');
        skull(skullLP, 0, -0.1, -0.02, 1);
        const sk = skullLP.build();
        ball.add(instantiate({ geometries: sk.geometries, lights: [], height: 0.25, mats: LOWPOLY_MATERIALS, dedicated: true }));
        this.group.add(ball);
        g1.extra = ball;
        break;
      }
    }
  }

  private stepPresence(pr: Presence, dt: number, t: number) {
    if (pr.hidden) return;
    switch (pr.role) {
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
    const houses = state.placeables.filter((p) => p.type === 'pet_house');
    for (const [id, pet] of this.pets) if (!houses.some((h) => h.id === id)) this.removePet(pet);
    for (const h of houses) {
      let pet = this.pets.get(h.id);
      if (pet && pet.variant !== h.variant) { this.removePet(pet); pet = undefined; }
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
    const w = this.makeWalker(PET_KINDS[h.variant % PET_KINDS.length], door, PET_SPEED.roam);
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), hitMat);
    hitbox.position.y = 0.4;
    hitbox.userData.petId = h.id;
    w.rig.root.add(hitbox);
    w.rig.root.visible = false;
    const den = new Den('#8ff0dc');
    den.place(home);
    this.group.add(den.group);
    const labels = CATALOG.pet_house.variantLabels ?? [];
    // riprende quello che faceva (salvato nella casetta); libero, si sveglia dopo poco
    return {
      ...w, placeId: h.id, label: labels[h.variant % labels.length] ?? 'Animale', variant: h.variant, home, door, porch: this.porchOf(h),
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
   * Insegue il padrone in modo fluido: dritto se la via è libera, altrimenti
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
    pet.speed = THREE.MathUtils.clamp((d - stop) * 3, 0.8, PET_SPEED.run);
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
        // libero: dopo un sonnellino esce di nuovo; al seguito (salvato così): esce subito dal padrone
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
        if (toAvatar > 16) { pet.pos.copy(a).add(new THREE.Vector3(1, 0, 1)); pet.path = []; } // rimasto indietro: raggiunge il padrone
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

  /** Raggiunge il padrone: esce dalla tana (se dorme) e lo segue per il cimitero. */
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
    this.endFuneral();
    const gate = cellCenter(gateCell.x, gateCell.y, [1, 1]);
    // a semicerchio davanti alla tomba, ben distanziati: teste e cappelli grandi non si toccano
    const spots = [
      new THREE.Vector3(0, 0, 1.65), new THREE.Vector3(-1.25, 0, 1.75), new THREE.Vector3(1.25, 0, 1.75), new THREE.Vector3(-0.65, 0, 2.75), new THREE.Vector3(0.75, 0, 2.8),
    ];
    const kinds: CharacterKind[] = ['priest', 'mourner', 'mournerB', 'mourner', 'gravedigger'];
    const members = kinds.map((k, i) => {
      const w = this.makeWalker(k, gate.clone().add(new THREE.Vector3((i - 2) * 0.7, 0, 0.5 + i * 0.45)), 1.4);
      const dest = graveCenter.clone().add(spots[i]);
      const path = findPath(worldToCell(w.pos), worldToCell(dest), (x, y) => !this.walkable(x, y), MAP_SIZE);
      w.path = (path ?? []).slice(1).map((c) => cellCenter(c.x, c.y, [1, 1]));
      w.path.push(dest);
      return w;
    });
    this.funeral = { members, stage: 'arrive', timer: 0, target: graveCenter.clone(), onDone, exit: gate };
  }

  skipFuneral() {
    if (!this.funeral) return;
    const done = this.funeral.onDone;
    this.endFuneral();
    done();
  }

  get funeralActive() { return !!this.funeral; }

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
        f.stage = 'leave'; f.timer = 0;
        for (const m of f.members) {
          const path = findPath(worldToCell(m.pos), worldToCell(f.exit), (x, y) => !this.walkable(x, y) && !(worldToCell(m.pos).x === x && worldToCell(m.pos).y === y), MAP_SIZE);
          m.path = (path ?? []).slice(1).map((c) => cellCenter(c.x, c.y, [1, 1]));
          m.path.push(f.exit.clone().add(new THREE.Vector3(0, 0, 2)));
        }
        const done = f.onDone; f.onDone = () => undefined; done();
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

    const apply = (w: Walker) => {
      const y = w.pos.y > 0.5 ? w.pos.y : ground(w.pos);
      w.rig.root.position.set(w.pos.x, y, w.pos.z);
      // rotazione morbida
      let d = w.facing - w.rig.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      w.rig.root.rotation.y += d * Math.min(1, dt * 12);
      animateRig(w.rig, w.pose, t + w.phase, w.phase);
      if (w.lightHandles.length) {
        w.rig.root.updateMatrixWorld(true);
        w.lightHandles.forEach((h, i) => this.atmosphere.moveAnchor(h, rigLightPos(w.rig, i)));
      }
    };
    apply(a);
    for (const r of this.roamers.values()) apply(r);
    for (const p of this.presences) if (!p.hidden) apply(p);
    for (const p of this.pets.values()) { if (p.rig.root.visible) apply(p); p.den.group.position.y = ground(p.home); p.den.update(dt, t, this.glyphs); }
    if (this.funeral) for (const m of this.funeral.members) apply(m);
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
