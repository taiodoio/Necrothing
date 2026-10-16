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
import { DECAY, EXPANSION, RELEASE_LOCKS, WISPS, XP } from '../src/game/balance.ts';

const NOW = new Date('2026-10-09T12:00:00Z');
const later = (days) => new Date(NOW.getTime() + days * 86_400_000);

function spot(s, fp = [2, 2], near = [22, 44]) {
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

test('simulazione: luci e costruzioni si sporcano e si rompono con tempi larghi e casuali (le tombe no)', async () => {
  const { placeableDecayDays } = await import('../src/game/simulation.ts');
  const s = createNewGame(NOW, 4);
  const lamp = s.placeables.find((p) => p.type === 'lamp_post');
  const tree = s.placeables.find((p) => p.type === 'dead_tree');
  const d = placeableDecayDays(lamp);
  assert.ok(d.dirty >= DECAY.placeableDirtyDays[0] && d.dirty <= DECAY.placeableDirtyDays[1]);
  assert.ok(d.broken - d.dirty >= DECAY.placeableBreakDays[0] && d.broken - d.dirty <= DECAY.placeableBreakDays[1]);
  assert.deepEqual(placeableDecayDays(lamp), d, 'stabili: riaprendo il gioco non cambiano');
  runCatchUp(s, later(d.dirty - 1));
  assert.equal(lamp.dirty, false, 'non ancora');
  runCatchUp(s, later(d.dirty));
  assert.equal(lamp.dirty, true);
  assert.equal(lamp.broken, false);
  assert.equal(tree.dirty, false, 'l’ambiente non decade');
  runCatchUp(s, later(d.broken));
  assert.equal(lamp.broken, true);
  assert.throws(() => R.toggleLight(s, lamp.id), /rotto/);
  // tempi diversi da oggetto a oggetto e da una cura all'altra (non sempre ogni N giorni)
  const days = new Set(s.placeables.map((p) => placeableDecayDays(p).dirty));
  assert.ok(days.size >= 4, `tempi vari: ${[...days]}`);
  const cycles = new Set([0, 10, 20, 30, 40].map((k) => placeableDecayDays({ id: lamp.id, caredAt: later(k).toISOString() }).dirty));
  assert.ok(cycles.size >= 2, 'ogni cura ha i suoi tempi');
});

test('bottega: acquisto, pezzi unici, vendita al 70%', () => {
  const s = createNewGame(NOW, 5);
  s.player.wisps = 100;
  R.buy(s, 'lantern', 3, NOW);
  assert.equal(s.inventory.lantern, 4);
  assert.equal(s.player.wisps, 100 - 15);
  s.player.xp = 2000; // rango 3
  R.buy(s, 'fountain', 1, NOW);
  assert.throws(() => R.buy(s, 'fountain', 1, NOW), /unico/);
  assert.throws(() => R.buy(s, 'well', 1, NOW), /unico/, 'il pozzo è già nel cimitero iniziale');
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
  const to = spot(s, [1, 1], [40, 46]);
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

test('espansione a scelta: il prestigio sblocca, il giocatore amplia o stringe', () => {
  const s = createNewGame(NOW, 10);
  ['toys', 'tools', 'plants', 'clothing', 'vehicles', 'expensive', 'other', 'toys', 'tools'].forEach((category, i) => {
    const p = spot(s);
    R.bury(s, draft({ name: `Oggetto ${i}`, category }), p.x, p.y, NOW);
  });
  s.graves.forEach((g) => { g.hasFlowers = true; g.dirty = false; g.weeds = false; });
  const { unlocked } = R.afterAction(s, NOW);
  assert.ok(computePrestige(s) >= EXPANSION[1].minPrestige);
  assert.ok(unlocked >= 1, 'nuova area sbloccata');
  assert.equal(s.world.expansionLevel, 0, 'ma il recinto non si allarga da solo');
  const level = s.world.unlockedLevel;
  // lo sblocco non torna indietro se il prestigio cala
  s.graves.forEach((g) => { g.hasFlowers = false; g.dirty = true; });
  assert.equal(R.afterAction(s, NOW).unlocked, null);
  assert.equal(s.world.unlockedLevel, level);
  // oltre il livello sbloccato non si va
  assert.throws(() => R.setExpansionLevel(s, level + 1), /si sblocca/);
  // ampliare
  R.setExpansionLevel(s, level);
  assert.equal(s.world.expansionLevel, level);
  // un oggetto nella terra nuova: stringere è bloccato finché non torna dentro
  const big = areaForLevel(level), small = areaForLevel(0);
  const lamp = { id: 'fuori', type: 'lamp_post', x: big.x, y: big.y, rot: 0, variant: 0, dirty: false, broken: false, lit: true, placedAt: NOW.toISOString(), caredAt: NOW.toISOString() };
  s.placeables.push(lamp);
  s.world.looseWisps.push({ id: 'w-fuori', x: big.x + 1, y: big.y + 1 });
  assert.deepEqual(R.outsideArea(s, 0).map((o) => o.id), ['fuori']);
  assert.deepEqual(R.outsideArea(s, level), [], 'nell\'area grande c\'entra');
  assert.throws(() => R.setExpansionLevel(s, 0), /fuori dall'area/);
  assert.equal(s.world.expansionLevel, level);
  lamp.x = small.x + 2; lamp.y = small.y + 2;
  R.setExpansionLevel(s, 0);
  assert.equal(s.world.expansionLevel, 0);
  assert.ok(!s.world.looseWisps.some((w) => w.id === 'w-fuori'), 'i fuochi fatui rimasti fuori svaniscono');
});

test('scheda del Custode: il recinto mostrato è quello vero, non quello del prestigio del momento', async () => {
  const { expansionStatus } = await import('../src/game/world.ts');
  const s = createNewGame(NOW, 5);
  // allargato quando il prestigio era alto; ora il prestigio è sceso sotto la soglia
  s.world.unlockedLevel = 1; s.world.expansionLevel = 1;
  assert.ok(computePrestige(s) < EXPANSION[1].minPrestige);
  const st = expansionStatus(s);
  assert.equal(st.label, EXPANSION[1].label);
  assert.equal(st.size, 40);
  assert.equal(st.next.label, EXPANSION[2].label, 'la prossima area è quella dopo lo sblocco');
  // sbloccato ma non ancora ampliato
  s.world.unlockedLevel = 2; s.world.expansionLevel = 0;
  assert.equal(expansionStatus(s).size, 34);
  assert.equal(expansionStatus(s).unlocked, 2);
});

test('espansione: i salvataggi con un recinto già allargato lo tengono (sbloccato e già notificato)', async () => {
  const { normalizeSave } = await import('../src/game/state.ts');
  const old = createNewGame(NOW, 4);
  old.world.expansionLevel = 2;
  delete old.world.unlockedLevel;
  delete old.world.notifiedLevel;
  const s = normalizeSave(JSON.parse(JSON.stringify(old)));
  assert.equal(s.world.expansionLevel, 2);
  assert.equal(s.world.unlockedLevel, 2);
  assert.equal(s.world.notifiedLevel, 2);
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

test('salvataggio v1 (mappa 48) migrato: oggetti spostati dentro il nuovo recinto', async () => {
  const { normalizeSave } = await import('../src/game/state.ts');
  const old = createNewGame(NOW, 3);
  old.version = 1;
  old.graves = [{ ...old.graves[0], x: 19, y: 22 }];
  old.placeables = [{ ...old.placeables[0], x: 14, y: 15 }];
  old.world.expansionLevel = 2;
  const s = normalizeSave(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, 2);
  assert.deepEqual([s.graves[0].x, s.graves[0].y], [27, 30]);
  const area = areaForLevel(s.world.expansionLevel);
  const p = s.placeables[0];
  assert.ok(p.x >= area.x && p.y >= area.y, 'la bottega è dentro il recinto');
});

test('animale domestico: la ciotola non è più in bottega; i salvataggi che l’avevano vengono rimborsati', async () => {
  const { normalizeSave } = await import('../src/game/state.ts');
  const { CATALOG } = await import('../src/game/catalog.ts');
  assert.equal(CATALOG.skeleton_pet, undefined);
  assert.ok(CATALOG.pet_house);
  const s = createNewGame(NOW, 31);
  const old = JSON.parse(JSON.stringify(s));
  old.placeables.push({ ...old.placeables[0], id: 'ciotola', type: 'skeleton_pet', x: 20, y: 40, variant: 1 });
  old.inventory.skeleton_pet = 1;
  const wisps = old.player.wisps;
  const fixed = normalizeSave(old);
  assert.ok(!fixed.placeables.some((p) => p.type === 'skeleton_pet'));
  assert.equal(fixed.inventory.skeleton_pet, undefined);
  assert.equal(fixed.player.wisps, wisps + 36);
});

test('Albero dei ricordi: si sblocca a 20 tombe, accoglie una tomba (libera lo spazio) e ne fa tornare il fantasma', () => {
  const s = createNewGame(NOW, 42);
  s.player.wisps = 1000;
  s.player.xp = 99999;
  const base = s.graves.length; // anche le tombe del vecchio custode contano
  assert.equal(R.shopAvailability(s, 'memory_tree', NOW), 'ok', 'per i test l’albero è subito disponibile');
  RELEASE_LOCKS.minGraves = true;
  assert.equal(R.shopAvailability(s, 'memory_tree', NOW), 'graves', 'nella versione finale: bloccato sotto le 20 tombe');
  for (let i = base; i < 20; i++) { const p = spot(s); R.bury(s, draft({ name: `Oggetto ${i}` }), p.x, p.y, NOW); }
  assert.equal(R.graveTotal(s), 20);
  assert.equal(R.shopAvailability(s, 'memory_tree', NOW), 'ok');
  RELEASE_LOCKS.minGraves = false;
  // senza albero non si affida nulla
  assert.throws(() => R.entrustGrave(s, s.graves[0].id, NOW));
  R.buy(s, 'memory_tree', 1, NOW);
  assert.equal(s.player.wisps, 1000 - 150 + WISPS.burial * (20 - base));
  const at = spot(s, [5, 5]);
  R.placeFromInventory(s, 'memory_tree', at.x, at.y, 0, NOW);
  assert.ok(R.memoryTree(s));
  assert.equal(R.shopAvailability(s, 'memory_tree', NOW), 'owned', 'pezzo unico');
  // si affida anche una tomba del lascito: sparisce, lo spazio si libera, il ricordo resta
  const g = s.graves.find((x) => x.legacy);
  const wisps = s.player.wisps;
  const res = R.entrustGrave(s, g.id, NOW);
  assert.ok(!s.graves.some((x) => x.id === g.id));
  assert.ok(canPlaceAt(g.x, g.y, [2, 2], buildOccupancy(s), areaForLevel(s.world.expansionLevel)), 'lo spazio è di nuovo libero');
  assert.equal(s.entrusted.length, 1);
  assert.equal(s.entrusted[0].grave.name, g.name);
  assert.equal(s.player.wisps, wisps + WISPS.burial, 'ricompensa come una sepoltura');
  assert.ok(res.xp > 0);
  assert.ok(s.memories.some((m) => m.graveId === g.id && m.type === 'entrusted'));
  assert.equal(R.graveTotal(s), 20, 'le tombe affidate contano ancora');
  // il fantasma del ricordo: ricompensa classica, la visita resta nella sua storia
  const w2 = s.player.wisps;
  const visit = R.interactRoamer(s, 'ghost', NOW, { memoryId: g.id });
  assert.equal(s.player.wisps, w2 + WISPS.ghost);
  assert.equal(visit.xp, XP.ghost);
  assert.match(visit.message, new RegExp(g.name));
  assert.equal(s.entrusted[0].ghostVisits, 1);
  // l'albero fa comparire i fantasmi dei suoi ricordi (solo se c'è l'albero)
  const rng = createRng(7);
  let seen = 0;
  for (let i = 0; i < 400; i++) seen += computeSpawns(s, true, rng).filter((q) => q.memoryId === g.id).length;
  assert.ok(seen > 5, `fantasmi dei ricordi: ${seen}`);
  const noTree = { ...s, placeables: s.placeables.filter((p) => p.type !== 'memory_tree') };
  let none = 0;
  for (let i = 0; i < 400; i++) none += computeSpawns(noTree, true, rng).filter((q) => q.memoryId).length;
  assert.equal(none, 0);
});

test('salvataggio vecchio senza ricordi affidati: lista vuota', async () => {
  const { normalizeSave } = await import('../src/game/state.ts');
  const s = createNewGame(NOW, 42);
  delete s.entrusted;
  assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(s))).entrusted, []);
});

test('i pezzi in serie (sentieri, muretti, staccionate, inferriate) non si sporcano e non si rompono', async () => {
  const { normalizeSave } = await import('../src/game/state.ts');
  const s = createNewGame(NOW, 4);
  const path = s.placeables.find((p) => p.type === 'path_stone');
  const lamp = s.placeables.find((p) => p.type === 'lamp_post');
  runCatchUp(s, later(60));
  assert.equal(path.dirty, false);
  assert.equal(path.broken, false);
  assert.equal(lamp.broken, true, 'le luci sì');
  // salvataggi vecchi: i sentieri sporchi tornano puliti
  const old = JSON.parse(JSON.stringify(s));
  old.placeables.find((p) => p.type === 'path_stone').dirty = true;
  old.placeables.find((p) => p.type === 'path_stone').broken = true;
  const fixed = normalizeSave(old).placeables.find((p) => p.type === 'path_stone');
  assert.equal(fixed.dirty || fixed.broken, false);
});

test('becchino in visita: sistema metà delle cose sporche; prete: la prima preghiera benedice il cimitero', () => {
  const s = createNewGame(NOW, 7);
  runCatchUp(s, later(6)); // un po' di cose sporche, non ancora rotte
  const dirty = [...s.graves.filter((g) => !g.broken && (g.dirty || g.weeds)), ...s.placeables.filter((p) => !p.broken && p.dirty)];
  assert.ok(dirty.length >= 2, `cose sporche: ${dirty.length}`);
  const round = R.gravediggerRound(s);
  assert.equal(round.length, Math.ceil(dirty.length / 2), 'metà, per eccesso');
  assert.ok(round.every((id) => dirty.some((d) => d.id === id)), 'solo cose sporche (non rotte)');
  const w = s.player.wisps;
  for (const id of round) assert.ok(R.gravediggerClean(s, id, later(40)).xp > 0);
  assert.equal(s.player.wisps, w + round.length * WISPS.gravediggerPerGrave);
  const still = [...s.graves.filter((g) => !g.broken && (g.dirty || g.weeds)), ...s.placeables.filter((p) => !p.broken && p.dirty)];
  assert.equal(still.length, dirty.length - round.length, 'il resto tocca al Custode');
  assert.equal(R.gravediggerClean(s, round[0], later(40)).xp, 0, 'già pulita: niente doppio premio');
  // prete
  const g = s.graves[0];
  const first = R.priestBless(s, g.id, later(40), true);
  assert.ok(first.wisps > 0 && s.world.blessingUntil);
  assert.equal(R.priestBless(s, s.graves[1].id, later(40), false).wisps, 0);
  assert.ok(s.memories.some((m) => m.graveId === g.id && m.type === 'blessing'));
});

test('tombe trascurate: dal primo segno d’incuria (anche solo erbacce) si rompono dopo 10 giorni, senza bloccarsi su «sporca»', async () => {
  const { runCatchUp } = await import('../src/game/simulation.ts');
  const { DECAY } = await import('../src/game/balance.ts');
  const start = new Date('2026-10-01T09:00:00Z');
  const day = (n) => new Date(start.getTime() + n * 86400000);
  const reset = (s) => s.graves.forEach((g) => { g.dirty = false; g.weeds = false; g.broken = false; g.dirtySince = null; g.hasFlowers = false; g.flowersAt = null; });
  // giocando ogni giorno senza curarle: prima o poi si rompono tutte
  for (const seed of [42, 7, 99]) {
    const s = createNewGame(start, seed);
    reset(s);
    for (let d = 1; d <= 45; d++) runCatchUp(s, day(d));
    assert.ok(s.graves.every((g) => g.broken), `seed ${seed}: tutte rotte dopo 45 giorni di incuria`);
  }
  // solo erbacce: il conto parte lo stesso e dopo 10 giorni è rotta
  const w = createNewGame(start, 3);
  reset(w);
  w.world.lastSimulationAt = start.toISOString();
  const g = w.graves[0];
  g.weeds = true; g.dirtySince = start.toISOString();
  runCatchUp(w, day(DECAY.graveBreakDays - 1));
  assert.equal(g.broken, false);
  runCatchUp(w, day(DECAY.graveBreakDays));
  assert.equal(g.broken, true, 'con le sole erbacce si rompe');
  // lunga assenza: l'incuria è iniziata mentre eri via, non all'apertura → al ritorno alcune sono già rotte
  const a = createNewGame(start, 7);
  reset(a);
  a.world.lastSimulationAt = start.toISOString();
  runCatchUp(a, day(25));
  assert.ok(a.graves.some((x) => x.broken), 'dopo 25 giorni via qualcuna è già rotta');
  for (const x of a.graves) if (x.dirtySince) assert.ok(new Date(x.dirtySince) <= day(25) && new Date(x.dirtySince) >= start, 'incuria datata dentro l’assenza');
  // fiori appassiti: lo sporco parte da quando sono appassiti
  const f = createNewGame(start, 5);
  reset(f);
  f.world.lastSimulationAt = start.toISOString();
  f.graves[0].hasFlowers = true; f.graves[0].flowersAt = start.toISOString();
  runCatchUp(f, day(20));
  assert.equal(f.graves[0].broken, true, 'fiori appassiti al giorno 3 → rotta al giorno 13');
  // pulirla ferma il conto
  const c = createNewGame(start, 8);
  reset(c);
  c.world.lastSimulationAt = start.toISOString();
  c.graves[0].dirty = true; c.graves[0].dirtySince = start.toISOString();
  R.cleanGrave(c, c.graves[0].id, day(5));
  runCatchUp(c, day(12));
  assert.equal(c.graves[0].broken, false, 'pulita: il conto riparte da zero');
});

test('salvataggi vecchi: tombe trascurate senza data d’inizio ricevono un inizio, così possono rompersi', async () => {
  const { normalizeSave } = await import('../src/game/state.ts');
  const old = createNewGame(NOW, 4);
  old.graves[0].weeds = true; old.graves[0].dirty = false; old.graves[0].broken = false; old.graves[0].dirtySince = null;
  const s = normalizeSave(JSON.parse(JSON.stringify(old)));
  assert.ok(s.graves[0].dirtySince);
});

// ── Extra: bicicletta, Bar degli zombie, Orto dei cervelli ──────────────

function richAt(rankXp) {
  const s = createNewGame(NOW, 21);
  s.player.xp = rankXp; s.player.wisps = 500;
  return s;
}

function placeBusiness(s, type) {
  R.buy(s, type, 1, NOW);
  const fp = rotatedFootprint(type, 0);
  const at = spot(s, fp);
  return R.placeFromInventory(s, type, at.x, at.y, 0, NOW);
}

test('bicicletta: Extra dal rango 2 a 50 fuochi fatui, pezzo unico, non si posa sulla mappa', () => {
  const s = richAt(0);
  // in prova si compra a qualsiasi rango; nella versione finale serve il rango 2
  assert.equal(R.shopAvailability(s, 'bike', NOW), 'ok');
  RELEASE_LOCKS.earlyRank = true;
  assert.equal(R.shopAvailability(s, 'bike', NOW), 'rank');
  RELEASE_LOCKS.earlyRank = false;
  s.player.xp = 500;
  assert.equal(R.shopAvailability(s, 'bike', NOW), 'ok');
  R.buy(s, 'bike', 1, NOW);
  assert.equal(s.player.wisps, 450);
  assert.equal(R.shopAvailability(s, 'bike', NOW), 'owned');
  assert.throws(() => R.placeFromInventory(s, 'bike', 30, 30, 0, NOW), /Non si piazza/);
  assert.equal(R.ownedCount(s, 'bike'), 1);
});

test('bicicletta: il Custode va al doppio della velocità', async () => {
  const { CUSTODE_SPEED } = await import('../src/game/balance.ts');
  assert.equal(CUSTODE_SPEED.walk * CUSTODE_SPEED.bike, CUSTODE_SPEED.walk * 2);
});

test('bar e orto: incasso giornaliero casuale ma stabile, entro i limiti, con tetto e riscossione', async () => {
  const { BUSINESS } = await import('../src/game/balance.ts');
  const s = richAt(1500);
  const bar = placeBusiness(s, 'zombie_bar');
  const farm = placeBusiness(s, 'brain_farm');
  // il giorno della posa non c'è ancora niente
  assert.equal(R.businessPending(s, bar.id, NOW), 0);
  assert.throws(() => R.collectBusiness(s, bar.id, NOW), /niente da riscuotere/);
  // un giorno dopo: un incasso entro [min, max], sempre lo stesso a ogni lettura
  const d1 = later(1);
  for (const [p, b] of [[bar, BUSINESS.zombie_bar], [farm, BUSINESS.brain_farm]]) {
    const n = R.businessPending(s, p.id, d1);
    assert.ok(n >= b.perDay[0] && n <= b.perDay[1], `${p.type}: ${n}`);
    assert.equal(R.businessPending(s, p.id, d1), n);
  }
  // giorni diversi danno incassi diversi (casuali, non sempre uguali)
  const days = new Set(Array.from({ length: 20 }, (_, i) => R.businessDayIncome(bar.id, 'zombie_bar', 20000 + i)));
  assert.ok(days.size > 1);
  // dopo tanti giorni si ferma al tetto
  assert.equal(R.businessPending(s, bar.id, later(30)), BUSINESS.zombie_bar.cap);
  assert.equal(R.businessPending(s, farm.id, later(30)), BUSINESS.brain_farm.cap);
  // riscossione: i fuochi fatui arrivano e il conto riparte
  const before = s.player.wisps;
  const n = R.businessPending(s, bar.id, later(2));
  const res = R.collectBusiness(s, bar.id, later(2));
  assert.equal(res.wisps, n);
  assert.equal(s.player.wisps, before + n);
  assert.equal(R.businessPending(s, bar.id, later(2)), 0);
  assert.ok(R.businessPending(s, bar.id, later(3)) > 0);
  // rotto non incassa
  bar.broken = true;
  assert.equal(R.businessPending(s, bar.id, later(5)), 0);
});

test('bar e orto: rango 3, pezzi unici, attirano zombie anche senza tombe aperte', () => {
  const s = richAt(500);
  assert.equal(R.shopAvailability(s, 'zombie_bar', NOW), 'ok'); // in prova
  RELEASE_LOCKS.earlyRank = true;
  assert.equal(R.shopAvailability(s, 'zombie_bar', NOW), 'rank');
  RELEASE_LOCKS.earlyRank = false;
  s.player.xp = 1500;
  placeBusiness(s, 'zombie_bar');
  placeBusiness(s, 'brain_farm');
  assert.equal(R.shopAvailability(s, 'zombie_bar', NOW), 'owned');
  const b = countBuildings(s);
  assert.equal(b.openGraves, 0);
  assert.equal(b.zombieBar, 1);
  assert.equal(b.brainFarm, 1);
  const rng = createRng(3);
  let zombies = 0;
  for (let i = 0; i < 4000; i++) if (computeSpawns(s, true, rng).some((x) => x.kind === 'zombie')) zombies++;
  // ~9% a ogni giro (0,06 + 0,03)
  assert.ok(zombies > 4000 * 0.07 && zombies < 4000 * 0.11, `zombie ${zombies}`);
  // senza bar né orto (e senza tombe aperte) niente zombie
  const empty = createNewGame(NOW, 21);
  assert.ok(!Array.from({ length: 500 }, () => computeSpawns(empty, true, rng)).flat().some((x) => x.kind === 'zombie'));
});

test('vista dall’alto tolta: i salvataggi tornano alla vista obliqua', async () => {
  const { normalizeSave } = await import('../src/game/state.ts');
  const old = createNewGame(NOW, 4);
  old.settings.camera = 'top';
  const s = normalizeSave(JSON.parse(JSON.stringify(old)));
  assert.equal(s.settings.camera, 'angled');
});
