// Casa del Custode: il registro delle sepolture, la
// personalizzazione della casa (tetto e aggiunte del cortile) e la scheda
// «Casa» della Bottega, dove tetti e aggiunte si comprano salendo di rango.

import { RANKS } from '../game/balance.ts';
import { CATEGORY_LABELS, deathCauseLabel, GRAVE_TYPE_LABELS, graveVisualState } from '../game/graves.ts';
import { HOUSE_PARTS, HOUSE_ROOFS, houseItem, houseRoof, houseShown, houseVariant, type HousePart, type HouseRoof } from '../game/house.ts';
import { rankForXp } from '../game/progression.ts';
import * as R from '../game/rules.ts';
import type { SaveData } from '../game/state.ts';
import { housePartLP } from '../render/lowpoly/architecture.ts';
import { memoryFruitLP } from '../render/lowpoly/memoryTree.ts';
import type { LPModel } from '../render/lowpoly/kit.ts';
import { LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { closeDrawer, confirmDialog, fmtDate, h, openDrawer, setDrawerBody, setDrawerHero, toast } from './dom.ts';
import { icon } from './icons.ts';
import { memorials } from '../app/persistence.ts';
import { portrait } from './memorial.ts';
import { registryHeader } from './registryHeader.ts';
import { needChip, needRows, type UnlockNeed } from './screens.ts';
import { graveThumb, modelThumb, placeableThumb } from './thumbs.ts';
import type { UI } from './UI.ts';

const asModel = (m: LPModel, height: number) => ({ geometries: m.geometries, lights: m.lights, height, mats: LOWPOLY_MATERIALS, dedicated: true });
const fruitImg = () => modelThumb('frutto-ricordo', asModel(memoryFruitLP(), 1), [1, 1]);

/** La casa com'è adesso (o con un tetto diverso), in miniatura. */
const houseImg = (s: SaveData, roof = s.house.roof) => placeableThumb('keeper_house', s.settings.style, houseVariant({ ...s.house, roof }));
/** Miniatura di un tetto (la casa nuda con quel tetto) o di un'aggiunta da sola. */
export function houseItemImg(s: SaveData, id: string): string {
  if (houseRoof(id)) return placeableThumb('keeper_house', s.settings.style, houseVariant({ owned: [id], roof: id, hidden: [] }));
  return modelThumb(`hpart:${id}`, asModel(housePartLP(id), 1), [1, 1]);
}

/** Cosa manca per un tetto o un'aggiunta: rango e fuochi fatui. */
function houseNeeds(s: SaveData, it: HouseRoof | HousePart): UnlockNeed[] {
  const out: UnlockNeed[] = [];
  const rank = rankForXp(s.player.xp);
  if (it.minRank > rank.level) {
    const need = RANKS.find((r) => r.level === it.minRank)!;
    out.push({ icon: 'lock', short: `Rango ${it.minRank}`, long: `Si sblocca al rango ${it.minRank}, «${need.name}». Sei al rango ${rank.level}: mancano ${(need.minXp - s.player.xp).toLocaleString('it-IT')} punti Necro.`, progress: [s.player.xp, need.minXp] });
  }
  if (s.player.wisps < it.cost) out.push({ icon: 'wisp', short: `Mancano ${it.cost - s.player.wisps}`, long: `Costa ${it.cost} fuochi fatui: te ne mancano ${it.cost - s.player.wisps}.`, progress: [s.player.wisps, it.cost] });
  return out;
}

// ── Registro delle sepolture ──────────────────────────────────────────

type RegFilter = 'all' | 'graves' | 'tree';

/** Dalla casa: tutte le sepolture, nel cimitero e affidate all'albero, con «Localizza». */
export function openRegistry(ui: UI, filter: RegFilter = 'all', settled = false) {
  const game = ui.game;
  const s = game.state;
  const go = async (id: string, tree: boolean) => {
    const yes = await confirmDialog({
      title: 'Localizza',
      message: tree ? 'Riposa nell’Albero dei ricordi. Vuoi andarci?' : 'Vuoi andare al luogo di sepoltura?',
      ok: 'Andiamo', cancel: 'Resta qui',
    });
    if (!yes) return;
    closeDrawer(true);
    game.locate(id);
  };
  const render = () => {
    const rows = [
      ...s.graves.map((g) => ({ id: g.id, name: g.name, at: g.createdAt, tree: false, legacy: !!g.legacy, img: graveThumb(g.graveType, s.settings.style, graveVisualState(g), g.seed), sub: CATEGORY_LABELS[g.category] })),
      ...s.entrusted.map((e) => ({ id: e.grave.id, name: e.grave.name, at: e.grave.createdAt, tree: true, legacy: !!e.grave.legacy, img: fruitImg(), sub: `affidato all’albero il ${fmtDate(e.entrustedAt)}` })),
    ].filter((r) => filter === 'all' || (filter === 'tree') === r.tree)
      .sort((a, b) => b.at.localeCompare(a.at));
    const count = (f: RegFilter) => f === 'all' ? s.graves.length + s.entrusted.length : f === 'tree' ? s.entrusted.length : s.graves.length;
    const tabs = h('div', { class: 'tabs' }, ...([['all', 'Tutte'], ['graves', 'Nel cimitero'], ['tree', 'Nell’albero']] as const).map(([f, label]) =>
      h('button', { class: `tab ${f === filter ? 'active' : ''}`, onclick: () => { filter = f; render(); } }, label, h('small', { class: 'tab-n' }, String(count(f))))));
    setDrawerBody(h('div', { class: 'registry' },
      h('p', { class: 'muted' }, 'Ogni nome che il Custode ha scritto nel libro: dove riposa e da quando.'),
      tabs,
      rows.length ? h('div', { class: 'reg-list' }, ...rows.map((r) => h('div', { class: 'reg-row' },
        h('button', { class: 'reg-open', onclick: () => openRegistryEntry(ui, r.id, filter) },
          h('span', { class: 'reg-thumb' }, h('img', { src: r.img, alt: '' })),
          h('span', { class: 'reg-text' }, h('b', {}, r.name),
            h('small', {}, `${r.legacy ? 'lascito del vecchio custode' : `sepolto il ${fmtDate(r.at)}`} · ${r.sub}`))),
        h('button', { class: 'reg-go', 'aria-label': `Localizza ${r.name}`, onclick: () => go(r.id, r.tree) }, icon('pin', 22), h('span', {}, 'Localizza')))))
        : h('p', { class: 'muted reg-empty' }, filter === 'tree' ? 'All’albero non hai ancora affidato nessuno.' : 'Il libro è ancora bianco: la prima sepoltura la scriverai tu.'),
    ));
  };
  openDrawer('Registro delle sepolture', h('div'));
  setDrawerHero(registryHeader({ settled }).el);
  render();
}

/**
 * La scheda di una sepoltura aperta dal registro: si legge e basta. L'unica
 * azione è andarci (le cure si fanno sul posto, camminando per il cimitero);
 * chiudendo si torna all'elenco.
 */
function openRegistryEntry(ui: UI, id: string, filter: RegFilter) {
  const game = ui.game;
  const s = game.state;
  const kept = R.entrustedById(s, id);
  const g = kept?.grave ?? s.graves.find((x) => x.id === id);
  if (!g) return;
  const stone = kept ? fruitImg() : graveThumb(g.graveType, s.settings.style, graveVisualState(g), g.seed % 4);
  const head = h('img', { src: stone, alt: '' }) as HTMLElement;
  // la foto dell'oggetto, se c'è, come nella scheda della tomba
  if (g.photoId) void memorials.get(g.photoId).then((m) => { if (m && head.isConnected) head.replaceWith(portrait(m.dataUrl, stone)); }).catch(() => undefined);
  openDrawer(g.name, h('div', {},
    h('div', { class: 'hero' }, head, h('h3', {}, g.name),
      g.epitaph ? h('div', { class: 'epitaph' }, `“${g.epitaph}”`) : null),
    h('dl', { class: 'kv' },
      h('dt', {}, 'Categoria'), h('dd', {}, CATEGORY_LABELS[g.category]),
      h('dt', {}, 'Vissuto'), h('dd', {}, `${fmtDate(g.birthDate)} → ${fmtDate(g.deathDate)}`),
      h('dt', {}, 'Causa'), h('dd', {}, deathCauseLabel(g.deathCause, g.deathCauseText)),
      h('dt', {}, 'Sepolto'), h('dd', {}, g.legacy ? 'Lascito del vecchio custode' : fmtDate(g.createdAt)),
      h('dt', {}, 'Riposa'), h('dd', {}, kept ? `Nell’Albero dei ricordi, dal ${fmtDate(kept.entrustedAt)}` : `${GRAVE_TYPE_LABELS[g.graveType]}, nel cimitero`)),
  ), {
    // la X (e il tocco fuori) riportano all'elenco, col filtro di prima
    beforeClose: () => { openRegistry(ui, filter, true); return false; },
    footer: h('button', { class: 'big-btn', onclick: () => { closeDrawer(true); game.locate(id); } }, icon('pin', 22), kept ? 'Vai all’albero' : 'Vai alla tomba'),
  });
}

// ── Personalizza la casa ──────────────────────────────────────────────

/** I vantaggi che la casa dà adesso (le aggiunte in vista), uno per riga. */
function perksBox(s: SaveData): HTMLElement {
  const on = HOUSE_PARTS.filter((p) => houseShown(s.house).includes(p.id));
  return h('div', { class: 'perks' }, h('div', { class: 'needs-title' }, icon('unlock', 14), on.length ? 'Vantaggi attivi' : 'Nessun vantaggio attivo'),
    on.length ? h('ul', {}, ...on.map((p) => h('li', {}, h('b', {}, p.label), ' · ', p.perk)))
      : h('p', { class: 'muted', style: 'margin:0;font-size:13px' }, 'Ogni aggiunta del cortile aiuta un po’ nel gioco: fiori che durano, meno erbacce, riparazioni che costano meno…'));
}

export function openHouse(ui: UI) {
  const game = ui.game;
  const s = game.state;
  const render = () => {
    // solo quello che si ha: il resto si vede (e si compra) in Bottega, scheda «Casa»
    const roofs = HOUSE_ROOFS.filter((r) => s.house.owned.includes(r.id));
    const parts = HOUSE_PARTS.filter((p) => s.house.owned.includes(p.id));
    const card = (it: HouseRoof | HousePart, active: boolean, onclick: () => void) =>
      h('button', { class: `card ${active ? 'selected' : ''}`, onclick },
        h('span', { class: 'thumb' }, h('img', { src: houseItemImg(s, it.id), alt: '' }),
          active ? h('span', { class: 'owned-tick' }, icon('check', 15)) : null),
        h('b', {}, it.label),
        h('span', { class: 'price owned' }, active ? 'In vista' : 'Tolto'));
    setDrawerBody(h('div', {},
      h('div', { class: 'hero house-hero' }, h('img', { src: houseImg(s), alt: '' }),
        h('p', { class: 'muted', style: 'margin:0' }, 'Tocca un tetto per cambiarlo, un’aggiunta per toglierla o rimetterla. I vantaggi valgono solo per le aggiunte in vista.')),
      perksBox(s),
      roofs.length > 1 ? h('div', {}, h('div', { class: 'section-title' }, 'Tetto'),
        h('div', { class: 'grid' }, ...roofs.map((r) => card(r, s.house.roof === r.id, () => {
          if (game.act((st) => R.setHouseRoof(st, r.id))) render();
        })))) : null,
      h('div', { class: 'section-title' }, 'Cortile e casa'),
      parts.length ? h('div', { class: 'grid' }, ...parts.map((p) => card(p, !s.house.hidden.includes(p.id), () => {
        if (game.act((st, n) => { R.toggleHousePart(st, p.id, n); })) {
          toast(s.house.hidden.includes(p.id) ? `${p.label} tolta: il suo vantaggio si ferma finché non la rimetti.` : `${p.label} di nuovo in vista. ${p.perk}`);
          render();
        }
      })))
        : h('p', { class: 'muted' }, roofs.length > 1 ? 'Nessuna aggiunta ancora: lanterne, fioriere, orto e il resto li trovi in Bottega, nella scheda «Casa».' : 'Per ora c’è solo la casa: tetti, lanterne, fioriere, orto e il resto li trovi in Bottega, nella scheda «Casa».'),
    ));
  };
  openDrawer('Casa del Custode', h('div'), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => closeDrawer() }, 'Chiudi'),
      h('button', { class: 'big-btn', onclick: () => openHouseShop(ui) }, icon('shop', 20), 'Altre aggiunte')),
  });
  render();
}

// ── Bottega, scheda «Casa» ────────────────────────────────────────────

/** Le carte della scheda «Casa»; `select` apre il dettaglio sotto. */
export function houseShopGrid(s: SaveData, selected: string | null, select: (id: string) => void): HTMLElement {
  const items = [...HOUSE_ROOFS.filter((r) => r.cost > 0), ...HOUSE_PARTS];
  return h('div', { class: 'grid' }, ...items.map((it) => {
    const has = s.house.owned.includes(it.id);
    const needs = has ? [] : houseNeeds(s, it);
    const locked = needs.some((n) => n.icon === 'lock');
    return h('button', { class: `card ${selected === it.id ? 'selected' : ''} ${locked ? 'locked' : ''} ${!locked && needs.length ? 'dim' : ''} ${has ? 'owned' : ''}`, onclick: () => select(it.id) },
      h('span', { class: 'thumb' }, h('img', { src: houseItemImg(s, it.id), alt: '' }),
        locked ? h('span', { class: 'lock-over' }, icon('lock', 30)) : null,
        has ? h('span', { class: 'owned-tick' }, icon('check', 15)) : null),
      h('b', {}, it.label),
      has ? h('span', { class: 'price owned' }, 'Tuo') : needs.length ? needChip(needs[0]) : h('span', { class: 'price' }, String(it.cost), icon('wisp', 12)));
  }));
}

/** Il dettaglio di un tetto o di un'aggiunta, col pulsante per comprarla. */
export function houseShopDetail(ui: UI, id: string, close: () => void, bought: () => void): HTMLElement {
  const game = ui.game;
  const s = game.state;
  const it = houseItem(id)!;
  const has = s.house.owned.includes(id);
  const needs = has ? [] : houseNeeds(s, it);
  const kind = houseRoof(id) ? 'Tetto' : 'Aggiunta della casa';
  return h('div', { class: 'shop-detail' },
    h('div', { class: 'shop-detail-top' }, h('img', { src: houseItemImg(s, id), alt: '' }),
      h('div', {}, h('h3', {}, it.label), h('p', { class: 'muted' }, `${kind} · rango ${it.minRank}${id === 'veggie' ? ' · rende fuochi fatui ogni giorno' : ''}`))),
    h('p', { class: 'muted', style: 'margin:0' }, it.description),
    'perk' in it ? h('div', { class: 'perk-row' }, icon('unlock', 18), h('p', {}, h('b', {}, 'Vantaggio: '), it.perk, ' Vale finché l’aggiunta è in vista.')) : h('p', { class: 'muted', style: 'margin:0;font-size:12px' }, 'Solo estetico: cambia l’aspetto della casa.'),
    needRows(needs),
    h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: close }, 'Chiudi'),
      h('button', {
        class: 'big-btn', disabled: has || needs.length > 0,
        onclick: () => { if (game.act((st, n) => R.buyHousePart(st, id, n))) bought(); },
      }, has ? 'Già tuo' : needs.length ? 'Non ancora' : h('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, `Compra · ${it.cost}`, icon('wisp', 18)))));
}

/** Apre la Bottega direttamente sulla scheda «Casa» (dalla personalizzazione). */
function openHouseShop(ui: UI, selected: string | null = null) {
  ui.openShop('house', selected);
}

/** Dopo l'acquisto: si va a vederla, o si continua a guardare. */
export function houseBoughtFooter(ui: UI, back: () => void): HTMLElement {
  return h('div', { class: 'row' },
    h('button', { class: 'big-btn ghost', onclick: back }, 'Continua'),
    h('button', { class: 'big-btn', onclick: () => { closeDrawer(); ui.game.focusHouse(); } }, icon('house', 20), 'Vai alla casa'));
}
