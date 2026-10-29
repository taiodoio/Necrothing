// Presenze che sostituiscono zombie e fantasmi erranti (che il gioco porta già
// da sé): lo spaventapasseri che segue il Custode con lo sguardo e l'angolo
// dello scheletro giardiniere.

import * as THREE from 'three';
import { LP, type LPModel } from './kit.ts';
import { deadLeaves, grassTuft, pebbles, pumpkin, weeds } from './details.ts';
import { LPC } from './palette.ts';

const STRAW = ['#d6b45c', '#c49a45', '#e2c779'] as const;
const COAT = '#5d4a3c';

/** Ciuffo di paglia: steli sottili che escono dal punto dato verso `dir` (in gradi sul piano verticale). */
function straw(lp: LP, x: number, y: number, z: number, ry: number, rx: number, n = 5, len = 0.1) {
  const r = lp.rng;
  for (let i = 0; i < n; i++) {
    lp.push([x, y, z], ry + r.range(-0.4, 0.4), rx + r.range(-0.35, 0.35));
    lp.cyl(0, 0, 0, 0.012, 0.003, len * r.range(0.75, 1.2), 3, r.pick(STRAW), { jitter: 0, ao: 0 });
    lp.pop();
  }
}

/** Lo spaventapasseri è più alto del Custode: il modello si disegna in scala. */
export const SCARECROW_SCALE = 1.3;
/** Quota del collo (già in scala): lì poggia e ruota la testa. */
export const SCARECROW_NECK = 1.1 * SCARECROW_SCALE;

/**
 * Spaventapasseri (corpo): palo, traversa, giacca rattoppata e paglia. La testa
 * è un modello a parte (`scarecrowHeadLP`) che ruota sul collo; di notte la sua
 * luce sta qui, nel corpo, così non si sposta quando la testa gira.
 */
export function scarecrowBodyLP(lit = false): LPModel {
  const lp = new LP('new:scarecrow');
  const r = lp.rng;
  lp.push([0, 0, 0], 0, 0, 0, SCARECROW_SCALE);
  // terra smossa, erbacce e due zucchette ai piedi
  lp.blob(0, 0, 0, 0.42, 0.06, 0.42, LPC.soil, { detail: 1, jitter: 0.02 });
  weeds(lp, -0.3, 0.25, 0.8); weeds(lp, 0.33, -0.22, 0.7); grassTuft(lp, 0.28, 0.3, 0.9); grassTuft(lp, -0.32, -0.28, 0.8);
  pumpkin(lp, 0.26, 0.03, 0.22, 0.07, false, false, 0.6, 0);
  pumpkin(lp, -0.2, 0.03, 0.3, 0.055, false, false, -0.4, 0);
  pebbles(lp, -0.4, -0.4, 0.4, 0.4, 3);
  // palo e traversa
  lp.cyl(0, 0, 0, 0.04, 0.035, SCARECROW_NECK + 0.04, 6, LPC.woodDark, { vary: 0.1 });
  lp.push([0, 1.0, -0.02], 0, 0, Math.PI / 2).cyl(0, -0.46, 0, 0.026, 0.026, 0.92, 6, LPC.wood, { vary: 0.1 }).pop();
  // giacca: svasata in basso, spalle strette sulla traversa
  lp.lathe(0, 0.56, 0, [[0.0, 0], [0.2, 0], [0.205, 0.04], [0.17, 0.22], [0.155, 0.4], [0.12, 0.47], [0.05, 0.5], [0.0, 0.5]], 9, COAT, { vary: 0.1, jitter: 0.012 });
  // maniche lungo la traversa, con la paglia che esce dai polsi
  for (const s of [-1, 1]) {
    lp.push([s * 0.1, 1.0, -0.02], 0, 0, -s * Math.PI / 2);
    lp.cyl(0, 0, 0, 0.075, 0.06, 0.3, 7, COAT, { vary: 0.1, jitter: 0.008 });
    lp.cyl(0, 0.27, 0, 0.064, 0.064, 0.035, 7, '#4a3a2f', { jitter: 0 });
    lp.pop();
    straw(lp, s * 0.41, 1.0, -0.02, 0, 0, 0);
    for (let i = 0; i < 5; i++) {
      lp.push([s * 0.4, 1.0 + r.range(-0.03, 0.03), -0.02 + r.range(-0.03, 0.03)], 0, r.range(-0.4, 0.4), -s * (Math.PI / 2 + r.range(-0.5, 0.6)));
      lp.cyl(0, 0, 0, 0.011, 0.003, r.range(0.07, 0.12), 3, r.pick(STRAW), { jitter: 0, ao: 0 });
      lp.pop();
    }
  }
  // paglia dall'orlo della giacca, verso il basso e in fuori
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + r.range(-0.15, 0.15);
    straw(lp, Math.cos(a) * 0.17, 0.6, Math.sin(a) * 0.17, Math.atan2(Math.cos(a), Math.sin(a)), Math.PI - 0.35, 2, 0.11);
  }
  // corda in vita, toppe cucite, bottoni spaiati
  lp.cyl(0, 0.68, 0, 0.19, 0.185, 0.028, 10, '#a08850', { jitter: 0 });
  lp.push([0.06, 0.78, 0.168], 0, -0.12).box(0, 0, 0, 0.075, 0.075, 0.012, LPC.red, { jitter: 0, ao: 0 }).pop();
  lp.push([-0.12, 0.88, 0.13], -0.65, -0.2).box(0, 0, 0, 0.06, 0.06, 0.012, '#6a7a4a', { jitter: 0, ao: 0 }).pop();
  for (const [x, y, z] of [[0.2, 0.98, 0.04], [-0.27, 1.0, 0.045]] as const) lp.box(x, y - 0.03, z + 0.03, 0.06, 0.06, 0.012, '#8a6a48', { jitter: 0, ao: 0 });
  for (const [y, c] of [[0.92, '#c9a227'], [0.83, '#8e2f2a'], [0.73, '#c8c0ad']] as const) lp.blob(-0.015, y, 0.165 - (0.92 - y) * 0.06, 0.016, 0.016, 0.01, c, { jitter: 0 });
  // colletto di paglia
  straw(lp, 0, 1.04, 0, 0, 0.9, 4, 0.08); straw(lp, 0, 1.04, 0, Math.PI, 0.9, 4, 0.08);
  straw(lp, 0, 1.04, 0, Math.PI / 2, 0.9, 3, 0.08); straw(lp, 0, 1.04, 0, -Math.PI / 2, 0.9, 3, 0.08);
  lp.pop();
  if (lit) lp.light(0, SCARECROW_NECK + 0.15, 0.15, '#ff9a3c', 0.45, 2.6, 0.35, 0.6);
  return lp.build();
}

/** Testa dello spaventapasseri (origine sul collo): zucca intagliata e cappellaccio storto. Di notte la zucca si accende. */
export function scarecrowHead(lp: LP, lit: boolean) {
  lp.push([0, 0, 0], 0, 0, 0, SCARECROW_SCALE);
  pumpkin(lp, 0, -0.02, 0, 0.17, true, lit, 0, 1, false);
  // cappello floscio, un po' di lato
  lp.push([0.02, 0.22, -0.01], 0.3, -0.12, 0.14);
  lp.lathe(0, 0, 0, [[0.06, 0.02], [0.2, 0.0], [0.25, -0.025], [0.252, -0.012], [0.2, 0.014], [0.12, 0.03]], 12, '#4a3f35', { vary: 0.12, jitter: 0.012 });
  lp.lathe(0, 0.01, 0, [[0.13, 0], [0.125, 0.08], [0.1, 0.15], [0.06, 0.2], [0.0, 0.215]], 10, '#4a3f35', { vary: 0.12, jitter: 0.01 });
  lp.cyl(0, 0.015, 0, 0.133, 0.128, 0.035, 10, '#7a2f2a', { jitter: 0 });
  lp.pop();
  straw(lp, -0.15, 0.17, 0.03, -Math.PI / 2, 1.6, 4, 0.09);
  straw(lp, 0.12, 0.15, -0.1, Math.PI / 2, 1.7, 3, 0.08);
  lp.pop();
}

export function scarecrowHeadLP(lit: boolean): LPModel {
  const lp = new LP('new:scarecrowHead');
  scarecrowHead(lp, lit);
  return lp.build();
}

/** Dove si posa il corvo: in cima alla manica destra, vicino al polso (già in scala). */
export const SCARECROW_PERCH = new THREE.Vector3(0.33, 1.07, -0.02).multiplyScalar(SCARECROW_SCALE);

/** Angolo del giardiniere: mucchio di foglie, cesta di vimini, annaffiatoio. */
export function gardenerCornerLP(): LPModel {
  const lp = new LP('new:gardener');
  const r = lp.rng;
  // mucchio di foglie rastrellate: tante foglie piatte ammonticchiate
  const LEAVES = ['#c9782e', '#d99a3a', '#a0522d', '#b8862e', '#8e5a2e'];
  for (let i = 0; i < 46; i++) {
    const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * 0.17, h = (1 - d / 0.17) * 0.12;
    lp.push([0.12 + Math.cos(a) * d, 0.01 + h * r.range(0.6, 1), 0.1 + Math.sin(a) * d], r.range(0, 6.3), r.range(-0.5, 0.5), r.range(-0.5, 0.5));
    lp.blob(0, 0, 0, r.range(0.035, 0.05), 0.008, r.range(0.022, 0.032), r.pick(LEAVES), { detail: 0, jitter: 0.004, ao: 0 });
    lp.pop();
  }
  lp.blob(0.12, 0.02, 0.1, 0.15, 0.05, 0.15, '#8e5a2e', { detail: 1, jitter: 0.02 });
  deadLeaves(lp, -0.45, -0.45, 0.45, 0.45, 16);
  // cesta di vimini piena di foglie
  lp.push([-0.24, 0, -0.2], 0.4);
  lp.lathe(0, 0, 0, [[0.0, 0], [0.11, 0], [0.13, 0.04], [0.14, 0.15], [0.125, 0.15], [0.115, 0.04], [0.0, 0.03]], 10, '#9a7a4a', { vary: 0.12 });
  for (let k = 0; k < 3; k++) lp.cyl(0, 0.03 + k * 0.045, 0, 0.137, 0.138, 0.012, 10, '#7a5c36', { jitter: 0, ao: 0 });
  for (let i = 0; i < 4; i++) lp.blob(r.range(-0.05, 0.05), 0.14, r.range(-0.05, 0.05), 0.07, 0.035, 0.07, r.pick(LPC.leafAutumn), { detail: 0, jitter: 0.01 });
  lp.pop();
  // annaffiatoio di latta
  lp.push([0.3, 0, -0.25], -0.8);
  lp.cyl(0, 0, 0, 0.075, 0.07, 0.13, 9, '#6f7d84', { vary: 0.08 });
  lp.push([0, 0.04, 0.06], 0, 0.85).cyl(0, 0, 0, 0.014, 0.01, 0.17, 5, '#6f7d84', { jitter: 0 }).pop();
  lp.push([0, 0.13, -0.02], 0, 0, Math.PI / 2).add(new THREE.TorusGeometry(0.05, 0.008, 4, 10, Math.PI).rotateY(Math.PI / 2), '#59666c', { jitter: 0 }).pop();
  lp.pop();
  grassTuft(lp, -0.38, 0.32, 0.8); weeds(lp, 0.38, 0.36, 0.6);
  return lp.build();
}

/**
 * Rastrello (origine al centro del pettine, manico lungo +y fino a `len`):
 * pettine orizzontale lungo x, denti verso -z (verso terra quando il manico è inclinato).
 */
export function rakeLP(len = 0.9): LPModel {
  const lp = new LP('new:rake');
  lp.cyl(0, 0, 0, 0.012, 0.011, len, 5, '#8a6a48', { jitter: 0, vary: 0.08 });
  lp.box(0, -0.015, 0, 0.28, 0.03, 0.03, '#4a535c', { bevel: 0.006, jitter: 0 });
  for (let i = -4; i <= 4; i++) {
    lp.push([i * 0.032, 0, 0], 0, -Math.PI / 2);
    lp.cyl(0, 0, 0, 0.007, 0.004, 0.08, 4, '#4a535c', { jitter: 0 });
    lp.pop();
  }
  return lp.build();
}
