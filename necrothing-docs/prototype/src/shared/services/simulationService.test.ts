import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { simulationService } from './simulationService';
import { XP_VALUES } from './progressionService';
import { __resetDbForTests } from '@/shared/db/schema';
import { graveRepository } from '@/shared/repositories/graveRepository';
import { fixedClock } from '@/shared/utils/clock';
import type { Grave, WorldState } from '@/shared/domain/types';

function grave(over: Partial<Grave>): Grave {
  return {
    id: 'g-' + Math.random().toString(36).slice(2),
    name: 'Oggetto',
    category: 'other',
    birthDate: null,
    deathDate: '2020-06-25',
    deathCause: 'mystery',
    epitaph: null,
    photoId: null,
    graveType: 'stone_simple',
    gridX: 0,
    gridY: 0,
    hasFlowers: false,
    flowersUpdatedAt: null,
    hasWeeds: false,
    isDirty: false,
    dirtySince: null,
    broken: false,
    lastAnniversaryYear: null,
    createdAt: '2020-06-25T00:00:00Z',
    updatedAt: '2020-06-25T00:00:00Z',
    ...over,
  };
}

function world(): WorldState {
  return {
    id: 'singleton',
    lastSimulationAt: '2026-06-24T10:00:00Z',
    currentWeather: 'gloomy_clear',
    currentSeason: 'summer',
    currentDayPhase: 'day',
    seed: 'test-seed',
    looseWisps: [],
  };
}

describe('simulationService — anniversari', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetDbForTests();
  });

  it('rileva un anniversario, premia XP e lo registra una sola volta', async () => {
    const clock = fixedClock('2026-06-25T10:00:00Z'); // stesso giorno/mese della morte 2020
    await graveRepository.create(grave({ gridX: 0, gridY: 0, deathDate: '2020-06-25' }));

    const r1 = await simulationService.run(world(), clock);
    expect(r1.anniversaries).toHaveLength(1);
    expect(r1.xpGained).toBe(XP_VALUES.anniversary);

    // Seconda esecuzione lo stesso anno: nessun nuovo anniversario.
    const r2 = await simulationService.run(r1.world, clock);
    expect(r2.anniversaries).toHaveLength(0);
  });

  it('non considera anniversario il giorno della morte (stesso anno)', async () => {
    const clock = fixedClock('2026-06-25T10:00:00Z');
    await graveRepository.create(grave({ gridX: 1, gridY: 0, deathDate: '2026-06-25' }));
    const r = await simulationService.run(world(), clock);
    expect(r.anniversaries).toHaveLength(0);
  });
});

describe('simulationService — ciclo stati tomba', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetDbForTests();
  });

  it('i fiori dopo N giorni lasciano la tomba SPORCA (non pulita)', async () => {
    const clock = fixedClock('2026-06-25T10:00:00Z');
    // Fiori portati 4 giorni fa (> flowerWitherDays = 3).
    await graveRepository.create(
      grave({ hasFlowers: true, flowersUpdatedAt: '2026-06-21T10:00:00Z' }),
    );
    await simulationService.run(world(), clock);
    const after = (await graveRepository.getAll())[0];
    expect(after.hasFlowers).toBe(false);
    expect(after.isDirty).toBe(true);
  });

  it('una tomba fiorita di recente resta pulita+fiori (niente sporco casuale)', async () => {
    const clock = fixedClock('2026-06-25T10:00:00Z');
    await graveRepository.create(
      grave({ hasFlowers: true, flowersUpdatedAt: '2026-06-25T09:00:00Z' }),
    );
    await simulationService.run(world(), clock);
    const after = (await graveRepository.getAll())[0];
    expect(after.hasFlowers).toBe(true);
    expect(after.isDirty).toBe(false);
    expect(after.hasWeeds).toBe(false);
  });
});
