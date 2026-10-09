// Micro-helper DOM (niente framework): creazione elementi, toast, numeri
// fluttuanti, drawer dal basso.

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
    else (el as unknown as Record<string, unknown>)[k] = v;
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

export function toast(message: string, kind: '' | 'ach' = '') {
  if (!message) return;
  const box = $('#toasts');
  const el = h('div', { class: `toast ${kind}` }, kind === 'ach' ? icon('trophy', 18) : null, message);
  box.append(el);
  while (box.children.length > 3) box.firstElementChild?.remove();
  setTimeout(() => el.remove(), 3900);
}

export function floater(x: number, y: number, text: string, kind: 'wisp' | 'xp') {
  const el = h('div', { class: `floater ${kind}`, style: `left:${x}px;top:${y}px` }, text, kind === 'wisp' ? icon('wisp', 14) : null);
  $('#floaters').append(el);
  setTimeout(() => el.remove(), 1400);
}

// ── Drawer ─────────────────────────────────────────────────────────────

let onCloseCb: (() => void) | null = null;

export function openDrawer(title: string, body: Node, opts: { footer?: Node; onClose?: () => void } = {}) {
  const drawer = $('#drawer');
  $('#drawer-title').textContent = title;
  const b = $('#drawer-body');
  b.replaceChildren(body);
  b.scrollTop = 0;
  const f = $('#drawer-foot');
  if (opts.footer) { f.hidden = false; f.replaceChildren(opts.footer); } else { f.hidden = true; f.replaceChildren(); }
  onCloseCb = opts.onClose ?? null;
  drawer.hidden = false;
  $('#scrim').hidden = false;
  document.body.classList.add('drawer-open');
  $('#bubble').classList.add('hidden');
}

export function setDrawerFooter(node: Node | null) {
  const f = $('#drawer-foot');
  if (node) { f.hidden = false; f.replaceChildren(node); } else { f.hidden = true; f.replaceChildren(); }
}

export function setDrawerBody(node: Node) {
  $('#drawer-body').replaceChildren(node);
}

export function drawerOpen(): boolean {
  return !$('#drawer').hidden;
}

export function closeDrawer() {
  if ($('#drawer').hidden) return;
  $('#drawer').hidden = true;
  $('#scrim').hidden = true;
  document.body.classList.remove('drawer-open');
  $('#bubble').classList.remove('hidden');
  const cb = onCloseCb;
  onCloseCb = null;
  cb?.();
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}
