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

// ── Testa: ellissoide (tonda, appena più larga che alta) ────────────────
// testa enorme (≈60% dell'altezza con i capelli), appena più alta che larga
const C = new THREE.Vector3(0, 0.79, 0);
const R = new THREE.Vector3(0.275, 0.29, 0.265);

/** Punto e normale della testa nella direzione (θ da +z verso +x, φ elevazione). */
function headAt(th: number, ph: number) {
  const d = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph));
  const t = 1 / Math.sqrt((d.x / R.x) ** 2 + (d.y / R.y) ** 2 + (d.z / R.z) ** 2);
  const p = C.clone().addScaledVector(d, t);
  const n = new THREE.Vector3((p.x - C.x) / R.x ** 2, (p.y - C.y) / R.y ** 2, (p.z - C.z) / R.z ** 2).normalize();
  return { p, n };
}
/** Punto della faccia davanti a (x, y). */
function headFront(x: number, y: number) {
  const k = 1 - (x / R.x) ** 2 - ((y - C.y) / R.y) ** 2;
  const p = new THREE.Vector3(x, y, C.z + R.z * Math.sqrt(Math.max(0, k)));
  const n = new THREE.Vector3(p.x / R.x ** 2, (p.y - C.y) / R.y ** 2, (p.z - C.z) / R.z ** 2).normalize();
  return { p, n };
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
function lock(lp: LP, o: { th0: number; th1: number; ph0: number; ph1: number; w: number; t?: number; lift?: number; bulge?: number; base?: number; col: string }) {
  const NS = 10, NW = 6;
  const center = (s: number) => {
    const { p, n } = headAt(lerp(o.th0, o.th1, s) * DEG, lerp(o.ph0, o.ph1, s) * DEG);
    const off = (o.base ?? 0.022) + (o.bulge ?? 0.04) * Math.sin(Math.PI * s) + (o.lift ?? 0.06) * s * s;
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
      inner[i].push(c.clone().addScaledVector(wa, u * width).addScaledVector(n, -thick * 0.3 * bow));
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
const hairTip = (th: number) => { const a = absDeg(th); return a < 90 ? lerp(24, 2, smooth(30, 90, a)) : lerp(2, -34, smooth(90, 160, a)); };
/** Bordo superiore della barba (φ in gradi): sotto la bocca davanti, sale lungo la mandibola fino all'orecchio. */
const beardTop = (thDeg: number) => lerp(-53, -16, smooth(0, 96, Math.abs(thDeg)));

function head(lp: LP) {
  lp.add(new THREE.IcosahedronGeometry(1, 3).scale(R.x, R.y, R.z).translate(C.x, C.y, C.z), SKIN, { ...O, ao: 0.05 });
  for (const s of [-1, 1]) lp.blob(s * (R.x - 0.004), 0.708, -0.012, 0.05, 0.064, 0.04, SKIN, { ...O, detail: 2 } as LPOpts); // orecchie grandi e tonde
  // bocca: sorrisetto un po' di lato, sotto i baffi
  onSkin(lp, headFront(0.03, 0.575), 0.002, 0.15, (q) => q.add(new THREE.TorusGeometry(0.024, 0.007, 3, 8, Math.PI).rotateZ(Math.PI), '#2a1a1c', O));
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
  // fascia lungo la mandibola, da un orecchio all'altro, più piena sotto il mento
  sheet(lp, 24, 7,
    (u, v) => [u * 100 * DEG, lerp(-82, beardTop(u * 100), v) * DEG],
    (u, v) => {
      const edge = smooth(0, 0.12, 1 - Math.abs(u)) * smooth(0, 0.16, v) * smooth(0, 0.22, 1 - v);
      const chin = (1 - Math.abs(u)) ** 2 * Math.exp(-(((v - 0.35) / 0.3) ** 2));
      return edge * (0.06 + 0.035 * chin);
    }, BEARD, { vary: 0.05 });
  // treccia: tre perle che scendono sul petto, fermaglio color panna e punta
  const { p, n } = headAt(0, -64 * DEG);
  const top = p.addScaledVector(n, 0.045);
  const end = new THREE.Vector3(0, 0.33, 0.235);
  [0.052, 0.048, 0.044].forEach((r, i) => {
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
  sheet(lp, 30, 8, (u, v) => { const th = Math.PI + u * Math.PI; return [th, lerp(hairTip(th) + 6, 89, v) * DEG]; }, () => 0.02, tone(-0.07));
  const back = (th: number) => smooth(80, 160, absDeg(th * DEG));
  const rows = [
    { n: 15, root: 50, tip: (th: number) => hairTip(th * DEG), base: 0.022, w: 0.15, t: 0.036 },
    { n: 12, root: 66, tip: (th: number) => lerp(40, 8, back(th)), base: 0.032, w: 0.16, t: 0.036 },
    { n: 9, root: 80, tip: (th: number) => lerp(56, 36, back(th)), base: 0.042, w: 0.17, t: 0.036 },
    { n: 6, root: 89, tip: () => 70, base: 0.05, w: 0.16, t: 0.034 },
  ];
  rows.forEach((row, r) => {
    for (let k = 0; k < row.n; k++) {
      const th0 = (k + (r % 2) * 0.5) * (360 / row.n) + (rnd() - 0.5) * 8;
      lock(lp, {
        th0, th1: th0 + 6 + (rnd() - 0.5) * 10, ph0: row.root, ph1: row.tip(th0) - rnd() * 5,
        w: row.w * (0.9 + rnd() * 0.2), t: row.t, base: row.base, lift: 0.02 + rnd() * 0.02, bulge: 0.012,
        col: tone([0.02, -0.02, 0.035, 0, -0.035][(k + r) % 5]),
      });
    }
  });
  // ciuffetti dritti in cima
  [[-20, 104], [10, 110], [35, 100], [190, 102]].forEach(([th, ph1], k) => {
    lock(lp, { th0: th, th1: th + 4, ph0: 82, ph1, w: 0.085, t: 0.032, base: 0.055, lift: 0.06 + k * 0.01, bulge: 0.01, col: tone(k % 2 ? 0.04 : 0.015) });
  });
}

function body(lp: LP) {
  // giacca morbida e paffuta con cappuccio, cintura scura, tasche
  lp.add(rbox(0.47, 0.31, 0.35, 0.12, 3).translate(0, 0.33, 0), JACKET, { ...O, ao: 0.14 });
  lp.add(rbox(0.48, 0.046, 0.36, 0.022, 1).translate(0, 0.2, 0), DARK, O);
  for (const s of [-1, 1]) lp.add(rbox(0.09, 0.014, 0.01, 0.004, 1).translate(s * 0.12, 0.262, 0.176), DARK, O);
  lp.blob(0, 0.47, -0.13, 0.19, 0.08, 0.1, '#536c30', { ...O, detail: 2 } as LPOpts); // cappuccio
  lp.add(new THREE.TorusGeometry(0.16, 0.046, 6, 16).rotateX(Math.PI / 2).translate(0, 0.47, 0), '#566f32', O); // colletto
  // sciarpa color panna a righe
  lp.add(new THREE.TorusGeometry(0.14, 0.045, 6, 16).rotateX(Math.PI / 2).translate(0, 0.485, 0.005), SCARF, O);
  lp.push([-0.085, 0.455, 0.19], 0, 0.1, 0.06);
  lp.add(rbox(0.085, 0.17, 0.028, 0.012, 1).translate(0, -0.085, 0), SCARF, O);
  for (const y of [-0.045, -0.09, -0.135]) lp.add(new THREE.BoxGeometry(0.087, 0.017, 0.006).translate(0, y, 0.015), SCARF_STRIPE, O);
  lp.pop();
  // gambe cortissime e stivaloni con suola spessa
  for (const s of [-1, 1]) {
    lp.cyl(s * 0.09, 0.075, 0, 0.072, 0.074, 0.12, 10, PANTS, { ...O, ao: 0.1 });
    lp.add(rbox(0.16, 0.095, 0.23, 0.045).translate(s * 0.09, 0.075, 0.03), BOOT, O);
    lp.add(rbox(0.17, 0.036, 0.24, 0.016, 1).translate(s * 0.09, 0.018, 0.035), SOLE, O);
  }
}

function arm(lp: LP, s: number) {
  lp.push([s * 0.235, 0.43, 0], 0, 0, s * 0.2);
  lp.blob(0, 0, 0, 0.078, 0.078, 0.078, JACKET, { ...O, detail: 2 } as LPOpts);
  lp.add(new THREE.CapsuleGeometry(0.068, 0.1, 4, 10).translate(0, -0.08, 0), JACKET, { ...O, ao: 0.08 });
  lp.cyl(0, -0.185, 0, 0.074, 0.074, 0.042, 10, DARK, O); // polsino
  lp.blob(0, -0.235, 0.008, 0.072, 0.07, 0.07, SKIN, { ...O, detail: 2 } as LPOpts); // manona
  lp.pop();
}

/** Lanterna appesa alla manona (al posto della borsa del concept). */
function lantern(lp: LP, x: number) {
  const y = 0.2, z = 0.01;
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
    lantern(lp, -0.28);
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
