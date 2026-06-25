// ClockService: astrazione del tempo per testabilità.

export interface ClockService {
  now(): Date;
  nowIso(): string;
  todayIso(): string; // solo data YYYY-MM-DD
}

export const systemClock: ClockService = {
  now: () => new Date(),
  nowIso: () => new Date().toISOString(),
  todayIso: () => new Date().toISOString().slice(0, 10),
};

/** Clock fisso per i test. */
export function fixedClock(iso: string): ClockService {
  const fixed = new Date(iso);
  return {
    now: () => new Date(fixed),
    nowIso: () => fixed.toISOString(),
    todayIso: () => fixed.toISOString().slice(0, 10),
  };
}
