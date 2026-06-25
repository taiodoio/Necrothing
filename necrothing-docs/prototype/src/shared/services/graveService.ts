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

  /** Rimuove le erbacce. XP solo se presenti. */
  async cleanWeeds(graveId: string, clock: ClockService): Promise<{ grave: Grave; xpAwarded: number }> {
    const grave = await graveRepository.getById(graveId);
    if (!grave) throw new BurialError('Tomba inesistente.');
    if (!grave.hasWeeds) return { grave, xpAwarded: 0 };

    const updated: Grave = { ...grave, hasWeeds: false, updatedAt: clock.nowIso() };
    await graveRepository.update(updated);
    await memoryEventRepository.add(memoryEvent(graveId, 'weed_cleaned', clock));
    return { grave: updated, xpAwarded: XP_VALUES.weedCleaned };
  },

  async listGraves(): Promise<Grave[]> {
    return graveRepository.getAll();
  },

  async listEvents(graveId: string): Promise<GraveMemoryEvent[]> {
    return memoryEventRepository.listByGrave(graveId);
  },
};
