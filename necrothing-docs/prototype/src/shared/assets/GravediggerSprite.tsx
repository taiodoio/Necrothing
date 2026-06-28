// Becchino. PNG pixel-art se presente (npc_gravedigger), altrimenti SVG.

import { spriteUrl, SpriteImg } from './Sprite';

interface Props {
  size?: number;
  facing?: 1 | -1;
}

export function GravediggerSprite({ size = 40, facing = 1 }: Props) {
  const png = spriteUrl('npc_gravedigger');
  const flip = facing === -1 ? { transform: 'scaleX(-1)' } : undefined;
  if (png)
    return (
      <span style={{ display: 'flex', ...flip }}>
        <SpriteImg url={png} size={size} title="Becchino" />
      </span>
    );
  return (
    <svg
      viewBox="0 0 64 96"
      width={(size * 64) / 96}
      height={size}
      role="img"
      aria-label="Becchino"
      style={flip}
    >
      <ellipse cx="32" cy="92" rx="14" ry="4" fill="#000" opacity="0.3" />
      {/* gambe */}
      <rect x="26" y="64" width="5" height="26" fill="#2a2418" />
      <rect x="34" y="64" width="5" height="26" fill="#241f15" />
      {/* cappotto */}
      <path d="M22 64 L24 40 Q32 34 40 40 L42 64 Z" fill="#3a3322" stroke="#241f15" strokeWidth="1" />
      {/* testa + cappello */}
      <circle cx="32" cy="32" r="8" fill="#d8c9b0" />
      <path d="M22 30 h20 l-2 -6 h-16 Z" fill="#1c1810" />
      <rect x="20" y="29" width="24" height="2.5" fill="#1c1810" />
      {/* pala */}
      <g stroke="#6b6150" strokeWidth="2.5" strokeLinecap="round">
        <path d="M44 50 L52 78" />
      </g>
      <path d="M50 76 q3 6 5 2 q-1 -5 -5 -4 Z" fill="#8a8170" />
    </svg>
  );
}
