// Casetta infestata: tre varianti del villaggio nel lotto compatto.
import * as THREE from 'three';
import { wallIvy, wallBat } from './villageDecorations.ts';
import { LPC } from './palette.ts';
import { gableRoof, frontGable } from './architecture.ts';
import { hangingLantern } from './details.ts';
import { irregularShape, roundTopShape } from './kit.ts';
import { beam, block, dim, emit, prof, turned, type CryptCtx } from './cryptKit.ts';

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

export function hauntedHouse(c: CryptCtx) {
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
