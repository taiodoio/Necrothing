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
  // Meteo.
  fullMoonChance: 0.15,
  // Benedizione del prete (evento narrativo, probabilità separata dagli spawn NPC).
  blessingChance: 0.05,
  // Economia fuochi fatui sulla mappa.
  wispCap: 8,
  wispSpawnMax: 3, // 1 + rng.int(wispSpawnMax)
} as const;

/**
 * Matrice di spawn degli eventi casuali: probabilità base per esecuzione di
 * simulazione. Ogni voce indica la chance (0–1) di comparsa per "slot" di
 * simulazione (chiamata a simulationService.run). Le voci con suffisso *Day /
 * *Night si applicano solo nella fase giorno / notte.
 *
 * Modificare qui per tarare la frequenza percepita senza toccare la logica.
 *
 *  Entità          | Base  | Contesto
 *  ----------------|-------|----------------------------------
 *  ghostGeneric    | 0.05  | notte (×4) / giorno (×1)
 *  ghostObject     | 0.03  | notte (×4) / giorno (×1) — raro
 *  cat             | 0.06  | qualsiasi
 *  crow            | 0.10  | giorno
 *  priest          | 0.04  | qualsiasi
 *  gravedigger     | 0.05  | qualsiasi
 *  rat             | 0.06  | notte
 *  zombie          | base × open_coffins (vedi SPAWN_MODIFIERS)
 */
export const SPAWN_CHANCE = {
  /** Fantasma generico: più probabile di notte. */
  ghostGenericNight: 0.08,
  ghostGenericDay: 0.02,
  /** Fantasma-oggetto (più raro, premia di più). */
  ghostObjectNight: 0.05,
  ghostObjectDay: 0.01,
  /** Gatto nero: compare sia di giorno che di notte. */
  cat: 0.06,
  /** Corvo: solo di giorno (si posa sulle lapidi). */
  crow: 0.10,
  /** Prete: benedice le tombe, orario qualsiasi. */
  priest: 0.04,
  /** Becchino: attraversa il campo, orario qualsiasi. */
  gravedigger: 0.05,
  /** Topo: scatta di notte. */
  rat: 0.06,
  /** Zombie: base per bara aperta (moltiplicato da SPAWN_MODIFIERS.zombiePerOpenCoffin). */
  zombieBase: 0.0,
} as const;

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
  /** Costo in fuochi fatui per riparare una tomba rotta. */
  repairCost: 6,
} as const;

/**
 * Bilanciamento & longevità (Fase H). Target di riferimento per la taratura,
 * da validare in playtest (vedi docs/game-design/08-implementation-plan.md):
 *
 *  Profilo               | Achievement | Cimitero pieno | Completo (anniv.)
 *  ----------------------|-------------|----------------|------------------
 *  Casual (5–10 min/g)   | 2–3 mesi    | 4–6 mesi       | 2+ anni
 *  Engaged (20–30 min/g) | 4–6 sett.   | 2–3 mesi       | 1–2 anni
 *  Hardcore              | 3–4 sett.   | ~1 mese        | ~1 anno
 *
 * Vincolo dominante: il TEMPO REALE (erbacce, decadimento, anniversari a 1
 * anno). Gli anniversari sono l'end-game naturale; l'espansione del terreno
 * (vedi EXPANSION) e i ranghi danno obiettivi intermedi.
 *
 * Curva fuochi fatui (entrate tipiche): raccolta sulla mappa ~1–3/giorno
 * (wispCap 8), azioni di cura 1–3 ciascuna, eventi NPC 1–5. Uscite: oggetti in
 * Bottega (EXTRA_DEFAULTS.cost) e riparazioni (DECAY.repairCost). Obiettivo:
 * un giocatore attento accumula a sufficienza per 1–2 acquisti/settimana senza
 * grinding, restando in lieve scarsità per dare peso alle scelte.
 */
export const BALANCE_TARGETS = {
  /** Acquisti "comodi" a settimana per un giocatore engaged (riferimento). */
  comfortableBuysPerWeek: 2,
} as const;

/**
 * Hook di espansione: il terreno coltivabile del cimitero cresce con il
 * prestigio, così da evitare il "tutto completato". Ogni tier sblocca più
 * righe utilizzabili della mappa (MAP_ROWS è il massimo). Le soglie sono
 * volutamente crescenti per scandire l'end-game.
 */
export const EXPANSION = {
  tiers: [
    { minPrestige: 0, rows: 12, label: 'Recinto iniziale' },
    { minPrestige: 30, rows: 18, label: 'Ala orientale' },
    { minPrestige: 80, rows: 24, label: 'Ala occidentale' },
    { minPrestige: 160, rows: 28, label: 'Campo dei dimenticati' },
    { minPrestige: 280, rows: 32, label: 'Cimitero intero' },
  ],
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
