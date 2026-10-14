// Albero dei ricordi (low-poly): un grande albero antico con le radici che
// abbracciano il terreno e una cavità alla base, dove la terra "assorbe" le
// bare. Per ogni ricordo affidato alla chioma si accende un frutto-lanterna
// appeso. Anche la bara chiusa del rito.

import * as THREE from 'three';
import { LP, type LPModel, type LPOpts } from './kit.ts';
import { LPC } from './palette.ts';
import { flower, moss, pebbles } from './details.ts';
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

/** Ciuffo di chioma: una massa grande e qualche ciuffo laterale. */
function crown(lp: LP, c: THREE.Vector3, s: number) {
  const r = lp.rng;
  lp.blob(c.x, c.y, c.z, s, s * 0.62, s, r.pick(CANOPY), { vary: 0.12, ao: 0.3, jitter: s * 0.2 });
  for (let i = 0; i < 5; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(0.5, 0.85);
    const k = r.range(0.4, 0.6);
    const col = r.chance(0.14) ? r.pick(LILAC) : r.pick(CANOPY);
    lp.blob(c.x + Math.cos(a) * s * d, c.y + r.range(-s * 0.2, s * 0.35), c.z + Math.sin(a) * s * d, s * k * (col.startsWith('#8') || col.startsWith('#9') ? 0.7 : 1), s * k * 0.75, s * k, col, { vary: 0.14, ao: 0.2, jitter: s * k * 0.25 });
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
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r.range(-0.06, 0.06);
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.3) continue; // varco davanti, per il corteo
    const d = 1.82 + r.range(-0.05, 0.05);
    lp.blob(Math.cos(a) * d, 0.04, Math.sin(a) * d, 0.17, 0.08, 0.13, r.pick([LPC.stone, LPC.stoneWarm, LPC.stoneLight]), { vary: 0.1, topTint: LPC.moss, topAmount: 0.4, jitter: 0.03 });
  }
  for (let i = 0; i < 9; i++) { const a = r.range(0, 6.28), d = r.range(1.1, 1.7); flower(lp, Math.cos(a) * d, Math.sin(a) * d, r.pick(LPC.flowers), 0.08 + r.next() * 0.06); }
  for (let i = 0; i < 5; i++) { const a = r.range(0, 6.28); moss(lp, Math.cos(a) * 0.9, 0.02, Math.sin(a) * 0.9, 0.12); }
  pebbles(lp, -1.6, -1.6, 1.6, 1.6, 5);
  mushroom(lp, -0.95, 0.55, 0.08, '#8f7aa8', true, 0.05);
  mushroom(lp, -1.05, 0.68, 0.05, '#8f7aa8', true, 0.035);
  mushroom(lp, 1.1, -0.4, 0.07, LPC.red, false, 0.045);
  // targa di pietra davanti, inclinata
  lp.push([0.62, 0, 1.55], -0.25, -0.15).box(0, 0, 0, 0.42, 0.26, 0.08, LPC.stoneLight, { bevel: 0.02, vary: 0.08, topTint: LPC.moss, topAmount: 0.3 })
    .box(0, 0.09, 0.042, 0.3, 0.012, 0.006, LPC.engrave, { jitter: 0 }).box(0, 0.05, 0.042, 0.22, 0.01, 0.006, LPC.engrave, { jitter: 0 }).pop();

  // ── radici che abbracciano il terreno (più grosse verso la cavità)
  // radici basse e nodose che serpeggiano sul terreno: catene di blocchi schiacciati, sempre più piccoli
  const root = (a: number, out: number, bend: number, k0 = 1) => {
    const steps: Array<[number, number, number, number, number]> = [[0.4, 0.2, 0.3, 0.2, 0.18], [0.72, 0.11, 0.26, 0.12, 0.13], [1.02, 0.06, 0.21, 0.08, 0.1], [1.3, 0.035, 0.15, 0.05, 0.07]];
    steps.forEach(([d, y, rx, ry, rz], k) => {
      const t = d / 1.3, aa = a + bend * t * t;
      lp.push([Math.cos(aa) * d * out, y, Math.sin(aa) * d * out], -aa).blob(0, 0, 0, rx * k0, ry * k0, rz * k0, k ? BARK : BARK_L, { vary: 0.1, ao: 0.15, jitter: 0.02, topTint: LPC.moss, topAmount: 0.35 }).pop();
    });
  };
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2 + r.range(-0.12, 0.12);
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.45) continue; // davanti c'è la cavità
    root(a, 1 + r.range(0, 0.3), r.range(-0.35, 0.35));
  }

  // ── tronco: tre fusti intrecciati che salgono girando
  const H = 2.1;
  for (let k = 0; k < 3; k++) {
    let prev = V(Math.cos(k * 2.1) * 0.22, 0, Math.sin(k * 2.1) * 0.22);
    for (let j = 1; j <= 5; j++) {
      const t = j / 5, a = k * 2.1 + t * 1.6;
      const rad = 0.22 * (1 - t * 0.35);
      const p = V(Math.cos(a) * rad, t * H, Math.sin(a) * rad);
      limb(lp, prev, p, 0.3 - (t - 0.2) * 0.12, 0.28 - t * 0.12, [BARK, BARK_L, BARK_D][k], { ao: 0.25 });
      prev = p;
    }
  }
  // cavità alla base, davanti: un arco scuro con un tenue chiarore (qui la terra accoglie le bare)
  lp.push([0, 0, 0.47]).blob(0, 0.3, 0, 0.24, 0.34, 0.1, LPC.charcoal, { jitter: 0.01, ao: 0 })
    .blob(0, 0.18, 0.03, 0.14, 0.15, 0.06, memories > 0 ? '#e9c27a' : '#4a3a2a', { bucket: memories > 0 ? 'glow' : 'solid', jitter: 0, ao: 0 }).pop();
  // due radici più grosse fanno da stipiti alla cavità
  for (const sx of [-1, 1]) root(Math.PI / 2 + sx * 0.55, 0.9, sx * 0.25, 1.15);
  // nodi, funghi a mensola, edera
  for (let i = 0; i < 3; i++) { const a = r.range(0, 6.28); lp.blob(Math.cos(a) * 0.3, 0.8 + i * 0.4, Math.sin(a) * 0.3, 0.07, 0.09, 0.07, BARK_D, { jitter: 0.01 }); }
  for (let i = 0; i < 7; i++) lp.push([0.29 * Math.sin(i * 0.9 + 2), 0.3 + i * 0.22, 0.29 * Math.cos(i * 0.9 + 2)], i * 0.9 + 2).blob(0, 0, 0.02, 0.06, 0.04, 0.025, i % 2 ? LPC.leaf : LPC.moss, { jitter: 0.008 }).pop();

  // ── rami principali e chioma ampia a ombrello
  const crowns: Array<{ c: THREE.Vector3; s: number }> = [];
  const top = V(0, H, 0);
  crowns.push({ c: V(0, H + 1.25, 0), s: 0.9 });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 1; crowns.push({ c: V(Math.cos(a) * 0.65, H + 1.05, Math.sin(a) * 0.65), s: 0.62 }); }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4 + r.range(-0.2, 0.2);
    const reach = 1.35 + r.range(0, 0.35);
    const mid = V(Math.cos(a) * reach * 0.5, H + 0.45 + r.range(0, 0.2), Math.sin(a) * reach * 0.5);
    const tip = V(Math.cos(a) * reach, H + 0.55 + r.range(-0.1, 0.25), Math.sin(a) * reach);
    limb(lp, top, mid, 0.16, 0.1, BARK);
    limb(lp, mid, tip, 0.1, 0.04, BARK_L, {}, 5);
    // rametto che scende (ci si appendono i frutti)
    limb(lp, mid, mid.clone().add(V(Math.cos(a + 0.8) * 0.3, -0.25, Math.sin(a + 0.8) * 0.3)), 0.05, 0.015, BARK_D, {}, 4);
    crowns.push({ c: tip.clone().add(V(0, 0.25, 0)), s: 0.6 + r.range(0, 0.15) });
  }
  for (const { c, s } of crowns) crown(lp, c, s);

  // ── frutti-ricordo: uno per ricordo, appesi a un filo sotto la chioma; senza ricordi, qualche bocciolo chiuso
  const shown = Math.min(30, memories);
  const spots = fruitSpots(crowns.slice(5), Math.max(shown, 6)); // sotto i ciuffi esterni: si vedono dalla camera
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
