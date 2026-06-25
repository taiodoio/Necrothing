import { getDb } from '@/shared/db/schema';
import type { WorldState } from '@/shared/domain/types';

const KEY = 'singleton';

export const worldRepository = {
  async get(): Promise<WorldState | undefined> {
    const db = await getDb();
    return db.get('world', KEY);
  },

  async save(world: WorldState): Promise<void> {
    const db = await getDb();
    await db.put('world', world);
  },
};
