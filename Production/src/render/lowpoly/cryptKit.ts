// Pezzi comuni delle cripte: stesse primitive e stessa palette degli altri generatori
// (kit.ts, palette.ts, details.ts), con qualche aiuto per le forme che le cripte usano
// spesso: travi tra due punti, lastre smussate, sagome estruse, anelli a terra, stoffe.
// Misure in unità mondo, origine al centro del lotto a terra, fronte verso +z.

import * as THREE from 'three';
import type { PVis } from '../types.ts';
import { LP, type LPOpts } from './kit.ts';
import { LPC } from './palette.ts';
import { candle as gameCandle, grassTuft } from './details.ts';

export type P3 = [number, number, number];
type Opts = LPOpts & { bevel?: number };

/** Famiglia di cripta a cui appartiene il modello, la sua versione (1–3) e lo stato. */
export interface CryptCtx {
  lp: LP;
  v: PVis;
  family: 'zombie' | 'ghost' | 'skeleton' | 'nature' | 'supernatural';
  variant: 1 | 2 | 3;
  /** Luci accese: non rotta e acceso. */
  lit: boolean;
}

/** Colori propri delle famiglie, che si aggiungono alla palette comune (LPC). */
export const CP = {
  black: '#161d21',
  dark: LPC.stoneDark,
  pale: LPC.stoneLight,
  amber: LPC.lantern,
  spectral: LPC.spectral,
  purple: '#b398d0',
  bone: LPC.bone,
  iron: LPC.iron,
  wood: LPC.woodDark,
} as const;

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Superficie aperta (spicchi di cono, tornito tagliato) vista da entrambi i lati: i
 * materiali del gioco disegnano una faccia sola, quindi si aggiunge la copia con i
 * triangoli rovesciati. Le forme chiuse non ne hanno bisogno.
 */
export function twoSided(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.getAttribute('position').array as Float32Array;
  const out = new Float32Array(p.length * 2);
  out.set(p);
  for (let i = 0; i < p.length; i += 9) {
    out.set(p.subarray(i, i + 3), p.length + i);
    out.set(p.subarray(i + 6, i + 9), p.length + i + 3);
    out.set(p.subarray(i + 3, i + 6), p.length + i + 6);
  }
  const both = new THREE.BufferGeometry();
  both.setAttribute('position', new THREE.BufferAttribute(out, 3));
  if (g !== geo) g.dispose();
  geo.dispose();
  return both;
}

/** Aggiunge una geometria ruotata (X, poi Y, poi Z) e portata in `p`; `open`: superficie aperta, a due facce. */
export function put(lp: LP, geo: THREE.BufferGeometry, color: string, p: P3 = [0, 0, 0], rot: P3 = [0, 0, 0], o: LPOpts = {}, open = false) {
  if (open) geo = twoSided(geo);
  if (rot[0]) geo.rotateX(rot[0]);
  if (rot[1]) geo.rotateY(rot[1]);
  if (rot[2]) geo.rotateZ(rot[2]);
  geo.translate(p[0], p[1], p[2]);
  return lp.add(geo, color, o);
}

/** Trave (cilindro a pochi lati) da `a` a `b`; `r2` è il raggio in punta. */
export function beam(lp: LP, a: P3, b: P3, r: number, color: string, r2 = r, o: LPOpts = {}) {
  _a.set(...a); _b.set(...b); _d.subVectors(_b, _a);
  const len = _d.length();
  if (len < 1e-4) return lp;
  const g = new THREE.CylinderGeometry(r2, r, len, r <= 0.025 ? 4 : 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, _d.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return lp.add(g, color, o);
}

/** Box appoggiato su `y`, con smusso di default sulle pietre e sui legni più grossi. */
export function block(lp: LP, x: number, y: number, z: number, w: number, h: number, d: number, color: string, rot: P3 = [0, 0, 0], o: Opts = {}) {
  if (rot[0] || rot[1] || rot[2]) return put(lp, new THREE.BoxGeometry(w, h, d), color, [x, y + h / 2, z], rot, o);
  return lp.box(x, y, z, w, h, d, color, { bevel: Math.min(0.02, w * 0.12, h * 0.3, d * 0.12), ...o });
}

/** Lastra bassa smussata (gradini, coperchi, selciato), ruotata di `ry` attorno alla verticale. */
export function slab(lp: LP, x: number, y: number, z: number, w: number, h: number, d: number, color: string, ry = 0, o: Opts = {}) {
  return lp.push([x, y, z], ry).box(0, 0, 0, w, h, d, color, { bevel: Math.min(0.045, w * 0.18, d * 0.18, h * 0.45), ...o }).pop();
}

/** Sagoma 2D (piano XY) estrusa per `depth` e centrata sullo spessore. */
export function prof(lp: LP, pts: Array<[number, number]>, depth: number, color: string, p: P3 = [0, 0, 0], rot: P3 = [0, 0, 0], o: LPOpts = {}) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return put(lp, g, color, p, rot, o);
}

export function torus(lp: LP, x: number, y: number, z: number, r: number, t: number, color: string, rot: P3 = [0, 0, 0], arc = Math.PI * 2, o: LPOpts = {}) {
  return put(lp, new THREE.TorusGeometry(r, t, 3, r < 0.12 ? 8 : r < 0.35 ? 10 : 14, arc), color, [x, y, z], rot, o, arc < Math.PI * 2);
}

/** Anello piatto a terra (o parte di anello): un piccolo tubo di sezione rettangolare. */
export function groundRing(lp: LP, x: number, y: number, z: number, r: number, width: number, color: string, seg = 12, arc = Math.PI * 2, o: LPOpts = {}) {
  const r0 = Math.max(0.001, r - width / 2), r1 = r + width / 2, h = 0.012;
  const g = new THREE.LatheGeometry([[r0, 0], [r1, 0], [r1, h], [r0, h], [r0, 0]].map(([a, b]) => new THREE.Vector2(a, b)), seg, 0, arc);
  return put(lp, g, color, [x, y, z], [0, 0, 0], { jitter: 0, ao: 0, ...o }, arc < Math.PI * 2);
}

/** Stoffa appesa o distesa: tre strisce sottili sfalsate, perché si veda piegata. */
export function cloth(lp: LP, x: number, y: number, z: number, w: number, h: number, color: string, { ragged = false, rotate = 0, laid = false }: { ragged?: boolean; rotate?: number; laid?: boolean } = {}) {
  lp.push([x, y, z], rotate, laid ? -Math.PI / 2 : 0);
  for (let i = 0; i < 3; i++) {
    const hh = h * (ragged && i === 1 ? 0.82 : 1) - (ragged && i === 2 ? 0.08 : 0);
    lp.box((i - 1) * (w / 3), -hh, Math.sin(i * 2.2) * 0.03, w / 3 + 0.004, hh, 0.014, color, { jitter: 0.004, ao: 0.1, vary: 0.05 });
  }
  return lp.pop();
}

/** Foglia a losanga appoggiata (aiuole, edera, rampicanti). */
export function leaf(lp: LP, x: number, y: number, z: number, s = 0.1, color: string = LPC.moss, rotation = 0) {
  return prof(lp, [[0, -s * 0.65], [s * 0.48, 0], [0, s], [-s * 0.48, 0]], 0.012, color, [x, y, z], [0.13, rotation, -0.4], { jitter: 0.004, ao: 0 });
}

/** Fungo a cappello piatto. */
export function mushroom(lp: LP, x: number, y: number, z: number, s = 1, color = '#99704b') {
  lp.cyl(x, y, z, 0.025 * s, 0.018 * s, 0.13 * s, 5, '#c3b39a', { jitter: 0.004 });
  lp.cyl(x, y + 0.105 * s, z, 0.09 * s, 0.027 * s, 0.07 * s, 7, color, { jitter: 0.006 });
}

/** Radice o ramo: tronchi consecutivi che si assottigliano. */
export function root(lp: LP, pts: P3[], thickness = 0.08, color = '#6e5940') {
  for (let i = 1; i < pts.length; i++) beam(lp, pts[i - 1], pts[i], thickness * (1 - (i / (pts.length + 1)) * 0.55), color, thickness * (1 - (i / (pts.length + 1)) * 0.7), { vary: 0.1 });
}

/** Catena morbida tra due punti. */
export function chain(lp: LP, a: P3, b: P3, n = 8, color: string = LPC.iron) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * 0.07;
    torus(lp, a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t, 0.055, 0.011, color, [0, i % 2 ? Math.PI / 2 : 0, 0], Math.PI * 2, { jitter: 0 });
  }
}

/** Tre cerchi concentrici: bacile, tino, calderone (profilo tornito [raggio, y]). */
export function turned(lp: LP, x: number, y: number, z: number, profile: Array<[number, number]>, seg: number, color: string, o: LPOpts = {}) {
  return lp.lathe(x, y, z, profile, seg, color, { ao: 0.2, ...o });
}

/** Colore smorzato (parti luminose a luce spenta o rotte). */
export function dim(color: string, k = 0.33): string {
  return '#' + new THREE.Color(color).multiplyScalar(k).getHexString();
}

/**
 * Parte che si illumina: nel gruppo `glow` se la cripta è accesa e integra, altrimenti
 * resta una superficie scura tra le normali (finestre e fiammelle senza luce).
 */
export function emit(c: CryptCtx, color: string): { color: string; o: LPOpts } {
  return c.lit ? { color, o: { bucket: 'glow', jitter: 0, vary: 0.03, ao: 0 } } : { color: dim(color, c.v.broken ? 0.45 : 0.3), o: { jitter: 0, ao: 0 } };
}

/** Piccola fiamma luminosa (candele, braci). */
export function flame(c: CryptCtx, x: number, y: number, z: number, color: string, r = 0.09) {
  if (!c.lit) return;
  c.lp.blob(x, y, z, r, r * 1.35, r, color, { bucket: 'glow', jitter: 0, ao: 0 });
}

/** Candela votiva come le altre del gioco, con la fiamma del colore della famiglia. */
export function votive(c: CryptCtx, x: number, y: number, z: number, color: string = LPC.flame) {
  const { lp } = c;
  lp.cyl(x, y, z, 0.105, 0.09, 0.055, 7, LPC.stoneDark, { jitter: 0.004 });
  if (color === LPC.flame) { gameCandle(lp, x, y + 0.05, z, c.lit, 0.15, false); return; }
  lp.cyl(x, y + 0.05, z, 0.039, 0.032, 0.15, 6, '#d9cdb2', { jitter: 0, vary: 0.04, ao: 0.1 });
  lp.cyl(x, y + 0.2, z, 0.003, 0.003, 0.02, 3, LPC.charcoal, { jitter: 0 });
  if (c.lit) {
    lp.cyl(x, y + 0.212, z, 0.018, 0, 0.06, 4, color, { bucket: 'glow', jitter: 0 });
  }
}

/** Ciuffo d'erba nel cortile; `h` come nelle misure del laboratorio (0,08–0,35). */
export function tuft(lp: LP, x: number, z: number, h = 0.2, dry = false) {
  grassTuft(lp, x, z, Math.max(0.6, h / 0.12), dry ? ['#8a8053', '#7a6e4c'] : undefined);
}
