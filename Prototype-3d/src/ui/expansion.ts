// Ampiezza del recinto, a scelta del giocatore: l'avviso quando il prestigio
// sblocca una nuova area, lo slider nelle Impostazioni (i livelli non ancora
// sbloccati sono bloccati) e l'avviso quando, stringendo, qualcosa resta fuori.

import { EXPANSION } from '../game/balance.ts';
import * as R from '../game/rules.ts';
import { computePrestige } from '../game/world.ts';
import { t } from '../i18n/index.ts';
import { closeDrawer, h, openDrawer } from './dom.ts';
import { icon } from './icons.ts';
import { openSettings } from './screens.ts';
import type { UI } from './UI.ts';

const sizeOf = (level: number) => t('area.size', { n: EXPANSION[level].size });

/** Il prestigio ha sbloccato una nuova area: ampliare ora o più tardi. */
export function openExpansionOffer(ui: UI, level: number) {
  const game = ui.game;
  const area = EXPANSION[level];
  openDrawer(t('area.offer.title'), h('div', {},
    h('div', { class: 'ach got', style: 'margin-bottom:10px' }, h('div', { class: 'ico' }, icon('fence', 30)),
      h('div', {}, h('b', {}, area.label), h('p', {}, t('area.offer.grow', { size: sizeOf(level), now: sizeOf(game.state.world.expansionLevel) })))),
    h('p', {}, t('area.offer.text')),
  ), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => closeDrawer() }, t('area.offer.later')),
      h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.setExpansion(level); } }, t('area.offer.expand'))),
  });
}

/** Sezione «Terreno» delle Impostazioni: slider dell'ampiezza, livelli bloccati in grigio. */
export function terrainSection(ui: UI): HTMLElement {
  const game = ui.game;
  const w = game.state.world;
  const max = EXPANSION.length - 1;
  const pct = (l: number) => `${(l / max) * 100}%`;
  const title = h('b', {});
  const note = h('p', { class: 'muted', style: 'margin:4px 0 0' });
  const slider = h('input', { type: 'range', class: 'terrain-slider', min: '0', max: String(max), step: '1', value: String(w.expansionLevel), 'aria-label': t('area.slider.aria') }) as HTMLInputElement;
  // la parte di binario percorribile (fino all'ultimo livello sbloccato) è dorata
  slider.style.setProperty('--open', pct(w.unlockedLevel));
  const describe = (l: number) => {
    title.textContent = t('area.slider.title', { label: EXPANSION[l].label, size: sizeOf(l) });
    const next = EXPANSION[w.unlockedLevel + 1];
    const prestige = computePrestige(game.state);
    note.textContent = l === w.expansionLevel
      ? (next ? t('area.next', { label: next.label, prestige: next.minPrestige, now: prestige }) : t('area.all'))
      : l > w.expansionLevel ? t('area.release.grow') : t('area.release.shrink');
  };
  describe(w.expansionLevel);
  slider.addEventListener('input', () => {
    // oltre l'ultimo livello sbloccato non si va
    if (Number(slider.value) > w.unlockedLevel) {
      slider.value = String(w.unlockedLevel);
      const l = w.unlockedLevel + 1;
      note.textContent = t('area.locked', { label: EXPANSION[l].label, size: sizeOf(l), prestige: EXPANSION[l].minPrestige });
      title.textContent = t('area.slider.title', { label: EXPANSION[w.unlockedLevel].label, size: sizeOf(w.unlockedLevel) });
      return;
    }
    describe(Number(slider.value));
  });
  slider.addEventListener('change', () => {
    const level = Number(slider.value);
    if (level === w.expansionLevel) { describe(level); return; }
    if (level > w.expansionLevel) { game.setExpansion(level); describe(level); return; }
    const out = R.outsideArea(game.state, level);
    if (!out.length) { game.setExpansion(level); describe(level); return; }
    openShrinkWarning(ui, level, out);
  });
  const ticks = h('div', { class: 'terrain-ticks' }, ...EXPANSION.map((lv, i) => h('span', { class: i > w.unlockedLevel ? 'locked' : i === w.expansionLevel ? 'current' : '', style: `left:${pct(i)}` },
    i > w.unlockedLevel ? icon('lock', 12) : null, String(lv.size))));
  return h('div', { class: 'terrain' }, title, slider, ticks, note);
}

/** Stringendo, qualcosa resta fuori: avviso, poi si sistema sulla mappa. */
function openShrinkWarning(ui: UI, level: number, out: ReturnType<typeof R.outsideArea>) {
  const game = ui.game;
  const graves = out.filter((o) => o.kind === 'grave').length;
  const items = out.length - graves;
  const g = graves ? t('area.shrink.graves', { n: graves }) : '', it = items ? t('area.shrink.items', { n: items }) : '';
  const parts = g && it ? t('area.shrink.both', { graves: g, items: it }) : g || it;
  const shown = out.slice(0, 8);
  openDrawer(t('area.shrink.title'), h('div', {},
    h('p', {}, t('area.shrink.text', { label: EXPANSION[level].label, size: sizeOf(level), what: parts })),
    h('ul', { class: 'timeline' }, ...shown.map((o) => h('li', {}, `${o.kind === 'grave' ? '✝' : '✦'} ${o.label}`)), out.length > shown.length ? h('li', { class: 'muted' }, t('area.shrink.more', { n: out.length - shown.length })) : null),
    h('p', { class: 'muted' }, t('area.shrink.hint')),
  ), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => openSettings(ui) }, t('dialog.cancel')),
      h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.startShrink(level); } }, t('area.shrink.ok'))),
  });
}

/** Banner della riduzione: quanti elementi restano fuori, Modifica, Annulla, Salva. */
export function areaBanner(ui: UI, left: number): HTMLElement {
  const game = ui.game;
  const level = game.shrink!.level;
  return h('div', { class: 'area-banner', id: 'area-banner' },
    h('div', { class: 'area-text' },
      h('b', {}, t('area.banner.title', { label: EXPANSION[level].label, size: sizeOf(level) })),
      h('span', {}, left ? (left === 1 ? t('area.banner.leftOne') : t('area.banner.left', { n: left })) : t('area.banner.done'))),
    h('div', { class: 'row' },
      // acceso (dorato) mentre la modifica è attiva: si tocca di nuovo per uscirne
      h('button', { class: `pill${game.editMode ? ' primary' : ''}`, 'aria-pressed': String(game.editMode), onclick: () => { game.setEditMode(!game.editMode); ui.refreshAreaBanner(left); } }, icon('edit', 16), t('area.banner.edit')),
      h('button', { class: 'pill', disabled: !left, onclick: () => game.showNextOutside() }, icon('search', 16), t('area.banner.show')),
      h('button', { class: 'pill', onclick: () => game.cancelShrink() }, t('dialog.cancel')),
      h('button', { class: 'pill primary', disabled: left > 0, onclick: () => game.finishShrink() }, t('area.banner.save'))));
}
