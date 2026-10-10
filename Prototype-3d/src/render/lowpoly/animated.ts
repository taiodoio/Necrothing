// Parti animate degli oggetti low-poly: piccoli gruppi di mesh agganciati
// all'oggetto (ereditano posizione e rotazione) e aggiornati a ogni frame.
// Lo stagno ha pesci morti a pancia in su che galleggiano alla deriva,
// ninfee, canne che ondeggiano, cerchi nell'acqua e una rana; le "case"
// delle presenze hanno carte che volano, un disco che gira con le note, una
// mano che saluta dalla tomba, fuochi fatui; pozze e buchi fanno bolle e
// scintille. Le geometrie si costruiscono una volta sola e si condividono.

import * as THREE from 'three';
import { LP } from './kit.ts';
import { LPC } from './palette.ts';
import { instantiate, LOWPOLY_MATERIALS, type CachedModel } from '../modelCache.ts';
import { createRng } from '../../game/rng.ts';
import type { PVis } from '../models/types.ts';

export interface Animated {
  root: THREE.Group;
  update(t: number): void;
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

const zombieHand = (lp: LP) => {
  const g = '#a4c487';
  lp.cyl(0, -0.1, 0, 0.045, 0.04, 0.24, 6, '#5d6449', { jitter: 0 }); // manica
  ball(lp, 0, 0.17, 0, 0.055, 0.05, 0.035, g);
  for (let i = 0; i < 4; i++) lp.push([-0.036 + i * 0.024, 0.2, 0], 0, 0, -0.25 + i * 0.16).cyl(0, 0, 0, 0.012, 0.01, 0.075, 5, g, { jitter: 0 }).pop();
  lp.push([0.05, 0.16, 0], 0, 0, -1.0).cyl(0, 0, 0, 0.012, 0.01, 0.05, 5, g, { jitter: 0 }).pop();
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

function zombieWalker(): Animated {
  const root = new THREE.Group();
  const h = piece('zhand', zombieHand);
  h.position.set(0.05, 0.08, 0.1);
  h.scale.setScalar(1.5);
  root.add(h);
  return { root, update: (t) => { h.rotation.z = Math.sin(t * 3) * 0.35; h.rotation.x = -0.2 + Math.sin(t * 1.3) * 0.1; h.position.y = 0.06 + Math.max(0, Math.sin(t * 0.7)) * 0.05; } };
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

/** Parti animate per un oggetto del catalogo (solo stile low-poly). */
export function createAnimated(v: PVis): Animated | null {
  switch (v.type) {
    case 'pond': return pond(v);
    case 'zombies_play': return zombiesPlay();
    case 'zombies_dance': return zombiesDance();
    case 'zombie_walker': return zombieWalker();
    case 'ghosts_roam': return wisps(LPC.spectral, 3, 0.38, 0.55);
    case 'toxic_puddle': return rising('bubble', '#c8f07c', 6, [0.7, 0.3], 0.18, v.seed);
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
