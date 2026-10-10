// Asset low-poly che completano il catalogo: luci speciali (lanterna
// fantasma, zucca, teschio con candela, falò esoterico, albero con candele),
// costruzioni (santuario, fontana, archi, muretti, staccionate, inferriate,
// tomba dissotterrata, buco infernale, casetta per animali), ambiente
// (albero spettrale, albero di Natale morto, pozzanghera tossica, rocce
// mostruose, collinetta, fango), bara aperta e le "case" delle presenze.
// Stessi ingombri del catalogo, stati sporco/rotto/spento come gli altri.

import * as THREE from 'three';
import { LP, gothicArchShape, irregularShape, roundTopShape, type LPModel } from './kit.ts';
import { bouquet, candle, cobweb, deadLeaves, flower, grassTuft, hangingLantern, ivy, moss, pebbles, pumpkin, weeds } from './details.ts';
import { decayLP } from './lights.ts';
import { frontGable, gableRoof, quoins } from './architecture.ts';
import { LPC } from './palette.ts';
import type { PVis } from '../models/types.ts';

const on = (v: PVis) => v.lit && !v.broken;
const mossy = (v: PVis, k = 0.45) => (v.dirty ? { topTint: LPC.moss, topAmount: k } : {});

/** Teschio stilizzato (orbite, naso, mandibola, denti). */
function skull(lp: LP, x: number, y: number, z: number, s = 1, color: string = LPC.bone) {
  lp.push([x, y, z], 0, 0, 0, s);
  lp.blob(0, 0.1, 0, 0.1, 0.1, 0.11, color, { detail: 1, jitter: 0.006 });
  lp.box(0, 0.0, 0.03, 0.11, 0.06, 0.1, color, { bevel: 0.015, jitter: 0.003 });
  for (const sx of [-1, 1]) lp.blob(sx * 0.04, 0.1, 0.09, 0.028, 0.03, 0.02, LPC.charcoal, { jitter: 0 });
  lp.box(0, 0.05, 0.1, 0.02, 0.025, 0.01, LPC.charcoal, { jitter: 0 });
  for (let i = -2; i <= 2; i++) lp.box(i * 0.017, 0.005, 0.08, 0.012, 0.02, 0.01, '#e7dfcb', { jitter: 0 });
  lp.pop();
}

/** Albero contorto con rami espliciti; restituisce le punte dei rami. */
function gnarledTree(lp: LP, height: number, trunk: string, branches = 6): Array<[number, number, number]> {
  const r = lp.rng;
  for (let i = 0; i < 5; i++) lp.push([0, 0.08, 0], (i / 5) * Math.PI * 2 + r.range(-0.3, 0.3), 1.25).cyl(0, 0, 0, 0.11, 0.02, 0.45, 4, trunk, { vary: 0.1 }).pop();
  let y = 0;
  const segs = 3;
  for (let i = 0; i < segs; i++) {
    const h = height / segs;
    lp.push([Math.sin(i * 1.3) * 0.06, y, 0], r.range(-0.3, 0.3), 0, r.range(-0.12, 0.12)).cyl(0, 0, 0, 0.2 - i * 0.05, 0.15 - i * 0.05, h * 1.05, 6, trunk, { vary: 0.12, ao: 0.2, jitter: 0.02 }).pop();
    y += h;
  }
  const tips: Array<[number, number, number]> = [];
  for (let i = 0; i < branches; i++) {
    const a = (i / branches) * Math.PI * 2 + r.range(-0.3, 0.3);
    const by = height * (0.55 + r.next() * 0.4), len = 0.6 + r.next() * 0.4, tilt = 0.75 + r.range(-0.15, 0.2);
    lp.push([0, by, 0], -a, 0, tilt).cyl(0, 0, 0, 0.06, 0.025, len, 5, trunk, { vary: 0.1, jitter: 0.01 }).pop();
    tips.push([Math.cos(a) * Math.sin(tilt) * len, by + Math.cos(tilt) * len, Math.sin(a) * Math.sin(tilt) * len]);
  }
  return tips;
}

// ── Luci speciali ────────────────────────────────────────────────────────

export function ghostLanternLP(v: PVis): LPModel {
  const lp = new LP(`lp:ghostlantern:${v.seed}:${v.dirty}${v.broken}`);
  const lit = on(v);
  lp.box(0, 0, 0, 0.36, 0.14, 0.36, LPC.stoneDark, { bevel: 0.02, ...mossy(v) });
  lp.push([0, 0.14, 0], 0, 0, v.broken ? 0.35 : 0);
  lp.lathe(0, 0, 0, [[0.09, 0], [0.07, 0.08], [0.04, 0.16], [0.035, 0.85], [0.06, 0.9], [0, 0.9]], 7, LPC.iron, { ao: 0.2 });
  // gabbia esagonale con fiammella spettrale
  lp.cyl(0, 0.92, 0, 0.17, 0.17, 0.04, 6, LPC.iron, { jitter: 0 });
  lp.cyl(0, 0.96, 0, 0.12, 0.1, 0.32, 6, lit ? LPC.spectral : '#304540', { bucket: lit ? 'glow' : 'solid', jitter: 0 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; lp.box(Math.cos(a) * 0.13, 0.96, Math.sin(a) * 0.13, 0.02, 0.33, 0.02, LPC.iron, { jitter: 0 }); }
  if (lit) lp.cyl(0, 1.0, 0, 0.05, 0, 0.18, 4, '#d8fff4', { bucket: 'glow', jitter: 0 });
  lp.cyl(0, 1.28, 0, 0.19, 0.02, 0.22, 6, LPC.iron, { jitter: 0.003 });
  lp.blob(0, 1.53, 0, 0.04, 0.04, 0.04, lit ? LPC.spectral : LPC.iron, { bucket: lit ? 'glow' : 'solid', jitter: 0 });
  if (lit) lp.light(0, 1.12, 0, LPC.spectral, 0.9, 4.5, 0.3, 1.2);
  lp.pop();
  decayLP(lp, v, 0.8, 0.8);
  return lp.build();
}

export function glowPumpkinLP(v: PVis): LPModel {
  const lp = new LP(`lp:pumpkin:${v.seed}:${v.dirty}${v.broken}`);
  // zucca grande intagliata con due zucchette e foglie: deve leggersi da lontano
  pumpkin(lp, -0.05, 0, 0.02, 0.4, true, on(v));
  pumpkin(lp, 0.42, 0, -0.32, 0.18, false, false, 1);
  pumpkin(lp, -0.45, 0, -0.3, 0.13, false, false, 2.2);
  lp.push([0, 0, 0]).cyl(-0.42, 0, 0.3, 0.018, 0.006, 0.32, 3, '#4d5a2e', { jitter: 0 }).pop();
  for (let i = 0; i < 4; i++) lp.push([-0.36 + i * 0.2, 0.02, 0.4], i * 1.3, 0, 0).blob(0, 0, 0, 0.1, 0.02, 0.07, '#4d6640', { jitter: 0.01 }).pop();
  decayLP(lp, v, 0.8, 0.8);
  return lp.build();
}

export function skullCandleLP(v: PVis): LPModel {
  const lp = new LP(`lp:skullcandle:${v.seed}:${v.dirty}${v.broken}`);
  const lit = on(v);
  // tutto in scala 1.7: teschio grande quanto una zucca, leggibile in gioco
  lp.push([0, 0, 0], 0, 0, 0, 1.7);
  lp.blob(0, 0.06, 0, 0.22, 0.08, 0.2, LPC.stone, { vary: 0.12, ...mossy(v) });
  skull(lp, 0, 0.12, 0, 1.6);
  // candela sul cranio con colature di cera
  lp.cyl(0, 0.42, -0.01, 0.045, 0.04, 0.16, 7, '#e2d6bb', { jitter: 0 });
  for (let i = 0; i < 4; i++) { const a = i * 1.6; lp.cyl(Math.cos(a) * 0.05, 0.36, Math.sin(a) * 0.05 - 0.01, 0.014, 0.008, 0.1, 4, '#e2d6bb', { jitter: 0 }); }
  if (lit) { lp.cyl(0, 0.59, -0.01, 0.022, 0, 0.07, 4, LPC.flame, { bucket: 'glow', jitter: 0 }); lp.light(0, 0.64, 0, LPC.flame, 0.6, 3, 0.4, 0.7); }
  for (let i = 0; i < 2; i++) candle(lp, i ? 0.2 : -0.22, 0.05, 0.12, lit, 0.07 + i * 0.03);
  lp.pop();
  decayLP(lp, v, 0.8, 0.8);
  return lp.build();
}

export function bonfireLP(v: PVis): LPModel {
  const lp = new LP(`lp:bonfire:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  const lit = on(v);
  lp.blob(0, -0.02, 0, 0.62, 0.06, 0.62, LPC.soilDark, { jitter: 0.03 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; lp.blob(Math.cos(a) * 0.58, 0.07, Math.sin(a) * 0.58, 0.13, 0.1, 0.11, r.pick([LPC.stone, LPC.stoneDark]), { vary: 0.12 }); }
  for (let i = 0; i < 5; i++) {
    lp.push([0, 0.1, 0], (i / 5) * Math.PI * 2, 0, v.broken ? 1.45 : 0.85).cyl(0, -0.05, 0, 0.06, 0.05, 0.6, 6, i % 2 ? LPC.wood : LPC.woodDark, { vary: 0.12 }).pop();
  }
  if (lit) {
    lp.cyl(0, 0.12, 0, 0.26, 0, 0.45, 6, '#ff8a3c', { bucket: 'glow', jitter: 0.03 });
    lp.cyl(0.04, 0.18, 0, 0.17, 0, 0.62, 5, LPC.spectral, { bucket: 'glow', jitter: 0.03 });
    lp.cyl(-0.03, 0.22, 0.03, 0.09, 0, 0.78, 4, '#d8fff4', { bucket: 'glow', jitter: 0.02 });
    lp.light(0, 0.55, 0, LPC.spectral, 1.4, 7, 0.55, 2);
  } else lp.blob(0, 0.1, 0, 0.2, 0.06, 0.2, LPC.charcoal, {});
  // menhir con rune
  for (const [x, z] of [[-0.78, -0.78], [0.8, -0.7]]) {
    lp.push([x, 0, z], r.range(0, 1), 0, r.range(-0.08, 0.08));
    lp.blob(0, 0.42, 0, 0.14, 0.45, 0.11, LPC.stoneDark, { vary: 0.1, jitter: 0.04, topTint: LPC.moss, topAmount: 0.3 });
    lp.box(0, 0.4, 0.1, 0.05, 0.22, 0.02, lit ? LPC.spectral : LPC.engrave, { bucket: lit ? 'glow' : 'solid', jitter: 0 });
    lp.box(0, 0.5, 0.1, 0.12, 0.03, 0.02, lit ? LPC.spectral : LPC.engrave, { bucket: lit ? 'glow' : 'solid', jitter: 0 });
    lp.pop();
  }
  decayLP(lp, v, 1.8, 1.8);
  return lp.build();
}

export function candleTreeLP(v: PVis): LPModel {
  const lp = new LP(`lp:candletree:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  const lit = on(v);
  const tips = gnarledTree(lp, 1.9, '#3d2e26', 7);
  for (const [x, y, z] of tips) {
    lp.cyl(x, y - 0.02, z, 0.06, 0.05, 0.03, 6, LPC.iron, { jitter: 0 });
    candle(lp, x, y, z, lit, 0.1 + r.next() * 0.08);
  }
  for (let i = 0; i < 9; i++) { const a = r.range(0, 6.28), d = r.range(0.45, 1.2); candle(lp, Math.cos(a) * d, 0, Math.sin(a) * d, lit, 0.06 + r.next() * 0.14); }
  lp.blob(0, 0.6, 0.17, 0.06, 0.09, 0.02, LPC.charcoal, { jitter: 0 });
  if (lit) lp.light(0, 1.8, 0, LPC.flame, 1.3, 7, 0.3, 1.6);
  decayLP(lp, v, 2.6, 2.6);
  return lp.build();
}

// ── Costruzioni ──────────────────────────────────────────────────────────

export function shrineLP(v: PVis): LPModel {
  const lp = new LP(`lp:shrine:${v.seed}:${v.dirty}${v.broken}`);
  const lit = on(v);
  const o = mossy(v);
  lp.box(0, 0, -0.1, 2.5, 0.14, 2.3, LPC.stoneDark, { bevel: 0.02, ...o });
  lp.box(0, 0, 1.15, 1.6, 0.08, 0.35, LPC.stoneLight, { bevel: 0.015 });
  // cappella: tre muri e facciata aperta ad arco
  const W = 1.9, D = 1.7, H = 1.45;
  lp.push([0, 0.14, -0.2]);
  for (const sx of [-1, 1]) lp.box(sx * (W / 2 - 0.08), 0, 0, 0.16, H, D, LPC.stoneWarm, { bevel: 0.015, vary: 0.06, ao: 0.25 });
  lp.box(0, 0, -D / 2 + 0.08, W, H, 0.16, LPC.stoneWarm, { bevel: 0.015, vary: 0.06, ao: 0.25 });
  quoins(lp, W, D, H, 0, LPC.stoneLight);
  // facciata con arco gotico (sagoma con foro)
  const front = gothicArchShape(W, H + 0.4, 5);
  const hole = gothicArchShape(1.0, 1.25, 5);
  front.holes.push(new THREE.Path(hole.getPoints().reverse()));
  lp.push([0, 0, D / 2 - 0.08]).extrude(front, 0.16, LPC.stone, { bevel: 0.012, vary: 0.05, ...o }).pop();
  lp.push([0, 0, D / 2 + 0.005]).plate((() => { const f = gothicArchShape(1.12, 1.33, 5); f.holes.push(new THREE.Path(gothicArchShape(1.0, 1.25, 5).getPoints().reverse())); return f; })(), 0.03, LPC.stoneLight, { ao: 0 }).pop();
  // interno: altare, icona illuminata, candele
  lp.box(0, 0, -0.35, 0.8, 0.5, 0.35, LPC.marble, { bevel: 0.015 });
  lp.box(0, 0.5, -0.35, 0.86, 0.04, 0.4, LPC.stoneLight, { bevel: 0.008 });
  lp.push([0, 0.6, -0.68]).plate(roundTopShape(0.38, 0.55, 7), 0.03, lit ? '#d9a25a' : '#4a3a2a', { bucket: lit ? 'glow' : 'solid', ao: 0 }).pop();
  lp.push([0, 0.66, -0.66]).plate(roundTopShape(0.2, 0.36, 7), 0.02, '#5a7590', { ao: 0 }).pop();
  for (const x of [-0.3, -0.18, 0.18, 0.3]) candle(lp, x, 0.54, -0.3, lit, 0.08 + Math.abs(x) * 0.2);
  lp.pop();
  // tetto e campaniletto a vela
  lp.push([0, 0, -0.2]);
  gableRoof(lp, D + 0.1, W + 0.05, 0.14 + H, 0.75, LPC.roofDark, 0.1, true);
  frontGable(lp, D / 2 - 0.08, W, 0.14 + H, 0.75, LPC.stone, 0.16);
  frontGable(lp, -D / 2 + 0.08, W, 0.14 + H, 0.75, LPC.stoneWarm, 0.16);
  lp.pop();
  lp.push([0, 0.14 + H + 0.6, 0.55]);
  const bell = gothicArchShape(0.42, 0.62, 4);
  bell.holes.push(new THREE.Path(gothicArchShape(0.24, 0.4, 4, 0.08).getPoints().reverse()));
  lp.extrude(bell, 0.12, LPC.stone, { bevel: 0.01, ...o });
  lp.lathe(0, 0.18, 0, [[0.0, 0], [0.09, 0], [0.08, 0.04], [0.05, 0.14], [0, 0.16]], 7, LPC.gold, { jitter: 0 });
  lp.box(0, 0.7, 0, 0.03, 0.2, 0.03, LPC.iron, { jitter: 0 });
  lp.box(0, 0.83, 0, 0.12, 0.03, 0.03, LPC.iron, { jitter: 0 });
  lp.pop();
  for (const x of [-0.95, 0.95]) { candle(lp, x, 0.14, 1.0, lit, 0.14); candle(lp, x * 0.85, 0.14, 1.1, lit, 0.09); }
  bouquet(lp, -0.5, 0.14, 1.05, 1.2);
  ivy(lp, -W / 2 - 0.02, 0.14, 0.55, 1.2, 0.08);
  if (lit) lp.light(0, 0.9, -0.3, LPC.flame, 1, 5, 0.25, 1);
  decayLP(lp, v, 2.6, 2.6);
  return lp.build();
}

export function fountainLP(v: PVis): LPModel {
  const lp = new LP(`lp:fountain:${v.seed}:${v.dirty}${v.broken}`);
  const o = mossy(v);
  const water = v.dirty ? '#3a4a3a' : LPC.water;
  // vasca ottagonale cava: parete esterna, bordo, parete interna fino all'acqua
  lp.lathe(0, 0, 0, [[1.3, 0], [1.34, 0.36], [1.42, 0.4], [1.42, 0.48], [1.2, 0.48], [1.17, 0.4], [1.15, 0.12], [0.0, 0.12]], 8, LPC.stone, { vary: 0.06, ao: 0.3, ...o });
  lp.cyl(0, 0.3, 0, 1.17, 1.17, 0.02, 8, water, { bucket: 'water', jitter: 0 });
  // fusto tornito e coppa superiore concava
  lp.lathe(0, 0.12, 0, [[0.25, 0], [0.2, 0.12], [0.14, 0.2], [0.13, 0.88], [0.2, 0.96], [0.5, 1.04], [0.56, 1.1], [0.48, 1.1], [0.44, 1.05], [0.0, 1.03]], 8, LPC.stoneLight, { vary: 0.05, ao: 0.25, ...o });
  lp.cyl(0, 1.16, 0, 0.45, 0.45, 0.02, 8, v.broken ? LPC.stoneDark : water, { bucket: v.broken ? 'solid' : 'water', jitter: 0 });
  // putto/ pigna in cima
  lp.lathe(0, 1.15, 0, [[0.0, 0], [0.09, 0], [0.12, 0.1], [0.08, 0.22], [0.03, 0.3], [0, 0.32]], 7, LPC.stoneLight, { jitter: 0.005 });
  if (!v.broken) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      lp.push([Math.cos(a) * 0.5, 0.31, Math.sin(a) * 0.5], 0, 0, 0).cyl(0, 0, 0, 0.03, 0.022, 0.86, 5, '#8fb3b4', { bucket: 'water', jitter: 0 }).pop();
    }
    for (let i = 0; i < 5; i++) lp.push([Math.cos(i) * 0.75, 0.33, Math.sin(i) * 0.75], 0, -Math.PI / 2).add(new THREE.RingGeometry(0.05, 0.08, 8), '#a9c6c6', { bucket: 'water', jitter: 0, ao: 0 }).pop();
  }
  for (let i = 0; i < 5; i++) moss(lp, Math.cos(i * 1.3) * 1.36, 0.25, Math.sin(i * 1.3) * 1.36, 0.08);
  decayLP(lp, v, 2.6, 2.6);
  return lp.build();
}

/** Archi d'ingresso (3×1): pietra a tutto sesto, con luci, o gotico con teschio. */
export function archLP(v: PVis): LPModel {
  const lp = new LP(`lp:${v.type}:${v.seed}:${v.dirty}${v.broken}`);
  const lit = on(v);
  const gothic = v.type === 'arch_gothic';
  const o = mossy(v);
  const stone = gothic ? LPC.stoneDark : LPC.stone;
  for (const sx of [-1, 1]) {
    const x = sx * 1.2;
    lp.box(x, 0, 0, 0.5, 0.18, 0.5, LPC.stoneDark, { bevel: 0.02, ...o });
    lp.box(x, 0.18, 0, 0.4, 1.7, 0.4, stone, { bevel: 0.02, vary: 0.06, ao: 0.25 });
    lp.push([x, 0, 0]); quoins(lp, 0.4, 0.4, 1.6, 0.2, LPC.stoneLight); lp.pop();
    lp.box(x, 1.88, 0, 0.5, 0.1, 0.5, LPC.stoneLight, { bevel: 0.012, ...o });
  }
  if (gothic) {
    const outer = gothicArchShape(2.9, 3.2, 6, 0, 0.9);
    outer.holes.push(new THREE.Path(gothicArchShape(2.0, 2.85, 6, 0, 0.9).getPoints().reverse()));
    lp.push([0, 0, 0]).extrude(outer, 0.36, stone, { bevel: 0.015, vary: 0.05, ...o }).pop();
    skull(lp, 0, 2.62, 0.16, 1.2);
    lp.cyl(0, 3.15, 0, 0.12, 0, 0.45, 4, LPC.stoneLight, { jitter: 0.004 });
    for (const sx of [-1, 1]) lp.cyl(sx * 1.2, 1.98, 0, 0.14, 0, 0.5, 4, LPC.stoneLight, { jitter: 0.004 });
  } else {
    // arco a tutto sesto a conci, con chiave di volta
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = Math.PI - (i + 0.5) * (Math.PI / n);
      lp.push([Math.cos(a) * 1.2, 1.9 + Math.sin(a) * 1.0, 0], 0, 0, a - Math.PI / 2).box(0, -0.15, 0, 0.36, 0.3, 0.4, i % 2 ? LPC.stone : LPC.stoneWarm, { bevel: 0.015, vary: 0.06, ...o }).pop();
    }
    lp.box(0, 2.78, 0, 0.26, 0.34, 0.46, LPC.stoneLight, { bevel: 0.015 });
  }
  if (v.type === 'arch_lights') {
    for (const x of [-0.55, 0.55]) hangingLantern(lp, x, 2.45, 0, lit, 0.9);
    for (let i = 0; i < 9; i++) { const a = Math.PI - (i + 0.5) * (Math.PI / 9); lp.blob(Math.cos(a) * 1.25, 1.9 + Math.sin(a) * 1.05, 0.22, 0.03, 0.03, 0.03, lit ? (i % 2 ? '#ffd27a' : '#ff9a5a') : '#3c3a35', { bucket: lit ? 'glow' : 'solid', jitter: 0 }); }
  }
  ivy(lp, -1.38, 0.18, 0.2, 1.6, 0.08);
  if (v.broken) { lp.box(0.6, 0, 0.35, 0.3, 0.18, 0.22, stone, { bevel: 0.02 }); pebbles(lp, -1.4, -0.4, 1.4, 0.4, 6); }
  decayLP(lp, v, 3, 0.9);
  return lp.build();
}

export function wallStoneLP(v: PVis): LPModel {
  const lp = new LP(`lp:wallstone:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  for (let row = 0; row < 3; row++) {
    let x = -0.5 + (row % 2 ? 0.12 : 0);
    while (x < 0.5) {
      const w = Math.min(0.5 - x, 0.22 + r.next() * 0.16);
      if (!(v.broken && row === 2 && r.chance(0.6))) lp.box(x + w / 2, row * 0.19, 0, w - 0.015, 0.18, 0.36, r.pick([LPC.stone, LPC.stoneDark, LPC.stoneWarm, '#5d6168']), { bevel: 0.025, vary: 0.08, ao: 0.25 });
      x += w;
    }
  }
  if (!v.broken) lp.box(0, 0.57, 0, 1.02, 0.07, 0.42, LPC.stoneLight, { bevel: 0.015, topTint: LPC.moss, topAmount: v.dirty ? 0.6 : 0.25 });
  if (r.chance(0.6)) moss(lp, r.range(-0.3, 0.3), 0.2, 0.19, 0.08);
  grassTuft(lp, r.range(-0.4, 0.4), 0.24, 1);
  decayLP(lp, v, 1, 0.5);
  return lp.build();
}

export function fenceWoodLP(v: PVis): LPModel {
  const lp = new LP(`lp:fencewood:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  for (const x of [-0.46, 0.46]) lp.push([x, 0, 0], 0, 0, r.range(-0.05, 0.05)).box(0, 0, 0, 0.09, 0.85, 0.09, LPC.woodDark, { bevel: 0.01, vary: 0.12 }).cyl(0, 0.85, 0, 0.06, 0, 0.06, 4, LPC.woodDark, { jitter: 0 }).pop();
  for (const y of [0.25, 0.62]) lp.push([0, y, -0.06], 0, 0, r.range(-0.05, 0.05)).box(0, 0, 0, 1.0, 0.07, 0.04, LPC.wood, { bevel: 0.006, vary: 0.12 }).pop();
  for (let i = 0; i < 6; i++) {
    if (v.broken && r.chance(0.4)) continue;
    const x = -0.34 + i * 0.136;
    const h = 0.68 + r.next() * 0.1;
    lp.push([x, 0, 0], 0, 0, r.range(-0.07, 0.07));
    lp.box(0, 0, 0, 0.09, h, 0.025, r.pick([LPC.woodLight, LPC.wood, '#8a6c50']), { bevel: 0.006, vary: 0.1 });
    const tip = new THREE.Shape(); tip.moveTo(-0.045, 0); tip.lineTo(0.045, 0); tip.lineTo(0, 0.07); tip.closePath();
    lp.push([0, h, -0.0125]).plate(tip, 0.025, LPC.woodLight, { ao: 0 }).pop();
    lp.pop();
  }
  grassTuft(lp, r.range(-0.4, 0.4), 0.1, 1.1);
  decayLP(lp, v, 1, 0.4);
  return lp.build();
}

export function fenceIronLP(v: PVis): LPModel {
  const lp = new LP(`lp:fenceiron:${v.seed}:${v.dirty}${v.broken}`);
  lp.box(0, 0, 0, 1.02, 0.15, 0.24, LPC.stoneDark, { bevel: 0.02, vary: 0.08, ...mossy(v) });
  for (const x of [-0.46, 0.46]) {
    lp.box(x, 0.15, 0, 0.08, 1.15, 0.08, LPC.iron, { bevel: 0.008 });
    lp.blob(x, 1.36, 0, 0.055, 0.055, 0.055, LPC.iron, { jitter: 0 });
  }
  for (const y of [0.4, 1.05]) lp.box(0, y, 0, 0.92, 0.035, 0.035, LPC.iron, { jitter: 0 });
  for (let i = 0; i < 6; i++) {
    const x = -0.33 + i * 0.132;
    const bent = v.broken && x > 0 ? 0.35 : 0;
    lp.push([x, 0.15, 0], 0, 0, bent).cyl(0, 0, 0, 0.014, 0.014, 1.0, 4, LPC.iron, { jitter: 0 }).cyl(0, 1.0, 0, 0.035, 0, 0.1, 4, LPC.iron, { jitter: 0 }).pop();
    if (i % 2 === 0) lp.add(new THREE.TorusGeometry(0.055, 0.008, 3, 8, Math.PI).translate(x + 0.066, 0.42, 0), LPC.iron, { jitter: 0 });
  }
  decayLP(lp, v, 1, 0.4);
  return lp.build();
}

export function openGraveLP(v: PVis): LPModel {
  const lp = new LP(`lp:opengrave:${v.seed}:${v.dirty}`);
  const r = lp.rng;
  // fossa: bordo di terra e fondo scuro
  const pit = new THREE.Shape();
  pit.moveTo(-0.42, -0.62); pit.lineTo(0.42, -0.62); pit.lineTo(0.45, 0.55); pit.lineTo(-0.45, 0.58); pit.closePath();
  lp.push([0, 0.012, 0.15], 0, -Math.PI / 2).plate(pit, 0.01, '#120d0a', { ao: 0 }).pop();
  for (const sx of [-1, 1]) lp.push([sx * 0.47, 0.0, 0.15]).box(0, -0.02, 0, 0.06, 0.08, 1.2, LPC.soilDark, { jitter: 0.01 }).pop();
  // cumuli di terra smossa
  lp.blob(-0.78, 0.08, 0.2, 0.22, 0.2, 0.55, LPC.soil, { detail: 1, jitter: 0.04, vary: 0.12 });
  lp.blob(0.78, 0.06, -0.2, 0.2, 0.16, 0.4, LPC.soilDark, { detail: 1, jitter: 0.04, vary: 0.12 });
  // lapide inclinata, pala piantata, lanterna
  lp.push([0, 0, -0.72], 0, 0.15, -0.25).extrude(roundTopShape(0.7, 0.95, 7), 0.13, LPC.stone, { bevel: 0.015, vary: 0.06, topTint: LPC.moss, topAmount: 0.4 }).pop();
  lp.push([0.82, 0.25, 0.25], 0.3, 0.1, -0.3).cyl(0, 0, 0, 0.018, 0.018, 0.85, 4, LPC.wood, { jitter: 0 }).box(0, -0.05, 0, 0.16, 0.2, 0.02, LPC.ironLight, { jitter: 0 }).pop();
  hangingLantern(lp, -0.8, 0.45, -0.6, true, 0.8);
  lp.cyl(-0.8, 0, -0.6, 0.02, 0.02, 0.45, 4, LPC.woodDark, { jitter: 0 });
  pebbles(lp, -0.9, -0.9, 0.9, 0.9, 7);
  for (let i = 0; i < 3; i++) weeds(lp, r.range(-0.9, 0.9), r.pick([-0.85, 0.9]), 0.8);
  decayLP(lp, v, 1.8, 1.8);
  return lp.build();
}

export function hellHoleLP(v: PVis): LPModel {
  const lp = new LP(`lp:hellhole:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  const lit = on(v);
  lp.cyl(0, -0.02, 0, 0.92, 0.92, 0.04, 10, '#1b1311', { jitter: 0.02 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    lp.blob(Math.cos(a) * 0.78, 0.1, Math.sin(a) * 0.78, 0.2, 0.14 + r.next() * 0.12, 0.17, r.pick([LPC.stoneDark, '#2b2321', '#3a2a24']), { vary: 0.12, jitter: 0.05 });
  }
  lp.cyl(0, 0.0, 0, 0.55, 0.45, 0.06, 9, lit ? '#ff5a2a' : '#3b1a12', { bucket: lit ? 'glow' : 'solid', jitter: 0.02 });
  lp.cyl(0, 0.04, 0, 0.3, 0.2, 0.06, 8, lit ? '#ffc35a' : '#2a120c', { bucket: lit ? 'glow' : 'solid', jitter: 0.02 });
  // crepe incandescenti a raggiera e lingue di fuoco
  for (let i = 0; i < 6; i++) {
    const a = r.range(0, Math.PI * 2);
    lp.push([0, 0.012, 0], -a).box(0.75, 0, 0, 0.5, 0.012, 0.035, lit ? '#ff5a2a' : '#3b1a12', { bucket: lit ? 'glow' : 'solid', jitter: 0.01 }).pop();
  }
  if (lit) {
    for (let i = 0; i < 4; i++) lp.cyl(r.range(-0.2, 0.2), 0.05, r.range(-0.2, 0.2), 0.08, 0, 0.25 + r.next() * 0.25, 4, i % 2 ? '#ff7a2a' : '#ffc35a', { bucket: 'glow', jitter: 0.02 });
    lp.light(0, 0.35, 0, '#ff5a2a', 1.4, 6, 0.4, 1.6);
  }
  skull(lp, 0.6, 0.15, 0.55, 0.9);
  decayLP(lp, v, 1.8, 1.8);
  return lp.build();
}

export function petHouseLP(v: PVis): LPModel {
  const lp = new LP(`lp:pethouse:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  lp.box(0, 0, -0.1, 1.15, 0.08, 1.05, LPC.woodDark, { bevel: 0.01, vary: 0.1 });
  lp.box(0, 0.08, -0.12, 0.95, 0.75, 0.85, LPC.wood, { bevel: 0.012, vary: 0.06, ao: 0.2 });
  for (let x = -0.4; x <= 0.4; x += 0.13) for (const s of [-1, 1]) lp.box(x, 0.1, -0.12 + s * 0.428, 0.01, 0.72, 0.01, LPC.charcoal, { jitter: 0, ao: 0 });
  lp.push([0, 0, -0.12]);
  gableRoof(lp, 0.85, 0.95, 0.83, 0.4, LPC.roofDark, 0.09, true);
  for (const zz of [0.4, -0.4]) frontGable(lp, zz, 0.95, 0.83, 0.4, LPC.wood, 0.05);
  lp.pop();
  lp.push([0, 0.08, 0.31]).plate(gothicArchShape(0.42, 0.52, 5), 0.02, '#141210', { ao: 0 }).pop();
  lp.push([0, 0.75, 0.33]).box(0, 0, 0, 0.36, 0.1, 0.02, LPC.woodLight, { bevel: 0.005 }).box(0, 0.03, 0.012, 0.22, 0.03, 0.006, LPC.charcoal, { jitter: 0 }).pop();
  // ciotola con osso e osso decorativo sul tetto
  lp.lathe(0.48, 0.0, 0.62, [[0, 0], [0.09, 0], [0.12, 0.06], [0.1, 0.07], [0, 0.04]], 8, LPC.iron, { jitter: 0 });
  lp.push([0.48, 0.07, 0.62], r.range(0, 3), 0, Math.PI / 2).cyl(0, -0.08, 0, 0.012, 0.012, 0.16, 4, LPC.bone, { jitter: 0 }).blob(0, -0.08, 0, 0.022, 0.018, 0.022, LPC.bone, { jitter: 0 }).blob(0, 0.08, 0, 0.022, 0.018, 0.022, LPC.bone, { jitter: 0 }).pop();
  grassTuft(lp, -0.6, 0.6, 1.1);
  decayLP(lp, v, 1.8, 1.8);
  return lp.build();
}

/** Bara aperta (1×2 lungo z) con imbottitura rossa e coperchio appoggiato. */
export function openCoffinLP(v: PVis): LPModel {
  const lp = new LP(`lp:coffin:${v.seed}:${v.dirty}`);
  const prof = (s: number) => { const c = new THREE.Shape(); c.moveTo(-0.24 * s, -0.9 * s); c.lineTo(0.24 * s, -0.9 * s); c.lineTo(0.36 * s, 0.35 * s); c.lineTo(0.22 * s, 0.9 * s); c.lineTo(-0.22 * s, 0.9 * s); c.lineTo(-0.36 * s, 0.35 * s); c.closePath(); return c; };
  lp.push([0, 0, 0], 0, -Math.PI / 2).plate(prof(1), 0.26, '#3f2c22', { vary: 0.08, ao: 0.3 }).pop();
  lp.push([0, 0.26, 0], 0, -Math.PI / 2).plate(prof(0.86), 0.012, '#6a1f22', { vary: 0.1, ao: 0 }).pop();
  lp.blob(0, 0.28, -0.62, 0.17, 0.05, 0.12, '#d9cdb5', { jitter: 0.01 }); // cuscino
  for (let i = 0; i < 3; i++) flower(lp, -0.1 + i * 0.1, 0.1 + i * 0.05, LPC.flowers[2], 0.18, 0.26);
  lp.push([0.5, 0, 0.05], 0, -Math.PI / 2, -0.45).plate(prof(1), 0.05, '#4a3324', { vary: 0.08 }).pop();
  lp.box(0.62, 0.36, 0.05, 0.01, 0.03, 0.3, LPC.gold, { jitter: 0 });
  for (const z of [-0.5, 0.0, 0.5]) for (const s of [-1, 1]) lp.box(s * 0.33, 0.12, z, 0.02, 0.05, 0.12, LPC.gold, { jitter: 0 });
  cobweb(lp, -0.2, 0.26, 0.88, 0.14);
  decayLP(lp, v, 0.9, 1.9);
  return lp.build();
}

// ── Ambiente ─────────────────────────────────────────────────────────────

export function spectralTreeLP(v: PVis): LPModel {
  const lp = new LP(`lp:spectral:${v.seed}`);
  const r = lp.rng;
  const glow = v.lit;
  const tips = gnarledTree(lp, 2.0, '#2b2a30', 7);
  for (const [x, y, z] of tips) lp.blob(x, y + 0.05, z, 0.24 + r.next() * 0.1, 0.17, 0.24, glow ? r.pick([LPC.spectral, '#9fe0d0']) : '#3f6f63', { bucket: glow ? 'glow' : 'solid', vary: 0.1, jitter: 0.04 });
  for (let i = 0; i < 8; i++) lp.blob(r.range(-1.1, 1.1), 0.03, r.range(-1.1, 1.1), 0.04, 0.03, 0.04, '#5fae98', { bucket: glow ? 'glow' : 'solid', jitter: 0 });
  if (glow) lp.light(0, 1.9, 0, LPC.spectral, 1.2, 7, 0.2, 1.8);
  return lp.build();
}

/** Albero di Natale "morto": pino secco con lucine, palline e stella. */
export function xmasTreeLP(v: PVis): LPModel {
  const lp = new LP(`lp:xmas:${v.seed}:${v.lit}`);
  const r = lp.rng;
  const lit = v.lit;
  const h = 2.3;
  lp.cyl(0, 0, 0, 0.11, 0.05, h * 0.9, 6, LPC.woodDark, { vary: 0.1 });
  for (let i = 0; i < 5; i++) {
    const t = i / 5, y = 0.35 + t * (h - 0.7), rad = 0.8 - t * 0.55;
    lp.push([0, y, 0], r.range(0, 1)).cyl(0, 0, 0, rad, rad * 0.12, 0.55 - t * 0.1, 7, r.pick([LPC.dryDark, '#6a5a3a', '#5e5434', '#4e4a30']), { vary: 0.12, ao: 0.35, jitter: 0.05 }).pop();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + i;
      const px = Math.cos(a) * rad * 0.85, pz = Math.sin(a) * rad * 0.85, py = y + 0.08;
      if (k % 2) lp.blob(px, py, pz, 0.045, 0.045, 0.045, r.pick([LPC.red, LPC.gold, '#5a7590']), { jitter: 0 });
      else lp.blob(px, py + 0.05, pz, 0.025, 0.025, 0.025, lit ? r.pick(['#ffd27a', '#ff9a5a', '#9fe0d0']) : '#3c3a35', { bucket: lit ? 'glow' : 'solid', jitter: 0 });
    }
  }
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.05 : 0.12; if (i) star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  star.closePath();
  lp.push([0, h - 0.05, 0]).extrude(star, 0.03, lit ? '#ffd27a' : LPC.gold, { bucket: lit ? 'glow' : 'solid', jitter: 0 }).pop();
  if (lit) lp.light(0, h * 0.6, 0, '#ffd27a', 0.8, 4.5, 0.25, 1);
  pumpkin(lp, 0.55, 0, 0.45, 0.1, false, false);
  return lp.build();
}

export function toxicPuddleLP(v: PVis): LPModel {
  const lp = new LP(`lp:toxic:${v.seed}`);
  const r = lp.rng;
  for (const [x, rr] of [[-0.35, 0.5], [0.5, 0.3]] as const) {
    lp.push([x, 0.005, 0], r.range(0, 6), -Math.PI / 2).plate(irregularShape(r, rr + 0.08, 9), 0.01, '#2a3a1c', { ao: 0 }).pop();
    lp.push([x, 0.018, 0], r.range(0, 6), -Math.PI / 2).plate(irregularShape(r, rr, 9), 0.01, '#9bd34a', { bucket: 'glow', ao: 0 }).pop();
  }
  for (let i = 0; i < 6; i++) lp.blob(r.range(-0.7, 0.7), 0.04, r.range(-0.3, 0.3), 0.03 + r.next() * 0.03, 0.025, 0.03, '#c8f07c', { bucket: 'glow', jitter: 0 });
  for (let i = 0; i < 4; i++) weeds(lp, r.range(-0.9, 0.9), r.pick([-0.4, 0.4]), 0.8);
  lp.light(0, 0.2, 0, '#9bd34a', 0.45, 3, 0.25, 0.8);
  return lp.build();
}

export function monsterRocksLP(v: PVis): LPModel {
  const lp = new LP(`lp:monster:${v.seed}:${v.lit}`);
  const r = lp.rng;
  const eyes = v.lit ? { color: '#d8452a', bucket: 'glow' as const } : { color: '#5a2a24', bucket: 'solid' as const };
  lp.blob(-0.05, 0.42, -0.1, 0.62, 0.5, 0.52, LPC.stoneDark, { vary: 0.1, jitter: 0.08, topTint: LPC.moss, topAmount: 0.55 });
  lp.blob(0.6, 0.22, 0.45, 0.32, 0.26, 0.28, LPC.stone, { vary: 0.1, jitter: 0.06 });
  lp.blob(-0.62, 0.18, 0.5, 0.26, 0.2, 0.26, LPC.stoneDark, { vary: 0.1, jitter: 0.06 });
  for (const x of [-0.18, 0.12]) lp.push([x, 0.55, 0.38], 0, 0, x * 2).blob(0, 0, 0, 0.08, 0.05, 0.03, eyes.color, { bucket: eyes.bucket, jitter: 0 }).pop();
  lp.box(-0.03, 0.27, 0.42, 0.42, 0.1, 0.04, LPC.charcoal, { jitter: 0.01 });
  for (let i = 0; i < 5; i++) lp.cyl(-0.2 + i * 0.09, 0.28, 0.43, 0.025, 0, i % 2 ? 0.06 : -0.06, 3, LPC.bone, { jitter: 0 });
  for (let i = 0; i < 3; i++) grassTuft(lp, r.range(-0.8, 0.8), r.range(-0.8, 0.8), 1.2);
  if (v.lit) lp.light(0, 0.55, 0.5, '#d8452a', 0.4, 2.5, 0.3, 0.5);
  return lp.build();
}

export function hillockLP(v: PVis): LPModel {
  const lp = new LP(`lp:hillock:${v.seed}`);
  const r = lp.rng;
  lp.blob(0, -0.05, 0, 0.92, 0.42, 0.88, '#4a5f3f', { detail: 1, jitter: 0.05, vary: 0.06, ao: 0.1, topTint: '#56693f', topAmount: 0.4 });
  lp.blob(-0.4, 0.1, 0.25, 0.3, 0.22, 0.28, LPC.stone, { vary: 0.1, topTint: LPC.moss, topAmount: 0.5 });
  for (let i = 0; i < 8; i++) { const a = r.range(0, 6.28), d = r.range(0, 0.7); grassTuft(lp, Math.cos(a) * d, Math.sin(a) * d, 1.3); }
  for (let i = 0; i < 5; i++) { const a = r.range(0, 6.28), d = r.range(0.2, 0.7); flower(lp, Math.cos(a) * d, Math.sin(a) * d, r.pick(LPC.flowers), 0.12, 0.3 - d * 0.35); }
  return lp.build();
}

export function mudLP(v: PVis): LPModel {
  const lp = new LP(`lp:mud:${v.seed}`);
  const r = lp.rng;
  lp.push([0, 0.004, 0], r.range(0, 6), -Math.PI / 2).plate(irregularShape(r, 0.45, 9), 0.01, '#2c2119', { ao: 0 }).pop();
  lp.push([0.08, 0.016, -0.05], r.range(0, 6), -Math.PI / 2).plate(irregularShape(r, 0.22, 7), 0.008, '#3b4648', { bucket: 'water', ao: 0 }).pop();
  pebbles(lp, -0.4, -0.4, 0.4, 0.4, 3);
  for (let i = 0; i < 3; i++) lp.push([r.range(-0.3, 0.3), 0.018, r.range(-0.3, 0.3)], r.range(0, 3), -Math.PI / 2).plate(irregularShape(r, 0.035, 5, 0.6), 0.005, '#1c1612', { ao: 0 }).pop();
  return lp.build();
}

// ── "Case" delle presenze piazzabili ─────────────────────────────────────

export function npcHomeLP(v: PVis): LPModel {
  const lp = new LP(`lp:npc:${v.type}:${v.seed}`);
  const r = lp.rng;
  switch (v.type) {
    case 'zombies_play': {
      lp.box(0, 0, 0, 0.6, 0.4, 0.6, LPC.wood, { bevel: 0.015, vary: 0.1 });
      for (const s of [-1, 1]) lp.box(s * 0.28, 0, 0, 0.04, 0.4, 0.62, LPC.woodDark, { jitter: 0 });
      lp.box(0, 0.4, 0, 0.7, 0.05, 0.7, LPC.woodLight, { bevel: 0.008 });
      for (let i = 0; i < 5; i++) lp.push([r.range(-0.2, 0.2), 0.455, r.range(-0.2, 0.2)], r.range(0, 3)).box(0, 0, 0, 0.09, 0.006, 0.13, i % 2 ? '#c8c0ad' : '#8e2f2a', { jitter: 0, ao: 0 }).pop();
      candle(lp, 0.22, 0.45, 0.22, true, 0.08);
      for (const x of [-0.72, 0.72]) lp.cyl(x, 0, 0, 0.16, 0.16, 0.26, 7, LPC.woodDark, { vary: 0.12 });
      break;
    }
    case 'zombies_dance': {
      lp.cyl(0, 0, 0, 0.82, 0.82, 0.06, 10, LPC.stoneDark, { vary: 0.08 });
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; lp.box(Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55, 0.12, 0.006, 0.12, i % 2 ? LPC.stoneLight : LPC.stone, { jitter: 0, ao: 0 }); }
      // grammofono
      lp.box(-0.7, 0, -0.7, 0.32, 0.22, 0.32, LPC.woodDark, { bevel: 0.01 });
      lp.cyl(-0.7, 0.22, -0.7, 0.13, 0.13, 0.02, 10, LPC.charcoal, { jitter: 0 });
      lp.push([-0.7, 0.24, -0.62], 0, 0.6).lathe(0, 0, 0, [[0.02, 0], [0.03, 0.15], [0.08, 0.28], [0.16, 0.34], [0.18, 0.35]], 8, LPC.gold, { jitter: 0 }).pop();
      break;
    }
    case 'zombie_walker': {
      lp.blob(0, 0.0, 0, 0.42, 0.12, 0.42, LPC.soil, { detail: 1, jitter: 0.03 });
      lp.push([0.05, 0.08, 0.1], 0, -0.2, 0.15);
      lp.cyl(0, 0, 0, 0.04, 0.035, 0.3, 6, '#7c9a63', { jitter: 0 });
      for (let i = 0; i < 4; i++) lp.push([-0.03 + i * 0.02, 0.32, 0], 0, 0, -0.3 + i * 0.2).cyl(0, 0, 0, 0.01, 0.008, 0.08, 4, '#7c9a63', { jitter: 0 }).pop();
      lp.pop();
      pebbles(lp, -0.4, -0.4, 0.4, 0.4, 4);
      break;
    }
    case 'ghosts_roam': {
      lp.push([0, 0, -0.1]).extrude(roundTopShape(0.45, 0.6, 7), 0.14, LPC.stoneDark, { bevel: 0.012, topTint: LPC.moss, topAmount: 0.5 }).pop();
      lp.push([0, 0.18, -0.02]).plate(roundTopShape(0.2, 0.26, 6), 0.01, LPC.spectral, { bucket: 'glow', ao: 0 }).pop();
      lp.light(0, 0.3, 0.1, LPC.spectral, 0.4, 2.5, 0.3, 0.6);
      break;
    }
    case 'ghosts_ball': {
      for (const x of [-0.8, 0.8]) {
        for (const z of [-0.28, 0.28]) lp.cyl(x, 0, z, 0.03, 0.03, 0.5, 5, LPC.bone, { jitter: 0 });
        lp.push([x, 0.52, 0], 0, Math.PI / 2).cyl(0, -0.3, 0, 0.028, 0.028, 0.6, 5, LPC.bone, { jitter: 0 }).pop();
        for (const z of [-0.28, 0.28]) lp.blob(x, 0.52, z, 0.045, 0.04, 0.045, LPC.bone, { jitter: 0 });
      }
      skull(lp, r.range(-0.1, 0.1), 0, 0.1, 0.9);
      break;
    }
    case 'skeleton_pet': {
      lp.lathe(0, 0, 0, [[0, 0], [0.16, 0], [0.2, 0.08], [0.17, 0.09], [0, 0.05]], 9, LPC.iron, { jitter: 0 });
      lp.push([0, 0.07, 0], 0.4, 0, Math.PI / 2).cyl(0, -0.12, 0, 0.018, 0.018, 0.24, 4, LPC.bone, { jitter: 0 }).blob(0, -0.12, 0, 0.032, 0.026, 0.032, LPC.bone, { jitter: 0 }).blob(0, 0.12, 0, 0.032, 0.026, 0.032, LPC.bone, { jitter: 0 }).pop();
      break;
    }
    default:
      grassTuft(lp, 0, 0, 1);
  }
  return lp.build();
}

export { skull };
