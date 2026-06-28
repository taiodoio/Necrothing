// Zombie errante. PNG pixel-art se presente (npc_zombie), altrimenti SVG.

import { spriteUrl, SpriteImg } from './Sprite';

interface Props {
  size?: number;
  facing?: 1 | -1;
}

export function ZombieSprite({ size = 30, facing = 1 }: Props) {
  const png = spriteUrl('npc_zombie');
  const flip = facing === -1 ? { transform: 'scaleX(-1)' } : undefined;
  if (png)
    return (
      <span style={{ display: 'flex', ...flip }}>
        <SpriteImg url={png} size={size} title="Zombie" />
      </span>
    );
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label="Zombie" style={flip}>
      <ellipse cx="20" cy="37" rx="9" ry="2.2" fill="#000" opacity="0.22" />
      {/* gambe */}
      <path d="M16 30 v6 M24 30 v6" stroke="#3c5a3a" strokeWidth="3.4" strokeLinecap="round" />
      {/* corpo */}
      <rect x="13" y="18" width="14" height="13" rx="3" fill="#4f7a4a" />
      {/* braccia tese in avanti */}
      <path d="M27 21 h8" stroke="#4f7a4a" strokeWidth="3.4" strokeLinecap="round" />
      {/* testa */}
      <circle cx="20" cy="12" r="6" fill="#6a9a5f" />
      {/* occhi vacui */}
      <circle cx="18" cy="12" r="1.2" fill="#10160e" />
      <circle cx="22" cy="11.5" r="1.2" fill="#10160e" />
      {/* bocca storta */}
      <path d="M17 15 q3 1.5 5 -0.5" stroke="#24371f" strokeWidth="1.2" fill="none" />
      {/* toppa sul corpo */}
      <path d="M16 24 l3 2" stroke="#33522f" strokeWidth="1.2" />
    </svg>
  );
}
