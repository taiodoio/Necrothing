// Primo ingresso: le tre tombe narrative della partita nuova, lo stato del
// percorso nel salvataggio (v4), il nome del Custode e l'ordine del tutorial.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNewGame, normalizeSave, SAVE_VERSION } from '../src/game/state.ts';
import * as R from '../src/game/rules.ts';
import { GRAVE_TYPE_ACCESS } from '../src/game/graves.ts';
import { ACCESS } from '../src/game/catalog.ts';
import { finishedOnboarding, newOnboarding, normalizeOnboarding, currentStep, tutorialSignal, TUTORIAL_STEPS } from '../src/game/onboarding.ts';
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
  const mid = normalizeSave({ ...JSON.parse(JSON.stringify(createNewGame(NOW, 1))), onboarding: { stage: 'tutorial', step: 2 } });
  assert.deepEqual(mid.onboarding, { stage: 'tutorial', step: 2 }, 'si riprende da dove si era');
});

test('stato del percorso: valori sbagliati tornano validi', () => {
  assert.deepEqual(normalizeOnboarding(undefined), finishedOnboarding());
  assert.deepEqual(normalizeOnboarding({ stage: 'boh', step: 3 }), finishedOnboarding());
  assert.deepEqual(normalizeOnboarding({ stage: 'tutorial', step: 99 }).stage, 'tutorial');
  assert.ok(normalizeOnboarding({ stage: 'tutorial', step: 99 }).step < TUTORIAL_STEPS.length);
  assert.equal(normalizeOnboarding({ stage: 'name', step: -2 }).step, 0);
});

test('tutorial: avanza solo con l’azione attesa, poi passa al giro', () => {
  const o = { stage: 'tutorial', step: 0 };
  assert.equal(currentStep(o), 'wisp');
  assert.equal(tutorialSignal(o, 'graveCleaned'), false, 'un’azione fuori ordine non conta');
  assert.equal(o.step, 0);
  for (const sig of ['wispCollected', 'graveOpened', 'lightToggled', 'graveCleaned']) assert.ok(tutorialSignal(o, sig));
  assert.equal(currentStep(o), 'bury');
  assert.ok(tutorialSignal(o, 'burialOpened'));
  assert.deepEqual(o, { stage: 'tour', step: 0 });
  assert.equal(tutorialSignal(o, 'wispCollected'), false, 'fuori dal tutorial non succede nulla');
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
