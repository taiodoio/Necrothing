import type { Lang } from './langs.ts';

const FAMILIES: Partial<Record<Lang, { sans: string; serif: string; sample: string; load: () => Promise<unknown[]> }>> = {
  'zh-Hans': { sans: 'Noto Sans SC Variable', serif: 'Noto Serif SC Variable', sample: '墓园的回忆', load: () => Promise.all([import('@fontsource-variable/noto-sans-sc/wght.css'), import('@fontsource-variable/noto-serif-sc/wght.css')]) },
  'zh-Hant': { sans: 'Noto Sans TC Variable', serif: 'Noto Serif TC Variable', sample: '墓園的回憶', load: () => Promise.all([import('@fontsource-variable/noto-sans-tc/wght.css'), import('@fontsource-variable/noto-serif-tc/wght.css')]) },
  ja: { sans: 'Noto Sans JP Variable', serif: 'Noto Serif JP Variable', sample: '思い出の墓地', load: () => Promise.all([import('@fontsource-variable/noto-sans-jp/wght.css'), import('@fontsource-variable/noto-serif-jp/wght.css')]) },
  ko: { sans: 'Noto Sans KR Variable', serif: 'Noto Serif KR Variable', sample: '기억의 묘지', load: () => Promise.all([import('@fontsource-variable/noto-sans-kr/wght.css'), import('@fontsource-variable/noto-serif-kr/wght.css')]) },
};

export function canvasSans(lang: Lang) { return FAMILIES[lang]?.sans ?? 'Nunito'; }
export function canvasSerif(lang: Lang) { return FAMILIES[lang]?.serif ?? 'Grenze Gotisch'; }

export async function loadLanguageFonts(lang: Lang) {
  const font = FAMILIES[lang];
  if (!font || typeof document === 'undefined') return;
  await font.load();
  const root = document.documentElement;
  root.style.setProperty('--locale-sans', `"${font.sans}", "Nunito", sans-serif`);
  root.style.setProperty('--locale-serif', `"${font.serif}", "Grenze Gotisch", serif`);
  await Promise.all([
    document.fonts.load(`600 16px "${font.sans}"`, font.sample),
    document.fonts.load(`700 24px "${font.serif}"`, font.sample),
  ]);
}
