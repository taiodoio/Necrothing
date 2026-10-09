import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { meshVoxels } from '../src/render/voxelMesher.ts';
import { meshLowpoly } from '../src/render/lowpolyMesher.ts';
import { graveModel } from '../src/render/models/graves.ts';
import { placeableModel, placeableKey } from '../src/render/models/registry.ts';
import { ModelBuilder } from '../src/render/shape.ts';
import { CATALOG_LIST } from '../src/game/catalog.ts';
import { GRAVE_TYPES } from '../src/game/graves.ts';
import { CameraRig } from '../src/view/CameraRig.ts';
import { createNewGame } from '../src/game/state.ts';

const vis = (type, over = {}) => ({ type, variant: 0, dirty: false, broken: false, lit: true, seed: 1, ...over });
const bounds = (g) => { g.computeBoundingBox(); return g.boundingBox; };

test('generazione voxel deterministica: stesso seme → stessa geometria', () => {
  const a = meshVoxels(graveModel('gothic', 'dirty', 3), 3).solid;
  const b = meshVoxels(graveModel('gothic', 'dirty', 3), 3).solid;
  assert.deepEqual(Array.from(a.getAttribute('position').array), Array.from(b.getAttribute('position').array));
  assert.deepEqual(Array.from(a.getAttribute('color').array), Array.from(b.getAttribute('color').array));
  const c = meshVoxels(graveModel('gothic', 'dirty', 2), 2).solid;
  assert.notDeepEqual(Array.from(a.getAttribute('position').array), Array.from(c.getAttribute('position').array));
});

test('voxel e miniatura condividono dimensioni e pivot', () => {
  const models = [graveModel('rectangular', 'clean', 0), placeableModel(vis('lamp_post')), placeableModel(vis('gravedigger_house')), placeableModel(vis('mausoleum'))];
  for (const m of models) {
    const v = bounds(meshVoxels(m).solid), l = bounds(meshLowpoly(m).solid);
    for (const axis of ['x', 'y', 'z']) {
      assert.ok(Math.abs(v.max[axis] - l.max[axis]) < 0.35, `max ${axis}: ${v.max[axis]} vs ${l.max[axis]}`);
      assert.ok(Math.abs(v.min[axis] - l.min[axis]) < 0.35, `min ${axis}: ${v.min[axis]} vs ${l.min[axis]}`);
    }
    // pivot al centro dell'ingombro, a terra
    assert.ok(Math.abs((v.min.x + v.max.x) / 2) < 0.6);
    assert.ok(v.min.y > -0.2);
  }
});

test('tutte le lapidi in tutti gli stati generano geometria in entrambi gli stili', () => {
  for (const t of GRAVE_TYPES) for (const s of ['clean', 'flowers', 'dirty', 'broken']) {
    const m = graveModel(t, s, 1);
    assert.ok(meshVoxels(m).solid.getAttribute('position').count > 100, `${t}/${s}`);
    assert.ok(meshLowpoly(m).solid.getAttribute('position').count > 50, `${t}/${s}`);
    const v = bounds(meshVoxels(m).solid);
    assert.ok(v.max.x - v.min.x <= 2.2 && v.max.z - v.min.z <= 2.2, `${t} entra nel 2×2`);
  }
});

test('ogni voce del catalogo ha un modello (anche sporco/rotto/spento) e resta nel suo ingombro', () => {
  for (const d of CATALOG_LIST) {
    for (const st of [{}, { dirty: true }, { dirty: true, broken: true, lit: false }]) {
      const m = placeableModel(vis(d.id, st));
      const g = meshVoxels(m).solid;
      assert.ok(g && g.getAttribute('position').count > 0, d.id);
      const b = bounds(g);
      assert.ok(b.max.x - b.min.x <= d.footprint[0] + 0.9, `${d.id} larghezza ${b.max.x - b.min.x}`);
      assert.ok(b.max.z - b.min.z <= d.footprint[1] + 0.9, `${d.id} profondità ${b.max.z - b.min.z}`);
    }
  }
  assert.notEqual(placeableKey(vis('lamp_post')), placeableKey(vis('lamp_post', { lit: false })));
});

test('le luci spente non emettono e quelle accese hanno un punto luce', () => {
  const on = placeableModel(vis('lamp_post'));
  const off = placeableModel(vis('lamp_post', { lit: false }));
  assert.ok(on.lights.length > 0);
  assert.equal(off.lights.length, 0);
  assert.ok(meshVoxels(on).glow);
  assert.equal(meshVoxels(off).glow, undefined);
});

test('rasterizzazione conservativa: un box sottile non sparisce', () => {
  const b = new ModelBuilder('thin');
  b.box(-0.3, 0, -0.3, 0.3, 5, 0.3, '#ffffff');
  const g = meshVoxels(b.build()).solid;
  assert.ok(g.getAttribute('position').count > 0);
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

test('cambiare stile non tocca lo stato di gioco', () => {
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 5);
  const before = JSON.stringify({ g: s.graves, p: s.placeables, w: s.world, pl: s.player });
  s.settings.style = 'miniature';
  s.settings.camera = 'top';
  assert.equal(JSON.stringify({ g: s.graves, p: s.placeables, w: s.world, pl: s.player }), before);
});
