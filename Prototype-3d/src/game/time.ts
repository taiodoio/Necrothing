// Tempo reale: fasi del giorno, stagioni, differenze in giorni.

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const DAY_MS = 86_400_000;

export function dayPhaseForHour(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

export function seasonForMonth(month0: number): Season {
  if (month0 >= 2 && month0 <= 4) return 'spring';
  if (month0 >= 5 && month0 <= 7) return 'summer';
  if (month0 >= 8 && month0 <= 10) return 'autumn';
  return 'winter';
}

/** Giorni interi trascorsi tra due istanti (troncati verso il basso). */
export function daysBetween(from: Date | string, to: Date | string): number {
  const a = typeof from === 'string' ? new Date(from) : from;
  const b = typeof to === 'string' ? new Date(to) : to;
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DAY_PHASE_LABELS: Record<DayPhase, string> = {
  dawn: 'Alba',
  day: 'Giorno',
  dusk: 'Crepuscolo',
  night: 'Notte',
};
