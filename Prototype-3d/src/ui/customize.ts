// Personalizzazione del Custode: anteprima 3D che gira e opzioni a tasselli
// (pelle anche brillantinata, capelli e colore, occhi, dettagli, cappello,
// vestiti e colori). Ogni scelta si applica subito al personaggio in gioco.

import * as THREE from 'three';
import { DEFAULT_LOOK, LOOK_COLORS, LOOK_STYLES, type CustodeLook } from '../game/look.ts';
import { animateRig, buildRig, type Rig } from '../view/characters.ts';
import { h, openDrawer } from './dom.ts';
import type { UI } from './UI.ts';

/** Piccola scena separata con il Custode che ruota lentamente. */
class CustodePreview {
  readonly canvas = h('canvas', { class: 'look-preview', width: 240, height: 270 }) as HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 240 / 270, 0.1, 50);
  private rig: Rig | null = null;
  private raf = 0;
  private readonly clock = new THREE.Clock();

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
    const ground = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3d5236', roughness: 1 }));
    this.scene.add(ground);
    this.camera.position.set(1.9, 1.75, 2.9);
    this.camera.lookAt(0, 0.72, 0);
    this.setLook(look);
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const t = this.clock.getElapsedTime();
      if (this.rig) {
        this.rig.root.rotation.y = Math.sin(t * 0.6) * 0.9;
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

export function openCustomize(ui: UI) {
  const game = ui.game;
  let look: CustodeLook = { ...game.state.player.look };
  const preview = new CustodePreview(look);
  const apply = (patch: Partial<CustodeLook>) => {
    look = { ...look, ...patch };
    game.setLook(look);
    preview.setLook(look);
  };

  /** Riga di scelte testuali (vanno a capo su schermi stretti). */
  const options = <K extends 'hair' | 'hat' | 'outfit' | 'glasses' | 'beard' | 'mustache'>(key: K) => {
    const box = h('div', { class: 'look-opts', role: 'group' });
    for (const [v, label] of LOOK_STYLES[key] as Array<[CustodeLook[K], string]>) {
      const b = h('button', { class: look[key] === v ? 'active' : '', 'aria-pressed': String(look[key] === v), onclick: () => {
        for (const x of Array.from(box.children)) { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); }
        apply({ [key]: v } as Partial<CustodeLook>);
      } }, label);
      box.append(b);
    }
    return box;
  };

  /** Tasselli di colore con nome (accessibili via aria-label). */
  const swatches = (key: keyof typeof LOOK_COLORS) => {
    const box = h('div', { class: 'swatches', role: 'group' });
    for (const [c, label] of LOOK_COLORS[key]) {
      const b = h('button', { class: `swatch${look[key] === c ? ' active' : ''}`, style: `background:${c}`, title: label, 'aria-label': label, 'aria-pressed': String(look[key] === c), onclick: () => {
        for (const x of Array.from(box.children)) { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); }
        apply({ [key]: c } as Partial<CustodeLook>);
      } });
      box.append(b);
    }
    return box;
  };

  const toggle = (key: 'sparkle' | 'freckles' | 'bandaid', label: string) =>
    h('label', { class: 'setting' }, label, h('input', { type: 'checkbox', checked: look[key], onchange: (e: Event) => apply({ [key]: (e.target as HTMLInputElement).checked } as Partial<CustodeLook>) }));

  const lowpoly = game.state.settings.style === 'lowpoly';
  const body = h('div', { class: 'look' },
    h('div', { class: 'look-stage' }, preview.canvas),
    lowpoly ? null : h('p', { class: 'muted' }, 'L’aspetto personalizzato si vede nello stile Low-Poly (Impostazioni → Stile).'),
    h('div', { class: 'section-title' }, 'Pelle'),
    swatches('skin'),
    toggle('sparkle', 'Pelle brillantinata ✨'),
    h('div', { class: 'section-title' }, 'Capelli'),
    options('hair'),
    swatches('hairColor'),
    h('div', { class: 'section-title' }, 'Occhi'),
    swatches('eyes'),
    h('div', { class: 'section-title' }, 'Dettagli'),
    options('glasses'),
    toggle('freckles', 'Lentiggini'),
    toggle('bandaid', 'Cerotto'),
    h('div', { class: 'section-title' }, 'Barba e baffi'),
    h('div', { class: 'muted' }, 'Barba'),
    options('beard'),
    h('div', { class: 'muted' }, 'Baffi'),
    options('mustache'),
    h('div', { class: 'section-title' }, 'Cappello'),
    options('hat'),
    swatches('hatColor'),
    h('div', { class: 'section-title' }, 'Vestiti'),
    options('outfit'),
    swatches('outfitColor'),
    h('div', { class: 'muted', style: 'margin-top:6px' }, 'Colore dei dettagli (sciarpa, righe, toppe)'),
    swatches('accentColor'),
  );
  const reset = h('button', { class: 'big-btn ghost', onclick: () => { look = { ...DEFAULT_LOOK }; game.setLook(look); preview.dispose(); openCustomize(ui); } }, 'Aspetto originale');
  openDrawer('Personaggio', body, { footer: reset, onClose: () => preview.dispose() });
}
