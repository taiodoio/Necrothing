// Oggetti «Extra» e nuove costruzioni, nello stile low-poly del gioco:
// - la bicicletta del Custode (telaio color prugna, raggi d'osso, cestino
//   con la zucca e il fanalino), parcheggiata o in sella;
// - il Bar degli zombie: chiosco di legno storto con tendone a strisce,
//   bancone, bottiglie che brillano, botti, sgabelli e lucine.
// I personaggi (Custode, zombie) sono rig separati: qui solo gli oggetti.

import * as THREE from 'three';
import { LP, type LPModel } from './kit.ts';
import { candle, cobweb, pumpkin } from './details.ts';
import { skull } from './extras.ts';
import { LPC } from './palette.ts';
import type { PVis } from '../models/types.ts';

const FRAME = '#4a3550';
const FRAME_DARK = '#33263a';
const TIRE = '#23201d';
const METAL = '#8d8a84';
/** Scala della bici rispetto alle misure di base (sella a 0,47 → 0,61). */
export const BIKE_SCALE = 1.3;

/** Tubo dritto da a a b (nel piano del telaio). */
function tube(lp: LP, a: [number, number, number], b: [number, number, number], r: number, color: string) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  lp.push(a, e.y, e.x, e.z).cyl(0, 0, 0, r, r, len, 6, color, { jitter: 0, ao: 0 }).pop();
}

/** Ruota nel piano YZ: copertone, cerchio, mozzo e raggi d'osso. */
function wheel(lp: LP, z: number, r: number) {
  const y = r;
  lp.push([0, y, z]);
  lp.add(new THREE.TorusGeometry(r - 0.024, 0.026, 6, 18).rotateY(Math.PI / 2), TIRE, { jitter: 0, ao: 0 });
  lp.add(new THREE.TorusGeometry(r - 0.05, 0.008, 4, 18).rotateY(Math.PI / 2), METAL, { jitter: 0, ao: 0 });
  lp.push([0, 0, 0], 0, 0, Math.PI / 2).cyl(0, -0.035, 0, 0.022, 0.022, 0.07, 8, METAL, { jitter: 0 }).pop();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    // raggi a ossicino: stelo sottile con i nodini alle estremità
    lp.push([0, 0, 0], 0, a).cyl(0, 0.02, 0, 0.006, 0.006, r - 0.08, 3, LPC.bone, { jitter: 0, ao: 0 }).blob(0, r - 0.065, 0, 0.012, 0.012, 0.012, LPC.bone, { jitter: 0 }).pop();
  }
  lp.pop();
}

/** Misure della bici (prima della scala): ruote, movimento centrale. */
export const BIKE = { R: 0.17, rearZ: -0.3, frontZ: 0.32, bb: [0, 0.15, -0.02] as [number, number, number] };

/**
 * Bicicletta (muso verso +z). `parked`: inclinata sul cavalletto. `crank`:
 * angolo dei pedali (per l'anteprima). `part`: solo una parte, per animarla
 * in gioco: il telaio, una ruota (centrata sul mozzo) o le pedivelle
 * (centrate sul movimento centrale).
 */
export function bicycleLP(parked = true, crank = 0, part: 'all' | 'frame' | 'wheel' | 'crank' = 'all'): LPModel {
  const lp = new LP(`lp:bike:${parked}:${crank.toFixed(2)}:${part}`);
  // in scala con il Custode (testone kawaii): una bici da adulto un po' tozza
  lp.push([0, 0, 0], 0, 0, 0, BIKE_SCALE);
  const R = BIKE.R;
  const rear: [number, number, number] = [0, R, BIKE.rearZ], front: [number, number, number] = [0, R, BIKE.frontZ];
  const bb = BIKE.bb, seat: [number, number, number] = [0, 0.4, -0.1];
  const head: [number, number, number] = [0, 0.47, 0.21], headLow: [number, number, number] = [0, 0.35, 0.245];
  const all = part === 'all';
  if (part === 'wheel') {
    // centrata sul mozzo: è il perno attorno a cui gira (wheel() la mette a terra, un raggio più su)
    lp.push([0, -R, 0]);
    wheel(lp, 0, R);
    lp.pop();
    lp.pop();
    return lp.build();
  }
  if (part === 'crank') {
    for (const s of [-1, 1]) {
      const a = s > 0 ? 0 : Math.PI;
      const px = s * 0.075, py = Math.cos(a) * 0.07, pz = Math.sin(a) * 0.07;
      tube(lp, [s * 0.06, 0, 0], [px, py, pz], 0.008, METAL);
      lp.box(px + s * 0.02, py - 0.008, pz, 0.05, 0.016, 0.06, TIRE, { jitter: 0 });
    }
    lp.pop();
    return lp.build();
  }
  if (parked) lp.push([0, 0, 0], 0, 0, 0.12); // appoggiata sul cavalletto
  if (all) {
    wheel(lp, rear[2], R);
    wheel(lp, front[2], R);
  }
  // telaio a «cuore» basso (da passeggio): sella, tubo obliquo e tubo superiore curvo
  tube(lp, bb, seat, 0.02, FRAME);
  tube(lp, bb, headLow, 0.022, FRAME);
  tube(lp, [0, 0.33, -0.08], [0, 0.42, 0.2], 0.018, FRAME);
  tube(lp, headLow, head, 0.026, FRAME_DARK);
  for (const x of [-0.04, 0.04]) {
    tube(lp, [x, rear[1], rear[2]], [x * 0.5, bb[1], bb[2]], 0.012, FRAME);
    tube(lp, [x, rear[1], rear[2]], [x * 0.4, 0.37, -0.095], 0.011, FRAME);
    tube(lp, [x * 0.6, headLow[1], headLow[2]], [x * 1.1, front[1], front[2]], 0.013, FRAME); // forcella
  }
  // parafanghi
  for (const [z, a0] of [[rear[2], 0.4], [front[2], -0.4]] as const) {
    lp.push([0, R, z], 0, a0).add(new THREE.TorusGeometry(R + 0.03, 0.012, 3, 10, Math.PI * 0.75).rotateZ(Math.PI * 0.12).rotateY(Math.PI / 2), FRAME_DARK, { jitter: 0, ao: 0 }).pop();
  }
  // sella in cuoio e reggisella
  tube(lp, seat, [0, 0.44, -0.11], 0.012, METAL);
  lp.blob(0, 0.455, -0.115, 0.06, 0.025, 0.085, '#6b4a2e', { jitter: 0, vary: 0.05 });
  // manubrio da passeggio, curvo verso il Custode, con manopole nere
  tube(lp, head, [0, 0.55, 0.19], 0.014, METAL);
  lp.push([0, 0.55, 0.19], 0, 0, Math.PI / 2).cyl(0, -0.16, 0, 0.011, 0.011, 0.32, 6, METAL, { jitter: 0 }).pop();
  for (const s of [-1, 1]) {
    tube(lp, [s * 0.16, 0.55, 0.19], [s * 0.2, 0.56, 0.1], 0.011, METAL);
    lp.push([s * 0.2, 0.56, 0.1], 0, Math.PI / 2).cyl(0, -0.04, 0, 0.018, 0.018, 0.08, 6, TIRE, { jitter: 0 }).pop();
  }
  lp.blob(0.1, 0.575, 0.19, 0.022, 0.016, 0.022, LPC.gold, { jitter: 0 }); // campanello
  // cestino di vimini con la zucca, e il fanalino che illumina la strada
  lp.box(0, 0.4, 0.37, 0.2, 0.13, 0.16, LPC.wood, { bevel: 0.01, vary: 0.12 });
  for (let i = 0; i < 4; i++) lp.box(0, 0.42 + i * 0.03, 0.37, 0.205, 0.006, 0.165, LPC.woodDark, { jitter: 0, ao: 0 });
  pumpkin(lp, 0, 0.53, 0.37, 0.06, true, true, 0);
  lp.box(0, 0.44, 0.47, 0.05, 0.05, 0.04, FRAME_DARK, { bevel: 0.006 });
  lp.blob(0, 0.465, 0.495, 0.02, 0.02, 0.008, '#ffe7a8', { bucket: 'glow', jitter: 0 });
  lp.light(0, 0.47, 0.55, '#ffd27a', 0.35, 2.2, 0.15, 0.5);
  // movimento centrale: corona color ruggine, pedivelle e pedali
  lp.push([0.05, bb[1], bb[2]], 0, 0, Math.PI / 2).cyl(0, -0.006, 0, 0.065, 0.065, 0.012, 10, LPC.rust, { jitter: 0 }).pop();
  tube(lp, [0.055, bb[1], bb[2]], [0.055, rear[1] + 0.012, rear[2]], 0.006, '#2a2420'); // catena (tratto superiore)
  if (all) for (const s of [-1, 1]) {
    const a = crank + (s > 0 ? 0 : Math.PI);
    const px = s * 0.075, py = bb[1] + Math.cos(a) * 0.07, pz = bb[2] + Math.sin(a) * 0.07;
    tube(lp, [s * 0.06, bb[1], bb[2]], [px, py, pz], 0.008, METAL);
    lp.box(px + s * 0.02, py - 0.008, pz, 0.05, 0.016, 0.06, TIRE, { jitter: 0 });
  }
  if (parked) {
    lp.pop();
    tube(lp, [-0.05, 0.15, -0.06], [-0.13, 0.0, -0.1], 0.008, METAL); // cavalletto
  }
  lp.pop();
  return lp.build();
}

/**
 * Bar degli zombie (ingombro 3×2, fronte verso +z): chiosco di legno storto,
 * tendone a strisce prugna e nere, bancone con boccali e bottiglie che
 * brillano di verde, mensole, botti, sgabelli e lucine. Gli zombie (barista,
 * avventori, ballerino) sono presenze animate.
 */
export function zombieBarLP(v: PVis): LPModel {
  const lp = new LP(`lp:bar:${v.seed}:${v.lit}`);
  const r = lp.rng;
  const lit = v.lit;
  const glow = (c: string) => (lit ? { color: c, bucket: 'glow' as const } : { color: '#3d4a3a', bucket: 'solid' as const });
  // pedana di assi
  for (let i = 0; i < 9; i++) lp.box(-1.38 + i * 0.345, 0, 0, 0.33, 0.06, 1.9, i % 2 ? LPC.wood : LPC.woodDark, { bevel: 0.006, vary: 0.1 });
  // chiosco: pareti di assi verticali leggermente storte
  lp.push([0, 0.06, -0.55], 0, 0, -0.025);
  lp.box(0, 0, -0.38, 2.1, 1.75, 0.06, LPC.woodDark, { vary: 0.1 });
  for (let i = 0; i < 12; i++) lp.box(-1.0 + i * 0.18, 0, -0.34, 0.16, 1.7 + r.range(-0.04, 0.04), 0.03, i % 2 ? LPC.wood : '#5e4430', { jitter: 0.004, vary: 0.08 });
  for (const s of [-1, 1]) lp.box(s * 1.03, 0, 0, 0.06, 1.75, 0.8, LPC.woodDark, { vary: 0.1 });
  // mensole con bottiglie (verdi, viola, ambra) che brillano al buio
  // (sopra le teste degli avventori seduti)
  for (const y of [0.98, 1.3]) {
    lp.box(0, y, -0.25, 1.8, 0.035, 0.16, LPC.woodLight, { bevel: 0.005 });
    for (let i = 0; i < 9; i++) {
      const x = -0.8 + i * 0.2 + r.range(-0.03, 0.03);
      const g = glow(r.pick(['#8fe36a', '#b78ce8', '#e9b65a', '#7fe0c8']));
      lp.cyl(x, y + 0.035, -0.25, 0.035, 0.03, 0.12 + r.next() * 0.05, 6, g.color, { bucket: g.bucket, jitter: 0 });
      lp.cyl(x, y + 0.17, -0.25, 0.012, 0.012, 0.05, 4, LPC.woodDark, { jitter: 0 });
    }
  }
  // tetto di assi spiovente
  lp.push([0, 1.75, 0], 0, -0.22).box(0, 0, 0.05, 2.3, 0.07, 1.05, LPC.roofDark, { bevel: 0.01, vary: 0.12 }).pop();
  lp.pop();
  // tendone a strisce sul bancone (sfilacciato in fondo), su due pali storti
  lp.push([0, 1.72, -0.18], 0, 0.42);
  for (let i = 0; i < 11; i++) lp.box(-1.1 + i * 0.22, 0, 0.32, 0.22, 0.025, 0.66, i % 2 ? '#2a2230' : '#7d4f8c', { jitter: 0, vary: 0.05 });
  for (let i = 0; i < 11; i++) lp.push([-1.1 + i * 0.22, -0.02, 0.66], 0, 0, 0).cyl(0, -0.06, 0, 0.0, 0.07, 0.07, 3, i % 2 ? '#2a2230' : '#7d4f8c', { jitter: 0 }).pop();
  lp.pop();
  for (const x of [-1.12, 1.12]) lp.push([x, 0.06, 0.42], 0, 0.05, x * 0.03).cyl(0, 0, 0, 0.035, 0.03, 1.52, 6, LPC.woodDark, { vary: 0.1 }).pop();
  // lucine tra i pali: filo e lampadine
  for (let i = 0; i <= 10; i++) {
    const x = -1.1 + i * 0.22, sag = Math.sin((i / 10) * Math.PI) * 0.1;
    const g = glow(i % 2 ? '#ffd27a' : '#9ff0a0');
    lp.blob(x, 1.46 - sag, 0.48, 0.03, 0.04, 0.03, g.color, { bucket: g.bucket, jitter: 0 });
  }
  // bancone con piano chiaro, teschio dipinto e boccali
  lp.box(0, 0.06, 0.05, 2.0, 0.6, 0.3, '#5e4430', { bevel: 0.012, vary: 0.08 });
  lp.box(0, 0.66, 0.05, 2.1, 0.05, 0.38, LPC.woodLight, { bevel: 0.01 });
  lp.blob(0, 0.38, 0.205, 0.1, 0.1, 0.012, LPC.bone, { jitter: 0 });
  for (const s of [-1, 1]) lp.blob(s * 0.035, 0.39, 0.215, 0.022, 0.025, 0.006, LPC.charcoal, { jitter: 0 });
  lp.box(0, 0.33, 0.214, 0.06, 0.012, 0.004, LPC.charcoal, { jitter: 0 });
  for (const x of [-0.75, 0.15, 0.85]) {
    lp.cyl(x, 0.71, 0.08, 0.045, 0.045, 0.1, 8, '#9a9488', { jitter: 0 }); // boccale di peltro
    lp.cyl(x, 0.8, 0.08, 0.044, 0.044, 0.02, 8, glow('#8fe36a').color, { bucket: glow('#8fe36a').bucket, jitter: 0 }); // pozione che fa la schiuma
    lp.push([x + 0.055, 0.76, 0.08], 0, 0, Math.PI / 2).add(new THREE.TorusGeometry(0.025, 0.007, 4, 8), '#9a9488', { jitter: 0, ao: 0 }).pop();
  }
  candle(lp, -0.35, 0.69, 0.12, lit, 0.1);
  // insegna a forma di bara sul tetto, con un boccale dipinto
  lp.push([0, 2.02, -0.5], 0, -0.1);
  const coffin = new THREE.Shape([new THREE.Vector2(-0.12, -0.24), new THREE.Vector2(0.12, -0.24), new THREE.Vector2(0.2, 0.08), new THREE.Vector2(0.1, 0.24), new THREE.Vector2(-0.1, 0.24), new THREE.Vector2(-0.2, 0.08)]);
  lp.push([0, 0, 0], Math.PI / 2, 0, Math.PI / 2).extrude(coffin, 0.05, LPC.woodDark, { bevel: 0.01 }).pop();
  lp.cyl(0, -0.08, 0.03, 0.05, 0.05, 0.12, 8, glow('#e9b65a').color, { bucket: glow('#e9b65a').bucket, jitter: 0 });
  lp.blob(0, 0.06, 0.03, 0.06, 0.03, 0.03, glow('#f2efe2').color, { bucket: glow('#f2efe2').bucket, jitter: 0 });
  lp.pop();
  // botti e casse a destra, sgabelli davanti al bancone
  for (const [x, z, h] of [[1.3, -0.55, 0], [1.3, -0.1, 0], [1.3, -0.33, 0.42]] as const) {
    lp.lathe(x, 0.06 + h, z, [[0.16, 0], [0.19, 0.12], [0.2, 0.21], [0.19, 0.3], [0.16, 0.42]], 10, LPC.wood, { vary: 0.08 });
    for (const y of [0.08, 0.34]) lp.cyl(x, 0.06 + h + y, z, 0.2, 0.2, 0.025, 10, LPC.iron, { jitter: 0 });
  }
  for (const x of [-0.6, 0.35]) {
    lp.cyl(x, 0.06, 0.62, 0.025, 0.03, 0.22, 5, LPC.woodDark, { jitter: 0 });
    lp.cyl(x, 0.28, 0.62, 0.13, 0.12, 0.05, 9, '#7d4f8c', { vary: 0.06 });
  }
  // ── tocchi spooky ──
  // bara in piedi usata come frigo: coperchio socchiuso, dentro bottiglie che brillano
  lp.push([-1.28, 0.06, 0.32], 0.7);
  const coffinShape = new THREE.Shape([new THREE.Vector2(-0.14, 0), new THREE.Vector2(0.14, 0), new THREE.Vector2(0.22, 0.95), new THREE.Vector2(0.12, 1.3), new THREE.Vector2(-0.12, 1.3), new THREE.Vector2(-0.22, 0.95)]);
  // cassa cava: fondo, e una cornice (la sagoma con un foro) profonda 0,2
  const inner = new THREE.Path(coffinShape.getPoints().map((p) => new THREE.Vector2(p.x * 0.78, 0.07 + p.y * 0.88)).reverse());
  const rim = new THREE.Shape(coffinShape.getPoints());
  rim.holes.push(inner);
  lp.push([0, 0, -0.12]).extrude(coffinShape, 0.03, LPC.woodDark, { bevel: 0.01, vary: 0.08 }).pop();
  lp.push([0, 0, -0.09]).extrude(rim, 0.17, LPC.woodDark, { bevel: 0.012, vary: 0.08 }).pop();
  lp.push([0, 0, -0.088]).plate(coffinShape, 0.006, lit ? '#3b2a4f' : '#120e12', lit ? { bucket: 'glow', ao: 0 } : { ao: 0 }).pop(); // fondo (fioco di notte)
  for (const [y, c] of [[0.35, '#8fe36a'], [0.62, '#b78ce8'], [0.9, '#e9b65a']] as const) {
    lp.box(0, y, -0.01, 0.28, 0.02, 0.14, LPC.woodLight, { jitter: 0 });
    for (const x of [-0.08, 0.01, 0.09]) { const g = glow(c); lp.cyl(x, y + 0.02, -0.01, 0.032, 0.028, 0.15, 6, g.color, { bucket: g.bucket, jitter: 0 }); }
  }
  // coperchio spalancato verso sinistra (dalla camera si vede l'interno), con la croce
  lp.push([-0.2, 0, 0.1], 1.9).push([0.2, 0, 0]).extrude(coffinShape, 0.04, LPC.wood, { bevel: 0.01 });
  lp.box(0, 0.5, 0.045, 0.035, 0.42, 0.012, LPC.gold, { jitter: 0 });
  lp.box(0, 0.86, 0.045, 0.22, 0.035, 0.012, LPC.gold, { jitter: 0 });
  lp.pop().pop();
  lp.pop();
  // lapide-lavagna con il menù, appoggiata davanti a destra
  lp.push([1.32, 0.06, 0.72], -0.5, -0.12);
  const stone = new THREE.Shape([new THREE.Vector2(-0.2, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.2, 0.42), new THREE.Vector2(0, 0.55), new THREE.Vector2(-0.2, 0.42)]);
  lp.extrude(stone, 0.06, LPC.stoneDark, { bevel: 0.012, topTint: LPC.moss, topAmount: 0.3 });
  for (let i = 0; i < 4; i++) lp.box(-0.03 + (i % 2) * 0.03, 0.1 + i * 0.08, 0.065, 0.2 - (i % 2) * 0.06, 0.012, 0.004, '#e8e4d6', { jitter: 0, ao: 0 }); // righe di gesso
  lp.blob(0, 0.45, 0.068, 0.035, 0.03, 0.006, '#e8e4d6', { jitter: 0 }); // teschietto disegnato
  lp.pop();
  // spillatrice a teschio sulla botte in alto
  skull(lp, 1.3, 0.92, -0.33, 0.55);
  lp.cyl(1.3, 0.9, -0.2, 0.012, 0.012, 0.08, 4, LPC.gold, { jitter: 0 });
  // ragnatele agli angoli del tendone e pipistrelli appesi alle lucine
  cobweb(lp, -1.0, 1.55, 0.36, 0.3);
  cobweb(lp, 1.0, 1.55, 0.36, 0.28, true);
  const bat = new THREE.Shape([new THREE.Vector2(0, 0.02), new THREE.Vector2(0.03, 0.035), new THREE.Vector2(0.07, 0.05), new THREE.Vector2(0.06, 0.01), new THREE.Vector2(0.04, 0.0), new THREE.Vector2(0.02, -0.02), new THREE.Vector2(0, -0.01), new THREE.Vector2(-0.02, -0.02), new THREE.Vector2(-0.04, 0.0), new THREE.Vector2(-0.06, 0.01), new THREE.Vector2(-0.07, 0.05), new THREE.Vector2(-0.03, 0.035)]);
  for (const i of [1, 4, 7, 9]) {
    const x = -1.1 + i * 0.22, sag = Math.sin((i / 10) * Math.PI) * 0.1;
    lp.push([x + 0.11, 1.38 - sag, 0.49]).plate(bat, 0.01, '#1a1520', { ao: 0 }).pop();
  }
  if (lit) {
    lp.light(0, 1.4, 0.55, '#c9f08a', 0.55, 3.2, 0.25, 0.7);
    lp.light(-0.35, 0.85, 0.15, '#ffc56b', 0.4, 2.2, 0.35, 0.5);
  }
  return lp.build();
}

/** Cervello che spunta dalla terra (tra foglie scure), o pronto nella cassetta. */
function brain(lp: LP, x: number, y: number, z: number, s = 1, leaves = true) {
  const r = lp.rng;
  lp.push([x, y, z], r.range(0, 6), 0, 0, s);
  if (leaves) for (let i = 0; i < 5; i++) lp.push([0, 0.0, 0], (i / 5) * Math.PI * 2 + r.range(-0.2, 0.2), 0.9).blob(0, 0.06, 0, 0.035, 0.07, 0.014, i % 2 ? '#3f5a32' : '#4a6136', { jitter: 0.004 }).pop();
  const pink = ['#d98a9a', '#e3a0ad', '#c97a8c'];
  for (const sx of [-1, 1]) {
    // emisfero a circonvoluzioni: tre gobbe per lato
    for (let k = 0; k < 3; k++) lp.blob(sx * 0.04, 0.07 + (k === 1 ? 0.025 : 0), -0.04 + k * 0.04, 0.042, 0.04, 0.034, pink[(k + (sx > 0 ? 1 : 0)) % 3], { jitter: 0.006, detail: 1 });
  }
  lp.box(0, 0.08, 0, 0.008, 0.06, 0.13, '#a35b6e', { jitter: 0, ao: 0 }); // solco centrale
  lp.pop();
}

/**
 * Orto dei cervelli (ingombro 4×3, fronte verso +z): tre filari di terra
 * smossa con i cervelli che spuntano tra le foglie, staccionata storta,
 * spaventapasseri-scheletro, annaffiatoio; a destra la bancarella con il
 * tendone, le cassette di cervelli, la bilancia e l'insegna. Lo zombie
 * contadino e il venditore sono presenze animate.
 */
export function brainFarmLP(v: PVis): LPModel {
  const lp = new LP(`lp:brains:${v.seed}:${v.lit}`);
  const r = lp.rng;
  // campo: tre filari di terra smossa (lungo z)
  for (let i = 0; i < 3; i++) {
    const x = -1.55 + i * 0.62;
    // aiuola rialzata con il bordo di assi e la terra smossa sopra
    lp.box(x, 0, -0.1, 0.5, 0.12, 2.4, LPC.woodDark, { bevel: 0.01, vary: 0.1 });
    lp.box(x, 0.1, -0.1, 0.44, 0.05, 2.34, i % 2 ? LPC.soil : LPC.soilDark, { bevel: 0.02, jitter: 0.01, vary: 0.1 });
    for (let k = 0; k < 9; k++) lp.blob(x + r.range(-0.17, 0.17), 0.15, -1.2 + r.next() * 2.2, 0.035, 0.02, 0.03, LPC.soilDark, { jitter: 0.008 });
    for (let k = 0; k < 4; k++) {
      const ripe = r.next();
      brain(lp, x + r.range(-0.04, 0.04), 0.14, -0.95 + k * 0.58, ripe < 0.25 ? 0.75 : 1.15 + r.next() * 0.3);
    }
  }
  // staccionata storta attorno al campo
  for (let i = 0; i < 8; i++) {
    const z = -1.35 + i * 0.38;
    lp.push([-1.95, 0, z], 0, 0, r.range(-0.12, 0.12)).box(0, 0, 0, 0.05, 0.36 + r.next() * 0.08, 0.05, LPC.woodDark, { bevel: 0.006 }).pop();
  }
  lp.box(-1.95, 0.24, -0.02, 0.03, 0.04, 2.7, LPC.wood, { jitter: 0.01 });
  for (let i = 0; i < 5; i++) lp.push([-1.65 + i * 0.36, 0, -1.4], 0, 0, r.range(-0.12, 0.12)).box(0, 0, 0, 0.05, 0.34, 0.05, LPC.woodDark, { bevel: 0.006 }).pop();
  lp.box(-0.95, 0.22, -1.4, 1.5, 0.04, 0.03, LPC.wood, { jitter: 0.01 });
  // spaventapasseri: scheletro su un palo con cappellaccio e straccio
  lp.cyl(-0.3, 0, -1.25, 0.025, 0.025, 1.15, 5, LPC.woodDark, { jitter: 0 });
  lp.push([-0.3, 0.85, -1.25], 0, 0, Math.PI / 2).cyl(0, -0.35, 0, 0.02, 0.02, 0.7, 5, LPC.woodDark, { jitter: 0 }).pop();
  lp.box(-0.3, 0.6, -1.25, 0.22, 0.3, 0.1, '#6b5a3a', { jitter: 0.01, vary: 0.1 });
  skull(lp, -0.3, 1.0, -1.25, 0.75);
  lp.cyl(-0.3, 1.16, -1.25, 0.16, 0.12, 0.03, 8, '#4a3a28', { jitter: 0.01 });
  lp.cyl(-0.3, 1.18, -1.25, 0.08, 0.06, 0.12, 7, '#4a3a28', { jitter: 0.01 });
  // lanterna verdina sul palo d'angolo della staccionata
  lp.cyl(-1.95, 0, 1.25, 0.03, 0.03, 0.75, 5, LPC.woodDark, { jitter: 0 });
  lp.box(-1.95, 0.7, 1.25, 0.1, 0.13, 0.1, LPC.iron, { bevel: 0.01 });
  lp.blob(-1.95, 0.765, 1.25, 0.035, 0.045, 0.035, v.lit ? '#c9f08a' : '#3d4a3a', v.lit ? { bucket: 'glow', jitter: 0 } : { jitter: 0 });
  if (v.lit) lp.light(-1.95, 0.8, 1.25, '#c9f08a', 0.45, 3.0, 0.3, 0.6);
  // annaffiatoio arrugginito
  lp.cyl(-0.6, 0, 1.2, 0.08, 0.07, 0.14, 8, LPC.rust, { jitter: 0 });
  lp.push([-0.52, 0.06, 1.2], 0, 0, -0.9).cyl(0, 0, 0, 0.012, 0.008, 0.14, 4, LPC.rust, { jitter: 0 }).pop();
  // ── bancarella ──
  const bx = 1.35;
  lp.box(bx, 0, 0.35, 1.1, 0.06, 0.9, LPC.woodDark, { bevel: 0.006 });
  lp.box(bx, 0.06, 0.55, 1.05, 0.55, 0.42, LPC.wood, { bevel: 0.01, vary: 0.1 });
  lp.box(bx, 0.61, 0.55, 1.12, 0.04, 0.48, LPC.woodLight, { bevel: 0.006 });
  // cassette di cervelli in vendita
  for (const [cx, cz] of [[bx - 0.3, 0.5], [bx + 0.05, 0.62], [bx + 0.35, 0.48]] as const) {
    lp.box(cx, 0.65, cz, 0.26, 0.1, 0.2, '#8a6849', { bevel: 0.006, vary: 0.1 });
    for (let k = 0; k < 3; k++) brain(lp, cx - 0.07 + k * 0.07, 0.68, cz + r.range(-0.03, 0.03), 0.45, false);
  }
  // bilancia appesa al palo con un cervello sul piatto
  for (const x of [bx - 0.52, bx + 0.52]) lp.cyl(x, 0.06, 0.78, 0.03, 0.03, 1.35, 6, LPC.woodDark, { vary: 0.1 });
  lp.cyl(bx - 0.35, 1.0, 0.78, 0.006, 0.006, 0.25, 3, LPC.iron, { jitter: 0 });
  lp.cyl(bx - 0.35, 0.98, 0.78, 0.09, 0.07, 0.02, 8, LPC.gold, { jitter: 0 });
  brain(lp, bx - 0.35, 0.99, 0.78, 0.35, false);
  // tendone a strisce verdi e rosa, sfilacciato
  lp.push([bx, 1.4, 0.45], 0, 0.35);
  for (let i = 0; i < 6; i++) lp.box(bx - bx - 0.55 + i * 0.22 + 0.11, 0, 0.0, 0.22, 0.025, 0.85, i % 2 ? '#5d7a3a' : '#d98a9a', { jitter: 0, vary: 0.05 });
  for (let i = 0; i < 6; i++) lp.push([-0.55 + i * 0.22 + 0.11, -0.02, 0.43]).cyl(0, -0.06, 0, 0.0, 0.07, 0.07, 3, i % 2 ? '#5d7a3a' : '#d98a9a', { jitter: 0 }).pop();
  lp.pop();
  // insegna a forma di cervello sul tendone
  lp.push([bx, 1.62, 0.2]);
  brain(lp, 0, 0, 0, 1.3, false);
  lp.pop();
  // cassette impilate dietro e una lanterna verdina
  lp.box(bx + 0.3, 0.06, 0.0, 0.3, 0.22, 0.24, '#8a6849', { bevel: 0.008 });
  lp.box(bx + 0.28, 0.28, 0.0, 0.26, 0.2, 0.22, '#6b4f36', { bevel: 0.008 });
  if (v.lit) {
    lp.blob(bx + 0.52, 1.25, 0.82, 0.04, 0.05, 0.04, '#c9f08a', { bucket: 'glow', jitter: 0 });
    lp.light(bx + 0.52, 1.25, 0.82, '#c9f08a', 0.45, 2.6, 0.3, 0.6);
  }
  return lp.build();
}
