// Stato di gioco serializzabile (salvataggio). Indipendente dallo stile
// grafico e dalla camera: cambiare resa non tocca mai questi dati.

import { DEFAULT_LOOK, normalizeLook, type CustodeLook } from './look.ts';
import { defaultHouse, houseItem, type HouseState } from './house.ts';
import type { CauseChoice, Category, DeathCause, GraveType } from './graves.ts';
import type { DayPhase } from './time.ts';
import { MAP_SIZE, WISPS } from './balance.ts';
import { CATALOG, FAMILY_MEMBERS, rotatedFootprint } from './catalog.ts';
import { createRng, hashString } from './rng.ts';
import { isoDate } from './time.ts';
import { t } from '../i18n/index.ts';

/** v2: mappa 64×64 (prima 48×48), recinto iniziale 34×34. */
export const SAVE_VERSION = 2;

export type ArtStyle = 'voxel' | 'miniature' | 'lowpoly';
export type CameraMode = 'angled' | 'top';
export type Quality = 'low' | 'medium' | 'high';
/** Qualità scelta nelle impostazioni: un livello fisso, o «auto» (si adatta al dispositivo). */
export type QualitySetting = Quality | 'auto';
/** Frame al secondo: «auto» = 60 in Alta, 30 in Media e Bassa. */
export type FpsSetting = 'auto' | '30' | '60';
/** Tema dell'interfaccia (interfaccia nuova): «auto» segue il tema del telefono. */
export type ThemeSetting = 'auto' | 'light' | 'dark';
export type TimeOverride = 'auto' | DayPhase;
export type Weather = 'clear' | 'fog' | 'rain' | 'storm';

export interface Grave {
  id: string;
  seed: number;
  name: string;
  category: Category;
  birthDate: string | null;
  deathDate: string;
  deathCause: CauseChoice;
  /** Causa scritta a mano (solo con deathCause 'custom'). */
  deathCauseText?: string | null;
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
  /** Ultima cura (pulizia, fiori, riparazione): per qualche ora gli zombie non la sporcano. */
  caredAt?: string;
  /** Sporcata da uno zombie: sopra lo sporco ci sono le impronte di fango (vanno via pulendo). */
  muddy?: boolean;
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
  /** Ultima cura (pulizia/riparazione/posa): da qui partono i tempi (casuali) di sporco e rotto. */
  caredAt: string;
  dirty: boolean;
  broken: boolean;
  createdAt: string;
  /** Casetta per animale: cosa fa il suo animale (libero, segue il Custode, a cuccia). */
  petMode?: 'free' | 'follow' | 'home';
  /** Bar, orto e strega: ultima riscossione dei fuochi fatui (assente = dalla posa). */
  collectedAt?: string;
  /** Campana delle anime: l'ultima volta che è stata suonata (una volta al giorno). */
  rungAt?: string;
}

export interface LooseWisp {
  id: string;
  x: number;
  y: number;
}

export type MemoryType = 'burial' | 'flower' | 'cleaned' | 'repaired' | 'anniversary' | 'ghost' | 'blessing' | 'zombie' | 'entrusted';

/**
 * Ricordo affidato all'Albero dei ricordi: la tomba com'era (nome, epitaffio,
 * date…), quando è stata affidata e quante volte è tornato il suo fantasma.
 */
export interface EntrustedMemory {
  grave: Grave;
  entrustedAt: string;
  ghostVisits: number;
}

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
  /** Luci riparate (sblocca il Lampione del Custode). */
  lightsRepaired: number;
  /** Fuochi fatui guadagnati in tutto (sblocca il Bastone mistico). */
  wispsEarned: number;
  /** Pozioni vendute dalla strega (sblocca il cappello da strega). */
  potionsSold: number;
}

export interface Player {
  name: string;
  /** Aspetto del Custode (personalizzazione). */
  look: CustodeLook;
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
  /** Ampiezza del recinto scelta dal giocatore (≤ livello sbloccato). */
  expansionLevel: number;
  /** Livello di espansione sbloccato col prestigio (non decresce). */
  unlockedLevel: number;
  /** Ultimo livello sbloccato di cui il giocatore è stato avvisato. */
  notifiedLevel: number;
}

export interface Settings {
  style: ArtStyle;
  camera: CameraMode;
  quality: QualitySetting;
  fps: FpsSetting;
  theme: ThemeSetting;
  timeOverride: TimeOverride;
  weatherEffects: boolean;
  /** Sfocatura tilt-shift ai bordi (media/alta qualità). */
  edgeBlur: boolean;
  editIntroSeen: boolean;
  shopTutorialDone: boolean;
  showDebug: boolean;
  /** Il Custode impugna il Bastone mistico (i fuochi fatui accorrono da lontano). */
  staffEquipped: boolean;
  /** Promemoria (notifiche dell'app): null = non ancora chiesto (lo si chiede dopo la prima sepoltura). */
  reminders: boolean | null;
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
  /** Ricordi affidati all'Albero dei ricordi (le loro tombe non ci sono più). */
  entrusted: EntrustedMemory[];
  /** Casa del Custode: tetto e aggiunte del cortile. */
  house: HouseState;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  style: 'lowpoly',
  camera: 'angled',
  quality: 'auto',
  fps: 'auto',
  theme: 'auto',
  timeOverride: 'auto',
  weatherEffects: true,
  edgeBlur: true,
  editIntroSeen: false,
  shopTutorialDone: false,
  showDebug: false,
  staffEquipped: false,
  reminders: null,
};

export function emptyCounters(): Counters {
  return {
    flowersBrought: 0, cleanups: 0, ghostsWitnessed: 0, npcEncountered: 0,
    wispsSpent: 0, decorationsPlaced: 0, photosTaken: 0, repairs: 0,
    lightsRepaired: 0, wispsEarned: 0, potionsSold: 0,
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
    P('lamp_post_gothic', 32, 37),
    P('lamp_post_double', 30, 45),
    P('lantern', 24, 27),
    P('lantern_stone', 37, 27),
    P('lantern_pole', 28, 20),
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
    [t('state.legacy.floppy.name'), 'rectangular', 20, 24, 'electronics', 'planned_obsolescence', t('state.legacy.floppy.epitaph'), 'dirty'],
    [t('state.legacy.tamagotchi.name'), 'stone_simple', 23, 24, 'toys', 'owner_negligence', t('state.legacy.tamagotchi.epitaph'), 'clean'],
    [t('state.legacy.umbrella.name'), 'gothic', 26, 24, 'household', 'fatal_fall', t('state.legacy.umbrella.epitaph'), 'dirty'],
    [t('state.legacy.walkman.name'), 'celtic_cross', 34, 24, 'electronics', 'battery_betrayal', t('state.legacy.walkman.epitaph'), 'flowers'],
    [t('state.legacy.succulent.name'), 'victorian', 37, 24, 'plants', 'water_damage', t('state.legacy.succulent.epitaph'), 'clean'],
    [t('state.legacy.phoneBooth.name'), 'obelisk', 40, 24, 'other', 'planned_obsolescence', t('state.legacy.phoneBooth.epitaph'), 'dirty'],
    [t('state.legacy.bike.name'), 'angel', 20, 28, 'vehicles', 'fatal_fall', t('state.legacy.bike.epitaph'), 'flowers'],
    [t('state.legacy.moka.name'), 'marble_cross', 26, 28, 'household', 'owner_negligence', t('state.legacy.moka.epitaph'), 'clean'],
    [t('state.legacy.dvdPlayer.name'), 'family_memorial', 35, 28, 'electronics', 'battery_betrayal', t('state.legacy.dvdPlayer.epitaph'), 'broken'],
    [t('state.legacy.bunny.name'), 'decorated_monument', 39, 28, 'toys', 'owner_negligence', t('state.legacy.bunny.epitaph'), 'clean'],
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
      name: t('state.player.defaultName'), look: { ...DEFAULT_LOOK }, xp: 0, wisps: WISPS.start,
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
      unlockedLevel: 0,
      notifiedLevel: 0,
    },
    achievements: [],
    memories: [],
    entrusted: [],
    house: defaultHouse(),
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Casa del Custode di un salvataggio vecchio o ritoccato: solo voci note, il tetto in vista tra quelli comprati. */
function normalizeHouse(raw: Partial<HouseState> | undefined): HouseState {
  const base = defaultHouse();
  const owned = [...new Set([...base.owned, ...(Array.isArray(raw?.owned) ? raw!.owned : [])])].filter((id) => houseItem(id));
  const roof = raw?.roof && owned.includes(raw.roof) ? raw.roof : base.roof;
  const hidden = (Array.isArray(raw?.hidden) ? raw!.hidden : []).filter((id) => owned.includes(id));
  return { owned, roof, hidden };
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
  // la "ciotola" (Animale scheletro) è stata tolta: l'animale arriva con la sua
  // casetta. Chi l'aveva riceve indietro i fuochi fatui spesi.
  const bowls = (data.placeables ?? []).filter((p) => p.type === 'skeleton_pet').length + ((data.inventory as Record<string, number> | undefined)?.skeleton_pet ?? 0);
  if (bowls) {
    data.placeables = (data.placeables ?? []).filter((p) => p.type !== 'skeleton_pet');
    if (data.inventory) delete (data.inventory as Record<string, number>).skeleton_pet;
    data.player = { ...data.player, wisps: (data.player.wisps ?? 0) + bowls * 18 };
  }
  // le varianti sono diventate oggetti a sé (Lampione gotico, Urna, Cuccia del gatto…): chi le aveva le tiene
  for (const p of data.placeables ?? []) {
    const id = FAMILY_MEMBERS[p.type]?.[p.variant];
    if (p.variant > 0 && id) { p.type = id; p.variant = 0; }
  }
  // i pezzi in serie (sentieri, muretti, staccionate…) non si sporcano più: tornano puliti
  for (const p of data.placeables ?? []) if (CATALOG[p.type] && !CATALOG[p.type].decays) { p.dirty = false; p.broken = false; }
  // tombe trascurate senza l'inizio dell'incuria (salvataggi vecchi, o solo erbacce): il conto parte da ora
  for (const g of data.graves ?? []) if ((g.dirty || g.weeds) && !g.broken && !g.dirtySince) g.dirtySince = data.world?.lastSimulationAt ?? new Date().toISOString();
  // l'espansione ora è a scelta: chi aveva già un recinto più grande lo tiene, sbloccato e già notificato
  if (data.world) {
    const lvl = data.world.expansionLevel ?? 0;
    data.world.unlockedLevel = Math.max(data.world.unlockedLevel ?? lvl, lvl);
    data.world.notifiedLevel = Math.max(data.world.notifiedLevel ?? data.world.unlockedLevel, lvl);
  }
  // zombie e fantasmi arrivano già da soli: lo zombie errante diventa lo spaventapasseri, i fantasmi erranti il giardiniere
  const RENAMED: Record<string, string> = { zombie_walker: 'scarecrow', ghosts_roam: 'gardener_corner' };
  for (const p of data.placeables ?? []) if (RENAMED[p.type]) { p.type = RENAMED[p.type]; p.lit = true; }
  if (data.inventory) {
    const inv = { ...(data.inventory as Record<string, number>) };
    for (const [from, to] of Object.entries(RENAMED)) if (inv[from]) { inv[to] = (inv[to] ?? 0) + inv[from]; delete inv[from]; }
    data.inventory = inv;
  }
  // la banda di scheletri ora è 3×3 (davanti al palco ballano due fantasmini): se la fila in più è occupata torna in inventario
  for (const b of [...(data.placeables ?? [])].filter((p) => p.type === 'skeleton_band')) {
    const [w, d] = rotatedFootprint(b.type, b.rot);
    const inside = (x: number, y: number, fw: number, fd: number) => x < b.x + w && x + fw > b.x && y < b.y + d && y + fd > b.y;
    const clash = (data.graves ?? []).some((g) => inside(g.x, g.y, 2, 2))
      || (data.placeables ?? []).some((p) => p !== b && CATALOG[p.type] && inside(p.x, p.y, ...rotatedFootprint(p.type, p.rot)));
    if (clash) {
      data.placeables = (data.placeables ?? []).filter((p) => p !== b);
      data.inventory = { ...(data.inventory ?? {}), skeleton_band: ((data.inventory as Record<string, number> | undefined)?.skeleton_band ?? 0) + 1 };
    }
  }
  // la vista dall'alto è stata tolta (al suo posto c'è la bicicletta)
  if (data.settings && (data.settings as { camera?: string }).camera !== 'angled') data.settings = { ...data.settings, camera: 'angled' };
  // gli stili di prova (voxel, miniatura) sono stati tolti: il gioco è low-poly
  if (data.settings && data.settings.style !== 'lowpoly') data.settings = { ...data.settings, style: 'lowpoly' };
  return {
    ...base,
    ...data,
    player: { ...base.player, ...data.player, look: normalizeLook(data.player.look), counters: { ...emptyCounters(), ...(data.player.counters ?? {}) } },
    world: { ...base.world, ...(data.world ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
    inventory: { ...(data.inventory ?? {}) },
    placeables: data.placeables ?? base.placeables,
    achievements: data.achievements ?? [],
    memories: data.memories ?? [],
    entrusted: Array.isArray(data.entrusted) ? data.entrusted : [],
    house: normalizeHouse(data.house),
    version: SAVE_VERSION,
  } as SaveData;
}
