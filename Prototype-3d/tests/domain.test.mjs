import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame } from '../src/game/state.ts';
import * as R from '../src/game/rules.ts';
import { runCatchUp, liveTick } from '../src/game/simulation.ts';
import { computeSpawns, countBuildings } from '../src/game/spawn.ts';
import { createRng } from '../src/game/rng.ts';
import { areaForLevel, buildOccupancy, canPlaceAt, computePrestige, detectDistricts, nearestFreeSpot } from '../src/game/world.ts';
import { CATALOG_LIST, rotatedFootprint } from '../src/game/catalog.ts';
import { evaluateAchievements, rankForXp } from '../src/game/progression.ts';
import { DECAY, EXPANSION, WISPS, XP } from '../src/game/balance.ts';

const NOW = new Date('2026-10-09T12:00:00Z');
const later = (days) => new Date(NOW.getTime() + days * 86_400_000);

function spot(s, fp = [2, 2], near = [17, 31]) {
  return nearestFreeSpot(near[0], near[1], fp, buildOccupancy(s), areaForLevel(s.world.expansionLevel));
}

function draft(over = {}) {
  return { ...R.emptyDraft(NOW), name: 'Caricatore', category: 'electronics', deathCause: 'broken_cable', ...over };
}

test('nuova partita: bottega pre-piazzata e posizioni dentro il recinto', () => {
  const s = createNewGame(NOW, 42);
  const area = areaForLevel(0);
  assert.equal(s.placeables.filter((p) => p.type === 'shop').length, 1);
  const occ = buildOccupancy(s);
  // nessuna sovrapposizione: ogni cella ha un solo proprietario
  let cells = 0;
  for (const g of s.graves) cells += 4;
  for (const p of s.placeables) { const [w, h] = rotatedFootprint(p.type, p.rot); cells += w * h; }
  assert.equal(occ.owner.size, cells);
  for (const p of s.placeables) {
    assert.ok(p.x >= area.x && p.y >= area.y && p.x < area.x + area.w && p.y < area.y + area.h, p.type);
  }
  assert.equal(s.player.wisps, WISPS.start);
});

test('sepoltura: XP, fuochi, occupazione e limite astratto giornaliero', () => {
  const s = createNewGame(NOW, 1);
  const a = spot(s);
  const { grave, result } = R.bury(s, draft(), a.x, a.y, NOW);
  assert.equal(result.xp, XP.burialPhysical);
  assert.equal(s.player.xp, XP.burialPhysical);
  assert.throws(() => R.bury(s, draft({ name: 'Altro' }), a.x, a.y, NOW), R.GameError);
  const b = spot(s);
  R.bury(s, draft({ name: 'Il lunedì', category: 'abstract' }), b.x, b.y, NOW);
  const c = spot(s);
  assert.throws(() => R.bury(s, draft({ name: 'La pazienza', category: 'abstract' }), c.x, c.y, NOW), /astratta/);
  assert.equal(s.graves.find((g) => g.id === grave.id).name, 'Caricatore');
});

test('fiori solo su tomba pulita; pulizia e riparazione', () => {
  const s = createNewGame(NOW, 2);
  const legacy = s.graves[0]; // sporca
  assert.throws(() => R.bringFlowers(s, legacy.id, NOW), /sporca/);
  R.cleanGrave(s, legacy.id, NOW);
  const r = R.bringFlowers(s, legacy.id, NOW);
  assert.equal(r.xp, XP.flowers);
  assert.equal(legacy.hasFlowers, true);
  legacy.broken = true;
  assert.throws(() => R.cleanGrave(s, legacy.id, NOW), /riparata/);
  const before = s.player.wisps;
  R.repairGrave(s, legacy.id, NOW);
  assert.equal(s.player.wisps, before - DECAY.graveRepairCost);
  assert.equal(legacy.broken, false);
});

test('simulazione: fiori appassiti → sporca → rotta dopo 10 giorni', () => {
  const s = createNewGame(NOW, 3);
  const g = s.graves[1]; // pulita
  R.bringFlowers(s, g.id, NOW);
  runCatchUp(s, later(3));
  assert.equal(g.hasFlowers, false);
  assert.equal(g.dirty, true);
  runCatchUp(s, later(14));
  assert.equal(g.broken, true);
});

test('simulazione: luci e costruzioni si sporcano a 3 giorni e si rompono a 7', () => {
  const s = createNewGame(NOW, 4);
  const lamp = s.placeables.find((p) => p.type === 'lamp_post');
  const tree = s.placeables.find((p) => p.type === 'dead_tree');
  runCatchUp(s, later(3));
  assert.equal(lamp.dirty, true);
  assert.equal(lamp.broken, false);
  assert.equal(tree.dirty, false, 'l’ambiente non decade');
  runCatchUp(s, later(7));
  assert.equal(lamp.broken, true);
  assert.throws(() => R.toggleLight(s, lamp.id), /rotto/);
});

test('bottega: acquisto, pezzi unici, vendita al 70%', () => {
  const s = createNewGame(NOW, 5);
  s.player.wisps = 100;
  R.buy(s, 'lantern', 3, NOW);
  assert.equal(s.inventory.lantern, 4);
  assert.equal(s.player.wisps, 100 - 15);
  s.player.xp = 2000; // rango 3
  R.buy(s, 'well', 1, NOW);
  assert.throws(() => R.buy(s, 'well', 1, NOW), /unico/);
  const w = s.player.wisps;
  R.sell(s, 'lantern', 1);
  assert.equal(s.player.wisps, w + Math.round(5 * 0.7));
  assert.throws(() => R.sell(s, 'shop', 1), /Bottega|possiedi/);
  assert.equal(R.shopAvailability(s, 'xmas_tree', NOW), 'season');
  assert.equal(R.shopAvailability(s, 'xmas_tree', new Date('2026-12-10T10:00:00Z')), 'ok');
});

test('modifica: piazza, ruota, sposta, riponi; la bottega non si elimina', () => {
  const s = createNewGame(NOW, 6);
  s.inventory.fence_iron = 1;
  const at = spot(s, [1, 1]);
  const p = R.placeFromInventory(s, 'fence_iron', at.x, at.y, 0, NOW);
  assert.equal(s.inventory.fence_iron, undefined);
  R.rotateEntity(s, p.id);
  assert.equal(p.rot, 1);
  const to = spot(s, [1, 1], [30, 33]);
  R.moveEntity(s, p.id, to.x, to.y);
  assert.deepEqual([p.x, p.y], [to.x, to.y]);
  R.storePlaceable(s, p.id);
  assert.equal(s.inventory.fence_iron, 1);
  const shop = s.placeables.find((x) => x.type === 'shop');
  assert.throws(() => R.storePlaceable(s, shop.id), /Bottega/);
});

test('becchino: pulisce gratis le tombe vicine', () => {
  const s = createNewGame(NOW, 7);
  const dirty = s.graves.filter((g) => g.dirty);
  const r = R.interactRoamer(s, 'gravedigger', NOW, { x: 21, y: 23 });
  assert.ok(r.xp > 0);
  assert.ok(dirty.some((g) => !g.dirty));
});

test('spawn: santuario e mausoleo alzano le probabilità', () => {
  const s = createNewGame(NOW, 8);
  const probs = (state) => {
    const seen = [];
    const rng = { next: () => 0.99, int: () => 0, range: (a) => a, pick: (a) => a[0], chance: (p) => { seen.push(p); return false; } };
    computeSpawns(state, false, rng);
    return seen;
  };
  const base = probs(s);
  s.placeables.push({ ...s.placeables[0], id: 'sh', type: 'shrine' });
  const withShrine = probs(s);
  assert.ok(withShrine[3] > base[3], 'prete più probabile');
  assert.equal(countBuildings(s).shrine, 1);
});

test('spawn deterministico con lo stesso seed', () => {
  const s = createNewGame(NOW, 9);
  const a = computeSpawns(s, true, createRng('x'));
  const b = computeSpawns(s, true, createRng('x'));
  assert.deepEqual(a, b);
  const t = liveTick(createNewGame(NOW, 9), NOW, 1);
  const u = liveTick(createNewGame(NOW, 9), NOW, 1);
  assert.deepEqual(t.spawns, u.spawns);
});

test('espansione monotona: il recinto cresce col prestigio e non si restringe', () => {
  const s = createNewGame(NOW, 10);
  ['toys', 'tools', 'plants', 'clothing', 'vehicles', 'expensive', 'other', 'toys', 'tools'].forEach((category, i) => {
    const p = spot(s);
    R.bury(s, draft({ name: `Oggetto ${i}`, category }), p.x, p.y, NOW);
  });
  s.graves.forEach((g) => { g.hasFlowers = true; g.dirty = false; g.weeds = false; });
  const { expanded } = R.afterAction(s, NOW);
  assert.ok(computePrestige(s) >= EXPANSION[1].minPrestige);
  assert.equal(expanded, true);
  const level = s.world.expansionLevel;
  s.graves.forEach((g) => { g.hasFlowers = false; g.dirty = true; });
  R.afterAction(s, NOW);
  assert.equal(s.world.expansionLevel, level);
});

test('achievement e ranghi', () => {
  const s = createNewGame(NOW, 11);
  const a = spot(s);
  R.bury(s, draft(), a.x, a.y, NOW);
  const fresh = evaluateAchievements(s, NOW).map((a) => a.id);
  assert.ok(fresh.includes('first_burial'));
  assert.equal(rankForXp(1500).level, 3);
});

test('distretti: 4 lapidi gotiche vicine formano un quartiere', () => {
  const graves = [0, 1, 2, 3].map((i) => ({ id: `g${i}`, x: i * 2, y: 0, graveType: 'gothic', category: 'other' }));
  assert.equal(detectDistricts(graves)[0].theme, 'gothic');
});

test('catalogo: ogni voce ha footprint valido e costi coerenti', () => {
  assert.ok(CATALOG_LIST.length >= 50);
  for (const d of CATALOG_LIST) {
    assert.ok(d.footprint[0] >= 1 && d.footprint[1] >= 1, d.id);
    assert.ok(d.cost >= 0 && d.minRank >= 1 && d.minRank <= 5, d.id);
  }
  const area = areaForLevel(4);
  assert.ok(canPlaceAt(area.x, area.y, [3, 3], { owner: new Map(), blocked: new Set() }, area));
});
