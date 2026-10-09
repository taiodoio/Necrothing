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
varying vec2 vUv;

float blurAmount(vec2 uv) {
  vec2 d = abs(uv - uFocus);
  float vy = smoothstep(uBand.y, uBand.y + 0.32, d.y);
  float vx = smoothstep(uBand.x, uBand.x + 0.25, d.x) * 0.55;
  return clamp(max(vy, vx), 0.0, 1.0);
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

export class PostFX {
  enabled = false;
  private rtScene: THREE.WebGLRenderTarget;
  private rtBlur: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private passH: THREE.ShaderMaterial;
  private passV: THREE.ShaderMaterial;
  private maxBlur = 4;
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
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: output,
    });
    this.passH = make([1, 0], false);
    this.passV = make([0, 1], true);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.passH);
    this.quad.frustumCulled = false;
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
    if (this.enabled) {
      this.rtScene.setSize(w, h);
      this.rtBlur.setSize(w, h);
    } else {
      this.rtScene.setSize(1, 1);
      this.rtBlur.setSize(1, 1);
    }
    const pr = this.renderer.getPixelRatio();
    for (const m of [this.passH, this.passV]) {
      m.uniforms.uTexel.value.set(1 / w, 1 / h);
      m.uniforms.uMaxBlur.value = this.maxBlur * pr;
      // su schermi stretti (telefono in verticale) la fascia nitida è più alta
      m.uniforms.uBand.value.set(0.32, w < h ? 0.16 : 0.2);
    }
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    const r = this.renderer;
    if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);
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
  }
}
