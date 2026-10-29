// La pergamena anticata delle schede (descrizioni e dati): un riquadro che si
// disegna alla sua misura (la stessa carta della cartolina) e le voci con le
// icone monocromatiche, uguali in tutto il gioco.

import { h } from './dom.ts';
import { monoIcon } from './monoIcons.ts';
import { parchmentSvg } from './postcard.ts';
import { svgToPng } from './natureDecor.ts';

/** L'icona di ogni voce dei dati (le etichette sono le chiavi dei testi). */
export const FACT_ICONS = {
  category: 'tag', lived: 'calendar', cause: 'skull', buried: 'shovel', stone: 'tomb', state: 'flower', ghosts: 'ghost',
  condition: 'hammer', light: 'bulb', business: 'wisp', available: 'all', owned: 'home',
} as const;
export type FactKind = keyof typeof FACT_ICONS;

/** L'etichetta di una voce, con la sua icona nell'interfaccia «viva». */
export const factLabel = (kind: FactKind, label: string) => [monoIcon(FACT_ICONS[kind], 18), label];

/** Riquadro di pergamena: la carta si ridisegna quando cambia misura (a passi di 8 px); finché non è pronta, un fondo color carta. */
export function parchment(cls: string, ...kids: Array<Node | null>): HTMLElement {
  const el = h('div', { class: `parch ${cls}` }, ...kids);
  let last = '';
  new ResizeObserver(() => {
    const w = Math.ceil(el.offsetWidth / 8) * 8, ht = Math.ceil(el.offsetHeight / 8) * 8;
    const key = `${w}x${ht}`;
    if (!w || !ht || key === last) return;
    last = key;
    // la carta ha i filtri (grana, bordi bruciati): la si disegna una volta come immagine
    void svgToPng(parchmentSvg(w, ht, 4), w, ht).then((png) => { if (png && last === key) el.style.setProperty('--parch', png); });
  }).observe(el);
  return el;
}
