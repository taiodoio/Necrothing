// Preparazione delle testate animate (albero, casa) a gioco avviato, nei
// momenti in cui il telefono non ha altro da fare: aprendole, i modelli sono
// già pronti e resta solo da disegnare.

import { houseVariant } from '../game/house.ts';
import { placeableKey } from '../render/keys.ts';
import type { PVis } from '../render/types.ts';
import * as R from '../game/rules.ts';
import type { SaveData } from '../game/state.ts';
import { getModel } from '../render/modelCache.ts';
import { warmBackdrop } from './heroScene.ts';
import { treeModelFor } from './treeHeader.ts';

const idle = (fn: () => void) => {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 4000 }); else setTimeout(fn, 1500);
};

/** Un pezzo alla volta, ognuno nel suo momento libero. */
export function warmHeroes(s: SaveData) {
  idle(() => {
    warmBackdrop();
    idle(() => {
      const v: PVis = { type: 'keeper_house', variant: houseVariant(s.house), dirty: false, broken: false, lit: true, seed: 1 };
      getModel(placeableKey(v));
      if (R.memoryTree(s)) idle(() => { treeModelFor(s.entrusted.length); });
    });
  });
}
