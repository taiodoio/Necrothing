// Attori animati: il Custode (giocatore), le presenze erranti generate dalla
// matrice di spawn, le presenze piazzabili (zombie, fantasmi, animali) e il
// corteo funebre. Movimento delle presenze "a torre" sugli assi X/Z: se
// incontrano un ostacolo cambiano direzione; i fantasmi attraversano tutto.

import * as THREE from 'three';
import { MAP_SIZE } from '../game/balance.ts';
import { rotatedFootprint } from '../game/catalog.ts';
import { createRng, hashString } from '../game/rng.ts';
import type { RoamerKind, SpawnRequest } from '../game/spawn.ts';
import type { ArtStyle, Placed, SaveData } from '../game/state.ts';
import type { Rect } from '../game/world.ts';
import type { Atmosphere, AnchorHandle } from './Atmosphere.ts';
import { animateRig, buildRig, rigLightPos, type CharacterKind, type Pose, type Rig } from './characters.ts';
import { findPath, type Cell } from './pathfinding.ts';
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

  constructor(scene: THREE.Scene, atmosphere: Atmosphere, style: ArtStyle, start: THREE.Vector3) {
    this.atmosphere = atmosphere;
    this.style = style;
    this.group.name = 'attori';
    scene.add(this.group);
    this.avatar = this.makeWalker('custode', start, 3.1);
  }

  private makeWalker(kind: CharacterKind, pos: THREE.Vector3, speed: number): Walker {
    const rig = buildRig(kind, this.style);
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
    const homes = state.placeables.filter((p) => ['zombies_play', 'zombies_dance', 'zombie_walker', 'ghosts_roam', 'ghosts_ball', 'skeleton_pet', 'pet_house'].includes(p.type));
    const sig = homes.map((p) => `${p.id}:${p.x}:${p.y}:${p.variant}:${p.broken}`).join('|');
    if (sig === this.presenceSig) return;
    this.presenceSig = sig;
    for (const p of this.presences) { this.disposeWalker(p); if (p.extra) this.group.remove(p.extra); }
    this.presences = [];
    for (const p of homes) this.addPresences(p, now);
  }

  private addPresences(p: Placed, now: Date) {
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
        const ball = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshLambertMaterial({ color: '#d6cfbd' }));
        ball.castShadow = true;
        this.group.add(ball);
        g1.extra = ball;
        break;
      }
      case 'skeleton_pet':
      case 'pet_house': {
        const pet = add(PET_KINDS[p.variant % PET_KINDS.length], 'wander', new THREE.Vector3(0, 0, 1.2), 2.2, 0, 0.9);
        // a volte, all'apertura, l'animale resta nella tana (Excel)
        if (p.type === 'pet_house') {
          const day = now.toISOString().slice(0, 10);
          pet.hidden = createRng(`${p.id}:${day}`).chance(0.35) || p.broken;
          pet.rig.root.visible = !pet.hidden;
        }
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
      case 'goalie':
        pr.pose = 'idle';
        if (pr.extra) {
          const k = (Math.sin(t * 1.6) + 1) / 2;
          pr.extra.position.set(pr.home.x - 0.55 + k * 1.1, 0.35 + Math.abs(Math.sin(t * 3.2)) * 0.7, pr.home.z);
          pr.extra.rotation.set(t * 3, t * 2, 0);
        }
        break;
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

  // ── Funerale ─────────────────────────────────────────────────────────

  startFuneral(graveCenter: THREE.Vector3, gateCell: Cell, onDone: () => void) {
    this.endFuneral();
    const gate = cellCenter(gateCell.x, gateCell.y, [1, 1]);
    const spots = [
      new THREE.Vector3(0, 0, 1.6), new THREE.Vector3(-1.1, 0, 1.4), new THREE.Vector3(1.1, 0, 1.4), new THREE.Vector3(-0.5, 0, 2.2), new THREE.Vector3(0.6, 0, 2.3),
    ];
    const kinds: CharacterKind[] = ['priest', 'mourner', 'mournerB', 'mourner', 'gravedigger'];
    const members = kinds.map((k, i) => {
      const w = this.makeWalker(k, gate.clone().add(new THREE.Vector3((i - 2) * 0.4, 0, 0.5 + i * 0.3)), 1.4);
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

  private stepFuneral(dt: number) {
    const f = this.funeral!;
    f.timer += dt;
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
    if (this.funeral) for (const m of this.funeral.members) apply(m);
  }

  avatarCell(): Cell { return worldToCell(this.avatar.pos); }

  roamerAt(id: string) { return this.roamers.get(id); }

  stats() { return { roamers: this.roamers.size, presences: this.presences.length }; }
}

export function graveSpots(state: SaveData): THREE.Vector3[] {
  return state.graves.map((g) => cellCenter(g.x, g.y, [2, 2]).add(new THREE.Vector3(0, 0, -0.6)));
}

export const MAP_HALF = HALF;
export { hashString };
