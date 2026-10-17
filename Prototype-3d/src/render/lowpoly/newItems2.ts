// Anteprima, seconda passata (non ancora nel gioco): i nuovi sbloccabili
// rivisti dopo il primo giro di commenti — più rifiniti e legati al gioco.
// Fronte verso +z, centrati sull'ingombro, a terra su y = 0.

import * as THREE from 'three';
import { LP, irregularShape, roundTopShape, type LPModel } from './kit.ts';
import { candle, cobweb, deadLeaves, flower, grassTuft, moss, pebbles, pumpkin, weeds } from './details.ts';
import { skull } from './extras.ts';
import { bracketFungus, leafCluster, mushroom } from './nature.ts';
import { LPC } from './palette.ts';

type V3 = [number, number, number];

function tube(lp: LP, a: V3, b: V3, r: number, color: string, seg = 6, r1 = r, o: { bucket?: 'glow' | 'solid' | 'ghost'; vary?: number } = {}) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  lp.push(a, e.y, e.x, e.z).cyl(0, 0, 0, r, r1, d.length(), seg, color, { jitter: 0, ao: 0, ...o }).pop();
}

/** Polilinea di tubi (rami, liane, corde) con raggio che si assottiglia. */
function path(lp: LP, pts: V3[], r0: number, r1: number, color: string, seg = 5) {
  for (let i = 0; i < pts.length - 1; i++) {
    const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
    tube(lp, pts[i], pts[i + 1], r0 + (r1 - r0) * t0, color, seg, r0 + (r1 - r0) * t1);
    if (i) lp.blob(pts[i][0], pts[i][1], pts[i][2], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t0, color, { jitter: 0, ao: 0 });
  }
}

function rope(lp: LP, a: V3, b: V3, sag: number, r: number, color: string, n = 8): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t)); }
  for (let i = 0; i < n; i++) tube(lp, pts[i].toArray() as V3, pts[i + 1].toArray() as V3, r, color, 4);
  return pts;
}

const glowIf = (lit: boolean, on: string, off = '#3c3a35') => (lit ? { color: on, bucket: 'glow' as const } : { color: off, bucket: 'solid' as const });

function batShape(s = 1): THREE.Shape {
  const b = new THREE.Shape();
  b.moveTo(0, 0.02 * s); b.lineTo(0.03 * s, 0.05 * s); b.lineTo(0.07 * s, 0.04 * s); b.lineTo(0.13 * s, 0.06 * s); b.lineTo(0.11 * s, 0.01 * s); b.lineTo(0.08 * s, -0.01 * s); b.lineTo(0.05 * s, -0.005 * s); b.lineTo(0, -0.04 * s);
  b.lineTo(-0.05 * s, -0.005 * s); b.lineTo(-0.08 * s, -0.01 * s); b.lineTo(-0.11 * s, 0.01 * s); b.lineTo(-0.13 * s, 0.06 * s); b.lineTo(-0.07 * s, 0.04 * s); b.lineTo(-0.03 * s, 0.05 * s); b.closePath();
  return b;
}

/** Osso con le due teste (balaustrini, braccia). */
function boneStick(lp: LP, a: V3, b: V3, r: number, col: string = LPC.bone) {
  tube(lp, a, b, r, col, 5);
  for (const p of [a, b]) for (const s of [-1, 1]) lp.blob(p[0] + s * r * 0.9, p[1], p[2], r * 1.25, r * 1.25, r * 1.25, col, { jitter: 0 });
}

// ── Gazebo delle anime ──────────────────────────────────────────────────

/**
 * Gazebo rotondo (4×4) del cimitero: legno scuro prugna con le rifiniture
 * color osso, balaustrini a forma di osso, tetto a campana a scaglie di
 * ardesia, cupolino con le finestrelle verdi e la banderuola col corvo,
 * lampadario di candele, grammofono per i balli dei fantasmi, pipistrelli
 * ritagliati nel fregio, ragnatele ed edera secca.
 */
export function gazeboSpookyLP(lit = true): LPModel {
  const lp = new LP('new2:gazebo');
  const r = lp.rng;
  const WD = '#3b3440', WD2 = '#2c2730', BONE = '#d8cfbe', SLATE = '#3d3f55', SLATE2 = '#33354a';
  const N = 8, R = 1.55, H = 1.6;
  const ang = (i: number) => (i / N) * Math.PI * 2 + Math.PI / N;
  const at = (i: number, rr: number): [number, number] => [Math.sin(ang(i)) * rr, Math.cos(ang(i)) * rr];
  // basamento di pietra coperto di muschio, pedana di assi scure
  lp.cyl(0, 0, 0, R + 0.2, R + 0.14, 0.24, N, LPC.stone, { vary: 0.08, ao: 0.35, topTint: LPC.moss, topAmount: 0.25 });
  lp.cyl(0, 0.24, 0, R + 0.1, R + 0.1, 0.05, N, LPC.woodDark, { vary: 0.08 });
  for (let i = 0; i < 9; i++) lp.box(-1.4 + i * 0.35, 0.29, 0, 0.012, 0.003, 2.9, '#2a211c', { jitter: 0 }); // fessure tra le assi
  // scalini di pietra crepati con due pilastrini sormontati da un teschio e una lanterna
  for (let k = 0; k < 2; k++) lp.box(0, k * 0.12, R + 0.32 - k * 0.14, 0.95, 0.12, 0.26, k ? LPC.stoneLight : LPC.stone, { bevel: 0.012, vary: 0.08 });
  for (const s of [-1, 1]) {
    lp.box(s * 0.58, 0, R + 0.3, 0.18, 0.55, 0.18, LPC.stoneDark, { bevel: 0.015 });
    skull(lp, s * 0.58, 0.56, R + 0.3, 0.7);
    const g = glowIf(lit, '#9af0b0');
    lp.box(s * 0.58, 0.3, R + 0.41, 0.07, 0.1, 0.04, g.color, { bucket: g.bucket, jitter: 0 });
  }
  const base = 0.29;
  for (let i = 0; i < N; i++) {
    const [x, z] = at(i, R);
    // colonne scure tornite, capitello e base color osso, edera secca su due colonne
    lp.lathe(x, base, z, [[0.085, 0], [0.085, 0.07], [0.06, 0.1], [0.05, 0.4], [0.055, 0.45], [0.05, 0.5], [0.05, H - 0.18], [0.07, H - 0.12], [0.085, H - 0.06], [0.085, H]], 8, WD, { jitter: 0, vary: 0.05 });
    lp.cyl(x, base + H - 0.14, z, 0.075, 0.075, 0.05, 8, BONE, { jitter: 0 });
    lp.cyl(x, base, z, 0.095, 0.09, 0.06, 8, BONE, { jitter: 0 });
    if (i === 1 || i === 5) for (let k = 0; k < 7; k++) lp.push([x, base + 0.1 + k * 0.19, z], k * 1.3, 0.2, 0.4).blob(0.06, 0, 0, 0.04, 0.025, 0.012, k % 2 ? '#5a4a30' : '#6b5a3a', { jitter: 0.004 }).pop();
    const [x2, z2] = at(i + 1, R);
    const mx = (x + x2) / 2, mz = (z + z2) / 2, len = Math.hypot(x2 - x, z2 - z), yaw = Math.atan2(x2 - x, z2 - z);
    lp.push([mx, base, mz], yaw);
    if (i !== N - 1) {
      // ringhiera: corrimano scuro, zoccolo, balaustrini a forma di osso
      lp.box(0, 0.5, 0, 0.07, 0.045, len, WD2, { bevel: 0.008 });
      lp.box(0, 0.03, 0, 0.06, 0.05, len, WD2, { jitter: 0 });
      for (let k = 1; k < 7; k++) boneStick(lp, [0, 0.12, -len / 2 + (k * len) / 7], [0, 0.46, -len / 2 + (k * len) / 7], 0.014, BONE);
    }
    // fregio: trave, merletto a punte e un pipistrello ritagliato al centro di ogni campata
    lp.box(0, H - 0.2, 0, 0.06, 0.08, len, WD2, { jitter: 0 });
    for (let k = 0; k < 6; k++) lp.cyl(0, H - 0.32, -len / 2 + ((k + 0.5) * len) / 6, 0.0, 0.04, 0.12, 4, BONE, { jitter: 0 });
    lp.push([0.035, H - 0.36, 0], Math.PI / 2).plate(batShape(1.6), 0.012, WD2, { ao: 0 }).pop();
    lp.pop();
  }
  // tetto a campana con scaglie di ardesia, nervature color osso, gronda a smerli
  const top = base + H;
  const prof: Array<[number, number]> = [[R + 0.32, 0], [R + 0.05, 0.13], [R * 0.7, 0.36], [R * 0.42, 0.62], [0.34, 0.78]];
  lp.cyl(0, top, 0, R + 0.34, R + 0.32, 0.06, N, WD2, { jitter: 0 });
  for (let i = 0; i < N * 3; i++) { const a = (i / (N * 3)) * Math.PI * 2; lp.push([Math.sin(a) * (R + 0.33), top - 0.02, Math.cos(a) * (R + 0.33)], a).blob(0, 0, 0, 0.09, 0.05, 0.02, BONE, { jitter: 0 }).pop(); }
  lp.lathe(0, top + 0.06, 0, prof, N, SLATE, { jitter: 0.004, vary: 0.05 });
  // scaglie: file sfalsate di piccole lastre arrotondate appoggiate sulle falde
  for (let row = 0; row < 4; row++) {
    const t = (row + 0.5) / 4.5;
    const k = Math.min(prof.length - 2, Math.floor(t * (prof.length - 1)));
    const f = t * (prof.length - 1) - k;
    const rr = prof[k][0] + (prof[k + 1][0] - prof[k][0]) * f, yy = prof[k][1] + (prof[k + 1][1] - prof[k][1]) * f;
    const slope = Math.atan2(prof[k + 1][1] - prof[k][1], prof[k][0] - prof[k + 1][0]);
    const n = Math.round(rr * 22);
    for (let j = 0; j < n; j++) {
      const a = ((j + (row % 2) * 0.5) / n) * Math.PI * 2;
      lp.push([Math.sin(a) * (rr + 0.01), top + 0.06 + yy, Math.cos(a) * (rr + 0.01)], a, slope)
        .blob(0, 0, 0, 0.11, 0.01, 0.09, r.pick([SLATE, SLATE2, '#45475e']), { jitter: 0, vary: 0.06 }).pop();
    }
  }
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    path(lp, prof.map(([pr, py]) => [Math.sin(a) * (pr + 0.02), top + 0.07 + py, Math.cos(a) * (pr + 0.02)] as V3), 0.024, 0.02, BONE, 4);
  }
  // cupolino con le finestrelle verdi, cappello a cipolla, banderuola col corvo e la luna
  const cy = top + 0.82;
  lp.cyl(0, cy, 0, 0.34, 0.34, 0.24, N, WD, { jitter: 0 });
  for (let i = 0; i < N; i += 2) { const a = (i / N) * Math.PI * 2 + Math.PI / N; const g = glowIf(lit, '#9af0b0', '#2a3a30'); lp.push([Math.sin(a) * 0.335, cy + 0.06, Math.cos(a) * 0.335], a).box(0, 0, 0, 0.1, 0.13, 0.01, g.color, { bucket: g.bucket, jitter: 0 }).pop(); }
  lp.cyl(0, cy + 0.24, 0, 0.38, 0.36, 0.04, N, BONE, { jitter: 0 });
  lp.lathe(0, cy + 0.28, 0, [[0.36, 0], [0.32, 0.12], [0.2, 0.26], [0.06, 0.4], [0.02, 0.5], [0, 0.52]], N, SLATE2, { jitter: 0 });
  lp.cyl(0, cy + 0.78, 0, 0.012, 0.012, 0.42, 4, LPC.iron, { jitter: 0 });
  lp.add(new THREE.TorusGeometry(0.08, 0.012, 4, 12, Math.PI * 1.2).rotateZ(-0.3).translate(0, cy + 1.12, 0), LPC.gold, { jitter: 0 });
  lp.push([0, cy + 0.98, 0], 0.4);
  lp.blob(0, 0.04, 0, 0.06, 0.05, 0.1, LPC.iron, { jitter: 0 }); // corvo di ferro
  lp.blob(0, 0.09, 0.07, 0.035, 0.035, 0.035, LPC.iron, { jitter: 0 });
  lp.push([0, 0.09, 0.11], 0, Math.PI / 2).cyl(0, 0, 0, 0.012, 0, 0.05, 4, LPC.iron, { jitter: 0 }).pop();
  lp.box(0, 0.0, -0.15, 0.01, 0.06, 0.12, LPC.iron, { jitter: 0 });
  lp.pop();
  // lampadario di ferro con le candele, appeso al centro
  lp.box(0, top - 0.45, 0, 0.012, 0.45, 0.012, LPC.iron, { jitter: 0 });
  lp.add(new THREE.TorusGeometry(0.3, 0.015, 4, 16).rotateX(Math.PI / 2).translate(0, top - 0.48, 0), LPC.iron, { jitter: 0 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; tube(lp, [0, top - 0.3, 0], [Math.cos(a) * 0.3, top - 0.48, Math.sin(a) * 0.3], 0.006, LPC.iron, 3); candle(lp, Math.cos(a) * 0.3, top - 0.47, Math.sin(a) * 0.3, lit, 0.08); }
  // grammofono su un tavolino (la musica dei balli dei fantasmi) e una sedia
  lp.push([-0.75, base, -0.55], 0.6);
  lp.cyl(0, 0, 0, 0.05, 0.03, 0.45, 5, WD2, { jitter: 0 });
  lp.cyl(0, 0.45, 0, 0.24, 0.24, 0.03, 10, WD, { jitter: 0 });
  lp.box(0, 0.48, 0, 0.22, 0.1, 0.22, '#5a3a2a', { bevel: 0.01 });
  lp.cyl(0, 0.58, 0, 0.09, 0.09, 0.01, 12, '#141418', { jitter: 0 });
  tube(lp, [0.06, 0.6, 0.0], [0.08, 0.72, 0.05], 0.012, LPC.gold);
  lp.push([0.08, 0.72, 0.05], 0.5, -0.9).lathe(0, 0, 0, [[0.012, 0], [0.03, 0.12], [0.08, 0.24], [0.17, 0.32], [0.18, 0.33]], 10, LPC.gold, { jitter: 0 }).pop();
  lp.pop();
  // ragnatele, foglie secche, candele sul bordo, un corvo sul corrimano
  for (const i of [2, 4, 6]) { const [x, z] = at(i, R - 0.02); cobweb(lp, x * 0.98, top - 0.22, z * 0.98, 0.24, i === 4); }
  deadLeaves(lp, -R, -R, R, R, 18, base + 0.006);
  for (const i of [0, 3, 6]) { const [x, z] = at(i, R - 0.2); candle(lp, x, base, z, lit, 0.06 + i * 0.01); }
  { const [x, z] = at(2, R); lp.blob(x, base + 0.56, z, 0.06, 0.06, 0.09, '#1f2128', { jitter: 0 }); lp.blob(x, base + 0.64, z + 0.04, 0.04, 0.04, 0.04, '#1f2128', { jitter: 0 }); }
  for (let i = 0; i < 5; i++) { const a = r.range(0, 6.28); weeds(lp, Math.sin(a) * (R + 0.25), Math.cos(a) * (R + 0.25), 0.9); }
  if (lit) {
    lp.light(0, top - 0.4, 0, LPC.flame, 1, 5.5, 0.25, 1);
    lp.light(0, cy + 0.1, 0, '#9af0b0', 0.4, 3, 0.2, 0.6);
    for (const s of [-1, 1]) lp.light(s * 0.58, 0.35, R + 0.45, '#9af0b0', 0.3, 2, 0.3, 0.4);
  }
  return lp.build();
}

// ── Al posto del campanile ──────────────────────────────────────────────

/**
 * Campana delle anime (2×2): telaio di legno con il tettuccio, campana di
 * bronzo verdastra con un teschio in rilievo, corda da tirare. Il Custode la
 * suona una volta al giorno: per un po' compaiono più presenze.
 */
export function soulBellLP(lit = true): LPModel {
  const lp = new LP('new2:bell');
  const r = lp.rng;
  const W = '#4a3a2e', W2 = '#3a2c22';
  // basamento a due gradini, lastra con l'iscrizione
  lp.box(0, 0, 0, 1.7, 0.12, 1.5, LPC.stoneDark, { bevel: 0.02, topTint: LPC.moss, topAmount: 0.3 });
  lp.box(0, 0.12, -0.05, 1.3, 0.1, 1.1, LPC.stone, { bevel: 0.015, vary: 0.08 });
  // due pali con i saettoni e la trave
  for (const s of [-1, 1]) {
    lp.box(s * 0.55, 0.22, -0.05, 0.16, 1.9, 0.16, W, { bevel: 0.012, vary: 0.1 });
    lp.box(s * 0.55, 0.22, -0.05, 0.24, 0.12, 0.24, W2, { bevel: 0.01 });
    tube(lp, [s * 0.55, 1.55, -0.05], [s * 0.3, 1.95, -0.05], 0.04, W2);
    for (let k = 0; k < 3; k++) lp.box(s * 0.555 + s * 0.081, 0.5 + k * 0.45, -0.05, 0.004, 0.05, 0.1, '#2a201a', { jitter: 0 }); // tacche incise
  }
  lp.box(0, 1.98, -0.05, 1.4, 0.14, 0.16, W, { bevel: 0.012, vary: 0.1 });
  // tettuccio a due falde di scandole con il colmo
  for (const s of [-1, 1]) {
    // falda: tavolato e file di scandole parallele al colmo, sovrapposte
    lp.push([s * 0.36, 2.22, -0.05], 0, 0, -s * 0.62);
    lp.box(0, -0.04, 0, 0.82, 0.04, 0.78, '#3a3028', { jitter: 0 });
    for (let k = 0; k < 5; k++) lp.box(s * (-0.34 + k * 0.16), 0.0 + k * 0.004, 0, 0.18, 0.035, 0.8, r.pick(['#4a4038', '#3e3630', '#554a3e']), { bevel: 0.004, jitter: 0.003, vary: 0.1 });
    lp.pop();
  }
  lp.box(0, 2.48, -0.05, 0.08, 0.06, 0.7, W2, { jitter: 0 });
  for (const s of [-1, 1]) lp.blob(s * 0.2, 2.53, 0.12 * s, 0.05, 0.045, 0.08, '#1f2128', { jitter: 0 }); // corvi sul colmo
  // la campana di bronzo con la patina verde e il teschio in rilievo
  lp.box(0, 1.84, -0.05, 0.06, 0.14, 0.06, LPC.iron, { jitter: 0 });
  lp.lathe(0, 1.22, -0.05, [[0.0, 0], [0.34, 0], [0.33, 0.04], [0.27, 0.16], [0.21, 0.42], [0.2, 0.52], [0.12, 0.6], [0, 0.62]], 14, '#7a6a3a', { jitter: 0, vary: 0.06 });
  lp.lathe(0, 1.22, -0.05, [[0.345, 0], [0.345, 0.035], [0, 0.035]], 14, '#9a7a3a', { jitter: 0 });
  for (let i = 0; i < 6; i++) { const a = r.range(0, 6.28); lp.blob(Math.sin(a) * 0.25, 1.4 + r.next() * 0.25, -0.05 + Math.cos(a) * 0.25, 0.05, 0.05, 0.02, '#5f8a6a', { jitter: 0.01 }); } // patina
  skull(lp, 0, 1.36, 0.19, 0.75, '#8a7a4a');
  lp.blob(0, 1.24, -0.05, 0.05, 0.05, 0.05, '#4a3a2a', { jitter: 0 }); // batacchio
  // corda sfilacciata con l'anello, che scende davanti
  path(lp, [[0.04, 1.3, 0.05], [0.12, 0.95, 0.35], [0.14, 0.62, 0.42]], 0.016, 0.016, '#a08a62', 4);
  lp.add(new THREE.TorusGeometry(0.05, 0.012, 4, 10).translate(0.14, 0.57, 0.42), LPC.iron, { jitter: 0 });
  // lanternine verdi ai pali e candele, fiori secchi
  for (const s of [-1, 1]) {
    lp.box(s * 0.68, 1.3, 0.05, 0.03, 0.03, 0.12, LPC.iron, { jitter: 0 });
    const g = glowIf(lit, '#9af0b0');
    lp.box(s * 0.68, 1.1, 0.12, 0.08, 0.14, 0.08, g.color, { bucket: g.bucket, jitter: 0 });
    lp.box(s * 0.68, 1.24, 0.12, 0.1, 0.02, 0.1, LPC.iron, { jitter: 0 });
    candle(lp, s * 0.4, 0.22, 0.38, lit, 0.1);
  }
  for (let i = 0; i < 5; i++) flower(lp, -0.2 + i * 0.1, 0.42, '#8a6a7a', 0.1, 0.22);
  lp.box(0, 0.22, 0.48, 0.5, 0.012, 0.12, '#8a8278', { jitter: 0 }); // lastra con l'iscrizione
  for (const w of [0.36, 0.26]) lp.box(0, 0.232, 0.45 + (0.36 - w), w, 0.004, 0.015, LPC.engrave, { jitter: 0 });
  if (lit) { lp.light(-0.68, 1.15, 0.2, '#9af0b0', 0.35, 2.5, 0.3, 0.5); lp.light(0.68, 1.15, 0.2, '#9af0b0', 0.35, 2.5, 0.3, 0.5); }
  pebbles(lp, -0.85, -0.75, 0.85, 0.75, 4);
  return lp.build();
}

// ── Ambiente ────────────────────────────────────────────────────────────

/** Mano di zombie con la manica strappata (verde) o di scheletro (ossa), che emerge dall'acqua. */
function emergingHand(lp: LP, x: number, z: number, yaw: number, s: number, bony: boolean, y = 0.04) {
  const skin = bony ? LPC.bone : '#9fbf82', sleeve = '#4b4f3a';
  lp.push([x, y, z], yaw, 0.18, 0, s);
  // cerchi nell'acqua attorno al polso
  for (const rr of [0.08, 0.13]) lp.add(new THREE.TorusGeometry(rr, 0.006, 3, 16).rotateX(Math.PI / 2).translate(0, 0.005, 0), '#5a7a6a', { jitter: 0, ao: 0 });
  if (!bony) {
    lp.cyl(0, 0, 0, 0.06, 0.055, 0.12, 7, sleeve, { jitter: 0.004, vary: 0.1 });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; lp.push([Math.cos(a) * 0.055, 0.12, Math.sin(a) * 0.055], -a, 0, 0.25).cyl(0, 0, 0, 0.02, 0, 0.04, 3, sleeve, { jitter: 0 }).pop(); }
    lp.cyl(0, 0.1, 0, 0.042, 0.038, 0.16, 7, skin, { jitter: 0 });
  } else {
    for (const dx of [-0.015, 0.015]) tube(lp, [dx, 0, 0], [dx * 0.7, 0.26, 0], 0.014, skin, 5);
  }
  // palmo, quattro dita a due falangi piegate, pollice
  lp.blob(0, 0.3, 0, 0.05, 0.055, 0.025, skin, { jitter: 0 });
  for (let f = 0; f < 4; f++) {
    const fx = -0.035 + f * 0.023, bend = 0.15 + f * 0.12;
    const p1: V3 = [fx, 0.35, 0], p2: V3 = [fx * 1.15, 0.42 + (f === 1 || f === 2 ? 0.02 : 0), 0.01], p3: V3 = [fx * 1.2, 0.47, 0.01 + bend * 0.15];
    path(lp, [p1, p2, p3], bony ? 0.009 : 0.012, bony ? 0.008 : 0.01, skin, 4);
    if (!bony) lp.blob(p3[0], p3[1] + 0.006, p3[2] + 0.004, 0.009, 0.006, 0.006, '#c8c0a0', { jitter: 0 }); // unghie
  }
  path(lp, [[0.045, 0.29, 0.01], [0.075, 0.33, 0.03], [0.09, 0.38, 0.05]], 0.012, 0.01, skin, 4);
  lp.pop();
}

/** Palude (4×3): sponda di fango e sassi, acqua torbida con lenticchie, ceppo, coperchio di bara, canne, mani che emergono. */
export function swamp2LP(lit = true): LPModel {
  const lp = new LP('new2:swamp');
  const r = lp.rng;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const k = 1 + Math.sin(a * 3 + 0.5) * 0.08 + r.range(-0.05, 0.05); pts.push([Math.cos(a) * 1.7 * k, Math.sin(a) * 1.15 * k]); }
  const shape = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y))); shape.closePath();
  // fango attorno (più largo), fondale scuro, acqua torbida verde
  lp.push([0, 0.004, 0], 0, -Math.PI / 2, 0, [1.12, 1.15, 1]).plate(shape, 0.012, '#3b3026', { ao: 0, vary: 0.06 }).pop();
  lp.push([0, 0.012, 0], 0, -Math.PI / 2).plate(shape, 0.012, '#141a16', { ao: 0 }).pop();
  lp.push([0, 0.035, 0], 0, -Math.PI / 2).plate(shape, 0.01, '#2c4a38', { bucket: 'water', vary: 0.05, ao: 0 }).pop();
  // sponda: sassi, muschio, ciuffi
  for (const [x, y] of pts) {
    if (r.chance(0.65)) lp.blob(x * 1.04, 0.05, -y * 1.04, 0.12 + r.next() * 0.1, 0.07, 0.11, r.pick([LPC.stone, LPC.stoneDark, '#4a4438']), { vary: 0.12, topTint: LPC.moss, topAmount: 0.45 });
    if (r.chance(0.4)) grassTuft(lp, x * 1.12, -y * 1.12, 0.9, ['#55603a', '#6b6242', '#4a5a36']);
  }
  // lenticchie d'acqua e ninfee marce
  for (let i = 0; i < 6; i++) {
    const cx = r.range(-1.1, 1.1), cz = r.range(-0.6, 0.6);
    for (let k = 0; k < 9; k++) lp.cyl(cx + r.range(-0.15, 0.15), 0.046, cz + r.range(-0.1, 0.1), 0.02, 0.02, 0.004, 5, r.pick(['#6a8a3a', '#7a9a44', '#5a7a34']), { jitter: 0 });
  }
  for (let i = 0; i < 5; i++) { const a = r.range(0, 6.28), d = r.range(0.4, 1.0); lp.push([Math.cos(a) * d * 1.3, 0.048, Math.sin(a) * d * 0.75], r.range(0, 6)).add(new THREE.CylinderGeometry(0.13, 0.13, 0.008, 9, 1, false, 0.3, Math.PI * 1.75), r.pick(['#4a5a2e', '#5a5a30', '#6a5a34']), { jitter: 0 }).pop(); }
  // ceppo marcio con i funghi a mensola, coperchio di bara mezzo affondato
  lp.push([1.05, 0, -0.45]);
  lp.cyl(0, 0, 0, 0.2, 0.17, 0.42, 7, '#3a2c22', { vary: 0.12, ao: 0.3 });
  lp.cyl(0, 0.42, 0, 0.16, 0.16, 0.02, 7, '#6b5240', { jitter: 0.01 });
  bracketFungus(lp, 0, 0.2, 0.17, 0, 1.1); bracketFungus(lp, 0, 0.32, 0.12, 1.4, 0.8);
  lp.pop();
  const lid = new THREE.Shape(); lid.moveTo(-0.15, -0.45); lid.lineTo(0.15, -0.45); lid.lineTo(0.22, 0.15); lid.lineTo(0.15, 0.45); lid.lineTo(-0.15, 0.45); lid.lineTo(-0.22, 0.15); lid.closePath();
  lp.push([-0.95, 0.03, -0.25], 0.6, -Math.PI / 2 + 0.14).plate(lid, 0.05, '#4a3428', { vary: 0.1 }).pop();
  // canne e tife a gruppi
  for (let g = 0; g < 6; g++) {
    const [px, py] = pts[(g * 3 + 1) % pts.length];
    for (let k = 0; k < 6; k++) {
      const x = px * 0.95 + r.range(-0.12, 0.12), z = -py * 0.95 + r.range(-0.1, 0.1), h = r.range(0.35, 0.8);
      tube(lp, [x, 0, z], [x + r.range(-0.06, 0.06), h, z + r.range(-0.04, 0.04)], 0.011, k % 3 ? '#5a6a3a' : '#7a7448', 3, 0.004);
      if (k % 3 === 0) lp.cyl(x, h * 0.75, z, 0.024, 0.022, 0.12, 6, '#5a3a28', { jitter: 0 });
    }
  }
  // le mani: due di zombie e una di scheletro
  emergingHand(lp, -0.45, 0.25, 0.3, 1.5, false);
  emergingHand(lp, 0.5, -0.1, -0.6, 1.25, true);
  emergingHand(lp, 0.1, 0.55, 0.2, 0.9, false);
  // bolle e fuochi fatui verdi che galleggiano
  for (let i = 0; i < 8; i++) lp.blob(r.range(-1, 1), 0.06, r.range(-0.55, 0.55), 0.025, 0.02, 0.025, '#8aa87a', { jitter: 0 });
  if (lit) for (const [x, z] of [[-1.1, 0.2], [0.8, 0.4]]) { lp.blob(x, 0.35, z, 0.04, 0.05, 0.04, '#b6f06a', { bucket: 'glow', jitter: 0 }); lp.light(x, 0.4, z, '#b6f06a', 0.35, 2.4, 0.5, 0.7); }
  return lp.build();
}

/**
 * Albero dell'altalena (2×2): tronco contorto con le radici e la corteccia
 * a strisce, ramo lungo da cui pende l'altalena con la bambola di pezza,
 * gufo nella cavità, foglie secche.
 */
export function swingTree2LP(lit = true): LPModel {
  const lp = new LP('new2:swing');
  const r = lp.rng;
  const T = '#3e3128', T2 = '#2f251e';
  deadLeaves(lp, -0.9, -0.9, 0.9, 0.9, 16);
  moss(lp, -0.5, 0.01, -0.3, 0.14);
  // radici a raggiera
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + r.range(-0.2, 0.2); path(lp, [[-0.5, 0.18, -0.35], [-0.5 + Math.cos(a) * 0.3, 0.06, -0.35 + Math.sin(a) * 0.3], [-0.5 + Math.cos(a) * 0.55, 0, -0.35 + Math.sin(a) * 0.55]], 0.09, 0.02, T2, 5); }
  // tronco a segmenti piegati con le strisce di corteccia
  const trunk: V3[] = [[-0.5, 0, -0.35], [-0.45, 0.6, -0.33], [-0.55, 1.15, -0.3], [-0.48, 1.6, -0.32], [-0.62, 2.05, -0.36]];
  path(lp, trunk, 0.21, 0.08, T, 8);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; lp.push([-0.5 + Math.cos(a) * 0.19, 0.15, -0.34 + Math.sin(a) * 0.19], -a).box(0, 0, 0, 0.03, 0.9, 0.02, T2, { jitter: 0.006, ao: 0 }).pop(); }
  // cavità col gufo dagli occhi gialli
  lp.blob(-0.42, 0.95, -0.15, 0.08, 0.11, 0.03, '#141010', { jitter: 0 });
  lp.blob(-0.42, 0.93, -0.13, 0.055, 0.06, 0.04, '#5a4a3a', { jitter: 0 });
  for (const s of [-1, 1]) lp.blob(-0.42 + s * 0.022, 0.96, -0.1, 0.015, 0.015, 0.008, lit ? '#ffd36a' : '#c9a227', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  bracketFungus(lp, -0.5, 0.4, -0.15, 0.2, 1.0);
  // ramo lungo dell'altalena e rami secchi in alto
  const limb: V3[] = [[-0.47, 1.5, -0.32], [0.0, 1.72, -0.2], [0.5, 1.82, -0.12], [0.95, 2.02, -0.08], [1.1, 2.25, -0.1]];
  path(lp, limb, 0.09, 0.025, T, 6);
  for (const [b, c] of [[[-0.62, 2.05, -0.36], [-1.0, 2.5, -0.3]], [[-0.62, 2.05, -0.36], [-0.4, 2.6, -0.5]], [[-0.55, 1.15, -0.3], [-0.95, 1.4, -0.05]], [[0.5, 1.82, -0.12], [0.62, 2.2, -0.35]]] as Array<[V3, V3]>) {
    const m: V3 = [(b[0] + c[0]) / 2 + r.range(-0.1, 0.1), (b[1] + c[1]) / 2 + 0.05, (b[2] + c[2]) / 2];
    path(lp, [b, m, c], 0.05, 0.012, T, 5);
    tube(lp, m, [m[0] + r.range(-0.2, 0.2), m[1] + 0.2, m[2] + r.range(-0.1, 0.1)], 0.015, T, 4, 0.003);
  }
  for (let i = 0; i < 4; i++) lp.blob(r.range(-0.9, 0.9), r.range(2.0, 2.5), r.range(-0.4, 0), 0.04, 0.012, 0.03, r.pick(LPC.leafAutumn), { jitter: 0 });
  // altalena: corde con i nodi, tavoletta consumata, bambola di pezza seduta
  const sx = 0.32;
  for (const dx of [-0.21, 0.21]) {
    tube(lp, [sx + dx, 1.76 + dx * 0.15, -0.16], [sx + dx * 0.98, 0.46, 0.0], 0.009, '#a08a62', 4);
    lp.blob(sx + dx, 1.73, -0.16, 0.025, 0.03, 0.025, '#a08a62', { jitter: 0 });
  }
  lp.push([sx, 0.44, 0.0], 0, 0.06);
  lp.box(0, 0, 0, 0.52, 0.045, 0.18, LPC.wood, { bevel: 0.008, vary: 0.12 });
  lp.box(0.08, 0.046, 0.02, 0.2, 0.002, 0.006, '#4a3a2a', { jitter: 0 });
  // bambola: corpo di stoffa a toppe, testa con gli occhi a bottone e la bocca cucita
  lp.push([-0.05, 0.045, 0.0]);
  lp.blob(0, 0.1, 0, 0.07, 0.09, 0.055, '#8a6a7a', { jitter: 0 });
  lp.box(0.03, 0.08, 0.05, 0.05, 0.05, 0.01, '#c9b79c', { jitter: 0 });
  lp.blob(0, 0.24, 0.01, 0.075, 0.07, 0.07, '#d8c8a8', { jitter: 0 });
  for (const s of [-1, 1]) { lp.cyl(s * 0.028, 0.25, 0.075, 0.016, 0.016, 0.008, 6, '#1b1a20', { jitter: 0 }); tube(lp, [s * 0.05, 0.08, 0.03], [s * 0.07, 0.0, 0.12], 0.02, '#8a6a7a', 4); tube(lp, [s * 0.03, 0.05, 0.03], [s * 0.04, -0.12, 0.08], 0.022, '#6b5a6a', 4); }
  tube(lp, [-0.03, 0.215, 0.07], [0.03, 0.215, 0.07], 0.004, '#5a2a30', 3);
  for (let k = 0; k < 5; k++) tube(lp, [-0.06 + k * 0.03, 0.3, 0.0], [-0.08 + k * 0.04, 0.34, -0.03], 0.012, '#b0774a', 3); // capelli di lana
  lp.pop();
  lp.pop();
  for (let i = 0; i < 4; i++) grassTuft(lp, r.range(-0.8, 0.8), r.range(0.2, 0.8), 0.9, ['#6b6242', '#7a6e4c', '#55603a']);
  return lp.build();
}

/**
 * Cerchio di pietre nella nebbia (3×3): menhir di altezze diverse (alti,
 * medi, massi bassi e tondi), uno inclinato, uno caduto e spezzato in due,
 * rune che brillano piano, altare al centro; in gioco la nebbia si muove.
 */
export function stoneCircleLP(lit = true): LPModel {
  const lp = new LP('new2:stones');
  const r = lp.rng;
  lp.blob(0, 0.0, 0, 1.3, 0.03, 1.3, '#3e4a34', { vary: 0.06 });
  deadLeaves(lp, -1.1, -1.1, 1.1, 1.1, 10);
  const stoneCol = () => r.pick([LPC.stone, LPC.stoneWarm, '#6a6e66', '#5d625c']);
  const rune = (h: number, w: number) => {
    const g = glowIf(lit, '#7af0d0', '#3a4a44');
    lp.box(0, h * 0.45, w * 0.8, 0.03, Math.min(0.22, h * 0.3), 0.01, g.color, { bucket: g.bucket, jitter: 0 });
    lp.push([0, h * 0.52, w * 0.8], 0, 0, 0.7).box(0, 0, 0, 0.025, Math.min(0.1, h * 0.14), 0.01, g.color, { bucket: g.bucket, jitter: 0 }).pop();
  };
  // [altezza, larghezza, tipo]: menhir alti e medi, massi bassi tondeggianti, uno inclinato, uno spezzato
  const ring: Array<[number, number, 'tall' | 'low' | 'lean' | 'broken']> = [
    [1.3, 0.3, 'tall'], [0.35, 0.3, 'low'], [0.85, 0.26, 'tall'], [1.05, 0.28, 'lean'], [0.3, 0.26, 'low'],
    [1.2, 0.32, 'tall'], [0.6, 0.28, 'broken'], [0.45, 0.24, 'low'], [0.95, 0.26, 'tall'],
  ];
  ring.forEach(([h, w, kind], i) => {
    const a = (i / ring.length) * Math.PI * 2 + 0.15 + r.range(-0.08, 0.08), d = 1.05 + r.range(-0.08, 0.1);
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (kind === 'low') {
      lp.blob(x, h * 0.45, z, w * 1.3, h * 0.6, w * 1.1, stoneCol(), { detail: 1, vary: 0.1, jitter: 0.04, topTint: LPC.moss, topAmount: 0.55 });
      if (r.chance(0.6)) lp.blob(x + w, 0.08, z, w * 0.5, 0.1, w * 0.45, stoneCol(), { vary: 0.1, jitter: 0.03, topTint: LPC.moss, topAmount: 0.4 });
      return;
    }
    if (kind === 'broken') {
      // base spezzata in piedi e la cima caduta lì accanto
      lp.push([x, 0, z], a + Math.PI, 0, 0.05).cyl(0, 0, 0, w, w * 0.85, h, 5, stoneCol(), { vary: 0.1, ao: 0.35, jitter: 0.03, topTint: LPC.moss, topAmount: 0.4 }).pop();
      lp.push([x + Math.cos(a) * 0.45, w * 0.7, z - Math.sin(a) * 0.45], a + 0.6, 0, Math.PI / 2 - 0.08).cyl(0, -0.4, 0, w * 0.85, w * 0.6, 0.75, 5, stoneCol(), { vary: 0.1, ao: 0.25, jitter: 0.03, topTint: LPC.moss, topAmount: 0.5 }).pop();
      return;
    }
    lp.push([x, 0, z], a + Math.PI, kind === 'lean' ? 0.28 : r.range(-0.08, 0.08), r.range(-0.08, 0.08));
    lp.cyl(0, 0, 0, w, w * 0.65, h, r.pick([5, 6]), stoneCol(), { vary: 0.1, ao: 0.35, jitter: 0.035, topTint: LPC.moss, topAmount: 0.5 });
    lp.blob(0, h, 0, w * 0.65, 0.06, w * 0.6, LPC.moss, { jitter: 0.01 }); // cappello di muschio
    moss(lp, 0, h * 0.25, w * 0.75, 0.06);
    rune(h, w);
    lp.pop();
    if (r.chance(0.6)) grassTuft(lp, x * 1.2, z * 1.2, 1, ['#6b6242', '#55603a']);
  });
  // sassi sparsi dentro il cerchio
  for (let i = 0; i < 6; i++) { const a = r.range(0, 6.28), d = r.range(0.45, 0.8); lp.blob(Math.sin(a) * d, 0.04, Math.cos(a) * d, r.range(0.05, 0.1), 0.05, r.range(0.05, 0.09), stoneCol(), { vary: 0.1 }); }
  // altare piatto con le candele consumate e un teschio di corvo
  lp.blob(0, 0.08, 0, 0.42, 0.1, 0.32, LPC.stoneLight, { vary: 0.08, jitter: 0.02 });
  lp.box(0, 0.16, 0, 0.62, 0.06, 0.44, LPC.stone, { bevel: 0.02, vary: 0.08 });
  for (const [x, z] of [[-0.2, 0.1], [0.18, -0.08]]) candle(lp, x, 0.22, z, lit, 0.05);
  lp.blob(-0.05, 0.25, -0.1, 0.04, 0.035, 0.05, LPC.bone, { jitter: 0 });
  lp.push([-0.05, 0.25, -0.04], 0, Math.PI / 2).cyl(0, 0, 0, 0.012, 0, 0.07, 4, LPC.bone, { jitter: 0 }).pop();
  for (let i = 0; i < 7; i++) { const a = r.range(0, 6.28), d = r.range(0, 0.8); lp.blob(Math.cos(a) * d, 0.1 + r.next() * 0.05, Math.sin(a) * d, r.range(0.35, 0.55), 0.05, r.range(0.3, 0.45), '#1f2a28', { bucket: 'ghost', jitter: 0.02 }); }
  if (lit) lp.light(0, 0.4, 0, '#7af0d0', 0.3, 3, 0.3, 0.6);
  return lp.build();
}

/** Cipresso (1×1): il classico dei cimiteri, stretto e altissimo, verde scuro, con qualche bacca e lettiera. */
export function cypressLP(): LPModel {
  const lp = new LP('new2:cypress');
  const r = lp.rng;
  deadLeaves(lp, -0.45, -0.45, 0.45, 0.45, 6);
  lp.cyl(0, 0, 0, 0.08, 0.06, 0.45, 6, '#4a3a2e', { vary: 0.1 });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; path(lp, [[0, 0.1, 0], [Math.cos(a) * 0.18, 0.02, Math.sin(a) * 0.18]], 0.05, 0.015, '#3a2c22', 5); }
  // chioma a fuso: tanti ciuffi sovrapposti, più larghi a un terzo dell'altezza
  const H = 2.8, cols = ['#2f4433', '#37503a', '#2a3d2f', '#3d5a40'];
  for (let i = 0; i < 26; i++) {
    const t = i / 26, y = 0.3 + t * (H - 0.4);
    const w = 0.34 * Math.sin(Math.min(1, (t + 0.08) * 1.3) * Math.PI) * (1 - t * 0.35) + 0.04;
    const a = i * 2.4;
    lp.blob(Math.cos(a) * w * 0.3, y, Math.sin(a) * w * 0.3, w, 0.2, w, r.pick(cols), { detail: 1, vary: 0.1, jitter: w * 0.25, ao: 0.15 });
  }
  lp.cyl(0, H - 0.1, 0, 0.05, 0.0, 0.25, 5, '#37503a', { jitter: 0.01 });
  for (let i = 0; i < 8; i++) { const t = r.range(0.15, 0.7), a = r.range(0, 6.28); lp.blob(Math.cos(a) * 0.3 * (1 - t * 0.5), 0.3 + t * H, Math.sin(a) * 0.3 * (1 - t * 0.5), 0.025, 0.025, 0.025, '#6b6a52', { jitter: 0 }); } // galbule
  return lp.build();
}

/**
 * Melo stregato (2×2): alberello storto e basso con poche foglie rosse, le
 * mele a forma di teschietto (una morsicata), un'altalena di corda col
 * secchio, la lanterna appesa e i frutti caduti nell'erba.
 */
export function witchAppleLP(lit = true): LPModel {
  const lp = new LP('new2:apple');
  const r = lp.rng;
  const T = '#4a362a';
  deadLeaves(lp, -0.8, -0.8, 0.8, 0.8, 12);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.3; path(lp, [[0, 0.15, 0], [Math.cos(a) * 0.25, 0.04, Math.sin(a) * 0.25], [Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42]], 0.07, 0.015, T, 5); }
  path(lp, [[0, 0, 0], [0.1, 0.45, 0.05], [-0.05, 0.85, 0], [0.05, 1.05, -0.05]], 0.15, 0.09, T, 7);
  bracketFungus(lp, 0.05, 0.35, 0.12, 0, 0.9);
  const tips: V3[] = [];
  for (const [dx, dy, dz] of [[0.7, 0.45, 0.1], [-0.65, 0.5, 0.25], [0.15, 0.65, -0.6], [-0.2, 0.75, 0.55], [0.45, 0.7, -0.3]] as const) {
    const s: V3 = [0.02, 1.0, -0.02], m: V3 = [dx * 0.5, 1.0 + dy * 0.6, dz * 0.5], e: V3 = [dx, 1.0 + dy, dz];
    path(lp, [s, m, e], 0.06, 0.02, T, 5);
    tips.push(e, m);
  }
  // chioma rada di foglie rosse e ruggine
  for (const t of tips) leafCluster(lp, t[0], t[1] + 0.05, t[2], 0.2, ['#7a2a2a', '#8e3a2a', '#6b2f35', '#9a5a2e']);
  // mele: lucide, rosso scuro, alcune con la faccina da teschio
  const apple = (x: number, y: number, z: number, skullish: boolean) => {
    lp.blob(x, y, z, 0.06, 0.055, 0.06, '#8e1f24', { detail: 1, jitter: 0.004, vary: 0.06 });
    lp.box(x, y + 0.05, z, 0.008, 0.04, 0.008, '#3a2a1e', { jitter: 0 });
    if (skullish) {
      for (const s of [-1, 1]) lp.blob(x + s * 0.02, y + 0.008, z + 0.052, 0.012, 0.014, 0.006, lit ? '#ffd36a' : '#2a1010', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
      lp.box(x, y - 0.025, z + 0.05, 0.03, 0.006, 0.006, '#2a1010', { jitter: 0 });
    }
  };
  tips.forEach((t, i) => apple(t[0] + 0.05, t[1] - 0.12, t[2] + 0.08, i % 2 === 0));
  for (let i = 0; i < 5; i++) apple(r.range(-0.6, 0.6), 0.05, r.range(-0.2, 0.7), false);
  // secchio di mele e lanterna appesa al ramo
  lp.cyl(-0.55, 0, 0.55, 0.13, 0.11, 0.18, 9, '#6b5a4a', { jitter: 0 });
  for (let i = 0; i < 4; i++) apple(-0.55 + r.range(-0.06, 0.06), 0.2, 0.55 + r.range(-0.06, 0.06), i === 0);
  const [lx, ly, lz] = tips[2];
  tube(lp, [lx, ly, lz], [lx, ly - 0.25, lz], 0.004, LPC.iron, 3);
  const g = glowIf(lit, LPC.lantern);
  lp.box(lx, ly - 0.42, lz, 0.09, 0.14, 0.09, g.color, { bucket: g.bucket, jitter: 0 });
  lp.box(lx, ly - 0.28, lz, 0.11, 0.025, 0.11, LPC.iron, { jitter: 0 });
  if (lit) lp.light(lx, ly - 0.35, lz, LPC.lantern, 0.6, 3.5, 0.2, 0.7);
  for (let i = 0; i < 4; i++) grassTuft(lp, r.range(-0.8, 0.8), r.range(-0.8, 0.8), 0.9);
  return lp.build();
}

/**
 * Funghi luminosi su un tronco caduto (2×1): tronco cavo con la corteccia
 * a placche, l'estremità spezzata a schegge e l'altra tagliata con gli
 * anelli, un ramo mozzo, muschio, felci e funghi che fanno luce fredda.
 */
export function glowShroomsLP(lit = true): LPModel {
  const lp = new LP('new2:shrooms');
  const r = lp.rng;
  moss(lp, 0, 0.005, 0, 0.45);
  const L = 1.5, R0 = 0.18, ax = 0.15;
  lp.push([0, R0 - 0.02, -0.05], ax, 0, Math.PI / 2);
  // tronco a tre segmenti appena piegati, corteccia a placche
  for (let k = 0; k < 3; k++) {
    lp.push([0, -L / 2 + k * (L / 3), 0], 0, 0, (k - 1) * 0.04).cyl(0, 0, 0, R0 - k * 0.012, R0 - (k + 1) * 0.012, L / 3 + 0.02, 9, k % 2 ? '#4a3a2e' : '#54412f', { vary: 0.14, topTint: LPC.moss, topAmount: 0.45, ao: 0.2 }).pop();
  }
  for (let i = 0; i < 26; i++) {
    const a = r.range(0, 6.28), y = r.range(-L / 2 + 0.05, L / 2 - 0.05);
    lp.push([Math.cos(a) * (R0 - 0.005), y, Math.sin(a) * (R0 - 0.005)], -a + Math.PI / 2).box(0, 0, 0, 0.06, r.range(0.06, 0.14), 0.02, r.pick(['#3a2c22', '#5a4636', '#2f251e']), { jitter: 0.006, ao: 0 }).pop();
  }
  // estremità tagliata: anelli d'accrescimento e cavità scura
  lp.push([0, -L / 2 - 0.005, 0]);
  lp.cyl(0, -0.01, 0, R0 - 0.01, R0 - 0.01, 0.012, 10, '#c9a77a', { jitter: 0 });
  for (const rr of [0.13, 0.09]) lp.add(new THREE.TorusGeometry(rr, 0.006, 3, 14).rotateX(Math.PI / 2).translate(0, -0.012, 0), '#8a6a4a', { jitter: 0 });
  lp.cyl(0, -0.016, 0, 0.06, 0.06, 0.008, 8, '#1a1410', { jitter: 0 });
  lp.pop();
  // estremità spezzata: schegge
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; lp.push([Math.cos(a) * R0 * 0.75, L / 2, Math.sin(a) * R0 * 0.75], 0, r.range(-0.2, 0.2), r.range(-0.2, 0.2)).cyl(0, 0, 0, 0.04, 0.0, r.range(0.08, 0.2), 3, '#5a4636', { jitter: 0 }).pop(); }
  lp.cyl(0, L / 2 - 0.05, 0, 0.1, 0.08, 0.06, 7, '#1a1410', { jitter: 0 });
  // ramo mozzo con un fungo a mensola
  lp.push([R0 * 0.9, 0.2, 0], 0, 0, -1.1).cyl(0, 0, 0, 0.05, 0.035, 0.26, 6, '#4a3a2e', { vary: 0.1 }).pop();
  lp.pop();
  bracketFungus(lp, -0.3, 0.2, 0.15, 0.1, 1.0); bracketFungus(lp, 0.4, 0.26, 0.13, -0.1, 0.8);
  for (let i = 0; i < 5; i++) moss(lp, r.range(-0.6, 0.6), 0.32, -0.05 + r.range(-0.06, 0.06), 0.07);
  // felci ai lati
  for (const [fx, fz] of [[-0.75, 0.25], [0.75, -0.3]]) for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; lp.push([fx, 0.02, fz], a, 0.9).blob(0, 0.12, 0, 0.035, 0.13, 0.01, k % 2 ? '#4d6640' : '#5a7a48', { jitter: 0 }).pop(); }
  // funghi: alti e sottili color acquamarina, ombrelli viola, mensole luminose
  const cols = ['#7af0d0', '#b07ae0', '#9fe0f0'];
  for (let i = 0; i < 11; i++) {
    const onLog = i < 5;
    const x = r.range(-0.6, 0.6), z = onLog ? -0.05 + r.range(-0.08, 0.08) : (r.chance(0.5) ? r.range(0.15, 0.32) : r.range(-0.32, -0.2));
    const y = onLog ? 0.34 : 0;
    const tall = r.chance(0.5);
    const h = tall ? r.range(0.15, 0.28) : r.range(0.05, 0.1), w = tall ? 0.03 : 0.05;
    const c = r.pick(cols);
    lp.cyl(x, y, z, 0.012, 0.009, h, 4, '#d8e0d0', { jitter: 0 });
    lp.lathe(x, y + h - 0.005, z, [[0, 0], [w, 0], [w * 0.9, w * 0.4], [0, w * 0.6]], 7, lit ? c : '#4a5a58', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  }
  if (lit) {
    for (let i = 0; i < 10; i++) lp.blob(r.range(-0.7, 0.7), r.range(0.35, 0.8), r.range(-0.3, 0.3), 0.01, 0.01, 0.01, '#c8fff0', { bucket: 'glow', jitter: 0 });
    lp.light(-0.3, 0.55, 0.3, '#7af0d0', 0.2, 2.2, 0.2, 0.7);
    lp.light(0.35, 0.55, -0.3, '#b07ae0', 0.15, 2.0, 0.2, 0.6);
  }
  for (let i = 0; i < 4; i++) grassTuft(lp, r.range(-0.8, 0.8), r.range(-0.4, 0.4), 0.8);
  return lp.build();
}

// ── Presenze ────────────────────────────────────────────────────────────

/**
 * Cripta del vampiro (2×2): bara su una pedana di pietra sotto un
 * baldacchino di ferro con il drappo di velluto, candelabri, rose, targa
 * «Non disturbare»; di giorno è chiusa e i pipistrelli dormono appesi.
 */
export function vampireCryptLP(night: boolean, candles = night): LPModel {
  const lp = new LP(`new2:vampire:${night}:${candles}`);
  const r = lp.rng;
  const VEL = '#6b1a24';
  lp.box(0, 0, 0, 1.75, 0.1, 1.5, LPC.stoneDark, { bevel: 0.02 });
  lp.box(0, 0.1, -0.1, 1.2, 0.14, 1.15, LPC.stone, { bevel: 0.015, vary: 0.06 });
  // tappeto rosso sui gradini
  lp.box(0, 0.105, 0.6, 0.5, 0.005, 0.3, VEL, { jitter: 0 });
  // bara esagonale nera con le maniglie d'ottone e la croce… a pipistrello
  const C = new THREE.Shape();
  C.moveTo(-0.2, -0.6); C.lineTo(0.2, -0.6); C.lineTo(0.3, 0.2); C.lineTo(0.2, 0.6); C.lineTo(-0.2, 0.6); C.lineTo(-0.3, 0.2); C.closePath();
  lp.push([0, 0.24, -0.1], Math.PI / 2, -Math.PI / 2).plate(C, 0.28, '#1f1a20', { vary: 0.06 }).pop();
  for (const s of [-1, 1]) for (const z of [-0.35, 0.05]) lp.box(s * 0.29, 0.38, z, 0.02, 0.03, 0.12, LPC.gold, { jitter: 0 });
  if (night) {
    // aperta: fodera di raso rosso, cuscino, coperchio appoggiato al baldacchino
    lp.push([0, 0.53, -0.1], Math.PI / 2, -Math.PI / 2, 0, [0.86, 0.9, 1]).plate(C, 0.01, '#a82a3a', { ao: 0 }).pop();
    lp.blob(0, 0.55, -0.55, 0.14, 0.05, 0.08, '#c84a5a', { jitter: 0 });
    lp.push([0.55, 0.24, -0.55], Math.PI / 2 - 0.2, -0.25).plate(C, 0.06, '#2a2228', { vary: 0.06 }).pop();
  } else {
    // chiusa: coperchio col pipistrello d'argento e la targa
    lp.push([0, 0.52, -0.1], Math.PI / 2, -Math.PI / 2).plate(C, 0.06, '#2a2228', { vary: 0.06 }).pop();
    lp.push([0, 0.585, -0.1], Math.PI, -Math.PI / 2).plate(batShape(1.6), 0.012, '#c9c8d0', { ao: 0 }).pop();
    lp.box(0, 0.585, 0.3, 0.26, 0.01, 0.1, LPC.gold, { jitter: 0 });
    for (const w of [0.2, 0.14]) lp.box(0, 0.597, 0.28 + (0.2 - w) * 0.4, w, 0.003, 0.012, '#4a3a20', { jitter: 0 });
  }
  // baldacchino: quattro colonnine di ferro, cornice, drappo di velluto con le nappe
  for (const [x, z] of [[-0.55, -0.7], [0.55, -0.7], [-0.55, 0.45], [0.55, 0.45]]) {
    lp.cyl(x, 0.24, z, 0.03, 0.025, 1.45, 6, LPC.iron, { jitter: 0 });
    lp.cyl(x, 1.69, z, 0.05, 0.0, 0.14, 4, LPC.iron, { jitter: 0 });
  }
  for (const z of [-0.7, 0.45]) lp.box(0, 1.65, z, 1.14, 0.04, 0.04, LPC.iron, { jitter: 0 });
  for (const x of [-0.55, 0.55]) lp.box(x, 1.65, -0.125, 0.04, 0.04, 1.19, LPC.iron, { jitter: 0 });
  for (let k = 0; k < 7; k++) { const z = -0.7 + k * 0.19; lp.box(0, 1.55 - Math.sin((k / 6) * Math.PI) * 0.1, z, 1.12, 0.1, 0.17, k % 2 ? VEL : '#5a1620', { jitter: 0.004 }); }
  for (const x of [-0.55, 0.55]) for (const z of [-0.7, 0.45]) { tube(lp, [x, 1.6, z], [x * 0.95, 0.95, z + (z > 0 ? -0.05 : 0.05)], 0.05, VEL, 6, 0.08); lp.blob(x * 0.95, 0.92, z, 0.03, 0.05, 0.03, LPC.gold, { jitter: 0 }); }
  // candelabri e rose rosse sparse
  for (const s of [-1, 1]) {
    lp.cyl(s * 0.75, 0.1, 0.55, 0.08, 0.03, 0.05, 6, LPC.iron, { jitter: 0 });
    lp.cyl(s * 0.75, 0.15, 0.55, 0.02, 0.02, 0.6, 5, LPC.iron, { jitter: 0 });
    for (const dx of [-0.08, 0, 0.08]) candle(lp, s * 0.75 + dx, 0.75 - Math.abs(dx), 0.55, candles, 0.08);
    tube(lp, [s * 0.75 - 0.08, 0.72, 0.55], [s * 0.75 + 0.08, 0.72, 0.55], 0.008, LPC.iron, 3);
  }
  for (let i = 0; i < 8; i++) lp.blob(r.range(-0.7, 0.7), 0.105, r.range(0.4, 0.7), 0.025, 0.02, 0.025, i % 2 ? '#a81a2a' : '#c82a3a', { jitter: 0 });
  // pipistrelli: di giorno appesi a testa in giù al baldacchino, di notte in volo
  if (!night) for (const [x, z] of [[-0.3, 0.45], [0.1, 0.45], [0.35, -0.7]]) { lp.box(x, 1.55, z, 0.005, 0.05, 0.005, LPC.iron, { jitter: 0 }); lp.blob(x, 1.45, z, 0.03, 0.06, 0.025, '#1b1a20', { jitter: 0 }); }
  else for (const [x, y, z, a] of [[0.4, 1.95, 0.2, 0.3], [-0.5, 2.1, -0.1, -0.5], [0.0, 2.3, -0.4, 0.8], [0.7, 1.7, -0.6, -0.2]]) lp.push([x, y, z], a).plate(batShape(1.3), 0.01, '#1b1a20', { ao: 0 }).pop();
  if (candles) lp.light(0, 0.9, 0.55, LPC.flame, 0.7, 4, 0.35, 0.8);
  return lp.build();
}

/**
 * Angolo della strega (2×2): calderone sul fuoco con la pozione che bolle,
 * scaffale storto di barattoli luminosi, rastrelliera di erbe appese,
 * leggio col libro degli incantesimi, scopa appoggiata.
 */
export function witchCornerLP(lit = true): LPModel {
  const lp = new LP('new2:witch');
  const r = lp.rng;
  // terra battuta e cerchio di sassi del fuoco
  lp.blob(0.1, 0, 0.05, 0.9, 0.02, 0.85, '#3e342a', { vary: 0.1 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; lp.blob(0.25 + Math.cos(a) * 0.42, 0.04, 0.15 + Math.sin(a) * 0.42, 0.09, 0.06, 0.08, LPC.stone, { vary: 0.1 }); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; tube(lp, [0.25 + Math.cos(a) * 0.28, 0.02, 0.15 + Math.sin(a) * 0.28], [0.25 - Math.cos(a) * 0.05, 0.12, 0.15 - Math.sin(a) * 0.05], 0.035, '#4a3628', 5); }
  if (lit) { lp.cyl(0.25, 0.05, 0.15, 0.2, 0.0, 0.25, 6, LPC.flame, { bucket: 'glow', jitter: 0.02 }); lp.light(0.25, 0.25, 0.15, '#ff9a3c', 0.9, 4, 0.5, 0.8); }
  // treppiede e calderone
  for (const a of [0.3, 2.4, 4.5]) tube(lp, [0.25 + Math.cos(a) * 0.45, 0, 0.15 + Math.sin(a) * 0.45], [0.25, 1.05, 0.15], 0.022, LPC.iron, 4);
  tube(lp, [0.25, 1.05, 0.15], [0.25, 0.8, 0.15], 0.008, LPC.iron, 3);
  lp.push([0.25, 0.16, 0.15]);
  lp.lathe(0, 0, 0, [[0.0, 0], [0.2, 0.02], [0.34, 0.14], [0.38, 0.3], [0.33, 0.48], [0.31, 0.52], [0.35, 0.54], [0.33, 0.56], [0.27, 0.54], [0.27, 0.5], [0.0, 0.5]], 12, '#24252a', { jitter: 0, vary: 0.04 });
  const brew = glowIf(lit, '#9af06a', '#3a4a2a');
  lp.cyl(0, 0.52, 0, 0.27, 0.27, 0.015, 12, brew.color, { bucket: brew.bucket, jitter: 0 });
  for (let i = 0; i < 6; i++) lp.blob(r.range(-0.16, 0.16), 0.54 + r.next() * 0.04, r.range(-0.16, 0.16), 0.035, 0.03, 0.035, lit ? '#c8ff9a' : '#4a5a3a', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  for (let i = 0; i < 4; i++) lp.blob(r.range(-0.1, 0.1), 0.72 + i * 0.14, r.range(-0.08, 0.08), 0.07 + i * 0.03, 0.05, 0.07, '#2a3a2a', { bucket: 'ghost', jitter: 0.01 });
  lp.pop();
  // scaffale storto con i barattoli che brillano
  lp.push([-0.6, 0, -0.55], 0.35, 0, 0.04);
  for (const s of [-1, 1]) lp.box(s * 0.32, 0, 0, 0.05, 1.25, 0.22, LPC.woodDark, { vary: 0.1 });
  for (let k = 0; k < 3; k++) {
    lp.box(0, 0.3 + k * 0.38, 0, 0.68, 0.035, 0.24, LPC.wood, { bevel: 0.004, vary: 0.1 });
    for (let j = 0; j < 4; j++) {
      const c = r.pick(['#8a5ad0', '#e04a7a', '#4ab0d0', '#9af06a', '#f0c02a']), h = r.range(0.08, 0.16);
      const g = r.chance(0.6) && lit;
      lp.cyl(-0.24 + j * 0.16, 0.335 + k * 0.38, 0, 0.04, 0.035, h, 7, c, g ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
      lp.cyl(-0.24 + j * 0.16, 0.335 + k * 0.38 + h, 0, 0.018, 0.018, 0.04, 5, '#6b4a3a', { jitter: 0 });
    }
  }
  skull(lp, 0.15, 1.18, 0.0, 0.6);
  lp.pop();
  // rastrelliera di erbe e un serpente secco appesi
  for (const s of [-1, 1]) lp.cyl(0.2 + s * 0.3, 0, -0.9, 0.02, 0.02, 1.1, 4, LPC.woodDark, { jitter: 0 });
  lp.box(0.2, 1.08, -0.9, 0.7, 0.03, 0.03, LPC.woodDark, { jitter: 0 });
  for (let k = 0; k < 5; k++) {
    const x = -0.05 + k * 0.12;
    tube(lp, [x, 1.08, -0.9], [x, 0.98, -0.9], 0.004, '#8a7a5a', 3);
    lp.push([x, 0.98, -0.9], 0, Math.PI).cyl(0, 0, 0, 0.012, 0.05, 0.18, 5, r.pick(['#6a7a3a', '#8a6a4a', '#7a5a7a', '#5a7a5a']), { jitter: 0.01 }).pop();
  }
  // bancarella delle pozioni in vendita: banchetto, boccette in fila con i cartellini, insegna
  lp.push([-0.35, 0, 0.8]);
  lp.box(0, 0, 0, 0.8, 0.42, 0.3, LPC.wood, { bevel: 0.01, vary: 0.1 });
  lp.box(0, 0.42, 0, 0.86, 0.035, 0.34, LPC.woodLight, { bevel: 0.006 });
  for (let j = 0; j < 5; j++) {
    const c = ['#8a5ad0', '#e04a7a', '#9af06a', '#4ab0d0', '#f0c02a'][j];
    lp.lathe(-0.32 + j * 0.16, 0.455, 0.02, [[0.0, 0], [0.045, 0], [0.05, 0.05], [0.02, 0.1], [0.02, 0.13], [0, 0.13]], 7, c, lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
    lp.cyl(-0.32 + j * 0.16, 0.585, 0.02, 0.015, 0.015, 0.03, 5, '#6b4a3a', { jitter: 0 });
    lp.box(-0.32 + j * 0.16, 0.43, 0.175, 0.06, 0.04, 0.005, '#e2d6bb', { jitter: 0 }); // cartellino del prezzo
  }
  for (const s of [-1, 1]) lp.cyl(s * 0.4, 0.42, -0.12, 0.018, 0.018, 0.45, 4, LPC.woodDark, { jitter: 0 });
  lp.box(0, 0.86, -0.12, 0.6, 0.16, 0.025, '#2a2235', { bevel: 0.006 });
  lp.box(-0.18, 0.88, -0.105, 0.07, 0.11, 0.01, '#9af06a', { jitter: 0 });
  for (const w of [0.28, 0.2]) lp.box(0.08, 0.92 - (0.28 - w) * 0.6, -0.105, w, 0.018, 0.006, '#c9a227', { jitter: 0 });
  lp.pop();
  // leggio col libro aperto, scopa appoggiata, gatto nero acciambellato
  lp.push([0.75, 0, -0.45], -0.6);
  lp.cyl(0, 0, 0, 0.12, 0.06, 0.04, 6, LPC.woodDark, { jitter: 0 });
  lp.cyl(0, 0.04, 0, 0.025, 0.025, 0.65, 5, LPC.woodDark, { jitter: 0 });
  lp.push([0, 0.7, 0], 0, -0.6);
  for (const s of [-1, 1]) lp.push([s * 0.09, 0, 0], 0, 0, s * -0.1).box(0, 0, 0, 0.17, 0.02, 0.24, '#e2d6bb', { jitter: 0 }).pop();
  lp.box(0, -0.015, 0, 0.36, 0.015, 0.26, '#5a2a30', { jitter: 0 });
  lp.pop();
  lp.pop();
  tube(lp, [-0.85, 0, 0.55], [-0.95, 1.2, 0.2], 0.022, LPC.woodDark, 5);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; tube(lp, [-0.86, 0.2, 0.52], [-0.84 + Math.cos(a) * 0.08, 0.0, 0.56 + Math.sin(a) * 0.06], 0.012, '#c9a75e', 3); }
  lp.push([0.75, 0.0, 0.45]);
  lp.blob(0, 0.07, 0, 0.14, 0.07, 0.11, '#16161a', { detail: 1, jitter: 0.004 });
  lp.blob(0.1, 0.1, 0.06, 0.07, 0.06, 0.065, '#16161a', { jitter: 0.004 });
  for (const s of [-1, 1]) lp.push([0.1 + s * 0.035, 0.16, 0.06], 0, 0, s * 0.3).cyl(0, 0, 0, 0.02, 0, 0.04, 3, '#16161a', { jitter: 0 }).pop();
  path(lp, [[-0.12, 0.04, 0], [-0.1, 0.03, 0.12], [0.02, 0.02, 0.15]], 0.02, 0.012, '#16161a', 4);
  lp.pop();
  return lp.build();
}

/**
 * Rifugio dei gatti neri (2×2): bara rovesciata con il cuscino come cuccia,
 * tiragraffi fatto con una croce avvolta nella corda, cassette a scaletta,
 * ciotole con le lische, gomitolo, topolino di pezza.
 */
export function catShelterLP(): LPModel {
  const lp = new LP('new2:cats');
  const r = lp.rng;
  // bara aperta in piedi a metà, usata come cuccia (con il cuscino a quadri)
  lp.push([-0.45, 0, -0.3], 0.3);
  const C = new THREE.Shape(); C.moveTo(-0.22, -0.55); C.lineTo(0.22, -0.55); C.lineTo(0.32, 0.15); C.lineTo(0.22, 0.55); C.lineTo(-0.22, 0.55); C.lineTo(-0.32, 0.15); C.closePath();
  lp.push([0, 0, 0], Math.PI / 2, -Math.PI / 2).plate(C, 0.3, '#5a4030', { vary: 0.08 }).pop();
  lp.push([0, 0.2, 0], Math.PI / 2, -Math.PI / 2, 0, [0.85, 0.9, 1]).plate(C, 0.12, '#2a201a', { ao: 0 }).pop();
  lp.blob(0, 0.24, 0.05, 0.22, 0.05, 0.38, '#8e3a3a', { jitter: 0.01 });
  for (let i = 0; i < 4; i++) lp.box(-0.1 + (i % 2) * 0.2, 0.29, -0.2 + Math.floor(i / 2) * 0.35, 0.18, 0.004, 0.16, '#c9b79c', { jitter: 0 });
  lp.pop();
  // tiragraffi: croce di legno avvolta nella corda, con il pallino appeso
  lp.push([0.55, 0, -0.55]);
  lp.box(0, 0, 0, 0.36, 0.06, 0.36, LPC.woodDark, { bevel: 0.01 });
  lp.cyl(0, 0.06, 0, 0.07, 0.07, 0.95, 8, '#b09a70', { jitter: 0 });
  for (let k = 0; k < 14; k++) lp.add(new THREE.TorusGeometry(0.072, 0.008, 3, 10).rotateX(Math.PI / 2).translate(0, 0.1 + k * 0.06, 0), '#a08a62', { jitter: 0 });
  lp.box(0, 0.75, 0, 0.5, 0.08, 0.08, LPC.woodDark, { bevel: 0.01 });
  lp.box(0, 1.0, 0, 0.28, 0.04, 0.28, '#8e3a3a', { bevel: 0.01 }); // piattaforma in cima
  tube(lp, [0.22, 0.75, 0], [0.22, 0.55, 0.02], 0.004, '#a08a62', 3);
  lp.blob(0.22, 0.53, 0.02, 0.035, 0.035, 0.035, '#c84a5a', { jitter: 0 });
  lp.pop();
  // cassette a scaletta
  lp.box(0.6, 0, 0.25, 0.36, 0.26, 0.3, '#8a6849', { bevel: 0.008, vary: 0.1 });
  lp.box(0.62, 0.26, 0.2, 0.3, 0.22, 0.26, '#6b4f36', { bevel: 0.008, vary: 0.1 });
  for (const y of [0.08, 0.18]) lp.box(0.6, y, 0.401, 0.34, 0.02, 0.005, '#4a3a2a', { jitter: 0 });
  // ciotole (latte e lische), gomitolo, topolino di pezza
  lp.cyl(-0.05, 0, 0.55, 0.08, 0.06, 0.05, 9, '#d8d0c0', { jitter: 0 });
  lp.cyl(-0.05, 0.045, 0.55, 0.07, 0.07, 0.008, 9, '#f2ece0', { jitter: 0 });
  lp.cyl(0.17, 0, 0.6, 0.08, 0.06, 0.05, 9, '#6b8ab0', { jitter: 0 });
  tube(lp, [0.11, 0.06, 0.6], [0.23, 0.06, 0.6], 0.006, LPC.bone, 3);
  for (let k = 0; k < 4; k++) tube(lp, [0.13 + k * 0.03, 0.06, 0.6], [0.13 + k * 0.03, 0.06, 0.64], 0.003, LPC.bone, 3);
  lp.blob(-0.25, 0.06, 0.6, 0.06, 0.06, 0.06, '#8a5ad0', { detail: 1, jitter: 0 });
  path(lp, [[-0.25, 0.02, 0.66], [-0.15, 0.005, 0.75], [0.0, 0.005, 0.72]], 0.006, 0.006, '#8a5ad0', 3);
  lp.blob(0.35, 0.03, 0.7, 0.04, 0.03, 0.06, '#9a9690', { jitter: 0 });
  for (const s of [-1, 1]) lp.blob(0.35 + s * 0.02, 0.06, 0.66, 0.015, 0.015, 0.006, '#c99a9a', { jitter: 0 });
  path(lp, [[0.35, 0.02, 0.76], [0.4, 0.01, 0.82], [0.45, 0.01, 0.8]], 0.004, 0.003, '#7a7670', 3);
  deadLeaves(lp, -0.9, -0.9, 0.9, 0.9, 6);
  for (let i = 0; i < 3; i++) grassTuft(lp, r.range(-0.9, -0.6), r.range(0.4, 0.9), 0.8);
  return lp.build();
}

/** Gatto nero acciambellato che dorme (parte del rifugio). */
export function sleepingCatLP(): LPModel {
  const lp = new LP('new2:sleepcat');
  const K = '#16161a';
  lp.blob(0, 0.07, 0, 0.15, 0.08, 0.12, K, { detail: 1, jitter: 0.004 });
  lp.blob(0.1, 0.08, 0.07, 0.075, 0.065, 0.07, K, { jitter: 0.004 });
  for (const s of [-1, 1]) lp.push([0.1 + s * 0.04, 0.14, 0.06], 0, 0, s * 0.3).cyl(0, 0, 0, 0.022, 0, 0.045, 3, K, { jitter: 0 }).pop();
  for (const s of [-1, 1]) lp.box(0.1 + s * 0.025, 0.09, 0.135, 0.025, 0.005, 0.005, '#6a6a70', { jitter: 0 }); // occhi chiusi
  path(lp, [[-0.13, 0.05, 0.02], [-0.1, 0.03, 0.13], [0.03, 0.02, 0.16]], 0.022, 0.014, K, 4);
  return lp.build();
}

// ── Extra ───────────────────────────────────────────────────────────────

/** Scopa volante: manico storto, saggina legata col nastro e la toppa, stelline. */
export function broom2LP(): LPModel {
  const lp = new LP('new2:broom');
  path(lp, [[0, 0, 0.75], [0.01, 0.01, 0.35], [0, 0.0, -0.05], [-0.01, 0.02, -0.35]], 0.024, 0.026, '#5a4030', 6);
  lp.blob(0, 0.0, 0.76, 0.03, 0.03, 0.03, '#5a4030', { jitter: 0 });
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2, rr = 0.06 + (i % 3) * 0.02;
    path(lp, [[0, 0.02, -0.35], [Math.cos(a) * rr * 0.8, 0.02 + Math.sin(a) * rr * 0.7, -0.55], [Math.cos(a) * rr * 1.5, 0.02 + Math.sin(a) * rr * 1.2, -0.85 - (i % 4) * 0.03]], 0.012, 0.008, i % 2 ? '#c9a75e' : '#a8884a', 3);
  }
  lp.cyl(0, 0.0, -0.36, 0.045, 0.045, 0.07, 8, '#8e2f2a', { jitter: 0 });
  lp.push([0, 0.02, -0.36], 0, Math.PI / 2).cyl(0, -0.035, 0, 0.048, 0.048, 0.07, 8, '#8e2f2a', { jitter: 0 }).pop();
  return lp.build();
}

/**
 * Bastone mistico: legno contorto che si apre in radici attorno a un
 * cristallo dove gira un fuoco fatuo; anelli di runa e ciondoli (ossicino, piuma).
 */
export function mysticStaffLP(lit = true): LPModel {
  const lp = new LP('new2:staff');
  const W = '#5a4030';
  // asta contorta (spirale di due tubi)
  const pts: V3[] = [];
  for (let i = 0; i <= 10; i++) pts.push([Math.sin(i * 0.9) * 0.012, i * 0.085, Math.cos(i * 0.9) * 0.012]);
  path(lp, pts, 0.026, 0.02, W, 6);
  for (const y of [0.25, 0.55]) lp.add(new THREE.TorusGeometry(0.03, 0.008, 4, 10).rotateX(Math.PI / 2).translate(0, y, 0), LPC.gold, { jitter: 0 });
  // corona di radici che abbraccia il cristallo
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    path(lp, [[0, 0.85, 0], [Math.cos(a) * 0.07, 0.95, Math.sin(a) * 0.07], [Math.cos(a) * 0.06, 1.08, Math.sin(a) * 0.06], [Math.cos(a + 0.6) * 0.02, 1.16, Math.sin(a + 0.6) * 0.02]], 0.014, 0.006, W, 4);
  }
  const g = glowIf(lit, '#8ff0dc', '#3a5a52');
  lp.push([0, 1.0, 0], 0.4).blob(0, 0, 0, 0.055, 0.075, 0.055, g.color, { bucket: g.bucket, jitter: 0, detail: 0 }).pop();
  if (lit) lp.blob(0, 1.0, 0, 0.03, 0.04, 0.03, '#e8fff8', { bucket: 'glow', jitter: 0 });
  // ciondoli: ossicino e piuma
  tube(lp, [0.04, 0.84, 0], [0.06, 0.74, 0.02], 0.003, '#8a7a5a', 3);
  tube(lp, [0.055, 0.72, 0.02], [0.065, 0.66, 0.02], 0.007, LPC.bone, 4);
  tube(lp, [-0.04, 0.84, 0], [-0.07, 0.76, 0], 0.003, '#8a7a5a', 3);
  lp.push([-0.075, 0.74, 0], 0, 0, 0.3).blob(0, -0.04, 0, 0.012, 0.05, 0.004, '#3a3a48', { jitter: 0 }).pop();
  if (lit) lp.light(0, 1.0, 0, '#8ff0dc', 0.6, 3, 0.3, 0.9);
  return lp.build();
}

/** Fuoco fatuo in volo verso il bastone, con la scia. */
export function wispTrailLP(len = 0.6): LPModel {
  const lp = new LP(`new2:trail:${len}`);
  lp.push([0, 0, 0], 0, 0, 0, 1);
  lp.blob(0, 0, 0, 0.06, 0.08, 0.06, '#8ff0dc', { bucket: 'glow', jitter: 0 });
  lp.blob(0, 0.01, 0, 0.03, 0.04, 0.03, '#e8fff8', { bucket: 'glow', jitter: 0 });
  for (let i = 1; i <= 5; i++) lp.blob(0, 0, -i * (len / 5), 0.05 * (1 - i / 6), 0.05 * (1 - i / 6), 0.05 * (1 - i / 6), '#4fae98', { bucket: 'glow', jitter: 0 });
  lp.pop();
  return lp.build();
}

// ── Stagionali ──────────────────────────────────────────────────────────

/**
 * Campo di zucche (3×3, ottobre): zolla irregolare, zucche di ogni misura
 * sparse a caso tra viticci e foglie larghe, una gigante, alcune
 * intagliate e accese, spaventapasseri con il sacco di iuta e la paglia.
 */
export function pumpkinPatch2LP(lit = true): LPModel {
  const lp = new LP('new2:patch');
  const r = lp.rng;
  // zolla di terra irregolare, solchi appena accennati
  lp.push([0, 0.003, 0], 0, -Math.PI / 2).plate(irregularShape(r, 1.35, 11, 0.95), 0.03, LPC.soil, { ao: 0, vary: 0.1 }).pop();
  for (let i = 0; i < 6; i++) lp.push([r.range(-0.9, 0.9), 0.035, r.range(-0.9, 0.9)], r.range(0, 6), -Math.PI / 2).plate(irregularShape(r, 0.25, 7, 0.6), 0.008, LPC.soilDark, { ao: 0 }).pop();
  // posizioni a caso, distanziate (niente file né ordine di grandezza)
  const spots: Array<[number, number, number]> = [];
  for (let tries = 0; spots.length < 11 && tries < 400; tries++) {
    const x = r.range(-1.05, 1.05), z = r.range(-1.0, 1.0);
    const s = spots.length === 0 ? 0.3 : r.chance(0.25) ? r.range(0.17, 0.22) : r.range(0.08, 0.15);
    if (Math.hypot(x, z) > 1.15 || (x > 0.55 && z < -0.55)) continue;
    if (spots.some(([a, b, c]) => Math.hypot(a - x, b - z) < (c + s) * 1.35)) continue;
    spots.push([x, z, s]);
  }
  // viticci che collegano le zucche, foglie larghe a cuore
  for (let i = 1; i < spots.length; i++) {
    const [x0, z0] = spots[i - 1], [x1, z1] = spots[i];
    const mx = (x0 + x1) / 2 + r.range(-0.15, 0.15), mz = (z0 + z1) / 2 + r.range(-0.15, 0.15);
    path(lp, [[x0, 0.04, z0], [mx, 0.06, mz], [x1, 0.04, z1]], 0.012, 0.01, '#4d5a2e', 4);
    for (let k = 0; k < 2; k++) {
      lp.push([mx + r.range(-0.1, 0.1), 0.06, mz + r.range(-0.1, 0.1)], r.range(0, 6), -Math.PI / 2 + r.range(-0.3, 0.3));
      lp.plate(irregularShape(r, 0.17, 7, 0.9), 0.008, r.pick(['#4d5a2e', '#5a6a34', '#6a6a30', '#7a6a2e']), { ao: 0, vary: 0.1 });
      lp.pop();
    }
    // riccioli dei viticci
    lp.add(new THREE.TorusGeometry(0.04, 0.004, 3, 10, Math.PI * 1.6).rotateX(Math.PI / 2 - 0.3).translate(mx, 0.08, mz), '#5a6a34', { jitter: 0 });
  }
  spots.forEach(([x, z, s], i) => {
    const carved = i !== 0 && r.chance(0.35);
    pumpkin(lp, x, 0.03, z, s, carved, lit, r.range(-0.8, 0.8));
    if (r.chance(0.35)) lp.blob(x + s * 0.8, 0.03, z, s * 0.4, s * 0.2, s * 0.35, '#3a2a20', { jitter: 0.01 }); // terra smossa
  });
  pumpkin(lp, spots[0][0] + 0.12, 0.03 + 0.42, spots[0][1] + 0.02, 0.09, true, lit, 0.4); // zucchina in cima alla gigante
  // spaventapasseri
  lp.push([0.85, 0, -0.85], -0.6);
  lp.cyl(0, 0, 0, 0.035, 0.03, 1.45, 5, LPC.woodDark, { jitter: 0 });
  lp.push([0, 1.05, 0], 0, 0, Math.PI / 2).cyl(0, -0.38, 0, 0.025, 0.025, 0.76, 5, LPC.woodDark, { jitter: 0 }).pop();
  lp.box(0, 0.7, 0, 0.34, 0.45, 0.18, '#8a7a50', { bevel: 0.02, vary: 0.15 }); // sacco di iuta
  lp.box(0.08, 0.82, 0.095, 0.1, 0.1, 0.01, '#6b2f35', { jitter: 0 }); // toppa
  lp.box(-0.06, 0.74, 0.095, 0.08, 0.06, 0.01, '#3a4a6a', { jitter: 0 });
  for (const s of [-1, 1]) {
    lp.push([s * 0.25, 1.05, 0], 0, 0, s * 0.1).box(0, -0.08, 0, 0.32, 0.14, 0.14, '#5a4a3a', { bevel: 0.015, vary: 0.12 }).pop(); // maniche
    for (let k = 0; k < 4; k++) tube(lp, [s * 0.42, 1.02, 0], [s * (0.48 + r.next() * 0.05), 0.95 - k * 0.03, r.range(-0.05, 0.05)], 0.008, '#d8b860', 3); // paglia
  }
  for (let k = 0; k < 5; k++) tube(lp, [0, 0.48, 0], [r.range(-0.08, 0.08), 0.38, r.range(-0.05, 0.05)], 0.008, '#d8b860', 3);
  pumpkin(lp, 0, 1.13, 0.0, 0.14, true, lit);
  lp.cyl(0, 1.34, 0, 0.24, 0.23, 0.02, 10, '#2a2235', { jitter: 0 });
  lp.push([0, 1.36, 0], 0, -0.1, 0.12).cyl(0, 0, 0, 0.11, 0.0, 0.3, 9, '#2a2235', { jitter: 0 }).pop();
  lp.blob(-0.38, 1.12, 0.0, 0.05, 0.045, 0.08, '#1f2128', { jitter: 0 }); // corvo sul braccio
  lp.blob(-0.38, 1.18, 0.05, 0.035, 0.035, 0.035, '#1f2128', { jitter: 0 });
  lp.pop();
  for (let i = 0; i < 6; i++) { const a = r.range(0, 6.28); grassTuft(lp, Math.cos(a) * 1.4, Math.sin(a) * 1.35, 0.9, ['#6b6242', '#7a6e4c', '#55603a']); }
  return lp.build();
}

/** Fiore di cempasúchil (pompon arancione a petali arricciati). */
function marigold(lp: LP, x: number, y: number, z: number, s = 1) {
  const r = lp.rng;
  const c = r.pick(['#f0901f', '#f6a92a', '#e07a1a', '#f4b030']);
  lp.blob(x, y, z, 0.05 * s, 0.04 * s, 0.05 * s, c, { detail: 1, jitter: 0.012 * s });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; lp.blob(x + Math.cos(a) * 0.035 * s, y - 0.005 * s, z + Math.sin(a) * 0.035 * s, 0.025 * s, 0.018 * s, 0.025 * s, i % 2 ? c : '#d8681a', { jitter: 0.006 * s }); }
}

/** Teschio di zucchero decorato (calavera): occhi a fiore, puntini colorati. */
function calavera(lp: LP, x: number, y: number, z: number, s = 1, yaw = 0) {
  lp.push([x, y, z], yaw, 0, 0, s);
  skull(lp, 0, 0, 0, 1, '#f6f0e4');
  const cols = ['#e04a7a', '#3ab0a0', '#f0c02a', '#9a5ad0'];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; lp.blob(sx * 0.04 + Math.cos(a) * 0.035, 0.1 + Math.sin(a) * 0.035, 0.1, 0.012, 0.012, 0.005, cols[(i + (sx > 0 ? 1 : 0)) % 4], { jitter: 0 }); }
  }
  for (let i = 0; i < 3; i++) lp.blob(-0.03 + i * 0.03, 0.18, 0.08, 0.012, 0.012, 0.006, cols[i], { jitter: 0 }); // fiore in fronte
  lp.blob(0, 0.19, 0.075, 0.015, 0.015, 0.008, '#f0c02a', { jitter: 0 });
  lp.pop();
}

/**
 * Altare dei morti (3×2, 2 novembre): tre gradini con le tovaglie
 * traforate, arco di canne coperto di cempasúchil, papel picado ritagliato,
 * ritratti, calaveras, pan de muerto, candele a gruppi, vasi di fiori,
 * bicchiere d'acqua, incensiere col fumo di copale, sentiero di petali.
 */
export function ofrenda2LP(lit = true): LPModel {
  const lp = new LP('new2:ofrenda');
  const r = lp.rng;
  const CLOTH = '#7a2a5a';
  const tiers = [{ y: 0, z: 0.1, w: 2.0, d: 0.9 }, { y: 0.3, z: -0.05, w: 1.6, d: 0.6 }, { y: 0.6, z: -0.2, w: 1.2, d: 0.32 }];
  for (const [i, t] of tiers.entries()) {
    lp.box(0, t.y, t.z, t.w, 0.3, t.d, i === 1 ? '#5a2a4a' : CLOTH, { bevel: 0.01, vary: 0.05 });
    // tovaglia bianca che ricade davanti con l'orlo a smerli traforati
    lp.box(0, t.y + 0.3, t.z, t.w + 0.04, 0.012, t.d + 0.04, '#efe6d6', { jitter: 0 });
    const n = Math.round(t.w / 0.08);
    for (let k = 0; k < n; k++) lp.push([-t.w / 2 + (k + 0.5) * (t.w / n), t.y + 0.25, t.z + t.d / 2 + 0.022]).add(new THREE.CircleGeometry(0.04, 6, 0, Math.PI).rotateZ(Math.PI), '#efe6d6', { jitter: 0, ao: 0 }).pop();
    lp.box(0, t.y + 0.25, t.z + t.d / 2 + 0.021, t.w + 0.04, 0.06, 0.004, '#efe6d6', { jitter: 0 });
  }
  // arco di canne coperto di cempasúchil sopra il gradino più alto
  const AR: V3[] = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI; AR.push([Math.cos(a) * 0.95, 0.9 + Math.sin(a) * 0.95, -0.35]); }
  for (const s of [-1, 1]) path(lp, [[s * 0.95, 0, -0.35], [s * 0.95, 0.9, -0.35]], 0.02, 0.02, '#8a7a4a', 4);
  path(lp, AR, 0.02, 0.02, '#8a7a4a', 4);
  for (let i = 0; i < AR.length; i++) {
    const [x, y, z] = AR[i];
    marigold(lp, x, y, z + 0.04, 1.1); marigold(lp, x * 0.97, y - 0.06, z - 0.03, 0.9);
    if (i % 2) lp.blob(x * 1.05, y, z, 0.04, 0.012, 0.03, '#4d6a2e', { jitter: 0 });
  }
  for (const s of [-1, 1]) for (let k = 0; k < 8; k++) marigold(lp, s * 0.95 + r.range(-0.03, 0.03), 0.1 + k * 0.11, -0.31, 1);
  // papel picado: fogli traforati su due fili, colori vivi
  const PC = ['#e04a7a', '#f0c02a', '#3ab0a0', '#9a5ad0', '#f0702a'];
  for (const [row, yy] of [[0, 1.55], [1, 1.32]] as const) {
    rope(lp, [-0.92, yy, -0.25], [0.92, yy, -0.25], 0.07, 0.004, '#2a2420', 8);
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8, x = -0.92 + t * 1.84, y = yy - Math.sin(t * Math.PI) * 0.07;
      const sh = new THREE.Shape(); sh.moveTo(-0.09, 0); sh.lineTo(0.09, 0); sh.lineTo(0.09, -0.17);
      for (let k = 0; k < 5; k++) sh.lineTo(0.09 - (k + 0.5) * 0.036, k % 2 ? -0.17 : -0.2);
      sh.lineTo(-0.09, -0.17); sh.closePath();
      for (const [hx, hy, hr] of [[0, -0.07, 0.035], [-0.05, -0.12, 0.018], [0.05, -0.12, 0.018], [0, -0.14, 0.014]]) { const hole = new THREE.Path(); hole.absarc(hx, hy, hr, 0, Math.PI * 2, true); sh.holes.push(hole); }
      lp.push([x, y, -0.25 + row * 0.01]).plate(sh, 0.004, PC[(i + row) % PC.length], { ao: 0 }).pop();
    }
  }
  // ritratti incorniciati sul gradino alto (la foto: una sagoma su fondo seppia)
  for (const [x, yaw] of [[-0.32, 0.15], [0.3, -0.15]] as const) {
    lp.push([x, 0.91, -0.25], yaw, -0.12);
    lp.box(0, 0, 0, 0.24, 0.3, 0.03, LPC.gold, { bevel: 0.008 });
    lp.box(0, 0.03, 0.016, 0.18, 0.24, 0.004, '#c8b08a', { jitter: 0 });
    lp.blob(0, 0.17, 0.02, 0.045, 0.055, 0.004, '#5a4a3a', { jitter: 0 });
    lp.blob(0, 0.07, 0.02, 0.07, 0.05, 0.004, '#5a4a3a', { jitter: 0 });
    lp.pop();
  }
  lp.add(new THREE.BoxGeometry(0.03, 0.22, 0.02).translate(0, 1.02, -0.25), LPC.gold, { jitter: 0 }); // croce
  lp.add(new THREE.BoxGeometry(0.12, 0.03, 0.02).translate(0, 1.07, -0.25), LPC.gold, { jitter: 0 });
  // calaveras sul gradino di mezzo
  for (const [x, yaw] of [[-0.55, 0.3], [-0.2, 0.1], [0.25, -0.1], [0.58, -0.3]] as const) calavera(lp, x, 0.63, 0.05, 0.95, yaw);
  // pan de muerto, bicchiere d'acqua, incensiere col fumo
  lp.push([-0.55, 0.31, 0.38]);
  lp.blob(0, 0.06, 0, 0.13, 0.07, 0.13, '#c88a4a', { detail: 1, jitter: 0.004 });
  for (const a of [0, Math.PI / 2]) lp.push([0, 0.12, 0], a).box(0, 0, 0, 0.22, 0.025, 0.03, '#b07a3a', { bevel: 0.008 }).pop();
  lp.blob(0, 0.15, 0, 0.03, 0.03, 0.03, '#b07a3a', { jitter: 0 });
  for (let i = 0; i < 10; i++) lp.blob(r.range(-0.1, 0.1), 0.12, r.range(-0.1, 0.1), 0.008, 0.004, 0.008, '#f2ece0', { jitter: 0 });
  lp.pop();
  lp.cyl(-0.25, 0.31, 0.4, 0.04, 0.035, 0.12, 8, '#bfe6dd', { bucket: 'ghost', jitter: 0 });
  lp.cyl(-0.25, 0.32, 0.4, 0.033, 0.033, 0.08, 8, '#2a4a50', { bucket: 'water', jitter: 0 });
  lp.push([0.5, 0.31, 0.36]);
  lp.lathe(0, 0, 0, [[0.04, 0], [0.07, 0.04], [0.08, 0.1], [0, 0.1]], 8, '#8a6a4a', { jitter: 0 });
  lp.cyl(0, -0.0, 0, 0.03, 0.05, 0.04, 6, '#8a6a4a', { jitter: 0 });
  for (let i = 0; i < 4; i++) lp.blob(Math.sin(i) * 0.04, 0.2 + i * 0.12, Math.cos(i * 1.3) * 0.03, 0.05 + i * 0.015, 0.05, 0.05 + i * 0.015, '#3a3a40', { bucket: 'ghost', jitter: 0.01 });
  lp.pop();
  // vasi con mazzi di cempasúchil ai lati
  for (const s of [-1, 1]) {
    lp.lathe(s * 0.82, 0.31, 0.3, [[0.0, 0], [0.07, 0], [0.09, 0.08], [0.06, 0.18], [0.07, 0.22], [0, 0.22]], 8, '#3a7ab0', { jitter: 0 });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; tube(lp, [s * 0.82, 0.52, 0.3], [s * 0.82 + Math.cos(a) * 0.08, 0.68 + (k % 2) * 0.06, 0.3 + Math.sin(a) * 0.06], 0.006, '#4d6a2e', 3); marigold(lp, s * 0.82 + Math.cos(a) * 0.08, 0.7 + (k % 2) * 0.06, 0.3 + Math.sin(a) * 0.06, 0.9); }
  }
  // candele a gruppi di altezze diverse
  for (const [x, y, z, n] of [[-0.85, 0.31, 0.45, 3], [0.05, 0.31, 0.45, 4], [0.85, 0.31, 0.48, 2], [-0.7, 0.61, 0.15, 2], [0.65, 0.61, 0.12, 3], [0.0, 0.91, -0.12, 3]] as const) {
    for (let k = 0; k < n; k++) candle(lp, x + (k - (n - 1) / 2) * 0.06, y, z + (k % 2) * 0.04, lit, 0.06 + r.next() * 0.12);
  }
  // sentiero di petali e candele a terra davanti
  for (let i = 0; i < 70; i++) { const t = r.next(); lp.blob(r.range(-0.25, 0.25) * (1 - t * 0.4), 0.005, 0.6 + t * 0.55, 0.02, 0.005, 0.016, r.pick(['#f0901f', '#f6a92a', '#e07a1a']), { jitter: 0 }); }
  for (const s of [-1, 1]) candle(lp, s * 0.35, 0, 0.95, lit, 0.1);
  if (lit) { lp.light(0, 0.8, 0.5, LPC.flame, 0.7, 4.5, 0.35, 0.9); lp.light(0, 1.2, -0.1, LPC.flame, 0.4, 3, 0.35, 0.6); }
  return lp.build();
}

/**
 * Pupazzo di neve scheletro (1×1, dicembre): due palle di neve e sopra un
 * teschio col cilindro, sciarpa, braccia d'osso e carota nel naso. Pochi pezzi.
 */
export function skeletonSnowman2LP(): LPModel {
  const lp = new LP('new2:snowman');
  const SN = '#e8eef0', BONE = '#d2c3a0';
  lp.blob(0, 0.26, 0, 0.3, 0.26, 0.3, SN, { detail: 1, jitter: 0.006, vary: 0.03 });
  lp.blob(0, 0.66, 0, 0.21, 0.19, 0.21, SN, { detail: 1, jitter: 0.005, vary: 0.03 });
  for (const y of [0.56, 0.68]) lp.blob(0, y, 0.205, 0.022, 0.022, 0.012, '#2a2a30', { jitter: 0 }); // bottoni di carbone
  for (const s of [-1, 1]) boneStick(lp, [s * 0.18, 0.7, 0], [s * 0.46, 0.92, 0.04], 0.018, BONE); // braccia d'osso
  lp.cyl(0, 0.82, 0, 0.16, 0.16, 0.06, 12, '#8e2f2a', { jitter: 0 }); // sciarpa
  lp.push([0.11, 0.84, 0.12], 0, 0, 0.2).box(0, -0.18, 0, 0.08, 0.2, 0.02, '#8e2f2a', { jitter: 0 }).pop();
  skull(lp, 0, 0.86, 0, 1.6, BONE);
  lp.push([0, 0.98, 0.18], 0, Math.PI / 2 - 0.1).cyl(0, 0, 0, 0.022, 0.0, 0.13, 6, '#e07a1a', { jitter: 0 }).pop(); // carota
  lp.cyl(0.02, 1.16, 0, 0.17, 0.17, 0.02, 12, '#141418', { jitter: 0 }); // cilindro
  lp.cyl(0.02, 1.18, 0, 0.1, 0.1, 0.22, 12, '#141418', { jitter: 0 });
  lp.cyl(0.02, 1.2, 0, 0.102, 0.102, 0.035, 12, '#5a2a30', { jitter: 0 });
  return lp.build();
}

// ── Mietitore di pietra e impronte di fango ─────────────────────────────

/**
 * Mietitore di pietra (2×2): statua incappucciata consumata dal tempo, la
 * tonaca a pieghe, una mano ossuta che regge la falce, su un basamento;
 * muschio sulle spalle. Di notte due puntini luminosi sotto il cappuccio.
 */
export function reaperLP(night: boolean): LPModel {
  const lp = new LP(`new2:reaper:${night}`);
  const r = lp.rng;
  const ST = '#8f8b84', ST2 = '#7a766f';
  const mossy = { topTint: '#73843c', topAmount: 0.45 };
  // basamento a due gradini
  lp.box(0, 0, 0, 1.3, 0.14, 1.1, ST2, { bevel: 0.02, vary: 0.06, ...mossy });
  lp.box(0, 0.14, 0, 1.0, 0.12, 0.85, ST, { bevel: 0.015, vary: 0.06 });
  const B = 0.26;
  // tonaca: cono svasato a pieghe
  lp.lathe(0, B, -0.02, [[0.42, 0], [0.4, 0.15], [0.33, 0.55], [0.27, 0.95], [0.24, 1.12], [0.0, 1.14]], 8, ST, { vary: 0.06, jitter: 0.02, ao: 0.3, ...mossy });
  // pieghe morbide che seguono la tonaca e un orlo ondulato che ricade sul basamento
  const robeR = (h: number) => h < 0.15 ? 0.42 - h * 0.13 : h < 0.55 ? 0.4 - (h - 0.15) * 0.175 : 0.33 - (h - 0.55) * 0.15;
  for (let k = 0; k < 7; k++) {
    const a0 = (k / 7) * Math.PI * 2 + r.range(-0.15, 0.15), sway = r.range(-0.18, 0.18);
    const pts: V3[] = [0.02, 0.3, 0.6, 0.85].map((h, i) => { const a = a0 + sway * (1 - i / 3), rr = robeR(h) - 0.01; return [Math.sin(a) * rr, B + h, -0.02 + Math.cos(a) * rr]; });
    path(lp, pts, 0.045, 0.012, ST, 5);
  }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; lp.blob(Math.sin(a) * 0.4, B + 0.015, -0.02 + Math.cos(a) * 0.4, 0.08, 0.03, 0.06, ST, { jitter: 0.008, vary: 0.05 }); }
  lp.blob(0, B + 1.08, -0.02, 0.34, 0.13, 0.27, ST, { vary: 0.06, jitter: 0.02, ...mossy }); // spalle
  // cappuccio: guscio a punta chinato in avanti, bordo spesso e buio dentro
  lp.push([0, B + 1.3, 0.02], 0, 0.22);
  lp.blob(0, 0, -0.02, 0.24, 0.27, 0.25, ST, { detail: 1, vary: 0.06, jitter: 0.015, ...mossy });
  lp.blob(0, 0.16, -0.16, 0.12, 0.14, 0.12, ST, { jitter: 0.01, ...mossy });
    const rim = new THREE.TorusGeometry(0.16, 0.045, 5, 10); rim.scale(1, 1.2, 1);
  lp.push([0, -0.03, 0.2]).add(rim, ST2, { vary: 0.05, jitter: 0.008 }).pop();
  lp.blob(0, -0.03, 0.17, 0.15, 0.19, 0.09, '#121115', { jitter: 0 }); // buio sotto il cappuccio
  for (const s of [-1, 1]) lp.blob(s * 0.055, 0.0, 0.25, 0.022, 0.016, 0.01, night ? '#9af0ff' : '#1d1d22', night ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  lp.pop();
  // falce: manico storto davanti a destra, lama larga sopra la testa
  const SX = 0.4, SZ = 0.3, TOP = B + 2.0;
  tube(lp, [SX, B - 0.02, SZ], [SX - 0.04, TOP, SZ - 0.05], 0.032, '#5a4a3a', 6, 0.026);
  lp.push([SX - 0.04, TOP - 0.02, SZ - 0.05]);
  const blade = new THREE.Shape();
  blade.moveTo(0, 0.04); blade.quadraticCurveTo(-0.5, 0.2, -0.95, -0.22); blade.quadraticCurveTo(-0.5, -0.02, 0, -0.08); blade.closePath();
  lp.extrude(blade, 0.03, '#8d929a', { jitter: 0, vary: 0.04, ...mossy });
  lp.pop();
  lp.box(SX - 0.04, TOP - 0.06, SZ - 0.05, 0.08, 0.06, 0.06, '#4a3f35', { jitter: 0 }); // ghiera
  // braccio dalla spalla alla mano, mano ossuta sul manico
  tube(lp, [0.26, B + 1.06, 0.02], [SX - 0.02, B + 0.92, SZ - 0.02], 0.085, ST, 6, 0.065, { vary: 0.06 });
  for (let f = 0; f < 4; f++) lp.box(SX - 0.03 + (f % 2) * 0.004, B + 0.95 - f * 0.035, SZ + 0.035, 0.05, 0.022, 0.03, '#b8b2a4', { jitter: 0 });
  // erba alla base, un ciuffo di muschio, foglie
  for (let i = 0; i < 7; i++) { const a = r.range(0, 6.28); grassTuft(lp, Math.sin(a) * 0.75, Math.cos(a) * 0.65, 1, ['#6a7a34', '#55603a']); }
  moss(lp, -0.3, 0.27, 0.3, 0.1);
  deadLeaves(lp, -0.7, -0.6, 0.7, 0.6, 6);
  if (night) lp.light(0, B + 1.3, 0.5, '#9af0ff', 0.1, 1.5, 0.3, 0);
  return lp.build();
}

/**
 * Impronte di fango (1 asset per tutte le tombe): una scia di orme di
 * zombie (un piede trascinato) che attraversa il basamento della tomba,
 * con qualche schizzo. Si appoggia sopra la tomba sporcata da uno zombie.
 */
export function mudTracksLP(seed = 1): LPModel {
  const lp = new LP(`new2:tracks:${seed}`);
  const r = lp.rng;
  // altezza del tumulo (stesso blob della tomba) per appoggiarci le orme
  const moundY = (x: number, z: number) => { const k = 1 - (x / 0.5) ** 2 - ((z - 0.32) / 0.56) ** 2; return k > 0 ? 0.11 * Math.sqrt(k) : 0; };
  const foot = (x: number, z: number, yaw: number, drag: boolean) => {
    const onMound = moundY(x, z) > 0, y = moundY(x, z) + 0.008;
    const col = onMound ? '#1a130f' : r.pick(['#4a3a2c', '#3e3026']);
    lp.push([x, y, z], yaw, -Math.PI / 2);
    const oval = (cx: number, cy: number, rx: number, ry: number) => { const e = new THREE.Shape(); e.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0); lp.plate(e, 0.004, col, { ao: 0 }); };
    if (drag) oval(0, -0.04, 0.05, 0.16); // piede trascinato: strisciata lunga
    else { oval(0, 0.03, 0.062, 0.075); oval(0, -0.1, 0.045, 0.045); } // pianta e tallone staccati
    for (let t = 0; t < 4; t++) oval(-0.045 + t * 0.03, (drag ? 0.15 : 0.13) - Math.abs(t - 1.5) * 0.012, 0.016, 0.019); // dita
    lp.pop();
  };
  // scia che attraversa la tomba: un passo buono e uno trascinato
  const n = 9, z0 = 0.95 + r.range(-0.1, 0.1), z1 = 0.05 + r.range(-0.1, 0.1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = -1.15 + t * 2.3, z = z0 + (z1 - z0) * t + (i % 2 ? 0.08 : -0.08);
    const yaw = Math.atan2(2.3, z1 - z0) + r.range(-0.15, 0.15);
    foot(x, z, yaw, i % 2 === 1);
  }
  for (let i = 0; i < 8; i++) { // zolle cadute
    const x = r.range(-1.0, 1.0), z = z0 + (z1 - z0) * ((x + 1.15) / 2.3) + r.range(-0.25, 0.25);
    lp.blob(x, moundY(x, z) + 0.01, z, r.range(0.025, 0.05), 0.02, r.range(0.025, 0.04), r.pick(['#4a3a2c', '#3e3026']), { jitter: 0.006 });
  }
  return lp.build();
}

// ── Lampione del Custode ───────────────────────────────────────────────

/**
 * Lampione del Custode (1×1): non è in ghisa come gli altri ma è il suo
 * bastone piantato a terra — legno storto col ricciolo in cima — da cui
 * pende la sua lanterna a petrolio. Il cappello appeso al piolo, la
 * sciarpa rossa annodata, il mazzo di chiavi e la latta dell'olio ai
 * piedi: si capisce di chi è. Tiene accese le luci vicine (non si rompono).
 */
export function custodeLamp2LP(lit: boolean): LPModel {
  const lp = new LP(`new2:custodelamp:${lit}`);
  const r = lp.rng;
  const W = LPC.woodDark, RED = '#a4473b', HAT = '#4a3326', BRASS = '#9a7a44';
  // piede: zolla di terra con i sassi che tengono su il palo
  lp.blob(0, 0, 0, 0.3, 0.07, 0.28, LPC.soilDark, { jitter: 0.02, vary: 0.1, ao: 0 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + r.range(-0.2, 0.2); lp.blob(Math.sin(a) * 0.17, 0.04, Math.cos(a) * 0.15, r.range(0.05, 0.08), r.range(0.04, 0.06), r.range(0.05, 0.07), r.pick([LPC.stone, LPC.stoneDark]), { jitter: 0.012, topTint: LPC.moss, topAmount: 0.3 }); }
  // palo storto che finisce nel ricciolo del bastone (alto come un lampione)
  lp.push([0, 0, 0], 0, 0, 0, 1.3);
  const pole: V3[] = [[0, 0.02, 0], [0.025, 0.6, 0.01], [-0.02, 1.2, -0.01], [0.01, 1.75, 0]];
  const C = [0.2, 1.82], R = 0.2;
  for (let k = 1; k <= 7; k++) { const t = Math.PI - (k / 7) * (Math.PI + 0.5); pole.push([C[0] + Math.cos(t) * R, C[1] + Math.sin(t) * R * 1.05, 0]); }
  path(lp, pole, 0.055, 0.03, W, 6);
  lp.blob(-0.035, 0.95, 0.02, 0.03, 0.05, 0.03, W, { jitter: 0.005 }); // nodo del legno
  // lanterna a petrolio appesa alla punta: catenella, cappello, globo, serbatoio
  const tip = pole[pole.length - 1], LX = tip[0], LY = tip[1] - 0.24;
  tube(lp, tip, [LX, LY + 0.17, 0], 0.008, LPC.iron, 4);
  lp.push([LX, LY + 0.2, 0], 0, 0, Math.PI / 2).add(new THREE.TorusGeometry(0.03, 0.008, 3, 8), LPC.iron, { jitter: 0 }).pop();
  lp.lathe(LX, LY + 0.07, 0, [[0.1, 0], [0.09, 0.03], [0.04, 0.09], [0, 0.1]], 8, LPC.iron, { jitter: 0 });
  lp.lathe(LX, LY - 0.17, 0, [[0.05, 0], [0.095, 0.06], [0.1, 0.13], [0.075, 0.21], [0.05, 0.24], [0, 0.24]], 9, lit ? LPC.lantern : '#3c3a35', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; tube(lp, [LX + Math.cos(a) * 0.08, LY - 0.18, Math.sin(a) * 0.08], [LX + Math.cos(a) * 0.115, LY - 0.05, Math.sin(a) * 0.115], 0.007, LPC.iron, 3); tube(lp, [LX + Math.cos(a) * 0.115, LY - 0.05, Math.sin(a) * 0.115], [LX + Math.cos(a) * 0.08, LY + 0.07, Math.sin(a) * 0.08], 0.007, LPC.iron, 3); }
  lp.cyl(LX, LY - 0.25, 0, 0.1, 0.11, 0.08, 9, BRASS, { jitter: 0, vary: 0.05 });
  if (lit) lp.cyl(LX, LY - 0.13, 0, 0.025, 0, 0.09, 4, LPC.flameCore, { bucket: 'glow', jitter: 0 });
  // cappello del Custode appeso al piolo, un po' storto
  tube(lp, [0, 1.36, 0.03], [0, 1.39, 0.13], 0.014, LPC.woodLight, 4);
  lp.push([0.01, 1.3, 0.1], 0.15, Math.PI / 2 - 0.25, 0.12);
  lp.cyl(0, 0, 0, 0.21, 0.2, 0.025, 12, HAT, { jitter: 0, vary: 0.06 });
  lp.lathe(0, 0.025, 0, [[0.1, 0], [0.1, 0.1], [0.085, 0.14], [0, 0.145]], 10, HAT, { jitter: 0 });
  lp.cyl(0, 0.028, 0, 0.104, 0.104, 0.03, 10, RED, { jitter: 0 });
  lp.pop();
  // sciarpa rossa annodata con le due code
  lp.cyl(-0.012, 1.03, 0, 0.07, 0.07, 0.07, 8, RED, { jitter: 0.004, vary: 0.06 });
  lp.blob(0.06, 1.06, 0.03, 0.035, 0.03, 0.03, RED, { jitter: 0.004 });
  for (const [dx, a] of [[0.07, -0.25], [0.1, -0.5]] as const) lp.push([dx, 1.04, 0.035], 0, 0, a).box(0, -0.2, 0, 0.05, 0.2, 0.012, RED, { jitter: 0.004, vary: 0.08 }).box(0, -0.215, 0, 0.05, 0.015, 0.014, '#e8d9b0', { jitter: 0 }).pop();
  // mazzo di chiavi a un chiodo
  lp.push([-0.06, 0.72, 0.045]).add(new THREE.TorusGeometry(0.035, 0.007, 3, 10), BRASS, { jitter: 0 });
  for (let k = 0; k < 3; k++) lp.push([(k - 1) * 0.02, -0.035, 0.005], 0, 0, (k - 1) * 0.35).box(0, -0.07, 0, 0.012, 0.07, 0.006, k === 1 ? LPC.gold : BRASS, { jitter: 0 }).box(0.01, -0.07, 0, 0.012, 0.012, 0.006, BRASS, { jitter: 0 }).pop();
  lp.pop();
  lp.pop();
  // latta dell'olio e uno straccio ai piedi
  lp.cyl(0.28, 0, 0.22, 0.07, 0.07, 0.15, 8, '#5d6b4e', { jitter: 0, vary: 0.06 });
  lp.cyl(0.28, 0.15, 0.22, 0.035, 0.02, 0.04, 6, LPC.iron, { jitter: 0 });
  tube(lp, [0.3, 0.1, 0.27], [0.36, 0.17, 0.33], 0.01, LPC.iron, 4);
  lp.blob(-0.25, 0.03, 0.2, 0.09, 0.025, 0.06, '#b9a98a', { jitter: 0.015 });
  grassTuft(lp, -0.3, -0.15, 0.8); grassTuft(lp, 0.15, -0.3, 0.7);
  if (lit) lp.light(LX * 1.3, (LY - 0.08) * 1.3, 0, LPC.lantern, 1, 5.5, 0.15, 1.1);
  return lp.build();
}

/** Raggio del Lampione del Custode (solo in modifica): anello tratteggiato a terra. */
export function keeperRadiusLP(radius: number): LPModel {
  const lp = new LP(`new2:keeperradius:${radius}`);
  const n = Math.round(radius * 9);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; lp.push([Math.sin(a) * radius, 0.02, Math.cos(a) * radius], a).box(0, 0, 0, 0.22, 0.012, 0.05, '#ffcf7a', { bucket: 'glow', jitter: 0 }).pop(); }
  return lp.build();
}

/** Area del Lampione del Custode (in modifica): quadrato tratteggiato a terra di semilato `half`. */
export function keeperAreaLP(half: number): LPModel {
  const lp = new LP(`new2:keeperarea:${half}`);
  const n = Math.round(half * 2.5);
  for (let side = 0; side < 4; side++) {
    lp.push([0, 0.03, 0], (side * Math.PI) / 2);
    for (let i = 0; i < n; i++) { const t = -half + (i + 0.5) * ((2 * half) / n); lp.box(t, 0, half, ((2 * half) / n) * 0.55, 0.012, 0.06, '#ffcf7a', { bucket: 'glow', jitter: 0 }); }
    lp.pop();
  }
  return lp.build();
}
