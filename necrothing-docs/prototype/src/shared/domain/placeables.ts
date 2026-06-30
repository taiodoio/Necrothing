// Registry degli oggetti piazzabili (decorazioni + strutture) con footprint
// (in celle), costo in fuochi fatui e rango minimo di sblocco.
// Più utility di occupazione della griglia (footprint multi-cella).

import {
  DECORATION_LABELS,
  DECORATION_MIN_RANK,
  DECORATION_TYPES,
  STRUCTURE_LABELS,
  STRUCTURE_TYPES,
  EXTRA_PLACEABLE_TYPES,
  EXTRA_PLACEABLE_LABELS,
  EXTRA_PLACEABLE_CATEGORY,
  type DecorationType,
  type StructureType,
  type ExtraPlaceableType,
  type PlaceableCategory,
  type PlaceableType,
} from './enums';
import { GRAVE_FOOTPRINT, type Decoration, type Grave } from './types';

export type Footprint = [number, number]; // [larghezza, altezza]

export interface PlaceableDef {
  kind: 'decoration' | 'structure';
  category: PlaceableCategory;
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
const STRUCT_FOOTPRINT: Record<string, Footprint> = {
  mausoleum: [3, 3],
};
const STRUCT_COST: Record<string, number> = {
  path_dirt: 2,
  path_stone: 4,
  fence_wood: 3,
  fence_iron: 5,
  wall_stone: 6,
  lamp_post: 8,
  mausoleum: 40,
};
const STRUCT_MIN_RANK: Record<string, number> = {
  path_dirt: 1,
  fence_wood: 1,
  path_stone: 2,
  fence_iron: 2,
  wall_stone: 2,
  lamp_post: 3,
  mausoleum: 5,
};

// Default di catalogo per gli elementi estesi (Fase D), per categoria.
const EXTRA_DEFAULTS: Record<PlaceableCategory, { cost: number; minRank: number }> = {
  light: { cost: 6, minRank: 2 },
  decoration: { cost: 8, minRank: 2 },
  structure: { cost: 35, minRank: 4 },
  ambient: { cost: 3, minRank: 1 },
  npc: { cost: 30, minRank: 4 },
};
const EXTRA_FOOTPRINT: Partial<Record<ExtraPlaceableType, Footprint>> = {
  well: [2, 2],
  fountain: [2, 2],
  gravedigger_house: [2, 2],
  shrine: [2, 2],
};

function decoDef(t: DecorationType): PlaceableDef {
  return {
    kind: 'decoration',
    category: 'decoration',
    label: DECORATION_LABELS[t],
    footprint: DECO_FOOTPRINT[t] ?? [1, 1],
    cost: DECO_COST[t],
    minRank: DECORATION_MIN_RANK[t],
  };
}
function structDef(t: StructureType): PlaceableDef {
  return {
    kind: 'structure',
    category: 'structure',
    label: STRUCTURE_LABELS[t],
    footprint: STRUCT_FOOTPRINT[t] ?? [1, 1],
    cost: STRUCT_COST[t],
    minRank: STRUCT_MIN_RANK[t],
  };
}
function extraDef(t: ExtraPlaceableType): PlaceableDef {
  const category = EXTRA_PLACEABLE_CATEGORY[t];
  const d = EXTRA_DEFAULTS[category];
  return {
    kind: category === 'structure' ? 'structure' : 'decoration',
    category,
    label: EXTRA_PLACEABLE_LABELS[t],
    footprint: EXTRA_FOOTPRINT[t] ?? [1, 1],
    cost: d.cost,
    minRank: d.minRank,
  };
}

export const PLACEABLES: Record<PlaceableType, PlaceableDef> = (() => {
  const out = {} as Record<PlaceableType, PlaceableDef>;
  for (const t of DECORATION_TYPES) out[t] = decoDef(t);
  for (const t of STRUCTURE_TYPES) out[t] = structDef(t);
  for (const t of EXTRA_PLACEABLE_TYPES) out[t] = extraDef(t);
  return out;
})();

/**
 * Strutture uniche: possono essere acquistate e piazzate al massimo una volta.
 * Tentare di acquistarne una seconda volta restituisce l'oggetto già posseduto
 * senza addebitare fuochi fatui (logica in gameStore.buyItem).
 */
export const UNIQUE_PLACEABLES: ReadonlySet<PlaceableType> = new Set<PlaceableType>([
  'mausoleum',
  'gravedigger_house',
  'shrine',
  'well',
  'fountain',
]);

/** Ritorna true se l'oggetto può essere acquistato una sola volta. */
export function isUnique(type: PlaceableType): boolean {
  return UNIQUE_PLACEABLES.has(type);
}

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
