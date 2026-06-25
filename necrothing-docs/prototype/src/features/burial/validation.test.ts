import { describe, expect, it } from 'vitest';
import {
  emptyDraft,
  isValidBurial,
  validateBurial,
  validateDates,
  validateEpitaph,
  validateName,
} from './validation';

const NOW = new Date('2026-06-25T12:00:00Z');

describe('validateName', () => {
  it('richiede almeno 1 carattere', () => {
    expect(validateName('')).toBeTruthy();
    expect(validateName('   ')).toBeTruthy();
  });
  it('rifiuta oltre 80 caratteri', () => {
    expect(validateName('x'.repeat(81))).toBeTruthy();
  });
  it('accetta un nome valido', () => {
    expect(validateName('Caricatore')).toBeUndefined();
  });
});

describe('validateEpitaph', () => {
  it('accetta null e stringhe brevi', () => {
    expect(validateEpitaph(null)).toBeUndefined();
    expect(validateEpitaph('breve')).toBeUndefined();
  });
  it('rifiuta oltre 240 caratteri', () => {
    expect(validateEpitaph('x'.repeat(241))).toBeTruthy();
  });
});

describe('validateDates', () => {
  it('rifiuta date di morte future', () => {
    const e = validateDates(null, '2999-01-01', NOW);
    expect(e.deathDate).toBeTruthy();
  });
  it('rifiuta nascita successiva alla morte', () => {
    const e = validateDates('2026-06-26', '2026-06-25', NOW);
    expect(e.birthDate).toBeTruthy();
  });
  it('accetta date coerenti', () => {
    const e = validateDates('2020-01-01', '2026-06-24', NOW);
    expect(e.birthDate).toBeUndefined();
    expect(e.deathDate).toBeUndefined();
  });
});

describe('validateBurial', () => {
  it('un draft vuoto è invalido', () => {
    expect(isValidBurial(emptyDraft(), NOW)).toBe(false);
  });
  it('un draft completo è valido', () => {
    const draft = {
      ...emptyDraft(),
      name: 'Mouse',
      category: 'electronics' as const,
      deathDate: '2026-06-24',
      deathCause: 'natural_wear' as const,
      graveType: 'stone_simple' as const,
      gridX: 0,
      gridY: 0,
    };
    expect(validateBurial(draft, NOW)).toEqual({});
    expect(isValidBurial(draft, NOW)).toBe(true);
  });
  it('accetta causa personalizzata', () => {
    const draft = {
      ...emptyDraft(),
      name: 'Idea',
      category: 'abstract' as const,
      deathDate: '2026-06-24',
      deathCause: null,
      deathCauseCustom: 'Mancanza di fondi',
      graveType: 'gothic' as const,
      gridX: 1,
      gridY: 1,
    };
    expect(isValidBurial(draft, NOW)).toBe(true);
  });
});
