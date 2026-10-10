// Schermate nei drawer: sepoltura (wizard con anteprima), Bottega,
// Inventario, dettaglio, profilo/achievement, impostazioni, foto e galleria.

import { exportBackup, gallery, importBackup, type PhotoRecord } from '../app/persistence.ts';
import { DECAY } from '../game/balance.ts';
import { CATALOG, CATALOG_LIST, CATEGORY_ORDER, PLACEABLE_CATEGORY_LABELS, isSeasonallyAvailable, repairCost, type PlaceableCategory } from '../game/catalog.ts';
import {
  CATEGORIES, CATEGORY_LABELS, DEATH_CAUSE_LABELS, DEATH_CAUSES, GRAVE_STATE_LABELS,
  GRAVE_TYPE_LABELS, GRAVE_TYPE_MIN_RANK, GRAVE_TYPES, graveVisualState,
} from '../game/graves.ts';
import { ACHIEVEMENTS, achievementProgress, nextRank, rankForXp, rankProgress } from '../game/progression.ts';
import * as R from '../game/rules.ts';
import { createNewGame, type TimeOverride } from '../game/state.ts';
import { computePrestige, detectDistricts, DISTRICT_LABELS, expansionFor } from '../game/world.ts';
import { newId } from '../game/rng.ts';
import { $, closeDrawer, fmtDate, h, openDrawer, setDrawerBody, setDrawerFooter, toast } from './dom.ts';
import { graveThumb, placeableThumb } from './thumbs.ts';
import { ACH_ICONS, icon } from './icons.ts';
import type { UI } from './UI.ts';

const EPITAPHS = [
  'Ha dato tutto. Anche la garanzia.',
  'Riposa in pezzi.',
  'Non era rotto: era stanco.',
  'Qui giace, finalmente scollegato.',
  'Ci mancherai, più o meno.',
  'Sei stato utile. A volte.',
];

// ── Sepoltura ──────────────────────────────────────────────────────────

export function openBurial(ui: UI, initial?: R.BurialDraft, startStep = 0) {
  const game = ui.game;
  const now = game.now();
  const d: R.BurialDraft = initial ? { ...initial } : R.emptyDraft(now);
  let step = startStep;
  const level = rankForXp(game.state.player.xp).level;
  const total = 5;

  const render = () => {
    const errors = R.validateDraft(d, now);
    const body = h('div', {}, h('div', { class: 'steps' }, ...Array.from({ length: total }, (_, i) => h('i', { class: i <= step ? 'on' : '' }))));
    const field = (label: string, input: Node, err?: string) => h('div', { class: 'field' }, h('label', {}, label), input, err ? h('span', { class: 'err' }, err) : null);
    if (step === 0) {
      body.append(
        h('p', { class: 'muted' }, 'Ogni oggetto merita un addio. Chi seppelliamo oggi?'),
        field('Nome del defunto', h('input', { value: d.name, maxLength: 40, placeholder: 'es. Caricatore del 2014', oninput: (e: Event) => { d.name = (e.target as HTMLInputElement).value; } })),
        field('Categoria', h('div', { class: 'chips' }, ...CATEGORIES.map((c) => h('button', {
          class: `chip ${d.category === c ? 'active' : ''}`,
          onclick: () => { d.category = c; render(); },
        }, CATEGORY_LABELS[c])))),
      );
      if (d.category === 'abstract' && !R.canBuryAbstractToday(game.state, now)) body.append(h('p', { class: 'err muted' }, 'Hai già seppellito una cosa astratta oggi: torna domani.'));
    } else if (step === 1) {
      body.append(
        h('div', { class: 'row' },
          field('Nato il (facoltativo)', h('input', { type: 'date', value: d.birthDate ?? '', max: d.deathDate ?? undefined, onchange: (e: Event) => { d.birthDate = (e.target as HTMLInputElement).value || null; render(); } }), errors.birthDate),
          field('Morto il', h('input', { type: 'date', value: d.deathDate ?? '', max: now.toISOString().slice(0, 10), onchange: (e: Event) => { d.deathDate = (e.target as HTMLInputElement).value || null; render(); } }), errors.deathDate),
        ),
        field('Causa del decesso', h('div', { class: 'chips' }, ...DEATH_CAUSES.map((c) => h('button', {
          class: `chip ${d.deathCause === c ? 'active' : ''}`,
          onclick: () => { d.deathCause = c; render(); },
        }, DEATH_CAUSE_LABELS[c])))),
      );
    } else if (step === 2) {
      const ta = h('textarea', { maxLength: 240, placeholder: 'Un ultimo pensiero…', oninput: (e: Event) => { d.epitaph = (e.target as HTMLTextAreaElement).value; } });
      ta.value = d.epitaph;
      body.append(
        field('Epitaffio (facoltativo)', ta),
        h('div', { class: 'chips' }, ...EPITAPHS.map((t) => h('button', { class: 'chip', onclick: () => { d.epitaph = t; render(); } }, t))),
      );
    } else if (step === 3) {
      body.append(h('p', { class: 'muted' }, 'Scegli la lapide. Le più ricche si sbloccano salendo di rango.'),
        h('div', { class: 'grid' }, ...GRAVE_TYPES.map((t) => {
          const locked = GRAVE_TYPE_MIN_RANK[t] > level;
          return h('button', {
            class: `card ${d.graveType === t ? 'selected' : ''} ${locked ? 'dim' : ''}`,
            disabled: locked,
            onclick: () => { d.graveType = t; render(); },
          }, h('img', { src: graveThumb(t, game.state.settings.style), alt: '' }), h('b', {}, GRAVE_TYPE_LABELS[t]), locked ? h('span', { class: 'lock' }, icon('lock', 12), `R${GRAVE_TYPE_MIN_RANK[t]}`) : null);
        })));
    } else {
      body.append(h('div', { class: 'hero' },
        h('img', { src: graveThumb(d.graveType!, game.state.settings.style, 'flowers', 1), alt: '' }),
        h('h3', {}, d.name || '—'),
        d.epitaph ? h('div', { class: 'epitaph' }, `“${d.epitaph}”`) : null,
      ), h('dl', { class: 'kv' },
        h('dt', {}, 'Categoria'), h('dd', {}, d.category ? CATEGORY_LABELS[d.category] : '—'),
        h('dt', {}, 'Vissuto'), h('dd', {}, `${fmtDate(d.birthDate)} → ${fmtDate(d.deathDate)}`),
        h('dt', {}, 'Causa'), h('dd', {}, d.deathCause ? DEATH_CAUSE_LABELS[d.deathCause] : '—'),
        h('dt', {}, 'Lapide'), h('dd', {}, d.graveType ? GRAVE_TYPE_LABELS[d.graveType] : '—'),
      ), h('p', { class: 'muted' }, 'Dopo la conferma scegli il posto nel cimitero: arriverà il corteo funebre.'));
    }
    setDrawerBody(body);

    const stepValid = step === 0 ? !errors.name && !errors.category && !(d.category === 'abstract' && !R.canBuryAbstractToday(game.state, now))
      : step === 1 ? !errors.deathDate && !errors.birthDate && !errors.deathCause
        : step === 3 ? !errors.graveType : step === 4 ? Object.keys(errors).length === 0 : true;
    setDrawerFooter(h('div', { class: 'row' },
      step > 0 ? h('button', { class: 'big-btn ghost', onclick: () => { step--; render(); } }, 'Indietro') : h('button', { class: 'big-btn ghost', onclick: () => closeDrawer() }, 'Annulla'),
      step < total - 1
        ? h('button', { class: 'big-btn', onclick: () => { if (!stepValid) { toast(Object.values(R.validateDraft(d, now))[0] ?? 'Completa i campi.'); return; } step++; render(); } }, 'Avanti')
        : h('button', { class: 'big-btn', disabled: !stepValid, onclick: () => { closeDrawer(); game.startGravePlacement(d); } }, 'Scegli il posto'),
    ));
  };
  openDrawer('Seppellisci', h('div'));
  render();
}

// ── Modifica ───────────────────────────────────────────────────────────

export function openEditIntro(ui: UI) {
  let dontShow = true;
  openDrawer('Modalità Modifica', h('div', {},
    h('p', { class: 'muted' }, 'In Modifica tocchi un elemento per selezionarlo e lo trascini per spostarlo. Dal menù puoi ruotarlo, cambiarne la variante o riporlo nell’inventario. Fuori da Modifica, il tocco è solo interazione.'),
    h('label', { class: 'setting' }, 'Non mostrare più', h('input', { type: 'checkbox', checked: true, onchange: (e: Event) => { dontShow = (e.target as HTMLInputElement).checked; } })),
  ), {
    footer: h('button', { class: 'big-btn', onclick: () => { if (dontShow) ui.game.state.settings.editIntroSeen = true; closeDrawer(); ui.game.setEditMode(true); ui.game.afterChange(); } }, 'Inizia'),
  });
}

// ── Bottega ────────────────────────────────────────────────────────────

const LOCK_LABEL: Record<R.ShopAvailability, string> = { ok: '', rank: 'rango', season: 'dicembre', owned: 'posseduto', funds: '' };

export function openShop(ui: UI, cat: PlaceableCategory = 'light', selected: string | null = null) {
  const game = ui.game;
  const s = game.state;
  const now = game.now();
  let qty = 1;
  const render = () => {
    const tabs = h('div', { class: 'tabs' }, ...CATEGORY_ORDER.map((c) => h('button', { class: `tab ${c === cat ? 'active' : ''}`, onclick: () => { cat = c; selected = null; render(); } }, PLACEABLE_CATEGORY_LABELS[c])));
    const items = CATALOG_LIST.filter((d) => d.category === cat && !d.permanent && (isSeasonallyAvailable(d, now.getMonth()) || d.onlyMonth !== undefined));
    const grid = h('div', { class: 'grid' }, ...items.map((d) => {
      const av = R.shopAvailability(s, d.id, now);
      return h('button', {
        class: `card ${selected === d.id ? 'selected' : ''} ${av !== 'ok' ? 'dim' : ''}`,
        onclick: () => { selected = d.id; qty = 1; render(); },
      },
      h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }),
      h('b', {}, d.label),
      h('span', { class: 'price' }, String(d.cost), icon('wisp', 12)),
      LOCK_LABEL[av] ? h('span', { class: 'lock' }, av === 'rank' ? icon('lock', 12) : null, av === 'rank' ? `R${d.minRank}` : LOCK_LABEL[av]) : null,
      (s.inventory[d.id] ?? 0) > 0 ? h('span', { class: 'badge' }, String(s.inventory[d.id])) : null);
    }));
    setDrawerBody(h('div', {}, h('p', { class: 'muted' }, `Hai ${s.player.wisps} fuochi fatui. Gli oggetti grigi richiedono rango, stagione o più fuochi fatui.`), tabs, grid));
    if (!selected) { setDrawerFooter(null); return; }
    const d = CATALOG[selected];
    const av = R.shopAvailability(s, d.id, now);
    const max = Math.max(1, R.maxBuyable(s, d.id));
    qty = Math.min(qty, max);
    setDrawerFooter(h('div', { style: 'display:grid;gap:8px' },
      h('div', { class: 'row' }, h('b', {}, d.label), h('span', { class: 'muted', style: 'text-align:right' }, d.unique ? 'Pezzo unico' : `Max ${R.maxBuyable(s, d.id)}`)),
      h('p', { class: 'muted', style: 'margin:0' }, d.description),
      !d.unique && av === 'ok' ? h('div', { class: 'qty' },
        h('button', { onclick: () => { qty = Math.max(1, qty - 1); render(); } }, '−'),
        h('b', {}, String(qty)),
        h('button', { onclick: () => { qty = Math.min(max, qty + 1); render(); } }, '+')) : null,
      h('button', {
        class: 'big-btn', disabled: av !== 'ok',
        onclick: () => {
          if (game.act((st, n) => R.buy(st, d.id, qty, n))) {
            setDrawerFooter(h('div', { class: 'row' },
              h('button', { class: 'big-btn ghost', onclick: () => render() }, 'Continua'),
              h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.startItemPlacement(d.id); } }, 'Inserisci ora')));
            setDrawerBody(h('div', {}, h('div', { class: 'hero' }, h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }), h('h3', {}, d.label), h('p', { class: 'muted' }, 'Acquistato: è nell’inventario.'))));
          }
        },
      }, av === 'ok' ? `Acquista · ${d.cost * qty} fuochi fatui` : av === 'funds' ? 'Fuochi fatui insufficienti' : av === 'rank' ? `Serve il rango ${d.minRank}` : av === 'owned' ? 'Già posseduto' : 'Solo a dicembre'),
      h('button', { class: 'big-btn ghost', onclick: () => { selected = null; render(); } }, 'Annulla'),
    ));
  };
  openDrawer('Bottega', h('div'));
  render();
}

// ── Inventario ─────────────────────────────────────────────────────────

export function openInventory(ui: UI, cat: PlaceableCategory | 'all' = 'all') {
  const game = ui.game;
  const s = game.state;
  let selected: string | null = null;
  const render = () => {
    const tabs = h('div', { class: 'tabs' },
      h('button', { class: `tab ${cat === 'all' ? 'active' : ''}`, onclick: () => { cat = 'all'; render(); } }, 'Tutto'),
      ...CATEGORY_ORDER.map((c) => h('button', { class: `tab ${c === cat ? 'active' : ''}`, onclick: () => { cat = c; selected = null; render(); } }, PLACEABLE_CATEGORY_LABELS[c])));
    const types = CATALOG_LIST.filter((d) => (cat === 'all' || d.category === cat) && ((s.inventory[d.id] ?? 0) > 0 || s.placeables.some((p) => p.type === d.id)));
    const grid = types.length ? h('div', { class: 'grid' }, ...types.map((d) => {
      const owned = s.inventory[d.id] ?? 0;
      const placed = s.placeables.filter((p) => p.type === d.id).length;
      return h('button', { class: `card ${owned === 0 ? 'dim' : ''} ${selected === d.id ? 'selected' : ''}`, onclick: () => { if (owned) { selected = d.id; render(); } else toast(`${d.label}: già tutto posato nel cimitero.`); } },
        h('img', { src: placeableThumb(d.id, s.settings.style), alt: '' }),
        h('b', {}, d.label),
        h('small', {}, placed ? `${placed} posat${placed === 1 ? 'o' : 'i'}` : 'in magazzino'),
        owned ? h('span', { class: 'badge' }, String(owned)) : null);
    })) : h('p', { class: 'muted' }, 'Niente qui. Passa dalla Bottega!');
    setDrawerBody(h('div', {}, tabs, grid));
    if (!selected) { setDrawerFooter(null); return; }
    const d = CATALOG[selected];
    setDrawerFooter(h('div', { style: 'display:grid;gap:8px' },
      h('div', { class: 'row' }, h('b', {}, d.label), h('span', { class: 'muted', style: 'text-align:right' }, `Ne hai ${s.inventory[d.id] ?? 0}`)),
      h('div', { class: 'row' },
        h('button', { class: 'big-btn ghost', onclick: () => { game.act((st) => R.sell(st, d.id, 1)); if (!(s.inventory[d.id] ?? 0)) selected = null; render(); } }, `Vendi · +${R.sellPrice(d.id)} fuochi fatui`),
        h('button', { class: 'big-btn', onclick: () => { closeDrawer(); game.startItemPlacement(d.id); } }, 'Inserisci')),
    ));
  };
  openDrawer('Inventario', h('div'));
  render();
}

// ── Dettaglio ──────────────────────────────────────────────────────────

const MEMORY_LABELS = { burial: 'Sepoltura', flower: 'Fiori', cleaned: 'Pulizia', repaired: 'Riparazione', anniversary: 'Anniversario', ghost: 'Apparizione', blessing: 'Benedizione', zombie: 'Zombie' } as const;

export function openDetail(ui: UI, id: string) {
  const game = ui.game;
  const s = game.state;
  const style = s.settings.style;
  const g = s.graves.find((x) => x.id === id);
  if (g) {
    const vs = graveVisualState(g);
    const mem = s.memories.filter((m) => m.graveId === id).slice(-8).reverse();
    openDrawer(g.legacy ? 'Lascito del vecchio custode' : 'Memoria', h('div', {},
      h('div', { class: 'hero' },
        h('img', { src: graveThumb(g.graveType, style, vs, g.seed % 4), alt: '' }),
        h('h3', {}, g.name),
        g.epitaph ? h('div', { class: 'epitaph' }, `“${g.epitaph}”`) : null),
      h('dl', { class: 'kv' },
        h('dt', {}, 'Categoria'), h('dd', {}, CATEGORY_LABELS[g.category]),
        h('dt', {}, 'Vissuto'), h('dd', {}, `${fmtDate(g.birthDate)} → ${fmtDate(g.deathDate)}`),
        h('dt', {}, 'Causa'), h('dd', {}, DEATH_CAUSE_LABELS[g.deathCause]),
        h('dt', {}, 'Lapide'), h('dd', {}, GRAVE_TYPE_LABELS[g.graveType]),
        h('dt', {}, 'Stato'), h('dd', {}, GRAVE_STATE_LABELS[vs] + (g.broken ? ` (riparare costa ${DECAY.graveRepairCost} fuochi fatui)` : '')),
      ),
      mem.length ? h('div', {}, h('div', { class: 'section-title' }, 'Ricordi'), h('ul', { class: 'timeline' }, ...mem.map((m) => h('li', {}, h('time', {}, fmtDate(m.at)), MEMORY_LABELS[m.type])))) : null,
    ), { footer: h('button', { class: 'big-btn ghost', onclick: () => { closeDrawer(); game.focusEntity(id); } }, 'Mostra sulla mappa') });
    return;
  }
  const p = s.placeables.find((x) => x.id === id);
  if (!p) return;
  const d = CATALOG[p.type];
  const body = h('div', {},
    h('div', { class: 'hero' }, h('img', { src: placeableThumb(p.type, style, p.variant), alt: '' }), h('h3', {}, d.label), h('p', { class: 'muted' }, d.description)),
    h('dl', { class: 'kv' },
      h('dt', {}, 'Categoria'), h('dd', {}, PLACEABLE_CATEGORY_LABELS[d.category]),
      d.variantLabels ? h('dt', {}, 'Variante') : null, d.variantLabels ? h('dd', {}, d.variantLabels[p.variant]) : null,
      d.decays ? h('dt', {}, 'Condizione') : null, d.decays ? h('dd', {}, p.broken ? `Rotto (riparare: ${repairCost(d)} fuochi fatui)` : p.dirty ? 'Sporco: va pulito' : 'In ordine — si sporca dopo 3 giorni senza cure') : null,
      d.light ? h('dt', {}, 'Luce') : null, d.light ? h('dd', {}, p.broken ? 'Guasta' : p.lit ? 'Accesa' : 'Spenta') : null,
    ),
  );
  if (d.editableText) {
    const input = h('input', { value: p.text ?? '', maxLength: 60, placeholder: 'Scrivi qualcosa…' });
    body.append(h('div', { class: 'field' }, h('label', {}, 'Scritta del cartello'), input),
      h('button', { class: 'big-btn', onclick: () => { game.act((st) => R.setText(st, id, input.value)); } }, 'Salva scritta'));
  }
  openDrawer(d.label, body);
}

// ── Profilo & achievement ──────────────────────────────────────────────

export function openPlayer(ui: UI) {
  const game = ui.game;
  const s = game.state;
  const p = s.player;
  const rank = rankForXp(p.xp);
  const next = nextRank(p.xp);
  const prestige = computePrestige(s);
  const exp = expansionFor(prestige);
  const districts = detectDistricts(s.graves);
  const name = h('input', { value: p.name, maxLength: 24, onchange: (e: Event) => { p.name = (e.target as HTMLInputElement).value.trim() || 'Custode'; game.afterChange(); } });
  const got = new Set(s.achievements.map((a) => a.id));
  const tiers = { gold: 'Oro', silver: 'Argento', bronze: 'Bronzo' } as const;
  openDrawer('Il Custode', h('div', {},
    h('div', { class: 'field' }, h('label', {}, 'Nome'), name),
    h('dl', { class: 'kv' },
      h('dt', {}, 'Rango'), h('dd', {}, `${rank.level} · ${rank.name}`),
      h('dt', {}, 'Punti Necro'), h('dd', {}, `${p.xp}${next ? ` / ${next.minXp}` : ''}`),
      h('dt', {}, 'Fuochi fatui'), h('dd', {}, `${p.wisps} fuochi fatui`),
      h('dt', {}, 'Prestigio'), h('dd', {}, String(prestige)),
      h('dt', {}, 'Recinto'), h('dd', {}, `${exp.label}${exp.next ? ` — prossimo a ${exp.next.minPrestige} (mancano ${exp.toNext})` : ''}`),
      h('dt', {}, 'Distretti'), h('dd', {}, districts.length ? districts.map((d) => DISTRICT_LABELS[d.theme]).join(', ') : 'Nessuno (4 tombe coerenti vicine)'),
    ),
    h('div', { class: 'xp-bar', style: 'height:6px;margin-bottom:10px' }, h('i', { style: `width:${Math.round(rankProgress(p.xp) * 100)}%` })),
    h('div', { class: 'section-title' }, `Achievement · ${got.size}/${ACHIEVEMENTS.length}`),
    ...(['gold', 'silver', 'bronze'] as const).flatMap((tier) => ACHIEVEMENTS.filter((a) => a.tier === tier).map((a) => {
      const done = got.has(a.id);
      const prog = achievementProgress(a, s);
      return h('div', { class: `ach ${done ? 'got' : ''} tier-${tier}` },
        h('div', { class: 'ico' }, icon(done ? (ACH_ICONS[a.id] ?? 'trophy') : 'lock', 30)),
        h('div', {}, h('b', {}, a.name), h('p', {}, `${a.description} · ${tiers[tier]}`), !done && prog > 0 ? h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(prog * 100)}%` })) : null));
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
  const fileInput = h('input', {
    type: 'file', accept: '.necro3d,application/json', style: 'display:none',
    onchange: async (e: Event) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      try { game.replaceState(await importBackup(await f.text())); toast('Backup ripristinato.'); closeDrawer(); } catch (err) { toast(err instanceof Error ? err.message : 'Import fallito.'); }
    },
  });
  const body = h('div', { 'data-settings': 'true' },
    h('div', { class: 'section-title' }, 'Resa grafica'),
    h('div', { class: 'setting' }, 'Stile', seg(s.style, [['lowpoly', 'Low-Poly'], ['voxel', 'Voxel'], ['miniature', 'Miniatura']], (v) => game.setStyle(v))),
    h('div', { class: 'setting' }, 'Vista', seg(s.camera, [['angled', 'Obliqua'], ['top', 'Dall’alto']], (v) => game.setCamera(v))),
    h('div', { class: 'setting' }, 'Qualità', seg(s.quality, [['low', 'Bassa'], ['medium', 'Media'], ['high', 'Alta']], (v) => game.setQuality(v))),
    h('div', { class: 'setting' }, 'Ora del giorno', seg<TimeOverride>(s.timeOverride, [['auto', 'Reale'], ['day', 'Giorno'], ['dusk', 'Sera'], ['night', 'Notte']], (v) => game.setTimeOverride(v))),
    h('label', { class: 'setting' }, 'Sfocatura ai bordi', edgeBlur),
    h('label', { class: 'setting' }, 'Effetti meteo', h('input', { type: 'checkbox', checked: s.weatherEffects, onchange: (e: Event) => game.setWeatherEffects((e.target as HTMLInputElement).checked) })),
    h('label', { class: 'setting' }, 'Statistiche tecniche', h('input', { type: 'checkbox', checked: s.showDebug, onchange: (e: Event) => { s.showDebug = (e.target as HTMLInputElement).checked; game.afterChange(); } })),
    h('div', { class: 'section-title' }, 'Notifiche'),
    h('p', { class: 'muted' }, 'Promemoria per anniversari, erbacce e apparizioni arriveranno con l’app nativa (Capacitor). Nel browser il cimitero si aggiorna quando lo riapri.'),
    h('div', { class: 'section-title' }, 'Backup'),
    h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: async () => {
        const blob = await exportBackup(game.state);
        const a = h('a', { href: URL.createObjectURL(blob), download: `necrothing-${new Date().toISOString().slice(0, 10)}.necro3d` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } }, 'Esporta'),
      h('button', { class: 'big-btn ghost', onclick: () => fileInput.click() }, 'Importa')),
    fileInput,
    h('div', { class: 'section-title' }, 'Info'),
    h('p', { class: 'muted' }, 'Necrothing 3D · prototipo procedurale (Three.js). Tutti i modelli sono generati dal codice. Scorciatoie: WASD muovi · E interagisci · C vista · V stile.'),
    h('div', { class: 'row' },
      h('a', { class: 'big-btn ghost', href: './gallery.html', style: 'display:grid;place-items:center;text-decoration:none' }, 'Galleria asset'),
      h('button', { class: 'big-btn ghost', style: 'color:var(--danger)', onclick: () => {
        if (!confirm('Ricominciare da capo? Il cimitero attuale andrà perso.')) return;
        game.replaceState(createNewGame(new Date()));
        closeDrawer();
        toast('Un nuovo cimitero ti aspetta.');
      } }, 'Nuova partita')),
  );
  openDrawer('Impostazioni', body);
}

// ── Foto & galleria ────────────────────────────────────────────────────

export function startPhoto(ui: UI) {
  openDrawer('Foto del cimitero', h('div', {},
    h('p', { class: 'muted' }, 'Inquadra la scena con il rettangolo: trascina gli angoli per allargarlo o stringerlo, trascina l’interno per spostarlo. Il pulsante tondo scatta. La foto è in bianco e nero, come i ricordi migliori.')),
  { footer: h('button', { class: 'big-btn', onclick: () => { closeDrawer(); photoOverlay(ui); } }, 'Inizia') });
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
    await gallery.add(rec).catch(() => toast('Galleria non disponibile in questo browser.'));
    ui.game.act((s, n) => R.recordPhoto(s, n));
  };
  openDrawer('La tua foto', h('div', {}, h('img', { class: 'photo-view', src: url, alt: 'Foto del cimitero' })), {
    footer: h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', style: 'color:var(--danger)', onclick: () => { closeDrawer(); toast('Foto eliminata.'); } }, 'Elimina'),
      h('button', { class: 'big-btn ghost', onclick: async () => { await save(); await sharePhoto(url); closeDrawer(); } }, 'Condividi'),
      h('button', { class: 'big-btn', onclick: async () => { await save(); closeDrawer(); } }, 'Salva')),
  });
}

export async function openGallery(ui: UI) {
  const photos = await gallery.list().catch(() => [] as PhotoRecord[]);
  const render = () => {
    setDrawerFooter(null);
    setDrawerBody(photos.length
      ? h('div', { class: 'photo-grid' }, ...photos.map((p) => h('button', { onclick: () => view(p) }, h('img', { src: p.dataUrl, alt: fmtDate(p.createdAt) }))))
      : h('p', { class: 'muted' }, 'Nessuna foto, per ora. Usa “Foto” dalla bolla delle azioni.'));
  };
  const view = (p: PhotoRecord) => {
    setDrawerBody(h('div', {}, h('img', { class: 'photo-view', src: p.dataUrl, alt: '' }), h('p', { class: 'muted' }, fmtDate(p.createdAt))));
    setDrawerFooter(h('div', { class: 'row' },
      h('button', { class: 'big-btn ghost', onclick: () => render() }, 'Indietro'),
      h('button', { class: 'big-btn ghost', style: 'color:var(--danger)', onclick: async () => { await gallery.remove(p.id); photos.splice(photos.indexOf(p), 1); render(); } }, 'Elimina'),
      h('button', { class: 'big-btn', onclick: () => sharePhoto(p.dataUrl) }, 'Condividi')));
  };
  openDrawer('Galleria', h('div'));
  render();
  void ui;
}
