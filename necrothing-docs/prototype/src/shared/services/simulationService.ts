// World Simulation Engine. Eseguito all'apertura / ritorno in foreground.
// Deterministico (seed salvato) e idempotente rispetto al delta temporale.
// Vedi docs/game-design/04-world-simulation.md

import { WEATHER, type MemoryEventType, type Weather } from '@/shared/domain/enums';
import type { Grave, GraveMemoryEvent, LooseWisp, WorldState } from '@/shared/domain/types';
import type { RoamingSpawn } from '@/shared/domain/roaming';
import { SIM, SPAWN_CHANCE, DECAY } from '@/shared/domain/balance';
import { MAP_COLS, MAP_ROWS } from '@/shared/domain/types';
import { buildOccupancy } from '@/shared/domain/placeables';
import { graveRepository, memoryEventRepository } from '@/shared/repositories/graveRepository';
import { decorationsRepository } from '@/shared/repositories/decorationsRepository';
import { worldRepository } from '@/shared/repositories/worldRepository';
import { dayPhaseForHour, daysBetween, seasonForMonth } from '@/shared/utils/date';
import { createRng, randomSeed } from '@/shared/utils/rng';
import { XP_VALUES } from './progressionService';
import { newId } from '@/shared/utils/id';
import type { ClockService } from '@/shared/utils/clock';

function makeEvent(
  graveId: string,
  type: MemoryEventType,
  clock: ClockService,
): GraveMemoryEvent {
  return { id: newId(), graveId, type, occurredAt: clock.nowIso(), payloadJson: null };
}

export interface AnniversaryHit {
  graveId: string;
  name: string;
}

export interface SimulationResult {
  world: WorldState;
  updatedGraves: Grave[];
  newWeeds: number;
  newDirt: number;
  newBroken: number;
  witheredFlowers: number;
  ghostGraveId: string | null;
  ghostGraveName: string | null;
  blessingGraveId: string | null;
  blessingGraveName: string | null;
  /** Entità erranti da far comparire sulla mappa (consumate dalla UI). */
  spawns: RoamingSpawn[];
  anniversaries: AnniversaryHit[];
  /** XP totale maturato durante la simulazione (anniversari + benedizioni). */
  xpGained: number;
}

/** Vero se oggi ricorre l'anniversario annuale della morte (anni successivi). */
function isAnniversaryToday(grave: Grave, now: Date): boolean {
  const death = new Date(grave.deathDate);
  return (
    now.getMonth() === death.getMonth() &&
    now.getDate() === death.getDate() &&
    now.getFullYear() > death.getFullYear() &&
    grave.lastAnniversaryYear !== now.getFullYear()
  );
}

function pickWeather(rng: ReturnType<typeof createRng>, isNight: boolean): Weather {
  if (isNight && rng.chance(SIM.fullMoonChance)) return 'full_moon';
  const dayWeather = WEATHER.filter((w) => w !== 'full_moon');
  return rng.pick(dayWeather);
}

export const simulationService = {
  /** Crea lo stato mondo iniziale. */
  initialWorld(clock: ClockService): WorldState {
    const now = clock.now();
    return {
      id: 'singleton',
      lastSimulationAt: clock.nowIso(),
      currentWeather: 'gloomy_clear',
      currentSeason: seasonForMonth(now.getMonth()),
      currentDayPhase: dayPhaseForHour(now.getHours()),
      seed: randomSeed(),
      looseWisps: [],
    };
  },

  /**
   * Esegue la simulazione: aggiorna giorno/notte, stagione, meteo, erbacce e
   * fiori in base al tempo trascorso. Persiste lo stato.
   */
  async run(world: WorldState, clock: ClockService): Promise<SimulationResult> {
    const now = clock.now();
    const last = new Date(world.lastSimulationAt);
    const elapsedDays = Math.max(0, daysBetween(last, now));

    const phase = dayPhaseForHour(now.getHours());
    const isNight = phase === 'night';
    // RNG combinato col giorno per variare nel tempo ma restare deterministico.
    const rng = createRng(`${world.seed}:${now.toISOString().slice(0, 13)}`);

    const graves = await graveRepository.getAll();
    const placeables = await decorationsRepository.getAll();
    const updatedGraves: Grave[] = [];
    const anniversaries: AnniversaryHit[] = [];
    let newWeeds = 0;
    let newDirt = 0;
    let newBroken = 0;
    let witheredFlowers = 0;
    let xpGained = 0;

    for (const grave of graves) {
      let changed = false;
      const next = { ...grave };

      // Anniversario annuale della morte.
      if (isAnniversaryToday(next, now)) {
        next.lastAnniversaryYear = now.getFullYear();
        changed = true;
        await memoryEventRepository.add(makeEvent(next.id, 'anniversary', clock));
        anniversaries.push({ graveId: next.id, name: next.name });
        xpGained += XP_VALUES.anniversary;
      }

      // Erbacce: probabilità cumulativa con i giorni trascorsi.
      if (!next.hasWeeds && elapsedDays > 0) {
        const p = Math.min(SIM.weedProbMax, SIM.weedProbPerDay * elapsedDays);
        if (rng.chance(p)) {
          next.hasWeeds = true;
          changed = true;
          newWeeds++;
        }
      }

      // Sporcizia (polvere/muschio): si accumula più lentamente delle erbacce.
      if (!next.isDirty && elapsedDays > 0) {
        const p = Math.min(SIM.dirtProbMax, SIM.dirtProbPerDay * elapsedDays);
        if (rng.chance(p)) {
          next.isDirty = true;
          next.dirtySince = clock.nowIso();
          changed = true;
          newDirt++;
        }
      }

      // Rottura: una tomba trascurata troppo a lungo si rompe (e perde i fiori).
      if (next.isDirty && !next.broken && next.dirtySince) {
        const graceDays = DECAY.graveBreakDays + (next.hasFlowers ? DECAY.flowerGraceDays : 0);
        if (daysBetween(new Date(next.dirtySince), now) >= graceDays) {
          next.broken = true;
          next.hasFlowers = false;
          changed = true;
          newBroken++;
        }
      }

      // Fiori: appassiscono dopo ~3 giorni.
      if (next.hasFlowers && next.flowersUpdatedAt) {
        const flowerAge = daysBetween(new Date(next.flowersUpdatedAt), now);
        if (flowerAge >= SIM.flowerWitherDays) {
          next.hasFlowers = false;
          changed = true;
          witheredFlowers++;
        }
      }

      if (changed) {
        next.updatedAt = clock.nowIso();
        await graveRepository.update(next);
        updatedGraves.push(next);
      }
    }

    // Evento fantasma raro, più probabile di notte.
    let ghostGraveId: string | null = null;
    let ghostGraveName: string | null = null;
    if (graves.length > 0) {
      const ghostChance = isNight ? SIM.ghostChanceNight : SIM.ghostChanceDay;
      if (rng.chance(ghostChance)) {
        const ghost = rng.pick(graves);
        ghostGraveId = ghost.id;
        ghostGraveName = ghost.name;
      }
    }

    // Benedizione del prete: evento casuale che premia una tomba.
    let blessingGraveId: string | null = null;
    let blessingGraveName: string | null = null;
    if (graves.length > 0 && rng.chance(SIM.blessingChance)) {
      const blessed = rng.pick(graves);
      blessingGraveId = blessed.id;
      blessingGraveName = blessed.name;
      await memoryEventRepository.add(makeEvent(blessed.id, 'blessing', clock));
      xpGained += XP_VALUES.blessing;
    }

    // Entità erranti: comparse probabilistiche legate a fascia oraria.
    const spawns: RoamingSpawn[] = [];
    if (ghostGraveId) spawns.push({ kind: 'ghost', graveId: ghostGraveId });
    if (rng.chance(SPAWN_CHANCE.cat)) spawns.push({ kind: 'cat' });
    if (!isNight && rng.chance(SPAWN_CHANCE.crowDay)) spawns.push({ kind: 'crow' });
    if (graves.length > 0 && rng.chance(SPAWN_CHANCE.priest)) {
      spawns.push({ kind: 'priest', graveId: rng.pick(graves).id });
    }
    if (isNight && rng.chance(SPAWN_CHANCE.ratNight)) spawns.push({ kind: 'rat' });

    // Spawn di fuochi fatui (moneta) su celle libere, fino a un tetto.
    const looseWisps: LooseWisp[] = [...(world.looseWisps ?? [])];
    const occ = buildOccupancy(graves, placeables);
    const taken = new Set([...occ, ...looseWisps.map((w) => `${w.gridX},${w.gridY}`)]);
    const toSpawn = Math.min(SIM.wispCap - looseWisps.length, 1 + rng.int(SIM.wispSpawnMax));
    let attempts = 0;
    let spawned = 0;
    while (spawned < toSpawn && attempts < 60) {
      attempts++;
      const x = rng.int(MAP_COLS);
      const y = rng.int(MAP_ROWS);
      const key = `${x},${y}`;
      if (taken.has(key)) continue;
      taken.add(key);
      looseWisps.push({ id: newId(), gridX: x, gridY: y });
      spawned++;
    }

    const nextWorld: WorldState = {
      ...world,
      lastSimulationAt: clock.nowIso(),
      currentDayPhase: phase,
      currentSeason: seasonForMonth(now.getMonth()),
      currentWeather: pickWeather(rng, isNight),
      looseWisps,
    };
    await worldRepository.save(nextWorld);

    return {
      world: nextWorld,
      updatedGraves,
      newWeeds,
      newDirt,
      newBroken,
      witheredFlowers,
      ghostGraveId,
      ghostGraveName,
      blessingGraveId,
      blessingGraveName,
      spawns,
      anniversaries,
      xpGained,
    };
  },
};
