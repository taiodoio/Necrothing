// I testi dell'app, in una lingua sola per volta. Ogni testo ha una chiave
// stabile (es. «npc.crow.wisp»); i testi italiani stanno in src/i18n/it/,
// uno per area, e si sincronizzano col foglio Google (scripts/i18n-sheet.mjs).
//
// - Segnaposto: «Ha venduto {n} pozioni» → t('…', { n: 3 }).
// - Plurali: chiavi con «#one» / «#other» (e le altre forme che una lingua
//   chiede: «#few», «#many»…): con il parametro `n` si sceglie quella giusta.
// - Elenchi (versi a caso): una sola chiave con le voci separate da «|».
// - Testo che manca nella lingua scelta: si usa l'italiano.
//
// La lingua si sceglie all'avvio (impostazione salvata o lingua del
// telefono): cambiarla ricarica l'app, così anche i testi calcolati una volta
// sola (il catalogo della Bottega) sono nella lingua giusta.

import { IT } from './it/index.ts';

export type Lang = 'it';
export const LANGS: Record<Lang, string> = { it: 'Italiano' };
const DICTS: Record<Lang, Record<string, string>> = { it: IT };
const STORE_KEY = 'necro.lang';

function startLang(): Lang {
  try {
    const saved = globalThis.localStorage?.getItem(STORE_KEY) as Lang | null;
    if (saved && saved in DICTS) return saved;
  } catch { /* niente localStorage (test, anteprime) */ }
  const nav = (globalThis.navigator?.language ?? 'it').slice(0, 2) as Lang;
  return nav in DICTS ? nav : 'it';
}

let lang: Lang = startLang();
let dict = DICTS[lang];
let plural = new Intl.PluralRules(lang);

export const currentLang = () => lang;

/** Cambia lingua (e la ricorda): chi chiama ricarica l'app. */
export function setLang(l: Lang) {
  lang = l;
  dict = DICTS[l];
  plural = new Intl.PluralRules(l);
  try { globalThis.localStorage?.setItem(STORE_KEY, l); } catch { /* pazienza */ }
}

type Params = Record<string, string | number>;

function raw(key: string, p?: Params): string | undefined {
  const n = p?.n;
  if (typeof n === 'number') {
    const form = plural.select(n);
    const s = dict[`${key}#${form}`] ?? IT[`${key}#${form}`] ?? dict[`${key}#other`] ?? IT[`${key}#other`];
    if (s !== undefined) return s;
  }
  return dict[key] ?? IT[key];
}

/** Il testo della chiave, coi segnaposto riempiti. Una chiave che non esiste torna com'è (si vede subito). */
export function t(key: string, p?: Params): string {
  const s = raw(key, p);
  if (s === undefined) return key;
  return p ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in p ? String(p[k]) : m)) : s;
}

/** Le voci di un elenco («Cra! Cra!|Craaa!»). */
export const tList = (key: string, p?: Params): string[] => t(key, p).split('|');

/** Esiste la chiave? (per testi facoltativi) */
export const hasT = (key: string) => key in dict || key in IT;
