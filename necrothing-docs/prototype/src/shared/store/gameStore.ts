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
} from '@/shared/domain/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/shared/domain/types';
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
import { decorationsRepository } from '@/shared/repositories/decorationsRepository';
import { PLACEABLES } from '@/shared/domain/placeables';
import type { PlaceableType } from '@/shared/domain/enums';
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
  world: WorldState | null;
  progression: UserProgression;
  notificationPrefs: NotificationPreferences;
  achievements: Achievement[];
  lastUnlockedAchievement: string | null;
  lastSimMessage: string | null;

  // lifecycle
  init: () => Promise<void>;
  simulate: () => Promise<void>;
  refreshAchievements: () => Promise<void>;

  // use cases
  bury: (draft: BurialDraft) => Promise<Grave>;
  bringFlowers: (graveId: string) => Promise<void>;
  cleanWeeds: (graveId: string) => Promise<void>;
  shareGrave: (graveId: string) => Promise<{ xpAwarded: number }>;
  placeDecoration: (type: PlaceableType, gridX: number, gridY: number) => Promise<void>;
  removeDecoration: (id: string) => Promise<void>;
  movePlaceable: (id: string, gridX: number, gridY: number) => Promise<void>;
  rotatePlaceable: (id: string) => Promise<void>;
  changePlaceable: (id: string, newType: PlaceableType) => Promise<void>;
  collectWisp: (id: string) => Promise<void>;
  loadEvents: (graveId: string) => Promise<GraveMemoryEvent[]>;

  // notifiche
  updateNotificationPrefs: (prefs: NotificationPreferences) => Promise<void>;
  requestNotificationPermission: () => Promise<void>;

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
  achievements: [],
  lastUnlockedAchievement: null,
  lastSimMessage: null,

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
    if (!settings) {
      await settingsRepository.save({ id: 'singleton', notifications: notificationPrefs });
    }

    const graves = await graveService.listGraves();
    const achievements = await achievementsRepository.getAll();
    const decorations = await decorationsRepository.getAll();
    set({ world, progression, notificationPrefs, graves, decorations, achievements, ready: true });

    await get().simulate();
    await get().refreshAchievements();
  },

  async refreshAchievements() {
    const unlocked = new Set(get().achievements.map((a) => a.id));
    const newly = evaluateAchievements(
      { graves: get().graves, progression: get().progression },
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
    } else if (result.blessingGraveName) {
      message = `Il prete ha benedetto ${result.blessingGraveName}.`;
    } else if (result.ghostGraveName) {
      message = `Stanotte qualcuno è tornato vicino a ${result.ghostGraveName}.`;
    } else if (result.newWeeds > 0) {
      message = `Sono spuntate erbacce su ${result.newWeeds} ${
        result.newWeeds === 1 ? 'tomba' : 'tombe'
      }.`;
    } else if (result.witheredFlowers > 0) {
      message = 'Alcuni fiori sono ormai cenere.';
    }

    if (result.ghostGraveName) {
      await notificationService.notifyGhost(result.ghostGraveName);
    }

    set({ world: result.world, graves, progression, lastSimMessage: message });
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
    set({ graves, progression });
    await notificationService.rescheduleAll();
    await get().refreshAchievements();
    return grave;
  },

  async bringFlowers(graveId) {
    const { xpAwarded } = await graveService.bringFlowers(graveId, clock);
    let progression = get().progression;
    if (xpAwarded > 0) {
      progression = addXp(progression, xpAwarded);
      progression = { ...progression, wisps: progression.wisps + WISP_VALUES.flowers };
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
      progression = { ...progression, wisps: progression.wisps + WISP_VALUES.weedCleaned };
      await persistProgression(progression);
    }
    const graves = await graveService.listGraves();
    set({ graves, progression });
    await notificationService.rescheduleAll();
    await get().refreshAchievements();
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

  async placeDecoration(type, gridX, gridY) {
    const def = PLACEABLES[type];
    const prog = get().progression;
    if (prog.wisps < def.cost) {
      throw new Error(`Servono ${def.cost} fuochi fatui (ne hai ${prog.wisps}).`);
    }
    const rankLevel = rankForXp(prog.xp).level;
    await decorationService.place(type, gridX, gridY, rankLevel, clock);
    const progression = { ...prog, wisps: prog.wisps - def.cost };
    await persistProgression(progression);
    const decorations = await decorationService.list();
    set({ decorations, progression });
  },

  async removeDecoration(id) {
    await decorationService.remove(id);
    const decorations = await decorationService.list();
    set({ decorations });
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
    await decorationService.changeType(id, newType);
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

  async loadEvents(graveId) {
    return graveService.listEvents(graveId);
  },

  async updateNotificationPrefs(prefs) {
    await notificationService.updatePreferences(prefs);
    set({ notificationPrefs: prefs });
  },

  async requestNotificationPermission() {
    await notificationService.requestPermission();
    await notificationService.rescheduleAll();
  },

  prestige() {
    return computePrestige(get().graves, get().decorations.length);
  },
}));
