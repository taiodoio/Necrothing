// Costruzioni: Bottega, Casa del becchino, Santuario, Mausoleo, tomba
// dissotterrata, muretti/staccionate/inferriate, archi, sentieri, pozzo,
// fontana, buco infernale, casetta per animali. Fronte verso +z.

import type { ModelBuilder, Model } from '../shape.ts';
import { P } from '../palette.ts';
import { candle, pebbles, skull, tuft } from './common.ts';
import { builder, decay, glass, type PVis } from './types.ts';

/** Muro in pietra con corsi di mattoni sfalsati sulla faccia +z e +x. */
function brickWall(b: ModelBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string) {
  b.box(x0, y0, z0, x1, y1, z1, color, { jitter: 0.1 });
  const r = b.rng;
  for (let y = y0; y < y1; y += 2) {
    const shift = ((y - y0) / 2) % 2 ? 2 : 0;
    for (let x = x0 + shift; x < x1; x += 4) {
      if (r.chance(0.5)) b.box(x, y, z1 - 0.5, Math.min(x1, x + 3), y + 2, z1 + 0.2, r.pick([P.stoneDark, P.stoneWarm, P.stoneLight]), { only: 'voxel', jitter: 0.08 });
    }
    for (let z = z0 + shift; z < z1; z += 4) {
      if (r.chance(0.45)) b.box(x1 - 0.5, y, z, x1 + 0.2, y + 2, Math.min(z1, z + 3), r.pick([P.stoneDark, P.stoneWarm]), { only: 'voxel', jitter: 0.08 });
    }
  }
}

function window(b: ModelBuilder, x: number, y: number, z: number, w: number, h: number, lit: boolean) {
  b.box(x - w / 2 - 1, y - 1, z - 0.5, x + w / 2 + 1, y + h + 1, z + 1, P.woodDark);
  b.box(x - w / 2, y, z, x + w / 2, y + h, z + 1.2, glass(lit, P.window).color, { bucket: glass(lit).bucket });
  b.box(x - 0.4, y, z + 1, x + 0.4, y + h, z + 1.5, P.woodDark);
  b.box(x - w / 2, y + h / 2 - 0.4, z + 1, x + w / 2, y + h / 2 + 0.4, z + 1.5, P.woodDark);
  b.box(x - w / 2 - 1.5, y - 1.5, z, x + w / 2 + 1.5, y - 0.5, z + 2, P.stoneLight);
  if (lit) b.light(x, y + h / 2, z + 3, P.window, 0.7, 4, 0.06, 0.8);
}

function door(b: ModelBuilder, x: number, y: number, z: number, w: number, h: number) {
  b.box(x - w / 2 - 1, y, z - 0.5, x + w / 2 + 1, y + h + 1, z + 0.8, P.stoneLight);
  b.box(x - w / 2, y, z, x + w / 2, y + h, z + 1.2, P.wood, { jitter: 0.1 });
  for (let i = -w / 2 + 1.5; i < w / 2; i += 2) b.box(x + i - 0.2, y, z + 1, x + i + 0.2, y + h, z + 1.4, P.woodDark, { only: 'voxel' });
  b.box(x + w / 2 - 1.5, y + h / 2, z + 1.2, x + w / 2 - 0.7, y + h / 2 + 1, z + 1.8, P.iron);
}

function hangingLantern(b: ModelBuilder, x: number, y: number, z: number, lit: boolean) {
  b.box(x - 0.3, y, z - 3, x + 0.3, y + 0.6, z, P.iron);
  b.box(x - 0.2, y - 2, z - 0.2, x + 0.2, y, z + 0.2, P.iron);
  b.box(x - 1.2, y - 5, z - 1.2, x + 1.2, y - 2, z + 1.2, glass(lit).color, { bucket: glass(lit).bucket });
  b.box(x - 1.5, y - 2.4, z - 1.5, x + 1.5, y - 1.8, z + 1.5, P.iron);
  b.box(x - 1.5, y - 5.4, z - 1.5, x + 1.5, y - 4.8, z + 1.5, P.iron);
  if (lit) b.light(x, y - 3.5, z, P.lantern, 1, 5.5, 0.15, 1.1);
}

function crate(b: ModelBuilder, x: number, z: number, s = 4, y = 0) {
  b.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, P.woodLight, { jitter: 0.1 });
  b.box(x - s / 2 - 0.2, y + s / 2 - 0.4, z - s / 2 - 0.2, x + s / 2 + 0.2, y + s / 2 + 0.4, z + s / 2 + 0.2, P.woodDark, { only: 'voxel' });
}

function barrel(b: ModelBuilder, x: number, z: number) {
  b.cyl(x, z, 0, 6, 2.2, 2.2, P.wood, { seg: 8 });
  b.cyl(x, z, 2, 3, 2.5, 2.5, P.iron, { seg: 8 });
  b.cyl(x, z, 5, 6, 2.4, 2.4, P.iron, { seg: 8 });
}

function shovel(b: ModelBuilder, x: number, z: number, lean = 0.25) {
  b.push([x, 0, z], 0.4, 0, lean);
  b.box(-0.4, 3, -0.4, 0.4, 14, 0.4, P.wood);
  b.box(-1.3, 0, -0.3, 1.3, 3.5, 0.3, P.ironLight);
  b.box(-1, 14, -0.4, 1, 14.8, 0.4, P.woodDark);
  b.pop();
}

export function shop(v: PVis): Model {
  const b = builder(v);
  const lit = v.lit && !v.broken;
  b.box(-14, 0, -12, 14, 2, 10, P.stoneDark);
  brickWall(b, -13, 2, -11, 13, 9, 7, P.stone);
  b.box(-13, 9, -11, 13, 17, 7, P.woodDark, { jitter: 0.12 });
  for (let x = -13; x <= 13; x += 4) b.box(x, 9, 6.5, x + 1, 17, 7.6, P.wood, { only: 'voxel' });
  b.wedge(-15, 17, -13, 15, 27, 9, 'x', P.roof, { jitter: 0.1 });
  b.box(5, 20, -6, 9, 31, -2, P.stoneDark);
  b.box(4.5, 31, -6.5, 9.5, 32, -1.5, P.stone);
  // vetrina con barattoli di fuochi fatui
  b.box(2, 4, 7, 11, 12, 8.5, P.woodDark);
  b.box(3, 5, 7.5, 10, 11, 8.8, glass(lit, P.window).color, { bucket: glass(lit).bucket });
  for (const x of [4.5, 7, 9]) b.box(x - 0.8, 5.5, 8.6, x + 0.8, 7.5, 9.4, P.spectral, { bucket: 'glow' });
  door(b, -6, 2, 7, 6, 10);
  b.box(-10, 0, 10, -2, 1, 13, P.stoneLight);
  // tendina a strisce
  for (let i = 0; i < 7; i++) b.push([0, 13.5, 8], 0, -0.5).box(-12 + i * 3.4, 0, 0, -12 + i * 3.4 + 3.4, 1, 4.5, i % 2 ? P.ivory : P.red).pop();
  // insegna con il simbolo del fuoco fatuo
  b.box(-12, 18.5, 8, -2, 22.5, 9, P.woodLight);
  b.box(-7.8, 19.3, 8.8, -6.2, 21.7, 9.6, P.spectral, { bucket: 'glow' });
  b.light(-7, 20.5, 10, P.spectral, 0.5, 3, 0.25, 0.7);
  hangingLantern(b, 0, 13, 10, lit);
  crate(b, 11, 11); crate(b, 11, 11, 3, 4); barrel(b, -12, 11);
  decay(b, v, 30, 30, 16);
  return b.build();
}

export function gravediggerHouse(v: PVis): Model {
  const b = builder(v);
  const lit = v.lit && !v.broken;
  b.box(-19, 0, -14, 19, 2, 11, P.stoneDark);
  brickWall(b, -17, 2, -12, 17, 17, 8, P.stone);
  for (const x of [-17, 16]) b.box(x, 2, 7, x + 1, 17, 9, P.woodDark);
  b.box(-17, 16, 7.5, 17, 17, 9, P.woodDark);
  window(b, -11, 7, 8, 5, 6, lit);
  window(b, 10, 7, 8, 5, 6, lit);
  window(b, 16.8, 8, -4, 0.1, 0.1, false);
  b.box(17, 7, -7, 18, 13, -2, glass(lit, P.window).color, { bucket: glass(lit).bucket });
  door(b, 0, 2, 8, 6, 11);
  b.box(-5, 0, 9, 5, 1.5, 12, P.stoneLight);
  b.box(-4, 0, 12, 4, 0.8, 14, P.stone);
  b.wedge(-19, 17, -15, 19, 29, 11, 'x', v.broken ? P.roofDark : P.roof, { jitter: 0.1 });
  if (v.broken) b.box(-8, 22, 0, -2, 30, 12, P.ink, { carve: true, cut: true });
  b.box(9, 20, -8, 13, 33, -3, P.stoneDark);
  b.box(8.5, 33, -8.5, 13.5, 34, -2.5, P.stone);
  hangingLantern(b, 5.5, 15, 10, lit);
  shovel(b, -15, 11);
  crate(b, 13, 12); crate(b, 16, 11, 3);
  barrel(b, -18, 12);
  decay(b, v, 40, 30, 16);
  return b.build();
}

export function shrine(v: PVis): Model {
  const b = builder(v);
  const lit = v.lit && !v.broken;
  b.box(-13, 0, -13, 13, 2, 11, P.stoneDark);
  b.box(-10, 0, 11, 10, 1, 14, P.stoneLight);
  brickWall(b, -10, 2, -10, 10, 16, 6, P.stoneWarm);
  b.box(-4, 2, 5, 4, 12, 7, P.shadow);
  b.ring(0, 12, 5, 8, 4, 5.5, P.stoneLight, { seg: 7 });
  for (const x of [-5, 4]) b.box(x, 2, 5.5, x + 1.5, 12, 8, P.stoneLight);
  b.box(-2.5, 2, 2, 2.5, 5, 4.5, P.marble);
  candle(b, -2, 5, 3, lit, 2); candle(b, 1, 5, 3, lit, 3);
  b.wedge(-12, 16, -12, 12, 30, 8, 'z', P.roof, { jitter: 0.1 });
  b.box(-0.6, 30, -2, 0.6, 37, -1, P.gold);
  b.box(-2.5, 34, -2, 2.5, 35.2, -1, P.gold);
  for (const x of [-8, 8]) candle(b, x, 2, 9, lit, 3);
  if (lit) b.light(0, 7, 7, P.flame, 1, 5, 0.25, 1);
  decay(b, v, 30, 30, 16);
  return b.build();
}

export function mausoleum(v: PVis): Model {
  const b = builder(v);
  const lit = v.lit && !v.broken;
  b.box(-15, 0, -14, 15, 2, 14, P.stoneDark);
  b.box(-13, 2, -13, 13, 3.5, 13, P.stone);
  b.box(-9, 0, 13, 9, 1, 15, P.stoneLight);
  brickWall(b, -11, 3.5, -11, 11, 21, 6, P.stone);
  for (const x of [-11, 8]) b.box(x, 3.5, 6, x + 3, 21, 9, P.stoneLight);
  b.box(-12, 21, -12, 12, 23, 10, P.stoneLight);
  b.wedge(-12, 23, -12, 12, 30, 10, 'z', P.stoneDark);
  skull(b, 0, 24.5, 9.5, P.bone);
  b.box(-4, 3.5, 6, 4, 14, 7, P.shadow);
  b.ring(0, 14, 6, 9, 4, 6, P.stoneLight, { seg: 7 });
  b.box(-6, 3.5, 6, -4, 14, 9, P.stoneLight);
  b.box(4, 3.5, 6, 6, 14, 9, P.stoneLight);
  for (let x = -3.5; x <= 3; x += 1.5) b.box(x, 3.5, 7.5, x + 0.6, 13.5, 8.3, P.iron);
  b.box(-4, 9, 7.4, 4, 9.6, 8.4, P.iron);
  for (const x of [-8.5, 7.5]) { candle(b, x, 3.5, 11, lit, 3); candle(b, x + 1.5, 3.5, 12, lit, 2); }
  b.box(-1, 30, -1.5, 1, 34, 0.5, P.stoneLight);
  if (lit) b.light(0, 8, 10, P.flame, 0.9, 5, 0.3, 0.9);
  decay(b, v, 30, 30, 20);
  return b.build();
}

export function openGrave(v: PVis): Model {
  const b = builder(v);
  b.box(-6, 0, -4, 6, 0.4, 7, P.shadow);
  b.box(-5, 0.2, -3, 5, 0.6, 6, '#120d0a');
  b.ell(-8, 0.5, 2, 2.5, 2.5, 6, P.earth, { jitter: 0.15 });
  b.ell(8, 0.4, -2, 2.5, 2, 4, P.earthDark, { jitter: 0.15 });
  b.push([0, 0, -7], 0, 0.15, -0.3).box(-4.5, 0, -1.2, 4.5, 11, 1.2, P.stone).pop();
  shovel(b, 8, 4, -0.3);
  pebbles(b, -9, -9, 9, 9, 6);
  decay(b, v, 20, 20, 6);
  return b.build();
}

export function wallStone(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  for (let y = 0; y < 6; y += 2) {
    for (let x = -5 + (y % 4 ? 1.5 : 0); x < 5; x += 3.5) {
      const x1 = Math.min(5, x + 3.3);
      if (v.broken && y >= 4 && r.chance(0.6)) continue;
      b.box(Math.max(-5, x), y, -2, x1, y + 2, 2, r.pick([P.stone, P.stoneDark, P.stoneWarm]), { rough: 0.6, jitter: 0.1 });
    }
  }
  b.box(-5, 6, -2.3, 5, 7, 2.3, P.stoneLight, { rough: 0.5 });
  decay(b, v, 10, 6, 6);
  return b.build();
}

export function fenceWood(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  for (const x of [-5, 4]) b.box(x, 0, -0.8, x + 1, 9, 0.8, P.woodDark);
  for (const y of [3, 7]) b.push([0, y, 0], 0, 0, r.range(-0.05, 0.05)).box(-5, 0, -0.4, 5, 1, 0.4, P.wood).pop();
  for (let x = -3; x < 4; x += 2) {
    if (v.broken && r.chance(0.4)) continue;
    b.push([x, 0, 0.6], 0, 0, r.range(-0.08, 0.08)).box(-0.6, 0, -0.3, 0.6, 7 + r.int(2), 0.3, P.woodLight).pop();
  }
  decay(b, v, 10, 4, 8);
  return b.build();
}

export function fenceIron(v: PVis): Model {
  const b = builder(v);
  b.box(-5, 0, -1.2, 5, 1.5, 1.2, P.stoneDark);
  for (const x of [-5, 4]) { b.box(x, 0, -1, x + 1, 13, 1, P.iron); b.box(x - 0.3, 13, -1.3, x + 1.3, 14, 1.3, P.iron); }
  for (const y of [3.5, 10]) b.box(-5, y, -0.4, 5, y + 0.8, 0.4, P.iron);
  for (let x = -3; x < 4; x += 1.6) {
    const bent = v.broken && x > 0 ? 0.35 : 0;
    b.push([x, 1.5, 0], 0, 0, bent).box(-0.3, 0, -0.3, 0.3, 10, 0.3, P.iron).cyl(0, 0, 10, 12, 0.8, 0, P.iron, { seg: 4 }).pop();
  }
  decay(b, v, 10, 4, 10);
  return b.build();
}

export function arch(v: PVis): Model {
  const b = builder(v);
  const lit = v.lit && !v.broken;
  const gothic = v.type === 'arch_gothic';
  for (const x of [-15, 10]) {
    b.box(x, 0, -4, x + 5, 2, 4, P.stoneDark);
    brickWall(b, x + 0.5, 2, -3, x + 4.5, 18, 3, gothic ? P.stoneDark : P.stone);
    b.box(x, 18, -3.5, x + 5, 19.5, 3.5, P.stoneLight);
  }
  if (gothic) {
    for (const s of [-1, 1]) b.push([s * 11, 19, 0], 0, 0, s * 0.9).box(-2, 0, -3, 2, 14, 3, P.stoneDark).pop();
    b.box(-2, 28, -3.2, 2, 32, 3.2, P.stoneLight);
    skull(b, 0, 26, 3.4, P.bone);
    b.cyl(0, 0, 32, 36, 1.5, 0, P.stoneLight, { seg: 4 });
  } else {
    b.ring(0, 19, -3, 3, 10, 14.5, P.stone, { seg: 9 });
    b.box(-1.5, 31, -3.3, 1.5, 34, 3.3, P.stoneLight);
  }
  if (v.type === 'arch_lights') {
    for (const x of [-7, 7]) hangingLantern(b, x, 26, 0, lit);
  }
  if (v.broken) b.box(-6, 24, -4, 0, 34, 4, P.ink, { carve: true, cut: true });
  decay(b, v, 30, 10, 18);
  return b.build();
}

export function pathStone(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  const slabs: [number, number, number, number][] = r.chance(0.5)
    ? [[-5, -5, 0, 0], [0.6, -5, 5, -0.4], [-5, 0.6, -0.6, 5], [0, 0, 5, 5]]
    : [[-5, -5, 1.5, -1], [2, -5, 5, 1], [-5, -0.4, -1, 5], [-0.4, 1.6, 5, 5], [-0.6, -0.5, 1.6, 1.1]];
  for (const [x0, z0, x1, z1] of slabs) {
    if (v.broken && r.chance(0.35)) continue;
    const inset = 0.4;
    b.box(x0 + inset, 0, z0 + inset, x1 - inset, 1 + (r.chance(0.3) ? 0.6 : 0), z1 - inset, r.pick([P.stone, P.stoneDark, P.stoneLight, P.stoneWarm]), { jitter: 0.12, rough: 0.6 });
  }
  if (v.dirty) { tuft(b, -1, -1, 2, P.moss); tuft(b, 3, 3, 2, P.mossBright); }
  return b.build();
}

export function pathDirt(v: PVis): Model {
  const b = builder(v);
  pebbles(b, -5, -5, 5, 5, 3);
  if (v.dirty) tuft(b, 2, -2, 3);
  return b.build();
}

export function well(v: PVis): Model {
  const b = builder(v);
  b.cyl(0, 0, 0, 7, 7.5, 7, P.stone, { seg: 10, jitter: 0.12 });
  b.cyl(0, 0, 7, 8, 7.8, 7.8, P.stoneLight, { seg: 10 });
  b.cyl(0, 0, 8, 8.4, 5.2, 5.2, v.dirty ? '#1d2a1c' : P.shadow, { seg: 10 });
  for (const x of [-7, 6]) b.box(x, 8, -0.8, x + 1.2, 20, 0.8, P.woodDark);
  b.box(-7.5, 18, -0.6, 7.5, 19, 0.6, P.wood);
  b.wedge(-9, 20, -4, 9, 25, 4, 'x', P.roof);
  b.box(-0.2, 12, -0.2, 0.2, 18, 0.2, '#8a7a5c');
  b.cyl(0, 0, 10, 12.5, 1.5, 1.8, P.wood, { seg: 7 });
  if (v.broken) b.box(-9, 19, -5, 0, 26, 5, P.ink, { carve: true, cut: true });
  decay(b, v, 20, 20, 8);
  return b.build();
}

export function fountain(v: PVis): Model {
  const b = builder(v);
  b.cyl(0, 0, 0, 4, 13.5, 13, P.stone, { seg: 12, jitter: 0.1 });
  b.cyl(0, 0, 4, 5, 13.8, 13.8, P.stoneLight, { seg: 12 });
  b.cyl(0, 0, 3, 4.6, 11.5, 11.5, v.dirty ? '#2f3b2a' : P.water, { bucket: 'water', seg: 12 });
  b.cyl(0, 0, 4, 12, 2.2, 1.6, P.stone, { seg: 8 });
  b.cyl(0, 0, 12, 14, 5, 5.5, P.stoneLight, { seg: 9 });
  b.cyl(0, 0, 13, 14.4, 4.4, 4.4, v.broken ? P.stoneDark : P.water, { bucket: v.broken ? 'solid' : 'water', seg: 9 });
  b.ell(0, 16, 0, 1.6, 2, 1.6, P.stone);
  if (!v.broken) for (const a of [0, 1.6, 3.2, 4.7]) b.box(Math.cos(a) * 4.5 - 0.4, 6, Math.sin(a) * 4.5 - 0.4, Math.cos(a) * 4.5 + 0.4, 12, Math.sin(a) * 4.5 + 0.4, '#8fb3b4', { bucket: 'water' });
  decay(b, v, 30, 30, 8);
  return b.build();
}

export function hellHole(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  const on = v.lit && !v.broken;
  b.cyl(0, 0, 0, 0.6, 9.5, 9.5, '#1b1311', { seg: 10 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.ell(Math.cos(a) * 7.5, 1, Math.sin(a) * 7.5, 2.2, 1.8 + r.next() * 1.5, 2, r.pick([P.stoneDark, '#2b2321']), { rough: 0.6 });
  }
  b.cyl(0, 0, 0.2, 0.9, 5, 5, on ? P.hellfire : '#3b1a12', { bucket: on ? 'glow' : 'solid', seg: 10 });
  b.cyl(0, 0, 0.5, 1.1, 2.6, 2.6, on ? '#ffc35a' : '#2a120c', { bucket: on ? 'glow' : 'solid', seg: 8 });
  for (let i = 0; i < 5; i++) {
    const a = r.range(0, Math.PI * 2);
    b.push([0, 0.6, 0], -a).box(5, 0, -0.4, 9, 0.6, 0.4, on ? P.hellfire : '#3b1a12', { bucket: on ? 'glow' : 'solid' }).pop();
  }
  if (on) b.light(0, 3, 0, P.hellfire, 1.4, 6, 0.4, 1.6);
  decay(b, v, 20, 20, 4);
  return b.build();
}

export function petHouse(v: PVis): Model {
  const b = builder(v);
  b.box(-6, 0, -6, 6, 1, 5, P.woodDark);
  b.box(-5, 1, -5, 5, 9, 4, P.wood, { jitter: 0.1 });
  b.wedge(-6.5, 9, -6, 6.5, 15, 5, 'x', P.roofDark);
  b.box(-2.5, 1, 3.5, 2.5, 6, 4.5, P.shadow);
  b.ring(0, 6, 3.5, 4.5, 2.5, 3.3, P.woodDark, { seg: 6 });
  b.box(-3, 10.5, 4.5, 3, 12.5, 5.2, P.woodLight);
  b.cyl(6, 7, 0, 1.4, 2.2, 2.6, P.iron, { seg: 8 });
  b.box(4.5, 1.2, 6.6, 7.5, 2, 7.4, P.bone);
  decay(b, v, 20, 20, 10);
  return b.build();
}
