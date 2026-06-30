import { describe, expect, it } from 'vitest';
import { computeSpawns, countBuildings, type SpawnContext } from './spawnService';
import { SPAWN_CHANCE, SPAWN_MODIFIERS } from '@/shared/domain/balance';
import type { Decoration, Grave } from '@/shared/domain/types';
import type { Rng } from '@/shared/utils/rng';
import type { PlaceableType } from '@/shared/domain/enums';

function grave(id: string): Grave {
  return { id, gridX: 0, gridY: 0 } as Grave;
}
function placeable(type: PlaceableType): Decoration {
  return { id: type, type, gridX: 0, gridY: 0, createdAt: '' } as Decoration;
}

/** RNG finta: registra le probabilità richieste e restituisce esiti dati. */
function fakeRng(results: boolean): Rng & { chances: number[] } {
  const chances: number[] = [];
  return {
    next: () => 0,
    int: () => 0,
    chance: (p: number) => {
      chances.push(p);
      return results;
    },
    pick: <T>(items: readonly T[]) => items[0],
    chances,
  } as Rng & { chances: number[] };
}

const baseCtx = (over: Partial<SpawnContext> = {}): SpawnContext => ({
  graves: [grave('g1')],
  placeables: [],
  isNight: false,
  ghostGraveId: null,
  ...over,
});

describe('countBuildings', () => {
  it('conta gli edifici rilevanti', () => {
    const c = countBuildings([
      placeable('mausoleum'),
      placeable('shrine'),
      placeable('shrine'),
      placeable('gravedigger_house'),
      placeable('open_coffin'),
      placeable('vase'),
    ]);
    expect(c).toEqual({ mausoleum: 1, gravediggerHouse: 1, shrine: 2, openCoffin: 1 });
  });
});

describe('computeSpawns', () => {
  it('senza eventi (rng sempre falso) non genera comparse', () => {
    const spawns = computeSpawns(baseCtx(), fakeRng(false));
    expect(spawns).toHaveLength(0);
  });

  it('include il fantasma generico già deciso dalla simulazione', () => {
    const spawns = computeSpawns(baseCtx({ ghostGraveId: 'g1' }), fakeRng(false));
    expect(spawns).toEqual([{ kind: 'ghost', graveId: 'g1' }]);
  });

  it('rng sempre vero genera lʼinsieme completo di giorno', () => {
    const spawns = computeSpawns(
      baseCtx({ placeables: [placeable('open_coffin')] }),
      fakeRng(true),
    );
    const kinds = spawns.map((s) => s.kind);
    expect(kinds).toContain('ghost'); // fantasma-oggetto raro
    expect(spawns.some((s) => s.kind === 'ghost' && s.rare)).toBe(true);
    expect(kinds).toContain('cat');
    expect(kinds).toContain('crow');
    expect(kinds).toContain('priest');
    expect(kinds).toContain('gravedigger');
    expect(kinds).toContain('zombie');
  });

  it('il santuario aumenta la probabilità del prete', () => {
    const withoutShrine = fakeRng(false);
    computeSpawns(baseCtx(), withoutShrine);
    const withShrine = fakeRng(false);
    computeSpawns(baseCtx({ placeables: [placeable('shrine')] }), withShrine);
    // 4ª chance richiesta = prete (ghostObject, cat, crow, priest).
    expect(withShrine.chances[3]).toBeCloseTo(
      withoutShrine.chances[3] + SPAWN_MODIFIERS.shrinePriestBonus,
    );
  });

  it('il mausoleo aumenta gli eventi soprannaturali', () => {
    const plain = fakeRng(false);
    computeSpawns(baseCtx(), plain);
    const withMaus = fakeRng(false);
    computeSpawns(baseCtx({ placeables: [placeable('mausoleum')] }), withMaus);
    // 1ª chance = fantasma-oggetto.
    expect(withMaus.chances[0]).toBeCloseTo(
      SPAWN_CHANCE.ghostObjectDay * (1 + SPAWN_MODIFIERS.mausoleumEventBonus),
    );
  });

  it('senza bare aperte non compaiono zombie', () => {
    const spawns = computeSpawns(baseCtx(), fakeRng(true));
    expect(spawns.some((s) => s.kind === 'zombie')).toBe(false);
  });
});
