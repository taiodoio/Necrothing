// Il primo ingresso: la lettera (arriva piegata in quattro, si apre davanti a
// una luce calda, timbrata in fondo), il nome, quattro schede d'introduzione,
// il tutorial con azioni vere (un consiglio alla volta, un occhio di bue su
// cosa toccare e un cerchio dove toccare) e il giro dell'interfaccia (lo stesso
// consiglio, un occhio di bue alla volta). Fino al tutorial la scena non si
// vede: c'è uno sfondo suo, con le lucciole, che resta mentre le schede
// sfumano l'una nell'altra. «Salta» sta in alto a destra; nelle schede c'è
// «Indietro». Animazioni e lucciole seguono il livello grafico (bassa: niente
// piega in 3D né lucciole). Lo stato è nel salvataggio (game/onboarding.ts):
// si riprende da dove ci si era fermati. Dalle Impostazioni si rivede la
// lettera o si rifà il tutorial, con uno stato a parte che non si salva: la
// partita non cambia (le azioni vere danno le loro ricompense, come sempre).

import type * as THREE from 'three';
import { scheduleSave } from '../app/persistence.ts';
import { checkName, NAME_MAX } from '../game/playerName.ts';
import { currentStep, tutorialSignal, TUTORIAL_STEPS, type OnboardingStage, type OnboardingState, type TutorialSignal, type TutorialStep } from '../game/onboarding.ts';
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

/** Le fasi a schermo pieno, sullo sfondo del percorso (passando dall'una all'altra lo sfondo resta). */
const SOLID: readonly OnboardingStage[] = ['welcome', 'name', 'intro'];
/** Le schede dell'introduzione: l'immagine (il fuoco fatuo e il fantasma sono quelli della scena) e la chiave del testo. */
const INTRO: Array<[() => string, number, string]> = [
  [wispPortrait, 1, 'wisp'], [() => lpIconPng('flower', 160), 2, 'icon'], [() => npcPortrait('ghost'), 3, 'ghost'], [() => lpIconPng('coffin', 160), 4, 'icon'],
];
/** Il pulsante del menù dell'oggetto che fa ciascun passo. */
const CTX_ACT: Partial<Record<TutorialStep, string>> = { visit: 'detail', light: 'light', clean: 'clean' };

/** Un bersaglio sulla scena: dove toccare (`at`), dove poggia (`base`, per misurare l'occhio di bue) e dove guardare. */
interface SceneTarget { at: () => THREE.Vector3 | null; base: () => THREE.Vector3 | null; focus?: () => void }
interface TourStop { key: string; rect: () => DOMRect | null; before?: () => void }

export class Onboarding {
  private readonly ui: UI;
  /** Rivedendo dalle Impostazioni: uno stato a parte, mai salvato. */
  private replaying: OnboardingState | null = null;
  /** Rivedendo solo la lettera: finita quella, si torna al gioco. */
  private letterOnly = false;
  private layer: HTMLElement | null = null;
  private coach: HTMLElement | null = null;
  /** L'occhio di bue su cosa toccare e il cerchio dove toccare: seguono un punto della scena o un pulsante. */
  private halo: HTMLElement | null = null;
  private tap: HTMLElement | null = null;
  private haloKey = '';
  private sceneTarget: SceneTarget | null = null;
  private haloEl: HTMLElement | null = null;
  /** Il pulsante del menù sopra l'oggetto che fa il passo (quando l'oggetto è selezionato, il segno passa lì). */
  private ctxAct: string | null = null;
  private waitTimer = 0;
  /** Nel giro: rimette l'occhio di bue sulla tappa a ogni frame (la camera può muoversi ancora). */
  private tourPlace: (() => void) | null = null;

  constructor(ui: UI) {
    this.ui = ui;
    active = this;
  }

  private get game() { return this.ui.game; }
  private get o(): OnboardingState { return this.replaying ?? this.game.state.onboarding; }
  /** In corso (anche il tutorial, che non copre la scena). */
  get running(): boolean { return this.o.stage !== 'done'; }

  private save() { if (!this.replaying) scheduleSave(this.game.state); }

  /** All'avvio (dopo la schermata iniziale): riprende dalla fase salvata. `back`: ci si torna con «Indietro». */
  resume(back = false) {
    switch (this.o.stage) {
      case 'welcome': this.showLetter(!back); break;
      case 'name': this.showName(); break;
      case 'intro': this.showIntro(back ? INTRO.length - 1 : 0); break;
      case 'tutorial': this.startTutorial(); break;
      case 'tour': this.showTour(); break;
      case 'done': break;
    }
  }

  /** Dalle Impostazioni: solo la lettera, senza toccare la partita. */
  replayLetter() { this.replay({ stage: 'welcome', step: 0 }, true); }

  /** Dalle Impostazioni: il tutorial e il giro dell'interfaccia, senza toccare la partita (niente lettera né nome). */
  replayTutorial() { this.replay({ stage: 'tutorial', step: 0 }, false); }

  private replay(from: OnboardingState, letterOnly: boolean) {
    closeDrawer(true);
    this.cleanup();
    this.replaying = from;
    this.letterOnly = letterOnly;
    this.resume();
  }

  private go(stage: OnboardingStage, back = false) {
    if (this.letterOnly && stage !== 'welcome') stage = 'done';
    // tra due fasi a schermo pieno lo sfondo resta: cambiano solo le schede
    this.cleanup(SOLID.includes(stage));
    this.o.stage = stage;
    this.o.step = 0;
    if (stage === 'done') {
      if (this.replaying) { this.replaying = null; this.letterOnly = false; }
      else this.game.state.settings.shopTutorialDone = true;
    }
    this.save();
    this.resume(back);
  }

  private cleanup(keepLayer = false) {
    this.coach?.remove(); this.coach = null; $('#game').classList.remove('has-coach');
    this.clearMarks();
    window.clearInterval(this.waitTimer);
    if (keepLayer) return;
    // lo sfondo sfuma via (la scena ricompare piano)
    const l = this.layer;
    this.layer = null;
    setUiBlocking(false);
    if (!l) return;
    if (reducedMotion()) { l.remove(); return; }
    l.classList.add('out');
    window.setTimeout(() => l.remove(), 320);
  }

  /**
   * Prima che lo splash sparisca: lo sfondo del percorso è già al suo posto
   * (se la fase in corso lo usa), così la scena non si intravede.
   */
  cover() {
    if (SOLID.includes(this.o.stage)) this.openLayer('ob-solid');
  }

  /**
   * Il contenuto di una fase, sopra tutta la scena (la scena sotto si ferma).
   * `ob-solid` la copre con lo sfondo del percorso: lapidi, terra e pala in
   * fondo e, se il livello grafico lo permette, le lucciole. Se lo sfondo c'è
   * già resta: il contenuto di prima sfuma via e il nuovo sfuma dentro.
   * Ritorna il contenitore del contenuto.
   */
  private openLayer(cls: string, ...kids: Array<Node | null>): HTMLElement {
    const solid = cls.split(' ').includes('ob-solid');
    const own = cls.split(' ').filter((c) => c !== 'ob-solid').join(' ');
    let layer = this.layer;
    if (layer && layer.classList.contains('ob-solid') === solid && !layer.classList.contains('out')) {
      for (const old of layer.querySelectorAll<HTMLElement>(':scope > .ob-content:not(.out)')) {
        old.classList.add('out');
        window.setTimeout(() => old.remove(), reducedMotion() ? 0 : 260);
      }
    } else {
      layer?.remove();
      const q = this.game.uiQuality();
      const ground = solid && groundUrl() ? h('div', { class: 'ob-ground', 'aria-hidden': 'true', style: `background-image:url(${groundUrl()})` }) : null; // i18n-ok: stile
      const flies = solid && !reducedMotion() ? this.fireflies(q === 'high' ? 16 : q === 'medium' ? 8 : 0) : null;
      layer = h('div', { class: `ob-layer q-${q}${solid ? ' ob-solid' : ''}`, role: 'dialog', 'aria-modal': 'true' }, ground, flies);
      document.body.append(layer);
      this.layer = layer;
    }
    // sotto uno sfondo pieno la scena si ferma; nel giro (trasparente) resta viva: la camera va sulle tappe
    setUiBlocking(solid);
    const content = h('div', { class: `ob-content ${own}` }, ...kids);
    layer.append(content);
    return content;
  }

  /** «Salta», in alto a destra: salta la fase in corso. */
  private skipBtn(run: () => void) {
    return h('button', { class: 'ob-skip', onclick: run }, t('onboarding.skip'));
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

  /** `animate`: arriva piegata e si apre; tornandoci con «Indietro» è già aperta. */
  private showLetter(animate = true) {
    // il testo scorre; il timbro chiude la lettera, dopo la firma
    const stamp = h('i', { class: 'ob-stamp', 'aria-hidden': 'true' });
    const scroll = h('div', { class: 'ob-sheet-scroll', tabindex: '0' },
      h('div', { class: 'ob-letter' },
        h('h2', {}, t('onboarding.letter.title')),
        ...tList('onboarding.letter.body').map((p) => h('p', {}, p)),
        h('p', { class: 'ob-closing' }, t('onboarding.letter.closing')),
        h('p', { class: 'ob-sign' }, t('onboarding.letter.sign')),
        stamp));
    const sheet = h('div', { class: 'ob-sheet' }, scroll);
    // il foglio piegato in quattro: la metà di sotto (con la sua metà destra) si apre in giù, poi le due metà destre si aprono di lato.
    // Tre involucri, ognuno col suo movimento: l'arrivo, e i due spostamenti che tengono al centro il foglio mentre si apre
    // (separati, così le due aperture si sovrappongono senza fermarsi in mezzo)
    const q = (c: string) => h('i', { class: `ob-q ${c}` });
    const fold = h('div', { class: 'ob-fold', 'aria-hidden': 'true' }, h('div', { class: 'ob-fy' }, h('div', { class: 'ob-fx' },
      h('div', { class: 'ob-half top' }, q('tl'), q('tr flap')),
      h('div', { class: 'ob-half bottom' }, q('bl'), q('br flap')))));
    const stage = h('div', { class: 'ob-stage', 'aria-label': t('onboarding.letter.aria') },
      h('div', { class: 'ob-light', 'aria-hidden': 'true' }), h('div', { class: 'ob-shade', 'aria-hidden': 'true' }), fold, sheet);
    const next = () => this.go('name');
    const content = this.openLayer('ob-solid ob-letter-layer',
      this.skipBtn(next),
      stage,
      h('button', { class: 'big-btn ob-continue', onclick: next }, t('onboarding.continue')));
    // il timbro si imprime quando, a lettera aperta, lo si raggiunge scorrendo
    const watchStamp = () => {
      if (typeof IntersectionObserver !== 'function') { stamp.classList.add('stamped'); return; }
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { stamp.classList.add('stamped'); io.disconnect(); } }, { root: scroll, threshold: 0.7 });
      io.observe(stamp);
    };
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      stage.classList.add('open'); content.classList.remove('playing');
      watchStamp();
    };
    if (!animate || reducedMotion()) { open(); return; }
    stage.classList.add('play');
    content.classList.add('playing');
    // aperta quando il foglio è comparso (piega in 3D o, in bassa qualità, salita)
    sheet.addEventListener('animationend', (e) => { if (e.target === sheet) open(); });
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
    this.openLayer('ob-solid ob-name-layer',
      this.skipBtn(() => this.go('intro')),
      h('div', { class: 'dialog modal ob-card with-bust' },
        this.bust(),
        h('b', { class: 'ob-say' }, t('onboarding.name.say')),
        h('p', {}, t('onboarding.name.text')),
        h('label', { class: 'field ob-field' }, h('span', {}, t('onboarding.name.label')), input),
        err,
        h('p', { class: 'muted ob-hint' }, t('onboarding.name.hint')),
        h('div', { class: 'row' },
          h('button', { class: 'big-btn ghost', onclick: () => this.go('welcome', true) }, t('onboarding.back')),
          h('button', { class: 'big-btn', onclick: confirm }, t('onboarding.name.ok')))));
  }

  // ── L'introduzione ───────────────────────────────────────────────────

  private showIntro(i = 0) {
    const [img, n, kind] = INTRO[i];
    const last = i === INTRO.length - 1;
    this.openLayer('ob-solid ob-intro-layer',
      this.skipBtn(() => this.go('tutorial')),
      h('div', { class: 'dialog modal ob-card ob-intro with-hero' },
        h('div', { class: `ob-hero ${kind}`, 'aria-hidden': 'true' }, h('img', { src: img(), alt: '' })),
        h('h3', {}, t(`onboarding.intro.${n}.title`, { name: this.game.state.player.name })),
        h('p', {}, t(`onboarding.intro.${n}.text`)),
        h('div', { class: 'ob-dots', 'aria-hidden': 'true' }, ...INTRO.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
        h('div', { class: 'row' },
          h('button', { class: 'big-btn ghost', onclick: () => (i === 0 ? this.go('name', true) : this.showIntro(i - 1)) }, t('onboarding.back')),
          h('button', { class: 'big-btn', onclick: () => (last ? this.go('tutorial') : this.showIntro(i + 1)) }, last ? t('onboarding.start') : t('onboarding.next')))));
  }

  // ── Il tutorial (azioni vere) ────────────────────────────────────────

  private startTutorial() {
    this.cleanup();
    this.game.recenter();
    this.showStep();
  }

  /** Il consiglio del passo in corso, l'occhio di bue e il cerchio su cosa toccare; se non c'è niente da fare, il passo si salta. */
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
    this.tap = h('div', { class: 'ob-tap', 'aria-hidden': 'true' }, h('i'), h('i'));
    this.haloKey = '';
    document.body.append(this.halo, this.tap);
    if (target instanceof HTMLElement) { this.haloEl = target; return; }
    // un segno sulla scena, che segue la camera
    this.sceneTarget = target;
    this.ctxAct = CTX_ACT[step] ?? null;
    target.focus?.();
  }

  /** Cosa toccare in ogni passo: un punto della scena (con dove guardare), un pulsante, o null (niente da fare: si salta). */
  private targetOf(step: TutorialStep): SceneTarget | HTMLElement | null {
    const g = this.game, s = g.state;
    const entity = (id: string): SceneTarget => ({
      at: () => g.world.entityTop(id),
      base: () => g.world.entityTop(id)?.clone().setY(0) ?? null,
      focus: () => g.focusEntity(id),
    });
    switch (step) {
      case 'wisp': {
        const a = g.actors.avatarCell();
        const w = [...s.world.looseWisps].sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
        if (!w) return null;
        const cell = () => s.world.looseWisps.find((x) => x.id === w.id) ?? s.world.looseWisps[0];
        const at = () => { const c = cell(); return c ? cellCenter(c.x, c.y, [1, 1]).setY(1.1) : null; };
        return { at, base: () => { const c = cell(); return c ? cellCenter(c.x, c.y, [1, 1]).setY(0.4) : null; }, focus: () => { const p = at(); if (p) g.focusPoint(p); } };
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

  /** Le misure dell'occhio di bue, a passi di 8 px: si ridisegna solo quando cambiano davvero (il resto è uno spostamento). */
  private beamSize(el: HTMLElement, w: number, h: number) {
    const rw = Math.ceil(w / 8) * 8, rh = Math.ceil(h / 8) * 8;
    const key = `${rw}x${rh}`; // i18n-ok: stile
    if (key === this.haloKey && el === this.halo) return;
    if (el === this.halo) this.haloKey = key;
    // trasparente fino a poco oltre il bersaglio, buio poco più in là
    el.style.setProperty('--rx', `${rw + 20}px`); // i18n-ok: stile
    el.style.setProperty('--ry', `${rh + 20}px`); // i18n-ok: stile
  }

  private clearMarks() {
    this.tourPlace = null;
    this.halo?.remove(); this.halo = null;
    this.tap?.remove(); this.tap = null;
    this.sceneTarget = null; this.haloEl = null; this.ctxAct = null;
  }

  /**
   * Ogni frame: l'occhio di bue e il cerchio seguono il loro pulsante o il loro
   * oggetto della scena (misurato dalla cima a dove poggia, così una tomba sta
   * tutta nella luce); spariscono sotto un pannello e passano al pulsante
   * giusto del menù dell'oggetto, se c'è.
   */
  frame() {
    this.tourPlace?.();
    const halo = this.halo, tap = this.tap;
    if (!halo || !tap) return;
    const btn = this.haloEl ?? (this.ctxAct ? document.querySelector<HTMLElement>(`#ctx:not([hidden]) [data-ctx="${this.ctxAct}"]`) : null);
    let r: { x: number; y: number; w: number; h: number; tx: number; ty: number } | null = null;
    if (drawerOpen()) r = null;
    else if (btn) {
      const b = btn.getBoundingClientRect();
      if (b.width) { const x = b.left + b.width / 2, y = b.top + b.height / 2; r = { x, y, w: b.width + 14, h: b.height + 14, tx: x, ty: y }; }
    } else if (this.sceneTarget) {
      const top = this.sceneTarget.at(), base = this.sceneTarget.base();
      const pt = top ? this.game.project(top) : null, pb = base ? this.game.project(base) : null;
      if (pt && pb) {
        const d = Math.hypot(pt.x - pb.x, pt.y - pb.y);
        const x = (pt.x + pb.x) / 2, y = (pt.y + pb.y) / 2;
        r = { x, y, w: Math.max(120, d * 1.8 + 60), h: Math.max(110, d * 1.2 + 70), tx: x, ty: y };
      }
    }
    halo.style.visibility = tap.style.visibility = r ? 'visible' : 'hidden';
    if (!r) return;
    // con `translate` (non `transform`): la pulsazione (`scale`) non deve ingrandire anche lo spostamento
    halo.style.translate = `${r.x}px ${r.y}px`; // i18n-ok: stile
    tap.style.translate = `${r.tx}px ${r.ty}px`; // i18n-ok: stile
    this.beamSize(halo, r.w, r.h);
  }

  // ── Il giro dell'interfaccia ─────────────────────────────────────────

  /** Le tappe: come il tutorial, un consiglio in alto e l'occhio di bue (il menù non si apre: basta il suo pulsante). */
  private showTour(i = this.o.step) {
    const stops: TourStop[] = [
      { key: 'profile', rect: () => $('#player-chip').getBoundingClientRect() },
      { key: 'bury', rect: () => document.getElementById('bury-fab')?.getBoundingClientRect() ?? null },
      { key: 'shop', before: () => this.focusShop(), rect: () => this.shopRect() },
      { key: 'menu', rect: () => $('#fab').getBoundingClientRect() },
    ];
    i = Math.min(i, stops.length - 1);
    const stop = stops[i];
    const last = i === stops.length - 1;
    if ($('#bubble').classList.contains('open')) this.ui.closeBubble();
    stop.before?.();
    const to = (k: number) => { this.o.step = k; this.save(); this.showTour(k); };
    const spot = h('div', { class: 'ob-beam tour', 'aria-hidden': 'true' });
    const coach = h('div', { class: 'ob-coach ob-tour-coach', role: 'status', 'aria-live': 'polite' },
      this.bust('small'),
      h('div', { class: 'ob-coach-body' },
        h('b', { class: 'ob-coach-title' }, t(`onboarding.tour.${stop.key}.title`)),
        h('p', {}, t(`onboarding.tour.${stop.key}.text`)),
        h('div', { class: 'ob-coach-foot' },
          h('span', { class: 'ob-progress' }, t('onboarding.tutorial.progress', { n: i + 1, total: stops.length })),
          h('span', { class: 'ob-coach-acts' },
            i > 0 ? h('button', { class: 'ob-back', onclick: () => to(i - 1) }, '‹ ', t('onboarding.back')) : null,
            h('button', { class: 'npc-note-cta', onclick: () => (last ? this.endTour() : to(i + 1)) }, last ? t('onboarding.tour.end') : t('onboarding.next'), ' ›')))));
    this.openLayer('ob-tour-layer', spot, coach, this.skipBtn(() => this.endTour()));
    // l'occhio di bue segue la tappa (la camera si sta ancora spostando)
    let key = '';
    this.tourPlace = () => {
      const r = stop.rect();
      if (!r) return;
      const pad = 8, x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      if (`${x},${y}` === key) return; // i18n-ok: stile
      key = `${x},${y}`; // i18n-ok: stile
      spot.style.translate = `${x}px ${y}px`; // i18n-ok: stile
      this.beamSize(spot, r.width + pad * 2, r.height + pad * 2);
    };
    this.tourPlace();
  }

  /** La camera sulla Bottega, senza selezionarla (il Custode resta dov'è, niente menù dell'oggetto). */
  private focusShop() {
    const shop = this.game.state.placeables.find((p) => p.type === 'shop');
    if (shop) this.game.focusEntity(shop.id);
  }

  /** La Bottega sullo schermo: un riquadro attorno al suo tetto. */
  private shopRect(): DOMRect | null {
    const shop = this.game.state.placeables.find((p) => p.type === 'shop');
    const top = shop ? this.game.world.entityTop(shop.id) : null;
    const p = top ? this.game.project(top) : null;
    return p ? new DOMRect(p.x - 70, p.y - 30, 140, 130) : null;
  }

  private endTour() {
    this.tourPlace = null;
    this.game.select(null);
    this.game.recenter();
    this.go('done');
  }
}
