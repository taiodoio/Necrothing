import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { backupService, BackupError } from './backupService';
import { graveService } from './graveService';
import { __resetDbForTests } from '@/shared/db/schema';
import { graveRepository } from '@/shared/repositories/graveRepository';
import { fixedClock } from '@/shared/utils/clock';
import { emptyDraft } from '@/features/burial/validation';

const clock = fixedClock('2026-06-25T10:00:00Z');

describe('backupService', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetDbForTests();
  });

  it('esporta e reimporta lo stato (roundtrip)', async () => {
    await graveService.bury(
      {
        ...emptyDraft(),
        name: 'Mouse',
        category: 'electronics',
        deathDate: '2026-06-24',
        deathCause: 'natural_wear',
        graveType: 'stone_simple',
        gridX: 0,
        gridY: 0,
      },
      clock,
    );

    const text = await backupService.exportToString(clock);
    expect(text).toContain('necrothing-backup');

    // Svuota e reimporta
    globalThis.indexedDB = new IDBFactory();
    __resetDbForTests();
    expect(await graveRepository.getAll()).toHaveLength(0);

    await backupService.importFromString(text);
    const restored = await graveRepository.getAll();
    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe('Mouse');
  });

  it('rifiuta un file non valido', async () => {
    await expect(backupService.importFromString('{"foo":1}')).rejects.toBeInstanceOf(BackupError);
    await expect(backupService.importFromString('non-json')).rejects.toBeInstanceOf(BackupError);
  });
});
