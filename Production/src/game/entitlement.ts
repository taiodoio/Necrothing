// L'accesso commerciale effettivo (Demo o Full), in un posto solo. Le regole
// (rules.ts) lo chiedono qui; le schermate non decidono mai da sole cosa si
// può comprare, usano i risultati delle regole.
//
// Da dove arriva:
// - dal profilo di distribuzione (config/distribution.ts): nella beta è Full;
// - in futuro dagli store (Milestone 2): receiveStoreAccess, solo nei profili
//   che lo prevedono;
// - nel profilo `development`, da una simulazione per i test.
//
// Non è un progresso del giocatore: non sta nel salvataggio né nel backup, e
// non tocca XP, rango, fuochi fatui o oggetti posseduti.

import { DEMO_LIMITS, distribution, type Access } from '../config/distribution.ts';

export type { Access } from '../config/distribution.ts';

export type AccessSource = 'distribution' | 'store' | 'simulated';

export interface Entitlement {
  access: Access;
  source: AccessSource;
}

/**
 * Chi riconoscerà gli acquisti (StoreKit, Play Billing: Milestone 2). Qui c'è
 * solo la forma: nessun pagamento, nemmeno finto.
 */
export interface StoreAccessProvider {
  /** L'accesso riconosciuto dallo store (null: non ancora noto). */
  current(): Promise<Access | null>;
}

let fromStore: Access | null = null;
let simulated: Access | null = null;

/** L'accesso commerciale effettivo, e da dove viene. */
export function entitlement(): Entitlement {
  const p = distribution();
  if (p.simulateAccess && simulated) return { access: simulated, source: 'simulated' };
  if (p.storeEntitlements && fromStore) return { access: fromStore, source: 'store' };
  return { access: p.initialAccess, source: 'distribution' };
}

/** Un elemento che richiede questo accesso è commercialmente disponibile? (`demo` vale anche per chi ha la Full). */
export function hasAccess(required: Access): boolean {
  return required === 'demo' || entitlement().access === 'full';
}

/** Valgono i limiti della Demo (mai nella beta). */
export function demoLimitsActive(): boolean {
  return distribution().demoLimits && entitlement().access === 'demo';
}

/** Il limite di tombe personali in vigore (null: nessun limite). */
export function personalGraveLimit(): number | null {
  return demoLimitsActive() ? DEMO_LIMITS.maxPersonalGraves : null;
}

/** Accesso riconosciuto dallo store: ascoltato solo dai profili che lo prevedono (oggi nessuno attivo). */
export function receiveStoreAccess(access: Access | null): boolean {
  if (!distribution().storeEntitlements) return false;
  fromStore = access;
  return true;
}

/** Simula Demo o Full (null: niente simulazione). Solo nel profilo `development`: altrove è ignorata. */
export function simulateAccess(access: Access | null): boolean {
  if (!distribution().simulateAccess) return false;
  simulated = access;
  return true;
}
