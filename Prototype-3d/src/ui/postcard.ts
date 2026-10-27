// Cartolina funebre da condividere, nello stile del gioco: nome, la foto
// dell'oggetto incorniciata con la sua lapide nell'angolo (come nelle schede),
// date, causa ed epitaffio su una pergamena anticata, e il nome del gioco (il
// link o il QR arriveranno con la pubblicazione negli store).
// Disegnata su una tela 1080×1350 (4:5, va bene per chat e social).

import { t } from '../i18n/index.ts';
import { drawLpIcon } from './lpIcons.ts';
import { patternTileCanvas } from './playDecor.ts';

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
const SHEET = '#2a2633', THUMB = '#2c2836';
const MUTED = '#bdb5c8', GOLD = '#c99340', GOLD_HI = '#ffe2a8', PRIMARY = '#f0c46e';
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

/**
 * Pergamena: carta invecchiata dai bordi irregolari, macchie, bordo
 * bruciacchiato e un angolo consumato (la stessa delle prove d'interfaccia).
 * Si disegna a metà misura e si ingrandisce: grana e bordi restano morbidi.
 */
export function parchmentSvg(W: number, H: number, seed = 3): string {
  const shape = `M6 8 L${W - 22} 5 L${W - 6} 16 L${W - 5} ${H - 9} L${W * 0.55} ${H - 4} L12 ${H - 6} L5 ${H * 0.6} Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="e" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
    <filter id="s"><feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="4" seed="${seed + 5}"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .38  0 0 0 0 .16  0 0 0 1.1 -.35"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="f"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="${seed + 9}"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .18  0 0 0 .28 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="burn"><feMorphology operator="erode" radius="5" in="SourceAlpha" result="in"/><feComposite in="SourceAlpha" in2="in" operator="out" result="ring"/><feGaussianBlur in="ring" stdDeviation="4" result="b"/><feFlood flood-color="#9c6c34" flood-opacity=".75"/><feComposite in2="b" operator="in"/><feComposite in2="SourceAlpha" operator="in"/></filter>
    <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e6c8"/><stop offset=".55" stop-color="#ead8b0"/><stop offset="1" stop-color="#dcc391"/></linearGradient>
    <clipPath id="c"><path d="${shape}"/></clipPath>
  </defs>
  <g filter="url(#e)">
    <path d="${shape}" fill="url(#pg)"/>
    <g clip-path="url(#c)">
      <rect width="${W}" height="${H}" fill="#fff" filter="url(#s)" opacity=".55"/>
      <rect width="${W}" height="${H}" fill="#fff" filter="url(#f)"/>
      <path d="${shape}" fill="#000" filter="url(#burn)"/>
      <path d="M${W - 22} 5 L${W - 6} 16 L${W - 18} 17 Z" fill="#c9ab76" opacity=".9"/>
    </g>
  </g>
</svg>`; // i18n-ok: disegno
}

/** Un'icona low-poly col contorno bianco, come un adesivo (il lumino sulla foto, come nella scheda del defunto). */
function outlinedIcon(name: string, size: number, line: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size + line * 2;
  const g = c.getContext('2d');
  if (!g) return c;
  const icon = document.createElement('canvas');
  icon.width = icon.height = size;
  const ig = icon.getContext('2d');
  if (!ig) return c;
  drawLpIcon(ig, name, 0, 0, size);
  // la sagoma bianca, spostata tutto attorno, poi l'icona sopra
  const white = document.createElement('canvas');
  white.width = white.height = size;
  const wg = white.getContext('2d')!;
  wg.drawImage(icon, 0, 0); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#fff'; wg.fillRect(0, 0, size, size);
  for (let a = 0; a < 16; a++) g.drawImage(white, line + Math.cos((a * Math.PI) / 8) * line, line + Math.sin((a * Math.PI) / 8) * line);
  g.drawImage(icon, line, line);
  return c;
}

/**
 * La pergamena della cartolina disegnata direttamente sulla tela (come
 * parchmentSvg, ma senza filtri SVG): bordo strappato, carta calda con
 * macchie e grana, bordi bruciati, l'angolo piegato, l'ombra sotto.
 */
function drawParchment(g: CanvasRenderingContext2D, x: number, y: number, W: number, H: number, seed: number) {
  let s = seed * 7919;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // il contorno: i lati spezzati in tratti corti, ognuno spostato un poco
  const corners: Array<[number, number]> = [[12, 16], [W - 44, 10], [W - 12, 32], [W - 10, H - 18], [W * 0.55, H - 8], [24, H - 12], [10, H * 0.6]];
  const pts: Array<[number, number]> = [];
  corners.forEach(([ax, ay], i) => {
    const [bx, by] = corners[(i + 1) % corners.length];
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.ceil(len / 14));
    const nx = -(by - ay) / len, ny = (bx - ax) / len;
    for (let k = 0; k < n; k++) { const f = k / n, j = (rnd() - 0.5) * 5; pts.push([x + ax + (bx - ax) * f + nx * j, y + ay + (by - ay) * f + ny * j]); }
  });
  const path = () => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); };
  const paper = g.createLinearGradient(x, y, x + W, y + H);
  paper.addColorStop(0, '#f3e6c8'); paper.addColorStop(0.55, '#ead8b0'); paper.addColorStop(1, '#dcc391');
  g.save(); g.shadowColor = 'rgba(8, 5, 14, 0.55)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
  path(); g.fillStyle = paper; g.fill();
  g.restore();
  g.save(); path(); g.clip();
  // macchie larghe e tenui
  for (let i = 0; i < 7; i++) {
    const cx = x + rnd() * W, cy = y + rnd() * H, r = 50 + rnd() * 110;
    const m = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    m.addColorStop(0, `rgba(150, 104, 44, ${0.06 + rnd() * 0.08})`); m.addColorStop(1, 'rgba(150, 104, 44, 0)');
    g.fillStyle = m; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // la grana della carta
  for (let i = 0, n = Math.round((W * H) / 80); i < n; i++) {
    g.fillStyle = `rgba(92, 64, 34, ${(rnd() * 0.16).toFixed(3)})`;
    g.fillRect(x + rnd() * W, y + rnd() * H, 1.4 + rnd() * 1.4, 1.4 + rnd() * 1.4);
  }
  // i bordi bruciati: una linea larga e sfumata lungo il contorno, tagliata dentro la carta
  g.shadowColor = 'rgba(120, 72, 26, 0.85)'; g.shadowBlur = 16;
  g.lineWidth = 9; g.strokeStyle = 'rgba(156, 108, 52, 0.6)';
  path(); g.stroke();
  g.restore();
  // l'angolo piegato in alto a destra
  g.beginPath(); g.moveTo(x + W - 44, y + 10); g.lineTo(x + W - 12, y + 32); g.lineTo(x + W - 36, y + 34); g.closePath();
  g.fillStyle = 'rgba(201, 171, 118, 0.95)'; g.fill();
}

/**
 * Cartolina nello stile del gioco: il foglio viola scuro col motivo tono su
 * tono (zucche, foglie, teschi, bare), un riquadro arrotondato col filo d'oro,
 * le decorazioni low-poly negli angoli, il nome in Grenze Gotisch, la foto
 * come una stampa appoggiata col lumino acceso (senza foto: la lapide grande
 * in una cornice arrotondata), e le parole su una pergamena.
 */
export async function drawPostcard(d: PostcardData): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(`700 80px ${GOTHIC}`), document.fonts.load(`700 30px ${SANS}`), document.fonts.load(`800 30px ${SANS}`), document.fonts.load(`600 30px ${SANS}`)]).catch(() => undefined);
  const W = POSTCARD_W, H = POSTCARD_H;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  // sul telefono la memoria per le tele è poca: se non c'è, lo si dice (chi chiama mostra l'errore)
  const g = c.getContext('2d');
  if (!g) throw new Error(t('postcard.failedText'));
  g.imageSmoothingEnabled = true;
  // il foglio, con una luce calda dall'alto
  g.fillStyle = SHEET; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, H * 0.28, 60, W / 2, H * 0.28, W * 0.95);
  glow.addColorStop(0, 'rgba(255, 226, 168, 0.12)'); glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // il motivo tono su tono dei pannelli, più grande (la cartolina è larga quasi tre telefoni)
  // (tutto disegnato sulla tela, senza immagini SVG: su iPhone Safari a volte poi non la esporta)
  const tile = patternTileCanvas('rgba(14, 8, 4, 0.34)', 1.7);
  const pat = g.createPattern(tile, 'repeat');
  if (pat) { g.fillStyle = pat; g.fillRect(0, 0, W, H); }
  tile.width = tile.height = 0;
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
  let badgeBottom: number;
  if (d.photo) {
    // la foto è una stampa appoggiata, come nella scheda del defunto: bordo chiaro (più alto in basso),
    // appena storta, con l'ombra e il lumino acceso nell'angolo (la lapide qui non serve)
    const PS = 460, B = 20, BB = 66, PH = B + (PS - 2 * B) + BB, px = (W - PS) / 2, py = 300;
    g.save();
    g.translate(px + PS / 2, py + PH / 2); g.rotate(-0.026);
    g.save(); g.shadowColor = 'rgba(0, 0, 0, 0.55)'; g.shadowBlur = 36; g.shadowOffsetY = 22;
    g.fillStyle = '#efe6d4'; g.fillRect(-PS / 2, -PH / 2, PS, PH);
    g.restore();
    const paper = g.createLinearGradient(0, -PH / 2, 0, PH / 2);
    paper.addColorStop(0, 'rgba(255, 255, 255, 0.35)'); paper.addColorStop(1, 'rgba(180, 160, 120, 0.18)');
    g.fillStyle = paper; g.fillRect(-PS / 2, -PH / 2, PS, PH);
    g.drawImage(d.photo, -PS / 2 + B, -PH / 2 + B, PS - 2 * B, PS - 2 * B);
    g.fillStyle = 'rgba(0, 0, 0, 0.12)'; g.fillRect(-PS / 2 + B, -PH / 2 + B, PS - 2 * B, 2);
    // il lumino che sporge dall'angolo in basso a destra, con la sua luce
    const cx = PS / 2 + 4, cy = PH / 2 - 14, CS = 150;
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, CS * 0.8);
    halo.addColorStop(0, 'rgba(255, 196, 110, 0.6)'); halo.addColorStop(1, 'rgba(255, 196, 110, 0)');
    g.fillStyle = halo; g.fillRect(cx - CS, cy - CS, CS * 2, CS * 2);
    g.save(); g.translate(cx, cy); g.rotate(0.1);
    g.shadowColor = 'rgba(0, 0, 0, 0.5)'; g.shadowBlur = 10; g.shadowOffsetY = 6;
    g.drawImage(outlinedIcon('lumino', CS, 4), -CS / 2 - 4, -CS / 2 - 4);
    g.restore();
    g.restore();
    badgeBottom = py + PH + 34;
  } else {
    // senza foto: la lapide (o il frutto dell'albero), grande, in una cornice arrotondata con un alone caldo
    const S = 480, fx = (W - S) / 2, fy = 300, FR = 40;
    g.save(); g.shadowColor = 'rgba(8, 5, 14, 0.6)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
    rrect(g, fx - 10, fy - 10, S + 20, S + 20, FR + 8); g.fillStyle = PRIMARY; g.fill();
    g.restore();
    rrect(g, fx, fy, S, S, FR); g.fillStyle = THUMB; g.fill();
    if (d.headstone) {
      g.save(); rrect(g, fx, fy, S, S, FR); g.clip();
      const glow = g.createRadialGradient(W / 2, fy + S * 0.56, 0, W / 2, fy + S * 0.56, S * 0.5); glow.addColorStop(0, 'rgba(255, 214, 120, 0.3)'); glow.addColorStop(1, 'rgba(255, 214, 120, 0)'); g.fillStyle = glow; g.fillRect(fx, fy, S, S);
      g.drawImage(d.headstone, fx, fy, S, S); g.restore();
    }
    badgeBottom = fy + S + 36;
  }
  // date, causa ed epitaffio su una pergamena anticata, appena storta
  g.font = `600 34px ${SANS}`;
  const epitaph = d.epitaph ? wrap(g, t('postcard.epitaph', { text: d.epitaph }), 640, 2) : [];
  // il nome del gioco sta in fondo: la pergamena si centra nello spazio tra la foto e il suo filo
  const by = H - 108, rule = by - 84;
  const PW = 780, PH = 70 + 50 + (epitaph.length ? 58 + 44 * (epitaph.length - 1) : 0) + 44;
  const py = Math.max(badgeBottom + 24, (badgeBottom + rule - 30) / 2 - PH / 2);
  g.save();
  g.translate(W / 2, py + PH / 2); g.rotate(-0.012);
  drawParchment(g, -PW / 2, -PH / 2, PW, PH, 3);
  let y = -PH / 2 + 70;
  g.fillStyle = '#3b2814'; g.font = `800 42px ${SANS}`;
  fit(g, d.dates, (p) => `800 ${p}px ${SANS}`, 42, PW - 100, 28);
  g.fillText(d.dates, 0, y);
  y += 50;
  g.fillStyle = '#6e5233';
  fit(g, t('postcard.causeCategory', { cause: d.cause, category: d.category }), (p) => `700 ${p}px ${SANS}`, 30, PW - 100, 22);
  g.fillText(t('postcard.causeCategory', { cause: d.cause, category: d.category }), 0, y);
  if (epitaph.length) {
    y += 58;
    g.fillStyle = '#4a3420'; g.font = `italic 600 34px ${SANS}`;
    for (const line of epitaph) { g.fillText(line, 0, y); y += 44; }
  }
  g.restore();
  // il nome del gioco, sotto un filo col fuoco fatuo
  g.fillStyle = 'rgba(201, 147, 64, 0.55)';
  g.fillRect(W / 2 - 250, rule, 200, 3); g.fillRect(W / 2 + 50, rule, 200, 3);
  drawLpIcon(g, 'wisp', W / 2 - 24, rule - 24, 48);
  g.fillStyle = PRIMARY; g.font = `700 60px ${GOTHIC}`;
  g.fillText(t('postcard.restsAt'), W / 2, by);
  g.fillStyle = MUTED; g.font = `700 28px ${SANS}`;
  g.fillText(t('postcard.tagline'), W / 2, by + 40);
  return c;
}

/** Condivide la cartolina (foglio di condivisione del telefono) o, se non si può, la scarica. */
export async function sharePostcard(blob: Blob, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
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
