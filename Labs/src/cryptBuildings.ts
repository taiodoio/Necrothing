// Le cinque cripte (Cripte-Lab) costruite con il kit dei generatori del gioco: camera
// in blocchi di pietra, portale, gradini, tetto a lastre, ornamenti propri di ogni famiglia.
// Ogni famiglia ha tre versioni (profilo e dettagli diversi) e i suoi pezzi che mancano
// o cadono da rotta; lo sporco e le macerie comuni li aggiunge weathering.ts.
// Il corpo sta nella metà posteriore del lotto (il chiamante lo sposta di -0,85 in z).

import * as THREE from 'three';
import { wallIvy, wallBat } from './decorations.ts';
import { LPC } from '../../Production/src/render/lowpoly/palette.ts';
import { skull as gameSkull } from '../../Production/src/render/lowpoly/extras.ts';
import { column, gothicWindow, gable, gableRoof, frontGable } from '../../Production/src/render/lowpoly/architecture.ts';
import { hangingLantern } from '../../Production/src/render/lowpoly/details.ts';
import { irregularShape, roundTopShape } from '../../Production/src/render/lowpoly/kit.ts';
import {
  beam, block, chain, cloth, CP, dim, emit, flame, leaf, mushroom, prof, put, root, slab, torus, turned, votive, type CryptCtx, type P3,
} from '../../Production/src/render/lowpoly/cryptKit.ts';

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

/**
 * Falda del tetto tra due punti del profilo (x, y), lunga `d` in z (il colmo corre lungo z): come
 * gableRoof, una lastra con sopra le file parallele al colmo, a passo fisso lungo la falda.
 */
function roofBand(c: CryptCtx, xa: number, ya: number, xb: number, yb: number, zc: number, d: number, color: string, dark: string) {
  const { lp } = c;
  // sempre da sinistra a destra: girata al contrario la falda finiva a testa in giù e le file sotto
  if (xb < xa) [xa, ya, xb, yb] = [xb, yb, xa, ya];
  const len = Math.hypot(xb - xa, yb - ya);
  lp.push([(xa + xb) / 2, (ya + yb) / 2, zc], 0, 0, Math.atan2(yb - ya, xb - xa));
  lp.box(0, -0.035, 0, len + 0.01, 0.07, d, color, { bevel: 0.01, vary: 0.04, ao: 0.1 });
  const rows = Math.max(1, Math.round(len / 0.24));
  for (let i = 0; i < rows; i++) lp.box(-len / 2 + (i + 0.5) * (len / rows), 0.03, lp.rng.range(-0.015, 0.015), (len / rows) * 0.7, 0.03, d - 0.04, i % 2 ? color : dark, { bevel: 0.006, vary: 0.08, ao: 0 });
  lp.pop();
}

const pick = (c: CryptCtx, a: string, b: string, d: string) => (c.variant === 1 ? a : c.variant === 2 ? b : d);

// ── Zombie: la casetta dal tetto storto ──────────────────────────────────

const roofH = (x: number) => (x < -0.14 ? 2.1 - ((-0.14 - x) / 0.98) * 0.59 : 2.1 - ((x + 0.14) / 1.26) * 0.59);

function cottageRoof(c: CryptCtx) {
  const { lp, v } = c;
  const ridge = -0.14;
  // una falda per lato, come i tetti delle altre case (da rotta, sul lato destro manca un pezzo verso il colmo)
  const roof = pick(c, '#3b4352', '#50584f', '#514b46');
  for (let side = 0; side < 2; side++) {
    const edge = side ? 1.12 : -1.12;
    if (v.broken && side === 1) {
      const xm = edge + (ridge - edge) * 0.25;
      roofBand(c, edge, roofH(edge), xm, roofH(xm), -0.28, 2.04, roof, LPC.roofDark);
      roofBand(c, xm, roofH(xm), ridge, roofH(ridge), -0.7, 1.2, roof, LPC.roofDark);
    } else roofBand(c, edge, roofH(edge), ridge, roofH(ridge), -0.28, 2.04, roof, LPC.roofDark);
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

// ── Fantasmi: la casa infestata, casetta da fiaba col tetto a campana ────

/** Le tre versioni: colori, altezza del tetto, da che parte sta la torretta tonda, abbaino, pendenza. */
const HAUNTED: Record<1 | 2 | 3, { plaster: string; trim: string; roof: string; stone: string; apex: number; annex: 1 | -1; dormer: 0 | 1 | -1; lean: number; frontWindow: boolean; spire: boolean; chimney: number }> = {
  1: { plaster: '#7d7486', trim: '#4a3a30', roof: '#3b3f4a', stone: '#6b6660', apex: 2.75, annex: 1, dormer: 1, lean: 0, frontWindow: true, spire: false, chimney: -0.36 },
  2: { plaster: '#8a7f6a', trim: '#3f3128', roof: '#4a3a46', stone: '#66625c', apex: 2.6, annex: -1, dormer: 0, lean: 0.022, frontWindow: false, spire: false, chimney: 0.36 },
  // la torretta con la guglia a punta coprirebbe l'abbaino a destra: l'abbaino va sulla falda sinistra
  3: { plaster: '#6f7d78', trim: '#2f2a2a', roof: '#5a4232', stone: '#625f58', apex: 3.0, annex: 1, dormer: -1, lean: -0.025, frontWindow: false, spire: true, chimney: 0.32 },
};

/** Lastra tra due punti del profilo (x, y), lunga `d` in z: falde, mantovane, cornici. */
export function slabBetween(c: CryptCtx, a: [number, number], b: [number, number], zc: number, d: number, thick: number, color: string, out = 0) {
  // sempre da sinistra a destra, così la lastra non si gira a testa in giù
  if (b[0] < a[0]) [a, b] = [b, a];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  // spostata di `out` verso l'esterno della falda (la normale che guarda in su)
  const nx = -Math.sin(ang) * out, ny = Math.cos(ang) * out;
  c.lp.push([(a[0] + b[0]) / 2 + nx, (a[1] + b[1]) / 2 + ny, zc], 0, 0, ang).box(0, -thick / 2, 0, len + 0.02, thick, d, color, { bevel: 0.008, vary: 0.05, ao: 0.05 }).pop();
}

/** Finestra rettangolare a croce con la cornice, il davanzale e il cappello (piano z = zFace). */
export function crossWindow(c: CryptCtx, x: number, y: number, zFace: number, w: number, h: number, trim: string, boarded = false) {
  const { lp } = c;
  const g = emit(c, LPC.window);
  lp.box(x, y - 0.03, zFace + 0.01, w + 0.1, h + 0.06, 0.03, trim, { jitter: 0, vary: 0.05 });
  lp.box(x, y, zFace + 0.02, w, h, 0.02, c.lit ? g.color : '#26231f', { ...(c.lit ? g.o : {}), ao: 0 });
  lp.box(x, y, zFace + 0.035, 0.022, h, 0.012, trim, { jitter: 0, ao: 0 });
  lp.box(x, y + h * 0.55, zFace + 0.035, w, 0.022, 0.012, trim, { jitter: 0, ao: 0 });
  lp.box(x, y - 0.06, zFace + 0.04, w + 0.16, 0.04, 0.08, trim, { bevel: 0.006 });
  lp.box(x, y + h + 0.03, zFace + 0.035, w + 0.16, 0.05, 0.07, trim, { bevel: 0.006 });
  lp.box(x, y + h + 0.08, zFace + 0.03, 0.06, 0.08, 0.05, trim, { jitter: 0 });
  if (boarded) for (const s of [-1, 1]) lp.push([x, y + h / 2, zFace + 0.06], 0, 0, s * 0.6).box(0, -0.03, 0, h * 1.05, 0.06, 0.02, '#6b5a46', { vary: 0.1, ao: 0 }).pop();
}

/**
 * Il fantasma di casa alla finestra: una sagoma chiara dietro il vetro (tra il vetro e la
 * croce dei montanti), come qualcuno che guarda fuori dalla stanza; solo a casa integra.
 */
function windowGhost(c: CryptCtx, x: number, y: number, zFace: number, s = 1) {
  if (c.v.broken) return;
  const sh = new THREE.Shape();
  const w = 0.075 * s, h = 0.17 * s;
  sh.moveTo(-w, 0);
  for (let i = 1; i <= 4; i++) sh.lineTo(-w + (i * 2 * w) / 4, i % 2 ? 0.025 * s : 0);
  sh.lineTo(w, h);
  for (let i = 1; i < 8; i++) { const a = (i / 8) * Math.PI; sh.lineTo(Math.cos(a) * w, h + Math.sin(a) * w); }
  sh.lineTo(-w, h);
  sh.closePath();
  const g = emit(c, '#dfe9e6');
  c.lp.push([x, y, zFace + 0.031]).plate(sh, 0.003, c.lit ? g.color : '#9aa6a4', { ...(c.lit ? g.o : {}), ao: 0 }).pop();
  for (const sx of [-1, 1]) c.lp.blob(x + sx * 0.026 * s, y + h + 0.01 * s, zFace + 0.035, 0.011 * s, 0.017 * s, 0.002, '#1f2a2c', { jitter: 0, ao: 0 });
}

/** Lanterna a muro su una mensola di ferro (accanto alla porta). */
export function wallLantern(c: CryptCtx, x: number, y: number, zFace: number, s = 0.62) {
  const { lp } = c;
  lp.box(x, y - 0.06, zFace + 0.01, 0.06, 0.12, 0.02, LPC.iron, { jitter: 0 });
  beam(lp, [x, y, zFace], [x, y, zFace + 0.17], 0.012, LPC.iron);
  beam(lp, [x, y - 0.08, zFace], [x, y, zFace + 0.11], 0.009, LPC.iron);
  hangingLantern(lp, x, y, zFace + 0.17, c.lit, s);
}

function ghost(c: CryptCtx) {
  const { lp, v } = c;
  const k = HAUNTED[c.variant];
  const W = 2.15, D = 1.3, z0 = -0.35, B = 0.24, Y1 = 1.1, AP = k.apex;
  const zf = z0 + D / 2;
  lp.push([0, 0, z0], 0, 0, k.lean);
  // zoccolo di pietre, con qualche pietra in rilievo sul davanti
  lp.box(0, 0, 0, W + 0.16, B, D + 0.16, k.stone, { bevel: 0.02, vary: 0.08, ao: 0.25 });
  for (let i = 0; i < 6; i++) lp.push([-0.62 + i * 0.25, 0.06 + (i % 2) * 0.08, D / 2 + 0.08]).plate(irregularShape(lp.rng, 0.06, 6, 0.6), 0.012, dim(k.stone, 0.8), { ao: 0 }).pop();
  // pianterreno intonacato con i montanti scuri, la fascia di legno
  lp.box(0, B, 0, W, Y1 - B, D, k.plaster, { bevel: 0.015, vary: 0.05, ao: 0.2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lp.box(sx * (W / 2 - 0.02), B, sz * (D / 2 - 0.02), 0.07, Y1 - B, 0.07, k.trim, { jitter: 0, vary: 0.06 });
  lp.box(0, Y1, 0, W + 0.1, 0.07, D + 0.1, k.trim, { bevel: 0.01, vary: 0.06 });
  // Colmo parallelo alla facciata; il profilo a campana resta quello delle tre versioni.
  const R: Array<[number, number]> = [[0, AP], [0.20, AP - 0.6], [0.40, AP - 1.05], [0.62, 1.32], [0.82, 1.13]];
  const wall: Array<[number, number]> = [[-D / 2, Y1 + 0.06], [D / 2, Y1 + 0.06], [D / 2, 1.3], [0.40, AP - 1.07], [0.20, AP - 0.63], [0, AP - 0.06], [-0.20, AP - 0.63], [-0.40, AP - 1.07], [-D / 2, 1.3]];
  lp.push([0, 0, 0], Math.PI / 2);
  prof(lp, wall, W - 0.02, k.plaster, [0, 0, 0], [0, 0, 0], { vary: 0.05, ao: 0.1 });
  for (const sx of [-1, 1]) for (let i = 0; i < R.length - 1; i++) {
    if (v.broken && sx > 0 && i === R.length - 2) continue;
    const a: [number, number] = [sx * R[i][0], R[i][1]], b: [number, number] = [sx * R[i + 1][0], R[i + 1][1]];
    slabBetween(c, a, b, 0, W + 0.26, 0.07, k.roof, 0.035);
    for (const sz of [-1, 1]) slabBetween(c, a, b, sz * (W / 2 + 0.14), 0.05, 0.1, k.trim, 0.05);
  }
  lp.box(0, AP - 0.02, 0, 0.14, 0.1, W + 0.3, k.trim, { bevel: 0.01 });
  lp.pop();
  // Il piccolo abbaino frontale ospita la finestra con il fantasma.
  lp.box(0, 1.14, D / 2 - 0.06, 0.56, 0.78, 0.25, k.plaster, { bevel: 0.01 });
  frontGable(lp, D / 2 + 0.07, 0.56, 1.91, 0.28, k.plaster, 0.05);
  lp.push([0, 0, D / 2 - 0.02]); gableRoof(lp, 0.46, 0.58, 1.91, 0.28, k.roof, 0.07, true, k.trim); lp.pop();
  // finestra in alto sul timpano col fantasma che guarda fuori
  crossWindow(c, 0, 1.42, D / 2 + 0.14, 0.3, 0.4, k.trim, v.broken);
  windowGhost(c, 0.04, 1.43, D / 2 + 0.14);
  // porta di assi con il cappellino a due falde, le mensole, la lanterna appesa, due gradini
  const dx = -0.2;
  lp.push([dx, B, D / 2 + 0.005]).plate(roundTopShape(0.5, 0.72, 7), 0.03, k.trim, { ao: 0 }).pop();
  lp.push([dx, B + 0.02, D / 2 + 0.02]).plate(roundTopShape(0.4, 0.66, 7), 0.03, '#4a3426', { vary: 0.08, ao: 0.1 }).pop();
  for (const ox of [-0.1, 0, 0.1]) lp.box(dx + ox, B + 0.04, D / 2 + 0.052, 0.012, 0.5, 0.006, '#2e211a', { jitter: 0, ao: 0 });
  lp.blob(dx + 0.12, B + 0.34, D / 2 + 0.06, 0.02, 0.02, 0.015, LPC.iron, { jitter: 0 });
  if (!v.broken) {
    for (const s of [-1, 1]) lp.push([dx + s * 0.13, B + 0.86, D / 2 + 0.2], 0, 0, -s * 0.55).box(0, 0, 0, 0.32, 0.05, 0.42, k.roof, { bevel: 0.008, vary: 0.05 }).pop();
    for (const s of [-1, 1]) beam(lp, [dx + s * 0.22, B + 0.6, D / 2 + 0.01], [dx + s * 0.24, B + 0.82, D / 2 + 0.3], 0.018, k.trim);
    hangingLantern(lp, dx - 0.36, B + 0.85, D / 2 + 0.14, c.lit, 0.75);
  } else block(lp, dx + 0.5, 0.02, D / 2 + 0.55, 0.32, 0.05, 0.42, k.roof, [0.2, 0.5, 0.3]);
  for (let i = 0; i < 2; i++) lp.box(dx, 0, D / 2 + 0.17 + i * 0.12, 0.6 - i * 0.08, B - 0.1 * i, 0.14, LPC.stone, { bevel: 0.01, vary: 0.08 });
  // da rotta: due assi inchiodate a croce davanti alla porta (sopra le assi della porta, non dietro)
  if (v.broken) for (const s of [-1, 1]) lp.push([dx, B + 0.36, D / 2 + 0.08], 0, 0, s * 0.62).box(0, -0.04, 0, 0.66, 0.08, 0.025, '#7a5c42', { vary: 0.12, ao: 0 }).box(-0.28, -0.012, 0.015, 0.025, 0.025, 0.01, LPC.iron, { jitter: 0 }).box(0.28, -0.012, 0.015, 0.025, 0.025, 0.01, LPC.iron, { jitter: 0 }).pop();
  // Versioni 1 e 2: due finestre a destra della porta, unite dal davanzale.
  // Versione 3: bow window sporgente con tre vetri, cornici e base.
  if (c.variant !== 3) {
    for (const x of [0.42, 0.77]) crossWindow(c, x, B + 0.3, D / 2, 0.22, 0.36, k.trim, v.broken);
    lp.box(0.595, B + 0.22, D / 2 + 0.08, 0.82, 0.075, 0.18, k.trim, { bevel: 0.008 });
  } else if (c.variant === 3) {
    const x = 0.55, z = D / 2;
    const plan = new THREE.Shape();
    plan.moveTo(x - 0.35, 0); plan.lineTo(x - 0.24, -0.22); plan.lineTo(x + 0.24, -0.22); plan.lineTo(x + 0.35, 0); plan.closePath();
    const bayPiece = (y: number, h: number, color: string) => {
      const geo = new THREE.ExtrudeGeometry(plan, { depth: h, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2); geo.translate(0, y, z);
      lp.add(geo, color, { vary: 0.05, ao: 0.12 });
    };
    bayPiece(B + 0.22, 0.07, k.stone);
    bayPiece(B + 0.29, 0.48, k.plaster);
    crossWindow(c, x, B + 0.31, z + 0.22, 0.34, 0.43, k.trim, v.broken);
    for (const side of [-1, 1]) {
      lp.push([x + side * 0.295, 0, z + 0.11], side * 1.11);
      crossWindow(c, 0, B + 0.31, 0, 0.16, 0.43, k.trim, v.broken);
      lp.pop();
    }
    bayPiece(B + 0.77, 0.08, k.trim);
  }
  // Sul lato sinistro della facciata, lontano dalla porta e dalla lanterna.
  wallIvy(c, -0.92, D / 2 + 0.035, 0.72);
  // Un piccolo pipistrello sulla fascia della facciata.
  wallBat(c, -0.72, 1.07, D / 2 + 0.06);
  // Le finestre sul retro e sul fianco libero restano leggibili ruotando la casa.
  lp.push([0, 0, -D / 2], Math.PI);
  for (const x of [-0.55, 0.55]) crossWindow(c, x, B + 0.28, 0, 0.27, 0.36, k.trim, v.broken);
  if (c.variant === 1) wallIvy(c, -0.94, 0.035, 0.78);
  lp.pop();
  const side = -k.annex;
  lp.push([side * W / 2, 0, 0], side * Math.PI / 2);
  crossWindow(c, 0.05, B + 0.25, 0, 0.28, 0.4, k.trim, v.broken);
  lp.pop();
  // Abbaino sul retro: corpo e vetro rivolti verso la falda posteriore.
  lp.push([c.variant === 1 ? 0.62 : -0.62, 0, -D / 2 + 0.02], Math.PI);
  lp.box(0, 1.18, 0, 0.44, 0.56, 0.27, k.plaster, { bevel: 0.01 });
  frontGable(lp, 0.14, 0.44, 1.74, 0.24, k.plaster, 0.05);
  lp.push([0, 0, 0.02]); gableRoof(lp, 0.28, 0.46, 1.74, 0.24, k.roof, 0.05, true, k.trim); lp.pop();
  crossWindow(c, 0, 1.29, 0.15, 0.22, 0.3, k.trim, v.broken);
  lp.pop();
  // comignolo alto in pietra coi due vasetti (da rotto senza cappello)
  const cx = k.chimney;
  lp.box(cx, 1.3, -0.38, 0.3, AP + 0.25 - 1.3, 0.3, k.stone, { bevel: 0.015, vary: 0.08 });
  if (!v.broken) {
    lp.box(cx, AP + 0.25, -0.38, 0.38, 0.06, 0.38, dim(k.stone, 0.8), { bevel: 0.01 });
    for (const ox of [-0.07, 0.07]) lp.cyl(cx + ox, AP + 0.31, -0.38, 0.05, 0.045, 0.12, 6, '#8a5a3a', { jitter: 0 });
  }
  lp.pop();
  // la torretta tonda sul fianco, col tetto a cupola e la porticina
  const ax = k.annex * (W / 2 + 0.12);
  lp.cyl(ax, 0, z0 - 0.1, 0.42, 0.42, B, 10, k.stone, { vary: 0.08 });
  lp.cyl(ax, B, z0 - 0.1, 0.36, 0.36, 0.95, 10, k.plaster, { vary: 0.05, ao: 0.2 });
  lp.cyl(ax, B + 0.95, z0 - 0.1, 0.4, 0.4, 0.06, 10, k.trim, { jitter: 0 });
  if (k.spire) {
    // guglia a punta, alta e sottile, col pinnacolo in ferro (da rotta, storta)
    lp.push([ax, B + 1.01, z0 - 0.1], 0, 0, v.broken ? -0.2 : 0);
    lp.cyl(0, 0, 0, 0.44, 0.0, 1.15, 10, k.roof, { vary: 0.05, ao: 0.1 });
    beam(lp, [0, 1.1, 0], [0, 1.4, 0], 0.014, LPC.iron, 0.003);
    lp.blob(0, 1.25, 0, 0.03, 0.03, 0.03, LPC.iron, { jitter: 0 });
    lp.pop();
  } else if (!(v.broken && c.variant === 1)) turned(lp, ax, B + 1.01, z0 - 0.1, [[0, 0], [0.38, 0], [0.34, 0.16], [0.24, 0.3], [0.1, 0.38], [0, 0.4]], 10, k.roof);
  lp.push([ax, 0, z0 - 0.1], 0);
  lp.push([0, 0, 0.36]).plate(roundTopShape(0.26, 0.52, 6, B), 0.03, k.trim, { ao: 0 }).pop();
  lp.push([0, 0, 0.375]).plate(roundTopShape(0.2, 0.48, 6, B + 0.01), 0.025, '#4a3426', { vary: 0.08, ao: 0.1 }).pop();
  lp.pop();
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

// ── Strega: la capanna ottagonale col tetto a cappello ───────────────────

/** Verde delle pozioni, lo stesso dell'Angolo della strega. */
const BREW = '#9af06a';
const HAT: Record<1 | 2 | 3, string[]> = {
  1: ['#3b4250', '#363c49', '#3f4654', '#333946'], // ardesia
  2: ['#4f5e3f', '#495739', '#546443', '#465336'], // muschio
  3: ['#5a4352', '#53404c', '#5f4757', '#4d3a46'], // prugna
};

function witch(c: CryptCtx) {
  const { lp, v } = c;
  steps(c, 1.0);
  // zoccolo in pietra e pareti in legno, con i montanti scuri agli spigoli
  lp.push([0, 0, -0.35], Math.PI / 8);
  for (const [r, y, h, col] of [[1.1, 0.08, 0.2, '#45423d'], [1.02, 0.28, 0.12, '#6f685d']] as const) lp.cyl(0, y, 0, r, r, h, 8, col, { vary: 0.06 });
  lp.cyl(0, 0.38, 0, 0.91, 0.83, 0.96, 8, '#5d4b3c', { vary: 0.08, ao: 0.25 });
  lp.pop();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    beam(lp, [Math.sin(a) * 0.9, 0.38, -0.35 + Math.cos(a) * 0.9], [Math.sin(a) * 0.82, 1.34, -0.35 + Math.cos(a) * 0.82], 0.035, LPC.woodDark);
  }
  // il tetto è un cappello da strega: otto spicchi, la fascia con la fibbia, la punta
  const hat = HAT[c.variant];
  for (let i = 0; i < 8; i++) {
    if (v.broken && i < 2) continue;
    const a = (i / 8) * Math.PI * 2;
    put(lp, new THREE.CylinderGeometry(0.15, 1.06, 0.83, 1, 1, true, a, Math.PI / 4), hat[i % 4], [0, 1.805, -0.35], [0, 0, 0], { vary: 0.03, jitter: 0.008 }, true);
    const p: P3 = [Math.sin(a) * 1.07, 1.39, -0.35 + Math.cos(a) * 1.07], q: P3 = [Math.sin(a + Math.PI / 4) * 1.07, 1.39, -0.35 + Math.cos(a + Math.PI / 4) * 1.07];
    beam(lp, p, q, 0.027, '#6b5240');
  }
  if (!v.broken) {
    lp.push([0, 0, -0.35], Math.PI / 8);
    turned(lp, 0, 1.49, 0, [[0, 0], [0.98, 0], [0.85, 0.14], [0, 0.14]], 8, '#2b2724', { ao: 0 });
    lp.pop();
    block(lp, 0, 1.47, 0.57, 0.2, 0.16, 0.035, LPC.gold, [-0.83, 0, 0], { ao: 0 });
    block(lp, 0, 1.5, 0.59, 0.1, 0.08, 0.03, '#2b2724', [-0.83, 0, 0], { ao: 0 });
  }
  lp.cyl(0, 2.2, -0.35, 0.16, 0.12, 0.08, 8, hat[0], { jitter: 0.004 });
  if (c.variant === 2) {
    // punta piegata, che ricade di lato
    beam(lp, [0, 2.27, -0.35], [0.05, 2.55, -0.33], 0.12, hat[1], 0.07);
    beam(lp, [0.05, 2.55, -0.33], [0.32, 2.6, -0.3], 0.07, hat[2], 0.02);
    lp.blob(0.34, 2.58, -0.3, 0.04, 0.04, 0.04, LPC.gold, { jitter: 0 });
  } else {
    beam(lp, [0, 2.27, -0.35], [0, v.broken ? 2.45 : 2.7, -0.35], 0.12, hat[1], 0.015);
    if (c.variant === 3 && !v.broken) flame(c, 0, 2.76, -0.35, BREW, 0.05);
    if (c.variant === 1 && !v.broken) {
      // la falce di luna in cima
      const moon: Array<[number, number]> = [];
      for (let k = 0; k <= 8; k++) { const t = -Math.PI * 0.6 + (k / 8) * Math.PI * 1.35; moon.push([Math.cos(t) * 0.11, Math.sin(t) * 0.11]); }
      for (let k = 8; k >= 0; k--) { const t = -Math.PI * 0.64 + (k / 8) * Math.PI * 1.43; moon.push([0.05 + Math.cos(t) * 0.07, Math.sin(t) * 0.09]); }
      prof(lp, moon, 0.03, LPC.gold, [0, 2.8, -0.35], [0, 0, 0], { ao: 0 });
    }
  }
  darkDoor(c, 0.99, 1.08, 0.21, 0.65, BREW);
  const arc: Array<[number, number]> = [[-0.66, 0.25], [-0.66, 1.05], [-0.4, 1.29], [0.4, 1.29], [0.66, 1.05], [0.66, 0.25]];
  for (let i = 1; i < arc.length; i++) {
    if (v.broken && i === 4) continue;
    const [ax, ay] = arc[i - 1], [bx, by] = arc[i], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = (-dy / L) * 0.105, ny = (dx / L) * 0.105;
    prof(lp, [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], 0.27, '#5e4836', [0, 0, 0.79], [0, 0, 0], { vary: 0.1 });
    if (!v.broken) beam(lp, [ax, ay, 0.936], [bx, by, 0.936], 0.014, '#b29b78');
  }
  for (const sx of [-1, 1]) {
    prof(lp, [[sx * 0.72, 0.3], [sx * 1.1, 0.28], [sx * 1.04, 0.58], [sx * 0.84, 1.2]], 0.24, '#6b655c', [0, 0, -0.44], [0, 0, 0], { vary: 0.07 });
    votive(c, sx * 0.98, 0.15, 0.91, '#b8f08a');
    block(lp, sx * 0.93, 0.73, -0.34, 0.06, 0.12, 0.024, v.broken ? '#4f5a48' : '#b5a17b', [0, 0, 0.45]);
  }
  if (v.broken) {
    block(lp, 0.2, 0.03, 1.1, 0.3, 0.12, 0.26, LPC.woodDark, [0.4, 0.4, 0.3]);
    block(lp, -0.67, 0.03, 0.91, 0.48, 0.14, 0.23, '#45423d', [0.1, 0.5, -0.1]);
  }
  // il sigillo della strega nella camera: cerchio e falce
  const seal = emit(c, v.broken ? '#4f5a48' : '#7fcf6a');
  torus(lp, 0, 0.82, 0.73, 0.25, 0.016, seal.color, [0, 0, 0], Math.PI * 2, seal.o);
  const mark = emit(c, v.broken ? '#4f5a48' : BREW);
  prof(lp, [[0, -0.18], [0.11, 0], [0, 0.18], [-0.11, 0]], 0.016, mark.color, [0, 0.82, 0.75], [0, 0, 0], mark.o);

  if (c.variant === 3) {
    for (const x of [-0.94, 0.94]) {
      prof(lp, [[x - 0.15, 0.18], [x + 0.15, 0.18], [x + 0.1, 1.43], [x, 1.69], [x - 0.1, 1.43]], 0.23, '#6b655c', [0, 0, 0.63], [0, 0, 0], { vary: 0.07 });
      if (!v.broken) { const g = emit(c, BREW); put(lp, new THREE.OctahedronGeometry(0.09), g.color, [x, 1.7, 0.63], [0, 0, 0], g.o); }
    }
  }
}

export const BUILDINGS: Record<'zombie' | 'ghost' | 'skeleton' | 'nature' | 'witch', (c: CryptCtx) => void> = { zombie, ghost, skeleton, nature, witch };
