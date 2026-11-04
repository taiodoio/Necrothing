// Le cinque cripte del laboratorio (Cripte-Lab): catalogo, modelli, varianti, luci e posa.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CATALOG, CATALOG_LIST, ACCESS, rotatedFootprint } from '../src/game/catalog.ts';
import { resolveLowpoly } from '../src/render/lowpoly/index.ts';
import { CRYPT_FAMILIES, CRYPT_TYPES, CRYPT_VARIANTS, cryptLP } from '../src/render/lowpoly/cryptModels.ts';
import { placeableKey, seedCount } from '../src/render/keys.ts';
import { createNewGame } from '../src/game/state.ts';
import { areaForLevel, buildOccupancy, nearestFreeSpot } from '../src/game/world.ts';
import * as R from '../src/game/rules.ts';

const tris = (m) => Object.values(m.geometries).reduce((a, g) => a + g.getAttribute('position').count / 3, 0);
const key = (type, variant, dirty, broken, lit = true) => `p:${type}:${variant}:0:${+dirty}${+broken}${+lit}`;
const build = (type, variant, dirty = false, broken = false, lit = true) => resolveLowpoly(key(type, variant, dirty, broken, lit))();

test('cripte: cinque voci in Bottega, lotti 4×5 ruotabili, a più versioni, nella Full', () => {
  assert.equal(CRYPT_TYPES.length, 5);
  assert.deepEqual(CRYPT_FAMILIES, ['zombie', 'ghost', 'skeleton', 'nature', 'supernatural']);
  for (const type of CRYPT_TYPES) {
    const d = CATALOG[type];
    assert.ok(d, type);
    assert.equal(d.category, 'structure');
    assert.deepEqual(d.footprint, [4, 5]);
    assert.deepEqual(rotatedFootprint(type, 1), [5, 4], 'ruotata scambia i lati');
    assert.ok(d.rotatable && d.decays && d.light && !d.unique, `${type}: ruotabile, si sporca, ha luce, se ne possono avere più d'una`);
    assert.equal(d.randomVariants, CRYPT_VARIANTS);
    assert.ok(ACCESS.full.includes(type), 'nella Full');
    assert.ok(d.description.length > 40 && !d.description.startsWith('item.'), `${type}: descrizione scritta`);
    assert.ok(!d.label.startsWith('item.'), `${type}: nome scritto`);
  }
  // le altre varianti non sono voci in Bottega: solo le cinque «principali»
  assert.equal(CATALOG_LIST.filter((d) => d.id.startsWith('crypt_')).length, 5);
  // costi e ranghi: crescono, e stanno nella scala delle costruzioni che ci sono già (Mausoleo 80 al rango 4, Cripta del vampiro 90 al 5)
  const byRank = CRYPT_TYPES.map((t) => CATALOG[t]);
  assert.ok(Math.min(...byRank.map((d) => d.cost)) >= CATALOG.gravedigger_house.cost - 5 && Math.max(...byRank.map((d) => d.cost)) <= CATALOG.vampire_crypt.cost + 15);
  assert.ok(Math.min(...byRank.map((d) => d.minRank)) >= 3 && Math.max(...byRank.map((d) => d.minRank)) <= 5);
});

test('cripte: 5 famiglie × 3 varianti × 3 stati si costruiscono, diverse tra loro, e stanno nel lotto', () => {
  const seen = new Set();
  for (const type of CRYPT_TYPES) {
    assert.equal(seedCount(type), 1, 'un solo seme: la variante non dipende da lui');
    const sigs = new Set();
    for (let v = 0; v < CRYPT_VARIANTS; v++) {
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
    assert.equal(sigs.size, 3, `${type}: le tre varianti sono davvero diverse`);
  }
  assert.equal(seen.size, 15);
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
    assert.equal(on.lights.length, 2, `${type}: due luci`);
    assert.equal(dirty.lights.length, 2);
    assert.ok(on.geometries.glow, `${type}: ha parti luminose`);
    assert.equal(off.lights.length, 0, `${type}: spenta senza luci`);
    assert.ok(!off.geometries.glow, `${type}: spenta senza parti luminose`);
    assert.ok(Math.abs(tris(off) - tris(on)) <= tris(on) * 0.05, `${type}: spenta ha le stesse forme (scure), meno le fiammelle`);
    assert.equal(broken.lights.length, 0, `${type}: rotta senza luci`);
    assert.ok(!broken.geometries.glow);
    assert.equal(brokenOn.lights.length, 0, 'rotta e «accesa»: comunque niente luci (nel generatore)');
    for (const l of on.lights) assert.ok(l.range > 0 && l.intensity > 0 && l.pos.length === 3 && typeof l.color === 'string');
  }
});

test('cripte: sporche e rotte cambiano forma come le altre costruzioni (degrado comune + pezzi che mancano)', () => {
  for (const type of CRYPT_TYPES) {
    for (let v = 0; v < CRYPT_VARIANTS; v++) {
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
    assert.deepEqual(Object.keys(m.geometries).sort(), ['glow', 'solid'], `${type}: solido e luce`);
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
