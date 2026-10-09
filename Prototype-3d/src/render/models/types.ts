// Parametri visivi di un oggetto piazzato (derivati dallo stato di gioco).

import { ModelBuilder } from '../shape.ts';
import { P } from '../palette.ts';
import { cobweb, leaves, moss } from './common.ts';

export interface PVis {
  type: string;
  variant: number;
  dirty: boolean;
  broken: boolean;
  lit: boolean;
  seed: number;
}

export function builder(v: PVis): ModelBuilder {
  return new ModelBuilder(`${v.type}:${v.variant}:${v.seed}:${v.dirty}:${v.broken}`);
}

/**
 * Sovrapposizione di decadimento comune: polvere, foglie, muschio alla base,
 * ragnatele. `w`,`d` in voxel (ingombro), `h` altezza indicativa.
 */
export function decay(b: ModelBuilder, v: PVis, w: number, d: number, h: number) {
  if (!v.dirty && !v.broken) return;
  leaves(b, -w / 2, -d / 2, w / 2, d / 2, Math.round((w * d) / 14) + 2);
  moss(b, -w / 2 + 1, 0, -d / 2 + 1, w / 2 - 1, Math.min(h, 4), d / 2 - 1, Math.round(w / 3) + 1);
  if (h > 6) cobweb(b, w / 4 - 1, Math.max(2, h * 0.6), d / 4);
  if (v.broken) {
    const r = b.rng;
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r.range(-w / 2, w / 2 - 1)), z = Math.floor(r.range(-d / 2, d / 2 - 1));
      b.box(x, 0, z, x + 1 + r.int(2), 1, z + 1, r.pick([P.stoneDark, P.woodDark, P.ironLight]), { jitter: 0.1 });
    }
  }
}

/** Vetro di una lampada: acceso (emissivo) o spento (scuro). */
export function glass(on: boolean, color: string = P.lantern): { color: string; bucket?: 'glow' } {
  return on ? { color, bucket: 'glow' } : { color: '#3a3833' };
}
