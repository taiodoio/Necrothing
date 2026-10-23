// Geometria logica del mondo: area recintata (espansione), occupazione delle
// celle, piazzabilità e camminabilità. Nessuna dipendenza da three/DOM.

import { EXPANSION, GRAVE_FOOTPRINT, MAP_SIZE, MAUSOLEUM_PRESTIGE, DISTRICT } from './balance.ts';
import { CATALOG, rotatedFootprint } from './catalog.ts';
import type { Grave, Placed, SaveData } from './state.ts';
import { t } from '../i18n/index.ts';

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * Il recinto com'è davvero (dal salvataggio, non dal prestigio del momento:
 * il prestigio può calare, il recinto scelto resta): livello attivo,
 * livello sbloccato e prossima soglia da raggiungere.
 */
export function expansionStatus(s: SaveData) {
  const level = s.world.expansionLevel, unlocked = s.world.unlockedLevel;
  const next = EXPANSION[unlocked + 1] ?? null;
  return {
    level, unlocked,
    size: EXPANSION[level].size,
    label: EXPANSION[level].label,
    next,
    toNext: next ? Math.max(0, next.minPrestige - computePrestige(s)) : 0,
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
      if (!def.walkable && !(p.type === 'keeper_house' && houseYardCell(p, c))) blocked.add(c);
    }
  }
  return { owner, blocked };
}

/**
 * Casa del Custode: nel cortile si entra dal cancelletto e si arriva alla porta
 * lungo il vialetto (le due colonne centrali delle due file davanti); la
 * casetta, le aiuole e l'orto restano da non calpestare.
 */
export function houseYardCell(p: Pick<Placed, 'x' | 'y'>, cell: string): boolean {
  const [x, y] = cell.split(',').map(Number);
  const col = x - p.x, row = y - p.y;
  return row >= 2 && col >= 1 && col <= 2;
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
  gothic: t('district.gothic'),
  natural: t('district.natural'),
  tech: t('district.tech'),
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

/** Staccionate, inferriate e muretti: dove due tratti si incontrano nasce un pezzo d'angolo. */
export const CORNERED = new Set(['fence_wood', 'fence_iron', 'wall_stone']);

/**
 * Pezzi d'angolo e loro rotazione: un pezzo con un solo vicino orizzontale
 * (rot pari) a ovest o a est e un solo vicino verticale (rot dispari) a nord o
 * a sud, dello stesso tipo, diventa una L girata verso i due vicini.
 * Rotazione 0 = ovest+sud, 1 = nord+ovest, 2 = est+nord, 3 = sud+est (y cresce verso sud).
 */
export function fenceCorners(placeables: readonly Placed[]): Map<string, number> {
  const at = new Map<string, Placed>();
  for (const p of placeables) if (CORNERED.has(p.type)) at.set(`${p.x},${p.y}`, p);
  const out = new Map<string, number>();
  for (const p of at.values()) {
    const along = (dx: number, dy: number, odd: boolean) => {
      const q = at.get(`${p.x + dx},${p.y + dy}`);
      return !!q && q.type === p.type && (q.rot % 2 === 1) === odd;
    };
    const w = along(-1, 0, false), e = along(1, 0, false), n = along(0, -1, true), s = along(0, 1, true);
    if (+w + +e !== 1 || +n + +s !== 1) continue;
    out.set(p.id, w && s ? 0 : n && w ? 1 : e && n ? 2 : 3);
  }
  return out;
}
