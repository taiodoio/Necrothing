// Notifica dei personaggi: quando il Custode incontra un corvo, uno zombie,
// un fantasma… in alto, sotto l'HUD, compare una striscia col ritratto del
// personaggio (che esce dal bordo come quello del Custode), il suo verso e
// cosa è successo. Si chiude con la X o sparisce da sola. Una alla volta: la
// successiva aspetta che la precedente sia rimasta in vista almeno un attimo.

import type { CharacterKind } from '../view/characters.ts';
import { hasT, t, tList } from '../i18n/index.ts';
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
  /** Il verso o la battuta, se non quello a caso del personaggio (il Custode dice cose diverse a seconda di cosa fa). */
  say?: string;
  /** Il ritratto, se non quello del modello (il Custode col suo aspetto). */
  img?: string;
  /** `img` è un'icona (anniversario): centrata, invece che appoggiata in basso. */
  icon?: boolean;
  /** Un pulsante (es. «Vedi il ricordo»): la notifica resta un po' di più. */
  action?: { label: string; run: () => void };
}

/** I versi, scelti a caso tra due o tre perché non stanchino (note.verse.<personaggio>). */
const verse = (k: CharacterKind) => {
  const v = tList(hasT(`note.verse.${k}`) ? `note.verse.${k}` : 'note.verse.default');
  return v[Math.floor(Math.random() * v.length)];
};

const SHOW_MS = 5000;
/** Con un pulsante c'è il tempo di toccarlo. */
const ACTION_MS = 8000;
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
  const gain = (v: number, xp: boolean) => h('span', { class: `gain${xp ? ' xp' : ''}` }, xp ? null : icon('wisp', 12), xp ? t('note.gainXp', { v }) : `+${v}`);
  const say = h('b', { class: 'say' }, ...[...(n.say ?? verse(n.kind))].map((c, i) => h('span', { style: `animation-delay:${(i * 0.06).toFixed(2)}s` }, c === ' ' ? ' ' : c)));
  const url = n.img ?? npcPortrait(n.kind);
  const img = url ? h('img', { alt: '' }) as HTMLImageElement : null;
  if (img) void restingOnFloor(url).then((u) => { img.src = u; });
  const ms = n.action ? ACTION_MS : SHOW_MS;
  const el = h('div', { class: `npc-note${n.action ? ' with-action' : ''}${n.icon ? ' icon' : ''}`, role: 'status' },
    img,
    // il guadagno accanto al nome: la frase resta su una riga quando può
    h('div', { class: 'npc-note-head' }, say, h('small', {}, n.name), n.wisps ? gain(n.wisps, false) : null, n.xp ? gain(n.xp, true) : null),
    h('p', {}, n.text),
    n.action ? h('button', { class: 'npc-note-cta', onclick: () => { const a = n.action!; dismiss(); a.run(); } }, n.action.label, ' ›') : null,
    h('button', { class: 'npc-note-x', 'aria-label': t('dialog.close'), onclick: () => dismiss() }, icon('close', 14)));
  $('#game').append(el);
  // i toast scendono sotto la notifica, quanto è alta (con la frase su due righe o il pulsante è più alta)
  $('#game').style.setProperty('--note-h', `${el.offsetHeight}px`);
  $('#game').classList.add('has-note');
  current = { el, at: performance.now(), timer: window.setTimeout(() => dismiss(), ms) };
}

/**
 * Il ritratto appoggiato in basso: ogni modello ha sotto un margine
 * trasparente diverso, e nella notifica sembrerebbe sospeso. Qui la figura
 * scende fino al bordo inferiore e si centra in orizzontale, senza cambiare
 * di grandezza (così tutti hanno lo stesso ingrandimento).
 */
const trimmed = new Map<string, Promise<string>>();
function restingOnFloor(url: string): Promise<string> {
  let p = trimmed.get(url);
  if (p) return p;
  p = new Promise<string>((resolve) => {
    const im = new Image();
    im.onload = () => {
      try {
        const w = im.naturalWidth, hh = im.naturalHeight;
        const c = document.createElement('canvas'); c.width = w; c.height = hh;
        const g = c.getContext('2d')!;
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, w, hh).data;
        let x0 = w, x1 = -1, y1 = -1;
        for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
          if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > y1) y1 = y; }
        }
        if (x1 < 0) { resolve(url); return; }
        const out = document.createElement('canvas'); out.width = w; out.height = hh;
        out.getContext('2d')!.drawImage(c, Math.round((w - (x1 - x0 + 1)) / 2 - x0), hh - 1 - y1);
        resolve(out.toDataURL('image/png'));
      } catch { resolve(url); }
    };
    im.onerror = () => resolve(url);
    im.src = url;
  });
  trimmed.set(url, p);
  return p;
}
