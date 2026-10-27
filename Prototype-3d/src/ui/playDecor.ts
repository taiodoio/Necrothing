// Decori dell'interfaccia «viva»: le immagini negli
// angoli dei riquadri e il pattern tono su tono dei pannelli, passati al CSS
// come variabili (--deco-*, --pattern-*), così gli stili restano tutti in ui-play.css.

import { lpIconUrl } from './lpIcons.ts';
import { installNatureDecor } from './natureDecor.ts';

/**
 * Tessera del pattern: zucca, foglia, teschio, bara, pipistrello e qualche
 * stellina, solo il contorno, in un colore appena più scuro dello sfondo.
 */
/** La tessera come data-URI (per disegnarla su un canvas: la cartolina). */
export function patternTileUrl(stroke: string): string {
  const g = (x: number, y: number, a: number, body: string) => `<g transform="translate(${x} ${y}) rotate(${a})">${body}</g>`;
  const pumpkin = '<ellipse rx="15" ry="11"/><ellipse rx="6.5" ry="11"/><path d="M1 -11 q1 -6 6 -8"/>';
  const leaf = '<path d="M0 -17 C11 -9 11 8 0 17 C-11 8 -11 -9 0 -17 Z M0 -12 L0 17 M0 -2 l6 -5 M0 5 l-6 -5"/>';
  const skull = '<path d="M-11 3 a11 11 0 1 1 22 0 v5 h-5 v6 h-12 v-6 h-5 z"/><circle cx="-4.5" cy="1" r="2.8"/><circle cx="4.5" cy="1" r="2.8"/>';
  const coffin = '<path d="M-6 -17 h12 l6 8 l-5 25 h-14 l-5 -25 z M0 -10 v12 M-4 -5 h8"/>';
  const bat = '<path d="M0 2 q-5 -7 -14 -5 q4 3 3 7 q4 -2 6 1 q2 -3 5 -1 q3 -2 5 1 q2 -3 6 -1 q-1 -4 3 -7 q-9 -2 -14 5 z"/>';
  const star = '<path d="M0 -4 v8 M-4 0 h8"/>';
  const body = [
    g(38, 40, -14, pumpkin), g(142, 34, 24, leaf), g(150, 140, 10, skull), g(48, 146, -22, coffin),
    g(98, 92, -8, bat), g(98, 18, 0, star), g(16, 96, 0, star), g(186, 88, 0, star), g(104, 176, 0, star),
  ].join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><g fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const patternTile = (stroke: string) => `url("${patternTileUrl(stroke)}")`;

export function installPlayDecor() {
  const st = document.documentElement.style;
  for (const name of ['pumpkin', 'skull', 'leaf', 'coffin', 'ghost', 'bone']) st.setProperty(`--deco-${name}`, lpIconUrl(name));
  // un marrone scuro molto trasparente: sullo sfondo chiaro e su quello scuro resta «tono su tono»
  st.setProperty('--pattern-light', patternTile('rgba(92, 63, 34, 0.11)'));
  st.setProperty('--pattern-dark', patternTile('rgba(14, 8, 4, 0.32)'));
  installNatureDecor();
}
