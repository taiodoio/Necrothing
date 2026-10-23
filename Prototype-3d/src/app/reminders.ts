// Le notifiche locali dell'app (Capacitor LocalNotifications): ogni volta che
// il gioco va in pausa si ripianificano i promemoria (game/reminders.ts).
// Nel browser non c'è niente da mandare: la pianificazione resta leggibile
// (la pagina di misura la mostra) ma non parte nessuna notifica.

import { planReminders, type Reminder } from '../game/reminders.ts';
import type { SaveData } from '../game/state.ts';
import { nativePlugins } from './platform.ts';

/** Le notifiche ci sono (siamo nell'app, col plugin). */
export const remindersAvailable = () => !!nativePlugins()?.LocalNotifications;

/** Chiede il permesso al sistema; true se concesso. */
export async function askReminderPermission(): Promise<boolean> {
  const ln = nativePlugins()?.LocalNotifications;
  if (!ln) return false;
  try {
    const now = await ln.checkPermissions();
    if (now.display === 'granted') return true;
    return (await ln.requestPermissions()).display === 'granted';
  } catch { return false; }
}

/** I nostri id (vedi planReminders): si cancellano solo questi, non le notifiche d'altro. */
const ours = (id: number) => id >= 1_000_000 && id < 3_000_000;

let planned: Reminder[] = [];
/** L'ultima pianificazione (anche nel browser, per controllarla). */
export const plannedReminders = () => planned;

/** Ripianifica: cancella i promemoria in attesa e mette quelli di adesso (se il giocatore li vuole). */
export async function syncReminders(s: SaveData, now: Date) {
  planned = s.settings.reminders === false ? [] : planReminders(s, now);
  const ln = nativePlugins()?.LocalNotifications;
  if (!ln || s.settings.reminders !== true) return;
  try {
    if ((await ln.checkPermissions()).display !== 'granted') return;
    const pending = (await ln.getPending()).notifications.filter((n) => ours(n.id));
    if (pending.length) await ln.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
    if (planned.length) await ln.schedule({ notifications: planned.map((r) => ({ id: r.id, title: r.title, body: r.body, schedule: { at: r.at, allowWhileIdle: true } })) });
  } catch (e) {
    console.warn('Promemoria non pianificati', e);
  }
}

/** Spenti dal giocatore: via quelli in attesa. */
export async function clearReminders() {
  planned = [];
  const ln = nativePlugins()?.LocalNotifications;
  if (!ln) return;
  try {
    const pending = (await ln.getPending()).notifications.filter((n) => ours(n.id));
    if (pending.length) await ln.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
  } catch { /* niente da cancellare */ }
}
