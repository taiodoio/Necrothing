// Primo ingresso: le tre tombe narrative della partita nuova, lo stato del
// percorso nel salvataggio (v4), il nome del Custode, i passi del cortile (una
// partita a parte, ricostruita a ogni passo), il dono di benvenuto e i
// consigli al momento giusto.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNewGame, normalizeSave, SAVE_VERSION } from '../src/game/state.ts';
import * as R from '../src/game/rules.ts';
import { GRAVE_TYPE_ACCESS } from '../src/game/graves.ts';
import { ACCESS } from '../src/game/catalog.ts';
import { finishedOnboarding, newOnboarding, normalizeOnboarding, currentStep, yardSignal, yardFinished, YARD_STEPS, TIP_IDS } from '../src/game/onboarding.ts';
import { applyYardGift, buildYard, YARD_GIFT, YARD_GRAVE, YARD_LANTERN, YARD_WISPS } from '../src/game/yard.ts';
import { markTip, nextTip } from '../src/game/tips.ts';
import { buildOccupancy } from '../src/game/world.ts';
import { checkName, NAME_MAX } from '../src/game/playerName.ts';

const NOW = new Date('2026-10-27T18:00:00Z');
const fixture = (v) => JSON.parse(fs.readFileSync(new URL(`./fixtures/save-v${v}.json`, import.meta.url), 'utf8'));
const STORY = ['story-cactus', 'story-dinner', 'story-gym'];

test('partita nuova: le tre tombe narrative con id fissi, nomi ed epitaffi', () => {
  const s = createNewGame(NOW, 5);
  const story = STORY.map((id) => s.graves.find((g) => g.id === id));
  assert.ok(story.every(Boolean), 'ci sono tutte e tre');
  assert.match(story[0].name, /Ernesto/);
  assert.match(story[1].epitaph, /qualsiasi giorno/);
  assert.match(story[2].epitaph, /lunedì/);
  assert.ok(story.every((g) => g.legacy), 'sono del vecchio custode');
  assert.equal(s.graves.length, 10, 'restano dieci tombe narrative');
  assert.equal(new Set(s.graves.map((g) => g.id)).size, s.graves.length, 'id distinti');
});

test('partita nuova: tombe e decorazioni accanto alle tombe sono della Demo', () => {
  const s = createNewGame(NOW, 5);
  for (const g of s.graves) assert.equal(GRAVE_TYPE_ACCESS[g.graveType], 'demo', `${g.id}: ${g.graveType}`);
  for (const type of ['vase', 'lantern', 'wreath']) {
    assert.ok(s.placeables.some((p) => p.type === type), `c'è ${type}`);
    assert.ok(ACCESS.demo.includes(type), `${type} è della Demo`);
  }
});

test('le tombe narrative non contano nel limite della Demo e si possono riesumare', () => {
  const s = createNewGame(NOW, 5);
  assert.equal(R.personalGraves(s), 0);
  const res = R.exhumeGrave(s, 'story-gym', NOW);
  assert.ok(res);
  assert.equal(s.graves.some((g) => g.id === 'story-gym'), false);
});

test('ricaricare non duplica le tombe narrative né riporta quelle riesumate', () => {
  const s = createNewGame(NOW, 5);
  R.exhumeGrave(s, 'story-cactus', NOW);
  const again = normalizeSave(JSON.parse(JSON.stringify(normalizeSave(JSON.parse(JSON.stringify(s))))));
  assert.equal(again.graves.length, s.graves.length);
  assert.equal(again.graves.filter((g) => g.id === 'story-dinner').length, 1);
  assert.equal(again.graves.some((g) => g.id === 'story-cactus'), false);
});

test('salvataggio v4: la partita nuova parte dal benvenuto, i vecchi salvataggi hanno già finito', () => {
  assert.equal(SAVE_VERSION, 4);
  assert.deepEqual(createNewGame(NOW, 1).onboarding, newOnboarding());
  for (const v of [1, 2]) {
    const s = normalizeSave(fixture(v));
    assert.deepEqual(s.onboarding, finishedOnboarding(), `v${v}: niente percorso a chi gioca già`);
  }
  const mid = normalizeSave({ ...JSON.parse(JSON.stringify(createNewGame(NOW, 1))), onboarding: { stage: 'yard', step: 2, goal: 'pending', tips: [] } });
  assert.deepEqual(mid.onboarding, { stage: 'yard', step: 2, goal: 'pending', tips: [] }, 'si riprende da dove si era');
});

test('stato del percorso: valori sbagliati tornano validi', () => {
  assert.deepEqual(normalizeOnboarding(undefined), finishedOnboarding());
  assert.deepEqual(normalizeOnboarding({ stage: 'boh', step: 3 }), finishedOnboarding());
  assert.equal(normalizeOnboarding({ stage: 'yard', step: 99 }).step, YARD_STEPS.length, 'al massimo: finito, manca la chiusura');
  assert.equal(normalizeOnboarding({ stage: 'name', step: -2 }).step, 0);
  assert.deepEqual(normalizeOnboarding({ stage: 'done', step: 0, goal: 'boh', tips: ['photo', 'boh'] }), { stage: 'done', step: 0, goal: 'done', tips: ['photo'] });
});

test('salvataggi del percorso di prima: tutorial e giro diventano il cortile, chi aveva finito non rivede niente', () => {
  assert.deepEqual(normalizeOnboarding({ stage: 'tutorial', step: 3 }), { stage: 'yard', step: 0, goal: 'pending', tips: [] });
  assert.deepEqual(normalizeOnboarding({ stage: 'tour', step: 1 }), { stage: 'yard', step: 0, goal: 'pending', tips: [] });
  assert.deepEqual(normalizeOnboarding({ stage: 'done', step: 0 }), finishedOnboarding(), 'niente obiettivo né consigli a chi gioca già');
  assert.deepEqual(finishedOnboarding().tips, [...TIP_IDS]);
});

test('cortile: avanza solo con l’azione attesa, nell’ordine', () => {
  const o = { stage: 'yard', step: 0, goal: 'pending', tips: [] };
  assert.equal(currentStep(o), 'walk');
  assert.equal(yardSignal(o, 'graveCleaned'), false, 'un’azione fuori ordine non conta');
  assert.equal(o.step, 0);
  const signals = ['walked', 'wispCollected', 'graveCleaned', 'flowersBrought', 'lightToggled', 'itemBought', 'itemPlaced', 'editDone', 'presenceMet', 'graveOpened'];
  assert.equal(signals.length, YARD_STEPS.length);
  for (const sig of signals) { assert.equal(yardFinished(o), false); assert.ok(yardSignal(o, sig), sig); }
  assert.ok(yardFinished(o), 'finito: manca la chiusura');
  assert.equal(currentStep(o), null);
  assert.equal(yardSignal(o, 'walked'), false, 'dopo l’ultimo passo non succede nulla');
  assert.equal(yardSignal({ stage: 'done', step: 0, goal: 'done', tips: [] }, 'walked'), false, 'fuori dal cortile non succede nulla');
});

test('il cortile è piccolo, a parte e con quel che serve; la partita vera non cambia', () => {
  const real = createNewGame(NOW, 3);
  R.ensureKeeperHouse(real, NOW);
  real.player.name = 'Flavio'; real.player.wisps = 77; real.inventory = { lantern: 4 };
  const before = JSON.stringify(real);
  const y = buildYard(real, NOW);
  assert.equal(JSON.stringify(real), before, 'costruirlo non tocca la partita');
  assert.equal(y.onboarding, real.onboarding, 'lo stato del percorso è lo stesso (i passi finiscono nel salvataggio vero)');
  assert.equal(y.player.name, 'Flavio');
  assert.equal(y.player.wisps, YARD_WISPS);
  assert.deepEqual(y.inventory, {});
  assert.deepEqual(y.graves.map((g) => g.id), [YARD_GRAVE]);
  assert.ok(y.graves[0].dirty && y.graves[0].weeds, 'la tomba è da pulire');
  const lamp = y.placeables.find((p) => p.id === YARD_LANTERN);
  assert.ok(lamp && !lamp.lit, 'la lanterna è spenta');
  for (const type of ['shop', 'keeper_house']) assert.ok(y.placeables.some((p) => p.type === type), type);
  assert.equal(y.world.looseWisps.length, 2);
  // tutto dentro lo steccato, niente sovrapposto
  const fence = y.placeables.filter((p) => p.type === 'fence_wood');
  assert.ok(fence.length > 20);
  const inside = [...y.graves, ...y.placeables.filter((p) => p.type !== 'fence_wood')];
  for (const e of inside) assert.ok(e.x >= 15 && e.y >= 15 && e.x < 30 && e.y < 29, `${e.id} è nel cortile`);
  assert.doesNotThrow(() => buildOccupancy(y));
  const ids = y.placeables.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'id distinti');
  // la Casa sta sempre nel cortile, anche se nella partita vera è stata spostata lontano (che non cambia)
  const far = createNewGame(NOW, 3);
  R.ensureKeeperHouse(far, NOW);
  const home = far.placeables.find((p) => p.type === 'keeper_house');
  home.x = 40; home.y = 40;
  const yh = buildYard(far, NOW).placeables.find((p) => p.type === 'keeper_house');
  assert.deepEqual([yh.x, yh.y, yh.id], [20, 16, home.id]);
  assert.deepEqual([home.x, home.y], [40, 40]);
  // il cortile si salva? no: normalizzato resta una partita valida, ma non è mai quella del giocatore
  assert.ok(normalizeSave(JSON.parse(JSON.stringify(y))));
});

test('cortile ripreso a metà: i passi già fatti hanno il loro effetto', () => {
  const real = createNewGame(NOW, 3);
  const at = (step) => buildYard(real, NOW, { stage: 'yard', step, goal: 'pending', tips: [] });
  const idx = (s) => YARD_STEPS.indexOf(s);
  assert.equal(at(idx('wisp') + 1).world.looseWisps.length, 1, 'il fuoco fatuo raccolto non c’è più');
  const cleaned = at(idx('clean') + 1).graves[0];
  assert.ok(!cleaned.dirty && !cleaned.weeds && !cleaned.hasFlowers);
  assert.ok(at(idx('flowers') + 1).graves[0].hasFlowers);
  assert.ok(at(idx('light') + 1).placeables.find((p) => p.id === YARD_LANTERN).lit);
  assert.deepEqual(at(idx('shop') + 1).inventory, { lantern: 1 }, 'la lanterna comprata, da posare');
  const placed = at(idx('place') + 1);
  assert.deepEqual(placed.inventory, {});
  assert.equal(placed.placeables.filter((p) => p.type === 'lantern').length, 2, 'e poi posata');
  assert.ok(R.maxBuyable(at(idx('shop')), 'lantern') >= 1, 'i fuochi fatui bastano per la lanterna');
});

test('dono di benvenuto: una lanterna e qualche fuoco fatuo, nella partita vera', () => {
  const s = createNewGame(NOW, 3);
  const w = s.player.wisps, l = s.inventory.lantern ?? 0;
  applyYardGift(s);
  assert.equal(s.player.wisps, w + YARD_GIFT.wisps);
  assert.equal(s.inventory.lantern, l + 1);
});

test('consigli al momento giusto: uno alla volta, prima le cose rotte, mai due volte', () => {
  const s = createNewGame(NOW, 3);
  s.onboarding = { stage: 'done', step: 0, goal: 'pending', tips: [] };
  // nella partita nuova c'è già una tomba rotta del vecchio custode
  const first = nextTip(s);
  assert.equal(first.id, 'graveBroken');
  assert.ok(s.graves.find((g) => g.id === first.at).broken);
  markTip(s, 'graveBroken'); markTip(s, 'graveBroken');
  assert.deepEqual(s.onboarding.tips, ['graveBroken'], 'segnato una volta sola');
  assert.equal(nextTip(s), null, 'niente altro da dire per ora');
  s.placeables[0].broken = true;
  assert.equal(nextTip(s).id, 'itemBroken');
  markTip(s, 'itemBroken');
  s.onboarding.tips.push(...TIP_IDS.filter((id) => !s.onboarding.tips.includes(id)));
  assert.equal(nextTip(s), null, 'tutti dati');
  assert.equal(nextTip({ ...createNewGame(NOW, 3), onboarding: finishedOnboarding() }), null, 'chi giocava già non ne riceve');
});

test('nome del Custode: lettere di ogni lingua sì, emoji e simboli no', () => {
  for (const ok of ['Flavio', 'José María', 'Zoë', 'Łucja', 'Дмитрий', '山田 太郎', 'D’Annunzio', 'Anne-Marie', 'नमस्ते']) {
    const r = checkName(ok);
    assert.ok(r.ok, ok);
  }
  assert.deepEqual(checkName('  Mario    Rossi '), { ok: true, name: 'Mario Rossi' });
  assert.equal(checkName('Café').ok && checkName('Café').name, 'Café', 'forma NFC');
  assert.deepEqual(checkName('   '), { ok: false, error: 'empty' });
  assert.deepEqual(checkName('Mario 💀'), { ok: false, error: 'chars' });
  assert.deepEqual(checkName('<script>'), { ok: false, error: 'chars' });
  assert.deepEqual(checkName('1234'), { ok: false, error: 'chars' }, 'serve almeno una lettera');
  assert.ok(checkName('a'.repeat(NAME_MAX)).ok);
  assert.deepEqual(checkName('a'.repeat(NAME_MAX + 1)), { ok: false, error: 'long' });
});
