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
  vignette(c, 0.6);
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
  // bordi consumati: la carta schiarisce verso i lati, con sbrecciature irregolari
  const edge = W * 0.045;
  for (const [x0, y0, x1, y1] of [[0, 0, edge, 0], [W, 0, W - edge, 0], [0, 0, 0, edge], [0, H, 0, H - edge]]) {
    const eg = g.createLinearGradient(x0, y0, x1, y1);
    eg.addColorStop(0, 'rgba(232,216,184,0.55)'); eg.addColorStop(1, 'rgba(232,216,184,0)');
    g.fillStyle = eg; g.fillRect(0, 0, W, H);
  }
  g.fillStyle = 'rgba(236,224,196,0.85)';
  for (let i = 0; i < 90; i++) {
    const side = i % 4, t = rng.range(0, side < 2 ? W : H), d = rng.range(0, edge * 0.5), s = rng.range(2, 7) * (W / 720);
    const [x, y] = side === 0 ? [t, d] : side === 1 ? [t, H - d - s] : side === 2 ? [d, t] : [W - d - s, t];
    g.fillRect(x, y, s, s);
  }
  return c;
}

function vignette(c: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  const g = c.getContext('2d')!;
  const W = c.width, H = c.height;
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(20,12,4,${amount})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}
