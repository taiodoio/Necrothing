// Calcolo (puro) delle comparse di entità erranti, con i modificatori dati
// dagli edifici piazzati (Fase G). Estratto da simulationService per essere
// testabile in isolamento: data una RNG deterministica, produce gli spawn.

import type { Decoration, Grave } from '@/shared/domain/types';
import type { RoamingSpawn } from '@/shared/domain/roaming';
import { SPAWN_CHANCE, SPAWN_MODIFIERS } from '@/shared/domain/balance';
import type { Rng } from '@/shared/utils/rng';

export interface BuildingCounts {
  mausoleum: number;
  gravediggerHouse: number;
  shrine: number;
  openCoffin: number;
}

/** Conta gli edifici rilevanti per gli spawn tra gli oggetti piazzati. */
export function countBuildings(placeables: Decoration[]): BuildingCounts {
  const counts: BuildingCounts = {
    mausoleum: 0,
    gravediggerHouse: 0,
    shrine: 0,
    openCoffin: 0,
  };
  for (const p of placeables) {
    if (p.type === 'mausoleum') counts.mausoleum++;
    else if (p.type === 'gravedigger_house') counts.gravediggerHouse++;
    else if (p.type === 'shrine') counts.shrine++;
    else if (p.type === 'open_coffin') counts.openCoffin++;
  }
  return counts;
}

/** Applica il bonus moltiplicativo del mausoleo a una probabilità base. */
function withMausoleum(base: number, mausoleum: number): number {
  return base * (1 + SPAWN_MODIFIERS.mausoleumEventBonus * mausoleum);
}

export interface SpawnContext {
  graves: Grave[];
  placeables: Decoration[];
  isNight: boolean;
  /** Fantasma generico già deciso dalla simulazione (o null). */
  ghostGraveId: string | null;
}

/**
 * Decide quali entità erranti compaiono in questa esecuzione, applicando i
 * modificatori degli edifici. Deterministico rispetto alla `rng` passata.
 */
export function computeSpawns(ctx: SpawnContext, rng: Rng): RoamingSpawn[] {
  const { graves, placeables, isNight, ghostGraveId } = ctx;
  const b = countBuildings(placeables);
  const spawns: RoamingSpawn[] = [];

  // Fantasma generico (deciso dalla simulazione).
  if (ghostGraveId) spawns.push({ kind: 'ghost', graveId: ghostGraveId });

  // Fantasma-oggetto: raro, legato a una tomba, premia di più. Il mausoleo lo
  // rende più probabile.
  if (graves.length > 0 && rng.chance(withMausoleum(SPAWN_CHANCE.ghostObject, b.mausoleum))) {
    spawns.push({ kind: 'ghost', graveId: rng.pick(graves).id, rare: true });
  }

  if (rng.chance(SPAWN_CHANCE.cat)) spawns.push({ kind: 'cat' });
  if (!isNight && rng.chance(SPAWN_CHANCE.crowDay)) spawns.push({ kind: 'crow' });

  // Prete: santuario e mausoleo ne aumentano la comparsa.
  if (graves.length > 0) {
    const p = withMausoleum(
      SPAWN_CHANCE.priest + SPAWN_MODIFIERS.shrinePriestBonus * b.shrine,
      b.mausoleum,
    );
    if (rng.chance(p)) spawns.push({ kind: 'priest', graveId: rng.pick(graves).id });
  }

  // Becchino: la casa del becchino lo richiama più spesso.
  if (
    rng.chance(SPAWN_CHANCE.gravedigger + SPAWN_MODIFIERS.gravediggerHouseBonus * b.gravediggerHouse)
  ) {
    spawns.push({ kind: 'gravedigger' });
  }

  if (isNight && rng.chance(SPAWN_CHANCE.ratNight)) spawns.push({ kind: 'rat' });

  // Zombie: le bare aperte (tombe dissotterrate) li attirano.
  if (b.openCoffin > 0) {
    const p = Math.min(
      SPAWN_MODIFIERS.zombieChanceMax,
      SPAWN_MODIFIERS.zombiePerOpenCoffin * b.openCoffin,
    );
    if (rng.chance(p)) {
      spawns.push({ kind: 'zombie', graveId: graves.length > 0 ? rng.pick(graves).id : undefined });
    }
  }

  return spawns;
}
