import { describe, expect, it } from 'vitest';
import { expansionFor, usableRows } from './expansionService';
import { EXPANSION } from '@/shared/domain/balance';
import { MAP_ROWS } from '@/shared/domain/types';

describe('expansionService', () => {
  it('parte dal recinto iniziale a prestigio 0', () => {
    const e = expansionFor(0);
    expect(e.level).toBe(0);
    expect(e.rows).toBe(EXPANSION.tiers[0].rows);
    expect(e.next?.minPrestige).toBe(EXPANSION.tiers[1].minPrestige);
    expect(e.toNext).toBe(EXPANSION.tiers[1].minPrestige);
  });

  it('avanza di tier alla soglia di prestigio', () => {
    const t1 = EXPANSION.tiers[1];
    const e = expansionFor(t1.minPrestige);
    expect(e.level).toBe(1);
    expect(e.rows).toBe(t1.rows);
  });

  it('al massimo prestigio sblocca l intera mappa e non ha prossimo tier', () => {
    const e = expansionFor(10_000);
    expect(e.rows).toBe(MAP_ROWS);
    expect(e.next).toBeNull();
    expect(e.toNext).toBe(0);
  });

  it('usableRows non supera mai MAP_ROWS', () => {
    expect(usableRows(0)).toBeLessThanOrEqual(MAP_ROWS);
    expect(usableRows(10_000)).toBe(MAP_ROWS);
  });

  it('toNext diminuisce con il prestigio', () => {
    const a = expansionFor(0).toNext;
    const b = expansionFor(10).toNext;
    expect(b).toBeLessThan(a);
  });
});
