// UNICO punto in cui vivono i numeri di gioco: ricompense, decadimento,
// probabilità di spawn, economia ed espansione. Portati dalla PWA React
// (necrothing-docs/prototype/src/shared/domain/balance.ts e
// progressionService.ts) e adattati al gioco 3D "in tempo reale".

/** Mappa logica: 64×64 celle. 1 cella = 1 unità mondo. */
export const MAP_SIZE = 64;
/**
 * Bosco decorativo oltre la mappa (celle per lato). La camera ne mostra solo
 * una fascia sottile attorno al recinto: il protagonista è il cimitero.
 */
export const FOREST_MARGIN = 12;
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
/**
 * Sblocchi da attivare solo nella versione finale: per ora (test) l'Albero
 * dei ricordi si compra subito, senza aspettare le 20 tombe, e bicicletta,
 * bar e orto senza aspettare il rango (il prezzo resta).
 */
export const RELEASE_LOCKS = { minGraves: false, earlyRank: false };

/**
 * Oggetti in prova: con `RELEASE_LOCKS.earlyRank` spento si comprano a
 * qualsiasi rango, in qualsiasi stagione e senza il traguardo che li sblocca
 * (il prezzo resta).
 */
export const EARLY_ACCESS: ReadonlySet<string> = new Set([
  'bike', 'zombie_bar', 'brain_farm',
  'candelabra', 'spirit_lantern', 'skull_garland', 'keeper_lamp', 'book_pile', 'stuffed_crow', 'gargoyle', 'reaper_statue', 'keeper_statue',
  'soul_bell', 'soul_gazebo', 'cypress', 'glow_shrooms', 'witch_apple', 'swing_tree', 'stone_circle', 'hand_swamp', 'hell_crack',
  'cat_shelter', 'ghost_picnic', 'witch_corner', 'skeleton_band', 'vampire_crypt',
  'pumpkin_patch', 'giant_web', 'dead_altar', 'skeleton_snowman', 'fence_lights', 'lovers_bench', 'mystic_staff', 'broom',
]);

/** Cappelli del Custode che si sbloccano con un traguardo (anche questi liberi in prova). */
export const HAT_FEATS = { witch: { counter: 'potionsSold', goal: 30, label: 'La strega deve vendere 30 pozioni' } } as const;

export const DECAY = {
  /** Tomba: giorni dal primo segno d'incuria (erbacce o sporco) a rotta. */
  graveBreakDays: 10,
  /** Costo in fuochi fatui per riparare una tomba. */
  graveRepairCost: 6,
  /**
   * Luci e costruzioni (le tombe no: lì serve una cura costante): dopo l'ultima
   * cura si sporcano in un giorno a caso di questo intervallo…
   */
  placeableDirtyDays: [5, 14] as readonly [number, number],
  /** …e, se nessuno le pulisce, si rompono dopo altri giorni a caso di questo intervallo. */
  placeableBreakDays: [8, 20] as readonly [number, number],
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
  /** Fantasma di un ricordo affidato all'Albero dei ricordi. */
  memoryGhostNight: 0.07,
  memoryGhostDay: 0.025,
} as const;

export const SPAWN_MODIFIERS = {
  mausoleumEventBonus: 0.1,
  gravediggerHouseBonus: 0.12,
  shrinePriestBonus: 0.06,
  zombiePerOpenGrave: 0.05,
  zombieChanceMax: 0.5,
  /** Il Bar degli zombie e l'Orto dei cervelli attirano zombie anche senza tombe aperte. */
  zombieBar: 0.06,
  zombieFarm: 0.03,
  hellHoleGhostBonus: 0.04,
  /** La crepa infernale chiama i fantasmi come il buco infernale. */
  hellCrackGhostBonus: 0.04,
  /** Fiori portati aumentano gli eventi (Implementation_Note). */
  flowerEventBonus: 0.01,
} as const;

/**
 * Attività che incassano fuochi fatui: ogni giorno (di calendario) un importo
 * casuale ma stabile nel giorno; si accumulano fino a un tetto (qualche giorno)
 * e si riscuotono toccando l'edificio.
 */
export const BUSINESS: Record<string, { perDay: [number, number]; cap: number }> = {
  zombie_bar: { perDay: [3, 6], cap: 15 },
  brain_farm: { perDay: [2, 5], cap: 12 },
  // ogni fuoco fatuo incassato è una pozione venduta
  witch_corner: { perDay: [3, 6], cap: 15 },
};

/** Velocità del Custode a piedi (celle al secondo) e moltiplicatori in bicicletta e sulla scopa. */
export const CUSTODE_SPEED = { walk: 3.1, bike: 2, broom: 2.6 } as const;

/** Bastone mistico: da quanto lontano (celle) i fuochi fatui accorrono al Custode (senza: 0,65). */
export const STAFF = { radius: 3.5 } as const;

/** Lampione del Custode: le luci entro questo raggio (celle, tra i centri) non si rompono. */
export const KEEPER_LAMP = { radius: 4 } as const;

/** Campana delle anime: quanti fantasmi accorrono quando la si suona (una volta al giorno). */
export const SOUL_BELL = { ghosts: 3 } as const;

/**
 * Zombie che passano accanto a una tomba (solo mentre si gioca): con questa
 * probabilità la sporcano (al massimo una tomba per zombie) lasciando le
 * impronte di fango; se era già sporca, la rottura si avvicina di un giorno.
 * Le tombe appena pulite o coi fiori freschi sono al riparo per qualche ora.
 */
export const ZOMBIE_MUD = { chance: 0.35, protectHours: 6, reach: 1 } as const;

/** Becchino: raggio della vecchia pulizia al tocco; quota delle cose sporche che sistema in ogni giro. */
export const GRAVEDIGGER = { cleanRadius: 4, roundShare: 0.5 } as const;

export const ECONOMY = { sellRefund: 0.7 } as const;

/** Prestigio del mausoleo. */
export const MAUSOLEUM_PRESTIGE = 25;

/**
 * Espansione: l'area recintata cresce con il prestigio. Il lato è in celle,
 * centrato nella mappa 64×64. Il resto è terra selvaggia non consacrata.
 */
export const EXPANSION = [
  { minPrestige: 0, size: 34, label: 'Recinto iniziale' },
  { minPrestige: 160, size: 40, label: 'Ala orientale' },
  { minPrestige: 260, size: 46, label: 'Ala occidentale' },
  { minPrestige: 380, size: 52, label: 'Campo dei dimenticati' },
  { minPrestige: 520, size: 58, label: 'Cimitero intero' },
] as const;

export const DISTRICT = { minGraves: 4, adjacency: 3 } as const;
