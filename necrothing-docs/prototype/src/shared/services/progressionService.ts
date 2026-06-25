// Logica di progressione: XP, ranghi, prestigio. Vedi docs/game-design/03.

import type { Grave, UserProgression } from '@/shared/domain/types';

export interface Rank {
  level: number;
  name: string;
  minXp: number;
}

export const RANKS: Rank[] = [
  { level: 1, name: 'Angelo Custode degli Oggetti', minXp: 0 },
  { level: 2, name: 'Rottamatore Novizio', minXp: 500 },
  { level: 3, name: 'Becchino del Silicio', minXp: 1500 },
  { level: 4, name: 'Tristo Mietitore Quotidiano', minXp: 3500 },
  { level: 5, name: 'Lord of Decay', minXp: 7000 },
];

export const XP_VALUES = {
  burialPhysical: 100,
  burialAbstract: 50,
  flowers: 10,
  weedCleaned: 5,
  share: 25,
  anniversary: 30,
  ghost: 40,
  blessing: 20,
} as const;

export function rankForXp(xp: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) current = r;
  }
  return current;
}

export function nextRank(xp: number): Rank | null {
  return RANKS.find((r) => r.minXp > xp) ?? null;
}

/** Progresso [0,1] verso il rango successivo. */
export function rankProgress(xp: number): number {
  const cur = rankForXp(xp);
  const next = nextRank(xp);
  if (!next) return 1;
  const span = next.minXp - cur.minXp;
  return span <= 0 ? 1 : (xp - cur.minXp) / span;
}

/** Prestigio qualitativo del cimitero. */
export function computePrestige(graves: Grave[]): number {
  const count = graves.length;
  const decorationScore = graves.filter((g) => g.hasFlowers).length * 2;
  const cleanlinessScore = graves.filter((g) => !g.hasWeeds).length;
  const variety = new Set(graves.map((g) => g.category)).size * 3;
  return count * 2 + decorationScore + cleanlinessScore + variety;
}

export function addXp(progression: UserProgression, amount: number): UserProgression {
  return { ...progression, xp: progression.xp + amount };
}

/** Limite: una sola sepoltura di oggetto astratto al giorno. */
export function canBuryAbstract(progression: UserProgression, todayIso: string): boolean {
  return progression.lastAbstractBurialDate !== todayIso;
}

/** Limite: una sola condivisione premiata al giorno. */
export function canShareForXp(progression: UserProgression, todayIso: string): boolean {
  return progression.lastShareDate !== todayIso;
}
