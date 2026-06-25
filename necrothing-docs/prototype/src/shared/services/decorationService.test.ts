import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { decorationService, DecorationError, unlockedPlaceables } from './decorationService';
import { graveService } from './graveService';
import { __resetDbForTests } from '@/shared/db/schema';
import { fixedClock } from '@/shared/utils/clock';
import { emptyDraft } from '@/features/burial/validation';

const clock = fixedClock('2026-06-25T10:00:00Z');

describe('unlockedPlaceables', () => {
  it('sblocca progressivamente per rango', () => {
    const r1 = unlockedPlaceables(1);
    expect(r1).toContain('candle');
    expect(r1).toContain('wreath');
    expect(r1).toContain('path_dirt');
    expect(r1).not.toContain('skull');
    expect(unlockedPlaceables(2)).toContain('mushroom');
    expect(unlockedPlaceables(3).length).toBeGreaterThan(unlockedPlaceables(2).length);
  });
});

describe('decorationService', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetDbForTests();
  });

  it('posiziona una decorazione sbloccata su cella libera', async () => {
    const deco = await decorationService.place('candle', 0, 0, 1, clock);
    expect(deco.type).toBe('candle');
    expect(await decorationService.list()).toHaveLength(1);
  });

  it('rifiuta una decorazione non sbloccata', async () => {
    await expect(decorationService.place('skull', 0, 0, 1, clock)).rejects.toBeInstanceOf(
      DecorationError,
    );
  });

  it('rifiuta una cella occupata da una tomba', async () => {
    await graveService.bury(
      {
        ...emptyDraft(),
        name: 'X',
        category: 'other',
        deathDate: '2026-06-24',
        deathCause: 'mystery',
        graveType: 'stone_simple',
        gridX: 2,
        gridY: 2,
      },
      clock,
    );
    await expect(decorationService.place('candle', 2, 2, 1, clock)).rejects.toBeInstanceOf(
      DecorationError,
    );
  });

  it('rifiuta una cella già decorata', async () => {
    await decorationService.place('candle', 1, 1, 1, clock);
    await expect(decorationService.place('wreath', 1, 1, 1, clock)).rejects.toBeInstanceOf(
      DecorationError,
    );
  });
});
