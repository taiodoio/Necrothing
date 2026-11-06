// Le cinque cripte del laboratorio (Cripte-Lab): catalogo, modelli, varianti, luci e posa.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CATALOG, CATALOG_LIST, ACCESS } from '../src/game/catalog.ts';
import { resolveLowpoly } from '../src/render/lowpoly/index.ts';
import { CRYPT_FAMILIES, CRYPT_TYPES, CRYPT_VARIANTS, cryptLP } from '../src/render/lowpoly/cryptModels.ts';
import { placeableKey, seedCount } from '../src/render/keys.ts';
import { createNewGame, normalizeSave } from '../src/game/state.ts';
import { areaForLevel, buildOccupancy, nearestFreeSpot, cellsOf } from '../src/game/world.ts';
import * as R from '../src/game/rules.ts';

const tris = (m) => Object.values(m.geometries).reduce((a, g) => a + g.getAttribute('position').count / 3, 0);
const key = (type, variant, dirty, broken, lit = true) => `p:${type}:${variant}:0:${+dirty}${+broken}${+lit}`;
const build = (type, variant, dirty = false, broken = false, lit = true) => resolveLowpoly(key(type, variant, dirty, broken, lit))();
/** Quante versioni ha un lotto: tre le cripte, una le case del villaggetto. */
const VARS = (type) => CATALOG[type].randomVariants ?? 1;
const VILLAGE = ['crypt_florist', 'crypt_rectory', 'crypt_lamplighter', 'crypt_reaper'];
const HOUSES = ['crypt_ghost', ...VILLAGE];

test('cripte e case: le cinque case sono ruotabili e occupano 4×3, le cripte conservano 4×5', () => {
  assert.equal(CRYPT_TYPES.length, 9);
  assert.deepEqual(CRYPT_FAMILIES, ['zombie', 'ghost', 'skeleton', 'nature', 'witch', 'reaper', 'rectory', 'lamplighter', 'florist']);
  for (const type of CRYPT_TYPES) {
    const d = CATALOG[type];
    assert.ok(d, type);
    assert.equal(d.category, 'structure');
    assert.deepEqual(d.footprint, HOUSES.includes(type) ? [4, 3] : [4, 5]);
    assert.equal(!!d.rotatable, HOUSES.includes(type));
    assert.ok(d.decays && d.light && !d.unique, `${type}: si sporca, ha luce, se ne possono avere più d'una`);
    assert.equal(d.randomVariants, VILLAGE.includes(type) ? undefined : CRYPT_VARIANTS);
    assert.ok(ACCESS.full.includes(type), 'nella Full');
    assert.ok(d.description.length > 40 && !d.description.startsWith('item.'), `${type}: descrizione scritta`);
    assert.ok(!d.label.startsWith('item.'), `${type}: nome scritto`);
  }
  // le altre versioni non sono voci in Bottega: una voce per lotto
  assert.equal(CATALOG_LIST.filter((d) => d.id.startsWith('crypt_')).length, 9);
  // le cripte sono ritirate (non si comprano, chi le ha posate le tiene): restano la Casetta infestata e le case nuove
  assert.deepEqual(CATALOG_LIST.filter((d) => d.retired).map((d) => d.id), ['crypt_zombie', 'crypt_nature', 'crypt_skeleton', 'crypt_witch']);
  assert.deepEqual(CRYPT_TYPES.filter((t) => !CATALOG[t].retired), ['crypt_ghost', 'crypt_reaper', 'crypt_rectory', 'crypt_lamplighter', 'crypt_florist']);
  // costi e ranghi: crescono, e stanno nella scala delle costruzioni che ci sono già (Mausoleo 80 al rango 4, Cripta del vampiro 90 al 5)
  const byRank = CRYPT_TYPES.map((t) => CATALOG[t]);
  assert.ok(Math.min(...byRank.map((d) => d.cost)) >= CATALOG.gravedigger_house.cost - 5 && Math.max(...byRank.map((d) => d.cost)) <= CATALOG.vampire_crypt.cost + 15);
  assert.ok(Math.min(...byRank.map((d) => d.minRank)) >= 3 && Math.max(...byRank.map((d) => d.minRank)) <= 5);
});

test('case: ogni stato e variante resta nelle celle anche ruotando', () => {
  for (const type of HOUSES) for (let v = 0; v < VARS(type); v++) for (const [dirty, broken] of [[false, false], [true, false], [true, true]]) {
    const m = build(type, v, dirty, broken);
    const box = new THREE.Box3();
    for (const g of Object.values(m.geometries)) { g.computeBoundingBox(); box.union(g.boundingBox); }
    assert.ok(box.min.x >= -2.01 && box.max.x <= 2.01 && box.min.z >= -1.51 && box.max.z <= 1.51, `${type} v${v} ${dirty}/${broken}: ${JSON.stringify(box)}`);
    for (let rot = 0; rot < 4; rot++) {
      const b = box.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(-rot * Math.PI / 2));
      const [w, d] = rot % 2 ? [3, 4] : [4, 3];
      assert.ok(b.min.x >= -w / 2 - 0.01 && b.max.x <= w / 2 + 0.01 && b.min.z >= -d / 2 - 0.01 && b.max.z <= d / 2 + 0.01, `${type} rot ${rot}`);
    }
  }
});

test('case: i vecchi lotti si restringono intorno al centro senza perdere oggetti o sovrapporsi', () => {
  const s = createNewGame(new Date('2026-11-04T10:00:00Z'), 1);
  s.version = 4; s.graves = []; s.placeables = HOUSES.map((type, i) => ({ id: `old-${i}`, type, x: 10 + i * 6, y: 12, rot: i % 2, variant: i === 0 ? 2 : 0, lit: true, dirty: true, broken: false, caredAt: s.createdAt, createdAt: s.createdAt }));
  const originals = s.placeables.map((p) => ({ ...p }));
  const migrated = normalizeSave(JSON.parse(JSON.stringify(s)));
  for (const [i, p] of migrated.placeables.entries()) {
    const before = originals[i], oldSize = before.rot % 2 ? [5, 4] : [4, 5], newSize = p.rot % 2 ? [3, 4] : [4, 3];
    const oldCells = new Set(cellsOf(before.x, before.y, oldSize));
    assert.ok(cellsOf(p.x, p.y, newSize).every((cell) => oldCells.has(cell)));
    assert.equal(p.x + newSize[0] / 2, before.x + oldSize[0] / 2);
    assert.equal(p.y + newSize[1] / 2, before.y + oldSize[1] / 2);
    assert.equal(p.variant, before.variant); assert.equal(p.dirty, true); assert.equal(p.lit, true);
  }
  assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(migrated))).placeables, migrated.placeables, 'la migrazione avviene una volta sola');
});

test('case: la rotazione usa le celle e rispetta gli ostacoli', () => {
  const now = new Date('2026-11-04T10:00:00Z');
  for (const type of HOUSES) {
    const s = createNewGame(now, 13); s.placeables = []; s.graves = []; s.inventory[type] = 1;
    const p = R.placeFromInventory(s, type, 24, 24, 0, now);
    R.rotateEntity(s, p.id); assert.equal(p.rot, 1);
    assert.equal(cellsOf(p.x, p.y, [3, 4]).length, 12);
    s.placeables.push({ ...p, id: 'blocker', type: 'wall_stone', x: p.x + 3, y: p.y });
    assert.throws(() => R.rotateEntity(s, p.id), 'la rotazione che occupa la cella bloccata viene rifiutata');
    assert.equal(p.rot, 1);
  }
});

test('cripte e case: ogni versione × 3 stati si costruisce, diverse tra loro, e sta nel lotto', () => {
  const seen = new Set();
  for (const type of CRYPT_TYPES) {
    assert.equal(seedCount(type), 1, 'un solo seme: la variante non dipende da lui');
    const sigs = new Set();
    for (let v = 0; v < VARS(type); v++) {
      const clean = build(type, v), dirty = build(type, v, true), broken = build(type, v, true, true);
      assert.ok(clean.geometries.solid && tris(clean) > 2500, `${type} v${v}: modello vero`);
      assert.ok(tris(dirty) > tris(clean) && tris(broken) > tris(clean), `${type} v${v}: sporca e rotta hanno più dettagli`);
      sigs.add(tris(clean));
      // nel lotto 4 × 5 (un po' di margine per recinto e rami)
      const box = new THREE.Box3().setFromBufferAttribute(clean.geometries.solid.getAttribute('position'));
      assert.ok(box.min.x > -2.2 && box.max.x < 2.2 && box.min.z > -2.7 && box.max.z < 2.7, `${type} v${v}: dentro il lotto (${box.min.x.toFixed(1)}…${box.max.x.toFixed(1)} × ${box.min.z.toFixed(1)}…${box.max.z.toFixed(1)})`);
      assert.ok(box.min.y > -0.3 && box.max.y < 5, `${type} v${v}: altezza ragionevole`);
      seen.add(`${type}:${v}`);
    }
    assert.equal(sigs.size, VARS(type), `${type}: le versioni sono davvero diverse`);
  }
  assert.equal(seen.size, 15 + VILLAGE.length);
});

test('cripte: la variante è sempre nell\'intervallo, anche se il salvataggio dice altro', () => {
  const v = (variant) => tris(cryptLP({ type: 'crypt_ghost', variant, dirty: false, broken: false, lit: true, seed: 0 }));
  assert.equal(v(1), v(1 + CRYPT_VARIANTS), 'giro completo: stessa versione');
  assert.equal(v(-2), v(1), '-2 → la versione 1 (indice)');
  assert.notEqual(v(0), v(1));
});

test('cripte: luci accese solo da integre o sporche e accese; spente o rotte niente luce', () => {
  for (const type of CRYPT_TYPES) {
    const on = build(type, 0), dirty = build(type, 0, true), off = build(type, 0, false, false, false), broken = build(type, 0, true, true), brokenOn = build(type, 0, true, true, true);
    assert.ok(on.lights.length >= 1 && on.lights.length <= 6, `${type}: qualche luce (${on.lights.length})`);
    assert.equal(dirty.lights.length, on.lights.length);
    assert.ok(on.geometries.glow, `${type}: ha parti luminose`);
    assert.equal(off.lights.length, 0, `${type}: spenta senza luci`);
    assert.ok(!off.geometries.glow, `${type}: spenta senza parti luminose`);
    assert.ok(Math.abs(tris(off) - tris(on)) <= tris(on) * 0.12, `${type}: spenta ha le stesse forme (scure), meno le fiammelle`);
    assert.equal(broken.lights.length, 0, `${type}: rotta senza luci`);
    assert.ok(!broken.geometries.glow);
    assert.equal(brokenOn.lights.length, 0, 'rotta e «accesa»: comunque niente luci (nel generatore)');
    for (const l of on.lights) assert.ok(l.range > 0 && l.intensity > 0 && l.pos.length === 3 && typeof l.color === 'string');
  }
});

test('cripte: sporche e rotte cambiano forma come le altre costruzioni (degrado comune + pezzi che mancano)', () => {
  for (const type of CRYPT_TYPES) {
    for (let v = 0; v < VARS(type); v++) {
      const clean = build(type, v), dirty = build(type, v, true), broken = build(type, v, true, true);
      // le forme di partenza sono le stesse: lo sporco aggiunge, da rotta si perde qualcosa e si aggiungono macerie
      assert.ok(tris(dirty) > tris(clean) * 1.02, `${type} v${v}: sporca > integra`);
      assert.notEqual(tris(broken), tris(dirty), `${type} v${v}: rotta ≠ sporca`);
    }
  }
});

test('cripte: costruite con il kit dei generatori (colori per faccia, nessun materiale proprio, solo i gruppi del gioco)', () => {
  for (const type of CRYPT_TYPES) {
    const m = build(type, 0);
    const keys = Object.keys(m.geometries);
    assert.ok(keys.includes('solid') && keys.includes('glow'), `${type}: solido e luce`);
    assert.deepEqual(keys.filter((k) => !['solid', 'glow', 'gloss', 'water', 'ghost'].includes(k)), [], `${type}: solo i gruppi del gioco`);
    for (const g of Object.values(m.geometries)) {
      assert.ok(g.getAttribute('color') && g.getAttribute('normal'), 'colori e normali per vertice');
      assert.equal(g.getAttribute('position').count % 3, 0, 'triangoli separati (sfaccettato)');
    }
  }
});

test('cripte: alla posa la versione è a caso, ma sempre una delle tre; esplicita se la si dice', () => {
  const now = new Date('2026-11-04T10:00:00Z');
  const s = createNewGame(now, 7);
  s.placeables = []; s.graves = [];
  const spot = nearestFreeSpot(24, 22, [4, 5], buildOccupancy(s), areaForLevel(s.world.expansionLevel));
  assert.ok(spot, 'c\'è posto per un lotto 4 × 5');
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    s.inventory.crypt_nature = 1;
    const p = R.placeFromInventory(s, 'crypt_nature', spot.x, spot.y, 0, now);
    assert.ok([0, 1, 2].includes(p.variant), `variante ${p.variant}`);
    seen.add(p.variant);
    s.placeables.pop(); // si toglie, per fare posto al prossimo
  }
  assert.equal(seen.size, 3, 'in 60 pose escono tutte e tre le versioni');
  s.inventory.crypt_ghost = 1;
  assert.equal(R.placeFromInventory(s, 'crypt_ghost', spot.x, spot.y, 0, now, 2).variant, 2, 'la versione scelta (l\'anteprima) è quella posata');
  s.placeables.pop();
  // gli altri oggetti restano come prima: variante 0
  s.inventory.lantern = 1;
  assert.equal(R.placeFromInventory(s, 'lantern', spot.x, spot.y, 0, now, 2).variant, 0, 'senza versioni: sempre 0');
});

test('cripte: la chiave del modello distingue versione e stato; salvataggi vecchi non cambiano', () => {
  const k = (v, d, b) => placeableKey({ type: 'crypt_zombie', variant: v, dirty: d, broken: b, lit: true, seed: 0 });
  assert.notEqual(k(0, false, false), k(1, false, false));
  assert.notEqual(k(0, false, false), k(0, true, false));
  assert.notEqual(k(0, true, false), k(0, true, true));
  assert.equal(k(2, false, false), 'p:crypt_zombie:2:0:001');
});

test('cripte: le superfici aperte (spicchi del tetto, vasca rotta, anelli a metà) si vedono dai due lati', async () => {
  const { twoSided } = await import('../src/render/lowpoly/cryptKit.ts');
  const g = twoSided(new THREE.CylinderGeometry(0.15, 1, 0.8, 1, 1, true, 0, Math.PI / 4));
  const p = g.getAttribute('position');
  assert.equal(p.count % 6, 0, 'ogni triangolo ha il suo gemello');
  const n = p.count / 2, nrm = (i) => {
    const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, i + 1), c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
    return b.sub(a).cross(c.sub(a)).normalize();
  };
  for (let i = 0; i < n; i += 3) assert.ok(nrm(i).dot(nrm(n + i)) < -0.99, 'il gemello guarda dall\'altra parte');
  // il tetto ottagonale rotto (due spicchi mancano): gli altri spicchi hanno anche il rovescio
  const broken = build('crypt_witch', 0, true, true), whole = build('crypt_witch', 0);
  assert.ok(tris(broken) > 0 && tris(whole) > 0);
});

test('cripte: ogni versione ha la sua anteprima (Bottega mostra la principale, la scheda di una cripta posata la sua)', async () => {
  const fs = await import('node:fs');
  for (const type of CRYPT_TYPES) for (const id of [type, `${type}-v2`, `${type}-v3`].slice(0, VARS(type))) {
    assert.ok(fs.existsSync(new URL(`../src/assets/previews/${id}.webp`, import.meta.url)), `manca l'anteprima ${id}`);
  }
});

test('cripta della strega: grande calderone (1), calderone piccolo e tavolino (2), tavolo di vasetti e pozioni (3)', () => {
  const lit = (v) => build('crypt_witch', v);
  // le tre versioni sono davvero diverse nel giardino, e accese hanno tutte la loro luce verde
  const sizes = [0, 1, 2].map((v) => tris(lit(v)));
  assert.equal(new Set(sizes).size, 3);
  for (let v = 0; v < 3; v++) assert.ok(lit(v).lights.some((l) => l.color === '#9af06a'), `versione ${v + 1}: luce della pozione`);
});

test('cripte: non si girano (per ora): posate restano dritte, e «Ruota» non c\'è', () => {
  const now = new Date('2026-11-04T10:00:00Z');
  const s = createNewGame(now, 11);
  s.placeables = []; s.graves = [];
  const spot = nearestFreeSpot(24, 22, [4, 5], buildOccupancy(s), areaForLevel(s.world.expansionLevel));
  s.inventory.crypt_witch = 1;
  const p = R.placeFromInventory(s, 'crypt_witch', spot.x, spot.y, 1, now);
  assert.equal(p.rot, 0, 'anche se si chiede un quarto di giro, resta dritta');
  assert.throws(() => R.rotateEntity(s, p.id), 'in Modifica non si gira');
});

test('cripta degli scheletri ritirata: non si compra più, ma quella già posata resta e si vede', () => {
  const now = new Date('2026-11-04T10:00:00Z');
  const s = createNewGame(now, 13);
  s.player.xp = 99999; s.player.wisps = 9999;
  assert.equal(R.shopAvailability(s, 'crypt_skeleton', now), 'retired');
  assert.throws(() => R.buy(s, 'crypt_skeleton', 1, now));
  assert.equal(R.shopAvailability(s, 'crypt_ghost', now), 'ok');
  // chi ce l'ha in inventario la può ancora posare
  s.placeables = []; s.graves = [];
  const spot = nearestFreeSpot(24, 22, [4, 5], buildOccupancy(s), areaForLevel(s.world.expansionLevel));
  s.inventory.crypt_skeleton = 1;
  const p = R.placeFromInventory(s, 'crypt_skeleton', spot.x, spot.y, 0, now);
  assert.ok(p && build('crypt_skeleton', p.variant).geometries.solid, 'si disegna ancora');
});

test('case del villaggetto: acquisti multipli ed effetto decorativo al singolare', async () => {
  const { itemEffect } = await import('../src/ui/effects.ts');
  const now = new Date('2026-11-05T10:00:00Z');
  const s = createNewGame(now, 17);
  s.player.xp = 99999; s.player.wisps = 9999;
  for (const type of ['crypt_ghost', ...VILLAGE]) {
    assert.equal(R.shopAvailability(s, type, now), 'ok', type);
    assert.ok(R.maxBuyable(s, type) > 1, `${type}: più d'una`);
    assert.equal(itemEffect(type), 'Nessuno. È solo carina, non ti basta?', `${type}: effetto scritto al singolare`);
  }
  R.buy(s, 'crypt_reaper', 2, now);
  assert.equal(s.inventory.crypt_reaper, 2);
  for (const type of ['crypt_zombie', 'crypt_nature', 'crypt_witch']) assert.equal(R.shopAvailability(s, type, now), 'retired', type);
});
