// Salvataggio locale (local-first, nessun cloud): stato in localStorage,
// foto della galleria e foto degli oggetti sepolti in IndexedDB.
// Export/import in un file .necro3d (ZIP: vedi backup.ts).

import { normalizeSave, SAVE_VERSION, type SaveData } from '../game/state.ts';
import { packBackup, unpackBackup, type BackupContent, type MemorialPhoto, type PhotoRecord } from './backup.ts';
import { t } from '../i18n/index.ts';

export type { MemorialPhoto, PhotoRecord };

const KEY = 'necrothing3d.save.v1';

/** Spento dalla pagina delle misure: niente letture né scritture del salvataggio vero. */
let persistence = true;
export function setPersistence(on: boolean) { persistence = on; }
export const persistenceOn = () => persistence;

/**
 * Copie di sicurezza accanto al salvataggio (mai cancellate dal gioco):
 * - `.pre-v<N>`: com'era prima di migrarlo alla versione N (una per versione);
 * - `.newer`: una partita di una versione più nuova del gioco, prima di aprirla qui;
 * - `.unreadable`: un salvataggio che non si leggeva, invece di sovrascriverlo con una partita nuova.
 */
const COPY = { pre: (v: number) => `${KEY}.pre-v${v}`, newer: `${KEY}.newer`, unreadable: `${KEY}.unreadable` };

let recovered = false;
/** All'avvio il salvataggio non si leggeva (ne è rimasta una copia): lo si dice una volta. */
export function takeRecoveredNotice(): boolean { const r = recovered; recovered = false; return r; }

function keepCopy(key: string, raw: string, overwrite = true) {
  try { if (overwrite || localStorage.getItem(key) === null) localStorage.setItem(key, raw); } catch (e) { console.warn('Copia del salvataggio non riuscita', e); }
}

export function loadSave(): SaveData | null {
  if (!persistence) return null;
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: unknown };
    const v = typeof parsed?.version === 'number' ? parsed.version : null;
    if (v !== null && v < SAVE_VERSION) keepCopy(COPY.pre(SAVE_VERSION), raw, false);
    if (v !== null && v > SAVE_VERSION) keepCopy(COPY.newer, raw);
    const state = normalizeSave(parsed);
    if (state) return state;
  } catch (e) {
    console.warn('Salvataggio illeggibile', e);
  }
  // non si legge: lo si tiene da parte (la partita nuova lo sovrascriverà)
  keepCopy(COPY.unreadable, raw);
  recovered = true;
  return null;
}

/**
 * Il cortile del primo ingresso è una partita a parte, mai salvata: mentre c'è
 * si salva al suo posto la partita vera (che ha lo stesso stato del percorso,
 * quindi i passi fatti nel cortile restano). null: si salva quel che arriva.
 */
let saveInstead: SaveData | null = null;
export function setSaveInstead(real: SaveData | null) { saveInstead = real; }

let pending = 0;
export function saveNow(state: SaveData) {
  if (!persistence) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(saveInstead ?? state));
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
// oggetti sepolti (la tomba le indica con photoId); «thumbs»: le miniature
// già disegnate (Bottega, inventario), per non rifarle a ogni avvio.

type Store = 'photos' | 'memorials' | 'thumbs';

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('necrothing3d', 3);
    req.onupgradeneeded = () => {
      for (const name of ['photos', 'memorials', 'thumbs']) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' });
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

/**
 * Miniature salvate: valgono solo per la build che le ha disegnate (un
 * modello cambiato le rende vecchie). `id` è «build|chiave».
 */
interface ThumbRecord { id: string; url: string }
const THUMB_BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__.commit : 'dev';

export const thumbStore = {
  /** Le miniature di questa build (quelle di build vecchie si cancellano). */
  load: async (): Promise<Array<[string, string]>> => {
    const all = await tx<ThumbRecord[]>('thumbs', 'readonly', (s) => s.getAll() as IDBRequest<ThumbRecord[]>);
    const prefix = `${THUMB_BUILD}|`;
    const mine = all.filter((r) => r.id.startsWith(prefix));
    if (mine.length < all.length) void tx('thumbs', 'readwrite', (s) => s.clear()).then(() => Promise.all(mine.map((r) => tx('thumbs', 'readwrite', (s) => s.put(r))))).catch(() => undefined);
    return mine.map((r) => [r.id.slice(prefix.length), r.url]);
  },
  /** Salva un gruppo di miniature in una volta. */
  save: async (entries: Array<[string, string]>) => {
    const d = await db();
    await new Promise<void>((resolve, reject) => {
      const t = d.transaction('thumbs', 'readwrite');
      const s = t.objectStore('thumbs');
      for (const [key, url] of entries) s.put({ id: `${THUMB_BUILD}|${key}`, url });
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },
};

/** Backup ZIP: stato, foto del cimitero e foto delle tombe ancora presenti. */
export async function exportBackup(state: SaveData): Promise<Blob> {
  const photos = await gallery.list().catch(() => [] as PhotoRecord[]);
  const used = new Set(state.graves.map((g) => g.photoId).filter(Boolean));
  const graves = (await memorials.list().catch(() => [] as MemorialPhoto[])).filter((m) => used.has(m.id));
  return new Blob([packBackup(state, photos, graves) as BlobPart], { type: 'application/zip' });
}

/** Un backup letto e controllato, non ancora applicato (si chiede prima conferma). */
export interface ReadBackup { state: SaveData; content: BackupContent }

/** Legge un backup (ZIP nuovo, anche ricompresso, o JSON vecchio) senza toccare la partita. */
export function readBackup(data: ArrayBuffer): ReadBackup {
  const content = unpackBackup(new Uint8Array(data));
  // da una versione più nuova del gioco: aprirlo qui perderebbe quello che questa versione non conosce
  const v = (content.state as { version?: unknown } | null)?.version;
  if (typeof v === 'number' && v > SAVE_VERSION) throw new Error(t('backup.newer'));
  const state = normalizeSave(content.state);
  if (!state) throw new Error(t('backup.corrupt'));
  return { state, content };
}

/** Sostituisce stato e foto con quelli del backup letto. */
export async function applyBackup({ state, content }: ReadBackup): Promise<SaveData> {
  await gallery.clear().catch(() => undefined);
  for (const p of content.photos) await gallery.add(p);
  await memorials.clear().catch(() => undefined);
  for (const m of content.memorials) await memorials.put(m);
  saveNow(state);
  return state;
}
