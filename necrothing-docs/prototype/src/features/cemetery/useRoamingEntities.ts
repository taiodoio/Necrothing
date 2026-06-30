// Entità erranti effimere (fantasmi, gatti, corvi, becchino, prete, topi) che
// attraversano la mappa. Stato solo client-side: ogni tipo ha un comportamento
// di movimento distinto e svanisce uscendo di scena (o, di sicurezza, allo
// scadere della durata di vita). Tap → ricompensa (gestita dal chiamante).
//
// Modello di movimento: ogni entità ha una DIREZIONE di marcia cardinale
// (heading) e procede in linea retta. Davanti a un ostacolo NON inverte la
// rotta: devia lateralmente in modo costante (detour) finché la direzione
// preferita torna libera, poi la riprende. Così aggira gli ostacoli "come la
// torre degli scacchi" e prosegue fino a uscire dallo schermo, senza loop
// avanti-indietro. I fantasmi attraversano ogni cosa, ma anch'essi si muovono
// solo sui due assi.

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAP_COLS, MAP_ROWS } from '@/shared/domain/types';
import { newId } from '@/shared/utils/id';
import type { RoamingKind } from '@/shared/domain/roaming';
import { ROAMING_DEFS, ROAMING_TICK_MS } from '@/shared/domain/balance';

export type { RoamingKind } from '@/shared/domain/roaming';

const TICK_MS = ROAMING_TICK_MS;

/** Direzione cardinale: esattamente uno tra x/y è ±1, l'altro 0. */
interface Dir {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

export interface RoamingEntity {
  id: string;
  kind: RoamingKind;
  x: number; // coordinate in tile (float)
  y: number;
  facing: 1 | -1;
  /** Direzione di marcia preferita (cardinale). */
  hx: -1 | 0 | 1;
  hy: -1 | 0 | 1;
  /** Direzione di deviazione corrente per aggirare un ostacolo (0,0 = nessuna). */
  dhx: -1 | 0 | 1;
  dhy: -1 | 0 | 1;
  /** Timestamp (ms) di scadenza: cap di sicurezza se resta incastrata. */
  expiresAt: number;
  /** Variante rara (es. fantasma-oggetto): ricompensa maggiore. */
  rare?: boolean;
  /** Tomba di riferimento (es. fantasma legato a una sepoltura). */
  graveId?: string;
}

/** Opzioni di comparsa: variante rara e tomba di riferimento. */
export interface SpawnOpts {
  rare?: boolean;
  graveId?: string;
}

export interface UseRoamingEntities {
  entities: RoamingEntity[];
  tickMs: number;
  /** Genera un'entità. `near` (in tile) ne fissa il punto di comparsa. */
  spawn: (kind: RoamingKind, near?: { x: number; y: number }, opts?: SpawnOpts) => void;
  remove: (id: string) => void;
}

export function useRoamingEntities(occupancy?: Set<string>): UseRoamingEntities {
  const [entities, setEntities] = useState<RoamingEntity[]>([]);
  const ref = useRef(entities);
  ref.current = entities;
  // Occupazione corrente (tombe/strutture/bottega): letta dal loop di movimento
  // per far cambiare direzione agli NPC davanti agli ostacoli.
  const occRef = useRef<Set<string>>(occupancy ?? new Set());
  occRef.current = occupancy ?? occRef.current;

  const spawn = useCallback<UseRoamingEntities['spawn']>((kind, near, opts) => {
    const def = ROAMING_DEFS[kind];
    let start: { x: number; y: number };
    let heading: Dir;

    if (def.behavior === 'path') {
      // Attraversa la mappa da un bordo al bordo opposto.
      const pair = edgePair();
      start = pair.start;
      heading = {
        x: Math.sign(pair.end.x - pair.start.x) as -1 | 0 | 1,
        y: Math.sign(pair.end.y - pair.start.y) as -1 | 0 | 1,
      };
    } else if (near) {
      // Comparsa interna (es. fantasma legato a una tomba): punta verso il centro.
      start = { x: clamp(near.x, 0, MAP_COLS - 1), y: clamp(near.y, 0, MAP_ROWS - 1) };
      heading = headingTowardCenter(start.x, start.y);
    } else {
      // Comparsa "dall'esterno": entra da un bordo dirigendosi verso l'interno.
      start = edgeCell();
      heading = inwardHeading(start.x, start.y);
    }

    setEntities((list) => [
      ...list,
      {
        id: newId(),
        kind,
        x: start.x,
        y: start.y,
        facing: heading.x >= 0 ? 1 : -1,
        hx: heading.x,
        hy: heading.y,
        dhx: 0,
        dhy: 0,
        expiresAt: Date.now() + def.lifespanMs,
        rare: opts?.rare,
        graveId: opts?.graveId,
      },
    ]);
  }, []);

  const remove = useCallback<UseRoamingEntities['remove']>((id) => {
    setEntities((list) => list.filter((e) => e.id !== id));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (ref.current.length === 0) return;
      const now = Date.now();
      const occ = occRef.current;
      setEntities((list) =>
        list.map((e) => step(e, now, occ)).filter((e): e is RoamingEntity => e !== null),
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return { entities, tickMs: TICK_MS, spawn, remove };
}

/**
 * Avanza l'entità di un tick. Ritorna `null` quando deve sparire (uscita dalla
 * mappa o cap di durata di vita superato).
 */
function step(e: RoamingEntity, now: number, occ: Set<string>): RoamingEntity | null {
  // Cap di sicurezza: se è rimasta in scena oltre la durata massima, svanisce.
  if (now > e.expiresAt) return null;

  const def = ROAMING_DEFS[e.kind];

  // Lo scattante (topo) ogni tanto cambia bruscamente direzione preferita.
  if (def.behavior === 'skitter' && Math.random() < 0.2) {
    const d = randomCardinal();
    e = { ...e, hx: d.x, hy: d.y, dhx: 0, dhy: 0 };
  }

  return move(e, def.speed, occ);
}

/** True se la cella (cx,cy) è fuori mappa oppure occupata da un ostacolo. */
function blockedCell(cx: number, cy: number, occ: Set<string>): boolean {
  if (cx < 0 || cy < 0 || cx > MAP_COLS - 1 || cy > MAP_ROWS - 1) return true;
  return occ.has(`${cx},${cy}`);
}

function offMap(cx: number, cy: number): boolean {
  return cx < 0 || cy < 0 || cx > MAP_COLS - 1 || cy > MAP_ROWS - 1;
}

/**
 * Un passo di marcia. Procede nella direzione preferita; se è bloccata, devia
 * lateralmente in modo costante (mantenendo la deviazione finché la direzione
 * preferita non torna libera). Esce di scena (null) raggiungendo un bordo nella
 * direzione di marcia. I fantasmi ignorano gli ostacoli.
 */
function move(e: RoamingEntity, speed: number, occ: Set<string>): RoamingEntity | null {
  const ghost = e.kind === 'ghost';
  const cx = Math.round(e.x);
  const cy = Math.round(e.y);

  let dhx = e.dhx;
  let dhy = e.dhy;
  const detouring = dhx !== 0 || dhy !== 0;

  // Se stavamo deviando e la direzione preferita è di nuovo libera, riprendila.
  if (detouring && (ghost || !blockedCell(cx + e.hx, cy + e.hy, occ))) {
    dhx = 0;
    dhy = 0;
  }

  // Direzione attiva = deviazione se in corso, altrimenti quella preferita.
  let hx: -1 | 0 | 1 = dhx !== 0 || dhy !== 0 ? dhx : e.hx;
  let hy: -1 | 0 | 1 = dhx !== 0 || dhy !== 0 ? dhy : e.hy;

  // Uscita di scena nella direzione di marcia.
  if (offMap(cx + hx, cy + hy)) return null;

  // Ostacolo davanti: aggira deviando di lato (i fantasmi lo ignorano).
  let newPref: Dir | null = null;
  if (!ghost && blockedCell(cx + hx, cy + hy, occ)) {
    const d = chooseDetour(e, cx, cy, occ);
    if (d) {
      // Deviazione laterale: la direzione preferita resta invariata e verrà
      // ripresa appena torna libera.
      dhx = d.x;
      dhy = d.y;
      hx = d.x;
      hy = d.y;
    } else {
      // Vicolo cieco (laterali bloccati): cambia ROTTA preferita e torna
      // indietro, così non rimbalza avanti-indietro sullo stesso ostacolo.
      const rev: Dir = { x: (-e.hx as -1 | 0 | 1), y: (-e.hy as -1 | 0 | 1) };
      if (!blockedCell(cx + rev.x, cy + rev.y, occ)) {
        newPref = rev;
        dhx = 0;
        dhy = 0;
        hx = rev.x;
        hy = rev.y;
      } else {
        return e; // completamente incastrata: resta ferma (il cap la rimuoverà)
      }
    }
    if (offMap(cx + hx, cy + hy)) return null;
  }

  // Avanza di max 1 cella/tick (rilevamento ostacoli affidabile); i fantasmi no.
  const stepLen = ghost ? speed : Math.min(speed, 1);
  const nx = hx !== 0 ? clamp(e.x + hx * stepLen, 0, MAP_COLS - 1) : e.x;
  const ny = hy !== 0 ? clamp(e.y + hy * stepLen, 0, MAP_ROWS - 1) : e.y;

  return {
    ...e,
    x: nx,
    y: ny,
    hx: newPref ? newPref.x : e.hx,
    hy: newPref ? newPref.y : e.hy,
    dhx,
    dhy,
    facing: hx > 0 ? 1 : hx < 0 ? -1 : e.facing,
  };
}

/**
 * Sceglie la direzione di deviazione (perpendicolare a quella preferita) per
 * aggirare un ostacolo. Predilige il lato verso il centro mappa (stabile, evita
 * di incollarsi ai bordi). `null` se entrambi i lati sono bloccati.
 */
function chooseDetour(e: RoamingEntity, cx: number, cy: number, occ: Set<string>): Dir | null {
  const horizontal = e.hx !== 0;
  // Perpendicolari rispetto alla direzione preferita.
  const perps: Dir[] = horizontal
    ? [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]
    : [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ];

  // Ordina mettendo davanti il lato che punta verso il centro mappa.
  const towardCenter = horizontal ? Math.sign(MAP_ROWS / 2 - cy) : Math.sign(MAP_COLS / 2 - cx);
  perps.sort((a, b) => {
    const sa = horizontal ? a.y : a.x;
    const sb = horizontal ? b.y : b.x;
    return (sb === towardCenter ? 1 : 0) - (sa === towardCenter ? 1 : 0);
  });

  for (const p of perps) {
    if (!blockedCell(cx + p.x, cy + p.y, occ)) return p;
  }
  return null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Direzione cardinale verso il centro della mappa (asse dominante). */
function headingTowardCenter(x: number, y: number): Dir {
  const dxc = MAP_COLS / 2 - x;
  const dyc = MAP_ROWS / 2 - y;
  if (Math.abs(dxc) >= Math.abs(dyc)) return { x: (Math.sign(dxc) || 1) as -1 | 0 | 1, y: 0 };
  return { x: 0, y: (Math.sign(dyc) || 1) as -1 | 0 | 1 };
}

/** Direzione "verso l'interno" da una cella di bordo. */
function inwardHeading(x: number, y: number): Dir {
  if (x <= 0) return { x: 1, y: 0 };
  if (x >= MAP_COLS - 1) return { x: -1, y: 0 };
  if (y <= 0) return { x: 0, y: 1 };
  if (y >= MAP_ROWS - 1) return { x: 0, y: -1 };
  return headingTowardCenter(x, y);
}

/** Direzione cardinale casuale. */
function randomCardinal(): Dir {
  const dirs: Dir[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

/** Cella casuale su un bordo della mappa (comparsa "dall'esterno"). */
function edgeCell(): { x: number; y: number } {
  const onVertical = Math.random() < 0.5;
  if (onVertical) {
    return {
      x: Math.random() < 0.5 ? 0 : MAP_COLS - 1,
      y: Math.floor(Math.random() * MAP_ROWS),
    };
  }
  return {
    x: Math.floor(Math.random() * MAP_COLS),
    y: Math.random() < 0.5 ? 0 : MAP_ROWS - 1,
  };
}

/** Coppia di celle su bordi opposti, per chi attraversa la mappa. */
function edgePair(): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const horizontal = Math.random() < 0.5;
  if (horizontal) {
    const y = Math.floor(Math.random() * MAP_ROWS);
    const leftToRight = Math.random() < 0.5;
    return leftToRight
      ? { start: { x: 0, y }, end: { x: MAP_COLS - 1, y } }
      : { start: { x: MAP_COLS - 1, y }, end: { x: 0, y } };
  }
  const x = Math.floor(Math.random() * MAP_COLS);
  const topToBottom = Math.random() < 0.5;
  return topToBottom
    ? { start: { x, y: 0 }, end: { x, y: MAP_ROWS - 1 } }
    : { start: { x, y: MAP_ROWS - 1 }, end: { x, y: 0 } };
}
