// Vista del mondo: tiene la scena 3D allineata allo SaveData.
//  • terreno a chunk, recinto, bosco esterno, ciuffi/foglie (instancing)
//  • una entità 3D per tomba/oggetto (geometrie condivise dalla cache)
//  • fuochi fatui animati, hitbox per il picking, evidenziazione selezione
// Cambiare stile ricostruisce solo la resa: posizioni e stati arrivano sempre
// dallo stato di gioco.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GRAVE_FOOTPRINT, MAP_SIZE } from '../game/balance.ts';
import { CATALOG, rotatedFootprint, visualOf } from '../game/catalog.ts';
import { graveVisualState } from '../game/graves.ts';
import { hash3, hashString, createRng } from '../game/rng.ts';
import type { ArtStyle, Grave, Placed, SaveData } from '../game/state.ts';
import { areaForLevel, buildOccupancy, gateCells, type Rect } from '../game/world.ts';
import { getModel, instantiate, LOWPOLY_MATERIALS, LOWPOLY_TERRAIN, lightWorldPos, type CachedModel } from '../render/modelCache.ts';
import { keeperAreaLP, mudTracksLP } from '../render/lowpoly/newItems2.ts';
import { fencePillar, fenceSegment, gate } from '../render/models/fence.ts';
import { graveModel } from '../render/models/graves.ts';
import { deadTree, pine, sceneryBush, sceneryFern, sceneryFlowers, sceneryLeaves, sceneryPebbles, sceneryRock, sceneryShrooms, sceneryTuft, sceneryWildGrass } from '../render/models/nature.ts';
import { placeableKey, placeableModel, placeableSeed, type PVis } from '../render/models/registry.ts';
import { createAnimated, type Animated } from '../render/lowpoly/animated.ts';
import { createWispVisual, type WispVisual } from '../render/lowpoly/wisp.ts';
import { P } from '../render/palette.ts';
import { drawIcon } from '../ui/icons.ts';
import type { Atmosphere, AnchorHandle } from './Atmosphere.ts';
import { buildChunk, CHUNK, groundType, lowNoise, naturalHeight, surfaceHeight, WORLD_MAX, WORLD_MIN, type Ground, type GroundInput } from './terrain.ts';
import { ChunkBaker } from './baker.ts';


export const HALF = MAP_SIZE / 2;
/** Lato (in celle) delle zone in cui si fondono gli oggetti fermi. */
const ZONE = 8;

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
  /** Bar e orto: incasso da riscuotere (etichetta con la fiammella e «+N», più una zona toccabile). */
  earn?: { n: number; sprite: THREE.Sprite; hit: THREE.Mesh; x: number };
  id: string;
  kind: EntityKind;
  key: string;
  group: THREE.Group;
  visual: THREE.Group;
  hitbox: THREE.Mesh;
  anchors: AnchorHandle[];
  height: number;
  fp: [number, number];
  /** Guasto delle sue luci: 1 sporco, 2 rotto (sfarfallano). */
  fault?: number;
  /** Parti animate (stagno, case delle presenze…), solo stile low-poly. */
  anim?: Animated;
  /** Zona di fusione (8×8 celle) in cui sta (qualità Auto). */
  zone?: string;
  /** Tomba sporcata da uno zombie: le impronte di fango sopra lo sporco. */
  mud?: THREE.Object3D;
}

/** Impronte di fango (tre scie diverse, una per tomba a seconda del seme). */
const mudModels = new Map<number, CachedModel>();
function mudModel(seed: number): CachedModel {
  let m = mudModels.get(seed);
  if (!m) { const lp = mudTracksLP(seed + 1); m = { geometries: lp.geometries, lights: [], height: 0.1, mats: LOWPOLY_MATERIALS, dedicated: true }; mudModels.set(seed, m); }
  return m;
}

interface WispView { group: THREE.Group; hitbox: THREE.Mesh; anchor: AnchorHandle; phase: number; base: THREE.Vector3; visual?: WispVisual; born?: number }

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

const earnMaterials = new Map<number, THREE.SpriteMaterial>();
/** Etichetta dell'incasso: fiammella del fuoco fatuo e «+N» in una targhetta pixel. */
function earnMaterial(n: number): THREE.SpriteMaterial {
  let m = earnMaterials.get(n);
  if (m) return m;
  const c = document.createElement('canvas');
  c.width = 192; c.height = 96;
  const g = c.getContext('2d')!;
  const step = 6;
  const plate = (inset: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(inset + step, inset, 192 - 2 * (inset + step), 96 - 2 * inset);
    g.fillRect(inset, inset + step, 192 - 2 * inset, 96 - 2 * (inset + step));
  };
  plate(0, '#07080b');
  plate(step, '#c9a25c');
  plate(step * 2, '#161920');
  drawIcon(g, 'wisp', 20, 20, 56);
  g.fillStyle = '#f1d39c';
  g.font = 'bold 46px "Pixelify Sans", system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText(`+${n}`, 84, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  m = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  earnMaterials.set(n, m);
  return m;
}

/** Dove sta l'etichetta dell'incasso (in coordinate dell'oggetto): sopra il bancone o la bancarella. */
const EARN_AT: Record<string, number> = { zombie_bar: 0, brain_farm: 1.35, witch_corner: -0.35 };

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
    this.root.add(this.terrain, this.scenery, this.decorLayer, this.decorLight, this.mergedLayer);
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.02, 1));
    this.selectionFrame = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: '#f2c27a', transparent: true, opacity: 0.95 }));
    this.selectionFrame.visible = false;
    this.ghostFrame = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), new THREE.MeshBasicMaterial({ color: '#7fd18b', transparent: true, opacity: 0.35, depthWrite: false }));
    this.ghostFrame.visible = false;
    this.root.add(this.selectionFrame, this.ghostFrame);
    scene.add(this.root);
  }

  /**
   * Ombre della scena ridisegnate solo quando cambia qualcosa (qualità Auto):
   * ciò che si muove da solo (fuochi fatui, parti animate) non proietta ombre,
   * altrimenti resterebbero ferme dove le ha lasciate l'ultimo aggiornamento.
   */
  staticShadows = false;
  /** Moltiplicatore della densità del bosco attorno al recinto (1 = come il livello di qualità). */
  forestScale = 1;
  /** Cresce a ogni cambiamento visibile della scena: chi lo osserva sa quando ridisegnare le ombre. */
  version = 0;

  private noShadow(o: THREE.Object3D) {
    if (this.staticShadows) o.traverse((m) => { m.castShadow = false; });
  }

  setStyle(style: ArtStyle, state: SaveData, force = false) {
    if (style === this.style && !force) return;
    this.style = style;
    for (const e of [...this.entities.values()]) this.removeEntity(e.id);
    this.syncWisps({ ...state, world: { ...state.world, looseWisps: [] } }); // si ricreano nel nuovo stile
    this.scenerySig = this.decorSig = '';
    for (const c of this.terrainChunks.values()) { this.terrain.remove(c.mesh); c.mesh.geometry.dispose(); this.disposeChunkMaterial(c.mesh); }
    this.terrainChunks.clear();
    this.sync(state);
  }

  getStyle() { return this.style; }

  // ── Sincronizzazione ─────────────────────────────────────────────────

  sync(state: SaveData) {
    this.version++;
    this.area = areaForLevel(state.world.expansionLevel);
    this.treeMemories = Math.min(30, state.entrusted.length);
    this.syncTerrain(state);
    this.syncScenery(state);
    this.syncDecor(state);
    const alive = new Set<string>();
    for (const g of state.graves) { alive.add(g.id); this.syncGrave(g); }
    for (const p of state.placeables) { alive.add(p.id); this.syncPlaceable(p); }
    for (const id of [...this.entities.keys()]) if (!alive.has(id)) this.removeEntity(id);
    for (const id of [...this.hidden]) if (!alive.has(id)) this.hidden.delete(id);
    for (const id of [...this.marked]) if (!alive.has(id)) this.marked.delete(id); else if (id !== this.selectedId) this.setHighlight(id, null);
    this.syncWisps(state);
    this.refreshSelection();
    this.flushZones();
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
      const mesh = new THREE.Mesh(chunk.geometry, chunk.texture ? new THREE.MeshLambertMaterial({ map: chunk.texture, vertexColors: true }) : LOWPOLY_TERRAIN);
      mesh.receiveShadow = true;
      mesh.name = `chunk-${key}`;
      this.terrain.add(mesh);
      this.terrainChunks.set(key, { mesh, sig });
    }
  }

  private disposeChunkMaterial(mesh: THREE.Mesh) {
    const m = mesh.material as THREE.MeshLambertMaterial;
    if ((m as THREE.Material) === LOWPOLY_TERRAIN) return; // condiviso
    m.map?.dispose();
    m.dispose();
  }

  /** Recinto + cancello (instancing) e bosco (cotto per chunk). */
  private syncScenery(state: SaveData) {
    const sig = `${this.style}|${state.world.expansionLevel}|${this.quality}|${this.forestScale}`;
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
    const density = (this.quality === 'low' ? 0.22 : this.quality === 'medium' ? 0.32 : 0.42) * this.forestScale;
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
    const sig = `${this.style}|${this.quality}|${this.decorLod?.join('/') ?? ''}|${state.world.expansionLevel}|${[...occ.owner.keys()].sort().join(';')}`;
    if (sig === this.decorSig) return;
    this.decorSig = sig;
    for (const g of [this.decorLayer, this.decorLight]) for (const c of [...g.children]) { g.remove(c); (c as THREE.Mesh).geometry.dispose(); }
    const per = (q: 'low' | 'medium' | 'high') => (q === 'low' ? 0.45 : q === 'medium' ? 0.85 : 1.25) * 1.15; // +15% di fiori, sassi, ciuffi
    if (this.decorLod) {
      // qualità Auto: ricco nella fascia nitida, leggero in quelle sfocate (vedi updateDecorLod)
      this.bakeDecor(state, occ, per(this.decorLod[0]), this.decorLayer);
      this.bakeDecor(state, occ, per(this.decorLod[1]), this.decorLight);
      this.lodSig = '';
    } else this.bakeDecor(state, occ, per(this.quality), this.decorLayer);
  }

  private bakeDecor(state: SaveData, occ: ReturnType<typeof buildOccupancy>, per: number, target: THREE.Group) {
    const input = this.groundInput!;
    // un generatore per cella (dalle sue coordinate): piazzare o togliere un
    // oggetto cambia solo le sue celle, il resto del prato non si sposta
    const cellRng = (x: number, y: number, salt: number) => createRng(Math.floor(hash3(x, y, salt, state.seed) * 4294967296));
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
      rock: (v: number) => getModel(`wrock:${v % 3}`, st, () => sceneryRock(v % 3), v),
    };
    const lowpoly = this.style === 'lowpoly';
    // in low-poly: pochi fiori (la scena resta leggibile), più sassi e rocce
    const meadow: Array<[number, keyof typeof M]> = lowpoly
      ? [[0.75, 'tuft'], [0.79, 'flowers'], [0.9, 'pebbles'], [0.94, 'rock'], [0.988, 'leaves'], [1, 'shrooms']]
      : [[0.72, 'tuft'], [0.82, 'flowers'], [0.92, 'pebbles'], [0.97, 'leaves'], [1, 'shrooms']];
    const wood: Array<[number, keyof typeof M]> = [[0.36, 'wgrass'], [0.6, 'fern'], [0.72, 'bush'], [0.86, 'leaves'], [0.93, 'shrooms'], [1, 'pebbles']];
    const reach = 10; // celle oltre il recinto con sottobosco
    const a = this.area;
    for (let y = a.y - reach; y < a.y + a.h + reach; y++) {
      for (let x = a.x - reach; x < a.x + a.w + reach; x++) {
        const k = `${x},${y}`;
        const gt = groundType(input, x, y);
        if (occ.owner.has(k) || gt === 'path' || gt === 'fence' || gt === 'dirt' || gt === 'mud') continue;
        const rng = cellRng(x, y, 5);
        const wild = gt !== 'grass';
        const dist = Math.max(a.x - x, x - (a.x + a.w - 1), a.y - y, y - (a.y + a.h - 1), 0);
        // in low-poly le piante sono in scala più realistica: ne servono di più
        const n = (wild ? 1.2 * Math.max(0, 1 - dist / reach) ** 0.7 : 1.7) * per * (lowpoly ? 1.5 : 1);
        let count = Math.floor(n) + (rng.next() < n % 1 ? 1 : 0);
        while (count-- > 0) {
          const r = rng.next();
          const kind = (wild ? wood : meadow).find(([p]) => r <= p)![1];
          const model = M[kind](rng.int(12));
          const pos = new THREE.Vector3(x + rng.range(0.2, 0.8) - HALF, 0, y + rng.range(0.2, 0.8) - HALF);
          pos.y = this.heightAt(pos.x, pos.z) - 0.01;
          const sc = kind === 'rock' ? 0.3 + rng.next() * 0.45
            : (kind === 'bush' || kind === 'fern' ? 0.9 + rng.next() * 0.5 : 1) * (lowpoly && kind !== 'pebbles' && kind !== 'leaves' ? 1.45 : kind === 'pebbles' && lowpoly ? 1.6 : 1);
          const yaw = lowpoly ? rng.range(0, Math.PI * 2) : rng.int(4) * Math.PI / 2;
          baker.add(model, new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(sc, sc, sc)), wild ? 0.75 + rng.next() * 0.2 : 0.9 + rng.next() * 0.15, x, y);
        }
      }
    }
    if (lowpoly) this.pathEdges(state, occ, baker, M.tuft, M.pebbles, cellRng);
    for (const mesh of baker.build(false)) target.add(mesh);
  }

  /**
   * Prato a due versioni (qualità Auto): [ricca, leggera]. La ricca si vede
   * nella fascia nitida al centro dello schermo, la leggera in quelle
   * sfocate in alto e in basso, dove la differenza non si nota.
   */
  decorLod: ['low' | 'medium' | 'high', 'low' | 'medium' | 'high'] | null = null;
  private decorLight = new THREE.Group();
  private lodSig = '';

  /** Sceglie, blocco per blocco, la versione del prato da mostrare (solo se la camera si è mossa). */
  updateDecorLod(camera: THREE.Camera) {
    if (!this.decorLod) return;
    const e = camera.matrixWorld.elements, pr = camera.projectionMatrix.elements;
    const sig = `${e[12].toFixed(2)},${e[13].toFixed(2)},${e[14].toFixed(2)},${pr[0].toFixed(4)},${pr[5].toFixed(4)}`;
    if (sig === this.lodSig) return;
    this.lodSig = sig;
    const v = new THREE.Vector3();
    const sharp = (m: THREE.Object3D) => {
      const [cx, cy] = String(m.userData.chunk).split(',').map(Number);
      v.set((cx + 0.5) * CHUNK - HALF, 0, (cy + 0.5) * CHUNK - HALF).project(camera);
      return Math.abs(v.y) < 0.55 && Math.abs(v.x) < 1.4;
    };
    for (const m of this.decorLayer.children) m.visible = sharp(m);
    for (const m of this.decorLight.children) m.visible = !sharp(m);
  }

  /**
   * Bordi dei sentieri (low-poly): erba bassa e sassolini a cavallo del
   * confine tra selciato e prato, così il sentiero non è un taglio netto.
   */
  private pathEdges(state: SaveData, occ: ReturnType<typeof buildOccupancy>, baker: ChunkBaker, tuft: (v: number) => CachedModel, pebbles: (v: number) => CachedModel, cellRng: (x: number, y: number, salt: number) => ReturnType<typeof createRng>) {
    const path = new Set<string>();
    for (const p of state.placeables) if (p.type === 'path_stone' || p.type === 'path_dirt') path.add(`${p.x},${p.y}`);
    const input = this.groundInput!;
    for (const k of path) {
      const [x, y] = k.split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${x + dx},${y + dy}`;
        if (path.has(nk)) continue;
        const free = !occ.owner.has(nk) && groundType(input, x + dx, y + dy) !== 'fence';
        const rng = cellRng(x * 4 + dx + 1, y * 4 + dy + 1, 9); // un generatore per lato di cella
        const n = 2 + rng.int(3);
        for (let i = 0; i < n; i++) {
          const along = rng.range(0.08, 0.92);
          const across = free ? rng.range(-0.08, 0.14) : rng.range(-0.1, -0.02); // lato prato (+) o appena dentro il selciato (−)
          const cx = x + 0.5 + dx * (0.5 + across) + (dx === 0 ? along - 0.5 : 0);
          const cz = y + 0.5 + dy * (0.5 + across) + (dy === 0 ? along - 0.5 : 0);
          const pos = new THREE.Vector3(cx - HALF, 0, cz - HALF);
          pos.y = this.heightAt(pos.x, pos.z) - 0.01;
          const isPebble = rng.next() < 0.35;
          const sc = isPebble ? 1.2 + rng.next() * 0.5 : 0.7 + rng.next() * 0.4;
          const model = isPebble ? pebbles(rng.int(12)) : tuft(rng.int(12));
          baker.add(model, new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, Math.PI * 2)), new THREE.Vector3(sc, sc * (isPebble ? 1 : 0.8), sc)), 0.92, x, y);
        }
      }
    }
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

  /** Entità nascoste (la tomba la cui bara è in viaggio verso l'albero): non si vedono né si toccano. */
  private hidden = new Set<string>();

  setHidden(id: string, on: boolean) {
    this.version++;
    this.markZone(this.entities.get(id));
    if (on) this.hidden.add(id); else this.hidden.delete(id);
    const e = this.entities.get(id);
    if (e) e.group.visible = !on;
    this.flushZones();
  }

  isHidden(id: string) { return this.hidden.has(id); }

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
    e.group.visible = !this.hidden.has(g.id);
    this.placeEntity(e, center, 0);
    this.setBadge(e, g.broken ? 'broken' : g.dirty || g.weeds ? 'dirty' : null);
    // impronte dello zombie: solo sopra lo sporco, vanno via con la pulizia
    const muddy = !!g.muddy && (g.dirty || g.weeds || g.broken);
    if (muddy && !e.mud) {
      e.mud = instantiate(mudModel(g.seed % 3), { castShadow: false });
      e.mud.traverse((o) => { o.receiveShadow = true; });
      e.group.add(e.mud);
    } else if (!muddy && e.mud) { e.group.remove(e.mud); e.mud = undefined; }
  }

  /** Ricordi affidati all'albero: un frutto acceso per ciascuno (fino a 30). */
  private treeMemories = 0;

  pvis(p: Placed): PVis {
    // le varianti diventate oggetti a sé si disegnano col modello della loro famiglia
    const vis = visualOf(p.type, p.type === 'memory_tree' ? this.treeMemories : p.variant);
    return { type: vis.type, variant: vis.variant, dirty: p.dirty, broken: p.broken, lit: p.lit, seed: placeableSeed(vis.type, hashString(p.id)) };
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
      if (this.style === 'lowpoly') {
        e.anim = createAnimated(v) ?? undefined;
        if (e.anim) { this.noShadow(e.anim.root); e.visual.add(e.anim.root); }
      }
    }
    e.fault = p.broken ? 2 : p.dirty ? 1 : 0;
    e.fp = fp;
    const at = cellCenter(p.x, p.y, fp);
    at.y = this.baseHeight(p.x, p.y);
    this.placeEntity(e, at, p.rot);
    const decays = CATALOG[p.type].decays && !['path_stone', 'path_dirt'].includes(p.type);
    this.setBadge(e, decays ? (p.broken ? 'broken' : p.dirty ? 'dirty' : null) : null);
    if (p.type in EARN_AT) this.applyEarnings(e, p.type);
  }

  /** Incassi da riscuotere per edificio (si riapplicano se l'edificio si ricostruisce). */
  private readonly earnings = new Map<string, number>();

  /** Mostra (n > 0) o toglie l'etichetta dell'incasso sopra bar e orto. */
  /** Area protetta dal Lampione del Custode (in modifica e mentre lo si posa): null la toglie. */
  private keeperArea: THREE.Object3D | null = null;
  showKeeperArea(center: THREE.Vector3 | null, half: number) {
    if (!center) { if (this.keeperArea) { this.root.remove(this.keeperArea); this.keeperArea = null; } return; }
    if (!this.keeperArea) {
      const m = keeperAreaLP(half);
      this.keeperArea = instantiate({ geometries: m.geometries, lights: [], height: 0.05, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: false });
      this.root.add(this.keeperArea);
    }
    this.keeperArea.position.set(center.x, this.heightAt(center.x, center.z), center.z);
  }

  setEarnings(id: string, n: number) {
    if ((this.earnings.get(id) ?? 0) === n) return;
    if (n > 0) this.earnings.set(id, n); else this.earnings.delete(id);
    const e = this.entities.get(id);
    const type = e ? (e.key.split(':')[1] ?? '') : '';
    if (e) this.applyEarnings(e, type);
  }

  private applyEarnings(e: EntityView, type: string) {
    const n = this.earnings.get(e.id) ?? 0;
    if (!n) {
      if (e.earn) {
        e.group.remove(e.earn.sprite, e.earn.hit);
        const i = this.hitboxes.indexOf(e.earn.hit);
        if (i >= 0) this.hitboxes.splice(i, 1);
        e.earn.hit.geometry.dispose();
        e.earn = undefined;
      }
      return;
    }
    if (!e.earn) {
      const sprite = new THREE.Sprite(earnMaterial(n));
      sprite.scale.set(0.9, 0.45, 1);
      sprite.renderOrder = 6;
      // l'etichetta si tocca anche se sporge sopra l'edificio
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), hitMaterial);
      hit.userData.entityId = e.id;
      e.group.add(sprite, hit);
      this.hitboxes.push(hit);
      e.earn = { n, sprite, hit, x: EARN_AT[type] ?? 0 };
    }
    e.earn.n = n;
    e.earn.sprite.material = earnMaterial(n);
    e.earn.sprite.position.set(e.earn.x, e.height + 0.5, 0);
    e.earn.hit.position.copy(e.earn.sprite.position);
    e.group.updateMatrixWorld(true);
  }

  private createEntity(id: string, kind: EntityKind, key: string, model: CachedModel, baseFp: [number, number], rot: number): EntityView {
    const group = new THREE.Group();
    group.name = id;
    // tombe e oggetti stanno fermi: la matrice si ricalcola solo quando si spostano
    group.matrixAutoUpdate = false;
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
    e.group.updateMatrix();
    e.group.updateMatrixWorld(true);
    // la zona si ricompone solo se l'oggetto si è davvero spostato (la sincronizzazione lo riposa sempre)
    const placed = `${center.x.toFixed(3)},${center.y.toFixed(3)},${center.z.toFixed(3)},${rot}`;
    if (e.group.userData.placed !== placed) {
      e.group.userData.placed = placed;
      this.markZone(e);
      e.zone = `${Math.floor((center.x + HALF) / ZONE)},${Math.floor((center.z + HALF) / ZONE)}`;
      this.markZone(e);
    }
    const model = e.group.userData.model as CachedModel;
    // stesse sorgenti: si aggiornano sul posto (toglierle e rimetterle faceva spegnere e riaccendere le luci vicine)
    const reuse = e.anchors.length === model.lights.length;
    if (!reuse) { for (const h of e.anchors) this.atmosphere.removeAnchor(h); e.anchors = []; }
    model.lights.forEach((a, i) => {
      const pos = lightWorldPos(a).applyMatrix4(e.group.matrixWorld);
      const anchor = e.fault ? { ...a, fault: e.fault } : a;
      if (reuse) this.atmosphere.updateAnchor(e.anchors[i], pos, anchor);
      else e.anchors.push(this.atmosphere.addAnchor(pos, anchor));
    });
  }

  private setBadge(e: EntityView, need: 'dirty' | 'broken' | null) {
    if (!need) { if (e.badge) { e.group.remove(e.badge); e.badge = undefined; } return; }
    const mat = need === 'broken' ? badgeMaterial('hammer', '#a8473b') : badgeMaterial('broom', '#c9a25c');
    if (!e.badge) { e.badge = new THREE.Sprite(mat); e.badge.scale.set(0.55, 0.55, 0.55); e.badge.renderOrder = 5; e.group.add(e.badge); }
    e.badge.material = mat;
    e.badge.position.set(0, e.height + 0.45, 0);
  }

  // ── Oggetti fermi fusi per zona (qualità Auto) ─────────────────────
  //
  // Tombe e oggetti fermi di una zona di 8×8 celle si disegnano in poche
  // mesh (una per materiale) invece che uno per uno: stesso aspetto, molte
  // meno draw call. Un oggetto esce dalla fusione quando serve vederlo da
  // solo (selezionato, segnato in rosso, nascosto, trascinato, animato) e la
  // sua zona si ricompone; ogni cambiamento della zona la ricompone.

  private mergeOn = false;
  private mergedLayer = new THREE.Group();
  private zoneMeshes = new Map<string, THREE.Mesh[]>();
  private dirtyZones = new Set<string>();
  /** L'oggetto trascinato in Modifica (fuori dalla fusione finché non si posa). */
  private dragging: string | null = null;

  get mergeStatic() { return this.mergeOn; }

  setMergeStatic(on: boolean) {
    if (on === this.mergeOn) return;
    this.mergeOn = on;
    for (const z of [...this.zoneMeshes.keys()]) this.clearZone(z);
    for (const e of this.entities.values()) { e.visual.visible = true; if (on && e.zone) this.dirtyZones.add(e.zone); }
    this.flushZones();
  }

  private markZone(e: EntityView | undefined) {
    if (e?.zone && this.mergeOn) this.dirtyZones.add(e.zone);
  }

  private mergeable(e: EntityView): boolean {
    return !e.anim && e.id !== this.selectedId && e.id !== this.dragging && !this.marked.has(e.id) && !this.hidden.has(e.id);
  }

  private clearZone(z: string) {
    for (const m of this.zoneMeshes.get(z) ?? []) { this.mergedLayer.remove(m); m.geometry.dispose(); }
    this.zoneMeshes.delete(z);
  }

  /** Ricompone le zone cambiate. */
  flushZones() {
    if (!this.dirtyZones.size) return;
    const byZone = new Map<string, EntityView[]>();
    for (const e of this.entities.values()) if (e.zone && this.dirtyZones.has(e.zone)) (byZone.get(e.zone) ?? byZone.set(e.zone, []).get(e.zone)!).push(e);
    for (const z of this.dirtyZones) {
      this.clearZone(z);
      if (!this.mergeOn) continue;
      const groups = new Map<string, { mesh: THREE.Mesh; geos: THREE.BufferGeometry[]; owners: Set<EntityView> }>();
      for (const e of byZone.get(z) ?? []) {
        if (!this.mergeable(e)) { e.visual.visible = true; continue; }
        e.group.updateMatrixWorld(true);
        e.visual.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.visible || Array.isArray(m.material)) return;
          const g = m.geometry;
          const key = `${m.material.uuid}|${Object.keys(g.attributes).sort().join(',')}|${g.index ? 1 : 0}|${m.castShadow ? 1 : 0}|${m.receiveShadow ? 1 : 0}|${m.renderOrder}`;
          let grp = groups.get(key);
          if (!grp) groups.set(key, (grp = { mesh: m, geos: [], owners: new Set() }));
          grp.geos.push(g.clone().applyMatrix4(m.matrixWorld));
          grp.owners.add(e);
        });
        e.visual.visible = false;
      }
      const out: THREE.Mesh[] = [];
      for (const { mesh, geos, owners } of groups.values()) {
        const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
        if (geos.length > 1) for (const g of geos) g.dispose();
        // geometrie incompatibili (non dovrebbe accadere): quegli oggetti restano disegnati da soli
        if (!merged) { for (const e of owners) e.visual.visible = true; continue; }
        merged.computeBoundingSphere();
        const m = new THREE.Mesh(merged, mesh.material);
        m.castShadow = mesh.castShadow;
        m.receiveShadow = mesh.receiveShadow;
        m.renderOrder = mesh.renderOrder;
        m.matrixAutoUpdate = false;
        m.userData.zone = z;
        this.mergedLayer.add(m);
        out.push(m);
      }
      this.zoneMeshes.set(z, out);
    }
    this.dirtyZones.clear();
  }

  removeEntity(id: string) {
    const e = this.entities.get(id);
    if (!e) return;
    this.markZone(e);
    for (const h of e.anchors) this.atmosphere.removeAnchor(h);
    this.root.remove(e.group);
    e.hitbox.geometry.dispose();
    const i = this.hitboxes.indexOf(e.hitbox);
    if (i >= 0) this.hitboxes.splice(i, 1);
    if (e.earn) { const j = this.hitboxes.indexOf(e.earn.hit); if (j >= 0) this.hitboxes.splice(j, 1); e.earn.hit.geometry.dispose(); }
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
      // low-poly: fiammella a goccia con faccina, scintille e alone; voxel/miniatura: cubetti
      const visual = this.style === 'lowpoly' ? createWispVisual() : undefined;
      if (visual) { this.noShadow(visual.root); group.add(visual.root); }
      else {
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), new THREE.MeshBasicMaterial({ color: '#c9fff0', toneMapped: false }));
        const shell = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.28), new THREE.MeshBasicMaterial({ color: P.spectral, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), core.material);
        tip.position.y = 0.24;
        group.add(core, shell, tip);
      }
      const base = cellCenter(w.x, w.y, [1, 1]);
      base.y = this.heightAt(base.x, base.z) + 0.7;
      group.position.copy(base);
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.9), hitMaterial);
      hitbox.userData.wispId = w.id;
      hitbox.position.y = -0.2;
      group.add(hitbox);
      this.hitboxes.push(hitbox);
      this.root.add(group);
      const anchor = this.atmosphere.addAnchor(base.clone(), { pos: [0, 0, 0], color: P.spectral, intensity: 0.9, range: 3.2, flicker: 0.3, halo: visual ? 0 : 0.9 });
      this.wisps.set(w.id, { group, hitbox, anchor, phase: hash3(w.x, w.y, 1) * 10, base, visual });
    }
  }

  wispPosition(id: string): THREE.Vector3 | null {
    return this.wisps.get(id)?.base.clone() ?? null;
  }

  // ── Selezione ed edit ────────────────────────────────────────────────

  select(id: string | null) {
    const prev = this.selectedId;
    this.selectedId = id;
    if (prev && prev !== id) this.setHighlight(prev, null);
    this.refreshSelection();
    this.flushZones();
  }

  /** Elementi segnati in rosso (fuori dall'area scelta mentre si restringe il recinto). */
  private marked = new Set<string>();

  setMarked(ids: Iterable<string>) {
    const next = new Set(ids);
    for (const id of this.marked) if (!next.has(id)) { this.marked.delete(id); this.setHighlight(id, id === this.selectedId ? 'selected' : null); }
    for (const id of next) { this.marked.add(id); if (id !== this.selectedId) this.setHighlight(id, null); }
    this.flushZones();
  }

  private areaOutline: THREE.Mesh | null = null;

  /**
   * Contorno luminoso dell'area scelta (sul terreno, segue i dislivelli),
   * con un velo sul resto: si vede subito cosa resta fuori. null lo toglie.
   */
  showAreaOutline(rect: Rect | null) {
    if (this.areaOutline) {
      this.root.remove(this.areaOutline);
      this.areaOutline.geometry.dispose();
      (this.areaOutline.material as THREE.Material).dispose();
      this.areaOutline = null;
    }
    if (!rect) return;
    const x0 = rect.x - HALF, z0 = rect.y - HALF, x1 = x0 + rect.w, z1 = z0 + rect.h;
    const corners: Array<[number, number]> = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
    const pos: number[] = [];
    const idx: number[] = [];
    const W = 0.16, STEP = 0.25;
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k], [bx, bz] = corners[k + 1];
      const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / STEP);
      // normale verso l'interno: il nastro sta appena dentro il confine
      const nx = -(bz - az) / len, nz = (bx - ax) / len;
      const base = pos.length / 3;
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n;
        for (const off of [0, W]) {
          const px = x + nx * off, pz = z + nz * off;
          pos.push(px, this.heightAt(px, pz) + 0.07, pz);
        }
        if (i < n) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color: '#f2c27a', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.areaOutline = new THREE.Mesh(geo, mat);
    this.areaOutline.renderOrder = 4;
    this.root.add(this.areaOutline);
  }

  private setHighlight(id: string, which: 'selected' | 'invalid' | null) {
    if (!which && this.marked.has(id)) which = 'invalid';
    const e = this.entities.get(id);
    if (!e) return;
    if (e.group.userData.hl !== which) { e.group.userData.hl = which; this.markZone(e); }
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
    e.group.updateMatrix();
    this.version++;
    if (this.dragging !== id) { this.dragging = id; this.markZone(e); this.flushZones(); }
    this.ghostFrame.visible = true;
    this.ghostFrame.position.set(c.x, c.y + 0.05, c.z);
    this.ghostFrame.scale.set(e.fp[0], 1, e.fp[1]);
    (this.ghostFrame.material as THREE.MeshBasicMaterial).color.set(valid ? '#7fd18b' : '#e0564a');
    this.setHighlight(id, valid ? 'selected' : 'invalid');
    this.selectionFrame.position.set(c.x, c.y + 0.06, c.z);
  }

  endPreview() {
    this.ghostFrame.visible = false;
    if (this.dragging) { this.markZone(this.entities.get(this.dragging)); this.dragging = null; this.flushZones(); }
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
      // compare piano (scala da 0) invece di accendersi di colpo
      if (w.born === undefined || t < w.born) w.born = t; // il tempo può ripartire
      const grow = Math.max(0, Math.min(1, (t - w.born) / 0.8));
      if (w.visual) { w.visual.update(t, w.phase); w.visual.root.scale.setScalar(1.4 * grow * grow * (3 - 2 * grow)); }
      else {
        w.group.rotation.y = t * 0.8 + w.phase;
        const s = 1 + Math.sin(t * 9 + w.phase) * 0.08;
        w.group.scale.set(s, s * 1.05, s);
      }
      this.atmosphere.moveAnchor(w.anchor, w.group.position);
    }
    this.flushZones();
    for (const e of this.entities.values()) e.anim?.update(t + e.group.position.x * 0.37);
    if (this.areaOutline) (this.areaOutline.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(t * 3) * 0.25;
    for (const e of this.entities.values()) {
      if (e.badge) e.badge.position.y = e.height + 0.45 + Math.sin(t * 2.5 + e.group.position.x) * 0.06;
      // l'incasso sta sopra l'eventuale targhetta di sporco/rotto e ondeggia piano
      if (e.earn) e.earn.sprite.position.y = e.height + (e.badge && !e.earn.x ? 1.05 : 0.5) + Math.sin(t * 2 + e.group.position.z) * 0.05;
    }
    if (this.selectionFrame.visible) {
      (this.selectionFrame.material as THREE.LineBasicMaterial).opacity = 0.55 + Math.sin(t * 4) * 0.4;
    }
  }

  stats() {
    return { entities: this.entities.size, wisps: this.wisps.size };
  }
}
