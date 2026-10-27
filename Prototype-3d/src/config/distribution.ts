// Profili di distribuzione: decidono l'accesso commerciale con cui parte il
// gioco, separati dalla modalità di build di Vite (una build di produzione
// non vuol dire Demo). Il profilo lo sceglie vite.config.ts (variabile
// VITE_DISTRIBUTION) e arriva qui come __DISTRIBUTION__:
// - `beta-full`: TestFlight e beta del Play Store (e il sito). Accesso Full
//   dato dalla distribuzione, niente acquisti in-app, niente limiti Demo.
//   È l'unico profilo attivo per ora (Milestone 1).
// - `store-release`: la futura release pubblica. Si parte in Demo e l'accesso
//   Full arriverà dagli store (Milestone 2): la build si rifiuta senza un
//   consenso esplicito (ALLOW_STORE_RELEASE=1).
// - `development`: il server di sviluppo. Accesso Full, ma Demo e Full si
//   possono simulare per i test (?access=demo).
// Accesso commerciale e progressione restano due cose diverse: qui non c'è
// nulla su ranghi, XP o oggetti posseduti (vedi game/entitlement.ts e rules.ts).

/** Accesso commerciale: `demo` (gratuito) o `full` (la versione completa). */
export type Access = 'demo' | 'full';

export type DistributionProfile = 'beta-full' | 'store-release' | 'development';

export interface ProfileConfig {
  id: DistributionProfile;
  /** L'accesso con cui si parte, prima di sentire gli store. */
  initialAccess: Access;
  /** Acquisti in-app: nessun profilo li ha ancora (Milestone 2). */
  iap: boolean;
  /** Accetta l'accesso riconosciuto dagli store (Milestone 2). */
  storeEntitlements: boolean;
  /** Con accesso Demo valgono i limiti della Demo (DEMO_LIMITS). */
  demoLimits: boolean;
  /** Demo e Full si possono simulare (solo per i test, mai in una build distribuita). */
  simulateAccess: boolean;
}

export const PROFILES: Record<DistributionProfile, ProfileConfig> = {
  'beta-full': { id: 'beta-full', initialAccess: 'full', iap: false, storeEntitlements: false, demoLimits: false, simulateAccess: false },
  'store-release': { id: 'store-release', initialAccess: 'demo', iap: false, storeEntitlements: true, demoLimits: true, simulateAccess: false },
  development: { id: 'development', initialAccess: 'full', iap: false, storeEntitlements: false, demoLimits: true, simulateAccess: true },
};

export const isProfile = (v: unknown): v is DistributionProfile => typeof v === 'string' && v in PROFILES;

/**
 * I limiti della Demo futura (Milestone 2). Valgono solo con accesso Demo in
 * un profilo che li prevede: mai nella beta.
 */
export const DEMO_LIMITS = {
  /** Tombe personali nel cimitero (le tombe del vecchio custode non contano: vedi personalGraves in rules.ts). */
  maxPersonalGraves: 5,
  /** XP, rango e fuochi fatui restano: passando alla Full non si azzera nulla. */
  keepProgress: true,
} as const;

/** Iniettato da vite.config.ts; fuori da Vite (i test in Node) non c'è e vale la beta. */
declare const __DISTRIBUTION__: string | undefined;
const injected = typeof __DISTRIBUTION__ === 'undefined' ? undefined : __DISTRIBUTION__;

let current: ProfileConfig = PROFILES[isProfile(injected) ? injected : 'beta-full'];

/** Il profilo con cui gira il gioco. */
export const distribution = (): ProfileConfig => current;

/** Solo per i test: gira con un altro profilo (restituisce quello di prima). */
export function useProfileForTests(id: DistributionProfile): DistributionProfile {
  const before = current.id;
  current = PROFILES[id];
  return before;
}
