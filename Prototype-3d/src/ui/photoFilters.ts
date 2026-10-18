// Filtri per la foto dell'oggetto da seppellire: si applicano ai pixel (non
// con CSS), così la foto salvata, esportata e messa sulla cartolina è già
// filtrata. Tutto deterministico: lo stesso seme dà gli stessi graffi.

import { createRng } from '../game/rng.ts';

export type PhotoFilter = 'none' | 'sepia' | 'bw' | 'worn';

export const PHOTO_FILTER_LABELS: Record<PhotoFilter, string> = {
  none: 'Originale',
  sepia: 'Seppia',
  bw: 'B/N',
  worn: 'Rovinata',
};

/** Lato massimo della foto salvata (pixel): basta per il dettaglio e la cartolina e pesa poco nel backup. */
export const PHOTO_MAX = 720;

/** Ritaglio quadrato al centro, ridotto a `size`. */
export function squareCrop(src: CanvasImageSource & { width: number; height: number }, size = PHOTO_MAX): HTMLCanvasElement {
  const s = Math.min(src.width, src.height);
  const c = document.createElement('canvas');
  c.width = c.height = Math.min(size, s);
  c.getContext('2d')!.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, c.width, c.height);
  return c;
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Applica il filtro e restituisce una tela nuova della stessa misura. */
export function applyPhotoFilter(src: HTMLCanvasElement, filter: PhotoFilter, seed = 7): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  if (filter === 'none') return c;
  const W = c.width, H = c.height;
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  const rng = createRng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const l = 0.299 * r + 0.587 * gr + 0.114 * b;
    if (filter === 'bw') {
      const v = clamp((l - 128) * 1.15 + 128);
      d[i] = d[i + 1] = d[i + 2] = v;
    } else {
      // seppia: toni caldi; la rovinata è una seppia sbiadita (meno contrasto, neri lavati)
      const worn = filter === 'worn';
      const k = worn ? 0.82 : 1;
      let sr = 0.393 * r + 0.769 * gr + 0.189 * b, sg = 0.349 * r + 0.686 * gr + 0.168 * b, sb = 0.272 * r + 0.534 * gr + 0.131 * b;
      if (worn) { sr = sr * k + 34; sg = sg * k + 28; sb = sb * k + 18; }
      d[i] = clamp(sr); d[i + 1] = clamp(sg); d[i + 2] = clamp(sb);
    }
    if (filter === 'worn') { const n = (rng.next() - 0.5) * 34; d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n); }
  }
  g.putImageData(img, 0, 0);
  if (filter !== 'worn') return vignette(c, filter === 'bw' ? 0.35 : 0.3);
  // rovinata: vignetta forte, macchie, graffi, polvere, piega e angoli consumati
  vignette(c, 0.45);
  for (let i = 0; i < 5; i++) {
    const x = rng.range(0, W), y = rng.range(0, H), r = rng.range(W * 0.05, W * 0.16);
    const st = g.createRadialGradient(x, y, 0, x, y, r);
    st.addColorStop(0, 'rgba(120,84,40,0.22)'); st.addColorStop(1, 'rgba(120,84,40,0)');
    g.fillStyle = st; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = rng.range(0, W), y0 = rng.range(-H * 0.1, H * 0.6), len = rng.range(H * 0.15, H * 0.7);
    g.strokeStyle = `rgba(250,240,220,${rng.range(0.12, 0.35)})`;
    g.lineWidth = rng.range(0.6, 1.6) * (W / 720);
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + rng.range(-W * 0.03, W * 0.03), y0 + len); g.stroke();
  }
  for (let i = 0; i < 160; i++) {
    g.fillStyle = rng.next() < 0.5 ? `rgba(255,248,230,${rng.range(0.2, 0.6)})` : `rgba(30,20,10,${rng.range(0.2, 0.5)})`;
    const s = rng.range(0.6, 2.4) * (W / 720);
    g.fillRect(rng.range(0, W), rng.range(0, H), s, s);
  }
  // piega diagonale: una riga chiara con l'ombra accanto
  const fy = rng.range(H * 0.3, H * 0.7);
  g.strokeStyle = 'rgba(255,245,225,0.28)'; g.lineWidth = 2 * (W / 720);
  g.beginPath(); g.moveTo(0, fy); g.lineTo(W, fy + rng.range(-H * 0.12, H * 0.12)); g.stroke();
  g.strokeStyle = 'rgba(40,25,10,0.18)'; g.lineWidth = 3 * (W / 720);
  g.beginPath(); g.moveTo(0, fy + 3); g.lineTo(W, fy + 3 + rng.range(-H * 0.12, H * 0.12)); g.stroke();
  wornEdges(g, W, H, rng);
  return c;
}

/** Rumore morbido (griglia di valori casuali interpolata), 0..1. */
function valueNoise(rng: ReturnType<typeof createRng>, cells: number) {
  const n = cells + 1, v = Array.from({ length: n * n }, () => rng.next());
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (u: number, w: number) => {
    const x = u * cells, y = w * cells, i = Math.min(cells - 1, Math.floor(x)), j = Math.min(cells - 1, Math.floor(y));
    const fx = sm(x - i), fy = sm(y - j);
    const a = v[j * n + i] + (v[j * n + i + 1] - v[j * n + i]) * fx;
    const b = v[(j + 1) * n + i] + (v[(j + 1) * n + i + 1] - v[(j + 1) * n + i]) * fx;
    return a + (b - a) * fy;
  };
}

/**
 * Bordi consumati: verso i lati l'emulsione si stacca a chiazze (si vede la
 * carta chiara) e prima c'è un alone bruno dove la stampa è invecchiata. Il
 * contorno segue un rumore a due scale, quindi non è mai una riga dritta.
 */
function wornEdges(g: CanvasRenderingContext2D, W: number, H: number, rng: ReturnType<typeof createRng>) {
  const coarse = valueNoise(rng, 7), fine = valueNoise(rng, 40);
  const band = Math.min(W, H) * 0.11;
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (e > band) { x = Math.max(x, W - 2 - Math.ceil(band)); continue; } // salta il centro della riga
      const n = coarse(x / W, y / H) * 0.7 + fine(x / W, y / H) * 0.3;
      const t = band * (0.15 + 0.85 * n * n); // quanto entra il consumo in questo punto
      const paper = Math.min(1, Math.max(0, (t * 0.55 - e) / (t * 0.2 + 1)));
      const age = Math.max(0, 1 - Math.abs(e - t * 0.75) / (t * 0.6 + 1)) * 0.5;
      const i = (y * W + x) * 4;
      const grain = 0.9 + fine(y / H, x / W) * 0.12;
      for (let k = 0; k < 3; k++) {
        let v = d[i + k];
        v += ([88, 58, 30][k] - v) * age;
        v += ([232, 219, 190][k] * grain - v) * paper;
        d[i + k] = clamp(v);
      }
    }
  }
  g.putImageData(img, 0, 0);
}

function vignette(c: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  const g = c.getContext('2d')!;
  const W = c.width, H = c.height;
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(20,12,4,${amount})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}
