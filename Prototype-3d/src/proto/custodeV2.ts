// PROTOTIPO (non incluso nel gioco): il Custode nello stile "v2" del concept —
// testa tonda e grande, capelli voluminosi a ciocche che escono dalla sagoma,
// barba a maschera con treccia, baffi a manubrio grandi, brillantini a
// stella, giacca con cappuccio e cintura, stivali, lanterna in mano.
// Costruito con lo stesso kit low-poly del gioco (LP), per valutarne la
// fattibilità. Pagina: proto-custode.html (solo in sviluppo, fuori dalla build).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LP, type LPOpts } from '../render/lowpoly/kit.ts';
import { instantiate, LOWPOLY_MATERIALS, type CachedModel } from '../render/modelCache.ts';
import { flower, grassTuft } from '../render/lowpoly/details.ts';
import { mushroom } from '../render/lowpoly/nature.ts';

// ── Palette del concept ─────────────────────────────────────────────────
const SKIN = '#f6cba6';
const HAIR = '#d98238';
const BEARD = '#d4567c';
const EYE = '#1f4d2e';
const JACKET = '#58722f';
const DARK = '#2c2a25';
const PANTS = '#5a3c2a';
const BOOT = '#6c4830';
const SOLE = '#2a221d';
const SCARF = '#eadcc0';
const SCARF_STRIPE = '#a87c52';
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
const C = new THREE.Vector3(0, 0.795, 0);
const R = new THREE.Vector3(0.275, 0.252, 0.255);
const PW = 2.5; // 2 = ellissoide, più alto = più squadrato
/** Allargamento sulle guance (in basso) e un po' meno in cima. */
const cheeks = (yn: number) => 1 + 0.07 * smooth(0.15, -0.55, yn) - 0.03 * smooth(0.3, 0.9, yn);

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

const EYE_Y = 0.707, EYE_X = 0.1;
const absDeg = (th: number) => Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) / DEG; // 0 davanti, 180 dietro
/** Dove arrivano le punte dei capelli (φ in gradi): poco sopra gli occhi davanti, sopra le orecchie ai lati, alla nuca dietro. */
const hairTip = (th: number) => { const a = absDeg(th); return a < 90 ? lerp(20, 0, smooth(30, 90, a)) : lerp(0, -32, smooth(90, 160, a)); }; // ai lati scende fin sopra l'orecchio, dietro alla nuca
/** Bordo superiore della barba (φ in gradi): sotto la bocca davanti, sale lungo la mandibola fino all'orecchio. */
const beardTop = (thDeg: number) => lerp(-54, 6, smooth(16, 86, Math.abs(thDeg))); // davanti appena sotto la bocca, ai lati sale fino ai capelli alla tempia // sale lungo la guancia e raggiunge i capelli davanti all'orecchio

function head(lp: LP) {
  lp.add(headGeo(), SKIN, { ...O, ao: 0.05 });
  for (const s of [-1, 1]) lp.blob(s * (R.x - 0.004), 0.72, -0.012, 0.05, 0.064, 0.04, SKIN, { ...O, detail: 2 } as LPOpts); // orecchie grandi e tonde
  // bocca: sorrisetto un po' di lato, sotto i baffi
  onSkin(lp, headFront(0, 0.603), 0.002, 0, (q) => q.add(new THREE.TorusGeometry(0.028, 0.008, 3, 8, Math.PI).rotateZ(Math.PI), '#2a1a1c', O));
}

/** Brillantini a stella, grandi e radi, su tutto il viso (non su occhi, baffi, barba, capelli). */
function glitter(lp: LP) {
  const rnd = prng(9);
  let placed = 0;
  for (let tries = 0; placed < 26 && tries < 4000; tries++) {
    const thD = (rnd() * 2 - 1) * 88, phD = -45 + rnd() * 55;
    if (phD < beardTop(thD) + 6 || phD > hairTip(thD * DEG) - 4) continue;
    const at = headAt(thD * DEG, phD * DEG);
    const { p } = at;
    if (p.z > 0.08 && Math.abs(Math.abs(p.x) - EYE_X) < 0.078 && Math.abs(p.y - EYE_Y) < 0.09) continue; // occhi
    if (p.z > 0.08 && Math.abs(p.x) < 0.23 && p.y > 0.585 && p.y < 0.68) continue; // baffi e bocca
    onSkin(lp, at, 0.002, rnd() * Math.PI, (q) => q.add(star(0.013 + rnd() * 0.011), GLITTER[placed % 3 === 0 ? 1 + (placed % 4) : 0], { ...O, bucket: 'glow' }));
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
/** Bordo inferiore della barba (φ, gradi): sotto il mento, ma non così in basso da finire dietro il colletto. */
const BEARD_LOW = -72;
const BEARD_DROP = 0.1;
/** Bordo inferiore lungo la mandibola: sotto il mento davanti, sale verso l'orecchio (profilo a diagonale). */
const beardLow = (u: number) => lerp(BEARD_LOW, -28, smooth(0.25, 1, Math.abs(u)));
function beardOffset(u: number, v: number, n: THREE.Vector3): { t: number; dir: THREE.Vector3 } {
  const side = smooth(0, 0.1, 1 - Math.abs(u));
  // di profilo il bordo posteriore scende in diagonale dall'orecchio al mento:
  // la massa cala gradualmente andando verso l'orecchio
  const jaw = Math.pow(THREE.MathUtils.clamp(1 - Math.abs(u) / 0.95, 0, 1), 1.3); // sulle guance resta sottile
  const low = Math.pow(1 - v, 2.2); // solo la parte bassa si allunga: le guance restano sottili
  // sotto il mento, davanti, un po' di spessore in più che cresce in avanti
  const front = smooth(0.55, 0, Math.abs(u)) * low;
  const t = side * smooth(0, 0.06, 1 - v) * (0.008 + 0.006 * (1 - Math.abs(u)) + BEARD_DROP * low * jaw + 0.035 * front);
  const dir = n.clone().add(new THREE.Vector3(0, -0.7, 0.45).multiplyScalar(low * jaw)).add(new THREE.Vector3(0, 0, 0.6).multiplyScalar(front)).normalize();
  return { t, dir };
}

/**
 * Barba come un unico guscio continuo (niente forme appiccicate): parte dalla
 * pelle con un bordo superiore netto (dalla bocca a davanti all'orecchio),
 * avvolge guance e mandibola e sotto il mento si ispessisce spingendo in
 * avanti e in basso. Superficie esterna + parete inferiore che la chiude.
 */
function beard(lp: LP) {
  const NU = 30, NV = 12;
  const outer: THREE.Vector3[][] = [], inner: THREE.Vector3[][] = [], norms: THREE.Vector3[][] = [];
  for (let i = 0; i <= NU; i++) {
    outer.push([]); inner.push([]); norms.push([]);
    const u = -1 + (2 * i) / NU, th = u * 92;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV; // 0 sotto il mento, 1 bordo superiore
      const { p, n } = headAt(th * DEG, lerp(beardLow(u), beardTop(th), v) * DEG);
      const { t, dir } = beardOffset(u, v, n);
      inner[i].push(p.clone());
      outer[i].push(p.clone().addScaledVector(dir, t));
      norms[i].push(n);
    }
  }
  const tr = new Tris();
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) tr.quad(outer[i][j], outer[i + 1][j], outer[i + 1][j + 1], outer[i][j + 1], norms[i][j]);
  // parete inferiore: chiude il guscio tornando alla pelle sotto il mento
  for (let i = 0; i < NU; i++) tr.quad(outer[i][0], outer[i + 1][0], inner[i + 1][0], inner[i][0], new THREE.Vector3(0, -1, 0.2));
  lp.add(tr.geo(), BEARD, { ...O, vary: 0.05 });
}

/** Punto (coordinate della testa, prima della scala) da cui pende la treccia. */
/**
 * Treccia che esce dalla punta della barba (stesso spazio della testa): il
 * primo grano è dentro la massa del mento, gli altri scendono toccandosi.
 * Restano davanti alla giacca (convertendo le quote nello spazio del corpo).
 */
function braid(lp: LP) {
  // punta del cuneo (u = 0, v = 0): il primo grano è per metà dentro la barba
  const { p, n } = headAt(0, BEARD_LOW * DEG);
  const { t, dir } = beardOffset(0, 0, n);
  const tip = p.addScaledVector(dir, t - 0.035);
  const R0 = 0.039, STEPY = 0.052;
  const zMin = (y: number, r: number) => (jacketR(HEAD_T.y + HEAD_S * y) * 0.82 + r * HEAD_S * 0.9) / HEAD_S;
  let y = tip.y, z = tip.z;
  for (let i = 0; i < 3; i++) {
    const r = R0 - i * 0.0015;
    z = Math.max(z - 0.006, zMin(y, r * 0.6)); // scende dritta, appena appoggiata alla giacca
    lp.blob(0, y, z, r * 1.05, r * 0.95, r, i % 2 ? '#c94f75' : BEARD, { ...O, detail: 2 } as LPOpts);
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
  const path = raw.map(([x, y, r]) => [x * 0.8, 0.645 + (y - 0.626) * 0.62, r * 0.85] as [number, number, number]); // ricciolo più basso: non gira attorno all'occhio
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
function hairLayer(lp: LP, o: { locks: number; hem: (thDeg: number) => number; depth: number; lift: number; thick: number; phase: number; swirl: number; seed: number; tone: (k: number) => string }) {
  const rnd = prng(o.seed);
  const jitter = Array.from({ length: o.locks }, () => [0.75 + rnd() * 0.5, (rnd() - 0.5) * 0.3, rnd()]); // lunghezza, asimmetria, tono
  const NU = o.locks * 4, NV = 6; // pochi segmenti: bastano per punta e rilievo di ogni ciocca
  const P: THREE.Vector3[][] = [], Q: THREE.Vector3[][] = [], Nn: THREE.Vector3[][] = [], lockOf: number[] = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, f = (u * o.locks + o.phase) % o.locks, k = Math.floor(f), w = f - k;
    const [len, skew] = jitter[k];
    // dente di sega: punta al centro della ciocca (spostata un po' di lato)
    const c = 0.5 + skew, tooth = w < c ? w / c : (1 - w) / (1 - c);
    const ridge = Math.sin(Math.PI * Math.min(1, Math.max(0, w))); // rilievo al centro della ciocca
    lockOf.push(k);
    P.push([]); Q.push([]); Nn.push([]);
    for (let j = 0; j <= NV; j++) {
      const v = j / NV; // 0 bordo, 1 cima
      const thD = u * 360 + o.swirl * v;
      const hem = o.hem(thD) - o.depth * len * tooth;
      const phD = lerp(hem, 89, Math.pow(v, 0.85));
      const { p, n } = headAt(thD * DEG, phD * DEG);
      const t = o.thick * (0.55 + 0.45 * ridge) * smooth(0, 0.25, v + 0.05 * tooth) + o.lift * (1 - v) * (1 - v);
      P[i].push(p.clone().addScaledVector(n, 0.006 + t));
      Q[i].push(p.clone().addScaledVector(n, 0.004));
      Nn[i].push(n);
    }
  }
  const tr: Tris[] = [new Tris(), new Tris(), new Tris()];
  for (let i = 0; i < NU; i++) {
    const t = tr[Math.floor(jitter[lockOf[i]][2] * 3)];
    for (let j = 0; j < NV; j++) t.quad(P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1], Nn[i][j]);
    // parete del bordo: chiude il guscio verso la testa
    t.quad(P[i][0], P[i + 1][0], Q[i + 1][0], Q[i][0], Nn[i][0].clone().negate().add(new THREE.Vector3(0, -1, 0)));
  }
  tr.forEach((t, k) => lp.add(t.geo(), o.tone([0.035, 0, -0.03][k]), { ...O, vary: 0.04 }));
}

/**
 * Capelli come nel concept: un casco pieno, più largo del cranio, fatto di
 * strati di ciocche appuntite che scendono dal vortice; bordo seghettato
 * (frangia sulla fronte, sopra le orecchie ai lati, nuca dietro) e qualche
 * ciuffo a punta che sale dalla cima.
 */
function hair(lp: LP) {
  const tone = (k: number) => `#${new THREE.Color(HAIR).offsetHSL(0, 0, k).getHexString()}`;
  const tip = (thD: number) => hairTip(thD * DEG);
  // dal basso in alto: ogni strato ha il bordo più in alto e sta sopra a quello sotto
  hairLayer(lp, { locks: 15, hem: (t) => tip(t) + 4, depth: 13, lift: 0.03, thick: 0.05, phase: 0, swirl: 14, seed: 3, tone });
  hairLayer(lp, { locks: 12, hem: (t) => tip(t) + 26, depth: 15, lift: 0.04, thick: 0.065, phase: 0.5, swirl: 18, seed: 7, tone });
  hairLayer(lp, { locks: 9, hem: (t) => tip(t) + 48, depth: 16, lift: 0.05, thick: 0.08, phase: 0.2, swirl: 22, seed: 11, tone });
  // ciuffi a punta che salgono dalla cima (radicati dentro il casco)
  const rnd = prng(5);
  [[-25, 0.13, -0.5], [5, 0.15, 0.1], [30, 0.12, 0.55], [175, 0.11, 0.3], [-160, 0.1, -0.4]].forEach(([th, h, lean], k) => {
    const { p, n } = headAt(th * DEG, 78 * DEG);
    const base = p.addScaledVector(n, 0.05);
    const axis = n.clone().add(new THREE.Vector3(Math.sin(th * DEG), 0, Math.cos(th * DEG)).multiplyScalar(0.6 + lean)).normalize();
    const g = new THREE.ConeGeometry(0.045 + rnd() * 0.012, h, 5).translate(0, h / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis));
    lp.add(g.translate(base.x, base.y, base.z), tone([0.04, 0.015, 0.03, 0, 0.02][k]), { ...O, vary: 0.04 });
  });
}

const JACKET_D = '#4c652a';
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

function body(lp: LP) {
  // giacca morbida a "pera": spalle strette, si allarga verso il fondo, sezione ovale
  lp.push([0, 0.19, 0], 0, 0, 0, [1, 1, 0.82]);
  lp.lathe(0, 0, 0, [[0, 0], ...JACKET_PROFILE.map(([r, h]) => [r, h] as [number, number]), [0, 0.312]], 16, JACKET, { ...O, ao: 0.16 });
  // cintura scura in fondo, con fibbia
  lp.lathe(0, 0.004, 0, [[0, 0], [0.24, 0], [0.247, 0.022], [0.243, 0.046], [0, 0.046]], 16, DARK, O);
  lp.pop();
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
  // gambe corte e un po' larghe, stivaloni tondi con suola spessa
  for (const s of [-1, 1]) {
    lp.cyl(s * 0.095, 0.07, 0, 0.082, 0.076, 0.13, 12, PANTS, { ...O, ao: 0.12 });
    // stivale e suola con la stessa pianta: la tomaia nasce dentro la suola,
    // così il bordo è continuo (niente tavoletta staccata sotto)
    lp.add(footGeo(0.172, 0.25, 0.036, 0.01).translate(s * 0.095, 0, 0.034), SOLE, O);
    lp.add(footGeo(0.16, 0.236, 0.112, 0.04).translate(s * 0.095, 0.014, 0.034), BOOT, O);
  }
}

function arm(lp: LP, s: number) {
  // manica morbida che scende un po' in fuori e in avanti, più larga al polso
  const pts = [new THREE.Vector3(s * 0.18, 0.46, -0.005), new THREE.Vector3(s * 0.235, 0.39, 0.01), new THREE.Vector3(s * 0.268, 0.31, 0.03), new THREE.Vector3(s * 0.282, 0.27, 0.04)];
  lp.add(taperTube(pts, [0.07, 0.072, 0.074, 0.076], 12), JACKET, { ...O, ao: 0.06 });
  lp.blob(s * 0.18, 0.46, -0.005, 0.075, 0.072, 0.075, JACKET, { ...O, detail: 2 } as LPOpts); // spalla
  lp.push([s * 0.286, 0.262, 0.042], 0, 0.15, s * 0.32);
  lp.cyl(0, -0.02, 0, 0.078, 0.078, 0.04, 12, DARK, O); // polsino
  lp.pop();
  lp.blob(s * 0.296, 0.215, 0.05, 0.072, 0.072, 0.07, SKIN, { ...O, detail: 2 } as LPOpts); // manona
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
  lp.light(x, by, z, '#ffb24a', 0.8, 1.6, 0.1, 0.6);
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

/** Occhi grandi e lucidi (materiale a parte) con il riflesso a stella. */
function eyes(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: EYE, roughness: 0.18, metalness: 0.05, flatShading: true });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const s of [-1, 1]) {
    const { p, n } = headFront(s * EYE_X, EYE_Y);
    const e = new THREE.Group();
    e.position.copy(p.addScaledVector(n, 0.004));
    e.rotation.set(-Math.asin(n.y), Math.atan2(n.x, n.z), 0, 'YXZ');
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2).scale(0.042, 0.051, 0.018), mat);
    ball.castShadow = true;
    e.add(ball);
    const st = new THREE.Mesh(star(0.015, 0.42), shine); st.position.set(-0.003, 0.012, 0.017); e.add(st);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0046, 8), shine); dot.position.set(0.014, -0.019, 0.016); e.add(dot);
    g.add(e);
  }
  return g;
}

export interface CustodeV2 { root: THREE.Group; diorama: THREE.Group; lights: Array<{ pos: [number, number, number]; color: string }> }

export function buildCustodeV2(): CustodeV2 {
  const char = model((lp) => {
    // testa (con faccia, barba, baffi e capelli) più grande del 30%, scalata
    // attorno al mento: resta appoggiata sul colletto
    lp.push([0, HEAD_T.y, 0], 0, 0, 0, HEAD_S);
    head(lp); glitter(lp); beard(lp); braid(lp); moustache(lp); hair(lp);
    lp.pop();
    // la treccia pende davanti alla giacca (prima finiva dietro il nodo della sciarpa)
    body(lp); arm(lp, -1); arm(lp, 1);
    lantern(lp, -0.296);
  }, 'proto:custode-v2');
  const root = new THREE.Group();
  root.add(instantiate(char, { castShadow: true }));
  const eyeGroup = eyes();
  eyeGroup.scale.setScalar(HEAD_S);
  eyeGroup.position.copy(HEAD_T);
  root.add(eyeGroup);
  root.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  const d = model(diorama, 'proto:zolla');
  const dio = instantiate(d, { castShadow: true });
  dio.traverse((o) => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
  return { root, diorama: dio, lights: char.lights.map((l) => ({ pos: l.pos, color: l.color })) };
}
