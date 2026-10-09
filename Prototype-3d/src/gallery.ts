// Galleria asset di sviluppo: mostra i modelli procedurali in griglia, con
// cambio stile (voxel/miniatura), camera (obliqua/dall'alto) e ora del giorno.
// Apri /gallery.html con `npm run dev`.

import * as THREE from 'three';
import { GRAVE_TYPES, type GraveVisualState } from './game/graves.ts';
import type { ArtStyle, CameraMode } from './game/state.ts';
import type { DayPhase } from './game/time.ts';
import { applyStyleUniforms, getModel, instantiate, lightWorldPos } from './render/modelCache.ts';
import { voxelsPerWorldUnit } from './render/voxelMesher.ts';
import { graveModel } from './render/models/graves.ts';
import { gallerySets } from './render/models/registry.ts';
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

let style: ArtStyle = 'voxel';
let cam: CameraMode = 'angled';
let phase: DayPhase = 'night';
const root = new THREE.Group();
scene.add(root);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: '#33432d' }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const sets: Record<string, Array<{ key: string; build: () => ReturnType<typeof graveModel>; fp: [number, number] }>> = {
  'Tombe': GRAVE_TYPES.flatMap((t) => (['clean', 'flowers', 'dirty', 'broken'] as GraveVisualState[]).map((s) => ({
    key: `grave:${t}:${s}:7`, build: () => graveModel(t, s, 7), fp: [2, 2] as [number, number],
  }))),
  ...gallerySets(),
};
const select = document.querySelector<HTMLSelectElement>('#set')!;
for (const name of Object.keys(sets)) select.add(new Option(name, name));
const params = new URLSearchParams(location.search);
if (params.get('set') && sets[params.get('set')!]) select.value = params.get('set')!;
if (params.get('style') === 'miniature') style = 'miniature';
if (params.get('cam') === 'top') cam = 'top';
if (params.get('time')) phase = params.get('time') as DayPhase;

let extent = 10;
function rebuild() {
  applyStyleUniforms(style, voxelsPerWorldUnit());
  for (const c of [...root.children]) root.remove(c);
  atmosphere.clearAnchors();
  const all = sets[select.value];
  const from = Number(params.get('from') ?? 0), count = Number(params.get('n') ?? all.length);
  const items = all.slice(from, from + count);
  const cols = Math.ceil(Math.sqrt(items.length * 1.1));
  const cell = Math.max(...items.map((i) => Math.max(...i.fp))) + 1.4;
  items.forEach((item, i) => {
    const m = getModel(item.key, style, item.build, i);
    const g = instantiate(m);
    const cx = (i % cols) - (cols - 1) / 2, cz = Math.floor(i / cols) - (Math.ceil(items.length / cols) - 1) / 2;
    g.position.set(cx * cell, 0, cz * cell);
    root.add(g);
    for (const a of m.lights) atmosphere.addAnchor(lightWorldPos(a).add(g.position), a);
  });
  extent = (cols * cell) / 2 + 1;
  document.querySelector('#info')!.textContent = `${items.length} modelli · stile ${style} · ${renderer.info.render.triangles} tri`;
}

function placeCamera() {
  const aspect = innerWidth / innerHeight;
  const h = extent * (cam === 'top' ? 1.0 : 0.8);
  camera.left = -h * aspect; camera.right = h * aspect; camera.top = h; camera.bottom = -h;
  camera.updateProjectionMatrix();
  if (cam === 'top') { camera.up.set(0, 0, -1); camera.position.set(0, 60, 0); }
  else { camera.up.set(0, 1, 0); camera.position.set(28, 34, 40); }
  camera.lookAt(0, 0, 0);
  atmosphere.focus(new THREE.Vector3(0, 0, 0), extent * 1.6);
}

function refreshLabels() {
  document.querySelector('#style')!.textContent = `Stile: ${style === 'voxel' ? 'voxel' : 'miniatura'}`;
  document.querySelector('#cam')!.textContent = `Camera: ${cam === 'top' ? 'dall’alto' : 'obliqua'}`;
  document.querySelector('#time')!.textContent = `Ora: ${phase}`;
}

document.querySelector('#style')!.addEventListener('click', () => { style = style === 'voxel' ? 'miniature' : 'voxel'; rebuild(); refreshLabels(); });
document.querySelector('#cam')!.addEventListener('click', () => { cam = cam === 'top' ? 'angled' : 'top'; placeCamera(); refreshLabels(); });
document.querySelector('#time')!.addEventListener('click', () => {
  const order: DayPhase[] = ['dawn', 'day', 'dusk', 'night'];
  phase = order[(order.indexOf(phase) + 1) % 4]; atmosphere.setPhase(phase, 'clear'); refreshLabels();
});
select.addEventListener('change', () => { rebuild(); placeCamera(); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); placeCamera(); });

renderer.setSize(innerWidth, innerHeight, false);
atmosphere.setPhase(phase, 'clear');
rebuild(); placeCamera(); refreshLabels();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  atmosphere.update(clock.getDelta(), clock.elapsedTime, camera);
  renderer.render(scene, camera);
});
