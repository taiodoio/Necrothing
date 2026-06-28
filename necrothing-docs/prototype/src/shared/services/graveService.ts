// Servizio di dominio per le tombe: sepoltura, commemorazione, manutenzione.
// Orchestrazione dati + memory events + XP. Lo scheduling notifiche è gestito
// dal livello use-case (store) per evitare dipendenze circolari.

import { graveRepository, memoryEventRepository } from '@/shared/repositories/graveRepository';
import { decorationsRepository } from '@/shared/repositories/decorationsRepository';
import { GRAVE_FOOTPRINT, MAP_COLS, MAP_ROWS } from '@/shared/domain/types';
import type { Grave, GraveMemoryEvent } from '@/shared/domain/types';
import { buildOccupancy, canPlace } from '@/shared/domain/placeables';
import type { BurialDraft } from '@/features/burial/validation';
import { validateBurial } from '@/features/burial/validation';
import { XP_VALUES } from './progressionService';
import { newId } from '@/shared/utils/id';
import type { ClockService } from '@/shared/utils/clock';
import type { Category, DeathCause, GraveType } from '@/shared/domain/enums';

export class BurialError extends Error {}

/**
 * Tombe entro un raggio (Chebyshev) da una cella, considerando il footprint
 * 2×2. Pura: usata dal becchino per la pulizia ad area (Fase G).
 */
export function gravesWithinRadius(
  graves: Grave[],
  x: number,
  y: number,
  radius: number,
): Grave[] {
  return graves.filter((g) => {
    const dx = Math.max(g.gridX - x, 0, x - (g.gridX + GRAVE_FOOTPRINT[0] - 1));
    const dy = Math.max(g.gridY - y, 0, y - (g.gridY + GRAVE_FOOTPRINT[1] - 1));
    return Math.max(dx, dy) <= radius;
  });
}

export interface BuryResult {
  grave: Grave;
  xpAwarded: number;
}

function memoryEvent(
  graveId: string,
  type: GraveMemoryEvent['type'],
  clock: ClockService,
  payload?: unknown,
): GraveMemoryEvent {
  return {
    id: newId(),
    graveId,
    type,
    occurredAt: clock.nowIso(),
    payloadJson: payload ? JSON.stringify(payload) : null,
  };
}

export const graveService = {
  async bury(draft: BurialDraft, clock: ClockService): Promise<BuryResult> {
    const errors = validateBurial(draft, clock.now());
    if (Object.keys(errors).length > 0) {
      throw new BurialError('Dati sepoltura non validi.');
    }
    const graves = await graveRepository.getAll();
    const placeables = await decorationsRepository.getAll();
    const occupancy = buildOccupancy(graves, placeables);
    if (!canPlace(draft.gridX!, draft.gridY!, GRAVE_FOOTPRINT, occupancy, MAP_COLS, MAP_ROWS)) {
      throw new BurialError('Spazio non disponibile: servono 2×2 celle libere.');
    }

    const now = clock.nowIso();
    const grave: Grave = {
      id: newId(),
      name: draft.name.trim(),
      category: draft.category as Category,
      birthDate: draft.birthDate,
      deathDate: draft.deathDate!,
      deathCause: (draft.deathCause ?? draft.deathCauseCustom) as DeathCause,
      epitaph: draft.epitaph?.trim() || null,
      photoId: draft.photoId,
      graveType: (draft.graveType ?? 'wood_cross') as GraveType,
      gridX: draft.gridX!,
      gridY: draft.gridY!,
      hasFlowers: false,
      flowersUpdatedAt: null,
      hasWeeds: false,
      isDirty: false,
      dirtySince: null,
      broken: false,
      lastAnniversaryYear: null,
      createdAt: now,
      updatedAt: now,
    };

    await graveRepository.create(grave);
    await memoryEventRepository.add(memoryEvent(grave.id, 'burial', clock));

    const xpAwarded =
      grave.category === 'abstract' ? XP_VALUES.burialAbstract : XP_VALUES.burialPhysical;
    return { grave, xpAwarded };
  },

  /** Porta fiori su una tomba. Ritorna XP ottenuti (0 se già fioriti oggi). */
  async bringFlowers(graveId: string, clock: ClockService): Promise<{ grave: Grave; xpAwarded: number }> {
    const grave = await graveRepository.getById(graveId);
    if (!grave) throw new BurialError('Tomba inesistente.');

    const today = clock.todayIso();
    const alreadyToday = grave.flowersUpdatedAt?.slice(0, 10) === today && grave.hasFlowers;

    const updated: Grave = {
      ...grave,
      hasFlowers: true,
      flowersUpdatedAt: clock.nowIso(),
      updatedAt: clock.nowIso(),
    };
    await graveRepository.update(updated);

    if (alreadyToday) return { grave: updated, xpAwarded: 0 };
    await memoryEventRepository.add(memoryEvent(graveId, 'flower', clock));
    return { grave: updated, xpAwarded: XP_VALUES.flowers };
  },

  /** Pulisce erbacce e sporcizia. Bloccata se la tomba è rotta (serve riparare). */
  async cleanWeeds(graveId: string, clock: ClockService): Promise<{ grave: Grave; xpAwarded: number }> {
    const grave = await graveRepository.getById(graveId);
    if (!grave) throw new BurialError('Tomba inesistente.');
    if (grave.broken) throw new BurialError('La tomba è rotta: va prima riparata.');
    if (!grave.hasWeeds && !grave.isDirty) return { grave, xpAwarded: 0 };

    const updated: Grave = {
      ...grave,
      hasWeeds: false,
      isDirty: false,
      dirtySince: null,
      updatedAt: clock.nowIso(),
    };
    await graveRepository.update(updated);
    await memoryEventRepository.add(memoryEvent(graveId, 'weed_cleaned', clock));
    return { grave: updated, xpAwarded: XP_VALUES.weedCleaned };
  },

  /** Ripara una tomba rotta: la rimette a posto (pulisce anche). */
  async repair(graveId: string, clock: ClockService): Promise<Grave> {
    const grave = await graveRepository.getById(graveId);
    if (!grave) throw new BurialError('Tomba inesistente.');
    if (!grave.broken) return grave;
    const updated: Grave = {
      ...grave,
      broken: false,
      isDirty: false,
      hasWeeds: false,
      dirtySince: null,
      updatedAt: clock.nowIso(),
    };
    await graveRepository.update(updated);
    await memoryEventRepository.add(memoryEvent(graveId, 'weed_cleaned', clock));
    return updated;
  },

  /**
   * Pulizia ad area del becchino: pulisce gratis tutte le tombe vicine (con
   * erbacce o sporche, non rotte) entro `radius`. Ritorna il numero di tombe
   * effettivamente ripulite.
   */
  async cleanNearby(
    x: number,
    y: number,
    radius: number,
    clock: ClockService,
  ): Promise<number> {
    const graves = await graveRepository.getAll();
    const near = gravesWithinRadius(graves, x, y, radius).filter(
      (g) => !g.broken && (g.hasWeeds || g.isDirty),
    );
    for (const g of near) {
      const updated: Grave = {
        ...g,
        hasWeeds: false,
        isDirty: false,
        dirtySince: null,
        updatedAt: clock.nowIso(),
      };
      await graveRepository.update(updated);
      await memoryEventRepository.add(memoryEvent(g.id, 'weed_cleaned', clock));
    }
    return near.length;
  },

  /** Registra un evento qualunque sulla timeline della tomba. */
  async recordEvent(
    graveId: string,
    type: GraveMemoryEvent['type'],
    clock: ClockService,
  ): Promise<void> {
    const grave = await graveRepository.getById(graveId);
    if (!grave) return;
    await memoryEventRepository.add(memoryEvent(graveId, type, clock));
  },

  /** Sposta una tomba su una nuova cella (footprint 2×2). */
  async move(graveId: string, gridX: number, gridY: number, clock: ClockService): Promise<Grave> {
    const grave = await graveRepository.getById(graveId);
    if (!grave) throw new BurialError('Tomba inesistente.');
    const graves = (await graveRepository.getAll()).filter((g) => g.id !== graveId);
    const placeables = await decorationsRepository.getAll();
    const occupancy = buildOccupancy(graves, placeables);
    if (!canPlace(gridX, gridY, GRAVE_FOOTPRINT, occupancy, MAP_COLS, MAP_ROWS)) {
      throw new BurialError('Spazio non disponibile: servono 2×2 celle libere.');
    }
    const moved: Grave = { ...grave, gridX, gridY, updatedAt: clock.nowIso() };
    await graveRepository.update(moved);
    return moved;
  },

  async remove(graveId: string): Promise<void> {
    await graveRepository.remove(graveId);
  },

  async listGraves(): Promise<Grave[]> {
    return graveRepository.getAll();
  },

  async listEvents(graveId: string): Promise<GraveMemoryEvent[]> {
    return memoryEventRepository.listByGrave(graveId);
  },
};
