// Chi abita gli oggetti-presenza (zombie del bar, strega, banda, fantasmi
// del picnic…): dove sta, che posa ha, cosa tiene in mano. Un'unica
// descrizione che usano sia il gioco (view/Actors, che poi li anima) sia le
// miniature della Bottega (ui/thumbs, che li ritrae fermi).

import * as THREE from 'three';
import type { Placed } from '../game/state.ts';
import { lookKey, type CustodeLook } from '../game/look.ts';
import { assemble, handPos, HUMAN_PIVOTS, humanSpec } from '../render/lowpoly/v2/custode.ts';
import { instrumentLP } from '../render/lowpoly/newItems.ts';
import { sleepingCatLP } from '../render/lowpoly/newItems2.ts';
import { rakeLP } from '../render/lowpoly/newItems3.ts';
import { skull } from '../render/lowpoly/extras.ts';
import { LP, type LPModel } from '../render/lowpoly/kit.ts';
import { instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import type { CharacterKind, Pose, Rig } from './characters.ts';

export type Instrument = 'guitar' | 'sticks' | 'trumpet';
export type PropKind = 'mug' | 'hoe' | 'rake' | Instrument;
export type PresenceRole = 'sit' | 'dance' | 'wander' | 'circle' | 'goalie' | 'still';

/** Quante presenze animano bar e orto: con la fascia del dispositivo (economico, medio, top). */
export type PresenceTier = 'low' | 'mid' | 'high';
export const BUSINESS_PRESENCES: Record<'zombie_bar' | 'brain_farm', Record<PresenceTier, number>> = {
  zombie_bar: { low: 2, mid: 3, high: 4 },
  brain_farm: { low: 1, mid: 2, high: 2 },
};

/** Un personaggio dell'oggetto, nello spazio dell'oggetto (centro dell'ingombro, rotazione 0). */
export interface CastMember {
  kind: CharacterKind;
  role: PresenceRole;
  x: number;
  z: number;
  facing?: number;
  /** Sollevato da terra (pedana, panchina, pavimento del gazebo). */
  lift?: number;
  size?: number;
  /** Ruolo 'still': la posa che tiene. */
  pose?: Pose;
  prop?: PropKind;
  /** Ballo e giro: attorno a quale punto (default il centro), raggio, angolo iniziale, velocità. */
  around?: [number, number];
  radius?: number;
  angle?: number;
  speed?: number;
  /** Segnaposto invisibile (l'oggetto vero è un oggetto di scena, es. la statua). */
  hidden?: boolean;
  /** Fantasmi più tenui (0..1): vicini tra loro e a una luce si sommano e diventano bianchi. */
  dim?: number;
}

/** Oggetti di scena che accompagnano un personaggio (`owner` = indice nel cast). */
export interface SceneProp { kind: 'sleepingCat' | 'statue' | 'skullBall' | 'notes'; x: number; y: number; z: number; yaw: number; owner: number }

/**
 * Chi abita un oggetto. `night`: il vampiro esce e i fantasmi ballano nel
 * gazebo; `tier`: quante presenze per bar e orto. Rotto, bar, orto, strega,
 * vampiro e gazebo restano vuoti finché non si riparano.
 */
export function presenceLayout(p: Pick<Placed, 'type' | 'broken'>, opts: { night: boolean; tier: PresenceTier }): { cast: CastMember[]; props: SceneProp[] } {
  const cast: CastMember[] = [];
  const props: SceneProp[] = [];
  const still = (pose: Pose, x: number, z: number, facing: number, lift = 0, prop?: PropKind, kind: CharacterKind = 'zombie', size = 1) =>
    cast.push({ kind, role: 'still', pose, x, z, facing, lift, prop, size }) - 1;
  switch (p.type) {
    case 'zombie_bar':
    case 'brain_farm': {
      if (p.broken) break; // chiuso finché non si ripara
      const crew: Array<() => void> = p.type === 'zombie_bar'
        ? [
          () => still('work', 0.1, -0.45, 0, 0.06), // il barista asciuga i boccali
          () => still('sit', -0.6, 0.66, Math.PI, 0.06, 'mug'),
          () => still('sit', 0.35, 0.66, Math.PI + 0.3, 0.06, 'mug'),
          () => still('dance', 0.95, 0.82, -0.6, 0.06),
        ]
        : [
          () => still('work', -0.95, 0.1, 0.7, 0, 'hoe'), // il contadino zappa i cervelli
          () => still('idle', 0.6, 0.75, 0.35), // il venditore accanto al banco (sotto il tendone non si vedrebbe)
        ];
      for (const f of crew.slice(0, BUSINESS_PRESENCES[p.type][opts.tier])) f();
      break;
    }
    case 'zombies_play':
      cast.push({ kind: 'zombie', role: 'sit', x: -0.72, z: 0, facing: Math.PI / 2 }, { kind: 'zombie', role: 'sit', x: 0.72, z: 0, facing: -Math.PI / 2 });
      break;
    case 'zombies_dance':
      cast.push({ kind: 'zombie', role: 'dance', x: 0.5, z: 0, radius: 0.5, angle: 0 }, { kind: 'zombie', role: 'dance', x: -0.5, z: 0, radius: 0.5, angle: Math.PI });
      break;
    case 'gardener_corner': // rastrella attorno al suo mucchio di foglie
      cast.push({ kind: 'gardener', role: 'wander', x: -0.2, z: -0.55, facing: 0.6, radius: 1.8, speed: 0.4, prop: 'rake' });
      break;
    case 'ghosts_ball':
      cast.push({ kind: 'ghost', role: 'goalie', x: -0.6, z: 0, facing: Math.PI / 2 }, { kind: 'ghost', role: 'goalie', x: 0.6, z: 0, facing: -Math.PI / 2 });
      props.push({ kind: 'skullBall', x: 0, y: 0.5, z: 0, yaw: 0, owner: 0 }); // la "palla" è un teschio
      break;
    case 'witch_corner':
      if (!p.broken) still('work', 0.55, -0.15, 0.1, 0, undefined, 'witch'); // accanto al calderone, verso chi guarda: gira la pozione
      break;
    case 'vampire_crypt':
      // di giorno dorme nella bara; di notte passeggia attorno alla cripta
      if (!p.broken && opts.night) cast.push({ kind: 'vampire', role: 'wander', x: 0.3, z: 1.2, radius: 3, speed: 0.55 });
      break;
    case 'soul_gazebo':
      if (opts.night && !p.broken) {
        for (const [a, k] of [[0, 'ghost'], [Math.PI, 'ghostRare']] as const) cast.push({ kind: k, role: 'dance', x: Math.cos(a) * 0.6, z: Math.sin(a) * 0.6, radius: 0.6, angle: a, lift: 0.3, size: 0.8 });
      }
      break;
    case 'cat_shelter': {
      const roof = still('idle', 0.55, -0.55, 0.5, 1.04, undefined, 'cat');
      props.push({ kind: 'sleepingCat', x: -0.45, y: 0.29, z: -0.28, yaw: 0.8, owner: roof });
      cast.push({ kind: 'cat', role: 'wander', x: -0.12, z: 0.6, radius: 1.4, speed: 0.5 });
      break;
    }
    case 'ghost_picnic':
      still('idle', -0.95, -0.55, 0.9, 0, undefined, 'ghost', 0.75);
      still('cheer', -0.35, 1.0, Math.PI - 0.3, 0, undefined, 'ghost', 0.75);
      still('idle', 1.0, 0.3, -1.4, 0, undefined, 'ghostRare', 0.75);
      break;
    case 'lovers_bench':
      // vicini e davanti al cuore acceso: un po' più tenui, se no si leggono solo come un bagliore
      for (const [x, f, k] of [[-0.33, 0.35, 'ghost'], [0.33, -0.35, 'ghostRare']] as const) cast[still('idle', x, 0.0, f, 0.3, undefined, k, 0.7)].dim = 0.7;
      break;
    case 'skeleton_band': {
      // il palco sta dietro (3×3): davanti, sul prato, due fantasmini ballano; sopra salgono le note
      still('idle', -0.75, BAND_BACK + 0.15, 0.25, 0.12, 'guitar', 'skeleton');
      // il batterista dietro alla sua batteria (sul palco, davanti a lui)
      const drummer = still('idle', 0, BAND_BACK - 0.55, 0, 0.12, 'sticks', 'skeleton');
      still('idle', 0.75, BAND_BACK + 0.15, -0.25, 0.12, 'trumpet', 'skeleton');
      for (const [a, k] of [[0, 'ghost'], [Math.PI, 'ghostRare']] as const) cast.push({ kind: k, role: 'dance', x: Math.cos(a) * 0.38, z: 0.95 + Math.sin(a) * 0.38, around: [0, 0.95], radius: 0.38, angle: a, size: 0.62, speed: 1.6 });
      props.push({ kind: 'notes', x: 0, y: 1.1, z: BAND_BACK, yaw: 0, owner: drummer });
      break;
    }
    case 'keeper_statue': {
      // la statua ha l'aspetto del Custode (lo segue se cambia), tutta in pietra
      const keeper = cast.push({ kind: 'rat', role: 'still', x: 0, z: 0, hidden: true }) - 1; // segnaposto invisibile, senza luci
      props.push({ kind: 'statue', x: 0, y: 0.83, z: 0, yaw: 0, owner: keeper });
      break;
    }
  }
  return { cast, props };
}

/** Di quanto il palco della banda sta indietro nel suo 3×3 (davanti c'è il prato per ballare). */
export const BAND_BACK = -0.5;

/** La posa in cui ritrarre un personaggio fermo (miniature). */
export function castPose(c: CastMember): Pose {
  if (c.role === 'still') return c.pose ?? 'idle';
  if (c.role === 'sit') return 'sit';
  if (c.role === 'dance') return 'dance';
  if (c.role === 'circle') return 'walk';
  return 'idle';
}

// ── Oggetti in mano e di scena ─────────────────────────────────────────

const PROP_MATS = {
  pewter: new THREE.MeshStandardMaterial({ color: '#9a9488', flatShading: true, roughness: 0.6 }),
  foam: new THREE.MeshBasicMaterial({ color: '#b6f06a' }),
  wood: new THREE.MeshStandardMaterial({ color: '#6b4a2e', flatShading: true, roughness: 0.9 }),
  iron: new THREE.MeshStandardMaterial({ color: '#5f6366', flatShading: true, roughness: 0.6 }),
};

export const lpMesh = (m: LPModel) => instantiate({ geometries: m.geometries, lights: [], height: 1, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: true });

/**
 * Strumento della banda nella mano (spazio del braccio del rig v2): violino a
 * sinistra, bacchette in tutte e due le mani, tromba a destra.
 */
function instrumentMeshes(kind: Instrument): Array<{ side: number; mesh: THREE.Object3D }> {
  const at = (side: number, mesh: THREE.Object3D, off: [number, number, number], rot: [number, number, number]) => {
    const h = handPos(side), pv = side > 0 ? HUMAN_PIVOTS.armR : HUMAN_PIVOTS.armL;
    mesh.position.set(h.x - pv[0] + off[0], h.y - pv[1] + off[1], h.z - pv[2] + off[2]);
    mesh.rotation.set(...rot);
    mesh.name = 'prop';
    return { side, mesh };
  };
  if (kind === 'trumpet') return [at(1, lpMesh(instrumentLP('trumpet')), [-0.06, 0.05, 0.05], [0, 0, 0])];
  return [at(1, lpMesh(instrumentLP('sticks')), [0, 0, 0], [-0.6, 0, 0]), at(-1, lpMesh(instrumentLP('sticks')), [0, 0, 0], [-0.3, 0, 0])];
}

/** Boccale con la schiuma verde o zappa, nella mano destra. */
function propMesh(kind: 'mug' | 'hoe'): THREE.Group {
  const g = new THREE.Group();
  g.name = 'prop';
  if (kind === 'mug') {
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.02, 8), PROP_MATS.foam);
    foam.position.y = 0.06;
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 8), PROP_MATS.pewter), foam);
    g.position.set(0.02, -0.02, 0.4);
  } else {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.02), PROP_MATS.iron);
    blade.position.set(0, -0.38, 0.04);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 5), PROP_MATS.wood), blade);
    g.position.set(0.02, -0.05, 0.38);
    g.rotation.x = 0.5;
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

// ── Rastrello del giardiniere ───────────────────────────────────────────

/** Pettine a terra davanti e di lato, cima del manico verso il fianco (spazio del corpo del rig v2). */
const RAKE_G = new THREE.Vector3(0.3, 0.075, 0.62), RAKE_T = new THREE.Vector3(-0.02, 0.4, 0.04);
const RAKE_LEN = RAKE_G.distanceTo(RAKE_T) + 0.14;
const UP = new THREE.Vector3(0, 1, 0);

/** Il braccio (perno `pv`, mano a riposo in `rest`) ruota per portare la mano sul manico G→T. */
function reach(arm: THREE.Object3D, pv: THREE.Vector3, rest: THREE.Vector3, G: THREE.Vector3, T: THREE.Vector3, far: boolean) {
  const len = rest.distanceTo(pv), d = T.clone().sub(G), f = G.clone().sub(pv);
  const A = d.dot(d), B = 2 * f.dot(d), C = f.dot(f) - len * len, disc = B * B - 4 * A * C;
  const s = disc >= 0 ? (-B + (far ? 1 : -1) * Math.sqrt(disc)) / (2 * A) : -B / (2 * A);
  const target = G.clone().addScaledVector(d, THREE.MathUtils.clamp(s, 0, 1));
  arm.quaternion.setFromUnitVectors(rest.clone().sub(pv).normalize(), target.sub(pv).normalize());
}

/**
 * Rastrello impugnato a due mani, di lato: la destra in basso sul manico, la
 * sinistra in alto vicino al fianco. `swing` porta il pettine avanti e indietro.
 */
export function rakeGrip(armL: THREE.Object3D, armR: THREE.Object3D, rake: THREE.Object3D, swing: number) {
  const G = RAKE_G.clone(), T = RAKE_T.clone();
  G.z += swing; T.z += swing * 0.4;
  const y = T.clone().sub(G).normalize(), x = new THREE.Vector3().crossVectors(y, UP).normalize(), z = new THREE.Vector3().crossVectors(x, y);
  rake.position.copy(G);
  rake.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  reach(armR, new THREE.Vector3(...HUMAN_PIVOTS.armR), handPos(1), G, T, false);
  reach(armL, new THREE.Vector3(...HUMAN_PIVOTS.armL), handPos(-1), G, T, true);
}

/** Il rastrello come oggetto del corpo (non della mano: lo tengono tutte e due). */
export function rakeMesh(): THREE.Object3D {
  const m = lpMesh(rakeLP(RAKE_LEN));
  m.name = 'rake';
  return m;
}

/** Fermo rastrella (testa china sul pettine); camminando lo porta con sé. */
function rakePose(rig: Rig, k: number, moving: boolean) {
  const L = rig.parts.armL, R = rig.parts.armR, rake = R?.parent?.getObjectByName('rake');
  if (!L || !R || !rake) return;
  rakeGrip(L, R, rake, moving ? 0 : Math.sin(k * 2.4) * 0.09);
  if (!moving && rig.parts.head) { rig.parts.head.rotation.x = 0.2; rig.parts.head.rotation.y = 0.25; }
}

/** Gesto dell'oggetto in mano (strumenti, rastrello); boccale e zappa li anima chi li usa. */
export function propPose(rig: Rig, prop: PropKind, k: number, moving = false) {
  if (prop === 'rake') rakePose(rig, k, moving);
  else if (prop !== 'mug' && prop !== 'hoe') playPose(rig, prop, k);
}

/** Materiale dei fantasmi attenuato (uno per intensità, condiviso). */
const dimmed = new Map<number, THREE.Material>();
/** Rende più tenui i fantasmi di un rig: la loro trasparenza additiva scende di `k`. */
export function dimGhosts(root: THREE.Object3D, k: number | undefined) {
  if (!k || k >= 1) return;
  const base = LOWPOLY_MATERIALS.ghost as THREE.MeshBasicMaterial;
  let m = dimmed.get(k);
  if (!m) { m = base.clone(); (m as THREE.MeshBasicMaterial).opacity = base.opacity * k; dimmed.set(k, m); }
  root.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh && mesh.material === base) mesh.material = m!; });
}

/** Mette in mano boccale, zappa, rastrello o strumento (anche dopo che il rig è stato ricostruito). */
export function attachProp(rig: Rig, prop: PropKind | undefined) {
  if (!prop || !rig.parts.armR) return;
  if (prop === 'mug' || prop === 'hoe') { rig.parts.armR.add(propMesh(prop)); return; }
  if (prop === 'guitar') {
    // la chitarra sta sul petto (parte del corpo), il manico in alto a sinistra
    const g = lpMesh(instrumentLP('guitar'));
    g.name = 'prop';
    const pv = HUMAN_PIVOTS.body;
    g.position.set(0.03 - pv[0], 0.27 - pv[1], 0.14 - pv[2]);
    g.rotation.set(0.15, 0, -0.42);
    (rig.parts.body ?? rig.parts.armR).add(g);
    return;
  }
  if (prop === 'rake') { rig.parts.armR.parent?.add(rakeMesh()); return; }
  for (const { side, mesh } of instrumentMeshes(prop)) (side > 0 ? rig.parts.armR : rig.parts.armL)?.add(mesh);
}

/** Gli scheletri della banda suonano: archetto, bacchette alternate, tromba che dondola. */
export function playPose(rig: Rig, prop: Instrument, k: number) {
  const L = rig.parts.armL, R = rig.parts.armR, H = rig.parts.head;
  if (!L || !R) return;
  // chitarra: la sinistra sul manico, la destra pizzica le corde; la testa segue il ritmo
  if (prop === 'guitar') { L.rotation.x = -1.0; L.rotation.z = -0.55; R.rotation.x = -0.75 + Math.sin(k * 8) * 0.18; R.rotation.z = 0.35; if (H) H.rotation.x = 0.1 + Math.sin(k * 4) * 0.08; }
  else if (prop === 'sticks') { L.rotation.x = -0.9 + Math.sin(k * 9) * 0.3; R.rotation.x = -0.9 - Math.sin(k * 9) * 0.3; }
  else { L.rotation.x = -1.4 + Math.sin(k * 2) * 0.08; R.rotation.x = -1.4 + Math.sin(k * 2) * 0.08; if (H) H.rotation.x = -0.2 + Math.sin(k * 2) * 0.08; }
}

/** Statua del Custode: il suo aspetto, tutto in pietra (colori in scala di grigi tinti di pietra). */
export function keeperStatue(look: CustodeLook): THREE.Group {
  const S = '#a8a49c', S2 = '#8f8a83', S3 = '#7d7872';
  const a = assemble(humanSpec({ ...look, sparkle: false, skin: S, hairColor: S2, beardColor: S2, eyes: S3, hatColor: S3, outfitColor: S2, accentColor: S3 }, { name: 'statua', eyes: 'closed', blush: S, mouth: 'flat' }), `statua:${lookKey(look)}`);
  const inner = a.root.children[0];
  const parts = Object.keys(HUMAN_PIVOTS);
  const armR = inner.children[parts.indexOf('armR')];
  if (armR) { armR.rotation.x = -2.6; armR.rotation.z = 0.15; } // il braccio alzato a salutare
  const stone = new THREE.Color('#b4aea4'), c = new THREE.Color();
  a.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const col = m.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (col) { for (let i = 0; i < col.count; i++) { c.fromBufferAttribute(col, i); const l = 0.35 + 0.65 * (0.3 * c.r + 0.59 * c.g + 0.11 * c.b); col.setXYZ(i, stone.r * l, stone.g * l, stone.b * l); } col.needsUpdate = true; }
    if (m.material !== LOWPOLY_MATERIALS.solid) m.material = LOWPOLY_MATERIALS.solid;
    m.castShadow = true;
  });
  a.root.scale.setScalar(1.5);
  return a.root;
}

// ── Note musicali della banda ───────────────────────────────────────────

let noteMats: THREE.SpriteMaterial[] | null = null;
/** Crome e semicrome disegnate a mano (non dipendono dai font del telefono), in tre colori. */
function noteMaterials(): THREE.SpriteMaterial[] {
  if (noteMats) return noteMats;
  noteMats = ['#f1d39c', '#bff3e2', '#f0a0c8'].map((fill, i) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.lineWidth = 5; g.strokeStyle = '#1a1416'; g.fillStyle = fill; g.lineJoin = 'round';
    const head = (x: number, y: number) => { g.beginPath(); g.ellipse(x, y, 10, 7.5, -0.4, 0, Math.PI * 2); g.stroke(); g.fill(); };
    const stem = (x: number, y0: number, y1: number) => { g.fillRect(x - 3, y1, 6, y0 - y1); };
    if (i === 1) { // due crome legate
      g.fillStyle = '#1a1416'; g.fillRect(17, 12, 34, 10); g.fillRect(17, 12, 7, 36); g.fillRect(44, 12, 7, 32);
      g.fillStyle = fill; g.fillRect(19, 14, 30, 6); stem(20.5, 46, 14); stem(47.5, 42, 14);
      head(14, 48); head(41, 44);
    } else { // croma con la bandierina
      g.fillStyle = '#1a1416'; g.fillRect(30, 8, 8, 42);
      g.beginPath(); g.moveTo(37, 8); g.quadraticCurveTo(54, 18, 48, 34); g.quadraticCurveTo(48, 22, 37, 22); g.closePath(); g.fill();
      g.fillStyle = fill; g.fillRect(32, 10, 4, 38);
      head(24, 50);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
  });
  return noteMats;
}

/** Nuvola di note che salgono dal palco (si anima con `animateNotes`). */
export function noteCloud(n = 6): THREE.Group {
  const g = new THREE.Group();
  g.name = 'note';
  g.userData.notes = true;
  const mats = noteMaterials();
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(mats[i % mats.length].clone());
    s.scale.setScalar(0.22);
    s.userData.seed = i / n;
    s.raycast = () => undefined;
    g.add(s);
  }
  animateNotes(g, 1.3);
  return g;
}

/** Le note salgono ondeggiando e svaniscono, a turno. */
export function animateNotes(g: THREE.Object3D, t: number) {
  for (const s of g.children as THREE.Sprite[]) {
    const k = ((t * 0.28 + s.userData.seed) % 1 + 1) % 1;
    const side = (s.userData.seed * 7.3) % 2 - 1;
    s.position.set(side * 1.1 + Math.sin(t * 2 + s.userData.seed * 9) * 0.12, k * 1.1, Math.cos(s.userData.seed * 11) * 0.3);
    (s.material as THREE.SpriteMaterial).opacity = Math.min(1, k * 5) * (1 - k);
    s.scale.setScalar(0.18 + k * 0.08);
  }
}

/** Gli oggetti di scena di un personaggio (gatto che dorme, statua, palla-teschio, note). */
export function scenePropObject(kind: SceneProp['kind'], look: CustodeLook): THREE.Object3D {
  if (kind === 'sleepingCat') return lpMesh(sleepingCatLP());
  if (kind === 'statue') return keeperStatue(look);
  if (kind === 'notes') return noteCloud();
  const ball = new THREE.Group();
  const lp = new LP('ghostball:skull');
  skull(lp, 0, -0.1, -0.02, 1);
  const sk = lp.build();
  ball.add(instantiate({ geometries: sk.geometries, lights: [], height: 0.25, mats: LOWPOLY_MATERIALS, dedicated: true }));
  return ball;
}
