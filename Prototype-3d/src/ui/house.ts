// Casa del Custode: il registro delle sepolture, la
// personalizzazione della casa (tetto e aggiunte del cortile) e la scheda
// «Casa» della Bottega, dove tetti e aggiunte si comprano salendo di rango.

import { RANKS } from '../game/balance.ts';
import { CATEGORY_LABELS, graveVisualState } from '../game/graves.ts';
import { HOUSE_PARTS, HOUSE_ROOFS, houseItem, houseRoof, houseShown, houseVariant, type HousePart, type HouseRoof } from '../game/house.ts';
import { rankForXp } from '../game/progression.ts';
import * as R from '../game/rules.ts';
import type { SaveData } from '../game/state.ts';
import { housePartLP } from '../render/lowpoly/architecture.ts';
import { memoryFruitLP } from '../render/lowpoly/memoryTree.ts';
import type { LPModel } from '../render/lowpoly/kit.ts';
import { LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { currentLang, t } from '../i18n/index.ts';
import { closeDrawer, confirmDialog, fmtDate, h, openDrawer, setDrawerBody, setDrawerHero, toast, wispPill } from './dom.ts';
import { icon } from './icons.ts';
import { uiPlay } from '../app/uiNext.ts';
import { previewUrl } from './previews.ts';
import { houseHeader } from './houseHeader.ts';
import { registryHeader } from './registryHeader.ts';
import { openDeceased } from './deceased.ts';
import { needChip, needRows, tabGlyph, type UnlockNeed } from './screens.ts';
import { graveThumb, modelThumb, placeableThumb } from './thumbs.ts';
import type { UI } from './UI.ts';

const asModel = (m: LPModel, height: number) => ({ geometries: m.geometries, lights: m.lights, height, mats: LOWPOLY_MATERIALS, dedicated: true });
const fruitImg = () => modelThumb('frutto-ricordo', asModel(memoryFruitLP(), 1), [1, 1]);

/** Miniatura di un tetto (la casa nuda con quel tetto) o di un'aggiunta da sola. */
/** L'immagine di un tetto o di un'aggiunta: l'anteprima illuminata (interfaccia «viva») o la miniatura. */
function houseImg(s: SaveData, id: string, cls: 'lit' | 'lit-hero'): HTMLElement {
  const url = uiPlay() && s.settings.style === 'lowpoly' ? previewUrl(`house-${id}`) : null;
  return url ? h('img', { class: cls, src: url, alt: '', decoding: 'async' }) : h('img', { src: houseItemImg(s, id), alt: '' });
}

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
    out.push({ icon: 'rank', short: t('house.ui.need.rankShort', { rank: it.minRank }), long: t('house.ui.need.rank', { rank: it.minRank, name: need.name, now: rank.level, xp: (need.minXp - s.player.xp).toLocaleString(currentLang()) }), progress: [s.player.xp, need.minXp] });
  }
  if (s.player.wisps < it.cost) out.push({ icon: 'wisp', short: t('house.ui.need.wispsShort', { n: it.cost - s.player.wisps }), long: t('house.ui.need.wisps', { cost: it.cost, n: it.cost - s.player.wisps }), progress: [s.player.wisps, it.cost] });
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
      title: t('house.ui.registry.locate'),
      message: tree ? t('house.ui.registry.locate.tree') : t('house.ui.registry.locate.grave'),
      ok: t('house.ui.registry.locate.ok'), cancel: t('house.ui.registry.locate.cancel'),
    });
    if (!yes) return;
    closeDrawer(true);
    game.locate(id);
  };
  const render = () => {
    const rows = [
      ...s.graves.map((g) => ({ id: g.id, name: g.name, at: g.createdAt, tree: false, legacy: !!g.legacy, img: graveThumb(g.graveType, s.settings.style, graveVisualState(g), g.seed), sub: CATEGORY_LABELS[g.category] })),
      ...s.entrusted.map((e) => ({ id: e.grave.id, name: e.grave.name, at: e.grave.createdAt, tree: true, legacy: !!e.grave.legacy, img: fruitImg(), sub: t('house.ui.registry.row.tree', { date: fmtDate(e.entrustedAt) }) })),
    ].filter((r) => filter === 'all' || (filter === 'tree') === r.tree)
      .sort((a, b) => b.at.localeCompare(a.at));
    const count = (f: RegFilter) => f === 'all' ? s.graves.length + s.entrusted.length : f === 'tree' ? s.entrusted.length : s.graves.length;
    const REG_MONO: Record<RegFilter, string> = { all: 'book', graves: 'tomb', tree: 'tree' };
    const tabs = h('div', { class: 'tabs' }, ...([['all', t('house.ui.registry.tab.all')], ['graves', t('house.ui.registry.tab.graves')], ['tree', t('house.ui.registry.tab.tree')]] as const).map(([f, label]) =>
      h('button', { class: `tab ${f === filter ? 'active' : ''}`, onclick: () => { filter = f; render(); } }, tabGlyph(REG_MONO[f]), label, h('small', { class: 'tab-n' }, String(count(f))))));
    setDrawerBody(h('div', { class: 'registry' },
      uiPlay() ? null : h('p', { class: 'muted' }, t('house.ui.registry.intro')),
      tabs,
      rows.length ? h('div', { class: 'reg-list' }, ...rows.map((r) => h('div', { class: 'reg-row' },
        h('button', { class: 'reg-open', onclick: () => openRegistryEntry(ui, r.id, filter) },
          h('span', { class: 'reg-thumb' }, h('img', { src: r.img, alt: '' })),
          h('span', { class: 'reg-text' }, h('b', {}, r.name),
            h('small', {}, r.legacy ? t('house.ui.registry.row.legacy', { sub: r.sub }) : t('house.ui.registry.row.buried', { date: fmtDate(r.at), sub: r.sub })))),
        h('button', { class: 'reg-go', 'aria-label': t('house.ui.registry.locateAria', { name: r.name }), onclick: () => go(r.id, r.tree) }, icon('pin', 22), h('span', {}, t('house.ui.registry.locate'))))))
        : h('p', { class: 'muted reg-empty' }, filter === 'tree' ? t('house.ui.registry.empty.tree') : t('house.ui.registry.empty.all')),
    ));
  };
  openDrawer(t('house.ui.registry.title'), h('div'));
  setDrawerHero(registryHeader({ settled }).el);
  render();
}

/**
 * La scheda di una sepoltura aperta dal registro: la scheda del defunto,
 * con «Vai alla tomba» (o all'albero); chiudendo si torna all'elenco.
 */
function openRegistryEntry(ui: UI, id: string, filter: RegFilter) {
  openDeceased(ui, id, { from: 'registry', back: () => openRegistry(ui, filter, true) });
}

// ── Personalizza la casa ──────────────────────────────────────────────

/** I vantaggi che la casa dà adesso (le aggiunte in vista), uno per riga. */
function perksBox(s: SaveData): HTMLElement {
  const on = HOUSE_PARTS.filter((p) => houseShown(s.house).includes(p.id));
  return h('div', { class: 'perks' }, h('div', { class: 'needs-title' }, icon('unlock', 14), on.length ? t('house.ui.perks.on') : t('house.ui.perks.none')),
    on.length ? h('ul', {}, ...on.map((p) => h('li', {}, h('b', {}, p.label), ' · ', p.perk)))
      : h('p', { class: 'muted', style: 'margin:0;font-size:13px' }, t('house.ui.perks.hint')));
}

export function openHouse(ui: UI) {
  const game = ui.game;
  const s = game.state;
  const render = () => {
    header.setVariant(houseVariant(s.house));
    // solo quello che si ha: il resto si vede (e si compra) in Bottega, scheda «Casa»
    const roofs = HOUSE_ROOFS.filter((r) => s.house.owned.includes(r.id));
    const parts = HOUSE_PARTS.filter((p) => s.house.owned.includes(p.id));
    const card = (it: HouseRoof | HousePart, active: boolean, onclick: () => void) =>
      h('button', { class: `card ${active ? 'selected' : ''}`, onclick },
        h('span', { class: 'thumb' }, houseImg(s, it.id, 'lit'),
          active ? h('span', { class: 'owned-tick' }, icon('check', 15)) : null),
        h('b', {}, it.label),
        h('span', { class: 'price owned' }, active ? t('house.ui.card.shown') : t('house.ui.card.hidden')));
    setDrawerBody(h('div', {},
      uiPlay() ? null : h('p', { class: 'muted', style: 'margin:0 0 10px' }, t('house.ui.hint')),
      perksBox(s),
      roofs.length > 1 ? h('div', {}, h('div', { class: 'section-title' }, t('house.ui.roof')),
        h('div', { class: 'grid' }, ...roofs.map((r) => card(r, s.house.roof === r.id, () => {
          if (game.act((st) => R.setHouseRoof(st, r.id))) render();
        })))) : null,
      h('div', { class: 'section-title' }, t('house.ui.yard')),
      parts.length ? h('div', { class: 'grid' }, ...parts.map((p) => card(p, !s.house.hidden.includes(p.id), () => {
        if (game.act((st, n) => { R.toggleHousePart(st, p.id, n); })) {
          toast(s.house.hidden.includes(p.id) ? t('house.ui.partHidden', { label: p.label }) : t('house.ui.partShown', { label: p.label, perk: p.perk }));
          render();
        }
      })))
        : h('p', { class: 'muted' }, roofs.length > 1 ? t('house.ui.empty.parts') : t('house.ui.empty.all')),
    ));
  };
  openDrawer(t('house.ui.title'), h('div'), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => closeDrawer() }, t('dialog.close')),
      h('button', { class: 'big-btn', onclick: () => openHouseShop(ui) }, icon('shop', 20), t('house.ui.more'))),
  });
  // in testata la casa di notte, com'è adesso: si aggiorna togliendo o rimettendo le aggiunte
  const header = houseHeader(houseVariant(s.house));
  setDrawerHero(header.el);
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
      h('span', { class: 'thumb' }, houseImg(s, it.id, 'lit'),
        locked ? h('span', { class: 'lock-over' }, icon('lock', 30)) : null,
        has ? h('span', { class: 'owned-tick' }, icon('check', 15)) : null),
      h('b', {}, it.label),
      has ? h('span', { class: 'price owned' }, t('house.ui.shop.owned')) : needs.length ? needChip(needs[0]) : h('span', { class: 'price' }, String(it.cost), icon('wisp', 12)));
  }));
}

/** Il dettaglio di un tetto o di un'aggiunta, col pulsante per comprarla. */
export function houseShopDetail(ui: UI, id: string, close: () => void, bought: () => void): HTMLElement {
  const game = ui.game;
  const s = game.state;
  const it = houseItem(id)!;
  const has = s.house.owned.includes(id);
  const needs = has ? [] : houseNeeds(s, it);
  const kind = houseRoof(id) ? t('house.ui.shop.kindRoof') : t('house.ui.shop.kindPart');
  return h('div', { class: 'shop-detail' }, wispPill(s.player.wisps),
    h('div', { class: 'shop-detail-top' }, houseImg(s, id, 'lit-hero'),
      h('h3', {}, it.label), h('p', { class: 'muted' }, t(id === 'veggie' ? 'house.ui.shop.subVeggie' : 'house.ui.shop.sub', { kind, rank: it.minRank }))),
    h('p', { class: 'muted', style: 'margin:0' }, it.description),
    'perk' in it ? h('div', { class: 'perk-row' }, icon('unlock', 18), h('p', {}, h('b', {}, `${t('house.ui.shop.perkLabel')} `), it.perk, ` ${t('house.ui.shop.perkNote')}`)) : h('p', { class: 'muted', style: 'margin:0;font-size:12px' }, t('house.ui.shop.cosmetic')),
    needRows(needs),
    !has && !needs.length && it.cost ? h('p', { class: 'muted after-buy' }, t('house.ui.shop.after', { n: (s.player.wisps - it.cost).toLocaleString(currentLang()) })) : null,
    h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: close }, t('dialog.close')),
      h('button', {
        class: 'big-btn', disabled: has || needs.length > 0,
        onclick: () => { if (game.act((st, n) => R.buyHousePart(st, id, n))) bought(); },
      }, has ? t('house.ui.shop.has') : needs.length ? t('house.ui.shop.notYet') : h('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, t('house.ui.shop.buy', { cost: it.cost }), icon('wisp', 18)))));
}

/** Apre la Bottega direttamente sulla scheda «Casa» (dalla personalizzazione). */
function openHouseShop(ui: UI, selected: string | null = null) {
  ui.openShop('house', selected);
}

/** Dopo l'acquisto: si va a vederla, o si continua a guardare. `leave` chiude il modale prima di uscire dalla Bottega. */
export function houseBoughtView(ui: UI, id: string, back: () => void, leave: () => void): HTMLElement {
  const s = ui.game.state;
  return h('div', { class: 'shop-detail' }, wispPill(s.player.wisps),
    h('div', { class: 'shop-detail-top' }, houseImg(s, id, 'lit-hero'), h('h3', {}, houseItem(id)!.label),
      h('p', { class: 'muted' }, t('house.ui.bought.text'))),
    h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: back }, t('house.ui.bought.continue')),
      h('button', { class: 'big-btn', onclick: () => { leave(); closeDrawer(); ui.game.focusHouse(); } }, icon('house', 20), t('house.ui.bought.go'))));
}
