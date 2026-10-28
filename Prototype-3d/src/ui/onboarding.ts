// Il primo ingresso: la lettera (arriva piegata in quattro, si apre davanti a
// una luce calda, timbrata in fondo), il nome, quattro schede d'introduzione e
// il cortile del Custode, una mappa piccola a parte (game/yard.ts) dove si
// prova tutto con azioni vere: un consiglio alla volta, un occhio di bue su
// cosa toccare e un cerchio dove toccare. Fino al cortile la scena non si
// vede: c'è uno sfondo suo, con le lucciole, che resta mentre le schede
// sfumano l'una nell'altra (e che copre i cambi di scena). «Salta» sta in alto
// a destra; nelle schede c'è «Indietro». Animazioni e lucciole seguono il
// livello grafico (bassa: niente piega in 3D né lucciole). Lo stato è nel
// salvataggio (game/onboarding.ts): si riprende da dove ci si era fermati.
// Dalle Impostazioni si rivede la lettera o si rifà il cortile, con uno stato
// a parte che non si salva: la partita non cambia. Dopo il cortile, nel
// cimitero vero: il primo obiettivo (la prima sepoltura) e i consigli al
// momento giusto (game/tips.ts).

import type * as THREE from 'three';
import { scheduleSave } from '../app/persistence.ts';
import { checkName, NAME_MAX } from '../game/playerName.ts';
import { currentStep, yardFinished, yardSignal, YARD_STEPS, type OnboardingStage, type OnboardingState, type YardSignal, type YardStep } from '../game/onboarding.ts';
import { personalGraves } from '../game/rules.ts';
import { markTip, nextTip } from '../game/tips.ts';
import { applyYardGift, buildYard, YARD_GIFT, YARD_GRAVE, YARD_LANTERN } from '../game/yard.ts';
import { t, tList } from '../i18n/index.ts';
import { cellCenter } from '../view/WorldView.ts';
import { celebrate } from './celebrate.ts';
import { $, closeDrawer, drawerOpen, h, setUiBlocking, toast, uiBlocking } from './dom.ts';
import { lpBadgeUrl, lpIconPng } from './lpIcons.ts';
import { groundUrl } from './previews.ts';
import { npcNote } from './npcNote.ts';
import { npcPortrait, wispPortrait } from './npcPortraits.ts';
import type { UI } from './UI.ts';

/** Un passo del cortile, o la lanterna spostata in Modifica (dopo, il segno passa a «Fine»). */
export type OnboardingSignal = YardSignal | 'itemMoved';

let active: Onboarding | null = null;
/** Qualcosa è successo nel gioco (raccolto un fuoco fatuo, aperta una tomba…): il cortile ascolta. */
export const signalOnboarding = (s: OnboardingSignal) => active?.signal(s);

/** Tra due consigli al momento giusto almeno tanto (e il primo non prima di mezzo minuto). */
const TIP_GAP_MS = 60_000;
/** Il passaggio dal cortile al cimitero vero dura almeno tanto (lo sfondo con «Il cimitero si sveglia…»). */
const WAKE_MS = 900;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Le fasi a schermo pieno, sullo sfondo del percorso (passando dall'una all'altra lo sfondo resta; il cortile si prepara sotto). */
const SOLID: readonly OnboardingStage[] = ['welcome', 'name', 'intro', 'yard'];
/** Le schede dell'introduzione: l'immagine (il fuoco fatuo e il fantasma sono quelli della scena) e la chiave del testo. */
const INTRO: Array<[() => string, number, string]> = [
  [wispPortrait, 1, 'wisp'], [() => lpIconPng('flower', 160), 2, 'icon'], [() => npcPortrait('ghost'), 3, 'ghost'], [() => lpIconPng('coffin', 160), 4, 'icon'],
];
/** Un bersaglio sulla scena: dove toccare (`at`) e dove poggia (`base`, per misurare l'occhio di bue). */
interface SceneTarget { at: () => THREE.Vector3 | null; base: () => THREE.Vector3 | null }
/** Un bersaglio: un pulsante (selettore CSS) o un punto della scena. */
type Target = SceneTarget | string;

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
  /** I bersagli del passo, dal più vicino alla fine: il segno va sul primo che si vede. */
  private targets: (() => Target[]) | null = null;
  /** Il passo del cortile in vista (null fuori dal cortile). */
  private step: YardStep | null = null;
  /** In Modifica la lanterna è stata spostata: ora si tocca «Fine». */
  private moved = false;
  /** Il bersaglio nella scena era fuori dallo schermo e la camera ci è già andata (una volta per passo). */
  private framed = false;
  /** I bersagli dentro un pannello già fatti scorrere in vista. */
  private scrolled = new WeakSet<HTMLElement>();
  /** Il fantasma del passo delle presenze (e quando può arrivarne un altro). */
  private ghostId: string | null = null;
  private ghostAt = 0;
  private waitTimer = 0;
  /** Il primo obiettivo: già proposto in questa apertura del gioco. */
  private goalShown = false;
  private goalTimer = 0;
  /** L'ultimo consiglio al momento giusto (all'avvio: come se fosse di mezzo minuto fa). */
  private lastTipAt = performance.now() - TIP_GAP_MS / 2;

  constructor(ui: UI) {
    this.ui = ui;
    active = this;
    window.setInterval(() => this.tipTick(), 4000);
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
      case 'yard': this.startYard(); break;
      case 'done': this.scheduleGoal(); break;
    }
  }

  /** Dalle Impostazioni: solo la lettera, senza toccare la partita. */
  replayLetter() { this.replay({ stage: 'welcome', step: 0, goal: 'done', tips: [] }, true); }

  /** Dalle Impostazioni: il cortile, senza toccare la partita (niente lettera né nome, niente dono). */
  replayTutorial() {
    if (this.game.inYard) return;
    this.replay({ stage: 'yard', step: 0, goal: 'done', tips: [] }, false);
  }

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
      this.lastTipAt = performance.now();
    }
    this.save();
    this.resume(back);
  }

  private cleanup(keepLayer = false) {
    this.dropCoach();
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
      this.skipBtn(() => this.go('yard')),
      h('div', { class: 'dialog modal ob-card ob-intro with-hero' },
        h('div', { class: `ob-hero ${kind}`, 'aria-hidden': 'true' }, h('img', { src: img(), alt: '' })),
        h('h3', {}, t(`onboarding.intro.${n}.title`, { name: this.game.state.player.name })),
        h('p', {}, t(`onboarding.intro.${n}.text`)),
        h('div', { class: 'ob-dots', 'aria-hidden': 'true' }, ...INTRO.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
        h('div', { class: 'row' },
          h('button', { class: 'big-btn ghost', onclick: () => (i === 0 ? this.go('name', true) : this.showIntro(i - 1)) }, t('onboarding.back')),
          h('button', { class: 'big-btn', onclick: () => (last ? this.go('yard') : this.showIntro(i + 1)) }, last ? t('onboarding.start') : t('onboarding.next')))));
  }

  // ── Il cortile del Custode (azioni vere) ─────────────────────────────

  /**
   * Il cortile al posto della partita, sotto lo sfondo del percorso (che c'è
   * già arrivando dall'introduzione o all'avvio): dopo un frame si costruisce,
   * poi lo sfondo sfuma. Rivedendolo dalle Impostazioni la partita non si tocca.
   */
  private startYard() {
    if (!this.layer) this.openLayer('ob-solid');
    afterPaint(() => {
      if (!this.game.inYard) this.game.enterYard(buildYard(this.game.state, this.game.now(), this.o));
      this.cleanup();
      this.showStep();
    });
  }

  /** Il consiglio del passo in corso, l'occhio di bue e il cerchio su cosa toccare (la camera ci va). */
  private showStep() {
    this.dropCoach();
    const step = currentStep(this.o);
    if (!step) { if (yardFinished(this.o)) this.waitThenFinale(); return; }
    this.step = step;
    this.moved = false;
    this.ghostId = null;
    this.framed = false;
    this.coachBox(null, t(`onboarding.yard.${step}`),
      t('onboarding.tutorial.progress', { n: this.o.step + 1, total: YARD_STEPS.length }),
      h('button', { class: 'npc-note-cta', onclick: () => this.leaveYard(true) }, t('onboarding.yard.skip'), ' ›'));
    this.mark(this.targetsOf(step));
    const look: Partial<Record<YardStep, string>> = { clean: YARD_GRAVE, flowers: YARD_GRAVE, light: YARD_LANTERN, ghost: YARD_GRAVE, sheet: YARD_GRAVE, shop: this.shopId() ?? '' };
    if (look[step]) this.game.focusEntity(look[step]!);
  }

  /**
   * Il consiglio: come le notifiche dei personaggi, col Custode che esce dal
   * riquadro. Sotto scendono messaggi, note e pannelli (niente si copre).
   */
  private coachBox(title: string | null, text: string, progress: string, ...acts: Array<Node | null>) {
    this.coach = h('div', { class: 'ob-coach', role: 'status', 'aria-live': 'polite' },
      this.bust('small'),
      h('div', { class: 'ob-coach-body' },
        title ? h('b', { class: 'ob-coach-title' }, title) : null,
        h('p', {}, text),
        h('div', { class: 'ob-coach-foot' }, h('span', { class: 'ob-progress' }, progress), h('span', { class: 'ob-coach-acts' }, ...acts))));
    document.body.append(this.coach);
    const game = $('#game');
    game.classList.add('has-coach');
    game.style.setProperty('--coach-h', `${this.coach.offsetHeight}px`); // i18n-ok: stile
    // dove finisce (senza l'animazione d'entrata): i pannelli si aprono sotto
    game.style.setProperty('--coach-b', `${this.coach.offsetTop + this.coach.offsetHeight}px`); // i18n-ok: stile
  }

  private dropCoach() {
    this.coach?.remove(); this.coach = null;
    $('#game').classList.remove('has-coach');
    this.clearMarks();
    window.clearInterval(this.waitTimer);
  }

  /** L'occhio di bue e il cerchio, sul primo bersaglio della catena che c'è (vedi frame). */
  private mark(targets: () => Target[]) {
    this.clearMarks();
    this.targets = targets;
    this.halo = h('div', { class: 'ob-beam', 'aria-hidden': 'true' });
    this.tap = h('div', { class: 'ob-tap', 'aria-hidden': 'true' }, h('i'), h('i'));
    this.haloKey = '';
    document.body.append(this.halo, this.tap);
  }

  private shopId() { return this.game.state.placeables.find((p) => p.type === 'shop')?.id ?? null; }

  /**
   * Cosa toccare in ogni passo: una catena di bersagli, dal più vicino alla
   * fine al più lontano (il pulsante di un pannello già aperto, il menù
   * dell'oggetto, l'oggetto nella scena). Vince il primo che si vede.
   */
  private targetsOf(step: YardStep): () => Target[] {
    const g = this.game;
    const entity = (id: string): SceneTarget => ({ at: () => g.world.entityTop(id), base: () => g.world.entityTop(id)?.clone().setY(0) ?? null });
    const point = (x: number, y: number, top: number, base: number): SceneTarget => ({ at: () => cellCenter(x, y, [1, 1]).setY(top), base: () => cellCenter(x, y, [1, 1]).setY(base) });
    const ctx = (act: string) => `#ctx:not([hidden]) [data-ctx="${act}"]`;
    const card = (id: string) => `.drawer:not([hidden]) .card[data-item="${id}"]`;
    // il pulsante pieno del modale della Bottega: «Compra», poi «Posala»
    const shopCta = '.dialog .shop-detail .row .big-btn:not(.ghost)';
    switch (step) {
      case 'walk': return () => [point(23, 20, 0.25, 0)];
      case 'wisp': return () => { const w = g.state.world.looseWisps[0]; return w ? [point(w.x, w.y, 1.1, 0.4)] : []; };
      case 'clean': return () => [ctx('clean'), entity(YARD_GRAVE)];
      case 'flowers': return () => [ctx('flowers'), entity(YARD_GRAVE)];
      case 'light': return () => [ctx('light'), entity(YARD_LANTERN)];
      case 'shop': return () => [shopCta, card(YARD_GIFT.item), ctx('shop'), ...(this.shopId() ? [entity(this.shopId()!)] : [])];
      case 'place': return () => ['#game > .tutorial .pill.primary', shopCta, '.drawer:not([hidden]) .drawer-foot .big-btn:not(.ghost)', card(YARD_GIFT.item), '#bubble.open .slot[data-act="inventory"]', '#fab'];
      case 'edit': return () => {
        // la prima volta Modifica si presenta con una scheda: «Inizia»
        if (!g.editMode) return ['#drawer:not([hidden]) .drawer-foot .big-btn', '#bubble.open .slot[data-act="edit"]', '#fab'];
        if (this.moved) return ['#edit-done'];
        // la lanterna appena posata (o quella del cortile)
        const lamp = [...g.state.placeables].reverse().find((p) => p.type === YARD_GIFT.item);
        return lamp ? [entity(lamp.id)] : ['#edit-done'];
      };
      case 'ghost': return () => {
        const pos = () => (this.ghostId ? g.roamerPos(this.ghostId) : null);
        return pos() ? [{ at: () => pos()?.clone().setY(pos()!.y + 1.6) ?? null, base: () => pos()?.clone() ?? null }] : [];
      };
      case 'sheet': return () => [ctx('detail'), entity(YARD_GRAVE)];
    }
  }

  /** Il fantasma del passo: se non c'è (o se n'è andato senza essere toccato) ne arriva un altro. */
  private keepGhost() {
    if (this.step !== 'ghost' || (this.ghostId && this.game.roamerPos(this.ghostId))) return;
    const now = performance.now();
    if (now < this.ghostAt) return;
    this.ghostAt = now + 1500;
    this.ghostId = this.game.spawnGhostAt(YARD_GRAVE);
  }

  /** Il gioco segnala un'azione: se è quella del passo, si va avanti. */
  signal(sig: OnboardingSignal) {
    if (sig === 'itemMoved') { if (this.step === 'edit') this.moved = true; return; }
    if (!this.game.inYard || !yardSignal(this.o, sig)) return;
    this.save();
    this.showStep();
  }

  /** L'ultimo passo apre la scheda della tomba: lì si legge, e chiudendola il cortile è finito. */
  private waitThenFinale() {
    this.step = null;
    // la scheda si apre subito dopo il segnale: il consiglio su cosa c'è dentro c'è già, così si apre
    // al suo posto, sotto il consiglio (comparendo dopo la sposterebbe di colpo)
    this.coachBox(null, t('onboarding.yard.sheetOpen'), t('onboarding.tutorial.progress', { n: YARD_STEPS.length, total: YARD_STEPS.length }));
    this.mark(() => ['#drawer:not([hidden]) #drawer-close']);
    const since = performance.now();
    let opened = false;
    this.waitTimer = window.setInterval(() => {
      if (drawerOpen()) { opened = true; return; }
      if (this.game.placement || (!opened && performance.now() - since < 1500)) return;
      this.dropCoach();
      this.finale();
    }, 300);
  }

  /** «Pronto?»: la finestra delle celebrazioni, col dono di benvenuto (rivedendo, niente dono). */
  private finale() {
    const replay = !!this.replaying;
    celebrate({
      kicker: t('onboarding.yard.end.kicker'),
      title: t('onboarding.yard.end.title', { name: this.game.state.player.name }),
      text: t(replay ? 'onboarding.yard.end.replay' : 'onboarding.yard.end.text'),
      extra: replay ? undefined : t('onboarding.yard.end.gift', { n: YARD_GIFT.wisps }),
      badge: lpBadgeUrl('wisp', 'gold'),
      ok: t(replay ? 'onboarding.yard.end.back' : 'onboarding.yard.end.ok'),
      onClose: () => this.leaveYard(false),
    });
  }

  /**
   * Fuori dal cortile (alla fine o con «Salta»): sotto lo sfondo del percorso
   * torna il cimitero vero, poi lo sfondo sfuma. Arrivando la prima volta, il
   * dono di benvenuto e il primo obiettivo.
   */
  private leaveYard(skipped: boolean) {
    this.dropCoach();
    this.step = null;
    closeDrawer(true);
    if (this.game.placement) this.game.cancelPlacement();
    const replay = !!this.replaying;
    this.openLayer('ob-solid ob-wake', h('p', { class: 'ob-wake-text' }, t('onboarding.yard.loading')));
    const from = performance.now();
    afterPaint(() => {
      this.game.leaveYard();
      if (!replay) {
        applyYardGift(this.game.state);
        this.game.afterChange();
      }
      // lo sfondo resta almeno un attimo: è un passaggio, non un lampo
      window.setTimeout(() => {
        this.go('done');
        if (!replay && skipped) toast(t('onboarding.yard.giftToast', { n: YARD_GIFT.wisps }));
      }, Math.max(0, WAKE_MS - (performance.now() - from)));
    });
  }

  // ── Dopo il cortile: il primo obiettivo e i consigli al momento giusto ──

  /** Il primo obiettivo (la prima sepoltura), se c'è ancora: una volta per apertura del gioco. */
  private scheduleGoal() {
    const s = this.game.state;
    if (this.replaying || this.goalShown || s.onboarding.goal !== 'pending') return;
    if (personalGraves(s) > 0) { s.onboarding.goal = 'done'; this.save(); return; }
    window.clearTimeout(this.goalTimer);
    this.goalTimer = window.setTimeout(() => this.showGoal(), 1400);
  }

  /** «Il tuo primo addio»: «Seppellisci ›» apre la sepoltura, «Più tardi» la rimanda alla prossima volta. */
  private showGoal() {
    const g = this.game;
    if (g.state.onboarding.goal !== 'pending' || this.coach) return;
    if (this.busy()) { this.goalTimer = window.setTimeout(() => this.showGoal(), 1500); return; }
    this.goalShown = true;
    this.coachBox(t('onboarding.goal.title'), t('onboarding.goal.text'), '',
      h('button', { class: 'ob-back', onclick: () => this.dropCoach() }, t('onboarding.goal.later')),
      h('button', { class: 'npc-note-cta', onclick: () => { this.dropCoach(); document.getElementById('bury-fab')?.click(); } }, t('onboarding.goal.go'), ' ›'));
    this.mark(() => ['#bury-fab']);
  }

  /** La prima sepoltura è fatta (Game): via il primo obiettivo, se è ancora in vista. */
  goalReached() {
    window.clearTimeout(this.goalTimer);
    if (this.coach && !this.step) this.dropCoach();
    this.save();
  }

  /** Il giocatore è impegnato: un pannello, un dialogo, una scelta del posto, una notifica. */
  private busy(): boolean {
    const g = this.game;
    return drawerOpen() || uiBlocking() || !!g.placement || g.editMode || g.inYard || !!document.querySelector('.dialog-scrim, .npc-note');
  }

  /** Ogni tanto: se è il momento, un consiglio (uno alla volta, non troppo spesso, mai mentre si è impegnati). */
  private tipTick() {
    const g = this.game, s = g.state;
    if (s.onboarding.stage !== 'done' || this.replaying || this.coach || this.busy()) return;
    if (performance.now() - this.lastTipAt < TIP_GAP_MS) return;
    const tip = nextTip(s);
    if (!tip) return;
    markTip(s, tip.id);
    this.save();
    this.lastTipAt = performance.now();
    const at = tip.at;
    npcNote({
      kind: 'custode', name: s.player.name, img: npcPortrait('custode', s.player.look) || undefined,
      say: t(`tips.${tip.id}.say`), text: t(`tips.${tip.id}.text`),
      action: at ? { label: t('tips.show'), run: () => { g.focusEntity(at); g.goTo(at); } } : undefined,
    });
  }

  /** Le misure dell'occhio di bue, a passi di 8 px: si ridisegna solo quando cambiano davvero (il resto è uno spostamento). */
  private beamSize(w: number, h: number) {
    const rw = Math.ceil(w / 8) * 8, rh = Math.ceil(h / 8) * 8;
    const key = `${rw}x${rh}`; // i18n-ok: stile
    if (key === this.haloKey || !this.halo) return;
    this.haloKey = key;
    // trasparente fino a poco oltre il bersaglio, buio poco più in là
    this.halo.style.setProperty('--rx', `${rw + 20}px`); // i18n-ok: stile
    this.halo.style.setProperty('--ry', `${rh + 20}px`); // i18n-ok: stile
  }

  private clearMarks() {
    this.halo?.remove(); this.halo = null;
    this.tap?.remove(); this.tap = null;
    this.targets = null;
  }

  /**
   * Ogni frame: l'occhio di bue e il cerchio vanno sul primo bersaglio che si
   * vede (un oggetto della scena è misurato dalla cima a dove poggia, così una
   * tomba sta tutta nella luce; sotto un pannello la scena non conta).
   */
  frame() {
    const halo = this.halo, tap = this.tap;
    if (!halo || !tap || !this.targets) return;
    this.keepGhost();
    const covered = drawerOpen() || !!document.querySelector('.dialog-scrim');
    let r: { x: number; y: number; w: number; h: number } | null = null;
    // dove comincia (in alto) quel che va toccato nella scena o nel menù dell'oggetto
    let edge: number | null = null;
    // dentro un pannello il buio attorno è più leggero (il pannello si deve leggere)
    let inPanel = false;
    for (const tg of this.targets()) {
      if (typeof tg === 'string') {
        const el = document.querySelector<HTMLElement>(tg);
        // in un pannello che scorre, fuori vista: il pannello scorre fin lì (una volta per elemento)
        const box = el && !this.scrolled.has(el) ? scroller(el) : null;
        if (el && box) {
          const b0 = el.getBoundingClientRect(), v = box.getBoundingClientRect();
          if (b0.top < v.top || b0.bottom > v.bottom) { this.scrolled.add(el); el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }); }
        }
        const b = el && shown(el) ? el.getBoundingClientRect() : null;
        if (b && b.width && b.height) { r = { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width + 14, h: b.height + 14 }; if (el!.closest('#ctx')) edge = b.top; inPanel = !!el!.closest('.drawer, .dialog'); break; }
        continue;
      }
      if (covered) continue;
      const top = tg.at(), base = tg.base();
      const pt = top ? this.game.project(top) : null, pb = base ? this.game.project(base) : null;
      if (!pt || !pb) continue;
      // fuori dallo schermo (la camera guardava altrove): ci si va, una volta
      if (this.step && !this.framed && (pb.x < 0 || pb.x > innerWidth || pb.y < 0 || pb.y > innerHeight)) { this.framed = true; this.game.focusPoint(base!); }
      const d = Math.hypot(pt.x - pb.x, pt.y - pb.y);
      r = { x: (pt.x + pb.x) / 2, y: (pt.y + pb.y) / 2, w: Math.max(120, d * 1.8 + 60), h: Math.max(110, d * 1.2 + 70) };
      // sopra l'oggetto compare il suo menù: un po' di spazio anche per quello
      edge = pt.y - 80;
      break;
    }
    // nel cortile niente da toccare sotto il consiglio: la scena scende piano finché si vede
    const limit = this.step && this.coach && !covered ? this.coach.offsetTop + this.coach.offsetHeight + 16 : null;
    if (limit !== null && edge !== null && edge < limit) this.game.nudgeView(limit - edge);
    halo.style.visibility = tap.style.visibility = r ? 'visible' : 'hidden';
    if (!r) return;
    halo.classList.toggle('soft', inPanel);
    // con `translate` (non `transform`): la pulsazione (`scale`) non deve ingrandire anche lo spostamento
    halo.style.translate = tap.style.translate = `${r.x}px ${r.y}px`; // i18n-ok: stile
    this.beamSize(r.w, r.h);
  }
}

/** Dopo che lo sfondo è stato disegnato: il cambio di scena (pesante) non lo fa saltare. */
function afterPaint(fn: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(fn, 0)));
}

/** Il contenitore che scorre attorno a un elemento (pannello, modale), se c'è. */
function scroller(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
}

/** Si vede: niente `hidden` attorno (né pannelli nascosti con le classi del gioco). */
function shown(el: HTMLElement): boolean {
  if (el.closest('[hidden], .hidden')) return false;
  const check = (el as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility;
  return check ? check.call(el) : true;
}
