// Salvataggio locale (local-first, nessun cloud): stato in localStorage,
// foto della galleria e foto degli oggetti sepolti in IndexedDB.
// Export/import in un file .necro3d (ZIP: vedi backup.ts).

import { normalizeSave, type SaveData } from '../game/state.ts';
import { packBackup, unpackBackup, type MemorialPhoto, type PhotoRecord } from './backup.ts';

export type { MemorialPhoto, PhotoRecord };

const KEY = 'necrothing3d.save.v1';

/** Spento dalla pagina delle misure: niente letture né scritture del salvataggio vero. */
let persistence = true;
export function setPersistence(on: boolean) { persistence = on; }
export const persistenceOn = () => persistence;

export function loadSave(): SaveData | null {
  if (!persistence) return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizeSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

let pending = 0;
export function saveNow(state: SaveData) {
  if (!persistence) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Salvataggio non riuscito', e);
  }
}

/** Salvataggio con debounce (le azioni ravvicinate scrivono una volta sola). */
export function scheduleSave(state: SaveData) {
  if (!persistence) return;
  window.clearTimeout(pending);
  pending = window.setTimeout(() => saveNow(state), 250);
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

// ── Foto (IndexedDB) ───────────────────────────────────────────────────
// «photos»: le foto scattate nel cimitero; «memorials»: le foto degli
// oggetti sepolti (la tomba le indica con photoId).

type Store = 'photos' | 'memorials';

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('necrothing3d', 2);
    req.onupgradeneeded = () => {
      for (const name of ['photos', 'memorials']) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = fn(d.transaction(store, mode).objectStore(store));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const gallery = {
  list: async (): Promise<PhotoRecord[]> => {
    const all = await tx<PhotoRecord[]>('photos', 'readonly', (s) => s.getAll() as IDBRequest<PhotoRecord[]>);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  add: (p: PhotoRecord) => tx('photos', 'readwrite', (s) => s.put(p)),
  remove: (id: string) => tx('photos', 'readwrite', (s) => s.delete(id)),
  clear: () => tx('photos', 'readwrite', (s) => s.clear()),
};

export const memorials = {
  get: (id: string) => tx<MemorialPhoto | undefined>('memorials', 'readonly', (s) => s.get(id) as IDBRequest<MemorialPhoto | undefined>),
  put: (m: MemorialPhoto) => tx('memorials', 'readwrite', (s) => s.put(m)),
  list: () => tx<MemorialPhoto[]>('memorials', 'readonly', (s) => s.getAll() as IDBRequest<MemorialPhoto[]>),
  clear: () => tx('memorials', 'readwrite', (s) => s.clear()),
};

/** Backup ZIP: stato, foto del cimitero e foto delle tombe ancora presenti. */
export async function exportBackup(state: SaveData): Promise<Blob> {
  const photos = await gallery.list().catch(() => [] as PhotoRecord[]);
  const used = new Set(state.graves.map((g) => g.photoId).filter(Boolean));
  const graves = (await memorials.list().catch(() => [] as MemorialPhoto[])).filter((m) => used.has(m.id));
  return new Blob([packBackup(state, photos, graves) as BlobPart], { type: 'application/zip' });
}

/** Importa un backup (ZIP nuovo o JSON vecchio): sostituisce stato e foto. */
export async function importBackup(data: ArrayBuffer): Promise<SaveData> {
  const content = unpackBackup(new Uint8Array(data));
  const state = normalizeSave(content.state);
  if (!state) throw new Error('Backup corrotto.');
  await gallery.clear().catch(() => undefined);
  for (const p of content.photos) await gallery.add(p);
  await memorials.clear().catch(() => undefined);
  for (const m of content.memorials) await memorials.put(m);
  saveNow(state);
  return state;
}
