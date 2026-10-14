// Albero dei ricordi (low-poly): un grande albero antico con le radici che
// abbracciano il terreno e una cavità alla base, dove la terra "assorbe" le
// bare. Per ogni ricordo affidato alla chioma si accende un frutto-lanterna
// appeso. Anche la bara chiusa del rito.

import * as THREE from 'three';
import { LP, type LPModel, type LPOpts } from './kit.ts';
import { LPC } from './palette.ts';
import { bouquet, candle, cobweb, deadLeaves, flower, graveLight, hangingLantern, moss, pebbles, pumpkin, vase, wreath } from './details.ts';
import { mushroom } from './nature.ts';

/** Chioma: salvia argentata con riflessi lilla (né autunno né spettrale: è un albero a sé). */
const CANOPY = ['#5f7d6c', '#6e8f7b', '#58705f', '#7a9483', '#66806e'] as const;
const LILAC = ['#8a82a6', '#9a8fb5'] as const; // solo qualche ciuffo, come fiori
const BARK = '#4a3a33', BARK_D = '#3a2d28', BARK_L = '#5c4a40';
export const MEMORY_GLOW = '#ffd98a';

/** Cilindro affusolato tra due punti (spazio corrente del kit). */
function limb(lp: LP, a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, color: string, o: LPOpts = {}, seg = 6) {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  lp.add(g.translate(a.x, a.y, a.z), color, { vary: 0.1, ao: 0.1, jitter: r0 * 0.15, ...o });
}

/** Ciuffo di chioma come quelli degli alberi del gioco: una massa, due ciuffi di lato, qualche foglia che sporge. */
function leafy(lp: LP, c: THREE.Vector3, s: number) {
  const r = lp.rng;
  const lilac = r.chance(0.09);
  const base = lilac ? r.pick(LILAC) : r.pick(CANOPY);
  const k = lilac ? 0.6 : 1;
  lp.blob(c.x, c.y, c.z, s * k, s * 0.72 * k, s * k, base, { vary: 0.14, ao: 0.25, jitter: s * 0.22, detail: 1 });
  for (let i = 0; i < 2; i++) {
    const a = r.range(0, Math.PI * 2);
    lp.blob(c.x + Math.cos(a) * s * 0.6, c.y + r.range(-0.02, s * 0.35), c.z + Math.sin(a) * s * 0.6, s * 0.55 * k, s * 0.45 * k, s * 0.55 * k, lilac ? base : r.pick(CANOPY), { vary: 0.14, ao: 0.15, jitter: s * 0.18 });
  }
  for (let i = 0; i < 3; i++) {
    const a = r.range(0, Math.PI * 2);
    lp.push([c.x + Math.cos(a) * s * 0.95, c.y + r.range(-0.05, 0.08), c.z + Math.sin(a) * s * 0.95], -a, r.range(-0.4, 0.4), 0.4)
      .blob(0, 0, 0, s * 0.3, 0.012, s * 0.17, base, { jitter: 0, vary: 0.12, ao: 0 }).pop();
  }
}

/** Punti di appoggio dei frutti-ricordo sotto la chioma (deterministici, dal più vicino al tronco). */
function fruitSpots(crowns: Array<{ c: THREE.Vector3; s: number }>, n: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; out.length < n && i < 200; i++) {
    const cr = crowns[i % crowns.length];
    const a = i * 2.399 + cr.c.x; // angolo aureo: si distribuiscono senza ammucchiarsi
    const d = cr.s * (0.55 + ((i * 0.37) % 0.4));
    out.push(new THREE.Vector3(cr.c.x + Math.cos(a) * d, cr.c.y - cr.s * 0.45, cr.c.z + Math.sin(a) * d));
  }
  return out;
}

/**
 * Albero dei ricordi, ingombro 4×4 (origine al centro della base).
 * `memories`: quanti ricordi gli sono stati affidati (frutti accesi, fino a 30).
 */
export function memoryTreeLP(memories: number, seed = 1): LPModel {
  const lp = new LP(`lp:memorytree:${seed}:${Math.min(30, memories)}`);
  const r = lp.rng;
  lp.push([0, 0, 0], 0, 0, 0, 1.4); // grande: domina il cimitero
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  // ── a terra: anello di pietre basse con muschio, fiori, la targa davanti
  const FRONT = Math.PI / 2;
  const nearFront = (a: number, w: number) => Math.abs(Math.atan2(Math.sin(a - FRONT), Math.cos(a - FRONT))) < w;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r.range(-0.06, 0.06);
    if (nearFront(a, 0.3)) continue; // varco davanti, per il corteo
    const d = 1.82 + r.range(-0.05, 0.05);
    lp.blob(Math.cos(a) * d, 0.04, Math.sin(a) * d, 0.17, 0.08, 0.13, r.pick([LPC.stone, LPC.stoneWarm, LPC.stoneLight]), { vary: 0.1, topTint: LPC.moss, topAmount: 0.4, jitter: 0.03 });
  }
  // ai lati del varco due cippi con il lumino rosso, come all'ingresso di una cappella
  for (const sx of [-1, 1]) {
    lp.box(sx * 0.42, 0, 1.82, 0.16, 0.26, 0.16, LPC.stoneLight, { bevel: 0.015, vary: 0.08, topTint: LPC.moss, topAmount: 0.3 });
    graveLight(lp, sx * 0.42, 0.26, 1.82);
  }
  for (let i = 0; i < 9; i++) { const a = r.range(0, 6.28), d = r.range(1.1, 1.7); flower(lp, Math.cos(a) * d, Math.sin(a) * d, r.pick(LPC.flowers), 0.08 + r.next() * 0.06); }
  for (let i = 0; i < 5; i++) { const a = r.range(0, 6.28); moss(lp, Math.cos(a) * 0.9, 0.02, Math.sin(a) * 0.9, 0.12); }
  pebbles(lp, -1.6, -1.6, 1.6, 1.6, 5);
  deadLeaves(lp, -1.5, -1.5, 1.5, 1.5, 14);
  mushroom(lp, -0.95, 0.55, 0.08, '#8f7aa8', true, 0.05);
  mushroom(lp, -1.05, 0.68, 0.05, '#8f7aa8', true, 0.035);
  mushroom(lp, 1.1, -0.4, 0.07, LPC.red, false, 0.045);
  // targa di pietra davanti, inclinata, e un vaso di fiori lasciato da qualcuno
  lp.push([0.7, 0, 1.45], -0.25, -0.15).box(0, 0, 0, 0.42, 0.26, 0.08, LPC.stoneLight, { bevel: 0.02, vary: 0.08, topTint: LPC.moss, topAmount: 0.3 })
    .box(0, 0.09, 0.042, 0.3, 0.012, 0.006, LPC.engrave, { jitter: 0 }).box(0, 0.05, 0.042, 0.22, 0.01, 0.006, LPC.engrave, { jitter: 0 }).pop();
  vase(lp, -0.8, 1.3);
  pumpkin(lp, -1.15, 0, 0.85, 0.11, true, false, 0.6);

  // ── colletto: il tronco si allarga alla base e da lì partono le radici (tutto un pezzo)
  lp.lathe(0, 0, 0, [[0.8, 0], [0.66, 0.06], [0.52, 0.18], [0.43, 0.4], [0.38, 0.75], [0.36, 0.95]], 11, BARK, { vary: 0.1, ao: 0.3, jitter: 0.03, topTint: LPC.moss, topAmount: 0.2 });
  // radici: tubi continui che escono dal colletto e scendono a serpeggiare sul terreno, con i nodi arrotondati
  const root = (a: number, out: number, bend: number, k0 = 1) => {
    const pts: Array<[number, number, number]> = [[0.3, 0.5, 0.19], [0.62, 0.17, 0.15], [0.95, 0.07, 0.1], [1.28 * out, 0.035, 0.065], [1.6 * out, 0.02, 0.03]]; // distanza, altezza, raggio
    let prev: { p: THREE.Vector3; rad: number } | null = null;
    pts.forEach(([d, y, rad], k) => {
      const t = k / (pts.length - 1), aa = a + bend * t * t;
      const p = V(Math.cos(aa) * d, y, Math.sin(aa) * d);
      if (prev) limb(lp, prev.p, p, prev.rad * k0, rad * k0, k < 3 ? BARK : BARK_D, { topTint: LPC.moss, topAmount: 0.35, jitter: 0.01 }, 7);
      if (k > 0 && k < pts.length - 1) lp.blob(p.x, p.y, p.z, rad * k0 * 1.08, rad * k0 * 0.95, rad * k0 * 1.08, BARK, { jitter: 0.008, vary: 0.08, topTint: LPC.moss, topAmount: 0.35 });
      prev = { p, rad };
    });
  };
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2 + r.range(-0.12, 0.12);
    if (nearFront(a, 0.45)) continue; // davanti c'è la cavità
    root(a, 1 + r.range(0, 0.25), r.range(-0.35, 0.35));
  }

  // ── tronco: tre fusti intrecciati che salgono girando
  const H = 2.1;
  for (let k = 0; k < 3; k++) {
    let prev = V(Math.cos(k * 2.1) * 0.22, 0.2, Math.sin(k * 2.1) * 0.22);
    for (let j = 1; j <= 5; j++) {
      const t = j / 5, a = k * 2.1 + t * 1.6;
      const rad = 0.22 * (1 - t * 0.35);
      const p = V(Math.cos(a) * rad, 0.2 + t * (H - 0.2), Math.sin(a) * rad);
      limb(lp, prev, p, 0.3 - (t - 0.2) * 0.12, 0.28 - t * 0.12, [BARK, BARK_L, BARK_D][k], { ao: 0.25 });
      prev = p;
    }
  }
  // cavità alla base, davanti: un arco scuro con un tenue chiarore (qui la terra accoglie le bare)
  lp.push([0, 0, 0.5]).blob(0, 0.3, 0, 0.24, 0.34, 0.1, LPC.charcoal, { jitter: 0.01, ao: 0 })
    .blob(0, 0.18, 0.03, 0.14, 0.15, 0.06, memories > 0 ? '#e9c27a' : '#4a3a2a', { bucket: memories > 0 ? 'glow' : 'solid', jitter: 0, ao: 0 }).pop();
  // due radici più grosse fanno da stipiti alla cavità
  for (const sx of [-1, 1]) root(FRONT + sx * 0.6, 0.85, sx * 0.3, 1.1);
  // davanti alla cavità: candele sulle radici, un mazzo di fiori, la corona appesa al tronco
  candle(lp, -0.36, 0.08, 0.72, true, 0.13); candle(lp, -0.25, 0.04, 0.86, true, 0.09); candle(lp, 0.33, 0.07, 0.74, true, 0.11);
  candle(lp, 0.46, 0.03, 0.9, false, 0.07);
  bouquet(lp, 0.12, 0.02, 0.92, 0.9);
  wreath(lp, 0, 0.95, 0.47, -0.15, 0.9);
  cobweb(lp, -0.5, 0.42, 0.42, 0.2);
  // nodi e muschio che sale sul tronco
  for (let i = 0; i < 3; i++) { const a = r.range(0, 6.28); lp.blob(Math.cos(a) * 0.3, 0.8 + i * 0.4, Math.sin(a) * 0.3, 0.07, 0.09, 0.07, BARK_D, { jitter: 0.01 }); }
  for (let i = 0; i < 7; i++) lp.push([0.29 * Math.sin(i * 0.9 + 2), 0.3 + i * 0.22, 0.29 * Math.cos(i * 0.9 + 2)], i * 0.9 + 2).blob(0, 0, 0.02, 0.06, 0.04, 0.025, i % 2 ? LPC.leaf : LPC.moss, { jitter: 0.008 }).pop();

  // ── rami principali verso una chioma ampia a cupola
  const top = V(0, H, 0);
  const lows: THREE.Vector3[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4 + r.range(-0.2, 0.2);
    const reach = 1.35 + r.range(0, 0.3);
    const mid = V(Math.cos(a) * reach * 0.5, H + 0.4 + r.range(0, 0.2), Math.sin(a) * reach * 0.5);
    const tip = V(Math.cos(a) * reach, H + 0.55 + r.range(-0.1, 0.2), Math.sin(a) * reach);
    limb(lp, top, mid, 0.17, 0.1, BARK);
    limb(lp, mid, tip, 0.1, 0.04, BARK_L, {}, 5);
    lows.push(mid.clone().lerp(tip, 0.55));
  }
  // cupola: tanti ciuffi medi su un ellissoide schiacciato (più fitti in alto), con un'anima scura dentro
  const C0 = V(0, H + 0.95, 0);
  lp.blob(C0.x, C0.y - 0.05, C0.z, 1.55, 0.72, 1.55, '#4d6656', { detail: 1, vary: 0.06, ao: 0.35, jitter: 0.05 });
  const crowns: Array<{ c: THREE.Vector3; s: number }> = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N, phi = Math.acos(1 - u * 1.12), th = i * 2.39996;
    const k = 0.9 + r.next() * 0.12;
    crowns.push({ c: V(Math.sin(phi) * Math.cos(th) * 1.85 * k, Math.cos(phi) * 0.9 * k, Math.sin(phi) * Math.sin(th) * 1.85 * k).add(C0), s: 0.27 + r.next() * 0.2 - u * 0.05 });
  }
  for (const { c, s } of crowns) leafy(lp, c, s);
  // nastri votivi legati ai rami bassi e due lanterne appese
  lows.forEach((p, i) => {
    if (i === 1 || i === 4) { hangingLantern(lp, p.x, p.y - 0.02, p.z, true, 0.75); return; }
    const col = ['#d9cdb5', '#9e4b45', '#8f7aa8', '#c9a75e'][i % 4];
    lp.push([p.x, p.y - 0.05, p.z], i * 1.3, 0, 0.15).box(0, -0.32, 0, 0.035, 0.32, 0.006, col, { jitter: 0, vary: 0.06 }).pop();
    lp.push([p.x + 0.04, p.y - 0.05, p.z], i * 1.3 + 0.4, 0, -0.2).box(0, -0.24, 0, 0.03, 0.24, 0.006, col, { jitter: 0, vary: 0.06 }).pop();
  });

  // ── frutti-ricordo: uno per ricordo, appesi a un filo sotto la chioma; senza ricordi, qualche bocciolo chiuso
  const shown = Math.min(30, memories);
  const rim = crowns.filter(({ c }) => c.y < C0.y + 0.35); // sotto i ciuffi del bordo: si vedono dalla camera
  const spots = fruitSpots(rim, Math.max(shown, 6));
  spots.forEach((p, i) => {
    const lit = i < shown;
    const drop = 0.22 + ((i * 0.53) % 0.3);
    lp.box(p.x, p.y - drop, p.z, 0.008, drop, 0.008, '#3a3330', { jitter: 0, ao: 0 });
    if (lit) {
      lp.blob(p.x, p.y - drop - 0.08, p.z, 0.085, 0.11, 0.085, MEMORY_GLOW, { bucket: 'glow', jitter: 0.008, vary: 0.05 });
      lp.push([p.x, p.y - drop + 0.02, p.z]).cyl(0, 0, 0, 0.035, 0.06, 0.035, 5, '#6b5a3a', { jitter: 0 }).pop(); // calice
    } else {
      lp.blob(p.x, p.y - drop - 0.04, p.z, 0.04, 0.06, 0.04, '#7d8f6c', { jitter: 0.006 });
    }
  });
  if (shown > 0) lp.light(0, H + 0.4, 0, '#ffe2a8', 0.5 + Math.min(1, shown / 15) * 0.9, 6 + Math.min(4, shown / 5), 0.15, 1.4);
  lp.pop();
  return lp.build();
}

/** Bara chiusa per il rito (lunga lungo z, origine alla base). */
export function closedCoffinLP(): LPModel {
  const lp = new LP('lp:coffin-closed');
  const prof = (s: number) => {
    const c = new THREE.Shape();
    c.moveTo(-0.22 * s, -0.8 * s); c.lineTo(0.22 * s, -0.8 * s); c.lineTo(0.32 * s, 0.3 * s); c.lineTo(0.2 * s, 0.8 * s); c.lineTo(-0.2 * s, 0.8 * s); c.lineTo(-0.32 * s, 0.3 * s); c.closePath();
    return c;
  };
  lp.push([0, 0, 0], 0, -Math.PI / 2).plate(prof(1), 0.24, '#4a3324', { vary: 0.08, ao: 0.3 }).pop();
  lp.push([0, 0.24, 0], 0, -Math.PI / 2).plate(prof(1.04), 0.06, '#5a3d2a', { vary: 0.08 }).pop();
  lp.box(0, 0.3, 0.12, 0.05, 0.012, 0.32, LPC.gold, { jitter: 0 }); // croce sul coperchio
  lp.box(0, 0.3, 0.22, 0.2, 0.012, 0.05, LPC.gold, { jitter: 0 });
  for (const z of [-0.45, 0.05, 0.5]) for (const s of [-1, 1]) lp.box(s * 0.3, 0.1, z, 0.03, 0.04, 0.12, LPC.gold, { jitter: 0 }); // maniglie
  lp.blob(0.05, 0.31, -0.35, 0.09, 0.03, 0.07, LPC.flowers[0], { jitter: 0.01 }); // fiori sul coperchio
  lp.blob(-0.05, 0.31, -0.42, 0.07, 0.025, 0.06, LPC.flowers[2], { jitter: 0.01 });
  return lp.build();
}

/** Un frutto-ricordo da solo (icona della scheda del ricordo): calice, goccia di luce, una foglia. */
export function memoryFruitLP(): LPModel {
  const lp = new LP('lp:memoryfruit');
  lp.box(0, 0.55, 0, 0.012, 0.25, 0.012, '#3a3330', { jitter: 0 });
  lp.push([0, 0.53, 0]).cyl(0, 0, 0, 0.07, 0.11, 0.06, 6, '#6b5a3a', { jitter: 0 }).pop();
  lp.blob(0, 0.36, 0, 0.17, 0.21, 0.17, MEMORY_GLOW, { bucket: 'glow', jitter: 0.01, vary: 0.05 });
  lp.push([0.06, 0.66, 0], 0.4, 0, -0.9).blob(0.08, 0, 0, 0.11, 0.015, 0.05, CANOPY[1], { jitter: 0 }).pop();
  lp.light(0, 0.36, 0, '#ffe2a8', 0.6, 2, 0.1, 1);
  return lp.build();
}
