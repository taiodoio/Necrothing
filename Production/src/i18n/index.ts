// Traduzioni sincronizzate dal workbook. L'italiano resta sempre disponibile
// come lingua sorgente; inglese e lingua selezionata vengono caricate prima
// che l'app inizializzi le schermate.
import { IT } from './it/index.ts';
import { LANGS, LOADERS } from './langs.ts';
import { EN_EXTRA } from './en-extra.ts';
import { loadLanguageFonts } from './fonts.ts';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export type Lang = keyof typeof LANGS;
export type LanguagePreference = Lang | 'auto';
export const LANG_NAMES: Record<Lang, string> = LANGS;
export const NATIVE_LANG_NAMES: Record<Lang, string> = LANGS;
const STORE_KEY = 'necro.lang';
let nativePreference: string | null | undefined;
const ALIASES: Record<string, Lang> = {
  'zh-TW': 'zh-Hant', 'zh-HK': 'zh-Hant', 'zh-MO': 'zh-Hant', 'zh-Hant': 'zh-Hant',
  'zh-CN': 'zh-Hans', 'zh-SG': 'zh-Hans', 'zh-Hans': 'zh-Hans',
};

// I test Node e le importazioni dirette partono in italiano; entry.ts attende
// initI18n() e carica la lingua del dispositivo prima di avviare l'app.
let lang: Lang = 'it';
let dict: Record<string, string> = IT;
let english: Record<string, string> = IT;
let plural = new Intl.PluralRules('it');

export const currentLang = () => lang;

function valid(value: string | null): value is Lang {
  return !!value && Object.prototype.hasOwnProperty.call(LANGS, value);
}

export function deviceLang(): Lang {
  const candidates = globalThis.navigator?.languages?.length ? [...globalThis.navigator.languages] : [globalThis.navigator?.language ?? 'en'];
  for (const candidate of candidates) {
    if (/^zh-(?:TW|HK|MO|Hant)(?:-|$)/i.test(candidate)) return 'zh-Hant';
    if (/^zh-(?:CN|SG|Hans)(?:-|$)/i.test(candidate)) return 'zh-Hans';
    const alias = ALIASES[candidate] ?? ALIASES[candidate.replace('_', '-')];
    if (alias) return alias;
    const exact = candidate.replace('_', '-');
    if (valid(exact)) return exact;
    const base = exact.split('-')[0];
    if (valid(base)) return base;
  }
  return 'en';
}

export function preferredLang(): Lang {
  if (valid(nativePreference ?? null)) return nativePreference as Lang;
  try {
    const saved = globalThis.localStorage?.getItem(STORE_KEY);
    if (valid(saved)) return saved;
  } catch { /* anteprima senza storage */ }
  return deviceLang();
}

export function hasManualLang() {
  if (valid(nativePreference ?? null)) return true;
  try { return valid(globalThis.localStorage?.getItem(STORE_KEY) ?? null); } catch { return false; }
}

/** Preferenza esportabile: «auto» mantiene la scelta basata sulla lingua del dispositivo. */
export function languagePreference(): LanguagePreference {
  if (!hasManualLang()) return 'auto';
  return preferredLang();
}

export function restoreLanguagePreference(value: LanguagePreference) {
  if (value === 'auto') clearLang(); else setLang(value);
}

async function load(code: Lang) {
  if (code === 'it') return IT;
  const importer = LOADERS[code as Exclude<Lang, 'it'>];
  return importer ? (await importer()).default : {};
}

/** Carica i dizionari prima di importare l'interfaccia. */
export async function initI18n() {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Preferences.get({ key: STORE_KEY });
      nativePreference = result.value;
      if (nativePreference === null) {
        const legacy = globalThis.localStorage?.getItem(STORE_KEY) ?? null;
        if (valid(legacy)) {
          nativePreference = legacy;
          await Preferences.set({ key: STORE_KEY, value: legacy });
        }
      } else if (valid(nativePreference)) {
        globalThis.localStorage?.setItem(STORE_KEY, nativePreference);
      }
    } catch {
      nativePreference = undefined;
    }
  }
  lang = preferredLang();
  const [en, selected] = await Promise.all([load('en'), lang === 'en' ? Promise.resolve(null) : load(lang)]);
  english = { ...en, ...EN_EXTRA };
  dict = selected ? { ...EN_EXTRA, ...selected } : english;
  plural = new Intl.PluralRules(lang);
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  await loadLanguageFonts(lang);
}

/** Salva la lingua scelta; il chiamante ricarica dopo aver chiuso lo stato corrente. */
export function setLang(value: Lang) {
  if (!valid(value)) return;
  nativePreference = value;
  try { globalThis.localStorage?.setItem(STORE_KEY, value); } catch { /* pazienza */ }
  if (Capacitor.isNativePlatform()) void Preferences.set({ key: STORE_KEY, value }).catch(() => undefined);
}

export function clearLang() {
  nativePreference = null;
  try { globalThis.localStorage?.removeItem(STORE_KEY); } catch { /* pazienza */ }
  if (Capacitor.isNativePlatform()) void Preferences.remove({ key: STORE_KEY }).catch(() => undefined);
}

type Params = Record<string, string | number>;
function raw(key: string, p?: Params): string | undefined {
  const n = p?.n;
  if (typeof n === 'number') {
    const form = plural.select(n);
    const pluralized = dict[`${key}#${form}`] ?? english[`${key}#${form}`] ?? IT[`${key}#${form}`]
      ?? dict[`${key}#other`] ?? english[`${key}#other`] ?? IT[`${key}#other`];
    if (pluralized !== undefined) return pluralized;
  }
  return dict[key] ?? english[key] ?? IT[key];
}

export function t(key: string, p?: Params): string {
  const s = raw(key, p);
  if (s === undefined) return key;
  return p ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in p ? String(p[k]) : m)) : s;
}
export const tList = (key: string, p?: Params): string[] => t(key, p).split('|');
export const hasT = (key: string) => key in dict || key in english || key in IT;
