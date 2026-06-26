// Loader sprite pixel-art: cerca un PNG in `generated/` e lo renderizza;
// se non c'è, il componente chiamante usa il fallback SVG.
//
// Gli sprite generati (es. con PixelLab) vanno messi in
// `src/shared/assets/generated/` con nome = ID asset del manifest, es:
//   grave_gothic.png, deco_candle.png, env_fence_wood.png, currency_wisp.png
// Varianti di stato col suffisso `__stato`, es: grave_gothic__flowers.png
//
// Vite li individua a build-time (import.meta.glob): basta trascinarli,
// nessuna modifica al codice.

const MODULES = import.meta.glob('./generated/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function fileUrl(name: string): string | null {
  return MODULES[`./generated/${name}.png`] ?? null;
}

/** URL del primo sprite disponibile: prova gli stati in ordine, poi la base. */
export function spriteUrl(assetId: string, ...states: (string | undefined)[]): string | null {
  for (const s of states) {
    if (s) {
      const u = fileUrl(`${assetId}__${s}`);
      if (u) return u;
    }
  }
  return fileUrl(assetId);
}

export function hasSprite(assetId: string, ...states: (string | undefined)[]): boolean {
  return spriteUrl(assetId, ...states) !== null;
}

interface SpriteImgProps {
  url: string;
  size: number;
  title?: string;
  rotation?: number;
}

/** Immagine pixel-art (nearest-neighbor). */
export function SpriteImg({ url, size, title, rotation }: SpriteImgProps) {
  return (
    <img
      className="pixel-sprite"
      src={url}
      width={size}
      height={size}
      alt={title ?? ''}
      style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
      draggable={false}
    />
  );
}
