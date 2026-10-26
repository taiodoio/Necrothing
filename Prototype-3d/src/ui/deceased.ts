// Scheda unica del defunto (in prova): la stessa per la tomba nel cimitero,
// il ricordo sull'albero e la riga del Registro. Cambiano solo le azioni e,
// in testa, il motivo per cui la si apre: il suo fantasma, l'anniversario.
// Per ora non è collegata al gioco: serve per le anteprime.

import { CATEGORY_LABELS, deathCauseLabel, GRAVE_STATE_LABELS, GRAVE_TYPE_LABELS, graveVisualState } from '../game/graves.ts';
import * as R from '../game/rules.ts';
import type { Grave, MemoryType } from '../game/state.ts';
import { t } from '../i18n/index.ts';
import { memorials } from '../app/persistence.ts';
import { closeDrawer, fmtDate, h, openDrawer } from './dom.ts';
import { icon } from './icons.ts';
import { openPostcard, portrait } from './memorial.ts';
import { fruitImg, openMemoryTree } from './memoryTree.ts';
import { npcPortrait } from './npcPortraits.ts';
import { confirmExhume, MEMORY_LABELS, moreActions, postcardData } from './screens.ts';
import { graveThumb } from './thumbs.ts';
import type { UI } from './UI.ts';

/** Da dove si arriva: decide il pulsante principale e cosa fa la X. */
export type DeceasedFrom = 'map' | 'tree' | 'registry' | 'note';

export interface DeceasedOpts {
  from?: DeceasedFrom;
  /** Il suo fantasma è appena passato (con quanto ha lasciato). */
  ghost?: { wisps: number; xp: number };
  /** Oggi è il suo anniversario (anni dalla morte, quanto ha dato). */
  anniversary?: { years: number; wisps: number; xp: number };
  /** Torna all'elenco da cui si è aperta (Registro), invece di chiudere. */
  back?: () => void;
}

/** Un'icona per ogni voce della cronologia. */
const LOG_ICONS: Record<MemoryType, string> = {
  burial: 'coffin', flower: 'flower', cleaned: 'broom', repaired: 'hammer', anniversary: 'calendar',
  ghost: 'ghost', blessing: 'bell', zombie: 'skull', entrusted: 'tree',
};

const gains = (wisps: number, xp: number) => h('span', { class: 'dc-gains' },
  wisps ? h('span', {}, icon('wisp', 13), t('tree.memory.visitWisps', { n: wisps })) : null,
  xp ? h('span', {}, t('tree.memory.visitXp', { n: xp })) : null);

export function openDeceased(ui: UI, id: string, opts: DeceasedOpts = {}) {
  const game = ui.game;
  const s = game.state;
  const kept = R.entrustedById(s, id);
  const g: Grave | undefined = kept?.grave ?? s.graves.find((x) => x.id === id);
  if (!g) return;
  const from = opts.from ?? (kept ? 'tree' : 'map');
  const vs = kept ? null : graveVisualState(g);
  const log = s.memories.filter((m) => m.graveId === id).reverse();
  const ghosts = kept ? kept.ghostVisits : log.filter((m) => m.type === 'ghost').length;

  // la foto, se c'è, al posto della lapide (o del frutto), che resta in piccolo
  const medal = kept ? fruitImg() : graveThumb(g.graveType, s.settings.style, vs!, g.seed % 4);
  const head = h('img', { src: medal, alt: '' }) as HTMLElement;
  let photoUrl: string | null = null;
  if (g.photoId) void memorials.get(g.photoId).then((m) => { if (m && head.isConnected) { photoUrl = m.dataUrl; head.replaceWith(portrait(m.dataUrl, medal)); } }).catch(() => undefined);

  // perché la scheda si apre: il suo fantasma, l'anniversario
  const banner = opts.ghost
    ? h('div', { class: 'dc-banner ghost' },
      h('img', { src: npcPortrait(kept ? 'ghost' : 'ghostRare') || '', alt: '' }),
      h('div', {}, h('b', {}, t(kept ? 'deceased.ghost.memory' : 'deceased.ghost.grave', { name: g.name })),
        h('p', {}, t(kept ? 'deceased.ghost.memoryText' : 'deceased.ghost.graveText')), gains(opts.ghost.wisps, opts.ghost.xp)))
    : opts.anniversary
      ? h('div', { class: 'dc-banner anniv' },
        h('span', { class: 'dc-banner-ico' }, icon('calendar', 40)),
        h('div', {}, h('b', {}, t('deceased.anniv.title')),
          h('p', {}, t('deceased.anniv.text', { n: opts.anniversary.years, name: g.name })), gains(opts.anniversary.wisps, opts.anniversary.xp)))
      : null;

  // dove riposa, in una pillola sotto il nome
  const where = kept
    ? h('span', { class: 'dc-where tree' }, icon('tree', 16), t('deceased.where.tree', { date: fmtDate(kept.entrustedAt) }))
    : g.legacy
      ? h('span', { class: 'dc-where legacy' }, icon('book', 16), t('deceased.where.legacy'))
      : h('span', { class: 'dc-where' }, icon('bury', 16), t('deceased.where.grave'));

  const facts = h('dl', { class: 'kv' },
    h('dt', {}, t('deceased.category')), h('dd', {}, CATEGORY_LABELS[g.category]),
    h('dt', {}, t('deceased.lived')), h('dd', {}, g.birthDate ? `${fmtDate(g.birthDate)} → ${fmtDate(g.deathDate)}` : t('deceased.died', { date: fmtDate(g.deathDate) })),
    h('dt', {}, t('deceased.cause')), h('dd', {}, deathCauseLabel(g.deathCause, g.deathCauseText)),
    h('dt', {}, t('deceased.buried')), h('dd', {}, g.legacy ? t('deceased.buriedLegacy') : fmtDate(g.createdAt)),
    h('dt', {}, t('deceased.stone')), h('dd', {}, kept ? t('deceased.stoneGone', { type: GRAVE_TYPE_LABELS[g.graveType], date: fmtDate(kept.entrustedAt) }) : GRAVE_TYPE_LABELS[g.graveType]),
    vs ? h('dt', {}, t('deceased.state')) : null,
    vs ? h('dd', { class: g.broken ? 'warn' : '' }, g.broken ? t('detail.grave.stateBroken', { state: GRAVE_STATE_LABELS[vs], n: R.graveRepairPrice(s) }) : GRAVE_STATE_LABELS[vs]) : null,
    h('dt', {}, t('deceased.ghosts')), h('dd', {}, ghosts ? t('deceased.ghostsSeen', { n: ghosts }) : t('deceased.ghostsNone')));

  const shown = log.slice(0, 8);
  const timeline = shown.length ? h('div', {},
    h('div', { class: 'section-title' }, t('deceased.log')),
    h('ul', { class: 'dc-log' }, ...shown.map((m) => h('li', {}, icon(LOG_ICONS[m.type], 20),
      h('span', {}, kept && m.type === 'ghost' && m.at >= kept.entrustedAt ? t('tree.memory.ghostNear') : MEMORY_LABELS[m.type]),
      h('time', {}, fmtDate(m.at))))),
    log.length > shown.length ? h('p', { class: 'muted dc-more' }, t('deceased.logMore', { n: log.length - shown.length })) : null) : null;

  // azioni: nel cimitero quella che serve adesso; da lontano (Registro) «Vai alla tomba»
  const postcard = { icon: 'postcard', label: t('detail.grave.postcard'), run: async () => openPostcard(await postcardData(g, photoUrl, ui, g.seed % 4, kept ? fruitImg() : undefined)) };
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

  openDrawer(kept ? t('tree.memory.title') : t('detail.grave.title'), h('div', { class: 'deceased' },
    banner,
    h('div', { class: 'hero' }, head, h('h3', {}, g.name), where,
      g.epitaph ? h('div', { class: 'epitaph' }, t('detail.epitaph.quoted', { text: g.epitaph })) : null),
    facts,
    timeline,
  ), {
    beforeClose: opts.back ? () => { opts.back!(); return false; } : from === 'tree' ? () => { openMemoryTree(ui); return false; } : undefined,
    footer: h('div', { style: 'display:grid;gap:6px' }, moreActions(more), main),
  });
}
