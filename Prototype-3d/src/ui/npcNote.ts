// Notifica dei personaggi: quando il Custode incontra un corvo, uno zombie,
// un fantasma… in alto, sotto l'HUD, compare una striscia col ritratto del
// personaggio (che esce dal bordo come quello del Custode), il suo verso e
// cosa è successo. Si chiude con la X o sparisce da sola. Una alla volta: la
// successiva aspetta che la precedente sia rimasta in vista almeno un attimo.

import type { CharacterKind } from '../view/characters.ts';
import { $, h } from './dom.ts';
import { icon } from './icons.ts';
import { npcPortrait } from './npcPortraits.ts';

export interface NpcNote {
  kind: CharacterKind;
  /** Chi è (Corvo, Zombie, il nome dell'animale…). */
  name: string;
  text: string;
  wisps?: number;
  xp?: number;
}

/** I versi, scelti a caso tra due o tre perché non stanchino. */
const VERSES: Partial<Record<CharacterKind, string[]>> = {
  crow: ['Cra! Cra!', 'Craaa!'],
  petCrow: ['Cra!', 'Cra cra?'],
  cat: ['Miao!', 'Mrrr-miao!', 'Purr…'],
  petCat: ['Miao!', 'Purr…'],
  rat: ['Squit!', 'Squit squit!'],
  zombie: ['Grrraaah!', 'Uuurgh…', 'Brrrainz…'],
  ghost: ['Uuuuh…', 'Bu!', 'Ooooh…'],
  ghostRare: ['Uuuuh…', 'Ooooh…'],
  priest: ['Amen.', 'Pace a voi!'],
  gravedigger: ['Ehm…', 'Mmh, mmh.', 'Al lavoro!'],
  vampire: ['Slurp!', 'Gnam!'],
  petDog: ['Bau!', 'Bau bau!'],
  petRabbit: ['Snif snif!', 'Hop!'],
  petDuck: ['Qua qua!', 'Quaaa!'],
};
const verse = (k: CharacterKind) => { const v = VERSES[k] ?? ['…']; return v[Math.floor(Math.random() * v.length)]; };

const SHOW_MS = 5000;
/** Una notifica resta in vista almeno così prima che la successiva la sostituisca. */
const MIN_MS = 1000;

let current: { el: HTMLElement; at: number; timer: number } | null = null;
let waiting = 0;
const queue: NpcNote[] = [];

export function npcNote(n: NpcNote) {
  queue.push(n);
  if (queue.length > 3) queue.shift(); // una raffica (la campana delle anime): solo le ultime
  pump();
}

function pump() {
  if (!queue.length || waiting) return;
  if (current) {
    const left = MIN_MS - (performance.now() - current.at);
    if (left > 0) { waiting = window.setTimeout(() => { waiting = 0; pump(); }, left); return; }
    dismiss(false);
  }
  show(queue.shift()!);
}

function dismiss(next = true) {
  if (!current) return;
  clearTimeout(current.timer);
  const el = current.el;
  current = null;
  if (!next || !queue.length) $('#game').classList.remove('has-note');
  el.classList.add('out');
  setTimeout(() => el.remove(), 220);
  if (next) pump();
}

function show(n: NpcNote) {
  const gain = (v: number, xp: boolean) => h('span', { class: `gain${xp ? ' xp' : ''}` }, xp ? null : icon('wisp', 12), `+${v}${xp ? ' XP' : ''}`);
  const say = h('b', { class: 'say' }, ...[...verse(n.kind)].map((c, i) => h('span', { style: `animation-delay:${(i * 0.06).toFixed(2)}s` }, c === ' ' ? ' ' : c)));
  const url = npcPortrait(n.kind);
  const el = h('div', { class: 'npc-note', role: 'status' },
    url ? h('img', { src: url, alt: '' }) : null,
    // il guadagno accanto al nome: la frase resta su una riga quando può
    h('div', { class: 'npc-note-head' }, say, h('small', {}, n.name), n.wisps ? gain(n.wisps, false) : null, n.xp ? gain(n.xp, true) : null),
    h('p', {}, n.text),
    h('button', { class: 'npc-note-x', 'aria-label': 'Chiudi', onclick: () => dismiss() }, icon('close', 14)),
    h('i', { class: 'npc-note-time', style: `animation-duration:${SHOW_MS}ms` }));
  $('#game').append(el);
  $('#game').classList.add('has-note'); // i toast scendono sotto la notifica
  current = { el, at: performance.now(), timer: window.setTimeout(() => dismiss(), SHOW_MS) };
}
