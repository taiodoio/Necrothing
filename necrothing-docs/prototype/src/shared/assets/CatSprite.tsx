// Gatto nero errante. PNG pixel-art se presente (npc_cat), altrimenti SVG.

import { spriteUrl, SpriteImg } from './Sprite';

interface Props {
  size?: number;
  facing?: 1 | -1;
}

export function CatSprite({ size = 32, facing = 1 }: Props) {
  const png = spriteUrl('npc_cat');
  const flip = facing === -1 ? { transform: 'scaleX(-1)' } : undefined;
  if (png)
    return (
      <span style={{ display: 'flex', ...flip }}>
        <SpriteImg url={png} size={size} title="Gatto nero" />
      </span>
    );
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label="Gatto nero"
      style={flip}
    >
      <ellipse cx="20" cy="34" rx="12" ry="3" fill="#000" opacity="0.25" />
      {/* corpo */}
      <path d="M9 30 q-1 -10 8 -11 q9 -1 12 4 q3 5 1 7 q-1 2 -4 1 H12 q-3 0 -3 -1 Z" fill="#15131c" />
      {/* coda */}
      <path d="M28 26 q8 -1 6 -10" stroke="#15131c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* testa */}
      <circle cx="14" cy="18" r="6.5" fill="#15131c" />
      {/* orecchie */}
      <path d="M9 14 l-1 -6 5 4 Z" fill="#15131c" />
      <path d="M19 14 l1 -6 -5 4 Z" fill="#15131c" />
      {/* occhi gialli */}
      <ellipse cx="12" cy="18" rx="1.3" ry="2" fill="#e0c84a" />
      <ellipse cx="16.5" cy="18" rx="1.3" ry="2" fill="#e0c84a" />
      {/* zampe */}
      <rect x="12" y="28" width="3" height="4" rx="1" fill="#0c0a12" />
      <rect x="20" y="28" width="3" height="4" rx="1" fill="#0c0a12" />
    </svg>
  );
}
