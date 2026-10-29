// A* su griglia di celle (8 direzioni, niente tagli d'angolo).

export interface Cell { x: number; y: number }

export function findPath(
  start: Cell, goal: Cell, blocked: (x: number, y: number) => boolean, size: number, maxNodes = 4000,
): Cell[] | null {
  if (start.x === goal.x && start.y === goal.y) return [goal];
  const key = (x: number, y: number) => y * size + x;
  const open: number[] = [key(start.x, start.y)];
  const g = new Map<number, number>([[open[0], 0]]);
  const f = new Map<number, number>([[open[0], 0]]);
  const came = new Map<number, number>();
  const h = (x: number, y: number) => { const dx = Math.abs(x - goal.x), dy = Math.abs(y - goal.y); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  let expanded = 0;
  while (open.length && expanded++ < maxNodes) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if ((f.get(open[i]) ?? 1e9) < (f.get(open[bi]) ?? 1e9)) bi = i;
    const cur = open.splice(bi, 1)[0];
    const cx = cur % size, cy = Math.floor(cur / size);
    if (cx === goal.x && cy === goal.y) {
      const path: Cell[] = [];
      let k: number | undefined = cur;
      while (k !== undefined) { path.unshift({ x: k % size, y: Math.floor(k / size) }); k = came.get(k); }
      return path;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size || blocked(nx, ny)) continue;
        if (dx && dy && (blocked(cx + dx, cy) || blocked(cx, cy + dy))) continue;
        const nk = key(nx, ny);
        const ng = (g.get(cur) ?? 0) + (dx && dy ? 1.41 : 1);
        if (ng < (g.get(nk) ?? 1e9)) {
          came.set(nk, cur);
          g.set(nk, ng);
          f.set(nk, ng + h(nx, ny));
          if (!open.includes(nk)) open.push(nk);
        }
      }
    }
  }
  return null;
}
