// Personaggi low-poly "v2" (stile del concept): testa grande a
// superellissoide, capelli a casco di ciocche, barba disegnata per contorni,
// corpo a pera, stivali, occhi lucidi con la stella. Ogni personaggio è
// diviso nelle parti del rig (testa, busto, braccia, gambe) con il perno
// all'articolazione, così le animazioni di view/characters.ts restano quelle.
// Qui il Custode (con tutte le opzioni di CustodeLook) e il kit comune;
// gli altri personaggi e gli animali sono in npc.ts.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LP, type LPOpts } from '../kit.ts';
import { instantiate, LOWPOLY_MATERIALS, type CachedModel } from '../../modelCache.ts';
import { VOX } from '../../shape.ts';
import { flower, grassTuft } from '../details.ts';
import { mushroom } from '../nature.ts';
import type { CustodeLook, HairStyle, HatStyle, HeadStyle } from '../../../game/look.ts';

// ── Parti del rig ───────────────────────────────────────────────────────

export type KPart = 'body' | 'head' | 'armL' | 'armR' | 'legL' | 'legR';

/** Un personaggio: perni delle parti e loro geometria (nello spazio del perno). */
export interface KawaiiSpec {
  /** Perni delle parti (unità mondo, personaggio in scala 1). */
  pivots: Partial<Record<KPart, [number, number, number]>>;
  parts: Partial<Record<KPart, (lp: LP) => void>>;
  /** Scala nel mondo. */
  scale: number;
  hover?: number;
  ghost?: boolean;
  quadruped?: boolean;
  flier?: boolean;
}

// ── Aspetto ─────────────────────────────────────────────────────────────
// Stesse opzioni della personalizzazione del gioco (CustodeLook); la palette
// del concept è l'aspetto predefinito del prototipo.
export const CONCEPT_LOOK: CustodeLook = {
  skin: '#f6cba6', sparkle: true, hair: 'spiky', hairColor: '#d98238', eyes: '#1f4d2e',
  glasses: 'none', beard: 'braid', mustache: 'handlebar', beardColor: '#d4567c', freckles: false, bandaid: false,
  hat: 'none', hatColor: '#4a3326', outfit: 'coat', outfitColor: '#58722f', accentColor: '#eadcc0',
};
let L: CustodeLook = CONCEPT_LOOK;
let SKIN = '', HAIR = '', BEARD = '', EYE = '', JACKET = '', JACKET_D = '', PANTS = '', SCARF = '', SCARF_STRIPE = '';
const DARK = '#2c2a25';
const BOOT = '#6c4830';
const SOLE = '#2a221d';
const shade = (c: string, k: number) => `#${new THREE.Color(c).offsetHSL(0, 0, k).getHexString()}`;
/** Teste che non portano capelli, barba e baffi (la zucca ha il picciolo, il teschio è osso). */
export const BALD_HEADS: HeadStyle[] = ['pumpkin', 'skull'];
let HEAD: HeadStyle = 'human';
const BONE = '#e2d9c3';
const mix = (a: string, b: string, k: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString()}`;
function applyLook(l: CustodeLook) {
  L = l;
  HEAD = l.head ?? 'human';
  // lo zombie resta del colore scelto, ma verdognolo; il teschio è osso
  SKIN = HEAD === 'zombie' ? mix(l.skin, '#9cc27a', 0.68) : HEAD === 'skull' ? BONE : l.skin;
  if (BALD_HEADS.includes(HEAD)) L = { ...l, hair: 'none', beard: 'none', mustache: 'none', freckles: false, bandaid: false, sparkle: false };
  HAIR = l.hairColor; BEARD = l.beardColor; EYE = l.eyes;
  JACKET = l.outfitColor; JACKET_D = shade(l.outfitColor, -0.05);
  PANTS = l.outfit === 'overalls' ? l.outfitColor : '#5a3c2a';
  SCARF = l.accentColor; SCARF_STRIPE = shade(l.accentColor, -0.18);
  BEARD_DROP = l.beard === 'short' ? 0.035 : 0.11;
  const tip = HAIR_TIPS[L.hair === 'none' ? 'spiky' : L.hair];
  HAIR_TIP = X.hair ? (a) => X.hair!.tip(a) : tip;
  HAIR_HANG = HANGING.includes(L.hair);
}
/**
 * Aggiunte per gli altri personaggi umani (stesso corpo e stessa testa del
 * Custode): occhi e bocca, capelli con orlo proprio, cappello, tonaca,
 * braccia in avanti, oggetti in mano, dettagli su testa e petto.
 */
export type EyeStyle = 'open' | 'sleepy' | 'closed' | 'zombie' | 'sockets';
export interface V2Extra {
  /** Nome del modello (cache e semi). */
  name?: string;
  /** Solo la forma (anteprime del selettore): niente occhi, bocca, guance, brillantini. */
  bare?: boolean;
  eyes?: EyeStyle;
  mouth?: 'smile' | 'flat' | 'o' | 'stitched' | 'none';
  blush?: string;
  ears?: boolean;
  /** Capelli con orlo proprio (φ in gradi per angolo dal davanti), su un arco [da, a] in gradi. */
  hair?: { tip: (a: number) => number; span?: [number, number]; depth?: number; top?: number; thick?: number; lift?: number };
  /** Cappello su misura (spazio della testa) e fin dove arrivano i capelli sotto (φ). */
  hat?: (lp: LP) => void;
  hatPh?: number;
  robe?: boolean;
  armPose?: 'down' | 'forward';
  sleeve?: string; cuff?: string; hand?: string; pants?: string; boot?: string;
  /** Niente sciarpa né borsello sulla giacca. */
  plainCoat?: boolean;
  head?: (lp: LP) => void;
  chest?: (lp: LP) => void;
  /** Oggetti in mano: costruiti con l'origine al centro della mano. */
  held?: Array<{ side: number; build: (lp: LP) => void }>;
  /** Corpo completamente diverso (scheletro): sostituisce busto, braccia e gambe (spazio del personaggio). */
  body?: { torso: (lp: LP) => void; arm: (lp: LP, s: number) => void; leg: (lp: LP, s: number) => void };
}
let X: V2Extra = {};
const GLITTER = ['#fff7d8', '#ffd2ec', '#d3f2ff', '#e8d6ff', '#fff0a0'];

const DEG = Math.PI / 180;
const smooth = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
function prng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (s >>> 8) / 16777216; };
}
const O: LPOpts = { jitter: 0, vary: 0.04, ao: 0 };

/** Scala della testa e traslazione che tiene fermo il mento (y ≈ 0,543). */
const HEAD_S = 1.3;
const CHIN_Y = 0.543;
const HEAD_T = new THREE.Vector3(0, CHIN_Y - HEAD_S * CHIN_Y, 0);

// ── Testa ───────────────────────────────────────────────────────────────
// Non una sfera: un "superellissoide" (più pieno di una sfera, con la faccia
// più piatta davanti) che si allarga un po' in basso sulle guance, come nel
// concept. Superficie implicita F = 1; punti e normali si trovano per bisezione.
// meno alta di prima (meno fronte): il mento resta dov'era, la sommità scende
let C = new THREE.Vector3(0, 0.795, 0);
let R = new THREE.Vector3(0.275, 0.252, 0.255);
let PW = 2.5; // 2 = ellissoide, più alto = più squadrato
let CHEEK = 0.07;
/** Allargamento sulle guance (in basso) e un po' meno in cima. */
const cheeks = (yn: number) => 1 + CHEEK * smooth(0.15, -0.55, yn) - 0.03 * smooth(0.3, 0.9, yn);
/**
 * Forma della testa (la stessa per Custode e umani; gli animali ne usano una
 * propria): centro, semiassi, squadratura, guance; occhi in (±x, y), grandezza.
 */
export function setHeadShape(o: { c?: [number, number, number]; r?: [number, number, number]; pw?: number; cheek?: number; eyeX?: number; eyeY?: number; eyeS?: number } = {}) {
  C = new THREE.Vector3(...(o.c ?? [0, 0.795, 0]));
  R = new THREE.Vector3(...(o.r ?? [0.275, 0.252, 0.255]));
  PW = o.pw ?? 2.5; CHEEK = o.cheek ?? 0.07;
  EYE_X = o.eyeX ?? 0.1; EYE_Y = o.eyeY ?? 0.707; EYE_S = o.eyeS ?? 1;
}

function headF(x: number, y: number, z: number): number {
  const yn = (y - C.y) / R.y;
  const k = cheeks(yn);
  return Math.abs(x / (R.x * k)) ** PW + Math.abs(yn) ** PW + Math.abs((z - C.z) / (R.z * (0.96 + 0.04 * k))) ** PW;
}
function headNormal(p: THREE.Vector3): THREE.Vector3 {
  const e = 1e-3;
  return new THREE.Vector3(
    headF(p.x + e, p.y, p.z) - headF(p.x - e, p.y, p.z),
    headF(p.x, p.y + e, p.z) - headF(p.x, p.y - e, p.z),
    headF(p.x, p.y, p.z + e) - headF(p.x, p.y, p.z - e),
  ).normalize();
}
function surfaceAlong(d: THREE.Vector3): THREE.Vector3 {
  let lo = 0, hi = 0.6;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (headF(C.x + d.x * m, C.y + d.y * m, C.z + d.z * m) < 1) lo = m; else hi = m; }
  return C.clone().addScaledVector(d, lo);
}
/** Punto e normale della testa nella direzione (θ da +z verso +x, φ elevazione). */
function headAt(th: number, ph: number) {
  const p = surfaceAlong(new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph)));
  return { p, n: headNormal(p) };
}
/** Punto della faccia davanti a (x, y). */
function headFront(x: number, y: number) {
  let lo = 0, hi = 0.5;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (headF(x, y, C.z + m) < 1) lo = m; else hi = m; }
  const p = new THREE.Vector3(x, y, C.z + lo);
  return { p, n: headNormal(p) };
}
/** Geometria della testa: icosfera proiettata sulla superficie. */
function headGeo(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).normalize(); const p = surfaceAlong(v); pos.setXYZ(i, p.x, p.y, p.z); }
  return g;
}
/** Disegna un dettaglio piatto (piano xy, verso +z) adagiato sulla pelle. */
function onSkin(lp: LP, at: { p: THREE.Vector3; n: THREE.Vector3 }, lift: number, rz: number, build: (lp: LP) => void) {
  const { p, n } = at;
  lp.push([p.x + n.x * lift, p.y + n.y * lift, p.z + n.z * lift], Math.atan2(n.x, n.z), -Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)), rz);
  build(lp);
  lp.pop();
}

/** Raccoglie triangoli orientandoli verso `want` (niente facce rovesciate). */
class Tris {
  readonly pos: number[] = [];
  private ab = new THREE.Vector3(); private ac = new THREE.Vector3(); private n = new THREE.Vector3();
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, want: THREE.Vector3) {
    this.n.crossVectors(this.ab.subVectors(b, a), this.ac.subVectors(c, a));
    const [p, q] = this.n.dot(want) >= 0 ? [b, c] : [c, b];
    this.pos.push(a.x, a.y, a.z, p.x, p.y, p.z, q.x, q.y, q.z);
  }
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, want: THREE.Vector3) { this.tri(a, b, c, want); this.tri(a, c, d, want); }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); return g; }
}

/** Velo sulla testa: griglia (u, v) → (θ, φ), sollevata di thick(u, v) lungo la normale. */
function sheet(lp: LP, nu: number, nv: number, at: (u: number, v: number) => [number, number], thick: (u: number, v: number) => number, color: string, o: LPOpts = {}) {
  const P: THREE.Vector3[][] = [];
  const N: THREE.Vector3[][] = [];
  for (let i = 0; i <= nu; i++) {
    P.push([]); N.push([]);
    for (let j = 0; j <= nv; j++) {
      const u = -1 + (2 * i) / nu, v = j / nv;
      const { p, n } = headAt(...at(u, v));
      P[i].push(p.addScaledVector(n, 0.003 + thick(u, v))); N[i].push(n);
    }
  }
  const t = new Tris();
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) t.quad(P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1], N[i][j]);
  lp.add(t.geo(), color, { ...O, ...o });
}

/**
 * Ciocca di capelli incollata alla testa: la faccia interna sta sulla pelle
 * (o sulla calotta), quella esterna si gonfia vicino alla radice e si
 * assottiglia fino alla punta; solo la punta si stacca un poco (lift).
 * Alla radice lo spessore è zero: la ciocca esce dalla testa senza scalini.
 */
function lock(lp: LP, o: { th0: number; th1: number; ph0: number; ph1: number; w: number; t?: number; lift?: number; base?: number; col: string; bulge?: number; surface?: unknown }) {
  const NS = 10, NW = 6;
  const T = o.t ?? 0.06, lift = o.lift ?? 0.02, base = o.base ?? 0.012;
  const at = (s: number) => headAt(lerp(o.th0, o.th1, s) * DEG, lerp(o.ph0, o.ph1, s) * DEG);
  const outer: THREE.Vector3[][] = [], inner: THREE.Vector3[][] = [], norms: THREE.Vector3[] = [];
  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const { p, n } = at(s);
    const q = at(Math.min(1, s + 0.03)).p, r = at(Math.max(0, s - 0.03)).p;
    const side = new THREE.Vector3().crossVectors(n, q.sub(r)).normalize();
    const width = o.w * (0.55 + 0.45 * Math.sin(Math.min(1, s / 0.3) * Math.PI / 2)) * Math.pow(1 - s, 0.9);
    // radice sottile (si infila sotto le ciocche più in alto), pancia piena, punta sottile
    const thick = T * Math.pow(1 - s, 0.7) * Math.sin(Math.min(1, s / 0.32) * Math.PI / 2); // nasce a filo della testa
    const up = base + lift * s * s; // la punta si solleva un poco
    outer.push([]); inner.push([]); norms.push(n);
    for (let k = 0; k <= NW; k++) {
      const u = -1 + (2 * k) / NW, bow = Math.pow(1 - u * u, 0.55);
      const c = p.clone().addScaledVector(side, u * width);
      inner[i].push(c.clone().addScaledVector(n, up));
      outer[i].push(c.clone().addScaledVector(n, up + thick * bow + 0.004));
    }
  }
  const t = new Tris();
  for (let i = 0; i < NS; i++) for (let k = 0; k < NW; k++) {
    t.quad(outer[i][k], outer[i + 1][k], outer[i + 1][k + 1], outer[i][k + 1], norms[i]);
    t.quad(inner[i][k], inner[i + 1][k], inner[i + 1][k + 1], inner[i][k + 1], norms[i].clone().negate());
  }
  lp.add(t.geo(), o.col, { ...O, vary: 0.05 });
}

/** Tubo affusolato lungo dei punti (baffi a manubrio). */
function taperTube(points: THREE.Vector3[], radii: number[], seg = 6): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const n = points.length * 5;
  const frames = curve.computeFrenetFrames(n, false);
  const rings: THREE.Vector3[][] = [];
  const radius = (u: number) => { const f = u * (radii.length - 1), i = Math.min(radii.length - 2, Math.floor(f)); return lerp(radii[i], radii[i + 1], f - i); };
  const centers: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), r = radius(u);
    centers.push(p);
    rings.push(Array.from({ length: seg }, (_, k) => {
      const a = (k / seg) * Math.PI * 2;
      return p.clone().addScaledVector(frames.normals[i], Math.cos(a) * r).addScaledVector(frames.binormals[i], Math.sin(a) * r);
    }));
  }
  const t = new Tris();
  for (let i = 0; i < n; i++) for (let k = 0; k < seg; k++) {
    const a = rings[i][k], b = rings[i][(k + 1) % seg], c = rings[i + 1][(k + 1) % seg], d = rings[i + 1][k];
    t.quad(a, b, c, d, a.clone().sub(centers[i]));
  }
  for (const [i, dir] of [[0, -1], [n, 1]] as const) {
    const tan = curve.getTangentAt(i / n).multiplyScalar(dir);
    for (let k = 0; k < seg; k++) t.tri(centers[i], rings[i][k], rings[i][(k + 1) % seg], tan);
  }
  return t.geo();
}

/** Stellina a cinque punte (piano xy). */
function star(size: number, inner = 0.45): THREE.BufferGeometry {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? size * inner : size;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

const rbox = (w: number, h: number, d: number, r: number, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, r);

// ── Parti ───────────────────────────────────────────────────────────────
// Misure ricavate dalla vista frontale del concept: occhi, baffi e bocca nella
// metà bassa della testa (fronte grande), barba come fascia lungo la mandibola.

let EYE_Y = 0.707, EYE_X = 0.1, EYE_S = 1;
const absDeg = (th: number) => Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) / DEG; // 0 davanti, 180 dietro
/**
 * Dove arrivano le punte dei capelli (φ in gradi) per angolo dal davanti `a`
 * (0 davanti, 180 dietro); `sd` è l'angolo con il segno (per i tagli
 * asimmetrici, come il ciuffo di lato).
 */
const bump = (a: number, a0: number, a1: number, w = 5) => smooth(a0 - w, a0 + w, a) * smooth(a1 + w, a1 - w, a);
/** Lunghi: davanti fino agli occhi, ai lati scendono subito oltre il mento, dietro fin sulle spalle. */
const longTip = (front: number, side = -88, back = -95) => (a: number) => (a < 45 ? lerp(front + 6, front, smooth(0, 45, a)) : a < 72 ? lerp(front, side, smooth(45, 72, a)) : lerp(side, back, smooth(72, 140, a)));
/** Ciuffo di lato: da una parte la frangia scende sulla fronte, dall'altra la riga lascia la fronte scoperta. */
const sideFront = (sd: number) => (sd < 0 ? lerp(4, 10, smooth(-70, -20, sd)) : lerp(10, 34, smooth(0, 30, sd)));
/** Mossi: riga di lato, la frangia scende morbida da una parte. */
const waveFront = (sd: number) => (sd < 0 ? lerp(8, 16, smooth(-60, -10, sd)) : lerp(16, 30, smooth(0, 35, sd)));
const HAIR_TIPS: Record<Exclude<HairStyle, 'none'>, (a: number, sd: number) => number> = {
  spiky: (a) => (a < 90 ? lerp(20, 0, smooth(30, 90, a)) : lerp(0, -32, smooth(90, 160, a))), // ai lati fin sopra l'orecchio, dietro alla nuca
  // ciuffi: fronte scoperta (attaccatura alta), corti ai lati; i ciuffi salgono dalla cima
  tufts: (a) => (a < 40 ? 42 : a < 90 ? lerp(42, 8, smooth(40, 90, a)) : lerp(8, -38, smooth(90, 160, a))),
  bob: (a) => (a < 50 ? lerp(14, 8, smooth(0, 50, a)) : lerp(8, -42, smooth(50, 105, a))), // caschetto: frangia dritta, copre le orecchie
  // lunghi: riga in mezzo, due tende che lasciano scoperta la fronte al centro
  long: (a) => (a < 45 ? lerp(40, 8, smooth(0, 38, a)) : longTip(8)(a)),
  // ricci: scendono sotto le orecchie, dietro fino alla nuca
  curly: (a) => (a < 40 ? lerp(22, 14, smooth(0, 40, a)) : a < 110 ? lerp(14, -40, smooth(40, 110, a)) : lerp(-40, -46, smooth(110, 170, a))),
  longcurly: longTip(12, -84, -90),
  // chignon: raccolti (fronte scoperta), sopra l'orecchio, basette davanti all'orecchio, nuca coperta
  bun: (a) => (a < 60 ? lerp(32, 14, smooth(20, 60, a)) : a < 98 ? lerp(14, 4, smooth(60, 80, a)) : lerp(4, -44, smooth(98, 150, a))) - 34 * bump(a, 66, 82),
  // frangia: dritta fino alle sopracciglia
  fringe: (a) => (a < 50 ? -2 : a < 95 ? lerp(-2, -4, smooth(50, 95, a)) : lerp(-4, -40, smooth(95, 165, a))),
  fringeLong: longTip(-2),
  side: (a, sd) => (a < 95 ? lerp(sideFront(sd), 2, smooth(55, 95, a)) : lerp(2, -38, smooth(95, 165, a))),
  // ciuffo di lato lungo: la frangia spazzata scende fino a coprire un occhio, lati lisci e lunghi
  sideLong: (a, sd) => (a < 72 ? lerp(sd < 0 ? lerp(-6, 8, smooth(-45, 0, sd)) : lerp(8, 34, smooth(0, 30, sd)), -88, smooth(50, 72, a)) : lerp(-88, -95, smooth(72, 140, a))),
  // mossi: riga di lato, ciocche a onde con le punte tonde che si aprono; corti fino al lobo
  wavy: (a, sd) => (a < 45 ? waveFront(sd) : a < 110 ? lerp(waveFront(sd * 0.3), -26, smooth(45, 100, a)) : lerp(-26, -34, smooth(110, 170, a))),
  wavyLong: (a, sd) => (a < 45 ? waveFront(sd) : longTip(waveFront(sd * 0.3), -92, -102)(a)),
  // rasati: un velo cortissimo che segue l'attaccatura
  buzz: (a) => (a < 40 ? 30 : a < 95 ? lerp(30, 6, smooth(40, 95, a)) : lerp(6, -44, smooth(95, 165, a))),
};
/** Tagli che sotto l'equatore pendono (invece di rientrare sulla nuca); quelli lunghi ai lati seguono la guancia. */
const HANGING: HairStyle[] = ['bob', 'long', 'longcurly', 'fringeLong', 'sideLong', 'wavy', 'wavyLong'];
const LONG_SIDES: HairStyle[] = ['long', 'longcurly', 'fringeLong', 'sideLong', 'wavyLong'];
let HAIR_TIP: (a: number, sd: number) => number = HAIR_TIPS.spiky;
let HAIR_HANG = false;
/**
 * Punto dei capelli: sopra l'equatore seguono la testa; per i tagli lunghi,
 * sotto l'equatore scendono dritti (come una tenda) invece di rientrare sulla nuca.
 */
function hairPoint(th: number, phD: number) {
  if (!HAIR_HANG || phD >= 0) return headAt(th, phD * DEG);
  const { p, n } = headAt(th, 0);
  const h = new THREE.Vector3(n.x, 0, n.z).normalize();
  const dy = -phD * DEG * R.y * 1.05;
  const hang = { p: p.addScaledVector(h, 0.12 * dy).add(new THREE.Vector3(0, -dy, 0)), n: h };
  // capelli lunghi: ai lati restano aderenti alla guancia fino alla mandibola,
  // poi scendono dritti; dietro pendono come una tenda
  const b = LONG_SIDES.includes(L.hair) ? smooth(95, 145, absDeg(th)) : 1;
  if (b >= 1) return hang;
  const JAW = -55;
  const s = headAt(th, Math.max(phD, JAW) * DEG);
  const drop = Math.max(0, JAW - phD) * DEG * R.y * 1.05;
  const hug = { p: s.p.add(new THREE.Vector3(0, -drop, 0)), n: drop > 0 ? h : s.n };
  return { p: hug.p.lerp(hang.p, b), n: hug.n.clone().lerp(hang.n, b).normalize() };
}
const signedDeg = (th: number) => Math.atan2(Math.sin(th), Math.cos(th)) / DEG;
const hairTip = (th: number) => HAIR_TIP(absDeg(th), signedDeg(th));
/** Bordo superiore della barba (φ in gradi): sotto la bocca davanti, sale lungo la mandibola fino all'orecchio. */
// bordo superiore: davanti subito sotto la bocca, sulle guance resta basso
// (lungo la mandibola) e solo vicino all'orecchio sale come basetta fino ai capelli
const beardTop = (thDeg: number) => { const a = Math.abs(thDeg); return a < 70 ? lerp(-53, -48, smooth(0, 70, a)) : lerp(-50, 6, smooth(70, 88, a)); };

/** Superficie della zucca lungo una direzione dal centro: più larga e schiacciata, a spicchi. */
function pumpkinAt(dir: THREE.Vector3): THREE.Vector3 {
  const v = dir.clone().normalize();
  const p = surfaceAlong(v).sub(C);
  const lon = Math.atan2(v.x, v.z), lat = Math.asin(THREE.MathUtils.clamp(v.y, -1, 1));
  const rib = 1 - 0.055 * (0.5 - 0.5 * Math.cos(lon * 10)) * Math.pow(Math.cos(lat), 0.6); // solchi tra gli spicchi
  p.multiply(new THREE.Vector3(1.07 * rib, 0.9 - 0.06 * Math.pow(Math.abs(v.y), 6), 1.05 * rib)); // un po' schiacciata, sommità e base rientranti
  p.y -= 0.1 * R.y; // schiacciata verso il basso: poggia sul collo come la testa (niente buco sotto)
  return p.add(C);
}

/**
 * Intaglio sulla zucca: la regione tra `bot(u)` e `top(u)` (u da -1 a 1, x = cx + u·w)
 * diventa una griglia proiettata sulla buccia, così segue la curva anche se è larga.
 * Bordo scuro, e dentro la luce della candela un po' più rientrata.
 */
function carve(lp: LP, cx: number, w: number, top: (u: number) => number, bot: (u: number) => number, nu = 8) {
  const at = (x: number, y: number, out: number) => {
    const d = new THREE.Vector3(x / R.x, (y - C.y) / R.y, 0);
    d.z = Math.sqrt(Math.max(0.05, 1 - d.x * d.x - d.y * d.y));
    const p = pumpkinAt(d);
    return p.addScaledVector(p.clone().sub(C).normalize(), out);
  };
  const grid = (u0: number, u1: number, v0: number, v1: number, out: number, color: string, o: LPOpts) => {
    const t = new Tris();
    const P: THREE.Vector3[][] = [];
    for (let i = 0; i <= nu; i++) {
      const u = lerp(u0, u1, i / nu);
      P.push([0, 1, 2].map((j) => at(cx + u * w, lerp(bot(u), top(u), lerp(v0, v1, j / 2)), out)));
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < 2; j++) t.quad(P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1], P[i][j].clone().sub(C).normalize());
    lp.add(t.geo(), color, o);
  };
  grid(-1, 1, 0, 1, 0.004, '#2a1206', O);
  grid(-0.86, 0.86, 0.2, 0.8, 0.006, '#ffb54a', { ...O, bucket: 'glow' });
}

/** Zucca: a spicchi, con il picciolo; faccia intagliata che brilla. */
function pumpkin(lp: LP) {
  const g = new THREE.IcosahedronGeometry(1, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const p = pumpkinAt(v.fromBufferAttribute(pos, i));
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  lp.add(g, '#e0832f', { ...O, ao: 0.08, vary: 0.05 });
  if (hatPh() >= 89) { // picciolo (sotto un cappello non c'è posto)
    const b = new THREE.Vector3(C.x, C.y + R.y * 0.72, C.z); // sulla sommità (rientrante)
    lp.add(taperTube([b, b.clone().add(new THREE.Vector3(0.015, 0.08, 0)), b.clone().add(new THREE.Vector3(0.06, 0.13, -0.02))], [0.045, 0.034, 0.024], 6), '#5a6a2c', O);
    lp.blob(b.x - 0.05, b.y + 0.02, b.z + 0.02, 0.05, 0.012, 0.03, '#6f8a33', { ...O, detail: 1 } as LPOpts); // fogliolina
  }
  if (X.bare) return;
  // la faccia sta al centro della zucca (più in alto degli occhi umani)
  // occhi: triangoli con la punta in su, un po' inclinati verso il naso
  const tri = (a: number) => (u: number) => (u < a ? (u + 1) / (a + 1) : (1 - u) / (1 - a)); // 0 ai lati, 1 sulla punta (in u = a)
  for (const s of [-1, 1]) { const t = tri(-s * 0.3); carve(lp, s * 0.115, 0.068, (u) => 0.795 + 0.085 * t(u), () => 0.795, 6); }
  carve(lp, 0, 0.028, (u) => 0.752 + 0.036 * tri(0)(u), () => 0.752, 4); // naso
  // bocca: un sorriso largo a mezzaluna, con un dente che scende dall'alto e uno che sale dal basso
  const y0 = 0.712;
  const tooth = (u: number, at: number) => smooth(0.2, 0.12, Math.abs(u - at)) * 0.034;
  carve(lp, 0, 0.19, (u) => y0 + 0.05 * u * u - tooth(u, -0.32), (u) => y0 + 0.05 * u * u - 0.07 * Math.pow(1 - u * u, 0.7) + tooth(u, 0.36), 40);
}

function head(lp: LP) {
  if (HEAD === 'pumpkin') { pumpkin(lp); return; }
  lp.add(headGeo(), SKIN, { ...O, ao: 0.05 });
  if (X.ears !== false && HEAD !== 'skull') for (const s of [-1, 1]) lp.blob(s * (R.x - 0.004), 0.72, -0.012, 0.05, 0.064, 0.04, SKIN, { ...O, detail: 2 } as LPOpts); // orecchie grandi e tonde
  if (X.bare) { X.head?.(lp); return; }
  if (HEAD === 'skull') { // naso a cuore rovesciato e denti
    onSkin(lp, headFront(0, 0.645), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.03, 3).rotateZ(-Math.PI / 2).scale(1, 1.2, 1), '#1e1b22', O));
    onSkin(lp, headFront(0, 0.612), 0.002, 0, (q) => q.add(rbox(0.17, 0.008, 0.006, 0.003, 1).translate(0, 0.022, 0), '#8e8676', O));
    for (let i = -2.5; i <= 2.5; i++) onSkin(lp, headFront(i * 0.03, 0.59), 0.008, 0, (q) => q.add(rbox(0.025, 0.04, 0.02, 0.007, 1), '#f3ecda', O));
  }
  if (HEAD === 'zombie') onSkin(lp, headAt(-0.35, 40 * DEG), 0.003, 0.3, (q) => { // cicatrice cucita
    q.add(rbox(0.13, 0.01, 0.006, 0.004, 1), '#4a5a3a', O);
    for (let i = -2; i <= 2; i++) q.add(rbox(0.008, 0.04, 0.006, 0.003, 1).translate(i * 0.025, 0, 0.002), '#4a5a3a', O);
  });
  // bocca: sorrisetto sotto i baffi (cucita per lo zombie, niente per il teschio)
  const mouth = X.mouth ?? (HEAD === 'zombie' ? 'stitched' : HEAD === 'skull' ? 'none' : 'smile'), m = headFront(0, 0.613);
  if (mouth === 'smile') onSkin(lp, m, 0.002, 0, (q) => q.add(new THREE.TorusGeometry(0.022, 0.007, 3, 8, Math.PI).rotateZ(Math.PI), '#2a1a1c', O));
  if (mouth === 'flat') onSkin(lp, m, 0.002, 0, (q) => q.add(rbox(0.04, 0.009, 0.008, 0.004, 1), '#2a1a1c', O));
  if (mouth === 'o') onSkin(lp, m, 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.016, 10).scale(1, 1.2, 1), '#2a1a1c', O));
  if (mouth === 'stitched') onSkin(lp, m, 0.003, 0, (q) => {
    q.add(rbox(0.11, 0.008, 0.006, 0.003, 1), '#2a1a1c', O);
    for (let i = -2; i <= 2; i++) q.add(rbox(0.007, 0.034, 0.006, 0.003, 1).translate(i * 0.024, 0, 0.002), '#2a1a1c', O);
  });
  if (X.blush) for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.17, 0.645), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.03, 10).scale(1.3, 0.75, 1), X.blush!, { ...O, vary: 0 }));
  X.head?.(lp);
}

/** Brillantini a stella, grandi e radi, su tutto il viso (non su occhi, baffi, barba, capelli). */
function glitter(lp: LP | null, out?: Array<{ p: THREE.Vector3; n: THREE.Vector3; r: number }>) {
  if (!L.sparkle || X.bare) return;
  const rnd = prng(9);
  let placed = 0;
  for (let tries = 0; placed < 26 && tries < 4000; tries++) {
    const thD = (rnd() * 2 - 1) * 88, phD = -45 + rnd() * 55;
    if ((L.beard !== 'none' && phD < beardTop(thD) + 6) || (L.hair !== 'none' && phD > hairTip(thD * DEG) - 4) || phD > hatPh() - 4) continue;
    const at = headAt(thD * DEG, phD * DEG);
    const { p } = at;
    if (p.z > 0.08 && Math.abs(Math.abs(p.x) - EYE_X) < 0.078 && Math.abs(p.y - EYE_Y) < 0.09) continue; // occhi
    if (p.z > 0.08 && Math.abs(p.x) < 0.23 && p.y > 0.585 && p.y < 0.68) continue; // baffi e bocca
    const rot = rnd() * Math.PI, size = 0.013 + rnd() * 0.011;
    out?.push({ p: p.clone(), n: at.n.clone(), r: (rot / Math.PI + size * 37) % 1 });
    if (lp) onSkin(lp, at, 0.002, rot, (q) => q.add(star(size), GLITTER[placed % 3 === 0 ? 1 + (placed % 4) : 0], { ...O, bucket: 'glow' }));
    placed++;
  }
}

/**
 * Spessore e direzione della barba nel punto (u attorno al viso, v dal basso
 * in alto). Ai lati, sulle guance, è una striscia sottile; sotto il mento si
 * allunga in modo uniforme da una mandibola all'altra (forma a U, non a
 * punta), verso il basso e un po' in avanti. `BEARD_DROP` regola quanto
 * scende: lo stesso schema serve per una barba lunga senza treccia.
 */
/**
 * Barba costruita come i capelli: si disegnano direttamente i due contorni
 * e il volume sta tra la pelle e un involucro.
 *  - bordo superiore: basetta davanti all'orecchio, guancia, sotto la bocca
 *    (sulla pelle);
 *  - orlo inferiore: la linea che va da sotto l'orecchio fino al mento, con
 *    una punta per ciocca (come l'orlo dei capelli).
 * Ogni "fetta" verticale attorno al viso è disegnata in altezza: sopra la
 * mandibola la barba è uno strato sottile sulla guancia, sotto non rientra
 * più con la testa ma scende dritta fino all'orlo, che si arrotonda.
 * `BEARD_DROP` abbassa l'orlo (barba lunga).
 */
let BEARD_DROP = 0.11;
const BEARD_LOCKS = 9;
const BEARD_TH = 86; // gradi: fin dove arriva ai lati (basette davanti all'orecchio)

/** Distanza della pelle dall'asse della testa, all'altezza y nella direzione θ (0 se sotto la testa). */
function skinR(th: number, y: number): number {
  const sx = Math.sin(th), sz = Math.cos(th);
  if (headF(C.x, y, C.z) >= 1) return 0;
  let lo = 0, hi = 0.6;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (headF(C.x + sx * m, y, C.z + sz * m) < 1) lo = m; else hi = m; }
  return lo;
}

interface BeardSlice { th: number; rad: THREE.Vector3; yTop: number; yHem: number; rFloor: number; rIn: number; tone: number; ridge: number }

function beardSlices(): BeardSlice[] {
  const rnd = prng(41);
  const lens = Array.from({ length: BEARD_LOCKS }, () => [0.7 + rnd() * 0.6, (rnd() - 0.5) * 0.3, Math.floor(rnd() * 3)]);
  const NU = BEARD_LOCKS * 4;
  const out: BeardSlice[] = [];
  for (let i = 0; i <= NU; i++) {
    const u = -1 + (2 * i) / NU, au = Math.abs(u);
    const th = u * BEARD_TH * DEG;
    const f = ((u + 1) / 2) * BEARD_LOCKS, k = Math.min(BEARD_LOCKS - 1, Math.floor(f)), w = f - k;
    const [len, skew, tone] = lens[k];
    const c = 0.5 + skew, tooth = w < c ? w / c : (1 - w) / (1 - c);
    // bordo superiore: sotto la bocca al centro, risale lungo la guancia fino alla basetta
    const yTop = au < 0.78 ? lerp(0.574, 0.63, au / 0.78) : lerp(0.63, 0.8, smooth(0.78, 1, au)); // lungo la mandibola, poi su come basetta
    // orlo: diagonale da sotto l'orecchio al mento, con la punta di ogni ciocca
    // lineare nella profondità (cos θ): di profilo l'orlo è una diagonale dritta dall'orecchio al mento
    // orlo: la barba continua anche sui lati, sotto la linea della mandibola,
    // sempre più corta andando verso l'orecchio (davanti è la più lunga)
    const r6 = skinR(th, 0.6);
    let jaw = 0.6;
    while (jaw > 0.45 && skinR(th, jaw) > r6 * 0.82) jaw -= 0.004; // dove la pelle rientra sotto la mascella
    const short = L.beard === 'short';
    const length = short ? lerp(0.012, 0.03, au) : lerp(BEARD_DROP + 0.035, 0.085, Math.pow(au, 2.6)); // i lati restano lunghi e pieni fin sotto l'orecchio
    const yHem = Math.min(jaw - length, yTop - 0.045) - 0.022 * len * tooth * (1 - 0.4 * au);
    const rFloor = short ? r6 * (0.985 - 0.04 * au) + 0.01 * (1 - au * au) + 0.008 + 0.012 * smooth(0.55, 1, au) // corta: aderente al viso
      : r6 * (0.985 - 0.04 * au) + 0.028 * (1 - au * au) + 0.012 + 0.03 * smooth(0.55, 1, au); // bombata davanti, piena e larga anche sui lati
    out.push({ th, rad: new THREE.Vector3(Math.sin(th), 0, Math.cos(th)), yTop, yHem, rFloor, rIn: rFloor * 0.45, tone, ridge: Math.sin(Math.PI * w) });
  }
  return out;
}

/** Punto esterno della fetta all'altezza v (0 orlo, 1 bordo superiore). */
function beardOuter(sl: BeardSlice, v: number): THREE.Vector3 {
  const y = lerp(sl.yHem, sl.yTop, Math.pow(v, 1.15));
  const thin = 0.02 * (0.35 + 0.65 * smooth(0, 0.25, 1 - v)) + 0.008 * sl.ridge * (1 - v);
  // in alto la barba torna sulla pelle (niente gradino staccato sotto i baffi)
  const skin = skinR(sl.th, y) + thin;
  // davanti scende dritta dal bordo alto (sulla pelle) al pieno sotto la mascella: niente gradino né incavo
  const rTop = skinR(sl.th, sl.yTop) + 0.006;
  let r = Math.max(skin, lerp(rTop, sl.rFloor + 0.006 * sl.ridge, smooth(1, 0.35, v)));
  // l'orlo si arrotonda verso l'interno
  const ROUND = 0.055;
  const q = THREE.MathUtils.clamp((y - sl.yHem) / ROUND, 0, 1);
  r = sl.rIn + (r - sl.rIn) * Math.sqrt(1 - (1 - q) * (1 - q));
  return new THREE.Vector3(C.x + sl.rad.x * r, y, C.z + sl.rad.z * r);
}

function beard(lp: LP) {
  if (L.beard === 'none') return;
  const S = beardSlices(), NV = 7;
  const P = S.map((sl) => Array.from({ length: NV + 1 }, (_, j) => beardOuter(sl, j / NV)));
  const IN = S.map((sl) => [new THREE.Vector3(C.x + sl.rad.x * sl.rIn, sl.yHem, C.z + sl.rad.z * sl.rIn), new THREE.Vector3(C.x + sl.rad.x * sl.rIn, C.y, C.z + sl.rad.z * sl.rIn)]);
  const tr = [new Tris(), new Tris(), new Tris()];
  for (let i = 0; i < S.length - 1; i++) {
    const t = tr[S[i].tone];
    for (let j = 0; j < NV; j++) t.quad(P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1], S[i].rad.clone().add(new THREE.Vector3(0, -0.3 * (1 - j / NV), 0)));
    t.quad(P[i][0], P[i + 1][0], IN[i + 1][0], IN[i][0], new THREE.Vector3(0, -1, 0)); // sotto
    t.quad(IN[i][0], IN[i + 1][0], IN[i + 1][1], IN[i][1], S[i].rad.clone().negate()); // dietro, verso il collo
  }
  for (const [i, sgn] of [[0, -1], [S.length - 1, 1]] as const) {
    const side = new THREE.Vector3(Math.cos(S[i].th) * sgn, 0, -Math.sin(S[i].th) * sgn);
    for (let j = 0; j < NV; j++) {
      const sk = (q: THREE.Vector3) => { const r = skinR(S[i].th, q.y); return new THREE.Vector3(C.x + S[i].rad.x * r, q.y, C.z + S[i].rad.z * r); };
      tr[0].quad(P[i][j], P[i][j + 1], sk(P[i][j + 1]), sk(P[i][j]), side);
    }
  }
  tr.forEach((t, k) => lp.add(t.geo(), `#${new THREE.Color(BEARD).offsetHSL(0, 0, [0.03, 0, -0.03][k]).getHexString()}`, { ...O, vary: 0.04 }));
}

/** Punta dell'orlo al centro: da qui esce la treccia. */
function beardTip(): THREE.Vector3 {
  const S = beardSlices();
  return beardOuter(S[Math.floor(S.length / 2)], 0);
}

/**
 * Treccia che esce dalla punta della barba (stesso spazio della testa): il
 * primo grano è dentro la massa del mento, gli altri scendono toccandosi.
 * Restano davanti alla giacca (convertendo le quote nello spazio del corpo).
 */
function braid(lp: LP) {
  if (L.beard !== 'braid') return;
  // punta del cuneo (u = 0, v = 0): il primo grano è per metà dentro la barba
  const tip = beardTip().add(new THREE.Vector3(0, 0.015, -0.02)); // primo grano per metà dentro la punta della barba
  const R0 = 0.039, STEPY = 0.052;
  const zMin = (y: number, r: number) => (jacketR(HEAD_T.y + HEAD_S * y) * 0.82 + r * HEAD_S * 0.9) / HEAD_S;
  let y = tip.y, z = tip.z;
  for (let i = 0; i < 3; i++) {
    const r = R0 - i * 0.0015;
    z = Math.max(z - 0.006, zMin(y, r * 0.6)); // scende dritta, appena appoggiata alla giacca
    lp.blob(0, y, z, r * 1.05, r * 0.95, r, i % 2 ? shade(BEARD, -0.05) : BEARD, { ...O, detail: 2 } as LPOpts);
    y -= STEPY;
  }
  y += STEPY - 0.04;
  lp.cyl(0, y - 0.024, z, 0.019, 0.019, 0.026, 10, SCARF, O);
  lp.cyl(0, y - 0.046, z, 0.005, 0.016, 0.022, 8, BEARD, O);
}


function moustache(lp: LP) {
  // grosso manubrio: dal centro sotto il naso fin oltre gli occhi, poi un ricciolo all'insù
  // 20% più piccoli di prima: coprono meno guancia
  const raw: Array<[number, number, number]> = [
    [0.004, 0.626, 0.022], [0.06, 0.617, 0.02], [0.12, 0.612, 0.016], [0.168, 0.622, 0.013], [0.196, 0.646, 0.011],
    [0.2, 0.674, 0.0095], [0.182, 0.689, 0.0088], [0.165, 0.677, 0.008], [0.172, 0.660, 0.0075],
  ];
  if (L.mustache === 'none') return;
  let path = raw.map(([x, y, r]) => [x * 0.8, 0.645 + (y - 0.626) * 0.62, r * 0.85] as [number, number, number]); // ricciolo più basso: non gira attorno all'occhio
  if (L.mustache === 'thin') path = [[0.004, 0.646, 0.011], [0.05, 0.64, 0.01], [0.1, 0.636, 0.008], [0.135, 0.638, 0.005]];
  if (L.mustache === 'bushy') path = [[0.004, 0.646, 0.03], [0.045, 0.64, 0.029], [0.09, 0.632, 0.024], [0.125, 0.624, 0.016]];
  for (const s of [-1, 1]) {
    const pts = path.map(([x, y, r]) => { const at = headFront(s * x, y); return at.p.addScaledVector(at.n, r * 0.85); });
    lp.add(taperTube(pts, path.map(([, , r]) => r)), BEARD, { ...O, vary: 0.03 });
  }
}

/**
 * Capelli: massa tonda e compatta fatta di tante ciocche corte a punta,
 * sovrapposte a scaglie (ogni fila copre la radice di quella sotto), più
 * qualche ciuffetto dritto in cima.
 */
/**
 * Strato del "casco" di capelli: un guscio pieno (faccia esterna, faccia
 * interna sulla testa, parete lungo il bordo) che va dal bordo fino in cima.
 * Il bordo è seghettato (una punta per ciocca) e la superficie ha un rilievo
 * per ciocca che scende dal vortice girando un poco: le ciocche fanno parte
 * del volume, non possono staccarsi.
 */
export function hairLayer(lp: LP, o: { locks: number; hem: (thDeg: number) => number; depth: number; lift: number; thick: number; phase: number; swirl: number; seed: number; tone: (k: number) => string; top?: number; span?: [number, number]; waveTh?: number; flare?: number; round?: boolean; sweep?: number; waveZone?: 'sides' | 'front' | 'all' }) {
  const rnd = prng(o.seed);
  const jitter = Array.from({ length: o.locks }, () => [0.75 + rnd() * 0.5, (rnd() - 0.5) * 0.3, rnd()]); // lunghezza, asimmetria, tono
  const NU = o.locks * 4, NV = o.waveTh ? 16 : 6; // pochi segmenti: bastano per punta e rilievo di ogni ciocca (le onde ne vogliono di più)
  const P: THREE.Vector3[][] = [], Q: THREE.Vector3[][] = [], Nn: THREE.Vector3[][] = [], lockOf: number[] = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, f = (u * o.locks + o.phase) % o.locks, k = Math.floor(f), w = f - k;
    const [len, skew] = jitter[k];
    // dente di sega (punta al centro della ciocca, spostata un po' di lato) o, per i mossi, punte tonde
    const c = 0.5 + skew, tooth = o.round ? Math.pow(Math.sin(Math.PI * w), 0.5) : w < c ? w / c : (1 - w) / (1 - c);
    const ridge = Math.sin(Math.PI * Math.min(1, Math.max(0, w))); // rilievo al centro della ciocca
    lockOf.push(k);
    P.push([]); Q.push([]); Nn.push([]);
    for (let j = 0; j <= NV; j++) {
      const v = j / NV; // 0 bordo, 1 cima
      // mossi: ogni ciocca ondeggia di lato (a S) scendendo, di più verso le punte
      // (sulla fronte la frangia resta liscia: onde e volume solo ai lati e dietro)
      const th0 = (o.span ? lerp(o.span[0], o.span[1], u) : u * 360) + o.swirl * v;
      // ciuffo di lato (sweep): le ciocche davanti partono dalla riga e scendono di traverso sulla fronte, ondeggiando anche lì
      const front = 1 - smooth(10, 150, absDeg(th0 * DEG)); // calo dolce: le ciocche spostate non si accavallano
      // dove ondeggiano le ciocche: ai lati e dietro (mossi), ovunque, o solo sulla fronte (ciuffo di lato lungo, lati lisci)
      const zone = o.waveZone ?? (o.sweep ? 'all' : 'sides');
      const sides = zone === 'all' ? 1 : zone === 'front' ? 1 - smooth(50, 95, absDeg(th0 * DEG)) : smooth(30, 75, absDeg(th0 * DEG));
      const wv = o.waveTh ? o.waveTh * Math.sin((1 - v) * Math.PI * 2.6 + k * 0.9) * smooth(0, 0.6, 1 - v) * sides : 0;
      const thD = th0 + wv + (o.sweep ?? 0) * front * Math.pow(1 - v, 1.3);
      const ends = o.span ? smooth(0, 0.1, u) * smooth(1, 0.9, u) : 1; // un arco si assottiglia agli estremi
      const hem = o.hem(thD) - o.depth * len * tooth * (o.round ? 0.25 + 0.75 * sides : 1);
      const top = o.top ?? 89;
      const phD = lerp(Math.min(hem, top - 3), top, Math.pow(v, 0.85));
      const { p, n } = hairPoint(thD * DEG, phD);
      const flare = (o.flare ?? 0) * Math.pow(1 - v, 3) * sides; // le punte si aprono verso l'esterno (volume)
      const t = (o.thick * (0.55 + 0.45 * ridge) * smooth(0, 0.25, v + 0.05 * tooth) + o.lift * (1 - v) * (1 - v) + flare) * ends;
      P[i].push(p.clone().addScaledVector(n, 0.006 + t));
      Q[i].push(p.clone().addScaledVector(n, 0.004));
      Nn[i].push(n);
    }
  }
  const tr: Tris[] = [new Tris(), new Tris(), new Tris()];
  for (let i = 0; i < NU; i++) {
    const t = tr[Math.floor(jitter[lockOf[i]][2] * 3)];
    for (let j = 0; j < NV; j++) {
      t.quad(P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1], Nn[i][j]);
      // la parte che pende lascia vedere l'interno: lo chiudo
      if (HAIR_HANG && Q[i][j].y < C.y) t.quad(Q[i][j], Q[i + 1][j], Q[i + 1][j + 1], Q[i][j + 1], Nn[i][j].clone().negate());
    }
    // parete del bordo: chiude il guscio verso la testa
    t.quad(P[i][0], P[i + 1][0], Q[i + 1][0], Q[i][0], Nn[i][0].clone().negate().add(new THREE.Vector3(0, -1, 0)));
  }
  tr.forEach((t, k) => lp.add(t.geo(), o.tone([0.035, 0, -0.03][k]), { ...O, vary: 0.04 }));
}

/** Fin dove arrivano i capelli sotto ciascun cappello (φ, gradi). */
const HAT_PH: Record<HatStyle, number> = { none: 89, wide: 40, top: 42, beanie: 30 };
const hatPh = () => X.hatPh ?? HAT_PH[L.hat];

/** Riccioli: palline schiacciate distribuite a file regolari sulla superficie dei capelli. */
function curls(lp: LP, tone: (k: number) => string, top: number) {
  const rnd = prng(17);
  // file fitte di riccioli grandi che si toccano: coprono tutto il casco (niente parti lisce in vista)
  const ROWS = HAIR_HANG ? 12 : 8;
  for (let r = 0; r < ROWS; r++) {
    const v = r / (ROWS - 1); // 0 orlo, 1 cima
    const count = Math.round(lerp(24, 8, v));
    for (let i = 0; i < count; i++) {
      const th = ((i + 0.5 * (r % 2) + (rnd() - 0.5) * 0.4) / count) * 360;
      const ph = lerp(hairTip(th * DEG) + 4, top - 8, v);
      const { p, n } = hairPoint(th * DEG, ph);
      if (absDeg(th * DEG) < 40 && ph < 10) continue; // non sul viso
      const rr = 0.05 + rnd() * 0.016;
      const c = p.addScaledVector(n, 0.045);
      lp.blob(c.x, c.y, c.z, rr, rr * 0.9, rr, tone([0.03, -0.02, 0.05, 0][(r + i) % 4]), { ...O, detail: 1 } as LPOpts);
    }
  }
}

/**
 * Capelli come nel concept: un casco pieno fatto di strati di ciocche
 * appuntite che scendono dal vortice; la forma dell'orlo cambia con il
 * taglio. Con un cappello resta solo lo strato basso, fino alla tesa.
 */
function hair(lp: LP) {
  if (L.hair === 'none') return;
  const tone = (k: number) => shade(HAIR, k);
  const tip = (thD: number) => hairTip(thD * DEG);
  const top = Math.min(hatPh(), X.hair?.top ?? 89), hat = hatPh() < 89;
  const style = L.hair;
  const depth = X.hair?.depth ?? ({ bob: 1, long: 2, bun: 4, longcurly: 6, curly: 7, fringe: 2, fringeLong: 1, side: 6, sideLong: 3, wavy: 5, wavyLong: 6, tufts: 9 } as Record<string, number>)[style] ?? 13;
  if (X.hair) { // orlo su misura (corona di capelli ai lati, ciuffi grigi…): un solo strato
    hairLayer(lp, { locks: 14, hem: (t) => tip(t) + 4, depth, lift: X.hair.lift ?? 0.03, thick: X.hair.thick ?? 0.05, phase: 0, swirl: 6, seed: 3, tone, top: Math.min(top, X.hair.top ?? 89), span: X.hair.span });
    return;
  }
  if (style === 'buzz') { // rasati: un velo cortissimo, senza ciocche
    sheet(lp, 48, 8, (u, v) => [u * Math.PI, lerp(tip(u * 180), top, Math.pow(v, 0.8)) * DEG], (_u, v) => 0.005 + 0.009 * smooth(0, 0.2, v), tone(-0.03), { vary: 0.05 } as LPOpts);
    return;
  }
  const messy = style === 'spiky' || style === 'tufts';
  const curly = style === 'curly' || style === 'longcurly';
  // mossi: poche ciocche grosse, a S, con le punte tonde che si aprono in fuori
  const wavy = style === 'wavy' || style === 'wavyLong';
  const wave = wavy ? { waveTh: style === 'wavy' ? 9 : 18, flare: style === 'wavy' ? 0.05 : 0.11, round: true } : {};
  const wave2 = wavy ? { waveTh: style === 'wavy' ? 7 : 13, flare: style === 'wavy' ? 0.03 : 0.06, round: true } : {};
  // ciuffo di lato: come i mossi ma più accentuato, con le ciocche davanti spazzate di traverso
  const swept = style === 'side' || style === 'sideLong';
  // il lungo invece ha i lati lisci e dritti: solo la frangia spazzata ondeggia e copre un occhio
  const sideLong = style === 'sideLong';
  const sw1 = sideLong ? { waveTh: 12, sweep: -50, waveZone: 'front' as const } : swept ? { waveTh: 12, flare: 0.04, round: true, sweep: -40 } : wave;
  const sw2 = sideLong ? { waveTh: 8, sweep: -55, waveZone: 'front' as const, round: true } : swept ? { waveTh: 7, flare: 0.03, round: true, sweep: -45 } : wave2;
  const sw3 = sideLong ? { sweep: -40, round: true } : swept ? { round: true, sweep: -35 } : {};
  // i ricci hanno sotto un casco sottile e più scuro: si vedono solo i riccioli
  const base = curly ? (k: number) => tone(k - 0.07) : tone;
  const thick = curly ? 0.025 : hat ? 0.03 : 0.05;
  hairLayer(lp, { locks: messy ? 15 : wavy || swept ? 14 : 20, hem: (t) => tip(t) + 4, depth, lift: 0.03, thick, phase: 0, swirl: messy ? 14 : 6, seed: 3, tone: base, top, ...sw1 });
  if (!hat && !curly) {
    hairLayer(lp, { locks: messy ? 12 : wavy || swept ? 11 : 16, hem: (t) => tip(t) + 26, depth: depth + 2, lift: 0.04, thick: 0.065, phase: 0.5, swirl: messy ? 18 : 8, seed: 7, tone, ...sw2 });
    hairLayer(lp, { locks: messy ? 9 : 12, hem: (t) => tip(t) + 48, depth: depth + 3, lift: 0.05, thick: 0.08, phase: 0.2, swirl: messy ? 22 : 10, seed: 11, tone, ...sw3 });
  }
  if (curly) curls(lp, tone, hat ? top : 86);
  if (style === 'bun' && !hat) {
    const { p, n } = headAt(Math.PI, 40 * DEG); // crocchia più bassa, sulla nuca
    const c = p.addScaledVector(n, 0.1);
    lp.blob(c.x, c.y, c.z, 0.11, 0.1, 0.1, tone(0.02), { ...O, detail: 2 } as LPOpts);
    lp.add(new THREE.TorusGeometry(0.075, 0.016, 6, 14).rotateX(-0.3).translate(c.x, c.y + 0.03, c.z + 0.06), L.accentColor, O); // elastico
  }
  if (hat) return;
  if (style === 'spiky') {
    // ciuffi a punta che salgono dalla cima
    const rnd = prng(5);
    [[-25, 0.13, -0.5], [5, 0.15, 0.1], [30, 0.12, 0.55], [175, 0.11, 0.3], [-160, 0.1, -0.4]].forEach(([th, h, lean], k) => {
      const { p, n } = headAt(th * DEG, 78 * DEG);
      const base0 = p.addScaledVector(n, 0.05);
      const axis = n.clone().add(new THREE.Vector3(Math.sin(th * DEG), 0, Math.cos(th * DEG)).multiplyScalar(0.6 + lean)).normalize();
      const g = new THREE.ConeGeometry(0.045 + rnd() * 0.012, h, 5).translate(0, h / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis));
      lp.add(g.translate(base0.x, base0.y, base0.z), tone([0.04, 0.015, 0.03, 0, 0.02][k]), { ...O, vary: 0.04 });
    });
  }
  if (style === 'tufts') tufts(lp, tone);
}

/**
 * Ciuffi: ciocche grosse e morbide che salgono dritte dalla cima e si piegano
 * un po' all'indietro, come fiammelle (non sulla fronte).
 */
function tufts(lp: LP, tone: (k: number) => string) {
  const list: Array<[number, number, number, number]> = [ // θ, φ della radice, altezza, piega all'indietro
    [-28, 66, 0.15, 0.35], [0, 70, 0.18, 0.25], [28, 66, 0.15, 0.4], [-55, 58, 0.11, 0.5], [55, 58, 0.11, 0.55], [-14, 80, 0.15, 0.6], [16, 80, 0.14, 0.7],
    // a scalare verso la nuca: più piccoli e più piegati, danno movimento alla cima
    [-100, 62, 0.1, 0.9], [100, 62, 0.1, 0.9], [-60, 80, 0.11, 0.8], [60, 80, 0.11, 0.85], [150, 70, 0.09, 1], [-150, 72, 0.09, 1], [180, 82, 0.1, 0.9],
  ];
  list.forEach(([th, ph, h, back], k) => {
    const { p, n } = headAt(th * DEG, ph * DEG);
    const rootP = p.clone().addScaledVector(n, 0.02);
    const up = n.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 1, 0)).normalize();
    const bend = new THREE.Vector3(Math.sin(th * DEG) * 0.3, 0, -1).normalize(); // si piega indietro e un po' in fuori
    const mid = rootP.clone().addScaledVector(up, h * 0.55).addScaledVector(bend, h * back * 0.25);
    const tipP = rootP.clone().addScaledVector(up, h).addScaledVector(bend, h * back * 0.7);
    lp.add(taperTube([rootP, mid, tipP], [0.03 + h * 0.14, 0.022 + h * 0.1, 0.005], 6), tone([0.04, 0.0, 0.03, -0.02, 0.02, 0.05, 0.01][k % 7]), { ...O, vary: 0.04 });
  });
}

/** Cappelli: tesa larga, cilindro, berretto con risvolto e pompon. */
function hatGeo(lp: LP) {
  if (X.hat) { X.hat(lp); return; }
  if (L.hat === 'none') return;
  const c = L.hatColor, d = shade(c, -0.08);
  if (L.hat === 'beanie') {
    sheet(lp, 30, 6, (u, v) => [Math.PI + u * Math.PI, lerp(26, 89, v) * DEG], (_u, v) => 0.06 + 0.03 * smooth(0.3, 1, v), c);
    sheet(lp, 60, 2, (u, v) => [Math.PI + u * Math.PI, lerp(18, 32, v) * DEG], (u) => 0.085 + 0.006 * Math.cos(u * Math.PI * 30), shade(c, 0.04));
    lp.blob(C.x, C.y + R.y + 0.09, C.z, 0.075, 0.07, 0.075, shade(c, 0.12), { ...O, detail: 1 } as LPOpts);
    return;
  }
  // la tesa poggia dove finiscono i capelli; la cupola li copre tutti
  const at = (th: number) => headAt(th, (hatPh() - 4) * DEG).p;
  const brimY = at(0).y - 0.005;
  const headR = Math.max(...[0, 90, 180, -90].map((t) => Math.hypot(at(t * DEG).x - C.x, at(t * DEG).z - C.z)));
  const wide = L.hat === 'wide';
  lp.push([C.x, brimY, C.z - 0.01], 0, -0.06, 0.05);
  lp.cyl(0, 0, 0, wide ? 0.43 : 0.34, wide ? 0.42 : 0.33, 0.03, 18, c, O);
  const cr = headR + 0.045, ch = wide ? 0.2 : 0.34;
  lp.cyl(0, 0.02, 0, cr, cr * (wide ? 0.88 : 1.02), ch, 16, c, { ...O, ao: 0.05 });
  lp.cyl(0, 0.03, 0, cr + 0.004, cr * 0.99, 0.05, 16, wide ? d : shade(L.accentColor, -0.1), O); // nastro
  if (wide) lp.blob(0, ch + 0.02, 0, cr * 0.85, 0.045, cr * 0.85, c, { ...O, detail: 1 } as LPOpts);
  lp.pop();
}

/** Occhiali, lentiggini, cerotto. */
function faceExtras(lp: LP) {
  const frame = L.glasses === 'square' ? '#6b4a33' : '#c9a227';
  const lift = 0.03;
  if (L.glasses === 'round' || L.glasses === 'monocle') {
    for (const s of L.glasses === 'monocle' ? [1] : [-1, 1]) onSkin(lp, headFront(s * EYE_X, EYE_Y), lift, 0, (q) => q.add(new THREE.TorusGeometry(0.062, 0.008, 5, 18), frame, O));
    if (L.glasses === 'round') onSkin(lp, headFront(0, EYE_Y + 0.01), lift - 0.004, 0, (q) => q.add(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 5).rotateZ(Math.PI / 2), frame, O));
    else {
      const a = headFront(EYE_X + 0.04, EYE_Y - 0.05), b = headFront(0.19, 0.6), c2 = headFront(0.2, 0.52);
      lp.add(taperTube([a.p.addScaledVector(a.n, lift), b.p.addScaledVector(b.n, 0.02), c2.p.addScaledVector(c2.n, 0.02)], [0.004, 0.004, 0.004], 4), frame, O);
    }
  } else if (L.glasses === 'square') {
    for (const s of [-1, 1]) onSkin(lp, headFront(s * EYE_X, EYE_Y), lift, 0, (q) => {
      for (const [x, y, w, h] of [[0, 0.05, 0.13, 0.014], [0, -0.05, 0.13, 0.014], [-0.06, 0, 0.014, 0.11], [0.06, 0, 0.014, 0.11]]) q.add(new THREE.BoxGeometry(w, h, 0.012).translate(x, y, 0), frame, O);
    });
    onSkin(lp, headFront(0, EYE_Y + 0.02), lift - 0.004, 0, (q) => q.add(new THREE.BoxGeometry(0.08, 0.012, 0.01), frame, O));
  }
  if (X.bare) return;
  if (L.freckles) for (const s of [-1, 1]) for (const [x, y] of [[0.17, 0.655], [0.2, 0.67], [0.185, 0.64], [0.215, 0.648]]) {
    onSkin(lp, headFront(s * x, y), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.008, 6), shade(SKIN, -0.25), O));
  }
  if (L.bandaid) onSkin(lp, headFront(-0.19, 0.66), 0.004, 0.5, (q) => {
    q.add(rbox(0.09, 0.03, 0.008, 0.006, 1), '#e8c9a0', O);
    q.add(new THREE.BoxGeometry(0.03, 0.022, 0.006).translate(0, 0, 0.004), '#d9b48a', O);
  });
}

/** Profilo della giacca (raggio, altezza dal fondo a y = 0,19): serve anche alla sciarpa. */
const JACKET_PROFILE: Array<[number, number]> = [[0.214, 0], [0.236, 0.022], [0.243, 0.07], [0.236, 0.15], [0.214, 0.225], [0.178, 0.28], [0.13, 0.305]];
function jacketR(y: number): number {
  const h = y - 0.19;
  for (let i = 0; i < JACKET_PROFILE.length - 1; i++) {
    const [r0, h0] = JACKET_PROFILE[i], [r1, h1] = JACKET_PROFILE[i + 1];
    if (h <= h1) return lerp(r0, r1, THREE.MathUtils.clamp((h - h0) / (h1 - h0), 0, 1));
  }
  return JACKET_PROFILE[JACKET_PROFILE.length - 1][0];
}

/** Pianta dello stivale (punta tonda, tacco più squadrato) estrusa per altezza h, con smusso b. */
function footGeo(w: number, d: number, h: number, b: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const hw = w / 2 - b, hd = d / 2 - b, rh = hw * 0.8;
  s.moveTo(-hw, -hd + rh); s.quadraticCurveTo(-hw, -hd, -hw + rh, -hd); s.lineTo(hw - rh, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + rh);
  s.lineTo(hw, hd - hw); s.absarc(0, hd - hw, hw, 0, Math.PI, false); s.lineTo(-hw, -hd + rh);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 8 });
  return g.rotateX(Math.PI / 2).translate(0, h - b, 0);
}

/**
 * Nastro di stoffa appoggiato sul petto: segue la curva della giacca, ondeggia
 * un poco, si allarga verso il fondo; le righe sono tratti del nastro stesso.
 */
function scarfTail(lp: LP) {
  const N = 14, W = 0.044, T = 0.014;
  const center = (s: number) => {
    const y = lerp(0.47, 0.305, s);
    const x = -0.105 - 0.03 * s + 0.008 * Math.sin(s * 5);
    const z = Math.sqrt(Math.max(0, (jacketR(y) * 0.82) ** 2 - (x * 0.82) ** 2)) + 0.012 + 0.006 * Math.sin(s * Math.PI);
    return new THREE.Vector3(x, y, z);
  };
  const stripe = (s: number) => [0.42, 0.58, 0.74].some((c) => Math.abs(s - c) < 0.045);
  const segs: Record<string, Tris> = { base: new Tris(), stripe: new Tris() };
  const ring = (i: number) => {
    const s = i / N, c = center(s);
    const tan = center(Math.min(1, s + 0.02)).sub(center(Math.max(0, s - 0.02))).normalize();
    const nrm = new THREE.Vector3(c.x, 0, c.z).normalize(); // fuori dal petto
    const side = new THREE.Vector3().crossVectors(tan, nrm).normalize();
    const w = W * (0.9 + 0.2 * s) * (1 + 0.06 * Math.sin(s * 9));
    return { c, nrm, side, w, s };
  };
  for (let i = 0; i < N; i++) {
    const a = ring(i), b = ring(i + 1);
    const t = segs[stripe((a.s + b.s) / 2) ? 'stripe' : 'base'];
    const P = (r: typeof a, u: number, f: number) => r.c.clone().addScaledVector(r.side, u * r.w).addScaledVector(r.nrm, f * T * (1 - 0.5 * u * u));
    for (const f of [1, -1]) t.quad(P(a, -1, f), P(a, 1, f), P(b, 1, f), P(b, -1, f), a.nrm.clone().multiplyScalar(f));
    for (const u of [-1, 1]) t.quad(P(a, u, 1), P(b, u, 1), P(b, u, -1), P(a, u, -1), a.side.clone().multiplyScalar(u));
  }
  lp.add(segs.base.geo(), SCARF, { ...O, vary: 0.03 });
  lp.add(segs.stripe.geo(), SCARF_STRIPE, { ...O, vary: 0.03 });
  // frangia in fondo
  const e = ring(N);
  for (const u of [-0.7, -0.25, 0.2, 0.65]) {
    const q = e.c.clone().addScaledVector(e.side, u * e.w);
    lp.cyl(q.x, q.y - 0.026, q.z, 0.004, 0.006, 0.028, 4, SCARF, O);
  }
}

/** Colore del busto e delle maniche per ciascun vestito. */
const torsoColor = () => (L.outfit === 'overalls' ? L.accentColor : L.outfit === 'cloak' ? shade(L.outfitColor, 0.12) : JACKET);

function body(lp: LP) {
  if (X.robe) { robe(lp); return; }
  const torso = torsoColor();
  // busto morbido a "pera": spalle strette, si allarga verso il fondo, sezione ovale
  lp.push([0, 0.19, 0], 0, 0, 0, [1, 1, 0.82]);
  lp.lathe(0, 0, 0, [[0, 0], ...JACKET_PROFILE.map(([r, h]) => [r, h] as [number, number]), [0, 0.312]], 16, torso, { ...O, ao: 0.16 });
  if (L.outfit === 'coat' || L.outfit === 'cloak') lp.lathe(0, 0.004, 0, [[0, 0], [0.24, 0], [0.247, 0.022], [0.243, 0.046], [0, 0.046]], 16, DARK, O); // cintura
  if (L.outfit === 'sweater') {
    // orlo a coste e due righe del colore d'accento
    lp.lathe(0, 0, 0, [[0, 0], [0.222, 0], [0.24, 0.012], [0.244, 0.034], [0, 0.034]], 16, JACKET_D, O);
    for (const h of [0.1, 0.15]) lp.lathe(0, h, 0, [[0, 0], [jacketR(0.19 + h) + 0.003, 0], [jacketR(0.19 + h + 0.022) + 0.003, 0.022], [0, 0.022]], 16, L.accentColor, O);
  }
  if (L.outfit === 'overalls') lp.lathe(0, 0, 0, [[0, 0], [0.218, 0], [0.24, 0.022], [0.246, 0.07], [0.242, 0.11], [0, 0.11]], 16, JACKET, { ...O, ao: 0.1 }); // vita della salopette
  lp.pop();
  if (L.outfit === 'coat') coatDetails(lp);
  if (L.outfit === 'coat' && X.plainCoat) lp.add(rbox(0.05, 0.036, 0.012, 0.006, 1).translate(0, 0.214, 0.2), '#6a5a3e', O);
  if (L.outfit === 'sweater') {
    lp.push([0, 0.49, 0], 0, 0.12, 0, [1, 1, 0.88]);
    lp.lathe(0, -0.03, 0, [[0, 0], [0.15, 0], [0.155, 0.03], [0.145, 0.06], [0, 0.06]], 14, JACKET_D, O); // collo alto
    lp.pop();
  }
  if (L.outfit === 'overalls') overalls(lp);
  if (L.outfit === 'cloak') cloak(lp);
  X.chest?.(lp);
}

/** Tonaca lunga fino a terra (prete, corteo): dal collo si allarga a campana; spuntano le punte degli stivali. */
function robe(lp: LP) {
  const prof: Array<[number, number]> = [[0, 0], [0.235, 0], [0.255, 0.03], [0.258, 0.12], [0.25, 0.24], [0.232, 0.33], [0.2, 0.41], [0.16, 0.46], [0.13, 0.48], [0, 0.48]];
  lp.push([0, 0.025, 0], 0, 0, 0, [1, 1, 0.84]);
  lp.lathe(0, 0, 0, prof, 16, JACKET, { ...O, ao: 0.18 });
  lp.lathe(0, 0, 0, [[0, 0], [0.238, 0], [0.258, 0.02], [0.258, 0.04], [0, 0.04]], 16, JACKET_D, O); // orlo
  lp.pop();
  lp.push([0, 0.49, -0.01], 0, 0.12, 0, [1, 1, 0.86]);
  lp.add(new THREE.TorusGeometry(0.135, 0.04, 8, 18).rotateX(Math.PI / 2), JACKET_D, O); // colletto
  lp.pop();
  X.chest?.(lp);
}

/** Giacca: fibbia, borsello, tasche, cappuccio, sciarpa. */
function coatDetails(lp: LP) {
  if (X.plainCoat) {
    lp.blob(0, 0.475, -0.14, 0.2, 0.1, 0.105, JACKET_D, { ...O, detail: 2 } as LPOpts);
    lp.push([0, 0.48, -0.01], 0, 0.12, 0, [1, 1, 0.86]);
    lp.add(new THREE.TorusGeometry(0.15, 0.048, 8, 18).rotateX(Math.PI / 2), JACKET_D, O);
    lp.pop();
    return;
  }
  lp.add(rbox(0.05, 0.036, 0.012, 0.006, 1).translate(0, 0.214, 0.2), '#6a5a3e', O);
  // borsello appeso al fianco destro, con passante
  lp.add(rbox(0.075, 0.085, 0.04, 0.014, 2).translate(0.175, 0.17, 0.12).rotateY(0.5), DARK, O);
  // tasche: tagli obliqui sui fianchi
  for (const s of [-1, 1]) {
    lp.push([s * 0.13, 0.285, 0.172], s * -0.35, 0, s * 0.35);
    lp.add(rbox(0.085, 0.014, 0.012, 0.005, 1), DARK, O);
    lp.pop();
  }
  // cappuccio ripiegato dietro il collo e bordo morbido attorno al collo
  lp.blob(0, 0.475, -0.14, 0.2, 0.1, 0.105, JACKET_D, { ...O, detail: 2 } as LPOpts);
  lp.push([0, 0.48, -0.01], 0, 0.12, 0, [1, 1, 0.86]);
  lp.add(new THREE.TorusGeometry(0.15, 0.048, 8, 18).rotateX(Math.PI / 2), JACKET_D, O);
  lp.pop();
  // collo in ombra sotto il mento (stacca la barba dalla giacca)
  lp.blob(0, 0.51, 0, 0.11, 0.035, 0.1, '#7a5040', { ...O, detail: 1 } as LPOpts);
  // sciarpa color panna a righe: giro sul collo e un capo che scende di traverso
  lp.push([0, 0.505, 0.005], 0, 0.12, 0, [1, 1, 0.9]);
  lp.add(new THREE.TorusGeometry(0.13, 0.032, 6, 18).rotateX(Math.PI / 2), SCARF, O);
  lp.pop();
  // nodo sotto la barba, poi il capo che scende sul petto
  lp.blob(-0.105, 0.48, 0.165, 0.045, 0.038, 0.035, SCARF, { ...O, detail: 1 } as LPOpts);
  scarfTail(lp);
}

/** Pettorina, bretelle con bottoni, colletto della camicia. */
function overalls(lp: LP) {
  lp.add(rbox(0.21, 0.14, 0.03, 0.012, 2).rotateX(-0.32).translate(0, 0.35, 0.19), JACKET, { ...O, ao: 0.05 });
  lp.add(rbox(0.08, 0.04, 0.012, 0.006, 1).rotateX(-0.32).translate(0, 0.36, 0.208), JACKET_D, O); // taschino
  for (const s of [-1, 1]) {
    const pts = [new THREE.Vector3(s * 0.08, 0.41, 0.17), new THREE.Vector3(s * 0.1, 0.47, 0.09), new THREE.Vector3(s * 0.1, 0.5, -0.02), new THREE.Vector3(s * 0.09, 0.44, -0.15), new THREE.Vector3(s * 0.08, 0.3, -0.19)];
    lp.add(taperTube(pts, [0.018, 0.018, 0.018, 0.018, 0.018], 5).scale(1, 1, 1), JACKET, O);
    lp.blob(s * 0.08, 0.4, 0.2, 0.016, 0.016, 0.01, '#c9a227', { ...O, detail: 1 } as LPOpts); // bottone
  }
  lp.push([0, 0.48, -0.01], 0, 0.12, 0, [1, 1, 0.86]);
  lp.add(new THREE.TorusGeometry(0.135, 0.035, 8, 18).rotateX(Math.PI / 2), shade(L.accentColor, -0.06), O); // colletto
  lp.pop();
}

/** Mantello che scende dalle spalle dietro, con fermaglio e cappuccio. */
function cloak(lp: LP) {
  const pts = [[0.13, 0.52], [0.2, 0.47], [0.255, 0.36], [0.285, 0.22], [0.3, 0.12], [0.285, 0.12], [0.27, 0.22], [0.24, 0.36], [0.185, 0.46], [0.12, 0.505]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 14, Math.PI - 1.35, 2.7).scale(1, 1, 0.92);
  lp.add(g, JACKET, { ...O, ao: 0.12 });
  lp.blob(0, 0.49, -0.15, 0.2, 0.1, 0.1, JACKET_D, { ...O, detail: 2 } as LPOpts); // cappuccio
  lp.push([0, 0.49, -0.01], 0, 0.12, 0, [1, 1, 0.86]);
  lp.add(new THREE.TorusGeometry(0.145, 0.04, 8, 18).rotateX(Math.PI / 2), JACKET, O);
  lp.pop();
  for (const s of [-1, 1]) lp.blob(s * 0.1, 0.47, 0.13, 0.03, 0.03, 0.02, L.accentColor, { ...O, detail: 1 } as LPOpts); // fermagli
  lp.add(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4).rotateZ(Math.PI / 2).translate(0, 0.47, 0.135), L.accentColor, O);
}

function leg(lp: LP, s: number) {
  // sotto la tonaca spuntano solo le punte degli stivali
  if (X.robe) { lp.add(footGeo(0.15, 0.2, 0.08, 0.03).translate(s * 0.09, 0, 0.08), X.boot ?? SOLE, O); return; }
  // gamba corta e un po' larga (nasce dentro la giacca), stivalone tondo con suola spessa
  lp.cyl(s * 0.095, 0.07, 0, 0.082, 0.076, 0.15, 12, X.pants ?? PANTS, { ...O, ao: 0.12 });
  // stivale e suola con la stessa pianta: la tomaia nasce dentro la suola,
  // così il bordo è continuo (niente tavoletta staccata sotto)
  lp.add(footGeo(0.172, 0.25, 0.036, 0.01).translate(s * 0.095, 0, 0.034), SOLE, O);
  lp.add(footGeo(0.16, 0.236, 0.112, 0.04).translate(s * 0.095, 0.014, 0.034), X.boot ?? BOOT, O);
}

/** Centro della mano (braccia giù o tese in avanti, come lo zombie). */
export function handPos(s: number): THREE.Vector3 {
  return X.armPose === 'forward' ? new THREE.Vector3(s * 0.2, 0.43, 0.37) : new THREE.Vector3(s * 0.296, 0.215, 0.05);
}

function arm(lp: LP, s: number) {
  const fwd = X.armPose === 'forward';
  // manica morbida che scende un po' in fuori e in avanti, più larga al polso (o tesa in avanti)
  const pts = fwd
    ? [new THREE.Vector3(s * 0.18, 0.46, -0.005), new THREE.Vector3(s * 0.2, 0.445, 0.1), new THREE.Vector3(s * 0.2, 0.435, 0.2), new THREE.Vector3(s * 0.2, 0.43, 0.26)]
    : [new THREE.Vector3(s * 0.18, 0.46, -0.005), new THREE.Vector3(s * 0.235, 0.39, 0.01), new THREE.Vector3(s * 0.268, 0.31, 0.03), new THREE.Vector3(s * 0.282, 0.27, 0.04)];
  const sleeve = X.sleeve ?? torsoColor();
  lp.add(taperTube(pts, [0.07, 0.072, 0.074, 0.076], 12), sleeve, { ...O, ao: 0.06 });
  lp.blob(s * 0.18, 0.46, -0.005, 0.075, 0.072, 0.075, sleeve, { ...O, detail: 2 } as LPOpts); // spalla
  if (fwd) lp.push([s * 0.2, 0.43, 0.28], 0, Math.PI / 2);
  else lp.push([s * 0.286, 0.262, 0.042], 0, 0.15, s * 0.32);
  const cuff = X.cuff ?? (L.outfit === 'coat' ? DARK : L.outfit === 'sweater' ? JACKET_D : shade(sleeve, -0.08));
  lp.cyl(0, -0.02, 0, 0.078, 0.078, 0.04, 12, cuff, O); // polsino
  lp.pop();
  const h = handPos(s);
  lp.blob(h.x, h.y, h.z, 0.072, 0.072, 0.07, X.hand ?? SKIN, { ...O, detail: 2 } as LPOpts); // manona
}

/** Lanterna appesa alla manona (al posto della borsa del concept). */
function lantern(lp: LP, x: number) {
  const y = 0.18, z = 0.05;
  lp.add(new THREE.TorusGeometry(0.036, 0.008, 4, 12, Math.PI).translate(x, y - 0.035, z), DARK, O); // manico ad arco
  const by = y - 0.125; // centro del vetro
  lp.add(new THREE.ConeGeometry(0.075, 0.05, 4).rotateY(Math.PI / 4).translate(x, by + 0.09, z), DARK, O); // tettuccio
  lp.add(rbox(0.11, 0.022, 0.11, 0.006, 1).translate(x, by + 0.062, z), DARK, O);
  lp.add(rbox(0.118, 0.026, 0.118, 0.007, 1).translate(x, by - 0.062, z), DARK, O);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.add(new THREE.BoxGeometry(0.016, 0.11, 0.016).translate(x + dx * 0.046, by, z + dz * 0.046), DARK, O);
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    lp.push([x, by, z], a);
    lp.add(new THREE.BoxGeometry(0.008, 0.1, 0.006).translate(0, 0, 0.047), DARK, O);
    lp.add(new THREE.BoxGeometry(0.09, 0.008, 0.006).translate(0, 0.005, 0.047), DARK, O);
    lp.pop();
  }
  lp.add(new THREE.BoxGeometry(0.084, 0.1, 0.084).translate(x, by, z), '#ffb24a', { ...O, bucket: 'glow' }); // vetro acceso
  lp.blob(x, by - 0.01, z, 0.016, 0.024, 0.016, '#fff1c4', { ...O, bucket: 'glow' });
  lp.light(x, by, z, '#f2ac58', 1.1, 5.5, 0.2, 1); // come la lanterna del gioco: di notte illumina il Custode
}

/** Zolla del concept: piccola, terra spessa, prato scuro, funghi a pois, fiorellini, sasso. */
function diorama(lp: LP) {
  const r = lp.rng;
  lp.cyl(0, -0.18, 0, 0.5, 0.46, 0.15, 14, '#5e3d24', { jitter: 0.012, vary: 0.08, ao: 0.25 });
  lp.cyl(0, -0.035, 0, 0.51, 0.505, 0.04, 14, '#4e7b34', { jitter: 0.008, vary: 0.08, ao: 0 });
  const ring = (a: number, d0: number, d1: number): [number, number] => { const d = r.range(d0, d1); return [Math.cos(a) * d, Math.sin(a) * d]; };
  for (let i = 0; i < 12; i++) { const [x, z] = ring((i / 12) * Math.PI * 2 + r.range(-0.2, 0.2), 0.3, 0.46); grassTuft(lp, x, z, 0.55 + r.next() * 0.3, ['#4e7b34', '#5d8c3c', '#436b2d', '#6a9a45']); }
  mushroom(lp, -0.36, 0.2, 0.11, '#c9332e', false, 0.062);
  mushroom(lp, 0.33, 0.2, 0.09, '#c9332e', false, 0.055);
  mushroom(lp, -0.2, 0.36, 0.05, '#a77bc4', false, 0.03);
  for (const [x, z] of [[0.22, 0.35], [0.3, 0.27]]) flower(lp, x, z, '#ec9fbf', 0.05 + r.next() * 0.03);
  lp.blob(0.16, 0.02, -0.33, 0.075, 0.045, 0.06, '#8d8f8c', { jitter: 0.01, vary: 0.1, ao: 0 });
  lp.blob(0.02, 0.005, 0.42, 0.06, 0.028, 0.045, '#9a9c98', { jitter: 0.01, vary: 0.1, ao: 0 });
}

function model(build: (lp: LP) => void, name: string): CachedModel {
  const lp = new LP(name);
  build(lp);
  const { geometries, lights } = lp.build();
  return { geometries, lights, height: 1.1, mats: LOWPOLY_MATERIALS, dedicated: true };
}

/**
 * Occhi grandi e lucidi (materiale lucido "gloss") con il riflesso a stella;
 * varianti: assonnati (palpebra), chiusi (archetto), zombie (uno tondo, uno
 * cucito), orbite (scheletro: buio con una lucina). `at` dà il punto sulla
 * superficie; `glow` li fa luminosi (gatto nero, corvo).
 */
export function eyesLP(lp: LP, style: EyeStyle = 'open', color = EYE, lid = SKIN, at = (s: number) => headFront(s * EYE_X, EYE_Y), glow = false) {
  const ball = { ...O, vary: 0, bucket: glow ? 'glow' : 'gloss' } as LPOpts;
  const shine = { ...O, vary: 0, bucket: 'gloss' } as LPOpts;
  const flat = { ...O, vary: 0 } as LPOpts;
  const ink = '#2a1a1c';
  for (const s of [-1, 1]) {
    const { p, n } = at(s);
    p.addScaledVector(n, 0.004);
    lp.push([p.x, p.y, p.z], Math.atan2(n.x, n.z), -Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)), 0, EYE_S);
    const add = (geo: THREE.BufferGeometry, c: string, o: LPOpts, x = 0, y = 0, z = 0) => lp.add(geo.translate(x, y, z), c, o);
    const glossy = () => {
      add(new THREE.IcosahedronGeometry(1, 2).scale(0.042, 0.051, 0.018), color, ball);
      add(star(0.015, 0.42), '#ffffff', shine, -0.003, 0.012, 0.017);
      add(new THREE.CircleGeometry(0.0046, 8), '#ffffff', shine, 0.014, -0.019, 0.016);
    };
    if (style === 'open') glossy();
    else if (style === 'sleepy') {
      glossy();
      // palpebra a metà: mezza calotta color pelle sopra l'occhio, con il bordo scuro
      add(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.047, 0.056, 0.024), shade(lid, -0.04), flat, 0, -0.004, 0);
      add(new THREE.TorusGeometry(0.044, 0.005, 4, 14, Math.PI).scale(1, 0.32, 1), ink, flat, 0, -0.004, 0.012);
    } else if (style === 'closed') {
      add(new THREE.TorusGeometry(0.036, 0.007, 4, 12, Math.PI).rotateZ(Math.PI), ink, flat, 0, 0.004, 0.004);
    } else if (style === 'zombie') {
      if (s < 0) {
        add(new THREE.IcosahedronGeometry(1, 2).scale(0.058, 0.062, 0.02), '#f4efe4', shine);
        add(new THREE.IcosahedronGeometry(1, 1).scale(0.022, 0.022, 0.01), ink, flat, 0.008, -0.006, 0.016);
        add(new THREE.CircleGeometry(0.006, 8), '#ffffff', shine, 0.004, 0.002, 0.027);
      } else for (const r of [0.785, -0.785]) add(new THREE.BoxGeometry(0.012, 0.085, 0.01).rotateZ(r), ink, flat, 0, 0, 0.004);
    } else if (style === 'sockets') {
      add(new THREE.IcosahedronGeometry(1, 2).scale(0.058, 0.064, 0.02), '#1e1b22', flat, 0, 0, -0.004);
      add(new THREE.IcosahedronGeometry(1, 1).scale(0.016, 0.016, 0.008), color, { ...flat, bucket: 'glow' }, 0, -0.004, 0.013);
    }
    lp.pop();
  }
}

// ── Parti animate (rig del gioco) ───────────────────────────────────────

type Build = (lp: LP) => void;
/** Scala nel mondo (altezza ≈ 1,25 come i personaggi di prima). */
export const V2_SCALE = 1;
/** Perni delle parti degli umani (spazio del personaggio): collo, anca, spalle, anche. */
export const HUMAN_PIVOTS: Record<KPart, [number, number, number]> = {
  head: [0, 0.5, 0], body: [0, 0.2, 0], armL: [-0.18, 0.46, -0.005], armR: [0.18, 0.46, -0.005], legL: [-0.095, 0.2, 0], legR: [0.095, 0.2, 0],
};

/**
 * Una parte si disegna nello spazio del personaggio (come nella tavola) e
 * viene portata nello spazio del suo perno. `state` reimposta aspetto e
 * forma della testa: le parti si generano quando servono, una alla volta.
 */
export function atPivot(state: () => void, pv: [number, number, number], draw: Build): Build {
  return (lp) => { state(); lp.push([-pv[0], -pv[1], -pv[2]]); draw(lp); lp.pop(); };
}

function headPart(lp: LP) {
  // testa (con faccia, barba, baffi e capelli) più grande del 30%, scalata attorno al mento
  lp.push([0, HEAD_T.y, 0], 0, 0, 0, HEAD_S);
  head(lp); glitter(lp); faceExtras(lp); beard(lp); braid(lp); moustache(lp); hair(lp); hatGeo(lp);
  if (!X.bare && HEAD !== 'pumpkin') {
    const style = X.eyes ?? (HEAD === 'zombie' ? 'zombie' : HEAD === 'skull' ? 'sockets' : 'open');
    eyesLP(lp, style, style === 'sockets' ? '#8ff0dc' : EYE, SKIN);
  }
  lp.pop();
}

function armPart(lp: LP, s: number) {
  if (X.body) X.body.arm(lp, s); else arm(lp, s);
  if (X.held) {
    for (const h of X.held) if (h.side === s) { const p = handPos(s); lp.push([p.x, p.y, p.z]); h.build(lp); lp.pop(); }
  } else if (s < 0) lantern(lp, -0.296);
}

/** Umano nello stile v2: aspetto (stesse opzioni della personalizzazione) e aggiunte. */
export function humanSpec(look: Partial<CustodeLook> = {}, extra: V2Extra = {}): KawaiiSpec {
  const full: CustodeLook = { ...CONCEPT_LOOK, ...look };
  const state = () => { X = extra; setHeadShape(); applyLook(full); };
  const P = HUMAN_PIVOTS;
  return {
    scale: V2_SCALE,
    pivots: { ...P },
    parts: {
      head: atPivot(state, P.head, headPart),
      body: atPivot(state, P.body, (lp) => (X.body ? X.body.torso(lp) : body(lp))),
      armL: atPivot(state, P.armL, (lp) => armPart(lp, -1)),
      armR: atPivot(state, P.armR, (lp) => armPart(lp, 1)),
      legL: atPivot(state, P.legL, (lp) => (X.body ? X.body.leg(lp, -1) : leg(lp, -1))),
      legR: atPivot(state, P.legR, (lp) => (X.body ? X.body.leg(lp, 1) : leg(lp, 1))),
    },
  };
}

/** Punti dei brillantini nello spazio della parte "testa" (per le scintille animate). */
export function sparklePointsV2(look: CustodeLook): Array<{ p: THREE.Vector3; n: THREE.Vector3; r: number }> {
  X = {}; setHeadShape(); applyLook(look);
  const out: Array<{ p: THREE.Vector3; n: THREE.Vector3; r: number }> = [];
  glitter(null, out);
  const pv = HUMAN_PIVOTS.head;
  return out.map(({ p, n, r }) => ({ p: new THREE.Vector3(p.x * HEAD_S - pv[0], HEAD_T.y + p.y * HEAD_S - pv[1], p.z * HEAD_S - pv[2]), n, r }));
}

// ── Montaggio statico (tavole di prototipo) ─────────────────────────────

export interface CustodeV2 { root: THREE.Group; diorama: THREE.Group; lights: Array<{ pos: [number, number, number]; color: string }> }

/** Monta le parti ai loro perni, ferme (per le tavole e le gallerie). */
export function assemble(spec: KawaiiSpec, name: string): CustodeV2 {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(spec.scale);
  root.add(inner);
  const lights: CustodeV2['lights'] = [];
  for (const [part, pv] of Object.entries(spec.pivots) as Array<[KPart, [number, number, number]]>) {
    const build = spec.parts[part];
    if (!build) continue;
    const lp = new LP(`v2:${name}:${part}`);
    build(lp);
    const m = lp.build();
    const g = instantiate({ geometries: m.geometries, lights: m.lights, height: 1, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: !spec.ghost });
    g.position.set(pv[0], pv[1] + (spec.hover ?? 0), pv[2]);
    inner.add(g);
    for (const l of m.lights) lights.push({ pos: [(l.pos[0] * VOX + pv[0]) * spec.scale, (l.pos[1] * VOX + pv[1] + (spec.hover ?? 0)) * spec.scale, (l.pos[2] * VOX + pv[2]) * spec.scale], color: l.color });
  }
  root.traverse((o) => { if (o instanceof THREE.Mesh && o.name === 'solid') { o.castShadow = !spec.ghost; o.receiveShadow = true; } });
  return { root, diorama: zolla(), lights };
}

/** Zolla del concept sotto i personaggi nelle tavole. */
export function zolla(): THREE.Group {
  const dio = instantiate(model(diorama, 'proto:zolla'), { castShadow: true });
  dio.traverse((o) => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
  return dio;
}

export function buildCustodeV2(look: Partial<CustodeLook> = {}, extra: V2Extra = {}): CustodeV2 {
  return assemble(humanSpec(look, extra), `custode:${extra.name ?? ''}:${JSON.stringify(look)}`);
}

// ── Kit per gli altri personaggi (npc.ts) ───────────────────────────────
/** Prepara lo stato per una creatura costruita a mano (fantasmi, animali). */
export function beginCreature(head: Parameters<typeof setHeadShape>[0]) {
  X = {}; HAIR_HANG = false;
  setHeadShape(head);
}
export const headCenter = () => C.clone();
export const headRadii = () => R.clone();
export { headAt, headFront, headGeo, surfaceAlong, onSkin, sheet, taperTube, star, rbox, shade, Tris, prng, smooth, lerp, DEG, O, footGeo };

/** Solo i capelli del Custode (spazio della testa, prima della scala), per i controlli. */
export function hairOnly(look: CustodeLook): { geo: THREE.BufferGeometry | undefined; center: THREE.Vector3; hatPh: number } {
  X = {}; setHeadShape(); applyLook(look);
  const lp = new LP('t:hair');
  hair(lp);
  return { geo: lp.build().geometries.solid, center: C.clone(), hatPh: hatPh() };
}
