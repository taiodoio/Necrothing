// Atmosfera: luci per fase del giorno (alba/giorno/crepuscolo/notte), meteo,
// nebbia e ombre che seguono la camera. Le sorgenti accese (lanterne, lumini,
// fiamme) non sono luci vere: si dipingono nella mappa di luce (render/lightMap.ts),
// uguale in tutte le qualità, così la resa non cambia spostando la vista; in più
// hanno un alone additivo (economico) e le geometrie emissive.

import * as THREE from 'three';
import type { Quality, Weather } from '../game/state.ts';
import type { DayPhase } from '../game/time.ts';
import { lightWorldPos, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import type { LightAnchor } from '../render/types.ts';
import { FireFlicker, seedFromPosition } from './FireFlicker.ts';
import { radialGlowTexture } from '../render/glowTexture.ts';
import { LightMapPainter } from '../render/lightMap.ts';

interface Preset {
  top: string; bottom: string; fog: string;
  sky: string; ground: string; hemi: number;
  sun: string; sunI: number; sunDir: [number, number, number];
  ambient: number; glow: number; halo: number; pool: number;
}

const PRESETS: Record<DayPhase, Preset> = {
  dawn: { top: '#4b4a5e', bottom: '#8c7a74', fog: '#6e6670', sky: '#b9b2c4', ground: '#3c3a33', hemi: 1.35, sun: '#ffc39a', sunI: 1.9, sunDir: [-12, 9, 14], ambient: 0.25, glow: 0.65, halo: 0.45, pool: 0.45 },
  day: { top: '#6f7c80', bottom: '#a7a596', fog: '#8b928a', sky: '#c4cbc8', ground: '#4a4a3e', hemi: 1.75, sun: '#fff0d8', sunI: 2.7, sunDir: [-10, 22, 12], ambient: 0.35, glow: 0.42, halo: 0.08, pool: 0 },
  dusk: { top: '#252438', bottom: '#6d4e52', fog: '#463c4c', sky: '#8f86ab', ground: '#2b2724', hemi: 1.45, sun: '#ff9a62', sunI: 1.45, sunDir: [-16, 8, 8], ambient: 0.3, glow: 0.92, halo: 0.85, pool: 0.85 },
  night: { top: '#090d16', bottom: '#1d2533', fog: '#151d29', sky: '#5b6d92', ground: '#191817', hemi: 1.05, sun: '#9db3e6', sunI: 0.95, sunDir: [-8, 18, 10], ambient: 0.22, glow: 1, halo: 1, pool: 1 },
};

interface AnchorEntry {
  pos: THREE.Vector3;
  anchor: LightAnchor;
  sprite: THREE.Sprite;
  flicker: FireFlicker;
  on: boolean;
  /** Alone attenuato quando ci sono altre sorgenti vicine (dieci candele non fanno dieci aloni pieni). */
  crowd: number;
}

export interface AnchorHandle { id: number }

/** Valori di luce e colore correnti: si avvicinano gradualmente all'obiettivo (niente stacchi). */
interface Mix {
  top: THREE.Color; bottom: THREE.Color; fog: THREE.Color; sky: THREE.Color; ground: THREE.Color; sun: THREE.Color;
  hemi: number; sunI: number; ambient: number; glow: number; halo: number; pool: number; sunDir: THREE.Vector3;
}

const DARK_SKY = new THREE.Color('#14181e');

function mixFrom(p: Preset, weather: Weather): Mix {
  const wet = weather === 'rain' || weather === 'storm';
  const dim = wet ? 0.72 : weather === 'fog' ? 0.86 : 1;
  const top = new THREE.Color(p.top), bottom = new THREE.Color(p.bottom);
  if (wet) { top.lerp(DARK_SKY, 0.35); bottom.lerp(DARK_SKY, 0.35); }
  return {
    top, bottom, fog: new THREE.Color(p.fog), sky: new THREE.Color(p.sky), ground: new THREE.Color(p.ground), sun: new THREE.Color(p.sun),
    hemi: p.hemi * dim, sunI: p.sunI * dim, ambient: p.ambient, glow: p.glow, halo: p.halo, pool: p.pool, sunDir: new THREE.Vector3(...p.sunDir),
  };
}

function cloneMix(m: Mix): Mix {
  return { ...m, top: m.top.clone(), bottom: m.bottom.clone(), fog: m.fog.clone(), sky: m.sky.clone(), ground: m.ground.clone(), sun: m.sun.clone(), sunDir: m.sunDir.clone() };
}

/** Durata indicativa dei passaggi di fase/meteo e delle accensioni delle luci (secondi). */
const MIX_RATE = 1.3;
/** Sorgenti più vicine di così contano come un gruppo (candele, lumini, fiamme dello stesso oggetto). */
const CROWD_R = 0.9;

/** Luminosità di vetri e fiamme accesi (moltiplica il valore della fase del giorno). */
export const GLOW_SCALE = 0.62;
/** Opacità degli aloni, e quanto restano quando la vista è larga. */
export const HALO_OPACITY = 0.7;
export const HALO_FAR_MIN = 0.35;
/** Pozza a terra delle luci finte: raggio (in parte della portata della luce) e quota sopra il terreno. */
export const POOL_RADIUS = 0.65;
export const POOL_LIFT = 0.11;

let haloTexture: THREE.Texture | null = null;
function getHaloTexture(): THREE.Texture {
  // centro tenue e bagliore largo attorno: l'alone sta davanti alla fonte (vedi update), con un
  // centro quasi bianco copriva la lanterna e chi ci stava vicino (il Custode non si vedeva)
  // (più morbido ancora: un bagliore pieno nascondeva la lanterna stessa, e da lontano diventava un pallino)
  haloTexture ??= radialGlowTexture([[0, 0.2], [0.3, 0.14], [0.65, 0.04], [1, 0]]);
  return haloTexture;
}

export class Atmosphere {
  readonly group = new THREE.Group();
  readonly sun = new THREE.DirectionalLight('#ffffff', 2);
  readonly hemi = new THREE.HemisphereLight('#ffffff', '#333333', 1);
  readonly ambient = new THREE.AmbientLight('#ffffff', 0.2);
  readonly anchors = new Map<number, AnchorEntry>();
  private nextId = 1;
  private preset: Preset = PRESETS.night;
  private cur: Mix | null = null;
  private target: Mix = mixFrom(PRESETS.night, 'clear');
  private mixing = false;
  private phase: DayPhase = 'night';
  private weather: Weather = 'clear';
  private focusPoint = new THREE.Vector3();
  private bgCanvas = document.createElement('canvas');
  private bgTexture: THREE.CanvasTexture;
  private flash = 0;
  private nextFlash = 6;
  /** Le sorgenti sono cambiate: va ricalcolato quanto sono affollate. */
  private crowdDirty = true;
  private readonly toCamera = new THREE.Vector3();
  private readonly scene: THREE.Scene;
  /**
   * La luce delle sorgenti: ognuna dipinta nella mappa di luce che i materiali leggono (render/lightMap.ts).
   * In tutte le qualità: con le luci vere (prima in Alta, sulle 10 fonti più vicine al centro) la resa
   * cambiava spostando la vista, più fredda al centro e calda ai lati.
   */
  private readonly fake = new LightMapPainter(512);
  private fakeStrength = 0;
  private fakeT = 0;
  private fakePool = 0;
  private lastMapTime = -Infinity;
  private readonly lastMapAt = new THREE.Vector3(Infinity, 0, 0);
  private viewRadius = 12;
  quality: Quality;

  constructor(scene: THREE.Scene, quality: Quality) {
    this.scene = scene;
    this.quality = quality;
    this.group.name = 'atmosfera';
    this.group.add(this.hemi, this.ambient, this.sun, this.sun.target);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.setQuality(quality);
    this.bgCanvas.width = 4;
    this.bgCanvas.height = 256;
    this.bgTexture = new THREE.CanvasTexture(this.bgCanvas);
    this.bgTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = this.bgTexture;
    scene.fog = new THREE.Fog('#151d29', 40, 120);
    scene.add(this.group);
  }

  setQuality(q: Quality) {
    this.quality = q;
    const size = q === 'low' ? 1024 : q === 'medium' ? 1536 : 2048;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
  }

  /** Lato della mappa delle ombre (qualità Auto: segue il gradino). */
  setShadowSize(size: number) {
    if (this.sun.shadow.mapSize.x === size) return;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
  }

  /**
   * Nuova fase o meteo: l'atmosfera ci arriva in qualche secondo (prima il
   * cambio era istantaneo e si vedeva come un lampo). `instant` per l'avvio.
   */
  setPhase(phase: DayPhase, weather: Weather, instant = false) {
    this.phase = phase;
    this.weather = weather;
    this.preset = PRESETS[phase];
    this.target = mixFrom(this.preset, weather);
    if (!this.cur || instant) this.cur = cloneMix(this.target);
    this.mixing = true;
    this.applyMix();
  }

  private applyMix() {
    const m = this.cur!;
    const g = this.bgCanvas.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, `#${m.top.getHexString()}`);
    grad.addColorStop(1, `#${m.bottom.getHexString()}`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    this.bgTexture.needsUpdate = true;
    this.hemi.color.copy(m.sky);
    this.hemi.groundColor.copy(m.ground);
    this.hemi.intensity = m.hemi + this.flash * 3.5;
    this.sun.color.copy(m.sun);
    this.sun.intensity = m.sunI;
    this.ambient.intensity = m.ambient;
    // vetri e fiamme accesi: abbastanza da leggersi come luce, non tanto da diventare macchie bianche
    (LOWPOLY_MATERIALS.glow as THREE.MeshBasicMaterial).color.setScalar(m.glow * GLOW_SCALE);
    (this.scene.fog as THREE.Fog).color.copy(m.fog);
    this.applyFocus();
  }

  /** Avvicina i valori correnti all'obiettivo; true quando è arrivato. */
  private stepMix(dt: number): boolean {
    const c = this.cur!, t = this.target;
    const k = 1 - Math.exp(-dt * MIX_RATE);
    for (const key of ['top', 'bottom', 'fog', 'sky', 'ground', 'sun'] as const) c[key].lerp(t[key], k);
    for (const key of ['hemi', 'sunI', 'ambient', 'glow', 'halo', 'pool'] as const) c[key] += (t[key] - c[key]) * k;
    c.sunDir.lerp(t.sunDir, k);
    const near = (a: THREE.Color, b: THREE.Color) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.006;
    const done = (['hemi', 'sunI', 'ambient', 'glow', 'halo', 'pool'] as const).every((key) => Math.abs(c[key] - t[key]) < 0.004)
      && (['top', 'bottom', 'fog', 'sky', 'ground', 'sun'] as const).every((key) => near(c[key], t[key]));
    if (done) Object.assign(c, cloneMix(t));
    return done;
  }

  getPhase() { return this.phase; }
  getWeather() { return this.weather; }
  isDark() { return this.phase === 'night' || this.phase === 'dusk'; }

  /** Centra ombre e nebbia sul punto osservato (raggio = mezza vista). */
  focus(center: THREE.Vector3, radius: number, cameraDistance = 60) {
    this.focusPoint.copy(center);
    this.viewRadius = radius;
    const cam = this.sun.shadow.camera;
    const r = Math.max(8, radius);
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.near = 1; cam.far = 120;
    cam.updateProjectionMatrix();
    const fog = this.scene.fog as THREE.Fog;
    const thick = this.weather === 'fog' ? 0.55 : this.weather === 'rain' || this.weather === 'storm' ? 0.8 : 1;
    fog.near = cameraDistance + r * 0.35 * thick;
    fog.far = cameraDistance + r * 2.4 * thick + 12;
    this.applyFocus();
  }

  private applyFocus() {
    const d = this.cur?.sunDir ?? this.target.sunDir;
    this.sun.position.set(this.focusPoint.x + d.x, d.y, this.focusPoint.z + d.z);
    this.sun.target.position.copy(this.focusPoint);
    this.sun.target.updateMatrixWorld();
  }

  private updateFake(t: number, pool: number) {
    const m = this.fake;
    const c = new THREE.Color(), lp = new THREE.Vector3();
    m.begin();
    this.fakeStrength = pool;
    if (pool <= 0.01) return;
    for (const e of this.anchors.values()) {
      if (!e.on || e.anchor.intensity <= 0.2) continue;
      const f = e.flicker.value(t);
      // la quota del modello dell'ancora è l'altezza da terra: il suolo sotto la fonte
      const ground = e.pos.y - lightWorldPos(e.anchor, lp).y;
      c.set(e.anchor.color).multiplyScalar(Math.min(1, e.anchor.intensity) * f * e.crowd);
      m.add(e.pos.x, ground, e.pos.z, e.anchor.range * POOL_RADIUS, c);
    }
  }

  /** Disegna la mappa di luce (solo con le luci finte), prima della scena. */
  renderLightMap(renderer: THREE.WebGLRenderer) {
    // al più 24 volte al secondo (il tremolio non ne chiede di più), subito se la vista si è spostata
    const now = performance.now(), moved = this.lastMapAt.distanceToSquared(this.focusPoint) > 0.04;
    if (!moved && now - this.lastMapTime < 1000 / 24) return;
    this.lastMapTime = now; this.lastMapAt.copy(this.focusPoint);
    this.updateFake(this.fakeT, this.fakePool);
    this.fake.render(renderer, this.focusPoint.x, this.focusPoint.z, THREE.MathUtils.clamp(this.viewRadius * 2.6, 24, 96), this.fakeStrength);
  }

  addAnchor(pos: THREE.Vector3, anchor: LightAnchor, on = true): AnchorHandle {
    const id = this.nextId++;
    // l'alone nasce spento: lo accende update() alla luminosità giusta. Le sorgenti nate dopo
    // l'aggiornamento del frame (fuochi fatui, personaggi con la lanterna) altrimenti venivano
    // disegnate una volta a piena opacità: un lampo
    const mat = new THREE.SpriteMaterial({ map: getHaloTexture(), color: anchor.color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0 });
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    sprite.position.copy(pos);
    const s = 0.5 + anchor.halo * 1.6;
    sprite.scale.set(s, s, s);
    sprite.renderOrder = 3;
    this.group.add(sprite);
    this.anchors.set(id, { pos: pos.clone(), anchor, sprite, flicker: new FireFlicker(seedFromPosition(pos.x, pos.y, pos.z), anchor.flicker, 1, anchor.fault ?? 0), on, crowd: 1 });
    this.crowdDirty = true;
    return { id };
  }

  removeAnchor(h: AnchorHandle | null | undefined) {
    if (!h) return;
    const e = this.anchors.get(h.id);
    if (!e) return;
    this.group.remove(e.sprite);
    e.sprite.material.dispose();
    this.anchors.delete(h.id);
    this.crowdDirty = true;
  }

  /**
   * Aggiorna una sorgente esistente (stessa luce, magari spostata o con un
   * guasto diverso) senza toglierla: così la luce reale che la illumina resta
   * accesa invece di spegnersi e riaccendersi a ogni modifica della scena.
   */
  updateAnchor(h: AnchorHandle, pos: THREE.Vector3, anchor: LightAnchor) {
    const e = this.anchors.get(h.id);
    if (!e) return;
    const moved = e.pos.distanceToSquared(pos) > 1e-6;
    if (moved || (e.anchor.fault ?? 0) !== (anchor.fault ?? 0) || e.anchor.flicker !== anchor.flicker) {
      e.flicker = new FireFlicker(seedFromPosition(pos.x, pos.y, pos.z), anchor.flicker, 1, anchor.fault ?? 0);
    }
    if (moved) this.crowdDirty = true;
    e.pos.copy(pos);
    e.sprite.position.copy(pos);
    if (e.anchor.color !== anchor.color) (e.sprite.material as THREE.SpriteMaterial).color.set(anchor.color);
    const s = 0.5 + anchor.halo * 1.6;
    e.sprite.scale.set(s, s, s);
    e.anchor = anchor;
  }

  moveAnchor(h: AnchorHandle, pos: THREE.Vector3) {
    const e = this.anchors.get(h.id);
    if (!e) return;
    if (e.pos.distanceToSquared(pos) > 0.04) this.crowdDirty = true;
    e.pos.copy(pos);
    e.sprite.position.copy(pos);
  }

  clearAnchors() {
    for (const id of [...this.anchors.keys()]) this.removeAnchor({ id });
  }

  /**
   * Quanto è affollata ogni sorgente: con altre vicine il suo alone si
   * attenua, così un gruppo di candele fa un bagliore unico e non una
   * macchia bianca. Griglia di celle di CROWD_R: solo le celle vicine.
   */
  private refreshCrowd() {
    this.crowdDirty = false;
    const grid = new Map<string, AnchorEntry[]>();
    const key = (x: number, z: number) => `${Math.floor(x / CROWD_R)},${Math.floor(z / CROWD_R)}`;
    const lit = [...this.anchors.values()].filter((e) => e.anchor.halo > 0.05);
    for (const e of lit) { const k = key(e.pos.x, e.pos.z); const l = grid.get(k); if (l) l.push(e); else grid.set(k, [e]); }
    for (const e of lit) {
      const cx = Math.floor(e.pos.x / CROWD_R), cz = Math.floor(e.pos.z / CROWD_R);
      let n = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        for (const o of grid.get(`${cx + dx},${cz + dz}`) ?? []) if (o !== e && o.pos.distanceToSquared(e.pos) < CROWD_R * CROWD_R) n++;
      }
      e.crowd = 1 / (1 + n * 0.55);
    }
  }

  update(dt: number, t: number, camera: THREE.Camera) {
    if (!this.cur) this.cur = cloneMix(this.target);
    if (this.crowdDirty) this.refreshCrowd();
    // gli aloni si spostano verso la camera di mezzo alone: con la vista ortografica restano
    // dove sono a schermo, ma non entrano più nel terreno o nei muri vicini (niente tagli dritti)
    camera.getWorldDirection(this.toCamera).negate();
    if (this.mixing || this.flash > 0) {
      if (this.mixing && this.stepMix(dt)) this.mixing = false;
      this.applyMix();
    }
    const p = this.cur;
    // Da lontano gli aloni si attenuano (fino a un terzo): con la vista larga sarebbero tanti pallini luminosi.
    const ortho = camera as THREE.OrthographicCamera;
    const view = ortho.isOrthographicCamera ? (ortho.top - ortho.bottom) / ortho.zoom : 18;
    const far = THREE.MathUtils.clamp(1.3 - view / 30, HALO_FAR_MIN, 1);
    // Flicker degli aloni e delle luci.
    for (const e of this.anchors.values()) {
      const f = e.flicker.value(t);
      (e.sprite.material as THREE.SpriteMaterial).opacity = e.on ? p.halo * Math.min(1, e.anchor.intensity * 1.4) * f * e.crowd * HALO_OPACITY * far : 0;
      e.sprite.visible = e.on && p.halo > 0.02 && e.anchor.halo > 0.05; // alone 0: luce senza bagliore (riverbero diffuso)
      if (e.sprite.visible) e.sprite.position.copy(e.pos).addScaledVector(this.toCamera, e.sprite.scale.x * 0.3);
    }
    // la mappa di luce si riempie solo quando si ridisegna (renderLightMap)
    this.fakeT = t; this.fakePool = p.pool;
    // Temporale: lampi occasionali (solo col temporale).
    if (this.weather === 'storm') {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) { this.flash = 1; this.nextFlash = 5 + Math.random() * 9; }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);
  }

  setAnchorOn(h: AnchorHandle, on: boolean) {
    const e = this.anchors.get(h.id);
    if (e) e.on = on;
  }
}
