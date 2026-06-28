// Fantasma errante. PNG pixel-art se presente (npc_ghost), altrimenti SVG.

import { spriteUrl, SpriteImg } from './Sprite';

interface Props {
  size?: number;
}

export function GhostSprite({ size = 36 }: Props) {
  const png = spriteUrl('npc_ghost');
  if (png) return <SpriteImg url={png} size={size} title="Fantasma" />;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label="Fantasma">
      <ellipse cx="20" cy="35" rx="11" ry="3" fill="#000" opacity="0.25" />
      {/* alone spettrale */}
      <ellipse cx="20" cy="18" rx="14" ry="16" fill="#bdeafc" opacity="0.16" />
      {/* corpo */}
      <path
        d="M20 5 q11 0 11 13 v13 q-2 3 -4 0 q-2 3 -4 0 q-1.5 3 -3 0 q-2 3 -4 0 q-3 3 -3 -1 V18 Q9 5 20 5 Z"
        fill="#e9f6ff"
        opacity="0.9"
      />
      {/* occhi */}
      <circle cx="16" cy="17" r="2" fill="#2a2640" />
      <circle cx="24" cy="17" r="2" fill="#2a2640" />
      {/* bocca */}
      <ellipse cx="20" cy="23" rx="2.4" ry="3.2" fill="#2a2640" opacity="0.8" />
    </svg>
  );
}
