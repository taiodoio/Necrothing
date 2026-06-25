import { getDb } from '@/shared/db/schema';
import type { StoredImage } from '@/shared/domain/types';

export const imagesRepository = {
  async get(id: string): Promise<StoredImage | undefined> {
    const db = await getDb();
    return db.get('images', id);
  },

  async save(image: StoredImage): Promise<void> {
    const db = await getDb();
    await db.put('images', image);
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('images', id);
  },

  async getAll(): Promise<StoredImage[]> {
    const db = await getDb();
    return db.getAll('images');
  },
};
