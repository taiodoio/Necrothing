// Tileset della mappa (set "New Border"), su DUE layer:
//
//  • TERRENO (grass): erba uniforme che riempie tutta la mappa, sotto a tutto.
//    Tile grande (FRAME_TILE px) per non schiacciare la trama pixel-art: a 40px
//    l'erba si riduceva a puntini.
//
//  • CORNICE (frame): recinto decorativo a 9 pezzi (4 angoli + 4 lati) disposti
//    come un anello attorno alla mappa, spesso FRAME_MARGIN celle di gioco. Ogni
//    pezzo è una "scena" quadrata che include alberi/terra all'esterno ed erba
//    all'interno: l'erba interna combacia con `grass` perché è lo stesso asset,
//    resa alla stessa scala (FRAME_TILE su 782px sorgente).
//
// L'erba interna e la cornice condividono la scala, così si fondono senza stacco.
// I PNG ottimizzati stanno in `./tiles/` e li individua Vite a build-time.

import { FRAME_MARGIN, TILE_SIZE } from '@/shared/domain/types';

const MODULES = import.meta.glob('./tiles/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function url(name: string): string {
  return MODULES[`./tiles/${name}.png`] ?? '';
}

/** Lato di un tile di cornice/erba in px-schermo (= FRAME_MARGIN celle). */
export const FRAME_TILE = FRAME_MARGIN * TILE_SIZE; // 160

const GRASS = url('grass');

const FRAME = {
  cornerTL: url('corner_tl'),
  cornerTR: url('corner_tr'),
  cornerBL: url('corner_bl'),
  cornerBR: url('corner_br'),
  edgeTop: url('edge_top'),
  edgeBottom: url('edge_bottom'),
  edgeLeft: url('edge_left'),
  edgeRight: url('edge_right'),
};

/** True se gli asset dei tile sono presenti (altrimenti fallback CSS). */
export const HAS_TILES = GRASS !== '' && FRAME.cornerTL !== '';

export interface PlacedTile {
  key: string;
  url: string;
  left: number;
  top: number;
  size: number;
}

/** Tile di erba che riempiono l'intera mappa (sotto a cornice e oggetti). */
export function buildGround(mapW: number, mapH: number): PlacedTile[] {
  const tiles: PlacedTile[] = [];
  const cols = Math.ceil(mapW / FRAME_TILE);
  const rows = Math.ceil(mapH / FRAME_TILE);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      tiles.push({
        key: `g${gx},${gy}`,
        url: GRASS,
        left: gx * FRAME_TILE,
        top: gy * FRAME_TILE,
        size: FRAME_TILE,
      });
    }
  }
  return tiles;
}

/** Anello di cornice (angoli + lati) attorno al perimetro della mappa. */
export function buildFrame(mapW: number, mapH: number): PlacedTile[] {
  const tiles: PlacedTile[] = [];
  const t = FRAME_TILE;
  const push = (key: string, u: string, left: number, top: number) =>
    tiles.push({ key, url: u, left, top, size: t });

  // Angoli
  push('c-tl', FRAME.cornerTL, 0, 0);
  push('c-tr', FRAME.cornerTR, mapW - t, 0);
  push('c-bl', FRAME.cornerBL, 0, mapH - t);
  push('c-br', FRAME.cornerBR, mapW - t, mapH - t);

  // Lati orizzontali (tra i due angoli)
  for (let x = t; x < mapW - t; x += t) {
    push(`e-top${x}`, FRAME.edgeTop, x, 0);
    push(`e-bot${x}`, FRAME.edgeBottom, x, mapH - t);
  }
  // Lati verticali
  for (let y = t; y < mapH - t; y += t) {
    push(`e-left${y}`, FRAME.edgeLeft, 0, y);
    push(`e-right${y}`, FRAME.edgeRight, mapW - t, y);
  }

  return tiles;
}
