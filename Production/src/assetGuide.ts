// La guida agli asset (asset-guide.html): come si disegnano icone, medaglie,
// oggetti 3D e personaggi nello stile del gioco. I campioni escono dagli stessi
// generatori del gioco (icone, medaglie, modelli, anteprime, ritratti, rig),
// così la guida non può invecchiare. I testi stanno nella pagina; qui solo i
// campioni e i numeri misurati sui modelli veri.

import '@fontsource/grenze-gotisch/600.css';
import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles/main.css';
import './styles/ui-next.css';
import './styles/ui-play.css';
import './styles/design-system.css';
import './styles/asset-guide.css';
import * as THREE from 'three';
import './render/lowpoly/index.ts';
import { ACH_ICONS, hydrateIcons, icon } from './ui/icons.ts';
import { lpBadgeUrl, lpIconPolys, LP_LIGHT, LP_TONES, type BadgeTier } from './ui/lpIcons.ts';
import { monoIcon } from './ui/monoIcons.ts';
import { npcPortrait, wispPortrait } from './ui/npcPortraits.ts';
import { installPlayDecor } from './ui/playDecor.ts';
import { previewUrl } from './ui/previews.ts';
import { renderItemPreview } from './render/bake.ts';
import { getModel } from './render/modelCache.ts';
import { placeableKey } from './render/keys.ts';
import { GRASS, GRASS_DRY, LPC } from './render/lowpoly/palette.ts';
import { V2_SPECS } from './render/lowpoly/v2/npc.ts';
import { buildRig, type CharacterKind } from './view/characters.ts';
import { ACHIEVEMENTS } from './game/progression.ts';
import { CATALOG } from './game/catalog.ts';
import { GRAVE_TYPES } from './game/graves.ts';
import { PROFILES } from './app/AutoQuality.ts';

document.documentElement.dataset.quality = 'high';
installPlayDecor();

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};
const all = <T extends Element = HTMLElement>(sel: string) => [...document.querySelectorAll<T & HTMLElement>(sel)] as Array<T & HTMLElement>;
const fig = (media: Node, caption: string, code = false) => {
  const f = el('figure');
  f.append(media);
  if (code) { const c = el('code', undefined, caption); f.append(c); } else f.append(caption);
  return f;
};
/** Un lavoro pesante (3D) alla volta, senza bloccare la pagina. */
const queue: Array<() => void> = [];
const pump = () => { const job = queue.shift(); if (job) { job(); setTimeout(pump, 0); } };
const later = (job: () => void) => { queue.push(job); if (queue.length === 1) setTimeout(pump, 60); };

// ── Icone colorate ──────────────────────────────────────────────────────

/** L'icona come SVG di poligoni; `facets` mostra le facce e la griglia 24×24. */
function iconSvg(name: string, facets: boolean): SVGSVGElement {
  const s = svgEl('svg', { viewBox: '0 0 24 24' }) as SVGSVGElement;
  if (facets) for (let i = 0; i <= 24; i += 2) {
    const strong = i % 12 === 0 ? 0.22 : 0.08;
    s.append(svgEl('line', { x1: i, y1: 0, x2: i, y2: 24, stroke: `rgba(255,255,255,${strong})`, 'stroke-width': 0.05 }));
    s.append(svgEl('line', { x1: 0, y1: i, x2: 24, y2: i, stroke: `rgba(255,255,255,${strong})`, 'stroke-width': 0.05 }));
  }
  for (const p of lpIconPolys(name)) {
    s.append(svgEl('polygon', {
      points: p.pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '), fill: p.fill,
      stroke: facets ? 'rgba(18,14,26,0.9)' : p.fill, 'stroke-width': facets ? 0.1 : 0.25, 'stroke-linejoin': 'round',
    }));
  }
  return s;
}

/** La freccia della luce (da in alto a sinistra), sopra l'icona. */
function lightArrow(): SVGSVGElement {
  const s = svgEl('svg', { viewBox: '0 0 24 24' }) as SVGSVGElement;
  const [lx, ly] = LP_LIGHT;
  // LP_LIGHT punta verso la luce: la freccia parte da lì e va verso l'icona
  const x0 = 12 + lx * 13, y0 = 12 + ly * 13, x1 = 12 + lx * 8.5, y1 = 12 + ly * 8.5;
  s.append(svgEl('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#ffe9b8', 'stroke-width': 0.5, 'stroke-linecap': 'round' }));
  const a = Math.atan2(y1 - y0, x1 - x0), h = 1.4;
  s.append(svgEl('polygon', { points: [[x1, y1], [x1 - Math.cos(a - 0.5) * h, y1 - Math.sin(a - 0.5) * h], [x1 - Math.cos(a + 0.5) * h, y1 - Math.sin(a + 0.5) * h]].map((q) => q.join(',')).join(' '), fill: '#ffe9b8' }));
  return s;
}

for (const box of all('[data-anatomy]')) {
  const name = box.dataset.anatomy!;
  const [plain, faces, light] = (box.dataset.labels ?? '').split('|');
  box.append(fig(iconSvg(name, false), plain));
  box.append(fig(iconSvg(name, true), faces));
  const lit = el('div', 'light');
  lit.append(iconSvg(name, false), lightArrow());
  box.append(fig(lit, light));
}

const tones = document.getElementById('lp-tones');
if (tones) for (const [name, t] of Object.entries(LP_TONES)) {
  const row = el('div', 'ag-tone');
  const chips = el('span');
  for (const c of t) { const i = el('i'); i.style.background = c; i.title = c; chips.append(i); }
  row.append(chips, el('b', undefined, `T.${name}`));
  tones.append(row);
}

for (const box of all('[data-sizes]')) {
  for (const n of [14, 18, 24, 32, 48]) box.append(fig(icon(box.dataset.sizes!, n), `${n}px`));
}

// icone monocromatiche (data-mono) e medaglie (data-badge="icona:grado"), come nel design system
hydrateIcons();
for (const e of all('[data-mono]')) e.replaceWith(monoIcon(e.dataset.mono!, Number(e.dataset.size ?? 24)));
for (const e of all<HTMLImageElement>('[data-badge]')) {
  const [name, tier] = e.dataset.badge!.split(':');
  e.src = lpBadgeUrl(name, tier as BadgeTier | 'locked');
}

// i traguardi: icona, grado e obiettivo veri
const ach = document.querySelector('#ach-table tbody');
if (ach) for (const a of ACHIEVEMENTS) {
  const tr = el('tr');
  const img = el('img');
  img.src = lpBadgeUrl(ACH_ICONS[a.id] ?? 'trophy', a.tier);
  img.alt = '';
  const td = (c: Node | string, cls?: string) => { const d = el('td', cls); d.append(c); return d; };
  tr.append(td(el('code', undefined, a.id)), td(img), td(el('code', undefined, ACH_ICONS[a.id] ?? 'trophy')), td(a.tier), td(String(a.goal), 'num'));
  ach.append(tr);
}

// ── Palette 3D ──────────────────────────────────────────────────────────

const sw = (name: string, colors: readonly string[]) => {
  const d = el('div', colors.length > 1 ? 'ds-sw multi' : 'ds-sw');
  const i = el('i');
  if (colors.length > 1) for (const c of colors) { const s = el('span'); s.style.background = c; i.append(s); } else i.style.background = colors[0];
  const b = el('b', undefined, name);
  const c = el('code', undefined, colors.length > 1 ? `${colors.length}` : colors[0]);
  const w = el('div');
  w.append(b, c);
  d.append(i, w);
  return d;
};
const pal = document.getElementById('lpc-swatches');
if (pal) {
  for (const [k, v] of Object.entries(LPC)) pal.append(sw(`LPC.${k}`, typeof v === 'string' ? [v] : v));
  pal.append(sw('GRASS', GRASS), sw('GRASS_DRY', GRASS_DRY));
}

// ── Oggetti 3D: stati, varianti, misure ────────────────────────────────

const vis = (type: string, variant = 0) => ({ type, variant, seed: 1, dirty: false, broken: false, lit: true });
const placeholder = () => el('div', 'wait', '…');

for (const box of all('[data-states]')) {
  const type = box.dataset.states!;
  const labels = (box.dataset.labels ?? '').split('|');
  const states = [{}, { lit: false }, { dirty: true }, { broken: true }];
  states.forEach((st, i) => {
    const wait = placeholder();
    box.append(fig(wait, labels[i] ?? ''));
    later(() => { const img = el('img'); img.src = renderItemPreview(type, 240, st); img.alt = ''; wait.replaceWith(img); });
  });
}

for (const box of all('[data-previews]')) {
  const ids = box.dataset.previews === 'graves' ? GRAVE_TYPES.map((g) => `grave-${g}`) : box.dataset.previews!.split(',');
  for (const id of ids) {
    const img = el('img');
    img.src = previewUrl(id) ?? '';
    img.alt = '';
    img.loading = 'lazy';
    box.append(fig(img, id, true));
  }
}

const tris = (key: string) => {
  const m = getModel(key);
  let n = 0;
  const buckets: string[] = [];
  for (const [b, g] of Object.entries(m.geometries)) if (g) { n += g.getAttribute('position').count / 3; buckets.push(b); }
  return { tris: Math.round(n), buckets, lights: m.lights.length, height: m.height };
};
const measures = document.querySelector<HTMLElement>('#tri-table tbody');
if (measures) later(() => {
  for (const id of (measures.dataset.ids ?? '').split(',')) {
    const def = CATALOG[id];
    if (!def) continue;
    const m = tris(placeableKey(vis(id)));
    const tr = el('tr');
    const cell = (s: string, cls?: string) => el('td', cls, s);
    const c0 = el('td'); c0.append(el('code', undefined, id));
    tr.append(c0, cell(def.footprint.join('×'), 'num'), cell(m.height.toFixed(2), 'num'), cell(m.tris.toLocaleString('it-IT'), 'num'), cell(String(m.lights), 'num'), cell(m.buckets.join(' ')));
    measures.append(tr);
  }
});

// ── Personaggi: rig, altezze, ritratti ─────────────────────────────────

function studio() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#e9eff0', '#3b342a', 1.3));
  const key = new THREE.DirectionalLight('#fff0da', 2.4); key.position.set(-1.6, 2.6, 2.4);
  const rim = new THREE.DirectionalLight('#bcd2ff', 1.3); rim.position.set(1.9, 1.7, -2.3);
  scene.add(key, rim);
  return scene;
}

/** Il personaggio di fronte, con i perni delle parti del rig segnati. */
function rigFront(kind: CharacterKind, W = 240, H = 320): HTMLCanvasElement {
  const out = el('canvas');
  out.width = W * 2; out.height = H * 2;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  try {
    r.setPixelRatio(2); r.setSize(W, H, false);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    r.setClearColor(0x000000, 0);
    const scene = studio();
    const rig = buildRig(kind);
    scene.add(rig.root);
    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig.root);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const h = size.y * 1.12, w = (h * W) / H;
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.05, 40);
    cam.position.set(c.x, c.y, c.z + 10); cam.lookAt(c.x, c.y, c.z); cam.updateMatrixWorld(true);
    r.render(scene, cam);
    const g = out.getContext('2d')!;
    g.drawImage(r.domElement, 0, 0, out.width, out.height);
    g.font = '800 22px Nunito, sans-serif';
    g.lineWidth = 5;
    const v = new THREE.Vector3();
    for (const [name, part] of Object.entries(rig.parts)) {
      if (!part) continue;
      part.getWorldPosition(v).project(cam);
      const x = ((v.x + 1) / 2) * out.width, y = ((1 - v.y) / 2) * out.height;
      g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2);
      g.fillStyle = '#ffd56b'; g.strokeStyle = '#1a1422'; g.stroke(); g.fill();
      const side = name.endsWith('L') ? -1 : name.endsWith('R') ? 1 : 0;
      g.textAlign = side < 0 ? 'right' : 'left';
      // testa sopra, gambe sotto (verso l'esterno), busto a destra: le etichette non si coprono
      const leg = name.startsWith('leg');
      const tx = side < 0 ? x - 14 : x + 14, ty = name === 'head' ? y - 16 : leg ? y + 32 : name === 'body' ? y - 14 : y + 7;
      g.strokeText(name, tx, ty); g.fillStyle = '#fff3c4'; g.fillText(name, tx, ty);
    }
    scene.remove(rig.root);
  } catch { /* senza WebGL resta vuoto */ }
  r.dispose(); r.forceContextLoss();
  return out;
}
const rigBox = document.getElementById('rig-front');
if (rigBox) later(() => rigBox.prepend(rigFront((rigBox.dataset.kind ?? 'custode') as CharacterKind)));

const heights = document.querySelector<HTMLElement>('#height-table tbody');
if (heights) later(() => {
  for (const kind of (heights.dataset.kinds ?? '').split(',') as CharacterKind[]) {
    const rig = buildRig(kind);
    rig.root.updateMatrixWorld(true);
    const s = new THREE.Box3().setFromObject(rig.root).getSize(new THREE.Vector3());
    const spec = V2_SPECS[kind];
    const tr = el('tr');
    const c0 = el('td'); c0.append(el('code', undefined, kind));
    tr.append(c0, el('td', 'num', s.y.toFixed(2)), el('td', 'num', Math.max(s.x, s.z).toFixed(2)), el('td', undefined, [spec.ghost && 'ghost', spec.quadruped && 'quadruped', spec.flier && 'flier', spec.hover ? `hover ${spec.hover}` : ''].filter(Boolean).join(' ') || '—'));
    heights.append(tr);
  }
});

const portraits = document.getElementById('npc-portraits');
if (portraits) {
  const kinds = Object.keys(V2_SPECS) as CharacterKind[];
  for (const kind of kinds) {
    const wait = placeholder();
    portraits.append(fig(wait, kind, true));
    later(() => { const img = el('img'); img.src = npcPortrait(kind); img.alt = ''; wait.replaceWith(img); });
  }
  const wait = placeholder();
  portraits.append(fig(wait, 'wisp', true));
  later(() => { const img = el('img'); img.src = wispPortrait(); img.alt = ''; wait.replaceWith(img); });
}

// ── Qualità: cosa cambia per livello ───────────────────────────────────

const quality = document.querySelector('#quality-table tbody');
if (quality) {
  const yes = (b: boolean) => (b ? '✓' : '—');
  for (const tier of ['low', 'medium', 'high'] as const) {
    const p = PROFILES[tier];
    const tr = el('tr');
    const c0 = el('td'); c0.append(el('code', undefined, tier));
    tr.append(c0, el('td', undefined, yes(p.liteMaterials)), el('td', undefined, yes(p.fakeLights)), el('td', undefined, p.shadows), el('td', undefined, yes(p.lite)), el('td', undefined, p.presences), el('td', 'num', String(p.fps)));
    quality.append(tr);
  }
}
