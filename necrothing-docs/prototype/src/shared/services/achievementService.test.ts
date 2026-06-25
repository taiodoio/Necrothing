import { describe, expect, it } from 'vitest';
import { evaluateAchievements } from './achievementService';
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
});
