import { prof, type CryptCtx } from './cryptKit.ts';
import { wallIvy } from './villageDecorations.ts';

/** Macchie di umidità e muschio sui muri, comuni agli stati sporco e rotto. */
export function weatheredHouse(c: CryptCtx, compact: boolean) {
  const { lp, v, family } = c;
  if (!v.dirty && !v.broken) return;
  const settings = family === 'ghost'
    ? { x: 0, z: -0.35, w: 2.15, d: 1.3, base: 0.24, top: 1.1, color: '#555a49', lean: c.variant === 2 ? 0.022 : c.variant === 3 ? -0.025 : 0 }
    : family === 'rectory'
      ? { x: compact ? 0.32 : 0.48, z: -0.4, w: 2.05, d: 1.3, base: 0.18, top: 1.95, color: '#77785d', lean: 0 }
      : family === 'florist'
        ? { x: -0.65, z: -0.35, w: compact ? 2.1 : 1.75, d: 1.3, base: 0.16, top: 1.2, color: '#5e674a', lean: 0 }
        : family === 'lamplighter'
          ? { x: -0.55, z: -0.35, w: compact ? 2.05 : 1.85, d: 1.3, base: 0.16, top: 1.1, color: '#5d6450', lean: 0 }
          : { x: 0, z: -0.35, w: 2.1, d: 1.35, base: 0.18, top: 1.15, color: '#535b48', lean: 0 };
  const { x, z, w, d, base, top, color, lean } = settings;
  lp.push([x, 0, z], 0, 0, lean);
  const patch = (px: number, py: number, pz: number, sx: number, sy: number) => {
    const shape: Array<[number, number]> = [[-0.52, 0], [-0.49, 0.3], [-0.35, 0.36], [-0.31, 0.74], [-0.12, 0.6], [-0.04, 1], [0.12, 0.79], [0.25, 0.9], [0.3, 0.48], [0.46, 0.42], [0.5, 0]];
    prof(lp, shape.map(([a, b]) => [a * sx, b * sy]), 0.008, color, [px, py, pz], [0, 0, 0], { ao: 0, vary: 0.04, jitter: 0 });
  };
  // Al piede del muro: macchie irregolari sotto le finestre, senza coprire i vetri.
  for (const dir of [-1, 1]) {
    lp.push([0, 0, dir * (d / 2 + 0.012)], dir < 0 ? Math.PI : 0);
    patch(-w / 2 + 0.22, base + 0.005, 0, 0.34, 0.31);
    patch(w / 2 - 0.22, base + 0.005, 0, 0.34, 0.27);
    // Colature sottili sotto la gronda, lontano dagli infissi.
    patch(-w / 2 + 0.17, top - 0.24, 0.002, 0.13, 0.19);
    lp.pop();
  }
  // Muschio sui due fianchi, ai lati delle finestre laterali.
  for (const side of [-1, 1]) {
    lp.push([side * (w / 2 + 0.012), 0, 0], side * Math.PI / 2);
    patch(-0.42, base + 0.005, 0, 0.26, 0.3);
    patch(0.43, base + 0.005, 0, 0.24, 0.24);
    wallIvy(c, 0.48, 0.03, 0.72);
    wallIvy(c, -0.48, 0.03, 0.54);
    lp.pop();
  }
  // Il rampicante avanza sulla facciata senza arrivare ai vetri o alla porta.
  const tallFront = family === 'ghost' || family === 'rectory';
  wallIvy(c, -w / 2 + (tallFront ? 0.31 : 0.17), d / 2 + 0.035, tallFront ? 0.78 : 0.2);
  // Chiazze di muschio sulla falda frontale; restano sulle porzioni di tetto presenti.
  const ghost = family === 'ghost';
  const roofRise = family === 'rectory' ? 0.78 : family === 'florist' ? 0.7 : family === 'lamplighter' ? 0.62 : 0.9;
  const apex = c.variant === 1 ? 2.75 : c.variant === 2 ? 2.6 : 3.0;
  const roofZ = ghost ? 0.32 : 0.42;
  const slope = ghost ? 2.25 : roofRise / (d / 2);
  const angle = -Math.atan(1 / slope);
  const mossShape: Array<[number, number]> = [[-0.18, -0.05], [-0.13, -0.12], [-0.04, -0.09], [0.02, -0.14], [0.16, -0.09], [0.18, 0.02], [0.1, 0.06], [0.04, 0.12], [-0.05, 0.09], [-0.13, 0.11], [-0.2, 0.04]];
  for (const px of [-0.67, 0.67]) {
    if (v.broken && px > 0 && (family === 'lamplighter' || family === 'reaper')) continue;
    const zPatch = roofZ + (px < 0 ? -0.035 : 0.04);
    const roofY = ghost ? apex - 0.6 - (zPatch - 0.2) * slope : top + (family === 'reaper' ? 0.06 : 0) + roofRise - zPatch * slope;
    const scale = px < 0 ? 1 : 0.78;
    prof(lp, mossShape.map(([a, b]) => [a * scale, b * scale]), 0.01, '#657250', [px, roofY + 0.03, zPatch + 0.065], [angle, 0, 0], { ao: 0, vary: 0.04, jitter: 0 });
  }
  lp.pop();
}
