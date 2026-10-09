// Luci: lampione, lanterna, lanterna fantasma, zucca, teschio con candela,
// torcia, falò esoterico, albero con candele. Stati: acceso/spento,
// sporco (ragnatele, muschio), rotto (inclinato, vetro scuro).

import type { Model } from '../shape.ts';
import { P } from '../palette.ts';
import { candle, skull } from './common.ts';
import { builder, decay, glass, type PVis } from './types.ts';

function lampHead(b: ReturnType<typeof builder>, y: number, on: boolean, gothic = false) {
  b.box(-2.5, y, -2.5, 2.5, y + 1, 2.5, P.iron);
  b.box(-2, y + 1, -2, 2, y + 5, 2, glass(on).color, { bucket: glass(on).bucket, jitter: 0.05 });
  for (const [x, z] of [[-2.5, -2.5], [1.5, -2.5], [-2.5, 1.5], [1.5, 1.5]]) b.box(x, y + 1, z, x + 1, y + 5, z + 1, P.iron);
  b.box(-3, y + 5, -3, 3, y + 6, 3, P.iron);
  if (gothic) {
    b.cyl(0, 0, y + 6, y + 10, 2.6, 0.3, P.iron, { seg: 4 });
  } else {
    b.cyl(0, 0, y + 6, y + 8, 2.6, 0.8, P.iron, { seg: 6 });
    b.box(-0.5, y + 8, -0.5, 0.5, y + 9.5, 0.5, P.iron);
  }
  if (on) b.light(0, y + 3, 0, P.lantern, 1, 5.5, 0.12, 1.1);
}

export function lampPost(v: PVis): Model {
  const b = builder(v);
  const on = v.lit && !v.broken;
  b.box(-3, 0, -3, 3, 2, 3, P.stoneDark);
  b.box(-2, 2, -2, 2, 3, 2, P.stone);
  b.push([0, 0, 0], 0, v.broken ? 0.12 : 0, v.broken ? 0.32 : 0);
  if (v.variant === 1) {
    b.cyl(0, 0, 3, 24, 0.9, 0.7, P.iron, { seg: 6 });
    b.box(-6, 22, -0.5, 6, 23, 0.5, P.iron);
    for (const x of [-5.5, 5.5]) {
      b.box(x - 0.3, 19, -0.3, x + 0.3, 22, 0.3, P.iron);
      b.push([x, 0, 0]);
      b.box(-1.8, 14, -1.8, 1.8, 15, 1.8, P.iron);
      b.box(-1.4, 15, -1.4, 1.4, 18.5, 1.4, glass(on).color, { bucket: glass(on).bucket });
      b.box(-2, 18.5, -2, 2, 19.5, 2, P.iron);
      if (on) b.light(0, 16.8, 0, P.lantern, 0.8, 4.5, 0.12, 0.9);
      b.pop();
    }
    b.ell(0, 24.5, 0, 1.2, 1.2, 1.2, P.iron);
  } else if (v.variant === 2) {
    b.cyl(0, 0, 3, 7, 1.6, 1.1, P.iron, { seg: 8 });
    b.cyl(0, 0, 7, 22, 1, 0.8, P.iron, { seg: 6 });
    for (const y of [10, 16]) b.box(-1.5, y, -1.5, 1.5, y + 1, 1.5, P.ironLight);
    lampHead(b, 22, on, true);
  } else {
    b.cyl(0, 0, 3, 22, 0.9, 0.7, P.iron, { seg: 6 });
    b.box(-1.5, 12, -0.5, 1.5, 13, 0.5, P.iron);
    lampHead(b, 22, on);
  }
  b.pop();
  decay(b, v, 10, 10, 20);
  return b.build();
}

export function lantern(v: PVis): Model {
  const b = builder(v);
  const on = v.lit && !v.broken;
  const body = (y: number) => {
    b.box(-2, y, -2, 2, y + 1, 2, P.iron);
    b.box(-1.5, y + 1, -1.5, 1.5, y + 5, 1.5, glass(on).color, { bucket: glass(on).bucket });
    for (const [x, z] of [[-2, -2], [1, -2], [-2, 1], [1, 1]]) b.box(x, y + 1, z, x + 1, y + 5, z + 1, P.iron);
    b.cyl(0, 0, y + 5, y + 7, 2.4, 0.6, P.iron, { seg: 6 });
    b.box(-0.6, y + 7, -0.2, 0.6, y + 8.5, 0.2, P.iron);
    if (on) b.light(0, y + 3, 0, P.lantern, 0.75, 4, 0.18, 0.9);
  };
  if (v.variant === 1) {
    b.box(-0.8, 0, -0.8, 0.8, 14, 0.8, P.woodDark);
    b.box(-0.5, 13, -0.5, 4, 14, 0.5, P.woodDark);
    b.push([3, 0, 0], 0, 0, v.broken ? 0.4 : 0);
    b.box(-0.2, 11, -0.2, 0.2, 13, 0.2, P.iron);
    body(3.5);
    b.pop();
  } else if (v.variant === 2) {
    b.box(-3, 0, -3, 3, 4, 3, P.stone, { rough: 0.8 });
    b.push([0, 4, 0], 0, 0, v.broken ? 0.5 : 0); body(0); b.pop();
  } else {
    b.push([0, 0, 0], 0, 0, v.broken ? 1.3 : 0); body(0); b.pop();
  }
  decay(b, v, 10, 10, 8);
  return b.build();
}

export function ghostLantern(v: PVis): Model {
  const b = builder(v);
  const on = v.lit && !v.broken;
  b.box(-2, 0, -2, 2, 2, 2, P.stoneDark);
  b.box(-0.6, 2, -0.6, 0.6, 10, 0.6, P.iron);
  b.push([0, 0, 0], 0, 0, v.broken ? 0.4 : 0);
  b.cyl(0, 0, 10, 11, 2.4, 2.4, P.iron, { seg: 6 });
  b.cyl(0, 0, 11, 16, 1.8, 1.4, on ? P.spectral : '#304540', { bucket: on ? 'glow' : 'solid', seg: 6 });
  for (const a of [0, 1, 2, 3]) b.push([0, 0, 0], (a * Math.PI) / 2).box(1.4, 11, -0.4, 2.2, 16, 0.4, P.iron).pop();
  b.cyl(0, 0, 16, 19, 2.6, 0.2, P.iron, { seg: 6 });
  b.ell(0, 19.5, 0, 0.9, 0.9, 0.9, on ? P.spectral : P.iron, { bucket: on ? 'glow' : 'solid' });
  if (on) b.light(0, 13.5, 0, P.spectral, 0.9, 4.5, 0.3, 1.2);
  b.pop();
  decay(b, v, 10, 10, 12);
  return b.build();
}

export function glowPumpkin(v: PVis): Model {
  const b = builder(v);
  const on = v.lit && !v.broken;
  const tone = v.broken ? P.autumnDark : P.pumpkin;
  b.ell(0, 3.2, 0, 4.2, 3.3, 3.8, tone, { jitter: 0.08 });
  for (const x of [-2.5, 0, 2.5]) b.box(x - 0.5, 0.6, -3.7, x + 0.5, 6, 3.7, '#a85320', { only: 'voxel' });
  b.box(-0.6, 6, -0.6, 0.6, 8, 0.6, P.leaf);
  b.box(0.6, 7, -0.3, 2, 7.6, 0.3, P.leaf);
  const face = on ? { color: P.flame, bucket: 'glow' as const } : { color: '#2a1608' };
  b.box(-2.5, 3.5, 3.2, -1, 5, 4.2, face.color, { bucket: face.bucket });
  b.box(1, 3.5, 3.2, 2.5, 5, 4.2, face.color, { bucket: face.bucket });
  b.box(-2.5, 1.5, 3.2, 2.5, 2.6, 4.2, face.color, { bucket: face.bucket });
  if (v.broken) b.box(1, 4, -4, 5, 8, 0, P.ink, { carve: true, cut: true });
  if (on) b.light(0, 3, 2, P.flame, 0.8, 3.5, 0.35, 0.9);
  decay(b, v, 10, 10, 6);
  return b.build();
}

export function skullCandle(v: PVis): Model {
  const b = builder(v);
  const on = v.lit && !v.broken;
  b.box(-3.5, 0, -3.5, 3.5, 2, 3.5, P.stoneDark, { rough: 0.7 });
  b.push([0, 2, 0], v.broken ? 0.6 : 0, 0, v.broken ? 0.5 : 0);
  b.box(-3, 1, -3, 3, 6, 3, P.bone, { jitter: 0.05 });
  b.box(-2, 0, -2, 2, 1, 2.5, P.bone);
  b.box(-2.2, 3, 2.6, -0.6, 4.6, 3.4, P.ink, { carve: true });
  b.box(0.6, 3, 2.6, 2.2, 4.6, 3.4, P.ink, { carve: true });
  b.box(-0.5, 1.8, 2.6, 0.5, 2.6, 3.4, P.ink, { carve: true });
  b.pop();
  if (!v.broken) {
    candle(b, -0.5, 8, -0.5, on, 3);
    b.box(-1.2, 8, -1.2, 1.2, 8.6, 1.2, P.candle);
    b.box(0.5, 6.5, 0.4, 1.4, 8.2, 1.2, P.candle);
  }
  decay(b, v, 10, 10, 8);
  return b.build();
}

export function torch(v: PVis): Model {
  const b = builder(v);
  const on = v.lit && !v.broken;
  b.box(-1.5, 0, -1.5, 1.5, 1, 1.5, P.stoneDark);
  b.push([0, 0, 0], 0, v.broken ? 0.3 : 0, v.broken ? 0.45 : 0);
  b.box(-0.8, 0, -0.8, 0.8, 15, 0.8, P.woodDark);
  for (const y of [5, 10]) b.box(-1, y, -1, 1, y + 1, 1, P.iron);
  b.cyl(0, 0, 15, 17.5, 1.3, 2.2, P.iron, { seg: 6 });
  if (on) {
    b.box(-1.5, 17.5, -1.5, 1.5, 19, 1.5, P.hellfire, { bucket: 'glow' });
    b.box(-1, 19, -1, 1, 21, 1, P.lantern, { bucket: 'glow' });
    b.box(-0.5, 21, -0.5, 0.5, 23, 0.5, P.flame, { bucket: 'glow' });
    b.light(0, 20, 0, P.lantern, 1.1, 5, 0.5, 1.2);
  } else b.box(-1.4, 17.5, -1.4, 1.4, 18.5, 1.4, P.ink);
  b.pop();
  decay(b, v, 10, 10, 14);
  return b.build();
}

export function bonfire(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  const on = v.lit && !v.broken;
  b.cyl(0, 0, 0, 0.6, 7, 7, P.earthDark, { seg: 9 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.push([Math.cos(a) * 6.5, 0, Math.sin(a) * 6.5], -a).box(-1.5, 0, -1.2, 1.5, 2 + r.int(2), 1.2, r.pick([P.stone, P.stoneDark]), { rough: 0.7 }).pop();
  }
  for (let i = 0; i < 4; i++) {
    b.push([0, 1.2, 0], (i * Math.PI) / 4, 0, v.broken ? 0 : 0.45).box(-0.9, 0, -4.5, 0.9, 1.8, 4.5, i % 2 ? P.wood : P.woodDark).pop();
  }
  // menhir con rune
  for (const [x, z] of [[-8, -8], [8, -7]]) {
    b.box(x - 1.5, 0, z - 1, x + 1.5, 9, z + 1, P.stoneDark, { rough: 0.8 });
    b.box(x - 0.5, 4, z + 0.6, x + 0.5, 7, z + 1.4, on ? P.spectral : P.engrave, { bucket: on ? 'glow' : 'solid' });
  }
  if (on) {
    b.box(-2.5, 2, -2.5, 2.5, 4, 2.5, P.hellfire, { bucket: 'glow' });
    b.box(-1.8, 4, -1.8, 1.8, 7, 1.8, P.spectral, { bucket: 'glow' });
    b.box(-1, 7, -1, 1, 10, 1, '#c7f5e6', { bucket: 'glow' });
    b.box(0.6, 9.5, 0.2, 1.4, 12, 1, P.spectralDeep, { bucket: 'glow' });
    b.light(0, 6, 0, P.spectral, 1.4, 7, 0.55, 2);
  } else {
    b.box(-2, 1.5, -2, 2, 2.5, 2, P.ink);
  }
  decay(b, v, 20, 20, 6);
  return b.build();
}

export function candleTree(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  const on = v.lit && !v.broken;
  b.cyl(0, 0, 0, 16, 3.2, 1.8, P.woodDark, { seg: 7 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    b.push([Math.cos(a) * 3, 0, Math.sin(a) * 3], -a, 0, 0.9).box(-0.8, 0, -0.8, 0.8, 4, 0.8, P.woodDark).pop();
  }
  const tips: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r.range(-0.3, 0.3);
    const y = 11 + r.int(6);
    const len = 7 + r.int(4);
    const tilt = v.broken && i < 2 ? 1.6 : 0.75;
    b.push([0, y, 0], -a, 0, tilt).box(-0.6, 0, -0.6, 0.6, len, 0.6, P.woodDark).pop();
    const tx = Math.cos(a) * Math.sin(tilt) * len, ty = y + Math.cos(tilt) * len, tz = Math.sin(a) * Math.sin(tilt) * len;
    tips.push([tx, ty, tz]);
  }
  for (const [x, y, z] of tips) candle(b, Math.round(x) - 0.5, Math.round(y), Math.round(z) - 0.5, on, 2);
  b.cyl(0, 0, 16, 24, 1.8, 0.4, P.woodDark, { seg: 6 });
  for (let i = 0; i < 7; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(4, 9);
    candle(b, Math.round(Math.cos(a) * d), 0, Math.round(Math.sin(a) * d), on, 1 + r.int(3));
  }
  if (on) b.light(0, 18, 0, P.flame, 1.3, 7, 0.3, 1.6);
  decay(b, v, 30, 30, 20);
  return b.build();
}
