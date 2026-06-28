// Espansione del cimitero (Fase H): il terreno utilizzabile cresce col
// prestigio. Puro e testabile: data una soglia di prestigio, indica quante
// righe sono sbloccate, il tier corrente e quanto manca al prossimo.

import { MAP_ROWS } from '@/shared/domain/types';
import { EXPANSION } from '@/shared/domain/balance';

export interface ExpansionTier {
  minPrestige: number;
  rows: number;
  label: string;
}

export interface ExpansionState {
  /** Indice del tier corrente (0-based). */
  level: number;
  /** Righe della mappa attualmente utilizzabili (≤ MAP_ROWS). */
  rows: number;
  /** Etichetta del tier corrente. */
  label: string;
  /** Prossimo tier da sbloccare, o null se al massimo. */
  next: ExpansionTier | null;
  /** Prestigio mancante al prossimo tier (0 se al massimo). */
  toNext: number;
}

const TIERS: readonly ExpansionTier[] = EXPANSION.tiers;

/** Stato di espansione per un dato prestigio. */
export function expansionFor(prestige: number): ExpansionState {
  let level = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (prestige >= TIERS[i].minPrestige) level = i;
  }
  const current = TIERS[level];
  const next = level < TIERS.length - 1 ? TIERS[level + 1] : null;
  return {
    level,
    rows: Math.min(current.rows, MAP_ROWS),
    label: current.label,
    next,
    toNext: next ? Math.max(0, next.minPrestige - prestige) : 0,
  };
}

/** Righe utilizzabili della mappa per un dato prestigio. */
export function usableRows(prestige: number): number {
  return expansionFor(prestige).rows;
}
