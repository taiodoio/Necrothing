// Store globale (Zustand). Livello use-case: orchestra servizi e repository,
// espone stato e azioni alla UI. Nessuna logica di dominio nei componenti.

import { create } from 'zustand';
import type {
  Achievement,
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
  XP_VALUES,
} from '@/shared/services/progressionService';
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
  world: null,
  progression: {
    id: 'singleton',
    xp: 0,
    prestige: 0,
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
    }

    // Progression
    let progression = await progressionRepository.get();
    if (!progression) {
      progression = {
        id: 'singleton',
        xp: 0,
        prestige: 0,
        lastAbstractBurialDate: null,
        lastShareDate: null,
      };
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
    set({ world, progression, notificationPrefs, graves, achievements, ready: true });

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

    // XP maturato da anniversari/benedizioni durante la simulazione.
    let progression = get().progression;
    if (result.xpGained > 0) {
      progression = addXp(progression, result.xpGained);
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
    const progression = xpAwarded > 0 ? addXp(get().progression, xpAwarded) : get().progression;
    if (xpAwarded > 0) await persistProgression(progression);
    const graves = await graveService.listGraves();
    set({ graves, progression });
    await get().refreshAchievements();
  },

  async cleanWeeds(graveId) {
    const { xpAwarded } = await graveService.cleanWeeds(graveId, clock);
    const progression = xpAwarded > 0 ? addXp(get().progression, xpAwarded) : get().progression;
    if (xpAwarded > 0) await persistProgression(progression);
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
    return computePrestige(get().graves);
  },
}));
