// Nuovi sbloccabili nel gioco: dal catalogo ai modelli low-poly nati come
// anteprime (newItems / newItems2). I personaggi che li animano (strega,
// vampiro, gatti, scheletri, fantasmi, la statua del Custode) non sono nel
// modello: li aggiungono le presenze (view/Actors).

import type { PVis } from '../types.ts';
import type { LPModel } from './kit.ts';
import * as N from './newItems.ts';
import * as M from './newItems2.ts';

export const LP_UNLOCKABLES: Record<string, (v: PVis) => LPModel> = {
  // luci
  candelabra: (v) => N.candelabraLP(v.lit),
  spirit_lantern: (v) => N.spiritLanternLP(v.lit),
  skull_garland: (v) => N.skullGarlandLP(v.lit),
  keeper_lamp: (v) => M.custodeLamp2LP(v.lit),
  fence_lights: (v) => N.fenceLightsLP(v.lit),
  // decorazioni (gli occhi del gargoyle e del mietitore brillano sempre: di giorno quasi non si vede)
  book_pile: (v) => N.bookPileLP(v.lit),
  stuffed_crow: () => N.stuffedCrowLP(),
  gargoyle: () => N.gargoyleLP(true),
  reaper_statue: () => M.reaperLP(true),
  keeper_statue: () => N.statuePlinthLP(),
  giant_web: () => N.giantWebLP(),
  dead_altar: (v) => M.ofrenda2LP(v.lit),
  skeleton_snowman: () => M.skeletonSnowman2LP(),
  // costruzioni
  soul_bell: (v) => M.soulBellLP(v.lit),
  soul_gazebo: (v) => M.gazeboSpookyLP(v.lit),
  // ambiente
  cypress: () => M.cypressLP(),
  glow_shrooms: () => M.glowShroomsLP(true),
  witch_apple: () => M.witchAppleLP(true),
  swing_tree: () => M.swingTree2LP(true),
  stone_circle: () => M.stoneCircleLP(true),
  hand_swamp: () => M.swamp2LP(true),
  hell_crack: (v) => N.hellCrackLP(v.lit),
  pumpkin_patch: (v) => M.pumpkinPatch2LP(v.lit),
  // presenze (solo l'ambiente: chi lo abita arriva con le presenze)
  cat_shelter: () => M.catShelterLP(),
  ghost_picnic: () => N.picnicLP(),
  witch_corner: (v) => M.witchCornerLP(v.lit),
  skeleton_band: (v) => N.bandStageLP(v.lit, -0.5), // palco indietro: davanti ballano i fantasmini (view/presences BAND_BACK)
  vampire_crypt: (v) => M.vampireCryptLP(false, v.lit),
  lovers_bench: (v) => N.loversBenchLP(v.lit),
  // extra (non si posano: modelli per le miniature)
  mystic_staff: () => M.mysticStaffLP(true),
  broom: () => M.broom2LP(),
};
