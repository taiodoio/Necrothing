// Personaggi low-poly: stesse parti e stessi perni di view/characters.ts
// (gambe, busto, testa, braccia), quindi animazioni, pathfinding e logica
// delle presenze restano quelle esistenti. Qui cambia solo la geometria:
// silhouette leggibile da lontano (cappello largo, cappotto svasato,
// stivali, attrezzi), proporzioni un po' esagerate, testa piccola.
// Coordinate: unità mondo relative al perno della parte.

import * as THREE from 'three';
import { LP, type LPModel } from './kit.ts';
import { LPC } from './palette.ts';

type PartName = 'body' | 'head' | 'armL' | 'armR' | 'legL' | 'legR';
type Parts = Partial<Record<PartName, (lp: LP) => void>>;

interface Humanoid {
  coat: string; coat2: string; skin: string; legs: string; boots: string; arm?: string;
  robe?: boolean;
  hat?: (lp: LP) => void;
  face?: (lp: LP) => void;
  heldR?: (lp: LP) => void;
  heldL?: (lp: LP) => void;
  back?: (lp: LP) => void;
  chest?: (lp: LP) => void;
}

function eyes(lp: LP, color: string = LPC.charcoal, y = 0.2) {
  for (const sx of [-1, 1]) lp.blob(sx * 0.06, y, 0.145, 0.022, 0.026, 0.012, color, { jitter: 0 });
}

function humanoid(o: Humanoid): Parts {
  const arm = o.arm ?? o.coat;
  const leg = (lp: LP) => {
    lp.cyl(0, -0.46, 0, 0.065, 0.075, 0.46, 6, o.legs, { vary: 0.06 });
    // stivale con punta e tacco
    lp.box(0, -0.5, 0.02, 0.15, 0.13, 0.22, o.boots, { bevel: 0.025, vary: 0.06 });
    lp.box(0, -0.5, 0.0, 0.17, 0.04, 0.26, LPC.charcoal, { bevel: 0.01, jitter: 0 });
  };
  return {
    legL: leg,
    legR: leg,
    body: (lp) => {
      // busto affusolato con spalle e falde del cappotto svasate
      lp.lathe(0, -0.02, 0, [[0.2, 0], [0.21, 0.18], [0.2, 0.36], [0.23, 0.48], [0.16, 0.55], [0.0, 0.56]], 7, o.coat, { vary: 0.06, ao: 0.15 });
      if (o.robe) lp.lathe(0, -0.47, 0, [[0.29, 0], [0.26, 0.2], [0.22, 0.42], [0.2, 0.5], [0, 0.5]], 8, o.coat2, { vary: 0.06, ao: 0.3 });
      else lp.lathe(0, -0.2, 0, [[0.27, 0], [0.24, 0.12], [0.21, 0.24], [0, 0.24]], 7, o.coat2, { vary: 0.06, ao: 0.25 });
      lp.box(0, 0.05, 0.19, 0.035, 0.42, 0.03, o.coat2, { jitter: 0 }); // abbottonatura
      for (const y of [0.15, 0.27, 0.39]) lp.blob(0.04, y, 0.205, 0.014, 0.014, 0.01, LPC.gold, { jitter: 0 });
      lp.cyl(0, 0.02, 0, 0.215, 0.215, 0.05, 7, LPC.woodDark, { jitter: 0 }); // cintura
      lp.box(0, 0.015, 0.2, 0.06, 0.06, 0.02, LPC.gold, { jitter: 0 });
      o.chest?.(lp);
      o.back?.(lp);
    },
    head: (lp) => {
      lp.cyl(0, -0.05, 0, 0.06, 0.06, 0.08, 6, o.skin, { jitter: 0 }); // collo
      lp.blob(0, 0.18, 0, 0.15, 0.17, 0.15, o.skin, { detail: 1, jitter: 0.012, vary: 0.05 });
      lp.blob(0, 0.15, 0.15, 0.028, 0.035, 0.03, o.skin, { jitter: 0 }); // naso
      if (o.face) o.face(lp); else eyes(lp);
      o.hat?.(lp);
    },
    armL: (lp) => {
      lp.cyl(0, -0.46, 0, 0.055, 0.075, 0.48, 6, arm, { vary: 0.06 });
      lp.blob(0, -0.5, 0, 0.055, 0.06, 0.055, o.skin, { jitter: 0.004 });
      o.heldL?.(lp);
    },
    armR: (lp) => {
      lp.cyl(0, -0.46, 0, 0.055, 0.075, 0.48, 6, arm, { vary: 0.06 });
      lp.blob(0, -0.5, 0, 0.055, 0.06, 0.055, o.skin, { jitter: 0.004 });
      o.heldR?.(lp);
    },
  };
}

/** Cappello a tesa larga del Custode, con nastro. */
function wideHat(color: string) {
  return (lp: LP) => {
    lp.cyl(0, 0.3, 0, 0.42, 0.4, 0.04, 10, color, { vary: 0.05, jitter: 0.008 });
    lp.cyl(0, 0.34, 0, 0.21, 0.18, 0.26, 8, color, { vary: 0.05, jitter: 0.006 });
    lp.cyl(0, 0.34, 0, 0.22, 0.215, 0.06, 8, LPC.charcoal, { jitter: 0 });
    lp.blob(0, 0.6, 0, 0.17, 0.03, 0.17, color, { jitter: 0.006 });
  };
}

/** Pala tenuta nella mano (coordinate del braccio). */
function shovel(lp: LP, len = 1.1) {
  // impugnata a metà manico: il ferro sfiora terra, il manico sale verso la spalla
  const bottom = -0.74;
  lp.cyl(0, bottom, 0.08, 0.02, 0.02, len, 5, LPC.wood, { jitter: 0 });
  lp.box(0, bottom + len, 0.08, 0.12, 0.03, 0.04, LPC.woodDark, { jitter: 0 });
  const blade = new THREE.Shape();
  blade.moveTo(-0.09, 0); blade.lineTo(0.09, 0); blade.lineTo(0.08, -0.14); blade.lineTo(0, -0.22); blade.lineTo(-0.08, -0.14); blade.closePath();
  lp.push([0, bottom + 0.02, 0.08]).extrude(blade, 0.025, LPC.ironLight, { bevel: 0.004 }).pop();
}

const SPECS: Record<string, Parts> = {
  custode: humanoid({
    coat: '#5a4130', coat2: '#4a3528', skin: '#c9a184', legs: '#2f2a27', boots: '#1f1a17',
    hat: wideHat('#3e2c20'),
    back: (lp) => { // zaino/borsa a tracolla
      lp.box(0, 0.12, -0.21, 0.26, 0.3, 0.12, '#6e5139', { bevel: 0.02, vary: 0.08 });
      lp.box(0, 0.4, -0.2, 0.28, 0.04, 0.14, '#4a3424', { jitter: 0 });
    },
    chest: (lp) => { lp.push([0, 0.28, 0], 0, 0, 0.75).box(0, 0, 0.21, 0.035, 0.6, 0.02, '#3e2c20', { jitter: 0 }).pop(); },
    heldR: (lp) => shovel(lp),
    heldL: (lp) => { // lanterna portatile
      lp.box(0, -0.66, 0, 0.012, 0.12, 0.012, LPC.iron, { jitter: 0 });
      lp.box(0, -0.74, 0, 0.16, 0.03, 0.16, LPC.iron, { bevel: 0.005 });
      lp.box(0, -0.92, 0, 0.12, 0.18, 0.12, LPC.lantern, { bucket: 'glow', jitter: 0 });
      lp.box(0, -0.96, 0, 0.16, 0.03, 0.16, LPC.iron, { bevel: 0.005 });
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lp.box(x * 0.065, -0.93, z * 0.065, 0.018, 0.2, 0.018, LPC.iron, { jitter: 0 });
    },
  }),
  gravedigger: humanoid({
    coat: '#3e4a3c', coat2: '#2f392e', skin: '#b88f72', legs: '#2c2620', boots: '#1a1612',
    hat: (lp) => { lp.blob(0, 0.33, 0, 0.17, 0.08, 0.17, '#3a3a3a', { jitter: 0.006 }); lp.box(0, 0.28, 0.13, 0.26, 0.025, 0.14, '#3a3a3a', { jitter: 0 }); },
    face: (lp) => { eyes(lp); lp.blob(0, 0.07, 0.11, 0.1, 0.07, 0.06, '#6e5440', { jitter: 0.006 }); }, // barba
    heldR: (lp) => shovel(lp, 1.3),
  }),
  priest: humanoid({
    coat: '#17181d', coat2: '#101115', skin: '#c9a184', legs: '#101115', boots: '#101115', robe: true,
    face: (lp) => { eyes(lp); },
    hat: (lp) => { lp.cyl(0, 0.27, 0, 0.17, 0.16, 0.1, 8, '#101115', { jitter: 0 }); },
    chest: (lp) => { lp.box(0, 0.47, 0.17, 0.12, 0.05, 0.03, LPC.bone, { jitter: 0 }); lp.box(0, 0.12, 0.2, 0.04, 0.24, 0.015, LPC.gold, { jitter: 0 }); lp.box(0, 0.27, 0.2, 0.14, 0.035, 0.015, LPC.gold, { jitter: 0 }); },
    heldL: (lp) => { lp.box(0, -0.65, 0.1, 0.16, 0.22, 0.06, '#5a1f22', { bevel: 0.01 }); lp.box(0, -0.62, 0.135, 0.03, 0.1, 0.01, LPC.gold, { jitter: 0 }); },
  }),
  mourner: humanoid({
    coat: '#22232a', coat2: '#1a1b20', skin: '#c4a089', legs: '#16171b', boots: '#121318', robe: true,
    hat: (lp) => { lp.lathe(0, 0.0, -0.02, [[0.2, 0], [0.19, 0.2], [0.17, 0.33], [0.1, 0.38], [0, 0.39]], 8, '#121318', { jitter: 0.006 }); }, // velo
    heldR: (lp) => { lp.cyl(0, -0.9, 0.08, 0.008, 0.008, 0.36, 3, LPC.leaf, { jitter: 0 }); lp.blob(0, -0.52, 0.08, 0.05, 0.04, 0.05, LPC.flowers[2], { jitter: 0.005 }); },
  }),
  zombie: humanoid({
    coat: '#4b4f3a', coat2: '#3a3d2c', skin: '#7c9a63', legs: '#2f2f28', boots: '#26261f',
    face: (lp) => { lp.blob(-0.06, 0.21, 0.14, 0.03, 0.03, 0.012, '#e8f0c0', { jitter: 0 }); lp.blob(0.06, 0.19, 0.14, 0.02, 0.018, 0.012, LPC.charcoal, { jitter: 0 }); lp.box(0, 0.08, 0.135, 0.12, 0.035, 0.02, '#3b2a24', { jitter: 0 }); },
    chest: (lp) => { lp.box(0.08, 0.2, 0.205, 0.08, 0.1, 0.01, '#7c9a63', { jitter: 0.01 }); },
  }),
  skeleton: {
    legL: (lp) => skeletonLeg(lp),
    legR: (lp) => skeletonLeg(lp),
    body: (lp) => {
      lp.blob(0, 0.04, 0, 0.17, 0.08, 0.1, LPC.bone, { detail: 1, jitter: 0.008 }); // bacino
      lp.cyl(0, 0.04, -0.03, 0.03, 0.026, 0.52, 5, LPC.boneDark, { jitter: 0 }); // colonna
      for (let i = 0; i < 4; i++) { // costole: archi aperti sul davanti
        const y = 0.22 + i * 0.085, rr = 0.15 - Math.abs(i - 1.5) * 0.015;
        lp.push([0, y, -0.02], 0, Math.PI / 2 + 0.25).add(new THREE.TorusGeometry(rr, 0.016, 3, 9, Math.PI * 1.55).rotateZ(Math.PI * 0.72), LPC.bone, { jitter: 0 }).pop();
      }
      lp.box(0, 0.52, 0, 0.42, 0.04, 0.06, LPC.bone, { bevel: 0.01 }); // clavicole
    },
    head: (lp) => {
      lp.blob(0, 0.2, 0, 0.15, 0.16, 0.16, LPC.bone, { detail: 1, jitter: 0.01 });
      lp.box(0, 0.04, 0.05, 0.16, 0.07, 0.13, LPC.bone, { bevel: 0.02, jitter: 0.004 }); // mandibola
      for (const sx of [-1, 1]) lp.blob(sx * 0.06, 0.19, 0.13, 0.04, 0.045, 0.03, LPC.charcoal, { jitter: 0 });
      lp.box(0, 0.12, 0.155, 0.03, 0.035, 0.01, LPC.charcoal, { jitter: 0 });
      for (let i = -2; i <= 2; i++) lp.box(i * 0.025, 0.065, 0.12, 0.016, 0.03, 0.01, '#e7dfcb', { jitter: 0 });
    },
    armL: (lp) => skeletonArm(lp),
    armR: (lp) => skeletonArm(lp),
  },
  ghost: ghostParts('#cfeee6'),
  ghostRare: ghostParts('#ffd9a8'),
};

function skeletonLeg(lp: LP) {
  lp.cyl(0, -0.24, 0, 0.022, 0.026, 0.24, 5, LPC.bone, { jitter: 0 });
  lp.blob(0, -0.25, 0.01, 0.035, 0.03, 0.035, LPC.bone, { jitter: 0 });
  lp.cyl(0, -0.48, 0, 0.018, 0.022, 0.23, 5, LPC.bone, { jitter: 0 });
  lp.box(0, -0.5, 0.04, 0.07, 0.03, 0.14, LPC.bone, { bevel: 0.008 });
}

function skeletonArm(lp: LP) {
  lp.cyl(0, -0.24, 0, 0.018, 0.024, 0.24, 5, LPC.bone, { jitter: 0 });
  lp.blob(0, -0.25, 0, 0.03, 0.03, 0.03, LPC.bone, { jitter: 0 });
  lp.cyl(0, -0.48, 0, 0.015, 0.018, 0.23, 5, LPC.bone, { jitter: 0 });
  for (let i = -1; i <= 1; i++) lp.box(i * 0.018, -0.58, 0.01, 0.012, 0.08, 0.012, LPC.bone, { jitter: 0 });
}

function ghostParts(c: string): Parts {
  return {
    body: (lp) => {
      // lenzuolo: profilo tornito con orlo frastagliato (jitter forte in basso)
      lp.lathe(0, -0.12, 0, [[0.38, 0], [0.34, 0.25], [0.28, 0.55], [0.26, 0.8], [0.28, 0.95], [0.22, 1.12], [0.1, 1.22], [0, 1.24]], 9, c, { bucket: 'ghost', jitter: 0.05, vary: 0.1, ao: 0 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        lp.cyl(Math.cos(a) * 0.3, -0.24, Math.sin(a) * 0.3, 0.0, 0.08, 0.16, 4, c, { bucket: 'ghost', jitter: 0.02 });
      }
      for (const sx of [-1, 1]) lp.blob(sx * 0.09, 0.96, 0.25, 0.05, 0.08, 0.03, '#13221f', { bucket: 'ghost', jitter: 0 });
      lp.blob(0, 0.78, 0.26, 0.05, 0.07, 0.03, '#13221f', { bucket: 'ghost', jitter: 0 });
    },
    armL: (lp) => lp.cyl(0, -0.32, 0, 0.03, 0.08, 0.34, 5, c, { bucket: 'ghost', jitter: 0.02 }),
    armR: (lp) => lp.cyl(0, -0.32, 0, 0.03, 0.08, 0.34, 5, c, { bucket: 'ghost', jitter: 0.02 }),
  };
}

/** Generatori per chiave "tipo:parte" (registrati dall'adapter). */
export function characterGenerators(): Record<string, () => LPModel> {
  const out: Record<string, () => LPModel> = {};
  for (const [kind, parts] of Object.entries(SPECS)) {
    for (const [part, build] of Object.entries(parts)) {
      out[`${kind}:${part}`] = () => {
        const lp = new LP(`lpchar:${kind}:${part}`);
        build!(lp);
        return lp.build();
      };
    }
  }
  return out;
}
