import { getDb } from '@/shared/db/schema';
import type { UserProgression } from '@/shared/domain/types';

export const progressionRepository = {
  async get(): Promise<UserProgression | undefined> {
    const db = await getDb();
    return db.get('progression', 'singleton');
  },

  async save(progression: UserProgression): Promise<void> {
    const db = await getDb();
    await db.put('progression', progression);
  },
};
