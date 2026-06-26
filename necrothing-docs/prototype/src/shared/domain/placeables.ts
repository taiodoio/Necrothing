// Registry degli oggetti piazzabili (decorazioni + strutture) con footprint
// (in celle), costo in fuochi fatui e rango minimo di sblocco.
// Più utility di occupazione della griglia (footprint multi-cella).

import {
  DECORATION_LABELS,
  DECORATION_MIN_RANK,
  STRUCTURE_LABELS,
  type PlaceableType,
} from './enums';
import { GRAVE_FOOTPRINT, type Decoration, type Grave } from './types';

export type Footprint = [number, number]; // [larghezza, altezza]

export interface PlaceableDef {
  kind: 'decoration' | 'structure';
  label: string;
  footprint: Footprint;
  cost: number; // fuochi fatui
  minRank: number;
}

const DECO_FOOTPRINT: Record<string, Footprint> = {
  willow: [2, 2],
};
const DECO_COST: Record<string, number> = {
  candle: 3,
  wreath: 5,
  mushroom: 4,
  dead_tree: 8,
  skull: 6,
  lantern: 7,
  willow: 12,
};
const STRUCT_FOOTPRINT: Record<string, Footprint> = {};
const STRUCT_COST: Record<string, number> = {
  path_dirt: 2,
  path_stone: 4,
  fence_wood: 3,
  fence_iron: 5,
  wall_stone: 6,
  lamp_post: 8,
};
const STRUCT_MIN_RANK: Record<string, number> = {
  path_dirt: 1,
  fence_wood: 1,
  path_stone: 2,
  fence_iron: 2,
  wall_stone: 2,
  lamp_post: 3,
};

export const PLACEABLES: Record<PlaceableType, PlaceableDef> = {
  // decorazioni
  candle: { kind: 'decoration', label: DECORATION_LABELS.candle, footprint: [1, 1], cost: DECO_COST.candle, minRank: DECORATION_MIN_RANK.candle },
  wreath: { kind: 'decoration', label: DECORATION_LABELS.wreath, footprint: [1, 1], cost: DECO_COST.wreath, minRank: DECORATION_MIN_RANK.wreath },
  mushroom: { kind: 'decoration', label: DECORATION_LABELS.mushroom, footprint: [1, 1], cost: DECO_COST.mushroom, minRank: DECORATION_MIN_RANK.mushroom },
  dead_tree: { kind: 'decoration', label: DECORATION_LABELS.dead_tree, footprint: [1, 1], cost: DECO_COST.dead_tree, minRank: DECORATION_MIN_RANK.dead_tree },
  skull: { kind: 'decoration', label: DECORATION_LABELS.skull, footprint: [1, 1], cost: DECO_COST.skull, minRank: DECORATION_MIN_RANK.skull },
  lantern: { kind: 'decoration', label: DECORATION_LABELS.lantern, footprint: [1, 1], cost: DECO_COST.lantern, minRank: DECORATION_MIN_RANK.lantern },
  willow: { kind: 'decoration', label: DECORATION_LABELS.willow, footprint: DECO_FOOTPRINT.willow, cost: DECO_COST.willow, minRank: DECORATION_MIN_RANK.willow },
  // strutture
  path_dirt: { kind: 'structure', label: STRUCTURE_LABELS.path_dirt, footprint: STRUCT_FOOTPRINT.path_dirt ?? [1, 1], cost: STRUCT_COST.path_dirt, minRank: STRUCT_MIN_RANK.path_dirt },
  path_stone: { kind: 'structure', label: STRUCTURE_LABELS.path_stone, footprint: [1, 1], cost: STRUCT_COST.path_stone, minRank: STRUCT_MIN_RANK.path_stone },
  fence_wood: { kind: 'structure', label: STRUCTURE_LABELS.fence_wood, footprint: [1, 1], cost: STRUCT_COST.fence_wood, minRank: STRUCT_MIN_RANK.fence_wood },
  fence_iron: { kind: 'structure', label: STRUCTURE_LABELS.fence_iron, footprint: [1, 1], cost: STRUCT_COST.fence_iron, minRank: STRUCT_MIN_RANK.fence_iron },
  wall_stone: { kind: 'structure', label: STRUCTURE_LABELS.wall_stone, footprint: [1, 1], cost: STRUCT_COST.wall_stone, minRank: STRUCT_MIN_RANK.wall_stone },
  lamp_post: { kind: 'structure', label: STRUCTURE_LABELS.lamp_post, footprint: [1, 1], cost: STRUCT_COST.lamp_post, minRank: STRUCT_MIN_RANK.lamp_post },
};

export function placeableDef(type: PlaceableType): PlaceableDef {
  return PLACEABLES[type];
}

/** Tipi che ha senso ruotare di 90° (elementi lineari). */
export const ROTATABLE: ReadonlySet<PlaceableType> = new Set<PlaceableType>([
  'fence_wood',
  'fence_iron',
  'wall_stone',
]);

export function isRotatable(type: PlaceableType): boolean {
  return ROTATABLE.has(type);
}

// ---- Occupazione griglia ----

export function footprintCells(x: number, y: number, [w, h]: Footprint): string[] {
  const cells: string[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) cells.push(`${x + dx},${y + dy}`);
  }
  return cells;
}

export function inBounds(
  x: number,
  y: number,
  [w, h]: Footprint,
  cols: number,
  rows: number,
): boolean {
  return x >= 0 && y >= 0 && x + w <= cols && y + h <= rows;
}

/** Insieme delle celle occupate da tombe (2×2) e placeable (footprint). */
export function buildOccupancy(graves: Grave[], placeables: Decoration[]): Set<string> {
  const set = new Set<string>();
  for (const g of graves) for (const c of footprintCells(g.gridX, g.gridY, GRAVE_FOOTPRINT)) set.add(c);
  for (const p of placeables) {
    for (const c of footprintCells(p.gridX, p.gridY, PLACEABLES[p.type].footprint)) set.add(c);
  }
  return set;
}

export function canPlace(
  x: number,
  y: number,
  footprint: Footprint,
  occupancy: ReadonlySet<string>,
  cols: number,
  rows: number,
): boolean {
  if (!inBounds(x, y, footprint, cols, rows)) return false;
  return footprintCells(x, y, footprint).every((c) => !occupancy.has(c));
}
