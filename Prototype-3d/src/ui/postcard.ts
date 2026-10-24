// Cartolina funebre da condividere, nello stile del gioco: nome, date,
// causa, epitaffio, la foto dell'oggetto incorniciata con la sua lapide in un
// medaglione, e il nome del gioco (il link o il QR arriveranno con la pubblicazione negli store).
// Disegnata su una tela 1080×1350 (4:5, va bene per chat e social).

import { t } from '../i18n/index.ts';
import { drawLpIcon } from './lpIcons.ts';
import { patternTileUrl } from './playDecor.ts';

export interface PostcardData {
  name: string;
  /** Riga delle date, già formattata (es. «12 mar 2014 — 3 ott 2026»). */
  dates: string;
  cause: string;
  category: string;
  epitaph: string | null;
  photo: CanvasImageSource | null;
  headstone: CanvasImageSource | null;
}

export const POSTCARD_W = 1080, POSTCARD_H = 1350;

// i colori del tema scuro del gioco (ui-play.css)
const SHEET = '#2a2633', PANEL = '#3a3545', PANEL2 = '#474154', THUMB = '#2c2836';
const PAPER = '#f3ecdf', MUTED = '#bdb5c8', GOLD = '#c99340', GOLD_HI = '#ffe2a8', PRIMARY = '#f0c46e';
const GOTHIC = '"Grenze Gotisch", "Nunito", serif'; // i18n-ok
const SANS = '"Nunito", system-ui, sans-serif'; // i18n-ok

/** Il testo più grande che entra in `max` pixel (scende fino a `min`). */
function fit(g: CanvasRenderingContext2D, text: string, font: (px: number) => string, size: number, max: number, min = size * 0.5) {
  let px = size;
  g.font = font(px);
  while (px > min && g.measureText(text).width > max) { px -= 2; g.font = font(px); }
  return px;
}

/** A capo per parole, al massimo `lines` righe (l'ultima con i puntini se serve). */
function wrap(g: CanvasRenderingContext2D, text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width <= max) { cur = next; continue; }
    out.push(cur); cur = w;
    if (out.length === lines) break;
  }
  if (out.length < lines && cur) out.push(cur);
  if (out.join(' ').length < text.length) { let last = out[lines - 1] ?? ''; while (last && g.measureText(`${last}…`).width > max) last = last.slice(0, -1); out[lines - 1] = `${last}…`; } // i18n-ok: puntini di troncamento
  return out;
}

const rrect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const loadSvg = (url: string) => new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });

/**
 * Cartolina nello stile del gioco: il foglio viola scuro col motivo tono su
 * tono (zucche, foglie, teschi, bare), un riquadro arrotondato col filo d'oro,
 * le decorazioni low-poly negli angoli, il nome in Grenze Gotisch, la foto (o
 * la lapide) in una cornice arrotondata con la lapide in un medaglione.
 */
export async function drawPostcard(d: PostcardData): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(`700 80px ${GOTHIC}`), document.fonts.load(`700 30px ${SANS}`), document.fonts.load(`800 30px ${SANS}`), document.fonts.load(`600 30px ${SANS}`)]).catch(() => undefined);
  const W = POSTCARD_W, H = POSTCARD_H;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  // il foglio, con una luce calda dall'alto
  g.fillStyle = SHEET; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, H * 0.28, 60, W / 2, H * 0.28, W * 0.95);
  glow.addColorStop(0, 'rgba(255, 226, 168, 0.12)'); glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // il motivo tono su tono dei pannelli, più grande (la cartolina è larga quasi tre telefoni)
  const tile = await loadSvg(patternTileUrl('rgba(14, 8, 4, 0.34)'));
  if (tile) {
    const pat = g.createPattern(tile, 'repeat');
    if (pat) { pat.setTransform(new DOMMatrix().scale(1.7)); g.fillStyle = pat; g.fillRect(0, 0, W, H); }
  }
  // il riquadro: pannello arrotondato col filo d'oro
  const M = 40, R = 56;
  g.save(); g.shadowColor = 'rgba(8, 5, 14, 0.55)'; g.shadowBlur = 40; g.shadowOffsetY = 12;
  rrect(g, M, M, W - 2 * M, H - 2 * M, R); g.fillStyle = 'rgba(58, 53, 69, 0.55)'; g.fill();
  g.restore();
  rrect(g, M, M, W - 2 * M, H - 2 * M, R); g.lineWidth = 5; g.strokeStyle = GOLD; g.stroke();
  rrect(g, M + 16, M + 16, W - 2 * M - 32, H - 2 * M - 32, R - 14); g.lineWidth = 2; g.strokeStyle = 'rgba(255, 226, 168, 0.22)'; g.stroke();
  // decorazioni negli angoli, come nell'interfaccia
  const deco = (name: string, x: number, y: number, s: number, a: number) => { g.save(); g.translate(x, y); g.rotate(a); drawLpIcon(g, name, -s / 2, -s / 2, s); g.restore(); };
  deco('pumpkin', M + 18, M + 18, 104, -0.25);
  deco('leaf', W - M - 16, M + 16, 92, 0.5);
  deco('skull', M + 16, H - M - 18, 92, -0.15);
  deco('coffin', W - M - 18, H - M - 20, 96, 0.3);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // intestazione
  g.fillStyle = MUTED; g.font = `700 32px ${SANS}`;
  g.fillText(t('postcard.inMemoryOf').toUpperCase(), W / 2, 150);
  fit(g, d.name, (p) => `700 ${p}px ${GOTHIC}`, 118, W - 260, 60);
  g.save(); g.shadowColor = 'rgba(0, 0, 0, 0.5)'; g.shadowOffsetY = 5; g.shadowBlur = 10;
  g.fillStyle = GOLD_HI; g.fillText(d.name, W / 2, 262);
  g.restore();
  // la foto (senza foto: la lapide, grande) in una cornice arrotondata
  const S = 540, fx = (W - S) / 2, fy = 304, FR = 42;
  g.save(); g.shadowColor = 'rgba(8, 5, 14, 0.6)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
  rrect(g, fx - 10, fy - 10, S + 20, S + 20, FR + 8); g.fillStyle = PRIMARY; g.fill();
  g.restore();
  rrect(g, fx, fy, S, S, FR); g.fillStyle = THUMB; g.fill();
  const big = d.photo ?? d.headstone;
  if (big) {
    g.save(); rrect(g, fx, fy, S, S, FR); g.clip();
    // senza foto, un alone caldo dietro la lapide (o il frutto dell'albero)
    if (!d.photo) { const glow = g.createRadialGradient(W / 2, fy + S * 0.56, 0, W / 2, fy + S * 0.56, S * 0.5); glow.addColorStop(0, 'rgba(255, 214, 120, 0.3)'); glow.addColorStop(1, 'rgba(255, 214, 120, 0)'); g.fillStyle = glow; g.fillRect(fx, fy, S, S); }
    g.drawImage(big, fx, fy, S, S); g.restore();
  }
  // con la foto, la lapide in un medaglione in basso a destra
  if (d.photo && d.headstone) {
    const r = 92, cx = fx + S - 24, cy = fy + S - 24;
    g.save(); g.shadowColor = 'rgba(8, 5, 14, 0.6)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.beginPath(); g.arc(cx, cy, r + 8, 0, Math.PI * 2); g.fillStyle = PRIMARY; g.fill();
    g.restore();
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = PANEL2; g.fill();
    g.drawImage(d.headstone, cx - r * 0.95, cy - r * 0.98, r * 1.9, r * 1.9);
  }
  // date, causa, epitaffio
  let y = fy + S + 88;
  g.fillStyle = PAPER; g.font = `800 42px ${SANS}`;
  g.fillText(d.dates, W / 2, y);
  y += 50;
  g.fillStyle = MUTED; g.font = `700 30px ${SANS}`;
  g.fillText(t('postcard.causeCategory', { cause: d.cause, category: d.category }), W / 2, y);
  if (d.epitaph) {
    y += 62;
    g.fillStyle = '#e6dccb'; g.font = `600 34px ${SANS}`;
    for (const line of wrap(g, t('postcard.epitaph', { text: d.epitaph }), W - 260, 2)) { g.fillText(line, W / 2, y); y += 44; }
  }
  // il nome del gioco, sotto un filo col fuoco fatuo
  const by = H - 128;
  g.fillStyle = 'rgba(201, 147, 64, 0.55)';
  g.fillRect(W / 2 - 250, by - 84, 200, 3); g.fillRect(W / 2 + 50, by - 84, 200, 3);
  drawLpIcon(g, 'wisp', W / 2 - 24, by - 108, 48);
  g.fillStyle = PRIMARY; g.font = `700 60px ${GOTHIC}`;
  g.fillText(t('postcard.restsAt'), W / 2, by);
  g.fillStyle = MUTED; g.font = `700 28px ${SANS}`;
  g.fillText(t('postcard.tagline'), W / 2, by + 42);
  void PANEL;
  return c;
}

/** Condivide la cartolina (foglio di condivisione del telefono) o, se non si può, la scarica. */
export async function sharePostcard(canvas: HTMLCanvasElement, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const file = new File([blob], `necrothing-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || t('postcard.file.fallback')}.png`, { type: 'image/png' });
  const text = t('postcard.shareText', { name });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text, title: t('postcard.shareTitle', { name }) }); return 'shared'; } catch { return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'downloaded';
}
