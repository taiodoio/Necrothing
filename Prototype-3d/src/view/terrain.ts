// Terreno continuo: la mappa logica (MAP_SIZE) è circondata da FOREST_MARGIN
// celle di bosco, così a schermo il suolo non "finisce" mai.
//  • altezze: dentro il recinto colline dolci e ondulazioni (piatte vicino al
//    recinto), fuori il terreno sale verso il bosco. Sotto ogni oggetto c'è un
//    "pad" piano (tombe, sentieri ed edifici non galleggiano né affondano);
//  • voxel/miniatura: colonne a gradini (2 per cella) con facce superiori fuse
//    e una texture per chunk;
//  • low-poly: superficie sfaccettata (4 triangoli per cella attorno al
//    centro, vertici leggermente irregolari) con colore per faccia.

import * as THREE from 'three';
import { FOREST_MARGIN, MAP_SIZE } from '../game/balance.ts';
import { hash3 } from '../game/rng.ts';
import type { ArtStyle } from '../game/state.ts';
import type { Rect } from '../game/world.ts';
import { P } from '../render/palette.ts';

export const CHUNK = 12; // celle per lato di un chunk
const COLS = 2; // colonne di altezza per cella
export const STEP = 0.05; // altezza di un gradino (quantizzazione delle altezze)
export const WORLD_MIN = -FOREST_MARGIN; // in celle logiche
export const WORLD_MAX = MAP_SIZE + FOREST_MARGIN;

export type Ground = 'grass' | 'wild' | 'forest' | 'path' | 'dirt' | 'mud' | 'plot' | 'fence';

export interface GroundInput {
  seed: number;
  area: Rect;
  overrides: Map<string, Ground>;
  /** Altezza piana sotto gli oggetti (cella → altezza mondo). */
  pads: Map<string, number>;
}

function groundAt(input: GroundInput, cx: number, cy: number): Ground {
  const o = input.overrides.get(`${cx},${cy}`);
  if (o) return o;
  if (cx < 0 || cy < 0 || cx >= MAP_SIZE || cy >= MAP_SIZE) return 'forest';
  const a = input.area;
  if (cx >= a.x && cy >= a.y && cx < a.x + a.w && cy < a.y + a.h) return 'grass';
  return 'wild';
}

export function lowNoise(x: number, y: number, seed: number, scale: number): number {
  const fx = x / scale, fy = y / scale;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash3(ix, iy, 0, seed), b = hash3(ix + 1, iy, 0, seed);
  const c = hash3(ix, iy + 1, 0, seed), d = hash3(ix + 1, iy + 1, 0, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const q = (h: number) => Math.round(h / STEP) * STEP;
const smooth = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/**
 * Collinette: una ogni ~9 celle (griglia con jitter, 65% di probabilità),
 * profilo morbido (1 − d²)². Dipende solo dalle coordinate di mappa, così
 * allargando il recinto le colline esistenti restano dove sono.
 */
function hillField(seed: number, x: number, y: number): number {
  const G = 9;
  let h = 0;
  const gx = Math.floor(x / G), gy = Math.floor(y / G);
  for (let j = gy - 1; j <= gy + 1; j++) {
    for (let i = gx - 1; i <= gx + 1; i++) {
      if (hash3(i, j, 1, seed) < 0.35) continue;
      const hx = (i + 0.2 + hash3(i, j, 2, seed) * 0.6) * G, hy = (j + 0.2 + hash3(i, j, 3, seed) * 0.6) * G;
      const rad = 4 + hash3(i, j, 4, seed) * 3.5;
      const amp = 0.7 + hash3(i, j, 5, seed) * 1.0;
      const d = Math.hypot(x - hx, y - hy) / rad;
      if (d < 1) { const k = 1 - d * d; h += amp * k * k; }
    }
  }
  return h;
}

/** Altezza naturale (senza pad) di una cella, in unità mondo. */
export function naturalHeight(input: GroundInput, cx: number, cy: number): number {
  const g = groundAt(input, cx, cy);
  if (g === 'fence') return 0;
  if (g === 'mud') return -STEP;
  const a = input.area;
  const inside = cx >= a.x && cy >= a.y && cx < a.x + a.w && cy < a.y + a.h;
  if (inside) {
    const dIn = Math.min(cx - a.x, a.x + a.w - 1 - cx, cy - a.y, a.y + a.h - 1 - cy);
    const fade = smooth(0, 3.5, dIn);
    const h = hillField(input.seed, cx + 0.5, cy + 0.5) + (lowNoise(cx, cy, input.seed + 3, 7) - 0.5) * 0.35;
    return q(Math.max(-0.1, h * fade));
  }
  const dOut = Math.max(a.x - cx, cx - (a.x + a.w - 1), a.y - cy, cy - (a.y + a.h - 1)) - 1;
  const far = Math.min(1, Math.max(0, dOut) / 6);
  let h = far * 0.45 + hillField(input.seed + 7, cx + 0.5, cy + 0.5) * far * 1.1 + (lowNoise(cx, cy, input.seed, 5) - 0.5) * 0.2 * far;
  if (g === 'dirt' || g === 'path') h *= 0.35;
  return q(h);
}

/** Altezza di una cella: il pad dell'oggetto che la occupa, o quella naturale. */
export function cellHeight(input: GroundInput, cx: number, cy: number): number {
  return input.pads.get(`${cx},${cy}`) ?? naturalHeight(input, cx, cy);
}

/** Altezza di un vertice d'angolo (gx,gy): media dei pad se ce ne sono, altrimenti delle celle. */
export function cornerHeight(input: GroundInput, gx: number, gy: number): number {
  let ps = 0, pn = 0, ns = 0;
  for (const [cx, cy] of [[gx - 1, gy - 1], [gx, gy - 1], [gx - 1, gy], [gx, gy]]) {
    const p = input.pads.get(`${cx},${cy}`);
    if (p !== undefined) { ps += p; pn++; } else ns += naturalHeight(input, cx, cy);
  }
  return pn ? ps / pn : ns / 4;
}

/** Spostamento orizzontale irregolare dei vertici d'angolo del terreno low-poly. */
function cornerJitter(input: GroundInput, gx: number, gy: number): [number, number] {
  return [(hash3(gx, gy, 41, input.seed) - 0.5) * 0.28, (hash3(gx, gy, 43, input.seed) - 0.5) * 0.28];
}

/**
 * Quota del suolo in un punto del mondo (per personaggi, alberi, fuochi
 * fatui). Nei due stili "a gradini" è piana per cella; in low-poly segue i
 * triangoli della superficie (ventaglio attorno al centro della cella).
 */
export function surfaceHeight(input: GroundInput, style: ArtStyle, wx: number, wz: number): number {
  const half = MAP_SIZE / 2;
  const u = wx + half, v = wz + half;
  const cx = Math.floor(u), cy = Math.floor(v);
  if (style !== 'lowpoly') return cellHeight(input, cx, cy);
  const fx = u - cx - 0.5, fy = v - cy - 0.5;
  const hc = cellHeight(input, cx, cy);
  let a: [number, number, number], b: [number, number, number];
  if (Math.abs(fx) >= Math.abs(fy)) {
    const gx = fx > 0 ? cx + 1 : cx;
    a = [gx - cx - 0.5, cy - cy - 0.5, cornerHeight(input, gx, cy)];
    b = [gx - cx - 0.5, 0.5, cornerHeight(input, gx, cy + 1)];
  } else {
    const gy = fy > 0 ? cy + 1 : cy;
    a = [-0.5, gy - cy - 0.5, cornerHeight(input, cx, gy)];
    b = [0.5, gy - cy - 0.5, cornerHeight(input, cx + 1, gy)];
  }
  // interpolazione baricentrica nel triangolo (centro, a, b)
  const det = a[0] * b[1] - b[0] * a[1];
  if (Math.abs(det) < 1e-6) return hc;
  const la = (fx * b[1] - b[0] * fy) / det, lb = (a[0] * fy - fx * a[1]) / det;
  return hc + la * (a[2] - hc) + lb * (b[2] - hc);
}

const C = (hex: string) => new THREE.Color(hex);
const GRASS_A = C(P.grass), GRASS_B = C(P.grassDark), GRASS_DRY = C('#5b5a33'), MOSS = C(P.moss);
const WILD_A = C('#2c3826'), WILD_B = C('#3a3a26'), WILD_DRY = C('#4f4428'), LEAF = C('#5a3a20');
const EARTH_A = C(P.earth), EARTH_B = C(P.earthDark), MUD = C(P.mud), STONE = C('#4c4a47');
const tmp = new THREE.Color();
// palette "Stylized Gothic Low-Poly"
const LP = {
  grassA: C('#354839'), grassB: C('#3f5536'), moss: C('#61745a'), dry: C('#8d805c'), soil: C('#534238'),
  soilDark: C('#3f3129'), wildA: C('#2f3b2c'), wildB: C('#3c3d2b'), leaf: C('#6a4a2c'), mud: C('#3a2f27'), stone: C('#4a4a49'),
};

/** Colore di un "pixel" di terreno (px,py in coordinate pixel, ppc = pixel per cella). */
function groundColor(input: GroundInput, px: number, py: number, ppc: number): THREE.Color {
  const cx = Math.floor(px / ppc), cy = Math.floor(py / ppc);
  const g = groundAt(input, cx, cy);
  // rumore in unità di "voxel di terreno" (16 per cella) per coerenza fra chunk
  const s = 16 / ppc;
  const vx = px * s, vy = py * s;
  const h = hash3(Math.floor(vx), Math.floor(vy), 3, input.seed);
  const n1 = lowNoise(vx, vy, input.seed + 5, 22);
  const n2 = lowNoise(vx, vy, input.seed + 11, 60);
  const n3 = lowNoise(vx, vy, input.seed + 17, 6);
  switch (g) {
    case 'path': tmp.copy(EARTH_B).lerp(STONE, n3 * 0.5); break;
    case 'dirt': tmp.copy(EARTH_A).lerp(EARTH_B, n1); break;
    case 'mud': tmp.copy(MUD).lerp(EARTH_B, n3 * 0.4); break;
    case 'plot': tmp.copy(EARTH_A); break;
    case 'fence': tmp.copy(EARTH_B).lerp(GRASS_B, 0.35 + n3 * 0.5); break;
    case 'forest':
    case 'wild':
      tmp.copy(WILD_A).lerp(WILD_B, n1);
      if (n2 > 0.55) tmp.lerp(WILD_DRY, (n2 - 0.55) * 1.6);
      if (n3 > 0.7) tmp.lerp(LEAF, (n3 - 0.7) * 1.5);
      break;
    default:
      tmp.copy(GRASS_B).lerp(GRASS_A, 0.3 + n1 * 0.7);
      if (n2 > 0.6) tmp.lerp(GRASS_DRY, (n2 - 0.6) * 1.5);
      if (n2 < 0.25) tmp.lerp(MOSS, (0.25 - n2) * 1.1);
      if (n3 > 0.8) tmp.lerp(LEAF, (n3 - 0.8) * 1.2);
  }
  return tmp.multiplyScalar(1 + (h - 0.5) * 0.12);
}

export interface ChunkMesh {
  geometry: THREE.BufferGeometry;
  /** Texture del suolo (stili a gradini); null in low-poly (colore per faccia). */
  texture: THREE.DataTexture | null;
}

/** Colore di una faccia del terreno low-poly. */
function lowpolyColor(input: GroundInput, cx: number, cy: number, face: number, out: THREE.Color): THREE.Color {
  const g = groundAt(input, cx, cy);
  const n1 = lowNoise(cx, cy, input.seed + 5, 6);
  const n2 = lowNoise(cx, cy, input.seed + 11, 7);
  const patch = lowNoise(cx * 2 + (face & 1), cy * 2 + (face >> 1), input.seed + 21, 5);
  const h = hash3(cx * 4 + face, cy, 77, input.seed);
  switch (g) {
    case 'path': out.copy(LP.soilDark).lerp(LP.stone, 0.25 + h * 0.2); break;
    case 'dirt': out.copy(LP.soil).lerp(LP.soilDark, n1); break;
    case 'mud': out.copy(LP.mud); break;
    case 'plot': out.copy(LP.soil); break;
    case 'fence': out.copy(LP.soilDark).lerp(LP.grassA, 0.5 + h * 0.3); break;
    case 'forest':
    case 'wild':
      out.copy(LP.wildA).lerp(LP.wildB, n1);
      if (n2 > 0.55) out.lerp(LP.dry, (n2 - 0.55) * 0.9);
      if (patch > 0.7) out.lerp(LP.leaf, (patch - 0.7) * 1.6);
      break;
    default:
      out.copy(LP.grassA).lerp(LP.grassB, n1);
      if (n2 > 0.62) out.lerp(LP.dry, (n2 - 0.62) * 1.1);
      if (n2 < 0.3) out.lerp(LP.moss, (0.3 - n2) * 0.9);
      if (patch > 0.78) out.lerp(LP.soil, Math.min(0.85, (patch - 0.78) * 4));
  }
  return out.multiplyScalar(0.97 + h * 0.06);
}

/** Chunk low-poly: 4 triangoli per cella attorno al centro, colore per faccia. */
function buildLowpolyChunk(input: GroundInput, cx0: number, cy0: number): ChunkMesh {
  const half = MAP_SIZE / 2;
  const pos: number[] = [], col: number[] = [];
  const c = new THREE.Color();
  const corner = (gx: number, gy: number): [number, number, number] => {
    const [jx, jz] = cornerJitter(input, gx, gy);
    return [gx - half + jx, cornerHeight(input, gx, gy), gy - half + jz];
  };
  for (let cy = cy0; cy < cy0 + CHUNK; cy++) {
    for (let cx = cx0; cx < cx0 + CHUNK; cx++) {
      const center: [number, number, number] = [cx + 0.5 - half, cellHeight(input, cx, cy), cy + 0.5 - half];
      const k00 = corner(cx, cy), k10 = corner(cx + 1, cy), k11 = corner(cx + 1, cy + 1), k01 = corner(cx, cy + 1);
      // ordine antiorario visto dall'alto (+y)
      const tris = [[center, k10, k00], [center, k11, k10], [center, k01, k11], [center, k00, k01]];
      tris.forEach((t, face) => {
        lowpolyColor(input, cx, cy, face, c);
        for (const v of t) { pos.push(v[0], v[1], v[2]); col.push(c.r, c.g, c.b); }
      });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return { geometry: g, texture: null };
}

/** Costruisce il chunk che parte dalla cella (cx0, cy0). */
export function buildChunk(input: GroundInput, cx0: number, cy0: number, style: ArtStyle): ChunkMesh {
  if (style === 'lowpoly') return buildLowpolyChunk(input, cx0, cy0);
  const inside = cx0 >= 0 && cy0 >= 0 && cx0 < MAP_SIZE && cy0 < MAP_SIZE;
  const ppc = inside ? 16 : 8;
  const tsize = CHUNK * ppc;
  const data = new Uint8Array(tsize * tsize * 4);
  const lin = new THREE.Color();
  for (let y = 0; y < tsize; y++) {
    for (let x = 0; x < tsize; x++) {
      lin.copy(groundColor(input, cx0 * ppc + x, cy0 * ppc + y, ppc)).convertLinearToSRGB();
      const o = ((tsize - 1 - y) * tsize + x) * 4;
      data[o] = Math.min(255, lin.r * 255); data[o + 1] = Math.min(255, lin.g * 255); data[o + 2] = Math.min(255, lin.b * 255); data[o + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, tsize, tsize, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = style === 'voxel' ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const n = CHUNK * COLS;
  const i0 = cx0 * COLS, j0 = cy0 * COLS;
  const H = (i: number, j: number) => Math.round(cellHeight(input, Math.floor(i / COLS), Math.floor(j / COLS)) / STEP);
  const heights = new Int16Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) heights[j * n + i] = H(i0 + i, j0 + j);
  const half = MAP_SIZE / 2;
  const cw = 1 / COLS;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], col: number[] = [];
  const toUV = (x: number, z: number) => [(x + half - cx0) / CHUNK, 1 - (z + half - cy0) / CHUNK];
  const push = (v: number[][], normal: number[], shade: number, uvs?: number[][]) => {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(v[k][0], v[k][1], v[k][2]);
      nor.push(normal[0], normal[1], normal[2]);
      const t = uvs ? uvs[k] : toUV(v[k][0], v[k][2]);
      uv.push(t[0], t[1]);
      col.push(shade, shade, shade);
    }
  };

  // superfici superiori fuse (greedy) per altezza uguale
  const done = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n;) {
      if (done[j * n + i]) { i++; continue; }
      const h = heights[j * n + i];
      let w = 1, d = 1;
      while (i + w < n && !done[j * n + i + w] && heights[j * n + i + w] === h) w++;
      outer: while (j + d < n) {
        for (let k = 0; k < w; k++) if (done[(j + d) * n + i + k] || heights[(j + d) * n + i + k] !== h) break outer;
        d++;
      }
      for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) done[(j + y) * n + i + x] = 1;
      const x0 = (i0 + i) * cw - half, x1 = (i0 + i + w) * cw - half;
      const z0 = (j0 + j) * cw - half, z1 = (j0 + j + d) * cw - half;
      const y = h * STEP;
      push([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], 1);
      i += w;
    }
  }
  // pareti tra colonne di altezza diversa (anche verso i chunk vicini)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const h = heights[j * n + i];
      const gi = i0 + i, gj = j0 + j;
      const x0 = gi * cw - half, x1 = x0 + cw, z0 = gj * cw - half, z1 = z0 + cw;
      const top = toUV(x0 + cw / 2, z0 + cw / 2);
      const uvs = [top, top, top, top];
      const sides: Array<[number, number, number[]]> = [[gi + 1, gj, [1, 0, 0]], [gi - 1, gj, [-1, 0, 0]], [gi, gj + 1, [0, 0, 1]], [gi, gj - 1, [0, 0, -1]]];
      for (const [ni, nj, nrm] of sides) {
        const inChunk = ni >= i0 && ni < i0 + n && nj >= j0 && nj < j0 + n;
        const nh = inChunk ? heights[(nj - j0) * n + (ni - i0)] : H(ni, nj);
        if (nh >= h) continue;
        const y = h * STEP, yb = nh * STEP;
        let v: number[][];
        if (nrm[0] === 1) v = [[x1, yb, z1], [x1, yb, z0], [x1, y, z0], [x1, y, z1]];
        else if (nrm[0] === -1) v = [[x0, yb, z0], [x0, yb, z1], [x0, y, z1], [x0, y, z0]];
        else if (nrm[2] === 1) v = [[x0, yb, z1], [x1, yb, z1], [x1, y, z1], [x0, y, z1]];
        else v = [[x1, yb, z0], [x0, yb, z0], [x0, y, z0], [x1, y, z0]];
        push(v, nrm, 1, uvs);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return { geometry: g, texture };
}

/** Altezza del suolo (unità mondo) di una cella logica. */
export function groundHeightAtCell(input: GroundInput, cx: number, cy: number): number {
  return cellHeight(input, cx, cy);
}

export function groundType(input: GroundInput, cx: number, cy: number): Ground {
  return groundAt(input, cx, cy);
}
