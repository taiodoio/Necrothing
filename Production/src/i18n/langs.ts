// Lingue e nomi predefiniti del workbook; i dizionari vengono caricati dinamicamente da i18n/index.ts.
export const LANGS = {
  "it": "Italiano",
  "en": "English",
  "de": "Deutsch",
  "fr": "Français",
  "es": "Español",
  "pt": "Português",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  "ja": "日本語",
  "ko": "한국어"
} as const;
export type Lang = keyof typeof LANGS;
export const DEFAULT_PLAYER_NAMES: Record<Lang, string> = {
  "it": "Custode",
  "en": "Keeper",
  "de": "Hüter",
  "fr": "Gardien",
  "es": "Guardián",
  "pt": "Guardião",
  "zh-Hans": "守墓人",
  "zh-Hant": "守墓人",
  "ja": "墓守",
  "ko": "묘지기"
};
export const LOADERS = {
  'en': () => import('./generated/en.ts'),
  'de': () => import('./generated/de.ts'),
  'fr': () => import('./generated/fr.ts'),
  'es': () => import('./generated/es.ts'),
  'pt': () => import('./generated/pt.ts'),
  'zh-Hans': () => import('./generated/zh-Hans.ts'),
  'zh-Hant': () => import('./generated/zh-Hant.ts'),
  'ja': () => import('./generated/ja.ts'),
  'ko': () => import('./generated/ko.ts'),
} as const;
