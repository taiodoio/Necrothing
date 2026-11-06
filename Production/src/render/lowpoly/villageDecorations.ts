import { LPC } from './palette.ts';
import { beam, leaf, prof, type CryptCtx } from './cryptKit.ts';

/** Un rampicante sulla parete locale, senza invadere le finestre. */
export function wallIvy(c: CryptCtx, x: number, z: number, height: number) {
  const { lp, v } = c;
  const stem = v.broken ? '#635e43' : '#526344';
  const foliage = v.broken ? ['#77704e', '#8a8057'] : ['#526d43', '#708653'];
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= 6; i++) points.push([x + Math.sin(i * 1.4) * 0.045, 0.2 + i * height / 6, z]);
  for (let i = 1; i < points.length; i++) beam(lp, points[i - 1], points[i], 0.008, stem);
  for (let i = 0; i < 11; i++) {
    if (v.broken && i % 4 === 0) continue;
    const y = 0.24 + i * height / 11;
    leaf(lp, x + Math.sin(i * 1.4) * 0.045 + (i % 2 ? 0.07 : -0.07), y, z + 0.012, 0.095, foliage[i % 2], (i % 2 ? 0.2 : -0.2));
  }
}

/** Piccola sagoma di pipistrello applicata alla parete. */
export function wallBat(c: CryptCtx, x: number, y: number, z: number) {
  prof(c.lp, [[-0.18, 0.04], [-0.12, 0.07], [-0.06, 0.025], [-0.025, 0.055], [0, 0.025], [0.025, 0.055], [0.06, 0.025], [0.12, 0.07], [0.18, 0.04], [0.14, -0.035], [0.09, -0.015], [0.05, -0.05], [0, -0.035], [-0.05, -0.05], [-0.09, -0.015], [-0.14, -0.035]], 0.012, LPC.iron, [x, y, z], [0, 0, 0], { ao: 0 });
}
