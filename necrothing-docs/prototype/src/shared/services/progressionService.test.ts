import { describe, expect, it } from 'vitest';
import {
  computePrestige,
  nextRank,
  rankForXp,
  rankProgress,
  XP_VALUES,
} from './progressionService';
import type { Grave } from '@/shared/domain/types';

function grave(partial: Partial<Grave>): Grave {
  return {
    id: Math.random().toString(36),
    name: 'X',
    category: 'other',
    birthDate: null,
    deathDate: '2026-01-01',
    deathCause: 'mystery',
    epitaph: null,
    photoId: null,
    graveType: 'stone_simple',
    gridX: 0,
    gridY: 0,
    hasFlowers: false,
    flowersUpdatedAt: null,
    hasWeeds: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('rankForXp', () => {
  it('mappa XP ai ranghi corretti', () => {
    expect(rankForXp(0).level).toBe(1);
    expect(rankForXp(499).level).toBe(1);
    expect(rankForXp(500).level).toBe(2);
    expect(rankForXp(3500).level).toBe(4);
    expect(rankForXp(99999).level).toBe(5);
  });
});

describe('nextRank / rankProgress', () => {
  it('al massimo rango non esiste successivo', () => {
    expect(nextRank(7000)).toBeNull();
    expect(rankProgress(7000)).toBe(1);
  });
  it('progresso intermedio è tra 0 e 1', () => {
    const p = rankProgress(250); // metà verso 500
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('computePrestige', () => {
  it('aumenta con numero, fiori, pulizia e varietà', () => {
    const base = computePrestige([grave({ category: 'electronics' })]);
    const richer = computePrestige([
      grave({ category: 'electronics', hasFlowers: true }),
      grave({ category: 'plants', hasFlowers: true }),
    ]);
    expect(richer).toBeGreaterThan(base);
  });
});

describe('XP_VALUES', () => {
  it('oggetto fisico vale più di astratto', () => {
    expect(XP_VALUES.burialPhysical).toBeGreaterThan(XP_VALUES.burialAbstract);
  });
});
