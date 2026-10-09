// Miniature 3D per le schede (Bottega, Inventario, scelta della lapide):
// un piccolo renderer dedicato disegna il modello una volta e ne conserva
// l'immagine (data URL) in cache per stile.

import * as THREE from 'three';
import { GRAVE_FOOTPRINT } from '../game/balance.ts';
import { CATALOG } from '../game/catalog.ts';
import type { GraveType, GraveVisualState } from '../game/graves.ts';
import type { ArtStyle } from '../game/state.ts';
import { getModel, instantiate } from '../render/modelCache.ts';
import { graveModel } from '../render/models/graves.ts';
import { placeableKey, placeableModel, type PVis } from '../render/models/registry.ts';

const SIZE = 160;
let renderer: THREE.WebGLRenderer | null = null;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const cache = new Map<string, string>();

function setup() {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.HemisphereLight('#e7e3d6', '#3a3a32', 2.2));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
  sun.position.set(-4, 8, 6);
  scene.add(sun);
  return renderer;
}

function snapshot(key: string, group: THREE.Group, fp: [number, number]): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const r = setup();
  scene.add(group);
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const extent = Math.max(size.x, size.z, size.y * 0.9, Math.max(...fp) * 0.6) * 0.62 + 0.15;
  camera.left = -extent; camera.right = extent; camera.top = extent; camera.bottom = -extent;
  camera.updateProjectionMatrix();
  camera.position.set(center.x + 20, center.y + 18, center.z + 28);
  camera.lookAt(center);
  r.render(scene, camera);
  const url = r.domElement.toDataURL('image/png');
  scene.remove(group);
  cache.set(key, url);
  return url;
}

export function placeableThumb(type: string, style: ArtStyle, variant = 0): string {
  const v: PVis = { type, variant, dirty: false, broken: false, lit: true, seed: 1 };
  const key = `${style}|${placeableKey(v)}`;
  if (cache.has(key)) return cache.get(key)!;
  const g = instantiate(getModel(placeableKey(v), style, () => placeableModel(v), 1));
  return snapshot(key, g, CATALOG[type].footprint);
}

export function graveThumb(type: GraveType, style: ArtStyle, state: GraveVisualState = 'clean', seed = 0): string {
  const key = `${style}|g:${type}:${state}:${seed}`;
  if (cache.has(key)) return cache.get(key)!;
  const g = instantiate(getModel(`g:${type}:${state}:${seed}`, style, () => graveModel(type, state, seed), seed));
  return snapshot(key, g, GRAVE_FOOTPRINT);
}
