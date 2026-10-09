// Piccole decorazioni low-poly del catalogo: corona su cavalletto, vaso,
// ossa, cartello (la scritta è una texture aggiunta da WorldView).

import { LP, type LPModel } from './kit.ts';
import { deadLeaves, vase, wreath } from './details.ts';
import { LPC } from './palette.ts';
import type { PVis } from '../models/types.ts';

export function wreathLP(v: PVis): LPModel {
  const lp = new LP(`lp:wreath:${v.seed}:${v.dirty}`);
  // cavalletto di legno
  for (const sx of [-1, 1]) lp.push([sx * 0.16, 0, 0.05], 0, -0.2, sx * 0.12).cyl(0, 0, 0, 0.02, 0.018, 0.85, 4, LPC.woodDark, { jitter: 0 }).pop();
  lp.push([0, 0, -0.12], 0, 0.3).cyl(0, 0, 0, 0.018, 0.016, 0.8, 4, LPC.woodDark, { jitter: 0 }).pop();
  wreath(lp, 0, 0.62, 0.1, -0.2, 1.6);
  if (v.dirty) deadLeaves(lp, -0.4, -0.4, 0.4, 0.4, 6);
  return lp.build();
}

export function vaseLP(v: PVis): LPModel {
  const lp = new LP(`lp:vase:${v.seed}:${v.dirty}`);
  lp.box(0, 0, 0, 0.34, 0.08, 0.34, LPC.stone, { bevel: 0.015 });
  lp.push([0, 0.08, 0], 0, 0, 0, 1.6);
  vase(lp, 0, 0, 0, LPC.stoneLight, !v.dirty);
  lp.pop();
  if (v.dirty) deadLeaves(lp, -0.4, -0.4, 0.4, 0.4, 6);
  return lp.build();
}

export function bonesLP(v: PVis): LPModel {
  const lp = new LP(`lp:bones:${v.seed}`);
  const r = lp.rng;
  // teschio
  lp.blob(0, 0.09, 0, 0.1, 0.09, 0.11, LPC.bone, { detail: 1, jitter: 0.006 });
  lp.blob(0, 0.04, 0.07, 0.06, 0.04, 0.05, LPC.bone, { jitter: 0.004 });
  for (const sx of [-1, 1]) lp.blob(sx * 0.04, 0.1, 0.095, 0.024, 0.026, 0.012, LPC.charcoal, { jitter: 0 });
  // ossa lunghe con epifisi
  for (let i = 0; i < 3; i++) {
    lp.push([r.range(-0.3, 0.3), 0.025, r.range(-0.3, 0.3)], r.range(0, 6.28), 0, Math.PI / 2);
    lp.cyl(0, -0.16, 0, 0.018, 0.018, 0.32, 5, LPC.bone, { jitter: 0 });
    for (const y of [-0.16, 0.16]) lp.blob(0, y, 0, 0.03, 0.025, 0.03, LPC.bone, { jitter: 0 });
    lp.pop();
  }
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
