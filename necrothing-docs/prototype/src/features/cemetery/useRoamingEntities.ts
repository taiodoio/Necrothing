// Entità erranti effimere (fantasmi, gatti, corvi, becchino, prete, topi) che
// attraversano la mappa. Stato solo client-side: ogni tipo ha un comportamento
// di movimento distinto e svanisce dopo una durata di vita.
// Tap → ricompensa (gestita dal chiamante).

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAP_COLS, MAP_ROWS } from '@/shared/domain/types';
import { newId } from '@/shared/utils/id';
import type { RoamingKind } from '@/shared/domain/roaming';
import { ROAMING_DEFS, ROAMING_TICK_MS } from '@/shared/domain/balance';

export type { RoamingKind } from '@/shared/domain/roaming';

const TICK_MS = ROAMING_TICK_MS;

export interface RoamingEntity {
  id: string;
  kind: RoamingKind;
  x: number; // coordinate in tile (float)
  y: number;
  tx: number; // bersaglio corrente
  ty: number;
  facing: 1 | -1;
  perched: boolean;
  /** Timestamp (ms) di scadenza: oltre, l'entità svanisce. */
  expiresAt: number;
}

function randCell(): { x: number; y: number } {
  return {
    x: Math.floor(Math.random() * MAP_COLS),
    y: Math.floor(Math.random() * MAP_ROWS),
  };
}

export interface UseRoamingEntities {
  entities: RoamingEntity[];
  tickMs: number;
  /** Genera un'entità. `near` (in tile) ne fissa il punto di comparsa. */
  spawn: (kind: RoamingKind, near?: { x: number; y: number }) => void;
  remove: (id: string) => void;
}

export function useRoamingEntities(): UseRoamingEntities {
  const [entities, setEntities] = useState<RoamingEntity[]>([]);
  const ref = useRef(entities);
  ref.current = entities;

  const spawn = useCallback<UseRoamingEntities['spawn']>((kind, near) => {
    const def = ROAMING_DEFS[kind];
    let start: { x: number; y: number };
    let target: { x: number; y: number };

    if (def.behavior === 'path') {
      // Attraversa la mappa da un bordo a quello opposto.
      const pair = edgePair();
      start = pair.start;
      target = pair.end;
    } else {
      start = near
        ? { x: clamp(near.x, 0, MAP_COLS - 1), y: clamp(near.y, 0, MAP_ROWS - 1) }
        : edgeCell();
      target = randCell();
    }

    setEntities((list) => [
      ...list,
      {
        id: newId(),
        kind,
        x: start.x,
        y: start.y,
        tx: target.x,
        ty: target.y,
        facing: target.x >= start.x ? 1 : -1,
        perched: false,
        expiresAt: Date.now() + def.lifespanMs,
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
      setEntities((list) => list.filter((e) => e.expiresAt > now).map((e) => step(e)));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return { entities, tickMs: TICK_MS, spawn, remove };
}

function step(e: RoamingEntity): RoamingEntity {
  const def = ROAMING_DEFS[e.kind];
  const dx = e.tx - e.x;
  const dy = e.ty - e.y;
  const dist = Math.hypot(dx, dy);

  switch (def.behavior) {
    case 'path':
      // Raggiunto il bordo opposto: svanisce al tick successivo.
      if (dist < 0.8) return { ...e, expiresAt: 0 };
      return advance(e, dx, dy, dist, def.speed);

    case 'perch':
      if (e.perched) return e; // posato: resta fermo fino alla scadenza
      if (dist < 0.8) return { ...e, perched: true, tx: e.x, ty: e.y };
      return advance(e, dx, dy, dist, def.speed);

    case 'skitter': {
      // Scatti rapidi con frequenti cambi di direzione.
      if (dist < 0.4 || Math.random() < 0.25) {
        const t = randCell();
        return { ...e, tx: t.x, ty: t.y };
      }
      return advance(e, dx, dy, dist, def.speed);
    }

    case 'wander':
    default:
      if (dist < 0.6) {
        const t = randCell();
        return { ...e, tx: t.x, ty: t.y };
      }
      return advance(e, dx, dy, dist, def.speed);
  }
}

function advance(
  e: RoamingEntity,
  dx: number,
  dy: number,
  dist: number,
  speed: number,
): RoamingEntity {
  const nx = e.x + (dx / dist) * speed;
  const ny = e.y + (dy / dist) * speed;
  return {
    ...e,
    x: clamp(nx, 0, MAP_COLS - 1),
    y: clamp(ny, 0, MAP_ROWS - 1),
    facing: dx >= 0 ? 1 : -1,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
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
