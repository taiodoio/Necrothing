// Placeholder SVG del prete. Sostituibile con SVG animato.

interface Props {
  size?: number;
  blessing?: boolean;
}

export function PriestSprite({ size = 80, blessing = false }: Props) {
  return (
    <svg viewBox="0 0 64 96" width={(size * 64) / 96} height={size} role="img" aria-label="Prete">
      <ellipse cx="32" cy="92" rx="15" ry="4" fill="#000" opacity="0.3" />
      {/* tonaca */}
      <path d="M20 92 L23 42 Q32 34 41 42 L44 92 Z" fill="#15121d" stroke="#2a2640" strokeWidth="1" />
      {/* stola viola */}
      <path d="M29 42 L30 84 M35 42 L34 84" stroke="#6f4f8c" strokeWidth="2" fill="none" />
      {/* collare bianco */}
      <rect x="28" y="40" width="8" height="4" fill="#e7e2f0" />
      {/* testa */}
      <circle cx="32" cy="31" r="9" fill="#d8c9b0" />
      <path d="M23 30 a9 9 0 0 1 18 0 Z" fill="#15121d" opacity="0.25" />
      {/* braccio + croce */}
      {blessing ? (
        <g stroke="#cbb98f" strokeWidth="3" strokeLinecap="round">
          <path d="M44 56 L52 40" />
          <path d="M48 46 l6 3" />
        </g>
      ) : (
        <g>
          <path d="M44 58 L48 74" stroke="#15121d" strokeWidth="4" strokeLinecap="round" />
          <rect x="45" y="60" width="3" height="16" fill="#cbb98f" />
          <rect x="41" y="65" width="11" height="3" fill="#cbb98f" />
        </g>
      )}
    </svg>
  );
}
