// World Simulation Engine. Eseguito all'apertura / ritorno in foreground.
// Deterministico (seed salvato) e idempotente rispetto al delta temporale.
// Vedi docs/game-design/04-world-simulation.md

import { WEATHER, type Weather } from '@/shared/domain/enums';
import type { Grave, WorldState } from '@/shared/domain/types';
import { graveRepository } from '@/shared/repositories/graveRepository';
import { worldRepository } from '@/shared/repositories/worldRepository';
import { dayPhaseForHour, daysBetween, seasonForMonth } from '@/shared/utils/date';
import { createRng, randomSeed } from '@/shared/utils/rng';
import type { ClockService } from '@/shared/utils/clock';

export interface SimulationResult {
  world: WorldState;
  updatedGraves: Grave[];
  newWeeds: number;
  witheredFlowers: number;
  ghostGraveId: string | null;
}

function pickWeather(rng: ReturnType<typeof createRng>, isNight: boolean): Weather {
  if (isNight && rng.chance(0.15)) return 'full_moon';
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
    const updatedGraves: Grave[] = [];
    let newWeeds = 0;
    let witheredFlowers = 0;

    for (const grave of graves) {
      let changed = false;
      const next = { ...grave };

      // Erbacce: probabilità cumulativa con i giorni trascorsi.
      if (!next.hasWeeds && elapsedDays > 0) {
        const p = Math.min(0.8, 0.12 * elapsedDays);
        if (rng.chance(p)) {
          next.hasWeeds = true;
          changed = true;
          newWeeds++;
        }
      }

      // Fiori: appassiscono dopo ~3 giorni.
      if (next.hasFlowers && next.flowersUpdatedAt) {
        const flowerAge = daysBetween(new Date(next.flowersUpdatedAt), now);
        if (flowerAge >= 3) {
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
    if (graves.length > 0) {
      const ghostChance = isNight ? 0.08 : 0.02;
      if (rng.chance(ghostChance)) {
        ghostGraveId = rng.pick(graves).id;
      }
    }

    const nextWorld: WorldState = {
      ...world,
      lastSimulationAt: clock.nowIso(),
      currentDayPhase: phase,
      currentSeason: seasonForMonth(now.getMonth()),
      currentWeather: pickWeather(rng, isNight),
    };
    await worldRepository.save(nextWorld);

    return { world: nextWorld, updatedGraves, newWeeds, witheredFlowers, ghostGraveId };
  },
};
