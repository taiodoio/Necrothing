// Immagini statiche dell'interfaccia, rese coi modelli e le luci del gioco e
// salvate in PNG da scripts/bake-previews.mjs (così il gioco non le ridisegna):
// l'anteprima di ogni oggetto, di notte su una zolla d'erba tonda con le sue luci
// accese, e la striscia di terra con lapidi, pala e lanterne in fondo alle schede.
import * as THREE from 'three';
import { LP } from './lowpoly/kit.ts';
import { LPC } from './lowpoly/palette.ts';
import { weeds } from './lowpoly/details.ts';
import { getModel, instantiate, lightWorldPos, LOWPOLY_MATERIALS, type CachedModel } from './modelCache.ts';
import { houseRoof, houseVariant } from '../game/house.ts';
import { housePartLP } from './lowpoly/architecture.ts';
import { graveModel } from './models/graves.ts';
import { placeableKey, placeableModel } from './models/registry.ts';
import type { GraveType } from '../game/graves.ts';
import { sceneryBush, sceneryFlowers, sceneryPebbles, sceneryTuft } from './models/nature.ts';

/** La striscia di terra in fondo alla scheda di una tomba: cumuli, lapidi, la pala piantata, due lanterne accese. */
export function renderGround(W = 1080, H = 380, cam = { y: 4.2, z: 9.2, look: 0.35, fov: 24 }): string {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#9aa2d6', '#2c2632', 1.5));
  const moon = new THREE.DirectionalLight('#b4c6ee', 1.5); moon.position.set(-6, 8, 5);
  const fill = new THREE.DirectionalLight('#8f9fd0', 0.8); fill.position.set(2, 3, 10);
  scene.add(moon, fill);
  // cumuli di terra, la pala piantata, erbacce
  const lp = new LP('bake:earth');
  // il terreno: una lastra di terra irregolare che arriva fino al bordo in basso, e sopra i cumuli bassi
  lp.blob(0, -0.05, 1.4, 7.5, 0.2, 2.4, '#3f5536', { detail: 2, jitter: 0.06, vary: 0.16 });
  lp.blob(-2.0, 0.0, 1.9, 2.4, 0.16, 1.1, '#354839', { detail: 1, jitter: 0.05, vary: 0.14 });
  lp.blob(2.6, 0.0, 2.1, 2.2, 0.16, 1.0, '#4a5a3a', { detail: 1, jitter: 0.05, vary: 0.14 });
  const mounds: Array<[number, number, number, number, number, string]> = [
    [-3.4, 0.25, 0.85, 0.42, 0.55, '#5c4a3e'], [-1.9, 0.5, 0.75, 0.36, 0.5, LPC.soil], [0.4, 0.35, 0.9, 0.44, 0.55, '#5c4a3e'],
    [2.3, 0.5, 0.75, 0.38, 0.5, LPC.soil], [3.9, 0.25, 0.85, 0.42, 0.55, '#5c4a3e'], [-4.8, 0.75, 0.7, 0.3, 0.45, LPC.soil], [5.1, 0.75, 0.7, 0.3, 0.45, LPC.soil],
  ];
  for (const [x, z, rx, ry, rz, c] of mounds) lp.blob(x, 0.1, z, rx, ry, rz, c, { detail: 1, jitter: 0.035, vary: 0.12 });
  lp.push([0.55, 0.32, 0.45], 0.4, 0.12, 0.28).cyl(0, 0, 0, 0.025, 0.025, 1.05, 4, LPC.wood, { jitter: 0 }).box(0, 1.02, 0, 0.22, 0.05, 0.05, LPC.woodDark, { jitter: 0 }).box(0, -0.08, 0, 0.2, 0.24, 0.025, LPC.ironLight, { jitter: 0 }).pop();
  for (const [x, z] of [[-3.9, 0.9], [-2.2, 1.1], [-0.9, 0.8], [1.4, 1.1], [3.1, 0.9], [4.4, 1.0], [-4.6, 1.5], [2.6, 1.5]]) weeds(lp, x, z, 0.7);
  const built = lp.build();
  // l'erba, i fiori e i sassolini del prato del gioco
  const put = (key: string, mk: () => ReturnType<typeof sceneryTuft>, v: number, x: number, z: number, sc = 1) => {
    const o = instantiate(getModel(key, 'lowpoly', mk, v), { castShadow: false }); o.position.set(x, 0.12, z); o.rotation.y = v * 1.7; o.scale.setScalar(sc); scene.add(o);
  };
  const spots = [[-4.2, 1.2], [-3.0, 1.6], [-2.6, 0.2], [-1.2, 1.3], [-0.4, 1.9], [1.2, 1.5], [1.6, 0.2], [2.9, 1.4], [3.4, 0.6], [4.5, 1.5], [-5.2, 1.6], [5.4, 1.2], [-1.6, 2.3], [2.2, 2.4], [0.2, 2.6]];
  // cespugli lungo il bordo dietro: il prato non finisce con una riga netta
  for (const [x, z, v, sc] of [[-5.6, -0.3, 0, 1.1], [-3.8, -0.6, 1, 0.9], [-1.6, -0.7, 2, 0.8], [1.0, -0.8, 3, 0.85], [2.1, -0.5, 1, 0.7], [3.9, -0.7, 0, 0.95], [5.7, -0.3, 2, 1.1]]) {
    const o = instantiate(getModel(`bush:${v % 4}`, 'lowpoly', () => sceneryBush(v % 4), v), { castShadow: false }); o.position.set(x, 0.05, z); o.scale.setScalar(sc); o.rotation.y = x; scene.add(o);
  }
  spots.forEach(([x, z], i) => {
    if (i % 4 === 1) put(`flowers:${i % 4}`, () => sceneryFlowers(i % 4), i, x, z, 0.8);
    else if (i % 5 === 2) put(`pebbles:${i % 3}`, () => sceneryPebbles(i % 3), i, x, z, 0.8);
    else put(`tuft:${i % 6}`, () => sceneryTuft(i % 6), i, x, z, 0.9);
  });
  for (const [bucket, geo] of Object.entries(built.geometries)) if (geo) scene.add(new THREE.Mesh(geo as THREE.BufferGeometry, (LOWPOLY_MATERIALS as unknown as Record<string, THREE.Material>)[bucket]));
  const grave = (type: GraveType, x: number, z: number, ry: number, s: number) => {
    const o = instantiate(getModel(`g:${type}:clean:1`, 'lowpoly', () => graveModel(type, 'clean', 1), 1), { castShadow: false });
    o.position.set(x, 0.05, z); o.rotation.y = ry; o.scale.setScalar(s); scene.add(o);
  };
  grave('celtic_cross', -2.5, 0.15, 0.15, 0.6);
  grave('rectangular', 3.0, 0.2, -0.2, 0.55);
  grave('stone_simple', -0.5, 0.0, 0.3, 0.5);
  grave('gothic', 4.7, 0.1, -0.1, 0.45);
  // lanterne accese, con la loro luce sulla terra e l'alone
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const lantern = (x: number, z: number, y = 0.2) => {
    const v = { type: 'lantern', variant: 0, dirty: false, broken: false, lit: true, seed: 1 };
    const model = getModel(placeableKey(v), 'lowpoly', () => placeableModel(v), 1);
    const o = instantiate(model, { castShadow: false });
    o.position.set(x, y, z); o.scale.setScalar(0.5); scene.add(o);
    for (const a of model.lights) {
      const l = new THREE.PointLight(a.color, a.intensity * 5, a.range * 1.4, 1.5); lightWorldPos(a, l.position); o.add(l);
      const hs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc070', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      lightWorldPos(a, hs.position); hs.scale.setScalar(0.9); o.add(hs);
    }
  };
  lantern(-0.75, 1.55, 0.1);
  lantern(3.05, 1.45, 0.1);
  const camera = new THREE.PerspectiveCamera(cam.fov, W / H, 0.1, 60);
  camera.position.set(0, cam.y, cam.z); camera.lookAt(0, cam.look, 0);
  r.render(scene, camera);
  const url = canvas.toDataURL('image/webp', 0.9);
  r.dispose(); r.forceContextLoss();
  return url;
}

/**
 * Anteprima di un modello come nella reference: su una zolla d'erba tonda, di
 * notte, con le sue luci accese. Ritagliata e appoggiata in basso al centro,
 * così le zolle stanno tutte alla stessa altezza; in WebP (pesa un terzo del PNG).
 */
function renderPreview(model: CachedModel, key: string, S: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#a6add9', '#2c2632', 1.35));
  const moon = new THREE.DirectionalLight('#b4c6ee', 1.5); moon.position.set(-5, 8, 4);
  const warm = new THREE.DirectionalLight('#ffc98a', 0.6); warm.position.set(5, 3, 6); // luce calda di lato, come le lanterne del cimitero
  scene.add(moon, warm);
  const o = instantiate(model, { castShadow: false });
  scene.add(o);
  const box = new THREE.Box3().setFromObject(o);
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const rad = Math.max(Math.max(size.x, size.z) * 0.62 + 0.35, size.y * 0.3);
  // la zolla: un disco d'erba basso col bordo di terra, ciuffi e fiori attorno
  const lp = new LP(`bake:plate:${key}`);
  lp.cyl(c.x, -0.16, c.z, rad + 0.05, rad + 0.12, 0.12, 12, LPC.soilDark, { jitter: 0.02 });
  lp.cyl(c.x, -0.05, c.z, rad, rad + 0.04, 0.06, 12, '#3f5536', { jitter: 0.02, vary: 0.12 });
  const built = lp.build();
  for (const [bucket, geo] of Object.entries(built.geometries)) if (geo) scene.add(new THREE.Mesh(geo as THREE.BufferGeometry, (LOWPOLY_MATERIALS as unknown as Record<string, THREE.Material>)[bucket]));
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4 + 0.3, d = rad * (0.72 + (i % 3) * 0.08);
    const k = i % 3 === 0 ? ['flowers', () => sceneryFlowers(i % 4)] as const : ['tuft', () => sceneryTuft(i % 6)] as const;
    const t = instantiate(getModel(`${k[0]}:${i % (k[0] === 'flowers' ? 4 : 6)}`, 'lowpoly', k[1], i), { castShadow: false });
    t.position.set(c.x + Math.cos(a) * d, 0, c.z + Math.sin(a) * d); t.rotation.y = a; t.scale.setScalar(0.8); scene.add(t);
  }
  for (const a of model.lights) { const l = new THREE.PointLight(a.color, a.intensity * 3, a.range * 1.2, 1.5); lightWorldPos(a, l.position); o.add(l); }
  // una lucina calda davanti, bassa, come una lanterna fuori quadro
  const p = new THREE.PointLight('#ffb766', 2.2, rad * 5, 1.4); p.position.set(c.x + rad, 0.5, c.z + rad * 1.4); scene.add(p);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 80);
  const h = Math.max(size.y, rad * 1.2);
  const dist = Math.max(rad * 2.4, h * 1.25) / Math.tan(THREE.MathUtils.degToRad(14)) * 0.55;
  camera.position.set(c.x + dist * 0.62, box.min.y + h * 0.5 + dist * 0.55, c.z + dist * 0.62);
  camera.lookAt(c.x, box.min.y + h * 0.42, c.z);
  r.render(scene, camera);
  const url = settle(canvas, S);
  r.dispose(); r.forceContextLoss();
  return url;
}

/** Ritaglia l'immagine e la appoggia in basso al centro (stesso margine per tutte), in WebP. */
function settle(src: HTMLCanvasElement, S: number): string {
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = S;
  const g = tmp.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const px = g.getImageData(0, 0, S, S).data;
  let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (px[(y * S + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const out = document.createElement('canvas');
  out.width = out.height = S;
  if (x1 >= 0) {
    const w = x1 - x0 + 1, ht = y1 - y0 + 1, pad = Math.round(S * 0.03);
    // se non entra, si rimpicciolisce; altrimenti resta com'è
    const k = Math.min(1, (S - 2 * pad) / w, (S - 2 * pad) / ht);
    out.getContext('2d')!.drawImage(tmp, x0, y0, w, ht, (S - w * k) / 2, S - pad - ht * k, w * k, ht * k);
  }
  return out.toDataURL('image/webp', 0.88);
}

/** Anteprima di un oggetto del catalogo. */
export function renderItemPreview(type: string, S = 320): string {
  const v = { type, variant: 0, dirty: false, broken: false, lit: true, seed: 1 };
  return renderPreview(getModel(placeableKey(v), 'lowpoly', () => placeableModel(v), 1), type, S);
}

/** Anteprima di un tetto (la casa con quel tetto) o di un'aggiunta della Casa del Custode. */
export function renderHousePreview(id: string, S = 320): string {
  if (houseRoof(id)) return renderItemPreviewVariant('keeper_house', houseVariant({ owned: [id], roof: id, hidden: [] }), S);
  const m = housePartLP(id);
  return renderPreview({ geometries: m.geometries, lights: m.lights, height: 1, mats: LOWPOLY_MATERIALS, dedicated: true } as unknown as CachedModel, `house:${id}`, S);
}

function renderItemPreviewVariant(type: string, variant: number, S: number): string {
  const v = { type, variant, dirty: false, broken: false, lit: true, seed: 1 };
  return renderPreview(getModel(placeableKey(v), 'lowpoly', () => placeableModel(v), 1), `${type}:${variant}`, S);
}
