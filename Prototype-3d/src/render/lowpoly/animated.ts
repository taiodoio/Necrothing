// Parti animate degli oggetti low-poly: piccoli gruppi di mesh agganciati
// all'oggetto (ereditano posizione e rotazione) e aggiornati a ogni frame.
// Lo stagno ha pesci morti a pancia in su che galleggiano alla deriva e
// pesci scheletrici che ogni tanto saltano,
// ninfee, canne che ondeggiano, cerchi nell'acqua e una rana; le "case"
// delle presenze hanno carte che volano, un disco che gira con le note; lo
// spaventapasseri gira la testa verso il Custode e ospita un corvo di
// passaggio; pozze e buchi fanno bolle e
// scintille. Le geometrie si costruiscono una volta sola e si condividono.

import * as THREE from 'three';
import { LP } from './kit.ts';
import { LPC } from './palette.ts';
import { instantiate, LOWPOLY_MATERIALS, type CachedModel } from '../modelCache.ts';
import { createRng } from '../../game/rng.ts';
import type { PVis } from '../models/types.ts';
import { SCARECROW_NECK, SCARECROW_PERCH, scarecrowHead } from './newItems3.ts';

export interface Animated {
  root: THREE.Group;
  update(t: number): void;
  /** Chi guardare (il Custode, in coordinate del mondo): lo usa lo spaventapasseri. */
  watch?(target: THREE.Vector3 | null): void;
}

const models = new Map<string, CachedModel>();

/** Mesh low-poly condivisa per chiave (geometria costruita una volta). */
function piece(key: string, build: (lp: LP) => void): THREE.Group {
  let m = models.get(key);
  if (!m) {
    const lp = new LP(`anim:${key}`);
    build(lp);
    const { geometries, lights } = lp.build();
    m = { geometries, lights, height: 0.2, mats: LOWPOLY_MATERIALS, dedicated: true };
    models.set(key, m);
  }
  return instantiate(m, { castShadow: false, receiveShadow: false });
}

const ball = (lp: LP, x: number, y: number, z: number, rx: number, ry: number, rz: number, c: string, o: Parameters<LP['blob']>[7] = {}) =>
  lp.blob(x, y, z, rx, ry, rz, c, { detail: 1, jitter: 0, vary: 0.05, ao: 0, ...o });

// ── Pezzi ───────────────────────────────────────────────────────────────

/** Pesce morto a pancia in su, con occhi a X: ridicolo più che triste. */
const deadFish = (color: string) => (lp: LP) => {
  ball(lp, 0, 0, 0, 0.07, 0.05, 0.13, color);
  ball(lp, 0, 0.03, 0.01, 0.05, 0.025, 0.1, '#ece6d6'); // pancia chiara, verso l'alto
  const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.lineTo(0.07, -0.09); tail.lineTo(-0.07, -0.09); tail.closePath();
  lp.push([0, 0, -0.12], 0, -Math.PI / 2).plate(tail, 0.012, color, { ao: 0 }).pop();
  for (const s of [-1, 1]) lp.push([s * 0.068, 0.0, 0.07], 0, 0, s * 0.3).plate(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.05, -0.03), new THREE.Vector2(0.0, -0.05)]), 0.008, color, { ao: 0 }).pop();
  for (const s of [-1, 1]) for (const k of [-1, 1]) lp.push([s * 0.055, 0.012, 0.085], s * Math.PI / 2, 0, k * 0.785).box(0, -0.016, 0, 0.006, 0.032, 0.006, LPC.charcoal, { jitter: 0, ao: 0 }).pop();
};

/** Pesce scheletrico (muso verso +z): cranio con l'orbita vuota, spina, costole e coda d'osso. */
const boneFish = (lp: LP) => {
  const b = LPC.bone, d = '#cfc6a8';
  ball(lp, 0, 0, 0.11, 0.045, 0.05, 0.065, b); // cranio
  lp.push([0, -0.022, 0.16], 0, 0.25).box(0, 0, 0, 0.05, 0.016, 0.06, d, { jitter: 0, ao: 0 }).pop(); // mandibola aperta
  for (const sx of [-1, 1]) ball(lp, sx * 0.036, 0.012, 0.125, 0.016, 0.018, 0.018, LPC.charcoal); // orbite
  lp.push([0, 0, -0.17], 0, Math.PI / 2).cyl(0, 0, 0, 0.007, 0.01, 0.25, 4, b, { jitter: 0 }).pop(); // spina
  for (let k = 0; k < 5; k++) {
    const z = 0.05 - k * 0.04, len = 0.075 - k * 0.01;
    for (const sx of [-1, 1]) lp.push([0, 0.004, z], 0, 0, sx * 2.3).cyl(0, 0, 0, 0.005, 0.003, len, 3, k % 2 ? d : b, { jitter: 0 }).pop();
    lp.push([0, 0.004, z], 0, 0, 0).cyl(0, 0, 0, 0.004, 0.002, 0.03 - k * 0.003, 3, d, { jitter: 0 }).pop(); // spina dorsale
  }
  const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.lineTo(0.06, -0.08); tail.lineTo(0, -0.05); tail.lineTo(-0.06, -0.08); tail.closePath();
  lp.push([0, 0, -0.16], 0, 0, Math.PI / 2).push([0, 0, 0], 0, -Math.PI / 2).plate(tail, 0.006, d, { ao: 0 }).pop().pop();
};

/** Spruzzo: gocciolina d'acqua. */
const drop = (lp: LP) => ball(lp, 0, 0, 0, 0.018, 0.024, 0.018, '#c9e2df');

const lilyPad = (flower: boolean) => (lp: LP) => {
  const s = new THREE.Shape();
  const n = 9;
  s.moveTo(0, 0);
  for (let i = 0; i <= n; i++) { const a = 0.35 + (i / n) * (Math.PI * 2 - 0.7); s.lineTo(Math.cos(a) * 0.16, Math.sin(a) * 0.16); }
  s.closePath();
  lp.push([0, 0, 0], 0, -Math.PI / 2).plate(s, 0.012, LPC.leaf, { ao: 0, vary: 0.08 }).pop();
  if (flower) {
    for (let i = 0; i < 6; i++) lp.push([-0.04, 0.02, 0.02], (i / 6) * Math.PI * 2, 0.7).blob(0, 0.035, 0, 0.018, 0.045, 0.01, '#e7b6c4', { jitter: 0, ao: 0 }).pop();
    ball(lp, -0.04, 0.04, 0.02, 0.015, 0.015, 0.015, LPC.gold);
  }
};

const reedClump = (seed: number) => (lp: LP) => {
  const r = createRng(`reed:${seed}`);
  for (let i = 0; i < 5; i++) {
    const h = 0.45 + r.next() * 0.35;
    lp.push([r.range(-0.08, 0.08), 0, r.range(-0.08, 0.08)], r.range(0, 6), r.range(-0.12, 0.12));
    lp.cyl(0, 0, 0, 0.012, 0.006, h, 3, i % 2 ? LPC.dryDark : '#5c6b3a', { jitter: 0 });
    if (i % 2 === 0) lp.cyl(0, h * 0.72, 0, 0.024, 0.024, 0.12, 5, LPC.woodDark, { jitter: 0 });
    else lp.push([0, h * 0.5, 0], 0, 0, 0.5).cyl(0, 0, 0, 0.018, 0.0, 0.28, 3, '#5c6b3a', { jitter: 0 }).pop(); // foglia
    lp.pop();
  }
};

const frog = (lp: LP) => {
  ball(lp, 0, 0.05, 0, 0.07, 0.05, 0.08, '#6f8f45');
  for (const s of [-1, 1]) {
    ball(lp, s * 0.04, 0.1, 0.04, 0.028, 0.028, 0.028, '#6f8f45');
    ball(lp, s * 0.045, 0.11, 0.06, 0.014, 0.016, 0.01, LPC.charcoal);
    ball(lp, s * 0.07, 0.02, 0.03, 0.03, 0.015, 0.04, '#5d7a3a');
  }
};
const frogThroat = (lp: LP) => ball(lp, 0, 0, 0, 0.04, 0.03, 0.035, '#d8d48a');

const card = (lp: LP) => {
  lp.box(0, 0, 0, 0.09, 0.006, 0.13, '#efe6d0', { jitter: 0, ao: 0 });
  lp.box(0, 0.006, 0, 0.03, 0.002, 0.04, '#8e2f2a', { jitter: 0, ao: 0 });
};

const record = (lp: LP) => {
  lp.cyl(0, 0, 0, 0.12, 0.12, 0.012, 14, '#15151a', { jitter: 0, ao: 0 });
  lp.cyl(0, 0.012, 0, 0.04, 0.04, 0.003, 10, '#9e4b45', { jitter: 0, ao: 0 });
};

const note = (double: boolean) => (lp: LP) => {
  const c = '#e8d9a8';
  ball(lp, 0, 0, 0, 0.035, 0.028, 0.012, c, { bucket: 'glow' });
  lp.box(0.03, 0, 0, 0.012, 0.13, 0.012, c, { jitter: 0, ao: 0, bucket: 'glow' });
  if (double) {
    ball(lp, 0.09, 0.02, 0, 0.035, 0.028, 0.012, c, { bucket: 'glow' });
    lp.box(0.12, 0.02, 0, 0.012, 0.13, 0.012, c, { jitter: 0, ao: 0, bucket: 'glow' });
    lp.box(0.075, 0.13, 0, 0.1, 0.022, 0.012, c, { jitter: 0, ao: 0, bucket: 'glow' });
  } else lp.push([0.035, 0.13, 0], 0, 0, -0.9).box(0.025, -0.01, 0, 0.05, 0.016, 0.012, c, { jitter: 0, ao: 0, bucket: 'glow' }).pop();
};

const orb = (c: string) => (lp: LP) => { ball(lp, 0, 0, 0, 0.045, 0.06, 0.045, c, { bucket: 'glow' }); ball(lp, 0, -0.05, 0, 0.025, 0.04, 0.025, c, { bucket: 'glow' }); };
const bubble = (c: string, glow: boolean) => (lp: LP) => ball(lp, 0, 0, 0, 0.03, 0.03, 0.03, c, glow ? { bucket: 'glow' } : {});
const ember = (c: string) => (lp: LP) => lp.blob(0, 0, 0, 0.025, 0.035, 0.025, c, { bucket: 'glow', jitter: 0, ao: 0 });

// ── Animazioni per tipo ─────────────────────────────────────────────────

function pond(v: PVis): Animated {
  const root = new THREE.Group();
  const r = createRng(`pond-anim:${v.seed}`);
  const updates: Array<(t: number) => void> = [];
  const waterY = 0.05;
  // pesci alla deriva su piccole orbite, con dondolio
  for (let i = 0; i < 3; i++) {
    const f = piece(`fish:${i}`, deadFish(['#b6b9a6', '#c9a27a', '#9fb3b0'][i]));
    const cx = r.range(-0.7, 0.7), cz = r.range(-0.35, 0.35), rad = 0.18 + r.next() * 0.2, sp = 0.12 + r.next() * 0.1, ph = r.range(0, 6);
    root.add(f);
    updates.push((t) => {
      const a = ph + t * sp;
      f.position.set(cx + Math.cos(a) * rad, waterY + Math.sin(t * 1.7 + ph) * 0.012, cz + Math.sin(a) * rad * 0.7);
      f.rotation.set(Math.sin(t * 1.3 + ph) * 0.12, -a, Math.sin(t * 1.1 + ph) * 0.15);
    });
  }
  // ninfee (alcune fiorite) che girano piano
  for (let i = 0; i < 5; i++) {
    const p = piece(`lily:${i % 2}`, lilyPad(i % 2 === 0 && i < 4));
    const x = r.range(-1.15, 1.15), z = r.range(-0.6, 0.6), ph = r.range(0, 6), s = 0.8 + r.next() * 0.5;
    p.scale.setScalar(s);
    root.add(p);
    updates.push((t) => { p.position.set(x, waterY - 0.004 + Math.sin(t * 1.2 + ph) * 0.004, z); p.rotation.y = ph + Math.sin(t * 0.25 + ph) * 0.4; });
  }
  // rana su una ninfea grande: gola che si gonfia
  {
    const g = new THREE.Group();
    const pad = piece('lily:big', lilyPad(false));
    pad.scale.setScalar(1.6);
    const fr = piece('frog', frog);
    const th = piece('frog:throat', frogThroat);
    th.position.set(0, 0.045, 0.07);
    g.add(pad, fr, th);
    g.position.set(r.range(0.6, 1.0), waterY, r.range(-0.5, -0.2));
    g.rotation.y = -0.6;
    root.add(g);
    updates.push((t) => { const k = Math.max(0, Math.sin(t * 2.4)) ** 3; th.scale.setScalar(0.6 + k * 0.9); fr.position.y = Math.max(0, Math.sin(t * 0.5)) ** 40 * 0.12; });
  }
  // ciuffi di canne sulla sponda che ondeggiano
  for (let i = 0; i < 4; i++) {
    const c = piece(`reeds:${i % 3}`, reedClump(i % 3));
    const a = r.range(0, Math.PI * 2), ph = r.range(0, 6);
    c.position.set(Math.cos(a) * 1.55, 0, -Math.sin(a) * 1.05);
    root.add(c);
    updates.push((t) => { c.rotation.z = Math.sin(t * 1.3 + ph) * 0.07; c.rotation.x = Math.sin(t * 0.9 + ph) * 0.04; });
  }
  // pesci scheletrici che ogni tanto saltano fuori dall'acqua: arco, schizzi, cerchi dove rientrano
  for (let i = 0; i < 2; i++) {
    const f = piece('bonefish', boneFish);
    f.scale.setScalar(1.7);
    f.traverse((o) => { o.castShadow = true; }); // in volo, la sua ombra sull'acqua dice quanto è alto
    const mk = () => {
      const mat = new THREE.MeshBasicMaterial({ color: '#cfe6e2', transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 20).rotateX(-Math.PI / 2), mat);
      m.renderOrder = 3;
      root.add(m);
      return { m, mat };
    };
    const rings = [mk(), mk()];
    const drops = Array.from({ length: 5 }, () => { const o = piece('drop', drop); root.add(o); return o; });
    root.add(f);
    const period = 6.5 + i * 2.7 + r.next() * 1.5, offset = r.range(0, period), seed = r.int(1000);
    const DUR = 1.05;
    updates.push((t) => {
      const c = Math.floor((t + offset) / period), local = (t + offset) - c * period;
      // ogni salto parte da un punto diverso del laghetto, sempre dentro l'acqua
      const h = (k: number) => { const x = Math.sin((c * 7.13 + seed + k * 3.7) * 12.9898) * 43758.5453; return x - Math.floor(x); };
      const ax = (h(1) - 0.5) * 1.5, az = (h(2) - 0.5) * 0.7, yaw = h(3) * Math.PI * 2, len = 0.55 + h(4) * 0.3;
      const bx = THREE.MathUtils.clamp(ax + Math.sin(yaw) * len, -1.15, 1.15), bz = THREE.MathUtils.clamp(az + Math.cos(yaw) * len, -0.6, 0.6);
      const s = local / DUR;
      f.visible = s < 1;
      if (s < 1) {
        const hgt = 0.42 + h(5) * 0.18;
        f.position.set(ax + (bx - ax) * s, waterY - 0.06 + (hgt + 0.06) * Math.sin(s * Math.PI), az + (bz - az) * s);
        f.rotation.set(0, 0, 0);
        f.rotation.y = Math.atan2(bx - ax, bz - az);
        f.rotateX(-Math.atan2((hgt + 0.06) * Math.PI * Math.cos(s * Math.PI), Math.hypot(bx - ax, bz - az)) * 0.85);
        f.rotateZ(Math.sin(t * 18) * 0.15);
      }
      // cerchi: dove esce e dove rientra
      const ring = (g: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial }, x: number, z: number, k: number) => {
        g.m.visible = k >= 0 && k < 1;
        if (!g.m.visible) return;
        g.m.position.set(x, waterY + 0.007, z);
        g.m.scale.setScalar(0.04 + k * 0.28);
        g.mat.opacity = 0.7 * (1 - k);
      };
      ring(rings[0], ax, az, local / 1.4);
      ring(rings[1], bx, bz, (local - DUR) / 1.6);
      // schizzi all'arrivo
      const k = (local - DUR * 0.92) / 0.5;
      drops.forEach((o, j) => {
        o.visible = k >= 0 && k < 1;
        if (!o.visible) return;
        const a = (j / drops.length) * Math.PI * 2 + c;
        const d = 0.05 + k * 0.16;
        o.position.set(bx + Math.cos(a) * d, waterY + Math.sin(k * Math.PI) * 0.14, bz + Math.sin(a) * d);
        o.scale.setScalar(1 - k * 0.6);
      });
    });
  }
  // cerchi nell'acqua che si allargano e svaniscono
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: '#b8d6d2', transparent: true, opacity: 0.5, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 20).rotateX(-Math.PI / 2), mat);
    ring.renderOrder = 3;
    const x = r.range(-0.9, 0.9), z = r.range(-0.5, 0.5), ph = i * 1.1;
    ring.position.set(x, waterY + 0.006, z);
    root.add(ring);
    updates.push((t) => { const k = ((t + ph) % 3.3) / 3.3; ring.scale.setScalar(0.05 + k * 0.32); mat.opacity = 0.55 * (1 - k); });
  }
  return { root, update: (t) => { for (const u of updates) u(t); } };
}

function zombiesPlay(): Animated {
  const root = new THREE.Group();
  const c = piece('card', card);
  root.add(c);
  // una carta vola a turno dalla mano di un giocatore al centro del tavolo
  return {
    root, update: (t) => {
      const cycle = 2.6, k = (t % cycle) / cycle, who = Math.floor(t / cycle) % 2 ? 1 : -1;
      const fly = Math.min(1, k / 0.45);
      const x = who * 0.5 * (1 - fly), y = 0.62 + Math.sin(fly * Math.PI) * 0.25 - fly * 0.155;
      c.position.set(x + (fly >= 1 ? 0.03 * who : 0), y, 0.02 * who);
      c.rotation.set(0, fly * 1.5 * who, (1 - fly) * Math.PI * who + fly * Math.PI * 2 * who);
      c.visible = k < 0.9;
    },
  };
}

function zombiesDance(): Animated {
  const root = new THREE.Group();
  const rec = piece('record', record);
  rec.position.set(-0.7, 0.235, -0.7);
  root.add(rec);
  const notes = [0, 1, 2, 3].map((i) => { const n = piece(`note:${i % 2}`, note(i % 2 === 1)); root.add(n); return n; });
  return {
    root, update: (t) => {
      rec.rotation.y = -t * 3.5;
      notes.forEach((n, i) => {
        const k = ((t * 0.45 + i / notes.length) % 1);
        n.position.set(-0.55 + Math.sin(k * 6 + i) * 0.12 + k * 0.25, 0.55 + k * 0.9, -0.45 + k * 0.25);
        n.rotation.set(0, 0.6, Math.sin(k * 8 + i) * 0.3);
        n.scale.setScalar(Math.sin(k * Math.PI) * 1.3);
      });
    },
  };
}

function wisps(color: string, n: number, radius: number, y: number): Animated {
  const root = new THREE.Group();
  const os = Array.from({ length: n }, (_, i) => { const o = piece(`orb:${color}`, orb(color)); root.add(o); return { o, ph: (i / n) * Math.PI * 2 }; });
  return {
    root, update: (t) => {
      for (const { o, ph } of os) {
        const a = ph + t * 0.8;
        o.position.set(Math.cos(a) * radius, y + Math.sin(t * 2 + ph) * 0.08, Math.sin(a) * radius);
        o.scale.setScalar(0.8 + Math.sin(t * 5 + ph) * 0.2);
      }
    },
  };
}

/** Bolle (pozza tossica, fango) o scintille (buco infernale) che salgono e spariscono. */
function rising(kind: 'bubble' | 'ember', color: string, n: number, spread: [number, number], height: number, seed: number, glow = true): Animated {
  const root = new THREE.Group();
  const r = createRng(`rise:${kind}:${seed}`);
  const ps = Array.from({ length: n }, () => {
    const o = piece(`${kind}:${color}`, kind === 'bubble' ? bubble(color, glow) : ember(color));
    root.add(o);
    return { o, x: r.range(-spread[0], spread[0]), z: r.range(-spread[1], spread[1]), ph: r.next(), sp: 0.3 + r.next() * 0.4 };
  });
  return {
    root, update: (t) => {
      for (const p of ps) {
        const k = (t * p.sp + p.ph) % 1;
        if (kind === 'bubble') {
          p.o.position.set(p.x, 0.03 + k * height, p.z);
          p.o.scale.setScalar(k < 0.85 ? 0.4 + k : (1 - k) * 8);
        } else {
          p.o.position.set(p.x + Math.sin(t * 3 + p.ph * 9) * 0.06, 0.1 + k * height, p.z + Math.cos(t * 2.5 + p.ph * 7) * 0.06);
          p.o.scale.setScalar((1 - k) * 1.2);
        }
      }
    },
  };
}

const VAPOR_GEO = new THREE.IcosahedronGeometry(1, 1);

/** Pozza avvelenata: bolle che salgono e scoppiano lasciando un cerchio, e un filo di vapore verde. */
function toxic(seed: number): Animated {
  const bub = rising('bubble', '#c8f07c', 6, [0.5, 0.18], 0.12, seed);
  const root = bub.root;
  const r = createRng(`toxic:${seed}`);
  const pops = Array.from({ length: 3 }, (_, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: '#d8f59a', transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 16).rotateX(-Math.PI / 2), mat);
    m.renderOrder = 3;
    root.add(m);
    return { m, mat, x: r.range(-0.45, 0.45), z: r.range(-0.15, 0.15), ph: i / 3, sp: 0.4 + r.next() * 0.2 };
  });
  // vapore: sbuffi semitrasparenti che salgono, si allargano e svaniscono
  const puffs = Array.from({ length: 4 }, (_, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: '#b9e27a', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const o = new THREE.Mesh(VAPOR_GEO, mat);
    root.add(o);
    return { o, mat, x: r.range(-0.4, 0.4), z: r.range(-0.12, 0.12), ph: i / 4 };
  });
  return {
    root, update: (t) => {
      bub.update(t);
      for (const p of pops) {
        const k = (t * p.sp + p.ph) % 1;
        p.m.position.set(p.x, 0.03, p.z);
        p.m.scale.setScalar(0.02 + k * 0.12);
        p.mat.opacity = 0.6 * (1 - k);
      }
      for (const p of puffs) {
        const k = (t * 0.22 + p.ph) % 1;
        p.o.position.set(p.x + Math.sin(t * 0.9 + p.ph * 6) * 0.06, 0.06 + k * 0.55, p.z);
        p.o.scale.set(0.035 + k * 0.07, 0.03 + k * 0.045, 0.035 + k * 0.07);
        p.mat.opacity = 0.26 * Math.sin(k * Math.PI);
      }
    },
  };
}

const leaf = (c: string) => (lp: LP) => lp.blob(0, 0, 0, 0.045, 0.008, 0.03, c, { jitter: 0, ao: 0 });
const firefly = (lp: LP) => { ball(lp, 0, 0, 0, 0.018, 0.018, 0.018, '#e9f59a', { bucket: 'glow' }); };
const butterfly = (c: string) => (lp: LP) => {
  ball(lp, 0, 0, 0, 0.008, 0.008, 0.03, LPC.charcoal);
  for (const s of [-1, 1]) lp.push([s * 0.004, 0, 0], 0, 0, 0, [s, 1, 1]).blob(0.03, 0, 0.005, 0.03, 0.004, 0.026, c, { jitter: 0, ao: 0 }).pop();
};

/** Foglie che si staccano dai rami e scendono ondeggiando. */
function fallingLeaves(seed: number, n: number, top: number, spread: number): Animated {
  const root = new THREE.Group();
  const r = createRng(`leaves:${seed}`);
  const ls = Array.from({ length: n }, (_, i) => {
    const o = piece(`leaf:${i % 4}`, leaf(LPC.leafAutumn[i % LPC.leafAutumn.length]));
    root.add(o);
    return { o, x: r.range(-spread, spread), z: r.range(-spread, spread), ph: r.next(), sp: 0.08 + r.next() * 0.06 };
  });
  return {
    root, update: (t) => {
      for (const l of ls) {
        const k = (t * l.sp + l.ph) % 1;
        l.o.position.set(l.x + Math.sin(t * 2 + l.ph * 9) * 0.15, top * (1 - k) + 0.01, l.z + Math.cos(t * 1.6 + l.ph * 7) * 0.1);
        l.o.rotation.set(Math.sin(t * 3 + l.ph * 5) * 0.8, t + l.ph * 6, Math.cos(t * 2.5 + l.ph) * 0.6);
        l.o.visible = k < 0.97;
      }
    },
  };
}

/** Lucciole (o farfalle) che vagano lente sopra cespugli, erba e aiuole. */
function flyers(make: (i: number) => THREE.Group, n: number, spread: number, y: number, seed: number, flap: boolean): Animated {
  const root = new THREE.Group();
  const r = createRng(`fly:${seed}`);
  const fs = Array.from({ length: n }, (_, i) => { const o = make(i); root.add(o); return { o, ph: r.range(0, 6.28), sp: 0.3 + r.next() * 0.3 }; });
  return {
    root, update: (t) => {
      for (const f of fs) {
        const a = t * f.sp + f.ph;
        f.o.position.set(Math.cos(a) * spread * Math.sin(a * 0.7 + f.ph), y + Math.sin(a * 1.9) * 0.12, Math.sin(a * 1.3) * spread);
        if (flap) { f.o.rotation.y = -a; f.o.scale.set(Math.abs(Math.sin(t * 14 + f.ph)) * 0.8 + 0.2, 1, 1); }
        else f.o.scale.setScalar(0.6 + Math.max(0, Math.sin(t * 3 + f.ph)) * 0.8);
      }
    },
  };
}

// ── Spaventapasseri ─────────────────────────────────────────────────────

/** Corvo (verso +z): corpo, testa, becco, occhi rossi accesi, coda e zampette. Le ali sono a parte. */
const crowBody = (lp: LP) => {
  const ink = '#24242c';
  ball(lp, 0, 0.065, 0, 0.06, 0.055, 0.09, ink);
  ball(lp, 0, 0.13, 0.07, 0.045, 0.043, 0.045, ink);
  lp.push([0, 0.122, 0.11], 0, Math.PI / 2).cyl(0, 0, 0, 0.015, 0.002, 0.05, 4, '#4a4a52', { jitter: 0, ao: 0 }).pop();
  for (const s of [-1, 1]) ball(lp, s * 0.026, 0.14, 0.1, 0.009, 0.009, 0.006, '#e0573a', { bucket: 'glow' });
  lp.push([0, 0.07, -0.085], 0, -0.35).box(0, 0, 0, 0.05, 0.012, 0.09, ink, { jitter: 0, ao: 0 }).pop();
  for (const s of [-1, 1]) lp.cyl(s * 0.02, 0, 0.01, 0.005, 0.005, 0.03, 3, '#4a4a52', { jitter: 0, ao: 0 });
};
const crowWing = (lp: LP) => ball(lp, 0, 0, -0.02, 0.012, 0.045, 0.075, '#2c2c36');

/**
 * Testa che segue il Custode (si gira piano, anche del tutto: è un palo) e un
 * corvo che ogni tanto arriva in volo, si posa sulla manica, si guarda attorno e riparte.
 */
function scarecrow(lit: boolean): Animated {
  const root = new THREE.Group();
  const head = piece(`scarecrowHead:${lit ? 1 : 0}`, (lp) => scarecrowHead(lp, lit));
  head.position.y = SCARECROW_NECK;
  const crow = new THREE.Group();
  crow.add(piece('crow', crowBody));
  const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.add(piece('crowWing', crowWing)); w.position.set(s * 0.055, 0.09, 0.0); crow.add(w); return w; });
  root.add(head, crow);
  const from = SCARECROW_PERCH.clone().add(new THREE.Vector3(1.8, 1.7, -1.2)), to = SCARECROW_PERCH.clone().add(new THREE.Vector3(-1.9, 1.9, -1.0));
  const local = new THREE.Vector3(), at = new THREE.Vector3();
  let target: THREE.Vector3 | null = null, yaw = 0, last = -1;
  const PERIOD = 46, IN = 3, OUT = 24, GONE = 27;
  const fly = (a: THREE.Vector3, b: THREE.Vector3, k: number, t: number) => {
    const e = k * k * (3 - 2 * k);
    at.lerpVectors(a, b, e); at.y += Math.sin(k * Math.PI) * 0.35;
    crow.position.copy(at);
    crow.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0);
    for (const [i, w] of wings.entries()) w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 22) * 0.9);
  };
  return {
    root,
    watch: (p) => { target = p; },
    update: (t) => {
      const dt = last < 0 ? 0 : THREE.MathUtils.clamp(t - last, 0, 0.1);
      last = t;
      // la testa: verso il Custode se è vicino, altrimenti si guarda attorno piano
      let want = Math.sin(t * 0.21) * 0.7;
      if (target) {
        local.copy(target);
        root.worldToLocal(local);
        if (Math.hypot(local.x, local.z) < 9) want = Math.atan2(local.x, local.z);
      }
      let d = want - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * Math.min(1, dt * 2.2);
      head.rotation.set(0, yaw, Math.sin(t * 0.6) * 0.05);
      // il corvo
      const c = ((t % PERIOD) + PERIOD) % PERIOD;
      crow.visible = c < GONE;
      if (c < IN) fly(from, SCARECROW_PERCH, c / IN, t);
      else if (c < OUT) {
        crow.position.copy(SCARECROW_PERCH);
        crow.position.y += Math.abs(Math.sin(t * 1.3)) * 0.01;
        crow.rotation.set(0, -0.6 + Math.round(Math.sin(t * 0.4) * 1.5) * 0.6, 0); // si gira a scatti
        for (const [i, w] of wings.entries()) w.rotation.z = (i ? -1 : 1) * 0.1;
      } else if (c < GONE) fly(SCARECROW_PERCH, to, (c - OUT) / (GONE - OUT), t);
    },
  };
}

/** Parti animate per un oggetto del catalogo (solo stile low-poly). */
export function createAnimated(v: PVis): Animated | null {
  switch (v.type) {
    case 'pond': return pond(v);
    case 'zombies_play': return zombiesPlay();
    case 'zombies_dance': return zombiesDance();
    case 'scarecrow': return scarecrow(v.lit);
    case 'toxic_puddle': return toxic(v.seed);
    case 'mud': return rising('bubble', '#5a4a3a', 2, [0.2, 0.2], 0.06, v.seed, false);
    case 'dead_tree': return fallingLeaves(v.seed, 4, 1.9, 0.6);
    case 'spectral_tree': return v.lit ? wisps('#9fe0d0', 4, 0.95, 1.4) : null;
    case 'bushes': return flyers(() => piece('firefly', firefly), 4, 0.7, 0.75, v.seed, false);
    case 'tall_grass': return flyers(() => piece('firefly', firefly), 3, 0.35, 0.5, v.seed, false);
    case 'flowerbed': return flyers((i) => piece(`butterfly:${i % 3}`, butterfly(['#e8c27a', '#c9a7d9', '#e8e0d0'][i % 3])), 3, 0.5, 0.45, v.seed, true);
    case 'hell_hole': return v.lit && !v.broken ? rising('ember', '#ffb347', 10, [0.4, 0.4], 1.4, v.seed) : null;
    default: return null;
  }
}
