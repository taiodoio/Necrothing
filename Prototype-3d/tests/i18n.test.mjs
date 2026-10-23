import test from 'node:test';
import assert from 'node:assert/strict';
import { IT } from '../src/i18n/it/index.ts';
import { t, tList } from '../src/i18n/index.ts';
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
