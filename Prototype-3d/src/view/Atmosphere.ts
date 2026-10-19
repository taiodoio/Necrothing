// Atmosfera: luci per fase del giorno (alba/giorno/crepuscolo/notte), meteo,
// nebbia, ombre che seguono la camera e un pool limitato di PointLight
// assegnate dinamicamente alle sorgenti più vicine al centro della vista.
// Tutte le sorgenti hanno comunque un alone additivo (economico) e i voxel
// emissivi, quindi anche con poche luci reali la notte resta calda e leggibile.

import * as THREE from 'three';
import type { Quality, Weather } from '../game/state.ts';
import type { DayPhase } from '../game/time.ts';
import { lightWorldPos, MATERIALS } from '../render/modelCache.ts';
import type { LightAnchor } from '../render/shape.ts';
import { FireFlicker, seedFromPosition } from './FireFlicker.ts';
import { radialGlowTexture } from '../render/glowTexture.ts';

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
  /** Luce reale: quante sorgenti vicine rappresenta (una sola luce per gruppo, un po' più forte). */
  boost: number;
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
const LIGHT_IN = 0.6, LIGHT_OUT = 0.45;
/** Sorgenti più vicine di così contano come un gruppo (candele, lumini, fiamme dello stesso oggetto). */
const CROWD_R = 0.9, CLUSTER_R = 1.3;

let haloTexture: THREE.Texture | null = null;
/** Pozza di luce a terra (luci finte): qui il centro pieno va bene, sta sotto ai piedi e non davanti. */
let poolTexture: THREE.Texture | null = null;
function getPoolTexture(): THREE.Texture {
  poolTexture ??= radialGlowTexture([[0, 0.7], [0.2, 0.42], [0.5, 0.13], [1, 0]]);
  return poolTexture;
}
function getHaloTexture(): THREE.Texture {
  // centro tenue e bagliore largo attorno: l'alone sta davanti alla fonte (vedi update), con un
  // centro quasi bianco copriva la lanterna e chi ci stava vicino (il Custode non si vedeva)
  haloTexture ??= radialGlowTexture([[0, 0.4], [0.2, 0.3], [0.5, 0.1], [1, 0]]);
  return haloTexture;
}

export class Atmosphere {
  readonly group = new THREE.Group();
  readonly sun = new THREE.DirectionalLight('#ffffff', 2);
  readonly hemi = new THREE.HemisphereLight('#ffffff', '#333333', 1);
  readonly ambient = new THREE.AmbientLight('#ffffff', 0.2);
  readonly anchors = new Map<number, AnchorEntry>();
  private pool: THREE.PointLight[] = [];
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
  private poolTimer = 0;
  /** Le sorgenti sono cambiate: va ricalcolato quanto sono affollate. */
  private crowdDirty = true;
  private readonly toCamera = new THREE.Vector3();
  private readonly scene: THREE.Scene;
  /** Luci finte (telefoni deboli): niente luci vere, una pozza di luce dipinta a terra per ogni sorgente. */
  private fake: THREE.InstancedMesh | null = null;
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
    const poolSize = 10;
    for (let i = 0; i < poolSize; i++) {
      const l = new THREE.PointLight('#ffb35c', 0, 4, 1.6);
      this.pool.push(l);
      this.group.add(l);
    }
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

  /** Luci reali nella scena (qualità Auto): le altre non ci sono proprio, così lo shader non le calcola. */
  private lightBudget: number | null = null;

  /** Numero di luci reali attive per qualità (le altre restano a intensità 0). */
  private activePool(): number {
    return this.lightBudget ?? (this.quality === 'low' ? 4 : this.quality === 'medium' ? 7 : 10);
  }

  /**
   * Quante luci puntiformi tenere davvero nella scena (null: tutte, come nei
   * livelli manuali). Cambiarlo ricompila gli shader: si fa di rado.
   */
  setLightBudget(n: number | null) {
    this.lightBudget = n;
    this.pool.forEach((l, i) => {
      const keep = n === null || i < n;
      if (keep && !l.parent) this.group.add(l);
      if (!keep && l.parent) { this.group.remove(l); l.userData.entry = undefined; l.intensity = 0; }
    });
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
    (MATERIALS.glow as THREE.MeshBasicMaterial).color.setScalar(m.glow);
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

  /**
   * Luci finte: le luci vere si tolgono (lo shader non le calcola più) e al
   * loro posto ogni sorgente accesa ha un alone tondo a terra, additivo, che
   * tremola con la fiamma. Un'unica mesh per tutte (una sola draw call).
   */
  setFakeLights(on: boolean) {
    if (on === !!this.fake) return;
    this.setLightBudget(on ? 0 : null);
    if (!on) { this.group.remove(this.fake!); this.fake!.geometry.dispose(); (this.fake!.material as THREE.Material).dispose(); this.fake = null; return; }
    const mat = new THREE.MeshBasicMaterial({ map: getPoolTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.fake = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat, 512);
    this.fake.count = 0;
    this.fake.frustumCulled = false;
    this.fake.renderOrder = 2;
    this.group.add(this.fake);
  }

  private updateFake(t: number, pool: number) {
    const m = this.fake!;
    const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color(), lp = new THREE.Vector3();
    let i = 0;
    for (const e of this.anchors.values()) {
      if (!e.on || e.anchor.intensity <= 0.2 || i >= 512) continue;
      const f = e.flicker.value(t);
      const r = e.anchor.range * 0.42;
      // a terra sotto la sorgente (l'ancora sta in alto sul modello: la sua quota nel modello è l'altezza da terra)
      p.set(e.pos.x, e.pos.y - lightWorldPos(e.anchor, lp).y + 0.04, e.pos.z);
      m.setMatrixAt(i, mat4.compose(p, q, sc.set(r, 1, r)));
      m.setColorAt(i, c.set(e.anchor.color).multiplyScalar(Math.min(1, e.anchor.intensity) * 0.3 * pool * f * e.crowd));
      i++;
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  addAnchor(pos: THREE.Vector3, anchor: LightAnchor, on = true): AnchorHandle {
    const id = this.nextId++;
    const mat = new THREE.SpriteMaterial({ map: getHaloTexture(), color: anchor.color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    const s = 0.5 + anchor.halo * 1.6;
    sprite.scale.set(s, s, s);
    sprite.renderOrder = 3;
    this.group.add(sprite);
    this.anchors.set(id, { pos: pos.clone(), anchor, sprite, flicker: new FireFlicker(seedFromPosition(pos.x, pos.y, pos.z), anchor.flicker, 1, anchor.fault ?? 0), on, crowd: 1, boost: 1 });
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
    for (const light of this.pool) if (light.userData.entry === e) { light.color.set(anchor.color); light.distance = anchor.range; }
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
    // Flicker degli aloni e delle luci.
    for (const e of this.anchors.values()) {
      const f = e.flicker.value(t);
      (e.sprite.material as THREE.SpriteMaterial).opacity = e.on ? p.halo * Math.min(1, e.anchor.intensity * 1.4) * f * e.crowd : 0;
      e.sprite.visible = e.on && p.halo > 0.02 && e.anchor.halo > 0.05; // alone 0: luce senza bagliore (riverbero diffuso)
      if (e.sprite.visible) e.sprite.position.copy(e.pos).addScaledVector(this.toCamera, e.sprite.scale.x * 0.3);
    }
    if (this.fake) this.updateFake(t, p.pool);
    // Il pool di luci reali segue le sorgenti più vicine al centro della vista.
    // Assegnazione stabile (una luce resta sulla sua sorgente finché serve) e
    // dissolvenze in entrata/uscita: niente accensioni di colpo.
    this.poolTimer -= dt;
    if (this.poolTimer <= 0) {
      this.poolTimer = 0.3;
      const n = this.activePool();
      // una luce per gruppo di sorgenti vicine (le candele di un oggetto): niente dieci luci sullo stesso
      // punto, che bruciano i colori e lasciano al buio il resto; il capogruppo è un po' più forte
      const want: AnchorEntry[] = [];
      for (const e of [...this.anchors.values()].filter((x) => x.on && x.anchor.intensity > 0.2)
        .sort((a, b) => a.pos.distanceToSquared(this.focusPoint) - b.pos.distanceToSquared(this.focusPoint))) {
        const lead = want.find((w) => w.pos.distanceToSquared(e.pos) < CLUSTER_R * CLUSTER_R);
        if (lead) { lead.boost = Math.min(1.8, lead.boost + 0.2); continue; }
        if (want.length >= n) continue;
        e.boost = 1;
        want.push(e);
      }
      const wanted = new Set(want);
      const assigned = new Set<AnchorEntry>();
      for (const light of this.pool) {
        const e = light.userData.entry as AnchorEntry | undefined;
        if (!e) continue;
        if (wanted.has(e) && this.anchors.has(this.idOf(e))) { assigned.add(e); light.userData.leaving = false; }
        else light.userData.leaving = true;
      }
      for (const e of want) {
        if (assigned.has(e)) continue;
        // la sorgente è stata rifatta nello stesso punto (oggetto con un modello nuovo): la luce passa a lei senza spegnersi
        const handover = this.pool.find((l) => l.parent && l.userData.leaving && l.userData.entry && !this.anchors.has(this.idOf(l.userData.entry as AnchorEntry)) && (l.userData.entry as AnchorEntry).pos.distanceToSquared(e.pos) < 0.04);
        if (handover) {
          handover.userData.entry = e;
          handover.userData.leaving = false;
          handover.color.set(e.anchor.color);
          handover.distance = e.anchor.range;
          assigned.add(e);
          continue;
        }
        const free = this.pool.find((l) => !l.userData.entry && l.parent);
        if (!free) break;
        free.userData.entry = e;
        free.userData.leaving = false;
        free.userData.w = 0;
        free.position.copy(e.pos);
        free.color.set(e.anchor.color);
        free.distance = e.anchor.range;
        assigned.add(e);
      }
    }
    for (const light of this.pool) {
      const e = light.userData.entry as AnchorEntry | undefined;
      if (!e || !light.parent) { light.intensity = 0; continue; }
      let w = (light.userData.w as number | undefined) ?? 1;
      w = light.userData.leaving ? Math.max(0, w - dt / LIGHT_OUT) : Math.min(1, w + dt / LIGHT_IN);
      light.userData.w = w;
      if (light.userData.leaving && w <= 0) { light.userData.entry = undefined; light.intensity = 0; continue; }
      light.position.copy(e.pos);
      light.intensity = p.pool * e.anchor.intensity * 4.2 * e.flicker.value(t) * w * e.boost;
    }
    // Temporale: lampi occasionali (solo col temporale).
    if (this.weather === 'storm') {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) { this.flash = 1; this.nextFlash = 5 + Math.random() * 9; }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);
  }

  private idOf(e: AnchorEntry): number {
    for (const [id, x] of this.anchors) if (x === e) return id;
    return -1;
  }

  setAnchorOn(h: AnchorHandle, on: boolean) {
    const e = this.anchors.get(h.id);
    if (e) e.on = on;
  }
}
