// Servizio Inventario (modello buy-to-own): possesso degli oggetti piazzabili.
// La spesa/rimborso in fuochi fatui è applicata dallo store (che possiede la
// progression); qui si gestisce solo la quantità posseduta.

import type { PlaceableType } from '@/shared/domain/enums';
import { PLACEABLES } from '@/shared/domain/placeables';
import { ECONOMY } from '@/shared/domain/balance';
import { inventoryRepository } from '@/shared/repositories/inventoryRepository';

export type InventoryMap = Partial<Record<PlaceableType, number>>;

export const inventoryService = {
  async getMap(): Promise<InventoryMap> {
    const items = await inventoryRepository.getAll();
    const map: InventoryMap = {};
    for (const it of items) map[it.type] = it.owned;
    return map;
  },

  async owned(type: PlaceableType): Promise<number> {
    return (await inventoryRepository.get(type))?.owned ?? 0;
  },

  /** Modifica la quantità posseduta (clamp a 0). Ritorna il nuovo valore. */
  async add(type: PlaceableType, delta: number): Promise<number> {
    const current = (await inventoryRepository.get(type))?.owned ?? 0;
    const owned = Math.max(0, current + delta);
    await inventoryRepository.save({ type, owned });
    return owned;
  },
};

/** Prezzo di vendita (rimborso) per un tipo. */
export function sellPrice(type: PlaceableType): number {
  return Math.round(PLACEABLES[type].cost * ECONOMY.sellRefund);
}
