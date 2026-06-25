// Placeholder SVG di una zolla vuota (cella libera).

interface Props {
  size?: number;
}

export function EmptyPlotSprite({ size = 64 }: Props) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Zolla vuota">
      <ellipse cx="50" cy="70" rx="32" ry="14" fill="#241f1a" />
      <ellipse cx="50" cy="66" rx="26" ry="10" fill="#2f2823" />
      <path
        d="M40 60 l20 0 M44 66 l12 0"
        stroke="#3d342c"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
