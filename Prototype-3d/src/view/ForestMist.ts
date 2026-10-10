// Nebbia del bosco: veli sovrapposti che seguono il terreno fuori dal
// recinto, con filamenti che scorrono col vento (rumore fbm deformato nel
// fragment shader). La densità dipende da fase del giorno e meteo e cambia
// con dolcezza; il colore viene dalla nebbia della scena (grigio di giorno,
// grigio-viola al tramonto, blu freddo di notte). Con il meteo "nebbia" i
// veli scavalcano le inferriate ed entrano un po' nel cimitero.

import * as THREE from 'three';
import type { Quality, Weather } from '../game/state.ts';
import type { DayPhase } from '../game/time.ts';
import type { Rect } from '../game/world.ts';

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
uniform float uCreep; // quanto la nebbia entra nel recinto (unità mondo)
uniform float uWind;
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
  // si addensa nel bosco; qualche filo sottile scavalca le inferriate
  float mask = smoothstep(-2.5 - uCreep, 4.0, d) * (0.55 + 0.45 * smoothstep(-uCreep, 3.0, d));
  vec2 wind = vec2(0.3, 0.1) * uWind * (0.8 + uLayer * 0.35);
  // rumore deformato: veli sfilacciati allungati nel verso del vento
  vec2 q = p * vec2(0.09, 0.2) + wind * vec2(0.35, 0.8) + uLayer * 5.7;
  vec2 warp = vec2(fbm(q + 1.7), fbm(q + 8.3));
  float n = fbm(q + warp * 1.6 + wind * 0.25);
  float a = smoothstep(0.42, 0.78, n) * mask * uOpacity;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Densità di base per fase del giorno (alba e notte le più nebbiose). */
const PHASE_DENSITY: Record<DayPhase, number> = { dawn: 0.95, day: 0.45, dusk: 0.8, night: 1 };
/** Moltiplicatore del meteo, rientro nel recinto e velocità del vento. */
const WEATHER: Record<Weather, { k: number; creep: number; wind: number }> = {
  clear: { k: 1, creep: 0, wind: 1 },
  fog: { k: 1.45, creep: 5, wind: 0.7 },
  rain: { k: 0.75, creep: 0, wind: 1.4 },
  storm: { k: 0.6, creep: 0, wind: 2.2 },
};

/** Quanta nebbia (0..~1,45) per una fase e un meteo: utile anche ai test. */
export function mistTarget(phase: DayPhase, weather: Weather): { density: number; creep: number; wind: number } {
  const w = WEATHER[weather];
  return { density: PHASE_DENSITY[phase] * w.k, creep: w.creep, wind: w.wind };
}

/** Veli per qualità grafica (ogni velo è uno strato trasparente in più). */
export function mistLayers(q: Quality): number {
  return q === 'low' ? 1 : q === 'medium' ? 2 : 3;
}

export class ForestMist {
  readonly group = new THREE.Group();
  private readonly mats: THREE.ShaderMaterial[] = [];
  private readonly rect = new THREE.Vector4();
  private readonly color = new THREE.Color();
  private readonly night = new THREE.Color('#5d7396');
  private layers: number;
  private world: { area: Rect; half: number; bound: number; heightAt: (x: number, z: number) => number } | null = null;
  // stato attuale e obiettivo (la nebbia cambia lentamente)
  private density = 0;
  private creep = 0;
  private windSpeed = 1;
  private windPos = 0;
  private nightAmount = 0;
  private target = mistTarget('day', 'clear');
  private targetNight = 0;

  constructor(scene: THREE.Scene, quality: Quality) {
    this.layers = mistLayers(quality);
    this.group.name = 'nebbia-bosco';
    scene.add(this.group);
  }

  get layerCount() { return this.mats.length; }

  /** Fase e meteo correnti; `instant` salta la transizione (all'avvio). */
  setConditions(phase: DayPhase, weather: Weather, instant = false) {
    this.target = mistTarget(phase, weather);
    this.targetNight = phase === 'night' ? 1 : phase === 'dusk' ? 0.5 : 0;
    if (instant) {
      this.density = this.target.density; this.creep = this.target.creep;
      this.windSpeed = this.target.wind; this.nightAmount = this.targetNight;
    }
  }

  setQuality(q: Quality) {
    const n = mistLayers(q);
    if (n === this.layers) return;
    this.layers = n;
    if (this.world) this.rebuild();
  }

  /**
   * Costruisce i veli attorno al recinto (area in celle, mondo centrato su
   * `half`) fino a `bound` unità dal centro, seguendo le quote del suolo.
   */
  setWorld(area: Rect, half: number, bound: number, heightAt: (x: number, z: number) => number) {
    this.world = { area, half, bound, heightAt };
    this.rebuild();
  }

  private rebuild() {
    const { area, half, bound: b, heightAt } = this.world!;
    const cx = area.x + area.w / 2 - half, cz = area.y + area.h / 2 - half;
    this.rect.set(cx, cz, area.w / 2, area.h / 2);
    for (const c of [...this.group.children]) { this.group.remove(c); if (c instanceof THREE.Mesh) c.geometry.dispose(); }
    for (const m of this.mats) m.dispose();
    this.mats.length = 0;
    const [hw, hh] = [area.w / 2, area.h / 2];
    for (let layer = 0; layer < this.layers; layer++) {
      const lift = 0.12 + layer * 0.28;
      const pos: number[] = [];
      const v = (x: number, z: number) => pos.push(x, heightAt(x, z) + lift, z);
      // solo i quadrati fuori dal recinto (o poco dentro, per il meteo nebbioso)
      for (let z = -b; z < b; z++) for (let x = -b; x < b; x++) {
        if (Math.max(Math.abs(x + 0.5 - cx) - hw, Math.abs(z + 0.5 - cz) - hh) < -8) continue;
        v(x, z); v(x, z + 1); v(x + 1, z);
        v(x + 1, z); v(x, z + 1); v(x + 1, z + 1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
        uniforms: {
          uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uRect: { value: this.rect },
          uOpacity: { value: 0 }, uLayer: { value: layer }, uCreep: { value: 0 }, uWind: { value: 0 },
        },
      });
      this.mats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 4 + layer;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  update(dt: number, fogColor: THREE.Color) {
    const k = 1 - Math.exp(-dt * 0.4); // transizioni di qualche secondo
    this.density += (this.target.density - this.density) * k;
    this.creep += (this.target.creep - this.creep) * k;
    this.windSpeed += (this.target.wind - this.windSpeed) * k;
    this.nightAmount += (this.targetNight - this.nightAmount) * k;
    this.windPos += dt * this.windSpeed;
    this.color.copy(fogColor).lerp(this.night, 0.35 + this.nightAmount * 0.3).offsetHSL(0, -0.04, 0.05 - this.nightAmount * 0.03);
    const dim = 1 - this.nightAmount * 0.3;
    this.mats.forEach((m, i) => {
      const u = m.uniforms;
      u.uWind.value = this.windPos;
      u.uCreep.value = this.creep;
      u.uOpacity.value = (0.42 - i * 0.09) * this.density * dim;
      (u.uColor.value as THREE.Color).copy(this.color);
    });
    this.group.visible = this.density > 0.01;
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const c of this.group.children) if (c instanceof THREE.Mesh) c.geometry.dispose();
    for (const m of this.mats) m.dispose();
  }
}
