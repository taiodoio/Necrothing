// Icone monocromatiche (24×24, nel colore del testo): forme piene e nette, i
// dettagli ritagliati. Si usano dove serve un segno leggibile e sobrio: schede,
// righe dei dati sulla pergamena, voci dei cartellini. Le icone a colori del
// gioco (lpIcons) restano per oggetti, pulsanti e notifiche.

const C = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const R = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}z`;
/** Tracciato, (non usato), regola di riempimento, decori in più (tratti, buchi), trasformazione. */
type Spec = [string, null?, ('nonzero' | 'evenodd')?, string?, string?];

const ICONS: Record<string, Spec> = {
  // schede
  all: [R(3, 3, 8, 8) + R(13, 3, 8, 8) + R(3, 13, 8, 8) + R(13, 13, 8, 8)],
  home: ['M12 2.6 1.8 11.2h2.9V21h5.4v-6.2h3.8V21h5.4v-9.8h2.9z'],
  light: ['M6.8 7.6h10.4L14.6 3.8H9.4z' + R(7.4, 8.4, 9.2, 10) + R(9.8, 10.6, 4.4, 5.6) + R(5.6, 19.4, 12.8, 2.4), null, 'evenodd', '<circle cx="12" cy="2.4" r="1.4" stroke="currentColor" stroke-width="1.5" fill="none"/>'],
  flower: [C(12, 5.2, 3.2) + C(17.1, 8.9, 3.2) + C(15.2, 14.9, 3.2) + C(8.8, 14.9, 3.2) + C(6.9, 8.9, 3.2) + C(12, 10.6, 2.1) + C(12, 10.6, 0.9), null, 'evenodd', '<path d="M12 18.2V23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'],
  fence: ['M3.6 6.4 5.6 3.4l2 3V21h-4z' + 'M10 6.4l2-3 2 3V21h-4z' + 'M16.4 6.4l2-3 2 3V21h-4z' + R(2, 8.6, 20, 2.2) + R(2, 14.6, 20, 2.2)],
  tree: [C(12, 8, 5.6) + C(7.2, 11.6, 4) + C(16.8, 11.6, 4) + 'M10.8 13h2.4v6.2l2.6 2H8.2l2.6-2z'],
  ghost: ['M12 2.4a7.2 7.2 0 0 0-7.2 7.2V21.6l2.4-2.1 2.4 2.1 2.4-2.1 2.4 2.1 2.4-2.1 2.4 2.1V9.6A7.2 7.2 0 0 0 12 2.4z' + C(9.4, 9.8, 1.4) + C(14.6, 9.8, 1.4), null, 'evenodd'],
  star: ['M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8L2.2 9.3l6.9-.8z'],
  pumpkin: ['M12 6.4c-1.2-1-2.6-1.4-4.2-1.4C4.5 5 2.4 8.2 2.4 12.6S4.5 20.4 7.8 20.4c1.6 0 3-.5 4.2-1.4 1.2.9 2.6 1.4 4.2 1.4 3.3 0 5.4-3.4 5.4-7.8S19.5 5 16.2 5c-1.6 0-3 .4-4.2 1.4z' + 'M11.2 6.2c0-2 .5-3.5 2-4.6l1.2 1.1c-1 .8-1.4 2-1.4 3.5z', null, 'nonzero', '<path d="M12 7.8c-1 3.4-1 7.8 0 11M7.6 7.4c-1.6 3-1.6 7.6 0 10.6M16.4 7.4c1.6 3 1.6 7.6 0 10.6" stroke="var(--hole, #2a2633)" stroke-width="1.1" fill="none" stroke-linecap="round"/>'],
  face: [C(12, 12.6, 9.2) + C(8.6, 11.6, 1.5) + C(15.4, 11.6, 1.5) + 'M8.4 15.4c1 1.6 2.2 2.4 3.6 2.4s2.6-.8 3.6-2.4l-1.2-.7c-.7 1.1-1.5 1.6-2.4 1.6s-1.7-.5-2.4-1.6z' + 'M5 9.4C6 5.2 9 3.2 12 3.2s6 2 7 6.2c-2.2-1.6-4.6-2.4-7-2.4s-4.8.8-7 2.4z', null, 'evenodd'],
  comb: ['M3 5.4h18v5.4H3z' + R(4, 10.8, 1.8, 8.4) + R(7.2, 10.8, 1.8, 8.4) + R(10.4, 10.8, 1.8, 8.4) + R(13.6, 10.8, 1.8, 8.4) + R(16.8, 10.8, 1.8, 8.4) + R(19.6, 10.8, 1.4, 6)],
  shirt: ['M8.6 3 3 5.8 1.6 11l3.6 1.4 1.4-2.6V21h10.8V9.8l1.4 2.6 3.6-1.4L21 5.8 15.4 3c-.6 1.6-1.9 2.6-3.4 2.6S9.2 4.6 8.6 3z'],
  // impostazioni, Custode
  shovel: ['M8.8 1.6h6.4v2.6h-2v8.6c2.4.3 3.9 2 3.9 4.6L12 22.4l-5.1-5c0-2.6 1.5-4.3 3.9-4.6V4.2h-2z'],
  sparkle: ['M12 1.8l2.3 7.9 7.9 2.3-7.9 2.3L12 22.2l-2.3-7.9L1.8 12l7.9-2.3z'],
  save: ['M4 3h12.6L20 6.4V21H4z' + R(7, 3, 7.6, 5.4) + R(7.2, 12.4, 9.6, 6.4) + R(11.8, 4, 1.8, 3.2), null, 'evenodd'],
  info: [C(12, 12, 9.6) + R(10.8, 10.4, 2.4, 7.2) + C(12, 7.4, 1.5), null, 'evenodd'],
  keeper: [C(12, 9.6, 3.8) + 'M3.6 22c0-4.6 3.8-7.6 8.4-7.6s8.4 3 8.4 7.6z' + R(5.6, 5, 12.8, 1.8) + R(8.4, 0.8, 7.2, 4.6)],
  trophy: ['M6.6 2.6h10.8v6a5.4 5.4 0 0 1-10.8 0z' + R(10.8, 13.6, 2.4, 4) + 'M7.4 18.6h9.2l.8 3H6.6z', null, 'nonzero', '<path d="M6.8 4.6H3.8v1.6a3.6 3.6 0 0 0 3.8 3.6M17.2 4.6h3v1.6a3.6 3.6 0 0 1-3.8 3.6" stroke="currentColor" stroke-width="1.8" fill="none"/>'],
  book: ['M2.6 4.6c2.8-1.2 5.8-1 8.2.8v15.2c-2.4-1.6-5.4-1.8-8.2-.8z' + 'M21.4 4.6c-2.8-1.2-5.8-1-8.2.8v15.2c2.4-1.6 5.4-1.8 8.2-.8z'],
  // dati delle schede (pergamena)
  tag: ['M2.6 11.4V2.6h8.8l10 10-8.8 8.8z' + C(7.2, 7.2, 1.8), null, 'evenodd'],
  calendar: [R(3, 4.4, 18, 17) + R(5.4, 10.2, 3.2, 3) + R(10.4, 10.2, 3.2, 3) + R(15.4, 10.2, 3.2, 3) + R(5.4, 15, 3.2, 3) + R(10.4, 15, 3.2, 3) + R(3, 4.4, 18, 0), null, 'evenodd', '<path d="M7.6 2v4.4M16.4 2v4.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'],
  skull: ['M12 2.2a8.4 8.4 0 0 0-8.4 8.4c0 3 1.4 4.9 3.2 6V21h2.6v-2.2h1.4V21h2.4v-2.2h1.4V21h2.6v-4.4c1.8-1.1 3.2-3 3.2-6A8.4 8.4 0 0 0 12 2.2z' + C(8.6, 11, 2) + C(15.4, 11, 2) + 'M12 13.4l1.2 2.4h-2.4z', null, 'evenodd'],
  tomb: ['M5.6 20V9.4a6.4 6.4 0 0 1 12.8 0V20z' + 'M10.9 6.4h2.2v2.4h2.4V11h-2.4v5.2h-2.2V11H8.5V8.8h2.4z' + R(2.6, 20, 18.8, 2.2), null, 'evenodd'],
  hammer: ['M2.6 3.8h11.6l4.6 2.5-4.6 2.5H2.6z' + R(7, 8.8, 3.2, 13), null, 'nonzero', '', 'rotate(-35 12 12)'],
  bulb: ['M12 1.8a7 7 0 0 0-4.2 12.6V17h8.4v-2.6A7 7 0 0 0 12 1.8z' + R(8.4, 18.2, 7.2, 1.6) + R(9.6, 20.6, 4.8, 1.6)],
  wisp: ['M12 1.8c3.4 4.4 6.6 7.6 6.6 12a6.6 6.6 0 0 1-13.2 0c0-4.4 3.2-7.6 6.6-12z' + 'M12 10.4c1.4 2 2.6 3.4 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.6 1.2-3 2.6-5z', null, 'evenodd'],
};

export type MonoIcon = keyof typeof ICONS;

/** L'icona come elemento (`--hole` è il colore dei buchi disegnati sopra, es. il cuore del fiore). */
export function monoIcon(name: string, size = 20): HTMLElement {
  const [d, , rule = 'nonzero', extra = '', tf = ''] = ICONS[name] ?? ICONS.star;
  const span = document.createElement('span');
  span.className = 'mono';
  span.setAttribute('aria-hidden', 'true');
  span.style.setProperty('--s', `${size}px`);
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><g transform="${tf}"><path d="${d}" fill="currentColor" fill-rule="${rule}"/>${extra}</g></svg>`; // i18n-ok: disegno
  return span;
}

/** I nomi disponibili (galleria e test). */
export const MONO_ICONS = Object.keys(ICONS);
