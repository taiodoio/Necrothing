// Le casette degli animali, una per specie (2×2, porta verso +z come la
// cuccia): il cane ha la sua cuccia (extras.ts), il gatto una cuccia a igloo
// col tiragraffi, il coniglio una conigliera su zampe con la rampa, la papera
// una casetta bassa accanto alla pozza, il corvo un trespolo col nido.
// L'apertura scura sta dove la tana disegna gli occhietti (vedi PET_DENS).

import * as THREE from 'three';
import { LP, gothicArchShape, irregularShape, roundTopShape, type LPModel } from './kit.ts';
import { grassTuft, pebbles } from './details.ts';
import { decayLP } from './lights.ts';
import { frontGable, gableRoof } from './architecture.ts';
import { LPC } from './palette.ts';
import type { PVis } from '../types.ts';

/**
 * Dove dormono (rispetto al centro della casetta): gli occhietti nel buio
 * dell'apertura. Il corvo non ha tana: dorme sul nido, in vista.
 */
export const PET_DENS: ReadonlyArray<[number, number, number] | null> = [
  [0, 0.26, 0.335], // cane
  [-0.12, 0.24, 0.345], // gatto
  [0.18, 0.47, 0.305], // coniglio
  [-0.32, 0.2, 0.135], // papera
  null, // corvo
];
/** Dove si posa il corvo, sul nido in cima al trespolo. */
export const CROW_NEST: [number, number, number] = [-0.15, 1.32, -0.15];

/** Ciotola con qualcosa dentro (osso, lisca, carota). */
function bowl(lp: LP, x: number, z: number, food: (lp: LP) => void, color: string = LPC.iron) {
  lp.lathe(x, 0, z, [[0, 0], [0.09, 0], [0.12, 0.06], [0.1, 0.07], [0, 0.04]], 8, color, { jitter: 0 });
  lp.push([x, 0.07, z]); food(lp); lp.pop();
}

/** Gatto: cuccia a igloo di feltro con le orecchie, cuscino, tiragraffi con la piattaforma e un gomitolo. */
function catHouse(lp: LP) {
  const FELT = '#5b4d6b', FELT_D = '#463b54';
  lp.cyl(-0.12, 0, -0.17, 0.56, 0.58, 0.06, 14, '#8a3a46', { jitter: 0 }); // cuscino sotto
  lp.push([-0.12, 0.05, -0.17]);
  lp.lathe(0, 0, 0, [[0.5, 0], [0.52, 0.12], [0.49, 0.3], [0.4, 0.48], [0.26, 0.6], [0.1, 0.66], [0, 0.67]], 14, FELT, { vary: 0.05, ao: 0.15 });
  for (const s of [-1, 1]) lp.push([s * 0.24, 0.52, 0.02], 0, 0, -s * 0.5).cyl(0, 0, 0, 0.11, 0, 0.22, 4, FELT_D, { jitter: 0 }).pop(); // orecchie sulla cupola
  lp.pop();
  lp.push([-0.12, 0.05, 0.33]).plate(roundTopShape(0.34, 0.38, 8), 0.02, '#141118', { ao: 0 }).pop(); // ingresso tondo
  lp.push([-0.12, 0.04, 0.34]).lathe(0, 0, 0, [[0.2, 0], [0.22, 0.02], [0.2, 0.04]], 12, FELT_D, { jitter: 0 }).pop();
  // tiragraffi: base, palo di corda, piattaforma col cuscinetto, pallina appesa
  const PX = 0.58, PZ = -0.42;
  lp.box(PX, 0, PZ, 0.42, 0.06, 0.42, LPC.woodDark, { bevel: 0.01 });
  lp.cyl(PX, 0.06, PZ, 0.07, 0.07, 0.95, 8, '#c9b48a', { vary: 0.08 });
  for (let y = 0.12; y < 1.0; y += 0.07) lp.cyl(PX, y, PZ, 0.074, 0.074, 0.012, 8, '#a8936a', { jitter: 0 });
  lp.box(PX, 1.0, PZ, 0.46, 0.05, 0.46, LPC.wood, { bevel: 0.01 });
  lp.blob(PX, 1.08, PZ, 0.19, 0.04, 0.19, '#8a3a46', { detail: 1 });
  lp.cyl(PX + 0.2, 0.74, PZ + 0.2, 0.004, 0.004, 0.26, 3, '#d8cdb0', { jitter: 0 });
  lp.blob(PX + 0.2, 0.72, PZ + 0.2, 0.05, 0.05, 0.05, '#d36a5a', { detail: 1 });
  // gomitolo e ciotola con la lisca
  lp.blob(0.42, 0.07, 0.52, 0.08, 0.075, 0.08, '#6f8fbf', { detail: 1 });
  bowl(lp, 0.6, 0.15, (q) => { q.box(0, 0, 0, 0.13, 0.008, 0.012, LPC.bone, { jitter: 0 }); for (let i = -2; i <= 2; i++) q.box(i * 0.022, 0, 0, 0.006, 0.006, 0.06, LPC.bone, { jitter: 0 }); });
}

/** Coniglio: conigliera su zampe, metà rete e metà porta, tetto a una falda, rampa, fieno e carota. */
function rabbitHouse(lp: LP) {
  const W = 1.05, D = 0.7, Y0 = 0.22, H = 0.55, Z = -0.05;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lp.box(sx * (W / 2 - 0.05), 0, Z + sz * (D / 2 - 0.05), 0.08, Y0, 0.08, LPC.woodDark, { jitter: 0 });
  lp.box(0, Y0, Z, W, 0.05, D, LPC.woodDark, { bevel: 0.01 });
  lp.box(0, Y0 + 0.05, Z - 0.02, W, H, D - 0.04, LPC.woodLight, { bevel: 0.012, vary: 0.06, ao: 0.2 });
  // davanti: a sinistra la rete (sbarre su fondo scuro), a destra l'apertura ad arco
  lp.box(-0.25, Y0 + 0.1, Z + D / 2 - 0.02, 0.42, 0.42, 0.01, '#1c1a1e', { jitter: 0, ao: 0 });
  for (let x = -0.42; x <= -0.08; x += 0.06) lp.box(x, Y0 + 0.1, Z + D / 2, 0.012, 0.42, 0.012, '#8a8f96', { jitter: 0, ao: 0 });
  for (const y of [Y0 + 0.24, Y0 + 0.38]) lp.box(-0.25, y, Z + D / 2, 0.42, 0.012, 0.012, '#8a8f96', { jitter: 0, ao: 0 });
  lp.push([0.18, Y0 + 0.07, Z + D / 2 - 0.005]).plate(gothicArchShape(0.3, 0.38, 5), 0.02, '#141210', { ao: 0 }).pop();
  for (const x of [-0.5, 0.5]) lp.box(x, Y0 + 0.05, Z + D / 2, 0.06, H, 0.03, LPC.wood, { jitter: 0 }); // montanti
  // tetto a una falda (più alto dietro), con le assi
  lp.push([0, Y0 + H + 0.05, Z], 0, -0.2).box(0, 0, 0, W + 0.18, 0.06, D + 0.22, '#5a4a6a', { bevel: 0.01, vary: 0.06 }).pop();
  for (let x = -0.45; x <= 0.46; x += 0.15) lp.push([x, Y0 + H + 0.1, Z], 0, -0.2).box(0, 0, 0, 0.01, 0.012, D + 0.2, '#463a54', { jitter: 0 }).pop();
  // rampa con i listelli fino a terra
  lp.push([0.18, Y0 * 0.5 + 0.02, Z + D / 2 + 0.2], 0, 0.58).box(0, -0.015, 0, 0.26, 0.03, 0.46, LPC.wood, { bevel: 0.005 }).pop();
  for (let k = 0; k < 4; k++) lp.push([0.18, 0.05 + k * 0.045, Z + D / 2 + 0.37 - k * 0.08], 0, 0.58).box(0, 0, 0, 0.26, 0.016, 0.02, LPC.woodDark, { jitter: 0 }).pop();
  // fieno e carota
  lp.box(-0.62, 0, 0.52, 0.32, 0.22, 0.24, '#c9a75e', { bevel: 0.02, vary: 0.1 });
  lp.box(-0.62, 0.08, 0.64, 0.33, 0.02, 0.01, '#8d805c', { jitter: 0 });
  lp.push([0.55, 0.04, 0.6], 0.6, 0, Math.PI / 2).cyl(0, -0.09, 0, 0.035, 0.008, 0.18, 6, '#e07a2a', { jitter: 0 }).pop();
  for (const s of [-1, 1]) lp.push([0.55 + 0.09, 0.05, 0.6 + s * 0.02], 0.6, 0, Math.PI / 2 - s * 0.4).cyl(0, 0, 0, 0.008, 0.003, 0.08, 3, '#5f8a4a', { jitter: 0 }).pop();
}

/** Papera: casetta bassa a capanna con l'ingresso ad arco, accanto a una pozza con le canne e una ninfea. */
function duckHouse(lp: LP) {
  const X = -0.32, Z = -0.18;
  lp.box(X, 0, Z, 0.78, 0.06, 0.78, LPC.woodDark, { bevel: 0.01 });
  lp.push([X, 0.06, Z]);
  lp.box(0, 0, 0, 0.62, 0.32, 0.62, '#d8cdb0', { bevel: 0.01, vary: 0.05, ao: 0.2 });
  gableRoof(lp, 0.62, 0.62, 0.32, 0.3, '#3f6a6e', 0.09, true, '#2f5458');
  for (const zz of [0.31, -0.31]) frontGable(lp, zz, 0.62, 0.32, 0.3, '#d8cdb0', 0.03);
  lp.pop();
  lp.push([X, 0.07, Z + 0.315]).plate(roundTopShape(0.26, 0.28, 7), 0.02, '#141210', { ao: 0 }).pop();
  lp.push([X, 0.04, Z + 0.47], 0, 0.35).box(0, 0, 0, 0.22, 0.02, 0.24, LPC.wood, { jitter: 0 }).pop(); // scivolo
  // la pozza: acqua, bordo di sassi, canne e ninfea
  const PX = 0.4, PZ = 0.3;
  lp.push([PX, 0.012, PZ], 0, -Math.PI / 2).plate(irregularShape(lp.rng, 0.42, 9, 0.85), 0.012, '#3e6f78', { jitter: 0, ao: 0, vary: 0.02 }).pop();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    lp.blob(PX + Math.cos(a) * 0.43, 0.03, PZ + Math.sin(a) * 0.37, 0.07, 0.04, 0.06, i % 2 ? LPC.stone : LPC.stoneLight, { detail: 0 });
  }
  for (const [x, z, h] of [[0.72, 0.0, 0.42], [0.78, 0.1, 0.32], [0.66, -0.06, 0.36]] as const) {
    lp.cyl(x, 0, z, 0.012, 0.008, h, 4, LPC.mossBright, { jitter: 0 });
    lp.cyl(x, h - 0.12, z, 0.022, 0.022, 0.1, 5, '#6b4a2e', { jitter: 0 });
  }
  lp.push([PX - 0.1, 0.03, PZ + 0.1]).plate(new THREE.Shape().absarc(0, 0, 0.08, 0.3, Math.PI * 2, false), 0.008, '#5f8a4a', { jitter: 0 }).pop();
  lp.blob(PX - 0.1, 0.045, PZ + 0.1, 0.025, 0.02, 0.025, '#d9a3b8', { detail: 0 });
  // briciole di pane in una ciotola
  bowl(lp, -0.62, 0.58, (q) => { for (const [x, z] of [[-0.03, 0], [0.03, 0.02], [0, -0.03]]) q.box(x, -0.01, z, 0.04, 0.025, 0.035, '#c9a75e', { bevel: 0.005 }); });
}

/** Corvo: trespolo con base a croce, palo, traversa e nido in cima; piume e un teschietto ai piedi. */
function crowPerch(lp: LP) {
  const [NX, NY, NZ] = CROW_NEST;
  lp.box(NX, 0, NZ, 0.7, 0.07, 0.14, LPC.woodDark, { bevel: 0.01 });
  lp.box(NX, 0, NZ, 0.14, 0.07, 0.7, LPC.woodDark, { bevel: 0.01 });
  lp.cyl(NX, 0.07, NZ, 0.05, 0.04, NY - 0.12, 6, LPC.wood, { vary: 0.06 });
  // un ramo storto a metà, e la traversa sotto il nido
  lp.push([NX, 0.75, NZ], 0.6, 0, -0.9).cyl(0, 0, 0, 0.022, 0.012, 0.36, 5, LPC.wood, { jitter: 0 }).pop();
  lp.push([NX, NY - 0.2, NZ], 0, 0, Math.PI / 2).cyl(0, -0.3, 0, 0.026, 0.026, 0.6, 5, LPC.woodDark, { jitter: 0 }).pop();
  for (const s of [-1, 1]) lp.blob(NX + s * 0.3, NY - 0.2, NZ, 0.035, 0.035, 0.035, LPC.woodDark, { detail: 0 });
  // nido: ciotola di rametti
  lp.lathe(NX, NY - 0.12, NZ, [[0.05, 0], [0.2, 0.03], [0.26, 0.1], [0.24, 0.15], [0.16, 0.1], [0.05, 0.08]], 10, '#5a4330', { vary: 0.12 });
  const r = lp.rng;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    lp.push([NX + Math.cos(a) * 0.23, NY + 0.0, NZ + Math.sin(a) * 0.23], -a, r.range(-0.3, 0.3), Math.PI / 2 + r.range(-0.3, 0.3)).cyl(0, -0.09, 0, 0.007, 0.007, 0.18, 3, i % 2 ? '#6b4a2e' : '#7a5a3a', { jitter: 0 }).pop();
  }
  // un lumino appeso alla traversa, piume e un teschietto ai piedi
  lp.cyl(NX + 0.26, NY - 0.38, NZ, 0.004, 0.004, 0.18, 3, LPC.iron, { jitter: 0 });
  lp.box(NX + 0.26, NY - 0.5, NZ, 0.08, 0.12, 0.08, LPC.iron, { bevel: 0.01 });
  lp.box(NX + 0.26, NY - 0.48, NZ, 0.06, 0.08, 0.085, LPC.lantern, { bucket: 'glow', jitter: 0 });
  lp.light(NX + 0.26, NY - 0.45, NZ, LPC.lantern, 0.6, 2.4, 0.2, 0.6);
  for (const [x, z, a] of [[0.35, 0.45, 0.4], [0.5, 0.3, 1.7], [-0.5, 0.5, 2.6]] as const) lp.push([x, 0.012, z], a, -Math.PI / 2 + 0.1).blob(0, 0, 0, 0.025, 0.08, 0.008, '#22232b', { detail: 0 }).pop();
  lp.push([0.42, 0, 0.12], -0.5).blob(0, 0.07, 0, 0.07, 0.07, 0.075, LPC.bone, { detail: 1 }).pop();
  for (const s of [-1, 1]) lp.blob(0.42 + s * 0.025, 0.08, 0.18, 0.016, 0.018, 0.01, LPC.charcoal, { jitter: 0 });
  pebbles(lp, -0.7, 0.3, 0.7, 0.75, 6);
}

/** Casetta di una specie (0 cane è in extras.ts). */
export function speciesHouseLP(v: PVis, kind: number): LPModel {
  const lp = new LP(`lp:pethouse${kind}:${v.seed}:${v.dirty}${v.broken}`);
  if (kind === 1) catHouse(lp);
  else if (kind === 2) rabbitHouse(lp);
  else if (kind === 3) duckHouse(lp);
  else crowPerch(lp);
  grassTuft(lp, -0.7, 0.68, 1.0);
  decayLP(lp, v, 1.8, 1.8);
  return lp.build();
}
