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
  'willow',
] as const;
export type DecorationType = (typeof DECORATION_TYPES)[number];

export const DECORATION_LABELS: Record<DecorationType, string> = {
  candle: 'Candela',
  wreath: 'Corona funebre',
  mushroom: 'Funghi',
  dead_tree: 'Albero secco',
  skull: 'Teschio',
  lantern: 'Lanterna',
  willow: 'Salice piangente',
};

/** Rango minimo richiesto per sbloccare ogni decorazione. */
export const DECORATION_MIN_RANK: Record<DecorationType, number> = {
  candle: 1,
  wreath: 1,
  mushroom: 2,
  dead_tree: 2,
  skull: 3,
  lantern: 3,
  willow: 2,
};

// Elementi struttura piazzabili sulla mappa.
export const STRUCTURE_TYPES = [
  'path_dirt',
  'path_stone',
  'fence_wood',
  'fence_iron',
  'wall_stone',
  'lamp_post',
  'mausoleum',
] as const;
export type StructureType = (typeof STRUCTURE_TYPES)[number];

export const STRUCTURE_LABELS: Record<StructureType, string> = {
  path_dirt: 'Sentiero in terra',
  path_stone: 'Sentiero in pietra',
  fence_wood: 'Staccionata in legno',
  fence_iron: 'Recinzione in ferro',
  wall_stone: 'Muretto in pietra',
  lamp_post: 'Lampione',
  mausoleum: 'Mausoleo centrale',
};

// Temi delle zone tematiche del cimitero.
export const ZONE_THEMES = ['gothic', 'natural', 'tech'] as const;
export type ZoneTheme = (typeof ZONE_THEMES)[number];

export const ZONE_THEME_LABELS: Record<ZoneTheme, string> = {
  gothic: 'Quartiere Gotico',
  natural: 'Boschetto Naturale',
  tech: 'Settore Tecnologico',
};

// Categoria di catalogo (per raggruppare in Bottega/Inventario).
export const PLACEABLE_CATEGORIES = ['light', 'decoration', 'structure', 'ambient', 'npc'] as const;
export type PlaceableCategory = (typeof PLACEABLE_CATEGORIES)[number];
export const PLACEABLE_CATEGORY_LABELS: Record<PlaceableCategory, string> = {
  light: 'Luci',
  decoration: 'Decorazioni',
  structure: 'Costruzioni',
  ambient: 'Ambiente',
  npc: 'Presenze',
};

// Catalogo esteso (Fase D). Gli sprite finali arrivano da PixelLab; finché
// mancano si usa un fallback a emoji (vedi PlaceableSprite).
export const EXTRA_PLACEABLE_TYPES = [
  // Luci
  'ghost_lantern', 'glow_pumpkin', 'torch', 'bonfire',
  // Decorazioni
  'angel_statue', 'open_coffin', 'bones', 'vase', 'sign',
  // Costruzioni
  'arch_stone', 'well', 'fountain', 'gravedigger_house', 'shrine',
  // Ambiente
  'dead_bush', 'rock', 'flowerbed', 'tall_grass', 'xmas_tree',
  // Presenze (NPC piazzabili)
  'zombie_dancer', 'wandering_ghost', 'skeleton_animal',
] as const;
export type ExtraPlaceableType = (typeof EXTRA_PLACEABLE_TYPES)[number];

export const EXTRA_PLACEABLE_LABELS: Record<ExtraPlaceableType, string> = {
  ghost_lantern: 'Lanterna spettrale',
  glow_pumpkin: 'Zucca luminosa',
  torch: 'Torcia',
  bonfire: 'Falò esoterico',
  angel_statue: 'Statua angelo',
  open_coffin: 'Bara aperta',
  bones: 'Ossa',
  vase: 'Vaso',
  sign: 'Cartello',
  arch_stone: 'Arco di pietra',
  well: 'Pozzo',
  fountain: 'Fontana',
  gravedigger_house: 'Casa del becchino',
  shrine: 'Santuario',
  dead_bush: 'Cespuglio secco',
  rock: 'Roccia',
  flowerbed: 'Aiuola fiorita',
  tall_grass: 'Erba alta',
  xmas_tree: 'Albero di Natale',
  zombie_dancer: 'Zombie danzante',
  wandering_ghost: 'Fantasma errante',
  skeleton_animal: 'Animale scheletro',
};

export const EXTRA_PLACEABLE_EMOJI: Record<ExtraPlaceableType, string> = {
  ghost_lantern: '🏮', glow_pumpkin: '🎃', torch: '🔥', bonfire: '🔥',
  angel_statue: '👼', open_coffin: '⚰️', bones: '🦴', vase: '🏺', sign: '🪧',
  arch_stone: '🏛️', well: '🕳️', fountain: '⛲', gravedigger_house: '🏚️', shrine: '⛩️',
  dead_bush: '🌿', rock: '🪨', flowerbed: '🌼', tall_grass: '🌾', xmas_tree: '🎄',
  zombie_dancer: '🧟', wandering_ghost: '👻', skeleton_animal: '🐾',
};

export const EXTRA_PLACEABLE_CATEGORY: Record<ExtraPlaceableType, PlaceableCategory> = {
  ghost_lantern: 'light', glow_pumpkin: 'light', torch: 'light', bonfire: 'light',
  angel_statue: 'decoration', open_coffin: 'decoration', bones: 'decoration', vase: 'decoration', sign: 'decoration',
  arch_stone: 'structure', well: 'structure', fountain: 'structure', gravedigger_house: 'structure', shrine: 'structure',
  dead_bush: 'ambient', rock: 'ambient', flowerbed: 'ambient', tall_grass: 'ambient', xmas_tree: 'ambient',
  zombie_dancer: 'npc', wandering_ghost: 'npc', skeleton_animal: 'npc',
};

// Tipo unificato di oggetto piazzabile (decorazione o struttura).
export type PlaceableType = DecorationType | StructureType | ExtraPlaceableType;
export const PLACEABLE_TYPES: PlaceableType[] = [
  ...DECORATION_TYPES,
  ...STRUCTURE_TYPES,
  ...EXTRA_PLACEABLE_TYPES,
];

/** Solo dicembre: l'albero di Natale è acquistabile/visibile in Bottega. */
export function isSeasonallyAvailable(type: PlaceableType, month0: number): boolean {
  if (type === 'xmas_tree') return month0 === 11;
  return true;
}

export const MEMORY_EVENT_TYPES = [
  'burial',
  'flower',
  'weed_cleaned',
  'anniversary',
  'ghost',
  'blessing',
] as const;
export type MemoryEventType = (typeof MEMORY_EVENT_TYPES)[number];
