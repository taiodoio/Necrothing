// Scheda del defunto: la stessa per la tomba nel cimitero, il ricordo
// sull'albero e la riga del Registro, con gli stessi dati, la pillola di dove
// riposa sotto il nome e la cronologia con le icone; cambiano solo le azioni.
// Per tutto il giorno dell'anniversario la tomba ha la corona di fiori al
// posto della foto.

import { CATEGORY_LABELS, deathCauseLabel, GRAVE_STATE_LABELS, GRAVE_TYPE_LABELS, graveVisualState } from '../game/graves.ts';
import * as R from '../game/rules.ts';
import { anniversaryYears } from '../game/simulation.ts';
import type { Grave, MemoryType } from '../game/state.ts';
import { t } from '../i18n/index.ts';
import { memorials } from '../app/persistence.ts';
import { closeDrawer, fmtDate, h, openDrawer } from './dom.ts';
import { icon } from './icons.ts';
import { openPostcard, portrait } from './memorial.ts';
import { fruitImg, openMemoryTree } from './memoryTree.ts';
import { annivHero } from './anniversary.ts';
import { confirmExhume, MEMORY_LABELS, moreActions, postcardData } from './screens.ts';
import { graveThumb } from './thumbs.ts';
import { factLabel, parchment } from './parchment.ts';
import { lpIconPng } from './lpIcons.ts';
import { uiPlay } from '../app/uiNext.ts';
import type { UI } from './UI.ts';

/** Lucciole attorno all'immagine: posizione (% in orizzontale, px in verticale) e grandezza. */
const FIREFLIES: Array<[number, number, number]> = [[18, 160, 1], [28, 50, 2], [64, 80, 0], [80, 150, 1], [42, 28, 2], [74, 40, 0], [12, 106, 1]];

/** Da dove si arriva: decide il pulsante principale e cosa fa la X. */
export type DeceasedFrom = 'map' | 'tree' | 'registry' | 'note';

export interface DeceasedOpts {
  from?: DeceasedFrom;
  /** Torna all'elenco da cui si è aperta (Registro), invece di chiudere. */
  back?: () => void;
}

/** Un'icona per ogni voce della cronologia. */
const LOG_ICONS: Record<MemoryType, string> = {
  burial: 'coffin', flower: 'flower', cleaned: 'broom', repaired: 'hammer', anniversary: 'wreath',
  ghost: 'ghost', blessing: 'bell', zombie: 'skull', entrusted: 'tree',
};

/**
 * I pezzi comuni della scheda: la pillola di dove riposa, i dati, la
 * cronologia e la cartolina (li usa anche il retro del cartellino dell'albero).
 */
export function deceasedParts(ui: UI, id: string) {
  const s = ui.game.state;
  const kept = R.entrustedById(s, id);
  const g: Grave | undefined = kept?.grave ?? s.graves.find((x) => x.id === id);
  if (!g) return null;
  const vs = kept ? null : graveVisualState(g);
  const log = s.memories.filter((m) => m.graveId === id).reverse();
  const ghosts = kept ? kept.ghostVisits : log.filter((m) => m.type === 'ghost').length;
  const photo = g.photoId ? memorials.get(g.photoId).then((m) => m?.dataUrl ?? null).catch(() => null) : Promise.resolve(null);

  // dove riposa, in una pillola sotto il nome
  const where = kept
    ? h('span', { class: 'dc-where tree' }, icon('tree', 16), t('deceased.where.tree', { date: fmtDate(kept.entrustedAt) }))
    : g.legacy
      ? h('span', { class: 'dc-where legacy' }, icon('book', 16), t('deceased.where.legacy'))
      : h('span', { class: 'dc-where' }, icon('bury', 16), t('deceased.where.grave'));

  const facts = h('dl', { class: 'kv' },
    h('dt', {}, ...factLabel('category', t('deceased.category'))), h('dd', {}, CATEGORY_LABELS[g.category]),
    h('dt', {}, ...factLabel('lived', t('deceased.lived'))), h('dd', {}, g.birthDate ? `${fmtDate(g.birthDate)} → ${fmtDate(g.deathDate)}` : t('deceased.died', { date: fmtDate(g.deathDate) })),
    h('dt', {}, ...factLabel('cause', t('deceased.cause'))), h('dd', {}, deathCauseLabel(g.deathCause, g.deathCauseText)),
    h('dt', {}, ...factLabel('buried', t('deceased.buried'))), h('dd', {}, g.legacy ? t('deceased.buriedLegacy') : fmtDate(g.createdAt)),
    h('dt', {}, ...factLabel('stone', t('deceased.stone'))), h('dd', {}, kept ? t('deceased.stoneGone', { type: GRAVE_TYPE_LABELS[g.graveType], date: fmtDate(kept.entrustedAt) }) : GRAVE_TYPE_LABELS[g.graveType]),
    vs ? h('dt', {}, ...factLabel('state', t('deceased.state'))) : null,
    vs ? h('dd', { class: g.broken ? 'warn' : '' }, g.broken ? t('detail.grave.stateBroken', { state: GRAVE_STATE_LABELS[vs], n: R.graveRepairPrice(s) }) : GRAVE_STATE_LABELS[vs]) : null,
    h('dt', {}, ...factLabel('ghosts', t('deceased.ghosts'))), h('dd', {}, ghosts ? t('deceased.ghostsSeen', { n: ghosts }) : t('deceased.ghostsNone')));

  const shown = log.slice(0, 8);
  const timeline = shown.length ? h('div', {},
    h('div', { class: 'section-title' }, t('deceased.log')),
    h('ul', { class: 'dc-log' }, ...shown.map((m) => h('li', {}, icon(LOG_ICONS[m.type], 20),
      h('span', {}, kept && m.type === 'ghost' && m.at >= kept.entrustedAt ? t('tree.memory.ghostNear') : MEMORY_LABELS[m.type]),
      h('time', {}, fmtDate(m.at))))),
    log.length > shown.length ? h('p', { class: 'muted dc-more' }, t('deceased.logMore', { n: log.length - shown.length })) : null) : null;
  const postcard = () => void openPostcard(photo.then((ph) => postcardData(g, ph, ui, g.seed % 4, kept ? fruitImg() : undefined)));
  return { g, kept, vs, where, facts, timeline, photo, postcard };
}

export function openDeceased(ui: UI, id: string, opts: DeceasedOpts = {}) {
  const game = ui.game;
  const s = game.state;
  const parts = deceasedParts(ui, id);
  if (!parts) return;
  const { g, kept, vs, where, facts, timeline } = parts;
  const from = opts.from ?? (kept ? 'tree' : 'map');

  // la foto, se c'è, al posto della lapide (o del frutto), che resta in piccolo
  const medal = kept ? fruitImg() : graveThumb(g.graveType, s.settings.style, vs!, g.seed % 4);
  const play = uiPlay();
  const head = h('img', { class: play ? 'dc-stone' : '', src: medal, alt: '' }) as HTMLElement;
  // interfaccia «viva»: la foto è una stampa appoggiata, con una candela accesa nell'angolo e un ciuffo di foglie
  void parts.photo.then((url) => {
    if (!url || !head.isConnected) return;
    const pic = portrait(url, play ? lpIconPng('lumino', 128) : medal);
    if (play) { pic.classList.add('print'); pic.append(h('span', { class: 'dc-fern', 'aria-hidden': 'true' })); }
    head.replaceWith(pic);
  });

  // azioni: nel cimitero quella che serve adesso; da lontano (Registro) «Vai alla tomba»
  const postcard = { icon: 'postcard', label: t('detail.grave.postcard'), run: () => void parts.postcard() };
  let main: HTMLElement;
  let more: Parameters<typeof moreActions>[0];
  if (kept) {
    main = from === 'tree'
      ? h('button', { class: 'big-btn', onclick: () => openMemoryTree(ui) }, t('tree.memory.back'))
      : h('button', { class: 'big-btn', onclick: () => { closeDrawer(true); game.locate(id); } }, icon('pin', 22), t('deceased.goTree'));
    more = [postcard, { icon: 'shovel', label: t('tree.memory.free'), danger: true, run: () => confirmExhume(ui, id, g.name, 'memory') }];
  } else {
    const act: { act: 'repair' | 'clean' | 'flowers'; label: string; ic: string } = g.broken ? { act: 'repair', label: t('detail.grave.repair', { price: R.graveRepairPrice(s) }), ic: 'hammer' }
      : g.dirty || g.weeds ? { act: 'clean', label: t('detail.grave.clean'), ic: 'broom' }
        : { act: 'flowers', label: g.hasFlowers ? t('detail.grave.renewFlowers') : t('detail.grave.bringFlowers'), ic: 'flower' };
    const goGrave = { icon: 'pin', label: t('deceased.goGrave'), run: () => { closeDrawer(true); game.locate(id); } };
    main = from === 'registry'
      ? h('button', { class: 'big-btn', onclick: () => { closeDrawer(true); game.locate(id); } }, icon('pin', 22), t('deceased.goGrave'))
      : h('button', { class: 'big-btn', onclick: () => { closeDrawer(true); game.performEntityAction(id, act.act); } }, icon(act.ic, 22), act.label);
    more = [
      from === 'note' ? goGrave : null,
      postcard,
      R.memoryTree(s) ? { icon: 'tree', label: t('detail.grave.entrust'), run: () => ui.openEntrust(id) } : null,
      { icon: 'shovel', label: t('detail.exhume'), danger: true, run: () => confirmExhume(ui, id, g.name, 'grave') },
    ];
  }

  const years = kept ? 0 : anniversaryYears(g.deathDate, game.now());
  const anniv = years
    ? annivHero({ grave: g, years, medal, where, photo: parts.photo })
    : null;
  // il nome c'è già sotto l'immagine: niente titolo in testa
  // interfaccia «viva»: alone caldo e lucciole attorno all'immagine, i dati su pergamena, la terra in fondo
  const glow = play ? [h('span', { class: 'dc-glow', 'aria-hidden': 'true' }), ...FIREFLIES.map(([x, y, k]) => h('i', { class: `dc-fly f${k}`, style: `left:${x}%;top:${y}px`, 'aria-hidden': 'true' }))] : [];
  const body = h('div', { class: 'deceased' },
    anniv ?? h('div', { class: 'hero' }, ...glow, head, h('h3', {}, g.name), where,
      g.epitaph ? h('div', { class: 'epitaph' }, t('detail.epitaph.quoted', { text: g.epitaph })) : null),
    play ? parchment('dc-facts', facts) : facts,
    play && timeline ? h('div', { class: 'dc-divider', 'aria-hidden': 'true' }, icon('pumpkin', 24)) : null,
    timeline,
    play ? h('div', { class: 'dc-earth', style: 'background-image:url(deco/ground.png)', 'aria-hidden': 'true' }) : null, // i18n-ok: stile
  );
  openDrawer('', body, {
    beforeClose: opts.back ? () => { opts.back!(); return false; } : from === 'tree' ? () => { openMemoryTree(ui); return false; } : undefined,
    footer: h('div', { style: 'display:grid;gap:6px' }, moreActions(more), main),
  });
  // i pulsanti stanno sopra il fondo del contenuto: la terra finisce sotto di loro
  if (play) {
    const foot = document.getElementById('drawer-foot')!;
    const fit = () => { if (body.isConnected) body.style.setProperty('--foot-h', `${foot.offsetHeight}px`); };
    new ResizeObserver(fit).observe(foot);
    fit();
  }
}
