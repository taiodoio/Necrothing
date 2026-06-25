// NotificationService: permessi, preferenze, scheduling idempotente.
// Vedi specs/services/notification-service.md e docs/technical/03-notifications.md

import type { Grave, NotificationPreferences } from '@/shared/domain/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/shared/domain/types';
import { settingsRepository } from '@/shared/repositories/settingsRepository';
import { graveRepository } from '@/shared/repositories/graveRepository';
import type { ClockService } from '@/shared/utils/clock';
import { isWithinQuietHours, nextAnniversary } from '@/shared/utils/date';
import type {
  LocalNotificationsAdapter,
  PermissionState,
  ScheduledNotification,
} from './platform/notificationAdapter';

// ID stabili per categoria, così il reschedule è idempotente (cancel + set).
function anniversaryId(grave: Grave): number {
  // hash semplice e stabile dell'id tomba.
  let h = 0;
  for (let i = 0; i < grave.id.length; i++) h = (h * 31 + grave.id.charCodeAt(i)) | 0;
  return 1_000_000 + (Math.abs(h) % 1_000_000);
}
const WEED_REMINDER_ID = 10;

function quietOk(prefs: NotificationPreferences, when: Date): boolean {
  if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) return true;
  return !isWithinQuietHours(when, prefs.quietHoursStart, prefs.quietHoursEnd);
}

export function createNotificationService(
  adapter: LocalNotificationsAdapter,
  clock: ClockService,
) {
  return {
    checkPermission(): Promise<PermissionState> {
      return adapter.checkPermission();
    },

    requestPermission(): Promise<PermissionState> {
      return adapter.requestPermission();
    },

    async getPreferences(): Promise<NotificationPreferences> {
      const settings = await settingsRepository.get();
      return settings?.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES;
    },

    async updatePreferences(prefs: NotificationPreferences): Promise<void> {
      await settingsRepository.save({ id: 'singleton', notifications: prefs });
      await this.rescheduleAll();
    },

    /** Scheduling idempotente: cancella e ricalcola tutte le notifiche consentite. */
    async rescheduleAll(): Promise<void> {
      const prefs = await this.getPreferences();
      const graves = await graveRepository.getAll();

      // Cancella tutto ciò che potremmo aver schedulato.
      const allIds = [WEED_REMINDER_ID, ...graves.map(anniversaryId)];
      await adapter.cancel(allIds);

      if (!prefs.enabled) return;
      if ((await adapter.checkPermission()) !== 'granted') return;

      const toSchedule: ScheduledNotification[] = [];

      if (prefs.anniversaries) {
        for (const grave of graves) {
          const at = nextAnniversary(grave.deathDate, clock.now());
          if (quietOk(prefs, at)) {
            toSchedule.push({
              id: anniversaryId(grave),
              title: 'Un anniversario funebre',
              body: `Oggi ricorre l'anniversario della dipartita di ${grave.name}.`,
              at,
            });
          }
        }
      }

      if (prefs.weeds) {
        const weedy = graves.filter((g) => g.hasWeeds).length;
        if (weedy > 0) {
          const at = new Date(clock.now().getTime() + 60 * 60 * 1000); // tra 1h
          if (quietOk(prefs, at)) {
            toSchedule.push({
              id: WEED_REMINDER_ID,
              title: 'Il becchino ha contato le erbacce',
              body: `Le erbacce stanno reclamando ${weedy} ${weedy === 1 ? 'tomba' : 'tombe'}.`,
              at,
            });
          }
        }
      }

      await adapter.schedule(toSchedule);
    },

    async cancelAll(): Promise<void> {
      const graves = await graveRepository.getAll();
      await adapter.cancel([WEED_REMINDER_ID, ...graves.map(anniversaryId)]);
    },

    /** Notifica immediata per eventi rari (rispetta enabled + quiet hours). */
    async notifyGhost(graveName: string): Promise<void> {
      const prefs = await this.getPreferences();
      if (!prefs.enabled || !prefs.ghosts) return;
      if (!quietOk(prefs, clock.now())) return;
      await adapter.showNow('Stanotte qualcuno è tornato', `Un alito freddo sfiora ${graveName}.`);
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
