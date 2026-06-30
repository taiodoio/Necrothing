// Elaborazione foto: converte in bianco e nero con leggero aumento di contrasto,
// coerente con l'estetica del cimitero.

const PIXEL_COLS = 72; // usato solo da pixelateGrayscale (legacy)
const OUT_MAX = 320; // lato massimo del blob esportato

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fallback sotto
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Immagine non caricabile.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dims(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  const w = 'width' in src ? src.width : (src as HTMLImageElement).naturalWidth;
  const h = 'height' in src ? src.height : (src as HTMLImageElement).naturalHeight;
  return { w: w || 1, h: h || 1 };
}

/**
 * Restituisce una versione pixelata in scala di grigi del file immagine.
 * In caso di errore (ambiente senza canvas) ritorna il file originale.
 */
export async function pixelateGrayscale(file: File): Promise<Blob> {
  try {
    const src = await loadBitmap(file);
    const { w, h } = dims(src);
    const aspect = h / w;
    const smallW = Math.max(8, Math.min(PIXEL_COLS, w));
    const smallH = Math.max(8, Math.round(smallW * aspect));

    // 1) Downscale su canvas piccolo + scala di grigi.
    const small = document.createElement('canvas');
    small.width = smallW;
    small.height = smallH;
    const sctx = small.getContext('2d');
    if (!sctx) return file;
    sctx.drawImage(src, 0, 0, smallW, smallH);
    const data = sctx.getImageData(0, 0, smallW, smallH);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      // luminanza percepita
      let l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      // leggero aumento di contrasto per un look più cupo
      l = clamp255((l - 128) * 1.15 + 118);
      px[i] = px[i + 1] = px[i + 2] = l;
    }
    sctx.putImageData(data, 0, 0);

    // 2) Upscale "blocky" (nearest-neighbor) sul canvas di output.
    const scale = Math.max(1, Math.floor(OUT_MAX / Math.max(smallW, smallH)));
    const out = document.createElement('canvas');
    out.width = smallW * scale;
    out.height = smallH * scale;
    const octx = out.getContext('2d');
    if (!octx) return file;
    octx.imageSmoothingEnabled = false;
    octx.drawImage(small, 0, 0, out.width, out.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob((b) => resolve(b), 'image/png'),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Converte un Blob immagine in scala di grigi (senza pixelatura).
 * Mantiene la risoluzione originale fino a OUT_MAX px sul lato lungo.
 * In caso di errore (ambiente senza canvas) ritorna il file originale.
 */
export async function grayscaleOnly(file: Blob): Promise<Blob> {
  try {
    const src = await loadBitmap(file);
    const { w, h } = dims(src);
    const scale = Math.min(1, OUT_MAX / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(src, 0, 0, outW, outH);

    const data = ctx.getImageData(0, 0, outW, outH);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      let l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      l = clamp255((l - 128) * 1.15 + 118);
      px[i] = px[i + 1] = px[i + 2] = l;
    }
    ctx.putImageData(data, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
