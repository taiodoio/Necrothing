// Vista del mondo: tiene la scena 3D allineata allo SaveData.
//  • terreno a chunk, recinto, bosco esterno, ciuffi/foglie (instancing)
//  • una entità 3D per tomba/oggetto (geometrie condivise dalla cache)
//  • fuochi fatui animati, hitbox per il picking, evidenziazione selezione
// Cambiare stile ricostruisce solo la resa: posizioni e stati arrivano sempre
// dallo stato di gioco.

import * as THREE from 'three';
import { GRAVE_FOOTPRINT, MAP_SIZE } from '../game/balance.ts';
import { CATALOG, rotatedFootprint } from '../game/catalog.ts';
import { graveVisualState } from '../game/graves.ts';
import { hash3, hashString, createRng } from '../game/rng.ts';
import type { ArtStyle, Grave, Placed, SaveData } from '../game/state.ts';
import { areaForLevel, buildOccupancy, gateCells, type Rect } from '../game/world.ts';
import { getModel, instantiate, lightWorldPos, MATERIALS, type CachedModel } from '../render/modelCache.ts';
import { fencePillar, fenceSegment, gate } from '../render/models/fence.ts';
import { graveModel } from '../render/models/graves.ts';
import { deadTree, pine, sceneryLeaves, sceneryPebbles, sceneryRock, sceneryTuft } from '../render/models/nature.ts';
import { placeableKey, placeableModel, placeableSeed, type PVis } from '../render/models/registry.ts';
import { P } from '../render/palette.ts';
import type { Atmosphere, AnchorHandle } from './Atmosphere.ts';
import { buildChunk, CHUNK, type Ground, type GroundInput } from './terrain.ts';

export const HALF = MAP_SIZE / 2;

/** Centro mondo di un ingombro posato in cella (x,y). */
export function cellCenter(x: number, y: number, fp: [number, number]): THREE.Vector3 {
  return new THREE.Vector3(x + fp[0] / 2 - HALF, 0, y + fp[1] / 2 - HALF);
}

export function worldToCell(p: THREE.Vector3): { x: number; y: number } {
  return { x: Math.floor(p.x + HALF), y: Math.floor(p.z + HALF) };
}

export type EntityKind = 'grave' | 'placeable';

export interface EntityView {
  id: string;
  kind: EntityKind;
  key: string;
  group: THREE.Group;
  visual: THREE.Group;
  hitbox: THREE.Mesh;
  anchors: AnchorHandle[];
  height: number;
  fp: [number, number];
}

interface WispView { group: THREE.Group; hitbox: THREE.Mesh; anchor: AnchorHandle; phase: number; base: THREE.Vector3 }

const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });

export class WorldView {
  readonly root = new THREE.Group();
  readonly entities = new Map<string, EntityView>();
  readonly wisps = new Map<string, WispView>();
  readonly hitboxes: THREE.Object3D[] = [];
  private terrain = new THREE.Group();
  private scenery = new THREE.Group();
  private decorLayer = new THREE.Group();
  private sceneryAnchors: AnchorHandle[] = [];
  private terrainSig = '';
  private scenerySig = '';
  private decorSig = '';
  private style: ArtStyle;
  private selectedId: string | null = null;
  private selectionFrame: THREE.LineSegments;
  private ghostFrame: THREE.Mesh;
  private terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  private readonly atmosphere: Atmosphere;
  private signTextures = new Map<string, THREE.CanvasTexture>();
  groundInput: GroundInput | null = null;
  area: Rect = areaForLevel(0);
  quality: 'low' | 'medium' | 'high' = 'medium';

  constructor(scene: THREE.Scene, atmosphere: Atmosphere, style: ArtStyle) {
    this.atmosphere = atmosphere;
    this.style = style;
    this.root.name = 'cimitero';
    this.root.add(this.terrain, this.scenery, this.decorLayer);
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.02, 1));
    this.selectionFrame = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: '#f2c27a', transparent: true, opacity: 0.95 }));
    this.selectionFrame.visible = false;
    this.ghostFrame = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), new THREE.MeshBasicMaterial({ color: '#7fd18b', transparent: true, opacity: 0.35, depthWrite: false }));
    this.ghostFrame.visible = false;
    this.root.add(this.selectionFrame, this.ghostFrame);
    scene.add(this.root);
  }

  setStyle(style: ArtStyle, state: SaveData) {
    if (style === this.style) return;
    this.style = style;
    for (const e of [...this.entities.values()]) this.removeEntity(e.id);
    this.terrainSig = this.scenerySig = this.decorSig = '';
    this.sync(state);
  }

  getStyle() { return this.style; }

  // ── Sincronizzazione ─────────────────────────────────────────────────

  sync(state: SaveData) {
    this.area = areaForLevel(state.world.expansionLevel);
    this.syncTerrain(state);
    this.syncScenery(state);
    this.syncDecor(state);
    const alive = new Set<string>();
    for (const g of state.graves) { alive.add(g.id); this.syncGrave(g); }
    for (const p of state.placeables) { alive.add(p.id); this.syncPlaceable(p); }
    for (const id of [...this.entities.keys()]) if (!alive.has(id)) this.removeEntity(id);
    this.syncWisps(state);
    this.refreshSelection();
  }

  private groundOverrides(state: SaveData): Map<string, Ground> {
    const m = new Map<string, Ground>();
    const a = this.area;
    for (let x = a.x - 1; x <= a.x + a.w; x++) { m.set(`${x},${a.y - 1}`, 'fence'); m.set(`${x},${a.y + a.h}`, 'fence'); }
    for (let y = a.y - 1; y <= a.y + a.h; y++) { m.set(`${a.x - 1},${y}`, 'fence'); m.set(`${a.x + a.w},${y}`, 'fence'); }
    for (const c of gateCells(a)) { const [x, y] = c.split(',').map(Number); m.set(`${x},${y + 1}`, 'path'); m.set(`${x},${y + 2}`, 'path'); m.set(c, 'path'); }
    for (const p of state.placeables) {
      const g: Ground | null = p.type === 'path_stone' ? 'path' : p.type === 'path_dirt' ? 'dirt' : p.type === 'mud' ? 'mud' : null;
      if (!g) continue;
      const [w, d] = rotatedFootprint(p.type, p.rot);
      for (let dy = 0; dy < d; dy++) for (let dx = 0; dx < w; dx++) m.set(`${p.x + dx},${p.y + dy}`, g);
    }
    return m;
  }

  private syncTerrain(state: SaveData) {
    const overrides = this.groundOverrides(state);
    const sig = `${this.style}|${state.world.expansionLevel}|${[...overrides.entries()].map(([k, v]) => k + v).sort().join(';')}`;
    if (sig === this.terrainSig) return;
    this.terrainSig = sig;
    this.groundInput = { seed: state.seed % 100000, area: this.area, overrides };
    for (const c of [...this.terrain.children]) { this.terrain.remove(c); (c as THREE.Mesh).geometry.dispose(); }
    for (let cy = 0; cy < MAP_SIZE; cy += CHUNK) {
      for (let cx = 0; cx < MAP_SIZE; cx += CHUNK) {
        const mesh = new THREE.Mesh(buildChunk(this.groundInput, cx, cy, this.style), this.terrainMat);
        mesh.receiveShadow = true;
        mesh.name = `chunk-${cx}-${cy}`;
        this.terrain.add(mesh);
      }
    }
  }

  /** Recinto + cancello + bosco selvatico fuori dall'area consacrata. */
  private syncScenery(state: SaveData) {
    const sig = `${this.style}|${state.world.expansionLevel}|${this.quality}`;
    if (sig === this.scenerySig) return;
    this.scenerySig = sig;
    for (const h of this.sceneryAnchors) this.atmosphere.removeAnchor(h);
    this.sceneryAnchors = [];
    for (const c of [...this.scenery.children]) this.scenery.remove(c);
    const a = this.area;
    const gate0 = a.x + Math.floor(a.w / 2) - 2; // prima cella del varco (3 celle)
    const segs: THREE.Matrix4[] = [];
    const pillars: THREE.Matrix4[] = [];
    const m = (x: number, z: number, ry: number) => new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1));
    const edges: Array<[number, number, number, number, boolean]> = [
      [a.x, a.y, 1, 0, false], [a.x, a.y + a.h, 1, 0, true], [a.x, a.y, 0, 1, false], [a.x + a.w, a.y, 0, 1, false],
    ];
    for (const [sx, sy, dx, dy, south] of edges) {
      const len = dx ? a.w : a.h;
      for (let i = 0; i < len; i++) {
        const cx = sx + dx * i, cy = sy + dy * i;
        if (south && cx >= gate0 + 1 && cx <= gate0 + 3) continue;
        segs.push(m(cx + (dx ? 0.5 : 0) - HALF, cy + (dy ? 0.5 : 0) - HALF, dx ? 0 : Math.PI / 2));
        if (i % 3 === 0) pillars.push(m(cx - HALF, cy - HALF, 0));
      }
      pillars.push(m(sx + dx * len - HALF, sy + dy * len - HALF, 0));
    }
    this.addInstanced(getModel('fseg:1', this.style, () => fenceSegment(1), 1), segs);
    this.addInstanced(getModel('fpil:1', this.style, () => fencePillar(1), 2), pillars);
    const gm = getModel('gate:lit', this.style, () => gate(true), 3);
    const g = instantiate(gm);
    g.position.set(gate0 + 2.5 - HALF, 0, a.y + a.h - HALF);
    this.scenery.add(g);
    for (const an of gm.lights) this.sceneryAnchors.push(this.atmosphere.addAnchor(lightWorldPos(an).add(g.position), an));

    // Bosco selvatico: celle fuori dal recinto (con un margine).
    const rng = createRng(state.seed + 77);
    const trees: Record<string, THREE.Matrix4[]> = {};
    const density = this.quality === 'low' ? 0.2 : this.quality === 'medium' ? 0.32 : 0.42;
    for (let y = 0; y < MAP_SIZE; y += 2) {
      for (let x = 0; x < MAP_SIZE; x += 2) {
        const nearFence = x >= a.x - 3 && x < a.x + a.w + 2 && y >= a.y - 3 && y < a.y + a.h + 2;
        if (nearFence) continue;
        const r = rng.next();
        if (r > density + (x < 2 || y < 2 || x > MAP_SIZE - 3 || y > MAP_SIZE - 3 ? 0.25 : 0)) continue;
        const kind = rng.next();
        const key = kind < 0.55 ? `pine:${rng.int(4)}` : kind < 0.85 ? `dead:${rng.int(4)}` : `rock:${rng.int(3)}`;
        const s = 0.8 + rng.next() * 0.5;
        (trees[key] ??= []).push(new THREE.Matrix4().compose(
          new THREE.Vector3(x + 1 + rng.range(-0.6, 0.6) - HALF, 0, y + 1 + rng.range(-0.6, 0.6) - HALF),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, Math.PI * 2)),
          new THREE.Vector3(s, s * (0.9 + rng.next() * 0.3), s),
        ));
      }
    }
    for (const [key, mats] of Object.entries(trees)) {
      const [kind, n] = key.split(':');
      const seed = Number(n);
      const model = kind === 'pine' ? getModel(`wpine:${seed}`, this.style, () => pine(seed + 40), seed)
        : kind === 'dead' ? getModel(`wdead:${seed}`, this.style, () => deadTree({ seed: seed + 90 }, true), seed)
        : getModel(`wrock:${seed}`, this.style, () => sceneryRock(seed), seed);
      this.addInstanced(model, mats);
    }
  }

  /** Ciuffi, foglie, sassolini dentro e fuori il recinto (evitano oggetti e sentieri). */
  private syncDecor(state: SaveData) {
    const occ = buildOccupancy(state);
    const overrides = this.groundInput?.overrides ?? new Map();
    const sig = `${this.style}|${this.quality}|${state.world.expansionLevel}|${[...occ.owner.keys()].length}|${state.placeables.length}|${state.graves.map((g) => g.x + ',' + g.y).join()}`;
    if (sig === this.decorSig) return;
    this.decorSig = sig;
    for (const c of [...this.decorLayer.children]) this.decorLayer.remove(c);
    const rng = createRng(state.seed + 5);
    const per = this.quality === 'low' ? 0.35 : this.quality === 'medium' ? 0.7 : 1.1;
    const buckets: Record<string, THREE.Matrix4[]> = {};
    const tints: Record<string, number[]> = {};
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const k = `${x},${y}`;
        if (occ.owner.has(k) || overrides.get(k) === 'path' || overrides.get(k) === 'fence') continue;
        const wild = !(x >= this.area.x && y >= this.area.y && x < this.area.x + this.area.w && y < this.area.y + this.area.h);
        const n = (wild ? 1.3 : 0.45) * per;
        let count = Math.floor(n) + (rng.next() < n % 1 ? 1 : 0);
        while (count-- > 0) {
          const r = rng.next();
          const key = r < 0.72 ? `tuft:${rng.int(5)}` : r < 0.84 ? `leaves:${rng.int(3)}` : `pebbles:${rng.int(3)}`;
          (tints[key] ??= []).push(wild ? 0.55 + rng.next() * 0.2 : 0.85 + rng.next() * 0.2);
          (buckets[key] ??= []).push(new THREE.Matrix4().compose(
            new THREE.Vector3(x + rng.range(0.15, 0.85) - HALF, 0, y + rng.range(0.15, 0.85) - HALF),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.int(4) * Math.PI / 2),
            new THREE.Vector3(1, wild ? 1.3 : 1, 1),
          ));
        }
      }
    }
    for (const [key, mats] of Object.entries(buckets)) {
      const [kind, n] = key.split(':');
      const seed = Number(n);
      const model = kind === 'tuft' ? getModel(`tuft:${seed}`, this.style, () => sceneryTuft(seed), seed)
        : kind === 'leaves' ? getModel(`leaves:${seed}`, this.style, () => sceneryLeaves(seed), seed)
        : getModel(`pebbles:${seed}`, this.style, () => sceneryPebbles(seed), seed);
      this.addInstanced(model, mats, this.decorLayer, false, tints[key]);
    }
  }

  private addInstanced(model: CachedModel, mats: THREE.Matrix4[], parent = this.scenery, cast = true, tint?: number[]) {
    if (!mats.length) return;
    for (const [bucket, geo] of Object.entries(model.geometries)) {
      if (!geo) continue;
      const mesh = new THREE.InstancedMesh(geo, MATERIALS[bucket as keyof typeof MATERIALS], mats.length);
      mats.forEach((mm, i) => mesh.setMatrixAt(i, mm));
      if (tint) tint.forEach((v, i) => mesh.setColorAt(i, new THREE.Color(v, v, v)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = cast && bucket === 'solid';
      mesh.receiveShadow = bucket === 'solid';
      mesh.computeBoundingSphere();
      parent.add(mesh);
    }
  }

  // ── Entità ───────────────────────────────────────────────────────────

  private graveKey(g: Grave): string {
    return `g:${g.graveType}:${graveVisualState(g)}:${g.seed % 4}`;
  }

  private syncGrave(g: Grave) {
    const key = this.graveKey(g);
    const center = cellCenter(g.x, g.y, GRAVE_FOOTPRINT);
    let e = this.entities.get(g.id);
    if (!e || e.key !== key) {
      if (e) this.removeEntity(g.id);
      const state = graveVisualState(g);
      const model = getModel(key, this.style, () => graveModel(g.graveType, state, g.seed % 4), g.seed % 4);
      e = this.createEntity(g.id, 'grave', key, model, GRAVE_FOOTPRINT, 0);
    }
    this.placeEntity(e, center, 0);
  }

  pvis(p: Placed): PVis {
    return { type: p.type, variant: p.variant, dirty: p.dirty, broken: p.broken, lit: p.lit && !p.broken, seed: placeableSeed(p.type, hashString(p.id)) };
  }

  private syncPlaceable(p: Placed) {
    const v = this.pvis(p);
    const key = placeableKey(v) + (p.type === 'sign' ? `:${p.text ?? ''}` : '');
    const fp = rotatedFootprint(p.type, p.rot);
    let e = this.entities.get(p.id);
    if (!e || e.key !== key) {
      if (e) this.removeEntity(p.id);
      const model = getModel(placeableKey(v), this.style, () => placeableModel(v), v.seed);
      e = this.createEntity(p.id, 'placeable', key, model, CATALOG[p.type].footprint, p.rot);
      if (p.type === 'sign') this.addSignText(e, p.text ?? '');
    }
    e.fp = fp;
    this.placeEntity(e, cellCenter(p.x, p.y, fp), p.rot);
  }

  private createEntity(id: string, kind: EntityKind, key: string, model: CachedModel, baseFp: [number, number], rot: number): EntityView {
    const group = new THREE.Group();
    group.name = id;
    const visual = instantiate(model);
    group.add(visual);
    const h = Math.max(0.4, model.height);
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(baseFp[0] * 0.96, h, baseFp[1] * 0.96), hitMaterial);
    hitbox.position.y = h / 2;
    hitbox.userData.entityId = id;
    group.add(hitbox);
    this.root.add(group);
    this.hitboxes.push(hitbox);
    const e: EntityView = { id, kind, key, group, visual, hitbox, anchors: [], height: h, fp: baseFp };
    group.userData.model = model;
    group.rotation.y = -rot * Math.PI / 2;
    this.entities.set(id, e);
    return e;
  }

  private placeEntity(e: EntityView, center: THREE.Vector3, rot: number) {
    e.group.position.copy(center);
    e.group.rotation.y = -rot * Math.PI / 2;
    e.group.updateMatrixWorld(true);
    for (const h of e.anchors) this.atmosphere.removeAnchor(h);
    e.anchors = [];
    const model = e.group.userData.model as CachedModel;
    for (const a of model.lights) {
      const pos = lightWorldPos(a).applyMatrix4(e.group.matrixWorld);
      e.anchors.push(this.atmosphere.addAnchor(pos, a));
    }
  }

  removeEntity(id: string) {
    const e = this.entities.get(id);
    if (!e) return;
    for (const h of e.anchors) this.atmosphere.removeAnchor(h);
    this.root.remove(e.group);
    e.hitbox.geometry.dispose();
    const i = this.hitboxes.indexOf(e.hitbox);
    if (i >= 0) this.hitboxes.splice(i, 1);
    this.entities.delete(id);
  }

  private addSignText(e: EntityView, text: string) {
    let tex = this.signTextures.get(text);
    if (!tex) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 160;
      const g = c.getContext('2d')!;
      g.fillStyle = '#8a6849'; g.fillRect(0, 0, 256, 160);
      g.fillStyle = '#2b1d14';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = (text || ' ').split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const w of words) { if ((line + ' ' + w).trim().length > 12) { lines.push(line.trim()); line = w; } else line += ' ' + w; }
      lines.push(line.trim());
      const size = lines.length > 2 ? 30 : 38;
      g.font = `bold ${size}px Georgia, serif`;
      lines.slice(0, 3).forEach((l, i) => g.fillText(l, 128, 80 + (i - (Math.min(lines.length, 3) - 1) / 2) * (size + 4)));
      tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.signTextures.set(text, tex);
    }
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.56), new THREE.MeshLambertMaterial({ map: tex }));
    plane.position.set(0, 1.0, 0.075);
    e.visual.add(plane);
  }

  // ── Fuochi fatui ─────────────────────────────────────────────────────

  private syncWisps(state: SaveData) {
    const alive = new Set(state.world.looseWisps.map((w) => w.id));
    for (const [id, w] of [...this.wisps]) {
      if (alive.has(id)) continue;
      this.root.remove(w.group);
      this.atmosphere.removeAnchor(w.anchor);
      w.hitbox.geometry.dispose();
      const i = this.hitboxes.indexOf(w.hitbox);
      if (i >= 0) this.hitboxes.splice(i, 1);
      this.wisps.delete(id);
    }
    for (const w of state.world.looseWisps) {
      if (this.wisps.has(w.id)) continue;
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), new THREE.MeshBasicMaterial({ color: '#c9fff0', toneMapped: false }));
      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.28), new THREE.MeshBasicMaterial({ color: P.spectral, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), core.material);
      tip.position.y = 0.24;
      group.add(core, shell, tip);
      const base = cellCenter(w.x, w.y, [1, 1]);
      base.y = 0.7;
      group.position.copy(base);
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.9), hitMaterial);
      hitbox.userData.wispId = w.id;
      hitbox.position.y = -0.2;
      group.add(hitbox);
      this.hitboxes.push(hitbox);
      this.root.add(group);
      const anchor = this.atmosphere.addAnchor(base.clone(), { pos: [0, 0, 0], color: P.spectral, intensity: 0.6, range: 2.5, flicker: 0.3, halo: 0.9 });
      this.wisps.set(w.id, { group, hitbox, anchor, phase: hash3(w.x, w.y, 1) * 10, base });
    }
  }

  wispPosition(id: string): THREE.Vector3 | null {
    return this.wisps.get(id)?.base.clone() ?? null;
  }

  // ── Selezione ed edit ────────────────────────────────────────────────

  select(id: string | null) {
    if (this.selectedId && this.selectedId !== id) this.setHighlight(this.selectedId, null);
    this.selectedId = id;
    this.refreshSelection();
  }

  private setHighlight(id: string, mat: THREE.Material | null) {
    const e = this.entities.get(id);
    if (!e) return;
    e.visual.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.name !== 'solid') return;
      mesh.material = mat ?? MATERIALS.solid;
    });
  }

  private refreshSelection() {
    const e = this.selectedId ? this.entities.get(this.selectedId) : null;
    if (!e) { this.selectionFrame.visible = false; return; }
    this.setHighlight(e.id, MATERIALS.selected);
    this.selectionFrame.visible = true;
    this.selectionFrame.position.set(e.group.position.x, 0.06, e.group.position.z);
    this.selectionFrame.scale.set(e.fp[0], 1, e.fp[1]);
  }

  /** Anteprima di trascinamento: sposta il gruppo e colora l'ingombro. */
  previewMove(id: string, x: number, y: number, valid: boolean) {
    const e = this.entities.get(id);
    if (!e) return;
    const c = cellCenter(x, y, e.fp);
    e.group.position.copy(c);
    this.ghostFrame.visible = true;
    this.ghostFrame.position.set(c.x, 0.05, c.z);
    this.ghostFrame.scale.set(e.fp[0], 1, e.fp[1]);
    (this.ghostFrame.material as THREE.MeshBasicMaterial).color.set(valid ? '#7fd18b' : '#e0564a');
    this.setHighlight(id, valid ? MATERIALS.selected : MATERIALS.invalid);
    this.selectionFrame.position.set(c.x, 0.06, c.z);
  }

  endPreview() {
    this.ghostFrame.visible = false;
  }

  private ghost: THREE.Group | null = null;
  private ghostKey = '';

  /** Anteprima di posa (sepoltura / oggetto dall'inventario). */
  showGhost(key: string, build: () => CachedModel, fp: [number, number], x: number, y: number, rot: number, valid: boolean) {
    if (this.ghostKey !== key) {
      if (this.ghost) this.root.remove(this.ghost);
      this.ghost = instantiate(build(), { castShadow: false });
      this.ghostKey = key;
      this.root.add(this.ghost);
    }
    const c = cellCenter(x, y, fp);
    this.ghost!.position.copy(c);
    this.ghost!.rotation.y = -rot * Math.PI / 2;
    this.ghost!.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.name === 'solid') m.material = valid ? MATERIALS.selected : MATERIALS.invalid;
    });
    this.ghostFrame.visible = true;
    this.ghostFrame.position.set(c.x, 0.05, c.z);
    this.ghostFrame.scale.set(fp[0], 1, fp[1]);
    (this.ghostFrame.material as THREE.MeshBasicMaterial).color.set(valid ? '#7fd18b' : '#e0564a');
  }

  hideGhost() {
    if (this.ghost) this.root.remove(this.ghost);
    this.ghost = null;
    this.ghostKey = '';
    this.ghostFrame.visible = false;
  }

  ghostTop(): THREE.Vector3 | null {
    return this.ghost ? this.ghost.position.clone().setY(1.6) : null;
  }

  entityTop(id: string): THREE.Vector3 | null {
    const e = this.entities.get(id);
    if (!e) return null;
    return e.group.position.clone().setY(e.height + 0.3);
  }

  // ── Animazione ───────────────────────────────────────────────────────

  update(_dt: number, t: number) {
    for (const w of this.wisps.values()) {
      w.group.position.y = w.base.y + Math.sin(t * 2.2 + w.phase) * 0.12;
      w.group.rotation.y = t * 0.8 + w.phase;
      const s = 1 + Math.sin(t * 9 + w.phase) * 0.08;
      w.group.scale.set(s, s * 1.05, s);
      this.atmosphere.moveAnchor(w.anchor, w.group.position);
    }
    if (this.selectionFrame.visible) {
      (this.selectionFrame.material as THREE.LineBasicMaterial).opacity = 0.55 + Math.sin(t * 4) * 0.4;
    }
  }

  stats() {
    return { entities: this.entities.size, wisps: this.wisps.size };
  }
}
