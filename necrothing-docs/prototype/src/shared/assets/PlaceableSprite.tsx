// Sceglie lo sprite giusto per un placeable (decorazione o struttura).

import { DECORATION_TYPES, type PlaceableType } from '@/shared/domain/enums';
import { DecorationSprite } from './DecorationSprite';
import { StructureSprite } from './StructureSprite';

interface Props {
  type: PlaceableType;
  size?: number;
}

export function PlaceableSprite({ type, size = 40 }: Props) {
  if ((DECORATION_TYPES as readonly string[]).includes(type)) {
    return <DecorationSprite type={type as (typeof DECORATION_TYPES)[number]} size={size} />;
  }
  return <StructureSprite type={type as Exclude<PlaceableType, (typeof DECORATION_TYPES)[number]>} size={size} />;
}
