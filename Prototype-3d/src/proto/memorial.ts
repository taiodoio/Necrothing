// Anteprima (non nel gioco): foto dell'oggetto con i filtri, ritratto
// incorniciato nel dettaglio della tomba con la lapide in piccolo, cartolina
// funebre da condividere. Le schermate usano lo stesso CSS e gli stessi
// componenti del gioco; la foto è un'immagine d'esempio disegnata qui.

import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/jacquard-24/400.css';
import '../styles/main.css';
import '../render/lowpoly/index.ts';
import { h } from '../ui/dom.ts';
import { hydrateIcons, icon, installFrames } from '../ui/icons.ts';
import { graveThumb } from '../ui/thumbs.ts';
import { applyPhotoFilter, PHOTO_FILTER_LABELS, squareCrop, type PhotoFilter } from '../ui/photoFilters.ts';
import { drawPostcard } from '../ui/postcard.ts';

installFrames();
const mode = new URLSearchParams(location.search).get('v') ?? 'screens';

/** Foto d'esempio: un vecchio caricatore bruciacchiato su un tavolo di legno. */
function samplePhoto(): HTMLCanvasElement {
  const S = 900;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const wood = g.createLinearGradient(0, 0, 0, S);
  wood.addColorStop(0, '#7a5638'); wood.addColorStop(1, '#3d2a1b');
  g.fillStyle = wood; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${i % 3 ? '40,24,12' : '150,110,70'},${0.08 + (i % 5) * 0.025})`;
    g.lineWidth = 1 + (i % 4);
    const y = (i / 70) * S * 1.1 - 30;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= S; x += 60) g.lineTo(x, y + Math.sin(x * 0.006 + i) * 9 + x * 0.05);
    g.stroke();
  }
  const light = g.createRadialGradient(S * 0.3, S * 0.2, 20, S * 0.35, S * 0.3, S * 0.9);
  light.addColorStop(0, 'rgba(255,230,190,0.35)'); light.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = light; g.fillRect(0, 0, S, S);
  // cavo che si arriccia fuori dall'inquadratura
  const cable = (col: string, w: number, dy: number) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(520, 600 + dy);
    g.bezierCurveTo(640, 760 + dy, 820, 600 + dy, 760, 470 + dy);
    g.bezierCurveTo(700, 360 + dy, 560, 420 + dy, 610, 520 + dy);
    g.bezierCurveTo(660, 620 + dy, 860, 700 + dy, 940, 820 + dy);
    g.stroke();
  };
  g.save(); g.filter = 'blur(8px)'; cable('rgba(0,0,0,0.45)', 20, 12); g.restore();
  cable('#bdb7ad', 18, 0); cable('#f2efe8', 11, -3);
  // il caricatore
  g.save();
  g.translate(410, 470); g.rotate(-0.22);
  g.save(); g.filter = 'blur(18px)'; g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(-150, -110, 320, 270); g.restore();
  const body = g.createLinearGradient(-150, -130, 150, 130);
  body.addColorStop(0, '#fbfaf6'); body.addColorStop(0.6, '#e2ddd3'); body.addColorStop(1, '#b9b2a6');
  g.fillStyle = body;
  g.beginPath(); g.roundRect(-150, -130, 300, 250, 34); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.roundRect(-136, -118, 272, 40, 20); g.fill();
  // spinotti
  g.fillStyle = '#c9c4ba'; g.fillRect(-70, -190, 26, 66); g.fillRect(44, -190, 26, 66);
  g.fillStyle = '#9b958a'; g.fillRect(-64, -190, 8, 66); g.fillRect(50, -190, 8, 66);
  // bruciatura: è morto così
  const burn = g.createRadialGradient(60, 40, 4, 60, 40, 80);
  burn.addColorStop(0, 'rgba(40,22,10,0.85)'); burn.addColorStop(0.5, 'rgba(110,70,30,0.45)'); burn.addColorStop(1, 'rgba(110,70,30,0)');
  g.fillStyle = burn; g.fillRect(-40, -60, 200, 200);
  g.fillStyle = '#3a3a3e'; g.fillRect(-40, 70, 80, 20); // porta USB
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.font = '600 22px system-ui'; g.textAlign = 'center'; g.fillText('5V ⎓ 1A', -40, -20);
  g.restore();
  return c;
}

const photo = squareCrop(samplePhoto());
const FILTERS: PhotoFilter[] = ['none', 'sepia', 'bw', 'worn'];
const filtered = Object.fromEntries(FILTERS.map((f) => [f, applyPhotoFilter(photo, f, 11)])) as Record<PhotoFilter, HTMLCanvasElement>;
const url = (c: HTMLCanvasElement) => c.toDataURL('image/jpeg', 0.85);
/** Filtro scelto nella sepoltura d'esempio (si parte sempre da «Originale»). */
const chosen: PhotoFilter = 'worn';
const stone = graveThumb('gothic', 'lowpoly', 'flowers', 1);

const GRAVE = {
  name: 'Caricatore del 2014', epitaph: 'Ha dato tutto. Anche la garanzia.',
  dates: '12 mar 2014 — 3 ott 2026', cause: 'Surriscaldato', category: 'Elettronica', lapide: 'Gotica',
};

/** Foto incorniciata; la lapide in piccolo solo quando è già scelta (non nel passo della foto). */
const portrait = (src: string | null, withStone = true) => src
  ? h('div', { class: 'portrait' }, h('img', { class: 'pic', src, alt: '' }), withStone ? h('img', { class: 'stone', src: stone, alt: '' }) : null)
  : h('div', { class: 'portrait empty' }, h('div', { class: 'pic' }, icon('photo', 40), 'Nessuna foto'));

/** Un telefono: lo sfondo del gioco, lo scrim e il drawer con titolo, corpo e piede. */
function phone(caption: string, title: string, body: Node, foot: Node | null, steps?: [number, number]) {
  const drawer = h('section', { class: 'drawer', style: 'animation:none' },
    h('header', { class: 'drawer-head' }, h('button', { class: 'icon-btn small' }, icon('close')), h('h2', {}, title)),
    h('div', { class: 'drawer-body' }, steps ? h('div', { class: 'steps' }, ...Array.from({ length: steps[1] }, (_, i) => h('i', { class: i <= steps[0] ? 'on' : '' }))) : null, body),
    foot ? h('footer', { class: 'drawer-foot' }, foot) : null);
  return h('figure', { class: 'cell' },
    h('figcaption', {}, caption),
    h('div', { class: 'phone' }, h('div', { class: 'scrim' }), drawer));
}

const row = (...b: Node[]) => h('div', { class: 'row' }, ...b);
const btn = (label: string, ghost = false, ic?: string) => h('button', { class: `big-btn${ghost ? ' ghost' : ''}` }, ic ? icon(ic, 22) : null, label);

async function screens() {
  const tav = document.getElementById('tavola')!;
  // 1 · passo «Foto» della sepoltura: senza foto i filtri restano spenti; scattata, mostrano la foto
  const pick = (taken: boolean) => h('div', { class: 'photo-pick' },
    h('p', { class: 'muted', style: 'margin:0' }, 'Una foto dell’oggetto, per ricordarlo com’era. È facoltativa.'),
    portrait(taken ? url(filtered.none) : null, false),
    h('div', { class: 'filters' }, ...FILTERS.map((f) => h('button', { class: `card${taken && f === 'none' ? ' selected' : ''}`, disabled: !taken },
      taken ? h('img', { src: url(filtered[f]), alt: '' }) : h('div', { style: 'width:100%;aspect-ratio:1;background:#1a1e26;box-shadow:inset 0 0 0 2px #07080b' }),
      h('b', {}, PHOTO_FILTER_LABELS[f])))),
    row(btn(taken ? 'Rifai' : 'Scatta', true, 'photo'), btn('Dalla galleria', true)),
  );
  // 2 · riepilogo prima di scegliere il posto
  const kv = (extra: Array<[string, string]> = []) => h('dl', { class: 'kv' }, ...[['Categoria', GRAVE.category], ['Vissuto', GRAVE.dates], ['Causa', GRAVE.cause], ['Lapide', GRAVE.lapide], ...extra].flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
  const hero = () => h('div', { class: 'hero', style: 'padding-top:2px' }, portrait(url(filtered[chosen])), h('h3', {}, GRAVE.name), h('div', { class: 'epitaph' }, `“${GRAVE.epitaph}”`));
  const s2 = h('div', {}, hero(), kv(), h('p', { class: 'muted' }, 'Dopo la conferma scegli il posto nel cimitero: arriverà il corteo funebre.'));
  // 3 · cartolina
  const card = await drawPostcard({ name: GRAVE.name, dates: GRAVE.dates, cause: GRAVE.cause, category: GRAVE.category, epitaph: GRAVE.epitaph, photo: filtered[chosen], headstone: await img(stone) });
  const s3 = h('div', {}, h('img', { class: 'postcard-view', src: card.toDataURL('image/png'), alt: '' }), h('p', { class: 'muted', style: 'text-align:center' }, 'Mandala a chi l’ha conosciuto.'));
  // 4 · dettaglio della tomba (la lente)
  const s4 = h('div', {}, hero(), kv([['Stato', 'Con i fiori']]),
    h('div', { class: 'section-title' }, 'Ricordi'),
    h('ul', { class: 'timeline' }, h('li', {}, h('time', {}, '3 ott 2026'), 'Sepoltura'), h('li', {}, h('time', {}, '5 ott 2026'), 'Fiori freschi')));
  tav.append(
    phone('1a · Foto (passo 2 di 6): ancora da scattare', 'Seppellisci', pick(false), row(btn('Indietro', true), btn('Salta')), [1, 6]),
    phone('1b · Scattata: i filtri mostrano la tua foto', 'Seppellisci', pick(true), row(btn('Indietro', true), btn('Avanti')), [1, 6]),
    phone('2 · Riepilogo (scelto «Rovinata»)', 'Seppellisci', s2, row(btn('Cartolina', true), btn('Scegli il posto')), [5, 6]),
    phone('3 · Cartolina funebre', 'Cartolina funebre', s3, row(btn('Salva immagine', true), btn('Condividi'))),
    phone('4 · Dettaglio (lente): prima l’azione da fare', 'Memoria', s4, h('div', { style: 'display:grid;gap:6px' }, row(btn('Cartolina', true), btn('Affida all’albero', true)), btn('Rinnova fiori', false, 'flower'))),
  );
  hydrateIcons(tav);
}

async function postcardFull() {
  const card = await drawPostcard({ name: GRAVE.name, dates: GRAVE.dates, cause: GRAVE.cause, category: GRAVE.category, epitaph: GRAVE.epitaph, photo: filtered[chosen], headstone: await img(stone) });
  const noPhoto = await drawPostcard({ name: 'Ombrello rosso', dates: '† 14 set 2026', cause: 'Vento', category: 'Casa', epitaph: 'Si è girato una volta di troppo.', photo: null, headstone: await img(graveThumb('celtic_cross', 'lowpoly', 'flowers', 2)) });
  const tav = document.getElementById('tavola')!;
  tav.append(h('figure', { class: 'cell' }, h('figcaption', {}, 'Cartolina con la foto (filtro «Rovinata»)'), card),
    h('figure', { class: 'cell' }, h('figcaption', {}, 'Senza foto: la lapide al suo posto'), noPhoto));
}

function filtersBoard() {
  const tav = document.getElementById('tavola')!;
  for (const f of FILTERS) tav.append(h('figure', { class: 'cell' }, h('figcaption', {}, PHOTO_FILTER_LABELS[f]), h('img', { src: url(filtered[f]), style: 'width:420px;height:420px;display:block' })));
}

const img = (src: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });

const style = document.createElement('style');
style.textContent = `
  html, body { height: auto; overflow: visible; background: #1b1f25; }
  #tavola { display: flex; gap: 22px; padding: 18px; align-items: flex-start; width: max-content; }
  .cell { margin: 0; display: grid; gap: 8px; }
  .cell figcaption { font: 600 15px/1.2 system-ui, sans-serif; color: #e8cf8c; letter-spacing: 0.03em; }
  .cell > canvas { width: 540px; height: 675px; display: block; }
  .phone { position: relative; width: 390px; height: 844px; overflow: hidden; background: #0d1016 url(./screenshots/A-lowpoly-giorno.jpg) center / cover; box-shadow: 0 0 0 3px #07080b, 0 10px 30px rgba(0,0,0,0.6); }
  .phone .scrim { position: absolute; inset: 0; z-index: 8; background: rgba(4, 5, 8, 0.55); }
  .phone .drawer { max-height: 92%; left: 0; right: 0; width: auto; transform: none; }
`;
document.head.append(style);

await document.fonts.ready;
if (mode === 'postcard') await postcardFull();
else if (mode === 'filters') filtersBoard();
else await screens();
(window as unknown as { ready: boolean }).ready = true;
