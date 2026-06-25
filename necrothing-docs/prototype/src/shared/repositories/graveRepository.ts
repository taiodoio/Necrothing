import { getDb } from '@/shared/db/schema';
import type { Grave, GraveMemoryEvent } from '@/shared/domain/types';

export const graveRepository = {
  async getAll(): Promise<Grave[]> {
    const db = await getDb();
    return db.getAll('graves');
  },

  async getById(id: string): Promise<Grave | undefined> {
    const db = await getDb();
    return db.get('graves', id);
  },

  async getByCell(gridX: number, gridY: number): Promise<Grave | undefined> {
    const db = await getDb();
    return db.getFromIndex('graves', 'byCell', [gridX, gridY]);
  },

  async create(grave: Grave): Promise<void> {
    const db = await getDb();
    await db.add('graves', grave);
  },

  async update(grave: Grave): Promise<void> {
    const db = await getDb();
    await db.put('graves', grave);
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('graves', id);
  },
};

export const memoryEventRepository = {
  async listByGrave(graveId: string): Promise<GraveMemoryEvent[]> {
    const db = await getDb();
    const events = await db.getAllFromIndex('memoryEvents', 'byGrave', graveId);
    return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  },

  async add(event: GraveMemoryEvent): Promise<void> {
    const db = await getDb();
    await db.add('memoryEvents', event);
  },
};
