// Il Custode da pipistrello (morso del vampiro): corpo, testa con le orecchie
// a punta, occhi rossi che brillano e due ali separate, perché sbattano.
// Guarda verso +z come gli altri personaggi.

import * as THREE from 'three';
import { LP, type LPModel } from './kit.ts';
import { LPC } from './palette.ts';
import { hangingLantern } from './details.ts';

const FUR = '#4a3d55', FUR_LIGHT = '#6a5a78', WING = '#5e4a70', BONE = '#33293d';

export function batBodyLP(): LPModel {
  const lp = new LP('bat:body');
  lp.blob(0, 0, 0, 0.13, 0.12, 0.17, FUR, { vary: 0.08, detail: 1 });
  lp.blob(0, -0.04, 0.04, 0.09, 0.07, 0.11, FUR_LIGHT, { detail: 1 }); // pancia
  lp.blob(0, 0.06, 0.17, 0.1, 0.09, 0.09, FUR, { detail: 1 });
  lp.blob(0, 0.03, 0.245, 0.04, 0.03, 0.03, FUR_LIGHT, { detail: 0 }); // muso
  for (const s of [-1, 1]) {
    lp.push([s * 0.055, 0.13, 0.15], 0, 0, -s * 0.35).cyl(0, 0, 0, 0.04, 0, 0.11, 4, FUR, { jitter: 0 }).pop();
    lp.blob(s * 0.037, 0.085, 0.24, 0.02, 0.022, 0.012, '#ff5a4a', { bucket: 'glow', detail: 0 });
    lp.box(s * 0.016, 0.0, 0.255, 0.008, 0.025, 0.008, LPC.bone, { jitter: 0 }); // zanne
    lp.cyl(s * 0.05, -0.12, -0.08, 0.012, 0.008, 0.06, 3, BONE, { jitter: 0 }); // zampette
  }
  return lp.build();
}

/** Ala destra (x positiva) col bordo a festoni; la sinistra è la stessa specchiata. Distesa sul piano orizzontale. */
export function batWingLP(): LPModel {
  const lp = new LP('bat:wing');
  // nel piano xy: y negativa = verso il muso (dopo la rotazione diventa +z)
  const s = new THREE.Shape();
  const pts: Array<[number, number]> = [[0, -0.08], [0.25, -0.15], [0.5, -0.13], [0.74, -0.03], [0.62, 0.12], [0.53, 0.05], [0.43, 0.22], [0.32, 0.12], [0.2, 0.26], [0.09, 0.16], [0, 0.18]];
  s.moveTo(...pts[0]);
  for (const p of pts.slice(1)) s.lineTo(...p);
  s.closePath();
  lp.push([0, 0, 0], 0, -Math.PI / 2).plate(s, 0.015, WING, { vary: 0.06 }).pop();
  // le «dita» dell'ala
  for (const [x, z] of [[0.74, 0.03], [0.53, -0.05], [0.32, -0.12]] as const) {
    const len = Math.hypot(x, z);
    lp.push([0, 0.012, 0], Math.atan2(-z, x) , 0, 0).box(len / 2, 0, 0, len, 0.012, 0.014, BONE, { jitter: 0 }).pop();
  }
  return lp.build();
}

/**
 * La lanterna del Custode, stretta tra le zampe del pipistrello: le zampette
 * chiuse sull'anello e la lanterna accesa che penzola sotto. L'origine è il
 * punto di presa (lì si appende al corpo e da lì oscilla).
 */
export function batLanternLP(): LPModel {
  const lp = new LP('bat:lantern');
  for (const s of [-1, 1]) {
    lp.push([s * 0.035, 0.05, 0], 0, 0, s * 0.35).cyl(0, -0.05, 0, 0.012, 0.016, 0.07, 4, BONE, { jitter: 0 }).pop();
    for (const k of [-1, 0, 1]) lp.blob(s * 0.018 + k * 0.006, -0.005, k * 0.01, 0.007, 0.007, 0.007, BONE, { jitter: 0, detail: 0 }); // artigli
  }
  lp.cyl(0, -0.012, 0, 0.03, 0.03, 0.012, 6, LPC.iron, { jitter: 0 }); // l'anello
  hangingLantern(lp, 0, 0.01, 0, true, 0.75);
  return lp.build();
}

/** Dove sta la fiamma, rispetto al punto di presa (per farci seguire la luce). */
export const BAT_LANTERN_FLAME = new THREE.Vector3(0, 0.01 - 0.26 * 0.75, 0);
