// Configurazione di bilanciamento: UNICO punto in cui vivono i numeri di
// gioco di simulazione/spawn/economia spaziale (probabilità, durate, cap,
// bonus prestigio). Modificare qui non deve richiedere di toccare la logica.
//
// Le ricompense XP/fuochi e le soglie dei ranghi restano in
// `progressionService` (RANKS, XP_VALUES, WISP_VALUES), che importa da qui i
// bonus dipendenti dal bilanciamento (per evitare import circolari).

import type { RoamingKind } from './roaming';

/** Parametri della simulazione del mondo (per esecuzione/giorno). */
export const SIM = {
  // Erbacce: probabilità cumulativa coi giorni trascorsi.
  weedProbPerDay: 0.12,
  weedProbMax: 0.8,
  // Sporcizia (polvere/muschio): più lenta delle erbacce.
  dirtProbPerDay: 0.08,
  dirtProbMax: 0.6,
  // Fiori: giorni dopo i quali appassiscono.
  flowerWitherDays: 3,
  // Eventi.
  ghostChanceNight: 0.08,
  ghostChanceDay: 0.02,
  blessingChance: 0.05,
  fullMoonChance: 0.15,
  // Economia fuochi fatui sulla mappa.
  wispCap: 8,
  wispSpawnMax: 3, // 1 + rng.int(wispSpawnMax)
} as const;

/** Probabilità base di comparsa delle entità erranti per esecuzione. */
export const SPAWN_CHANCE: Record<
  'cat' | 'crowDay' | 'priest' | 'ratNight' | 'gravedigger' | 'ghostObject',
  number
> = {
  cat: 0.06,
  crowDay: 0.1,
  priest: 0.04,
  ratNight: 0.06,
  gravedigger: 0.05,
  // Fantasma-oggetto (più raro del fantasma generico, ma premia di più).
  ghostObject: 0.03,
};

/**
 * Modificatori di spawn dati dagli edifici piazzati (Fase G). Gli edifici
 * rendono gli NPC una meccanica: alterano le probabilità di comparsa.
 */
export const SPAWN_MODIFIERS = {
  /** Ogni mausoleo aumenta gli eventi soprannaturali (moltiplicativo). */
  mausoleumEventBonus: 0.1, // +10% per mausoleo (fantasma/prete)
  /** Ogni casa del becchino aumenta la prob. di comparsa del becchino. */
  gravediggerHouseBonus: 0.12,
  /** Ogni santuario aumenta la prob. di comparsa del prete. */
  shrinePriestBonus: 0.06,
  /** Ogni bara aperta (tomba dissotterrata) attira gli zombie. */
  zombiePerOpenCoffin: 0.05,
  /** Tetto alla probabilità di zombie. */
  zombieChanceMax: 0.5,
} as const;

/** Becchino interattivo (Fase G). */
export const GRAVEDIGGER = {
  /** Raggio (Chebyshev, in celle) entro cui pulisce gratis le tombe. */
  cleanRadius: 4,
} as const;

export type RoamingBehavior = 'wander' | 'perch' | 'path' | 'skitter';

export interface RoamingDef {
  behavior: RoamingBehavior;
  /** Durata di vita prima di svanire (ms). */
  lifespanMs: number;
  /** Passo per tick, in tile. */
  speed: number;
}

/** Intervallo di aggiornamento del movimento delle entità erranti (ms). */
export const ROAMING_TICK_MS = 650;

export const ROAMING_DEFS: Record<RoamingKind, RoamingDef> = {
  ghost: { behavior: 'wander', lifespanMs: 26_000, speed: 0.9 },
  cat: { behavior: 'wander', lifespanMs: 32_000, speed: 1.4 },
  crow: { behavior: 'perch', lifespanMs: 22_000, speed: 2.2 },
  gravedigger: { behavior: 'path', lifespanMs: 34_000, speed: 1.0 },
  priest: { behavior: 'path', lifespanMs: 36_000, speed: 0.8 },
  rat: { behavior: 'skitter', lifespanMs: 15_000, speed: 1.9 },
  // Lo zombie barcolla lento: più lungo da catturare, più redditizio.
  zombie: { behavior: 'wander', lifespanMs: 30_000, speed: 0.6 },
};

/** Bonus prestigio del mausoleo centrale. */
export const MAUSOLEUM_PRESTIGE = 25;

/** Economia "buy-to-own": acquisto in Bottega, possesso in Inventario. */
export const ECONOMY = {
  /** Rimborso sulla vendita di un oggetto posseduto (frazione del costo). */
  sellRefund: 0.7,
} as const;

/** Decadimento e riparazione (Fase E). */
export const DECAY = {
  /** Giorni da sporca a rotta (una tomba trascurata si rompe). */
  graveBreakDays: 10,
  /** I fiori prolungano di N giorni la soglia prima della rottura. */
  flowerGraceDays: 1,
  /** Costo in fuochi fatui per riparare una tomba rotta. */
  repairCost: 6,
} as const;

/**
 * Distretti tematici auto-rilevati: un distretto si forma quando un gruppo di
 * tombe coerenti col tema, vicine tra loro, raggiunge la soglia.
 */
export const DISTRICT = {
  /** Numero minimo di tombe coerenti per formare un distretto. */
  minGraves: 4,
  /**
   * Distanza max (Chebyshev, tra le celle d'angolo) perché due tombe siano
   * "vicine" e quindi nello stesso gruppo. Le tombe sono 2×2: 2 = adiacenti,
   * 3 = con una cella di stacco.
   */
  adjacency: 3,
} as const;
