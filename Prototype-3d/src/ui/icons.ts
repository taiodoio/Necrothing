// Icone pixel-art 12×12 disegnate a mano con la palette del gioco, convertite
// in SVG (rettangoli a bordi netti): restano nitide a qualsiasi scala e si
// sposano con i voxel della scena. Nessun file esterno, nessuna emoji.

const PAL: Record<string, string> = {
  k: '#0d0b0a', // contorno
  d: '#3a3f4a', // ardesia
  s: '#6b6f74', // pietra
  S: '#a9a49a', // pietra chiara
  w: '#e8dfcc', // carta/osso
  g: '#a8813f', // oro scuro
  G: '#f1d39c', // oro chiaro
  b: '#5a3d28', // legno
  B: '#8a6849', // legno chiaro
  r: '#b5544c', // rosso
  R: '#e08a6a', // rosso chiaro
  c: '#4fae98', // spettrale
  C: '#bff3e2', // spettrale chiaro
  l: '#4d6b3a', // foglia
  L: '#7a9a4f', // foglia chiara
  y: '#ffcf6e', // fiamma
  o: '#c8691f', // arancio
  p: '#7d6aa0', // viola
};

const ICONS: Record<string, string[]> = {
  bury: [
    '....kkkk....',
    '...kBBBBk...',
    '..kBbbbbBk..',
    '.kBbbGGbbBk.',
    '.kBbbGGbbBk.',
    '.kBbGGGGbBk.',
    '..kBbGGbBk..',
    '..kBbGGbBk..',
    '..kBbbbbBk..',
    '...kBbbBk...',
    '...kBBBBk...',
    '....kkkk....',
  ],
  edit: [
    '..........kk',
    '.........krk',
    '........kRrk',
    '.......kGgk.',
    '......kGgk..',
    '.....kGgk...',
    '....kGgk....',
    '...kGgk.....',
    '..kwwk......',
    '..kwk.......',
    '.kkk........',
    '............',
  ],
  bag: [
    '....kkkk....',
    '...kb..bk...',
    '...k....k...',
    '.kkkkkkkkkk.',
    'kBBBBBBBBBBk',
    'kBbbbbbbbbBk',
    'kBbbkGGkbbBk',
    'kBbbkGgkbbBk',
    'kBbbbkkbbbBk',
    'kBbbbbbbbbBk',
    'kBBBBBBBBBBk',
    '.kkkkkkkkkk.',
  ],
  shop: [
    '.....kk.....',
    '....kddk....',
    '...kddddk.k.',
    '..kddddddkdk',
    '.kddddddddk.',
    'kkkkkkkkkkkk',
    'krwrwrwrwrwk',
    'kkkkkkkkkkkk',
    '.kbykkkbybk.',
    '.kbykbkbybk.',
    '.kbbkbkbbbk.',
    '.kkkkkkkkkk.',
  ],
  photo: [
    '............',
    '...kkkk.....',
    '.kkkddddkkk.',
    'kSSSSSSSSSyk',
    'kssskkkksssk',
    'ksskcCCckssk',
    'ksskccCckssk',
    'ksskcccckssk',
    'kssskkkksssk',
    'kddddddddddk',
    '.kkkkkkkkkk.',
    '............',
  ],
  gallery: [
    '............',
    'kkkkkkkkkkkk',
    'kgGGGGGGGGgk',
    'kGkkkkkkkkGk',
    'kGkddddyykGk',
    'kGkddddyykGk',
    'kGkdLLLddkGk',
    'kGkLLLLLlkGk',
    'kGkllllllkGk',
    'kGkkkkkkkkGk',
    'kgGGGGGGGGgk',
    'kkkkkkkkkkkk',
  ],
  gear: [
    '.....kk.....',
    '..k.kSSk.k..',
    '.kSkSSSSkSk.',
    '..kSSssSSk..',
    '.kSSskksSSk.',
    'kSSskddksSSk',
    'kSSskddksSSk',
    '.kSSskksSSk.',
    '..kSSssSSk..',
    '.kSkSSSSkSk.',
    '..k.kSSk.k..',
    '.....kk.....',
  ],
  top: [
    '............',
    '.kkkkkkkkkk.',
    '.kLLkLLkLLk.',
    '.kLLkLLkLLk.',
    '.kkkkkkkkkk.',
    '.kLLkSSkLLk.',
    '.kLLkSSkLLk.',
    '.kkkkkkkkkk.',
    '.kLLkLLkLLk.',
    '.kLLkLLkLLk.',
    '.kkkkkkkkkk.',
    '............',
  ],
  angled: [
    '.....kk.....',
    '...kkLLkk...',
    '.kkLLLLLLkk.',
    'kLLLLLLLLLLk',
    'kbkkLLLLkkBk',
    'kbbbkkkkBBBk',
    'kbbbbkBBBBBk',
    'kbbbbkBBBBBk',
    'kbbbbkBBBBBk',
    '.kkbbkBBBkk.',
    '...kkkBkk...',
    '.....kk.....',
  ],
  target: [
    '.....kk.....',
    '...kkGGkk...',
    '..kGk..kGk..',
    '.kGk....kGk.',
    '.kk..kk..kk.',
    'kG..kGGk..Gk',
    'kG..kGGk..Gk',
    '.kk..kk..kk.',
    '.kGk....kGk.',
    '..kGk..kGk..',
    '...kkGGkk...',
    '.....kk.....',
  ],
  close: [
    '............',
    '.kk......kk.',
    '.kGk....kGk.',
    '..kGk..kGk..',
    '...kGkkGk...',
    '....kGGk....',
    '....kGGk....',
    '...kGkkGk...',
    '..kGk..kGk..',
    '.kGk....kGk.',
    '.kk......kk.',
    '............',
  ],
  wisp: [
    '.....k......',
    '....kCk.....',
    '....kCck....',
    '...kCCck....',
    '...kCCcck...',
    '..kCCwCcck..',
    '..kCwwCcck..',
    '.kCCwwCCcck.',
    '.kcCCCCCcck.',
    '.kccCCCccck.',
    '..kcccccck..',
    '...kkkkkk...',
  ],
  keeper: [
    '............',
    '....kkkk....',
    '...kddddk...',
    '...kddddk...',
    '.kkkggggkkk.',
    'kddddddddddk',
    '.kkkkkkkkkk.',
    '...kwwwwk...',
    '...kkwwkk...',
    '...kwwwwk...',
    '..kbbbbbbk..',
    '.kbbbbbbbbk.',
  ],
  sun: [
    '.....yy.....',
    '.y...yy...y.',
    '..y......y..',
    '....kkkk....',
    '...kyyyyk...',
    'yy.kyGGyk.yy',
    'yy.kyGyyk.yy',
    '...kyyyyk...',
    '....kkkk....',
    '..y......y..',
    '.y...yy...y.',
    '.....yy.....',
  ],
  moon: [
    '....kkkk....',
    '..kkSSSk....',
    '.kSSSkk.....',
    '.kSSk.......',
    'kSSk......y.',
    'kSSk........',
    'kSSk...y....',
    'kSSSk.......',
    '.kSSSk....k.',
    '.kSSSSkkkSk.',
    '..kkSSSSSk..',
    '....kkkkk...',
  ],
  dusk: [
    '............',
    '............',
    '.....oo.....',
    '..o..oo..o..',
    '....kkkk....',
    '...kooook...',
    '..kooyyook..',
    'kkkkkkkkkkkk',
    '..dddddddd..',
    '............',
    '...dddddd...',
    '............',
  ],
  rain: [
    '............',
    '....kkkk....',
    '..kkSSSSk...',
    '.kSSSSSSSkk.',
    'kSSSSSSSSSSk',
    'kSSSSSSSSSSk',
    '.kkkkkkkkkk.',
    '..c..c..c...',
    '.c..c..c....',
    '............',
    '..c..c..c...',
    '.c..c..c....',
  ],
  fog: [
    '............',
    '............',
    '.SSSSSSS....',
    '............',
    '...SSSSSSSS.',
    '............',
    '.SSSSSSSSS..',
    '............',
    '....SSSSSSS.',
    '............',
    '..SSSSSS....',
    '............',
  ],
  search: [
    '............',
    '..kkkk......',
    '.kCCCCk.....',
    'kCwCCCCk....',
    'kCCCCCCk....',
    'kCCCCCCk....',
    '.kCCCCk.....',
    '..kkkkbk....',
    '......kbk...',
    '.......kbk..',
    '........kbk.',
    '.........kk.',
  ],
  shovel: [
    '....kkkk....',
    '....kbbk....',
    '.....kk.....',
    '.....Bk.....',
    '.....Bk.....',
    '.....Bk.....',
    '...kkkkkk...',
    '...kSSSSk...',
    '...kSSSSk...',
    '...kSSSSk...',
    '....kSSk....',
    '.....kk.....',
  ],
  check: [
    '............',
    '..........kk',
    '.........kLk',
    '........kLk.',
    '.......kLk..',
    '.kk...kLk...',
    '.kLk.kLk....',
    '..kLkLk.....',
    '...kLk......',
    '....k.......',
    '............',
    '............',
  ],
  hammer: [
    '............',
    '..kkkkkkk...',
    '.kSSSSSSSk..',
    '.kSSSSSSSk..',
    '..kkkBkkk...',
    '....kBk.....',
    '....kBk.....',
    '....kBk.....',
    '....kBk.....',
    '....kBk.....',
    '....kbk.....',
    '.....k......',
  ],
  broom: [
    '.........kk.',
    '........kBk.',
    '.......kBk..',
    '......kBk...',
    '.....kBk....',
    '...kkgk.....',
    '..kGGGk.....',
    '.kGgGgGk....',
    'kGgGgGk.....',
    'kgGgGk......',
    '.kgGk.......',
    '..kk........',
  ],
  flower: [
    '............',
    '....kkk.....',
    '...kRrRk....',
    '..kRrGrRk...',
    '..krGyGrk...',
    '..kRrGrRk...',
    '...kRrRk....',
    '....klk.....',
    '..kLklkLk...',
    '...kLlLk....',
    '....klk.....',
    '.....k......',
  ],
  variant: [
    '............',
    '...kkkkk....',
    '..kGGGGGk.k.',
    '.kGk...kGkGk',
    '.kGk....kGGk',
    '..k....kGGGk',
    'kGGGk....k..',
    'kGGk....kGk.',
    'kGkGk...kGk.',
    '.k.kGGGGGk..',
    '....kkkkk...',
    '............',
  ],
  lightOn: [
    '.....kk.....',
    '....kddk....',
    '...kkkkkk...',
    '...kyyyyk...',
    '...kyGGyk...',
    '...kyGGyk...',
    '...kyyyyk...',
    '...kkkkkk...',
    '....kddk....',
    '............',
    '............',
    '............',
  ],
  trophy: [
    '..kkkkkkkk..',
    'kkGGGGGGGGkk',
    'kgkGGGGGGkgk',
    'kgkGGGGGGkgk',
    '.kkgGGGGgkk.',
    '...kgGGgk...',
    '....kggk....',
    '....kgk.....',
    '....kgk.....',
    '...kgggk....',
    '..kggggggk..',
    '..kkkkkkkk..',
  ],
  lock: [
    '............',
    '....kkkk....',
    '...kSSSSk...',
    '...kSkkSk...',
    '...kSkkSk...',
    '..kkkkkkkk..',
    '..kGGGGGGk..',
    '..kGgkkgGk..',
    '..kGgkkgGk..',
    '..kGGggGGk..',
    '..kkkkkkkk..',
    '............',
  ],
  fence: [
    '............',
    '.k...k...k..',
    'kGk.kGk.kGk.',
    'kdk.kdk.kdk.',
    'kdkkkdkkkdkk',
    'kdddddddddd.',
    'kdkkkdkkkdkk',
    'kdk.kdk.kdk.',
    'kdk.kdk.kdk.',
    'kdkkkdkkkdkk',
    'kSSSSSSSSSSk',
    'kkkkkkkkkkkk',
  ],
};
// varianti per sostituzione di palette
ICONS.lightOff = ICONS.lightOn.map((r) => r.replace(/y/g, 's').replace(/G/g, 'd'));
ICONS.dawn = ICONS.dusk.map((r) => r.replace(/o/g, 'R'));
ICONS.ghost = ICONS.wisp.map((r) => r.replace(/c/g, 'S').replace(/C/g, 'w'));

export type IconName = keyof typeof ICONS;

const urls = new Map<string, string>();

/** Data-URI SVG dell'icona (righe fuse in rettangoli per pixel adiacenti). */
export function iconUrl(name: string): string {
  let u = urls.get(name);
  if (u) return u;
  const rows = ICONS[name] ?? ICONS.wisp;
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      if (ch === '.' || !PAL[ch]) { x++; continue; }
      let w = 1;
      while (row[x + w] === ch) w++;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${PAL[ch]}"/>`;
      x += w;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" shape-rendering="crispEdges">${rects}</svg>`;
  u = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  urls.set(name, u);
  return u;
}

/** Disegna l'icona su un canvas 2D (badge nel mondo 3D). */
export function drawIcon(g: CanvasRenderingContext2D, name: string, x: number, y: number, size: number) {
  const rows = ICONS[name] ?? ICONS.wisp;
  const px = size / 12;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = PAL[row[i]];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(Math.round(x + i * px), Math.round(y + j * px), Math.ceil(px), Math.ceil(px));
    }
  });
}

/** Elemento icona (dimensione via CSS: --s). */
export function icon(name: string, size?: number): HTMLElement {
  const el = document.createElement('i');
  el.className = 'pxi';
  el.setAttribute('aria-hidden', 'true');
  el.style.backgroundImage = iconUrl(name);
  if (size) el.style.setProperty('--s', `${size}px`);
  return el;
}

/** Popola tutti gli elementi statici con `data-icon`. */
export function hydrateIcons(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-icon]')) {
    el.classList.add('pxi');
    el.setAttribute('aria-hidden', 'true');
    el.style.backgroundImage = iconUrl(el.dataset.icon!);
  }
}

/** Icone degli achievement (per id). */
export const ACH_ICONS: Record<string, string> = {
  first_burial: 'bury', five_graves: 'bury', ten_graves: 'bury', twentyfive_graves: 'bury',
  abstract_grief: 'wisp', variety_5: 'variant', all_categories: 'variant',
  florist: 'flower', green_thumb: 'flower', gardener_master: 'flower',
  caretaker: 'broom', caretaker_silver: 'broom', fixer: 'hammer',
  haunted: 'ghost', ghost_whisperer: 'ghost', socialite: 'keeper', decorator: 'variant',
  spender: 'wisp', photographer: 'photo', mausoleum_built: 'shop',
  district_gothic: 'gallery', district_natural: 'gallery', district_tech: 'gallery', master_planner: 'top',
  expansion: 'fence', rank_3: 'shovel', rank_5: 'trophy',
};

/** Frame 9×9 a "gradino" per border-image (fill = interno del pannello). */
function frame(outer: string, border: string, fill: string, hi?: string): string {
  const rows = [
    '..kkkkk..',
    '.kbbbbbk.',
    'kbhhhhhbk',
    'kbfffffbk',
    'kbfffffbk',
    'kbfffffbk',
    'kbfffffbk',
    '.kbbbbbk.',
    '..kkkkk..',
  ];
  const pal: Record<string, string> = { k: outer, b: border, f: fill, h: hi ?? fill };
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let w = 1;
      while (row[x + w] === ch) w++;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${pal[ch]}"/>`;
      x += w;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Imposta le variabili CSS delle cornici pixel. */
export function installFrames() {
  const r = document.documentElement.style;
  r.setProperty('--frame', frame('#07080b', '#5b4a2e', 'rgba(20,22,29,0.94)', 'rgba(52,48,40,0.94)'));
  r.setProperty('--frame-solid', frame('#07080b', '#5b4a2e', '#161920', '#2a2a2a'));
  r.setProperty('--frame-gold', frame('#07080b', '#d8b26a', 'rgba(38,31,20,0.96)', 'rgba(86,66,34,0.96)'));
  r.setProperty('--frame-slot', frame('#07080b', '#4a4f5a', '#1d2129', '#2b303a'));
  r.setProperty('--frame-btn', frame('#07080b', '#f1d39c', '#b38a45', '#e0bd78'));
  r.setProperty('--frame-input', frame('#07080b', '#3a3f49', '#0f1218', '#0f1218'));
  r.setProperty('--frame-danger', frame('#07080b', '#a8473b', 'rgba(36,20,20,0.94)', 'rgba(70,32,30,0.94)'));
}
