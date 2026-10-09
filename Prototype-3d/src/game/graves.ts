// Dominio delle tombe: categorie, cause di morte, tipi di lapide.
// Etichette in italiano, identiche alla PWA React.

export const CATEGORIES = [
  'electronics', 'plants', 'clothing', 'household', 'toys',
  'tools', 'vehicles', 'expensive', 'abstract', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  electronics: 'Elettronica',
  plants: 'Piante',
  clothing: 'Abbigliamento',
  household: 'Casalinghi',
  toys: 'Giocattoli',
  tools: 'Strumenti',
  vehicles: 'Veicoli',
  expensive: 'Oggetti costosi',
  abstract: 'Cose astratte',
  other: 'Altro',
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

export const DEATH_CAUSE_LABELS: Record<DeathCause, string> = {
  planned_obsolescence: 'Obsolescenza programmata',
  fatal_fall: 'Caduta fatale',
  water_damage: 'Acqua dove non doveva esserci acqua',
  purifying_fire: 'Fuoco purificatore',
  owner_negligence: 'Negligenza del padrone',
  cat_intervention: 'Intervento del gatto',
  unsupervised_child: 'Bambino non supervisionato',
  mystery: 'Mistero della fede',
  natural_wear: 'Usura naturale',
  battery_betrayal: 'Tradimento della batteria',
  final_update: 'Aggiornamento software finale',
  broken_cable: 'Cavo spezzato',
  eternal_black_screen: 'Schermo nero eterno',
};

export const GRAVE_TYPES = [
  'stone_simple', 'rectangular', 'gothic', 'celtic_cross', 'marble_cross',
  'angel', 'obelisk', 'family_memorial', 'decorated_monument', 'victorian',
] as const;
export type GraveType = (typeof GRAVE_TYPES)[number];

export const GRAVE_TYPE_LABELS: Record<GraveType, string> = {
  stone_simple: 'Lapide arrotondata',
  rectangular: 'Lapide rettangolare',
  gothic: 'Lapide gotica',
  celtic_cross: 'Croce celtica',
  marble_cross: 'Croce in marmo',
  angel: 'Monumento con angelo',
  obelisk: 'Obelisco',
  family_memorial: 'Memoriale di famiglia',
  decorated_monument: 'Monumento decorato',
  victorian: 'Lapide vittoriana',
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
  clean: 'In ordine',
  flowers: 'Ricordata con fiori',
  dirty: 'Trascurata',
  broken: 'Rotta: va riparata',
};
