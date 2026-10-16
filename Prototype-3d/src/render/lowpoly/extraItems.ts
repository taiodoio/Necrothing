// Oggetti «Extra» e nuove costruzioni, nello stile low-poly del gioco:
// - la bicicletta del Custode (telaio color prugna, raggi d'osso, cestino
//   con la zucca e il fanalino), parcheggiata o in sella;
// - il Bar degli zombie: chiosco di legno storto con tendone a strisce,
//   bancone, bottiglie che brillano, botti, sgabelli e lucine.
// I personaggi (Custode, zombie) sono rig separati: qui solo gli oggetti.

import * as THREE from 'three';
import { LP, type LPModel } from './kit.ts';
import { candle, pumpkin } from './details.ts';
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

/**
 * Bicicletta (muso verso +z). `parked`: inclinata sul cavalletto. `crank`:
 * angolo dei pedali (per l'anteprima e l'animazione in sella).
 */
export function bicycleLP(parked = true, crank = 0): LPModel {
  const lp = new LP(`lp:bike:${parked}:${crank.toFixed(2)}`);
  // in scala con il Custode (testone kawaii): una bici da adulto un po' tozza
  lp.push([0, 0, 0], 0, 0, 0, BIKE_SCALE);
  const R = 0.17;
  const rear: [number, number, number] = [0, R, -0.3], front: [number, number, number] = [0, R, 0.32];
  const bb: [number, number, number] = [0, 0.15, -0.02], seat: [number, number, number] = [0, 0.4, -0.1];
  const head: [number, number, number] = [0, 0.47, 0.21], headLow: [number, number, number] = [0, 0.35, 0.245];
  if (parked) lp.push([0, 0, 0], 0, 0, 0.12); // appoggiata sul cavalletto
  wheel(lp, rear[2], R);
  wheel(lp, front[2], R);
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
  for (const s of [-1, 1]) {
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
  if (lit) {
    lp.light(0, 1.4, 0.55, '#c9f08a', 0.55, 3.2, 0.25, 0.7);
    lp.light(-0.35, 0.85, 0.15, '#ffc56b', 0.4, 2.2, 0.35, 0.5);
  }
  return lp.build();
}
