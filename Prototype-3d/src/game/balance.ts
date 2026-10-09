// UNICO punto in cui vivono i numeri di gioco: ricompense, decadimento,
// probabilità di spawn, economia ed espansione. Portati dalla PWA React
// (necrothing-docs/prototype/src/shared/domain/balance.ts e
// progressionService.ts) e adattati al gioco 3D "in tempo reale".

/** Mappa logica: 48×48 celle. 1 cella = 1 unità mondo. */
export const MAP_SIZE = 48;
/** Bosco decorativo oltre la mappa (celle per lato): il terreno non "finisce" mai a schermo. */
export const FOREST_MARGIN = 24;
export const GRAVE_FOOTPRINT: [number, number] = [2, 2];

export const RANKS = [
  { level: 1, name: 'Angelo Custode degli Oggetti', minXp: 0 },
  { level: 2, name: 'Rottamatore Novizio', minXp: 500 },
  { level: 3, name: 'Becchino del Silicio', minXp: 1500 },
  { level: 4, name: 'Tristo Mietitore Quotidiano', minXp: 3500 },
  { level: 5, name: 'Lord of Decay', minXp: 7000 },
] as const;

export const XP = {
  burialPhysical: 100,
  burialAbstract: 50,
  flowers: 10,
  cleaned: 5,
  repaired: 8,
  placeableCleaned: 3,
  share: 25,
  anniversary: 30,
  ghost: 40,
  ghostObject: 70,
  blessing: 20,
  gravediggerPerGrave: 6,
  zombie: 25,
  photo: 5,
} as const;

export const WISPS = {
  start: 30,
  burial: 5,
  flowers: 1,
  cleaned: 3,
  placeableCleaned: 1,
  anniversary: 5,
  blessing: 3,
  collect: 1,
  ghost: 2,
  ghostObject: 5,
  cat: 2,
  rat: 1,
  crow: 1,
  zombie: 4,
  gravediggerPerGrave: 1,
} as const;

/** Simulazione delle tombe (per esecuzione, in funzione dei giorni trascorsi). */
export const SIM = {
  weedProbPerDay: 0.12,
  weedProbMax: 0.8,
  dirtProbPerDay: 0.08,
  dirtProbMax: 0.6,
  flowerWitherDays: 3,
  blessingChance: 0.05,
} as const;

/** Decadimento & riparazione. */
export const DECAY = {
  /** Tomba: giorni da sporca a rotta. */
  graveBreakDays: 10,
  /** Costo in fuochi fatui per riparare una tomba. */
  graveRepairCost: 6,
  /** Luci e costruzioni: si sporcano ogni N giorni senza cure (Excel). */
  placeableDirtyDays: 3,
  /** …e si rompono dopo N giorni senza cure (Excel). */
  placeableBreakDays: 7,
  /** Riparare un oggetto costa questa frazione del suo prezzo (min 2). */
  placeableRepairFraction: 0.3,
} as const;

/** Fuochi fatui sulla mappa: quanti ne compaiono dipende da tombe, cure, fiori. */
export const WISP_SPAWN = {
  capBase: 6,
  capPerGraves: 0.5, // +1 al tetto ogni 2 tombe
  capMax: 16,
  /** Probabilità per "tick" live (ogni LIVE_TICK_MS) di comparsa di un fuoco fatuo. */
  liveChanceBase: 0.25,
  liveChancePerFlower: 0.04,
  liveChancePerCleanGrave: 0.01,
  /** Benedizione del prete: moltiplicatore per 24 ore. */
  blessingMultiplier: 1.5,
  blessingHours: 24,
} as const;

/** Intervallo del tick "vivo" mentre si gioca (spawn NPC/fuochi). */
export const LIVE_TICK_MS = 40_000;

/**
 * Matrice di spawn degli eventi casuali (probabilità per tick). Le voci
 * Day/Night si applicano nella rispettiva fase. Tarata per ~1 presenza ogni
 * 2 minuti di gioco attivo.
 */
export const SPAWN_CHANCE = {
  ghostGenericNight: 0.08,
  ghostGenericDay: 0.02,
  ghostObjectNight: 0.05,
  ghostObjectDay: 0.01,
  cat: 0.06,
  crowDay: 0.1,
  priest: 0.04,
  gravedigger: 0.05,
  ratNight: 0.06,
} as const;

export const SPAWN_MODIFIERS = {
  mausoleumEventBonus: 0.1,
  gravediggerHouseBonus: 0.12,
  shrinePriestBonus: 0.06,
  zombiePerOpenGrave: 0.05,
  zombieChanceMax: 0.5,
  hellHoleGhostBonus: 0.04,
  /** Fiori portati aumentano gli eventi (Implementation_Note). */
  flowerEventBonus: 0.01,
} as const;

export const GRAVEDIGGER = { cleanRadius: 4 } as const;

export const ECONOMY = { sellRefund: 0.7 } as const;

/** Prestigio del mausoleo. */
export const MAUSOLEUM_PRESTIGE = 25;

/**
 * Espansione: l'area recintata cresce con il prestigio. Il lato è in celle,
 * centrato nella mappa 32×32. Il resto è terra selvaggia non consacrata.
 */
export const EXPANSION = [
  { minPrestige: 0, size: 22, label: 'Recinto iniziale' },
  { minPrestige: 90, size: 26, label: 'Ala orientale' },
  { minPrestige: 160, size: 30, label: 'Ala occidentale' },
  { minPrestige: 260, size: 36, label: 'Campo dei dimenticati' },
  { minPrestige: 400, size: 44, label: 'Cimitero intero' },
] as const;

export const DISTRICT = { minGraves: 4, adjacency: 3 } as const;
