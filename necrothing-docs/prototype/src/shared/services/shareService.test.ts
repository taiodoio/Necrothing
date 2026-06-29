import { describe, expect, it } from 'vitest';
import { generateCardSvg } from './shareService';
import type { Grave } from '@/shared/domain/types';

function grave(over: Partial<Grave>): Grave {
  return {
    id: 'g1',
    name: 'Caricatore',
    category: 'electronics',
    birthDate: null,
    deathDate: '2026-06-24',
    deathCause: 'broken_cable',
    epitaph: 'Ti piegasti, ma non ti spezzasti.',
    photoId: null,
    graveType: 'wood_cross',
    gridX: 0,
    gridY: 0,
    hasFlowers: false,
    flowersUpdatedAt: null,
    hasWeeds: false,
    isDirty: false,
    dirtySince: null,
    broken: false,
    lastAnniversaryYear: null,
    createdAt: '2026-06-24T00:00:00Z',
    updatedAt: '2026-06-24T00:00:00Z',
    ...over,
  };
}

describe('generateCardSvg', () => {
  it('produce un SVG con nome, categoria, causa ed epitaffio', () => {
    const svg = generateCardSvg(grave({}));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Caricatore');
    expect(svg).toContain('Elettronica');
    expect(svg).toContain('Cavo spezzato');
    expect(svg).toContain('CERTIFICATO DI MORTE');
  });

  it('applica escape ai caratteri XML pericolosi', () => {
    const svg = generateCardSvg(grave({ name: 'Tom & <Jerry>' }));
    expect(svg).toContain('Tom &amp; &lt;Jerry&gt;');
    expect(svg).not.toContain('<Jerry>');
  });

  it('gestisce causa personalizzata non in enum', () => {
    const svg = generateCardSvg(grave({ deathCause: 'Mancanza di fondi' as never }));
    expect(svg).toContain('Mancanza di fondi');
  });
});
