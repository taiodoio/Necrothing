// Anteprima (non nel gioco): gli oggetti che si degradano, ciascuno pulito,
// sporco e rotto, uno accanto all'altro. ?page=0|1|2 (8–9 oggetti per pagina),
// ?notte=1 per vedere le luci.

import * as THREE from 'three';
import { CATALOG_LIST } from '../game/catalog.ts';
import { getModel, instantiate, lightWorldPos } from '../render/modelCache.ts';
import { placeableKey, placeableModel, type PVis } from '../render/models/registry.ts';
import '../render/lowpoly/index.ts';

const params = new URLSearchParams(location.search);
const page = Number(params.get('page') ?? 0);
const night = params.get('notte') === '1';
const PER = 9;
const items = CATALOG_LIST.filter((d) => d.decays).slice(page * PER, page * PER + PER);
const STATES: Array<[string, Partial<PVis>]> = [['pulito', {}], ['sporco', { dirty: true }], ['rotto', { dirty: true, broken: true }]];

const CW = 300, CH = 250, LABEL = 150;
const W = LABEL + CW * 3, H = 40 + CH * items.length;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = night ? 1.25 : 1.1;
renderer.shadowMap.enabled = true;
renderer.setScissorTest(true);
renderer.setClearColor(night ? 0x141a24 : 0x2a3530, 1);
document.querySelector('.tavola')!.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(night ? '#5b6d92' : '#e9eff0', '#2b2724', night ? 0.6 : 1.4));
const sun = new THREE.DirectionalLight(night ? '#9db3e6' : '#fff0da', night ? 0.6 : 2.4);
sun.position.set(-4, 8, 6);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3b4a35', roughness: 1 }));
ground.receiveShadow = true;
scene.add(ground);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
const labels = document.querySelector('#etichette')!;
const label = (x: number, y: number, text: string, cls = 'label') => { const d = document.createElement('div'); d.className = cls; d.style.left = `${x}px`; d.style.top = `${y}px`; d.textContent = text; labels.append(d); };

STATES.forEach(([name], i) => label(LABEL + CW * i + CW / 2, 10, name));
items.forEach((d, row) => {
  label(10, 40 + CH * row + CH / 2 - 8, d.label, 'label left');
  STATES.forEach(([, st], col) => {
    const v: PVis = { type: d.id, variant: 0, dirty: false, broken: false, lit: true, seed: 1, ...st };
    const model = getModel(placeableKey(v), 'lowpoly', () => placeableModel(v), v.seed);
    const g = instantiate(model, { castShadow: true });
    const lights: THREE.PointLight[] = [];
    if (night) for (const a of model.lights) { const l = new THREE.PointLight(a.color, a.intensity * 3, a.range * 1.2, 1.6); l.position.copy(lightWorldPos(a)); g.add(l); lights.push(l); }
    scene.add(g);
    const box = new THREE.Box3().setFromObject(g);
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const ext = Math.max(size.x, size.z, size.y * 1.1) * 0.62 + 0.2;
    camera.left = -ext * (CW / CH); camera.right = ext * (CW / CH); camera.top = ext; camera.bottom = -ext;
    camera.position.set(c.x + 10, c.y + 9, c.z + 14);
    camera.lookAt(c);
    camera.updateProjectionMatrix();
    const x = LABEL + CW * col, y = H - (40 + CH * (row + 1));
    renderer.setViewport(x + 3, y + 3, CW - 6, CH - 6);
    renderer.setScissor(x + 3, y + 3, CW - 6, CH - 6);
    renderer.render(scene, camera);
    scene.remove(g);
  });
});
(window as unknown as { ready: boolean }).ready = true;
