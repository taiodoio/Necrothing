// Decorazioni e basi delle presenze piazzabili.

import type { Model } from '../shape.ts';
import { P } from '../palette.ts';
import { bouquet, candle, pebbles, skull, tuft } from './common.ts';
import { builder, decay, type PVis } from './types.ts';

export function wreath(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  for (const s of [-1, 1]) b.push([s * 2.5, 0, 1], 0, 0.25, s * -0.15).box(-0.5, 0, -0.5, 0.5, 11, 0.5, P.woodDark).pop();
  b.push([0, 0, -1.5], 0, -0.3).box(-0.5, 0, -0.5, 0.5, 11, 0.5, P.woodDark).pop();
  for (const rz of [0, Math.PI]) b.push([0, 9, 0.5], 0, 0, rz).ring(0, 0, -1.2, 1.2, 2.2, 4.3, P.leaf, { seg: 8, jitter: 0.12 }).pop();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.ell(Math.cos(a) * 3.3, 9 + Math.sin(a) * 3.3, 1.6, 0.9, 0.9, 0.7, r.pick([P.flowerRed, P.flowerWhite, P.flowerRose]));
  }
  b.box(-1, 4.5, 1, 1, 6.5, 1.8, P.red);
  return b.build();
}

export function sign(v: PVis): Model {
  const b = builder(v);
  b.box(-0.8, 0, -0.8, 0.8, 9, 0.8, P.woodDark);
  b.push([0, 0, 0], 0, 0, v.broken ? 0.25 : 0);
  b.box(-4.5, 7, -0.6, 4.5, 13, 0.6, P.woodLight, { jitter: 0.08 });
  for (const y of [8.9, 10.9]) b.box(-4.5, y, 0.4, 4.5, y + 0.2, 0.7, P.wood, { only: 'miniature' });
  b.box(-4.8, 12.8, -0.8, 4.8, 13.6, 0.8, P.woodDark);
  b.pop();
  decay(b, v, 10, 10, 9);
  return b.build();
}

export function angelStatue(v: PVis): Model {
  const b = builder(v);
  b.box(-7, 0, -7, 7, 2, 7, P.stoneDark);
  b.box(-5, 2, -5, 5, 9, 5, P.stone);
  b.box(-5.5, 9, -5.5, 5.5, 10, 5.5, P.stoneLight);
  b.cyl(0, 0, 10, 22, 3.6, 1.6, P.marble, { seg: 8 });
  b.ell(0, 24, 0, 2, 2.2, 2, P.marble);
  b.box(-2.5, 17, 1.4, 2.5, 18.5, 2.8, P.marble);
  b.ring(0, 26.5, -0.3, 0.3, 1.6, 2.2, P.gold, { seg: 6 });
  for (const s of [-1, 1]) {
    b.push([s * 1.5, 13, -1.5], s * 0.45);
    b.box(s > 0 ? 0 : -7, 0, -0.8, s > 0 ? 7 : 0, 11, 0.8, P.ivory, { jitter: 0.05 });
    b.box(s > 0 ? 4 : -9, 7, -0.8, s > 0 ? 9 : -4, 13, 0.8, P.ivory);
    b.pop();
  }
  b.box(-3, 4, 4.6, 3, 7, 5.6, P.ink, { carve: true });
  decay(b, v, 20, 20, 12);
  if (v.dirty) b.box(-2, 10, -2, 2, 11, 2, P.moss);
  return b.build();
}

export function votiveStatue(v: PVis): Model {
  const b = builder(v);
  b.box(-6, 0, -6, 6, 3, 6, P.stoneDark);
  b.cyl(0, 0, 3, 18, 4, 2, P.stone, { seg: 7 });
  b.ell(0, 19, 0, 2.6, 3, 2.6, P.stone);
  b.box(-1.8, 17.5, 1.6, 1.8, 20, 2.6, P.engrave);
  b.box(-1, 11, 2.8, 1, 14, 4, P.stoneLight);
  b.box(-4.2, 4, -0.5, 4.2, 12, 1.5, P.stone, { only: 'voxel' });
  candle(b, -5, 3, 4, !v.broken, 2);
  candle(b, 4, 3, 4, !v.broken, 3);
  candle(b, -4, 3, 5, !v.broken, 1);
  bouquet(b, 3, 3, -4, 0.8);
  decay(b, v, 20, 20, 12);
  return b.build();
}

export function openCoffin(v: PVis): Model {
  const b = builder(v);
  // bara lungo z (ingombro 1×2 = 10×20)
  b.box(-4, 0, -9, 4, 3, 7, P.woodDark);
  b.box(-3.2, 0, 7, 3.2, 3, 9, P.woodDark);
  b.box(-3, 1, -8, 3, 3.2, 6, '#5a1f22', { jitter: 0.06 });
  b.box(-2, 2.5, -7.5, 2, 3.4, -5, P.ivory);
  b.push([4.5, 0, -1], 0, 0, -0.55).box(0, 0, -9, 1, 8, 7, P.wood).pop();
  for (const z of [-6, 0, 5]) b.box(-4.2, 1, z, 4.2, 2, z + 1, P.iron, { only: 'voxel' });
  pebbles(b, -5, -10, 5, 10, 3);
  decay(b, v, 10, 20, 4);
  return b.build();
}

export function bones(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  for (let i = 0; i < 3; i++) {
    b.push([r.range(-2.5, 2.5), 0, r.range(-2.5, 2.5)], r.range(0, Math.PI));
    b.box(-2.8, 0, -0.4, 2.8, 0.9, 0.4, P.bone);
    for (const x of [-3.2, 2.4]) b.box(x, 0, -0.8, x + 0.8, 1.2, 0.8, P.bone);
    b.pop();
  }
  skull(b, 1.5, 1, -2, P.boneDark);
  return b.build();
}

export function vase(v: PVis): Model {
  const b = builder(v);
  if (v.variant === 1) {
    b.box(-3, 0, -3, 3, 1.5, 3, P.stoneDark);
    b.cyl(0, 0, 1.5, 3, 1.6, 2.2, P.stone, { seg: 8 });
    b.cyl(0, 0, 3, 8, 2.8, 2.6, P.stone, { seg: 8 });
    b.cyl(0, 0, 8, 9, 2.8, 1.8, P.stoneLight, { seg: 8 });
    b.ell(0, 9.5, 0, 1, 1, 1, P.stoneLight);
  } else {
    b.cyl(0, 0, 0, 1, 1.6, 1.8, '#8a4b32', { seg: 7 });
    b.ell(0, 4, 0, 3, 3.4, 3, '#a35a3b', { jitter: 0.08 });
    b.cyl(0, 0, 6.5, 9, 1.3, 1.6, '#a35a3b', { seg: 7 });
    for (const s of [-1, 1]) b.box(s * 2 - 0.5, 5.5, -0.4, s * 2 + 0.5, 8.5, 0.4, '#8a4b32');
    if (!v.dirty) bouquet(b, 0, 9, 0, 0.7);
  }
  decay(b, v, 10, 10, 6);
  return b.build();
}

// ── Basi delle presenze piazzabili (i personaggi animati sono a parte) ──

export function npcHome(v: PVis): Model {
  const b = builder(v);
  const r = b.rng;
  switch (v.type) {
    case 'zombies_play': {
      b.box(-3, 0, -3, 3, 4, 3, P.wood); // cassa-tavolo
      b.box(-3.5, 4, -3.5, 3.5, 4.6, 3.5, P.woodLight);
      for (let i = 0; i < 4; i++) b.box(-2 + i, 4.6, -1 + (i % 2), -1.2 + i, 4.9, 0.4 + (i % 2), i % 2 ? P.red : P.ivory);
      candle(b, 2, 4.6, 2, true, 1);
      for (const [x, z] of [[-7, 0], [7, 0]]) b.box(x - 1.5, 0, z - 1.5, x + 1.5, 2.5, z + 1.5, P.woodDark);
      break;
    }
    case 'zombies_dance': {
      b.cyl(0, 0, 0, 0.7, 8, 8, P.stoneDark, { seg: 10 });
      b.box(-8, 0, -8, -4, 3, -4, P.woodDark); // grammofono
      b.cyl(-6, -6, 3, 4, 1.5, 1.5, P.ink, { seg: 8 });
      b.push([-6, 4, -6], 0, 0.5).cyl(0, 0, 0, 6, 0.6, 3, P.gold, { seg: 8 }).pop();
      break;
    }
    case 'zombie_walker': {
      b.ell(0, 0, 0, 4, 1.4, 4, P.earth, { jitter: 0.12 });
      b.box(-0.6, 0, 1, 0.6, 4, 2, P.zombie);
      for (let i = -1; i <= 1; i++) b.box(i * 0.6 - 0.2, 4, 1, i * 0.6 + 0.2, 5.5, 2, P.zombie);
      break;
    }
    case 'ghosts_roam': {
      b.box(-2, 0, -2, 2, 6, 2, P.stoneDark, { rough: 0.7 });
      b.box(-0.8, 3, 1.8, 0.8, 4.5, 2.4, P.spectral, { bucket: 'glow' });
      b.light(0, 4, 2.2, P.spectral, 0.4, 2.5, 0.3, 0.6);
      break;
    }
    case 'ghosts_ball': {
      for (const x of [-8, 8]) {
        b.box(x - 0.5, 0, -3, x + 0.5, 5, -2, P.bone);
        b.box(x - 0.5, 0, 2, x + 0.5, 5, 3, P.bone);
        b.box(x - 0.5, 5, -3, x + 0.5, 6, 3, P.bone);
      }
      skull(b, r.range(-1, 1), 1, 0, P.bone);
      break;
    }
    case 'skeleton_pet': {
      b.cyl(0, 0, 0, 1.6, 2.4, 2.8, P.iron, { seg: 8 });
      b.box(-1.8, 1.2, -0.4, 1.8, 2, 0.4, P.bone);
      break;
    }
    default:
      tuft(b, 0, 0, 3);
  }
  return b.build();
}
