// Sfocatura "tilt-shift" ai bordi: effetto diorama/miniatura. La fascia
// centrale (dove c'è il Custode) resta nitida, il resto si sfoca
// progressivamente verso l'alto e il basso (e un po' ai lati).
// Due passate separabili a raggio variabile su render target lineari; la
// seconda applica anche tone mapping e conversione sRGB (come OutputPass).
// Su qualità bassa è spenta e si renderizza direttamente a schermo.

import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;     // 1/risoluzione
uniform vec2 uDir;       // (1,0) orizzontale, (0,1) verticale
uniform float uMaxBlur;  // raggio massimo in pixel
uniform vec2 uFocus;     // centro nitido (uv)
uniform vec2 uBand;      // semi-ampiezze nitide (x,y) in uv
uniform float uOutput;   // 1 = ultima passata (tone mapping + sRGB)
uniform float uRound;    // 1 = i due assi si uniscono morbidi (angoli tondi), 0 = max (come prima)
varying vec2 vUv;

float blurAmount(vec2 uv) {
  vec2 d = abs(uv - uFocus);
  float vy = smoothstep(uBand.y, uBand.y + 0.32, d.y);
  float vx = smoothstep(uBand.x, uBand.x + 0.25, d.x) * 0.55;
  return clamp(mix(max(vy, vx), 1.0 - (1.0 - vy) * (1.0 - vx), uRound), 0.0, 1.0);
}

void main() {
  float r = blurAmount(vUv) * uMaxBlur;
  vec4 c;
  if (r < 0.35) {
    c = texture2D(tDiffuse, vUv);
  } else {
    // gaussiana a 9 campioni con passo proporzionale al raggio
    vec2 stepUv = uDir * uTexel * (r / 4.0);
    c  = texture2D(tDiffuse, vUv) * 0.2270;
    c += texture2D(tDiffuse, vUv + stepUv * 1.0) * 0.1945;
    c += texture2D(tDiffuse, vUv - stepUv * 1.0) * 0.1945;
    c += texture2D(tDiffuse, vUv + stepUv * 2.0) * 0.1216;
    c += texture2D(tDiffuse, vUv - stepUv * 2.0) * 0.1216;
    c += texture2D(tDiffuse, vUv + stepUv * 3.0) * 0.0540;
    c += texture2D(tDiffuse, vUv - stepUv * 3.0) * 0.0540;
    c += texture2D(tDiffuse, vUv + stepUv * 4.0) * 0.0162;
    c += texture2D(tDiffuse, vUv - stepUv * 4.0) * 0.0162;
  }
  gl_FragColor = c;
  if (uOutput > 0.5) {
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
}
`;

/**
 * Mezza risoluzione (quella del gioco, in Media e Alta): la sfocatura si calcola su un quarto
 * dei pixel e quest'ultima passata la mescola con la scena nitida a piena
 * risoluzione, con la stessa maschera (morbida): al centro tutto nitido, ai
 * bordi tutto sfocato, nel mezzo una sfumatura senza anelli.
 */
const COMPOSITE = /* glsl */ `
uniform sampler2D tSharp;
uniform sampler2D tBlur;
uniform vec2 uFocus;
uniform vec2 uBand;
varying vec2 vUv;

float blurAmount(vec2 uv) {
  vec2 d = abs(uv - uFocus);
  float vy = smoothstep(uBand.y, uBand.y + 0.32, d.y);
  float vx = smoothstep(uBand.x, uBand.x + 0.25, d.x) * 0.55;
  return clamp(1.0 - (1.0 - vy) * (1.0 - vx), 0.0, 1.0);
}

void main() {
  float k = smoothstep(0.0, 0.45, blurAmount(vUv));
  vec4 c = k < 0.002 ? texture2D(tSharp, vUv) : mix(texture2D(tSharp, vUv), texture2D(tBlur, vUv), k);
  gl_FragColor = c;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class PostFX {
  enabled = false;
  private rtScene: THREE.WebGLRenderTarget;
  private rtBlur: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private passH: THREE.ShaderMaterial;
  private passV: THREE.ShaderMaterial;
  private maxBlur = 4;
  // mezza risoluzione: due target piccoli per le passate e la composizione finale
  private halfRes = true;
  private rtHalfA: THREE.WebGLRenderTarget;
  private rtHalfB: THREE.WebGLRenderTarget;
  private passHHalf: THREE.ShaderMaterial;
  private passVHalf: THREE.ShaderMaterial;
  private composite: THREE.ShaderMaterial;
  /** Dove sta il soggetto (uv dello schermo). */
  readonly focus = new THREE.Vector2(0.5, 0.5);

  constructor(private renderer: THREE.WebGLRenderer) {
    const opts = { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 } as const;
    this.rtScene = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtBlur = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    const make = (dir: [number, number], output: boolean) => new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uDir: { value: new THREE.Vector2(...dir) },
        uMaxBlur: { value: 4 },
        uFocus: { value: this.focus },
        uBand: { value: new THREE.Vector2(0.3, 0.17) },
        uOutput: { value: output ? 1 : 0 },
        uRound: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: output,
    });
    this.passH = make([1, 0], false);
    this.passV = make([0, 1], true);
    // a mezza risoluzione le due passate restano lineari (la tonalità la fa la composizione)
    this.passHHalf = make([1, 0], false);
    this.passVHalf = make([0, 1], false);
    for (const m of [this.passHHalf, this.passVHalf]) m.uniforms.uRound.value = 1;
    const half = { type: THREE.HalfFloatType, depthBuffer: false } as const;
    this.rtHalfA = new THREE.WebGLRenderTarget(1, 1, half);
    this.rtHalfB = new THREE.WebGLRenderTarget(1, 1, half);
    this.composite = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COMPOSITE,
      uniforms: { tSharp: { value: null }, tBlur: { value: null }, uFocus: { value: this.focus }, uBand: { value: new THREE.Vector2(0.3, 0.17) } },
      depthTest: false, depthWrite: false, toneMapped: true,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.passH);
    this.quad.frustumCulled = false;
  }

  /** Campioni MSAA della scena sotto la sfocatura (qualità Auto: meno sui dispositivi deboli). */
  setSamples(n: number) {
    if (this.rtScene.samples === n) return;
    this.rtScene.samples = n;
    this.rtScene.dispose(); // si rialloca al prossimo uso con i nuovi campioni
  }

  /** Sfocatura a mezza risoluzione (nel gioco sempre; il bench può tornare a quella piena per confronto). */
  get half() { return this.halfRes; }
  setHalfRes(on: boolean) {
    if (on === this.halfRes) return;
    this.halfRes = on;
    this.setSize();
  }

  /** Raggio massimo in pixel CSS (moltiplicato per il pixel ratio). */
  configure(enabled: boolean, maxBlurCss: number) {
    this.enabled = enabled;
    this.maxBlur = maxBlurCss;
    this.setSize();
  }

  setSize() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    const hw = Math.max(1, Math.round(w / 2)), hh = Math.max(1, Math.round(h / 2));
    this.rtScene.setSize(this.enabled ? w : 1, this.enabled ? h : 1);
    this.rtBlur.setSize(this.enabled && !this.halfRes ? w : 1, this.enabled && !this.halfRes ? h : 1);
    this.rtHalfA.setSize(this.enabled && this.halfRes ? hw : 1, this.enabled && this.halfRes ? hh : 1);
    this.rtHalfB.setSize(this.enabled && this.halfRes ? hw : 1, this.enabled && this.halfRes ? hh : 1);
    const pr = this.renderer.getPixelRatio();
    for (const m of [this.passH, this.passV]) {
      m.uniforms.uTexel.value.set(1 / w, 1 / h);
      m.uniforms.uMaxBlur.value = this.maxBlur * pr;
      // su schermi stretti (telefono in verticale) la fascia nitida è più alta
      m.uniforms.uBand.value.set(0.32, w < h ? 0.16 : 0.2);
    }
    // a mezza risoluzione un pixel vale due: stesso raggio sullo schermo
    for (const m of [this.passHHalf, this.passVHalf]) {
      m.uniforms.uTexel.value.set(1 / hw, 1 / hh);
      m.uniforms.uMaxBlur.value = (this.maxBlur * pr) / 2;
      m.uniforms.uBand.value.set(0.32, w < h ? 0.16 : 0.2);
    }
    this.composite.uniforms.uBand.value.set(0.32, w < h ? 0.16 : 0.2);
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    const r = this.renderer;
    if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);
    if (this.halfRes) {
      // scena → metà (orizzontale) → metà (verticale) → composizione con la nitida a schermo
      this.passHHalf.uniforms.tDiffuse.value = this.rtScene.texture;
      this.quad.material = this.passHHalf;
      r.setRenderTarget(this.rtHalfA);
      r.render(this.quad, this.camera);
      this.passVHalf.uniforms.tDiffuse.value = this.rtHalfA.texture;
      this.quad.material = this.passVHalf;
      r.setRenderTarget(this.rtHalfB);
      r.render(this.quad, this.camera);
      this.composite.uniforms.tSharp.value = this.rtScene.texture;
      this.composite.uniforms.tBlur.value = this.rtHalfB.texture;
      this.quad.material = this.composite;
      r.setRenderTarget(null);
      r.render(this.quad, this.camera);
      return;
    }
    this.passH.uniforms.tDiffuse.value = this.rtScene.texture;
    this.quad.material = this.passH;
    r.setRenderTarget(this.rtBlur);
    r.render(this.quad, this.camera);
    this.passV.uniforms.tDiffuse.value = this.rtBlur.texture;
    this.quad.material = this.passV;
    r.setRenderTarget(null);
    r.render(this.quad, this.camera);
  }

  dispose() {
    this.rtScene.dispose();
    this.rtBlur.dispose();
    this.passH.dispose();
    this.passV.dispose();
    this.rtHalfA.dispose();
    this.rtHalfB.dispose();
    this.passHHalf.dispose();
    this.passVHalf.dispose();
    this.composite.dispose();
  }
}
