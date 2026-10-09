// Ranghi, XP e achievement (portati dalla PWA).

import { RANKS } from './balance.ts';
import { detectDistricts } from './world.ts';
import type { SaveData } from './state.ts';

export type Rank = (typeof RANKS)[number];

export function rankForXp(xp: number): Rank {
  let cur: Rank = RANKS[0];
  for (const r of RANKS) if (xp >= r.minXp) cur = r;
  return cur;
}

export function nextRank(xp: number): Rank | null {
  return RANKS.find((r) => r.minXp > xp) ?? null;
}

export function rankProgress(xp: number): number {
  const cur = rankForXp(xp);
  const next = nextRank(xp);
  if (!next) return 1;
  return (xp - cur.minXp) / (next.minXp - cur.minXp);
}

export type Tier = 'bronze' | 'silver' | 'gold';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: Tier;
  value: (s: SaveData) => number;
  goal: number;
}

const graves = (s: SaveData) => s.graves.filter((g) => !g.legacy).length;
const cats = (s: SaveData) => new Set(s.graves.filter((g) => !g.legacy).map((g) => g.category)).size;
const themes = (s: SaveData) => new Set(detectDistricts(s.graves).map((d) => d.theme));
const has = (pred: (s: SaveData) => boolean) => (s: SaveData) => (pred(s) ? 1 : 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_burial', name: 'Primo Inquilino', description: 'Seppellisci il tuo primo oggetto.', icon: '🪦', tier: 'bronze', value: graves, goal: 1 },
  { id: 'five_graves', name: 'Piccolo Camposanto', description: 'Raggiungi 5 tombe.', icon: '⚰️', tier: 'bronze', value: graves, goal: 5 },
  { id: 'ten_graves', name: 'Necropoli in Crescita', description: 'Raggiungi 10 tombe.', icon: '🏚️', tier: 'silver', value: graves, goal: 10 },
  { id: 'twentyfive_graves', name: 'Città dei Morti', description: 'Raggiungi 25 tombe.', icon: '🏛️', tier: 'gold', value: graves, goal: 25 },
  { id: 'abstract_grief', name: 'Filosofo del Lutto', description: 'Seppellisci una cosa astratta.', icon: '💭', tier: 'bronze', value: has((s) => s.graves.some((g) => g.category === 'abstract')), goal: 1 },
  { id: 'variety_5', name: 'Collezionista di Defunti', description: 'Seppellisci oggetti di 5 categorie diverse.', icon: '🎭', tier: 'silver', value: cats, goal: 5 },
  { id: 'all_categories', name: 'Tuttofare del Trapasso', description: 'Copri tutte le 10 categorie.', icon: '🌌', tier: 'gold', value: cats, goal: 10 },
  { id: 'florist', name: 'Mano di Fiori', description: 'Porta fiori su una tomba.', icon: '💐', tier: 'bronze', value: (s) => s.player.counters.flowersBrought, goal: 1 },
  { id: 'green_thumb', name: 'Pollice Verde', description: 'Porta fiori 10 volte.', icon: '🌷', tier: 'silver', value: (s) => s.player.counters.flowersBrought, goal: 10 },
  { id: 'gardener_master', name: 'Giardiniere dell’Aldilà', description: 'Porta fiori 50 volte.', icon: '🌹', tier: 'gold', value: (s) => s.player.counters.flowersBrought, goal: 50 },
  { id: 'caretaker', name: 'Custode Diligente', description: 'Pulisci una lapide.', icon: '🧹', tier: 'bronze', value: (s) => s.player.counters.cleanups, goal: 1 },
  { id: 'caretaker_silver', name: 'Mani Operose', description: 'Pulisci 15 volte.', icon: '🪣', tier: 'silver', value: (s) => s.player.counters.cleanups, goal: 15 },
  { id: 'fixer', name: 'Scalpellino', description: 'Ripara 5 cose rotte.', icon: '🛠️', tier: 'silver', value: (s) => s.player.counters.repairs, goal: 5 },
  { id: 'haunted', name: 'Notte Infestata', description: 'Assisti a un’apparizione.', icon: '👻', tier: 'bronze', value: (s) => s.player.counters.ghostsWitnessed, goal: 1 },
  { id: 'ghost_whisperer', name: 'Sussurratore di Spettri', description: 'Assisti a 5 apparizioni.', icon: '🕯️', tier: 'silver', value: (s) => s.player.counters.ghostsWitnessed, goal: 5 },
  { id: 'socialite', name: 'Anima Socievole', description: 'Interagisci con 10 presenze erranti.', icon: '🤝', tier: 'silver', value: (s) => s.player.counters.npcEncountered, goal: 10 },
  { id: 'decorator', name: 'Arredatore Funebre', description: 'Posiziona 5 elementi.', icon: '🪴', tier: 'bronze', value: (s) => s.player.counters.decorationsPlaced, goal: 5 },
  { id: 'spender', name: 'Mecenate dei Morti', description: 'Spendi 50 fuochi fatui.', icon: '✦', tier: 'silver', value: (s) => s.player.counters.wispsSpent, goal: 50 },
  { id: 'photographer', name: 'Ritrattista d’Ombre', description: 'Scatta 3 foto del cimitero.', icon: '📷', tier: 'bronze', value: (s) => s.player.counters.photosTaken, goal: 3 },
  { id: 'mausoleum_built', name: 'Cuore del Cimitero', description: 'Costruisci il mausoleo.', icon: '🏛️', tier: 'gold', value: has((s) => s.placeables.some((p) => p.type === 'mausoleum')), goal: 1 },
  { id: 'district_gothic', name: 'Quartiere Gotico', description: 'Raggruppa 4 lapidi gotiche vicine.', icon: '🦇', tier: 'silver', value: has((s) => themes(s).has('gothic')), goal: 1 },
  { id: 'district_natural', name: 'Boschetto degli Addii', description: 'Forma un distretto naturale.', icon: '🌲', tier: 'silver', value: has((s) => themes(s).has('natural')), goal: 1 },
  { id: 'district_tech', name: 'Settore Obsoleto', description: 'Forma un distretto tecnologico.', icon: '🔌', tier: 'silver', value: has((s) => themes(s).has('tech')), goal: 1 },
  { id: 'master_planner', name: 'Urbanista del Trapasso', description: 'Possiedi i tre distretti insieme.', icon: '🗺️', tier: 'gold', value: (s) => themes(s).size, goal: 3 },
  { id: 'expansion', name: 'Terra Consacrata', description: 'Allarga il recinto per la prima volta.', icon: '🧱', tier: 'silver', value: (s) => s.world.expansionLevel, goal: 1 },
  { id: 'rank_3', name: 'Becchino del Silicio', description: 'Raggiungi il rango 3.', icon: '⛏️', tier: 'silver', value: (s) => rankForXp(s.player.xp).level, goal: 3 },
  { id: 'rank_5', name: 'Lord of Decay', description: 'Raggiungi il rango massimo.', icon: '👑', tier: 'gold', value: (s) => rankForXp(s.player.xp).level, goal: 5 },
];

export function achievementProgress(def: AchievementDef, s: SaveData): number {
  return Math.max(0, Math.min(1, def.value(s) / def.goal));
}

/** Sblocca gli achievement raggiunti; ritorna i nuovi. */
export function evaluateAchievements(s: SaveData, now: Date): AchievementDef[] {
  const got = new Set(s.achievements.map((a) => a.id));
  const fresh = ACHIEVEMENTS.filter((a) => !got.has(a.id) && a.value(s) >= a.goal);
  for (const a of fresh) s.achievements.push({ id: a.id, at: now.toISOString() });
  return fresh;
}
