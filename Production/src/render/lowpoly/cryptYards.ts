// Il cortile di ogni cripta (davanti alla camera) e il recinto del lotto 4 × 5: il selciato
// del suo tipo, gli oggetti di scena della famiglia e le piccole aggiunte di ogni versione.
// Stesse primitive degli altri generatori (kit.ts), pezzi rotti da rotto come nel resto del gioco.

import * as THREE from 'three';
import { LPC } from './palette.ts';
import { skull as gameSkull } from './extras.ts';
import {
  beam, block, cloth, CP, emit, flame, groundRing, groundStroke, leaf, mushroom, prof, put, root, slab, torus, tuft, turned, votive, type CryptCtx,
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
      ([[0, 2.27], [0.35, 2.02], [0.64, 1.72], [0.72, 1.39], [0.7, 1.06], [0.56, 0.72], [0.28, 0.42], [0, 0.22]] as const)
        .forEach(([x, z], i) => slab(lp, x, 0.015, z, 0.36, 0.045, 0.26, i % 2 ? '#a7afa0' : '#929d8b', i * 0.16));
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
    case 'supernatural': {
      slab(lp, 0, 0.01, 1.18, 1.94, 0.065, 1.91, '#554e62');
      const ring = emit(c, v.broken ? '#746476' : '#ba9ecd');
      for (const r of [0.69, 0.77]) groundRing(lp, 0, 0.075, 1.18, r, 0.02, ring.color, 16, Math.PI * 2, ring.o);
      const pts = Array.from({ length: 6 }, (_, i) => [Math.sin((i / 6) * Math.PI * 2) * 0.59, Math.cos((i / 6) * Math.PI * 2) * 0.59 + 1.18] as [number, number]);
      for (let i = 0; i < 6; i++) groundStroke(lp, pts[i], pts[(i + 2) % 6], 0.078, 0.02, v.broken ? '#796d75' : '#b59ac9');
      for (const z of [0.21, 2.2, 2.38]) slab(lp, 0, 0.01, z, 0.58, 0.055, 0.19, '#74697e');
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

function ghostYard(c: CryptCtx) {
  const { lp, v } = c;
  const x = -0.56, z = 1.16;
  const arc = v.broken ? Math.PI * 1.75 : Math.PI * 2;
  put(lp, new THREE.LatheGeometry([[0, 0.015], [0.54, 0.015], [0.64, 0.07], [0.66, 0.19], [0.57, 0.22], [0.53, 0.11], [0, 0.11]].map(([a, b]) => new THREE.Vector2(a, b)), 16, 0, arc), '#a8b4a0', [x, 0.01, z], [0, 0, 0], { vary: 0.06, ao: 0.2 });
  const pool = emit(c, v.broken ? '#4a554b' : '#719f96');
  lp.cyl(x, v.broken ? 0.06 : 0.13, z, 0.535, 0.535, 0.012, 16, pool.color, { ...pool.o, jitter: 0 });
  if (!v.broken) { const r = emit(c, '#a0c6b5'); groundRing(lp, x, 0.14, z, 0.24, 0.014, r.color, 12, Math.PI * 1.75, r.o); flame(c, x - 0.13, 0.26, z + 0.08, '#afd7c7', 0.026); }
  // panca curva
  for (let i = 0; i < 3; i++) {
    const a = (i - 1) * 0.4, xx = 0.62 + Math.cos(a) * 0.76, zz = 1.2 + Math.sin(a) * 0.76;
    block(lp, xx, 0.02, zz, 0.14, 0.29, 0.16, '#889785');
    if (v.broken && i === 2) { slab(lp, xx - 0.15, 0.04, zz + 0.18, 0.3, 0.065, 0.4, '#9fa993', 0.4); continue; }
    slab(lp, xx, 0.31, zz, 0.3, 0.09, 0.39, '#bdc4af', a);
  }
  cloth(lp, 1.34, 0.415, 1.11, 0.2, 0.2, '#b9c8b9', { laid: true, ragged: v.dirty });
  // albero dei sonagli
  beam(lp, [-1.38, 0.01, 0.28], [-1.38, 1.17, 0.28], 0.018, LPC.iron);
  torus(lp, -1.38, 1.06, 0.28, 0.19, 0.014, '#9bab97', [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) {
    const xx = -1.52 + i * 0.14, yy = 0.67 + (i % 2) * 0.11;
    if (v.broken && i === 2) { put(lp, new THREE.CylinderGeometry(0.022, 0.03, 0.18, 6), '#9aab94', [-1.35, 0.1, 0.5], [0, 0, Math.PI / 2]); continue; }
    beam(lp, [xx, 1.06, 0.28], [xx, yy + 0.12, 0.28], 0.004, '#b1bda5');
    lp.cyl(xx, yy - 0.07, 0.28, 0.026, 0.02, 0.19, 6, '#b4c4af', { jitter: 0.003 });
  }
  // fiori di luna
  for (let i = 0; i < 5; i++) {
    const xx = 1.02 + (i % 3) * 0.18, zz = 0.2 + Math.floor(i / 3) * 0.15, yy = 0.18 + (i % 2) * 0.055;
    beam(lp, [xx, 0.02, zz], [xx, yy, zz], 0.008, v.broken ? '#847b58' : '#657d58');
    const s = new THREE.Shape();
    for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2, r = j % 2 ? 0.022 : 0.059; const px = Math.sin(a) * r, py = Math.cos(a) * r; if (j === 0) s.moveTo(px, py); else s.lineTo(px, py); }
    s.closePath();
    put(lp, new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false }), v.broken ? '#a19b7b' : '#d6d7bf', [xx, yy, zz], [-Math.PI / 2, 0, i * 0.35], { jitter: 0, ao: 0 });
    lp.cyl(xx, yy + 0.004, zz, 0.012, 0.012, 0.012, 5, '#baaf7e', { jitter: 0, ao: 0 });
  }
  for (const [xx, zz, h] of [[-1.25, 1.98, 0], [-1.43, 1.9, 0.04], [-1.1, 2.08, 0]] as const) votive(c, xx, h, zz, CP.spectral);
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

function supernaturalYard(c: CryptCtx) {
  const { lp, v } = c;
  for (const [x, z, h, angle] of [[-1.3, 0.4, 0.84, -0.1], [1.21, 0.42, 1.03, 0.07], [1.36, 1.89, 0.63, 0.16]] as const) {
    const height = v.broken ? h * 0.65 : h;
    prof(lp, [[-0.15, 0], [0.17, 0], [0.15, height * 0.8], [0.03, height], [-0.12, height * 0.88]], 0.22, '#5c5269', [x, 0.03, z], [0, angle, v.broken ? 0.19 : 0], { vary: 0.07, ao: 0.25 });
    const rune = emit(c, v.broken ? '#877387' : '#ba9acd');
    prof(lp, [[0, -0.1], [0.065, 0], [0, 0.1], [-0.065, 0]], 0.012, rune.color, [x, height * 0.54, z + 0.13], [0, 0, 0], rune.o);
  }
  const crystal = new THREE.OctahedronGeometry(0.27);
  crystal.scale(0.75, 1.65, 0.75);
  const cr = emit(c, v.broken ? '#76617f' : '#c3a3df');
  put(lp, crystal, cr.color, [0, v.broken ? 0.2 : 0.99, 1.18], v.broken ? [0.3, 0, 1.2] : [0, 0.3, 0], cr.o);
  if (!v.broken) {
    const orb = emit(c, '#a585bd');
    for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3; put(lp, new THREE.OctahedronGeometry(0.06), orb.color, [Math.cos(a) * 0.36, 0.77 + Math.sin(a) * 0.08, 1.18 + Math.sin(a) * 0.29], [0, 0, 0.4], orb.o); }
  }
  // calderone
  const x = -1.22, z = 1.84;
  turned(lp, x, 0.07, z, [[0, 0], [0.1, 0], [0.27, 0.08], [0.31, 0.29], [0.25, 0.42], [0.2, 0.43], [0.23, 0.35], [0.24, 0.16], [0.1, 0.07], [0, 0.07]], 9, '#514653');
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3; beam(lp, [x + Math.cos(a) * 0.18, 0.02, z + Math.sin(a) * 0.18], [x + Math.cos(a) * 0.13, 0.19, z + Math.sin(a) * 0.13], 0.027, LPC.iron); }
  const brew = emit(c, v.broken ? '#4e3f52' : '#b28bca');
  lp.cyl(x, 0.43, z, 0.204, 0.204, 0.015, 9, brew.color, { ...brew.o, jitter: 0 });
  if (!v.broken) for (let i = 0; i < 3; i++) flame(c, x + Math.sin(i * 2) * 0.11, 0.59 + i * 0.12, z, '#b993d3', 0.025 - i * 0.004);
  // leggio degli incantesimi
  prof(lp, [[-0.12, 0], [0.12, 0], [0.09, 0.57], [-0.09, 0.57]], 0.2, '#817181', [-1.25, 0.02, 0.89]);
  slab(lp, -1.25, 0.58, 0.89, 0.46, 0.07, 0.35, '#9c8a9d', 0.1);
  for (const sx of [-1, 1]) slab(lp, -1.25 + sx * 0.1, 0.66, 0.89, 0.19, 0.035, 0.28, '#bcb096', sx * 0.08);
  for (let i = 0; i < 3; i++) lp.box(-1.27, 0.7, 0.8 + i * 0.07, 0.07, 0.007, 0.025, '#696153', { jitter: 0, ao: 0 });
  for (const [xx, zz, col] of [[-1.6, 0.51, '#817391'], [1.46, 1.27, '#75928a']] as const) {
    lp.cyl(xx, 0.02, zz, 0.06, 0.045, 0.22, 7, col, { jitter: 0.004 });
    lp.cyl(xx, 0.24, zz, 0.028, 0.028, 0.04, 5, '#a58c66', { jitter: 0 });
  }
}

const YARDS: Record<CryptCtx['family'], (c: CryptCtx) => void> = { zombie: zombieYard, ghost: ghostYard, skeleton: skeletonYard, nature: natureYard, supernatural: supernaturalYard };

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
      if (c.variant === 2) votive(c, 1.5, 0.02, 1.88, CP.spectral);
      else { lp.cyl(-1.48, 0.02, 0.82, 0.12, 0.09, 0.29, 7, '#a7b6aa', { vary: 0.06 }); torus(lp, -1.48, 0.43, 0.82, 0.1, 0.013, '#d3d3ba', [Math.PI / 2, 0, 0]); }
      break;
    case 'skeleton':
      lp.cyl(1.52, 0.02, 1.86, 0.14, 0.14, 0.22, 7, c.variant === 2 ? '#756650' : '#918570', { vary: 0.07 });
      lp.cyl(1.52, 0.24, 1.86, 0.13, 0.13, 0.012, 7, LPC.bone, { jitter: 0.002 });
      break;
    case 'nature':
      for (let i = 0; i < (c.variant === 2 ? 2 : 3); i++) mushroom(lp, -1.55 + i * 0.1, 0.02, 0.17, 0.65, c.variant === 2 ? '#a5895c' : '#c0a46f');
      break;
    case 'supernatural': {
      lp.cyl(1.53, 0.02, 1.57, 0.1, 0.08, 0.18, 6, '#776a7a', { vary: 0.06 });
      if (c.variant === 2) votive(c, 1.53, 0.2, 1.57, '#bb96cf');
      else { const s = emit(c, v.broken ? '#756578' : '#ae95bd'); put(lp, new THREE.OctahedronGeometry(0.095), s.color, [1.53, 0.3, 1.57], [0, 0.2, 0.1], s.o); }
      break;
    }
  }
}

export function yard(c: CryptCtx) {
  ground(c);
  YARDS[c.family](c);
  variantProps(c);
}

// ── Recinto ──────────────────────────────────────────────────────────────

/** Recinto del lotto (4 × 5): palizzata, ossa o ferro secondo la famiglia; il cancello è aperto sul sentiero. */
export function fence(c: CryptCtx) {
  const { lp, v, family } = c;
  const wood = family === 'zombie' || family === 'nature', bone = family === 'skeleton', sup = family === 'supernatural';
  const color = wood ? (family === 'nature' ? '#79654a' : '#6f5a42') : bone ? LPC.bone : LPC.iron;
  const segs: Array<[number, number, number, number]> = [[-1.82, -2.27, 1.82, -2.27], [-1.82, -2.27, -1.82, 2.27], [1.82, -2.27, 1.82, 2.27], [-1.82, 2.27, -0.5, 2.27], [0.5, 2.27, 1.82, 2.27]];
  const corners: Array<[number, number]> = [[-1.82, -2.27], [1.82, -2.27], [-1.82, 2.27], [1.82, 2.27], [-0.5, 2.27], [0.5, 2.27]];
  corners.forEach(([x, z], i) => {
    lp.push([x, 0.02, z], 0, 0, v.broken && i === 3 ? 0.24 : 0);
    lp.box(0, 0, 0, 0.115, 0.58, 0.115, color, { bevel: 0.008, vary: wood ? 0.12 : 0.06 });
    if (bone) { if (i >= 2) skull(c, 0, 0.64, 0.01, 0.095); else lp.blob(0, 0.62, 0, 0.075, 0.055, 0.06, LPC.bone); }
    else if (wood) lp.cyl(0, 0.58, 0, 0.08, 0, 0.12, 4, color, { jitter: 0.003 });
    else {
      if (sup) lp.box(0, -0.0, 0, 0.22, 0.23, 0.22, '#514958', { bevel: 0.015 });
      lp.blob(0, 0.66, 0, sup ? 0.09 : 0.055, sup ? 0.09 : 0.055, sup ? 0.09 : 0.055, sup ? '#a48aaf' : '#a4afa0', { jitter: 0 });
    }
    lp.pop();
  });
  segs.forEach(([ax, az, bx, bz], side) => {
    const len = Math.hypot(bx - ax, bz - az), count = Math.round(len / (wood ? 0.35 : 0.38));
    const alongX = Math.abs(bz - az) < 0.01;
    const midX = (ax + bx) / 2, midZ = (az + bz) / 2;
    for (const yy of [0.21, 0.43]) {
      if (v.broken && side === 4) { beam(lp, [ax, yy, az], [midX, yy - 0.14, midZ], 0.025, color); continue; }
      lp.push([midX, yy, midZ], alongX ? 0 : Math.PI / 2);
      lp.box(0, -0.015, 0, len, wood ? 0.05 : bone ? 0.06 : 0.035, wood ? 0.035 : 0.04, color, { bevel: 0.004, vary: wood ? 0.12 : 0.05 });
      lp.pop();
    }
    for (let i = 1; i < count; i++) {
      if (v.broken && ((side === 1 && i > count - 4) || (side === 4 && i % 3 !== 0))) continue;
      const t = i / count, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (family === 'zombie') {
        const h = 0.38 + lp.rng.next() * 0.16;
        lp.push([x, 0.02, z], alongX ? 0 : Math.PI / 2, 0, (lp.rng.next() - 0.5) * 0.13);
        lp.box(0, 0, 0, 0.124, h - 0.07, 0.06, color, { vary: 0.12, bevel: 0.004 }).cyl(0, h - 0.07, 0, 0.088, 0, 0.07, 4, color, { jitter: 0.003 });
        lp.pop();
      } else if (family === 'nature') {
        beam(lp, [x, 0.02, z], [x + 0.02, 0.54, z], 0.023, color);
        if (i % 2 === 0) beam(lp, [x - 0.04, 0.1, z], [x + 0.05, 0.51, z + 0.025], 0.012, '#94805b');
      } else if (bone) {
        beam(lp, [x, 0.08, z], [x, 0.52, z], 0.025, color);
        if (i % 2 === 0) lp.blob(x, 0.53, z, 0.045, 0.032, 0.038, LPC.bone, { jitter: 0.004 });
      } else {
        beam(lp, [x, 0.06, z], [x, 0.53, z], 0.014, color);
        if (i % 2 === 0) lp.push([x, 0.53, z]).cyl(0, 0, 0, 0.03, 0, 0.1, 4, sup ? '#8c778e' : '#778274', { jitter: 0 }).pop();
      }
    }
  });
  // il cancello aperto, verso l'interno, lungo il sentiero
  for (const z of [1.69, 2.24]) beam(lp, [-0.48, 0.07, z], [-0.48, 0.5, z], 0.023, color);
  for (const yy of [0.17, 0.44]) beam(lp, [-0.48, yy, 1.69], [-0.48, yy, 2.24], 0.02, color);
  beam(lp, [-0.48, 0.17, 1.7], [-0.48, 0.44, 2.23], 0.016, color);
  if (v.broken) {
    block(lp, 1.28, 0.03, 1.96, 0.66, 0.065, 0.09, color, [0.02, 0.35, 0.05]);
    block(lp, 1.33, 0.03, 1.77, 0.45, 0.055, 0.08, color, [0, -0.5, 0.03]);
  }
}

