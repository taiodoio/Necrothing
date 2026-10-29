// Chiavi dei modelli degli oggetti piazzati: l'adapter low-poly
// (render/lowpoly/index.ts) le traduce nel generatore giusto.

import { visualOf } from '../game/catalog.ts';
import type { PVis } from './types.ts';

/** Quanti semi distinti per tipo (oggetti ripetuti come i sentieri variano). */
const SEED_VARIANTS: Record<string, number> = { path_stone: 6, path_dirt: 3, tall_grass: 4, wall_stone: 4, fence_wood: 4, fence_iron: 1, dead_tree: 5, bushes: 4 };

/** Quanti semi diversi può avere un tipo (per generare in anticipo tutte le sue forme). */
export function seedCount(type: string): number {
  return SEED_VARIANTS[visualOf(type, 0).type] ?? 2;
}

export function placeableSeed(type: string, idHash: number): number {
  return idHash % (SEED_VARIANTS[type] ?? 2);
}

/** Le varianti (oggetti a sé) usano il modello della loro famiglia. */
function canonical(v: PVis): PVis {
  const vis = visualOf(v.type, v.variant);
  return vis.type === v.type && vis.variant === v.variant ? v : { ...v, ...vis };
}

export function placeableKey(v: PVis): string {
  v = canonical(v);
  return `p:${v.type}:${v.variant}:${v.seed}:${+v.dirty}${+v.broken}${+v.lit}${v.corner ? ':L' : ''}`;
}
