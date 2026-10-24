// Testate animate di notte (Albero dei ricordi, Casa del Custode): il cielo
// con la luna e le stelle, un prato piano fino all'orizzonte (il soggetto ci
// poggia sopra), le luci, gli aloni e il giro di
// animazione. Ogni testata ci mette il suo soggetto. Come la testata del
// Registro: un renderer piccolo tutto suo, acceso solo finché è a schermo.

import * as THREE from 'three';
import { createRng } from '../game/rng.ts';
import { lightWorldPos, type CachedModel } from '../render/modelCache.ts';

const FPS = 30;
const FOV = 30;
const HORIZON = '#3d3152', SKY_TOP = '#120f1a', HAZE = '#2a2236';
const GRASS = ['#2f4233', '#354a36', '#3a5038', '#2b3d2f'];

type Disposable = { dispose: () => void };

/** Altezza del prato: piano fino all'orizzonte, appena mosso (niente colline); del tutto piano entro `r` dal soggetto. */
function groundAt(x: number, z: number, cx: number, cz: number, r: number): number {
  const flat = THREE.MathUtils.smoothstep(Math.hypot(x - cx, z - cz), r, r + 2.5);
  return flat * (0.05 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.6 - 0.4) + 0.03 * Math.sin(x * 1.1 + z * 0.7));
}

/** Il prato: una griglia low-poly a facce piatte, con le zolle di verdi diversi. */
function meadow(height: (x: number, z: number) => number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(70, 46, 70, 40).rotateX(-Math.PI / 2).translate(0, 0, -15);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const rnd = createRng(31).next;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (rnd() - 0.5) * 0.4, z = pos.getZ(i) + (rnd() - 0.5) * 0.4;
    pos.setXYZ(i, x, height(x, z) + (rnd() - 0.5) * 0.06, z);
  }
  const flat = geo.toNonIndexed();
  geo.dispose();
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

/** Alone tondo e morbido (frutti, lucciole, luna, finestre). */
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

/** Inquadratura: il soggetto alto `fill` volte l'altezza della testata (oltre 1 la cima esce), col centro a `sx` della larghezza. */
export interface Framing { box: THREE.Box3; fill: number; sx: number; base: number; elev: number }

export interface NightHero {
  scene: THREE.Scene;
  /** Altezza del prato in un punto. */
  ground(x: number, z: number): number;
  halo(color: string, opacity: number): THREE.Sprite;
  /** Luci puntiformi dalle ancore di un modello (finestre, lanterne), già al loro posto sotto `parent`. */
  modelLights(model: CachedModel, parent: THREE.Object3D, boost?: number): THREE.PointLight[];
  track(...d: Disposable[]): void;
  /** Rifà l'inquadratura (il soggetto è cambiato). */
  reframe(): void;
  /** Avvia: `framing` dice cosa inquadrare (richiesto a ogni cambio di misura), `step` anima. */
  start(framing: () => Framing, step: (t: number) => void): void;
}

export interface HeroHandle { el: HTMLElement; stop: () => void }

/**
 * Prepara la testata (classe CSS `cls`) col prato piano attorno a (cx, cz)
 * entro `flatR`; `build` ci mette il soggetto e avvia l'animazione. Senza
 * WebGL resta il fondo dipinto in CSS.
 */
export function nightHero(cls: string, flat: [number, number, number], build: (hero: NightHero) => void): HeroHandle {
  const el = document.createElement('div');
  el.className = `drawer-hero night-hero ${cls}`;
  const canvas = document.createElement('canvas');
  el.append(canvas);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch {
    el.classList.add('static');
    return { el, stop: () => undefined };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_TOP);
  scene.fog = new THREE.Fog(HAZE, 16, 42); // il prato lontano sfuma più scuro del cielo: l'orizzonte si legge
  scene.add(new THREE.HemisphereLight('#9aa2d6', '#2c2632', 1.5));
  const moonLight = new THREE.DirectionalLight('#b4c6ee', 1.6);
  moonLight.position.set(-6, 8, 7);
  // un chiarore freddo da davanti, perché il soggetto non resti una sagoma nera
  const fill = new THREE.DirectionalLight('#8f9fd0', 0.9);
  fill.position.set(2, 3, 10);
  const sky = skyDrop();
  scene.add(moonLight, fill, sky);

  const tex = glowTexture();
  const disposables: Disposable[] = [tex, sky.geometry, sky.material as THREE.Material];
  const halo = (color: string, opacity: number) => {
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    disposables.push(m);
    return new THREE.Sprite(m);
  };

  // la luna che sorge a sinistra sull'orizzonte (in alto c'è il titolo), e le stelle
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

  const [cx, cz, r] = flat;
  const ground = (x: number, z: number) => groundAt(x, z, cx, cz, r);
  const field = meadow(ground);
  scene.add(field);
  disposables.push(field.geometry, field.material as THREE.Material);

  const camera = new THREE.PerspectiveCamera(FOV, 2.3, 0.1, 80);
  let frameFn: () => Framing = () => ({ box: new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1)), fill: 0.9, sx: 0.5, base: 0.1, elev: 8 });
  let stepFn: (t: number) => void = () => undefined;
  let t = 0, last = 0, raf = 0, stopped = false, w = 0, h = 0;

  const place = () => {
    const f = frameFn();
    const size = f.box.getSize(new THREE.Vector3()), c = f.box.getCenter(new THREE.Vector3());
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // l'altezza che si vede al soggetto; sullo schermo stretto ci si allontana perché entri in larghezza
    let visH = size.y / f.fill;
    visH = Math.max(visH, (size.x * 1.15) / camera.aspect);
    const dist = visH / 2 / tan;
    const visW = visH * camera.aspect;
    const elev = THREE.MathUtils.degToRad(f.elev);
    // la base del soggetto a `base` dal fondo, il suo centro a `sx` della larghezza
    const lookY = f.box.min.y - visH * f.base + visH / 2;
    const lookX = c.x - (f.sx - 0.5) * visW;
    camera.position.set(lookX, lookY + Math.sin(elev) * dist, c.z + Math.cos(elev) * dist);
    camera.lookAt(lookX, lookY, c.z);
    camera.updateProjectionMatrix();
  };

  const resize = (force = false) => {
    const nw = el.clientWidth, nh = el.clientHeight;
    if (!nw || !nh || (!force && nw === w && nh === h)) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    place();
  };

  const frame = () => {
    if (stopped) return;
    const now = performance.now();
    if (!el.isConnected) { stop(); return; }
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 1000 / FPS - 2) return;
    t += last ? Math.min(0.05, (now - last) / 1000) : 1 / FPS;
    last = now;
    resize();
    stepFn(t);
    renderer.render(scene, camera);
  };

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    // i modelli condivisi col gioco (case, lapidi, personaggi) restano: si libera ciò che è solo della testata
    for (const d of disposables) d.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  build({
    scene, ground, halo,
    modelLights: (model, parent, boost = 1) => model.lights.map((a) => {
      const l = new THREE.PointLight(a.color, a.intensity * 2.2 * boost, a.range * 0.9, 1.6);
      lightWorldPos(a, l.position);
      parent.add(l);
      return l;
    }),
    track: (...d) => { disposables.push(...d); },
    reframe: () => place(),
    start: (framing, step) => {
      frameFn = framing; stepFn = step;
      requestAnimationFrame(() => {
        resize(true);
        renderer.compile(scene, camera);
        stepFn(0);
        renderer.render(scene, camera);
        last = performance.now();
        raf = requestAnimationFrame(frame);
      });
    },
  });
  return { el, stop };
}

/** Ingombro di un oggetto nel mondo (per l'inquadratura). */
export function boxOf(obj: THREE.Object3D): THREE.Box3 {
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}
