// Azioni del giocatore: tutte le regole del gioco in un unico punto, pure
// rispetto a three/DOM. Ogni azione muta lo SaveData passato e ritorna un
// esito (messaggio + ricompense) oppure lancia GameError.

import { DECAY, ECONOMY, EXPANSION, GRAVE_FOOTPRINT, GRAVEDIGGER, WISP_SPAWN, WISPS, XP } from './balance.ts';
import { CATALOG, isSeasonallyAvailable, placeableDef, repairCost, rotatedFootprint } from './catalog.ts';
import { CATEGORIES, DEATH_CAUSES, GRAVE_TYPE_MIN_RANK, GRAVE_TYPES, type Category, type DeathCause, type GraveType } from './graves.ts';
import { evaluateAchievements, rankForXp, type AchievementDef } from './progression.ts';
import { newId } from './rng.ts';
import type { RoamerKind } from './spawn.ts';
import type { Grave, MemoryType, Placed, SaveData } from './state.ts';
import { isoDate } from './time.ts';
import { areaForLevel, buildOccupancy, canPlaceAt, computePrestige } from './world.ts';

export class GameError extends Error {}

export interface ActionResult {
  message: string;
  xp: number;
  wisps: number;
}

const ok = (message: string, xp = 0, wisps = 0): ActionResult => ({ message, xp, wisps });

function reward(s: SaveData, xp: number, wisps: number) {
  s.player.xp += xp;
  s.player.wisps += wisps;
}

function spend(s: SaveData, amount: number, what: string) {
  if (s.player.wisps < amount) throw new GameError(`Servono ${amount} fuochi fatui per ${what}.`);
  s.player.wisps -= amount;
  s.player.counters.wispsSpent += amount;
}

function memory(s: SaveData, graveId: string, type: MemoryType, now: Date) {
  s.memories.push({ id: newId('m'), graveId, type, at: now.toISOString() });
}

function graveById(s: SaveData, id: string): Grave {
  const g = s.graves.find((x) => x.id === id);
  if (!g) throw new GameError('Tomba inesistente.');
  return g;
}

function placedById(s: SaveData, id: string): Placed {
  const p = s.placeables.find((x) => x.id === id);
  if (!p) throw new GameError('Oggetto inesistente.');
  return p;
}

/** Da chiamare dopo ogni azione: espansione monotona + achievement. */
export function afterAction(s: SaveData, now: Date): { achievements: AchievementDef[]; expanded: boolean } {
  const prestige = computePrestige(s);
  let expanded = false;
  while (s.world.expansionLevel < EXPANSION.length - 1 && prestige >= EXPANSION[s.world.expansionLevel + 1].minPrestige) {
    s.world.expansionLevel++;
    expanded = true;
  }
  return { achievements: evaluateAchievements(s, now), expanded };
}

// ── Sepoltura ───────────────────────────────────────────────────────────

export interface BurialDraft {
  name: string;
  category: Category | null;
  birthDate: string | null;
  deathDate: string | null;
  deathCause: DeathCause | null;
  epitaph: string;
  graveType: GraveType | null;
  photoId: string | null;
}

export function emptyDraft(now: Date): BurialDraft {
  return {
    name: '', category: null, birthDate: null, deathDate: isoDate(now), deathCause: null,
    epitaph: '', graveType: 'stone_simple', photoId: null,
  };
}

export function validateDraft(d: BurialDraft, now: Date): Record<string, string> {
  const e: Record<string, string> = {};
  const name = d.name.trim();
  if (!name) e.name = 'Dai un nome al defunto.';
  else if (name.length > 40) e.name = 'Massimo 40 caratteri.';
  if (!d.category || !CATEGORIES.includes(d.category)) e.category = 'Scegli una categoria.';
  if (!d.deathDate) e.deathDate = 'Indica la data del trapasso.';
  else if (d.deathDate > isoDate(now)) e.deathDate = 'Non si seppellisce il futuro.';
  if (d.birthDate && d.deathDate && d.birthDate > d.deathDate) e.birthDate = 'Nato dopo essere morto? Sospetto.';
  if (!d.deathCause || !DEATH_CAUSES.includes(d.deathCause)) e.deathCause = 'Scegli una causa.';
  if (d.epitaph.length > 240) e.epitaph = 'Massimo 240 caratteri.';
  if (!d.graveType || !GRAVE_TYPES.includes(d.graveType)) e.graveType = 'Scegli una lapide.';
  return e;
}

export function canBuryAbstractToday(s: SaveData, now: Date): boolean {
  return s.player.lastAbstractBurialDate !== isoDate(now);
}

export function bury(s: SaveData, d: BurialDraft, x: number, y: number, now: Date): { grave: Grave; result: ActionResult } {
  const errors = validateDraft(d, now);
  const first = Object.values(errors)[0];
  if (first) throw new GameError(first);
  if (d.category === 'abstract' && !canBuryAbstractToday(s, now)) {
    throw new GameError('Hai già seppellito una cosa astratta oggi. Torna domani.');
  }
  if (GRAVE_TYPE_MIN_RANK[d.graveType!] > rankForXp(s.player.xp).level) {
    throw new GameError('Questa lapide richiede un rango più alto.');
  }
  const occ = buildOccupancy(s);
  if (!canPlaceAt(x, y, GRAVE_FOOTPRINT, occ, areaForLevel(s.world.expansionLevel))) {
    throw new GameError('Spazio non disponibile: servono 2×2 celle libere.');
  }
  const iso = now.toISOString();
  const grave: Grave = {
    id: newId('g'),
    seed: Math.floor(Math.random() * 1e6),
    name: d.name.trim(),
    category: d.category!,
    birthDate: d.birthDate,
    deathDate: d.deathDate!,
    deathCause: d.deathCause!,
    epitaph: d.epitaph.trim() || null,
    photoId: d.photoId,
    graveType: d.graveType!,
    x, y,
    hasFlowers: false, flowersAt: null, weeds: false, dirty: false, dirtySince: null,
    broken: false, lastAnniversaryYear: null, createdAt: iso,
  };
  s.graves.push(grave);
  memory(s, grave.id, 'burial', now);
  const xp = d.category === 'abstract' ? XP.burialAbstract : XP.burialPhysical;
  if (d.category === 'abstract') s.player.lastAbstractBurialDate = isoDate(now);
  reward(s, xp, WISPS.burial);
  return { grave, result: ok(`${grave.name} riposa in pace.`, xp, WISPS.burial) };
}

// ── Cura delle tombe ────────────────────────────────────────────────────

export function bringFlowers(s: SaveData, graveId: string, now: Date): ActionResult {
  const g = graveById(s, graveId);
  if (g.broken) throw new GameError('La tomba è rotta: va prima riparata.');
  if (g.dirty || g.weeds) throw new GameError('La tomba è sporca: va prima pulita.');
  const alreadyToday = g.hasFlowers && g.flowersAt?.slice(0, 10) === now.toISOString().slice(0, 10);
  g.hasFlowers = true;
  g.flowersAt = now.toISOString();
  if (alreadyToday) return ok('I fiori sono ancora freschi.');
  memory(s, g.id, 'flower', now);
  s.player.counters.flowersBrought++;
  reward(s, XP.flowers, WISPS.flowers);
  return ok('Hai portato fiori.', XP.flowers, WISPS.flowers);
}

export function cleanGrave(s: SaveData, graveId: string, now: Date): ActionResult {
  const g = graveById(s, graveId);
  if (g.broken) throw new GameError('La tomba è rotta: va prima riparata.');
  if (!g.dirty && !g.weeds) return ok('È già in ordine.');
  g.dirty = false; g.weeds = false; g.dirtySince = null;
  memory(s, g.id, 'cleaned', now);
  s.player.counters.cleanups++;
  reward(s, XP.cleaned, WISPS.cleaned);
  return ok('Lapide pulita.', XP.cleaned, WISPS.cleaned);
}

export function repairGrave(s: SaveData, graveId: string, now: Date): ActionResult {
  const g = graveById(s, graveId);
  if (!g.broken) return ok('Non c’è nulla da riparare.');
  spend(s, DECAY.graveRepairCost, 'riparare');
  g.broken = false; g.dirty = false; g.weeds = false; g.dirtySince = null;
  memory(s, g.id, 'repaired', now);
  s.player.counters.repairs++;
  reward(s, XP.repaired, 0);
  return ok('Tomba riparata: torna come nuova.', XP.repaired, -DECAY.graveRepairCost);
}

export function exhumeGrave(s: SaveData, graveId: string): ActionResult {
  graveById(s, graveId);
  s.graves = s.graves.filter((g) => g.id !== graveId);
  s.memories = s.memories.filter((m) => m.graveId !== graveId);
  return ok('Tomba rimossa. Il ricordo resta a te.');
}

// ── Cura degli oggetti ──────────────────────────────────────────────────

export function cleanPlaceable(s: SaveData, id: string, now: Date): ActionResult {
  const p = placedById(s, id);
  if (p.broken) throw new GameError('È rotto: va prima riparato.');
  p.caredAt = now.toISOString();
  if (!p.dirty) return ok('Già lucidato a dovere.');
  p.dirty = false;
  s.player.counters.cleanups++;
  reward(s, XP.placeableCleaned, WISPS.placeableCleaned);
  return ok('Ripulito da polvere e ragnatele.', XP.placeableCleaned, WISPS.placeableCleaned);
}

export function repairPlaceable(s: SaveData, id: string, now: Date): ActionResult {
  const p = placedById(s, id);
  if (!p.broken) return ok('Non c’è nulla da riparare.');
  const cost = repairCost(placeableDef(p.type));
  spend(s, cost, 'riparare');
  p.broken = false; p.dirty = false; p.caredAt = now.toISOString();
  s.player.counters.repairs++;
  reward(s, XP.repaired, 0);
  return ok('Riparato.', XP.repaired, -cost);
}

export function toggleLight(s: SaveData, id: string): ActionResult {
  const p = placedById(s, id);
  if (!CATALOG[p.type]?.light) throw new GameError('Non è una luce.');
  if (p.broken) throw new GameError('È rotto: non si accende.');
  p.lit = !p.lit;
  return ok(p.lit ? 'Acceso.' : 'Spento.');
}

export function setText(s: SaveData, id: string, text: string): ActionResult {
  const p = placedById(s, id);
  if (!CATALOG[p.type]?.editableText) throw new GameError('Qui non si scrive.');
  p.text = text.slice(0, 60);
  return ok('Scritta aggiornata.');
}

export function cycleVariant(s: SaveData, id: string): ActionResult {
  const p = placedById(s, id);
  const def = placeableDef(p.type);
  if (!def.variants || def.variants < 2) throw new GameError('Nessuna variante.');
  p.variant = (p.variant + 1) % def.variants;
  return ok(def.variantLabels?.[p.variant] ?? `Variante ${p.variant + 1}`);
}

// ── Bottega & inventario ────────────────────────────────────────────────

export function ownedCount(s: SaveData, type: string): number {
  return s.inventory[type] ?? 0;
}

export function placedCount(s: SaveData, type: string): number {
  return s.placeables.filter((p) => p.type === type).length;
}

export type ShopAvailability = 'ok' | 'rank' | 'season' | 'owned' | 'funds';

export function shopAvailability(s: SaveData, type: string, now: Date): ShopAvailability {
  const def = placeableDef(type);
  if (!isSeasonallyAvailable(def, now.getMonth())) return 'season';
  if (def.minRank > rankForXp(s.player.xp).level) return 'rank';
  if (def.unique && ownedCount(s, type) + placedCount(s, type) > 0) return 'owned';
  if (s.player.wisps < def.cost) return 'funds';
  return 'ok';
}

export function maxBuyable(s: SaveData, type: string): number {
  const def = placeableDef(type);
  if (def.unique) return ownedCount(s, type) + placedCount(s, type) > 0 ? 0 : (s.player.wisps >= def.cost ? 1 : 0);
  return def.cost === 0 ? 99 : Math.min(99, Math.floor(s.player.wisps / def.cost));
}

export function buy(s: SaveData, type: string, qty: number, now: Date): ActionResult {
  const def = placeableDef(type);
  const avail = shopAvailability(s, type, now);
  if (avail === 'season') throw new GameError('Non è la stagione giusta.');
  if (avail === 'rank') throw new GameError(`Serve il rango ${def.minRank}.`);
  if (avail === 'owned') throw new GameError('Ne possiedi già uno: è un pezzo unico.');
  const n = Math.max(1, Math.min(qty, maxBuyable(s, type)));
  if (maxBuyable(s, type) < 1) throw new GameError('Fuochi fatui insufficienti.');
  spend(s, def.cost * n, 'comprarlo');
  s.inventory[type] = ownedCount(s, type) + n;
  return ok(n > 1 ? `${def.label} ×${n} nell’inventario.` : `${def.label} nell’inventario.`, 0, -def.cost * n);
}

export function sellPrice(type: string): number {
  return Math.round(placeableDef(type).cost * ECONOMY.sellRefund);
}

export function sell(s: SaveData, type: string, qty = 1): ActionResult {
  const def = placeableDef(type);
  if (def.permanent) throw new GameError('La Bottega non si vende.');
  const have = ownedCount(s, type);
  if (have < 1) throw new GameError('Non ne possiedi.');
  const n = Math.min(have, Math.max(1, qty));
  s.inventory[type] = have - n;
  if (s.inventory[type] === 0) delete s.inventory[type];
  const gain = sellPrice(type) * n;
  s.player.wisps += gain;
  return ok(`Venduto: +${gain} fuochi fatui.`, 0, gain);
}

// ── Piazzamento (modalità Modifica) ─────────────────────────────────────

export function placeFromInventory(s: SaveData, type: string, x: number, y: number, rot: number, now: Date): Placed {
  const def = placeableDef(type);
  if (ownedCount(s, type) < 1) throw new GameError('Non ne hai in inventario.');
  const r = def.rotatable ? ((rot % 4) + 4) % 4 : 0;
  const occ = buildOccupancy(s);
  if (!canPlaceAt(x, y, rotatedFootprint(type, r), occ, areaForLevel(s.world.expansionLevel))) {
    throw new GameError('Spazio occupato.');
  }
  s.inventory[type] = ownedCount(s, type) - 1;
  if (s.inventory[type] === 0) delete s.inventory[type];
  const iso = now.toISOString();
  const p: Placed = {
    id: newId(type), type, x, y, rot: r, variant: 0, lit: true,
    caredAt: iso, dirty: false, broken: false, createdAt: iso,
    ...(def.editableText ? { text: 'Riposa in pace' } : {}),
  };
  s.placeables.push(p);
  s.player.counters.decorationsPlaced++;
  return p;
}

export function moveEntity(s: SaveData, id: string, x: number, y: number, rot?: number): ActionResult {
  const area = areaForLevel(s.world.expansionLevel);
  const occ = buildOccupancy(s, id);
  const grave = s.graves.find((g) => g.id === id);
  if (grave) {
    if (!canPlaceAt(x, y, GRAVE_FOOTPRINT, occ, area)) throw new GameError('Spazio occupato.');
    grave.x = x; grave.y = y;
    return ok('Tomba spostata.');
  }
  const p = placedById(s, id);
  const r = rot ?? p.rot;
  if (!canPlaceAt(x, y, rotatedFootprint(p.type, r), occ, area)) throw new GameError('Spazio occupato.');
  p.x = x; p.y = y; p.rot = r;
  return ok('Spostato.');
}

/** Ruota di 90°; se il nuovo ingombro non entra, prova a restare ancorato. */
export function rotateEntity(s: SaveData, id: string): ActionResult {
  const p = placedById(s, id);
  if (!CATALOG[p.type]?.rotatable) throw new GameError('Non si può ruotare.');
  return moveEntity(s, id, p.x, p.y, (p.rot + 1) % 4);
}

export function storePlaceable(s: SaveData, id: string): ActionResult {
  const p = placedById(s, id);
  const def = placeableDef(p.type);
  if (def.permanent) throw new GameError('La Bottega si può solo spostare.');
  s.placeables = s.placeables.filter((x) => x.id !== id);
  s.inventory[p.type] = ownedCount(s, p.type) + 1;
  return ok(`${def.label} riposto nell’inventario.`);
}

// ── Raccolta & presenze ─────────────────────────────────────────────────

export function collectWisp(s: SaveData, id: string): ActionResult {
  const before = s.world.looseWisps.length;
  s.world.looseWisps = s.world.looseWisps.filter((w) => w.id !== id);
  if (s.world.looseWisps.length === before) return ok('');
  reward(s, 0, WISPS.collect);
  return ok('+1 fuoco fatuo', 0, WISPS.collect);
}

/** Celle (x,y) entro raggio Chebyshev dal footprint 2×2 di una tomba. */
export function gravesNear(s: SaveData, x: number, y: number, radius: number): Grave[] {
  return s.graves.filter((g) => {
    const dx = Math.max(g.x - x, 0, x - (g.x + 1));
    const dy = Math.max(g.y - y, 0, y - (g.y + 1));
    return Math.max(dx, dy) <= radius;
  });
}

export function interactRoamer(
  s: SaveData, kind: RoamerKind, now: Date, opts: { rare?: boolean; graveId?: string; x?: number; y?: number } = {},
): ActionResult {
  const c = s.player.counters;
  c.npcEncountered++;
  switch (kind) {
    case 'ghost': {
      c.ghostsWitnessed++;
      if (opts.graveId && s.graves.some((g) => g.id === opts.graveId)) memory(s, opts.graveId, 'ghost', now);
      const xp = opts.rare ? XP.ghostObject : XP.ghost;
      const w = opts.rare ? WISPS.ghostObject : WISPS.ghost;
      reward(s, xp, w);
      const name = opts.rare ? s.graves.find((g) => g.id === opts.graveId)?.name : null;
      return ok(name ? `Il fantasma di ${name} ti saluta.` : 'Un’apparizione si dissolve nella nebbia.', xp, w);
    }
    case 'cat': reward(s, 0, WISPS.cat); return ok('Il gatto nero ti porta fortuna.', 0, WISPS.cat);
    case 'rat': reward(s, 0, WISPS.rat); return ok('Hai scacciato un topo.', 0, WISPS.rat);
    case 'crow': reward(s, 0, WISPS.crow); return ok('Il corvo lascia cadere un fuoco fatuo.', 0, WISPS.crow);
    case 'zombie': reward(s, XP.zombie, WISPS.zombie); return ok('Hai ricacciato lo zombie nella fossa.', XP.zombie, WISPS.zombie);
    case 'priest': {
      if (opts.graveId && s.graves.some((g) => g.id === opts.graveId)) memory(s, opts.graveId, 'blessing', now);
      s.world.blessingUntil = new Date(now.getTime() + WISP_SPAWN.blessingHours * 3_600_000).toISOString();
      reward(s, XP.blessing, WISPS.blessing);
      return ok('Il prete benedice il cimitero: più fuochi fatui per un giorno.', XP.blessing, WISPS.blessing);
    }
    case 'gravedigger': {
      const near = gravesNear(s, opts.x ?? 0, opts.y ?? 0, GRAVEDIGGER.cleanRadius).filter((g) => !g.broken && (g.dirty || g.weeds));
      for (const g of near) { g.dirty = false; g.weeds = false; g.dirtySince = null; memory(s, g.id, 'cleaned', now); }
      c.cleanups += near.length;
      const xp = near.length * XP.gravediggerPerGrave;
      const w = near.length * WISPS.gravediggerPerGrave;
      reward(s, xp, w);
      return ok(near.length ? `Il becchino ripulisce ${near.length} ${near.length === 1 ? 'tomba' : 'tombe'} qui intorno.` : 'Il becchino borbotta e prosegue.', xp, w);
    }
  }
}

export function recordPhoto(s: SaveData, now: Date): ActionResult {
  s.player.counters.photosTaken++;
  const today = isoDate(now);
  if (s.player.lastShareDate === today) return ok('Foto salvata in galleria.');
  s.player.lastShareDate = today;
  reward(s, XP.photo, 0);
  return ok('Foto salvata in galleria.', XP.photo, 0);
}
