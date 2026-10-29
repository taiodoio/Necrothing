// Progressione ed economia: curva dei ranghi, ricompense che non si sfruttano,
// degrado con il tetto dell'assenza, obiettivi d'esperienza (stime dal
// simulatore, scripts/sim-economy.mjs, con le sue ipotesi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame } from '../src/game/state.ts';
import * as R from '../src/game/rules.ts';
import { runCatchUp } from '../src/game/simulation.ts';
import { RANKS, XP, ECONOMY, DECAY, PET_GIFT } from '../src/game/balance.ts';
import { rankForXp } from '../src/game/progression.ts';
import { areaForLevel, buildOccupancy, computePrestige, nearestFreeSpot } from '../src/game/world.ts';
import { PetGifts } from '../src/game/petGifts.ts';
import { exploits, runScenario } from '../scripts/sim-economy.mjs';

const NOW = new Date('2026-11-02T20:00:00Z');
const hours = (h) => new Date(NOW.getTime() + h * 3_600_000);
const spot = (s) => nearestFreeSpot(30, 40, [2, 2], buildOccupancy(s), areaForLevel(s.world.expansionLevel));
const draft = (over = {}) => ({ ...R.emptyDraft(NOW), name: 'Caricatore', category: 'electronics', deathCause: 'broken_cable', ...over });
const bury = (s, at = NOW, over) => { const p = spot(s); return R.bury(s, draft(over), p.x, p.y, at).grave; };

test('curva: soglie centralizzate e crescenti, salti sempre più lunghi', () => {
  assert.deepEqual(RANKS.map((r) => r.minXp), [0, 200, 800, 2200, 5000]);
  const jumps = RANKS.slice(1).map((r, i) => r.minXp - RANKS[i].minXp);
  for (let i = 1; i < jumps.length; i++) assert.ok(jumps[i] > jumps[i - 1], 'la crescita rallenta');
});

test('nessun tetto giornaliero: dieci sepolture lo stesso giorno danno tutte la loro ricompensa', () => {
  const s = createNewGame(NOW, 3);
  const xp = s.player.xp;
  for (let i = 0; i < 10; i++) bury(s, NOW, { name: `Oggetto ${i}` });
  assert.equal(s.player.xp - xp, 10 * XP.burialPhysical);
});

test('riesumare entro 24 ore annulla la ricompensa della sepoltura; dopo è gratis', () => {
  const s = createNewGame(NOW, 3);
  const xp0 = s.player.xp, w0 = s.player.wisps, earned0 = s.player.counters.wispsEarned, total0 = R.graveTotal(s);
  const g = bury(s);
  assert.ok(R.exhumeRevokes(g, hours(ECONOMY.exhumeRefundHours - 1)));
  const res = R.exhumeGrave(s, g.id, hours(ECONOMY.exhumeRefundHours - 1));
  assert.deepEqual([s.player.xp, s.player.wisps, s.player.counters.wispsEarned, R.graveTotal(s)], [xp0, w0, earned0, total0], 'come se non ci fosse stata');
  assert.equal(res.xp, -XP.burialPhysical);
  assert.match(res.message, /non conta/);
  // dopo 24 ore: riesumare non toglie nulla, e la sepoltura conta per gli sblocchi
  const old = bury(s);
  const xp1 = s.player.xp, w1 = s.player.wisps;
  assert.equal(R.exhumeRevokes(old, hours(ECONOMY.exhumeRefundHours)), false);
  R.exhumeGrave(s, old.id, hours(ECONOMY.exhumeRefundHours));
  assert.deepEqual([s.player.xp, s.player.wisps], [xp1, w1]);
  assert.equal(R.graveTotal(s), total0 + 1);
  // le tombe del vecchio custode non hanno dato nulla: niente da togliere
  assert.equal(R.exhumeRevokes({ ...s.graves.find((x) => x.legacy), createdAt: NOW.toISOString() }, NOW), false);
});

test('riesumare subito non porta mai il saldo sotto zero', () => {
  const s = createNewGame(NOW, 3);
  const g = bury(s, NOW, { category: 'abstract' });
  s.player.wisps = 2; // speso nel frattempo
  R.exhumeGrave(s, g.id, hours(1));
  assert.equal(s.player.wisps, 0);
  assert.ok(s.player.xp >= 0);
});

test('animale: regalo dopo 3–6 coccole, al massimo due per apertura del gioco', () => {
  let r = 0;
  const gifts = new PetGifts(() => (r = (r + 0.37) % 1));
  const got = [];
  for (let i = 0; i < 500; i++) { const n = gifts.interact('cuccia'); if (n !== null) got.push([i, n]); }
  assert.equal(got.length, PET_GIFT.perOpening);
  assert.ok(got[0][0] + 1 >= PET_GIFT.every[0] && got[0][0] + 1 <= PET_GIFT.every[1], 'il primo arriva presto');
  for (const [, n] of got) assert.ok(n >= PET_GIFT.wisps[0] && n <= PET_GIFT.wisps[1]);
  assert.ok(gifts.sated('cuccia'));
  assert.equal(gifts.sated('casetta'), false, 'ogni animale ha i suoi');
  // alla prossima apertura (un tracciatore nuovo) ricomincia
  assert.equal(new PetGifts(() => 0).sated('cuccia'), false);
});

test('affidare all’albero è un rito: 30 XP, niente fuochi fatui', () => {
  const s = createNewGame(NOW, 42);
  s.player.wisps = 1000; s.player.xp = 99_999;
  s.player.counters.exhumed = 20 - s.graves.length;
  R.buy(s, 'memory_tree', 1, NOW);
  const at = nearestFreeSpot(30, 30, [5, 5], buildOccupancy(s), areaForLevel(0));
  R.placeFromInventory(s, 'memory_tree', at.x, at.y, 0, NOW);
  const w = s.player.wisps;
  const res = R.entrustGrave(s, s.graves[0].id, NOW);
  assert.deepEqual([res.xp, res.wisps, s.player.wisps], [XP.entrust, 0, w]);
});

test('prestigio: gli oggetti da pochi fuochi fatui (erba, fango, sentieri) non allargano il recinto', () => {
  const s = createNewGame(NOW, 3);
  const base = computePrestige(s);
  const put = (type, i) => s.placeables.push({ id: `${type}-t${i}`, type, x: 20 + i, y: 46, rot: 0, variant: 0, lit: true, caredAt: NOW.toISOString(), dirty: false, broken: false, createdAt: NOW.toISOString() });
  for (let i = 0; i < 10; i++) put('tall_grass', i);
  assert.equal(computePrestige(s), base, 'l’erba alta (1) non conta');
  put('lantern', 20);
  assert.equal(computePrestige(s), base + 2, 'una lanterna (5) sì');
});

test('assenza lunga: conta al massimo 7 giorni, si torna a un cimitero trascurato ma non rotto', () => {
  const s = createNewGame(NOW, 9);
  for (const g of s.graves) { g.broken = false; g.dirty = false; g.weeds = false; g.dirtySince = null; }
  // una tomba già trascurata da 2 giorni alla partenza: 2 + 7 < 10, non si rompe
  s.graves[0].weeds = true; s.graves[0].dirtySince = hours(-48).toISOString();
  s.world.lastSimulationAt = NOW.toISOString();
  const lamp = s.placeables.find((p) => p.type === 'lamp_post');
  lamp.caredAt = NOW.toISOString();
  runCatchUp(s, hours(30 * 24));
  assert.ok(s.graves.filter((g) => g.dirty || g.weeds).length >= 3, 'segni d’abbandono');
  assert.equal(s.graves.filter((g) => g.broken).length, 0, 'nessuna rotta');
  assert.equal(lamp.broken, false, 'gli oggetti nemmeno');
  assert.equal(DECAY.maxAbsenceDays, 7);
});

test('obiettivi d’esperienza (stime del simulatore): primo rango in pochi minuti, rango 3 in una settimana, poi più lento', () => {
  const s1 = runScenario('S1', 30);
  assert.ok(s1.rank >= 2 && s1.firstRankUpMin <= 5, `prima sessione: rango ${s1.rank}, primo salto a ${s1.firstRankUpMin} min`);
  assert.ok(s1.wisps >= 30, 'qualcosa da comprare subito');
  const s3 = runScenario('S3', 30);
  assert.ok(s3.rank >= 3, `una settimana: rango ${s3.rank}`);
  const s4 = runScenario('S4', 30);
  assert.equal(s4.brokenOnReturn, 0, 'il ritorno dopo un mese non ha tombe rotte');
  assert.ok(s4.wisps >= s3.wisps, 'e nessun debito di riparazioni');
  const m1 = runScenario('M1', 30);
  assert.ok(m1.rank >= 3 && m1.rank < 5, `un mese occasionale: rango ${m1.rank} (il 5 resta lontano)`);
});

test('sfruttamenti chiusi: seppellire+riesumare e coccolare l’animale per un’ora', () => {
  const e = exploits();
  assert.deepEqual(e.buryExhume, { xp: 0, wisps: 0 });
  assert.ok(e.petHour <= PET_GIFT.perOpening * PET_GIFT.wisps[1]);
});

test('rango dalle XP: i nuovi confini', () => {
  assert.equal(rankForXp(199).level, 1);
  assert.equal(rankForXp(200).level, 2);
  assert.equal(rankForXp(5000).level, 5);
});
