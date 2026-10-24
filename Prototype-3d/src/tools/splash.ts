// Strumento (non fa parte del gioco): compone e fotografa l'immagine di
// avvio con il motore del gioco. Prepara un cimitero di scena attorno al
// cancello (tombe fiorite, lanterne, presenze, fuochi fatui), mette il
// Custode davanti al cancello, accende il tramonto e scatta con una camera
// prospettica e una vera profondità di campo (sfocatura secondo la
// distanza dal punto a fuoco). Si usa dalla console di una pagina del gioco
// aperta su un profilo pulito (cambia il salvataggio):
//   const S = await import('/src/tools/splash.ts'); await S.stage(necro); S.shoot(necro, S.SHOTS.a)

import * as THREE from 'three';
import type { Game } from '../app/Game.ts';
import { areaForLevel } from '../game/world.ts';
import type { GraveType } from '../game/graves.ts';
import type { Grave, Placed } from '../game/state.ts';
import { HALF } from '../view/WorldView.ts';

/** Un'inquadratura: camera, punto guardato, apertura verticale, dove sta il Custode e quanto sfoca. */
export interface Shot {
  cam: [number, number, number];
  look: [number, number, number];
  fov: number;
  /** Custode: posizione (mondo) e verso cui guarda. */
  keeper: [number, number];
  faceTo: [number, number];
  /** Distanza a fuoco (mondo) e raggio massimo di sfocatura (pixel dell'immagine finale). */
  focus: number;
  blur: number;
}

// tutto è relativo al cancello (centro del varco sul lato sud del recinto)
let gate = new THREE.Vector3();

export const SHOTS: Record<string, Shot> = {};

const iso = () => new Date().toISOString();
let n = 0;
const place = (type: string, x: number, y: number, rot = 0, variant = 0): Placed => ({ id: `splash-${n++}`, type, x, y, rot, variant, lit: true, caredAt: iso(), dirty: false, broken: false, createdAt: iso() });

/** Il cimitero di scena attorno al cancello, il tramonto, niente interfaccia. */
export async function stage(game: Game) {
  const s = game.state;
  const a = areaForLevel(s.world.expansionLevel);
  const gx = a.x + Math.floor(a.w / 2) - 2; // prima cella del varco (come in WorldView)
  gate = new THREE.Vector3(gx + 2.5 - HALF, 0, a.y + a.h - HALF);
  const gy = a.y + a.h - 1; // ultima fila dentro il recinto
  const px = gx + 1; // il sentiero che parte dal cancello
  // via ciò che ingombra la scena davanti al cancello
  const busy = (p: Placed) => p.y >= gy - 14 && p.x >= px - 9 && p.x <= px + 10 && !p.type.startsWith('path') && p.type !== 'lamp_post_double';
  s.placeables = s.placeables.filter((p) => !busy(p));
  // tombe fiorite ai lati del sentiero
  const template = s.graves[0];
  const graves: Array<[GraveType, number, number]> = [
    ['gothic', px - 3, gy - 4], ['stone_simple', px - 6, gy - 4], ['celtic_cross', px - 3, gy - 8], ['angel', px - 6, gy - 8],
    ['victorian', px + 2, gy - 4], ['rectangular', px + 5, gy - 4], ['marble_cross', px + 2, gy - 8], ['obelisk', px + 5, gy - 8],
  ];
  for (const [graveType, x, y] of graves) s.graves.push({ ...(template as Grave), id: `splash-g${n++}`, seed: n * 7, graveType, x, y, hasFlowers: true, flowersAt: iso(), dirty: false, weeds: false, broken: false, muddy: false, legacy: false } as Grave);
  // l'albero dei ricordi in fondo, le presenze, lanterne e zucche
  s.placeables.push(
    place('memory_tree', px + 2, gy - 14),
    place('zombies_play', px - 7, gy - 11),
    place('ghosts_ball', px + 8, gy - 11),
    place('witch_corner', px + 8, gy - 4),
    place('skeleton_band', px - 11, gy - 8),
    place('pumpkin_patch', px - 9, gy - 3),
    place('cat_shelter', px + 5, gy - 1),
    place('glow_pumpkin', px - 1, gy - 1), place('skull_candle', px + 2, gy - 1),
    place('ghost_lantern', px - 2, gy - 6), place('lantern_stone', px + 3, gy - 6),
    place('lamp_post_gothic', px - 2, gy - 10), place('lamp_post_gothic', px + 2, gy - 10),
  );
  // fuori dal cancello: il sentiero che arriva, erba alta, lanterne e zucche ai lati
  for (let y = gy + 1; y <= gy + 9; y++) for (const x of [px, px + 1]) s.placeables.push(place('path_stone', x, y));
  s.placeables.push(
    place('lantern_stone', px - 1, gy + 2), place('lantern_stone', px + 2, gy + 2),
    place('glow_pumpkin', px - 2, gy + 4), place('tall_grass', px - 4, gy + 3), place('tall_grass', px + 3, gy + 5),
    place('bushes', px - 5, gy + 6), place('bushes', px + 4, gy + 2), place('poison_shrooms', px + 3, gy + 7),
  );
  for (let i = 0; i < 4; i++) s.entrusted.push({ grave: { ...(template as Grave), id: `splash-e${i}` } as Grave, entrustedAt: iso(), ghostVisits: 0 });
  // fuochi fatui sparsi sul prato
  s.world.looseWisps = [[px, gy - 3], [px - 4, gy - 6], [px + 4, gy - 2], [px + 1, gy - 9], [px - 8, gy - 1]].map(([x, y], i) => ({ id: `splash-w${i}`, x, y }));
  s.world.weather = 'clear';
  game.setTimeOverride('dusk');
  game.afterChange();
  // niente interfaccia sopra la scena
  const css = document.createElement('style');
  css.textContent = '#game > :not(canvas), .welcome-scrim, .tutorial { display: none !important; }'; // i18n-ok
  document.head.append(css);
  const g = gate;
  // il Custode un po' a sinistra del centro, la camera alle sue spalle (a destra): lo si vede di 3/4 di schiena
  const shot = (kx: number, kz: number, back: number, side: number, h: number, lookY: number, fov: number, blur: number): Shot => ({
    cam: [g.x + kx + side, h, g.z + kz + back], look: [g.x + kx + side * 0.35 - 0.15, lookY, g.z - 3], fov,
    keeper: [g.x + kx, g.z + kz], faceTo: [g.x + kx + 1.9, g.z + kz - 3], focus: Math.hypot(side, back), blur,
  });
  Object.assign(SHOTS, {
    // A: alle spalle del Custode; davanti il cancello e il sentiero, in fondo l'albero
    a: shot(-0.5, 4.7, 2.9, 0.62, 1.45, 1.65, 56, 11),
    // B: dal basso: il Custode grande contro il cielo del tramonto
    b: shot(-0.42, 4.5, 2.7, 0.5, 0.85, 2.1, 60, 13),
    // C: più alta e più indietro: si vede dentro il cimitero (presenze, tombe, albero)
    c: shot(-0.5, 5.2, 4.4, 0.8, 2.9, 0.9, 54, 9),
  } satisfies Record<string, Shot>);
}

// ── profondità di campo: sfocatura secondo la distanza dal fuoco ─────────

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'; // i18n-ok

const BLUR = /* glsl, i18n-ok */ `
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform vec2 uTexel; uniform vec2 uDir; uniform float uMax; uniform float uFocus; uniform float uNear; uniform float uFar;
varying vec2 vUv;
float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float coc(vec2 uv) {
  float z = lin(texture2D(tDepth, uv).x);
  // davanti al fuoco sfoca presto (primo piano), dietro più piano e fino al massimo
  float k = z < uFocus ? (uFocus - z) / (uFocus * 0.6) : (z - uFocus) / (uFocus * 4.5);
  return clamp(k, 0.0, 1.0) * uMax;
}
void main() {
  float r = coc(vUv);
  vec4 sum = vec4(0.0); float wsum = 0.0;
  for (int i = -8; i <= 8; i++) {
    float t = float(i) / 8.0;
    vec2 uv = vUv + uDir * uTexel * t * r;
    // un campione nitido (a fuoco) non si spalma sui vicini sfocati
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
  // bagliore: le luci forti (fuochi fatui, lanterne, finestre) si allargano un poco
  vec3 g = texture2D(tGlow, vUv).rgb;
  c.rgb += max(g - 0.75, 0.0) * uGlow;
  // vignettatura morbida verso gli angoli
  vec2 d = vUv - 0.5; c.rgb *= 1.0 - uVignette * smoothstep(0.25, 0.75, length(d * vec2(1.0, 0.75)));
  gl_FragColor = c;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Mette il Custode al suo posto (e la camera del gioco lo segue, così luci e ombre si centrano lì). */
export function pose(game: Game, shot: Shot) {
  const g = game as unknown as { actors: { avatar: { pos: THREE.Vector3; facing: number; path: THREE.Vector3[] } } };
  const av = g.actors.avatar;
  av.path = [];
  av.pos.set(shot.keeper[0], 0, shot.keeper[1]);
  av.facing = Math.atan2(shot.faceTo[0] - shot.keeper[0], shot.faceTo[1] - shot.keeper[1]);
}

/** Cielo del tramonto (sullo sfondo, a schermo): dall'arancio dell'orizzonte al viola, col bagliore del sole basso. */
function sunsetSky(w: number, h: number, horizon: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d')!;
  const lg = g.createLinearGradient(0, 0, 0, 512);
  lg.addColorStop(0, '#1d1830'); lg.addColorStop(horizon * 0.45, '#43305a'); lg.addColorStop(horizon * 0.8, '#a0506a'); lg.addColorStop(horizon, '#f08a52'); lg.addColorStop(1, '#ffb56b');
  g.fillStyle = lg; g.fillRect(0, 0, 256, 512);
  const sun = g.createRadialGradient(256 * 0.28, 512 * horizon, 0, 256 * 0.28, 512 * horizon, 200);
  sun.addColorStop(0, 'rgba(255, 226, 160, 0.95)'); sun.addColorStop(0.18, 'rgba(255, 170, 100, 0.6)'); sun.addColorStop(1, 'rgba(255, 140, 90, 0)');
  g.fillStyle = sun; g.fillRect(0, 0, 256, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  void w; void h;
  return tex;
}

/** Fotografa la scena con l'inquadratura data, a w×h pixel: restituisce un PNG (data URL). */
export function shoot(game: Game, shot: Shot, w = 1080, h = 2340): string {
  const g = game as unknown as { renderer: THREE.WebGLRenderer; scene: THREE.Scene; actors: { avatar: { pos: THREE.Vector3; facing: number; path: THREE.Vector3[] } } };
  const r = g.renderer;
  // il Custode al suo posto, fermo, rivolto verso il cancello
  pose(game, shot);
  const av = (g.actors as unknown as { avatar: { pos: THREE.Vector3; facing: number; rig: { root: THREE.Object3D } } }).avatar;
  av.rig.root.position.set(av.pos.x, 0, av.pos.z);
  av.rig.root.rotation.y = av.facing;
  // ciò che sta più vicino del Custode (alberi del bosco tra lui e la camera) resta fuori
  const near = Math.max(0.1, Math.hypot(shot.cam[0] - shot.keeper[0], shot.cam[2] - shot.keeper[1]) - 1.2);
  const cam = new THREE.PerspectiveCamera(shot.fov, w / h, near, 140);
  cam.position.set(...shot.cam);
  cam.lookAt(...shot.look);
  const mk = (type: THREE.TextureDataType, depth = false) => {
    const t = new THREE.WebGLRenderTarget(w, h, { type, samples: depth ? 0 : 0 });
    if (depth) t.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    return t;
  };
  const rtScene = mk(THREE.HalfFloatType, true), rtA = mk(THREE.HalfFloatType), rtB = mk(THREE.HalfFloatType), rtG1 = mk(THREE.HalfFloatType), rtG2 = mk(THREE.HalfFloatType);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blur = (dir: [number, number], max: number) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BLUR, uniforms: {
    tColor: { value: null }, tDepth: { value: rtScene.depthTexture }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }, uDir: { value: new THREE.Vector2(...dir) },
    uMax: { value: max }, uFocus: { value: shot.focus }, uNear: { value: cam.near }, uFar: { value: cam.far } } });
  const out = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: OUT, uniforms: { tColor: { value: rtB.texture }, tGlow: { value: rtG2.texture }, uGlow: { value: 0.9 }, uVignette: { value: 0.35 } } });
  const pass = (m: THREE.Material, target: THREE.WebGLRenderTarget | null) => { quad.material = m; r.setRenderTarget(target); r.render(quad, qcam); };
  const prevSize = r.getSize(new THREE.Vector2()), prevPr = r.getPixelRatio();
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  // il tramonto: cielo caldo, foschia lontana, sole basso alle spalle del cimitero (controluce)
  const atm = (game as unknown as { atmosphere: { sun: THREE.DirectionalLight } }).atmosphere;
  const fog = g.scene.fog as THREE.Fog;
  const saved = { bg: g.scene.background, fog: fog.color.clone(), near: fog.near, far: fog.far, sunC: atm.sun.color.clone(), sunI: atm.sun.intensity, sunP: atm.sun.position.clone() };
  const sky = sunsetSky(w, h, 0.58);
  g.scene.background = sky;
  fog.color.set('#5e3f58'); fog.near = 16; fog.far = 70;
  atm.sun.color.set('#ffb07a');
  atm.sun.intensity = Math.max(1.6, saved.sunI * 1.5);
  atm.sun.position.set(gate.x - 22, 8, gate.z - 34);
  atm.sun.target.position.copy(gate);
  atm.sun.target.updateMatrixWorld();
  r.shadowMap.needsUpdate = true;
  // una luce calda di riempimento dal davanti: in controluce il Custode resterebbe una sagoma
  const fill = new THREE.PointLight('#ffc890', 3.2, 5, 1.5);
  fill.position.set(shot.keeper[0] + 1.1, 1.6, shot.keeper[1] + 1.4);
  g.scene.add(fill);
  // i segnalini sopra le tombe (da pulire, rotte) si disegnano sopra tutto: nello scatto no
  const badges: THREE.Object3D[] = [];
  g.scene.traverse((o) => { const m = (o as THREE.Sprite).material as THREE.SpriteMaterial | undefined; if ((o as THREE.Sprite).isSprite && o.visible && (m?.map?.image as { width?: number } | undefined)?.width === 96) badges.push(o); });
  for (const b of badges) b.visible = false;
  r.setRenderTarget(rtScene);
  r.render(g.scene, cam);
  for (const b of badges) b.visible = true;
  g.scene.remove(fill);
  g.scene.background = saved.bg;
  fog.color.copy(saved.fog); fog.near = saved.near; fog.far = saved.far;
  atm.sun.color.copy(saved.sunC); atm.sun.intensity = saved.sunI; atm.sun.position.copy(saved.sunP);
  sky.dispose();
  const px = shot.blur * (w / 1080); // il raggio è dato per l'immagine larga 1080
  const bh = blur([1, 0], px), bv = blur([0, 1], px);
  bh.uniforms.tColor.value = rtScene.texture; pass(bh, rtA);
  bv.uniforms.tColor.value = rtA.texture; pass(bv, rtB);
  // bagliore: una sfocatura larga e uniforme (fuoco lontanissimo: tutto al massimo)
  const gh = blur([1, 0], 40 * (w / 1080)), gv = blur([0, 1], 40 * (w / 1080));
  for (const m of [gh, gv]) { m.uniforms.uFocus.value = -1000; }
  gh.uniforms.tColor.value = rtB.texture; pass(gh, rtG1);
  gv.uniforms.tColor.value = rtG1.texture; pass(gv, rtG2);
  pass(out, null);
  const url = r.domElement.toDataURL('image/png');
  for (const t of [rtScene, rtA, rtB, rtG1, rtG2]) t.dispose();
  r.setPixelRatio(prevPr);
  r.setSize(prevSize.x, prevSize.y, false);
  return url;
}
