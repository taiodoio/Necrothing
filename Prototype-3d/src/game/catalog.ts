// Catalogo degli oggetti piazzabili, derivato dal foglio
// "Asset for Necrothing con dimensioni Procreate.xlsm" e da Implementation_Note.
// Il footprint è l'ingombro A TERRA in celle (non la dimensione dello sprite
// 2D del vecchio concept top-down): in 3D l'altezza è libera.

import { DECAY } from './balance.ts';

export type PlaceableCategory = 'light' | 'decoration' | 'structure' | 'ambient' | 'npc' | 'extra';

export const CATEGORY_ORDER: PlaceableCategory[] = ['light', 'decoration', 'structure', 'ambient', 'npc', 'extra'];

export const PLACEABLE_CATEGORY_LABELS: Record<PlaceableCategory, string> = {
  light: 'Luci',
  decoration: 'Decorazioni',
  structure: 'Costruzioni',
  ambient: 'Ambiente',
  npc: 'Presenze',
  extra: 'Extra',
};

/** Contatori del giocatore che sbloccano oggetti speciali. */
export type FeatCounter = 'lightsRepaired' | 'wispsEarned' | 'potionsSold';

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
  /**
   * Senza cure prima o poi si sporca e poi si rompe (tempi casuali, vedi DECAY).
   * Non per i pezzi che si piazzano in serie (sentieri, muretti, staccionate,
   * inferriate): sarebbero troppi da pulire.
   */
  decays?: boolean;
  /** Ha una luce accendibile/spegnibile. */
  light?: boolean;
  /** Ruotabile a passi di 90°. */
  rotatable?: boolean;
  /** Il Custode può attraversarlo (sentieri, archi, erba). */
  walkable?: boolean;
  /**
   * Variante di un altro oggetto (una voce a sé in Bottega, con prezzo e rango
   * propri): usa il modello di `family` nella variante `look`.
   */
  family?: string;
  look?: number;
  /** Disponibile solo in un mese (0 = gennaio). */
  onlyMonth?: number;
  /**
   * Stagionale: si compra solo tra queste date (mese 0-11, giorno), estremi
   * compresi, anche a cavallo d'anno. Comprato, resta per sempre.
   */
  season?: { from: [number, number]; to: [number, number]; label: string };
  /** Si sblocca con un traguardo (oltre al rango): un contatore del giocatore che arriva a `goal`. */
  feat?: { counter: FeatCounter; goal: number; label: string };
  /** Testo personalizzabile (cartello). */
  editableText?: boolean;
  /** Si sblocca solo con almeno queste tombe nel cimitero (contando anche quelle già affidate all'albero). */
  minGraves?: number;
  /** Descrizione ironica mostrata nel dettaglio. */
  description: string;
}

const defs: PlaceableDef[] = [
  // ── Luci ──────────────────────────────────────────────────────────────
  { id: 'lamp_post', label: 'Lampione', category: 'light', footprint: [1, 1], cost: 8, minRank: 1, decays: true, light: true, description: 'Illumina la strada a chi torna. O a chi non se n’è mai andato.' },
  { id: 'lamp_post_double', label: 'Lampione a doppio braccio', category: 'light', footprint: [1, 1], cost: 12, minRank: 2, decays: true, light: true, family: 'lamp_post', look: 1, description: 'Due lanterne invece di una: per i viali dove si torna in compagnia.' },
  { id: 'lamp_post_gothic', label: 'Lampione gotico', category: 'light', footprint: [1, 1], cost: 16, minRank: 3, decays: true, light: true, family: 'lamp_post', look: 2, description: 'Guglie e ferro lavorato: fa luce e un po’ di soggezione.' },
  { id: 'lantern', label: 'Lanterna da terra', category: 'light', footprint: [1, 1], cost: 5, minRank: 1, decays: true, light: true, description: 'Una fiammella paziente, che non chiede nulla.' },
  { id: 'lantern_pole', label: 'Lanterna su paletto', category: 'light', footprint: [1, 1], cost: 7, minRank: 1, decays: true, light: true, family: 'lantern', look: 1, description: 'Un po’ più in alto, per vedere chi arriva da lontano.' },
  { id: 'lantern_stone', label: 'Lanterna su pietra', category: 'light', footprint: [1, 1], cost: 9, minRank: 2, decays: true, light: true, family: 'lantern', look: 2, description: 'Appoggiata su un sasso che nessuno ricorda di aver portato.' },
  { id: 'ghost_lantern', label: 'Lanterna fantasma', category: 'light', footprint: [1, 1], cost: 9, minRank: 2, decays: true, light: true, description: 'Brucia di una luce verde che nessuno ha acceso.' },
  { id: 'glow_pumpkin', label: 'Zucca luminosa', category: 'light', footprint: [1, 1], cost: 4, minRank: 1, decays: true, light: true, description: 'Sorride sempre. È questo che inquieta.' },
  { id: 'skull_candle', label: 'Teschio con candela', category: 'light', footprint: [1, 1], cost: 5, minRank: 2, decays: true, light: true, description: 'Un vecchio amico che ha trovato una nuova vocazione.' },
  { id: 'torch', label: 'Torcia in fiamme', category: 'light', footprint: [1, 1], cost: 6, minRank: 2, decays: true, light: true, description: 'Per i rituali, o per trovare le chiavi.' },
  { id: 'bonfire', label: 'Falò esoterico', category: 'light', footprint: [2, 2], cost: 14, minRank: 3, decays: true, light: true, description: 'Il fuoco crepita in una lingua che nessuno parla più.' },
  { id: 'candelabra', label: 'Candelabro gotico', category: 'light', footprint: [1, 1], cost: 14, minRank: 2, decays: true, light: true, description: 'Cinque candele in ferro battuto. La cera cola sempre verso chi passa.' },
  { id: 'spirit_lantern', label: 'Lanterna degli spiriti', category: 'light', footprint: [1, 1], cost: 18, minRank: 3, decays: true, light: true, description: 'Una colonnina di pietra con una fiamma azzurra. I glifi si accendono da soli.' },
  { id: 'skull_garland', label: 'Ghirlanda di teschi luminosi', category: 'light', footprint: [3, 1], cost: 26, minRank: 3, decays: true, light: true, rotatable: true, walkable: true, description: 'Teschietti accesi appesi tra due pali: da tendere sopra i sentieri.' },
  { id: 'keeper_lamp', label: 'Lampione del Custode', category: 'light', footprint: [1, 1], cost: 30, minRank: 3, unique: true, decays: true, light: true, feat: { counter: 'lightsRepaired', goal: 25, label: 'Ripara 25 luci' }, description: 'Il suo bastone piantato a terra, la sua lanterna, il suo cappello. Le luci qui attorno non si rompono mai.' },
  { id: 'candle_tree', label: 'Albero con candele', category: 'light', footprint: [3, 3], cost: 24, minRank: 4, decays: true, light: true, description: 'Un albero morto che ha deciso di fare luce sugli altri.' },

  // ── Decorazioni ───────────────────────────────────────────────────────
  { id: 'wreath', label: 'Corona di fiori', category: 'decoration', footprint: [1, 1], cost: 4, minRank: 1, description: 'Fiori intrecciati con cura e un filo di malinconia.' },
  { id: 'sign', label: 'Cartello', category: 'decoration', footprint: [1, 1], cost: 4, minRank: 1, editableText: true, description: 'Dice quello che vuoi tu. Ai morti va bene tutto.' },
  { id: 'angel_statue', label: 'Statua angelo', category: 'decoration', footprint: [2, 2], cost: 22, minRank: 3, description: 'Veglia con le ali raccolte. Non sbatte mai le palpebre.' },
  { id: 'votive_statue', label: 'Statua votiva', category: 'decoration', footprint: [2, 2], cost: 18, minRank: 2, description: 'Una santa incappucciata con le mani giunte e le candele ai piedi.' },
  { id: 'open_coffin', label: 'Bara aperta', category: 'decoration', footprint: [1, 2], cost: 10, minRank: 2, rotatable: true, description: 'Vuota. Per ora. Gli zombie la trovano molto accogliente.' },
  { id: 'bones', label: 'Ossa', category: 'decoration', footprint: [1, 1], cost: 3, minRank: 1, walkable: true, description: 'Qualcuno le ha perse. Qualcun altro le cerca.' },
  { id: 'vase', label: 'Anfora', category: 'decoration', footprint: [1, 1], cost: 3, minRank: 1, description: 'Terracotta antica. Dentro, solo polvere. Si spera.' },
  { id: 'book_pile', label: 'Pila di libri ammuffiti', category: 'decoration', footprint: [1, 1], cost: 6, minRank: 1, description: 'Epitaffi mai scritti e romanzi mai finiti. Odorano di cantina.' },
  { id: 'stuffed_crow', label: 'Corvo impagliato', category: 'decoration', footprint: [1, 1], cost: 10, minRank: 2, description: 'Non vola più. Ti segue con lo sguardo lo stesso.' },
  { id: 'gargoyle', label: 'Gargoyle', category: 'decoration', footprint: [1, 1], cost: 24, minRank: 3, description: 'Accovacciato sul suo pilastro. Di notte gli occhi si accendono.' },
  { id: 'reaper_statue', label: 'Mietitore di pietra', category: 'decoration', footprint: [2, 2], cost: 50, minRank: 4, description: 'Incappucciato, con la falce. Sotto il cappuccio, di notte, qualcosa ti guarda.' },
  { id: 'keeper_statue', label: 'Statua del Custode', category: 'decoration', footprint: [2, 2], cost: 100, minRank: 5, unique: true, description: 'Tu, in pietra, per sempre. Cambia aspetto e la statua cambia con te.' },
  { id: 'urn', label: 'Urna', category: 'decoration', footprint: [1, 1], cost: 5, minRank: 2, family: 'vase', look: 1, description: 'Col coperchio ben chiuso. Meglio non chiedere.' },

  // ── Costruzioni ───────────────────────────────────────────────────────
  { id: 'shop', label: 'Bottega', category: 'structure', footprint: [3, 3], cost: 0, minRank: 1, unique: true, permanent: true, decays: true, light: true, description: 'Qui si compra tutto ciò che serve a un cimitero perbene. Anche ciò che non serve.' },
  { id: 'gravedigger_house', label: 'Casa del becchino', category: 'structure', footprint: [4, 3], cost: 60, minRank: 3, unique: true, decays: true, light: true, description: 'Con la casa vicina, il becchino passa più spesso. Porta la pala, e il malumore.' },
  { id: 'shrine', label: 'Santuario', category: 'structure', footprint: [3, 3], cost: 55, minRank: 3, unique: true, decays: true, light: true, description: 'Il prete si ferma volentieri a benedire: compare più spesso.' },
  { id: 'zombie_bar', label: 'Bar degli zombie', category: 'structure', footprint: [3, 2], cost: 45, minRank: 3, unique: true, decays: true, light: true, description: 'Pozioni che fanno la schiuma e una bara per frigo. Attira gli zombie e incassa qualche fuoco fatuo al giorno.' },
  { id: 'brain_farm', label: 'Orto dei cervelli', category: 'structure', footprint: [4, 3], cost: 35, minRank: 3, unique: true, decays: true, light: true, description: 'Uno zombie coltiva cervelli freschi e li vende al banco. Incassa qualche fuoco fatuo al giorno.' },
  { id: 'mausoleum', label: 'Mausoleo', category: 'structure', footprint: [3, 3], cost: 80, minRank: 4, unique: true, decays: true, light: true, description: 'Il cuore di pietra del cimitero: +10% di eventi soprannaturali.' },
  { id: 'open_grave', label: 'Tomba dissotterrata', category: 'structure', footprint: [2, 2], cost: 12, minRank: 2, decays: true, description: 'Una buca con la lapide di traverso. Attira gli zombie.' },
  { id: 'wall_stone', label: 'Muretto in pietra', category: 'structure', footprint: [1, 1], cost: 3, minRank: 1, rotatable: true, description: 'Pietre a secco, muschio incluso.' },
  { id: 'fence_wood', label: 'Staccionata di legno', category: 'structure', footprint: [1, 1], cost: 2, minRank: 1, rotatable: true, description: 'Assi storte che non trattengono nessuno.' },
  { id: 'fence_iron', label: 'Inferriata di ferro', category: 'structure', footprint: [1, 1], cost: 4, minRank: 2, rotatable: true, description: 'Punte gotiche e ruggine elegante.' },
  { id: 'arch_stone', label: 'Arco in pietra', category: 'structure', footprint: [3, 1], cost: 20, minRank: 2, decays: true, rotatable: true, walkable: true, description: 'Si passa sotto. Si dice porti fortuna. Si dice.' },
  { id: 'arch_lights', label: 'Arco con luci', category: 'structure', footprint: [3, 1], cost: 28, minRank: 3, decays: true, light: true, rotatable: true, walkable: true, description: 'Un arco con due lanterne che dondolano anche senza vento.' },
  { id: 'arch_gothic', label: 'Arco gotico', category: 'structure', footprint: [3, 1], cost: 32, minRank: 3, decays: true, rotatable: true, walkable: true, description: 'Ogiva acuta e un teschio in chiave di volta.' },
  { id: 'path_stone', label: 'Sentiero in pietra', category: 'structure', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: 'Lastre irregolari consumate da passi lenti.' },
  { id: 'path_dirt', label: 'Sentiero in terra', category: 'structure', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: 'Terra battuta. Quando piove, terra e basta.' },
  { id: 'well', label: 'Pozzo', category: 'structure', footprint: [2, 2], cost: 25, minRank: 2, unique: true, decays: true, description: 'Se butti una moneta, qualcuno da sotto la restituisce.' },
  { id: 'fountain', label: 'Fontana', category: 'structure', footprint: [3, 3], cost: 40, minRank: 3, unique: true, decays: true, description: 'L’acqua è torbida e canticchia.' },
  { id: 'hell_hole', label: 'Buco infernale', category: 'structure', footprint: [2, 2], cost: 45, minRank: 4, unique: true, decays: true, light: true, description: 'Un bagliore rosso dal profondo. Aumenta le apparizioni.' },
  { id: 'memory_tree', label: 'Albero dei ricordi', category: 'structure', footprint: [5, 5], cost: 150, minRank: 1, unique: true, minGraves: 20, description: 'Un albero antico che accoglie ciò che non vuoi più tenere in una tomba. Affidagli una sepoltura: la terra se la prende, lo spazio si libera, il ricordo resta appeso ai suoi rami.' },
  { id: 'soul_bell', label: 'Campana delle anime', category: 'structure', footprint: [2, 2], cost: 60, minRank: 4, unique: true, decays: true, light: true, description: 'Suonala una volta al giorno: le anime del cimitero accorrono a salutarti.' },
  { id: 'soul_gazebo', label: 'Gazebo delle anime', category: 'structure', footprint: [4, 4], cost: 70, minRank: 4, unique: true, decays: true, light: true, description: 'Rotondo, con la cupola a scaglie e le lanterne verdi. Di notte i fantasmi ci vengono a ballare.' },
  { id: 'pet_house', label: 'Cuccia del cane', category: 'structure', footprint: [2, 2], cost: 20, minRank: 2, decays: true, description: 'Ci vive un cagnolino scheletro: gira libero per il cimitero e torna a dormire in tana. Toccalo per farti raggiungere, liberarlo, mandarlo a cuccia, accarezzarlo o lanciargli l’osso.' },
  { id: 'pet_house_cat', label: 'Cuccia del gatto', category: 'structure', footprint: [2, 2], cost: 22, minRank: 2, decays: true, family: 'pet_house', look: 1, description: 'Ci vive un gatto scheletro: fa le fusa, ma solo quando gli pare. Toccalo per farti raggiungere, liberarlo, mandarlo a cuccia, accarezzarlo o lanciargli l’osso.' },
  { id: 'pet_house_rabbit', label: 'Casetta del coniglio', category: 'structure', footprint: [2, 2], cost: 24, minRank: 3, decays: true, family: 'pet_house', look: 2, description: 'Ci vive un coniglietto scheletro: saltella tra le lapidi. Toccalo per farti raggiungere, liberarlo, mandarlo a cuccia, accarezzarlo o lanciargli l’osso.' },
  { id: 'pet_house_duck', label: 'Casetta della papera', category: 'structure', footprint: [2, 2], cost: 24, minRank: 3, decays: true, family: 'pet_house', look: 3, description: 'Ci vive una papera scheletro: starnazza, e nessuno sa con cosa. Toccalo per farti raggiungere, liberarlo, mandarlo a cuccia, accarezzarlo o lanciargli l’osso.' },
  { id: 'pet_house_crow', label: 'Casetta del corvo', category: 'structure', footprint: [2, 2], cost: 28, minRank: 3, decays: true, family: 'pet_house', look: 4, description: 'Ci vive un corvo scheletro: porta notizie dall’aldilà, quasi sempre sbagliate. Toccalo per farti raggiungere, liberarlo, mandarlo a cuccia, accarezzarlo o lanciargli l’osso.' },

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
  { id: 'cypress', label: 'Cipresso', category: 'ambient', footprint: [1, 1], cost: 6, minRank: 1, description: 'Alto, scuro, composto. Il più serio degli alberi.' },
  { id: 'glow_shrooms', label: 'Funghi luminosi sul tronco', category: 'ambient', footprint: [2, 1], cost: 12, minRank: 2, rotatable: true, description: 'Un tronco caduto che di notte si accende di funghi e spore.' },
  { id: 'witch_apple', label: 'Melo stregato', category: 'ambient', footprint: [2, 2], cost: 14, minRank: 2, description: 'Le mele sono rosse, lucide e decisamente non da mangiare.' },
  { id: 'swing_tree', label: 'Albero dell’altalena', category: 'ambient', footprint: [2, 2], cost: 28, minRank: 3, description: 'L’altalena dondola piano. Non c’è vento.' },
  { id: 'stone_circle', label: 'Cerchio di pietre', category: 'ambient', footprint: [3, 3], cost: 30, minRank: 3, description: 'Pietre alte e basse attorno a un altare. Nessuno ricorda chi le ha messe.' },
  { id: 'hand_swamp', label: 'Palude con le mani', category: 'ambient', footprint: [4, 3], cost: 35, minRank: 3, unique: true, description: 'Acqua ferma, canne e qualche mano che saluta. Meglio non ricambiare.' },
  { id: 'hell_crack', label: 'Crepa infernale', category: 'ambient', footprint: [3, 2], cost: 60, minRank: 5, unique: true, light: true, description: 'Il terreno si spacca e da sotto sale un bagliore rosso. Aumenta le apparizioni.' },
  { id: 'mud', label: 'Terreno fangoso', category: 'ambient', footprint: [1, 1], cost: 1, minRank: 1, walkable: true, description: 'Risucchia gli stivali. E a volte restituisce cose.' },

  // ── Presenze (NPC piazzabili) ─────────────────────────────────────────
  { id: 'zombies_play', label: 'Zombie che giocano', category: 'npc', footprint: [2, 2], cost: 30, minRank: 3, walkable: true, description: 'Giocano a carte. Barano entrambi.' },
  { id: 'zombies_dance', label: 'Zombie che ballano', category: 'npc', footprint: [2, 2], cost: 30, minRank: 3, walkable: true, description: 'Il ritmo ce l’hanno ancora nelle ossa.' },
  { id: 'zombie_walker', label: 'Zombie errante', category: 'npc', footprint: [1, 1], cost: 26, minRank: 3, walkable: true, description: 'Passeggia senza meta, come la domenica.' },
  { id: 'ghosts_roam', label: 'Fantasmi erranti', category: 'npc', footprint: [1, 1], cost: 28, minRank: 3, walkable: true, description: 'Girano in tondo attraverso tutto, lapidi comprese.' },
  { id: 'ghosts_ball', label: 'Fantasmi a palla', category: 'npc', footprint: [2, 2], cost: 34, minRank: 4, walkable: true, description: 'Giocano a palla con un teschio. Il teschio si diverte meno.' },

  { id: 'cat_shelter', label: 'Rifugio dei gatti', category: 'npc', footprint: [2, 2], cost: 25, minRank: 2, unique: true, description: 'Una cassetta, una coperta e tre gatti neri. Uno dorme sempre.' },
  { id: 'ghost_picnic', label: 'Picnic dei fantasmi', category: 'npc', footprint: [2, 2], cost: 40, minRank: 3, unique: true, description: 'Tovaglia a quadri, tè freddo (molto freddo) e tre fantasmi in gita.' },
  { id: 'witch_corner', label: 'Angolo della strega', category: 'npc', footprint: [2, 2], cost: 55, minRank: 4, unique: true, decays: true, light: true, description: 'Una strega vende pozioni dal suo calderone e incassa qualche fuoco fatuo al giorno.' },
  { id: 'skeleton_band', label: 'Banda di scheletri', category: 'npc', footprint: [3, 2], cost: 65, minRank: 4, unique: true, light: true, description: 'Violino, tamburo e tromba. Suonano a orecchio: non ne hanno.' },
  { id: 'vampire_crypt', label: 'Cripta del vampiro', category: 'npc', footprint: [2, 2], cost: 90, minRank: 5, unique: true, decays: true, light: true, description: 'Di giorno dorme nella bara. Di notte esce a fare due passi tra le tombe.' },

  // ── Stagionali ────────────────────────────────────────────────────────
  { id: 'pumpkin_patch', label: 'Campo di zucche', category: 'ambient', footprint: [3, 3], cost: 20, minRank: 1, light: true, season: { from: [9, 1], to: [9, 31], label: 'ottobre' }, description: 'Solo a ottobre: zucche storte, qualcuna intagliata, tutte che ti guardano.' },
  { id: 'giant_web', label: 'Ragnatela gigante', category: 'decoration', footprint: [2, 1], cost: 12, minRank: 1, rotatable: true, season: { from: [9, 1], to: [9, 31], label: 'ottobre' }, description: 'Solo a ottobre. Il ragno è in ferie, ma torna.' },
  { id: 'dead_altar', label: 'Altare dei morti', category: 'decoration', footprint: [2, 2], cost: 25, minRank: 1, light: true, season: { from: [9, 31], to: [10, 2], label: '31 ott – 2 nov' }, description: 'Dal 31 ottobre al 2 novembre: candele, cempasúchil e foto di chi torna a trovarci.' },
  { id: 'skeleton_snowman', label: 'Pupazzo scheletrico', category: 'decoration', footprint: [1, 1], cost: 15, minRank: 1, season: { from: [11, 1], to: [0, 31], label: 'dic – gen' }, description: 'A dicembre e gennaio: due palle di neve, un teschio e un cilindro.' },
  { id: 'fence_lights', label: 'Luci di Natale sul recinto', category: 'light', footprint: [1, 1], cost: 3, minRank: 1, light: true, rotatable: true, season: { from: [11, 1], to: [0, 31], label: 'dic – gen' }, description: 'A dicembre e gennaio: un pezzo di staccionata con le lucine. Si mettono in fila.' },
  { id: 'lovers_bench', label: 'Panchina dei fantasmi innamorati', category: 'npc', footprint: [2, 1], cost: 30, minRank: 1, light: true, rotatable: true, season: { from: [1, 1], to: [1, 29], label: 'febbraio' }, description: 'A febbraio: due fantasmi su una panchina. Si tengono per mano, quando se la ricordano.' },

  // ── Extra (non si piazzano: si usano) ─────────────────────────────────
  { id: 'mystic_staff', label: 'Bastone mistico', category: 'extra', footprint: [1, 1], cost: 0, minRank: 4, unique: true, feat: { counter: 'wispsEarned', goal: 500, label: 'Raccogli 500 fuochi fatui' }, description: 'Il Custode lo impugna e i fuochi fatui accorrono da lontano.' },
  { id: 'broom', label: 'Scopa volante', category: 'extra', footprint: [1, 2], cost: 120, minRank: 5, unique: true, description: 'Il Custode ci sale a cavalcioni e vola sopra tombe e recinti, più veloce della bici.' },
  { id: 'bike', label: 'Bicicletta', category: 'extra', footprint: [1, 1], cost: 50, minRank: 2, unique: true, description: 'Il Custode pedala al doppio della velocità. Il cestino con la zucca è compreso.' },
];

export const CATALOG: Record<string, PlaceableDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const CATALOG_LIST: readonly PlaceableDef[] = defs;

/** Le varianti (oggetti a sé) di ogni famiglia: indice = vecchio numero di variante. */
export const FAMILY_MEMBERS: Record<string, string[]> = {};
for (const d of defs) {
  if (!d.family) continue;
  const m = (FAMILY_MEMBERS[d.family] ??= [d.family]);
  m[d.look ?? 0] = d.id;
}

/** Il modello da disegnare per un oggetto: le varianti usano quello della loro famiglia. */
export function visualOf(type: string, variant: number): { type: string; variant: number } {
  const d = CATALOG[type];
  return d?.family ? { type: d.family, variant: d.look ?? 0 } : { type, variant };
}

/** Casette per animale (tutte le varianti). */
export function isPetHouse(type: string): boolean {
  return (CATALOG[type]?.family ?? type) === 'pet_house';
}

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

export function isSeasonallyAvailable(def: PlaceableDef, month0: number, day = 15): boolean {
  if (def.onlyMonth !== undefined && def.onlyMonth !== month0) return false;
  if (!def.season) return true;
  const k = (m: number, d: number) => m * 32 + d, at = k(month0, day);
  const a = k(...def.season.from), b = k(...def.season.to);
  return a <= b ? at >= a && at <= b : at >= a || at <= b;
}

/** Quando si trova in Bottega uno stagionale («solo a dicembre», «solo ottobre»…). */
export function seasonLabel(def: PlaceableDef): string {
  if (def.season) return def.season.label;
  return def.onlyMonth === 11 ? 'dicembre' : '';
}

export function repairCost(def: PlaceableDef): number {
  return Math.max(2, Math.round(def.cost * DECAY.placeableRepairFraction));
}

/** Oggetti che contano come "tombe dissotterrate" per lo spawn degli zombie. */
export const ZOMBIE_ATTRACTORS = new Set(['open_grave', 'open_coffin']);

/** Le presenze piazzabili che vivono attorno al loro oggetto (anche fuori dalla categoria Presenze). */
export const PRESENCE_TYPES = new Set(['zombies_play', 'zombies_dance', 'zombie_walker', 'ghosts_roam', 'ghosts_ball', 'zombie_bar', 'brain_farm',
  'cat_shelter', 'ghost_picnic', 'witch_corner', 'skeleton_band', 'vampire_crypt', 'lovers_bench', 'soul_gazebo', 'keeper_statue']);
