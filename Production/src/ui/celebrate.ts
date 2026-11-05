// Le celebrazioni: un nuovo rango, un traguardo raggiunto. Una finestra al
// centro, come le schede del primo ingresso: il medaglione esce dal bordo e
// «scoppia» davanti a una raggiera che gira, con qualche scintilla (quante, lo
// decide il livello grafico; nessuna con il movimento ridotto). Più d'una alla
// volta fanno la coda e arrivano una dopo l'altra, quando il giocatore è
// libero (niente pannelli, dialoghi, scatti o fasi a schermo pieno aperti).
//
// Una carta sola per quel che arriva insieme: un nuovo rango, i traguardi e un
// evento (la lettera spedita) che si accumulano in coda diventano una celebrazione
// unica. In grande il più importante (rango, poi evento, poi il traguardo più
// prezioso), gli altri sotto «Anche»; il traguardo del rango («Raggiungi il
// rango 4», stesso nome e stesso medaglione) diventa l'etichetta sotto il titolo.
// I pezzi d'aspetto («Provalo») e la fine del cortile restano carte a sé.

import { LOOK_UNLOCKS, RANKS } from '../game/balance.ts';
import { LOOK_STYLES, type CustodeLook } from '../game/look.ts';
import { custodePortrait } from './lookThumbs.ts';
import { CATALOG_LIST } from '../game/catalog.ts';
import { GRAVE_TYPE_MIN_RANK } from '../game/graves.ts';
import type { AchievementDef } from '../game/progression.ts';
import { t } from '../i18n/index.ts';
import { $, drawerOpen, h, uiBlocking } from './dom.ts';
import { ACH_ICONS, RANK_ICONS } from './icons.ts';
import { lpBadgeUrl, type BadgeTier } from './lpIcons.ts';

export interface Celebration {
  /** Riga piccola sopra il titolo: «Traguardo raggiunto», «Nuovo rango». */
  kicker: string;
  title: string;
  text: string;
  /** Una riga in più, sotto (es. cosa si sblocca col rango). */
  extra?: string;
  /** Il medaglione (data URL) e il numero sul medaglione, se c'è. */
  badge: string;
  count?: number;
  /** Etichetta del grado (Bronzo, Argento, Oro). */
  tier?: string;
  /** Il pulsante, se non «Evviva!», e cosa fare chiudendo (la fine del cortile: «Inizia il gioco»). */
  ok?: string;
  onClose?: () => void;
  /** Cosa fa il pulsante principale (solo lui, non la chiusura toccando fuori), e un secondo pulsante che chiude soltanto. */
  onOk?: () => void;
  later?: string;
  /** Il medaglino accanto all'etichetta del grado (il traguardo del rango fuso nel rango). */
  tierIcon?: string;
  /** Le altre cose arrivate insieme, sotto «Anche». */
  rows?: Array<{ badge: string; title: string; text: string }>;
  /** Quante altre non ci stanno nelle righe. */
  more?: number;
  /** Per il raggruppamento: un rango (il livello) o un traguardo (id e grado). */
  rank?: number;
  ach?: { id: string; tier: BadgeTier; description: string };
}

/** Quante righe sotto «Anche», al più (le altre: «e altri N»). */
const MAX_ROWS = 3;
const TIER_ORDER: Record<BadgeTier, number> = { gold: 0, silver: 1, bronze: 2 };

const queue: Celebration[] = [];
let showing = false;
let timer = 0;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** In coda: arriva appena il giocatore è libero. */
export function celebrate(c: Celebration) {
  queue.push(c);
  // un attimo di attesa: quel che nasce dalla stessa azione (rango, traguardi, evento) arriva insieme e fa una carta sola
  window.clearTimeout(timer);
  timer = window.setTimeout(pump, COLLECT_MS);
}

/** Quanto si aspetta prima di mostrare, perché arrivino tutte le celebrazioni della stessa azione. */
const COLLECT_MS = 80;

function busy(): boolean {
  const photo = document.getElementById('photo-layer');
  // anche la lettera aperta (scritta o letta): la sua carta «Spedita!» arriva dopo e si fonde coi traguardi
  return drawerOpen() || uiBlocking() || !!document.querySelector('.dialog-scrim, .mail-layer') || (!!photo && !photo.hidden);
}

function pump() {
  window.clearTimeout(timer);
  if (showing || !queue.length) return;
  if (busy()) { timer = window.setTimeout(pump, 700); return; }
  show(nextCard());
}

/** Si fonde con le altre: ranghi, traguardi ed eventi semplici (non l'aspetto né la fine del cortile). */
const mergeable = (c: Celebration) => !c.onClose && !c.onOk && !c.later;

/** La prossima carta: la prima in coda, insieme a tutte quelle che si possono fondere con lei. */
function nextCard(): Celebration {
  const first = queue.shift()!;
  if (!mergeable(first)) return first;
  const group = [first];
  for (let i = 0; i < queue.length;) { if (mergeable(queue[i])) group.push(...queue.splice(i, 1)); else i++; }
  return group.length > 1 ? merge(group) : first;
}

/**
 * Una carta sola: in grande il rango più alto (con quanti ranghi si è saliti e tutto quel che
 * sbloccano), o l'evento, o il traguardo più prezioso; il traguardo di quel rango diventa
 * l'etichetta del grado; il resto sotto «Anche».
 */
function merge(group: Celebration[]): Celebration {
  const ranks = group.filter((c) => c.rank).sort((a, b) => b.rank! - a.rank!);
  const top = ranks[0];
  const rest = group.filter((c) => !c.rank);
  let hero: Celebration;
  if (top) {
    const levels = ranks.map((c) => c.rank!);
    hero = rankCard(top.rank!, levels);
    // il traguardo di questo rango («Raggiungi il rango N») non è una carta in più: è l'etichetta
    const own = rest.findIndex((c) => c.ach?.id === `rank_${top.rank}`);
    if (own >= 0) { const a = rest.splice(own, 1)[0]; hero.tier = `${t('celebrate.ach.kicker')} · ${t(`player.tier.${a.ach!.tier}`)}`; hero.tierIcon = a.badge; }
    // e quelli dei ranghi saltati sono già detti nel testo («sei salito di N ranghi»)
    for (const l of levels) { const i = rest.findIndex((c) => c.ach?.id === `rank_${l}`); if (i >= 0) rest.splice(i, 1); }
  } else {
    const event = rest.find((c) => !c.ach);
    hero = event ?? [...rest].sort((a, b) => TIER_ORDER[a.ach!.tier] - TIER_ORDER[b.ach!.tier])[0];
    rest.splice(rest.indexOf(hero), 1);
  }
  const others = rest.sort((a, b) => (a.ach ? 1 : 0) - (b.ach ? 1 : 0) || (a.ach && b.ach ? TIER_ORDER[a.ach.tier] - TIER_ORDER[b.ach.tier] : 0));
  const rows = others.slice(0, MAX_ROWS).map((c) => ({
    badge: c.badge, title: c.title,
    text: c.ach ? `${t(`player.tier.${c.ach.tier}`)} · ${c.ach.description}` : c.text,
  }));
  return { ...hero, rows: rows.length ? rows : undefined, more: others.length > MAX_ROWS ? others.length - MAX_ROWS : undefined };
}

function show(c: Celebration) {
  showing = true;
  const q = document.documentElement.dataset.quality ?? 'medium';
  const n = reducedMotion() ? 0 : q === 'high' ? 18 : q === 'medium' ? 10 : 0;
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  // scintille che partono dal medaglione in tutte le direzioni (solo trasformazioni e opacità)
  const sparks = n ? h('div', { class: 'cel-sparks', 'aria-hidden': 'true' }, ...Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + r(-0.2, 0.2), d = r(70, 130);
    return h('i', { style: `--tx:${(Math.cos(a) * d).toFixed(0)}px;--ty:${(Math.sin(a) * d).toFixed(0)}px;--dl:${r(0.25, 0.5).toFixed(2)}s;--s:${r(0.6, 1.2).toFixed(2)}` }); // i18n-ok: stile
  })) : null;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    scrim.classList.add('out');
    window.setTimeout(() => { scrim.remove(); showing = false; window.setTimeout(pump, 250); }, reducedMotion() ? 0 : 220);
    c.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); close(); } };
  const card = h('div', { class: 'dialog modal cel-card', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': `${c.kicker}: ${c.title}`, onclick: (e: Event) => e.stopPropagation() },
    h('div', { class: 'cel-badge', 'aria-hidden': 'true' },
      h('i', { class: 'cel-rays' }), h('i', { class: 'cel-glow' }), sparks,
      h('img', { src: c.badge, alt: '' }),
      c.count ? h('span', { class: 'ach-n' }, String(c.count)) : null),
    h('small', { class: 'cel-kicker' }, c.kicker),
    h('h3', {}, c.title),
    c.tier ? h('span', { class: 'cel-tier' }, c.tierIcon ? h('img', { src: c.tierIcon, alt: '' }) : null, c.tier) : null,
    h('p', {}, c.text),
    c.extra ? h('p', { class: 'cel-extra' }, c.extra) : null,
    c.rows ? h('div', { class: 'cel-more' }, h('small', {}, t('celebrate.more')),
      ...c.rows.map((r) => h('div', { class: 'cel-row' }, h('img', { src: r.badge, alt: '' }), h('div', {}, h('b', {}, r.title), h('span', {}, r.text)))),
      c.more ? h('span', { class: 'cel-more-n' }, t('celebrate.moreN', { n: c.more })) : null) : null,
    c.later
      ? h('div', { class: 'row cel-actions' }, h('button', { class: 'big-btn ghost', onclick: close }, c.later), h('button', { class: 'big-btn', onclick: () => { close(); c.onOk?.(); } }, c.ok ?? t('celebrate.ok')))
      : h('button', { class: 'big-btn', onclick: () => { close(); c.onOk?.(); } }, c.ok ?? t('celebrate.ok')));
  const scrim = h('div', { class: 'dialog-scrim cel-scrim', onclick: close }, card);
  ($('#drawer').parentElement ?? document.body).append(scrim);
  document.addEventListener('keydown', onKey, true);
}

/** Un traguardo raggiunto: il suo medaglione, del suo grado. */
export function celebrateAchievement(a: AchievementDef) {
  celebrate({
    kicker: t('celebrate.ach.kicker'), title: a.name, text: a.description,
    badge: lpBadgeUrl(ACH_ICONS[a.id] ?? 'trophy', a.tier), tier: t(`player.tier.${a.tier}`),
    ach: { id: a.id, tier: a.tier, description: a.description },
  });
}

/** Il medaglione dei ranghi: bronzo il 2, argento il 3, oro dal 4. */
const RANK_TIER = (level: number): BadgeTier => (level >= 4 ? 'gold' : level === 3 ? 'silver' : 'bronze');

/** Un nuovo rango: il nome, e cosa si sblocca (oggetti della Bottega e lapidi di quel rango). */
export function celebrateRank(level: number) {
  if (!RANKS.some((r) => r.level === level)) return;
  celebrate(rankCard(level, [level]));
}

/** La carta del rango `level`; `levels`: i ranghi raggiunti insieme (gli sblocchi si sommano). */
function rankCard(level: number, levels: number[]): Celebration {
  const rank = RANKS.find((r) => r.level === level)!;
  const has = (r: number) => levels.includes(r);
  const items = CATALOG_LIST.filter((d) => has(d.minRank) && !d.permanent && !d.retired && d.cost > 0).length;
  const stones = Object.values(GRAVE_TYPE_MIN_RANK).filter((r) => has(r)).length;
  const parts = [items ? t('celebrate.rank.items', { n: items }) : '', stones ? t('celebrate.rank.stones', { n: stones }) : ''].filter(Boolean);
  return {
    kicker: t('celebrate.rank.kicker'), title: rank.name,
    text: levels.length > 1 ? t('celebrate.rank.textMany', { n: level, k: levels.length }) : t('celebrate.rank.text', { n: level }),
    extra: parts.length ? t('celebrate.rank.unlocks', { what: parts.join(t('celebrate.rank.and')) }) : undefined,
    badge: lpBadgeUrl(RANK_ICONS[level] ?? 'rank', RANK_TIER(level)), count: level, rank: level,
  };
}

/**
 * Pezzi d'aspetto sbloccati («hat:witch»…): il Custode che già li indossa nel
 * medaglione, chi glieli ha dati, e «Provalo» che apre l'Aspetto. I pezzi che
 * vengono dallo stesso personaggio (i fratelli: camicia e berretto) fanno una
 * celebrazione sola.
 */
export function celebrateLooks(keys: string[], look: CustodeLook, tryIt: () => void) {
  const groups = new Map<string, Array<{ part: keyof CustodeLook; value: string; name: string }>>();
  for (const key of keys) {
    const u = LOOK_UNLOCKS.find((x) => x.key === key);
    if (!u) continue;
    const [part, value] = key.split(':') as [keyof CustodeLook, string];
    const style = (LOOK_STYLES as Record<string, Array<[string, string]>>)[part]?.find(([v]) => v === value);
    const who = u.npc ? `celebrate.look.npc.${u.npc}` : `celebrate.look.pet.${u.pet}`;
    groups.set(who, [...(groups.get(who) ?? []), { part, value, name: style?.[1] ?? value }]);
  }
  for (const [who, parts] of groups) {
    const worn = { ...look };
    for (const p of parts) (worn as Record<string, unknown>)[p.part] = p.value;
    celebrate({
      kicker: t('celebrate.look.kicker'), title: parts.map((p) => p.name).join(' · '),
      text: t(who),
      extra: t('celebrate.look.where'),
      badge: custodePortrait(worn, true),
      ok: t('celebrate.look.try'), later: t('celebrate.look.later'), onOk: tryIt,
    });
  }
}
