// Terreno a "diorama": colonne voxel (TERRAIN_RES per cella) con colore per
// tipo di suolo e rumore deterministico, bordo dell'isola a strati di terra e
// roccia. Per lo stile miniatura le stesse colonne diventano una superficie
// sfaccettata continua. Diviso in chunk 8×8 celle ricostruibili a parte.

import * as THREE from 'three';
import { MAP_SIZE } from '../game/balance.ts';
import { hash3 } from '../game/rng.ts';
import type { ArtStyle } from '../game/state.ts';
import type { Rect } from '../game/world.ts';
import { P } from '../render/palette.ts';

export const TERRAIN_RES = 4; // colonne per cella
const STEP = 0.1; // altezza di un gradino (= 1 voxel)
export const CHUNK = 8;
const BASE_DEPTH = 1.6;

export type Ground = 'grass' | 'wild' | 'path' | 'dirt' | 'mud' | 'plot' | 'fence';

export interface GroundInput {
  seed: number;
  area: Rect;
  /** Tipo di suolo forzato per cella "x,y". */
  overrides: Map<string, Ground>;
}

function groundAt(input: GroundInput, cx: number, cy: number): Ground {
  const o = input.overrides.get(`${cx},${cy}`);
  if (o) return o;
  const a = input.area;
  const inside = cx >= a.x && cy >= a.y && cx < a.x + a.w && cy < a.y + a.h;
  if (!inside) return 'wild';
  return 'grass';
}

function lowNoise(x: number, y: number, seed: number, scale: number): number {
  const fx = x / scale, fy = y / scale;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash3(ix, iy, 0, seed), b = hash3(ix + 1, iy, 0, seed);
  const c = hash3(ix, iy + 1, 0, seed), d = hash3(ix + 1, iy + 1, 0, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Altezza (in gradini) della colonna (i,j) a risoluzione TERRAIN_RES. */
export function columnHeight(input: GroundInput, i: number, j: number): number {
  const cx = Math.floor(i / TERRAIN_RES), cy = Math.floor(j / TERRAIN_RES);
  const g = groundAt(input, cx, cy);
  const n = lowNoise(i, j, input.seed, 7);
  if (g === 'wild') {
    const hill = lowNoise(i, j, input.seed + 9, 22);
    return Math.round(n * 2 + Math.max(0, hill - 0.55) * 9);
  }
  if (g === 'path' || g === 'plot') return 0;
  if (g === 'mud') return -1;
  if (g === 'fence') return n > 0.7 ? 1 : 0;
  return 0;
}

const tmp = new THREE.Color();

const C = (hex: string) => new THREE.Color(hex);
const GRASS_A = C(P.grass), GRASS_B = C(P.grassDark), GRASS_DRY = C('#5b5a33'), MOSS = C(P.moss);
const WILD_A = C('#2c3826'), WILD_B = C('#3a3a26'), WILD_DRY = C('#4f4428');
const EARTH_A = C(P.earth), EARTH_B = C(P.earthDark), MUD = C(P.mud);

function columnColor(input: GroundInput, i: number, j: number, top: boolean): THREE.Color {
  const cx = Math.floor(i / TERRAIN_RES), cy = Math.floor(j / TERRAIN_RES);
  const g = groundAt(input, cx, cy);
  const h = hash3(i, j, 3, input.seed);
  const n1 = lowNoise(i, j, input.seed + 5, 10);
  const n2 = lowNoise(i, j, input.seed + 11, 26);
  switch (g) {
    case 'path': tmp.copy(EARTH_B).lerp(EARTH_A, n1 * 0.7); break;
    case 'dirt': tmp.copy(EARTH_A).lerp(EARTH_B, n1); break;
    case 'mud': tmp.copy(MUD); break;
    case 'plot': tmp.copy(EARTH_A); break;
    case 'fence': tmp.copy(EARTH_B).lerp(GRASS_B, 0.5 + (n1 - 0.5) * 0.6); break;
    case 'wild':
      tmp.copy(WILD_A).lerp(WILD_B, n1);
      if (n2 > 0.6) tmp.lerp(WILD_DRY, (n2 - 0.6) * 1.8);
      break;
    default:
      tmp.copy(GRASS_B).lerp(GRASS_A, 0.35 + n1 * 0.65);
      if (n2 > 0.62) tmp.lerp(GRASS_DRY, (n2 - 0.62) * 1.6);
      if (n2 < 0.25) tmp.lerp(MOSS, (0.25 - n2) * 1.2);
  }
  const jitter = 1 + (h - 0.5) * 0.07;
  tmp.multiplyScalar(top ? jitter : jitter * 0.62);
  return tmp;
}

interface Buffers { pos: number[]; nor: number[]; col: number[] }

function quad(b: Buffers, v: number[][], n: number[], c: THREE.Color, shade = 1) {
  const tris = [0, 1, 2, 0, 2, 3];
  for (const t of tris) {
    b.pos.push(v[t][0], v[t][1], v[t][2]);
    b.nor.push(n[0], n[1], n[2]);
    b.col.push(c.r * shade, c.g * shade, c.b * shade);
  }
}

/** Geometria di un chunk (celle [cx0, cx0+CHUNK) × [cy0, cy0+CHUNK)). */
export function buildChunk(input: GroundInput, cx0: number, cy0: number, style: ArtStyle): THREE.BufferGeometry {
  const s = 1 / TERRAIN_RES;
  const off = -MAP_SIZE / 2;
  const R = TERRAIN_RES * MAP_SIZE;
  const i0 = cx0 * TERRAIN_RES, j0 = cy0 * TERRAIN_RES;
  const n = CHUNK * TERRAIN_RES;
  const b: Buffers = { pos: [], nor: [], col: [] };
  const H = (i: number, j: number) => (i < 0 || j < 0 || i >= R || j >= R ? -BASE_DEPTH / STEP : columnHeight(input, i, j));

  if (style === 'miniature') {
    // superficie continua: vertici agli angoli, altezza media delle colonne vicine
    const vh = (i: number, j: number) => {
      let sum = 0, cnt = 0;
      for (const [a, c] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
        if (a < 0 || c < 0 || a >= R || c >= R) continue;
        sum += columnHeight(input, a, c); cnt++;
      }
      return cnt ? (sum / cnt) * STEP : 0;
    };
    const step = 2; // celle low-poly più larghe
    for (let j = j0; j < j0 + n; j += step) {
      for (let i = i0; i < i0 + n; i += step) {
        const x0 = off + i * s, x1 = off + (i + step) * s, z0 = off + j * s, z1 = off + (j + step) * s;
        const v = [[x0, vh(i, j + step), z1], [x1, vh(i + step, j + step), z1], [x1, vh(i + step, j), z0], [x0, vh(i, j), z0]];
        const c = columnColor(input, i, j, true).clone();
        const c2 = columnColor(input, i + 1, j + 1, true).clone();
        for (const [tri, col] of [[[0, 1, 2], c], [[0, 2, 3], c2]] as const) {
          const p = tri.map((k) => v[k]);
          const e1 = new THREE.Vector3(p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]);
          const e2 = new THREE.Vector3(p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]);
          const nn = e1.cross(e2).normalize();
          for (const q of p) { b.pos.push(q[0], q[1], q[2]); b.nor.push(nn.x, nn.y, nn.z); b.col.push(col.r, col.g, col.b); }
        }
      }
    }
  } else {
    for (let j = j0; j < j0 + n; j++) {
      for (let i = i0; i < i0 + n; i++) {
        const h = H(i, j);
        const y = h * STEP;
        const x0 = off + i * s, x1 = x0 + s, z0 = off + j * s, z1 = z0 + s;
        quad(b, [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], columnColor(input, i, j, true));
        // pareti verso colonne più basse (anche il bordo dell'isola)
        const sides: Array<[number, number, number[]]> = [[i + 1, j, [1, 0, 0]], [i - 1, j, [-1, 0, 0]], [i, j + 1, [0, 0, 1]], [i, j - 1, [0, 0, -1]]];
        for (const [ni, nj, nrm] of sides) {
          const nh = H(ni, nj);
          if (nh >= h) continue;
          const yb = nh * STEP;
          const edge = ni < 0 || nj < 0 || ni >= R || nj >= R;
          const c = columnColor(input, i, j, false).clone();
          let v: number[][];
          if (nrm[0] === 1) v = [[x1, yb, z1], [x1, yb, z0], [x1, y, z0], [x1, y, z1]];
          else if (nrm[0] === -1) v = [[x0, yb, z0], [x0, yb, z1], [x0, y, z1], [x0, y, z0]];
          else if (nrm[2] === 1) v = [[x0, yb, z1], [x1, yb, z1], [x1, y, z1], [x0, y, z1]];
          else v = [[x1, yb, z0], [x0, yb, z0], [x0, y, z0], [x1, y, z0]];
          if (!edge) { quad(b, v, nrm, c, 0.85); continue; }
          // bordo dell'isola: strati di erba, terra e roccia
          const layers: Array<[number, number, string]> = [[y, y - 0.12, '#2c3a29'], [y - 0.12, -0.7, P.earth], [-0.7, -1.15, P.earthDark], [-1.15, -BASE_DEPTH, P.stoneDark]];
          for (const [ya, yb2, col] of layers) {
            if (ya <= yb2) continue;
            const lv = v.map((p, k) => [p[0], k < 2 ? yb2 : ya, p[2]]);
            const lc = new THREE.Color(col).multiplyScalar(0.75 + hash3(i, j, Math.round(ya * 10), input.seed) * 0.25);
            quad(b, lv, nrm, lc);
          }
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  g.computeBoundingSphere();
  return g;
}

/** Altezza del suolo (unità mondo) al centro di una cella: per appoggiare i personaggi. */
export function groundHeightAtCell(input: GroundInput, cx: number, cy: number): number {
  return columnHeight(input, cx * TERRAIN_RES + 1, cy * TERRAIN_RES + 1) * STEP;
}
