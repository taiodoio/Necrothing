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

// ── Testa ───────────────────────────────────────────────────────────────
// Non una sfera: un "superellissoide" (più pieno di una sfera, con la faccia
// più piatta davanti) che si allarga un po' in basso sulle guance, come nel
// concept. Superficie implicita F = 1; punti e normali si trovano per bisezione.
// meno alta di prima (meno fronte): il mento resta dov'era, la sommità scende
const C = new THREE.Vector3(0, 0.77, 0);
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
 * Ciocca di capelli: lente chiusa (sopra bombata, sotto quasi piatta) che
 * segue la testa dalla radice alla punta, si allarga e poi si stringe a punta,
 * e si stacca dalla testa verso la punta (volume che esce dalla sagoma).
 */
function lock(lp: LP, o: { th0: number; th1: number; ph0: number; ph1: number; w: number; t?: number; lift?: number; bulge?: number; base?: number; surface?: (thDeg: number, phDeg: number) => number; col: string }) {
  const NS = 10, NW = 6;
  const center = (s: number) => {
    const { p, n } = headAt(lerp(o.th0, o.th1, s) * DEG, lerp(o.ph0, o.ph1, s) * DEG);
    const base = o.surface ? o.surface(lerp(o.th0, o.th1, s), lerp(o.ph0, o.ph1, s)) : (o.base ?? 0.022);
    const off = base + (o.bulge ?? 0.04) * Math.sin(Math.PI * s) + (o.lift ?? 0.06) * s * s;
    return { c: p.addScaledVector(n, off), n };
  };
  const outer: THREE.Vector3[][] = [], inner: THREE.Vector3[][] = [];
  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const { c, n } = center(s);
    const tan = center(Math.min(1, s + 0.02)).c.sub(center(Math.max(0, s - 0.02)).c);
    const wa = new THREE.Vector3().crossVectors(n, tan).normalize();
    const width = o.w * Math.pow(1 - s, 1.15) * (0.6 + 0.4 * Math.sin(Math.min(1, s / 0.35) * Math.PI / 2)) * 1.12;
    const thick = (o.t ?? 0.05) * Math.pow(1 - s, 0.5);
    outer.push([]); inner.push([]);
    for (let k = 0; k <= NW; k++) {
      const u = -1 + (2 * k) / NW, bow = Math.pow(1 - u * u, 0.6);
      outer[i].push(c.clone().addScaledVector(wa, u * width).addScaledVector(n, thick * bow));
      inner[i].push(c.clone().addScaledVector(wa, u * width).addScaledVector(n, -thick * 0.45 * bow)); // la pancia della ciocca affonda nella calotta
    }
  }
  const t = new Tris();
  for (let i = 0; i < NS; i++) for (let k = 0; k < NW; k++) {
    const n = center(i / NS).n;
    t.quad(outer[i][k], outer[i + 1][k], outer[i + 1][k + 1], outer[i][k + 1], n);
    t.quad(inner[i][k], inner[i + 1][k], inner[i + 1][k + 1], inner[i][k + 1], n.clone().negate());
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

const EYE_Y = 0.682, EYE_X = 0.1;
const absDeg = (th: number) => Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) / DEG; // 0 davanti, 180 dietro
/** Dove arrivano le punte dei capelli (φ in gradi): poco sopra gli occhi davanti, sopra le orecchie ai lati, alla nuca dietro. */
const hairTip = (th: number) => { const a = absDeg(th); return a < 90 ? lerp(20, 0, smooth(30, 90, a)) : lerp(2, -34, smooth(90, 160, a)); };
/** Bordo superiore della barba (φ in gradi): sotto la bocca davanti, sale lungo la mandibola fino all'orecchio. */
const beardTop = (thDeg: number) => lerp(-60, -18, smooth(0, 96, Math.abs(thDeg)));

function head(lp: LP) {
  lp.add(headGeo(), SKIN, { ...O, ao: 0.05 });
  for (const s of [-1, 1]) lp.blob(s * (R.x - 0.004), 0.695, -0.012, 0.05, 0.064, 0.04, SKIN, { ...O, detail: 2 } as LPOpts); // orecchie grandi e tonde
  // bocca: sorrisetto un po' di lato, sotto i baffi
  onSkin(lp, headFront(0.03, 0.58), 0.002, 0.15, (q) => q.add(new THREE.TorusGeometry(0.028, 0.008, 3, 8, Math.PI).rotateZ(Math.PI), '#2a1a1c', O));
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
    if (p.z > 0.08 && Math.abs(p.x) < 0.23 && p.y > 0.56 && p.y < 0.67) continue; // baffi e bocca
    onSkin(lp, at, 0.002, rnd() * Math.PI, (q) => q.add(star(0.013 + rnd() * 0.011), GLITTER[placed % 3 === 0 ? 1 + (placed % 4) : 0], { ...O, bucket: 'glow' }));
    placed++;
  }
}

function beard(lp: LP) {
  // fascia lungo la mandibola, da un orecchio all'altro: bordo inferiore pieno
  // (fa un'ombra netta sul colletto, non si fonde con la giacca), bordo
  // superiore che sfuma sulla guancia; più piena sotto il mento
  sheet(lp, 26, 8,
    (u, v) => [u * 100 * DEG, lerp(-74, beardTop(u * 100), v) * DEG],
    (u, v) => {
      const edge = smooth(0, 0.12, 1 - Math.abs(u)) * (0.55 + 0.45 * smooth(0, 0.25, v)) * smooth(0, 0.3, 1 - v);
      const chin = (1 - Math.abs(u)) ** 2 * Math.exp(-(((v - 0.3) / 0.3) ** 2));
      return edge * (0.05 + 0.03 * chin);
    }, BEARD, { vary: 0.05 });
  // chiusura sotto il mento: un "ricciolo" più scuro che fa da bordo
  sheet(lp, 26, 2,
    (u, v) => [u * 92 * DEG, lerp(-80, -73, v) * DEG],
    (u) => 0.03 * smooth(0, 0.15, 1 - Math.abs(u)), '#b84368', { vary: 0.04 });
  // treccia: tre perle che scendono sul petto, fermaglio color panna e punta
  const { p, n } = headAt(0, -70 * DEG);
  const top = p.addScaledVector(n, 0.04);
  const end = new THREE.Vector3(0, 0.33, 0.245);
  [0.05, 0.047, 0.043].forEach((r, i) => {
    const q = top.clone().lerp(end, i / 2);
    lp.blob(q.x, q.y, q.z, r, r * 0.92, r * 0.9, i % 2 ? BEARD : '#c94b71', { ...O, detail: 2 } as LPOpts);
  });
  lp.cyl(end.x, end.y - 0.07, end.z, 0.026, 0.026, 0.034, 8, SCARF, O);
  lp.blob(end.x, end.y - 0.088, end.z, 0.019, 0.024, 0.019, BEARD, { ...O, detail: 1 } as LPOpts);
}

function moustache(lp: LP) {
  // grosso manubrio: dal centro sotto il naso fin oltre gli occhi, poi un ricciolo all'insù
  const path: Array<[number, number, number]> = [
    [0.004, 0.626, 0.022], [0.06, 0.617, 0.02], [0.12, 0.612, 0.016], [0.168, 0.622, 0.013], [0.196, 0.646, 0.011],
    [0.2, 0.674, 0.0095], [0.182, 0.689, 0.0088], [0.165, 0.677, 0.008], [0.172, 0.660, 0.0075],
  ];
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
function hair(lp: LP) {
  const rnd = prng(31);
  const tone = (k: number) => `#${new THREE.Color(HAIR).offsetHSL(0, 0, k).getHexString()}`;
  // la calotta è il volume vero dei capelli (sottile al bordo, piena in cima):
  // le ciocche ci si appoggiano sopra, così non sembrano staccate dalla testa
  const capT = (th: number, phD: number) => 0.012 + 0.05 * smooth(hairTip(th), 80, phD);
  sheet(lp, 36, 10, (u, v) => { const th = Math.PI + u * Math.PI; return [th, lerp(hairTip(th) + 3, 89.5, v) * DEG]; }, (u, v) => {
    const th = Math.PI + u * Math.PI;
    return capT(th, lerp(hairTip(th) + 3, 89.5, v));
  }, tone(-0.11)); // più scura: tra una ciocca e l'altra si legge il solco
  const back = (th: number) => smooth(80, 160, absDeg(th * DEG));
  // file di ciocche a scaglie: ogni fila copre la radice di quella sotto
  const rows = [
    { n: 16, root: 46, tip: (th: number) => hairTip(th * DEG) - 2, w: 0.15 },
    { n: 13, root: 62, tip: (th: number) => lerp(36, 6, back(th)), w: 0.16 },
    { n: 10, root: 76, tip: (th: number) => lerp(54, 32, back(th)), w: 0.16 },
    { n: 6, root: 88, tip: () => 68, w: 0.15 },
  ];
  rows.forEach((row, r) => {
    for (let k = 0; k < row.n; k++) {
      const th0 = (k + (r % 2) * 0.5) * (360 / row.n) + (rnd() - 0.5) * 8;
      lock(lp, {
        th0, th1: th0 + (r % 2 ? 9 : -4) + (rnd() - 0.5) * 14, ph0: row.root + (rnd() - 0.5) * 6, ph1: row.tip(th0) - rnd() * 9,
        w: row.w * (0.8 + rnd() * 0.45), t: 0.058 + rnd() * 0.012, surface: (th: number, ph: number) => capT(th * DEG, ph) * 0.78, bulge: 0.018, lift: 0.01 + rnd() * 0.022,
        col: tone([0.03, -0.02, 0.05, 0.01, -0.035][(k + r) % 5]),
      });
    }
  });
  // ciuffetti dritti in cima, radicati nella calotta
  [[-20, 104], [10, 110], [35, 100], [190, 102]].forEach(([th, ph1], k) => {
    lock(lp, { th0: th, th1: th + 4, ph0: 84, ph1, w: 0.085, t: 0.03, base: 0.05, lift: 0.05 + k * 0.01, bulge: 0.008, col: tone(k % 2 ? 0.045 : 0.02) });
  });
}

const JACKET_D = '#4c652a';

function body(lp: LP) {
  // giacca morbida a "pera": spalle strette, si allarga verso il fondo, sezione ovale
  lp.push([0, 0.19, 0], 0, 0, 0, [1, 1, 0.82]);
  lp.lathe(0, 0, 0, [[0, 0], [0.214, 0], [0.236, 0.022], [0.243, 0.07], [0.236, 0.15], [0.214, 0.225], [0.178, 0.28], [0.13, 0.305], [0, 0.312]], 16, JACKET, { ...O, ao: 0.16 });
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
  lp.push([0, 0.488, -0.01], 0, 0.12, 0, [1, 1, 0.86]);
  lp.add(new THREE.TorusGeometry(0.15, 0.048, 8, 18).rotateX(Math.PI / 2), JACKET_D, O);
  lp.pop();
  // collo in ombra sotto il mento (stacca la barba dalla giacca)
  lp.blob(0, 0.51, 0, 0.11, 0.035, 0.1, '#7a5040', { ...O, detail: 1 } as LPOpts);
  // sciarpa color panna a righe: giro sul collo e un capo che scende di traverso
  lp.push([0, 0.505, 0.005], 0, 0.12, 0, [1, 1, 0.9]);
  lp.add(new THREE.TorusGeometry(0.13, 0.032, 6, 18).rotateX(Math.PI / 2), SCARF, O);
  lp.pop();
  // nodo sotto la barba, poi il capo che scende sul petto
  lp.blob(-0.07, 0.48, 0.17, 0.05, 0.04, 0.035, SCARF, { ...O, detail: 1 } as LPOpts);
  lp.push([-0.085, 0.475, 0.205], 0, 0.22, 0.14);
  lp.add(rbox(0.086, 0.17, 0.024, 0.01, 1).translate(0, -0.08, 0), SCARF, O);
  for (const y of [-0.04, -0.085, -0.13]) lp.add(new THREE.BoxGeometry(0.084, 0.016, 0.005).translate(0, y, 0.013), SCARF_STRIPE, O);
  lp.pop();
  // gambe corte e un po' larghe, stivaloni tondi con suola spessa
  for (const s of [-1, 1]) {
    lp.cyl(s * 0.095, 0.07, 0, 0.082, 0.076, 0.13, 12, PANTS, { ...O, ao: 0.12 });
    lp.add(rbox(0.165, 0.1, 0.235, 0.048, 3).translate(s * 0.095, 0.072, 0.03), BOOT, O);
    lp.add(rbox(0.175, 0.034, 0.245, 0.016, 2).translate(s * 0.095, 0.017, 0.034), SOLE, O);
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
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2).scale(0.054, 0.068, 0.022), mat);
    ball.castShadow = true;
    e.add(ball);
    const st = new THREE.Mesh(star(0.02, 0.42), shine); st.position.set(-0.004, 0.016, 0.021); e.add(st);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.006, 8), shine); dot.position.set(0.018, -0.024, 0.02); e.add(dot);
    g.add(e);
  }
  return g;
}

export interface CustodeV2 { root: THREE.Group; diorama: THREE.Group; lights: Array<{ pos: [number, number, number]; color: string }> }

export function buildCustodeV2(): CustodeV2 {
  const char = model((lp) => {
    head(lp); glitter(lp); beard(lp); moustache(lp); hair(lp); body(lp); arm(lp, -1); arm(lp, 1);
    lantern(lp, -0.296);
  }, 'proto:custode-v2');
  const root = new THREE.Group();
  root.add(instantiate(char, { castShadow: true }));
  root.add(eyes());
  root.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  const d = model(diorama, 'proto:zolla');
  const dio = instantiate(d, { castShadow: true });
  dio.traverse((o) => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
  return { root, diorama: dio, lights: char.lights.map((l) => ({ pos: l.pos, color: l.color })) };
}
