// Luci low-poly: lampioni (3 varianti), lanterne (3 varianti), torcia.
// Ogni luce ha: struttura in ferro sfaccettata, vetro/fiamma emissivi e una
// sorgente (anchor) che l'Atmosfera fa tremolare con FireFlicker.
// Stati: spento (vetro scuro), sporco (muschio, foglie), rotto (inclinato).

import * as THREE from 'three';
import { LP, type LPModel } from './kit.ts';
import { deadLeaves, moss, pebbles } from './details.ts';
import { LPC } from './palette.ts';
import type { PVis } from '../models/types.ts';

export function decayLP(lp: LP, v: PVis, w: number, d: number) {
  if (!v.dirty && !v.broken) return;
  const r = lp.rng;
  deadLeaves(lp, -w / 2, -d / 2, w / 2, d / 2, Math.round(w * d * 14) + 4);
  for (let i = 0; i < 3; i++) moss(lp, r.range(-w / 3, w / 3), 0.02, r.range(-d / 3, d / 3), 0.06 + r.next() * 0.05);
  if (v.broken) pebbles(lp, -w / 2, -d / 2, w / 2, d / 2, 6);
}

/** Testa di lampione: gabbia in ferro, vetri, fiamma, tettuccio. */
function lampHead(lp: LP, y: number, on: boolean, gothic = false, s = 1) {
  const glass = on ? { color: LPC.lantern, bucket: 'glow' as const } : { color: '#3c3a35', bucket: 'solid' as const };
  lp.box(0, y, 0, 0.3 * s, 0.05, 0.3 * s, LPC.iron, { bevel: 0.01 });
  lp.cyl(0, y + 0.05, 0, 0.11 * s, 0.14 * s, 0.32 * s, 4, glass.color, { bucket: glass.bucket, jitter: 0, vary: 0.05 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(x * 0.1 * s, y + 0.05, z * 0.1 * s, 0.025, 0.33 * s, 0.025, LPC.iron, { jitter: 0 });
  if (on) lp.cyl(0, y + 0.1, 0, 0.035, 0, 0.12, 4, LPC.flameCore, { bucket: 'glow', jitter: 0 });
  lp.box(0, y + 0.05 + 0.32 * s, 0, 0.34 * s, 0.04, 0.34 * s, LPC.iron, { bevel: 0.008 });
  if (gothic) lp.push([0, y + 0.41 * s, 0], Math.PI / 4).cyl(0, 0, 0, 0.21 * s, 0, 0.42 * s, 4, LPC.iron, { jitter: 0.004 }).pop();
  else {
    lp.push([0, y + 0.41 * s, 0], Math.PI / 4).cyl(0, 0, 0, 0.22 * s, 0.05 * s, 0.14 * s, 4, LPC.iron, { jitter: 0.004 }).pop();
    lp.blob(0, y + 0.6 * s, 0, 0.035, 0.035, 0.035, LPC.iron, { jitter: 0 });
  }
  if (on) lp.light(0, y + 0.22 * s, 0, LPC.lantern, 1, 5.5, 0.14, 1.1);
}

export function lampPost(v: PVis): LPModel {
  const lp = new LP(`lp:lamp:${v.variant}:${v.seed}:${v.dirty}${v.broken}`);
  const on = v.lit && !v.broken;
  // basamento in pietra a due gradini
  lp.box(0, 0, 0, 0.56, 0.12, 0.56, LPC.stoneDark, { bevel: 0.02, ...(v.dirty ? { topTint: LPC.moss, topAmount: 0.5 } : {}) });
  lp.box(0, 0.12, 0, 0.4, 0.1, 0.4, LPC.stone, { bevel: 0.015 });
  lp.push([0, 0.22, 0], 0, v.broken ? 0.1 : 0, v.broken ? 0.28 : 0);
  // piede tornito in ghisa
  lp.lathe(0, 0, 0, [[0.14, 0], [0.13, 0.06], [0.08, 0.12], [0.1, 0.18], [0.06, 0.3], [0.05, 0.4], [0, 0.4]], 8, LPC.iron, { ao: 0.25 });
  if (v.variant === 1) {
    lp.cyl(0, 0.4, 0, 0.05, 0.04, 2.0, 7, LPC.iron, { ao: 0.2 });
    for (const y of [0.9, 1.6]) lp.cyl(0, y, 0, 0.065, 0.065, 0.05, 7, LPC.ironLight, { jitter: 0 });
    lp.box(0, 2.3, 0, 1.12, 0.05, 0.05, LPC.iron, { jitter: 0 });
    lp.blob(0, 2.42, 0, 0.07, 0.07, 0.07, LPC.iron, { jitter: 0 });
    for (const sx of [-1, 1]) {
      // ricciolo decorativo sotto il braccio
      lp.push([sx * 0.22, 2.18, 0], 0, 0, sx * 0.6).box(0, 0, 0, 0.28, 0.035, 0.035, LPC.iron, { jitter: 0 }).pop();
      lp.box(sx * 0.53, 2.0, 0, 0.02, 0.3, 0.02, LPC.iron, { jitter: 0 });
      lp.push([sx * 0.53, 0, 0]);
      lampHead(lp, 1.62, on, false, 0.8);
      lp.pop();
    }
  } else if (v.variant === 2) {
    lp.cyl(0, 0.4, 0, 0.09, 0.07, 0.35, 8, LPC.iron, { ao: 0.2 });
    lp.cyl(0, 0.75, 0, 0.055, 0.045, 1.45, 6, LPC.iron, { ao: 0.15 });
    for (const y of [1.05, 1.6]) lp.box(0, y, 0, 0.13, 0.05, 0.13, LPC.ironLight, { bevel: 0.01 });
    lampHead(lp, 2.2, on, true);
  } else {
    lp.cyl(0, 0.4, 0, 0.05, 0.04, 1.8, 7, LPC.iron, { ao: 0.2 });
    lp.cyl(0, 1.25, 0, 0.065, 0.065, 0.05, 7, LPC.ironLight, { jitter: 0 });
    // braccetto per la scala dell'accenditore
    lp.box(0, 1.9, 0, 0.36, 0.035, 0.035, LPC.iron, { jitter: 0 });
    lampHead(lp, 2.2, on);
  }
  lp.pop();
  decayLP(lp, v, 0.9, 0.9);
  return lp.build();
}

/** Corpo di lanterna da terra. */
function lanternBody(lp: LP, y: number, on: boolean, s = 1) {
  const glass = on ? { color: LPC.lantern, bucket: 'glow' as const } : { color: '#3c3a35', bucket: 'solid' as const };
  lp.box(0, y, 0, 0.26 * s, 0.05 * s, 0.26 * s, LPC.iron, { bevel: 0.008 });
  lp.box(0, y + 0.05 * s, 0, 0.18 * s, 0.26 * s, 0.18 * s, glass.color, { bucket: glass.bucket, jitter: 0, vary: 0.05 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(x * 0.1 * s, y + 0.05 * s, z * 0.1 * s, 0.025 * s, 0.26 * s, 0.025 * s, LPC.iron, { jitter: 0 });
  lp.box(0, y + 0.17 * s, 0, 0.24 * s, 0.018, 0.24 * s, LPC.iron, { jitter: 0 });
  if (on) lp.cyl(0, y + 0.07 * s, 0, 0.03 * s, 0, 0.1 * s, 4, LPC.flameCore, { bucket: 'glow', jitter: 0 });
  lp.push([0, y + 0.31 * s, 0], Math.PI / 4).cyl(0, 0, 0, 0.2 * s, 0.03 * s, 0.13 * s, 4, LPC.iron, { jitter: 0.003 }).pop();
  lp.push([0, y + 0.47 * s, 0]).add(new THREE.TorusGeometry(0.04 * s, 0.01, 3, 8), LPC.iron, { jitter: 0 }).pop();
  if (on) lp.light(0, y + 0.17 * s, 0, LPC.lantern, 0.75, 4, 0.2, 0.9);
}

export function lantern(v: PVis): LPModel {
  const lp = new LP(`lp:lantern:${v.variant}:${v.seed}:${v.dirty}${v.broken}`);
  const on = v.lit && !v.broken;
  if (v.variant === 1) {
    // su paletto di legno con braccio
    lp.cyl(0, 0, 0, 0.07, 0.06, 1.4, 5, LPC.woodDark, { vary: 0.12 });
    lp.box(0.18, 1.3, 0, 0.42, 0.06, 0.06, LPC.woodDark, { jitter: 0.005 });
    lp.push([0.33, 0, 0], 0, 0, v.broken ? 0.45 : 0);
    lp.box(0, 1.12, 0, 0.015, 0.18, 0.015, LPC.iron, { jitter: 0 });
    lanternBody(lp, 0.72, on, 0.9);
    lp.pop();
  } else if (v.variant === 2) {
    // su pietra squadrata
    lp.blob(0, 0.2, 0, 0.36, 0.25, 0.34, LPC.stone, { vary: 0.12, ...(v.dirty ? { topTint: LPC.moss, topAmount: 0.5 } : {}) });
    lp.push([0, 0.4, 0], 0, 0, v.broken ? 0.5 : 0);
    lanternBody(lp, 0, on, 1.4);
    lp.pop();
  } else {
    // da terra: più grande, su un piccolo cerchio di sassi
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; lp.blob(Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3, 0.08, 0.05, 0.07, i % 2 ? LPC.stone : LPC.stoneWarm, { vary: 0.1 }); }
    lp.push([0, 0, 0], 0, 0, v.broken ? 1.3 : 0);
    lanternBody(lp, 0, on, 1.8);
    lp.pop();
  }
  decayLP(lp, v, 0.8, 0.8);
  return lp.build();
}

export function torch(v: PVis): LPModel {
  const lp = new LP(`lp:torch:${v.seed}:${v.dirty}${v.broken}`);
  const on = v.lit && !v.broken;
  lp.blob(0, 0.06, 0, 0.18, 0.1, 0.16, LPC.stone, { vary: 0.12 });
  lp.push([0, 0, 0], 0, 0, v.broken ? 0.35 : 0.04);
  lp.cyl(0, 0.05, 0, 0.045, 0.06, 1.15, 6, LPC.woodDark, { vary: 0.15 });
  lp.cyl(0, 1.1, 0, 0.085, 0.1, 0.12, 6, LPC.iron, { jitter: 0.005 });
  if (on) {
    lp.cyl(0, 1.2, 0, 0.09, 0, 0.26, 5, '#ff9a3c', { bucket: 'glow', jitter: 0.02 });
    lp.cyl(0.02, 1.22, 0, 0.05, 0, 0.18, 4, LPC.flameCore, { bucket: 'glow', jitter: 0.01 });
    lp.light(0, 1.35, 0, '#ff9a3c', 1, 5, 0.45, 1.2);
  } else lp.blob(0, 1.24, 0, 0.07, 0.05, 0.07, LPC.charcoal, {});
  lp.pop();
  decayLP(lp, v, 0.7, 0.7);
  return lp.build();
}
