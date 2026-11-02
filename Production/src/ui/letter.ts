// Le lettere dell'ufficio postale, sulla stessa pergamena dell'intro: sopra il
// gioco scurito e in pausa, il foglio arriva piegato in quattro e si apre (in
// qualità bassa sale e compare). Si scrive sul foglio; «Spedisci» lo richiude
// con l'animazione al contrario e lo porta via, poi «Spedita!». La lettera che
// torna si legge allo stesso modo: «Chiudi» (non torna più) o «Rispedisci».

import { POST } from '../game/balance.ts';
import type { Letter } from '../game/state.ts';
import { t } from '../i18n/index.ts';
import { fmtDate, h, setUiBlocking } from './dom.ts';
import type { UI } from './UI.ts';

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Sheet { layer: HTMLElement; content: HTMLElement; stage: HTMLElement; sheet: HTMLElement; fold: HTMLElement }

/** Il foglio piegato in quattro e la pergamena aperta (stessa struttura della lettera dell'intro). */
function buildSheet(ui: UI, body: HTMLElement, actions: HTMLElement): Sheet {
  const q = (c: string) => h('i', { class: `ob-q ${c}` });
  const fold = h('div', { class: 'ob-fold', 'aria-hidden': 'true' }, h('div', { class: 'ob-fy' }, h('div', { class: 'ob-fx' },
    h('div', { class: 'ob-half top' }, q('tl'), q('tr flap')),
    h('div', { class: 'ob-half bottom' }, q('bl'), q('br flap')))));
  const sheet = h('div', { class: 'ob-sheet' }, h('div', { class: 'ob-sheet-scroll', tabindex: '0' }, body));
  const stage = h('div', { class: 'ob-stage' }, h('div', { class: 'ob-light', 'aria-hidden': 'true' }), h('div', { class: 'ob-shade', 'aria-hidden': 'true' }), fold, sheet);
  const content = h('div', { class: 'ob-content ob-letter-layer mail-letter playing' }, stage, actions);
  const layer = h('div', { class: `ob-layer mail-layer q-${ui.game.uiQuality()}`, role: 'dialog', 'aria-modal': 'true' }, content);
  document.body.append(layer);
  setUiBlocking(true); // il gioco sotto si ferma
  return { layer, content, stage, sheet, fold };
}

/** Arriva piegata e si apre (un tocco la apre subito); `opened` quando è aperta. */
function arrive(sh: Sheet, opened: () => void) {
  let done = false;
  const open = () => { if (done) return; done = true; sh.stage.classList.add('open'); sh.content.classList.remove('playing'); opened(); };
  if (reducedMotion()) { open(); return; }
  sh.stage.classList.add('play');
  sh.sheet.addEventListener('animationend', (e) => { if (e.target === sh.sheet) open(); });
  sh.stage.addEventListener('pointerdown', open, { once: true });
}

/** Va via: piegata al contrario e portata giù (`fold`), o solo sfumando; poi il gioco riparte. */
function leave(sh: Sheet, how: 'fold' | 'fade', then?: () => void) {
  const end = () => { sh.layer.remove(); setUiBlocking(false); then?.(); };
  sh.content.classList.add('playing');
  if (reducedMotion()) { end(); return; }
  if (how === 'fade') { sh.layer.classList.add('out'); window.setTimeout(end, 300); return; }
  sh.stage.classList.remove('open', 'play');
  void sh.stage.offsetWidth;
  sh.stage.classList.add('close');
  // finita la piega (o, in bassa qualità, la discesa del foglio)
  const target = sh.layer.classList.contains('q-low') ? sh.sheet : sh.fold;
  let gone = false;
  const finish = () => { if (gone) return; gone = true; sh.layer.classList.add('out'); window.setTimeout(end, 260); };
  target.addEventListener('animationend', (e) => { if (e.target === target) finish(); });
  window.setTimeout(finish, 4000); // in ogni caso
}

/** Scrivere una lettera all'ufficio postale. */
export function openLetterWrite(ui: UI) {
  const area = h('textarea', { class: 'mail-text', maxlength: String(POST.maxLength), rows: '12', placeholder: t('post.write.placeholder'), 'aria-label': t('post.write.title') }) as HTMLTextAreaElement;
  const count = h('small', { class: 'mail-count' }, `0/${POST.maxLength}`);
  const body = h('div', { class: 'ob-letter mail-body' }, h('h2', {}, t('post.write.title')), area, count);
  const send = h('button', { class: 'big-btn', disabled: true, onclick: () => {
    const text = area.value.trim();
    if (!text) return;
    if (!ui.game.sendLetter(text)) return;
    area.blur();
    leave(sh, 'fold', () => ui.letterSent());
  } }, t('post.write.send')) as HTMLButtonElement;
  const cancel = h('button', { class: 'big-btn ghost', onclick: () => leave(sh, 'fade') }, t('dialog.cancel'));
  const sh = buildSheet(ui, body, h('div', { class: 'row mail-actions' }, cancel, send));
  area.addEventListener('input', () => { count.textContent = `${area.value.length}/${POST.maxLength}`; send.disabled = !area.value.trim(); });
  arrive(sh, () => area.focus({ preventScroll: true }));
}

/** Leggere la lettera tornata nella buca: «Chiudi» (non torna più) o «Rispedisci». */
export function openLetterRead(ui: UI, letter: Letter) {
  const stamp = h('i', { class: 'ob-stamp stamped', 'aria-hidden': 'true' });
  const body = h('div', { class: 'ob-letter mail-body' },
    h('h2', {}, t('post.read.title')),
    h('p', { class: 'mail-date' }, t('post.read.sent', { date: fmtDate(letter.sentAt) })),
    h('p', { class: 'mail-read' }, letter.text),
    h('p', { class: 'ob-sign' }, t('post.read.sign')),
    stamp);
  const close = h('button', { class: 'big-btn ghost', onclick: () => { ui.game.closeLetter(); leave(sh, 'fade'); } }, t('dialog.close'));
  const again = h('button', { class: 'big-btn', onclick: () => { ui.game.resendLetter(); leave(sh, 'fold'); } }, t('post.read.resend'));
  const sh = buildSheet(ui, body, h('div', { class: 'row mail-actions' }, close, again));
  arrive(sh, () => undefined);
}
