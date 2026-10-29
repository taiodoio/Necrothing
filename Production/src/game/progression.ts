// Ranghi, XP e achievement (portati dalla PWA).

import { RANKS } from './balance.ts';
import { detectDistricts } from './world.ts';
import type { SaveData } from './state.ts';
import { t } from '../i18n/index.ts';

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
  { id: 'first_burial', name: t('ach.firstBurial.name'), description: t('ach.firstBurial.desc'), icon: '🪦', tier: 'bronze', value: graves, goal: 1 },
  { id: 'five_graves', name: t('ach.fiveGraves.name'), description: t('ach.fiveGraves.desc'), icon: '⚰️', tier: 'bronze', value: graves, goal: 5 },
  { id: 'ten_graves', name: t('ach.tenGraves.name'), description: t('ach.tenGraves.desc'), icon: '🏚️', tier: 'silver', value: graves, goal: 10 },
  { id: 'twentyfive_graves', name: t('ach.twentyfiveGraves.name'), description: t('ach.twentyfiveGraves.desc'), icon: '🏛️', tier: 'gold', value: graves, goal: 25 },
  { id: 'abstract_grief', name: t('ach.abstractGrief.name'), description: t('ach.abstractGrief.desc'), icon: '💭', tier: 'bronze', value: has((s) => s.graves.some((g) => g.category === 'abstract')), goal: 1 },
  { id: 'variety_5', name: t('ach.variety5.name'), description: t('ach.variety5.desc'), icon: '🎭', tier: 'silver', value: cats, goal: 5 },
  { id: 'all_categories', name: t('ach.allCategories.name'), description: t('ach.allCategories.desc'), icon: '🌌', tier: 'gold', value: cats, goal: 10 },
  { id: 'florist', name: t('ach.florist.name'), description: t('ach.florist.desc'), icon: '💐', tier: 'bronze', value: (s) => s.player.counters.flowersBrought, goal: 1 },
  { id: 'green_thumb', name: t('ach.greenThumb.name'), description: t('ach.greenThumb.desc'), icon: '🌷', tier: 'silver', value: (s) => s.player.counters.flowersBrought, goal: 10 },
  { id: 'gardener_master', name: t('ach.gardenerMaster.name'), description: t('ach.gardenerMaster.desc'), icon: '🌹', tier: 'gold', value: (s) => s.player.counters.flowersBrought, goal: 50 },
  { id: 'caretaker', name: t('ach.caretaker.name'), description: t('ach.caretaker.desc'), icon: '🧹', tier: 'bronze', value: (s) => s.player.counters.cleanups, goal: 1 },
  { id: 'caretaker_silver', name: t('ach.caretakerSilver.name'), description: t('ach.caretakerSilver.desc'), icon: '🪣', tier: 'silver', value: (s) => s.player.counters.cleanups, goal: 15 },
  { id: 'fixer', name: t('ach.fixer.name'), description: t('ach.fixer.desc'), icon: '🛠️', tier: 'silver', value: (s) => s.player.counters.repairs, goal: 5 },
  { id: 'haunted', name: t('ach.haunted.name'), description: t('ach.haunted.desc'), icon: '👻', tier: 'bronze', value: (s) => s.player.counters.ghostsWitnessed, goal: 1 },
  { id: 'ghost_whisperer', name: t('ach.ghostWhisperer.name'), description: t('ach.ghostWhisperer.desc'), icon: '🕯️', tier: 'silver', value: (s) => s.player.counters.ghostsWitnessed, goal: 5 },
  { id: 'socialite', name: t('ach.socialite.name'), description: t('ach.socialite.desc'), icon: '🤝', tier: 'silver', value: (s) => s.player.counters.npcEncountered, goal: 10 },
  { id: 'decorator', name: t('ach.decorator.name'), description: t('ach.decorator.desc'), icon: '🪴', tier: 'bronze', value: (s) => s.player.counters.decorationsPlaced, goal: 5 },
  { id: 'spender', name: t('ach.spender.name'), description: t('ach.spender.desc'), icon: '✦', tier: 'silver', value: (s) => s.player.counters.wispsSpent, goal: 50 },
  { id: 'photographer', name: t('ach.photographer.name'), description: t('ach.photographer.desc'), icon: '📷', tier: 'bronze', value: (s) => s.player.counters.photosTaken, goal: 3 },
  { id: 'mausoleum_built', name: t('ach.mausoleumBuilt.name'), description: t('ach.mausoleumBuilt.desc'), icon: '🏛️', tier: 'gold', value: has((s) => s.placeables.some((p) => p.type === 'mausoleum')), goal: 1 },
  { id: 'district_gothic', name: t('ach.districtGothic.name'), description: t('ach.districtGothic.desc'), icon: '🦇', tier: 'silver', value: has((s) => themes(s).has('gothic')), goal: 1 },
  { id: 'district_natural', name: t('ach.districtNatural.name'), description: t('ach.districtNatural.desc'), icon: '🌲', tier: 'silver', value: has((s) => themes(s).has('natural')), goal: 1 },
  { id: 'district_tech', name: t('ach.districtTech.name'), description: t('ach.districtTech.desc'), icon: '🔌', tier: 'silver', value: has((s) => themes(s).has('tech')), goal: 1 },
  { id: 'master_planner', name: t('ach.masterPlanner.name'), description: t('ach.masterPlanner.desc'), icon: '🗺️', tier: 'gold', value: (s) => themes(s).size, goal: 3 },
  { id: 'expansion', name: t('ach.expansion.name'), description: t('ach.expansion.desc'), icon: '🧱', tier: 'silver', value: (s) => s.world.expansionLevel, goal: 1 },
  { id: 'rank_3', name: t('ach.rank3.name'), description: t('ach.rank3.desc'), icon: '⛏️', tier: 'silver', value: (s) => rankForXp(s.player.xp).level, goal: 3 },
  { id: 'rank_5', name: t('ach.rank5.name'), description: t('ach.rank5.desc'), icon: '👑', tier: 'gold', value: (s) => rankForXp(s.player.xp).level, goal: 5 },
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
