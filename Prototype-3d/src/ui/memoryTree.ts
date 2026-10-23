// Albero dei ricordi: conferma del rito (affidare una tomba), lista dei
// ricordi affidati e la scheda di ciascuno (diversa da quella della tomba:
// al posto della lapide c'è il frutto luminoso, e la storia continua).

import { WISPS, XP } from '../game/balance.ts';
import { CATEGORY_LABELS, deathCauseLabel, GRAVE_TYPE_LABELS } from '../game/graves.ts';
import * as R from '../game/rules.ts';
import type { EntrustedMemory } from '../game/state.ts';
import { memoryFruitLP, memoryTreeLP } from '../render/lowpoly/memoryTree.ts';
import { LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import type { LPModel } from '../render/lowpoly/kit.ts';
import { t } from '../i18n/index.ts';
import { closeDrawer, fmtDate, h, joinDot, openDrawer } from './dom.ts';
import { icon } from './icons.ts';
import { MEMORY_LABELS } from './screens.ts';
import { modelThumb } from './thumbs.ts';
import type { UI } from './UI.ts';

const asModel = (m: LPModel, height: number) => ({ geometries: m.geometries, lights: m.lights, height, mats: LOWPOLY_MATERIALS, dedicated: true });
const treeImg = (n: number) => modelThumb(`albero-ricordi:${Math.min(30, n)}`, asModel(memoryTreeLP(n, 2), 4), [5, 5]);
const fruitImg = () => modelThumb('frutto-ricordo', asModel(memoryFruitLP(), 1), [1, 1]);

/** Conferma prima del rito: cosa succede, e che non si torna indietro. */
export function openEntrust(ui: UI, graveId: string) {
  const game = ui.game;
  const s = game.state;
  const g = s.graves.find((x) => x.id === graveId);
  if (!g) return;
  if (!R.memoryTree(s)) { openDrawer(t('tree.title'), h('p', {}, t('tree.entrust.noTree'))); return; }
  const xp = g.category === 'abstract' ? XP.burialAbstract : XP.burialPhysical;
  openDrawer(t('tree.entrust.title'), h('div', {},
    h('div', { class: 'hero' }, h('img', { src: treeImg(s.entrusted.length + 1), alt: '' }), h('h3', {}, g.name)),
    h('p', {}, t('tree.entrust.text')),
    h('ul', { class: 'timeline' },
      h('li', {}, t('tree.entrust.step1')),
      h('li', {}, t('tree.entrust.step2')),
      h('li', {}, t('tree.entrust.step3')),
      h('li', {}, t('tree.entrust.reward', { wisps: WISPS.burial, xp }))),
    h('p', { class: 'muted' }, t('tree.entrust.final')),
  ), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => closeDrawer() }, t('dialog.cancel')),
      h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.entrust(graveId); } }, t('tree.entrust.ok'))),
  });
}

/** Toccando l'albero: la lista di ciò che gli è stato affidato. */
export function openMemoryTree(ui: UI) {
  const game = ui.game;
  const s = game.state;
  const list = [...s.entrusted].reverse();
  const tree = R.memoryTree(s);
  openDrawer(t('tree.title'), h('div', {},
    h('div', { class: 'hero' }, h('img', { src: treeImg(s.entrusted.length), alt: '' }),
      h('p', { class: 'muted', style: 'margin:0' }, list.length ? t('tree.list.count', { n: list.length }) : t('tree.list.none'))),
    list.length ? h('div', { class: 'section-title' }, t('tree.list.title')) : h('p', { class: 'muted' }, t('tree.list.hint')),
    ...list.map((e) => h('button', { class: 'ach got memory-row', onclick: () => openMemory(ui, e.grave.id) },
      h('div', { class: 'ico' }, h('img', { src: fruitImg(), width: 36, height: 36, alt: '' })),
      h('div', {}, h('b', {}, e.grave.name), h('p', {}, t('tree.list.row', { category: CATEGORY_LABELS[e.grave.category], date: fmtDate(e.entrustedAt) }))))),
  ), { footer: tree ? h('button', { class: 'big-btn ghost', onclick: () => { closeDrawer(); game.focusEntity(tree.id); } }, t('tree.list.map')) : undefined });
}

/** Scheda di un ricordo affidato (dalla lista, o toccando il suo fantasma: allora in cima c'è la visita). */
export function openMemory(ui: UI, id: string, visit?: R.ActionResult) {
  const game = ui.game;
  const s = game.state;
  const e: EntrustedMemory | undefined = R.entrustedById(s, id);
  if (!e) return;
  const g = e.grave;
  const mem = s.memories.filter((m) => m.graveId === id).slice(-10).reverse();
  const tree = R.memoryTree(s);
  const visits = e.ghostVisits;
  openDrawer(t('tree.memory.title'), h('div', {},
    visit ? h('div', { class: 'ach got', style: 'margin-bottom:10px' }, h('div', { class: 'ico' }, icon('wisp', 30)),
      h('div', {}, h('b', {}, t('tree.memory.visit', { name: g.name })), h('p', {}, joinDot([visit.wisps ? t('tree.memory.visitWisps', { n: visit.wisps }) : '', visit.xp ? t('tree.memory.visitXp', { n: visit.xp }) : ''])))) : null,
    h('div', { class: 'hero' }, h('img', { src: fruitImg(), alt: '' }), h('h3', {}, g.name),
      g.epitaph ? h('div', { class: 'epitaph' }, t('tree.memory.epitaph', { text: g.epitaph })) : null,
      h('p', { class: 'muted', style: 'margin:0' }, t('tree.memory.rest', { date: fmtDate(e.entrustedAt) }))),
    h('dl', { class: 'kv' },
      h('dt', {}, t('tree.memory.category')), h('dd', {}, CATEGORY_LABELS[g.category]),
      h('dt', {}, t('tree.memory.lived')), h('dd', {}, `${fmtDate(g.birthDate)} → ${fmtDate(g.deathDate)}`),
      h('dt', {}, t('tree.memory.cause')), h('dd', {}, deathCauseLabel(g.deathCause, g.deathCauseText)),
      h('dt', {}, t('tree.memory.stone')), h('dd', {}, t('tree.memory.stoneValue', { type: GRAVE_TYPE_LABELS[g.graveType], date: fmtDate(e.entrustedAt) })),
      h('dt', {}, t('tree.memory.apparitions')), h('dd', {}, visits ? (visits === 1 ? t('tree.memory.visitedOnce') : t('tree.memory.visited', { n: visits })) : t('tree.memory.notSeen')),
    ),
    mem.length ? h('div', {}, h('div', { class: 'section-title' }, t('tree.memory.log')),
      h('ul', { class: 'timeline' }, ...mem.map((m) => h('li', {}, h('time', {}, fmtDate(m.at)), m.type === 'ghost' && m.at >= e.entrustedAt ? t('tree.memory.ghostNear') : MEMORY_LABELS[m.type])))) : null,
  ), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => openMemoryTree(ui) }, t('tree.memory.all')),
      tree ? h('button', { class: 'big-btn ghost', onclick: () => { closeDrawer(); game.focusEntity(tree.id); } }, t('tree.memory.showTree')) : null),
  });
}
