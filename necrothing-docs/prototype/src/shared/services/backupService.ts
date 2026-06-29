// Backup local-first: export/import dell'intero stato in un file `.necro`.
// Formato JSON (con immagini codificate base64). Coerente col pilastro privacy:
// nessun cloud, backup manuale del dispositivo.

import { getDb } from '@/shared/db/schema';
import type {
  Achievement,
  Decoration,
  Grave,
  GraveMemoryEvent,
  InventoryItem,
  Settings,
  UserProgression,
  WorldState,
  Zone,
} from '@/shared/domain/types';
import type { ClockService } from '@/shared/utils/clock';

export const BACKUP_FORMAT = 'necrothing-backup';
export const BACKUP_VERSION = 4;

interface BackupImage {
  id: string;
  mime: string;
  b64: string;
}

interface BackupPhoto {
  id: string;
  createdAt: string;
  mime: string;
  b64: string;
}

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  data: {
    graves: Grave[];
    memoryEvents: GraveMemoryEvent[];
    world: WorldState[];
    progression: UserProgression[];
    settings: Settings[];
    achievements: Achievement[];
    decorations: Decoration[];
    zones: Zone[];
    inventory: InventoryItem[];
    images: BackupImage[];
    photos: BackupPhoto[];
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class BackupError extends Error {}

export const backupService = {
  /** Serializza l'intero stato in una stringa JSON `.necro`. */
  async exportToString(clock: ClockService): Promise<string> {
    const db = await getDb();
    const [
      graves,
      memoryEvents,
      world,
      progression,
      settings,
      achievements,
      decorations,
      zones,
      inventory,
      rawImages,
      rawPhotos,
    ] = await Promise.all([
      db.getAll('graves'),
      db.getAll('memoryEvents'),
      db.getAll('world'),
      db.getAll('progression'),
      db.getAll('settings'),
      db.getAll('achievements'),
      db.getAll('decorations'),
      db.getAll('zones'),
      db.getAll('inventory'),
      db.getAll('images'),
      db.getAll('photos'),
    ]);

    const images: BackupImage[] = [];
    for (const img of rawImages) {
      const buf = new Uint8Array(await img.blob.arrayBuffer());
      images.push({ id: img.id, mime: img.blob.type || 'image/png', b64: bytesToBase64(buf) });
    }

    const photos: BackupPhoto[] = [];
    for (const ph of rawPhotos) {
      const buf = new Uint8Array(await ph.blob.arrayBuffer());
      photos.push({
        id: ph.id,
        createdAt: ph.createdAt,
        mime: ph.blob.type || 'image/png',
        b64: bytesToBase64(buf),
      });
    }

    const file: BackupFile = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: clock.nowIso(),
      data: {
        graves,
        memoryEvents,
        world,
        progression,
        settings,
        achievements,
        decorations,
        zones,
        inventory,
        images,
        photos,
      },
    };
    return JSON.stringify(file, null, 2);
  },

  /** Ripristina lo stato da una stringa `.necro`. Sostituisce i dati esistenti. */
  async importFromString(text: string): Promise<void> {
    let parsed: BackupFile;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BackupError('File non valido: JSON corrotto.');
    }
    if (!parsed || parsed.format !== BACKUP_FORMAT || !parsed.data) {
      throw new BackupError('File non riconosciuto come backup NECROTHING.');
    }
    if (parsed.version > BACKUP_VERSION) {
      throw new BackupError('Backup creato con una versione più recente.');
    }

    const d = parsed.data;
    const db = await getDb();
    const tx = db.transaction(
      [
        'graves',
        'memoryEvents',
        'world',
        'progression',
        'settings',
        'achievements',
        'decorations',
        'zones',
        'inventory',
        'images',
        'photos',
      ],
      'readwrite',
    );

    await Promise.all([
      tx.objectStore('graves').clear(),
      tx.objectStore('memoryEvents').clear(),
      tx.objectStore('world').clear(),
      tx.objectStore('progression').clear(),
      tx.objectStore('settings').clear(),
      tx.objectStore('achievements').clear(),
      tx.objectStore('decorations').clear(),
      tx.objectStore('zones').clear(),
      tx.objectStore('inventory').clear(),
      tx.objectStore('images').clear(),
      tx.objectStore('photos').clear(),
    ]);

    for (const g of d.graves ?? []) tx.objectStore('graves').put(g);
    for (const e of d.memoryEvents ?? []) tx.objectStore('memoryEvents').put(e);
    for (const w of d.world ?? []) tx.objectStore('world').put(w);
    for (const p of d.progression ?? []) tx.objectStore('progression').put(p);
    for (const s of d.settings ?? []) tx.objectStore('settings').put(s);
    for (const a of d.achievements ?? []) tx.objectStore('achievements').put(a);
    for (const deco of d.decorations ?? []) tx.objectStore('decorations').put(deco);
    for (const z of d.zones ?? []) tx.objectStore('zones').put(z);
    for (const inv of d.inventory ?? []) tx.objectStore('inventory').put(inv);
    for (const img of d.images ?? []) {
      const bytes = base64ToBytes(img.b64);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: img.mime });
      tx.objectStore('images').put({ id: img.id, blob });
    }
    for (const ph of d.photos ?? []) {
      const bytes = base64ToBytes(ph.b64);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: ph.mime });
      tx.objectStore('photos').put({ id: ph.id, blob, createdAt: ph.createdAt });
    }

    await tx.done;
  },
};
