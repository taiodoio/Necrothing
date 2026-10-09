// Mesher "Miniatura" (illustrated low-poly): ogni primitiva diventa un solido
// sfaccettato con pochi segmenti, vertici leggermente irregolari (stessa
// posizione → stesso spostamento, quindi niente crepe) e colore per faccia.
// Dimensioni e pivot coincidono con la resa voxel.

import * as THREE from 'three';
import { hash3 } from '../game/rng.ts';
import { VOX, type Bucket, type Model, type Prim } from './shape.ts';
import type { BucketGeometries } from './voxelMesher.ts';
import { P } from './palette.ts';

function jitterPositions(g: THREE.BufferGeometry, amount: number, seed: number) {
  if (amount <= 0) return;
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const kx = Math.round(x * 8), ky = Math.round(y * 8), kz = Math.round(z * 8);
    pos.setXYZ(
      i,
      x + (hash3(kx, ky, kz, seed) - 0.5) * amount,
      y + (hash3(ky, kz, kx, seed + 1) - 0.5) * amount * 0.6,
      z + (hash3(kz, kx, ky, seed + 2) - 0.5) * amount,
    );
  }
}

function boxGeometry(min: number[], max: number[]): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  return g;
}

function wedgeGeometry(min: number[], max: number[], ridge: 'x' | 'z', shed: boolean): THREE.BufferGeometry {
  const [x0, y0, z0] = min, [x1, y1, z1] = max;
  let verts: number[][];
  if (ridge === 'x') {
    const zm = shed ? z0 : (z0 + z1) / 2;
    verts = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, zm], [x1, y1, zm]];
  } else {
    const xm = shed ? x0 : (x0 + x1) / 2;
    verts = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [xm, y1, z0], [xm, y1, z1]];
  }
  const tris = ridge === 'x'
    ? [[0, 2, 1], [0, 3, 2], [0, 1, 5], [0, 5, 4], [3, 4, 5], [3, 5, 2], [0, 4, 3], [1, 2, 5]]
    : [[0, 2, 1], [0, 3, 2], [0, 4, 5], [0, 5, 3], [1, 2, 5], [1, 5, 4], [0, 1, 4], [3, 5, 2]];
  const arr: number[] = [];
  for (const t of tris) for (const vi of t) arr.push(...verts[vi]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  // correggi l'orientamento delle facce verso l'esterno
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const c = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 3 + y0 / 3, (z0 + z1) / 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); d.fromBufferAttribute(pos, i + 2);
    n.subVectors(b, a).cross(m.subVectors(d, a));
    m.copy(a).add(b).add(d).multiplyScalar(1 / 3).sub(c);
    if (n.dot(m) < 0) { pos.setXYZ(i + 1, d.x, d.y, d.z); pos.setXYZ(i + 2, b.x, b.y, b.z); }
  }
  return g;
}

function ringGeometry(p: Extract<Prim, { kind: 'ring' }>): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const seg = p.seg ?? 7;
  s.moveTo(p.cx + p.rOut, p.cy);
  for (let i = 1; i <= seg; i++) {
    const a = (Math.PI * i) / seg;
    s.lineTo(p.cx + Math.cos(a) * p.rOut, p.cy + Math.sin(a) * p.rOut);
  }
  s.lineTo(p.cx - p.rIn, p.cy);
  for (let i = seg - 1; i >= 0; i--) {
    const a = (Math.PI * i) / seg;
    s.lineTo(p.cx + Math.cos(a) * p.rIn, p.cy + Math.sin(a) * p.rIn);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: p.z1 - p.z0, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, p.z0);
  return g;
}

function primGeometry(p: Prim, seed: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  switch (p.kind) {
    case 'box':
      g = boxGeometry(p.min, p.max);
      break;
    case 'cyl': {
      const r = Math.max(p.r0, p.r1);
      const seg = p.seg ?? Math.max(5, Math.min(9, Math.round(r * 1.3) + 4));
      g = new THREE.CylinderGeometry(Math.max(0.001, p.r1), Math.max(0.001, p.r0), p.y1 - p.y0, seg, 1);
      g.rotateY(hash3(seed, 3, 7) * Math.PI);
      if (p.r0 > 0 && p.rz0 !== p.r0) g.scale(1, 1, p.rz0 / p.r0);
      g.translate(p.cx, (p.y0 + p.y1) / 2, p.cz);
      break;
    }
    case 'ell': {
      const big = Math.max(...p.r);
      g = new THREE.IcosahedronGeometry(1, p.seg ?? (big > 6 ? 1 : 0));
      g.scale(p.r[0], p.r[1], p.r[2]);
      g.translate(p.c[0], p.c[1], p.c[2]);
      break;
    }
    case 'wedge':
      g = wedgeGeometry(p.min, p.max, p.ridge, !!p.shed);
      break;
    case 'ring':
      g = ringGeometry(p);
      break;
  }
  if (g.index) {
    const ni = g.toNonIndexed();
    g.dispose();
    g = ni;
  }
  jitterPositions(g, p.rough ?? (p.kind === 'box' || p.kind === 'ell' ? 0.45 : 0.25), seed);
  g.applyMatrix4(p.matrix);
  return g;
}

export function meshLowpoly(model: Model, seed = 0): BucketGeometries {
  const out: Partial<Record<Bucket, { pos: number[]; col: number[] }>> = {};
  const color = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  model.prims.forEach((p, index) => {
    if (p.only === 'voxel' || (p.carve && p.cut)) return;
    if (p.carve && p.kind === 'box') {
      // incisione: lastra scura sottile sulla faccia +z (o la più sottile)
      const ext = [p.max[0] - p.min[0], p.max[1] - p.min[1], p.max[2] - p.min[2]];
      const axis = ext.indexOf(Math.min(...ext));
      const min = [...p.min] as [number, number, number], max = [...p.max] as [number, number, number];
      min[axis] = max[axis] - Math.min(ext[axis], 0.9);
      p = { ...p, min, max };
    }
    const bucket: Bucket = p.carve ? 'solid' : (p.bucket ?? 'solid');
    const geo = primGeometry(p, seed * 31 + index);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const o = (out[bucket] ??= { pos: [], col: [] });
    const base = new THREE.Color(p.carve ? P.engrave : p.color);
    const jitter = p.jitter ?? 0.07;
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const cy = (a.y + b.y + c.y) / 3;
      const h = hash3(Math.round(a.x * 3 + b.z), Math.round(cy * 3), Math.round(c.z * 3 + a.x), seed + index);
      const ground = bucket === 'solid' ? Math.min(1, 0.72 + Math.max(0, cy) * 0.06) : 1;
      color.copy(base).multiplyScalar((1 + (h - 0.5) * 2.4 * jitter) * ground);
      for (const v of [a, b, c]) {
        o.pos.push(v.x * VOX, v.y * VOX, v.z * VOX);
        o.col.push(color.r, color.g, color.b);
      }
    }
    geo.dispose();
  });
  const result: BucketGeometries = {};
  for (const [bucket, o] of Object.entries(out) as [Bucket, { pos: number[]; col: number[] }][]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3));
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    result[bucket] = g;
  }
  return result;
}
