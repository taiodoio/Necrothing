// Testata animata del Registro delle sepolture: un libro antico sul tavolo
// del Custode, tra le candele. La copertina si apre, si sfogliano alcune
// pagine, poi il libro resta aperto e sulla pagina di destra l'inchiostro
// compare riga per riga, in un corsivo che non serve leggere. Le candele
// tremano, la polvere gira nella luce, ogni tanto un soffio alza l'angolo
// della pagina. Come la testata della Bottega: un renderer piccolo tutto
// suo, acceso solo finché la testata è a schermo.

import * as THREE from 'three';
import { LP, gothicArchShape, type LPModel } from '../render/lowpoly/kit.ts';
import { LPC } from '../render/lowpoly/palette.ts';
import { instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { createRng } from '../game/rng.ts';

const FPS = 30;
/** Pagina: larghezza (dal dorso al bordo), profondità, quante strisce per piegarla. */
const W = 0.95, D = 1.3, SEG = 14;
/** Altezza del dorso: le due metà aperte si appoggiano qui (vedi bookHalves). */
const SPINE_Y = 0.105;
const PAPER = '#eadcbc', INK = 'rgba(58, 38, 28, 0.86)';

// ── Il tavolo, la parete, le candele (ferme): un solo modello ─────────────

function roomModel(): LPModel {
  const lp = new LP('testata-registro');
  const r = lp.rng;
  // piano del tavolo: assi lungo x, il bordo davanti si vede
  for (let i = 0; i < 7; i++) lp.box(0, -0.12, -1.1 + i * 0.36, 6.4, 0.12, 0.35, r.pick([LPC.wood, LPC.woodDark, '#6e5340']), { vary: 0.08, jitter: 0.004 });
  lp.box(0, -0.5, 1.4, 6.4, 0.38, 0.1, LPC.woodDark, { bevel: 0.02, vary: 0.08 });
  // runner di velluto viola sotto il libro, con la frangia d'oro
  lp.box(0, 0, 0.05, 2.6, 0.012, 1.75, '#4a3358', { vary: 0.05, jitter: 0 });
  for (let x = -1.26; x <= 1.27; x += 0.09) lp.box(x, -0.04, 0.95, 0.03, 0.05, 0.08, LPC.gold, { jitter: 0 });
  // parete di pietra e una finestra ad arco con la luna
  for (let row = 0; row < 7; row++) for (let i = 0; i < 9; i++) {
    const x = -4 + i * 0.95 + (row % 2) * 0.47 + r.range(-0.04, 0.04);
    lp.box(x, -0.2 + row * 0.5, -1.5, 0.92, 0.47, 0.12, r.pick([LPC.stone, LPC.stoneWarm, LPC.stoneDark, '#5a5560']), { bevel: 0.03, vary: 0.1 });
  }
  lp.push([0, 0.75, -1.42]);
  lp.plate(gothicArchShape(1.15, 1.55, 5), 0.06, LPC.woodDark);
  lp.push([0, 0.07, 0.04]).plate(gothicArchShape(0.95, 1.38, 5), 0.02, '#26344d', { bucket: 'glow' }).pop();
  lp.blob(-0.2, 1.0, 0.08, 0.15, 0.15, 0.02, '#f3ecd2', { bucket: 'glow', detail: 1 });
  lp.box(0, 0.6, 0.09, 0.95, 0.04, 0.03, LPC.woodDark).box(0, 0.05, 0.09, 0.04, 1.35, 0.03, LPC.woodDark);
  lp.pop();
  // a sinistra: il teschio che regge una candela, e una candela alta su un piattino
  lp.blob(-1.75, 0.17, -0.15, 0.19, 0.17, 0.18, LPC.bone, { detail: 1 });
  lp.box(-1.75, 0.0, -0.07, 0.2, 0.1, 0.14, LPC.boneDark);
  for (const dx of [-0.07, 0.07]) lp.blob(-1.75 + dx, 0.19, 0.0, 0.045, 0.05, 0.03, LPC.engrave, { detail: 0 });
  lp.cyl(-1.75, 0.31, -0.15, 0.06, 0.055, 0.22, 6, '#e8dcc0', { vary: 0.04 });
  for (let i = 0; i < 5; i++) { const a = r.range(0, Math.PI * 2); lp.blob(-1.75 + Math.cos(a) * 0.08, r.range(0.2, 0.36), -0.15 + Math.sin(a) * 0.08, 0.025, r.range(0.04, 0.07), 0.025, '#efe4c8', { detail: 0 }); } // cera colata
  lp.cyl(-2.2, 0, -0.55, 0.16, 0.17, 0.03, 8, LPC.gold).cyl(-2.2, 0.03, -0.55, 0.06, 0.06, 0.62, 6, '#e3d6b8', { vary: 0.04 });
  // a destra: tre candele sul piatto d'ottone, il calamaio con la penna, una zucchina
  lp.cyl(1.85, 0, -0.35, 0.34, 0.36, 0.03, 10, LPC.gold, { vary: 0.05 });
  for (const [x, z, hh] of CANDLES_RIGHT) lp.cyl(x, 0.03, z, 0.055, 0.05, hh, 6, r.pick(['#e8dcc0', '#efe4c8', '#ddd0b0']), { vary: 0.04 });
  lp.cyl(1.4, 0, 0.55, 0.11, 0.09, 0.12, 7, '#2a2a36').cyl(1.4, 0.12, 0.55, 0.05, 0.05, 0.03, 7, '#2a2a36');
  lp.push([1.42, 0.13, 0.55], 0.4, 0, -0.5).cyl(0, 0, 0, 0.008, 0.008, 0.55, 3, LPC.woodLight).pop();
  lp.push([1.62, 0.43, 0.55], 0.4, 0, -0.5).blob(0, 0, 0, 0.03, 0.17, 0.01, '#f2ece0', { detail: 1 }).pop();
  lp.blob(2.3, 0.1, 0.35, 0.13, 0.1, 0.13, '#d9772f', { detail: 1 }).cyl(2.3, 0.19, 0.35, 0.015, 0.012, 0.06, 4, LPC.leaf);
  // un libro chiuso sotto la candela alta, e una ragnatela nell'angolo della finestra
  lp.push([-2.25, 0, 0.35], 0.3).box(0, 0, 0, 0.55, 0.1, 0.4, '#34495e', { bevel: 0.01 }).box(0.015, 0.012, 0, 0.5, 0.075, 0.37, PAPER).pop();
  for (let i = 0; i < 4; i++) lp.push([-0.5, 2.25, -1.38], 0, 0, -0.3 - i * 0.35).box(0, -0.35, 0, 0.006, 0.35, 0.006, '#c9c3b5').pop();
  return lp.build();
}

/** Candele del piatto a destra: x, z, altezza. */
const CANDLES_RIGHT: Array<[number, number, number]> = [[1.72, -0.45, 0.5], [1.98, -0.3, 0.34], [1.8, -0.16, 0.22]];
/** Dove stanno le fiammelle (punta della candela). */
const FLAMES: Array<[number, number, number, number]> = [
  [-1.75, 0.53, -0.15, 1], [-2.2, 0.65, -0.55, 1.1],
  ...CANDLES_RIGHT.map(([x, z, hh]) => [x, 0.03 + hh, z, 1] as [number, number, number, number]),
];

// ── Il libro: copertine e blocchi di pagine (fermi), le pagine (vive) ──────

/**
 * Le due metà del libro aperto: quella di destra (piatto posteriore e mezzo
 * blocco di pagine) resta ferma, quella di sinistra (copertina e l'altra metà
 * delle pagine) gira attorno al dorso. Entrambe disegnate da aperte.
 */
function bookHalf(side: 1 | -1): LPModel {
  const lp = new LP(`testata-registro-libro:${side}`);
  const leather = '#6d2f2a', edge = '#d9c9a2';
  lp.box(side * 0.5, 0, 0, 1.0, 0.03, 1.38, leather, { bevel: 0.012, vary: 0.05 });
  // angolari d'ottone sul bordo esterno
  for (const sz of [-1, 1]) lp.box(side * 0.94, 0.005, sz * 0.63, 0.12, 0.03, 0.12, LPC.gold, { bevel: 0.01, jitter: 0 });
  lp.box(side * (W / 2 + 0.015), 0.03, 0, W - 0.02, SPINE_Y - 0.032, D, edge, { bevel: 0.006, vary: 0.04, jitter: 0 });
  // righe delle pagine sul taglio
  for (let i = 1; i < 5; i++) lp.box(side * (W / 2 + 0.015), 0.03 + i * 0.014, D / 2 + 0.002, W - 0.03, 0.003, 0.004, '#b8a67e', { jitter: 0 });
  if (side < 0) {
    // sul piatto, che da chiuso è la copertina: cornice e un teschio d'oro (la cima verso il fondo)
    lp.box(-0.5, -0.004, 0, 0.8, 0.004, 1.18, '#8a6a3a', { jitter: 0 });
    const flat = (shape: THREE.Shape, y: number, thick: number, color: string) => lp.push([-0.5, y, -0.04], 0, -Math.PI / 2).plate(shape, thick, color, { vary: 0.04 }).pop();
    const circle = (x: number, y: number, r: number) => { const c = new THREE.Shape(); c.absarc(x, y, r, 0, Math.PI * 2, false); return c; };
    const jaw = new THREE.Shape();
    jaw.moveTo(-0.1, -0.05); jaw.lineTo(0.1, -0.05); jaw.lineTo(0.085, -0.17); jaw.lineTo(-0.085, -0.17); jaw.closePath();
    flat(circle(0, 0.06, 0.17), -0.008, 0.004, LPC.gold);
    flat(jaw, -0.008, 0.004, LPC.gold);
    // orbite, naso e denti scuri, appena più in fuori
    const hole = '#3a1a16';
    for (const sx of [-1, 1]) flat(circle(sx * 0.066, 0.035, 0.045), -0.0095, 0.002, hole);
    const nose = new THREE.Shape();
    nose.moveTo(0, -0.005); nose.lineTo(0.025, -0.05); nose.lineTo(-0.025, -0.05); nose.closePath();
    flat(nose, -0.0095, 0.002, hole);
    for (const x of [-0.05, -0.017, 0.017, 0.05]) { const tooth = new THREE.Shape(); tooth.moveTo(x - 0.004, -0.09); tooth.lineTo(x + 0.004, -0.09); tooth.lineTo(x + 0.004, -0.15); tooth.lineTo(x - 0.004, -0.15); tooth.closePath(); flat(tooth, -0.0095, 0.002, hole); }
  }
  return lp.build();
}

/** Righe in corsivo (non si leggono): anelli, gambe e legature tirati a mano. */
function drawPage(g: CanvasRenderingContext2D, seed: number, lines: number, cw: number, ch: number, mirror: boolean) {
  const rnd = createRng(seed).next;
  // carta invecchiata: più scura verso il dorso e sui bordi
  g.fillStyle = PAPER; g.fillRect(0, 0, cw, ch);
  const gutter = g.createLinearGradient(mirror ? cw : 0, 0, mirror ? cw * 0.75 : cw * 0.25, 0);
  gutter.addColorStop(0, 'rgba(120, 90, 50, 0.35)'); gutter.addColorStop(1, 'rgba(120, 90, 50, 0)');
  g.fillStyle = gutter; g.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = `rgba(150, 110, 60, ${0.04 + rnd() * 0.05})`;
    g.beginPath(); g.arc(rnd() * cw, rnd() * ch, 10 + rnd() * 40, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
  const left = mirror ? cw * 0.1 : cw * 0.16, right = mirror ? cw * 0.84 : cw * 0.9;
  let y = ch * 0.12;
  // iniziale ornata
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(left, y + 24); g.bezierCurveTo(left - 10, y - 20, left + 40, y - 26, left + 26, y + 10); g.bezierCurveTo(left + 14, y + 40, left + 52, y + 44, left + 58, y + 18); g.stroke();
  g.lineWidth = 2.2;
  const step = ch * 0.075;
  for (let l = 0; l < lines; l++) {
    const x0 = l === 0 ? left + 70 : left + (rnd() < 0.2 ? 24 : 0);
    const x1 = l % 5 === 4 ? left + (right - left) * (0.35 + rnd() * 0.3) : right - rnd() * 18;
    g.beginPath();
    let x = x0;
    g.moveTo(x, y);
    while (x < x1) {
      // una «lettera»: anello o gamba, a volte un'asta alta o una coda sotto
      const w = 6 + rnd() * 9, tall = rnd() < 0.18 ? -16 : -7 - rnd() * 4, low = rnd() < 0.12 ? 12 : 0;
      g.bezierCurveTo(x + w * 0.2, y + tall, x + w * 0.9, y + tall, x + w * 0.55, y + low * 0.5);
      g.bezierCurveTo(x + w * 0.4, y + 3 + low, x + w * 0.8, y + 2, x + w, y);
      x += w;
      // fine parola: un tratto di penna e uno spazio
      if (rnd() < 0.16) { x += 8 + rnd() * 6; g.moveTo(x, y + (rnd() - 0.5) * 2); }
    }
    g.stroke();
    y += step;
    if (l === 5 && !mirror) {
      // a metà pagina: una piccola lapide disegnata e un fregio
      g.lineWidth = 1.8;
      const cx = (left + right) / 2;
      g.beginPath(); g.moveTo(cx - 22, y + 40); g.lineTo(cx - 22, y + 8); g.quadraticCurveTo(cx, y - 16, cx + 22, y + 8); g.lineTo(cx + 22, y + 40); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(cx, y + 6); g.lineTo(cx, y + 30); g.moveTo(cx - 9, y + 14); g.lineTo(cx + 9, y + 14); g.stroke();
      g.beginPath(); g.moveTo(left + 20, y + 44); g.bezierCurveTo(cx - 40, y + 36, cx - 30, y + 54, cx - 34, y + 44); g.moveTo(right - 20, y + 44); g.bezierCurveTo(cx + 40, y + 36, cx + 30, y + 54, cx + 34, y + 44); g.stroke();
      g.lineWidth = 2.2;
      y += 70;
    }
  }
}

function pageTexture(seed: number, lines: number, mirror = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 384; canvas.height = 528;
  const g = canvas.getContext('2d')!;
  drawPage(g, seed, lines, canvas.width, canvas.height, mirror);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, redraw: (n: number) => { drawPage(g, seed, n, canvas.width, canvas.height, mirror); tex.needsUpdate = true; } };
}

/**
 * Una pagina che si piega: parte dal dorso e ogni striscia ha il suo angolo.
 * `b` è quanto è girata (0 = a destra, π = a sinistra); il bordo libero
 * resta un po' indietro mentre gira, e da ferma la pagina si incurva verso
 * il dorso come nei libri veri.
 */
class Page {
  readonly geo = new THREE.BufferGeometry();
  readonly group = new THREE.Group();
  private pos: Float32Array;
  constructor(front: THREE.Texture | null, back: THREE.Texture | null, private lift = 0) {
    const n = (SEG + 1) * 2;
    this.pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2), idx: number[] = [];
    for (let i = 0; i <= SEG; i++) {
      uv.set([i / SEG, 1, i / SEG, 0], i * 4);
      if (i < SEG) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    // il diritto si vede da sopra quando la pagina sta a destra, il rovescio quando sta a sinistra
    if (front) this.group.add(new THREE.Mesh(this.geo, new THREE.MeshLambertMaterial({ map: front, side: THREE.FrontSide })));
    if (back) {
      back.wrapS = THREE.RepeatWrapping; back.repeat.x = -1; // il retro si legge dritto
      this.group.add(new THREE.Mesh(this.geo, new THREE.MeshLambertMaterial({ map: back, side: THREE.BackSide })));
    }
    this.set(0);
  }
  set(b: number, curl = 0.55) {
    let x = 0, y = SPINE_Y + 0.004 + this.lift;
    const ds = W / SEG;
    for (let i = 0; i <= SEG; i++) {
      this.pos.set([x, y, -D / 2, x, y, D / 2], i * 6);
      const u = (i + 0.5) / SEG;
      // da ferma la pagina sale dal dorso e si distende; girando, il bordo resta indietro
      const rest = 0.42 * (1 - u) ** 3;
      const th = b + rest * Math.cos(b) - curl * Math.sin(b) * u;
      x += Math.cos(th) * ds; y += Math.sin(th) * ds;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }
}

// i modelli fermi si costruiscono una volta e si riusano a ogni apertura
const models = new Map<string, LPModel>();
function place(key: string, build: () => LPModel): THREE.Group {
  let m = models.get(key);
  if (!m) { m = build(); models.set(key, m); }
  return instantiate({ geometries: m.geometries, lights: [], height: 1, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: false });
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export interface RegistryHeader { el: HTMLElement; stop: () => void }

/** Crea la testata; si ferma (e libera la scheda video) quando esce dal documento. */
/** `settled`: il libro è già aperto e scritto (tornando all'elenco da una scheda), senza rifare il racconto. */
export function registryHeader(opts: { settled?: boolean } = {}): RegistryHeader {
  const el = document.createElement('div');
  el.className = 'drawer-hero registry-hero';
  const canvas = document.createElement('canvas');
  el.append(canvas);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch {
    el.classList.add('static'); // senza WebGL resta il fondo dipinto in CSS
    return { el, stop: () => undefined };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a1520');
  scene.fog = new THREE.Fog('#1a1520', 5, 10);
  scene.add(new THREE.HemisphereLight('#8a8fb8', '#3a2a24', 0.45));
  const moon = new THREE.PointLight('#8fb0e0', 1.6, 4, 1.6);
  moon.position.set(-0.2, 1.9, -0.9);
  const left = new THREE.PointLight('#ffad5a', 5, 5, 1.6);
  left.position.set(-1.9, 0.9, 0.1);
  const right = new THREE.PointLight('#ffad5a', 5.5, 5, 1.6);
  right.position.set(1.85, 0.85, 0.05);
  scene.add(moon, left, right, place('stanza', roomModel));

  // fiammelle (si allungano e si piegano un po'), ognuna col suo alone
  const flames = FLAMES.map(([x, y, z, s], i) => {
    const g = place('fiamma', () => new LP('testata-registro-fiamma').cyl(0, 0, 0, 0.032, 0, 0.11, 5, LPC.flame, { bucket: 'glow', jitter: 0 }).blob(0, 0.03, 0, 0.022, 0.03, 0.022, '#fff3c8', { bucket: 'glow', detail: 0 }).build());
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: 0.22, depthWrite: false }));
    halo.position.set(x, y + 0.05, z);
    scene.add(g, halo);
    return { g, halo, s, i };
  });

  // il libro: la metà di destra ferma, quella di sinistra sul suo cardine
  const book = new THREE.Group();
  book.position.set(0, 0.012, 0.05);
  book.rotation.y = 0.04;
  const hinge = new THREE.Group();
  hinge.position.set(0, SPINE_Y, 0);
  const leftHalf = place('libro:-1', () => bookHalf(-1));
  leftHalf.position.set(0, -SPINE_Y, 0);
  hinge.add(leftHalf);
  book.add(place('libro:1', () => bookHalf(1)), hinge);
  scene.add(book);

  // pagine: le due ferme (sinistra legata alla copertina), quattro da sfogliare, quella di destra che scrive
  const leftTex = pageTexture(11, 11, true), rightTex = pageTexture(23, 0);
  const leftPage = new Page(null, leftTex.tex);
  leftPage.set(Math.PI);
  leftPage.group.position.set(0, -SPINE_Y, 0);
  // la pagina di sinistra gira con la copertina: nel cardine è disegnata da aperta
  hinge.add(leftPage.group);
  const rightPage = new Page(rightTex.tex, null);
  book.add(rightPage.group);
  const flips = Array.from({ length: 4 }, (_, i) => {
    const p = new Page(pageTexture(40 + i, 11).tex, pageTexture(60 + i, 11, true).tex, 0.002 + i * 0.0015);
    book.add(p.group);
    return p;
  });

  // polvere nella luce delle candele
  const DUST = 46;
  const dustPos = new Float32Array(DUST * 3);
  const rnd = createRng(7).next;
  const seeds = Array.from({ length: DUST }, () => ({ x: (rnd() - 0.5) * 4.6, y: rnd() * 1.6, z: (rnd() - 0.5) * 1.6, sp: 0.03 + rnd() * 0.05, ph: rnd() * 6 }));
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffd9a0', size: 0.022, transparent: true, opacity: 0.55, depthWrite: false })));

  const camera = new THREE.PerspectiveCamera(28, 2.4, 0.1, 30);
  const look = new THREE.Vector3(0, 0.22, 0);

  // il racconto: fermo, si apre, si sfoglia, scrive; poi resta lì
  const OPEN_AT = 0.5, OPEN_LEN = 1.5, FLIP_AT = 2.2, FLIP_LEN = 0.95, FLIP_GAP = 0.42, WRITE_AT = FLIP_AT + 3 * FLIP_GAP + FLIP_LEN + 0.25, LINES = 11, LINE_LEN = 0.32;
  let t = 0, last = 0, raf = 0, stopped = false, w = 0, h = 0, written = -1;
  let ready = !!opts.settled, steady = 0;
  const born = performance.now();
  if (opts.settled) t = WRITE_AT + LINES * LINE_LEN + 0.2;

  const resize = () => {
    const nw = el.clientWidth, nh = el.clientHeight;
    if (!nw || !nh || (nw === w && nh === h)) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // sullo schermo stretto ci si allontana, così libro e candele restano dentro
    const far = THREE.MathUtils.clamp(2.4 / camera.aspect, 1, 1.6);
    camera.position.set(0, 2.35 * far, 3.95 * far);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  };

  const step = (dt: number) => {
    t += dt;
    // copertina: da chiusa (girata di π) ad aperta, passando in alto
    hinge.rotation.z = -Math.PI * (1 - ease((t - OPEN_AT) / OPEN_LEN));
    leftPage.group.visible = t > OPEN_AT + 0.2;
    // le pagine da sfogliare partono una dopo l'altra (prima stanno sotto la destra)
    flips.forEach((p, i) => {
      const k = ease((t - FLIP_AT - i * FLIP_GAP) / FLIP_LEN);
      p.group.visible = t > OPEN_AT + OPEN_LEN * 0.5;
      p.set(k * Math.PI, 0.65);
    });
    // la pagina di destra: l'inchiostro compare riga per riga, poi ogni tanto un soffio alza l'angolo
    const n = Math.max(0, Math.min(LINES, Math.floor((t - WRITE_AT) / LINE_LEN)));
    if (n !== written) { written = n; rightTex.redraw(n); }
    const since = t - (WRITE_AT + LINES * LINE_LEN + 1.5);
    const puff = since > 0 ? Math.max(0, Math.sin(((since % 8) / 1.6) * Math.PI)) * ((since % 8) < 1.6 ? 1 : 0) : 0;
    rightPage.set(puff * 0.22, 0.9);
    rightPage.group.visible = t > OPEN_AT + OPEN_LEN * 0.4;
    // candele che tremano
    left.intensity = 5 * (0.88 + Math.sin(t * 11) * 0.05 + Math.sin(t * 27 + 1) * 0.04);
    right.intensity = 5.5 * (0.88 + Math.sin(t * 9 + 2) * 0.05 + Math.sin(t * 31) * 0.04);
    for (const f of flames) {
      const k = Math.sin(t * (10 + f.i) + f.i * 1.7) * 0.5 + Math.sin(t * (23 + f.i * 2)) * 0.5;
      f.g.scale.set(f.s * (1 - k * 0.06), f.s * (1 + k * 0.14), f.s * (1 - k * 0.06));
      f.g.rotation.z = Math.sin(t * 3 + f.i) * 0.08;
      (f.halo.material as THREE.MeshBasicMaterial).opacity = 0.2 + k * 0.04;
    }
    // la polvere sale piano e ondeggia
    seeds.forEach((d, i) => {
      const y = (d.y + t * d.sp) % 1.6;
      dustPos.set([d.x + Math.sin(t * 0.4 + d.ph) * 0.12, 0.1 + y, d.z + Math.cos(t * 0.3 + d.ph) * 0.08], i * 3);
    });
    dustGeo.attributes.position.needsUpdate = true;
  };

  const frame = () => {
    if (stopped) return;
    const now = performance.now();
    if (!el.isConnected) { stop(); return; }
    raf = requestAnimationFrame(frame);
    // testata ridotta a fascia (si sta scorrendo la lista): si ferma, l'ultimo fotogramma resta
    if (document.hidden || el.closest('.hero-small') || now - last < 1000 / FPS - 2) return;
    const raw = last ? (now - last) / 1000 : 1 / FPS;
    last = now;
    // il racconto parte solo quando i frame scorrono regolari (all'apertura il pannello sale
    // e la scheda video prepara tutto): così il libro non si apre a scatti
    if (!ready) { steady = raw < 0.045 ? steady + 1 : 0; ready = steady >= 4 || now - born > 1600; }
    const dt = ready ? Math.min(0.05, raw) : 0;
    resize();
    step(dt);
    renderer.render(scene, camera);
  };

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    // geometrie e materiali dei modelli condivisi restano al gioco: si liberano le pagine e questo renderer
    for (const p of [leftPage, rightPage, ...flips]) p.geo.dispose();
    leftTex.tex.dispose(); rightTex.tex.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  // la prima immagine subito, poi l'animazione
  // (gli shader si preparano subito, non al primo giro di pagina)
  requestAnimationFrame(() => {
    resize();
    // anche le pagine che compaiono dopo (nascoste all'inizio) vanno preparate adesso
    for (const p of [leftPage, rightPage, ...flips]) p.group.visible = true;
    renderer.compile(scene, camera);
    step(0);
    renderer.render(scene, camera);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  });
  return { el, stop };
}
