// Testata animata della Bottega (interfaccia nuova): l'interno della bottega
// visto di fronte, con gli stessi pezzi low-poly del gioco, e lo zombie
// bottegaio che spolvera le mensole, passa dietro al bancone e saluta.
// Un renderer piccolo tutto suo, acceso solo finché la testata è a schermo.

import * as THREE from 'three';
import { LP, gothicArchShape, type LPModel } from '../render/lowpoly/kit.ts';
import { LPC } from '../render/lowpoly/palette.ts';
import { instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { animateRig, buildRig, type Pose, type Rig } from '../view/characters.ts';
import { zombieLurch } from '../view/Actors.ts';

const FPS = 30;
const SPECTRAL = '#9ff0d6';

/** Le pareti, il pavimento, le mensole, il bancone e la merce: un solo modello fermo. */
function shopRoomModel(): LPModel {
  const lp = new LP('testata-bottega');
  const r = lp.rng;
  // pavimento di assi che vengono verso di noi, con un tappeto rosso al centro
  for (let i = 0; i < 18; i++) lp.box(-4.25 + i * 0.5, -0.06, 0.6, 0.48, 0.06, 4, r.pick([LPC.wood, LPC.woodDark, '#6e5340']), { vary: 0.1, jitter: 0.004 });
  lp.box(-0.35, 0, 0.55, 2.3, 0.02, 1.1, LPC.red, { vary: 0.06, jitter: 0 });
  lp.box(-0.35, 0.005, 0.55, 2.05, 0.02, 0.85, '#a8433a', { vary: 0.05, jitter: 0 });
  // parete di fondo: assi verticali, zoccolo di pietra, trave in alto
  for (let i = 0; i < 20; i++) lp.box(-4.75 + i * 0.5, 0, -1.35, 0.49, 3.2, 0.1, r.pick([LPC.woodDark, '#3f2f27', '#52402f']), { vary: 0.08, jitter: 0.004 });
  for (let i = 0; i < 16; i++) lp.box(-4.5 + i * 0.6 + r.range(-0.05, 0.05), 0, -1.27, 0.58, r.range(0.42, 0.52), 0.1, r.pick([LPC.stone, LPC.stoneWarm, LPC.stoneDark]), { bevel: 0.02, vary: 0.1 });
  lp.box(0, 2.78, -0.4, 10, 0.16, 0.2, LPC.woodDark, { bevel: 0.02, vary: 0.08 });
  for (const x of [-3.3, 3.3]) lp.box(x, 0, -1.2, 0.22, 3, 0.22, LPC.woodDark, { bevel: 0.02, vary: 0.08 });

  // finestra ad arco al centro, notte fuori: luna e croci in controluce
  lp.push([-0.35, 1.0, -1.27]);
  lp.plate(gothicArchShape(1.25, 1.45, 5), 0.06, LPC.woodDark);
  lp.push([0, 0.07, 0.04]).plate(gothicArchShape(1.05, 1.28, 5), 0.02, '#2a3f5c', { bucket: 'glow' }).pop();
  lp.blob(0.22, 1.0, 0.08, 0.16, 0.16, 0.02, '#f3ecd2', { bucket: 'glow', detail: 1 });
  lp.box(-0.2, 0.07, 0.07, 0.05, 0.42, 0.01, '#141a24', { bucket: 'glow' }).box(-0.2, 0.33, 0.07, 0.2, 0.05, 0.01, '#141a24', { bucket: 'glow' });
  lp.box(0.12, 0.07, 0.07, 0.04, 0.28, 0.01, '#141a24', { bucket: 'glow' }).box(0.12, 0.25, 0.07, 0.14, 0.04, 0.01, '#141a24', { bucket: 'glow' });
  lp.box(0, 0.07, 0.07, 1.0, 0.12, 0.01, '#141a24', { bucket: 'glow' });
  lp.box(0, 0.62, 0.09, 1.05, 0.04, 0.03, LPC.woodDark).box(0, 0.05, 0.09, 0.04, 1.25, 0.03, LPC.woodDark);
  lp.box(0, -0.06, 0.12, 1.4, 0.08, 0.22, LPC.wood, { bevel: 0.015 });
  lp.pop();
  // davanzale: due candele e una zucca
  lp.blob(-0.85, 1.08, -1.1, 0.13, 0.1, 0.13, '#d9772f', { detail: 1 }).cyl(-0.85, 1.16, -1.1, 0.015, 0.015, 0.06, 4, LPC.leaf);

  // mensole a sinistra, con barattoli di fuochi fatui, teschi, boccette e candele
  const shelf = (x0: number, w: number) => {
    for (const x of [x0 - w / 2, x0 + w / 2]) lp.box(x, 0, -1.08, 0.08, 2.35, 0.36, LPC.woodDark, { bevel: 0.01, vary: 0.08 });
    for (const y of [0.55, 1.15, 1.75, 2.3]) lp.box(x0, y, -1.08, w + 0.08, 0.06, 0.38, LPC.wood, { bevel: 0.01, vary: 0.1 });
  };
  shelf(-2.35, 1.5);
  const jar = (x: number, y: number, s = 1, z = -1.05, c = '#5d8f86') => {
    lp.cyl(x, y + 0.01, z, 0.1 * s, 0.11 * s, 0.24 * s, 6, c, { bucket: 'glow' });
    lp.cyl(x, y + 0.25 * s, z, 0.08 * s, 0.08 * s, 0.05 * s, 6, LPC.woodDark);
  };
  const skull = (x: number, y: number, z = -1.02) => {
    lp.blob(x, y + 0.11, z, 0.11, 0.1, 0.1, LPC.bone, { detail: 1 });
    lp.box(x, y + 0.01, z + 0.03, 0.12, 0.06, 0.08, LPC.boneDark);
    for (const dx of [-0.04, 0.04]) lp.blob(x + dx, y + 0.12, z + 0.09, 0.025, 0.03, 0.01, LPC.engrave, { detail: 0 });
  };
  const bottle = (x: number, y: number, c: string, h = 0.26, z = -1.02) => {
    lp.cyl(x, y + 0.01, z, 0.06, 0.07, h * 0.6, 6, c).cyl(x, y + h * 0.6, z, 0.07, 0.025, h * 0.25, 6, c).cyl(x, y + h * 0.85, z, 0.025, 0.025, h * 0.12, 4, LPC.woodLight);
  };
  const flask = (x: number, y: number, c: string, z = -1.02) => {
    lp.blob(x, y + 0.09, z, 0.085, 0.08, 0.085, c, { bucket: 'glow', detail: 1 }).cyl(x, y + 0.16, z, 0.025, 0.025, 0.08, 4, '#cfd8d3').cyl(x, y + 0.24, z, 0.03, 0.03, 0.025, 4, LPC.woodLight);
  };
  const hourglass = (x: number, y: number, z = -1.02) => {
    lp.cyl(x, y + 0.01, z, 0.06, 0.06, 0.02, 6, LPC.gold).cyl(x, y + 0.03, z, 0.05, 0.012, 0.08, 6, '#e3d2a2').cyl(x, y + 0.11, z, 0.012, 0.05, 0.08, 6, '#cfc6ae').cyl(x, y + 0.19, z, 0.06, 0.06, 0.02, 6, LPC.gold);
    for (const dx of [-0.05, 0.05]) lp.cyl(x + dx, y + 0.02, z, 0.008, 0.008, 0.18, 3, LPC.gold);
  };
  const chest = (x: number, y: number, z = -1.02) => {
    lp.box(x, y + 0.01, z, 0.2, 0.11, 0.14, '#5a3a2a', { bevel: 0.008, vary: 0.1 }).box(x, y + 0.12, z, 0.21, 0.04, 0.15, '#6d4a33', { bevel: 0.008 }).box(x, y + 0.09, z + 0.075, 0.035, 0.05, 0.01, LPC.gold);
  };
  const pumpkin = (x: number, y: number, s = 1, z = -1.02) => {
    lp.blob(x, y + 0.08 * s, z, 0.11 * s, 0.085 * s, 0.11 * s, r.pick(['#d9772f', '#c8662a', '#e08a3a']), { detail: 1 }).cyl(x, y + 0.15 * s, z, 0.012, 0.012, 0.05, 4, LPC.leaf);
  };
  const candle = (x: number, y: number, z = -1.02, h = 0.16) => {
    lp.cyl(x, y + 0.01, z, 0.035, 0.035, h, 5, '#e8dcc0').blob(x, y + h + 0.05, z, 0.022, 0.045, 0.022, LPC.flame, { bucket: 'glow', detail: 0 });
  };
  const book = (x: number, y: number, c: string, h = 0.3, lean = 0, z = -1.02) => {
    lp.push([x, y + 0.01, z], 0, 0, lean).box(0, 0, 0, 0.07, h, 0.24, c, { bevel: 0.006, vary: 0.08 }).pop();
  };
  const BOOKS = ['#6d3a33', '#34495e', '#7a6236', '#3f5a3a', '#5b3f63', '#8a5a2a'] as const;
  const POTIONS = ['#8e2f2a', '#6d4a7a', '#4a6d52', '#a37a3a', '#3f6a8a'] as const;
  /** Riempie un ripiano da x0 a x1 di merce mescolata, senza buchi. */
  const fill = (x0: number, x1: number, y: number, z = -1.02) => {
    let x = x0;
    while (x < x1 - 0.08) {
      const k = r.int(9);
      const w = [0.24, 0.15, 0.36, 0.1, 0.25, 0.19, 0.14, 0.23, 0.23][k];
      if (x + w > x1) { x += 0.05; continue; }
      const c = x + w / 2;
      if (k === 0) jar(c, y, r.range(0.75, 1), z - 0.03, r.pick(['#5d8f86', '#5d8f86', '#8fa86a']));
      else if (k === 1) bottle(c, y, r.pick(POTIONS), r.range(0.2, 0.3), z);
      else if (k === 2) { const n = 4; for (let i = 0; i < n; i++) book(x + 0.04 + i * 0.08, y, r.pick(BOOKS), r.range(0.24, 0.32), i === n - 1 ? -0.3 : 0, z); }
      else if (k === 3) candle(c, y, z, r.range(0.08, 0.16));
      else if (k === 4) skull(c, y, z);
      else if (k === 5) flask(c, y, r.pick(['#b25ad0', '#d05a5a', '#5ad08a', '#5ab4d0']), z);
      else if (k === 6) hourglass(c, y, z);
      else if (k === 7) chest(c, y, z);
      else pumpkin(c, y, 1, z);
      x += w + 0.02;
    }
  };
  fill(-3.08, -1.62, 0.58); fill(-3.08, -1.62, 1.18); fill(-3.08, -1.62, 1.78);
  // sul davanzale candele e una boccetta
  candle(-0.62, 1.02, -1.12, 0.14); candle(-0.52, 1.02, -1.1, 0.09); flask(0.1, 1.02, '#5ab4d0', -1.12); candle(0.22, 1.02, -1.12, 0.12);
  // cartellini dei prezzi appesi ai ripiani
  for (const y of [0.55, 1.15, 1.75]) for (const x of [-2.75, -2.05]) lp.push([x + r.range(-0.1, 0.1), y - 0.07, -0.88], 0, 0, r.range(-0.15, 0.15)).box(0, 0, 0, 0.09, 0.06, 0.01, '#c9bc9c').pop();
  // sulla mensola di cima: una piccola lapide in vendita e un corvo impagliato (sagoma)
  lp.push([-2.75, 2.36, -1.05]).plate(gothicArchShape(0.26, 0.32, 3), 0.07, LPC.stoneLight).pop();
  lp.blob(-2.15, 2.47, -1.03, 0.1, 0.09, 0.08, LPC.charcoal, { detail: 0 }).blob(-2.05, 2.56, -1.03, 0.06, 0.06, 0.06, LPC.charcoal, { detail: 0 });

  // a destra: bancone con bilancia, campanello, candela e una lapide d'esempio
  lp.box(1.75, 0, 0.05, 2.1, 0.6, 0.66, LPC.woodDark, { bevel: 0.02, vary: 0.08 });
  for (let i = 0; i < 4; i++) lp.box(0.95 + i * 0.53, 0.1, 0.39, 0.42, 0.4, 0.02, '#5a4433', { bevel: 0.01, vary: 0.1 });
  lp.box(1.75, 0.6, 0.05, 2.25, 0.07, 0.74, LPC.wood, { bevel: 0.015, vary: 0.08 });
  lp.box(1.7, 0, -0.66, 2.0, 0.24, 0.6, LPC.woodDark, { bevel: 0.015, vary: 0.08 }); // gradino del bottegaio
  lp.push([0, -0.26, 0]); // la merce sul piano, più basso del bancone di prima
  // bilancia d'ottone
  lp.cyl(1.1, 0.93, 0.08, 0.1, 0.12, 0.05, 6, LPC.gold).cyl(1.1, 0.98, 0.08, 0.018, 0.018, 0.34, 4, LPC.gold).box(1.1, 1.31, 0.08, 0.5, 0.025, 0.025, LPC.gold);
  for (const dx of [-0.24, 0.24]) lp.cyl(1.1 + dx, 1.13, 0.08, 0.1, 0.06, 0.03, 6, LPC.gold);
  lp.blob(0.86, 1.2, 0.08, 0.035, 0.035, 0.035, SPECTRAL, { bucket: 'glow', detail: 0 }); // un fuoco fatuo sul piatto
  // campanello e registro
  lp.cyl(1.55, 0.93, 0.18, 0.07, 0.07, 0.015, 6, LPC.ironLight).blob(1.55, 0.98, 0.18, 0.055, 0.045, 0.055, LPC.gold, { detail: 1 });
  lp.push([1.9, 0.94, 0.12], 0.25).box(0, 0, 0, 0.42, 0.04, 0.3, '#6d3a33', { bevel: 0.008 }).box(0, 0.04, 0, 0.38, 0.01, 0.27, '#e8dcc0').pop();
  candle(2.45, 0.93, 0.05, 0.2); candle(2.56, 0.93, 0.14, 0.12); candle(2.36, 0.93, 0.18, 0.08);
  for (let i = 0; i < 5; i++) lp.cyl(1.68 + (i % 2) * 0.09, 0.93 + Math.floor(i / 2) * 0.025, 0.3, 0.035, 0.035, 0.022, 7, LPC.gold); // monete
  jar(2.2, 0.93, 0.7, 0.28, '#8fa86a'); flask(1.36, 0.93, '#d05a5a', 0.26); pumpkin(0.86, 0.93, 0.7, 0.28);
  lp.pop();
  // il cartello appeso al bancone, col fuoco fatuo dipinto
  lp.push([1.2, 0.36, 0.41], 0, 0, 0.05).box(0, 0, 0, 0.42, 0.2, 0.02, LPC.woodLight, { bevel: 0.01 }).pop();
  lp.blob(1.2, 0.46, 0.43, 0.035, 0.055, 0.01, SPECTRAL, { bucket: 'glow', detail: 0 });
  // dietro al bancone: mensola a muro con lanterne in vendita e un cartello col fuoco fatuo
  lp.box(1.75, 1.55, -1.12, 2.2, 0.06, 0.3, LPC.wood, { bevel: 0.01, vary: 0.1 });
  for (const x of [0.85, 2.65]) lp.box(x, 1.32, -1.15, 0.05, 0.24, 0.22, LPC.woodDark);
  for (const [x, s] of [[1.0, 1], [1.45, 0.8], [2.4, 0.9]] as const) {
    lp.box(x, 1.61, -1.12, 0.2 * s, 0.03, 0.2 * s, LPC.iron).box(x, 1.64, -1.12, 0.16 * s, 0.22 * s, 0.16 * s, LPC.lantern, { bucket: 'glow' });
    lp.cyl(x, 1.64 + 0.22 * s, -1.12, 0.13 * s, 0.02, 0.1 * s, 4, LPC.iron).cyl(x, 1.74 + 0.22 * s, -1.12, 0.015, 0.015, 0.05, 4, LPC.iron);
  }
  bottle(2.05, 1.61, '#4a6d52', 0.26, -1.1); bottle(2.18, 1.61, '#6d4a7a', 0.22, -1.1); hourglass(2.62, 1.61, -1.1); skull(1.22, 1.61, -1.12);
  lp.push([1.1, 2.02, -1.28]).box(0, 0, 0, 0.8, 0.46, 0.04, LPC.wood, { bevel: 0.015 }).pop();
  lp.blob(1.1, 2.25, -1.24, 0.07, 0.11, 0.02, SPECTRAL, { bucket: 'glow', detail: 0 });
  for (const x of [0.8, 1.4]) lp.cyl(x, 2.48, -1.27, 0.01, 0.01, 0.28, 3, LPC.iron);

  // mazzi di erbe e agli appesi alla trave
  for (const [x, len] of [[-1.72, 0.32], [-1.52, 0.42], [0.55, 0.36], [0.75, 0.28], [2.85, 0.4]] as const) {
    lp.cyl(x, 2.78 - len, -0.4, 0.006, 0.006, len, 3, '#c9b48a');
    lp.push([x, 2.78 - len, -0.4], 0, Math.PI).cyl(0, -0.02, 0, 0.03, 0.09, 0.2, 5, r.pick([LPC.dry, LPC.moss, '#7a6a3a']), { vary: 0.15 }).pop();
    if (r.chance(0.5)) for (let i = 0; i < 3; i++) lp.blob(x + (i - 1) * 0.05, 2.78 - len - 0.2 - (i % 2) * 0.04, -0.38, 0.035, 0.04, 0.035, '#e8e0cc', { detail: 0 });
  }
  // orologio a muro, fermo a mezzanotte
  lp.push([2.5, 2.2, -1.27], 0, Math.PI / 2);
  lp.cyl(0, 0, 0, 0.2, 0.2, 0.05, 10, LPC.woodDark).cyl(0, 0.05, 0, 0.16, 0.16, 0.01, 10, '#e8dcc0');
  lp.box(0, 0.06, -0.06, 0.02, 0.01, 0.13, LPC.charcoal).box(0, 0.06, -0.04, 0.025, 0.01, 0.09, LPC.charcoal);
  lp.pop();
  // davanti a sinistra una botte con le zucche, e due ossa per terra
  lp.cyl(-2.95, 0, 0.3, 0.27, 0.27, 0.62, 8, LPC.wood, { vary: 0.12 }).cyl(-2.95, 0.1, 0.3, 0.285, 0.285, 0.04, 8, LPC.iron).cyl(-2.95, 0.5, 0.3, 0.285, 0.285, 0.04, 8, LPC.iron);
  pumpkin(-3.0, 0.62, 1.3, 0.3); pumpkin(-2.62, 0, 1.1, 0.55);
  for (const [x, a] of [[-2.2, 0.4], [-2.05, -0.5]] as const) lp.push([x, 0.03, 0.75], a, 0, Math.PI / 2).cyl(0, -0.1, 0, 0.018, 0.018, 0.2, 4, LPC.bone).blob(0, -0.1, 0, 0.035, 0.03, 0.035, LPC.bone, { detail: 0 }).blob(0, 0.1, 0, 0.035, 0.03, 0.035, LPC.bone, { detail: 0 }).pop();
  // sotto la finestra un calderone che ribolle di verde spettrale
  lp.cyl(0.32, 0.02, -0.95, 0.24, 0.3, 0.34, 7, LPC.iron, { vary: 0.08 }).cyl(0.32, 0.34, -0.95, 0.27, 0.25, 0.05, 7, LPC.ironLight);
  for (const a of [0.5, 2.6, 4.7]) lp.cyl(0.32 + Math.cos(a) * 0.2, 0, -0.95 + Math.sin(a) * 0.2, 0.03, 0.03, 0.06, 4, LPC.iron);
  lp.cyl(0.32, 0.36, -0.95, 0.22, 0.22, 0.02, 7, '#7fe0b8', { bucket: 'glow' });
  for (const [dx, dz, r0] of [[-0.06, 0.02, 0.05], [0.08, -0.05, 0.035], [0.02, 0.08, 0.03]] as const) lp.blob(0.32 + dx, 0.4, -0.95 + dz, r0, r0, r0, '#b6f5da', { bucket: 'glow', detail: 0 });
  // casse e un sacco accanto alla mensola, con una zucca sopra
  lp.push([-1.32, 0, -0.95], 0.12).box(0, 0, 0, 0.42, 0.36, 0.38, LPC.wood, { bevel: 0.015, vary: 0.12 }).box(0, 0.12, 0.195, 0.4, 0.04, 0.01, LPC.woodDark).pop();
  lp.push([-1.28, 0.36, -0.98], -0.2).box(0, 0, 0, 0.32, 0.26, 0.3, LPC.woodLight, { bevel: 0.012, vary: 0.12 }).pop();
  lp.blob(-1.26, 0.72, -0.98, 0.11, 0.09, 0.11, '#d9772f', { detail: 1 }).cyl(-1.26, 0.79, -0.98, 0.012, 0.012, 0.05, 4, LPC.leaf);
  lp.blob(-0.95, 0.16, -1.0, 0.17, 0.17, 0.15, LPC.dry, { detail: 1 }).cyl(-0.95, 0.3, -1.0, 0.05, 0.03, 0.08, 5, LPC.dryDark);
  // bara in piedi appoggiata alla parete, a sinistra in fondo
  lp.push([-3.75, 0, -1.0], 0.15, -0.08).extrude(coffinShape(), 0.26, LPC.woodDark, { bevel: 0.015 }).pop();
  // pala e scopa appoggiate al bancone, una ragnatela nell'angolo
  lp.push([2.95, 0, 0.42], 0, 0, 0.18).cyl(0, 0, 0, 0.02, 0.02, 1.1, 4, LPC.woodLight).cyl(0, -0.02, 0, 0.09, 0.03, 0.22, 5, LPC.dry).pop();
  for (let i = 0; i < 4; i++) lp.push([3.15, 2.7, -1.2], 0, 0, -0.4 - i * 0.35).box(0, -0.5, 0, 0.008, 0.5, 0.008, '#c9c3b5').pop();
  return lp.build();
}

// i modelli si costruiscono una volta sola e si riusano a ogni apertura della Bottega
const models = new Map<string, LPModel>();
function place(key: string, build: () => LPModel): THREE.Group {
  let m = models.get(key);
  if (!m) { m = build(); models.set(key, m); }
  return instantiate({ geometries: m.geometries, lights: [], height: 1, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: false });
}

function coffinShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.17, 0); s.lineTo(0.17, 0); s.lineTo(0.27, 1.25); s.lineTo(0.19, 1.65); s.lineTo(-0.19, 1.65); s.lineTo(-0.27, 1.25); s.closePath();
  return s;
}

/** Lanterna appesa alla trave, con la sua catena. */
function hangingLantern(x: number, drop: number): THREE.Group {
  const g = place(`lanterna:${x}:${drop}`, () => lanternModel(x, drop));
  g.position.set(x, 2.78 - drop, -0.4);
  return g;
}

function lanternModel(x: number, drop: number): LPModel {
  const lp = new LP(`testata-lanterna:${x}`);
  lp.cyl(0, 0, 0, 0.012, 0.012, drop, 3, LPC.iron);
  lp.push([0, -0.42, 0]);
  lp.box(0, 0, 0, 0.26, 0.04, 0.26, LPC.iron).box(0, 0.04, 0, 0.2, 0.28, 0.2, LPC.lantern, { bucket: 'glow' });
  for (const [dx, dz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) lp.box(dx, 0.04, dz, 0.03, 0.28, 0.03, LPC.iron);
  lp.cyl(0, 0.32, 0, 0.19, 0.03, 0.12, 4, LPC.iron).cyl(0, 0.44, 0, 0.02, 0.02, drop - 0.02, 3, LPC.iron);
  lp.pop();
  return lp.build();
}

/** Il giro dello zombie: dove va, cosa fa e verso dove guarda quando arriva. */
const ROUTE: Array<{ x: number; z: number; y?: number; pose: Pose; hold: number; face: number }> = [
  { x: -2.25, z: -0.45, pose: 'work', hold: 3.2, face: Math.PI }, // spolvera le mensole
  { x: -0.4, z: -0.1, pose: 'idle', hold: 1.6, face: 0 }, // si gira verso di noi
  { x: 0.42, z: -0.62, pose: 'idle', hold: 0, face: Math.PI / 2 }, // gira attorno al bancone
  { x: 1.75, z: -0.62, y: 0.24, pose: 'cheer', hold: 1.8, face: 0 }, // sale sul gradino dietro al bancone e saluta
  { x: 1.75, z: -0.62, y: 0.24, pose: 'idle', hold: 2.4, face: 0 },
  { x: 0.42, z: -0.62, pose: 'idle', hold: 0, face: -Math.PI / 2 },
  { x: -0.35, z: -0.72, pose: 'idle', hold: 1.6, face: Math.PI }, // guarda fuori dalla finestra
];

export interface ShopHeader { el: HTMLElement; stop: () => void }

/** Crea la testata; si ferma (e libera la scheda video) quando esce dal documento. */
export function shopHeader(): ShopHeader {
  const el = document.createElement('div');
  el.className = 'drawer-hero shop-hero';
  const canvas = document.createElement('canvas');
  el.append(canvas);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch {
    el.classList.add('static'); // senza WebGL resta il fondo dipinto in CSS
    return { el, stop: () => undefined };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b1618');
  scene.fog = new THREE.Fog('#1b1618', 8, 14);
  scene.add(new THREE.HemisphereLight('#8796c0', '#3a2a20', 0.5));
  const front = new THREE.DirectionalLight('#ffe6c8', 0.32);
  front.position.set(-1.5, 2.5, 5);
  scene.add(front);
  const moon = new THREE.PointLight('#8fb0e0', 2.2, 4, 1.6);
  moon.position.set(-0.35, 1.8, -0.6);
  scene.add(moon);
  const lamps = [-1.25, 1.75].map((x, i) => {
    const l = new THREE.PointLight('#ffb062', 7, 6.5, 1.7);
    l.position.set(x, i ? 2.15 : 1.95, -0.2);
    scene.add(l, hangingLantern(x, i ? 0.35 : 0.55));
    return l;
  });
  const jarGlow = new THREE.PointLight(SPECTRAL, 2, 2.4, 1.6);
  jarGlow.position.set(-2.4, 1.4, -0.6);
  // il calderone illumina di verde da sotto, le candele del bancone di caldo
  const brew = new THREE.PointLight('#7fe0b8', 3, 2.6, 1.6);
  brew.position.set(0.32, 0.75, -0.7);
  const candles = new THREE.PointLight('#ffb060', 2.2, 2.4, 1.6);
  candles.position.set(2.45, 1.05, 0.35);
  scene.add(brew, candles);
  scene.add(jarGlow, place('stanza', shopRoomModel));

  // fuochi fatui che girano tra le mensole
  const wisps = Array.from({ length: 3 }, (_, i) => {
    const g = place(`fuoco:${i}`, () => new LP(`testata-fuoco:${i}`).blob(0, 0, 0, 0.05, 0.075, 0.05, SPECTRAL, { bucket: 'glow', detail: 1 }).build());
    scene.add(g);
    return g;
  });

  // un gatto nero acciambellato sulla mensola dietro al bancone
  let cat: Rig | null = null;
  try {
    cat = buildRig('cat', 'lowpoly');
    cat.root.scale.setScalar(0.68);
    cat.root.position.set(1.72, 1.58, -1.12);
    cat.root.rotation.y = 0.7;
    scene.add(cat.root);
  } catch { cat = null; }

  let rig: Rig | null = null;
  try {
    rig = buildRig('zombie', 'lowpoly');
    rig.root.scale.setScalar(0.88);
    rig.root.position.set(ROUTE[0].x, 0, ROUTE[0].z);
    scene.add(rig.root);
  } catch { rig = null; }

  const camera = new THREE.PerspectiveCamera(27, 2.4, 0.1, 30);
  camera.position.set(-0.15, 1.58, 6.4);
  camera.lookAt(-0.15, 1.4, -0.4);

  // stato del giro
  let leg = 0, hold = ROUTE[0].hold, phase = 0, facing = ROUTE[0].face;
  let last = 0, t = 0, raf = 0, stopped = false, w = 0, h = 0;

  const resize = () => {
    const nw = el.clientWidth, nh = el.clientHeight;
    if (!nw || !nh || (nw === w && nh === h)) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // sullo schermo stretto si allarga l'inquadratura, così mensole e bancone restano dentro
    camera.fov = THREE.MathUtils.clamp(20 * (2.4 / camera.aspect), 18, 32);
    camera.updateProjectionMatrix();
  };

  const step = (dt: number) => {
    t += dt;
    for (const [i, l] of lamps.entries()) l.intensity = 7 * (0.9 + Math.sin(t * 9 + i * 2) * 0.04 + Math.sin(t * 23 + i) * 0.03);
    candles.intensity = 2.2 * (0.88 + Math.sin(t * 13) * 0.06 + Math.sin(t * 31) * 0.05);
    brew.intensity = 3 * (0.85 + Math.sin(t * 2.3) * 0.12);
    if (cat) animateRig(cat, 'idle', t, 0);
    wisps.forEach((g, i) => {
      const a = t * (0.35 + i * 0.12) + i * 2.1;
      g.position.set(-2.35 + Math.sin(a) * 0.75, 1.0 + i * 0.45 + Math.sin(a * 1.7) * 0.12, -0.75 + Math.cos(a) * 0.12);
    });
    if (!rig) return;
    const target = ROUTE[leg];
    const p = rig.root.position;
    const dx = target.x - p.x, dz = target.z - p.z, dist = Math.hypot(dx, dz);
    let pose: Pose = target.pose;
    if (dist > 0.02) {
      // cammina zoppicando verso la tappa
      pose = 'walk';
      phase += dt * 3.2;
      const v = Math.min(dist, dt * 0.62 * zombieLurch(phase) * 1.6);
      p.x += (dx / dist) * v; p.z += (dz / dist) * v;
      // il gradino dietro al bancone: sale e scende mentre cammina
      const dy = (target.y ?? 0) - p.y;
      p.y += Math.sign(dy) * Math.min(Math.abs(dy), v * 0.4);
      facing = Math.atan2(dx, dz);
    } else {
      // arrivato: si gira piano verso dove deve guardare, poi aspetta
      const d = Math.atan2(Math.sin(target.face - facing), Math.cos(target.face - facing));
      facing += d * Math.min(1, dt * 5);
      if (Math.abs(d) > 0.3) pose = 'idle';
      hold -= dt;
      if (hold <= 0) { leg = (leg + 1) % ROUTE.length; hold = ROUTE[leg].hold; }
    }
    rig.root.rotation.y = facing;
    animateRig(rig, pose, t, phase);
  };

  const frame = () => {
    if (stopped) return;
    const now = performance.now();
    if (!el.isConnected) { stop(); return; }
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 1000 / FPS - 2) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / FPS;
    last = now;
    resize();
    step(dt);
    renderer.render(scene, camera);
  };

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    // geometrie e materiali dei modelli condivisi restano al gioco: si libera solo questo renderer
    renderer.dispose();
    renderer.forceContextLoss();
  }

  // la prima immagine subito, poi l'animazione
  requestAnimationFrame(() => { resize(); step(0); renderer.render(scene, camera); last = performance.now(); raf = requestAnimationFrame(frame); });
  return { el, stop };
}
