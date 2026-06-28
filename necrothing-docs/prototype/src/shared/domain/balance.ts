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

/** Probabilità di comparsa delle entità erranti per esecuzione. */
export const SPAWN_CHANCE: Record<'cat' | 'crowDay' | 'priest' | 'ratNight', number> = {
  cat: 0.06,
  crowDay: 0.1,
  priest: 0.04,
  ratNight: 0.06,
};

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
};

/** Bonus prestigio del mausoleo centrale. */
export const MAUSOLEUM_PRESTIGE = 25;

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
