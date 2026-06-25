// Dominio: entità principali. Vedi specs/data-model/core-entities.md

import type {
  Category,
  DayPhase,
  DeathCause,
  GraveType,
  MemoryEventType,
  Season,
  Weather,
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
}

export interface UserProgression {
  id: 'singleton';
  xp: number;
  prestige: number;
  // limiti giornalieri / contatori
  lastAbstractBurialDate: string | null; // ISO date
  lastShareDate: string | null;
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
}

export interface Achievement {
  id: string;
  unlockedAt: string; // ISO datetime
}

export interface StoredImage {
  id: string;
  blob: Blob;
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

// Dimensione griglia cimitero (MVP)
export const GRID_COLS = 6;
export const GRID_ROWS = 8;
