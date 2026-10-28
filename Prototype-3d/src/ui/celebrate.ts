// Le celebrazioni: un nuovo rango, un traguardo raggiunto. Una finestra al
// centro, come le schede del primo ingresso: il medaglione esce dal bordo e
// «scoppia» davanti a una raggiera che gira, con qualche scintilla (quante, lo
// decide il livello grafico; nessuna con il movimento ridotto). Più d'una alla
// volta fanno la coda e arrivano una dopo l'altra, quando il giocatore è
// libero (niente pannelli, dialoghi, scatti o fasi a schermo pieno aperti).

import { RANKS } from '../game/balance.ts';
import { CATALOG_LIST } from '../game/catalog.ts';
import { GRAVE_TYPE_MIN_RANK } from '../game/graves.ts';
import type { AchievementDef } from '../game/progression.ts';
import { t } from '../i18n/index.ts';
import { $, drawerOpen, h, uiBlocking } from './dom.ts';
import { ACH_COUNT, ACH_ICONS } from './icons.ts';
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
}

const queue: Celebration[] = [];
let showing = false;
let timer = 0;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** In coda: arriva appena il giocatore è libero. */
export function celebrate(c: Celebration) {
  queue.push(c);
  pump();
}

function busy(): boolean {
  const photo = document.getElementById('photo-layer');
  return drawerOpen() || uiBlocking() || !!document.querySelector('.dialog-scrim') || (!!photo && !photo.hidden);
}

function pump() {
  window.clearTimeout(timer);
  if (showing || !queue.length) return;
  if (busy()) { timer = window.setTimeout(pump, 700); return; }
  show(queue.shift()!);
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
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); close(); } };
  const card = h('div', { class: 'dialog modal cel-card', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': `${c.kicker}: ${c.title}`, onclick: (e: Event) => e.stopPropagation() },
    h('div', { class: 'cel-badge', 'aria-hidden': 'true' },
      h('i', { class: 'cel-rays' }), h('i', { class: 'cel-glow' }), sparks,
      h('img', { src: c.badge, alt: '' }),
      c.count ? h('span', { class: 'ach-n' }, String(c.count)) : null),
    h('small', { class: 'cel-kicker' }, c.kicker),
    h('h3', {}, c.title),
    c.tier ? h('span', { class: 'cel-tier' }, c.tier) : null,
    h('p', {}, c.text),
    c.extra ? h('p', { class: 'cel-extra' }, c.extra) : null,
    h('button', { class: 'big-btn', onclick: close }, t('celebrate.ok')));
  const scrim = h('div', { class: 'dialog-scrim cel-scrim', onclick: close }, card);
  ($('#drawer').parentElement ?? document.body).append(scrim);
  document.addEventListener('keydown', onKey, true);
}

/** Un traguardo raggiunto: il suo medaglione, del suo grado. */
export function celebrateAchievement(a: AchievementDef) {
  celebrate({
    kicker: t('celebrate.ach.kicker'), title: a.name, text: a.description,
    badge: lpBadgeUrl(ACH_ICONS[a.id] ?? 'trophy', a.tier), count: ACH_COUNT[a.id], tier: t(`player.tier.${a.tier}`),
  });
}

/** Il medaglione dei ranghi: bronzo il 2, argento il 3, oro dal 4. */
const RANK_TIER = (level: number): BadgeTier => (level >= 4 ? 'gold' : level === 3 ? 'silver' : 'bronze');

/** Un nuovo rango: il nome, e cosa si sblocca (oggetti della Bottega e lapidi di quel rango). */
export function celebrateRank(level: number) {
  const rank = RANKS.find((r) => r.level === level);
  if (!rank) return;
  const items = CATALOG_LIST.filter((d) => d.minRank === level && !d.permanent && d.cost > 0).length;
  const stones = Object.values(GRAVE_TYPE_MIN_RANK).filter((r) => r === level).length;
  const parts = [items ? t('celebrate.rank.items', { n: items }) : '', stones ? t('celebrate.rank.stones', { n: stones }) : ''].filter(Boolean);
  celebrate({
    kicker: t('celebrate.rank.kicker'), title: rank.name, text: t('celebrate.rank.text', { n: level }),
    extra: parts.length ? t('celebrate.rank.unlocks', { what: parts.join(t('celebrate.rank.and')) }) : undefined,
    badge: lpBadgeUrl('rank', RANK_TIER(level)), count: level,
  });
}
