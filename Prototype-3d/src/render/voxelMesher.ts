// Mesher "Gothic Voxel".
//  1. rasterizza le primitive (in unità di design: 10 per cella) su una griglia
//     più fine di `res` voxel per unità (default 1.6 → 16 voxel per cella);
//  2. per ogni direzione emette solo le facce visibili e FONDE i rettangoli
//     coplanari con stesso materiale e stessa occlusione (greedy meshing);
//  3. calcola l'occlusione ambientale per vertice (anche contro il terreno).
// La variazione di colore per singolo voxel è fatta nello shader (hash della
// posizione mondo), così le facce fuse non perdono il "rumore" dei cubetti.

import * as THREE from 'three';
import { insideLocal, primBounds, VOX, type Bucket, type Model, type Prim } from './shape.ts';

export type BucketGeometries = Partial<Record<Bucket, THREE.BufferGeometry>>;

interface Mat { color: THREE.Color; bucket: Bucket }

const AO_LEVELS = [0.45, 0.64, 0.82, 1];
const TRANSPARENT: Record<Bucket, boolean> = { solid: false, glow: false, water: true, ghost: true };

/** Voxel per unità di design (10 unità = 1 cella). Impostabile per qualità. */
let RES = 1.6;
export function setVoxelResolution(r: number) { RES = r; }
export function voxelResolution() { return RES; }
/** Voxel per unità mondo (per lo shader del rumore). */
export function voxelsPerWorldUnit() { return RES / VOX; }

function conservative(p: Prim, res: number): Prim {
  if (p.kind !== 'box') return p;
  let { min, max } = p;
  const v = 1 / res;
  for (let a = 0; a < 3; a++) {
    if (max[a] - min[a] >= v) continue;
    const lo = Math.floor(((min[a] + max[a]) / 2) * res) / res;
    min = [...min] as [number, number, number];
    max = [...max] as [number, number, number];
    min[a] = lo; max[a] = lo + v;
  }
  return min === p.min && max === p.max ? p : { ...p, min, max };
}

export function meshVoxels(model: Model, _seed = 0, grounded = true, res = RES): BucketGeometries {
  const prims = model.prims.filter((p) => p.only !== 'miniature').map((p) => conservative(p, res));
  const additive = prims.filter((p) => !p.carve);
  if (additive.length === 0) return {};

  const bounds = new THREE.Box3();
  for (const p of additive) bounds.union(primBounds(p));
  const ox = Math.floor(bounds.min.x * res) - 1, oy = Math.floor(bounds.min.y * res) - 1, oz = Math.floor(bounds.min.z * res) - 1;
  const nx = Math.ceil(bounds.max.x * res) - ox + 1, ny = Math.ceil(bounds.max.y * res) - oy + 1, nz = Math.ceil(bounds.max.z * res) - oz + 1;
  const grid = new Uint16Array(nx * ny * nz);
  const idx = (i: number, j: number, k: number) => i + nx * (j + ny * k);

  const mats: Mat[] = [{ color: new THREE.Color(), bucket: 'solid' }];
  const matKey = new Map<string, number>();
  const inv = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const identity = new THREE.Matrix4();

  for (const p of prims) {
    let mi = 0;
    if (!p.carve) {
      const key = `${p.color}|${p.bucket ?? 'solid'}`;
      mi = matKey.get(key) ?? 0;
      if (!mi) {
        mi = mats.length;
        mats.push({ color: new THREE.Color(p.color), bucket: p.bucket ?? 'solid' });
        matKey.set(key, mi);
      }
    }
    const b = primBounds(p);
    const i0 = Math.max(0, Math.floor(b.min.x * res) - ox), i1 = Math.min(nx - 1, Math.ceil(b.max.x * res) - ox);
    const j0 = Math.max(0, Math.floor(b.min.y * res) - oy), j1 = Math.min(ny - 1, Math.ceil(b.max.y * res) - oy);
    const k0 = Math.max(0, Math.floor(b.min.z * res) - oz), k1 = Math.min(nz - 1, Math.ceil(b.max.z * res) - oz);
    const isId = p.matrix.equals(identity);
    if (!isId) inv.copy(p.matrix).invert();
    for (let k = k0; k <= k1; k++) {
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          v.set((i + ox + 0.5) / res, (j + oy + 0.5) / res, (k + oz + 0.5) / res);
          if (!isId) v.applyMatrix4(inv);
          if (insideLocal(p, v.x, v.y, v.z)) grid[idx(i, j, k)] = mi;
        }
      }
    }
  }

  const dims = [nx, ny, nz];
  const at = (c: number[]) =>
    c[0] < 0 || c[1] < 0 || c[2] < 0 || c[0] >= nx || c[1] >= ny || c[2] >= nz ? 0 : grid[idx(c[0], c[1], c[2])];
  const opaque = (c: number[]) => {
    if (grounded && c[1] + oy < 0) return true;
    const m = at(c);
    return m !== 0 && !TRANSPARENT[mats[m].bucket];
  };

  type Out = { pos: number[]; nor: number[]; col: number[]; ind: number[] };
  const outs: Partial<Record<Bucket, Out>> = {};
  const col = new THREE.Color();
  const scale = VOX / res;

  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, w = (axis + 2) % 3;
    const nu = dims[u], nw = dims[w];
    for (const sign of [1, -1]) {
      const mask = new Int32Array(nu * nw);
      const cur = [0, 0, 0], nb = [0, 0, 0];
      for (let d = 0; d < dims[axis]; d++) {
        // 1) maschera delle facce visibili in questo strato
        mask.fill(-1);
        for (let b2 = 0; b2 < nw; b2++) {
          for (let a2 = 0; a2 < nu; a2++) {
            cur[axis] = d; cur[u] = a2; cur[w] = b2;
            const m = at(cur);
            if (!m) continue;
            const mat = mats[m];
            const transparent = TRANSPARENT[mat.bucket];
            nb[0] = cur[0]; nb[1] = cur[1]; nb[2] = cur[2];
            nb[axis] += sign;
            const nm = at(nb);
            if (nm) {
              const nbk = mats[nm].bucket;
              if (!transparent && !TRANSPARENT[nbk]) continue;
              if (transparent && (nbk === mat.bucket || !TRANSPARENT[nbk])) continue;
            }
            if (!transparent && grounded && axis === 1 && sign === -1 && cur[1] + oy === 0) continue;
            // AO dei 4 angoli (ordine: (0,0) (1,0) (1,1) (0,1) in u,w)
            let ao = 0xff;
            if (mat.bucket === 'solid') {
              ao = 0;
              const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
              corners.forEach(([su, sw], ci) => {
                const s1 = [...nb]; s1[u] += su;
                const s2 = [...nb]; s2[w] += sw;
                const cr = [...nb]; cr[u] += su; cr[w] += sw;
                const o1 = opaque(s1) ? 1 : 0, o2 = opaque(s2) ? 1 : 0, oc = opaque(cr) ? 1 : 0;
                const level = o1 && o2 ? 0 : 3 - (o1 + o2 + oc);
                ao |= level << (ci * 2);
              });
            }
            mask[a2 + b2 * nu] = (m << 8) | ao;
          }
        }
        // 2) fusione greedy dei rettangoli uniformi
        for (let b2 = 0; b2 < nw; b2++) {
          for (let a2 = 0; a2 < nu;) {
            const key = mask[a2 + b2 * nu];
            if (key < 0) { a2++; continue; }
            const ao = key & 0xff;
            const uniform = ao === 0xff || ao === 0 || ao === 0x55 || ao === 0xaa;
            let wdt = 1, hgt = 1;
            if (uniform) {
              while (a2 + wdt < nu && mask[a2 + wdt + b2 * nu] === key) wdt++;
              outer: while (b2 + hgt < nw) {
                for (let x = 0; x < wdt; x++) if (mask[a2 + x + (b2 + hgt) * nu] !== key) break outer;
                hgt++;
              }
            }
            for (let y = 0; y < hgt; y++) for (let x = 0; x < wdt; x++) mask[a2 + x + (b2 + y) * nu] = -1;
            const mat = mats[key >> 8];
            const out = (outs[mat.bucket] ??= { pos: [], nor: [], col: [], ind: [] });
            const base = out.pos.length / 3;
            const plane = d + (sign > 0 ? 1 : 0);
            const quad = [[a2, b2], [a2 + wdt, b2], [a2 + wdt, b2 + hgt], [a2, b2 + hgt]];
            const levels = [0, 1, 2, 3].map((ci) => (ao === 0xff ? 3 : (ao >> (ci * 2)) & 3));
            for (let ci = 0; ci < 4; ci++) {
              const p = [0, 0, 0];
              p[axis] = plane; p[u] = quad[ci][0]; p[w] = quad[ci][1];
              out.pos.push((p[0] + ox) * scale, (p[1] + oy) * scale, (p[2] + oz) * scale);
              const n = [0, 0, 0]; n[axis] = sign;
              out.nor.push(n[0], n[1], n[2]);
              col.copy(mat.color).multiplyScalar(AO_LEVELS[levels[ci]]);
              out.col.push(col.r, col.g, col.b);
            }
            // orientamento: (u,w) è destrorso con l'asse → CCW per sign>0
            const flip = levels[0] + levels[2] < levels[1] + levels[3];
            const tri = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
            if (sign < 0) for (let t = 0; t < 6; t += 3) [tri[t + 1], tri[t + 2]] = [tri[t + 2], tri[t + 1]];
            for (const t of tri) out.ind.push(base + t);
            a2 += wdt;
          }
        }
      }
    }
  }

  const result: BucketGeometries = {};
  for (const [bucket, out] of Object.entries(outs) as [Bucket, Out][]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
    g.setIndex(out.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(out.ind, 1) : new THREE.Uint16BufferAttribute(out.ind, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    result[bucket] = g;
  }
  return result;
}
