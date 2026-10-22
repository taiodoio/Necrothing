// Casa del Custode: un edificio unico, da dove il Custode parte ogni giorno.
// Dentro c'è il registro delle sepolture; fuori un cortile che si arricchisce
// comprando in Bottega (scheda «Casa») tetti e piccole aggiunte, sbloccati
// salendo di rango. L'orto rende fuochi fatui ogni giorno, come il bar degli
// zombie e l'orto dei cervelli.

export interface HouseRoof { id: string; label: string; cost: number; minRank: number; description: string }
export interface HousePart {
  id: string; label: string; cost: number; minRank: number; description: string;
  /** Il vantaggio nel gioco (attivo solo con l'aggiunta in vista): vedi HOUSE_PERKS. */
  perk: string;
}

/** Tetti (se ne vede uno alla volta): il primo c'è già. */
export const HOUSE_ROOFS: HouseRoof[] = [
  { id: 'slate', label: 'Tetto d’ardesia', cost: 0, minRank: 1, description: 'Lastre grigie e un po’ di muschio: il tetto di sempre.' },
  { id: 'moss', label: 'Tetto di muschio', cost: 12, minRank: 1, description: 'Così verde che i corvi ci fanno il nido.' },
  { id: 'tiles', label: 'Coppi rossi', cost: 25, minRank: 2, description: 'Coppi di terracotta, storti quanto basta.' },
  { id: 'thatch', label: 'Tetto di paglia', cost: 40, minRank: 3, description: 'Paglia intrecciata: profuma d’autunno.' },
];

/** Aggiunte del cortile e della casa (si accendono e spengono quando si vuole). */
export const HOUSE_PARTS: HousePart[] = [
  { id: 'lantern', label: 'Lanterna al portico', cost: 6, minRank: 1, description: 'Una luce calda per chi torna tardi.', perk: 'Di notte i fuochi fatui compaiono il 20% più spesso.' },
  { id: 'flowerbox', label: 'Fioriere alle finestre', cost: 8, minRank: 1, description: 'Gerani e qualche fiore che non dovrebbe esistere.', perk: 'Portare fiori a una tomba rende 2 fuochi fatui invece di 1.' },
  { id: 'toolbench', label: 'Banco degli attrezzi', cost: 8, minRank: 1, description: 'Pala, rastrello e martello appesi al muro, sempre a portata di mano.', perk: 'Riparare tombe e oggetti costa il 25% in meno.' },
  { id: 'smoke', label: 'Camino acceso', cost: 12, minRank: 2, description: 'Il fumo dice che c’è qualcuno in casa.', perk: 'Caldo e riposato, il Custode cammina il 10% più veloce.' },
  { id: 'picket', label: 'Staccionata del cortile', cost: 15, minRank: 2, description: 'Bassa e bianca, con il cancelletto.', perk: 'Gli zombie esitano: sporcano le tombe meno spesso (25% invece di 35%).' },
  { id: 'pumpkins', label: 'Zucche sul portico', cost: 10, minRank: 2, description: 'Intagliate dal Custode, una per stagione.', perk: 'Di notte i fantasmi passano il 25% più spesso (il 50% a ottobre).' },
  { id: 'garden', label: 'Giardinetto', cost: 30, minRank: 2, description: 'Fiori, un vialetto di pietre e una panchina.', perk: 'Le erbacce sulle tombe crescono il 25% più piano.' },
  { id: 'beehive', label: 'Arnia', cost: 20, minRank: 3, description: 'Le api fanno un miele scuro e misterioso.', perk: 'Le api impollinano: i fiori sulle tombe durano 5 giorni invece di 3.' },
  { id: 'fruit', label: 'Alberi da frutto', cost: 45, minRank: 3, description: 'Un melo e un pero storti, carichi di frutti.', perk: 'La frutta attira gatti e corvi: passano il 50% più spesso.' },
  { id: 'veggie', label: 'Orto', cost: 60, minRank: 3, description: 'Zucche, cavoli e rape.', perk: 'Ogni giorno rende 2–4 fuochi fatui da raccogliere (fino a 10).' },
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
