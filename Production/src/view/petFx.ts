// Effetti dell'animale domestico: la tana (occhi che brillano nel buio
// dell'arco mentre dorme, con le "z" che salgono), le scritte fluttuanti
// (z, cuoricini) e l'osso da lanciare.

import * as THREE from 'three';
import { LP } from '../render/lowpoly/kit.ts';
import { instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';

const textures = new Map<string, THREE.Texture>();

/** Texture di un simbolo disegnato a mano su canvas ('z' o cuore), con il bordo scuro. */
function glyphTexture(kind: 'z' | 'heart', color: string): THREE.Texture {
  const key = `${kind}:${color}`;
  let t = textures.get(key);
  if (t) return t;
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return new THREE.Texture(); // test senza DOM
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.lineJoin = 'round';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(16,14,20,0.85)';
  g.fillStyle = color;
  if (kind === 'z') {
    g.font = '900 52px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.strokeText('z', 32, 34);
    g.fillText('z', 32, 34);
  } else {
    const p = new Path2D('M32 54 C 10 38, 6 26, 14 17 C 21 9, 30 13, 32 21 C 34 13, 43 9, 50 17 C 58 26, 54 38, 32 54 Z');
    g.stroke(p);
    g.fill(p);
  }
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textures.set(key, t);
  return t;
}

interface Glyph { sprite: THREE.Sprite; life: number; max: number; vel: THREE.Vector3; size: number }

/** Simboli che salgono e svaniscono (z del sonno, cuoricini delle coccole). */
export class Glyphs {
  readonly group = new THREE.Group();
  private list: Glyph[] = [];

  constructor() { this.group.name = 'simboli'; }

  spawn(kind: 'z' | 'heart', at: THREE.Vector3, opts: { color?: string; size?: number; life?: number; vel?: THREE.Vector3 } = {}) {
    const mat = new THREE.SpriteMaterial({ map: glyphTexture(kind, opts.color ?? (kind === 'z' ? '#e6f4ff' : '#ff8fb1')), transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(at);
    sprite.renderOrder = 6;
    sprite.raycast = () => undefined;
    this.group.add(sprite);
    const size = opts.size ?? 0.22;
    sprite.scale.setScalar(size * 0.5);
    this.list.push({ sprite, life: opts.life ?? 1.6, max: opts.life ?? 1.6, vel: opts.vel ?? new THREE.Vector3(0, 0.45, 0), size });
  }

  update(dt: number) {
    for (const g of this.list) {
      g.life -= dt;
      const k = 1 - g.life / g.max; // 0 → 1
      g.sprite.position.addScaledVector(g.vel, dt);
      g.sprite.position.x += Math.sin(k * 9) * 0.004;
      g.sprite.scale.setScalar(g.size * (0.5 + 0.6 * Math.min(1, k * 2.5)));
      (g.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, k * 6) * Math.min(1, g.life / (g.max * 0.4));
    }
    for (const g of this.list.filter((q) => q.life <= 0)) {
      this.group.remove(g.sprite);
      (g.sprite.material as THREE.SpriteMaterial).dispose();
    }
    this.list = this.list.filter((q) => q.life > 0);
  }
}

/**
 * Tana: nel buio dell'arco della casetta si vedono due occhietti socchiusi
 * che ogni tanto sbattono, mentre dalla porta salgono le "z".
 */
export class Den {
  readonly group = new THREE.Group();
  private eyes: THREE.Mesh[] = [];
  private zTimer = 0;
  private blink = 2 + Math.random() * 2;
  sleeping = false;

  constructor(color: string) {
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(0.055, 0.042, 0.012), mat);
      e.position.set(s * 0.08, 0.26, 0.335); // davanti alla lastra scura dell'arco (z 0,31–0,33)
      e.raycast = () => undefined;
      this.group.add(e);
      this.eyes.push(e);
    }
    this.group.visible = false;
  }

  place(home: THREE.Vector3) { this.group.position.copy(home); }

  update(dt: number, t: number, glyphs: Glyphs) {
    this.group.visible = this.sleeping;
    if (!this.sleeping) return;
    // occhi socchiusi che "respirano"; ogni tanto un battito lento
    this.blink -= dt;
    const closing = this.blink < 0 ? Math.max(0.12, Math.abs(this.blink + 0.18) / 0.18) : 1;
    if (this.blink < -0.36) this.blink = 2.5 + Math.random() * 3;
    const open = (0.55 + 0.08 * Math.sin(t * 1.3)) * closing;
    for (const e of this.eyes) e.scale.y = open;
    this.zTimer -= dt;
    if (this.zTimer <= 0) {
      this.zTimer = 1.1;
      const p = this.group.position;
      glyphs.spawn('z', new THREE.Vector3(p.x + 0.12, p.y + 0.62, p.z + 0.36), { size: 0.26, life: 2.2, vel: new THREE.Vector3(0.16, 0.38, 0.02) });
    }
  }
}

let boneModel: ReturnType<LP['build']> | null = null;

/** Osso da lanciare (stesso stile delle ossa della scena). */
export function boneMesh(): THREE.Group {
  if (!boneModel) {
    const lp = new LP('pet:osso');
    lp.cyl(0, 0, 0, 0.022, 0.022, 0.26, 5, '#e2d9c3', { jitter: 0 });
    for (const y of [0, 0.26]) for (const s of [-1, 1]) lp.blob(s * 0.022, y, 0, 0.03, 0.026, 0.03, '#e2d9c3', { jitter: 0 });
    boneModel = lp.build();
  }
  const g = new THREE.Group();
  const m = instantiate({ geometries: boneModel.geometries, lights: [], height: 0.3 }, { castShadow: true });
  m.rotation.z = Math.PI / 2; // disteso lungo x
  m.position.x = 0.13;
  g.add(m);
  g.visible = false;
  return g;
}
