// Sprite di una lapide. Usa il PNG in `generated/` con switch per stato
// (base / __flowers / __dirty); se manca il PNG (tipi legacy) ripiega sul
// disegno SVG con overlay di stato. Riceve tipo e stati come props.

import type { GraveType } from '@/shared/domain/enums';
import { spriteUrl, SpriteImg } from './Sprite';
import { graveAssetId } from './assetKeys';

interface Props {
  type: GraveType;
  hasFlowers?: boolean;
  hasWeeds?: boolean;
  isDirty?: boolean;
  broken?: boolean;
  size?: number;
  title?: string;
}

const STONE = '#5a5470';
const STONE_DARK = '#3a3550';
const STONE_LIGHT = '#736c8c';

function Shape({ type }: { type: GraveType }) {
  switch (type) {
    case 'wood_cross':
      return (
        <g>
          <rect x="44" y="28" width="12" height="56" fill="#6b4a2b" />
          <rect x="30" y="40" width="40" height="11" fill="#7a5532" />
        </g>
      );
    case 'gothic':
      return (
        <path d="M30 84 V44 a20 20 0 0 1 40 0 V84 Z M50 30 v14 M44 36 h12" stroke="#2a2640"
          strokeWidth="0" fill={STONE} />
      );
    case 'broken':
      return (
        <path d="M32 84 V46 L50 36 L52 60 L60 50 V84 Z" fill={STONE_DARK} />
      );
    case 'angel':
      return (
        <g>
          <rect x="34" y="40" width="32" height="44" rx="4" fill={STONE} />
          <circle cx="50" cy="32" r="9" fill={STONE_LIGHT} />
        </g>
      );
    case 'obelisk':
      return <path d="M42 84 L46 30 L50 22 L54 30 L58 84 Z" fill={STONE} />;
    case 'stone_simple':
    default:
      return <path d="M34 84 V46 a16 16 0 0 1 32 0 V84 Z" fill={STONE} />;
  }
}

export function GraveSprite({
  type,
  hasFlowers,
  hasWeeds,
  isDirty,
  broken,
  size = 64,
  title,
}: Props) {
  // Switch dell'asset per stato. Priorità: trascuratezza (sporco/erbacce) →
  // asset "dirty", che ha la precedenza sui fiori così resta visibile il
  // segnale "da pulire"; altrimenti fiori. `broken` non ha asset dedicato: usa
  // lo stato base + badge nella scena.
  const png = spriteUrl(
    graveAssetId(type),
    isDirty || hasWeeds ? 'dirty' : undefined,
    hasFlowers ? 'flowers' : undefined,
  );
  if (png) return <SpriteImg url={png} size={size} title={title} />;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? 'Lapide'}
    >
      {/* zolla */}
      <ellipse cx="50" cy="86" rx="34" ry="9" fill="#2b2a1f" />
      <g style={broken ? { opacity: 0.7 } : undefined} transform={broken ? 'rotate(-6 50 70)' : undefined}>
        <Shape type={type} />
      </g>
      {broken && (
        <g stroke="#1b1828" strokeWidth="2.5" fill="none" strokeLinecap="round">
          {/* crepe della rottura */}
          <path d="M50 40 l-6 16 l8 10 l-6 14" />
          <path d="M44 56 l-8 4 M52 66 l9 3" />
        </g>
      )}
      {isDirty && (
        <g fill="#6f6a55" opacity="0.5">
          {/* chiazze di muschio/polvere */}
          <circle cx="40" cy="58" r="5" />
          <circle cx="58" cy="66" r="6" />
          <circle cx="48" cy="72" r="4" />
          <circle cx="62" cy="52" r="3.5" />
        </g>
      )}
      {hasWeeds && (
        <g stroke="#4f6b3a" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path d="M24 86 q-3 -10 2 -16" />
          <path d="M76 86 q4 -9 -1 -15" />
          <path d="M30 88 q-4 -7 0 -12" />
        </g>
      )}
      {hasFlowers && (
        <g>
          <circle cx="40" cy="80" r="4" fill="#c45b8a" />
          <circle cx="50" cy="82" r="4" fill="#d9a441" />
          <circle cx="60" cy="80" r="4" fill="#7b6fc4" />
          <path d="M40 84 v6 M50 86 v6 M60 84 v6" stroke="#4f6b3a" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
