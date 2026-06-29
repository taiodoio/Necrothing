// Galleria foto: salvataggio/elenco/rimozione delle foto del cimitero.

import { getDb } from '@/shared/db/schema';
import type { GalleryPhoto } from '@/shared/domain/types';
import { newId } from '@/shared/utils/id';
import type { ClockService } from '@/shared/utils/clock';

export interface PhotoMeta {
  id: string;
  createdAt: string;
}

export const galleryService = {
  /** Metadati delle foto (senza blob), dalla più recente. */
  async listMeta(): Promise<PhotoMeta[]> {
    const db = await getDb();
    const all = await db.getAll('photos');
    return all
      .map((p) => ({ id: p.id, createdAt: p.createdAt }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getBlob(id: string): Promise<Blob | undefined> {
    const db = await getDb();
    return (await db.get('photos', id))?.blob;
  },

  async add(blob: Blob, clock: ClockService): Promise<PhotoMeta> {
    const db = await getDb();
    const photo: GalleryPhoto = { id: newId(), blob, createdAt: clock.nowIso() };
    await db.put('photos', photo);
    return { id: photo.id, createdAt: photo.createdAt };
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('photos', id);
  },
};
