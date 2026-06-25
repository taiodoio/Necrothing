// Storage immagini (foto delle tombe). Su web usa IndexedDB (Blob);
// su native userà il Filesystem tramite lo stesso contratto.

import { imagesRepository } from '@/shared/repositories/imagesRepository';
import { newId } from '@/shared/utils/id';

export const imageStorageService = {
  async save(blob: Blob): Promise<string> {
    const id = newId();
    await imagesRepository.save({ id, blob });
    return id;
  },

  async getBlob(id: string): Promise<Blob | undefined> {
    const img = await imagesRepository.get(id);
    return img?.blob;
  },

  async remove(id: string): Promise<void> {
    await imagesRepository.remove(id);
  },
};
