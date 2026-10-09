// Dettagli modulari riutilizzati da tombe, edifici e scenografia: fili d'erba,
// erbacce, fiori, vasi, corone, candele, foglie secche, muschio, crepe,
// sassolini. Tutto in unità mondo, deterministico (usa lp.rng).

import * as THREE from 'three';
import { LP, irregularShape } from './kit.ts';
import { GRASS, GRASS_DRY, LPC } from './palette.ts';

/** Ciuffo d'erba: fili sottili e affusolati (prismi a 3 lati), leggermente piegati. */
export function grassTuft(lp: LP, x: number, z: number, scale = 1, palette: readonly string[] = GRASS, blades = 0) {
  const r = lp.rng;
  const n = blades || 5 + r.int(5);
  for (let i = 0; i < n; i++) {
    const bx = x + r.range(-0.05, 0.05) * scale, bz = z + r.range(-0.05, 0.05) * scale;
    const h = (0.07 + r.next() * 0.09) * scale;
    const lean = r.range(0.12, 0.5), yaw = r.range(0, Math.PI * 2);
    lp.push([bx, -0.005, bz], yaw, lean)
      .cyl(0, 0, 0, 0.011 * scale, 0, h, 3, r.pick(palette), { jitter: 0, vary: 0.12, ao: 0.35, open: true })
      .pop();
  }
}

/** Erbacce secche e più alte (tombe trascurate). */
export function weeds(lp: LP, x: number, z: number, scale = 1) {
  grassTuft(lp, x, z, 1.5 * scale, [...GRASS_DRY, GRASS[0]], 6 + lp.rng.int(4));
}

/** Fiore di campo: stelo, foglia e corolla a icosaedro. */
export function flower(lp: LP, x: number, z: number, color: string, h = 0.14, y0 = 0) {
  const r = lp.rng;
  lp.push([x, y0, z], r.range(0, 6.28), r.range(-0.15, 0.15));
  lp.cyl(0, 0, 0, 0.006, 0.005, h, 3, LPC.leaf, { jitter: 0, open: true });
  lp.push([0, h * 0.4, 0], r.range(0, 6.28), 0.9).box(0.02, 0, 0, 0.04, 0.004, 0.018, LPC.leaf, { jitter: 0 }).pop();
  lp.blob(0, h + 0.018, 0, 0.042, 0.026, 0.042, color, { jitter: 0.008, vary: 0.1 });
  lp.blob(0, h + 0.038, 0, 0.015, 0.012, 0.015, LPC.gold, { jitter: 0 });
  lp.pop();
}

/** Mazzo di fiori raccolto (dentro un vaso o appoggiato). */
export function bouquet(lp: LP, x: number, y: number, z: number, scale = 1) {
  const r = lp.rng;
  const n = 4 + r.int(4);
  for (let i = 0; i < n; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(0, 0.035) * scale;
    lp.push([x + Math.cos(a) * d, y, z + Math.sin(a) * d], 0, Math.cos(a) * 0.35, Math.sin(a) * 0.35);
    flower(lp, 0, 0, r.pick(LPC.flowers), (0.12 + r.next() * 0.08) * scale);
    lp.pop();
  }
}

/** Vaso tornito (pietra o bronzo) con mazzo di fiori. */
export function vase(lp: LP, x: number, z: number, y0 = 0, color: string = LPC.stoneLight, withFlowers = true) {
  lp.lathe(x, y0, z, [[0.0, 0], [0.05, 0], [0.062, 0.025], [0.05, 0.08], [0.034, 0.115], [0.046, 0.13], [0.04, 0.14], [0, 0.14]], 7, color, { vary: 0.05, ao: 0.3 });
  if (withFlowers) bouquet(lp, x, y0 + 0.12, z, 0.9);
}

/** Corona di alloro con bacche, appoggiata inclinata. */
export function wreath(lp: LP, x: number, y: number, z: number, tilt = -0.25, scale = 1) {
  const r = lp.rng;
  lp.push([x, y, z], 0, tilt);
  lp.add(new THREE.TorusGeometry(0.12 * scale, 0.034 * scale, 4, 10), LPC.leaf, { jitter: 0.01, vary: 0.15 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r.range(-0.2, 0.2);
    lp.blob(Math.cos(a) * 0.12 * scale, Math.sin(a) * 0.12 * scale, 0.03, 0.018, 0.018, 0.018, r.chance(0.6) ? LPC.red : LPC.flowers[2], { jitter: 0 });
  }
  lp.box(0, -0.15 * scale, 0.03, 0.07 * scale, 0.05 * scale, 0.012, LPC.red, { jitter: 0 });
  lp.pop();
}

/** Candela votiva (accesa: fiamma emissiva + luce con tremolio). */
export function candle(lp: LP, x: number, y: number, z: number, lit = true, h = 0.12) {
  lp.cyl(x, y, z, 0.03, 0.028, h, 6, '#d9cdb2', { jitter: 0, vary: 0.04, ao: 0.1 });
  lp.cyl(x, y + h, z, 0.003, 0.003, 0.02, 3, LPC.charcoal, { jitter: 0 });
  if (lit) {
    lp.cyl(x, y + h + 0.012, z, 0.016, 0, 0.055, 4, LPC.flame, { bucket: 'glow', jitter: 0 });
    lp.light(x, y + h + 0.05, z, LPC.flame, 0.35, 1.8, 0.4, 0.45);
  }
}

/** Lumino in vetro rosso (cimiteri italiani). */
export function graveLight(lp: LP, x: number, y: number, z: number, lit = true) {
  lp.cyl(x, y, z, 0.035, 0.04, 0.09, 6, lit ? '#a33d33' : '#5a2a26', { jitter: 0, bucket: lit ? 'glow' : 'solid' });
  lp.cyl(x, y + 0.09, z, 0.042, 0.03, 0.025, 6, LPC.gold, { jitter: 0 });
  if (lit) lp.light(x, y + 0.1, z, '#ff8a5a', 0.3, 1.6, 0.35, 0.4);
}

/** Foglie secche sparse (piccoli poligoni piatti). */
export function deadLeaves(lp: LP, x0: number, z0: number, x1: number, z1: number, n: number, y = 0.006) {
  const r = lp.rng;
  for (let i = 0; i < n; i++) {
    const x = r.range(x0, x1), z = r.range(z0, z1);
    lp.push([x, y + r.next() * 0.01, z], r.range(0, 6.28), -Math.PI / 2 + r.range(-0.2, 0.2));
    lp.plate(irregularShape(r, 0.028 + r.next() * 0.018, 4, 0.55), 0.004, r.pick(LPC.leafAutumn), { vary: 0.12, ao: 0 });
    lp.pop();
  }
}

/** Toppa di muschio schiacciata (sulle pietre o a terra). */
export function moss(lp: LP, x: number, y: number, z: number, r = 0.06, color: string = LPC.moss) {
  lp.blob(x, y, z, r, r * 0.3, r * 0.8, color, { jitter: r * 0.25, vary: 0.15, ao: 0 });
}

/** Sassolini irregolari. */
export function pebbles(lp: LP, x0: number, z0: number, x1: number, z1: number, n: number) {
  const r = lp.rng;
  for (let i = 0; i < n; i++) {
    const s = 0.02 + r.next() * 0.03;
    lp.blob(r.range(x0, x1), s * 0.3, r.range(z0, z1), s, s * 0.6, s * 0.85, r.pick([LPC.stone, LPC.stoneLight, LPC.stoneWarm]), { vary: 0.1 });
  }
}

/** Crepa a zig-zag incisa su una faccia frontale (piano z = zFace). */
export function crack(lp: LP, x: number, y: number, zFace: number, len = 0.5) {
  const r = lp.rng;
  let cx = x, cy = y;
  const steps = 4 + r.int(3);
  for (let i = 0; i < steps; i++) {
    const nx = cx + r.range(-0.07, 0.07), ny = cy - len / steps;
    const l = Math.hypot(nx - cx, ny - cy);
    lp.push([(cx + nx) / 2, (cy + ny) / 2, zFace], 0, 0, Math.atan2(nx - cx, cy - ny))
      .box(0, -l / 2, 0, 0.018, l, 0.012, LPC.engrave, { jitter: 0, ao: 0 })
      .pop();
    cx = nx; cy = ny;
  }
}

/** Righe di testo incise (sottili lastre scure leggermente in rilievo). */
export function inscription(lp: LP, cx: number, top: number, zFace: number, widths: number[], color: string = LPC.engrave) {
  widths.forEach((w, i) => {
    lp.box(cx, top - i * 0.065, zFace, w, 0.022, 0.01, color, { jitter: 0, ao: 0 });
  });
}

/**
 * Edera rampicante su una facciata (piano z = zFace): un tralcio che sale
 * ondeggiando con foglioline a gruppi e qualche ramo laterale.
 */
export function ivy(lp: LP, x: number, y0: number, zFace: number, height: number, spread = 0.25) {
  const r = lp.rng;
  const greens = ['#3f5a32', '#4a6136', '#35502e', '#56703d'];
  let cx = x;
  for (let y = y0; y < y0 + height; y += 0.07) {
    cx += r.range(-0.03, 0.03);
    const k = 1 + Math.floor(r.next() * 3);
    for (let i = 0; i < k; i++) {
      lp.blob(cx + r.range(-spread, spread) * (1 - (y - y0) / height * 0.5), y + r.range(-0.03, 0.03), zFace + 0.015, 0.035 + r.next() * 0.02, 0.03, 0.012, r.pick(greens), { jitter: 0.006, vary: 0.15, ao: 0 });
    }
  }
}

/** Ragnatela in un angolo (piano z = zFace): raggi e due anelli di fili. */
export function cobweb(lp: LP, x: number, y: number, zFace: number, size = 0.25, flip = false) {
  const s = flip ? -1 : 1;
  const col = '#c9c6bd';
  for (let i = 0; i < 4; i++) {
    const a = (i / 3) * (Math.PI / 2);
    lp.push([x, y, zFace], 0, 0, s * (-Math.PI / 2 + a)).box(0, -size, 0, 0.006, size, 0.004, col, { jitter: 0, ao: 0 }).pop();
  }
  for (const k of [0.45, 0.8]) {
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * (Math.PI / 2), a1 = ((i + 1) / 3) * (Math.PI / 2);
      const p0 = [Math.sin(a0) * size * k * s, -Math.cos(a0) * size * k], p1 = [Math.sin(a1) * size * k * s, -Math.cos(a1) * size * k];
      const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      lp.push([x + (p0[0] + p1[0]) / 2, y + (p0[1] + p1[1]) / 2, zFace], 0, 0, Math.atan2(p1[1] - p0[1], p1[0] - p0[0])).box(0, -0.002, 0, l, 0.004, 0.004, col, { jitter: 0, ao: 0 }).pop();
    }
  }
}

/** Zucca a spicchi; se intagliata e accesa la faccia brilla e fa luce. */
export function pumpkin(lp: LP, x: number, y: number, z: number, r = 0.14, carved = true, lit = true, yaw = 0) {
  const rng = lp.rng;
  lp.push([x, y, z], yaw);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    lp.blob(Math.cos(a) * r * 0.45, r * 0.72, Math.sin(a) * r * 0.45, r * 0.55, r * 0.72, r * 0.55, rng.pick(['#c8691f', '#b85d1a', '#d4782a']), { detail: 1, jitter: r * 0.05, vary: 0.08, ao: 0.3 });
  }
  lp.push([0, r * 1.38, 0], rng.range(-0.5, 0.5), 0.3).cyl(0, 0, 0, r * 0.12, r * 0.08, r * 0.35, 5, '#4d5a2e', { jitter: 0 }).pop();
  if (carved) {
    const face = lit ? { color: '#ffb54a', bucket: 'glow' as const } : { color: '#2a1a10', bucket: 'solid' as const };
    const tri = (cx: number, cy: number, s: number) => {
      const t = new THREE.Shape(); t.moveTo(-s, -s * 0.6); t.lineTo(s, -s * 0.6); t.lineTo(0, s * 0.8); t.closePath();
      lp.push([cx, cy, r * 0.93]).plate(t, 0.01, face.color, { bucket: face.bucket, ao: 0 }).pop();
    };
    tri(-r * 0.35, r * 0.9, r * 0.17); tri(r * 0.35, r * 0.9, r * 0.17);
    const m = new THREE.Shape();
    m.moveTo(-r * 0.5, 0); m.lineTo(-r * 0.3, -r * 0.12); m.lineTo(-r * 0.15, 0); m.lineTo(0, -r * 0.14); m.lineTo(r * 0.15, 0); m.lineTo(r * 0.3, -r * 0.12); m.lineTo(r * 0.5, 0); m.lineTo(r * 0.3, -r * 0.25); m.lineTo(-r * 0.3, -r * 0.25); m.closePath();
    lp.push([0, r * 0.6, r * 0.9]).plate(m, 0.01, face.color, { bucket: face.bucket, ao: 0 }).pop();
    if (lit) lp.light(0, r * 0.7, r * 0.6, '#ff9a3c', 0.45, 2.4, 0.35, 0.6);
  }
  lp.pop();
}

/** Lanterna appesa a un braccio (catenella, gabbia, vetro acceso). */
export function hangingLantern(lp: LP, x: number, y: number, z: number, lit = true, s = 1) {
  lp.box(x, y - 0.14 * s, z, 0.01, 0.14 * s, 0.01, LPC.iron, { jitter: 0 });
  lp.box(x, y - 0.17 * s, z, 0.12 * s, 0.03, 0.12 * s, LPC.iron, { bevel: 0.004 });
  lp.box(x, y - 0.35 * s, z, 0.09 * s, 0.18 * s, 0.09 * s, lit ? LPC.lantern : '#3c3a35', { bucket: lit ? 'glow' : 'solid', jitter: 0 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(x + dx * 0.05 * s, y - 0.36 * s, z + dz * 0.05 * s, 0.014, 0.2 * s, 0.014, LPC.iron, { jitter: 0 });
  lp.push([x, y - 0.17 * s, z], Math.PI / 4).cyl(0, 0, 0, 0.1 * s, 0.015, 0.07 * s, 4, LPC.iron, { jitter: 0 }).pop();
  lp.box(x, y - 0.38 * s, z, 0.12 * s, 0.025, 0.12 * s, LPC.iron, { bevel: 0.004 });
  if (lit) lp.light(x, y - 0.26 * s, z, LPC.lantern, 0.7, 4, 0.2, 0.8);
}
