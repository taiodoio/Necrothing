// Anteprima (non nel gioco): la bicicletta del Custode (parcheggiata e in
// sella) e il Bar degli zombie, di giorno e di notte, più l'icona che
// prende il posto di quella della vista.

import * as THREE from 'three';
import { instantiate, lightWorldPos, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { BIKE_SCALE, bicycleLP, brainFarmLP, zombieBarLP } from '../render/lowpoly/extraItems.ts';
import type { LPModel } from '../render/lowpoly/kit.ts';
import { animateRig, buildRig, type Pose } from '../view/characters.ts';
import { DEFAULT_LOOK } from '../game/look.ts';
import { iconUrl } from '../ui/icons.ts';
import '../render/lowpoly/index.ts';

const asModel = (m: LPModel) => ({ geometries: m.geometries, lights: m.lights, height: 1, mats: LOWPOLY_MATERIALS, dedicated: true });
/** Istanza che ricorda il modello (per accendere le sue luci di notte). */
const inst = (m: LPModel) => { const md = asModel(m); const g = instantiate(md, { castShadow: true }); g.userData.model = md; return g; };

interface Panel { title: string; night?: boolean; yaw: number; pitch?: number; zoom: number; center?: [number, number, number]; build: () => THREE.Group }

/** Custode in sella: anche sulla sella, piedi sui pedali, mani sulle manopole. */
function rider(crank: number): THREE.Group {
  const g = new THREE.Group();
  const bike = inst(bicycleLP(false, crank));
  g.add(bike);
  const rig = buildRig('custode', 'lowpoly', DEFAULT_LOOK);
  animateRig(rig, 'idle', 0, 0);
  g.add(rig.root);
  rig.root.updateMatrixWorld(true);
  const p = rig.parts;
  const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  // seduto: l'anca sulla sella
  const hip = world(p.legL!);
  const S = BIKE_SCALE;
  rig.root.position.set(0, 0.47 * S - hip.y + 0.02, -0.12 * S - hip.z);
  rig.root.updateMatrixWorld(true);
  const aim = (part: THREE.Object3D, target: THREE.Vector3) => {
    const from = world(part);
    const d = target.clone().sub(from);
    part.rotation.x = -Math.atan2(d.z, -d.y);
  };
  for (const s of [-1, 1]) {
    const a = crank + (s > 0 ? 0 : Math.PI);
    aim(s < 0 ? p.legL! : p.legR!, new THREE.Vector3(s * 0.09, (0.15 + Math.cos(a) * 0.07) * S, (-0.02 + Math.sin(a) * 0.07) * S));
    aim(s < 0 ? p.armL! : p.armR!, new THREE.Vector3(s * 0.2 * S, 0.56 * S, 0.1 * S));
  }
  p.body!.rotation.x = 0.1;
  return g;
}

function zombie(pose: Pose, t: number, at: [number, number, number], facing: number, mug = false, hoe = false): THREE.Group {
  const rig = buildRig('zombie', 'lowpoly');
  animateRig(rig, pose, t, 0.7);
  rig.root.position.set(...at);
  rig.root.rotation.y = facing;
  if (mug && rig.parts.armR) {
    // braccio alzato a brindare, con il boccale che fa la schiuma
    rig.parts.armR.rotation.x = -0.75;
    const m = new THREE.Group();
    const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 8), new THREE.MeshStandardMaterial({ color: '#9a9488', flatShading: true, roughness: 0.6 }));
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.02, 8), new THREE.MeshBasicMaterial({ color: '#b6f06a' }));
    foam.position.y = 0.06;
    m.add(lp, foam);
    m.position.set(0.02, -0.02, 0.4);
    rig.parts.armR.add(m);
  }
  if (hoe && rig.parts.armR) {
    // zappa: manico lungo e lama di ferro
    const h = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2e', flatShading: true, roughness: 0.9 });
    const iron = new THREE.MeshStandardMaterial({ color: '#5f6366', flatShading: true, roughness: 0.6 });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 5), wood);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.02), iron);
    blade.position.set(0, -0.38, 0.04);
    h.add(stick, blade);
    h.position.set(0.02, -0.05, 0.38);
    h.rotation.x = 0.5;
    rig.parts.armR.add(h);
  }
  return rig.root;
}

/** Etichetta dei guadagni pronti da riscuotere: fiammella e «+N». */
function earnings(n: number, y: number): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d0b0a'; g.fillRect(8, 20, 240, 88);
  g.fillStyle = '#c9a25c'; g.fillRect(14, 26, 228, 76);
  g.fillStyle = '#161920'; g.fillRect(20, 32, 216, 64);
  // fiammella del fuoco fatuo
  g.fillStyle = '#4fae98';
  g.beginPath(); g.moveTo(70, 40); g.quadraticCurveTo(96, 66, 84, 84); g.quadraticCurveTo(70, 96, 56, 84); g.quadraticCurveTo(46, 66, 70, 40); g.fill();
  g.fillStyle = '#bff3e2'; g.beginPath(); g.arc(70, 76, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f1d39c'; g.font = 'bold 54px system-ui, sans-serif'; g.textBaseline = 'middle';
  g.fillText(`+${n}`, 108, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false }));
  sp.scale.set(0.9, 0.45, 1);
  sp.position.y = y;
  sp.renderOrder = 10;
  return sp;
}

function farm(lit: boolean, badge = 0): THREE.Group {
  const g = new THREE.Group();
  g.add(inst(brainFarmLP({ type: 'brain_farm', variant: 0, dirty: false, broken: false, lit, seed: 5 })));
  g.add(zombie('work', 0.8, [-0.95, 0, 0.1], 0.7, false, true));
  g.add(zombie('idle', 0.2, [1.35, 0.06, 0.12], 0));
  if (badge) { const b = earnings(badge, 2.3); b.position.x = 1.35; g.add(b); }
  return g;
}

function bar(lit: boolean, badge = 0): THREE.Group {
  const g = new THREE.Group();
  g.add(inst(zombieBarLP({ type: 'zombie_bar', variant: 0, dirty: false, broken: false, lit, seed: 3 })));
  g.add(zombie('work', 1.3, [0.1, 0.06, -0.45], 0));
  g.add(zombie('sit', 0.4, [-0.6, 0.06, 0.66], Math.PI, true));
  g.add(zombie('sit', 2.1, [0.35, 0.06, 0.66], Math.PI + 0.3, true));
  g.add(zombie('dance', 0.9, [0.95, 0.06, 0.82], -0.6));
  if (badge) g.add(earnings(badge, 2.55));
  return g;
}

const panels: Panel[] = [
  { title: 'Bar degli zombie · giorno', yaw: 0.6, zoom: 2.0, center: [0, 0.95, 0], build: () => bar(true) },
  { title: 'Bar degli zombie · notte', night: true, yaw: 0.6, zoom: 2.0, center: [0, 0.95, 0], build: () => bar(true) },
  { title: 'Bara-frigo, lavagna e pipistrelli', night: true, yaw: -0.35, pitch: 0.3, zoom: 1.35, center: [-0.4, 0.9, 0.2], build: () => bar(true) },
  { title: 'Orto dei cervelli · giorno', yaw: 0.55, zoom: 2.3, center: [0, 0.6, 0], build: () => farm(true) },
  { title: 'Orto dei cervelli · notte', night: true, yaw: 0.55, zoom: 2.3, center: [0, 0.6, 0], build: () => farm(true) },
  { title: 'I cervelli e la bancarella', yaw: 0.25, pitch: 0.38, zoom: 1.35, center: [0.3, 0.6, 0.1], build: () => farm(true) },
  { title: 'Guadagni da riscuotere · bar', yaw: Math.PI / 4, pitch: 0.62, zoom: 2.3, center: [0, 1.0, 0], build: () => bar(true, 6) },
  { title: 'Guadagni da riscuotere · orto', yaw: Math.PI / 4, pitch: 0.62, zoom: 2.6, center: [0, 0.9, 0], build: () => farm(true, 4) },
  { title: 'Di sera, come in gioco', night: true, yaw: Math.PI / 4, pitch: 0.62, zoom: 2.3, center: [0, 1.0, 0], build: () => bar(true, 6) },
];

const COLS = 3, CW = 500, CH = 440, TOP = 34, ICON_H = 0;
const rows = Math.ceil(panels.length / COLS);
const W = CW * COLS, H = TOP + rows * (CH + TOP) + ICON_H;
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

panels.forEach((pn, i) => {
  const col = i % COLS, row = Math.floor(i / COLS);
  const x = col * CW, yTop = TOP + row * (CH + TOP);
  label(x + CW / 2, yTop - 26, pn.title);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(pn.night ? '#141a24' : '#2a3530');
  renderer.toneMappingExposure = pn.night ? 1.25 : 1.1;
  scene.add(new THREE.HemisphereLight(pn.night ? '#5b6d92' : '#e9eff0', '#2b2724', pn.night ? 0.55 : 1.4));
  const sun = new THREE.DirectionalLight(pn.night ? '#9db3e6' : '#fff0da', pn.night ? 0.5 : 2.4);
  sun.position.set(-4, 8, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(5, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3b4a35', roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
  const g = pn.build();
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true; });
  scene.add(g);
  g.updateMatrixWorld(true);
  // luci dei modelli (fanalino, lucine, bottiglie): di notte si vedono
  if (pn.night) g.traverse((o) => {
    const model = o.userData?.model as { lights?: Array<Parameters<typeof lightWorldPos>[0] & { color: string; intensity: number; range: number }> } | undefined;
    for (const a of model?.lights ?? []) { const l = new THREE.PointLight(a.color, a.intensity * 4, a.range * 1.3, 1.6); l.position.copy(lightWorldPos(a).applyMatrix4(o.matrixWorld)); scene.add(l); }
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
