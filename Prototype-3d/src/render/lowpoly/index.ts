// Adapter dello stile "Stylized Gothic Low-Poly": traduce le chiavi dei
// modelli già usate dal gioco (tombe, oggetti del catalogo, scenografia,
// parti dei personaggi) nei generatori low-poly dedicati. Ciò che non è
// ancora migrato ricade sul mesher "miniatura" (vedi modelCache.getModel),
// così il gioco resta sempre completo durante la migrazione.

import type { GraveType, GraveVisualState } from '../../game/graves.ts';
import { setLowpolyResolver } from '../modelCache.ts';
import type { PVis } from '../models/types.ts';
import { lowpolyGrave } from './graves.ts';
import type { LPModel } from './kit.ts';
import { angelStatueLP, fencePillarLP, fenceSegmentLP, gateLP, gravediggerHouseLP, mausoleumLP, shopLP, votiveStatueLP, wellLP } from './architecture.ts';
import { characterGenerators } from './characters.ts';
import { bonesLP, signLP, vaseLP, wreathLP } from './decor.ts';
import { lampPost, lantern, torch } from './lights.ts';
import {
  bushesLP, deadTreeLP, flowerbedLP, pathDirt, pathStone, pineLP, pondLP, poisonShroomsLP, sceneryBushLP, sceneryFernLP,
  sceneryFlowersLP, sceneryLeavesLP, sceneryPebblesLP, sceneryRockLP, sceneryShroomsLP, sceneryTuftLP, sceneryWildGrassLP, tallGrassLP,
} from './nature.ts';

type Builder = () => LPModel;

/** Generatori per oggetti del catalogo (id del catalogo → generatore). */
export const LP_PLACEABLES: Record<string, (v: PVis) => LPModel> = {
  lamp_post: lampPost,
  lantern,
  torch,
  path_stone: pathStone,
  path_dirt: pathDirt,
  dead_tree: (v) => deadTreeLP(v.seed * 7 + v.variant * 13 + 3, true),
  half_pine: (v) => pineLP(v.seed + 11, true),
  bushes: bushesLP,
  tall_grass: tallGrassLP,
  poison_shrooms: poisonShroomsLP,
  flowerbed: flowerbedLP,
  pond: pondLP,
  shop: shopLP,
  gravedigger_house: gravediggerHouseLP,
  mausoleum: mausoleumLP,
  well: wellLP,
  votive_statue: votiveStatueLP,
  angel_statue: angelStatueLP,
  wreath: wreathLP,
  vase: vaseLP,
  bones: bonesLP,
  sign: signLP,
};
/** Generatori di scenografia (prefisso della chiave → generatore con parametro). */
export const LP_SCENERY: Record<string, (arg: string) => LPModel> = {
  fseg: (a) => fenceSegmentLP(Number(a)),
  fpil: (a) => fencePillarLP(Number(a)),
  gate: (a) => gateLP(a === 'lit'),
  wpine: (a) => pineLP(Number(a) + 40, false, 1.15),
  wdead: (a) => deadTreeLP(Number(a) + 90, true, 1.1),
  wrock: (a) => sceneryRockLP(Number(a)),
  tuft: (a) => sceneryTuftLP(Number(a)),
  flowers: (a) => sceneryFlowersLP(Number(a)),
  pebbles: (a) => sceneryPebblesLP(Number(a)),
  leaves: (a) => sceneryLeavesLP(Number(a)),
  shroom: (a) => sceneryShroomsLP(Number(a)),
  wgrass: (a) => sceneryWildGrassLP(Number(a)),
  fern: (a) => sceneryFernLP(Number(a)),
  bush: (a) => sceneryBushLP(Number(a)),
};
/** Parti dei personaggi (tipo:parte → generatore). */
export const LP_CHARACTERS: Record<string, () => LPModel> = characterGenerators();

export function resolveLowpoly(key: string): Builder | null {
  let m = key.match(/^(?:g|grave):([a-z_]+):([a-z]+):(\d+)$/);
  if (m) {
    const [, type, state, seed] = m;
    return () => lowpolyGrave(type as GraveType, state as GraveVisualState, Number(seed));
  }
  m = key.match(/^p:([a-z_]+):(\d+):(\d+):([01])([01])([01])$/);
  if (m) {
    const gen = LP_PLACEABLES[m[1]];
    if (!gen) return null;
    const v: PVis = { type: m[1], variant: Number(m[2]), seed: Number(m[3]), dirty: m[4] === '1', broken: m[5] === '1', lit: m[6] === '1' };
    return () => gen(v);
  }
  m = key.match(/^char:([A-Za-z]+:[A-Za-z]+)$/);
  if (m) return LP_CHARACTERS[m[1]] ?? null;
  m = key.match(/^([a-z]+):(.*)$/);
  if (m && LP_SCENERY[m[1]]) {
    const gen = LP_SCENERY[m[1]];
    const arg = m[2];
    return () => gen(arg);
  }
  return null;
}

setLowpolyResolver(resolveLowpoly);
