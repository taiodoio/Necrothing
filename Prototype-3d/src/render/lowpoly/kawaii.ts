// Personaggi "kawaii" dello stile low-poly: proporzioni
// stile vinile/funko — testa grande e squadrata con spigoli morbidi, corpo
// piccolo, arti corti e tozzi che partono DENTRO il busto (spalle e anche
// sferiche), così nelle animazioni non si staccano mai. Faccia espressiva:
// occhi grandi con riflesso, guance rosa, bocca piccola.
// Stesse parti e stesse animazioni del rig (view/characters.ts): cambiano la
// geometria e i perni, dichiarati qui per ogni tipo in unità mondo.

import * as THREE from 'three';
import { LP, type LPModel, type LPOpts } from './kit.ts';
import { LPC } from './palette.ts';
import { DEFAULT_LOOK, type CustodeLook, type HairStyle, type HatStyle } from '../../game/look.ts';

export type KPart = 'body' | 'head' | 'armL' | 'armR' | 'legL' | 'legR';
type Build = (lp: LP) => void;

export interface KawaiiSpec {
  /** Perni delle parti (unità mondo, personaggio in scala 1). */
  pivots: Partial<Record<KPart, [number, number, number]>>;
  parts: Partial<Record<KPart, Build>>;
  /** Scala consigliata nel mondo (altezza ≈ 1,3 celle per gli umanoidi). */
  scale: number;
  hover?: number;
  ghost?: boolean;
  quadruped?: boolean;
  flier?: boolean;
}

// ── Primitive morbide ───────────────────────────────────────────────────

/** Box con spigoli arrotondati (2 segmenti di smusso: morbido ma low-poly). */
function softBoxGeo(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  const b = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
  const iw = w - 2 * b, ih = h - 2 * b;
  const rc = Math.max(0.001, Math.min(b * 0.9, iw / 2 - 0.001, ih / 2 - 0.001));
  const s = new THREE.Shape();
  const x0 = -iw / 2, x1 = iw / 2, y0 = -ih / 2, y1 = ih / 2;
  s.moveTo(x0 + rc, y0); s.lineTo(x1 - rc, y0); s.absarc(x1 - rc, y0 + rc, rc, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - rc); s.absarc(x1 - rc, y1 - rc, rc, 0, Math.PI / 2, false);
  s.lineTo(x0 + rc, y1); s.absarc(x0 + rc, y1 - rc, rc, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + rc); s.absarc(x0 + rc, y0 + rc, rc, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 3 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
}

/**
 * Lastra con gli angoli arrotondati visti dall'alto (raggio rc indipendente
 * dall'altezza) e bordi appena smussati: capelli sotto cappelli tondi.
 */
function roundSlabGeo(w: number, d: number, h: number, rc: number): THREE.BufferGeometry {
  const bv = Math.min(0.015, h / 3);
  const iw = w - 2 * bv, id = d - 2 * bv, r = Math.min(rc, iw / 2 - 0.001, id / 2 - 0.001);
  const s = new THREE.Shape();
  const x0 = -iw / 2, x1 = iw / 2, y0 = -id / 2, y1 = id / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r); s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * bv), bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 1, curveSegments: 3 });
  return g.rotateX(-Math.PI / 2).translate(0, bv, 0);
}

function sbox(lp: LP, cx: number, y0: number, cz: number, w: number, h: number, d: number, r: number, color: string, o: Parameters<LP['add']>[2] = {}) {
  lp.add(softBoxGeo(w, h, d, r).translate(cx, y0 + h / 2, cz), color, { jitter: 0, vary: 0.04, ao: 0.08, ...o });
}

function ball(lp: LP, x: number, y: number, z: number, rx: number, ry: number, rz: number, color: string, o: LPOpts & { detail?: number } = {}) {
  lp.blob(x, y, z, rx, ry, rz, color, { detail: 1, jitter: 0, vary: 0.04, ao: 0, ...o });
}

const INK = '#1b1a20';
const BLUSH = '#e5958f';
const WHITE = '#fbf7ef';

interface FaceOpts {
  z: number; y: number; dx?: number; r?: number; ink?: string;
  /** Colore degli occhi (iride); default inchiostro. */
  eye?: string;
  /** Curvatura della superficie (1/2R): sposta occhi e guance indietro ai lati, così restano appoggiati. */
  curve?: number;
  mouth?: 'smile' | 'o' | 'flat' | 'none' | 'grin';
  eyes?: 'open' | 'closed' | 'sleepy' | 'none';
  blush?: boolean | string; bucket?: 'ghost';
}

/** Faccia kawaii sulla superficie z = o.z. */
function face(lp: LP, o: FaceOpts) {
  const dx = o.dx ?? 0.11, r = o.r ?? 0.05, ink = o.ink ?? INK, bucket = o.bucket;
  const eyes = o.eyes ?? 'open';
  const zAt = (x: number) => o.z - (o.curve ?? 0) * x * x;
  for (const s of [-1, 1]) {
    if (eyes === 'open') {
      const ez = zAt(dx);
      ball(lp, s * dx, o.y, ez, r * 0.85, r * 1.1, 0.02, o.eye ?? ink, { bucket });
      ball(lp, s * dx - r * 0.3, o.y + r * 0.42, ez + 0.016, r * 0.32, r * 0.32, 0.01, WHITE);
      ball(lp, s * dx + r * 0.3, o.y - r * 0.4, ez + 0.014, r * 0.15, r * 0.15, 0.008, WHITE);
    } else if (eyes === 'closed' || eyes === 'sleepy') {
      // archetto (occhi chiusi felici / assonnati)
      const arc = new THREE.TorusGeometry(r * 0.75, 0.009, 3, 7, Math.PI);
      if (eyes === 'sleepy') arc.rotateZ(Math.PI);
      lp.add(arc.translate(s * dx, o.y - (eyes === 'sleepy' ? -0.01 : 0.02), o.z + 0.004), ink, { jitter: 0, ao: 0, bucket });
    }
  }
  // guance appoggiate sulla faccia: più vicine al centro (la parte piatta) e affondate di poco
  if (o.blush !== false) for (const s of [-1, 1]) {
    const bx = dx + 0.03;
    ball(lp, s * bx, o.y - 0.075, zAt(bx) - 0.007, 0.038, 0.02, 0.014, typeof o.blush === 'string' ? o.blush : BLUSH, { bucket });
  }
  const my = o.y - 0.085;
  switch (o.mouth ?? 'smile') {
    case 'smile': lp.add(new THREE.TorusGeometry(0.024, 0.008, 3, 7, Math.PI).rotateZ(Math.PI).translate(0, my + 0.012, o.z + 0.004), ink, { jitter: 0, ao: 0, bucket }); break;
    case 'grin': lp.add(new THREE.TorusGeometry(0.035, 0.01, 3, 8, Math.PI).rotateZ(Math.PI).translate(0, my + 0.016, o.z + 0.004), ink, { jitter: 0, ao: 0, bucket }); break;
    case 'o': ball(lp, 0, my, o.z, 0.022, 0.028, 0.012, ink, { bucket }); break;
    case 'flat': lp.box(0, my, o.z, 0.05, 0.012, 0.01, ink, { jitter: 0, ao: 0, bucket }); break;
    default: break;
  }
}

// ── Umanoide kawaii ─────────────────────────────────────────────────────

const HIP = 0.2, SHOULDER = 0.5, NECK = 0.56, ARM_X = 0.215, LEG_X = 0.085;
const HEAD_W = 0.56, HEAD_H = 0.48, HEAD_D = 0.48;

// ── Superficie della testa ──────────────────────────────────────────────
// La testa (softBoxGeo) è un prisma dal profilo frontale arrotondato
// (0,3 × 0,22, raggio 0,109) allargato di 0,13 in ogni direzione. Con la sua
// distanza con segno si appoggiano barba, catenelle, cerotti e brillantini
// esattamente sul volto invece che su un piano davanti.

const HEAD_CY = -0.02 + HEAD_H / 2;
const HEAD_BEVEL = 0.13;

function headSdf(x: number, y: number, z: number): number {
  const rc = 0.109;
  const qx = Math.abs(x) - (0.15 - rc), qy = Math.abs(y - HEAD_CY) - (0.11 - rc);
  const d2 = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
  const wz = Math.abs(z) - (HEAD_D / 2 - HEAD_BEVEL);
  return Math.hypot(Math.max(d2, 0), Math.max(wz, 0)) + Math.min(Math.max(d2, wz), 0) - HEAD_BEVEL;
}

function headNormal(p: THREE.Vector3): THREE.Vector3 {
  const e = 1e-3;
  return new THREE.Vector3(
    headSdf(p.x + e, p.y, p.z) - headSdf(p.x - e, p.y, p.z),
    headSdf(p.x, p.y + e, p.z) - headSdf(p.x, p.y - e, p.z),
    headSdf(p.x, p.y, p.z + e) - headSdf(p.x, p.y, p.z - e),
  ).normalize();
}

/** Punto della testa nella direzione (θ attorno a y da +z, φ in alto), con la normale. */
function headAt(theta: number, phi: number): { p: THREE.Vector3; n: THREE.Vector3 } {
  const dir = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.sin(phi), Math.cos(theta) * Math.cos(phi));
  let lo = 0, hi = 0.6;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (headSdf(dir.x * m, HEAD_CY + dir.y * m, dir.z * m) < 0) lo = m; else hi = m;
  }
  const p = new THREE.Vector3(dir.x * lo, HEAD_CY + dir.y * lo, dir.z * lo);
  return { p, n: headNormal(p) };
}

/** Elevazione φ alla quale, nella direzione θ, la superficie della testa è all'altezza y. */
function phiForY(theta: number, y: number): number {
  let lo = -80 * DEG, hi = 88 * DEG;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (headAt(theta, m).p.y < y) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Punto della faccia davanti a (x, y), con la normale. */
function headFront(x: number, y: number): { p: THREE.Vector3; n: THREE.Vector3 } {
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (headSdf(x, y, m) < 0) lo = m; else hi = m; }
  const p = new THREE.Vector3(x, y, lo);
  return { p, n: headNormal(p) };
}

/** Disegna un dettaglio piatto (sul piano xy, verso +z) adagiato sulla pelle. */
function onSkin(lp: LP, at: { p: THREE.Vector3; n: THREE.Vector3 }, lift: number, rz: number, build: Build) {
  const { p, n } = at;
  lp.push([p.x + n.x * lift, p.y + n.y * lift, p.z + n.z * lift], Math.atan2(n.x, n.z), -Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)), rz);
  build(lp);
  lp.pop();
}

/**
 * Velo che aderisce alla testa: griglia (u ∈ −1..1 attorno al viso, v ∈ 0..1
 * dal basso in alto) proiettata sulla superficie e sollevata di `thick(u, v)`
 * lungo la normale. Lo spessore va a zero sui bordi, così il velo si fonde
 * con la pelle (barbe che seguono mento, mandibola e basette).
 */
function headSheet(lp: LP, nu: number, nv: number, at: (u: number, v: number) => [number, number], thick: (u: number, v: number) => number, color: string, o: LPOpts = {}) {
  const pos: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = -1 + (2 * i) / nu, v = j / nv;
    const { p, n } = headAt(...at(u, v));
    const t = 0.003 + thick(u, v);
    pos.push(p.x + n.x * t, p.y + n.y * t, p.z + n.z * t);
  }
  const idx: number[] = [];
  const k = (i: number, j: number) => j * (nu + 1) + i;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) idx.push(k(i, j), k(i + 1, j), k(i + 1, j + 1), k(i, j), k(i + 1, j + 1), k(i, j + 1));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  lp.add(g, color, { jitter: 0, vary: 0.05, ao: 0, ...o });
}

const DEG = Math.PI / 180;
const smooth = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Generatore pseudo-casuale deterministico (stessi brillantini a ogni build). */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (s >>> 8) / 16777216; };
}

/**
 * Posizioni dei brillantini sulla pelle del viso e dei lati della testa
 * (lontano da occhi e bocca), già staccate di poco dalla superficie.
 */
export function sparklePoints(count = 46): Array<{ p: THREE.Vector3; n: THREE.Vector3; r: number }> {
  const rnd = prng(7);
  const out: Array<{ p: THREE.Vector3; n: THREE.Vector3; r: number }> = [];
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const at = headAt((rnd() * 2 - 1) * 105 * DEG, (-45 + rnd() * 75) * DEG);
    const { p } = at;
    if (p.z > 0.15 && Math.abs(Math.abs(p.x) - 0.11) < 0.085 && Math.abs(p.y - 0.18) < 0.085) continue; // occhi
    if (p.z > 0.15 && Math.abs(p.x) < 0.06 && Math.abs(p.y - 0.095) < 0.035) continue; // bocca
    out.push({ ...at, r: rnd() });
  }
  return out;
}

/** Stellina a quattro punte, piatta, adagiata sulla pelle. */
function starFacet(size: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const w = size * 0.28;
  s.moveTo(0, size); s.lineTo(w, w); s.lineTo(size, 0); s.lineTo(w, -w); s.lineTo(0, -size); s.lineTo(-w, -w); s.lineTo(-size, 0); s.lineTo(-w, w); s.closePath();
  return new THREE.ShapeGeometry(s);
}

/** Pelle brillantinata: stelline luminose sparse che seguono le curve della testa. */
function skinGlitter(lp: LP) {
  sparklePoints().forEach(({ p, n, r }, i) => {
    onSkin(lp, { p, n }, 0.0025, r * Math.PI, (q) => q.add(starFacet(0.011 + r * 0.015), GLITTER[i % GLITTER.length], { bucket: 'glow', jitter: 0, ao: 0 }));
  });
}

interface KH {
  coat: string; coat2: string; skin: string; pants: string; boots: string; arm?: string; cuff?: string;
  robe?: boolean;
  face?: Partial<FaceOpts>;
  hat?: Build; hair?: Build; extraHead?: Build;
  heldL?: Build; heldR?: Build; back?: Build; chest?: Build;
  /** Pelle "brillantinata": brillantini luminosi su viso e mani. */
  sparkle?: boolean;
  /** Falda svasata sotto il busto: lunga (predefinita), corta o assente. */
  skirt?: 'long' | 'short' | 'none';
  /** Pantaloni rifiniti: piega davanti, risvolto sopra lo stivale, suola chiara. */
  trousers?: boolean;
  /** Bordo a coste in fondo al busto (maglione). */
  hem?: string;
  /** Colore della veste lunga (predefinito: coat2). */
  robeColor?: string;
}

const GLITTER = ['#fff4fb', '#ffd6f0', '#d6f6ff', '#fff2c4'];
/** Brillantini sulla manina (sfera): stelline adagiate sulla superficie. */
function handGlitter(lp: LP, c: [number, number, number], r: number) {
  const rnd = prng(3);
  for (let i = 0; i < 7; i++) {
    const th = (rnd() * 2 - 1) * 2, ph = (rnd() * 1.4 - 0.7);
    const n = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph));
    const p = new THREE.Vector3(...c).addScaledVector(n, r * 0.97);
    onSkin(lp, { p, n }, 0.004, rnd() * Math.PI, (q) => q.add(starFacet(0.008 + rnd() * 0.007), GLITTER[i % GLITTER.length], { bucket: 'glow', jitter: 0, ao: 0 }));
  }
}

function kHumanoid(o: KH): KawaiiSpec {
  const arm = o.arm ?? o.coat;
  const leg: Build = o.trousers ? (lp) => {
    ball(lp, 0, -0.01, 0, 0.07, 0.06, 0.07, o.pants); // anca dentro il busto
    lp.cyl(0, -0.15, 0, 0.064, 0.069, 0.15, 8, o.pants, { jitter: 0, vary: 0.03, ao: 0.08 });
    lp.box(0, -0.075, 0.066, 0.008, 0.12, 0.006, shade(o.pants, -0.07), { jitter: 0, ao: 0 }); // piega
    lp.cyl(0, -0.15, 0, 0.074, 0.073, 0.035, 8, shade(o.pants, -0.05), { jitter: 0, ao: 0 }); // risvolto
    // stivaletto basso con punta arrotondata e suola chiara
    sbox(lp, 0, -0.185, 0.02, 0.14, 0.075, 0.19, 0.04, o.boots);
    sbox(lp, 0, -0.2, 0.02, 0.142, 0.018, 0.192, 0.008, '#4d4239'); // suola
    ball(lp, 0, -0.165, 0.09, 0.05, 0.035, 0.035, shade(o.boots, 0.04)); // punta
  } : (lp) => {
    ball(lp, 0, -0.01, 0, 0.07, 0.06, 0.07, o.pants); // anca dentro il busto
    lp.cyl(0, -0.17, 0, 0.064, 0.068, 0.17, 7, o.pants, { jitter: 0, vary: 0.04, ao: 0.1 });
    sbox(lp, 0, -0.2, 0.025, 0.145, 0.1, 0.2, 0.045, o.boots);
  };
  const armB = (held?: Build): Build => (lp) => {
    ball(lp, 0, 0, 0, 0.078, 0.078, 0.078, arm); // spalla sferica, entra nel busto
    lp.cyl(0, -0.22, 0, 0.07, 0.068, 0.22, 7, arm, { jitter: 0, vary: 0.04, ao: 0.08 });
    lp.cyl(0, -0.235, 0, 0.074, 0.074, 0.04, 7, o.cuff ?? o.coat2, { jitter: 0, ao: 0 });
    ball(lp, 0, -0.275, 0.005, 0.064, 0.064, 0.064, o.skin); // manina
    if (o.sparkle) handGlitter(lp, [0, -0.275, 0.005], 0.064);
    held?.(lp);
  };
  return {
    scale: 1.25,
    pivots: {
      legL: [-LEG_X, HIP, 0], legR: [LEG_X, HIP, 0], body: [0, HIP, 0], head: [0, NECK, 0],
      armL: [-ARM_X, SHOULDER, 0], armR: [ARM_X, SHOULDER, 0],
    },
    parts: {
      legL: leg, legR: leg,
      armL: armB(o.heldL), armR: armB(o.heldR),
      body: (lp) => {
        if (o.robe) {
          lp.lathe(0, -0.195, 0, [[0.25, 0], [0.245, 0.06], [0.22, 0.2], [0.2, 0.36], [0.17, 0.39], [0, 0.4]], 10, o.robeColor ?? o.coat2, { jitter: 0, vary: 0.04, ao: o.robeColor ? 0.06 : 0.15 });
          sbox(lp, 0, -0.02, 0, 0.4, 0.39, 0.31, 0.09, o.coat);
        } else {
          sbox(lp, 0, -0.03, 0, 0.4, 0.4, 0.3, 0.09, o.coat);
          // falda del cappotto appena svasata (corta: lascia vedere i pantaloni)
          if ((o.skirt ?? 'long') === 'long') lp.lathe(0, -0.07, 0, [[0.225, 0], [0.22, 0.05], [0.205, 0.12], [0, 0.12]], 10, o.coat2, { jitter: 0, vary: 0.04, ao: 0.12 });
          else if (o.skirt === 'short') lp.lathe(0, -0.05, 0, [[0.218, 0], [0.214, 0.035], [0.205, 0.07], [0, 0.07]], 10, o.coat2, { jitter: 0, vary: 0.04, ao: 0.12 });
          if (o.hem) {
            // bordo a coste: fascia appena in rilievo con le costine
            sbox(lp, 0, -0.035, 0, 0.404, 0.055, 0.304, 0.03, o.hem);
            for (let i = -4; i <= 4; i++) lp.box(i * 0.04, -0.008, 0.153, 0.008, 0.045, 0.004, shade(o.hem, -0.05), { jitter: 0, ao: 0 });
          }
        }
        o.chest?.(lp);
        o.back?.(lp);
      },
      head: (lp) => {
        sbox(lp, 0, -0.02, 0, HEAD_W, HEAD_H, HEAD_D, 0.13, o.skin, { ao: 0.04 });
        for (const s of [-1, 1]) ball(lp, s * (HEAD_W / 2 + 0.005), 0.18, 0, 0.035, 0.05, 0.035, o.skin); // orecchie
        face(lp, { z: HEAD_D / 2, y: 0.18, ...o.face });
        if (o.sparkle) skinGlitter(lp);
        o.hair?.(lp);
        o.hat?.(lp);
        o.extraHead?.(lp);
      },
    },
  };
}

// ── Accessori ───────────────────────────────────────────────────────────

function wideHat(color: string, band = INK, tilt = 0.08): Build {
  return (lp) => {
    lp.push([0, 0.39, 0], 0, -0.05, tilt);
    lp.cyl(0, 0, 0, 0.39, 0.38, 0.045, 14, color, { jitter: 0, vary: 0.05 });
    lp.cyl(0, 0.04, 0, 0.25, 0.22, 0.22, 12, color, { jitter: 0, vary: 0.05 });
    lp.cyl(0, 0.045, 0, 0.255, 0.25, 0.06, 12, band, { jitter: 0, ao: 0 });
    ball(lp, 0, 0.26, 0, 0.21, 0.05, 0.21, color);
    lp.pop();
  };
}

/**
 * Pala portata in spalla: il manico passa per la mano e sale dietro la
 * spalla, la lama resta in alto accanto alla testa (leggibile dalla camera;
 * tenuta in verticale con la lama nell'erba sembrava un bastone).
 */
function shovel(len = 0.82): Build {
  return (lp) => {
    lp.push([0, -0.275, 0.02], 0, -0.53, -0.3);
    lp.cyl(0, -0.16, 0, 0.022, 0.022, len, 6, LPC.woodLight, { jitter: 0 });
    // impugnatura a D in fondo
    lp.add(new THREE.TorusGeometry(0.045, 0.012, 4, 8, Math.PI).rotateZ(Math.PI).translate(0, -0.16, 0), LPC.woodDark, { jitter: 0 });
    // lama in cima, con colletto e bordo più chiaro
    const top = -0.16 + len;
    lp.cyl(0, top - 0.02, 0, 0.032, 0.026, 0.07, 6, '#6f7a84', { jitter: 0 });
    const blade = new THREE.Shape();
    blade.moveTo(-0.1, 0); blade.lineTo(0.1, 0); blade.lineTo(0.105, 0.17); blade.quadraticCurveTo(0.09, 0.26, 0, 0.29); blade.quadraticCurveTo(-0.09, 0.26, -0.105, 0.17); blade.closePath();
    lp.push([0, top + 0.04, 0]).extrude(blade, 0.03, '#9aa6b0', { bevel: 0.008, jitter: 0, curve: 3 }).pop();
    lp.push([0, top + 0.04, 0.017]).plate(new THREE.Shape([new THREE.Vector2(-0.06, 0.03), new THREE.Vector2(0.06, 0.03), new THREE.Vector2(0.05, 0.16), new THREE.Vector2(-0.05, 0.16)]), 0.004, '#c3ccd3', { ao: 0 }).pop();
    lp.pop();
  };
}

function handLantern(color = LPC.lantern): Build {
  return (lp) => {
    lp.add(new THREE.TorusGeometry(0.045, 0.01, 3, 8, Math.PI).translate(0, -0.33, 0.01), LPC.iron, { jitter: 0 });
    sbox(lp, 0, -0.39, 0.01, 0.17, 0.035, 0.17, 0.012, LPC.iron);
    lp.box(0, -0.555, 0.01, 0.12, 0.17, 0.12, color, { bucket: 'glow', jitter: 0 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(x * 0.065, -0.56, 0.01 + z * 0.065, 0.022, 0.18, 0.022, LPC.iron, { jitter: 0 });
    sbox(lp, 0, -0.6, 0.01, 0.17, 0.04, 0.17, 0.012, LPC.iron);
    lp.light(0, -0.48, 0.01, color, 1.1, 5.5, 0.2, 1);
  };
}

function scarf(color: string, stripe: string): Build {
  return (lp) => {
    lp.push([0, 0.37, 0]).add(new THREE.TorusGeometry(0.17, 0.045, 5, 12).rotateX(Math.PI / 2), color, { jitter: 0, vary: 0.06 }).pop();
    lp.push([-0.1, 0.36, 0.15], 0, 0.1, 0.12);
    sbox(lp, 0, -0.2, 0, 0.09, 0.22, 0.035, 0.015, color);
    for (const y of [-0.15, -0.09]) lp.box(0, y, 0.019, 0.092, 0.018, 0.004, stripe, { jitter: 0, ao: 0 });
    lp.pop();
  };
}

const SKIN = '#f2cfb0';

// ── Custode personalizzabile ─────────────────────────────────────────────

const shade = (c: string, k: number) => `#${new THREE.Color(c).offsetHSL(0, 0, k).getHexString()}`;

/** Altezza sotto cui devono restare i capelli quando c'è un cappello (tesa o bordo). */
export const HAIR_CEILING: Record<HatStyle, number> = { wide: 0.385, top: 0.395, beanie: 0.285, none: 9 };
/** Assetto (altezza, rotazioni x e z) dei cappelli inclinati: tesa e cilindro. */
export const HAT_TILT = { wide: [0.39, -0.05, 0.08], top: [0.4, -0.04, -0.07] } as const;

/**
 * Capelli (coordinate della testa: faccia su z = 0,24, sommità a y = 0,46).
 * Con il cappello nessuna ciocca supera la tesa: i pezzi più alti si
 * schiacciano sotto il "soffitto" o non si disegnano.
 */
export function hairBuild(style: HairStyle, c: string, hat: HatStyle): Build | undefined {
  const ceil = HAIR_CEILING[hat];
  const lump = (lp: LP, x: number, y: number, z: number, rx: number, ry: number, rz: number, col = c) => {
    if (y - ry * 0.3 > ceil) return;
    const top = Math.min(y + ry, ceil);
    const bottom = y - ry;
    ball(lp, x, (top + bottom) / 2, z, rx, (top - bottom) / 2, rz, col);
  };
  const build = hairStyle(style, c, hat, lump);
  const tilt = hat === 'wide' || hat === 'top' ? HAT_TILT[hat] : null;
  if (!build || !tilt) return build;
  // la tesa è inclinata: una fascia di capelli la segue da sotto, così tra
  // tesa e capelli non resta una striscia di pelle sul lato rialzato
  return (lp) => {
    build(lp);
    lp.push([0, tilt[0], 0], 0, tilt[1], tilt[2]);
    lp.add(roundSlabGeo(0.6, 0.53, 0.05, 0.15).translate(0, -0.05, -0.005), c, { jitter: 0, vary: 0.04, ao: 0.05 }); // arriva fino alla fronte
    lp.pop();
  };
}

type Lump = (lp: LP, x: number, y: number, z: number, rx: number, ry: number, rz: number, col?: string) => void;

function hairStyle(style: HairStyle, c: string, hat: HatStyle, lump: Lump): Build | undefined {
  const ceil = HAIR_CEILING[hat];
  /** Fin dove salgono i capelli: la sommità o, con il cappello, appena sotto la tesa. */
  const topY = hat === 'none' ? 0.455 : ceil - 0.035;
  const front = (th: number) => { const a = Math.abs(Math.atan2(Math.sin(th), Math.cos(th))); return a; }; // 0 davanti, π dietro

  /**
   * Calotta: velo sottile che avvolge tutta la testa (sommità, lati, nuca)
   * aderendo alla superficie; davanti si ferma sotto la frangia, dietro scende
   * fino a `backY`. Sotto le ciocche non resta mai pelle scoperta.
   */
  const cap = (lp: LP, backY: number, col = shade(c, -0.03)) => {
    headSheet(lp, 28, 8,
      (u, v) => {
        const th = Math.PI + u * Math.PI;
        // davanti mai sotto 0,27 (gli occhi arrivano a ~0,25)
        const fy = Math.min(Math.max(0.27, Math.min(0.38, topY - 0.04)), topY);
        const yb = THREE.MathUtils.lerp(fy, backY, smooth(0.3 * Math.PI, 0.62 * Math.PI, front(th)));
        const pt = hat === 'none' ? 89 * DEG : phiForY(th, topY + 0.01);
        return [th, THREE.MathUtils.lerp(phiForY(th, yb), pt, v)];
      },
      (_u, v) => 0.028 * (0.3 + 0.7 * smooth(0, 0.25, v)), col, { vary: 0.04 });
  };

  /**
   * Ciocche che aderiscono alla testa, centrate in `center` (0 = fronte,
   * π = nuca) su ±`span`: ognuna è un velo a sé, bombato al centro e sottile
   * sui bordi, con la punta all'altezza `tip(t)` (t ∈ −1..1 lungo l'arco) e
   * una tonalità appena diversa, così tra due ciocche resta un solco.
   */
  const locks = (lp: LP, o: { center: number; span: number; n: number; tip: (t: number) => number; depth: number; root?: number; seed?: number; col?: string; edgeTaper?: boolean; minTip?: number }) => {
    const rnd = prng(o.seed ?? 11);
    const lens = Array.from({ length: o.n }, () => 0.65 + rnd() * 0.35);
    const root = o.root ?? 0.05;
    const tipY = (t: number) => {
      const sx = ((t + 1) / 2) * o.n, i = Math.min(o.n - 1, Math.floor(sx)), f = sx - Math.floor(sx);
      const peak = Math.pow(1 - Math.abs(2 * f - 1), 0.75); // 1 al centro della ciocca, 0 tra due ciocche
      return Math.max(o.minTip ?? 0, Math.min(topY - 0.05, o.tip(t) - o.depth * lens[i] * peak));
    };
    for (let i = 0; i < o.n; i++) {
      const t0 = -1 + (2 * i) / o.n, t1 = -1 + (2 * (i + 1)) / o.n;
      const tg = (u: number) => t0 + ((u + 1) / 2) * (t1 - t0);
      headSheet(lp, 6, 6,
        (u, v) => {
          const th = o.center + tg(u) * o.span * DEG;
          return [th, THREE.MathUtils.lerp(phiForY(th, tipY(tg(u))), hat === 'none' && o.center === Math.PI ? 62 * DEG : phiForY(th, topY), v)];
        },
        (u, v) => {
          const bulge = Math.pow(Math.sin(((u + 1) / 2) * Math.PI), 0.7);
          const edge = o.edgeTaper === false ? 1 : smooth(0, 0.22, 1 - Math.abs(tg(u)));
          return root * (0.15 + 0.85 * bulge) * edge * (0.25 + 0.75 * smooth(0, 0.45, v)) * (1 - 0.8 * smooth(0.65, 1, v));
        }, shade(o.col ?? c, [0, 0.035, -0.03, 0.015][(i + (o.seed ?? 0)) % 4]), { vary: 0.05 });
    }
  };

  /** Frangia: ciocche sulla fronte; `sweep` la porta di lato, `base` è l'attaccatura. */
  const fringe = (lp: LP, o: { n: number; base: number; depth: number; sweep?: number; wrap?: number; root?: number; seed?: number; col?: string }) => {
    // sotto un cappello la frangia scende un po' (il cappello la schiaccia)
    // ma le punte non scendono mai sugli occhi: col berretto non c'è posto e si omette
    if (topY - 0.05 < 0.29) return;
    const shift = Math.min(0, topY - 0.07 - (o.base + Math.abs(o.sweep ?? 0)));
    locks(lp, { center: 0, span: o.wrap ?? 80, n: o.n, depth: o.depth, root: o.root, seed: o.seed, col: o.col, minTip: 0.28,
      tip: (t) => o.base + shift + (o.sweep ?? 0) * t + 0.03 * smooth(0.75, 1, Math.abs(t)) });
  };

  /** Ciocche su lati e nuca: punte a `back` dietro e a `side` accanto al viso. */
  const nape = (lp: LP, o: { n: number; back: number; side: number; depth?: number; span?: number; seed?: number }) =>
    locks(lp, { center: Math.PI, span: o.span ?? 105, n: o.n, depth: o.depth ?? 0.05, seed: o.seed, edgeTaper: false,
      tip: (t) => THREE.MathUtils.lerp(o.back, o.side, Math.abs(t) ** 1.5) });

  /**
   * Ciocche lunghe che pendono sotto la testa (lame affusolate), con la
   * radice infilata sotto le ciocche della nuca e la punta un po' aperta.
   */
  const hanging = (lp: LP, o: { n: number; span: number; bottom: number; sideBottom: number; top?: number; seed?: number; lean?: number }) => {
    const rnd = prng(o.seed ?? 4);
    const yTop = o.top ?? 0.2;
    const w = 0.13, thick = 0.026;
    for (let i = 0; i < o.n; i++) {
      const t = -1 + (2 * i) / (o.n - 1);
      const th = Math.PI + t * o.span * DEG;
      const { p, n } = headAt(th, phiForY(th, yTop));
      const nh = new THREE.Vector3(n.x, 0, n.z).normalize();
      const L = yTop - (THREE.MathUtils.lerp(o.bottom, o.sideBottom, Math.abs(t) ** 1.5) - rnd() * 0.04);
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0);
      shape.quadraticCurveTo(w * 0.5, -L * 0.55, w * 0.08, -L);
      shape.lineTo(-w * 0.04, -L + 0.01);
      shape.quadraticCurveTo(-w * 0.5, -L * 0.5, -w / 2, 0);
      const g = new THREE.ExtrudeGeometry(shape, { depth: thick - 0.01, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 1, curveSegments: 3 });
      g.translate(0, 0, 0.005);
      lp.push([p.x + nh.x * 0.004, yTop, p.z + nh.z * 0.004], Math.atan2(nh.x, nh.z), -(o.lean ?? 0.12) - rnd() * 0.05, (rnd() - 0.5) * 0.08);
      lp.add(g, shade(c, [0, 0.03, -0.035, 0.015][i % 4]), { jitter: 0, vary: 0.05, ao: 0.04 });
      lp.pop();
    }
  };

  switch (style) {
    case 'none': return undefined;
    case 'tufts': return (lp) => {
      cap(lp, 0.22);
      nape(lp, { n: 9, back: 0.24, side: 0.3, seed: 3 });
      fringe(lp, { n: 5, base: 0.39, depth: 0.1, wrap: 82, seed: 3 }); // ciuffi a punta sulla fronte
      if (hat === 'none') for (let i = 0; i < 3; i++) lp.push([-0.06 + i * 0.06, 0.47, 0.02], 0, 0, (i - 1) * 0.4).cyl(0, 0, 0, 0.035, 0, 0.1, 4, c, { jitter: 0 }).pop();
    };
    case 'bob': return (lp) => {
      cap(lp, 0.1);
      nape(lp, { n: 11, back: 0.1, side: 0.12, depth: 0.03, span: 112, seed: 5 });
      fringe(lp, { n: 9, base: 0.34, depth: 0.035, wrap: 96, seed: 5 }); // frangia dritta appena smerlata
    };
    case 'long': return (lp) => {
      cap(lp, 0.02);
      // ciocche lunghe che ricadono sulla schiena e accanto al viso
      hanging(lp, { n: 11, span: 108, bottom: -0.2, sideBottom: -0.04, seed: 8 });
      nape(lp, { n: 11, back: 0.04, side: 0.08, depth: 0.04, span: 110, seed: 8 });
      fringe(lp, { n: 5, base: 0.37, depth: 0.09, sweep: -0.05, wrap: 92, seed: 8 }); // frangia di lato
    };
    case 'curly': return (lp) => {
      cap(lp, 0.12, shade(c, -0.05));
      fringe(lp, { n: 7, base: 0.37, depth: 0.03, wrap: 90, seed: 2, col: shade(c, -0.04) });
      // riccioli su tutta la calotta: sommità, nuca, lati e frangia
      const pts: Array<[number, number, number]> = [];
      for (let ix = -2; ix <= 2; ix++) for (let iz = -2; iz <= 2; iz++) pts.push([ix * 0.11, 0.49 - (Math.abs(ix) + Math.abs(iz)) * 0.012, iz * 0.1 - 0.03]);
      for (let ix = -2; ix <= 2; ix++) for (const y of [0.12, 0.23, 0.34]) pts.push([ix * 0.115, y, -0.265]);
      for (const sx of [-1, 1]) for (const z of [-0.18, -0.07, 0.04, 0.14]) for (const y of [0.16, 0.27, 0.38]) pts.push([sx * 0.3, y, z]);
      for (let ix = -2; ix <= 2; ix++) pts.push([ix * 0.105, 0.37, 0.25]);
      pts.forEach(([x, y, z], i) => lump(lp, x, y, z, 0.07 + (i % 3) * 0.008, 0.07, 0.07, i % 4 ? c : shade(c, -0.05)));
    };
    // ciocche corte tirate di lato verso lo chignon
    case 'bun': return (lp) => {
      cap(lp, 0.18);
      nape(lp, { n: 9, back: 0.2, side: 0.26, depth: 0.03, seed: 6 });
      fringe(lp, { n: 4, base: 0.39, depth: 0.05, sweep: 0.03, wrap: 85, seed: 6 });
      lump(lp, 0, hat === 'none' ? 0.54 : 0.27, -0.26, 0.11, 0.1, 0.11);
    };
    // spettinati: ciocche morbide che partono dal vortice in cima e cadono in
    // direzioni diverse, qualcuna sollevata (non aculei tutt'attorno)
    case 'spiky': return (lp) => {
      cap(lp, 0.18);
      nape(lp, { n: 9, back: 0.22, side: 0.27, depth: 0.05, seed: 9 });
      fringe(lp, { n: 5, base: 0.39, depth: 0.075, sweep: 0.025, wrap: 86, seed: 9 });
      if (hat === 'none') {
        const rnd = prng(21);
        // direzione (0 = avanti), lunghezza, quanto si solleva dalla testa, curva
        // ciocche che partono dal vortice in cima e scendono aderendo alla testa,
        // girando un po' (mulinello) e con le punte sollevate: arruffate, non aculei
        const crown: Array<[number, number, number, number]> = [ // direzione, punta (φ°), larghezza (°), giro
          [0.2, 34, 34, 0.5], [-0.9, 40, 30, 0.6], [1.3, 30, 32, 0.45], [2.4, 42, 34, 0.55], [-2.2, 36, 30, 0.5], [3.1, 30, 28, 0.4], [-0.25, 46, 26, -0.5],
        ];
        crown.forEach(([dir, tipPhi, width, swirl], i) => {
          headSheet(lp, 4, 6,
            (u, v) => {
              const narrow = Math.sin(Math.max(0.12, v) * Math.PI * 0.62); // punta stretta, larga a metà, più stretta al vortice
              return [dir + swirl * (1 - v) + u * width * DEG * narrow, THREE.MathUtils.lerp(tipPhi, 86, v) * DEG];
            },
            (u, v) => (0.018 + 0.04 * (1 - smooth(0, 0.6, v)) * (1 - 0.6 * Math.abs(u))) * smooth(0, 0.08, v + 0.02),
            shade(c, [0.03, 0, -0.025, 0.015, -0.01][i % 5]), { vary: 0.05 });
        });
        // un solo ciuffo ribelle che si alza
        const sh = new THREE.Shape();
        sh.moveTo(-0.065, 0); sh.lineTo(0.065, 0);
        sh.quadraticCurveTo(0.08, 0.1, 0.045, 0.16);
        sh.quadraticCurveTo(-0.01, 0.1, -0.065, 0);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 1, curveSegments: 4 });
        lp.push([0.02, 0.47, -0.05], 2.6, Math.PI / 2 - 0.75, 0.15);
        lp.add(g.translate(0, 0, -0.017), shade(c, 0.02), { jitter: 0, vary: 0.05, ao: 0.04 });
        lp.pop();
      }
    };
  }
}

/**
 * Barba (corta, folta, con treccia) e baffi. La barba è un velo che aderisce
 * alla testa: segue mento, mandibola e basette, si assottiglia sui bordi e
 * lascia libera la bocca; quella folta scende un po' sotto il mento.
 */
function facialHair(l: CustodeLook): Build {
  const c = l.beardColor;
  return (lp) => {
    if (l.beard === 'short') {
      headSheet(lp, 16, 5,
        (u, v) => [u * 94 * DEG, THREE.MathUtils.lerp(-58, THREE.MathUtils.lerp(-36, -4, smooth(0.5, 0.92, Math.abs(u))), v) * DEG],
        (u, v) => 0.016 * smooth(0, 0.18, 1 - Math.abs(u)) * smooth(0, 0.3, v) * smooth(0, 0.3, 1 - v), c);
    } else if (l.beard === 'full' || l.beard === 'braid') {
      headSheet(lp, 18, 7,
        (u, v) => [u * 96 * DEG, THREE.MathUtils.lerp(-72, THREE.MathUtils.lerp(-34, 10, smooth(0.5, 0.92, Math.abs(u))), v) * DEG],
        (u, v) => {
          const edge = smooth(0, 0.2, 1 - Math.abs(u)) * smooth(0, 0.22, v) * smooth(0, 0.25, 1 - v);
          const chin = (1 - Math.abs(u)) ** 2 * Math.exp(-(((v - 0.38) / 0.22) ** 2)); // ciuffo sotto il mento
          return edge * (0.04 + 0.045 * chin);
        }, c);
      if (l.beard === 'braid') {
        // treccia che parte dal mento e scende sul petto, con fermaglio
        const { p, n } = headAt(0, -50 * DEG);
        const top = p.clone().addScaledVector(n, 0.05);
        const end = new THREE.Vector3(0, -0.27, 0.2);
        for (let i = 0; i < 4; i++) {
          const q = top.clone().lerp(end, i / 3.4);
          ball(lp, q.x + (i % 2 ? 0.01 : -0.01), q.y, q.z, 0.042 - i * 0.004, 0.036, 0.032, i % 2 ? c : shade(c, -0.06));
        }
        lp.cyl(end.x, end.y - 0.035, end.z - 0.004, 0.024, 0.024, 0.032, 6, l.accentColor, { jitter: 0 });
        ball(lp, end.x, end.y - 0.06, end.z - 0.006, 0.026, 0.032, 0.024, c);
      }
    }
    // baffi appena sopra la bocca, adagiati sulla faccia
    const my = 0.118;
    if (l.mustache === 'thin') {
      for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.038, my), 0.004, s * 0.25, (q) => q.box(0, 0, 0, 0.064, 0.016, 0.01, c, { jitter: 0, ao: 0 }));
    } else if (l.mustache === 'bushy') {
      for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.046, my), 0.006, s * -0.12, (q) => ball(q, 0, 0, 0, 0.056, 0.028, 0.02, c));
    } else if (l.mustache === 'handlebar') {
      for (const s of [-1, 1]) {
        onSkin(lp, headFront(s * 0.04, my), 0.005, 0, (q) => ball(q, 0, 0, 0, 0.045, 0.02, 0.016, c));
        onSkin(lp, headFront(s * 0.1, my + 0.02), 0.004, 0, (q) => q.add(new THREE.TorusGeometry(0.03, 0.009, 4, 8, Math.PI * 1.2).rotateZ(s > 0 ? -0.3 : Math.PI * -0.9), c, { jitter: 0, ao: 0 }));
      }
    }
  };
}

function hatBuild(style: HatStyle, c: string): Build | undefined {
  switch (style) {
    case 'none': return undefined;
    case 'wide': return wideHat(c, shade(c, -0.12), HAT_TILT.wide[2]);
    case 'top': return (lp) => {
      lp.push([0, HAT_TILT.top[0], 0], 0, HAT_TILT.top[1], HAT_TILT.top[2]);
      lp.cyl(0, 0, 0, 0.33, 0.33, 0.035, 14, c, { jitter: 0 });
      lp.cyl(0, 0.02, 0, 0.2, 0.21, 0.32, 12, c, { jitter: 0, vary: 0.05 });
      lp.cyl(0, 0.04, 0, 0.215, 0.21, 0.055, 12, shade(c, -0.15), { jitter: 0, ao: 0 });
      lp.pop();
    };
    case 'beanie': return (lp) => {
      ball(lp, 0, 0.37, -0.01, 0.3, 0.17, 0.27, c);
      // risvolto a coste, appena più scuro (prima sembrava una fascia nera)
      lp.cyl(0, 0.29, -0.01, 0.298, 0.292, 0.08, 14, shade(c, -0.03), { jitter: 0, ao: 0 });
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; lp.push([Math.cos(a) * 0.296, 0.295, Math.sin(a) * 0.296 - 0.01], -a).box(0, 0, 0, 0.018, 0.07, 0.008, shade(c, 0.05), { jitter: 0, ao: 0 }).pop(); }
      ball(lp, 0, 0.56, -0.02, 0.075, 0.07, 0.075, shade(c, 0.12));
    };
  }
}

/** Busto per vestito: sciarpa, mantella con fermaglio, salopette, maglione a righe. */
function outfitChest(l: CustodeLook): Build {
  const acc = l.accentColor;
  const z = 0.152; // faccia piatta davanti al busto
  switch (l.outfit) {
    case 'cloak': return (lp) => {
      lp.push([0, 0.37, 0]).add(new THREE.TorusGeometry(0.19, 0.05, 5, 12).rotateX(Math.PI / 2), shade(l.outfitColor, -0.06), { jitter: 0 }).pop();
      // apertura della mantella al centro, con fermaglio in alto
      lp.box(0, 0.12, z, 0.012, 0.24, 0.006, shade(l.outfitColor, -0.12), { jitter: 0, ao: 0 });
      ball(lp, 0, 0.33, 0.17, 0.035, 0.035, 0.02, acc);
      ball(lp, 0, 0.33, 0.19, 0.015, 0.015, 0.01, LPC.gold);
    };
    case 'overalls': return (lp) => {
      // camicia: colletto a punte sopra la pettorina
      for (const s of [-1, 1]) lp.push([s * 0.05, 0.345, 0.14], 0, 0.5, s * -0.5).box(0, 0, 0, 0.07, 0.05, 0.012, '#e6dcc6', { jitter: 0, ao: 0 }).pop();
      sbox(lp, 0, 0.0, z - 0.004, 0.24, 0.22, 0.012, 0.01, shade(l.outfitColor, -0.04)); // pettorina
      lp.box(0, 0.16, z + 0.004, 0.08, 0.008, 0.004, shade(l.outfitColor, -0.12), { jitter: 0, ao: 0 }); // cucitura della tasca
      for (const s of [-1, 1]) { lp.box(s * 0.1, 0.25, z, 0.05, 0.16, 0.01, l.outfitColor, { jitter: 0, ao: 0 }); ball(lp, s * 0.1, 0.2, z + 0.008, 0.016, 0.016, 0.008, LPC.gold); }
      sbox(lp, 0.06, 0.05, z + 0.006, 0.07, 0.06, 0.008, 0.006, acc); // toppa
      lp.box(-0.06, 0.06, z + 0.006, 0.04, 0.004, 0.003, shade(l.outfitColor, -0.15), { jitter: 0, ao: 0 }); // rammendo
    };
    case 'sweater': return (lp) => {
      // righe "dipinte" davanti e dietro, aderenti alla parte piatta del busto
      for (const y of [0.07, 0.17, 0.27]) for (const s of [-1, 1]) lp.box(0, y, s * 0.151, 0.22, 0.045, 0.006, acc, { jitter: 0, ao: 0 });
      lp.cyl(0, 0.34, 0, 0.17, 0.15, 0.08, 12, shade(l.outfitColor, -0.05), { jitter: 0 });
    };
    default: return (lp) => {
      scarf(acc, shade(acc, 0.25))(lp);
      // abbottonatura al centro: listino, tre bottoni allineati, due tasche con patta
      lp.box(0, 0.11, z, 0.03, 0.26, 0.005, shade(l.outfitColor, -0.05), { jitter: 0, ao: 0 });
      for (const y of [0.02, 0.1, 0.18]) ball(lp, 0, y, z + 0.006, 0.016, 0.016, 0.008, LPC.gold);
      for (const s of [-1, 1]) lp.box(s * 0.105, 0.05, z + 0.002, 0.07, 0.022, 0.008, shade(l.outfitColor, -0.09), { jitter: 0, ao: 0 });
    };
  }
}

/** Occhiali, lentiggini, cerotto. */
function faceDetails(l: CustodeLook): Build {
  return (lp) => {
    const z = HEAD_D / 2 + 0.02;
    const frame = l.glasses === 'square' ? '#2a2226' : LPC.gold;
    if (l.glasses === 'round' || l.glasses === 'monocle') {
      for (const s of l.glasses === 'monocle' ? [1] : [-1, 1]) lp.add(new THREE.TorusGeometry(0.07, 0.01, 4, 12).translate(s * 0.11, 0.18, z), frame, { jitter: 0, ao: 0 });
      if (l.glasses === 'round') lp.box(0, 0.19, z, 0.06, 0.012, 0.01, frame, { jitter: 0, ao: 0 });
      else {
        // catenella: scende lungo la guancia, segue la mandibola e ricade sul petto
        const lift = (at: { p: THREE.Vector3; n: THREE.Vector3 }, d: number) => at.p.clone().addScaledVector(at.n, d);
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.11 + 0.07 * Math.cos(-0.9), 0.18 + 0.07 * Math.sin(-0.9), z - 0.004),
          lift(headFront(0.19, 0.08), 0.012),
          lift(headAt(52 * DEG, -40 * DEG), 0.012),
          lift(headAt(48 * DEG, -68 * DEG), 0.014),
          new THREE.Vector3(0.15, -0.1, 0.19),
          new THREE.Vector3(0.09, -0.16, 0.19),
        ]);
        lp.add(new THREE.TubeGeometry(curve, 24, 0.0055, 3, false), LPC.gold, { jitter: 0, ao: 0 });
        ball(lp, 0.09, -0.17, 0.19, 0.016, 0.016, 0.01, LPC.gold);
      }
    } else if (l.glasses === 'square') {
      for (const s of [-1, 1]) {
        lp.box(s * 0.11, 0.24, z, 0.15, 0.016, 0.012, frame, { jitter: 0, ao: 0 });
        lp.box(s * 0.11, 0.115, z, 0.15, 0.016, 0.012, frame, { jitter: 0, ao: 0 });
        for (const e of [-1, 1]) lp.box(s * 0.11 + e * 0.07, 0.115, z, 0.016, 0.14, 0.012, frame, { jitter: 0, ao: 0 });
      }
      lp.box(0, 0.2, z, 0.06, 0.014, 0.01, frame, { jitter: 0, ao: 0 });
    }
    if (l.freckles) for (const s of [-1, 1]) for (const [x, y] of [[0.12, 0.13], [0.15, 0.115], [0.135, 0.095], [0.165, 0.135]] as const) {
      onSkin(lp, headFront(s * x, y), 0.001, 0, (q) => q.blob(0, 0, 0, 0.008, 0.008, 0.003, shade(l.skin, -0.2), { jitter: 0, ao: 0 }));
    }
    if (l.bandaid) {
      // sulla guancia (la fronte è coperta dai capelli), adagiato sulla curva
      onSkin(lp, headFront(-0.16, 0.07), 0.003, 0.45, (q) => {
        sbox(q, 0, -0.018, 0, 0.11, 0.036, 0.008, 0.008, '#e8c9a0');
        q.box(0, -0.012, 0.005, 0.035, 0.024, 0.004, '#d9b48a', { jitter: 0, ao: 0 });
      });
    }
  };
}

/** Il Custode costruito da un aspetto personalizzato (stesse parti e perni). */
export function custodeSpec(l: CustodeLook): KawaiiSpec {
  const coat = l.outfitColor;
  return kHumanoid({
    coat, coat2: shade(coat, -0.07), skin: l.skin, boots: '#3a2a22',
    // pantaloni che si staccano da stivali e giacca: grigio fumo col cappotto,
    // tela blu col maglione, il tessuto della salopette
    pants: l.outfit === 'overalls' ? coat : l.outfit === 'sweater' ? '#46566a' : '#57524c',
    skirt: l.outfit === 'coat' ? 'short' : l.outfit === 'cloak' ? 'long' : 'none',
    trousers: true,
    robeColor: l.outfit === 'cloak' ? shade(coat, -0.03) : undefined,
    hem: l.outfit === 'sweater' ? shade(coat, -0.06) : undefined,
    arm: l.outfit === 'overalls' ? '#d8cdb8' : undefined, cuff: l.outfit === 'sweater' ? l.accentColor : l.outfit === 'overalls' ? '#c4b8a0' : undefined,
    robe: l.outfit === 'cloak',
    face: { mouth: 'smile', eye: l.eyes },
    hair: hairBuild(l.hair, l.hairColor, l.hat),
    hat: hatBuild(l.hat, l.hatColor),
    chest: outfitChest(l),
    back: (lp) => { sbox(lp, 0, 0.04, -0.2, 0.3, 0.28, 0.12, 0.04, '#7a5a3c'); sbox(lp, 0, 0.2, -0.27, 0.22, 0.09, 0.04, 0.02, '#5c4029'); },
    extraHead: (lp) => { faceDetails(l)(lp); facialHair(l)(lp); },
    sparkle: l.sparkle,
    // niente pala (è del becchino): solo la lanterna, che di notte illumina il Custode
    heldL: handLantern(),
  });
}

// ── Catalogo dei prototipi ──────────────────────────────────────────────

export const KAWAII: Record<string, KawaiiSpec> = {
  custode: custodeSpec(DEFAULT_LOOK),
  gravedigger: kHumanoid({
    coat: '#56664b', coat2: '#46543d', skin: '#ebbf9c', pants: '#3b352d', boots: '#2a241e', arm: '#c9b79c', cuff: '#b3a185',
    face: { mouth: 'none', eyes: 'sleepy', y: 0.2 },
    extraHead: (lp) => {
      ball(lp, 0, 0.06, 0.2, 0.22, 0.14, 0.08, '#8a6447'); // barbone
      ball(lp, 0, 0.13, 0.25, 0.04, 0.035, 0.035, '#e0a98a'); // nasone
      for (const s of [-1, 1]) lp.box(s * 0.11, 0.255, 0.236, 0.08, 0.02, 0.01, '#6b4a33', { jitter: 0, ao: 0 }); // sopracciglia
    },
    hat: (lp) => { // coppola morbida con visiera
      lp.push([0, 0.4, -0.02], 0, -0.1, 0.06);
      ball(lp, 0, 0.0, 0, 0.3, 0.1, 0.27, '#55534e');
      sbox(lp, 0, -0.03, 0.22, 0.32, 0.03, 0.14, 0.012, '#45433f');
      ball(lp, 0, 0.09, 0, 0.025, 0.018, 0.025, '#45433f');
      lp.pop();
    },
    chest: (lp) => { // salopette con toppa e spallacci
      for (const s of [-1, 1]) lp.box(s * 0.1, 0.18, 0.152, 0.05, 0.19, 0.01, '#46543d', { jitter: 0, ao: 0 });
      for (const s of [-1, 1]) ball(lp, s * 0.1, 0.34, 0.155, 0.018, 0.018, 0.01, LPC.gold);
      sbox(lp, 0.07, 0.03, 0.15, 0.09, 0.08, 0.012, 0.008, '#8a7a55');
    },
    heldR: shovel(0.95),
  }),
  priest: kHumanoid({
    coat: '#20222a', coat2: '#191a20', skin: SKIN, pants: '#18191e', boots: '#18191e', robe: true,
    face: { mouth: 'smile' },
    extraHead: (lp) => { // occhialetti tondi
      for (const s of [-1, 1]) lp.add(new THREE.TorusGeometry(0.068, 0.009, 3, 10).translate(s * 0.11, 0.18, HEAD_D / 2 + 0.02), LPC.gold, { jitter: 0, ao: 0 });
      lp.box(0, 0.19, HEAD_D / 2 + 0.02, 0.06, 0.01, 0.008, LPC.gold, { jitter: 0, ao: 0 });
      for (const [x, y] of [[-0.22, 0.3], [0.22, 0.3]] as const) ball(lp, x, y, 0.05, 0.07, 0.07, 0.14, '#cfc8bf'); // capelli grigi ai lati
    },
    hat: (lp) => { // saturno
      lp.cyl(0, 0.4, 0, 0.37, 0.37, 0.035, 14, '#16171c', { jitter: 0 });
      ball(lp, 0, 0.44, 0, 0.21, 0.12, 0.21, '#16171c');
      lp.cyl(0, 0.42, 0, 0.215, 0.215, 0.04, 12, '#3a2a2e', { jitter: 0, ao: 0 });
    },
    chest: (lp) => {
      lp.box(0, 0.32, 0.155, 0.08, 0.05, 0.012, WHITE, { jitter: 0, ao: 0 }); // collarino
      lp.box(0, 0.08, 0.16, 0.025, 0.14, 0.012, LPC.gold, { jitter: 0, ao: 0 });
      lp.box(0, 0.165, 0.16, 0.08, 0.025, 0.012, LPC.gold, { jitter: 0, ao: 0 });
    },
    heldL: (lp) => {
      lp.push([0, -0.3, 0.06], 0, -0.3);
      sbox(lp, 0, -0.05, 0, 0.17, 0.21, 0.06, 0.015, '#7a2a2c');
      lp.box(0, -0.05 + 0.02, 0.031, 0.15, 0.17, 0.005, '#efe6d0', { jitter: 0, ao: 0 });
      lp.box(0, 0.0, 0.034, 0.025, 0.12, 0.005, LPC.gold, { jitter: 0, ao: 0 });
      lp.box(0, 0.06, 0.034, 0.08, 0.022, 0.005, LPC.gold, { jitter: 0, ao: 0 });
      lp.pop();
    },
  }),
  mourner: kHumanoid({
    coat: '#2b2b35', coat2: '#22222a', skin: '#f0d2bd', pants: '#1c1c22', boots: '#1c1c22', robe: true,
    face: { eyes: 'closed', mouth: 'flat', blush: '#d99a9a' },
    hair: (lp) => { ball(lp, 0, 0.3, -0.2, 0.25, 0.2, 0.12, '#2a2226'); ball(lp, 0, 0.42, -0.26, 0.09, 0.08, 0.08, '#2a2226'); },
    hat: (lp) => { // cappellino con veletta e fiore
      lp.push([0.03, 0.4, 0], 0, -0.1, -0.1);
      lp.cyl(0, 0, 0, 0.36, 0.35, 0.03, 14, '#15151a', { jitter: 0 });
      lp.cyl(0, 0.03, 0, 0.2, 0.18, 0.12, 12, '#15151a', { jitter: 0 });
      lp.cyl(0, 0.03, 0, 0.205, 0.2, 0.035, 12, '#4a3a48', { jitter: 0, ao: 0 });
      ball(lp, 0.17, 0.07, 0.1, 0.05, 0.05, 0.05, '#c9b8c8');
      lp.pop();
    },
    extraHead: (lp) => { ball(lp, 0.15, 0.08, HEAD_D / 2 + 0.005, 0.016, 0.024, 0.012, '#8fc4e6', { bucket: 'glow' }); }, // lacrimuccia
    chest: (lp) => { for (const y of [0.08, 0.18, 0.28]) ball(lp, 0, y, 0.16, 0.015, 0.015, 0.008, '#5a5a66'); },
    heldR: (lp) => { // giglio bianco
      lp.cyl(0, -0.3, 0.07, 0.009, 0.009, 0.32, 4, LPC.leaf, { jitter: 0 });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; lp.push([0, 0.03, 0.07], a, 0.9).blob(0, 0.05, 0, 0.022, 0.06, 0.012, WHITE, { jitter: 0 }).pop(); }
      ball(lp, 0, 0.03, 0.07, 0.018, 0.018, 0.018, LPC.gold);
    },
  }),
  /** Variante del corteo: signore con cilindro, baffi e ombrello. */
  mournerB: kHumanoid({
    coat: '#2a2c33', coat2: '#202228', skin: '#efc9aa', pants: '#1d1e24', boots: '#141418',
    face: { mouth: 'none', eyes: 'sleepy' },
    extraHead: (lp) => {
      for (const s of [-1, 1]) lp.push([s * 0.05, 0.1, HEAD_D / 2 + 0.01], 0, 0, s * 0.3).blob(0, 0, 0, 0.055, 0.022, 0.02, '#5b5550', { jitter: 0 }).pop();
      for (const s of [-1, 1]) ball(lp, s * 0.26, 0.24, 0.0, 0.04, 0.07, 0.1, '#bdb6ad');
    },
    hat: (lp) => {
      lp.push([0, 0.4, 0], 0, 0, -0.06);
      lp.cyl(0, 0, 0, 0.32, 0.32, 0.03, 14, '#141418', { jitter: 0 });
      lp.cyl(0, 0.02, 0, 0.19, 0.2, 0.3, 12, '#141418', { jitter: 0 });
      lp.cyl(0, 0.04, 0, 0.205, 0.2, 0.05, 12, '#5a2a30', { jitter: 0, ao: 0 });
      lp.pop();
    },
    chest: (lp) => { lp.box(0, 0.2, 0.152, 0.1, 0.16, 0.01, '#d8d0c2', { jitter: 0, ao: 0 }); lp.box(0, 0.33, 0.158, 0.07, 0.03, 0.01, '#5a2a30', { jitter: 0, ao: 0 }); },
    heldR: (lp) => { // ombrello chiuso
      lp.cyl(0, -0.62, 0.07, 0.014, 0.014, 0.66, 5, '#141418', { jitter: 0 });
      lp.cyl(0, -0.5, 0.07, 0.05, 0.02, 0.38, 7, '#1f2026', { jitter: 0 });
      lp.add(new THREE.TorusGeometry(0.04, 0.012, 3, 8, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2).translate(0, 0.04, 0.03), LPC.woodDark, { jitter: 0 });
    },
  }),
  zombie: kHumanoid({
    coat: '#5d6449', coat2: '#4a503a', skin: '#a4c487', pants: '#43403a', boots: '#2e2b26', arm: '#a4c487', cuff: '#5d6449',
    face: { mouth: 'none', blush: '#c98a8a', eyes: 'none' },
    extraHead: (lp) => {
      const z = HEAD_D / 2;
      // occhio grande tondo e occhio a croce cucito
      ball(lp, -0.11, 0.18, z, 0.07, 0.07, 0.02, WHITE);
      ball(lp, -0.1, 0.17, z + 0.016, 0.03, 0.03, 0.01, INK);
      ball(lp, -0.115, 0.185, z + 0.026, 0.01, 0.01, 0.005, WHITE);
      for (const s of [-1, 1]) lp.push([0.11, 0.18, z + 0.005], 0, 0, s * 0.785).box(0, -0.04, 0, 0.018, 0.08, 0.01, INK, { jitter: 0, ao: 0 }).pop();
      // bocca cucita
      lp.box(0, 0.085, z + 0.002, 0.12, 0.012, 0.01, INK, { jitter: 0, ao: 0 });
      for (let i = -2; i <= 2; i++) lp.box(i * 0.025, 0.07, z + 0.003, 0.008, 0.04, 0.01, INK, { jitter: 0, ao: 0 });
      // cervello che fa capolino e cicatrice
      ball(lp, 0.1, 0.44, 0.02, 0.12, 0.06, 0.12, '#e3a3b0', { detail: 1 });
      for (let i = 0; i < 3; i++) lp.box(-0.06 + i * 0.03, 0.4, z - 0.02, 0.008, 0.05, 0.01, '#4a5a3a', { jitter: 0, ao: 0 });
      lp.push([-0.05, 0.42, z - 0.015], 0, 0, 0.25).box(0, 0, 0, 0.1, 0.008, 0.01, '#4a5a3a', { jitter: 0, ao: 0 }).pop();
    },
    chest: (lp) => { // camicia strappata e toppa
      for (let i = 0; i < 5; i++) lp.push([-0.16 + i * 0.08, -0.07, 0.14], 0, 0, i % 2 ? 0.4 : -0.4).box(0, -0.03, 0, 0.05, 0.06, 0.02, '#4a503a', { jitter: 0 }).pop();
      sbox(lp, -0.08, 0.15, 0.148, 0.09, 0.08, 0.012, 0.008, '#8a7a55');
      for (const [x, y] of [[-0.11, 0.17], [-0.05, 0.21]] as const) lp.box(x, y, 0.156, 0.03, 0.006, 0.004, INK, { jitter: 0, ao: 0 });
    },
    heldL: (lp) => { lp.cyl(0, -0.15, 0, 0.073, 0.073, 0.05, 7, '#e8e0cc', { jitter: 0 }); lp.cyl(0, -0.08, 0, 0.073, 0.073, 0.035, 7, '#e8e0cc', { jitter: 0 }); }, // bende
  }),
  skeleton: {
    scale: 1.25,
    pivots: { legL: [-LEG_X, HIP, 0], legR: [LEG_X, HIP, 0], body: [0, HIP, 0], head: [0, NECK, 0], armL: [-0.17, SHOULDER, 0], armR: [0.17, SHOULDER, 0] },
    parts: {
      legL: (lp) => skelLimb(lp, true), legR: (lp) => skelLimb(lp, true),
      armL: (lp) => skelLimb(lp, false), armR: (lp) => skelLimb(lp, false),
      body: (lp) => {
        const B = LPC.bone;
        ball(lp, 0, 0.0, 0, 0.16, 0.07, 0.11, B); // bacino
        lp.cyl(0, 0.0, -0.03, 0.035, 0.03, 0.36, 6, LPC.boneDark, { jitter: 0 });
        for (let i = 0; i < 3; i++) {
          const y = 0.13 + i * 0.075, rr = 0.15 - Math.abs(i - 1) * 0.015;
          lp.push([0, y, -0.02], 0, Math.PI / 2).add(new THREE.TorusGeometry(rr, 0.022, 4, 12, Math.PI * 1.6).rotateZ(Math.PI * 0.7), B, { jitter: 0 }).pop();
        }
        ball(lp, 0, 0.36, 0, 0.2, 0.045, 0.08, B); // clavicole
        // papillon
        lp.push([0, 0.36, 0.08]);
        for (const s of [-1, 1]) lp.push([s * 0.045, 0, 0], 0, 0, s * Math.PI / 2).cyl(0, -0.035, 0, 0.04, 0.008, 0.07, 3, '#8e2f2f', { jitter: 0 }).pop();
        ball(lp, 0, 0, 0.005, 0.02, 0.02, 0.02, '#8e2f2f');
        lp.pop();
      },
      head: (lp) => {
        const z = HEAD_D / 2;
        sbox(lp, 0, 0.0, 0, 0.54, 0.44, 0.46, 0.14, LPC.bone, { ao: 0.06 });
        sbox(lp, 0, -0.06, 0.03, 0.34, 0.12, 0.36, 0.05, LPC.bone); // mandibola
        for (const s of [-1, 1]) {
          ball(lp, s * 0.12, 0.2, z - 0.01, 0.085, 0.095, 0.03, '#25232a');
          ball(lp, s * 0.12, 0.2, z + 0.006, 0.026, 0.026, 0.01, LPC.spectral, { bucket: 'glow' }); // lucine negli occhi
        }
        lp.push([0, 0.1, z]).cyl(0, -0.02, 0, 0.03, 0.0, 0.04, 3, '#25232a', { jitter: 0 }).pop();
        for (let i = -2; i <= 2; i++) sbox(lp, i * 0.04, -0.02, z - 0.03, 0.032, 0.05, 0.03, 0.008, '#efe8d6');
        lp.box(0, 0.03, z - 0.02, 0.22, 0.008, 0.02, '#8e8676', { jitter: 0, ao: 0 });
      },
    },
  },
  ghost: ghostK('#d7f2ea', false),
  ghostRare: ghostK('#ffe0b2', true),
  cat: kQuad({ color: '#25242b', len: 0.42, tall: 0.14, head: 0.3, ears: 'cat', eyes: '#a6d84f', belly: '#3a3842', tail: 'up' }),
  rat: kQuad({ color: '#6c6876', len: 0.3, tall: 0.07, head: 0.22, ears: 'round', eyes: INK, belly: '#8f8a9a', tail: 'long', snout: true }),
  petDog: kQuad({ color: LPC.bone, len: 0.42, tall: 0.15, head: 0.3, ears: 'dog', eyes: INK, bones: true, snout: true, tail: 'wag' }),
  petCat: kQuad({ color: LPC.bone, len: 0.36, tall: 0.13, head: 0.27, ears: 'cat', eyes: INK, bones: true, tail: 'up' }),
  petRabbit: kQuad({ color: LPC.bone, len: 0.3, tall: 0.1, head: 0.26, ears: 'rabbit', eyes: INK, bones: true, tail: 'pom' }),
  crow: kBird('#22222a', '#e0573a'),
  petCrow: kBird(LPC.bone, INK),
  petDuck: kDuck(),
};

function skelLimb(lp: LP, leg: boolean) {
  const B = LPC.bone;
  ball(lp, 0, 0, 0, 0.055, 0.055, 0.055, B);
  lp.cyl(0, -0.2, 0, 0.032, 0.034, 0.2, 6, B, { jitter: 0 });
  if (leg) sbox(lp, 0, -0.2, 0.03, 0.12, 0.06, 0.17, 0.03, B);
  else {
    ball(lp, 0, -0.24, 0.005, 0.055, 0.05, 0.05, B);
    for (let i = -1; i <= 1; i++) lp.cyl(i * 0.025, -0.31, 0.02, 0.012, 0.012, 0.06, 4, B, { jitter: 0 });
  }
}

/** Fantasmino: cupola morbida, orlo ondulato, manine a moncherino, faccina. */
function ghostK(c: string, rare: boolean): KawaiiSpec {
  const g = { bucket: 'ghost' as const };
  return {
    scale: 1.25, hover: 0.22, ghost: true,
    pivots: { body: [0, 0, 0], armL: [-0.33, 0.32, 0.02], armR: [0.33, 0.32, 0.02] },
    parts: {
      body: (lp) => {
        // un solo guscio chiuso (il materiale è additivo: niente sovrapposizioni),
        // con l'orlo a onde ottenuto spostando l'anello più basso
        const geo = new THREE.LatheGeometry([[0.29, -0.02], [0.31, 0.05], [0.325, 0.14], [0.32, 0.3], [0.3, 0.45], [0.25, 0.58], [0.16, 0.67], [0.0001, 0.7]].map(([r, y]) => new THREE.Vector2(r, y)), 24);
        const pa = geo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < pa.count; i++) {
          const y = pa.getY(i);
          if (y < 0.06) {
            const a = Math.atan2(pa.getZ(i), pa.getX(i));
            const k = y < 0 ? 1 : 0.35;
            pa.setY(i, y - k * 0.07 * (0.5 + 0.5 * Math.cos(a * 6)));
          }
        }
        lp.add(geo, c, { ...g, jitter: 0, vary: 0.03, ao: 0 });
        face(lp, { z: 0.318, y: 0.36, dx: 0.1, r: 0.055, mouth: 'o', curve: 1.5 });
        if (rare) { // fiocco e stelline
          lp.push([0.12, 0.66, 0.08], 0, 0, -0.3);
          for (const s of [-1, 1]) lp.push([s * 0.05, 0, 0], 0, 0, s * Math.PI / 2).cyl(0, -0.05, 0, 0.055, 0.01, 0.1, 3, '#e07a6a', { jitter: 0 }).pop();
          ball(lp, 0, 0, 0.01, 0.025, 0.025, 0.025, '#e07a6a');
          lp.pop();
        }
        lp.light(0, 0.4, 0, rare ? '#ffcf8a' : LPC.spectral, 0.7, 3.5, 0.25, 1.3);
      },
      armL: (lp) => ball(lp, -0.03, -0.04, 0, 0.06, 0.09, 0.06, c, g),
      armR: (lp) => ball(lp, 0.03, -0.04, 0, 0.06, 0.09, 0.06, c, g),
    },
  };
}

interface KQ { color: string; len: number; tall: number; head: number; ears: 'cat' | 'round' | 'dog' | 'rabbit'; eyes: string; belly?: string; tail: 'up' | 'long' | 'wag' | 'pom'; snout?: boolean; bones?: boolean }

/** Animaletto chibi: testa enorme, corpicino a fagiolo, zampette a bottone. */
function kQuad(o: KQ): KawaiiSpec {
  const T = o.tall, hl = o.len / 2, H = o.head;
  const leg: Build = (lp) => {
    ball(lp, 0, -0.005, 0, 0.045, 0.04, 0.045, o.color);
    lp.cyl(0, -T + 0.02, 0, 0.038, 0.04, T - 0.02, 6, o.color, { jitter: 0, ao: 0.1 });
    ball(lp, 0, -T + 0.02, 0.012, 0.045, 0.028, 0.052, o.color);
  };
  return {
    scale: 1.3, quadruped: true,
    pivots: { body: [0, T, 0], head: [0, T + 0.1, hl * 0.8], legL: [-0.075, T, hl - 0.06], legR: [0.075, T, -hl + 0.06], armL: [-0.075, T, -hl + 0.06], armR: [0.075, T, hl - 0.06] },
    parts: {
      legL: leg, legR: leg, armL: leg, armR: leg,
      body: (lp) => {
        ball(lp, 0, 0.09, 0, 0.13, 0.11, hl + 0.03, o.color);
        if (o.belly) ball(lp, 0, 0.06, 0.02, 0.1, 0.075, hl, o.belly);
        if (o.bones) for (let i = 0; i < 3; i++) lp.push([0, 0.09, -hl * 0.4 + i * hl * 0.4]).add(new THREE.TorusGeometry(0.115, 0.012, 3, 10, Math.PI * 1.2).rotateZ(-Math.PI * 0.1), LPC.boneDark, { jitter: 0 }).pop();
        if (o.tail === 'up') {
          lp.push([0, 0.12, -hl], 0, -0.6).cyl(0, 0, 0, 0.03, 0.026, 0.2, 6, o.color, { jitter: 0 }).pop();
          ball(lp, 0, 0.3, -hl - 0.12, 0.035, 0.035, 0.035, o.color);
        } else if (o.tail === 'long') lp.push([0, 0.07, -hl], 0, -1.3).cyl(0, 0, 0, 0.015, 0.006, 0.3, 4, '#d6a3a3', { jitter: 0 }).pop();
        else if (o.tail === 'wag') lp.push([0, 0.13, -hl], 0, -0.9).cyl(0, 0, 0, 0.025, 0.018, 0.16, 5, o.color, { jitter: 0 }).pop();
        else ball(lp, 0, 0.13, -hl - 0.02, 0.06, 0.06, 0.06, WHITE);
      },
      head: (lp) => {
        sbox(lp, 0, 0, 0, H, H * 0.85, H * 0.85, H * 0.3, o.color);
        const z = H * 0.425;
        if (o.snout) ball(lp, 0, H * 0.22, z, H * 0.2, H * 0.14, H * 0.12, o.belly ?? o.color);
        ball(lp, 0, H * 0.3, z + (o.snout ? H * 0.1 : 0.005), 0.022, 0.016, 0.014, o.bones ? '#25232a' : '#d68f8f');
        for (const s of [-1, 1]) {
          const ex = s * H * 0.24, ey = H * 0.44;
          if (o.bones) ball(lp, ex, ey, z - 0.006, H * 0.12, H * 0.13, 0.02, '#25232a');
          ball(lp, ex, ey, z, H * 0.08, H * 0.1, 0.015, o.eyes, o.eyes === INK ? {} : { bucket: 'glow' });
          ball(lp, ex - H * 0.025, ey + H * 0.035, z + 0.012, H * 0.03, H * 0.03, 0.008, WHITE);
          if (!o.bones) ball(lp, s * H * 0.27, H * 0.24, z - 0.006, H * 0.07, H * 0.035, 0.012, BLUSH);
        }
        for (const s of [-1, 1]) {
          const ec = o.bones ? LPC.boneDark : o.color;
          if (o.ears === 'cat') lp.push([s * H * 0.3, H * 0.8, 0], 0, 0, s * -0.25).cyl(0, 0, 0, H * 0.16, 0.0, H * 0.28, 4, ec, { jitter: 0 }).pop();
          else if (o.ears === 'round') ball(lp, s * H * 0.36, H * 0.85, 0, H * 0.18, H * 0.18, 0.03, '#d6a3a3');
          else if (o.ears === 'dog') lp.push([s * H * 0.5, H * 0.75, 0], 0, 0, s * 0.35).blob(0, -H * 0.2, 0, H * 0.1, H * 0.25, H * 0.12, ec, { detail: 1, jitter: 0 }).pop();
          else lp.push([s * H * 0.18, H * 0.82, -0.02], 0, -0.2, s * -0.15).blob(0, H * 0.4, 0, H * 0.1, H * 0.42, H * 0.06, ec, { detail: 1, jitter: 0 }).pop();
        }
      },
    },
  };
}

/** Uccellino tondo: corpo-pallina, testa grande, ali a paletta. */
function kBird(color: string, eye: string): KawaiiSpec {
  const wing = (s: number): Build => (lp) => lp.push([0, 0, 0], 0, 0, 0, [s, 1, 1]).blob(0.12, 0, -0.02, 0.13, 0.03, 0.1, color, { detail: 1, jitter: 0 }).pop();
  return {
    scale: 1.3, flier: true,
    pivots: { body: [0, 0.15, 0], head: [0, 0.27, 0.08], armL: [-0.1, 0.24, 0], armR: [0.1, 0.24, 0], legL: [-0.05, 0.1, 0], legR: [0.05, 0.1, 0] },
    parts: {
      body: (lp) => {
        ball(lp, 0, 0.03, 0, 0.13, 0.12, 0.15, color);
        lp.push([0, 0.06, -0.13], 0, -1.1).cyl(0, 0, 0, 0.06, 0.02, 0.12, 4, color, { jitter: 0 }).pop();
      },
      head: (lp) => {
        ball(lp, 0, 0.06, 0.02, 0.12, 0.11, 0.11, color);
        lp.push([0, 0.04, 0.12], 0, Math.PI / 2).cyl(0, 0, 0, 0.035, 0, 0.08, 4, '#d9a441', { jitter: 0 }).pop();
        for (const s of [-1, 1]) {
          ball(lp, s * 0.055, 0.09, 0.1, 0.025, 0.03, 0.012, eye, eye === INK ? {} : { bucket: 'glow' });
          ball(lp, s * 0.055 - 0.008, 0.1, 0.11, 0.009, 0.009, 0.005, WHITE);
        }
      },
      armL: wing(-1), armR: wing(1),
      legL: (lp) => { lp.cyl(0, -0.1, 0, 0.012, 0.012, 0.1, 4, '#d9a441', { jitter: 0 }); ball(lp, 0, -0.1, 0.02, 0.03, 0.012, 0.035, '#d9a441'); },
      legR: (lp) => { lp.cyl(0, -0.1, 0, 0.012, 0.012, 0.1, 4, '#d9a441', { jitter: 0 }); ball(lp, 0, -0.1, 0.02, 0.03, 0.012, 0.035, '#d9a441'); },
    },
  };
}

function kDuck(): KawaiiSpec {
  const B = LPC.bone;
  const foot: Build = (lp) => { lp.cyl(0, -0.12, 0, 0.014, 0.014, 0.12, 4, LPC.gold, { jitter: 0 }); ball(lp, 0, -0.12, 0.03, 0.04, 0.012, 0.05, LPC.gold); };
  return {
    scale: 1.3,
    pivots: { body: [0, 0.12, 0], head: [0, 0.3, 0.08], legL: [-0.06, 0.12, 0], legR: [0.06, 0.12, 0] },
    parts: {
      body: (lp) => {
        ball(lp, 0, 0.06, 0, 0.15, 0.12, 0.19, B);
        for (let i = 0; i < 3; i++) lp.push([0, 0.06, -0.06 + i * 0.07]).add(new THREE.TorusGeometry(0.13, 0.01, 3, 10, Math.PI * 1.1).rotateZ(-Math.PI * 0.05), LPC.boneDark, { jitter: 0 }).pop();
        lp.push([0, 0.1, -0.17], 0, -0.8).cyl(0, 0, 0, 0.05, 0.0, 0.1, 4, B, { jitter: 0 }).pop();
      },
      head: (lp) => {
        lp.cyl(0, -0.1, 0, 0.035, 0.04, 0.12, 6, B, { jitter: 0 });
        ball(lp, 0, 0.05, 0.0, 0.12, 0.11, 0.11, B);
        sbox(lp, 0, 0.0, 0.12, 0.11, 0.04, 0.09, 0.015, LPC.gold);
        for (const s of [-1, 1]) {
          ball(lp, s * 0.055, 0.08, 0.095, 0.03, 0.034, 0.012, '#25232a');
          ball(lp, s * 0.055 - 0.008, 0.09, 0.105, 0.01, 0.01, 0.005, WHITE);
        }
      },
      legL: foot, legR: foot,
    },
  };
}

/** Genera la geometria di una parte (stessa pipeline dei modelli low-poly). */
export function buildKawaiiPart(kind: string, part: KPart): LPModel | null {
  const spec = KAWAII[kind];
  const build = spec?.parts[part];
  if (!build) return null;
  const lp = new LP(`kawaii:${kind}:${part}`);
  build(lp);
  return lp.build();
}

/** Generatori per chiave "tipo:parte" (registrati dall'adapter low-poly). */
export function kawaiiGenerators(): Record<string, () => LPModel> {
  const out: Record<string, () => LPModel> = {};
  for (const [kind, spec] of Object.entries(KAWAII)) {
    for (const part of Object.keys(spec.parts) as KPart[]) out[`${kind}:${part}`] = () => buildKawaiiPart(kind, part)!;
  }
  return out;
}
