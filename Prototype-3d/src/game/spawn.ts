// Calcolo (puro) delle comparse di presenze erranti e dei fuochi fatui, con
// i modificatori dati da edifici e fiori. Deterministico rispetto alla RNG.

import { HOUSE_PERKS, SPAWN_CHANCE, SPAWN_MODIFIERS, WISP_SPAWN } from './balance.ts';
import { housePerk } from './house.ts';
import { ZOMBIE_ATTRACTORS } from './catalog.ts';
import type { Rng } from './rng.ts';
import type { SaveData } from './state.ts';

export type RoamerKind = 'ghost' | 'cat' | 'crow' | 'priest' | 'gravedigger' | 'rat' | 'zombie';

export const ROAMER_LABELS: Record<RoamerKind, string> = {
  ghost: 'Fantasma', cat: 'Gatto nero', crow: 'Corvo', priest: 'Prete',
  gravedigger: 'Becchino', rat: 'Topo', zombie: 'Zombie',
};

export interface SpawnRequest {
  kind: RoamerKind;
  graveId?: string;
  /** Variante rara: il fantasma dell'oggetto sepolto. */
  rare?: boolean;
  /** Fantasma di un ricordo affidato all'Albero dei ricordi (appare vicino all'albero). */
  memoryId?: string;
}

export interface BuildingCounts {
  mausoleum: number;
  gravediggerHouse: number;
  shrine: number;
  openGraves: number;
  hellHole: number;
  hellCrack: number;
  zombieBar: number;
  brainFarm: number;
}

export function countBuildings(state: Pick<SaveData, 'placeables'>): BuildingCounts {
  const c: BuildingCounts = { mausoleum: 0, gravediggerHouse: 0, shrine: 0, openGraves: 0, hellHole: 0, hellCrack: 0, zombieBar: 0, brainFarm: 0 };
  for (const p of state.placeables) {
    if (p.broken) continue; // un edificio rotto non "funziona"
    if (p.type === 'mausoleum') c.mausoleum++;
    else if (p.type === 'gravedigger_house') c.gravediggerHouse++;
    else if (p.type === 'shrine') c.shrine++;
    else if (p.type === 'hell_hole') c.hellHole++;
    else if (p.type === 'hell_crack') c.hellCrack++;
    else if (p.type === 'zombie_bar') c.zombieBar++;
    else if (p.type === 'brain_farm') c.brainFarm++;
    else if (ZOMBIE_ATTRACTORS.has(p.type)) c.openGraves++;
  }
  return c;
}

export function computeSpawns(
  state: Pick<SaveData, 'graves' | 'placeables'> & Partial<Pick<SaveData, 'entrusted' | 'house'>>,
  isNight: boolean,
  rng: Rng,
  now?: Date,
): SpawnRequest[] {
  const b = countBuildings(state);
  const graves = state.graves;
  const flowers = graves.filter((g) => g.hasFlowers).length;
  const mult = (1 + SPAWN_MODIFIERS.mausoleumEventBonus * b.mausoleum) * (1 + SPAWN_MODIFIERS.flowerEventBonus * flowers);
  const out: SpawnRequest[] = [];
  // casa del Custode: le zucche sul portico chiamano i fantasmi di notte, la frutta gatti e corvi
  const pumpkins = isNight && housePerk(state, 'pumpkins') ? (now?.getMonth() === 9 ? HOUSE_PERKS.pumpkinsOctoberGhosts : HOUSE_PERKS.pumpkinsNightGhosts) : 1;
  const animals = housePerk(state, 'fruit') ? HOUSE_PERKS.fruitAnimals : 1;

  if (graves.length > 0) {
    const ghost = ((isNight ? SPAWN_CHANCE.ghostGenericNight : SPAWN_CHANCE.ghostGenericDay) + SPAWN_MODIFIERS.hellHoleGhostBonus * b.hellHole + SPAWN_MODIFIERS.hellCrackGhostBonus * b.hellCrack) * pumpkins;
    if (rng.chance(ghost * mult)) out.push({ kind: 'ghost', graveId: rng.pick(graves).id });
    const rare = (isNight ? SPAWN_CHANCE.ghostObjectNight : SPAWN_CHANCE.ghostObjectDay) * pumpkins;
    const own = graves.filter((g) => !g.legacy);
    if (own.length > 0 && rng.chance(rare * mult)) out.push({ kind: 'ghost', graveId: rng.pick(own).id, rare: true });
  }
  if (rng.chance(SPAWN_CHANCE.cat * animals)) out.push({ kind: 'cat' });
  if (!isNight && rng.chance(SPAWN_CHANCE.crowDay * animals)) out.push({ kind: 'crow' });
  if (graves.length > 0) {
    const p = (SPAWN_CHANCE.priest + SPAWN_MODIFIERS.shrinePriestBonus * b.shrine) * mult;
    if (rng.chance(p)) out.push({ kind: 'priest', graveId: rng.pick(graves).id });
  }
  if (rng.chance(SPAWN_CHANCE.gravedigger + SPAWN_MODIFIERS.gravediggerHouseBonus * b.gravediggerHouse)) {
    out.push({ kind: 'gravedigger' });
  }
  if (isNight && rng.chance(SPAWN_CHANCE.ratNight)) out.push({ kind: 'rat' });
  // tombe aperte, bar e orto chiamano gli zombie
  const zombie = SPAWN_MODIFIERS.zombiePerOpenGrave * b.openGraves + SPAWN_MODIFIERS.zombieBar * b.zombieBar + SPAWN_MODIFIERS.zombieFarm * b.brainFarm;
  if (zombie > 0 && rng.chance(Math.min(SPAWN_MODIFIERS.zombieChanceMax, zombie))) out.push({ kind: 'zombie' });
  // l'albero ogni tanto lascia uscire il fantasma di uno dei ricordi affidatigli
  const kept = state.entrusted ?? [];
  if (kept.length > 0 && state.placeables.some((p) => p.type === 'memory_tree')) {
    if (rng.chance(isNight ? SPAWN_CHANCE.memoryGhostNight : SPAWN_CHANCE.memoryGhostDay)) out.push({ kind: 'ghost', memoryId: rng.pick(kept).grave.id });
  }
  return out;
}

/** Tetto di fuochi fatui presenti sulla mappa (cresce con le tombe). */
export function wispCap(state: Pick<SaveData, 'graves'>): number {
  return Math.min(WISP_SPAWN.capMax, Math.floor(WISP_SPAWN.capBase + state.graves.length * WISP_SPAWN.capPerGraves));
}

/** Probabilità che compaia un fuoco fatuo in un tick live: tombe, cure e fiori. */
export function liveWispChance(state: Pick<SaveData, 'graves' | 'world' | 'placeables'> & Partial<Pick<SaveData, 'house'>>, now: Date, isNight = false): number {
  const flowers = state.graves.filter((g) => g.hasFlowers).length;
  const clean = state.graves.filter((g) => !g.dirty && !g.weeds && !g.broken).length;
  let p = WISP_SPAWN.liveChanceBase + flowers * WISP_SPAWN.liveChancePerFlower + clean * WISP_SPAWN.liveChancePerCleanGrave;
  if (state.world.blessingUntil && new Date(state.world.blessingUntil) > now) p *= WISP_SPAWN.blessingMultiplier;
  // la lanterna al portico della casa del Custode li attira di notte
  if (isNight && housePerk(state, 'lantern')) p *= HOUSE_PERKS.lanternNightWisps;
  return Math.min(0.9, p);
}
