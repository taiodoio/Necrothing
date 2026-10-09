// Catalogo degli oggetti piazzabili, derivato dal foglio
// "Asset for Necrothing con dimensioni Procreate.xlsm" e da Implementation_Note.
// Il footprint è l'ingombro A TERRA in celle (non la dimensione dello sprite
// 2D del vecchio concept top-down): in 3D l'altezza è libera.

import { DECAY } from './balance.ts';

export type PlaceableCategory = 'light' | 'decoration' | 'structure' | 'ambient' | 'npc';

export const CATEGORY_ORDER: PlaceableCategory[] = ['light', 'decoration', 'structure', 'ambient', 'npc'];

export const PLACEABLE_CATEGORY_LABELS: Record<PlaceableCategory, string> = {
  light: 'Luci',
  decoration: 'Decorazioni',
  structure: 'Costruzioni',
  ambient: 'Ambiente',
  npc: 'Presenze',
};

export interface PlaceableDef {
  id: string;
  label: string;
  category: PlaceableCategory;
  /** Ingombro a terra [larghezza X, profondità Z] in celle (rotazione 0). */
  footprint: [number, number];
  cost: number;
  minRank: number;
  /** Acquistabile/piazzabile una sola volta. */
  unique?: boolean;
  /** Non eliminabile né vendibile (solo spostabile): la Bottega. */
  permanent?: boolean;
  /** Si sporca (3 gg) e si rompe (7 gg) senza cure. */
  decays?: boolean;
  /** Ha una luce accendibile/spegnibile. */
  light?: boolean;
  /** Ruotabile a passi di 90°. */
  rotatable?: boolean;
  /** Il Custode può attraversarlo (sentieri, archi, erba). */
  walkable?: boolean;
  /** Numero di varianti estetiche (Excel "x 3", "x 2", animali). */
  variants?: number;
  variantLabels?: string[];
  /** Disponibile solo in un mese (0 = gennaio). */
  onlyMonth?: number;
  /** Testo personalizzabile (cartello). */
  editableText?: boolean;
  /** Descrizione ironica mostrata nel dettaglio. */
  description: string;
}

const defs: PlaceableDef[] = [
  // ── Luci ──────────────────────────────────────────────────────────────
  { id: 'lamp_post', label: 'Lampione', category: 'light', footprint: [1, 1], cost: 8, minRank: 1, decays: true, light: true, variants: 3, variantLabels: ['Ferro battuto', 'Doppio braccio', 'Gotico'], description: 'Illumina la strada a chi torna. O a chi non se n’è mai andato.' },
  { id: 'lantern', label: 'Lanterna', category: 'light', footprint: [1, 1], cost: 5, minRank: 1, decays: true, light: true, variants: 3, variantLabels: ['Da terra', 'Su paletto', 'Su pietra'], description: 'Una fiammella paziente, che non chiede nulla.' },
  { id: 'ghost_lantern', label: 'Lanterna fantasma', category: 'light', footprint: [1, 1], cost: 9, minRank: 2, decays: true, light: true, description: 'Brucia di una luce verde che nessuno ha acceso.' },
  { id: 'glow_pumpkin', label: 'Zucca luminosa', category: 'light', footprint: [1, 1], cost: 4, minRank: 1, decays: true, light: true, description: 'Sorride sempre. È questo che inquieta.' },
  { id: 'skull_candle', label: 'Teschio con candela', category: 'light', footprint: [1, 1], cost: 5, minRank: 2, decays: true, light: true, description: 'Un vecchio amico che ha trovato una nuova vocazione.' },
  { id: 'torch', label: 'Torcia in fiamme', category: 'light', footprint: [1, 1], cost: 6, minRank: 2, decays: true, light: true, description: 'Per i rituali, o per trovare le chiavi.' },
  { id: 'bonfire', label: 'Falò esoterico', category: 'light', footprint: [2, 2], cost: 14, minRank: 3, decays: true, light: true, description: 'Il fuoco crepita in una lingua che nessuno parla più.' },
  { id: 'candle_tree', label: 'Albero con candele', category: 'light', footprint: [3, 3], cost: 24, minRank: 4, decays: true, light: true, description: 'Un albero morto che ha deciso di fare luce sugli altri.' },

  // ── Decorazioni ───────────────────────────────────────────────────────
  { id: 'wreath', label: 'Corona di fiori', category: 'decoration', footprint: [1, 1], cost: 4, minRank: 1, description: 'Fiori intrecciati con cura e un filo di malinconia.' },
  { id: 'sign', label: 'Cartello', category: 'decoration', footprint: [1, 1], cost: 4, minRank: 1, editableText: true, description: 'Dice quello che vuoi tu. Ai morti va bene tutto.' },
  { id: 'angel_statue', label: 'Statua angelo', category: 'decoration', footprint: [2, 2], cost: 22, minRank: 3, description: 'Veglia con le ali raccolte. Non sbatte mai le palpebre.' },
  { id: 'votive_statue', label: 'Statua votiva', category: 'decoration', footprint: [2, 2], cost: 18, minRank: 2, description: 'Una santa incappucciata con le mani giunte e le candele ai piedi.' },
  { id: 'open_coffin', label: 'Bara aperta', category: 'decoration', footprint: [1, 2], cost: 10, minRank: 2, rotatable: true, description: 'Vuota. Per ora. Gli zombie la trovano molto accogliente.' },
  { id: 'bones', label: 'Ossa', category: 'decoration', footprint: [1, 1], cost: 3, minRank: 1, walkable: true, description: 'Qualcuno le ha perse. Qualcun altro le cerca.' },
  { id: 'vase', label: 'Vaso', category: 'decoration', footprint: [1, 1], cost: 3, minRank: 1, variants: 2, variantLabels: ['Anfora', 'Urna'], description: 'Terracotta antica. Dentro, solo polvere. Si spera.' },

  // ── Costruzioni ───────────────────────────────────────────────────────
  { id: 'shop', label: 'Bottega', category: 'structure', footprint: [3, 3], cost: 0, minRank: 1, unique: true, permanent: true, decays: true, light: true, description: 'Qui si compra tutto ciò che serve a un cimitero perbene. Anche ciò che non serve.' },
  { id: 'gravedigger_house', label: 'Casa del becchino', category: 'structure', footprint: [4, 3], cost: 60, minRank: 3, unique: true, decays: true, light: true, description: 'Con la casa vicina, il becchino passa più spesso. Porta la pala, e il malumore.' },
  { id: 'shrine', label: 'Santuario', category: 'structure', footprint: [3, 3], cost: 55, minRank: 3, unique: true, decays: true, light: true, description: 'Il prete si ferma volentieri a benedire: compare più spesso.' },
  { id: 'mausoleum', label: 'Mausoleo', category: 'structure', footprint: [3, 3], cost: 80, minRank: 4, unique: true, decays: true, light: true, description: 'Il cuore di pietra del cimitero: +10% di eventi soprannaturali.' },
  { id: 'open_grave', label: 'Tomba dissotterrata', category: 'structure', footprint: [2, 2], cost: 12, minRank: 2, decays: true, description: 'Una buca con la lapide di traverso. Attira gli zombie.' },
  { id: 'wall_stone', label: 'Muretto in pietra', category: 'structure', footprint: [1, 1], cost: 3, minRank: 1, decays: true, rotatable: true, description: 'Pietre a secco, muschio incluso.' },
  { id: 'fence_wood', label: 'Staccionata di legno', category: 'structure', footprint: [1, 1], cost: 2, minRank: 1, decays: true, rotatable: true, description: 'Assi storte che non trattengono nessuno.' },
  { id: 'fence_iron', label: 'Inferriata di ferro', category: 'structure', footprint: [1, 1], cost: 4, minRank: 2, decays: true, rotatable: true, description: 'Punte gotiche e ruggine elegante.' },
  { id: 'arch_stone', label: 'Arco in pietra', category: 'structure', footprint: [3, 1], cost: 20, minRank: 2, decays: true, rotatable: true, walkable: true, description: 'Si passa sotto. Si dice porti fortuna. Si dice.' },
  { id: 'arch_lights', label: 'Arco con luci', category: 'structure', footprint: [3, 1], cost: 28, minRank: 3, decays: true, light: true, rotatable: true, walkable: true, description: 'Un arco con due lanterne che dondolano anche senza vento.' },
  { id: 'arch_gothic', label: 'Arco gotico', category: 'structure', footprint: [3, 1], cost: 32, minRank: 3, decays: true, rotatable: true, walkable: true, description: 'Ogiva acuta e un teschio in chiave di volta.' },
  { id: 'path_stone', label: 'Sentiero in pietra', category: 'structure', footprint: [1, 1], cost: 1, minRank: 1, decays: true, walkable: true, description: 'Lastre irregolari consumate da passi lenti.' },
  { id: 'path_dirt', label: 'Sentiero in terra', category: 'structure', footprint: [1, 1], cost: 1, minRank: 1, decays: true, walkable: true, description: 'Terra battuta. Quando piove, terra e basta.' },
  { id: 'well', label: 'Pozzo', category: 'structure', footprint: [2, 2], cost: 25, minRank: 2, unique: true, decays: true, description: 'Se butti una moneta, qualcuno da sotto la restituisce.' },
  { id: 'fountain', label: 'Fontana', category: 'structure', footprint: [3, 3], cost: 40, minRank: 3, unique: true, decays: true, description: 'L’acqua è torbida e canticchia.' },
  { id: 'hell_hole', label: 'Buco infernale', category: 'structure', footprint: [2, 2], cost: 45, minRank: 4, unique: true, decays: true, light: true, description: 'Un bagliore rosso dal profondo. Aumenta le apparizioni.' },
  { id: 'pet_house', label: 'Casetta per animale', category: 'structure', footprint: [2, 2], cost: 20, minRank: 2, decays: true, variants: 5, variantLabels: ['Cane', 'Gatto', 'Coniglio', 'Papera', 'Corvo'], description: 'Ci vive un animaletto scheletro. A volte resta in tana.' },

  // ── Ambiente ──────────────────────────────────────────────────────────
  { id: 'pond', label: 'Lago con pesci morti', category: 'ambient', footprint: [4, 3], cost: 30, minRank: 2, description: 'Ninfee, canne e qualche pesce a pancia in su.' },
  { id: 'dead_tree', label: 'Albero morto', category: 'ambient', footprint: [2, 2], cost: 8, minRank: 1, description: 'Rami nodosi che grattano il cielo.' },
  { id: 'spectral_tree', label: 'Albero spettrale', category: 'ambient', footprint: [3, 3], cost: 26, minRank: 3, light: true, description: 'Le foglie brillano di un verde che non esiste di giorno.' },
  { id: 'half_pine', label: 'Pino mezzo morto', category: 'ambient', footprint: [2, 2], cost: 10, minRank: 1, description: 'Metà verde, metà rimpianto.' },
  { id: 'xmas_tree', label: 'Albero di Natale morto', category: 'ambient', footprint: [2, 2], cost: 15, minRank: 1, light: true, onlyMonth: 11, description: 'Solo a dicembre: rami secchi e lucine stanche.' },
  { id: 'toxic_puddle', label: 'Pozzanghera avvelenata', category: 'ambient', footprint: [2, 1], cost: 5, minRank: 1, walkable: true, rotatable: true, description: 'Gorgoglia. Non toccare. Non annusare.' },
  { id: 'monster_rocks', label: 'Rocce mostruose', category: 'ambient', footprint: [2, 2], cost: 9, minRank: 2, description: 'Hanno una faccia. Tutte le rocce hanno una faccia, se guardi bene.' },
  { id: 'flowerbed', label: 'Aiuola fiorita', category: 'ambient', footprint: [2, 2], cost: 6, minRank: 1, description: 'Un angolo di colore, un po’ appassito per coerenza.' },
  { id: 'poison_shrooms', label: 'Funghi velenosi', category: 'ambient', footprint: [1, 1], cost: 3, minRank: 1, walkable: true, description: 'Bellissimi. Letali. Come certe idee.' },
  { id: 'bushes', label: 'Cespugli', category: 'ambient', footprint: [2, 2], cost: 4, minRank: 1, description: 'Ci si nasconde il gatto nero. Sempre.' },
  { id: 'hillock', label: 'Collinetta', category: 'ambient', footprint: [2, 2], cost: 6, minRank: 1, description: 'Un piccolo rilievo erboso. Meglio non chiedersi cosa ci sia sotto.' },
  { id: 'tall_grass', label: 'Erba alta', category: 'ambient', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: 'Incolta per scelta artistica.' },
  { id: 'mud', label: 'Terreno fangoso', category: 'ambient', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: 'Risucchia gli stivali. E a volte restituisce cose.' },

  // ── Presenze (NPC piazzabili) ─────────────────────────────────────────
  { id: 'zombies_play', label: 'Zombie che giocano', category: 'npc', footprint: [2, 2], cost: 30, minRank: 3, walkable: true, description: 'Giocano a carte. Barano entrambi.' },
  { id: 'zombies_dance', label: 'Zombie che ballano', category: 'npc', footprint: [2, 2], cost: 30, minRank: 3, walkable: true, description: 'Il ritmo ce l’hanno ancora nelle ossa.' },
  { id: 'zombie_walker', label: 'Zombie errante', category: 'npc', footprint: [1, 1], cost: 26, minRank: 3, walkable: true, description: 'Passeggia senza meta, come la domenica.' },
  { id: 'ghosts_roam', label: 'Fantasmi erranti', category: 'npc', footprint: [1, 1], cost: 28, minRank: 3, walkable: true, description: 'Girano in tondo attraverso tutto, lapidi comprese.' },
  { id: 'ghosts_ball', label: 'Fantasmi a palla', category: 'npc', footprint: [2, 2], cost: 34, minRank: 4, walkable: true, description: 'Giocano a palla con un teschio. Il teschio si diverte meno.' },
  { id: 'skeleton_pet', label: 'Animale scheletro', category: 'npc', footprint: [1, 1], cost: 18, minRank: 2, walkable: true, variants: 5, variantLabels: ['Cane', 'Gatto', 'Coniglio', 'Papera', 'Corvo'], description: 'Fedele oltre la morte. Riporta ancora i bastoni.' },
];

export const CATALOG: Record<string, PlaceableDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const CATALOG_LIST: readonly PlaceableDef[] = defs;

export function placeableDef(type: string): PlaceableDef {
  const def = CATALOG[type];
  if (!def) throw new Error(`Oggetto sconosciuto: ${type}`);
  return def;
}

/** Ingombro effettivo considerando la rotazione (0..3 quarti di giro). */
export function rotatedFootprint(type: string, rot: number): [number, number] {
  const [w, d] = placeableDef(type).footprint;
  return rot % 2 === 1 ? [d, w] : [w, d];
}

export function isSeasonallyAvailable(def: PlaceableDef, month0: number): boolean {
  return def.onlyMonth === undefined || def.onlyMonth === month0;
}

export function repairCost(def: PlaceableDef): number {
  return Math.max(2, Math.round(def.cost * DECAY.placeableRepairFraction));
}

/** Oggetti che contano come "tombe dissotterrate" per lo spawn degli zombie. */
export const ZOMBIE_ATTRACTORS = new Set(['open_grave', 'open_coffin']);
