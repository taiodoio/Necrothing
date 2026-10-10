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
  mouth?: 'smile' | 'o' | 'flat' | 'none' | 'grin';
  eyes?: 'open' | 'closed' | 'sleepy' | 'none';
  blush?: boolean | string; bucket?: 'ghost';
}

/** Faccia kawaii sulla superficie z = o.z. */
function face(lp: LP, o: FaceOpts) {
  const dx = o.dx ?? 0.11, r = o.r ?? 0.05, ink = o.ink ?? INK, bucket = o.bucket;
  const eyes = o.eyes ?? 'open';
  for (const s of [-1, 1]) {
    if (eyes === 'open') {
      ball(lp, s * dx, o.y, o.z, r * 0.85, r * 1.1, 0.02, ink, { bucket });
      ball(lp, s * dx - r * 0.3, o.y + r * 0.42, o.z + 0.016, r * 0.32, r * 0.32, 0.01, WHITE);
      ball(lp, s * dx + r * 0.3, o.y - r * 0.4, o.z + 0.014, r * 0.15, r * 0.15, 0.008, WHITE);
    } else if (eyes === 'closed' || eyes === 'sleepy') {
      // archetto (occhi chiusi felici / assonnati)
      const arc = new THREE.TorusGeometry(r * 0.75, 0.009, 3, 7, Math.PI);
      if (eyes === 'sleepy') arc.rotateZ(Math.PI);
      lp.add(arc.translate(s * dx, o.y - (eyes === 'sleepy' ? -0.01 : 0.02), o.z + 0.004), ink, { jitter: 0, ao: 0, bucket });
    }
  }
  if (o.blush !== false) for (const s of [-1, 1]) ball(lp, s * (dx + 0.06), o.y - 0.07, o.z - 0.004, 0.042, 0.022, 0.012, typeof o.blush === 'string' ? o.blush : BLUSH, { bucket });
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

interface KH {
  coat: string; coat2: string; skin: string; pants: string; boots: string; arm?: string; cuff?: string;
  robe?: boolean;
  face?: Partial<FaceOpts>;
  hat?: Build; hair?: Build; extraHead?: Build;
  heldL?: Build; heldR?: Build; back?: Build; chest?: Build;
}

function kHumanoid(o: KH): KawaiiSpec {
  const arm = o.arm ?? o.coat;
  const leg: Build = (lp) => {
    ball(lp, 0, -0.01, 0, 0.07, 0.06, 0.07, o.pants); // anca dentro il busto
    lp.cyl(0, -0.17, 0, 0.064, 0.068, 0.17, 7, o.pants, { jitter: 0, vary: 0.04, ao: 0.1 });
    sbox(lp, 0, -0.2, 0.025, 0.145, 0.1, 0.2, 0.045, o.boots);
  };
  const armB = (held?: Build): Build => (lp) => {
    ball(lp, 0, 0, 0, 0.078, 0.078, 0.078, arm); // spalla sferica, entra nel busto
    lp.cyl(0, -0.22, 0, 0.07, 0.068, 0.22, 7, arm, { jitter: 0, vary: 0.04, ao: 0.08 });
    lp.cyl(0, -0.235, 0, 0.074, 0.074, 0.04, 7, o.cuff ?? o.coat2, { jitter: 0, ao: 0 });
    ball(lp, 0, -0.275, 0.005, 0.064, 0.064, 0.064, o.skin); // manina
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
          lp.lathe(0, -0.195, 0, [[0.25, 0], [0.245, 0.06], [0.22, 0.2], [0.2, 0.36], [0.17, 0.39], [0, 0.4]], 10, o.coat2, { jitter: 0, vary: 0.04, ao: 0.15 });
          sbox(lp, 0, -0.02, 0, 0.4, 0.39, 0.31, 0.09, o.coat);
        } else {
          sbox(lp, 0, -0.03, 0, 0.4, 0.4, 0.3, 0.09, o.coat);
          // falda del cappotto appena svasata
          lp.lathe(0, -0.07, 0, [[0.225, 0], [0.22, 0.05], [0.205, 0.12], [0, 0.12]], 10, o.coat2, { jitter: 0, vary: 0.04, ao: 0.12 });
        }
        o.chest?.(lp);
        o.back?.(lp);
      },
      head: (lp) => {
        sbox(lp, 0, -0.02, 0, HEAD_W, HEAD_H, HEAD_D, 0.13, o.skin, { ao: 0.04 });
        for (const s of [-1, 1]) ball(lp, s * (HEAD_W / 2 + 0.005), 0.18, 0, 0.035, 0.05, 0.035, o.skin); // orecchie
        face(lp, { z: HEAD_D / 2, y: 0.18, ...o.face });
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

function shovel(len = 0.78): Build {
  return (lp) => {
    const bottom = -0.62;
    lp.cyl(0, bottom, 0.07, 0.022, 0.022, len, 6, LPC.woodLight, { jitter: 0 });
    sbox(lp, 0, bottom + len, 0.07, 0.13, 0.035, 0.045, 0.012, LPC.woodDark);
    const blade = new THREE.Shape();
    blade.moveTo(-0.08, 0); blade.lineTo(0.08, 0); blade.quadraticCurveTo(0.09, -0.14, 0, -0.2); blade.quadraticCurveTo(-0.09, -0.14, -0.08, 0);
    lp.push([0, bottom + 0.02, 0.07]).extrude(blade, 0.03, '#8b96a0', { bevel: 0.008, jitter: 0, curve: 3 }).pop();
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

// ── Catalogo dei prototipi ──────────────────────────────────────────────

export const KAWAII: Record<string, KawaiiSpec> = {
  custode: kHumanoid({
    coat: '#6e4c36', coat2: '#5a3d2b', skin: SKIN, pants: '#3a3230', boots: '#2b211c',
    face: { mouth: 'smile' },
    hair: (lp) => {
      for (const [x, y, r] of [[-0.2, 0.36, 0.07], [0.2, 0.35, 0.065], [-0.08, 0.38, 0.06], [0.07, 0.385, 0.055]] as const) ball(lp, x, y, 0.2, r, r * 0.8, 0.05, '#6b4a33');
      for (const s of [-1, 1]) ball(lp, s * 0.27, 0.3, -0.02, 0.05, 0.08, 0.12, '#6b4a33');
    },
    hat: wideHat('#4a3326', '#2a2220'),
    chest: scarf('#a4473b', '#d9b48a'),
    back: (lp) => { sbox(lp, 0, 0.04, -0.2, 0.3, 0.28, 0.12, 0.04, '#7a5a3c'); sbox(lp, 0, 0.2, -0.27, 0.22, 0.09, 0.04, 0.02, '#5c4029'); },
    heldR: shovel(),
    heldL: handLantern(),
  }),
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
        face(lp, { z: 0.318, y: 0.36, dx: 0.1, r: 0.055, mouth: 'o' });
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
          if (!o.bones) ball(lp, s * H * 0.36, H * 0.26, z - 0.004, H * 0.08, H * 0.04, 0.01, BLUSH);
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
