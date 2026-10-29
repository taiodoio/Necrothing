import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { resolveLowpoly } from '../src/render/lowpoly/index.ts';
import { placeableKey } from '../src/render/keys.ts';
import { CATALOG_LIST } from '../src/game/catalog.ts';
import { GRAVE_TYPES } from '../src/game/graves.ts';
import { CameraRig } from '../src/view/CameraRig.ts';

const vis = (type, over = {}) => ({ type, variant: 0, dirty: false, broken: false, lit: true, seed: 1, ...over });
const bounds = (g) => { g.computeBoundingBox(); return g.boundingBox; };
const build = (key) => { const gen = resolveLowpoly(key); assert.ok(gen, `nessun generatore per ${key}`); return gen(); };

test('generazione deterministica: stesso seme → stessa geometria, semi diversi → forme diverse', () => {
  const a = build('g:gothic:dirty:3').geometries.solid;
  const b = build('g:gothic:dirty:3').geometries.solid;
  assert.deepEqual(Array.from(a.getAttribute('position').array), Array.from(b.getAttribute('position').array));
  assert.deepEqual(Array.from(a.getAttribute('color').array), Array.from(b.getAttribute('color').array));
  const c = build('g:gothic:dirty:2').geometries.solid;
  assert.notDeepEqual(Array.from(a.getAttribute('position').array), Array.from(c.getAttribute('position').array));
});

test('tutte le lapidi in tutti gli stati generano geometria e stanno nel 2×2', () => {
  for (const t of GRAVE_TYPES) for (const s of ['clean', 'flowers', 'dirty', 'broken']) {
    const g = build(`g:${t}:${s}:1`).geometries.solid;
    assert.ok(g.getAttribute('position').count > 50, `${t}/${s}`);
    const v = bounds(g);
    assert.ok(v.max.x - v.min.x <= 2.2 && v.max.z - v.min.z <= 2.2, `${t}/${s} entra nel 2×2`);
  }
});

test('ogni voce del catalogo ha un modello (anche sporco/rotto/spento) e resta nel suo ingombro', () => {
  for (const d of CATALOG_LIST) {
    for (const st of [{}, { dirty: true }, { dirty: true, broken: true, lit: false }]) {
      const g = build(placeableKey(vis(d.id, st))).geometries.solid;
      assert.ok(g && g.getAttribute('position').count > 0, d.id);
      const b = bounds(g);
      assert.ok(b.max.x - b.min.x <= d.footprint[0] + 0.9, `${d.id} larghezza ${b.max.x - b.min.x}`);
      assert.ok(b.max.z - b.min.z <= d.footprint[1] + 0.9, `${d.id} profondità ${b.max.z - b.min.z}`);
    }
  }
  assert.notEqual(placeableKey(vis('lamp_post')), placeableKey(vis('lamp_post', { lit: false })));
});

test('le luci spente non emettono e quelle accese hanno un punto luce', () => {
  const on = build(placeableKey(vis('lamp_post')));
  const off = build(placeableKey(vis('lamp_post', { lit: false })));
  assert.ok(on.lights.length > 0);
  assert.equal(off.lights.length, 0);
  assert.ok(on.geometries.glow);
  assert.equal(off.geometries.glow, undefined);
});

test('camera: la vista dall’alto è perpendicolare, quella obliqua a ~40°', () => {
  const rig = new CameraRig();
  rig.resize(390, 844);
  rig.setMode('top');
  rig.snap();
  for (let i = 0; i < 5; i++) rig.update(0.05);
  const dir = rig.camera.getWorldDirection(new THREE.Vector3());
  assert.ok(dir.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-6, `top: ${dir.toArray()}`);
  assert.ok(rig.camera.isOrthographicCamera);
  rig.setMode('angled');
  rig.snap();
  rig.update(0.05);
  const d2 = rig.camera.getWorldDirection(new THREE.Vector3());
  const elev = THREE.MathUtils.radToDeg(Math.asin(-d2.y));
  assert.ok(Math.abs(elev - 40) < 1, `elevazione ${elev}`);
});

