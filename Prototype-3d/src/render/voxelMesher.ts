// Mesher "Gothic Voxel": rasterizza le primitive in una griglia di voxel,
// poi emette solo le facce visibili (face culling) con occlusione ambientale
// per vertice e una lieve variazione di colore deterministica per voxel.
// Le facce a contatto col terreno (y<0) ricevono AO: le basi "si siedono".

import * as THREE from 'three';
import { hash3 } from '../game/rng.ts';
import { insideLocal, primBounds, VOX, type Bucket, type Model } from './shape.ts';

export type BucketGeometries = Partial<Record<Bucket, THREE.BufferGeometry>>;

interface Mat { color: THREE.Color; bucket: Bucket; jitter: number }

const AO_LEVELS = [0.42, 0.62, 0.8, 1];

// Facce: [asse, segno, 4 angoli CCW visti dall'esterno]
const FACES: Array<{ axis: 0 | 1 | 2; sign: 1 | -1; corners: number[][] }> = [
  { axis: 0, sign: 1, corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { axis: 0, sign: -1, corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { axis: 1, sign: 1, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { axis: 1, sign: -1, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { axis: 2, sign: 1, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { axis: 2, sign: -1, corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

const TRANSPARENT: Record<Bucket, boolean> = { solid: false, glow: false, water: true, ghost: true };

export function meshVoxels(model: Model, seed = 0, grounded = true): BucketGeometries {
  // Rasterizzazione conservativa: un box più sottile di un voxel occupa
  // comunque lo strato di voxel che contiene il suo centro (sbarre, aste).
  const prims = model.prims.filter((p) => p.only !== 'miniature').map((p) => {
    if (p.kind !== 'box') return p;
    let min = p.min, max = p.max;
    for (let a = 0; a < 3; a++) {
      if (max[a] - min[a] >= 1) continue;
      const lo = Math.floor((min[a] + max[a]) / 2);
      min = [...min] as [number, number, number]; max = [...max] as [number, number, number];
      min[a] = lo; max[a] = lo + 1;
    }
    return min === p.min && max === p.max ? p : { ...p, min, max };
  });
  const additive = prims.filter((p) => !p.carve);
  if (additive.length === 0) return {};

  const bounds = new THREE.Box3();
  for (const p of additive) bounds.union(primBounds(p));
  const ox = Math.floor(bounds.min.x) - 1, oy = Math.floor(bounds.min.y) - 1, oz = Math.floor(bounds.min.z) - 1;
  const nx = Math.ceil(bounds.max.x) - ox + 1, ny = Math.ceil(bounds.max.y) - oy + 1, nz = Math.ceil(bounds.max.z) - oz + 1;
  const grid = new Uint16Array(nx * ny * nz);
  const idx = (i: number, j: number, k: number) => i + nx * (j + ny * k);

  const mats: Mat[] = [{ color: new THREE.Color(), bucket: 'solid', jitter: 0 }];
  const matKey = new Map<string, number>();
  const inv = new THREE.Matrix4();
  const v = new THREE.Vector3();

  for (const p of prims) {
    let mi = 0;
    if (!p.carve) {
      const key = `${p.color}|${p.bucket ?? 'solid'}|${p.jitter ?? 0.07}`;
      mi = matKey.get(key) ?? 0;
      if (!mi) {
        mi = mats.length;
        mats.push({ color: new THREE.Color(p.color), bucket: p.bucket ?? 'solid', jitter: p.jitter ?? 0.07 });
        matKey.set(key, mi);
      }
    }
    const b = primBounds(p);
    const i0 = Math.max(0, Math.floor(b.min.x) - ox), i1 = Math.min(nx - 1, Math.ceil(b.max.x) - ox);
    const j0 = Math.max(0, Math.floor(b.min.y) - oy), j1 = Math.min(ny - 1, Math.ceil(b.max.y) - oy);
    const k0 = Math.max(0, Math.floor(b.min.z) - oz), k1 = Math.min(nz - 1, Math.ceil(b.max.z) - oz);
    const identity = p.matrix.equals(new THREE.Matrix4());
    if (!identity) inv.copy(p.matrix).invert();
    for (let k = k0; k <= k1; k++) {
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          v.set(i + ox + 0.5, j + oy + 0.5, k + oz + 0.5);
          if (!identity) v.applyMatrix4(inv);
          if (insideLocal(p, v.x, v.y, v.z)) grid[idx(i, j, k)] = mi;
        }
      }
    }
  }

  const at = (i: number, j: number, k: number) =>
    i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? 0 : grid[idx(i, j, k)];
  const opaque = (i: number, j: number, k: number) => {
    if (grounded && j + oy < 0) return true;
    const m = at(i, j, k);
    return m !== 0 && !TRANSPARENT[mats[m].bucket];
  };

  type Out = { pos: number[]; nor: number[]; col: number[]; ind: number[] };
  const outs: Partial<Record<Bucket, Out>> = {};
  const c = new THREE.Color();
  const n3 = [0, 0, 0];
  const e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const m = grid[idx(i, j, k)];
        if (!m) continue;
        const mat = mats[m];
        const transparent = TRANSPARENT[mat.bucket];
        const wx = i + ox, wy = j + oy, wz = k + oz;
        const shade = 1 + (hash3(wx, wy, wz, seed) - 0.5) * 2 * mat.jitter;
        for (const f of FACES) {
          n3[0] = n3[1] = n3[2] = 0;
          n3[f.axis] = f.sign;
          const ni = i + n3[0], nj = j + n3[1], nk = k + n3[2];
          const nm = at(ni, nj, nk);
          if (nm) {
            const nb = mats[nm].bucket;
            if (!transparent && !TRANSPARENT[nb]) continue;
            if (transparent && (nb === mat.bucket || !TRANSPARENT[nb])) continue;
          }
          if (!transparent && grounded && f.axis === 1 && f.sign === -1 && wy === 0) continue; // faccia sotto al terreno
          const out = (outs[mat.bucket] ??= { pos: [], nor: [], col: [], ind: [] });
          const base = out.pos.length / 3;
          const u = (f.axis + 1) % 3, w = (f.axis + 2) % 3;
          const ao: number[] = [];
          for (const co of f.corners) {
            out.pos.push((wx + co[0]) * VOX, (wy + co[1]) * VOX, (wz + co[2]) * VOX);
            out.nor.push(n3[0], n3[1], n3[2]);
            let level = 3;
            if (mat.bucket === 'solid') {
              const su = co[u] ? 1 : -1, sw = co[w] ? 1 : -1;
              const bi = i + n3[0], bj = j + n3[1], bk = k + n3[2];
              const s1 = opaque(bi + su * e[u][0], bj + su * e[u][1], bk + su * e[u][2]) ? 1 : 0;
              const s2 = opaque(bi + sw * e[w][0], bj + sw * e[w][1], bk + sw * e[w][2]) ? 1 : 0;
              const cr = opaque(bi + su * e[u][0] + sw * e[w][0], bj + su * e[u][1] + sw * e[w][1], bk + su * e[u][2] + sw * e[w][2]) ? 1 : 0;
              level = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
            }
            ao.push(level);
            const f2 = shade * AO_LEVELS[level];
            c.copy(mat.color).multiplyScalar(f2);
            out.col.push(c.r, c.g, c.b);
          }
          if (ao[0] + ao[2] < ao[1] + ao[3]) out.ind.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          else out.ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
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
