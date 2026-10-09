// Architettura gotica low-poly. Componenti riutilizzabili (finestra e porta
// ad arco acuto, tetto a falde con file di lastre, colonna tornita, cantonali
// in pietra, inferriata a lance) e i generatori degli edifici del gioco:
// recinto, pilastri, cancello, bottega, casa del becchino, mausoleo, pozzo,
// statue. Unità mondo, origine al centro dell'ingombro, fronte verso +z.

import * as THREE from 'three';
import { LP, gothicArchShape, type LPModel } from './kit.ts';
import { bouquet, candle, cobweb, deadLeaves, graveLight, grassTuft, hangingLantern, inscription, ivy, moss, pumpkin, vase, weeds, wreath } from './details.ts';
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

// ── Edifici "cozy spooky" ────────────────────────────────────────────────
// Case un po' storte e accoglienti: zoccolo di pietre irregolari, intonaco
// caldo con travi a vista, tetti ripidi con lastre e muschio, finestre calde,
// lanterne alle porte, edera, zucche intagliate, ragnatele, persiane.

interface CottageOpts {
  w: number; d: number; wallH: number; rise: number;
  plaster: string; timber: string; roof: string; lean?: number;
  planks?: boolean; roundWindow?: boolean; lit: boolean;
}

/** Corpo di casetta: zoccolo, muri con travi a vista, timpani, tetto muschiato, comignolo storto. */
function cottage(lp: LP, o: CottageOpts) {
  const r = lp.rng;
  // zoccolo di pietre irregolari
  for (const sz of [-1, 1]) {
    let x = -o.w / 2 - 0.04;
    while (x < o.w / 2) {
      const bw = Math.min(o.w / 2 + 0.04 - x, 0.18 + r.next() * 0.2);
      lp.box(x + bw / 2, -0.06, sz * (o.d / 2 + 0.02), bw - 0.015, 0.28 + r.next() * 0.06, 0.12, r.pick([LPC.stone, LPC.stoneDark, '#5d6168', LPC.stoneWarm]), { bevel: 0.02, vary: 0.1, ao: 0.3 });
      x += bw;
    }
  }
  for (const sx of [-1, 1]) lp.box(sx * (o.w / 2 + 0.02), -0.06, 0, 0.12, 0.3, o.d + 0.1, LPC.stoneDark, { bevel: 0.02, vary: 0.1, ao: 0.3 });
  const lean = o.lean ?? 0;
  lp.push([0, 0.2, 0], 0, 0, lean);
  const H = o.wallH;
  lp.box(0, 0, 0, o.w, H, o.d, o.plaster, { bevel: 0.015, vary: 0.04, ao: 0.25 });
  if (o.planks) {
    for (const sz of [-1, 1]) for (let x = -o.w / 2 + 0.07; x < o.w / 2; x += 0.14) lp.box(x + r.range(-0.01, 0.01), 0.01, sz * (o.d / 2 + 0.005), 0.012, H - 0.02, 0.012, LPC.charcoal, { jitter: 0, ao: 0 });
    for (const sx of [-1, 1]) for (let z = -o.d / 2 + 0.07; z < o.d / 2; z += 0.14) lp.box(sx * (o.w / 2 + 0.005), 0.01, z, 0.012, H - 0.02, 0.012, LPC.charcoal, { jitter: 0, ao: 0 });
  } else {
    // graticcio: travi orizzontali, montanti e saettoni sulle facciate lunghe
    for (const sz of [-1, 1]) {
      const z = sz * (o.d / 2 + 0.012);
      for (const y of [0.0, H * 0.48, H - 0.06]) lp.box(0, y, z, o.w + 0.04, 0.06, 0.03, o.timber, { jitter: 0.004, vary: 0.1, ao: 0 });
      for (const x of [-o.w / 2 + 0.03, o.w / 2 - 0.03, -o.w / 6, o.w / 6]) lp.box(x, 0, z, 0.06, H, 0.03, o.timber, { jitter: 0.004, vary: 0.1, ao: 0 });
      for (const [x, s] of [[-o.w / 3, 1], [o.w / 3, -1]]) lp.push([x, H * 0.74, z], 0, 0, s * 0.75).box(0, -H * 0.26, 0, 0.05, H * 0.52, 0.026, o.timber, { jitter: 0, ao: 0 }).pop();
    }
  }
  // timpani e tetto ripido
  for (const sx of [-1, 1]) gable(lp, sx * (o.w / 2 - 0.05), o.d, H, o.rise, o.plaster);
  gableRoof(lp, o.w, o.d, H, o.rise, o.roof, 0.2);
  // muschio sulle falde
  const slope = Math.atan2(o.rise, o.d / 2);
  for (let i = 0; i < 6; i++) {
    const s = r.chance(0.5) ? 1 : -1, t = r.range(0.15, 0.8);
    lp.push([r.range(-o.w / 2, o.w / 2) * 0.9, H + o.rise * (1 - t) + 0.06, s * (o.d / 2) * t], 0, s * slope).blob(0, 0, 0, 0.12 + r.next() * 0.1, 0.03, 0.09, r.pick([LPC.moss, '#56693f']), { jitter: 0.02, vary: 0.15, ao: 0 }).pop();
  }
  // oblò nel timpano
  if (o.roundWindow) {
    lp.push([o.w / 2 + 0.02, H + o.rise * 0.38, 0], Math.PI / 2);
    lp.add(new THREE.TorusGeometry(0.13, 0.03, 4, 10), o.timber, { jitter: 0 });
    lp.add(new THREE.CircleGeometry(0.11, 10), o.lit ? LPC.window : '#2a2d33', { bucket: o.lit ? 'glow' : 'solid', jitter: 0, ao: 0 });
    lp.box(0, -0.11, 0.01, 0.02, 0.22, 0.01, o.timber, { jitter: 0 });
    lp.pop();
  }
  lp.pop();
}

/** Persiane di legno ai lati di una finestra (piano z = zFace). */
function shutters(lp: LP, x: number, y: number, zFace: number, w: number, h: number, color: string) {
  for (const s of [-1, 1]) {
    lp.push([x + s * (w / 2 + 0.11), y, zFace + 0.02], s * 0.25);
    lp.box(0, 0, 0, 0.2, h, 0.025, color, { bevel: 0.006, vary: 0.1 });
    for (let k = 1; k < 5; k++) lp.box(0, (k * h) / 5, 0.014, 0.18, 0.012, 0.006, LPC.charcoal, { jitter: 0, ao: 0 });
    lp.pop();
  }
}

/** Fioriera sotto una finestra. */
function flowerBox(lp: LP, x: number, y: number, zFace: number, w: number) {
  const r = lp.rng;
  lp.box(x, y, zFace + 0.07, w, 0.1, 0.13, LPC.woodDark, { bevel: 0.008, vary: 0.1 });
  for (let i = 0; i < 7; i++) {
    lp.blob(x + r.range(-w / 2 + 0.05, w / 2 - 0.05), y + 0.12, zFace + 0.08, 0.05, 0.04, 0.05, '#3f5a32', { jitter: 0.006, vary: 0.15 });
    lp.blob(x + r.range(-w / 2 + 0.05, w / 2 - 0.05), y + 0.15, zFace + 0.1, 0.025, 0.02, 0.025, r.pick(LPC.flowers), { jitter: 0 });
  }
}

/** Comignolo di pietra un po' storto con cappello. */
function chimney(lp: LP, x: number, y: number, z: number, h: number) {
  lp.push([x, y, z], 0.2, 0, 0.06);
  lp.box(0, 0, 0, 0.26, h, 0.26, LPC.stoneWarm, { bevel: 0.015, vary: 0.1, ao: 0.2 });
  for (let k = 0.2; k < h; k += 0.18) lp.box(0, k, 0, 0.275, 0.02, 0.275, LPC.stoneDark, { jitter: 0, ao: 0 });
  lp.box(0, h, 0, 0.34, 0.05, 0.34, LPC.stoneDark, { bevel: 0.01 });
  lp.cyl(0.04, h + 0.05, 0, 0.05, 0.05, 0.08, 6, LPC.rust, { jitter: 0 });
  lp.pop();
}

export function shopLP(v: PVis): LPModel {
  const lp = new LP(`lp:shop:${v.seed}:${v.dirty}`);
  const w = 2.2, d = 1.55, wallH = 1.2, rise = 0.95, z = -0.38;
  const front = d / 2;
  lp.push([0, 0, z]);
  cottage(lp, { w, d, wallH, rise, plaster: '#8c7c64', timber: '#3f2f25', roof: '#3a4152', lean: 0.015, roundWindow: true, lit: true });
  lp.push([0, 0.2, 0], 0, 0, 0.015);
  archedDoor(lp, -0.48, front + 0.02, 0.46, 0.9, '#4a3324', LPC.stoneLight);
  // vetrina gotica illuminata con persiane, fioriera e ragnatela
  gothicWindow(lp, 0.45, 0.28, front + 0.02, 0.58, 0.62, true);
  shutters(lp, 0.45, 0.24, front + 0.02, 0.58, 0.66, '#4d6a5a');
  flowerBox(lp, 0.45, 0.14, front + 0.02, 0.7);
  cobweb(lp, 0.8, 1.0, front + 0.04, 0.22, true);
  // finestrella sul retro e sul lato
  gothicWindow(lp, 0.4, 0.45, -front - 0.05, 0.34, 0.45, true);
  // tenda a strisce con bordo smerlato
  lp.push([0.0, wallH - 0.05, front + 0.26], 0, 0.42);
  for (let i = 0; i < 10; i++) lp.box(-0.95 + i * 0.21, 0, 0, 0.21, 0.025, 0.56, i % 2 ? '#d6cdb9' : '#7e2b27', { jitter: 0, vary: 0.04, ao: 0 });
  lp.pop();
  for (let i = 0; i < 10; i++) {
    const t = new THREE.Shape(); t.moveTo(-0.105, 0); t.lineTo(0.105, 0); t.lineTo(0, -0.09); t.closePath();
    lp.push([-0.95 + i * 0.21, wallH - 0.17, front + 0.5]).plate(t, 0.012, i % 2 ? '#d6cdb9' : '#7e2b27', { ao: 0 }).pop();
  }
  // insegna a bandiera con teschio e boccetta
  lp.box(-0.95, wallH - 0.2, front + 0.18, 0.03, 0.03, 0.36, LPC.iron, { jitter: 0 });
  lp.push([-0.95, wallH - 0.22, front + 0.3]);
  for (const zz of [-0.1, 0.1]) lp.box(0, -0.06, zz, 0.008, 0.06, 0.008, LPC.iron, { jitter: 0 });
  lp.push([0, -0.06, 0], Math.PI / 2).box(0, -0.3, 0, 0.36, 0.3, 0.035, LPC.wood, { bevel: 0.008, vary: 0.1 }).pop();
  for (const sx of [-1, 1]) {
    lp.push([sx * 0.02, -0.21, 0], Math.PI / 2);
    lp.blob(-0.06, 0, 0, 0.05, 0.05, 0.02, LPC.bone, { jitter: 0 });
    lp.lathe(0.07, -0.06, 0, [[0, 0], [0.03, 0], [0.035, 0.05], [0.012, 0.08], [0.015, 0.11], [0, 0.11]], 6, '#5c8a6a', { jitter: 0 });
    lp.pop();
  }
  lp.pop();
  // lanterna alla porta
  lp.box(-0.82, 0.92, front + 0.1, 0.03, 0.03, 0.2, LPC.iron, { jitter: 0 });
  hangingLantern(lp, -0.82, 0.92, front + 0.2, true, 0.9);
  ivy(lp, -w / 2 + 0.12, 0.0, front + 0.02, 1.15, 0.12);
  lp.pop();
  chimney(lp, w * 0.28, 0.2 + wallH + rise * 0.2, -d * 0.2, rise * 1.05);
  lp.pop();
  // soglia, zucche, merce
  lp.box(-0.48, 0, front + z + 0.18, 0.64, 0.07, 0.26, LPC.stoneLight, { bevel: 0.012 });
  pumpkin(lp, -0.95, 0, 0.75, 0.13, true, true, 0.3);
  pumpkin(lp, -0.08, 0, 0.72, 0.1, true, true, -0.4);
  pumpkin(lp, 1.18, 0, 0.62, 0.15, false, false);
  barrel(lp, 1.1, 1.05);
  crate(lp, 0.62, 0, 1.08, 0.28);
  crate(lp, 0.66, 0.28, 1.06, 0.2);
  lp.push([1.3, 0, 0.2], 0, 0.15, -0.25).cyl(0, 0, 0, 0.015, 0.015, 0.95, 4, LPC.wood, { jitter: 0 }).cyl(0, 0, 0, 0.08, 0.05, 0.2, 6, LPC.dry, { jitter: 0.01 }).pop();
  lp.light(0.45, 0.75, front + z + 0.2, LPC.window, 0.7, 4.5, 0.1, 0.8);
  grassTuft(lp, -1.3, 0.9, 1.2); grassTuft(lp, 1.35, -0.8, 1.1); grassTuft(lp, -1.25, -1.1, 1);
  decayLP(lp, v, 2.6, 2.6);
  return lp.build();
}

export function gravediggerHouseLP(v: PVis): LPModel {
  const lp = new LP(`lp:gdhouse:${v.seed}:${v.dirty}${v.broken}`);
  const lit = !v.broken;
  const w = 2.3, d = 1.55, wallH = 1.1, rise = 0.85;
  const front = d / 2;
  lp.push([-0.55, 0, -0.35]);
  cottage(lp, { w, d, wallH, rise, plaster: '#6e5340', timber: LPC.woodDark, roof: '#2f3540', lean: -0.02, planks: true, roundWindow: true, lit });
  lp.push([0, 0.2, 0], 0, 0, -0.02);
  archedDoor(lp, 0.4, front + 0.02, 0.44, 0.85, '#3d2b20', LPC.woodDark);
  gothicWindow(lp, -0.5, 0.35, front + 0.02, 0.4, 0.48, lit, LPC.woodLight);
  shutters(lp, -0.5, 0.31, front + 0.02, 0.4, 0.52, '#5a4a36');
  cobweb(lp, -w / 2 + 0.08, wallH - 0.05, front + 0.03, 0.25);
  lp.pop();
  // portico: tettoia su due pali
  for (const x of [-0.95, 0.95]) lp.cyl(x, 0, front + 0.55, 0.045, 0.04, 1.25, 5, LPC.woodDark, { vary: 0.12 });
  lp.push([0, 1.32, front + 0.32], 0, 0.32).box(0, 0, 0, 2.2, 0.05, 0.7, '#2f3540', { bevel: 0.008, vary: 0.08 }).pop();
  hangingLantern(lp, 0.95, 1.22, front + 0.55, lit, 0.9);
  chimney(lp, -w * 0.32, 0.2 + wallH + rise * 0.15, -d * 0.15, rise * 1.1);
  lp.pop();
  // bara appoggiata al muro, legna, attrezzi
  const coffin = new THREE.Shape();
  coffin.moveTo(-0.12, 0); coffin.lineTo(0.12, 0); coffin.lineTo(0.2, 0.62); coffin.lineTo(0.14, 0.9); coffin.lineTo(-0.14, 0.9); coffin.lineTo(-0.2, 0.62); coffin.closePath();
  lp.push([0.85, 0, 0.55], 0.15, -0.18).extrude(coffin, 0.14, '#4a3324', { bevel: 0.012, vary: 0.08 }).box(0, 0.5, 0.075, 0.03, 0.22, 0.01, LPC.gold, { jitter: 0 }).box(0, 0.58, 0.075, 0.12, 0.03, 0.01, LPC.gold, { jitter: 0 }).pop();
  for (let i = 0; i < 6; i++) lp.push([-1.65 + (i % 3) * 0.17, 0.08 + Math.floor(i / 3) * 0.15, 0.5], Math.PI / 2, 0, Math.PI / 2).cyl(0, -0.25, 0, 0.075, 0.075, 0.5, 6, i % 2 ? LPC.wood : '#6b4e38', { vary: 0.1 }).pop();
  for (const [x, a] of [[1.55, 0.25], [1.7, -0.2]]) lp.push([x, 0, -0.2], 0, 0.1, a).cyl(0, 0, 0, 0.016, 0.016, 1.05, 4, LPC.wood, { jitter: 0 }).box(0, 0.02, 0, 0.14, 0.2, 0.02, LPC.ironLight, { jitter: 0 }).pop();
  pumpkin(lp, -0.2, 0, 0.75, 0.12, true, lit, 0.2);
  pumpkin(lp, 1.6, 0, 0.75, 0.13, false, false);
  ivy(lp, -1.62, 0.0, 0.42, 1.0, 0.1);
  lp.light(-0.5, 0.75, 0.5, LPC.window, lit ? 0.6 : 0, 4, 0.1, 0.7);
  grassTuft(lp, 1.8, 1.2, 1.2); grassTuft(lp, -1.8, -1.2, 1.1);
  decayLP(lp, v, 3.6, 2.6);
  return lp.build();
}

export function mausoleumLP(v: PVis): LPModel {
  const lp = new LP(`lp:mausoleum:${v.seed}:${v.dirty}${v.broken}`);
  const lit = !v.broken;
  const o = v.dirty ? { topTint: LPC.moss, topAmount: 0.45 } : {};
  for (let i = 0; i < 3; i++) lp.box(0, i * 0.1, 0.1 - i * 0.06, 2.7 - i * 0.18, 0.1, 2.7 - i * 0.22, i % 2 ? LPC.stone : LPC.stoneDark, { bevel: 0.02, vary: 0.06, ...o });
  const y0 = 0.3;
  lp.box(0, y0, -0.15, 1.8, 1.45, 1.75, LPC.stone, { bevel: 0.02, vary: 0.05, ao: 0.25 });
  quoins(lp, 1.8, 1.75, 1.4, y0, LPC.stoneLight);
  for (const sx of [-1, 1]) column(lp, sx * 0.72, y0, 0.85, 1.38, 0.075);
  lp.box(0, y0 + 1.45, 0.25, 1.95, 0.14, 1.95, LPC.stoneLight, { bevel: 0.015, ...o });
  const tri = new THREE.Shape();
  tri.moveTo(-1.0, 0); tri.lineTo(1.0, 0); tri.lineTo(0, 0.55); tri.closePath();
  lp.push([0, y0 + 1.59, 1.0]).extrude(tri, 0.16, LPC.stone, { bevel: 0.01, ...o }).pop();
  lp.push([0, y0 + 1.73, 1.08]).add(new THREE.TorusGeometry(0.11, 0.025, 4, 10), LPC.stoneLight, { jitter: 0 }).pop();
  lp.blob(0, y0 + 1.73, 1.07, 0.08, 0.08, 0.02, lit ? '#3f8f7c' : LPC.charcoal, { bucket: lit ? 'glow' : 'solid', jitter: 0 });
  gableRoof(lp, 1.85, 2.0, y0 + 1.59, 0.55, LPC.stoneDark, 0.06);
  lp.box(0, y0 + 2.14, 0.25, 0.06, 0.4, 0.06, LPC.stoneLight, { jitter: 0 });
  lp.box(0, y0 + 2.38, 0.25, 0.24, 0.06, 0.06, LPC.stoneLight, { jitter: 0 });
  // piccoli gargoyle agli angoli del frontone
  for (const sx of [-1, 1]) {
    lp.push([sx * 0.92, y0 + 1.6, 1.05], sx * -0.4);
    lp.blob(0, 0.1, 0, 0.08, 0.1, 0.08, LPC.stoneDark, { detail: 1, jitter: 0.01 });
    lp.blob(0, 0.22, 0.05, 0.06, 0.06, 0.06, LPC.stoneDark, { jitter: 0.008 });
    for (const s of [-1, 1]) lp.push([s * 0.06, 0.14, -0.02], 0, 0, s * 0.8).box(0, 0, 0, 0.12, 0.02, 0.08, LPC.stoneDark, { jitter: 0 }).pop();
    lp.pop();
  }
  // portale: cancello in ferro su un interno che brilla appena
  lp.push([0, 0, 0.73]);
  lp.plate(gothicArchShape(0.78, 1.15, 5), 0.04, LPC.stoneLight, { ao: 0.1 });
  lp.push([0, 0.02, 0.02]).plate(gothicArchShape(0.64, 1.05, 5), 0.02, lit ? '#1f3a35' : '#14171c', { bucket: lit ? 'glow' : 'solid', ao: 0 }).pop();
  for (let i = 0; i < 6; i++) lp.cyl(-0.27 + i * 0.108, 0.02, 0.05, 0.012, 0.012, 0.9, 4, LPC.iron, { jitter: 0 });
  for (const y of [0.25, 0.7]) lp.box(0, y, 0.05, 0.62, 0.025, 0.02, LPC.iron, { jitter: 0 });
  lp.add(new THREE.TorusGeometry(0.08, 0.012, 3, 8).translate(0, 0.5, 0.06), LPC.iron, { jitter: 0 });
  lp.pop();
  lp.box(0, y0 + 1.18, 0.75, 1.1, 0.14, 0.02, LPC.charcoal, { jitter: 0, ao: 0 });
  // edera sulle colonne e sui fianchi, candele e corona
  ivy(lp, -0.72, y0, 0.93, 1.2, 0.08);
  lp.push([0.9, 0, -0.1], Math.PI / 2); ivy(lp, 0.1, y0, 0.02, 1.1, 0.25); lp.pop();
  for (const sx of [-1, 1]) {
    vase(lp, sx * 1.05, 1.15, 0.2, LPC.stoneLight, lit);
    candle(lp, sx * 0.45, 0.3, 1.1, lit, 0.12);
    candle(lp, sx * 0.55, 0.3, 1.0, lit, 0.08);
  }
  wreath(lp, 0, 0.62, 0.8, -0.1, 1.4);
  if (lit) lp.light(0, 0.6, 0.9, '#6fd3bd', 0.35, 2.5, 0.25, 0.5);
  cobweb(lp, 0.3, y0 + 1.15, 0.78, 0.2, true);
  if (v.dirty) { deadLeaves(lp, -1.3, -1.3, 1.3, 1.3, 30); for (let i = 0; i < 4; i++) weeds(lp, lp.rng.range(-1.3, 1.3), 1.25, 1); }
  return lp.build();
}

export function wellLP(v: PVis): LPModel {
  const lp = new LP(`lp:well:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  const lit = !v.broken;
  const n = 11;
  for (let course = 0; course < 3; course++) {
    for (let i = 0; i < n; i++) {
      const a = ((i + course * 0.5) / n) * Math.PI * 2;
      lp.push([Math.cos(a) * 0.5, course * 0.17, Math.sin(a) * 0.5], -a).box(0, 0, 0, 0.16, 0.16, 0.29, r.pick([LPC.stone, LPC.stoneWarm, '#5d6168']), { bevel: 0.015, vary: 0.08, ao: 0.2, topTint: LPC.moss, topAmount: v.dirty ? 0.5 : 0.2 }).pop();
    }
  }
  for (let i = 0; i < 4; i++) moss(lp, Math.cos(i * 1.7) * 0.6, 0.12 + i * 0.08, Math.sin(i * 1.7) * 0.6, 0.06);
  lp.cyl(0, 0.3, 0, 0.38, 0.38, 0.02, 9, '#1c2a2e', { bucket: 'water', jitter: 0 });
  for (const sx of [-1, 1]) lp.push([sx * 0.58, 0.05, 0], 0, 0, sx * -0.04).cyl(0, 0, 0, 0.05, 0.045, 1.3, 5, LPC.woodDark, { vary: 0.1 }).pop();
  lp.push([0, 1.12, 0], 0, 0, Math.PI / 2).cyl(0, -0.62, 0, 0.035, 0.035, 1.24, 5, LPC.wood, { jitter: 0 }).pop();
  // manovella
  lp.box(0.66, 1.12, 0.06, 0.03, 0.03, 0.12, LPC.iron, { jitter: 0 });
  lp.box(0.66, 1.04, 0.12, 0.03, 0.16, 0.03, LPC.iron, { jitter: 0 });
  // tettuccio storto a scandole con muschio
  lp.push([0, 1.32, 0], 0.05, 0, 0.06);
  for (const s of [-1, 1]) {
    lp.push([0, 0.12, s * 0.2], 0, s * 0.55);
    lp.box(0, 0, 0, 1.45, 0.04, 0.58, LPC.roofDark, { bevel: 0.008, vary: 0.1 });
    for (let k = 0; k < 3; k++) lp.box(r.range(-0.02, 0.02), 0.03, (-0.2 + k * 0.2) * -s, 1.42, 0.025, 0.14, k % 2 ? LPC.roof : LPC.roofDark, { bevel: 0.004, ao: 0 });
    moss(lp, r.range(-0.5, 0.5), 0.05, 0, 0.12);
    lp.pop();
  }
  lp.pop();
  hangingLantern(lp, -0.3, 1.25, 0.15, lit, 0.8);
  lp.box(0.12, 0.72, 0, 0.012, 0.4, 0.012, LPC.dry, { jitter: 0 });
  lp.lathe(0.12, 0.58, 0, [[0, 0], [0.07, 0], [0.09, 0.13], [0, 0.13]], 7, LPC.wood, { vary: 0.1 });
  grassTuft(lp, 0.75, 0.6, 1.2); grassTuft(lp, -0.7, -0.65, 1);
  decayLP(lp, v, 1.8, 1.8);
  return lp.build();
}

/**
 * Edicola votiva: pilastro in pietra con nicchia ad arco, dentro una
 * Madonnina con aureola illuminata da un lumino; tettuccio con croce, fiori,
 * candele ed ex-voto davanti. Leggibile anche da lontano.
 */
export function votiveStatueLP(v: PVis): LPModel {
  const lp = new LP(`lp:votive:${v.seed}:${v.dirty}`);
  const lit = !v.broken;
  const o = { vary: 0.06, ao: 0.25, ...(v.dirty ? { topTint: LPC.moss, topAmount: 0.5 } : {}) };
  lp.box(0, 0, 0, 1.15, 0.1, 1.0, LPC.stoneDark, { bevel: 0.02, ...o });
  lp.box(0, 0.1, -0.05, 0.95, 0.1, 0.8, LPC.stone, { bevel: 0.015, ...o });
  const W = 0.7, D = 0.5, H = 1.3;
  lp.box(0, 0.2, -0.15, W, H, D, LPC.stoneWarm, { bevel: 0.02, ...o });
  quoins(lp, W, D, H - 0.05, 0.2, LPC.stoneLight);
  const zf = -0.15 + D / 2;
  // nicchia
  lp.push([0, 0.52, zf]);
  lp.plate(gothicArchShape(0.5, 0.74, 5), 0.03, LPC.stoneLight, { ao: 0.1 });
  lp.push([0, 0.03, 0.01]).plate(gothicArchShape(0.4, 0.66, 5), 0.025, '#1b1d22', { ao: 0 }).pop();
  // Madonnina: veste bianca, manto azzurro, testa china, mani giunte, aureola
  lp.push([0, 0.04, 0.06]);
  lp.lathe(0, 0, 0, [[0.1, 0], [0.095, 0.12], [0.07, 0.3], [0.055, 0.36], [0, 0.37]], 8, '#d9d4c6', { vary: 0.04, ao: 0.1 });
  lp.lathe(0, 0.02, -0.01, [[0.115, 0], [0.105, 0.15], [0.08, 0.32], [0.06, 0.4], [0.035, 0.44], [0, 0.45]], 8, '#5a7590', { vary: 0.05, ao: 0.15 });
  lp.blob(0, 0.43, 0.025, 0.045, 0.05, 0.045, '#e3d6c3', { detail: 1, jitter: 0.003 });
  lp.blob(0, 0.3, 0.07, 0.025, 0.035, 0.02, '#e3d6c3', { jitter: 0 });
  lp.push([0, 0.46, 0.0], 0, -0.25).add(new THREE.TorusGeometry(0.075, 0.009, 3, 12), LPC.gold, { bucket: lit ? 'glow' : 'solid', jitter: 0 }).pop();
  lp.pop();
  if (lit) { candle(lp, 0.13, 0.04, 0.08, true, 0.06); lp.light(0, 0.3, 0.15, LPC.flame, 0.5, 2.2, 0.3, 0.5); }
  lp.pop();
  // tettuccio a due falde con croce
  lp.push([0, 0.2 + H, -0.15]);
  for (const s of [-1, 1]) lp.push([s * 0.2, 0.1, 0], 0, 0, s * -0.5).box(0, 0, 0, 0.5, 0.05, D + 0.2, LPC.roofDark, { ...o, bevel: 0.008, vary: 0.08 }).pop();
  lp.box(0, 0.22, 0, 0.04, 0.3, 0.04, LPC.iron, { jitter: 0 });
  lp.box(0, 0.42, 0, 0.17, 0.035, 0.035, LPC.iron, { jitter: 0 });
  lp.pop();
  // davanzale con fiori, lumini ed ex-voto
  lp.box(0, 0.42, zf + 0.08, 0.6, 0.04, 0.18, LPC.stoneLight, { bevel: 0.008 });
  vase(lp, -0.2, zf + 0.1, 0.46, LPC.stoneLight, true);
  for (const x of [0.12, 0.24]) candle(lp, x, 0.46, zf + 0.1, lit, 0.06 + lp.rng.next() * 0.04);
  const heart = new THREE.Shape();
  heart.moveTo(0, -0.05); heart.lineTo(0.05, 0.01); heart.lineTo(0.03, 0.04); heart.lineTo(0, 0.02); heart.lineTo(-0.03, 0.04); heart.lineTo(-0.05, 0.01); heart.closePath();
  for (const x of [-0.24, 0.25]) lp.push([x, 1.05, zf + 0.005]).plate(heart, 0.012, x < 0 ? LPC.gold : '#9e4b45', { ao: 0 }).pop();
  // a terra: lumini rossi e mazzi
  graveLight(lp, -0.35, 0.2, 0.35, lit);
  graveLight(lp, 0.38, 0.2, 0.3, lit);
  bouquet(lp, 0.0, 0.2, 0.38, 1.2);
  ivy(lp, -W / 2 + 0.04, 0.2, zf, 0.9, 0.06);
  if (v.dirty) deadLeaves(lp, -0.6, -0.6, 0.6, 0.6, 12);
  return lp.build();
}

/** Ala di piume: tre file di penne affusolate disposte a ventaglio. */
function featherWing(lp: LP, color: string, o: object) {
  const feather = (len: number, wid: number) => {
    const f = new THREE.Shape();
    f.moveTo(0, 0); f.lineTo(wid * 0.5, len * 0.25); f.lineTo(wid * 0.4, len * 0.8); f.lineTo(0, len); f.lineTo(-wid * 0.4, len * 0.8); f.lineTo(-wid * 0.5, len * 0.25); f.closePath();
    return f;
  };
  const rows: Array<[number, number, number, number]> = [[7, 0.62, 0.11, 0], [6, 0.42, 0.11, 0.025], [5, 0.24, 0.1, 0.05]];
  for (const [n, len, wid, dz] of rows) {
    for (let i = 0; i < n; i++) {
      const a = -0.15 + (i / (n - 1)) * 1.25; // ventaglio dall'alto verso l'esterno
      lp.push([0, 0, dz], 0, 0, -a).extrude(feather(len * (1 - i * 0.05), wid), 0.025, color, { bevel: 0.004, ...o }).pop();
    }
  }
}

/** Angelo piangente su piedistallo: veste a pieghe, volto tra le mani, ali di piume. */
export function angelStatueLP(v: PVis): LPModel {
  const lp = new LP(`lp:angelstatue:${v.seed}:${v.dirty}`);
  const o = { vary: 0.05, ao: 0.2, ...(v.dirty ? { topTint: LPC.moss, topAmount: 0.45 } : {}) };
  const marble = LPC.marble;
  // basamento a gradini e piedistallo modanato con epigrafe
  lp.box(0, 0, 0, 1.25, 0.12, 1.25, LPC.stoneDark, { bevel: 0.02, ...o });
  lp.box(0, 0.12, 0, 1.0, 0.1, 1.0, LPC.stone, { bevel: 0.015, ...o });
  lp.box(0, 0.22, 0, 0.72, 0.5, 0.72, LPC.stone, { bevel: 0.02, ...o });
  lp.box(0, 0.72, 0, 0.84, 0.08, 0.84, LPC.stoneLight, { bevel: 0.012, ...o });
  lp.box(0, 0.32, 0.365, 0.46, 0.26, 0.012, LPC.stoneDark, { jitter: 0, ao: 0 });
  inscription(lp, 0, 0.5, 0.375, [0.3, 0.36, 0.22], LPC.stoneLight);
  const y = 0.8;
  // veste con pieghe verticali
  lp.lathe(0, y, 0, [[0.3, 0], [0.28, 0.08], [0.22, 0.4], [0.17, 0.7], [0.15, 0.82], [0.17, 0.9], [0.1, 0.96], [0, 0.97]], 10, marble, o);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    lp.push([Math.cos(a) * 0.2, y, Math.sin(a) * 0.2], -a, 0, 0).push([0, 0, 0], 0, 0, 0.12).box(0.06, 0, 0, 0.035, 0.75, 0.05, marble, { jitter: 0.004, ...o }).pop().pop();
  }
  // testa china con capelli raccolti
  lp.push([0, y + 1.04, 0.04], 0, 0.45);
  lp.blob(0, 0, 0, 0.1, 0.12, 0.1, marble, { detail: 1, jitter: 0.006 });
  lp.blob(0, 0.03, -0.04, 0.11, 0.1, 0.1, '#a9a396', { detail: 1, jitter: 0.008 });
  lp.pop();
  // braccia che salgono a coprire il volto
  for (const s of [-1, 1]) {
    lp.push([s * 0.15, y + 0.86, 0.02], 0, -0.6, s * 0.25);
    lp.cyl(0, -0.26, 0, 0.045, 0.04, 0.26, 6, marble, o);
    lp.pop();
    lp.push([s * 0.08, y + 0.82, 0.18], 0, -2.3, s * -0.35).cyl(0, 0, 0, 0.035, 0.03, 0.24, 6, marble, o).pop();
    lp.blob(s * 0.04, y + 1.02, 0.15, 0.04, 0.05, 0.03, marble, { jitter: 0.003 });
  }
  // ali di piume semiaperte
  for (const s of [-1, 1]) {
    lp.push([s * 0.1, y + 0.82, -0.14], s * 0.55, 0.15, 0, [s, 1, 1]);
    featherWing(lp, LPC.bone, o);
    lp.pop();
  }
  if (v.dirty) { deadLeaves(lp, -0.6, -0.6, 0.6, 0.6, 10); moss(lp, 0.3, 0.73, 0.3, 0.08); }
  grassTuft(lp, 0.58, 0.58, 1.1); grassTuft(lp, -0.6, 0.5, 1);
  return lp.build();
}
