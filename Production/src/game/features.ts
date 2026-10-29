// Le funzionalità del gioco con il loro accesso commerciale (Demo o Full),
// accanto agli oggetti (catalog.ts), alla Casa (house.ts), alle lapidi
// (graves.ts) e all'aspetto (look.ts). Molte arrivano con un oggetto: allora
// l'accesso è quello dell'oggetto (`via`) e il controllo lo fanno le regole di
// acquisto. Nella beta tutte sono accessibili; lo sblocco (rango, tombe,
// traguardi) vale comunque.

import type { Access } from '../config/distribution.ts';

export interface FeatureDef {
  id: string;
  access: Access;
  /** L'oggetto del catalogo che la porta (il suo accesso decide). */
  via?: string;
  /** Scelta non ancora definitiva (vedi docs/distribuzione-e-accesso.md). */
  pending?: boolean;
}

export const FEATURES: readonly FeatureDef[] = [
  { id: 'burial', access: 'demo' },
  { id: 'photos', access: 'demo' },
  { id: 'postcards', access: 'demo' },
  { id: 'registry', access: 'demo' },
  { id: 'keeperLook', access: 'demo' },
  { id: 'keeperHouse', access: 'demo' },
  { id: 'backup', access: 'demo' },
  { id: 'reminders', access: 'demo' },
  { id: 'bike', access: 'demo', via: 'bike' },
  { id: 'memoryTree', access: 'full', via: 'memory_tree' },
  { id: 'businesses', access: 'full', via: 'zombie_bar' },
  { id: 'gravedigger', access: 'full', via: 'gravedigger_house' },
  { id: 'vampireBite', access: 'full', via: 'vampire_crypt' },
  { id: 'broomFlight', access: 'full', via: 'broom' },
  { id: 'mysticStaff', access: 'full', via: 'mystic_staff' },
  // l'ampliamento del recinto si sblocca col prestigio: per la Demo manca ancora una decisione
  { id: 'expansion', access: 'demo', pending: true },
];

export const featureDef = (id: string) => FEATURES.find((f) => f.id === id);
