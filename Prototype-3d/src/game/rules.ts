// Azioni del giocatore: tutte le regole del gioco in un unico punto, pure
// rispetto a three/DOM. Ogni azione muta lo SaveData passato e ritorna un
// esito (messaggio + ricompense) oppure lancia GameError.

import { BUSINESS, DECAY, EARLY_ACCESS, ECONOMY, HAT_FEATS, HOUSE_PERKS, RELEASE_LOCKS, EXPANSION, GRAVE_FOOTPRINT, GRAVEDIGGER, WISP_SPAWN, WISPS, XP, ZOMBIE_MUD } from './balance.ts';
import { CATALOG, isSeasonallyAvailable, placeableDef, repairCost, rotatedFootprint, type PlaceableDef } from './catalog.ts';
import { CATEGORIES, CUSTOM_CAUSE_MAX, DEATH_CAUSES, GRAVE_TYPE_MIN_RANK, GRAVE_TYPES, type CauseChoice, type Category, type DeathCause, type GraveType } from './graves.ts';
import { evaluateAchievements, rankForXp, type AchievementDef } from './progression.ts';
import { hashString, newId } from './rng.ts';
import type { RoamerKind } from './spawn.ts';
import type { Grave, MemoryType, Placed, SaveData } from './state.ts';
import { isoDate } from './time.ts';
import { areaForLevel, buildOccupancy, canPlaceAt, cellsOf, computePrestige, nearestFreeSpot } from './world.ts';
import { houseHasVeggie, houseItem, housePart, housePerk, houseRoof } from './house.ts';

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
  if (wisps > 0) s.player.counters.wispsEarned += wisps;
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

/**
 * Da chiamare dopo ogni azione: sblocco delle espansioni (monotono) +
 * achievement. Il recinto non si allarga da solo: `unlocked` è il nuovo
 * livello sbloccato (o null) e il giocatore sceglie se ampliare.
 */
export function afterAction(s: SaveData, now: Date): { achievements: AchievementDef[]; unlocked: number | null } {
  const prestige = computePrestige(s);
  let unlocked: number | null = null;
  while (s.world.unlockedLevel < EXPANSION.length - 1 && prestige >= EXPANSION[s.world.unlockedLevel + 1].minPrestige) {
    s.world.unlockedLevel++;
    unlocked = s.world.unlockedLevel;
  }
  return { achievements: evaluateAchievements(s, now), unlocked };
}

/** Tombe e oggetti che non entrano (anche solo in parte) nel recinto di un certo livello. */
export function outsideArea(s: SaveData, level: number): Array<{ id: string; kind: 'grave' | 'placeable'; label: string }> {
  const a = areaForLevel(level);
  const out = (x: number, y: number, [w, d]: [number, number]) => x < a.x || y < a.y || x + w > a.x + a.w || y + d > a.y + a.h;
  return [
    ...s.graves.filter((g) => out(g.x, g.y, GRAVE_FOOTPRINT)).map((g) => ({ id: g.id, kind: 'grave' as const, label: g.name })),
    ...s.placeables.filter((p) => out(p.x, p.y, rotatedFootprint(p.type, p.rot))).map((p) => ({ id: p.id, kind: 'placeable' as const, label: CATALOG[p.type]?.label ?? p.type })),
  ];
}

/**
 * Cambia l'ampiezza del recinto: si può scegliere solo tra i livelli
 * sbloccati, e restringere solo se nell'area più piccola entra tutto.
 * I fuochi fatui rimasti fuori svaniscono.
 */
export function setExpansionLevel(s: SaveData, level: number): ActionResult {
  if (!Number.isInteger(level) || level < 0 || level >= EXPANSION.length) throw new GameError('Ampiezza non valida.');
  if (level > s.world.unlockedLevel) throw new GameError(`«${EXPANSION[level].label}» si sblocca con ${EXPANSION[level].minPrestige} di prestigio.`);
  if (level === s.world.expansionLevel) return ok('', 0, 0);
  const left = outsideArea(s, level);
  if (left.length) throw new GameError(`${left.length === 1 ? 'C’è ancora un elemento' : `Ci sono ancora ${left.length} elementi`} fuori dall'area: spostali o rimettili in inventario.`);
  const grow = level > s.world.expansionLevel;
  s.world.expansionLevel = level;
  const a = areaForLevel(level);
  s.world.looseWisps = s.world.looseWisps.filter((w) => w.x >= a.x && w.y >= a.y && w.x < a.x + a.w && w.y < a.y + a.h);
  return ok(`${grow ? 'Il recinto si allarga' : 'Il recinto si stringe'}: ${EXPANSION[level].label}, ${a.w}×${a.h}.`, 0, 0);
}

// ── Sepoltura ───────────────────────────────────────────────────────────

export interface BurialDraft {
  name: string;
  category: Category | null;
  birthDate: string | null;
  deathDate: string | null;
  deathCause: CauseChoice | null;
  /** Causa scritta a mano, quando deathCause è 'custom'. */
  deathCauseText: string;
  epitaph: string;
  graveType: GraveType | null;
  photoId: string | null;
}

export function emptyDraft(now: Date): BurialDraft {
  return {
    name: '', category: null, birthDate: null, deathDate: isoDate(now), deathCause: null, deathCauseText: '',
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
  if (d.deathCause === 'custom') {
    const t = (d.deathCauseText ?? '').trim();
    if (!t) e.deathCause = 'Scrivi la causa del decesso.';
    else if (t.length > CUSTOM_CAUSE_MAX) e.deathCause = `Massimo ${CUSTOM_CAUSE_MAX} caratteri.`;
  } else if (!d.deathCause || !DEATH_CAUSES.includes(d.deathCause)) e.deathCause = 'Scegli una causa.';
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
    ...(d.deathCause === 'custom' ? { deathCauseText: d.deathCauseText.trim() } : {}),
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
  g.caredAt = now.toISOString();
  if (alreadyToday) return ok('I fiori sono ancora freschi.');
  memory(s, g.id, 'flower', now);
  s.player.counters.flowersBrought++;
  // le fioriere della casa del Custode: un fuoco fatuo in più per ogni mazzo
  const wisps = housePerk(s, 'flowerbox') ? HOUSE_PERKS.flowerboxWisps : WISPS.flowers;
  reward(s, XP.flowers, wisps);
  return ok('Hai portato fiori.', XP.flowers, wisps);
}

export function cleanGrave(s: SaveData, graveId: string, now: Date): ActionResult {
  const g = graveById(s, graveId);
  if (g.broken) throw new GameError('La tomba è rotta: va prima riparata.');
  g.caredAt = now.toISOString();
  if (!g.dirty && !g.weeds) return ok('È già in ordine.');
  g.dirty = false; g.weeds = false; g.dirtySince = null; g.muddy = false;
  memory(s, g.id, 'cleaned', now);
  s.player.counters.cleanups++;
  reward(s, XP.cleaned, WISPS.cleaned);
  return ok('Lapide pulita.', XP.cleaned, WISPS.cleaned);
}

/** Quanto costa riparare: col banco degli attrezzi della casa del Custode un quarto in meno. */
const repairDiscount = (s: SaveData) => (housePerk(s, 'toolbench') ? HOUSE_PERKS.toolbenchRepair : 1);
export const graveRepairPrice = (s: SaveData) => Math.max(1, Math.round(DECAY.graveRepairCost * repairDiscount(s)));
export const placeableRepairPrice = (s: SaveData, type: string) => Math.max(1, Math.round(repairCost(placeableDef(type)) * repairDiscount(s)));

export function repairGrave(s: SaveData, graveId: string, now: Date): ActionResult {
  const g = graveById(s, graveId);
  if (!g.broken) return ok('Non c’è nulla da riparare.');
  const cost = graveRepairPrice(s);
  spend(s, cost, 'riparare');
  g.broken = false; g.dirty = false; g.weeds = false; g.dirtySince = null; g.muddy = false; g.caredAt = now.toISOString();
  memory(s, g.id, 'repaired', now);
  s.player.counters.repairs++;
  reward(s, XP.repaired, 0);
  return ok('Tomba riparata: torna come nuova.', XP.repaired, -cost);
}

export function exhumeGrave(s: SaveData, graveId: string): ActionResult {
  graveById(s, graveId);
  s.graves = s.graves.filter((g) => g.id !== graveId);
  s.memories = s.memories.filter((m) => m.graveId !== graveId);
  return ok('Tomba rimossa. Il ricordo resta a te.');
}

// ── Visite del becchino e del prete ─────────────────────────────────────

/**
 * Il giro del becchino: metà (arrotondata per eccesso) delle cose sporche del
 * cimitero, tombe e oggetti, scelte a caso. Le rotte no: vanno riparate.
 */
export function gravediggerRound(s: SaveData, rand: () => number = Math.random): string[] {
  const dirty = [
    ...s.graves.filter((g) => !g.broken && (g.dirty || g.weeds)).map((g) => g.id),
    ...s.placeables.filter((p) => !p.broken && p.dirty && CATALOG[p.type]?.decays).map((p) => p.id),
  ];
  for (let i = dirty.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [dirty[i], dirty[j]] = [dirty[j], dirty[i]]; }
  return dirty.slice(0, Math.ceil(dirty.length * GRAVEDIGGER.roundShare));
}

/** Il becchino pulisce una cosa durante il giro (gratis per il Custode, che ci guadagna pure). */
export function gravediggerClean(s: SaveData, id: string, now: Date): ActionResult {
  const g = s.graves.find((x) => x.id === id);
  const p = g ? undefined : s.placeables.find((x) => x.id === id);
  if (g && !g.broken && (g.dirty || g.weeds)) {
    g.dirty = false; g.weeds = false; g.dirtySince = null; g.muddy = false;
    memory(s, g.id, 'cleaned', now);
  } else if (p && !p.broken && p.dirty) {
    p.dirty = false; p.caredAt = now.toISOString();
  } else return ok('', 0, 0); // già pulita (o rotta nel frattempo)
  s.player.counters.cleanups++;
  reward(s, XP.gravediggerPerGrave, WISPS.gravediggerPerGrave);
  return ok('', XP.gravediggerPerGrave, WISPS.gravediggerPerGrave);
}

/** Il prete prega su una tomba; la prima preghiera del giro benedice il cimitero (più fuochi fatui per un giorno). */
export function priestBless(s: SaveData, graveId: string, now: Date, first: boolean): ActionResult {
  if (s.graves.some((g) => g.id === graveId)) memory(s, graveId, 'blessing', now);
  if (!first) return ok('', 0, 0);
  s.world.blessingUntil = new Date(now.getTime() + WISP_SPAWN.blessingHours * 3_600_000).toISOString();
  reward(s, XP.blessing, WISPS.blessing);
  return ok('Il prete benedice il cimitero: più fuochi fatui fino a domani.', XP.blessing, WISPS.blessing);
}

// ── Albero dei ricordi ──────────────────────────────────────────────────

/** L'Albero dei ricordi piazzato nel cimitero (ce n'è al massimo uno). */
export function memoryTree(s: SaveData): Placed | undefined {
  return s.placeables.find((p) => p.type === 'memory_tree');
}

/**
 * Affida una tomba all'albero: la tomba sparisce (lo spazio si libera) e il
 * ricordo resta all'albero, con la sua storia. Si guadagna come per una sepoltura.
 */
export function entrustGrave(s: SaveData, graveId: string, now: Date): ActionResult {
  const g = graveById(s, graveId);
  if (!memoryTree(s)) throw new GameError('Serve l’Albero dei ricordi.');
  s.graves = s.graves.filter((x) => x.id !== graveId);
  s.entrusted.push({ grave: { ...g }, entrustedAt: now.toISOString(), ghostVisits: 0 });
  memory(s, graveId, 'entrusted', now);
  const xp = g.category === 'abstract' ? XP.burialAbstract : XP.burialPhysical;
  reward(s, xp, WISPS.burial);
  return ok(`${g.name} riposa ora tra le radici dell’Albero dei ricordi.`, xp, WISPS.burial);
}

export function entrustedById(s: SaveData, id: string) {
  return s.entrusted.find((e) => e.grave.id === id);
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
  const cost = placeableRepairPrice(s, p.type);
  spend(s, cost, 'riparare');
  p.broken = false; p.dirty = false; p.caredAt = now.toISOString();
  s.player.counters.repairs++;
  if (CATALOG[p.type]?.light) s.player.counters.lightsRepaired++;
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

// ── Bottega & inventario ────────────────────────────────────────────────

export function ownedCount(s: SaveData, type: string): number {
  return s.inventory[type] ?? 0;
}

export function placedCount(s: SaveData, type: string): number {
  return s.placeables.filter((p) => p.type === type).length;
}

export type ShopAvailability = 'ok' | 'rank' | 'season' | 'feat' | 'owned' | 'graves' | 'funds';

/** Tombe che contano per gli sblocchi: quelle nel cimitero più quelle affidate all'albero. */
export function graveTotal(s: SaveData): number {
  return s.graves.length + (s.entrusted?.length ?? 0);
}

/** A che punto è il traguardo che sblocca un oggetto (o un cappello): [fatto, obiettivo]. */
export function featProgress(s: SaveData, feat: NonNullable<PlaceableDef['feat']>): [number, number] {
  return [Math.min(feat.goal, s.player.counters[feat.counter] ?? 0), feat.goal];
}

/** Il cappello da strega (e gli altri cappelli a traguardo) si può indossare? */
export function hatUnlocked(s: SaveData, hat: string): boolean {
  const f = HAT_FEATS[hat as keyof typeof HAT_FEATS];
  if (!f || !RELEASE_LOCKS.earlyRank) return true; // in prova sono tutti liberi
  return (s.player.counters[f.counter] ?? 0) >= f.goal;
}

export function shopAvailability(s: SaveData, type: string, now: Date): ShopAvailability {
  const def = placeableDef(type);
  const early = !RELEASE_LOCKS.earlyRank && EARLY_ACCESS.has(type);
  // gli stagionali già comprati restano: si comprano solo nella loro stagione
  if (!early && !isSeasonallyAvailable(def, now.getMonth(), now.getDate())) return 'season';
  if (!early && def.minRank > rankForXp(s.player.xp).level) return 'rank';
  if (!early && def.feat && featProgress(s, def.feat)[0] < def.feat.goal) return 'feat';
  if (def.unique && ownedCount(s, type) + placedCount(s, type) > 0) return 'owned';
  if (RELEASE_LOCKS.minGraves && def.minGraves && graveTotal(s) < def.minGraves) return 'graves';
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
  if (avail === 'feat') throw new GameError(`Si sblocca con un traguardo: ${def.feat!.label.toLowerCase()}.`);
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
  if (def.category === 'extra') throw new GameError('Non si piazza: si usa.');
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

/** Una cella di un tracciato (sentiero, recinto, muretto), col verso del tratto. */
export interface TraceCell { x: number; y: number; rot: number }
/** 'ok' si posa, 'busy' occupata o fuori dal recinto, 'short' oltre quelli che hai. */
export type TraceStatus = 'ok' | 'busy' | 'short';

/** Come andrebbe ogni cella del tracciato, in ordine: finiti quelli in inventario, il resto è 'short'. */
export function traceStatus(s: SaveData, type: string, cells: TraceCell[]): TraceStatus[] {
  const occ = buildOccupancy(s);
  const area = areaForLevel(s.world.expansionLevel);
  let left = ownedCount(s, type);
  return cells.map((c) => {
    const fp = rotatedFootprint(type, c.rot);
    if (!canPlaceAt(c.x, c.y, fp, occ, area)) return 'busy';
    if (left <= 0) return 'short';
    left--;
    for (const k of cellsOf(c.x, c.y, fp)) occ.owner.set(k, 'trace');
    return 'ok';
  });
}

/** Posa tutte le celle buone del tracciato prendendole dall'inventario. */
export function placeTrace(s: SaveData, type: string, cells: TraceCell[], now: Date): ActionResult & { placed: number } {
  const status = traceStatus(s, type, cells);
  let placed = 0;
  cells.forEach((c, i) => { if (status[i] === 'ok') { placeFromInventory(s, type, c.x, c.y, c.rot, now); placed++; } });
  if (!placed) throw new GameError(ownedCount(s, type) ? 'Il tracciato passa solo su spazi occupati.' : 'Non ne hai in inventario.');
  return { ...ok(`${placeableDef(type).label}: ${placed} posat${placed === 1 ? 'o' : 'i'}.`), placed };
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

// ── Bar e orto: incassi giornalieri ─────────────────────────────────────

/** Giorno di calendario (locale) come numero progressivo. */
function dayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** Incasso di un giorno: casuale ma sempre lo stesso per quel giorno e quell'edificio. */
export function businessDayIncome(id: string, type: string, day: number): number {
  const b = BUSINESS[type];
  if (!b) return 0;
  const [lo, hi] = b.perDay;
  return lo + (hashString(`${id}:${day}`) % (hi - lo + 1));
}

/**
 * Fuochi fatui da riscuotere: un incasso per ogni giorno passato dall'ultima
 * riscossione (o dalla posa), fino al tetto. Un edificio rotto non incassa.
 */
/** Probabilità che uno zombie sporchi la tomba accanto a cui passa: la staccionata della casa lo fa esitare. */
export const zombieMudChance = (s: SaveData) => (housePerk(s, 'picket') ? HOUSE_PERKS.picketZombieMud : ZOMBIE_MUD.chance);

/** Passo del Custode a piedi: col camino acceso è più riposato. */
export const keeperPace = (s: SaveData) => (housePerk(s, 'smoke') ? HOUSE_PERKS.smokeSpeed : 1);

export function businessPending(s: SaveData, id: string, now: Date): number {
  const p = s.placeables.find((x) => x.id === id);
  const b = p && BUSINESS[p.type];
  if (!p || !b || p.broken) return 0;
  if (p.type === 'keeper_house' && !houseHasVeggie(s.house)) return 0; // senza orto la casa non rende
  const from = dayNumber(new Date(p.collectedAt ?? p.createdAt));
  const to = dayNumber(now);
  let sum = 0;
  for (let d = Math.max(from + 1, to - 30); d <= to && sum < b.cap; d++) sum += businessDayIncome(p.id, p.type, d);
  return Math.min(b.cap, sum);
}

export function collectBusiness(s: SaveData, id: string, now: Date): ActionResult {
  const n = businessPending(s, id, now);
  if (n < 1) throw new GameError('Oggi non c’è ancora niente da riscuotere.');
  const p = placedById(s, id);
  p.collectedAt = now.toISOString();
  reward(s, 0, n);
  if (p.type === 'witch_corner') {
    s.player.counters.potionsSold += n;
    return ok(`La strega ha venduto ${n} ${n === 1 ? 'pozione' : 'pozioni'}: +${n} fuochi fatui.`, 0, n);
  }
  return ok(`Incasso: +${n} fuochi fatui.`, 0, n);
}

// ── Campana delle anime ─────────────────────────────────────────────────

/** Si può suonare la campana oggi? (Una volta al giorno, e non se è rotta.) */
export function bellReady(s: SaveData, id: string, now: Date): boolean {
  const p = s.placeables.find((x) => x.id === id);
  return !!p && !p.broken && (!p.rungAt || isoDate(new Date(p.rungAt)) !== isoDate(now));
}

/** Il Custode suona la campana: le anime del cimitero accorrono (le fa comparire la vista). */
export function ringBell(s: SaveData, id: string, now: Date): ActionResult {
  const p = placedById(s, id);
  if (p.type !== 'soul_bell') throw new GameError('Non è una campana.');
  if (p.broken) throw new GameError('È rotta: va prima riparata.');
  if (!bellReady(s, id, now)) throw new GameError('La campana ha già suonato oggi: le anime tornano domani.');
  p.rungAt = now.toISOString();
  return ok('Din… don… Le anime del cimitero accorrono.');
}

// ── Zombie e fango ──────────────────────────────────────────────────────

/** Tomba appena curata (pulita, riparata, fiori freschi): per qualche ora gli zombie la lasciano stare. */
export function graveProtected(g: Grave, now: Date): boolean {
  const recent = (iso: string | null | undefined) => !!iso && now.getTime() - new Date(iso).getTime() < ZOMBIE_MUD.protectHours * 3_600_000;
  return recent(g.caredAt) || (g.hasFlowers && recent(g.flowersAt));
}

/**
 * Uno zombie passa sulla tomba: se era in ordine la sporca, se era già sporca
 * la rottura si avvicina di un giorno. Restano le impronte di fango. Non la
 * rompe mai da solo. Ritorna false se non è successo niente.
 */
export function zombieTrample(s: SaveData, graveId: string, now: Date): boolean {
  const g = s.graves.find((x) => x.id === graveId);
  if (!g || g.broken || graveProtected(g, now)) return false;
  if (!g.dirty && !g.weeds) {
    g.dirty = true; g.dirtySince = now.toISOString();
    g.hasFlowers = false; g.flowersAt = null;
  } else {
    const was = new Date(g.dirtySince ?? now.toISOString()).getTime();
    // al massimo fino a un'ora prima della rottura: lo zombie avvicina, non rompe
    const latest = now.getTime() - (DECAY.graveBreakDays * 86_400_000 - 3_600_000);
    g.dirtySince = new Date(Math.min(was, Math.max(was - 86_400_000, latest))).toISOString();
  }
  g.muddy = true;
  return true;
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
  s: SaveData, kind: RoamerKind, now: Date, opts: { rare?: boolean; graveId?: string; memoryId?: string; x?: number; y?: number } = {},
): ActionResult {
  const c = s.player.counters;
  c.npcEncountered++;
  switch (kind) {
    case 'ghost': {
      c.ghostsWitnessed++;
      // il fantasma di un ricordo affidato all'albero: ricompensa classica, e la visita resta nella sua storia
      const kept = opts.memoryId ? entrustedById(s, opts.memoryId) : undefined;
      if (kept) {
        kept.ghostVisits++;
        memory(s, kept.grave.id, 'ghost', now);
        reward(s, XP.ghost, WISPS.ghost);
        return ok(`Il fantasma di ${kept.grave.name} è tornato a trovarti.`, XP.ghost, WISPS.ghost);
      }
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
      for (const g of near) { g.dirty = false; g.weeds = false; g.dirtySince = null; g.muddy = false; memory(s, g.id, 'cleaned', now); }
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

// ── Casa del Custode ────────────────────────────────────────────────────

/** Mette la casa del Custode vicino alla Bottega, se non c'è ancora (partite vecchie comprese). */
export function ensureKeeperHouse(s: SaveData, now: Date): Placed | null {
  const have = s.placeables.find((p) => p.type === 'keeper_house');
  if (have) return have;
  const fp = rotatedFootprint('keeper_house', 0);
  const shop = s.placeables.find((p) => p.type === 'shop');
  const area = areaForLevel(s.world.expansionLevel);
  // a destra della Bottega, se c'è posto; altrimenti il punto libero più vicino. Si cerca
  // spazio anche per due file davanti alla porta: la soglia resta dentro il recinto e libera
  const room: [number, number] = [fp[0], fp[1] + 2];
  const cx = shop ? shop.x + 3 + 1 + fp[0] / 2 : area.x + area.w / 2, cy = shop ? shop.y + room[1] / 2 : area.y + 4;
  const at = nearestFreeSpot(cx, cy, room, buildOccupancy(s), area);
  if (!at) return null;
  const iso = now.toISOString();
  const p: Placed = { id: newId('keeper_house'), type: 'keeper_house', x: at.x, y: at.y, rot: 0, variant: 0, lit: true, caredAt: iso, dirty: false, broken: false, createdAt: iso };
  s.placeables.push(p);
  return p;
}

export type HouseAvailability = 'ok' | 'owned' | 'rank' | 'funds';

export function houseAvailability(s: SaveData, id: string): HouseAvailability {
  const it = houseItem(id);
  if (!it) throw new GameError('Non esiste.');
  if (s.house.owned.includes(id)) return 'owned';
  if (it.minRank > rankForXp(s.player.xp).level) return 'rank';
  if (s.player.wisps < it.cost) return 'funds';
  return 'ok';
}

/** Compra un tetto (e lo mette) o un'aggiunta per la casa: si vede subito, niente inventario. */
export function buyHousePart(s: SaveData, id: string, now: Date): ActionResult {
  const it = houseItem(id)!;
  const av = houseAvailability(s, id);
  if (av === 'owned') throw new GameError('Ce l’hai già.');
  if (av === 'rank') throw new GameError(`Serve il rango ${it.minRank}.`);
  if (av === 'funds') throw new GameError(`Servono ${it.cost} fuochi fatui.`);
  s.player.wisps -= it.cost;
  s.house.owned.push(id);
  if (houseRoof(id)) s.house.roof = id;
  // l'orto comincia a rendere da oggi (non per i giorni passati)
  const home = s.placeables.find((p) => p.type === 'keeper_house');
  if (id === 'veggie' && home) home.collectedAt = now.toISOString();
  return ok(`${it.label}: fatto!`);
}

export function setHouseRoof(s: SaveData, id: string): void {
  if (!houseRoof(id) || !s.house.owned.includes(id)) throw new GameError('Questo tetto non ce l’hai.');
  s.house.roof = id;
}

/** Toglie o rimette un'aggiunta comprata. */
export function toggleHousePart(s: SaveData, id: string, now?: Date): boolean {
  if (!housePart(id) || !s.house.owned.includes(id)) throw new GameError('Questa aggiunta non ce l’hai.');
  const i = s.house.hidden.indexOf(id);
  if (i >= 0) s.house.hidden.splice(i, 1); else s.house.hidden.push(id);
  // l'orto rimesso riparte da oggi: i giorni in cui non c'era non rendono
  const home = s.placeables.find((p) => p.type === 'keeper_house');
  if (id === 'veggie' && i >= 0 && home && now) home.collectedAt = now.toISOString();
  return i >= 0;
}
