// Catalogo achievement + valutazione. Gli achievement sono definitivi:
// una volta sbloccati restano tali anche se lo stato cambia.

import type { Decoration, Grave, UserProgression, Zone } from '@/shared/domain/types';
import { rankForXp } from './progressionService';
import { activeThemes } from './zoneService';

export interface AchievementContext {
  graves: Grave[];
  progression: UserProgression;
  decorations?: Decoration[];
  zones?: Zone[];
}

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  check: (ctx: AchievementContext) => boolean;
  /** Progresso [0,1] verso lo sblocco (per gli achievement a soglia). */
  progress?: (ctx: AchievementContext) => number;
}

function distinctCategories(graves: Grave[]): number {
  return new Set(graves.map((g) => g.category)).size;
}

const n = (v: number | undefined): number => v ?? 0;
const ratio = (cur: number, goal: number): number => Math.max(0, Math.min(1, cur / goal));

/** Helper per achievement a soglia: deriva check e progress da un contatore. */
function threshold(
  id: string,
  name: string,
  description: string,
  icon: string,
  tier: AchievementTier,
  value: (ctx: AchievementContext) => number,
  goal: number,
): AchievementDef {
  return {
    id,
    name,
    description,
    icon,
    tier,
    check: (c) => value(c) >= goal,
    progress: (c) => ratio(value(c), goal),
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // — Sepolture —
  {
    id: 'first_burial',
    name: 'Primo Inquilino',
    description: 'Seppellisci il tuo primo oggetto.',
    icon: '🪦',
    tier: 'bronze',
    check: (c) => c.graves.length >= 1,
  },
  threshold('five_graves', 'Piccolo Camposanto', 'Raggiungi 5 tombe.', '⚰️', 'bronze', (c) => c.graves.length, 5),
  threshold('ten_graves', 'Necropoli in Crescita', 'Raggiungi 10 tombe.', '🏚️', 'silver', (c) => c.graves.length, 10),
  threshold('twentyfive_graves', 'Città dei Morti', 'Raggiungi 25 tombe.', '🏛️', 'gold', (c) => c.graves.length, 25),
  {
    id: 'abstract_grief',
    name: 'Filosofo del Lutto',
    description: 'Seppellisci una cosa astratta.',
    icon: '💭',
    tier: 'bronze',
    check: (c) => c.graves.some((g) => g.category === 'abstract'),
  },

  // — Varietà —
  threshold('variety_5', 'Collezionista di Defunti', 'Seppellisci oggetti di 5 categorie diverse.', '🎭', 'silver', (c) => distinctCategories(c.graves), 5),
  threshold('all_categories', 'Tuttofare del Trapasso', 'Copri tutte le 10 categorie.', '🌌', 'gold', (c) => distinctCategories(c.graves), 10),

  // — Commemorazione —
  {
    id: 'florist',
    name: 'Mano di Fiori',
    description: 'Porta fiori su una tomba.',
    icon: '💐',
    tier: 'bronze',
    check: (c) => c.graves.some((g) => g.hasFlowers) || n(c.progression.flowersBrought) >= 1,
  },
  threshold('green_thumb', 'Pollice Verde', 'Porta fiori 10 volte.', '🌷', 'silver', (c) => n(c.progression.flowersBrought), 10),
  threshold('gardener_master', 'Giardiniere dell’Aldilà', 'Porta fiori 50 volte.', '🌹', 'gold', (c) => n(c.progression.flowersBrought), 50),

  // — Manutenzione —
  threshold('caretaker', 'Custode Diligente', 'Pulisci una lapide.', '🧹', 'bronze', (c) => n(c.progression.cleanups), 1),
  threshold('caretaker_silver', 'Mani Operose', 'Pulisci 15 lapidi.', '🪣', 'silver', (c) => n(c.progression.cleanups), 15),

  // — Eventi / NPC —
  threshold('haunted', 'Notte Infestata', 'Assisti a un’apparizione.', '👻', 'bronze', (c) => n(c.progression.ghostsWitnessed), 1),
  threshold('ghost_whisperer', 'Sussurratore di Spettri', 'Assisti a 5 apparizioni.', '🕯️', 'silver', (c) => n(c.progression.ghostsWitnessed), 5),
  threshold('socialite', 'Anima Socievole', 'Interagisci con 10 presenze erranti.', '🤝', 'silver', (c) => n(c.progression.npcEncountered), 10),

  // — Decorazione / economia —
  threshold('decorator', 'Arredatore Funebre', 'Posiziona 5 elementi.', '🪴', 'bronze', (c) => n(c.progression.decorationsPlaced), 5),
  threshold('spender', 'Mecenate dei Morti', 'Spendi 50 fuochi fatui.', '✦', 'silver', (c) => n(c.progression.wispsSpent), 50),

  // — Spazio: mausoleo & distretti tematici (auto-rilevati) —
  {
    id: 'mausoleum_built',
    name: 'Cuore del Cimitero',
    description: 'Costruisci il mausoleo centrale.',
    icon: '🏛️',
    tier: 'gold',
    check: (c) => (c.decorations ?? []).some((d) => d.type === 'mausoleum'),
  },
  {
    id: 'district_gothic',
    name: 'Quartiere Gotico',
    description: 'Raggruppa abbastanza lapidi gotiche vicine da formare un distretto.',
    icon: '🏚️',
    tier: 'silver',
    check: (c) => activeThemes(c.zones ?? []).has('gothic'),
  },
  {
    id: 'district_natural',
    name: 'Boschetto degli Addii',
    description: 'Forma un distretto naturale di tombe coerenti.',
    icon: '🌲',
    tier: 'silver',
    check: (c) => activeThemes(c.zones ?? []).has('natural'),
  },
  {
    id: 'district_tech',
    name: 'Settore Obsoleto',
    description: 'Forma un distretto tecnologico di tombe coerenti.',
    icon: '🔌',
    tier: 'silver',
    check: (c) => activeThemes(c.zones ?? []).has('tech'),
  },
  {
    id: 'master_planner',
    name: 'Urbanista del Trapasso',
    description: 'Possiedi contemporaneamente i tre distretti tematici.',
    icon: '🗺️',
    tier: 'gold',
    check: (c) => activeThemes(c.zones ?? []).size >= 3,
    progress: (c) => ratio(activeThemes(c.zones ?? []).size, 3),
  },

  // — Progressione —
  {
    id: 'rank_3',
    name: 'Becchino del Silicio',
    description: 'Raggiungi il rango 3.',
    icon: '⛏️',
    tier: 'silver',
    check: (c) => rankForXp(c.progression.xp).level >= 3,
    progress: (c) => ratio(rankForXp(c.progression.xp).level, 3),
  },
  {
    id: 'rank_5',
    name: 'Lord of Decay',
    description: 'Raggiungi il rango massimo.',
    icon: '👑',
    tier: 'gold',
    check: (c) => rankForXp(c.progression.xp).level >= 5,
    progress: (c) => ratio(rankForXp(c.progression.xp).level, 5),
  },
];

/** Ritorna gli achievement appena sbloccati (non già presenti). */
export function evaluateAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: ReadonlySet<string>,
): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !alreadyUnlocked.has(a.id) && a.check(ctx));
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
