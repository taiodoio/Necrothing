// Seleziona lo sprite corretto per un'entità errante in base al tipo.

import type { RoamingKind } from '@/shared/domain/roaming';
import { GhostSprite } from './GhostSprite';
import { CatSprite } from './CatSprite';
import { CrowSprite } from './CrowSprite';
import { RatSprite } from './RatSprite';
import { GravediggerSprite } from './GravediggerSprite';
import { PriestSprite } from './PriestSprite';
import { ZombieSprite } from './ZombieSprite';

interface Props {
  kind: RoamingKind;
  size: number;
  facing?: 1 | -1;
}

export function RoamerSprite({ kind, size, facing = 1 }: Props) {
  switch (kind) {
    case 'ghost':
      return <GhostSprite size={size} />;
    case 'cat':
      return <CatSprite size={size} facing={facing} />;
    case 'crow':
      return <CrowSprite size={size} facing={facing} />;
    case 'rat':
      return <RatSprite size={size} facing={facing} />;
    case 'gravedigger':
      return <GravediggerSprite size={size} facing={facing} />;
    case 'priest':
      return <PriestSprite size={size} />;
    case 'zombie':
      return <ZombieSprite size={size} facing={facing} />;
    default:
      return <GhostSprite size={size} />;
  }
}
