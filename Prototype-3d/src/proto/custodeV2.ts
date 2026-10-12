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
const SKIN = '#f3dcc4';
const HAIR = '#d98238';
const BEARD = '#d4567c';
const EYE = '#1f4d2e';
const JACKET = '#5d7836';
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
const C = new THREE.Vector3(0, 0.745, 0);
const R = new THREE.Vector3(0.28, 0.258, 0.258);

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
function lock(lp: LP, o: { th0: number; th1: number; ph0: number; ph1: number; w: number; t?: number; lift?: number; bulge?: number; col: string }) {
  const NS = 10, NW = 6;
  const center = (s: number) => {
    const { p, n } = headAt(lerp(o.th0, o.th1, s) * DEG, lerp(o.ph0, o.ph1, s) * DEG);
    const off = 0.022 + (o.bulge ?? 0.04) * Math.sin(Math.PI * s) + (o.lift ?? 0.06) * s * s;
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

/** Linea dell'attaccatura dei capelli (φ in gradi) attorno alla testa. */
const hairline = (th: number) => lerp(30, -26, smooth(0.25 * Math.PI, 0.8 * Math.PI, Math.abs(Math.atan2(Math.sin(th), Math.cos(th)))));
/** Bordo superiore della barba (φ in gradi) in funzione di θ. */
const beardTop = (thDeg: number) => lerp(-31, -1, smooth(18, 86, Math.abs(thDeg)));

function head(lp: LP) {
  lp.add(new THREE.IcosahedronGeometry(1, 3).scale(R.x, R.y, R.z).translate(C.x, C.y, C.z), SKIN, { ...O, ao: 0.06 });
  for (const s of [-1, 1]) lp.blob(s * (R.x - 0.005), C.y - 0.035, 0, 0.05, 0.058, 0.035, SKIN, { ...O, detail: 1 } as LPOpts); // orecchie
  // bocca: sorrisetto un po' di lato, sotto i baffi
  onSkin(lp, headFront(0.035, 0.636), 0.002, 0.15, (q) => q.add(new THREE.TorusGeometry(0.022, 0.0065, 3, 8, Math.PI).rotateZ(Math.PI), '#2a1a1c', O));
}

/** Brillantini a stella sparsi sulla pelle (non su occhi, barba, baffi, capelli). */
function glitter(lp: LP) {
  const rnd = prng(5);
  let placed = 0;
  for (let tries = 0; placed < 40 && tries < 2000; tries++) {
    const thD = (rnd() * 2 - 1) * 100, phD = -24 + rnd() * 62;
    if (phD < beardTop(thD) + 5 || phD > hairline(thD * DEG) - 2) continue;
    const at = headAt(thD * DEG, phD * DEG);
    const { p } = at;
    if (p.z > 0.1 && Math.abs(Math.abs(p.x) - 0.092) < 0.078 && Math.abs(p.y - 0.727) < 0.09) continue; // occhi
    if (p.z > 0.1 && Math.abs(p.x) < 0.2 && p.y < 0.69) continue; // baffi
    onSkin(lp, at, 0.002, rnd() * Math.PI, (q) => q.add(star(0.011 + rnd() * 0.011), GLITTER[placed % GLITTER.length], { ...O, bucket: 'glow' }));
    placed++;
  }
}

function beard(lp: LP) {
  sheet(lp, 22, 8,
    (u, v) => [u * 104 * DEG, lerp(-76, beardTop(u * 104), v) * DEG],
    (u, v) => {
      const edge = smooth(0, 0.14, 1 - Math.abs(u)) * smooth(0, 0.18, v) * smooth(0, 0.2, 1 - v);
      const chin = (1 - Math.abs(u)) ** 2 * Math.exp(-(((v - 0.35) / 0.25) ** 2));
      return edge * (0.034 + 0.026 * chin);
    }, BEARD, { vary: 0.05 });
  // treccia: tre perle che scendono sul petto, fermaglio color panna e punta
  const { p, n } = headAt(0, -58 * DEG);
  const top = p.addScaledVector(n, 0.055);
  const end = new THREE.Vector3(0, 0.335, 0.205);
  [0.052, 0.047, 0.042].forEach((r, i) => {
    const q = top.clone().lerp(end, i / 2);
    lp.blob(q.x, q.y, q.z, r, r * 0.92, r * 0.9, i % 2 ? BEARD : '#c94b71', { ...O, detail: 2 } as LPOpts);
  });
  lp.cyl(end.x, end.y - 0.065, end.z, 0.024, 0.024, 0.032, 8, SCARF, O);
  lp.blob(end.x, end.y - 0.082, end.z, 0.018, 0.022, 0.018, BEARD, { ...O, detail: 1 } as LPOpts);
}

function moustache(lp: LP) {
  // dal centro sotto il naso verso l'esterno, poi un ricciolo all'insù accanto all'occhio
  const path: Array<[number, number, number]> = [
    [0.004, 0.668, 0.026], [0.045, 0.66, 0.024], [0.09, 0.652, 0.02], [0.135, 0.655, 0.015], [0.168, 0.674, 0.012],
    [0.18, 0.702, 0.0105], [0.166, 0.722, 0.0095], [0.146, 0.714, 0.0088], [0.149, 0.696, 0.008],
  ];
  for (const s of [-1, 1]) {
    const pts = path.map(([x, y, r]) => { const at = headFront(s * x, y); return at.p.addScaledVector(at.n, r * 0.85); });
    lp.add(taperTube(pts, path.map(([, , r]) => r)), BEARD, { ...O, vary: 0.03 });
  }
}

function hair(lp: LP) {
  const rnd = prng(31);
  const tone = (k: number) => `#${new THREE.Color(HAIR).offsetHSL(0, 0, k).getHexString()}`;
  // calotta sotto le ciocche (più scura): niente pelle tra una ciocca e l'altra
  sheet(lp, 30, 8, (u, v) => { const th = Math.PI + u * Math.PI; return [th, lerp(hairline(th), 89, v) * DEG]; }, () => 0.018, tone(-0.06));
  // strato interno sulla nuca (riempie tra le ciocche esterne)
  for (let k = 0; k < 9; k++) {
    const th0 = 116 + k * 16;
    lock(lp, { th0, th1: th0 + (rnd() - 0.5) * 8, ph0: 64, ph1: -16 - rnd() * 6, w: 0.17, t: 0.04, lift: 0.04, col: tone(-0.06) });
  }
  // ciocche esterne della nuca: grosse, a punta, che si aprono verso il basso
  for (let k = 0; k < 10; k++) {
    const th0 = 106 + k * (148 / 9);
    lock(lp, { th0, th1: th0 + (k % 2 ? 9 : -9), ph0: 76, ph1: -22 - rnd() * 12, w: 0.2, lift: 0.1 + rnd() * 0.04, bulge: 0.05, col: tone([0, 0.045, -0.035][k % 3]) });
  }
  // lati, sopra le orecchie
  for (const s of [-1, 1]) [[58, 22], [78, 14], [96, 2]].forEach(([th, ph1], k) => {
    lock(lp, { th0: s * th, th1: s * (th + 10), ph0: 74, ph1: ph1 - rnd() * 5, w: 0.17, lift: 0.06, col: tone([0.02, -0.02, 0.01][k]) });
  });
  // frangia spettinata a ciocche grosse, appena portata di lato
  for (let k = 0; k < 5; k++) {
    const th0 = -46 + k * 23;
    lock(lp, { th0, th1: th0 + 14, ph0: 84, ph1: 20 + rnd() * 10, w: 0.21, t: 0.045, lift: 0.06, bulge: 0.045, col: tone([0.04, -0.01, 0.025, -0.03, 0.02][k]) });
  }
  // ciuffi ribelli in cima
  [[-14, 106, 0.12], [14, 114, 0.14], [168, 98, 0.1]].forEach(([th, ph1, lift], k) => {
    lock(lp, { th0: th, th1: th + 6, ph0: 74, ph1, w: 0.13, t: 0.04, lift, bulge: 0.03, col: tone(k % 2 ? 0.04 : 0.01) });
  });
}

function body(lp: LP) {
  // giacca morbida con cappuccio, cintura scura, tasche
  lp.add(rbox(0.41, 0.28, 0.31, 0.085).translate(0, 0.335, 0), JACKET, { ...O, ao: 0.12 });
  lp.add(rbox(0.42, 0.048, 0.32, 0.022, 1).translate(0, 0.215, 0), DARK, O);
  for (const s of [-1, 1]) lp.add(rbox(0.085, 0.014, 0.01, 0.004, 1).translate(s * 0.115, 0.27, 0.157), DARK, O);
  lp.blob(0, 0.475, -0.12, 0.17, 0.07, 0.085, '#536c30', { ...O, detail: 2 } as LPOpts); // cappuccio
  lp.add(new THREE.TorusGeometry(0.145, 0.04, 6, 14).rotateX(Math.PI / 2).translate(0, 0.468, 0), '#566f32', O); // colletto
  // sciarpa color panna a righe
  lp.add(new THREE.TorusGeometry(0.128, 0.042, 6, 14).rotateX(Math.PI / 2).translate(0, 0.49, 0.005), SCARF, O);
  lp.push([-0.075, 0.46, 0.17], 0, 0.08, 0.06);
  lp.add(rbox(0.078, 0.16, 0.026, 0.01, 1).translate(0, -0.08, 0), SCARF, O);
  for (const y of [-0.04, -0.085, -0.13]) lp.add(new THREE.BoxGeometry(0.08, 0.016, 0.006).translate(0, y, 0.014), SCARF_STRIPE, O);
  lp.pop();
  // gambe corte e stivali con suola scura
  for (const s of [-1, 1]) {
    lp.cyl(s * 0.082, 0.07, 0, 0.064, 0.066, 0.15, 10, PANTS, { ...O, ao: 0.1 });
    lp.add(rbox(0.135, 0.09, 0.2, 0.038).translate(s * 0.082, 0.065, 0.028), BOOT, O);
    lp.add(rbox(0.142, 0.032, 0.21, 0.014, 1).translate(s * 0.082, 0.016, 0.03), SOLE, O);
  }
}

function arm(lp: LP, s: number) {
  lp.push([s * 0.205, 0.43, 0], 0, 0, s * 0.24);
  lp.blob(0, 0, 0, 0.068, 0.068, 0.068, JACKET, { ...O, detail: 2 } as LPOpts);
  lp.add(new THREE.CapsuleGeometry(0.06, 0.11, 4, 10).translate(0, -0.085, 0), JACKET, { ...O, ao: 0.08 });
  lp.cyl(0, -0.19, 0, 0.066, 0.066, 0.04, 10, DARK, O); // polsino
  lp.blob(0, -0.235, 0.005, 0.062, 0.062, 0.062, SKIN, { ...O, detail: 2 } as LPOpts); // manina
  lp.pop();
}

/** Lanterna appesa alla manina (al posto della borsa del concept). */
function lantern(lp: LP, x: number) {
  const y = 0.215, z = 0.01;
  lp.add(new THREE.TorusGeometry(0.036, 0.008, 4, 12, Math.PI).translate(x, y - 0.035, z), DARK, O); // manico ad arco
  const by = y - 0.125; // centro del vetro
  lp.add(new THREE.ConeGeometry(0.075, 0.05, 4).rotateY(Math.PI / 4).translate(x, by + 0.09, z), DARK, O); // tettuccio
  lp.add(rbox(0.11, 0.022, 0.11, 0.006, 1).translate(x, by + 0.062, z), DARK, O);
  lp.add(rbox(0.118, 0.026, 0.118, 0.007, 1).translate(x, by - 0.062, z), DARK, O);
  lp.add(new THREE.CylinderGeometry(0.03, 0.04, 0.02, 4).rotateY(Math.PI / 4).translate(x, by - 0.083, z), DARK, O); // piedino
  // telaio: montanti agli spigoli e una croce su ogni faccia
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.add(new THREE.BoxGeometry(0.016, 0.11, 0.016).translate(x + dx * 0.046, by, z + dz * 0.046), DARK, O);
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    lp.push([x, by, z], a);
    lp.add(new THREE.BoxGeometry(0.008, 0.1, 0.006).translate(0, 0, 0.047), DARK, O);
    lp.add(new THREE.BoxGeometry(0.09, 0.008, 0.006).translate(0, 0.005, 0.047), DARK, O);
    lp.pop();
  }
  lp.add(new THREE.BoxGeometry(0.084, 0.1, 0.084).translate(x, by, z), '#ffb24a', { ...O, bucket: 'glow' }); // vetro acceso
  lp.blob(x, by - 0.01, z, 0.016, 0.024, 0.016, '#fff1c4', { ...O, bucket: 'glow' }); // fiammella
  lp.light(x, by, z, '#ffb24a', 0.8, 1.6, 0.1, 0.6);
}

/** Zolla del concept: terra spessa, prato, funghi a pois, fiorellini, sasso. */
function diorama(lp: LP) {
  const r = lp.rng;
  lp.cyl(0, -0.15, 0, 0.66, 0.62, 0.13, 14, '#6a4528', { jitter: 0.012, vary: 0.08, ao: 0.25 });
  lp.cyl(0, -0.03, 0, 0.675, 0.67, 0.035, 14, '#5f8a3a', { jitter: 0.008, vary: 0.08, ao: 0 });
  const ring = (a: number, d0: number, d1: number): [number, number] => { const d = r.range(d0, d1); return [Math.cos(a) * d, Math.sin(a) * d]; };
  for (let i = 0; i < 14; i++) { const [x, z] = ring((i / 14) * Math.PI * 2 + r.range(-0.2, 0.2), 0.3, 0.6); grassTuft(lp, x, z, 0.65 + r.next() * 0.35, ['#5f8a3a', '#6f9a44', '#4f7a33', '#7aa64a']); }
  mushroom(lp, -0.42, 0.18, 0.13, '#c9332e', false, 0.075);
  mushroom(lp, 0.43, 0.12, 0.11, '#c9332e', false, 0.065);
  mushroom(lp, -0.22, 0.42, 0.06, '#a77bc4', false, 0.035);
  for (const [x, z] of [[0.3, 0.38], [0.36, 0.28], [-0.5, -0.05]]) flower(lp, x, z, '#ec9fbf', 0.06 + r.next() * 0.04);
  lp.blob(0.2, 0.02, -0.4, 0.09, 0.05, 0.07, '#8d8f8c', { jitter: 0.01, vary: 0.1, ao: 0 });
  lp.blob(-0.05, 0.005, 0.5, 0.07, 0.03, 0.05, '#9a9c98', { jitter: 0.01, vary: 0.1, ao: 0 });
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
    const { p, n } = headFront(s * 0.092, 0.727);
    const e = new THREE.Group();
    e.position.copy(p.addScaledVector(n, 0.004));
    e.rotation.set(-Math.asin(n.y), Math.atan2(n.x, n.z), 0, 'YXZ');
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2).scale(0.052, 0.064, 0.022), mat);
    ball.castShadow = true;
    e.add(ball);
    const st = new THREE.Mesh(star(0.017, 0.42), shine); st.position.set(-0.013, 0.018, 0.021); e.add(st);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0065, 8), shine); dot.position.set(0.016, -0.022, 0.02); e.add(dot);
    g.add(e);
  }
  return g;
}

export interface CustodeV2 { root: THREE.Group; diorama: THREE.Group; lights: Array<{ pos: [number, number, number]; color: string }> }

export function buildCustodeV2(): CustodeV2 {
  const char = model((lp) => {
    head(lp); glitter(lp); beard(lp); moustache(lp); hair(lp); body(lp); arm(lp, -1); arm(lp, 1);
    lantern(lp, -0.265);
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
