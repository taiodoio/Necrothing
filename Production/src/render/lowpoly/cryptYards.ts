// Il cortile di ogni cripta (davanti alla camera) e il recinto del lotto 4 × 5: il selciato
// del suo tipo, gli oggetti di scena della famiglia e le piccole aggiunte di ogni versione.
// Stesse primitive degli altri generatori (kit.ts), pezzi rotti da rotto come nel resto del gioco.

import * as THREE from 'three';
import { LPC } from './palette.ts';
import { skull as gameSkull } from './extras.ts';
import { roundTopShape } from './kit.ts';
import { flower, hangingLantern, pumpkin } from './details.ts';
import {
  beam, block, cloth, CP, emit, flame, groundRing, leaf, mushroom, prof, put, root, slab, torus, tuft, turned, votive, type CryptCtx,
} from './cryptKit.ts';

const skull = (c: CryptCtx, x: number, y: number, z: number, s = 0.16, color: string = LPC.bone) => gameSkull(c.lp, x, y - s * 0.55, z, s / 0.1, color);

// ── Selciato e terreno ───────────────────────────────────────────────────

function ground(c: CryptCtx) {
  const { lp, v } = c;
  switch (c.family) {
    case 'zombie':
      for (const [x, z, rx, rz] of [[-0.96, 1.46, 0.66, 0.49], [1.02, 1.48, 0.52, 0.55], [0.49, 0.54, 0.28, 0.32]] as const) lp.blob(x, 0.008, z, rx, 0.014, rz, v.dirty ? '#3c3b29' : '#4b4932', { detail: 1, jitter: 0.012, ao: 0 });
      for (let i = 0; i < 9; i++) slab(lp, Math.sin(i * 1.1) * 0.09, 0.015, 0.35 + i * 0.23, 0.55, 0.055, 0.18, i % 2 ? '#8b8b75' : '#696d60', Math.sin(i) * 0.08);
      break;
    case 'ghost':
      // il vialetto di pietre piatte dalla porta al bordo del lotto
      ([[-0.2, 0.42], [-0.16, 0.72], [-0.24, 1.02], [-0.18, 1.33], [-0.26, 1.64], [-0.2, 1.95], [-0.25, 2.25]] as const)
        .forEach(([x, z], i) => slab(lp, x, 0.012, z, 0.34, 0.045, 0.24, i % 2 ? '#8d8a80' : '#7a776d', i * 0.4 - 0.2));
      break;
    case 'skeleton':
      slab(lp, 0, 0.012, 1.14, 3.05, 0.04, 1.9, '#5a5a4f');
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
        if (v.broken && row === 2 && col === 3) continue;
        slab(lp, -1.125 + col * 0.75, 0.05, 0.48 + row * 0.62, 0.73, 0.018, 0.59, (row + col) % 2 ? '#676c60' : '#a6a38e');
      }
      for (const z of [0.18, 2.19, 2.4]) slab(lp, 0, 0.01, z, 0.68, 0.055, 0.18, '#8f907f');
      break;
    case 'nature':
      ([[0, 2.25], [-0.14, 1.98], [-0.16, 1.63], [0.06, 1.29], [0.02, 0.94], [-0.07, 0.59], [0, 0.28]] as const).forEach(([x, z], i) => {
        const r = i % 2 ? 0.18 : 0.21;
        lp.cyl(x, 0.012, z, r, r, 0.055, 9, '#a08a60', { vary: 0.06 });
        groundRing(lp, x, 0.067, z, r * 0.57, 0.014, '#746245', 10);
      });
      break;
    case 'witch': {
      slab(lp, 0, 0.01, 1.18, 1.94, 0.065, 1.91, '#4a463f');
      const ring = emit(c, v.broken ? '#4f5a48' : '#7fcf6a');
      for (const r of [0.69, 0.77]) groundRing(lp, 0, 0.075, 1.18, r, 0.02, ring.color, 16, Math.PI * 2, ring.o);
      for (const z of [0.21, 2.2, 2.38]) slab(lp, 0, 0.01, z, 0.58, 0.055, 0.19, '#6f685d');
      break;
    }
  }
}

// ── Oggetti di scena ─────────────────────────────────────────────────────

function washTub(c: CryptCtx, x: number, z: number, stone = false) {
  const { lp, v } = c;
  turned(lp, x, 0.01, z, [[0, 0.02], [0.17, 0.02], [0.21, 0.09], [0.25, 0.31], [0.22, 0.34], [0.195, 0.28], [0.16, 0.09], [0, 0.09]], 9, stone ? '#9da897' : '#6d6759');
  const w = stone ? emit(c, v.broken ? '#4f5143' : '#6c9e91') : { color: v.broken ? '#4f5143' : '#6f775c', o: {} };
  lp.cyl(x, 0.19, z, 0.185, 0.185, 0.012, 9, w.color, { ...w.o, jitter: 0 });
  if (!stone) for (const yy of [0.12, 0.27]) torus(lp, x, yy, z, 0.217, 0.014, LPC.iron, [Math.PI / 2, 0, 0], Math.PI * 2, { jitter: 0 });
}

function zombieYard(c: CryptCtx) {
  const { lp, v } = c;
  // bucato rattoppato su due pali
  const y = v.broken ? 0.81 : 1.15, z = 0.72;
  for (const x of [-1.56, -0.53]) {
    const lean = v.broken && x > -0.6;
    beam(lp, [x, 0.02, z], [lean ? x + 0.15 : x, lean ? 0.72 : 1.22, z], 0.032, LPC.woodDark, 0.025);
    slab(lp, x, 0.01, z, 0.16, 0.07, 0.16, CP.dark);
  }
  for (let i = 0; i < 6; i++) {
    const curve = (t: number) => y + 0.045 - Math.sin(t * Math.PI) * (v.broken ? 0.15 : 0.07);
    beam(lp, [-1.56 + (i * 1.03) / 6, curve(i / 6), z], [-1.56 + ((i + 1) * 1.03) / 6, curve((i + 1) / 6), z], 0.009, '#b4a78a');
  }
  prof(lp, [[-0.12, 0], [-0.23, -0.09], [-0.18, -0.2], [-0.12, -0.16], [-0.12, -0.46], [0.13, -0.46], [0.13, -0.16], [0.19, -0.2], [0.24, -0.09], [0.12, 0], [0.06, -0.04], [-0.05, -0.04]], 0.018, '#8e9470', [-1.29, y, z], [0, -0.12, 0.06], { ao: 0.1 });
  block(lp, -1.29, y - 0.34, z + 0.025, 0.1, 0.09, 0.012, '#b3a17d', [0, 0, -0.12], { jitter: 0 });
  prof(lp, [[-0.15, 0], [0.15, 0], [0.17, -0.47], [0.035, -0.49], [0, -0.19], [-0.035, -0.49], [-0.17, -0.47]], 0.018, '#666e66', [-0.8, y - 0.015, z], [0, 0.08, -0.07], { ao: 0.1 });
  for (const x of [-1.41, -1.18, -0.91, -0.68]) lp.box(x, y - 0.015, z + 0.01, 0.022, 0.07, 0.036, '#b39b76', { jitter: 0 });
  if (v.broken) cloth(lp, -1.14, 0.05, 1.6, 0.44, 0.44, '#817b66', { ragged: true, laid: true });
  // tinozza e asse da bucato
  washTub(c, -1.1, 1.57);
  block(lp, -1.12, 0.15, 1.58, 0.22, 0.38, 0.04, '#9e8966', [0.4, 0, -0.08]);
  for (let i = 0; i < 4; i++) lp.box(-1.12, 0.24 + i * 0.055, 1.65, 0.18, 0.018, 0.018, '#625d4b', { jitter: 0 });
  // carriola di terra
  const x = 1.03, zz = 1.17;
  torus(lp, x, 0.18, zz - 0.39, 0.16, 0.04, LPC.iron, [0, Math.PI / 2, 0]);
  for (const sx of [-1, 1]) {
    beam(lp, [x + sx * 0.23, 0.27, zz - 0.31], [x + sx * 0.23, 0.4, zz + 0.32], 0.025, '#6d5c44');
    if (!(v.broken && sx === 1)) beam(lp, [x + sx * 0.23, 0.4, zz + 0.24], [x + sx * 0.23, 0.48, zz + 0.77], 0.025, '#9b8058');
    beam(lp, [x + sx * 0.2, 0.03, zz + 0.28], [x + sx * 0.2, 0.37, zz + 0.23], 0.025, LPC.iron);
    block(lp, x + sx * 0.28, 0.36, zz, 0.055, 0.2, 0.67, '#6e775d', [0, 0, sx * -0.15]);
  }
  for (const dz of [-0.31, 0.31]) block(lp, x, 0.36, zz + dz, 0.55, 0.2, 0.045, '#85846a');
  lp.box(x, 0.35, zz, 0.51, 0.14, 0.6, '#514630', { jitter: 0.01 });
  for (let i = 0; i < 5; i++) lp.blob(x + Math.sin(i * 2) * 0.14, 0.51, zz + Math.cos(i * 2) * 0.14, 0.16, 0.09, 0.17, '#67543a');
  for (const [xx, z2] of [[0.58, 0.43], [0.78, 0.35]] as const) { block(lp, xx, 0.02, z2, 0.11, 0.19, 0.16, '#454b3e'); block(lp, xx, 0.02, z2 + 0.08, 0.12, 0.07, 0.13, '#454b3e'); }
  beam(lp, [1.49, 0.03, 0.43], [1.37, 0.95, 0.29], 0.02, '#a18b62');
  prof(lp, [[-0.085, 0], [0.085, 0], [0.07, -0.15], [0, -0.21], [-0.07, -0.15]], 0.025, '#6b6f68', [1.49, 0.22, 0.44]);
}

/** Panchina di legno coi braccioli in ferro, alla scala della panchina del gioco (seduta a 0,38, lunga 1,3). */
function bench(c: CryptCtx, x: number, z: number, ry: number) {
  const { lp, v } = c;
  const L = 1.3;
  lp.push([x, 0, z], ry);
  if (!v.broken) {
    for (let i = 0; i < 3; i++) lp.box(0, 0.36, -0.12 + i * 0.12, L, 0.04, 0.1, LPC.wood, { bevel: 0.006, vary: 0.1 });
    for (let i = 0; i < 2; i++) lp.push([0, 0.52 + i * 0.15, -0.2], 0, -0.15).box(0, 0, 0, L, 0.08, 0.035, LPC.wood, { bevel: 0.006, vary: 0.1 }).pop();
  } else lp.push([0.25, 0.06, 0.15], 0.4, 0, 0.25).box(0, 0, 0, L, 0.04, 0.32, LPC.wood, { vary: 0.1 }).pop();
  for (const sx of [-1, 1]) {
    beam(lp, [sx * (L / 2 - 0.05), 0, 0.14], [sx * (L / 2 - 0.05), 0.38, 0.12], 0.024, LPC.iron);
    beam(lp, [sx * (L / 2 - 0.05), 0, -0.16], [sx * (L / 2 - 0.05), 0.82, -0.24], 0.024, LPC.iron);
    beam(lp, [sx * (L / 2 - 0.05), 0.54, 0.14], [sx * (L / 2 - 0.05), 0.54, -0.2], 0.02, LPC.iron);
  }
  lp.pop();
}

/** Lampione in ferro col lume caldo appeso al braccio, alto come i lampioni del gioco (~2,2). */
function yardLamp(c: CryptCtx, x: number, z: number, ry = 0) {
  const { lp } = c;
  lp.push([x, 0, z], ry);
  lp.box(0, 0, 0, 0.3, 0.1, 0.3, LPC.stoneDark, { bevel: 0.015 });
  lp.lathe(0, 0.1, 0, [[0.09, 0], [0.08, 0.06], [0.05, 0.14], [0, 0.14]], 8, LPC.iron, { jitter: 0 });
  lp.cyl(0, 0.24, 0, 0.04, 0.032, 1.85, 6, LPC.iron, { jitter: 0 });
  beam(lp, [0, 2.0, 0], [-0.38, 2.0, 0], 0.022, LPC.iron);
  put(lp, new THREE.TorusGeometry(0.1, 0.012, 3, 8, Math.PI), LPC.iron, [-0.12, 1.88, 0], [0, 0, Math.PI / 2], { jitter: 0 });
  hangingLantern(lp, -0.36, 1.98, 0, c.lit, 1.1);
  lp.pop();
}

function ghostYard(c: CryptCtx) {
  const { lp, v } = c;
  // in tutte: zucche vicino alla casa e un lampione accanto al vialetto
  for (const [x, z, r, carved] of [[-1.05, 0.35, 0.16, true], [-0.8, 0.52, 0.11, false]] as const) pumpkin(lp, x, 0, z, r, carved && !v.broken, c.lit && carved, 0.6, 1, false);
  yardLamp(c, 0.35, 2.05);
  if (c.variant === 1) {
    // 1 · il laghetto con le ninfee, la panchina a guardarlo, l'aiuola sotto le finestre
    const px = 0.85, pz = 1.3, R = 0.55;
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; lp.blob(px + Math.cos(a) * (R + 0.05), 0.05, pz + Math.sin(a) * (R + 0.02) * 0.85, 0.1, 0.07, 0.09, i % 3 ? LPC.stone : LPC.stoneLight, { vary: 0.1 }); }
    lp.push([px, 0, pz], 0, 0, 0, [1, 1, 0.85]);
    lp.cyl(0, 0, 0, R, R, 0.05, 14, v.broken ? '#3d352a' : '#2c4a50', { bucket: v.broken ? 'solid' : 'water', jitter: 0 });
    lp.pop();
    if (!v.broken) {
      for (const [dx, dz, r] of [[-0.2, -0.1, 0.12], [0.14, 0.12, 0.1], [0.24, -0.16, 0.11], [-0.05, 0.2, 0.09], [-0.3, 0.15, 0.08]] as const) {
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, r, 0.4, Math.PI * 2 - 0.1, false); sh.closePath();
        lp.push([px + dx, 0.052, pz + dz], dx * 7, -Math.PI / 2).plate(sh, 0.01, LPC.leaf, { ao: 0, vary: 0.12 }).pop();
      }
      for (const [dx, dz, col] of [[0.14, 0.12, '#e7a6bf'], [-0.2, -0.1, '#f2ead6'], [0.24, -0.16, '#e7a6bf']] as const) {
        for (let p = 0; p < 6; p++) lp.push([px + dx, 0.07, pz + dz], (p / 6) * Math.PI * 2, 0.5).box(0, 0, 0.03, 0.035, 0.014, 0.06, col, { jitter: 0, ao: 0 }).pop();
        lp.blob(px + dx, 0.085, pz + dz, 0.016, 0.014, 0.016, LPC.gold, { jitter: 0 });
      }
    } else for (let i = 0; i < 5; i++) lp.blob(px + (i - 2) * 0.12, 0.06, pz + Math.sin(i) * 0.15, 0.07, 0.008, 0.06, '#6b5a3a', { ao: 0 });
    bench(c, -1.1, 1.35, Math.PI / 2 + 0.25);
    for (let i = 0; i < 6; i++) flower(lp, 0.42 + (i % 3) * 0.17, 0.3 + Math.floor(i / 3) * 0.15, v.broken ? LPC.dry : i % 2 ? '#d6d7bf' : '#c9a7e8', 0.24);
  } else if (c.variant === 2) {
    // 2 · l'orto delle zucche, coi solchi, lo spaventapasseri-fantasma e l'annaffiatoio
    for (let r = 0; r < 3; r++) lp.box(0.75, 0, 0.75 + r * 0.42, 1.2, 0.06, 0.24, LPC.soil, { bevel: 0.02, vary: 0.12, jitter: 0.015 });
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
      if (v.broken && (r + k) % 2) continue;
      const x = 0.33 + k * 0.42, z = 0.75 + r * 0.42;
      pumpkin(lp, x, 0.05, z, 0.1 + ((r + k) % 3) * 0.03, false, false, r + k, 1, false);
      for (let l = 0; l < 2; l++) leaf(lp, x + 0.12, 0.08, z + (l - 0.5) * 0.1, 0.1, LPC.leaf, l * 2);
    }
    // spaventapasseri: palo, traversa, un lenzuolo con gli occhi e un cappello
    lp.push([-0.95, 0, 1.45], 0.4, 0, v.broken ? 0.3 : 0);
    beam(lp, [0, 0, 0], [0, 1.55, 0], 0.03, LPC.woodDark);
    beam(lp, [-0.4, 1.15, 0], [0.4, 1.15, 0], 0.025, LPC.woodDark);
    lp.blob(0, 1.4, 0, 0.17, 0.2, 0.15, '#e8ebe6', { detail: 1, jitter: 0.004 });
    lp.cyl(0, 0.75, 0, 0.24, 0.14, 0.6, 8, '#e8ebe6', { vary: 0.05 });
    for (const sx of [-1, 1]) lp.blob(sx * 0.06, 1.44, 0.14, 0.022, 0.03, 0.01, '#1f2a2c', { jitter: 0 });
    lp.cyl(0, 1.55, 0, 0.26, 0.26, 0.03, 10, LPC.woodDark, { jitter: 0 });
    lp.cyl(0, 1.58, 0, 0.12, 0.02, 0.32, 8, LPC.woodDark, { jitter: 0.004 });
    lp.pop();
    lp.cyl(-0.45, 0, 0.95, 0.12, 0.12, 0.24, 8, '#6d826c', { vary: 0.07 });
    beam(lp, [-0.35, 0.18, 0.95], [-0.15, 0.27, 0.95], 0.02, '#8a9b7b');
  } else {
    // 3 · il piccolo camposanto di famiglia sotto l'arco di rose, e la panchina
    lp.push([-0.22, 0, 1.15]);
    for (const sx of [-1, 1]) beam(lp, [sx * 0.42, 0, 0], [sx * 0.42, 1.55, 0], 0.035, LPC.woodDark);
    if (!(v.broken)) torus(lp, 0, 1.55, 0, 0.42, 0.03, LPC.woodDark, [0, 0, 0], Math.PI, { jitter: 0 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 11) * Math.PI, rr = 0.44;
      if (v.broken && i > 5) continue;
      lp.blob(Math.cos(a) * rr, 1.55 + Math.sin(a) * rr, 0, 0.07, 0.06, 0.07, i % 3 ? LPC.leaf : '#7a2f3a', { jitter: 0.01 });
    }
    lp.pop();
    for (const [x, z, h] of [[0.65, 0.75, 0.55], [1.1, 0.9, 0.45], [0.85, 1.45, 0.5]] as const) {
      lp.push([x, 0, z], -0.3, 0, v.broken && x > 1 ? 0.25 : 0).extrude(roundTopShape(0.32, h, 6), 0.08, LPC.stone, { bevel: 0.01, vary: 0.08, topTint: LPC.moss, topAmount: 0.4 }).pop();
      lp.box(x, 0, z + 0.25, 0.3, 0.05, 0.4, LPC.soil, { bevel: 0.02, vary: 0.1 });
      if (!v.broken) flower(lp, x, z + 0.18, '#e7a6bf', 0.18);
    }
    votive(c, 0.65, 0, 1.05);
    bench(c, -1.15, 1.6, Math.PI / 2 + 0.3);
  }
}

function skeletonYard(c: CryptCtx) {
  const { lp, v } = c;
  // marimba d'ossa
  const x = -0.91, z = 0.85;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(lp, [x + sx * 0.46, 0.06, z + sz * 0.25], [x - sx * 0.43, 0.52, z + sz * 0.25], 0.025, '#80735b');
  for (const zz of [z - 0.22, z + 0.22]) beam(lp, [x - 0.55, 0.52, zz], [x + 0.55, 0.52, zz], 0.027, LPC.woodDark);
  for (let i = 0; i < 7; i++) {
    if (v.broken && i === 2) continue;
    const xx = x - 0.48 + i * 0.16, half = 0.31 - i * 0.018;
    beam(lp, [xx, 0.56, z - half], [xx, 0.56, z + half], 0.035, LPC.bone);
    for (const zz of [z - half, z + half]) lp.blob(xx, 0.56, zz, 0.049, 0.025, 0.041, LPC.bone, { jitter: 0.004 });
  }
  for (const xx of [-1.11, -0.74]) { beam(lp, [xx, 0.59, z - 0.05], [xx + 0.13, 0.6, z + 0.19], 0.012, '#756449'); lp.blob(xx + 0.13, 0.61, z + 0.19, 0.042, 0.032, 0.04, LPC.bone); }
  // batteria
  for (const [xx, zz, r, h] of [[0.91, 1.0, 0.28, 0.44], [0.58, 0.61, 0.16, 0.46], [1.2, 0.64, 0.17, 0.5]] as const) {
    lp.cyl(xx, 0.07, zz, r, r, h, 10, '#70604b', { vary: 0.07 });
    lp.cyl(xx, 0.07 + h, zz, r * 0.94, r * 0.94, 0.018, 10, v.broken ? '#847b63' : '#c3b99c', { jitter: 0.003 });
    for (const yy of [0.1, 0.06 + h]) torus(lp, xx, yy, zz, r, 0.017, LPC.iron, [Math.PI / 2, 0, 0], Math.PI * 2, { jitter: 0 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; beam(lp, [xx + Math.cos(a) * r, 0.11, zz + Math.sin(a) * r], [xx + Math.cos(a) * r, 0.04 + h, zz + Math.sin(a) * r], 0.008, '#b5a88a'); }
    if (v.broken) prof(lp, [[0, 0], [0.13, 0.02], [-0.03, 0.1]], 0.008, '#373932', [xx, 0.101 + h, zz], [-Math.PI / 2, 0, 0], { ao: 0 });
  }
  const cx = v.broken ? 1.5 : 1.39, cy = v.broken ? 0.56 : 0.87;
  beam(lp, [1.39, 0.06, 1.27], [cx, cy, 1.27], 0.014, LPC.iron);
  put(lp, new THREE.CylinderGeometry(0.06, 0.24, 0.043, 12), '#ad9461', [cx, cy + 0.02, 1.27], v.broken ? [0.35, 0, 0.12] : [0, 0, 0], { ao: 0.1 });
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3; beam(lp, [1.39, 0.24, 1.27], [1.39 + Math.cos(a) * 0.2, 0.05, 1.27 + Math.sin(a) * 0.2], 0.014, LPC.iron); }
  lp.cyl(0.91, 0.07, 0.34, 0.15, 0.15, 0.26, 8, '#89816b');
  // leggio con lo spartito
  const mx = -0.78, mz = 1.63;
  beam(lp, [mx, 0.06, mz], [mx, v.broken ? 0.2 : 0.69, mz], 0.02, LPC.iron);
  if (v.broken) {
    slab(lp, mx, 0.07, mz + 0.18, 0.4, 0.035, 0.29, LPC.iron, 0.15);
    slab(lp, mx, 0.11, mz + 0.18, 0.33, 0.008, 0.23, '#a59b7d', 0.15, { bevel: 0 });
  } else {
    block(lp, mx, 0.71, mz, 0.4, 0.29, 0.027, LPC.iron, [-0.16, 0, 0]);
    lp.box(mx, 0.734, mz + 0.025, 0.33, 0.23, 0.008, '#cec4a6', { jitter: 0, ao: 0 });
    for (let i = 0; i < 4; i++) lp.box(mx, 0.765 + i * 0.045, mz + 0.036, 0.27, 0.004, 0.005, '#65614e', { jitter: 0, ao: 0 });
    for (let i = 0; i < 3; i++) lp.blob(mx - 0.09 + i * 0.09, 0.8 + (i % 2) * 0.045, mz + 0.043, 0.015, 0.01, 0.005, '#514e41', { jitter: 0 });
  }
  block(lp, -1.38, 0.06, 0.22, 0.35, 0.17, 0.29, '#726449');
  for (let i = 0; i < 3; i++) beam(lp, [-1.48 + i * 0.09, 0.25, 0.13], [-1.42 + i * 0.09, 0.27, 0.37], 0.022, LPC.bone);
}

function natureYard(c: CryptCtx) {
  const { lp, v } = c;
  // aiuola irregolare con verdure e funghi
  const x = -1.05, z = 0.8;
  lp.box(x, 0.015, z, 0.82, 0.12, 1.05, '#544735', { jitter: 0.012 });
  for (const sx of [-1, 1]) block(lp, x + sx * 0.43, 0.02, z, 0.055, 0.22, 1.14, '#746344');
  for (const zz of [z - 0.55, z + 0.55]) block(lp, x, 0.02, zz, 0.89, 0.22, 0.055, '#8a7950');
  for (let i = 0; i < 6; i++) {
    const xx = x - 0.2 + (i % 2) * 0.38, zz = z - 0.31 + Math.floor(i / 3) * 0.32;
    if (i % 2) mushroom(lp, xx, 0.15, zz, 0.95, '#a98d5b');
    else for (let j = 0; j < 5; j++) leaf(lp, xx + Math.sin(j * 2) * 0.055, 0.24 + j * 0.015, zz + Math.cos(j * 2) * 0.04, 0.14, v.broken ? '#9d8e5d' : '#789153', j * 0.6);
  }
  // cerchio di funghi grandi
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, xx = 0.93 + Math.cos(a) * 0.43, zz = 1.58 + Math.sin(a) * 0.4;
    if (v.broken && i === 1) { put(lp, new THREE.CylinderGeometry(0.05, 0.16, 0.1, 7), '#89704c', [xx, 0.075, zz], [0.23, 0, 0.19]); continue; }
    mushroom(lp, xx, 0.02, zz, 1.7 + (i % 3) * 0.26, i % 2 ? '#b7a06c' : '#8d7554');
    tuft(lp, xx + 0.07, zz - 0.09, 0.17, v.dirty);
  }
  // ceppo cavo
  const sx = 1.21, sz = 0.37, h = v.broken ? 0.28 : 0.44;
  lp.cyl(sx, 0.02, sz, 0.25, 0.2, h, 9, '#776044', { vary: 0.08 });
  lp.cyl(sx, h + 0.02, sz, 0.18, 0.18, 0.018, 9, '#aa9264', { jitter: 0.004 });
  lp.cyl(sx, h + 0.041, sz, 0.105, 0.105, 0.009, 9, '#493d2d', { jitter: 0 });
  groundRing(lp, sx, h + 0.048, sz, 0.15, 0.014, '#766144', 10);
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; root(lp, [[sx + Math.cos(a) * 0.12, 0.15, sz + Math.sin(a) * 0.12], [sx + Math.cos(a) * 0.32, 0.02, sz + Math.sin(a) * 0.32]], 0.038); }
  // arnia di vimini
  for (let i = 0; i < 5; i++) lp.cyl(-1.19, 0.03 + i * 0.075, 1.89, 0.25 - i * 0.025, 0.24 - i * 0.025, 0.08, 10, '#b49b65', { vary: 0.07 });
  lp.box(-1.19, 0.13, 2.15, 0.11, 0.055, 0.012, '#4a4430', { jitter: 0 });
  slab(lp, -1.19, 0.012, 1.89, 0.56, 0.06, 0.54, '#746449');
  // traliccio vivo
  root(lp, [[1.55, 0.02, 0.22], [1.57, 0.45, 0.26], [1.53, 0.92, 0.44], [1.31, 1.16, 0.65], [1.17, 1.18, 0.78]], 0.025);
  root(lp, [[1.53, 0.3, 0.46], [1.53, 0.72, 0.65], [1.3, 1.08, 0.8]], 0.022);
  for (let i = 0; i < 8; i++) leaf(lp, 1.49 - i * 0.03, 0.42 + i * 0.09, 0.3 + i * 0.06, 0.13, v.broken ? '#8a7b54' : '#708a50', i * 0.6);
  // annaffiatoio
  lp.cyl(-0.64, 0.02, 1.62, 0.11, 0.11, 0.22, 8, '#6d826c', { vary: 0.07 });
  beam(lp, [-0.55, 0.16, 1.62], [-0.35, 0.24, 1.62], 0.02, '#8a9b7b');
  torus(lp, -0.76, 0.18, 1.62, 0.1, 0.016, '#8a9b7b');
}

const BREW = '#9af06a';

/** Calderone tornito su tre piedi, con la pozione (luminosa se accesa); `s` scala. */
function cauldron(c: CryptCtx, x: number, z: number, s: number, fire: boolean, pot = true) {
  const { lp, v } = c;
  const prof0: Array<[number, number]> = [[0, 0], [0.1, 0], [0.27, 0.08], [0.31, 0.29], [0.25, 0.42], [0.2, 0.43], [0.23, 0.35], [0.24, 0.16], [0.1, 0.07], [0, 0.07]];
  const y0 = fire ? 0.16 : 0.07;
  if (pot) {
    turned(lp, x, y0, z, prof0.map(([r, y]) => [r * s, y * s] as [number, number]), 10, '#2f2c2e');
    for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3 + 0.5; beam(lp, [x + Math.cos(a) * 0.2 * s, 0.02, z + Math.sin(a) * 0.2 * s], [x + Math.cos(a) * 0.14 * s, y0 + 0.12 * s, z + Math.sin(a) * 0.14 * s], 0.03, LPC.iron); }
    const brew = emit(c, v.broken ? '#3f4a38' : BREW);
    lp.cyl(x, y0 + 0.36 * s, z, 0.205 * s, 0.205 * s, 0.015, 10, brew.color, { ...brew.o, jitter: 0 });
    if (!v.broken) for (let i = 0; i < 3; i++) flame(c, x + Math.sin(i * 2) * 0.1 * s, y0 + (0.5 + i * 0.12) * s, z + Math.cos(i * 2) * 0.05, '#c8ff9a', (0.035 - i * 0.006) * s);
  }
  if (fire) {
    for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3; beam(lp, [x + Math.cos(a) * 0.32, 0.03, z + Math.sin(a) * 0.32], [x - Math.cos(a) * 0.05, 0.08, z - Math.sin(a) * 0.05], 0.04, LPC.woodDark); }
    if (!v.broken) for (const [dx, dz, r] of [[0, 0, 0.09], [0.08, 0.05, 0.06], [-0.07, 0.04, 0.06]] as const) flame(c, x + dx, 0.1, z + dz, LPC.lantern, r);
    else lp.blob(x, 0.04, z, 0.2, 0.04, 0.2, LPC.charcoal);
  }
}

/** Vasetto col tappo: il contenuto (erbe, o una pozione che brilla) si vede, il vetro è solo l'orlo in alto. */
function jar(c: CryptCtx, x: number, y: number, z: number, h: number, r: number, fill: string, glow: boolean) {
  const { lp, v } = c;
  const f = glow ? emit(c, v.broken ? '#3f4a38' : fill) : { color: fill, o: {} };
  lp.cyl(x, y, z, r, r * 0.92, h * 0.78, 7, f.color, { ...f.o, jitter: 0, vary: 0.06 });
  lp.cyl(x, y + h * 0.78, z, r * 0.92, r * 0.75, h * 0.22, 7, '#c9d6d2', { bucket: 'gloss', jitter: 0, ao: 0 });
  lp.cyl(x, y + h, z, r * 0.6, r * 0.65, 0.025, 6, '#a58c66', { jitter: 0 });
}

/** Mazzetto d'erbe disteso sul tavolo. */
function herbBundle(c: CryptCtx, x: number, y: number, z: number, ry: number, color: string) {
  c.lp.push([x, y, z], ry, 0, Math.PI / 2).cyl(0, -0.08, 0, 0.03, 0.012, 0.16, 5, color, { vary: 0.15, jitter: 0.006 }).pop();
  c.lp.push([x, y, z], ry, 0, Math.PI / 2).cyl(0, 0.08, 0, 0.008, 0.008, 0.04, 3, '#b4a78a', { jitter: 0 }).pop();
}

/** Tavolino della strega: piano di legno su quattro gambe storte, con erbe o vasetti e pozioni. */
function witchTable(c: CryptCtx, x: number, z: number, w: number, d: number, ry: number, kind: 'herbs' | 'potions') {
  const { lp, v } = c;
  const H = 0.42;
  lp.push([x, 0, z], ry);
  const tilt = v.broken ? 0.18 : 0;
  lp.push([0, 0, 0], 0, 0, tilt);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (v.broken && sx === 1 && sz === 1) continue;
    beam(lp, [sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05)], [sx * (w / 2 - 0.07), H, sz * (d / 2 - 0.06)], 0.025, LPC.woodDark);
  }
  lp.box(0, H, 0, w, 0.04, d, '#6b5240', { bevel: 0.01, vary: 0.1 });
  lp.box(0, H * 0.35, 0, w - 0.1, 0.025, d - 0.1, LPC.woodDark, { jitter: 0.004 }); // ripiano sotto
  const top = H + 0.04;
  if (kind === 'herbs') {
    // mazzetti, un mortaio col pestello, un vasetto e un vaso con le piantine
    herbBundle(c, -0.14, top + 0.02, -0.06, 0.3, LPC.moss);
    herbBundle(c, -0.05, top + 0.02, 0.08, -0.4, '#8a6a4a');
    lp.lathe(0.13, top, -0.03, [[0, 0], [0.06, 0], [0.07, 0.06], [0.055, 0.07], [0, 0.045]], 8, LPC.stoneLight, { jitter: 0 });
    lp.push([0.15, top + 0.07, -0.03], 0, 0, -0.5).cyl(0, 0, 0, 0.012, 0.016, 0.12, 5, LPC.stone, { jitter: 0 }).pop();
    if (!v.broken) jar(c, 0.2, top, 0.1, 0.12, 0.04, '#6a7a3a', false);
    lp.cyl(-0.2, H * 0.35 + 0.025, 0.02, 0.07, 0.05, 0.1, 7, '#9a5a3a', { vary: 0.08 }); // vaso sul ripiano
    for (let i = 0; i < 4; i++) lp.blob(-0.2 + Math.sin(i * 1.6) * 0.03, H * 0.35 + 0.16, 0.02 + Math.cos(i * 1.6) * 0.03, 0.035, 0.05, 0.035, LPC.mossBright, { jitter: 0.006 });
  } else {
    // file di vasetti d'erbe (dietro) e pozioni colorate (davanti), un libro aperto, una candela
    const herbs = ['#6a7a3a', '#8a6a4a', LPC.moss, '#7d573b'];
    herbs.forEach((col, i) => { if (!(v.broken && i === 3)) jar(c, -0.3 + i * 0.13, top, -0.1, 0.13 + (i % 2) * 0.03, 0.04, col, false); });
    const brews = ['#9af06a', '#e06a8a', '#6ac8f0', '#f0c02a'];
    brews.forEach((col, i) => {
      if (v.broken && i % 2) return;
      const px = -0.26 + i * 0.15, pz = 0.09;
      // ampolla di vetro colorato: la pancia ha il colore della pozione (brilla se accesa), il collo è vetro
      const g = emit(c, col);
      lp.lathe(px, top, pz, [[0, 0], [0.05, 0], [0.058, 0.05], [0.03, 0.085], [0, 0.085]], 8, g.color, { ...g.o, jitter: 0 });
      lp.cyl(px, top + 0.08, pz, 0.016, 0.02, 0.06, 6, '#c9d6d2', { bucket: 'gloss', jitter: 0, ao: 0 });
      lp.cyl(px, top + 0.14, pz, 0.014, 0.016, 0.025, 5, '#a58c66', { jitter: 0 });
    });
    slab(lp, 0.33, top, 0.0, 0.18, 0.025, 0.24, '#bcb096', 0.2);
    for (let i = 0; i < 3; i++) lp.box(0.33, top + 0.026, -0.06 + i * 0.05, 0.1, 0.004, 0.012, '#696153', { jitter: 0, ao: 0 });
    for (let i = 0; i < 3; i++) jar(c, -0.25 + i * 0.25, H * 0.35 + 0.025, 0, 0.12, 0.045, ['#7d573b', '#6a7a3a', '#8a6a4a'][i], false); // sul ripiano
  }
  lp.pop();
  lp.pop();
  if (v.broken && kind === 'potions') for (let i = 0; i < 3; i++) lp.blob(x + 0.2 + i * 0.12, 0.012, z + 0.35, 0.09, 0.008, 0.07, ['#3f4a38', '#4a2f38', '#2f3f4a'][i], { ao: 0 }); // pozioni versate
}

function witchYard(c: CryptCtx) {
  const { lp, v } = c;
  // tre pietre in piedi con le rune verdi
  for (const [x, z, h, angle] of [[-1.3, 0.4, 0.84, -0.1], [1.21, 0.42, 1.03, 0.07], [1.36, 1.89, 0.63, 0.16]] as const) {
    const height = v.broken ? h * 0.65 : h;
    prof(lp, [[-0.15, 0], [0.17, 0], [0.15, height * 0.8], [0.03, height], [-0.12, height * 0.88]], 0.22, '#5f5a52', [x, 0.03, z], [0, angle, v.broken ? 0.19 : 0], { vary: 0.08, ao: 0.25, topTint: LPC.moss, topAmount: 0.5 });
    const rune = emit(c, v.broken ? '#4f5a48' : '#7fcf6a');
    prof(lp, [[0, -0.1], [0.065, 0], [0, 0.1], [-0.065, 0]], 0.012, rune.color, [x, height * 0.54, z + 0.13], [0, 0, 0], rune.o);
  }
  // al centro del cerchio, secondo la versione: il grande calderone sul fuoco (1), un calderone più
  // piccolo col tavolino delle erbe (2), il tavolo dei vasetti di erbe e delle pozioni (3)
  if (c.variant === 1) {
    if (!v.broken) cauldron(c, 0, 1.18, 1.6, true);
    else {
      // rovesciato fuori dal cerchio, la pozione versata a terra
      lp.push([0.55, 0.3, 1.45], 0.4, 0, 1.3);
      turned(lp, 0, -0.3, 0, [[0, 0], [0.16, 0], [0.43, 0.13], [0.5, 0.46], [0.4, 0.67], [0.32, 0.69], [0.37, 0.56], [0.38, 0.26], [0.16, 0.11], [0, 0.11]], 10, '#2f2c2e');
      lp.pop();
      lp.blob(0.85, 0.012, 1.6, 0.35, 0.012, 0.25, '#3f4a38', { ao: 0 });
      cauldron(c, 0, 1.18, 1, true, false); // il fuoco spento
    }
  } else if (c.variant === 2) {
    if (!v.broken) cauldron(c, -0.18, 1.12, 1.05, true);
    else cauldron(c, -0.18, 1.12, 1, true, false);
    witchTable(c, 0.5, 1.45, 0.55, 0.36, -0.5, 'herbs');
  } else {
    witchTable(c, 0, 1.2, 0.9, 0.46, -0.25, 'potions');
  }
  // scopa appoggiata vicino alla porta
  lp.push([0.62, 0, 0.32], 0.3, 0, -0.32);
  beam(lp, [0, 0.12, 0], [0, 1.0, 0], 0.022, LPC.wood);
  lp.cyl(0, 0, 0, 0.11, 0.04, 0.24, 7, LPC.dry, { vary: 0.12 });
  lp.cyl(0, 0.2, 0, 0.045, 0.045, 0.03, 7, LPC.woodDark, { jitter: 0 });
  lp.pop();
  // rastrelliera delle erbe a seccare
  const rx = -1.22, rz = 1.84;
  for (const dx of [-0.32, 0.32]) beam(lp, [rx + dx, 0.02, rz], [rx + dx, 0.82, rz], 0.03, LPC.woodDark);
  beam(lp, [rx - 0.36, 0.8, rz], [rx + 0.36, 0.8, rz], 0.025, LPC.wood);
  for (let i = 0; i < 5; i++) {
    if (v.broken && i % 2) continue;
    const x = rx - 0.24 + i * 0.12, col = [LPC.moss, LPC.dry, '#6a7a3a', '#8a6a4a', LPC.mossBright][i];
    beam(lp, [x, 0.8, rz], [x, 0.66, rz], 0.006, '#b4a78a');
    lp.cyl(x, 0.46, rz, 0.06, 0.02, 0.2, 5, col, { vary: 0.15, jitter: 0.008 });
  }
  // leggio degli incantesimi
  prof(lp, [[-0.12, 0], [0.12, 0], [0.09, 0.57], [-0.09, 0.57]], 0.2, '#6b5240', [-1.25, 0.02, 0.89]);
  slab(lp, -1.25, 0.58, 0.89, 0.46, 0.07, 0.35, '#7d6450', 0.1);
  for (const sx of [-1, 1]) slab(lp, -1.25 + sx * 0.1, 0.66, 0.89, 0.19, 0.035, 0.28, '#bcb096', sx * 0.08);
  for (let i = 0; i < 3; i++) lp.box(-1.27, 0.7, 0.8 + i * 0.07, 0.07, 0.007, 0.025, '#696153', { jitter: 0, ao: 0 });
  for (const [xx, zz, col] of [[-1.6, 0.51, '#6a8a5a'], [1.46, 1.27, '#8a5a4a']] as const) {
    lp.cyl(xx, 0.02, zz, 0.06, 0.045, 0.22, 7, col, { jitter: 0.004 });
    lp.cyl(xx, 0.24, zz, 0.028, 0.028, 0.04, 5, '#a58c66', { jitter: 0 });
  }
}

const YARDS: Record<CryptCtx['family'], (c: CryptCtx) => void> = { zombie: zombieYard, ghost: ghostYard, skeleton: skeletonYard, nature: natureYard, witch: witchYard };

/** Piccola aggiunta di ogni versione (2 e 3) nel cortile. */
function variantProps(c: CryptCtx) {
  if (c.variant === 1) return;
  const { lp, v } = c;
  switch (c.family) {
    case 'zombie': {
      block(lp, 1.47, 0.02, 0.2, 0.23, 0.19, 0.22, c.variant === 2 ? '#746348' : '#65584b');
      for (const y of [0.08, 0.17]) lp.box(1.47, y, 0.318, 0.24, 0.022, 0.012, LPC.woodDark, { jitter: 0 });
      if (c.variant === 3) block(lp, 1.47, 0.22, 0.2, 0.2, 0.055, 0.17, '#9b9a79');
      break;
    }
    case 'ghost':
      if (c.variant === 2) votive(c, 1.5, 0.02, 1.88);
      else for (const [x, z] of [[1.45, 0.4], [1.6, 0.6]] as const) pumpkin(lp, x, 0, z, 0.1, false, false, 0.3, 1, false);
      break;
    case 'skeleton':
      lp.cyl(1.52, 0.02, 1.86, 0.14, 0.14, 0.22, 7, c.variant === 2 ? '#756650' : '#918570', { vary: 0.07 });
      lp.cyl(1.52, 0.24, 1.86, 0.13, 0.13, 0.012, 7, LPC.bone, { jitter: 0.002 });
      break;
    case 'nature':
      for (let i = 0; i < (c.variant === 2 ? 2 : 3); i++) mushroom(lp, -1.55 + i * 0.1, 0.02, 0.17, 0.65, c.variant === 2 ? '#a5895c' : '#c0a46f');
      break;
    case 'witch': {
      lp.cyl(1.53, 0.02, 1.57, 0.1, 0.08, 0.18, 6, '#6f685d', { vary: 0.06 });
      if (c.variant === 2) votive(c, 1.53, 0.2, 1.57, '#b8f08a');
      else { const s = emit(c, v.broken ? '#4f5a48' : BREW); put(lp, new THREE.OctahedronGeometry(0.095), s.color, [1.53, 0.3, 1.57], [0, 0.2, 0.1], s.o); }
      break;
    }
  }
}

export function yard(c: CryptCtx) {
  ground(c);
  YARDS[c.family](c);
  variantProps(c);
}

