// Catalogo degli oggetti piazzabili, derivato dal foglio
// "Asset for Necrothing con dimensioni Procreate.xlsm" e da Implementation_Note.
// Il footprint è l'ingombro A TERRA in celle (non la dimensione dello sprite
// 2D del vecchio concept top-down): in 3D l'altezza è libera.

import { DECAY } from './balance.ts';
import { t } from '../i18n/index.ts';

export type PlaceableCategory = 'light' | 'decoration' | 'structure' | 'ambient' | 'npc' | 'extra';

export const CATEGORY_ORDER: PlaceableCategory[] = ['light', 'decoration', 'structure', 'ambient', 'npc', 'extra'];

export const PLACEABLE_CATEGORY_LABELS: Record<PlaceableCategory, string> = {
  light: t('category.light'),
  decoration: t('category.decoration'),
  structure: t('category.structure'),
  ambient: t('category.ambient'),
  npc: t('category.npc'),
  extra: t('category.extra'),
};

/** Contatori del giocatore che sbloccano oggetti speciali. */
export type FeatCounter = 'lightsRepaired' | 'wispsEarned' | 'potionsSold';

export interface PlaceableDef {
  id: string;
  label: string;
  category: PlaceableCategory;
  /** Ingombro a terra [larghezza X, profondità Z] in celle (rotazione 0). */
  footprint: [number, number];
  cost: number;
  minRank: number;
  /** Acquistabile/piazzabile una sola volta. */
  unique?: boolean;
  /** Non eliminabile né vendibile (solo spostabile): la Bottega. */
  permanent?: boolean;
  /**
   * Senza cure prima o poi si sporca e poi si rompe (tempi casuali, vedi DECAY).
   * Non per i pezzi che si piazzano in serie (sentieri, muretti, staccionate,
   * inferriate): sarebbero troppi da pulire.
   */
  decays?: boolean;
  /** Ha una luce accendibile/spegnibile. */
  light?: boolean;
  /** Ruotabile a passi di 90°. */
  rotatable?: boolean;
  /** Il Custode può attraversarlo (sentieri, archi, erba). */
  walkable?: boolean;
  /**
   * Variante di un altro oggetto (una voce a sé in Bottega, con prezzo e rango
   * propri): usa il modello di `family` nella variante `look`.
   */
  family?: string;
  look?: number;
  /** Disponibile solo in un mese (0 = gennaio). */
  onlyMonth?: number;
  /**
   * Stagionale: si compra solo tra queste date (mese 0-11, giorno), estremi
   * compresi, anche a cavallo d'anno. Comprato, resta per sempre.
   */
  season?: { from: [number, number]; to: [number, number]; label: string };
  /** Si sblocca con un traguardo (oltre al rango): un contatore del giocatore che arriva a `goal`. */
  feat?: { counter: FeatCounter; goal: number; label: string };
  /** Testo personalizzabile (cartello). */
  editableText?: boolean;
  /** Si sblocca solo con almeno queste tombe nel cimitero (contando anche quelle già affidate all'albero). */
  minGraves?: number;
  /** Descrizione ironica mostrata nel dettaglio. */
  description: string;
}

const defs: PlaceableDef[] = [
  // ── Luci ──────────────────────────────────────────────────────────────
  { id: 'lamp_post', label: t('item.lampPost.label'), category: 'light', footprint: [1, 1], cost: 8, minRank: 1, decays: true, light: true, description: t('item.lampPost.desc') },
  { id: 'lamp_post_double', label: t('item.lampPostDouble.label'), category: 'light', footprint: [1, 1], cost: 12, minRank: 2, decays: true, light: true, family: 'lamp_post', look: 1, description: t('item.lampPostDouble.desc') },
  { id: 'lamp_post_gothic', label: t('item.lampPostGothic.label'), category: 'light', footprint: [1, 1], cost: 16, minRank: 3, decays: true, light: true, family: 'lamp_post', look: 2, description: t('item.lampPostGothic.desc') },
  { id: 'lantern', label: t('item.lantern.label'), category: 'light', footprint: [1, 1], cost: 5, minRank: 1, decays: true, light: true, description: t('item.lantern.desc') },
  { id: 'lantern_pole', label: t('item.lanternPole.label'), category: 'light', footprint: [1, 1], cost: 7, minRank: 1, decays: true, light: true, family: 'lantern', look: 1, description: t('item.lanternPole.desc') },
  { id: 'lantern_stone', label: t('item.lanternStone.label'), category: 'light', footprint: [1, 1], cost: 9, minRank: 2, decays: true, light: true, family: 'lantern', look: 2, description: t('item.lanternStone.desc') },
  { id: 'ghost_lantern', label: t('item.ghostLantern.label'), category: 'light', footprint: [1, 1], cost: 9, minRank: 2, decays: true, light: true, description: t('item.ghostLantern.desc') },
  { id: 'glow_pumpkin', label: t('item.glowPumpkin.label'), category: 'light', footprint: [1, 1], cost: 4, minRank: 1, decays: true, light: true, description: t('item.glowPumpkin.desc') },
  { id: 'skull_candle', label: t('item.skullCandle.label'), category: 'light', footprint: [1, 1], cost: 5, minRank: 2, decays: true, light: true, description: t('item.skullCandle.desc') },
  { id: 'torch', label: t('item.torch.label'), category: 'light', footprint: [1, 1], cost: 6, minRank: 2, decays: true, light: true, description: t('item.torch.desc') },
  { id: 'bonfire', label: t('item.bonfire.label'), category: 'light', footprint: [2, 2], cost: 14, minRank: 3, decays: true, light: true, description: t('item.bonfire.desc') },
  { id: 'candelabra', label: t('item.candelabra.label'), category: 'light', footprint: [1, 1], cost: 14, minRank: 2, decays: true, light: true, description: t('item.candelabra.desc') },
  { id: 'spirit_lantern', label: t('item.spiritLantern.label'), category: 'light', footprint: [1, 1], cost: 18, minRank: 3, decays: true, light: true, description: t('item.spiritLantern.desc') },
  { id: 'skull_garland', label: t('item.skullGarland.label'), category: 'light', footprint: [3, 1], cost: 26, minRank: 3, decays: true, light: true, rotatable: true, walkable: true, description: t('item.skullGarland.desc') },
  { id: 'keeper_lamp', label: t('item.keeperLamp.label'), category: 'light', footprint: [1, 1], cost: 30, minRank: 3, unique: true, decays: true, light: true, feat: { counter: 'lightsRepaired', goal: 25, label: t('feat.lightsRepaired') }, description: t('item.keeperLamp.desc') },
  { id: 'candle_tree', label: t('item.candleTree.label'), category: 'light', footprint: [3, 3], cost: 24, minRank: 4, decays: true, light: true, description: t('item.candleTree.desc') },

  // ── Decorazioni ───────────────────────────────────────────────────────
  { id: 'wreath', label: t('item.wreath.label'), category: 'decoration', footprint: [1, 1], cost: 4, minRank: 1, description: t('item.wreath.desc') },
  { id: 'sign', label: t('item.sign.label'), category: 'decoration', footprint: [1, 1], cost: 4, minRank: 1, editableText: true, description: t('item.sign.desc') },
  { id: 'angel_statue', label: t('item.angelStatue.label'), category: 'decoration', footprint: [2, 2], cost: 22, minRank: 3, description: t('item.angelStatue.desc') },
  { id: 'votive_statue', label: t('item.votiveStatue.label'), category: 'decoration', footprint: [2, 2], cost: 18, minRank: 2, description: t('item.votiveStatue.desc') },
  { id: 'open_coffin', label: t('item.openCoffin.label'), category: 'decoration', footprint: [1, 2], cost: 10, minRank: 2, rotatable: true, description: t('item.openCoffin.desc') },
  { id: 'bones', label: t('item.bones.label'), category: 'decoration', footprint: [1, 1], cost: 3, minRank: 1, walkable: true, description: t('item.bones.desc') },
  { id: 'vase', label: t('item.vase.label'), category: 'decoration', footprint: [1, 1], cost: 3, minRank: 1, description: t('item.vase.desc') },
  { id: 'book_pile', label: t('item.bookPile.label'), category: 'decoration', footprint: [1, 1], cost: 6, minRank: 1, description: t('item.bookPile.desc') },
  { id: 'stuffed_crow', label: t('item.stuffedCrow.label'), category: 'decoration', footprint: [1, 1], cost: 10, minRank: 2, description: t('item.stuffedCrow.desc') },
  { id: 'gargoyle', label: t('item.gargoyle.label'), category: 'decoration', footprint: [1, 1], cost: 24, minRank: 3, description: t('item.gargoyle.desc') },
  { id: 'reaper_statue', label: t('item.reaperStatue.label'), category: 'decoration', footprint: [2, 2], cost: 50, minRank: 4, description: t('item.reaperStatue.desc') },
  { id: 'keeper_statue', label: t('item.keeperStatue.label'), category: 'decoration', footprint: [2, 2], cost: 100, minRank: 5, unique: true, description: t('item.keeperStatue.desc') },
  { id: 'urn', label: t('item.urn.label'), category: 'decoration', footprint: [1, 1], cost: 5, minRank: 2, family: 'vase', look: 1, description: t('item.urn.desc') },

  // ── Costruzioni ───────────────────────────────────────────────────────
  { id: 'shop', label: t('item.shop.label'), category: 'structure', footprint: [3, 3], cost: 0, minRank: 1, unique: true, permanent: true, decays: true, light: true, description: t('item.shop.desc') },
  { id: 'keeper_house', label: t('item.keeperHouse.label'), category: 'structure', footprint: [4, 4], cost: 0, minRank: 1, unique: true, permanent: true, light: true, description: t('item.keeperHouse.desc') },
  { id: 'gravedigger_house', label: t('item.gravediggerHouse.label'), category: 'structure', footprint: [4, 3], cost: 60, minRank: 3, unique: true, decays: true, light: true, description: t('item.gravediggerHouse.desc') },
  { id: 'shrine', label: t('item.shrine.label'), category: 'structure', footprint: [3, 3], cost: 55, minRank: 3, unique: true, decays: true, light: true, description: t('item.shrine.desc') },
  { id: 'zombie_bar', label: t('item.zombieBar.label'), category: 'structure', footprint: [3, 2], cost: 45, minRank: 3, unique: true, decays: true, light: true, description: t('item.zombieBar.desc') },
  { id: 'brain_farm', label: t('item.brainFarm.label'), category: 'structure', footprint: [4, 3], cost: 35, minRank: 3, unique: true, decays: true, light: true, description: t('item.brainFarm.desc') },
  { id: 'mausoleum', label: t('item.mausoleum.label'), category: 'structure', footprint: [3, 3], cost: 80, minRank: 4, unique: true, decays: true, light: true, description: t('item.mausoleum.desc') },
  { id: 'open_grave', label: t('item.openGrave.label'), category: 'structure', footprint: [2, 2], cost: 12, minRank: 2, decays: true, description: t('item.openGrave.desc') },
  { id: 'wall_stone', label: t('item.wallStone.label'), category: 'structure', footprint: [1, 1], cost: 3, minRank: 1, rotatable: true, description: t('item.wallStone.desc') },
  { id: 'fence_wood', label: t('item.fenceWood.label'), category: 'structure', footprint: [1, 1], cost: 2, minRank: 1, rotatable: true, description: t('item.fenceWood.desc') },
  { id: 'fence_iron', label: t('item.fenceIron.label'), category: 'structure', footprint: [1, 1], cost: 4, minRank: 2, rotatable: true, description: t('item.fenceIron.desc') },
  { id: 'arch_stone', label: t('item.archStone.label'), category: 'structure', footprint: [3, 1], cost: 20, minRank: 2, decays: true, rotatable: true, walkable: true, description: t('item.archStone.desc') },
  { id: 'arch_lights', label: t('item.archLights.label'), category: 'structure', footprint: [3, 1], cost: 28, minRank: 3, decays: true, light: true, rotatable: true, walkable: true, description: t('item.archLights.desc') },
  { id: 'arch_gothic', label: t('item.archGothic.label'), category: 'structure', footprint: [3, 1], cost: 32, minRank: 3, decays: true, rotatable: true, walkable: true, description: t('item.archGothic.desc') },
  { id: 'path_stone', label: t('item.pathStone.label'), category: 'structure', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: t('item.pathStone.desc') },
  { id: 'path_dirt', label: t('item.pathDirt.label'), category: 'structure', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: t('item.pathDirt.desc') },
  { id: 'well', label: t('item.well.label'), category: 'structure', footprint: [2, 2], cost: 25, minRank: 2, unique: true, decays: true, description: t('item.well.desc') },
  { id: 'fountain', label: t('item.fountain.label'), category: 'structure', footprint: [3, 3], cost: 40, minRank: 3, unique: true, decays: true, description: t('item.fountain.desc') },
  { id: 'hell_hole', label: t('item.hellHole.label'), category: 'structure', footprint: [2, 2], cost: 45, minRank: 4, unique: true, decays: true, light: true, description: t('item.hellHole.desc') },
  { id: 'memory_tree', label: t('item.memoryTree.label'), category: 'structure', footprint: [5, 5], cost: 150, minRank: 1, unique: true, minGraves: 20, description: t('item.memoryTree.desc') },
  { id: 'soul_bell', label: t('item.soulBell.label'), category: 'structure', footprint: [2, 2], cost: 60, minRank: 4, unique: true, decays: true, light: true, description: t('item.soulBell.desc') },
  { id: 'soul_gazebo', label: t('item.soulGazebo.label'), category: 'structure', footprint: [4, 4], cost: 70, minRank: 4, unique: true, decays: true, light: true, description: t('item.soulGazebo.desc') },
  { id: 'pet_house', label: t('item.petHouse.label'), category: 'structure', footprint: [2, 2], cost: 20, minRank: 2, decays: true, description: t('item.petHouse.desc') },
  { id: 'pet_house_cat', label: t('item.petHouseCat.label'), category: 'structure', footprint: [2, 2], cost: 22, minRank: 2, decays: true, family: 'pet_house', look: 1, description: t('item.petHouseCat.desc') },
  { id: 'pet_house_rabbit', label: t('item.petHouseRabbit.label'), category: 'structure', footprint: [2, 2], cost: 24, minRank: 3, decays: true, family: 'pet_house', look: 2, description: t('item.petHouseRabbit.desc') },
  { id: 'pet_house_duck', label: t('item.petHouseDuck.label'), category: 'structure', footprint: [2, 2], cost: 24, minRank: 3, decays: true, family: 'pet_house', look: 3, description: t('item.petHouseDuck.desc') },
  { id: 'pet_house_crow', label: t('item.petHouseCrow.label'), category: 'structure', footprint: [2, 2], cost: 28, minRank: 3, decays: true, family: 'pet_house', look: 4, description: t('item.petHouseCrow.desc') },

  // ── Ambiente ──────────────────────────────────────────────────────────
  { id: 'pond', label: t('item.pond.label'), category: 'ambient', footprint: [4, 3], cost: 30, minRank: 2, description: t('item.pond.desc') },
  { id: 'dead_tree', label: t('item.deadTree.label'), category: 'ambient', footprint: [2, 2], cost: 8, minRank: 1, description: t('item.deadTree.desc') },
  { id: 'spectral_tree', label: t('item.spectralTree.label'), category: 'ambient', footprint: [3, 3], cost: 26, minRank: 3, light: true, description: t('item.spectralTree.desc') },
  { id: 'half_pine', label: t('item.halfPine.label'), category: 'ambient', footprint: [2, 2], cost: 10, minRank: 1, description: t('item.halfPine.desc') },
  { id: 'xmas_tree', label: t('item.xmasTree.label'), category: 'ambient', footprint: [2, 2], cost: 15, minRank: 1, light: true, onlyMonth: 11, description: t('item.xmasTree.desc') },
  { id: 'toxic_puddle', label: t('item.toxicPuddle.label'), category: 'ambient', footprint: [2, 1], cost: 5, minRank: 1, walkable: true, rotatable: true, description: t('item.toxicPuddle.desc') },
  { id: 'monster_rocks', label: t('item.monsterRocks.label'), category: 'ambient', footprint: [2, 2], cost: 9, minRank: 2, description: t('item.monsterRocks.desc') },
  { id: 'flowerbed', label: t('item.flowerbed.label'), category: 'ambient', footprint: [2, 2], cost: 6, minRank: 1, description: t('item.flowerbed.desc') },
  { id: 'poison_shrooms', label: t('item.poisonShrooms.label'), category: 'ambient', footprint: [1, 1], cost: 3, minRank: 1, walkable: true, description: t('item.poisonShrooms.desc') },
  { id: 'bushes', label: t('item.bushes.label'), category: 'ambient', footprint: [2, 2], cost: 4, minRank: 1, description: t('item.bushes.desc') },
  { id: 'hillock', label: t('item.hillock.label'), category: 'ambient', footprint: [2, 2], cost: 6, minRank: 1, description: t('item.hillock.desc') },
  { id: 'tall_grass', label: t('item.tallGrass.label'), category: 'ambient', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: t('item.tallGrass.desc') },
  { id: 'cypress', label: t('item.cypress.label'), category: 'ambient', footprint: [1, 1], cost: 6, minRank: 1, description: t('item.cypress.desc') },
  { id: 'glow_shrooms', label: t('item.glowShrooms.label'), category: 'ambient', footprint: [2, 1], cost: 12, minRank: 2, rotatable: true, description: t('item.glowShrooms.desc') },
  { id: 'witch_apple', label: t('item.witchApple.label'), category: 'ambient', footprint: [2, 2], cost: 14, minRank: 2, description: t('item.witchApple.desc') },
  { id: 'swing_tree', label: t('item.swingTree.label'), category: 'ambient', footprint: [2, 2], cost: 28, minRank: 3, description: t('item.swingTree.desc') },
  { id: 'stone_circle', label: t('item.stoneCircle.label'), category: 'ambient', footprint: [3, 3], cost: 30, minRank: 3, description: t('item.stoneCircle.desc') },
  { id: 'hand_swamp', label: t('item.handSwamp.label'), category: 'ambient', footprint: [4, 3], cost: 35, minRank: 3, unique: true, description: t('item.handSwamp.desc') },
  { id: 'hell_crack', label: t('item.hellCrack.label'), category: 'ambient', footprint: [3, 2], cost: 60, minRank: 5, unique: true, light: true, description: t('item.hellCrack.desc') },
  { id: 'mud', label: t('item.mud.label'), category: 'ambient', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: t('item.mud.desc') },

  // ── Presenze (NPC piazzabili) ─────────────────────────────────────────
  { id: 'zombies_play', label: t('item.zombiesPlay.label'), category: 'npc', footprint: [2, 2], cost: 30, minRank: 3, walkable: true, description: t('item.zombiesPlay.desc') },
  { id: 'zombies_dance', label: t('item.zombiesDance.label'), category: 'npc', footprint: [2, 2], cost: 30, minRank: 3, walkable: true, description: t('item.zombiesDance.desc') },
  { id: 'scarecrow', label: t('item.scarecrow.label'), category: 'npc', footprint: [1, 1], cost: 26, minRank: 3, light: true, description: t('item.scarecrow.desc') },
  { id: 'gardener_corner', label: t('item.gardenerCorner.label'), category: 'npc', footprint: [1, 1], cost: 28, minRank: 3, description: t('item.gardenerCorner.desc') },
  { id: 'ghosts_ball', label: t('item.ghostsBall.label'), category: 'npc', footprint: [2, 2], cost: 34, minRank: 4, walkable: true, description: t('item.ghostsBall.desc') },

  { id: 'cat_shelter', label: t('item.catShelter.label'), category: 'npc', footprint: [2, 2], cost: 25, minRank: 2, unique: true, description: t('item.catShelter.desc') },
  { id: 'ghost_picnic', label: t('item.ghostPicnic.label'), category: 'npc', footprint: [2, 2], cost: 40, minRank: 3, unique: true, description: t('item.ghostPicnic.desc') },
  { id: 'witch_corner', label: t('item.witchCorner.label'), category: 'npc', footprint: [2, 2], cost: 55, minRank: 4, unique: true, decays: true, light: true, description: t('item.witchCorner.desc') },
  { id: 'skeleton_band', label: t('item.skeletonBand.label'), category: 'npc', footprint: [3, 3], cost: 65, minRank: 4, unique: true, light: true, description: t('item.skeletonBand.desc') },
  { id: 'vampire_crypt', label: t('item.vampireCrypt.label'), category: 'npc', footprint: [2, 2], cost: 90, minRank: 5, unique: true, decays: true, light: true, description: t('item.vampireCrypt.desc') },

  // ── Stagionali ────────────────────────────────────────────────────────
  { id: 'pumpkin_patch', label: t('item.pumpkinPatch.label'), category: 'ambient', footprint: [3, 3], cost: 20, minRank: 1, light: true, season: { from: [9, 1], to: [9, 31], label: t('season.october') }, description: t('item.pumpkinPatch.desc') },
  { id: 'giant_web', label: t('item.giantWeb.label'), category: 'decoration', footprint: [2, 1], cost: 12, minRank: 1, rotatable: true, season: { from: [9, 1], to: [9, 31], label: t('season.october') }, description: t('item.giantWeb.desc') },
  { id: 'dead_altar', label: t('item.deadAltar.label'), category: 'decoration', footprint: [2, 2], cost: 25, minRank: 1, light: true, season: { from: [9, 31], to: [10, 2], label: t('season.allSouls') }, description: t('item.deadAltar.desc') },
  { id: 'skeleton_snowman', label: t('item.skeletonSnowman.label'), category: 'decoration', footprint: [1, 1], cost: 15, minRank: 1, season: { from: [11, 1], to: [0, 31], label: t('season.decJan') }, description: t('item.skeletonSnowman.desc') },
  { id: 'fence_lights', label: t('item.fenceLights.label'), category: 'light', footprint: [1, 1], cost: 3, minRank: 1, light: true, rotatable: true, season: { from: [11, 1], to: [0, 31], label: t('season.decJan') }, description: t('item.fenceLights.desc') },
  { id: 'lovers_bench', label: t('item.loversBench.label'), category: 'npc', footprint: [2, 1], cost: 30, minRank: 1, light: true, rotatable: true, season: { from: [1, 1], to: [1, 29], label: t('season.february') }, description: t('item.loversBench.desc') },

  // ── Extra (non si piazzano: si usano) ─────────────────────────────────
  { id: 'mystic_staff', label: t('item.mysticStaff.label'), category: 'extra', footprint: [1, 1], cost: 0, minRank: 4, unique: true, feat: { counter: 'wispsEarned', goal: 500, label: t('feat.wispsEarned') }, description: t('item.mysticStaff.desc') },
  { id: 'broom', label: t('item.broom.label'), category: 'extra', footprint: [1, 2], cost: 120, minRank: 5, unique: true, description: t('item.broom.desc') },
  { id: 'bike', label: t('item.bike.label'), category: 'extra', footprint: [1, 1], cost: 50, minRank: 2, unique: true, description: t('item.bike.desc') },
];

export const CATALOG: Record<string, PlaceableDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const CATALOG_LIST: readonly PlaceableDef[] = defs;

/** Le varianti (oggetti a sé) di ogni famiglia: indice = vecchio numero di variante. */
export const FAMILY_MEMBERS: Record<string, string[]> = {};
for (const d of defs) {
  if (!d.family) continue;
  const m = (FAMILY_MEMBERS[d.family] ??= [d.family]);
  m[d.look ?? 0] = d.id;
}

/** Il modello da disegnare per un oggetto: le varianti usano quello della loro famiglia. */
export function visualOf(type: string, variant: number): { type: string; variant: number } {
  const d = CATALOG[type];
  return d?.family ? { type: d.family, variant: d.look ?? 0 } : { type, variant };
}

/** Casette per animale (tutte le varianti). */
export function isPetHouse(type: string): boolean {
  return (CATALOG[type]?.family ?? type) === 'pet_house';
}

export function placeableDef(type: string): PlaceableDef {
  const def = CATALOG[type];
  if (!def) throw new Error(`Oggetto sconosciuto: ${type}`); // i18n-ok
  return def;
}

/** Ingombro effettivo considerando la rotazione (0..3 quarti di giro). */
export function rotatedFootprint(type: string, rot: number): [number, number] {
  const [w, d] = placeableDef(type).footprint;
  return rot % 2 === 1 ? [d, w] : [w, d];
}

export function isSeasonallyAvailable(def: PlaceableDef, month0: number, day = 15): boolean {
  if (def.onlyMonth !== undefined && def.onlyMonth !== month0) return false;
  if (!def.season) return true;
  const k = (m: number, d: number) => m * 32 + d, at = k(month0, day);
  const a = k(...def.season.from), b = k(...def.season.to);
  return a <= b ? at >= a && at <= b : at >= a || at <= b;
}

/** Quando si trova in Bottega uno stagionale («solo a dicembre», «solo ottobre»…). */
export function seasonLabel(def: PlaceableDef): string {
  if (def.season) return def.season.label;
  return def.onlyMonth === 11 ? t('season.december') : '';
}

export function repairCost(def: PlaceableDef): number {
  return Math.max(2, Math.round(def.cost * DECAY.placeableRepairFraction));
}

/**
 * Oggetti di contorno: non ci si fa niente (niente pulire, accendere...), si
 * spostano e basta. Con l'interfaccia nuova si selezionano solo in Modifica:
 * fuori, toccandoli il Custode ci cammina sopra.
 */
export const EDIT_ONLY = new Set(['path_stone', 'path_dirt', 'fence_wood', 'fence_iron', 'wall_stone', 'tall_grass', 'mud', 'flowerbed', 'bushes']);
/** Oggetti che si posano a tratti, trascinando il dito lungo un percorso. */
export const TRACEABLE = new Set(['path_stone', 'path_dirt', 'fence_wood', 'fence_iron', 'wall_stone']);

/** Oggetti che contano come "tombe dissotterrate" per lo spawn degli zombie. */
export const ZOMBIE_ATTRACTORS = new Set(['open_grave', 'open_coffin']);

/** Le presenze piazzabili che vivono attorno al loro oggetto (anche fuori dalla categoria Presenze). */
export const PRESENCE_TYPES = new Set(['zombies_play', 'zombies_dance', 'gardener_corner', 'ghosts_ball', 'zombie_bar', 'brain_farm',
  'cat_shelter', 'ghost_picnic', 'witch_corner', 'skeleton_band', 'vampire_crypt', 'lovers_bench', 'soul_gazebo', 'keeper_statue']);
