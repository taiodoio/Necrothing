// Le 10 lapidi della PWA, ricostruite come modelli procedurali, ciascuna con
// i 4 stati esclusivi (pulita, con fiori, trascurata, rotta) e variazioni
// deterministiche per seed. Ingombro 2×2 celle (20×20 voxel), lapide sul retro
// rivolta verso +z (sud, verso la camera), tumulo davanti.

import type { GraveType, GraveVisualState } from '../../game/graves.ts';
import { ModelBuilder, type Model } from '../shape.ts';
import { P } from '../palette.ts';
import { bouquet, candle, cobweb, DRY, grassClump, leaves, moss, pebbles, skull, weeds } from './common.ts';

const STONE_Z = -6; // centro della lapide (asse z)

/** Lapide vera e propria, costruita attorno all'origine (base a y=0, centro z=0). */
function headstone(b: ModelBuilder, type: GraveType): { w: number; h: number; t: number } {
  const r = b.rng;
  const tone = r.pick([P.stone, P.stone, P.stoneWarm]);
  const dark = P.stoneDark;
  const engrave = (y: number, w: number) => b.box(-w / 2, y, 1, w / 2, y + 1, 2.5, P.ink, { carve: true });
  switch (type) {
    case 'stone_simple': {
      const w = 10 + r.int(2) * 2, h = 8 + r.int(2), t = 3;
      b.box(-w / 2 - 1, 0, -t / 2 - 1, w / 2 + 1, 2, t / 2 + 1, dark);
      b.box(-w / 2, 2, -t / 2, w / 2, 2 + h, t / 2, tone);
      b.push([0, 2 + h, -t / 2], 0, Math.PI / 2).cyl(0, 0, 0, t, w / 2, w / 2, tone, { seg: 9 }).pop();
      engrave(2 + h - 1, 5); engrave(2 + h - 3, 3);
      b.box(-0.5, 4, 1, 0.5, 7, 2.5, P.ink, { carve: true });
      b.box(-1.5, 5.5, 1, 1.5, 6.5, 2.5, P.ink, { carve: true });
      return { w, h: 2 + h + w / 2, t };
    }
    case 'rectangular': {
      const w = 11, h = 11 + r.int(3), t = 3;
      b.box(-7, 0, -3, 7, 2, 3, dark);
      b.box(-w / 2, 2, -t / 2, w / 2, 2 + h, t / 2, tone);
      b.box(-w / 2 - 0.5, 2 + h, -t / 2 - 0.5, w / 2 + 0.5, 3 + h, t / 2 + 0.5, P.stoneLight);
      b.box(-w / 2 + 1, 2 + h - 1, -t / 2 - 0.5, -w / 2 + 2, 3 + h, t / 2 + 0.5, P.stoneLight);
      b.box(-3.5, 4, 1, 3.5, 10, 2.5, P.ink, { carve: true });
      b.box(-2.5, 5, 0, 2.5, 9, 1.6, tone);
      engrave(h - 1, 6);
      return { w, h: h + 3, t };
    }
    case 'gothic': {
      const w = 10, h = 9 + r.int(2), t = 3;
      b.box(-6, 0, -2.5, 6, 2, 2.5, dark);
      b.box(-w / 2, 2, -t / 2, w / 2, 2 + h, t / 2, P.stoneDark);
      b.wedge(-w / 2, 2 + h, -t / 2, w / 2, 2 + h + 6, t / 2, 'z', P.stoneDark);
      b.box(-3, 4, 1, 3, 2 + h, 2.5, P.ink, { carve: true });
      b.wedge(-3, 2 + h, 1, 3, 2 + h + 3, 2.5, 'z', P.ink, { carve: true });
      b.box(-2, 4, 0, 2, 2 + h, 1.6, tone);
      skull(b, 0, 6, 0.5, P.boneDark);
      b.ell(0, 2 + h + 6.5, 0, 1, 1.4, 1, P.stone);
      b.box(-w / 2 - 1, 2, -t / 2 - 0.5, -w / 2 + 0.5, 2 + h + 1, t / 2 + 0.5, P.stone);
      b.box(w / 2 - 0.5, 2, -t / 2 - 0.5, w / 2 + 1, 2 + h + 1, t / 2 + 0.5, P.stone);
      return { w, h: 2 + h + 7, t };
    }
    case 'celtic_cross': {
      const t = 3;
      b.box(-5, 0, -3, 5, 2, 3, dark);
      b.box(-3, 2, -2, 3, 4, 2, tone);
      b.box(-1.5, 4, -t / 2, 1.5, 20, t / 2, tone);
      b.box(-6, 13, -t / 2, 6, 16, t / 2, tone);
      for (const rz of [0, Math.PI]) b.push([0, 14.5, 0], 0, 0, rz).ring(0, 0, -1, 1, 3.3, 4.6, P.stoneLight, { seg: 8 }).pop();
      b.box(-0.5, 7, 1, 0.5, 11, 2, P.ink, { carve: true });
      return { w: 12, h: 20, t };
    }
    case 'marble_cross': {
      const t = 2.5;
      b.box(-6, 0, -3.5, 6, 2, 3.5, P.stoneLight);
      b.box(-4.5, 2, -2.5, 4.5, 4, 2.5, P.marble);
      b.box(-1.3, 4, -t / 2, 1.3, 21, t / 2, P.marble, { jitter: 0.04 });
      b.box(-5, 15, -t / 2, 5, 17.5, t / 2, P.marble, { jitter: 0.04 });
      b.box(-4, 2.5, 2.5, 4, 3.5, 3.6, P.ink, { carve: true });
      return { w: 12, h: 21, t };
    }
    case 'angel': {
      b.box(-6, 0, -4, 6, 2, 4, dark);
      b.box(-4.5, 2, -3, 4.5, 8, 3, tone);
      b.box(-5, 8, -3.5, 5, 9, 3.5, P.stoneLight);
      b.cyl(0, 0, 9, 18, 3.3, 1.5, P.marble, { seg: 7 });
      b.ell(0, 19.5, 0, 1.7, 1.9, 1.7, P.marble);
      b.box(-1.5, 14, 1, 1.5, 15.5, 2.3, P.marble);
      for (const s of [-1, 1]) {
        b.push([s * 1.2, 12, -1.2], s * 0.35).box(s > 0 ? 0 : -5.5, 0, -0.7, s > 0 ? 5.5 : 0, 8, 0.7, P.ivory, { jitter: 0.05 }).pop();
        b.push([s * 1.2, 16, -1.2], s * 0.35).box(s > 0 ? 3 : -6.5, 0, -0.7, s > 0 ? 6.5 : -3, 3, 0.7, P.ivory).pop();
      }
      b.box(-3, 4, 2.5, 3, 6, 3.5, P.ink, { carve: true });
      return { w: 12, h: 21, t: 6 };
    }
    case 'obelisk': {
      b.box(-6, 0, -6, 6, 2, 6, dark);
      b.box(-4.5, 2, -4.5, 4.5, 5, 4.5, tone);
      const steps = [[3, 5, 10], [2.6, 10, 15], [2.2, 15, 20], [1.8, 20, 24]];
      for (const [half, y0, y1] of steps) b.box(-half, y0, -half, half, y1, half, P.stoneLight, { jitter: 0.04 });
      b.box(-1.2, 24, -1.2, 1.2, 25.5, 1.2, P.stoneLight);
      b.box(-0.5, 25.5, -0.5, 0.5, 27, 0.5, P.stoneLight);
      b.box(-2, 7, 2.5, 2, 9, 3.4, P.ink, { carve: true });
      return { w: 12, h: 27, t: 12 };
    }
    case 'family_memorial': {
      b.box(-9.5, 0, -4, 9.5, 2, 4, dark);
      b.box(-8, 2, -2, 8, 11, 2, tone);
      for (const x of [-8, 6]) {
        b.box(x - 0.5, 2, -2.6, x + 2.5, 13, 2.6, P.stoneLight);
        b.box(x - 1, 13, -3, x + 3, 14, 3, P.stoneLight);
      }
      b.wedge(-6, 11, -2, 6, 15, 2, 'z', tone);
      for (const x of [-5, -1, 3]) b.box(x, 4, 1.5, x + 2.5, 9, 2.6, P.ink, { carve: true });
      b.ell(0, 15.5, 0, 1.2, 1.2, 1.2, P.stoneLight);
      return { w: 19, h: 16, t: 6 };
    }
    case 'decorated_monument': {
      b.box(-8, 0, -4, 8, 2, 4, dark);
      b.box(-6, 2, -2, 6, 13, 2, tone);
      for (const x of [-7.5, 5.5]) b.cyl(x + 1, 0, 2, 13, 1.2, 1.2, P.stoneLight, { seg: 6 });
      b.box(-7.5, 13, -2.5, 7.5, 14.5, 2.5, P.stoneLight);
      b.cyl(0, 0, 14.5, 16, 1.6, 2.4, P.stone, { seg: 8 });
      b.ell(0, 18, 0, 2.6, 2.4, 2.6, P.stone);
      b.cyl(0, 0, 20, 21.5, 1.2, 0.6, P.stone);
      skull(b, 0, 8, 1.2, P.bone);
      b.box(-4, 4, 1.5, 4, 5, 2.6, P.ink, { carve: true });
      for (const x of [-4, 4]) b.ell(x, 11, 1.8, 1.2, 1.2, 0.8, P.leaf);
      return { w: 16, h: 22, t: 5 };
    }
    case 'victorian': {
      const t = 3;
      b.box(-6.5, 0, -3, 6.5, 2, 3, dark);
      b.box(-5, 2, -t / 2, 5, 15, t / 2, tone);
      b.push([0, 15, -t / 2], 0, Math.PI / 2).cyl(0, 0, 0, t, 5, 5, tone, { seg: 9 }).pop();
      for (const s of [-1, 1]) b.ell(s * 5, 15, 0, 1.5, 1.5, 1.8, P.stoneLight);
      b.ell(0, 21, 0, 1.4, 1.4, 1.4, P.stoneLight);
      b.box(-0.5, 19, -0.5, 0.5, 20, 0.5, P.stoneLight);
      b.box(-4, 3, 1, -3, 14, 2.5, P.ink, { carve: true });
      b.box(3, 3, 1, 4, 14, 2.5, P.ink, { carve: true });
      engrave(12, 4); engrave(10, 5); engrave(8, 3);
      b.ell(0, 5, 1.5, 1.6, 1.6, 0.6, P.stoneLight);
      return { w: 13, h: 22, t };
    }
  }
}

export function graveModel(type: GraveType, state: GraveVisualState, seed: number): Model {
  const b = new ModelBuilder(`grave:${type}:${seed}`);
  const r = b.rng;
  const dirty = state === 'dirty' || state === 'broken';
  const broken = state === 'broken';

  // Tumulo davanti alla lapide, con bordo di pietre (incompleto se trascurato).
  b.box(-6, 0, -2, 6, 1, 9, P.earth, { jitter: 0.12, rough: 0.6 });
  b.ell(0, 0.6, 3.5, 4.6, 1.6, 4.4, dirty ? P.earthDark : P.earth, { jitter: 0.14, seg: 1 });
  if (!dirty) b.ell(0, 1.4, 3.5, 3.4, 0.9, 3.2, P.grass, { jitter: 0.12, seg: 1 });
  for (let x = -6; x < 6; x += 2) {
    for (const z of [-2, 8]) if (!dirty || r.chance(0.55)) b.box(x, 0, z, x + 1.8, 1.5, z + 1, P.stoneDark, { jitter: 0.1 });
  }
  for (let z = 0; z < 8; z += 2) {
    for (const x of [-6, 5]) if (!dirty || r.chance(0.55)) b.box(x, 0, z, x + 1, 1.5, z + 1.8, P.stoneDark, { jitter: 0.1 });
  }

  // Lapide (inclinata e scheggiata se rotta).
  const tiltZ = broken ? r.pick([-1, 1]) * r.range(0.18, 0.3) : r.range(-0.03, 0.03);
  const tiltX = broken ? r.range(0.12, 0.22) : 0;
  b.push([r.range(-0.6, 0.6), 0, STONE_Z], r.range(-0.05, 0.05), tiltX, tiltZ);
  const dims = headstone(b, type);
  if (dirty) {
    moss(b, -dims.w / 2, 2, -dims.t / 2, dims.w / 2, Math.min(dims.h, 12), dims.t / 2, broken ? 9 : 6);
    if (r.chance(0.6)) cobweb(b, dims.w / 2 - 3, Math.min(dims.h - 2, 9), dims.t / 2);
  }
  if (broken) {
    // scheggiatura in alto e crepa a zig-zag sul fronte
    b.box(dims.w / 2 - 4, dims.h - 3, -5, dims.w / 2 + 2, dims.h + 4, 5, P.ink, { carve: true, cut: true });
    for (let i = 0; i < 6; i++) b.box(-1 + (i % 2), 3 + i * 1.6, 1, (i % 2) + 0, 4.6 + i * 1.6, 2.5, P.ink, { carve: true });
  }
  b.pop();

  if (broken) {
    // frammento caduto a terra
    b.push([6.5, 0, -1], r.range(0, 1), 0.2, 0.1).box(-2, 0, -1.5, 2, 2.5, 1.5, P.stone).pop();
    pebbles(b, -9, -9, 9, 9, 6);
  }

  if (state === 'flowers') {
    b.cyl(-3.5, -2.5, 0, 2.5, 1.4, 1.7, P.stoneLight, { seg: 7 });
    bouquet(b, -4, 2.5, -3, 1);
    bouquet(b, 1, 1.6, 3, 0.8);
    candle(b, 3, 1, -3, true, 2);
    candle(b, 4.5, 1, -2.5, true, 1);
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r.range(-5, 5)), z = Math.floor(r.range(0, 8));
      b.box(x, 1.4, z, x + 1, 2.2, z + 1, r.pick([P.flowerRed, P.flowerRose, P.flowerWhite]), { jitter: 0.1 });
    }
  } else if (dirty) {
    weeds(b, -7, -2, 7, 9, broken ? 12 : 8);
    weeds(b, -9, -9, 9, -3, 4);
    leaves(b, -9, -9, 9, 9, 14);
  } else {
    // pulita: qualche ciuffo verde ordinato ai lati e una candela spenta
    b.box(-8, 0, 6, -7, 2, 7, P.moss);
    b.box(7, 0, 0, 8, 2, 1, P.moss);
    if (r.chance(0.5)) candle(b, 4, 1, -3, false, 2);
  }
  // erba fine attorno alla base della lapide e ai bordi del tumulo
  for (const [x, z] of [[-7.5, STONE_Z + 1], [7.5, STONE_Z], [-8, 4], [8, 7]] as const) {
    if (r.chance(dirty ? 0.9 : 0.6)) grassClump(b, x + r.range(-0.8, 0.8), z + r.range(-0.8, 0.8), dirty ? 1.2 : 0.8, dirty ? DRY : undefined);
  }
  // licheni: piccole macchie chiare sulla base
  for (let i = 0; i < 3; i++) {
    const x = r.range(-5, 4), z = STONE_Z + r.range(-2.5, 2);
    b.box(x, 1.6, z, x + 0.9, 2.3, z + 0.9, r.pick(['#8e9a6a', '#a3a37a', P.moss]));
  }
  return b.build();
}
