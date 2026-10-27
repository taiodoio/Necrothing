// Il primo ingresso: la lettera (arriva piegata in quattro, si apre davanti a
// una luce calda, timbrata in fondo), il nome, quattro schede d'introduzione,
// il tutorial con azioni vere (un consiglio alla volta e un occhio di bue su
// cosa toccare) e il giro dell'interfaccia (un occhio di bue alla volta).
// Fino al tutorial la scena non si vede: c'è uno sfondo suo, con le lucciole.
// Animazioni e lucciole seguono il livello grafico (bassa: niente piega in 3D
// né lucciole). Lo stato è nel
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
import { groundUrl } from './previews.ts';
import { npcPortrait, wispPortrait } from './npcPortraits.ts';
import type { UI } from './UI.ts';

let active: Onboarding | null = null;
/** Qualcosa è successo nel gioco (raccolto un fuoco fatuo, aperta una tomba…): il tutorial ascolta. */
export const signalOnboarding = (s: TutorialSignal) => active?.signal(s);

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Le schede dell'introduzione: l'immagine (il fuoco fatuo e il fantasma sono quelli della scena) e la chiave del testo. */
const INTRO: Array<[() => string, number, string]> = [
  [wispPortrait, 1, 'wisp'], [() => lpIconPng('flower', 160), 2, 'icon'], [() => npcPortrait('ghost'), 3, 'ghost'], [() => lpIconPng('coffin', 160), 4, 'icon'],
];
/** Il pulsante del menù dell'oggetto che fa ciascun passo. */
const CTX_ACT: Partial<Record<TutorialStep, string>> = { visit: 'detail', light: 'light', clean: 'clean' };

interface TourStop { key: string; rect: () => DOMRect | null; before?: () => void }

export class Onboarding {
  private readonly ui: UI;
  /** Rivedendo dalle Impostazioni: uno stato a parte, mai salvato. */
  private replaying: OnboardingState | null = null;
  private layer: HTMLElement | null = null;
  private coach: HTMLElement | null = null;
  /** L'occhio di bue su cosa toccare: segue un punto della scena o un pulsante. */
  private halo: HTMLElement | null = null;
  private haloKey = '';
  private markerAt: (() => THREE.Vector3 | null) | null = null;
  private haloEl: HTMLElement | null = null;
  /** Il pulsante del menù sopra l'oggetto che fa il passo (quando l'oggetto è selezionato, il segno passa lì). */
  private ctxAct: string | null = null;
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

  /**
   * Prima che lo splash sparisca: lo sfondo del percorso è già al suo posto
   * (se la fase in corso lo usa), così la scena non si intravede.
   */
  cover() {
    if (['welcome', 'name', 'intro'].includes(this.o.stage)) this.openLayer('ob-solid');
  }

  /**
   * Un livello sopra tutta la scena (la scena sotto si ferma); `ob-solid` la
   * copre con lo sfondo del percorso: lapidi, terra e pala in fondo e, se il
   * livello grafico lo permette, le lucciole.
   */
  private openLayer(cls: string, ...kids: Array<Node | null>): HTMLElement {
    this.layer?.remove();
    const q = this.game.uiQuality();
    const solid = cls.split(' ').includes('ob-solid');
    const ground = solid && groundUrl() ? h('div', { class: 'ob-ground', 'aria-hidden': 'true', style: `background-image:url(${groundUrl()})` }) : null; // i18n-ok: stile
    const flies = solid && !reducedMotion() ? this.fireflies(q === 'high' ? 16 : q === 'medium' ? 8 : 0) : null;
    const layer = h('div', { class: `ob-layer q-${q} ${cls}`, role: 'dialog', 'aria-modal': 'true' }, ground, flies, ...kids);
    document.body.append(layer);
    this.layer = layer;
    setUiBlocking(true);
    return layer;
  }

  /** Lucciole che vagano lente e si accendono e spengono (solo trasformazioni e opacità: costano poco). */
  private fireflies(n: number): HTMLElement | null {
    if (!n) return null;
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    return h('div', { class: 'ob-flies', 'aria-hidden': 'true' }, ...Array.from({ length: n }, () => h('i', {
      style: `--x:${r(4, 96).toFixed(1)}%;--y:${r(18, 92).toFixed(1)}%;--dx:${r(-60, 60).toFixed(0)}px;--dy:${r(-70, 40).toFixed(0)}px;--d:${r(5, 9).toFixed(1)}s;--b:${r(1.6, 3.2).toFixed(1)}s;--dl:${(-r(0, 9)).toFixed(1)}s;--s:${r(0.6, 1.2).toFixed(2)}`, // i18n-ok: stile
    })));
  }

  // ── La lettera ───────────────────────────────────────────────────────

  private showLetter() {
    // il testo scorre; il timbro sta in basso a destra, sulla carta
    const sheet = h('div', { class: 'ob-sheet' }, h('i', { class: 'ob-stamp', 'aria-hidden': 'true' }), h('div', { class: 'ob-sheet-scroll', tabindex: '0' },
      h('div', { class: 'ob-letter' },
        h('h2', {}, t('onboarding.letter.title')),
        ...tList('onboarding.letter.body').map((p) => h('p', {}, p)),
        h('p', { class: 'ob-closing' }, t('onboarding.letter.closing')),
        h('p', { class: 'ob-sign' }, t('onboarding.letter.sign')))));
    // il foglio piegato in quattro: la metà di sotto (con la sua metà destra) si apre in giù, poi le due metà destre si aprono di lato
    const q = (c: string) => h('i', { class: `ob-q ${c}` });
    const fold = h('div', { class: 'ob-fold', 'aria-hidden': 'true' },
      h('div', { class: 'ob-half top' }, q('tl'), q('tr flap')),
      h('div', { class: 'ob-half bottom' }, q('bl'), q('br flap')));
    const stage = h('div', { class: 'ob-stage', 'aria-label': t('onboarding.letter.aria') },
      h('div', { class: 'ob-light', 'aria-hidden': 'true' }), h('div', { class: 'ob-shade', 'aria-hidden': 'true' }), fold, sheet);
    const next = () => this.go('name');
    const layer = this.openLayer('ob-solid ob-letter-layer',
      h('button', { class: 'ob-skip', onclick: next }, t('onboarding.skip')),
      stage,
      h('button', { class: 'big-btn ob-continue', onclick: next }, t('onboarding.continue')));
    const open = () => { stage.classList.add('open'); layer.classList.remove('playing'); };
    if (reducedMotion()) { open(); return; }
    stage.classList.add('play');
    layer.classList.add('playing');
    stage.querySelector('.ob-stamp')!.addEventListener('animationend', open, { once: true });
    // un tocco durante l'animazione la salta
    stage.addEventListener('pointerdown', open, { once: true });
  }

  /** Il Custode che parla: il suo mezzobusto esce dal riquadro, con una linea da cui parte (come nell'HUD). */
  private bust(cls = '') {
    return h('div', { class: `ob-bust ${cls}`, 'aria-hidden': 'true' }, h('img', { src: npcPortrait('custode', this.game.state.player.look), alt: '' }));
  }

  // ── Il nome ──────────────────────────────────────────────────────────

  private showName() {
    const s = this.game.state;
    const fallback = t('state.player.defaultName');
    const input = h('input', { value: s.player.name === fallback ? '' : s.player.name, maxLength: NAME_MAX * 2, placeholder: fallback, autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', 'aria-label': t('onboarding.name.label') }) as HTMLInputElement;
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
    this.openLayer('ob-solid ob-name-layer', h('div', { class: 'dialog modal ob-card with-bust' },
      this.bust(),
      h('b', { class: 'ob-say' }, t('onboarding.name.say')),
      h('p', {}, t('onboarding.name.text')),
      h('label', { class: 'field ob-field' }, h('span', {}, t('onboarding.name.label')), input),
      err,
      h('p', { class: 'muted ob-hint' }, t('onboarding.name.hint')),
      h('div', { class: 'row' },
        h('button', { class: 'big-btn ghost', onclick: () => this.go('intro') }, t('onboarding.skip')),
        h('button', { class: 'big-btn', onclick: confirm }, t('onboarding.name.ok')))));
  }

  // ── L'introduzione ───────────────────────────────────────────────────

  private showIntro(i = 0) {
    const [img, n, kind] = INTRO[i];
    const last = i === INTRO.length - 1;
    this.openLayer('ob-solid ob-intro-layer', h('div', { class: 'dialog modal ob-card ob-intro with-hero' },
      h('div', { class: `ob-hero ${kind}`, 'aria-hidden': 'true' }, h('img', { src: img(), alt: '' })),
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
      this.bust('small'),
      h('div', { class: 'ob-coach-body' },
        h('p', {}, t(`onboarding.tutorial.${step}`)),
        h('div', { class: 'ob-coach-foot' },
          h('span', { class: 'ob-progress' }, t('onboarding.tutorial.progress', { n, total: TUTORIAL_STEPS.length })),
          h('button', { class: 'npc-note-cta', onclick: () => this.go('tour') }, t('onboarding.tutorial.skip'), ' ›'))));
    document.body.append(this.coach);
    $('#game').classList.add('has-coach');
    $('#game').style.setProperty('--coach-h', `${this.coach.offsetHeight}px`); // i18n-ok: stile
    this.halo = h('div', { class: 'ob-beam', 'aria-hidden': 'true' });
    this.haloKey = '';
    document.body.append(this.halo);
    if (target instanceof HTMLElement) { this.haloEl = target; return; }
    // un segno sulla scena, che segue la camera
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

  /** Le misure dell'occhio di bue (solo quando cambiano: il resto è uno spostamento, che costa poco). */
  private beamSize(el: HTMLElement, w: number, h: number) {
    const key = `${Math.round(w)}x${Math.round(h)}`; // i18n-ok: stile
    if (key === this.haloKey && el === this.halo) return;
    if (el === this.halo) this.haloKey = key;
    // trasparente fino a poco oltre il bersaglio, buio pieno al doppio
    el.style.setProperty('--rx', `${w + 20}px`); // i18n-ok: stile
    el.style.setProperty('--ry', `${h + 20}px`); // i18n-ok: stile
  }

  private clearMarks() {
    this.halo?.remove(); this.halo = null; this.markerAt = null; this.haloEl = null; this.ctxAct = null;
  }

  /**
   * Ogni frame: l'alone segue il suo pulsante o il suo punto della scena;
   * sparisce sotto un pannello e passa al pulsante giusto del menù dell'oggetto, se c'è.
   */
  frame() {
    const halo = this.halo;
    if (!halo) return;
    const btn = this.haloEl ?? (this.ctxAct ? document.querySelector<HTMLElement>(`#ctx:not([hidden]) [data-ctx="${this.ctxAct}"]`) : null);
    let r: { x: number; y: number; w: number; h: number } | null = null;
    if (btn && !drawerOpen()) {
      const b = btn.getBoundingClientRect();
      if (b.width) r = { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width + 14, h: b.height + 14 };
    } else if (!btn && this.markerAt && !drawerOpen()) {
      const at = this.markerAt();
      const p = at ? this.game.project(at) : null;
      if (p) r = { x: p.x, y: p.y, w: 64, h: 64 };
    }
    halo.style.visibility = r ? 'visible' : 'hidden';
    if (!r) return;
    // con `translate` (non `transform`): la pulsazione (`scale`) non deve ingrandire anche lo spostamento
    halo.style.translate = `${r.x}px ${r.y}px`; // i18n-ok: stile
    this.beamSize(halo, r.w, r.h);
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
    const spot = h('div', { class: 'ob-beam tour', 'aria-hidden': 'true' });
    const card = h('div', { class: 'dialog modal ob-card ob-tour-card with-bust' },
      this.bust('small'),
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
      spot.style.translate = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`; // i18n-ok: stile
      this.beamSize(spot, r.width + pad * 2, r.height + pad * 2);
      // sotto il riquadro (lasciando posto al mezzobusto che esce dalla scheda), o sopra;
      // se non c'è posto né sopra né sotto (il menù è alto), la scheda si fa senza mezzobusto
      const fits = (lift: number) => {
        const cardH = card.offsetHeight, below = r.bottom + pad + 14 + lift, above = r.top - pad - 14 - cardH;
        if (below + cardH < window.innerHeight - 12) return `${below}px`;
        return above >= 12 + lift ? `${above}px` : null;
      };
      let top = fits(44);
      if (!top) { card.querySelector('.ob-bust')?.remove(); card.classList.remove('with-bust'); top = fits(0) ?? '12px'; }
      card.style.top = top;
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
