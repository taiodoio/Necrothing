// Le cripte (Cripte-Lab): il generatore del laboratorio (crypts.js) tradotto nei
// gruppi di geometria del gioco. Cinque famiglie, tre varianti ciascuna, tre stati
// (integra, sporca, rotta): il degrado è già nel generatore, per questo il degrado
// comune (weathering.ts) non si applica a loro. Ogni lotto è 4 × 5 celle, col suo
// cortile, l'origine al centro a terra e il fronte verso +Z.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LightAnchor, PVis } from '../types.ts';
import { createCrypt, type CryptState } from './crypts.js';
import type { LPModel } from './kit.ts';

export const CRYPT_FAMILIES = ['zombie', 'ghost', 'skeleton', 'nature', 'supernatural'] as const;
export type CryptFamily = (typeof CRYPT_FAMILIES)[number];
/** Quante varianti ha ogni famiglia (la numero 0 è la «principale»: quella che si vede in Bottega). */
export const CRYPT_VARIANTS = 3;
/** Ingombro del lotto in celle (cripta e cortile). */
export const CRYPT_FOOTPRINT: [number, number] = [4, 5];
/** Gli id del catalogo: `crypt_zombie`, `crypt_ghost`… */
export const CRYPT_TYPES: readonly string[] = CRYPT_FAMILIES.map((f) => `crypt_${f}`);
export const isCrypt = (type: string) => CRYPT_TYPES.includes(type);

/** Da spenta, la luce resta come forma ma scura (finestre e fiammelle senza luce). */
const OFF_DIM = 0.3;

export function cryptLP(v: PVis): LPModel {
  const family = v.type.slice('crypt_'.length);
  const state: CryptState = v.broken ? 'broken' : v.dirty ? 'dirty' : 'clean';
  const variant = ((Math.floor(v.variant) % CRYPT_VARIANTS) + CRYPT_VARIANTS) % CRYPT_VARIANTS + 1;
  const root = createCrypt(family, state, { variant });
  root.updateMatrixWorld(true);
  const solid: THREE.BufferGeometry[] = [], glow: THREE.BufferGeometry[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    m.geometry.dispose();
    if (!(m.material as THREE.Material).userData.glow) { solid.push(g); return; }
    if (v.lit) { glow.push(g); return; }
    // spenta: le stesse forme, scure, tra le superfici normali
    const col = g.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < col.array.length; i++) (col.array as Float32Array)[i] *= OFF_DIM;
    solid.push(g);
  });
  const geometries: LPModel['geometries'] = {};
  if (solid.length) geometries.solid = mergeGeometries(solid, false);
  if (glow.length) geometries.glow = mergeGeometries(glow, false);
  solid.concat(glow).forEach((g) => g.dispose());
  const lights = v.lit ? ((root.userData.lights ?? []) as LightAnchor[]) : [];
  return { geometries, lights };
}
