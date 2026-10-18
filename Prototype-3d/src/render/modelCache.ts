// Cache delle geometrie per (modello, parametri, stile) e materiali condivisi.
// Più istanze dello stesso modello condividono la stessa geometria: cambiare
// stile ricostruisce solo le mesh, mai lo stato di gioco.

import * as THREE from 'three';
import type { ArtStyle } from '../game/state.ts';
import { meshLowpoly } from './lowpolyMesher.ts';
import { meshVoxels, voxelResolution, type BucketGeometries } from './voxelMesher.ts';
import { VOX, type Bucket, type LightAnchor, type Model } from './shape.ts';

/** Uniform condivise: densità dei voxel e intensità del rumore per-voxel. */
export const VOXEL_UNIFORMS = {
  uVoxRes: { value: 16 },
  uVoxNoise: { value: 0.14 },
};

/**
 * Aggiunge al materiale una variazione di luminosità per singolo voxel,
 * calcolata dalla posizione mondo (le facce fuse dal greedy meshing restano
 * "a cubetti"). In stile miniatura il rumore è spento.
 */
function voxelNoise<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uVoxRes = VOXEL_UNIFORMS.uVoxRes;
    shader.uniforms.uVoxNoise = VOXEL_UNIFORMS.uVoxNoise;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vVoxW;\nvarying vec3 vVoxN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 voxW = vec4(transformed, 1.0);
        vec3 voxN = objectNormal;
        #ifdef USE_INSTANCING
          voxW = instanceMatrix * voxW;
          voxN = mat3(instanceMatrix) * voxN;
        #endif
        vVoxW = (modelMatrix * voxW).xyz;
        vVoxN = normalize(mat3(modelMatrix) * voxN);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vVoxW;\nvarying vec3 vVoxN;\nuniform float uVoxRes;\nuniform float uVoxNoise;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 voxCell = floor(vVoxW * uVoxRes - vVoxN * 0.5 + 0.001);
        float voxH = fract(sin(dot(voxCell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        diffuseColor.rgb *= 1.0 + (voxH - 0.5) * uVoxNoise;`);
  };
  m.customProgramCacheKey = () => 'voxnoise';
  return m;
}

export type MaterialSet = Record<Bucket | 'selected' | 'invalid', THREE.Material>;

const glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const ghost = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });

/** Materiali degli stili voxel e miniatura (Lambert + rumore per voxel). */
export const MATERIALS: MaterialSet = {
  solid: voxelNoise(new THREE.MeshLambertMaterial({ vertexColors: true })),
  glow,
  water: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.82 }),
  ghost,
  gloss: voxelNoise(new THREE.MeshLambertMaterial({ vertexColors: true })),
  selected: voxelNoise(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#4a3618'), emissiveIntensity: 0.55 })),
  invalid: voxelNoise(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#7a1f1f'), emissiveIntensity: 1 })),
};

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

export function materialsFor(style: ArtStyle): MaterialSet {
  return style === 'lowpoly' ? LOWPOLY_MATERIALS : MATERIALS;
}

export interface CachedModel {
  geometries: BucketGeometries;
  lights: LightAnchor[];
  /** Altezza massima (unità mondo), utile per hitbox ed etichette. */
  height: number;
  /** Materiali dello stile con cui è stato generato. */
  mats: MaterialSet;
  /** Generato da un generatore low-poly dedicato (non dal fallback). */
  dedicated?: boolean;
}

/**
 * Adapter dello stile low-poly: data la chiave di un modello esistente
 * (tomba, oggetto, scenografia, parte di personaggio) restituisce il suo
 * generatore dedicato, se è già stato migrato. Registrato da render/lowpoly.
 */
export type LowpolyResolver = (key: string) => (() => { geometries: BucketGeometries; lights: LightAnchor[] }) | null;
let lowpolyResolver: LowpolyResolver = () => null;
export function setLowpolyResolver(r: LowpolyResolver) { lowpolyResolver = r; }

const cache = new Map<string, CachedModel>();

/** Allinea rumore e densità voxel allo stile attivo. */
export function applyStyleUniforms(style: ArtStyle, voxPerUnit: number) {
  VOXEL_UNIFORMS.uVoxRes.value = voxPerUnit;
  VOXEL_UNIFORMS.uVoxNoise.value = style === 'voxel' ? 0.14 : 0;
}

/**
 * Geometria condivisa di un modello. `res` forza la risoluzione voxel (per i
 * LOD: alberi lontani, sottobosco); senza, vale quella della qualità attiva.
 */
export function getModel(key: string, style: ArtStyle, build: () => Model, seed = 0, grounded = true, res?: number): CachedModel {
  const full = `${style}|${res ?? '*'}|${key}`;
  let hit = cache.get(full);
  if (!hit) {
    let geometries: BucketGeometries;
    let lights: LightAnchor[];
    let dedicated = false;
    const lp = style === 'lowpoly' ? lowpolyResolver(key) : null;
    if (lp) {
      ({ geometries, lights } = lp());
      dedicated = true;
    } else {
      const model = build();
      geometries = style === 'voxel' ? meshVoxels(model, seed, grounded, res ?? voxelResolution()) : meshLowpoly(model, seed);
      lights = model.lights;
    }
    let height = 0.2;
    for (const g of Object.values(geometries)) {
      if (!g) continue;
      if (!g.boundingBox) g.computeBoundingBox();
      height = Math.max(height, g.boundingBox!.max.y);
    }
    hit = { geometries, lights, height, mats: materialsFor(style), dedicated };
    cache.set(full, hit);
  }
  return hit;
}

/** Crea un Group con una mesh per bucket (materiali condivisi). */
export function instantiate(model: CachedModel, opts: { castShadow?: boolean; receiveShadow?: boolean } = {}): THREE.Group {
  const group = new THREE.Group();
  for (const [bucket, geo] of Object.entries(model.geometries) as [Bucket, THREE.BufferGeometry][]) {
    const mesh = new THREE.Mesh(geo, model.mats[bucket]);
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

/** Svuota tutta la cache (cambio di risoluzione voxel). */
export function clearAll() {
  for (const m of cache.values()) for (const g of Object.values(m.geometries)) g?.dispose();
  cache.clear();
}

/** Svuota la cache di uno stile (libera GPU quando si cambia resa). */
export function clearStyle(style: ArtStyle) {
  for (const [key, m] of cache) {
    if (!key.startsWith(style + '|')) continue;
    for (const g of Object.values(m.geometries)) g?.dispose();
    cache.delete(key);
  }
}
