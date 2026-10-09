// Salvataggio locale (local-first, nessun cloud): stato in localStorage,
// foto della galleria in IndexedDB. Export/import in un file .necro3d (JSON).

import { normalizeSave, type SaveData } from '../game/state.ts';

const KEY = 'necrothing3d.save.v1';

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizeSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

let pending = 0;
export function saveNow(state: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Salvataggio non riuscito', e);
  }
}

/** Salvataggio con debounce (le azioni ravvicinate scrivono una volta sola). */
export function scheduleSave(state: SaveData) {
  window.clearTimeout(pending);
  pending = window.setTimeout(() => saveNow(state), 250);
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

// ── Galleria (IndexedDB) ───────────────────────────────────────────────

export interface PhotoRecord { id: string; createdAt: string; dataUrl: string }

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('necrothing3d', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = fn(d.transaction('photos', mode).objectStore('photos'));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const gallery = {
  list: async (): Promise<PhotoRecord[]> => {
    const all = await tx<PhotoRecord[]>('readonly', (s) => s.getAll() as IDBRequest<PhotoRecord[]>);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  add: (p: PhotoRecord) => tx('readwrite', (s) => s.put(p)),
  remove: (id: string) => tx('readwrite', (s) => s.delete(id)),
  clear: () => tx('readwrite', (s) => s.clear()),
};

export async function exportBackup(state: SaveData): Promise<Blob> {
  const photos = await gallery.list().catch(() => []);
  return new Blob([JSON.stringify({ format: 'necrothing-3d', version: 1, exportedAt: new Date().toISOString(), state, photos })], { type: 'application/json' });
}

export async function importBackup(text: string): Promise<SaveData> {
  const parsed = JSON.parse(text);
  if (parsed?.format !== 'necrothing-3d') throw new Error('File non riconosciuto come backup Necrothing 3D.');
  const state = normalizeSave(parsed.state);
  if (!state) throw new Error('Backup corrotto.');
  await gallery.clear().catch(() => undefined);
  for (const p of parsed.photos ?? []) await gallery.add(p);
  saveNow(state);
  return state;
}
