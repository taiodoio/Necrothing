// L'anello dorato della pressione lunga: compare sotto il dito quando si tiene premuto su
// qualcosa che si può prendere (o dove si può cominciare a disegnare), si riempie fino ai
// 350 ms e, quando prende, scatta, si illumina e svanisce. Grande abbastanza da vedersi
// attorno al polpastrello. Qui andrà anche il feedback aptico.

import { LONG_PRESS_MS } from '../app/Input.ts';

/** Prima di questo l'anello non si vede: un tocco normale non lo fa lampeggiare. */
const SHOW_AFTER_MS = 120;

export class PressRing {
  private readonly el: HTMLElement;
  private hideTimer = 0;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'press-ring';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.style.setProperty('--delay', `${SHOW_AFTER_MS}ms`);
    this.el.style.setProperty('--fill', `${LONG_PRESS_MS - SHOW_AFTER_MS}ms`);
    parent.append(this.el);
  }

  /** Il dito è giù su qualcosa che si può prendere: l'anello comincia a riempirsi. */
  start(x: number, y: number) {
    window.clearTimeout(this.hideTimer);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.className = 'press-ring';
    void this.el.offsetWidth; // riparte l'animazione
    this.el.classList.add('on');
  }

  /** Preso: scatta e svanisce. */
  fire() {
    if (!this.el.classList.contains('on')) return;
    this.el.classList.add('fire');
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => { this.el.className = 'press-ring'; }, 360);
  }

  /** Il dito si è mosso o alzato prima: via subito. */
  cancel() {
    if (this.el.classList.contains('fire')) return; // lo scatto finisce da sé
    window.clearTimeout(this.hideTimer);
    this.el.className = 'press-ring';
  }
}
