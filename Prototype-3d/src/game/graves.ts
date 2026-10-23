// Dominio delle tombe: categorie, cause di morte, tipi di lapide.
// Le etichette sono in src/i18n/it/game.ts (grave.*).

import { t } from '../i18n/index.ts';

export const CATEGORIES = [
  'electronics', 'plants', 'clothing', 'household', 'toys',
  'tools', 'vehicles', 'expensive', 'abstract', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  electronics: t('grave.category.electronics'),
  plants: t('grave.category.plants'),
  clothing: t('grave.category.clothing'),
  household: t('grave.category.household'),
  toys: t('grave.category.toys'),
  tools: t('grave.category.tools'),
  vehicles: t('grave.category.vehicles'),
  expensive: t('grave.category.expensive'),
  abstract: t('grave.category.abstract'),
  other: t('grave.category.other'),
};

export const CATEGORY_ICONS: Record<Category, string> = {
  electronics: '🔌', plants: '🪴', clothing: '🧦', household: '🍳', toys: '🧸',
  tools: '🔧', vehicles: '🚲', expensive: '💎', abstract: '💭', other: '📦',
};

export const DEATH_CAUSES = [
  'planned_obsolescence', 'fatal_fall', 'water_damage', 'purifying_fire',
  'owner_negligence', 'cat_intervention', 'unsupervised_child', 'mystery',
  'natural_wear', 'battery_betrayal', 'final_update', 'broken_cable',
  'eternal_black_screen',
] as const;
export type DeathCause = (typeof DEATH_CAUSES)[number];
/** Causa scelta: una di quelle pronte o «personalizza» (testo libero, in Grave.deathCauseText). */
export type CauseChoice = DeathCause | 'custom';
/** Lunghezza massima della causa scritta a mano. */
export const CUSTOM_CAUSE_MAX = 60;

export const DEATH_CAUSE_LABELS: Record<DeathCause, string> = {
  planned_obsolescence: t('grave.cause.plannedObsolescence'),
  fatal_fall: t('grave.cause.fatalFall'),
  water_damage: t('grave.cause.waterDamage'),
  purifying_fire: t('grave.cause.purifyingFire'),
  owner_negligence: t('grave.cause.ownerNegligence'),
  cat_intervention: t('grave.cause.catIntervention'),
  unsupervised_child: t('grave.cause.unsupervisedChild'),
  mystery: t('grave.cause.mystery'),
  natural_wear: t('grave.cause.naturalWear'),
  battery_betrayal: t('grave.cause.batteryBetrayal'),
  final_update: t('grave.cause.finalUpdate'),
  broken_cable: t('grave.cause.brokenCable'),
  eternal_black_screen: t('grave.cause.eternalBlackScreen'),
};

/** Etichetta della causa (quella scritta a mano, se personalizzata). */
export function deathCauseLabel(cause: CauseChoice | null | undefined, text?: string | null): string {
  if (!cause) return '—';
  return cause === 'custom' ? (text?.trim() || '—') : DEATH_CAUSE_LABELS[cause];
}

export const GRAVE_TYPES = [
  'stone_simple', 'rectangular', 'gothic', 'celtic_cross', 'marble_cross',
  'angel', 'obelisk', 'family_memorial', 'decorated_monument', 'victorian',
] as const;
export type GraveType = (typeof GRAVE_TYPES)[number];

export const GRAVE_TYPE_LABELS: Record<GraveType, string> = {
  stone_simple: t('grave.type.stoneSimple'),
  rectangular: t('grave.type.rectangular'),
  gothic: t('grave.type.gothic'),
  celtic_cross: t('grave.type.celticCross'),
  marble_cross: t('grave.type.marbleCross'),
  angel: t('grave.type.angel'),
  obelisk: t('grave.type.obelisk'),
  family_memorial: t('grave.type.familyMemorial'),
  decorated_monument: t('grave.type.decoratedMonument'),
  victorian: t('grave.type.victorian'),
};

/** Rango minimo per scegliere un tipo di lapide nel funnel di sepoltura. */
export const GRAVE_TYPE_MIN_RANK: Record<GraveType, number> = {
  stone_simple: 1, rectangular: 1, gothic: 1, celtic_cross: 2, marble_cross: 2,
  angel: 3, obelisk: 3, family_memorial: 4, decorated_monument: 4, victorian: 2,
};

export type GraveVisualState = 'clean' | 'flowers' | 'dirty' | 'broken';

export interface GraveLike {
  hasFlowers: boolean;
  weeds: boolean;
  dirty: boolean;
  broken: boolean;
}

/** Stato visivo esclusivo di una tomba (priorità: rotta > sporca > fiori > pulita). */
export function graveVisualState(g: GraveLike): GraveVisualState {
  if (g.broken) return 'broken';
  if (g.dirty || g.weeds) return 'dirty';
  if (g.hasFlowers) return 'flowers';
  return 'clean';
}

export const GRAVE_STATE_LABELS: Record<GraveVisualState, string> = {
  clean: t('grave.state.clean'),
  flowers: t('grave.state.flowers'),
  dirty: t('grave.state.dirty'),
  broken: t('grave.state.broken'),
};
