// Casa del Custode: un edificio unico, da dove il Custode parte ogni giorno.
// Dentro c'è il registro delle sepolture; fuori un cortile che si arricchisce
// comprando in Bottega (scheda «Casa») tetti e piccole aggiunte, sbloccati
// salendo di rango. L'orto rende fuochi fatui ogni giorno, come il bar degli
// zombie e l'orto dei cervelli.

import { t } from '../i18n/index.ts';
import type { Access } from '../config/distribution.ts';

/** `access`: accesso commerciale (Demo/Full), diverso dallo sblocco col rango. */
export interface HouseRoof { id: string; label: string; cost: number; minRank: number; access: Access; description: string }
export interface HousePart {
  id: string; label: string; cost: number; minRank: number; access: Access; description: string;
  /** Il vantaggio nel gioco (attivo solo con l'aggiunta in vista): vedi HOUSE_PERKS. */
  perk: string;
}

/** Tetti (se ne vede uno alla volta): il primo c'è già. */
export const HOUSE_ROOFS: HouseRoof[] = [
  { id: 'slate', label: t('house.roof.slate.label'), cost: 0, minRank: 1, access: 'demo', description: t('house.roof.slate.desc') },
  { id: 'moss', label: t('house.roof.moss.label'), cost: 12, minRank: 1, access: 'demo', description: t('house.roof.moss.desc') },
  { id: 'tiles', label: t('house.roof.tiles.label'), cost: 25, minRank: 2, access: 'demo', description: t('house.roof.tiles.desc') },
  { id: 'thatch', label: t('house.roof.thatch.label'), cost: 40, minRank: 3, access: 'full', description: t('house.roof.thatch.desc') },
];

/** Aggiunte del cortile e della casa (si accendono e spengono quando si vuole). */
export const HOUSE_PARTS: HousePart[] = [
  { id: 'lantern', label: t('house.part.lantern.label'), cost: 6, minRank: 1, access: 'demo', description: t('house.part.lantern.desc'), perk: t('house.part.lantern.perk') },
  { id: 'flowerbox', label: t('house.part.flowerbox.label'), cost: 8, minRank: 1, access: 'demo', description: t('house.part.flowerbox.desc'), perk: t('house.part.flowerbox.perk') },
  { id: 'toolbench', label: t('house.part.toolbench.label'), cost: 8, minRank: 1, access: 'demo', description: t('house.part.toolbench.desc'), perk: t('house.part.toolbench.perk') },
  { id: 'smoke', label: t('house.part.smoke.label'), cost: 12, minRank: 2, access: 'demo', description: t('house.part.smoke.desc'), perk: t('house.part.smoke.perk') },
  { id: 'picket', label: t('house.part.picket.label'), cost: 15, minRank: 2, access: 'demo', description: t('house.part.picket.desc'), perk: t('house.part.picket.perk') },
  { id: 'pumpkins', label: t('house.part.pumpkins.label'), cost: 10, minRank: 2, access: 'demo', description: t('house.part.pumpkins.desc'), perk: t('house.part.pumpkins.perk') },
  { id: 'garden', label: t('house.part.garden.label'), cost: 30, minRank: 2, access: 'demo', description: t('house.part.garden.desc'), perk: t('house.part.garden.perk') },
  { id: 'beehive', label: t('house.part.beehive.label'), cost: 20, minRank: 3, access: 'full', description: t('house.part.beehive.desc'), perk: t('house.part.beehive.perk') },
  { id: 'fruit', label: t('house.part.fruit.label'), cost: 45, minRank: 3, access: 'full', description: t('house.part.fruit.desc'), perk: t('house.part.fruit.perk') },
  { id: 'veggie', label: t('house.part.veggie.label'), cost: 60, minRank: 3, access: 'full', description: t('house.part.veggie.desc'), perk: t('house.part.veggie.perk') },
];

export interface HouseState {
  /** Tetti e aggiunte comprati. */
  owned: string[];
  /** Tetto in vista. */
  roof: string;
  /** Aggiunte comprate ma tolte (si rimettono quando si vuole). */
  hidden: string[];
}

export const defaultHouse = (): HouseState => ({ owned: ['slate'], roof: 'slate', hidden: [] });

export const houseRoof = (id: string) => HOUSE_ROOFS.find((r) => r.id === id);
export const housePart = (id: string) => HOUSE_PARTS.find((p) => p.id === id);
export const houseItem = (id: string): HouseRoof | HousePart | undefined => houseRoof(id) ?? housePart(id);

/** Aggiunte in vista (comprate e non tolte). */
export function houseShown(h: HouseState): string[] {
  return HOUSE_PARTS.map((p) => p.id).filter((id) => h.owned.includes(id) && !h.hidden.includes(id));
}

/** L'orto rende solo se c'è (comprato e in vista). */
export const houseHasVeggie = (h: HouseState) => houseShown(h).includes('veggie');

/**
 * Il vantaggio di un'aggiunta vale solo se la casa c'è e l'aggiunta è in
 * vista: tolta per gusto, smette di aiutare.
 */
export function housePerk(s: { house?: HouseState; placeables: ReadonlyArray<{ type: string }> }, id: string): boolean {
  return !!s.house && houseShown(s.house).includes(id) && s.placeables.some((p) => p.type === 'keeper_house');
}

/**
 * Variante del modello: i due bit bassi sono il tetto, gli altri le aggiunte
 * in vista (un bit per aggiunta, nell'ordine di HOUSE_PARTS).
 */
export function houseVariant(h: HouseState): number {
  const roof = Math.max(0, HOUSE_ROOFS.findIndex((r) => r.id === h.roof));
  let mask = 0;
  HOUSE_PARTS.forEach((p, i) => { if (h.owned.includes(p.id) && !h.hidden.includes(p.id)) mask |= 1 << i; });
  return roof | (mask << 2);
}

/** Dalla variante al tetto e alle aggiunte (per il modello). */
export function decodeHouseVariant(variant: number): { roof: string; parts: Set<string> } {
  const roof = HOUSE_ROOFS[variant & 3]?.id ?? 'slate';
  const parts = new Set(HOUSE_PARTS.filter((_, i) => variant & (1 << (i + 2))).map((p) => p.id));
  return { roof, parts };
}
