// Simulazione dell'economia: le regole vere del gioco (liveTick, bury,
// runCatchUp…) e un giocatore modello. Servono a vedere l'effetto dei valori
// di bilanciamento (src/game/balance.ts): sono STIME con le ipotesi qui
// sotto, non dati reali. I risultati vanno nel foglio «Game Dynamics».
//   npm run sim:economy            (tabella)
//   npm run sim:economy -- --json  (righe per il foglio)
// I test (tests/economy.test.mjs) usano runScenario per controllare gli obiettivi della curva.
import { createNewGame } from '../src/game/state.ts';
import * as R from '../src/game/rules.ts';
import { liveTick, runCatchUp } from '../src/game/simulation.ts';
import { areaForLevel, buildOccupancy, nearestFreeSpot } from '../src/game/world.ts';
import { rankForXp } from '../src/game/progression.ts';
import { LIVE_TICK_MS } from '../src/game/balance.ts';
import { createRng } from '../src/game/rng.ts';
import { PetGifts } from '../src/game/petGifts.ts';

/** Le ipotesi sul giocatore (non misurate: da rivedere coi dati della beta). */
export const HYPOTHESES = {
  sessionHour: 21, // si gioca la sera: notte nel gioco, più fantasmi
  burialSeconds: 90, // compilare una sepoltura e scegliere il posto
  wispSeconds: 6, // raggiungere e raccogliere un fuoco fatuo
  careSeconds: 8, // pulire o portare fiori a una tomba
  repairSeconds: 8,
  npcTapShare: 0.6, // quante presenze il giocatore nota e tocca
  npcSeconds: 5,
};
const H = HYPOTHESES;

/** Gli scenari: [giorno, minuti, sepolture] per sessione. */
export const SCENARIOS = {
  S1: { label: 'Prima sessione', plan: [[0, 10, 2]] },
  S2: { label: 'Prima sessione + tre sessioni brevi (giorni 1–3)', plan: [[0, 10, 2], [1, 5, 1], [2, 5, 1], [3, 5, 1]] },
  S3: { label: 'Una settimana di gioco occasionale (giorni 0, 2, 5, 7)', plan: [[0, 10, 2], [2, 5, 1], [5, 5, 1], [7, 5, 1]] },
  S4: { label: 'S3 + ritorno dopo 30 giorni', plan: [[0, 10, 2], [2, 5, 1], [5, 5, 1], [7, 5, 1], [37, 10, 1]] },
  M1: { label: 'Un mese: due sessioni brevi a settimana', plan: [[0, 10, 2], ...Array.from({ length: 8 }, (_, i) => [3 + Math.floor(i * 3.5), 5, 1])] },
};

const day = (d) => new Date(Date.UTC(2026, 10, 2 + d, H.sessionHour - 1, 0, 0)); // 2 nov 2026, la sera (ora italiana)

function session(s, start, minutes, burials, log, rnd) {
  let t = start.getTime();
  const end = t + minutes * 60_000;
  runCatchUp(s, start);
  const now = () => new Date(t);
  const spend = (sec) => { t += sec * 1000; };
  let nextTick = t + LIVE_TICK_MS, salt = 0;
  const tick = () => {
    while (t >= nextTick && nextTick <= end) {
      const r = liveTick(s, new Date(nextTick), ++salt);
      for (const sp of r.spawns) {
        if (rnd() >= H.npcTapShare) continue;
        try {
          if (sp.kind === 'gravedigger') for (const id of R.gravediggerRound(s, rnd)) R.gravediggerClean(s, id, now());
          else if (sp.kind === 'priest') R.priestBless(s, sp.graveId, now(), true);
          else R.interactRoamer(s, sp.kind, now(), { rare: sp.rare, graveId: sp.graveId, memoryId: sp.memoryId });
          log.npc++;
        } catch { /* una presenza che non si può toccare */ }
        spend(H.npcSeconds);
      }
      nextTick += LIVE_TICK_MS;
    }
  };
  const broken = s.graves.filter((g) => g.broken).length;
  log.brokenOnArrival.push(broken);
  // all'arrivo: ripara (se può), pulisce, porta fiori; poi seppellisce; poi raccoglie fuochi fatui
  for (const g of s.graves) if (t < end && g.broken && s.player.wisps >= R.graveRepairPrice(s)) { log.repairCost += R.graveRepairPrice(s); R.repairGrave(s, g.id, now()); log.repairs++; spend(H.repairSeconds); tick(); }
  for (const g of s.graves) if (t < end && !g.broken && (g.dirty || g.weeds)) { R.cleanGrave(s, g.id, now()); log.cleans++; spend(H.careSeconds); tick(); }
  for (const g of s.graves) if (t < end && !g.broken && !g.dirty && !g.weeds && !g.hasFlowers) { R.bringFlowers(s, g.id, now()); log.flowers++; spend(H.careSeconds); tick(); }
  for (let i = 0; i < burials && t < end; i++) {
    const p = nearestFreeSpot(30, 40, [2, 2], buildOccupancy(s), areaForLevel(s.world.expansionLevel));
    if (!p) break;
    R.bury(s, { ...R.emptyDraft(now()), name: `Oggetto ${log.burials + 1}`, category: 'electronics', deathCause: 'broken_cable', graveType: 'stone_simple' }, p.x, p.y, now());
    log.burials++;
    if (log.firstRankUpMin === null && rankForXp(s.player.xp).level >= 2) log.firstRankUpMin = log.minutes + (t - start.getTime()) / 60_000;
    spend(H.burialSeconds); tick();
  }
  while (t < end) {
    if (log.firstRankUpMin === null && rankForXp(s.player.xp).level >= 2) log.firstRankUpMin = log.minutes + (t - start.getTime()) / 60_000;
    if (s.world.looseWisps.length) { R.collectWisp(s, s.world.looseWisps[0].id); log.collected++; spend(H.wispSeconds); } else spend(5);
    tick();
  }
  if (log.firstRankUpMin === null && rankForXp(s.player.xp).level >= 2) log.firstRankUpMin = log.minutes + minutes;
  log.minutes += minutes;
  s.world.lastSimulationAt = new Date(end).toISOString();
}

/** Uno scenario su `runs` partite (semi diversi): le medie. */
export function runScenario(key, runs = 200) {
  const sc = SCENARIOS[key];
  const acc = {};
  for (let k = 0; k < runs; k++) {
    const rnd = createRng(`econ:${key}:${k}`);
    const s = createNewGame(day(0), 1000 + k);
    const log = { burials: 0, cleans: 0, flowers: 0, repairs: 0, repairCost: 0, collected: 0, npc: 0, minutes: 0, firstRankUpMin: null, brokenOnArrival: [] };
    for (const [d, min, bur] of sc.plan) session(s, day(d), min, bur, log, () => rnd.next());
    const row = {
      xp: s.player.xp, rank: rankForXp(s.player.xp).level, wisps: s.player.wisps, earned: s.player.counters.wispsEarned,
      burials: log.burials, cleans: log.cleans, flowers: log.flowers, repairs: log.repairs, repairCost: log.repairCost,
      collected: log.collected, npc: log.npc, brokenOnReturn: log.brokenOnArrival.at(-1), firstRankUpMin: log.firstRankUpMin ?? Infinity,
    };
    for (const [name, v] of Object.entries(row)) acc[name] = (acc[name] ?? 0) + v / runs;
  }
  return { key, label: sc.label, ...Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, Math.round(v * 10) / 10])) };
}

/** Gli sfruttamenti chiusi: quanto rendono ora in un'ora. */
export function exploits() {
  const t0 = day(0);
  const s = createNewGame(t0, 7);
  for (let sec = 0; sec < 3600; sec += 40) {
    const at = new Date(t0.getTime() + sec * 1000);
    const p = nearestFreeSpot(30, 40, [2, 2], buildOccupancy(s), areaForLevel(0));
    const { grave } = R.bury(s, { ...R.emptyDraft(at), name: 'x', category: 'electronics', deathCause: 'broken_cable', graveType: 'stone_simple' }, p.x, p.y, at);
    R.exhumeGrave(s, grave.id, new Date(at.getTime() + 20_000));
  }
  const pet = new PetGifts(() => 0.5);
  let petWisps = 0;
  for (let i = 0; i < 1800; i++) petWisps += pet.interact('cuccia') ?? 0; // una coccola ogni 2 s per un'ora
  return { buryExhume: { xp: s.player.xp, wisps: s.player.wisps - 30 }, petHour: petWisps };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = Object.keys(SCENARIOS).map((k) => runScenario(k));
  if (process.argv.includes('--json')) console.log(JSON.stringify({ hypotheses: H, rows, exploits: exploits() }));
  else { console.table(rows); console.log('Sfruttamenti (un\'ora):', exploits()); }
}
