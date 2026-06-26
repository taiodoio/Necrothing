// Fuoco fatuo (moneta) raccoglibile. SVG con alone pulsante.

import { spriteUrl, SpriteImg } from './Sprite';
import { WISP_ASSET_ID } from './assetKeys';

interface Props {
  size?: number;
}

export function WispSprite({ size = 32 }: Props) {
  const png = spriteUrl(WISP_ASSET_ID);
  if (png) return <SpriteImg url={png} size={size} title="Fuoco fatuo" />;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label="Fuoco fatuo">
      <circle cx="20" cy="20" r="14" fill="#5fe3c0" opacity="0.18" />
      <circle cx="20" cy="20" r="9" fill="#5fe3c0" opacity="0.3" />
      {/* fiammella */}
      <path d="M20 30 q-6 -6 -3 -13 q2 5 4 3 q1 -5 -1 -9 q9 5 7 15 q-1 5 -7 4 Z" fill="#9af5dd" />
      <path d="M20 28 q-3 -3 -1 -7 q1 3 2 2 q1 -3 0 -5 q4 3 3 8 q-1 3 -4 2 Z" fill="#e7fff8" />
    </svg>
  );
}
