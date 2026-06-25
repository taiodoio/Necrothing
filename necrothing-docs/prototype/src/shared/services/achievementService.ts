// Catalogo achievement + valutazione. Gli achievement sono definitivi:
// una volta sbloccati restano tali anche se lo stato cambia.

import type { Grave, UserProgression } from '@/shared/domain/types';
import { rankForXp } from './progressionService';

export interface AchievementContext {
  graves: Grave[];
  progression: UserProgression;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

function distinctCategories(graves: Grave[]): number {
  return new Set(graves.map((g) => g.category)).size;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_burial',
    name: 'Primo Inquilino',
    description: 'Seppellisci il tuo primo oggetto.',
    check: (c) => c.graves.length >= 1,
  },
  {
    id: 'five_graves',
    name: 'Piccolo Camposanto',
    description: 'Raggiungi 5 tombe.',
    check: (c) => c.graves.length >= 5,
  },
  {
    id: 'ten_graves',
    name: 'Necropoli in Crescita',
    description: 'Raggiungi 10 tombe.',
    check: (c) => c.graves.length >= 10,
  },
  {
    id: 'abstract_grief',
    name: 'Filosofo del Lutto',
    description: 'Seppellisci una cosa astratta.',
    check: (c) => c.graves.some((g) => g.category === 'abstract'),
  },
  {
    id: 'florist',
    name: 'Mano di Fiori',
    description: 'Porta fiori su una tomba.',
    check: (c) => c.graves.some((g) => g.hasFlowers),
  },
  {
    id: 'variety_5',
    name: 'Collezionista di Defunti',
    description: 'Seppellisci oggetti di 5 categorie diverse.',
    check: (c) => distinctCategories(c.graves) >= 5,
  },
  {
    id: 'all_categories',
    name: 'Tuttofare del Trapasso',
    description: 'Copri tutte le 10 categorie.',
    check: (c) => distinctCategories(c.graves) >= 10,
  },
  {
    id: 'rank_3',
    name: 'Becchino del Silicio',
    description: 'Raggiungi il rango 3.',
    check: (c) => rankForXp(c.progression.xp).level >= 3,
  },
  {
    id: 'rank_5',
    name: 'Lord of Decay',
    description: 'Raggiungi il rango massimo.',
    check: (c) => rankForXp(c.progression.xp).level >= 5,
  },
];

/** Ritorna gli id degli achievement appena sbloccati (non già presenti). */
export function evaluateAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: ReadonlySet<string>,
): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !alreadyUnlocked.has(a.id) && a.check(ctx));
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
