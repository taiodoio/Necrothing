// Dominio: entità principali. Vedi specs/data-model/core-entities.md

import type {
  Category,
  DayPhase,
  DeathCause,
  GraveType,
  MemoryEventType,
  PlaceableType,
  Season,
  Weather,
  ZoneTheme,
} from './enums';

export interface Grave {
  id: string;
  name: string;
  category: Category;
  birthDate: string | null; // ISO date
  deathDate: string; // ISO date
  deathCause: DeathCause;
  epitaph: string | null; // max 240
  photoId: string | null;
  graveType: GraveType;
  gridX: number;
  gridY: number;
  // Stato simulazione
  hasFlowers: boolean;
  flowersUpdatedAt: string | null; // ISO datetime
  hasWeeds: boolean;
  // Sporcizia accumulata (polvere/muschio): da pulire periodicamente.
  isDirty: boolean;
  // Quando è diventata sporca (per calcolare la rottura). null se pulita.
  dirtySince: string | null;
  // Rotta: trascurata troppo a lungo. Richiede riparazione (non solo pulizia).
  broken: boolean;
  // Anno dell'ultimo anniversario già celebrato (per evitare doppioni).
  lastAnniversaryYear: number | null;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface GraveMemoryEvent {
  id: string;
  graveId: string;
  type: MemoryEventType;
  occurredAt: string; // ISO datetime
  payloadJson: string | null;
}

export interface WorldState {
  id: 'singleton';
  lastSimulationAt: string; // ISO datetime
  currentWeather: Weather;
  currentSeason: Season;
  currentDayPhase: DayPhase;
  seed: string;
  looseWisps: LooseWisp[]; // fuochi fatui presenti sulla mappa
  /** ISO date (YYYY-MM-DD) dell'ultimo cambio meteo: il meteo cambia una volta al giorno. */
  lastWeatherDate?: string;
  /** Posizione della Bottega sulla mappa (celle). Default: centro in basso. */
  shopGridX?: number;
  shopGridY?: number;
}

export interface UserProgression {
  id: 'singleton';
  xp: number;
  prestige: number;
  wisps: number; // moneta: fuochi fatui
  // limiti giornalieri / contatori
  lastAbstractBurialDate: string | null; // ISO date
  lastShareDate: string | null;
  // Contatori cumulativi per gli achievement (opzionali: default 0 sui
  // salvataggi precedenti, vedi migrazione in gameStore.init).
  flowersBrought?: number;
  cleanups?: number;
  ghostsWitnessed?: number;
  npcEncountered?: number;
  wispsSpent?: number;
  decorationsPlaced?: number;
}

/** Fuoco fatuo raccoglibile sulla mappa (moneta). Effimero, in WorldState. */
export interface LooseWisp {
  id: string;
  gridX: number;
  gridY: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  anniversaries: boolean;
  weeds: boolean;
  flowers: boolean;
  ghosts: boolean;
  npcEvents: boolean;
  seasonalEvents: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // "HH:mm"
  quietHoursEnd?: string; // "HH:mm"
}

export interface Settings {
  id: 'singleton';
  notifications: NotificationPreferences;
  playerName?: string;
  editIntroSeen?: boolean;
  /** true dopo che l'utente ha completato il tutorial di piazzamento della Bottega. */
  shopTutorialDone?: boolean;
}

export const DEFAULT_PLAYER_NAME = 'Custode';

export interface Achievement {
  id: string;
  unlockedAt: string; // ISO datetime
}

export interface StoredImage {
  id: string;
  blob: Blob;
}

/** Foto salvata nella Galleria (cattura del cimitero, B/N pixelata). */
export interface GalleryPhoto {
  id: string;
  blob: Blob;
  createdAt: string;
}

/** Quantità posseduta di un tipo piazzabile (modello buy-to-own). */
export interface InventoryItem {
  type: PlaceableType;
  owned: number;
}

export interface Decoration {
  id: string;
  type: PlaceableType;
  gridX: number;
  gridY: number;
  rotation?: 0 | 90; // rotazione (es. staccionata verticale)
  text?: string; // testo personalizzato (es. cartello)
  lit?: boolean; // luci: accesa/spenta (default accesa)
  createdAt: string;
}

/** Zona tematica: regione rettangolare della mappa con un tema. */
export interface Zone {
  id: string;
  theme: ZoneTheme;
  gridX: number;
  gridY: number;
  w: number; // larghezza in celle
  h: number; // altezza in celle
  createdAt: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  anniversaries: true,
  weeds: true,
  flowers: true,
  ghosts: true,
  npcEvents: true,
  seasonalEvents: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

// Mappa navigabile a griglia fitta (scrollabile). Tile in px.
export const MAP_COLS = 24;
export const MAP_ROWS = 32;
export const TILE_SIZE = 40;

// Cornice decorativa (recinto): anello perimetrale spesso FRAME_MARGIN celle,
// non piazzabile. L'area di gioco utile è l'interno.
export const FRAME_MARGIN = 4;

/** True se la cella (x,y) cade nell'anello di cornice (non piazzabile). */
export function isFrameCell(x: number, y: number): boolean {
  return (
    x < FRAME_MARGIN ||
    y < FRAME_MARGIN ||
    x >= MAP_COLS - FRAME_MARGIN ||
    y >= MAP_ROWS - FRAME_MARGIN
  );
}

/** True se un ingombro w×h posato in (x,y) invade l'anello di cornice. */
export function footprintTouchesFrame(x: number, y: number, w: number, h: number): boolean {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (isFrameCell(x + dx, y + dy)) return true;
    }
  }
  return false;
}

// Footprint (larghezza×altezza in celle) per categoria di oggetto.
export const GRAVE_FOOTPRINT: [number, number] = [2, 2];
