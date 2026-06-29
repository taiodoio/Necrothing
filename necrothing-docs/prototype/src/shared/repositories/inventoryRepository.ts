import { getDb } from '@/shared/db/schema';
import type { InventoryItem } from '@/shared/domain/types';
import type { PlaceableType } from '@/shared/domain/enums';

export const inventoryRepository = {
  async getAll(): Promise<InventoryItem[]> {
    const db = await getDb();
    return db.getAll('inventory');
  },

  async get(type: PlaceableType): Promise<InventoryItem | undefined> {
    const db = await getDb();
    return db.get('inventory', type);
  },

  async save(item: InventoryItem): Promise<void> {
    const db = await getDb();
    await db.put('inventory', item);
  },
};
