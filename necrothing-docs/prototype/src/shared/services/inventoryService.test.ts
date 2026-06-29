import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { inventoryService, sellPrice } from './inventoryService';
import { __resetDbForTests } from '@/shared/db/schema';
import { PLACEABLES } from '@/shared/domain/placeables';
import { ECONOMY } from '@/shared/domain/balance';

describe('inventoryService', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetDbForTests();
  });

  it('parte vuoto', async () => {
    expect(await inventoryService.getMap()).toEqual({});
    expect(await inventoryService.owned('candle')).toBe(0);
  });

  it('add incrementa e decrementa con clamp a 0', async () => {
    expect(await inventoryService.add('candle', +2)).toBe(2);
    expect(await inventoryService.add('candle', -1)).toBe(1);
    expect(await inventoryService.add('candle', -5)).toBe(0);
    const map = await inventoryService.getMap();
    expect(map.candle).toBe(0);
  });

  it('getMap riflette più tipi', async () => {
    await inventoryService.add('candle', 1);
    await inventoryService.add('wreath', 3);
    const map = await inventoryService.getMap();
    expect(map).toMatchObject({ candle: 1, wreath: 3 });
  });
});

describe('sellPrice', () => {
  it('è il 70% del costo arrotondato', () => {
    expect(sellPrice('lantern')).toBe(Math.round(PLACEABLES.lantern.cost * ECONOMY.sellRefund));
    expect(ECONOMY.sellRefund).toBe(0.7);
  });
});
