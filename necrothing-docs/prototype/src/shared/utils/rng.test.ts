import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('è deterministico a parità di seed', () => {
    const a = createRng('necro');
    const b = createRng('necro');
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('produce sequenze diverse con seed diversi', () => {
    const a = createRng('uno');
    const b = createRng('due');
    expect(a.next()).not.toBe(b.next());
  });

  it('next() resta in [0,1)', () => {
    const r = createRng('range');
    for (let i = 0; i < 100; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() resta nel range richiesto', () => {
    const r = createRng('int');
    for (let i = 0; i < 100; i++) {
      const v = r.int(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });
});
