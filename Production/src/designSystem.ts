// La pagina del design system (design-system.html): i componenti veri, con gli
// stessi fogli di stile e le stesse decorazioni del gioco, così non può
// invecchiare. Qui solo ciò che serve alla pagina: i caratteri, gli stili, le
// decorazioni, le icone e i campioni che si riempiono da soli (colori letti dal
// CSS, icone, medaglie, anteprime).

import '@fontsource/grenze-gotisch/600.css';
import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles/main.css';
import './styles/ui-next.css';
import './styles/ui-play.css';
import './styles/ui-house.css';
import './styles/ui-onboarding.css';
import './styles/ui-moments.css';
import './styles/design-system.css';
import { hydrateIcons } from './ui/icons.ts';
import { custodePortrait } from './ui/lookThumbs.ts';
import { lpBadgeUrl, LP_ICON_NAMES, type BadgeTier } from './ui/lpIcons.ts';
import { monoIcon, MONO_ICONS } from './ui/monoIcons.ts';
import { parchmentSvg } from './ui/postcard.ts';
import { svgToPng } from './ui/natureDecor.ts';
import { npcPortrait } from './ui/npcPortraits.ts';
import { installPlayDecor } from './ui/playDecor.ts';
import { previewUrl } from './ui/previews.ts';
import { DEFAULT_LOOK } from './game/look.ts';

document.documentElement.dataset.quality = 'high';
installPlayDecor();

/** Il markup di un esempio, dedentato, da mostrare sotto il campione (prima che le icone lo riempiano di stile). */
function snippet(from: HTMLElement): string {
  const lines = from.innerHTML.replace(/\t/g, '  ').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  return lines.map((l) => l.slice(indent)).join('\n');
}
for (const ex of document.querySelectorAll<HTMLElement>('.ds-example:not(.plain)')) {
  // gli esempi senza un blocco scritto a mano ne hanno uno col markup del campione
  if (!ex.querySelector('.ds-code')) {
    const d = document.createElement('details');
    d.className = 'ds-code';
    d.innerHTML = '<summary>Markup</summary><pre></pre>';
    ex.append(d);
  }
  const src = ex.querySelector<HTMLElement>('[data-snippet]') ?? ex.querySelector<HTMLElement>('.ds-live');
  const pre = ex.querySelector('pre');
  if (src && pre) pre.textContent = snippet(src);
}

// icone colorate (data-icon), monocromatiche (data-mono) e medaglie (data-badge="icona:grado")
hydrateIcons();
for (const el of document.querySelectorAll<HTMLElement>('[data-mono]')) el.replaceWith(monoIcon(el.dataset.mono!, Number(el.dataset.size ?? 19)));
for (const el of document.querySelectorAll<HTMLImageElement>('[data-badge]')) {
  const [name, tier] = el.dataset.badge!.split(':');
  el.src = lpBadgeUrl(name, tier as BadgeTier | 'locked');
}
for (const el of document.querySelectorAll<HTMLImageElement>('[data-preview]')) el.src = previewUrl(el.dataset.preview!) ?? '';
// il Custode (come nell'HUD e nei consigli): il ritratto si disegna in 3D, quindi un attimo dopo
for (const el of document.querySelectorAll<HTMLImageElement>('[data-custode]')) {
  // nel riquadro dell'HUD il ritratto è quello del profilo (esce dal bordo); altrove quello delle notifiche
  el.src = (el.dataset.custode === 'hud' ? custodePortrait(DEFAULT_LOOK, true) : npcPortrait('custode', DEFAULT_LOOK)) || '';
}

// le due liste di icone: i nomi veri
const fill = (id: string, names: string[], make: (n: string) => HTMLElement) => {
  const box = document.getElementById(id);
  if (!box) return;
  for (const n of names) {
    const cell = document.createElement('figure');
    cell.append(make(n));
    const cap = document.createElement('figcaption');
    cap.textContent = n;
    cell.append(cap);
    box.append(cell);
  }
};
fill('lp-icons', LP_ICON_NAMES, (n) => { const i = document.createElement('i'); i.dataset.icon = n; return i; });
hydrateIcons(document.getElementById('lp-icons')!);
fill('mono-icons', MONO_ICONS, (n) => monoIcon(n, 26));

// i colori: il valore è quello che il CSS dà adesso (cambiandolo nel foglio, la pagina lo segue)
const root = getComputedStyle(document.documentElement);
for (const sw of document.querySelectorAll<HTMLElement>('.ds-sw[data-var]')) {
  const v = sw.dataset.var!;
  sw.style.setProperty('--c', `var(${v})`);
  const val = root.getPropertyValue(v).trim();
  const code = sw.querySelector('code');
  if (code) code.textContent = val || '—';
}
for (const sw of document.querySelectorAll<HTMLElement>('.ds-sw[data-color]')) sw.style.setProperty('--c', sw.dataset.color!);

// la qualità grafica: come nel gioco (html[data-quality]), per vedere cosa si spegne
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-set-quality]')) {
  b.addEventListener('click', () => {
    document.documentElement.dataset.quality = b.dataset.setQuality!;
    for (const o of document.querySelectorAll('[data-set-quality]')) o.classList.toggle('active', o === b);
  });
}

// il menù di gioco: si apre e si chiude come nel gioco
const bubble = document.querySelector<HTMLElement>('#ds-bubble');
bubble?.querySelector('.fab')?.addEventListener('click', () => bubble.classList.toggle('open'));

// le pergamene: la carta si disegna alla loro misura, come nel gioco (ui/parchment.ts)
for (const el of document.querySelectorAll<HTMLElement>('.parch')) {
  let last = '';
  new ResizeObserver(() => {
    const w = Math.ceil(el.offsetWidth / 8) * 8, ht = Math.ceil(el.offsetHeight / 8) * 8;
    const key = `${w}x${ht}`;
    if (!w || !ht || key === last) return;
    last = key;
    void svgToPng(parchmentSvg(w, ht, 4), w, ht).then((png) => { if (png && last === key) el.style.setProperty('--parch', png); });
  }).observe(el);
}
