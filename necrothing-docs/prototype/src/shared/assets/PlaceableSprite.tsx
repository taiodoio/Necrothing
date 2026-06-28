// Sceglie lo sprite giusto per un placeable.
// - tipi "classici" → sprite SVG dedicati (con fallback PNG via loader)
// - tipi del catalogo esteso (Fase D) → PNG se presente, altrimenti emoji

import {
  DECORATION_TYPES,
  STRUCTURE_TYPES,
  EXTRA_PLACEABLE_EMOJI,
  type DecorationType,
  type StructureType,
  type ExtraPlaceableType,
  type PlaceableType,
} from '@/shared/domain/enums';
import { DecorationSprite } from './DecorationSprite';
import { StructureSprite } from './StructureSprite';
import { spriteUrl, SpriteImg } from './Sprite';

interface Props {
  type: PlaceableType;
  size?: number;
}

export function PlaceableSprite({ type, size = 40 }: Props) {
  if ((DECORATION_TYPES as readonly string[]).includes(type)) {
    return <DecorationSprite type={type as DecorationType} size={size} />;
  }
  if ((STRUCTURE_TYPES as readonly string[]).includes(type)) {
    return <StructureSprite type={type as StructureType} size={size} />;
  }
  // Catalogo esteso: PNG generato (per id) oppure fallback a emoji.
  const png = spriteUrl(type);
  if (png) return <SpriteImg url={png} size={size} />;
  const emoji = EXTRA_PLACEABLE_EMOJI[type as ExtraPlaceableType] ?? '❓';
  return (
    <span
      aria-hidden
      style={{
        fontSize: size * 0.7,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      {emoji}
    </span>
  );
}
