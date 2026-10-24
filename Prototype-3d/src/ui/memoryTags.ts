// Lista dell'albero dei ricordi: un ramo per riga, una volta da sinistra e
// una da destra, con due cartellini appesi allo spago. Ogni ramo è un po'
// diverso (curva, spessore, rametti, foglie), ma sempre lo stesso per
// la stessa riga: riaprendo la lista non cambia.

import { CATEGORY_LABELS } from '../game/graves.ts';
import { createRng, type Rng } from '../game/rng.ts';
import type { EntrustedMemory } from '../game/state.ts';
import { t } from '../i18n/index.ts';
import { fmtDate, h } from './dom.ts';
import { icon } from './icons.ts';

/** Larghezza di riferimento del ramo (la lista sul telefono), altezza della sua fascia, spazio tra le colonne. */
const W = 358, BH = 84, GAP = 12;
const COLS = [(W - GAP) / 4, W - (W - GAP) / 4];
const BARK = ['#6e5340', '#5f4636', '#735a44'], BARK_DARK = ['#3f2d22', '#47332a'];
const LEAVES = ['#557a4a', '#6b8f52', '#7d9a55', '#4e6e45'], AUTUMN = ['#c9772f', '#b8652a', '#d49a3a'];

const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag: string, attrs: Record<string, string | number>) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
const f1 = (n: number) => n.toFixed(1);

interface Branch { y: (x: number) => number; half: (x: number) => number; el: SVGSVGElement }

/**
 * Un ramo che entra da un lato e si assottiglia verso l'altro: la linea
 * centrale scende verso la punta (il peso) e ondeggia; sul ramo, venature,
 * un moncherino spezzato, rametti e foglie.
 */
function branch(r: Rng, fromLeft: boolean, reach: number): Branch {
  const base = r.range(22, 34), droop = r.range(8, 22), arch = r.range(-8, 10), wob = r.range(3, 6.5), freq = r.range(1.4, 2.6), ph = r.range(0, Math.PI * 2);
  const thick = r.range(20, 27), tipThick = r.range(3, 4.5);
  const x0 = fromLeft ? -14 : W + 14, x1 = fromLeft ? reach : W - reach, dir = fromLeft ? 1 : -1;
  const tOf = (x: number) => Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
  const y = (x: number) => { const u = tOf(x); return base + droop * u * u - arch * Math.sin(u * Math.PI) + wob * Math.sin(u * Math.PI * freq + ph) * u; };
  const half = (x: number) => (thick + (tipThick - thick) * Math.pow(tOf(x), 0.75)) / 2;
  const el = svg('svg', { viewBox: `0 0 ${W} ${BH}`, preserveAspectRatio: 'none', class: 'mt-branch', 'aria-hidden': 'true' }) as SVGSVGElement;
  const N = 40, top: string[] = [], bot: string[] = [];
  const bumps = Array.from({ length: N + 1 }, () => r.range(-1.1, 1.1));
  for (let i = 0; i <= N; i++) {
    const x = x0 + ((x1 - x0) * i) / N;
    // corteccia irregolare: il bordo non è mai liscio
    top.push(`${f1(x)},${f1(y(x) - half(x) + bumps[i])}`);
    bot.unshift(`${f1(x)},${f1(y(x) + half(x) - bumps[N - i] * 0.7)}`);
  }
  const bark = r.pick(BARK), dark = r.pick(BARK_DARK);
  const leaf = (x: number, yy: number, ang: number, size: number, autumn = false) => {
    // foglia a mandorla con la nervatura, ruotata attorno al picciolo
    const g = svg('g', { transform: `translate(${f1(x)} ${f1(yy)}) rotate(${ang.toFixed(0)})` });
    g.append(svg('path', { d: `M0,0 Q${size},${-size * 0.62} ${size * 2},0 Q${size},${size * 0.62} 0,0Z`, fill: autumn ? r.pick(AUTUMN) : r.pick(LEAVES) }),
      svg('path', { d: `M0.5,0 L${f1(size * 1.7)},0`, stroke: 'rgba(20, 30, 15, 0.35)', 'stroke-width': 0.8 }));
    return g;
  };
  const front: SVGElement[] = [];
  // rametti, dietro al ramo, con una foglia in punta
  for (let i = 0, n = 1 + r.int(3); i < n; i++) {
    const x = x0 + (x1 - x0) * r.range(0.25, 0.85), up = r.chance(0.65), len = r.range(16, 30), s = up ? -1 : 1;
    const ex = x + dir * len * 0.8, ey = y(x) + s * len * 0.6;
    el.append(svg('path', { d: `M${f1(x)},${f1(y(x))} Q${f1(x + dir * len * 0.3)},${f1(y(x) + s * len * 0.5)} ${f1(ex)},${f1(ey)}`, stroke: bark, 'stroke-width': f1(r.range(2.6, 4)), fill: 'none', 'stroke-linecap': 'round' }));
    front.push(leaf(ex, ey, s * 30 * dir + (fromLeft ? 0 : 180), r.range(6, 8.5), r.chance(0.2)));
  }
  el.append(svg('polygon', { points: [...top, ...bot].join(' '), fill: bark }));
  // il lato in ombra sotto
  const shade: string[] = [], shadeBack: string[] = [];
  for (let i = 0; i <= N; i++) { const x = x0 + ((x1 - x0) * i) / N; shade.push(`${f1(x)},${f1(y(x) + half(x) * 0.15)}`); shadeBack.unshift(`${f1(x)},${f1(y(x) + half(x))}`); }
  el.append(svg('polygon', { points: [...shade, ...shadeBack].join(' '), fill: dark, opacity: 0.55 }));
  // venature della corteccia
  for (let i = 0; i < 6; i++) {
    const xa = x0 + (x1 - x0) * r.range(0.05, 0.7), l = r.range(14, 34) * dir, off = r.range(-0.45, 0.25);
    el.append(svg('path', { d: `M${f1(xa)},${f1(y(xa) + half(xa) * off)} L${f1(xa + l)},${f1(y(xa + l) + half(xa + l) * off)}`, stroke: dark, 'stroke-width': 1.2, opacity: 0.45, 'stroke-linecap': 'round' }));
  }
  // un moncherino spezzato, col legno chiaro del taglio
  if (r.chance(0.7)) {
    const x = x0 + (x1 - x0) * r.range(0.3, 0.6), up = r.chance(0.5), s = up ? -1 : 1, hh = half(x);
    const ex = x + dir * 7, ey = y(x) + s * (hh + 7);
    el.append(svg('path', { d: `M${f1(x - dir * 4)},${f1(y(x))} L${f1(ex - dir * 2.5)},${f1(ey)} L${f1(ex + dir * 3.5)},${f1(ey + s * 0.5)} L${f1(x + dir * 6)},${f1(y(x))}Z`, fill: bark }),
      svg('ellipse', { cx: f1(ex + dir * 0.5), cy: f1(ey), rx: 3.3, ry: 1.4, fill: '#b08e6a' }));
  }
  // foglie che spuntano lungo il ramo, sopra e sotto, e un ciuffo in punta
  for (let i = 0, n = 3 + r.int(3); i < n; i++) {
    const x = x0 + (x1 - x0) * r.range(0.3, 0.95), up = r.chance(0.6);
    const ang = (up ? r.range(-70, -25) : r.range(20, 60)) * dir + (fromLeft ? 0 : 180);
    front.push(leaf(x, y(x) + (up ? -1 : 1) * half(x) * 0.8, ang, r.range(5, 8), r.chance(0.12)));
  }
  for (let i = 0, n = 2 + r.int(2); i < n; i++) front.push(leaf(x1, y(x1) + r.range(-2, 2), r.range(-45, 45) + (fromLeft ? 0 : 180), r.range(7, 10), r.chance(0.15)));
  el.append(...front);
  return { y, half, el };
}

function tag(e: EntrustedMemory, r: Rng, knotY: number, fruit: string, open: (id: string) => void) {
  const len = Math.round(r.range(14, 34)), tilt = r.range(-3, 3), wide = Math.round(r.range(86, 96));
  return h('button', { class: 'mt-tag', style: `--len:${len}px;--tilt:${tilt.toFixed(1)}deg;width:${wide}%;margin-top:${(knotY + len).toFixed(0)}px`, onclick: () => open(e.grave.id) },
    h('img', { src: fruit, alt: '' }),
    h('b', {}, e.grave.name),
    h('small', {}, t('tree.list.tag', { category: CATEGORY_LABELS[e.grave.category], date: fmtDate(e.entrustedAt) })),
    e.ghostVisits ? h('span', { class: 'mt-seen' }, icon('ghost', 14), t('tree.list.returned', { n: e.ghostVisits })) : null);
}

/** I ricordi (dal più recente) appesi ai rami, due per ramo. */
export function memoryTags(list: EntrustedMemory[], fruit: string, open: (id: string) => void): HTMLElement {
  const rows: HTMLElement[] = [];
  for (let i = 0; i * 2 < list.length; i++) {
    const pair = list.slice(i * 2, i * 2 + 2);
    const r = createRng(`ramo-${i}`);
    const fromLeft = i % 2 === 0;
    // i cartellini dalla base verso la punta; da solo, il cartellino sta vicino alla base
    const cols = fromLeft ? [0, 1] : [1, 0];
    const far = COLS[cols[pair.length - 1]];
    const reach = (fromLeft ? far : W - far) + r.range(40, 70);
    const b = branch(r, fromLeft, Math.min(W + 6, reach));
    const knots = svg('svg', { viewBox: `0 0 ${W} ${BH}`, preserveAspectRatio: 'none', class: 'mt-knots', 'aria-hidden': 'true' });
    const row = h('div', { class: 'mt-row' }, b.el, knots);
    pair.forEach((e, k) => {
      const x = COLS[cols[k]];
      // il nodo dello spago attorno al ramo
      knots.append(svg('ellipse', { cx: f1(x), cy: f1(b.y(x)), rx: 2.6, ry: f1(b.half(x) + 1), fill: 'none', stroke: '#cbb48a', 'stroke-width': 1.6 }));
      const el = tag(e, r, b.y(x) + b.half(x) - 1, fruit, open);
      el.style.gridColumn = String(cols[k] + 1);
      row.append(el);
    });
    rows.push(row);
  }
  return h('div', { class: 'mt-list' }, ...rows);
}
