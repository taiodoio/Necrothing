// Connessione e schema IndexedDB (web). Su native sarà sostituito da un
// adapter SQLite che implementa gli stessi repository.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Achievement,
  Decoration,
  Grave,
  GraveMemoryEvent,
  Settings,
  StoredImage,
  UserProgression,
  WorldState,
  Zone,
} from '@/shared/domain/types';

export const DB_NAME = 'necrothing';
export const DB_VERSION = 4;

export interface NecrothingDB extends DBSchema {
  graves: {
    key: string;
    value: Grave;
    indexes: { byCell: [number, number]; byDeathDate: string };
  };
  memoryEvents: {
    key: string;
    value: GraveMemoryEvent;
    indexes: { byGrave: string };
  };
  world: {
    key: string;
    value: WorldState;
  };
  progression: {
    key: string;
    value: UserProgression;
  };
  settings: {
    key: string;
    value: Settings;
  };
  achievements: {
    key: string;
    value: Achievement;
  };
  images: {
    key: string;
    value: StoredImage;
  };
  decorations: {
    key: string;
    value: Decoration;
    indexes: { byCell: [number, number] };
  };
  zones: {
    key: string;
    value: Zone;
  };
}

let dbPromise: Promise<IDBPDatabase<NecrothingDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<NecrothingDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NecrothingDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const graves = db.createObjectStore('graves', { keyPath: 'id' });
          graves.createIndex('byCell', ['gridX', 'gridY'], { unique: true });
          graves.createIndex('byDeathDate', 'deathDate');

          const events = db.createObjectStore('memoryEvents', { keyPath: 'id' });
          events.createIndex('byGrave', 'graveId');

          db.createObjectStore('world', { keyPath: 'id' });
          db.createObjectStore('progression', { keyPath: 'id' });
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('achievements', { keyPath: 'id' });
          db.createObjectStore('images', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          const deco = db.createObjectStore('decorations', { keyPath: 'id' });
          deco.createIndex('byCell', ['gridX', 'gridY'], { unique: true });
        }
        if (oldVersion < 4) {
          db.createObjectStore('zones', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/** Solo per i test: reset della connessione cached. */
export function __resetDbForTests(): void {
  dbPromise = null;
}
