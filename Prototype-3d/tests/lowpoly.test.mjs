import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { resolveLowpoly, LP_PLACEABLES, LP_CHARACTERS, LP_SCENERY } from '../src/render/lowpoly/index.ts';
import { getModel, LOWPOLY_MATERIALS, MATERIALS } from '../src/render/modelCache.ts';
import { placeableKey, placeableModel } from '../src/render/models/registry.ts';
import { graveModel } from '../src/render/models/graves.ts';
import { CATALOG } from '../src/game/catalog.ts';
import { GRAVE_TYPES } from '../src/game/graves.ts';
import { createNewGame } from '../src/game/state.ts';
import { areaForLevel, buildOccupancy } from '../src/game/world.ts';
import { cellHeight, cornerHeight, naturalHeight, surfaceHeight } from '../src/view/terrain.ts';
import { CameraRig } from '../src/view/CameraRig.ts';
import { FireFlicker } from '../src/view/FireFlicker.ts';

const STATES = ['clean', 'flowers', 'dirty', 'broken'];
const vis = (type, over = {}) => ({ type, variant: 0, dirty: false, broken: false, lit: true, seed: 1, ...over });
const box = (g) => { g.computeBoundingBox(); return g.boundingBox; };
const solid = (m) => m.geometries.solid;

test('adapter: ogni tipo di lapide in ogni stato ha un generatore low-poly dedicato', () => {
  for (const t of GRAVE_TYPES) for (const s of STATES) {
    for (const key of [`g:${t}:${s}:2`, `grave:${t}:${s}:2`]) {
      const gen = resolveLowpoly(key);
      assert.ok(gen, key);
      const m = gen();
      assert.ok(solid(m).getAttribute('position').count > 300, `${key} ha geometria`);
      const b = box(solid(m));
      assert.ok(b.max.x - b.min.x <= 2.05 && b.max.z - b.min.z <= 2.05, `${key} entra nel 2×2 (${(b.max.x - b.min.x).toFixed(2)}×${(b.max.z - b.min.z).toFixed(2)})`);
      assert.ok(b.min.y > -0.25, `${key} poggia a terra (affonda al massimo di poco se rotta e inclinata)`);
    }
  }
});

test('generazione deterministica: stesso seme → stessa geometria, semi diversi → varianti', () => {
  const pos = (k) => Array.from(solid(resolveLowpoly(k)()).getAttribute('position').array);
  assert.deepEqual(pos('g:gothic:dirty:3'), pos('g:gothic:dirty:3'));
  for (const t of ['rectangular', 'stone_simple', 'gothic', 'celtic_cross', 'decorated_monument']) {
    const variants = new Set([0, 1, 2].map((s) => pos(`g:${t}:clean:${s}`).length + ':' + pos(`g:${t}:clean:${s}`).slice(0, 30).join(',')));
    assert.equal(variants.size, 3, `${t}: almeno 3 varianti`);
  }
});

test('lo stato della tomba cambia la geometria: fiori e candele accese, sporcizia, rottura', () => {
  const m = (s) => resolveLowpoly(`g:rectangular:${s}:1`)();
  const clean = m('clean'), flowers = m('flowers'), dirty = m('dirty'), broken = m('broken');
  assert.ok(flowers.geometries.glow, 'candela/lumino accesi con i fiori');
  assert.ok(flowers.lights.length > 0, 'luce della candela');
  const n = (x) => solid(x).getAttribute('position').count;
  assert.notEqual(n(clean), n(dirty));
  assert.ok(n(dirty) > n(clean), 'erbacce e foglie in più');
  assert.notEqual(n(dirty), n(broken));
});

test('catalogo completo: ogni oggetto ha un generatore low-poly dedicato', () => {
  const missing = Object.keys(CATALOG).filter((id) => !LP_PLACEABLES[id]);
  assert.deepEqual(missing, []);
});

test('animali low-poly: tutte le parti del rig', () => {
  for (const kind of ['cat', 'rat', 'petDog', 'petCat', 'petRabbit']) for (const p of ['body', 'head', 'legL', 'legR', 'armL', 'armR']) assert.ok(LP_CHARACTERS[`${kind}:${p}`], `${kind}:${p}`);
  for (const kind of ['crow', 'petCrow']) for (const p of ['body', 'head', 'armL', 'armR', 'legL', 'legR']) assert.ok(LP_CHARACTERS[`${kind}:${p}`], `${kind}:${p}`);
  for (const p of ['body', 'head', 'legL', 'legR']) assert.ok(LP_CHARACTERS[`petDuck:${p}`]);
});

test('oggetti migrati: stanno nel loro ingombro, anche sporchi o rotti', () => {
  for (const id of Object.keys(LP_PLACEABLES)) {
    const fp = CATALOG[id].footprint;
    for (const st of [{}, { dirty: true }, { dirty: true, broken: true, lit: false }]) {
      const m = LP_PLACEABLES[id](vis(id, st));
      const b = box(solid(m));
      assert.ok(b.max.x - b.min.x <= fp[0] + 0.6, `${id} larghezza ${(b.max.x - b.min.x).toFixed(2)} > ${fp[0]}`);
      assert.ok(b.max.z - b.min.z <= fp[1] + 0.6, `${id} profondità ${(b.max.z - b.min.z).toFixed(2)} > ${fp[1]}`);
    }
  }
});

test('lampione: acceso emette (vetro e luce), spento no', () => {
  const on = resolveLowpoly(placeableKey(vis('lamp_post')))();
  const off = resolveLowpoly(placeableKey(vis('lamp_post', { lit: false })))();
  assert.ok(on.geometries.glow && on.lights.length > 0);
  assert.equal(off.geometries.glow, undefined);
  assert.equal(off.lights.length, 0);
});

test('cache: stile low-poly usa i generatori dedicati e i materiali PBR; il resto ricade sul mesher miniatura', () => {
  const v = vis('lamp_post');
  const lp = getModel(placeableKey(v), 'lowpoly', () => placeableModel(v), 1);
  assert.equal(lp.dedicated, true);
  assert.equal(lp.mats, LOWPOLY_MATERIALS);
  assert.ok(LOWPOLY_MATERIALS.solid.flatShading);
  const fb = getModel('test:fallback', 'lowpoly', () => graveModel('gothic', 'clean', 0), 1);
  assert.equal(fb.dedicated, false, 'chiave senza generatore → fallback miniatura');
  assert.ok(fb.geometries.solid);
  const vx = getModel('g:gothic:clean:0', 'voxel', () => graveModel('gothic', 'clean', 0), 0);
  assert.equal(vx.mats, MATERIALS);
  assert.ok(lp.mats.glow === MATERIALS.glow, 'glow condiviso (intensità per fase del giorno)');
});

test('personaggi low-poly: stesse parti del rig per Custode, scheletro e fantasma', () => {
  for (const [kind, parts] of [['custode', ['body', 'head', 'armL', 'armR', 'legL', 'legR']], ['skeleton', ['body', 'head', 'armL', 'armR', 'legL', 'legR']], ['ghost', ['body', 'armL', 'armR']]]) {
    for (const p of parts) {
      const gen = LP_CHARACTERS[`${kind}:${p}`];
      assert.ok(gen, `${kind}:${p}`);
      const m = gen();
      assert.ok(Object.values(m.geometries).some((g) => g && g.getAttribute('position').count > 20), `${kind}:${p} ha geometria`);
    }
  }
  assert.ok(LP_CHARACTERS['ghost:body']().geometries.ghost, 'il fantasma è semitrasparente');
  assert.ok(resolveLowpoly('char:custode:armL')().geometries.glow, 'la lanterna del Custode brilla');
});

test('scenografia: recinto, cancello e vegetazione hanno generatori', () => {
  for (const k of ['fseg:1', 'fpil:2', 'gate:lit', 'wpine:1', 'wdead:2', 'tuft:3', 'fern:1', 'flowers:2']) {
    const gen = resolveLowpoly(k);
    assert.ok(gen, k);
    assert.ok(gen().geometries.solid, k);
  }
  assert.ok(LP_SCENERY.gate('lit').lights.length >= 2);
});

test('terreno: colline nel recinto, pad piani sotto le tombe, superficie continua', () => {
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  const area = areaForLevel(0);
  const input = { seed: 717, area, overrides: new Map(), pads: new Map() };
  let max = 0;
  for (let y = area.y; y < area.y + area.h; y++) for (let x = area.x; x < area.x + area.w; x++) max = Math.max(max, naturalHeight(input, x, y));
  assert.ok(max > 0.4, `ci sono collinette (max ${max})`);
  assert.equal(naturalHeight(input, area.x, area.y + 10), 0, 'piatto lungo il recinto');
  // pad: tutte le celle di una tomba alla stessa quota
  const g = s.graves[0];
  const h = naturalHeight(input, g.x, g.y);
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) input.pads.set(`${g.x + dx},${g.y + dy}`, h);
  for (const [dx, dy] of [[0, 0], [1, 1]]) assert.equal(cellHeight(input, g.x + dx, g.y + dy), h);
  assert.equal(cornerHeight(input, g.x + 1, g.y + 1), h, 'centro della tomba piano');
  // la superficie low-poly è continua attraverso i bordi delle celle
  const half = 32;
  for (let i = 0; i < 40; i++) {
    const x = area.x + 3 + i * 0.7, z = area.y + 9.999;
    const a = surfaceHeight(input, 'lowpoly', x - half, z - half), b = surfaceHeight(input, 'lowpoly', x - half, z - half + 0.002);
    assert.ok(Math.abs(a - b) < 0.02, `discontinuità ${a} → ${b}`);
  }
  assert.ok(buildOccupancy(s).owner.size > 0);
});

test('camera: lo zoom massimo inquadra il recinto con una fascia sottile di bosco', () => {
  const rig = new CameraRig();
  rig.resize(1280, 800);
  rig.setWorld(44, 20, 24);
  rig.setView(500);
  assert.ok(rig.maxView < 30, `maxView ${rig.maxView}`);
  rig.jumpTo(new THREE.Vector3(100, 0, 100));
  assert.ok(Math.abs(rig.target.x) <= 20 && Math.abs(rig.target.z) <= 20, 'pan limitato al recinto + margine');
});

test('FireFlicker: deterministico per seme e indipendente tra sorgenti', () => {
  const a = new FireFlicker(11, 0.3), b = new FireFlicker(11, 0.3), c = new FireFlicker(12, 0.3);
  const ts = [0, 0.3, 1.7, 5.2];
  assert.deepEqual(ts.map((t) => a.value(t)), ts.map((t) => b.value(t)));
  assert.notDeepEqual(ts.map((t) => a.value(t)), ts.map((t) => c.value(t)));
  for (const t of ts) assert.ok(a.value(t) > 0.5 && a.value(t) < 1.5);
  assert.equal(new FireFlicker(5, 0).value(3), 1);
});
