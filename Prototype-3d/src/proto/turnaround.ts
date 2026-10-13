// Tavola di turnaround del prototipo Custode v2 (fronte, retro, destra,
// sinistra e vista 3/4 sulla zolla), come una scheda personaggio.
// Solo per la valutazione: non fa parte del gioco.

import * as THREE from 'three';
import { buildCustodeV2 } from './custodeV2.ts';
import { buildRig } from '../view/characters.ts';
import { DEFAULT_LOOK } from '../game/look.ts';

// ?v=attuale mostra il Custode di oggi con un aspetto simile al concept (confronto)
const attuale = new URLSearchParams(location.search).get('v') === 'attuale';

const W = 1448, H = 1086;
const canvas = document.querySelector<HTMLCanvasElement>('#tavola')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setScissorTest(true);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
// luce da studio: chiave calda davanti a sinistra, controluce freddo, riempimento dal cielo
scene.add(new THREE.HemisphereLight('#e9eff0', '#3b342a', 1.25));
const key = new THREE.DirectionalLight('#fff0da', 2.5);
key.position.set(-1.6, 2.6, 2.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1.4, bottom: -0.4, near: 0.1, far: 8 });
key.shadow.bias = -0.0008;
key.shadow.normalBias = 0.01;
scene.add(key);
const rim = new THREE.DirectionalLight('#bcd2ff', 1.35);
rim.position.set(1.9, 1.7, -2.3);
scene.add(rim);
const fill = new THREE.DirectionalLight('#ffe6d0', 0.45);
fill.position.set(2.2, 0.8, 1.5);
scene.add(fill);

const v2 = buildCustodeV2();
const { diorama, lights } = v2;
let root = v2.root;
if (attuale) {
  const rig = buildRig('custode', 'lowpoly', {
    ...DEFAULT_LOOK, hair: 'spiky', hairColor: '#b0774a', hat: 'none', beard: 'braid', mustache: 'handlebar', beardColor: '#d0607a',
    eyes: '#2f5a32', sparkle: true, outfit: 'coat', outfitColor: '#4f5a3e', accentColor: '#d9b48a',
  });
  root = new THREE.Group();
  root.add(rig.root);
  // stessa altezza del prototipo, per un confronto alla pari
  const box = new THREE.Box3().setFromObject(rig.root);
  rig.root.scale.multiplyScalar(1.12 / (box.max.y - box.min.y));
  root.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  document.title = 'Custode attuale · confronto';
}
scene.add(root);
scene.add(diorama);
// luce calda della lanterna (si muove con il personaggio)
const lanternLights = (attuale ? [] : lights).map((l) => { const pl = new THREE.PointLight(l.color, 0.5, 1.2, 2); pl.position.set(...l.pos); root.add(pl); return pl; });

// ombra a terra per le viste senza zolla
const floor = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.32 }));
floor.receiveShadow = true;
scene.add(floor);

interface Panel { x: number; y: number; w: number; h: number; yaw: number; hero?: boolean }
const panels: Panel[] = [
  { x: 40, y: 20, w: 370, h: 470, yaw: 0 },                 // fronte
  { x: 40, y: 545, w: 370, h: 460, yaw: Math.PI },           // retro
  { x: 1038, y: 20, w: 370, h: 470, yaw: -Math.PI / 2 },     // destra (lato destro del personaggio)
  { x: 1038, y: 545, w: 370, h: 460, yaw: Math.PI / 2 },     // sinistra
  { x: 420, y: 10, w: 608, h: 1010, yaw: 0.42, hero: true }, // 3/4 sulla zolla
];

const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);
for (const p of panels) {
  root.rotation.y = p.yaw;
  diorama.visible = !!p.hero;
  floor.visible = !p.hero;
  for (const pl of lanternLights) pl.intensity = p.hero ? 0.6 : 0.35;
  camera.aspect = p.w / p.h;
  if (p.hero) {
    camera.fov = 26;
    camera.position.set(0.1, 1.3, 3.9);
    camera.lookAt(0, 0.56, 0);
  } else {
    camera.fov = 22;
    camera.position.set(0, 0.95, 4.1);
    camera.lookAt(0, 0.66, 0);
  }
  camera.updateProjectionMatrix();
  const vy = H - (p.y + p.h);
  renderer.setViewport(p.x, vy, p.w, p.h);
  renderer.setScissor(p.x, vy, p.w, p.h);
  renderer.render(scene, camera);
}
// numeri per l'audit: triangoli e draw call del personaggio
let tris = 0, draws = 0;
root.traverse((o) => { if (o instanceof THREE.Mesh) { draws++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
(window as unknown as { stats: unknown }).stats = { tris: Math.round(tris), draws };
(window as unknown as { ready: boolean }).ready = true;
