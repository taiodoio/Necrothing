// Il primo ingresso, sopra la scena: la pergamena che si srotola, il nome,
// quattro schede d'introduzione con la voce del Custode, il tutorial con
// azioni vere (un consiglio alla volta e un segno su cosa toccare) e il giro
// dell'interfaccia (un riquadro illuminato alla volta). Lo stato è nel
// salvataggio (game/onboarding.ts): si riprende da dove ci si era fermati.
// Dalle Impostazioni lo si rivede con uno stato a parte, che non si salva:
// la partita non cambia (le azioni vere danno le loro ricompense, come sempre).

import type * as THREE from 'three';
import { scheduleSave } from '../app/persistence.ts';
import { checkName, NAME_MAX } from '../game/playerName.ts';
import { currentStep, newOnboarding, tutorialSignal, TUTORIAL_STEPS, type OnboardingStage, type OnboardingState, type TutorialSignal, type TutorialStep } from '../game/onboarding.ts';
import { t, tList } from '../i18n/index.ts';
import { cellCenter } from '../view/WorldView.ts';
import { $, closeDrawer, drawerOpen, h, setUiBlocking } from './dom.ts';
import { lpIconPng } from './lpIcons.ts';
import { npcPortrait } from './npcPortraits.ts';
import { parchment } from './parchment.ts';
import type { UI } from './UI.ts';

let active: Onboarding | null = null;
/** Qualcosa è successo nel gioco (raccolto un fuoco fatuo, aperta una tomba…): il tutorial ascolta. */
export const signalOnboarding = (s: TutorialSignal) => active?.signal(s);

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Le schede dell'introduzione: icona del gioco e chiave del testo. */
const INTRO: Array<[string, number]> = [['wisp', 1], ['flower', 2], ['ghost', 3], ['coffin', 4]];
/** Il pulsante del menù dell'oggetto che fa ciascun passo. */
const CTX_ACT: Partial<Record<TutorialStep, string>> = { visit: 'detail', light: 'light', clean: 'clean' };

interface TourStop { key: string; rect: () => DOMRect | null; before?: () => void }

export class Onboarding {
  private readonly ui: UI;
  /** Rivedendo dalle Impostazioni: uno stato a parte, mai salvato. */
  private replaying: OnboardingState | null = null;
  private layer: HTMLElement | null = null;
  private coach: HTMLElement | null = null;
  private marker: HTMLElement | null = null;
  private markerAt: (() => THREE.Vector3 | null) | null = null;
  /** Il pulsante del menù sopra l'oggetto che fa il passo (quando l'oggetto è selezionato, il segno passa lì). */
  private ctxAct: string | null = null;
  private ctxGlow: HTMLElement | null = null;
  private glow: HTMLElement | null = null;
  private waitTimer = 0;

  constructor(ui: UI) {
    this.ui = ui;
    active = this;
  }

  private get game() { return this.ui.game; }
  private get o(): OnboardingState { return this.replaying ?? this.game.state.onboarding; }
  /** In corso (anche il tutorial, che non copre la scena). */
  get running(): boolean { return this.o.stage !== 'done'; }

  private save() { if (!this.replaying) scheduleSave(this.game.state); }

  /** All'avvio (dopo la schermata iniziale): riprende dalla fase salvata. */
  resume() {
    switch (this.o.stage) {
      case 'welcome': this.showLetter(); break;
      case 'name': this.showName(); break;
      case 'intro': this.showIntro(); break;
      case 'tutorial': this.startTutorial(); break;
      case 'tour': this.showTour(); break;
      case 'done': break;
    }
  }

  /** Dalle Impostazioni: tutto da capo, senza toccare la partita. */
  replay() {
    closeDrawer(true);
    this.cleanup();
    this.replaying = newOnboarding();
    this.resume();
  }

  private go(stage: OnboardingStage) {
    this.cleanup();
    this.o.stage = stage;
    this.o.step = 0;
    if (stage === 'done') {
      if (this.replaying) this.replaying = null;
      else this.game.state.settings.shopTutorialDone = true;
    }
    this.save();
    this.resume();
  }

  private cleanup() {
    this.layer?.remove(); this.layer = null;
    this.coach?.remove(); this.coach = null; $('#game').classList.remove('has-coach');
    this.clearMarks();
    window.clearInterval(this.waitTimer);
    setUiBlocking(false);
  }

  /** Un livello sopra tutta la scena, col fondo scurito (la scena sotto si ferma). */
  private openLayer(cls: string, ...kids: Array<Node | null>): HTMLElement {
    this.layer?.remove();
    const layer = h('div', { class: `ob-layer ${cls}`, role: 'dialog', 'aria-modal': 'true' }, ...kids);
    document.body.append(layer);
    this.layer = layer;
    setUiBlocking(true);
    return layer;
  }

  // ── La pergamena ─────────────────────────────────────────────────────

  private showLetter() {
    const text = h('div', { class: 'ob-letter' },
      h('h2', {}, t('onboarding.letter.title')),
      ...tList('onboarding.letter.body').map((p) => h('p', {}, p)),
      h('p', { class: 'ob-closing' }, t('onboarding.letter.closing')),
      h('p', { class: 'ob-sign' }, t('onboarding.letter.sign')));
    const paper = parchment('ob-paper', text);
    const scroll = h('div', { class: 'ob-scroll', 'aria-label': t('onboarding.letter.aria') }, h('div', { class: 'ob-roll top' }), paper, h('div', { class: 'ob-roll bottom' }));
    const next = () => this.go('name');
    this.openLayer('ob-letter-layer',
      h('button', { class: 'ob-skip', onclick: next }, t('onboarding.skip')),
      scroll,
      h('button', { class: 'big-btn ob-continue', onclick: next }, t('onboarding.continue')));
    // la carta è già della sua misura (la pergamena si disegna una volta sola): si srotola scoprendola
    const open = () => scroll.classList.add('open');
    if (reducedMotion()) { open(); return; }
    requestAnimationFrame(() => {
      scroll.style.setProperty('--ob-h', `${paper.offsetHeight}px`);
      scroll.classList.add('unroll');
    });
    scroll.addEventListener('animationend', open, { once: true });
    // un tocco durante l'animazione la salta
    scroll.addEventListener('pointerdown', open, { once: true });
  }

  // ── Il nome ──────────────────────────────────────────────────────────

  private showName() {
    const s = this.game.state;
    const fallback = t('state.player.defaultName');
    const input = h('input', { class: 'ob-input', value: s.player.name === fallback ? '' : s.player.name, maxLength: NAME_MAX * 2, placeholder: fallback, autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', 'aria-label': t('onboarding.name.label') }) as HTMLInputElement;
    const err = h('p', { class: 'ob-error', role: 'alert' });
    const confirm = () => {
      const r = checkName(input.value);
      if (!r.ok) { err.textContent = t(`onboarding.name.error.${r.error}`, { n: NAME_MAX }); input.focus(); return; }
      s.player.name = r.name;
      scheduleSave(s);
      this.ui.refreshHud();
      this.go('intro');
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } });
    input.addEventListener('input', () => { err.textContent = ''; });
    this.openLayer('ob-name-layer', h('div', { class: 'dialog modal ob-card' },
      h('img', { class: 'ob-portrait', src: npcPortrait('custode', s.player.look), alt: '' }),
      h('b', { class: 'ob-say' }, t('onboarding.name.say')),
      h('p', {}, t('onboarding.name.text')),
      h('label', { class: 'ob-field' }, h('span', {}, t('onboarding.name.label')), input),
      err,
      h('p', { class: 'muted ob-hint' }, t('onboarding.name.hint')),
      h('div', { class: 'row' },
        h('button', { class: 'big-btn ghost', onclick: () => this.go('intro') }, t('onboarding.skip')),
        h('button', { class: 'big-btn', onclick: confirm }, t('onboarding.name.ok')))));
    setTimeout(() => input.focus({ preventScroll: true }), 350);
  }

  // ── L'introduzione ───────────────────────────────────────────────────

  private showIntro(i = 0) {
    const [ic, n] = INTRO[i];
    const last = i === INTRO.length - 1;
    this.openLayer('ob-intro-layer', h('div', { class: 'dialog modal ob-card ob-intro' },
      h('img', { class: 'ob-icon', src: lpIconPng(ic, 128), alt: '' }),
      h('h3', {}, t(`onboarding.intro.${n}.title`, { name: this.game.state.player.name })),
      h('p', {}, t(`onboarding.intro.${n}.text`)),
      h('div', { class: 'ob-dots', 'aria-hidden': 'true' }, ...INTRO.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
      h('div', { class: 'row' },
        h('button', { class: 'big-btn ghost', onclick: () => this.go('tutorial') }, t('onboarding.skip')),
        h('button', { class: 'big-btn', onclick: () => (last ? this.go('tutorial') : this.showIntro(i + 1)) }, last ? t('onboarding.start') : t('onboarding.next')))));
  }

  // ── Il tutorial (azioni vere) ────────────────────────────────────────

  private startTutorial() {
    this.cleanup();
    this.game.recenter();
    this.showStep();
  }

  /** Il consiglio del passo in corso e il segno su cosa toccare; se non c'è niente da fare, il passo si salta. */
  private showStep() {
    const step = currentStep(this.o);
    if (!step) { this.waitThenTour(); return; }
    const target = this.targetOf(step);
    if (target === null) { this.o.step++; if (this.o.step >= TUTORIAL_STEPS.length) { this.go('tour'); return; } this.save(); this.showStep(); return; }
    this.coach?.remove();
    this.clearMarks();
    const n = this.o.step + 1;
    this.coach = h('div', { class: 'ob-coach', role: 'status', 'aria-live': 'polite' },
      h('img', { class: 'ob-coach-face', src: npcPortrait('custode', this.game.state.player.look), alt: '' }),
      h('div', { class: 'ob-coach-body' },
        h('p', {}, t(`onboarding.tutorial.${step}`)),
        h('div', { class: 'ob-coach-foot' },
          h('span', { class: 'ob-progress' }, t('onboarding.tutorial.progress', { n, total: TUTORIAL_STEPS.length })),
          h('button', { class: 'ob-link', onclick: () => this.go('tour') }, t('onboarding.tutorial.skip')))));
    document.body.append(this.coach);
    $('#game').classList.add('has-coach');
    $('#game').style.setProperty('--coach-h', `${this.coach.offsetHeight}px`); // i18n-ok: stile
    if (target instanceof HTMLElement) { this.glow = target; target.classList.add('ob-glow'); return; }
    // un segno sulla scena, che segue la camera
    this.marker = h('div', { class: 'ob-marker', 'aria-hidden': 'true' });
    document.body.append(this.marker);
    this.markerAt = target.at;
    this.ctxAct = CTX_ACT[step] ?? null;
    if (target.focus) target.focus();
  }

  /** Cosa toccare in ogni passo: un punto della scena (con dove guardare), un pulsante, o null (niente da fare: si salta). */
  private targetOf(step: TutorialStep): { at: () => THREE.Vector3 | null; focus?: () => void } | HTMLElement | null {
    const g = this.game, s = g.state;
    const entity = (id: string) => ({ at: () => g.world.entityTop(id), focus: () => g.focusEntity(id) });
    switch (step) {
      case 'wisp': {
        const a = g.actors.avatarCell();
        const w = [...s.world.looseWisps].sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
        if (!w) return null;
        const at = () => { const still = s.world.looseWisps.find((x) => x.id === w.id) ?? s.world.looseWisps[0]; return still ? cellCenter(still.x, still.y, [1, 1]).setY(1.1) : null; };
        return { at, focus: () => { const p = at(); if (p) g.focusPoint(p); } };
      }
      case 'visit': {
        const grave = s.graves.find((x) => x.id === 'story-dinner') ?? s.graves[0];
        return grave ? entity(grave.id) : null;
      }
      case 'light': {
        const lights = s.placeables.filter((p) => !p.broken && ['lantern', 'lamp_post', 'lantern_pole', 'lantern_stone', 'lamp_post_double', 'lamp_post_gothic'].includes(p.type));
        const story = s.graves.find((x) => x.id === 'story-gym');
        const near = story ? lights.sort((p, q) => Math.hypot(p.x - story.x, p.y - story.y) - Math.hypot(q.x - story.x, q.y - story.y))[0] : lights[0];
        return near ? entity(near.id) : null;
      }
      case 'clean': {
        const dirty = s.graves.filter((x) => !x.broken && (x.dirty || x.weeds));
        const grave = dirty.find((x) => x.id === 'story-gym') ?? dirty[0];
        return grave ? entity(grave.id) : null;
      }
      case 'bury': return document.getElementById('bury-fab');
    }
  }

  /** Il gioco segnala un'azione: se è quella del passo, si va avanti. */
  signal(sig: TutorialSignal) {
    if (!tutorialSignal(this.o, sig)) return;
    this.save();
    if (this.o.stage === 'tour') this.waitThenTour();
    else this.showStep();
  }

  /** Dopo l'ultimo passo (si è aperta la sepoltura): il giro parte quando il pannello è chiuso. */
  private waitThenTour() {
    this.coach?.remove(); this.coach = null; $('#game').classList.remove('has-coach');
    this.clearMarks();
    window.clearInterval(this.waitTimer);
    this.waitTimer = window.setInterval(() => {
      if (drawerOpen() || this.game.placement) return;
      window.clearInterval(this.waitTimer);
      this.o.stage = 'tour'; this.o.step = 0;
      this.save();
      this.showTour();
    }, 400);
  }

  private clearMarks() {
    this.marker?.remove(); this.marker = null; this.markerAt = null;
    this.glow?.classList.remove('ob-glow'); this.glow = null;
    this.ctxGlow?.classList.remove('ob-glow'); this.ctxGlow = null; this.ctxAct = null;
  }

  /** Ogni frame: il segno segue il suo punto (sparisce sotto un pannello, passa al pulsante giusto se c'è). */
  frame() {
    if (!this.marker || !this.markerAt) return;
    const btn = this.ctxAct ? document.querySelector<HTMLElement>(`#ctx:not([hidden]) [data-ctx="${this.ctxAct}"]`) : null;
    if (btn !== this.ctxGlow) { this.ctxGlow?.classList.remove('ob-glow'); this.ctxGlow = btn; btn?.classList.add('ob-glow'); }
    const at = btn ? null : this.markerAt();
    const p = at && !drawerOpen() ? this.game.project(at) : null;
    this.marker.style.visibility = p ? 'visible' : 'hidden';
    if (p) this.marker.style.transform = `translate(${p.x}px, ${p.y}px)`; // i18n-ok: stile
  }

  // ── Il giro dell'interfaccia ─────────────────────────────────────────

  private showTour(i = this.o.step) {
    const stops: TourStop[] = [
      { key: 'profile', rect: () => $('#player-chip').getBoundingClientRect() },
      { key: 'bury', rect: () => document.getElementById('bury-fab')?.getBoundingClientRect() ?? null },
      { key: 'shop', before: () => this.game.centerOnShop(), rect: () => this.shopRect() },
      { key: 'menu', before: () => { if (!$('#bubble').classList.contains('open')) this.ui.toggleBubble(); }, rect: () => $('#bubble').getBoundingClientRect() },
    ];
    const stop = stops[Math.min(i, stops.length - 1)];
    const last = i >= stops.length - 1;
    stop.before?.();
    const spot = h('div', { class: 'ob-spot', 'aria-hidden': 'true' });
    const card = h('div', { class: 'dialog modal ob-card ob-tour-card' },
      h('h3', {}, t(`onboarding.tour.${stop.key}.title`)),
      h('p', {}, t(`onboarding.tour.${stop.key}.text`)),
      h('div', { class: 'ob-dots', 'aria-hidden': 'true' }, ...stops.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
      h('div', { class: 'row' },
        h('button', { class: 'big-btn ghost', onclick: () => this.endTour() }, t('onboarding.skip')),
        h('button', { class: 'big-btn', onclick: () => (last ? this.endTour() : (this.o.step = i + 1, this.save(), this.showTour(i + 1))) }, last ? t('onboarding.tour.end') : t('onboarding.next'))));
    this.openLayer('ob-tour-layer', spot, card);
    // il riquadro illuminato e la scheda sotto (o sopra, se non c'è posto), dopo che la camera si è mossa
    const place = () => {
      const r = stop.rect();
      if (!r || !this.layer?.contains(card)) return;
      const pad = 8;
      Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      const below = r.bottom + pad + 14, cardH = card.offsetHeight;
      card.style.top = below + cardH < window.innerHeight - 12 ? `${below}px` : `${Math.max(12, r.top - pad - 14 - cardH)}px`;
    };
    requestAnimationFrame(() => requestAnimationFrame(place));
  }

  /** La Bottega sullo schermo: un riquadro attorno al suo tetto. */
  private shopRect(): DOMRect | null {
    const shop = this.game.state.placeables.find((p) => p.type === 'shop');
    const top = shop ? this.game.world.entityTop(shop.id) : null;
    const p = top ? this.game.project(top) : null;
    return p ? new DOMRect(p.x - 70, p.y - 30, 140, 130) : null;
  }

  private endTour() {
    if ($('#bubble').classList.contains('open')) this.ui.closeBubble();
    this.game.select(null);
    this.game.recenter();
    this.go('done');
  }
}
