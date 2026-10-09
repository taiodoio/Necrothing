// Geometria logica del mondo: area recintata (espansione), occupazione delle
// celle, piazzabilità e camminabilità. Nessuna dipendenza da three/DOM.

import { EXPANSION, GRAVE_FOOTPRINT, MAP_SIZE, MAUSOLEUM_PRESTIGE, DISTRICT } from './balance.ts';
import { CATALOG, rotatedFootprint } from './catalog.ts';
import type { Grave, Placed, SaveData } from './state.ts';

export interface Rect { x: number; y: number; w: number; h: number }

export function expansionFor(prestige: number) {
  let level = 0;
  for (let i = 0; i < EXPANSION.length; i++) if (prestige >= EXPANSION[i].minPrestige) level = i;
  const tier = EXPANSION[level];
  const next = EXPANSION[level + 1] ?? null;
  return {
    level,
    size: tier.size,
    label: tier.label,
    next,
    toNext: next ? Math.max(0, next.minPrestige - prestige) : 0,
  };
}

/**
 * Rettangolo recintato (in celle) per un livello di espansione, centrato.
 * Il livello è salvato e non scende mai: se il prestigio cala il recinto
 * resta dov'è (nessun oggetto finisce "fuori").
 */
export function areaForLevel(level: number): Rect {
  const size = EXPANSION[Math.max(0, Math.min(EXPANSION.length - 1, level))].size;
  const o = Math.floor((MAP_SIZE - size) / 2);
  return { x: o, y: o, w: size, h: size };
}

export function footprintOf(entity: Grave | Placed): [number, number] {
  if ('graveType' in entity) return GRAVE_FOOTPRINT;
  return rotatedFootprint(entity.type, entity.rot);
}

export function cellsOf(x: number, y: number, [w, h]: [number, number]): string[] {
  const out: string[] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push(`${x + dx},${y + dy}`);
  return out;
}

export interface Occupancy {
  /** cella → id dell'entità che la occupa */
  owner: Map<string, string>;
  /** celle che bloccano il cammino del Custode */
  blocked: Set<string>;
}

export function buildOccupancy(state: Pick<SaveData, 'graves' | 'placeables'>, excludeId?: string): Occupancy {
  const owner = new Map<string, string>();
  const blocked = new Set<string>();
  for (const g of state.graves) {
    if (g.id === excludeId) continue;
    for (const c of cellsOf(g.x, g.y, GRAVE_FOOTPRINT)) { owner.set(c, g.id); blocked.add(c); }
  }
  for (const p of state.placeables) {
    if (p.id === excludeId) continue;
    const def = CATALOG[p.type];
    if (!def) continue;
    for (const c of cellsOf(p.x, p.y, rotatedFootprint(p.type, p.rot))) {
      owner.set(c, p.id);
      if (!def.walkable) blocked.add(c);
    }
  }
  return { owner, blocked };
}

/** Un ingombro è posabile? Dentro l'area recintata e su celle libere. */
export function canPlaceAt(
  x: number, y: number, fp: [number, number], occ: Occupancy, area: Rect,
): boolean {
  if (x < area.x || y < area.y || x + fp[0] > area.x + area.w || y + fp[1] > area.y + area.h) return false;
  return cellsOf(x, y, fp).every((c) => !occ.owner.has(c));
}

/** Cella libera più vicina a (cx,cy) per un ingombro (ricerca a spirale). */
export function nearestFreeSpot(
  cx: number, cy: number, fp: [number, number], occ: Occupancy, area: Rect,
): { x: number; y: number } | null {
  const sx = Math.round(cx - fp[0] / 2);
  const sy = Math.round(cy - fp[1] / 2);
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (canPlaceAt(sx + dx, sy + dy, fp, occ, area)) return { x: sx + dx, y: sy + dy };
      }
    }
  }
  return null;
}

/** Celle del recinto (perimetro) e del cancello a sud. */
export function gateCells(area: Rect): Set<string> {
  const gx = area.x + Math.floor(area.w / 2) - 1;
  const y = area.y + area.h - 1;
  return new Set([`${gx},${y}`, `${gx + 1},${y}`, `${gx - 1},${y}`]);
}

// ── Prestigio & distretti ───────────────────────────────────────────────

export type DistrictTheme = 'gothic' | 'natural' | 'tech';
export const DISTRICT_LABELS: Record<DistrictTheme, string> = {
  gothic: 'Quartiere Gotico',
  natural: 'Boschetto Naturale',
  tech: 'Settore Tecnologico',
};

export function graveFitsTheme(g: Grave, theme: DistrictTheme): boolean {
  if (theme === 'gothic') return ['gothic', 'angel', 'obelisk', 'victorian'].includes(g.graveType);
  if (theme === 'natural') return g.category === 'plants' || g.graveType === 'celtic_cross';
  return g.category === 'electronics' || g.category === 'household';
}

export interface District { theme: DistrictTheme; graves: number; rect: Rect }

export function detectDistricts(graves: Grave[]): District[] {
  const out: District[] = [];
  for (const theme of ['gothic', 'natural', 'tech'] as DistrictTheme[]) {
    const remaining = graves.filter((g) => graveFitsTheme(g, theme));
    while (remaining.length) {
      const comp = [remaining.pop()!];
      const queue = [comp[0]];
      while (queue.length) {
        const cur = queue.pop()!;
        for (let i = remaining.length - 1; i >= 0; i--) {
          const o = remaining[i];
          if (Math.max(Math.abs(o.x - cur.x), Math.abs(o.y - cur.y)) <= DISTRICT.adjacency) {
            comp.push(o); queue.push(o); remaining.splice(i, 1);
          }
        }
      }
      if (comp.length >= DISTRICT.minGraves) {
        const minX = Math.min(...comp.map((g) => g.x)), minY = Math.min(...comp.map((g) => g.y));
        const maxX = Math.max(...comp.map((g) => g.x + 2)), maxY = Math.max(...comp.map((g) => g.y + 2));
        out.push({ theme, graves: comp.length, rect: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } });
      }
    }
  }
  return out;
}

export function computePrestige(state: Pick<SaveData, 'graves' | 'placeables'>): number {
  const graves = state.graves;
  const decorative = state.placeables.filter((p) => !['path_stone', 'path_dirt', 'shop'].includes(p.type));
  const flowerScore = graves.filter((g) => g.hasFlowers).length * 2;
  const cleanScore = graves.filter((g) => !g.weeds && !g.dirty && !g.broken).length;
  const variety = new Set(graves.map((g) => g.category)).size * 3;
  const mausoleum = state.placeables.some((p) => p.type === 'mausoleum') ? MAUSOLEUM_PRESTIGE : 0;
  const districts = detectDistricts(graves).reduce((s, d) => s + 5 + d.graves, 0);
  const brokenPenalty = state.placeables.filter((p) => p.broken).length;
  return Math.max(0, graves.length * 2 + flowerScore + decorative.length * 2 + cleanScore + variety + mausoleum + districts - brokenPenalty);
}
