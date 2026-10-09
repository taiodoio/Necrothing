// DSL di forme procedurali. Un modello è una lista di primitive (box,
// cilindri/coni, ellissoidi, prismi-tetto, archi) espresse in UNITÀ VOXEL,
// con una trasformazione locale e un colore. Lo stesso modello viene
// convertito in geometria da due mesher diversi:
//   • voxelMesher  → cubetti con occlusione ambientale (stile "Gothic Voxel")
//   • lowpolyMesher → solidi sfaccettati irregolari (stile "Miniatura")
// Così ogni asset ha UNA definizione logica e due rappresentazioni coerenti
// (stesse dimensioni, stesso pivot).

import * as THREE from 'three';
import { createRng, type Rng } from '../game/rng.ts';

/** Voxel per cella logica (1 cella = 1 unità mondo). */
export const V = 10;
export const VOX = 1 / V;

export type Bucket = 'solid' | 'glow' | 'water' | 'ghost';

export interface PrimOpts {
  bucket?: Bucket;
  /** Rumore di luminosità per voxel/faccia (0..0.3). */
  jitter?: number;
  /** Sottrae volume invece di aggiungerlo (incisioni, finestre, porte). */
  carve?: boolean;
  /** Con carve: taglio strutturale (scheggiature, buche) ignorato in miniatura. */
  cut?: boolean;
  /** Segmenti preferiti per il mesher low-poly. */
  seg?: number;
  /** Irregolarità dei vertici nel mesher low-poly (voxel). */
  rough?: number;
  /** Escluso dalla resa voxel (dettagli solo miniatura) o viceversa. */
  only?: 'voxel' | 'miniature';
}

interface PrimCommon extends PrimOpts {
  color: string;
  matrix: THREE.Matrix4;
}

export type Prim =
  | (PrimCommon & { kind: 'box'; min: [number, number, number]; max: [number, number, number] })
  | (PrimCommon & { kind: 'cyl'; cx: number; cz: number; y0: number; y1: number; r0: number; r1: number; rz0: number; rz1: number })
  | (PrimCommon & { kind: 'ell'; c: [number, number, number]; r: [number, number, number] })
  | (PrimCommon & { kind: 'wedge'; min: [number, number, number]; max: [number, number, number]; ridge: 'x' | 'z'; shed?: boolean })
  | (PrimCommon & { kind: 'ring'; cx: number; cy: number; z0: number; z1: number; rIn: number; rOut: number });

export interface LightAnchor {
  pos: [number, number, number]; // unità voxel nel modello
  color: string;
  intensity: number;
  range: number; // unità mondo
  flicker: number; // 0 = fissa
  /** Mostra un alone (sprite additivo). */
  halo: number;
}

export interface Model {
  prims: Prim[];
  lights: LightAnchor[];
}

export class ModelBuilder {
  readonly prims: Prim[] = [];
  readonly lights: LightAnchor[] = [];
  readonly rng: Rng;
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];

  constructor(seed: number | string) {
    this.rng = createRng(seed);
  }

  private get m() { return this.stack[this.stack.length - 1]; }

  /** Apre una trasformazione locale: traslazione (voxel) + rotazioni (radianti). */
  push(t: [number, number, number] = [0, 0, 0], ry = 0, rx = 0, rz = 0): this {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...t),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')),
      new THREE.Vector3(1, 1, 1),
    );
    this.stack.push(this.m.clone().multiply(local));
    return this;
  }

  pop(): this {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }

  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string, o: PrimOpts = {}): this {
    this.prims.push({ kind: 'box', min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)], color, matrix: this.m.clone(), ...o });
    return this;
  }

  /** Box centrato in x/z, poggiato su y0. */
  block(cx: number, y0: number, cz: number, w: number, h: number, d: number, color: string, o: PrimOpts = {}): this {
    return this.box(cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, color, o);
  }

  /** Cilindro/cono lungo Y: raggio r0 alla base, r1 in cima (rz per ellissi). */
  cyl(cx: number, cz: number, y0: number, y1: number, r0: number, r1 = r0, color = '#fff', o: PrimOpts = {}, rz0 = r0, rz1 = r1): this {
    this.prims.push({ kind: 'cyl', cx, cz, y0, y1, r0, r1, rz0, rz1, color, matrix: this.m.clone(), ...o });
    return this;
  }

  ell(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: string, o: PrimOpts = {}): this {
    this.prims.push({ kind: 'ell', c: [cx, cy, cz], r: [rx, ry, rz], color, matrix: this.m.clone(), ...o });
    return this;
  }

  /** Prisma a sezione triangolare (tetto a capanna), colmo lungo `ridge`. */
  wedge(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, ridge: 'x' | 'z', color: string, o: PrimOpts & { shed?: boolean } = {}): this {
    this.prims.push({ kind: 'wedge', min: [x0, y0, z0], max: [x1, y1, z1], ridge, color, matrix: this.m.clone(), ...o });
    return this;
  }

  /** Arco: semi-anello nel piano XY tra z0 e z1, centro (cx, cy). */
  ring(cx: number, cy: number, z0: number, z1: number, rIn: number, rOut: number, color: string, o: PrimOpts = {}): this {
    this.prims.push({ kind: 'ring', cx, cy, z0, z1, rIn, rOut, color, matrix: this.m.clone(), ...o });
    return this;
  }

  light(x: number, y: number, z: number, color: string, intensity = 1, range = 4, flicker = 0.15, halo = 1): this {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(this.m);
    this.lights.push({ pos: [p.x, p.y, p.z], color, intensity, range, flicker, halo });
    return this;
  }

  build(): Model {
    return { prims: this.prims, lights: this.lights };
  }
}

/** AABB (in voxel, spazio modello) di una primitiva trasformata. */
export function primBounds(p: Prim): THREE.Box3 {
  const local = new THREE.Box3();
  switch (p.kind) {
    case 'box':
    case 'wedge':
      local.set(new THREE.Vector3(...p.min), new THREE.Vector3(...p.max));
      break;
    case 'cyl': {
      const r = Math.max(p.r0, p.r1), rz = Math.max(p.rz0, p.rz1);
      local.set(new THREE.Vector3(p.cx - r, p.y0, p.cz - rz), new THREE.Vector3(p.cx + r, p.y1, p.cz + rz));
      break;
    }
    case 'ell':
      local.set(new THREE.Vector3(p.c[0] - p.r[0], p.c[1] - p.r[1], p.c[2] - p.r[2]), new THREE.Vector3(p.c[0] + p.r[0], p.c[1] + p.r[1], p.c[2] + p.r[2]));
      break;
    case 'ring':
      local.set(new THREE.Vector3(p.cx - p.rOut, p.cy, p.z0), new THREE.Vector3(p.cx + p.rOut, p.cy + p.rOut, p.z1));
      break;
  }
  return local.applyMatrix4(p.matrix);
}

/** Test di appartenenza in coordinate LOCALI della primitiva. */
export function insideLocal(p: Prim, x: number, y: number, z: number): boolean {
  switch (p.kind) {
    case 'box':
      return x >= p.min[0] && x < p.max[0] && y >= p.min[1] && y < p.max[1] && z >= p.min[2] && z < p.max[2];
    case 'cyl': {
      if (y < p.y0 || y >= p.y1) return false;
      const t = (y - p.y0) / Math.max(1e-6, p.y1 - p.y0);
      const r = p.r0 + (p.r1 - p.r0) * t;
      const rz = p.rz0 + (p.rz1 - p.rz0) * t;
      if (r <= 0 || rz <= 0) return false;
      const dx = (x - p.cx) / r, dz = (z - p.cz) / rz;
      return dx * dx + dz * dz <= 1;
    }
    case 'ell': {
      const dx = (x - p.c[0]) / p.r[0], dy = (y - p.c[1]) / p.r[1], dz = (z - p.c[2]) / p.r[2];
      return dx * dx + dy * dy + dz * dz <= 1;
    }
    case 'wedge': {
      const [x0, y0, z0] = p.min, [x1, y1, z1] = p.max;
      if (x < x0 || x >= x1 || y < y0 || y >= y1 || z < z0 || z >= z1) return false;
      const h = y1 - y0;
      if (p.ridge === 'x') {
        const half = (z1 - z0) / 2;
        const d = p.shed ? (z - z0) / (z1 - z0) : Math.abs(z - (z0 + half)) / half;
        return y - y0 <= h * (1 - d) + 0.5;
      }
      const half = (x1 - x0) / 2;
      const d = p.shed ? (x - x0) / (x1 - x0) : Math.abs(x - (x0 + half)) / half;
      return y - y0 <= h * (1 - d) + 0.5;
    }
    case 'ring': {
      if (z < p.z0 || z >= p.z1 || y < p.cy) return false;
      const d = Math.hypot(x - p.cx, y - p.cy);
      return d >= p.rIn && d <= p.rOut;
    }
  }
}
