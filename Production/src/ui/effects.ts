// Cosa fa un oggetto (la riga «Effetto» nelle schede della Bottega e degli
// oggetti posati): solo per chi cambia davvero qualcosa nel gioco. I numeri
// vengono dalle regole (game/balance.ts), così il testo non può sbagliarsi.
// La descrizione resta la frase ironica; l'effetto sta qui.

import { BAT, CUSTODE_SPEED, KEEPER_LAMP, MAUSOLEUM_PRESTIGE, SOUL_BELL, SPAWN_MODIFIERS } from '../game/balance.ts';
import { CATALOG } from '../game/catalog.ts';
import { currentLang, t } from '../i18n/index.ts';

/** Un numero con la virgola della lingua («2,6» in italiano, «2.6» in inglese). */
const num = (n: number) => new Intl.NumberFormat(currentLang()).format(n);

const EFFECTS: Record<string, () => string> = {
  mausoleum: () => t('item.effect.mausoleum', { pct: Math.round(SPAWN_MODIFIERS.mausoleumEventBonus * 100), n: MAUSOLEUM_PRESTIGE }),
  gravedigger_house: () => t('item.effect.gravedigger'),
  shrine: () => t('item.effect.priest'),
  hell_hole: () => t('item.effect.ghosts'),
  hell_crack: () => t('item.effect.ghosts'),
  open_grave: () => t('item.effect.zombies'),
  open_coffin: () => t('item.effect.zombies'),
  zombie_bar: () => t('item.effect.zombieBar'),
  brain_farm: () => t('item.effect.brainFarm'),
  witch_corner: () => t('item.effect.witchCorner'),
  keeper_lamp: () => t('item.effect.keeperLamp', { r: KEEPER_LAMP.radius }),
  soul_bell: () => t('item.effect.soulBell', { n: SOUL_BELL.ghosts }),
  memory_tree: () => t('item.effect.memoryTree'),
  pet_house: () => t('item.effect.pet'),
  vampire_crypt: () => t('item.effect.vampireCrypt', { s: BAT.seconds }),
  mystic_staff: () => t('item.effect.mysticStaff'),
  broom: () => t('item.effect.speed', { x: num(CUSTODE_SPEED.broom) }),
  bike: () => t('item.effect.speed', { x: num(CUSTODE_SPEED.bike) }),
  food_truck: () => t('item.effect.foodTruck'),
  ice_cream_cart: () => t('item.effect.iceCreamCart'),
  flower_kiosk: () => t('item.effect.flowerKiosk'),
  post_office: () => t('item.effect.postOffice'),
  // le case del villaggetto non fanno niente di speciale: ravvivano il cimitero
  crypt_ghost: () => t('item.effect.village'),
  crypt_florist: () => t('item.effect.village'),
  crypt_rectory: () => t('item.effect.village'),
  crypt_lamplighter: () => t('item.effect.village'),
  crypt_reaper: () => t('item.effect.village'),
  ghost_hunters: () => t('item.effect.ghostHunters', { n: Math.round(SPAWN_MODIFIERS.huntersBonus * 100) }),
};

/** L'effetto di un oggetto (le varianti hanno quello della loro famiglia), o null se non ne ha. */
export function itemEffect(type: string): string | null {
  const fn = EFFECTS[type] ?? EFFECTS[CATALOG[type]?.family ?? ''];
  return fn ? fn() : null;
}

/** Gli oggetti che hanno un effetto (per i test). */
export const EFFECT_TYPES = Object.keys(EFFECTS);
