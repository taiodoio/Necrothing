// Store globale (Zustand). Livello use-case: orchestra servizi e repository,
// espone stato e azioni alla UI. Nessuna logica di dominio nei componenti.

import { create } from 'zustand';
import type {
  Grave,
  GraveMemoryEvent,
  NotificationPreferences,
  UserProgression,
  WorldState,
} from '@/shared/domain/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/shared/domain/types';
import { graveService } from '@/shared/services/graveService';
import { simulationService } from '@/shared/services/simulationService';
import { addXp, computePrestige } from '@/shared/services/progressionService';
import { createNotificationService } from '@/shared/services/notificationService';
import { webNotificationAdapter } from '@/shared/services/platform/webNotificationAdapter';
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
  lastSimMessage: string | null;

  // lifecycle
  init: () => Promise<void>;
  simulate: () => Promise<void>;

  // use cases
  bury: (draft: BurialDraft) => Promise<Grave>;
  bringFlowers: (graveId: string) => Promise<void>;
  cleanWeeds: (graveId: string) => Promise<void>;
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
    set({ world, progression, notificationPrefs, graves, ready: true });

    await get().simulate();
  },

  async simulate() {
    const world = get().world;
    if (!world) return;
    const result = await simulationService.run(world, clock);
    const graves = await graveService.listGraves();

    let message: string | null = null;
    if (result.newWeeds > 0) {
      message = `Sono spuntate erbacce su ${result.newWeeds} ${
        result.newWeeds === 1 ? 'tomba' : 'tombe'
      }.`;
    } else if (result.witheredFlowers > 0) {
      message = 'Alcuni fiori sono ormai cenere.';
    }

    if (result.ghostGraveId) {
      const ghost = graves.find((g) => g.id === result.ghostGraveId);
      if (ghost) {
        message = `Stanotte qualcuno è tornato vicino a ${ghost.name}.`;
        await notificationService.notifyGhost(ghost.name);
      }
    }

    set({ world: result.world, graves, lastSimMessage: message });
    await notificationService.rescheduleAll();
  },

  async bury(draft) {
    const { grave, xpAwarded } = await graveService.bury(draft, clock);
    const progression = addXp(get().progression, xpAwarded);
    await persistProgression(progression);
    const graves = await graveService.listGraves();
    set({ graves, progression });
    await notificationService.rescheduleAll();
    return grave;
  },

  async bringFlowers(graveId) {
    const { xpAwarded } = await graveService.bringFlowers(graveId, clock);
    const progression = xpAwarded > 0 ? addXp(get().progression, xpAwarded) : get().progression;
    if (xpAwarded > 0) await persistProgression(progression);
    const graves = await graveService.listGraves();
    set({ graves, progression });
  },

  async cleanWeeds(graveId) {
    const { xpAwarded } = await graveService.cleanWeeds(graveId, clock);
    const progression = xpAwarded > 0 ? addXp(get().progression, xpAwarded) : get().progression;
    if (xpAwarded > 0) await persistProgression(progression);
    const graves = await graveService.listGraves();
    set({ graves, progression });
    await notificationService.rescheduleAll();
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
