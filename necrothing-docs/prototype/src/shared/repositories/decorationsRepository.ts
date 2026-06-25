import { getDb } from '@/shared/db/schema';
import type { Decoration } from '@/shared/domain/types';

export const decorationsRepository = {
  async getAll(): Promise<Decoration[]> {
    const db = await getDb();
    return db.getAll('decorations');
  },

  async getByCell(gridX: number, gridY: number): Promise<Decoration | undefined> {
    const db = await getDb();
    return db.getFromIndex('decorations', 'byCell', [gridX, gridY]);
  },

  async create(decoration: Decoration): Promise<void> {
    const db = await getDb();
    await db.add('decorations', decoration);
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('decorations', id);
  },
};
