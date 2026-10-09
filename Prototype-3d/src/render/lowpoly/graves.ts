// Lapidi "Stylized Gothic Low-Poly". Cinque famiglie geometriche, declinate
// sui 10 tipi di lapide del gioco, con variazioni deterministiche per seme:
//   1. rettangolare  → rectangular, family_memorial
//   2. arrotondata   → stone_simple, victorian
//   3. gotica acuta  → gothic
//   4. croce         → celtic_cross (con anello), marble_cross (latina)
//   5. piedistallo   → decorated_monument (urna), obelisk, angel
// Gli stati (pulita, con fiori, trascurata, rotta) aggiungono decorazioni
// modulari: niente mesh fatta a mano per ogni combinazione.
// Ingombro 2×2 celle (x,z ∈ [-1,1]); lapide sul retro, tumulo davanti (+z).

import * as THREE from 'three';
import type { GraveType, GraveVisualState } from '../../game/graves.ts';
import { LP, gothicArchShape, rectShape, roundTopShape, type LPModel } from './kit.ts';
import { bouquet, candle, crack, deadLeaves, graveLight, grassTuft, inscription, moss, pebbles, vase, weeds, wreath } from './details.ts';
import { LPC } from './palette.ts';

const STONE_Z = -0.52;

interface Ctx { lp: LP; stone: string; dark: string; dirty: boolean; broken: boolean }
interface Dims { w: number; h: number; d: number; face: number }

/** Colore "invecchiato": più scuro e tendente al terriccio se trascurato. */
function aged(hex: string, dirty: boolean, amount = 0.28): string {
  if (!dirty) return hex;
  return '#' + new THREE.Color(hex).lerp(new THREE.Color(LPC.soilDark), amount).getHexString();
}

function so(c: Ctx, extra: object = {}) {
  return { vary: 0.07, ao: 0.22, ...(c.dirty ? { topTint: LPC.moss, topAmount: 0.55 } : {}), ...extra };
}

/** Basamento a gradini smussati. */
function plinth(c: Ctx, w: number, d: number, steps: number): number {
  let y = 0;
  for (let i = 0; i < steps; i++) {
    const k = 1 - i * 0.14;
    const h = i === 0 ? 0.1 : 0.08;
    c.lp.box(0, y, 0, w * k, h, d * k, i === 0 ? c.dark : c.stone, { bevel: 0.018, ...so(c) });
    y += h;
  }
  return y;
}

// ── Famiglia 1: rettangolare ─────────────────────────────────────────────
function rectangular(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const w = 0.92 + r.next() * 0.2, h = 0.95 + r.next() * 0.25, d = 0.16;
  const y0 = plinth(c, w + 0.24, 0.42, 2);
  lp.box(0, y0, 0, w, h, d, c.stone, { bevel: 0.02, ...so(c) });
  // cornice superiore aggettante e cimasa
  lp.box(0, y0 + h, 0, w + 0.08, 0.06, d + 0.06, c.stone, { bevel: 0.012, ...so(c) });
  if (r.chance(0.6)) lp.box(0, y0 + h + 0.06, 0, w * 0.55, 0.05, d * 0.7, c.stone, { bevel: 0.01, ...so(c) });
  // pannello incassato con epigrafe
  lp.box(0, y0 + 0.16, d / 2, w * 0.74, h * 0.62, 0.012, c.dark, { jitter: 0, ao: 0, vary: 0.04 });
  lp.box(0, y0 + 0.19, d / 2 + 0.006, w * 0.66, h * 0.56, 0.01, c.stone, { jitter: 0, ao: 0, vary: 0.04 });
  inscription(lp, 0, y0 + h * 0.62, d / 2 + 0.013, [w * 0.42, w * 0.5, w * 0.3, w * 0.38].slice(0, 3 + r.int(2)));
  // piccola croce in rilievo
  lp.box(0, y0 + h * 0.66, d / 2 + 0.012, 0.03, 0.14, 0.012, c.dark, { jitter: 0, ao: 0 });
  lp.box(0, y0 + h * 0.66 + 0.08, d / 2 + 0.012, 0.09, 0.028, 0.012, c.dark, { jitter: 0, ao: 0 });
  return { w, h: y0 + h + 0.11, d, face: d / 2 };
}

function familyMemorial(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const w = 1.6 + r.next() * 0.15, h = 0.78 + r.next() * 0.1, d = 0.2;
  const y0 = plinth(c, w + 0.2, 0.5, 2);
  lp.box(0, y0, 0, w, h, d, c.stone, { bevel: 0.02, ...so(c) });
  // pilastri laterali con capitello e pinnacolo
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 + 0.02);
    lp.box(x, y0, 0, 0.16, h + 0.12, d + 0.1, c.stone, { bevel: 0.015, ...so(c) });
    lp.box(x, y0 + h + 0.12, 0, 0.2, 0.05, d + 0.14, c.stone, { bevel: 0.01, ...so(c) });
    lp.cyl(x, y0 + h + 0.17, 0, 0.07, 0, 0.16, 4, c.stone, so(c, { jitter: 0.004 }));
  }
  // frontone triangolare
  const tri = new THREE.Shape();
  tri.moveTo(-w * 0.42, 0); tri.lineTo(w * 0.42, 0); tri.lineTo(0, 0.24); tri.closePath();
  lp.push([0, y0 + h, 0]).extrude(tri, d, c.stone, { bevel: 0.01, ...so(c) }).pop();
  // tre targhe di famiglia
  for (const x of [-w * 0.3, 0, w * 0.3]) {
    lp.box(x, y0 + 0.14, d / 2, w * 0.24, h * 0.62, 0.012, c.dark, { jitter: 0, ao: 0 });
    inscription(lp, x, y0 + h * 0.6, d / 2 + 0.008, [w * 0.14, w * 0.17, w * 0.1], LPC.stoneLight);
  }
  return { w: w + 0.2, h: y0 + h + 0.33, d, face: d / 2 };
}

// ── Famiglia 2: arrotondata ──────────────────────────────────────────────
function rounded(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const w = 0.85 + r.next() * 0.2, h = 0.95 + r.next() * 0.2, d = 0.15;
  const y0 = plinth(c, w + 0.2, 0.36, 1);
  lp.push([0, y0, 0]).extrude(roundTopShape(w, h, 8), d, c.stone, { bevel: 0.018, ...so(c) }).pop();
  // bordo in rilievo che segue la sagoma
  lp.push([0, y0 + 0.05, d / 2 + 0.004]).plate(roundTopShape(w * 0.82, h - 0.12, 8), 0.01, c.dark, { ao: 0, vary: 0.03 }).pop();
  lp.push([0, y0 + 0.08, d / 2 + 0.01]).plate(roundTopShape(w * 0.74, h - 0.18, 8), 0.01, c.stone, { ao: 0, vary: 0.03 }).pop();
  inscription(lp, 0, y0 + h * 0.55, d / 2 + 0.024, [w * 0.4, w * 0.48, w * 0.3]);
  if (r.chance(0.5)) { // colomba/cuore stilizzato in rilievo
    lp.box(0, y0 + h * 0.72, d / 2 + 0.02, 0.05, 0.12, 0.012, c.dark, { jitter: 0, ao: 0 });
    lp.box(0, y0 + h * 0.72 + 0.06, d / 2 + 0.02, 0.12, 0.035, 0.012, c.dark, { jitter: 0, ao: 0 });
  }
  return { w, h: y0 + h, d, face: d / 2 + 0.02 };
}

function victorian(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const w = 0.82 + r.next() * 0.1, h = 1.25 + r.next() * 0.2, d = 0.17;
  const y0 = plinth(c, w + 0.3, 0.46, 2);
  lp.push([0, y0, 0]).extrude(roundTopShape(w, h, 9), d, c.stone, { bevel: 0.02, ...so(c) }).pop();
  // volute laterali (spalle) e finale a urna
  for (const sx of [-1, 1]) lp.blob(sx * w * 0.5, y0 + h - w * 0.5, 0, 0.09, 0.09, 0.11, c.stone, { detail: 1, jitter: 0.008, ...so(c) });
  lp.lathe(0, y0 + h - 0.02, 0, [[0.0, 0], [0.07, 0], [0.09, 0.05], [0.06, 0.12], [0.04, 0.15], [0.05, 0.17], [0, 0.2]], 7, c.stone, so(c));
  // lesene incise e epigrafe
  for (const sx of [-1, 1]) lp.box(sx * w * 0.36, y0 + 0.08, d / 2, 0.025, h * 0.62, 0.012, c.dark, { jitter: 0, ao: 0 });
  inscription(lp, 0, y0 + h * 0.62, d / 2 + 0.006, [w * 0.42, w * 0.5, w * 0.36, w * 0.28]);
  lp.blob(0, y0 + h * 0.28, d / 2 + 0.01, 0.07, 0.07, 0.02, c.dark, { jitter: 0 });
  return { w: w + 0.2, h: y0 + h + 0.2, d, face: d / 2 };
}

// ── Famiglia 3: gotica a sesto acuto ─────────────────────────────────────
function gothic(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const w = 0.82 + r.next() * 0.16, h = 1.15 + r.next() * 0.25, d = 0.17;
  const dark = c.dark;
  const y0 = plinth(c, w + 0.3, 0.44, 2);
  lp.push([0, y0, 0]).extrude(gothicArchShape(w, h, 5, 0, 0.95), d, dark, { bevel: 0.016, ...so(c) }).pop();
  // nicchia ad arco più scura e lastra interna con epigrafe
  lp.push([0, y0 + 0.1, d / 2 + 0.002]).plate(gothicArchShape(w * 0.66, h * 0.72, 5, 0, 0.95), 0.01, LPC.charcoal, { ao: 0 }).pop();
  lp.push([0, y0 + 0.14, d / 2 + 0.006]).plate(gothicArchShape(w * 0.56, h * 0.6, 5, 0, 0.95), 0.012, c.stone, { ao: 0, vary: 0.04 }).pop();
  inscription(lp, 0, y0 + h * 0.4, d / 2 + 0.022, [w * 0.3, w * 0.36, w * 0.24]);
  // pinnacoli laterali con cuspide
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 + 0.035);
    lp.box(x, y0, 0, 0.1, h * 0.72, d + 0.06, c.stone, { bevel: 0.012, ...so(c) });
    lp.cyl(x, y0 + h * 0.72, 0, 0.075, 0, 0.2, 4, c.stone, so(c, { jitter: 0.004 }));
  }
  // finale in cima (croce o sfera)
  if (r.chance(0.5)) {
    lp.box(0, y0 + h - 0.02, 0, 0.04, 0.18, 0.04, dark, { jitter: 0 });
    lp.box(0, y0 + h + 0.09, 0, 0.13, 0.035, 0.04, dark, { jitter: 0 });
  } else lp.blob(0, y0 + h + 0.04, 0, 0.055, 0.055, 0.055, c.stone, { detail: 1, jitter: 0.004 });
  // teschio in rilievo alla base
  if (r.chance(0.55)) {
    lp.blob(0, y0 + 0.24, d / 2 + 0.03, 0.07, 0.065, 0.05, LPC.boneDark, { detail: 1, jitter: 0.006 });
    for (const sx of [-1, 1]) lp.blob(sx * 0.025, y0 + 0.25, d / 2 + 0.075, 0.016, 0.018, 0.01, LPC.charcoal, { jitter: 0 });
  }
  return { w: w + 0.2, h: y0 + h + 0.18, d, face: d / 2 + 0.02 };
}

// ── Famiglia 4: croci ────────────────────────────────────────────────────
function crossShape(armW: number, stemH: number, armSpan: number, armY: number): THREE.Shape {
  const s = new THREE.Shape();
  const a = armW / 2, sp = armSpan / 2;
  s.moveTo(-a, 0); s.lineTo(a, 0); s.lineTo(a, armY - a); s.lineTo(sp, armY - a); s.lineTo(sp, armY + a);
  s.lineTo(a, armY + a); s.lineTo(a, stemH); s.lineTo(-a, stemH); s.lineTo(-a, armY + a); s.lineTo(-sp, armY + a);
  s.lineTo(-sp, armY - a); s.lineTo(-a, armY - a); s.closePath();
  return s;
}

function celtic(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const stem = 1.35 + r.next() * 0.2, arm = 0.17, span = 0.72, armY = stem - 0.3, d = 0.15;
  const y0 = plinth(c, 0.62, 0.44, 3);
  lp.push([0, y0, 0]).extrude(crossShape(arm, stem, span, armY), d, c.stone, { bevel: 0.016, ...so(c) }).pop();
  // anello celtico: corona circolare estrusa (con foro)
  const ring = new THREE.Shape();
  const ro = 0.27, ri = 0.2, seg = 10;
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; if (i === 0) ring.moveTo(Math.cos(a) * ro, Math.sin(a) * ro); else ring.lineTo(Math.cos(a) * ro, Math.sin(a) * ro); }
  ring.closePath();
  const hole = new THREE.Path();
  for (let i = seg - 1; i >= 0; i--) { const a = (i / seg) * Math.PI * 2; if (i === seg - 1) hole.moveTo(Math.cos(a) * ri, Math.sin(a) * ri); else hole.lineTo(Math.cos(a) * ri, Math.sin(a) * ri); }
  hole.closePath();
  ring.holes.push(hole);
  lp.push([0, y0 + armY, 0]).extrude(ring, d * 0.8, LPC.stoneLight, { bevel: 0.01, ...so(c) }).pop();
  // nodo centrale e intrecci incisi lungo il fusto
  lp.blob(0, y0 + armY, d / 2 + 0.01, 0.05, 0.05, 0.025, c.dark, { detail: 1, jitter: 0 });
  for (let i = 0; i < 4; i++) lp.box(0, y0 + 0.15 + i * 0.16, d / 2 + 0.004, 0.08, 0.035, 0.01, c.dark, { jitter: 0, ao: 0 });
  return { w: 0.75, h: y0 + stem, d, face: d / 2 };
}

function marbleCross(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const stem = 1.45 + r.next() * 0.2, arm = 0.13, span = 0.62, armY = stem - 0.36, d = 0.13;
  const y0 = plinth(c, 0.78, 0.5, 3);
  lp.push([0, y0, 0]).extrude(crossShape(arm, stem, span, armY), d, LPC.marble, { bevel: 0.012, vary: 0.04, ao: 0.15, ...(c.dirty ? { topTint: LPC.moss, topAmount: 0.5 } : {}) }).pop();
  // targa sul basamento
  lp.box(0, 0.06, 0.25, 0.42, 0.11, 0.012, LPC.stoneLight, { jitter: 0, ao: 0 });
  inscription(lp, 0, 0.13, 0.258, [0.28, 0.2]);
  return { w: 0.78, h: y0 + stem, d, face: d / 2 };
}

// ── Famiglia 5: monumenti su piedistallo ─────────────────────────────────
function pedestal(c: Ctx, w: number, h: number): number {
  const { lp } = c;
  const y0 = plinth(c, w + 0.3, w + 0.3, 2);
  lp.box(0, y0, 0, w, 0.06, w, c.stone, { bevel: 0.012, ...so(c) });
  lp.box(0, y0 + 0.06, 0, w * 0.84, h, w * 0.84, c.stone, { bevel: 0.02, ...so(c) });
  lp.box(0, y0 + 0.06 + h, 0, w, 0.07, w, c.stone, { bevel: 0.012, ...so(c) });
  // targa frontale
  lp.box(0, y0 + 0.06 + h * 0.2, w * 0.42 + 0.004, w * 0.6, h * 0.55, 0.012, c.dark, { jitter: 0, ao: 0 });
  inscription(lp, 0, y0 + 0.06 + h * 0.62, w * 0.42 + 0.012, [w * 0.36, w * 0.42, w * 0.3], LPC.stoneLight);
  return y0 + 0.13 + h;
}

function monument(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const w = 0.6 + r.next() * 0.08;
  const top = pedestal(c, w, 0.62 + r.next() * 0.12);
  // colonnine angolari
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lp.cyl(sx * w * 0.42, top - 0.69, sz * w * 0.42, 0.035, 0.035, 0.6, 6, LPC.stoneLight, so(c));
  // urna velata
  lp.lathe(0, top, 0, [[0, 0], [0.12, 0], [0.13, 0.03], [0.08, 0.06], [0.16, 0.18], [0.17, 0.26], [0.12, 0.34], [0.07, 0.37], [0.09, 0.4], [0.03, 0.44], [0, 0.46]], 9, c.stone, so(c));
  lp.push([0, top + 0.27, 0], 0.4).add(new THREE.TorusGeometry(0.15, 0.02, 3, 9).rotateX(Math.PI / 2), LPC.stoneLight, { jitter: 0.004 }).pop();
  return { w: w + 0.3, h: top + 0.46, d: w, face: w * 0.42 };
}

function obelisk(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const w = 0.56;
  const top = pedestal(c, w, 0.38);
  const h = 1.3 + r.next() * 0.25;
  lp.push([0, top, 0], Math.PI / 4).cyl(0, 0, 0, 0.26, 0.17, h, 4, LPC.stoneLight, so(c, { jitter: 0.006 })).pop();
  lp.push([0, top + h, 0], Math.PI / 4).cyl(0, 0, 0, 0.17, 0, 0.16, 4, LPC.stoneLight, so(c, { jitter: 0.003 })).pop();
  // stella/sole inciso
  lp.blob(0, top + h * 0.7, 0.155, 0.05, 0.05, 0.012, c.dark, { jitter: 0 });
  return { w: w + 0.3, h: top + h + 0.16, d: w, face: w * 0.42 };
}

function angel(c: Ctx): Dims {
  const { lp } = c;
  const r = lp.rng;
  const w = 0.62;
  const top = pedestal(c, w, 0.48);
  const robe = LPC.marble;
  const o = { vary: 0.05, ao: 0.2, ...(c.dirty ? { topTint: LPC.moss, topAmount: 0.45 } : {}) };
  // veste a campana, busto, testa china
  lp.lathe(0, top, 0, [[0.2, 0], [0.19, 0.18], [0.14, 0.42], [0.1, 0.55], [0.12, 0.6], [0.05, 0.64], [0, 0.64]], 8, robe, o);
  lp.blob(0, top + 0.7, 0.02, 0.075, 0.085, 0.075, robe, { detail: 1, jitter: 0.006, ...o });
  // braccia giunte in preghiera
  for (const sx of [-1, 1]) lp.push([sx * 0.09, top + 0.55, 0.06], 0, -0.9, sx * 0.25).cyl(0, -0.2, 0, 0.035, 0.03, 0.22, 5, robe, o).pop();
  lp.blob(0, top + 0.46, 0.15, 0.04, 0.06, 0.035, robe, { jitter: 0 });
  // ali: profilo a piume estruso e inclinato all'indietro
  const wing = new THREE.Shape();
  wing.moveTo(0, 0); wing.lineTo(0.12, 0.28); wing.lineTo(0.3, 0.52); wing.lineTo(0.42, 0.6); wing.lineTo(0.36, 0.42);
  wing.lineTo(0.38, 0.3); wing.lineTo(0.3, 0.2); wing.lineTo(0.28, 0.08); wing.lineTo(0.16, 0.02); wing.closePath();
  for (const sx of [-1, 1]) {
    lp.push([sx * 0.07, top + 0.22, -0.1], sx * 0.55 + Math.PI / 2 * (sx < 0 ? 0 : 0), 0.25, 0, [sx, 1, 1]);
    lp.extrude(wing, 0.04, LPC.bone, { bevel: 0.008, ...o });
    lp.pop();
  }
  if (r.chance(0.5)) lp.add(new THREE.TorusGeometry(0.07, 0.008, 3, 10).rotateX(Math.PI / 2).translate(0, top + 0.83, 0), LPC.gold, { jitter: 0 });
  return { w: w + 0.3, h: top + 0.9, d: w, face: w * 0.42 };
}

const FAMILY: Record<GraveType, (c: Ctx) => Dims> = {
  rectangular, family_memorial: familyMemorial,
  stone_simple: rounded, victorian,
  gothic,
  celtic_cross: celtic, marble_cross: marbleCross,
  decorated_monument: monument, obelisk, angel,
};

/** Lapide completa con tumulo, cordolo e decorazioni dello stato. */
export function lowpolyGrave(type: GraveType, state: GraveVisualState, seed: number): LPModel {
  const lp = new LP(`lpgrave:${type}:${seed}`);
  const r = lp.rng;
  const dirty = state === 'dirty' || state === 'broken';
  const broken = state === 'broken';
  const tone = r.pick([LPC.stone, LPC.stone, LPC.stoneWarm, '#6e6f72']);
  const c: Ctx = { lp, stone: aged(tone, dirty), dark: aged(LPC.stoneDark, dirty, 0.15), dirty, broken };

  // ── Tumulo e cordolo ─────────────────────────────────────────────
  const mound = dirty ? LPC.soilDark : LPC.soil;
  lp.blob(0, 0.0, 0.32, 0.5, 0.11, 0.56, mound, { detail: 1, jitter: 0.03, vary: 0.12, ao: 0, ...(dirty ? {} : { topTint: LPC.grass, topAmount: 0.75 }) });
  const kerbColor = aged(r.pick([LPC.stoneWarm, LPC.stone, '#7b7770']), dirty);
  const kerb = (x: number, z: number, w: number, d: number) => {
    if (broken && r.chance(0.35)) return;
    const tilt = dirty ? r.range(-0.08, 0.08) : 0;
    lp.push([x, 0, z], tilt * 0.5, tilt, -tilt).box(0, -0.03, 0, w - 0.02, 0.1, d, kerbColor, { bevel: 0.02, vary: 0.12, ao: 0.35, ...(dirty ? { topTint: LPC.moss, topAmount: 0.35 } : {}) }).pop();
  };
  for (let i = 0; i < 3; i++) { kerb(-0.42 + i * 0.42, -0.24, 0.4, 0.09); kerb(-0.42 + i * 0.42, 0.9, 0.4, 0.09); }
  for (let i = 0; i < 3; i++) { kerb(-0.62, -0.06 + i * 0.4, 0.09, 0.38); kerb(0.62, -0.06 + i * 0.4, 0.09, 0.38); }

  // ── Lapide (inclinata e scheggiata se rotta) ────────────────────────
  const tiltZ = broken ? r.pick([-1, 1]) * r.range(0.12, 0.2) : r.range(-0.015, 0.015);
  const tiltX = broken ? r.range(0.1, 0.18) : r.range(-0.02, 0.02);
  lp.push([r.range(-0.04, 0.04), 0, STONE_Z], r.range(-0.04, 0.04), tiltX, tiltZ);
  const dims = FAMILY[type](c);
  if (dirty) {
    for (let i = 0; i < (broken ? 6 : 4); i++) moss(lp, r.range(-dims.w / 2, dims.w / 2) * 0.8, r.range(0.05, Math.min(dims.h, 0.9) * 0.6), dims.face + 0.005, 0.05 + r.next() * 0.04);
    for (let i = 0; i < 3; i++) moss(lp, r.range(-dims.w / 2, dims.w / 2) * 0.7, 0.1, r.range(-0.15, 0.15), 0.07, LPC.mossBright);
  }
  if (broken) {
    crack(lp, r.range(-0.12, 0.12), dims.h * 0.8, dims.face + 0.01, dims.h * 0.55);
    if (r.chance(0.6)) crack(lp, r.range(-0.25, 0.25), dims.h * 0.5, dims.face + 0.01, dims.h * 0.3);
  }
  lp.pop();

  // ── Stato ──────────────────────────────────────────────────────────
  if (broken) {
    // frammento caduto e calcinacci
    lp.push([r.pick([-0.72, 0.72]), 0.05, -0.2], r.range(0, 3), 0.3, 0.6).box(0, -0.05, 0, 0.22, 0.12, 0.16, c.stone, { bevel: 0.015, ...so(c) }).pop();
    pebbles(lp, -0.9, -0.9, 0.9, 0.2, 7);
  }
  if (state === 'flowers') {
    vase(lp, -0.28, -0.22, 0.02, LPC.stoneLight);
    if (r.chance(0.7)) vase(lp, 0.3, -0.24, 0.02, '#7d6a4a');
    wreath(lp, r.range(-0.15, 0.15), 0.32, STONE_Z + dims.face + 0.06, -0.28);
    bouquet(lp, r.range(-0.15, 0.15), 0.08, 0.42, 1.1);
    candle(lp, 0.42, 0.04, 0.05, true, 0.12);
    graveLight(lp, -0.42, 0.04, 0.08, true);
  } else if (dirty) {
    for (let i = 0; i < (broken ? 9 : 6); i++) weeds(lp, r.range(-0.8, 0.8), r.range(-0.9, 0.95), 0.8 + r.next() * 0.4);
    deadLeaves(lp, -0.9, -0.95, 0.9, 0.95, broken ? 26 : 18, 0.03);
    if (r.chance(0.6)) { // lumino spento e rovesciato
      lp.push([0.4, 0.04, 0.1], 0, 0, 1.4);
      graveLight(lp, 0, 0, 0, false);
      lp.pop();
    }
  } else {
    // pulita: erba curata ai lati e un lumino acceso o spento
    if (r.chance(0.6)) graveLight(lp, 0.38, 0.04, -0.2, r.chance(0.5));
  }
  // erba fine attorno a lapide e tumulo (più rada se pulita)
  const tufts = dirty ? 6 : 3;
  for (let i = 0; i < tufts; i++) {
    const a = r.range(0, Math.PI * 2);
    grassTuft(lp, Math.cos(a) * r.range(0.68, 0.92), 0.3 + Math.sin(a) * r.range(0.7, 0.95) * 0.75, 0.8 + r.next() * 0.4);
  }
  return lp.build();
}
