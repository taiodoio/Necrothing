// Helper date (ISO). Niente librerie esterne.

import type { DayPhase, Season } from '@/shared/domain/enums';

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isFutureDate(isoDate: string, now: Date): boolean {
  // confronto solo sulla data
  return isoDate > toIsoDate(now);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Prossima ricorrenza annuale di deathDate a partire da `from` (inclusa). */
export function nextAnniversary(deathDateIso: string, from: Date): Date {
  const death = new Date(deathDateIso);
  const candidate = new Date(from);
  candidate.setHours(9, 0, 0, 0);
  candidate.setMonth(death.getMonth());
  candidate.setDate(death.getDate());
  if (candidate.getTime() < from.getTime()) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

export function dayPhaseForHour(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

export function seasonForMonth(month0: number): Season {
  // month0: 0-11
  if (month0 >= 2 && month0 <= 4) return 'spring';
  if (month0 >= 5 && month0 <= 7) return 'summer';
  if (month0 >= 8 && month0 <= 10) return 'autumn';
  return 'winter';
}

/** "HH:mm" -> minuti dalla mezzanotte. */
export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** True se `now` è dentro la finestra quiet hours (gestisce wrap notturno). */
export function isWithinQuietHours(now: Date, startHHmm: string, endHHmm: string): boolean {
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = minutesOfDay(startHHmm);
  const end = minutesOfDay(endHHmm);
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  // wrap (es. 22:00 -> 08:00)
  return cur >= start || cur < end;
}
