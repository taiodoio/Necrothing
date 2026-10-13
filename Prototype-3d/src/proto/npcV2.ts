// PROTOTIPO (non incluso nel gioco): gli altri personaggi nello stile v2 del
// Custode. Gli umani usano lo stesso costruttore del Custode (testa grande a
// superellissoide, capelli a casco di ciocche, barba disegnata per contorni,
// corpo a pera) con aggiunte; fantasmi e animali riusano gli stessi pezzi
// (testa implicita, occhi lucidi con la stella, ciuffi a casco) su forme proprie.

import * as THREE from 'three';
import type { LP, LPOpts } from '../render/lowpoly/kit.ts';
import { instantiate } from '../render/modelCache.ts';
import {
  buildCustodeV2, beginCreature, eyes, hairLayer, headAt, headFront, headGeo, surfaceAlong, headCenter, headRadii, onSkin, sheet, taperTube, rbox, shade,
  smooth, lerp, DEG, O, footGeo, model, diorama, type CustodeV2,
} from './custodeV2.ts';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const D2 = { ...O, detail: 2 } as LPOpts;
const D1 = { ...O, detail: 1 } as LPOpts;
const INK = '#2a1a1c';
const BONE = '#e2d9c3', BONE_D = '#b9ae95';
const GOLD = '#c9a227';

// ── Oggetti in mano (origine al centro della mano) ──────────────────────

function shovel(lp: LP) {
  lp.cyl(0, -0.09, 0.03, 0.018, 0.018, 0.64, 6, '#82634b', O); // manico
  lp.add(rbox(0.1, 0.026, 0.032, 0.01, 1).translate(0, 0.56, 0.03), '#49372e', O); // impugnatura a T
  lp.cyl(0, -0.1, 0.03, 0.026, 0.02, 0.05, 6, '#5c6168', O); // ghiera
  lp.add(rbox(0.13, 0.15, 0.022, 0.03, 2).translate(0, -0.17, 0.03), '#8d9196', O); // lama
}

function book(lp: LP) {
  lp.push([-0.01, 0.0, 0.07]);
  lp.add(rbox(0.05, 0.2, 0.15, 0.012, 1), '#7a2a2c', O);
  lp.add(new THREE.BoxGeometry(0.04, 0.18, 0.14).translate(0.004, 0, 0.006), '#efe6d0', O); // pagine
  lp.add(new THREE.BoxGeometry(0.006, 0.11, 0.022).translate(-0.027, 0.01, 0), GOLD, O); // croce
  lp.add(new THREE.BoxGeometry(0.006, 0.022, 0.07).translate(-0.027, 0.035, 0), GOLD, O);
  lp.pop();
}

function lily(lp: LP) {
  lp.add(taperTube([v(0, -0.02, 0.06), v(0.01, 0.14, 0.08), v(0.0, 0.3, 0.1)], [0.008, 0.008, 0.007], 5), '#4d6640', O);
  lp.blob(0.03, 0.12, 0.08, 0.03, 0.012, 0.05, '#4d6640', D1); // foglia
  lp.push([0, 0.31, 0.1], 0, -0.4);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; lp.push([0, 0, 0], a, 0.9).blob(0, 0.05, 0, 0.022, 0.06, 0.012, '#fbf7ef', D1).pop(); }
  lp.blob(0, 0.01, 0, 0.018, 0.018, 0.018, GOLD, D1);
  lp.pop();
}

function umbrella(lp: LP) {
  lp.cyl(0, -0.21, 0.06, 0.01, 0.01, 0.4, 5, '#141418', O); // asta con puntale a terra
  lp.lathe(0, -0.15, 0.06, [[0.01, 0], [0.05, 0.05], [0.055, 0.17], [0.03, 0.27], [0.012, 0.3], [0, 0.3]], 8, '#1f2026', O); // tela arrotolata
  lp.add(new THREE.TorusGeometry(0.04, 0.012, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(0, 0.19, 0.02), '#49372e', O); // manico a uncino
  lp.blob(0, 0.03, 0.06, 0.016, 0.012, 0.016, '#5a2a30', D1); // laccetto
}

// ── Cappelli su misura (spazio della testa) ─────────────────────────────

/** Coppola morbida con visiera. */
function flatCap(col: string) {
  return (lp: LP) => {
    sheet(lp, 36, 6, (u, w) => [Math.PI + u * Math.PI, lerp(30, 90, w) * DEG], (u, w) => 0.03 + 0.045 * smooth(0, 0.7, w) + 0.02 * smooth(0.4, 1, w) * (Math.cos(u * Math.PI) > 0 ? 1 : 0.6), col);
    const f = headAt(0, 31 * DEG);
    lp.push([0, f.p.y + 0.015, f.p.z + 0.04], 0, 0.28);
    lp.add(rbox(0.34, 0.026, 0.15, 0.012, 2), shade(col, -0.06), O);
    lp.pop();
    const c = headCenter(), r = headRadii();
    lp.blob(c.x, c.y + r.y + 0.085, c.z, 0.03, 0.02, 0.03, shade(col, -0.06), D1);
  };
}

/** Saturno del prete: tesa larga e piatta, cupola tonda, nastro. */
function saturno(col: string, ph: number) {
  return (lp: LP) => {
    const c = headCenter();
    const at = (th: number) => headAt(th, (ph - 4) * DEG).p;
    const y = at(0).y;
    const rr = Math.max(...[0, 90, 180, -90].map((t) => Math.hypot(at(t * DEG).x - c.x, at(t * DEG).z - c.z))) + 0.04;
    lp.cyl(c.x, y - 0.01, c.z, 0.46, 0.45, 0.032, 22, col, O);
    lp.blob(c.x, y + 0.02, c.z, rr, rr * 0.75, rr, col, { ...O, detail: 2 } as LPOpts);
    lp.cyl(c.x, y + 0.015, c.z, rr + 0.004, rr * 0.98, 0.04, 18, '#3a2a2e', O);
  };
}

/** Cappellino del corteo, inclinato sulla testa, con fiore e veletta. */
function veilHat(lp: LP) {
  onSkin(lp, headAt(0.35, 60 * DEG), 0.07, 0.2, (q) => {
    q.push([0, 0, 0], 0, Math.PI / 2);
    q.cyl(0, -0.02, 0, 0.2, 0.19, 0.022, 16, '#15151a', O);
    q.cyl(0, 0, 0, 0.12, 0.11, 0.08, 14, '#15151a', O);
    q.cyl(0, 0.005, 0, 0.122, 0.12, 0.025, 14, '#4a3a48', O);
    q.pop();
    q.blob(0.11, -0.04, 0.03, 0.045, 0.045, 0.045, '#c9b8c8', D1);
    q.blob(0.11, -0.04, 0.07, 0.018, 0.018, 0.018, GOLD, D1);
  });
  // veletta: retina scura sulla fronte
  sheet(lp, 14, 2, (u, w) => [u * 50 * DEG, lerp(38, 58, w) * DEG], () => 0.03, '#3a3540', { vary: 0 });
}

// ── Umani ───────────────────────────────────────────────────────────────

export interface Preset { name: string; build: () => CustodeV2 }

const gravedigger = () => buildCustodeV2(
  {
    skin: '#ebbf9c', sparkle: false, hair: 'tufts', hairColor: '#6b4a33', eyes: '#3b2a1e', beard: 'full', beardColor: '#8a6447', mustache: 'bushy',
    outfit: 'overalls', outfitColor: '#56664b', accentColor: '#c9b79c',
  },
  {
    name: 'becchino', eyes: 'sleepy', mouth: 'none', hatPh: 34, hat: flatCap('#55534e'),
    hair: { tip: (a) => (a < 70 ? 30 : lerp(20, -20, smooth(70, 150, a))), depth: 8 },
    head: (lp) => {
      onSkin(lp, headFront(0, 0.665), 0.03, 0, (q) => q.blob(0, 0, 0, 0.042, 0.036, 0.034, '#e0a98a', D1)); // nasone
      for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.1, 0.775), 0.006, -s * 0.15, (q) => q.add(rbox(0.08, 0.018, 0.012, 0.006, 1), '#6b4a33', O)); // sopracciglia
    },
    chest: (lp) => { lp.add(rbox(0.07, 0.07, 0.012, 0.01, 1).translate(0.07, 0.3, 0.212).rotateX(-0.32), '#8a7a55', O); }, // toppa
    held: [{ side: 1, build: shovel }],
  },
);

const priest = () => buildCustodeV2(
  {
    skin: '#f2cfb0', sparkle: false, hair: 'tufts', hairColor: '#cfc8bf', eyes: '#3b2a1e', glasses: 'round', beard: 'none', mustache: 'none',
    outfitColor: '#25272f', accentColor: '#3a2a2e',
  },
  {
    name: 'prete', robe: true, blush: '#e5a89f', hatPh: 52, hat: saturno('#16171c', 52),
    hair: { tip: () => -14, span: [78, 282], depth: 6, top: 22 }, // corona grigia ai lati e dietro
    sleeve: '#25272f', cuff: '#16171c',
    chest: (lp) => {
      lp.add(rbox(0.07, 0.04, 0.012, 0.008, 1).translate(0, 0.475, 0.155), '#fbf7ef', O); // collarino
      lp.push([0, 0.36, 0.205], 0, -0.3);
      lp.add(new THREE.BoxGeometry(0.022, 0.12, 0.012), GOLD, O);
      lp.add(new THREE.BoxGeometry(0.075, 0.022, 0.012).translate(0, 0.025, 0), GOLD, O);
      lp.pop();
    },
    held: [{ side: -1, build: book }],
  },
);

const mourner = () => buildCustodeV2(
  {
    skin: '#f0d2bd', sparkle: false, hair: 'bun', hairColor: '#2a2226', eyes: '#1b1a20', beard: 'none', mustache: 'none',
    outfitColor: '#2b2b35', accentColor: '#4a3a48',
  },
  {
    name: 'corteo-a', eyes: 'closed', mouth: 'flat', blush: '#d99a9a', robe: true, hat: veilHat,
    head: (lp) => onSkin(lp, headFront(0.13, 0.65), 0.012, 0, (q) => q.blob(0, 0, 0, 0.014, 0.022, 0.01, '#8fc4e6', { ...D1, bucket: 'glow' })), // lacrimuccia
    chest: (lp) => { for (const y of [0.25, 0.32, 0.39]) lp.blob(0, y, 0.2 + (0.39 - y) * 0.15, 0.014, 0.014, 0.008, '#5a5a66', D1); },
    held: [{ side: 1, build: lily }],
  },
);

const mournerB = () => buildCustodeV2(
  {
    skin: '#efc9aa', sparkle: false, hair: 'tufts', hairColor: '#bdb6ad', eyes: '#3b2a1e', beard: 'none', mustache: 'bushy', beardColor: '#5b5550',
    hat: 'top', hatColor: '#141418', outfit: 'coat', outfitColor: '#2a2c33', accentColor: '#5a2a30',
  },
  {
    name: 'corteo-b', eyes: 'sleepy', mouth: 'none', plainCoat: true,
    chest: (lp) => {
      lp.push([0, 0.42, 0.17], 0, -0.45);
      lp.add(rbox(0.1, 0.12, 0.012, 0.01, 1), '#d8d0c2', O); // sparato della camicia
      lp.blob(0, 0.04, 0.012, 0.03, 0.018, 0.01, '#5a2a30', D1); // fiocco
      lp.pop();
    },
    held: [{ side: 1, build: umbrella }],
  },
);

const zombie = () => buildCustodeV2(
  {
    skin: '#a4c487', sparkle: false, hair: 'none', eyes: '#1b1a20', beard: 'none', mustache: 'none',
    outfit: 'coat', outfitColor: '#5d6449', accentColor: '#8a7a55',
  },
  {
    name: 'zombie', eyes: 'zombie', mouth: 'stitched', blush: '#c98a8a', armPose: 'forward', plainCoat: true, pants: '#43403a', boot: '#3a3128', cuff: '#4a503a',
    head: (lp) => {
      // cervello che fa capolino da una crepa, cicatrice cucita
      const top = headAt(0.5, 62 * DEG);
      const c = top.p.clone().addScaledVector(top.n, 0.01);
      for (const [dx, dz, r] of [[0, 0, 0.07], [0.05, -0.03, 0.055], [-0.04, 0.02, 0.05]]) lp.blob(c.x + dx, c.y, c.z + dz, r, r * 0.7, r, '#e3a3b0', D1);
      onSkin(lp, headAt(-0.35, 40 * DEG), 0.003, 0.3, (q) => {
        q.add(rbox(0.13, 0.01, 0.006, 0.004, 1), '#4a5a3a', O);
        for (let i = -2; i <= 2; i++) q.add(rbox(0.008, 0.04, 0.006, 0.003, 1).translate(i * 0.025, 0, 0.002), '#4a5a3a', O);
      });
    },
    chest: (lp) => {
      // orlo strappato della giacca e toppa
      for (let i = 0; i < 9; i++) {
        const a = (-0.55 + i * 0.137) * Math.PI;
        lp.push([Math.sin(a) * 0.235, 0.2, Math.cos(a) * 0.2], a, 0, i % 2 ? 0.3 : -0.3);
        lp.add(new THREE.ConeGeometry(0.03, 0.06, 3).rotateX(Math.PI), '#5d6449', O);
        lp.pop();
      }
      lp.add(rbox(0.08, 0.08, 0.012, 0.01, 1).translate(-0.09, 0.32, 0.2).rotateY(-0.3), '#8a7a55', O);
    },
    held: [
      { side: -1, build: (lp) => { lp.cyl(0, -0.03, 0, 0.074, 0.074, 0.03, 9, '#e8e0cc', O); lp.cyl(0, 0.02, 0, 0.074, 0.074, 0.025, 9, '#d8d0bc', O); } }, // bende
    ],
  },
);

/** Scheletro: stessa testa (un teschio), corpo di ossa. */
const skeleton = () => buildCustodeV2(
  { skin: BONE, sparkle: false, hair: 'none', eyes: '#8ff0dc', beard: 'none', mustache: 'none' },
  {
    name: 'scheletro', eyes: 'sockets', mouth: 'none', ears: false, held: [],
    head: (lp) => {
      onSkin(lp, headFront(0, 0.645), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.03, 3).rotateZ(-Math.PI / 2).scale(1, 1.2, 1), '#1e1b22', O)); // naso
      onSkin(lp, headFront(0, 0.612), 0.002, 0, (q) => q.add(rbox(0.17, 0.008, 0.006, 0.003, 1).translate(0, 0.022, 0), '#8e8676', O));
      for (let i = -2.5; i <= 2.5; i++) onSkin(lp, headFront(i * 0.03, 0.59), 0.008, 0, (q) => q.add(rbox(0.025, 0.04, 0.02, 0.007, 1), '#f3ecda', O)); // denti
      onSkin(lp, headAt(-0.5, 45 * DEG), 0.002, 1.1, (q) => q.add(rbox(0.08, 0.008, 0.006, 0.003, 1), '#8e8676', O)); // crepa
    },
    body: (lp) => {
      lp.add(taperTube([v(0, 0.18, -0.03), v(0, 0.33, -0.06), v(0, 0.48, -0.03), v(0, 0.56, 0)], [0.028, 0.03, 0.028, 0.026], 6), BONE_D, O); // spina
      lp.blob(0, 0.19, 0, 0.13, 0.06, 0.09, BONE, D2); // bacino
      for (let i = 0; i < 3; i++) {
        lp.push([0, 0.29 + i * 0.058, -0.03], 0, 0, 0, [1, 1, 0.78]);
        lp.add(new THREE.TorusGeometry(0.15 - Math.abs(i - 1) * 0.01 - (i === 2 ? 0.01 : 0), 0.026, 5, 18, Math.PI * 1.7).rotateX(Math.PI / 2).rotateY(-0.65 * Math.PI), BONE, O);
        lp.pop();
      }
      lp.add(rbox(0.04, 0.15, 0.025, 0.01, 1).translate(0, 0.35, 0.095), BONE, O); // sterno
      lp.add(taperTube([v(-0.18, 0.46, 0), v(0, 0.48, 0.04), v(0.18, 0.46, 0)], [0.026, 0.03, 0.026], 6), BONE, O); // clavicole
      // papillon
      lp.push([0, 0.5, 0.09]);
      for (const s of [-1, 1]) lp.add(new THREE.ConeGeometry(0.035, 0.07, 4).rotateZ(-s * Math.PI / 2).translate(s * 0.035, 0, 0), '#8e2f2f', O);
      lp.blob(0, 0, 0.005, 0.02, 0.02, 0.02, '#8e2f2f', D1);
      lp.pop();
      for (const s of [-1, 1]) {
        const sh = v(s * 0.18, 0.46, 0), el = v(s * 0.23, 0.33, 0.02), wr = v(s * 0.26, 0.23, 0.05);
        lp.add(taperTube([sh, el], [0.032, 0.027], 6), BONE, O);
        lp.add(taperTube([el, wr], [0.027, 0.024], 6), BONE, O);
        for (const j of [sh, el]) lp.blob(j.x, j.y, j.z, 0.04, 0.04, 0.04, BONE, D1);
        lp.blob(wr.x, wr.y - 0.02, wr.z, 0.04, 0.035, 0.035, BONE, D1); // mano
        for (let f = -1; f <= 1; f++) lp.add(taperTube([v(wr.x + f * 0.018, wr.y - 0.04, wr.z + 0.01), v(wr.x + f * 0.022, wr.y - 0.09, wr.z + 0.02)], [0.01, 0.008], 4), BONE, O);
        const hip = v(s * 0.08, 0.17, 0), kn = v(s * 0.085, 0.1, 0.015), an = v(s * 0.09, 0.035, 0.01);
        lp.add(taperTube([hip, kn], [0.036, 0.031], 6), BONE, O);
        lp.add(taperTube([kn, an], [0.031, 0.027], 6), BONE, O);
        lp.blob(kn.x, kn.y, kn.z, 0.036, 0.034, 0.036, BONE, D1);
        lp.add(footGeo(0.08, 0.15, 0.035, 0.012).translate(an.x, 0, 0.05), BONE, O);
      }
    },
  },
);

// ── Fantasmi ────────────────────────────────────────────────────────────

/** Fantasmino: la testa stessa è il corpo (superellissoide), sotto si apre in una gonna a onde. */
function ghost(rare: boolean): CustodeV2 {
  const col = rare ? '#ffe0b2' : '#d7f2ea';
  beginCreature({ c: [0, 0.46, 0], r: [0.3, 0.36, 0.28], pw: 2.05, cheek: 0.04, eyeX: 0.105, eyeY: 0.5, eyeS: 1.05 });
  const C0 = headCenter();
  const g = { bucket: 'ghost' as const };
  const char = model((lp) => {
    // icosfera sulla superficie sopra l'equatore; sotto scende dritta e si chiude in un orlo a onde
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const d = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      if (d.y >= 0) { const p = surfaceAlong(d); pos.setXYZ(i, p.x, p.y, p.z); continue; }
      const t = -d.y, a = Math.atan2(d.x, d.z);
      const h = new THREE.Vector3(d.x, 0, d.z).normalize();
      const e = surfaceAlong(h);
      const hem = 0.03 + 0.05 * (0.5 + 0.5 * Math.cos(a * 6));
      const r = Math.hypot(e.x - C0.x, e.z - C0.z) * (1 + 0.1 * smooth(0, 0.8, t)) * smooth(1, 0.82, t);
      const y = lerp(C0.y, hem, smooth(0, 0.8, t));
      pos.setXYZ(i, C0.x + h.x * r, y, C0.z + h.z * r);
    }
    lp.add(geo, col, { ...g, vary: 0.03 });
    // bocca a "o", guance, manine
    onSkin(lp, headFront(0, 0.41), 0.004, 0, (q) => q.add(new THREE.CircleGeometry(0.02, 10).scale(1, 1.25, 1), '#3a4a52', O));
    for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.18, 0.44), 0.003, 0, (q) => q.add(new THREE.CircleGeometry(0.035, 10).scale(1.3, 0.7, 1), '#f2a6a6', O));
    for (const s of [-1, 1]) lp.blob(s * 0.3, 0.3, 0.05, 0.05, 0.075, 0.05, col, { ...D2, ...g });
    if (rare) { // fiocco
      onSkin(lp, headAt(0.45, 55 * DEG), 0.02, -0.3, (q) => {
        for (const s of [-1, 1]) q.add(new THREE.ConeGeometry(0.05, 0.1, 4).rotateZ(-s * Math.PI / 2).translate(s * 0.05, 0, 0), '#e07a6a', O);
        q.blob(0, 0, 0.01, 0.026, 0.026, 0.026, '#e07a6a', D1);
      });
    }
    lp.light(0, 0.4, 0, rare ? '#ffcf8a' : '#85c8ba', 0.7, 3.5, 0.25, 1.3);
  }, `proto:ghost-v2:${rare}`);
  const root = new THREE.Group();
  root.add(instantiate(char, { castShadow: false }));
  root.add(eyes('open', '#28404a', col));
  root.position.y = 0.12; // fluttua
  return { root, diorama: zolla(), lights: [] };
}

// ── Animali ─────────────────────────────────────────────────────────────

function zolla() {
  const d = model(diorama, 'proto:zolla');
  const dio = instantiate(d, { castShadow: true });
  dio.traverse((o) => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
  return dio;
}

/** Spazio della testa: lo stesso per la geometria (LP) e per gli occhi (Group). */
function headSpace(lp: LP, pos: [number, number, number], rx: number, s: number) {
  lp.push(pos, 0, rx, 0, s);
  const g = new THREE.Group();
  g.position.set(...pos); g.rotation.set(rx, 0, 0, 'YXZ'); g.scale.setScalar(s);
  return g;
}

/** Costole scure attorno al corpo (animaletti-scheletro). */
function ribs(lp: LP, y: number, z0: number, z1: number, rx: number, ry: number, n = 3) {
  for (let i = 0; i < n; i++) {
    lp.push([0, y, lerp(z0, z1, i / (n - 1))], 0, 0, 0, [rx * 1.04, ry * 1.04, 0.16]);
    lp.add(new THREE.TorusGeometry(1, 0.1, 4, 14, Math.PI * 1.25).rotateZ(-Math.PI * 0.125), BONE_D, O);
    lp.pop();
  }
}

interface Quad {
  name: string; color: string; belly?: string; bones?: boolean; eyes: string; glow?: boolean;
  head: [number, number, number]; ears: 'cat' | 'dog' | 'rabbit' | 'round'; tail: 'up' | 'long' | 'wag' | 'pom';
  snout?: boolean; ruff?: boolean; whiskers?: boolean; nose: string; inner: string;
}

/** Quadrupede: testa enorme a superellissoide (come il Custode), corpo a fagiolo, zampette, ciuffi a casco. */
function quad(o: Quad): CustodeV2 {
  beginCreature({ c: [0, 0, 0], r: o.head, pw: 2.4, cheek: 0.12, eyeX: o.head[0] * 0.42, eyeY: -o.head[1] * 0.05, eyeS: 0.85 * o.head[0] / 0.2 });
  const tone = (k: number) => shade(o.color, k);
  let eyeG: THREE.Group | null = null;
  const char = model((lp) => {
    // corpo: fagiolo con petto pieno, zampette a colonna con il polpastrello
    lp.blob(0, 0.2, -0.04, 0.14, 0.13, 0.2, o.color, D2);
    lp.blob(0, 0.23, 0.1, 0.12, 0.12, 0.1, o.belly ?? o.color, D2);
    if (o.bones) ribs(lp, 0.2, -0.13, 0.06, 0.145, 0.135);
    for (const [x, z] of [[-0.08, 0.12], [0.08, 0.12], [-0.08, -0.15], [0.08, -0.15]]) {
      lp.cyl(x, 0.03, z, 0.045, 0.05, 0.14, 8, o.color, { ...O, ao: 0.1 });
      lp.blob(x, 0.03, z + 0.015, 0.05, 0.035, 0.06, o.bones ? BONE_D : tone(0.04), D1);
    }
    const tails: Record<Quad['tail'], () => void> = {
      up: () => lp.add(taperTube([v(0, 0.24, -0.22), v(0, 0.36, -0.32), v(0, 0.5, -0.3), v(0.02, 0.55, -0.24)], [0.035, 0.032, 0.028, 0.022], 7), o.color, O),
      long: () => lp.add(taperTube([v(0, 0.17, -0.22), v(0.04, 0.06, -0.36), v(0.14, 0.03, -0.46), v(0.22, 0.05, -0.5)], [0.02, 0.016, 0.011, 0.006], 5), '#d6a3a3', O),
      wag: () => lp.add(taperTube([v(0, 0.25, -0.22), v(0, 0.34, -0.3), v(0.03, 0.43, -0.33)], [0.03, 0.025, 0.018], 6), o.color, O),
      pom: () => lp.blob(0, 0.24, -0.25, 0.06, 0.06, 0.06, '#fbf7ef', D2),
    };
    tails[o.tail]();
    // testa
    eyeG = headSpace(lp, [0, 0.42, 0.16], 0.08, 1);
    lp.add(headGeo(), o.color, { ...O, ao: 0.05 });
    const R0 = o.head;
    if (o.ruff) hairLayer(lp, { locks: 11, hem: () => -58, depth: 14, lift: 0.02, thick: 0.035, phase: 0, swirl: 0, seed: 4, tone, top: -8, span: [55, 305] }); // guance a ciuffi
    if (o.ruff) for (const [th, h] of [[-12, 0.06], [8, 0.07], [26, 0.05]]) { // ciuffetto in cima
      const { p, n } = headAt(th * DEG, 80 * DEG);
      const g = new THREE.ConeGeometry(0.025, h, 5).translate(0, h / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), n.clone().add(v(0, 0, -0.4)).normalize()));
      lp.add(g.translate(p.x, p.y, p.z), tone(0.03), O);
    }
    if (o.bones) for (const s of [-1, 1]) onSkin(lp, headFront(s * R0[0] * 0.42, -R0[1] * 0.05), 0.001, 0, (q) => q.add(new THREE.CircleGeometry(0.062 * R0[0] / 0.2, 12).scale(1, 1.1, 1), '#2b2730', O)); // orbite
    // muso, naso, boccuccia
    const mz = headFront(0, -R0[1] * 0.42);
    if (o.snout) onSkin(lp, mz, 0.015, 0, (q) => q.blob(0, 0.01, 0, R0[0] * 0.32, R0[1] * 0.24, R0[2] * 0.3, o.belly ?? tone(0.05), D2));
    const nz = headFront(0, -R0[1] * 0.26);
    onSkin(lp, nz, o.snout ? 0.06 : 0.008, 0, (q) => q.add(new THREE.CircleGeometry(0.02, 3).rotateZ(-Math.PI / 2).scale(1.3, 1, 1), o.nose, O));
    onSkin(lp, headFront(0, -R0[1] * 0.45), o.snout ? 0.055 : 0.004, 0, (q) => {
      for (const s of [-1, 1]) q.add(new THREE.TorusGeometry(0.012, 0.004, 3, 8, Math.PI).rotateZ(Math.PI).translate(s * 0.012, 0, 0), INK, O);
    });
    if (!o.bones) for (const s of [-1, 1]) onSkin(lp, headFront(s * R0[0] * 0.62, -R0[1] * 0.38), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.028, 10).scale(1.3, 0.7, 1), '#e5958f', O));
    if (o.whiskers) for (const s of [-1, 1]) for (const k of [-1, 1]) {
      const a = headFront(s * R0[0] * 0.35, -R0[1] * 0.35);
      const p0 = a.p.addScaledVector(a.n, 0.03);
      lp.add(taperTube([p0, p0.clone().add(v(s * 0.13, 0.02 * k, -0.01))], [0.004, 0.002], 3), '#d8d0c2', O);
    }
    // orecchie
    for (const s of [-1, 1]) {
      if (o.ears === 'cat') onSkin(lp, headAt(s * 38 * DEG, 52 * DEG), -0.01, 0, (q) => {
        q.add(new THREE.ConeGeometry(0.075, 0.14, 6).rotateX(Math.PI / 2).translate(0, 0, 0.06), o.color, O);
        q.add(new THREE.ConeGeometry(0.045, 0.09, 6).rotateX(Math.PI / 2).scale(1, 0.5, 1).translate(0, -0.03, 0.06), o.inner, O);
      });
      if (o.ears === 'round') onSkin(lp, headAt(s * 50 * DEG, 45 * DEG), 0.02, 0, (q) => {
        q.blob(0, 0, 0, 0.075, 0.075, 0.022, o.color, D1);
        q.blob(0, 0, 0.012, 0.05, 0.05, 0.014, o.inner, D1);
      });
      if (o.ears === 'dog') { const { p } = headAt(s * 80 * DEG, 35 * DEG); lp.push([p.x, p.y, p.z], 0, 0, s * 0.3); lp.blob(s * 0.02, -0.08, 0, 0.055, 0.11, 0.035, o.bones ? BONE_D : tone(-0.06), D2); lp.pop(); }
      if (o.ears === 'rabbit') { const { p } = headAt(s * 22 * DEG, 72 * DEG); lp.push([p.x, p.y, p.z], 0, -0.25, -s * 0.18); lp.blob(0, 0.15, 0, 0.055, 0.17, 0.03, o.color, D2); lp.blob(0, 0.15, 0.016, 0.03, 0.13, 0.02, o.inner, D1); lp.pop(); }
    }
    eyeG.add(eyes('open', o.eyes, o.color, undefined, o.glow));
    lp.pop();
  }, `proto:${o.name}`);
  const root = new THREE.Group();
  root.add(instantiate(char, { castShadow: true }));
  root.add(eyeG!);
  return { root, diorama: zolla(), lights: [] };
}

interface Bird { name: string; color: string; eyes: string; glow?: boolean; beak: string; bones?: boolean; duck?: boolean }

/** Uccellino tondo: corpo a palla, testa grande con ciuffo, ali a piume, coda a ventaglio. */
function bird(o: Bird): CustodeV2 {
  beginCreature({ c: [0, 0, 0], r: [0.15, 0.14, 0.14], pw: 2.3, cheek: 0.06, eyeX: 0.062, eyeY: 0.012, eyeS: 0.7 });
  const tone = (k: number) => shade(o.color, k);
  let eyeG: THREE.Group | null = null;
  const char = model((lp) => {
    lp.blob(0, 0.2, -0.02, 0.15, 0.14, 0.19, o.color, D2);
    lp.blob(0, 0.18, 0.06, 0.12, 0.11, 0.11, tone(0.05), D2); // petto
    if (o.bones) ribs(lp, 0.2, -0.1, 0.06, 0.15, 0.14);
    for (const s of [-1, 1]) { // ali: tre piume sovrapposte
      for (let k = 0; k < 3; k++) {
        lp.push([s * (0.14 + k * 0.004), 0.23 - k * 0.025, -0.02 - k * 0.04], s * 0.15, 0.25, s * 0.15);
        lp.blob(0, 0, 0, 0.025, 0.08 - k * 0.012, 0.13 - k * 0.02, tone(-0.03 * k), D1);
        lp.pop();
      }
    }
    for (let k = -1; k <= 1; k++) { // coda a ventaglio
      lp.push([k * 0.04, 0.2, -0.2], k * 0.3, -0.5);
      lp.add(rbox(0.05, 0.015, 0.16, 0.007, 1).translate(0, 0, -0.06), tone(-0.04), O);
      lp.pop();
    }
    const legC = o.duck ? '#e0a040' : '#3a3a40';
    for (const s of [-1, 1]) {
      lp.cyl(s * 0.05, 0.0, 0.02, 0.012, 0.012, 0.09, 4, legC, O);
      if (o.duck) lp.add(new THREE.CircleGeometry(0.05, 3).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(s * 0.05, 0.006, 0.05), legC, O);
      else for (const a of [-0.5, 0, 0.5]) lp.add(taperTube([v(s * 0.05, 0.005, 0.02), v(s * 0.05 + Math.sin(a) * 0.05, 0.005, 0.02 + Math.cos(a) * 0.05)], [0.008, 0.006], 4), legC, O);
    }
    if (o.duck) lp.add(taperTube([v(0, 0.27, 0.08), v(0, 0.35, 0.1)], [0.05, 0.05], 8), o.color, O); // collo
    eyeG = headSpace(lp, [0, 0.4, 0.1], 0, 1);
    lp.add(headGeo(), o.color, { ...O, ao: 0.05 });
    if (o.bones) for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.062, 0.012), 0.001, 0, (q) => q.add(new THREE.CircleGeometry(0.045, 12), '#2b2730', O));
    const b = headFront(0, -0.03);
    if (o.duck) onSkin(lp, b, 0.03, 0, (q) => q.add(rbox(0.12, 0.035, 0.1, 0.015, 2).translate(0, 0, 0.02), o.beak, O)); // becco piatto
    else onSkin(lp, b, 0.005, 0, (q) => q.add(new THREE.ConeGeometry(0.035, 0.1, 5).rotateX(Math.PI / 2).translate(0, 0, 0.045), o.beak, O));
    for (const [th, h, l] of [[-14, 0.07, -0.5], [6, 0.09, -0.3], [24, 0.06, -0.6]]) { // ciuffo
      const { p, n } = headAt(th * DEG, 78 * DEG);
      const g = new THREE.ConeGeometry(0.022, h, 4).translate(0, h / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), n.clone().add(v(0, 0, l)).normalize()));
      lp.add(g.translate(p.x, p.y, p.z), tone(0.03), O);
    }
    if (!o.bones) for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.095, -0.035), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.02, 10).scale(1.3, 0.7, 1), '#e5958f', O));
    eyeG.add(eyes('open', o.eyes, o.color, undefined, o.glow));
    lp.pop();
  }, `proto:${o.name}`);
  const root = new THREE.Group();
  root.add(instantiate(char, { castShadow: true }));
  root.add(eyeG!);
  return { root, diorama: zolla(), lights: [] };
}

// ── Elenchi per la galleria ─────────────────────────────────────────────

export const HUMANS: Preset[] = [
  { name: 'Becchino', build: gravedigger },
  { name: 'Prete', build: priest },
  { name: 'Corteo · signora', build: mourner },
  { name: 'Corteo · signore', build: mournerB },
  { name: 'Zombie', build: zombie },
  { name: 'Scheletro', build: skeleton },
  { name: 'Fantasma', build: () => ghost(false) },
  { name: 'Fantasma raro', build: () => ghost(true) },
];

export const ANIMALS: Preset[] = [
  { name: 'Gatto nero', build: () => quad({ name: 'gatto', color: '#2a2930', belly: '#3a3842', eyes: '#a6d84f', glow: true, head: [0.2, 0.17, 0.17], ears: 'cat', tail: 'up', ruff: true, whiskers: true, nose: '#d68f8f', inner: '#8a5a68' }) },
  { name: 'Ratto', build: () => quad({ name: 'ratto', color: '#6c6876', belly: '#8f8a9a', eyes: '#1b1a20', head: [0.17, 0.15, 0.16], ears: 'round', tail: 'long', snout: true, whiskers: true, nose: '#d68f8f', inner: '#d6a3a3' }) },
  { name: 'Corvo', build: () => bird({ name: 'corvo', color: '#24242c', eyes: '#e0573a', glow: true, beak: '#4a4a52' }) },
  { name: 'Cane (scheletro)', build: () => quad({ name: 'cane', color: BONE, eyes: '#1b1a20', bones: true, head: [0.2, 0.17, 0.17], ears: 'dog', tail: 'wag', snout: true, nose: '#2b2730', inner: BONE_D }) },
  { name: 'Gatto (scheletro)', build: () => quad({ name: 'gattosk', color: BONE, eyes: '#1b1a20', bones: true, head: [0.19, 0.16, 0.16], ears: 'cat', tail: 'up', nose: '#2b2730', inner: BONE_D }) },
  { name: 'Coniglio (scheletro)', build: () => quad({ name: 'coniglio', color: BONE, eyes: '#1b1a20', bones: true, head: [0.18, 0.16, 0.16], ears: 'rabbit', tail: 'pom', nose: '#2b2730', inner: BONE_D }) },
  { name: 'Corvo (scheletro)', build: () => bird({ name: 'corvosk', color: BONE, eyes: '#1b1a20', beak: BONE_D, bones: true }) },
  { name: 'Papera (scheletro)', build: () => bird({ name: 'papera', color: BONE, eyes: '#1b1a20', beak: '#e0a040', bones: true, duck: true }) },
];

