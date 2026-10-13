// Gli altri personaggi nello stile v2 del Custode, divisi nelle parti del
// rig. Gli umani usano lo stesso costruttore del Custode (testa grande a
// superellissoide, capelli a casco di ciocche, barba disegnata per contorni,
// corpo a pera) con aggiunte; fantasmi e animali riusano gli stessi pezzi
// (testa implicita, occhi lucidi con la stella, ciuffi a casco) su forme proprie.

import * as THREE from 'three';
import { LP as LPClass, type LP, type LPOpts } from '../kit.ts';
import { DEFAULT_LOOK } from '../../../game/look.ts';
import {
  humanSpec, atPivot, type KawaiiSpec, type KPart, V2_SCALE, beginCreature, eyesLP, hairLayer, headAt, headFront, headGeo, surfaceAlong, headCenter, headRadii, onSkin, sheet, taperTube, rbox, shade,
  smooth, lerp, DEG, O, footGeo,
} from './custode.ts';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const D2 = { ...O, detail: 2 } as LPOpts;
const D1 = { ...O, detail: 1 } as LPOpts;
const D0 = { ...O, detail: 0 } as LPOpts; // ossicini: pochi triangoli
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
    // la coppola è più spessa dei capelli lungo tutto il bordo: nessuna ciocca esce sotto o sopra la visiera
    sheet(lp, 36, 6, (u, w) => [Math.PI + u * Math.PI, lerp(22, 90, w) * DEG], (_u, w) => 0.06 + 0.035 * smooth(0, 0.7, w), col);
    const f = headAt(0, 25 * DEG);
    lp.push([0, f.p.y + 0.02, f.p.z + 0.07], 0, 0.28);
    lp.add(rbox(0.34, 0.026, 0.15, 0.012, 2), shade(col, -0.06), O);
    lp.pop();
    const c = headCenter(), r = headRadii();
    lp.blob(c.x, c.y + r.y + 0.1, c.z, 0.03, 0.02, 0.03, shade(col, -0.06), D1);
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

const gravedigger = () => humanSpec(
  {
    skin: '#ebbf9c', sparkle: false, hair: 'tufts', hairColor: '#6b4a33', eyes: '#3b2a1e', beard: 'full', beardColor: '#8a6447', mustache: 'bushy',
    outfit: 'overalls', outfitColor: '#56664b', accentColor: '#c9b79c',
  },
  {
    name: 'becchino', eyes: 'sleepy', mouth: 'none', hatPh: 26, hat: flatCap('#55534e'),
    hair: { tip: (a) => (a < 60 ? 40 : lerp(14, -22, smooth(60, 150, a))), depth: 8, thick: 0.03, lift: 0.015 }, // sotto la coppola: basette e nuca
    head: (lp) => {
      onSkin(lp, headFront(0, 0.665), 0.03, 0, (q) => q.blob(0, 0, 0, 0.042, 0.036, 0.034, '#e0a98a', D1)); // nasone
      for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.1, 0.775), 0.006, -s * 0.15, (q) => q.add(rbox(0.08, 0.018, 0.012, 0.006, 1), '#6b4a33', O)); // sopracciglia
    },
    chest: (lp) => { lp.add(rbox(0.07, 0.07, 0.012, 0.01, 1).translate(0.07, 0.3, 0.212).rotateX(-0.32), '#8a7a55', O); }, // toppa
    held: [{ side: 1, build: shovel }],
  },
);

const priest = () => humanSpec(
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

const mourner = () => humanSpec(
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

const mournerB = () => humanSpec(
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

const zombie = () => humanSpec(
  {
    skin: '#a4c487', sparkle: false, hair: 'none', eyes: '#1b1a20', beard: 'none', mustache: 'none',
    outfit: 'coat', outfitColor: '#5d6449', accentColor: '#8a7a55',
  },
  {
    name: 'zombie', eyes: 'zombie', mouth: 'stitched', blush: '#c98a8a', plainCoat: true, // le braccia tese le dà l'animazione pants: '#43403a', boot: '#3a3128', cuff: '#4a503a',
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
const skeleton = () => humanSpec(
  { skin: BONE, sparkle: false, hair: 'none', eyes: '#8ff0dc', beard: 'none', mustache: 'none' },
  {
    name: 'scheletro', eyes: 'sockets', mouth: 'none', ears: false, held: [],
    head: (lp) => {
      onSkin(lp, headFront(0, 0.645), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.03, 3).rotateZ(-Math.PI / 2).scale(1, 1.2, 1), '#1e1b22', O)); // naso
      onSkin(lp, headFront(0, 0.612), 0.002, 0, (q) => q.add(rbox(0.17, 0.008, 0.006, 0.003, 1).translate(0, 0.022, 0), '#8e8676', O));
      for (let i = -2.5; i <= 2.5; i++) onSkin(lp, headFront(i * 0.03, 0.59), 0.008, 0, (q) => q.add(rbox(0.025, 0.04, 0.02, 0.007, 1), '#f3ecda', O)); // denti
    },
    body: {
      torso: (lp) => {
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
      },
      arm: (lp, s) => {
        const sh = v(s * 0.18, 0.46, 0), el = v(s * 0.23, 0.33, 0.02), wr = v(s * 0.26, 0.23, 0.05);
        lp.add(taperTube([sh, el], [0.032, 0.027], 6), BONE, O);
        lp.add(taperTube([el, wr], [0.027, 0.024], 6), BONE, O);
        for (const j of [sh, el]) lp.blob(j.x, j.y, j.z, 0.04, 0.04, 0.04, BONE, D1);
        lp.blob(wr.x, wr.y - 0.02, wr.z, 0.04, 0.035, 0.035, BONE, D1); // mano
        for (let f = -1; f <= 1; f++) lp.add(taperTube([v(wr.x + f * 0.018, wr.y - 0.04, wr.z + 0.01), v(wr.x + f * 0.022, wr.y - 0.09, wr.z + 0.02)], [0.01, 0.008], 4), BONE, O);
      },
      leg: (lp, s) => {
        const hip = v(s * 0.08, 0.19, 0), kn = v(s * 0.085, 0.1, 0.015), an = v(s * 0.09, 0.035, 0.01);
        lp.blob(hip.x, hip.y, hip.z, 0.04, 0.04, 0.04, BONE, D1);
        lp.add(taperTube([hip, kn], [0.036, 0.031], 6), BONE, O);
        lp.add(taperTube([kn, an], [0.031, 0.027], 6), BONE, O);
        lp.blob(kn.x, kn.y, kn.z, 0.036, 0.034, 0.036, BONE, D1);
        lp.add(footGeo(0.08, 0.15, 0.035, 0.012).translate(an.x, 0, 0.05), BONE, O);
      },
    },
  },
);

// ── Fantasmi ────────────────────────────────────────────────────────────

/** Fantasmino: la testa stessa è il corpo (superellissoide), sotto si apre in una gonna a onde. */
function ghostSpec(rare: boolean): KawaiiSpec {
  const col = rare ? '#ffe0b2' : '#d7f2ea';
  const state = () => beginCreature({ c: [0, 0.46, 0], r: [0.3, 0.36, 0.28], pw: 2.05, cheek: 0.04, eyeX: 0.105, eyeY: 0.5, eyeS: 1.05 });
  const g = { bucket: 'ghost' as const };
  const P: Partial<Record<KPart, [number, number, number]>> = { body: [0, 0, 0], armL: [-0.3, 0.33, 0.05], armR: [0.3, 0.33, 0.05] };
  const hand = (s: number) => (lp: LP) => lp.blob(s * 0.3, 0.3, 0.05, 0.05, 0.075, 0.05, col, { ...D2, ...g });
  return {
    scale: V2_SCALE, hover: 0.12, ghost: true, pivots: P,
    parts: {
      body: atPivot(state, P.body!, (lp) => {
        // icosfera sulla superficie sopra l'equatore; sotto scende dritta e si chiude in un orlo a onde
        const C0 = headCenter();
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
        // bocca a "o", guance
        onSkin(lp, headFront(0, 0.41), 0.004, 0, (q) => q.add(new THREE.CircleGeometry(0.02, 10).scale(1, 1.25, 1), '#3a4a52', O));
        for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.18, 0.44), 0.003, 0, (q) => q.add(new THREE.CircleGeometry(0.035, 10).scale(1.3, 0.7, 1), '#f2a6a6', O));
        if (rare) { // fiocco
          onSkin(lp, headAt(0.45, 55 * DEG), 0.02, -0.3, (q) => {
            for (const s of [-1, 1]) q.add(new THREE.ConeGeometry(0.05, 0.1, 4).rotateZ(-s * Math.PI / 2).translate(s * 0.05, 0, 0), '#e07a6a', O);
            q.blob(0, 0, 0.01, 0.026, 0.026, 0.026, '#e07a6a', D1);
          });
        }
        eyesLP(lp, 'open', '#28404a', col);
        lp.light(0, 0.4, 0, rare ? '#ffcf8a' : '#85c8ba', 0.7, 3.5, 0.25, 1.3);
      }),
      armL: atPivot(state, P.armL!, hand(-1)),
      armR: atPivot(state, P.armR!, hand(1)),
    },
  };
}

// ── Animali ─────────────────────────────────────────────────────────────

/** Osso: tubo affusolato con le teste arrotondate alle estremità. */
function bone(lp: LP, a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, knobs = true) {
  lp.add(taperTube([a, b], [r0, r1], 6), BONE, O);
  if (knobs) for (const [p, r] of [[a, r0], [b, r1]] as const) lp.blob(p.x, p.y, p.z, r * 1.45, r * 1.45, r * 1.45, BONE, D0);
}

/** Catena di vertebre (palline schiacciate) lungo una curva, con il midollo più scuro che le unisce. */
function vertebrae(lp: LP, pts: THREE.Vector3[], r0: number, r1: number, n: number) {
  const c = new THREE.CatmullRomCurve3(pts);
  lp.add(taperTube(pts, pts.map((_, i) => lerp(r0, r1, i / (pts.length - 1)) * 0.5), 5), BONE_D, O);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = c.getPointAt(t), r = lerp(r0, r1, t);
    lp.blob(p.x, p.y, p.z, r, r, r * 0.85, BONE, D0);
  }
}

/** Costola ad arco appesa alla spina (aperta in basso), sottile in profondità. */
function rib(lp: LP, y: number, z: number, r: number, open = 0.35) {
  lp.push([0, y - r, z], 0, 0, 0, [1.1, 1, 1]);
  lp.add(new THREE.TorusGeometry(r, 0.011, 4, 16, Math.PI * (2 - open)).rotateZ(-Math.PI / 2 + (open / 2) * Math.PI), BONE, O);
  lp.pop();
}

/** Scheletro di quadrupede (busto): spina a vertebre, gabbia toracica, bacino, scapole, coda a vertebre. */
function skelQuadBody(lp: LP, tail: Quad['tail']) {
  vertebrae(lp, [v(0, 0.3, 0.12), v(0, 0.32, 0.02), v(0, 0.31, -0.1), v(0, 0.28, -0.18)], 0.026, 0.021, 8);
  for (let k = 0; k < 4; k++) rib(lp, 0.31 - k * 0.003, 0.07 - k * 0.045, 0.085 - k * 0.009);
  lp.blob(0, 0.27, -0.18, 0.075, 0.035, 0.05, BONE, D2); // bacino
  for (const s of [-1, 1]) lp.push([s * 0.07, 0.28, 0.08], 0, 0.3, s * 0.2).blob(0, 0, 0, 0.018, 0.06, 0.045, BONE_D, D1).pop(); // scapole
  const tails: Record<Quad['tail'], () => void> = {
    up: () => vertebrae(lp, [v(0, 0.28, -0.21), v(0, 0.37, -0.31), v(0, 0.49, -0.3), v(0.02, 0.54, -0.24)], 0.02, 0.011, 10),
    wag: () => vertebrae(lp, [v(0, 0.29, -0.21), v(0, 0.35, -0.29), v(0.03, 0.43, -0.32)], 0.02, 0.012, 7),
    pom: () => { vertebrae(lp, [v(0, 0.27, -0.21), v(0, 0.29, -0.25)], 0.018, 0.016, 2); lp.blob(0, 0.3, -0.27, 0.035, 0.035, 0.035, BONE, D2); },
    long: () => vertebrae(lp, [v(0, 0.26, -0.21), v(0.04, 0.1, -0.33), v(0.14, 0.04, -0.45)], 0.016, 0.006, 12),
  };
  tails[tail]();
}

/** Zampa d'ossa: davanti spalla, gomito, polso; dietro anca, ginocchio, garretto; zampetta a dita. */
function skelLeg(lp: LP, s: number, front: boolean) {
  let x: number, z: number;
  if (front) {
    const sh = v(s * 0.075, 0.26, 0.08), el = v(s * 0.078, 0.15, 0.1), wr = v(s * 0.075, 0.045, 0.09);
    bone(lp, sh, el, 0.02, 0.017); bone(lp, el, wr, 0.017, 0.015);
    x = wr.x; z = wr.z;
  } else {
    const hp = v(s * 0.07, 0.26, -0.18), kn = v(s * 0.078, 0.16, -0.13), hk = v(s * 0.075, 0.075, -0.2), an = v(s * 0.075, 0.035, -0.17);
    bone(lp, hp, kn, 0.022, 0.018); bone(lp, kn, hk, 0.018, 0.015); bone(lp, hk, an, 0.015, 0.014, false);
    x = an.x; z = an.z;
  }
  lp.blob(x, 0.025, z + 0.01, 0.03, 0.017, 0.032, BONE, D1);
  for (const f of [-1, 0, 1]) lp.add(taperTube([v(x + f * 0.016, 0.018, z + 0.025), v(x + f * 0.024, 0.01, z + 0.06)], [0.008, 0.006], 4), BONE, O);
}

/** Scheletro di uccello (busto): spina, costole, carena dello sterno, bacino, codino. */
function skelBirdBody(lp: LP, duck: boolean) {
  vertebrae(lp, duck ? [v(0, 0.36, 0.1), v(0, 0.3, 0.07), v(0, 0.27, -0.04), v(0, 0.22, -0.15)] : [v(0, 0.3, 0.08), v(0, 0.27, -0.04), v(0, 0.22, -0.15)], 0.022, 0.017, duck ? 9 : 7);
  for (let k = 0; k < 3; k++) rib(lp, 0.275 - k * 0.012, 0.04 - k * 0.045, 0.075 - k * 0.008, 0.45);
  lp.blob(0, 0.15, 0.0, 0.016, 0.055, 0.1, BONE, D2); // carena
  lp.blob(0, 0.21, -0.17, 0.035, 0.03, 0.035, BONE, D1); // codino (pigostilo)
  for (const s of [-1, 1]) lp.blob(s * 0.04, 0.2, -0.08, 0.035, 0.03, 0.06, BONE_D, D1); // bacino
}

/** Ala ripiegata d'ossa (omero, avambraccio, mano corta). */
function skelWing(lp: LP, s: number) {
  const sh = v(s * 0.08, 0.27, 0.05), el = v(s * 0.13, 0.2, 0.02), wr = v(s * 0.135, 0.25, -0.08), tip = v(s * 0.12, 0.225, -0.14);
  bone(lp, sh, el, 0.014, 0.012); bone(lp, el, wr, 0.012, 0.011); bone(lp, wr, tip, 0.011, 0.006, false);
}

/** Zampa d'uccello d'ossa con le dita. */
function skelBirdLeg(lp: LP, s: number) {
  const hp = v(s * 0.045, 0.19, -0.05), kn = v(s * 0.052, 0.12, 0.01), an = v(s * 0.05, 0.05, -0.02), ft = v(s * 0.05, 0.012, 0.02);
  bone(lp, hp, kn, 0.014, 0.012); bone(lp, kn, an, 0.011, 0.009); bone(lp, an, ft, 0.008, 0.007);
  for (const a of [-0.5, 0, 0.5]) bone(lp, ft, v(ft.x + Math.sin(a) * 0.05, 0.006, ft.z + Math.cos(a) * 0.05), 0.006, 0.005, false);
  bone(lp, ft, v(ft.x, 0.006, ft.z - 0.035), 0.005, 0.004, false);
}

interface Quad {
  name: string; color: string; belly?: string; bones?: boolean; eyes: string; glow?: boolean;
  head: [number, number, number]; ears: 'cat' | 'dog' | 'rabbit' | 'mouse'; tail: 'up' | 'long' | 'wag' | 'pom';
  snout?: boolean; ruff?: boolean; whiskers?: boolean; buck?: boolean; nose: string; inner: string; scale?: number;
}

/** Quadrupede: testa enorme a superellissoide (come il Custode), corpo a fagiolo, zampette, ciuffi a casco. */
function quadSpec(o: Quad): KawaiiSpec {
  const R0 = o.head;
  const state = () => beginCreature({ c: [0, 0, 0], r: R0, pw: 2.4, cheek: 0.12, eyeX: R0[0] * 0.42, eyeY: -R0[1] * 0.05, eyeS: 0.85 * R0[0] / 0.2 });
  const tone = (k: number) => shade(o.color, k);
  // zampe: davanti a sinistra/destra (legL/armR), dietro (armL/legR): passo in diagonale
  const P: Partial<Record<KPart, [number, number, number]>> = {
    body: [0, 0.2, 0], head: [0, 0.34, 0.12],
    legL: [-0.078, 0.2, 0.1], armR: [0.078, 0.2, 0.1], armL: [-0.078, 0.2, -0.16], legR: [0.078, 0.2, -0.16],
  };
  const leg = (s: number, front: boolean) => (lp: LP) => {
    if (o.bones) { skelLeg(lp, s, front); return; }
    const x = s * 0.08, z = front ? 0.12 : -0.15;
    lp.cyl(x, 0.03, z, 0.045, 0.05, 0.16, 8, o.color, { ...O, ao: 0.1 });
    lp.blob(x, 0.03, z + 0.015, 0.05, 0.035, 0.06, tone(0.04), D1);
  };
  const body = (lp: LP) => {
    if (o.bones) { skelQuadBody(lp, o.tail); return; }
    // corpo: fagiolo con petto pieno
    lp.blob(0, 0.2, -0.04, 0.14, 0.13, 0.2, o.color, D2);
    lp.blob(0, 0.23, 0.1, 0.12, 0.12, 0.1, o.belly ?? o.color, D2);
    const tails: Record<Quad['tail'], () => void> = {
      up: () => lp.add(taperTube([v(0, 0.24, -0.22), v(0, 0.36, -0.32), v(0, 0.5, -0.3), v(0.02, 0.55, -0.24)], [0.035, 0.032, 0.028, 0.022], 7), o.color, O),
      long: () => lp.add(taperTube([v(0, 0.17, -0.22), v(0.04, 0.06, -0.36), v(0.14, 0.03, -0.46), v(0.22, 0.05, -0.5)], [0.02, 0.016, 0.011, 0.006], 5), '#d6a3a3', O),
      wag: () => lp.add(taperTube([v(0, 0.25, -0.22), v(0, 0.34, -0.3), v(0.03, 0.43, -0.33)], [0.03, 0.025, 0.018], 6), o.color, O),
      pom: () => lp.blob(0, 0.24, -0.25, 0.06, 0.06, 0.06, '#fbf7ef', D2),
    };
    tails[o.tail]();
  };
  const head = (lp: LP) => {
    lp.push([0, 0.42, 0.16], 0, 0.08);
    lp.add(headGeo(), o.color, { ...O, ao: 0.05 });
    if (o.ruff) hairLayer(lp, { locks: 11, hem: () => -58, depth: 14, lift: 0.02, thick: 0.035, phase: 0, swirl: 0, seed: 4, tone, top: -8, span: [55, 305] }); // guance a ciuffi
    if (o.ruff) for (const [th, h] of [[-12, 0.06], [8, 0.07], [26, 0.05]]) { // ciuffetto in cima
      const { p, n } = headAt(th * DEG, 80 * DEG);
      const g = new THREE.ConeGeometry(0.025, h, 5).translate(0, h / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), n.clone().add(v(0, 0, -0.4)).normalize()));
      lp.add(g.translate(p.x, p.y, p.z), tone(0.03), O);
    }
    if (o.bones) skullDetails(lp, R0, !!o.buck);
    // muso, naso, boccuccia
    const mz = headFront(0, -R0[1] * 0.42);
    if (o.snout) onSkin(lp, mz, 0.015, 0, (q) => q.blob(0, 0.01, 0, R0[0] * 0.32, R0[1] * 0.24, R0[2] * 0.3, o.belly ?? tone(0.05), D2));
    const nz = headFront(0, -R0[1] * 0.26);
    onSkin(lp, nz, o.snout ? 0.06 : 0.008, 0, (q) => q.add(new THREE.CircleGeometry(0.02, 3).rotateZ(-Math.PI / 2).scale(1.3, 1, 1), o.nose, O));
    if (!o.bones) onSkin(lp, headFront(0, -R0[1] * 0.45), o.snout ? 0.055 : 0.004, 0, (q) => {
      for (const s of [-1, 1]) q.add(new THREE.TorusGeometry(0.012, 0.004, 3, 8, Math.PI).rotateZ(Math.PI).translate(s * 0.012, 0, 0), INK, O);
    });
    if (!o.bones) for (const s of [-1, 1]) onSkin(lp, headFront(s * R0[0] * 0.62, -R0[1] * 0.38), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.028, 10).scale(1.3, 0.7, 1), '#e5958f', O));
    if (o.whiskers) for (const s of [-1, 1]) for (const k of [-1, 1]) {
      const a = headFront(s * R0[0] * 0.35, -R0[1] * 0.35);
      const p0 = a.p.addScaledVector(a.n, 0.03);
      lp.add(taperTube([p0, p0.clone().add(v(s * 0.065, 0.012 * k + 0.004, -0.008)), p0.clone().add(v(s * 0.12, 0.012 * k - 0.014, -0.03))], [0.0028, 0.0022, 0.0012], 3), '#d8d0c2', O);
    }
    // orecchie
    for (const s of [-1, 1]) {
      if (o.ears === 'cat') onSkin(lp, headAt(s * 38 * DEG, 52 * DEG), -0.01, 0, (q) => {
        q.add(new THREE.ConeGeometry(0.075, 0.14, 6).rotateX(Math.PI / 2).translate(0, 0, 0.06), o.color, O);
        q.add(new THREE.ConeGeometry(0.045, 0.09, 6).rotateX(Math.PI / 2).scale(1, 0.5, 1).translate(0, -0.03, 0.06), o.inner, O);
      });
      if (o.ears === 'mouse') { // orecchie tonde e grandi in cima, dritte e rivolte in avanti (come Topolino)
        const { p } = headAt(s * 46 * DEG, 52 * DEG);
        lp.push([p.x + s * 0.03, p.y + 0.05, p.z - 0.03], s * 0.2);
        lp.blob(0, 0, 0, 0.1, 0.1, 0.024, o.color, D2);
        lp.blob(0, -0.004, 0.014, 0.068, 0.068, 0.014, o.inner, D1);
        lp.pop();
      }
      if (o.ears === 'dog') { const { p } = headAt(s * 80 * DEG, 35 * DEG); lp.push([p.x, p.y, p.z], 0, 0, s * 0.3); lp.blob(s * 0.02, -0.08, 0, 0.055, 0.11, 0.035, o.bones ? BONE_D : tone(-0.06), D2); lp.pop(); }
      if (o.ears === 'rabbit') { const { p } = headAt(s * 38 * DEG, 64 * DEG); lp.push([p.x, p.y, p.z], 0, -0.25, -s * 0.38); lp.blob(0, 0.15, 0, 0.055, 0.17, 0.03, o.color, D2); lp.blob(0, 0.15, 0.016, 0.03, 0.13, 0.02, o.inner, D1); lp.pop(); }
    }
    if (o.bones) eyesLP(lp, 'sockets', SKULL_GLOW, o.color);
    else eyesLP(lp, 'open', o.eyes, o.color, undefined, o.glow);
    lp.pop();
  };
  return {
    scale: V2_SCALE * (o.scale ?? 1), quadruped: true, pivots: P,
    parts: {
      body: atPivot(state, P.body!, body), head: atPivot(state, P.head!, head),
      legL: atPivot(state, P.legL!, leg(-1, true)), armR: atPivot(state, P.armR!, leg(1, true)),
      armL: atPivot(state, P.armL!, leg(-1, false)), legR: atPivot(state, P.legR!, leg(1, false)),
    },
  };
}

const SKULL_GLOW = '#8ff0dc';

/** Teschio: le orbite sono quelle degli occhi "sockets"; il coniglio ha i due dentoni, adagiati sul muso. */
function skullDetails(lp: LP, R0: [number, number, number], buck: boolean) {
  if (buck) for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.014, -R0[1] * 0.46), 0.003, 0, (q) => q.add(rbox(0.024, 0.038, 0.012, 0.005, 1).translate(0, -0.014, 0), '#f3ecda', O));
}

interface Bird { name: string; color: string; eyes: string; glow?: boolean; beak: string; bones?: boolean; duck?: boolean }

/** Uccellino tondo: corpo a palla, testa grande con ciuffo, ali a piume, coda a ventaglio. */
function birdSpec(o: Bird): KawaiiSpec {
  const state = () => beginCreature({ c: [0, 0, 0], r: [0.15, 0.14, 0.14], pw: 2.3, cheek: 0.06, eyeX: 0.062, eyeY: 0.012, eyeS: 0.7 });
  const tone = (k: number) => shade(o.color, k);
  // la papera cammina (gambe), il corvo vola (ali che sbattono)
  const P: Partial<Record<KPart, [number, number, number]>> = {
    body: [0, 0.2, 0], head: [0, 0.3, 0.08], legL: [-0.05, 0.1, 0], legR: [0.05, 0.1, 0],
    ...(o.duck ? {} : { armL: [-0.12, 0.25, 0.02], armR: [0.12, 0.25, 0.02] }),
  };
  const wing = (s: number) => (lp: LP) => {
    if (o.bones) { skelWing(lp, s); return; }
    for (let k = 0; k < 3; k++) { // tre piume sovrapposte
      lp.push([s * (0.14 + k * 0.004), 0.23 - k * 0.025, -0.02 - k * 0.04], s * 0.15, 0.25, s * 0.15);
      lp.blob(0, 0, 0, 0.025, 0.08 - k * 0.012, 0.13 - k * 0.02, tone(-0.03 * k), D1);
      lp.pop();
    }
  };
  const leg = (s: number) => (lp: LP) => {
    if (o.bones) { skelBirdLeg(lp, s); return; }
    const legC = o.duck ? '#e0a040' : '#3a3a40';
    lp.cyl(s * 0.05, 0.0, 0.02, 0.012, 0.012, 0.11, 4, legC, O);
    if (o.duck) lp.add(new THREE.CircleGeometry(0.05, 3).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(s * 0.05, 0.006, 0.05), legC, O);
    else for (const a of [-0.5, 0, 0.5]) lp.add(taperTube([v(s * 0.05, 0.005, 0.02), v(s * 0.05 + Math.sin(a) * 0.05, 0.005, 0.02 + Math.cos(a) * 0.05)], [0.008, 0.006], 4), legC, O);
  };
  const body = (lp: LP) => {
    if (o.bones) skelBirdBody(lp, !!o.duck);
    else {
      lp.blob(0, 0.2, -0.02, 0.15, 0.14, 0.19, o.color, D2);
      lp.blob(0, 0.18, 0.06, 0.12, 0.11, 0.11, tone(0.05), D2); // petto
      for (let k = -1; k <= 1; k++) { // coda a ventaglio
        lp.push([k * 0.04, 0.2, -0.2], k * 0.3, -0.5);
        lp.add(rbox(0.05, 0.015, 0.16, 0.007, 1).translate(0, 0, -0.06), tone(-0.04), O);
        lp.pop();
      }
      if (o.duck) lp.add(taperTube([v(0, 0.27, 0.08), v(0, 0.35, 0.1)], [0.05, 0.05], 8), o.color, O); // collo
    }
    if (o.duck) for (const s of [-1, 1]) wing(s)(lp); // la papera non vola: ali ferme sul corpo
  };
  const head = (lp: LP) => {
    lp.push([0, 0.4, 0.1]);
    lp.add(headGeo(), o.color, { ...O, ao: 0.05 });
    const b = headFront(0, -0.03);
    if (o.duck) onSkin(lp, b, 0.03, 0, (q) => q.add(rbox(0.12, 0.035, 0.1, 0.015, 2).translate(0, 0, 0.02), o.beak, O)); // becco piatto
    else onSkin(lp, b, 0.005, 0, (q) => q.add(new THREE.ConeGeometry(0.035, 0.1, 5).rotateX(Math.PI / 2).translate(0, 0, 0.045), o.beak, O));
    if (!o.bones) for (const [th, h, l] of [[-14, 0.07, -0.5], [6, 0.09, -0.3], [24, 0.06, -0.6]]) { // ciuffo
      const { p, n } = headAt(th * DEG, 78 * DEG);
      const g = new THREE.ConeGeometry(0.022, h, 4).translate(0, h / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), n.clone().add(v(0, 0, l)).normalize()));
      lp.add(g.translate(p.x, p.y, p.z), tone(0.03), O);
    }
    if (!o.bones) for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.095, -0.035), 0.002, 0, (q) => q.add(new THREE.CircleGeometry(0.02, 10).scale(1.3, 0.7, 1), '#e5958f', O));
    if (o.bones) eyesLP(lp, 'sockets', SKULL_GLOW, o.color);
    else eyesLP(lp, 'open', o.eyes, o.color, undefined, o.glow);
    lp.pop();
  };
  const parts: Partial<Record<KPart, (lp: LP) => void>> = {
    body: atPivot(state, P.body!, body), head: atPivot(state, P.head!, head),
    legL: atPivot(state, P.legL!, leg(-1)), legR: atPivot(state, P.legR!, leg(1)),
  };
  if (!o.duck) { parts.armL = atPivot(state, P.armL!, wing(-1)); parts.armR = atPivot(state, P.armR!, wing(1)); }
  return { scale: V2_SCALE, flier: !o.duck, pivots: P, parts };
}

// ── Catalogo (stesse chiavi dei tipi di personaggio del gioco) ────────

const CAT: Quad = { name: 'gatto', color: '#2a2930', belly: '#3a3842', eyes: '#a6d84f', glow: true, head: [0.2, 0.17, 0.17], ears: 'cat', tail: 'up', ruff: true, whiskers: true, nose: '#d68f8f', inner: '#8a5a68' };
const RAT: Quad = { name: 'ratto', color: '#6c6876', belly: '#8f8a9a', eyes: '#1b1a20', head: [0.17, 0.15, 0.16], ears: 'mouse', tail: 'long', snout: true, whiskers: true, nose: '#d68f8f', inner: '#d6a3a3', scale: 0.62 };

export const V2_SPECS: Record<string, KawaiiSpec> = {
  custode: humanSpec(DEFAULT_LOOK),
  gravedigger: gravedigger(),
  priest: priest(),
  mourner: mourner(),
  mournerB: mournerB(),
  zombie: zombie(),
  skeleton: skeleton(),
  ghost: ghostSpec(false),
  ghostRare: ghostSpec(true),
  cat: quadSpec(CAT),
  rat: quadSpec(RAT),
  crow: birdSpec({ name: 'corvo', color: '#24242c', eyes: '#e0573a', glow: true, beak: '#4a4a52' }),
  petDog: quadSpec({ name: 'cane', color: BONE, eyes: '#1b1a20', bones: true, head: [0.2, 0.17, 0.17], ears: 'dog', tail: 'wag', snout: true, nose: '#2b2730', inner: BONE_D }),
  petCat: quadSpec({ name: 'gattosk', color: BONE, eyes: '#1b1a20', bones: true, head: [0.19, 0.16, 0.16], ears: 'cat', tail: 'up', nose: '#2b2730', inner: BONE_D }),
  petRabbit: quadSpec({ name: 'coniglio', color: BONE, eyes: '#1b1a20', bones: true, head: [0.18, 0.16, 0.16], ears: 'rabbit', tail: 'pom', buck: true, nose: '#2b2730', inner: BONE_D }),
  petCrow: birdSpec({ name: 'corvosk', color: BONE, eyes: '#1b1a20', beak: BONE_D, bones: true }),
  petDuck: birdSpec({ name: 'papera', color: BONE, eyes: '#1b1a20', beak: '#e08a3a', bones: true, duck: true }),
};

/** Generatori per chiave "tipo:parte" (registrati dall'adapter low-poly). */
export function v2Generators(): Record<string, () => ReturnType<LP['build']>> {
  const out: Record<string, () => ReturnType<LP['build']>> = {};
  for (const [kind, spec] of Object.entries(V2_SPECS)) {
    for (const [part, build] of Object.entries(spec.parts)) out[`${kind}:${part}`] = () => { const lp = new LPClass(`kawaii:${kind}:${part}`); build!(lp); return lp.build(); };
  }
  return out;
}

// ── Elenchi per le gallerie di prototipo ────────────────────────────────

export const HUMANS: Array<{ name: string; kind: string }> = [
  { name: 'Becchino', kind: 'gravedigger' },
  { name: 'Prete', kind: 'priest' },
  { name: 'Corteo · signora', kind: 'mourner' },
  { name: 'Corteo · signore', kind: 'mournerB' },
  { name: 'Zombie', kind: 'zombie' },
  { name: 'Scheletro', kind: 'skeleton' },
  { name: 'Fantasma', kind: 'ghost' },
  { name: 'Fantasma raro', kind: 'ghostRare' },
];

export const ANIMALS: Array<{ name: string; kind: string }> = [
  { name: 'Gatto nero', kind: 'cat' },
  { name: 'Ratto', kind: 'rat' },
  { name: 'Corvo', kind: 'crow' },
  { name: 'Cane (scheletro)', kind: 'petDog' },
  { name: 'Gatto (scheletro)', kind: 'petCat' },
  { name: 'Coniglio (scheletro)', kind: 'petRabbit' },
  { name: 'Corvo (scheletro)', kind: 'petCrow' },
  { name: 'Papera (scheletro)', kind: 'petDuck' },
];
