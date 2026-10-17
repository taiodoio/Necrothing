// Anteprima (non nel gioco): i nuovi oggetti sbloccabili proposti, in quattro
// tavole (?set=1..4): luci e decorazioni, costruzioni e ambiente, presenze
// ed extra, stagionali. Personaggi: i rig del gioco e, per vampiro, strega e
// statua, lo stesso costruttore del Custode con aspetti nuovi.

import * as THREE from 'three';
import { instantiate, lightWorldPos, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import type { LPModel } from '../render/lowpoly/kit.ts';
import * as N from '../render/lowpoly/newItems.ts';
import * as M from '../render/lowpoly/newItems2.ts';
import * as S from '../render/lowpoly/newItems3.ts';
import { gardenerSpec } from '../render/lowpoly/v2/npc.ts';
import { rakeGrip, rakeMesh } from '../view/presences.ts';
import { LP_SCENERY } from '../render/lowpoly/index.ts';
import { lowpolyGrave } from '../render/lowpoly/graves.ts';
import { lampPost } from '../render/lowpoly/lights.ts';
import { drawIcon, iconUrl } from '../ui/icons.ts';
import { animateRig, buildRig, rigLightPos, type CharacterKind, type Pose } from '../view/characters.ts';
import { assemble, handPos, headAt, headCenter, headFront, humanSpec, onSkin, witchHat as witchHatGame, HUMAN_PIVOTS, DEG, O } from '../render/lowpoly/v2/custode.ts';
import type { LP } from '../render/lowpoly/kit.ts';
import { DEFAULT_LOOK } from '../game/look.ts';

const asModel = (m: LPModel) => ({ geometries: m.geometries, lights: m.lights, height: 1, mats: LOWPOLY_MATERIALS, dedicated: true });
/** Istanza che ricorda il modello (per accendere le sue luci di notte). */
const inst = (m: LPModel, at: [number, number, number] = [0, 0, 0], yaw = 0, s = 1) => {
  const md = asModel(m);
  const g = instantiate(md, { castShadow: true });
  g.userData.model = md;
  g.position.set(...at); g.rotation.y = yaw; g.scale.setScalar(s);
  return g;
};

/** Personaggio del gioco in posa; `extra` aggiusta le parti dopo l'animazione. */
function char(kind: CharacterKind, pose: Pose, at: [number, number, number], facing = 0, t = 0.6, extra?: (p: Record<string, THREE.Group>) => void): THREE.Group {
  const rig = buildRig(kind, 'lowpoly', kind === 'custode' ? DEFAULT_LOOK : undefined);
  animateRig(rig, pose, t, 0.7);
  extra?.(rig.parts as Record<string, THREE.Group>);
  rig.root.position.set(...at);
  rig.root.rotation.y = facing;
  rig.root.userData.rig = rig;
  return rig.root;
}

/** Oggetto in mano destra (o sinistra) di un rig umano. */
function holdIn(arm: THREE.Group, m: LPModel, side: number, off: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0]) {
  const h = handPos(side), pv = side > 0 ? HUMAN_PIVOTS.armR : HUMAN_PIVOTS.armL;
  const g = inst(m);
  g.position.set(h.x - pv[0] + off[0], h.y - pv[1] + off[1], h.z - pv[2] + off[2]);
  g.rotation.set(...rot);
  arm.add(g);
}

/** Personaggio montato da un aspetto nuovo (statico): le parti si posano a mano. */
function figure(look: Parameters<typeof humanSpec>[0], extra: Parameters<typeof humanSpec>[1], name: string, pose?: (p: Record<string, THREE.Object3D>) => void): THREE.Group {
  const a = assemble(humanSpec(look, extra), name);
  const inner = a.root.children[0];
  const parts: Record<string, THREE.Object3D> = {};
  Object.keys(HUMAN_PIVOTS).forEach((k, i) => { parts[k] = inner.children[i]; });
  pose?.(parts);
  return a.root;
}

// ── Personaggi nuovi ────────────────────────────────────────────────────

function vampire(): THREE.Group {
  return figure(
    { skin: '#e4e0ee', hair: 'side', hairColor: '#1b1a20', eyes: '#8a2a2a', hat: 'none', outfit: 'cloak', outfitColor: '#1b1a20', accentColor: '#8e1f2a', beard: 'none', mustache: 'none' },
    {
      name: 'vampiro', mouth: 'smile', blush: '#d8a8c8', held: [],
      head: (lp: LP) => { for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.035, 0.6), 0.006, 0, (q) => q.add(new THREE.ConeGeometry(0.012, 0.035, 4).rotateX(Math.PI), '#fbf7ef', O)); },
      chest: (lp: LP) => {
        // colletto alto del mantello, rosso dentro
        for (const s of [-1, 1]) { lp.push([s * 0.13, 0.5, 0.04], s * -0.4, -0.25); lp.add(new THREE.BoxGeometry(0.16, 0.2, 0.015).translate(0, 0.08, 0), '#1b1a20', O); lp.add(new THREE.BoxGeometry(0.15, 0.19, 0.01).translate(0, 0.08, 0.009), '#8e1f2a', O); lp.pop(); }
        lp.blob(0, 0.45, 0.2, 0.025, 0.025, 0.012, '#c9a227', O);
      },
    },
    'vampiro',
    (p) => { p.armL.rotation.z = -0.9; p.armR.rotation.z = 0.9; p.armL.rotation.x = -0.4; p.armR.rotation.x = -0.4; },
  );
}

/** Cappello da strega: lo stesso del gioco (strega e Custode). */
const witchHat = (lp: LP) => witchHatGame(lp, undefined, undefined, 42, 0.09);

function witch(): THREE.Group {
  const hat = witchHat;
  return figure(
    { skin: '#b6d29a', sparkle: false, hair: 'long', hairColor: '#4a2a5a', eyes: '#2f5a32', hat: 'none', outfit: 'cloak', outfitColor: '#4a3a5a', accentColor: '#5f8a4a', beard: 'none', mustache: 'none', freckles: true },
    {
      name: 'strega', mouth: 'smile', blush: '#d99a9a', hat, hatPh: 42,
      // mestolo per girare la pozione
      held: [{ side: 1, build: (lp: LP) => { lp.cyl(0, -0.05, 0.03, 0.012, 0.012, 0.5, 5, '#6b4a2e', O); lp.blob(0, -0.07, 0.03, 0.045, 0.02, 0.045, '#5a5650', O); } }], head: (lp: LP) => onSkin(lp, headFront(0, 0.68), 0.03, 0, (q) => q.blob(0, 0, 0.02, 0.035, 0.03, 0.05, '#a6c48a', O)) },
    'strega',
    (p) => { p.armR.rotation.x = -1.0; p.armL.rotation.x = -0.6; },
  );
}

/** Statua del Custode: il suo aspetto, tutto in pietra. */
function custodeStatue(): THREE.Group {
  const S = '#a8a49c', S2 = '#8f8a83', S3 = '#7d7872';
  return figure(
    { ...DEFAULT_LOOK, skin: S, hairColor: S2, beardColor: S2, eyes: S3, hatColor: S3, outfitColor: S2, accentColor: S3 },
    { name: 'statua', eyes: 'closed', blush: S, mouth: 'flat' },
    'statua',
    (p) => { p.armR.rotation.x = -2.6; p.armR.rotation.z = 0.15; },
  );
}

// ── Scene dei pannelli ──────────────────────────────────────────────────

const group = (...o: THREE.Object3D[]) => { const g = new THREE.Group(); g.add(...o); return g; };

function band(): THREE.Group {
  const g = group(inst(N.bandStageLP()));
  g.add(char('skeleton', 'idle', [-0.75, 0.12, 0.15], 0.25, 0.4, (p) => { p.armL.rotation.x = -1.2; p.armR.rotation.x = -0.6; p.armR.rotation.z = 0.5; holdIn(p.armL, N.instrumentLP('violin'), -1, [0, 0.05, 0.05], [0.4, 0, 1.2]); }));
  g.add(char('skeleton', 'idle', [0, 0.12, -0.15], 0, 1.1, (p) => { p.armL.rotation.x = -0.9; p.armR.rotation.x = -0.9; holdIn(p.armR, N.instrumentLP('sticks'), 1, [0, 0, 0], [-0.6, 0, 0]); holdIn(p.armL, N.instrumentLP('sticks'), -1, [0, 0, 0], [-0.3, 0, 0]); }));
  g.add(char('skeleton', 'idle', [0.75, 0.12, 0.15], -0.25, 2.0, (p) => { p.armL.rotation.x = -1.4; p.armR.rotation.x = -1.4; p.head.rotation.x = -0.2; holdIn(p.armR, N.instrumentLP('trumpet'), 1, [-0.06, 0.05, 0.05], [0, 0, 0]); }));
  return g;
}

function picnic(): THREE.Group {
  const gh = (k: CharacterKind, pose: Pose, at: [number, number, number], f: number, t: number) => { const g = char(k, pose, at, f, t); g.scale.setScalar(0.75); return g; };
  return group(inst(N.picnicLP()), gh('ghost', 'idle', [-0.95, 0, -0.55], 0.9, 0.3), gh('ghost', 'cheer', [-0.35, 0, 1.0], Math.PI - 0.3, 1.4), gh('ghostRare', 'idle', [1.0, 0, 0.3], -1.4, 2.2));
}

function lovers(): THREE.Group {
  const g = group(inst(N.loversBenchLP()));
  for (const [k, x, f, t] of [['ghost', -0.33, 0.35, 0.2], ['ghostRare', 0.33, -0.35, 0.9]] as const) { const gh = char(k, 'idle', [x, 0.3, 0.0], f, t); gh.scale.setScalar(0.7); g.add(gh); }
  return g;
}

function vampScene(): THREE.Group {
  const v = vampire(); v.position.set(-0.95, 0, 0.25); v.rotation.y = 0.5;
  return group(inst(N.vampireCoffinLP()), v);
}

function witchScene(): THREE.Group {
  const w = witch(); w.position.set(-0.6, 0, 0.15); w.rotation.y = 0.75;
  return group(inst(N.cauldronLP()), w);
}

function cats(): THREE.Group {
  return group(inst(N.sunSlabLP()), char('cat', 'idle', [-0.5, 0.18, -0.25], 0.9, 0.2), char('cat', 'idle', [0.15, 0.12, 0.1], -0.6, 1.3), char('cat', 'cheer', [0.55, 0.12, 0.25], -2.2, 0.5));
}

function barrow(): THREE.Group {
  const gd = char('gravedigger', 'walk', [0, 0, -0.75], 0, 0.3, (p) => { p.armL.rotation.x = -0.55; p.armR.rotation.x = -0.55; });
  return group(inst(N.wheelbarrowLP(), [0, 0, 0.1]), gd);
}

function lanternScene(): THREE.Group {
  return group(char('custode', 'idle', [-0.35, 0, 0], 0.3), inst(N.bigLanternLP(), [0.45, 0, 0.1], 0, 1.4));
}

function broom(): THREE.Group {
  const c = char('custode', 'sit', [0, 0.55, 0.05], 0, 0.3);
  return group(inst(N.broomLP(), [0, 0.6, 0], 0, 1.3), c);
}

/** Tutto in pietra: colori in scala di grigi tinti di pietra, niente parti luminose. */
function petrify(g: THREE.Object3D) {
  const stone = new THREE.Color('#b4aea4'), c = new THREE.Color();
  const solid = LOWPOLY_MATERIALS.solid;
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const col = m.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (col) for (let i = 0; i < col.count; i++) { c.fromBufferAttribute(col, i); const l = 0.35 + 0.65 * (0.3 * c.r + 0.59 * c.g + 0.11 * c.b); col.setXYZ(i, stone.r * l, stone.g * l, stone.b * l); }
    if (col) col.needsUpdate = true;
    if (m.material !== solid) m.material = solid;
    m.castShadow = true;
  });
}

function statue(): THREE.Group {
  const s = custodeStatue(); s.position.set(0, 0.83, 0); s.scale.setScalar(1.5);
  petrify(s);
  return group(inst(N.statuePlinthLP()), s);
}

function gazeboWithCustode(): THREE.Group {
  return group(inst(N.gazeboLP()), char('custode', 'idle', [0.5, 0.28, 0.6], 0.5), char('ghost', 'idle', [-0.4, 0.4, -0.6], 0.3, 1.2));
}


// ── Seconda passata: contesto (prato, lapidi, Custode), pose e funzioni ──

/** Prato attorno all'oggetto: ciuffi, sassolini, fiorellini fuori dal raggio `r0`. */
/** Lampione del gioco (per il confronto). */
const normalLamp = (variant = 0, broken = false) => lampPost({ type: 'lamp_post', variant, dirty: broken, broken, lit: true, seed: 1 });

/** Triangoli e luci di un modello (per le tavole di confronto). */
function lpStats(m: LPModel): string {
  const tris = Object.values(m.geometries).reduce((n, g) => n + (g ? (g.index ? g.index.count : g.getAttribute('position').count) / 3 : 0), 0);
  return `${(tris / 1000).toFixed(1)}k triangoli, ${m.lights.length} luci`;
}

function lawn(r0: number, r1: number, n: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const kinds = ['tuft', 'tuft', 'wgrass', 'pebbles', 'flowers', 'leaves', 'shroom'];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.sin(i * 12.9898 + seed) * 0.4, d = r0 + ((Math.sin(i * 78.233 + seed) + 1) / 2) * (r1 - r0);
    const k = kinds[i % kinds.length];
    g.add(inst(LP_SCENERY[k](String((i * 7 + seed) % 9)), [Math.sin(a) * d, 0, Math.cos(a) * d], a));
  }
  return g;
}

/** Una lapide del gioco accanto all'oggetto, per il contesto. */
const grave = (type: Parameters<typeof lowpolyGrave>[0], at: [number, number, number], yaw = 0, state: Parameters<typeof lowpolyGrave>[1] = 'clean') => inst(lowpolyGrave(type, state, 3), at, yaw);

function gazebo2(night: boolean): THREE.Group {
  const g = group(inst(M.gazeboSpookyLP()), lawn(2.0, 2.9, 22, 3));
  if (night) {
    for (const [x, z, f, pose] of [[0.35, 0.2, -2.0, 'cheer'], [-0.25, 0.45, 1.1, 'idle']] as const) { const gh = char('ghost', pose, [x, 0.3, z], f, 1.3); gh.scale.setScalar(0.8); g.add(gh); }
  } else g.add(char('custode', 'idle', [0.6, 0.29, 0.75], 0.4));
  return g;
}

function bellScene(): THREE.Group {
  const c = char('custode', 'idle', [0.62, 0.22, 0.62], -2.3, 0.3, (p) => { p.armL.rotation.x = -2.3; p.armL.rotation.z = -0.2; });
  return group(inst(M.soulBellLP()), c, lawn(1.1, 2.0, 16, 5));
}

function vampireDay(): THREE.Group { return group(inst(M.vampireCryptLP(false)), lawn(1.1, 1.9, 14, 8)); }

function vampire2(): THREE.Group {
  const v = figure(
    { skin: '#e4e0ee', sparkle: false, hair: 'side', hairColor: '#1b1a20', eyes: '#8a2a2a', hat: 'none', outfit: 'coat', outfitColor: '#1b1a20', accentColor: '#8e1f2a', beard: 'none', mustache: 'none' },
    {
      name: 'vampiro2', mouth: 'smile', blush: '#d8a8c8', held: [], plainCoat: true,
      head: (lp: LP) => { for (const s of [-1, 1]) onSkin(lp, headFront(s * 0.035, 0.6), 0.006, 0, (q) => q.add(new THREE.ConeGeometry(0.012, 0.035, 4).rotateX(Math.PI), '#fbf7ef', O)); },
      chest: (lp: LP) => {
        // mantello lungo con la fodera rossa e il colletto alto
        lp.add(new THREE.CylinderGeometry(0.2, 0.34, 0.5, 12, 1, true, Math.PI / 2 + 0.25, Math.PI - 0.5).translate(0, 0.26, -0.02), '#141418', O);
        lp.add(new THREE.CylinderGeometry(0.19, 0.33, 0.49, 12, 1, true, Math.PI / 2 + 0.25, Math.PI - 0.5).scale(-1, 1, 1).translate(0, 0.26, -0.02), '#8e1f2a', O);
        for (const sd of [-1, 1]) { lp.push([sd * 0.14, 0.5, 0.0], sd * -0.5, -0.3); lp.add(new THREE.BoxGeometry(0.16, 0.2, 0.015).translate(0, 0.08, 0), '#141418', O); lp.add(new THREE.BoxGeometry(0.15, 0.19, 0.01).translate(0, 0.08, 0.009), '#8e1f2a', O); lp.pop(); }
        lp.blob(0, 0.44, 0.2, 0.03, 0.03, 0.012, '#c9a227', O);
      },
    },
    'vampiro2',
    (p) => { p.armR.rotation.z = 1.1; p.armR.rotation.x = -0.6; p.armL.rotation.x = -0.3; },
  );
  v.position.set(0.25, 0.1, 0.95); v.rotation.y = -0.3;
  return group(inst(M.vampireCryptLP(true)), v, lawn(1.2, 1.9, 14, 8));
}

/** Etichetta dell'incasso (fiammella del fuoco fatuo e «+N»), come sopra bar e orto. */
function wispBadge(n: number, y: number): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 192; c.height = 96;
  const g = c.getContext('2d')!;
  const plate = (inset: number, color: string) => { g.fillStyle = color; g.fillRect(inset + 6, inset, 192 - 2 * (inset + 6), 96 - 2 * inset); g.fillRect(inset, inset + 6, 192 - 2 * inset, 96 - 2 * (inset + 6)); };
  plate(0, '#07080b'); plate(6, '#c9a25c'); plate(12, '#161920');
  drawIcon(g, 'wisp', 20, 20, 56);
  g.fillStyle = '#f1d39c'; g.font = 'bold 46px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(`+${n}`, 84, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, toneMapped: false }));
  sp.scale.set(0.9, 0.45, 1); sp.position.y = y; sp.renderOrder = 10;
  return sp;
}

/** Il Custode col cappello da strega (nuovo cappello della personalizzazione). */
function custodeWitchHat(look: Partial<typeof DEFAULT_LOOK>, name: string, x: number, yaw: number): THREE.Group {
  const c = figure({ ...DEFAULT_LOOK, ...look, hat: 'none' }, { name, hat: witchHat, hatPh: 42 }, name);
  c.position.set(x, 0, 0); c.rotation.y = yaw;
  return c;
}

function bellRung(): THREE.Group {
  const c = char('custode', 'cheer', [0.62, 0.22, 0.62], -2.3, 0.3);
  const g = group(inst(M.soulBellLP()), c, lawn(1.1, 2.0, 16, 5));
  for (const [x, z, f, k] of [[-1.2, 0.6, 1.2, 'ghost'], [1.3, -0.4, -1.4, 'ghostRare'], [-0.6, -1.2, 0.4, 'ghost']] as const) { const gh = char(k, 'cheer', [x, 0, z], f, x); gh.scale.setScalar(0.8); g.add(gh); }
  return g;
}

function reaper(night: boolean): THREE.Group { return group(inst(M.reaperLP(night)), lawn(1.0, 1.8, 14, 31)); }

function witch2(): THREE.Group {
  const w = witch(); w.position.set(0.85, 0, 0.0); w.rotation.y = -0.65;
  const b = wispBadge(5, 2.0); b.position.x = -0.35;
  return group(inst(M.witchCornerLP()), w, b, lawn(1.1, 1.8, 12, 4));
}

function cats2(): THREE.Group {
  const sleeper = inst(M.sleepingCatLP(), [-0.45, 0.29, -0.28], 0.8);
  return group(inst(M.catShelterLP()), sleeper, char('cat', 'idle', [0.55, 1.04, -0.55], 0.5, 0.8), char('cat', 'cheer', [-0.12, 0, 0.5], -0.9, 0.4), lawn(1.1, 1.8, 12, 9));
}

/** Custode a cavalcioni della scopa: anca sul manico, piedi ai lati, mani avanti sul manico. */
function broomRider(): THREE.Group {
  const H = 0.75;
  const g = new THREE.Group();
  const rig = buildRig('custode', 'lowpoly', DEFAULT_LOOK);
  animateRig(rig, 'idle', 0, 0);
  g.add(rig.root);
  rig.root.updateMatrixWorld(true);
  const p = rig.parts as Record<string, THREE.Group>;
  const hip = p.legL.getWorldPosition(new THREE.Vector3());
  const broomY = H, lift = broomY - hip.y + 0.03;
  rig.root.position.set(0, lift, 0.05);
  rig.root.updateMatrixWorld(true);
  const aim = (part: THREE.Group, target: THREE.Vector3) => {
    const from = part.getWorldPosition(new THREE.Vector3());
    const d = target.clone().sub(from);
    part.rotation.x = -Math.atan2(d.z, -d.y);
    part.rotation.z = Math.atan2(d.x, -d.y) * 0.9;
  };
  for (const s of [-1, 1]) {
    aim(s < 0 ? p.legL : p.legR, new THREE.Vector3(s * 0.2, broomY - 0.2, 0.18));
    aim(s < 0 ? p.armL : p.armR, new THREE.Vector3(s * 0.07, broomY + 0.02, 0.45));
  }
  p.body.rotation.x = 0.18;
  p.head.rotation.x = -0.1;
  const broom = inst(M.broom2LP(), [0, broomY - 0.02, 0.05], 0, 1.25);
  broom.rotation.x = -0.08;
  g.add(broom);
  // stelline della scia e ombra a terra (si capisce che vola)
  for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.03 - i * 0.003), new THREE.MeshBasicMaterial({ color: '#fff0a0' })); s.position.set(Math.sin(i * 2.1) * 0.12, broomY + Math.cos(i * 1.7) * 0.08, -1.1 - i * 0.18); g.add(s); }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.position.y = 0.01; shadow.scale.set(0.7, 1, 1.6); g.add(shadow);
  g.userData.rig = rig;
  return g;
}

function broomScene(): THREE.Group { return group(broomRider(), lawn(0.9, 2.2, 18, 2)); }

function staffScene(): THREE.Group {
  const c = char('custode', 'idle', [0, 0, 0], 0.5, 0.3, (p) => { p.armR.rotation.x = -0.5; holdIn(p.armR, M.mysticStaffLP(), 1, [0, -0.42, 0.02], [0, 0, 0]); });
  const g = group(c, lawn(1.9, 2.4, 22, 6));
  // fuochi fatui che arrivano da lontano verso il cristallo
  const target = new THREE.Vector3(0.18, 1.1, 0.12);
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + 0.3, d = 0.9 + (i % 3) * 0.35;
    const w = inst(M.wispTrailLP(0.5 + d * 0.2), [Math.sin(a) * d, 0.5 + (i % 2) * 0.35, Math.cos(a) * d]);
    w.lookAt(target); g.add(w);
  }
  // raggio d'attrazione: anello tratteggiato a terra
  for (let i = 0; i < 40; i += 2) {
    const a0 = (i / 40) * Math.PI * 2;
    const seg = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.02, 3, 6, (Math.PI * 2) / 40), new THREE.MeshBasicMaterial({ color: '#8ff0dc', transparent: true, opacity: 0.8 }));
    seg.rotation.set(-Math.PI / 2, 0, a0); seg.position.y = 0.02; g.add(seg);
  }
  return g;
}

function patch2(): THREE.Group { return group(inst(M.pumpkinPatch2LP()), lawn(1.55, 2.3, 20, 7)); }

function ofrenda2(withCustode: boolean): THREE.Group {
  const g = group(inst(M.ofrenda2LP()), lawn(1.4, 2.3, 18, 11));
  if (withCustode) g.add(char('custode', 'pray', [1.3, 0, 0.9], -2.2, 0.3));
  return g;
}

function snowman2(): THREE.Group {
  const g = group(inst(M.skeletonSnowman2LP()));
  const snow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#dfe8ec', roughness: 1 }));
  snow.position.y = 0.004; snow.receiveShadow = true; g.add(snow);
  return g;
}

/** Spaventapasseri: la testa ruota a parte (verso il Custode), il corvo si posa sul braccio. */
function scarecrow(lit: boolean, headYaw = 0, crow = false): THREE.Group {
  const s = group(inst(S.scarecrowBodyLP(lit)), inst(S.scarecrowHeadLP(lit), [0, S.SCARECROW_NECK, 0], headYaw));
  if (crow) { const c = char('crow', 'idle', [0.33 * S.SCARECROW_SCALE, 1.03 * S.SCARECROW_SCALE, -0.02], 0.9, 0.4); c.scale.setScalar(0.55 * S.SCARECROW_SCALE); s.add(c); }
  return group(s, lawn(0.7, 1.5, 12, 51));
}

/**
 * Scheletro giardiniere che rastrella (lo stesso gesto del gioco): il pettine a
 * terra davanti e di lato, la destra in basso sul manico, la sinistra in alto.
 */
function gardener(t = 0): THREE.Group {
  const a = assemble(gardenerSpec(), 'giardiniere');
  const inner = a.root.children[0];
  const parts: Record<string, THREE.Object3D> = {};
  Object.keys(HUMAN_PIVOTS).forEach((k, i) => { parts[k] = inner.children[i]; });
  const rake = rakeMesh();
  inner.add(rake);
  rakeGrip(parts.armL, parts.armR, rake, Math.sin(t) * 0.09);
  parts.head.rotation.x = 0.2; parts.head.rotation.y = 0.25;
  return a.root;
}

interface Panel { title: string; night?: boolean; dusk?: boolean; yaw: number; pitch?: number; zoom: number; center?: [number, number, number]; build: () => THREE.Group }

const SETS: Record<string, Panel[]> = {
  '1': [
    { title: 'Ghirlanda di teschi luminosi', night: true, yaw: 0.35, zoom: 1.2, center: [0, 0.9, 0], build: () => group(inst(N.skullGarlandLP())) },
    { title: 'Lucciole in barattolo', night: true, yaw: 0.5, zoom: 0.65, center: [0, 0.45, 0], build: () => group(inst(N.fireflyJarLP())) },
    { title: 'Candelabro gotico', night: true, yaw: 0.5, zoom: 0.8, center: [0, 0.65, 0], build: () => group(inst(N.candelabraLP())) },
    { title: 'Lanterna degli spiriti', night: true, yaw: 0.5, zoom: 0.85, center: [0, 0.7, 0], build: () => group(inst(N.spiritLanternLP())) },
    { title: 'Lampione del Custode', night: true, yaw: 0.5, zoom: 1.35, center: [0.3, 1.15, 0], build: () => group(inst(N.custodeLampLP()), char('custode', 'idle', [0.85, 0, -0.1], -1.3)) },
    { title: 'Gargoyle', night: true, yaw: 0.6, zoom: 0.9, center: [0, 0.85, 0], build: () => group(inst(N.gargoyleLP())) },
    { title: 'Corvo impagliato', yaw: 0.6, zoom: 0.75, center: [0, 0.75, 0], build: () => group(inst(N.stuffedCrowLP())) },
    { title: 'Pila di libri ammuffiti', yaw: 0.6, zoom: 0.55, center: [0, 0.25, 0], build: () => group(inst(N.bookPileLP())) },
    { title: 'Statua del Custode (col suo aspetto)', yaw: 0.5, zoom: 1.95, center: [0, 1.45, 0], build: statue },
  ],
  '2': [
    { title: 'Gazebo rotondo · giorno', yaw: 0.6, zoom: 2.3, center: [0, 1.25, 0], build: () => group(inst(N.gazeboLP())) },
    { title: 'Gazebo rotondo · notte', night: true, yaw: 0.6, zoom: 2.3, center: [0, 1.25, 0], build: () => group(inst(N.gazeboLP())) },
    { title: 'Gazebo · col Custode, come in gioco', yaw: Math.PI / 4, pitch: 0.7, zoom: 2.3, center: [0, 1.0, 0], build: gazeboWithCustode },
    { title: 'Campanile', yaw: 0.6, zoom: 2.6, center: [0, 2.35, 0], build: () => group(inst(N.bellTowerLP())) },
    { title: 'Palude con le mani', yaw: 0.5, zoom: 1.6, center: [0, 0.3, 0], build: () => group(inst(N.swampLP())) },
    { title: 'Albero con l’altalena', yaw: 0.6, zoom: 1.5, center: [0, 1.15, 0], build: () => group(inst(N.swingTreeLP())) },
    { title: 'Nebbia stagnante', night: true, yaw: 0.6, zoom: 1.1, center: [0, 0.2, 0], build: () => group(inst(N.lowFogLP())) },
    { title: 'Salice piangente', yaw: 0.6, zoom: 1.75, center: [0, 1.3, 0], build: () => group(inst(N.willowLP())) },
    { title: 'Crepa infernale', night: true, yaw: 0.5, pitch: 0.7, zoom: 1.4, center: [0, 0.2, 0], build: () => group(inst(N.hellCrackLP())) },
  ],
  '3': [
    { title: 'Banda di scheletri', night: true, dusk: true, yaw: 0.45, zoom: 1.55, center: [0, 0.7, 0], build: band },
    { title: 'Picnic dei fantasmi', yaw: 0.6, pitch: 0.62, zoom: 1.55, center: [0, 0.35, 0], build: picnic },
    { title: 'Vampiro nella bara (esce di notte)', night: true, dusk: true, yaw: 0.5, zoom: 1.15, center: [-0.35, 0.55, 0.1], build: vampScene },
    { title: 'Strega col calderone', night: true, dusk: true, yaw: 0.45, zoom: 1.15, center: [-0.15, 0.65, 0], build: witchScene },
    { title: 'Gatti neri al sole', yaw: 0.6, zoom: 1.05, center: [0, 0.35, 0], build: cats },
    { title: 'Extra · Carriola del becchino', yaw: 0.9, zoom: 1.1, center: [0, 0.55, -0.3], build: barrow },
    { title: 'Extra · Lanterna potenziata', night: true, yaw: 0.4, zoom: 1.0, center: [0, 0.55, 0], build: lanternScene },
    { title: 'Extra · Scopa volante', yaw: 0.9, zoom: 1.15, center: [0, 0.9, 0], build: broom },
    { title: 'Extra · Calamita per fuochi fatui', night: true, yaw: 0.5, zoom: 0.8, center: [0, 0.6, 0], build: () => group(inst(N.wispMagnetLP())) },
  ],
  '4': [
    { title: 'Ottobre · Campo di zucche', night: true, dusk: true, yaw: 0.6, zoom: 1.7, center: [0, 0.5, 0], build: () => group(inst(N.pumpkinPatchLP())) },
    { title: 'Ottobre · Ragnatela gigante', night: true, dusk: true, yaw: 0.3, zoom: 1.15, center: [0, 0.95, 0], build: () => group(inst(N.giantWebLP())) },
    { title: '2 novembre · Altarino dei morti', night: true, yaw: 0.35, zoom: 1.05, center: [0, 0.7, 0], build: () => group(inst(N.ofrendaLP())) },
    { title: '2 novembre · Arco di cempasúchil', yaw: 0.35, zoom: 1.45, center: [0, 1.0, 0], build: () => group(inst(N.marigoldArchLP())) },
    { title: 'Dicembre · Pupazzo di neve scheletro', yaw: 0.5, zoom: 0.8, center: [0, 0.6, 0], build: () => group(inst(N.skeletonSnowmanLP())) },
    { title: 'Dicembre · Luci di Natale sul recinto', night: true, yaw: 0.4, zoom: 0.75, center: [0, 0.55, 0], build: () => group(inst(N.fenceLightsLP())) },
    { title: 'Febbraio · Fantasmi innamorati', night: true, dusk: true, yaw: 0.4, zoom: 1.05, center: [0, 0.6, 0], build: lovers },
  ],
  '5': [
    { title: 'Gazebo delle anime · giorno', yaw: 0.6, zoom: 2.7, center: [0, 1.25, 0], build: () => gazebo2(false) },
    { title: 'Gazebo delle anime · di notte i fantasmi ballano', night: true, dusk: true, yaw: 0.6, zoom: 2.5, center: [0, 1.25, 0], build: () => gazebo2(true) },
    { title: 'Campana delle anime · suonata, arrivano i fantasmi', night: true, dusk: true, yaw: 0.5, zoom: 2.0, center: [0, 1.1, 0], build: bellRung },
    { title: 'Mietitore di pietra · giorno', yaw: 0.45, zoom: 1.35, center: [0, 1.05, 0], build: () => reaper(false) },
    { title: 'Mietitore di pietra · notte', night: true, dusk: true, yaw: 0.45, zoom: 1.35, center: [0, 1.05, 0], build: () => reaper(true) },
    { title: 'Mietitore · come in gioco, col Custode', yaw: Math.PI / 4, pitch: 0.7, zoom: 1.7, center: [0, 0.8, 0.2], build: () => group(reaper(false), char('custode', 'idle', [1.1, 0, 0.6], -0.8)) },
    { title: 'Cerchio di pietre nella nebbia', night: true, dusk: true, yaw: 0.5, pitch: 0.6, zoom: 1.75, center: [0, 0.4, 0], build: () => group(inst(M.stoneCircleLP()), lawn(1.5, 2.3, 18, 14)) },
    { title: 'Cipresso (al posto del salice)', yaw: 0.55, zoom: 1.8, center: [0, 1.4, 0], build: () => group(inst(M.cypressLP()), lawn(0.6, 1.6, 14, 15), char('custode', 'idle', [0.95, 0, -0.2], -0.9)) },
    { title: 'Melo stregato (altra idea)', night: true, dusk: true, yaw: 0.55, zoom: 1.35, center: [0, 0.9, 0], build: () => group(inst(M.witchAppleLP()), lawn(1.0, 1.8, 14, 17)) },
    { title: 'Funghi luminosi sul tronco caduto', night: true, yaw: 0.45, zoom: 0.95, center: [0, 0.3, 0], build: () => group(inst(M.glowShroomsLP()), lawn(0.9, 1.5, 12, 16)) },
    { title: 'Palude con le mani', yaw: 0.5, pitch: 0.62, zoom: 1.95, center: [0, 0.25, 0], build: () => group(inst(M.swamp2LP()), lawn(2.0, 2.8, 20, 12)) },
    { title: 'Albero dell’altalena', yaw: 0.55, zoom: 1.6, center: [0, 1.25, 0], build: () => group(inst(M.swingTree2LP()), lawn(1.0, 1.8, 14, 13)) },
  ],
  '6': [
    { title: 'Vampiro · di giorno dorme nella bara', yaw: 0.5, zoom: 1.55, center: [0, 0.9, 0], build: vampireDay },
    { title: 'Vampiro · di notte esce a passeggiare', night: true, dusk: true, yaw: 0.5, zoom: 1.6, center: [0, 0.95, 0.2], build: vampire2 },
    { title: 'Strega · vende pozioni: incasso da riscuotere', night: true, dusk: true, yaw: 0.5, zoom: 1.5, center: [0, 0.9, 0.1], build: witch2 },
    { title: 'Nuovo cappello del Custode: da strega', yaw: 0.35, zoom: 0.95, center: [0, 0.7, 0], build: () => group(custodeWitchHat({}, 'cs1', -0.45, 0.3), custodeWitchHat({ hair: 'long', hairColor: '#b0774a', skin: '#e0b48f', outfitColor: '#4a3a5a' }, 'cs2', 0.45, -0.3), lawn(0.9, 1.5, 12, 3)) },
    { title: 'Rifugio dei gatti neri', yaw: 0.55, zoom: 1.3, center: [0, 0.55, 0], build: cats2 },
    { title: 'Scopa volante · a cavalcioni', yaw: 1.15, pitch: 0.42, zoom: 1.15, center: [0, 0.85, -0.1], build: broomScene },
    { title: 'Bastone mistico · attira i fuochi fatui da lontano', night: true, dusk: true, yaw: 0.5, pitch: 0.62, zoom: 1.75, center: [0, 0.5, 0], build: staffScene },
  ],
  '7': [
    { title: 'Campo di zucche · giorno', yaw: 0.55, pitch: 0.6, zoom: 1.85, center: [0, 0.5, 0], build: patch2 },
    { title: 'Campo di zucche · notte', night: true, dusk: true, yaw: 0.55, pitch: 0.6, zoom: 1.85, center: [0, 0.5, 0], build: patch2 },
    { title: 'Altare dei morti con l’arco · notte', night: true, dusk: true, yaw: 0.4, zoom: 1.85, center: [0, 0.95, 0.2], build: () => ofrenda2(true) },
    { title: 'Altare dei morti · da vicino', night: true, dusk: true, yaw: 0.25, pitch: 0.3, zoom: 0.95, center: [0, 0.85, 0], build: () => ofrenda2(false) },
    { title: 'Pupazzo di neve scheletro', yaw: 0.45, pitch: 0.35, zoom: 0.8, center: [0, 0.7, 0], build: snowman2 },
  ],
  '8': [
    { title: 'Mietitore di pietra · giorno', yaw: 0.45, zoom: 1.35, center: [0, 1.05, 0], build: () => reaper(false) },
    { title: 'Mietitore di pietra · notte', night: true, dusk: true, yaw: 0.45, zoom: 1.35, center: [0, 1.05, 0], build: () => reaper(true) },
    { title: 'Mietitore · come in gioco, col Custode', yaw: Math.PI / 4, pitch: 0.7, zoom: 1.7, center: [0, 0.8, 0.2], build: () => group(reaper(false), char('custode', 'idle', [1.1, 0, 0.6], -0.8)) },
    { title: 'Tomba sporcata da uno zombie: impronte di fango', yaw: 0.5, pitch: 0.6, zoom: 1.2, center: [0, 0.35, 0], build: () => group(grave('gothic', [0, 0, 0], 0, 'dirty'), inst(M.mudTracksLP(1)), lawn(1.3, 2.0, 14, 32)) },
    { title: 'Altra tomba, stesse impronte', yaw: 0.5, pitch: 0.6, zoom: 1.2, center: [0, 0.35, 0], build: () => group(grave('celtic_cross', [0, 0, 0], 0, 'dirty'), inst(M.mudTracksLP(2), [0, 0, 0], 1.2), lawn(1.3, 2.0, 14, 33)) },
    { title: 'Lo zombie se ne va lasciando la scia', yaw: Math.PI / 4, pitch: 0.7, zoom: 1.6, center: [0.3, 0.4, -0.2], build: () => group(grave('rectangular', [0, 0, 0], 0, 'dirty'), inst(M.mudTracksLP(3)), char('zombie', 'walk', [1.0, 0, -0.9], 2.4, 0.4), lawn(1.6, 2.4, 16, 34)) },
  ],
  '9': [
    { title: 'Lampione del Custode · giorno', yaw: 0.5, zoom: 1.5, center: [0.1, 1.3, 0], build: () => group(inst(M.custodeLamp2LP(false)), lawn(0.7, 1.4, 12, 41)) },
    { title: 'Lampione del Custode · notte', night: true, dusk: true, yaw: 0.5, zoom: 1.5, center: [0.1, 1.3, 0], build: () => group(inst(M.custodeLamp2LP(true)), lawn(0.7, 1.4, 12, 41)) },
    { title: 'Accanto a un lampione normale', night: true, dusk: true, yaw: 0.35, zoom: 1.7, center: [0.3, 1.3, 0], build: () => group(inst(M.custodeLamp2LP(true), [-0.5, 0, 0]), inst(normalLamp(), [1.1, 0, 0]), lawn(1.4, 2.0, 14, 42)) },
    { title: 'Dentro il raggio non si rompono, fuori sì', night: true, dusk: true, yaw: Math.PI / 4, pitch: 0.85, zoom: 3.9, center: [0.6, 0.5, 0.6], build: () => group(inst(M.custodeLamp2LP(true)), inst(M.keeperRadiusLP(2.5)), inst(normalLamp(), [1.6, 0, -1.0]), inst(normalLamp(1), [-1.3, 0, 1.5]), inst(normalLamp(2, true), [3.3, 0, 3.0]), char('custode', 'idle', [0.9, 0, -0.9], -0.6), lawn(1.0, 3.4, 26, 43)) },
  ],
  '10': [
    { title: `Altare dei morti · prima (${lpStats(M.ofrenda2LP(true, false))})`, night: true, dusk: true, yaw: 0.4, zoom: 1.6, center: [0, 0.8, 0.2], build: () => group(inst(M.ofrenda2LP(true, false)), lawn(1.4, 2.2, 14, 11)) },
    { title: `Altare dei morti · leggero (${lpStats(M.ofrenda2LP(true, true))})`, night: true, dusk: true, yaw: 0.4, zoom: 1.6, center: [0, 0.8, 0.2], build: () => group(inst(M.ofrenda2LP(true, true)), lawn(1.4, 2.2, 14, 11)) },
    { title: `Gazebo · prima (${lpStats(M.gazeboSpookyLP(true, false))})`, night: true, dusk: true, yaw: 0.6, zoom: 2.5, center: [0, 1.3, 0], build: () => group(inst(M.gazeboSpookyLP(true, false)), lawn(2.0, 2.9, 22, 3)) },
    { title: `Gazebo · leggero (${lpStats(M.gazeboSpookyLP(true, true))})`, night: true, dusk: true, yaw: 0.6, zoom: 2.5, center: [0, 1.3, 0], build: () => group(inst(M.gazeboSpookyLP(true, true)), lawn(2.0, 2.9, 22, 3)) },
    { title: `Campo di zucche · prima (${lpStats(M.pumpkinPatch2LP(true, false))})`, night: true, dusk: true, yaw: 0.55, pitch: 0.6, zoom: 1.85, center: [0, 0.5, 0], build: () => group(inst(M.pumpkinPatch2LP(true, false)), lawn(1.55, 2.3, 20, 7)) },
    { title: `Campo di zucche · leggero (${lpStats(M.pumpkinPatch2LP(true, true))})`, night: true, dusk: true, yaw: 0.55, pitch: 0.6, zoom: 1.85, center: [0, 0.5, 0], build: () => group(inst(M.pumpkinPatch2LP(true, true)), lawn(1.55, 2.3, 20, 7)) },
  ],
  '11': [
    { title: 'Strega del gioco · di fronte', yaw: 0, pitch: 0.25, zoom: 1.0, center: [0, 0.75, 0], build: () => group(char('witch', 'idle', [0, 0, 0], 0, 0.3), lawn(0.6, 1.2, 10, 3)) },
    { title: 'Strega del gioco · tre quarti', yaw: 0.7, pitch: 0.35, zoom: 1.0, center: [0, 0.75, 0], build: () => group(char('witch', 'idle', [0, 0, 0], 0, 0.3), lawn(0.6, 1.2, 10, 3)) },
    { title: 'Strega al calderone · come in gioco', yaw: Math.PI / 4, pitch: 0.75, zoom: 1.35, center: [0.3, 0.6, 0], build: () => group(inst(M.witchCornerLP()), char('witch', 'work', [0.55, 0, -0.15], 0.1, 0.3), lawn(1.1, 1.8, 12, 4)) },
  ],
  '12': [
    { title: 'Spaventapasseri · giorno', yaw: 0.5, pitch: 0.3, zoom: 1.2, center: [0, 0.95, 0], build: () => scarecrow(false) },
    { title: 'Spaventapasseri · notte (zucca accesa)', night: true, dusk: true, yaw: 0.5, pitch: 0.3, zoom: 1.2, center: [0, 0.95, 0], build: () => scarecrow(true) },
    { title: 'Ti segue con lo sguardo (e il corvo)', yaw: Math.PI / 4, pitch: 0.7, zoom: 1.6, center: [-0.2, 0.7, 0.4], build: () => group(scarecrow(false, 0.21, true), char('custode', 'walk', [0.3, 0, 1.45], 1.6, 0.4)) },
    { title: 'Scheletro giardiniere · di fronte', yaw: 0.15, pitch: 0.25, zoom: 0.95, center: [0, 0.6, 0], build: () => group(gardener(), lawn(0.6, 1.2, 10, 52)) },
    { title: 'Giardiniere · rastrella le foglie', yaw: 0.9, pitch: 0.4, zoom: 0.95, center: [0, 0.45, 0], build: () => group(gardener(1.2), inst(S.gardenerCornerLP(), [0.55, 0, -0.35]), lawn(0.9, 1.6, 12, 53)) },
    { title: 'Giardiniere · come in gioco', yaw: Math.PI / 4, pitch: 0.75, zoom: 1.3, center: [0.2, 0.4, 0], build: () => { const gd = gardener(0.4); gd.position.set(-0.15, 0, -0.5); gd.rotation.y = 0.6; return group(inst(S.gardenerCornerLP()), gd, grave('stone_simple', [-1.3, 0, 0.3], 0.2), lawn(1.2, 2.0, 16, 54)); } },
  ],
};

const set = new URLSearchParams(location.search).get('set') ?? '1';
const panels = SETS[set] ?? SETS['1'];
const COLS = 3, CW = 500, CH = 440, TOP = 34;
const rows = Math.ceil(panels.length / COLS);
const W = CW * COLS, H = TOP + rows * (CH + TOP);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setScissorTest(true);
document.querySelector('.tavola')!.prepend(renderer.domElement);
const labels = document.querySelector('#etichette')!;
const label = (x: number, y: number, text: string) => { const d = document.createElement('div'); d.className = 'label'; d.style.left = `${x}px`; d.style.top = `${y}px`; d.textContent = text; labels.append(d); };

type ModelLight = Parameters<typeof lightWorldPos>[0] & { color: string; intensity: number; range: number };

panels.forEach((pn, i) => {
  const col = i % COLS, row = Math.floor(i / COLS);
  const x = col * CW, yTop = TOP + row * (CH + TOP);
  label(x + CW / 2, yTop - 26, pn.title);
  // pannello del bastone: i due pulsanti sulla mappa (bastone sopra la bici)
  if (pn.title.startsWith('Bastone')) {
    const box = document.createElement('div');
    box.style.cssText = `position:absolute;z-index:3;left:${x + CW - 84}px;top:${yTop + CH - 150}px;display:grid;gap:8px`;
    for (const [ic, on] of [['staff', true], ['bike', false]] as const) {
      const b = document.createElement('div'); b.className = `btn${on ? ' on' : ''}`;
      b.style.cssText = `width:58px;height:58px;display:grid;place-items:center;background:#161920;box-shadow:inset 0 0 0 3px #07080b, inset 0 0 0 6px ${on ? '#c9a25c' : '#3a3f49'}`;
      const i2 = document.createElement('i'); i2.style.cssText = `width:40px;height:40px;background-size:contain;image-rendering:pixelated;background-image:${iconUrl(ic)}`;
      b.append(i2); box.append(b);
    }
    document.querySelector('.tavola')!.append(box);
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(pn.night ? '#141a24' : '#2a3530');
  renderer.toneMappingExposure = pn.night ? 1.25 : 1.1;
  // crepuscolo: notte con la luna più chiara (per leggere i personaggi scuri)
  scene.add(new THREE.HemisphereLight(pn.night ? '#5b6d92' : '#e9eff0', '#2b2724', pn.dusk ? 1.3 : pn.night ? 0.55 : 1.4));
  const sun = new THREE.DirectionalLight(pn.night ? '#9db3e6' : '#fff0da', pn.dusk ? 1.3 : pn.night ? 0.5 : 2.4);
  sun.position.set(-4, 8, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 5, bottom: -4 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3b4a35', roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
  const g = pn.build();
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true; });
  scene.add(g);
  g.updateMatrixWorld(true);
  // di notte si accendono le luci dei modelli e quelle portate dai personaggi (lanterna del Custode)
  if (pn.night) g.traverse((o) => {
    const model = o.userData?.model as { lights?: ModelLight[] } | undefined;
    for (const a of model?.lights ?? []) { const l = new THREE.PointLight(a.color, a.intensity * 4, a.range * 1.3, 1.6); l.position.copy(lightWorldPos(a).applyMatrix4(o.matrixWorld)); scene.add(l); }
    const rig = o.userData?.rig as Parameters<typeof rigLightPos>[0] | undefined;
    rig?.lights.forEach((l, k) => { const p = new THREE.PointLight(l.anchor.color, l.anchor.intensity * 4, l.anchor.range * 1.3, 1.6); p.position.copy(rigLightPos(rig, k)); scene.add(p); });
  });
  const c = new THREE.Vector3(...(pn.center ?? [0, 0.5, 0]));
  const pitch = pn.pitch ?? 0.5;
  const cam = new THREE.OrthographicCamera(-pn.zoom * (CW / CH), pn.zoom * (CW / CH), pn.zoom, -pn.zoom, 0.1, 100);
  cam.position.set(c.x + Math.sin(pn.yaw) * Math.cos(pitch) * 20, c.y + Math.sin(pitch) * 20, c.z + Math.cos(pn.yaw) * Math.cos(pitch) * 20);
  cam.lookAt(c);
  cam.updateProjectionMatrix();
  renderer.setViewport(x + 4, H - yTop - CH, CW - 8, CH);
  renderer.setScissor(x + 4, H - yTop - CH, CW - 8, CH);
  renderer.render(scene, cam);
});
(window as unknown as { ready: boolean }).ready = true;
