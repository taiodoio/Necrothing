// Testata animata dell'albero dei ricordi: l'albero di notte sul prato a
// del gioco (vedi heroScene), con qualche tomba e, dietro, un po' di cimitero. I frutti accesi
// pulsano piano, le lucciole girano attorno alla chioma, ogni tanto cade una
// foglia e un fantasma passa dietro l'albero.

import * as THREE from 'three';
import type { GraveType } from '../game/graves.ts';
import { createRng } from '../game/rng.ts';
import type { LPModel } from '../render/lowpoly/kit.ts';
import { memoryTreeLP } from '../render/lowpoly/memoryTree.ts';
import { instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { animateRig, buildRig } from '../view/characters.ts';
import { boxOf, nightHero, type HeroHandle } from './heroScene.ts';

const LEAVES = ['#5f7d6c', '#6e8f7b', '#7a9483', '#c9772f'];
/** Tombe sul prato, in fila come in un cimitero: tipo, x, z, rotazione (appena storta). */
const STONES: Array<[GraveType, number, number, number]> = [['stone_simple', -7.6, -2.6, 0.05], ['celtic_cross', -5.4, -2.6, -0.04], ['rectangular', -3.2, -2.6, 0.03], ['gothic', 4.8, -2.6, -0.05]];
/** Due lampioni accesi ai lati (solo ambientazione, non il cimitero vero). */
const BACKDROP: Array<[string, number, number, number]> = [['lamp_post_gothic', -1.6, -2.4, 0.3], ['lamp_post_gothic', 6.8, -2.4, -0.2]];

/** Il modello dell'albero (e dove stanno i frutti) per tanti ricordi: si tiene l'ultimo, così riaprendo la testata è già pronto. */
let cached: { n: number; model: LPModel; fruits: THREE.Vector3[] } | null = null;
export function treeModelFor(memories: number) {
  const n = Math.min(30, memories);
  if (cached?.n !== n) {
    if (cached) for (const g of Object.values(cached.model.geometries)) g?.dispose();
    const fruits: THREE.Vector3[] = [];
    cached = { n, model: memoryTreeLP(n, 2, fruits), fruits };
  }
  return cached;
}

/** Crea la testata per un albero con `memories` frutti accesi; si ferma quando esce dal documento. */
export function treeHeader(memories: number): HeroHandle {
  return nightHero('tree-hero', [0, 0, 3], (hero) => {
    const { scene } = hero;
    const { model: treeModel, fruits } = treeModelFor(memories);
    const tree = instantiate({ geometries: treeModel.geometries, lights: [], height: 1, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: false });
    tree.rotation.y = -0.25;
    scene.add(tree);
    const glow = 1.2 + Math.min(1, memories / 12) * 2.5;
    const canopy = new THREE.PointLight('#ffd27a', glow, 9, 1.4);
    canopy.position.set(0, 3.9, 1.4);
    const hollow = new THREE.PointLight('#ffad5a', 2.2, 3.5, 1.6);
    hollow.position.set(0, 0.6, 1.7);
    // luna sulla chioma: la cupola è fitta e scura, da sola resterebbe una macchia
    const crown = new THREE.PointLight('#aabce8', 16, 12, 1.2);
    crown.position.set(-1.8, 7.8, 5.4);
    scene.add(canopy, hollow, crown);
    for (const [type, x, z, ry] of STONES) hero.grave(type, x, z, ry);
    for (const [type, x, z, ry] of BACKDROP) hero.prop(type, x, z, ry);
    hero.backdrop(-5);
    const box = boxOf(tree);

    // un alone per ogni frutto acceso: pulsano piano, ognuno col suo passo
    const fruitHalos = fruits.map((p, i) => {
      const s = hero.halo('#ffcf73', 0.5);
      s.position.copy(p);
      tree.add(s);
      return { s, ph: i * 1.7, sp: 0.8 + (i % 5) * 0.13 };
    });
    // lucciole attorno alla chioma
    const rf = createRng(9).next;
    const flies = Array.from({ length: 12 }, () => {
      const s = hero.halo('#ffd36b', 0.9);
      s.scale.setScalar(0.24);
      scene.add(s);
      return { s, x: (rf() - 0.5) * 7, y: 0.6 + rf() * 4.4, z: (rf() - 0.5) * 3 + 0.8, ph: rf() * 6, sp: 0.3 + rf() * 0.4 };
    });
    // foglie che cadono dalla chioma, girando
    const leafGeo = new THREE.PlaneGeometry(0.2, 0.11);
    hero.track(leafGeo);
    const leaves = Array.from({ length: 6 }, (_, i) => {
      const mat = new THREE.MeshLambertMaterial({ color: LEAVES[i % LEAVES.length], side: THREE.DoubleSide });
      hero.track(mat);
      const m = new THREE.Mesh(leafGeo, mat);
      scene.add(m);
      return { m, t0: i * 1.9, life: 6 + (i % 3), x: (rf() - 0.5) * 4.4, z: 0.6 + rf() * 1.8 };
    });
    // il fantasma che ogni tanto passa sul prato, dietro l'albero
    const ghost = buildRig('ghost', 'lowpoly');
    scene.add(ghost.root);
    const GHOST_EVERY = 22, GHOST_LEN = 11, GZ = -3.8;

    hero.start(() => ({ box, fill: 1.06, sx: 0.62, base: 0.07, elev: 6 }), (t) => {
      for (const f of fruitHalos) {
        const k = 0.5 + 0.5 * Math.sin(t * f.sp + f.ph);
        (f.s.material as THREE.SpriteMaterial).opacity = 0.35 + k * 0.45;
        f.s.scale.setScalar(0.9 + k * 0.35);
      }
      canopy.intensity = glow * (0.9 + Math.sin(t * 0.9) * 0.1);
      hollow.intensity = 2.2 * (0.86 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.05);
      for (const f of flies) {
        f.s.position.set(f.x + Math.sin(t * f.sp + f.ph) * 0.9, f.y + Math.sin(t * f.sp * 1.3 + f.ph * 2) * 0.4, f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 0.6);
        (f.s.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.sin(t * 1.4 + f.ph * 3)) * 0.9;
      }
      for (const l of leaves) {
        const u = ((t + l.t0) % l.life) / l.life;
        l.m.visible = u < 0.97;
        l.m.position.set(l.x + Math.sin(u * 9 + l.t0) * 0.5 + u * 0.8, 4.6 - u * 4.55, l.z);
        l.m.rotation.set(u * 11 + l.t0, u * 7, Math.sin(u * 8) * 0.8);
      }
      const g = (t % GHOST_EVERY) / GHOST_LEN;
      ghost.root.visible = g < 1;
      if (g < 1) {
        const x = -9 + g * 18;
        ghost.root.position.set(x, 0.5 + Math.sin(t * 2) * 0.12, GZ);
        ghost.root.rotation.y = Math.PI / 2 - 0.4;
        animateRig(ghost, 'fly', t, t * 2);
      }
    });
  });
}
