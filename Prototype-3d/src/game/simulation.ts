// Simulazione del mondo.
//  • runCatchUp: all'apertura / ritorno in primo piano, applica il tempo reale
//    trascorso (erbacce, sporco, rotture, fiori appassiti, anniversari, meteo).
//  • liveTick: mentre si gioca, ogni LIVE_TICK_MS fa comparire presenze e
//    fuochi fatui secondo la matrice di spawn.
// Deterministico rispetto a seed + ora (stessa ora → stessi esiti).

import { DECAY, HOUSE_PERKS, KEEPER_LAMP, SIM, WISPS, XP } from './balance.ts';
import { housePerk } from './house.ts';
import { CATALOG, rotatedFootprint } from './catalog.ts';
import { createRng, hashString, newId, type Rng } from './rng.ts';
import { computeSpawns, liveWispChance, wispCap, type SpawnRequest } from './spawn.ts';
import type { SaveData, Weather } from './state.ts';
import { DAY_MS, dayPhaseForHour, daysBetween, isoDate } from './time.ts';
import { areaForLevel, buildOccupancy } from './world.ts';

export interface CatchUpReport {
  elapsedDays: number;
  newDirty: number;
  newBroken: number;
  witheredFlowers: number;
  placeablesDirty: number;
  placeablesBroken: number;
  anniversaries: string[];
  /** Anniversari caduti mentre il gioco era chiuso (restano nei ricordi, senza premio). */
  missedAnniversaries: string[];
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

/**
 * Gli anniversari di una morte caduti tra il giorno di `from` e quello di `to` (compresi): a mezzogiorno del giorno,
 * dagli anni dopo la morte (il 29 febbraio, negli anni non bisestili, il 28).
 */
export function anniversariesBetween(deathDate: string, from: Date, to: Date): Date[] {
  const death = new Date(deathDate);
  if (Number.isNaN(death.getTime()) || to.getTime() <= from.getTime()) return [];
  const out: Date[] = [];
  const fromDay = isoDate(from), toDay = isoDate(to);
  for (let y = Math.max(from.getFullYear(), death.getFullYear() + 1); y <= to.getFullYear(); y++) {
    const d = new Date(y, death.getMonth(), death.getDate(), 12);
    if (d.getMonth() !== death.getMonth()) d.setDate(0); // 29 febbraio → 28
    // anche il giorno di partenza: i doppioni li scarta chi chiama (lastAnniversaryYear)
    const day = isoDate(d);
    if (day >= fromDay && day <= toDay) out.push(d);
  }
  return out;
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

/**
 * Quando un oggetto si sporca e quando si rompe, in giorni dall'ultima cura.
 * Ogni ciclo di cura ha i suoi tempi (dal suo id e dalla data della cura):
 * casuali ma stabili, così riaprendo il gioco non cambiano.
 */
export function placeableDecayDays(p: { id: string; caredAt: string }): { dirty: number; broken: number } {
  const u = (salt: string) => (hashString(`${p.id}|${p.caredAt}|${salt}`) >>> 0) / 4294967296;
  const [d0, d1] = DECAY.placeableDirtyDays, [b0, b1] = DECAY.placeableBreakDays;
  const dirty = Math.round(d0 + (d1 - d0) * u('sporco'));
  return { dirty, broken: dirty + Math.round(b0 + (b1 - b0) * u('rotto')) };
}

/** Distanza (celle, tra i centri degli ingombri) entro cui il Lampione del Custode tiene in vita le luci. */
function center(p: { type: string; x: number; y: number; rot: number }): [number, number] {
  const [w, d] = rotatedFootprint(p.type, p.rot);
  return [p.x + w / 2, p.y + d / 2];
}

/** Una luce che il Lampione del Custode (non rotto) protegge: non si rompe mai. */
export function keeperProtected(s: Pick<SaveData, 'placeables'>, p: SaveData['placeables'][number]): boolean {
  if (!CATALOG[p.type]?.light) return false;
  const [x, y] = center(p);
  return s.placeables.some((k) => {
    if (k.type !== 'keeper_lamp' || k.broken) return false;
    const [kx, ky] = center(k);
    return Math.max(Math.abs(kx - x), Math.abs(ky - y)) <= KEEPER_LAMP.radius;
  });
}

export function runCatchUp(s: SaveData, now: Date): CatchUpReport {
  const last = new Date(s.world.lastSimulationAt);
  const elapsedDays = Math.max(0, daysBetween(last, now));
  const rng = createRng(`${s.seed}:${now.toISOString().slice(0, 13)}`);
  const iso = now.toISOString();
  // un segno d'incuria comparso mentre eri via è comparso in un momento qualsiasi
  // dell'assenza, non all'apertura: il conto verso «rotta» parte da lì
  const onset = () => new Date(last.getTime() + rng.next() * Math.max(0, now.getTime() - last.getTime())).toISOString();
  const r: CatchUpReport = {
    elapsedDays, newDirty: 0, newBroken: 0, witheredFlowers: 0, placeablesDirty: 0,
    placeablesBroken: 0, anniversaries: [], missedAnniversaries: [], blessing: null, wispsAdded: 0, weatherChanged: false, xpGained: 0,
  };

  // casa del Custode: l'arnia fa durare i fiori, il giardinetto rallenta le erbacce
  const flowerDays = housePerk(s, 'beehive') ? HOUSE_PERKS.beehiveFlowerDays : SIM.flowerWitherDays;
  const weedPace = housePerk(s, 'garden') ? HOUSE_PERKS.gardenWeeds : 1;
  for (const g of s.graves) {
    // Anniversario annuale della morte (dagli anni successivi): quello di oggi dà la ricompensa;
    // quelli caduti mentre il gioco era chiuso restano nei ricordi della tomba, senza premio
    // (le notifiche servono proprio a far aprire il gioco quel giorno)
    for (const at of anniversariesBetween(g.deathDate, last, now)) {
      if (g.lastAnniversaryYear !== null && g.lastAnniversaryYear >= at.getFullYear()) continue;
      g.lastAnniversaryYear = at.getFullYear();
      addMemory(s, g.id, 'anniversary', at);
      if (isoDate(at) === isoDate(now)) {
        r.anniversaries.push(g.name);
        s.player.xp += XP.anniversary;
        s.player.wisps += WISPS.anniversary;
        r.xpGained += XP.anniversary;
      } else r.missedAnniversaries.push(g.name);
    }
    // Ciclo esclusivo: PULITA → (fiori) → appassiti = SPORCA → pulisci → PULITA.
    if (g.hasFlowers && g.flowersAt) {
      if (daysBetween(g.flowersAt, now) >= flowerDays) {
        const withered = new Date(new Date(g.flowersAt).getTime() + flowerDays * 86400000).toISOString();
        g.hasFlowers = false;
        g.flowersAt = null;
        if (!g.dirty) { g.dirty = true; g.dirtySince ??= withered; }
        r.witheredFlowers++;
      }
    } else if (!g.hasFlowers && elapsedDays > 0 && !g.broken) {
      // erbacce o sporco: il primo segno d'incuria fa partire il conto verso «rotta»
      if (!g.weeds && rng.chance(Math.min(SIM.weedProbMax, SIM.weedProbPerDay * weedPace * elapsedDays))) {
        g.weeds = true; g.dirtySince ??= onset();
      }
      if (!g.dirty && rng.chance(Math.min(SIM.dirtProbMax, SIM.dirtProbPerDay * elapsedDays))) {
        g.dirty = true; g.dirtySince ??= onset(); r.newDirty++;
      }
    }
    if ((g.weeds || g.dirty) && g.hasFlowers) { g.hasFlowers = false; g.flowersAt = null; }
    // trascurata (sporca o con le erbacce) per graveBreakDays giorni: si rompe
    if ((g.dirty || g.weeds) && !g.broken && g.dirtySince && daysBetween(g.dirtySince, now) >= DECAY.graveBreakDays) {
      g.broken = true; g.dirty = true; g.hasFlowers = false; r.newBroken++;
    }
  }

  // Luci e costruzioni: si sporcano e si rompono con tempi larghi e diversi a ogni ciclo di cura.
  // Le luci vicine al Lampione del Custode (acceso o spento, purché non rotto) si sporcano ma non si rompono.
  for (const p of s.placeables) {
    if (!CATALOG[p.type]?.decays) continue;
    const age = daysBetween(p.caredAt, now);
    const d = placeableDecayDays(p);
    if (!p.dirty && age >= d.dirty) { p.dirty = true; r.placeablesDirty++; }
    if (!p.broken && age >= d.broken && !keeperProtected(s, p)) { p.dirty = true; p.broken = true; r.placeablesBroken++; }
  }

  // Benedizione narrativa del prete (offline).
  // (una possibilità per ogni giorno di assenza, al massimo una benedizione)
  if (s.graves.length > 0 && elapsedDays > 0 && rng.chance(1 - (1 - SIM.blessingChance) ** Math.min(elapsedDays, 30))) {
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
  // il conto avanza solo dei giorni interi già consumati: chi rientra più volte al giorno
  // non azzera ogni volta le ore accumulate (altrimenti erbacce, sporco e fuochi fatui
  // maturati da chiuso non arriverebbero mai)
  if (elapsedDays > 0) s.world.lastSimulationAt = new Date(last.getTime() + elapsedDays * DAY_MS).toISOString();
  else if (!(last.getTime() <= now.getTime())) s.world.lastSimulationAt = iso; // orologio spostato indietro o data rovinata
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
  const spawns = computeSpawns(s, isNight, rng, now);
  let wisp: LiveTickResult['wisp'] = null;
  if (s.world.looseWisps.length < wispCap(s) && rng.chance(liveWispChance(s, now, isNight))) {
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
  if (r.missedAnniversaries.length === 1) return `Mentre eri via è passato l’anniversario di ${r.missedAnniversaries[0]}.`;
  if (r.missedAnniversaries.length > 1) return `Mentre eri via sono passati ${r.missedAnniversaries.length} anniversari.`;
  if (r.newBroken > 0) return `${r.newBroken} ${r.newBroken === 1 ? 'tomba si è rotta' : 'tombe si sono rotte'}: vanno riparate.`;
  if (r.placeablesBroken > 0) return `${r.placeablesBroken} ${r.placeablesBroken === 1 ? 'oggetto si è rotto' : 'oggetti si sono rotti'} per l’incuria.`;
  if (r.blessing) return `Il prete è passato a benedire ${r.blessing}.`;
  if (r.witheredFlowers > 0) return 'Alcuni fiori sono ormai cenere.';
  if (r.newDirty > 0) return `${r.newDirty} ${r.newDirty === 1 ? 'lapide si è sporcata' : 'lapidi si sono sporcate'}: serve una pulita.`;
  if (r.placeablesDirty > 0) return 'Polvere e ragnatele sugli oggetti del cimitero.';
  if (r.wispsAdded > 0) return `Mentre eri via sono comparsi ${r.wispsAdded} fuochi fatui.`;
  return null;
}
