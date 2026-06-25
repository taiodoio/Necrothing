import { getDb } from '@/shared/db/schema';
import type { Achievement } from '@/shared/domain/types';

export const achievementsRepository = {
  async getAll(): Promise<Achievement[]> {
    const db = await getDb();
    return db.getAll('achievements');
  },

  async add(achievement: Achievement): Promise<void> {
    const db = await getDb();
    await db.put('achievements', achievement);
  },
};
