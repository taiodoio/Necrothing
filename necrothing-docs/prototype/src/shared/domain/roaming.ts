// Tipi di dominio per le entità erranti (NPC e creature). Condivisi tra il
// livello UI (hook di movimento) e la simulazione (che ne richiede lo spawn).

export const ROAMING_KINDS = [
  'ghost',
  'cat',
  'crow',
  'gravedigger',
  'priest',
  'rat',
] as const;
export type RoamingKind = (typeof ROAMING_KINDS)[number];

/** Richiesta di comparsa generata dalla simulazione. */
export interface RoamingSpawn {
  kind: RoamingKind;
  /** Tomba di riferimento (es. fantasma/benedizione), se pertinente. */
  graveId?: string;
}

export const ROAMING_LABELS: Record<RoamingKind, string> = {
  ghost: 'Fantasma',
  cat: 'Gatto nero',
  crow: 'Corvo',
  gravedigger: 'Becchino',
  priest: 'Prete',
  rat: 'Topo',
};
