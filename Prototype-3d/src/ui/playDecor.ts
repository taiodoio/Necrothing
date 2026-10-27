// Decori dell'interfaccia «viva»: le immagini negli
// angoli dei riquadri e il pattern tono su tono dei pannelli, passati al CSS
// come variabili (--deco-*, --pattern-*), così gli stili restano tutti in ui-play.css.

import { lpIconUrl } from './lpIcons.ts';
import { installNatureDecor } from './natureDecor.ts';

/**
 * Tessera del pattern: zucca, foglia, teschio, bara, pipistrello e qualche
 * stellina, solo il contorno, in un colore appena più scuro dello sfondo.
 */
type TileShape = { d?: string; x?: number; y?: number; r?: number; rx?: number; ry?: number };
const PUMPKIN: TileShape[] = [{ rx: 15, ry: 11 }, { rx: 6.5, ry: 11 }, { d: 'M1 -11 q1 -6 6 -8' }];
const LEAF: TileShape[] = [{ d: 'M0 -17 C11 -9 11 8 0 17 C-11 8 -11 -9 0 -17 Z M0 -12 L0 17 M0 -2 l6 -5 M0 5 l-6 -5' }];
const SKULL: TileShape[] = [{ d: 'M-11 3 a11 11 0 1 1 22 0 v5 h-5 v6 h-12 v-6 h-5 z' }, { x: -4.5, y: 1, r: 2.8 }, { x: 4.5, y: 1, r: 2.8 }];
const COFFIN: TileShape[] = [{ d: 'M-6 -17 h12 l6 8 l-5 25 h-14 l-5 -25 z M0 -10 v12 M-4 -5 h8' }];
const BAT: TileShape[] = [{ d: 'M0 2 q-5 -7 -14 -5 q4 3 3 7 q4 -2 6 1 q2 -3 5 -1 q3 -2 5 1 q2 -3 6 -1 q-1 -4 3 -7 q-9 -2 -14 5 z' }];
const STAR: TileShape[] = [{ d: 'M0 -4 v8 M-4 0 h8' }];
/** Dove sta ogni figura nella tessera 200×200: posizione, rotazione in gradi, figura. */
const TILE: Array<[number, number, number, TileShape[]]> = [
  [38, 40, -14, PUMPKIN], [142, 34, 24, LEAF], [150, 140, 10, SKULL], [48, 146, -22, COFFIN],
  [98, 92, -8, BAT], [98, 18, 0, STAR], [16, 96, 0, STAR], [186, 88, 0, STAR], [104, 176, 0, STAR],
];

/** La tessera come data-URI (lo sfondo dei pannelli, nel CSS). */
export function patternTileUrl(stroke: string): string {
  const shape = (p: TileShape) => (p.d ? `<path d="${p.d}"/>` : p.r ? `<circle cx="${p.x}" cy="${p.y}" r="${p.r}"/>` : `<ellipse rx="${p.rx}" ry="${p.ry}"/>`);
  const body = TILE.map(([x, y, a, shapes]) => `<g transform="translate(${x} ${y}) rotate(${a})">${shapes.map(shape).join('')}</g>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><g fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** La stessa tessera disegnata su una tela (la cartolina: niente immagini SVG sulla sua tela, Safari a volte non la esporta). */
export function patternTileCanvas(stroke: string, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(200 * scale);
  const g = c.getContext('2d');
  if (!g) return c;
  g.scale(scale, scale);
  g.strokeStyle = stroke; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [x, y, a, shapes] of TILE) {
    g.save(); g.translate(x, y); g.rotate((a * Math.PI) / 180);
    for (const p of shapes) {
      if (p.d) { g.stroke(new Path2D(p.d)); continue; }
      g.beginPath();
      if (p.r) g.arc(p.x ?? 0, p.y ?? 0, p.r, 0, Math.PI * 2); else g.ellipse(0, 0, p.rx!, p.ry!, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }
  return c;
}

const patternTile = (stroke: string) => `url("${patternTileUrl(stroke)}")`;

export function installPlayDecor() {
  const st = document.documentElement.style;
  for (const name of ['pumpkin', 'skull', 'leaf', 'coffin', 'ghost', 'bone', 'wisp']) st.setProperty(`--deco-${name}`, lpIconUrl(name));
  // un marrone scuro molto trasparente: sullo sfondo chiaro e su quello scuro resta «tono su tono»
  st.setProperty('--pattern-dark', patternTile('rgba(14, 8, 4, 0.32)'));
  installNatureDecor();
}
