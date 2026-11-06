// Cripte e case del villaggio: le cripte storiche occupano 4 × 5 celle;
// le cinque case usano il generatore compatto 4 × 3, con gli stessi stati del gioco.

import type { PVis } from '../types.ts';
import { decayLP } from './lights.ts';
import { LP, type LPModel } from './kit.ts';
import { BUILDINGS } from './cryptBuildings.ts';
import { yard } from './cryptYards.ts';
import type { CryptCtx } from './cryptKit.ts';
import { VILLAGE_FAMILIES } from './villageHousesNew.ts';
import { villageLP } from './villageModels.ts';

export const CRYPT_FAMILIES = ['zombie', 'ghost', 'skeleton', 'nature', 'witch', ...VILLAGE_FAMILIES] as const;
export type CryptFamily = (typeof CRYPT_FAMILIES)[number];
/** Quante versioni ha ogni famiglia (la numero 0 è la «principale»: quella che si vede in Bottega). */
export const CRYPT_VARIANTS = 3;
/** Ingombro delle cripte storiche; per le case fa fede il catalogo. */
export const CRYPT_FOOTPRINT: [number, number] = [4, 5];
/** Gli id del catalogo: `crypt_zombie`, `crypt_ghost`… */
export const CRYPT_TYPES: readonly string[] = CRYPT_FAMILIES.map((f) => `crypt_${f}`);
export const isCrypt = (type: string) => CRYPT_TYPES.includes(type);

/** Il corpo sta nella metà posteriore del lotto: la metà davanti è il cortile da vivere. */
const BODY_Z = -0.85;

/** Luci: poche e fisse, una per gruppo di candele (non una per ogni fiammella). */
const LIGHTS: Partial<Record<CryptFamily, Array<[number, number, number, string, number, number, number, number, 'body' | 'yard']>>> = {
  zombie: [[-0.49, 0.32, 1.04, '#a7ca77', 0.52, 3, 0.24, 0.5, 'body'], [0.48, 0.32, 1.04, '#a7ca77', 0.52, 3, 0.24, 0.5, 'body']],
  // la lanterna alla porta e quella del lampione hanno la loro luce (hangingLantern)
  ghost: [],
  skeleton: [[-1.05, 0.3, 0.95, '#f2ac58', 0.52, 3, 0.25, 0.5, 'body'], [1.05, 0.3, 0.95, '#f2ac58', 0.52, 3, 0.25, 0.5, 'body']],
  nature: [[-0.51, 0.35, 1.11, '#e3bb70', 0.52, 3, 0.25, 0.5, 'body'], [0.51, 0.35, 1.11, '#e3bb70', 0.52, 3, 0.25, 0.5, 'body']],
  witch: [[0, 0.75, 1.18, '#9af06a', 0.7, 4, 0.22, 0.7, 'yard'], [0, 0.6, 0.85, '#b8f08a', 0.45, 2.6, 0.2, 0.45, 'body']],
};

export function cryptLP(v: PVis): LPModel {
  const family = v.type.slice('crypt_'.length) as CryptFamily;
  if (family === 'ghost' || (VILLAGE_FAMILIES as readonly string[]).includes(family)) return villageLP(v);
  const variant = ((((Math.floor(v.variant) % CRYPT_VARIANTS) + CRYPT_VARIANTS) % CRYPT_VARIANTS) + 1) as 1 | 2 | 3;
  const lp = new LP(`lp:${v.type}:${variant}:${v.seed}:${+v.dirty}${+v.broken}`);
  const c: CryptCtx = { lp, v, family, variant, lit: v.lit && !v.broken };
  lp.push([0, 0, BODY_Z]);
  BUILDINGS[family as keyof typeof BUILDINGS](c);
  lp.pop();
  // senza recinto: il cortile si apre sul prato, e più case vicine fanno un villaggetto
  yard(c);
  if (c.lit) {
    for (const [x, y, z, color, intensity, range, flicker, halo, area] of LIGHTS[family] ?? []) {
      lp.push([0, 0, area === 'body' ? BODY_Z : 0]).light(x, y, z, color, intensity, range, flicker, halo).pop();
    }
  }
  decayLP(lp, v, 3.4, 4.4);
  return lp.build();
}

