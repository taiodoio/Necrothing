// Cartolina funebre da condividere: nome, date, causa, epitaffio, la foto
// dell'oggetto incorniciata con la sua lapide in piccolo, e il rimando al
// gioco. Disegnata su una tela 1080×1350 (4:5, va bene per chat e social).

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

export const GAME_URL = 'necrothing.vercel.app';
export const POSTCARD_W = 1080, POSTCARD_H = 1350;

const GOLD = '#d8b26a', GOLD_HI = '#f1d39c', INK = '#07080b', PAPER = '#e8dcc4', MUTED = '#9a8f7c';
const GOTHIC = '"Jacquard 24", "Pixelify Sans", serif';
const PIXEL = '"Pixelify Sans", system-ui, sans-serif';

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
  if (out.join(' ').length < text.length) { let last = out[lines - 1] ?? ''; while (last && g.measureText(`${last}…`).width > max) last = last.slice(0, -1); out[lines - 1] = `${last}…`; }
  return out;
}

/** Cornice a pixel: bordo scuro, filo d'oro, interno scuro (come le cornici della UI). */
function pixelFrame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  g.fillStyle = INK; g.fillRect(x, y, w, h);
  g.fillStyle = GOLD; g.fillRect(x + t, y + t, w - 2 * t, h - 2 * t);
  g.fillStyle = INK; g.fillRect(x + 2 * t, y + 2 * t, w - 4 * t, h - 4 * t);
}

/** Croce d'angolo a pixel. */
function corner(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.fillStyle = GOLD;
  g.fillRect(x - s * 1.5, y - s / 2, s * 3, s); g.fillRect(x - s / 2, y - s * 1.5, s, s * 3);
  g.fillStyle = GOLD_HI; g.fillRect(x - s / 2, y - s / 2, s, s);
}

export async function drawPostcard(d: PostcardData): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(`400 80px ${GOTHIC}`), document.fonts.load(`400 30px ${PIXEL}`), document.fonts.load(`600 30px ${PIXEL}`)]).catch(() => undefined);
  const W = POSTCARD_W, H = POSTCARD_H;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  // carta scura con un alone caldo dall'alto e un po' di grana
  g.fillStyle = '#101318'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, H * 0.3, 40, W / 2, H * 0.3, W * 0.9);
  glow.addColorStop(0, 'rgba(120,90,50,0.28)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(255,240,210,${Math.random() * 0.04})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  // cornice della cartolina
  g.strokeStyle = INK; g.lineWidth = 12; g.strokeRect(22, 22, W - 44, H - 44);
  g.strokeStyle = GOLD; g.lineWidth = 6; g.strokeRect(28, 28, W - 56, H - 56);
  g.strokeStyle = 'rgba(216,178,106,0.45)'; g.lineWidth = 2; g.strokeRect(48, 48, W - 96, H - 96);
  for (const [x, y] of [[48, 48], [W - 48, 48], [48, H - 48], [W - 48, H - 48]]) corner(g, x, y, 10);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // intestazione
  g.fillStyle = MUTED; g.font = `400 34px ${PIXEL}`;
  g.fillText('In memoria di', W / 2, 122);
  const px = fit(g, d.name, (p) => `400 ${p}px ${GOTHIC}`, 104, W - 180, 56);
  g.fillStyle = '#000'; g.fillText(d.name, W / 2, 222 + 5);
  g.fillStyle = GOLD_HI; g.fillText(d.name, W / 2, 222);
  void px;
  // foto incorniciata (senza foto: la lapide al suo posto, grande)
  const S = 560, fx = (W - S) / 2, fy = 268, T = 8;
  pixelFrame(g, fx - 3 * T, fy - 3 * T, S + 6 * T, S + 6 * T, T);
  const big = d.photo ?? d.headstone;
  if (big) {
    if (!d.photo) { g.fillStyle = '#1a1e26'; g.fillRect(fx, fy, S, S); }
    g.drawImage(big, fx, fy, S, S);
  }
  // la lapide in piccolo, in basso a destra sopra la cornice
  if (d.photo && d.headstone) {
    const hs = 200;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.drawImage(d.headstone, fx + S - hs * 0.62, fy + S - hs * 0.68, hs, hs);
    g.restore();
  }
  // date, causa, epitaffio
  let y = fy + S + 3 * T + 70;
  g.fillStyle = PAPER; g.font = `600 38px ${PIXEL}`;
  g.fillText(d.dates, W / 2, y);
  y += 50;
  g.fillStyle = MUTED; g.font = `400 30px ${PIXEL}`;
  g.fillText(`${d.cause} · ${d.category}`, W / 2, y);
  if (d.epitaph) {
    y += 64;
    g.fillStyle = '#cfc6b2'; g.font = `400 34px ${PIXEL}`;
    for (const line of wrap(g, `“${d.epitaph}”`, W - 220, 2)) { g.fillText(line, W / 2, y); y += 44; }
  }
  // rimando al gioco
  const fy2 = H - 150;
  g.fillStyle = 'rgba(216,178,106,0.5)'; g.fillRect(W / 2 - 220, fy2 - 70, 440, 2);
  corner(g, W / 2, fy2 - 69, 7);
  g.fillStyle = GOLD; g.font = `400 54px ${GOTHIC}`;
  g.fillText('Riposa a Necrothing', W / 2, fy2);
  g.fillStyle = MUTED; g.font = `400 28px ${PIXEL}`;
  g.fillText(`il cimitero degli oggetti · ${GAME_URL}`, W / 2, fy2 + 46);
  return c;
}

/** Condivide la cartolina (foglio di condivisione del telefono) o, se non si può, la scarica. */
export async function sharePostcard(canvas: HTMLCanvasElement, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const file = new File([blob], `necrothing-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cartolina'}.png`, { type: 'image/png' });
  const text = `In memoria di ${name}. Sepolto a Necrothing, il cimitero degli oggetti: https://${GAME_URL}`;
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text, title: `In memoria di ${name}` }); return 'shared'; } catch { return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'downloaded';
}
