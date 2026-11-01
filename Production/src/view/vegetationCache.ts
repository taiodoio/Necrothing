// Cache locale delle geometrie statiche già cotte per il bosco e il prato.
// IndexedDB salva solo array CPU; Three ricrea le risorse GPU al ripristino.
import * as THREE from 'three';
import { LOWPOLY_MATERIALS } from '../render/modelCache.ts';

const REVISION = typeof __ASSET_CACHE_REVISION__ === 'undefined' ? 'dev' : __ASSET_CACHE_REVISION__;
const DB_NAME = 'necrothing-static-world';
const STORE = 'vegetation';
const MAX_RECORD_BYTES = 24_000_000;
const MAX_TOTAL_BYTES = 64_000_000;
const MAX_RECORDS = 12;

interface AttributeData { array: Float32Array; itemSize: number; normalized: boolean }
interface MeshData {
  chunk: string;
  bucket: keyof typeof LOWPOLY_MATERIALS;
  attributes: Record<string, AttributeData>;
  index: Uint16Array | Uint32Array | null;
  castShadow: boolean;
  receiveShadow: boolean;
  renderOrder: number;
}
interface RecordData { id: string; revision: string; bytes: number; savedAt: number; meshes: MeshData[] }

const memory = new Map<string, MeshData[]>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const pending = new Map<string, MeshData[]>();
const yieldUi = () => new Promise<void>((resolve) => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(resolve, 0)) : setTimeout(resolve, 0));

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(DB_NAME, 1); } catch { resolve(null); return; }
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function bytesOf(meshes: MeshData[]): number {
  let bytes = 0;
  for (const mesh of meshes) {
    if (mesh.index) bytes += mesh.index.byteLength;
    for (const attr of Object.values(mesh.attributes)) bytes += attr.array.byteLength;
  }
  return bytes;
}

function serialize(meshes: THREE.Mesh[]): MeshData[] {
  return meshes.filter((mesh) => mesh.geometry.getAttribute('position')).map((mesh) => {
    const attributes: Record<string, AttributeData> = {};
    for (const [name, attr] of Object.entries(mesh.geometry.attributes)) {
      const array = attr.array;
      if (!(array instanceof Float32Array)) continue;
      attributes[name] = { array: array.slice(), itemSize: attr.itemSize, normalized: attr.normalized };
    }
    const index = mesh.geometry.index?.array;
    return {
      chunk: String(mesh.userData.chunk ?? ''),
      bucket: (Object.entries(LOWPOLY_MATERIALS).find(([, material]) => material === mesh.material)?.[0] ?? 'solid') as keyof typeof LOWPOLY_MATERIALS,
      attributes,
      index: index instanceof Uint32Array ? index.slice() : index instanceof Uint16Array ? index.slice() : null,
      castShadow: mesh.castShadow,
      receiveShadow: mesh.receiveShadow,
      renderOrder: mesh.renderOrder,
    };
  });
}

export function restoreVegetation(key: string): THREE.Mesh[] | null {
  const data = memory.get(`${REVISION}:${key}`);
  if (!data) return null;
  return data.map((item) => {
    const geometry = new THREE.BufferGeometry();
    // Gli array idratati restano immutabili; condividerli evita una seconda copia
    // CPU oltre a quella mantenuta dalla cache durante l'upload alle GPU.
    for (const [name, attr] of Object.entries(item.attributes)) geometry.setAttribute(name, new THREE.BufferAttribute(attr.array, attr.itemSize, attr.normalized));
    if (item.index) geometry.setIndex(new THREE.BufferAttribute(item.index, 1));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, LOWPOLY_MATERIALS[item.bucket] ?? LOWPOLY_MATERIALS.solid);
    mesh.userData.baked = true;
    mesh.userData.chunk = item.chunk;
    mesh.castShadow = item.castShadow;
    mesh.receiveShadow = item.receiveShadow;
    mesh.renderOrder = item.renderOrder;
    return mesh;
  });
}

/** Salvataggio best-effort: la scena resta utilizzabile se IndexedDB è piena o indisponibile. */
export function cacheVegetation(key: string, meshes: THREE.Mesh[]) {
  const id = `${REVISION}:${key}`;
  const data = serialize(meshes);
  if (bytesOf(data) > MAX_RECORD_BYTES) return;
  memory.set(id, data);
  pending.set(id, data);
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => { void flushVegetationCache(); }, { timeout: 5000 });
    else void flushVegetationCache();
  }, 2000);
}

export async function hydrateVegetationCache(onProgress?: (fraction: number) => void): Promise<number> {
  const db = await openDb();
  if (!db) { onProgress?.(1); return 0; }
  const rows = await new Promise<RecordData[]>((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result as RecordData[] : []);
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
  const valid = rows.filter((row) => row.revision === REVISION && row.id.startsWith(`${REVISION}:`) && Array.isArray(row.meshes));
  let loaded = 0;
  for (const [i, row] of valid.entries()) {
    try { memory.set(row.id, row.meshes); loaded++; } catch { /* cache corrotta: ricostruzione normale */ }
    onProgress?.((i + 1) / Math.max(1, valid.length));
    if (i % 3 === 2) await yieldUi();
  }
  const stale = rows.filter((row) => row.revision !== REVISION || !row.id.startsWith(`${REVISION}:`));
  if (stale.length) await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      for (const row of stale) tx.objectStore(STORE).delete(row.id);
      tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => resolve();
    } catch { resolve(); }
  });
  onProgress?.(1);
  return loaded;
}

export async function flushVegetationCache(): Promise<number> {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  const db = await openDb();
  if (!db || !pending.size) return 0;
  const rows = await new Promise<RecordData[]>((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result as RecordData[] : []);
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
  const all = new Map(rows.map((row) => [row.id, row]));
  const batch = [...pending.entries()];
  for (const [id, meshes] of batch) all.set(id, { id, revision: REVISION, meshes, bytes: bytesOf(meshes), savedAt: Date.now() });
  const keep = [...all.values()].sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_RECORDS);
  let total = 0;
  const bounded: RecordData[] = [];
  for (const row of keep) if (total + row.bytes <= MAX_TOTAL_BYTES) { bounded.push(row); total += row.bytes; }
  let written = 0;
  for (const row of bounded) {
    if (!pending.has(row.id)) continue;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(row);
        tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => resolve();
      } catch { resolve(); }
    });
    pending.delete(row.id); written++;
    if (written % 2 === 0) await yieldUi();
  }
  const keepIds = new Set(bounded.map((row) => row.id));
  const remove = rows.filter((row) => !keepIds.has(row.id));
  if (remove.length) await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      for (const row of remove) tx.objectStore(STORE).delete(row.id);
      tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => resolve();
    } catch { resolve(); }
  });
  return written;
}
