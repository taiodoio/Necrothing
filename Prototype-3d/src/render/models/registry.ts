// Registro dei modelli procedurali: (tipo, stato) → Model. Usato dal mondo
// di gioco e dalla galleria di sviluppo.

import { CATALOG_LIST, CATEGORY_ORDER, PLACEABLE_CATEGORY_LABELS, visualOf } from '../../game/catalog.ts';
import type { Model } from '../shape.ts';
import { angelStatue, bones, npcHome, openCoffin, sign, vase, votiveStatue, wreath } from './decor.ts';
import { bonfire, candleTree, ghostLantern, glowPumpkin, lampPost, lantern, skullCandle, torch } from './lights.ts';
import { bushes, deadTree, flowerbed, hillock, monsterRocks, mud, pine, poisonShrooms, pond, spectralTree, tallGrass, toxicPuddle } from './nature.ts';
import {
  arch, fenceIron, fenceWood, fountain, gravediggerHouse, hellHole, mausoleum, openGrave,
  pathDirt, pathStone, petHouse, shop, shrine, wallStone, well,
} from './structures.ts';
import type { PVis } from './types.ts';

export type { PVis };

const BUILDERS: Record<string, (v: PVis) => Model> = {
  lamp_post: lampPost,
  lantern,
  ghost_lantern: ghostLantern,
  glow_pumpkin: glowPumpkin,
  skull_candle: skullCandle,
  torch,
  bonfire,
  candle_tree: candleTree,
  wreath,
  sign,
  angel_statue: angelStatue,
  votive_statue: votiveStatue,
  open_coffin: openCoffin,
  bones,
  vase,
  shop,
  // la casa del Custode nello stile voxel (solo ripiego: il gioco è low-poly) è la Bottega
  keeper_house: shop,
  gravedigger_house: gravediggerHouse,
  shrine,
  mausoleum,
  open_grave: openGrave,
  wall_stone: wallStone,
  fence_wood: fenceWood,
  fence_iron: fenceIron,
  arch_stone: arch,
  arch_lights: arch,
  arch_gothic: arch,
  path_stone: pathStone,
  path_dirt: pathDirt,
  well,
  fountain,
  hell_hole: hellHole,
  pet_house: petHouse,
  pond,
  dead_tree: (v) => deadTree(v),
  spectral_tree: spectralTree,
  memory_tree: (v) => deadTree({ ...v, seed: 3 }), // stile voxel: un grande albero (le chiome-ricordo sono del low-poly)
  half_pine: (v) => pine(v.seed, true),
  xmas_tree: (v) => pine(v.seed, false, true, v.lit),
  toxic_puddle: toxicPuddle,
  monster_rocks: monsterRocks,
  flowerbed,
  poison_shrooms: poisonShrooms,
  bushes,
  hillock,
  tall_grass: tallGrass,
  mud,
  zombies_play: npcHome,
  zombies_dance: npcHome,
  scarecrow: npcHome,
  gardener_corner: npcHome,
  ghosts_ball: npcHome,
  // negli stili a cubetti: una pedana e un'aiuola semplici
  zombie_bar: npcHome,
  brain_farm: flowerbed,
  bike: npcHome,
  // nuovi sbloccabili: negli stili a cubetti un sostituto semplice della stessa famiglia
  candelabra: skullCandle,
  spirit_lantern: ghostLantern,
  skull_garland: arch,
  keeper_lamp: lampPost,
  fence_lights: fenceWood,
  book_pile: vase,
  stuffed_crow: bones,
  gargoyle: vase,
  reaper_statue: votiveStatue,
  keeper_statue: angelStatue,
  giant_web: fenceWood,
  dead_altar: votiveStatue,
  skeleton_snowman: bones,
  soul_bell: well,
  soul_gazebo: shrine,
  cypress: (v) => pine(v.seed),
  glow_shrooms: poisonShrooms,
  witch_apple: (v) => deadTree(v),
  swing_tree: (v) => deadTree(v),
  stone_circle: monsterRocks,
  hand_swamp: pond,
  hell_crack: hellHole,
  pumpkin_patch: flowerbed,
  cat_shelter: npcHome,
  ghost_picnic: npcHome,
  witch_corner: npcHome,
  skeleton_band: npcHome,
  vampire_crypt: openCoffin,
  lovers_bench: npcHome,
  mystic_staff: npcHome,
  broom: npcHome,
};

/** Quanti semi distinti per tipo (oggetti ripetuti come i sentieri variano). */
const SEED_VARIANTS: Record<string, number> = { path_stone: 6, path_dirt: 3, tall_grass: 4, wall_stone: 4, fence_wood: 4, fence_iron: 1, dead_tree: 5, bushes: 4 };

/** Quanti semi diversi può avere un tipo (per generare in anticipo tutte le sue forme). */
export function seedCount(type: string): number {
  return SEED_VARIANTS[visualOf(type, 0).type] ?? 2;
}

export function placeableSeed(type: string, idHash: number): number {
  return idHash % (SEED_VARIANTS[type] ?? 2);
}

export function placeableModel(v: PVis): Model {
  v = canonical(v);
  const build = BUILDERS[v.type];
  if (!build) throw new Error(`Nessun modello per ${v.type}`); // i18n-ok: errore interno
  return build(v);
}

/** Inverso di placeableKey (galleria): null se la chiave non è di un oggetto. */
export function placeableVis(key: string): PVis | null {
  const m = key.match(/^p:([a-z_]+):(\d+):(\d+):([01])([01])([01])$/);
  return m ? { type: m[1], variant: +m[2], seed: +m[3], dirty: m[4] === '1', broken: m[5] === '1', lit: m[6] === '1' } : null;
}

/** Le varianti (oggetti a sé) usano il modello della loro famiglia. */
function canonical(v: PVis): PVis {
  const vis = visualOf(v.type, v.variant);
  return vis.type === v.type && vis.variant === v.variant ? v : { ...v, ...vis };
}

export function placeableKey(v: PVis): string {
  v = canonical(v);
  return `p:${v.type}:${v.variant}:${v.seed}:${+v.dirty}${+v.broken}${+v.lit}${v.corner ? ':L' : ''}`;
}

export interface GalleryItem {
  key: string;
  build: () => Model;
  fp: [number, number];
}

export function gallerySets(): Record<string, GalleryItem[]> {
  const out: Record<string, GalleryItem[]> = {};
  for (const cat of CATEGORY_ORDER) {
    const items: GalleryItem[] = [];
    for (const d of CATALOG_LIST.filter((x) => x.category === cat)) {
      const v: PVis = { type: d.id, variant: 0, dirty: false, broken: false, lit: true, seed: 1 };
      items.push({ key: placeableKey(v), build: () => placeableModel(v), fp: d.footprint });
    }
    out[PLACEABLE_CATEGORY_LABELS[cat]] = items;
    if (cat === 'light' || cat === 'structure') {
      out[`${PLACEABLE_CATEGORY_LABELS[cat]} — sporche/rotte`] = CATALOG_LIST.filter((x) => x.category === cat && x.decays).flatMap((d) => [ // i18n-ok: solo galleria di sviluppo
        { dirty: true, broken: false, lit: true }, { dirty: true, broken: true, lit: false },
      ].map((s) => {
        const v: PVis = { type: d.id, variant: 0, seed: 1, ...s };
        return { key: placeableKey(v), build: () => placeableModel(v), fp: d.footprint };
      }));
    }
  }
  return out;
}
