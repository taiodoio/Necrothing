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
  /** Sfocatura tilt-shift ai bordi (media/alta qualità). */
  edgeBlur: boolean;
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
  edgeBlur: true,
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
  // Recinto iniziale 22×22 centrato nella mappa 48×48: celle 13..34.
  // Cancello a sud (y = 34, x = 22..24). Disposizione ispirata al riferimento:
  // bottega a ovest, statua e tombe al centro, stagno a sud-est.
  const P = (type: string, x: number, y: number, extra: Partial<Placed> = {}) => placed(type, x, y, iso, extra);
  const placeables: Placed[] = [
    P('shop', 14, 15),
    P('votive_statue', 25, 15),
    P('dead_tree', 31, 14),
    P('dead_tree', 14, 25),
    P('half_pine', 32, 24),
    P('pond', 28, 29),
    P('bushes', 14, 30),
    P('lamp_post', 22, 27),
    P('lamp_post', 25, 31, { variant: 1 }),
    P('lantern', 19, 19),
    P('lantern', 28, 19, { variant: 2 }),
    P('tall_grass', 27, 27),
    P('tall_grass', 33, 28),
    P('poison_shrooms', 17, 27),
    P('wreath', 21, 15),
  ];
  for (let y = 21; y <= 34; y++) placeables.push(P('path_stone', 23, y));
  for (let x = 15; x <= 30; x++) if (x !== 23) placeables.push(P('path_stone', x, 20));
  placeables.push(P('path_stone', 15, 18), P('path_stone', 15, 19), P('path_stone', 23, 20));

  const legacy: Array<[string, GraveType, number, number, Category, DeathCause, string, 'dirty' | 'clean' | 'flowers']> = [
    ['Floppy disk 1.44', 'rectangular', 19, 22, 'electronics', 'planned_obsolescence', 'Conteneva tutto. Ora contiene silenzio.', 'dirty'],
    ['Tamagotchi', 'stone_simple', 19, 25, 'toys', 'owner_negligence', 'Aveva fame. Sempre.', 'clean'],
    ['Ombrello del 2009', 'gothic', 26, 22, 'household', 'fatal_fall', 'Si è rovesciato per l’ultima volta.', 'dirty'],
    ['Walkman', 'celtic_cross', 29, 22, 'electronics', 'battery_betrayal', 'Il nastro si è fermato a metà canzone.', 'flowers'],
    ['Pianta grassa', 'victorian', 26, 25, 'plants', 'water_damage', 'Troppo amore, troppa acqua.', 'clean'],
  ];
  const graves: Grave[] = legacy.map(([name, graveType, x, y, category, deathCause, epitaph, cond], i) => ({
    id: `legacy-${i + 1}`,
    seed: Math.floor(rng.next() * 1e6),
    name, category, deathCause, epitaph, graveType, x, y,
    birthDate: null,
    deathDate: day(400 + i * 37).slice(0, 10),
    photoId: null,
    hasFlowers: cond === 'flowers', flowersAt: cond === 'flowers' ? iso : null,
    weeds: cond === 'dirty', dirty: cond === 'dirty', dirtySince: cond === 'dirty' ? day(2) : null,
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
        { id: 'w-start-1', x: 21, y: 24 },
        { id: 'w-start-2', x: 30, y: 27 },
        { id: 'w-start-3', x: 17, y: 30 },
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
