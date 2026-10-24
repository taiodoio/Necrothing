// Miniature 3D per le schede (Bottega, Inventario, scelta della lapide):
// un piccolo renderer dedicato disegna il modello una volta e ne conserva
// l'immagine (data URL) in cache per stile.

import * as THREE from 'three';
import { GRAVE_FOOTPRINT } from '../game/balance.ts';
import { CATALOG, PRESENCE_TYPES } from '../game/catalog.ts';
import { DEFAULT_LOOK } from '../game/look.ts';
import { animateRig, buildRig } from '../view/characters.ts';
import { attachProp, castPose, dimGhosts, presenceLayout, propPose, scenePropObject } from '../view/presences.ts';
import type { GraveType, GraveVisualState } from '../game/graves.ts';
import type { ArtStyle } from '../game/state.ts';
import { getModel, instantiate, type CachedModel } from '../render/modelCache.ts';
import { graveModel } from '../render/models/graves.ts';
import { placeableKey, placeableModel, type PVis } from '../render/models/registry.ts';
import { createAnimated } from '../render/lowpoly/animated.ts';

const SIZE = 160;
let renderer: THREE.WebGLRenderer | null = null;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const cache = new Map<string, string>();

/** Miniature salvate in un avvio precedente (si rimettono in cache al caricamento). */
export function seedThumbs(entries: Array<[string, string]>) {
  for (const [k, v] of entries) if (!cache.has(k)) cache.set(k, v);
}

/** Chi riceve ogni miniatura nuova (per salvarla sul telefono); null = nessuno. */
let sink: ((key: string, url: string) => void) | null = null;
export function onNewThumb(fn: ((key: string, url: string) => void) | null) { sink = fn; }

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
  sink?.(key, url);
  return url;
}

/** Miniatura di un modello qualsiasi (con la sua chiave di cache). */
export function modelThumb(key: string, model: CachedModel, fp: [number, number]): string {
  if (cache.has(key)) return cache.get(key)!;
  return snapshot(key, instantiate(model), fp);
}

export function placeableThumb(type: string, style: ArtStyle, variant = 0): string {
  const v: PVis = { type, variant, dirty: false, broken: false, lit: true, seed: 1 };
  const key = `${style}|${placeableKey(v)}`;
  if (cache.has(key)) return cache.get(key)!;
  const g = instantiate(getModel(placeableKey(v), style, () => placeableModel(v), 1));
  if (PRESENCE_TYPES.has(type)) addCast(g, type, style);
  // la testa dello spaventapasseri è una parte animata: in miniatura c'è lo stesso
  if (type === 'scarecrow' && style === 'lowpoly') { const anim = createAnimated(v); if (anim) { anim.update(30); g.add(anim.root); } }
  return snapshot(key, g, CATALOG[type].footprint);
}

/**
 * Le presenze si vedono anche in miniatura: chi abita l'oggetto (zombie,
 * strega, scheletri, fantasmi, gatti, la statua), fermo nella sua posa.
 * Si ritraggono come di notte, quando ci sono tutti (vampiro, gazebo).
 */
function addCast(g: THREE.Group, type: string, style: ArtStyle) {
  const { cast, props } = presenceLayout({ type, broken: false }, { night: true, tier: 'high' });
  for (const c of cast) {
    if (c.hidden) continue;
    const rig = buildRig(c.kind, style);
    animateRig(rig, castPose(c), 0.6, 0.7);
    attachProp(rig, c.prop);
    if (c.prop) propPose(rig, c.prop, 0.4);
    rig.root.position.set(c.x, c.lift ?? 0, c.z);
    rig.root.rotation.y = c.facing ?? 0;
    if (c.size) rig.root.scale.setScalar(c.size);
    dimGhosts(rig.root, c.dim);
    g.add(rig.root);
  }
  for (const sp of props) {
    const obj = scenePropObject(sp.kind, DEFAULT_LOOK);
    obj.position.set(sp.x, sp.y, sp.z);
    obj.rotation.y = sp.yaw;
    g.add(obj);
  }
}

export function graveThumb(type: GraveType, style: ArtStyle, state: GraveVisualState = 'clean', seed = 0): string {
  const key = `${style}|g:${type}:${state}:${seed}`;
  if (cache.has(key)) return cache.get(key)!;
  const g = instantiate(getModel(`g:${type}:${state}:${seed}`, style, () => graveModel(type, state, seed), seed));
  return snapshot(key, g, GRAVE_FOOTPRINT);
}
