// Natura low-poly: sentieri (pietre poligonali irregolari), alberi morti e
// pini, cespugli, erba alta, funghi, aiuole, stagno, e la scenografia di
// contorno (ciuffi, fiori, foglie, felci, rocce) usata in grandi quantità.

import * as THREE from 'three';
import { LP, irregularShape, type LPModel } from './kit.ts';
import { deadLeaves, flower, grassTuft, moss, pebbles, weeds } from './details.ts';
import { GRASS, GRASS_DRY, LPC } from './palette.ts';
import type { PVis } from '../models/types.ts';

// ── Sentieri ─────────────────────────────────────────────────────────────

/** Selciato: 5-8 pietre poligonali irregolari, spessori e grigi diversi. */
/**
 * Selciato: griglia sfalsata 4×4 di pietre poligonali irregolari, ben
 * rilevate (4-7 cm), leggermente inclinate, con sommità più chiare dei
 * fianchi e fughe strette di terra e muschio.
 */
export function pathStone(v: PVis): LPModel {
  const lp = new LP(`lp:path:${v.seed}:${v.dirty}${v.broken}`);
  const r = lp.rng;
  const tones = [LPC.stone, '#5d6168', '#727069', LPC.stoneWarm, '#666660', '#7d7a74', '#575a60'];
  const P = 0.25;
  for (let j = 0; j < 4; j++) {
    const shift = j % 2 ? P * 0.35 : -P * 0.15; // file sfalsate come un vero acciottolato
    for (let i = 0; i < 4; i++) {
      if (r.chance(v.broken ? 0.3 : 0.06)) continue;
      const x = -0.375 + i * P + shift + r.range(-0.03, 0.03), z = -0.375 + j * P + r.range(-0.03, 0.03);
      if (Math.abs(x) > 0.47) continue;
      const t = 0.04 + r.next() * 0.03;
      lp.push([x, t / 2 - 0.008, z], r.range(0, 6.28), -Math.PI / 2 + r.range(-0.06, 0.06), r.range(-0.06, 0.06));
      lp.extrude(irregularShape(r, 0.1 + r.next() * 0.03, 5 + r.int(3), 0.8 + r.next() * 0.3), t, r.pick(tones), {
        bevel: 0.012, vary: 0.05, ao: 0.35, curve: 1,
        topTint: v.dirty ? LPC.moss : '#8f8c86', topAmount: v.dirty ? 0.45 : 0.3,
      });
      lp.pop();
    }
  }
  // fughe: muschio, fili d'erba e qualche sassolino
  for (let i = 0; i < 3 + r.int(3); i++) moss(lp, r.range(-0.42, 0.42), 0.004, r.range(-0.42, 0.42), 0.03, r.chance(0.5) ? LPC.moss : LPC.grass);
  if (r.chance(0.6)) grassTuft(lp, r.range(-0.4, 0.4), r.range(-0.4, 0.4), 0.55, GRASS, 4);
  if (v.dirty) { weeds(lp, r.range(-0.3, 0.3), r.range(-0.3, 0.3), 0.7); deadLeaves(lp, -0.45, -0.45, 0.45, 0.45, 6); }
  return lp.build();
}

export function pathDirt(v: PVis): LPModel {
  const lp = new LP(`lp:pathdirt:${v.seed}:${v.dirty}`);
  const r = lp.rng;
  lp.push([0, -0.03, 0], r.range(0, 6.28), -Math.PI / 2).extrude(irregularShape(r, 0.5, 8, 0.95), 0.045, LPC.soil, { vary: 0.08, ao: 0, curve: 1 }).pop();
  pebbles(lp, -0.4, -0.4, 0.4, 0.4, 4);
  if (v.dirty) weeds(lp, r.range(-0.3, 0.3), r.range(-0.3, 0.3), 0.7);
  return lp.build();
}

// ── Dettagli della natura ────────────────────────────────────────────────

/** Chioma a ciuffi: 3 blob in due toni più qualche foglia che sporge. */
function leafCluster(lp: LP, x: number, y: number, z: number, size: number, palette: readonly string[]) {
  const r = lp.rng;
  const base = r.pick(palette);
  lp.blob(x, y, z, size, size * 0.75, size, base, { vary: 0.14, ao: 0.25, jitter: size * 0.25 });
  for (let i = 0; i < 2; i++) {
    const a = r.range(0, Math.PI * 2);
    lp.blob(x + Math.cos(a) * size * 0.6, y + r.range(-0.02, size * 0.4), z + Math.sin(a) * size * 0.6, size * 0.6, size * 0.5, size * 0.6, r.pick(palette), { vary: 0.14, ao: 0.15, jitter: size * 0.2 });
  }
  for (let i = 0; i < 3; i++) {
    const a = r.range(0, Math.PI * 2);
    lp.push([x + Math.cos(a) * size * 0.95, y + r.range(-0.05, 0.08), z + Math.sin(a) * size * 0.95], -a, r.range(-0.4, 0.4), 0.4)
      .blob(0, 0, 0, size * 0.28, 0.012, size * 0.16, base, { jitter: 0, vary: 0.12, ao: 0 }).pop();
  }
}

/** Fungo a mensola sul tronco (lato +z locale). */
function bracketFungus(lp: LP, x: number, y: number, z: number, yaw: number, s = 1) {
  lp.push([x, y, z], yaw);
  for (let i = 0; i < 2; i++) {
    lp.push([0, -i * 0.07 * s, 0.01], 0, 0, 0, [1, 1, 1]);
    lp.add(new THREE.CylinderGeometry(0.07 * s * (1 - i * 0.25), 0.075 * s * (1 - i * 0.25), 0.025 * s, 8, 1, false, -Math.PI / 2, Math.PI), i ? '#c98f52' : '#d9b07a', { jitter: 0, vary: 0.08, ao: 0 });
    lp.pop();
  }
  lp.pop();
}

/** Lettiera alla base: foglie secche, muschio, sassolini, funghetti. */
function treeBase(lp: LP, radius: number, needles = false) {
  const r = lp.rng;
  if (needles) lp.push([0, 0.004, 0], r.range(0, 6), -Math.PI / 2).plate(irregularShape(r, radius, 9), 0.006, '#3f3a2a', { ao: 0, vary: 0.1 }).pop();
  else deadLeaves(lp, -radius, -radius, radius, radius, 7);
  for (let i = 0; i < 3; i++) { const a = r.range(0, 6.28); moss(lp, Math.cos(a) * radius * 0.5, 0.02, Math.sin(a) * radius * 0.5, 0.09); }
  pebbles(lp, -radius, -radius, radius, radius, 2);
  for (let i = 0; i < 2; i++) { const a = r.range(0, 6.28); mushroom(lp, Math.cos(a) * radius * 0.6, Math.sin(a) * radius * 0.6, 0.05 + r.next() * 0.04, r.pick([LPC.red, '#9a6a44', '#c9a27a'])); }
}

// ── Alberi ───────────────────────────────────────────────────────────────

/** Ramo affusolato ricorsivo; alle punte (se richiesto) ciuffi di foglie. */
function branch(lp: LP, len: number, r0: number, depth: number, foliage: string[] | null, tips: number) {
  const r = lp.rng;
  lp.cyl(0, 0, 0, r0, r0 * 0.62, len, 5, LPC.woodDark, { vary: 0.1, ao: 0.1, jitter: r0 * 0.25 });
  if (depth <= 0) {
    if (foliage && r.chance(tips)) leafCluster(lp, 0, len + 0.05, 0, 0.17 + r.next() * 0.08, foliage);
    else if (r.chance(0.5)) for (const s of [-1, 1]) lp.push([0, len * 0.9, 0], s * 1.2, 0.6).cyl(0, 0, 0, r0 * 0.4, 0.002, len * 0.35, 3, LPC.woodDark, { jitter: 0 }).pop(); // rametti secchi
    return;
  }
  const kids = 2 + (r.chance(0.4) ? 1 : 0);
  for (let i = 0; i < kids; i++) {
    lp.push([0, len * r.range(0.75, 0.98), 0], r.range(0, Math.PI * 2), r.range(0.45, 0.85));
    branch(lp, len * r.range(0.58, 0.78), r0 * 0.62, depth - 1, foliage, tips);
    lp.pop();
  }
}

/**
 * Albero morto contorto; in autunno conserva qualche chioma. Dettagli:
 * corteccia a strisce, funghi a mensola, nodi, cavità (a volte con due
 * occhietti luminosi), edera, lettiera di foglie, muschio e funghetti.
 */
export function deadTreeLP(seed: number, autumn = true, scale = 1): LPModel {
  const lp = new LP(`lp:deadtree:${seed}:${autumn}`);
  const r = lp.rng;
  lp.push([0, 0, 0], 0, 0, 0, scale);
  treeBase(lp, 0.55);
  // radici divaricate
  for (let i = 0; i < 5; i++) {
    lp.push([0, 0.08, 0], (i / 5) * Math.PI * 2 + r.range(-0.3, 0.3), 1.25).cyl(0, 0, 0, 0.09, 0.02, 0.42, 4, LPC.woodDark, { vary: 0.1, topTint: LPC.moss, topAmount: 0.3 }).pop();
  }
  // tronco a segmenti leggermente piegati, con strisce di corteccia
  let y = 0;
  const segs = 3;
  const lean = r.range(-0.18, 0.18);
  for (let i = 0; i < segs; i++) {
    const h = 0.55 + r.next() * 0.15;
    const r0 = 0.17 - i * 0.04;
    lp.push([0, y, 0], r.range(-0.3, 0.3), lean * (i + 1) * 0.5);
    lp.cyl(0, 0, 0, r0, r0 - 0.04, h, 6, i === 0 ? LPC.woodDark : '#55402f', { vary: 0.12, ao: 0.2, jitter: 0.02 });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + r.next();
      lp.push([Math.cos(a) * (r0 - 0.02), h * 0.2, Math.sin(a) * (r0 - 0.02)], -a).box(0, 0, 0, 0.025, h * 0.6, 0.02, '#3a2c22', { jitter: 0.004, ao: 0 }).pop();
    }
    lp.pop();
    y += h * 0.96;
  }
  // funghi a mensola e nodi
  for (let i = 0; i < 2 + r.int(2); i++) bracketFungus(lp, 0, 0.25 + i * 0.28, 0, r.range(0, 6.28) + i * 2, 1 - i * 0.15);
  for (let i = 0; i < 2; i++) { const a = r.range(0, 6.28); lp.blob(Math.cos(a) * 0.14, 0.7 + i * 0.4, Math.sin(a) * 0.14, 0.05, 0.06, 0.05, '#3a2c22', { jitter: 0.01 }); }
  // cavità; in un albero su tre ci abita qualcuno
  lp.blob(0.0, 0.45, 0.15, 0.06, 0.09, 0.025, LPC.charcoal, { jitter: 0 });
  if (seed % 3 === 0) for (const s of [-1, 1]) lp.blob(s * 0.022, 0.47, 0.17, 0.012, 0.014, 0.006, '#ffd36a', { bucket: 'glow', jitter: 0 });
  if (seed % 2 === 1) for (let i = 0; i < 6; i++) lp.push([0.05 * Math.sin(i), 0.12 + i * 0.16, 0.15], 0, 0, 0.3 * Math.sin(i * 1.7)).blob(0, 0, 0.015, 0.045, 0.03, 0.02, i % 2 ? LPC.leaf : '#56703d', { jitter: 0.006 }).pop();
  lp.push([Math.sin(lean) * 0.3, y, 0], 0, 0, lean);
  const foliage = autumn ? [...LPC.leafAutumn] : null;
  for (let i = 0; i < 3; i++) {
    lp.push([0, -0.1 * i, 0], (i / 3) * Math.PI * 2 + r.range(-0.4, 0.4), r.range(0.35, 0.7));
    branch(lp, 0.55 + r.next() * 0.2, 0.06, 2, foliage, 0.55);
    lp.pop();
  }
  lp.pop();
  lp.pop();
  return lp.build();
}

/**
 * Pino a palchi: ogni palco ha un cono esterno scuro e uno interno più
 * chiaro con punte irregolari, pigne appese, corteccia, lettiera di aghi e
 * pigne a terra. `half` = mezzo secco con palchi mancanti.
 */
export function pineLP(seed: number, half = false, scale = 1): LPModel {
  const lp = new LP(`lp:pine:${seed}:${half}`);
  const r = lp.rng;
  lp.push([0, 0, 0], 0, 0, 0, scale);
  treeBase(lp, 0.55, true);
  for (let i = 0; i < 3; i++) { const a = r.range(0, 6.28), d = r.range(0.3, 0.7); lp.push([Math.cos(a) * d, 0.03, Math.sin(a) * d], r.range(0, 6), 1.4).lathe(0, -0.04, 0, [[0, 0], [0.03, 0.02], [0.028, 0.06], [0, 0.08]], 6, '#6b4e38', { jitter: 0 }).pop(); }
  const h = 2.2 + r.next() * 0.6;
  lp.cyl(0, 0, 0, 0.13, 0.05, h * 0.9, 6, LPC.woodDark, { vary: 0.1 });
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; lp.push([Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1], -a).box(0, 0, 0, 0.03, 0.45, 0.02, '#3a2c22', { jitter: 0.004, ao: 0 }).pop(); }
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const y = 0.45 + t * (h - 0.7);
    const rad = (0.85 - t * 0.6) * (0.9 + r.next() * 0.2);
    const dry = half && (i === 1 || (i === 3 && r.chance(0.5)));
    if (half && i === 2 && r.chance(0.6)) {
      for (let k = 0; k < 4; k++) lp.push([0, y + 0.1, 0], r.range(0, 6.28), 1.3).cyl(0, 0, 0, 0.025, 0.01, rad * 0.8, 3, LPC.woodDark, { jitter: 0.01 }).pop();
      continue;
    }
    const outer = dry ? r.pick([LPC.dryDark, '#6a5a3a', '#5e5434']) : r.pick([LPC.pineDark, '#2b3f30']);
    const inner = dry ? '#7a6a44' : r.pick([LPC.pine, '#3d5a40', '#46613f']);
    lp.push([0, y, 0], r.range(0, 1));
    lp.cyl(0, 0, 0, rad, rad * 0.12, 0.62 - t * 0.12, 9, outer, { vary: 0.1, ao: 0.35, jitter: 0.07 });
    lp.cyl(0, 0.1, 0, rad * 0.78, rad * 0.1, 0.55 - t * 0.1, 7, inner, { vary: 0.12, ao: 0.2, jitter: 0.05 });
    // punte dei rami che ricadono
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + r.next();
      lp.push([Math.cos(a) * rad * 0.8, 0.06, Math.sin(a) * rad * 0.8], -a, 0, -0.35).blob(0.04, 0, 0, 0.13, 0.035, 0.08, outer, { jitter: 0.012, vary: 0.1 }).pop();
    }
    if (!dry && r.chance(0.6)) lp.push([Math.cos(i * 2.1) * rad * 0.6, -0.02, Math.sin(i * 2.1) * rad * 0.6]).lathe(0, -0.09, 0, [[0, 0], [0.028, 0.02], [0.03, 0.06], [0.012, 0.09], [0, 0.095]], 6, '#6b4e38', { jitter: 0 }).pop();
    lp.pop();
  }
  lp.cyl(0, 0.45 + (h - 0.7), 0, 0.14, 0, 0.35, 5, half ? LPC.dryDark : LPC.pine, { vary: 0.1 });
  lp.pop();
  return lp.build();
}

/**
 * Cespugli (2×2): massa di fogliame in più toni con foglie che sporgono,
 * rametti, e un carattere per seme: bacche rosse, fiorellini, autunnale.
 */
export function bushesLP(v: PVis | { seed: number }): LPModel {
  const lp = new LP(`lp:bushes:${v.seed}`);
  const r = lp.rng;
  const kind = v.seed % 3;
  const greens = kind === 2 ? ['#5a5a32', '#6b5a30', '#4f5a36', '#7a5a2e'] : ['#3a5232', '#44593a', '#4f6640', '#334a2e', '#5a6a40'];
  deadLeaves(lp, -0.7, -0.7, 0.7, 0.7, 5);
  for (let i = 0; i < 6; i++) {
    const x = r.range(-0.55, 0.55), z = r.range(-0.55, 0.55), sz = 0.26 + r.next() * 0.16;
    leafCluster(lp, x, sz * 0.75, z, sz, greens);
  }
  for (let i = 0; i < 4; i++) lp.push([r.range(-0.5, 0.5), 0.3, r.range(-0.5, 0.5)], r.range(0, 6), r.range(0.3, 0.8)).cyl(0, 0, 0, 0.012, 0.003, 0.35, 3, LPC.woodDark, { jitter: 0 }).pop();
  if (kind === 0) for (let i = 0; i < 14; i++) lp.blob(r.range(-0.6, 0.6), r.range(0.3, 0.62), r.range(-0.6, 0.6), 0.03, 0.03, 0.03, r.chance(0.8) ? LPC.red : '#5a2a3a', { jitter: 0 });
  else if (kind === 1) for (let i = 0; i < 12; i++) {
    const x = r.range(-0.6, 0.6), y = r.range(0.35, 0.65), z = r.range(-0.6, 0.6), c = r.pick(['#e8e0d0', '#d9b3c8', '#c9a7d9']);
    for (let k = 0; k < 4; k++) lp.blob(x + Math.cos(k * 1.57) * 0.025, y, z + Math.sin(k * 1.57) * 0.025, 0.022, 0.012, 0.022, c, { jitter: 0, ao: 0 });
  }
  return lp.build();
}

/** Erba alta: ciuffi fitti, steli con spighe, qualche margherita e un soffione. */
export function tallGrassLP(v: PVis): LPModel {
  const lp = new LP(`lp:tallgrass:${v.seed}`);
  const r = lp.rng;
  for (let i = 0; i < 7; i++) grassTuft(lp, r.range(-0.38, 0.38), r.range(-0.38, 0.38), 2.0 + r.next() * 0.8, r.chance(0.5) ? GRASS_DRY : GRASS, 7);
  for (let i = 0; i < 6; i++) {
    const h = 0.35 + r.next() * 0.2;
    lp.push([r.range(-0.35, 0.35), 0, r.range(-0.35, 0.35)], r.range(0, 6), r.range(-0.25, 0.25));
    lp.cyl(0, 0, 0, 0.006, 0.004, h, 3, GRASS_DRY[1] ?? LPC.dry, { jitter: 0 });
    lp.blob(0, h + 0.04, 0, 0.018, 0.05, 0.018, LPC.dry, { jitter: 0 });
    lp.pop();
  }
  for (let i = 0; i < 3; i++) flower(lp, r.range(-0.3, 0.3), r.range(-0.3, 0.3), '#efe9dc', 0.18 + r.next() * 0.08);
  const dx = r.range(-0.2, 0.2), dz = r.range(-0.2, 0.2);
  lp.cyl(dx, 0, dz, 0.005, 0.004, 0.3, 3, LPC.leaf, { jitter: 0 });
  lp.blob(dx, 0.33, dz, 0.045, 0.045, 0.045, '#f2efe6', { detail: 1, jitter: 0.006 });
  return lp.build();
}

/** Fungo con gambo, lamelle scure sotto il cappello e puntini. */
function mushroom(lp: LP, x: number, z: number, h: number, cap: string, glow = false, w = 0.07) {
  lp.cyl(x, 0, z, w * 0.3, w * 0.22, h, 5, LPC.bone, { jitter: 0 });
  lp.cyl(x, h - 0.012, z, w * 0.9, w * 0.3, 0.012, 7, '#6b5a4a', { jitter: 0, ao: 0 });
  lp.lathe(x, h - 0.01, z, [[0.0, 0], [w, 0], [w * 0.93, w * 0.3], [w * 0.65, w * 0.6], [0, w * 0.72]], 7, cap, { bucket: glow ? 'glow' : 'solid', jitter: 0.004 });
  if (!glow) for (let i = 0; i < 4; i++) lp.blob(x + lp.rng.range(-w * 0.55, w * 0.55), h + w * 0.5, z + lp.rng.range(-w * 0.55, w * 0.55), w * 0.12, w * 0.07, w * 0.12, LPC.bone, { jitter: 0 });
}

/** Funghi velenosi (1×1): un'amanita grande, un ciuffo di sottili luminosi e un cerchio di funghetti. */
export function poisonShroomsLP(v: PVis): LPModel {
  const lp = new LP(`lp:shrooms:${v.seed}`);
  const r = lp.rng;
  moss(lp, 0, 0.005, 0, 0.3);
  deadLeaves(lp, -0.4, -0.4, 0.4, 0.4, 4);
  mushroom(lp, -0.08, -0.05, 0.26, '#a8322e', false, 0.15);
  mushroom(lp, 0.16, 0.1, 0.17, '#8e3a5a', false, 0.1);
  for (let i = 0; i < 4; i++) {
    const x = 0.2 + r.range(-0.08, 0.08), z = -0.18 + r.range(-0.08, 0.08), hh = 0.14 + r.next() * 0.14;
    lp.cyl(x, 0, z, 0.012, 0.01, hh, 4, '#cfd8c8', { jitter: 0 });
    lp.lathe(x, hh, z, [[0, 0], [0.035, 0], [0.025, 0.03], [0, 0.04]], 6, r.pick(['#b07ae0', '#9fe0d0']), { bucket: 'glow', jitter: 0 });
  }
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; mushroom(lp, Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.04 + r.next() * 0.03, r.pick(['#6f3f86', '#9b2f2f', '#c9a27a']), false, 0.035); }
  lp.light(0, 0.2, 0, '#b07ae0', 0.3, 1.8, 0.4, 0.5);
  return lp.build();
}

/** Aiuola: bordo di pietre, terra, fiori misti, digitali e tulipani, paletto con teschietto. */
export function flowerbedLP(v: PVis): LPModel {
  const lp = new LP(`lp:flowerbed:${v.seed}:${v.dirty}`);
  const r = lp.rng;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    lp.blob(Math.cos(a) * 0.78, 0.05, Math.sin(a) * 0.7, 0.11, 0.07, 0.09, r.pick([LPC.stone, LPC.stoneLight, LPC.stoneWarm]), { vary: 0.1, topTint: LPC.moss, topAmount: 0.25 });
  }
  lp.blob(0, 0.0, 0, 0.72, 0.08, 0.64, LPC.soil, { detail: 1, jitter: 0.02, vary: 0.1 });
  for (let i = 0; i < 14; i++) flower(lp, r.range(-0.55, 0.55), r.range(-0.48, 0.48), r.pick(LPC.flowers), 0.12 + r.next() * 0.1, 0.05);
  // digitali: spighe di campanelle
  for (let i = 0; i < 3; i++) {
    const x = r.range(-0.4, 0.4), z = r.range(-0.35, 0.35), c = r.pick(['#a77ab8', '#d9a0b8', '#e8e0d0']);
    lp.cyl(x, 0.05, z, 0.008, 0.005, 0.5, 3, LPC.leaf, { jitter: 0 });
    for (let k = 0; k < 6; k++) lp.blob(x + Math.cos(k * 2.4) * 0.025, 0.25 + k * 0.045, z + Math.sin(k * 2.4) * 0.025, 0.022 - k * 0.002, 0.028, 0.022 - k * 0.002, c, { jitter: 0 });
  }
  // tulipani
  for (let i = 0; i < 4; i++) {
    const x = r.range(-0.45, 0.45), z = r.range(-0.4, 0.4), c = r.pick(['#b8443c', '#d9a441', '#c96a8a']);
    lp.cyl(x, 0.05, z, 0.007, 0.006, 0.22, 3, LPC.leaf, { jitter: 0 });
    lp.lathe(x, 0.27, z, [[0, 0], [0.03, 0.01], [0.034, 0.05], [0.02, 0.07], [0, 0.06]], 6, c, { jitter: 0 });
  }
  for (let i = 0; i < 5; i++) grassTuft(lp, r.range(-0.5, 0.5), r.range(-0.45, 0.45), 0.8);
  // paletto da giardino con un teschietto sorridente
  lp.cyl(0.55, 0.0, 0.25, 0.012, 0.012, 0.42, 4, LPC.woodDark, { jitter: 0 });
  lp.blob(0.55, 0.47, 0.25, 0.05, 0.05, 0.05, LPC.bone, { detail: 1, jitter: 0 });
  for (const s of [-1, 1]) lp.blob(0.55 + s * 0.018, 0.48, 0.295, 0.012, 0.014, 0.006, LPC.charcoal, { jitter: 0 });
  if (v.dirty) weeds(lp, 0.3, -0.2, 1);
  return lp.build();
}

/** Lago con pesci morti: acqua irregolare, sponda di sassi, canne, ninfee. */
export function pondLP(v: PVis): LPModel {
  const lp = new LP(`lp:pond:${v.seed}:${v.dirty}`);
  const r = lp.rng;
  const water = new THREE.Shape();
  const n = 14;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 1 + Math.sin(a * 3 + 1) * 0.08 + r.range(-0.05, 0.05);
    pts.push([Math.cos(a) * 1.65 * rr, Math.sin(a) * 1.15 * rr]);
  }
  pts.forEach(([x, y], i) => (i ? water.lineTo(x, y) : water.moveTo(x, y)));
  water.closePath();
  // fondale scuro sotto un'acqua semitrasparente
  lp.push([0, -0.02, 0], 0, -Math.PI / 2).plate(water, 0.02, LPC.charcoal, { ao: 0 }).pop();
  lp.push([0, 0.035, 0], 0, -Math.PI / 2).plate(water, 0.01, v.dirty ? '#3a4a3a' : LPC.water, { bucket: 'water', vary: 0.04, ao: 0 }).pop();
  // sponda
  for (const [x, y] of pts) {
    lp.blob(x * 1.05, 0.06, -y * 1.05, 0.16 + r.next() * 0.1, 0.09, 0.14, r.pick([LPC.stone, LPC.stoneDark, LPC.stoneWarm]), { vary: 0.12, topTint: LPC.moss, topAmount: 0.35 });
    if (r.chance(0.3)) moss(lp, x * 1.12, 0.03, -y * 1.12, 0.1);
  }
  // canne e tife
  for (let i = 0; i < 9; i++) {
    const [x, y] = r.pick(pts);
    const h = 0.4 + r.next() * 0.35;
    lp.push([x * 0.88, 0, -y * 0.88], r.range(0, 6), r.range(-0.15, 0.15)).cyl(0, 0, 0, 0.012, 0.006, h, 3, LPC.dryDark, { jitter: 0 }).pop();
    if (r.chance(0.5)) lp.cyl(x * 0.88, h * 0.7, -y * 0.88, 0.022, 0.022, 0.1, 5, LPC.woodDark, { jitter: 0 });
  }
  // ninfee, pesci morti a pancia in su, rana e cerchi nell'acqua: parti animate (animated.ts)
  return lp.build();
}

// ── Scenografia (molte copie, poche varianti) ────────────────────────────

export function sceneryTuftLP(seed: number): LPModel {
  const lp = new LP(`lp:tuft:${seed}`);
  const r = lp.rng;
  for (let i = 0; i < 1 + r.int(2); i++) grassTuft(lp, r.range(-0.18, 0.18), r.range(-0.18, 0.18), 0.9 + r.next() * 0.4, seed === 4 ? GRASS_DRY : GRASS);
  return lp.build();
}

export function sceneryFlowersLP(seed: number): LPModel {
  const lp = new LP(`lp:flowers:${seed}`);
  const r = lp.rng;
  const col = LPC.flowers[seed % LPC.flowers.length];
  grassTuft(lp, 0, 0, 0.8);
  for (let i = 0; i < 3 + r.int(3); i++) flower(lp, r.range(-0.2, 0.2), r.range(-0.2, 0.2), r.chance(0.8) ? col : r.pick(LPC.flowers), 0.1 + r.next() * 0.08);
  return lp.build();
}

export function sceneryPebblesLP(seed: number): LPModel {
  const lp = new LP(`lp:pebbles:${seed}`);
  pebbles(lp, -0.25, -0.25, 0.25, 0.25, 3 + (seed % 3));
  return lp.build();
}

export function sceneryLeavesLP(seed: number): LPModel {
  const lp = new LP(`lp:leaves:${seed}`);
  deadLeaves(lp, -0.3, -0.3, 0.3, 0.3, 6 + seed);
  return lp.build();
}

export function sceneryShroomsLP(seed: number): LPModel {
  const lp = new LP(`lp:shroom:${seed}`);
  const r = lp.rng;
  for (let i = 0; i < 2 + r.int(3); i++) mushroom(lp, r.range(-0.15, 0.15), r.range(-0.15, 0.15), 0.04 + r.next() * 0.06, r.pick([LPC.red, '#9a6a44', '#7d5a3e']));
  return lp.build();
}

export function sceneryWildGrassLP(seed: number): LPModel {
  const lp = new LP(`lp:wgrass:${seed}`);
  const r = lp.rng;
  for (let i = 0; i < 2 + r.int(2); i++) grassTuft(lp, r.range(-0.22, 0.22), r.range(-0.22, 0.22), 1.3 + r.next() * 0.5, r.chance(0.5) ? GRASS_DRY : GRASS);
  return lp.build();
}

/** Felce: fronde arcuate a raggiera, ognuna con foglioline alternate. */
export function sceneryFernLP(seed: number): LPModel {
  const lp = new LP(`lp:fern:${seed}`);
  const r = lp.rng;
  const col = r.pick(['#3f5a32', '#4a6136', '#56703d', '#5b5a33']);
  const n = 6 + r.int(3);
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + r.range(-0.2, 0.2);
    const len = 0.32 + r.next() * 0.14;
    lp.push([0, 0.01, 0], yaw, 0.9 + r.next() * 0.3);
    lp.cyl(0, 0, 0, 0.008, 0.003, len, 3, col, { jitter: 0 });
    for (let k = 1; k < 6; k++) {
      const y = (k / 6) * len, w = 0.07 * (1 - k / 7);
      for (const s of [-1, 1]) lp.push([0, y, 0], 0, 0, s * 1.1).box(0, 0, 0, 0.012, w, 0.024, col, { jitter: 0, vary: 0.1 }).pop();
    }
    lp.pop();
  }
  return lp.build();
}

export function sceneryBushLP(seed: number): LPModel {
  const lp = new LP(`lp:bush:${seed}`);
  const r = lp.rng;
  const pal = ['#2f4529', '#3a5230', '#44502c', '#2b3a26', '#4a5f3a'];
  for (let i = 0; i < 2 + r.int(2); i++) {
    const sz = 0.16 + r.next() * 0.1;
    leafCluster(lp, r.range(-0.15, 0.15), sz * 0.8, r.range(-0.15, 0.15), sz, pal);
  }
  if (seed % 3 === 0) for (let i = 0; i < 6; i++) lp.blob(r.range(-0.22, 0.22), r.range(0.15, 0.32), r.range(-0.2, 0.25), 0.022, 0.022, 0.022, LPC.red, { jitter: 0 });
  else if (seed % 3 === 1) for (let i = 0; i < 5; i++) lp.blob(r.range(-0.22, 0.22), r.range(0.2, 0.34), r.range(-0.2, 0.25), 0.02, 0.012, 0.02, '#e8e0d0', { jitter: 0, ao: 0 });
  return lp.build();
}

export function sceneryRockLP(seed: number): LPModel {
  const lp = new LP(`lp:rock:${seed}`);
  const r = lp.rng;
  lp.blob(0, 0.12, 0, 0.35 + r.next() * 0.15, 0.25 + r.next() * 0.1, 0.3 + r.next() * 0.12, r.pick([LPC.stone, LPC.stoneDark, '#5a5d61']), { vary: 0.12, ao: 0.3, topTint: LPC.moss, topAmount: 0.5 });
  if (r.chance(0.6)) lp.blob(0.3, 0.06, 0.2, 0.15, 0.1, 0.13, LPC.stone, { vary: 0.12 });
  return lp.build();
}

