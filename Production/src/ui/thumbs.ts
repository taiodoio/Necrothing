// Miniature 3D per le schede (Bottega, Inventario, scelta della lapide):
// un piccolo renderer dedicato disegna il modello una volta e ne conserva
// l'immagine (data URL) in cache per stile.

import * as THREE from 'three';
import { GRAVE_FOOTPRINT } from '../game/balance.ts';
import { placeableKey } from '../render/keys.ts';
import type { PVis } from '../render/types.ts';
import { CATALOG, PRESENCE_TYPES } from '../game/catalog.ts';
import { DEFAULT_LOOK } from '../game/look.ts';
import { animateRig, buildRig } from '../view/characters.ts';
import { attachProp, castPose, dimGhosts, presenceLayout, propPose, scenePropObject } from '../view/presences.ts';
import type { GraveType, GraveVisualState } from '../game/graves.ts';
import { getModel, instantiate, type CachedModel } from '../render/modelCache.ts';
import { createAnimated } from '../render/lowpoly/animated.ts';
import { alive, drewSomething } from './offscreen.ts';

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

scene.add(new THREE.HemisphereLight('#e7e3d6', '#3a3a32', 2.2));
const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
sun.position.set(-4, 8, 6);
scene.add(sun);

/** Il renderer delle miniature; se il suo contesto è andato perso se ne fa uno nuovo. */
function setup(fresh = false, size = SIZE) {
  if (!fresh && alive(renderer)) { renderer.setSize(size, size, false); return renderer; }
  renderer?.dispose();
  renderer = null;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function snapshot(key: string, group: THREE.Group, fp: [number, number], px = SIZE): string {
  const hit = cache.get(key);
  if (hit) return hit;
  let r = setup(false, px);
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
  // vuota (contesto perso): si riprova con un renderer nuovo, e se resta vuota non si tiene
  if (!drewSomething(r)) { r = setup(true, px); r.render(scene, camera); }
  const ok = drewSomething(r);
  const url = r.domElement.toDataURL('image/png');
  scene.remove(group);
  if (!ok) return url;
  cache.set(key, url);
  sink?.(key, url);
  return url;
}

/** Miniatura di un modello qualsiasi (con la sua chiave di cache). */
export function modelThumb(key: string, model: CachedModel, fp: [number, number]): string {
  if (cache.has(key)) return cache.get(key)!;
  return snapshot(key, instantiate(model), fp);
}

export function placeableThumb(type: string, variant = 0): string {
  const v: PVis = { type, variant, dirty: false, broken: false, lit: true, seed: 1 };
  const key = placeableKey(v);
  if (cache.has(key)) return cache.get(key)!;
  const g = instantiate(getModel(placeableKey(v)));
  addPresences(g, v);
  return snapshot(key, g, CATALOG[type].footprint);
}

/** Chi abita l'oggetto, fermo nella sua posa (anche nelle anteprime già pronte, render/bake). */
export function addPresences(g: THREE.Object3D, v: PVis) {
  if (PRESENCE_TYPES.has(v.type)) addCast(g, v.type);
  // la testa dello spaventapasseri è una parte animata: in miniatura c'è lo stesso
  if (v.type === 'scarecrow') { const anim = createAnimated(v); if (anim) { anim.update(30); g.add(anim.root); } }
}

/**
 * Le presenze si vedono anche in miniatura: chi abita l'oggetto (zombie,
 * strega, scheletri, fantasmi, gatti, la statua), fermo nella sua posa.
 * Si ritraggono come di notte, quando ci sono tutti (vampiro, gazebo).
 */
function addCast(g: THREE.Object3D, type: string) {
  const { cast, props } = presenceLayout({ type, broken: false }, { night: true, tier: 'high' });
  for (const c of cast) {
    if (c.hidden) continue;
    const rig = buildRig(c.kind);
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

/** Miniatura di una lapide; `size` più grande per le schede dove si vede in grande (es. 480). */
export function graveThumb(type: GraveType, state: GraveVisualState = 'clean', seed = 0, size = SIZE): string {
  const key = `g:${type}:${state}:${seed}${size === SIZE ? '' : `@${size}`}`;
  if (cache.has(key)) return cache.get(key)!;
  const g = instantiate(getModel(`g:${type}:${state}:${seed}`));
  return snapshot(key, g, GRAVE_FOOTPRINT, size);
}
