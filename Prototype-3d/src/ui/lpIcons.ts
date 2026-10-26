// Icone low-poly dell'interfaccia nuova: sagome semplici su una griglia 24×24
// fatte di poligoni a tinta unita, con poche facce e toni luminosi (il tono
// scuro solo nelle facce proprio in ombra), estremi arrotondati. Luce da in
// alto a sinistra, come nella scena. Nessun contorno. Le stesse forme danno
// l'SVG per l'interfaccia e il disegno su canvas per i segnalini nella scena.

type V = [number, number];
type Poly = { fill: string; pts: V[] };

const LIGHT: V = [-0.55, -0.83];
const T = {
  gold: ['#ffe9b8', '#f0c46e', '#c99340'],
  stone: ['#eceae4', '#c3c5ca', '#8f949d'],
  iron: ['#b8bec9', '#8c93a0', '#636a77'],
  wood: ['#e0b285', '#bf8a5c', '#8e6340'],
  woodDark: ['#bf8a5c', '#8e6340', '#6a4a30'],
  spectral: ['#e6fff7', '#8ff0d4', '#45b89d'],
  red: ['#ffb4a0', '#ec7563', '#b84a42'],
  leaf: ['#c9e690', '#93bf5e', '#62904a'],
  flame: ['#fff7da', '#ffd56b', '#f7a13a'],
  bone: ['#f6e9cf', '#dcc59c', '#b3956a'],
  skin: ['#fff0de', '#f3d6b8', '#d6b08c'],
  hat: ['#7a7486', '#5a5566', '#3f3b4a'],
  straw: ['#f7dc95', '#dcb465', '#b08a45'],
  moon: ['#fff3c4', '#ecd28a', '#c9a75a'],
  sky: ['#9fc3e6', '#7aa6d1', '#5a86b3'],
  pink: ['#ffc6d6', '#f592b0', '#cf6a8c'],
  ghost: ['#ffffff', '#e4edf1', '#b9cad3'],
  cloud: ['#f2f4f6', '#cfd6de', '#a3adb9'],
  rain: ['#bfe2ff', '#7fbcef', '#4f8fc8'],
  paper: ['#f8eed8', '#e6d6b3', '#c7b28a'],
  dusk: ['#ffe0b0', '#ffa860', '#e87a3e'],
  dawn: ['#ffe2ea', '#ffb0c4', '#e07c9a'],
  ink: ['#4a3f3a', '#3a3030', '#2a2224'],
  pumpkin: ['#ffc07a', '#f08a3a', '#c45f22'],
  autumn: ['#ffd08a', '#e0913f', '#b0612a'],
  bat: ['#9a88ac', '#6a5a7c', '#463a56'],
  crimson: ['#e8707a', '#c03a48', '#8a2232'],
} as const;
type Tones = readonly [string, string, string];

const shade = (mx: number, my: number, t: Tones) => {
  const l = Math.hypot(mx, my) || 1, s = (mx * LIGHT[0] + my * LIGHT[1]) / l;
  return s > 0.25 ? t[0] : s > -0.65 ? t[1] : t[2];
};
const cen = (p: V[]): V => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
const P = (pts: V[], fill: string): Poly[] => [{ fill, pts }];

/** Ventaglio di triangoli dal centro: ogni faccia prende il tono della sua direzione. */
function fan(p: V[], t: Tones, c: V = cen(p)): Poly[] {
  const out: Poly[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    out.push({ fill: shade((a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], t), pts: [c, a, b] });
  }
  return out;
}
const ngon = (cx: number, cy: number, r: number, n = 10, rot = 0, sy = 1): V[] =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + (i / n) * Math.PI * 2) * r, cy + Math.sin(rot + (i / n) * Math.PI * 2) * r * sy]);
const disc = (cx: number, cy: number, r: number, t: Tones, n = 10) => fan(ngon(cx, cy, r, n, Math.PI / n), t, [cx - r * 0.25, cy - r * 0.25]);
function ring(cx: number, cy: number, r0: number, r1: number, t: Tones, n = 12): Poly[] {
  const o = ngon(cx, cy, r1, n), i = ngon(cx, cy, r0, n);
  return o.map((a, k) => { const b = o[(k + 1) % n]; return { fill: shade((a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy, t), pts: [a, b, i[(k + 1) % n], i[k]] }; });
}
/** Barra con gli estremi tondi: faccia illuminata e faccia in ombra. */
function bar(x1: number, y1: number, x2: number, y2: number, w: number, t: Tones): Poly[] {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy * w / 2, ny = ux * w / 2;
  const lit = nx * LIGHT[0] + ny * LIGHT[1] > 0;
  const cap = (x: number, y: number) => fan(ngon(x, y, w / 2, 8, Math.PI / 8), [t[0], t[1], t[1]], [x, y]);
  return [...cap(x1, y1), ...cap(x2, y2),
    { fill: lit ? t[0] : t[1], pts: [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2, y2], [x1, y1]] },
    { fill: t[1], pts: [[x1, y1], [x2, y2], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]] }];
}
const line = (p: V[], w: number, t: Tones) => p.slice(1).flatMap((q, i) => bar(p[i][0], p[i][1], q[0], q[1], w, t));
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 8): V[] => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
function rrect(x0: number, y0: number, x1: number, y1: number, r: number, t: Tones, c?: V): Poly[] {
  const p: V[] = [];
  const corner = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= 3; i++) { const a = a0 + (i / 3) * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x1 - r, y0 + r, -Math.PI / 2); corner(x1 - r, y1 - r, 0); corner(x0 + r, y1 - r, Math.PI / 2); corner(x0 + r, y0 + r, Math.PI);
  return fan(p, t, c);
}
/** Falce di luna: il cerchio esterno meno uno spostato. */
function crescent(cx: number, cy: number, r: number, ox: number, oy: number, r2: number, t: Tones): Poly[] {
  const n = 36, out: V[] = [], inn: V[] = [];
  let start = 0;
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; if (Math.hypot(cx + Math.cos(a) * r - ox, cy + Math.sin(a) * r - oy) < r2) start = k + 1; }
  for (let j = 0; j < n; j++) { const a = (((start + j) % n) / n) * Math.PI * 2, p: V = [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; if (Math.hypot(p[0] - ox, p[1] - oy) >= r2) out.push(p); }
  const a0 = Math.atan2(out[out.length - 1][1] - oy, out[out.length - 1][0] - ox), a1 = Math.atan2(out[0][1] - oy, out[0][0] - ox);
  let d = a1 - a0; while (d > 0) d -= Math.PI * 2;
  for (let k = 1; k < 18; k++) { const a = a0 + (d * k) / 18; inn.push([ox + Math.cos(a) * r2, oy + Math.sin(a) * r2]); }
  return fan([...out, ...inn], t, cen(out));
}
/** Mezzo sole all'orizzonte: cinque raggi a ventaglio, simmetrici, tutti sopra la linea. */
const halfSun = (t: Tones, cy = 14): Poly[] => [
  ...Array.from({ length: 5 }, (_, i) => -Math.PI + 0.32 + (i * (Math.PI - 0.64)) / 4).flatMap((a) => bar(12 + Math.cos(a) * 7.4, cy + Math.sin(a) * 7.4, 12 + Math.cos(a) * 9.8, cy + Math.sin(a) * 9.8, 1.9, t)),
  ...fan([...arc(12, cy, 5.8, Math.PI, Math.PI * 2, 8)], t, [11, cy - 2.5]),
];
const sunset = (t: Tones): Poly[] => [...halfSun(t), ...bar(3, 15.4, 21, 15.4, 2.2, T.iron), ...bar(6, 19, 18, 19, 2, T.iron)];
const cloud = (dy = 0): Poly[] => [...disc(8, 11 + dy, 4, T.cloud), ...disc(13, 8.6 + dy, 5, T.cloud), ...disc(17, 11.4 + dy, 3.6, T.cloud), ...rrect(4.4, 10.6 + dy, 20.4, 15.2 + dy, 2.2, T.cloud, [10, 11 + dy])];

const ICONS: Record<string, () => Poly[]> = {
  menu: () => [5, 12, 19].flatMap((y) => bar(4.5, y, 19.5, y, 3.4, T.gold)),
  close: () => [...bar(5.5, 5.5, 18.5, 18.5, 3.6, T.gold), ...bar(18.5, 5.5, 5.5, 18.5, 3.6, T.gold)],
  check: () => line([[4.5, 12.5], [9.5, 17.5], [19.5, 6.5]], 3.6, T.leaf),
  wisp: () => [...fan([[12, 1.8], [15.8, 7.4], [18.6, 12.6], [17.8, 17.4], [14.6, 20.8], [12, 21.6], [9.4, 20.8], [6.2, 17.4], [5.4, 12.6], [8.2, 7.4]], T.spectral, [10.8, 12.5]),
    ...fan([[12, 9.4], [14.4, 13.6], [13.6, 17], [12, 18], [10.4, 17], [9.6, 13.6]], ['#ffffff', '#f2fffa', '#d6fbef'])],
  ghost: () => [...fan([[12, 2.4], [16.6, 4.4], [18.8, 9], [19, 20], [16.4, 18.2], [14.2, 20.6], [12, 18.6], [9.8, 20.6], [7.6, 18.2], [5, 20], [5.2, 9], [7.4, 4.4]], T.ghost, [10.5, 9]),
    ...disc(9.6, 10.4, 1.3, T.ink, 6), ...disc(14.4, 10.4, 1.3, T.ink, 6), ...disc(12, 14, 1, T.ink, 6)],
  keeper: () => [...fan(ngon(12, 16, 5.6, 10, 0, 0.92), T.skin, [10.5, 14.5]), ...disc(9.8, 16.2, 0.9, T.ink, 6), ...disc(14.2, 16.2, 0.9, T.ink, 6),
    ...rrect(2.4, 9.6, 21.6, 12, 1.2, T.hat, [9, 10]), ...rrect(7, 2.4, 17, 10.4, 1.4, T.hat, [10, 5]), ...rrect(7, 7.6, 17, 9.6, 0.6, T.red, [10, 8])],
  gear: () => [...Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2).flatMap((a) => bar(12 + Math.cos(a) * 6.6, 12 + Math.sin(a) * 6.6, 12 + Math.cos(a) * 9.4, 12 + Math.sin(a) * 9.4, 3.4, T.iron)), ...ring(12, 12, 2.8, 7.4, T.iron, 12)],
  sun: () => [...Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2).flatMap((a) => bar(12 + Math.cos(a) * 7.6, 12 + Math.sin(a) * 7.6, 12 + Math.cos(a) * 10.2, 12 + Math.sin(a) * 10.2, 2, T.flame)), ...disc(12, 12, 5.8, T.flame, 12)],
  moon: () => crescent(11.5, 12.5, 9.2, 16, 9, 7.6, T.moon),
  dusk: () => sunset(T.dusk),
  dawn: () => sunset(T.dawn),
  rain: () => [...cloud(-2), ...[[7.6, 16.4], [12, 17.4], [16.4, 16.4]].flatMap(([x, y]) => bar(x, y, x - 1.4, y + 4, 1.8, T.rain))],
  fog: () => [...cloud(-3), ...bar(3.4, 15.4, 17, 15.4, 2, T.cloud), ...bar(7, 19, 20.6, 19, 2, T.cloud)],
  bury: () => [...fan([[9, 2], [15, 2], [18.4, 8], [15.8, 22], [8.2, 22], [5.6, 8]], T.wood, [10.5, 9]), ...bar(12, 6.6, 12, 15.4, 2.2, T.gold), ...bar(9.2, 9.6, 14.8, 9.6, 2.2, T.gold)],
  edit: () => [...bar(7.4, 16.6, 16.8, 7.2, 4.6, T.gold), ...bar(16.8, 7.2, 18.8, 5.2, 4.6, T.pink), ...P([[3.6, 20.4], [5.8, 14.6], [9.4, 18.2]], T.wood[0]), ...P([[3.6, 20.4], [4.4, 18.2], [5.8, 19.6]], '#4a3a32')],
  bag: () => [...line([[8.4, 9.4], [9.4, 4.8], [14.6, 4.8], [15.6, 9.4]], 2, T.wood), ...rrect(3.6, 8.6, 20.4, 21, 2.4, T.wood, [10, 12]), ...rrect(3.6, 8.6, 20.4, 13.4, 2, T.woodDark, [12, 10]), ...disc(12, 13.4, 2, T.gold, 8)],
  shop: () => [...rrect(4.4, 10.4, 19.6, 21, 1, T.stone, [9, 14]), ...rrect(10, 14, 14, 21, 0.6, T.woodDark, [11, 16]), ...rrect(5.8, 13, 8.8, 16, 0.4, T.flame, [6.5, 13.5]), ...rrect(15.2, 13, 18.2, 16, 0.4, T.flame, [16, 13.5]), ...fan([[1.8, 11.4], [12, 2.8], [22.2, 11.4]], T.red, [9, 8])],
  photo: () => [...rrect(7.4, 4.4, 14.6, 8, 1, T.iron, [10, 5.5]), ...rrect(2.6, 7, 21.4, 19.8, 2.4, T.iron, [9, 10]), ...ring(12, 13.4, 3, 5.4, T.stone, 12), ...disc(12, 13.4, 3, T.spectral, 10), ...rrect(16.8, 8.8, 19.4, 10.6, 0.4, T.flame, [17, 9])],
  gallery: () => [...rrect(2.4, 3.6, 21.6, 20.4, 1.6, T.gold, [8, 8]), ...rrect(4.8, 6, 19.2, 18, 0.6, T.sky, [8, 8]), ...fan([[4.8, 18], [10, 11], [14.6, 18]], T.leaf, [9, 14]), ...fan([[10.4, 18], [15.4, 12.6], [19.2, 18]], T.leaf, [14, 15]), ...disc(15.6, 9, 1.8, T.moon, 8)],
  search: () => [...bar(14.8, 14.8, 20.6, 20.6, 3.6, T.wood), ...ring(10, 10, 5, 7.6, T.iron, 12), ...disc(10, 10, 5, ['#f0fffb', '#b6f3e3', '#7fd8c2'], 12)],
  broom: () => [...bar(19.8, 3.2, 12.2, 12.4, 2.2, T.wood), ...fan([[10.2, 10.6], [14.4, 14.2], [11.6, 21.2], [8.4, 21.8], [3.4, 20.6], [2.6, 16.8]], T.straw, [9, 15]), ...bar(10.4, 11.4, 13.6, 14.4, 2, T.red)],
  flower: () => [...bar(12, 12.4, 12, 21.4, 1.8, T.leaf), ...fan([[12, 18.4], [17.8, 14.8], [16, 19.2]], T.leaf), ...Array.from({ length: 5 }, (_, i) => -Math.PI / 2 + (i / 5) * Math.PI * 2).flatMap((a) => disc(12 + Math.cos(a) * 4.2, 8.8 + Math.sin(a) * 4.2, 3, T.pink, 8)), ...disc(12, 8.8, 2.4, T.gold, 8)],
  hammer: () => [...bar(7, 21, 13.6, 10.6, 2.8, T.wood), ...rrect(5.6, 4.6, 19.4, 10.4, 1.4, T.iron, [10, 6])],
  lightOn: () => [...rrect(8.4, 3.6, 15.6, 6.8, 1.2, T.iron, [10, 4.5]), ...rrect(7, 6.4, 17, 19, 1.6, ['#ffc35e', '#f7a13a', '#e0832a'], [10, 9]), ...fan([[12, 8.6], [14.8, 12.8], [13.6, 16.4], [12, 17.2], [10.4, 16.4], [9.2, 12.8]], T.flame, [11.4, 12]), ...rrect(6.4, 18.4, 17.6, 21.4, 1.2, T.iron, [10, 19]), ...ring(12, 2.6, 0.8, 1.9, T.iron, 8)],
  lightOff: () => [...rrect(8.4, 3.6, 15.6, 6.8, 1.2, T.iron, [10, 4.5]), ...rrect(7, 6.4, 17, 19, 1.6, ['#6f7686', '#5a606e', '#4a4f5c'], [10, 9]), ...fan([[12, 10], [13.8, 13.4], [12, 16.4], [10.2, 13.4]], T.iron), ...rrect(6.4, 18.4, 17.6, 21.4, 1.2, T.iron, [10, 19]), ...ring(12, 2.6, 0.8, 1.9, T.iron, 8)],
  target: () => [...ring(12, 12, 6.2, 9, T.gold, 14), ...disc(12, 12, 2.6, T.gold, 8), ...[[12, 1, 12, 4.4], [12, 19.6, 12, 23], [1, 12, 4.4, 12], [19.6, 12, 23, 12]].flatMap(([a, b, c, d]) => bar(a, b, c, d, 1.8, T.gold))],
  shovel: () => [...bar(18.2, 4.6, 11.4, 12, 2.2, T.wood), ...line([[16, 3.4], [18.6, 2.4], [20.6, 4.8], [19.6, 6.2]], 1.8, T.wood), ...fan([[8.6, 9.6], [12.6, 12.6], [13, 16.6], [8.8, 21.4], [3.4, 19.6], [3.2, 15], [5.6, 11]], T.stone, [8, 14])],
  bike: () => [...ring(6.2, 16, 3, 5, T.iron), ...ring(17.8, 16, 3, 5, T.iron), ...line([[6.2, 16], [10.6, 9.4], [16, 9.4], [17.8, 16]], 1.8, T.red), ...line([[10.6, 9.4], [12.4, 16], [16, 9.4]], 1.8, T.red), ...bar(14.8, 6.4, 17.8, 6.4, 1.8, T.iron), ...bar(8.6, 7.8, 12.4, 7.8, 2, T.wood)],
  staff: () => [...bar(6, 21.4, 15.4, 8.4, 2.2, T.wood), ...ring(16.4, 7, 2.4, 3.6, T.gold, 10), ...fan([[16.4, 2.6], [18.8, 7], [16.4, 11.2], [14, 7]], T.spectral, [15.6, 6])],
  // l'Albero dei ricordi: tronco con le radici, chioma a tre gonfi e i frutti accesi appesi
  tree: () => [...fan([[10.4, 12.6], [13.6, 12.6], [14, 18.2], [18.4, 21.8], [13.4, 20.8], [12, 22.2], [10.6, 20.8], [5.6, 21.8], [10, 18.2]], T.wood, [11, 15]),
    ...disc(7.2, 10.8, 4.8, T.leaf, 10), ...disc(16.8, 10.8, 4.8, T.leaf, 10), ...disc(12, 6.4, 5.6, T.leaf, 12), ...disc(12, 11.4, 4.4, T.leaf, 10),
    ...[[7.6, 13.4], [16.2, 13], [12.2, 9.4]].flatMap(([x, y]) => [...bar(x, y - 2, x, y - 0.8, 0.6, T.woodDark), ...disc(x, y, 1.5, T.flame, 6)])],
  // «Altro»: tre pallini, come i puntini di un elenco che continua
  more: () => [4, 12, 20].flatMap((x) => disc(x, 12, 3.1, T.gold, 8)),
  // cartolina col francobollo e due righe
  postcard: () => [...rrect(2.4, 5, 21.6, 19, 1.4, T.paper, [9, 9]), ...rrect(15, 7, 19.6, 12, 0.5, T.red, [16, 8]), ...bar(4.8, 9, 12.4, 9, 1.2, T.ink), ...bar(4.8, 12.4, 12.4, 12.4, 1.2, T.ink), ...bar(4.8, 15.8, 19.4, 15.8, 1.2, T.ink)],
  bell: () => [...fan([[7, 17.6], [7.6, 11], [9.6, 6.4], [12, 4.8], [14.4, 6.4], [16.4, 11], [17, 17.6], [19.6, 19.4], [4.4, 19.4]], T.gold, [10.5, 11]), ...disc(12, 20.8, 1.8, T.gold, 8), ...ring(12, 3.2, 0.7, 1.8, T.gold, 8)],
  heart: () => fan([[12, 20.8], [6.2, 15.6], [3.2, 11.2], [3.4, 7], [6, 4.4], [9.4, 4.4], [12, 7.2], [14.6, 4.4], [18, 4.4], [20.6, 7], [20.8, 11.2], [17.8, 15.6]], T.red, [10, 9.5]),
  paw: () => [...fan(ngon(12, 15.6, 4.6, 10, 0, 0.86), T.bone, [11, 14.5]), ...[[5.4, 10.2], [9.2, 5.8], [14.8, 5.8], [18.6, 10.2]].flatMap(([x, y]) => disc(x, y, 2.4, T.bone, 8))],
  // fischietto (chiama l'animale dal Custode): corpo tondo, bocchino, anello e due segni di suono
  whistle: () => [...rrect(9.6, 8.4, 21, 13.4, 1.4, T.gold, [14, 9.5]), ...disc(9.4, 14.2, 6.2, T.gold, 12), ...rrect(12, 8.4, 14.8, 10.2, 0.4, [T.iron[2], T.iron[2], T.iron[2]]),
    ...ring(4.2, 8.6, 1, 2.3, T.iron, 8), ...bar(16.6, 5.4, 18.4, 2.8, 1.4, T.spectral), ...bar(19.6, 6.6, 22, 4.6, 1.4, T.spectral)],
  // decorazioni dell'interfaccia «viva» e icone delle schede
  pumpkin: () => [...fan(ngon(7.6, 14.6, 4.8, 10, 0, 1.08), T.pumpkin), ...fan(ngon(16.4, 14.6, 4.8, 10, 0, 1.08), T.pumpkin), ...fan(ngon(12, 14.6, 4.6, 10, 0, 1.22), T.pumpkin),
    ...bar(12, 9.4, 13.4, 5.6, 1.9, T.leaf), ...fan([[13.6, 7], [17.6, 5], [16.2, 8.4]], T.leaf)],
  skull: () => [...disc(12, 10.4, 7.6, T.bone, 12), ...rrect(7.6, 12.6, 16.4, 20, 2.2, T.bone, [10, 14]), ...disc(9.1, 11.6, 2.1, T.ink, 8), ...disc(14.9, 11.6, 2.1, T.ink, 8),
    ...fan([[12, 13.6], [10.9, 15.6], [13.1, 15.6]], T.ink), ...[9.8, 12, 14.2].flatMap((x) => bar(x, 17.4, x, 19.6, 0.7, T.ink))],
  leaf: () => [...fan([[12, 2.6], [17.4, 6.4], [19.6, 11.6], [17.4, 17], [12, 21.4], [6.6, 17], [4.4, 11.6], [6.6, 6.4]], T.autumn, [10, 9]), ...bar(12, 5.6, 12, 21.4, 0.9, T.woodDark),
    ...bar(12, 11, 15.6, 8.4, 0.7, T.woodDark), ...bar(12, 14.6, 8.4, 12, 0.7, T.woodDark)],
  coffin: () => [...fan([[8.6, 2.6], [15.4, 2.6], [19, 8.4], [16.2, 21.4], [7.8, 21.4], [5, 8.4]], T.wood, [10, 9]), ...bar(12, 7, 12, 15.4, 1.6, T.gold), ...bar(9, 10, 15, 10, 1.6, T.gold)],
  face: () => [...disc(12, 12.4, 8.6, T.skin, 14), ...disc(9.1, 11.8, 1.4, T.ink, 8), ...disc(14.9, 11.8, 1.4, T.ink, 8), ...disc(7.4, 14.8, 1.5, T.pink, 8), ...disc(16.6, 14.8, 1.5, T.pink, 8),
    ...line(arc(12, 14, 2.6, 0.35, Math.PI - 0.35, 5), 1, T.ink), ...fan([[3.8, 10], [6.4, 4.6], [12, 3], [17.6, 4.6], [20.2, 10], [16, 7.4], [12, 6.6], [8, 7.4]], T.wood)],
  comb: () => [...rrect(3.4, 5, 20.6, 10.4, 1.8, T.wood, [9, 6.5]), ...Array.from({ length: 7 }, (_, i) => 5.2 + i * 2.25).flatMap((x) => bar(x, 10, x, 18.6 - (x > 12 ? (x - 12) * 0.3 : 0), 1.25, T.wood))],
  shirt: () => [...fan([[8, 3.6], [10.6, 5.2], [13.4, 5.2], [16, 3.6], [21, 7.8], [18.4, 11.8], [16.6, 10.6], [16.6, 20.8], [7.4, 20.8], [7.4, 10.6], [5.6, 11.8], [3, 7.8]], T.leaf, [10, 9]),
    ...fan([[10.6, 5.2], [12, 8.6], [13.4, 5.2]], T.paper), ...[11.2, 14.4, 17.6].flatMap((y) => disc(12, y, 0.9, T.ink, 6))],
  bone: () => [...bar(7, 17, 17, 7, 3.2, T.bone), ...[[5.2, 16.2], [7.8, 18.8], [16.2, 5.2], [18.8, 7.8]].flatMap(([x, y]) => disc(x, y, 2.4, T.bone, 8))],
  kennel: () => [...rrect(4.6, 11, 19.4, 21, 1, T.wood, [9, 14]), ...fan([[12, 15], [14.4, 16.6], [14.4, 21], [9.6, 21], [9.6, 16.6]], T.ink, [11, 17]), ...fan([[2, 12.4], [12, 3.4], [22, 12.4], [19.6, 13.2], [12, 6.6], [4.4, 13.2]], T.red, [9, 8])],
  variant: () => [...line(arc(12, 12, 7.6, -Math.PI * 0.95, Math.PI * 0.45, 9), 2.6, T.gold), ...fan([[12 + Math.cos(Math.PI * 0.45) * 7.6 - 3.6, 12 + Math.sin(Math.PI * 0.45) * 7.6 - 0.6], [12 + Math.cos(Math.PI * 0.45) * 7.6 + 2.6, 12 + Math.sin(Math.PI * 0.45) * 7.6 - 3.4], [12 + Math.cos(Math.PI * 0.45) * 7.6 + 1, 12 + Math.sin(Math.PI * 0.45) * 7.6 + 3.6]], T.gold)],
  trophy: () => [...line(arc(6.4, 8.8, 3, Math.PI * 0.5, Math.PI * 1.5, 5), 1.8, T.gold), ...line(arc(17.6, 8.8, 3, -Math.PI * 0.5, Math.PI * 0.5, 5), 1.8, T.gold), ...fan([[5.6, 3.6], [18.4, 3.6], [17.6, 9.6], [15.2, 13.4], [12, 14.6], [8.8, 13.4], [6.4, 9.6]], T.gold, [10, 7]), ...bar(12, 14.4, 12, 18, 2.4, T.gold), ...rrect(6.8, 17.6, 17.2, 21.2, 1.2, T.woodDark, [10, 18.5])],
  lock: () => [...line(arc(12, 9.6, 4.4, Math.PI, Math.PI * 2, 6), 2.2, T.iron), ...bar(7.6, 9.6, 7.6, 11, 2.2, T.iron), ...bar(16.4, 9.6, 16.4, 11, 2.2, T.iron), ...rrect(4.8, 10.6, 19.2, 21.4, 2, T.gold, [10, 13]), ...disc(12, 15, 1.6, T.ink, 8), ...bar(12, 15.4, 12, 18, 1.4, T.ink)],
  unlock: () => [...line(arc(14.4, 7.2, 4.4, Math.PI * 1.05, Math.PI * 2, 6), 2.2, T.iron), ...bar(18.8, 7.2, 18.8, 9, 2.2, T.iron), ...rrect(4.8, 10.6, 19.2, 21.4, 2, T.gold, [10, 13]), ...disc(12, 15, 1.6, T.ink, 8), ...bar(12, 15.4, 12, 18, 1.4, T.ink)],
  fence: () => [...bar(2.6, 10.6, 21.4, 10.6, 1.8, T.woodDark), ...bar(2.6, 16.8, 21.4, 16.8, 1.8, T.woodDark), ...[4.6, 10.4, 16.2].flatMap((x) => fan([[x, 6.6], [x + 1.6, 4.2], [x + 3.2, 6.6], [x + 3.2, 21.4], [x, 21.4]], T.wood, [x + 1, 10]))],
  top: () => [...fan([[3, 6], [9, 3.6], [9, 18.4], [3, 20.8]], T.paper, [5, 9]), ...fan([[9, 3.6], [15, 6], [15, 20.8], [9, 18.4]], [T.paper[1], T.paper[1], T.paper[2]], [12, 9]), ...fan([[15, 6], [21, 3.6], [21, 18.4], [15, 20.8]], T.paper, [17, 9]),
    ...[[6, 14], [9.4, 11.6], [12.8, 13.6], [16.4, 10.4]].flatMap(([x, y]) => disc(x, y, 0.9, T.red, 6)), ...bar(16.2, 7.4, 19.2, 10.4, 1.6, T.red), ...bar(19.2, 7.4, 16.2, 10.4, 1.6, T.red)],
  // casa del Custode: muri d'intonaco, tetto d'ardesia, finestra accesa e camino
  house: () => [...rrect(15.4, 3.4, 18.4, 10, 0.5, T.stone, [16, 5]), ...rrect(4.6, 11, 19.4, 21, 1, T.paper, [9, 14]), ...rrect(7, 14, 10.8, 21, 0.8, T.woodDark, [8, 16]), ...rrect(13, 13.6, 17, 17.4, 0.5, T.flame, [14, 14]),
    ...fan([[1.8, 12.2], [12, 3.2], [22.2, 12.2], [19.8, 13.2], [12, 6.4], [4.2, 13.2]], T.hat, [9, 8])],
  // registro delle sepolture: libro aperto con le righe in corsivo
  book: () => [...fan([[1.6, 6.6], [12, 8.4], [22.4, 6.6], [22.4, 19.4], [12, 21.4], [1.6, 19.4]], T.red, [9, 10]),
    ...fan([[3, 4.4], [11.2, 6.4], [11.2, 19.2], [3, 17.2]], T.paper, [6, 8]), ...fan([[12.8, 6.4], [21, 4.4], [21, 17.2], [12.8, 19.2]], [T.paper[1], T.paper[1], T.paper[2]], [16, 8]),
    ...[8.6, 11.4, 14.2].flatMap((y) => [...bar(4.8, y - 1.2, 9.6, y, 0.9, T.ink), ...bar(14.4, y, 19.2, y - 1.2, 0.9, T.ink)])],
  // stagione: un calendarietto con la foglia d'autunno
  calendar: () => [...rrect(3.4, 4.6, 20.6, 21, 1.8, T.paper, [9, 9]), ...rrect(3.4, 4.6, 20.6, 9.2, 1.6, T.red, [9, 5.5]), ...bar(8, 2.6, 8, 6.4, 1.6, T.iron), ...bar(16, 2.6, 16, 6.4, 1.6, T.iron),
    ...fan([[12, 10.8], [16, 13.2], [16.2, 17.2], [12, 19.6], [7.8, 17.2], [8, 13.2]], T.autumn, [10.5, 13])],
  // pipistrello (il morso del vampiro): ali a festoni, orecchie a punta, occhi rossi
  bat: () => [...fan([[12, 9], [7.4, 6.2], [3, 6.6], [1, 11], [3.6, 10.8], [4.6, 14], [7, 12.6], [8.6, 16.4], [12, 13.4]], T.bat, [6, 9]),
    ...fan([[12, 9], [16.6, 6.2], [21, 6.6], [23, 11], [20.4, 10.8], [19.4, 14], [17, 12.6], [15.4, 16.4], [12, 13.4]], T.bat, [17, 9]),
    ...fan([[9.4, 9], [10, 5.4], [11.4, 7.6], [12.6, 7.6], [14, 5.4], [14.6, 9], [14, 15.6], [12, 18], [10, 15.6]], T.bat, [11, 9]),
    ...disc(10.8, 10.4, 0.9, T.red, 6), ...disc(13.2, 10.4, 0.9, T.red, 6)],
  // il morso del vampiro: bocca aperta con le labbra scure, i denti e due zanne lunghe
  fangs: () => [...fan([[2.4, 9.4], [7, 6.2], [12, 7.4], [17, 6.2], [21.6, 9.4], [19.4, 15.6], [12, 20.2], [4.6, 15.6]], T.crimson, [8, 9]),
    ...fan([[5, 10], [12, 9.4], [19, 10], [17, 14.6], [12, 17.4], [7, 14.6]], T.ink, [12, 12]),
    ...fan([[5, 10], [12, 9.4], [19, 10], [18.4, 11.6], [5.6, 11.6]], T.ghost, [9, 10]),
    ...fan([[6.8, 11], [9.2, 11], [8, 15.4]], T.ghost, [7.6, 12]), ...fan([[14.8, 11], [17.2, 11], [16, 15.4]], T.ghost, [15.6, 12]),
    ...fan([[16, 15.8], [16.7, 17.2], [16, 18.2], [15.3, 17.2]], T.crimson, [15.8, 16.6])],
  // anniversario (tre proposte): il lumino rosso col coperchio d'ottone e la croce in rilievo
  lumino: () => [...rrect(7.4, 19.8, 16.6, 22.2, 0.6, T.gold, [10, 20.5]), ...fan([[7, 9.8], [17, 9.8], [16.2, 20.4], [7.8, 20.4]], T.crimson, [10, 12]),
    ...bar(12, 12.4, 12, 18, 1.2, T.gold), ...bar(10, 14.2, 14, 14.2, 1.2, T.gold), ...rrect(6.2, 8, 17.8, 10.8, 1, T.gold, [10, 8.6]),
    ...fan([[12, 0.8], [14.4, 4.4], [13.8, 6.8], [12, 7.6], [10.2, 6.8], [9.6, 4.4]], T.flame, [11.4, 4.5])],
  // la corona di foglie con tre fiori e il nastro
  wreath: () => [
    ...Array.from({ length: 13 }, (_, i) => -Math.PI / 2 + (i / 13) * Math.PI * 2 + 0.24).flatMap((a) => {
      const x = 12 + Math.cos(a) * 7.2, y = 10.4 + Math.sin(a) * 7.2, lx = Math.cos(a + Math.PI / 2) * 2.7, ly = Math.sin(a + Math.PI / 2) * 2.7;
      return fan([[x - lx, y - ly], [x - ly * 0.45, y + lx * 0.45], [x + lx, y + ly], [x + ly * 0.45, y - lx * 0.45]], T.leaf, [x, y]);
    }),
    ...[-2.4, -0.75, Math.PI].flatMap((a) => [...disc(12 + Math.cos(a) * 7.2, 10.4 + Math.sin(a) * 7.2, 2.4, T.pink, 8), ...disc(12 + Math.cos(a) * 7.2, 10.4 + Math.sin(a) * 7.2, 0.9, T.gold, 6)]),
    ...fan([[12, 17], [9.4, 23], [7.6, 21.2], [10.4, 16.6]], T.crimson), ...fan([[12, 17], [14.6, 23], [16.4, 21.2], [13.6, 16.6]], T.crimson), ...disc(12, 17.4, 2, T.crimson, 8)],
  // il calendarietto col lumino acceso
  annivCal: () => [...rrect(3.4, 4.6, 20.6, 21, 1.8, T.paper, [9, 9]), ...rrect(3.4, 4.6, 20.6, 9.2, 1.6, T.hat, [9, 5.5]), ...bar(8, 2.6, 8, 6.4, 1.6, T.iron), ...bar(16, 2.6, 16, 6.4, 1.6, T.iron),
    ...fan([[9.2, 13.8], [14.8, 13.8], [14.2, 19.4], [9.8, 19.4]], T.crimson, [11, 15]), ...rrect(8.8, 12.6, 15.2, 14.2, 0.5, T.gold, [11, 13]),
    ...fan([[12, 9.4], [13.3, 11.2], [12, 12.4], [10.7, 11.2]], T.flame)],
  // localizza: la puntina sulla mappa
  pin: () => [...fan([[12, 22], [6, 13.4], [5.2, 9], [7.2, 4.6], [12, 2.4], [16.8, 4.6], [18.8, 9], [18, 13.4]], T.red, [9.5, 6.5]), ...disc(12, 9.2, 3, T.paper, 10)],
  angled: () => [...P([[12, 3], [20.4, 7.6], [12, 12.2], [3.6, 7.6]], T.stone[0]), ...P([[3.6, 7.6], [12, 12.2], [12, 21.4], [3.6, 16.8]], T.stone[1]), ...P([[12, 12.2], [20.4, 7.6], [20.4, 16.8], [12, 21.4]], T.stone[2])],
};

// ── Il cielo in un'icona sola: fase del giorno e meteo insieme ──────────
// sky-<fase>-<meteo>: alba/giorno/tramonto/notte × sereno/nebbia/pioggia/temporale

/** Sposta e scala un disegno (griglia 24×24). */
const tf = (ps: Poly[], k: number, dx: number, dy: number): Poly[] => ps.map((p) => ({ fill: p.fill, pts: p.pts.map(([x, y]) => [x * k + dx, y * k + dy] as V) }));
const sun = (t: Tones = T.flame) => [...Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2).flatMap((a) => bar(12 + Math.cos(a) * 7.6, 12 + Math.sin(a) * 7.6, 12 + Math.cos(a) * 10.2, 12 + Math.sin(a) * 10.2, 2, t)), ...disc(12, 12, 5.8, t, 12)];
const moon = () => crescent(11.5, 12.5, 9.2, 16, 9, 7.6, T.moon);
const star = (x: number, y: number, r: number): Poly[] => fan([[x, y - r], [x + r * 0.3, y - r * 0.3], [x + r, y], [x + r * 0.3, y + r * 0.3], [x, y + r], [x - r * 0.3, y + r * 0.3], [x - r, y], [x - r * 0.3, y - r * 0.3]], T.moon, [x, y]);
const bolt = (): Poly[] => fan([[13.4, 14.6], [10.4, 19.2], [12.6, 19.2], [11.2, 23], [15.6, 17.6], [13.2, 17.6], [14.8, 14.6]], T.flame);
const drops = (n: number) => [[7.6, 17], [12, 18], [16.4, 17]].slice(0, n).flatMap(([x, y]) => bar(x, y, x - 1.4, y + 4, 1.8, T.rain));
const fogBars = (y: number) => [...bar(3.4, y, 15.6, y, 2.2, T.cloud), ...bar(8.4, y + 3.6, 20.6, y + 3.6, 2.2, T.cloud)];
type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';
type SkyWeather = 'clear' | 'fog' | 'rain' | 'storm';
function sky(phase: SkyPhase, w: SkyWeather): Poly[] {
  const tone = phase === 'dawn' ? T.dawn : phase === 'dusk' ? T.dusk : T.flame;
  // la fonte di luce piccola, in alto a destra, dietro la nuvola (pioggia e temporale)
  const peek = () => tf(phase === 'night' ? moon() : sun(tone), 0.56, 10.3, 0.3);
  if (w === 'rain' || w === 'storm') return [...peek(), ...tf(cloud(-1), 1, -0.6, 0), ...(w === 'storm' ? [...drops(1), ...bolt()] : drops(3))];
  if (phase === 'night') {
    if (w === 'fog') return [...tf(moon(), 0.78, 2.4, -0.6), ...fogBars(16.6)];
    return [...moon(), ...star(19.4, 4.6, 2.2), ...star(20.6, 14.6, 1.5)];
  }
  if (phase === 'day') return w === 'fog' ? [...tf(sun(), 0.74, 3.1, -0.8), ...fogBars(16.6)] : sun();
  // alba e tramonto: il mezzo sole sull'orizzonte; con la nebbia l'orizzonte è di foschia
  return w === 'fog' ? [...halfSun(tone, 12.6), ...fogBars(15.2)] : sunset(tone);
}
for (const ph of ['dawn', 'day', 'dusk', 'night'] as const) for (const w of ['clear', 'fog', 'rain', 'storm'] as const) ICONS[`sky-${ph}-${w}`] = () => sky(ph, w);

const polysOf = (name: string): Poly[] => (ICONS[name] ?? ICONS.wisp)();
export const hasLpIcon = (name: string) => name in ICONS;

const fmt = (n: number) => Math.round(n * 100) / 100;
const urls = new Map<string, string>();

/** Data-URI dell'icona (SVG di poligoni; ogni poligono ha il bordo del suo colore per chiudere le fessure). */
export function lpIconUrl(name: string): string {
  let u = urls.get(name);
  if (u) return u;
  const body = polysOf(name).map((p) => `<polygon points="${p.pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ')}" fill="${p.fill}" stroke="${p.fill}" stroke-width="0.25" stroke-linejoin="round"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;
  u = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  urls.set(name, u);
  return u;
}

/** La stessa icona disegnata su un canvas 2D (segnalini nella scena). */
export function drawLpIcon(g: CanvasRenderingContext2D, name: string, x: number, y: number, size: number) {
  const k = size / 24;
  g.save();
  g.lineJoin = 'round';
  g.lineWidth = 0.25 * k;
  for (const p of polysOf(name)) {
    g.beginPath();
    p.pts.forEach(([px, py], i) => (i ? g.lineTo(x + px * k, y + py * k) : g.moveTo(x + px * k, y + py * k)));
    g.closePath();
    g.fillStyle = p.fill;
    g.strokeStyle = p.fill;
    g.fill();
    g.stroke();
  }
  g.restore();
}

/** L'icona come immagine PNG (per le notifiche, dove serve un'immagine vera), con un po' di margine. */
export function lpIconPng(name: string, size = 112): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) return '';
  drawLpIcon(g, name, size * 0.06, size * 0.06, size * 0.88);
  return c.toDataURL('image/png');
}
