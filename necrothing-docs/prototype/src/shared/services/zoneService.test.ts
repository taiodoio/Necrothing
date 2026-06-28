import { describe, expect, it } from 'vitest';
import { detectDistricts, graveFitsTheme, activeThemes } from './zoneService';
import type { Grave } from '@/shared/domain/types';

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
    lastAnniversaryYear: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

/** 4 tombe gotiche ravvicinate (passo 2 = adiacenti). */
function gothicCluster(ox: number, oy: number): Grave[] {
  return [
    grave({ graveType: 'gothic', gridX: ox, gridY: oy }),
    grave({ graveType: 'angel', gridX: ox + 2, gridY: oy }),
    grave({ graveType: 'obelisk', gridX: ox, gridY: oy + 2 }),
    grave({ graveType: 'broken', gridX: ox + 2, gridY: oy + 2 }),
  ];
}

describe('zoneService — distretti auto-rilevati', () => {
  it('riconosce la coerenza tema', () => {
    expect(graveFitsTheme(grave({ graveType: 'gothic' }), 'gothic')).toBe(true);
    expect(graveFitsTheme(grave({ category: 'electronics' }), 'tech')).toBe(true);
    expect(graveFitsTheme(grave({ category: 'plants' }), 'natural')).toBe(true);
    expect(graveFitsTheme(grave({ graveType: 'stone_simple', category: 'other' }), 'gothic')).toBe(
      false,
    );
  });

  it('forma un distretto con 4 tombe coerenti vicine', () => {
    const zones = detectDistricts(gothicCluster(2, 2));
    expect(zones).toHaveLength(1);
    expect(zones[0].theme).toBe('gothic');
  });

  it('non forma un distretto sotto soglia (3 tombe)', () => {
    const three = gothicCluster(2, 2).slice(0, 3);
    expect(detectDistricts(three)).toHaveLength(0);
  });

  it('non collega tombe lontane', () => {
    const far = [
      grave({ graveType: 'gothic', gridX: 0, gridY: 0 }),
      grave({ graveType: 'gothic', gridX: 0, gridY: 2 }),
      grave({ graveType: 'gothic', gridX: 20, gridY: 20 }),
      grave({ graveType: 'gothic', gridX: 20, gridY: 22 }),
    ];
    // due gruppi da 2: nessuno raggiunge la soglia di 4
    expect(detectDistricts(far)).toHaveLength(0);
  });

  it('rileva distretti di temi diversi e activeThemes li elenca', () => {
    const tech = [
      grave({ category: 'electronics', gridX: 10, gridY: 10 }),
      grave({ category: 'household', gridX: 12, gridY: 10 }),
      grave({ category: 'electronics', gridX: 10, gridY: 12 }),
      grave({ category: 'household', gridX: 12, gridY: 12 }),
    ];
    const zones = detectDistricts([...gothicCluster(0, 0), ...tech]);
    const themes = activeThemes(zones);
    expect(themes.has('gothic')).toBe(true);
    expect(themes.has('tech')).toBe(true);
    expect(themes.size).toBe(2);
  });
});
