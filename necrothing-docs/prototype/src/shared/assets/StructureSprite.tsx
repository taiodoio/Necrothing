// Placeholder SVG delle strutture piazzabili (riempiono la cella).

import type { StructureType } from '@/shared/domain/enums';

interface Props {
  type: StructureType;
  size?: number;
}

function Shape({ type }: { type: StructureType }) {
  switch (type) {
    case 'path_dirt':
      return (
        <g>
          <rect x="4" y="4" width="92" height="92" rx="6" fill="#5a4630" />
          <circle cx="30" cy="34" r="4" fill="#6e5740" />
          <circle cx="64" cy="50" r="5" fill="#6e5740" />
          <circle cx="44" cy="72" r="4" fill="#6e5740" />
        </g>
      );
    case 'path_stone':
      return (
        <g>
          <rect x="4" y="4" width="92" height="92" rx="6" fill="#4a4658" />
          <rect x="12" y="12" width="34" height="34" rx="5" fill="#615c74" />
          <rect x="54" y="12" width="34" height="34" rx="5" fill="#565169" />
          <rect x="12" y="54" width="34" height="34" rx="5" fill="#565169" />
          <rect x="54" y="54" width="34" height="34" rx="5" fill="#615c74" />
        </g>
      );
    case 'fence_wood':
      return (
        <g fill="#6b4a2b" stroke="#3f2c1a" strokeWidth="2">
          <rect x="18" y="24" width="12" height="60" rx="2" />
          <rect x="44" y="24" width="12" height="60" rx="2" />
          <rect x="70" y="24" width="12" height="60" rx="2" />
          <rect x="10" y="38" width="80" height="9" />
          <rect x="10" y="62" width="80" height="9" />
        </g>
      );
    case 'fence_iron':
      return (
        <g stroke="#3a3550" strokeWidth="4" strokeLinecap="round">
          <path d="M22 84 V32 M22 32 l0 -8" />
          <path d="M40 84 V28 M40 28 l0 -8" />
          <path d="M58 84 V28 M58 28 l0 -8" />
          <path d="M76 84 V32 M76 32 l0 -8" />
          <path d="M14 54 H86" />
        </g>
      );
    case 'wall_stone':
      return (
        <g fill="#5b566e" stroke="#2a2640" strokeWidth="2">
          <rect x="8" y="30" width="36" height="20" />
          <rect x="50" y="30" width="40" height="20" />
          <rect x="8" y="54" width="22" height="20" />
          <rect x="36" y="54" width="40" height="20" />
          <rect x="80" y="54" width="14" height="20" />
        </g>
      );
    case 'lamp_post':
      return (
        <g>
          <rect x="46" y="40" width="8" height="48" fill="#2a2640" />
          <rect x="40" y="30" width="20" height="16" rx="3" fill="#3a3550" stroke="#2a2640" strokeWidth="2" />
          <rect x="45" y="34" width="10" height="9" fill="#e0a34a" />
          <path d="M50 22 q6 5 0 9 q-6 -4 0 -9" fill="#fff1c2" />
        </g>
      );
    default:
      return null;
  }
}

export function StructureSprite({ type, size = 40 }: Props) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Struttura">
      <Shape type={type} />
    </svg>
  );
}
