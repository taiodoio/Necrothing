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
import { closeDrawer, fmtDate, h, openDrawer } from './dom.ts';
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
  if (!R.memoryTree(s)) { openDrawer('Albero dei ricordi', h('p', {}, 'Per affidare una tomba serve l’Albero dei ricordi (in Bottega, tra le Costruzioni).')); return; }
  const xp = g.category === 'abstract' ? XP.burialAbstract : XP.burialPhysical;
  openDrawer('Affidare all’albero?', h('div', {},
    h('div', { class: 'hero' }, h('img', { src: treeImg(s.entrusted.length + 1), alt: '' }), h('h3', {}, g.name)),
    h('p', {}, 'Il corteo solleverà la bara e la porterà all’Albero dei ricordi, dove la terra la accoglierà tra le radici.'),
    h('ul', { class: 'timeline' },
      h('li', {}, '✦ La tomba viene tolta: lo spazio torna libero.'),
      h('li', {}, '✦ Il ricordo resta nell’albero, con la sua scheda e la sua storia.'),
      h('li', {}, '✦ Ogni tanto il suo fantasma tornerà a passeggiare vicino all’albero.'),
      h('li', {}, `✦ Come per una sepoltura: +${WISPS.burial} fuochi fatui, +${xp} punti Necro.`)),
    h('p', { class: 'muted' }, 'Non si torna indietro: dall’albero non si dissotterra.'),
  ), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => closeDrawer() }, 'Annulla'),
      h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.entrust(graveId); } }, 'Affida')),
  });
}

/** Toccando l'albero: la lista di ciò che gli è stato affidato. */
export function openMemoryTree(ui: UI) {
  const game = ui.game;
  const s = game.state;
  const list = [...s.entrusted].reverse();
  const tree = R.memoryTree(s);
  openDrawer('Albero dei ricordi', h('div', {},
    h('div', { class: 'hero' }, h('img', { src: treeImg(s.entrusted.length), alt: '' }),
      h('p', { class: 'muted', style: 'margin:0' }, list.length ? `${list.length} ${list.length === 1 ? 'ricordo affidato' : 'ricordi affidati'} · uno per ogni frutto acceso` : 'Non gli hai ancora affidato nulla.')),
    list.length ? h('div', { class: 'section-title' }, 'Gli hai affidato') : h('p', { class: 'muted' }, 'Apri la scheda di una tomba e scegli «Affida all’albero»: il corteo porterà qui la bara e la terra la accoglierà. Lo spazio della tomba si libera, il ricordo resta.'),
    ...list.map((e) => h('button', { class: 'ach got memory-row', onclick: () => openMemory(ui, e.grave.id) },
      h('div', { class: 'ico' }, h('img', { src: fruitImg(), width: 36, height: 36, alt: '' })),
      h('div', {}, h('b', {}, e.grave.name), h('p', {}, `${CATEGORY_LABELS[e.grave.category]} · affidato il ${fmtDate(e.entrustedAt)}`)))),
  ), { footer: tree ? h('button', { class: 'big-btn ghost', onclick: () => { closeDrawer(); game.focusEntity(tree.id); } }, 'Mostra sulla mappa') : undefined });
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
  openDrawer('Ricordo', h('div', {},
    visit ? h('div', { class: 'ach got', style: 'margin-bottom:10px' }, h('div', { class: 'ico' }, icon('wisp', 30)),
      h('div', {}, h('b', {}, `Il fantasma di ${g.name} è tornato a trovarti`), h('p', {}, [visit.wisps ? `+${visit.wisps} fuochi fatui` : '', visit.xp ? `+${visit.xp} punti Necro` : ''].filter(Boolean).join(' · ')))) : null,
    h('div', { class: 'hero' }, h('img', { src: fruitImg(), alt: '' }), h('h3', {}, g.name),
      g.epitaph ? h('div', { class: 'epitaph' }, `“${g.epitaph}”`) : null,
      h('p', { class: 'muted', style: 'margin:0' }, `Riposa tra le radici dell’Albero dei ricordi dal ${fmtDate(e.entrustedAt)}.`)),
    h('dl', { class: 'kv' },
      h('dt', {}, 'Categoria'), h('dd', {}, CATEGORY_LABELS[g.category]),
      h('dt', {}, 'Vissuto'), h('dd', {}, `${fmtDate(g.birthDate)} → ${fmtDate(g.deathDate)}`),
      h('dt', {}, 'Causa'), h('dd', {}, deathCauseLabel(g.deathCause, g.deathCauseText)),
      h('dt', {}, 'Lapide'), h('dd', {}, `${GRAVE_TYPE_LABELS[g.graveType]} (nel cimitero fino al ${fmtDate(e.entrustedAt)})`),
      h('dt', {}, 'Apparizioni'), h('dd', {}, visits ? `Il suo fantasma è passato ${visits === 1 ? 'una volta' : `${visits} volte`}` : 'Il suo fantasma non si è ancora visto'),
    ),
    mem.length ? h('div', {}, h('div', { class: 'section-title' }, 'Ricordi'),
      h('ul', { class: 'timeline' }, ...mem.map((m) => h('li', {}, h('time', {}, fmtDate(m.at)), m.type === 'ghost' && m.at >= e.entrustedAt ? 'Apparizione vicino all’albero' : MEMORY_LABELS[m.type])))) : null,
  ), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => openMemoryTree(ui) }, 'Tutti i ricordi'),
      tree ? h('button', { class: 'big-btn ghost', onclick: () => { closeDrawer(); game.focusEntity(tree.id); } }, 'Mostra l’albero') : null),
  });
}
