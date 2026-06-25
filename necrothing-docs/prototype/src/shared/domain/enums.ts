// Dominio: enumerazioni di gioco. Tutte le label sono in italiano (i18n futura).

export const CATEGORIES = [
  'electronics',
  'plants',
  'clothing',
  'household',
  'toys',
  'tools',
  'vehicles',
  'expensive',
  'abstract',
  'other',
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

export const DEATH_CAUSES = [
  'planned_obsolescence',
  'fatal_fall',
  'water_damage',
  'purifying_fire',
  'owner_negligence',
  'cat_intervention',
  'unsupervised_child',
  'mystery',
  'natural_wear',
  'battery_betrayal',
  'final_update',
  'broken_cable',
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
  'wood_cross',
  'stone_simple',
  'gothic',
  'broken',
  'angel',
  'obelisk',
] as const;
export type GraveType = (typeof GRAVE_TYPES)[number];

export const GRAVE_TYPE_LABELS: Record<GraveType, string> = {
  wood_cross: 'Croce in legno',
  stone_simple: 'Lapide semplice',
  gothic: 'Lapide gotica',
  broken: 'Lapide spezzata',
  angel: 'Lapide con angelo',
  obelisk: 'Obelisco',
};

export const WEATHER = [
  'gloomy_clear',
  'fog',
  'rain',
  'storm',
  'wind',
  'snow',
  'full_moon',
] as const;
export type Weather = (typeof WEATHER)[number];

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export const DAY_PHASES = ['dawn', 'day', 'dusk', 'night'] as const;
export type DayPhase = (typeof DAY_PHASES)[number];

export const DECORATION_TYPES = [
  'candle',
  'wreath',
  'mushroom',
  'dead_tree',
  'skull',
  'lantern',
] as const;
export type DecorationType = (typeof DECORATION_TYPES)[number];

export const DECORATION_LABELS: Record<DecorationType, string> = {
  candle: 'Candela',
  wreath: 'Corona funebre',
  mushroom: 'Funghi',
  dead_tree: 'Albero secco',
  skull: 'Teschio',
  lantern: 'Lanterna',
};

/** Rango minimo richiesto per sbloccare ogni decorazione. */
export const DECORATION_MIN_RANK: Record<DecorationType, number> = {
  candle: 1,
  wreath: 1,
  mushroom: 2,
  dead_tree: 2,
  skull: 3,
  lantern: 3,
};

export const MEMORY_EVENT_TYPES = [
  'burial',
  'flower',
  'weed_cleaned',
  'anniversary',
  'ghost',
  'blessing',
] as const;
export type MemoryEventType = (typeof MEMORY_EVENT_TYPES)[number];
