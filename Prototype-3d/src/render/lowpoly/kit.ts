// Toolkit geometrico dello stile "Stylized Gothic Low-Poly".
// Le forme si compongono con geometrie three.js vere (estrusioni di profili,
// torniti, coni/cilindri a pochi segmenti, icosaedri, box smussati), poi:
//  • si applica la trasformazione corrente (push/pop come nel DSL voxel);
//  • i vertici si spostano di poco in modo deterministico (stessa posizione →
//    stesso spostamento, quindi niente crepe) per togliere la rigidità CAD;
//  • ogni faccia riceve un colore leggermente variato e un'ombreggiatura
//    verso la base (finto AO), poi le normali piatte danno il look sfaccettato.
// Tutte le misure sono in unità mondo (1 = una cella). Origine: centro
// dell'ingombro a terra, fronte verso +z.

import * as THREE from 'three';
import { createRng, hash3, type Rng } from '../../game/rng.ts';
import type { BucketGeometries } from '../voxelMesher.ts';
import { VOX, type Bucket, type LightAnchor } from '../shape.ts';

export interface LPOpts {
  bucket?: Bucket;
  /** Spostamento casuale dei vertici (unità mondo). */
  jitter?: number;
  /** Variazione di luminosità per faccia (0..0.3). */
  vary?: number;
  /** Scurimento verso il basso del pezzo (0..0.5), finto AO. */
  ao?: number;
  /** Mescola verso questo colore le facce rivolte in alto (muschio, polvere). */
  topTint?: string;
  topAmount?: number;
}

export interface LPModel { geometries: BucketGeometries; lights: LightAnchor[] }

type Part = { pos: Float32Array; col: Float32Array };

const tmpV = new THREE.Vector3();
const tmpC = new THREE.Color();
const tmpT = new THREE.Color();

export class LP {
  readonly rng: Rng;
  readonly lights: LightAnchor[] = [];
  private readonly seed: number;
  private parts: Partial<Record<Bucket, Part[]>> = {};
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];

  constructor(seed: number | string) {
    this.rng = createRng(seed);
    this.seed = typeof seed === 'number' ? seed : Math.floor(this.rng.next() * 1e6);
  }

  private get m() { return this.stack[this.stack.length - 1]; }

  /** Trasformazione locale: traslazione, rotazioni (rad) e scala. */
  push(t: [number, number, number] = [0, 0, 0], ry = 0, rx = 0, rz = 0, s: number | [number, number, number] = 1): this {
    const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...t), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), sc);
    this.stack.push(this.m.clone().multiply(local));
    return this;
  }

  pop(): this {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }

  /** Aggiunge una geometria qualsiasi con colore e opzioni di stile. */
  add(geo: THREE.BufferGeometry, color: string, o: LPOpts = {}): this {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(this.m);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    if (this.m.determinant() < 0) { // specchiatura: ripristina l'orientamento delle facce
      for (let i = 0; i < p.count; i += 3) {
        const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, x, y, z);
      }
    }
    const n = p.count;
    const pos = new Float32Array(n * 3);
    const jit = o.jitter ?? 0.012;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      tmpV.fromBufferAttribute(p, i);
      if (jit > 0) {
        const kx = Math.round(tmpV.x * 200), ky = Math.round(tmpV.y * 200), kz = Math.round(tmpV.z * 200);
        tmpV.x += (hash3(kx, ky, kz, this.seed) - 0.5) * jit;
        tmpV.y += (hash3(ky, kz, kx, this.seed + 1) - 0.5) * jit * 0.7;
        tmpV.z += (hash3(kz, kx, ky, this.seed + 2) - 0.5) * jit;
      }
      pos[i * 3] = tmpV.x; pos[i * 3 + 1] = tmpV.y; pos[i * 3 + 2] = tmpV.z;
      minY = Math.min(minY, tmpV.y); maxY = Math.max(maxY, tmpV.y);
    }
    const col = new Float32Array(n * 3);
    const base = new THREE.Color(color);
    const top = o.topTint ? new THREE.Color(o.topTint) : null;
    const vary = o.vary ?? 0.08, ao = o.ao ?? 0.18;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nrm = new THREE.Vector3();
    for (let f = 0; f < n; f += 3) {
      a.fromArray(pos, f * 3); b.fromArray(pos, f * 3 + 3); c.fromArray(pos, f * 3 + 6);
      const cy = (a.y + b.y + c.y) / 3;
      const h = hash3(Math.round((a.x + b.x + c.x) * 97), Math.round(cy * 97), Math.round((a.z + b.z + c.z) * 97), this.seed + 7);
      const t = maxY > minY ? (cy - minY) / (maxY - minY) : 1;
      tmpC.copy(base).multiplyScalar((1 + (h - 0.5) * 2 * vary) * (1 - ao * (1 - t)));
      if (top && o.topAmount) {
        nrm.subVectors(b, a).cross(tmpV.subVectors(c, a)).normalize();
        if (nrm.y > 0.55) tmpC.lerp(tmpT.copy(top), o.topAmount * (0.6 + h * 0.4));
      }
      for (let k = 0; k < 3; k++) { col[(f + k) * 3] = tmpC.r; col[(f + k) * 3 + 1] = tmpC.g; col[(f + k) * 3 + 2] = tmpC.b; }
    }
    (this.parts[o.bucket ?? 'solid'] ??= []).push({ pos, col });
    if (g !== geo) g.dispose();
    geo.dispose();
    return this;
  }

  // ── Primitive ──────────────────────────────────────────────────────

  /** Box centrato in x/z, appoggiato su y0, con smusso opzionale sugli spigoli. */
  box(cx: number, y0: number, cz: number, w: number, h: number, d: number, color: string, o: LPOpts & { bevel?: number } = {}): this {
    const bev = Math.min(o.bevel ?? 0, w / 3, h / 3, d / 3);
    let g: THREE.BufferGeometry;
    if (bev > 0.002) {
      const s = new THREE.Shape();
      const hw = w / 2 - bev, hh = h / 2 - bev;
      s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.closePath();
      g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 1 });
      g.translate(0, 0, -(d - 2 * bev) / 2);
    } else {
      g = new THREE.BoxGeometry(w, h, d);
    }
    g.translate(cx, y0 + h / 2, cz);
    return this.add(g, color, o);
  }

  /** Cilindro/tronco di cono lungo Y (pochi segmenti = sfaccettato). */
  cyl(cx: number, y0: number, cz: number, r0: number, r1: number, h: number, seg: number, color: string, o: LPOpts & { open?: boolean } = {}): this {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1, o.open ?? false);
    g.translate(cx, y0 + h / 2, cz);
    return this.add(g, color, o);
  }

  /** Solido di rotazione da un profilo [raggio, y] (dal basso verso l'alto). */
  lathe(cx: number, y0: number, cz: number, profile: Array<[number, number]>, seg: number, color: string, o: LPOpts = {}): this {
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg);
    g.translate(cx, y0, cz);
    return this.add(g, color, o);
  }

  /** Masso/chioma: icosaedro (detail 0/1) scalato e irregolare. */
  blob(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: string, o: LPOpts & { detail?: number } = {}): this {
    const g = new THREE.IcosahedronGeometry(1, o.detail ?? 0);
    g.scale(rx, ry, rz);
    g.translate(cx, cy, cz);
    return this.add(g, color, { jitter: Math.min(rx, ry, rz) * 0.35, ...o });
  }

  /**
   * Profilo 2D (nel piano XY, y verso l'alto) estruso lungo Z e centrato sullo
   * spessore. È la base di lapidi, archi, porte, finestre gotiche.
   */
  extrude(shape: THREE.Shape, depth: number, color: string, o: LPOpts & { bevel?: number; curve?: number } = {}): this {
    const bev = o.bevel ?? 0;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, depth - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: o.curve ?? 5,
    });
    g.translate(0, 0, -(depth - 2 * bev) / 2);
    return this.add(g, color, o);
  }

  /** Lastra sottile su un piano qualsiasi (incisioni, toppe di muschio, foglie). */
  plate(shape: THREE.Shape, thick: number, color: string, o: LPOpts = {}): this {
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 3 });
    return this.add(g, color, { jitter: 0, ...o });
  }

  /** Sorgente di luce (unità mondo) per l'Atmosfera e il pool di PointLight. */
  light(x: number, y: number, z: number, color: string, intensity = 1, range = 4, flicker = 0.2, halo = 1): this {
    tmpV.set(x, y, z).applyMatrix4(this.m);
    this.lights.push({ pos: [tmpV.x / VOX, tmpV.y / VOX, tmpV.z / VOX], color, intensity, range, flicker, halo });
    return this;
  }

  build(): LPModel {
    const geometries: BucketGeometries = {};
    for (const [bucket, list] of Object.entries(this.parts) as [Bucket, Part[]][]) {
      if (!list.length) continue;
      let n = 0;
      for (const p of list) n += p.pos.length;
      const pos = new Float32Array(n), col = new Float32Array(n);
      let o = 0;
      for (const p of list) { pos.set(p.pos, o); col.set(p.col, o); o += p.pos.length; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      g.computeBoundingBox();
      g.computeBoundingSphere();
      geometries[bucket] = g;
    }
    return { geometries, lights: this.lights };
  }
}

// ── Profili 2D riutilizzabili ────────────────────────────────────────────

/** Rettangolo con angoli smussati (chamfer) o arrotondati a pochi segmenti. */
export function rectShape(w: number, h: number, chamfer = 0, y0 = 0): THREE.Shape {
  const s = new THREE.Shape();
  const x0 = -w / 2, x1 = w / 2, y1 = y0 + h, c = Math.min(chamfer, w / 3, h / 3);
  s.moveTo(x0 + c, y0); s.lineTo(x1 - c, y0); s.lineTo(x1, y0 + c); s.lineTo(x1, y1 - c);
  s.lineTo(x1 - c, y1); s.lineTo(x0 + c, y1); s.lineTo(x0, y1 - c); s.lineTo(x0, y0 + c); s.closePath();
  return s;
}

/** Lapide a testa tonda: rettangolo con semicerchio (segmenti visibili). */
export function roundTopShape(w: number, h: number, seg = 7, y0 = 0): THREE.Shape {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, y0); s.lineTo(r, y0); s.lineTo(r, y0 + h - r);
  for (let i = 1; i <= seg; i++) {
    const a = (i / seg) * Math.PI;
    s.lineTo(Math.cos(a) * r, y0 + h - r + Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

/** Arco gotico a sesto acuto: due archi di cerchio che si incontrano in punta. */
export function gothicArchShape(w: number, h: number, seg = 4, y0 = 0, sharp = 1.0): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2;
  const R = w * sharp; // raggio degli archi (≥ w/2): più grande = più acuto
  const spring = y0 + h - Math.sqrt(R * R - (R - hw) * (R - hw));
  s.moveTo(-hw, y0); s.lineTo(hw, y0); s.lineTo(hw, spring);
  // arco destro: centro in (hw - R, spring)
  const cxR = hw - R;
  const top = Math.acos((0 - cxR) / R);
  for (let i = 1; i <= seg; i++) {
    const a = (i / seg) * top;
    s.lineTo(cxR + Math.cos(a) * R, spring + Math.sin(a) * R);
  }
  const cxL = -hw + R;
  for (let i = seg - 1; i >= 0; i--) {
    const a = Math.PI - (i / seg) * (Math.PI - Math.acos((0 - cxL) / R));
    s.lineTo(cxL + Math.cos(a) * R, spring + Math.sin(a) * R);
  }
  s.closePath();
  return s;
}

/** Poligono irregolare (pietre del selciato, toppe): n lati attorno a un raggio. */
export function irregularShape(rng: Rng, r: number, n = 6, squash = 1): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const rr = r * rng.range(0.72, 1.08);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * squash;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
