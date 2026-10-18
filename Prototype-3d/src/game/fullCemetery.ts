// Un cimitero pieno per misurare le prestazioni (pagina bench.html, non il
// gioco): recinto al massimo, tutte le presenze, costruzioni, tante luci e
// decorazioni, e tombe di ogni tipo e stato fino a riempire lo spazio,
// lasciando un corridoio di una cella tra le cose. Deterministico.

import { CATALOG_LIST, rotatedFootprint } from './catalog.ts';
import { CATEGORIES, DEATH_CAUSES, GRAVE_TYPES } from './graves.ts';
import { EXPANSION, GRAVE_FOOTPRINT } from './balance.ts';
import * as R from './rules.ts';
import { createRng } from './rng.ts';
import { createNewGame, type SaveData } from './state.ts';
import { areaForLevel, buildOccupancy, cellsOf, type Rect } from './world.ts';

/** Quante copie per categoria (le cose uniche una sola volta). */
const COPIES: Record<string, number> = { light: 2, decoration: 1, ambient: 1, structure: 1, npc: 1 };
const SKIP = new Set(['path_stone', 'path_dirt', 'mud', 'tall_grass', 'shop']);

export function fullCemetery(seed = 4242, now = new Date(), graves = 150): SaveData {
  const s = createNewGame(now, seed);
  const rng = createRng(seed);
  const level = EXPANSION.length - 1;
  s.world.expansionLevel = level;
  s.world.unlockedLevel = level;
  s.world.notifiedLevel = level;
  s.player.xp = 1e6;
  s.player.wisps = 1e6;
  const area = areaForLevel(level);

  // occupazione tenuta aggiornata a mano (ricalcolarla a ogni tentativo è lento)
  const taken = new Set(buildOccupancy(s).owner.keys());
  const take = (x: number, y: number, fp: [number, number]) => { for (const c of cellsOf(x, y, fp)) taken.add(c); };
  /** Libero con un corridoio attorno (fuori dal recinto il corridoio non serve). */
  const fits = (x: number, y: number, fp: [number, number]) => {
    if (x < area.x || y < area.y || x + fp[0] > area.x + area.w || y + fp[1] > area.y + area.h) return false;
    return cellsOf(x - 1, y - 1, [fp[0] + 2, fp[1] + 2]).every((c) => !taken.has(c));
  };
  const spot = (fp: [number, number], r: Rect = area) => {
    for (let tries = 0; tries < 400; tries++) {
      const x = r.x + rng.int(Math.max(1, r.w - fp[0] + 1)), y = r.y + rng.int(Math.max(1, r.h - fp[1] + 1));
      if (fits(x, y, fp)) return { x, y };
    }
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (fits(x, y, fp)) return { x, y };
    return null;
  };

  // prima le cose grandi (si sistemano meglio), poi le piccole
  const items = CATALOG_LIST.filter((d) => d.category !== 'extra' && !SKIP.has(d.id))
    .flatMap((d) => Array.from({ length: d.unique ? 1 : COPIES[d.category] ?? 1 }, () => d))
    .sort((a, b) => b.footprint[0] * b.footprint[1] - a.footprint[0] * a.footprint[1]);
  for (const d of items) {
    const rot = d.rotatable ? rng.int(4) : 0;
    const fp = rotatedFootprint(d.id, rot);
    const at = spot(fp);
    if (!at) continue;
    s.inventory[d.id] = (s.inventory[d.id] ?? 0) + 1;
    const p = R.placeFromInventory(s, d.id, at.x, at.y, rot, now);
    take(at.x, at.y, fp);
    if (d.decays) { const k = rng.next(); p.dirty = k < 0.25; p.broken = k < 0.08; }
  }

  // tombe di ogni tipo e stato
  for (let i = 0; i < graves; i++) {
    const at = spot(GRAVE_FOOTPRINT);
    if (!at) break;
    const d = R.emptyDraft(now);
    d.name = `Oggetto ${i + 1}`;
    d.category = CATEGORIES[i % (CATEGORIES.length - 2)]; // niente «astratte» (una al giorno) né «altro»
    d.deathCause = DEATH_CAUSES[i % DEATH_CAUSES.length];
    d.graveType = GRAVE_TYPES[i % GRAVE_TYPES.length];
    d.epitaph = 'Riposa in pace.';
    const { grave } = R.bury(s, d, at.x, at.y, now);
    take(at.x, at.y, GRAVE_FOOTPRINT);
    const k = rng.next();
    if (k < 0.3) { grave.hasFlowers = true; grave.flowersAt = now.toISOString(); }
    else if (k < 0.5) grave.dirty = true;
    else if (k < 0.58) grave.broken = true;
    else if (k < 0.7) grave.weeds = true;
  }
  return s;
}
