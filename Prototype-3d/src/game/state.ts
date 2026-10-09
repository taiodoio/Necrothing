// Stato di gioco serializzabile (salvataggio). Indipendente dallo stile
// grafico e dalla camera: cambiare resa non tocca mai questi dati.

import type { Category, DeathCause, GraveType } from './graves.ts';
import type { DayPhase } from './time.ts';
import { MAP_SIZE, WISPS } from './balance.ts';
import { createRng, hashString } from './rng.ts';
import { isoDate } from './time.ts';

export const SAVE_VERSION = 1;

export type ArtStyle = 'voxel' | 'miniature';
export type CameraMode = 'angled' | 'top';
export type Quality = 'low' | 'medium' | 'high';
export type TimeOverride = 'auto' | DayPhase;
export type Weather = 'clear' | 'fog' | 'rain' | 'storm';

export interface Grave {
  id: string;
  seed: number;
  name: string;
  category: Category;
  birthDate: string | null;
  deathDate: string;
  deathCause: DeathCause;
  epitaph: string | null;
  photoId: string | null;
  graveType: GraveType;
  x: number;
  y: number;
  hasFlowers: boolean;
  flowersAt: string | null;
  weeds: boolean;
  dirty: boolean;
  dirtySince: string | null;
  broken: boolean;
  lastAnniversaryYear: number | null;
  /** Lascito del vecchio custode (tutorial), non una sepoltura del giocatore. */
  legacy?: boolean;
  createdAt: string;
}

export interface Placed {
  id: string;
  type: string;
  x: number;
  y: number;
  /** Quarti di giro (0..3). */
  rot: number;
  variant: number;
  text?: string;
  lit: boolean;
  /** Ultima cura (pulizia/riparazione/posa): base del decadimento 3/7 giorni. */
  caredAt: string;
  dirty: boolean;
  broken: boolean;
  createdAt: string;
}

export interface LooseWisp {
  id: string;
  x: number;
  y: number;
}

export type MemoryType = 'burial' | 'flower' | 'cleaned' | 'repaired' | 'anniversary' | 'ghost' | 'blessing' | 'zombie';

export interface MemoryEvent {
  id: string;
  graveId: string;
  type: MemoryType;
  at: string;
}

export interface Counters {
  flowersBrought: number;
  cleanups: number;
  ghostsWitnessed: number;
  npcEncountered: number;
  wispsSpent: number;
  decorationsPlaced: number;
  photosTaken: number;
  repairs: number;
}

export interface Player {
  name: string;
  xp: number;
  wisps: number;
  lastAbstractBurialDate: string | null;
  lastShareDate: string | null;
  counters: Counters;
}

export interface WorldMeta {
  lastSimulationAt: string;
  weather: Weather;
  lastWeatherDate: string | null;
  looseWisps: LooseWisp[];
  /** Fino a quando vale la benedizione del prete (+fuochi fatui). */
  blessingUntil: string | null;
  /** Livello di espansione raggiunto (non decresce). */
  expansionLevel: number;
}

export interface Settings {
  style: ArtStyle;
  camera: CameraMode;
  quality: Quality;
  timeOverride: TimeOverride;
  weatherEffects: boolean;
  editIntroSeen: boolean;
  shopTutorialDone: boolean;
  showDebug: boolean;
}

export interface SaveData {
  version: number;
  seed: number;
  createdAt: string;
  player: Player;
  graves: Grave[];
  placeables: Placed[];
  inventory: Record<string, number>;
  world: WorldMeta;
  achievements: { id: string; at: string }[];
  memories: MemoryEvent[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  style: 'voxel',
  camera: 'angled',
  quality: 'medium',
  timeOverride: 'auto',
  weatherEffects: true,
  editIntroSeen: false,
  shopTutorialDone: false,
  showDebug: false,
};

export function emptyCounters(): Counters {
  return {
    flowersBrought: 0, cleanups: 0, ghostsWitnessed: 0, npcEncountered: 0,
    wispsSpent: 0, decorationsPlaced: 0, photosTaken: 0, repairs: 0,
  };
}

/** Centro della mappa in coordinate cella. */
export const MAP_CENTER = MAP_SIZE / 2;

function placed(type: string, x: number, y: number, now: string, extra: Partial<Placed> = {}): Placed {
  return {
    id: `${type}-${x}-${y}`, type, x, y, rot: 0, variant: 0, lit: true,
    caredAt: now, dirty: false, broken: false, createdAt: now, ...extra,
  };
}

/**
 * Nuova partita: la Bottega è già piazzata (tutorial), un sentiero dal
 * cancello, qualche lampione e tre tombe "lasciate dal vecchio custode" da
 * riordinare — così il primo minuto di gioco ha già qualcosa da fare.
 */
export function createNewGame(now: Date, seed = Math.floor(Math.random() * 1e9)): SaveData {
  const iso = now.toISOString();
  const day = (offset: number) => new Date(now.getTime() - offset * 86_400_000).toISOString();
  const rng = createRng(seed);
  // Recinto iniziale 14×14 centrato: celle 9..22. Cancello a sud (y = 22).
  const placeables: Placed[] = [
    placed('shop', 17, 10, iso),
    placed('lamp_post', 14, 19, iso),
    placed('lamp_post', 18, 19, iso, { variant: 1 }),
    placed('dead_tree', 10, 10, iso),
    placed('lantern', 13, 13, iso),
  ];
  for (let y = 14; y <= 22; y++) placeables.push(placed('path_stone', 16, y, iso));
  for (let x = 17; x <= 18; x++) placeables.push(placed('path_stone', x, 13, iso));
  placeables.push(placed('path_stone', 16, 13, iso));

  const legacy: Array<[string, GraveType, number, number, Category, DeathCause, string]> = [
    ['Floppy disk 1.44', 'rectangular', 11, 15, 'electronics', 'planned_obsolescence', 'Conteneva tutto. Ora contiene silenzio.'],
    ['Tamagotchi', 'stone_simple', 11, 18, 'toys', 'owner_negligence', 'Aveva fame. Sempre.'],
    ['Ombrello del 2009', 'gothic', 19, 16, 'household', 'fatal_fall', 'Si è rovesciato per l’ultima volta.'],
  ];
  const graves: Grave[] = legacy.map(([name, graveType, x, y, category, deathCause, epitaph], i) => ({
    id: `legacy-${i + 1}`,
    seed: Math.floor(rng.next() * 1e6),
    name, category, deathCause, epitaph, graveType, x, y,
    birthDate: null,
    deathDate: day(400 + i * 37).slice(0, 10),
    photoId: null,
    hasFlowers: false, flowersAt: null,
    weeds: i !== 1, dirty: i !== 1, dirtySince: i !== 1 ? day(2) : null,
    broken: false, lastAnniversaryYear: null, legacy: true, createdAt: day(400),
  }));

  return {
    version: SAVE_VERSION,
    seed,
    createdAt: iso,
    player: {
      name: 'Custode', xp: 0, wisps: WISPS.start,
      lastAbstractBurialDate: null, lastShareDate: null, counters: emptyCounters(),
    },
    graves,
    placeables,
    inventory: { lantern: 1, wreath: 1 },
    world: {
      lastSimulationAt: iso,
      weather: 'clear',
      lastWeatherDate: isoDate(now),
      looseWisps: [
        { id: 'w-start-1', x: 13, y: 16 },
        { id: 'w-start-2', x: 20, y: 20 },
      ],
      blessingUntil: null,
      expansionLevel: 0,
    },
    achievements: [],
    memories: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Migra/ripara un salvataggio caricato (campi mancanti → default). */
export function normalizeSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<SaveData>;
  if (typeof data.version !== 'number' || !Array.isArray(data.graves) || !data.player) return null;
  const base = createNewGame(new Date(data.createdAt ?? Date.now()), data.seed ?? hashString('necro'));
  return {
    ...base,
    ...data,
    player: { ...base.player, ...data.player, counters: { ...emptyCounters(), ...(data.player.counters ?? {}) } },
    world: { ...base.world, ...(data.world ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
    inventory: { ...(data.inventory ?? {}) },
    placeables: data.placeables ?? base.placeables,
    achievements: data.achievements ?? [],
    memories: data.memories ?? [],
    version: SAVE_VERSION,
  } as SaveData;
}
