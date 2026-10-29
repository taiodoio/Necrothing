import test from 'node:test';
import assert from 'node:assert/strict';
import { IT } from '../src/i18n/it/index.ts';
import { initI18n, t, tList } from '../src/i18n/index.ts';
import { LOADERS, DEFAULT_PLAYER_NAMES } from '../src/i18n/langs.ts';
import { createNewGame, localizeStatic } from '../src/game/state.ts';
import { EN_EXTRA } from '../src/i18n/en-extra.ts';
import { scan } from '../scripts/i18n-check.mjs';

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('testi: nessuna frase scritta a mano nel codice del gioco', () => {
  const { found } = scan();
  assert.deepEqual(found.map((f) => `${f.file}:${f.line}  ${f.text}`), []);
});

test('testi: ogni chiave usata con t() esiste in italiano', () => {
  const { keysUsed } = scan();
  const missing = keysUsed.filter((k) => !(k.key in IT) && !(`${k.key}#other` in IT)).map((k) => `${k.file}:${k.line}  ${k.key}`);
  assert.deepEqual(missing, []);
});

test('testi: i plurali hanno sempre la forma «other», e le altre forme non usano segnaposto in più', () => {
  for (const key of Object.keys(IT)) {
    const [base, form] = key.split('#');
    if (!form) continue;
    assert.ok(`${base}#other` in IT, `${base}#other manca`);
    // il singolare può fare a meno del numero («Manca ancora un elemento»), non aggiungere segnaposto
    const other = new Set(placeholders(IT[`${base}#other`]));
    for (const p of placeholders(IT[key])) assert.ok(other.has(p), `{${p}} in ${key} ma non in ${base}#other`);
  }
});

test('testi: segnaposto, plurali ed elenchi', () => {
  const keys = Object.keys(IT);
  const plural = keys.find((k) => k.endsWith('#one'));
  if (plural) {
    const base = plural.slice(0, -4);
    assert.equal(t(base, { n: 1 }).includes('{n}'), false);
    assert.equal(t(base, { n: 1 }), IT[`${base}#one`].replaceAll('{n}', '1'));
  }
  const list = keys.find((k) => IT[k].includes('|'));
  if (list) assert.ok(tList(list).length >= 2);
  assert.equal(t('chiave.che.non.esiste'), 'chiave.che.non.esiste');
});

test('i dizionari del workbook si caricano per lingua e non contengono celle formula', async () => {
  const allowedFallback = new Set(Object.keys(EN_EXTRA));
  for (const [lang, load] of Object.entries(LOADERS)) {
    const dict = (await load()).default;
    for (const key of Object.keys(IT)) {
      if (!(key in dict)) assert.ok(allowedFallback.has(key), `${lang}: manca ${key}`);
      const value = dict[key];
      if (!value) continue;
      assert.ok(!/^#(?:ERROR!|NAME\?|VALUE!|REF!|N\/A|DIV\/0!|NULL!|ERR:)/.test(value), `${lang}.${key}: errore Excel`);
      if (key in IT) {
        assert.deepEqual(placeholders(value), placeholders(IT[key]), `${lang}.${key}: segnaposto diversi`);
        assert.equal((value.match(/\|/g) ?? []).length, (IT[key].match(/\|/g) ?? []).length, `${lang}.${key}: separatori diversi`);
      }
    }
  }
});

test('i testi fissi delle tombe e il nome predefinito seguono la lingua, senza tradurre contenuti del giocatore', async () => {
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map([['necro.lang', 'en']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) } });
  try {
    await initI18n();
    const state = createNewGame(new Date('2026-01-01T00:00:00Z'));
    state.player.wisps += 7;
    state.player.name = DEFAULT_PLAYER_NAMES.en;
    state.graves.find((g) => g.id === 'story-cactus').name = 'My cactus';
    localizeStatic(state);
    assert.equal(state.player.name, DEFAULT_PLAYER_NAMES.en);
    assert.notEqual(state.graves.find((g) => g.id === 'story-cactus').name, 'My cactus');
    assert.equal(state.player.wisps, 37);
    const custom = { ...state.graves[0], id: 'player-grave', legacy: false, name: 'My own object', epitaph: 'Still remembered' };
    state.graves.push(custom);
    localizeStatic(state);
    assert.equal(custom.name, 'My own object');
    assert.equal(custom.epitaph, 'Still remembered');
  } finally {
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage);
    else delete globalThis.localStorage;
    values.set('necro.lang', 'it');
    await initI18n();
    values.delete('necro.lang');
  }
});
