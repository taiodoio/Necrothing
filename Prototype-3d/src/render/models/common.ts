// Dettagli procedurali riutilizzabili: ciuffi d'erba, foglie, muschio, fiori,
// candele, teschi. Tutte le misure sono in voxel (V = 10 per cella).

import type { ModelBuilder } from '../shape.ts';
import { P } from '../palette.ts';

export function tuft(b: ModelBuilder, x: number, z: number, h = 3, color: string = P.dryGrass) {
  const r = b.rng;
  b.box(x, 0, z, x + 1, h, z + 1, color, { jitter: 0.12, rough: 0.2 });
  if (r.chance(0.7)) b.box(x + 1, 0, z, x + 2, Math.max(1, h - 1 - r.int(2)), z + 1, color, { jitter: 0.12 });
  if (r.chance(0.6)) b.box(x, 0, z + 1, x + 1, Math.max(1, h - 1 - r.int(2)), z + 2, r.chance(0.5) ? P.moss : color, { jitter: 0.12 });
  if (r.chance(0.4)) b.box(x - 1, 0, z, x, Math.max(1, h - 2), z + 1, color, { jitter: 0.12 });
}

/**
 * Ciuffo d'erba fine: fili sottili (0,6 voxel di design ≈ un voxel a qualità
 * media) di altezze e verdi diversi, alcuni piegati. Pensato per essere fitto.
 */
export function grassClump(b: ModelBuilder, x: number, z: number, scale = 1, palette: readonly string[] = GREENS) {
  const r = b.rng;
  const n = 4 + r.int(5);
  const t = 0.6;
  for (let i = 0; i < n; i++) {
    const bx = x + r.range(-1.6, 1.6) * scale, bz = z + r.range(-1.6, 1.6) * scale;
    const h = (1.2 + r.next() * 2.6) * scale;
    const c = r.pick(palette);
    b.box(bx, 0, bz, bx + t, h * 0.6, bz + t, c);
    // punta piegata verso una direzione casuale
    const dx = r.pick([-t, 0, t]), dz = r.pick([-t, 0, 0, t]);
    b.box(bx + dx, h * 0.6, bz + dz, bx + dx + t, h, bz + dz + t, c);
  }
}
export const GREENS = ['#4a6136', '#3f5233', '#56703d', '#62793f', '#35482d', '#6b7f45'] as const;
export const DRY = ['#8d7a4c', '#6b6a3a', '#7a6a3e', '#5b5a33', '#a0632f'] as const;

export function weeds(b: ModelBuilder, x0: number, z0: number, x1: number, z1: number, n: number) {
  const r = b.rng;
  for (let i = 0; i < n; i++) {
    tuft(b, Math.floor(r.range(x0, x1 - 1)), Math.floor(r.range(z0, z1 - 1)), 2 + r.int(3), r.pick([P.dryGrass, P.moss, P.mossBright, P.autumn]));
  }
}

export function leaves(b: ModelBuilder, x0: number, z0: number, x1: number, z1: number, n: number, y = 0) {
  const r = b.rng;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r.range(x0, x1)), z = Math.floor(r.range(z0, z1));
    b.box(x, y, z, x + 1, y + 1, z + 1, r.pick([P.autumn, P.autumnDark, P.dryGrass, P.red]), { jitter: 0.15, rough: 0.6 });
  }
}

/** Chiazze di muschio sulle superfici di un volume [x0..x1]×[y0..y1]×[z0..z1]. */
export function moss(b: ModelBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, n: number) {
  const r = b.rng;
  for (let i = 0; i < n; i++) {
    const side = r.int(3);
    const w = 1 + r.int(3), h = 1 + r.int(2);
    if (side === 0) { // fronte
      const x = Math.floor(r.range(x0, x1 - w)), y = Math.floor(r.range(y0, Math.min(y1, y0 + 6)));
      b.box(x, y, z1 - 0.5, x + w, y + h, z1 + 0.5, r.pick([P.moss, P.mossBright]), { jitter: 0.15 });
    } else if (side === 1) { // sommità
      const x = Math.floor(r.range(x0, x1 - w)), z = Math.floor(r.range(z0, z1 - 1));
      b.box(x, y1 - 0.5, z, x + w, y1 + 0.6, z + 1, P.moss, { jitter: 0.15 });
    } else { // lato
      const s = r.chance(0.5) ? x0 - 0.5 : x1 - 0.5;
      const y = Math.floor(r.range(y0, y1 - h)), z = Math.floor(r.range(z0, z1 - 1));
      b.box(s, y, z, s + 1, y + h, z + 1, P.moss, { jitter: 0.15 });
    }
  }
}

export function bouquet(b: ModelBuilder, x: number, y: number, z: number, scale = 1) {
  const r = b.rng;
  const colors = [P.flowerRed, P.flowerRose, P.flowerWhite, P.flowerViolet, P.flowerYellow];
  const n = 3 + r.int(3);
  for (let i = 0; i < n; i++) {
    const dx = Math.round(r.range(-1.6, 1.6) * scale), dz = Math.round(r.range(-1.2, 1.2) * scale);
    const h = Math.round((3 + r.int(3)) * scale);
    b.box(x + dx, y, z + dz, x + dx + 1, y + h, z + dz + 1, P.leaf, { jitter: 0.1, rough: 0.2 });
    b.ell(x + dx + 0.5, y + h + 0.6, z + dz + 0.5, 1.1 * scale, 0.9 * scale, 1.1 * scale, r.pick(colors), { jitter: 0.12, seg: 0 });
  }
}

export function candle(b: ModelBuilder, x: number, y: number, z: number, lit = true, height = 2) {
  b.box(x, y, z, x + 1, y + height, z + 1, P.candle, { jitter: 0.04 });
  if (lit) {
    b.box(x, y + height, z, x + 1, y + height + 1, z + 1, P.flame, { bucket: 'glow' });
    b.light(x + 0.5, y + height + 1, z + 0.5, P.flame, 0.35, 1.6, 0.35, 0.45);
  } else {
    b.box(x + 0.3, y + height, z + 0.3, x + 0.7, y + height + 0.6, z + 0.7, P.ink);
  }
}

/** Teschio 3×3×3 con orbite scavate sul fronte (+z). */
export function skull(b: ModelBuilder, x: number, y: number, z: number, color: string = P.bone) {
  b.box(x - 1.5, y, z - 1.5, x + 1.5, y + 3, z + 1.5, color, { jitter: 0.05, rough: 0.2 });
  b.box(x - 1, y - 1, z - 1, x + 1, y, z + 1, color, { jitter: 0.05 }); // mandibola
  b.box(x - 1.5, y + 1, z + 1, x - 0.5, y + 2, z + 2, P.ink, { carve: true });
  b.box(x + 0.5, y + 1, z + 1, x + 1.5, y + 2, z + 2, P.ink, { carve: true });
}

/** Piccola croce di ferro/legno. */
export function smallCross(b: ModelBuilder, x: number, z: number, h: number, color: string) {
  b.box(x - 0.5, 0, z - 0.5, x + 0.5, h, z + 0.5, color);
  b.box(x - 1.5, h - 3, z - 0.5, x + 1.5, h - 2, z + 0.5, color);
}

export function pebbles(b: ModelBuilder, x0: number, z0: number, x1: number, z1: number, n: number) {
  const r = b.rng;
  for (let i = 0; i < n; i++) {
    const x = r.range(x0, x1), z = r.range(z0, z1);
    const w = 0.7 + r.next() * 1.1, d = 0.7 + r.next() * 0.9, hgt = 0.5 + r.next() * 0.6;
    b.box(x, 0, z, x + w, hgt, z + d, r.pick([P.stone, P.stoneLight, P.stoneWarm, '#7d7a72']), { jitter: 0.1, rough: 0.5 });
  }
}

/** Ragnatela: filamenti grigio chiaro sottili (solo come accento di sporco). */
export function cobweb(b: ModelBuilder, x: number, y: number, z: number) {
  b.box(x, y, z, x + 3, y + 0.5, z + 0.5, '#9a9a96', { jitter: 0, rough: 0, only: 'miniature' });
  b.box(x, y, z, x + 1, y + 1, z + 1, '#8f8f8b', { only: 'voxel' });
  b.box(x + 1, y + 1, z, x + 2, y + 2, z + 1, '#8f8f8b', { only: 'voxel' });
}
