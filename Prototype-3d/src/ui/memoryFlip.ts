// Albero dei ricordi: toccando un cartellino, quello si stacca dal ramo, si
// avvicina al centro del pannello e si gira; sul retro la storia del ricordo
// (dove riposa, epitaffio, dati, cronologia) con Cartolina e Libera. Si
// chiude con la X, toccando fuori o con la X del pannello: si rigira e torna
// al suo posto sul ramo.

import { CATEGORY_LABELS } from '../game/graves.ts';
import { t } from '../i18n/index.ts';
import { $, fmtDate, h } from './dom.ts';
import { deceasedParts } from './deceased.ts';
import { icon } from './icons.ts';
import { confirmExhume } from './screens.ts';
import type { UI } from './UI.ts';

/** Il cartellino girato adesso (uno alla volta). */
let active: { close: () => void; layer: HTMLElement } | null = null;

/** C'è un cartellino girato: lo si rimette sul ramo e si dice di sì (la X del pannello lo usa). */
export function closeFlippedTag(): boolean {
  if (!active?.layer.isConnected) { active = null; return false; }
  active.close();
  return true;
}

const MOVE_MS = 380, FLIP_MS = 520;

export function flipMemoryTag(ui: UI, id: string, from: HTMLElement, fruit: string) {
  if (active?.layer.isConnected) return;
  active = null;
  const parts = deceasedParts(ui, id);
  const drawer = $('#drawer');
  if (!parts || !parts.kept) return;
  const { g, kept } = parts;

  const close = h('button', { class: 'mtf-x', 'aria-label': t('dialog.close'), onclick: () => done() }, icon('close', 16));
  const front = h('div', { class: 'mtf-face mtf-front' },
    h('span', { class: 'mtf-hole' }),
    h('img', { class: 'mtf-fruit', src: fruit, alt: '' }),
    h('b', { class: 'mtf-name' }, g.name),
    h('small', {}, t('tree.list.tag', { category: CATEGORY_LABELS[g.category], date: fmtDate(kept.entrustedAt) })),
    kept.ghostVisits ? h('span', { class: 'mt-seen' }, icon('ghost', 14), t('tree.list.returned', { n: kept.ghostVisits })) : null);
  const photo = h('div', { class: 'mtf-photo', hidden: true }) as HTMLElement;
  void parts.photo.then((url) => { if (url) { photo.append(h('img', { src: url, alt: '' })); photo.hidden = false; } });
  const back = h('div', { class: 'mtf-face mtf-back' },
    h('span', { class: 'mtf-hole' }), close,
    h('div', { class: 'mtf-scroll' },
      h('div', { class: 'mtf-top' }, photo,
        h('b', { class: 'mtf-name' }, g.name),
        g.epitaph ? h('i', { class: 'mtf-epitaph' }, t('detail.epitaph.quoted', { text: g.epitaph })) : null,
        parts.where),
      parts.facts, parts.timeline),
    h('div', { class: 'mtf-actions' },
      h('button', { class: 'mtf-btn', onclick: () => void parts.postcard() }, icon('postcard', 18), t('detail.grave.postcard')),
      h('button', { class: 'mtf-btn danger', onclick: () => { done(true); confirmExhume(ui, id, g.name, 'memory'); } }, icon('shovel', 18), t('tree.memory.free'))));
  const inner = h('div', { class: 'mtf-inner' }, front, back);
  const card = h('div', { class: 'mtf-card' }, h('span', { class: 'mtf-string' }), inner);
  const layer = h('div', { class: 'mtf-layer drawer-overlay', onclick: (ev: Event) => { if (ev.target === layer) done(); } }, card);
  drawer.append(layer);

  // FLIP: il cartellino parte esattamente dal suo posto sul ramo
  const to = card.getBoundingClientRect(), at = from.getBoundingClientRect();
  // scala uniforme (larga quanto il cartellino), così testo e frutto non si deformano durante il volo
  const placeAtTag = () => `translate(${at.left + at.width / 2 - (to.left + to.width / 2)}px, ${at.top + at.height / 2 - (to.top + to.height / 2)}px) scale(${at.width / to.width})`; // i18n-ok: stile
  card.style.transform = placeAtTag();
  from.style.visibility = 'hidden';
  void card.offsetWidth;
  layer.classList.add('on');
  card.style.transition = `transform ${MOVE_MS}ms cubic-bezier(0.25, 1.1, 0.4, 1)`; // i18n-ok: stile
  card.style.transform = 'none';
  let timer = window.setTimeout(() => inner.classList.add('flipped'), MOVE_MS - 60);

  let closing = false;
  /** Si rigira e torna sul ramo; `now`: via subito (si chiude il pannello o si libera il ricordo). */
  function done(now = false) {
    if (closing) return;
    closing = true;
    clearTimeout(timer);
    active = null;
    const finish = () => { layer.remove(); from.style.visibility = ''; };
    if (now) { finish(); return; }
    inner.classList.remove('flipped');
    layer.classList.remove('on');
    timer = window.setTimeout(() => {
      card.style.transform = placeAtTag();
      window.setTimeout(finish, MOVE_MS);
    }, FLIP_MS - 80);
  }
  active = { close: () => done(), layer };
}
