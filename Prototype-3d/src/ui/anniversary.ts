// Il giorno dell'anniversario della morte: la scheda della tomba ha la
// corona di fiori col nastro al posto della foto (per tutto il giorno) e
// arriva una notifica col lumino e «Vedi la tomba».

import type { Grave } from '../game/state.ts';
import { createRng } from '../game/rng.ts';
import { t } from '../i18n/index.ts';
import { h } from './dom.ts';
import { icon } from './icons.ts';
import { lpIconPng } from './lpIcons.ts';
import { npcNote } from './npcNote.ts';

interface AnnivInput {
  grave: Grave;
  years: number;
  /** La lapide (miniatura), se non c'è la foto. */
  medal: string;
  /** La pillola di dove riposa. */
  where: HTMLElement;
  photo: Promise<string | null>;
}

const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag: string, attrs: Record<string, string | number>) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
const f1 = (n: number) => n.toFixed(1);

/** La foto (quando arriva) al posto della lapide in un'immagine già nel documento. */
function photoInto(img: HTMLImageElement, photo: Promise<string | null>) {
  void photo.then((u) => { if (u) { img.src = u; img.classList.add('is-photo'); } });
}

/** Petali che cadono piano dentro `el` (solo decorazione). */
function petals(n: number) {
  const r = createRng(11);
  return Array.from({ length: n }, (_, i) => h('i', { class: 'an-petal', style: `left:${(4 + r.range(0, 92)).toFixed(0)}%;--d:${(i * 1.7).toFixed(1)}s;--t:${r.range(7, 11).toFixed(1)}s;--x:${r.range(-30, 30).toFixed(0)}px;--c:${r.pick(['#f6b8c8', '#fff1e2', '#e8798e', '#f3c46a'])}` }));
}

/** Un lumino acceso (l'icona, con la fiamma che tremola). */
const lumino = (size: number) => h('span', { class: 'an-lumino' }, icon('lumino', size));

// ── A: corona di fiori col nastro ───────────────────────────────────────

function wreathSvg(years: number) {
  const W = 300, C = 150, R = 116;
  const el = svg('svg', { viewBox: `0 0 ${W} ${W}`, class: 'an-wreath-svg', 'aria-hidden': 'true' });
  const r = createRng('corona');
  const LEAVES = ['#557a4a', '#6b8f52', '#7d9a55', '#4e6e45', '#62904a'];
  const leaf = (x: number, y: number, ang: number, size: number, fill: string) => {
    const g = svg('g', { transform: `translate(${f1(x)} ${f1(y)}) rotate(${ang.toFixed(0)})` });
    g.append(svg('path', { d: `M0,0 Q${size},${-size * 0.6} ${size * 2},0 Q${size},${size * 0.6} 0,0Z`, fill }),
      svg('path', { d: `M1,0 L${f1(size * 1.7)},0`, stroke: 'rgba(20,30,15,.35)', 'stroke-width': 0.9 }));
    return g;
  };
  // due giri di foglie, uno appena fuori e uno appena dentro, tutte nello stesso verso
  for (const [rad, n, off] of [[R + 7, 40, 0], [R - 6, 36, 0.08]] as const) {
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2 + r.range(-0.04, 0.04);
      const x = C + Math.cos(a) * (rad + r.range(-3, 3)), y = C + Math.sin(a) * (rad + r.range(-3, 3));
      el.append(leaf(x, y, (a * 180) / Math.PI + 90 + r.range(-35, 35), r.range(8, 11), r.pick(LEAVES)));
    }
  }
  // fiori a mazzetti sui lati e in alto; bacche rosse qua e là
  const flower = (x: number, y: number, s: number, petal: string) => {
    const g = svg('g', { transform: `translate(${f1(x)} ${f1(y)}) rotate(${r.range(0, 72).toFixed(0)})` });
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.append(svg('ellipse', { cx: f1(Math.cos(a) * s * 0.62), cy: f1(Math.sin(a) * s * 0.62), rx: f1(s * 0.55), ry: f1(s * 0.42), transform: `rotate(${((a * 180) / Math.PI).toFixed(0)} ${f1(Math.cos(a) * s * 0.62)} ${f1(Math.sin(a) * s * 0.62)})`, fill: petal })); }
    g.append(svg('circle', { r: f1(s * 0.32), fill: '#f0c46e' }));
    return g;
  };
  for (const deg of [-150, -128, -105, -75, -52, -30, 175, 200, 5, -20]) {
    const a = (deg * Math.PI) / 180, k = r.range(-4, 4);
    el.append(flower(C + Math.cos(a) * (R + k), C + Math.sin(a) * (R + k), r.range(9, 13), r.pick(['#f6b8c8', '#fff1e2', '#e8798e', '#f3a6bd'])));
  }
  for (let i = 0; i < 14; i++) { const a = r.range(0, Math.PI * 2); el.append(svg('circle', { cx: f1(C + Math.cos(a) * (R + r.range(-10, 10))), cy: f1(C + Math.sin(a) * (R + r.range(-10, 10))), r: 3, fill: '#c0343f' })); }
  // il nastro in basso, con le code piegate e la scritta
  const y0 = 238, y1 = 268;
  el.append(svg('path', { d: `M48,${y0 + 8} L82,${y0 + 4} L82,${y1 + 4} L48,${y1 + 8} L60,${(y0 + y1) / 2 + 6}Z`, fill: '#6e1a28' }),
    svg('path', { d: `M252,${y0 + 8} L218,${y0 + 4} L218,${y1 + 4} L252,${y1 + 8} L240,${(y0 + y1) / 2 + 6}Z`, fill: '#6e1a28' }),
    svg('path', { d: `M72,${y0} Q150,${y0 - 12} 228,${y0} L228,${y1} Q150,${y1 - 12} 72,${y1}Z`, fill: '#9a2a3a' }),
    svg('path', { d: `M72,${y0 + 3} Q150,${y0 - 9} 228,${y0 + 3}`, stroke: '#d9a95a', 'stroke-width': 1.4, fill: 'none' }),
    svg('path', { d: `M72,${y1 - 3} Q150,${y1 - 15} 228,${y1 - 3}`, stroke: '#d9a95a', 'stroke-width': 1.4, fill: 'none' }));
  // la scritta segue la curva della banda: la linea di base scende verso i capi come i bordi
  const id = `an-rib-${Math.random().toString(36).slice(2, 8)}`;
  el.append(svg('path', { id, d: `M72,${y1 - 9} Q150,${y1 - 21} 228,${y1 - 9}`, fill: 'none' }));
  const label = svg('text', { class: 'an-ribbon-text', 'text-anchor': 'middle' });
  const along = svg('textPath', { href: `#${id}`, startOffset: '50%' });
  along.textContent = t('anniv.ordinal', { n: years });
  label.append(along);
  el.append(label);
  return el;
}

function wreath(a: AnnivInput) {
  const img = h('img', { src: a.medal, alt: '' }) as HTMLImageElement;
  photoInto(img, a.photo);
  return h('div', { class: 'an an-wreath' },
    h('div', { class: 'an-stage' }, ...petals(8),
      h('div', { class: 'an-wreath-box' }, h('div', { class: 'an-round' }, img), wreathSvg(a.years)),
      h('span', { class: 'an-side l' }, lumino(46)), h('span', { class: 'an-side r' }, lumino(46))),
    h('div', { class: 'an-ago' }, t('anniv.ago', { n: a.years })),
    h('h3', {}, a.grave.name), a.where,
    a.grave.epitaph ? h('div', { class: 'epitaph' }, t('detail.epitaph.quoted', { text: a.grave.epitaph })) : null);
}

/** La testata dell'anniversario: la corona al posto della foto, col nastro, i lumini e i petali. */
export function annivHero(a: AnnivInput): HTMLElement {
  return wreath(a);
}

/** La notifica del giorno dell'anniversario, con «Vedi la tomba». */
export function annivNote(name: string, years: number, see: () => void) {
  npcNote({ kind: 'custode', name: t('anniv.note.name'), say: t('anniv.note.say'), text: t('anniv.note.text', { n: years, name }), img: lpIconPng('lumino'), icon: true,
    action: { label: t('note.seeGrave'), run: see } });
}
