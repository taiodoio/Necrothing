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

test('personaggi v2: ogni parte ha geometria e gli arti partono dentro il busto', async () => {
  const { V2_SPECS, v2Generators } = await import('../src/render/lowpoly/v2/npc.ts');
  const gens = v2Generators();
  const buildKawaiiPart = (kind, part) => gens[`${kind}:${part}`]();
  for (const [kind, spec] of Object.entries(V2_SPECS)) {
    for (const part of Object.keys(spec.parts)) {
      const m = buildKawaiiPart(kind, part);
      assert.ok(m && Object.values(m.geometries).some((g) => g && g.getAttribute('position').count > 20), `${kind}:${part}`);
      assert.ok(spec.pivots[part], `${kind}:${part} ha un perno`);
    }
    if (spec.parts.armL && !spec.quadruped && !spec.flier && !spec.ghost) {
      const body = box(Object.values(buildKawaiiPart(kind, 'body').geometries)[0]);
      const sx = spec.pivots.armR[0];
      assert.ok(sx - 0.07 < body.max.x, `${kind}: spalla attaccata al busto`);
      assert.ok(spec.pivots.legR[1] - spec.pivots.body[1] < 0.05, `${kind}: anche sotto il busto`);
    }
  }
});

test('rig low-poly: personaggi v2 in gioco, con luci portate dai modelli e occhi lucidi', async () => {
  const { buildRig } = await import('../src/view/characters.ts');
  const { V2_SPECS } = await import('../src/render/lowpoly/v2/npc.ts');
  const c = buildRig('custode', 'lowpoly');
  assert.equal(c.lights.length, 1, 'lanterna del Custode');
  assert.deepEqual(c.parts.armR.position.toArray(), V2_SPECS.custode.pivots.armR, 'perni v2');
  assert.ok(c.parts.head.getObjectByName('gloss'), 'occhi lucidi nella testa');
  const custom = buildRig('custode', 'lowpoly', { ...(await import('../src/game/look.ts')).DEFAULT_LOOK, hair: 'long', sparkle: true });
  assert.ok(custom.parts.head.getObjectByName('scintille'), 'scintille sui brillantini');
  assert.equal(buildRig('ghost', 'lowpoly').lights.length, 1, 'bagliore del fantasma');
  assert.equal(buildRig('ghost', 'lowpoly').spec.bucket, 'ghost');
  for (const kind of ['mourner', 'mournerB', 'priest', 'gravedigger', 'zombie', 'skeleton', 'cat', 'crow', 'petDuck']) {
    for (const style of ['lowpoly', 'voxel']) assert.ok(Object.keys(buildRig(kind, style).parts).length >= 4, `${kind} ${style}`);
  }
});

test('parti animate: stagno, presenze, natura; aggiornabili e deterministiche', async () => {
  const { createAnimated } = await import('../src/render/lowpoly/animated.ts');
  const types = ['pond', 'zombies_play', 'zombies_dance', 'zombie_walker', 'ghosts_roam', 'toxic_puddle', 'mud', 'hell_hole', 'dead_tree', 'spectral_tree', 'bushes', 'tall_grass', 'flowerbed'];
  for (const type of types) {
    const a = createAnimated(vis(type));
    assert.ok(a && a.root.children.length > 0, type);
    a.update(0); a.update(3.7);
  }
  assert.equal(createAnimated(vis('lamp_post')), null);
  assert.equal(createAnimated(vis('hell_hole', { broken: true, lit: false })), null, 'buco spento: niente scintille');
  const p1 = createAnimated(vis('pond')), p2 = createAnimated(vis('pond'));
  p1.update(2); p2.update(2);
  assert.deepEqual(p1.root.children[0].position.toArray(), p2.root.children[0].position.toArray());
  // pesci scheletrici: ogni tanto saltano fuori dall'acqua (in aria per meno di un terzo del tempo)
  let air = 0, steps = 0, top = 0;
  for (let t = 0; t < 60; t += 0.05, steps++) {
    p1.update(t);
    const up = p1.root.children.filter((o) => o.visible && o.position.y > 0.3);
    if (up.length) air++;
    for (const o of up) top = Math.max(top, o.position.y);
  }
  assert.ok(air > 0 && air < steps / 3, `saltano ogni tanto (${air}/${steps})`);
  assert.ok(top > 0.4 && top < 0.75, `salto alto il giusto (${top.toFixed(2)})`);
});

test('stagno: il fondale sta sopra il terreno, mai alla stessa quota (niente sfarfallio muovendo la camera)', async () => {
  const { pondLP } = await import('../src/render/lowpoly/nature.ts');
  const m = pondLP(vis('pond'));
  const minY = (g) => { const p = g.attributes.position; let y = Infinity; for (let i = 0; i < p.count; i++) y = Math.min(y, p.getY(i)); return y; };
  assert.ok(minY(m.geometries.water) > 0.02, 'acqua sopra il fondale');
  // nessuna faccia rivolta verso l'alto a quota 0 (dove c'è il terreno spianato)
  const g = m.geometries.solid, p = g.attributes.position, idx = g.index;
  const n = idx ? idx.count : p.count;
  const v = (i) => new THREE.Vector3().fromBufferAttribute(p, idx ? idx.getX(i) : i);
  for (let i = 0; i < n; i += 3) {
    const a = v(i), b = v(i + 1), c = v(i + 2);
    const up = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize().y > 0.99;
    if (up) assert.ok(Math.max(Math.abs(a.y), Math.abs(b.y), Math.abs(c.y)) > 0.002, 'faccia complanare al terreno');
  }
});

test('nebbia del bosco: più fitta all\'alba e di notte, col meteo nebbioso entra nel recinto, veli per qualità', async () => {
  const { ForestMist, mistTarget, mistLayers } = await import('../src/view/ForestMist.ts');
  const d = (p, w = 'clear') => mistTarget(p, w).density;
  assert.ok(d('day') < d('dusk') && d('dusk') < d('night') && d('day') < d('dawn'));
  assert.ok(d('night', 'fog') > d('night') && d('night', 'storm') < d('night'));
  assert.equal(mistTarget('day', 'clear').creep, 0);
  assert.ok(mistTarget('day', 'fog').creep > 0, 'col meteo nebbia scavalca le inferriate');
  assert.deepEqual(['low', 'medium', 'high'].map(mistLayers), [1, 2, 3]);
  const scene = new THREE.Scene();
  const mist = new ForestMist(scene, 'medium');
  mist.setWorld(areaForLevel(0), 32, 44, () => 0);
  assert.equal(mist.layerCount, 2);
  mist.setConditions('night', 'clear', true);
  mist.update(0.016, new THREE.Color('#151d29'));
  assert.ok(mist.group.visible);
  mist.setQuality('high');
  assert.equal(mist.layerCount, 3);
  mist.update(0.016, new THREE.Color('#151d29'));
  const before = mist.group.children[0].material.uniforms.uOpacity.value;
  mist.setConditions('day', 'clear');
  for (let i = 0; i < 300; i++) mist.update(0.05, new THREE.Color('#8b928a'));
  assert.ok(mist.group.children[0].material.uniforms.uOpacity.value < before, 'di giorno si dirada, gradualmente');
});

test('atmosfera: cambi di fase graduali e luci del pool che si accendono in dissolvenza', async () => {
  // canvas minimo per lo sfondo a gradiente (in node non c'è il DOM)
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, fillStyle: '' }) }) };
  const { Atmosphere } = await import('../src/view/Atmosphere.ts');
  const scene = new THREE.Scene();
  const atm = new Atmosphere(scene, 'high');
  atm.setPhase('day', 'clear');
  atm.update(0.016, 0, new THREE.Camera());
  const dayHemi = atm.hemi.intensity;
  atm.setPhase('night', 'clear');
  atm.update(0.1, 0.1, new THREE.Camera());
  assert.ok(atm.hemi.intensity < dayHemi && atm.hemi.intensity > 1.06, `passaggio graduale (${atm.hemi.intensity})`);
  for (let i = 0; i < 200; i++) atm.update(0.05, 0.2 + i * 0.05, new THREE.Camera());
  assert.ok(Math.abs(atm.hemi.intensity - 1.05) < 0.01, 'arriva alla notte');
  // una sorgente vicina: la sua luce cresce in qualche decimo di secondo, non di colpo
  atm.focus(new THREE.Vector3(), 10);
  atm.addAnchor(new THREE.Vector3(1, 1, 1), { pos: [0, 0, 0], color: '#ffaa55', intensity: 1, range: 4, flicker: 0, halo: 1 });
  atm.update(0.35, 20, new THREE.Camera());
  const light = scene.getObjectsByProperty('type', 'PointLight').find((l) => l.intensity > 0);
  assert.ok(light, 'luce assegnata');
  const first = light.intensity;
  atm.update(0.3, 20.3, new THREE.Camera());
  assert.ok(light.intensity > first, 'si accende in dissolvenza');
  // il pool pieno: ogni sorgente ha la sua luce accesa
  const src = [];
  for (let i = 0; i < 12; i++) src.push({ pos: new THREE.Vector3((i % 4) - 1.5, 1, Math.floor(i / 4) - 1), a: { pos: [0, 0, 0], color: '#ffaa55', intensity: 1, range: 4, flicker: 0, halo: 1 } });
  let handles = src.map((q) => atm.addAnchor(q.pos, q.a));
  let tt = 21;
  for (let i = 0; i < 40; i++) atm.update(0.05, (tt += 0.05), new THREE.Camera());
  const lit = () => scene.getObjectsByProperty('type', 'PointLight').reduce((a, l) => a + l.intensity, 0);
  const full = lit();
  // la scena si risincronizza (azione, fuoco fatuo…): aggiornate sul posto le luci non calano
  src.forEach((q, i) => atm.updateAnchor(handles[i], q.pos, q.a));
  let low = full;
  for (let i = 0; i < 40; i++) { atm.update(0.05, (tt += 0.05), new THREE.Camera()); low = Math.min(low, lit()); }
  assert.ok(low > full * 0.97, `aggiornando non si spengono (${(low / full).toFixed(2)})`);
  // oggetti rifatti con un modello nuovo nello stesso punto: la luce passa alla sorgente nuova senza buio
  handles.forEach((h) => atm.removeAnchor(h));
  handles = src.map((q) => atm.addAnchor(q.pos, q.a));
  low = full;
  for (let i = 0; i < 40; i++) { atm.update(0.05, (tt += 0.05), new THREE.Camera()); low = Math.min(low, lit()); }
  assert.ok(low > full * 0.9, `rifatte, restano accese (${(low / full).toFixed(2)})`);
});

test('Custode personalizzabile: aspetto validato, chiave stabile, rig con tutte le parti e la lanterna', async () => {
  const { DEFAULT_LOOK, normalizeLook, lookKey, LOOK_STYLES } = await import('../src/game/look.ts');
  const { buildRig } = await import('../src/view/characters.ts');
  assert.deepEqual(normalizeLook({ hair: 'mohawk', skin: '#ff0000', sparkle: 'sì' }), DEFAULT_LOOK, 'valori sconosciuti → predefinito');
  const custom = { ...DEFAULT_LOOK, hair: 'curly', hairColor: '#d0607a', glasses: 'round', outfit: 'sweater', sparkle: true, hat: 'beanie' };
  assert.equal(lookKey(custom), lookKey({ ...custom }));
  assert.notEqual(lookKey(custom), lookKey(DEFAULT_LOOK));
  for (const hair of LOOK_STYLES.hair.map(([v]) => v)) for (const hat of LOOK_STYLES.hat.map(([v]) => v)) for (const outfit of LOOK_STYLES.outfit.map(([v]) => v)) {
    const rig = buildRig('custode', 'lowpoly', { ...DEFAULT_LOOK, hair, hat, outfit, glasses: 'square', freckles: true, bandaid: true, beard: 'braid', mustache: 'handlebar' });
    assert.equal(Object.keys(rig.parts).length, 6, `${hair}/${hat}/${outfit}`);
    assert.equal(rig.lights.length, 1, 'lanterna accesa');
  }
  assert.equal(normalizeLook({ beard: 'braid', mustache: 'handlebar' }).beard, 'braid');
  // colore della barba: proprio, oppure (salvataggi vecchi) quello dei capelli
  assert.equal(normalizeLook({ hairColor: '#e0c27a' }).beardColor, '#e0c27a');
  assert.equal(normalizeLook({ hairColor: '#e0c27a', beardColor: '#8a8580' }).beardColor, '#8a8580');
  assert.notEqual(lookKey({ ...DEFAULT_LOOK, beardColor: '#8a8580' }), lookKey(DEFAULT_LOOK));
  // con il cappello nessuna ciocca supera la tesa (o il bordo del berretto)
  // (per i cappelli inclinati si misura rispetto al piano della tesa: i capelli
  // possono seguirla da sotto, mai uscire sopra il suo spessore)
  const { hairOnly } = await import('../src/render/lowpoly/v2/custode.ts');
  for (const [hair] of LOOK_STYLES.hair) for (const hat of ['wide', 'top', 'beanie']) {
    const { geo, center, hatPh } = hairOnly({ ...DEFAULT_LOOK, hair, hat });
    if (!geo) continue;
    const p = geo.attributes.position, v = new THREE.Vector3();
    let max = -Infinity;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).sub(center);
      max = Math.max(max, Math.asin(v.y / v.length()) * 180 / Math.PI);
    }
    assert.ok(max <= hatPh + 8, `${hair} sotto ${hat}: ${max.toFixed(1)}° (cappello da ${hatPh}°)`);
  }
  const sparkly = buildRig('custode', 'lowpoly', custom);
  assert.ok(sparkly.parts.head.children[0].children.some((m) => m.name === 'glow'), 'brillantini luminosi sul viso');
});

test('teste del Custode: zucca, teschio e zombie; zucca e teschio senza capelli né barba', async () => {
  const { DEFAULT_LOOK, normalizeLook, lookKey, lookUnused, LOOK_STYLES } = await import('../src/game/look.ts');
  const { buildRig } = await import('../src/view/characters.ts');
  assert.equal(normalizeLook({}).head, 'human', 'salvataggi vecchi: testa umana');
  assert.equal(normalizeLook({ head: 'pumpkin' }).head, 'pumpkin');
  assert.equal(normalizeLook({ head: 'cavolo' }).head, 'human');
  assert.equal(lookKey({ ...DEFAULT_LOOK }), lookKey(normalizeLook({})), 'la testa umana non cambia la chiave dei vecchi aspetti');
  assert.ok(lookUnused('skull').has('hair') && lookUnused('pumpkin').has('beard'));
  assert.equal(lookUnused('zombie').size, 0, 'lo zombie può avere capelli e barba');
  const tris = (rig) => { let n = 0; rig.parts.head.traverse((o) => { if (o.geometry) n += o.geometry.attributes.position.count; }); return n; };
  const hairy = { ...DEFAULT_LOOK, hat: 'none', hair: 'longcurly', beard: 'full', mustache: 'bushy' };
  for (const [head] of LOOK_STYLES.head) {
    const rig = buildRig('custode', 'lowpoly', { ...hairy, head });
    assert.equal(Object.keys(rig.parts).length, 6, head);
  }
  // zucca e teschio ignorano capelli e barba: stessa testa con o senza
  for (const head of ['pumpkin', 'skull']) {
    const a = buildRig('custode', 'lowpoly', { ...hairy, head });
    const b = buildRig('custode', 'lowpoly', { ...DEFAULT_LOOK, hat: 'none', hair: 'none', head });
    assert.equal(tris(a), tris(b), `${head}: niente capelli né barba`);
  }
  // la faccia intagliata della zucca si illumina
  const pumpkin = buildRig('custode', 'lowpoly', { ...DEFAULT_LOOK, head: 'pumpkin' });
  assert.ok(pumpkin.parts.head.children[0].children.some((m) => m.name === 'glow'), 'intaglio luminoso');
});

test('nuovo salvataggio: aspetto predefinito; salvataggio vecchio senza aspetto viene completato', async () => {
  const { normalizeSave } = await import('../src/game/state.ts');
  const { DEFAULT_LOOK } = await import('../src/game/look.ts');
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  assert.deepEqual(s.player.look, DEFAULT_LOOK);
  const old = JSON.parse(JSON.stringify(s));
  delete old.player.look;
  assert.deepEqual(normalizeSave(old).player.look, DEFAULT_LOOK);
});

test('animale domestico: esce dalla tana, segue il Custode, riporta l’osso, va a cuccia e dorme', async () => {
  const { Actors } = await import('../src/view/Actors.ts');
  const { cellCenter } = await import('../src/view/WorldView.ts');
  const atmosphere = { addAnchor: () => ({}), removeAnchor() {}, moveAnchor() {} };
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  s.placeables.push({ ...s.placeables[0], id: 'casetta', type: 'pet_house', x: 22, y: 36, rot: 0, variant: 0, broken: false, dirty: false });
  const occ = buildOccupancy(s);
  const scene = new THREE.Scene();
  const start = cellCenter(24, 42, [1, 1]);
  const a = new Actors(scene, atmosphere, 'lowpoly', start);
  a.setWorld(areaForLevel(0), (x, y) => occ.blocked.has(`${x},${y}`));
  a.syncPresences(s, new Date());
  const run = (secs) => { for (let t = 0; t < secs; t += 0.05) a.update(0.05, t, [], () => 0); };
  const [pet] = a.petList();
  assert.equal(pet.label, 'Cane');
  assert.ok(pet.sleeping, 'all’inizio è in tana');
  assert.ok(!a.pickables().some((h) => h.userData.petId), 'in tana non si tocca (si tocca la casetta)');
  a.callPet('casetta');
  run(8);
  const p = a.pets.get('casetta');
  assert.ok(p.rig.root.visible && p.pos.distanceTo(a.avatar.pos) < 2, 'richiamato, raggiunge il Custode');
  assert.ok(a.pickables().some((h) => h.userData.petId === 'casetta'));
  assert.ok(a.throwBone('casetta'), 'lancia l’osso');
  run(10);
  assert.ok(!a.bone.carrier && !a.bone.flying, 'osso riportato');
  assert.ok(p.pos.distanceTo(a.avatar.pos) < 2, 'torna dal Custode');
  a.sendPetHome('casetta');
  run(10);
  assert.equal(p.act, 'sleep', 'a cuccia dorme');
  assert.ok(p.den.group.visible, 'in tana si vedono gli occhi');
  run(60);
  assert.equal(p.act, 'sleep', 'a cuccia resta in tana finché non lo richiami');
  a.freePet('casetta');
  run(4);
  assert.notEqual(p.act, 'sleep', 'libero: esce a fare un giro');
  s.placeables = s.placeables.filter((q) => q.id !== 'casetta');
  a.syncPresences(s, new Date());
  assert.equal(a.petList().length, 0, 'senza casetta niente animale');
});

test('animale domestico: alla riapertura riprende quello che faceva (salvato nella casetta)', async () => {
  const { Actors } = await import('../src/view/Actors.ts');
  const { cellCenter } = await import('../src/view/WorldView.ts');
  const { normalizeSave } = await import('../src/game/state.ts');
  const atmosphere = { addAnchor: () => ({}), removeAnchor() {}, moveAnchor() {} };
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  const base = { ...s.placeables[0], type: 'pet_house', rot: 0, variant: 0, broken: false, dirty: false };
  s.placeables.push({ ...base, id: 'segue', x: 22, y: 36, petMode: 'follow' }, { ...base, id: 'cuccia', x: 26, y: 36, petMode: 'home' });
  const loaded = normalizeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.placeables.find((p) => p.id === 'segue').petMode, 'follow', 'lo stato resta nel salvataggio');
  const occ = buildOccupancy(loaded);
  const a = new Actors(new THREE.Scene(), atmosphere, 'lowpoly', cellCenter(24, 42, [1, 1]));
  a.setWorld(areaForLevel(0), (x, y) => occ.blocked.has(`${x},${y}`));
  a.syncPresences(loaded, new Date());
  for (let t = 0; t < 40; t += 0.05) a.update(0.05, t, [], () => 0);
  const follow = a.pets.get('segue'), home = a.pets.get('cuccia');
  assert.equal(follow.mode, 'follow');
  assert.ok(follow.rig.root.visible && follow.pos.distanceTo(a.avatar.pos) < 2, 'chi seguiva il Custode lo raggiunge subito');
  assert.equal(home.act, 'sleep', 'chi era a cuccia resta in tana');
});

test('animale domestico: segue il Custode in modo fluido (niente inversioni di direzione)', async () => {
  const { Actors } = await import('../src/view/Actors.ts');
  const { cellCenter } = await import('../src/view/WorldView.ts');
  const atmosphere = { addAnchor: () => ({}), removeAnchor() {}, moveAnchor() {} };
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  s.placeables.push({ ...s.placeables[0], id: 'casetta', type: 'pet_house', x: 22, y: 36, rot: 0, variant: 0, broken: false, dirty: false, petMode: 'follow' });
  const occ = buildOccupancy(s);
  const a = new Actors(new THREE.Scene(), atmosphere, 'lowpoly', cellCenter(24, 42, [1, 1]));
  a.setWorld(areaForLevel(0), (x, y) => occ.blocked.has(`${x},${y}`));
  a.syncPresences(s, new Date());
  let t = 0;
  const step = () => { a.update(1 / 30, t, [], () => 0); t += 1 / 30; };
  for (let i = 0; i < 300; i++) step();
  const pet = a.pets.get('casetta');
  // il Custode cammina avanti e indietro per il cimitero; si registra la direzione di marcia dell'animale
  let reversals = 0, prev = null, last = pet.pos.clone();
  for (const goal of [{ x: 34, y: 42 }, { x: 34, y: 30 }, { x: 20, y: 30 }, { x: 24, y: 44 }]) {
    a.walkTo(goal);
    for (let i = 0; i < 240; i++) {
      step();
      const d = pet.pos.clone().sub(last).setY(0);
      last = pet.pos.clone();
      if (d.length() < 1e-3) continue;
      d.normalize();
      if (prev && d.dot(prev) < -0.2) reversals++;
      prev = d;
    }
  }
  assert.ok(reversals <= 2, `inversioni di marcia: ${reversals}`);
  assert.ok(pet.pos.distanceTo(a.avatar.pos) < 3, 'resta vicino al Custode');
});

test('animale domestico: richiamato, parte dalla cuccia e raggiunge il Custode a piedi', async () => {
  const { Actors } = await import('../src/view/Actors.ts');
  const { cellCenter } = await import('../src/view/WorldView.ts');
  const atmosphere = { addAnchor: () => ({}), removeAnchor() {}, moveAnchor() {} };
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  s.placeables.push({ ...s.placeables[0], id: 'casetta', type: 'pet_house', x: 18, y: 18, rot: 0, variant: 0, broken: false, dirty: false, petMode: 'home' });
  const occ = buildOccupancy(s);
  const a = new Actors(new THREE.Scene(), atmosphere, 'lowpoly', cellCenter(40, 44, [1, 1]));
  a.setWorld(areaForLevel(0), (x, y) => occ.blocked.has(`${x},${y}`));
  a.syncPresences(s, new Date());
  const pet = a.pets.get('casetta');
  let t = 0;
  const run = (secs) => { for (let k = 0; k < secs; k += 1 / 30) { a.update(1 / 30, t, [], () => 0); t += 1 / 30; } };
  run(1);
  assert.equal(pet.act, 'sleep');
  a.callPet('casetta');
  run(0.1);
  assert.ok(pet.pos.distanceTo(pet.door) < 1, 'esce dalla porta della cuccia');
  let maxStep = 0, last = pet.pos.clone();
  for (let i = 0; i < 30 * 30; i++) { run(1 / 30); maxStep = Math.max(maxStep, pet.pos.distanceTo(last)); last = pet.pos.clone(); }
  assert.ok(maxStep < 0.3, `nessun salto: passo massimo ${maxStep.toFixed(2)}`);
  assert.ok(pet.pos.distanceTo(a.avatar.pos) < 2.5, 'alla fine è dal Custode');
});

test('alone delle luci: sempre bianco, solo l’opacità sfuma (niente puntini colorati ai bordi)', async () => {
  const { radialGlowTexture } = await import('../src/render/glowTexture.ts');
  const t = radialGlowTexture([[0, 0.95], [0.18, 0.45], [0.5, 0.12], [1, 0]], 32);
  const d = t.image.data;
  for (let i = 0; i < d.length; i += 4) assert.ok(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255, 'rgb bianco ovunque');
  const a = (x, y) => d[(y * 32 + x) * 4 + 3];
  assert.ok(a(16, 16) > 200, 'pieno al centro');
  assert.equal(a(0, 0), 0, 'trasparente negli angoli');
  assert.ok(a(16, 16) > a(24, 16) && a(24, 16) > a(30, 16), 'sfuma verso il bordo');
});

test('rito dell’Albero dei ricordi: il corteo porta la bara all’albero, poi la terra la accoglie', async () => {
  const { Actors } = await import('../src/view/Actors.ts');
  const { cellCenter } = await import('../src/view/WorldView.ts');
  const { closedCoffinLP, memoryTreeLP } = await import('../src/render/lowpoly/memoryTree.ts');
  const atmosphere = { addAnchor: () => ({}), removeAnchor() {}, moveAnchor() {} };
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  const occ = buildOccupancy(s);
  const a = new Actors(new THREE.Scene(), atmosphere, 'lowpoly', cellCenter(24, 42, [1, 1]));
  a.setWorld(areaForLevel(0), (x, y) => occ.blocked.has(`${x},${y}`));
  const g = s.graves[0];
  const tree = cellCenter(36, 38, [5, 5]);
  let lifted = false, done = 0;
  const coffin = new THREE.Group();
  a.startRite({ grave: cellCenter(g.x, g.y, [2, 2]), graveFront: { x: g.x, y: g.y + 2 }, tree, treeFront: { x: 38, y: 43 }, gate: { x: 31, y: 49 }, coffin, onLift: () => { lifted = true; }, onDone: () => { done++; } });
  assert.ok(a.funeralActive);
  let carried = false, jump = 0;
  const last = new Map();
  for (let t = 0; t < 90 && !done; t += 0.05) {
    a.update(0.05, t, [], () => 0);
    if (coffin.visible && coffin.position.y > 0.4) carried = true;
    for (const m of [...(a.rite?.members ?? []), ...a.departing]) { const p = last.get(m); if (p) jump = Math.max(jump, p.distanceTo(m.pos)); last.set(m, m.pos.clone()); }
  }
  assert.ok(jump < 0.3, `nessuno si teletrasporta (salto massimo ${jump.toFixed(2)})`);
  assert.ok(lifted, 'la bara esce dalla tomba');
  assert.ok(carried, 'portata a spalla');
  assert.equal(done, 1, 'il rito si conclude');
  assert.ok(coffin.position.distanceTo(tree.clone().setY(coffin.position.y)) < 2.3, 'davanti all’albero');
  assert.ok(!a.funeralActive, 'mentre se ne va il corteo non blocca i tocchi');
  const leaving = a.departing.length;
  assert.equal(leaving, 5, 'tutti si avviano all’uscita');
  for (let t = 0; t < 60 && a.departing.length; t += 0.1) a.update(0.1, t, [], () => 0);
  assert.equal(a.departing.length, 0, 'arrivati all’uscita escono di scena');
  assert.equal(typeof a.skipFuneral, 'undefined', 'il rito non si salta più toccando la mappa');
  // un nuovo funerale mentre il primo è in corso: il primo corteo non sparisce, si avvia all'uscita
  let first = 0;
  a.startFuneral(cellCenter(g.x, g.y, [2, 2]), { x: 31, y: 49 }, () => { first++; });
  a.update(0.1, 0, [], () => 0);
  a.startFuneral(cellCenter(g.x, g.y, [2, 2]), { x: 31, y: 49 }, () => undefined);
  assert.equal(first, 1, 'il primo funerale si chiude comunque');
  assert.equal(a.departing.length, 5, 'e il suo corteo esce camminando');
  // un frutto acceso per ricordo; senza ricordi la cavità non brilla
  const glow = (n) => memoryTreeLP(n).geometries.glow?.attributes.position.count ?? 0;
  assert.ok(glow(5) > glow(1) && glow(1) > glow(0));
  assert.ok(closedCoffinLP().geometries.solid);
});

test('sporco e rotto si leggono su tutti gli oggetti; le luci guaste sfarfallano', async () => {
  const { FireFlicker } = await import('../src/view/FireFlicker.ts');
  const count = (key) => { const m = resolveLowpoly(key)(); return Object.values(m.geometries).reduce((n, g) => n + (g ? g.attributes.position.count : 0), 0); };
  for (const id of ['pet_house', 'shop', 'lamp_post', 'well']) {
    const k = (st) => placeableKey(vis(id, st));
    assert.ok(count(k({ dirty: true })) > count(k({})), `${id}: lo sporco aggiunge erbacce, foglie, ragnatele`);
    assert.ok(count(k({ dirty: true, broken: true })) > count(k({ dirty: true })), `${id}: il rotto aggiunge macerie`);
  }
  // il lampione rotto resta acceso (sfarfalla), il falò rotto è spento
  assert.ok(resolveLowpoly(placeableKey(vis('lamp_post', { dirty: true, broken: true })))().lights.length > 0);
  assert.equal(resolveLowpoly(placeableKey(vis('bonfire', { dirty: true, broken: true })))().lights.length, 0);
  const dips = (fault) => { const f = new FireFlicker(1234, 0.2, 1, fault); let n = 0; for (let t = 0; t < 60; t += 0.02) if (f.value(t) < 0.18) n++; return n; };
  assert.equal(dips(0), 0, 'sana: mai quasi spenta');
  assert.ok(dips(2) > 200, 'rotta: si spegne e riaccende a raffiche');
  assert.ok(dips(2) > dips(1));
});

test('becchino in visita: fa le tappe, lavora a ciascuna e se ne va da dove è venuto (non svanisce prima)', async () => {
  const { Actors } = await import('../src/view/Actors.ts');
  const { cellCenter } = await import('../src/view/WorldView.ts');
  const atmosphere = { addAnchor: () => ({}), removeAnchor() {}, moveAnchor() {} };
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  const occ = buildOccupancy(s);
  const a = new Actors(new THREE.Scene(), atmosphere, 'lowpoly', cellCenter(24, 42, [1, 1]));
  a.setWorld(areaForLevel(0), (x, y) => occ.blocked.has(`${x},${y}`));
  const door = cellCenter(31, 48, [1, 1]);
  const stops = s.graves.slice(0, 3).map((g) => ({ id: g.id, x: g.x, y: g.y, fp: [2, 2] }));
  const done = [];
  let left = false, worked = false;
  const r = a.spawnVisitor('gravedigger', door, door.clone(), stops, (id) => done.push(id), () => { left = true; });
  for (let t = 0; t < 200 && !left; t += 0.1) { a.update(0.1, t, [], () => 0); if (r.pose === 'work') worked = true; }
  assert.deepEqual(done, stops.map((q) => q.id), 'tutte le tappe, in ordine');
  assert.ok(worked, 'lavora alle tappe');
  assert.ok(left, 'poi se ne va');
  assert.ok(r.pos.distanceTo(door) < 1, 'esce da dove è entrato');
});

test('presenze erranti: a frame regolari camminano davvero (prima restavano a girare su se stesse); lo zombie zoppica, più lento del Custode', async () => {
  const { Actors, zombieLurch } = await import('../src/view/Actors.ts');
  const { cellCenter, worldToCell } = await import('../src/view/WorldView.ts');
  const s = createNewGame(new Date('2026-10-09T12:00:00Z'), 717);
  const occ = buildOccupancy(s);
  const area = areaForLevel(0);
  const atmosphere = { addAnchor: () => ({}), removeAnchor() {}, moveAnchor() {} };
  const a = new Actors(new THREE.Scene(), atmosphere, 'lowpoly', cellCenter(24, 42, [1, 1]));
  a.setWorld(area, (x, y) => occ.blocked.has(`${x},${y}`));
  const far = {};
  for (const kind of ['zombie', 'cat', 'rat', 'ghost']) {
    const r = a.spawnRoamer({ kind }, cellCenter(30, 30, [1, 1]));
    r.life = 999;
    const start = r.pos.clone();
    let maxd = 0;
    for (let t = 0; t < 12; t += 1 / 60) {
      a.update(1 / 60, t, [], () => 0);
      maxd = Math.max(maxd, r.pos.distanceTo(start));
      const c = worldToCell(r.pos);
      assert.ok(c.x >= area.x && c.y >= area.y && c.x < area.x + area.w && c.y < area.y + area.h, `${kind} resta nel recinto`);
      if (kind !== 'ghost') assert.ok(!occ.blocked.has(`${c.x},${c.y}`), `${kind} non entra negli ostacoli`);
    }
    far[kind] = maxd;
    a.removeRoamer(r.id, false);
  }
  for (const [kind, d] of Object.entries(far)) assert.ok(d > 1.2, `${kind} si sposta (${d.toFixed(2)})`);
  // andatura zoppa: scatti e quasi-fermate, media ben sotto il passo pieno
  let sum = 0, lo = Infinity, hi = 0;
  for (let i = 0; i < 1000; i++) { const v = zombieLurch(i * 0.01); sum += v; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  assert.ok(lo < 0.35 && hi > 1.2 && sum / 1000 < 0.7, 'zoppica');
  assert.ok(a.avatar.speed > 0.85 * 2, 'il Custode è molto più svelto');
});
