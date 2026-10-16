// Anteprima (non nel gioco): la bicicletta del Custode (parcheggiata e in
// sella) e il Bar degli zombie, di giorno e di notte, più l'icona che
// prende il posto di quella della vista.

import * as THREE from 'three';
import { instantiate, lightWorldPos, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { BIKE_SCALE, bicycleLP, zombieBarLP } from '../render/lowpoly/extraItems.ts';
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

function zombie(pose: Pose, t: number, at: [number, number, number], facing: number, mug = false): THREE.Group {
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
  return rig.root;
}

function bar(lit: boolean): THREE.Group {
  const g = new THREE.Group();
  g.add(inst(zombieBarLP({ type: 'zombie_bar', variant: 0, dirty: false, broken: false, lit, seed: 3 })));
  g.add(zombie('work', 1.3, [0.1, 0.06, -0.45], 0));
  g.add(zombie('sit', 0.4, [-0.6, 0.06, 0.66], Math.PI, true));
  g.add(zombie('sit', 2.1, [0.35, 0.06, 0.66], Math.PI + 0.3, true));
  g.add(zombie('dance', 0.9, [1.05, 0.06, 0.75], -0.6));
  return g;
}

const panels: Panel[] = [
  { title: 'Bici parcheggiata', yaw: 0.9, zoom: 0.75, center: [0, 0.4, 0], build: () => { const g = new THREE.Group(); g.add(inst(bicycleLP(true))); return g; } },
  { title: 'Di lato', yaw: Math.PI / 2, pitch: 0.18, zoom: 0.7, center: [0, 0.4, 0], build: () => { const g = new THREE.Group(); g.add(inst(bicycleLP(false))); return g; } },
  { title: 'Il Custode in sella', yaw: 0.85, zoom: 1.05, center: [0, 0.75, 0], build: () => rider(0.6) },
  { title: 'In sella, di lato (pedalata)', yaw: Math.PI / 2, pitch: 0.15, zoom: 1.05, center: [0, 0.75, 0], build: () => rider(2.2) },
  { title: 'Bar degli zombie · giorno', yaw: 0.6, zoom: 2.0, center: [0, 0.95, 0], build: () => bar(true) },
  { title: 'Bar degli zombie · notte', night: true, yaw: 0.6, zoom: 2.0, center: [0, 0.95, 0], build: () => bar(true) },
  { title: 'Il bancone · notte', night: true, yaw: 0.15, pitch: 0.3, zoom: 1.4, center: [0, 1.0, 0.2], build: () => bar(true) },
  { title: 'Di sera, dall’alto (come in gioco)', night: true, yaw: Math.PI / 4, pitch: 0.62, zoom: 2.2, center: [0, 0.5, 0], build: () => bar(true) },
];

const COLS = 4, CW = 380, CH = 400, TOP = 34, ICON_H = 110;
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
// icone: oggi (vista dall'alto) → domani (bici: a piedi / in sella)
const ic = document.querySelector<HTMLElement>('#icone')!;
ic.style.left = '24px';
ic.style.top = `${H - ICON_H + 20}px`;
const btn = (name: string, on: boolean, text: string) => { const w = document.createElement('div'); w.style.display = 'flex'; w.style.alignItems = 'center'; w.style.gap = '10px'; const b = document.createElement('div'); b.className = `btn${on ? ' on' : ''}`; const i = document.createElement('i'); i.style.backgroundImage = iconUrl(name); b.append(i); w.append(b, text); ic.append(w); };
btn('top', false, 'Oggi: vista dall’alto →');
btn('bike', false, 'Bici: a piedi (tocca per salire)');
btn('bike', true, 'In sella (tocca per scendere)');
(window as unknown as { ready: boolean }).ready = true;
