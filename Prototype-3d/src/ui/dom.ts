// Micro-helper DOM (niente framework): creazione elementi, toast, numeri
// fluttuanti, drawer dal basso, dialogo di conferma nello stile del gioco.

import { currentLang, t } from '../i18n/index.ts';
import { icon } from './icons.ts';

type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else if (v === true) el.setAttribute(k, '');
    // data-* e aria-* sono attributi, non proprietà: altrimenti i selettori come [data-settings] non li trovano
    else if (k.startsWith('data-') || k.startsWith('aria-')) el.setAttribute(k, String(v));
    else (el as unknown as Record<string, unknown>)[k] = v;
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

/** Pezzi di una riga uniti col separatore della lingua («a · b · c»); i vuoti si saltano. */
export const joinDot = (parts: string[]): string => parts.filter(Boolean).reduce((a, b) => (a ? t('hud.join', { a, b }) : b), '');

/**
 * I testi fissi della pagina (index.html, bench.html) nella lingua scelta:
 * data-i18n per il testo, data-i18n-aria per aria-label, data-i18n-title per
 * title, data-i18n-content per le meta. Nell'HTML resta l'italiano come segnaposto.
 */
export function applyPageTexts() {
  document.documentElement.lang = currentLang();
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) el.textContent = t(el.dataset.i18n!);
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria!));
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle!);
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-content]')) el.setAttribute('content', t(el.dataset.i18nContent!));
}

export function toast(message: string, kind: '' | 'ach' = '') {
  if (!message) return;
  // se lo dice già una notifica dei personaggi (in vista o in coda), il toast non serve
  if (saidInNote(message)) return;
  const box = $('#toasts');
  const el = h('div', { class: `toast ${kind}` }, kind === 'ach' ? icon('trophy', 18) : null, message);
  box.append(el);
  while (box.children.length > 3) box.firstElementChild?.remove();
  setTimeout(() => el.remove(), 3900);
}

/** Una notifica dei personaggi dice già `message` (vedi npcNote). */
let saidInNote: (message: string) => boolean = () => false;
export function setNoteCheck(fn: (message: string) => boolean) { saidInNote = fn; }

/** Via i toast che ripetono `message` (la notifica che arriva lo dice già). */
export function dropToasts(message: string) {
  for (const el of document.querySelectorAll('#toasts .toast')) if (el.textContent === message) el.remove();
}

export function floater(x: number, y: number, text: string, kind: 'wisp' | 'xp') {
  const el = h('div', { class: `floater ${kind}`, style: `left:${x}px;top:${y}px` }, text, kind === 'wisp' ? icon('wisp', 14) : null);
  $('#floaters').append(el);
  setTimeout(() => el.remove(), 1400);
}

// ── Drawer ─────────────────────────────────────────────────────────────

let onCloseCb: (() => void) | null = null;
/** Se presente e restituisce (o promette) false, la chiusura (X, sfondo, Esc) viene annullata. */
let beforeCloseCb: (() => boolean | Promise<boolean>) | null = null;

/**
 * Apre il pannello (nell'interfaccia nuova una finestra sopra la scena); con
 * `title` vuoto la testata resta solo la X (quando il nome è già nel
 * contenuto). `full`: elenchi e schermate lunghe, alti quasi tutto lo
 * schermo (con la testata animata lo sono sempre); gli altri si adattano al
 * contenuto, al centro.
 */
export function openDrawer(title: string, body: Node, opts: { footer?: Node; onClose?: () => void; beforeClose?: () => boolean | Promise<boolean>; full?: boolean } = {}) {
  const drawer = $('#drawer');
  dropHero();
  dropOverlays();
  drawer.classList.toggle('full', !!opts.full);
  $('#drawer-title').textContent = title;
  drawer.classList.toggle('no-title', !title);
  $('#drawer-extra').replaceChildren();
  const b = $('#drawer-body');
  b.replaceChildren(body);
  b.scrollTop = 0;
  const f = $('#drawer-foot');
  if (opts.footer) { f.hidden = false; f.replaceChildren(opts.footer); } else { f.hidden = true; f.replaceChildren(); }
  onCloseCb = opts.onClose ?? null;
  beforeCloseCb = opts.beforeClose ?? null;
  drawer.hidden = false;
  $('#scrim').hidden = false;
  document.body.classList.add('drawer-open');
  $('#bubble').classList.add('hidden');
}

export function setDrawerFooter(node: Node | null) {
  const f = $('#drawer-foot');
  if (node) { f.hidden = false; f.replaceChildren(node); } else { f.hidden = true; f.replaceChildren(); }
}

/** Qualcosa accanto al titolo del drawer (il saldo in Bottega); null lo toglie. */
export function setDrawerExtra(node: Node | null) {
  $('#drawer-extra').replaceChildren(...(node ? [node] : []));
}

/** Il saldo dei fuochi fatui, come pastiglia. */
export function wispPill(n: number): HTMLElement {
  return h('span', { class: 'wisp-pill', 'aria-label': t('hud.wispsAria', { n }) }, icon('wisp', 16), n.toLocaleString(currentLang()));
}

/** Immagine in testa al drawer (la Bottega animata): resta finché non si apre un altro pannello. */
export function setDrawerHero(el: HTMLElement) {
  dropHero();
  const drawer = $('#drawer');
  drawer.prepend(el);
  drawer.classList.add('with-hero');
}

/** Via quello che un pannello ha aperto sopra di sé (il cartellino girato dell'albero). */
function dropOverlays() {
  for (const el of $('#drawer').querySelectorAll(':scope > .drawer-overlay')) el.remove();
}

function dropHero() {
  const drawer = $('#drawer');
  drawer.querySelector(':scope > .drawer-hero')?.remove(); // uscendo dal documento la testata si ferma da sola
  drawer.classList.remove('with-hero');
}

export function setDrawerBody(node: Node) {
  $('#drawer-body').replaceChildren(node);
}

export function drawerOpen(): boolean {
  return !$('#drawer').hidden;
}

/** Chiude il drawer; `force` salta la conferma (es. dopo aver salvato). */
export function closeDrawer(force = false) {
  if ($('#drawer').hidden || (!force && dialogOpen)) return;
  if (!force && beforeCloseCb) {
    const ok = beforeCloseCb();
    if (ok instanceof Promise) { void ok.then((yes) => { if (yes) closeDrawer(true); }); return; }
    if (!ok) return;
  }
  beforeCloseCb = null;
  dropHero();
  dropOverlays();
  $('#drawer').hidden = true;
  $('#scrim').hidden = true;
  document.body.classList.remove('drawer-open');
  $('#bubble').classList.remove('hidden');
  const cb = onCloseCb;
  onCloseCb = null;
  cb?.();
}

// ── Dialogo di conferma ────────────────────────────────────────────────

let dialogOpen = 0;

/**
 * Conferma nello stile del gioco (al posto di `confirm()` del browser): cornice
 * dorata, titolo gotico, due pulsanti. Risponde true solo con il pulsante di
 * conferma (nessuno è preselezionato); sfondo, Esc e «Annulla» rispondono false.
 */
export function confirmDialog(opts: { title: string; message: string; ok?: string; cancel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    dialogOpen++;
    const done = (yes: boolean) => {
      dialogOpen--;
      document.removeEventListener('keydown', onKey, true);
      scrim.remove();
      resolve(yes);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(false); } };
    const okBtn = h('button', { class: `big-btn${opts.danger ? ' danger' : ''}`, onclick: () => done(true) }, opts.ok ?? t('dialog.ok'));
    const box = h('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', onclick: (e: Event) => e.stopPropagation() },
      h('h3', {}, opts.title),
      h('p', {}, opts.message),
      h('div', { class: 'row' }, h('button', { class: 'big-btn ghost', onclick: () => done(false) }, opts.cancel ?? t('dialog.cancel')), okBtn));
    const scrim = h('div', { class: 'dialog-scrim', onclick: () => done(false) }, box);
    ($('#drawer').parentElement ?? document.body).append(scrim);
    document.addEventListener('keydown', onKey, true);
  });
}

// ── Modale ────────────────────────────────────────────────────────────

export interface Modal {
  /** Cambia il contenuto (es. dopo l'acquisto). */
  set: (node: Node) => void;
  /** Chiude; `quiet` salta onClose (quando si chiude anche il drawer). */
  close: (quiet?: boolean) => void;
}

/**
 * Finestra al centro dello schermo, sopra il drawer, con lo sfondo scurito:
 * la usa la Bottega per l'acquisto. Sfondo ed Esc la chiudono.
 */
export function openModal(content: Node, opts: { onClose?: () => void; label?: string } = {}): Modal {
  dialogOpen++;
  let open = true;
  const close = (quiet = false) => {
    if (!open) return;
    open = false;
    dialogOpen--;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove();
    if (!quiet) opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
  // la X in alto a sinistra, come nei pannelli; il contenuto si cambia senza toccarla
  const body = h('div', { class: 'modal-body' }, content);
  const x = h('button', { class: 'icon-btn small modal-close', 'aria-label': t('dialog.close'), onclick: () => close() }, icon('close', 22));
  const box = h('div', { class: 'dialog modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label, onclick: (e: Event) => e.stopPropagation() }, x, body);
  const scrim = h('div', { class: 'dialog-scrim modal-scrim', onclick: () => close() }, box);
  ($('#drawer').parentElement ?? document.body).append(scrim);
  document.addEventListener('keydown', onKey, true);
  return { set: (node) => body.replaceChildren(node), close };
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString(currentLang(), { day: 'numeric', month: 'short', year: 'numeric' });
}
