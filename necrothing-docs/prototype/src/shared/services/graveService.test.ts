import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { graveService, BurialError } from './graveService';
import { __resetDbForTests } from '@/shared/db/schema';
import { fixedClock } from '@/shared/utils/clock';
import { emptyDraft, type BurialDraft } from '@/features/burial/validation';
import { XP_VALUES } from './progressionService';

const clock = fixedClock('2026-06-25T10:00:00Z');

function draftAt(x: number, y: number, over: Partial<BurialDraft> = {}): BurialDraft {
  return {
    ...emptyDraft(),
    name: 'Caricatore',
    category: 'electronics',
    deathDate: '2026-06-24',
    deathCause: 'broken_cable',
    graveType: 'wood_cross',
    gridX: x,
    gridY: y,
    ...over,
  };
}

describe('graveService', () => {
  beforeEach(() => {
    // DB pulito per ogni test.
    globalThis.indexedDB = new IDBFactory();
    __resetDbForTests();
  });

  it('crea una tomba e assegna XP corretti', async () => {
    const { grave, xpAwarded } = await graveService.bury(draftAt(0, 0), clock);
    expect(grave.name).toBe('Caricatore');
    expect(xpAwarded).toBe(XP_VALUES.burialPhysical);
    const all = await graveService.listGraves();
    expect(all).toHaveLength(1);
  });

  it('assegna meno XP a un oggetto astratto', async () => {
    const { xpAwarded } = await graveService.bury(
      draftAt(2, 0, { category: 'abstract' }),
      clock,
    );
    expect(xpAwarded).toBe(XP_VALUES.burialAbstract);
  });

  it('rifiuta una cella già occupata', async () => {
    await graveService.bury(draftAt(1, 1), clock);
    await expect(graveService.bury(draftAt(1, 1, { name: 'Altro' }), clock)).rejects.toBeInstanceOf(
      BurialError,
    );
  });

  it('registra un memory event di sepoltura', async () => {
    const { grave } = await graveService.bury(draftAt(0, 2), clock);
    const events = await graveService.listEvents(grave.id);
    expect(events.map((e) => e.type)).toContain('burial');
  });

  it('porta fiori e dà XP solo la prima volta nel giorno', async () => {
    const { grave } = await graveService.bury(draftAt(3, 3), clock);
    const first = await graveService.bringFlowers(grave.id, clock);
    expect(first.xpAwarded).toBe(XP_VALUES.flowers);
    expect(first.grave.hasFlowers).toBe(true);
    const second = await graveService.bringFlowers(grave.id, clock);
    expect(second.xpAwarded).toBe(0);
  });

  it('pulisce le erbacce solo se presenti', async () => {
    const { grave } = await graveService.bury(draftAt(4, 4), clock);
    const noWeeds = await graveService.cleanWeeds(grave.id, clock);
    expect(noWeeds.xpAwarded).toBe(0);
  });
});
