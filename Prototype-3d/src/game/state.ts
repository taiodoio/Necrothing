// Stato di gioco serializzabile (salvataggio). Indipendente dallo stile
// grafico e dalla camera: cambiare resa non tocca mai questi dati.

import type { Category, DeathCause, GraveType } from './graves.ts';
import type { DayPhase } from './time.ts';
import { MAP_SIZE, WISPS } from './balance.ts';
import { createRng, hashString } from './rng.ts';
import { isoDate } from './time.ts';

/** v2: mappa 64×64 (prima 48×48), recinto iniziale 34×34. */
export const SAVE_VERSION = 2;

export type ArtStyle = 'voxel' | 'miniature' | 'lowpoly';
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
  style: 'lowpoly',
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
  // Recinto iniziale 34×34 centrato nella mappa 64×64: celle 15..48.
  // Cancello a sud (y = 48, x = 30..32). Viale principale nord-sud (x = 31),
  // due viali trasversali (y = 22 e y = 33), bottega a nord-ovest, piazzetta
  // con la statua all'incrocio, stagno e pozzo nella parte bassa.
  const P = (type: string, x: number, y: number, extra: Partial<Placed> = {}) => placed(type, x, y, iso, extra);
  const placeables: Placed[] = [
    P('shop', 17, 17),
    P('votive_statue', 33, 30),
    P('angel_statue', 43, 17),
    P('well', 21, 38),
    P('pond', 38, 40),
    P('flowerbed', 25, 42),
    P('dead_tree', 45, 26),
    P('dead_tree', 16, 30),
    P('dead_tree', 18, 45, { variant: 1 }),
    P('half_pine', 45, 45),
    P('half_pine', 16, 24),
    P('bushes', 43, 36),
    P('bushes', 26, 17),
    P('bushes', 16, 40),
    P('lamp_post', 30, 26),
    P('lamp_post', 32, 37, { variant: 2 }),
    P('lamp_post', 30, 45, { variant: 1 }),
    P('lantern', 24, 27),
    P('lantern', 37, 27, { variant: 2 }),
    P('lantern', 28, 20, { variant: 1 }),
    P('lantern', 42, 31),
    P('tall_grass', 36, 35),
    P('tall_grass', 46, 40),
    P('tall_grass', 20, 34),
    P('poison_shrooms', 27, 36),
    P('poison_shrooms', 44, 22),
    P('wreath', 33, 19),
    P('bones', 23, 31),
    P('vase', 38, 31),
    P('sign', 33, 46, { text: 'Necrothing' }),
  ];
  for (let y = 22; y <= 48; y++) placeables.push(P('path_stone', 31, y));
  for (let x = 19; x <= 42; x++) if (x !== 31) placeables.push(P('path_stone', x, 22));
  for (let x = 20; x <= 44; x++) if (x !== 31) placeables.push(P('path_stone', x, 33));
  placeables.push(P('path_stone', 18, 20), P('path_stone', 18, 21), P('path_stone', 18, 22));
  for (let y = 34; y <= 37; y++) placeables.push(P('path_dirt', 23, y));

  const legacy: Array<[string, GraveType, number, number, Category, DeathCause, string, 'dirty' | 'clean' | 'flowers' | 'broken']> = [
    ['Floppy disk 1.44', 'rectangular', 20, 24, 'electronics', 'planned_obsolescence', 'Conteneva tutto. Ora contiene silenzio.', 'dirty'],
    ['Tamagotchi', 'stone_simple', 23, 24, 'toys', 'owner_negligence', 'Aveva fame. Sempre.', 'clean'],
    ['Ombrello del 2009', 'gothic', 26, 24, 'household', 'fatal_fall', 'Si è rovesciato per l’ultima volta.', 'dirty'],
    ['Walkman', 'celtic_cross', 34, 24, 'electronics', 'battery_betrayal', 'Il nastro si è fermato a metà canzone.', 'flowers'],
    ['Pianta grassa', 'victorian', 37, 24, 'plants', 'water_damage', 'Troppo amore, troppa acqua.', 'clean'],
    ['Cabina telefonica', 'obelisk', 40, 24, 'other', 'planned_obsolescence', 'Chiamava. Nessuno rispondeva più.', 'dirty'],
    ['Bicicletta rossa', 'angel', 20, 28, 'vehicles', 'fatal_fall', 'Ha imparato a stare in equilibrio. Poi più nulla.', 'flowers'],
    ['Caffettiera', 'marble_cross', 26, 28, 'household', 'owner_negligence', 'Borbottava ogni mattina. Ora tace.', 'clean'],
    ['Lettore DVD', 'family_memorial', 35, 28, 'electronics', 'battery_betrayal', 'Leggeva tutto tranne il nostro cuore.', 'broken'],
    ['Peluche di coniglio', 'decorated_monument', 39, 28, 'toys', 'owner_negligence', 'Ha ascoltato ogni segreto.', 'clean'],
  ];
  const graves: Grave[] = legacy.map(([name, graveType, x, y, category, deathCause, epitaph, cond], i) => ({
    id: `legacy-${i + 1}`,
    seed: Math.floor(rng.next() * 1e6),
    name, category, deathCause, epitaph, graveType, x, y,
    birthDate: null,
    deathDate: day(400 + i * 37).slice(0, 10),
    photoId: null,
    hasFlowers: cond === 'flowers', flowersAt: cond === 'flowers' ? iso : null,
    weeds: cond === 'dirty' || cond === 'broken', dirty: cond === 'dirty' || cond === 'broken',
    dirtySince: cond === 'dirty' ? day(2) : cond === 'broken' ? day(11) : null,
    broken: cond === 'broken', lastAnniversaryYear: null, legacy: true, createdAt: day(400),
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
        { id: 'w-start-1', x: 29, y: 27 },
        { id: 'w-start-2', x: 41, y: 34 },
        { id: 'w-start-3', x: 19, y: 35 },
        { id: 'w-start-4', x: 35, y: 43 },
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
  // v1 → v2: la mappa è passata da 48 a 64 celle (centrata): si sposta tutto
  // di 8 celle, così il vecchio cimitero resta al centro del nuovo recinto.
  if (data.version < 2) {
    const d = 8;
    for (const g of data.graves ?? []) { g.x += d; g.y += d; }
    for (const p of data.placeables ?? []) { p.x += d; p.y += d; }
    for (const w of data.world?.looseWisps ?? []) { w.x += d; w.y += d; }
    if (data.world) data.world.expansionLevel = 0;
  }
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
