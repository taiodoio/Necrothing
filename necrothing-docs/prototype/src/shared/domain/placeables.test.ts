import { describe, expect, it } from 'vitest';
import { buildOccupancy, canPlace, footprintCells, PLACEABLES } from './placeables';
import { GRAVE_FOOTPRINT, type Decoration, type Grave } from './types';

function grave(x: number, y: number): Grave {
  return {
    id: `g-${x}-${y}`,
    name: 'X',
    category: 'other',
    birthDate: null,
    deathDate: '2026-01-01',
    deathCause: 'mystery',
    epitaph: null,
    photoId: null,
    graveType: 'stone_simple',
    gridX: x,
    gridY: y,
    hasFlowers: false,
    flowersUpdatedAt: null,
    hasWeeds: false,
    isDirty: false,
    dirtySince: null,
    broken: false,
    lastAnniversaryYear: null,
    createdAt: 'x',
    updatedAt: 'x',
  };
}

function deco(type: Decoration['type'], x: number, y: number): Decoration {
  return { id: `d-${x}-${y}`, type, gridX: x, gridY: y, createdAt: 'x' };
}

describe('footprintCells', () => {
  it('un 2×2 copre 4 celle', () => {
    expect(footprintCells(0, 0, [2, 2]).sort()).toEqual(['0,0', '0,1', '1,0', '1,1'].sort());
  });
});

describe('buildOccupancy + canPlace', () => {
  it('una tomba occupa 2×2 e blocca la sovrapposizione', () => {
    const occ = buildOccupancy([grave(2, 2)], []);
    expect(occ.has('2,2')).toBe(true);
    expect(occ.has('3,3')).toBe(true);
    // anchor che sovrappone -> non piazzabile
    expect(canPlace(3, 3, GRAVE_FOOTPRINT, occ, 24, 32)).toBe(false);
    // spazio libero -> piazzabile
    expect(canPlace(10, 10, GRAVE_FOOTPRINT, occ, 24, 32)).toBe(true);
  });

  it('rispetta i bordi della mappa', () => {
    const occ = buildOccupancy([], []);
    expect(canPlace(23, 31, GRAVE_FOOTPRINT, occ, 24, 32)).toBe(false); // 2×2 esce
    expect(canPlace(22, 30, GRAVE_FOOTPRINT, occ, 24, 32)).toBe(true);
  });

  it('willow 2×2 e candela 1×1 hanno footprint diversi', () => {
    expect(PLACEABLES.willow.footprint).toEqual([2, 2]);
    expect(PLACEABLES.candle.footprint).toEqual([1, 1]);
    const occ = buildOccupancy([], [deco('willow', 0, 0)]);
    expect(occ.has('1,1')).toBe(true);
    expect(canPlace(1, 1, [1, 1], occ, 24, 32)).toBe(false);
  });
});

describe('catalogo esteso (Fase D)', () => {
  it('ogni PLACEABLE_TYPE ha una definizione con categoria valida', async () => {
    const { PLACEABLE_TYPES, PLACEABLE_CATEGORIES } = await import('./enums');
    for (const t of PLACEABLE_TYPES) {
      const def = PLACEABLES[t];
      expect(def, t).toBeTruthy();
      expect(PLACEABLE_CATEGORIES).toContain(def.category);
      expect(def.cost).toBeGreaterThan(0);
    }
  });

  it('lʼalbero di Natale è disponibile solo a dicembre', async () => {
    const { isSeasonallyAvailable } = await import('./enums');
    expect(isSeasonallyAvailable('xmas_tree', 11)).toBe(true);
    expect(isSeasonallyAvailable('xmas_tree', 5)).toBe(false);
    expect(isSeasonallyAvailable('candle', 5)).toBe(true);
  });
});
