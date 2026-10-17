// Personalizzazione del Custode: anteprima 3D che gira e opzioni a tasselli
// con la miniatura, divise in schede (Aspetto: testa, pelle, anche hoa-boa-hoa, occhi, occhiali;
// Capelli: taglio, barba e baffi; Vestiti: vestito, cappello e colori).
// L'anteprima gira su sé stessa e si può trascinare per girarla a mano.
// Le scelte si vedono subito nell'anteprima; il Custode in gioco cambia con
// «Salva» (chiudendo con modifiche non salvate si chiede conferma).

import * as THREE from 'three';
import { DEFAULT_LOOK, LOOK_COLORS, LOOK_STYLES, lookKey, lookUnused, type CustodeLook } from '../game/look.ts';
import { HAT_FEATS } from '../game/balance.ts';
import * as R from '../game/rules.ts';
import { lookThumb } from './lookThumbs.ts';
import { animateRig, buildRig, type Rig } from '../view/characters.ts';
import { LP } from '../render/lowpoly/kit.ts';
import { GRASS, LPC } from '../render/lowpoly/palette.ts';
import { flower, grassTuft, moss, pebbles } from '../render/lowpoly/details.ts';
import { mushroom } from '../render/lowpoly/nature.ts';
import { instantiate, LOWPOLY_MATERIALS, type CachedModel } from '../render/modelCache.ts';
import { closeDrawer, h, openDrawer, toast } from './dom.ts';
import type { UI } from './UI.ts';

let groundModel: CachedModel | null = null;

/**
 * Zolla di prato sotto il Custode: bordo di terra, ciuffi d'erba, fiorellini,
 * sassi, muschio e funghetti tutt'intorno (il centro resta libero per i piedi).
 */
function previewGround(): CachedModel {
  if (groundModel) return groundModel;
  const lp = new LP('preview:prato');
  const r = lp.rng;
  lp.cyl(0, -0.09, 0, 0.6, 0.56, 0.08, 14, '#4b3a2c', { jitter: 0.01, vary: 0.08 });
  lp.cyl(0, -0.012, 0, 0.6, 0.6, 0.016, 14, GRASS[1], { jitter: 0.006, vary: 0.1, ao: 0 });
  /** Punto sull'anello libero attorno al personaggio. */
  const ring = (a: number, d0 = 0.27, d1 = 0.54): [number, number] => { const d = r.range(d0, d1); return [Math.cos(a) * d, Math.sin(a) * d]; };
  // erba più bassa sul davanti (verso la camera), così piedi e pantaloni restano in vista
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r.range(-0.2, 0.2);
    const [x, z] = ring(a, 0.33, 0.56);
    const front = Math.max(0, Math.cos(a - Math.atan2(2.9, 1.9)));
    grassTuft(lp, x, z, (0.9 + r.next() * 0.5) * (1 - 0.5 * front));
  }
  for (let i = 0; i < 7; i++) { const [x, z] = ring(r.range(0, Math.PI * 2), 0.3, 0.52); flower(lp, x, z, r.pick(LPC.flowers), 0.08 + r.next() * 0.07); }
  pebbles(lp, -0.5, 0.2, -0.3, 0.45, 3);
  pebbles(lp, 0.3, -0.5, 0.5, -0.3, 3);
  lp.blob(-0.42, 0.03, -0.25, 0.07, 0.05, 0.06, LPC.stone, { vary: 0.1 }); // sasso più grande
  moss(lp, -0.42, 0.06, -0.25, 0.05);
  moss(lp, 0.35, 0.004, 0.32, 0.07);
  mushroom(lp, 0.4, -0.18, 0.09, '#a8322e', false, 0.05);
  mushroom(lp, 0.47, -0.08, 0.06, '#c9a27a', false, 0.035);
  mushroom(lp, -0.25, 0.42, 0.07, '#8e3a5a', false, 0.04);
  const { geometries, lights } = lp.build();
  groundModel = { geometries, lights, height: 0.2, mats: LOWPOLY_MATERIALS, dedicated: true };
  return groundModel;
}

/** Piccola scena separata con il Custode che ruota lentamente. */
class CustodePreview {
  readonly canvas = h('canvas', { class: 'look-preview', width: 240, height: 270 }) as HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 240 / 270, 0.1, 50);
  private rig: Rig | null = null;
  private raf = 0;
  private readonly clock = new THREE.Clock();
  /** Gira da solo (giro completo); si può trascinare per girarlo a mano, poi riparte. */
  private angle = 0.5;
  private dragX: number | null = null;
  private resumeAt = 0;

  constructor(look: CustodeLook) {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(240, 270, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.scene.add(new THREE.HemisphereLight('#c4cbc8', '#4a4a3e', 1.9));
    const sun = new THREE.DirectionalLight('#fff0d8', 2.4);
    sun.position.set(3, 5, 4);
    this.scene.add(sun);
    this.scene.add(instantiate(previewGround(), { castShadow: false }));
    this.camera.position.set(1.9, 1.75, 2.9);
    this.camera.lookAt(0, 0.68, 0);
    this.setLook(look);
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => { this.dragX = e.clientX; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      if (this.dragX === null) return;
      this.angle += (e.clientX - this.dragX) * 0.012;
      this.dragX = e.clientX;
    });
    const release = () => { this.dragX = null; this.resumeAt = this.clock.getElapsedTime() + 2.5; };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
    let last = 0;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const t = this.clock.getElapsedTime(), dt = Math.min(0.1, t - last);
      last = t;
      // giro lento e continuo; fermo mentre lo si trascina e per un attimo dopo
      if (this.dragX === null && t > this.resumeAt) this.angle += dt * 0.45;
      if (this.rig) {
        this.rig.root.rotation.y = this.angle;
        animateRig(this.rig, 'idle', t, 0);
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  setLook(look: CustodeLook) {
    if (this.rig) this.scene.remove(this.rig.root);
    this.rig = buildRig('custode', 'lowpoly', look);
    this.scene.add(this.rig.root);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
  }
}

type LookTab = 'aspetto' | 'capelli' | 'vestiti';
/** Scheda aperta per ultima (riaprendo il pannello si torna lì). */
let lastTab: LookTab = 'aspetto';

export function openCustomize(ui: UI) {
  const game = ui.game;
  // si lavora su una bozza: il Custode in gioco cambia solo con «Salva»
  let saved: CustodeLook = { ...game.state.player.look };
  let look: CustodeLook = { ...saved };
  const preview = new CustodePreview(look);
  const dirty = () => lookKey(look) !== lookKey(saved);
  const saveBtn = h('button', { class: 'big-btn', onclick: () => {
    game.setLook(look);
    saved = { ...look };
    toast('Aspetto salvato.');
    closeDrawer(true);
  } }, 'Salva') as HTMLButtonElement;
  const refresh = () => { saveBtn.disabled = !dirty(); };
  const apply = (patch: Partial<CustodeLook>) => {
    const headChanged = patch.head !== undefined && patch.head !== look.head;
    look = { ...look, ...patch };
    preview.setLook(look);
    refresh();
    // cambiando testa cambiano le scelte disponibili (zucca e teschio: niente capelli, barba…)
    if (headChanged) { panes = buildPanes(); show(lastTab, false); }
  };
  /** Scelte che la testa attuale non usa: visibili ma disattivate. */
  const off = (key: keyof CustodeLook) => lookUnused(look.head).has(key);

  /** Griglia di scelte con la miniatura (si riempie man mano che le miniature sono pronte). */
  const options = <K extends 'head' | 'hair' | 'hat' | 'outfit' | 'glasses' | 'beard' | 'mustache'>(key: K) => {
    const box = h('div', { class: 'look-tiles', role: 'group' });
    const disabled = off(key);
    for (const [v, label] of LOOK_STYLES[key] as Array<[CustodeLook[K], string]>) {
      const img = h('img', { alt: '', width: 72, height: 72, draggable: false }) as HTMLImageElement;
      // il cappello da strega si sblocca con le pozioni della strega
      const locked = key === 'hat' && !R.hatUnlocked(game.state, String(v)) && look.hat !== v;
      const feat = locked ? HAT_FEATS[v as keyof typeof HAT_FEATS] : null;
      const b = h('button', { class: `look-tile${look[key] === v ? ' active' : ''}${locked ? ' locked' : ''}`, 'aria-pressed': String(look[key] === v), disabled: disabled || locked, title: feat ? `${feat.label} (${Math.min(feat.goal, game.state.player.counters[feat.counter])}/${feat.goal})` : undefined, onclick: () => {
        for (const x of Array.from(box.children)) { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); }
        apply({ [key]: v } as Partial<CustodeLook>);
      } }, h('span', { class: 'look-thumb' }, img), h('span', { class: 'look-tile-label' }, label));
      void lookThumb(key, v).then((url) => { if (url) { img.src = url; img.classList.add('ready'); } });
      box.append(b);
    }
    return box;
  };

  /** Tasselli di colore con nome (accessibili via aria-label). */
  const swatches = (key: keyof typeof LOOK_COLORS) => {
    const box = h('div', { class: 'swatches', role: 'group' });
    for (const [c, label] of LOOK_COLORS[key]) {
      const b = h('button', { class: `swatch${look[key] === c ? ' active' : ''}`, style: `background:${c}`, title: label, 'aria-label': label, 'aria-pressed': String(look[key] === c), disabled: off(key), onclick: () => {
        for (const x of Array.from(box.children)) { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); }
        apply({ [key]: c } as Partial<CustodeLook>);
      } });
      box.append(b);
    }
    return box;
  };

  const toggle = (key: 'sparkle' | 'freckles' | 'bandaid', label: string) =>
    h('label', { class: `setting${off(key) ? ' off' : ''}` }, label, h('input', { type: 'checkbox', checked: look[key], disabled: off(key), onchange: (e: Event) => apply({ [key]: (e.target as HTMLInputElement).checked } as Partial<CustodeLook>) }));

  const lowpoly = game.state.settings.style === 'lowpoly';
  const title = (t: string) => h('div', { class: 'section-title' }, t);
  const sub = (t: string) => h('div', { class: 'muted look-sub' }, t);
  /** Avviso quando la testa scelta non usa una parte delle scelte. */
  const bald = () => (lookUnused(look.head).size ? h('p', { class: 'muted look-note' }, `Con la testa a ${look.head === 'pumpkin' ? 'zucca' : 'teschio'} capelli, barba, baffi, pelle e occhi non si usano: tornano scegliendo un’altra testa.`) : null);
  // schede: poche scelte alla volta invece di una pagina lunghissima (ricostruite
  // quando si torna all'aspetto originale, così i tasti attivi seguono la bozza)
  const buildPanes = (): Array<[LookTab, string, HTMLElement]> => [
    ['aspetto', 'Aspetto', h('div', {},
      title('Testa'), options('head'), bald(),
      title('Pelle'), swatches('skin'),
      toggle('sparkle', 'Pelle hoa-boa-hoa ✨'), toggle('freckles', 'Lentiggini'), toggle('bandaid', 'Cerotto'),
      title('Occhi'), swatches('eyes'),
      title('Occhiali'), options('glasses'))],
    ['capelli', 'Capelli', h('div', {},
      bald(),
      title('Taglio'), options('hair'), sub('Colore'), swatches('hairColor'),
      title('Barba e baffi'), sub('Barba'), options('beard'), sub('Baffi'), options('mustache'), sub('Colore di barba e baffi'), swatches('beardColor'))],
    ['vestiti', 'Vestiti', h('div', {},
      title('Vestito'), options('outfit'), sub('Colore'), swatches('outfitColor'),
      sub('Colore dei dettagli (sciarpa, righe, toppe)'), swatches('accentColor'),
      title('Cappello'), options('hat'), sub('Colore'), swatches('hatColor'))],
  ];
  let panes = buildPanes();
  const content = h('div', { class: 'look-pane' });
  const tabs = h('div', { class: 'tabs look-tabs', role: 'tablist' });
  const show = (id: LookTab, toTop = true) => {
    lastTab = id;
    for (const [tid, , pane] of panes) if (tid === id) content.replaceChildren(pane);
    for (const b of Array.from(tabs.children)) { const on = (b as HTMLElement).dataset.tab === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); }
    if (toTop) content.parentElement?.parentElement?.scrollTo?.({ top: 0 });
  };
  for (const [id, label] of panes) tabs.append(h('button', { class: 'tab', role: 'tab', 'data-tab': id, onclick: () => show(id) }, label));
  const body = h('div', { class: 'look' },
    h('div', { class: 'look-stage' }, preview.canvas, tabs),
    lowpoly ? null : h('p', { class: 'muted' }, 'L’aspetto personalizzato si vede nello stile Low-Poly (Impostazioni → Stile).'),
    content,
  );
  show(lastTab);
  refresh();
  const reset = h('button', { class: 'big-btn ghost', onclick: () => {
    look = { ...DEFAULT_LOOK };
    preview.setLook(look);
    panes = buildPanes();
    show(lastTab);
    refresh();
  } }, 'Originale');
  openDrawer('Personaggio', body, {
    footer: h('div', { class: 'row look-foot' }, reset, saveBtn),
    beforeClose: () => !dirty() || confirm('Hai modificato l’aspetto del Custode senza salvare. Chiudere e perdere le modifiche?'),
    onClose: () => preview.dispose(),
  });
}
