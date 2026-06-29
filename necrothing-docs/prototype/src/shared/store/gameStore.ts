// Store globale (Zustand). Livello use-case: orchestra servizi e repository,
// espone stato e azioni alla UI. Nessuna logica di dominio nei componenti.

import { create } from 'zustand';
import type {
  Achievement,
  Decoration,
  Grave,
  GraveMemoryEvent,
  NotificationPreferences,
  UserProgression,
  WorldState,
  Zone,
} from '@/shared/domain/types';
import { DEFAULT_NOTIFICATION_PREFERENCES, DEFAULT_PLAYER_NAME } from '@/shared/domain/types';
import { graveService } from '@/shared/services/graveService';
import { simulationService } from '@/shared/services/simulationService';
import {
  addXp,
  canBuryAbstract,
  canShareForXp,
  computePrestige,
  rankForXp,
  WISP_VALUES,
  XP_VALUES,
} from '@/shared/services/progressionService';
import { decorationService } from '@/shared/services/decorationService';
import { inventoryService, sellPrice, type InventoryMap } from '@/shared/services/inventoryService';
import { galleryService, type PhotoMeta } from '@/shared/services/galleryService';
import { imageStorageService } from '@/shared/services/imageStorageService';
import { graveRepository } from '@/shared/repositories/graveRepository';
import { decorationsRepository } from '@/shared/repositories/decorationsRepository';
import { PLACEABLES } from '@/shared/domain/placeables';
import { DECAY, GRAVEDIGGER } from '@/shared/domain/balance';
import type { PlaceableType, Weather } from '@/shared/domain/enums';
import type { RoamingSpawn } from '@/shared/domain/roaming';
import { detectDistricts, zoneScore } from '@/shared/services/zoneService';
import { newId } from '@/shared/utils/id';
import { buildOccupancy } from '@/shared/domain/placeables';
import { MAP_COLS, MAP_ROWS } from '@/shared/domain/types';
import { createNotificationService } from '@/shared/services/notificationService';
import { webNotificationAdapter } from '@/shared/services/platform/webNotificationAdapter';
import { evaluateAchievements } from '@/shared/services/achievementService';
import { achievementsRepository } from '@/shared/repositories/achievementsRepository';
import { worldRepository } from '@/shared/repositories/worldRepository';
import { progressionRepository } from '@/shared/repositories/progressionRepository';
import { settingsRepository } from '@/shared/repositories/settingsRepository';
import { systemClock, type ClockService } from '@/shared/utils/clock';
import type { BurialDraft } from '@/features/burial/validation';

// Servizio notifiche con adapter web (sostituibile su native).
const clock: ClockService = systemClock;
const notificationService = createNotificationService(webNotificationAdapter, clock);

interface GameState {
  ready: boolean;
  graves: Grave[];
  decorations: Decoration[];
  inventory: InventoryMap;
  photos: PhotoMeta[];
  zones: Zone[];
  world: WorldState | null;
  progression: UserProgression;
  notificationPrefs: NotificationPreferences;
  playerName: string;
  editIntroSeen: boolean;
  achievements: Achievement[];
  lastUnlockedAchievement: string | null;
  lastSimMessage: string | null;
  // Segnale per la UI: entità erranti da far comparire dopo la simulazione.
  pendingSpawns: RoamingSpawn[];

  // lifecycle
  init: () => Promise<void>;
  simulate: () => Promise<void>;
  refreshAchievements: () => Promise<void>;

  // use cases
  bury: (draft: BurialDraft) => Promise<Grave>;
  bringFlowers: (graveId: string) => Promise<void>;
  cleanWeeds: (graveId: string) => Promise<void>;
  moveGrave: (graveId: string, gridX: number, gridY: number) => Promise<void>;
  removeGrave: (graveId: string) => Promise<void>;
  repairGrave: (graveId: string) => Promise<void>;
  toggleLight: (id: string) => Promise<void>;
  witnessGhost: (graveId: string | null, rare?: boolean) => Promise<void>;
  petCat: () => Promise<void>;
  blessFromPriest: (graveId: string | null) => Promise<void>;
  shooRat: () => Promise<void>;
  witnessCrow: () => Promise<void>;
  fightZombie: (graveId: string | null) => Promise<void>;
  /** Il becchino pulisce gratis le tombe vicine. Ritorna quante ne ha pulite. */
  gravediggerSweep: (x: number, y: number) => Promise<number>;
  consumeSpawns: () => void;
  shareGrave: (graveId: string) => Promise<{ xpAwarded: number }>;
  buyItem: (type: PlaceableType) => Promise<void>;
  sellItem: (type: PlaceableType) => Promise<void>;
  placeDecoration: (type: PlaceableType, gridX: number, gridY: number) => Promise<Decoration>;
  removeDecoration: (id: string) => Promise<void>;
  movePlaceable: (id: string, gridX: number, gridY: number) => Promise<void>;
  rotatePlaceable: (id: string) => Promise<void>;
  changePlaceable: (id: string, newType: PlaceableType) => Promise<void>;
  setPlaceableText: (id: string, text: string) => Promise<void>;
  collectWisp: (id: string) => Promise<void>;
  addPhoto: (blob: Blob) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
  loadEvents: (graveId: string) => Promise<GraveMemoryEvent[]>;

  // notifiche
  updateNotificationPrefs: (prefs: NotificationPreferences) => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
  setPlayerName: (name: string) => Promise<void>;
  markEditIntroSeen: () => Promise<void>;

  // strumenti di sviluppo (solo dev)
  devSpawnWisp: () => Promise<void>;
  devDirtyRandomGrave: () => Promise<void>;
  devSetWeather: (weather: Weather) => Promise<void>;
  devBlessing: () => Promise<void>;

  // selettori derivati
  prestige: () => number;
}

async function persistProgression(p: UserProgression): Promise<void> {
  await progressionRepository.save(p);
}

export const useGameStore = create<GameState>((set, get) => ({
  ready: false,
  graves: [],
  decorations: [],
  inventory: {},
  photos: [],
  zones: [],
  world: null,
  progression: {
    id: 'singleton',
    xp: 0,
    prestige: 0,
    wisps: 0,
    lastAbstractBurialDate: null,
    lastShareDate: null,
  },
  notificationPrefs: DEFAULT_NOTIFICATION_PREFERENCES,
  playerName: DEFAULT_PLAYER_NAME,
  editIntroSeen: false,
  achievements: [],
  lastUnlockedAchievement: null,
  lastSimMessage: null,
  pendingSpawns: [],

  async init() {
    // World
    let world = await worldRepository.get();
    if (!world) {
      world = simulationService.initialWorld(clock);
      await worldRepository.save(world);
    } else if (!world.looseWisps) {
      world = { ...world, looseWisps: [] };
      await worldRepository.save(world);
    }

    // Progression
    let progression = await progressionRepository.get();
    if (!progression) {
      progression = {
        id: 'singleton',
        xp: 0,
        prestige: 0,
        wisps: 0,
        lastAbstractBurialDate: null,
        lastShareDate: null,
      };
      await progressionRepository.save(progression);
    } else if (progression.wisps == null) {
      // migrazione: vecchi salvataggi senza moneta
      progression = { ...progression, wisps: 0 };
      await progressionRepository.save(progression);
    }

    // Settings
    const settings = await settingsRepository.get();
    const notificationPrefs = settings?.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES;
    const playerName = settings?.playerName ?? DEFAULT_PLAYER_NAME;
    const editIntroSeen = settings?.editIntroSeen ?? false;
    if (!settings) {
      await settingsRepository.save({
        id: 'singleton',
        notifications: notificationPrefs,
        playerName,
        editIntroSeen,
      });
    }

    const graves = await graveService.listGraves();
    const achievements = await achievementsRepository.getAll();
    const decorations = await decorationsRepository.getAll();
    const inventory = await inventoryService.getMap();
    const photos = await galleryService.listMeta();
    const zones = detectDistricts(graves);
    set({ world, progression, notificationPrefs, playerName, editIntroSeen, graves, decorations, inventory, photos, zones, achievements, ready: true });

    await get().simulate();
    await get().refreshAchievements();
  },

  async refreshAchievements() {
    const unlocked = new Set(get().achievements.map((a) => a.id));
    const newly = evaluateAchievements(
      {
        graves: get().graves,
        progression: get().progression,
        decorations: get().decorations,
        zones: get().zones,
      },
      unlocked,
    );
    if (newly.length === 0) return;
    const now = clock.nowIso();
    const added: Achievement[] = newly.map((a) => ({ id: a.id, unlockedAt: now }));
    for (const a of added) await achievementsRepository.add(a);
    set({
      achievements: [...get().achievements, ...added],
      lastUnlockedAchievement: newly[0].name,
    });
  },

  async simulate() {
    const world = get().world;
    if (!world) return;
    const result = await simulationService.run(world, clock);
    const graves = await graveService.listGraves();

    // XP e fuochi fatui maturati da anniversari/benedizioni.
    let progression = get().progression;
    const wispsGained =
      result.anniversaries.length * WISP_VALUES.anniversary +
      (result.blessingGraveName ? WISP_VALUES.blessing : 0);
    if (result.xpGained > 0 || wispsGained > 0) {
      progression = addXp(progression, result.xpGained);
      progression = { ...progression, wisps: progression.wisps + wispsGained };
      await persistProgression(progression);
    }

    // Messaggio narrativo: priorità agli eventi più significativi.
    let message: string | null = null;
    if (result.anniversaries.length > 0) {
      const first = result.anniversaries[0];
      message =
        result.anniversaries.length === 1
          ? `Oggi ricorre l'anniversario di ${first.name}.`
          : `Oggi ricorrono ${result.anniversaries.length} anniversari funebri.`;
    } else if (result.newBroken > 0) {
      message = `${result.newBroken} ${
        result.newBroken === 1 ? 'tomba si è rotta' : 'tombe si sono rotte'
      }: vanno riparate.`;
    } else if (result.blessingGraveName) {
      message = `Il prete ha benedetto ${result.blessingGraveName}.`;
    } else if (result.ghostGraveName) {
      message = `Stanotte qualcuno è tornato vicino a ${result.ghostGraveName}.`;
    } else if (result.newWeeds > 0) {
      message = `Sono spuntate erbacce su ${result.newWeeds} ${
        result.newWeeds === 1 ? 'tomba' : 'tombe'
      }.`;
    } else if (result.newDirt > 0) {
      message = `${result.newDirt} ${
        result.newDirt === 1 ? 'lapide si è sporcata' : 'lapidi si sono sporcate'
      }: serve una pulita.`;
    } else if (result.witheredFlowers > 0) {
      message = 'Alcuni fiori sono ormai cenere.';
    }

    if (result.ghostGraveName) {
      await notificationService.notifyGhost(result.ghostGraveName);
    }

    set({
      world: result.world,
      graves,
      progression,
      lastSimMessage: message,
      pendingSpawns: result.spawns.length > 0 ? result.spawns : get().pendingSpawns,
    });
    await notificationService.rescheduleAll();
    await get().refreshAchievements();
  },

  async bury(draft) {
    // Limite: una sola sepoltura di oggetto astratto al giorno.
    const today = clock.todayIso();
    if (draft.category === 'abstract' && !canBuryAbstract(get().progression, today)) {
      throw new Error('Hai già seppellito un oggetto astratto oggi. Torna domani.');
    }

    const { grave, xpAwarded } = await graveService.bury(draft, clock);
    let progression = addXp(get().progression, xpAwarded);
    progression = { ...progression, wisps: progression.wisps + WISP_VALUES.burial };
    if (grave.category === 'abstract') {
      progression = { ...progression, lastAbstractBurialDate: today };
    }
    await persistProgression(progression);
    const graves = await graveService.listGraves();
    set({ graves, progression, zones: detectDistricts(graves) });
    await notificationService.rescheduleAll();
    await get().refreshAchievements();
    return grave;
  },

  async bringFlowers(graveId) {
    const { xpAwarded } = await graveService.bringFlowers(graveId, clock);
    let progression = get().progression;
    if (xpAwarded > 0) {
      progression = addXp(progression, xpAwarded);
      progression = {
        ...progression,
        wisps: progression.wisps + WISP_VALUES.flowers,
        flowersBrought: (progression.flowersBrought ?? 0) + 1,
      };
      await persistProgression(progression);
    }
    const graves = await graveService.listGraves();
    set({ graves, progression });
    await get().refreshAchievements();
  },

  async cleanWeeds(graveId) {
    const { xpAwarded } = await graveService.cleanWeeds(graveId, clock);
    let progression = get().progression;
    if (xpAwarded > 0) {
      progression = addXp(progression, xpAwarded);
      progression = {
        ...progression,
        wisps: progression.wisps + WISP_VALUES.weedCleaned,
        cleanups: (progression.cleanups ?? 0) + 1,
      };
      await persistProgression(progression);
    }
    const graves = await graveService.listGraves();
    set({ graves, progression });
    await notificationService.rescheduleAll();
    await get().refreshAchievements();
  },

  async moveGrave(graveId, gridX, gridY) {
    await graveService.move(graveId, gridX, gridY, clock);
    const graves = await graveService.listGraves();
    set({ graves, zones: detectDistricts(graves) });
    await get().refreshAchievements();
  },

  async removeGrave(graveId) {
    const grave = get().graves.find((g) => g.id === graveId);
    await graveService.remove(graveId);
    if (grave?.photoId) {
      await imageStorageService.remove(grave.photoId).catch(() => undefined);
    }
    const graves = await graveService.listGraves();
    set({ graves, zones: detectDistricts(graves) });
    await notificationService.rescheduleAll();
    await get().refreshAchievements();
  },

  async repairGrave(graveId) {
    const grave = get().graves.find((g) => g.id === graveId);
    if (!grave?.broken) return;
    const prog = get().progression;
    if (prog.wisps < DECAY.repairCost) {
      throw new Error(`Servono ${DECAY.repairCost} fuochi fatui per riparare.`);
    }
    await graveService.repair(graveId, clock);
    const progression = { ...prog, wisps: prog.wisps - DECAY.repairCost };
    await persistProgression(progression);
    set({ graves: await graveService.listGraves(), progression });
    await get().refreshAchievements();
  },

  async toggleLight(id) {
    await decorationService.toggleLight(id);
    set({ decorations: await decorationService.list() });
  },

  async witnessGhost(graveId, rare = false) {
    const graves = get().graves;
    const target = graveId
      ? graves.find((g) => g.id === graveId)
      : graves[Math.floor(Math.random() * graves.length)];
    if (target) {
      await graveService.recordEvent(target.id, 'ghost', clock);
    }
    const xp = rare ? XP_VALUES.ghostObject : XP_VALUES.ghost;
    const wisps = rare ? WISP_VALUES.ghostObject : WISP_VALUES.ghost;
    let progression = addXp(get().progression, xp);
    progression = {
      ...progression,
      wisps: progression.wisps + wisps,
      ghostsWitnessed: (progression.ghostsWitnessed ?? 0) + 1,
    };
    await persistProgression(progression);
    set({ progression });
    await get().refreshAchievements();
  },

  async petCat() {
    const cur = get().progression;
    const progression = {
      ...cur,
      wisps: cur.wisps + WISP_VALUES.cat,
      npcEncountered: (cur.npcEncountered ?? 0) + 1,
    };
    await persistProgression(progression);
    set({ progression });
    await get().refreshAchievements();
  },

  async blessFromPriest(graveId) {
    const graves = get().graves;
    const target = graveId
      ? graves.find((g) => g.id === graveId)
      : graves[Math.floor(Math.random() * graves.length)];
    if (target) {
      await graveService.recordEvent(target.id, 'blessing', clock);
    }
    let progression = addXp(get().progression, XP_VALUES.blessing);
    progression = {
      ...progression,
      wisps: progression.wisps + WISP_VALUES.blessing,
      npcEncountered: (progression.npcEncountered ?? 0) + 1,
    };
    await persistProgression(progression);
    set({ progression });
    await get().refreshAchievements();
  },

  async shooRat() {
    const cur = get().progression;
    const progression = {
      ...cur,
      wisps: cur.wisps + WISP_VALUES.rat,
      npcEncountered: (cur.npcEncountered ?? 0) + 1,
    };
    await persistProgression(progression);
    set({ progression });
    await get().refreshAchievements();
  },

  async witnessCrow() {
    const cur = get().progression;
    const progression = {
      ...cur,
      wisps: cur.wisps + WISP_VALUES.crow,
      npcEncountered: (cur.npcEncountered ?? 0) + 1,
    };
    await persistProgression(progression);
    set({ progression });
    await get().refreshAchievements();
  },

  async fightZombie(graveId) {
    if (graveId) await graveService.recordEvent(graveId, 'ghost', clock);
    let progression = addXp(get().progression, XP_VALUES.zombie);
    progression = {
      ...progression,
      wisps: progression.wisps + WISP_VALUES.zombie,
      npcEncountered: (progression.npcEncountered ?? 0) + 1,
    };
    await persistProgression(progression);
    set({ progression });
    await get().refreshAchievements();
  },

  async gravediggerSweep(x, y) {
    const cleaned = await graveService.cleanNearby(x, y, GRAVEDIGGER.cleanRadius, clock);
    if (cleaned > 0) {
      let progression = addXp(get().progression, cleaned * XP_VALUES.gravediggerPerGrave);
      progression = {
        ...progression,
        wisps: progression.wisps + cleaned * WISP_VALUES.gravediggerPerGrave,
        cleanups: (progression.cleanups ?? 0) + cleaned,
        npcEncountered: (progression.npcEncountered ?? 0) + 1,
      };
      await persistProgression(progression);
      set({ graves: await graveService.listGraves(), progression });
      await notificationService.rescheduleAll();
      await get().refreshAchievements();
    } else {
      const cur = get().progression;
      const progression = { ...cur, npcEncountered: (cur.npcEncountered ?? 0) + 1 };
      await persistProgression(progression);
      set({ progression });
    }
    return cleaned;
  },

  consumeSpawns() {
    set({ pendingSpawns: [] });
  },

  async shareGrave(_graveId) {
    const today = clock.todayIso();
    if (!canShareForXp(get().progression, today)) return { xpAwarded: 0 };
    const progression = {
      ...addXp(get().progression, XP_VALUES.share),
      lastShareDate: today,
    };
    await persistProgression(progression);
    set({ progression });
    await get().refreshAchievements();
    return { xpAwarded: XP_VALUES.share };
  },

  async buyItem(type) {
    const def = PLACEABLES[type];
    const prog = get().progression;
    if (rankForXp(prog.xp).level < def.minRank) {
      throw new Error(`Sblocca al rango ${def.minRank}.`);
    }
    if (prog.wisps < def.cost) {
      throw new Error(`Servono ${def.cost} fuochi fatui (ne hai ${prog.wisps}).`);
    }
    const owned = await inventoryService.add(type, +1);
    const progression = {
      ...prog,
      wisps: prog.wisps - def.cost,
      wispsSpent: (prog.wispsSpent ?? 0) + def.cost,
    };
    await persistProgression(progression);
    set({ progression, inventory: { ...get().inventory, [type]: owned } });
    await get().refreshAchievements();
  },

  async sellItem(type) {
    const prog = get().progression;
    if ((get().inventory[type] ?? 0) <= 0) return;
    const owned = await inventoryService.add(type, -1);
    const progression = { ...prog, wisps: prog.wisps + sellPrice(type) };
    await persistProgression(progression);
    set({ progression, inventory: { ...get().inventory, [type]: owned } });
  },

  async placeDecoration(type, gridX, gridY) {
    const prog = get().progression;
    if ((get().inventory[type] ?? 0) <= 0) {
      throw new Error('Non possiedi questo oggetto: compralo in Bottega.');
    }
    const rankLevel = rankForXp(prog.xp).level;
    const created = await decorationService.place(type, gridX, gridY, rankLevel, clock);
    const owned = await inventoryService.add(type, -1);
    const progression = { ...prog, decorationsPlaced: (prog.decorationsPlaced ?? 0) + 1 };
    await persistProgression(progression);
    const decorations = await decorationService.list();
    set({ decorations, progression, inventory: { ...get().inventory, [type]: owned } });
    await get().refreshAchievements();
    return created;
  },

  async removeDecoration(id) {
    const placeable = get().decorations.find((d) => d.id === id);
    await decorationService.remove(id);
    const decorations = await decorationService.list();
    if (placeable) {
      const owned = await inventoryService.add(placeable.type, +1);
      set({ decorations, inventory: { ...get().inventory, [placeable.type]: owned } });
    } else {
      set({ decorations });
    }
  },

  async movePlaceable(id, gridX, gridY) {
    await decorationService.move(id, gridX, gridY);
    set({ decorations: await decorationService.list() });
  },

  async rotatePlaceable(id) {
    await decorationService.rotate(id);
    set({ decorations: await decorationService.list() });
  },

  async changePlaceable(id, newType) {
    const current = get().decorations.find((d) => d.id === id);
    const oldType = current?.type;
    if (oldType && oldType !== newType) {
      if ((get().inventory[newType] ?? 0) <= 0) {
        throw new Error('Non possiedi questo oggetto: compralo in Bottega.');
      }
    }
    await decorationService.changeType(id, newType);
    const decorations = await decorationService.list();
    if (oldType && oldType !== newType) {
      const newOwned = await inventoryService.add(newType, -1);
      const oldOwned = await inventoryService.add(oldType, +1);
      set({
        decorations,
        inventory: { ...get().inventory, [newType]: newOwned, [oldType]: oldOwned },
      });
    } else {
      set({ decorations });
    }
  },

  async setPlaceableText(id, text) {
    await decorationService.setText(id, text);
    set({ decorations: await decorationService.list() });
  },

  async collectWisp(id) {
    const world = get().world;
    if (!world) return;
    const list = world.looseWisps ?? [];
    if (!list.some((w) => w.id === id)) return;
    const nextWorld = { ...world, looseWisps: list.filter((w) => w.id !== id) };
    await worldRepository.save(nextWorld);
    const progression = {
      ...get().progression,
      wisps: get().progression.wisps + WISP_VALUES.collect,
    };
    await persistProgression(progression);
    set({ world: nextWorld, progression });
  },

  async addPhoto(blob) {
    await galleryService.add(blob, clock);
    set({ photos: await galleryService.listMeta() });
  },

  async removePhoto(id) {
    await galleryService.remove(id);
    set({ photos: await galleryService.listMeta() });
  },

  async loadEvents(graveId) {
    return graveService.listEvents(graveId);
  },

  async updateNotificationPrefs(prefs) {
    await notificationService.updatePreferences(prefs);
    // updatePreferences riscrive le settings: ripristina gli altri campi.
    await settingsRepository.save({
      id: 'singleton',
      notifications: prefs,
      playerName: get().playerName,
      editIntroSeen: get().editIntroSeen,
    });
    set({ notificationPrefs: prefs });
  },

  async setPlayerName(name) {
    const playerName = name.trim().slice(0, 24) || DEFAULT_PLAYER_NAME;
    await settingsRepository.save({
      id: 'singleton',
      notifications: get().notificationPrefs,
      playerName,
      editIntroSeen: get().editIntroSeen,
    });
    set({ playerName });
  },

  async markEditIntroSeen() {
    if (get().editIntroSeen) return;
    await settingsRepository.save({
      id: 'singleton',
      notifications: get().notificationPrefs,
      playerName: get().playerName,
      editIntroSeen: true,
    });
    set({ editIntroSeen: true });
  },

  async requestNotificationPermission() {
    await notificationService.requestPermission();
    await notificationService.rescheduleAll();
  },

  async devSpawnWisp() {
    const world = get().world;
    if (!world) return;
    const occ = buildOccupancy(get().graves, get().decorations);
    const wisps = world.looseWisps ?? [];
    const taken = new Set([...occ, ...wisps.map((w) => `${w.gridX},${w.gridY}`)]);
    let cell: { x: number; y: number } | null = null;
    for (let i = 0; i < 80 && !cell; i++) {
      const x = Math.floor(Math.random() * MAP_COLS);
      const y = Math.floor(Math.random() * MAP_ROWS);
      if (!taken.has(`${x},${y}`)) cell = { x, y };
    }
    if (!cell) return;
    const nextWorld = {
      ...world,
      looseWisps: [...wisps, { id: newId(), gridX: cell.x, gridY: cell.y }],
    };
    await worldRepository.save(nextWorld);
    set({ world: nextWorld });
  },

  async devDirtyRandomGrave() {
    const graves = get().graves;
    if (graves.length === 0) return;
    const g = graves[Math.floor(Math.random() * graves.length)];
    const updated = { ...g, hasWeeds: true, isDirty: true, updatedAt: clock.nowIso() };
    await graveRepository.update(updated);
    set({ graves: await graveService.listGraves() });
  },

  async devSetWeather(weather) {
    const world = get().world;
    if (!world) return;
    const nextWorld = { ...world, currentWeather: weather };
    await worldRepository.save(nextWorld);
    set({ world: nextWorld });
  },

  async devBlessing() {
    const graves = get().graves;
    if (graves.length === 0) return;
    const g = graves[Math.floor(Math.random() * graves.length)];
    await graveService.recordEvent(g.id, 'blessing', clock);
    let progression = addXp(get().progression, XP_VALUES.blessing);
    progression = { ...progression, wisps: progression.wisps + WISP_VALUES.blessing };
    await persistProgression(progression);
    set({ progression, lastSimMessage: `Il prete ha benedetto ${g.name}.` });
    await get().refreshAchievements();
  },

  prestige() {
    const decorations = get().decorations;
    return computePrestige(get().graves, decorations.length, {
      hasMausoleum: decorations.some((d) => d.type === 'mausoleum'),
      zoneScore: zoneScore(get().zones),
    });
  },
}));
