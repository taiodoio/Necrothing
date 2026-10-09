// Architettura gotica low-poly. Componenti riutilizzabili (finestra e porta
// ad arco acuto, tetto a falde con file di lastre, colonna tornita, cantonali
// in pietra, inferriata a lance) e i generatori degli edifici del gioco:
// recinto, pilastri, cancello, bottega, casa del becchino, mausoleo, pozzo,
// statue. Unità mondo, origine al centro dell'ingombro, fronte verso +z.

import * as THREE from 'three';
import { LP, gothicArchShape, type LPModel } from './kit.ts';
import { candle, deadLeaves, grassTuft, moss, vase, weeds } from './details.ts';
import { decayLP } from './lights.ts';
import { LPC } from './palette.ts';
import type { PVis } from '../models/types.ts';

// ── Componenti ───────────────────────────────────────────────────────────

/** Finestra gotica: cornice in pietra, vetro (emissivo se acceso), montanti. */
export function gothicWindow(lp: LP, x: number, y: number, zFace: number, w: number, h: number, lit: boolean, frame: string = LPC.stoneLight) {
  lp.push([x, y, zFace]);
  lp.plate(gothicArchShape(w + 0.08, h + 0.06, 4, -0.03), 0.03, frame, { ao: 0, vary: 0.05 });
  lp.push([0, 0, 0.012]).plate(gothicArchShape(w, h, 4), 0.025, lit ? LPC.window : '#2a2d33', { bucket: lit ? 'glow' : 'solid', ao: 0, vary: 0.03 }).pop();
  lp.box(0, 0, 0.04, 0.022, h * 0.92, 0.012, LPC.iron, { jitter: 0, ao: 0 });
  lp.box(0, h * 0.42, 0.04, w, 0.022, 0.012, LPC.iron, { jitter: 0, ao: 0 });
  lp.box(0, -0.05, 0.02, w + 0.14, 0.05, 0.08, frame, { bevel: 0.01 }); // davanzale
  lp.pop();
}

/** Porta ad arco acuto in assi di legno con stipiti in conci di pietra. */
export function archedDoor(lp: LP, x: number, zFace: number, w: number, h: number, wood: string = LPC.woodDark, frame: string = LPC.stone) {
  lp.push([x, 0, zFace]);
  lp.plate(gothicArchShape(w + 0.16, h + 0.1, 5), 0.04, frame, { ao: 0.1, vary: 0.08 });
  lp.push([0, 0, 0.02]).plate(gothicArchShape(w, h, 5), 0.035, wood, { ao: 0.25, vary: 0.06 }).pop();
  for (let i = 1; i < 4; i++) lp.box(-w / 2 + (i * w) / 4, 0.02, 0.056, 0.012, h * 0.78, 0.008, LPC.charcoal, { jitter: 0, ao: 0 });
  for (const yy of [0.25, 0.6]) lp.box(0, h * yy, 0.06, w * 0.9, 0.035, 0.012, LPC.iron, { jitter: 0, ao: 0 });
  lp.blob(w * 0.3, h * 0.42, 0.07, 0.022, 0.022, 0.015, LPC.iron, { jitter: 0 });
  lp.pop();
}

/** Tetto a capanna lungo x con sporto, file di lastre e colmo. */
export function gableRoof(lp: LP, w: number, d: number, y: number, rise: number, color: string = LPC.roof, overhang = 0.14) {
  const half = d / 2 + overhang;
  const slope = Math.atan2(rise, d / 2);
  const len = Math.hypot(half, rise * (half / (d / 2)));
  const r = lp.rng;
  // due falde come lastre ruotate attorno a x, con file di lastre sovrapposte
  for (const s of [-1, 1]) {
    lp.push([0, y + rise / 2, s * d / 4], 0, s * slope);
    lp.box(0, -0.04, 0, w + overhang * 2, 0.07, len, color, { bevel: 0.01, vary: 0.06, ao: 0.1 });
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const z = -len / 2 + (i + 0.5) * (len / rows);
      lp.box(r.range(-0.02, 0.02), 0.03, z * -s, w + overhang * 2 - 0.04, 0.03, len / rows * 0.7, i % 2 ? color : LPC.roofDark, { bevel: 0.006, vary: 0.1, ao: 0 });
    }
    lp.pop();
  }
  lp.box(0, y + rise - 0.02, 0, w + overhang * 2 + 0.04, 0.08, 0.12, LPC.roofDark, { bevel: 0.015 });
}

/** Timpano triangolare che chiude i lati del tetto. */
export function gable(lp: LP, x: number, d: number, y: number, rise: number, color: string, thick = 0.1) {
  const tri = new THREE.Shape();
  tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rise); tri.closePath();
  lp.push([x, y, 0], Math.PI / 2).extrude(tri, thick, color, { vary: 0.05, ao: 0.05 }).pop();
}

/** Cantonali: blocchi di pietra alternati agli spigoli di un muro. */
export function quoins(lp: LP, w: number, d: number, h: number, y0: number, color: string = LPC.stoneLight) {
  let y = y0, k = 0;
  while (y < y0 + h - 0.05) {
    const bh = 0.17;
    const long = k % 2 === 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const bx = long ? 0.22 : 0.13, bz = long ? 0.13 : 0.22;
      lp.box(sx * (w / 2 - bx / 2 + 0.015), y, sz * (d / 2 - bz / 2 + 0.015), bx, bh - 0.015, bz, color, { bevel: 0.012, vary: 0.08, ao: 0.1 });
    }
    y += bh; k++;
  }
}

/** Colonna tornita con base e capitello. */
export function column(lp: LP, x: number, y: number, z: number, h: number, r = 0.08, color: string = LPC.stoneLight) {
  lp.box(x, y, z, r * 2.6, 0.06, r * 2.6, color, { bevel: 0.01 });
  lp.lathe(x, y + 0.06, z, [[r * 1.15, 0], [r, 0.05], [r, h - 0.2], [r * 0.95, h - 0.16], [r * 1.35, h - 0.08], [r * 1.5, h - 0.04], [0, h - 0.04]], 8, color, { vary: 0.05, ao: 0.2 });
  lp.box(x, y + h, z, r * 3, 0.06, r * 3, color, { bevel: 0.01 });
}

/** Pietre sporgenti sparse su una facciata (texture geometrica del muro). */
function wallStones(lp: LP, w: number, h: number, y0: number, zFace: number, n: number, color: string) {
  const r = lp.rng;
  for (let i = 0; i < n; i++) {
    const bw = 0.12 + r.next() * 0.16, bh = 0.07 + r.next() * 0.06;
    lp.box(r.range(-w / 2 + bw, w / 2 - bw), y0 + r.range(0.05, h - 0.15), zFace + 0.008, bw, bh, 0.02, color, { bevel: 0.006, vary: 0.12, ao: 0 });
  }
}

/** Botte. */
function barrel(lp: LP, x: number, z: number, h = 0.36) {
  lp.lathe(x, 0, z, [[0, 0], [0.13, 0], [0.16, h * 0.3], [0.165, h * 0.5], [0.16, h * 0.7], [0.13, h], [0, h]], 8, LPC.wood, { vary: 0.1, ao: 0.3 });
  for (const yy of [0.15, 0.85]) lp.cyl(x, h * yy - 0.012, z, 0.158, 0.158, 0.025, 8, LPC.iron, { jitter: 0 });
}

/** Cassa di legno. */
function crate(lp: LP, x: number, y: number, z: number, s = 0.3) {
  lp.box(x, y, z, s, s, s, LPC.wood, { bevel: 0.012, vary: 0.12 });
  for (const sx of [-1, 1]) lp.box(x + sx * s * 0.42, y, z, 0.03, s, s + 0.01, LPC.woodDark, { jitter: 0 });
}

// ── Recinto ──────────────────────────────────────────────────────────────

/** Segmento di recinto lungo x (1 cella): muretto, copertina, inferriata a lance. */
export function fenceSegmentLP(seed: number): LPModel {
  const lp = new LP(`lp:fseg:${seed}`);
  const r = lp.rng;
  let x = -0.5;
  while (x < 0.49) {
    const bw = Math.min(0.5 - x, 0.22 + r.next() * 0.16);
    lp.box(x + bw / 2, -0.05, 0, bw - 0.012, 0.32, 0.3, r.pick([LPC.stoneDark, LPC.stone, '#4c5058']), { bevel: 0.02, vary: 0.08, ao: 0.3 });
    x += bw;
  }
  lp.box(0, 0.27, 0, 1.02, 0.07, 0.36, LPC.stone, { bevel: 0.015, vary: 0.06, topTint: LPC.moss, topAmount: r.chance(0.4) ? 0.35 : 0 });
  for (const y of [0.55, 1.2]) lp.box(0, y, 0, 1.02, 0.035, 0.035, LPC.iron, { jitter: 0, ao: 0 });
  for (let i = 0; i < 5; i++) {
    const px = -0.4 + i * 0.2;
    lp.cyl(px, 0.34, 0, 0.016, 0.016, 1.05, 4, LPC.iron, { jitter: 0, ao: 0.1 });
    lp.cyl(px, 1.39, 0, 0.035, 0, 0.1, 4, LPC.iron, { jitter: 0 });
    if (i % 2 === 0) lp.add(new THREE.TorusGeometry(0.07, 0.01, 3, 8, Math.PI).translate(px + 0.1, 0.58, 0), LPC.iron, { jitter: 0 });
  }
  if (r.chance(0.5)) moss(lp, r.range(-0.4, 0.4), 0.05, 0.16, 0.08);
  if (r.chance(0.6)) grassTuft(lp, r.range(-0.45, 0.45), 0.2, 1.2);
  return lp.build();
}

export function fencePillarLP(seed: number): LPModel {
  const lp = new LP(`lp:fpil:${seed}`);
  lp.box(0, -0.05, 0, 0.5, 0.2, 0.5, LPC.stoneDark, { bevel: 0.02, ao: 0.3 });
  lp.box(0, 0.15, 0, 0.38, 1.4, 0.38, LPC.stone, { bevel: 0.02, vary: 0.06, ao: 0.25 });
  for (const y of [0.55, 1.0]) lp.box(0, y, 0, 0.41, 0.05, 0.41, LPC.stoneDark, { bevel: 0.008 });
  lp.box(0, 1.55, 0, 0.5, 0.08, 0.5, LPC.stoneLight, { bevel: 0.015, topTint: LPC.moss, topAmount: 0.25 });
  lp.push([0, 1.63, 0], Math.PI / 4).cyl(0, 0, 0, 0.3, 0.05, 0.22, 4, LPC.stoneDark, { jitter: 0.006 }).pop();
  lp.blob(0, 1.9, 0, 0.07, 0.07, 0.07, LPC.stoneLight, { detail: 1, jitter: 0.005 });
  return lp.build();
}

/** Cancello d'ingresso largo 3 celle con arco in ferro e lanterne. */
export function gateLP(lit: boolean): LPModel {
  const lp = new LP('lp:gate');
  for (const s of [-1, 1]) {
    const x = s * 1.3;
    lp.box(x, -0.05, 0, 0.66, 0.24, 0.66, LPC.stoneDark, { bevel: 0.02, ao: 0.3 });
    lp.box(x, 0.19, 0, 0.52, 2.2, 0.52, LPC.stone, { bevel: 0.02, vary: 0.06, ao: 0.25 });
    lp.push([x, 0, 0]);
    quoins(lp, 0.52, 0.52, 2.1, 0.2, LPC.stoneLight);
    lp.box(0, 2.39, 0, 0.66, 0.1, 0.66, LPC.stoneLight, { bevel: 0.015 });
    lp.push([0, 2.49, 0], Math.PI / 4).cyl(0, 0, 0, 0.36, 0.05, 0.32, 4, LPC.stoneDark, { jitter: 0.006 }).pop();
    // teschio di guardia
    lp.blob(0, 2.92, 0, 0.11, 0.1, 0.1, LPC.bone, { detail: 1, jitter: 0.008 });
    for (const ex of [-1, 1]) lp.blob(ex * 0.04, 2.93, 0.08, 0.025, 0.028, 0.012, LPC.charcoal, { jitter: 0 });
    // lanterna appesa al braccio
    lp.box(0, 1.8, 0.33, 0.04, 0.04, 0.3, LPC.iron, { jitter: 0 });
    lp.box(0, 1.6, 0.46, 0.012, 0.2, 0.012, LPC.iron, { jitter: 0 });
    lp.box(0, 1.28, 0.46, 0.2, 0.04, 0.2, LPC.iron, { bevel: 0.006 });
    lp.box(0, 1.32, 0.46, 0.14, 0.22, 0.14, lit ? LPC.lantern : '#3c3a35', { bucket: lit ? 'glow' : 'solid', jitter: 0 });
    lp.push([0, 1.54, 0.46], Math.PI / 4).cyl(0, 0, 0, 0.15, 0.02, 0.1, 4, LPC.iron, { jitter: 0 }).pop();
    if (lit) lp.light(0, 1.42, 0.46, LPC.lantern, 1, 6, 0.15, 1.2);
    lp.pop();
    // anta aperta verso l'interno
    lp.push([s * 1.02, 0, 0], s * 1.15);
    for (let i = 0; i < 5; i++) {
      const px = -s * (0.1 + i * 0.18);
      lp.cyl(px, 0.05, 0, 0.018, 0.018, 1.55, 4, LPC.iron, { jitter: 0 });
      lp.cyl(px, 1.6, 0, 0.04, 0, 0.12, 4, LPC.iron, { jitter: 0 });
    }
    for (const y of [0.35, 1.3]) lp.box(-s * 0.46, y, 0, 0.92, 0.04, 0.04, LPC.iron, { jitter: 0 });
    lp.add(new THREE.TorusGeometry(0.16, 0.014, 3, 8).translate(-s * 0.46, 0.82, 0), LPC.iron, { jitter: 0 });
    lp.pop();
  }
  // arco in ferro battuto con targa
  lp.add(new THREE.TorusGeometry(1.0, 0.035, 4, 14, Math.PI).translate(0, 2.25, 0), LPC.iron, { jitter: 0 });
  lp.add(new THREE.TorusGeometry(0.88, 0.02, 3, 14, Math.PI).translate(0, 2.25, 0), LPC.iron, { jitter: 0 });
  lp.box(0, 3.0, 0, 0.8, 0.2, 0.04, LPC.ironLight, { bevel: 0.01 });
  lp.cyl(0, 3.22, 0, 0.05, 0, 0.2, 4, LPC.iron, { jitter: 0 });
  return lp.build();
}

// ── Edifici ──────────────────────────────────────────────────────────────

interface HouseOpts { w: number; d: number; wallH: number; rise: number; wall: string; roof: string; lit: boolean; chimney?: boolean; planks?: boolean }

/** Corpo di casa gotica: zoccolo, muri, cantonali, timpani, tetto, comignolo. */
function house(lp: LP, o: HouseOpts) {
  const r = lp.rng;
  lp.box(0, -0.06, 0, o.w + 0.12, 0.2, o.d + 0.12, LPC.stoneDark, { bevel: 0.025, vary: 0.08, ao: 0.3 });
  lp.box(0, 0.14, 0, o.w, o.wallH, o.d, o.wall, { bevel: 0.015, vary: 0.05, ao: 0.25 });
  if (o.planks) {
    for (const sz of [-1, 1]) for (let x = -o.w / 2 + 0.08; x < o.w / 2; x += 0.16) lp.box(x, 0.16, sz * (o.d / 2 + 0.006), 0.012, o.wallH - 0.04, 0.012, LPC.charcoal, { jitter: 0, ao: 0 });
  } else {
    wallStones(lp, o.w, o.wallH, 0.14, o.d / 2, 10, LPC.stoneWarm);
    quoins(lp, o.w, o.d, o.wallH, 0.14);
  }
  // marcapiano
  lp.box(0, 0.14 + o.wallH - 0.06, 0, o.w + 0.06, 0.06, o.d + 0.06, LPC.stoneLight, { bevel: 0.01 });
  for (const sx of [-1, 1]) gable(lp, sx * (o.w / 2 - 0.05), o.d, 0.14 + o.wallH, o.rise, o.wall);
  gableRoof(lp, o.w, o.d, 0.14 + o.wallH, o.rise, o.roof);
  if (o.chimney) {
    const cx = o.w * 0.28;
    lp.box(cx, 0.14 + o.wallH + o.rise * 0.3, -o.d * 0.18, 0.24, o.rise * 0.9, 0.24, LPC.stoneWarm, { bevel: 0.015, vary: 0.1 });
    lp.box(cx, 0.14 + o.wallH + o.rise * 1.2, -o.d * 0.18, 0.3, 0.05, 0.3, LPC.stoneDark, { bevel: 0.008 });
  }
  if (r.chance(0.5)) moss(lp, -o.w * 0.4, 0.2, o.d / 2 + 0.01, 0.1);
}

export function shopLP(v: PVis): LPModel {
  const lp = new LP(`lp:shop:${v.seed}:${v.dirty}`);
  const w = 2.3, d = 1.9, wallH = 1.25, rise = 0.85, z = -0.25;
  lp.push([0, 0, z]);
  house(lp, { w, d, wallH, rise, wall: '#6d6458', roof: LPC.roof, lit: true, chimney: true });
  archedDoor(lp, -0.45, d / 2 + 0.005, 0.5, 0.95, LPC.woodDark, LPC.stoneLight);
  // vetrina gotica
  gothicWindow(lp, 0.5, 0.42, d / 2 + 0.005, 0.62, 0.62, true);
  gothicWindow(lp, 0.0, 0.62, -d / 2 - 0.035, 0.36, 0.5, true);
  lp.push([w / 2 + 0.005, 0, 0], Math.PI / 2); gothicWindow(lp, 0, 0.5, 0, 0.34, 0.5, true); lp.pop();
  // tenda a strisce su due mensole
  lp.push([0.05, 0.14 + wallH - 0.08, d / 2 + 0.24], 0, 0.42);
  for (let i = 0; i < 9; i++) lp.box(-0.85 + i * 0.21, 0, 0, 0.21, 0.025, 0.52, i % 2 ? '#d6cdb9' : '#8e2f2a', { jitter: 0, vary: 0.04, ao: 0 });
  lp.pop();
  for (const sx of [-0.9, 0.98]) lp.push([sx, 0.14 + wallH - 0.2, d / 2 + 0.12], 0, 0.6).box(0, 0, 0, 0.03, 0.03, 0.3, LPC.iron, { jitter: 0 }).pop();
  // insegna appesa
  lp.box(-0.45, 0.14 + wallH + 0.02, d / 2 + 0.07, 0.62, 0.2, 0.04, LPC.wood, { bevel: 0.01, vary: 0.1 });
  lp.box(-0.45, 0.14 + wallH + 0.1, d / 2 + 0.095, 0.4, 0.04, 0.01, LPC.gold, { jitter: 0, ao: 0 });
  lp.pop();
  // merce e gradino
  lp.box(-0.45, 0, d / 2 + z + 0.16, 0.7, 0.07, 0.24, LPC.stoneLight, { bevel: 0.012 });
  barrel(lp, 0.95, 0.95);
  crate(lp, 0.55, 0, 1.02, 0.28);
  crate(lp, 0.6, 0.28, 1.0, 0.22);
  lp.light(0.5, 0.75, d / 2 + z + 0.15, LPC.window, 0.7, 4.5, 0.1, 0.8);
  grassTuft(lp, -1.25, 0.9, 1.2); grassTuft(lp, 1.3, -0.6, 1.1);
  decayLP(lp, v, 2.6, 2.6);
  return lp.build();
}

export function gravediggerHouseLP(v: PVis): LPModel {
  const lp = new LP(`lp:gdhouse:${v.seed}:${v.dirty}${v.broken}`);
  const w = 2.4, d = 1.9, wallH = 1.15, rise = 0.8;
  lp.push([-0.5, 0, -0.2]);
  house(lp, { w, d, wallH, rise, wall: LPC.wood, roof: LPC.roofDark, lit: !v.broken, chimney: true, planks: true });
  archedDoor(lp, 0.35, d / 2 + 0.005, 0.48, 0.9, LPC.woodDark, LPC.woodDark);
  gothicWindow(lp, -0.55, 0.5, d / 2 + 0.005, 0.4, 0.5, !v.broken, LPC.woodLight);
  lp.pop();
  // tettoia degli attrezzi
  lp.push([1.45, 0, -0.2]);
  for (const z of [-0.7, 0.7]) lp.cyl(0.25, 0, z, 0.04, 0.04, 1.05, 5, LPC.woodDark, { vary: 0.1 });
  lp.push([0.0, 1.1, 0], 0, 0, -0.25).box(0, 0, 0, 0.9, 0.05, 1.7, LPC.roofDark, { bevel: 0.01, vary: 0.08 }).pop();
  lp.push([0.05, 0, 0.3], 0, 0, 0.3).cyl(0, 0, 0, 0.018, 0.018, 0.95, 4, LPC.wood, { jitter: 0 }).box(0, 0.95, 0, 0.14, 0.2, 0.02, LPC.ironLight, { jitter: 0 }).pop();
  barrel(lp, -0.05, -0.4, 0.32);
  lp.pop();
  lp.light(-0.55, 0.75, 0.8, LPC.window, v.broken ? 0 : 0.6, 4, 0.1, 0.7);
  decayLP(lp, v, 3.6, 2.6);
  return lp.build();
}

export function mausoleumLP(v: PVis): LPModel {
  const lp = new LP(`lp:mausoleum:${v.seed}:${v.dirty}${v.broken}`);
  const o = v.dirty ? { topTint: LPC.moss, topAmount: 0.45 } : {};
  // gradinata
  for (let i = 0; i < 3; i++) lp.box(0, i * 0.1, 0.1 - i * 0.06, 2.7 - i * 0.18, 0.1, 2.7 - i * 0.22, i % 2 ? LPC.stone : LPC.stoneDark, { bevel: 0.02, vary: 0.06, ...o });
  const y0 = 0.3;
  // cella
  lp.box(0, y0, -0.15, 1.8, 1.45, 1.75, LPC.stone, { bevel: 0.02, vary: 0.05, ao: 0.25 });
  quoins(lp, 1.8, 1.75, 1.4, y0, LPC.stoneLight);
  // pronao con colonne
  for (const sx of [-1, 1]) for (const zz of [0.85, 0.85]) column(lp, sx * 0.72, y0, zz, 1.38, 0.075);
  lp.box(0, y0 + 1.45, 0.25, 1.95, 0.14, 1.95, LPC.stoneLight, { bevel: 0.015, ...o });
  // frontone con rosone
  const tri = new THREE.Shape();
  tri.moveTo(-1.0, 0); tri.lineTo(1.0, 0); tri.lineTo(0, 0.55); tri.closePath();
  lp.push([0, y0 + 1.59, 1.0]).extrude(tri, 0.16, LPC.stone, { bevel: 0.01, ...o }).pop();
  lp.push([0, y0 + 1.73, 1.08]).add(new THREE.TorusGeometry(0.11, 0.025, 4, 10), LPC.stoneLight, { jitter: 0 }).pop();
  lp.blob(0, y0 + 1.73, 1.07, 0.08, 0.08, 0.02, LPC.charcoal, { jitter: 0 });
  // tetto a capanna in lastre di pietra
  gableRoof(lp, 1.85, 2.0, y0 + 1.59, 0.55, LPC.stoneDark, 0.06);
  // croce di coronamento
  lp.box(0, y0 + 2.14, 0.25, 0.06, 0.4, 0.06, LPC.stoneLight, { jitter: 0 });
  lp.box(0, y0 + 2.38, 0.25, 0.24, 0.06, 0.06, LPC.stoneLight, { jitter: 0 });
  // portale in bronzo
  archedDoor(lp, 0, 0.73, 0.62, 1.05, '#4a3f30', LPC.stoneLight);
  lp.box(0, y0 + 1.18, 0.75, 1.1, 0.14, 0.02, LPC.charcoal, { jitter: 0, ao: 0 });
  // urne e candele sulla gradinata
  for (const sx of [-1, 1]) {
    vase(lp, sx * 1.05, 1.15, 0.2, LPC.stoneLight, !v.broken);
    candle(lp, sx * 0.45, 0.3, 1.1, !v.broken, 0.12);
  }
  if (v.dirty) { deadLeaves(lp, -1.3, -1.3, 1.3, 1.3, 30); for (let i = 0; i < 4; i++) weeds(lp, lp.rng.range(-1.3, 1.3), 1.25, 1); }
  return lp.build();
}

export function wellLP(v: PVis): LPModel {
  const lp = new LP(`lp:well:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  const n = 11;
  for (let course = 0; course < 3; course++) {
    for (let i = 0; i < n; i++) {
      const a = ((i + course * 0.5) / n) * Math.PI * 2;
      lp.push([Math.cos(a) * 0.5, course * 0.17, Math.sin(a) * 0.5], -a).box(0, 0, 0, 0.16, 0.16, 0.29, r.pick([LPC.stone, LPC.stoneWarm, '#5d6168']), { bevel: 0.015, vary: 0.08, ao: 0.2, ...(v.dirty ? { topTint: LPC.moss, topAmount: 0.4 } : {}) }).pop();
    }
  }
  lp.cyl(0, 0.3, 0, 0.38, 0.38, 0.02, 9, '#1c2a2e', { bucket: 'water', jitter: 0 });
  for (const sx of [-1, 1]) lp.cyl(sx * 0.58, 0.05, 0, 0.05, 0.045, 1.3, 5, LPC.woodDark, { vary: 0.1 });
  lp.push([0, 1.12, 0], 0, 0, Math.PI / 2).cyl(0, -0.62, 0, 0.035, 0.035, 1.24, 5, LPC.wood, { jitter: 0 }).pop();
  // tettuccio
  lp.push([0, 1.32, 0]);
  for (const s of [-1, 1]) lp.push([0, 0.12, s * 0.2], 0, s * 0.55).box(0, 0, 0, 1.4, 0.04, 0.55, LPC.roofDark, { bevel: 0.008, vary: 0.1 }).pop();
  lp.pop();
  // corda e secchio
  lp.box(0.12, 0.72, 0, 0.012, 0.4, 0.012, LPC.dry, { jitter: 0 });
  lp.lathe(0.12, 0.58, 0, [[0, 0], [0.07, 0], [0.09, 0.13], [0, 0.13]], 7, LPC.wood, { vary: 0.1 });
  grassTuft(lp, 0.75, 0.6, 1.2); grassTuft(lp, -0.7, -0.65, 1);
  decayLP(lp, v, 1.8, 1.8);
  return lp.build();
}

/** Figura incappucciata in preghiera su piedistallo (statua votiva). */
export function votiveStatueLP(v: PVis): LPModel {
  const lp = new LP(`lp:votive:${v.seed}:${v.dirty}`);
  const o = v.dirty ? { topTint: LPC.moss, topAmount: 0.5 } : {};
  lp.box(0, 0, 0, 1.1, 0.14, 1.1, LPC.stoneDark, { bevel: 0.02, ...o });
  lp.box(0, 0.14, 0, 0.72, 0.62, 0.72, LPC.stone, { bevel: 0.02, vary: 0.05, ...o });
  lp.box(0, 0.76, 0, 0.84, 0.08, 0.84, LPC.stoneLight, { bevel: 0.012, ...o });
  lp.lathe(0, 0.84, 0, [[0.27, 0], [0.25, 0.25], [0.19, 0.6], [0.15, 0.82], [0.17, 0.9], [0.0, 0.92]], 9, LPC.stoneLight, { vary: 0.05, ao: 0.25, ...o });
  lp.blob(0, 1.82, 0.03, 0.13, 0.15, 0.13, LPC.stoneLight, { detail: 1, jitter: 0.008 }); // cappuccio
  lp.blob(0, 1.78, 0.1, 0.07, 0.08, 0.04, LPC.charcoal, { jitter: 0 }); // volto in ombra
  lp.blob(0, 1.45, 0.17, 0.06, 0.1, 0.05, LPC.stoneLight, { jitter: 0.004 }); // mani giunte
  for (const sx of [-1, 1]) candle(lp, sx * 0.38, 0.14, 0.42, !v.broken, 0.1 + lp.rng.next() * 0.06);
  vase(lp, 0, 0.42, 0.14, LPC.gold);
  if (v.dirty) deadLeaves(lp, -0.6, -0.6, 0.6, 0.6, 10);
  return lp.build();
}

/** Angelo con ali aperte su piedistallo. */
export function angelStatueLP(v: PVis): LPModel {
  const lp = new LP(`lp:angelstatue:${v.seed}:${v.dirty}`);
  const o = { vary: 0.05, ao: 0.2, ...(v.dirty ? { topTint: LPC.moss, topAmount: 0.45 } : {}) };
  lp.box(0, 0, 0, 1.2, 0.16, 1.2, LPC.stoneDark, { bevel: 0.02, ...o });
  lp.lathe(0, 0.16, 0, [[0.42, 0], [0.4, 0.08], [0.32, 0.12], [0.3, 0.6], [0.38, 0.66], [0.4, 0.72], [0, 0.72]], 8, LPC.stone, o);
  const y = 0.88;
  lp.lathe(0, y, 0, [[0.26, 0], [0.23, 0.3], [0.15, 0.7], [0.12, 0.88], [0.15, 0.94], [0.06, 0.98], [0, 0.98]], 9, LPC.marble, o);
  lp.blob(0, y + 1.08, 0.02, 0.1, 0.12, 0.1, LPC.marble, { detail: 1, jitter: 0.008 });
  for (const sx of [-1, 1]) lp.push([sx * 0.13, y + 0.86, 0.04], 0, -2.3, sx * 0.3).cyl(0, 0, 0, 0.045, 0.035, 0.38, 6, LPC.marble, o).pop();
  const wing = new THREE.Shape();
  wing.moveTo(0, 0); wing.lineTo(0.18, 0.36); wing.lineTo(0.42, 0.72); wing.lineTo(0.6, 0.82); wing.lineTo(0.52, 0.56);
  wing.lineTo(0.56, 0.4); wing.lineTo(0.44, 0.28); wing.lineTo(0.4, 0.1); wing.lineTo(0.22, 0.03); wing.closePath();
  for (const sx of [-1, 1]) {
    lp.push([sx * 0.08, y + 0.42, -0.12], sx * 0.5, 0.2, 0, [sx, 1, 1]);
    lp.extrude(wing, 0.05, LPC.bone, { bevel: 0.01, ...o });
    lp.pop();
  }
  lp.add(new THREE.TorusGeometry(0.09, 0.01, 3, 10).rotateX(Math.PI / 2).translate(0, y + 1.28, 0), LPC.gold, { jitter: 0 });
  if (v.dirty) deadLeaves(lp, -0.6, -0.6, 0.6, 0.6, 10);
  return lp.build();
}

