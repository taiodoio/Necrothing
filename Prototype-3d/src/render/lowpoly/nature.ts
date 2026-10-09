// Natura low-poly: sentieri (pietre poligonali irregolari), alberi morti e
// pini, cespugli, erba alta, funghi, aiuole, stagno, e la scenografia di
// contorno (ciuffi, fiori, foglie, felci, rocce) usata in grandi quantità.

import * as THREE from 'three';
import { LP, irregularShape, type LPModel } from './kit.ts';
import { deadLeaves, flower, grassTuft, moss, pebbles, weeds } from './details.ts';
import { GRASS, GRASS_DRY, LPC } from './palette.ts';
import type { PVis } from '../models/types.ts';

// ── Sentieri ─────────────────────────────────────────────────────────────

/** Selciato: 5-8 pietre poligonali irregolari, spessori e grigi diversi. */
export function pathStone(v: PVis): LPModel {
  const lp = new LP(`lp:path:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  const tones = [LPC.stone, '#5d6168', '#727069', LPC.stoneWarm, '#666660', LPC.stoneLight];
  const pts: Array<[number, number]> = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    if ((i + j) % 2 === 1 && r.chance(0.35)) continue;
    pts.push([(i - 1) * 0.31 + r.range(-0.06, 0.06), (j - 1) * 0.31 + r.range(-0.06, 0.06)]);
  }
  for (const [x, z] of pts) {
    if (v.broken && r.chance(0.3)) continue;
    const t = 0.03 + r.next() * 0.025;
    lp.push([x, -0.012, z], r.range(0, 6.28), -Math.PI / 2);
    lp.extrude(irregularShape(r, 0.13 + r.next() * 0.04, 5 + r.int(3), 0.85 + r.next() * 0.2), t, r.pick(tones), { bevel: 0.009, vary: 0.06, ao: 0.25, curve: 1, ...(v.dirty ? { topTint: LPC.moss, topAmount: 0.4 } : {}) });
    lp.pop();
  }
  // fughe: muschio e fili d'erba
  for (let i = 0; i < 2 + r.int(3); i++) moss(lp, r.range(-0.4, 0.4), 0.005, r.range(-0.4, 0.4), 0.035, r.chance(0.5) ? LPC.moss : LPC.grass);
  if (r.chance(0.5)) grassTuft(lp, r.pick([-0.46, 0.46]), r.range(-0.4, 0.4), 0.7, GRASS, 4);
  if (v.dirty) { weeds(lp, r.range(-0.3, 0.3), r.range(-0.3, 0.3), 0.7); deadLeaves(lp, -0.45, -0.45, 0.45, 0.45, 6); }
  return lp.build();
}

export function pathDirt(v: PVis): LPModel {
  const lp = new LP(`lp:pathdirt:${v.seed}:${v.dirty}`);
  const r = lp.rng;
  lp.push([0, -0.03, 0], r.range(0, 6.28), -Math.PI / 2).extrude(irregularShape(r, 0.5, 8, 0.95), 0.045, LPC.soil, { vary: 0.08, ao: 0, curve: 1 }).pop();
  pebbles(lp, -0.4, -0.4, 0.4, 0.4, 4);
  if (v.dirty) weeds(lp, r.range(-0.3, 0.3), r.range(-0.3, 0.3), 0.7);
  return lp.build();
}

// ── Alberi ───────────────────────────────────────────────────────────────

/** Ramo affusolato ricorsivo; alle punte (se richiesto) ciuffi di foglie. */
function branch(lp: LP, len: number, r0: number, depth: number, foliage: string[] | null, tips: number) {
  const r = lp.rng;
  lp.cyl(0, 0, 0, r0, r0 * 0.62, len, 5, LPC.woodDark, { vary: 0.1, ao: 0.1, jitter: r0 * 0.25 });
  if (depth <= 0) {
    if (foliage && r.chance(tips)) lp.blob(0, len + 0.05, 0, 0.2 + r.next() * 0.12, 0.15 + r.next() * 0.08, 0.2 + r.next() * 0.12, r.pick(foliage), { vary: 0.14, ao: 0.15 });
    return;
  }
  const kids = 2 + (r.chance(0.4) ? 1 : 0);
  for (let i = 0; i < kids; i++) {
    lp.push([0, len * r.range(0.75, 0.98), 0], r.range(0, Math.PI * 2), r.range(0.45, 0.85));
    branch(lp, len * r.range(0.58, 0.78), r0 * 0.62, depth - 1, foliage, tips);
    lp.pop();
  }
}

/** Albero morto contorto; in autunno conserva qualche ciuffo di foglie. */
export function deadTreeLP(seed: number, autumn = true, scale = 1): LPModel {
  const lp = new LP(`lp:deadtree:${seed}:${autumn}`);
  const r = lp.rng;
  lp.push([0, 0, 0], 0, 0, 0, scale);
  // radici divaricate
  for (let i = 0; i < 5; i++) {
    lp.push([0, 0.08, 0], (i / 5) * Math.PI * 2 + r.range(-0.3, 0.3), 1.25).cyl(0, 0, 0, 0.09, 0.02, 0.4, 4, LPC.woodDark, { vary: 0.1 }).pop();
  }
  // tronco a segmenti leggermente piegati
  let y = 0;
  const segs = 3;
  const lean = r.range(-0.18, 0.18);
  for (let i = 0; i < segs; i++) {
    const h = 0.55 + r.next() * 0.15;
    lp.push([0, y, 0], r.range(-0.3, 0.3), lean * (i + 1) * 0.5).cyl(0, 0, 0, 0.17 - i * 0.04, 0.13 - i * 0.04, h, 6, i === 0 ? LPC.woodDark : '#55402f', { vary: 0.12, ao: 0.2, jitter: 0.02 }).pop();
    y += h * 0.96;
  }
  lp.push([Math.sin(lean) * 0.3, y, 0], 0, 0, lean);
  const foliage = autumn ? [...LPC.leafAutumn] : null;
  for (let i = 0; i < 3; i++) {
    lp.push([0, -0.1 * i, 0], (i / 3) * Math.PI * 2 + r.range(-0.4, 0.4), r.range(0.35, 0.7));
    branch(lp, 0.55 + r.next() * 0.2, 0.06, 2, foliage, 0.55);
    lp.pop();
  }
  lp.pop();
  // cavità nel tronco
  lp.blob(0.0, 0.45, 0.15, 0.05, 0.08, 0.02, LPC.charcoal, { jitter: 0 });
  lp.pop();
  return lp.build();
}

/** Pino a palchi sovrapposti; `half` = mezzo secco con palchi mancanti. */
export function pineLP(seed: number, half = false, scale = 1): LPModel {
  const lp = new LP(`lp:pine:${seed}:${half}`);
  const r = lp.rng;
  lp.push([0, 0, 0], 0, 0, 0, scale);
  const h = 2.2 + r.next() * 0.6;
  lp.cyl(0, 0, 0, 0.12, 0.05, h * 0.9, 6, LPC.woodDark, { vary: 0.1 });
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const y = 0.45 + t * (h - 0.7);
    const rad = (0.85 - t * 0.6) * (0.9 + r.next() * 0.2);
    const dry = half && (i === 1 || (i === 3 && r.chance(0.5)));
    if (half && i === 2 && r.chance(0.6)) {
      for (let k = 0; k < 4; k++) lp.push([0, y + 0.1, 0], r.range(0, 6.28), 1.3).cyl(0, 0, 0, 0.025, 0.01, rad * 0.8, 3, LPC.woodDark, { jitter: 0.01 }).pop();
      continue;
    }
    lp.push([0, y, 0], r.range(0, 1));
    lp.cyl(0, 0, 0, rad, rad * 0.12, 0.62 - t * 0.12, 7, dry ? r.pick([LPC.dryDark, '#6a5a3a', '#5e5434']) : r.pick([LPC.pine, LPC.pineDark, '#344b37']), { vary: 0.1, ao: 0.35, jitter: 0.05 });
    lp.pop();
  }
  lp.cyl(0, 0.45 + (h - 0.7), 0, 0.14, 0, 0.35, 5, half ? LPC.dryDark : LPC.pine, { vary: 0.1 });
  lp.pop();
  return lp.build();
}

export function bushesLP(v: PVis | { seed: number }): LPModel {
  const lp = new LP(`lp:bushes:${v.seed}`);
  const r = lp.rng;
  const greens = ['#3a5232', '#44593a', '#4f6640', '#334a2e', '#5a6a40'];
  for (let i = 0; i < 6; i++) {
    const x = r.range(-0.6, 0.6), z = r.range(-0.6, 0.6), s = 0.28 + r.next() * 0.18;
    lp.blob(x, s * 0.75, z, s, s * 0.85, s, r.pick(greens), { detail: 1, vary: 0.14, ao: 0.4, jitter: s * 0.3 });
  }
  if (r.chance(0.6)) for (let i = 0; i < 9; i++) lp.blob(r.range(-0.6, 0.6), r.range(0.25, 0.55), r.range(-0.6, 0.6), 0.025, 0.025, 0.025, r.chance(0.7) ? LPC.red : LPC.flowers[2], { jitter: 0 });
  return lp.build();
}

export function tallGrassLP(v: PVis): LPModel {
  const lp = new LP(`lp:tallgrass:${v.seed}`);
  const r = lp.rng;
  for (let i = 0; i < 7; i++) grassTuft(lp, r.range(-0.38, 0.38), r.range(-0.38, 0.38), 2.0 + r.next() * 0.8, r.chance(0.5) ? GRASS_DRY : GRASS, 7);
  return lp.build();
}

function mushroom(lp: LP, x: number, z: number, h: number, cap: string, glow = false) {
  lp.cyl(x, 0, z, 0.02, 0.016, h, 5, LPC.bone, { jitter: 0 });
  lp.lathe(x, h - 0.01, z, [[0.0, 0], [0.07, 0], [0.065, 0.02], [0.045, 0.04], [0, 0.05]], 7, cap, { bucket: glow ? 'glow' : 'solid', jitter: 0.004 });
  if (!glow) for (let i = 0; i < 3; i++) lp.blob(x + lp.rng.range(-0.04, 0.04), h + 0.035, z + lp.rng.range(-0.04, 0.04), 0.008, 0.005, 0.008, LPC.bone, { jitter: 0 });
}

export function poisonShroomsLP(v: PVis): LPModel {
  const lp = new LP(`lp:shrooms:${v.seed}`);
  const r = lp.rng;
  for (let i = 0; i < 6; i++) mushroom(lp, r.range(-0.32, 0.32), r.range(-0.32, 0.32), 0.06 + r.next() * 0.1, r.pick(['#8e3a5a', '#6f3f86', '#9b2f2f']), i === 0);
  moss(lp, 0, 0.005, 0, 0.18);
  lp.light(0, 0.12, 0, '#b07ae0', 0.25, 1.4, 0.4, 0.4);
  return lp.build();
}

export function flowerbedLP(v: PVis): LPModel {
  const lp = new LP(`lp:flowerbed:${v.seed}:${v.dirty}`);
  const r = lp.rng;
  // bordo di pietre a ellisse e terra lavorata
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    lp.blob(Math.cos(a) * 0.78, 0.05, Math.sin(a) * 0.7, 0.11, 0.07, 0.09, r.pick([LPC.stone, LPC.stoneLight, LPC.stoneWarm]), { vary: 0.1 });
  }
  lp.blob(0, 0.0, 0, 0.72, 0.08, 0.64, LPC.soil, { detail: 1, jitter: 0.02, vary: 0.1 });
  for (let i = 0; i < 18; i++) flower(lp, r.range(-0.55, 0.55), r.range(-0.48, 0.48), r.pick(LPC.flowers), 0.12 + r.next() * 0.1, 0.05);
  for (let i = 0; i < 5; i++) grassTuft(lp, r.range(-0.5, 0.5), r.range(-0.45, 0.45), 0.8);
  if (v.dirty) weeds(lp, 0.3, -0.2, 1);
  return lp.build();
}

/** Lago con pesci morti: acqua irregolare, sponda di sassi, canne, ninfee. */
export function pondLP(v: PVis): LPModel {
  const lp = new LP(`lp:pond:${v.seed}:${v.dirty}`);
  const r = lp.rng;
  const water = new THREE.Shape();
  const n = 14;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 1 + Math.sin(a * 3 + 1) * 0.08 + r.range(-0.05, 0.05);
    pts.push([Math.cos(a) * 1.65 * rr, Math.sin(a) * 1.15 * rr]);
  }
  pts.forEach(([x, y], i) => (i ? water.lineTo(x, y) : water.moveTo(x, y)));
  water.closePath();
  // fondale scuro sotto un'acqua semitrasparente
  lp.push([0, -0.02, 0], 0, -Math.PI / 2).plate(water, 0.02, LPC.charcoal, { ao: 0 }).pop();
  lp.push([0, 0.035, 0], 0, -Math.PI / 2).plate(water, 0.01, v.dirty ? '#3a4a3a' : LPC.water, { bucket: 'water', vary: 0.04, ao: 0 }).pop();
  // sponda
  for (const [x, y] of pts) {
    lp.blob(x * 1.05, 0.06, -y * 1.05, 0.16 + r.next() * 0.1, 0.09, 0.14, r.pick([LPC.stone, LPC.stoneDark, LPC.stoneWarm]), { vary: 0.12, topTint: LPC.moss, topAmount: 0.35 });
    if (r.chance(0.3)) moss(lp, x * 1.12, 0.03, -y * 1.12, 0.1);
  }
  // canne e tife
  for (let i = 0; i < 9; i++) {
    const [x, y] = r.pick(pts);
    const h = 0.4 + r.next() * 0.35;
    lp.push([x * 0.88, 0, -y * 0.88], r.range(0, 6), r.range(-0.15, 0.15)).cyl(0, 0, 0, 0.012, 0.006, h, 3, LPC.dryDark, { jitter: 0 }).pop();
    if (r.chance(0.5)) lp.cyl(x * 0.88, h * 0.7, -y * 0.88, 0.022, 0.022, 0.1, 5, LPC.woodDark, { jitter: 0 });
  }
  // ninfee e pesci morti a pancia in su
  for (let i = 0; i < 4; i++) {
    lp.push([r.range(-1, 1), 0.048, r.range(-0.6, 0.6)], r.range(0, 6), -Math.PI / 2).plate(irregularShape(r, 0.1, 6), 0.008, LPC.leaf, { ao: 0 }).pop();
  }
  for (let i = 0; i < 3; i++) {
    const x = r.range(-0.9, 0.9), z = r.range(-0.5, 0.5);
    lp.push([x, 0.05, z], r.range(0, 6), 0, Math.PI / 2);
    lp.blob(0, 0, 0, 0.03, 0.05, 0.11, '#c9c3b0', { jitter: 0.005 });
    lp.push([0, 0, -0.12], 0, 0).cyl(0, -0.04, 0, 0.0, 0.045, 0.06, 3, '#a9a391', { jitter: 0 }).pop();
    lp.pop();
  }
  return lp.build();
}

// ── Scenografia (molte copie, poche varianti) ────────────────────────────

export function sceneryTuftLP(seed: number): LPModel {
  const lp = new LP(`lp:tuft:${seed}`);
  const r = lp.rng;
  for (let i = 0; i < 1 + r.int(2); i++) grassTuft(lp, r.range(-0.18, 0.18), r.range(-0.18, 0.18), 0.9 + r.next() * 0.4, seed === 4 ? GRASS_DRY : GRASS);
  return lp.build();
}

export function sceneryFlowersLP(seed: number): LPModel {
  const lp = new LP(`lp:flowers:${seed}`);
  const r = lp.rng;
  const col = LPC.flowers[seed % LPC.flowers.length];
  grassTuft(lp, 0, 0, 0.8);
  for (let i = 0; i < 3 + r.int(3); i++) flower(lp, r.range(-0.2, 0.2), r.range(-0.2, 0.2), r.chance(0.8) ? col : r.pick(LPC.flowers), 0.1 + r.next() * 0.08);
  return lp.build();
}

export function sceneryPebblesLP(seed: number): LPModel {
  const lp = new LP(`lp:pebbles:${seed}`);
  pebbles(lp, -0.25, -0.25, 0.25, 0.25, 3 + (seed % 3));
  return lp.build();
}

export function sceneryLeavesLP(seed: number): LPModel {
  const lp = new LP(`lp:leaves:${seed}`);
  deadLeaves(lp, -0.3, -0.3, 0.3, 0.3, 6 + seed);
  return lp.build();
}

export function sceneryShroomsLP(seed: number): LPModel {
  const lp = new LP(`lp:shroom:${seed}`);
  const r = lp.rng;
  for (let i = 0; i < 2 + r.int(3); i++) mushroom(lp, r.range(-0.15, 0.15), r.range(-0.15, 0.15), 0.04 + r.next() * 0.06, r.pick([LPC.red, '#9a6a44', '#7d5a3e']));
  return lp.build();
}

export function sceneryWildGrassLP(seed: number): LPModel {
  const lp = new LP(`lp:wgrass:${seed}`);
  const r = lp.rng;
  for (let i = 0; i < 2 + r.int(2); i++) grassTuft(lp, r.range(-0.22, 0.22), r.range(-0.22, 0.22), 1.3 + r.next() * 0.5, r.chance(0.5) ? GRASS_DRY : GRASS);
  return lp.build();
}

/** Felce: fronde arcuate a raggiera, ognuna con foglioline alternate. */
export function sceneryFernLP(seed: number): LPModel {
  const lp = new LP(`lp:fern:${seed}`);
  const r = lp.rng;
  const col = r.pick(['#3f5a32', '#4a6136', '#56703d', '#5b5a33']);
  const n = 6 + r.int(3);
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + r.range(-0.2, 0.2);
    const len = 0.32 + r.next() * 0.14;
    lp.push([0, 0.01, 0], yaw, 0.9 + r.next() * 0.3);
    lp.cyl(0, 0, 0, 0.008, 0.003, len, 3, col, { jitter: 0 });
    for (let k = 1; k < 6; k++) {
      const y = (k / 6) * len, w = 0.07 * (1 - k / 7);
      for (const s of [-1, 1]) lp.push([0, y, 0], 0, 0, s * 1.1).box(0, 0, 0, 0.012, w, 0.024, col, { jitter: 0, vary: 0.1 }).pop();
    }
    lp.pop();
  }
  return lp.build();
}

export function sceneryBushLP(seed: number): LPModel {
  const lp = new LP(`lp:bush:${seed}`);
  const r = lp.rng;
  for (let i = 0; i < 3 + r.int(2); i++) {
    const s = 0.16 + r.next() * 0.12;
    lp.blob(r.range(-0.15, 0.15), s * 0.8, r.range(-0.15, 0.15), s, s * 0.85, s, r.pick(['#2f4529', '#3a5230', '#44502c', '#2b3a26']), { detail: 1, vary: 0.14, ao: 0.4 });
  }
  if (r.chance(0.4)) for (let i = 0; i < 4; i++) lp.blob(r.range(-0.2, 0.2), r.range(0.15, 0.3), r.range(0.05, 0.25), 0.02, 0.02, 0.02, LPC.red, { jitter: 0 });
  return lp.build();
}

export function sceneryRockLP(seed: number): LPModel {
  const lp = new LP(`lp:rock:${seed}`);
  const r = lp.rng;
  lp.blob(0, 0.12, 0, 0.35 + r.next() * 0.15, 0.25 + r.next() * 0.1, 0.3 + r.next() * 0.12, r.pick([LPC.stone, LPC.stoneDark, '#5a5d61']), { vary: 0.12, ao: 0.3, topTint: LPC.moss, topAmount: 0.5 });
  if (r.chance(0.6)) lp.blob(0.3, 0.06, 0.2, 0.15, 0.1, 0.13, LPC.stone, { vary: 0.12 });
  return lp.build();
}

