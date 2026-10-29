// Tipi e misure comuni del rendering (modelli low-poly, luci, personaggi).

import type * as THREE from 'three';

/** Un'unità di design vale un decimo di cella (1 cella = 1 unità mondo). */
export const VOX = 0.1;

/** I gruppi di geometria di un modello: ognuno ha il suo materiale. */
export type Bucket = 'solid' | 'glow' | 'water' | 'ghost' | 'gloss';

/** La geometria di un modello, un gruppo per materiale. */
export type BucketGeometries = Partial<Record<Bucket, THREE.BufferGeometry>>;

/** Una luce portata da un modello. */
export interface LightAnchor {
  pos: [number, number, number]; // unità di design nel modello
  color: string;
  intensity: number;
  range: number; // unità mondo
  flicker: number; // 0 = fissa
  /** Mostra un alone (sprite additivo). */
  halo: number;
  /** Guasto della luce: 1 = sporca (tremola un po' di più, ogni tanto cala), 2 = rotta (si spegne e riaccende a raffiche). */
  fault?: number;
}

/** Parametri visivi di un oggetto piazzato (derivati dallo stato di gioco). */
export interface PVis {
  type: string;
  variant: number;
  dirty: boolean;
  broken: boolean;
  lit: boolean;
  seed: number;
  /** Pezzo d'angolo a L (staccionate, inferriate, muretti con due vicini su lati diversi). */
  corner?: boolean;
}
