// Placeholder SVG di una persona in lutto. Varianti per piccole differenze.

interface Props {
  size?: number;
  variant?: 'a' | 'b' | 'child' | 'widow';
  mourning?: boolean;
}

const COAT: Record<NonNullable<Props['variant']>, string> = {
  a: '#1b1828',
  b: '#241f30',
  child: '#2a2438',
  widow: '#120f18',
};

export function MournerSprite({ size = 76, variant = 'a', mourning = false }: Props) {
  const scale = variant === 'child' ? 0.78 : 1;
  const h = size * scale;
  const coat = COAT[variant];
  const headTilt = mourning ? 4 : 0;
  return (
    <svg viewBox="0 0 64 96" width={(h * 64) / 96} height={h} role="img" aria-label="Persona in lutto">
      <ellipse cx="32" cy="92" rx="14" ry="4" fill="#000" opacity="0.3" />
      {/* cappotto */}
      <path d="M22 92 L25 46 Q32 38 39 46 L42 92 Z" fill={coat} stroke="#2a2640" strokeWidth="1" />
      {/* testa */}
      <circle cx={32} cy={34 + headTilt} r="8" fill="#d8c9b0" />
      {variant === 'widow' ? (
        /* velo */
        <path d={`M24 ${30 + headTilt} a8 8 0 0 1 16 0 L40 ${50 + headTilt} L24 ${50 + headTilt} Z`} fill="#0c0a12" opacity="0.85" />
      ) : (
        <path d={`M24 ${33 + headTilt} a8 8 0 0 1 16 0 Z`} fill={coat} opacity="0.5" />
      )}
      {/* braccia */}
      <path d={mourning ? 'M26 56 q-4 8 2 14' : 'M25 54 L24 74'} stroke={coat} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M39 54 L40 74" stroke={coat} strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
