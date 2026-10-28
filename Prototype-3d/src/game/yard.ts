// Il cortile del Custode: la mappa piccola del primo ingresso. Ci sono la Casa,
// la Bottega, una tomba trascurata, una lanterna spenta e due fuochi fatui,
// tutto a pochi passi e chiuso da uno steccato. È una partita a parte, costruita
// in memoria e mai salvata (il salvataggio resta quello vero: app/Game.ts): quel
// che si guadagna qui resta qui, e alla fine c'è il dono di benvenuto.
// Riprendendo a metà, il cortile si ricostruisce com'era a quel passo.

import { YARD_STEPS, type OnboardingState, type YardStep } from './onboarding.ts';
import { createNewGame, type Placed, type SaveData } from './state.ts';

/** La tomba da curare e la lanterna da accendere (id fissi: il tutorial le cerca). */
export const YARD_GRAVE = 'story-gym';
export const YARD_LANTERN = 'yard-lantern';
/** La lanterna comprata e posata (riprendendo dopo quel passo). */
const BOUGHT_LANTERN = 'yard-lantern-2';
/** Fuochi fatui all'inizio: con quelli raccolti bastano per la lanterna (5). */
export const YARD_WISPS = 6;
/** Il dono di benvenuto, all'arrivo nel cimitero vero: la lanterna comprata nel cortile e qualche fuoco fatuo. */
export const YARD_GIFT = { item: 'lantern', wisps: 20 } as const;

/** Il recinto del cortile: le celle da 15 a 29 per 15 a 28, con lo steccato sui lati est e sud. */
const EAST = 30, SOUTH = 29;

const after = (step: number, s: YardStep) => step > YARD_STEPS.indexOf(s);

/**
 * Il cortile per la partita `real`, al passo `step` (i passi già fatti hanno
 * già il loro effetto: la tomba pulita, la lanterna accesa…). Il Custode, la
 * sua Casa e le impostazioni sono quelli veri; l'onboarding è lo stesso
 * oggetto, così i passi fatti qui finiscono nel salvataggio vero.
 */
export function buildYard(real: SaveData, now: Date, onboarding: OnboardingState = real.onboarding): SaveData {
  const fresh = createNewGame(now, real.seed);
  const iso = now.toISOString();
  const step = onboarding.step;
  const P = (type: string, x: number, y: number, extra: Partial<Placed> = {}): Placed => ({
    id: `${type}-${x}-${y}`, type, x, y, rot: 0, variant: 0, lit: true, caredAt: iso, dirty: false, broken: false, createdAt: iso, ...extra,
  });
  const keep = new Set(['shop-17-17', 'bushes-26-17', 'half_pine-16-24']);
  const placeables: Placed[] = fresh.placeables.filter((p) => keep.has(p.id) || (p.type === 'path_stone' && ((p.x === 18 && p.y <= 22) || (p.y === 22 && p.x < EAST))));
  // la Casa vera (col suo tetto); senza, la mette ensureKeeperHouse accanto alla Bottega
  const house = real.placeables.find((p) => p.type === 'keeper_house');
  if (house) placeables.push(structuredClone(house));
  placeables.push(P('lantern', 23, 25, { id: YARD_LANTERN, lit: after(step, 'light') }));
  if (after(step, 'place')) placeables.push(P('lantern', 23, 20, { id: BOUGHT_LANTERN, lit: false }));
  // lo steccato: lungo il lato sud e il lato est (a nord e a ovest c'è già il recinto del cimitero)
  for (let x = 15; x <= EAST; x++) placeables.push(P('fence_wood', x, SOUTH));
  for (let y = 15; y < SOUTH; y++) placeables.push(P('fence_wood', EAST, y, { rot: 1 }));

  const grave = structuredClone(fresh.graves.find((g) => g.id === YARD_GRAVE)!);
  if (after(step, 'clean')) { grave.dirty = false; grave.weeds = false; grave.dirtySince = null; }
  if (after(step, 'flowers')) { grave.hasFlowers = true; grave.flowersAt = iso; }

  return {
    ...fresh,
    seed: real.seed,
    player: { ...structuredClone(real.player), wisps: YARD_WISPS },
    graves: [grave],
    placeables,
    inventory: after(step, 'shop') && !after(step, 'place') ? { lantern: 1 } : {},
    world: {
      ...fresh.world,
      looseWisps: [{ id: 'yard-w-1', x: 25, y: 20 }, { id: 'yard-w-2', x: 21, y: 27 }].slice(after(step, 'wisp') ? 1 : 0),
    },
    achievements: structuredClone(real.achievements),
    house: structuredClone(real.house),
    settings: real.settings,
    meta: real.meta,
    onboarding,
  };
}

/** Il dono di benvenuto, nella partita vera. */
export function applyYardGift(s: SaveData) {
  s.inventory[YARD_GIFT.item] = (s.inventory[YARD_GIFT.item] ?? 0) + 1;
  s.player.wisps += YARD_GIFT.wisps;
}
