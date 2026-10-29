// Promemoria da mandare come notifiche quando il gioco è chiuso, perché il
// giocatore lo riapra il giorno giusto: gli anniversari (che premiano solo
// se si apre il gioco quel giorno) e, una volta sola, il giorno in cui più
// della metà delle tombe sarà trascurata (niente avvisi per ogni tomba: non
// si deve tornare ogni giorno). Funzione pura: chi la usa (app/reminders.ts)
// li consegna alle notifiche locali di Capacitor.

import { DECAY, HOUSE_PERKS, REMINDERS, SIM } from './balance.ts';
import { housePerk } from './house.ts';
import { anniversariesBetween } from './simulation.ts';
import type { SaveData } from './state.ts';
import { DAY_MS, isoDate } from './time.ts';
import { t } from '../i18n/index.ts';

export type ReminderKind = 'anniversary' | 'neglect';

export interface Reminder {
  /** Stabile per giorno e tipo (ripianificando, la stessa notifica non si duplica). */
  id: number;
  kind: ReminderKind;
  at: Date;
  title: string;
  body: string;
}

/** Ore locali dei promemoria: gli anniversari al mattino, il cimitero trascurato a fine giornata. */
export const REMINDER_HOURS: Record<ReminderKind, number> = { anniversary: 10, neglect: 18 };

/**
 * Quante tombe ci si aspetta trascurate (sporche, con le erbacce o rotte) fra
 * `days` giorni a gioco chiuso, con le stesse probabilità di runCatchUp: le
 * già trascurate contano 1, quelle coi fiori dal giorno in cui appassiscono,
 * le altre con la probabilità di erbacce o sporco in quei giorni.
 */
export function expectedNeglected(s: SaveData, now: Date, days: number): number {
  const flowerDays = housePerk(s, 'beehive') ? HOUSE_PERKS.beehiveFlowerDays : SIM.flowerWitherDays;
  const weedPace = housePerk(s, 'garden') ? HOUSE_PERKS.gardenWeeds : 1;
  const d = Math.min(days, DECAY.maxAbsenceDays); // oltre, a gioco chiuso il degrado non va avanti
  const at = now.getTime() + days * DAY_MS;
  let n = 0;
  for (const g of s.graves) {
    if (g.broken || g.dirty || g.weeds) { n++; continue; }
    if (g.hasFlowers && g.flowersAt) { if (new Date(g.flowersAt).getTime() + flowerDays * DAY_MS <= at) n++; continue; }
    n += 1 - (1 - Math.min(SIM.weedProbMax, SIM.weedProbPerDay * weedPace * d)) * (1 - Math.min(SIM.dirtProbMax, SIM.dirtProbPerDay * d));
  }
  return n;
}

/** «A e B», oppure «A, B e altri N». */
const list = (names: string[]) => (names.length < 2 ? names.join('')
  : names.length === 2 ? t('reminder.list.two', { a: names[0], b: names[1] })
  : t('reminder.list.more', { a: names[0], b: names[1], n: names.length - 2 }));

/**
 * I promemoria dei prossimi `days` giorni: uno al giorno per tipo al massimo
 * (più tombe lo stesso giorno finiscono nella stessa notifica), al più `max`
 * in tutto (iOS ne tiene 64 in attesa), i più vicini prima.
 */
export function planReminders(s: SaveData, now: Date, opts: { days?: number; max?: number } = {}): Reminder[] {
  const days = opts.days ?? 60, max = opts.max ?? 48;
  const until = new Date(now.getTime() + days * DAY_MS);
  const byDay = new Map<string, { kind: ReminderKind; day: Date; names: string[] }>();
  const add = (kind: ReminderKind, day: Date, name: string) => {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), REMINDER_HOURS[kind]);
    if (at.getTime() <= now.getTime() || at.getTime() > until.getTime()) return;
    const key = `${kind}:${isoDate(at)}`;
    const e = byDay.get(key) ?? { kind, day: at, names: [] };
    e.names.push(name);
    byDay.set(key, e);
  };
  for (const g of s.graves) {
    // gli anniversari non ancora festeggiati (quello di quest'anno, se è già stato, non torna)
    for (const at of anniversariesBetween(g.deathDate, now, until)) {
      if (g.lastAnniversaryYear !== null && g.lastAnniversaryYear >= at.getFullYear()) continue;
      add('anniversary', at, g.name);
    }
  }
  // il cimitero trascurato: una notifica sola, il giorno in cui più della metà delle tombe lo sarà
  // (se lo è già, lo si vede aprendo il gioco: niente notifica)
  const total = s.graves.length;
  if (total && expectedNeglected(s, now, 0) <= total * REMINDERS.neglectShare) {
    for (let d = 1; d <= DECAY.maxAbsenceDays + 1; d++) {
      if (expectedNeglected(s, now, d) > total * REMINDERS.neglectShare) { add('neglect', new Date(now.getTime() + d * DAY_MS), ''); break; }
    }
  }
  const out: Reminder[] = [...byDay.values()].map(({ kind, day, names }) => {
    const n = names.length;
    const id = (kind === 'anniversary' ? 1 : 2) * 1_000_000 + Math.floor(day.getTime() / DAY_MS) % 1_000_000;
    return kind === 'anniversary'
      ? { id, kind, at: day, title: n === 1 ? t('reminder.anniversary.titleOne', { name: names[0] }) : t('reminder.anniversary.titleMany', { n }), body: n === 1 ? t('reminder.anniversary.bodyOne') : t('reminder.anniversary.bodyMany', { names: list(names) }) }
      : { id, kind, at: day, title: t('reminder.neglect.title'), body: t('reminder.neglect.body') };
  });
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max);
}
