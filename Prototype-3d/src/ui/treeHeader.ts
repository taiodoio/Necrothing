// Testata animata dell'albero dei ricordi: l'albero di notte su un prato a
// collinette che arriva fino all'orizzonte, con qualche lapide sparsa e la
// luna. I frutti accesi pulsano piano, le lucciole girano attorno alla
// chioma, ogni tanto cade una foglia e un fantasma attraversa le colline.
// Come la testata del Registro: un renderer piccolo tutto suo, acceso solo
// finché la testata è a schermo.

import * as THREE from 'three';
import type { GraveType } from '../game/graves.ts';
import { createRng } from '../game/rng.ts';
import { graveModel } from '../render/models/graves.ts';
import { memoryTreeLP } from '../render/lowpoly/memoryTree.ts';
import { getModel, instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { animateRig, buildRig } from '../view/characters.ts';

const FPS = 30;
/** Inquadratura: distanza minima della camera e larghezza di scena che deve sempre entrare. */
const DIST = 13, SPAN = 15, FOV = 30;
const HORIZON = '#3d3152', SKY_TOP = '#120f1a', HAZE = '#2a2236', GRASS = ['#2f4233', '#354a36', '#3a5038', '#2b3d2f'];
const LEAVES = ['#5f7d6c', '#6e8f7b', '#7a9483', '#c9772f'];

/**
 * Altezza del prato: piano attorno all'albero (le radici poggiano a terra),
 * collinette davanti e di lato, colline più alte verso il fondo.
 */
function ground(x: number, z: number, tx: number): number {
  const d = Math.hypot(x - tx, z);
  const flat = THREE.MathUtils.smoothstep(d, 3, 5.5);
  const near = 0.28 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.6 - 0.4) + 0.18 * Math.sin(x * 1.1 + z * 0.7);
  const back = Math.max(0, -z - 3) * (0.13 + 0.07 * Math.sin(x * 0.27 + 2)) + Math.max(0, -z - 10) * 0.08 * (1 + Math.sin(x * 0.18 - 1));
  return flat * (near + back);
}

/** Il prato: una griglia low-poly a facce piatte, più chiara in cima ai dossi. */
function meadow(tx: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(70, 46, 70, 40).rotateX(-Math.PI / 2).translate(0, 0, -15);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const rnd = createRng(31).next;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (rnd() - 0.5) * 0.4, z = pos.getZ(i) + (rnd() - 0.5) * 0.4;
    pos.setXYZ(i, x, ground(x, z, tx) + (rnd() - 0.5) * 0.06, z);
  }
  const flat = geo.toNonIndexed();
  const p = flat.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let f = 0; f < p.count; f += 3) {
    const y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
    c.set(GRASS[Math.floor(rnd() * GRASS.length)]).offsetHSL(0, 0, Math.min(0.06, y * 0.02));
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (f + k) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(col, 3));
  flat.computeVertexNormals();
  return new THREE.Mesh(flat, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

/** Cielo: un fondale con la sfumatura dall'orizzonte (viola caldo) all'alto (quasi nero). */
function skyDrop(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(120, 40, 1, 8).translate(0, 18, -40);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const lo = new THREE.Color(HORIZON), hi = new THREE.Color(SKY_TOP), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { c.copy(lo).lerp(hi, THREE.MathUtils.clamp((pos.getY(i) - 1) / 22, 0, 1)); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false }));
}

/** Alone tondo e morbido (frutti, lucciole, luna). */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface TreeHeader { el: HTMLElement; stop: () => void }

/** Crea la testata per un albero con `memories` frutti accesi; si ferma quando esce dal documento. */
export function treeHeader(memories: number): TreeHeader {
  const el = document.createElement('div');
  el.className = 'drawer-hero tree-hero';
  const canvas = document.createElement('canvas');
  el.append(canvas);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch {
    el.classList.add('static'); // senza WebGL resta il fondo dipinto in CSS
    return { el, stop: () => undefined };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_TOP);
  scene.fog = new THREE.Fog(HAZE, 16, 42); // le colline lontane sfumano più scure del cielo: si stagliano
  scene.add(new THREE.HemisphereLight('#9aa2d6', '#2c2632', 1.5));
  const moonLight = new THREE.DirectionalLight('#b4c6ee', 1.6);
  moonLight.position.set(-6, 8, 7);
  // un chiarore freddo da davanti, perché la chioma non resti una macchia nera
  const fill = new THREE.DirectionalLight('#8f9fd0', 0.9);
  fill.position.set(2, 3, 10);
  scene.add(moonLight, fill, skyDrop());

  const tex = glowTexture();
  const disposables: Array<{ dispose: () => void }> = [tex];
  const halo = (color: string, opacity: number) => {
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    disposables.push(m);
    return new THREE.Sprite(m);
  };

  // la luna che sorge a sinistra dietro le colline (in alto c'è il titolo), con le stelle
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), new THREE.MeshBasicMaterial({ color: '#f1e8cc', fog: false }));
  moon.position.set(-16, 9.5, -38);
  const moonHalo = halo('#cfd8ff', 0.35);
  moonHalo.position.copy(moon.position);
  moonHalo.scale.setScalar(9);
  scene.add(moon, moonHalo);
  const rs = createRng(5).next;
  const starPos = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) starPos.set([(rs() - 0.5) * 100, 6 + rs() * 26, -39], i * 3);
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false });
  scene.add(new THREE.Points(starGeo, starMat));
  disposables.push(starGeo, starMat, moon.geometry, moon.material as THREE.Material);

  // l'albero (a destra: a sinistra c'è il titolo) sul prato, e le lapidi sulle colline
  const TX = 3;
  const field = meadow(TX);
  scene.add(field);
  disposables.push(field.geometry, field.material as THREE.Material);
  const fruits: THREE.Vector3[] = [];
  const treeModel = memoryTreeLP(memories, 2, fruits);
  const tree = instantiate({ geometries: treeModel.geometries, lights: [], height: 1, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: false });
  tree.position.set(TX, 0, 0);
  tree.rotation.y = -0.25;
  tree.scale.setScalar(0.82);
  scene.add(tree);
  disposables.push(...Object.values(treeModel.geometries).filter((g): g is THREE.BufferGeometry => !!g));
  const canopy = new THREE.PointLight('#ffd27a', 1.2 + Math.min(1, memories / 12) * 2.5, 9, 1.4);
  canopy.position.set(TX, 3.2, 1.2);
  const hollow = new THREE.PointLight('#ffad5a', 2.2, 3.5, 1.6);
  hollow.position.set(TX, 0.5, 1.4);
  // luna sulla chioma: la cupola è fitta e scura, da sola resterebbe una macchia
  const crown = new THREE.PointLight('#aabce8', 14, 11, 1.2);
  crown.position.set(TX - 1.5, 6.5, 4.5);
  scene.add(canopy, hollow, crown);
  const STONES: Array<[GraveType, number, number, number, number]> = [
    ['celtic_cross', -3.6, -2.4, 0.4, 0.06], ['stone_simple', -6.4, -6, -0.3, -0.08], ['gothic', -1.2, -9, 0.2, 0.05], ['rectangular', 8.6, -4.5, -0.5, 0.07],
  ];
  for (const [type, x, z, ry, tilt] of STONES) {
    const g = instantiate(getModel(`g:${type}:clean:1`, 'lowpoly', () => graveModel(type, 'clean', 1), 1), { castShadow: false });
    g.position.set(x, ground(x, z, TX) - 0.05, z);
    g.rotation.set(0, ry, tilt);
    g.scale.setScalar(0.85);
    scene.add(g);
  }

  // un alone per ogni frutto acceso: pulsano piano, ognuno col suo passo
  const fruitHalos = fruits.map((p, i) => {
    const s = halo('#ffcf73', 0.5);
    s.position.copy(p);
    s.scale.setScalar(0.9);
    tree.add(s);
    return { s, ph: i * 1.7, sp: 0.8 + (i % 5) * 0.13 };
  });

  // lucciole attorno alla chioma
  const rf = createRng(9).next;
  const flies = Array.from({ length: 12 }, () => {
    const s = halo('#ffd36b', 0.9);
    s.scale.setScalar(0.22);
    scene.add(s);
    return { s, x: TX + (rf() - 0.5) * 7, y: 0.5 + rf() * 3.6, z: (rf() - 0.5) * 3 + 0.5, ph: rf() * 6, sp: 0.3 + rf() * 0.4 };
  });

  // foglie che cadono dalla chioma, girando
  const leafGeo = new THREE.PlaneGeometry(0.16, 0.09);
  disposables.push(leafGeo);
  const leaves = Array.from({ length: 6 }, (_, i) => {
    const mat = new THREE.MeshLambertMaterial({ color: LEAVES[i % LEAVES.length], side: THREE.DoubleSide });
    disposables.push(mat);
    const m = new THREE.Mesh(leafGeo, mat);
    scene.add(m);
    return { m, t0: i * 1.9, life: 6 + (i % 3), x: TX + (rf() - 0.5) * 3.6, z: 0.4 + rf() * 1.6 };
  });

  // il fantasma che ogni tanto attraversa le colline, dietro l'albero
  const ghost = buildRig('ghost', 'lowpoly');
  ghost.root.scale.setScalar(0.9);
  scene.add(ghost.root);
  const GHOST_EVERY = 22, GHOST_LEN = 13, GZ = -5;

  const camera = new THREE.PerspectiveCamera(FOV, 2.3, 0.1, 80);
  let t = 0, last = 0, raf = 0, stopped = false, w = 0, h = 0;

  const resize = () => {
    const nw = el.clientWidth, nh = el.clientHeight;
    if (!nw || !nh || (nw === w && nh === h)) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // sullo schermo stretto ci si allontana, così albero e colline restano dentro
    const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(DIST, SPAN / 2 / (half * camera.aspect));
    camera.position.set(0.6, 1.9, dist);
    camera.lookAt(0.6, 2.25, 0);
    camera.updateProjectionMatrix();
  };

  const step = (dt: number) => {
    t += dt;
    for (const f of fruitHalos) {
      const k = 0.5 + 0.5 * Math.sin(t * f.sp + f.ph);
      (f.s.material as THREE.SpriteMaterial).opacity = 0.35 + k * 0.45;
      f.s.scale.setScalar(0.8 + k * 0.3);
    }
    canopy.intensity = (1.2 + Math.min(1, memories / 12) * 2.5) * (0.9 + Math.sin(t * 0.9) * 0.1);
    hollow.intensity = 2.2 * (0.86 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.05);
    for (const f of flies) {
      f.s.position.set(f.x + Math.sin(t * f.sp + f.ph) * 0.9, f.y + Math.sin(t * f.sp * 1.3 + f.ph * 2) * 0.4, f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 0.6);
      (f.s.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.sin(t * 1.4 + f.ph * 3)) * 0.9;
    }
    for (const l of leaves) {
      const u = ((t + l.t0) % l.life) / l.life;
      l.m.visible = u < 0.97;
      l.m.position.set(l.x + Math.sin(u * 9 + l.t0) * 0.5 + u * 0.8, 3.6 - u * 3.55, l.z);
      l.m.rotation.set(u * 11 + l.t0, u * 7, Math.sin(u * 8) * 0.8);
    }
    const g = (t % GHOST_EVERY) / GHOST_LEN;
    ghost.root.visible = g < 1;
    if (g < 1) {
      const x = -14 + g * 30;
      ghost.root.position.set(x, ground(x, GZ, TX) + 0.5 + Math.sin(t * 2) * 0.12, GZ);
      ghost.root.rotation.y = Math.PI / 2 - 0.4;
      animateRig(ghost, 'fly', t, t * 2);
    }
  };

  const frame = () => {
    if (stopped) return;
    const now = performance.now();
    if (!el.isConnected) { stop(); return; }
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 1000 / FPS - 2) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / FPS;
    last = now;
    resize();
    step(dt);
    renderer.render(scene, camera);
  };

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    // i modelli condivisi (lapidi, fantasma) restano al gioco: si libera ciò che è solo della testata
    for (const d of disposables) d.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  requestAnimationFrame(() => {
    resize();
    renderer.compile(scene, camera);
    step(0);
    renderer.render(scene, camera);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  });
  return { el, stop };
}
