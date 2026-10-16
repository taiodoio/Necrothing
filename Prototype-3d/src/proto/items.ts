// Anteprima (non nel gioco): i nuovi oggetti sbloccabili proposti, in quattro
// tavole (?set=1..4): luci e decorazioni, costruzioni e ambiente, presenze
// ed extra, stagionali. Personaggi: i rig del gioco e, per vampiro, strega e
// statua, lo stesso costruttore del Custode con aspetti nuovi.

import * as THREE from 'three';
import { instantiate, lightWorldPos, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import type { LPModel } from '../render/lowpoly/kit.ts';
import * as N from '../render/lowpoly/newItems.ts';
import { animateRig, buildRig, rigLightPos, type CharacterKind, type Pose } from '../view/characters.ts';
import { assemble, handPos, headAt, headCenter, headFront, humanSpec, onSkin, HUMAN_PIVOTS, DEG, O } from '../render/lowpoly/v2/custode.ts';
import type { LP } from '../render/lowpoly/kit.ts';
import { DEFAULT_LOOK } from '../game/look.ts';
import '../render/lowpoly/index.ts';

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

function witch(): THREE.Group {
  const hat = (lp: LP) => {
    const c = headCenter();
    const y = headAt(0, 50 * DEG).p.y;
    lp.cyl(c.x, y - 0.01, c.z + 0.01, 0.44, 0.43, 0.03, 20, '#2a2235', O);
    lp.push([c.x, y + 0.02, c.z], 0, -0.12, 0.08);
    lp.cyl(0, 0, 0, 0.24, 0.12, 0.28, 14, '#2a2235', O);
    lp.push([0, 0.28, -0.02], 0, -0.35, 0.15).cyl(0, 0, 0, 0.12, 0.0, 0.26, 12, '#2a2235', O).pop();
    lp.cyl(0, 0.02, 0, 0.245, 0.24, 0.05, 14, '#5f8a4a', O);
    lp.add(new THREE.BoxGeometry(0.06, 0.06, 0.01).translate(0, 0.045, 0.24), '#c9a227', O);
    lp.pop();
  };
  return figure(
    { skin: '#b6d29a', hair: 'longcurly', hairColor: '#8a5ab0', eyes: '#2f5a32', hat: 'none', outfit: 'cloak', outfitColor: '#4a3a5a', accentColor: '#5f8a4a', beard: 'none', mustache: 'none', freckles: true },
    {
      name: 'strega', mouth: 'smile', blush: '#d99a9a', hat, hatPh: 50,
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
