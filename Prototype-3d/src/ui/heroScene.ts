// Testate animate di notte (Albero dei ricordi, Casa del Custode): il cielo
// con la luna e le stelle, un prato piano fino all'orizzonte (il soggetto ci
// poggia sopra), le luci, gli aloni e il giro di
// animazione. Ogni testata ci mette il suo soggetto. Come la testata del
// Registro: un renderer piccolo tutto suo, acceso solo finché è a schermo.

import * as THREE from 'three';
import { createRng } from '../game/rng.ts';
import { getModel, instantiate, lightWorldPos, type CachedModel } from '../render/modelCache.ts';
import { graveModel } from '../render/models/graves.ts';
import { fencePillar, fenceSegment } from '../render/models/fence.ts';
import { deadTree, pine, sceneryBush, sceneryFlowers, sceneryLeaves, sceneryPebbles, sceneryRock, sceneryTuft } from '../render/models/nature.ts';
import { placeableKey, placeableModel } from '../render/models/registry.ts';
import type { GraveType } from '../game/graves.ts';
import { lowNoise } from '../view/terrain.ts';

const FPS = 30;
const FOV = 30;
const HORIZON = '#3d3152', SKY_TOP = '#120f1a', HAZE = '#2a2236';

type Disposable = { dispose: () => void };

/** I colori del prato del gioco (view/terrain.ts, low-poly): verdi scuri con macchie di muschio e d'erba secca. */
const GRASS_A = new THREE.Color('#354839'), GRASS_B = new THREE.Color('#3f5536'), MOSS = new THREE.Color('#61745a'), DRY = new THREE.Color('#8d805c');

/** Il prato: piano fino all'orizzonte, coi colori a macchie ampie come nel gioco. */
function meadow(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(80, 50, 80, 50).rotateX(-Math.PI / 2).translate(0, 0, -18);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n1 = lowNoise(x, z, 5, 9), n2 = lowNoise(x, z, 11, 13);
    c.copy(GRASS_A).lerp(GRASS_B, n1);
    if (n2 > 0.62) c.lerp(DRY, (n2 - 0.62) * 0.8);
    if (n2 < 0.3) c.lerp(MOSS, (0.3 - n2) * 0.7);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

/** Il sottobosco del prato del gioco: ciuffi d'erba, fiorellini, sassolini, qualche roccia e foglia. */
const SCENERY = {
  tuft: (v: number) => getModel(`tuft:${v % 6}`, 'lowpoly', () => sceneryTuft(v % 6), v),
  flowers: (v: number) => getModel(`flowers:${v % 4}`, 'lowpoly', () => sceneryFlowers(v % 4), v),
  pebbles: (v: number) => getModel(`pebbles:${v % 3}`, 'lowpoly', () => sceneryPebbles(v % 3), v),
  rock: (v: number) => getModel(`wrock:${v % 3}`, 'lowpoly', () => sceneryRock(v % 3), v),
  leaves: (v: number) => getModel(`leaves:${v % 3}`, 'lowpoly', () => sceneryLeaves(v % 3), v),
};
const SCENERY_MIX: Array<[number, keyof typeof SCENERY]> = [[0.7, 'tuft'], [0.8, 'flowers'], [0.9, 'pebbles'], [0.95, 'rock'], [1, 'leaves']];

/** Il recinto e il bosco attorno al cimitero, come nel gioco (stesse chiavi: i modelli sono già in memoria). */
const BACK = {
  fence: () => getModel('fseg:1', 'lowpoly', () => fenceSegment(1), 1),
  pillar: () => getModel('fpil:1', 'lowpoly', () => fencePillar(1), 2),
  pine: (v: number) => getModel(`wpine:${v}`, 'lowpoly', () => pine(v + 40), v, true, 1),
  dead: (v: number) => getModel(`wdead:${v}`, 'lowpoly', () => deadTree({ seed: v + 90 }, true), v, true, 1),
  bush: (v: number) => getModel(`bush:${v % 4}`, 'lowpoly', () => sceneryBush(v % 4), v),
};

/** Prepara in anticipo i modelli delle testate (recinto, bosco, sottobosco): aprendole non resta da costruire niente. */
export function warmBackdrop() {
  BACK.fence(); BACK.pillar();
  for (let v = 0; v < 4; v++) { BACK.pine(v); BACK.dead(v); BACK.bush(v); }
  for (let v = 0; v < 12; v++) for (const k of Object.keys(SCENERY) as Array<keyof typeof SCENERY>) SCENERY[k](v);
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
  /** Un oggetto del cimitero (tipo del catalogo) sul prato, per dare l'ambientazione. */
  prop(type: string, x: number, z: number, ry?: number, variant?: number): THREE.Group;
  /** Una tomba sul prato. */
  grave(type: GraveType, x: number, z: number, ry?: number): THREE.Group;
  /** Il recinto del cimitero lungo z = `fenceZ` e, dietro, il bosco. */
  backdrop(fenceZ: number): void;
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
 * Prepara la testata (classe CSS `cls`) col prato e il suo sottobosco, che
 * lascia libero il cerchio `clear` (x, z, raggio) dove sta il soggetto;
 * `build` ci mette il soggetto e avvia l'animazione. Senza WebGL resta il
 * fondo dipinto in CSS.
 */
export function nightHero(cls: string, clear: [number, number, number], build: (hero: NightHero) => void): HeroHandle {
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

  const field = meadow();
  scene.add(field);
  disposables.push(field.geometry, field.material as THREE.Material);
  // tante copie degli stessi modelli: una mesh a istanze per modello (le geometrie sono del gioco, condivise)
  const batches = new Map<CachedModel, THREE.Matrix4[]>();
  const put = (model: CachedModel, x: number, z: number, ry: number, sc = 1, sy = sc) => {
    let list = batches.get(model);
    if (!list) batches.set(model, (list = []));
    list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sc, sy, sc)));
  };
  const flush = () => {
    for (const [model, mats] of batches) for (const [bucket, geo] of Object.entries(model.geometries)) {
      if (!geo) continue;
      const mesh = new THREE.InstancedMesh(geo, model.mats[bucket as keyof typeof model.mats], mats.length);
      mats.forEach((mm, i) => mesh.setMatrixAt(i, mm));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      disposables.push({ dispose: () => mesh.dispose() }); // solo le matrici: la geometria resta al gioco
    }
    batches.clear();
  };
  // sottobosco sparso sul prato
  const [cx, cz, r] = clear;
  const rg = createRng(17);
  for (let i = 0; i < 160; i++) {
    const x = rg.range(-11, 11), z = rg.range(-9, 4.5);
    if (Math.hypot(x - cx, z - cz) < r) continue;
    const roll = rg.next();
    let kind = SCENERY_MIX.find(([p]) => roll < p)![1];
    if (kind === 'rock' && z > -2) kind = 'pebbles'; // le rocce solo in fondo: davanti alla camera sembrerebbero massi
    put(SCENERY[kind](rg.int(12)), x, z, rg.range(0, Math.PI * 2));
  }
  const backdrop = (fenceZ: number) => {
    // il recinto: tratti di un metro e un pilastro ogni tre, come attorno al cimitero
    for (let x = -18; x < 18; x++) {
      put(BACK.fence(), x + 0.5, fenceZ, 0);
      if (x % 3 === 0) put(BACK.pillar(), x, fenceZ, 0);
    }
    // dietro, il bosco: più fitto lontano dal recinto, a macchie, con cespugli a ridosso
    const rb = createRng(23);
    for (let z = fenceZ - 1.3; z > fenceZ - 16; z -= 1.25) {
      for (let x = -20; x < 20; x += 1.25) {
        const d = fenceZ - z;
        const clump = lowNoise(x, z, 31, 5);
        if (rb.next() > (0.38 + Math.min(0.4, d * 0.04)) * (0.5 + clump)) continue;
        const px = x + rb.range(-0.5, 0.5), pz = z + rb.range(-0.5, 0.5), v = rb.int(4), k = rb.next(), sc = 0.85 + rb.next() * 0.55;
        if (d < 2.2 && k < 0.4) put(BACK.bush(v), px, pz, rb.range(0, 6.28), 1 + rb.next() * 0.4);
        else put(k < 0.68 ? BACK.pine(v) : BACK.dead(v), px, pz, rb.range(0, 6.28), sc, sc * (0.9 + rb.next() * 0.35));
      }
    }
    flush();
  };
  const prop = (type: string, x: number, z: number, ry = 0, variant = 0) => {
    const v = { type, variant, dirty: false, broken: false, lit: true, seed: 1 };
    const model = getModel(placeableKey(v), 'lowpoly', () => placeableModel(v), 1);
    const o = instantiate(model, { castShadow: false });
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    scene.add(o);
    // i lampioni e le lanterne si accendono, con l'alone
    for (const a of model.lights) {
      const l = new THREE.PointLight(a.color, a.intensity * 2, a.range, 1.6);
      lightWorldPos(a, l.position);
      o.add(l);
      if (a.halo > 0) { const hs = halo('#ffc070', 0.5); lightWorldPos(a, hs.position); hs.scale.setScalar(0.4 + a.halo * 0.4); o.add(hs); }
    }
    return o;
  };
  const grave = (type: GraveType, x: number, z: number, ry = 0) => {
    const o = instantiate(getModel(`g:${type}:clean:1`, 'lowpoly', () => graveModel(type, 'clean', 1), 1), { castShadow: false });
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    scene.add(o);
    return o;
  };

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
    scene, prop, grave, backdrop, halo,
    modelLights: (model, parent, boost = 1) => model.lights.map((a) => {
      const l = new THREE.PointLight(a.color, a.intensity * 2.2 * boost, a.range * 0.9, 1.6);
      lightWorldPos(a, l.position);
      parent.add(l);
      return l;
    }),
    track: (...d) => { disposables.push(...d); },
    reframe: () => place(),
    start: (framing, step) => {
      flush();
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
