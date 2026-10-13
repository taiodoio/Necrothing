// Anteprima (non nel gioco): tagli di capelli del Custode, teste, e il
// selettore della personalizzazione con le miniature (testa senza viso per
// capelli e accessori, corpo per i vestiti). ?view=tagli | spalle | teste | selettore

import * as THREE from 'three';
import { LP } from '../render/lowpoly/kit.ts';
import { instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { HUMAN_PIVOTS, humanSpec, type KPart, type V2Extra } from '../render/lowpoly/v2/custode.ts';
import type { CustodeLook, HairStyle } from '../game/look.ts';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'tagli';

const BASE: Partial<CustodeLook> = {
  skin: '#f2cfb0', sparkle: false, hairColor: '#6b4a33', eyes: '#2f5a32', beard: 'none', mustache: 'none', beardColor: '#6b4a33',
  glasses: 'none', hat: 'none', outfit: 'coat', outfitColor: '#4f5a3e', accentColor: '#d9b48a', freckles: false, bandaid: false,
};

export const HAIRS: Array<[HairStyle, string, boolean]> = [ // [taglio, nome, nuovo]
  ['tufts', 'Ciuffi', false], ['spiky', 'Spettinati', false], ['buzz', 'Rasati', true], ['bob', 'Caschetto', false], ['long', 'Lunghi', false],
  ['fringe', 'Frangia corta', true], ['fringeLong', 'Frangia lunga', true], ['side', 'Ciuffo di lato corto', true], ['sideLong', 'Ciuffo di lato lungo', true], ['wavy', 'Mossi corti', true],
  ['wavyLong', 'Mossi lunghi', true], ['curly', 'Ricci', false], ['longcurly', 'Ricci lunghi', false], ['bun', 'Chignon', false], ['none', 'Nessuno', false],
];

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setScissorTest(true);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#e9eff0', '#3b342a', 1.3));
const key = new THREE.DirectionalLight('#fff0da', 2.4);
key.position.set(-1.6, 2.6, 2.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1.6, bottom: -0.4, near: 0.1, far: 8 });
key.shadow.bias = -0.0015;
key.shadow.normalBias = 0.03;
scene.add(key);
const rim = new THREE.DirectionalLight('#bcd2ff', 1.3);
rim.position.set(1.9, 1.7, -2.3);
scene.add(rim);
const fill = new THREE.DirectionalLight('#ffe6d0', 0.5);
fill.position.set(2.2, 0.8, 1.5);
scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.3 }));
floor.receiveShadow = true;

/** Monta alcune parti del personaggio ai loro perni (tutte, o solo testa / solo corpo). */
function build(look: Partial<CustodeLook>, extra: V2Extra, parts: KPart[] = ['head', 'body', 'armL', 'armR', 'legL', 'legR']): THREE.Group {
  const spec = humanSpec({ ...BASE, ...look }, { held: [], ...extra });
  const g = new THREE.Group();
  for (const part of parts) {
    const fn = spec.parts[part];
    if (!fn) continue;
    const lp = new LP(`anteprima:${part}`);
    fn(lp);
    const m = lp.build();
    const o = instantiate({ geometries: m.geometries, lights: [], height: 1, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: true });
    o.position.set(...HUMAN_PIVOTS[part]);
    g.add(o);
  }
  g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

interface Cell { x: number; y: number; w: number; h: number; obj: THREE.Object3D; label: string; sub?: string; fit?: 'full' | 'thumb'; yaw?: number; floor?: boolean; zoom?: number; dy?: number }
const cells: Cell[] = [];
const labels: HTMLElement = document.querySelector('#etichette')!;
const stage: HTMLElement = document.querySelector('.tavola')!;

const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 50);
function frame(c: Cell) {
  camera.aspect = c.w / c.h;
  const box = new THREE.Box3().setFromObject(c.obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  center.y += (c.dy ?? 0) * size.y;
  const fov = c.fit === 'thumb' ? 22 : 24;
  camera.fov = fov;
  const r = Math.max(size.y * 0.5, (size.x * 0.5) / camera.aspect) * (c.fit === 'thumb' ? 1.12 : 1.06) * (c.zoom ?? 1);
  const dist = r / Math.tan((fov / 2) * Math.PI / 180);
  const dir = new THREE.Vector3(0.08, c.fit === 'thumb' ? 0.22 : 0.26, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, dist + size.z * 0.5);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

function renderAll(W: number, H: number) {
  renderer.setSize(W, H, false);
  stage.style.width = `${W}px`; stage.style.height = `${H}px`;
  stage.prepend(renderer.domElement);
  for (const c of cells) {
    c.obj.rotation.y = c.yaw ?? 0.42;
    scene.add(c.obj);
    if (c.floor) scene.add(floor);
    frame(c);
    const vy = H - c.y - c.h;
    renderer.setViewport(c.x, vy, c.w, c.h);
    renderer.setScissor(c.x, vy, c.w, c.h);
    renderer.render(scene, camera);
    scene.remove(c.obj, floor);
    const lab = document.createElement('div');
    lab.className = 'label';
    lab.style.left = `${c.x + c.w / 2}px`; lab.style.top = `${c.y + c.h - (c.fit === 'thumb' ? 2 : 26)}px`;
    lab.innerHTML = c.label + (c.sub ? `<small>${c.sub}</small>` : '');
    labels.append(lab);
  }
}

if (view === 'tagli' || view === 'spalle') {
  const COLS = 5, CW = 290, CH = 400;
  HAIRS.forEach(([hair, name, isNew], i) => {
    cells.push({ x: (i % COLS) * CW, y: Math.floor(i / COLS) * CH, w: CW, h: CH, obj: build({ hair }, {}), label: name, sub: isNew ? 'nuovo' : 'rivisto', fit: 'full', yaw: view === 'spalle' ? 2.75 : 0.42, floor: true });
  });
  renderAll(COLS * CW, Math.ceil(HAIRS.length / COLS) * CH);
} else if (view === 'teste') {
  const heads: Array<[CustodeLook['head'], string, Partial<CustodeLook>]> = [
    ['human', 'Umana', { hair: 'tufts' }], ['pumpkin', 'Zucca', { hat: 'none' }], ['skull', 'Teschio', {}], ['zombie', 'Zombie', { hair: 'spiky' }],
    ['pumpkin', 'Zucca con cilindro e monocolo', { hat: 'top', hatColor: '#3a4a3a', glasses: 'monocle' }], ['skull', 'Teschio con cilindro', { hat: 'top', hatColor: '#2a2a30', glasses: 'monocle' }], ['zombie', 'Zombie, capelli lunghi', { hair: 'long', hairColor: '#2a2226' }], ['human', 'Umana, pelle lilla', { skin: '#c9c3e6', hair: 'bun', hairColor: '#d0607a' }],
  ];
  const COLS = 4, CW = 320, CH = 420;
  heads.forEach(([head, name, look], i) => cells.push({ x: (i % COLS) * CW, y: Math.floor(i / COLS) * CH, w: CW, h: CH, obj: build({ ...look, head }, {}), label: name, fit: 'full', floor: true }));
  renderAll(COLS * CW, 2 * CH);
} else {
  // selettore: come apparirebbe nella scheda della personalizzazione (miniature 112 px)
  const T = 112, GAP = 10, COLS = 6, PAD = 18;
  const head: KPart[] = ['head'];
  const body: KPart[] = ['body', 'armL', 'armR', 'legL', 'legR'];
  const groups: Array<[string, Array<[string, () => THREE.Object3D, number?, number?, number?]>]> = [
    ['Testa', [['Umana', () => build({ head: 'human', hair: 'none' }, {}, head)], ['Zucca', () => build({ head: 'pumpkin' }, {}, head)], ['Teschio', () => build({ head: 'skull' }, {}, head)], ['Zombie', () => build({ head: 'zombie', hair: 'none' }, {}, head)]]],
    ['Capelli', HAIRS.map(([hair, name]) => [name, () => build({ hair, skin: '#d8c6b2' }, { bare: true }, head)])],
    ['Barba', ([['none', 'Nessuna'], ['short', 'Corta'], ['full', 'Folta'], ['braid', 'Con treccia']] as const).map(([beard, name]) => [name, () => build({ beard, hair: 'none', skin: '#d8c6b2', beardColor: '#6b4a33' }, { bare: true }, head), 0.2, 0.85, -0.08])],
    ['Baffi', ([['none', 'Nessuno'], ['thin', 'Sottili'], ['handlebar', 'A manubrio'], ['bushy', 'Folti']] as const).map(([mustache, name]) => [name, () => build({ mustache, hair: 'none', skin: '#d8c6b2', beardColor: '#6b4a33' }, { bare: true }, head), 0.15, 0.72, -0.3])],
    ['Occhiali', ([['none', 'Nessuno'], ['round', 'Tondi'], ['square', 'Squadrati'], ['monocle', 'Monocolo']] as const).map(([glasses, name]) => [name, () => build({ glasses, hair: 'none', skin: '#d8c6b2' }, { bare: true }, head), 0.15, 0.75, -0.05])],
    ['Cappello', ([['none', 'Nessuno'], ['wide', 'Tesa larga'], ['top', 'Cilindro'], ['beanie', 'Berretto']] as const).map(([hat, name]) => [name, () => build({ hat, hair: 'none', skin: '#d8c6b2' }, { bare: true }, head)])],
    ['Vestiti', ([['coat', 'Cappotto'], ['cloak', 'Mantella'], ['overalls', 'Salopette'], ['sweater', 'Maglione']] as const).map(([outfit, name]) => [name, () => build({ outfit }, {}, body)])],
  ];
  let y = PAD;
  const W = PAD * 2 + COLS * T + (COLS - 1) * GAP;
  for (const [title, items] of groups) {
    const t = document.createElement('div');
    t.className = 'gruppo'; t.style.top = `${y}px`; t.style.left = `${PAD}px`; t.textContent = title;
    labels.append(t);
    y += 34;
    items.forEach(([name, make, yaw, zoom, dy], i) => {
      const x = PAD + (i % COLS) * (T + GAP), yy = y + Math.floor(i / COLS) * (T + GAP + 30);
      const tile = document.createElement('div');
      tile.className = `tile${i === 0 ? ' sel' : ''}`; tile.style.left = `${x}px`; tile.style.top = `${yy}px`; tile.style.width = `${T}px`; tile.style.height = `${T}px`;
      labels.append(tile);
      cells.push({ x, y: yy, w: T, h: T, obj: make(), label: name, fit: 'thumb', yaw: yaw ?? 0.5, zoom, dy });
    });
    y += Math.ceil(items.length / COLS) * (T + GAP + 30) + 8;
  }
  renderAll(W, y + PAD);
  for (const l of document.querySelectorAll<HTMLElement>('.label')) l.classList.add('small');
}
(window as unknown as { ready: boolean }).ready = true;
