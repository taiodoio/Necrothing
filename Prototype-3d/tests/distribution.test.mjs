// Distribuzione e accesso commerciale (Milestone 1: beta Full; la Demo è solo
// predisposta): profili, entitlement, catalogo classificato, progressione,
// limiti della Demo, salvataggi e backup.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { distribution, PROFILES, useProfileForTests } from '../src/config/distribution.ts';
import { demoLimitsActive, entitlement, hasAccess, personalGraveLimit, receiveStoreAccess, simulateAccess } from '../src/game/entitlement.ts';
import { ACCESS, CATALOG, CATALOG_LIST } from '../src/game/catalog.ts';
import { HOUSE_PARTS, HOUSE_ROOFS } from '../src/game/house.ts';
import { GRAVE_TYPE_ACCESS, GRAVE_TYPE_MIN_RANK, GRAVE_TYPES } from '../src/game/graves.ts';
import { LOOK_ACCESS, LOOK_STYLES } from '../src/game/look.ts';
import { FEATURES } from '../src/game/features.ts';
import { createNewGame, normalizeSave, SAVE_VERSION } from '../src/game/state.ts';
import * as R from '../src/game/rules.ts';
import { areaForLevel, buildOccupancy, nearestFreeSpot } from '../src/game/world.ts';
import { packBackup } from '../src/app/backup.ts';

const NOW = new Date('2026-10-09T12:00:00Z');
const fixture = (v) => JSON.parse(fs.readFileSync(new URL(`./fixtures/save-v${v}.json`, import.meta.url), 'utf8'));
const spot = (s) => nearestFreeSpot(30, 40, [2, 2], buildOccupancy(s), areaForLevel(s.world.expansionLevel));
const draft = (name) => ({ ...R.emptyDraft(NOW), name, category: 'electronics', deathCause: 'broken_cable' });

/** Gira `fn` con un profilo (e senza simulazioni), poi torna alla beta. */
function withProfile(id, fn) {
  const before = useProfileForTests(id);
  try { return fn(); } finally { simulateAccess(null); receiveStoreAccess(null); useProfileForTests(before); }
}

// ── Profili ed entitlement ──────────────────────────────────────────────

test('profili: la beta (anche in una build di produzione) ha la Full dalla distribuzione, senza IAP né limiti', () => {
  assert.equal(distribution().id, 'beta-full', 'fuori da Vite (e senza indicazioni) vale la beta');
  assert.deepEqual(entitlement(), { access: 'full', source: 'distribution' });
  assert.equal(hasAccess('full'), true);
  assert.equal(demoLimitsActive(), false);
  assert.equal(personalGraveLimit(), null);
  for (const p of Object.values(PROFILES)) assert.equal(p.iap, false, `${p.id}: niente acquisti in-app nella Milestone 1`);
  assert.equal(PROFILES['store-release'].initialAccess, 'demo');
});

test('simulazione Demo/Full: solo nel profilo development, ignorata altrove', () => {
  assert.equal(simulateAccess('demo'), false);
  assert.equal(entitlement().access, 'full', 'nella beta la simulazione non passa');
  withProfile('store-release', () => { assert.equal(simulateAccess('full'), false); assert.equal(entitlement().access, 'demo'); });
  withProfile('development', () => {
    assert.equal(entitlement().access, 'full');
    assert.equal(simulateAccess('demo'), true);
    assert.deepEqual(entitlement(), { access: 'demo', source: 'simulated' });
    assert.equal(demoLimitsActive(), true);
  });
  assert.equal(entitlement().access, 'full');
});

test('accesso dagli store: preparato per la release, ignorato da beta e sviluppo', () => {
  assert.equal(receiveStoreAccess('demo'), false);
  assert.equal(entitlement().access, 'full');
  withProfile('development', () => assert.equal(receiveStoreAccess('demo'), false));
  withProfile('store-release', () => {
    assert.equal(receiveStoreAccess('full'), true);
    assert.deepEqual(entitlement(), { access: 'full', source: 'store' });
    assert.equal(demoLimitsActive(), false, 'con la Full riconosciuta niente limiti');
  });
});

// ── Catalogo classificato ───────────────────────────────────────────────

test('catalogo: ogni oggetto in una sola classe, e le eccezioni al criterio sono quelle decise', () => {
  const all = [...ACCESS.demo, ...ACCESS.full];
  assert.deepEqual(CATALOG_LIST.map((d) => d.id).filter((id) => !all.includes(id)), [], 'nessun oggetto senza classe');
  assert.equal(new Set(all).size, all.length, 'nessun oggetto in due classi');
  assert.deepEqual(all.filter((id) => !CATALOG[id]), [], 'nessuna voce sconosciuta');
  for (const d of CATALOG_LIST) assert.ok(d.access === 'demo' || d.access === 'full', d.id);
  // criterio: Demo rango 1–2; eccezioni decise: i 6 stagionali e il rifugio dei gatti (Full), i due oggetti della partita nuova (Demo)
  assert.deepEqual(CATALOG_LIST.filter((d) => d.access === 'full' && d.minRank <= 2).map((d) => d.id).sort(),
    ['cat_shelter', 'dead_altar', 'fence_lights', 'giant_web', 'lovers_bench', 'pumpkin_patch', 'skeleton_snowman']);
  assert.deepEqual(CATALOG_LIST.filter((d) => d.access === 'demo' && d.minRank >= 3).map((d) => d.id).sort(), ['angel_statue', 'lamp_post_gothic']);
  const start = new Set(createNewGame(NOW, 1).placeables.map((p) => p.type));
  for (const id of start) assert.equal(CATALOG[id].access, 'demo', `${id} è nella partita nuova`);
  // Albero dei ricordi nella Full; bici e albero ribilanciati come sblocchi
  assert.deepEqual([CATALOG.memory_tree.access, CATALOG.memory_tree.minRank, CATALOG.memory_tree.cost, CATALOG.memory_tree.minGraves], ['full', 3, 150, 20]);
  assert.deepEqual([CATALOG.bike.access, CATALOG.bike.minRank, CATALOG.bike.cost], ['demo', 2, 60]);
});

test('catalogo: Casa, lapidi, aspetto e funzionalità dichiarano il loro accesso', () => {
  for (const it of [...HOUSE_ROOFS, ...HOUSE_PARTS]) assert.equal(it.access, it.minRank >= 3 ? 'full' : 'demo', it.id);
  for (const gt of GRAVE_TYPES) assert.equal(GRAVE_TYPE_ACCESS[gt], GRAVE_TYPE_MIN_RANK[gt] >= 3 ? 'full' : 'demo', gt);
  assert.equal(LOOK_ACCESS.hat?.witch, 'full');
  for (const [key, opts] of Object.entries(LOOK_ACCESS)) for (const v of Object.keys(opts)) assert.ok(LOOK_STYLES[key].some(([x]) => x === v), `${key}.${v} esiste`);
  const ids = FEATURES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of FEATURES) if (f.via) assert.equal(CATALOG[f.via].access, f.access, `${f.id} ha l'accesso del suo oggetto`);
  assert.equal(FEATURES.find((f) => f.id === 'memoryTree').access, 'full');
});

// ── Beta: tutto accessibile, progressione rispettata ────────────────────

test('beta: nessun elemento bloccato dall’accesso commerciale', () => {
  const s = createNewGame(NOW, 5);
  s.player.xp = 99_999; s.player.wisps = 99_999;
  for (const d of CATALOG_LIST) assert.notEqual(R.shopAvailability(s, d.id, NOW), 'full', d.id);
  for (const it of [...HOUSE_ROOFS.filter((r) => r.cost > 0), ...HOUSE_PARTS]) assert.notEqual(R.houseAvailability(s, it.id), 'full', it.id);
  for (const gt of GRAVE_TYPES) assert.equal(R.graveTypeAvailability(s, gt), 'ok', gt);
  for (const [key, opts] of Object.entries(LOOK_STYLES)) for (const [v] of opts) assert.notEqual(R.lookOptionAvailability(s, key, v), 'full', `${key}.${v}`);
});

test('beta: si gioca come chiunque, rango, stagione, traguardi e tombe valgono', () => {
  const s = createNewGame(NOW, 5);
  s.player.wisps = 99_999;
  assert.equal(R.shopAvailability(s, 'zombie_bar', NOW), 'rank');
  assert.equal(R.shopAvailability(s, 'bike', NOW), 'rank');
  assert.equal(R.shopAvailability(s, 'memory_tree', NOW), 'rank');
  assert.equal(R.shopAvailability(s, 'lovers_bench', NOW), 'season', 'a ottobre la panchina di febbraio no');
  assert.equal(R.houseAvailability(s, 'veggie'), 'rank');
  assert.equal(R.graveTypeAvailability(s, 'angel'), 'rank');
  assert.equal(R.lookOptionAvailability(s, 'hat', 'witch'), 'feat');
  assert.throws(() => R.buy(s, 'zombie_bar', 1, NOW), /rango/);
  s.player.xp = 99_999;
  assert.equal(R.shopAvailability(s, 'keeper_lamp', NOW), 'feat');
  assert.equal(R.shopAvailability(s, 'memory_tree', NOW), 'graves');
  assert.deepEqual(R.unlockRequirements(s, 'memory_tree', NOW).map((r) => r.kind), ['graves']);
  assert.equal(R.shopAvailability(s, 'zombie_bar', NOW), 'ok');
});

test('beta: niente limiti della Demo, si seppellisce oltre le 5 tombe', () => {
  const s = createNewGame(NOW, 5);
  for (let i = 0; i < 8; i++) { const p = spot(s); R.bury(s, draft(`Tomba ${i}`), p.x, p.y, NOW); }
  assert.equal(R.personalGraves(s), 8);
  assert.equal(R.canStartBurial(s), true);
});

// ── Demo simulata (solo development) ────────────────────────────────────

test('Demo simulata: la Full è chiusa anche al rango massimo, la progressione resta', () => withProfile('development', () => {
  simulateAccess('demo');
  const s = createNewGame(NOW, 5);
  s.player.xp = 99_999; s.player.wisps = 99_999;
  assert.equal(R.shopAvailability(s, 'zombie_bar', NOW), 'full');
  assert.equal(R.shopAvailability(s, 'memory_tree', NOW), 'full');
  assert.equal(R.shopAvailability(s, 'bike', NOW), 'ok');
  assert.equal(R.shopAvailability(s, 'lamp_post', NOW), 'ok');
  assert.deepEqual(R.unlockRequirements(s, 'memory_tree', NOW).map((r) => r.kind), ['full', 'graves']);
  assert.throws(() => R.buy(s, 'zombie_bar', 1, NOW), /versione completa/);
  assert.equal(R.houseAvailability(s, 'veggie'), 'full');
  assert.equal(R.graveTypeAvailability(s, 'angel'), 'full');
  assert.equal(R.lookOptionAvailability(s, 'hat', 'witch'), 'full');
  // XP e rango restano quelli: l'accesso non tocca i progressi
  assert.equal(s.player.xp, 99_999);
}));

test('Demo simulata: al massimo 5 tombe personali; quelle del vecchio custode non contano', () => withProfile('development', () => {
  simulateAccess('demo');
  const s = createNewGame(NOW, 5);
  assert.equal(s.graves.filter((g) => g.legacy).length, 10, 'le 10 tombe narrative');
  assert.equal(R.personalGraves(s), 0);
  for (let i = 0; i < 5; i++) { assert.ok(R.canStartBurial(s)); const p = spot(s); R.bury(s, draft(`Tomba ${i}`), p.x, p.y, NOW); }
  assert.equal(R.canStartBurial(s), false);
  const p = spot(s);
  assert.throws(() => R.bury(s, draft('La sesta'), p.x, p.y, NOW), /fino a 5 tombe/);
  assert.equal(R.personalGraves(s), 5);
}));

// ── Salvataggi, migrazioni, backup ──────────────────────────────────────

/** Quello che il giocatore ha fatto, da conservare in ogni migrazione. */
const progress = (s) => ({
  xp: s.player.xp, wisps: s.player.wisps, name: s.player.name, look: s.player.look,
  inventory: Object.entries(s.inventory).filter(([, n]) => n > 0).sort(),
  graves: s.graves.map((g) => [g.id, g.name, g.graveType, g.legacy ?? false]),
  memories: s.memories.length, achievements: s.achievements.map((a) => a.id),
  house: s.house, settings: s.settings,
});

test('migrazione v2 → v3: progressi, posizioni e preferenze intatti, e gli acquisti fatti in anticipo restano', () => {
  const raw = fixture(2);
  const s = normalizeSave(structuredClone(raw));
  assert.equal(s.version, SAVE_VERSION);
  assert.deepEqual(progress(s), progress(normalizeSave(structuredClone(raw))), 'ripetibile');
  assert.equal(s.player.xp, raw.player.xp);
  assert.equal(s.player.wisps, raw.player.wisps);
  assert.deepEqual(s.inventory, raw.inventory);
  assert.deepEqual(s.graves.map((g) => [g.id, g.x, g.y]), raw.graves.map((g) => [g.id, g.x, g.y]));
  assert.deepEqual(s.placeables.map((p) => [p.id, p.type, p.x, p.y]), raw.placeables.map((p) => [p.id, p.type, p.x, p.y]));
  assert.deepEqual(s.memories, raw.memories);
  assert.deepEqual(s.house, raw.house);
  const { theme: _theme, ...prefs } = raw.settings; // il tema chiaro è stato tolto: la scelta del tema non c'è più
  assert.deepEqual(s.settings, prefs);
  assert.deepEqual(s.player.look, raw.player.look, 'il cappello da strega indossato resta');
  assert.deepEqual(s.meta, { firstDistribution: 'beta-full', lastDistribution: 'beta-full' });
  // comprati prima dei blocchi: restano tuoi, anche se ora servirebbe il rango
  assert.equal(s.inventory.broom, 1);
  assert.ok(s.placeables.some((p) => p.type === 'zombie_bar'));
  assert.equal(R.shopAvailability(s, 'broom', NOW), 'rank');
});

test('migrazione v1 → v3: mappa spostata, tipi rinominati e rimborsi, nient’altro perso', () => {
  const raw = fixture(1);
  const s = normalizeSave(structuredClone(raw));
  assert.equal(s.version, SAVE_VERSION);
  assert.deepEqual(s.graves.map((g) => [g.x, g.y]), raw.graves.map((g) => [g.x + 8, g.y + 8]));
  assert.equal(s.inventory.zombie_walker, undefined);
  assert.equal(s.inventory.scarecrow, 2);
  assert.ok(!s.placeables.some((p) => p.type === 'skeleton_pet'));
  assert.equal(s.player.wisps, raw.player.wisps + 18, 'la ciotola rimborsata');
  assert.equal(s.player.xp, raw.player.xp);
  assert.deepEqual(s.graves.map((g) => g.name), raw.graves.map((g) => g.name));
  assert.ok(Array.isArray(s.entrusted) && s.house.owned.length >= 1, 'campi mancanti completati');
});

test('salvataggio di una versione più nuova: resta alla sua versione, nulla di sconosciuto si perde', () => {
  const raw = { ...fixture(2), version: SAVE_VERSION + 1, futureField: { kept: true } };
  const s = normalizeSave(structuredClone(raw));
  assert.equal(s.version, SAVE_VERSION + 1);
  assert.deepEqual(s.futureField, { kept: true });
});

test('l’accesso commerciale non entra nel salvataggio', () => withProfile('development', () => {
  const s = createNewGame(NOW, 5);
  const before = JSON.stringify(s);
  simulateAccess('demo');
  assert.equal(JSON.stringify(s), before);
  assert.ok(!/entitlement|"access"/.test(before));
}));

// localStorage finto per provare il caricamento come nel browser
function fakeStorage() {
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  return m;
}

test('caricamento: prima di migrare resta una copia; un salvataggio illeggibile non si perde', async () => {
  const { loadSave, takeRecoveredNotice } = await import('../src/app/persistence.ts');
  const m = fakeStorage();
  const KEY = 'necrothing3d.save.v1';
  const v2 = JSON.stringify(fixture(2));
  m.set(KEY, v2);
  const s = loadSave();
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(m.get(`${KEY}.pre-v${SAVE_VERSION}`), v2, 'copia com’era prima della migrazione');
  assert.equal(takeRecoveredNotice(), false);
  m.set(KEY, '{"version": 3, "graves": [ rotto');
  assert.equal(loadSave(), null);
  assert.equal(m.get(`${KEY}.unreadable`), '{"version": 3, "graves": [ rotto', 'tenuto da parte');
  assert.equal(takeRecoveredNotice(), true);
  assert.equal(takeRecoveredNotice(), false, 'lo si dice una volta');
  delete globalThis.localStorage;
});

test('export/import: andata e ritorno senza perdite; un backup più nuovo si rifiuta', async () => {
  const { readBackup } = await import('../src/app/persistence.ts');
  const s = normalizeSave(fixture(2));
  const bytes = packBackup(s, [], []);
  const back = readBackup(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).state;
  assert.deepEqual(back, s);
  const newer = packBackup({ ...s, version: SAVE_VERSION + 1 }, [], []);
  assert.throws(() => readBackup(newer.buffer.slice(newer.byteOffset, newer.byteOffset + newer.byteLength)), /versione più nuova/);
  // anche un backup vecchio (v2) si importa e si migra
  const old = packBackup(fixture(2), [], []);
  assert.equal(readBackup(old.buffer.slice(old.byteOffset, old.byteOffset + old.byteLength)).state.version, SAVE_VERSION);
});
