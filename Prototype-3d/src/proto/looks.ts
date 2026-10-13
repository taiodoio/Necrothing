// Galleria di varianti del Custode v2 costruite con le opzioni della
// personalizzazione del gioco. Solo per la valutazione: non fa parte del gioco.

import * as THREE from 'three';
import { assemble, buildCustodeV2, type CustodeV2 } from '../render/lowpoly/v2/custode.ts';
import { ANIMALS, HUMANS, V2_SPECS } from '../render/lowpoly/v2/npc.ts';
import type { CustodeLook } from '../game/look.ts';

export const PRESETS: Array<{ name: string; look: Partial<CustodeLook> }> = [
  { name: 'Concept', look: {} },
  { name: 'Caschetto · maglione', look: { hair: 'bob', hairColor: '#2a2226', skin: '#f2cfb0', eyes: '#3b2a1e', glasses: 'round', beard: 'none', mustache: 'none', freckles: true, sparkle: false, outfit: 'sweater', outfitColor: '#2f3a5a', accentColor: '#c9a227' } },
  { name: 'Lunghi · mantello', look: { hair: 'long', hairColor: '#e0c27a', skin: '#f6dcc7', eyes: '#1f4a6b', beard: 'none', mustache: 'none', sparkle: false, hat: 'wide', hatColor: '#4a3326', outfit: 'cloak', outfitColor: '#4a3a5a', accentColor: '#c9a227' } },
  { name: 'Ricci · salopette', look: { hair: 'curly', hairColor: '#2a2226', skin: '#8d5a3b', eyes: '#3b2a1e', beard: 'short', mustache: 'thin', beardColor: '#2a2226', sparkle: false, outfit: 'overalls', outfitColor: '#3a4150', accentColor: '#d9b48a' } },
  { name: 'Chignon · berretto', look: { hair: 'bun', hairColor: '#d0607a', skin: '#c9c3e6', eyes: '#5a2f6b', glasses: 'monocle', beard: 'none', mustache: 'none', bandaid: true, sparkle: false, hat: 'beanie', hatColor: '#5a2f3a', outfit: 'coat', outfitColor: '#6b2f35', accentColor: '#d9b48a' } },
  { name: 'Ciuffi · cilindro', look: { hair: 'tufts', hairColor: '#d9d4cc', skin: '#e0b48f', eyes: '#1b1a20', beard: 'full', mustache: 'bushy', beardColor: '#8a8580', sparkle: false, hat: 'top', hatColor: '#2a2a30', outfit: 'coat', outfitColor: '#2b2b30', accentColor: '#a4473b' } },
  { name: 'Ricci lunghi · brillantini', look: { hair: 'longcurly', hairColor: '#8a5ab0', skin: '#b9d7c8', eyes: '#2f5a32', beard: 'none', mustache: 'none', sparkle: true, outfit: 'sweater', outfitColor: '#4f5a3e', accentColor: '#d9b48a' } },
  { name: 'Calvo · barba piena', look: { hair: 'none', skin: '#c68e62', eyes: '#1b1a20', glasses: 'square', beard: 'full', mustache: 'handlebar', beardColor: '#d9d4cc', sparkle: false, outfit: 'overalls', outfitColor: '#6e4c36', accentColor: '#4f7fb0' } },
];

const params = new URLSearchParams(location.search);
// ?set=umani | animali: gli altri personaggi nello stesso stile
const set = params.get('set');
const fromKind = (l: Array<{ name: string; kind: string }>) => l.map((p) => ({ name: p.name, build: () => assemble(V2_SPECS[p.kind], p.kind) }));
const ALL: Array<{ name: string; build: () => CustodeV2 }> = set === 'umani' ? fromKind(HUMANS) : set === 'animali' ? fromKind(ANIMALS) : PRESETS.map((p) => ({ name: p.name, build: () => buildCustodeV2(p.look) }));
const only = params.get('i');
const COLS = 4, CW = only !== null ? 720 : 360, CH = only !== null ? 1060 : 530;
const list = only !== null ? [ALL[Number(only)]] : ALL;
const cols = only !== null ? 1 : COLS, rows = Math.ceil(list.length / cols);
const yaw = Number(params.get('yaw') ?? 0.42);
const W = cols * CW, H = rows * CH;

const canvas = document.querySelector<HTMLCanvasElement>('#galleria')!;
canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
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
scene.add(new THREE.HemisphereLight('#e9eff0', '#3b342a', 1.25));
const key = new THREE.DirectionalLight('#fff0da', 2.5);
key.position.set(-1.6, 2.6, 2.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1.6, bottom: -0.4, near: 0.1, far: 8 });
key.shadow.bias = -0.0015;
key.shadow.normalBias = 0.03;
scene.add(key);
const rim = new THREE.DirectionalLight('#bcd2ff', 1.35);
rim.position.set(1.9, 1.7, -2.3);
scene.add(rim);
const fill = new THREE.DirectionalLight('#ffe6d0', 0.45);
fill.position.set(2.2, 0.8, 1.5);
scene.add(fill);

const camera = new THREE.PerspectiveCamera(26, CW / CH, 0.1, 50);
if (set === 'animali') { camera.position.set(0.1, 1.0, 3.2); camera.lookAt(0, 0.3, 0); }
else { camera.position.set(0.1, 1.3, 4.1); camera.lookAt(0, 0.66, 0); }
const labels = document.querySelector('#etichette')!;
let tris = 0;
list.forEach((p, i) => {
  const { root, diorama, lights } = p.build();
  root.rotation.y = yaw;
  const pls = lights.map((l) => { const pl = new THREE.PointLight(l.color, 0.5, 1.2, 2); pl.position.set(...l.pos); root.add(pl); return pl; });
  scene.add(root, diorama);
  const x = (i % cols) * CW, y = Math.floor(i / cols) * CH;
  renderer.setViewport(x, H - y - CH, CW, CH);
  renderer.setScissor(x, H - y - CH, CW, CH);
  renderer.render(scene, camera);
  root.traverse((o) => { if (o instanceof THREE.Mesh) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  scene.remove(root, diorama);
  pls.forEach((pl) => pl.dispose());
  const lab = document.createElement('div');
  lab.className = 'label';
  lab.textContent = p.name.toUpperCase();
  lab.style.left = `${x + CW / 2}px`; lab.style.top = `${y + CH - 30}px`;
  labels.append(lab);
});
(window as unknown as { stats: unknown }).stats = { trisMedi: Math.round(tris / list.length) };
(window as unknown as { ready: boolean }).ready = true;
