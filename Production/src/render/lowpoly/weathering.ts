// Degrado comune a tutti gli oggetti che si sporcano e si rompono, in aggiunta
// a quello di ciascun modello (che resta): così "sporco" e "rotto" si leggono
// sempre, anche su staccionate, edifici e lampioni.
//  · Sporco: chiazze di sporcizia e umidità che sale dal basso, muschio sulle
//    facce rivolte in alto, erbacce e foglie secche alla base, una ragnatela.
//  · Rotto: tutto più scuro e fuligginoso, crepe e assi inchiodate a croce sul
//    davanti degli edifici, macerie (sassi e assi spezzate) a terra.

import * as THREE from 'three';
import { hash3 } from '../../game/rng.ts';
import type { PlaceableCategory } from '../../game/catalog.ts';
import type { PVis } from '../types.ts';
import { LP, irregularShape, type LPModel } from './kit.ts';
import { cobweb, crack, deadLeaves, grassTuft, weeds } from './details.ts';
import { LPC } from './palette.ts';

const GRIME = new THREE.Color('#3b3428');
const SOOT = new THREE.Color('#1f1c1a');
const MOSS = new THREE.Color('#5a6b40');
/** Le assi a croce solo su edifici e archi: muretti, staccionate e fosse mostrano già il loro modo di rompersi. */
const NO_BOARDS = new Set(['wall_stone', 'fence_wood', 'fence_iron', 'open_grave']);

/** Rumore a chiazze (valore interpolato su una griglia) in 0..1. */
function blotch(x: number, y: number, z: number, scale: number, seed: number): number {
  const fx = x * scale, fy = y * scale, fz = z * scale;
  const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
  const tx = fx - ix, ty = fy - iy, tz = fz - iz;
  const s = (t: number) => t * t * (3 - 2 * t);
  const h = (a: number, b: number, c: number) => hash3(ix + a, iy + b, iz + c, seed);
  const lerp = THREE.MathUtils.lerp;
  const x00 = lerp(h(0, 0, 0), h(1, 0, 0), s(tx)), x10 = lerp(h(0, 1, 0), h(1, 1, 0), s(tx));
  const x01 = lerp(h(0, 0, 1), h(1, 0, 1), s(tx)), x11 = lerp(h(0, 1, 1), h(1, 1, 1), s(tx));
  return lerp(lerp(x00, x10, s(ty)), lerp(x01, x11, s(ty)), s(tz));
}

/** Sporca i colori di una geometria (triangoli separati: un colore per faccia). */
function grime(g: THREE.BufferGeometry, broken: boolean, height: number, seed: number) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), ctr = new THREE.Vector3();
  const tmp = new THREE.Color();
  const damp = Math.min(0.7, Math.max(0.25, height * 0.45)); // fin dove sale l'umidità
  for (let i = 0; i + 2 < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    ctr.copy(a).add(b).add(c).divideScalar(3);
    n.copy(c).sub(b).cross(a.clone().sub(b)).normalize();
    const low = 1 - THREE.MathUtils.smoothstep(ctr.y, 0, damp);
    const patch = THREE.MathUtils.smoothstep(blotch(ctr.x, ctr.y, ctr.z, 3.2, seed), 0.42, 0.7);
    const k = (broken ? 0.62 : 0.46) * Math.max(low, patch);
    const up = n.y > 0.55 && ctr.y > 0.05 ? THREE.MathUtils.smoothstep(blotch(ctr.x, ctr.y, ctr.z, 4.5, seed + 9), 0.35, 0.6) * (broken ? 0.6 : 0.5) : 0;
    const soot = broken ? THREE.MathUtils.smoothstep(blotch(ctr.x, ctr.y, ctr.z, 2.3, seed + 31), 0.55, 0.75) * 0.55 : 0;
    for (let v = i; v < i + 3; v++) {
      tmp.fromBufferAttribute(col, v);
      if (broken) { const hsl = { h: 0, s: 0, l: 0 }; tmp.getHSL(hsl); tmp.setHSL(hsl.h, hsl.s * 0.7, hsl.l * 0.86); }
      tmp.lerp(GRIME, k).lerp(MOSS, up).lerp(SOOT, soot);
      col.setXYZ(v, tmp.r, tmp.g, tmp.b);
    }
  }
  col.needsUpdate = true;
}

/** Unisce due modelli bucket per bucket (geometrie non indicizzate, posizione + colore). */
function merge(a: LPModel, b: LPModel): LPModel {
  const geometries = { ...a.geometries };
  for (const [k, gb] of Object.entries(b.geometries) as Array<[keyof LPModel['geometries'], THREE.BufferGeometry | undefined]>) {
    if (!gb) continue;
    const ga = geometries[k];
    if (!ga) { geometries[k] = gb; continue; }
    const g = new THREE.BufferGeometry();
    for (const attr of ['position', 'color'] as const) {
      const x = ga.attributes[attr].array as Float32Array, y = gb.attributes[attr].array as Float32Array;
      const out = new Float32Array(x.length + y.length);
      out.set(x); out.set(y, x.length);
      g.setAttribute(attr, new THREE.BufferAttribute(out, 3));
    }
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    geometries[k] = g;
  }
  return { geometries, lights: [...a.lights, ...b.lights] };
}

/**
 * Aggiunge il degrado comune a un oggetto sporco o rotto.
 * `fp` è l'ingombro in celle; il davanti dei modelli guarda verso +z.
 */
export function weathered(m: LPModel, v: PVis, fp: [number, number], category: PlaceableCategory): LPModel {
  if (!v.dirty && !v.broken) return m;
  const seed = Math.floor(hash3(v.seed, v.variant, v.type.length, 77) * 1e6);
  const box = new THREE.Box3();
  for (const g of Object.values(m.geometries)) { if (!g) continue; g.computeBoundingBox(); box.union(g.boundingBox!); }
  const size = box.getSize(new THREE.Vector3());
  const path = v.type.startsWith('path_');
  for (const k of ['solid', 'gloss'] as const) { const g = m.geometries[k]; if (g) grime(g, v.broken, size.y, seed); }

  const lp = new LP(`degrado:${v.type}:${v.seed}:${+v.dirty}${+v.broken}`);
  const r = lp.rng;
  // tutto ciò che si aggiunge a terra resta dentro l'ingombro (con un margine per i ciuffi)
  const mx = fp[0] / 2 - 0.22, mz = fp[1] / 2 - 0.22;
  const hx = Math.min(mx, Math.max(0.25, size.x / 2 + 0.1)), hz = Math.min(mz, Math.max(0.25, size.z / 2 + 0.1));
  const cx = THREE.MathUtils.clamp((box.min.x + box.max.x) / 2, -(mx - hx), mx - hx), cz = THREE.MathUtils.clamp((box.min.z + box.max.z) / 2, -(mz - hz), mz - hz);
  // a terra: foglie secche ed erbacce lungo il bordo (sui sentieri crescono tra le pietre)
  deadLeaves(lp, cx - hx, cz - hz, cx + hx, cz + hz, Math.round(6 + hx * hz * (v.broken ? 26 : 16)));
  const tufts = Math.round((path ? 3 : 4) + (hx + hz) * (v.broken ? 3 : 2));
  for (let i = 0; i < tufts; i++) {
    const t = r.next(), side = r.int(4);
    const [x, z] = side === 0 ? [cx - hx + t * 2 * hx, cz + hz] : side === 1 ? [cx - hx + t * 2 * hx, cz - hz] : side === 2 ? [cx - hx, cz - hz + t * 2 * hz] : [cx + hx, cz - hz + t * 2 * hz];
    if (r.chance(0.5)) weeds(lp, x * 0.92, z * 0.92, 0.8 + r.next() * 0.5);
    else grassTuft(lp, x * 0.92, z * 0.92, 0.9 + r.next() * 0.5, ['#6b6242', '#7d7048', '#55603a']);
  }
  // pozze di fango scuro
  for (let i = 0; i < (v.broken ? 4 : 2); i++) {
    lp.push([cx + r.range(-hx, hx) * 0.8, 0.004, cz + r.range(-hz, hz) * 0.8], r.range(0, 6), -Math.PI / 2)
      .plate(irregularShape(r, 0.1 + r.next() * 0.08, 7), 0.004, '#2f2a22', { ao: 0, vary: 0.08 }).pop();
  }
  // erba alta che cresce attorno all'oggetto trascurato (più fitta e più alta da rotto)
  const ring = Math.round((path ? 4 : 6) + (hx + hz) * (v.broken ? 5 : 3));
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + r.range(-0.2, 0.2);
    const k = Math.min(1 / Math.abs(Math.cos(a)), 1 / Math.abs(Math.sin(a)));
    const out = r.range(0.76, 0.9); // dentro l'ingombro: non invade le celle vicine
    const x = cx + Math.cos(a) * k * hx * out, z = cz + Math.sin(a) * k * hz * out;
    grassTuft(lp, x, z, (v.broken ? r.range(2.1, 3) : r.range(1.4, 2)) * (path ? 0.7 : 1), r.chance(0.3) ? ['#6b6242', '#7d7048', '#55603a'] : undefined, v.broken ? 9 + r.int(5) : 6 + r.int(4));
  }

  // per ragnatele, crepe e assi serve la superficie vera: un raggio dal davanti (+z) trova il muro
  const solid = m.geometries.solid;
  const hit = solid ? new THREE.Mesh(solid, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })) : null;
  const ray = new THREE.Raycaster();
  const back = new THREE.Vector3(0, 0, -1);
  const wallZ = (x: number, y: number): number | null => {
    if (!hit) return null;
    ray.set(new THREE.Vector3(x, y, box.max.z + 1), back);
    const h = ray.intersectObject(hit, false)[0];
    return h ? h.point.z : null;
  };
  const tall = size.y > 0.75 && !path;
  if (tall && size.x > 0.6) {
    // ragnatela: solo dove tutta la sua superficie poggia su una parete piatta (angolo, punte dei fili
    // e metà dei fili tutti alla stessa profondità); si preferiscono i punti alti vicino agli spigoli
    const size0 = Math.min(0.22, size.x * 0.2);
    const flat = (x: number, y: number, z: number, flip: boolean) => {
      const sx = flip ? -1 : 1;
      for (const a of [0, Math.PI / 6, Math.PI / 3, Math.PI / 2]) for (const k of [0.5, 1]) {
        const zz = wallZ(x + Math.sin(a) * size0 * k * sx, y - Math.cos(a) * size0 * k);
        if (zz === null || Math.abs(zz - z) > 0.03) return false;
      }
      return true;
    };
    let web: { x: number; y: number; z: number; flip: boolean } | null = null;
    for (let fy = 0.85; fy >= 0.35 && !web; fy -= 0.05) {
      for (const fx of [0.08, 0.92, 0.16, 0.84, 0.25, 0.75, 0.35, 0.65]) {
        const x = box.min.x + size.x * fx, y = box.min.y + size.y * fy;
        const z = wallZ(x, y);
        if (z === null) continue;
        const flip = fx > 0.5; // i fili si aprono verso il centro
        if (flat(x, y, z, flip)) { web = { x, y, z: z + 0.008, flip }; break; }
      }
    }
    if (web) cobweb(lp, web.x, web.y, web.z, size0, web.flip);
  }
  if (v.broken) {
    // macerie: sassi, schegge e assi spezzate davanti
    for (let i = 0; i < 6 + Math.round(hx * 4); i++) {
      const s = 0.04 + r.next() * 0.06;
      lp.blob(cx + r.range(-hx, hx) * 0.85, s * 0.4, cz + hz * r.range(0.4, 0.85), s, s * 0.6, s * 0.8, r.pick([LPC.stone, LPC.stoneDark, LPC.stoneWarm]), { vary: 0.12 });
    }
    for (let i = 0; i < 2 + Math.round(hx * 2); i++) {
      lp.push([cx + r.range(-hx, hx) * 0.6, 0.02, cz + hz * r.range(0.3, 0.7)], r.range(0, 6.28), 0, r.range(-0.15, 0.15))
        .box(0, 0, 0, 0.06, 0.025, 0.18 + r.next() * 0.17, r.pick([LPC.wood, LPC.woodDark]), { vary: 0.1 }).pop();
    }
    if (tall && category === 'structure' && size.y > 1.2 && !NO_BOARDS.has(v.type)) {
      // crepe sul muro vero
      for (const [fx, fy, len] of [[-0.28, 0.72, 0.3], [0.3, 0.5, 0.22]] as const) {
        const x = cx + size.x * fx, y = box.min.y + size.y * fy, z = wallZ(x, y);
        if (z !== null) crack(lp, x, y, z + 0.008, Math.min(0.6, size.y * len));
      }
      // due assi a croce inchiodate ai due lati (stipiti, pilastri): solo se entrambi i lati sono sullo stesso piano
      const w = Math.min(size.x * 0.55, 1.1), y = box.min.y + Math.min(size.y * 0.36, 0.6);
      const zl = wallZ(cx - w * 0.45, y - 0.12), zr = wallZ(cx + w * 0.45, y + 0.12), zc = wallZ(cx, y);
      if (zl !== null && zr !== null && Math.abs(zl - zr) < 0.12) {
        const zf = Math.max(zl, zr) + 0.03;
        if (zc === null || zc < zf + 0.03) {
          for (const s of [-1, 1]) {
            lp.push([cx, y, zf], 0, 0, s * 0.55).box(0, -0.05, 0, w, 0.1, 0.03, '#7a5c42', { vary: 0.12, ao: 0 })
              .box(-w * 0.42, -0.012, 0.02, 0.025, 0.025, 0.01, LPC.iron, { jitter: 0 }).box(w * 0.42, -0.012, 0.02, 0.025, 0.025, 0.01, LPC.iron, { jitter: 0 }).pop();
          }
        }
      }
    }
  }
  hit?.material.dispose();
  return merge(m, lp.build());
}
