// Cache delle geometrie dei modelli (per chiave) e materiali condivisi. Più
// istanze dello stesso modello condividono la stessa geometria.

import * as THREE from 'three';
import { BufferGeometryLoader } from 'three/src/loaders/BufferGeometryLoader.js';
import { VOX, type Bucket, type BucketGeometries, type LightAnchor } from './types.ts';

export type MaterialSet = Record<Bucket | 'selected' | 'invalid', THREE.Material>;

const glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const ghost = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });

/**
 * Materiali "Stylized Gothic Low-Poly": PBR opaco (roughness alta, niente
 * metallo) con flat shading, così ogni faccia legge la luce in modo netto.
 * glow e ghost sono condivisi (l'Atmosfera ne regola l'intensità per fase).
 */
export const LOWPOLY_MATERIALS: MaterialSet = {
  solid: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }),
  glow,
  water: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.86 }),
  ghost,
  /** Occhi dei personaggi: lucidi, con il riflesso della luce. */
  gloss: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.18, metalness: 0.05 }),
  selected: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0, emissive: new THREE.Color('#5a4120'), emissiveIntensity: 0.45 }),
  invalid: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0, emissive: new THREE.Color('#7a1f1f'), emissiveIntensity: 0.9 }),
};

/** Terreno low-poly: shading morbido (normali per vertice), così il suolo resta calmo. */
export const LOWPOLY_TERRAIN = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.95, metalness: 0 });

/**
 * Materiali leggeri (telefoni deboli): Lambert al posto del PBR, stesso
 * aspetto piatto (flat shading, colori per vertice) con un calcolo della luce
 * molto più semplice per pixel. `setLiteMaterials` li scambia nelle mesh già
 * in scena e in LOWPOLY_MATERIALS (così anche le nuove li usano).
 */
type LiteKey = 'solid' | 'water' | 'gloss' | 'selected' | 'invalid';
const FULL_MATS: Record<LiteKey, THREE.Material> = { solid: LOWPOLY_MATERIALS.solid, water: LOWPOLY_MATERIALS.water, gloss: LOWPOLY_MATERIALS.gloss, selected: LOWPOLY_MATERIALS.selected, invalid: LOWPOLY_MATERIALS.invalid };
let liteMats: (Record<LiteKey, THREE.Material> & { terrain: THREE.Material }) | null = null;
let liteOn = false;
export const liteMaterialsOn = () => liteOn;

function liteMaterialSwap(on: boolean) {
  liteMats ??= {
    solid: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    water: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.86 }),
    gloss: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    selected: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: new THREE.Color('#5a4120'), emissiveIntensity: 0.45 }),
    invalid: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: new THREE.Color('#7a1f1f'), emissiveIntensity: 0.9 }),
    terrain: new THREE.MeshLambertMaterial({ vertexColors: true }),
  };
  liteOn = on;
  const swap = new Map<THREE.Material, THREE.Material>([[on ? LOWPOLY_TERRAIN : liteMats.terrain, on ? liteMats.terrain : LOWPOLY_TERRAIN]]);
  for (const k of Object.keys(FULL_MATS) as LiteKey[]) {
    const [from, to] = on ? [FULL_MATS[k], liteMats[k]] : [liteMats[k], FULL_MATS[k]];
    swap.set(from, to);
    (LOWPOLY_MATERIALS as unknown as Record<LiteKey, THREE.Material>)[k] = to;
  }
  return swap;
}

function swapObjectMaterials(o: THREE.Object3D, swap: Map<THREE.Material, THREE.Material>) {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  if (Array.isArray(m.material)) m.material = m.material.map((x) => swap.get(x) ?? x);
  else m.material = swap.get(m.material) ?? m.material;
}

export function setLiteMaterials(on: boolean, root?: THREE.Object3D) {
  const swap = liteMaterialSwap(on);
  root?.traverse((o) => {
    swapObjectMaterials(o, swap);
  });
}

/** Variante a budget per i cambi qualità: limita il lavoro continuo sul thread UI. */
export async function setLiteMaterialsStaged(on: boolean, root: THREE.Object3D) {
  const swap = liteMaterialSwap(on);
  const pending = [root];
  while (pending.length) {
    const until = performance.now() + 4;
    while (pending.length && performance.now() < until) {
      const object = pending.pop()!;
      swapObjectMaterials(object, swap);
      for (let i = object.children.length - 1; i >= 0; i--) pending.push(object.children[i]);
    }
    if (pending.length) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export interface CachedModel {
  geometries: BucketGeometries;
  lights: LightAnchor[];
  /** Altezza massima (unità mondo), utile per hitbox ed etichette. */
  height: number;
}

/**
 * Adapter dei modelli: data la chiave (tomba, oggetto, scenografia, parte di
 * personaggio) restituisce il suo generatore. Registrato da render/lowpoly.
 */
export type ModelResolver = (key: string) => (() => { geometries: BucketGeometries; lights: LightAnchor[] }) | null;
let resolver: ModelResolver = () => null;
export function setModelResolver(r: ModelResolver) { resolver = r; }

const cache = new Map<string, CachedModel>();

// La geometria low-poly è deterministica e riusabile tra avvii. IndexedDB
// conserva i dati CPU; Three/WebGL ricrea comunque le risorse GPU al bisogno.
// Incrementare la revisione quando cambia il formato o la generazione dei modelli.
const MODEL_CACHE_REVISION = typeof __ASSET_CACHE_REVISION__ === 'undefined' ? 'dev' : __ASSET_CACHE_REVISION__;
const MODEL_DB = 'necrothing-local-assets';
const MODEL_STORE = 'models';
type StoredModel = { id: string; revision: string; data: { geometries: Record<string, THREE.BufferGeometryJSON> }; lights: LightAnchor[]; bytes: number };
let dbPromise: Promise<IDBDatabase | null> | null = null;
let hydration: Promise<number> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const yieldUi = () => new Promise<void>((resolve) => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(resolve, 0)) : setTimeout(resolve, 0));

function scheduleModelPersistence() {
  if (typeof indexedDB === 'undefined') return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => { void persistModelCache(); }, { timeout: 5000 });
    else void persistModelCache();
  }, 2500);
}

function openModelDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(MODEL_DB, 1); } catch { resolve(null); return; }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MODEL_STORE)) request.result.createObjectStore(MODEL_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

/** Ripristina la cache locale prima di costruire la scena; qualunque errore è un cache miss. */
export function hydrateModelCache(onProgress?: (fraction: number) => void): Promise<number> {
  if (hydration) return hydration;
  hydration = (async () => {
    const db = await openModelDb();
    if (!db) { onProgress?.(1); return 0; }
    const rows = await new Promise<StoredModel[]>((resolve) => {
      try {
        const req = db.transaction(MODEL_STORE, 'readonly').objectStore(MODEL_STORE).getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result as StoredModel[] : []);
        req.onerror = () => resolve([]);
      } catch { resolve([]); }
    });
    const valid = rows.filter((row) => row.revision === MODEL_CACHE_REVISION && row.data && row.id.startsWith(`${MODEL_CACHE_REVISION}:`));
    const loader = new BufferGeometryLoader();
    let done = 0;
    const loadedIds = new Set<string>();
    for (const [index, row] of valid.entries()) {
      try {
        const geometries = {} as BucketGeometries;
        for (const [bucket, json] of Object.entries(row.data.geometries ?? {})) {
          geometries[bucket as Bucket] = loader.parse(json as THREE.BufferGeometryJSON);
        }
        let height = 0.2;
        for (const geometry of Object.values(geometries)) {
          if (!geometry) continue;
          if (!geometry.boundingBox) geometry.computeBoundingBox();
          height = Math.max(height, geometry.boundingBox!.max.y);
        }
        cache.set(row.id.slice(row.id.indexOf(':') + 1), { geometries, lights: row.lights ?? [], height });
        loadedIds.add(row.id);
      } catch { /* record obsoleto o incompleto: verrà rigenerato dal resolver */ }
      onProgress?.(++done / Math.max(1, valid.length));
      if (index % 4 === 3) await yieldUi();
    }
    const stale = rows.filter((row) => !loadedIds.has(row.id));
    if (stale.length) await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(MODEL_STORE, 'readwrite');
        const store = tx.objectStore(MODEL_STORE);
        for (const row of stale) store.delete(row.id);
        tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => resolve();
      } catch { resolve(); }
    });
    onProgress?.(1);
    return done;
  })().catch(() => 0);
  return hydration;
}

/** Salva i modelli già generati; se IndexedDB/quota non sono disponibili resta la cache RAM. */
export async function persistModelCache(onProgress?: (fraction: number) => void): Promise<number> {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
  const db = await openModelDb();
  if (!db) { onProgress?.(1); return 0; }
  const entries = [...cache.entries()].slice(0, 180);
  const existing = await new Promise<StoredModel[]>((resolve) => {
    try {
      const req = db.transaction(MODEL_STORE, 'readonly').objectStore(MODEL_STORE).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result as StoredModel[] : []);
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
  const existingIds = new Set(existing.map((row) => row.id));
  let totalBytes = existing.reduce((n, row) => n + (row.bytes || 0), 0);
  let done = 0, written = 0;
  // La cache è ricostruibile: limitiamo numero e spazio, lasciando margine per i salvataggi.
  for (const [key, model] of entries) {
    try {
      const id = `${MODEL_CACHE_REVISION}:${key}`;
      if (existingIds.has(id)) { onProgress?.(++done / Math.max(1, entries.length)); continue; }
      const geometries: Record<string, THREE.BufferGeometryJSON> = {};
      for (const [bucket, geometry] of Object.entries(model.geometries)) if (geometry) geometries[bucket] = geometry.toJSON();
      const data: StoredModel['data'] = { geometries };
      const bytes = JSON.stringify(data).length * 2;
      if (bytes <= 1_500_000 && totalBytes + bytes <= 24_000_000) {
        const row: StoredModel = { id, revision: MODEL_CACHE_REVISION, data, lights: model.lights, bytes };
        await new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(MODEL_STORE, 'readwrite');
            tx.objectStore(MODEL_STORE).put(row);
            tx.oncomplete = () => resolve();
            tx.onerror = tx.onabort = () => resolve();
          } catch { resolve(); }
        });
        totalBytes += bytes;
        written++;
      }
    } catch { /* persistenza best effort: non deve bloccare il gioco */ }
    onProgress?.(++done / Math.max(1, entries.length));
    if (done % 4 === 0) await yieldUi();
  }
  return written;
}

/** Geometria condivisa di un modello. Una chiave senza generatore è un errore di programmazione. */
export function getModel(key: string): CachedModel {
  let hit = cache.get(key);
  if (!hit) {
    const gen = resolver(key);
    if (!gen) throw new Error(`Nessun modello per ${key}`); // i18n-ok: errore interno
    const { geometries, lights } = gen();
    let height = 0.2;
    for (const g of Object.values(geometries)) {
      if (!g) continue;
      if (!g.boundingBox) g.computeBoundingBox();
      height = Math.max(height, g.boundingBox!.max.y);
    }
    hit = { geometries, lights, height };
    cache.set(key, hit);
    scheduleModelPersistence();
  }
  return hit;
}

/** Crea un Group con una mesh per bucket (materiali condivisi). */
export function instantiate(model: CachedModel, opts: { castShadow?: boolean; receiveShadow?: boolean } = {}): THREE.Group {
  const group = new THREE.Group();
  for (const [bucket, geo] of Object.entries(model.geometries) as [Bucket, THREE.BufferGeometry][]) {
    const mesh = new THREE.Mesh(geo, LOWPOLY_MATERIALS[bucket]);
    mesh.name = bucket;
    mesh.castShadow = bucket === 'solid' && (opts.castShadow ?? true);
    mesh.receiveShadow = bucket === 'solid' && (opts.receiveShadow ?? true);
    if (bucket === 'ghost') mesh.renderOrder = 2;
    group.add(mesh);
  }
  return group;
}

export function lightWorldPos(anchor: LightAnchor, target = new THREE.Vector3()): THREE.Vector3 {
  return target.set(anchor.pos[0] * VOX, anchor.pos[1] * VOX, anchor.pos[2] * VOX);
}

export function cacheStats() {
  let triangles = 0;
  for (const m of cache.values()) for (const g of Object.values(m.geometries)) {
    if (!g) continue;
    triangles += g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
  }
  return { models: cache.size, triangles };
}

/** Svuota tutta la cache (le geometrie si liberano dalla GPU). */
export function clearAll() {
  for (const m of cache.values()) for (const g of Object.values(m.geometries)) g?.dispose();
  cache.clear();
}
