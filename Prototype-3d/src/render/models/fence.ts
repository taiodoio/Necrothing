// Recinto perimetrale procedurale: segmenti (muretto + inferriata a punte),
// pilastri con cappello e il grande cancello d'ingresso con due lanterne.
// I pezzi sono istanziati lungo il perimetro dell'area consacrata.

import type { Model } from '../shape.ts';
import { ModelBuilder } from '../shape.ts';
import { P } from '../palette.ts';
import { skull } from './common.ts';

/** Segmento di 1 cella lungo x, centrato. */
export function fenceSegment(seed: number): Model {
  const b = new ModelBuilder(`fseg:${seed}`);
  const r = b.rng;
  for (let x = -5; x < 5; x += 2.5) b.box(x, 0, -1.6, x + 2.4, 3, 1.6, r.pick([P.stoneDark, P.stone, P.stoneDark]), { rough: 0.5, jitter: 0.1 });
  b.box(-5, 3, -1.8, 5, 4, 1.8, P.stone);
  for (const y of [6.5, 13]) b.box(-5, y, -0.35, 5, y + 0.7, 0.35, P.iron);
  for (let x = -4; x < 5; x += 2) {
    b.box(x - 0.3, 4, -0.3, x + 0.3, 15, 0.3, P.iron);
    b.cyl(x, 0, 15, 17, 0.8, 0, P.iron, { seg: 4 });
  }
  if (r.chance(0.35)) b.box(r.range(-4, 3), 0, 1.6, r.range(-4, 3) + 1, 2, 2.6, P.moss);
  return b.build();
}

export function fencePillar(seed: number): Model {
  const b = new ModelBuilder(`fpil:${seed}`);
  b.box(-2.3, 0, -2.3, 2.3, 2, 2.3, P.stoneDark);
  b.box(-1.9, 2, -1.9, 1.9, 17, 1.9, P.stone, { jitter: 0.1 });
  for (const y of [6, 11]) b.box(-2, y, -2, 2, y + 0.6, 2, P.stoneDark, { only: 'voxel' });
  b.box(-2.6, 17, -2.6, 2.6, 18.5, 2.6, P.stoneLight);
  b.cyl(0, 0, 18.5, 21, 1.8, 0.4, P.stoneDark, { seg: 4 });
  return b.build();
}

/** Cancello d'ingresso largo 3 celle (lungo x), con lanterne e arco in ferro. */
export function gate(lit: boolean): Model {
  const b = new ModelBuilder('gate');
  for (const s of [-1, 1]) {
    const x = s * 13;
    b.box(x - 3, 0, -3, x + 3, 2, 3, P.stoneDark);
    b.box(x - 2.5, 2, -2.5, x + 2.5, 24, 2.5, P.stone, { jitter: 0.1 });
    b.box(x - 3, 24, -3, x + 3, 25.5, 3, P.stoneLight);
    skull(b, x, 26, 0, P.bone);
    b.box(x - 0.3, 18, 2.5, x + 0.3, 19, 5, P.iron);
    b.box(x - 1.3, 13, 3.6, x + 1.3, 17, 6.2, lit ? P.lantern : '#3a3833', { bucket: lit ? 'glow' : 'solid' });
    b.box(x - 1.6, 17, 3.3, x + 1.6, 18, 6.5, P.iron);
    if (lit) b.light(x, 15, 5, P.lantern, 1, 6, 0.15, 1.2);
    // ante aperte verso l'interno
    b.push([s * 10.5, 0, -0.5], s * 1.2);
    for (let i = 0; i < 4; i++) {
      const px = -s * (1 + i * 2);
      b.box(px - 0.3, 1, -0.3, px + 0.3, 16, 0.3, P.iron);
      b.cyl(px, 0, 16, 18, 0.7, 0, P.iron, { seg: 4 });
    }
    b.box(-s * 8, 4, -0.3, 0, 4.6, 0.3, P.iron);
    b.box(-s * 8, 12, -0.3, 0, 12.6, 0.3, P.iron);
    b.pop();
  }
  b.ring(0, 22, -0.4, 0.4, 9.5, 10.5, P.iron, { seg: 9 });
  b.box(-3.5, 29, -0.4, 3.5, 30, 0.4, P.iron);
  return b.build();
}
