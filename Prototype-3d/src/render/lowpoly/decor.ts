// Piccole decorazioni low-poly del catalogo: corona su cavalletto, vaso,
// ossa, cartello (la scritta è una texture aggiunta da WorldView).

import { LP, type LPModel } from './kit.ts';
import * as THREE from 'three';
import { deadLeaves, moss, vase, wreath } from './details.ts';
import { LPC } from './palette.ts';
import type { PVis } from '../models/types.ts';

export function wreathLP(v: PVis): LPModel {
  const lp = new LP(`lp:wreath:${v.seed}:${v.dirty}`);
  // cavalletto di legno alto quasi quanto il Custode, corona grande e leggibile
  for (const sx of [-1, 1]) lp.push([sx * 0.26, 0, 0.08], 0, -0.18, sx * 0.14).cyl(0, 0, 0, 0.035, 0.03, 1.3, 5, LPC.woodDark, { jitter: 0, vary: 0.1 }).pop();
  lp.push([0, 0, -0.22], 0, 0.3).cyl(0, 0, 0, 0.03, 0.028, 1.25, 5, LPC.woodDark, { jitter: 0 }).pop();
  lp.box(0, 0.5, 0.02, 0.62, 0.04, 0.06, LPC.woodDark, { jitter: 0 });
  lp.push([0, 0.92, 0.14], 0, 0, 0, 2.6);
  wreath(lp, 0, 0, 0, -0.18, 1);
  // nastro a coda di rondine
  for (const s of [-1, 1]) lp.push([s * 0.03, -0.17, 0.035], 0, 0, s * 0.25).box(0, -0.1, 0, 0.035, 0.11, 0.008, LPC.red, { jitter: 0, ao: 0 }).pop();
  lp.pop();
  if (v.dirty) deadLeaves(lp, -0.4, -0.4, 0.4, 0.4, 6);
  return lp.build();
}

export function vaseLP(v: PVis): LPModel {
  const lp = new LP(`lp:vase:${v.seed}:${v.dirty}`);
  const o = v.dirty ? { topTint: LPC.moss, topAmount: 0.45 } : {};
  // piedistallo di pietra con cornice, vaso grande sopra
  lp.box(0, 0, 0, 0.62, 0.1, 0.62, LPC.stoneDark, { bevel: 0.02, ...o });
  lp.box(0, 0.1, 0, 0.46, 0.3, 0.46, LPC.stone, { bevel: 0.02, vary: 0.06, ao: 0.25 });
  lp.box(0, 0.4, 0, 0.56, 0.07, 0.56, LPC.stoneLight, { bevel: 0.015, ...o });
  if (v.variant === 1) {
    // urna di terracotta con coperchio e manici
    lp.lathe(0, 0.47, 0, [[0, 0], [0.12, 0], [0.14, 0.04], [0.22, 0.2], [0.2, 0.36], [0.13, 0.42], [0.15, 0.45], [0.09, 0.5], [0.04, 0.55], [0.05, 0.58], [0, 0.6]], 9, '#9c5a3c', { vary: 0.06, ao: 0.3 });
    for (const sx of [-1, 1]) lp.push([sx * 0.21, 0.82, 0], 0, Math.PI / 2).add(new THREE.TorusGeometry(0.06, 0.018, 4, 8, Math.PI), '#7e4630', { jitter: 0 }).pop();
    lp.box(0, 0.7, 0.19, 0.22, 0.03, 0.02, '#d6b48a', { jitter: 0, ao: 0 });
  } else {
    lp.push([0, 0.47, 0], 0, 0, 0, 3.0);
    vase(lp, 0, 0, 0, LPC.stoneLight, !v.dirty);
    lp.pop();
  }
  if (v.dirty) moss(lp, 0.2, 0.15, 0.23, 0.1);
  if (v.dirty) deadLeaves(lp, -0.4, -0.4, 0.4, 0.4, 6);
  return lp.build();
}

export function bonesLP(v: PVis): LPModel {
  const lp = new LP(`lp:bones:${v.seed}`);
  const r = lp.rng;
  // un po' di terra smossa sotto, poi tutto in scala 2 per leggersi in gioco
  lp.blob(0, 0, 0, 0.5, 0.05, 0.42, LPC.soil, { vary: 0.12, ao: 0 });
  lp.push([0, 0.02, 0], r.range(-0.4, 0.4), 0, 0, 2);
  // teschio
  lp.blob(0, 0.09, 0, 0.1, 0.09, 0.11, LPC.bone, { detail: 1, jitter: 0.006 });
  lp.blob(0, 0.04, 0.07, 0.06, 0.04, 0.05, LPC.bone, { jitter: 0.004 });
  for (const sx of [-1, 1]) lp.blob(sx * 0.04, 0.1, 0.095, 0.024, 0.026, 0.012, LPC.charcoal, { jitter: 0 });
  // ossa lunghe con epifisi
  for (let i = 0; i < 3; i++) {
    lp.push([r.range(-0.15, 0.15), 0.025, r.range(-0.15, 0.15)], r.range(0, 6.28), 0, Math.PI / 2);
    lp.cyl(0, -0.16, 0, 0.018, 0.018, 0.32, 5, LPC.bone, { jitter: 0 });
    for (const y of [-0.16, 0.16]) lp.blob(0, y, 0, 0.03, 0.025, 0.03, LPC.bone, { jitter: 0 });
    lp.pop();
  }
  lp.pop();
  return lp.build();
}

export function signLP(v: PVis): LPModel {
  const lp = new LP(`lp:sign:${v.seed}:${v.dirty}`);
  lp.cyl(-0.38, 0, -0.02, 0.04, 0.035, 1.35, 5, LPC.woodDark, { vary: 0.1 });
  lp.cyl(0.38, 0, -0.02, 0.04, 0.035, 1.35, 5, LPC.woodDark, { vary: 0.1 });
  lp.box(0, 0.7, -0.01, 0.94, 0.62, 0.07, LPC.wood, { bevel: 0.015, vary: 0.08 });
  lp.box(0, 1.33, -0.02, 1.0, 0.06, 0.1, LPC.woodDark, { bevel: 0.01 });
  if (v.dirty) deadLeaves(lp, -0.4, -0.3, 0.4, 0.3, 6);
  return lp.build();
}
