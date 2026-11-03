// Luci finte per i telefoni (qualità Media e Bassa): la «mappa di luce».
//
// Al posto delle luci vere, ogni sorgente accesa si dipinge vista dall'alto in
// una piccola texture (una pozza morbida col colore della fiamma) attorno al
// punto osservato. I materiali leggeri la leggono alla loro posizione nel mondo
// e aggiungono quella luce al colore: così si accendono il terreno, ma anche le
// pareti, le porte, i mezzi e i personaggi vicini (prima la pozza era solo a
// terra e le case restavano al buio).
//
// - verso: il gradiente della mappa dice da che parte sta la fonte; le facce
//   rivolte verso di lei prendono più luce, quelle girate meno;
// - altezza: l'alfa porta la quota del suolo sotto la fonte, così la luce cala
//   salendo (una lanterna sulla porta non accende la cima del tetto);
// - costo: un disegno di qualche quadrato in 256×256 per fotogramma e tre letture
//   di texture per pixel (solo dove c'è luce), niente luci nello shader; la mappa
//   si ridisegna al più 24 volte al secondo (basta per il tremolio della fiamma).
//   Al posto delle pozze di prima, disegnate sopra lo schermo intero a ogni
//   fotogramma, costa anche meno in riempimento.

import * as THREE from 'three';

const SIZE = 256;
/** Quote del suolo codificate nell'alfa (da, intervallo). */
const H0 = -2, HR = 8;
/** Quanto pesa la mappa sul colore (la texture tiene la luce a metà, per non saturare gli 8 bit). */
const GAIN = 3.2;

export const LIGHT_MAP_UNIFORMS = {
  uLightMap: { value: null as THREE.Texture | null },
  /** x0, z0 dell'angolo, 1/lato, intensità (0: spenta). */
  uLightRect: { value: new THREE.Vector4(0, 0, 1, 0) },
  uLightTexel: { value: 1 / SIZE },
};

/** Aggiunge la lettura della mappa di luce a un materiale Lambert (o Standard). */
export function withLightMap<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, LIGHT_MAP_UNIFORMS);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLmWorld;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
  vec4 lmW = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    lmW = batchingMatrix * lmW;
  #endif
  #ifdef USE_INSTANCING
    lmW = instanceMatrix * lmW;
  #endif
  vLmWorld = (modelMatrix * lmW).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uLightMap;
uniform vec4 uLightRect;
uniform float uLightTexel;
varying vec3 vLmWorld;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  if (uLightRect.w > 0.001) {
    vec2 lmUv = (vLmWorld.xz - uLightRect.xy) * uLightRect.z;
    if (lmUv.x > 0.0 && lmUv.y > 0.0 && lmUv.x < 1.0 && lmUv.y < 1.0) {
      vec4 lm = texture2D(uLightMap, lmUv);
      if (lm.r + lm.g + lm.b > 0.002) {
        // verso della fonte: differenze in avanti (due letture in più, non quattro)
        float e = uLightTexel * 3.0;
        vec3 w3 = vec3(0.3333);
        float l0 = dot(lm.rgb, w3);
        vec2 grad = vec2(dot(texture2D(uLightMap, lmUv + vec2(e, 0.0)).rgb, w3) - l0, dot(texture2D(uLightMap, lmUv + vec2(0.0, e)).rgb, w3) - l0);
        vec3 nW = inverseTransformDirection(normal, viewMatrix);
        float gl = length(grad);
        // pareti: piena luce se guardano la fonte, un po' se sono di taglio, poca se girate
        float side = gl > 1e-4 ? clamp(dot(nW.xz, grad / gl) * 0.7 + 0.42, 0.12, 1.0) : 0.7;
        float facing = max(nW.y, 0.0) + (1.0 - abs(nW.y)) * side + max(-nW.y, 0.0) * 0.15;
        float rise = vLmWorld.y - (lm.a * ${HR.toFixed(1)} + ${H0.toFixed(1)});
        float fall = 1.0 - smoothstep(0.5, 2.3, rise);
        reflectedLight.directDiffuse += diffuseColor.rgb * lm.rgb * (uLightRect.w * ${GAIN.toFixed(1)}) * facing * fall;
        // un velo caldo sulle superfici in piano (il terreno scuro, da solo, la luce quasi non la mostra)
        reflectedLight.directDiffuse += lm.rgb * (uLightRect.w * 0.2) * max(nW.y, 0.0) * fall;
      }
    }
  }`);
  };
  return m;
}

const PAINT_VS = ` // i18n-ok: shader
attribute float aGround;
varying vec2 vUv;
varying vec3 vCol;
varying float vG;
void main() {
  vUv = uv;
  vCol = instanceColor;
  vG = aGround;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const PAINT_FS = ` // i18n-ok: shader
varying vec2 vUv;
varying vec3 vCol;
varying float vG;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  if (d >= 1.0) discard;
  // pozza: piena al centro, cala in fretta (come una luce vera) e sfuma a zero sul bordo
  float a = (1.0 - d) * (1.0 - d);
  gl_FragColor = vec4(vCol * a * 0.5, vG);
}`;

/** Le sorgenti dipinte dall'alto nella mappa di luce. */
export class LightMapPainter {
  private readonly target = new THREE.WebGLRenderTarget(SIZE, SIZE, { depthBuffer: false, stencilBuffer: false, type: THREE.UnsignedByteType, format: THREE.RGBAFormat, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(1, -1, 1, -1, 1, 400);
  private readonly mesh: THREE.InstancedMesh;
  private readonly ground: THREE.InstancedBufferAttribute;
  private readonly clear = new THREE.Color();
  private readonly mat4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private count = 0;

  constructor(max = 512) {
    const geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
    this.ground = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    geo.setAttribute('aGround', this.ground);
    const mat = new THREE.ShaderMaterial({
      vertexShader: PAINT_VS, fragmentShader: PAINT_FS, side: THREE.DoubleSide, depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.MaxEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, new THREE.Color(0, 0, 0));
    this.scene.add(this.mesh);
    // vista dall'alto con +x a destra e +z in alto: u segue x, v segue z
    this.camera.up.set(0, 0, 1);
    LIGHT_MAP_UNIFORMS.uLightMap.value = this.target.texture;
  }

  begin() { this.count = 0; }

  /** Una sorgente: centro a terra, raggio, colore (lineare, già pesato) e quota del suolo. */
  add(x: number, groundY: number, z: number, radius: number, color: THREE.Color) {
    const i = this.count;
    if (i >= this.mesh.instanceMatrix.count) return;
    this.mesh.setMatrixAt(i, this.mat4.compose(this.p.set(x, 0, z), this.q, this.sc.set(radius, 1, radius)));
    this.mesh.setColorAt(i, color);
    this.ground.setX(i, THREE.MathUtils.clamp((groundY - H0) / HR, 1 / 255, 1));
    this.count++;
  }

  /** Disegna la mappa attorno al centro (lato in unità mondo) con l'intensità della fase. */
  render(renderer: THREE.WebGLRenderer, cx: number, cz: number, side: number, strength: number) {
    const u = LIGHT_MAP_UNIFORMS;
    u.uLightRect.value.w = this.count > 0 ? strength : 0;
    if (u.uLightRect.value.w <= 0.001) return;
    // agganciata ai texel: la mappa non tremola quando la camera scivola
    const texel = side / SIZE;
    const x = Math.round(cx / texel) * texel, z = Math.round(cz / texel) * texel, h = side / 2;
    const c = this.camera;
    c.left = h; c.right = -h; c.top = h; c.bottom = -h; // guardando giù con l'alto su +z, +x verrebbe a sinistra: si ribalta
    c.position.set(x, 200, z); c.lookAt(x, 0, z); c.updateProjectionMatrix();
    c.updateMatrixWorld();
    u.uLightRect.value.set(x - h, z - h, 1 / side, u.uLightRect.value.w);
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.ground.needsUpdate = true;
    const prevTarget = renderer.getRenderTarget(), prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clear);
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this.scene, c);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(this.clear, prevAlpha);
  }

  /** Spenta (giorno, o luci vere). */
  off() { LIGHT_MAP_UNIFORMS.uLightRect.value.w = 0; }

  dispose() {
    this.off();
    this.target.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    if (LIGHT_MAP_UNIFORMS.uLightMap.value === this.target.texture) LIGHT_MAP_UNIFORMS.uLightMap.value = null;
  }
}
