// Tracciato a mano libera (sentieri, staccionate, inferriate, muretti): il
// tratto segue il dito e, quando il dito gira, piega da solo. Sulla griglia
// una curva è una serie di tratti dritti che si toccano negli angoli: un
// cambio netto fa un angolo, un movimento in diagonale una scaletta. Per non
// fare scalini quando il dito trema, si gira solo quando il dito si è
// allontanato dalla linea di quasi una casella intera.

import type { TraceCell } from './rules.ts';

type Axis = 'x' | 'y';

export interface TraceDraw {
  /** Tratti già piegati, in ordine (l'ultimo finisce dove parte quello in corso). */
  done: Array<{ cells: TraceCell[]; axis: Axis }>;
  /** Dove parte il tratto in corso. */
  anchor: { x: number; y: number };
  /** Il suo asse (null finché il dito non si è mosso). */
  axis: Axis | null;
  /** Fin dove arriva, lungo l'asse. */
  along: number;
}

/** Quanto deve allontanarsi il dito dalla linea (in caselle) perché il tratto giri. */
export const TURN_AT = 0.85;

/** Tratto dritto di `n` caselle (con segno) da `a` lungo `axis`, estremi compresi. */
function run(a: { x: number; y: number }, axis: Axis, n: number): TraceCell[] {
  const s = Math.sign(n);
  return Array.from({ length: Math.abs(n) + 1 }, (_, i) => ({ x: a.x + (axis === 'x' ? s * i : 0), y: a.y + (axis === 'y' ? s * i : 0), rot: axis === 'x' ? 0 : 1 }));
}

const other = (a: Axis): Axis => (a === 'x' ? 'y' : 'x');

export function startTraceDraw(cell: { x: number; y: number }): TraceDraw {
  return { done: [], anchor: { ...cell }, axis: null, along: 0 };
}

/**
 * Il dito è in `p` (coordinate di griglia, frazionarie: la casella è il
 * floor): il tratto si allunga, gira o torna indietro.
 */
export function moveTraceDraw(d: TraceDraw, p: { x: number; y: number }) {
  const cell = { x: Math.floor(p.x), y: Math.floor(p.y) };
  for (let guard = 0; guard < 64; guard++) {
    // tornando sull'ultimo tratto piegato si disfa l'angolo e si riprende quello
    const last = d.done[d.done.length - 1];
    if (last && last.cells.some((c) => c.x === cell.x && c.y === cell.y)) {
      d.done.pop();
      d.anchor = { x: last.cells[0].x, y: last.cells[0].y };
      d.axis = last.axis;
      const end = last.cells[last.cells.length - 1];
      d.along = last.axis === 'x' ? end.x - d.anchor.x : end.y - d.anchor.y;
    }
    const dx = cell.x - d.anchor.x, dy = cell.y - d.anchor.y;
    if (d.axis === null) {
      if (!dx && !dy) { d.along = 0; return; }
      d.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    const along = d.axis === 'x' ? dx : dy, perp = d.axis === 'x' ? dy : dx;
    // quanto è lontano il dito dalla linea del tratto (dal centro delle sue caselle)
    const off = Math.abs((d.axis === 'x' ? p.y : p.x) - ((d.axis === 'x' ? d.anchor.y : d.anchor.x) + 0.5));
    if (perp && off >= TURN_AT) {
      if (along) {
        // il dito ha girato: il tratto finisce qui e ne parte un altro, perpendicolare
        const corner = { x: d.anchor.x + (d.axis === 'x' ? along : 0), y: d.anchor.y + (d.axis === 'y' ? along : 0) };
        d.done.push({ cells: run(d.anchor, d.axis, along), axis: d.axis });
        d.anchor = corner;
      }
      // (tratto ancora vuoto: si cambia solo verso)
      d.axis = other(d.axis);
      continue;
    }
    d.along = along;
    return;
  }
}

/** Le caselle del tracciato, in ordine (gli angoli una volta sola). */
export function traceDrawCells(d: TraceDraw): TraceCell[] {
  const out: TraceCell[] = [];
  for (const r of d.done) out.push(...(out.length ? r.cells.slice(1) : r.cells));
  const cur = run(d.anchor, d.axis ?? 'x', d.along);
  out.push(...(out.length ? cur.slice(1) : cur));
  return out;
}
