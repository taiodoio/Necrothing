// I consigli al momento giusto: quello che il cortile non mostra si dice la
// prima volta che succede, con una notifica del Custode, una volta sola (quali
// sono già stati dati sta nel salvataggio, in `onboarding.tips`). Qui solo le
// condizioni; quando mostrarli (giocatore libero, non troppo spesso) lo decide
// ui/onboarding.ts.

import { isPetHouse } from './catalog.ts';
import type { TipId } from './onboarding.ts';
import { memoryTree, personalGraves } from './rules.ts';
import type { SaveData } from './state.ts';

export interface Tip {
  id: TipId;
  /** La tomba o l'oggetto di cui si parla (il consiglio ha «Mostrami»). */
  at?: string;
}

/** Il prossimo consiglio da dare, se c'è (in ordine di urgenza: prima le cose rotte). */
export function nextTip(s: SaveData): Tip | null {
  const seen = new Set(s.onboarding.tips);
  if (!seen.has('graveBroken')) { const g = s.graves.find((x) => x.broken); if (g) return { id: 'graveBroken', at: g.id }; }
  if (!seen.has('itemBroken')) { const p = s.placeables.find((x) => x.broken); if (p) return { id: 'itemBroken', at: p.id }; }
  if (!seen.has('pet')) { const p = s.placeables.find((x) => isPetHouse(x.type)); if (p) return { id: 'pet', at: p.id }; }
  if (!seen.has('memoryTree')) { const p = memoryTree(s); if (p) return { id: 'memoryTree', at: p.id }; }
  if (!seen.has('photo') && personalGraves(s) > 0 && s.player.counters.photosTaken === 0) return { id: 'photo' };
  return null;
}

/** Il consiglio è stato dato: non torna più. */
export function markTip(s: SaveData, id: TipId) {
  if (!s.onboarding.tips.includes(id)) s.onboarding.tips.push(id);
}
