import { getDb } from '@/shared/db/schema';
import type { Settings } from '@/shared/domain/types';

export const settingsRepository = {
  async get(): Promise<Settings | undefined> {
    const db = await getDb();
    return db.get('settings', 'singleton');
  },

  async save(settings: Settings): Promise<void> {
    const db = await getDb();
    await db.put('settings', settings);
  },
};
