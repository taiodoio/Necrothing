// PROVA — abitazioni per il villaggetto, sul principio della Casetta infestata: lotto 4 × 5, casa
// nella metà posteriore (il chiamante la sposta di -0,85 in z), giardinetto a tema davanti, senza
// recinto, il prato del gioco attorno. Una versione sola ciascuna. Stesse primitive degli altri generatori.

import { LPC } from '../../Production/src/render/lowpoly/palette.ts';
import { skull as gameSkull } from '../../Production/src/render/lowpoly/extras.ts';
import { frontGable, gable, gableRoof, quoins } from '../../Production/src/render/lowpoly/architecture.ts';
import { flower, hangingLantern } from '../../Production/src/render/lowpoly/details.ts';
import { irregularShape, roundTopShape } from '../../Production/src/render/lowpoly/kit.ts';
import { beam, block, cloth, dim, emit, leaf, meadow, prof, slab, torus, turned, type CryptCtx, type P3 } from '../../Production/src/render/lowpoly/cryptKit.ts';
import { crossWindow, slabBetween, wallLantern } from './cryptBuildings.ts';
import { wallIvy, wallBat } from './decorations.ts';
import { bench, yardLamp } from '../../Production/src/render/lowpoly/cryptYards.ts';

// ── Pezzi comuni ─────────────────────────────────────────────────────────

/** Aperture posteriori e abbaino: le case restano curate da ogni angolo. */
function rearDetails(c: CryptCtx, d: number, base: number, wall: number, plaster: string, trim: string, roof: string, upper = false) {
  const { lp, v } = c;
  lp.push([0, 0, -d / 2], Math.PI);
  for (const x of [-0.5, 0.5]) {
    crossWindow(c, x, base + 0.28, 0, 0.25, 0.34, trim, v.broken);
    if (upper) crossWindow(c, x, 1.3, 0, 0.25, 0.35, trim, v.broken);
  }
  lp.pop();
  // L'abbaino si apre sulla falda posteriore, senza spostare il colmo.
  lp.push([0.48, 0, -d / 2 + 0.02], Math.PI);
  lp.box(0, wall + 0.05, 0, 0.42, 0.48, 0.25, plaster, { bevel: 0.01 });
  frontGable(lp, 0.13, 0.42, wall + 0.53, 0.22, plaster, 0.05);
  lp.push([0, 0, 0.01]); gableRoof(lp, 0.27, 0.44, wall + 0.53, 0.22, roof, 0.05, true, trim); lp.pop();
  crossWindow(c, 0, wall + 0.14, 0.14, 0.2, 0.28, trim, v.broken);
  lp.pop();
}

/** Porta di assi a testa tonda con la cornice, la maniglia e (da rotta) le assi inchiodate davanti. */
function door(c: CryptCtx, x: number, y0: number, zFace: number, w: number, h: number, trim: string, wood = '#4a3426') {
  const { lp, v } = c;
  lp.push([x, y0, zFace + 0.005]).plate(roundTopShape(w + 0.1, h + 0.05, 7), 0.03, trim, { ao: 0 }).pop();
  lp.push([x, y0 + 0.01, zFace + 0.02]).plate(roundTopShape(w, h, 7), 0.03, wood, { vary: 0.08, ao: 0.1 }).pop();
  for (const ox of [-w / 4, 0, w / 4]) lp.box(x + ox, y0 + 0.03, zFace + 0.052, 0.012, h * 0.72, 0.006, '#2e211a', { jitter: 0, ao: 0 });
  lp.blob(x + w * 0.3, y0 + h * 0.45, zFace + 0.06, 0.02, 0.02, 0.015, LPC.iron, { jitter: 0 });
  if (v.broken) for (const s of [-1, 1]) lp.push([x, y0 + h * 0.5, zFace + 0.085], 0, 0, s * 0.62).box(0, -0.04, 0, h * 0.9, 0.08, 0.025, '#7a5c42', { vary: 0.12, ao: 0 }).pop();
}

/** Finestra tonda (oblò) con la cornice e la croce; accesa la sera. */
function roundWindow(c: CryptCtx, x: number, y: number, zFace: number, r: number, trim: string) {
  const { lp, v } = c;
  const g = emit(c, LPC.window);
  lp.push([x, y, zFace + 0.012], 0, Math.PI / 2).cyl(0, -0.01, 0, r, r, 0.02, 10, c.lit ? g.color : '#26231f', { ...(c.lit ? g.o : {}), ao: 0 }).pop();
  torus(lp, x, y, zFace + 0.03, r + 0.02, 0.025, trim, [0, 0, 0], Math.PI * 2, { jitter: 0 });
  if (!v.broken) for (const a of [0, Math.PI / 2]) lp.push([x, y, zFace + 0.035], 0, 0, a).box(0, -0.01, 0, r * 2, 0.02, 0.012, trim, { jitter: 0, ao: 0 }).pop();
}

/** Gradino di pietra davanti alla porta. */
function doorStep(c: CryptCtx, x: number, z: number, w = 0.6) {
  for (let i = 0; i < 2; i++) c.lp.box(x, 0, z + i * 0.12, w - i * 0.08, 0.2 - 0.1 * i, 0.14, LPC.stone, { bevel: 0.01, vary: 0.08 });
}

/** Montanti scuri agli spigoli di un muro (come la Casetta infestata). */
function corners(c: CryptCtx, W: number, D: number, y0: number, h: number, color: string) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.lp.box(sx * (W / 2 - 0.02), y0, sz * (D / 2 - 0.02), 0.07, h, 0.07, color, { jitter: 0, vary: 0.06 });
}

/** Annaffiatoio. */
function wateringCan(c: CryptCtx, x: number, z: number, ry = 0, color = '#6d826c') {
  const { lp } = c;
  lp.push([x, 0, z], ry);
  lp.cyl(0, 0.02, 0, 0.11, 0.11, 0.22, 8, color, { vary: 0.07 });
  beam(lp, [0.09, 0.16, 0], [0.29, 0.25, 0], 0.02, dim(color, 1.25));
  torus(lp, -0.12, 0.18, 0, 0.1, 0.016, dim(color, 1.25));
  lp.pop();
}

/** Ciocchi di legna sotto una tettoia (cilindri lungo z). */
function logPile(c: CryptCtx, x: number, z: number, len = 0.8) {
  const { lp, v } = c;
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) {
    if (v.broken && r === 2) continue;
    lp.push([x + (k - (3 - r) / 2) * 0.1, 0.06 + r * 0.09, z], 0, Math.PI / 2).cyl(0, -len / 2, 0, 0.05, 0.05, len, 6, k % 2 ? '#8a6a4a' : '#7a5c42', { vary: 0.1 }).pop();
  }
}

// ── 1 · La casetta del Mietitore in pensione ─────────────────────────────
// Casetta di pietra e intonaco come le altre del villaggio, col tetto scuro (il colore della
// tonaca) e il portichetto sulla porta. Sul timpano l'orologio, in cima la clessidra, di fianco la
// legnaia. La falce ormai serve per l'erba: il prato è tagliato a righe.

const ROBE = '#38333f', ROBE_DARK = '#2a2630';

function hourglass(c: CryptCtx, x: number, y: number, z: number) {
  const { lp, v } = c;
  lp.push([x, y, z], 0, 0, v.broken ? 0.35 : 0);
  beam(lp, [0, 0, 0], [0, 0.16, 0], 0.012, LPC.iron);
  lp.box(0, 0.15, 0, 0.18, 0.025, 0.12, LPC.woodDark, { jitter: 0 });
  lp.box(0, 0.48, 0, 0.18, 0.025, 0.12, LPC.woodDark, { jitter: 0 });
  turned(lp, 0, 0.17, 0, [[0, 0], [0.06, 0], [0.065, 0.06], [0.012, 0.15], [0.065, 0.24], [0.06, 0.31], [0, 0.31]], 7, '#c9d6d2', { bucket: 'gloss', jitter: 0 });
  lp.cyl(0, 0.18, 0, 0.05, 0.03, 0.05, 6, LPC.gold, { jitter: 0 });
  for (const sx of [-1, 1]) beam(lp, [sx * 0.08, 0.17, 0], [sx * 0.08, 0.48, 0], 0.008, LPC.woodDark);
  lp.pop();
}

function reaper(c: CryptCtx) {
  const { lp, v } = c;
  const W = 2.1, D = 1.35, B = 0.18, H = 1.15, rise = 0.9, z0 = -0.35;
  const plaster = '#6d6570', trim = '#2f2a2a', stone = '#615d58';
  lp.push([0, 0, z0]);
  lp.box(0, 0, 0, W + 0.1, B, D + 0.1, stone, { bevel: 0.02, vary: 0.08, ao: 0.25 });
  for (let i = 0; i < 7; i++) lp.push([-0.7 + i * 0.23, 0.05 + (i % 2) * 0.06, D / 2 + 0.06]).plate(irregularShape(lp.rng, 0.06, 6, 0.6), 0.012, dim(stone, 0.8), { ao: 0 }).pop();
  lp.box(0, B, 0, W, H - B, D, plaster, { bevel: 0.015, vary: 0.05, ao: 0.25 });
  corners(c, W, D, B, H - B, trim);
  lp.box(0, H, 0, W + 0.08, 0.06, D + 0.08, trim, { bevel: 0.01, vary: 0.06 });
  for (const sx of [-1, 1]) gable(lp, sx * (W / 2 - 0.05), D, H + 0.06, rise, plaster, 0.1);
  if (!v.broken) gableRoof(lp, W, D, H + 0.06, rise, ROBE, 0.16, false, ROBE_DARK);
  else {
    // da rotta, sulla falda destra si vedono i travetti
    lp.push([0, 0, 0], 0, 0, 0);
    gableRoof(lp, W * 0.45, D, H + 0.06, rise, ROBE, 0.16, false, ROBE_DARK);
    lp.pop();
    lp.push([-W * 0.3, 0, 0]);
    gableRoof(lp, W * 0.4, D, H + 0.06, rise, ROBE, 0.16, false, ROBE_DARK);
    lp.pop();
    for (let k = 0; k < 3; k++) beam(lp, [0, H + rise + 0.04, 0.1 + k * 0.18], [W / 2 + 0.1, H - 0.02, 0.1 + k * 0.18], 0.03, LPC.woodDark);
  }
  lp.box(0, H + 0.06, D / 2 - 0.08, 0.62, 0.72, 0.32, plaster, { bevel: 0.01 });
  frontGable(lp, D / 2 + 0.08, 0.62, H + 0.78, 0.32, plaster, 0.06);
  lp.push([0, 0, D / 2]); gableRoof(lp, 0.48, 0.64, H + 0.78, 0.32, ROBE, 0.08, true, ROBE_DARK); lp.pop();
  rearDetails(c, D, B, H + 0.06, plaster, trim, ROBE);
  lp.push([0, 0, -D / 2], Math.PI); wallIvy(c, -0.88, 0.035, 0.75); lp.pop();
  // l'orologio sul timpano: quadrante acceso la sera, le lancette
  const cy = H + 0.4, cz = D / 2 + 0.17, R = 0.2;
  const face = emit(c, '#e8dcc0');
  lp.push([0, cy, cz], 0, Math.PI / 2).cyl(0, -0.01, 0, R, R, 0.025, 12, c.lit ? face.color : '#cfc6ae', { ...(c.lit ? face.o : {}), ao: 0 }).pop();
  torus(lp, 0, cy, cz + 0.02, R + 0.02, 0.032, trim, [0, 0, 0], Math.PI * 2, { jitter: 0 });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; lp.box(Math.cos(a) * 0.15, cy + Math.sin(a) * 0.15 - 0.013, cz + 0.03, 0.026, 0.026, 0.01, trim, { jitter: 0, ao: 0 }); }
  if (!v.broken) {
    // le lancette alle tre: la lunga sul 12, la corta sul 3, il perno in mezzo
    lp.push([0, cy, cz + 0.035]).box(0, 0, 0, 0.018, 0.15, 0.01, LPC.iron, { jitter: 0, ao: 0 }).pop();
    lp.push([0, cy, cz + 0.04], 0, 0, -Math.PI / 2).box(0, 0, 0, 0.024, 0.1, 0.01, LPC.iron, { jitter: 0, ao: 0 }).pop();
    lp.blob(0, cy, cz + 0.045, 0.018, 0.018, 0.008, LPC.iron, { jitter: 0 });
  }
  // porta col portichetto a due falde su due pali, la lanterna sotto
  door(c, 0, B, D / 2, 0.48, 0.8, trim);
  const pz = D / 2 + 0.4;
  for (const sx of [-1, 1]) {
    beam(lp, [sx * 0.4, 0, pz], [sx * 0.4, B + 0.92, pz], 0.03, LPC.woodDark);
    beam(lp, [sx * 0.4, B + 0.92, pz], [sx * 0.4, B + 0.92, D / 2], 0.025, LPC.woodDark);
  }
  if (!v.broken) {
    for (const s of [-1, 1]) lp.push([s * 0.25, B + 1.06, D / 2 + 0.22], 0, 0, -s * 0.55).box(0, 0, 0, 0.6, 0.05, 0.56, ROBE, { bevel: 0.008, vary: 0.05 }).pop();
    hangingLantern(lp, 0.26, B + 0.9, D / 2 + 0.3, c.lit, 0.6);
  } else block(lp, 0.75, 0.02, D / 2 + 0.7, 0.6, 0.05, 0.5, ROBE, [0.2, 0.5, 0.3]);
  for (const sx of [-1, 1]) crossWindow(c, sx * 0.6, B + 0.32, D / 2, 0.24, 0.34, trim, v.broken && sx > 0);
  lp.push([W / 2, 0, 0], Math.PI / 2);
  crossWindow(c, 0.05, B + 0.32, 0, 0.26, 0.36, trim, false);
  lp.pop();
  // comignolo e clessidra sul colmo
  lp.box(-0.45, H - 0.1, -0.3, 0.26, rise + 0.32, 0.26, stone, { bevel: 0.015, vary: 0.08 });
  if (!v.broken) lp.box(-0.45, H + rise + 0.22, -0.3, 0.34, 0.06, 0.34, dim(stone, 0.8), { bevel: 0.01 });
  hourglass(c, 0, H + rise + 0.08, D / 2 - 0.12);
  lp.pop();
  // la legnaia sul fianco sinistro, con la tettoia
  const lx = -1.95;
  for (const z of [-0.95, 0.15]) beam(lp, [lx, 0, z + z0 + 0.18], [lx, 0.84, z + z0 + 0.18], 0.025, LPC.woodDark);
  slabBetween(c, [lx - 0.1, 0.84], [-1.15, 1.02], z0 - 0.22, 1.35, 0.05, ROBE_DARK);
  logPile(c, -1.55, z0 - 0.22);
}

function reaperYard(c: CryptCtx) {
  const { lp, v } = c;
  doorStep(c, 0, -0.5);
  // l'orto del pensionato: due file di pomodori sulle canne incrociate, l'insalata davanti, la cassetta del raccolto
  const ox = 1.12, oz = 1.25, ow = 1.35, od = 1.75;
  lp.box(ox, 0, oz, ow, 0.07, od, LPC.soil, { bevel: 0.02, vary: 0.12, jitter: 0.012 });
  for (const sx of [-1, 1]) block(lp, ox + sx * (ow / 2 + 0.02), 0, oz, 0.06, 0.12, od + 0.04, LPC.woodDark);
  for (const sz of [-1, 1]) block(lp, ox, 0, oz + sz * (od / 2 + 0.02), ow + 0.1, 0.12, 0.06, LPC.woodDark);
  const cane = '#b8a27c', dry = v.broken;
  for (const rx of [ox - 0.33, ox + 0.33]) {
    const zs = [0.62, 0.98, 1.34, 1.7];
    for (let i = 0; i < zs.length; i++) {
      const z = zs[i], fallen = dry && i % 2 === 1;
      // due canne incrociate in cima (il «capanno» dei pomodori)
      for (const s2 of [-1, 1]) beam(lp, [rx + s2 * 0.16, 0.06, z], [rx - s2 * 0.03, fallen ? 0.35 : 0.85, z], 0.012, cane);
      if (fallen) continue;
      // la pianta che si arrampica, coi pomodori
      for (let k = 0; k < 3; k++) lp.blob(rx + Math.sin(i + k) * 0.05, 0.25 + k * 0.2, z + Math.cos(i * 2 + k) * 0.05, 0.11 - k * 0.015, 0.1, 0.1, dry ? LPC.dry : k % 2 ? LPC.leaf : '#5a7a45', { jitter: 0.01, detail: 0 });
      if (!dry) for (let k = 0; k < 4; k++) lp.blob(rx + Math.sin(k * 1.7 + i) * 0.09, 0.22 + (k % 3) * 0.17, z + Math.cos(k * 1.7 + i) * 0.08, 0.035, 0.035, 0.035, k % 3 ? '#c8402e' : '#d97a2e', { jitter: 0 });
    }
    // la canna lunga che tiene la fila
    beam(lp, [rx - 0.02, dry ? 0.5 : 0.8, 0.5], [rx - 0.02, dry ? 0.35 : 0.8, 1.82], 0.01, cane);
  }
  // l'insalata in fondo all'orto
  for (let i = 0; i < 4; i++) {
    const x = ox - 0.48 + i * 0.32, z = oz + od / 2 - 0.14;
    lp.blob(x, 0.12, z, 0.1, 0.07, 0.1, dry ? LPC.dry : i % 2 ? '#8fb05a' : '#7a9c4a', { jitter: 0.01, detail: 1 });
  }
  // la cassetta del raccolto sul bordo del vialetto
  block(lp, 0.5, 0, 0.32, 0.36, 0.16, 0.26, LPC.wood, [0, 0.25, 0]);
  if (!dry) for (let k = 0; k < 6; k++) lp.blob(0.5 + ((k % 3) - 1) * 0.09, 0.19, 0.32 + (Math.floor(k / 3) - 0.5) * 0.09, 0.045, 0.04, 0.045, '#c8402e', { jitter: 0 });
  // la sdraio a righe e la falce appoggiata: in pensione si guarda crescere l'erba
  const dx = -1.0, dz = 1.0;
  lp.push([dx, 0, dz], 0.35);
  if (!v.broken) {
    for (const s of [-1, 1]) {
      beam(lp, [s * 0.27, 0, 0.36], [s * 0.27, 0.72, -0.32], 0.022, LPC.wood);
      beam(lp, [s * 0.27, 0, -0.16], [s * 0.27, 0.32, 0.3], 0.022, LPC.wood);
    }
    lp.push([0, 0, 0], Math.PI / 2);
    for (let k = 0; k < 5; k++) {
      const zc = -0.2 + k * 0.1, col = k % 2 ? '#d8cdb3' : '#6a557a';
      slabBetween(c, [-0.3, 0.33], [0.0, 0.2], zc, 0.1, 0.018, col);
      slabBetween(c, [0.0, 0.2], [0.3, 0.7], zc, 0.1, 0.018, col);
    }
    lp.pop();
  } else {
    for (const s of [-1, 1]) beam(lp, [s * 0.26, 0.02, 0.4], [s * 0.3, 0.05, -0.3], 0.02, LPC.wood);
    cloth(lp, 0, 0.04, 0, 0.5, 0.5, '#6a557a', { laid: true, ragged: true });
  }
  lp.pop();
  lp.push([dx + 0.35, 0, dz - 0.45], 0.2, 0, v.broken ? -0.9 : -0.2);
  beam(lp, [0, 0, 0], [0, 1.7, 0], 0.028, '#6b5240');
  beam(lp, [0, 0.95, 0], [0.16, 1.0, 0], 0.018, '#6b5240');
  const blade: Array<[number, number]> = [];
  for (let k = 0; k <= 8; k++) { const t = k / 8; blade.push([-t * 0.8, -Math.sin(t * Math.PI * 0.85) * 0.22 + t * 0.08]); }
  for (let k = 8; k >= 0; k--) { const t = k / 8; blade.push([-t * 0.8, -Math.sin(t * Math.PI * 0.85) * 0.1 + t * 0.08]); }
  prof(lp, blade, 0.02, '#8d969b', [0.02, 1.68, 0], [0, 0, 0], { ao: 0, vary: 0.05 });
  lp.pop();
  // sgabello con la tazza e il libro
  lp.cyl(-1.42, 0, 1.6, 0.14, 0.12, 0.34, 7, LPC.woodDark, { vary: 0.08 });
  lp.cyl(-1.42, 0.34, 1.6, 0.05, 0.04, 0.06, 7, '#d8cdb3', { jitter: 0 });
  slab(lp, -1.38, 0.34, 1.52, 0.16, 0.035, 0.12, '#6a557a', 0.4);
  // lavanda sotto le finestre
  for (let i = 0; i < 8; i++) flower(lp, -1.0 + (i % 4) * 0.2, 0.0 + Math.floor(i / 4) * 0.14, v.broken ? LPC.dry : '#8f7aa8', 0.26);
  for (let i = 0; i < 6; i++) flower(lp, 0.5 + (i % 3) * 0.2, 0.0 + Math.floor(i / 3) * 0.13, v.broken ? LPC.dry : '#8f7aa8', 0.26);
  yardLamp(c, -0.5, 2.15);
  meadow(c, [[-1.75, -2.6, 1.0, -0.12], [-0.36, -0.2, 0.36, 2.55], [0.36, 0.28, 1.88, 2.2], [0.25, 0.12, 0.75, 0.52], [-1.45, 0.55, -0.55, 1.45], [-0.82, 0.35, -0.45, 0.72], [-1.62, 1.4, -1.2, 1.8], [-1.15, -0.12, -0.3, 0.25], [0.38, -0.12, 0.98, 0.22], [-0.7, 1.95, -0.3, 2.35]], [[1.25, -0.3, 0.9]]);
}

// ── 2 · La canonica ──────────────────────────────────────────────────────
// La casa del prete: intonaco chiaro e persiane verdi, il campaniletto a vela sul colmo e l'oblò
// sul timpano, e di fianco un'ala bassa (la sacrestia, con la sua porticina). In giardino i gigli,
// la vaschetta per gli uccelli e la tonaca stesa ad asciugare.

function rectory(c: CryptCtx) {
  const { lp, v } = c;
  const W = 2.05, D = 1.3, z0 = -0.4, B = 0.18, H = 1.95, rise = 0.78, hx = 0.48;
  const plaster = '#b3a893', trim = '#5a4636', shutter = '#4f6450', roof = '#3d4556';
  // l'ala bassa a sinistra, col tetto a capanna (colmo lungo x) e la porticina
  const wW = 1.1, wD = 1.0, wH = 0.95, wx = hx - W / 2 - wW / 2 + 0.02, wz = z0 - 0.1;
  lp.push([wx, 0, wz]);
  lp.box(0, 0, 0, wW + 0.08, B, wD + 0.08, LPC.stone, { bevel: 0.02, vary: 0.08, ao: 0.25 });
  lp.box(0, B, 0, wW, wH - B, wD, plaster, { bevel: 0.015, vary: 0.05, ao: 0.25 });
  quoins(lp, wW, wD, wH - B - 0.04, B, LPC.stoneLight, 0.7);
  gable(lp, -wW / 2 + 0.05, wD, wH, 0.42, plaster, 0.1);
  if (!v.broken) gableRoof(lp, wW, wD, wH, 0.42, roof, 0.12);
  else { gableRoof(lp, wW * 0.6, wD, wH, 0.42, roof, 0.12); lp.box(0.4, 0.02, wD / 2 + 0.4, 0.4, 0.05, 0.3, roof, { vary: 0.1 }); }
  door(c, -0.2, B, wD / 2, 0.4, 0.62, LPC.stoneLight, '#5a3d2c');
  crossWindow(c, 0.28, B + 0.28, wD / 2, 0.22, 0.3, trim, v.broken);
  lp.box(-0.3, wH + 0.1, -0.2, 0.18, 0.5, 0.18, LPC.stoneWarm, { bevel: 0.012, vary: 0.08 });
  lp.pop();
  // la casa
  lp.push([hx, 0, z0]);
  lp.box(0, 0, 0, W + 0.1, B, D + 0.1, LPC.stone, { bevel: 0.02, vary: 0.08, ao: 0.25 });
  lp.box(0, B, 0, W, H - B, D, plaster, { bevel: 0.015, vary: 0.05, ao: 0.25 });
  quoins(lp, W, D, H - B - 0.04, B, LPC.stoneLight, 0.8);
  lp.box(0, 1.05, 0, W + 0.06, 0.06, D + 0.06, dim(plaster, 0.85), { bevel: 0.01 });
  for (const sx of [-1, 1]) gable(lp, sx * (W / 2 - 0.05), D, H, rise, plaster, 0.1);
  gableRoof(lp, W, D, H, rise, roof, 0.14, false);
  rearDetails(c, D, B, H, plaster, trim, roof, true);
  lp.push([0, 0, -D / 2], Math.PI); wallIvy(c, -0.87, 0.035, 1.45); lp.pop();
  wallIvy(c, -0.87, D / 2 + 0.035, 0.95);
  // L’oblò trova posto sulla facciata alta della canonica.
  roundWindow(c, 0.68, 1.55, D / 2, 0.15, trim);
  // il campaniletto a vela sul colmo, davanti, con la campana (da rotta è caduta)
  const bz = 0, by = H + rise - 0.05;
  prof(lp, [[-0.24, 0], [0.24, 0], [0.24, 0.42], [0, 0.6], [-0.24, 0.42]], 0.12, LPC.stoneLight, [0, by, bz], [0, 0, 0], { vary: 0.06 });
  lp.push([0, by + 0.08, bz + 0.065]).plate(roundTopShape(0.26, 0.34, 6), 0.01, '#23262b', { ao: 0 }).pop();
  if (!v.broken) {
    turned(lp, 0, by + 0.12, bz + 0.04, [[0, 0], [0.1, 0], [0.11, 0.02], [0.07, 0.1], [0.04, 0.17], [0, 0.18]], 8, LPC.gold);
    beam(lp, [0, by + 0.3, bz + 0.04], [0, by + 0.38, bz + 0.04], 0.01, LPC.iron);
  }
  beam(lp, [0, by + 0.6, bz], [0, by + 0.82, bz], 0.014, LPC.iron);
  beam(lp, [-0.07, by + 0.74, bz], [0.07, by + 0.74, bz], 0.012, LPC.iron);
  door(c, 0, B, D / 2, 0.5, 0.85, LPC.stoneLight, '#5a3d2c');
  if (!v.broken) hangingLantern(lp, 0.4, B + 1.0, D / 2 + 0.15, c.lit, 0.72);
  const shutters = (x: number, y: number, z: number, w: number, h: number, fallen = false) => {
    for (const s of [-1, 1]) {
      if (fallen && s > 0) { lp.push([x + s * (w / 2 + 0.08), y - 0.12, z + 0.04], 0, 0, 0.5).box(0, 0, 0, w * 0.55, h, 0.025, shutter, { vary: 0.08 }).pop(); continue; }
      lp.box(x + s * (w / 2 + 0.09), y - 0.03, z + 0.03, w * 0.55, h + 0.06, 0.025, shutter, { vary: 0.08 });
      for (let i = 0; i < 4; i++) lp.box(x + s * (w / 2 + 0.09), y + i * (h / 4), z + 0.045, w * 0.5, 0.012, 0.008, dim(shutter, 0.75), { jitter: 0, ao: 0 });
    }
  };
  for (const sx of [-1, 1]) {
    crossWindow(c, sx * 0.38, 1.3, D / 2, 0.26, 0.4, trim, false);
    shutters(sx * 0.38, 1.3, D / 2, 0.26, 0.4, v.broken && sx > 0);
  }
  for (let i = 0; i < 3; i++) lp.blob(0.38 + (i - 1) * 0.08, 1.31, D / 2 + 0.08, 0.04, 0.05, 0.035, LPC.mossBright, { jitter: 0.006 });
  lp.box(0.38, 1.24, D / 2 + 0.08, 0.28, 0.07, 0.08, '#9a5a3a', { bevel: 0.006 });
  lp.push([W / 2, 0, 0], Math.PI / 2);
  crossWindow(c, 0.1, B + 0.32, 0, 0.24, 0.36, trim, v.broken);
  lp.pop();
  lp.box(0.38, H + 0.2, -0.3, 0.24, 0.75, 0.24, LPC.stoneWarm, { bevel: 0.015, vary: 0.08 });
  lp.pop();
}

function rectoryYard(c: CryptCtx) {
  const { lp, v } = c;
  doorStep(c, 0.35, -0.55, 0.65);
  doorStep(c, -0.76, -0.7, 0.5);
  // l'aiuola dei gigli bianchi, bordata di pietre
  const gx = -1.08, gz = 0.62;
  lp.box(gx, 0, gz, 1.0, 0.08, 0.85, LPC.soil, { bevel: 0.02, vary: 0.1 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; lp.blob(gx + Math.cos(a) * 0.53, 0.05, gz + Math.sin(a) * 0.46, 0.08, 0.06, 0.07, i % 2 ? LPC.stoneLight : LPC.stone, { vary: 0.1 }); }
  for (let i = 0; i < 10; i++) {
    const x = gx - 0.34 + (i % 4) * 0.23 + (Math.floor(i / 4) % 2) * 0.1, z = gz - 0.26 + Math.floor(i / 4) * 0.26;
    for (let l = 0; l < 2; l++) leaf(lp, x, 0.1 + l * 0.08, z, 0.12, LPC.leaf, l * 2.2 + i);
    if (!v.broken || i % 3 === 0) flower(lp, x, z, v.broken ? LPC.dry : '#eeeae0', 0.38, 0.06);
  }
  // la vaschetta per gli uccelli, con un corvo che beve
  const bx = -1.3, bz = 1.85;
  lp.lathe(bx, 0, bz, [[0.14, 0], [0.09, 0.06], [0.06, 0.45], [0.2, 0.52], [0.24, 0.6], [0, 0.6]], 9, LPC.stoneLight, { vary: 0.05, ao: 0.2 });
  lp.cyl(bx, 0.6, bz, 0.2, 0.2, 0.012, 9, v.broken ? '#3d352a' : LPC.water, { bucket: v.broken ? 'solid' : 'water', jitter: 0 });
  if (!v.broken) {
    lp.blob(bx + 0.17, 0.72, bz, 0.07, 0.06, 0.05, '#25272c', { jitter: 0 });
    lp.blob(bx + 0.11, 0.77, bz, 0.04, 0.04, 0.04, '#25272c', { jitter: 0 });
    lp.push([bx + 0.07, 0.77, bz], 0, 0, 0.3).cyl(0, 0, 0, 0.015, 0.0, 0.05, 4, LPC.gold, { jitter: 0 }).pop();
  }
  // la tonaca e il colletto stesi ad asciugare tra due pali
  const y = v.broken ? 0.85 : 1.25, x0 = 0.95, x1 = 1.9, z = 1.25;
  for (const x of [x0, x1]) beam(lp, [x, 0, z], [x + (v.broken && x > 1.2 ? 0.18 : 0), y + 0.06, z], 0.03, LPC.woodDark);
  for (let i = 0; i < 6; i++) {
    const cv = (t: number) => y - Math.sin(t * Math.PI) * 0.06;
    beam(lp, [x0 + ((x1 - x0) * i) / 6, cv(i / 6), z], [x0 + ((x1 - x0) * (i + 1)) / 6, cv((i + 1) / 6), z], 0.008, '#b4a78a');
  }
  if (!v.broken) {
    prof(lp, [[-0.14, 0], [-0.26, -0.12], [-0.2, -0.24], [-0.14, -0.18], [-0.2, -0.82], [0.2, -0.82], [0.14, -0.18], [0.2, -0.24], [0.26, -0.12], [0.14, 0], [0.06, -0.05], [-0.06, -0.05]], 0.018, '#24252c', [1.22, y - 0.03, z], [0, -0.1, 0.03], { ao: 0.1 });
    lp.box(1.22, y - 0.12, z + 0.02, 0.07, 0.04, 0.01, '#eeeae0', { jitter: 0 });
    cloth(lp, 1.64, y - 0.02, z, 0.34, 0.42, '#d8d2c2');
  } else cloth(lp, 1.35, 0.04, 1.6, 0.5, 0.7, '#24252c', { laid: true, ragged: true });
  for (const x of [1.34, 1.52, 1.76]) lp.box(x, y - 0.03, z + 0.01, 0.022, 0.07, 0.036, '#b39b76', { jitter: 0 });
  bench(c, -0.55, 1.95, 0.25);
  meadow(c, [[-1.6, -2.6, 1.2, -0.42], [0.0, -0.6, 0.7, 2.55], [-1.7, 0.1, -0.45, 1.15], [-1.6, 1.55, -1.0, 2.15], [0.88, 1.1, 1.98, 1.42], [1.0, 1.45, 1.8, 1.9], [-1.25, 1.65, 0.1, 2.3], [-1.05, -0.75, -0.45, -0.38]], [[1.45, -0.4, 0.9], [-1.78, -0.55, 0.7]]);
}

// ── 3 · La casa del lampionaio ───────────────────────────────────────────
// Ci abita il lampionaio, che la sera fa il giro con la pertica e accende le luci del cimitero:
// la casetta a capanna con l'oblò sul timpano e, accanto, la tettoia del laboratorio con le
// lanterne da aggiustare sugli scaffali e quelle pronte appese alla gronda. In giardino il
// carretto delle lanterne per il giro, la botte dell'olio, un tavolino per la sera.

function lamplighter(c: CryptCtx) {
  const { lp, v } = c;
  const W = 1.85, D = 1.3, B = 0.16, H = 1.1, rise = 0.62, hx = -0.55, z0 = -0.35;
  const plaster = '#857b70', trim = '#3a2e27', roof = '#3b4250';
  lp.push([hx, 0, z0]);
  lp.box(0, 0, 0, W + 0.1, B, D + 0.1, LPC.stone, { bevel: 0.02, vary: 0.08, ao: 0.25 });
  lp.box(0, B, 0, W, H - B, D, plaster, { bevel: 0.015, vary: 0.05, ao: 0.25 });
  corners(c, W, D, B, H - B, trim);
  for (const sx of [-1, 1]) gable(lp, sx * (W / 2 - 0.05), D, H, rise, plaster, 0.1);
  if (!v.broken) gableRoof(lp, W, D, H, rise, roof, 0.14, false);
  else { lp.push([-0.25, 0, 0]); gableRoof(lp, W * 0.6, D, H, rise, roof, 0.14, false); lp.pop(); for (let k = 0; k < 2; k++) beam(lp, [0, H + rise, 0.3 + k * 0.2], [-W / 2 - 0.1, H - 0.05, 0.3 + k * 0.2], 0.03, LPC.woodDark); }
  rearDetails(c, D, B, H, plaster, trim, roof);
  roundWindow(c, -0.7, B + 0.53, D / 2, 0.13, trim);
  door(c, -0.25, B, D / 2, 0.44, 0.76, trim);
  for (const x of [0.29, 0.62]) crossWindow(c, x, B + 0.3, D / 2, 0.18, 0.36, trim, v.broken);
  lp.box(0.455, B + 0.22, D / 2 + 0.08, 0.67, 0.075, 0.16, trim, { bevel: 0.008 });
  if (!v.broken) wallLantern(c, 0.07, B + 0.8, D / 2, 0.6);
  lp.push([-W / 2, 0, 0], -Math.PI / 2);
  crossWindow(c, -0.1, B + 0.3, 0, 0.24, 0.32, trim, false);
  lp.pop();
  // comignolo
  lp.box(-0.38, H - 0.05, -0.3, 0.24, rise + 0.25, 0.24, LPC.stoneWarm, { bevel: 0.015, vary: 0.08 });
  // scala a pioli e pertica col gancio appoggiate al muro, a sinistra della porta
  lp.push([-W / 2 - 0.05, 0, -0.05], -Math.PI / 2, -0.16);
  for (const s of [-1, 1]) beam(lp, [s * 0.12, 0, 0], [s * 0.12, 1.25, -0.02], 0.02, LPC.wood);
  for (let i = 0; i < 5; i++) beam(lp, [-0.12, 0.18 + i * 0.24, 0], [0.12, 0.18 + i * 0.24, 0], 0.012, LPC.wood);
  lp.pop();
  lp.pop();
  // Una piccola insegna a pipistrello richiama il cimitero.
  wallBat(c, 1.14, 0.92, z0 + 0.52);
  // il laboratorio: tettoia appoggiata al fianco destro, aperta sul davanti
  const x0 = hx + W / 2, x1 = 1.85, wz = z0 - 0.05, wD = 1.1;
  for (const z of [wz - wD / 2 + 0.6, wz - wD / 2 + 0.05]) beam(lp, [x1 - 0.05, 0, z], [x1 - 0.05, 0.9, z], 0.03, LPC.woodDark);
  const rD = 0.62, rz = wz - wD / 2 + rD / 2 - 0.05;
  if (!v.broken) slabBetween(c, [x0, 1.12], [x1 + 0.08, 0.88], rz, rD, 0.05, '#5a4636');
  else slabBetween(c, [x0, 1.12], [x1 - 0.2, 0.4], rz, rD, 0.05, '#5a4636');
  lp.box((x0 + x1) / 2, 0, wz - wD / 2 + 0.05, x1 - x0, 0.9, 0.05, LPC.wood, { vary: 0.1 }); // parete di fondo in assi
  // scaffale con le lanterne da aggiustare e il banco
  for (const y of [0.45, 0.72]) {
    lp.box((x0 + x1) / 2, y, wz - wD / 2 + 0.2, x1 - x0 - 0.15, 0.03, 0.22, LPC.woodDark, { jitter: 0.004 });
    for (let k = 0; k < 3; k++) {
      if (v.broken && k === 1) continue;
      const lx = x0 + 0.2 + k * 0.28;
      lp.box(lx, y + 0.03, wz - wD / 2 + 0.2, 0.09, 0.14, 0.09, k % 2 ? '#3c3a35' : '#c9d6d2', { jitter: 0, bucket: k % 2 ? 'solid' : 'gloss' });
      lp.box(lx, y + 0.17, wz - wD / 2 + 0.2, 0.11, 0.025, 0.11, LPC.iron, { jitter: 0 });
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(lp, [(x0 + x1) / 2 + sx * 0.3, 0, wz + 0.1 + sz * 0.15], [(x0 + x1) / 2 + sx * 0.28, 0.42, wz + 0.1 + sz * 0.14], 0.02, LPC.woodDark);
  lp.box((x0 + x1) / 2, 0.42, wz + 0.1, 0.7, 0.04, 0.38, LPC.wood, { bevel: 0.008, vary: 0.1 });
  for (let i = 0; i < 3; i++) slab(lp, (x0 + x1) / 2 - 0.15 + i * 0.05, 0.46 + i * 0.012, wz + 0.1, 0.18, 0.01, 0.14, '#c9d6d2', 0.1 * i, { bucket: 'gloss', bevel: 0 });
  // le lanterne pronte, appese alla gronda della tettoia (si accendono la sera)
  if (!v.broken) for (let k = 0; k < 3; k++) {
    const lx = x0 + 0.18 + k * 0.3, ly = 1.1 - ((lx - x0) / (x1 + 0.08 - x0)) * 0.24;
    hangingLantern(lp, lx, ly - 0.02, rz + rD / 2 - 0.02, c.lit && k !== 1, 0.5);
  }
}

function lamplighterYard(c: CryptCtx) {
  const { lp, v } = c;
  doorStep(c, -0.65, -0.55, 0.55);
  yardLamp(c, 0.25, 2.1);
  // il carretto delle lanterne per il giro della sera
  const kx = -1.4, kz = 1.05;
  lp.push([kx, 0, kz], 0.25);
  for (const sx of [-1, 1]) {
    torus(lp, sx * 0.3, 0.2, 0, 0.18, 0.03, LPC.woodDark, [0, Math.PI / 2, 0]);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; beam(lp, [sx * 0.3, 0.2 + Math.sin(a) * 0.17, Math.cos(a) * 0.17], [sx * 0.3, 0.2 - Math.sin(a) * 0.17, -Math.cos(a) * 0.17], 0.01, LPC.woodDark); }
  }
  lp.box(0, 0.26, 0, 0.56, 0.2, 0.42, LPC.wood, { bevel: 0.01, vary: 0.1 });
  for (const sx of [-1, 1]) beam(lp, [sx * 0.15, 0.36, 0.2], [sx * 0.18, 0.2, 0.75], 0.018, LPC.woodDark);
  if (!v.broken) for (let k = 0; k < 3; k++) {
    lp.box(-0.16 + k * 0.16, 0.46, 0, 0.09, 0.14, 0.09, '#c9d6d2', { jitter: 0, bucket: 'gloss' });
    lp.box(-0.16 + k * 0.16, 0.6, 0, 0.11, 0.025, 0.11, LPC.iron, { jitter: 0 });
  }
  lp.pop();
  // la botte dell'olio e le latte
  const ox = -1.5, oz = 0.35;
  lp.lathe(ox, 0, oz, [[0.2, 0], [0.24, 0.12], [0.25, 0.25], [0.24, 0.38], [0.2, 0.5], [0, 0.5]], 10, '#6b5240', { vary: 0.08, ao: 0.2 });
  // Una lanterna appoggiata sulla botte, accesa solo quando la casa è illuminata.
  hangingLantern(lp, ox, 0.5 + 0.38 * 0.7, oz, c.lit, 0.7);
  for (const y of [0.08, 0.42]) torus(lp, ox, y, oz, 0.225, 0.014, LPC.iron, [Math.PI / 2, 0, 0], Math.PI * 2, { jitter: 0 });
  for (const [x, z, h] of [[-1.13, 0.25, 0.26], [-1.12, 0.52, 0.2]] as const) lp.box(x, 0, z, 0.15, h, 0.12, v.broken && z > 0.4 ? LPC.rust : '#5d6b6e', { bevel: 0.01, vary: 0.08 });
  if (v.broken) lp.blob(-1.3, 0.012, 0.7, 0.28, 0.01, 0.18, '#2a2620', { ao: 0 });
  // tavolino tondo con la lanterna e due sgabelli: la sera si sta fuori a guardare le luci
  const tx = 1.05, tz = 1.45;
  lp.cyl(tx, 0, tz, 0.08, 0.05, 0.5, 6, LPC.woodDark, { jitter: 0 });
  lp.cyl(tx, 0.5, tz, 0.32, 0.32, 0.04, 10, LPC.wood, { vary: 0.08 });
  lp.box(tx - 0.05, 0.54, tz, 0.11, 0.17, 0.11, c.lit ? LPC.lantern : '#3c3a35', { bucket: c.lit ? 'glow' : 'solid', jitter: 0 });
  lp.box(tx - 0.05, 0.71, tz, 0.13, 0.025, 0.13, LPC.iron, { jitter: 0 });
  if (c.lit) lp.light(tx - 0.05, 0.65, tz, LPC.lantern, 0.5, 2.4, 0.2, 0.2);
  for (const [dx, dz] of [[-0.48, 0.12], [0.45, -0.1]] as const) lp.cyl(tx + dx, 0, tz + dz, 0.13, 0.11, 0.32, 7, LPC.woodDark, { vary: 0.08 });
  // aiuola di nasturzi lungo la casa
  lp.box(0.95, 0, 0.45, 1.25, 0.06, 0.4, LPC.soil, { bevel: 0.02, vary: 0.1 });
  for (let i = 0; i < 10; i++) flower(lp, 0.42 + (i % 5) * 0.26, 0.35 + Math.floor(i / 5) * 0.2, v.broken ? LPC.dry : i % 2 ? '#d98a3a' : '#c9a75e', 0.2, 0.05);
  meadow(c, [[-1.25, -2.6, 1.75, -0.3], [-1.0, -0.6, -0.02, 2.55], [-1.85, 0.6, -0.9, 1.6], [-1.8, 0.05, -1.0, 0.7], [0.25, 0.2, 1.65, 0.7], [0.45, 1.15, 1.6, 1.75], [0.05, 1.9, 0.5, 2.3]], [[-1.5, -0.45, 0.9]]);
}

// ── 4 · La serra del fioraio ─────────────────────────────────────────────
// La casa dello scheletro fioraio: una casetta col tetto a capanna e, attaccata, la serra coi vetri
// sul tetto e le piante dentro. Cornici color osso, un teschio-vaso alla porta. In giardino le
// aiuole a file bordate d'ossa e la carriola piena di fiori.

function florist(c: CryptCtx) {
  const { lp, v } = c;
  const plaster = '#8f7f6b', bone = LPC.bone, roof = '#4f5a4b';
  lp.push([-0.65, 0, -0.35]);
  const W = 1.75, D = 1.3, B = 0.16, H = 1.2, rise = 0.7;
  lp.box(0, 0, 0, W + 0.08, B, D + 0.08, LPC.stone, { bevel: 0.02, vary: 0.08, ao: 0.25 });
  lp.box(0, B, 0, W, H - B, D, plaster, { bevel: 0.015, vary: 0.05, ao: 0.25 });
  corners(c, W, D, B, H - B, bone);
  for (const sx of [-1, 1]) gable(lp, sx * (W / 2 - 0.05), D, H, rise, plaster, 0.1);
  gableRoof(lp, W, D, H, rise, roof, 0.14, false);
  rearDetails(c, D, B, H, plaster, bone, roof);
  lp.push([0, 0, -D / 2], Math.PI); wallIvy(c, 0, 0.035, 0.76); lp.pop();
  lp.push([-W / 2, 0, 0], -Math.PI / 2); crossWindow(c, 0.05, B + 0.3, 0, 0.24, 0.32, bone, v.broken); lp.pop();
  door(c, -0.18, B, D / 2, 0.42, 0.78, bone);
  for (const x of [0.28, 0.6]) crossWindow(c, x, 0.55, D / 2, 0.18, 0.32, '#5a4636', v.broken);
  roundWindow(c, -0.68, B + 0.53, D / 2, 0.12, bone);
  lp.box(0.44, 0.42, D / 2 + 0.08, 0.68, 0.09, 0.1, '#6b5240', { bevel: 0.006 });
  for (let i = 0; i < 7; i++) flower(lp, 0.2 + i * 0.08, D / 2 + 0.08, v.broken ? LPC.dry : LPC.flowers[i % LPC.flowers.length], 0.1, 0.51);
  if (!v.broken) hangingLantern(lp, -0.48, B + 0.95, D / 2 + 0.14, c.lit, 0.68);
  lp.box(-0.3, H + 0.15, -0.35, 0.22, 0.65, 0.22, LPC.stoneWarm, { bevel: 0.015, vary: 0.08 });
  lp.pop();
  // la serra (a destra): muretto, montanti color osso, vetri sul tetto, piante dentro
  lp.push([1.05, 0, -0.35]);
  const GW = 1.05, GD = 1.25, GB = 0.32, GH = 0.95, grise = 0.4;
  lp.box(0, 0, 0, GW, GB, GD, '#7a6a5a', { bevel: 0.015, vary: 0.08, ao: 0.25 });
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) beam(lp, [sx * (GW / 2 - 0.03), GB, -GD / 2 + 0.03 + (k * (GD - 0.06)) / 3], [sx * (GW / 2 - 0.03), GH, -GD / 2 + 0.03 + (k * (GD - 0.06)) / 3], 0.018, bone);
  for (const sz of [-1, 1]) for (let k = 0; k < 4; k++) beam(lp, [-GW / 2 + 0.03 + (k * (GW - 0.06)) / 3, GB, sz * (GD / 2 - 0.03)], [-GW / 2 + 0.03 + (k * (GW - 0.06)) / 3, GH, sz * (GD / 2 - 0.03)], 0.018, bone);
  for (const sz of [-1, 1]) beam(lp, [-GW / 2, GH, sz * (GD / 2 - 0.03)], [GW / 2, GH, sz * (GD / 2 - 0.03)], 0.02, bone);
  for (const sx of [-1, 1]) beam(lp, [sx * (GW / 2 - 0.03), GH, -GD / 2], [sx * (GW / 2 - 0.03), GH, GD / 2], 0.02, bone);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    if (v.broken && sx > 0 && k === 1) continue;
    const zc = -GD / 2 + (k + 0.5) * (GD / 3);
    slabBetween(c, [sx * (GW / 2 + 0.04), GH - 0.02], [0, GH + grise], zc, GD / 3 - 0.03, 0.02, '#7f9a98', 0.0);
  }
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { const zc = -GD / 2 + (k * GD) / 3; beam(lp, [sx * (GW / 2 + 0.04), GH, zc], [0, GH + grise, zc], 0.016, bone); }
  beam(lp, [0, GH + grise, -GD / 2], [0, GH + grise, GD / 2], 0.022, bone);
  lp.box(0, 0.32, 0, GW - 0.2, 0.04, GD - 0.4, LPC.wood, { vary: 0.1 });
  for (let i = 0; i < 6; i++) {
    const x = -0.3 + (i % 3) * 0.3, z = -0.25 + Math.floor(i / 3) * 0.45;
    lp.cyl(x, 0.36, z, 0.07, 0.055, 0.1, 7, '#9a5a3a', { vary: 0.08 });
    if (v.broken && i % 2) continue;
    lp.blob(x, 0.55, z, 0.12, 0.14, 0.12, i % 2 ? LPC.leaf : LPC.mossBright, { jitter: 0.01 });
    if (i % 2 === 0) for (let k = 0; k < 3; k++) lp.blob(x + Math.sin(k * 2) * 0.07, 0.64 + (k % 2) * 0.04, z + Math.cos(k * 2) * 0.07, 0.03, 0.03, 0.03, LPC.flowers[(i + k) % LPC.flowers.length], { jitter: 0 });
  }
  if (!v.broken) for (let i = 0; i < 6; i++) leaf(lp, 0.35 - i * 0.08, GH + 0.05 + i * 0.05, GD / 2 - 0.1, 0.13, LPC.leaf, i * 0.9);
  if (c.lit) lp.light(0, 0.8, 0, LPC.lantern, 0.5, 2.6, 0.1, 0.3);
  lp.pop();
  // il teschio-vaso accanto alla porta, coi fiori che gli escono dalla testa
  const sx0 = -0.98, sz0 = 0.5;
  gameSkull(lp, sx0, 0, sz0, 1.5, LPC.bone);
  if (!v.broken) for (let i = 0; i < 4; i++) flower(lp, sx0 + Math.sin(i * 1.6) * 0.04, sz0 + Math.cos(i * 1.6) * 0.03, LPC.flowers[i], 0.12, 0.22);
}

/** Osso del bordo delle aiuole: un bastoncino con le teste. */
function boneLink(c: CryptCtx, a: P3, b: P3) {
  beam(c.lp, a, b, 0.018, LPC.bone);
  for (const p of [a, b]) c.lp.blob(p[0], p[1], p[2], 0.032, 0.026, 0.032, LPC.bone, { jitter: 0 });
}

function floristYard(c: CryptCtx) {
  const { lp, v } = c;
  doorStep(c, -0.68, -0.3, 0.55);
  const beds: Array<[number, number, string]> = [[0.1, 0.45, '#b87569'], [0.1, 1.0, '#d6cdb9'], [0.1, 1.55, '#8f7aa8']];
  for (const [bx, bz, col] of beds) {
    const x = bx + 0.75, w = 1.6, d = 0.42;
    lp.box(x, 0, bz, w, 0.07, d, LPC.soil, { bevel: 0.02, vary: 0.1 });
    for (let k = 0; k < 5; k++) boneLink(c, [x - w / 2 + k * (w / 5) + 0.03, 0.04, bz + d / 2 + 0.02], [x - w / 2 + (k + 1) * (w / 5) - 0.03, 0.04, bz + d / 2 + 0.02]);
    for (let k = 0; k < 7; k++) {
      if (v.broken && k % 2) continue;
      flower(lp, x - w / 2 + 0.12 + k * 0.22, bz - 0.08, v.broken ? LPC.dry : col, 0.22, 0.06);
      flower(lp, x - w / 2 + 0.22 + k * 0.22, bz + 0.1, v.broken ? LPC.dry : col, 0.18, 0.06);
    }
  }
  // la carriola piena di fiori
  const x = -1.4, zz = 1.45;
  torus(lp, x, 0.16, zz - 0.36, 0.14, 0.035, LPC.iron, [0, Math.PI / 2, 0]);
  for (const sx of [-1, 1]) {
    beam(lp, [x + sx * 0.2, 0.25, zz - 0.3], [x + sx * 0.2, 0.36, zz + 0.25], 0.022, '#6d5c44');
    beam(lp, [x + sx * 0.2, 0.36, zz + 0.2], [x + sx * 0.2, 0.42, zz + 0.62], 0.022, '#9b8058');
    beam(lp, [x + sx * 0.18, 0.02, zz + 0.25], [x + sx * 0.18, 0.33, zz + 0.2], 0.022, LPC.iron);
  }
  lp.box(x, 0.3, zz, 0.46, 0.16, 0.56, '#6e775d', { bevel: 0.01, vary: 0.08 });
  for (let i = 0; i < 9; i++) {
    if (v.broken && i % 2) continue;
    lp.blob(x - 0.14 + (i % 3) * 0.14, 0.5, zz - 0.18 + Math.floor(i / 3) * 0.18, 0.06, 0.05, 0.06, v.broken ? LPC.dry : LPC.flowers[i % LPC.flowers.length], { jitter: 0.006 });
  }
  wateringCan(c, -1.5, 0.55, 0.6);
  for (let i = 0; i < 3; i++) {
    slab(lp, 1.3, 0.02 + i * 0.18, 2.32 - i * 0.12, 0.6, 0.04, 0.16, LPC.wood);
    for (let k = 0; k < 3; k++) {
      lp.cyl(1.1 + k * 0.2, 0.06 + i * 0.18, 2.32 - i * 0.12, 0.05, 0.04, 0.08, 6, '#9a5a3a', { jitter: 0 });
      if (!v.broken) lp.blob(1.1 + k * 0.2, 0.18 + i * 0.18, 2.32 - i * 0.12, 0.05, 0.05, 0.05, (i + k) % 2 ? LPC.leaf : LPC.flowers[(i + k) % LPC.flowers.length], { jitter: 0.005 });
    }
  }
  for (const sx of [-1, 1]) beam(lp, [1.3 + sx * 0.3, 0, 2.42], [1.3 + sx * 0.3, 0.42, 2.07], 0.02, LPC.woodDark);
  meadow(c, [[-1.2, -2.6, 1.25, -0.4], [-1.15, -0.55, -0.8, -0.15], [-0.98, -0.35, -0.38, 2.55], [0.0, 0.15, 1.7, 1.85], [-1.68, 0.95, -1.05, 2.15], [-1.75, 0.38, -1.22, 0.72], [0.95, 1.92, 1.7, 2.5]], [[1.5, -0.35, 0.8]]);
}

// ── Registro ─────────────────────────────────────────────────────────────

export const VILLAGE_FAMILIES = ['reaper', 'rectory', 'lamplighter', 'florist'] as const;
export type VillageFamily = (typeof VILLAGE_FAMILIES)[number];
export const VILLAGE_BUILDINGS: Record<VillageFamily, (c: CryptCtx) => void> = { reaper, rectory, lamplighter, florist };
export const VILLAGE_YARDS: Record<VillageFamily, (c: CryptCtx) => void> = { reaper: reaperYard, rectory: rectoryYard, lamplighter: lamplighterYard, florist: floristYard };
