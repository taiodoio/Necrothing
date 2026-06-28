// Logica di progressione: XP, ranghi, prestigio. Vedi docs/game-design/03.

import type { Grave, UserProgression } from '@/shared/domain/types';
import { MAUSOLEUM_PRESTIGE } from '@/shared/domain/balance';

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

// Fuochi fatui (moneta) guadagnati dalle azioni.
export const WISP_VALUES = {
  burial: 5,
  flowers: 1,
  weedCleaned: 3,
  anniversary: 5,
  blessing: 3,
  collect: 1, // raccolta di un fuoco fatuo sulla mappa
  ghost: 2, // fantasma scacciato/avvistato
  cat: 2, // gatto nero accarezzato
  rat: 1, // topo scacciato
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
export function computePrestige(
  graves: Grave[],
  decorationCount = 0,
  extra: { hasMausoleum?: boolean; zoneScore?: number } = {},
): number {
  const count = graves.length;
  const flowerScore = graves.filter((g) => g.hasFlowers).length * 2;
  const decorationScore = decorationCount * 2;
  const cleanlinessScore = graves.filter((g) => !g.hasWeeds && !g.isDirty).length;
  const variety = new Set(graves.map((g) => g.category)).size * 3;
  const mausoleumScore = extra.hasMausoleum ? MAUSOLEUM_PRESTIGE : 0;
  const zoneScore = extra.zoneScore ?? 0;
  return (
    count * 2 + flowerScore + decorationScore + cleanlinessScore + variety + mausoleumScore + zoneScore
  );
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
