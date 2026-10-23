// Promemoria da mandare come notifiche quando il gioco è chiuso, perché il
// giocatore lo riapra il giorno giusto: gli anniversari (che premiano solo
// se si apre il gioco quel giorno) e le tombe trascurate che stanno per
// rompersi. Funzione pura: chi la usa (app/reminders.ts) li consegna alle
// notifiche locali di Capacitor.

import { DECAY } from './balance.ts';
import { anniversariesBetween } from './simulation.ts';
import type { SaveData } from './state.ts';
import { DAY_MS, isoDate } from './time.ts';

export type ReminderKind = 'anniversary' | 'breaking';

export interface Reminder {
  /** Stabile per giorno e tipo (ripianificando, la stessa notifica non si duplica). */
  id: number;
  kind: ReminderKind;
  at: Date;
  title: string;
  body: string;
}

/** Ore locali dei promemoria: gli anniversari al mattino, le tombe a fine giornata (c'è ancora tempo). */
export const REMINDER_HOURS: Record<ReminderKind, number> = { anniversary: 10, breaking: 18 };

const list = (names: string[]) => (names.length <= 2 ? names.join(' e ') : `${names.slice(0, 2).join(', ')} e altri ${names.length - 2}`);

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
    // trascurata: il giorno prima che si rompa
    if ((g.dirty || g.weeds) && !g.broken && g.dirtySince) {
      const breaks = new Date(new Date(g.dirtySince).getTime() + DECAY.graveBreakDays * DAY_MS);
      add('breaking', new Date(breaks.getTime() - DAY_MS), g.name);
    }
  }
  const out: Reminder[] = [...byDay.values()].map(({ kind, day, names }) => {
    const n = names.length;
    const id = (kind === 'anniversary' ? 1 : 2) * 1_000_000 + Math.floor(day.getTime() / DAY_MS) % 1_000_000;
    return kind === 'anniversary'
      ? { id, kind, at: day, title: n === 1 ? `Oggi è l’anniversario di ${names[0]}` : `Oggi ricorrono ${n} anniversari`, body: n === 1 ? 'Passa al cimitero a ricordarlo: solo oggi.' : `${list(names)}: passa al cimitero a ricordarli, solo oggi.` }
      : { id, kind, at: day, title: n === 1 ? `La tomba di ${names[0]} sta per rompersi` : `${n} tombe stanno per rompersi`, body: n === 1 ? 'Da domani sarà rotta: una pulita e torna come nuova.' : `${list(names)}: da domani saranno rotte, passa a pulirle.` };
  });
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max);
}
