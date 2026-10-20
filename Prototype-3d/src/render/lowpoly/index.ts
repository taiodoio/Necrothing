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
import { v2Generators } from './v2/npc.ts';
import {
  archLP, bonfireLP, candleTreeLP, fenceIronLP, fenceWoodLP, fountainLP, ghostLanternLP, glowPumpkinLP, hellHoleLP, hillockLP,
  monsterRocksLP, mudLP, npcHomeLP, openCoffinLP, openGraveLP, petHouseLP, shrineLP, skullCandleLP, spectralTreeLP, toxicPuddleLP,
  wallStoneLP, xmasTreeLP,
} from './extras.ts';
import { bonesLP, signLP, vaseLP, wreathLP } from './decor.ts';
import { lampPost, lantern, torch } from './lights.ts';
import {
  bushesLP, deadTreeLP, flowerbedLP, pathDirt, pathStone, pineLP, pondLP, poisonShroomsLP, sceneryBushLP, sceneryFernLP,
  sceneryFlowersLP, sceneryLeavesLP, sceneryPebblesLP, sceneryRockLP, sceneryShroomsLP, sceneryTuftLP, sceneryWildGrassLP, tallGrassLP,
} from './nature.ts';
import { memoryTreeLP } from './memoryTree.ts';
import { bicycleLP, brainFarmLP, zombieBarLP } from './extraItems.ts';
import { LP_UNLOCKABLES } from './unlockables.ts';
import { gardenerCornerLP, scarecrowBodyLP } from './newItems3.ts';
import { weathered } from './weathering.ts';
import { CATALOG } from '../../game/catalog.ts';
import { GRAVE_FOOTPRINT } from '../../game/balance.ts';

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
  ghost_lantern: ghostLanternLP,
  glow_pumpkin: glowPumpkinLP,
  skull_candle: skullCandleLP,
  bonfire: bonfireLP,
  candle_tree: candleTreeLP,
  open_coffin: openCoffinLP,
  // variante = quanti ricordi gli sono stati affidati (un frutto acceso per ciascuno)
  memory_tree: (v) => memoryTreeLP(v.variant, v.seed + 1),
  shrine: shrineLP,
  open_grave: openGraveLP,
  wall_stone: wallStoneLP,
  fence_wood: fenceWoodLP,
  fence_iron: fenceIronLP,
  arch_stone: archLP,
  arch_lights: archLP,
  arch_gothic: archLP,
  fountain: fountainLP,
  hell_hole: hellHoleLP,
  pet_house: petHouseLP,
  spectral_tree: spectralTreeLP,
  xmas_tree: xmasTreeLP,
  toxic_puddle: toxicPuddleLP,
  monster_rocks: monsterRocksLP,
  hillock: hillockLP,
  mud: mudLP,
  zombies_play: npcHomeLP,
  zombies_dance: npcHomeLP,
  scarecrow: (v) => scarecrowBodyLP(v.lit),
  gardener_corner: () => gardenerCornerLP(),
  ghosts_ball: npcHomeLP,
  zombie_bar: zombieBarLP,
  brain_farm: brainFarmLP,
  // non si piazza (il Custode la porta con sé): questo è il modello per le miniature
  bike: () => bicycleLP(true),
  ...LP_UNLOCKABLES,
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
/** Parti dei personaggi nello stile v2 (tipo:parte → generatore). */
export const LP_CHARACTERS: Record<string, () => LPModel> = v2Generators();

export function resolveLowpoly(key: string): Builder | null {
  let m = key.match(/^(?:g|grave):([a-z_]+):([a-z]+):(\d+)$/);
  if (m) {
    const [, type, state, seed] = m;
    // anche le tombe trascurate ricevono il degrado comune (sporco, erba alta; da rotte macerie)
    const dirty = state === 'dirty' || state === 'broken', broken = state === 'broken';
    const v: PVis = { type: `grave_${type}`, variant: 0, seed: Number(seed), dirty, broken, lit: false };
    return () => weathered(lowpolyGrave(type as GraveType, state as GraveVisualState, Number(seed)), v, GRAVE_FOOTPRINT, 'decoration');
  }
  m = key.match(/^p:([a-z_]+):(\d+):(\d+):([01])([01])([01])(:L)?$/);
  if (m) {
    const gen = LP_PLACEABLES[m[1]];
    if (!gen) return null;
    const v: PVis = { type: m[1], variant: Number(m[2]), seed: Number(m[3]), dirty: m[4] === '1', broken: m[5] === '1', lit: m[6] === '1', corner: !!m[7] };
    // chi si sporca e si rompe riceve anche il degrado comune (leggibile su tutti gli oggetti)
    const def = CATALOG[v.type];
    return def?.decays ? () => weathered(gen(v), v, def.footprint, def.category) : () => gen(v);
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
