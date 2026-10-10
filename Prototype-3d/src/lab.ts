// Laboratorio personaggi (sviluppo): i personaggi kawaii dello stile low-poly
// con le animazioni del gioco, a confronto con lo stile voxel.
// Apri /lab.html con `npm run dev`. Parametri: ?set=town|spooky|animals|funeral
// &pose=idle|walk|work &time=day|night &compare=0|1 &t=<secondi, ferma il tempo> &zoom=

import * as THREE from 'three';
import type { DayPhase } from './game/time.ts';
import { applyStyleUniforms, getModel, instantiate, lightWorldPos } from './render/modelCache.ts';
import { voxelsPerWorldUnit } from './render/voxelMesher.ts';
import { resolveLowpoly } from './render/lowpoly/index.ts';
import { animateRig, buildRig, rigLightPos, type CharacterKind, type Pose, type Rig } from './view/characters.ts';
import { Atmosphere } from './view/Atmosphere.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#c')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const atmosphere = new Atmosphere(scene, 'medium');
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
const params = new URLSearchParams(location.search);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#3d5236', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const root = new THREE.Group();
scene.add(root);

const SETS: Record<string, string[]> = {
  town: ['custode', 'gravedigger', 'priest', 'mourner', 'mournerB', 'zombie'],
  spooky: ['skeleton', 'ghost', 'ghostRare', 'zombie'],
  animals: ['cat', 'rat', 'crow', 'petDog', 'petCat', 'petRabbit', 'petCrow', 'petDuck'],
  funeral: [],
};
const NAMES: Record<string, string> = {
  custode: 'Custode', gravedigger: 'Becchino', priest: 'Prete', mourner: 'Dolente', mournerB: 'Dolente (variante)', zombie: 'Zombie',
  skeleton: 'Scheletro', ghost: 'Fantasma', ghostRare: 'Fantasma raro', cat: 'Gatto', rat: 'Topo', crow: 'Corvo',
  petDog: 'Cane', petCat: 'Gatto', petRabbit: 'Coniglio', petCrow: 'Corvo', petDuck: 'Papera',
};

let set = SETS[params.get('set') ?? ''] ? params.get('set')! : 'town';
let pose: Pose = (params.get('pose') as Pose) ?? 'idle';
let phase: DayPhase = (params.get('time') as DayPhase) ?? 'day';
let compare = params.get('compare') !== '0';
const frozen = params.has('t') ? Number(params.get('t')) : null;

interface Actor { rig: Rig; label: string; at: THREE.Vector3; pose: Pose; phase: number; heading: number }
let actors: Actor[] = [];
let extent = 6;

const kawaiiRig = (kind: string) => buildRig(kind as CharacterKind, 'lowpoly');
/** Riga di confronto: lo stesso personaggio nello stile voxel. */
const oldRig = (kind: string) => buildRig(kind as CharacterKind, 'voxel');

function addStatic(key: string, pos: THREE.Vector3, rot = 0) {
  const gen = resolveLowpoly(key);
  if (!gen) return;
  const m = getModel(key, 'lowpoly', () => { throw new Error('no fallback'); }, 0);
  const g = instantiate(m);
  g.position.copy(pos); g.rotation.y = rot;
  root.add(g);
  for (const a of m.lights) atmosphere.addAnchor(lightWorldPos(a).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(pos), a);
}

function rebuild() {
  applyStyleUniforms('lowpoly', voxelsPerWorldUnit());
  for (const c of [...root.children]) root.remove(c);
  atmosphere.clearAnchors();
  actors = [];
  const place = (rig: Rig | null, x: number, z: number, label: string, p: Pose = pose, heading = 0) => {
    if (!rig) return;
    rig.root.position.set(x, 0, z);
    rig.root.rotation.y = heading;
    root.add(rig.root);
    actors.push({ rig, label, at: new THREE.Vector3(x, 0, z), pose: p, phase: x * 0.7, heading });
  };
  if (set === 'funeral') {
    // piccolo corteo davanti a una tomba aperta, sotto un lampione
    addStatic('p:open_grave:0:3:001', new THREE.Vector3(0, 0, 0.9));
    addStatic('g:gothic:flowers:4', new THREE.Vector3(-2.7, 0, -1.9));
    addStatic('g:celtic_cross:clean:2', new THREE.Vector3(2.8, 0, -1.7));
    addStatic('p:lamp_post:0:1:001', new THREE.Vector3(-1.9, 0, -0.7));
    addStatic('p:wreath:0:1:000', new THREE.Vector3(1.25, 0, 1.0));
    place(kawaiiRig('priest'), 0, -0.35, '', 'pray', 0);
    place(kawaiiRig('mourner'), -0.95, -0.95, '', 'idle', 0.1);
    place(kawaiiRig('mournerB'), 0.05, -1.35, '', 'idle', 0);
    place(kawaiiRig('mourner'), 1.0, -1.0, '', 'pray', -0.1);
    place(kawaiiRig('gravedigger'), 2.0, 0.55, '', 'work', -Math.PI / 2);
    place(kawaiiRig('custode'), -2.1, 1.0, '', 'idle', 0.9);
    place(kawaiiRig('ghost'), 2.7, 1.6, '', 'idle', -0.4);
    extent = 4.2;
  } else {
    const kinds = SETS[set];
    const gap = set === 'animals' ? 1.2 : 1.55;
    kinds.forEach((k, i) => {
      const x = (i - (kinds.length - 1) / 2) * gap;
      place(kawaiiRig(k), x, compare ? 1.0 : 0, NAMES[k]);
      if (compare) place(oldRig(k), x, -1.4, '');
    });
    extent = (kinds.length * gap) / 2 + 0.6;
  }
  // luci portate (lanterna del Custode, fantasmi): ancore alla posa iniziale
  root.updateMatrixWorld(true);
  for (const a of actors) a.rig.lights.forEach((l, i) => atmosphere.addAnchor(rigLightPos(a.rig, i), l.anchor));
  placeCamera();
}

function placeCamera() {
  const aspect = innerWidth / innerHeight;
  const h = Math.max(extent / aspect, 2.2) * Number(params.get('zoom') ?? 1);
  camera.left = -h * aspect; camera.right = h * aspect; camera.top = h; camera.bottom = -h;
  camera.updateProjectionMatrix();
  camera.position.set(14, 17, 20);
  camera.lookAt(0, 0.6, 0);
  camera.updateMatrixWorld(true);
  atmosphere.focus(new THREE.Vector3(0, 0, 0), extent * 2);
}

const labels = document.querySelector<HTMLDivElement>('#labels')!;
function drawLabels() {
  labels.innerHTML = '';
  const v = new THREE.Vector3();
  for (const a of actors) {
    if (!a.label) continue;
    v.copy(a.at).setY(-0.15).project(camera);
    const s = document.createElement('span');
    s.textContent = a.label;
    s.style.left = `${((v.x + 1) / 2) * innerWidth}px`;
    s.style.top = `${((1 - v.y) / 2) * innerHeight + 6}px`;
    labels.append(s);
  }
  if (compare && set !== 'funeral') {
    for (const [txt, z] of [['low-poly (kawaii)', 1.0], ['voxel', -1.4]] as const) {
      const xs = actors.filter((a) => Math.abs(a.at.z - z) < 0.01).map((a) => a.at.x);
      v.set(Math.min(...xs) - 0.2, 2.1, z).project(camera);
      const s = document.createElement('span');
      s.textContent = txt; s.style.font = '600 14px system-ui'; s.style.color = '#f1d39c';
      s.style.left = `${((v.x + 1) / 2) * innerWidth}px`; s.style.top = `${((1 - v.y) / 2) * innerHeight}px`;
      labels.append(s);
    }
  }
}

function refresh() {
  document.querySelector('#pose')!.textContent = `Posa: ${pose}`;
  document.querySelector('#time')!.textContent = `Ora: ${phase}`;
  document.querySelector('#compare')!.textContent = `Confronto: ${compare ? 'sì' : 'no'}`;
  (document.querySelector('#set') as HTMLSelectElement).value = set;
}
document.querySelector('#set')!.addEventListener('change', (e) => { set = (e.target as HTMLSelectElement).value; rebuild(); drawLabels(); });
document.querySelector('#pose')!.addEventListener('click', () => {
  const order: Pose[] = ['idle', 'walk', 'work', 'dance', 'cheer'];
  pose = order[(order.indexOf(pose) + 1) % order.length];
  for (const a of actors) if (set !== 'funeral') a.pose = pose;
  refresh();
});
document.querySelector('#time')!.addEventListener('click', () => {
  const order: DayPhase[] = ['dawn', 'day', 'dusk', 'night'];
  phase = order[(order.indexOf(phase) + 1) % 4]; atmosphere.setPhase(phase, 'clear'); refresh();
});
document.querySelector('#compare')!.addEventListener('click', () => { compare = !compare; rebuild(); drawLabels(); refresh(); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); placeCamera(); drawLabels(); });

renderer.setSize(innerWidth, innerHeight, false);
atmosphere.setPhase(phase, 'clear');
rebuild(); refresh(); drawLabels();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = frozen ?? clock.elapsedTime;
  for (const a of actors) animateRig(a.rig, a.pose, t + a.phase, (frozen ?? clock.elapsedTime) * 2.2 + a.phase);
  atmosphere.update(dt, t, camera);
  renderer.render(scene, camera);
});

