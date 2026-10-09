// Simulazione del mondo.
//  • runCatchUp: all'apertura / ritorno in primo piano, applica il tempo reale
//    trascorso (erbacce, sporco, rotture, fiori appassiti, anniversari, meteo).
//  • liveTick: mentre si gioca, ogni LIVE_TICK_MS fa comparire presenze e
//    fuochi fatui secondo la matrice di spawn.
// Deterministico rispetto a seed + ora (stessa ora → stessi esiti).

import { DECAY, SIM, WISPS, XP } from './balance.ts';
import { CATALOG } from './catalog.ts';
import { createRng, newId, type Rng } from './rng.ts';
import { computeSpawns, liveWispChance, wispCap, type SpawnRequest } from './spawn.ts';
import type { SaveData, Weather } from './state.ts';
import { dayPhaseForHour, daysBetween, isoDate } from './time.ts';
import { areaForLevel, buildOccupancy } from './world.ts';

export interface CatchUpReport {
  elapsedDays: number;
  newDirty: number;
  newBroken: number;
  witheredFlowers: number;
  placeablesDirty: number;
  placeablesBroken: number;
  anniversaries: string[];
  blessing: string | null;
  wispsAdded: number;
  weatherChanged: boolean;
  xpGained: number;
}

const WEATHERS: Weather[] = ['clear', 'clear', 'fog', 'rain', 'storm'];

function addMemory(s: SaveData, graveId: string, type: SaveData['memories'][number]['type'], now: Date) {
  s.memories.push({ id: newId('m'), graveId, type, at: now.toISOString() });
  if (s.memories.length > 400) s.memories.splice(0, s.memories.length - 400);
}

/** Cella libera casuale nel recinto per un fuoco fatuo. */
export function randomWispCell(s: SaveData, rng: Rng): { x: number; y: number } | null {
  const area = areaForLevel(s.world.expansionLevel);
  const occ = buildOccupancy(s);
  const taken = new Set(s.world.looseWisps.map((w) => `${w.x},${w.y}`));
  for (let i = 0; i < 40; i++) {
    const x = area.x + 1 + rng.int(area.w - 2);
    const y = area.y + 1 + rng.int(area.h - 2);
    const k = `${x},${y}`;
    if (!occ.blocked.has(k) && !taken.has(k)) return { x, y };
  }
  return null;
}

export function runCatchUp(s: SaveData, now: Date): CatchUpReport {
  const last = new Date(s.world.lastSimulationAt);
  const elapsedDays = Math.max(0, daysBetween(last, now));
  const rng = createRng(`${s.seed}:${now.toISOString().slice(0, 13)}`);
  const iso = now.toISOString();
  const r: CatchUpReport = {
    elapsedDays, newDirty: 0, newBroken: 0, witheredFlowers: 0, placeablesDirty: 0,
    placeablesBroken: 0, anniversaries: [], blessing: null, wispsAdded: 0, weatherChanged: false, xpGained: 0,
  };

  for (const g of s.graves) {
    // Anniversario annuale della morte (dagli anni successivi).
    const death = new Date(g.deathDate);
    if (now.getMonth() === death.getMonth() && now.getDate() === death.getDate()
      && now.getFullYear() > death.getFullYear() && g.lastAnniversaryYear !== now.getFullYear()) {
      g.lastAnniversaryYear = now.getFullYear();
      r.anniversaries.push(g.name);
      addMemory(s, g.id, 'anniversary', now);
      s.player.xp += XP.anniversary;
      s.player.wisps += WISPS.anniversary;
      r.xpGained += XP.anniversary;
    }
    // Ciclo esclusivo: PULITA → (fiori) → appassiti = SPORCA → pulisci → PULITA.
    if (g.hasFlowers && g.flowersAt) {
      if (daysBetween(g.flowersAt, now) >= SIM.flowerWitherDays) {
        g.hasFlowers = false;
        g.flowersAt = null;
        if (!g.dirty) { g.dirty = true; g.dirtySince = iso; }
        r.witheredFlowers++;
      }
    } else if (!g.hasFlowers && elapsedDays > 0 && !g.broken) {
      if (!g.weeds && rng.chance(Math.min(SIM.weedProbMax, SIM.weedProbPerDay * elapsedDays))) {
        g.weeds = true;
      }
      if (!g.dirty && rng.chance(Math.min(SIM.dirtProbMax, SIM.dirtProbPerDay * elapsedDays))) {
        g.dirty = true; g.dirtySince = iso; r.newDirty++;
      }
    }
    if ((g.weeds || g.dirty) && g.hasFlowers) { g.hasFlowers = false; g.flowersAt = null; }
    if (g.dirty && !g.broken && g.dirtySince && daysBetween(g.dirtySince, now) >= DECAY.graveBreakDays) {
      g.broken = true; g.hasFlowers = false; r.newBroken++;
    }
  }

  // Luci e costruzioni: sporche dopo 3 giorni senza cure, rotte dopo 7 (Excel).
  for (const p of s.placeables) {
    if (!CATALOG[p.type]?.decays) continue;
    const age = daysBetween(p.caredAt, now);
    if (!p.dirty && age >= DECAY.placeableDirtyDays) { p.dirty = true; r.placeablesDirty++; }
    if (!p.broken && age >= DECAY.placeableBreakDays) { p.broken = true; r.placeablesBroken++; }
  }

  // Benedizione narrativa del prete (offline).
  if (s.graves.length > 0 && elapsedDays > 0 && rng.chance(SIM.blessingChance)) {
    const g = rng.pick(s.graves);
    r.blessing = g.name;
    addMemory(s, g.id, 'blessing', now);
    s.player.xp += XP.blessing;
    r.xpGained += XP.blessing;
  }

  // Fuochi fatui maturati mentre eri via (in funzione delle tombe).
  const cap = wispCap(s);
  const toAdd = Math.min(cap - s.world.looseWisps.length, elapsedDays > 0 ? 1 + rng.int(3) + Math.floor(s.graves.length / 6) : 0);
  for (let i = 0; i < toAdd; i++) {
    const cell = randomWispCell(s, rng);
    if (!cell) break;
    s.world.looseWisps.push({ id: newId('w'), ...cell });
    r.wispsAdded++;
  }

  // Meteo: al massimo un cambio al giorno.
  const today = isoDate(now);
  if (s.world.lastWeatherDate !== today) {
    s.world.weather = rng.pick(WEATHERS);
    s.world.lastWeatherDate = today;
    r.weatherChanged = true;
  }
  s.world.lastSimulationAt = iso;
  return r;
}

export interface LiveTickResult {
  spawns: SpawnRequest[];
  wisp: { id: string; x: number; y: number } | null;
}

/** Tick live: presenze + un eventuale fuoco fatuo. `salt` rende unici i tick. */
export function liveTick(s: SaveData, now: Date, salt: number): LiveTickResult {
  const rng = createRng(`${s.seed}:live:${Math.floor(now.getTime() / 1000)}:${salt}`);
  const isNight = dayPhaseForHour(now.getHours()) === 'night';
  const spawns = computeSpawns(s, isNight, rng);
  let wisp: LiveTickResult['wisp'] = null;
  if (s.world.looseWisps.length < wispCap(s) && rng.chance(liveWispChance(s, now))) {
    const cell = randomWispCell(s, rng);
    if (cell) {
      wisp = { id: newId('w'), ...cell };
      s.world.looseWisps.push(wisp);
    }
  }
  return { spawns, wisp };
}

/** Messaggio narrativo principale del catch-up (o null). */
export function catchUpMessage(r: CatchUpReport): string | null {
  if (r.anniversaries.length === 1) return `Oggi ricorre l’anniversario di ${r.anniversaries[0]}.`;
  if (r.anniversaries.length > 1) return `Oggi ricorrono ${r.anniversaries.length} anniversari funebri.`;
  if (r.newBroken > 0) return `${r.newBroken} ${r.newBroken === 1 ? 'tomba si è rotta' : 'tombe si sono rotte'}: vanno riparate.`;
  if (r.placeablesBroken > 0) return `${r.placeablesBroken} ${r.placeablesBroken === 1 ? 'oggetto si è rotto' : 'oggetti si sono rotti'} per l’incuria.`;
  if (r.blessing) return `Il prete è passato a benedire ${r.blessing}.`;
  if (r.witheredFlowers > 0) return 'Alcuni fiori sono ormai cenere.';
  if (r.newDirty > 0) return `${r.newDirty} ${r.newDirty === 1 ? 'lapide si è sporcata' : 'lapidi si sono sporcate'}: serve una pulita.`;
  if (r.placeablesDirty > 0) return 'Polvere e ragnatele sugli oggetti del cimitero.';
  if (r.wispsAdded > 0) return `Mentre eri via sono comparsi ${r.wispsAdded} fuochi fatui.`;
  return null;
}
