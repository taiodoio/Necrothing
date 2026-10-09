// Cache delle geometrie per (modello, parametri, stile) e materiali condivisi.
// Più istanze dello stesso modello condividono la stessa geometria: cambiare
// stile ricostruisce solo le mesh, mai lo stato di gioco.

import * as THREE from 'three';
import type { ArtStyle } from '../game/state.ts';
import { meshLowpoly } from './lowpolyMesher.ts';
import { meshVoxels, type BucketGeometries } from './voxelMesher.ts';
import { VOX, type Bucket, type LightAnchor, type Model } from './shape.ts';

export const MATERIALS = {
  solid: new THREE.MeshLambertMaterial({ vertexColors: true }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  water: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.82 }),
  ghost: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
  selected: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#4a3618'), emissiveIntensity: 0.55 }),
  invalid: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#7a1f1f'), emissiveIntensity: 1 }),
} as const;

export interface CachedModel {
  geometries: BucketGeometries;
  lights: LightAnchor[];
  /** Altezza massima (unità mondo), utile per hitbox ed etichette. */
  height: number;
}

const cache = new Map<string, CachedModel>();

export function getModel(key: string, style: ArtStyle, build: () => Model, seed = 0, grounded = true): CachedModel {
  const full = `${style}|${key}`;
  let hit = cache.get(full);
  if (!hit) {
    const model = build();
    const geometries = style === 'voxel' ? meshVoxels(model, seed, grounded) : meshLowpoly(model, seed);
    let height = 0.2;
    for (const g of Object.values(geometries)) if (g?.boundingBox) height = Math.max(height, g.boundingBox.max.y);
    hit = { geometries, lights: model.lights, height };
    cache.set(full, hit);
  }
  return hit;
}

/** Crea un Group con una mesh per bucket (materiali condivisi). */
export function instantiate(model: CachedModel, opts: { castShadow?: boolean; receiveShadow?: boolean } = {}): THREE.Group {
  const group = new THREE.Group();
  for (const [bucket, geo] of Object.entries(model.geometries) as [Bucket, THREE.BufferGeometry][]) {
    const mesh = new THREE.Mesh(geo, MATERIALS[bucket]);
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

/** Svuota la cache di uno stile (libera GPU quando si cambia resa). */
export function clearStyle(style: ArtStyle) {
  for (const [key, m] of cache) {
    if (!key.startsWith(style + '|')) continue;
    for (const g of Object.values(m.geometries)) g?.dispose();
    cache.delete(key);
  }
}
