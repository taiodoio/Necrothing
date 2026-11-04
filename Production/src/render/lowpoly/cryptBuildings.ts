// Le cinque cripte (Cripte-Lab) costruite con il kit dei generatori del gioco: camera
// in blocchi di pietra, portale, gradini, tetto a lastre, ornamenti propri di ogni famiglia.
// Ogni famiglia ha tre versioni (profilo e dettagli diversi) e i suoi pezzi che mancano
// o cadono da rotta; lo sporco e le macerie comuni li aggiunge weathering.ts.
// Il corpo sta nella metà posteriore del lotto (il chiamante lo sposta di -0,85 in z).

import * as THREE from 'three';
import { LPC } from './palette.ts';
import { skull as gameSkull } from './extras.ts';
import {
  beam, block, chain, cloth, CP, dim, emit, flame, leaf, mushroom, prof, put, root, slab, torus, turned, votive, type CryptCtx, type P3,
} from './cryptKit.ts';

/** Teschio del laboratorio (raggio `s`, y a livello del naso) con il teschio del gioco. */
const skull = (c: CryptCtx, x: number, y: number, z: number, s = 0.16, color: string = LPC.bone) => gameSkull(c.lp, x, y - s * 0.55, z, s / 0.1, color);

// ── Elementi comuni ──────────────────────────────────────────────────────

function steps(c: CryptCtx, w = 0.96) {
  const { lp } = c;
  for (let i = 0; i < 3; i++) slab(lp, 0, 0.015 + i * 0.075, 0.93 - i * 0.19, w - i * 0.08, 0.1, 0.24, CP.pale);
  lp.box(0, 0.17, -0.05, w * 0.82, 0.055, 1.25, CP.black, { jitter: 0.004 });
}

/** Vano scuro dell'ingresso, con la luce che trapela dalla camera. */
function darkDoor(c: CryptCtx, w: number, h: number, y: number, z: number, color: string) {
  const p: Array<[number, number]> = [[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.82], [w * 0.32, h], [-w * 0.32, h], [-w / 2, h * 0.82]];
  prof(c.lp, p, 0.045, CP.black, [0, y, z], [0, 0, 0], { ao: 0 });
  if (!c.v.broken) {
    const e = emit(c, dim(color, 0.33));
    prof(c.lp, p.map(([x, yy]) => [x * 0.69, yy * 0.78] as [number, number]), 0.012, e.color, [0, y + 0.035, z + 0.027], [0, 0, 0], e.o);
  }
}

/** Camera: due pareti in tre corsi di conci e il muro di fondo. */
function chamber(c: CryptCtx, color: string, { width = 1.85, height = 1.15, depth = 1.65 } = {}) {
  const { lp, v } = c;
  for (const sx of [-1, 1]) for (let row = 0; row < 3; row++) {
    if (v.broken && sx === 1 && row === 2) continue;
    block(lp, sx * (width / 2 - 0.13), 0.18 + (row * height) / 3, -0.31, 0.27, height / 3 - 0.012, depth, color, [0, 0, 0], { vary: 0.07, ao: 0.2 });
  }
  block(lp, 0, 0.18, -0.31 - depth / 2 + 0.09, width - 0.2, height, 0.18, color, [0, 0, 0], { vary: 0.07, ao: 0.2 });
}

/** Portale a stipiti e architrave in conci (l'architrave cade, da rotto). */
function portal(c: CryptCtx, { color = CP.pale as string, width = 1.12, height = 1.13, z = 0.63 } = {}) {
  const { lp, v } = c;
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    if (v.broken && sx === 1 && i === 2) continue;
    block(lp, sx * (width / 2 + 0.12), 0.18 + (i * height) / 3, z, 0.25, height / 3 - 0.014, 0.29, color, [0, 0, 0], { vary: 0.07 });
  }
  for (let i = 0; i < 3; i++) {
    if (v.broken && i === 2) continue;
    block(lp, (i - 1) * ((width + 0.5) / 3), 0.18 + height, z, (width + 0.5) / 3 - 0.012, 0.2, 0.35, color, [0, 0, v.broken && i === 1 ? 0.08 : 0], { vary: 0.07 });
  }
}

/** Falda del tetto tra due punti del profilo (x, y), lunga `d` in z, con le file di lastre. */
function roofBand(c: CryptCtx, xa: number, ya: number, xb: number, yb: number, zc: number, d: number, color: string, dark: string) {
  const { lp } = c;
  const len = Math.hypot(xb - xa, yb - ya);
  lp.push([(xa + xb) / 2, (ya + yb) / 2, zc], 0, 0, Math.atan2(yb - ya, xb - xa));
  lp.box(0, -0.035, 0, len + 0.01, 0.07, d, color, { bevel: 0.01, vary: 0.04, ao: 0.1 });
  const rows = Math.max(3, Math.round(d / 0.3));
  for (let i = 0; i < rows; i++) lp.box(lp.rng.range(-0.015, 0.015), 0.03, -d / 2 + (i + 0.5) * (d / rows), len - 0.04, 0.03, (d / rows) * 0.7, i % 2 ? color : dark, { bevel: 0.006, vary: 0.08, ao: 0 });
  lp.pop();
}

const pick = (c: CryptCtx, a: string, b: string, d: string) => (c.variant === 1 ? a : c.variant === 2 ? b : d);

// ── Zombie: la casetta dal tetto storto ──────────────────────────────────

const roofH = (x: number) => (x < -0.14 ? 2.1 - ((-0.14 - x) / 0.98) * 0.59 : 2.1 - ((x + 0.14) / 1.26) * 0.59);

function cottageRoof(c: CryptCtx) {
  const { lp, v } = c;
  const ridge = -0.14;
  const tiles = [pick(c, '#3b4352', '#50584f', '#514b46'), '#3e4655', '#39414f', '#414958'];
  for (let side = 0; side < 2; side++) for (let col = 0; col < 4; col++) {
    const edge = side ? 1.12 : -1.12;
    const xa = edge + (ridge - edge) * (col / 4), xb = edge + (ridge - edge) * ((col + 1) / 4);
    const short = v.broken && side === 1 && col > 0;
    roofBand(c, xa, roofH(xa), xb, roofH(xb), short ? -0.7 : -0.28, short ? 1.2 : 2.04, tiles[col], LPC.roofDark);
  }
  beam(lp, [ridge, 2.125, -1.33], [ridge, 2.125, 0.79], 0.036, '#706249');
  for (const z of [-1.32, 0.77]) for (const edge of [-1.14, 1.14]) {
    if (v.broken && z > 0 && edge > 0) continue;
    beam(lp, [edge, 1.51, z], [ridge, 2.1, z], 0.035, '#584e3c');
  }
  const gable: Array<[number, number]> = [[-0.91, 1.3], [0.91, 1.3], [0.91, 1.56], [ridge, 2.05], [-0.91, 1.62]];
  prof(lp, v.broken ? gable.slice(0, 4) : gable, 0.11, '#776c50', [0, 0, 0.59], [0, 0, 0], { ao: 0.15 });
  prof(lp, gable, 0.1, '#62654e', [0, 0, -1.1], [0, 0, 0], { ao: 0.15 });
  beam(lp, [-0.92, 1.51, 0.67], [0.92, 1.51, 0.67], 0.028, '#4f4537');
  lp.box(ridge, 1.65, 0.655, 0.22, 0.18, 0.018, CP.black, { jitter: 0 });
  for (let i = 0; i < 3; i++) lp.box(ridge, 1.68 + i * 0.05, 0.677, 0.23, 0.022, 0.023, '#9a8c69', { jitter: 0 });
  if (v.broken) block(lp, 0.66, 0.03, 1.0, 0.43, 0.055, 0.25, '#62644d', [0.1, 0.35, 0.05]);
}

function zombie(c: CryptCtx) {
  const { lp, v } = c;
  chamber(c, '#62675a'); steps(c);
  darkDoor(c, 1.14, 1.14, 0.18, 0.44, '#91b96c');
  portal(c, { color: '#878673', width: 1.12, height: 1.1 });
  for (const sx of [-1, 1]) {
    block(lp, sx * 0.99, 0.1, -0.3, 0.24, 0.34, 1.43, '#5a6055');
    slab(lp, sx * 0.99, 0.44, -0.3, 0.32, 0.1, 1.5, '#777b69');
  }
  cottageRoof(c);
  // finestrella di sfiato sul fianco, con l'inferriata
  const win = emit(c, v.broken ? '#27392a' : '#738a58');
  prof(lp, [[-0.16, 0], [0.16, 0], [0.16, 0.3], [-0.16, 0.3]], 0.022, win.color, [0.948, 0.72, -0.25], [0, Math.PI / 2, 0], win.o);
  for (const z of [-0.34, -0.16]) beam(lp, [0.971, 0.73, z], [0.971, 1.01, z], 0.012, LPC.iron);
  beam(lp, [0.972, 0.86, -0.4], [0.972, 0.86, -0.1], 0.012, LPC.iron);
  // assi inchiodate sul portale, catena e lucchetto
  for (let i = 0; i < 3; i++) block(lp, v.broken && i === 2 ? 0.38 : 0, 0.37 + i * 0.2, 0.64, 0.94, 0.12, 0.075, v.dirty ? '#61513c' : '#80694c', [0, 0, i === 1 ? -0.13 : 0.08], { vary: 0.1 });
  chain(lp, [-0.45, 1.04, 0.76], [0.43, 0.83, 0.76]);
  torus(lp, 0.14, 0.87, 0.79, 0.07, 0.017, LPC.iron);
  block(lp, 0.14, 0.71, 0.8, 0.12, 0.14, 0.075, '#725738');
  // una mano alza il portello di lato: la sagoma non è quella di una casa qualunque
  block(lp, -0.84, 0.17, 0.56, 0.43, 0.1, 0.53, CP.pale, [0, 0, -0.25]);
  beam(lp, [-0.84, 0.2, 0.71], [-0.89, 0.48, 0.8], 0.071, '#8c9b70', 0.057);
  lp.blob(-0.88, 0.52, 0.8, 0.1, 0.11, 0.065, '#9bab7e');
  for (let i = 0; i < 4; i++) beam(lp, [-0.95 + i * 0.045, 0.54, 0.82], [-0.97 + i * 0.049, 0.67 - (i === 3 ? 0.04 : 0), 0.85], 0.018, '#a2b286', 0.013);
  for (const x of [-0.49, 0.48]) votive(c, x, 0.08, 1.04, '#a7ca77');
  for (let i = 0; i < 4; i++) mushroom(lp, -1.08, 0.07, -0.8 + i * 0.23, 0.6 + i * 0.1, '#89905a');
  if (v.broken) block(lp, -0.48, 0.06, 1.12, 0.7, 0.07, 0.13, LPC.wood, [0, 0.7, 0.08]);

  // versione 2: camino · versione 3: lanterna sul tetto
  if (c.variant === 2) {
    const x = 0.6, z = -0.81;
    block(lp, x, 1.68, z, 0.27, 0.5, 0.29, '#77736a');
    block(lp, x, 2.18, z, 0.34, 0.1, 0.36, '#4b4c4b');
    for (const y of [1.8, 1.96, 2.1]) lp.box(x, y, z + 0.15, 0.27, 0.017, 0.012, '#575952', { jitter: 0 });
    if (v.broken) block(lp, 0.93, 0.04, 0.78, 0.22, 0.09, 0.14, '#6f6e64', [0, 0.3, 0.05]);
  } else if (c.variant === 3) {
    const x = -0.14, z = -0.78;
    slab(lp, x, 2.06, z, 0.29, 0.09, 0.3, '#5d5c52');
    const g = emit(c, v.broken ? '#414943' : '#bfac71');
    lp.box(x, 2.17, z, 0.18, 0.25, 0.18, g.color, { ...g.o, vary: 0.05 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(lp, [x + sx * 0.095, 2.15, z + sz * 0.095], [x + sx * 0.095, 2.43, z + sz * 0.095], 0.012, LPC.iron);
    lp.push([x, 2.42, z], Math.PI / 4).cyl(0, 0, 0, 0.2, 0.015, 0.14, 4, LPC.iron, { jitter: 0.004 }).pop();
  }
  // versione 2: portico · versione 3: ala laterale
  if (c.variant === 2) {
    for (const x of [-0.72, 0.72]) block(lp, x, 0.17, 1.04, 0.1, 1.1, 0.1, '#554b3b');
    prof(lp, [[-0.9, 0], [0.9, 0], [0.78, 0.18], [-0.78, 0.18]], 0.53, '#626d56', [0, 1.27, 0.95], [-0.13, 0, 0]);
    block(lp, 0, 1.2, 1.22, 1.77, 0.14, 0.08, '#776a53');
  } else if (c.variant === 3) {
    block(lp, 1.13, 0.14, -0.28, 0.58, 0.79, 1.06, '#737766', [0, 0, 0], { vary: 0.07 });
    slab(lp, 1.13, 0.93, -0.28, 0.72, 0.16, 1.2, '#555d57');
    block(lp, 1.13, 0.23, 0.26, 0.37, 0.55, 0.035, '#403d33');
    beam(lp, [0.96, 0.62, 0.29], [1.29, 0.32, 0.29], 0.035, '#978465');
  }
}

// ── Fantasmi: il cubo terrazzato del ricordo ─────────────────────────────

function ghost(c: CryptCtx) {
  const { lp, v } = c;
  steps(c, 0.96); chamber(c, '#969e97', { height: 1.08, width: 1.92 });
  darkDoor(c, 1.12, 1.13, 0.18, 0.4, '#365a51');
  portal(c, { color: '#c3c1b0', width: 1.1, height: 1.08, z: 0.58 });
  // porte di pietra incise, senza volti
  for (const sx of [-1, 1]) {
    block(lp, sx * 0.235, 0.21, 0.47, 0.44, 0.91, 0.06, v.broken ? '#515e57' : '#718e82');
    lp.box(sx * 0.235, 0.4, 0.507, 0.026, 0.54, 0.012, '#a9bba7', { jitter: 0, ao: 0 });
    torus(lp, sx * 0.075, 0.65, 0.52, 0.035, 0.008, LPC.marble);
  }
  const lids = [pick(c, '#b0b7aa', '#9eafa8', '#beb7a7'), '#c2c4b2', '#a3ada1'];
  for (let i = 0; i < 3; i++) {
    if (v.broken && i === 0) continue;
    slab(lp, 0, 1.23 + i * 0.115, -0.31, 2.16 - i * 0.23, 0.12, 1.91 - i * 0.15, lids[i]);
  }
  for (const sx of [-1, 1]) {
    const pts: Array<[number, number]> = [[sx * 0.8, 0.24], [sx * 1.04, 0.24], [sx * 1.04, 1.3], [sx * 0.84, 1.65], [sx * 0.8, 1.15]];
    if (!(v.broken && sx === 1)) prof(lp, pts, 0.47, '#a8b2a7', [0, 0, -0.38], [0, 0, 0], { vary: 0.06 });
    else prof(lp, pts.map(([x, y]) => [x * 0.48, y * 0.42] as [number, number]), 0.16, '#89928a', [0.37, 0.04, 0.55], [Math.PI / 2, 0, 0.4]);
    block(lp, sx * 0.97, 0.12, -0.03, 0.3, 0.25, 1.64, '#7e8d84');
    slab(lp, sx * 0.97, 0.37, -0.03, 0.38, 0.08, 1.76, '#adb4a7');
    votive(c, sx * 0.99, 0.46, 0.55, '#88cbbb');
  }
  if (c.variant === 1) {
    torus(lp, 0, 1.75, -0.77, 0.24, 0.035, v.broken ? '#6b7670' : '#a9c1b3');
    // una vera falce di luna: profilo a mezzaluna
    const moon: Array<[number, number]> = [];
    for (let i = 0; i <= 10; i++) { const a = -Math.PI * 0.6 + (i / 10) * Math.PI * 1.35; moon.push([Math.cos(a) * 0.19, Math.sin(a) * 0.19]); }
    for (let i = 10; i >= 0; i--) { const a = -Math.PI * 0.64 + (i / 10) * Math.PI * 1.43; moon.push([0.085 + Math.cos(a) * 0.12, Math.sin(a) * 0.15]); }
    prof(lp, moon, 0.055, '#d3d1b8', [0, 1.75, -0.7]);
  } else if (c.variant === 2) {
    for (const sx of [-1, 1]) {
      slab(lp, sx * 0.6, 1.56, -0.69, 0.3, 0.09, 0.3, '#a9b4aa');
      prof(lp, [[sx * 0.48, 0], [sx * 0.72, 0], [sx * 0.66, 0.31], [sx * 0.6, 0.52], [sx * 0.54, 0.31]], 0.2, '#c6c9b7', [0, 1.64, -0.69]);
    }
    torus(lp, 0, 1.74, -0.68, 0.16, 0.022, '#bfcbb8');
  } else {
    lp.cyl(0, 1.56, -0.7, 0.22, 0.16, 0.14, 8, '#a3afa5', { jitter: 0.006 });
    lp.cyl(0, 1.7, -0.7, 0.16, 0.24, 0.11, 8, '#bec7b4', { jitter: 0.006 });
    if (!v.broken) flame(c, 0, 1.86, -0.7, '#92caba', 0.09);
    for (const sx of [-1, 1]) votive(c, sx * 0.62, 1.55, -0.65, CP.spectral);
  }
  // versione 2: torre lunare · versione 3: loggia degli spiriti
  if (c.variant === 2) {
    lp.push([0, 0, -0.29], Math.PI / 8);
    lp.cyl(0, 1.57, 0, 0.49, 0.43, 0.46, 8, '#afbeb4', { vary: 0.06 });
    lp.cyl(0, 2.03, 0, 0.54, 0.38, 0.14, 8, '#d0d4c2');
    lp.pop();
    if (!v.broken) torus(lp, 0, 2.31, -0.29, 0.19, 0.025, '#d6dbbf', [Math.PI / 2, 0, 0]);
  } else if (c.variant === 3) {
    for (const x of [-0.78, 0.78]) {
      block(lp, x, 0.14, 0.93, 0.14, 1.07, 0.14, '#b8c3b4');
      slab(lp, x, 1.21, 0.93, 0.23, 0.09, 0.23, '#d0d3c2');
    }
    beam(lp, [-0.85, 1.35, 0.93], [0.85, 1.35, 0.93], 0.065, '#b9c6b6');
    for (const x of [-0.53, 0, 0.53]) lp.blob(x, 1.19, 0.94, 0.055, 0.11, 0.055, '#b1d0be');
  }
}

// ── Scheletri: la torre-ossario ──────────────────────────────────────────

function skeleton(c: CryptCtx) {
  const { lp, v } = c;
  steps(c); chamber(c, '#5e6161', { height: 1.25, width: 1.55, depth: 1.55 });
  darkDoor(c, 1.02, 1.13, 0.18, 0.44, '#9b8557');
  portal(c, { color: '#aea58f', width: 0.96, height: 1.1, z: 0.59 });
  slab(lp, 0, 1.44, -0.31, 1.74, 0.15, 1.78, '#969585');
  // belvedere aperto: colonne d'osso, campana
  for (const sx of [-1, 1]) for (const z of [0.16, -0.77]) {
    if (v.broken && sx === 1 && z > 0) continue;
    block(lp, sx * 0.47, 1.59, z, 0.19, 0.12, 0.19, '#8a8979');
    beam(lp, [sx * 0.47, 1.69, z], [sx * 0.47, 2.3, z], 0.044, LPC.bone);
    for (const y of [1.69, 2.28]) lp.blob(sx * 0.47, y, z, 0.077, 0.062, 0.069, LPC.bone);
  }
  for (const z of [0.16, -0.77]) beam(lp, [-0.52, 2.3, z], [0.52, 2.3, z], 0.05, '#b3aa93');
  if (c.variant !== 2) {
    const crown = pick(c, '#9f9c88', '#92958c', '#afa590');
    for (let i = 0; i < 3; i++) {
      if (v.broken && i === 2) continue;
      slab(lp, (i - 1) * 0.45, 2.31, -0.31, 0.45, 0.16, 1.4, crown);
    }
  }
  const bell = (x: number, y: number, s: number, seg: number) => {
    const p: Array<[number, number]> = [[0, 0], [0.18 * s, 0], [0.2 * s, 0.035 * s], [0.12 * s, 0.15 * s], [0.07 * s, 0.28 * s], [0, 0.3 * s]];
    turned(lp, x, y, -0.31, p, seg, pick(c, '#95815b', '#95815b', '#9e8a64'));
  };
  if (c.variant === 3) {
    for (const x of [-0.22, 0.22]) {
      bell(x, 1.87, 0.73, 7);
      beam(lp, [x, 2.09, -0.31], [x, 2.3, -0.31], 0.014, LPC.iron);
      lp.blob(x, 1.86, -0.31, 0.028, 0.045, 0.028, LPC.iron, { jitter: 0 });
    }
  } else {
    bell(0, 1.83, 1, 9);
    beam(lp, [0, 2.14, -0.31], [0, 2.3, -0.31], 0.018, LPC.iron);
    lp.blob(0, 1.84, -0.31, 0.035, 0.07, 0.035, LPC.iron, { jitter: 0 });
  }
  if (c.variant === 1) {
    for (let i = 0; i < 4; i++) lp.blob(0, 2.5 + i * 0.064, -0.31, 0.075, 0.045, 0.069, LPC.bone);
  }
  skull(c, 0, 2.8, -0.3, 0.095);
  if (c.variant === 1) for (const sx of [-1, 1]) lp.cyl(sx * 0.54, 2.47, -0.72, 0.035, 0.005, 0.2, 5, LPC.bone, { jitter: 0.004 });
  // pilastri d'osso e nicchie dell'ossario
  for (let k = 0; k < 4; k++) {
    for (const sx of [-1, 1]) {
      if ((k === 0 || k === 3) && !(v.broken && k === 0 && sx === 1)) {
        beam(lp, [sx * 0.72, 0.25, 0.58 - k * 0.42], [sx * 0.72, 1.33, 0.58 - k * 0.42], 0.045, LPC.bone);
        for (const yy of [0.27, 1.33]) lp.blob(sx * 0.72, yy, 0.58 - k * 0.42, 0.08, 0.065, 0.07, LPC.bone);
      }
      block(lp, sx * 0.98, 0.14, 0.3 - k * 0.43, 0.3, 0.44, 0.29, CP.dark);
      slab(lp, sx * 0.98, 0.58, 0.3 - k * 0.43, 0.37, 0.075, 0.31, '#8d907c');
      if (k === 0) skull(c, sx * 0.98, 0.42, 0.47 - k * 0.43, 0.1, '#aaa18c');
    }
  }
  beam(lp, [-0.68, 1.53, 0.63], [0.68, 1.53, 0.63], 0.055, LPC.bone);
  for (let i = 0; i < 6; i++) {
    if (v.broken && i === 4) continue;
    const x = -0.43 + i * 0.17;
    beam(lp, [x, 0.23, 0.61], [x + (v.broken ? 0.05 : 0), 1.23, 0.61], 0.016, '#51534b');
  }
  for (const yy of [0.4, 0.91]) lp.box(0, yy, 0.62, 1.03, 0.03, 0.025, '#676052', { jitter: 0 });
  skull(c, 0, 1.65, 0.57, 0.14);
  for (const x of [-1.05, 1.05]) votive(c, x, 0.06, 0.95);
  if (v.broken) {
    beam(lp, [-0.72, 0.13, 0.82], [-0.18, 0.11, 1.26], 0.075, LPC.bone);
    skull(c, 0.65, 0.12, 1.08, 0.13, '#b0a48d');
  }
  // versione 2: stendardo d'osso · versione 2 anche: timpano al posto della corona · versione 3: merli
  if (c.variant === 2) {
    const up = v.broken ? 2.76 : 3.0, bn = v.broken ? 2.72 : 2.97;
    beam(lp, [0.55, 2.44, 0.03], [0.55, up, 0.03], 0.025, LPC.bone);
    cloth(lp, 0.78, bn, 0.04, 0.38, 0.34, '#817a6e', { ragged: v.dirty });
    const k = v.broken ? 2.58 : 2.83, k2 = v.broken ? 2.42 : 2.67;
    beam(lp, [0.69, k, 0.07], [0.87, k2, 0.07], 0.018, LPC.bone);
    beam(lp, [0.87, k, 0.07], [0.69, k2, 0.07], 0.018, LPC.bone);
    prof(lp, [[-0.7, 0], [0.7, 0], [0, 0.49]], 0.95, '#858679', [0, 2.3, -0.31]);
    beam(lp, [-0.7, 2.3, 0.18], [0, 2.79, 0.18], 0.032, LPC.bone);
    beam(lp, [0, 2.79, 0.18], [0.7, 2.3, 0.18], 0.032, LPC.bone);
  } else if (c.variant === 3) {
    for (const x of [-0.53, 0, 0.53]) for (const z of [-0.77, 0.15]) {
      if (v.broken && x > 0 && z > 0) continue;
      block(lp, x, 2.47, z, 0.23, 0.28, 0.23, '#b5ac94');
    }
    beam(lp, [0, 2.46, -0.31], [0, 2.76, -0.31], 0.045, LPC.bone);
  }
}

// ── Natura: il dolmen aperto ─────────────────────────────────────────────

function nature(c: CryptCtx) {
  const { lp, v } = c;
  steps(c, 0.95);
  darkDoor(c, 0.93, 0.97, 0.18, 0.5, '#756f43');
  // tre pietre in piedi irregolari e i fianchi aperti, non una camera
  prof(lp, [[-1.01, 0.12], [-0.61, 0.18], [-0.58, 1.21], [-0.76, 1.31], [-0.98, 1.2]], 0.43, '#92977b', [0, 0, 0.58], [0, 0, 0], { vary: 0.08, ao: 0.25 });
  prof(lp, [[0.61, 0.18], [0.99, 0.13], [1.04, 1.4], [0.78, 1.47], [0.66, 1.31]], 0.44, '#818b70', [0, 0, 0.56], [0, 0, 0], { vary: 0.08, ao: 0.25 });
  prof(lp, [[-0.63, 0.1], [0.6, 0.16], [0.56, 1.22], [-0.38, 1.3], [-0.68, 0.92]], 0.32, '#747e64', [0, 0, -0.99], [0, 0, 0], { vary: 0.08, ao: 0.25 });
  for (const sx of [-1, 1]) lp.blob(sx * 0.86, 0.43, -0.66, 0.28, 0.42, 0.34, '#7f896c', { vary: 0.1 });
  const caps: Array<Array<[number, number]>> = [
    [[-1.24, -0.88], [-0.5, -1.03], [0.12, -0.98], [0.22, 0.9], [-0.95, 0.84], [-1.35, 0.35]],
    [[0.12, -0.98], [0.75, -0.96], [1.27, -0.45], [1.15, 0.78], [0.22, 0.9]],
  ];
  const lid = pick(c, '#617748', '#4f6950', '#77805a');
  caps.forEach((pts, i) => {
    if (v.broken && i === 1) { lp.blob(0.9, 0.13, 0.22, 0.4, 0.13, 0.38, '#8c9276'); return; }
    prof(lp, pts, 0.22, i ? '#939b7b' : '#a0a586', [0, 1.35, -0.3], [-Math.PI / 2, 0, 0.08], { vary: 0.07 });
    // il prato sul tetto: lastra sottile verde (come la terra sopra le altre costruzioni)
    prof(lp, pts.map(([x, z]) => [x * 0.965, z * 0.96] as [number, number]), 0.04, lid, [0, 1.47, -0.3], [-Math.PI / 2, 0, 0.08], { vary: 0.07, ao: 0 });
  });
  for (const sx of [-1, 1]) {
    root(lp, [[sx * 0.45, 1.49 + sx * 0.036, 0.29], [sx * 0.76, 1.42 + sx * 0.06, 0.55], [sx * 0.89, 0.84, 0.79], [sx * 0.99, 0.25, 0.81], [sx * 1.21, 0.05, 1.03]], 0.072);
    root(lp, [[sx * 0.77, 0.72, 0.59], [sx * 1.03, 0.37, 0.28], [sx * 1.28, 0.04, 0.34]], 0.067);
    root(lp, [[sx * 0.4, 1.49 + sx * 0.03, 0.25], [sx * 0.67, 1.49 + sx * 0.05, -0.27], [sx * 0.9, 1.24, -0.8], [sx * 1.17, 0.1, -1.05]], 0.061);
    if (!(v.broken && sx === 1)) root(lp, [[sx * 0.7, 1.49 + sx * 0.05, 0.58], [sx * 0.36, 1.51 + sx * 0.03, 0.62], [sx * 0.04, 1.49, 0.62]], 0.048);
    for (let i = 0; i < 3; i++) mushroom(lp, sx * (0.87 + i * 0.1), 0.11, 0.68 - i * 0.27, 0.8 + i * 0.25, i % 2 ? '#b68e4e' : '#866849');
  }
  // il germoglio sul tetto: sempre sotto la sagoma di una casa
  const tx = -0.48;
  root(lp, [[tx, 1.44, -0.62], [tx - 0.05, 1.72, -0.61], [tx + 0.03, 1.96, -0.61]], 0.066);
  root(lp, [[tx - 0.02, 1.73, -0.61], [tx - 0.28, 1.91, -0.56]], 0.034);
  if (!v.broken) {
    if (c.variant === 2) {
      for (let i = 0; i < 3; i++) lp.cyl(tx, 1.65 + i * 0.17, -0.6, 0.3 - i * 0.055, 0.015, 0.43, 6, '#405b3f', { vary: 0.08 });
    } else if (c.variant === 1) {
      lp.blob(tx + 0.05, 1.98, -0.6, 0.31, 0.23, 0.28, '#687d4b', { detail: 1 });
      lp.blob(tx - 0.24, 1.92, -0.56, 0.22, 0.17, 0.2, '#7c8b55', { detail: 1 });
    }
    for (let i = 0; i < 9; i++) { const x = (lp.rng.next() - 0.5) * 1.5, z = -0.8 + lp.rng.next() * 0.7; leaf(lp, x, 1.49 + x * 0.08, z, 0.12, '#829260', lp.rng.next() * 5); }
  } else beam(lp, [tx, 1.87, -0.61], [tx + 0.19, 1.92, -0.51], 0.045, '#8e7955', 0.018);
  root(lp, [[0, 1.46, 0.63], [0, 1.29, 0.68]], 0.015);
  prof(lp, [[0, 0], [0.16, 0.16], [0.15, 0.28], [0.035, 0.21], [0, 0.05], [-0.035, 0.21], [-0.15, 0.28], [-0.16, 0.16]], 0.026, '#c0b47b', [0, 1.1, 0.69], [0, 0, 0], { ao: 0 });
  for (const x of [-0.51, 0.51]) votive(c, x, 0.11, 1.11, '#e3bb70');
  if (v.broken) block(lp, 0.6, 0.04, 0.97, 0.62, 0.11, 0.12, '#5d4c38', [0, 0.5, 0.13]);

  if (c.variant === 2) {
    for (const x of [-0.82, 0.72]) if (!(v.broken && x > 0)) lp.blob(x, 1.5 + x * 0.08, -0.12, 0.19, 0.035, 0.21, '#6e8054');
    for (let i = 0; i < 3; i++) mushroom(lp, -1.05 + i * 0.13, 0.05, 0.98, 0.75, '#ae9160');
    for (const x of [-1.14, 1.14]) prof(lp, [[-0.17, 0], [0.17, 0], [0.15, 0.94], [-0.11, 1.02]], 0.25, '#858e72', [x, 0.15, 0.78], [0, 0, 0], { vary: 0.08 });
    if (!v.broken) prof(lp, [[-1.29, 0], [1.29, 0], [1.18, 0.23], [-1.12, 0.21]], 0.3, '#9ba181', [0, 1.13, 0.78], [0, 0, 0], { vary: 0.07 });
    else block(lp, 0.75, 0.05, 1.11, 0.65, 0.16, 0.2, '#899273', [0, 0.3, 0.1]);
  } else if (c.variant === 3) {
    for (const [x, z, s] of [[-0.98, 0.05, 0.95], [-0.7, 0.02, 1.25], [0.6, -0.46, 0.9]] as const) if (!(v.broken && x > 0)) mushroom(lp, x, 1.48 + x * 0.08, z, s, '#b19465');
    for (let i = 0; i < 3; i++) leaf(lp, 0.75 + i * 0.1, 0.18 + i * 0.1, 0.8, 0.12, '#84925d', i * 0.8);
    if (!v.broken) {
      lp.cyl(-0.48, 1.7, -0.62, 0.12, 0.1, 0.38, 7, '#c1b48b');
      lp.cyl(-0.48, 2.03, -0.62, 0.48, 0.19, 0.22, 9, '#ae855f', { vary: 0.08 });
      for (const [x, z] of [[-0.73, -0.64], [-0.38, -0.75], [-0.51, -0.37]] as const) lp.blob(x, 2.23, z, 0.06, 0.018, 0.05, '#e0d5af');
    }
    lp.blob(1.15, 0.35, -0.15, 0.24, 0.35, 0.3, '#89937a', { vary: 0.1 });
  }
}

// ── Soprannaturale: l'ottagono a punta ───────────────────────────────────

function supernatural(c: CryptCtx) {
  const { lp, v } = c;
  steps(c, 1.0);
  lp.push([0, 0, -0.35], Math.PI / 8);
  for (const [r, y, h, col] of [[1.1, 0.08, 0.2, '#454251'], [1.02, 0.28, 0.12, '#73697e']] as const) lp.cyl(0, y, 0, r, r, h, 8, col, { vary: 0.06 });
  lp.cyl(0, 0.38, 0, 0.91, 0.83, 0.96, 8, '#5b5368', { vary: 0.06, ao: 0.25 });
  lp.pop();
  // otto facce ripide: quelle rotte mancano, e si vede dentro
  const facets = [pick(c, '#4b465e', '#4a5267', '#605369'), '#534c65', '#4f495f', '#575068'];
  if (c.variant !== 2) {
    for (let i = 0; i < 8; i++) {
      if (v.broken && i < 2) continue;
      const a = (i / 8) * Math.PI * 2;
      put(lp, new THREE.CylinderGeometry(0.15, 1.06, 0.83, 1, 1, true, a, Math.PI / 4), facets[i % 4], [0, 1.805, -0.35], [0, 0, 0], { vary: 0.03, jitter: 0.008 });
      const p: P3 = [Math.sin(a) * 1.07, 1.39, -0.35 + Math.cos(a) * 1.07], q: P3 = [Math.sin(a + Math.PI / 4) * 1.07, 1.39, -0.35 + Math.cos(a + Math.PI / 4) * 1.07];
      beam(lp, p, q, 0.027, '#9a849e');
      beam(lp, [Math.sin(a) * 0.15, 2.22, -0.35 + Math.cos(a) * 0.15], p, 0.016, '#93809d');
    }
  } else {
    lp.push([0, 0, -0.35], Math.PI / 8);
    for (const [r, y, h] of [[1.05, 1.37, 0.18], [0.84, 1.55, 0.18], [0.63, 1.73, 0.18], [0.42, 1.91, 0.22]] as const) lp.cyl(0, y, 0, r, r * 0.93, h, 8, '#696277', { vary: 0.06 });
    lp.pop();
  }
  lp.cyl(0, 2.22, -0.35, 0.16, 0.11, 0.12, 8, '#9b879c', { jitter: 0.004 });
  const spire = emit(c, v.broken ? '#78677d' : '#bea3d0');
  put(lp, new THREE.OctahedronGeometry(0.14), spire.color, [0, 2.49, -0.35], [0, 0, 0], spire.o);
  darkDoor(c, 0.99, 1.08, 0.21, 0.65, '#a27bd0');
  const arc: Array<[number, number]> = [[-0.66, 0.25], [-0.66, 1.05], [-0.4, 1.29], [0.4, 1.29], [0.66, 1.05], [0.66, 0.25]];
  for (let i = 1; i < arc.length; i++) {
    if (v.broken && i === 4) continue;
    const [ax, ay] = arc[i - 1], [bx, by] = arc[i], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = (-dy / L) * 0.105, ny = (dx / L) * 0.105;
    prof(lp, [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], 0.27, '#78717e', [0, 0, 0.79], [0, 0, 0], { vary: 0.07 });
    if (!v.broken) beam(lp, [ax, ay, 0.936], [bx, by, 0.936], 0.014, '#b29b78');
  }
  for (const sx of [-1, 1]) {
    prof(lp, [[sx * 0.72, 0.3], [sx * 1.1, 0.28], [sx * 1.04, 0.58], [sx * 0.84, 1.2]], 0.24, '#686071', [0, 0, -0.44], [0, 0, 0], { vary: 0.07 });
    votive(c, sx * 0.98, 0.15, 0.91, '#c098e4');
    block(lp, sx * 0.93, 0.73, -0.34, 0.06, 0.12, 0.024, v.broken ? '#645968' : '#b5a17b', [0, 0, 0.45]);
  }
  if (c.variant === 1) torus(lp, 0, 2.49, -0.48, 0.24, 0.026, '#9c8c75', [0, 0, Math.PI / 4], Math.PI * 1.69);
  if (!v.broken) {
    const shard = emit(c, '#ba99d1');
    for (const sx of [-1, 1]) put(lp, new THREE.OctahedronGeometry(0.065), shard.color, [sx * 0.26, 2.28, -0.22], [0, 0.2, sx * 0.5], shard.o);
  } else {
    put(lp, new THREE.OctahedronGeometry(0.15), '#75657c', [0.2, 0.14, 1.1], [0.4, 0.4, 0.6]);
    block(lp, -0.67, 0.03, 0.91, 0.48, 0.14, 0.23, '#4b4654', [0.1, 0.5, -0.1]);
  }
  // il sigillo inciso nella camera
  const seal = emit(c, v.broken ? '#635871' : '#a08cae');
  torus(lp, 0, 0.82, 0.73, 0.25, 0.016, seal.color, [0, 0, 0], Math.PI * 2, seal.o);
  const diamond = emit(c, v.broken ? '#635871' : '#bca1d2');
  prof(lp, [[0, -0.18], [0.11, 0], [0, 0.18], [-0.11, 0]], 0.016, diamond.color, [0, 0.82, 0.75], [0, 0, 0], diamond.o);

  if (c.variant === 2) {
    for (const sx of [-1, 1]) {
      beam(lp, [sx * 0.12, 2.22, -0.4], [sx * 0.33, 2.37, -0.4], 0.044, '#aaa0a3');
      beam(lp, [sx * 0.33, 2.37, -0.4], [sx * 0.35, 2.66, -0.4], 0.035, '#aaa0a3', 0.009);
    }
  } else if (c.variant === 3) {
    const star: Array<[number, number]> = [[0, 0.23], [0.06, 0.06], [0.23, 0], [0.06, -0.06], [0, -0.23], [-0.06, -0.06], [-0.23, 0], [-0.06, 0.06]];
    const s = emit(c, v.broken ? '#796b80' : '#c6a9d9');
    prof(lp, star, 0.045, s.color, [0, 2.58, -0.48], [0, 0, 0], s.o);
    const cr = emit(c, v.broken ? '#796b80' : '#aa94c6');
    for (const sx of [-1, 1]) put(lp, new THREE.OctahedronGeometry(0.075), cr.color, [sx * 0.32, 2.31, -0.28], [0, 0, 0], cr.o);
    for (const x of [-0.94, 0.94]) {
      prof(lp, [[x - 0.15, 0.18], [x + 0.15, 0.18], [x + 0.1, 1.43], [x, 1.69], [x - 0.1, 1.43]], 0.23, '#817289', [0, 0, 0.63], [0, 0, 0], { vary: 0.07 });
      if (!v.broken) { const g = emit(c, '#b49aca'); put(lp, new THREE.OctahedronGeometry(0.09), g.color, [x, 1.7, 0.63], [0, 0, 0], g.o); }
    }
  }
}

export const BUILDINGS: Record<CryptCtx['family'], (c: CryptCtx) => void> = { zombie, ghost, skeleton, nature, supernatural };
