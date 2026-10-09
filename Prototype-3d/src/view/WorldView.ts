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
import { getModel, instantiate, LOWPOLY_MATERIALS, lightWorldPos, type CachedModel } from '../render/modelCache.ts';
import { fencePillar, fenceSegment, gate } from '../render/models/fence.ts';
import { graveModel } from '../render/models/graves.ts';
import { deadTree, pine, sceneryBush, sceneryFern, sceneryFlowers, sceneryLeaves, sceneryPebbles, sceneryRock, sceneryShrooms, sceneryTuft, sceneryWildGrass } from '../render/models/nature.ts';
import { placeableKey, placeableModel, placeableSeed, type PVis } from '../render/models/registry.ts';
import { P } from '../render/palette.ts';
import { drawIcon } from '../ui/icons.ts';
import type { Atmosphere, AnchorHandle } from './Atmosphere.ts';
import { buildChunk, CHUNK, groundType, lowNoise, naturalHeight, surfaceHeight, WORLD_MAX, WORLD_MIN, type Ground, type GroundInput } from './terrain.ts';
import { ChunkBaker } from './baker.ts';


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
  badge?: THREE.Sprite;
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

const badgeMaterials = new Map<string, THREE.SpriteMaterial>();
function badgeMaterial(icon: string, ring: string): THREE.SpriteMaterial {
  const key = icon + ring;
  let m = badgeMaterials.get(key);
  if (m) return m;
  // targhetta pixel: quadrato con angoli a gradino, bordo colorato, icona 12×12
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const step = 6;
  const plate = (inset: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(inset + step, inset, 96 - 2 * (inset + step), 96 - 2 * inset);
    g.fillRect(inset, inset + step, 96 - 2 * inset, 96 - 2 * (inset + step));
  };
  plate(0, '#07080b');
  plate(step, ring);
  plate(step * 2, '#161920');
  drawIcon(g, icon, 18, 18, 60);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  m = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  badgeMaterials.set(key, m);
  return m;
}

export class WorldView {
  readonly root = new THREE.Group();
  readonly entities = new Map<string, EntityView>();
  readonly wisps = new Map<string, WispView>();
  readonly hitboxes: THREE.Object3D[] = [];
  private terrain = new THREE.Group();
  private scenery = new THREE.Group();
  private decorLayer = new THREE.Group();
  private sceneryAnchors: AnchorHandle[] = [];
  private terrainChunks = new Map<string, { mesh: THREE.Mesh; sig: string }>();
  private scenerySig = '';
  private decorSig = '';
  private style: ArtStyle;
  private selectedId: string | null = null;
  private selectionFrame: THREE.LineSegments;
  private ghostFrame: THREE.Mesh;
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

  setStyle(style: ArtStyle, state: SaveData, force = false) {
    if (style === this.style && !force) return;
    this.style = style;
    for (const e of [...this.entities.values()]) this.removeEntity(e.id);
    this.scenerySig = this.decorSig = '';
    for (const c of this.terrainChunks.values()) { this.terrain.remove(c.mesh); c.mesh.geometry.dispose(); this.disposeChunkMaterial(c.mesh); }
    this.terrainChunks.clear();
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
    // strada sterrata che dal cancello si perde nel bosco
    for (const c of gateCells(a)) {
      const [x, y] = c.split(',').map(Number);
      m.set(c, 'path');
      for (let k = 1; k < 30; k++) m.set(`${x},${y + k}`, k < 3 ? 'path' : 'dirt');
    }
    for (const p of state.placeables) {
      const g: Ground | null = p.type === 'path_stone' ? 'path' : p.type === 'path_dirt' ? 'dirt' : p.type === 'mud' ? 'mud' : null;
      if (!g) continue;
      const [w, d] = rotatedFootprint(p.type, p.rot);
      for (let dy = 0; dy < d; dy++) for (let dx = 0; dx < w; dx++) m.set(`${p.x + dx},${p.y + dy}`, g);
    }
    return m;
  }

  /**
   * Pad piani sotto ogni oggetto: tutte le celle dell'ingombro prendono
   * l'altezza naturale della cella centrale (le tombe non pendono).
   */
  private groundPads(state: SaveData, input: GroundInput): Map<string, number> {
    const pads = new Map<string, number>();
    const put = (x: number, y: number, fp: [number, number]) => {
      const h = naturalHeight(input, x + Math.floor((fp[0] - 1) / 2), y + Math.floor((fp[1] - 1) / 2));
      for (let dy = 0; dy < fp[1]; dy++) for (let dx = 0; dx < fp[0]; dx++) pads.set(`${x + dx},${y + dy}`, h);
    };
    for (const g of state.graves) put(g.x, g.y, GRAVE_FOOTPRINT);
    for (const p of state.placeables) put(p.x, p.y, rotatedFootprint(p.type, p.rot));
    return pads;
  }

  /** Quota a cui poggia un ingombro (pad della sua cella d'origine). */
  private baseHeight(x: number, y: number): number {
    return this.groundInput?.pads.get(`${x},${y}`) ?? 0;
  }

  /** Quota del suolo in un punto del mondo, nello stile attivo. */
  heightAt(wx: number, wz: number): number {
    return this.groundInput ? surfaceHeight(this.groundInput, this.style, wx, wz) : 0;
  }

  private chunkKeys(): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let cy = WORLD_MIN; cy < WORLD_MAX; cy += CHUNK) for (let cx = WORLD_MIN; cx < WORLD_MAX; cx += CHUNK) out.push([cx, cy]);
    return out;
  }

  /** Firma del suolo di un chunk (si ricostruisce solo ciò che cambia). */
  private chunkSig(input: GroundInput, cx0: number, cy0: number): string {
    const parts: string[] = [];
    for (let y = cy0 - 1; y <= cy0 + CHUNK; y++) for (let x = cx0 - 1; x <= cx0 + CHUNK; x++) {
      const k = `${x},${y}`;
      const g = input.overrides.get(k);
      const p = input.pads.get(k);
      if (g || p !== undefined) parts.push(`${k}${g ? g[0] : ''}${p !== undefined ? p.toFixed(2) : ''}`);
    }
    return `${this.style}|${this.area.x},${this.area.w}|${parts.join(';')}`;
  }

  private syncTerrain(state: SaveData) {
    const overrides = this.groundOverrides(state);
    const input: GroundInput = { seed: state.seed % 100000, area: this.area, overrides, pads: new Map() };
    input.pads = this.groundPads(state, input);
    this.groundInput = input;
    for (const [cx, cy] of this.chunkKeys()) {
      const key = `${cx},${cy}`;
      const sig = this.chunkSig(input, cx, cy);
      const old = this.terrainChunks.get(key);
      if (old && old.sig === sig) continue;
      if (old) {
        this.terrain.remove(old.mesh);
        old.mesh.geometry.dispose();
        this.disposeChunkMaterial(old.mesh);
      }
      const chunk = buildChunk(input, cx, cy, this.style);
      const mesh = new THREE.Mesh(chunk.geometry, chunk.texture ? new THREE.MeshLambertMaterial({ map: chunk.texture, vertexColors: true }) : LOWPOLY_MATERIALS.solid);
      mesh.receiveShadow = true;
      mesh.name = `chunk-${key}`;
      this.terrain.add(mesh);
      this.terrainChunks.set(key, { mesh, sig });
    }
  }

  private disposeChunkMaterial(mesh: THREE.Mesh) {
    const m = mesh.material as THREE.MeshLambertMaterial;
    if (m === LOWPOLY_MATERIALS.solid) return; // condiviso
    m.map?.dispose();
    m.dispose();
  }

  /** Recinto + cancello (instancing) e bosco (cotto per chunk). */
  private syncScenery(state: SaveData) {
    const sig = `${this.style}|${state.world.expansionLevel}|${this.quality}`;
    if (sig === this.scenerySig) return;
    this.scenerySig = sig;
    for (const h of this.sceneryAnchors) this.atmosphere.removeAnchor(h);
    this.sceneryAnchors = [];
    for (const c of [...this.scenery.children]) { this.scenery.remove(c); if ((c as THREE.Mesh).userData.baked) (c as THREE.Mesh).geometry.dispose(); }
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

    // Bosco: celle selvatiche e oltre la mappa. Vicino al recinto alberi voxel
    // (dettaglio pieno), lontano un LOD leggero: la sfocatura ai bordi e la
    // nebbia ne nascondono la semplificazione.
    const rng = createRng(state.seed + 77);
    const input = this.groundInput!;
    const density = this.quality === 'low' ? 0.22 : this.quality === 'medium' ? 0.32 : 0.42;
    const baker = new ChunkBaker();
    const nearRes = this.quality === 'high' ? 1.6 : 1.0;
    const farRes = this.quality === 'high' ? 1.0 : 0.7;
    for (let y = WORLD_MIN; y < WORLD_MAX; y += 2) {
      for (let x = WORLD_MIN; x < WORLD_MAX; x += 2) {
        const gt = groundType(input, x, y);
        if (gt !== 'wild' && gt !== 'forest') continue;
        if (x >= a.x - 3 && x < a.x + a.w + 2 && y >= a.y - 3 && y < a.y + a.h + 2) continue;
        const dist = Math.max(a.x - x, x - (a.x + a.w), a.y - y, y - (a.y + a.h));
        const r = rng.next();
        // macchie di bosco fitto alternate a radure (rumore a bassa frequenza)
        const clump = lowNoise(x, y, input.seed + 31, 9);
        if (r > (density + Math.min(0.3, dist * 0.015)) * (0.35 + clump * 1.3)) continue;
        const kind = rng.next();
        const far = dist > 9;
        const variant = rng.int(4);
        const style = this.style;
        const res = far ? farRes : nearRes;
        const model = kind < 0.58
          ? getModel(`wpine:${variant}`, style, () => pine(variant + 40), variant, true, res)
          : kind < 0.88
            ? getModel(`wdead:${variant}`, style, () => deadTree({ seed: variant + 90 }, true), variant, true, res)
            : getModel(`wrock:${variant % 3}`, style, () => sceneryRock(variant % 3), variant, true, res);
        const s = 0.85 + rng.next() * 0.55;
        const pos = new THREE.Vector3(x + 1 + rng.range(-0.6, 0.6) - HALF, 0, y + 1 + rng.range(-0.6, 0.6) - HALF);
        pos.y = this.heightAt(pos.x, pos.z) - 0.04;
        baker.add(model, new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, Math.PI * 2)), new THREE.Vector3(s, s * (0.9 + rng.next() * 0.35), s)), 1, x, y);
      }
    }
    for (const mesh of baker.build(this.quality === 'high')) this.scenery.add(mesh);
  }

  /**
   * Sottobosco cotto per chunk: erba fitta, fiorellini, sassi e funghi nel
   * prato; felci, cespugli, erba secca e foglie nel bosco. Evita oggetti e
   * sentieri. I modelli sono pochi e condivisi, varia solo la trasformazione.
   */
  private syncDecor(state: SaveData) {
    const occ = buildOccupancy(state);
    const input = this.groundInput!;
    const sig = `${this.style}|${this.quality}|${state.world.expansionLevel}|${[...occ.owner.keys()].sort().join(';')}`;
    if (sig === this.decorSig) return;
    this.decorSig = sig;
    for (const c of [...this.decorLayer.children]) { this.decorLayer.remove(c); (c as THREE.Mesh).geometry.dispose(); }
    const rng = createRng(state.seed + 5);
    const per = this.quality === 'low' ? 0.45 : this.quality === 'medium' ? 0.85 : 1.25;
    const baker = new ChunkBaker();
    const st = this.style;
    const M = {
      tuft: (v: number) => getModel(`tuft:${v % 6}`, st, () => sceneryTuft(v % 6), v),
      flowers: (v: number) => getModel(`flowers:${v % 4}`, st, () => sceneryFlowers(v % 4), v),
      pebbles: (v: number) => getModel(`pebbles:${v % 3}`, st, () => sceneryPebbles(v % 3), v),
      leaves: (v: number) => getModel(`leaves:${v % 3}`, st, () => sceneryLeaves(v % 3), v),
      shrooms: (v: number) => getModel(`shroom:${v % 3}`, st, () => sceneryShrooms(v % 3), v),
      wgrass: (v: number) => getModel(`wgrass:${v % 4}`, st, () => sceneryWildGrass(v % 4), v),
      fern: (v: number) => getModel(`fern:${v % 4}`, st, () => sceneryFern(v % 4), v),
      bush: (v: number) => getModel(`bush:${v % 4}`, st, () => sceneryBush(v % 4), v),
    };
    const meadow: Array<[number, keyof typeof M]> = [[0.72, 'tuft'], [0.82, 'flowers'], [0.92, 'pebbles'], [0.97, 'leaves'], [1, 'shrooms']];
    const wood: Array<[number, keyof typeof M]> = [[0.36, 'wgrass'], [0.6, 'fern'], [0.72, 'bush'], [0.86, 'leaves'], [0.93, 'shrooms'], [1, 'pebbles']];
    const reach = 10; // celle oltre il recinto con sottobosco
    const lowpoly = this.style === 'lowpoly';
    const a = this.area;
    for (let y = a.y - reach; y < a.y + a.h + reach; y++) {
      for (let x = a.x - reach; x < a.x + a.w + reach; x++) {
        const k = `${x},${y}`;
        const gt = groundType(input, x, y);
        if (occ.owner.has(k) || gt === 'path' || gt === 'fence' || gt === 'dirt' || gt === 'mud') continue;
        const wild = gt !== 'grass';
        const dist = Math.max(a.x - x, x - (a.x + a.w - 1), a.y - y, y - (a.y + a.h - 1), 0);
        // in low-poly le piante sono in scala più realistica: ne servono di più
        const n = (wild ? 1.2 * Math.max(0, 1 - dist / reach) ** 0.7 : 1.7) * per * (lowpoly ? 1.8 : 1);
        let count = Math.floor(n) + (rng.next() < n % 1 ? 1 : 0);
        while (count-- > 0) {
          const r = rng.next();
          const kind = (wild ? wood : meadow).find(([p]) => r <= p)![1];
          const model = M[kind](rng.int(12));
          const pos = new THREE.Vector3(x + rng.range(0.2, 0.8) - HALF, 0, y + rng.range(0.2, 0.8) - HALF);
          pos.y = this.heightAt(pos.x, pos.z) - 0.01;
          const sc = (kind === 'bush' || kind === 'fern' ? 0.9 + rng.next() * 0.5 : 1) * (lowpoly && kind !== 'pebbles' && kind !== 'leaves' ? 1.45 : 1);
          baker.add(model, new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.int(4) * Math.PI / 2), new THREE.Vector3(sc, sc, sc)), wild ? 0.75 + rng.next() * 0.2 : 0.9 + rng.next() * 0.15, x, y);
        }
      }
    }
    for (const mesh of baker.build(false)) this.decorLayer.add(mesh);
  }

  private addInstanced(model: CachedModel, mats: THREE.Matrix4[], parent = this.scenery, cast = true) {
    if (!mats.length) return;
    for (const [bucket, geo] of Object.entries(model.geometries)) {
      if (!geo) continue;
      const mesh = new THREE.InstancedMesh(geo, model.mats[bucket as keyof typeof model.mats], mats.length);
      mats.forEach((mm, i) => mesh.setMatrixAt(i, mm));
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
    center.y = this.baseHeight(g.x, g.y);
    let e = this.entities.get(g.id);
    if (!e || e.key !== key) {
      if (e) this.removeEntity(g.id);
      const state = graveVisualState(g);
      const model = getModel(key, this.style, () => graveModel(g.graveType, state, g.seed % 4), g.seed % 4);
      e = this.createEntity(g.id, 'grave', key, model, GRAVE_FOOTPRINT, 0);
    }
    this.placeEntity(e, center, 0);
    this.setBadge(e, g.broken ? 'broken' : g.dirty || g.weeds ? 'dirty' : null);
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
    const at = cellCenter(p.x, p.y, fp);
    at.y = this.baseHeight(p.x, p.y);
    this.placeEntity(e, at, p.rot);
    const decays = CATALOG[p.type].decays && !['path_stone', 'path_dirt'].includes(p.type);
    this.setBadge(e, decays ? (p.broken ? 'broken' : p.dirty ? 'dirty' : null) : null);
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

  private setBadge(e: EntityView, need: 'dirty' | 'broken' | null) {
    if (!need) { if (e.badge) { e.group.remove(e.badge); e.badge = undefined; } return; }
    const mat = need === 'broken' ? badgeMaterial('hammer', '#a8473b') : badgeMaterial('broom', '#c9a25c');
    if (!e.badge) { e.badge = new THREE.Sprite(mat); e.badge.scale.set(0.55, 0.55, 0.55); e.badge.renderOrder = 5; e.group.add(e.badge); }
    e.badge.material = mat;
    e.badge.position.set(0, e.height + 0.45, 0);
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
      g.font = `${size}px "Jacquard 24", Georgia, serif`;
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
      base.y = this.heightAt(base.x, base.z) + 0.7;
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

  private setHighlight(id: string, which: 'selected' | 'invalid' | null) {
    const e = this.entities.get(id);
    if (!e) return;
    const mats = (e.group.userData.model as CachedModel).mats;
    e.visual.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.name !== 'solid') return;
      mesh.material = which ? mats[which] : mats.solid;
    });
  }

  private refreshSelection() {
    const e = this.selectedId ? this.entities.get(this.selectedId) : null;
    if (!e) { this.selectionFrame.visible = false; return; }
    this.setHighlight(e.id, 'selected');
    this.selectionFrame.visible = true;
    this.selectionFrame.position.set(e.group.position.x, e.group.position.y + 0.06, e.group.position.z);
    this.selectionFrame.scale.set(e.fp[0], 1, e.fp[1]);
  }

  /** Anteprima di trascinamento: sposta il gruppo e colora l'ingombro. */
  previewMove(id: string, x: number, y: number, valid: boolean) {
    const e = this.entities.get(id);
    if (!e) return;
    const c = cellCenter(x, y, e.fp);
    c.y = this.heightAt(c.x, c.z);
    e.group.position.copy(c);
    this.ghostFrame.visible = true;
    this.ghostFrame.position.set(c.x, c.y + 0.05, c.z);
    this.ghostFrame.scale.set(e.fp[0], 1, e.fp[1]);
    (this.ghostFrame.material as THREE.MeshBasicMaterial).color.set(valid ? '#7fd18b' : '#e0564a');
    this.setHighlight(id, valid ? 'selected' : 'invalid');
    this.selectionFrame.position.set(c.x, c.y + 0.06, c.z);
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
      const gm = build();
      this.ghost = instantiate(gm, { castShadow: false });
      this.ghost.userData.mats = gm.mats;
      this.ghostKey = key;
      this.root.add(this.ghost);
    }
    const c = cellCenter(x, y, fp);
    c.y = this.heightAt(c.x, c.z);
    this.ghost!.position.copy(c);
    this.ghost!.rotation.y = -rot * Math.PI / 2;
    this.ghost!.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.name === 'solid') m.material = valid ? this.ghost!.userData.mats.selected : this.ghost!.userData.mats.invalid;
    });
    this.ghostFrame.visible = true;
    this.ghostFrame.position.set(c.x, c.y + 0.05, c.z);
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
    return this.ghost ? this.ghost.position.clone().setY(this.ghost.position.y + 1.6) : null;
  }

  entityTop(id: string): THREE.Vector3 | null {
    const e = this.entities.get(id);
    if (!e) return null;
    return e.group.position.clone().setY(e.group.position.y + e.height + 0.3);
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
    for (const e of this.entities.values()) if (e.badge) e.badge.position.y = e.height + 0.45 + Math.sin(t * 2.5 + e.group.position.x) * 0.06;
    if (this.selectionFrame.visible) {
      (this.selectionFrame.material as THREE.LineBasicMaterial).opacity = 0.55 + Math.sin(t * 4) * 0.4;
    }
  }

  stats() {
    return { entities: this.entities.size, wisps: this.wisps.size };
  }
}
