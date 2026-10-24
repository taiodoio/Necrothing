// Strumento (non fa parte del gioco): compone e fotografa l'immagine di
// avvio con il motore del gioco. Prepara un cimitero di scena dietro il
// cancello (sentiero centrale, tombe, erba, la casa del Custode, l'albero dei
// ricordi, l'orto dei cervelli con gli zombie, lo scheletro che rastrella, il
// becchino con la carriola, lanterne e fuochi fatui), mette il Custode poco
// oltre il cancello e scatta da fuori, con il cancello ai lati fuori fuoco:
// camera prospettica, profondità di campo secondo la distanza, nebbia,
// lucine, bagliore e bordi scuri. Si usa dalla console di una pagina del
// gioco aperta su un profilo pulito (cambia il salvataggio):
//   const S = await import('/src/tools/splash.ts'); await S.stage(necro); S.shoot(necro, S.SHOTS.sera)

import * as THREE from 'three';
import type { Game } from '../app/Game.ts';
import { areaForLevel } from '../game/world.ts';
import type { GraveType } from '../game/graves.ts';
import type { Grave, Placed } from '../game/state.ts';
import { wheelbarrowLP } from '../render/lowpoly/newItems.ts';
import { animateRig, buildRig } from '../view/characters.ts';
import { lpMesh } from '../view/presences.ts';
import { HALF } from '../view/WorldView.ts';

/** Un'inquadratura e la sua luce. */
export interface Shot {
  cam: [number, number, number];
  look: [number, number, number];
  fov: number;
  /** Custode: posizione (mondo) e punto verso cui guarda. */
  keeper: [number, number];
  faceTo: [number, number];
  /** Distanza a fuoco (mondo) e raggio massimo di sfocatura (pixel dell'immagine larga 1080). */
  focus: number;
  blur: number;
  /** Quanto presto sfoca davanti (primo piano: il cancello) e dietro. */
  nearK: number;
  farK: number;
  /** Luce: «sera» (blu-viola, un filo d'arancio all'orizzonte, luna) o «crepuscolo» (più caldo). */
  light: 'sera' | 'crepuscolo';
}

let gate = new THREE.Vector3();
export const SHOTS: Record<string, Shot> = {};

const iso = () => new Date().toISOString();
let n = 0;
const place = (type: string, x: number, y: number, rot = 0, variant = 0): Placed => ({ id: `splash-${n++}`, type, x, y, rot, variant, lit: true, caredAt: iso(), dirty: false, broken: false, createdAt: iso() });

/** Oggetti di scena aggiunti a mano (becchino, lucine, banchi di nebbia): restano finché si scatta. */
const extras: Array<{ obj: THREE.Object3D; update?: (t: number) => void }> = [];

/** Il cimitero di scena dietro il cancello, la sera, niente interfaccia. */
export async function stage(game: Game) {
  const s = game.state;
  const a = areaForLevel(s.world.expansionLevel);
  const gx = a.x + Math.floor(a.w / 2) - 2; // prima cella del varco (come in WorldView)
  gate = new THREE.Vector3(gx + 2.5 - HALF, 0, a.y + a.h - HALF);
  const gy = a.y + a.h - 1; // ultima fila dentro il recinto
  const px = gx + 1; // il sentiero (due celle) che parte dal cancello
  // la scena davanti al cancello si rifà da capo: via tutto ciò che c'era, tranne i sentieri lontani
  const zone = (x: number, y: number) => y >= gy - 22 && x >= px - 14 && x <= px + 14;
  s.placeables = s.placeables.filter((p) => !zone(p.x, p.y) || p.type === 'shop');
  s.graves = s.graves.filter((g) => !zone(g.x, g.y));
  const template = s.graves[0] ?? ({} as Grave);
  // il sentiero centrale, dal cancello fino all'albero
  for (let y = gy - 15; y <= gy + 6; y++) for (const x of [px, px + 1]) s.placeables.push(place('path_stone', x, y));
  // fuori dal cancello: erba alta e cespugli ai lati del sentiero
  s.placeables.push(place('tall_grass', px - 2, gy + 2), place('tall_grass', px + 3, gy + 3), place('bushes', px - 4, gy + 4), place('bushes', px + 4, gy + 1), place('tall_grass', px - 3, gy + 6), place('glow_pumpkin', px + 2, gy + 4));
  // tutto è disposto per offset dal centro del varco (dx a destra, dz verso l'interno negativo), dentro il «cono» che si vede dal cancello
  const at = (type: string, dx: number, dz: number, fp: [number, number] = [1, 1]) => place(type, Math.round(gx + 2.5 + dx - fp[0] / 2), Math.round(gy + 1 + dz - fp[1] / 2));
  // la camera è appena dentro il cancello, alta, e guarda giù lungo il sentiero: la scena sale a strati
  // (primo piano sfocato, il Custode, le presenze e le tombe, in fondo la casa, l'albero e la luna)
  const graves: Array<[GraveType, number, number]> = [
    ['stone_simple', -2, -3.4], ['gothic', -2.3, -8.2], ['victorian', 1.9, -8.6], ['celtic_cross', -2.6, -12], ['angel', -3.4, -15.4], ['stone_simple', 2.6, -16.4],
    ['rectangular', 2.2, -4.2], ['obelisk', -4.8, -10.4], ['marble_cross', 4.6, -7.4],
  ];
  for (const [graveType, dx, dz] of graves) {
    const p = at('grave', dx, dz, [2, 2]);
    s.graves.push({ ...template, id: `splash-g${n++}`, seed: n * 7, graveType, x: p.x, y: p.y, hasFlowers: true, flowersAt: iso(), dirty: false, weeds: false, broken: false, muddy: false, legacy: false } as Grave);
  }
  s.placeables.push(
    // in fondo l'albero dei ricordi, a sinistra la casa del Custode, a destra l'orto dei cervelli (esce un po' dal bordo)
    at('memory_tree', -0.4, -24, [5, 5]),
    at('keeper_house', -4.8, -19.5, [4, 4]),
    at('brain_farm', 3.6, -14.6, [4, 3]),
    at('zombies_dance', 2.1, -11.8, [2, 2]),
    // lo scheletro giardiniere rastrella vicino al sentiero
    at('gardener_corner', -1.4, -10.4),
    // lampioni e lanterne lungo il sentiero, zucche e candele accese
    at('lamp_post_gothic', -1.7, -5), at('lamp_post_gothic', 1.4, -8.8),
    at('lantern_stone', -1.6, -13.8), at('lantern_stone', 1.1, -14.2),
    at('glow_pumpkin', -1.5, -2.6), at('glow_pumpkin', 1.6, -5.8),
    // erba, aiuole, alberi
    at('tall_grass', -1.6, -1.6), at('tall_grass', 1.6, -2.2), at('tall_grass', -3.6, -6.2), at('tall_grass', 3.8, -9.4), at('tall_grass', -1.8, -17), at('tall_grass', 1.9, -18.4),
    at('flowerbed', -4.2, -13.2, [2, 2]), at('poison_shrooms', 3.4, -4.6), at('bushes', -6, -7), at('bushes', 6.4, -11),
    at('dead_tree', -6.6, -12), at('cypress', 6.2, -19), at('half_pine', -7.6, -21), at('dead_tree', 7, -5), at('cypress', -5.6, -3),
  );
  for (let i = 0; i < 6; i++) s.entrusted.push({ grave: { ...template, id: `splash-e${i}` } as Grave, entrustedAt: iso(), ghostVisits: 0 });
  // fuochi fatui sparsi sul prato
  s.world.looseWisps = [[-2.7, -10.8], [1.5, -9.8], [-2.1, -14], [0.6, -19], [3, -16.6], [-3.4, -17.4], [2.2, -7]].map(([dx, dz], i) => { const p = at('w', dx, dz); return { id: `splash-w${i}`, x: p.x, y: p.y }; });
  s.world.weather = 'clear';
  const gm = game as unknown as { actors: { setPresenceTier(t: string): void }; scene: THREE.Scene };
  gm.actors.setPresenceTier('high'); // tutti gli zombie dell'orto
  game.setTimeOverride('night');
  game.afterChange();

  // il becchino con la carriola piena, in fondo al sentiero, che se ne va verso sinistra
  for (const e of extras) e.obj.removeFromParent();
  extras.length = 0;
  const digger = buildRig('gravedigger', 'lowpoly');
  const barrow = lpMesh(wheelbarrowLP(true, false));
  barrow.position.set(0, 0, 0.8);
  digger.root.add(barrow);
  digger.root.position.set(gate.x + 0.2, 0, gate.z - 16.2);
  digger.root.rotation.y = -Math.PI / 2 - 0.35; // se ne va verso sinistra, un po' di spalle
  gm.scene.add(digger.root);
  extras.push({ obj: digger.root, update: (t) => {
    animateRig(digger, 'walk', t, t * 2.6);
    const p = digger.parts;
    if (p.armL) p.armL.rotation.x = -0.75;
    if (p.armR) p.armR.rotation.x = -0.75;
  } });
  // lucine (lucciole) e banchi di nebbia bassa
  const glow = glowTexture();
  const rnd = mulberry(7);
  for (let i = 0; i < 46; i++) {
    const warm = rnd() < 0.6;
    const m = new THREE.SpriteMaterial({ map: glow, color: warm ? '#ffd27a' : '#9ff3dc', transparent: true, opacity: 0.55 + rnd() * 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const sp = new THREE.Sprite(m);
    const dz = 1 + rnd() * 18;
    sp.position.set(gate.x + (rnd() - 0.5) * 2 * (1 + dz * 0.3), 0.25 + rnd() * 2.4, gate.z - dz);
    sp.scale.setScalar(0.07 + rnd() * 0.08);
    gm.scene.add(sp);
    extras.push({ obj: sp });
  }
  const mist = mistTexture();
  for (let i = 0; i < 22; i++) {
    const m = new THREE.SpriteMaterial({ map: mist, color: '#9aa6c8', transparent: true, opacity: 0.08 + rnd() * 0.08, depthWrite: false });
    const sp = new THREE.Sprite(m);
    sp.position.set(gate.x + (rnd() - 0.5) * 18, 0.2 + rnd() * 0.4, gate.z - 12 - rnd() * 14);
    sp.scale.set(5 + rnd() * 5, 1.1 + rnd() * 0.8, 1);
    gm.scene.add(sp);
    extras.push({ obj: sp });
  }
  // niente interfaccia sopra la scena
  if (!document.getElementById('splash-css')) {
    const css = document.createElement('style');
    css.id = 'splash-css';
    css.textContent = '#game > :not(canvas), .welcome-scrim, .tutorial { display: none !important; }'; // i18n-ok
    document.head.append(css);
  }
  const g = gate;
  // da fuori, poco dietro il cancello (i pilastri ai lati, fuori fuoco); il Custode due passi oltre, sul sentiero
  const keeper: [number, number] = [g.x - 0.45, g.z - 7];
  const base = { keeper, faceTo: [g.x + 1.1, g.z - 14] as [number, number], nearK: 0.45, farK: 5.5, light: 'sera' as const };
  Object.assign(SHOTS, {
    // A: dall'alto, appena dentro il cancello: si vede tutto il sentiero fino all'albero
    alta: { ...base, cam: [g.x - 0.3, 3.4, g.z - 0.4], look: [g.x - 0.3, 0.2, g.z - 15], fov: 60, focus: 7.4, blur: 12 },
    // B: più bassa e più indietro sul sentiero, il Custode più vicino all'orizzonte
    bassa: { ...base, cam: [g.x - 0.3, 2.2, g.z - 0.2], look: [g.x - 0.3, 0.9, g.z - 16], fov: 58, focus: 5.6, blur: 12 },
    // C: a metà, un po' più indietro: il Custode più piccolo, più cielo per il titolo
    media: { ...base, cam: [g.x - 0.25, 2.8, g.z - 0.3], look: [g.x - 0.3, 0.75, g.z - 16], fov: 60, focus: 7.3, blur: 12 },
  } satisfies Record<string, Shot>);
}

function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Un banco di nebbia: una macchia allungata e morbida. */
function mistTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d')!;
  const rnd = mulberry(3);
  for (let i = 0; i < 14; i++) {
    const x = 40 + rnd() * 176, y = 26 + rnd() * 14, r = 18 + rnd() * 26;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 256, 64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Mette il Custode al suo posto (e la camera del gioco lo segue, così luci e ombre si centrano lì). */
export function pose(game: Game, shot: Shot) {
  const g = game as unknown as { actors: { avatar: { pos: THREE.Vector3; facing: number; path: THREE.Vector3[] } } };
  const av = g.actors.avatar;
  av.path = [];
  av.pos.set(shot.keeper[0], 0, shot.keeper[1]);
  av.facing = Math.atan2(shot.faceTo[0] - shot.keeper[0], shot.faceTo[1] - shot.keeper[1]);
}

/** Cielo (sullo sfondo, a schermo): sera blu-viola con un filo d'arancio e la luna, o crepuscolo più caldo. */
function sky(light: Shot['light'], horizon: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d')!;
  const lg = g.createLinearGradient(0, 0, 0, 512);
  if (light === 'sera') {
    lg.addColorStop(0, '#0b0c1c'); lg.addColorStop(horizon * 0.55, '#1b1d3c'); lg.addColorStop(horizon * 0.88, '#3b2f5c'); lg.addColorStop(horizon * 0.97, '#7a4a62'); lg.addColorStop(horizon, '#b8664f'); lg.addColorStop(1, '#2a2338');
  } else {
    lg.addColorStop(0, '#1a1730'); lg.addColorStop(horizon * 0.5, '#3d2d58'); lg.addColorStop(horizon * 0.82, '#9a4f6c'); lg.addColorStop(horizon, '#ee8a54'); lg.addColorStop(1, '#ffb56b');
  }
  g.fillStyle = lg; g.fillRect(0, 0, 256, 512);
  if (light === 'sera') {
    // stelle e la luna, in alto a destra (il titolo sta al centro)
    const rnd = mulberry(11);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`; g.fillRect(rnd() * 256, rnd() * 512 * horizon * 0.8, 1, 1); }
    const mx = 206, my = 512 * horizon * 0.56;
    const halo = g.createRadialGradient(mx, my, 0, mx, my, 60);
    halo.addColorStop(0, 'rgba(220,230,255,0.45)'); halo.addColorStop(1, 'rgba(220,230,255,0)');
    g.fillStyle = halo; g.fillRect(0, 0, 256, 512);
    g.fillStyle = '#eef0ff'; g.beginPath(); g.arc(mx, my, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(180,190,220,0.35)'; g.beginPath(); g.arc(mx - 3, my + 2, 3, 0, Math.PI * 2); g.arc(mx + 4, my - 3, 2, 0, Math.PI * 2); g.fill();
  } else {
    const sun = g.createRadialGradient(256 * 0.3, 512 * horizon, 0, 256 * 0.3, 512 * horizon, 190);
    sun.addColorStop(0, 'rgba(255, 226, 160, 0.9)'); sun.addColorStop(0.2, 'rgba(255, 170, 100, 0.5)'); sun.addColorStop(1, 'rgba(255, 140, 90, 0)');
    g.fillStyle = sun; g.fillRect(0, 0, 256, 512);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── profondità di campo: sfocatura secondo la distanza dal fuoco ─────────

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'; // i18n-ok

const BLUR = /* glsl, i18n-ok */ `
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform vec2 uTexel; uniform vec2 uDir; uniform float uMax; uniform float uFocus; uniform float uNear; uniform float uFar; uniform float uNearK; uniform float uFarK;
varying vec2 vUv;
float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float coc(vec2 uv) {
  float z = lin(texture2D(tDepth, uv).x);
  float k = z < uFocus ? (uFocus - z) / (uFocus * uNearK) : (z - uFocus) / (uFocus * uFarK);
  return clamp(k, 0.0, 1.0) * uMax;
}
void main() {
  float r = coc(vUv);
  vec4 sum = vec4(0.0); float wsum = 0.0;
  for (int i = -8; i <= 8; i++) {
    float t = float(i) / 8.0;
    vec2 uv = vUv + uDir * uTexel * t * r;
    float rs = coc(uv);
    float w = exp(-t * t * 2.2) * (rs >= r * 0.5 || i == 0 ? 1.0 : 0.15);
    sum += texture2D(tColor, uv) * w; wsum += w;
  }
  gl_FragColor = sum / wsum;
}`;

const OUT = /* glsl, i18n-ok */ `
uniform sampler2D tColor; uniform sampler2D tGlow; uniform float uGlow; uniform float uVignette;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  vec3 g = texture2D(tGlow, vUv).rgb;
  c.rgb += max(g - 0.55, 0.0) * uGlow;
  // bordi scuri: più mistero ai lati e in basso, il centro (sentiero, Custode) resta acceso
  vec2 d = (vUv - vec2(0.5, 0.46)) * vec2(1.25, 0.95);
  c.rgb *= 1.0 - uVignette * smoothstep(0.18, 0.72, length(d));
  gl_FragColor = c;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Fotografa la scena con l'inquadratura data, a w×h pixel: restituisce un PNG (data URL). */
export function shoot(game: Game, shot: Shot, w = 1080, h = 2340): string {
  const g = game as unknown as {
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; clock: THREE.Clock;
    atmosphere: { sun: THREE.DirectionalLight; hemi?: THREE.HemisphereLight };
    actors: { avatar: { pos: THREE.Vector3; facing: number; rig: { root: THREE.Object3D } } };
    world: { scenery: THREE.Group };
  };
  const r = g.renderer;
  pose(game, shot);
  const av = g.actors.avatar;
  av.rig.root.position.set(av.pos.x, 0, av.pos.z);
  av.rig.root.rotation.y = av.facing;
  const t = g.clock.elapsedTime;
  for (const e of extras) e.update?.(t);
  const cam = new THREE.PerspectiveCamera(shot.fov, w / h, 0.3, 160);
  cam.position.set(...shot.cam);
  cam.lookAt(...shot.look);
  const mk = (depth = false) => {
    const tg = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
    if (depth) tg.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    return tg;
  };
  const rtScene = mk(true), rtA = mk(), rtB = mk(), rtG1 = mk(), rtG2 = mk();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blur = (dir: [number, number], max: number, focus = shot.focus) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BLUR, uniforms: {
    tColor: { value: null }, tDepth: { value: rtScene.depthTexture }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }, uDir: { value: new THREE.Vector2(...dir) },
    uMax: { value: max }, uFocus: { value: focus }, uNear: { value: cam.near }, uFar: { value: cam.far }, uNearK: { value: shot.nearK }, uFarK: { value: shot.farK } } });
  const out = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: OUT, uniforms: { tColor: { value: rtB.texture }, tGlow: { value: rtG2.texture }, uGlow: { value: 1.1 }, uVignette: { value: 0.72 } } });
  const pass = (m: THREE.Material, target: THREE.WebGLRenderTarget | null) => { quad.material = m; r.setRenderTarget(target); r.render(quad, qcam); };
  const prevSize = r.getSize(new THREE.Vector2()), prevPr = r.getPixelRatio();
  r.setPixelRatio(1);
  r.setSize(w, h, false);

  // luce della scena: cielo, nebbia, luna (o sole basso) in controluce, una luce calda sul Custode
  const atm = g.atmosphere;
  const fog = g.scene.fog as THREE.Fog;
  const saved = { bg: g.scene.background, fog: fog.color.clone(), near: fog.near, far: fog.far, sunC: atm.sun.color.clone(), sunI: atm.sun.intensity, sunP: atm.sun.position.clone() };
  const tex = sky(shot.light, 0.47);
  g.scene.background = tex;
  const sera = shot.light === 'sera';
  fog.color.set(sera ? '#262a45' : '#5e3f58'); fog.near = 16; fog.far = sera ? 56 : 66;
  atm.sun.color.set(sera ? '#9fb2e8' : '#ffb07a');
  atm.sun.intensity = sera ? 1.1 : Math.max(1.6, saved.sunI * 1.5);
  atm.sun.position.set(gate.x + (sera ? 14 : -22), sera ? 12 : 8, gate.z - 30);
  atm.sun.target.position.copy(gate);
  atm.sun.target.updateMatrixWorld();
  r.shadowMap.needsUpdate = true;
  const fill = new THREE.PointLight('#ffc890', 2.4, 4.5, 1.5);
  fill.position.set(shot.keeper[0] + 0.9, 1.5, shot.keeper[1] + 1.3);
  g.scene.add(fill);
  // fuori scena: i segnalini sopra le tombe (si disegnano sopra tutto) e il bosco tra la camera e il cancello
  const hidden: THREE.Object3D[] = [];
  g.scene.traverse((o) => { const m = (o as THREE.Sprite).material as THREE.SpriteMaterial | undefined; if ((o as THREE.Sprite).isSprite && o.visible && (m?.map?.image as { width?: number } | undefined)?.width === 96) hidden.push(o); });
  const sphere = new THREE.Sphere();
  for (const o of g.world.scenery.children) {
    const mesh = o as THREE.Mesh;
    if (!mesh.geometry?.boundingSphere) continue;
    sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(mesh.matrixWorld);
    if (sphere.center.z > gate.z + 1.2 && sphere.radius < 20) hidden.push(o);
  }
  for (const o of hidden) o.visible = false;
  r.setRenderTarget(rtScene);
  r.render(g.scene, cam);
  for (const o of hidden) o.visible = true;
  g.scene.remove(fill);
  g.scene.background = saved.bg;
  fog.color.copy(saved.fog); fog.near = saved.near; fog.far = saved.far;
  atm.sun.color.copy(saved.sunC); atm.sun.intensity = saved.sunI; atm.sun.position.copy(saved.sunP);
  tex.dispose();

  const px = shot.blur * (w / 1080); // il raggio è dato per l'immagine larga 1080
  const bh = blur([1, 0], px), bv = blur([0, 1], px);
  bh.uniforms.tColor.value = rtScene.texture; pass(bh, rtA);
  bv.uniforms.tColor.value = rtA.texture; pass(bv, rtB);
  // bagliore: una sfocatura larga e uniforme delle luci forti
  const gh = blur([1, 0], 46 * (w / 1080), -1000), gv = blur([0, 1], 46 * (w / 1080), -1000);
  gh.uniforms.tColor.value = rtB.texture; pass(gh, rtG1);
  gv.uniforms.tColor.value = rtG1.texture; pass(gv, rtG2);
  pass(out, null);
  const url = r.domElement.toDataURL('image/png');
  for (const tg of [rtScene, rtA, rtB, rtG1, rtG2]) tg.dispose();
  for (const m of [bh, bv, gh, gv, out]) m.dispose();
  quad.geometry.dispose();
  r.setPixelRatio(prevPr);
  r.setSize(prevSize.x, prevSize.y, false);
  return url;
}
