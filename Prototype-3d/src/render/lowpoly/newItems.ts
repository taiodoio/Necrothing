// Anteprima (non ancora nel gioco): nuovi oggetti sbloccabili nello stile
// low-poly — luci, decorazioni, il gazebo, il campanile, ambiente,
// stagionali e gli oggetti di scena di presenze ed extra. I personaggi
// (scheletri, fantasmi, vampiro, strega, gatti) sono rig separati.
// Tutti i modelli: fronte verso +z, centrati sull'ingombro, a terra su y = 0.

import * as THREE from 'three';
import { LP, type LPModel } from './kit.ts';
import { candle, cobweb, flower, grassTuft, pumpkin, weeds } from './details.ts';
import { skull } from './extras.ts';
import { LPC } from './palette.ts';

type V3 = [number, number, number];

/** Tubo dritto da a a b. */
function tube(lp: LP, a: V3, b: V3, r: number, color: string, seg = 6, r1 = r) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  lp.push(a, e.y, e.x, e.z).cyl(0, 0, 0, r, r1, d.length(), seg, color, { jitter: 0, ao: 0 }).pop();
}

/** Catenaria (corda che pende) da a a b, `sag` = quanto scende al centro; restituisce i punti. */
function rope(lp: LP, a: V3, b: V3, sag: number, r: number, color: string, n = 8): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t));
  }
  for (let i = 0; i < n; i++) tube(lp, pts[i].toArray() as V3, pts[i + 1].toArray() as V3, r, color, 4);
  return pts;
}

const glow = (lit: boolean, on: string, off = '#3c3a35') => (lit ? { color: on, bucket: 'glow' as const } : { color: off, bucket: 'solid' as const });

// ── Luci ────────────────────────────────────────────────────────────────

/** Ghirlanda di teschi luminosi tra due pali (3×1): da mettere sopra i sentieri. */
export function skullGarlandLP(lit = true): LPModel {
  const lp = new LP('new:garland');
  for (const x of [-1.3, 1.3]) {
    lp.cyl(x, 0, 0, 0.06, 0.05, 1.6, 6, LPC.woodDark, { vary: 0.1 });
    lp.cyl(x, 1.6, 0, 0.07, 0.0, 0.12, 6, LPC.iron, { jitter: 0 });
    lp.blob(x, 0.04, 0, 0.14, 0.05, 0.14, LPC.stoneDark, { vary: 0.1 });
  }
  const pts = rope(lp, [-1.28, 1.5, 0], [1.28, 1.5, 0], 0.32, 0.008, '#2a2420', 12);
  // teschietti appesi lungo la corda, con la luce dentro (orbite accese)
  for (let i = 1; i < pts.length - 1; i += 1) {
    const p = pts[i];
    lp.box(p.x, p.y - 0.06, p.z, 0.006, 0.06, 0.006, '#2a2420', { jitter: 0 });
    skull(lp, p.x, p.y - 0.2, p.z, 0.55, i % 3 === 0 ? '#d9c79a' : LPC.bone);
    if (lit) lp.blob(p.x, p.y - 0.14, p.z + 0.04, 0.035, 0.03, 0.02, i % 2 ? '#ffcf7a' : '#9ff0c0', { bucket: 'glow', jitter: 0 });
  }
  if (lit) { lp.light(-0.6, 1.2, 0.1, '#ffcf7a', 0.45, 3, 0.25, 0.5); lp.light(0.6, 1.2, 0.1, '#9ff0c0', 0.45, 3, 0.25, 0.5); }
  return lp.build();
}

/** Lucciole in barattolo su un ceppo (1×1): di notte il barattolo pulsa. */
export function fireflyJarLP(lit = true): LPModel {
  const lp = new LP('new:jar');
  lp.cyl(0, 0, 0, 0.24, 0.22, 0.32, 9, LPC.woodDark, { vary: 0.12, ao: 0.3 });
  lp.cyl(0, 0.32, 0, 0.22, 0.22, 0.02, 9, LPC.woodLight, { jitter: 0 });
  // barattolo di vetro (ghost = traslucido), tappo di stoffa legato con lo spago
  lp.lathe(0, 0.34, 0, [[0.0, 0], [0.13, 0], [0.15, 0.04], [0.15, 0.3], [0.11, 0.36], [0.1, 0.4], [0, 0.4]], 10, '#22302c', { bucket: 'ghost', jitter: 0 }); // vetro (additivo: tinta scura)
  lp.cyl(0, 0.72, 0, 0.12, 0.13, 0.04, 9, '#8a5a3a', { jitter: 0 });
  lp.blob(0, 0.78, 0, 0.13, 0.03, 0.13, '#a06a44', { jitter: 0.01 });
  lp.cyl(0, 0.7, 0, 0.115, 0.115, 0.015, 9, '#c9b79c', { jitter: 0 });
  const r = lp.rng;
  for (let i = 0; i < 9; i++) {
    const a = r.next() * Math.PI * 2, d = r.range(0.02, 0.1);
    lp.blob(Math.cos(a) * d, 0.42 + r.next() * 0.24, Math.sin(a) * d, 0.018, 0.018, 0.018, lit ? '#d8ff7a' : '#4a5a3a', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  }
  if (lit) lp.light(0, 0.75, 0.25, '#d8ff7a', 0.18, 1.8, 0.5, 0.8);
  grassTuft(lp, 0.22, 0.18, 0.7);
  return lp.build();
}

/** Candelabro gotico in ferro battuto con cinque candele (1×1). */
export function candelabraLP(lit = true): LPModel {
  const lp = new LP('new:candelabra');
  lp.cyl(0, 0, 0, 0.2, 0.16, 0.05, 6, LPC.iron, { jitter: 0 });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; tube(lp, [0, 0.05, 0], [Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17], 0.015, LPC.iron); }
  lp.lathe(0, 0.05, 0, [[0.035, 0], [0.025, 0.3], [0.05, 0.36], [0.022, 0.42], [0.022, 0.95], [0.045, 1.0], [0, 1.02]], 6, LPC.ironLight, { jitter: 0 });
  // bracci a ricciolo: due per lato e quello centrale più alto
  const tips: V3[] = [[0, 1.12, 0]];
  for (const s of [-1, 1]) for (const k of [1, 2]) {
    const x = s * 0.16 * k, y = 0.92 + (2 - k) * 0.1;
    tube(lp, [0, 0.75 + k * 0.05, 0], [x * 0.6, 0.72 + k * 0.03, 0], 0.013, LPC.iron);
    tube(lp, [x * 0.6, 0.72 + k * 0.03, 0], [x, y - 0.04, 0], 0.013, LPC.iron);
    lp.blob(x * 0.6, 0.7 + k * 0.03, 0, 0.025, 0.025, 0.025, LPC.iron, { jitter: 0 });
    tips.push([x, y, 0]);
  }
  tube(lp, [0, 1.0, 0], [0, 1.08, 0], 0.013, LPC.iron);
  for (const [x, y, z] of tips) {
    lp.cyl(x, y - 0.04, z, 0.04, 0.05, 0.03, 6, LPC.ironLight, { jitter: 0 });
    candle(lp, x, y - 0.01, z, lit, 0.1 + Math.abs(x) * 0.15);
  }
  if (lit) lp.light(0, 1.15, 0, LPC.flame, 0.9, 4.5, 0.3, 0.9);
  cobweb(lp, 0.16, 0.86, 0.01, 0.12);
  return lp.build();
}

/** Lanterna degli spiriti: colonnina di pietra con una fiamma azzurra (1×1). */
export function spiritLanternLP(lit = true): LPModel {
  const lp = new LP('new:spirit');
  lp.box(0, 0, 0, 0.42, 0.1, 0.42, LPC.stoneDark, { bevel: 0.015 });
  lp.box(0, 0.1, 0, 0.26, 0.62, 0.26, LPC.stone, { bevel: 0.02, vary: 0.08, topTint: LPC.moss, topAmount: 0.4 });
  lp.box(0, 0.72, 0, 0.36, 0.06, 0.36, LPC.stoneLight, { bevel: 0.012 });
  // gabbia di pietra a quattro pilastrini con il tettuccio a piramide
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(dx * 0.13, 0.78, dz * 0.13, 0.05, 0.3, 0.05, LPC.stone, { bevel: 0.008 });
  lp.push([0, 1.08, 0], Math.PI / 4).cyl(0, 0, 0, 0.27, 0.02, 0.24, 4, LPC.stoneDark, { jitter: 0.004 }).pop();
  lp.blob(0, 1.33, 0, 0.04, 0.04, 0.04, LPC.stoneLight, { jitter: 0 });
  // fiamma spettrale e qualche glifo inciso che si accende
  const g = glow(lit, '#8fd8ff', '#3a4650');
  lp.cyl(0, 0.82, 0, 0.07, 0.0, 0.2, 6, g.color, { bucket: g.bucket, jitter: 0 });
  lp.blob(0, 0.86, 0, 0.06, 0.05, 0.06, lit ? '#d8f4ff' : '#3a4650', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  for (const y of [0.3, 0.48]) lp.box(0, 0.1 + y, 0.131, 0.08, 0.02, 0.01, g.color, { bucket: g.bucket, jitter: 0 });
  lp.box(0, 0.52, 0.131, 0.02, 0.1, 0.01, g.color, { bucket: g.bucket, jitter: 0 });
  if (lit) lp.light(0, 0.92, 0, '#8fd8ff', 0.8, 4, 0.35, 1.1);
  return lp.build();
}

/** Lampione del Custode: lampione unico col cappello a tesa larga in cima (1×1). */
export function custodeLampLP(lit = true): LPModel {
  const lp = new LP('new:custodelamp');
  lp.cyl(0, 0, 0, 0.22, 0.18, 0.12, 8, LPC.stoneDark, { jitter: 0.005 });
  lp.lathe(0, 0.12, 0, [[0.07, 0], [0.05, 0.2], [0.035, 0.25], [0.035, 1.6], [0.05, 1.66], [0, 1.68]], 7, LPC.iron, { jitter: 0 });
  // targhetta con la pala e la lanterna incrociate
  lp.box(0, 0.62, 0.05, 0.16, 0.2, 0.02, LPC.gold, { bevel: 0.005 });
  tube(lp, [-0.05, 0.65, 0.065], [0.05, 0.77, 0.065], 0.008, LPC.iron);
  lp.box(0.04, 0.64, 0.065, 0.03, 0.04, 0.008, LPC.iron, { jitter: 0 });
  // gabbia della lanterna
  lp.box(0, 1.66, 0, 0.26, 0.04, 0.26, LPC.iron, { bevel: 0.006 });
  const gl = glow(lit, LPC.lantern);
  lp.box(0, 1.7, 0, 0.2, 0.3, 0.2, gl.color, { bucket: gl.bucket, jitter: 0 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(dx * 0.11, 1.7, dz * 0.11, 0.025, 0.3, 0.025, LPC.iron, { jitter: 0 });
  lp.box(0, 2.0, 0, 0.26, 0.03, 0.26, LPC.iron, { bevel: 0.006 });
  // il cappello del Custode: tesa larga, cupola, nastro
  lp.cyl(0, 2.03, 0, 0.36, 0.34, 0.035, 14, '#4a3326', { jitter: 0, vary: 0.06 });
  lp.lathe(0, 2.06, 0, [[0.17, 0], [0.17, 0.16], [0.14, 0.22], [0, 0.23]], 12, '#4a3326', { jitter: 0 });
  lp.cyl(0, 2.065, 0, 0.175, 0.175, 0.05, 12, '#a4473b', { jitter: 0 });
  if (lit) lp.light(0, 1.84, 0, LPC.lantern, 1, 5.5, 0.15, 1.1);
  return lp.build();
}

// ── Decorazioni ─────────────────────────────────────────────────────────

/** Gargoyle accovacciato su un pilastro; di notte gli occhi brillano (1×1). */
export function gargoyleLP(lit = true): LPModel {
  const lp = new LP('new:gargoyle');
  const S = LPC.stone, SD = LPC.stoneDark;
  lp.box(0, 0, 0, 0.6, 0.1, 0.6, SD, { bevel: 0.02 });
  lp.box(0, 0.1, 0, 0.44, 0.7, 0.44, S, { bevel: 0.025, vary: 0.08, topTint: LPC.moss, topAmount: 0.3 });
  lp.box(0, 0.8, 0, 0.56, 0.07, 0.56, LPC.stoneLight, { bevel: 0.015 });
  lp.push([0, 0.87, 0.04]);
  // corpo accovacciato, zampe, coda arrotolata
  lp.blob(0, 0.24, -0.02, 0.17, 0.2, 0.15, S, { detail: 1, vary: 0.08 });
  for (const s of [-1, 1]) {
    lp.blob(s * 0.12, 0.08, 0.06, 0.07, 0.08, 0.1, SD, { vary: 0.08 });
    lp.blob(s * 0.07, 0.16, 0.15, 0.04, 0.09, 0.04, S, { vary: 0.08 });
    lp.box(s * 0.07, 0.0, 0.2, 0.08, 0.04, 0.08, SD, { bevel: 0.01 });
    // ali da pipistrello, chiuse a metà
    const w = new THREE.Shape();
    w.moveTo(0, 0); w.lineTo(0.28, 0.12); w.lineTo(0.24, 0.02); w.lineTo(0.3, -0.06); w.lineTo(0.2, -0.08); w.lineTo(0.22, -0.18); w.lineTo(0, -0.12); w.closePath();
    lp.push([s * 0.1, 0.38, -0.1], s * -0.5, 0, 0, [s, 1, 1]).extrude(w, 0.025, SD, { vary: 0.06 }).pop();
  }
  tube(lp, [0, 0.06, -0.14], [0.14, 0.03, -0.22], 0.03, SD);
  tube(lp, [0.14, 0.03, -0.22], [0.2, 0.1, -0.12], 0.025, SD);
  // testa: muso, corna, bocca aperta, occhi
  lp.blob(0, 0.5, 0.06, 0.13, 0.11, 0.12, S, { detail: 1, vary: 0.08 });
  lp.box(0, 0.42, 0.15, 0.12, 0.07, 0.1, S, { bevel: 0.02 });
  lp.box(0, 0.42, 0.2, 0.09, 0.02, 0.02, LPC.charcoal, { jitter: 0 });
  for (const s of [-1, 1]) {
    lp.push([s * 0.08, 0.6, 0.02], 0, -0.4, s * -0.5).cyl(0, 0, 0, 0.03, 0.0, 0.12, 5, SD, { jitter: 0 }).pop();
    lp.blob(s * 0.05, 0.52, 0.16, 0.022, 0.018, 0.012, lit ? '#ff6a4a' : LPC.charcoal, lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  }
  lp.pop();
  if (lit) lp.light(0, 1.4, 0.25, '#ff6a4a', 0.1, 1.2, 0.4, 0.35);
  for (const [x, z] of [[-0.24, 0.24], [0.2, -0.22]]) lp.blob(x, 0.88, z, 0.04, 0.015, 0.04, LPC.moss, { jitter: 0.005 });
  return lp.build();
}

/** Corvo impagliato su un trespolo (1×1): gira la testa quando passa il Custode. */
export function stuffedCrowLP(): LPModel {
  const lp = new LP('new:crow');
  const B = '#1f2128', B2 = '#2b2e38';
  lp.cyl(0, 0, 0, 0.2, 0.18, 0.06, 7, LPC.woodDark, { jitter: 0 });
  lp.cyl(0, 0.06, 0, 0.03, 0.025, 0.9, 5, LPC.wood, { jitter: 0 });
  lp.push([0, 0.96, 0], 0, 0, Math.PI / 2).cyl(0, -0.2, 0, 0.025, 0.025, 0.4, 5, LPC.wood, { jitter: 0 }).pop();
  lp.push([0.05, 0.99, 0]);
  lp.blob(0, 0.12, 0, 0.1, 0.12, 0.14, B, { detail: 1, vary: 0.06 });
  for (const s of [-1, 1]) lp.push([s * 0.08, 0.12, -0.02], s * 0.15).blob(0, 0, 0, 0.03, 0.08, 0.13, B2, { vary: 0.06 }).pop();
  lp.push([0, 0.05, -0.16], 0, 0.5).box(0, -0.01, -0.06, 0.1, 0.02, 0.14, B2, { jitter: 0 }).pop();
  lp.blob(0, 0.28, 0.06, 0.075, 0.075, 0.075, B, { detail: 1 });
  lp.push([0, 0.27, 0.13], 0, Math.PI / 2).cyl(0, 0, 0, 0.025, 0.0, 0.1, 4, '#3a3530', { jitter: 0 }).pop();
  for (const s of [-1, 1]) {
    lp.blob(s * 0.045, 0.3, 0.1, 0.018, 0.018, 0.012, '#e8d48a', { jitter: 0 }); // occhi di vetro
    lp.blob(s * 0.047, 0.3, 0.11, 0.008, 0.008, 0.006, '#141414', { jitter: 0 });
    lp.box(s * 0.035, -0.04, 0.02, 0.015, 0.05, 0.015, '#3a3530', { jitter: 0 });
  }
  lp.pop();
  // cartellino col filo
  lp.box(-0.14, 0.86, 0.02, 0.1, 0.06, 0.005, '#d8cdb0', { jitter: 0 });
  tube(lp, [-0.14, 0.92, 0.02], [-0.1, 0.96, 0], 0.003, '#7a6a5a', 3);
  return lp.build();
}

/** Pila di libri ammuffiti con una candela (1×1). */
export function bookPileLP(lit = true): LPModel {
  const lp = new LP('new:books');
  const cols = ['#5a2a30', '#2f3a5a', '#4a5a3e', '#6b5236', '#3a2a3e', '#7a3a2a'];
  const r = lp.rng;
  let y = 0;
  for (let i = 0; i < 6; i++) {
    const h = r.range(0.05, 0.09), w = r.range(0.3, 0.42), d = r.range(0.22, 0.28);
    lp.push([r.range(-0.04, 0.04), y, r.range(-0.03, 0.03)], r.range(-0.35, 0.35));
    lp.box(0, 0, 0, w, h, d, cols[i % cols.length], { bevel: 0.006, vary: 0.06 });
    lp.box(0.012, 0.006, 0, w - 0.03, h - 0.012, d + 0.004, '#d8ccb0', { jitter: 0 }); // pagine
    lp.box(-w / 2 + 0.01, 0, 0, 0.02, h, d + 0.01, cols[i % cols.length], { jitter: 0 }); // dorso
    lp.box(-w / 2 + 0.005, h * 0.4, 0, 0.012, h * 0.2, d * 0.6, LPC.gold, { jitter: 0 });
    lp.pop();
    y += h;
  }
  // libro aperto in cima con il segnalibro
  lp.push([0, y, 0], 0.4);
  for (const s of [-1, 1]) lp.push([s * 0.1, 0, 0], 0, 0, s * -0.12).box(0, 0, 0, 0.2, 0.025, 0.26, '#e2d6bb', { jitter: 0 }).pop();
  lp.box(0.05, -0.04, 0.13, 0.015, 0.08, 0.004, '#8e2f2a', { jitter: 0 });
  lp.pop();
  candle(lp, 0.18, 0, 0.18, lit, 0.12);
  candle(lp, 0.25, 0, 0.1, lit, 0.07);
  for (const [x, z] of [[-0.2, 0.1], [0.1, -0.15]]) lp.blob(x, y * 0.5, z, 0.05, 0.03, 0.04, LPC.moss, { jitter: 0.005 });
  cobweb(lp, -0.18, y - 0.02, 0.14, 0.12, true);
  return lp.build();
}

/** Piedistallo della statua del Custode (2×2): la statua è il rig del giocatore, in pietra. */
export function statuePlinthLP(): LPModel {
  const lp = new LP('new:plinth');
  lp.box(0, 0, 0, 1.7, 0.12, 1.7, LPC.stoneDark, { bevel: 0.02 });
  lp.box(0, 0.12, 0, 1.4, 0.08, 1.4, LPC.stone, { bevel: 0.015 });
  lp.box(0, 0.2, 0, 1.0, 0.55, 1.0, LPC.stoneLight, { bevel: 0.025, vary: 0.05 });
  lp.box(0, 0.75, 0, 1.15, 0.08, 1.15, LPC.stone, { bevel: 0.015 });
  // targa d'ottone con la scritta e due corone ai lati
  lp.box(0, 0.38, 0.505, 0.6, 0.22, 0.02, LPC.gold, { bevel: 0.006 });
  for (const w of [0.4, 0.3]) lp.box(0, 0.42 + (0.4 - w) * 0.6, 0.517, w, 0.025, 0.006, '#6b5232', { jitter: 0 });
  for (const s of [-1, 1]) {
    lp.push([s * 0.68, 0.2, 0.68]);
    for (let i = 0; i < 7; i++) flower(lp, Math.cos(i) * 0.08, Math.sin(i) * 0.08, LPC.flowers[i % 6], 0.12);
    lp.pop();
  }
  return lp.build();
}

// ── Costruzioni ─────────────────────────────────────────────────────────

/**
 * Gazebo rotondo (4×4), alla Stars Hollow: pedana ottagonale con i gradini,
 * colonnine bianche, ringhiera a balaustrini, fregio a merletto, tetto a
 * cupola con la banderuola, lucine. Bianco un po' scrostato, da cimitero.
 */
export function gazeboLP(lit = true): LPModel {
  const lp = new LP('new:gazebo');
  const W = '#e6e1d6', W2 = '#cfc8ba', ROOF = '#5a6b78', ROOF2 = '#4a5a66';
  const N = 8, R = 1.55, H = 1.55;
  const at = (i: number, r: number): [number, number] => { const a = (i / N) * Math.PI * 2 + Math.PI / N; return [Math.sin(a) * r, Math.cos(a) * r]; };
  // basamento in pietra e pedana di assi
  lp.cyl(0, 0, 0, R + 0.18, R + 0.12, 0.22, N, LPC.stone, { vary: 0.06, ao: 0.3 });
  lp.cyl(0, 0.22, 0, R + 0.1, R + 0.1, 0.06, N, LPC.woodLight, { vary: 0.08 });
  // gradini sul davanti
  for (let k = 0; k < 2; k++) lp.box(0, 0.0 + k * 0.1, R + 0.28 - k * 0.12, 0.9, 0.1, 0.24, W2, { bevel: 0.01 });
  const base = 0.28;
  for (let i = 0; i < N; i++) {
    const [x, z] = at(i, R);
    // colonnine tornite
    lp.lathe(x, base, z, [[0.07, 0], [0.06, 0.06], [0.045, 0.1], [0.045, H - 0.12], [0.065, H - 0.06], [0.07, H]], 8, W, { jitter: 0 });
    const [x2, z2] = at(i + 1, R);
    const front = i === N - 1; // il lato verso +z resta aperto (l'ingresso)
    const mx = (x + x2) / 2, mz = (z + z2) / 2, len = Math.hypot(x2 - x, z2 - z), yaw = Math.atan2(x2 - x, z2 - z);
    if (!front) {
      // ringhiera: corrimano, zoccolo e balaustrini
      lp.push([mx, base, mz], yaw);
      lp.box(0, 0.48, 0, 0.06, 0.04, len, W, { jitter: 0 });
      lp.box(0, 0.02, 0, 0.05, 0.04, len, W2, { jitter: 0 });
      for (let k = 1; k < 7; k++) lp.box(0, 0.06, -len / 2 + (k * len) / 7, 0.025, 0.42, 0.025, W, { jitter: 0 });
      lp.pop();
    }
    // fregio a merletto sotto il tetto: archetto e pendagli
    lp.push([mx, base + H - 0.2, mz], yaw);
    lp.box(0, 0.12, 0, 0.05, 0.06, len, W, { jitter: 0 });
    for (let k = 0; k < 5; k++) lp.cyl(0, 0.0, -len / 2 + ((k + 0.5) * len) / 5, 0.0, 0.035, 0.12, 4, W2, { jitter: 0 });
    lp.pop();
  }
  // tetto: cono basso a otto falde con il bordo, poi cupolino e banderuola
  const top = base + H;
  lp.cyl(0, top, 0, R + 0.32, R + 0.3, 0.06, N, W2, { jitter: 0 });
  // tetto a campana (falde concave) con le nervature bianche sugli spigoli
  const prof: Array<[number, number]> = [[R + 0.3, 0], [R + 0.02, 0.12], [R * 0.68, 0.33], [R * 0.4, 0.58], [0.33, 0.75]];
  lp.lathe(0, top + 0.06, 0, prof, N, ROOF, { jitter: 0.004, vary: 0.05 });
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    for (let k = 0; k < prof.length - 1; k++) {
      const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
      tube(lp, [Math.sin(a) * (r0 + 0.01), top + 0.07 + y0, Math.cos(a) * (r0 + 0.01)], [Math.sin(a) * (r1 + 0.01), top + 0.07 + y1, Math.cos(a) * (r1 + 0.01)], 0.022, W, 4);
    }
  }
  lp.cyl(0, top + 0.8, 0, 0.34, 0.34, 0.16, N, W, { jitter: 0 });
  lp.cyl(0, top + 0.96, 0, 0.4, 0.06, 0.32, N, ROOF2, { jitter: 0 });
  lp.lathe(0, top + 1.26, 0, [[0.04, 0], [0.06, 0.06], [0.02, 0.12], [0.015, 0.4], [0, 0.42]], 6, LPC.gold, { jitter: 0 });
  // banderuola a pipistrello
  const bat = new THREE.Shape();
  bat.moveTo(0, 0); bat.lineTo(0.08, 0.05); bat.lineTo(0.16, 0.02); bat.lineTo(0.13, -0.03); bat.lineTo(0.05, -0.02); bat.lineTo(0, -0.05); bat.lineTo(-0.05, -0.02); bat.lineTo(-0.13, -0.03); bat.lineTo(-0.16, 0.02); bat.lineTo(-0.08, 0.05); bat.closePath();
  lp.push([0, top + 1.6, 0]).extrude(bat, 0.012, LPC.iron, { jitter: 0 }).pop();
  // lucine appese tra le colonne, e una lanterna al centro
  for (let i = 0; i < N; i++) {
    const [x, z] = at(i, R), [x2, z2] = at(i + 1, R);
    const pts = rope(lp, [x, top - 0.05, z], [x2, top - 0.05, z2], 0.16, 0.005, '#2a2420', 5);
    for (let k = 1; k < pts.length - 1; k++) lp.blob(pts[k].x, pts[k].y - 0.03, pts[k].z, 0.03, 0.035, 0.03, lit ? '#ffe2a0' : '#5a5448', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  }
  const gl = glow(lit, LPC.lantern);
  lp.box(0, top - 0.04, 0, 0.012, 0.2, 0.012, LPC.iron, { jitter: 0 });
  lp.box(0, top - 0.38, 0, 0.16, 0.22, 0.16, gl.color, { bucket: gl.bucket, jitter: 0 });
  lp.box(0, top - 0.16, 0, 0.2, 0.03, 0.2, LPC.iron, { jitter: 0 });
  lp.box(0, top - 0.41, 0, 0.2, 0.03, 0.2, LPC.iron, { jitter: 0 });
  // una panchina dentro, ragnatele, edera e foglie: è pur sempre un cimitero
  lp.box(0, base, -0.8, 1.0, 0.04, 0.32, LPC.wood, { bevel: 0.008 });
  for (const s of [-1, 1]) lp.box(s * 0.42, base - 0.0, -0.8, 0.06, 0.24, 0.28, LPC.woodDark, { jitter: 0 });
  lp.box(0, base + 0.24, -0.8, 1.0, 0.04, 0.34, LPC.wood, { bevel: 0.008 });
  lp.box(0, base + 0.28, -0.95, 1.0, 0.3, 0.04, LPC.wood, { bevel: 0.008 });
  const [cx, cz] = at(2, R);
  cobweb(lp, cx - 0.05, top - 0.12, cz, 0.22);
  for (let i = 0; i < 4; i++) { const [x, z] = at(i * 2 + 1, R + 0.22); weeds(lp, x, z, 0.9); }
  if (lit) { lp.light(0, top - 0.3, 0, LPC.lantern, 0.9, 5.5, 0.15, 1); lp.light(0, top - 0.1, R * 0.8, '#ffe2a0', 0.5, 4, 0.25, 0.4); }
  return lp.build();
}

/** Campanile (2×2): torre di pietra con la cella campanaria aperta e la guglia. */
export function bellTowerLP(lit = true): LPModel {
  const lp = new LP('new:belltower');
  const S = LPC.stoneWarm, SD = LPC.stoneDark;
  lp.box(0, 0, 0, 1.6, 0.18, 1.6, SD, { bevel: 0.02 });
  lp.box(0, 0.18, 0, 1.2, 2.3, 1.2, S, { bevel: 0.02, vary: 0.06, ao: 0.3 });
  // cantonali e cornici
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 0; k < 6; k++) lp.box(dx * 0.6, 0.25 + k * 0.38, dz * 0.6, 0.12, 0.18, 0.12, LPC.stoneLight, { bevel: 0.01 });
  lp.box(0, 2.48, 0, 1.32, 0.08, 1.32, LPC.stoneLight, { bevel: 0.01 });
  // porta ad arco e finestrella
  const arch = (w: number, h: number) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.closePath(); return s; };
  lp.push([0, 0.18, 0.605]).plate(arch(0.46, 0.8), 0.02, LPC.woodDark, { ao: 0 }).pop();
  lp.push([0, 1.5, 0.605]).plate(arch(0.18, 0.36), 0.02, lit ? LPC.window : '#2a2420', { bucket: lit ? 'glow' : 'solid', ao: 0 }).pop();
  lp.box(0.15, 0.55, 0.62, 0.04, 0.04, 0.02, LPC.iron, { jitter: 0 });
  // cella campanaria: quattro pilastri e archi aperti
  const B = 2.56;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(dx * 0.52, B, dz * 0.52, 0.18, 0.92, 0.18, S, { bevel: 0.015 });
  for (const [yaw, z] of [[0, 0.52], [0, -0.52], [Math.PI / 2, 0.52], [Math.PI / 2, -0.52]] as const) {
    // parete con l'apertura ad arco: profilo a U rovesciata
    lp.push([0, B, 0], yaw).push([0, 0, z]);
    const s = new THREE.Shape();
    s.moveTo(-0.6, 0); s.lineTo(-0.36, 0); s.lineTo(-0.36, 0.5);
    s.absarc(0, 0.5, 0.36, Math.PI, 0, true);
    s.lineTo(0.36, 0); s.lineTo(0.6, 0); s.lineTo(0.6, 0.92); s.lineTo(-0.6, 0.92); s.closePath();
    lp.extrude(s, 0.16, S, { vary: 0.05, curve: 8 });
    lp.pop().pop();
  }
  lp.box(0, B + 0.92, 0, 1.3, 0.08, 1.3, LPC.stoneLight, { bevel: 0.01 });
  // la campana di bronzo con il batacchio e la trave
  lp.box(0, B + 0.78, 0, 1.0, 0.07, 0.08, LPC.woodDark, { jitter: 0 });
  lp.lathe(0, B + 0.28, 0, [[0.0, 0], [0.26, 0], [0.24, 0.05], [0.18, 0.2], [0.15, 0.42], [0.08, 0.48], [0, 0.5]], 10, '#9a7a3a', { jitter: 0, vary: 0.05 });
  lp.blob(0, B + 0.3, 0, 0.05, 0.05, 0.05, '#5a4a2a', { jitter: 0 });
  // guglia a piramide con la croce
  lp.push([0, B + 1.0, 0], Math.PI / 4).cyl(0, 0, 0, 0.92, 0.04, 1.3, 4, LPC.roofDark, { jitter: 0.006, vary: 0.05 }).pop();
  lp.box(0, B + 2.3, 0, 0.04, 0.38, 0.04, LPC.iron, { jitter: 0 });
  lp.box(0, B + 2.55, 0, 0.2, 0.04, 0.04, LPC.iron, { jitter: 0 });
  // pipistrelli che escono dalla cella
  for (const [x, y, z, a] of [[0.7, B + 1.3, 0.5, 0.3], [0.95, B + 1.6, 0.2, -0.4], [0.5, B + 1.75, 0.85, 0.1]]) {
    const bat = new THREE.Shape();
    bat.moveTo(0, 0); bat.lineTo(0.07, 0.04); bat.lineTo(0.13, 0.01); bat.lineTo(0.1, -0.02); bat.lineTo(0, -0.03); bat.lineTo(-0.1, -0.02); bat.lineTo(-0.13, 0.01); bat.lineTo(-0.07, 0.04); bat.closePath();
    lp.push([x, y, z], a).extrude(bat, 0.01, '#141418', { jitter: 0 }).pop();
  }
  for (const s of [-1, 1]) weeds(lp, s * 0.7, 0.75, 1);
  if (lit) lp.light(0, 1.6, 0.8, LPC.window, 0.5, 3, 0.2, 0.5);
  return lp.build();
}

// ── Ambiente ────────────────────────────────────────────────────────────

/** Palude (4×3): acqua torbida, canne, ninfee marce e mani che spuntano (una animata in gioco). */
export function swampLP(): LPModel {
  const lp = new LP('new:swamp');
  const r = lp.rng;
  // sponda fangosa e specchio d'acqua verde scuro (secchio "water" come lo stagno)
  const edge = new THREE.Shape();
  for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; const k = 1 + Math.sin(a * 3) * 0.06 + Math.cos(a * 5) * 0.04; const x = Math.cos(a) * 1.85 * k, y = Math.sin(a) * 1.3 * k; if (i) edge.lineTo(x, y); else edge.moveTo(x, y); }
  lp.push([0, 0.0, 0], 0, -Math.PI / 2).plate(edge, 0.05, LPC.soilDark, { ao: 0 }).pop();
  lp.push([0, 0.04, 0], 0, -Math.PI / 2, 0, 0.86).plate(edge, 0.02, '#2f4436', { bucket: 'water', ao: 0 }).pop();
  // mani (dita e polso) che escono dall'acqua
  const hand = (x: number, z: number, yaw: number, s: number, col: string) => {
    lp.push([x, 0.05, z], yaw, 0.15, 0, s);
    lp.cyl(0, 0, 0, 0.045, 0.04, 0.18, 6, col, { jitter: 0 });
    lp.blob(0, 0.22, 0, 0.06, 0.06, 0.03, col, { jitter: 0 });
    for (let f = 0; f < 4; f++) tube(lp, [-0.04 + f * 0.027, 0.26, 0], [-0.05 + f * 0.033, 0.36 + (f === 1 || f === 2 ? 0.03 : 0), 0.02 * (f - 1.5)], 0.011, col, 4);
    tube(lp, [0.05, 0.22, 0], [0.1, 0.28, 0.02], 0.012, col, 4);
    lp.pop();
  };
  hand(-0.6, 0.2, 0.3, 2.0, '#a4c487');
  hand(0.7, -0.35, -0.5, 1.7, LPC.bone);
  hand(0.25, 0.55, 0.1, 1.2, '#a4c487');
  // canne e tife sulla sponda
  for (let i = 0; i < 14; i++) {
    const a = r.next() * Math.PI * 2, x = Math.cos(a) * 1.75, z = Math.sin(a) * 1.2;
    const h = r.range(0.4, 0.75);
    tube(lp, [x, 0, z], [x + r.range(-0.05, 0.05), h, z], 0.012, i % 3 ? '#5a6a3a' : LPC.dry, 3);
    if (i % 3 === 0) lp.cyl(x, h - 0.12, z, 0.025, 0.025, 0.12, 5, '#5a3a28', { jitter: 0 });
  }
  for (let i = 0; i < 5; i++) { const a = r.next() * Math.PI * 2, d = r.range(0.3, 1.1); lp.cyl(Math.cos(a) * d * 1.3, 0.06, Math.sin(a) * d * 0.8, 0.13, 0.13, 0.01, 7, i % 2 ? '#4a5a2e' : '#5a5a30', { jitter: 0 }); }
  // bolle e un teschio a galla
  skull(lp, -1.0, 0.0, -0.4, 0.6);
  for (let i = 0; i < 6; i++) lp.blob(r.range(-1, 1), 0.07, r.range(-0.6, 0.6), 0.03, 0.02, 0.03, '#7a9a6a', { jitter: 0 });
  return lp.build();
}

/** Albero morto con l'altalena (2×2): l'altalena oscilla da sola (in gioco animata). */
export function swingTreeLP(): LPModel {
  const lp = new LP('new:swingtree');
  const T = '#3a302a';
  lp.blob(-0.4, 0.0, -0.2, 0.6, 0.04, 0.5, LPC.soil, { vary: 0.1 });
  // tronco contorto e il ramo orizzontale da cui pende l'altalena
  tube(lp, [-0.55, 0, -0.3], [-0.5, 1.2, -0.3], 0.18, T, 7, 0.12);
  tube(lp, [-0.5, 1.2, -0.3], [-0.6, 2.0, -0.35], 0.1, T, 6, 0.06);
  tube(lp, [-0.5, 1.55, -0.3], [0.85, 1.75, -0.2], 0.07, T, 6, 0.04);
  tube(lp, [0.85, 1.75, -0.2], [1.05, 1.95, -0.25], 0.04, T, 5, 0.015);
  tube(lp, [-0.6, 2.0, -0.35], [-0.95, 2.3, -0.3], 0.05, T, 5, 0.015);
  tube(lp, [-0.6, 2.0, -0.35], [-0.3, 2.35, -0.4], 0.04, T, 5, 0.012);
  tube(lp, [-0.52, 0.9, -0.3], [-0.9, 1.2, -0.1], 0.04, T, 5, 0.015);
  for (const s of [-1, 1]) tube(lp, [-0.55 + s * 0.12, 0.1, -0.3], [-0.55 + s * 0.3, 0, -0.3 + s * 0.15], 0.05, T, 5, 0.02);
  // altalena: due corde e la tavoletta, appena inclinata
  const sx = 0.25;
  for (const dx of [-0.2, 0.2]) tube(lp, [sx + dx, 1.66 + dx * 0.15, -0.25], [sx + dx * 0.95, 0.42, 0.0], 0.008, '#8a7a5a', 3);
  lp.push([sx, 0.4, 0.0], 0, 0.1).box(0, 0, 0, 0.48, 0.04, 0.16, LPC.wood, { bevel: 0.006, vary: 0.1 }).pop();
  // corvo sul ramo e qualche foglia secca
  lp.blob(0.6, 1.83, -0.2, 0.07, 0.06, 0.09, '#1f2128', { jitter: 0.005 });
  lp.blob(0.6, 1.92, -0.15, 0.045, 0.045, 0.045, '#1f2128', { jitter: 0 });
  for (let i = 0; i < 6; i++) lp.blob(lp.rng.range(-0.8, 0.8), 0.01, lp.rng.range(-0.6, 0.7), 0.05, 0.008, 0.04, LPC.leafAutumn[i % 4], { jitter: 0 });
  return lp.build();
}

/** Nebbia stagnante (2×2): veli bassi traslucidi (in gioco si muovono piano). */
export function lowFogLP(): LPModel {
  const lp = new LP('new:fog');
  const r = lp.rng;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r.range(-0.3, 0.3), d = i ? r.range(0.25, 0.7) : 0;
    lp.blob(Math.cos(a) * d, 0.08 + r.next() * 0.08, Math.sin(a) * d, r.range(0.35, 0.55), r.range(0.08, 0.14), r.range(0.3, 0.45), '#26302e', { bucket: 'ghost', detail: 1, jitter: 0.02 }); // additiva: tinta scura
  }
  for (let i = 0; i < 4; i++) grassTuft(lp, r.range(-0.8, 0.8), r.range(-0.8, 0.8), 0.8);
  return lp.build();
}

/** Salice piangente (3×3): chioma a cupola e rami che ricadono fino a terra. */
export function willowLP(): LPModel {
  const lp = new LP('new:willow');
  const r = lp.rng;
  const T = '#4a3e34';
  tube(lp, [0, 0, 0], [0.05, 1.1, 0], 0.18, T, 7, 0.13);
  tube(lp, [0.05, 1.1, 0], [-0.25, 1.75, 0.1], 0.11, T, 6, 0.06);
  tube(lp, [0.05, 1.1, 0], [0.35, 1.7, -0.15], 0.1, T, 6, 0.05);
  for (const a of [0, 2.1, 4.2]) tube(lp, [0, 0.15, 0], [Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4], 0.07, T, 5, 0.02);
  lp.blob(0, 2.0, 0, 1.0, 0.45, 0.95, '#56693f', { detail: 1, vary: 0.08 });
  lp.blob(0.2, 2.25, -0.1, 0.6, 0.3, 0.6, '#5f7345', { detail: 1, vary: 0.08 });
  // tende di rami sottili che ricadono
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + r.range(-0.08, 0.08), rr = r.range(0.8, 1.1);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr, h = r.range(0.25, 0.8);
    tube(lp, [x * 0.9, 1.95, z * 0.9], [x * 1.15, h, z * 1.15], 0.02, i % 3 ? '#4a5f3f' : '#647a48', 3, 0.008);
  }
  return lp.build();
}

/**
 * Crepa infernale (3×2): il prato si spacca, le zolle si sollevano ai lati
 * della fessura e la lava pulsa sotto; attorno l'erba è bruciata a chiazze
 * che sfumano nel prato (niente piastra scura appoggiata sopra).
 */
export function hellCrackLP(lit = true): LPModel {
  const lp = new LP('new:crack');
  const r = lp.rng;
  // erba bruciata: chiazze piatte che vanno dal nero al verde scuro del prato, più chiare verso fuori
  for (let i = 0; i < 16; i++) {
    const k = i / 16, a = r.range(0, Math.PI * 2), d = 0.15 + k * 0.85;
    const x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * 0.7;
    lp.blob(x, 0.0, z, r.range(0.2, 0.34) * (1 - k * 0.4), 0.008, r.range(0.14, 0.24), k < 0.4 ? '#1e1814' : k < 0.75 ? '#2b2a1e' : '#2f3a24', { vary: 0.12, jitter: 0.02 });
  }
  const pts: Array<[number, number]> = [[-1.3, -0.1], [-0.8, 0.15], [-0.4, -0.05], [0, 0.2], [0.45, -0.1], [0.85, 0.12], [1.3, -0.05]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.05;
    const w = 0.16 - Math.abs(i - 2.5) * 0.025;
    lp.push([(x0 + x1) / 2, 0, (z0 + z1) / 2], Math.atan2(x1 - x0, z1 - z0));
    // fondo della fessura: lava (sotto il livello del prato, appena visibile tra le zolle)
    lp.box(0, 0.004, 0, w, 0.012, len, lit ? '#ff6a2a' : '#4a2a20', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
    if (lit) lp.box(0, 0.012, 0, w * 0.45, 0.008, len * 0.9, '#ffc35a', { bucket: 'glow', jitter: 0 });
    // zolle di prato sollevate e inclinate verso la fessura: sopra erba, sotto terra
    for (const s of [-1, 1]) {
      lp.push([s * (w / 2 + 0.11), -0.01, 0], 0, 0, s * -r.range(0.1, 0.18));
      lp.box(0, 0, 0, 0.22, 0.04, len * r.range(0.85, 1), LPC.soil, { bevel: 0.012, jitter: 0.012, vary: 0.12, topTint: LPC.grass, topAmount: 1 });
      lp.pop();
    }
    lp.pop();
  }
  // sassi anneriti e qualche zolla staccata, mezzi affondati nel prato
  for (let i = 0; i < 9; i++) lp.blob(r.range(-1.2, 1.2), -0.02, r.range(-0.7, 0.7) * (i % 2 ? 1 : -1), r.range(0.06, 0.13), r.range(0.05, 0.1), r.range(0.06, 0.12), i % 3 ? '#2a2422' : '#4a2a24', { vary: 0.12 });
  for (let i = 0; i < 4; i++) lp.push([r.range(-1, 1), -0.01, r.range(-0.55, 0.55)], r.range(0, 3), r.range(-0.2, 0.2)).box(0, 0, 0, 0.12, 0.035, 0.1, LPC.soil, { jitter: 0.01, topTint: LPC.grass, topAmount: 1 }).pop();
  for (let i = 0; i < 6; i++) weeds(lp, r.range(-1.3, 1.3), r.pick([-0.85, 0.85]), 0.7);
  if (lit) {
    for (let i = 0; i < 6; i++) lp.blob(r.range(-1, 1), r.range(0.2, 0.7), r.range(-0.1, 0.15), 0.02, 0.02, 0.02, '#ffb347', { bucket: 'glow', jitter: 0 });
    // la luce sale dalla fessura, bassa e raccolta: niente alone, solo il riverbero sulle zolle
    lp.light(-0.55, 0.08, 0.05, '#ff6a2a', 0.6, 2.4, 0.5, 0.12);
    lp.light(0.65, 0.08, 0, '#ff6a2a', 0.6, 2.4, 0.5, 0.12);
  }
  return lp.build();
}

// ── Stagionali ──────────────────────────────────────────────────────────

/** Campo di zucche (3×3, ottobre): zucche tra foglie e viticci, alcune intagliate e accese. */
export function pumpkinPatchLP(lit = true): LPModel {
  const lp = new LP('new:patch');
  const r = lp.rng;
  lp.box(0, 0, 0, 2.6, 0.06, 2.6, LPC.soil, { bevel: 0.03, vary: 0.12 });
  for (let i = 0; i < 4; i++) lp.box(-0.95 + i * 0.63, 0.05, 0, 0.32, 0.05, 2.4, LPC.soilDark, { bevel: 0.02, vary: 0.1 });
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 3; k++) {
      const x = -0.95 + i * 0.63 + r.range(-0.06, 0.06), z = -0.8 + k * 0.8 + r.range(-0.1, 0.1);
      const big = r.chance(0.35);
      pumpkin(lp, x, 0.08, z, big ? 0.2 : r.range(0.1, 0.15), r.chance(0.3), lit, r.range(-0.6, 0.6));
      for (let l = 0; l < 3; l++) lp.blob(x + r.range(-0.2, 0.2), 0.1, z + r.range(-0.2, 0.2), 0.09, 0.015, 0.08, '#4d5a2e', { jitter: 0.01 });
    }
  }
  // spaventapasseri a palo con la testa di zucca
  lp.push([1.1, 0, -1.05]);
  lp.cyl(0, 0, 0, 0.03, 0.03, 1.2, 5, LPC.woodDark, { jitter: 0 });
  lp.push([0, 0.95, 0], 0, 0, Math.PI / 2).cyl(0, -0.3, 0, 0.022, 0.022, 0.6, 5, LPC.woodDark, { jitter: 0 }).pop();
  lp.box(0, 0.6, 0, 0.3, 0.4, 0.14, '#6b4a3a', { jitter: 0.01, vary: 0.12 });
  pumpkin(lp, 0, 1.0, 0, 0.13, true, lit);
  lp.cyl(0, 1.2, 0, 0.2, 0.18, 0.02, 8, '#3a2a20', { jitter: 0 });
  lp.cyl(0, 1.22, 0, 0.09, 0.07, 0.14, 7, '#3a2a20', { jitter: 0 });
  lp.pop();
  return lp.build();
}

/** Ragnatela gigante tesa tra due rami secchi, col ragno (2×1, ottobre). */
export function giantWebLP(): LPModel {
  const lp = new LP('new:web');
  const C = '#d6d2c6';
  for (const s of [-1, 1]) {
    tube(lp, [s * 0.85, 0, 0], [s * 0.75, 1.6, 0], 0.06, '#3a302a', 6, 0.03);
    tube(lp, [s * 0.78, 1.2, 0], [s * 0.45, 1.75, 0], 0.03, '#3a302a', 5, 0.012);
  }
  const cx = 0, cy = 0.95;
  const spokes = 10, R = 0.7;
  const P = (a: number, d: number): V3 => [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 1.1, 0];
  for (let i = 0; i < spokes; i++) tube(lp, [cx, cy, 0], P((i / spokes) * Math.PI * 2, R), 0.005, C, 3);
  for (let k = 1; k <= 5; k++) for (let i = 0; i < spokes; i++) {
    const d = (k / 5) * R * 0.95;
    tube(lp, P((i / spokes) * Math.PI * 2, d), P(((i + 1) / spokes) * Math.PI * 2, d * 0.97), 0.004, C, 3);
  }
  // il ragno (grosso e peloso, ma con gli occhietti teneri)
  lp.push([0.15, 1.15, 0.03]);
  lp.blob(0, 0, 0, 0.09, 0.08, 0.06, '#1b1a20', { jitter: 0.01 });
  lp.blob(0, 0.09, 0, 0.055, 0.05, 0.045, '#1b1a20', { jitter: 0 });
  for (const s of [-1, 1]) {
    for (let l = 0; l < 4; l++) { const a = -0.6 + l * 0.4; tube(lp, [s * 0.05, 0.02, 0], [s * 0.16, 0.02 + Math.sin(a) * 0.12, 0.04], 0.008, '#1b1a20', 3); }
    lp.blob(s * 0.02, 0.1, 0.04, 0.012, 0.012, 0.008, '#e8f0c0', { jitter: 0 });
  }
  lp.pop();
  return lp.build();
}

/** Altarino del Giorno dei morti (2×1, 2 novembre): gradini con candele, calaveras, cempasúchil e foto. */
export function ofrendaLP(lit = true): LPModel {
  const lp = new LP('new:ofrenda');
  const r = lp.rng;
  const MARI = ['#f0901f', '#f6a92a', '#e07a1a'];
  // tre gradini coperti dal papel picado
  // tre gradini, dal più largo davanti al più stretto dietro (piani a 0,26 · 0,52 · 0,78)
  for (let i = 0; i < 3; i++) lp.box(0, i * 0.26, 0.15 - i * 0.15, 1.6 - i * 0.3, 0.26, 0.75 - i * 0.2, i % 2 ? '#6b3050' : '#7a3a5a', { bevel: 0.01, vary: 0.06 });
  for (let i = 0; i < 3; i++) lp.box(0, i * 0.26 + 0.2, 0.15 - i * 0.15 + (0.75 - i * 0.2) / 2, 1.6 - i * 0.3, 0.06, 0.01, '#e8dcc0', { jitter: 0 }); // tovaglie ricamate
  // papel picado su un filo tra i pali
  rope(lp, [-0.8, 1.12, -0.3], [0.8, 1.12, -0.3], 0.08, 0.004, '#2a2420', 6);
  for (let i = 0; i < 9; i++) { const t = (i + 0.5) / 9; lp.box(-0.8 + t * 1.6, 0.98 - Math.sin(t * Math.PI) * 0.08, -0.3, 0.14, 0.13, 0.004, ['#e04a7a', '#f0c02a', '#3ab0a0', '#9a5ad0'][i % 4], { jitter: 0 }); }
  // foto incorniciate in cima, calaveras e candele sui gradini, pan de muerto davanti
  for (const x of [-0.3, 0.3]) { lp.box(x, 0.78, -0.2, 0.2, 0.26, 0.03, LPC.gold, { bevel: 0.005 }); lp.box(x, 0.81, -0.184, 0.15, 0.2, 0.01, '#a8a090', { jitter: 0 }); }
  for (const [x, y, z] of [[-0.45, 0.52, 0.15], [0.15, 0.52, 0.15], [0.5, 0.26, 0.38]]) {
    skull(lp, x, y + 0.03, z, 0.7, '#f2ece0');
    lp.blob(x - 0.025, y + 0.13, z + 0.075, 0.012, 0.012, 0.006, '#e04a7a', { jitter: 0 });
    lp.blob(x + 0.025, y + 0.13, z + 0.075, 0.012, 0.012, 0.006, '#3ab0a0', { jitter: 0 });
  }
  lp.blob(-0.2, 0.31, 0.4, 0.1, 0.06, 0.1, '#c88a4a', { detail: 1, jitter: 0.005 });
  for (const [x, y, z] of [[-0.7, 0.26, 0.42], [-0.45, 0.26, 0.45], [0.2, 0.26, 0.44], [0.72, 0.26, 0.4], [-0.15, 0.52, 0.18], [0.42, 0.52, 0.2], [0, 0.78, -0.05]]) candle(lp, x, y, z, lit, 0.08 + r.next() * 0.08);
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, x = -0.8 + t * 1.6, y = 1.25 - Math.sin(t * Math.PI) * 0.18;
    lp.blob(x, y, -0.3, 0.05, 0.05, 0.05, MARI[i % 3], { detail: 1, jitter: 0.01 });
  }
  for (const s of [-1, 1]) { tube(lp, [s * 0.8, 0, -0.32], [s * 0.8, 1.3, -0.32], 0.02, LPC.woodDark); for (let k = 0; k < 6; k++) lp.blob(s * 0.8, 0.2 + k * 0.2, -0.3, 0.05, 0.05, 0.05, MARI[k % 3], { detail: 1, jitter: 0.01 }); }
  // petali sparsi sul cammino
  for (let i = 0; i < 20; i++) lp.blob(r.range(-0.4, 0.4), 0.005, 0.3 + r.next() * 0.25, 0.02, 0.005, 0.02, MARI[i % 3], { jitter: 0 });
  if (lit) lp.light(0, 0.9, 0.5, LPC.flame, 0.45, 3.5, 0.35, 0.9);
  return lp.build();
}

/** Arco di cempasúchil (3×1, 2 novembre): fiori arancioni su un arco di canne. */
export function marigoldArchLP(): LPModel {
  const lp = new LP('new:marigold');
  const MARI = ['#f0901f', '#f6a92a', '#e07a1a', '#d85a1a'];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const a = Math.PI - (i / N) * Math.PI;
    const x = Math.cos(a) * 1.2, y = Math.sin(a) * 1.9;
    lp.blob(x, y, 0, 0.1, 0.1, 0.1, MARI[i % 4], { detail: 1, jitter: 0.02 });
    lp.blob(x * 0.98, y - 0.05, 0.06, 0.07, 0.07, 0.07, MARI[(i + 2) % 4], { detail: 1, jitter: 0.02 });
    if (i % 2) lp.blob(x, y, -0.06, 0.06, 0.03, 0.05, '#4d5a2e', { jitter: 0.01 });
  }
  for (const s of [-1, 1]) { lp.box(s * 1.2, 0, 0, 0.3, 0.08, 0.3, LPC.stone, { bevel: 0.015 }); skull(lp, s * 1.2, 0.08, 0.05, 0.8, '#f2ece0'); }
  return lp.build();
}

/** Pupazzo di neve scheletro (1×1, dicembre): tre palle di neve, ossa per braccia, sciarpa e cilindro. */
export function skeletonSnowmanLP(): LPModel {
  const lp = new LP('new:snowman');
  const SN = '#e8eef0';
  lp.blob(0, 0.05, 0, 0.42, 0.06, 0.42, '#dfe8ec', { jitter: 0.02 });
  lp.blob(0, 0.25, 0, 0.28, 0.25, 0.28, SN, { detail: 1, jitter: 0.01 });
  lp.blob(0, 0.62, 0, 0.21, 0.19, 0.21, SN, { detail: 1, jitter: 0.01 });
  skull(lp, 0, 0.78, 0.0, 1.1, LPC.bone);
  // braccia d'osso, bottoni a vertebra, sciarpa rossa a righe, cilindro
  for (const s of [-1, 1]) { tube(lp, [s * 0.18, 0.66, 0], [s * 0.42, 0.85, 0.05], 0.018, LPC.bone, 5); lp.blob(s * 0.43, 0.86, 0.05, 0.03, 0.03, 0.03, LPC.bone, { jitter: 0 }); }
  for (const y of [0.55, 0.65, 0.35, 0.22]) lp.box(0, y, 0.2 + (y > 0.5 ? 0 : 0.06), 0.05, 0.03, 0.03, LPC.boneDark, { bevel: 0.006 });
  lp.cyl(0, 0.76, 0, 0.16, 0.16, 0.06, 10, '#8e2f2a', { jitter: 0 });
  lp.push([0.1, 0.72, 0.14], 0, 0, 0.2).box(0, -0.18, 0, 0.07, 0.2, 0.02, '#8e2f2a', { jitter: 0 }).pop();
  lp.cyl(0, 0.96, 0, 0.16, 0.16, 0.02, 10, '#141418', { jitter: 0 });
  lp.cyl(0, 0.98, 0, 0.1, 0.1, 0.2, 10, '#141418', { jitter: 0 });
  lp.cyl(0, 1.0, 0, 0.102, 0.102, 0.03, 10, '#5a2a30', { jitter: 0 });
  return lp.build();
}

/** Luci di Natale su un pezzo di recinto (1×1, dicembre): lampadine colorate e un fiocco. */
export function fenceLightsLP(lit = true): LPModel {
  const lp = new LP('new:xmaslights');
  const COLS = ['#ff5a4a', '#ffd04a', '#5ad06a', '#5ab0ff'];
  for (const x of [-0.45, 0.45]) { lp.box(x, 0, 0, 0.12, 0.9, 0.12, LPC.stone, { bevel: 0.015 }); lp.cyl(x, 0.9, 0, 0.09, 0.0, 0.12, 4, LPC.stoneLight, { jitter: 0 }); }
  for (let k = 0; k < 9; k++) lp.box(-0.36 + k * 0.09, 0.05, 0, 0.022, 0.72, 0.022, LPC.iron, { jitter: 0 });
  lp.box(0, 0.7, 0, 0.9, 0.035, 0.035, LPC.iron, { jitter: 0 });
  const pts = rope(lp, [-0.45, 0.82, 0.07], [0.45, 0.82, 0.07], 0.12, 0.005, '#1e3a1e', 8);
  pts.forEach((p, i) => { if (i && i < pts.length - 1) lp.blob(p.x, p.y - 0.03, p.z, 0.022, 0.03, 0.022, COLS[i % 4], lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 }); });
  for (const s of [-1, 1]) lp.push([s * 0.06, 0.66, 0.05], 0, 0, s * 0.5).blob(0, 0, 0, 0.06, 0.03, 0.02, '#a82a2a', { jitter: 0 }).pop();
  lp.blob(0, 0.66, 0.06, 0.025, 0.025, 0.02, '#a82a2a', { jitter: 0 });
  // neve sulla traversa e sui cappucci dei pilastri
  lp.box(0, 0.735, 0, 0.8, 0.025, 0.06, '#eef2f4', { jitter: 0.004 });
  for (const x of [-0.45, 0.45]) lp.blob(x, 0.94, 0, 0.08, 0.04, 0.08, '#eef2f4', { jitter: 0.005 });
  if (lit) lp.light(0, 0.75, 0.15, '#ffd04a', 0.5, 2.8, 0.3, 0.5);
  return lp.build();
}

/** Panchina con il cuore per i fantasmi innamorati (2×1, febbraio). */
export function loversBenchLP(lit = true): LPModel {
  const lp = new LP('new:lovers');
  lp.box(0, 0.36, 0, 1.7, 0.05, 0.45, LPC.wood, { bevel: 0.01, vary: 0.08 });
  lp.box(0, 0.5, -0.22, 1.7, 0.34, 0.05, LPC.wood, { bevel: 0.01, vary: 0.08 });
  for (const s of [-1, 1]) for (const z of [-0.17, 0.17]) lp.box(s * 0.78, 0, z, 0.06, 0.36, 0.06, LPC.iron, { jitter: 0 });
  // cuore di rose sullo schienale e petali a terra
  const heart = new THREE.Shape();
  heart.moveTo(0, -0.12); heart.bezierCurveTo(-0.2, 0.02, -0.12, 0.16, 0, 0.07); heart.bezierCurveTo(0.12, 0.16, 0.2, 0.02, 0, -0.12);
  lp.push([0, 0.98, -0.22]).extrude(heart, 0.04, lit ? '#ff6a8a' : '#8e2f4a', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 }).pop();
  tube(lp, [0, 0.84, -0.22], [0, 0.88, -0.22], 0.01, LPC.iron);
  const r = lp.rng;
  for (let i = 0; i < 14; i++) lp.blob(r.range(-0.6, 0.6), 0.005, r.range(0.1, 0.5), 0.025, 0.006, 0.02, i % 2 ? '#c84a5a' : '#e07a8a', { jitter: 0 });
  if (lit) lp.light(0, 1.0, 0, '#ff6a8a', 0.5, 2.6, 0.3, 0.6);
  return lp.build();
}

// ── Oggetti di scena delle presenze ─────────────────────────────────────

/** Palchetto della banda di scheletri: pedana, leggii e strumenti appoggiati; `back` lo sposta indietro (davanti si balla). */
export function bandStageLP(lit = true, back = 0): LPModel {
  const lp = new LP('new:band');
  lp.push([0, 0, back]);
  for (let i = 0; i < 8; i++) lp.box(-1.25 + i * 0.36, 0, -0.1, 0.34, 0.12, 1.6, i % 2 ? LPC.wood : LPC.woodDark, { bevel: 0.006, vary: 0.1 });
  for (const x of [-0.9, 0.9]) {
    lp.cyl(x, 0.12, -0.25, 0.015, 0.015, 0.75, 4, LPC.iron, { jitter: 0 });
    lp.push([x, 0.86, -0.22], 0, -0.6).box(0, 0, 0, 0.3, 0.2, 0.015, LPC.iron, { jitter: 0 }).pop();
    lp.push([x, 0.87, -0.21], 0, -0.6).box(0, 0, 0.01, 0.24, 0.16, 0.005, '#e2d6bb', { jitter: 0 }).pop();
  }
  // batteria davanti al batterista (che sta dietro, al centro): grancassa col teschio dipinto
  // rivolta al pubblico, rullante, tom, charleston e piatto
  const kz = -0.12;
  lp.push([0, 0.29, kz], Math.PI / 2).cyl(0, -0.09, 0, 0.17, 0.17, 0.18, 14, '#8e2f2a', { jitter: 0 }).pop();
  lp.push([0, 0.29, kz + 0.095], Math.PI / 2).cyl(0, 0, 0, 0.155, 0.155, 0.01, 14, '#e8dcc0', { jitter: 0 }).pop();
  skull(lp, 0, 0.26, kz + 0.1, 0.55);
  for (const s of [-1, 1]) lp.push([s * 0.17, 0.12, kz + 0.08], 0, 0, s * 0.5).cyl(0, 0, 0, 0.012, 0.012, 0.12, 4, LPC.iron, { jitter: 0 }).pop();
  lp.cyl(0.05, 0.47, kz - 0.05, 0.08, 0.08, 0.08, 10, '#8e2f2a', { jitter: 0 }); // tom sulla grancassa
  lp.cyl(0.05, 0.55, kz - 0.05, 0.075, 0.075, 0.006, 10, '#e8dcc0', { jitter: 0 });
  lp.cyl(-0.3, 0.12, kz - 0.18, 0.012, 0.012, 0.42, 4, LPC.iron, { jitter: 0 }); // rullante sul suo treppiede
  lp.cyl(-0.3, 0.52, kz - 0.18, 0.11, 0.11, 0.08, 10, '#c8c2b4', { jitter: 0 });
  lp.cyl(-0.3, 0.6, kz - 0.18, 0.105, 0.105, 0.006, 10, '#efe8da', { jitter: 0 });
  for (const [x, z, h, r] of [[0.34, kz - 0.22, 0.62, 0.13], [-0.18, kz - 0.42, 0.82, 0.16]] as const) {
    lp.cyl(x, 0.12, z, 0.01, 0.01, h, 4, LPC.iron, { jitter: 0 });
    lp.push([x, 0.12 + h, z], 0, 0, x > 0 ? 0.2 : -0.15).cyl(0, 0, 0, r, 0.02, 0.025, 12, LPC.gold, { jitter: 0 }).pop();
  }
  lp.cyl(0, 0.12, kz - 0.55, 0.12, 0.1, 0.32, 8, LPC.woodDark, { jitter: 0 }); // sgabello
  // lanterne agli angoli del palco
  for (const s of [-1, 1]) {
    lp.cyl(s * 1.3, 0.12, 0.6, 0.02, 0.02, 1.0, 5, LPC.woodDark, { jitter: 0 });
    lp.blob(s * 1.3, 1.12, 0.6, 0.05, 0.07, 0.05, lit ? LPC.lantern : '#3c3a35', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  }
  // una luce piccola per lanterna, così il palco è illuminato dai lati e non da una macchia al centro
  if (lit) for (const s of [-1, 1]) lp.light(s * 1.3, 1.1, 0.6, LPC.lantern, 0.4, 2.6, 0.25, 0.3);
  lp.pop();
  return lp.build();
}

/** Strumenti in mano agli scheletri: chitarra (manico verso sinistra), tromba, bacchette. */
export function instrumentLP(kind: 'guitar' | 'trumpet' | 'sticks'): LPModel {
  const lp = new LP(`new:instr:${kind}`);
  lp.push([0, 0, 0], 0, 0, 0, 2);
  if (kind === 'guitar') {
    // cassa a otto (due lobi), buca, ponticello, manico lungo con la paletta e le meccaniche
    lp.blob(0.03, 0, 0, 0.075, 0.068, 0.028, '#b0662e', { jitter: 0 });
    lp.blob(-0.05, 0, 0, 0.058, 0.054, 0.028, '#b0662e', { jitter: 0 });
    lp.push([-0.035, 0, 0.026], Math.PI / 2).cyl(0, 0, 0, 0.022, 0.022, 0.004, 10, '#2a1a10', { jitter: 0 }).pop();
    lp.box(0.05, 0, 0.027, 0.012, 0.05, 0.006, '#2a1a10', { jitter: 0 });
    lp.box(-0.2, 0, 0.012, 0.2, 0.024, 0.014, '#5a3a22', { jitter: 0 });
    lp.box(-0.32, 0, 0.012, 0.05, 0.034, 0.016, '#2a1a10', { jitter: 0 });
    for (const s of [-1, 1]) for (const x of [-0.335, -0.31]) lp.box(x, s * 0.022, 0.012, 0.008, 0.01, 0.008, LPC.ironLight, { jitter: 0 });
    for (const y of [-0.008, 0, 0.008]) lp.box(-0.13, y, 0.031, 0.36, 0.002, 0.002, '#e8e2d0', { jitter: 0 });
  } else if (kind === 'trumpet') {
    tube(lp, [0, 0, 0], [0, 0, 0.22], 0.015, LPC.gold);
    lp.push([0, 0, 0.22], 0, Math.PI / 2).cyl(0, 0, 0, 0.02, 0.06, 0.08, 9, LPC.gold, { jitter: 0, open: true }).pop();
    lp.box(0, -0.03, 0.08, 0.04, 0.05, 0.06, LPC.gold, { jitter: 0 });
  } else {
    for (const s of [-1, 1]) tube(lp, [0, 0, 0], [s * 0.02, 0.0, 0.2], 0.007, LPC.woodLight, 4);
  }
  lp.pop();
  return lp.build();
}

/** Picnic dei fantasmi (2×2): tovaglia a quadri, cestino, tazze e torta col teschio. */
export function picnicLP(): LPModel {
  const lp = new LP('new:picnic');
  for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) lp.box(-0.75 + i * 0.3, 0, -0.75 + k * 0.3, 0.3, 0.012, 0.3, (i + k) % 2 ? '#c84a4a' : '#e8e0d0', { jitter: 0 });
  lp.box(0.45, 0.012, -0.35, 0.4, 0.26, 0.28, '#a07a4a', { bevel: 0.02, vary: 0.12 });
  tube(lp, [0.28, 0.27, -0.35], [0.62, 0.27, -0.35], 0.012, '#7a5a3a');
  lp.push([0.45, 0.27, -0.35]).cyl(0, 0, 0, 0.17, 0.17, 0.01, 8, '#a07a4a', { jitter: 0 }).pop();
  lp.cyl(-0.1, 0.012, 0.0, 0.16, 0.15, 0.1, 10, '#6b4a3a', { jitter: 0 });
  lp.cyl(-0.1, 0.11, 0.0, 0.15, 0.15, 0.02, 10, '#e8e0d0', { jitter: 0 });
  skull(lp, -0.1, 0.13, 0.0, 0.5, '#f2ece0');
  for (const [x, z] of [[-0.45, 0.4], [0.3, 0.42]]) { lp.cyl(x, 0.012, z, 0.04, 0.035, 0.07, 8, '#d8d0c0', { jitter: 0 }); lp.cyl(x, 0.07, z, 0.034, 0.034, 0.005, 8, '#5a3a28', { jitter: 0 }); }
  for (let i = 0; i < 4; i++) flower(lp, 0.8 + (i % 2) * 0.08, -0.8 + i * 0.07, LPC.flowers[i], 0.12);
  return lp.build();
}

/** Bara del vampiro (2×1): bara rossa e nera col coperchio scostato e i candelabri. */
export function vampireCoffinLP(lit = true): LPModel {
  const lp = new LP('new:vampire');
  const coffin = new THREE.Shape();
  coffin.moveTo(-0.22, -0.7); coffin.lineTo(0.22, -0.7); coffin.lineTo(0.32, 0.25); coffin.lineTo(0.22, 0.7); coffin.lineTo(-0.22, 0.7); coffin.lineTo(-0.32, 0.25); coffin.closePath();
  lp.box(0, 0, 0, 1.4, 0.06, 0.95, LPC.stoneDark, { bevel: 0.015 });
  lp.push([0, 0.06, 0], Math.PI / 2, -Math.PI / 2).plate(coffin, 0.3, '#2a1a1e', { vary: 0.06 }).pop();
  lp.push([0, 0.37, 0], Math.PI / 2, -Math.PI / 2, 0, [0.88, 0.92, 1]).plate(coffin, 0.01, '#8e1f2a', { ao: 0 }).pop();
  // coperchio appoggiato di traverso con la croce rovesciata… meglio un pipistrello d'argento
  lp.push([0.12, 0.42, 0.32], Math.PI / 2 + 0.35, -Math.PI / 2 + 0.12).plate(coffin, 0.05, '#3a2228', { vary: 0.06 }).pop();
  for (const s of [-1, 1]) {
    lp.cyl(s * 0.62, 0.06, -0.3, 0.06, 0.03, 0.5, 6, LPC.iron, { jitter: 0 });
    candle(lp, s * 0.62, 0.56, -0.3, lit, 0.14);
  }
  lp.blob(-0.5, 0.06, 0.38, 0.08, 0.05, 0.08, '#8e1f2a', { jitter: 0 });
  if (lit) lp.light(0, 0.8, -0.3, LPC.flame, 0.7, 3.5, 0.3, 0.7);
  return lp.build();
}

/** Calderone della strega (2×2): sul fuoco, ribolle di verde, con ingredienti sparsi. */
export function cauldronLP(lit = true): LPModel {
  const lp = new LP('new:cauldron');
  const r = lp.rng;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; lp.blob(Math.cos(a) * 0.45, 0.04, Math.sin(a) * 0.45, 0.1, 0.07, 0.09, LPC.stone, { vary: 0.1 }); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; tube(lp, [Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3], [-Math.cos(a) * 0.1, 0.12, -Math.sin(a) * 0.1], 0.035, '#4a3628', 5); }
  if (lit) { lp.cyl(0, 0.05, 0, 0.2, 0.0, 0.25, 6, LPC.flame, { bucket: 'glow', jitter: 0.02 }); lp.light(0, 0.25, 0, '#ff9a3c', 0.9, 4, 0.5, 0.8); }
  for (const s of [-1, 1]) tube(lp, [s * 0.42, 0, 0], [s * 0.36, 0.5, 0], 0.03, LPC.iron, 5);
  lp.lathe(0, 0.18, 0, [[0.0, 0], [0.22, 0.02], [0.38, 0.14], [0.42, 0.32], [0.36, 0.52], [0.34, 0.56], [0.38, 0.58], [0.36, 0.6], [0.3, 0.58], [0.3, 0.54], [0.0, 0.54]], 12, '#2a2b30', { jitter: 0, vary: 0.04 });
  const brew = glow(lit, '#9af06a', '#3a4a2a');
  lp.cyl(0, 0.7, 0, 0.3, 0.3, 0.015, 12, brew.color, { bucket: brew.bucket, jitter: 0 });
  for (let i = 0; i < 7; i++) lp.blob(r.range(-0.2, 0.2), 0.72 + r.next() * 0.05, r.range(-0.2, 0.2), 0.04, 0.035, 0.04, lit ? '#c8ff9a' : '#4a5a3a', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  for (let i = 0; i < 4; i++) lp.blob(r.range(-0.15, 0.15), 0.9 + i * 0.15, r.range(-0.1, 0.1), 0.08 + i * 0.03, 0.06, 0.08, '#a8d8a0', { bucket: 'ghost', jitter: 0.01 });
  // ingredienti: boccette, funghi, un rospo
  for (const [x, z, c] of [[0.65, 0.4, '#8a5ad0'], [0.75, 0.2, '#e04a7a'], [-0.7, 0.45, '#4ab0d0']] as const) { lp.cyl(x, 0, z, 0.05, 0.04, 0.12, 7, c, { bucket: 'glow', jitter: 0 }); lp.cyl(x, 0.12, z, 0.02, 0.02, 0.04, 5, '#6b4a3a', { jitter: 0 }); }
  lp.blob(-0.6, 0.06, -0.5, 0.09, 0.06, 0.08, '#5a7a3a', { jitter: 0.005 });
  for (const s of [-1, 1]) lp.blob(-0.6 + s * 0.04, 0.12, -0.44, 0.018, 0.018, 0.018, '#e8d48a', { jitter: 0 });
  if (lit) lp.light(0, 0.8, 0, '#9af06a', 0.6, 3, 0.4, 0.8);
  return lp.build();
}

/** Lastra di pietra calda al sole per i gatti neri (2×2). */
export function sunSlabLP(): LPModel {
  const lp = new LP('new:slab');
  lp.box(0, 0, 0, 1.6, 0.12, 1.1, LPC.stoneLight, { bevel: 0.03, vary: 0.08, topTint: LPC.moss, topAmount: 0.2 });
  lp.box(-0.5, 0.12, -0.3, 0.5, 0.06, 0.4, LPC.stone, { bevel: 0.02 });
  for (const [x, z] of [[0.7, 0.5], [-0.75, 0.48]]) { flower(lp, x, z, LPC.flowers[2], 0.14); grassTuft(lp, x - 0.08, z, 0.8); }
  lp.cyl(0.55, 0.12, -0.35, 0.08, 0.07, 0.04, 9, '#d8d0c0', { jitter: 0 }); // ciotola del latte
  lp.cyl(0.55, 0.15, -0.35, 0.07, 0.07, 0.01, 9, '#f2ece0', { jitter: 0 });
  return lp.build();
}

// ── Extra ───────────────────────────────────────────────────────────────

/** Carriola del becchino: cassone di legno con la ruota, pala e terra. */
export function wheelbarrowLP(): LPModel {
  const lp = new LP('new:barrow');
  lp.push([0, 0.18, 0]);
  const tray = new THREE.Shape(); tray.moveTo(-0.25, 0); tray.lineTo(0.25, 0); tray.lineTo(0.32, 0.22); tray.lineTo(-0.32, 0.22); tray.closePath();
  lp.push([0, 0, -0.05], Math.PI / 2).extrude(tray, 0.5, LPC.wood, { vary: 0.1 }).pop();
  lp.box(0, 0.2, -0.05, 0.56, 0.06, 0.42, LPC.soil, { jitter: 0.02 });
  lp.pop();
  lp.push([0, 0.12, 0.38], 0, 0, Math.PI / 2).cyl(0, -0.03, 0, 0.12, 0.12, 0.06, 10, '#2a2420', { jitter: 0 }).pop();
  for (const s of [-1, 1]) {
    tube(lp, [s * 0.15, 0.18, 0.3], [s * 0.2, 0.3, -0.7], 0.018, LPC.woodDark);
    tube(lp, [s * 0.15, 0.18, -0.25], [s * 0.15, 0, -0.3], 0.018, LPC.woodDark);
  }
  tube(lp, [0.05, 0.3, 0.2], [0.18, 0.75, -0.25], 0.015, LPC.wood);
  lp.box(0.05, 0.25, 0.25, 0.12, 0.02, 0.16, LPC.ironLight, { jitter: 0 });
  return lp.build();
}

/** Lanterna potenziata del Custode: più grande, con il riflettore e i cristalli. */
export function bigLanternLP(lit = true): LPModel {
  const lp = new LP('new:biglantern');
  lp.box(0, 0, 0, 0.26, 0.04, 0.26, LPC.iron, { bevel: 0.006 });
  const gl = glow(lit, '#ffe2a0');
  lp.box(0, 0.04, 0, 0.2, 0.3, 0.2, gl.color, { bucket: gl.bucket, jitter: 0 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(dx * 0.11, 0.04, dz * 0.11, 0.03, 0.3, 0.03, LPC.gold, { jitter: 0 });
  lp.box(0, 0.34, 0, 0.27, 0.04, 0.27, LPC.gold, { bevel: 0.006 });
  lp.push([0, 0.38, 0], Math.PI / 4).cyl(0, 0, 0, 0.18, 0.03, 0.12, 4, LPC.gold, { jitter: 0 }).pop();
  lp.add(new THREE.TorusGeometry(0.06, 0.012, 5, 12).translate(0, 0.56, 0), LPC.gold, { jitter: 0 });
  for (const a of [0.4, 2.0, 3.6, 5.2]) lp.blob(Math.cos(a) * 0.08, 0.12, Math.sin(a) * 0.08, 0.025, 0.05, 0.025, '#9af0ff', { bucket: 'glow', jitter: 0 });
  if (lit) lp.light(0, 0.2, 0, '#ffe2a0', 1.4, 8, 0.15, 1.6);
  return lp.build();
}

/** Scopa volante: manico storto, saggina legata e le stelline della magia. */
export function broomLP(): LPModel {
  const lp = new LP('new:broom');
  tube(lp, [0, 0, 0.55], [0, 0.02, -0.35], 0.025, LPC.woodDark, 6);
  tube(lp, [0, 0.02, -0.35], [0, 0.05, -0.45], 0.024, LPC.woodDark, 6);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; tube(lp, [0, 0.03, -0.42], [Math.cos(a) * 0.12, 0.03 + Math.sin(a) * 0.1, -0.85], 0.012, i % 2 ? '#c9a75e' : '#a8884a', 3); }
  lp.cyl(0, 0.0, -0.42, 0.04, 0.04, 0.06, 7, '#8e2f2a', { jitter: 0 });
  for (let i = 0; i < 5; i++) lp.blob(lp.rng.range(-0.15, 0.15), lp.rng.range(-0.1, 0.1), -0.9 - i * 0.12, 0.02, 0.02, 0.02, '#fff0a0', { bucket: 'glow', jitter: 0 });
  return lp.build();
}

/** Calamita per i fuochi fatui: ferro di cavallo rosso con le punte d'argento su un piedistallo. */
export function wispMagnetLP(lit = true): LPModel {
  const lp = new LP('new:magnet');
  lp.cyl(0, 0, 0, 0.18, 0.16, 0.08, 8, LPC.stoneDark, { jitter: 0 });
  lp.cyl(0, 0.08, 0, 0.04, 0.04, 0.35, 6, LPC.iron, { jitter: 0 });
  lp.add(new THREE.TorusGeometry(0.16, 0.055, 6, 14, Math.PI).rotateZ(Math.PI).translate(0, 0.62, 0), '#b8302a', { jitter: 0 });
  for (const s of [-1, 1]) {
    lp.box(s * 0.16, 0.62, 0, 0.11, 0.18, 0.11, '#b8302a', { jitter: 0 });
    lp.box(s * 0.16, 0.8, 0, 0.115, 0.08, 0.115, '#d8dce0', { jitter: 0 });
  }
  for (let i = 0; i < 4; i++) lp.blob(-0.15 + i * 0.1, 1.0 + (i % 2) * 0.08, 0.02, 0.035, 0.05, 0.035, lit ? '#8ff0dc' : '#3a5a52', lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  if (lit) lp.light(0, 1.0, 0, '#8ff0dc', 0.5, 2.5, 0.4, 0.8);
  return lp.build();
}
