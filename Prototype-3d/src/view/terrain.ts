// Terreno continuo: la mappa logica (MAP_SIZE) è circondata da FOREST_MARGIN
// celle di bosco, così a schermo il suolo non "finisce" mai.
//  • geometria: colonne a gradini (2 per cella), facce superiori fuse per
//    altezza uguale (greedy) → pochissimi triangoli sul piano del recinto;
//  • colore: una texture per chunk (8 pixel per cella dentro la mappa, 4 fuori)
//    con NearestFilter in stile voxel e LinearFilter in stile miniatura.

import * as THREE from 'three';
import { FOREST_MARGIN, MAP_SIZE } from '../game/balance.ts';
import { hash3 } from '../game/rng.ts';
import type { ArtStyle } from '../game/state.ts';
import type { Rect } from '../game/world.ts';
import { P } from '../render/palette.ts';

export const CHUNK = 12; // celle per lato di un chunk
const COLS = 2; // colonne di altezza per cella
const STEP = 0.1; // altezza di un gradino
export const WORLD_MIN = -FOREST_MARGIN; // in celle logiche
export const WORLD_MAX = MAP_SIZE + FOREST_MARGIN;

export type Ground = 'grass' | 'wild' | 'forest' | 'path' | 'dirt' | 'mud' | 'plot' | 'fence';

export interface GroundInput {
  seed: number;
  area: Rect;
  overrides: Map<string, Ground>;
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

/** Altezza in gradini della colonna (coordinate colonna, possono essere negative). */
export function columnHeight(input: GroundInput, i: number, j: number): number {
  const cx = Math.floor(i / COLS), cy = Math.floor(j / COLS);
  const g = groundAt(input, cx, cy);
  if (g === 'grass' || g === 'path' || g === 'plot' || g === 'dirt') return 0;
  if (g === 'mud') return -1;
  if (g === 'fence') return lowNoise(i, j, input.seed, 4) > 0.75 ? 1 : 0;
  const n = lowNoise(i, j, input.seed, 5);
  const hill = lowNoise(i, j, input.seed + 9, 16);
  // più ci si allontana dal recinto più il terreno sale dolcemente (bosco)
  const a = input.area;
  const dx = Math.max(a.x - cx, 0, cx - (a.x + a.w)), dy = Math.max(a.y - cy, 0, cy - (a.y + a.h));
  const far = Math.min(1, Math.max(dx, dy) / 10);
  return Math.round(n * 1.0 + Math.max(0, hill - 0.5) * 7 * far + far * 2);
}

const C = (hex: string) => new THREE.Color(hex);
const GRASS_A = C(P.grass), GRASS_B = C(P.grassDark), GRASS_DRY = C('#5b5a33'), MOSS = C(P.moss);
const WILD_A = C('#2c3826'), WILD_B = C('#3a3a26'), WILD_DRY = C('#4f4428'), LEAF = C('#5a3a20');
const FOREST_A = C('#232d20'), FOREST_B = C('#2d2a1e');
const EARTH_A = C(P.earth), EARTH_B = C(P.earthDark), MUD = C(P.mud), STONE = C('#4c4a47');
const tmp = new THREE.Color();

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
      tmp.copy(FOREST_A).lerp(FOREST_B, n1);
      if (n3 > 0.62) tmp.lerp(LEAF, (n3 - 0.62) * 1.4);
      break;
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
  texture: THREE.DataTexture;
}

/** Costruisce il chunk che parte dalla cella (cx0, cy0). */
export function buildChunk(input: GroundInput, cx0: number, cy0: number, style: ArtStyle): ChunkMesh {
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
  const H = (i: number, j: number) => columnHeight(input, i, j);
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

/** Altezza del suolo (unità mondo) al centro di una cella logica. */
export function groundHeightAtCell(input: GroundInput, cx: number, cy: number): number {
  return columnHeight(input, cx * COLS, cy * COLS) * STEP;
}

export function groundType(input: GroundInput, cx: number, cy: number): Ground {
  return groundAt(input, cx, cy);
}
