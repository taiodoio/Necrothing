// Implementazione web dell'adapter notifiche (Notification API).
// Limitazione nota: il browser non garantisce notifiche schedulate in
// background senza Push API; lo scheduling è best-effort via setTimeout
// finché la pagina è viva. L'adapter nativo Capacitor coprirà il caso reale.

import type {
  LocalNotificationsAdapter,
  PermissionState,
  ScheduledNotification,
} from './notificationAdapter';

function mapPermission(p: NotificationPermission): PermissionState {
  if (p === 'granted') return 'granted';
  if (p === 'denied') return 'denied';
  return 'prompt';
}

const timers = new Map<number, ReturnType<typeof setTimeout>>();

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export const webNotificationAdapter: LocalNotificationsAdapter = {
  async checkPermission(): Promise<PermissionState> {
    if (!supported()) return 'denied';
    return mapPermission(Notification.permission);
  },

  async requestPermission(): Promise<PermissionState> {
    if (!supported()) return 'denied';
    const result = await Notification.requestPermission();
    return mapPermission(result);
  },

  async schedule(notifications: ScheduledNotification[]): Promise<void> {
    if (!supported() || Notification.permission !== 'granted') return;
    for (const n of notifications) {
      const delay = n.at ? n.at.getTime() - Date.now() : 0;
      // Solo best-effort entro ~24h mentre la pagina è aperta.
      if (delay <= 0) {
        new Notification(n.title, { body: n.body });
      } else if (delay < 24 * 60 * 60 * 1000) {
        const t = setTimeout(() => {
          new Notification(n.title, { body: n.body });
          timers.delete(n.id);
        }, delay);
        timers.set(n.id, t);
      }
    }
  },

  async cancel(ids: number[]): Promise<void> {
    for (const id of ids) {
      const t = timers.get(id);
      if (t) {
        clearTimeout(t);
        timers.delete(id);
      }
    }
  },

  async showNow(title: string, body: string): Promise<void> {
    if (!supported() || Notification.permission !== 'granted') return;
    new Notification(title, { body });
  },
};
