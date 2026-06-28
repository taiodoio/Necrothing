// Corvo. PNG pixel-art se presente (npc_crow), altrimenti SVG.

import { spriteUrl, SpriteImg } from './Sprite';

interface Props {
  size?: number;
  facing?: 1 | -1;
}

export function CrowSprite({ size = 30, facing = 1 }: Props) {
  const png = spriteUrl('npc_crow');
  const flip = facing === -1 ? { transform: 'scaleX(-1)' } : undefined;
  if (png)
    return (
      <span style={{ display: 'flex', ...flip }}>
        <SpriteImg url={png} size={size} title="Corvo" />
      </span>
    );
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label="Corvo" style={flip}>
      <ellipse cx="20" cy="35" rx="9" ry="2.5" fill="#000" opacity="0.25" />
      {/* corpo */}
      <path d="M12 28 q-2 -9 8 -11 q10 -2 10 6 q0 6 -6 8 q-7 2 -12 -3 Z" fill="#0e0d14" />
      {/* coda */}
      <path d="M10 26 l-7 4 7 1 Z" fill="#0e0d14" />
      {/* testa + becco */}
      <circle cx="26" cy="16" r="5" fill="#0e0d14" />
      <path d="M31 16 l7 -1 -7 3 Z" fill="#5a4a2a" />
      {/* occhio */}
      <circle cx="27" cy="15" r="1.1" fill="#d6c24a" />
      {/* zampe */}
      <path d="M18 33 v4 M24 33 v4" stroke="#3a3020" strokeWidth="1.4" />
    </svg>
  );
}
