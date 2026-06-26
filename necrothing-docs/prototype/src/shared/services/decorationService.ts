// Servizio placeable: posizionamento di decorazioni e strutture sulla mappa.
// Gestisce sblocco per rango e occupazione multi-cella. Il costo in fuochi
// fatui è dichiarato nel registry e la spesa è applicata dallo store.

import { PLACEABLE_TYPES, type PlaceableType } from '@/shared/domain/enums';
import type { Decoration } from '@/shared/domain/types';
import { MAP_COLS, MAP_ROWS } from '@/shared/domain/types';
import { PLACEABLES, buildOccupancy, canPlace } from '@/shared/domain/placeables';
import { decorationsRepository } from '@/shared/repositories/decorationsRepository';
import { graveRepository } from '@/shared/repositories/graveRepository';
import { newId } from '@/shared/utils/id';
import type { ClockService } from '@/shared/utils/clock';

export class DecorationError extends Error {}

/** Placeable sbloccati per un dato rango. */
export function unlockedPlaceables(rankLevel: number): PlaceableType[] {
  return PLACEABLE_TYPES.filter((t) => PLACEABLES[t].minRank <= rankLevel);
}

export const decorationService = {
  async list(): Promise<Decoration[]> {
    return decorationsRepository.getAll();
  },

  async place(
    type: PlaceableType,
    gridX: number,
    gridY: number,
    rankLevel: number,
    clock: ClockService,
  ): Promise<Decoration> {
    const def = PLACEABLES[type];
    if (def.minRank > rankLevel) {
      throw new DecorationError('Elemento non ancora sbloccato.');
    }
    const graves = await graveRepository.getAll();
    const placeables = await decorationsRepository.getAll();
    const occupancy = buildOccupancy(graves, placeables);
    if (!canPlace(gridX, gridY, def.footprint, occupancy, MAP_COLS, MAP_ROWS)) {
      throw new DecorationError('Spazio non disponibile per questo elemento.');
    }
    const decoration: Decoration = { id: newId(), type, gridX, gridY, createdAt: clock.nowIso() };
    await decorationsRepository.create(decoration);
    return decoration;
  },

  async remove(id: string): Promise<void> {
    await decorationsRepository.remove(id);
  },

  /** Sposta un placeable su una nuova posizione (footprint invariato). */
  async move(id: string, gridX: number, gridY: number): Promise<Decoration> {
    const current = await decorationsRepository.get(id);
    if (!current) throw new DecorationError('Elemento inesistente.');
    const def = PLACEABLES[current.type];
    const graves = await graveRepository.getAll();
    const others = (await decorationsRepository.getAll()).filter((p) => p.id !== id);
    const occupancy = buildOccupancy(graves, others);
    if (!canPlace(gridX, gridY, def.footprint, occupancy, MAP_COLS, MAP_ROWS)) {
      throw new DecorationError('Spazio non disponibile.');
    }
    const moved: Decoration = { ...current, gridX, gridY };
    await decorationsRepository.update(moved);
    return moved;
  },

  /** Ruota di 90° un placeable (toggle 0/90). */
  async rotate(id: string): Promise<Decoration> {
    const current = await decorationsRepository.get(id);
    if (!current) throw new DecorationError('Elemento inesistente.');
    const rotated: Decoration = { ...current, rotation: current.rotation === 90 ? 0 : 90 };
    await decorationsRepository.update(rotated);
    return rotated;
  },

  /** Cambia il tipo di un placeable (richiede footprint compatibile, gratis). */
  async changeType(id: string, newType: PlaceableType): Promise<Decoration> {
    const current = await decorationsRepository.get(id);
    if (!current) throw new DecorationError('Elemento inesistente.');
    const def = PLACEABLES[newType];
    const graves = await graveRepository.getAll();
    const others = (await decorationsRepository.getAll()).filter((p) => p.id !== id);
    const occupancy = buildOccupancy(graves, others);
    if (!canPlace(current.gridX, current.gridY, def.footprint, occupancy, MAP_COLS, MAP_ROWS)) {
      throw new DecorationError('Il nuovo elemento non entra in questo spazio.');
    }
    const changed: Decoration = { ...current, type: newType };
    await decorationsRepository.update(changed);
    return changed;
  },
};
