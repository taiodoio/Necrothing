// Topo. PNG pixel-art se presente (npc_rat), altrimenti SVG.

import { spriteUrl, SpriteImg } from './Sprite';

interface Props {
  size?: number;
  facing?: 1 | -1;
}

export function RatSprite({ size = 26, facing = 1 }: Props) {
  const png = spriteUrl('npc_rat');
  const flip = facing === -1 ? { transform: 'scaleX(-1)' } : undefined;
  if (png)
    return (
      <span style={{ display: 'flex', ...flip }}>
        <SpriteImg url={png} size={size} title="Topo" />
      </span>
    );
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label="Topo" style={flip}>
      <ellipse cx="20" cy="32" rx="11" ry="2.5" fill="#000" opacity="0.22" />
      {/* corpo */}
      <ellipse cx="18" cy="26" rx="11" ry="6.5" fill="#54505c" />
      {/* testa */}
      <path d="M27 26 q7 -1 8 3 q-3 4 -8 2 Z" fill="#5c5866" />
      {/* orecchio */}
      <circle cx="28" cy="22" r="3" fill="#6b6776" />
      {/* occhio */}
      <circle cx="32" cy="26" r="1" fill="#11101a" />
      {/* coda */}
      <path d="M8 27 q-7 1 -6 6" stroke="#6b6776" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* zampe */}
      <path d="M14 31 v3 M22 31 v3" stroke="#3a3742" strokeWidth="1.4" />
    </svg>
  );
}
