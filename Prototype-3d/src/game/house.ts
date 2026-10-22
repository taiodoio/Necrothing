// Casa del Custode: un edificio unico, da dove il Custode parte ogni giorno.
// Dentro c'è il registro delle sepolture; fuori un cortile che si arricchisce
// comprando in Bottega (scheda «Casa») tetti e piccole aggiunte, sbloccati
// salendo di rango. L'orto rende fuochi fatui ogni giorno, come il bar degli
// zombie e l'orto dei cervelli.

export interface HouseRoof { id: string; label: string; cost: number; minRank: number; description: string }
export interface HousePart { id: string; label: string; cost: number; minRank: number; description: string }

/** Tetti (se ne vede uno alla volta): il primo c'è già. */
export const HOUSE_ROOFS: HouseRoof[] = [
  { id: 'slate', label: 'Tetto d’ardesia', cost: 0, minRank: 1, description: 'Lastre grigie e un po’ di muschio: il tetto di sempre.' },
  { id: 'moss', label: 'Tetto di muschio', cost: 12, minRank: 1, description: 'Così verde che i corvi ci fanno il nido.' },
  { id: 'tiles', label: 'Coppi rossi', cost: 25, minRank: 2, description: 'Coppi di terracotta, storti quanto basta.' },
  { id: 'thatch', label: 'Tetto di paglia', cost: 40, minRank: 3, description: 'Paglia intrecciata: profuma d’autunno.' },
];

/** Aggiunte del cortile e della casa (si accendono e spengono quando si vuole). */
export const HOUSE_PARTS: HousePart[] = [
  { id: 'lantern', label: 'Lanterna al portico', cost: 6, minRank: 1, description: 'Una luce calda per chi torna tardi.' },
  { id: 'flowerbox', label: 'Fioriere alle finestre', cost: 8, minRank: 1, description: 'Gerani e qualche fiore che non dovrebbe esistere.' },
  { id: 'mailbox', label: 'Cassetta delle lettere', cost: 5, minRank: 1, description: 'Ci arrivano solo condoglianze.' },
  { id: 'smoke', label: 'Camino acceso', cost: 12, minRank: 2, description: 'Il fumo dice che c’è qualcuno in casa.' },
  { id: 'picket', label: 'Staccionata del cortile', cost: 15, minRank: 2, description: 'Bassa e bianca, con il cancelletto.' },
  { id: 'pumpkins', label: 'Zucche sul portico', cost: 10, minRank: 2, description: 'Intagliate dal Custode, una per stagione.' },
  { id: 'garden', label: 'Giardinetto', cost: 30, minRank: 2, description: 'Fiori, un vialetto di pietre e una panchina.' },
  { id: 'beehive', label: 'Arnia', cost: 20, minRank: 3, description: 'Le api fanno un miele scuro e misterioso.' },
  { id: 'fruit', label: 'Alberi da frutto', cost: 45, minRank: 3, description: 'Un melo e un pero storti, carichi di frutti.' },
  { id: 'veggie', label: 'Orto', cost: 60, minRank: 3, description: 'Zucche, cavoli e rape: ogni giorno rende fuochi fatui da raccogliere.' },
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
