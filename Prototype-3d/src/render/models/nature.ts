// Ambiente: alberi (morto, spettrale, pino, natale), stagno, pozzanghere,
// rocce, aiuole, funghi, cespugli, collinette, erba alta, fango; più gli
// elementi di scenografia (bosco fuori dal recinto, ciuffi, sassi).

import * as THREE from 'three';
import type { ModelBuilder, Model } from '../shape.ts';
import { ModelBuilder as MB } from '../shape.ts';
import { P } from '../palette.ts';
import { bouquet, DRY, grassClump, GREENS, leaves, pebbles, tuft } from './common.ts';
import { builder, type PVis } from './types.ts';

const euler = new THREE.Euler();
const up = new THREE.Vector3();

/** Ramo ricorsivo: segmento lungo `len` inclinato, poi biforcazioni. */
function branch(
  b: ModelBuilder, x: number, y: number, z: number, yaw: number, tilt: number,
  len: number, thick: number, depth: number, color: string, tips: [number, number, number][],
) {
  b.push([x, y, z], yaw, 0, tilt).box(-thick / 2, 0, -thick / 2, thick / 2, len, thick / 2, color, { jitter: 0.08, rough: 0.3 }).pop();
  euler.set(0, yaw, tilt, 'YXZ');
  up.set(0, len, 0).applyEuler(euler);
  const ex = x + up.x, ey = y + up.y, ez = z + up.z;
  if (depth <= 0 || len < 3) { tips.push([ex, ey, ez]); return; }
  const r = b.rng;
  const kids = 2 + (r.chance(0.35) ? 1 : 0);
  for (let i = 0; i < kids; i++) {
    branch(b, ex, ey, ez, yaw + r.range(-1.4, 1.4), Math.min(1.3, Math.abs(tilt) + r.range(0.15, 0.55)) * (r.chance(0.5) ? 1 : -1),
      len * r.range(0.55, 0.75), Math.max(1, thick - 0.6), depth - 1, color, tips);
  }
}

export function deadTree(v: PVis | { seed: number; variant?: number }, autumn = true): Model {
  const b = new MB(`dead_tree:${v.seed}:${v.variant ?? 0}`);
  const r = b.rng;
  const h = 12 + r.int(5);
  b.cyl(0, 0, 0, h, 2.4, 1.4, P.woodDark, { seg: 6, jitter: 0.08 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r.range(-0.3, 0.3);
    b.push([Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8], -a, 0, 1.2).box(-0.8, 0, -0.8, 0.8, 3.5, 0.8, P.woodDark).pop();
  }
  const tips: [number, number, number][] = [];
  for (let i = 0; i < 3; i++) branch(b, 0, h - 2 - i * 2, 0, r.range(0, Math.PI * 2) + i * 2.1, r.range(0.4, 0.8) * (i % 2 ? -1 : 1), 6 + r.int(3), 1.6, 2, P.woodDark, tips);
  branch(b, 0, h, 0, r.range(0, 6), r.range(-0.2, 0.2), 6, 1.4, 2, P.woodDark, tips);
  if (autumn) {
    for (const [x, y, z] of tips) {
      if (!r.chance(0.45)) continue;
      b.ell(x, y, z, 1.8 + r.next(), 1.3, 1.8 + r.next(), r.pick([P.autumn, P.autumnDark, P.dryGrass]), { jitter: 0.15 });
    }
    leaves(b, -9, -9, 9, 9, 10);
  }
  return b.build();
}

export function spectralTree(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  const glow = v.lit;
  b.push([0, 0, 0], 0, 0, 0.08).cyl(0, 0, 0, 16, 3.2, 1.6, '#2b2a30', { seg: 6 }).pop();
  const tips: [number, number, number][] = [];
  for (let i = 0; i < 4; i++) branch(b, 1, 10 + i * 2, 0, i * 1.6 + r.next(), 0.7 + r.next() * 0.3, 8, 1.8, 2, '#2b2a30', tips);
  for (const [x, y, z] of tips) {
    b.ell(x, y, z, 2.3, 1.6, 2.3, glow ? P.spectral : P.spectralDeep, { bucket: glow ? 'glow' : 'solid', jitter: 0.1 });
  }
  if (glow) b.light(0, 18, 0, P.spectral, 1.2, 7, 0.2, 1.8);
  for (let i = 0; i < 5; i++) b.box(r.range(-10, 10), 0, r.range(-10, 10), 1, 1, 1, P.spectralDeep, { bucket: glow ? 'glow' : 'solid' });
  return b.build();
}

export function pine(seed: number, half = false, xmas = false, lit = true): Model {
  const b = new MB(`pine:${seed}:${half}:${xmas}`);
  const r = b.rng;
  const h = 18 + r.int(8);
  b.cyl(0, 0, 0, h, 1.6, 0.8, P.woodDark, { seg: 6 });
  const layers = 5;
  const lights: [number, number, number][] = [];
  for (let i = 0; i < layers; i++) {
    const y0 = 4 + (i * (h - 5)) / layers;
    const rad = 7.5 - i * 1.3;
    const dead = xmas || (half && i % 2 === 1);
    const col = dead ? r.pick([P.dryGrass, P.autumnDark]) : r.pick([P.pine, '#263b29', '#34503a']);
    b.cyl(r.range(-0.5, 0.5), r.range(-0.5, 0.5), y0, y0 + 5, rad, rad * 0.35, col, { seg: 7, jitter: 0.12 });
    if (xmas) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + i; lights.push([Math.cos(a) * rad * 0.8, y0 + 1, Math.sin(a) * rad * 0.8]); }
  }
  if (xmas) {
    const cols = [P.flowerRed, P.flame, P.spectral, P.flowerViolet];
    lights.forEach(([x, y, z], i) => b.box(x - 0.5, y, z - 0.5, x + 0.5, y + 1, z + 0.5, lit ? cols[i % 4] : '#444', { bucket: lit ? 'glow' : 'solid' }));
    b.ell(0, h + 1.5, 0, 1.3, 1.3, 1.3, P.gold, { bucket: lit ? 'glow' : 'solid' });
    if (lit) b.light(0, h * 0.6, 0, '#ffd27a', 0.9, 5, 0.4, 1.4);
  }
  return b.build();
}

export function pond(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  // bacino irregolare 40×30 (bordo di sassi, acqua, ninfee, canne, pesci morti)
  const blobs: [number, number, number, number][] = [[-6, -2, 12, 9], [7, 2, 10, 8], [-1, 5, 9, 6], [2, -6, 9, 6]];
  for (const [x, z, rx, rz] of blobs) b.cyl(x, z, 0, 0.6, rx + 2, rx + 2, P.earthDark, { seg: 10 }, rz + 2, rz + 2);
  for (const [x, z, rx, rz] of blobs) b.cyl(x, z, 0.2, 1.2, rx, rx, P.water, { bucket: 'water', seg: 10, jitter: 0.04 }, rz, rz);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const x = Math.cos(a) * 17, z = Math.sin(a) * 12;
    b.box(x - 1.2, 0, z - 1, x + 1.2, 1 + r.int(2), z + 1, r.pick([P.stoneDark, P.stone]), { rough: 0.6 });
  }
  for (let i = 0; i < 7; i++) {
    const x = r.range(-12, 12), z = r.range(-7, 7);
    b.cyl(x, z, 1.2, 1.5, 1.6, 1.6, P.lily, { seg: 6 });
    if (r.chance(0.3)) b.ell(x, 1.8, z, 0.6, 0.6, 0.6, P.flowerRose);
  }
  for (let i = 0; i < 4; i++) {
    const x = r.range(-10, 10), z = r.range(-6, 6);
    b.push([x, 1.2, z], r.range(0, 3)).box(-1.4, 0, -0.5, 1.4, 0.8, 0.5, P.ivory).box(1.4, 0, -0.7, 2.2, 0.8, 0.7, '#b9b2a2').pop();
  }
  for (let i = 0; i < 9; i++) {
    const a = r.range(0, Math.PI * 2);
    const x = Math.cos(a) * r.range(14, 17), z = Math.sin(a) * r.range(9, 12);
    const h = 5 + r.int(5);
    b.box(x, 0, z, x + 0.6, h, z + 0.6, P.leaf);
    b.box(x - 0.2, h, z - 0.2, x + 0.8, h + 2, z + 0.8, P.woodDark);
  }
  // pontile
  b.box(10, 1.5, 5, 16, 2.3, 9, P.wood, { jitter: 0.12 });
  for (const [x, z] of [[10.5, 5.5], [15, 5.5], [10.5, 8], [15, 8]]) b.box(x, 0, z, x + 0.8, 1.6, z + 0.8, P.woodDark);
  return b.build();
}

export function toxicPuddle(v: PVis): Model {
  const b = builder(v);
  b.cyl(-3, 0, 0, 0.6, 6, 6, '#2a3a1c', { seg: 8 }, 4, 4);
  b.cyl(-3, 0, 0.3, 0.9, 4.8, 4.8, P.toxic, { bucket: 'glow', seg: 8 }, 3.2, 3.2);
  b.cyl(5, 1, 0.3, 0.9, 3, 3, P.toxic, { bucket: 'glow', seg: 7 }, 2.4, 2.4);
  b.ell(-2, 1.2, 1, 0.8, 0.8, 0.8, '#c8f07c', { bucket: 'glow' });
  b.ell(4, 1, 0, 0.6, 0.6, 0.6, '#c8f07c', { bucket: 'glow' });
  b.light(0, 2, 0, P.toxic, 0.45, 3, 0.25, 0.8);
  return b.build();
}

export function monsterRocks(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  b.ell(-1, 4, -1, 6.5, 5.5, 5.5, P.stoneDark, { jitter: 0.12, rough: 0.8 });
  b.ell(5, 2.5, 4, 3.5, 3, 3, P.stone, { rough: 0.8 });
  b.ell(-6, 2, 5, 3, 2.4, 3, P.stoneDark, { rough: 0.8 });
  b.box(-4, 5, 3.6, -2, 6.5, 4.6, '#d8452a', { bucket: 'glow' });
  b.box(0, 5, 3.6, 2, 6.5, 4.6, '#d8452a', { bucket: 'glow' });
  b.box(-3.5, 2, 3.8, 1.5, 3, 4.8, P.shadow);
  for (const x of [-3, -1, 1]) b.box(x, 2.6, 4, x + 0.8, 3.4, 4.9, P.bone);
  b.box(-6, 8, -3, -2, 9, 1, P.moss);
  void r;
  return b.build();
}

export function flowerbed(v: PVis): Model {
  const b = builder(v);
  for (let x = -8; x < 8; x += 2) for (const z of [-8, 7]) b.box(x, 0, z, x + 1.8, 1.6, z + 1, P.stoneDark);
  for (let z = -7; z < 7; z += 2) for (const x of [-8, 7]) b.box(x, 0, z, x + 1, 1.6, z + 1.8, P.stoneDark);
  b.box(-7, 0, -7, 7, 1.2, 7, P.earth);
  for (const [x, z] of [[-4, -4], [2, -4], [-4, 2], [3, 3], [0, -1]]) bouquet(b, x, 1.2, z, 0.9);
  return b.build();
}

export function poisonShrooms(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  for (let i = 0; i < 4; i++) {
    const x = r.range(-3, 3), z = r.range(-3, 3), h = 2 + r.int(3), rad = 1.2 + r.next() * 1.3;
    b.box(x - 0.5, 0, z - 0.5, x + 0.5, h, z + 0.5, P.ivory);
    const cap = r.pick([P.red, P.flowerViolet, '#b84a3a']);
    b.ell(x, h + 0.5, z, rad, 1, rad, cap);
    b.box(x - 0.3, h + 1.2, z + 0.4, x + 0.3, h + 1.6, z + 0.9, P.ivory);
  }
  return b.build();
}

export function bushes(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  for (let i = 0; i < 6; i++) {
    b.ell(r.range(-5, 5), 2.5 + r.next() * 2, r.range(-5, 5), 3 + r.next() * 2, 2.5 + r.next() * 2, 3 + r.next() * 2, r.pick([P.leaf, P.grassDark, P.moss, P.dryGrass]), { jitter: 0.15, rough: 0.8 });
  }
  if (r.chance(0.5)) for (let i = 0; i < 4; i++) b.ell(r.range(-5, 5), r.range(4, 6), r.range(-5, 5), 0.7, 0.7, 0.7, P.red);
  return b.build();
}

export function hillock(v: PVis): Model {
  const b = builder(v);
  b.ell(0, 0, 0, 9, 5, 8.5, P.grass, { jitter: 0.1, seg: 1 });
  b.ell(-2, 2, 2, 5, 3.6, 4, P.moss, { seg: 1 });
  tuft(b, 3, -3, 3); tuft(b, -4, 1, 2, P.moss); pebbles(b, -7, -7, 7, 7, 3);
  return b.build();
}

export function tallGrass(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  for (let i = 0; i < 9; i++) tuft(b, Math.floor(r.range(-5, 4)), Math.floor(r.range(-5, 4)), 4 + r.int(4), r.pick([P.dryGrass, P.moss, P.mossBright, P.autumn]));
  return b.build();
}

export function mud(v: PVis): Model {
  const b = builder(v);
  b.cyl(0, 0, 0, 0.5, 4.6, 4.6, '#2c2119', { seg: 8 });
  b.cyl(1, -1, 0.2, 0.7, 2.4, 2.4, '#3b4648', { bucket: 'water', seg: 7 });
  pebbles(b, -4, -4, 4, 4, 2);
  return b.build();
}

// ── Scenografia ─────────────────────────────────────────────────────────

export function sceneryRock(seed: number): Model {
  const b = new MB(`rock:${seed}`);
  const r = b.rng;
  b.ell(0, 1.5, 0, 3 + r.next() * 2, 2 + r.next() * 1.5, 2.5 + r.next() * 2, r.pick([P.stoneDark, P.stone]), { rough: 0.9, jitter: 0.12 });
  if (r.chance(0.5)) b.ell(2.5, 1, 1.5, 1.6, 1.2, 1.6, P.stone, { rough: 0.8 });
  if (r.chance(0.6)) b.box(-1, 2.5, -1, 1, 3.4, 1, P.moss);
  return b.build();
}

export function sceneryTuft(seed: number): Model {
  const b = new MB(`tuft:${seed}`);
  const r = b.rng;
  const n = 1 + r.int(2);
  for (let i = 0; i < n; i++) grassClump(b, r.range(-2, 2), r.range(-2, 2), 0.65 + r.next() * 0.35, seed === 4 ? DRY : GREENS);
  return b.build();
}
/** Erba secca/alta del sottobosco. */
export function sceneryWildGrass(seed: number): Model {
  const b = new MB(`wgrass:${seed}`);
  const r = b.rng;
  for (let i = 0; i < 2 + r.int(2); i++) grassClump(b, r.range(-2.5, 2.5), r.range(-2.5, 2.5), 1.1 + r.next() * 0.6, r.chance(0.5) ? DRY : [...GREENS.slice(0, 3), ...DRY.slice(0, 2)]);
  return b.build();
}
/** Fiorellini di campo: steli sottili e una testa colorata di un voxel. */
export function sceneryFlowers(seed: number): Model {
  const b = new MB(`flowers:${seed}`);
  const r = b.rng;
  const colors = [[P.flowerWhite, '#e8e2d0'], [P.flowerYellow, '#e3c66a'], [P.flowerViolet, '#9a86c2'], [P.flowerRose, P.flowerRed]][seed % 4];
  grassClump(b, 0, 0, 0.7);
  for (let i = 0; i < 3 + r.int(4); i++) {
    const x = r.range(-2.2, 2.2), z = r.range(-2.2, 2.2), h = 1.6 + r.next() * 1.8;
    b.box(x, 0, z, x + 0.6, h, z + 0.6, P.leaf);
    b.box(x - 0.3, h, z - 0.3, x + 0.9, h + 0.9, z + 0.9, r.pick(colors));
  }
  return b.build();
}
/** Felce: fronde inclinate disposte a raggiera (sottobosco). */
export function sceneryFern(seed: number): Model {
  const b = new MB(`fern:${seed}`);
  const r = b.rng;
  const n = 5 + r.int(3);
  const c = r.pick(['#3f5a32', '#4a6136', '#56703d', '#5b5a33']);
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + r.range(-0.2, 0.2);
    const len = 3.5 + r.next() * 2;
    b.push([0, 0.4, 0], yaw, -0.75 - r.next() * 0.35).box(-0.4, 0, -0.3, 0.4, len, 0.3, c).pop();
    // foglioline laterali
    b.push([0, 0.4, 0], yaw, -0.9).box(-1.1, len * 0.45, -0.3, 1.1, len * 0.45 + 0.6, 0.3, c).pop();
  }
  return b.build();
}
/** Cespuglio basso per il bosco. */
export function sceneryBush(seed: number): Model {
  const b = new MB(`bush:${seed}`);
  const r = b.rng;
  for (let i = 0; i < 3 + r.int(2); i++) {
    b.ell(r.range(-2, 2), 2 + r.next() * 1.5, r.range(-2, 2), 2 + r.next() * 1.3, 1.8 + r.next(), 2 + r.next() * 1.3, r.pick(['#2f4529', '#3a5230', '#44502c', '#2b3a26']), { rough: 0.8 });
  }
  if (r.chance(0.4)) for (let i = 0; i < 3; i++) { const x = r.range(-2.5, 2), y = 2.5 + r.next() * 2, z = r.range(1.5, 3.5); b.box(x, y, z, x + 0.8, y + 0.8, z + 0.8, P.red); }
  return b.build();
}
/** Funghetti. */
export function sceneryShrooms(seed: number): Model {
  const b = new MB(`shroom:${seed}`);
  const r = b.rng;
  for (let i = 0; i < 2 + r.int(3); i++) {
    const x = r.range(-2, 2), z = r.range(-2, 2), h = 0.8 + r.next() * 1.4;
    b.box(x, 0, z, x + 0.6, h, z + 0.6, P.bone);
    const cap = r.pick([P.red, '#b9824e', '#8a6a4a']);
    b.box(x - 0.6, h, z - 0.6, x + 1.2, h + 0.7, z + 1.2, cap);
  }
  return b.build();
}
export function sceneryLeaves(seed: number): Model {
  const b = new MB(`leaves:${seed}`);
  leaves(b, -3, -3, 3, 3, 3);
  return b.build();
}

export function sceneryPebbles(seed: number): Model {
  const b = new MB(`pebbles:${seed}`);
  pebbles(b, -3, -3, 3, 3, 3);
  return b.build();
}
