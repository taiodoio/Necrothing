// Schermate nei drawer: sepoltura (wizard con anteprima), Bottega,
// Inventario, dettaglio, profilo/achievement, impostazioni, foto e galleria.

import { terrainSection } from './expansion.ts';
import { exportBackup, gallery, importBackup, type PhotoRecord } from '../app/persistence.ts';
import { BUSINESS, DECAY, EARLY_ACCESS, EXPANSION, RANKS, RELEASE_LOCKS } from '../game/balance.ts';
import { CATALOG, CATALOG_LIST, CATEGORY_ORDER, isSeasonallyAvailable, PLACEABLE_CATEGORY_LABELS, repairCost, seasonLabel, type PlaceableCategory, type PlaceableDef } from '../game/catalog.ts';
import {
  CATEGORIES, CATEGORY_LABELS, CUSTOM_CAUSE_MAX, DEATH_CAUSE_LABELS, deathCauseLabel, DEATH_CAUSES, GRAVE_STATE_LABELS,
  GRAVE_TYPE_LABELS, GRAVE_TYPE_MIN_RANK, GRAVE_TYPES, graveVisualState,
} from '../game/graves.ts';
import { ACHIEVEMENTS, achievementProgress, nextRank, rankForXp, rankProgress } from '../game/progression.ts';
import * as R from '../game/rules.ts';
import { createNewGame, type FpsSetting, type SaveData, type ThemeSetting, type TimeOverride } from '../game/state.ts';
import { computePrestige, detectDistricts, DISTRICT_LABELS, expansionStatus } from '../game/world.ts';
import { newId } from '../game/rng.ts';
import { $, closeDrawer, confirmDialog, fmtDate, h, type Modal, openDrawer, openModal, setDrawerBody, setDrawerExtra, setDrawerFooter, setDrawerHero, toast, wispPill } from './dom.ts';
import { shopHeader } from './shopHeader.ts';
import { houseBoughtView, houseShopDetail, houseShopGrid } from './house.ts';
import { graveThumb, placeableThumb } from './thumbs.ts';
import { ACH_ICONS, icon } from './icons.ts';
import { uiNext, uiPlay, uiPreview } from '../app/uiNext.ts';
import { remindersAvailable } from '../app/reminders.ts';
import { currentLang, LANGS, setLang, t, tList } from '../i18n/index.ts';

/** Interfaccia «viva»: un'icona per ogni scheda delle categorie. */
const CAT_ICON: Record<PlaceableCategory | 'all', string> = { all: 'bag', light: 'lightOn', decoration: 'flower', structure: 'fence', ambient: 'tree', npc: 'ghost', extra: 'bike' };
const tabIcon = (c: PlaceableCategory | 'all') => (uiPlay() ? icon(CAT_ICON[c], 20) : null);
import type { UI } from './UI.ts';
import { openCustomize } from './customize.ts';
import { openDeceased } from './deceased.ts';
import { BurialPhoto, loadImage, openPostcard, photoStep, portrait } from './memorial.ts';
import type { PostcardData } from './postcard.ts';
import { memorials } from '../app/persistence.ts';

const EPITAPHS = tList('burial.epitaph.suggestions');

// ── Sepoltura ──────────────────────────────────────────────────────────

/** La foto della sepoltura in corso (resta se si torna indietro dal posizionamento). */
let burialPhoto = new BurialPhoto();

/**
 * Dati della cartolina per una tomba (o una bozza): date, etichette, lapide in
 * miniatura e foto. Per un ricordo affidato all'albero `medal` è il suo frutto, al posto della lapide.
 */
export async function postcardData(g: { name: string; birthDate: string | null; deathDate: string | null; deathCause: R.BurialDraft['deathCause']; deathCauseText?: string | null; category: R.BurialDraft['category']; epitaph: string | null; graveType: NonNullable<R.BurialDraft['graveType']> }, photo: string | null, ui: UI, seed = 1, medal?: string): Promise<PostcardData> {
  const style = ui.game.state.settings.style;
  return {
    name: g.name,
    dates: g.birthDate ? `${fmtDate(g.birthDate)} — ${fmtDate(g.deathDate)}` : `† ${fmtDate(g.deathDate)}`,
    cause: deathCauseLabel(g.deathCause, g.deathCauseText),
    category: g.category ? CATEGORY_LABELS[g.category] : '—',
    epitaph: g.epitaph || null,
    photo: photo ? await loadImage(photo) : null,
    headstone: await loadImage(medal ?? graveThumb(g.graveType, style, 'flowers', seed)),
  };
}

export function openBurial(ui: UI, initial?: R.BurialDraft, startStep = 0) {
  const game = ui.game;
  const now = game.now();
  const d: R.BurialDraft = initial ? { ...initial } : R.emptyDraft(now);
  if (!initial) burialPhoto = new BurialPhoto();
  const photo = burialPhoto;
  let step = startStep;
  const level = rankForXp(game.state.player.xp).level;
  const total = 6;

  const render = () => {
    const errors = R.validateDraft(d, now);
    const body = h('div', {}, h('div', { class: 'steps' }, ...Array.from({ length: total }, (_, i) => h('i', { class: i <= step ? 'on' : '' }))));
    const field = (label: string, input: Node, err?: string) => h('div', { class: 'field' }, h('label', {}, label), input, err ? h('span', { class: 'err' }, err) : null);
    if (step === 0) {
      body.append(
        h('p', { class: 'muted' }, t('burial.intro')),
        field(t('burial.name.label'), h('input', { value: d.name, maxLength: 40, placeholder: t('burial.name.placeholder'), oninput: (e: Event) => { d.name = (e.target as HTMLInputElement).value; } })),
        field(t('burial.category.label'), h('div', { class: 'chips' }, ...CATEGORIES.map((c) => h('button', {
          class: `chip ${d.category === c ? 'active' : ''}`,
          onclick: () => { d.category = c; render(); },
        }, CATEGORY_LABELS[c])))),
      );
      if (d.category === 'abstract' && !R.canBuryAbstractToday(game.state, now)) body.append(h('p', { class: 'err muted' }, t('burial.abstractLimit')));
    } else if (step === 1) {
      body.append(photoStep(photo, render));
    } else if (step === 2) {
      body.append(
        // una data per riga: affiancate sul telefono non si leggevano
        h('div', { class: 'dates' },
          field(t('burial.birthDate.label'), h('input', { type: 'date', value: d.birthDate ?? '', max: d.deathDate ?? undefined, onchange: (e: Event) => { d.birthDate = (e.target as HTMLInputElement).value || null; render(); } }), errors.birthDate),
          field(t('burial.deathDate.label'), h('input', { type: 'date', value: d.deathDate ?? '', max: now.toISOString().slice(0, 10), onchange: (e: Event) => { d.deathDate = (e.target as HTMLInputElement).value || null; render(); } }), errors.deathDate),
        ),
        field(t('burial.cause.label'), h('div', { class: 'chips' }, ...DEATH_CAUSES.map((c) => h('button', {
          class: `chip ${d.deathCause === c ? 'active' : ''}`,
          onclick: () => { d.deathCause = c; render(); },
        }, DEATH_CAUSE_LABELS[c])),
        // oppure la si scrive a mano
        h('button', { class: `chip custom ${d.deathCause === 'custom' ? 'active' : ''}`, onclick: () => { d.deathCause = 'custom'; render(); } }, icon('edit', 16), t('burial.cause.custom')))), // i18n-ok: classe
      );
      if (d.deathCause === 'custom') {
        const inp = h('input', { value: d.deathCauseText, maxLength: CUSTOM_CAUSE_MAX, placeholder: t('burial.cause.customPlaceholder'), oninput: (e: Event) => { d.deathCauseText = (e.target as HTMLInputElement).value; } });
        body.append(field(t('burial.cause.customLabel'), inp));
        setTimeout(() => { if (!d.deathCauseText) inp.focus(); }, 0);
      }
    } else if (step === 3) {
      const ta = h('textarea', { maxLength: 240, placeholder: t('burial.epitaph.placeholder'), oninput: (e: Event) => { d.epitaph = (e.target as HTMLTextAreaElement).value; } });
      ta.value = d.epitaph;
      body.append(
        field(t('burial.epitaph.label'), ta),
        h('div', { class: 'chips' }, ...EPITAPHS.map((ep) => h('button', { class: 'chip', onclick: () => { d.epitaph = ep; render(); } }, ep))),
      );
    } else if (step === 4) {
      body.append(h('p', { class: 'muted' }, t('burial.graveType.intro')),
        h('div', { class: 'grid' }, ...GRAVE_TYPES.map((gt) => {
          const locked = GRAVE_TYPE_MIN_RANK[gt] > level;
          return h('button', {
            class: `card ${d.graveType === gt ? 'selected' : ''} ${locked ? 'dim' : ''}`,
            disabled: locked,
            onclick: () => { d.graveType = gt; render(); },
          }, h('img', { src: graveThumb(gt, game.state.settings.style), alt: '' }), h('b', {}, GRAVE_TYPE_LABELS[gt]), locked ? h('span', { class: 'lock' }, icon('lock', 12), t('burial.graveType.rankShort', { n: GRAVE_TYPE_MIN_RANK[gt] })) : null);
        })));
    } else {
      const stone = graveThumb(d.graveType!, game.state.settings.style, 'flowers', 1);
      body.append(h('div', { class: 'hero' },
        photo.has ? portrait(photo.url(), stone) : h('img', { src: stone, alt: '' }),
        h('h3', {}, d.name || '—'),
        d.epitaph ? h('div', { class: 'epitaph' }, t('burial.epitaph.quoted', { text: d.epitaph })) : null,
      ), h('dl', { class: 'kv' },
        h('dt', {}, t('burial.summary.category')), h('dd', {}, d.category ? CATEGORY_LABELS[d.category] : '—'),
        h('dt', {}, t('burial.summary.lived')), h('dd', {}, `${fmtDate(d.birthDate)} → ${fmtDate(d.deathDate)}`),
        h('dt', {}, t('burial.summary.cause')), h('dd', {}, deathCauseLabel(d.deathCause, d.deathCauseText)),
        h('dt', {}, t('burial.summary.graveType')), h('dd', {}, d.graveType ? GRAVE_TYPE_LABELS[d.graveType] : '—'),
      ), h('p', { class: 'muted' }, t('burial.summary.next')));
    }
    setDrawerBody(body);

    // la validità si guarda al tocco, non al disegno: i campi di testo cambiano senza ridisegnare il passo
    const stepValid = () => {
      const errors = R.validateDraft(d, now);
      return step === 0 ? !errors.name && !errors.category && !(d.category === 'abstract' && !R.canBuryAbstractToday(game.state, now))
        : step === 2 ? !errors.deathDate && !errors.birthDate && !errors.deathCause
          : step === 4 ? !errors.graveType : step === 5 ? Object.keys(errors).length === 0 : true;
    };
    const last = step === total - 1;
    const back = step > 0
      ? h('button', { class: 'big-btn ghost', onclick: () => { step--; render(); } }, t('burial.back'))
      : h('button', { class: 'big-btn ghost', onclick: () => closeDrawer() }, t('burial.cancel'));
    if (!last) {
      setDrawerFooter(h('div', { class: 'row' }, back,
        h('button', { class: 'big-btn', onclick: () => { if (!stepValid()) { toast(Object.values(R.validateDraft(d, now))[0] ?? t('burial.incomplete')); return; } step++; render(); } }, step === 1 && !photo.has ? t('burial.skip') : t('burial.next'))));
    } else {
      // nel riepilogo la cartolina si può già mandare, prima di scegliere il posto
      setDrawerFooter(h('div', { style: 'display:grid;gap:6px' },
        h('div', { class: 'row' }, back, h('button', { class: 'big-btn ghost', onclick: async () => openPostcard(await postcardData({ ...d, graveType: d.graveType! }, photo.url(), ui)) }, t('burial.postcard'))),
        h('button', { class: 'big-btn', disabled: !stepValid(), onclick: async () => { d.photoId = await photo.store(); closeDrawer(); game.startGravePlacement(d); } }, t('burial.choosePlace'))));
    }
  };
  openDrawer(t('burial.title'), h('div'));
  render();
}

// ── Modifica ───────────────────────────────────────────────────────────

export function openEditIntro(ui: UI) {
  let dontShow = true;
  openDrawer(t('edit.intro.title'), h('div', {},
    h('p', { class: 'muted' }, t('edit.intro.text')),
    h('label', { class: 'setting' }, t('edit.intro.dontShow'), h('input', { type: 'checkbox', checked: true, onchange: (e: Event) => { dontShow = (e.target as HTMLInputElement).checked; } })),
  ), {
    footer: h('button', { class: 'big-btn', onclick: () => { if (dontShow) ui.game.state.settings.editIntroSeen = true; closeDrawer(); ui.game.setEditMode(true); ui.game.afterChange(); } }, t('edit.intro.start')),
  });
}

// ── Bottega ────────────────────────────────────────────────────────────

const LOCK_LABEL: Record<R.ShopAvailability, string> = { ok: '', rank: t('shop.lock.rank'), season: t('shop.lock.season'), feat: t('shop.lock.feat'), owned: t('shop.lock.owned'), graves: t('shop.lock.graves'), funds: '' };

/** Etichetta del lucchetto sulla carta della Bottega. */
function lockText(s: SaveData, d: PlaceableDef, av: R.ShopAvailability): string {
  if (av === 'rank') return t('shop.lock.rankShort', { n: d.minRank });
  if (av === 'graves') return t('shop.lock.gravesCount', { n: d.minGraves ?? 0 });
  if (av === 'season') return seasonLabel(d) || LOCK_LABEL.season;
  if (av === 'feat') { const [n, goal] = R.featProgress(s, d.feat!); return `${n}/${goal}`; }
  return LOCK_LABEL[av];
}

/**
 * Cosa manca per sbloccare un oggetto, tutto insieme (rango, stagione,
 * traguardo, tombe, fuochi fatui): sulla carta il primo, nel dettaglio tutti,
 * con quanto manca e la barra quando si può contare.
 */
export interface UnlockNeed { icon: string; short: string; long: string; progress?: [number, number] }
export function unlockNeeds(s: SaveData, d: PlaceableDef, now: Date): UnlockNeed[] {
  const out: UnlockNeed[] = [];
  const early = !RELEASE_LOCKS.earlyRank && EARLY_ACCESS.has(d.id);
  if (!early && !isSeasonallyAvailable(d, now.getMonth(), now.getDate())) {
    const when = seasonLabel(d);
    // una data o un periodo («1–15 nov») si scrive così; il nome di una festa vuole «a»
    out.push(/\d|–/.test(when)
      ? { icon: 'calendar', short: t('shop.need.season.short.date', { when }), long: t('shop.need.season.long.date', { when }) }
      : { icon: 'calendar', short: t('shop.need.season.short.named', { when }), long: t('shop.need.season.long.named', { when }) });
  }
  const rank = rankForXp(s.player.xp);
  if (!early && d.minRank > rank.level) {
    const need = RANKS.find((r) => r.level === d.minRank)!;
    const missing = need.minXp - s.player.xp;
    out.push({ icon: 'lock', short: t('shop.need.rank.short', { n: d.minRank }), long: t('shop.need.rank.long', { rank: d.minRank, name: need.name, level: rank.level, n: missing, xp: missing.toLocaleString(currentLang()) }), progress: [s.player.xp, need.minXp] });
  }
  if (!early && d.feat) {
    const [n, goal] = R.featProgress(s, d.feat);
    if (n < goal) out.push({ icon: 'trophy', short: t('shop.need.feat.short', { label: d.feat.label, n, goal }), long: t('shop.need.feat.long', { label: d.feat.label.toLowerCase(), n, goal }), progress: [n, goal] });
  }
  if (RELEASE_LOCKS.minGraves && d.minGraves && R.graveTotal(s) < d.minGraves) {
    const n = R.graveTotal(s);
    out.push({ icon: 'coffin', short: t('shop.need.graves.short', { goal: d.minGraves, n }), long: t('shop.need.graves.long', { n: d.minGraves, have: n }), progress: [n, d.minGraves] });
  }
  if (s.player.wisps < d.cost) out.push({ icon: 'wisp', short: t('shop.need.wisps.short', { n: d.cost - s.player.wisps }), long: t('shop.need.wisps.long', { cost: d.cost, n: d.cost - s.player.wisps }), progress: [s.player.wisps, d.cost] });
  return out;
}

/** Il requisito come pillola (icona e testo breve) e come riga del dettaglio, con la barra. */
export const needChip = (n: UnlockNeed) => h('span', { class: `need need-${n.icon}` }, icon(n.icon, 13), n.short); // i18n-ok: classe
export const needRows = (needs: UnlockNeed[]) => needs.length ? h('div', { class: 'needs' }, h('div', { class: 'needs-title' }, icon('lock', 14), needs.length > 1 ? t('shop.needs.titleMany') : t('shop.needs.titleOne')),
  ...needs.map((n) => h('div', { class: 'need-row' }, icon(n.icon, 18), h('div', {}, h('p', {}, n.long),
    n.progress ? h('div', { class: 'xp-bar', style: 'height:6px' }, h('i', { style: `width:${Math.min(100, Math.round((n.progress[0] / Math.max(1, n.progress[1])) * 100))}%` })) : null)))) : null;

/** Testo del pulsante d'acquisto (o del perché non si può). */
function buyText(s: SaveData, d: PlaceableDef, av: R.ShopAvailability, qty: number): string {
  switch (av) {
    case 'ok': return d.cost ? t('shop.buy.cta', { n: d.cost * qty }) : t('shop.buy.free');
    case 'funds': return t('shop.buy.noFunds');
    case 'rank': return t('shop.buy.needRank', { n: d.minRank });
    case 'graves': return t('shop.buy.needGraves', { n: d.minGraves ?? 0, have: R.graveTotal(s) });
    case 'owned': return t('shop.buy.owned');
    case 'feat': { const [n, goal] = R.featProgress(s, d.feat!); return t('shop.buy.feat', { label: d.feat!.label, n, goal }); }
    case 'season': return t('shop.buy.season', { season: seasonLabel(d) });
  }
}

export function openShop(ui: UI, cat: PlaceableCategory | 'house' = 'light', selected: string | null = null) {
  const game = ui.game;
  const s = game.state;
  const now = game.now();
  const next = uiNext();
  let qty = 1;
  // interfaccia nuova: l'oggetto scelto si guarda e si compra in un modale al centro
  let modal: Modal | null = null;
  const show = (node: Node) => {
    if (!next) { setDrawerFooter(node); return; }
    if (modal) modal.set(node);
    else modal = openModal(node, { label: t('shop.modal.label'), onClose: () => { modal = null; selected = null; render(); } });
  };
  const close = () => { if (modal) modal.close(); else { selected = null; render(); } };
  const render = () => {
    drawShop();
    if (!selected) { setDrawerFooter(null); return; }
    show(cat === 'house' ? houseDetail(selected) : detail(selected));
  };
  /** Le schede e le carte (e il saldo in testata). */
  const drawShop = () => {
    const tabs = h('div', { class: 'tabs' }, ...CATEGORY_ORDER.map((c) => h('button', { class: `tab ${c === cat ? 'active' : ''}`, onclick: () => { cat = c; selected = null; render(); } }, tabIcon(c), PLACEABLE_CATEGORY_LABELS[c])),
      // tetti e aggiunte della Casa del Custode
      uiPreview() ? h('button', { class: `tab ${cat === 'house' ? 'active' : ''}`, onclick: () => { cat = 'house'; selected = null; render(); } }, uiPlay() ? icon('house', 20) : null, t('shop.tab.house')) : null);
    if (next) setDrawerExtra(wispPill(s.player.wisps));
    const pick = (id: string) => { selected = id; qty = 1; render(); };
    if (cat === 'house') {
      setDrawerBody(h('div', {}, h('p', { class: 'muted' }, next ? t('shop.house.intro') : t('shop.house.introWisps', { n: s.player.wisps, amount: s.player.wisps.toLocaleString(currentLang()) })), tabs,
        houseShopGrid(s, selected, pick)));
    } else {
      const items = CATALOG_LIST.filter((d) => d.category === cat && !d.permanent);
      const grid = h('div', { class: 'grid' }, ...items.map((d) => {
        const av = R.shopAvailability(s, d.id, now);
        if (next) {
          // interfaccia nuova: bloccati col lucchetto sopra (e il perché sotto), non comprabili spenti, i tuoi con la spunta
          const locked = av === 'rank' || av === 'season' || av === 'feat' || av === 'graves';
          const owned = av === 'owned';
          return h('button', {
            class: `card ${selected === d.id ? 'selected' : ''} ${locked ? 'locked' : ''} ${av === 'funds' ? 'dim' : ''} ${owned ? 'owned' : ''}`,
            onclick: () => pick(d.id),
          },
          h('span', { class: 'thumb' }, h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }),
            locked ? h('span', { class: 'lock-over' }, icon('lock', 30)) : null,
            owned ? h('span', { class: 'owned-tick' }, icon('check', 15)) : null),
          h('b', {}, d.label),
          // in prova: sotto la carta bloccata (o troppo cara) c'è proprio cosa serve
          uiPreview() && !owned && av !== 'ok' ? needChip(unlockNeeds(s, d, now)[0] ?? { icon: 'lock', short: lockText(s, d, av), long: '' })
            : locked ? h('span', { class: 'lock-why' }, av === 'rank' ? t('shop.need.rank.short', { n: d.minRank }) : lockText(s, d, av))
              : owned ? h('span', { class: 'price owned' }, t('shop.card.owned'))
                : h('span', { class: 'price' }, String(d.cost), icon('wisp', 12)),
          (s.inventory[d.id] ?? 0) > 0 ? h('span', { class: 'badge' }, String(s.inventory[d.id])) : null);
        }
        return h('button', {
          class: `card ${selected === d.id ? 'selected' : ''} ${av !== 'ok' ? 'dim' : ''}`,
          onclick: () => pick(d.id),
        },
        h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }),
        h('b', {}, d.label),
        h('span', { class: 'price' }, String(d.cost), icon('wisp', 12)),
        LOCK_LABEL[av] ? h('span', { class: 'lock' }, av === 'rank' || av === 'graves' || av === 'feat' ? icon('lock', 12) : null, lockText(s, d, av)) : null,
        (s.inventory[d.id] ?? 0) > 0 ? h('span', { class: 'badge' }, String(s.inventory[d.id])) : null);
      }));
      const wisps = { n: s.player.wisps, amount: s.player.wisps.toLocaleString(currentLang()) };
      setDrawerBody(h('div', {}, h('p', { class: 'muted' }, uiPreview()
        ? (next ? t('shop.intro.preview') : t('shop.intro.previewWisps', wisps))
        : t('shop.intro.classic', wisps)), tabs, grid));
    }
    // la scheda scelta resta in vista (al centro, se si può), anche dopo aver toccato un oggetto
    const active = tabs.querySelector<HTMLElement>('.tab.active');
    if (active) tabs.scrollLeft = active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2;
  };
  /** La scheda dell'oggetto scelto, da cui si compra. */
  const detail = (id: string): HTMLElement => {
    const d = CATALOG[id];
    const av = R.shopAvailability(s, d.id, now);
    const max = Math.max(1, R.maxBuyable(s, d.id));
    qty = Math.min(qty, max);
    const again = () => show(detail(id));
    /** Categoria, quanti se ne possono comprare e quanti ne hai. */
    const metaLine = (d: PlaceableDef) => {
      const p = { category: PLACEABLE_CATEGORY_LABELS[d.category], max: R.maxBuyable(s, d.id), owned: s.inventory[d.id] ?? 0 };
      if (p.owned > 0) return d.unique ? t('shop.detail.meta.uniqueOwned', p) : t('shop.detail.meta.maxOwned', p);
      return d.unique ? t('shop.detail.meta.unique', p) : t('shop.detail.meta.max', p);
    };
    return h('div', { class: next ? 'shop-detail' : '', style: next ? '' : 'display:grid;gap:8px' },
      next ? wispPill(s.player.wisps) : null,
      next
        ? h('div', { class: 'shop-detail-top' }, h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }),
          h('h3', {}, d.label), h('p', { class: 'muted' }, metaLine(d)))
        : h('div', { class: 'row' }, h('b', {}, d.label), h('span', { class: 'muted', style: 'text-align:right' }, d.unique ? t('shop.detail.unique') : t('shop.detail.max', { max: R.maxBuyable(s, d.id) }))),
      h('p', { class: 'muted', style: 'margin:0' }, d.description),
      uiPreview() ? needRows(av === 'owned' ? [] : unlockNeeds(s, d, now)) : null,
      !uiPreview() && av === 'graves' ? h('div', { class: 'xp-bar', style: 'height:6px' }, h('i', { style: `width:${Math.round((R.graveTotal(s) / d.minGraves!) * 100)}%` })) : null,
      !uiPreview() && av === 'feat' ? h('div', { class: 'xp-bar', style: 'height:6px' }, h('i', { style: `width:${Math.round((R.featProgress(s, d.feat!)[0] / d.feat!.goal) * 100)}%` })) : null,
      (d.season || d.feat) && (!uiPreview() || av === 'ok' || av === 'owned') ? h('p', { class: 'muted', style: 'margin:0;font-size:12px' }, d.season && d.feat ? t('shop.detail.seasonalFeat', { season: d.season.label, feat: d.feat.label.toLowerCase() })
        : d.season ? t('shop.detail.seasonal', { season: d.season.label }) : t('shop.detail.feat', { feat: d.feat!.label.toLowerCase() })) : null,
      !d.unique && av === 'ok' ? h('div', { class: 'qty' },
        h('button', { onclick: () => { qty = Math.max(1, qty - 1); again(); } }, '−'),
        h('b', {}, String(qty)),
        h('button', { onclick: () => { qty = Math.min(max, qty + 1); again(); } }, '+')) : null,
      next && av === 'ok' && d.cost ? h('p', { class: 'muted after-buy' }, t('shop.detail.afterBuy', { n: s.player.wisps - d.cost * qty, amount: (s.player.wisps - d.cost * qty).toLocaleString(currentLang()) })) : null,
      (next ? (b: HTMLElement) => h('div', { class: 'row' }, h('button', { class: 'big-btn ghost', onclick: close }, t('shop.detail.close')), b) : (b: HTMLElement) => b)(h('button', {
        class: 'big-btn', disabled: av !== 'ok',
        onclick: () => {
          if (!game.act((st, n) => R.buy(st, d.id, qty, n))) return;
          // gli Extra non si posano: si usano (dalle icone accanto al mirino)
          const how: Record<string, string> = {
            bike: t('shop.bought.bike'),
            broom: t('shop.bought.broom'),
            mystic_staff: t('shop.bought.mysticStaff'),
          };
          const extra = d.category === 'extra';
          if (extra) game.refreshBike();
          const text = extra ? how[d.id] ?? how.bike : t('shop.bought.item');
          const go = extra
            ? h('button', { class: 'big-btn', onclick: () => { modal?.close(true); closeDrawer(); game.useExtra(d.id); } }, game.extraLabel(d.id))
            : h('button', { class: 'big-btn', onclick: () => { modal?.close(true); closeDrawer(); game.startItemPlacement(d.id); } }, t('shop.bought.place'));
          if (next) {
            drawShop();
            show(h('div', { class: 'shop-detail' }, wispPill(s.player.wisps),
              h('div', { class: 'shop-detail-top' }, h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }), h('h3', {}, d.label), h('p', { class: 'muted' }, text)),
              h('div', { class: 'row' }, h('button', { class: 'big-btn ghost', onclick: close }, t('shop.bought.continue')), go)));
            return;
          }
          setDrawerFooter(h('div', { class: 'row' }, h('button', { class: 'big-btn ghost', onclick: () => render() }, t('shop.bought.continue')), go));
          setDrawerBody(h('div', {}, h('div', { class: 'hero' }, h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }), h('h3', {}, d.label), h('p', { class: 'muted' }, text))));
        },
      }, next && av === 'ok' && d.cost ? h('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, t('shop.buy.ctaShort', { n: d.cost * qty }), icon('wisp', 18)) : buyText(s, d, av, qty))),
      next ? null : h('button', { class: 'big-btn ghost', onclick: close }, t('shop.detail.cancel')),
    );
  };
  // la scheda «Casa»: tetti e aggiunte, comprati dallo stesso modale
  const houseDetail = (id: string) => houseShopDetail(ui, id, close, () => {
    drawShop();
    show(houseBoughtView(ui, id, close, () => modal?.close(true)));
  });
  openDrawer(t('shop.title'), h('div'), { onClose: () => modal?.close(true) });
  // interfaccia nuova: in testa l'interno della bottega, con lo zombie al lavoro
  if (next) setDrawerHero(shopHeader().el);
  render();
}

// ── Inventario ─────────────────────────────────────────────────────────

export function openInventory(ui: UI, cat: PlaceableCategory | 'all' = 'all') {
  const game = ui.game;
  const s = game.state;
  let selected: string | null = null;
  const render = () => {
    const tabs = h('div', { class: 'tabs' },
      h('button', { class: `tab ${cat === 'all' ? 'active' : ''}`, onclick: () => { cat = 'all'; render(); } }, tabIcon('all'), t('inventory.tab.all')),
      ...CATEGORY_ORDER.map((c) => h('button', { class: `tab ${c === cat ? 'active' : ''}`, onclick: () => { cat = c; selected = null; render(); } }, tabIcon(c), PLACEABLE_CATEGORY_LABELS[c])));
    const types = CATALOG_LIST.filter((d) => (cat === 'all' || d.category === cat) && ((s.inventory[d.id] ?? 0) > 0 || s.placeables.some((p) => p.type === d.id)));
    const grid = types.length ? h('div', { class: 'grid' }, ...types.map((d) => {
      const owned = s.inventory[d.id] ?? 0;
      const placed = s.placeables.filter((p) => p.type === d.id).length;
      return h('button', { class: `card ${owned === 0 ? 'dim' : ''} ${selected === d.id ? 'selected' : ''}`, onclick: () => { if (owned) { selected = d.id; render(); } else toast(t('inventory.allPlaced', { item: d.label })); } },
        h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }),
        h('b', {}, d.label),
        h('small', {}, placed ? t('inventory.placed', { n: placed }) : t('inventory.stored')),
        owned ? h('span', { class: 'badge' }, String(owned)) : null);
    })) : h('p', { class: 'muted' }, t('inventory.empty'));
    setDrawerBody(h('div', {}, tabs, grid));
    if (!selected) { setDrawerFooter(null); return; }
    const d = CATALOG[selected];
    setDrawerFooter(h('div', { style: 'display:grid;gap:8px' },
      h('div', { class: 'row' }, h('b', {}, d.label), h('span', { class: 'muted', style: 'text-align:right' }, t('inventory.owned', { n: s.inventory[d.id] ?? 0 }))),
      h('div', { class: 'row' },
        h('button', { class: 'big-btn ghost', onclick: () => { game.act((st) => R.sell(st, d.id, 1)); game.refreshBike(); if (!(s.inventory[d.id] ?? 0)) selected = null; render(); } }, t('inventory.sell', { n: R.sellPrice(d.id) })),
        d.category === 'extra'
          ? h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.useExtra(d.id); } }, game.extraLabel(d.id))
          : h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.startItemPlacement(d.id); } }, t('inventory.place'))),
    ));
  };
  openDrawer(t('inventory.title'), h('div'));
  render();
}

// ── Dettaglio ──────────────────────────────────────────────────────────

export const MEMORY_LABELS = {
  burial: t('detail.memory.burial'), flower: t('detail.memory.flower'), cleaned: t('detail.memory.cleaned'), repaired: t('detail.memory.repaired'), anniversary: t('detail.memory.anniversary'),
  ghost: t('detail.memory.ghost'), blessing: t('detail.memory.blessing'), zombie: t('detail.memory.zombie'), entrusted: t('detail.memory.entrusted'),
};

/** Bar e orto: quanto c'è da riscuotere (o quando arriva il prossimo incasso). */
function businessLine(s: SaveData, id: string, type: string, now: Date): string {
  const b = BUSINESS[type];
  const n = R.businessPending(s, id, now);
  if (s.placeables.find((x) => x.id === id)?.broken) return t('detail.business.closed');
  const range = { min: b.perDay[0], max: b.perDay[1], cap: b.cap };
  return n > 0 ? t('detail.business.ready', { n, ...range }) : t('detail.business.tomorrow', range);
}

export function openDetail(ui: UI, id: string) {
  const game = ui.game;
  const s = game.state;
  const style = s.settings.style;
  const g = s.graves.find((x) => x.id === id);
  // interfaccia nuova: la scheda del defunto (la stessa del ricordo e del Registro)
  if (g && uiNext()) { openDeceased(ui, id, { from: 'map' }); return; }
  if (g) {
    const vs = graveVisualState(g);
    const mem = s.memories.filter((m) => m.graveId === id).slice(-8).reverse();
    // la foto dell'oggetto (se c'è) prende il posto della lapide, che resta in piccolo in basso a destra
    const stone = graveThumb(g.graveType, style, vs, g.seed % 4);
    const head = h('img', { src: stone, alt: '' }) as HTMLElement;
    let photoUrl: string | null = null;
    if (g.photoId) void memorials.get(g.photoId).then((m) => { if (m && head.isConnected) { photoUrl = m.dataUrl; head.replaceWith(portrait(m.dataUrl, stone)); } }).catch(() => undefined);
    // l'azione principale è quella che serve adesso (come nel menù sulla mappa)
    const main: { act: 'repair' | 'clean' | 'flowers'; label: string; ic: string } = g.broken ? { act: 'repair', label: t('detail.grave.repair', { price: R.graveRepairPrice(s) }), ic: 'hammer' }
      : g.dirty || g.weeds ? { act: 'clean', label: t('detail.grave.clean'), ic: 'broom' }
        : { act: 'flowers', label: g.hasFlowers ? t('detail.grave.renewFlowers') : t('detail.grave.bringFlowers'), ic: 'flower' };
    openDrawer(g.legacy ? t('detail.grave.legacyTitle') : t('detail.grave.title'), h('div', {},
      h('div', { class: 'hero' },
        head,
        h('h3', {}, g.name),
        g.epitaph ? h('div', { class: 'epitaph' }, t('detail.epitaph.quoted', { text: g.epitaph })) : null),
      h('dl', { class: 'kv' },
        h('dt', {}, t('detail.grave.category')), h('dd', {}, CATEGORY_LABELS[g.category]),
        h('dt', {}, t('detail.grave.lived')), h('dd', {}, `${fmtDate(g.birthDate)} → ${fmtDate(g.deathDate)}`),
        h('dt', {}, t('detail.grave.cause')), h('dd', {}, deathCauseLabel(g.deathCause, g.deathCauseText)),
        h('dt', {}, t('detail.grave.graveType')), h('dd', {}, GRAVE_TYPE_LABELS[g.graveType]),
        h('dt', {}, t('detail.grave.state')), h('dd', {}, g.broken ? t('detail.grave.stateBroken', { state: GRAVE_STATE_LABELS[vs], n: R.graveRepairPrice(s) }) : GRAVE_STATE_LABELS[vs]),
      ),
      mem.length ? h('div', {}, h('div', { class: 'section-title' }, t('detail.grave.memories')), h('ul', { class: 'timeline' }, ...mem.map((m) => h('li', {}, h('time', {}, fmtDate(m.at)), MEMORY_LABELS[m.type])))) : null,
    ), { footer: h('div', { style: 'display:grid;gap:6px' },
      // le altre azioni (cartolina, albero, riesuma) in «Altro», secondario, sopra l'azione che serve adesso
      moreActions([
        { icon: 'postcard', label: t('detail.grave.postcard'), run: async () => openPostcard(await postcardData(g, photoUrl, ui, g.seed % 4)) },
        R.memoryTree(s) ? { icon: 'tree', label: t('detail.grave.entrust'), run: () => ui.openEntrust(id) } : null,
        { icon: 'shovel', label: t('detail.exhume'), danger: true, run: () => confirmExhume(ui, id, g.name, 'grave') },
      ]),
      h('button', { class: 'big-btn', onclick: () => { closeDrawer(true); game.performEntityAction(id, main.act); } }, icon(main.ic, 22), main.label)) });
    return;
  }
  const p = s.placeables.find((x) => x.id === id);
  if (!p) return;
  const d = CATALOG[p.type];
  const body = h('div', {},
    h('div', { class: 'hero' }, h('img', { src: placeableThumb(p.type, style, p.variant), alt: '' }), h('h3', {}, d.label), h('p', { class: 'muted' }, d.description)),
    h('dl', { class: 'kv' },
      h('dt', {}, t('detail.item.category')), h('dd', {}, PLACEABLE_CATEGORY_LABELS[d.category]),
      d.decays ? h('dt', {}, t('detail.item.condition')) : null, d.decays ? h('dd', {}, p.broken ? t('detail.item.broken', { n: R.placeableRepairPrice(s, p.type) }) : p.dirty ? t('detail.item.dirty') : t('detail.item.ok')) : null,
      d.light ? h('dt', {}, t('detail.item.light')) : null, d.light ? h('dd', {}, p.broken ? t('detail.item.lightBroken') : p.lit ? t('detail.item.lightOn') : t('detail.item.lightOff')) : null,
      BUSINESS[p.type] ? h('dt', {}, t('detail.item.business')) : null, BUSINESS[p.type] ? h('dd', {}, businessLine(s, p.id, p.type, game.now())) : null,
    ),
  );
  if (d.editableText) {
    const input = h('input', { value: p.text ?? '', maxLength: 60, placeholder: t('detail.sign.placeholder') });
    body.append(h('div', { class: 'field' }, h('label', {}, t('detail.sign.label')), input),
      h('button', { class: 'big-btn', onclick: () => { game.act((st) => R.setText(st, id, input.value)); } }, t('detail.sign.save')));
  }
  // il nome c'è già sotto l'immagine: niente titolo in testa
  openDrawer('', body);
}

/** Conferma della riesumazione (o del «Libera ricordo»), poi arriva il becchino con la carriola. */
export async function confirmExhume(ui: UI, id: string, name: string, kind: 'grave' | 'memory') {
  const grave = kind === 'grave';
  const ok = await confirmDialog({
    title: t(grave ? 'exhume.confirm.title' : 'exhume.free.title', { name }),
    message: t(grave ? 'exhume.confirm.grave' : 'exhume.confirm.memory'),
    ok: t(grave ? 'exhume.confirm.ok' : 'exhume.free.ok'), danger: true,
  });
  if (!ok) return;
  closeDrawer(true);
  ui.game.exhume(id);
}

/**
 * «Altro»: pulsante secondario sopra l'azione principale, con l'icona a sinistra
 * come lei; il menù delle azioni secondarie si apre sopra di lui, in sovrimpressione.
 * Ogni voce ha la sua icona, quelle distruttive in rosso. Dietro, la scheda si
 * scurisce perché il menù si legga bene. Si chiude scegliendo una voce,
 * toccando di nuovo «Altro» o toccando fuori.
 */
export function moreActions(items: Array<{ icon: string; label: string; danger?: boolean; run: () => void } | null>): HTMLElement {
  const wrap = h('div', { class: 'more' });
  const setOpen = (open: boolean) => {
    list.hidden = !open;
    scrim.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => document.addEventListener('pointerdown', outside, true));
    else document.removeEventListener('pointerdown', outside, true);
  };
  const outside = (e: Event) => { if (!wrap.contains(e.target as Node) || e.target === scrim) setOpen(false); };
  const scrim = h('div', { class: 'more-scrim' });
  const list = h('div', { class: 'more-list', role: 'menu' }, ...items.filter((x) => x !== null).map((it) =>
    h('button', { class: `more-item${it.danger ? ' danger' : ''}`, role: 'menuitem', onclick: () => { setOpen(false); it.run(); } }, icon(it.icon, 22), h('span', {}, it.label))));
  const toggle = h('button', { class: 'big-btn ghost more-toggle', 'aria-expanded': 'false', 'aria-haspopup': 'menu', onclick: () => setOpen(list.hidden) },
    icon('more', 22), t('detail.more'));
  list.hidden = true;
  scrim.hidden = true;
  wrap.append(scrim, list, toggle);
  return wrap;
}

// ── Profilo & achievement ──────────────────────────────────────────────

export function openPlayer(ui: UI) {
  const game = ui.game;
  const s = game.state;
  const p = s.player;
  const rank = rankForXp(p.xp);
  const next = nextRank(p.xp);
  const prestige = computePrestige(s);
  const exp = expansionStatus(s);
  const districts = detectDistricts(s.graves);
  const name = h('input', { value: p.name, maxLength: 24, onchange: (e: Event) => { p.name = (e.target as HTMLInputElement).value.trim() || t('player.defaultName'); game.afterChange(); } });
  const got = new Set(s.achievements.map((a) => a.id));
  const tiers = { gold: t('player.tier.gold'), silver: t('player.tier.silver'), bronze: t('player.tier.bronze') };
  openDrawer(t('player.title'), h('div', {},
    h('div', { class: 'field' }, h('label', {}, t('player.name')), name),
    h('button', { class: 'big-btn', style: 'margin:4px 0 10px', onclick: () => openCustomize(ui) }, t('player.customize')),
    h('dl', { class: 'kv' },
      h('dt', {}, t('player.rank')), h('dd', {}, t('player.rank.value', { level: rank.level, name: rank.name })),
      h('dt', {}, t('player.xp')), h('dd', {}, `${p.xp}${next ? ` / ${next.minXp}` : ''}`),
      h('dt', {}, t('player.wisps')), h('dd', {}, t('player.wisps.value', { n: p.wisps })),
      h('dt', {}, t('player.prestige')), h('dd', {}, String(prestige)),
      h('dt', {}, t('player.fence')), h('dd', {}, exp.unlocked > exp.level
        ? t('player.fence.unlocked', { label: exp.label, size: exp.size, max: EXPANSION[exp.unlocked].size })
        : exp.next ? t('player.fence.next', { label: exp.label, size: exp.size, prestige: exp.next.minPrestige, n: exp.toNext })
          : t('player.fence.value', { label: exp.label, size: exp.size })),
      h('dt', {}, t('player.districts')), h('dd', {}, districts.length ? districts.map((d) => DISTRICT_LABELS[d.theme]).join(', ') : t('player.districts.none')),
    ),
    h('div', { class: 'xp-bar', style: 'height:6px;margin-bottom:10px' }, h('i', { style: `width:${Math.round(rankProgress(p.xp) * 100)}%` })),
    h('div', { class: 'section-title' }, t('player.achievements', { got: got.size, total: ACHIEVEMENTS.length })),
    ...(['gold', 'silver', 'bronze'] as const).flatMap((tier) => ACHIEVEMENTS.filter((a) => a.tier === tier).map((a) => {
      const done = got.has(a.id);
      const prog = achievementProgress(a, s);
      return h('div', { class: `ach ${done ? 'got' : ''} tier-${tier}` }, // i18n-ok: classe
        h('div', { class: 'ico' }, icon(done ? (ACH_ICONS[a.id] ?? 'trophy') : 'lock', 30)),
        h('div', {}, h('b', {}, a.name), h('p', {}, t('player.achievement.line', { description: a.description, tier: tiers[tier] })), !done && prog > 0 ? h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(prog * 100)}%` })) : null));
    })),
  ));
}

// ── Impostazioni ───────────────────────────────────────────────────────

export function openSettings(ui: UI) {
  const game = ui.game;
  const s = game.state.settings;
  // il pulsante scelto si evidenzia subito (prima l'evidenza restava sul vecchio finché non si riapriva il pannello)
  const seg = <T extends string>(value: T, options: Array<[T, string]>, on: (v: T) => void) => {
    const box = h('div', { class: 'seg' });
    for (const [v, label] of options) {
      const btn = h('button', { class: v === value ? 'active' : '', 'aria-pressed': String(v === value), onclick: () => {
        for (const b of Array.from(box.children)) { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); }
        on(v);
        syncEdgeBlur();
      } }, label);
      box.append(btn);
    }
    return box;
  };
  const edgeBlur = h('input', { type: 'checkbox', checked: s.edgeBlur, disabled: s.quality === 'low', onchange: (e: Event) => game.setEdgeBlur((e.target as HTMLInputElement).checked) }) as HTMLInputElement;
  // la sfocatura non è disponibile in qualità bassa: lo stato segue la qualità scelta
  const syncEdgeBlur = () => { edgeBlur.disabled = s.quality === 'low'; edgeBlur.checked = s.edgeBlur; };
  // niente filtro "accept": iOS non conosce l'estensione .necro3d e mostrerebbe
  // il backup in grigio, non selezionabile. Il contenuto viene comunque validato.
  const fileInput = h('input', {
    type: 'file', style: 'display:none',
    onchange: async (e: Event) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      try { game.replaceState(await importBackup(await f.arrayBuffer())); toast(t('settings.backup.restored')); closeDrawer(); } catch (err) { toast(err instanceof Error ? err.message : t('settings.backup.importFailed')); }
      (e.target as HTMLInputElement).value = ''; // lo stesso file si può riscegliere
    },
  });
  const body = h('div', { 'data-settings': 'true' },
    h('button', { class: 'big-btn ghost', style: 'margin-bottom:6px', onclick: () => openCustomize(ui) }, t('settings.customize')),
    // la lingua cambia ricaricando: anche i testi calcolati all'avvio (catalogo) cambiano
    Object.keys(LANGS).length > 1
      ? h('div', { class: 'setting' }, t('settings.language'), seg(currentLang(), Object.entries(LANGS), (v) => { setLang(v); location.reload(); }))
      : null,
    h('div', { class: 'section-title' }, t('settings.section.terrain')),
    terrainSection(ui),
    h('div', { class: 'section-title' }, t('settings.section.graphics')),
    h('div', { class: 'setting' }, t('settings.quality'), seg(s.quality, [['auto', t('settings.quality.auto')], ['low', t('settings.quality.low')], ['medium', t('settings.quality.medium')], ['high', t('settings.quality.high')]], (v) => game.setQuality(v))),
    s.quality === 'auto' ? h('p', { class: 'muted', style: 'margin:-2px 0 4px;font-size:12px' }, t('settings.quality.autoHint')) : null,
    uiNext() ? h('div', { class: 'setting' }, t('settings.theme'), seg<ThemeSetting>(s.theme, [['auto', t('settings.theme.auto')], ['light', t('settings.theme.light')], ['dark', t('settings.theme.dark')]], (v) => game.setTheme(v))) : null,
    h('div', { class: 'setting' }, t('settings.fps'), seg<FpsSetting>(s.fps, [['auto', t('settings.fps.auto')], ['30', t('settings.fps.30')], ['60', t('settings.fps.60')]], (v) => game.setFps(v))),
    h('p', { class: 'muted', style: 'margin:-2px 0 4px;font-size:12px' }, s.fps === 'auto' ? t('settings.fps.autoHint') : s.fps === '30' ? t('settings.fps.30Hint') : t('settings.fps.60Hint')),
    h('div', { class: 'setting' }, t('settings.time'), seg<TimeOverride>(s.timeOverride, [['auto', t('settings.time.auto')], ['day', t('settings.time.day')], ['dusk', t('settings.time.dusk')], ['night', t('settings.time.night')]], (v) => game.setTimeOverride(v))),
    h('label', { class: 'setting' }, t('settings.edgeBlur'), edgeBlur),
    h('label', { class: 'setting' }, t('settings.weather'), h('input', { type: 'checkbox', checked: s.weatherEffects, onchange: (e: Event) => game.setWeatherEffects((e.target as HTMLInputElement).checked) })),
    h('label', { class: 'setting' }, t('settings.debug'), h('input', { type: 'checkbox', checked: s.showDebug, onchange: (e: Event) => { s.showDebug = (e.target as HTMLInputElement).checked; game.afterChange(); } })),
    h('div', { class: 'section-title' }, t('settings.section.notifications')),
    remindersAvailable()
      ? h('label', { class: 'setting' }, t('settings.reminders'), h('input', { type: 'checkbox', checked: s.reminders === true, onchange: (e: Event) => void game.setReminders((e.target as HTMLInputElement).checked) }))
      : null,
    h('p', { class: 'muted' }, remindersAvailable()
      ? t('settings.reminders.app')
      : t('settings.reminders.browser')),
    h('div', { class: 'section-title' }, t('settings.section.backup')),
    h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: async () => {
        const blob = await exportBackup(game.state);
        const a = h('a', { href: URL.createObjectURL(blob), download: `necrothing-${new Date().toISOString().slice(0, 10)}.necro3d` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } }, t('settings.backup.export')),
      h('button', { class: 'big-btn ghost', onclick: () => fileInput.click() }, t('settings.backup.import'))),
    fileInput,
    h('div', { class: 'section-title' }, t('settings.section.info')),
    h('p', { class: 'muted' }, t('settings.info')),
    h('p', { class: 'muted', 'data-build': 'true' }, buildLabel()),
    h('div', { class: 'row' },
      h('a', { class: 'big-btn ghost', href: './gallery.html', style: 'display:grid;place-items:center;text-decoration:none' }, t('settings.assetGallery')),
      h('button', { class: 'big-btn ghost', style: 'color:var(--danger)', onclick: async () => {
        if (!await confirmDialog({ title: t('settings.newGame'), message: t('settings.newGame.confirm'), ok: t('settings.newGame.ok'), danger: true })) return;
        game.replaceState(createNewGame(new Date()));
        closeDrawer();
        toast(t('settings.newGame.done'));
      } }, t('settings.newGame'))),
  );
  openDrawer(t('settings.title'), body);
}

/** "Versione abc1234 · 13/10/2026, 14:40": per controllare che il sito pubblicato sia aggiornato. */
function buildLabel(): string {
  if (typeof __BUILD__ === 'undefined') return t('settings.build.dev');
  const when = new Date(__BUILD__.built).toLocaleString(currentLang(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return t('settings.build.version', { commit: __BUILD__.commit, when });
}

// ── Foto & galleria ────────────────────────────────────────────────────

export function startPhoto(ui: UI) {
  openDrawer(t('photo.title'), h('div', {},
    h('p', { class: 'muted' }, t('photo.intro'))),
  { footer: h('button', { class: 'big-btn', onclick: () => { closeDrawer(); photoOverlay(ui); } }, t('photo.start')) });
}

function photoOverlay(ui: UI) {
  const layer = $('#photo-layer');
  const rectEl = $('#photo-rect');
  const W = window.innerWidth, H = window.innerHeight;
  const r = { x: W * 0.12, y: H * 0.22, w: W * 0.76, h: Math.min(H * 0.5, W * 0.76) };
  const apply = () => Object.assign(rectEl.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  apply();
  layer.hidden = false;
  $('#bubble').classList.add('hidden');
  let mode: string | null = null;
  let last = { x: 0, y: 0 };
  const down = (e: PointerEvent) => {
    const t = e.target as HTMLElement;
    mode = t.dataset.h ?? (t === rectEl ? 'move' : null);
    if (!mode) return;
    last = { x: e.clientX, y: e.clientY };
    layer.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!mode) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    if (mode === 'move') { r.x += dx; r.y += dy; }
    if (mode.includes('w')) { r.x += dx; r.w -= dx; }
    if (mode.includes('e')) r.w += dx;
    if (mode.includes('n')) { r.y += dy; r.h -= dy; }
    if (mode.includes('s')) r.h += dy;
    r.w = Math.max(80, Math.min(W, r.w)); r.h = Math.max(80, Math.min(H, r.h));
    r.x = Math.max(0, Math.min(W - r.w, r.x)); r.y = Math.max(0, Math.min(H - r.h, r.y));
    apply();
  };
  const up = () => { mode = null; };
  layer.addEventListener('pointerdown', down);
  layer.addEventListener('pointermove', move);
  layer.addEventListener('pointerup', up);
  const close = () => {
    layer.hidden = true;
    $('#bubble').classList.remove('hidden');
    layer.removeEventListener('pointerdown', down);
    layer.removeEventListener('pointermove', move);
    layer.removeEventListener('pointerup', up);
    $('#photo-shoot').onclick = null;
    $('#photo-cancel').onclick = null;
  };
  $('#photo-cancel').onclick = close;
  $('#photo-shoot').onclick = () => {
    const url = ui.game.capture(r);
    const flash = h('div', { class: 'flash' });
    $('#game').append(flash);
    setTimeout(() => flash.remove(), 450);
    close();
    photoResult(ui, url);
  };
}

async function sharePhoto(url: string) {
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], 'necrothing.jpg', { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Necrothing' }).catch(() => undefined);
  else { const a = h('a', { href: url, download: 'necrothing.jpg' }); a.click(); }
}

function photoResult(ui: UI, url: string) {
  const save = async () => {
    const rec: PhotoRecord = { id: newId('ph'), createdAt: new Date().toISOString(), dataUrl: url };
    await gallery.add(rec).catch(() => toast(t('photo.galleryUnavailable')));
    ui.game.act((s, n) => R.recordPhoto(s, n));
  };
  openDrawer(t('photo.result.title'), h('div', {}, h('img', { class: 'photo-view', src: url, alt: t('photo.result.alt') })), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', style: 'color:var(--danger)', onclick: () => { closeDrawer(); toast(t('photo.deleted')); } }, t('photo.delete')),
      h('button', { class: 'big-btn ghost', onclick: async () => { await save(); await sharePhoto(url); closeDrawer(); } }, t('photo.share')),
      h('button', { class: 'big-btn', onclick: async () => { await save(); closeDrawer(); } }, t('photo.save'))),
  });
}

export async function openGallery(ui: UI) {
  const photos = await gallery.list().catch(() => [] as PhotoRecord[]);
  const render = () => {
    setDrawerFooter(null);
    setDrawerBody(photos.length
      ? h('div', { class: 'photo-grid' }, ...photos.map((p) => h('button', { onclick: () => view(p) }, h('img', { src: p.dataUrl, alt: fmtDate(p.createdAt) }))))
      : h('p', { class: 'muted' }, t('gallery.empty')));
  };
  const view = (p: PhotoRecord) => {
    setDrawerBody(h('div', {}, h('img', { class: 'photo-view', src: p.dataUrl, alt: '' }), h('p', { class: 'muted' }, fmtDate(p.createdAt))));
    setDrawerFooter(h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => render() }, t('gallery.back')),
      h('button', { class: 'big-btn ghost', style: 'color:var(--danger)', onclick: async () => { await gallery.remove(p.id); photos.splice(photos.indexOf(p), 1); render(); } }, t('gallery.delete')),
      h('button', { class: 'big-btn', onclick: () => sharePhoto(p.dataUrl) }, t('gallery.share'))));
  };
  openDrawer(t('gallery.title'), h('div'));
  render();
  void ui;
}
