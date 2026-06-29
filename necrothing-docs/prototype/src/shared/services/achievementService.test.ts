import { describe, expect, it } from 'vitest';
import { evaluateAchievements, ACHIEVEMENTS } from './achievementService';
import type { Grave, UserProgression } from '@/shared/domain/types';

function grave(over: Partial<Grave>): Grave {
  return {
    id: 'g-' + Math.random().toString(36).slice(2),
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
    isDirty: false,
    dirtySince: null,
    broken: false,
    lastAnniversaryYear: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

const progression: UserProgression = {
  id: 'singleton',
  xp: 0,
  prestige: 0,
  wisps: 0,
  lastAbstractBurialDate: null,
  lastShareDate: null,
};

describe('evaluateAchievements', () => {
  it('sblocca il primo inquilino con una tomba', () => {
    const got = evaluateAchievements({ graves: [grave({})], progression }, new Set());
    expect(got.map((a) => a.id)).toContain('first_burial');
  });

  it('non risblocca achievement già ottenuti', () => {
    const got = evaluateAchievements(
      { graves: [grave({})], progression },
      new Set(['first_burial']),
    );
    expect(got.map((a) => a.id)).not.toContain('first_burial');
  });

  it('sblocca per varietà di categorie e per oggetto astratto', () => {
    const cats = ['electronics', 'plants', 'clothing', 'household', 'abstract'] as const;
    const graves = cats.map((category, i) => grave({ category, gridX: i }));
    const ids = evaluateAchievements({ graves, progression }, new Set()).map((a) => a.id);
    expect(ids).toContain('variety_5');
    expect(ids).toContain('abstract_grief');
  });

  it('sblocca rango 3 con XP sufficiente', () => {
    const ids = evaluateAchievements(
      { graves: [grave({})], progression: { ...progression, xp: 2000 } },
      new Set(),
    ).map((a) => a.id);
    expect(ids).toContain('rank_3');
  });

  it('sblocca achievement a soglia dai contatori cumulativi', () => {
    const ids = evaluateAchievements(
      {
        graves: [grave({})],
        progression: { ...progression, flowersBrought: 10, cleanups: 15, wispsSpent: 50 },
      },
      new Set(),
    ).map((a) => a.id);
    expect(ids).toContain('green_thumb');
    expect(ids).toContain('caretaker_silver');
    expect(ids).toContain('spender');
  });

  it('calcola il progresso parziale verso una soglia', () => {
    const def = ACHIEVEMENTS.find((a) => a.id === 'green_thumb')!;
    const p = def.progress!({ graves: [], progression: { ...progression, flowersBrought: 5 } });
    expect(p).toBeCloseTo(0.5);
  });

  it('sblocca achievement di mausoleo e distretti dal context esteso', () => {
    const ids = evaluateAchievements(
      {
        graves: [grave({})],
        progression,
        decorations: [
          { id: 'd1', type: 'mausoleum', gridX: 0, gridY: 0, createdAt: '2026-01-01T00:00:00Z' },
        ],
        zones: [
          { id: 'z1', theme: 'gothic', gridX: 0, gridY: 0, w: 4, h: 4, createdAt: '' },
          { id: 'z2', theme: 'natural', gridX: 6, gridY: 0, w: 4, h: 4, createdAt: '' },
          { id: 'z3', theme: 'tech', gridX: 12, gridY: 0, w: 4, h: 4, createdAt: '' },
        ],
      },
      new Set(),
    ).map((a) => a.id);
    expect(ids).toContain('mausoleum_built');
    expect(ids).toContain('district_gothic');
    expect(ids).toContain('master_planner');
  });
});
