// Personaggi procedurali composti da parti (busto, testa, braccia, gambe)
// con pivot alle articolazioni: animazione leggera di idle/camminata/lavoro
// senza scheletri. Ogni parte è un modello voxel/miniatura in cache; nello
// stile low-poly le parti e i perni sono quelli "kawaii" di render/lowpoly/kawaii.ts.

import * as THREE from 'three';
import type { ArtStyle } from '../game/state.ts';
import { getModel, instantiate, lightWorldPos } from '../render/modelCache.ts';
import { ModelBuilder, VOX, type LightAnchor, type Model } from '../render/shape.ts';
import { P } from '../render/palette.ts';
import { KAWAII } from '../render/lowpoly/kawaii.ts';

export type CharacterKind =
  | 'custode' | 'priest' | 'gravedigger' | 'mourner' | 'mournerB' | 'ghost' | 'ghostRare'
  | 'zombie' | 'skeleton' | 'cat' | 'crow' | 'rat'
  | 'petDog' | 'petCat' | 'petRabbit' | 'petDuck' | 'petCrow';

type PartName = 'body' | 'head' | 'armL' | 'armR' | 'legL' | 'legR' | 'extra';

interface PartSpec { name: PartName; pivot: [number, number, number]; build: (b: ModelBuilder) => void }

interface Spec {
  parts: PartSpec[];
  scale?: number;
  bucket?: 'ghost';
  lights?: Array<{ part: PartName; anchor: LightAnchor }>;
  hover?: number;
  quadruped?: boolean;
  flier?: boolean;
  /** Ampiezza dei sobbalzi (personaggi kawaii: gambe più corte). */
  bob?: number;
  /** Spostamento verticale del busto da seduti (unità di design; default -2.6). */
  sitDy?: number;
}

/** Umanoide generico: misure in voxel, pivot (anca/spalla) nello spazio personaggio. */
function humanoid(o: {
  coat: string; coat2?: string; skin: string; legs: string; boots?: string;
  hat?: (b: ModelBuilder) => void; face?: (b: ModelBuilder) => void;
  heldR?: (b: ModelBuilder) => void; heldL?: (b: ModelBuilder) => void; back?: (b: ModelBuilder) => void;
  robe?: boolean; arm?: string;
}): PartSpec[] {
  const arm = o.arm ?? o.coat;
  return [
    { name: 'legL', pivot: [-1.2, 5, 0], build: (b) => { b.box(-1, -5, -1, 1, 0, 1, o.legs); if (o.boots) b.box(-1.1, -5, -1.2, 1.1, -3.6, 1.4, o.boots); } },
    { name: 'legR', pivot: [1.2, 5, 0], build: (b) => { b.box(-1, -5, -1, 1, 0, 1, o.legs); if (o.boots) b.box(-1.1, -5, -1.2, 1.1, -3.6, 1.4, o.boots); } },
    {
      name: 'body', pivot: [0, 5, 0], build: (b) => {
        b.box(-2.6, 0, -1.7, 2.6, 5.5, 1.7, o.coat, { jitter: 0.08 });
        if (o.robe) b.box(-2.8, -4.5, -1.9, 2.8, 0.5, 1.9, o.coat2 ?? o.coat, { jitter: 0.08 });
        else b.box(-2.8, -1.8, -1.9, 2.8, 0.5, 1.9, o.coat2 ?? o.coat, { jitter: 0.08 });
        b.box(-0.5, 0.5, 1.6, 0.5, 5, 2, o.coat2 ?? P.ink);
        o.back?.(b);
      },
    },
    {
      name: 'head', pivot: [0, 10.5, 0], build: (b) => {
        b.box(-2, 0, -2, 2, 4, 2, o.skin, { jitter: 0.05 });
        if (o.face) o.face(b);
        else { b.box(-1.3, 1.8, 1.9, -0.5, 2.6, 2.2, P.ink); b.box(0.5, 1.8, 1.9, 1.3, 2.6, 2.2, P.ink); }
        o.hat?.(b);
      },
    },
    { name: 'armL', pivot: [-3.4, 10, 0], build: (b) => { b.box(-0.9, -5, -0.9, 0.9, 0, 0.9, arm); b.box(-0.8, -6, -0.8, 0.8, -5, 0.8, o.skin); o.heldL?.(b); } },
    { name: 'armR', pivot: [3.4, 10, 0], build: (b) => { b.box(-0.9, -5, -0.9, 0.9, 0, 0.9, arm); b.box(-0.8, -6, -0.8, 0.8, -5, 0.8, o.skin); o.heldR?.(b); } },
  ];
}

const wideHat = (color: string) => (b: ModelBuilder) => {
  b.box(-4.5, 3.4, -4.5, 4.5, 4.3, 4.5, color);
  b.box(-2.4, 4.3, -2.4, 2.4, 6.6, 2.4, color);
  b.box(-2.5, 4.3, -2.5, 2.5, 5, 2.5, P.ink);
};

function quad(o: { color: string; color2?: string; len: number; tall: number; head: (b: ModelBuilder) => void; tail?: (b: ModelBuilder) => void }): PartSpec[] {
  const leg = (b: ModelBuilder) => b.box(-0.5, -o.tall, -0.5, 0.5, 0, 0.5, o.color2 ?? o.color);
  const hl = o.len / 2;
  return [
    { name: 'body', pivot: [0, o.tall, 0], build: (b) => { b.box(-1.5, 0, -hl, 1.5, 2.6, hl, o.color, { jitter: 0.06 }); o.tail?.(b); } },
    { name: 'head', pivot: [0, o.tall + 2, hl], build: o.head },
    { name: 'legL', pivot: [-1, o.tall, hl - 1], build: leg },
    { name: 'legR', pivot: [1, o.tall, -hl + 1], build: leg },
    { name: 'armL', pivot: [-1, o.tall, -hl + 1], build: leg },
    { name: 'armR', pivot: [1, o.tall, hl - 1], build: leg },
  ];
}

const boneLeg = (b: ModelBuilder) => b.box(-0.4, -3, -0.4, 0.4, 0, 0.4, P.bone);

function spec(kind: CharacterKind): Spec {
  switch (kind) {
    case 'custode':
      return {
        parts: humanoid({
          coat: '#5a4130', coat2: '#4a3528', skin: P.skin, legs: '#2f2a27', boots: '#1f1a17', arm: '#5a4130',
          hat: wideHat('#4a3424'),
          back: (b) => { b.box(-2, 0.5, -3.4, 2, 4.8, -1.6, '#6e5139'); b.box(-2.2, 4.5, -3.6, 2.2, 5.2, -1.4, '#4a3424'); },
          heldR: (b) => { b.box(-0.3, -13, 0.6, 0.3, -2, 1.2, P.wood); b.box(-1.2, -16, 0.4, 1.2, -12.5, 1.4, P.ironLight); },
          heldL: (b) => {
            b.box(-0.2, -7.5, -0.2, 0.2, -5.6, 0.2, P.iron);
            b.box(-1.2, -11, -1.2, 1.2, -7.5, 1.2, P.lantern, { bucket: 'glow' } as never);
            b.box(-1.4, -7.8, -1.4, 1.4, -7.2, 1.4, P.iron);
            b.box(-1.4, -11.3, -1.4, 1.4, -10.8, 1.4, P.iron);
          },
        }),
        lights: [{ part: 'armL', anchor: { pos: [0, -9, 0], color: P.lantern, intensity: 1.1, range: 5.5, flicker: 0.2, halo: 1 } }],
      };
    case 'gravedigger':
      return {
        parts: humanoid({
          coat: '#3e4a3c', coat2: '#2f392e', skin: '#b88f72', legs: '#2c2620', boots: '#1a1612',
          hat: (b) => { b.box(-2.3, 3.5, -2.3, 2.3, 5.2, 2.3, '#3a3a3a'); b.box(-2.3, 3.5, 2.2, 2.3, 4, 3.4, '#3a3a3a'); },
          face: (b) => { b.box(-1.3, 2, 1.9, -0.5, 2.6, 2.2, P.ink); b.box(0.5, 2, 1.9, 1.3, 2.6, 2.2, P.ink); b.box(-1.6, 0, 1.9, 1.6, 1.2, 2.3, '#6e5440'); },
          heldR: (b) => { b.box(-0.3, -14, 0.6, 0.3, -1, 1.2, P.wood); b.box(-1.3, -17, 0.3, 1.3, -13.5, 1.5, P.ironLight); },
        }),
      };
    case 'priest':
      return {
        parts: humanoid({
          coat: '#17181d', coat2: '#101115', skin: P.skin, legs: '#101115', robe: true,
          face: (b) => { b.box(-1.3, 2, 1.9, -0.5, 2.6, 2.2, P.ink); b.box(0.5, 2, 1.9, 1.3, 2.6, 2.2, P.ink); b.box(-0.6, -0.5, 1.9, 0.6, 0.3, 2.3, P.ivory); },
          hat: (b) => { b.box(-2.2, 3.5, -2.2, 2.2, 4.6, 2.2, '#101115'); },
          heldL: (b) => { b.box(-1, -8, 0.5, 1, -5.5, 2, '#5a1f22'); b.box(-0.2, -7.6, 1.9, 0.2, -6, 2.2, P.gold); },
        }).map((p) => (p.name === 'body' ? { ...p, build: (b: ModelBuilder) => { p.build(b); b.box(-0.4, 1.5, 1.7, 0.4, 4.5, 2.1, P.gold); b.box(-1.2, 3.4, 1.7, 1.2, 4, 2.1, P.gold); } } : p)),
      };
    case 'mourner':
      return {
        parts: humanoid({
          coat: '#22232a', coat2: '#1a1b20', skin: '#c4a089', legs: '#16171b', robe: true,
          hat: (b) => { b.box(-2.6, 2.5, -2.6, 2.6, 4.8, 2.6, '#121318'); b.box(-2.6, 0, -2.6, -1.8, 3, 2.6, '#121318'); b.box(1.8, 0, -2.6, 2.6, 3, 2.6, '#121318'); },
          heldR: (b) => { b.box(-0.2, -9, 0.6, 0.2, -6, 1, P.leaf); b.ell(0, -5.5, 0.8, 1, 1, 1, P.flowerWhite); },
        }),
      };
    case 'mournerB':
      return {
        parts: humanoid({
          coat: '#2a2c33', coat2: '#202228', skin: P.skin, legs: '#1d1e24', boots: '#141418',
          hat: (b) => { b.box(-3, 3.6, -3, 3, 4.1, 3, '#141418'); b.box(-2, 4.1, -2, 2, 7.4, 2, '#141418'); b.box(-2.1, 4.1, -2.1, 2.1, 4.7, 2.1, '#5a2a30'); },
          face: (b) => { b.box(-1.3, 2, 1.9, -0.5, 2.6, 2.2, P.ink); b.box(0.5, 2, 1.9, 1.3, 2.6, 2.2, P.ink); b.box(-1.4, 0.9, 1.9, 1.4, 1.4, 2.3, '#5b5550'); },
          heldR: (b) => { b.box(-0.3, -13, 0.6, 0.3, -1, 1.2, '#1f2026'); },
        }),
      };
    case 'zombie':
      return {
        parts: humanoid({
          coat: '#4b4f3a', coat2: '#3a3d2c', skin: P.zombie, legs: '#2f2f28',
          face: (b) => { b.box(-1.3, 2, 1.9, -0.5, 2.8, 2.2, '#e8f0c0'); b.box(0.5, 1.8, 1.9, 1.3, 2.4, 2.2, P.ink); b.box(-1, 0.6, 1.9, 1.2, 1.2, 2.2, '#3b2a24'); },
        }),
      };
    case 'skeleton':
      return {
        parts: [
          { name: 'legL', pivot: [-1, 5, 0], build: (b) => { b.box(-0.5, -5, -0.5, 0.5, 0, 0.5, P.bone); b.box(-0.7, -5, -0.6, 0.7, -4.4, 1.2, P.bone); } },
          { name: 'legR', pivot: [1, 5, 0], build: (b) => { b.box(-0.5, -5, -0.5, 0.5, 0, 0.5, P.bone); b.box(-0.7, -5, -0.6, 0.7, -4.4, 1.2, P.bone); } },
          {
            name: 'body', pivot: [0, 5, 0], build: (b) => {
              b.box(-1.8, 0, -1, 1.8, 1, 1, P.bone);
              b.box(-0.4, 1, -0.4, 0.4, 5.5, 0.4, P.boneDark);
              for (let y = 2; y < 5.5; y += 1.2) b.box(-2, y, -1.2, 2, y + 0.6, 1.2, P.bone);
              b.box(-2.6, 5.2, -0.6, 2.6, 5.8, 0.6, P.bone);
            },
          },
          { name: 'head', pivot: [0, 10.5, 0], build: (b) => { b.box(-1.8, 0.4, -1.8, 1.8, 3.8, 1.8, P.bone); b.box(-1.2, -0.4, -1.2, 1.2, 0.6, 1.4, P.bone); b.box(-1.2, 1.7, 1.6, -0.3, 2.6, 2, P.ink); b.box(0.3, 1.7, 1.6, 1.2, 2.6, 2, P.ink); } },
          { name: 'armL', pivot: [-2.8, 10.4, 0], build: (b) => b.box(-0.4, -6, -0.4, 0.4, 0, 0.4, P.bone) },
          { name: 'armR', pivot: [2.8, 10.4, 0], build: (b) => b.box(-0.4, -6, -0.4, 0.4, 0, 0.4, P.bone) },
        ],
      };
    case 'ghost':
    case 'ghostRare': {
      const c = kind === 'ghostRare' ? '#ffd9a8' : '#cfeee6';
      return {
        bucket: 'ghost',
        hover: 2.5,
        parts: [
          {
            name: 'body', pivot: [0, 0, 0], build: (b) => {
              b.cyl(0, 0, 0, 9, 3.6, 2.6, c, { seg: 8 });
              b.ell(0, 9.5, 0, 3, 3.2, 3, c);
              for (const x of [-2.5, 0, 2.5]) b.box(x - 0.8, -1.5, -0.8, x + 0.8, 0.2, 0.8, c);
              b.box(-1.6, 9.5, 2.4, -0.4, 11.3, 3.2, '#13221f');
              b.box(0.4, 9.5, 2.4, 1.6, 11.3, 3.2, '#13221f');
              b.box(-0.7, 7.3, 2.6, 0.7, 8.6, 3.2, '#13221f');
            },
          },
          { name: 'armL', pivot: [-3, 7, 0], build: (b) => b.box(-0.8, -3, -0.8, 0.8, 0, 0.8, c) },
          { name: 'armR', pivot: [3, 7, 0], build: (b) => b.box(-0.8, -3, -0.8, 0.8, 0, 0.8, c) },
        ],
        lights: [{ part: 'body', anchor: { pos: [0, 6, 0], color: kind === 'ghostRare' ? '#ffcf8a' : P.spectral, intensity: 0.7, range: 3.5, flicker: 0.25, halo: 1.3 } }],
      };
    }
    case 'cat':
      return {
        quadruped: true,
        parts: quad({
          color: '#141417', len: 6, tall: 2.4,
          head: (b) => { b.box(-1.5, 0, -1, 1.5, 2.6, 2, '#141417'); b.box(-1.5, 2.6, 0, -0.6, 3.6, 1, '#141417'); b.box(0.6, 2.6, 0, 1.5, 3.6, 1, '#141417'); b.box(-1, 1.3, 1.9, -0.3, 1.9, 2.2, P.toxic, { bucket: 'glow' }); b.box(0.3, 1.3, 1.9, 1, 1.9, 2.2, P.toxic, { bucket: 'glow' }); },
          tail: (b) => b.push([0, 2, -3], 0, -0.7).box(-0.4, 0, -0.4, 0.4, 5, 0.4, '#141417').pop(),
        }),
      };
    case 'rat':
      return {
        quadruped: true, scale: 0.8,
        parts: quad({
          color: '#4e4a55', len: 4, tall: 0.9,
          head: (b) => { b.box(-1, -0.6, 0, 1, 1.2, 2.2, '#5c5866'); b.box(-1.2, 1, 0, -0.4, 1.8, 0.8, '#7a7686'); b.box(0.4, 1, 0, 1.2, 1.8, 0.8, '#7a7686'); },
          tail: (b) => b.push([0, 1, -2], 0, -1.4).box(-0.2, 0, -0.2, 0.2, 4, 0.2, '#8a8090').pop(),
        }),
      };
    case 'crow':
    case 'petCrow': {
      const col = kind === 'petCrow' ? P.bone : '#121216';
      return {
        flier: true,
        parts: [
          { name: 'body', pivot: [0, 1.5, 0], build: (b) => { b.ell(0, 1.2, 0, 1.6, 1.4, 2.2, col); b.box(-0.6, 0.6, -3.6, 0.6, 1.2, -1.8, col); } },
          { name: 'head', pivot: [0, 3, 1.4], build: (b) => { b.box(-1, 0, -0.8, 1, 1.8, 1.2, col); b.box(-0.3, 0.6, 1.2, 0.3, 1.1, 2.4, '#3a3226'); b.box(-0.9, 1.1, 0.8, -0.5, 1.5, 1.1, '#d8452a', { bucket: 'glow' }); b.box(0.5, 1.1, 0.8, 0.9, 1.5, 1.1, '#d8452a', { bucket: 'glow' }); } },
          { name: 'armL', pivot: [-1.4, 2.4, 0], build: (b) => b.box(-3.5, -0.3, -1.4, 0, 0.3, 1.4, col) },
          { name: 'armR', pivot: [1.4, 2.4, 0], build: (b) => b.box(0, -0.3, -1.4, 3.5, 0.3, 1.4, col) },
          { name: 'legL', pivot: [-0.5, 1, 0], build: (b) => b.box(-0.2, -1, -0.2, 0.2, 0, 0.2, '#3a3226') },
          { name: 'legR', pivot: [0.5, 1, 0], build: (b) => b.box(-0.2, -1, -0.2, 0.2, 0, 0.2, '#3a3226') },
        ],
      };
    }
    case 'petDog':
      return { quadruped: true, parts: quad({ color: P.bone, len: 6, tall: 3, head: (b) => { b.box(-1.4, 0, -0.6, 1.4, 2.4, 2.4, P.bone); b.box(-0.8, 0, 2.4, 0.8, 1, 3.6, P.bone); b.box(-1, 1.4, 2.3, -0.4, 2, 2.5, P.ink); b.box(0.4, 1.4, 2.3, 1, 2, 2.5, P.ink); b.box(-1.6, 1.6, -0.4, -1, 3.4, 0.6, P.boneDark); b.box(1, 1.6, -0.4, 1.6, 3.4, 0.6, P.boneDark); }, tail: (b) => b.push([0, 2, -3], 0, -0.9).box(-0.3, 0, -0.3, 0.3, 3, 0.3, P.bone).pop() }).map((p) => (p.name === 'legL' || p.name === 'legR' || p.name === 'armL' || p.name === 'armR' ? { ...p, build: boneLeg } : p)) };
    case 'petCat':
      return { quadruped: true, parts: quad({ color: P.bone, len: 5, tall: 2.4, head: (b) => { b.box(-1.4, 0, -0.8, 1.4, 2.4, 1.8, P.bone); b.box(-1.4, 2.4, 0, -0.6, 3.4, 1, P.bone); b.box(0.6, 2.4, 0, 1.4, 3.4, 1, P.bone); b.box(-1, 1.2, 1.7, -0.3, 1.8, 2, P.ink); b.box(0.3, 1.2, 1.7, 1, 1.8, 2, P.ink); }, tail: (b) => b.push([0, 2, -2.5], 0, -0.6).box(-0.3, 0, -0.3, 0.3, 4, 0.3, P.bone).pop() }) };
    case 'petRabbit':
      return { quadruped: true, parts: quad({ color: P.bone, len: 4, tall: 1.6, head: (b) => { b.box(-1.2, 0, -0.6, 1.2, 2.2, 1.8, P.bone); b.box(-1, 2.2, -0.2, -0.3, 5, 0.5, P.bone); b.box(0.3, 2.2, -0.2, 1, 5, 0.5, P.bone); b.box(-0.9, 1.1, 1.7, -0.3, 1.7, 2, P.ink); b.box(0.3, 1.1, 1.7, 0.9, 1.7, 2, P.ink); } }) };
    case 'petDuck':
      return { parts: [
        { name: 'body', pivot: [0, 1.6, 0], build: (b) => { b.ell(0, 1, 0, 1.8, 1.4, 2.4, P.bone); b.box(-0.6, 1.6, -3, 0.6, 2.6, -2, P.bone); } },
        { name: 'head', pivot: [0, 3, 1.6], build: (b) => { b.box(-0.9, 0, -0.8, 0.9, 2, 1, P.bone); b.box(-0.6, 0.4, 1, 0.6, 1, 2.4, P.gold); b.box(-0.8, 1.2, 0.8, -0.3, 1.6, 1.1, P.ink); b.box(0.3, 1.2, 0.8, 0.8, 1.6, 1.1, P.ink); } },
        { name: 'legL', pivot: [-0.6, 1.6, 0], build: (b) => { b.box(-0.2, -1.6, -0.2, 0.2, 0, 0.2, P.gold); b.box(-0.6, -1.6, 0, 0.6, -1.2, 1, P.gold); } },
        { name: 'legR', pivot: [0.6, 1.6, 0], build: (b) => { b.box(-0.2, -1.6, -0.2, 0.2, 0, 0.2, P.gold); b.box(-0.6, -1.6, 0, 0.6, -1.2, 1, P.gold); } },
      ] };
  }
}

export interface Rig {
  kind: CharacterKind;
  root: THREE.Group;
  parts: Partial<Record<PartName, THREE.Group>>;
  lights: Array<{ part: THREE.Group; anchor: LightAnchor }>;
  spec: Spec;
}

export function buildRig(kind: CharacterKind, style: ArtStyle): Rig {
  if (style === 'lowpoly' && KAWAII[kind]) return buildKawaiiRig(kind);
  const s = spec(kind);
  const root = new THREE.Group();
  root.name = kind;
  const inner = new THREE.Group();
  inner.scale.setScalar(s.scale ?? 1);
  root.add(inner);
  const parts: Rig['parts'] = {};
  for (const p of s.parts) {
    const key = `char:${kind}:${p.name}`;
    const model = getModel(key, style, (): Model => {
      const b = new ModelBuilder(key);
      p.build(b);
      if (s.bucket === 'ghost') for (const prim of b.prims) if (!prim.bucket) prim.bucket = 'ghost';
      return b.build();
    }, 1, false);
    const pivot = new THREE.Group();
    pivot.position.set(p.pivot[0] * VOX, p.pivot[1] * VOX + (s.hover ?? 0) * VOX, p.pivot[2] * VOX);
    const mesh = instantiate(model, { castShadow: s.bucket !== 'ghost' });
    pivot.add(mesh);
    pivot.userData.base = pivot.position.clone();
    inner.add(pivot);
    parts[p.name] = pivot;
  }
  const lights = (s.lights ?? []).map((l) => ({ part: parts[l.part]!, anchor: l.anchor }));
  return { kind, root, parts, lights, spec: s };
}

/**
 * Rig low-poly "kawaii": stesse parti (e animazioni) del rig voxel, perni in
 * unità mondo dal catalogo kawaii; le luci portate (lanterna del Custode,
 * bagliore dei fantasmi) arrivano dai modelli delle parti.
 */
function buildKawaiiRig(kind: CharacterKind): Rig {
  const k = KAWAII[kind];
  const voxel = spec(kind);
  // da seduti il busto resta all'altezza di uno sgabello (≈0,26) invece di affondare
  const s: Spec = { parts: voxel.parts, scale: k.scale, bucket: k.ghost ? 'ghost' : undefined, quadruped: k.quadruped, flier: k.flier, bob: 0.6, sitDy: 0.67 };
  const root = new THREE.Group();
  root.name = kind;
  const inner = new THREE.Group();
  inner.scale.setScalar(k.scale);
  root.add(inner);
  const parts: Rig['parts'] = {};
  const lights: Rig['lights'] = [];
  for (const [name, pv] of Object.entries(k.pivots) as [PartName, [number, number, number]][]) {
    const key = `char:${kind}:${name}`;
    const fallback = voxel.parts.find((p) => p.name === name);
    const model = getModel(key, 'lowpoly', (): Model => { const b = new ModelBuilder(key); fallback?.build(b); return b.build(); }, 1, false);
    const pivot = new THREE.Group();
    pivot.position.set(pv[0], pv[1] + (k.hover ?? 0), pv[2]);
    pivot.add(instantiate(model, { castShadow: !k.ghost }));
    pivot.userData.base = pivot.position.clone();
    inner.add(pivot);
    parts[name] = pivot;
    for (const anchor of model.lights) lights.push({ part: pivot, anchor });
  }
  return { kind, root, parts, lights, spec: s };
}

/** Posizione mondo di una luce portata (es. lanterna del Custode). */
export function rigLightPos(rig: Rig, i: number, target = new THREE.Vector3()): THREE.Vector3 {
  const l = rig.lights[i];
  return lightWorldPos(l.anchor, target).applyMatrix4(l.part.matrixWorld);
}

export type Pose = 'idle' | 'walk' | 'work' | 'dance' | 'sit' | 'pray' | 'fly' | 'cheer';

/** Animazione procedurale delle parti. `phase` avanza con la distanza percorsa. */
export function animateRig(rig: Rig, pose: Pose, t: number, phase: number) {
  const p = rig.parts;
  const swing = Math.sin(phase * 2.2);
  const set = (part: THREE.Group | undefined, rx: number, rz = 0) => { if (part) { part.rotation.x = rx; part.rotation.z = rz; } };
  const k = rig.spec.bob ?? 1;
  const bob = (part: THREE.Group | undefined, dy: number) => { if (part) part.position.y = (part.userData.base as THREE.Vector3).y + dy * VOX * k; };
  /** Busto, testa e braccia sobbalzano insieme: le braccia restano attaccate alle spalle. */
  const torso = (dy: number) => { bob(p.body, dy); bob(p.head, dy); bob(p.armL, dy); bob(p.armR, dy); };
  if (rig.spec.bucket === 'ghost') {
    const f = Math.sin(t * 2);
    bob(p.body, f * 1.2); bob(p.armL, f * 1.2); bob(p.armR, f * 1.2);
    if (pose === 'cheer') { const c = Math.sin(t * 10) * 0.3; set(p.armL, 0, -2.4 + c); set(p.armR, 0, 2.4 - c); }
    else { set(p.armL, 0, -0.6 + Math.sin(t * 3) * 0.3); set(p.armR, 0, 0.6 - Math.sin(t * 3) * 0.3); }
    return;
  }
  if (rig.spec.flier) {
    const flap = pose === 'fly' ? Math.sin(t * 18) * 0.9 : 0.05;
    set(p.armL, 0, flap); set(p.armR, 0, -flap);
    set(p.head, pose === 'idle' ? Math.sin(t * 1.5) * 0.3 : 0);
    return;
  }
  if (rig.spec.quadruped) {
    const k = pose === 'walk' ? 0.7 : 0;
    set(p.legL, swing * k); set(p.legR, swing * k); set(p.armL, -swing * k); set(p.armR, -swing * k);
    set(p.head, pose === 'idle' ? Math.sin(t * 0.8) * 0.15 : 0);
    return;
  }
  switch (pose) {
    case 'walk':
      set(p.legL, swing * 0.6); set(p.legR, -swing * 0.6);
      set(p.armL, -swing * 0.45); set(p.armR, swing * 0.45);
      torso(Math.abs(Math.cos(phase * 2.2)) * 0.5);
      set(p.head, 0);
      break;
    case 'work': {
      const w = Math.sin(t * 7);
      set(p.armR, -1.1 + w * 0.7); set(p.armL, -0.6 + w * 0.4);
      set(p.legL, 0); set(p.legR, 0); set(p.head, 0.25 + w * 0.05);
      torso(-0.4 + w * 0.2);
      break;
    }
    case 'dance': {
      const d = Math.sin(t * 6);
      set(p.armL, -2.4 + d * 0.5, -0.3); set(p.armR, -2.4 - d * 0.5, 0.3);
      set(p.legL, d * 0.4); set(p.legR, -d * 0.4);
      torso(Math.abs(d) * 1); set(p.head, 0, d * 0.2);
      break;
    }
    case 'sit':
      set(p.legL, -1.4); set(p.legR, -1.4);
      set(p.armL, -0.9 + Math.sin(t * 2) * 0.15); set(p.armR, -0.9 - Math.sin(t * 2.3) * 0.15);
      torso(rig.spec.sitDy ?? -2.6); set(p.head, Math.sin(t * 0.7) * 0.15);
      break;
    case 'pray':
      set(p.armL, -0.9, 0.35); set(p.armR, -0.9, -0.35); set(p.head, 0.35); set(p.legL, 0); set(p.legR, 0); torso(0);
      break;
    case 'cheer':
      set(p.armL, -2.6, -0.2); set(p.armR, -2.6, 0.2); torso(Math.abs(Math.sin(t * 8)) * 1);
      break;
    default: {
      const br = Math.sin(t * 1.6) * 0.04;
      set(p.legL, 0); set(p.legR, 0); set(p.armL, br); set(p.armR, -br); set(p.head, Math.sin(t * 0.6) * 0.08);
      torso(Math.sin(t * 1.6) * 0.15);
    }
  }
  if (rig.kind === 'zombie' && pose === 'walk') { set(p.armL, -1.5 + swing * 0.1); set(p.armR, -1.5 - swing * 0.1); }
}
