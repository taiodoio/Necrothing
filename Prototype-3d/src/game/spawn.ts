// Calcolo (puro) delle comparse di presenze erranti e dei fuochi fatui, con
// i modificatori dati da edifici e fiori. Deterministico rispetto alla RNG.

import { SPAWN_CHANCE, SPAWN_MODIFIERS, WISP_SPAWN } from './balance.ts';
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
}

export interface BuildingCounts {
  mausoleum: number;
  gravediggerHouse: number;
  shrine: number;
  openGraves: number;
  hellHole: number;
}

export function countBuildings(state: Pick<SaveData, 'placeables'>): BuildingCounts {
  const c: BuildingCounts = { mausoleum: 0, gravediggerHouse: 0, shrine: 0, openGraves: 0, hellHole: 0 };
  for (const p of state.placeables) {
    if (p.broken) continue; // un edificio rotto non "funziona"
    if (p.type === 'mausoleum') c.mausoleum++;
    else if (p.type === 'gravedigger_house') c.gravediggerHouse++;
    else if (p.type === 'shrine') c.shrine++;
    else if (p.type === 'hell_hole') c.hellHole++;
    else if (ZOMBIE_ATTRACTORS.has(p.type)) c.openGraves++;
  }
  return c;
}

export function computeSpawns(
  state: Pick<SaveData, 'graves' | 'placeables'>,
  isNight: boolean,
  rng: Rng,
): SpawnRequest[] {
  const b = countBuildings(state);
  const graves = state.graves;
  const flowers = graves.filter((g) => g.hasFlowers).length;
  const mult = (1 + SPAWN_MODIFIERS.mausoleumEventBonus * b.mausoleum) * (1 + SPAWN_MODIFIERS.flowerEventBonus * flowers);
  const out: SpawnRequest[] = [];

  if (graves.length > 0) {
    const ghost = (isNight ? SPAWN_CHANCE.ghostGenericNight : SPAWN_CHANCE.ghostGenericDay) + SPAWN_MODIFIERS.hellHoleGhostBonus * b.hellHole;
    if (rng.chance(ghost * mult)) out.push({ kind: 'ghost', graveId: rng.pick(graves).id });
    const rare = isNight ? SPAWN_CHANCE.ghostObjectNight : SPAWN_CHANCE.ghostObjectDay;
    const own = graves.filter((g) => !g.legacy);
    if (own.length > 0 && rng.chance(rare * mult)) out.push({ kind: 'ghost', graveId: rng.pick(own).id, rare: true });
  }
  if (rng.chance(SPAWN_CHANCE.cat)) out.push({ kind: 'cat' });
  if (!isNight && rng.chance(SPAWN_CHANCE.crowDay)) out.push({ kind: 'crow' });
  if (graves.length > 0) {
    const p = (SPAWN_CHANCE.priest + SPAWN_MODIFIERS.shrinePriestBonus * b.shrine) * mult;
    if (rng.chance(p)) out.push({ kind: 'priest', graveId: rng.pick(graves).id });
  }
  if (rng.chance(SPAWN_CHANCE.gravedigger + SPAWN_MODIFIERS.gravediggerHouseBonus * b.gravediggerHouse)) {
    out.push({ kind: 'gravedigger' });
  }
  if (isNight && rng.chance(SPAWN_CHANCE.ratNight)) out.push({ kind: 'rat' });
  if (b.openGraves > 0) {
    const p = Math.min(SPAWN_MODIFIERS.zombieChanceMax, SPAWN_MODIFIERS.zombiePerOpenGrave * b.openGraves);
    if (rng.chance(p)) out.push({ kind: 'zombie' });
  }
  return out;
}

/** Tetto di fuochi fatui presenti sulla mappa (cresce con le tombe). */
export function wispCap(state: Pick<SaveData, 'graves'>): number {
  return Math.min(WISP_SPAWN.capMax, Math.floor(WISP_SPAWN.capBase + state.graves.length * WISP_SPAWN.capPerGraves));
}

/** Probabilità che compaia un fuoco fatuo in un tick live: tombe, cure e fiori. */
export function liveWispChance(state: Pick<SaveData, 'graves' | 'world'>, now: Date): number {
  const flowers = state.graves.filter((g) => g.hasFlowers).length;
  const clean = state.graves.filter((g) => !g.dirty && !g.weeds && !g.broken).length;
  let p = WISP_SPAWN.liveChanceBase + flowers * WISP_SPAWN.liveChancePerFlower + clean * WISP_SPAWN.liveChancePerCleanGrave;
  if (state.world.blessingUntil && new Date(state.world.blessingUntil) > now) p *= WISP_SPAWN.blessingMultiplier;
  return Math.min(0.9, p);
}
