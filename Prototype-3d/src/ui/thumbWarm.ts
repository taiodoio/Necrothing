// Miniature (Bottega, inventario, scelta della lapide) salvate sul telefono:
// all'avvio si rimettono in cache quelle già disegnate, quelle nuove si
// salvano a gruppi; dopo il caricamento, nei momenti liberi, si disegnano
// in anticipo quelle che mancano. Dal secondo avvio la Bottega è già pronta.

import { thumbStore } from '../app/persistence.ts';
import { CATALOG_LIST } from '../game/catalog.ts';
import { GRAVE_TYPES } from '../game/graves.ts';
import * as R from '../game/rules.ts';
import type { SaveData } from '../game/state.ts';
import { graveThumb, onNewThumb, placeableThumb, seedThumbs } from './thumbs.ts';

let pending: Array<[string, string]> = [];
let timer = 0;
const flush = () => {
  timer = 0;
  const batch = pending;
  pending = [];
  void thumbStore.save(batch).catch(() => undefined);
};

/** Rimette in cache le miniature salvate e da qui in poi salva quelle nuove. */
export async function restoreThumbs() {
  try { seedThumbs(await thumbStore.load()); } catch { /* senza IndexedDB si disegnano quando servono */ }
  onNewThumb((key, url) => {
    pending.push([key, url]);
    if (!timer) timer = window.setTimeout(flush, 2500);
  });
}

const idle = (fn: () => void) => {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 2000 }); else setTimeout(fn, 120);
};

/** Disegna in anticipo, una per momento libero, le miniature che mancano: prima ciò che si ha e si può comprare. */
export function warmThumbs(s: SaveData) {
  const style = s.settings.style;
  const now = new Date();
  const first = CATALOG_LIST.filter((d) => s.inventory[d.id] || ['ok', 'funds'].includes(R.shopAvailability(s, d.id, now)));
  const queue: Array<() => void> = [
    ...GRAVE_TYPES.map((gt) => () => { graveThumb(gt, style); }),
    ...[...new Set([...first, ...CATALOG_LIST])].map((d) => () => { placeableThumb(d.id, style); }),
  ];
  const step = () => {
    const job = queue.shift();
    if (!job) return;
    try { job(); } catch { /* si riprova quando serve */ }
    idle(step);
  };
  idle(step);
}
