// Nebbia del bosco (prototipo, attivabile con ?mist=layers|puffs): solo
// fuori dal recinto, in movimento lento col vento, tinta col colore della
// nebbia della fase del giorno (più chiara e fredda di notte).
//  • layers: tre veli sovrapposti che seguono il terreno, con rumore fbm che
//    scorre nel fragment shader; la maschera parte dal recinto e si addensa
//    verso il bosco (qualche filo entra appena oltre le inferriate).
//  • puffs: batuffoli morbidi (sprite) che vagano tra gli alberi e si
//    ricompongono quando escono dalla fascia.

import * as THREE from 'three';
import type { Rect } from '../game/world.ts';

export type MistMode = 'layers' | 'puffs';

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec4 uRect;   // centro x, centro z, mezza larghezza, mezza profondità
uniform float uOpacity;
uniform float uLayer;
varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}
void main() {
  vec2 p = vWorld.xz;
  float d = max(abs(p.x - uRect.x) - uRect.z, abs(p.y - uRect.y) - uRect.w);
  // si addensa nel bosco; qualche filo sottile scavalca appena le inferriate
  float mask = smoothstep(-2.5, 4.0, d) * (0.55 + 0.45 * smoothstep(0.0, 3.0, d));
  vec2 wind = vec2(0.3, 0.1) * uTime * (0.8 + uLayer * 0.35);
  // rumore deformato: veli sfilacciati allungati nel verso del vento
  vec2 q = p * vec2(0.09, 0.2) + wind * vec2(0.35, 0.8) + uLayer * 5.7;
  vec2 warp = vec2(fbm(q + 1.7), fbm(q + 8.3));
  float n = fbm(q + warp * 1.6 + wind * 0.25);
  float a = smoothstep(0.42, 0.78, n) * mask * uOpacity;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Texture di un batuffolo: più cerchi sfumati sovrapposti (bordo grumoso). */
function puffTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const blobs: Array<[number, number, number]> = [[64, 72, 44], [40, 70, 30], [88, 68, 32], [56, 50, 30], [78, 52, 26], [64, 86, 30]];
  for (const [x, y, r] of blobs) {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.4)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class ForestMist {
  readonly group = new THREE.Group();
  private readonly mode: MistMode;
  private readonly mats: THREE.ShaderMaterial[] = [];
  private puffs: Array<{ s: THREE.Sprite; x: number; z: number; ph: number; size: number }> = [];
  private puffMat: THREE.SpriteMaterial | null = null;
  private rect = new THREE.Vector4();
  private bound = 40;
  private height: (x: number, z: number) => number = () => 0;
  private readonly color = new THREE.Color();
  private readonly night = new THREE.Color('#5d7396');

  constructor(scene: THREE.Scene, mode: MistMode) {
    this.mode = mode;
    this.group.name = 'nebbia-bosco';
    this.group.renderOrder = 4;
    scene.add(this.group);
  }

  /**
   * Ricostruisce la nebbia attorno al recinto (area in celle, mondo centrato
   * su `half`), fino a `bound` unità dal centro, seguendo le quote del suolo.
   */
  setWorld(area: Rect, half: number, bound: number, heightAt: (x: number, z: number) => number) {
    this.height = heightAt;
    this.bound = bound;
    const cx = area.x + area.w / 2 - half, cz = area.y + area.h / 2 - half;
    this.rect.set(cx, cz, area.w / 2, area.h / 2);
    for (const c of [...this.group.children]) { this.group.remove(c); if (c instanceof THREE.Mesh) c.geometry.dispose(); }
    this.mats.length = 0;
    this.puffs = [];
    if (this.mode === 'layers') this.buildLayers();
    else this.buildPuffs();
  }

  private buildLayers() {
    const [cx, cz, hw, hh] = this.rect.toArray();
    const step = 1, b = this.bound;
    for (let layer = 0; layer < 3; layer++) {
      const lift = 0.12 + layer * 0.28;
      const pos: number[] = [];
      const pushV = (x: number, z: number) => pos.push(x, this.height(x, z) + lift, z);
      // solo i quadrati fuori (o appena dentro) il recinto: niente sovrapposizioni inutili
      for (let z = -b; z < b; z += step) for (let x = -b; x < b; x += step) {
        const mx = x + step / 2, mz = z + step / 2;
        if (Math.max(Math.abs(mx - cx) - hw, Math.abs(mz - cz) - hh) < -3) continue;
        pushV(x, z); pushV(x, z + step); pushV(x + step, z);
        pushV(x + step, z); pushV(x, z + step); pushV(x + step, z + step);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uRect: { value: this.rect }, uOpacity: { value: 0.42 - layer * 0.09 }, uLayer: { value: layer } },
      });
      this.mats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 4 + layer;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  private buildPuffs() {
    this.puffMat ??= new THREE.SpriteMaterial({ map: puffTexture(), transparent: true, depthWrite: false, opacity: 0.75 });
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const [cx, cz, hw, hh] = this.rect.toArray();
    for (let i = 0; i < 130; i++) {
      // punto a caso nella fascia tra il recinto e il bordo del mondo
      let x = 0, z = 0;
      // nella fascia di bosco vicina al recinto (quella che la camera inquadra)
      for (let k = 0; k < 40; k++) {
        x = (rnd() * 2 - 1) * (hw + 9) + cx; z = (rnd() * 2 - 1) * (hh + 9) + cz;
        const d = Math.max(Math.abs(x - cx) - hw, Math.abs(z - cz) - hh);
        if (d > 0.3 && d < 8) break;
      }
      const s = new THREE.Sprite(this.puffMat);
      const size = 2.6 + rnd() * 3.2;
      s.scale.set(size, size * 0.55, 1);
      s.renderOrder = 4;
      this.group.add(s);
      this.puffs.push({ s, x, z, ph: rnd() * 6.28, size });
    }
  }

  /** Colore dalla nebbia della scena (più chiaro, e freddo di notte) e movimento. */
  update(t: number, fogColor: THREE.Color, nightAmount: number) {
    this.color.copy(fogColor).lerp(this.night, 0.35 + nightAmount * 0.3).offsetHSL(0, -0.04, 0.05 - nightAmount * 0.03);
    const k = 1 - nightAmount * 0.3;
    this.mats.forEach((m, i) => { m.uniforms.uOpacity.value = (0.42 - i * 0.09) * k; });
    for (const m of this.mats) { m.uniforms.uTime.value = t; (m.uniforms.uColor.value as THREE.Color).copy(this.color); }
    if (this.puffMat) { this.puffMat.color.copy(this.color); this.puffMat.opacity = 0.42 * k; }
    const [cx, cz, hw, hh] = this.rect.toArray();
    for (const p of this.puffs) {
      // deriva col vento, avvolgendo sul bordo del mondo; dentro il recinto svaniscono
      const span = hw + 9;
      let x = ((p.x - cx + t * 0.3 + span) % (2 * span) + 2 * span) % (2 * span) - span + cx;
      const z = p.z + Math.sin(t * 0.2 + p.ph) * 0.8;
      x += Math.sin(t * 0.3 + p.ph) * 0.4;
      const d = Math.max(Math.abs(x - cx) - hw, Math.abs(z - cz) - hh);
      const fade = THREE.MathUtils.smoothstep(d, -0.5, 2.5);
      p.s.position.set(x, this.height(x, z) + 0.35 + Math.sin(t * 0.5 + p.ph) * 0.08, z);
      const k = (0.85 + Math.sin(t * 0.4 + p.ph) * 0.15) * Math.max(0.05, fade);
      p.s.scale.set(p.size * k, p.size * 0.55 * k, 1);
      p.s.visible = fade > 0.02;
    }
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const c of this.group.children) if (c instanceof THREE.Mesh) c.geometry.dispose();
    for (const m of this.mats) m.dispose();
    this.puffMat?.map?.dispose();
    this.puffMat?.dispose();
  }
}
