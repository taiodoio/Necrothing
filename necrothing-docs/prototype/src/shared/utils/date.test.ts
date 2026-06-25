import { describe, expect, it } from 'vitest';
import {
  dayPhaseForHour,
  isFutureDate,
  isWithinQuietHours,
  nextAnniversary,
  seasonForMonth,
} from './date';

describe('isFutureDate', () => {
  const now = new Date('2026-06-25T12:00:00Z');
  it('rileva date future e passate', () => {
    expect(isFutureDate('2026-06-26', now)).toBe(true);
    expect(isFutureDate('2026-06-25', now)).toBe(false);
    expect(isFutureDate('2026-06-24', now)).toBe(false);
  });
});

describe('dayPhaseForHour', () => {
  it('mappa le ore alle fasi', () => {
    expect(dayPhaseForHour(6)).toBe('dawn');
    expect(dayPhaseForHour(12)).toBe('day');
    expect(dayPhaseForHour(19)).toBe('dusk');
    expect(dayPhaseForHour(2)).toBe('night');
  });
});

describe('seasonForMonth', () => {
  it('mappa i mesi alle stagioni', () => {
    expect(seasonForMonth(3)).toBe('spring');
    expect(seasonForMonth(6)).toBe('summer');
    expect(seasonForMonth(9)).toBe('autumn');
    expect(seasonForMonth(0)).toBe('winter');
  });
});

describe('nextAnniversary', () => {
  it('restituisce la prossima ricorrenza annuale', () => {
    const from = new Date('2026-06-25T12:00:00Z');
    const anniv = nextAnniversary('2020-12-31', from);
    expect(anniv.getMonth()).toBe(11);
    expect(anniv.getDate()).toBe(31);
    expect(anniv.getTime()).toBeGreaterThan(from.getTime());
  });
});

describe('isWithinQuietHours', () => {
  it('gestisce finestre che attraversano la mezzanotte', () => {
    expect(isWithinQuietHours(new Date('2026-06-25T23:00:00'), '22:00', '08:00')).toBe(true);
    expect(isWithinQuietHours(new Date('2026-06-25T07:00:00'), '22:00', '08:00')).toBe(true);
    expect(isWithinQuietHours(new Date('2026-06-25T12:00:00'), '22:00', '08:00')).toBe(false);
  });
  it('gestisce finestre diurne', () => {
    expect(isWithinQuietHours(new Date('2026-06-25T13:00:00'), '12:00', '14:00')).toBe(true);
    expect(isWithinQuietHours(new Date('2026-06-25T15:00:00'), '12:00', '14:00')).toBe(false);
  });
});
