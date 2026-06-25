// Placeholder SVG delle decorazioni. Sostituibili con SVG animati.

import type { DecorationType } from '@/shared/domain/enums';

interface Props {
  type: DecorationType;
  size?: number;
  title?: string;
}

function Shape({ type }: { type: DecorationType }) {
  switch (type) {
    case 'candle':
      return (
        <g>
          <rect x="42" y="50" width="16" height="34" rx="3" fill="#e6dcc4" />
          <rect x="48" y="40" width="3" height="12" fill="#2a2640" />
          <path d="M49.5 26 q7 9 0 16 q-7 -7 0 -16" fill="#e0a34a" />
        </g>
      );
    case 'wreath':
      return (
        <g>
          <circle cx="50" cy="56" r="22" fill="none" stroke="#4f6b3a" strokeWidth="8" />
          <circle cx="50" cy="34" r="5" fill="#c45b8a" />
          <circle cx="40" cy="40" r="4" fill="#d9a441" />
          <circle cx="60" cy="40" r="4" fill="#7b6fc4" />
        </g>
      );
    case 'mushroom':
      return (
        <g>
          <rect x="46" y="58" width="8" height="20" rx="3" fill="#d9cdb0" />
          <path d="M30 58 a20 14 0 0 1 40 0 Z" fill="#a23b3b" />
          <circle cx="42" cy="52" r="3" fill="#f0e6d0" />
          <circle cx="56" cy="50" r="2.5" fill="#f0e6d0" />
        </g>
      );
    case 'dead_tree':
      return (
        <g stroke="#5a4632" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M50 84 V40" />
          <path d="M50 56 l-14 -12 M50 50 l14 -12 M50 64 l12 6" />
        </g>
      );
    case 'skull':
      return (
        <g>
          <circle cx="50" cy="48" r="22" fill="#e8e2d0" />
          <rect x="40" y="66" width="20" height="12" rx="3" fill="#e8e2d0" />
          <circle cx="42" cy="46" r="6" fill="#1b1828" />
          <circle cx="58" cy="46" r="6" fill="#1b1828" />
          <path d="M47 60 l3 6 l3 -6 Z" fill="#1b1828" />
        </g>
      );
    case 'lantern':
      return (
        <g>
          <rect x="40" y="34" width="20" height="34" rx="4" fill="#3a3550" stroke="#2a2640" strokeWidth="2" />
          <rect x="45" y="42" width="10" height="20" rx="2" fill="#e0a34a" />
          <path d="M50 24 q8 6 0 10 q-8 -4 0 -10" fill="#fff1c2" />
          <rect x="46" y="68" width="8" height="6" fill="#2a2640" />
        </g>
      );
    default:
      return null;
  }
}

export function DecorationSprite({ type, size = 48, title }: Props) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title ?? 'Decorazione'}>
      <ellipse cx="50" cy="86" rx="30" ry="8" fill="#241f1a" />
      <Shape type={type} />
    </svg>
  );
}
