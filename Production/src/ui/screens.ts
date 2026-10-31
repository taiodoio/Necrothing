// Schermate nei drawer: sepoltura (wizard con anteprima), Bottega,
// Inventario, dettaglio, profilo/achievement, impostazioni, foto e galleria.

import { terrainSection } from './expansion.ts';
import { applyBackup, exportBackup, gallery, readBackup, saveNow, type PhotoRecord, type ReadBackup } from '../app/persistence.ts';
import { BUSINESS, DECAY, ECONOMY, EXPANSION, RANKS } from '../game/balance.ts';
import { CATALOG, CATALOG_LIST, CATEGORY_ORDER, PLACEABLE_CATEGORY_LABELS, repairCost, seasonLabel, type PlaceableCategory, type PlaceableDef } from '../game/catalog.ts';
import {
  CATEGORIES, CATEGORY_LABELS, CUSTOM_CAUSE_MAX, DEATH_CAUSE_LABELS, deathCauseLabel, DEATH_CAUSES, GRAVE_STATE_LABELS,
  GRAVE_TYPE_LABELS, GRAVE_TYPE_MIN_RANK, GRAVE_TYPES,
} from '../game/graves.ts';
import { ACHIEVEMENTS, achievementProgress, nextRank, rankForXp, rankProgress } from '../game/progression.ts';
import * as R from '../game/rules.ts';
import { createNewGame, type FpsSetting, type SaveData, type TimeOverride } from '../game/state.ts';
import { computePrestige, detectDistricts, DISTRICT_LABELS, expansionStatus } from '../game/world.ts';
import { newId } from '../game/rng.ts';
import { $, closeDrawer, confirmDialog, fmtDate, h, type Modal, openDrawer, openModal, progressDialog, setDrawerBody, setDrawerExtra, setDrawerFooter, setDrawerHero, toast, wispPill } from './dom.ts';
import { shopHeader } from './shopHeader.ts';
import { houseBoughtView, houseShopDetail, houseShopGrid } from './house.ts';
import { graveThumb, placeableThumb } from './thumbs.ts';
import { ACH_COUNT, ACH_ICONS, hydrateIcons, icon } from './icons.ts';
import { lpBadgeUrl, lpIconPng } from './lpIcons.ts';
import { personalGraveLimit } from '../game/entitlement.ts';
import { signalOnboarding } from './onboarding.ts';
import { checkName, NAME_MAX } from '../game/playerName.ts';
import { distribution } from '../config/distribution.ts';
import { CONTACT, PRIVACY_URL } from '../config/contact.ts';
import { monoIcon } from './monoIcons.ts';
import { factLabel, parchment } from './parchment.ts';
import { previewUrl, warmPreviews } from './previews.ts';
import { HOUSE_PARTS, HOUSE_ROOFS } from '../game/house.ts';
import { remindersAvailable } from '../app/reminders.ts';
import { clearLang, currentLang, deviceLang, hasManualLang, languagePreference, NATIVE_LANG_NAMES, setLang, t, tList, type Lang } from '../i18n/index.ts';

/**
 * Immagine di un oggetto. Nell'interfaccia «viva» (stile low-poly) è
 * l'anteprima illuminata già pronta (src/assets/previews, vedi
 * scripts/bake-previews.mjs): di notte, su una zolla d'erba, con le sue luci;
 * altrimenti la miniatura disegnata al momento.
 */
function itemImg(type: string, cls: 'lit' | 'lit-hero', variant = 0): HTMLElement {
  const url = previewUrl(type);
  return url
    ? h('img', { class: cls, src: url, alt: '', decoding: 'async' })
    : h('img', { src: placeableThumb(type, variant), alt: '' });
}

/** Interfaccia «viva»: un'icona monocromatica per ogni scheda delle categorie. */
const CAT_ICON: Record<PlaceableCategory | 'all', string> = { all: 'all', light: 'light', decoration: 'flower', structure: 'fence', ambient: 'tree', npc: 'ghost', extra: 'star' };
/** L'icona di una scheda (solo nell'interfaccia «viva»). */
export const tabGlyph = (name: string) => monoIcon(name, 19);
const tabIcon = (c: PlaceableCategory | 'all') => tabGlyph(CAT_ICON[c]);
import type { UI } from './UI.ts';
import { CustodePreview, openCustomize } from './customize.ts';
import { heroGlow, openDeceased } from './deceased.ts';
import { BurialPhoto, loadImage, openPostcard, photoStep, portrait } from './memorial.ts';
import { applyPhotoFilter, PHOTO_FILTER_LABELS, PHOTO_FILTERS, type PhotoFilter } from './photoFilters.ts';
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
  return {
    name: g.name,
    dates: g.birthDate ? `${fmtDate(g.birthDate)} — ${fmtDate(g.deathDate)}` : `† ${fmtDate(g.deathDate)}`,
    cause: deathCauseLabel(g.deathCause, g.deathCauseText),
    category: g.category ? CATEGORY_LABELS[g.category] : '—',
    epitaph: g.epitaph || null,
    photo: photo ? await loadImage(photo) : null,
    headstone: await loadImage(medal ?? graveThumb(g.graveType, 'flowers', seed)),
  };
}

export function openBurial(ui: UI, initial?: R.BurialDraft, startStep = 0) {
  const game = ui.game;
  // nel cortile si prova soltanto: la prima sepoltura si fa nel cimitero vero (dove resta)
  if (game.inYard) { toast(t('onboarding.yard.noBury')); return; }
  // con i limiti della Demo (mai nella beta) oltre le tombe concesse non se ne comincia un'altra
  if (!initial && !R.canStartBurial(game.state)) { toast(t('rules.bury.demoLimit', { n: personalGraveLimit() ?? 0 })); return; }
  const now = game.now();
  const d: R.BurialDraft = initial ? { ...initial } : R.emptyDraft(now);
  if (!initial) burialPhoto = new BurialPhoto();
  const photo = burialPhoto;
  let step = startStep;
  const total = 6;

  const render = () => {
    const errors = R.validateDraft(d, now);
    $('#drawer').dataset.burialStep = String(step);
    const body = h('div', { class: `burial-step burial-step-${step}` }, h('div', { class: 'steps' }, ...Array.from({ length: total }, (_, i) => h('i', { class: i <= step ? 'on' : '' }))));
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
          field(t('burial.birthDate.label'), h('input', { type: 'date', value: d.birthDate ?? '', max: d.deathDate ?? undefined, onchange: (e: Event) => { d.birthDate = (e.target as HTMLInputElement).value || null; } }), errors.birthDate),
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
      // interfaccia «viva»: le lapidi illuminate come gli oggetti della Bottega, col lucchetto sopra e il rango sotto
      const lit = true;
      body.append(h('div', { class: 'grid' }, ...GRAVE_TYPES.map((gt) => {
          // prima l'accesso commerciale, poi il rango (le regole: graveTypeAvailability)
          const av = R.graveTypeAvailability(game.state, gt);
          const locked = av !== 'ok';
          const why = av === 'full' ? t('shop.lock.full') : t('shop.need.rank.short', { n: GRAVE_TYPE_MIN_RANK[gt] });
          const url = lit ? previewUrl(`grave-${gt}`) : null;
          if (url) {
            return h('button', {
              class: `card ${d.graveType === gt ? 'selected' : ''} ${locked ? 'locked' : ''}`,
              disabled: locked,
              onclick: () => { d.graveType = gt; render(); },
            }, h('span', { class: 'thumb' }, h('img', { class: 'lit', src: url, alt: '', decoding: 'async' }), locked ? h('span', { class: 'lock-over' }, icon('lock', 30)) : null),
            h('b', {}, GRAVE_TYPE_LABELS[gt]),
            locked ? h('span', { class: 'lock-why' }, why) : null);
          }
          return h('button', {
            class: `card ${d.graveType === gt ? 'selected' : ''} ${locked ? 'dim' : ''}`,
            disabled: locked,
            onclick: () => { d.graveType = gt; render(); },
          }, h('img', { src: graveThumb(gt), alt: '' }), h('b', {}, GRAVE_TYPE_LABELS[gt]), locked ? h('span', { class: 'lock' }, icon('lock', 12), av === 'full' ? t('shop.lock.full') : t('burial.graveType.rankShort', { n: GRAVE_TYPE_MIN_RANK[gt] })) : null);
        })));
    } else {
      // interfaccia «viva»: come la scheda del defunto (la foto è una stampa con la candela, i dati su pergamena)
      const url = previewUrl(`grave-${d.graveType}`);
      let head: HTMLElement;
      if (photo.has) {
        head = portrait(photo.url(), lpIconPng('lumino', 128));
        head.classList.add('print');
        head.append(h('span', { class: 'dc-fern', 'aria-hidden': 'true' }));
      } else head = h('img', { class: 'dc-stone', src: url ?? graveThumb(d.graveType!, 'flowers', 1, 480), alt: '' });
      body.append(h('div', { class: 'deceased' },
        h('div', { class: 'hero' }, ...heroGlow(), head, h('h3', {}, d.name || '—'),
          d.epitaph ? h('div', { class: 'epitaph' }, t('burial.epitaph.quoted', { text: d.epitaph })) : null),
        parchment('dc-facts', h('dl', { class: 'kv' },
          h('dt', {}, ...factLabel('category', t('burial.summary.category'))), h('dd', {}, d.category ? CATEGORY_LABELS[d.category] : '—'),
          h('dt', {}, ...factLabel('lived', t('burial.summary.lived'))), h('dd', {}, d.birthDate ? `${fmtDate(d.birthDate)} → ${fmtDate(d.deathDate)}` : t('deceased.died', { date: fmtDate(d.deathDate) })),
          h('dt', {}, ...factLabel('cause', t('burial.summary.cause'))), h('dd', {}, deathCauseLabel(d.deathCause, d.deathCauseText)),
          h('dt', {}, ...factLabel('stone', t('burial.summary.graveType'))), h('dd', {}, d.graveType ? GRAVE_TYPE_LABELS[d.graveType] : '—'))),
        h('p', { class: 'muted burial-next' }, t('burial.summary.next'))));
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
        h('div', { class: 'row' }, back, h('button', { class: 'big-btn ghost', onclick: () => void openPostcard(postcardData({ ...d, graveType: d.graveType! }, photo.url(), ui)) }, t('burial.postcard'))),
        h('button', { class: 'big-btn', disabled: !stepValid(), onclick: async () => { d.photoId = await photo.store(); closeDrawer(); game.startGravePlacement(d); } }, t('burial.choosePlace'))));
    }
  };
  openDrawer(t('burial.title'), h('div'), { full: true, kind: 'burial' });
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
    kind: 'edit-intro',
  });
}

// ── Bottega ────────────────────────────────────────────────────────────

const LOCK_LABEL: Record<R.ShopAvailability, string> = { ok: '', full: t('shop.lock.full'), rank: t('shop.lock.rank'), season: t('shop.lock.season'), feat: t('shop.lock.feat'), owned: t('shop.lock.owned'), graves: t('shop.lock.graves'), funds: '' };

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
  // cosa manca lo dicono le regole; qui solo come scriverlo
  return R.unlockRequirements(s, d.id, now).map((r): UnlockNeed => {
    switch (r.kind) {
      case 'full': return { icon: 'lock', short: t('shop.need.full.short'), long: t('shop.need.full.long') };
      case 'season': {
        const when = seasonLabel(d);
        // una data o un periodo («1–15 nov») si scrive così; il nome di una festa vuole «a»
        return /\d|–/.test(when)
          ? { icon: 'calendar', short: t('shop.need.season.short.date', { when }), long: t('shop.need.season.long.date', { when }) }
          : { icon: 'calendar', short: t('shop.need.season.short.named', { when }), long: t('shop.need.season.long.named', { when }) };
      }
      case 'rank': {
        const rank = rankForXp(s.player.xp);
        const need = RANKS.find((x) => x.level === d.minRank)!;
        const missing = need.minXp - s.player.xp;
        return { icon: 'rank', short: t('shop.need.rank.short', { n: d.minRank }), long: t('shop.need.rank.long', { rank: d.minRank, name: need.name, level: rank.level, n: missing, xp: missing.toLocaleString(currentLang()) }), progress: [s.player.xp, need.minXp] };
      }
      case 'feat': return { icon: 'trophy', short: t('shop.need.feat.short', { label: d.feat!.label, n: r.have!, goal: r.need! }), long: t('shop.need.feat.long', { label: d.feat!.label.toLowerCase(), n: r.have!, goal: r.need! }), progress: [r.have!, r.need!] };
      case 'graves': return { icon: 'coffin', short: t('shop.need.graves.short', { goal: r.need!, n: r.have! }), long: t('shop.need.graves.long', { n: r.need!, have: r.have! }), progress: [r.have!, r.need!] };
      case 'funds': return { icon: 'wisp', short: t('shop.need.wisps.short', { n: d.cost - s.player.wisps }), long: t('shop.need.wisps.long', { cost: d.cost, n: d.cost - s.player.wisps }), progress: [s.player.wisps, d.cost] };
    }
  });
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
    case 'full': return t('shop.buy.full');
    case 'funds': return t('shop.buy.noFunds');
    case 'rank': return t('shop.buy.needRank', { n: d.minRank });
    case 'graves': return t('shop.buy.needGraves', { n: d.minGraves ?? 0, have: R.graveTotal(s) });
    case 'owned': return t('shop.buy.owned');
    case 'feat': { const [n, goal] = R.featProgress(s, d.feat!); return t('shop.buy.feat', { label: d.feat!.label, n, goal }); }
    case 'season': return t('shop.buy.season', { season: seasonLabel(d) });
  }
}

/** Alla prima apertura di Bottega o Inventario si scaricano in sottofondo tutte le anteprime: cambiando scheda sono già pronte. */
let previewsWarmed = false;
export function warmAllPreviews() {
  if (previewsWarmed) return;
  previewsWarmed = true;
  window.setTimeout(() => warmPreviews([...CATALOG_LIST.map((d) => d.id), ...[...HOUSE_ROOFS, ...HOUSE_PARTS].map((x) => `house-${x.id}`)]), 600);
}

export function openShop(ui: UI, cat: PlaceableCategory | 'house' = 'light', selected: string | null = null) {
  warmAllPreviews();
  const game = ui.game;
  const s = game.state;
  const now = game.now();
  let qty = 1;
  // interfaccia nuova: l'oggetto scelto si guarda e si compra in un modale al centro
  let modal: Modal | null = null;
  const show = (node: Node) => {
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
      h('button', { class: `tab ${cat === 'house' ? 'active' : ''}`, onclick: () => { cat = 'house'; selected = null; render(); } }, tabGlyph('home'), t('shop.tab.house')));
    setDrawerExtra(wispPill(s.player.wisps));
    const pick = (id: string) => { selected = id; qty = 1; render(); };
    if (cat === 'house') {
      setDrawerBody(h('div', {}, tabs,
        houseShopGrid(s, selected, pick)));
    } else {
      const items = CATALOG_LIST.filter((d) => d.category === cat && !d.permanent);
      const grid = h('div', { class: 'grid' }, ...items.map((d) => {
        const av = R.shopAvailability(s, d.id, now);
        const locked = av === 'full' || av === 'rank' || av === 'season' || av === 'feat' || av === 'graves';
        const owned = av === 'owned';
        return h('button', {
            class: `card ${selected === d.id ? 'selected' : ''} ${locked ? 'locked' : ''} ${av === 'funds' ? 'dim' : ''} ${owned ? 'owned' : ''}`,
            'data-item': d.id,
            onclick: () => pick(d.id),
          },
          h('span', { class: 'thumb' }, itemImg(d.id, 'lit'),
            locked ? h('span', { class: 'lock-over' }, icon('lock', 30)) : null,
            owned ? h('span', { class: 'owned-tick' }, icon('check', 15)) : null),
          h('b', {}, d.label),
          // in prova: sotto la carta bloccata (o troppo cara) c'è proprio cosa serve
          !owned && av !== 'ok' ? needChip(unlockNeeds(s, d, now)[0] ?? { icon: 'lock', short: lockText(s, d, av), long: '' })
            : locked ? h('span', { class: 'lock-why' }, av === 'rank' ? t('shop.need.rank.short', { n: d.minRank }) : lockText(s, d, av))
              : owned ? h('span', { class: 'price owned' }, t('shop.card.owned'))
                : h('span', { class: 'price' }, String(d.cost), icon('wisp', 12)),
        (s.inventory[d.id] ?? 0) > 0 ? h('span', { class: 'badge' }, String(s.inventory[d.id])) : null);
      }));
      // interfaccia «viva»: niente spiegazione, i lucchetti e le pastiglie sotto le carte dicono già tutto
      setDrawerBody(h('div', {}, tabs, grid));
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
    return h('div', { class: 'shop-detail' },
      wispPill(s.player.wisps),
      h('div', { class: 'shop-detail-top' }, itemImg(d.id, 'lit-hero'), h('h3', {}, d.label)),
      // interfaccia «viva»: descrizione e dati su pergamena, con le icone
      parchment('dc-facts', h('p', { class: 'p-desc' }, d.description), h('dl', { class: 'kv' },
        h('dt', {}, ...factLabel('category', t('detail.item.category'))), h('dd', {}, PLACEABLE_CATEGORY_LABELS[d.category]),
        h('dt', {}, ...factLabel('available', t('shop.detail.available'))), h('dd', {}, d.unique ? t('shop.detail.unique') : t('shop.detail.availableValue', { max: R.maxBuyable(s, d.id) })),
        (s.inventory[d.id] ?? 0) > 0 ? h('dt', {}, ...factLabel('owned', t('shop.detail.owned'))) : null, (s.inventory[d.id] ?? 0) > 0 ? h('dd', {}, String(s.inventory[d.id])) : null)),
      needRows(av === 'owned' ? [] : unlockNeeds(s, d, now)),
      (d.season || d.feat) ? h('p', { class: 'muted', style: 'margin:0;font-size:12px' }, d.season && d.feat ? t('shop.detail.seasonalFeat', { season: d.season.label, feat: d.feat.label.toLowerCase() })
        : d.season ? t('shop.detail.seasonal', { season: d.season.label }) : t('shop.detail.feat', { feat: d.feat!.label.toLowerCase() })) : null,
      !d.unique && av === 'ok' ? h('div', { class: 'qty' },
        h('button', { onclick: () => { qty = Math.max(1, qty - 1); again(); } }, '−'),
        h('b', {}, String(qty)),
        h('button', { onclick: () => { qty = Math.min(max, qty + 1); again(); } }, '+')) : null,
      av === 'ok' && d.cost ? h('p', { class: 'muted after-buy' }, t('shop.detail.afterBuy', { n: s.player.wisps - d.cost * qty, amount: (s.player.wisps - d.cost * qty).toLocaleString(currentLang()) })) : null,
      ((b: HTMLElement) => h('div', { class: 'row' }, h('button', { class: 'big-btn ghost', onclick: close }, t('shop.detail.close')), b))(h('button', {
        class: 'big-btn', disabled: av !== 'ok',
        onclick: () => {
          if (!game.act((st, n) => R.buy(st, d.id, qty, n))) return;
          signalOnboarding('itemBought');
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
          drawShop();
          show(h('div', { class: 'shop-detail' }, wispPill(s.player.wisps),
            h('div', { class: 'shop-detail-top' }, itemImg(d.id, 'lit-hero'), h('h3', {}, d.label), h('p', { class: 'muted' }, text)),
            h('div', { class: 'row' }, h('button', { class: 'big-btn ghost', onclick: close }, t('shop.bought.continue')), go)));
        },
      }, av === 'ok' && d.cost ? h('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, t('shop.buy.ctaShort', { n: d.cost * qty }), icon('wisp', 18)) : buyText(s, d, av, qty))),
    );
  };
  // la scheda «Casa»: tetti e aggiunte, comprati dallo stesso modale
  const houseDetail = (id: string) => houseShopDetail(ui, id, close, () => {
    drawShop();
    show(houseBoughtView(ui, id, close, () => modal?.close(true)));
  });
  openDrawer(t('shop.title'), h('div'), { onClose: () => modal?.close(true) });
  // interfaccia nuova: in testa l'interno della bottega, con lo zombie al lavoro
  setDrawerHero(shopHeader().el);
  render();
}

// ── Inventario ─────────────────────────────────────────────────────────

export function openInventory(ui: UI, cat: PlaceableCategory | 'all' = 'all') {
  warmAllPreviews();
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
      return h('button', { class: `card ${owned === 0 ? 'dim' : ''} ${selected === d.id ? 'selected' : ''}`, 'data-item': d.id, onclick: () => { if (owned) { selected = d.id; render(); } else toast(t('inventory.allPlaced', { item: d.label })); } },
        itemImg(d.id, 'lit'),
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
        h('button', { class: 'big-btn ghost sell-btn', onclick: () => { game.act((st) => R.sell(st, d.id, 1)); game.refreshBike(); if (!(s.inventory[d.id] ?? 0)) selected = null; render(); } },
          // «Vendi» e, sotto in piccolo, quanto si guadagna con l'icona
          h('span', {}, t('inventory.sellLabel')), h('small', { class: 'sell-gain' }, t('inventory.sellGain', { n: R.sellPrice(d.id) }), icon('wisp', 13))),
        d.category === 'extra'
          ? h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.useExtra(d.id); } }, game.extraLabel(d.id))
          : h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.startItemPlacement(d.id); } }, t('inventory.place'))),
    ));
  };
  openDrawer(t('inventory.title'), h('div'), { full: true });
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
  const g = s.graves.find((x) => x.id === id);
  if (g) { openDeceased(ui, id, { from: 'map' }); return; }
  const p = s.placeables.find((x) => x.id === id);
  if (!p) return;
  const d = CATALOG[p.type];
  const facts = h('dl', { class: 'kv' },
    h('dt', {}, ...factLabel('category', t('detail.item.category'))), h('dd', {}, PLACEABLE_CATEGORY_LABELS[d.category]),
    d.decays ? h('dt', {}, ...factLabel('condition', t('detail.item.condition'))) : null, d.decays ? h('dd', { class: p.broken ? 'warn' : '' }, p.broken ? t('detail.item.broken', { n: R.placeableRepairPrice(s, p.type) }) : p.dirty ? t('detail.item.dirty') : t('detail.item.ok')) : null,
    d.light ? h('dt', {}, ...factLabel('light', t('detail.item.light'))) : null, d.light ? h('dd', {}, p.broken ? t('detail.item.lightBroken') : p.lit ? t('detail.item.lightOn') : t('detail.item.lightOff')) : null,
    BUSINESS[p.type] ? h('dt', {}, ...factLabel('business', t('detail.item.business'))) : null, BUSINESS[p.type] ? h('dd', {}, businessLine(s, p.id, p.type, game.now())) : null,
  );
  // interfaccia «viva»: l'anteprima illuminata senza riquadro, descrizione e dati su pergamena
  const body = h('div', { class: 'item-detail' },
      h('div', { class: 'hero' }, itemImg(p.type, 'lit-hero', p.variant), h('h3', {}, d.label)),
      parchment('dc-facts', h('p', { class: 'p-desc' }, d.description), facts));
  if (d.editableText) {
    const input = h('input', { value: p.text ?? '', maxLength: 60, placeholder: t('detail.sign.placeholder') });
    body.append(h('div', { class: 'field' }, h('label', {}, t('detail.sign.label')), input),
      h('button', { class: 'big-btn', onclick: () => { game.act((st) => R.setText(st, id, input.value)); } }, t('detail.sign.save')));
  }
  // il nome c'è già sotto l'immagine: niente titolo in testa
  openDrawer('', body, { footer: itemFooter(ui, id) ?? undefined });
}

/**
 * In fondo alla scheda di un oggetto l'azione che serve adesso (ripara,
 * pulisci, accendi, entra in bottega…), come nel menù sulla mappa; le altre
 * in «Altro», sopra. Niente, se l'oggetto non ha azioni.
 */
function itemFooter(ui: UI, id: string): HTMLElement | null {
  const game = ui.game;
  const { actions, pet } = ui.placeableActions(id);
  type Act = { icon: string; label: string; run: () => void };
  const own: Array<Act & { rank: number }> = actions.filter((a) => a.act !== 'detail').map((a) => ({
    icon: a.icon,
    label: a.act === 'repair' ? t('detail.grave.repair', { price: a.cost ?? 0 }) : a.label,
    run: () => { closeDrawer(true); game.performEntityAction(id, a.act); },
    // prima l'incasso pronto, poi ciò che va sistemato, poi la funzione dell'oggetto, poi la luce
    rank: a.act === 'collect' ? -1 : a.act === 'repair' ? 0 : a.act === 'clean' ? 1 : a.cls === 'primary' ? 2 : 3,
  }));
  if (game.editMode && !game.placement) {
    const item = game.state.placeables.find((p) => p.id === id);
    const def = item && CATALOG[item.type];
    if (def?.rotatable) own.push({ icon: 'variant', label: t('ctx.rotate'), rank: 6, run: () => { closeDrawer(true); game.performEntityAction(id, 'rotate'); } });
    if (def && !def.permanent) own.push({ icon: 'bag', label: t('ctx.store'), rank: 7, run: () => { closeDrawer(true); game.performEntityAction(id, 'store'); } });
  }
  const pets: Array<Act & { rank: number }> = pet.filter((a) => !a.disabled).map((a) => ({
    icon: a.icon, label: a.label, rank: a.cls === 'primary' ? 4 : 5,
    run: () => { closeDrawer(true); game.select(null); a.run(); },
  }));
  const all = [...own, ...pets].sort((a, b) => a.rank - b.rank);
  if (!all.length) return null;
  const [main, ...rest] = all;
  return h('div', { style: 'display:grid;gap:6px' },
    rest.length ? moreActions(rest) : null,
    h('button', { class: 'big-btn', onclick: main.run }, icon(main.icon, 22), main.label));
}

/** Conferma della riesumazione (o del «Libera ricordo»), poi arriva il becchino con la carriola. */
export async function confirmExhume(ui: UI, id: string, name: string, kind: 'grave' | 'memory') {
  const grave = kind === 'grave';
  // sepolta da poco: riesumandola si perde la ricompensa della sepoltura (lo si dice prima)
  const g = grave ? ui.game.state.graves.find((x) => x.id === id) : undefined;
  const revokes = !!g && R.exhumeRevokes(g, ui.game.now());
  const ok = await confirmDialog({
    title: t(grave ? 'exhume.confirm.title' : 'exhume.free.title', { name }),
    message: grave ? `${t('exhume.confirm.grave')}${revokes ? ` ${t('exhume.confirm.revokes', { xp: R.burialReward(g!).xp, wisps: R.burialReward(g!).wisps, h: ECONOMY.exhumeRefundHours })}` : ''}` : t('exhume.confirm.memory'),
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

/** La scheda aperta nella pagina del Custode (resta quella scelta finché si gioca). */
let playerTab: 'keeper' | 'achievements' = 'keeper';

export function openPlayer(ui: UI) {
  const s = ui.game.state;
  const got = new Set(s.achievements.map((a) => a.id));
  const body = h('div', { class: 'player-page' });
  // il Custode che gira in cima (come nella personalizzazione): una scena sola, chiusa cambiando scheda o pannello
  let preview: CustodePreview | null = null;
  const drop = () => { preview?.dispose(); preview = null; };
  const tab = (id: typeof playerTab, ic: string, label: string, n?: string) =>
    h('button', { class: `tab ${playerTab === id ? 'active' : ''}`, onclick: () => { playerTab = id; render(); } }, tabGlyph(ic === 'keeper' ? 'keeper' : 'trophy'), label, n ? h('span', { class: 'tab-n' }, n) : null);
  const render = () => {
    drop();
    const tabs = h('div', { class: 'tabs' }, tab('keeper', 'keeper', t('player.tab.keeper')), tab('achievements', 'trophy', t('player.tab.achievements'), `${got.size}/${ACHIEVEMENTS.length}`));
    if (playerTab === 'keeper') {
      preview = new CustodePreview(s.player.look);
      body.replaceChildren(tabs, h('div', { class: 'look-stage pl-stage' }, preview.canvas), keeperTab(ui, () => { drop(); openCustomize(ui); }));
    } else {
      body.replaceChildren(tabs, achievementsTab(s, got));
    }
  };
  openDrawer(t('player.title'), body, { full: true, onClose: drop });
  render();
}

/** Una riga di dati: l'icona dell'elemento (la stessa in tutto il gioco), l'etichetta e il valore; sotto, se serve, una barra. */
const statRow = (ic: string, label: string, value: string, extra?: HTMLElement | null, long = false) =>
  h('div', { class: `pl-stat${long ? ' long' : ''}` }, icon(ic, 26), h('div', { class: 'pl-stat-text' }, h('span', {}, label), h('b', {}, value), extra ?? null));

/** Un dato in breve, in una riga di quattro: icona, valore grande e, sotto, cosa è; il titolo lo dice per intero. */
const statChip = (ic: string, value: string, label: string, title: string, extra?: HTMLElement | null) =>
  h('div', { class: 'pl-chip', title, 'aria-label': title }, icon(ic, 30), h('b', {}, value), h('small', {}, label), extra ?? null);

/**
 * Il Custode: il nome (la matita accanto al campo apre la tastiera e diventa
 * una spunta che conferma e la chiude), «Modifica aspetto», i dati in quattro
 * tasselli; sotto, il cimitero. Tutto sta in uno schermo, senza scorrere.
 */
function keeperTab(ui: UI, openLook: () => void): HTMLElement {
  const game = ui.game;
  const s = game.state;
  const p = s.player;
  const rank = rankForXp(p.xp);
  const next = nextRank(p.xp);
  const exp = expansionStatus(s);
  const districts = detectDistricts(s.graves);
  const lang = currentLang();
  const pen = h('button', { class: 'icon-btn pl-pen', type: 'button' }) as HTMLButtonElement;
  /** Matita a riposo, spunta mentre si scrive. */
  const penState = (editing: boolean) => {
    pen.replaceChildren(icon(editing ? 'check' : 'edit', 22));
    pen.setAttribute('aria-label', editing ? t('player.saveName') : t('player.editName'));
    pen.classList.toggle('active', editing);
  };
  const name = h('input', {
    class: 'pl-name', value: p.name, maxLength: NAME_MAX * 2, 'aria-label': t('player.name'), enterkeyhint: 'done',
    onfocus: () => {
      penState(true);
      // Con la tastiera aperta il Custode resta visibile e il campo viene
      // portato nell'area utile del pannello, senza far scorrere tutta la pagina.
      requestAnimationFrame(() => {
        const body = name.closest<HTMLElement>('.drawer-body');
        if (!body) return;
        const field = name.getBoundingClientRect(), viewport = body.getBoundingClientRect();
        if (field.bottom > viewport.bottom - 12) body.scrollTop += field.bottom - viewport.bottom + 12;
        else if (field.top < viewport.top + 12) body.scrollTop -= viewport.top + 12 - field.top;
      });
    },
    // uscendo dal campo (spunta, Invio o tocco altrove) il nome si salva e la tastiera si chiude
    onblur: (e: Event) => {
      const el = e.target as HTMLInputElement;
      // stesse regole del primo ingresso (game/playerName.ts); vuoto torna «Custode», un nome non valido resta quello di prima
      const r = el.value.trim() ? checkName(el.value) : { ok: true as const, name: t('player.defaultName') };
      if (!r.ok) toast(t(`onboarding.name.error.${r.error}`, { n: NAME_MAX }));
      const v = r.ok ? r.name : p.name;
      el.value = v;
      if (v !== p.name) { p.name = v; game.afterChange(); }
      penState(false);
    },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); },
  }) as HTMLInputElement;
  // il tocco sulla spunta non deve togliere il fuoco al campo prima del clic: lo decide il clic
  pen.addEventListener('pointerdown', (e) => e.preventDefault());
  pen.addEventListener('click', () => {
    if (document.activeElement === name) name.blur();
    else { name.focus(); name.setSelectionRange(name.value.length, name.value.length); }
  });
  penState(false);
  const fence = exp.unlocked > exp.level
    ? t('player.fence.unlocked', { label: exp.label, size: exp.size, max: EXPANSION[exp.unlocked].size })
    : exp.next ? t('player.fence.next', { label: exp.label, size: exp.size, prestige: exp.next.minPrestige, n: exp.toNext })
      : t('player.fence.value', { label: exp.label, size: exp.size });
  const xp = next ? `${p.xp.toLocaleString(lang)} / ${next.minXp.toLocaleString(lang)}` : p.xp.toLocaleString(lang);
  return h('div', {},
    h('div', { class: 'pl-name-row' }, name, pen),
    h('button', { class: 'big-btn pl-look', onclick: openLook }, icon('shirt', 22), t('player.customize')),
    h('div', { class: 'pl-chips' },
      statChip('rank', String(rank.level), rank.name, `${t('player.rank')}: ${t('player.rank.value', { level: rank.level, name: rank.name })}`),
      statChip('xp', p.xp.toLocaleString(lang), t('player.xp'), `${t('player.xp')}: ${xp}`,
        h('div', { class: 'xp-bar pl-bar' }, h('i', { style: `width:${Math.round(rankProgress(p.xp) * 100)}%` }))),
      statChip('wisp', p.wisps.toLocaleString(lang), t('player.wisps'), `${t('player.wisps')}: ${p.wisps.toLocaleString(lang)}`),
      statChip('prestige', String(computePrestige(s)), t('player.prestige'), `${t('player.prestige')}: ${computePrestige(s)}`)),
    h('div', { class: 'section-title' }, t('player.section.cemetery')),
    h('div', { class: 'pl-stats' },
      statRow('fence', t('player.fence'), fence, null, true),
      statRow('district', t('player.districts'), districts.length ? districts.map((d) => DISTRICT_LABELS[d.theme]).join(', ') : t('player.districts.none'), null, true)));
}

/** I traguardi: in testa quanti se ne hanno, poi una carta per ciascuno col suo medaglione (prima quelli ottenuti). */
function achievementsTab(s: SaveData, got: Set<string>): HTMLElement {
  const tiers = { gold: t('player.tier.gold'), silver: t('player.tier.silver'), bronze: t('player.tier.bronze') };
  const order = { gold: 0, silver: 1, bronze: 2 };
  const list = [...ACHIEVEMENTS].sort((a, b) => Number(got.has(b.id)) - Number(got.has(a.id)) || order[a.tier] - order[b.tier]);
  return h('div', {},
    h('div', { class: 'ach-sum' }, h('b', {}, t('player.achievements', { got: got.size, total: ACHIEVEMENTS.length })),
      h('div', { class: 'xp-bar' }, h('i', { style: `width:${Math.round((got.size / ACHIEVEMENTS.length) * 100)}%` }))),
    h('div', { class: 'ach-list' }, ...list.map((a) => {
      const done = got.has(a.id);
      const prog = achievementProgress(a, s);
      const n = ACH_COUNT[a.id];
      return h('div', { class: `ach-card ${done ? 'got' : ''}` },
        h('div', { class: 'ach-badge' }, h('img', { src: lpBadgeUrl(ACH_ICONS[a.id] ?? 'trophy', done ? a.tier : 'locked'), alt: '' }), n ? h('span', { class: 'ach-n' }, String(n)) : null),
        h('div', {}, h('b', {}, a.name), h('p', {}, a.description),
          h('span', { class: `ach-tier tier-${a.tier}` }, tiers[a.tier]), // i18n-ok: classe
          !done && prog > 0 ? h('div', { class: 'xp-bar ach-bar' }, h('i', { style: `width:${Math.round(prog * 100)}%` })) : null));
    })));
}

// ── Impostazioni ───────────────────────────────────────────────────────

/** La scheda aperta nelle Impostazioni. */
let settingsTab: 'game' | 'graphics' | 'save' | 'info' = 'game';

// ── Backup: a ogni passo una finestra dice cosa sta succedendo e com'è andata ──

/** Lascia disegnare la finestra prima del lavoro pesante (lo ZIP blocca la pagina finché non ha finito). */
const nextPaint = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const errorText = (err: unknown) => (err instanceof Error && err.message) || t('settings.backup.error');
/** Peso del file, es. «28 kB» o «2,3 MB». */
function fileSize(bytes: number): string {
  const mb = bytes >= 1e6;
  return new Intl.NumberFormat(currentLang(), { style: 'unit', unit: mb ? 'megabyte' : 'kilobyte', maximumFractionDigits: mb ? 1 : 0 }).format(Math.max(1, bytes / (mb ? 1e6 : 1e3))).replace(' ', '\u00a0'); // numero e unità sulla stessa riga
}

/** Esporta: prepara il file (stato e foto), lo scarica e dice nome, peso e dove trovarlo. */
async function exportSave(ui: UI) {
  const p = progressDialog(t('settings.backup.exporting'), t('settings.backup.exportingText'));
  await nextPaint();
  try {
    const blob = await exportBackup(ui.game.state);
    const file = `necrothing-${new Date().toISOString().slice(0, 10)}.necro3d`;
    const a = h('a', { href: URL.createObjectURL(blob), download: file });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    await p.done(t('settings.backup.exported'), t('settings.backup.exportedText', { file, size: fileSize(blob.size) }), true);
  } catch (err) {
    await p.done(t('settings.backup.exportFailed'), errorText(err), false);
  }
}

/** Importa: legge e controlla il file, chiede conferma (la partita attuale viene sostituita), poi carica. */
async function importSave(ui: UI, f: File) {
  const p = progressDialog(t('settings.backup.reading'), t('settings.backup.readingText', { file: f.name }));
  await nextPaint();
  let read: ReadBackup;
  try {
    read = readBackup(await f.arrayBuffer());
  } catch (err) {
    await p.done(t('settings.backup.importFailed'), `${errorText(err)} ${t('settings.backup.importHint')}`, false);
    return;
  }
  p.close();
  const name = read.state.player.name;
  const at = read.content.exportedAt;
  const languageChanged = !!read.content.language && read.content.language !== languagePreference();
  if (!await confirmDialog({
    title: t('settings.backup.confirm.title'),
    message: at ? t('settings.backup.confirm.textDate', { name, date: fmtDate(at) }) : t('settings.backup.confirm.text', { name }),
    ok: t('settings.backup.confirm.ok'), danger: true,
  })) return;
  const q = progressDialog(t('settings.backup.importing'), t('settings.backup.importingText'));
  await nextPaint();
  try {
    ui.game.replaceState(await applyBackup(read));
  } catch (err) {
    await q.done(t('settings.backup.importFailed'), errorText(err), false);
    return;
  }
  closeDrawer(true);
  await q.done(t('settings.backup.restored'), t('settings.backup.restoredText', { name }), true);
  if (languageChanged) setTimeout(() => location.reload(), 250);
}

function languageControl(ui: UI): HTMLElement {
  const selected = () => hasManualLang() ? currentLang() : 'auto';
  const label = () => selected() === 'auto'
    ? `${t('settings.language.auto')} (${NATIVE_LANG_NAMES[deviceLang()]})`
    : NATIVE_LANG_NAMES[currentLang()];
  const root = h('div', { class: 'language-control' });
  const trigger = h('button', { class: 'language-trigger', type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': t('settings.language.listLabel'), onclick: () => toggle() }, h('span', { class: 'language-value' }, label()), h('span', { class: 'language-chevron', 'aria-hidden': 'true' }));
  const list = h('div', { class: 'language-options', role: 'listbox', 'aria-label': t('settings.language.listLabel'), hidden: true });
  const options: Array<{ code: Lang | 'auto'; name: string; lang: string }> = [
    { code: 'auto', name: `${t('settings.language.auto')} (${NATIVE_LANG_NAMES[deviceLang()]})`, lang: deviceLang() },
    ...Object.entries(NATIVE_LANG_NAMES).map(([code, name]) => ({ code: code as Lang, name, lang: code })),
  ];
  let active = Math.max(0, options.findIndex((o) => o.code === selected()));
  let typeAhead = '';
  let typeTimer = 0;
  const choose = async (index: number) => {
    const option = options[index];
    if (!option || option.code === selected()) { close(); return; }
    const blockers = ui.game.languageChangeBlockers();
    if (blockers.length && !await confirmDialog({
      title: t('settings.language.confirm.title'),
      message: t('settings.language.confirm.text', { work: blockers.join(', ') }),
      ok: t('settings.language.confirm.ok'),
    })) { list.querySelector<HTMLElement>(`[data-index="${active}"]`)?.focus(); return; }
    closeDrawer(true);
    saveNow(ui.game.state);
    if (option.code === 'auto') clearLang(); else setLang(option.code);
    try { sessionStorage.setItem('necro.afterLang', JSON.stringify({ tab: 'game' })); } catch { /* reload comunque */ }
    trigger.querySelector('.language-value')!.textContent = option.name;
    setTimeout(() => location.reload(), 250);
  };
  const focusOption = (index: number) => {
    active = (index + options.length) % options.length;
    list.querySelector<HTMLElement>(`[data-index="${active}"]`)?.focus();
  };
  for (const [index, option] of options.entries()) {
    const isSelected = option.code === selected();
    const row = h('div', {
      class: `language-option${isSelected ? ' selected' : ''}`, role: 'option', tabindex: '-1',
      'aria-selected': String(isSelected), lang: option.lang, 'data-index': String(index),
      onclick: () => void choose(index), onpointermove: () => { active = index; },
    }, h('span', {}, option.name), h('span', { class: 'language-check', 'aria-hidden': 'true' }, isSelected ? '✓' : ''));
    list.append(row);
  }
  const close = () => {
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', keys, true);
  };
  const outside = (e: Event) => { if (!root.contains(e.target as Node)) close(); };
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); close(); trigger.focus(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); focusOption(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); focusOption(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); focusOption(0); } // i18n-ok: tasto
    else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); focusOption(options.length - 1); } // i18n-ok: tasto
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); void choose(active); }
    else if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      typeAhead += e.key.toLocaleLowerCase();
      window.clearTimeout(typeTimer);
      typeTimer = window.setTimeout(() => { typeAhead = ''; }, 700);
      const start = active + 1;
      const match = [...options.slice(start), ...options.slice(0, start)].findIndex((o) => o.name.toLocaleLowerCase().startsWith(typeAhead));
      if (match >= 0) { e.preventDefault(); e.stopPropagation(); focusOption((start + match) % options.length); }
    }
  };
  function toggle() {
    if (!list.hidden) { close(); return; }
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    active = Math.max(0, options.findIndex((o) => o.code === selected()));
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    list.classList.toggle('opens-up', below < Math.min(300, rect.top));
    list.style.maxHeight = `${Math.max(120, Math.min(300, list.classList.contains('opens-up') ? rect.top - 16 : below - 16))}px`;
    list.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', keys, true);
    focusOption(active);
  }
  root.append(trigger, list);
  return h('div', { class: 'language-setting' }, h('div', { class: 'section-title' }, t('settings.language')), root);
}

function showControls() {
  const keyboard = matchMedia('(hover: hover) and (pointer: fine)').matches;
  openModal(h('div', { class: 'info-modal' },
    h('h2', {}, t('info.controls.title')),
    h('p', { class: 'muted' }, t('info.controls.touch')),
    keyboard ? h('p', { class: 'muted' }, t('info.controls.keys')) : null,
    h('button', { class: 'big-btn ghost', onclick: () => { document.querySelector<HTMLButtonElement>('.modal-close')?.click(); } }, t('dialog.close')),
  ), { label: t('info.controls.title') });
}

function showLegal() {
  const list = h('div', { class: 'license-list', 'aria-live': 'polite' }, t('info.legal.loading'));
  const content = h('div', { class: 'info-modal' },
    h('h2', {}, t('info.legal.title')),
    h('p', { class: 'muted' }, t('info.legal.about')),
    h('p', { class: 'muted' }, t('info.legal.privacy')),
    PRIVACY_URL ? h('a', { class: 'big-btn ghost', href: PRIVACY_URL, target: '_blank', rel: 'noreferrer' }, t('info.legal.privacyLink')) : null,
    h('h3', {}, t('info.legal.licenses')),
    list,
  );
  openModal(content, { label: t('info.legal.title') });
  void fetch(`${import.meta.env.BASE_URL}third-party-licenses.json`).then((r) => {
    if (!r.ok) throw new Error('license file missing');
    return r.json() as Promise<Array<{ name: string; version: string; license: string; text?: string }>>;
  }).then((items) => {
    list.replaceChildren(...items.map((item) => h('details', { class: 'license-item' },
      h('summary', {}, `${item.name} ${item.version} · ${item.license}`),
      item.text ? h('pre', {}, item.text) : h('p', { class: 'muted' }, item.license),
    )));
  }).catch(() => { list.textContent = t('info.legal.failed'); });
}

function infoContent(ui: UI): HTMLElement[] {
  const beta = distribution().betaLabel ? h('span', { class: 'beta-badge' }, t('info.beta')) : null;
  const logo = h('img', { class: 'info-logo', src: './boot/logo.webp', alt: '' });
  const email = CONTACT.email;
  const version = typeof __BUILD__ === 'undefined' ? '0.2.0' : __BUILD__.version;
  const subject = t('info.contact.subject', { version, language: currentLang() });
  const contact = h('div', { class: 'info-contact' },
    h('p', { class: 'muted' }, t(CONTACT.texts[CONTACT.stage])),
    h('a', { class: 'big-btn ghost', href: `mailto:${email}?subject=${encodeURIComponent(subject)}` }, email), // i18n-ok: schema mailto
    h('button', { class: 'big-btn ghost', onclick: async () => {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(email);
        else {
          const input = h('textarea', { value: email, style: 'position:fixed;opacity:0' }) as HTMLTextAreaElement;
          document.body.append(input); input.select();
          const copied = document.execCommand('copy'); input.remove();
          if (!copied) throw new Error('clipboard unavailable');
        }
        toast(t('info.contact.copied'));
      } catch { toast(t('info.contact.copyFailed', { email })); }
    } }, t('info.contact.copy')),
  );
  return [
    h('div', { class: 'info-brand' }, h('div', { class: 'info-brand-mark' }, logo, beta)),
    h('p', { class: 'info-about-title' }, t('info.about.title')),
    h('p', { class: 'muted' }, t('info.about.text')),
    h('div', { class: 'section-title' }, t('info.onboarding.title')),
    h('p', { class: 'muted' }, t('settings.onboarding.hint')),
    h('div', { class: 'info-actions' },
      h('button', { class: 'big-btn ghost', onclick: () => ui.onboarding.replayLetter() }, t('settings.onboarding.letter')),
      h('button', { class: 'big-btn ghost', onclick: () => ui.onboarding.replayIntro() }, t('info.explanations')),
      h('button', { class: 'big-btn ghost', onclick: () => ui.onboarding.replayTutorial() }, t('settings.onboarding.tutorial'))),
    h('div', { class: 'section-title' }, t('info.controls.title')),
    h('button', { class: 'big-btn ghost', onclick: showControls }, t('info.controls.title')),
    h('div', { class: 'section-title' }, t('info.version')),
    h('p', { class: 'muted version-label' }, buildLabel()),
    h('div', { class: 'section-title' }, t('info.contact.title')),
    contact,
    h('div', { class: 'section-title' }, t('info.legal.title')),
    h('button', { class: 'big-btn ghost', onclick: showLegal }, t('info.legal.title')),
  ];
}

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
      const input = e.target as HTMLInputElement;
      const f = input.files?.[0];
      input.value = ''; // lo stesso file si può riscegliere
      if (f) await importSave(ui, f);
    },
  });
  const sections: Record<typeof settingsTab, Array<HTMLElement | null>> = {
    game: [
      h('div', { class: 'section-title' }, t('settings.section.terrain')),
      terrainSection(ui),
      h('div', { class: 'section-title' }, t('settings.section.notifications')),
      remindersAvailable()
        ? h('label', { class: 'setting' }, t('settings.reminders'), h('input', { type: 'checkbox', checked: s.reminders === true, onchange: (e: Event) => void game.setReminders((e.target as HTMLInputElement).checked) }))
        : null,
      h('p', { class: 'muted' }, remindersAvailable() ? t('settings.reminders.app') : t('settings.reminders.browser')),
      languageControl(ui),
    ],
    graphics: [
      h('div', { class: 'setting' }, t('settings.quality'), seg(s.quality, [['auto', t('settings.quality.auto')], ['low', t('settings.quality.low')], ['medium', t('settings.quality.medium')], ['high', t('settings.quality.high')]], (v) => game.setQuality(v))),
      s.quality === 'auto' ? h('p', { class: 'muted', style: 'margin:-2px 0 4px;font-size:12px' }, t('settings.quality.autoHint')) : null,
      h('div', { class: 'setting' }, t('settings.fps'), seg<FpsSetting>(s.fps, [['auto', t('settings.fps.auto')], ['30', t('settings.fps.30')], ['60', t('settings.fps.60')]], (v) => game.setFps(v))),
      h('p', { class: 'muted', style: 'margin:-2px 0 4px;font-size:12px' }, s.fps === 'auto' ? t('settings.fps.autoHint') : s.fps === '30' ? t('settings.fps.30Hint') : t('settings.fps.60Hint')),
      h('div', { class: 'setting' }, t('settings.time'), seg<TimeOverride>(s.timeOverride, [['auto', t('settings.time.auto')], ['day', t('settings.time.day')], ['dusk', t('settings.time.dusk')], ['night', t('settings.time.night')]], (v) => game.setTimeOverride(v))),
      h('label', { class: 'setting' }, t('settings.edgeBlur'), edgeBlur),
      h('label', { class: 'setting' }, t('settings.weather'), h('input', { type: 'checkbox', checked: s.weatherEffects, onchange: (e: Event) => game.setWeatherEffects((e.target as HTMLInputElement).checked) })),
      distribution().id === 'development'
        ? h('label', { class: 'setting' }, t('settings.debug'), h('input', { type: 'checkbox', checked: s.showDebug, onchange: (e: Event) => { s.showDebug = (e.target as HTMLInputElement).checked; game.afterChange(); } }))
        : null,
    ],
    save: [
      h('div', { class: 'section-title' }, t('settings.section.backup')),
      h('p', { class: 'muted' }, t('settings.backup.hint')),
      fileInput,
      h('div', { class: 'section-title' }, t('settings.newGame')),
      h('p', { class: 'muted' }, t('settings.newGame.hint')),
    ],
    info: infoContent(ui),
  };
  // i pulsanti di ogni scheda stanno in fondo al pannello, come negli altri; le schede di sole regolazioni non ne hanno
  const footers: Record<typeof settingsTab, HTMLElement | null> = {
    game: null,
    graphics: null,
    save: h('div', { style: 'display:grid;gap:6px' },
      h('div', { class: 'row' },
        h('button', { class: 'big-btn ghost', onclick: () => exportSave(ui) }, t('settings.backup.export')),
        h('button', { class: 'big-btn ghost', onclick: () => fileInput.click() }, t('settings.backup.import'))),
      h('button', { class: 'big-btn ghost', style: 'color:var(--danger)', onclick: async () => {
        if (!await confirmDialog({ title: t('settings.newGame'), message: t('settings.newGame.confirm'), ok: t('settings.newGame.ok'), danger: true })) return;
        game.replaceState(createNewGame(new Date()));
        closeDrawer();
        toast(t('settings.newGame.done'));
      } }, t('settings.newGame'))),
    info: null,
  };
  const SETTINGS_MONO: Record<typeof settingsTab, string> = { game: 'shovel', graphics: 'sparkle', save: 'save', info: 'info' };
  const TABS: Array<[typeof settingsTab, string, string]> = [['game', 'shovel', t('settings.tab.game')], ['graphics', 'lightOn', t('settings.tab.graphics')], ['save', 'book', t('settings.tab.save')], ['info', 'search', t('settings.tab.info')]];
  // tutte le sezioni restano nel pannello (i controlli tengono il loro stato), si mostra solo quella scelta
  const panes = Object.fromEntries(TABS.map(([id]) => [id, h('div', { class: 'settings-pane', hidden: id !== settingsTab }, ...sections[id])])) as unknown as Record<typeof settingsTab, HTMLElement>;
  const tabBar = h('div', { class: 'tabs even' }, ...TABS.map(([id, ic, label]) => h('button', { class: `tab ${id === settingsTab ? 'active' : ''}`, onclick: (e: Event) => {
    settingsTab = id;
    for (const b of Array.from(tabBar.children)) b.classList.toggle('active', b === e.currentTarget);
    for (const [k, el] of Object.entries(panes)) el.hidden = k !== id;
    setDrawerFooter(footers[id]);
  } }, tabGlyph(SETTINGS_MONO[id]), label)));
  const body = h('div', { 'data-settings': 'true' }, tabBar, ...Object.values(panes));
  openDrawer(t('settings.title'), body, { full: true, footer: footers[settingsTab] ?? undefined });
}

/** "Versione abc1234 · 13/10/2026, 14:40": per controllare che il sito pubblicato sia aggiornato. */
function buildLabel(): string {
  if (typeof __BUILD__ === 'undefined') return '0.2.0';
  const suffix = distribution().betaLabel ? ` · ${t('info.beta')}` : '';
  return `${__BUILD__.version}${suffix} · ${__BUILD__.commit}`;
}

// ── Foto & galleria ────────────────────────────────────────────────────

export function startPhoto(ui: UI) {
  photoOverlay(ui);
}

function photoOverlay(ui: UI) {
  const layer = $('#photo-layer');
  const rectEl = $('#photo-rect');
  const W = window.innerWidth, H = window.innerHeight;
  const r = { x: W * 0.1, y: H * 0.24, w: W * 0.8, h: Math.min(H * 0.46, W * 0.8) };
  const apply = () => Object.assign(rectEl.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  apply();
  layer.hidden = false;
  layer.classList.remove('moved');
  $('#bubble').classList.add('hidden');
  $('#game').classList.add('tools-off'); // niente pulsanti della mappa sotto la barra dello scatto
  let mode: string | null = null;
  let last = { x: 0, y: 0 };
  const down = (e: PointerEvent) => {
    const t = e.target as HTMLElement;
    mode = t.dataset.h ?? (t === rectEl ? 'move' : null);
    if (!mode) return;
    last = { x: e.clientX, y: e.clientY };
    layer.setPointerCapture(e.pointerId);
    rectEl.classList.add('dragging');
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
    // spostato il riquadro, il consiglio si fa da parte
    layer.classList.add('moved');
  };
  const up = () => { mode = null; rectEl.classList.remove('dragging'); };
  layer.addEventListener('pointerdown', down);
  layer.addEventListener('pointermove', move);
  layer.addEventListener('pointerup', up);
  const close = () => {
    layer.hidden = true;
    $('#bubble').classList.remove('hidden');
    $('#game').classList.remove('tools-off');
    layer.removeEventListener('pointerdown', down);
    layer.removeEventListener('pointermove', move);
    layer.removeEventListener('pointerup', up);
    $('#photo-shoot').onclick = null;
    $('#photo-cancel').onclick = null;
    $('#photo-gallery').onclick = null;
  };
  $('#photo-cancel').onclick = close;
  $('#photo-gallery').onclick = () => { close(); void openGallery(ui); };
  $('#photo-shoot').onclick = () => {
    const url = ui.game.capture(r);
    const flash = h('div', { class: 'flash' });
    $('#game').append(flash);
    setTimeout(() => flash.remove(), 450);
    close();
    void photoResult(ui, url);
  };
}

/** Una foto come stampa: il bordo chiaro, più alto in basso, con la data scritta. */
function photoPrint(url: string, date: string, cls = '') {
  return h('figure', { class: `photo-print ${cls}` }, h('img', { src: url, alt: t('photo.result.alt') }), h('figcaption', {}, date));
}

async function sharePhoto(url: string) {
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], 'necrothing.jpg', { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Necrothing' }).catch(() => undefined);
  else { const a = h('a', { href: url, download: 'necrothing.jpg' }); a.click(); }
}

/** La foto appena scattata: a colori, col filtro da scegliere come nella sepoltura (si scorre sulla foto o con le frecce). */
async function photoResult(ui: UI, url: string) {
  const img = await loadImage(url);
  const base = document.createElement('canvas');
  base.width = img.naturalWidth; base.height = img.naturalHeight;
  base.getContext('2d')!.drawImage(img, 0, 0);
  const cache = new Map<PhotoFilter, string>([['none', url]]);
  let filter: PhotoFilter = 'none';
  const filtered = () => {
    let u = cache.get(filter);
    if (!u) {
      const c = applyPhotoFilter(base, filter, 11);
      u = c.toDataURL('image/jpeg', 0.9);
      c.width = c.height = 0; // sul telefono la memoria per le tele è poca
      cache.set(filter, u);
    }
    return u;
  };
  const date = fmtDate(new Date().toISOString());
  // la stampa resta la stessa: cambiando filtro si scambia solo l'immagine, quando la nuova è già decodificata
  // (rifacendo tutto, la prima volta il pannello si accorciava per un attimo e sembrava sparire)
  const print = photoPrint(url, date, 'fresh');
  const pic = print.querySelector('img')!;
  pic.width = base.width; pic.height = base.height; // le proporzioni ci sono subito, anche prima che l'immagine arrivi
  const label = h('b', {}, PHOTO_FILTER_LABELS[filter]);
  const dots = PHOTO_FILTERS.map((_, k) => h('i', { class: k === 0 ? 'on' : '' }));
  const prev = h('button', { class: 'icon-btn small', 'aria-label': t('memorial.filter.prev'), disabled: true, onclick: () => go(-1) }, '‹') as HTMLButtonElement;
  const next = h('button', { class: 'icon-btn small', 'aria-label': t('memorial.filter.next'), onclick: () => go(1) }, '›') as HTMLButtonElement;
  let shown = 0;
  const show = async () => {
    const i = PHOTO_FILTERS.indexOf(filter), ticket = ++shown;
    label.textContent = PHOTO_FILTER_LABELS[filter];
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    prev.disabled = i === 0; next.disabled = i === PHOTO_FILTERS.length - 1;
    const u = filtered();
    const ready = new Image();
    ready.src = u;
    await ready.decode().catch(() => undefined);
    if (ticket === shown) pic.src = u; // scorrendo veloce vince l'ultimo
  };
  const go = (dir: number) => {
    const k = Math.max(0, Math.min(PHOTO_FILTERS.length - 1, PHOTO_FILTERS.indexOf(filter) + dir));
    if (PHOTO_FILTERS[k] !== filter) { filter = PHOTO_FILTERS[k]; void show(); }
  };
  // scorrimento orizzontale sulla foto: a sinistra il filtro dopo, a destra quello prima
  let x0: number | null = null;
  pic.setAttribute('draggable', 'false');
  pic.addEventListener('dragstart', (e) => e.preventDefault());
  pic.addEventListener('pointerdown', (e) => { e.preventDefault(); x0 = e.clientX; pic.setPointerCapture(e.pointerId); });
  pic.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 36) go(dx < 0 ? 1 : -1); });
  pic.addEventListener('pointercancel', () => { x0 = null; });
  const body = h('div', { class: 'photo-result' }, print,
    h('div', { class: 'filter-switch' }, prev, h('div', {}, label, h('div', { class: 'swipe-dots' }, ...dots)), next),
    h('p', { class: 'muted' }, t('photo.result.text')));
  // gli altri filtri si preparano nei momenti liberi, uno alla volta: al primo cambio sono già pronti
  const idle = (fn: () => void) => { if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 1500 }); else setTimeout(fn, 300); };
  const warm = (k: number) => {
    if (k >= PHOTO_FILTERS.length || !base.width) return;
    const keep = filter;
    filter = PHOTO_FILTERS[k]; filtered(); filter = keep;
    idle(() => warm(k + 1));
  };
  window.setTimeout(() => idle(() => warm(1)), 500);
  const save = async () => {
    const rec: PhotoRecord = { id: newId('ph'), createdAt: new Date().toISOString(), dataUrl: filtered() };
    await gallery.add(rec).catch(() => toast(t('photo.galleryUnavailable')));
    ui.game.act((s, n) => R.recordPhoto(s, n));
  };
  openDrawer(t('photo.result.title'), body, {
    kind: 'photo',
    onClose: () => { base.width = base.height = 0; },
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn danger', onclick: () => { closeDrawer(); toast(t('photo.deleted')); } }, t('photo.delete')),
      h('button', { class: 'big-btn ghost', onclick: async () => { await save(); await sharePhoto(filtered()); closeDrawer(); } }, t('photo.share')),
      h('button', { class: 'big-btn', onclick: async () => { await save(); closeDrawer(); } }, t('photo.save'))),
  });
}

export async function openGallery(ui: UI) {
  const photos = await gallery.list().catch(() => [] as PhotoRecord[]);
  const count = () => setDrawerExtra(photos.length ? h('span', { class: 'wisp-pill photo-count' }, t('gallery.count', { n: photos.length })) : null);
  const render = () => {
    count();
    setDrawerFooter(null);
    setDrawerBody(photos.length
      // le stampe in griglia, un po' storte come appoggiate sul tavolo
      ? h('div', { class: 'photo-wall' }, ...photos.map((p) => h('button', { class: 'photo-thumb', 'aria-label': fmtDate(p.createdAt), onclick: () => view(p) }, photoPrint(p.dataUrl, fmtDate(p.createdAt)))))
      : h('div', { class: 'photo-empty' },
        h('i', { class: 'photo-empty-icon', 'data-icon': 'photo' }),
        h('p', {}, t('gallery.empty')),
        h('button', { class: 'big-btn', onclick: () => { closeDrawer(); startPhoto(ui); } }, t('gallery.shoot'))));
    hydrateIcons();
  };
  const view = (p: PhotoRecord) => {
    setDrawerBody(h('div', { class: 'photo-result' }, photoPrint(p.dataUrl, fmtDate(p.createdAt), 'big')));
    setDrawerFooter(h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => render() }, t('gallery.back')),
      h('button', { class: 'big-btn danger', onclick: async () => {
        const yes = await confirmDialog({ title: t('gallery.delete.title'), message: t('gallery.delete.text'), ok: t('gallery.delete'), danger: true });
        if (!yes) return;
        await gallery.remove(p.id); photos.splice(photos.indexOf(p), 1); render();
      } }, t('gallery.delete')),
      h('button', { class: 'big-btn', onclick: () => sharePhoto(p.dataUrl) }, t('gallery.share'))));
  };
  openDrawer(t('gallery.title'), h('div'), { full: true, kind: 'gallery' });
  render();
}
