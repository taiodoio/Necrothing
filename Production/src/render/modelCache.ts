// Cache delle geometrie dei modelli (per chiave) e materiali condivisi. Più
// istanze dello stesso modello condividono la stessa geometria.

import * as THREE from 'three';
import { VOX, type Bucket, type BucketGeometries, type LightAnchor } from './types.ts';

export type MaterialSet = Record<Bucket | 'selected' | 'invalid', THREE.Material>;

const glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const ghost = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });

/**
 * Materiali "Stylized Gothic Low-Poly": PBR opaco (roughness alta, niente
 * metallo) con flat shading, così ogni faccia legge la luce in modo netto.
 * glow e ghost sono condivisi (l'Atmosfera ne regola l'intensità per fase).
 */
export const LOWPOLY_MATERIALS: MaterialSet = {
  solid: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }),
  glow,
  water: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.86 }),
  ghost,
  /** Occhi dei personaggi: lucidi, con il riflesso della luce. */
  gloss: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.18, metalness: 0.05 }),
  selected: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0, emissive: new THREE.Color('#5a4120'), emissiveIntensity: 0.45 }),
  invalid: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0, emissive: new THREE.Color('#7a1f1f'), emissiveIntensity: 0.9 }),
};

/** Terreno low-poly: shading morbido (normali per vertice), così il suolo resta calmo. */
export const LOWPOLY_TERRAIN = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.95, metalness: 0 });

/**
 * Materiali leggeri (telefoni deboli): Lambert al posto del PBR, stesso
 * aspetto piatto (flat shading, colori per vertice) con un calcolo della luce
 * molto più semplice per pixel. `setLiteMaterials` li scambia nelle mesh già
 * in scena e in LOWPOLY_MATERIALS (così anche le nuove li usano).
 */
type LiteKey = 'solid' | 'water' | 'gloss' | 'selected' | 'invalid';
const FULL_MATS: Record<LiteKey, THREE.Material> = { solid: LOWPOLY_MATERIALS.solid, water: LOWPOLY_MATERIALS.water, gloss: LOWPOLY_MATERIALS.gloss, selected: LOWPOLY_MATERIALS.selected, invalid: LOWPOLY_MATERIALS.invalid };
let liteMats: (Record<LiteKey, THREE.Material> & { terrain: THREE.Material }) | null = null;
let liteOn = false;
export const liteMaterialsOn = () => liteOn;

export function setLiteMaterials(on: boolean, root?: THREE.Object3D) {
  liteMats ??= {
    solid: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    water: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.86 }),
    gloss: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    selected: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: new THREE.Color('#5a4120'), emissiveIntensity: 0.45 }),
    invalid: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: new THREE.Color('#7a1f1f'), emissiveIntensity: 0.9 }),
    terrain: new THREE.MeshLambertMaterial({ vertexColors: true }),
  };
  liteOn = on;
  const swap = new Map<THREE.Material, THREE.Material>([[on ? LOWPOLY_TERRAIN : liteMats.terrain, on ? liteMats.terrain : LOWPOLY_TERRAIN]]);
  for (const k of Object.keys(FULL_MATS) as LiteKey[]) {
    const [from, to] = on ? [FULL_MATS[k], liteMats[k]] : [liteMats[k], FULL_MATS[k]];
    swap.set(from, to);
    (LOWPOLY_MATERIALS as unknown as Record<LiteKey, THREE.Material>)[k] = to;
  }
  root?.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (Array.isArray(m.material)) m.material = m.material.map((x) => swap.get(x) ?? x);
    else m.material = swap.get(m.material) ?? m.material;
  });
}

export interface CachedModel {
  geometries: BucketGeometries;
  lights: LightAnchor[];
  /** Altezza massima (unità mondo), utile per hitbox ed etichette. */
  height: number;
}

/**
 * Adapter dei modelli: data la chiave (tomba, oggetto, scenografia, parte di
 * personaggio) restituisce il suo generatore. Registrato da render/lowpoly.
 */
export type ModelResolver = (key: string) => (() => { geometries: BucketGeometries; lights: LightAnchor[] }) | null;
let resolver: ModelResolver = () => null;
export function setModelResolver(r: ModelResolver) { resolver = r; }

const cache = new Map<string, CachedModel>();

/** Geometria condivisa di un modello. Una chiave senza generatore è un errore di programmazione. */
export function getModel(key: string): CachedModel {
  let hit = cache.get(key);
  if (!hit) {
    const gen = resolver(key);
    if (!gen) throw new Error(`Nessun modello per ${key}`); // i18n-ok: errore interno
    const { geometries, lights } = gen();
    let height = 0.2;
    for (const g of Object.values(geometries)) {
      if (!g) continue;
      if (!g.boundingBox) g.computeBoundingBox();
      height = Math.max(height, g.boundingBox!.max.y);
    }
    hit = { geometries, lights, height };
    cache.set(key, hit);
  }
  return hit;
}

/** Crea un Group con una mesh per bucket (materiali condivisi). */
export function instantiate(model: CachedModel, opts: { castShadow?: boolean; receiveShadow?: boolean } = {}): THREE.Group {
  const group = new THREE.Group();
  for (const [bucket, geo] of Object.entries(model.geometries) as [Bucket, THREE.BufferGeometry][]) {
    const mesh = new THREE.Mesh(geo, LOWPOLY_MATERIALS[bucket]);
    mesh.name = bucket;
    mesh.castShadow = bucket === 'solid' && (opts.castShadow ?? true);
    mesh.receiveShadow = bucket === 'solid' && (opts.receiveShadow ?? true);
    if (bucket === 'ghost') mesh.renderOrder = 2;
    group.add(mesh);
  }
  return group;
}

export function lightWorldPos(anchor: LightAnchor, target = new THREE.Vector3()): THREE.Vector3 {
  return target.set(anchor.pos[0] * VOX, anchor.pos[1] * VOX, anchor.pos[2] * VOX);
}

export function cacheStats() {
  let triangles = 0;
  for (const m of cache.values()) for (const g of Object.values(m.geometries)) {
    if (!g) continue;
    triangles += g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
  }
  return { models: cache.size, triangles };
}

/** Svuota tutta la cache (le geometrie si liberano dalla GPU). */
export function clearAll() {
  for (const m of cache.values()) for (const g of Object.values(m.geometries)) g?.dispose();
  cache.clear();
}
