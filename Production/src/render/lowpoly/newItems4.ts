// Nuove attività e presenze, nello stile spooky-cozy del gioco (stesso livello
// di dettaglio del bar degli zombie e dell'orto: sagome estruse e smussate,
// assi di legno di toni diversi, ferro battuto, e qualche tocco spooky):
// - il food truck degli zombie (tacos di cervello): furgone anni '50 senape e
//   vinaccia, sportello col tendone a strisce, cucina illuminata con i vasetti
//   di cervelli e d'occhi, insegna-taco sul tetto, lavagna a forma di bara;
// - il carretto dei gelati del fantasma: due ruote a raggi, cassone a strisce,
//   ombrellone coi pipistrelli, nebbiolina del ghiaccio secco, lapide-menù;
// - la pianta carnivora: nasce dalla terra, con radici, foglie spinose e
//   trappoline chiuse (la bocca grande è un pezzo animato a parte);
// - il chiosco del fioraio scheletro: bancarella col tettuccio di scandole,
//   insegna, corona funebre, cavalletto, rose nere e teschio-vaso;
// - l'ufficio postale degli scheletri: edificio pubblico col frontone, le
//   lesene, il portone ad arco, la busta-insegna in cima e la buca rossa;
// - l'auto dei cacciatori di fantasmi: berlina nera anni '60 a profilo, quattro
//   fari, cromature, gomme a fascia bianca, bagagliaio aperto pieno di torce.
// I personaggi (zombie, fantasmi, scheletri, fratelli) sono rig a parte.

import * as THREE from 'three';
import { LP, roundTopShape, type LPModel, type LPOpts } from './kit.ts';
import { candle, cobweb, deadLeaves, flower, grassTuft, pebbles, pumpkin, weeds, wreath } from './details.ts';
import { skull } from './extras.ts';
import { LPC } from './palette.ts';
import type { PVis } from '../types.ts';

const glowOf = (lit: boolean) => (c: string) => (lit ? { color: c, bucket: 'glow' as const } : { color: '#3d3a42', bucket: 'solid' as const });
const TIRE = '#1f1d22', CHROME = '#cfcbc4';

type V2 = [number, number];
/** Sagoma da una lista di punti (piano XY). */
const poly = (pts: V2[]) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

/** Lastra da a a b nel piano XY (spessore verso la sinistra del verso a→b), larga `w` lungo z. */
function slab(lp: LP, a: V2, b: V2, w: number, thick: number, color: string, o: LPOpts & { bevel?: number } = {}, shrink = 1, lift = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  lp.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], 0, 0, Math.atan2(dy, dx)).box(0, lift, 0, Math.hypot(dx, dy) * shrink, thick, w, color, o).pop();
}

/** Tubo dritto da a a b (in 3D). */
function rod(lp: LP, a: [number, number, number], b: [number, number, number], r: number, color: string, seg = 5, o: LPOpts = {}) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  lp.push(a, e.y, e.x, e.z).cyl(0, 0, 0, r, r, d.length(), seg, color, { jitter: 0, ao: 0, ...o }).pop();
}

/**
 * Ruota d'auto con l'asse lungo z, appoggiata a terra (centro a quota r):
 * gomma tonda con le spalle, fascia bianca a scelta, cerchio a coppa,
 * coprimozzo cromato e cinque bulloni. `side` +1/−1: il lato che guarda fuori.
 */
function autoWheel(lp: LP, x: number, z: number, r: number, w: number, side: 1 | -1, whitewall = false, hub = CHROME) {
  lp.push([x, r, z], 0, Math.PI / 2); // l'asse y del tornio diventa z
  lp.lathe(0, -w / 2, 0, [[r * 0.6, 0], [r * 0.9, 0], [r * 0.99, w * 0.2], [r, w * 0.5], [r * 0.99, w * 0.8], [r * 0.9, w], [r * 0.6, w]], 18, TIRE, { jitter: 0, ao: 0.05 });
  const f = side * (w / 2); // faccia esterna
  if (whitewall) lp.push([0, f + side * 0.002, 0]).add(new THREE.RingGeometry(r * 0.66, r * 0.84, 18).rotateX(side > 0 ? -Math.PI / 2 : Math.PI / 2), '#ece6d6', { jitter: 0, ao: 0 }).pop();
  lp.cyl(0, side > 0 ? f - 0.03 : f - 0.005, 0, r * 0.64, r * 0.64, 0.035, 14, '#3a3a40', { jitter: 0, ao: 0 }); // cerchio
  lp.lathe(0, f + side * 0.004, 0, side > 0 ? [[r * 0.5, 0], [r * 0.42, 0.02], [r * 0.16, 0.035], [0, 0.04]] : [[0, -0.04], [r * 0.16, -0.035], [r * 0.42, -0.02], [r * 0.5, 0]], 14, hub, { jitter: 0, ao: 0, bucket: 'gloss' });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    lp.blob(Math.cos(a) * r * 0.28, f + side * 0.03, Math.sin(a) * r * 0.28, 0.012, 0.008, 0.012, '#8d8a84', { jitter: 0, detail: 0 });
  }
  lp.pop();
}

/** Lampadina d'una catenaria (accesa o spenta). */
function bulb(lp: LP, x: number, y: number, z: number, c: string, lit: boolean) {
  const g = glowOf(lit)(c);
  lp.cyl(x, y + 0.03, z, 0.012, 0.012, 0.02, 4, LPC.iron, { jitter: 0, ao: 0 });
  lp.blob(x, y, z, 0.026, 0.034, 0.026, g.color, { bucket: g.bucket, jitter: 0 });
}

/** Pipistrello appeso a testa in giù (ali chiuse) o in volo piatto. */
function bat(lp: LP, x: number, y: number, z: number, s = 1, ry = 0) {
  lp.push([x, y, z], ry, 0, 0, s);
  const wing = poly([[0, 0.02], [0.03, 0.035], [0.07, 0.05], [0.06, 0.01], [0.04, 0], [0.02, -0.02], [0, -0.01], [-0.02, -0.02], [-0.04, 0], [-0.06, 0.01], [-0.07, 0.05], [-0.03, 0.035]]);
  lp.plate(wing, 0.01, '#1a1520', { ao: 0 });
  lp.blob(0, 0.012, 0.006, 0.016, 0.02, 0.012, '#1a1520', { jitter: 0, detail: 0 });
  for (const sx of [-1, 1]) lp.blob(sx * 0.007, 0.018, 0.017, 0.004, 0.004, 0.002, '#e9b65a', { jitter: 0, detail: 0 });
  lp.pop();
}

/** Vasetto di vetro col tappo (dentro: cervello, occhi, o una pozione che brilla). */
function jar(lp: LP, x: number, y: number, z: number, inner: 'brain' | 'eyes' | 'glow', lit: boolean, s = 1) {
  lp.push([x, y, z], 0, 0, 0, s);
  lp.cyl(0, 0, 0, 0.05, 0.05, 0.12, 8, '#a9c7c0', { jitter: 0, ao: 0, bucket: 'gloss' });
  lp.cyl(0, 0.12, 0, 0.042, 0.042, 0.025, 8, '#6b4a2e', { jitter: 0 });
  if (inner === 'brain') for (const k of [-1, 1]) lp.blob(k * 0.016, 0.06, 0.0, 0.026, 0.03, 0.03, k > 0 ? '#e3a0ad' : '#d98a9a', { jitter: 0.003, detail: 1 });
  else if (inner === 'eyes') for (let i = 0; i < 3; i++) { lp.blob(-0.02 + i * 0.02, 0.03 + (i % 2) * 0.04, 0.02, 0.018, 0.018, 0.018, '#f2ead6', { jitter: 0 }); lp.blob(-0.02 + i * 0.02, 0.03 + (i % 2) * 0.04, 0.036, 0.008, 0.008, 0.004, '#3f6a8a', { jitter: 0 }); }
  else { const g = glowOf(lit)('#8fe36a'); lp.cyl(0, 0.008, 0, 0.044, 0.044, 0.08, 8, g.color, { bucket: g.bucket, jitter: 0 }); }
  lp.pop();
}

/** Taco di cervello (sul piano di lavoro e in mano agli zombie): guscio giallo, cervello rosa, insalatina. */
export function tacoLP(lp: LP, x: number, y: number, z: number, s = 1, ry = 0) {
  lp.push([x, y, z], ry, 0, 0, s);
  lp.add(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 0.06, 0), '#e8b54a', { jitter: 0, ao: 0 });
  for (const k of [-1, 0, 1]) lp.blob(k * 0.03, 0.1, 0, 0.03, 0.025, 0.02, k ? '#e3a0ad' : '#d98a9a', { jitter: 0.003, detail: 0 });
  lp.blob(0.04, 0.11, 0.005, 0.03, 0.012, 0.02, '#7fb85a', { jitter: 0, detail: 0 });
  lp.pop();
}

// ── Food truck ──────────────────────────────────────────────────────────

/**
 * Food truck degli zombie (ingombro 3×2, muso verso +x, sportello verso +z):
 * furgone anni '50 dal tetto tondo, senape con la fascia vinaccia, parafanghi
 * sulle ruote, parabrezza diviso e fari cromati col teschietto sul cofano.
 * Lo sportello si apre su una cucina illuminata (mensole coi vasetti di
 * cervelli e d'occhi, peperoncini appesi, mestoli, pentolone di salsa verde),
 * col bancone e un tendone a strisce bene in fuori, coi pipistrelli appesi.
 * Sul tetto l'insegna-taco sta su due montanti, con le lampadine attorno.
 */
export function foodTruckLP(v: PVis): LPModel {
  const lp = new LP(`lp:foodtruck:${v.seed}:${v.lit}`);
  const lit = v.lit, glow = glowOf(lit), r = lp.rng;
  const BODY = '#c8913f', BAND = '#6d2f3a', ROOF = '#e6dcc0', TRIM = '#4a2a30';
  const W = 1.0, HW = W / 2, WR = 0.21;
  const XR = -0.72, XF = 0.78; // ruote
  lp.push([0, 0, -0.32]);
  for (const x of [XR, XF]) for (const s of [-1, 1] as const) autoWheel(lp, x, s * (HW - 0.06), WR, 0.15, s, false, '#d8d0bc');
  // carrozzeria: sagoma laterale estrusa, coi passaruota ad arco
  const side = new THREE.Shape();
  side.moveTo(-1.28, 0.24);
  side.lineTo(XR - 0.28, 0.22); side.absarc(XR, 0.22, 0.28, Math.PI, 0, true);
  side.lineTo(XF - 0.28, 0.22); side.absarc(XF, 0.22, 0.28, Math.PI, 0, true);
  side.lineTo(1.2, 0.22);
  side.lineTo(1.27, 0.26);
  side.lineTo(1.28, 0.62); // muso squadrato
  side.quadraticCurveTo(1.28, 0.7, 1.19, 0.71); // spigolo del cofano appena arrotondato
  side.lineTo(1.05, 0.74); // cofano corto
  side.lineTo(1.03, 1.3); // parabrezza dritto
  side.quadraticCurveTo(1.01, 1.42, 0.86, 1.42); // tetto tondo davanti
  side.lineTo(-1.08, 1.44);
  side.quadraticCurveTo(-1.31, 1.44, -1.31, 1.2);
  side.lineTo(-1.28, 0.24);
  // lo sportello è un buco nella sagoma: si vede dentro
  const WIN = { x0: -0.86, x1: 0.32, y0: 0.6, y1: 1.28 }; // alto abbastanza da vedere il cuoco dal petto in su
  const B = 0.03; // smusso: le superfici sporgono di tanto dalla sagoma
  side.holes.push(new THREE.Path([new THREE.Vector2(WIN.x0, WIN.y0), new THREE.Vector2(WIN.x0, WIN.y1), new THREE.Vector2(WIN.x1, WIN.y1), new THREE.Vector2(WIN.x1, WIN.y0)]));
  lp.extrude(side, W, BODY, { bevel: B, vary: 0.04, ao: 0.12 });
  // il buco passa da parte a parte: dall'altro fianco lo chiude un pannello del colore del furgone
  lp.push([0, 0, -HW - 0.012]).plate(poly([[WIN.x0 - 0.04, WIN.y0 - 0.04], [WIN.x1 + 0.04, WIN.y0 - 0.04], [WIN.x1 + 0.04, WIN.y1 + 0.04], [WIN.x0 - 0.04, WIN.y1 + 0.04]]), 0.012, BODY, { ao: 0 }).pop();
  // fascia vinaccia in basso e filetto crema, tetto crema
  const band = new THREE.Shape();
  band.moveTo(-1.3, 0.3); band.lineTo(XR - 0.3, 0.3); band.absarc(XR, 0.22, 0.3, Math.PI * 0.85, Math.PI * 0.15, true);
  band.lineTo(XF - 0.3, 0.3); band.absarc(XF, 0.22, 0.3, Math.PI * 0.85, Math.PI * 0.15, true);
  band.lineTo(1.28, 0.3); band.lineTo(1.28, 0.56); band.lineTo(-1.32, 0.56); band.closePath();
  for (const s of [-1, 1]) lp.push([0, 0, s > 0 ? HW + 0.002 : -HW - 0.014]).plate(band, 0.012, BAND, { ao: 0 }).pop();
  for (const s of [-1, 1]) lp.push([0, 0.56, s * (HW + 0.012)]).box(0, 0, 0, 2.5, 0.035, 0.012, ROOF, { jitter: 0, ao: 0 }).pop();
  lp.push([-0.12, 1.43, 0]).box(0, 0, 0, 1.95, 0.05, W - 0.04, ROOF, { bevel: 0.02 }).pop();
  for (let i = 0; i < 6; i++) lp.box(-1.0 + i * 0.36, 1.48, 0, 0.03, 0.012, W - 0.1, '#cfc4a8', { jitter: 0, ao: 0 }); // nervature
  // cucina: vano scuro caldo dentro lo sportello (pareti, fondo, soffitto)
  const IN = lit ? '#5a3a2e' : '#3a2824', inB = lit ? 'glow' as const : 'solid' as const;
  lp.box((WIN.x0 + WIN.x1) / 2, WIN.y0 - 0.02, -0.36, WIN.x1 - WIN.x0 + 0.04, WIN.y1 - WIN.y0 + 0.04, 0.05, IN, { bucket: inB, jitter: 0, ao: 0 }); // fondo della cucina
  // rivestimento del vano (pavimento, soffitto, pareti): dentro è la cucina, non la carrozzeria
  const IW = WIN.x1 - WIN.x0, IZ = 0.86, ICZ = 0.07;
  // (lo smusso stringe il buco di B per lato: il rivestimento sta appena dentro)
  lp.box((WIN.x0 + WIN.x1) / 2, WIN.y0 + B, ICZ, IW - 2 * B - 0.01, 0.012, IZ, '#3a2a2a', { jitter: 0, ao: 0 });
  lp.box((WIN.x0 + WIN.x1) / 2, WIN.y1 - B - 0.014, ICZ, IW - 2 * B - 0.01, 0.012, IZ, IN, { bucket: inB, jitter: 0, ao: 0 });
  for (const x of [WIN.x0 + B + 0.01, WIN.x1 - B - 0.01]) lp.box(x, WIN.y0 + B, ICZ, 0.012, WIN.y1 - WIN.y0 - 2 * B, IZ, IN, { bucket: inB, jitter: 0, ao: 0 });
  // sportello: cornice crema in rilievo attorno al vano, sul fianco +z
  const frame = poly([[WIN.x0 - 0.06, WIN.y0 - 0.06], [WIN.x1 + 0.06, WIN.y0 - 0.06], [WIN.x1 + 0.06, WIN.y1 + 0.06], [WIN.x0 - 0.06, WIN.y1 + 0.06]]);
  frame.holes.push(new THREE.Path([new THREE.Vector2(WIN.x0, WIN.y0), new THREE.Vector2(WIN.x0, WIN.y1), new THREE.Vector2(WIN.x1, WIN.y1), new THREE.Vector2(WIN.x1, WIN.y0)]));
  lp.push([0, 0, HW + 0.002]).plate(frame, 0.03, ROOF, { ao: 0 }).pop();
  // dentro (visibile dallo sportello): mensole con vasetti, peperoncini, mestoli
  const BACK = -0.26; // contro il fondo della cucina
  lp.box(-0.26, 1.06, BACK, 1.0, 0.025, 0.12, LPC.woodLight, { jitter: 0 });
  jar(lp, -0.64, 1.085, BACK, 'brain', lit, 0.9); jar(lp, -0.48, 1.085, BACK, 'eyes', lit, 0.9); jar(lp, -0.32, 1.085, BACK, 'glow', lit, 0.9);
  skull(lp, -0.12, 1.085, BACK, 0.45);
  jar(lp, 0.08, 1.085, BACK, 'brain', lit, 0.8);
  for (let i = 0; i < 6; i++) lp.push([-0.75 + i * 0.05, 1.25 - (i % 2) * 0.01, BACK + 0.02], 0, 0, 0.15 * (i % 2 ? 1 : -1)).cyl(0, -0.08, 0, 0.004, 0.014, 0.08, 4, '#b8302a', { jitter: 0 }).pop(); // peperoncini
  for (const [x, l] of [[0.16, 0.16], [0.24, 0.13]] as const) { lp.cyl(x, 1.26 - l, BACK + 0.03, 0.006, 0.006, l, 3, '#8d8a84', { jitter: 0, ao: 0 }); lp.blob(x, 1.26 - l, BACK + 0.03, 0.03, 0.014, 0.03, '#8d8a84', { jitter: 0, detail: 0 }); } // mestoli
  // bancone fuori dallo sportello, con le mensoline e le cose sopra
  lp.box((WIN.x0 + WIN.x1) / 2, WIN.y0 - 0.04, HW + 0.12, WIN.x1 - WIN.x0 + 0.16, 0.04, 0.26, LPC.woodLight, { bevel: 0.01, vary: 0.06 });
  for (const x of [WIN.x0 + 0.08, WIN.x1 - 0.08]) slab(lp, [x, WIN.y0 - 0.04], [x, WIN.y0 - 0.26], 0.02, 0.02, LPC.iron, { jitter: 0 }); // reggimensola
  for (const x of [WIN.x0 + 0.08, WIN.x1 - 0.08]) rod(lp, [x, WIN.y0 - 0.25, HW + 0.01], [x, WIN.y0 - 0.05, HW + 0.22], 0.01, LPC.iron);
  const CZ = HW + 0.12, CY = WIN.y0;
  lp.box(-0.62, CY, CZ, 0.36, 0.025, 0.16, '#3a3a40', { jitter: 0 }); // piastra
  for (const x of [-0.72, -0.62, -0.52]) tacoLP(lp, x, CY + 0.02, CZ, 0.75, 0.25);
  // pentolone di salsa verde che fuma (con un occhio che galleggia)
  lp.lathe(-0.16, CY, CZ, [[0, 0], [0.08, 0], [0.09, 0.02], [0.09, 0.1], [0.095, 0.11], [0, 0.11]], 10, '#3a3a40', { jitter: 0 });
  { const g = glow('#8fe36a'); lp.cyl(-0.16, CY + 0.095, CZ, 0.082, 0.082, 0.012, 10, g.color, { bucket: g.bucket, jitter: 0 }); }
  lp.blob(-0.13, CY + 0.11, CZ + 0.02, 0.022, 0.018, 0.022, '#f2ead6', { jitter: 0 }); lp.blob(-0.125, CY + 0.12, CZ + 0.038, 0.009, 0.008, 0.005, '#3f6a8a', { jitter: 0 });
  for (let i = 0; i < 3; i++) lp.blob(-0.16 + (i - 1) * 0.03, CY + 0.18 + i * 0.07, CZ + 0.01, 0.035 + i * 0.008, 0.03, 0.03, '#d8f0d0', { bucket: 'ghost', jitter: 0.004 }); // vapore
  pumpkin(lp, 0.12, CY, CZ, 0.06, true, lit, 0.3, 0, false);
  lp.cyl(0.26, CY, CZ, 0.025, 0.025, 0.12, 6, '#b8463a', { jitter: 0 }); lp.cyl(0.26, CY + 0.12, CZ, 0.01, 0.004, 0.04, 4, '#e8e4d6', { jitter: 0 }); // salsa piccante
  // tendone a strisce bene in fuori sopra lo sportello, con la frangia a punte e i pipistrelli
  lp.push([(WIN.x0 + WIN.x1) / 2, WIN.y1 + 0.07, HW + 0.02], 0, -0.12); // appena all'insù: dall'alto non copre lo sportello
  const AW = WIN.x1 - WIN.x0 + 0.34, NS = 9, sw = AW / NS;
  for (let i = 0; i < NS; i++) lp.box(-AW / 2 + sw * (i + 0.5), 0, 0.17, sw, 0.025, 0.34, i % 2 ? ROOF : BAND, { jitter: 0, vary: 0.04 });
  for (let i = 0; i < NS; i++) lp.push([-AW / 2 + sw * (i + 0.5), -0.01, 0.34]).cyl(0, -0.07, 0, 0, sw / 2, 0.07, 3, i % 2 ? ROOF : BAND, { jitter: 0 }).pop();
  for (const i of [1, 4, 7]) bat(lp, -AW / 2 + sw * (i + 0.5), -0.1, 0.31, 1.1);
  lp.pop();
  for (const x of [WIN.x0 - 0.1, WIN.x1 + 0.1]) rod(lp, [x, WIN.y1 - 0.14, HW + 0.02], [x, WIN.y1 + 0.07 + 0.32 * Math.sin(0.12), HW + 0.02 + 0.32 * Math.cos(0.12)], 0.012, LPC.iron); // bracci del tendone
  cobweb(lp, WIN.x0 + 0.02, WIN.y1 - 0.02, HW + 0.035, 0.16);
  // fianco −z (verso il cimitero): lo stemma dipinto, un cervello con le ossa incrociate su un tondo crema, e il finestrino
  lp.push([-0.28, 0.92, -HW - 0.012]);
  lp.plate((() => { const c = new THREE.Shape(); c.absarc(0, 0, 0.27, 0, Math.PI * 2, false); return c; })(), 0.008, ROOF, { ao: 0 });
  lp.plate((() => { const c = new THREE.Shape(); c.absarc(0, 0, 0.23, 0, Math.PI * 2, false); return c; })(), 0.012, BAND, { ao: 0 }).pop();
  for (const a of [0.7, -0.7]) lp.push([-0.28, 0.9, -HW - 0.03], 0, 0, a).box(0, -0.17, 0, 0.04, 0.34, 0.012, LPC.bone, { jitter: 0 }).blob(0, 0.17, 0, 0.03, 0.03, 0.01, LPC.bone, { jitter: 0 }).blob(0, -0.17, 0, 0.03, 0.03, 0.01, LPC.bone, { jitter: 0 }).pop();
  for (let k = 0; k < 4; k++) lp.blob(-0.37 + k * 0.06, 0.96 + (k % 2) * 0.03, -HW - 0.04, 0.05, 0.045, 0.02, ['#e3a0ad', '#d98a9a'][k % 2], { jitter: 0.003, detail: 1 });
  // cabina: parabrezza dritto diviso in due col montante, tergicristalli, finestrini, portiera, specchietto
  const glass = lit ? '#9cc0c8' : '#6f8794';
  for (const s of [-1, 1]) {
    lp.push([0, 0, s * 0.215]);
    slab(lp, [1.03, 1.27], [1.05, 0.8], 0.38, 0.014, glass, { jitter: 0, ao: 0, bucket: 'gloss' }, 0.94, B);
    lp.pop();
    rod(lp, [1.085, 0.82, s * 0.36], [1.08, 0.96, s * 0.12], 0.008, '#2a2226'); // tergicristallo
  }
  lp.box(1.075, 0.78, 0, 0.03, 0.5, 0.04, TRIM, { jitter: 0 }); // montante in mezzo
  for (const s of [-1, 1]) lp.push([0, 0, s > 0 ? HW + 0.002 : -HW - 0.01]).plate(poly([[0.56, 0.8], [1.0, 0.8], [1.0, 1.2], [0.56, 1.22]]), 0.008, glass, { ao: 0 }).pop(); // finestrini della cabina
  for (const s of [-1, 1]) lp.box(0.5, 0.3, s * (HW + 0.008), 0.012, 0.9, 0.006, TRIM, { jitter: 0, ao: 0 }); // fessura della portiera
  lp.box(0.62, 0.7, HW + 0.02, 0.07, 0.015, 0.02, CHROME, { jitter: 0, bucket: 'gloss' }); // maniglia
  lp.push([1.0, 1.0, HW + 0.06]).cyl(0, 0, 0, 0.008, 0.008, 0.1, 4, LPC.iron, { jitter: 0 }).blob(0, 0.12, 0.02, 0.025, 0.045, 0.012, CHROME, { jitter: 0, bucket: 'gloss' }).pop();
  // muso squadrato: calandra a listelli, fari tondi cromati, prese d'aria sul cofano, paraurti a tubo, teschietto
  const NX = 1.28 + B;
  lp.box(NX, 0.3, 0, 0.03, 0.28, 0.44, '#2a2226', { jitter: 0 });
  for (let i = 0; i < 5; i++) lp.box(NX + 0.015, 0.32 + i * 0.05, 0, 0.012, 0.016, 0.42, CHROME, { jitter: 0, bucket: 'gloss' });
  for (const s of [-1, 1]) {
    const h = glow('#fff1b8');
    lp.push([NX, 0.48, s * 0.36], 0, 0, -Math.PI / 2).cyl(0, 0, 0, 0.08, 0.08, 0.04, 12, CHROME, { jitter: 0, bucket: 'gloss' }).cyl(0, 0.03, 0, 0.064, 0.064, 0.02, 12, h.color, { bucket: h.bucket, jitter: 0 }).pop();
    for (let i = 0; i < 3; i++) lp.box(1.12 + i * 0.05, 0.725 + B - i * 0.006, s * 0.3, 0.025, 0.012, 0.14, '#2a2226', { jitter: 0, ao: 0 }); // prese d'aria
  }
  lp.push([NX + 0.06, 0.22, 0], 0, Math.PI / 2).cyl(0, -HW - 0.03, 0, 0.045, 0.045, W + 0.06, 8, CHROME, { jitter: 0, bucket: 'gloss' }).pop();
  lp.push([-1.31 - B - 0.03, 0.22, 0], 0, Math.PI / 2).cyl(0, -HW - 0.03, 0, 0.045, 0.045, W + 0.06, 8, CHROME, { jitter: 0, bucket: 'gloss' }).pop();
  skull(lp, 1.2, 0.71 + B, 0, 0.3); // teschietto-mascotte sul cofano
  // dietro: le due ante con le maniglie, i fanalini e la scaletta
  lp.box(-1.31 - B, 0.36, 0, 0.012, 0.95, 0.012, TRIM, { jitter: 0, ao: 0 });
  for (const s of [-1, 1]) { const t = glow('#ff6a4a'); lp.box(-1.315 - B, 0.42, s * 0.4, 0.02, 0.1, 0.07, t.color, { bucket: t.bucket, jitter: 0 }); lp.box(-1.32 - B, 0.8, s * 0.06, 0.012, 0.1, 0.02, CHROME, { jitter: 0 }); }
  // tetto: insegna-taco col cervello sopra, su due montanti di ferro, con le lampadine attorno
  lp.push([-0.3, 1.47, 0]);
  for (const s of [-1, 1]) { lp.box(s * 0.34, 0, 0, 0.05, 0.22, 0.05, LPC.iron, { jitter: 0 }); lp.box(s * 0.34, 0, 0, 0.12, 0.02, 0.12, LPC.iron, { jitter: 0 }); }
  lp.box(0, 0.2, 0, 0.8, 0.04, 0.06, LPC.iron, { jitter: 0 }); // traversa che regge il taco
  lp.push([0, 0.24, 0]);
  const tacoS = new THREE.Shape(); tacoS.moveTo(-0.42, 0.36); tacoS.absarc(0, 0.36, 0.42, Math.PI, 2 * Math.PI, false); tacoS.closePath();
  lp.extrude(tacoS, 0.12, '#e8b54a', { bevel: 0.02, vary: 0.04 });
  lp.push([0, 0, 0.065]).plate((() => { const s = new THREE.Shape(); s.moveTo(-0.34, 0.36); s.absarc(0, 0.36, 0.34, Math.PI, 2 * Math.PI, false); s.closePath(); return s; })(), 0.006, '#d69a3a', { ao: 0 }).pop();
  for (let k = 0; k < 5; k++) lp.blob(-0.28 + k * 0.14, 0.42 + (k % 2) * 0.03, 0, 0.09, 0.08, 0.07, ['#e3a0ad', '#d98a9a', '#e8b0bb'][k % 3], { jitter: 0.008, detail: 1 }); // cervello
  for (const s of [-1, 1]) lp.blob(s * 0.12 + 0.02, 0.2, 0.07, 0.04, 0.04, 0.012, '#f2ead6', { jitter: 0 }); // occhioni del taco
  for (const s of [-1, 1]) lp.blob(s * 0.12 + 0.03, 0.2, 0.083, 0.018, 0.02, 0.006, '#2a1a1c', { jitter: 0 });
  lp.box(0.02, 0.1, 0.07, 0.1, 0.014, 0.008, '#2a1a1c', { jitter: 0 }); // sorriso
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; bulb(lp, Math.cos(a) * 0.47, 0.36 + Math.sin(a) * 0.47, 0.065, i % 2 ? '#ffd27a' : '#9ff0a0', lit); }
  lp.pop();
  lp.pop();
  // comignolo della cucina con un filo di fumo verdino; lucine sul bordo del tetto
  lp.cyl(0.42, 1.46, -0.22, 0.05, 0.05, 0.16, 8, '#8d8a84', { jitter: 0 });
  lp.cyl(0.42, 1.62, -0.22, 0.07, 0.05, 0.04, 8, '#6b6a70', { jitter: 0 });
  for (let i = 0; i < 3; i++) lp.blob(0.42 + i * 0.05, 1.74 + i * 0.09, -0.22 - i * 0.03, 0.05 + i * 0.012, 0.04, 0.05, '#cfe8c8', { bucket: 'ghost', jitter: 0.006 });
  for (let i = 0; i <= 10; i++) bulb(lp, -1.18 + i * 0.2, 1.38 - Math.sin((i / 10) * Math.PI) * 0.05, HW + 0.03, i % 2 ? '#ffd27a' : '#c9a7e8', lit);
  lp.pop();
  // fuori: lavagna a forma di bara col menù, cassa-sgabello, bidone con la mano, ossicini
  lp.push([1.32, 0, 0.62], -0.6, -0.1);
  const coffin = poly([[-0.14, 0], [0.14, 0], [0.2, 0.36], [0.11, 0.52], [-0.11, 0.52], [-0.2, 0.36]]);
  lp.extrude(coffin, 0.05, LPC.woodDark, { bevel: 0.01 });
  lp.push([0, 0, 0.027]).plate(poly([[-0.11, 0.05], [0.11, 0.05], [0.16, 0.35], [0.09, 0.46], [-0.09, 0.46], [-0.16, 0.35]]), 0.004, '#2a2a2e', { ao: 0 }).pop();
  for (let i = 0; i < 3; i++) lp.box(0.01, 0.12 + i * 0.08, 0.032, 0.18 - i * 0.04, 0.012, 0.004, '#e8e4d6', { jitter: 0, ao: 0 });
  tacoLP(lp, -0.02, 0.36, 0.035, 0.55, 0);
  lp.pop();
  lp.box(-1.1, 0, 1.0, 0.32, 0.26, 0.26, LPC.wood, { bevel: 0.01, vary: 0.1 }); // cassa (fa da sgabello)
  for (const y of [0.06, 0.18]) lp.box(-1.1, y, 1.131, 0.3, 0.02, 0.005, LPC.woodDark, { jitter: 0 });
  lp.lathe(-1.36, 0, 0.3, [[0.15, 0], [0.17, 0.2], [0.16, 0.42], [0, 0.42]], 10, '#4a4f55', { vary: 0.05 }); // bidone
  lp.lathe(-1.36, 0.42, 0.3, [[0.18, 0], [0.17, 0.03], [0.04, 0.05], [0, 0.07]], 10, '#5a5f66', { jitter: 0 });
  lp.push([-1.33, 0.46, 0.34], 0.4, -0.35).blob(0, 0.06, 0, 0.04, 0.06, 0.03, '#9cb07a', { jitter: 0.004 }).pop(); // mano zombie che spunta dal coperchio
  for (const k of [-1, 0, 1]) lp.push([-1.33 + k * 0.02, 0.58, 0.34], 0.4, -0.35 + k * 0.1).cyl(0, 0, 0, 0.01, 0.008, 0.06, 3, '#9cb07a', { jitter: 0 }).pop();
  for (let i = 0; i < 3; i++) lp.push([r.range(-0.3, 0.6), 0.012, r.range(0.75, 0.95)], r.range(0, 3), 0, Math.PI / 2).cyl(0, -0.04, 0, 0.008, 0.008, 0.08, 3, LPC.bone, { jitter: 0 }).pop();
  grassTuft(lp, 1.3, -0.85, 1); grassTuft(lp, -1.3, -0.85, 0.9); weeds(lp, 0.2, -0.92, 0.7);
  if (lit) {
    lp.light(-0.27, 1.05, 0.5, '#ffcf80', 0.6, 3.2, 0.25, 0.55);
    lp.light(-0.3, 2.05, -0.32, '#ffd27a', 0.35, 2.6, 0.15, 0.5);
    lp.light(1.6, 0.5, -0.32, '#fff1b8', 0.3, 2.2, 0.1, 0.3);
  }
  return lp.build();
}

// ── Carretto dei gelati ─────────────────────────────────────────────────

/** Ruota a raggi verticale (asse lungo z): cerchione di legno, raggi, mozzo di ferro. */
function spokeWheel(lp: LP, x: number, z: number, R: number) {
  lp.push([x, R, z]);
  lp.add(new THREE.TorusGeometry(R - 0.025, 0.028, 6, 20), '#2a2730', { jitter: 0, ao: 0 });
  lp.add(new THREE.TorusGeometry(R - 0.06, 0.014, 4, 20), '#9a7a5c', { jitter: 0, ao: 0 });
  for (let i = 0; i < 8; i++) lp.push([0, 0, 0], 0, 0, (i / 8) * Math.PI * 2).cyl(0, 0, 0, 0.009, 0.006, R - 0.06, 4, '#f2ead6', { jitter: 0, ao: 0 }).pop();
  lp.push([0, 0, 0], 0, Math.PI / 2).cyl(0, -0.04, 0, 0.035, 0.035, 0.08, 8, LPC.iron, { jitter: 0 }).cyl(0, 0.04, 0, 0.02, 0.012, 0.02, 6, LPC.gold, { jitter: 0 }).pop();
  lp.pop();
}

/** Cono gelato (in piedi): cialda a rombi, palline, e a scelta un fantasmino di panna sopra. */
export function coneLP(lp: LP, x: number, y: number, z: number, s = 1, scoops: string[] = ['#e7a6bf'], ghost = false) {
  lp.push([x, y, z], 0, 0, 0, s);
  lp.add(new THREE.ConeGeometry(0.045, 0.13, 7).rotateX(Math.PI).translate(0, 0.065, 0), '#d6a55a', { jitter: 0 });
  for (let i = 0; i < 3; i++) lp.cyl(0, 0.03 + i * 0.035, 0, 0.016 + i * 0.01, 0.018 + i * 0.01, 0.006, 7, '#b8863a', { jitter: 0, ao: 0 });
  scoops.forEach((c, i) => lp.blob(0, 0.15 + i * 0.06, 0, 0.05 - i * 0.004, 0.042, 0.05 - i * 0.004, c, { jitter: 0.004, detail: 1 }));
  if (ghost) {
    const top = 0.15 + scoops.length * 0.06;
    lp.blob(0, top, 0, 0.035, 0.05, 0.035, '#f6f8f8', { jitter: 0, detail: 1 });
    for (const sx of [-1, 1]) lp.blob(sx * 0.012, top + 0.012, 0.03, 0.006, 0.009, 0.004, '#28404a', { jitter: 0 });
  }
  lp.pop();
}

/**
 * Carretto dei gelati del fantasma (2×2, fronte verso +z): cassone a strisce
 * menta su due ruote a raggi (verticali, ben piantate a terra) e un piedino
 * davanti, coperchio aperto con le vaschette (menta spettrale, mirtillo di
 * palude, zucca), coni coi fantasmini di panna, campanello a teschio,
 * secchio di ghiaccio secco che fa la nebbiolina, ombrellone a spicchi con
 * i pipistrelli appesi e una ragnatela, e una lapide-menù coi gusti.
 */
export function iceCreamCartLP(v: PVis): LPModel {
  const lp = new LP(`lp:icecream:${v.seed}:${v.lit}`);
  const lit = v.lit, glow = glowOf(lit);
  const MINT = '#9fd8c4', CREAM = '#f2ead6', PINK = '#e7a6bf', PLUM = '#5a3f6a';
  lp.push([-0.05, 0, -0.18]);
  const R = 0.27;
  for (const s of [-1, 1]) spokeWheel(lp, 0.1, s * 0.43, R);
  lp.push([0.1, R, 0], 0, Math.PI / 2).cyl(0, -0.45, 0, 0.018, 0.018, 0.9, 6, LPC.iron, { jitter: 0 }).pop(); // assale
  // cassone frigo: legno chiaro dipinto, spigoli smussati, strisce menta, zoccolo prugna
  const BY = 0.3;
  lp.box(0, BY, 0, 1.0, 0.56, 0.74, CREAM, { bevel: 0.05, vary: 0.03, ao: 0.12 });
  lp.box(0, BY, 0, 1.02, 0.08, 0.76, PLUM, { bevel: 0.02 });
  for (const y of [0.5, 0.68]) lp.box(0, BY + y - 0.3, 0, 1.02, 0.05, 0.76, MINT, { bevel: 0.015 });
  for (let i = 0; i < 6; i++) lp.box(-0.4 + i * 0.16, BY + 0.1, 0.373, 0.012, 0.28, 0.006, '#d9cfb6', { jitter: 0, ao: 0 }); // doghe
  lp.box(0, BY + 0.56, 0, 1.06, 0.05, 0.8, '#d9cfb6', { bevel: 0.02 }); // bordo del piano
  // davanti: un cono dipinto col fantasmino che fa ciao
  lp.push([0.0, BY + 0.14, 0.382]);
  lp.plate(poly([[-0.06, 0.16], [0.06, 0.16], [0, -0.02]]), 0.006, '#d6a55a', { ao: 0 });
  lp.push([0, 0.2, 0.002]).plate((() => { const s = new THREE.Shape(); s.absarc(0, 0, 0.075, 0, Math.PI * 2, false); return s; })(), 0.006, PINK, { ao: 0 }).pop();
  lp.push([0, 0.3, 0.004]).plate(roundTopShape(0.1, 0.12, 6, -0.04), 0.006, '#f6f8f8', { ao: 0 }).pop();
  for (const sx of [-1, 1]) lp.blob(sx * 0.018, 0.31, 0.012, 0.007, 0.01, 0.003, '#28404a', { jitter: 0 });
  lp.pop();
  // vaschette sotto il coperchio a vetrinetta, paletta
  const TY = BY + 0.61;
  const tubs: Array<[number, number, string]> = [[-0.3, -0.14, '#a6f0d0'], [0.0, -0.14, '#8f7ad0'], [0.3, -0.14, '#f0a34a'], [-0.15, 0.14, CREAM], [0.15, 0.14, PINK]];
  for (const [x, z, c] of tubs) {
    lp.box(x, TY, z, 0.26, 0.05, 0.24, '#b8b4ae', { jitter: 0, bucket: 'gloss' });
    const g = c === '#a6f0d0' ? glow(c) : { color: c, bucket: 'solid' as const };
    for (let k = 0; k < 2; k++) lp.blob(x + (k - 0.5) * 0.07, TY + 0.06, z, 0.07, 0.04, 0.08, g.color, { bucket: g.bucket, jitter: 0.006, detail: 1 });
  }
  lp.blob(0.0, TY + 0.075, -0.16, 0.014, 0.014, 0.008, '#f2ead6', { jitter: 0 }); // occhietto nel mirtillo
  lp.push([0.36, TY + 0.07, 0.1], 0.4, 0, 0.8).cyl(0, 0, 0, 0.008, 0.008, 0.16, 4, CHROME, { jitter: 0 }).blob(0, 0.17, 0, 0.022, 0.012, 0.022, CHROME, { jitter: 0 }).pop();
  // coperchio a vetrinetta aperto all'indietro (telaio e vetro)
  lp.push([0, TY + 0.05, -0.38], 0, -1.8);
  lp.box(0, 0, 0.36, 1.0, 0.03, 0.72, '#d9cfb6', { bevel: 0.01 });
  lp.box(0, 0.03, 0.36, 0.86, 0.006, 0.6, '#a9c7c0', { jitter: 0, ao: 0, bucket: 'gloss' });
  // sotto (si vede dal davanti, a coperchio aperto): il menù dipinto su fondo prugna
  lp.box(0, -0.008, 0.36, 0.88, 0.008, 0.62, PLUM, { jitter: 0, ao: 0 });
  lp.blob(-0.28, -0.014, 0.44, 0.07, 0.006, 0.09, '#f6f8f8', { jitter: 0, detail: 0 }); // fantasmino
  for (const sx of [-1, 1]) lp.blob(-0.28 + sx * 0.025, -0.02, 0.47, 0.01, 0.004, 0.014, '#28404a', { jitter: 0, detail: 0 });
  lp.push([-0.28, -0.014, 0.27]).add(new THREE.ConeGeometry(0.05, 0.14, 3).scale(1, 1, 0.08).rotateX(Math.PI / 2), '#d6a55a', { jitter: 0, ao: 0 }).pop();
  for (let i = 0; i < 3; i++) {
    lp.blob(-0.02, -0.014, 0.52 - i * 0.12, 0.035, 0.006, 0.035, [MINT, '#8f7ad0', '#f0a34a'][i], { jitter: 0, detail: 0 });
    lp.box(0.17, -0.016, 0.52 - i * 0.12, 0.26, 0.004, 0.02, CREAM, { jitter: 0, ao: 0 });
  }
  lp.pop();
  // coni coi fantasmini in un portaconi, campanello a teschio
  lp.box(-0.42, TY, 0.3, 0.16, 0.06, 0.12, LPC.woodLight, { bevel: 0.01 });
  coneLP(lp, -0.46, TY + 0.03, 0.3, 0.8, ['#a6f0d0'], true);
  coneLP(lp, -0.38, TY + 0.03, 0.3, 0.8, [PINK, '#8f7ad0']);
  skull(lp, 0.42, TY, 0.3, 0.35);
  lp.cyl(0.42, TY + 0.075, 0.3, 0.012, 0.012, 0.03, 4, LPC.gold, { jitter: 0 });
  // manico per spingere e piedino davanti (il carretto sta in piano)
  for (const s of [-1, 1]) rod(lp, [-0.5, BY + 0.4, s * 0.3], [-0.82, BY + 0.5, s * 0.3], 0.018, LPC.iron);
  rod(lp, [-0.82, BY + 0.5, -0.32], [-0.82, BY + 0.5, 0.32], 0.026, '#6b4a2e');
  for (const s of [-1, 1]) rod(lp, [-0.42, BY, s * 0.28], [-0.46, 0, s * 0.3], 0.018, LPC.iron);
  // secchio di ghiaccio secco appeso di lato, con la nebbiolina che scende
  lp.push([0.56, BY + 0.24, 0.12]);
  lp.lathe(0, 0, 0, [[0, 0], [0.08, 0], [0.095, 0.15], [0, 0.15]], 8, '#8d8a84', { jitter: 0 });
  lp.add(new THREE.TorusGeometry(0.06, 0.006, 3, 10, Math.PI).translate(0, 0.15, 0), LPC.iron, { jitter: 0, ao: 0 });
  for (let i = 0; i < 4; i++) lp.blob(0.02 + i * 0.05, 0.15 - i * 0.08, 0.02 + (i % 2) * 0.04, 0.06 + i * 0.015, 0.035, 0.06, '#e8f4f2', { bucket: 'ghost', jitter: 0.006 });
  lp.pop();
  // ombrellone a spicchi su un palo, frangia, pipistrelli appesi, ragnatela
  lp.cyl(0.32, TY, -0.3, 0.018, 0.018, 1.0, 5, CHROME, { jitter: 0 });
  lp.push([0.32, TY + 1.0, -0.3], 0, 0.08);
  const UR = 0.7;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.24, 0, Math.cos(a0) * UR, 0, Math.sin(a0) * UR, Math.cos(a1) * UR, 0, Math.sin(a1) * UR, 0, 0.24, 0, Math.cos(a1) * UR, 0, Math.sin(a1) * UR, Math.cos(a0) * UR, 0, Math.sin(a0) * UR], 3));
    lp.add(g, i % 2 ? CREAM : MINT, { jitter: 0, ao: 0 });
    lp.push([Math.cos((a0 + a1) / 2) * UR * 0.96, -0.02, Math.sin((a0 + a1) / 2) * UR * 0.96]).cyl(0, -0.06, 0, 0, 0.06, 0.06, 3, i % 2 ? MINT : PINK, { jitter: 0 }).pop();
    rod(lp, [0, 0.0, 0], [Math.cos(a0) * UR * 0.95, -0.01, Math.sin(a0) * UR * 0.95], 0.005, '#8d8a84', 3); // stecche
  }
  for (const a of [0.6, 2.4, 4.3]) bat(lp, Math.cos(a) * UR * 0.8, -0.12, Math.sin(a) * UR * 0.8, 1.2, -a + Math.PI / 2);
  // fantasmino di panna in cima all'ombrellone
  lp.blob(0, 0.3, 0, 0.05, 0.07, 0.05, '#f6f8f8', { jitter: 0, detail: 1 });
  for (const sx of [-1, 1]) lp.blob(sx * 0.017, 0.31, 0.044, 0.007, 0.011, 0.004, '#28404a', { jitter: 0 });
  lp.pop();
  cobweb(lp, 0.32, TY + 0.9, -0.29, 0.18);
  // insegnina appesa al palo
  lp.push([0.32, TY + 0.62, -0.28]).box(0, 0, 0.03, 0.36, 0.16, 0.02, CREAM, { bevel: 0.01 }).blob(-0.1, 0.08, 0.045, 0.03, 0.04, 0.006, glow('#e4f2ff').color, { bucket: glow('#e4f2ff').bucket, jitter: 0 }).pop();
  for (let i = 0; i < 3; i++) lp.box(0.37 + i * 0.05, TY + 0.68, -0.235, 0.03, 0.012, 0.004, PLUM, { jitter: 0, ao: 0 });
  lp.pop();
  // davanti: lapide-menù con i gusti, cono caduto con la lumachina, fiorellini
  lp.push([0.72, 0, 0.7], -0.4, -0.08);
  const stone = poly([[-0.17, 0], [0.17, 0], [0.17, 0.32], [0, 0.42], [-0.17, 0.32]]);
  lp.extrude(stone, 0.06, LPC.stone, { bevel: 0.012, topTint: LPC.moss, topAmount: 0.3 });
  for (let i = 0; i < 3; i++) { lp.blob(-0.09, 0.1 + i * 0.075, 0.033, 0.018, 0.018, 0.004, [MINT, '#8f7ad0', '#f0a34a'][i], { jitter: 0 }); lp.box(0.03, 0.095 + i * 0.075, 0.033, 0.12, 0.012, 0.004, '#e8e4d6', { jitter: 0, ao: 0 }); }
  lp.pop();
  lp.push([-0.55, 0.03, 0.7], 1.2, 0, Math.PI / 2).add(new THREE.ConeGeometry(0.04, 0.11, 6), '#d6a55a', { jitter: 0 }).pop();
  lp.blob(-0.51, 0.05, 0.66, 0.05, 0.03, 0.05, PINK, { jitter: 0.005, detail: 0 });
  lp.push([-0.5, 0.075, 0.64]).blob(0, 0, 0, 0.018, 0.014, 0.012, '#a8936a', { jitter: 0 }).cyl(0.012, 0.01, 0, 0.003, 0.002, 0.02, 3, '#a8936a', { jitter: 0 }).pop(); // lumachina
  grassTuft(lp, -0.75, -0.75, 0.9); flower(lp, 0.85, -0.6, '#8f7aa8', 0.12); flower(lp, -0.8, 0.35, PINK, 0.1);
  if (lit) lp.light(0.0, 1.25, 0.05, '#d6fff0', 0.45, 2.6, 0.2, 0.5);
  return lp.build();
}

// ── Pianta carnivora ────────────────────────────────────────────────────

/** Trappolina chiusa (una pianta più piccola accanto alla grande): due valve rosse coi dentini. */
function smallTrap(lp: LP, x: number, z: number, h: number, ry: number, s = 1, open = 0.15) {
  lp.push([x, 0.04, z], ry);
  const stem = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, h * 0.5, 0.02), new THREE.Vector3(0, h, 0.04)];
  lp.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stem), 5, 0.016 * s, 4), '#3f5e34', { jitter: 0 });
  // come la bocca grande, in piccolo: due valve unite alla cerniera, quasi chiuse
  lp.push([0, h, 0.04], 0, -0.35, 0, 0.42 * s);
  for (const k of [-1, 1] as const) { lp.push([0, 0, 0], 0, -k * open); plantJawHalf(lp, k, false); lp.pop(); }
  lp.pop();
  lp.pop();
}

/** Foglia spinosa e scura, distesa a terra o ricurva (sagoma a lancia coi denti). */
function spikyLeaf(lp: LP, x: number, z: number, ry: number, len: number, lift: number, color: string) {
  lp.push([x, 0.06, z], ry, lift);
  const pts: V2[] = [[0, 0]];
  const n = 5;
  for (let i = 1; i <= n; i++) pts.push([len * 0.12 * Math.sin((i / n) * Math.PI) + 0.03 * (i % 2), (i / n) * len]);
  for (let i = n - 1; i >= 1; i--) pts.push([-len * 0.12 * Math.sin((i / n) * Math.PI) - 0.03 * (i % 2), (i / n) * len]);
  lp.push([0, 0, 0], 0, -Math.PI / 2).plate(poly(pts), 0.012, color, { ao: 0 }).pop();
  lp.pop();
}

/**
 * Pianta carnivora (1×1): nasce dalla terra smossa, con le radici che
 * affiorano, foglie spinose scure, due trappoline chiuse, un osso rosicchiato,
 * funghetti e sassi. Il gambo grosso sale e si piega fino alla bocca, che è
 * un pezzo animato a parte (si chiude ogni tanto, e quando passa il Custode).
 */
export function carnivorousPlantLP(): LPModel {
  const lp = new LP('new4:plant');
  const r = lp.rng;
  // terra smossa con le radici che affiorano
  lp.blob(0, 0, 0, 0.42, 0.06, 0.4, LPC.soil, { detail: 1, jitter: 0.02 });
  lp.blob(0.02, 0.02, 0.0, 0.2, 0.07, 0.19, '#5e4a3c', { detail: 1, jitter: 0.012 }); // la terra smossa attorno al gambo
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r.range(-0.3, 0.3), l = r.range(0.24, 0.4);
    const pts = [new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(Math.cos(a) * l * 0.4, 0.085, Math.sin(a) * l * 0.4), new THREE.Vector3(Math.cos(a + 0.25) * l * 0.75, 0.05, Math.sin(a + 0.25) * l * 0.75), new THREE.Vector3(Math.cos(a + 0.35) * l, 0.0, Math.sin(a + 0.35) * l)];
    lp.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.026 - i * 0.002, 5), '#6a4a34', { jitter: 0, vary: 0.1 });
  }
  // foglie spinose a terra (verde-prugna) e due ricurve
  const LEAF = ['#3a4f30', '#4a3a48', '#2f4a2c'];
  for (let i = 0; i < 7; i++) spikyLeaf(lp, 0, 0, (i / 7) * Math.PI * 2 + r.range(-0.2, 0.2), r.range(0.26, 0.38), r.range(0.25, 0.75), LEAF[i % 3]);
  // gambo grosso che sale e si piega verso la bocca, con due foglie lungo il fusto
  const stem = [new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(0.05, 0.3, -0.02), new THREE.Vector3(-0.03, 0.55, 0.02), new THREE.Vector3(0.0, 0.72, 0.06)];
  lp.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stem), 10, 0.042, 6), '#4a6e38', { jitter: 0, vary: 0.06 });
  lp.lathe(0, 0.02, 0, [[0.07, 0], [0.05, 0.06], [0.044, 0.1]], 6, '#3f5e34', { jitter: 0 });
  for (const [y, a, l] of [[0.32, 0.6, 0.2], [0.48, 3.4, 0.17]] as const) {
    lp.push([0.02, y, 0], a, -0.7).plate(poly([[0, 0], [0.05, l * 0.4], [0.03, l * 0.75], [0, l], [-0.03, l * 0.75], [-0.05, l * 0.4]]), 0.01, '#3f6a2e', { ao: 0 }).pop();
  }
  lp.blob(PLANT_JAW[0], PLANT_JAW[1] - 0.02, PLANT_JAW[2] - 0.02, 0.06, 0.05, 0.06, '#4a6e38', { jitter: 0, detail: 1 }); // nodo della cerniera
  // trappoline chiuse, osso rosicchiato, funghetti, sassi
  smallTrap(lp, -0.22, 0.14, 0.22, 0.6);
  smallTrap(lp, 0.2, -0.16, 0.16, -2.2, 0.85);
  lp.push([0.2, 0.03, 0.22], 0.7, 0, Math.PI / 2).cyl(0, -0.07, 0, 0.012, 0.012, 0.14, 4, LPC.bone, { jitter: 0 }).pop();
  for (const k of [-1, 1]) lp.blob(0.2 + k * 0.05, 0.03, 0.22 + k * 0.06, 0.02, 0.018, 0.02, LPC.bone, { jitter: 0 });
  for (const [x, z, h] of [[-0.3, -0.12, 0.06], [-0.26, -0.2, 0.045]] as const) { lp.cyl(x, 0, z, 0.01, 0.008, h, 4, '#e8dcc0', { jitter: 0 }); lp.blob(x, h, z, 0.03, 0.018, 0.03, '#8f5a8a', { jitter: 0 }); }
  pebbles(lp, -0.4, -0.4, 0.4, 0.4, 4);
  return lp.build();
}

/** Dove sta la cerniera della bocca della pianta (in cima al gambo). */
export const PLANT_JAW: [number, number, number] = [0.0, 0.76, 0.08];

/**
 * Una valva della bocca (origine alla cerniera, bocca verso +z; `s` +1 sopra,
 * −1 sotto): una conchiglia rossa unita alla cerniera, col palato rosa, i
 * denti lunghi lungo il bordo (sfalsati sopra e sotto, così s'incastrano),
 * i puntini gialli e, sotto, una goccia di bava.
 */
export function plantJawHalf(lp: LP, s: 1 | -1, drool = true) {
  const RED = s > 0 ? '#c4403e' : '#a8343a', IN = '#e88a9a';
  const RX = 0.16, RY = 0.075, RZ = 0.15;
  // conchiglia: mezza sfera schiacciata; il bordo dietro sta sulla cerniera
  const dome = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(RX, RY, RZ);
  if (s < 0) dome.rotateX(Math.PI);
  dome.translate(0, 0, RZ);
  lp.add(dome, RED, { jitter: 0.003, vary: 0.05 });
  // palato rosa che chiude la conchiglia dal lato della bocca
  lp.add(new THREE.CircleGeometry(1, 14).scale(RX * 0.96, RZ * 0.96, 1).rotateX(s > 0 ? Math.PI / 2 : -Math.PI / 2).translate(0, -s * 0.002, RZ), IN, { jitter: 0, ao: 0 });
  // labbro verde lungo il bordo
  lp.add(new THREE.TorusGeometry(1, 0.06, 3, 18).scale(RX, RZ, 0.15).rotateX(Math.PI / 2).translate(0, 0, RZ), '#6a8a3a', { jitter: 0, ao: 0 });
  // denti lunghi sul bordo davanti (non verso la cerniera), sfalsati fra sopra e sotto
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -0.25 + ((i + (s > 0 ? 0 : 0.5)) / n) * (Math.PI + 0.5);
    const x = Math.cos(a) * RX, z = RZ + Math.sin(a) * RZ;
    lp.push([x, 0, z]).add(new THREE.ConeGeometry(0.009, 0.06, 3).rotateX(s > 0 ? Math.PI : 0).translate(0, -s * 0.03, 0), '#f3ecda', { jitter: 0, ao: 0 }).pop();
  }
  // puntini e venature sul dorso
  for (let i = 0; i < 5; i++) {
    const a = 0.4 + i * 0.5;
    lp.blob(Math.cos(a) * RX * 0.55, s * RY * 0.8, RZ + Math.sin(a) * RZ * 0.55, 0.014, 0.008, 0.014, '#f2d24a', { jitter: 0, detail: 0 });
  }
  if (s < 0 && drool) lp.blob(0.05, -0.02, RZ * 1.9, 0.012, 0.035, 0.012, '#b8e6a0', { jitter: 0, bucket: 'ghost' }); // goccia di bava
}

/** La bocca intera, ferma a metà (miniature e anteprime): `open` 0 chiusa … 1 spalancata. */
export function plantJaws(lp: LP, open = 0.6) {
  const a = 0.12 + open * 0.6;
  lp.push(PLANT_JAW);
  for (const s of [-1, 1] as const) { lp.push([0, 0, 0], 0, -s * a); plantJawHalf(lp, s); lp.pop(); }
  lp.pop();
}

// ── Chiosco del fioraio ─────────────────────────────────────────────────

/** Secchio di zinco con un mazzo di fiori dentro. */
function pail(lp: LP, x: number, y: number, z: number, cols: readonly string[], n = 6) {
  const r = lp.rng;
  lp.lathe(x, y, z, [[0, 0], [0.075, 0], [0.095, 0.16], [0.1, 0.17], [0, 0.17]], 9, '#a8adb2', { jitter: 0, bucket: 'gloss' });
  lp.cyl(x, y + 0.06, z, 0.088, 0.088, 0.012, 9, '#8d9298', { jitter: 0, ao: 0 });
  for (let k = 0; k < n; k++) flower(lp, x + r.range(-0.05, 0.05), z + r.range(-0.05, 0.05), r.pick(cols), 0.18 + r.next() * 0.1, y + 0.1);
}

/**
 * Chiosco del fioraio (2×2, fronte verso +z): bancarella di legno su quattro
 * pali, col tettuccio di scandole prugna e l'insegna in cima (una rosa e un
 * teschietto dipinti), gradoni coi secchi di fiori, rose nere, un vaso a
 * teschio, mazzi secchi appesi, la corona funebre col nastro sul palo, il
 * cavalletto col prezzo appoggiato a terra davanti, candele nei barattoli,
 * un corvo sul tetto e una cassetta a forma di bara piena di fiori.
 */
export function flowerKioskLP(v: PVis): LPModel {
  const lp = new LP(`lp:florist:${v.seed}:${v.lit}`);
  const lit = v.lit, glow = glowOf(lit), r = lp.rng;
  const PLUM = '#5a3f6a', PLUM_D = '#43304f';
  const FL = [...LPC.flowers, '#f2ead6', '#c44a5a', '#e7a6bf'];
  lp.push([0, 0, -0.3]);
  // pedana di assi
  for (let i = 0; i < 7; i++) lp.box(-0.81 + i * 0.27, 0, 0.05, 0.26, 0.05, 1.0, i % 2 ? LPC.wood : LPC.woodDark, { bevel: 0.006, vary: 0.1 });
  // banco a gradoni: fronte di assi verticali, due gradini
  lp.box(0, 0.05, 0.12, 1.5, 0.44, 0.5, LPC.woodLight, { bevel: 0.015, vary: 0.08 });
  for (let i = 0; i < 9; i++) lp.box(-0.68 + i * 0.17, 0.08, 0.372, 0.15, 0.38, 0.012, i % 2 ? LPC.wood : '#8a6a50', { jitter: 0.002, vary: 0.08 });
  lp.box(0, 0.49, 0.12, 1.56, 0.035, 0.54, LPC.woodDark, { bevel: 0.01 });
  lp.box(0, 0.05, -0.27, 1.5, 0.72, 0.3, LPC.wood, { bevel: 0.012, vary: 0.08 });
  lp.box(0, 0.77, -0.27, 1.56, 0.035, 0.34, LPC.woodDark, { bevel: 0.01 });
  // teschio dipinto sul fronte del banco, tra due rose
  lp.blob(0, 0.3, 0.38, 0.07, 0.07, 0.01, LPC.bone, { jitter: 0 });
  for (const sx of [-1, 1]) lp.blob(sx * 0.025, 0.31, 0.388, 0.016, 0.018, 0.004, LPC.charcoal, { jitter: 0 });
  for (const sx of [-1, 1]) lp.blob(sx * 0.16, 0.3, 0.382, 0.04, 0.04, 0.008, '#9e4b45', { jitter: 0 });
  // secchi di fiori sui gradoni; un secchio di rose nere
  for (const x of [-0.55, -0.18, 0.18]) pail(lp, x, 0.525, 0.15, FL);
  pail(lp, 0.55, 0.525, 0.15, ['#2a1f2a', '#3a2232', '#1f1a22'], 5);
  for (const x of [-0.45, 0.0]) pail(lp, x, 0.805, -0.27, FL, 7);
  // vaso a teschio con i gigli
  skull(lp, 0.42, 0.805, -0.27, 0.7);
  for (let k = 0; k < 3; k++) flower(lp, 0.4 + k * 0.03, -0.27 + (k - 1) * 0.02, '#f2ead6', 0.22 + k * 0.03, 0.88);
  // pali e tettuccio di scandole prugna a due falde
  for (const x of [-0.78, 0.78]) for (const z of [-0.42, 0.38]) lp.cyl(x, 0.05, z, 0.035, 0.03, 1.62, 6, LPC.woodDark, { vary: 0.08 });
  const RY = 1.67;
  for (const s of [-1, 1]) {
    lp.push([0, RY, -0.02 + s * 0.3], 0, s * 0.38);
    lp.box(0, -0.02, 0, 1.86, 0.04, 0.66, LPC.woodDark, { bevel: 0.01 });
    for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) lp.box(-0.84 + i * 0.21 + (row % 2) * 0.1, 0.02, -s * (0.25 - row * 0.16), 0.2, 0.03, 0.17, r.next() > 0.5 ? PLUM : PLUM_D, { bevel: 0.006, vary: 0.08 });
    lp.pop();
  }
  lp.box(0, RY + 0.1, -0.02, 1.9, 0.06, 0.08, PLUM_D, { bevel: 0.01 }); // colmo
  // insegna in cima al colmo, su due staffe: tavola con la rosa e il teschietto
  lp.push([0, RY + 0.13, -0.02]);
  for (const s of [-1, 1]) lp.box(s * 0.3, 0, 0, 0.03, 0.14, 0.03, LPC.iron, { jitter: 0 });
  lp.push([0, 0.12, 0]);
  lp.extrude(roundTopShape(0.86, 0.32, 7), 0.05, '#e8dcc0', { bevel: 0.012 });
  lp.push([0, 0, 0.026]).plate(roundTopShape(0.76, 0.24, 7, 0.04), 0.004, '#3b2a3f', { ao: 0 }).pop();
  lp.blob(-0.18, 0.17, 0.032, 0.05, 0.05, 0.01, '#c44a5a', { jitter: 0 }); lp.blob(-0.18, 0.17, 0.04, 0.02, 0.02, 0.006, '#9e4b45', { jitter: 0 });
  lp.box(-0.18, 0.08, 0.032, 0.008, 0.06, 0.004, '#5c8a3e', { jitter: 0 });
  lp.blob(0.05, 0.16, 0.032, 0.04, 0.04, 0.008, LPC.bone, { jitter: 0 }); for (const sx of [-1, 1]) lp.blob(0.05 + sx * 0.014, 0.165, 0.04, 0.008, 0.009, 0.003, LPC.charcoal, { jitter: 0 });
  for (let i = 0; i < 3; i++) lp.box(0.22, 0.1 + i * 0.05, 0.032, 0.14 - i * 0.03, 0.012, 0.004, '#e8dcc0', { jitter: 0, ao: 0 }); // «scritte»
  lp.pop();
  lp.pop();
  // corvo appollaiato sul colmo
  lp.push([0.72, RY + 0.13, -0.02], -0.6);
  lp.blob(0, 0.07, 0, 0.055, 0.06, 0.08, '#1d1a22', { jitter: 0.004, detail: 1 });
  lp.blob(0, 0.15, 0.06, 0.04, 0.04, 0.04, '#1d1a22', { jitter: 0.003, detail: 1 });
  lp.push([0, 0.15, 0.1]).add(new THREE.ConeGeometry(0.014, 0.05, 4).rotateX(Math.PI / 2).translate(0, 0, 0.02), '#3a3530', { jitter: 0 }).pop();
  lp.blob(0.018, 0.16, 0.088, 0.006, 0.006, 0.004, '#e9b65a', { jitter: 0 });
  lp.push([0, 0.06, -0.08], 0, 0.5).box(0, 0, 0, 0.06, 0.01, 0.08, '#1d1a22', { jitter: 0 }).pop();
  lp.pop();
  // mazzi secchi appesi sotto il tetto, lanterna, ragnatela
  for (const x of [-0.55, -0.2, 0.2, 0.55]) {
    lp.cyl(x, 1.4, 0.3, 0.003, 0.003, 0.14, 3, LPC.iron, { jitter: 0 });
    lp.push([x, 1.4, 0.3], 0, Math.PI).cyl(0, 0, 0, 0.015, 0.01, 0.14, 4, '#5c7a3e', { jitter: 0 }).pop();
    for (let k = 0; k < 3; k++) lp.blob(x + (k - 1) * 0.025, 1.22, 0.3, 0.03, 0.025, 0.03, r.pick(['#9a6a4a', '#b8785a', '#8a5a7a', '#5a3f6a']), { jitter: 0.004, detail: 0 });
  }
  lp.cyl(-0.78, 1.48, 0.38, 0.004, 0.004, 0.1, 3, LPC.iron, { jitter: 0 });
  lp.box(-0.7, 1.3, 0.38, 0.1, 0.14, 0.1, LPC.iron, { bevel: 0.01 });
  { const g = glow('#ffd27a'); lp.box(-0.7, 1.32, 0.38, 0.075, 0.1, 0.105, g.color, { bucket: g.bucket, jitter: 0 }); }
  cobweb(lp, 0.78, 1.5, 0.4, 0.22, true);
  // la corona funebre col nastro, appesa al palo davanti a destra
  wreath(lp, 0.78, 0.98, 0.46, -0.05, 1.6);
  lp.push([0.78, 0.98 - 0.24, 0.5]);
  for (const s of [-1, 1]) lp.push([s * 0.03, 0, 0], 0, 0, s * 0.18).box(0, -0.2, 0, 0.05, 0.22, 0.008, '#3a2232', { jitter: 0, ao: 0 }).pop();
  lp.pop();
  // candele nei barattoli sul gradino alto
  for (const x of [-0.7, 0.2]) { lp.cyl(x, 0.805, -0.2, 0.035, 0.035, 0.08, 7, '#a9c7c0', { jitter: 0, bucket: 'gloss' }); candle(lp, x, 0.81, -0.2, lit, 0.06, false); }
  lp.pop();
  // davanti: il cavalletto col prezzo (un fuoco fatuo), la cassetta-bara coi fiori, l'annaffiatoio
  lp.push([-0.45, 0, 0.72], 0.35);
  for (const s of [-1, 1]) lp.push([0, 0, s * 0.06], 0, -s * 0.22).box(0, 0, 0, 0.36, 0.5, 0.025, LPC.woodDark, { bevel: 0.006 }).pop();
  lp.push([0, 0.04, 0.066], 0, -0.22).box(0, 0.06, 0.012, 0.3, 0.36, 0.004, '#2a2a2e', { jitter: 0, ao: 0 }).pop();
  lp.push([0, 0.04, 0.066], 0, -0.22);
  lp.blob(-0.05, 0.3, 0.022, 0.04, 0.04, 0.006, '#c44a5a', { jitter: 0 }); lp.box(-0.05, 0.18, 0.022, 0.006, 0.1, 0.004, '#5c8a3e', { jitter: 0 });
  { const g = glow('#8ff0dc'); lp.blob(0.07, 0.24, 0.022, 0.025, 0.036, 0.005, g.color, { bucket: g.bucket, jitter: 0 }); }
  for (let i = 0; i < 2; i++) lp.box(0, 0.12 - i * 0.05, 0.022, 0.2 - i * 0.06, 0.012, 0.004, '#e8e4d6', { jitter: 0, ao: 0 });
  lp.pop();
  lp.pop();
  lp.push([0.45, 0, 0.75], -0.2);
  const box = poly([[-0.24, -0.07], [0.12, -0.1], [0.26, 0], [0.12, 0.1], [-0.24, 0.07]]);
  lp.push([0, 0.06, 0], 0, -Math.PI / 2).extrude(box, 0.12, LPC.woodDark, { bevel: 0.008 }).pop();
  lp.box(0, 0.12, 0, 0.42, 0.01, 0.14, LPC.soilDark, { jitter: 0 });
  for (let k = 0; k < 6; k++) flower(lp, -0.18 + k * 0.07, r.range(-0.04, 0.04), r.pick(FL), 0.1 + r.next() * 0.05, 0.12);
  lp.pop();
  lp.push([0.86, 0, 0.45], 0.6);
  lp.lathe(0, 0, 0, [[0, 0], [0.08, 0], [0.085, 0.15], [0, 0.15]], 8, '#5f8a6a', { jitter: 0, bucket: 'gloss' });
  rod(lp, [0.07, 0.09, 0], [0.2, 0.17, 0], 0.012, '#5f8a6a');
  lp.add(new THREE.TorusGeometry(0.06, 0.01, 4, 10, Math.PI).translate(-0.02, 0.16, 0), '#5f8a6a', { jitter: 0, ao: 0 });
  lp.pop();
  for (let i = 0; i < 10; i++) lp.blob(r.range(-0.9, 0.9), 0.006, r.range(0.35, 0.95), 0.02, 0.004, 0.015, r.pick(FL), { jitter: 0, detail: 0 }); // petali
  deadLeaves(lp, -0.9, 0.5, 0.9, 0.95, 6);
  if (lit) { lp.light(-0.7, 1.25, 0.1, '#ffd8a0', 0.4, 2.4, 0.25, 0.4); lp.light(0, 0.95, -0.4, '#ffc76e', 0.3, 1.8, 0.4, 0.35); }
  return lp.build();
}

// ── Ufficio postale ─────────────────────────────────────────────────────

/** Rettangolo appoggiato a y = 0 e centrato in x. */
const rectShapeLocal = (w: number, h: number) => poly([[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]]);

/** Busta (davanti verso +z): carta, patta a triangolo e sigillo; `s` scala. */
function envelope(lp: LP, x: number, y: number, z: number, s = 1, ry = 0, rx = 0) {
  lp.push([x, y, z], ry, rx, 0, s);
  lp.box(0, -0.1, 0, 0.32, 0.2, 0.02, '#f2ead6', { bevel: 0.004 });
  lp.push([0, 0.1, 0.011]).plate(poly([[-0.16, 0], [0.16, 0], [0, -0.13]]), 0.004, '#d9cfb6', { ao: 0 }).pop();
  lp.blob(0, -0.03, 0.018, 0.03, 0.03, 0.008, '#a33d33', { jitter: 0 });
  lp.pop();
}

/**
 * Ufficio postale degli scheletri (3×3, porta verso +z): un edificio pubblico,
 * non una casa: zoccolo di pietra con i gradini, facciata col frontone e il
 * cornicione, lesene chiare agli spigoli e ai lati del portone ad arco (la
 * chiave di volta è un teschietto), due finestroni ad arco illuminati, tetto
 * di ardesia dietro il frontone, e in cima al frontone la grande busta di
 * ferro battuto col sigillo, fissata su un piedistallo. Davanti: buca rossa a
 * colonna, sacchi di posta, pacchi legati (uno a forma di bara), due lanterne,
 * lettere sparse, corvi sul cornicione.
 */
export function postOfficeLP(v: PVis): LPModel {
  const lp = new LP(`lp:post:${v.seed}:${v.dirty}${v.broken}:${v.lit}`);
  const lit = v.lit, glow = glowOf(lit), r = lp.rng;
  const WALL = '#55647a', WALL_D = '#46546a', TRIM = '#ddd2bb', STONE = LPC.stoneWarm, ROOF = '#2f3542', RED = '#b8463a', DOOR = '#2f4a3e';
  const W = 2.3, D = 1.6, H = 1.35, ZF = 0.45; // facciata a z = ZF + D/2
  lp.push([0, 0, -0.3]);
  // zoccolo e gradini
  lp.box(0, 0, 0, W + 0.16, 0.14, D + 0.12, LPC.stoneDark, { bevel: 0.015, vary: 0.05 });
  for (let i = 0; i < 2; i++) lp.box(0, 0, D / 2 + 0.1 + (1 - i) * 0.12, 0.9 - i * 0.14, 0.07 + i * 0.07, 0.14 + (1 - i) * 0.12, STONE, { bevel: 0.01, vary: 0.06 });
  // corpo: muro intonacato, fascia bassa di pietra
  lp.box(0, 0.14, 0, W, H, D, WALL, { bevel: 0.02, vary: 0.04, ao: 0.18 });
  lp.box(0, 0.14, 0, W + 0.02, 0.24, D + 0.02, STONE, { bevel: 0.01, vary: 0.05 });
  // lesene chiare (dentro la sagoma del muro, sporgono di poco)
  const FZ = D / 2;
  for (const x of [-W / 2 + 0.08, -0.52, 0.52, W / 2 - 0.08]) {
    lp.box(x, 0.38, FZ + 0.015, 0.14, H - 0.26, 0.04, TRIM, { bevel: 0.008, vary: 0.03 });
    lp.box(x, H + 0.04, FZ + 0.02, 0.18, 0.06, 0.05, TRIM, { bevel: 0.006 }); // capitello
  }
  for (const s of [-1, 1]) lp.box(s * (W / 2 + 0.005), 0.38, 0, 0.03, H - 0.26, D - 0.2, WALL_D, { jitter: 0, ao: 0 }); // fianchi più scuri
  // cornicione
  lp.box(0, H + 0.1, 0.02, W + 0.14, 0.08, D + 0.14, TRIM, { bevel: 0.012 });
  // tetto di ardesia a due falde (dietro il frontone), colmo, comignolo
  for (const s of [-1, 1]) {
    lp.push([0, H + 0.18, s * 0.42], 0, s * 0.5);
    lp.box(0, 0, 0, W + 0.1, 0.06, 0.96, ROOF, { bevel: 0.01, vary: 0.1 });
    for (let row = 0; row < 4; row++) lp.box(0, 0.06, -s * (0.38 - row * 0.24), W + 0.08, 0.02, 0.06, '#262b36', { jitter: 0, ao: 0 });
    lp.pop();
  }
  lp.box(0, H + 0.4, 0, W + 0.12, 0.06, 0.1, '#262b36', { bevel: 0.01 });
  lp.push([-0.75, H + 0.3, -0.35], 0, 0, 0.04).box(0, 0, 0, 0.22, 0.42, 0.22, STONE, { bevel: 0.01 }).box(0, 0.42, 0, 0.27, 0.05, 0.27, LPC.stoneDark, { jitter: 0 }).pop();
  for (let i = 0; i < 3; i++) lp.blob(-0.74 + i * 0.04, H + 0.85 + i * 0.1, -0.35 - i * 0.03, 0.06 + i * 0.015, 0.045, 0.06, '#c8c4c0', { bucket: 'ghost', jitter: 0.006 });
  // frontone triangolare sulla facciata (sopra il cornicione), con l'oculo
  lp.push([0, H + 0.14, FZ + 0.0]);
  const ped = poly([[-W / 2 - 0.04, 0], [W / 2 + 0.04, 0], [0, 0.58]]);
  lp.extrude(ped, 0.16, WALL, { bevel: 0.01, vary: 0.04 });
  const pedIn = poly([[-W / 2 + 0.16, 0.06], [W / 2 - 0.16, 0.06], [0, 0.48]]);
  lp.push([0, 0, 0.082]).plate(pedIn, 0.006, WALL_D, { ao: 0 }).pop();
  slab(lp, [-W / 2 - 0.06, -0.01], [0, 0.6], 0.2, 0.06, TRIM, { bevel: 0.008 }); slab(lp, [0, 0.6], [W / 2 + 0.06, -0.01], 0.2, 0.06, TRIM, { bevel: 0.008 }); // cornici inclinate
  lp.push([0, 0.24, 0.088]).add(new THREE.CircleGeometry(0.11, 12), glow('#f0b45f').color, { bucket: glow('#f0b45f').bucket, jitter: 0, ao: 0 }).pop();
  lp.push([0, 0.24, 0.09]).add(new THREE.TorusGeometry(0.115, 0.02, 4, 14), TRIM, { jitter: 0, ao: 0 }).pop();
  for (const a of [0, Math.PI / 2]) lp.push([0, 0.24, 0.094], 0, 0, a).box(0, -0.11, 0, 0.012, 0.22, 0.006, TRIM, { jitter: 0, ao: 0 }).pop();
  // in cima: piedistallo e la grande busta di ferro battuto col sigillo
  lp.push([0, 0.58, 0]);
  lp.box(0, -0.04, 0, 0.18, 0.1, 0.16, TRIM, { bevel: 0.01 });
  lp.box(0, 0.06, 0, 0.05, 0.14, 0.05, LPC.iron, { jitter: 0 });
  lp.push([0, 0.2, 0]);
  lp.box(0, 0, 0, 0.62, 0.4, 0.05, LPC.iron, { bevel: 0.01 });
  lp.box(0, 0.03, 0.028, 0.54, 0.34, 0.01, '#f2ead6', { jitter: 0 });
  lp.push([0, 0.37, 0.034]).plate(poly([[-0.27, 0], [0.27, 0], [0, -0.2]]), 0.006, '#d9cfb6', { ao: 0 }).pop();
  for (const s of [-1, 1]) slab(lp, [s * 0.27, 0.37], [0, 0.17], 0.012, 0.01, LPC.iron, { jitter: 0 }); // bordo della patta
  lp.blob(0, 0.17, 0.045, 0.055, 0.055, 0.012, '#a33d33', { jitter: 0 });
  lp.blob(0, 0.175, 0.056, 0.02, 0.024, 0.004, glow('#8ff0dc').color, { bucket: glow('#8ff0dc').bucket, jitter: 0 }); // sigillo col fuoco fatuo
  for (const s of [-1, 1]) rod(lp, [s * 0.12, -0.02, 0], [s * 0.04, -0.12, 0], 0.012, LPC.iron); // volute di sostegno
  lp.pop();
  lp.pop();
  lp.pop();
  // portone ad arco a due ante con la lunetta, cornice e teschietto in chiave
  lp.push([0, 0.14, FZ + 0.002]);
  lp.plate(roundTopShape(0.76, 0.98, 8), 0.04, TRIM, { ao: 0 });
  lp.push([0, 0, 0.03]).plate(roundTopShape(0.62, 0.9, 8), 0.02, DOOR, { ao: 0 }).pop();
  lp.box(0, 0, 0.05, 0.012, 0.66, 0.008, '#1f3329', { jitter: 0, ao: 0 });
  for (const s of [-1, 1]) for (const y of [0.12, 0.42]) lp.box(s * 0.15, y, 0.052, 0.2, 0.2, 0.006, '#28413a', { jitter: 0, ao: 0 }); // riquadri
  lp.push([0, 0.69, 0.052]).plate(roundTopShape(0.5, 0.18, 6, -0.02), 0.004, glow('#f0b45f').color, { bucket: glow('#f0b45f').bucket, ao: 0 }).pop(); // lunetta
  for (const s of [-1, 1]) lp.blob(s * 0.05, 0.36, 0.06, 0.018, 0.018, 0.012, LPC.gold, { jitter: 0 });
  lp.box(-0.15, 0.24, 0.056, 0.12, 0.025, 0.006, LPC.gold, { jitter: 0 }); // feritoia per le lettere
  skull(lp, 0, 0.92, 0.02, 0.4);
  lp.pop();
  // finestroni ad arco ai lati del portone, illuminati, con il davanzale e le inferriate
  for (const s of [-1, 1]) {
    lp.push([s * 0.8, 0.48, FZ + 0.002]);
    lp.plate(roundTopShape(0.4, 0.74, 7), 0.03, TRIM, { ao: 0 });
    lp.push([0, 0.04, 0.02]).plate(roundTopShape(0.3, 0.64, 7), 0.01, glow('#f0b45f').color, { bucket: glow('#f0b45f').bucket, ao: 0 }).pop();
    lp.box(0, 0.04, 0.035, 0.02, 0.6, 0.008, TRIM, { jitter: 0, ao: 0 });
    lp.box(0, 0.34, 0.035, 0.3, 0.02, 0.008, TRIM, { jitter: 0, ao: 0 });
    for (const x of [-0.09, 0.09]) lp.box(x, 0.04, 0.045, 0.012, 0.5, 0.012, LPC.iron, { jitter: 0, ao: 0 });
    lp.box(0, -0.04, 0.05, 0.46, 0.04, 0.1, TRIM, { bevel: 0.006 });
    // dentro, contro il vetro: pile di lettere e un pacco
    lp.box(s * -0.08, 0.0, 0.03, 0.14, 0.08, 0.02, '#c9a27a', { jitter: 0, ao: 0 });
    lp.pop();
  }
  // fianchi: due finestre ad arco per lato; dietro: porta di servizio e pluviale
  for (const s of [-1, 1]) for (const z of [-0.38, 0.26]) {
    lp.push([s * (W / 2 + 0.002), 0.5, z], s * Math.PI / 2);
    lp.plate(roundTopShape(0.36, 0.62, 7), 0.025, TRIM, { ao: 0 });
    lp.push([0, 0.04, 0.015]).plate(roundTopShape(0.26, 0.52, 7), 0.012, glow('#f0b45f').color, { bucket: glow('#f0b45f').bucket, ao: 0 }).pop();
    lp.box(0, 0.04, 0.03, 0.016, 0.48, 0.008, TRIM, { jitter: 0, ao: 0 });
    lp.box(0, -0.04, 0.04, 0.42, 0.04, 0.08, TRIM, { bevel: 0.006 });
    lp.pop();
  }
  lp.push([0.55, 0.14, -D / 2 - 0.002], Math.PI);
  lp.plate(rectShapeLocal(0.44, 0.78), 0.03, TRIM, { ao: 0 });
  lp.push([0, 0.02, 0.02]).plate(rectShapeLocal(0.34, 0.7), 0.02, DOOR, { ao: 0 }).pop();
  lp.blob(0.11, 0.38, 0.05, 0.016, 0.016, 0.012, LPC.gold, { jitter: 0 });
  lp.pop();
  lp.cyl(-W / 2 + 0.1, 0.14, -D / 2 - 0.05, 0.03, 0.03, H + 0.04, 6, '#3a3f48', { jitter: 0 });
  lp.box(-W / 2 + 0.1, H + 0.12, -D / 2 - 0.05, 0.1, 0.05, 0.1, '#3a3f48', { jitter: 0 });
  // lanterne ai lati del portone
  for (const s of [-1, 1]) {
    lp.push([s * 0.52, 0.98, FZ + 0.06]);
    lp.box(0, 0.12, -0.02, 0.03, 0.03, 0.08, LPC.iron, { jitter: 0 });
    lp.box(0, -0.06, 0.04, 0.1, 0.16, 0.1, LPC.iron, { bevel: 0.01 });
    { const g = glow('#ffd27a'); lp.box(0, -0.04, 0.04, 0.075, 0.12, 0.105, g.color, { bucket: g.bucket, jitter: 0 }); }
    lp.push([0, 0.1, 0.04], Math.PI / 4).cyl(0, 0, 0, 0.08, 0.01, 0.06, 4, LPC.iron, { jitter: 0 }).pop();
    lp.pop();
  }
  // corvi sul cornicione, ragnatela all'angolo
  for (const [x, ry] of [[-0.95, 0.4], [0.62, -0.5]] as const) {
    lp.push([x, H + 0.18, FZ + 0.13], ry);
    lp.blob(0, 0.07, 0, 0.05, 0.055, 0.075, '#1d1a22', { jitter: 0.004, detail: 1 });
    lp.blob(0, 0.14, 0.055, 0.036, 0.036, 0.036, '#1d1a22', { jitter: 0.003, detail: 1 });
    lp.push([0, 0.14, 0.09]).add(new THREE.ConeGeometry(0.012, 0.045, 4).rotateX(Math.PI / 2).translate(0, 0, 0.02), '#3a3530', { jitter: 0 }).pop();
    lp.blob(0.016, 0.15, 0.08, 0.005, 0.005, 0.004, '#e9b65a', { jitter: 0 });
    lp.pop();
  }
  cobweb(lp, W / 2 - 0.02, H + 0.06, FZ + 0.04, 0.26, true);
  lp.pop();
  // davanti: buca rossa a colonna, sacchi, pacchi (uno a forma di bara), lettere sparse
  lp.push([1.12, 0, 0.92]);
  lp.cyl(0, 0, 0, 0.16, 0.15, 0.1, 10, '#8a3530', { jitter: 0 });
  lp.cyl(0, 0.1, 0, 0.14, 0.14, 0.62, 10, RED, { vary: 0.04, ao: 0.1 });
  lp.lathe(0, 0.72, 0, [[0.16, 0], [0.16, 0.04], [0.11, 0.1], [0, 0.13]], 10, RED, { jitter: 0 });
  lp.box(0, 0.58, 0.13, 0.15, 0.025, 0.03, '#1e1a1c', { jitter: 0 });
  lp.box(0, 0.34, 0.14, 0.12, 0.12, 0.005, TRIM, { jitter: 0 });
  lp.blob(0, 0.86, 0, 0.03, 0.02, 0.03, LPC.gold, { jitter: 0 });
  lp.pop();
  for (const [x, z, s] of [[-1.15, 0.88, 1], [-0.92, 1.08, 0.8]] as const) {
    lp.blob(x, 0.2 * s, z, 0.18 * s, 0.22 * s, 0.16 * s, '#c9b48a', { jitter: 0.01, detail: 1 });
    lp.cyl(x, 0.42 * s, z, 0.05 * s, 0.03 * s, 0.08 * s, 5, '#a8936a', { jitter: 0 });
    lp.box(x, 0.18 * s, z + 0.15 * s, 0.1 * s, 0.06 * s, 0.01, '#8e2f2a', { jitter: 0, ao: 0 });
  }
  lp.push([0.62, 0, 1.08], 0.4);
  const coffinBox = poly([[-0.2, -0.07], [0.1, -0.1], [0.22, 0], [0.1, 0.1], [-0.2, 0.07]]);
  lp.push([0, 0.05, 0], 0, -Math.PI / 2).extrude(coffinBox, 0.1, '#c9a27a', { bevel: 0.008 }).pop();
  lp.box(0, 0.05, 0, 0.012, 0.1, 0.22, '#7a5a3a', { jitter: 0 }); lp.box(0, 0.05, 0, 0.4, 0.1 + 0.004, 0.012, '#7a5a3a', { jitter: 0 });
  lp.pop();
  for (const [x, y, z, w] of [[-0.55, 0, 1.12, 0.26], [-0.52, 0.18, 1.12, 0.18]] as const) {
    lp.box(x, y, z, w, w * 0.7, w * 0.8, '#c9a27a', { bevel: 0.01, vary: 0.08 });
    lp.box(x, y, z, w + 0.004, w * 0.7 + 0.004, 0.012, '#7a5a3a', { jitter: 0 });
  }
  for (let i = 0; i < 4; i++) envelope(lp, r.range(-0.3, 0.9), 0.008, r.range(1.15, 1.38), 0.35, r.range(0, 3), -Math.PI / 2);
  grassTuft(lp, 1.35, -1.3, 1); grassTuft(lp, -1.4, -1.3, 1); weeds(lp, -1.4, 0.5, 0.8);
  if (lit) {
    lp.light(0, 0.8, 0.95, '#ffcf80', 0.55, 3.0, 0.15, 0);
    for (const s of [-1, 1]) lp.light(s * 0.52, 0.95, 0.85, '#ffd27a', 0.35, 2.2, 0.25, 0.45);
  }
  return lp.build();
}

// ── L'auto dei cacciatori ───────────────────────────────────────────────

/**
 * La berlina nera dei cacciatori di fantasmi (3×2, muso verso +x): carrozzeria
 * a profilo (cofano lungo, coda lunga, passaruota ad arco), abitacolo con i
 * montanti sottili e i vetri, filetti cromati, portiere con le maniglie,
 * specchietti, quattro fari tondi e la calandra cromata, paraurti a tubo,
 * fanalini tondi (accesi o spenti), gomme a fascia bianca coi coprimozzi.
 * Il bagagliaio è aperto: torce, barattolo di sale, thermos, libro dei
 * fantasmi, una scatola di cassette e un rilevatore con le lucine.
 */
export function huntersCarLP(v: PVis): LPModel {
  const lp = new LP(`lp:huntcar:${v.seed}:${v.lit}`);
  const lit = v.lit, glow = glowOf(lit);
  const BLACK = '#23222a', GLASS = lit ? '#6a7f90' : '#4e6070';
  const HW = 0.5, WR = 0.2, XR = -0.82, XF = 0.9;
  lp.push([0, 0, -0.35]);
  for (const x of [XR, XF]) for (const s of [-1, 1] as const) autoWheel(lp, x, s * (HW - 0.07), WR, 0.15, s, true);
  // carrozzeria bassa: sagoma laterale estrusa coi passaruota
  const body = new THREE.Shape();
  body.moveTo(-1.38, 0.24);
  body.lineTo(XR - 0.26, 0.17); body.absarc(XR, 0.2, 0.26, Math.PI, 0, true);
  body.lineTo(XF - 0.26, 0.17); body.absarc(XF, 0.2, 0.26, Math.PI, 0, true);
  body.lineTo(1.36, 0.2);
  body.quadraticCurveTo(1.43, 0.3, 1.4, 0.48);
  body.lineTo(1.32, 0.56);
  body.lineTo(0.56, 0.6); // cofano lungo
  body.lineTo(-0.84, 0.6);
  body.lineTo(-1.3, 0.58); // coda
  body.quadraticCurveTo(-1.42, 0.5, -1.4, 0.34);
  body.lineTo(-1.38, 0.24);
  const CB = 0.03; // smusso della carrozzeria: le superfici sporgono di tanto
  lp.extrude(body, HW * 2, BLACK, { bevel: CB, bucket: 'gloss', vary: 0.02, ao: 0.08 });
  // abitacolo: sagoma più stretta col tetto piatto e i montanti inclinati
  const cab = new THREE.Shape();
  cab.moveTo(-0.84, 0.58); cab.lineTo(0.56, 0.58); cab.lineTo(0.26, 0.9);
  cab.quadraticCurveTo(0.2, 0.94, 0.08, 0.94); cab.lineTo(-0.42, 0.94);
  cab.quadraticCurveTo(-0.52, 0.94, -0.58, 0.88); cab.lineTo(-0.84, 0.58);
  lp.extrude(cab, 0.84, BLACK, { bevel: CB, bucket: 'gloss' });
  // vetri laterali (due per lato, col montante in mezzo), parabrezza e lunotto
  const front = poly([[-0.06, 0.64], [0.46, 0.64], [0.23, 0.89], [-0.06, 0.89]]);
  const rear = poly([[-0.74, 0.64], [-0.14, 0.64], [-0.14, 0.89], [-0.42, 0.89], [-0.54, 0.85]]);
  for (const s of [-1, 1]) for (const g of [front, rear]) lp.push([0, 0, s > 0 ? 0.422 : -0.43]).plate(g, 0.008, GLASS, { ao: 0, bucket: lit ? 'glow' : 'solid' }).pop();
  slab(lp, [0.26, 0.9], [0.56, 0.58], 0.74, 0.014, GLASS, { jitter: 0, ao: 0, bucket: 'gloss' }, 0.86, CB);
  slab(lp, [-0.84, 0.58], [-0.58, 0.88], 0.74, 0.014, GLASS, { jitter: 0, ao: 0, bucket: 'gloss' }, 0.84, CB);
  // filetti cromati lungo i fianchi e attorno ai vetri, portiere, maniglie, specchietti
  for (const s of [-1, 1]) {
    const z = s * (HW + 0.006);
    lp.box(0, 0.46, z, 2.7, 0.025, 0.012, CHROME, { jitter: 0, ao: 0, bucket: 'gloss' });
    lp.box(-0.1, 0.6, s * 0.43, 1.4, 0.02, 0.012, CHROME, { jitter: 0, ao: 0, bucket: 'gloss' });
    for (const x of [-0.12, 0.56]) lp.box(x, 0.22, z, 0.012, 0.36, 0.006, '#0e0d12', { jitter: 0, ao: 0 }); // fessure delle portiere
    for (const x of [0.4, -0.3]) lp.box(x, 0.52, z + s * 0.008, 0.08, 0.018, 0.014, CHROME, { jitter: 0, bucket: 'gloss' });
    lp.push([0.5, 0.64, s * (HW + 0.02)]).cyl(0, 0, 0, 0.008, 0.008, 0.06, 4, CHROME, { jitter: 0 }).blob(0, 0.07, s * 0.02, 0.03, 0.025, 0.012, CHROME, { jitter: 0, bucket: 'gloss' }).pop();
  }
  // muso: calandra cromata a listelli, quattro fari tondi, paraurti a tubo, stemma
  // (il muso vero sta a x ≈ 1,41 + smusso)
  const FX = 1.41 + CB;
  lp.box(FX, 0.24, 0, 0.03, 0.22, 0.86, '#121116', { jitter: 0 });
  for (let i = 0; i < 4; i++) lp.box(FX + 0.015, 0.26 + i * 0.05, 0, 0.012, 0.014, 0.84, CHROME, { jitter: 0, bucket: 'gloss' });
  // due coppie di fari tondi, ben in fuori, nella cornice cromata
  for (const s of [-1, 1]) {
    lp.box(FX + 0.01, 0.31, s * 0.335, 0.03, 0.15, 0.29, CHROME, { jitter: 0, bucket: 'gloss' });
    for (const k of [0.27, 0.4]) {
      const h = glow('#fff1b8');
      lp.push([FX + 0.02, 0.385, s * k], 0, 0, -Math.PI / 2).cyl(0, 0, 0, 0.058, 0.058, 0.03, 12, CHROME, { jitter: 0, bucket: 'gloss' }).cyl(0, 0.022, 0, 0.048, 0.048, 0.022, 12, h.color, { bucket: h.bucket, jitter: 0 }).pop();
    }
  }
  lp.blob(1.33, 0.56 + CB, 0, 0.03, 0.015, 0.05, CHROME, { jitter: 0, bucket: 'gloss' });
  for (const x of [1.47 + CB, -1.46 - CB]) lp.push([x, 0.2, 0], 0, Math.PI / 2).cyl(0, -HW - 0.02, 0, 0.045, 0.045, HW * 2 + 0.04, 8, CHROME, { jitter: 0, bucket: 'gloss' }).pop();
  // coda: fanalini tondi (tre per lato), targa
  for (const s of [-1, 1]) for (const k of [0.18, 0.29, 0.4]) {
    const t = glow('#ff4a3a');
    lp.push([-1.39 - CB, 0.4, s * k], 0, 0, Math.PI / 2).cyl(0, 0, 0, 0.042, 0.042, 0.03, 10, CHROME, { jitter: 0 }).cyl(0, 0.022, 0, 0.033, 0.033, 0.014, 10, t.color, { bucket: t.bucket, jitter: 0 }).pop();
  }
  lp.box(-1.42 - CB, 0.25, 0, 0.012, 0.09, 0.26, '#e8e0c8', { jitter: 0 });
  // bagagliaio aperto: vano scuro, coperchio sollevato, roba dei cacciatori
  lp.box(-1.07, 0.59, 0, 0.42, 0.05, 0.86, '#2a2028', { jitter: 0, ao: 0 });
  lp.push([-0.86, 0.63, 0], 0, 0, -1.25).box(-0.24, 0, 0, 0.48, 0.035, 0.88, BLACK, { bevel: 0.012, bucket: 'gloss' }).pop();
  for (const z of [-0.3, -0.17]) lp.push([-1.0, 0.66, z], 0, 0, Math.PI / 2).cyl(0, -0.1, 0, 0.026, 0.032, 0.2, 6, '#4a4f55', { jitter: 0 }).pop(); // torce
  lp.cyl(-1.12, 0.63, 0.12, 0.05, 0.05, 0.15, 8, '#e8e4d6', { jitter: 0 }); lp.cyl(-1.12, 0.78, 0.12, 0.05, 0.05, 0.02, 8, '#5a8ab0', { jitter: 0 }); // sale
  lp.cyl(-0.96, 0.63, 0.3, 0.04, 0.04, 0.18, 8, '#7a2f35', { jitter: 0, bucket: 'gloss' }); // thermos
  lp.box(-1.18, 0.63, 0.32, 0.14, 0.04, 0.18, '#5a3a5a', { bevel: 0.005 }); // libro dei fantasmi
  lp.box(-1.0, 0.63, -0.02, 0.18, 0.08, 0.12, '#8a6a48', { bevel: 0.005 }); // scatola di cassette
  for (let i = 0; i < 4; i++) lp.box(-1.06 + i * 0.04, 0.71, -0.02, 0.03, 0.035, 0.1, i % 2 ? '#2a2a30' : '#c9c6bd', { jitter: 0, ao: 0 });
  lp.box(-1.2, 0.63, -0.22, 0.1, 0.06, 0.14, '#3a3a40', { bevel: 0.006 }); // rilevatore
  for (let i = 0; i < 3; i++) { const g = glow(['#8fe36a', '#f2c75a', '#ff4a3a'][i]); lp.blob(-1.2, 0.695, -0.27 + i * 0.05, 0.012, 0.008, 0.012, g.color, { bucket: g.bucket, jitter: 0 }); }
  lp.pop();
  grassTuft(lp, 1.35, 0.75, 0.9); grassTuft(lp, -1.4, 0.8, 1); pebbles(lp, -1.2, 0.6, 1.2, 0.9, 3);
  if (lit) {
    for (const s of [-1, 1]) lp.light(1.8, 0.35, -0.35 + s * 0.33, '#fff1b8', 0.55, 3.6, 0.1, 0.3);
    lp.light(-1.65, 0.38, -0.35, '#ff4a3a', 0.25, 1.6, 0.1, 0.25);
  }
  return lp.build();
}
