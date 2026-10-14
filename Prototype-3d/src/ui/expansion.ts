// Ampiezza del recinto, a scelta del giocatore: l'avviso quando il prestigio
// sblocca una nuova area, lo slider nelle Impostazioni (i livelli non ancora
// sbloccati sono bloccati) e l'avviso quando, stringendo, qualcosa resta fuori.

import { EXPANSION } from '../game/balance.ts';
import * as R from '../game/rules.ts';
import { computePrestige } from '../game/world.ts';
import { closeDrawer, h, openDrawer } from './dom.ts';
import { icon } from './icons.ts';
import { openSettings } from './screens.ts';
import type { UI } from './UI.ts';

const sizeOf = (level: number) => `${EXPANSION[level].size}×${EXPANSION[level].size}`;

/** Il prestigio ha sbloccato una nuova area: ampliare ora o più tardi. */
export function openExpansionOffer(ui: UI, level: number) {
  const game = ui.game;
  const t = EXPANSION[level];
  openDrawer('Nuova area sbloccata', h('div', {},
    h('div', { class: 'ach got', style: 'margin-bottom:10px' }, h('div', { class: 'ico' }, icon('fence', 30)),
      h('div', {}, h('b', {}, t.label), h('p', {}, `Il recinto può allargarsi a ${sizeOf(level)} (ora è ${sizeOf(game.state.world.expansionLevel)}).`))),
    h('p', {}, 'Il prestigio del tuo cimitero ha guadagnato nuova terra consacrata. Puoi ampliare il recinto adesso, oppure più tardi da Impostazioni › Terreno, dove puoi anche tornare a un recinto più raccolto.'),
  ), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => closeDrawer() }, 'Più tardi'),
      h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.setExpansion(level); } }, 'Amplia')),
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
  const slider = h('input', { type: 'range', class: 'terrain-slider', min: '0', max: String(max), step: '1', value: String(w.expansionLevel), 'aria-label': 'Ampiezza del terreno' }) as HTMLInputElement;
  // la parte di binario percorribile (fino all'ultimo livello sbloccato) è dorata
  slider.style.setProperty('--open', pct(w.unlockedLevel));
  const describe = (l: number) => {
    title.textContent = `${EXPANSION[l].label} · ${sizeOf(l)}`;
    const next = EXPANSION[w.unlockedLevel + 1];
    const prestige = computePrestige(game.state);
    note.textContent = l === w.expansionLevel
      ? (next ? `Prossima area: «${next.label}» con ${next.minPrestige} di prestigio (ora ${prestige}).` : 'Hai sbloccato tutto il cimitero.')
      : l > w.expansionLevel ? 'Rilascia per ampliare il recinto.' : 'Rilascia per stringere il recinto.';
  };
  describe(w.expansionLevel);
  slider.addEventListener('input', () => {
    // oltre l'ultimo livello sbloccato non si va
    if (Number(slider.value) > w.unlockedLevel) {
      slider.value = String(w.unlockedLevel);
      const l = w.unlockedLevel + 1;
      note.textContent = `«${EXPANSION[l].label}» (${sizeOf(l)}) si sblocca con ${EXPANSION[l].minPrestige} di prestigio.`;
      title.textContent = `${EXPANSION[w.unlockedLevel].label} · ${sizeOf(w.unlockedLevel)}`;
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
  const ticks = h('div', { class: 'terrain-ticks' }, ...EXPANSION.map((t, i) => h('span', { class: i > w.unlockedLevel ? 'locked' : i === w.expansionLevel ? 'current' : '', style: `left:${pct(i)}` },
    i > w.unlockedLevel ? icon('lock', 12) : null, String(t.size))));
  return h('div', { class: 'terrain' }, title, slider, ticks, note);
}

/** Stringendo, qualcosa resta fuori: avviso, poi si sistema sulla mappa. */
function openShrinkWarning(ui: UI, level: number, out: ReturnType<typeof R.outsideArea>) {
  const game = ui.game;
  const graves = out.filter((o) => o.kind === 'grave').length;
  const items = out.length - graves;
  const parts = [graves ? `${graves} ${graves === 1 ? 'tomba' : 'tombe'}` : '', items ? `${items} ${items === 1 ? 'oggetto' : 'oggetti'}` : ''].filter(Boolean).join(' e ');
  const shown = out.slice(0, 8);
  openDrawer('Elementi fuori dall’area', h('div', {},
    h('p', {}, `Nell’area «${EXPANSION[level].label}» (${sizeOf(level)}) non entrano ${parts}. Per stringere il recinto vanno prima spostati dentro l’area o rimessi in inventario.`),
    h('ul', { class: 'timeline' }, ...shown.map((o) => h('li', {}, `${o.kind === 'grave' ? '✝' : '✦'} ${o.label}`)), out.length > shown.length ? h('li', { class: 'muted' }, `…e altri ${out.length - shown.length}`) : null),
    h('p', { class: 'muted' }, 'Con «OK» torni sulla mappa: l’area scelta è segnata in oro e gli elementi da sistemare sono in rosso. Attiva Modifica per spostarli (le tombe si spostano, gli oggetti si possono anche rimettere in inventario), poi Salva.'),
  ), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => openSettings(ui) }, 'Annulla'),
      h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.startShrink(level); } }, 'OK')),
  });
}

/** Banner della riduzione: quanti elementi restano fuori, Modifica, Annulla, Salva. */
export function areaBanner(ui: UI, left: number): HTMLElement {
  const game = ui.game;
  const level = game.shrink!.level;
  return h('div', { class: 'area-banner', id: 'area-banner' },
    h('div', { class: 'area-text' },
      h('b', {}, `Stringi a «${EXPANSION[level].label}» · ${sizeOf(level)}`),
      h('span', {}, left ? `${left === 1 ? 'Un elemento è' : `${left} elementi sono`} ancora fuori dall’area (in rosso): «Mostra» li trova.` : 'Tutto dentro: puoi salvare.')),
    h('div', { class: 'row' },
      // acceso (dorato) mentre la modifica è attiva: si tocca di nuovo per uscirne
      h('button', { class: `pill${game.editMode ? ' primary' : ''}`, 'aria-pressed': String(game.editMode), onclick: () => { game.setEditMode(!game.editMode); ui.refreshAreaBanner(left); } }, icon('edit', 16), 'Modifica'),
      h('button', { class: 'pill', disabled: !left, onclick: () => game.showNextOutside() }, icon('search', 16), 'Mostra'),
      h('button', { class: 'pill', onclick: () => game.cancelShrink() }, 'Annulla'),
      h('button', { class: 'pill primary', disabled: left > 0, onclick: () => game.finishShrink() }, 'Salva')));
}
