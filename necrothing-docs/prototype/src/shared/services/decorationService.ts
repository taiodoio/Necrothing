// Servizio decorazioni: posizionamento su celle libere, sblocco per rango.

import {
  DECORATION_MIN_RANK,
  DECORATION_TYPES,
  type DecorationType,
} from '@/shared/domain/enums';
import type { Decoration } from '@/shared/domain/types';
import { decorationsRepository } from '@/shared/repositories/decorationsRepository';
import { graveRepository } from '@/shared/repositories/graveRepository';
import { newId } from '@/shared/utils/id';
import type { ClockService } from '@/shared/utils/clock';

export class DecorationError extends Error {}

/** Decorazioni sbloccate per un dato rango. */
export function unlockedDecorations(rankLevel: number): DecorationType[] {
  return DECORATION_TYPES.filter((t) => DECORATION_MIN_RANK[t] <= rankLevel);
}

export const decorationService = {
  async list(): Promise<Decoration[]> {
    return decorationsRepository.getAll();
  },

  async place(
    type: DecorationType,
    gridX: number,
    gridY: number,
    rankLevel: number,
    clock: ClockService,
  ): Promise<Decoration> {
    if (DECORATION_MIN_RANK[type] > rankLevel) {
      throw new DecorationError('Decorazione non ancora sbloccata.');
    }
    if (await graveRepository.getByCell(gridX, gridY)) {
      throw new DecorationError('La cella è occupata da una tomba.');
    }
    if (await decorationsRepository.getByCell(gridX, gridY)) {
      throw new DecorationError('La cella ha già una decorazione.');
    }
    const decoration: Decoration = {
      id: newId(),
      type,
      gridX,
      gridY,
      createdAt: clock.nowIso(),
    };
    await decorationsRepository.create(decoration);
    return decoration;
  },

  async remove(id: string): Promise<void> {
    await decorationsRepository.remove(id);
  },
};
