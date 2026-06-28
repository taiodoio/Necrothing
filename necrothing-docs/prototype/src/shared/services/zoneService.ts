// Distretti tematici AUTO-RILEVATI: non si disegnano a mano. Il gioco trova i
// gruppi di tombe coerenti dello stesso tema, vicine tra loro, e ne ricava una
// zona (rettangolo che le racchiude). Le zone sono stato DERIVATO da `graves`:
// nessuna persistenza, ricalcolate quando le tombe cambiano.

import type { Grave, Zone } from '@/shared/domain/types';
import { GRAVE_FOOTPRINT } from '@/shared/domain/types';
import { ZONE_THEMES, type ZoneTheme } from '@/shared/domain/enums';
import { DISTRICT } from '@/shared/domain/balance';

/** Una tomba è coerente col tema della zona? */
export function graveFitsTheme(grave: Grave, theme: ZoneTheme): boolean {
  switch (theme) {
    case 'gothic':
      return ['gothic', 'angel', 'obelisk', 'broken'].includes(grave.graveType);
    case 'natural':
      return grave.category === 'plants' || grave.graveType === 'wood_cross';
    case 'tech':
      return grave.category === 'electronics' || grave.category === 'household';
    default:
      return false;
  }
}

function chebyshev(a: Grave, b: Grave): number {
  return Math.max(Math.abs(a.gridX - b.gridX), Math.abs(a.gridY - b.gridY));
}

/** Componenti connesse: tombe collegate se entro `adjacency` celle. */
function connectedComponents(graves: Grave[], adjacency: number): Grave[][] {
  const remaining = [...graves];
  const comps: Grave[][] = [];
  while (remaining.length > 0) {
    const seed = remaining.pop()!;
    const comp = [seed];
    const queue = [seed];
    while (queue.length > 0) {
      const cur = queue.pop()!;
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (chebyshev(cur, remaining[i]) <= adjacency) {
          const [g] = remaining.splice(i, 1);
          comp.push(g);
          queue.push(g);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

function boundingZone(theme: ZoneTheme, graves: Grave[]): Zone {
  const [fw, fh] = GRAVE_FOOTPRINT;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const g of graves) {
    minX = Math.min(minX, g.gridX);
    minY = Math.min(minY, g.gridY);
    maxX = Math.max(maxX, g.gridX + fw);
    maxY = Math.max(maxY, g.gridY + fh);
  }
  return {
    id: `district-${theme}-${minX}-${minY}`,
    theme,
    gridX: minX,
    gridY: minY,
    w: maxX - minX,
    h: maxY - minY,
    createdAt: '',
  };
}

/**
 * Rileva i distretti tematici a partire dalle tombe. Per ogni tema, raggruppa
 * le tombe coerenti vicine e crea una zona se il gruppo raggiunge la soglia.
 */
export function detectDistricts(graves: Grave[]): Zone[] {
  const zones: Zone[] = [];
  for (const theme of ZONE_THEMES) {
    const coherent = graves.filter((g) => graveFitsTheme(g, theme));
    for (const comp of connectedComponents(coherent, DISTRICT.adjacency)) {
      if (comp.length >= DISTRICT.minGraves) zones.push(boundingZone(theme, comp));
    }
  }
  return zones;
}

/** Punteggio prestigio dato dai distretti (tombe coerenti × peso). */
export function zoneScore(zones: Zone[]): number {
  // Ogni distretto vale per la sua dimensione: w*h celle / footprint.
  return zones.reduce((s, z) => s + 5 + Math.floor((z.w * z.h) / 4), 0);
}

/** Temi dei distretti attualmente presenti. */
export function activeThemes(zones: Zone[]): Set<ZoneTheme> {
  return new Set(zones.map((z) => z.theme));
}
