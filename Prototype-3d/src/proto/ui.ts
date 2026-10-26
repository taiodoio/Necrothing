// Anteprima (non nel gioco): design system «Lumini» e schermate d'esempio
// della UI più legata al tema (HUD di legno, modali incorniciati con le
// testate 3D del gioco, Bottega, Inventario, dettaglio bloccato, scheda della
// tomba, albero dei ricordi col cartellino che si gira). Miniature, ritratti
// e testate sono quelli veri del gioco; i dati sono d'esempio.
// ?s=ds | hud | inv | shop | lock | grave | tree | flip0 | flip1 | flip2

import '@fontsource/cinzel/700.css';
import '@fontsource/grenze-gotisch/600.css';
import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '../styles/main.css';
import '../styles/ui-next.css';
import '../styles/ui-play.css';
import '../styles/ui-house.css';
import './ds.css';
import '../render/lowpoly/index.ts';
import { setUiNext, setUiPlay } from '../app/uiNext.ts';
import { CATALOG } from '../game/catalog.ts';
import { DEFAULT_LOOK } from '../game/look.ts';
import { createNewGame, type EntrustedMemory } from '../game/state.ts';
import { icon } from '../ui/icons.ts';
import { memoryTags } from '../ui/memoryTags.ts';
import { fruitImg } from '../ui/memoryTree.ts';
import { npcPortrait } from '../ui/npcPortraits.ts';
import { registryHeader } from '../ui/registryHeader.ts';
import { shopHeader } from '../ui/shopHeader.ts';
import { treeHeader } from '../ui/treeHeader.ts';
import { graveThumb, placeableThumb } from '../ui/thumbs.ts';
const nightUrl = new URL('./ui-assets/scene-night.jpg', import.meta.url).href;

setUiNext(true);
setUiPlay(true);
document.documentElement.dataset.theme = 'dark';
const screen = new URLSearchParams(location.search).get('s') ?? 'ds';
const root = document.getElementById('tavola')!;
document.body.style.margin = '0';
document.body.style.background = '#120e16';

// ── Ornamenti (SVG): edera agli angoli, candela accesa, foglie ─────────

const LEAF = ['#4f6e45', '#5f8150', '#6f9358', '#405d3a'];
function ivy(cls: string, seed = 1): string {
  // un tralcio che segue l'angolo, con foglie a cuore alternate
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const leaves: string[] = [];
  const path = 'M86,10 C52,8 18,14 12,46 C8,66 10,80 12,92';
  const along: Array<[number, number, number]> = [[78, 10, 200], [64, 9, 160], [50, 12, 215], [36, 18, 150], [24, 28, 200], [16, 42, 120], [12, 56, 170], [11, 70, 110], [12, 84, 160]];
  for (const [x, y, ang] of along) {
    const size = 7 + rnd() * 5, side = rnd() < 0.5 ? -1 : 1, a = ang + side * (25 + rnd() * 25);
    const c = LEAF[Math.floor(rnd() * LEAF.length)];
    leaves.push(`<g transform="translate(${x} ${y}) rotate(${a.toFixed(0)})"><path d="M0,0 C${size * 0.4},${-size * 0.7} ${size * 1.3},${-size * 0.6} ${size * 1.6},0 C${size * 1.3},${size * 0.6} ${size * 0.4},${size * 0.7} 0,0Z" fill="${c}"/><path d="M1,0 L${(size * 1.3).toFixed(1)},0" stroke="rgba(20,30,15,.35)" stroke-width=".8"/></g>`);
  }
  const berries = [[30, 20], [17, 60], [58, 13]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#a8323e"/>`).join('');
  return `<svg class="ds-ivy ${cls}" viewBox="0 0 96 96"><path d="${path}" fill="none" stroke="#4a3a24" stroke-width="2.4" stroke-linecap="round"/>${leaves.join('')}${berries}</svg>`;
}
/** Candela di cera con le colature e la fiamma che tremola. */
function candle(x: string, y: string, h = 46): string {
  return `<svg class="ds-candle" style="${x};${y};width:${h * 0.62}px;height:${h * 1.45}px" viewBox="0 0 30 70">
    <defs><radialGradient id="cg" cx="50%" cy="40%" r="50%"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".45" stop-color="#ffc35e" stop-opacity=".45"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient></defs>
    <circle cx="15" cy="18" r="15" fill="url(#cg)"><animate attributeName="r" values="14;16;13.5;15;14" dur="1.6s" repeatCount="indefinite"/></circle>
    <path d="M15,8 C18,13 18.5,17 15,22 C11.5,17 12,13 15,8Z" fill="#ffe08a"><animateTransform attributeName="transform" type="rotate" values="-3 15 22;3 15 22;-2 15 22" dur="1.3s" repeatCount="indefinite"/></path>
    <path d="M15,13 C16.4,16 16.4,18 15,20.5 C13.6,18 13.6,16 15,13Z" fill="#fff8e0"/>
    <rect x="14.3" y="21" width="1.4" height="4" fill="#3a2a1c"/>
    <path d="M8,25 h14 v38 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2Z" fill="#efe2c4"/><path d="M8,25 h14 v6 c-2,0 -2,7 -4,7 s-1,-5 -3,-5 s-2,9 -4,9 s-1,-8 -3,-8Z" fill="#fff6e2"/>
    <path d="M18,25 h4 v38 a2 2 0 0 1 -2 2 h-2Z" fill="#d9c7a0" opacity=".7"/>
    <ellipse cx="15" cy="65" rx="11" ry="3" fill="#6b4e33"/>
  </svg>`;
}

// ── Dati d'esempio ─────────────────────────────────────────────────────

const now = new Date();
const s = createNewGame(now, 717);
const thumb = (type: string) => placeableThumb(type, 'lowpoly', 0);
const wispIcon = (n = 14) => icon('wisp', n).outerHTML;

const frag = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
const phone = (bg: string, dim = true) => {
  const el = frag(`<div class="ds" style="position:relative;width:390px;height:844px;overflow:hidden;background:#120e16 url(${bg}) center/cover"></div>`);
  if (dim) el.append(frag('<div class="ds-scrim"></div>'));
  root.append(el);
  return el;
};
/** Il modale con la cornice, l'edera e la candela; `hero` è la testata 3D del gioco. */
function modal(host: HTMLElement, title: string, hero: HTMLElement | null, opts: { balance?: number; center?: boolean } = {}) {
  const m = frag(`<div class="ds-modal${opts.center ? ' center' : ''}">
    ${ivy('tl', 3)}${ivy('br', 7)}
    ${hero ? '<div class="ds-hero"></div>' : ''}
    <div class="ds-plaque wood nails${hero ? '' : ' flat'}" ${hero ? '' : 'style="margin-top:14px"'}>${title}<i class="n2"></i></div>
    <div class="ds-close wood">${icon('close', 20).outerHTML}</div>
    ${opts.balance !== undefined ? `<div class="ds-balance">${wispIcon(16)}${opts.balance}</div>` : ''}
    <div class="body"></div>
  </div>`);
  if (hero) m.querySelector('.ds-hero')!.append(hero);
  host.append(m);
  return m.querySelector('.body') as HTMLElement;
}
const tile = (type: string, sub: string, o: { sel?: boolean; badge?: number; locked?: boolean; price?: boolean } = {}) => `
  <div class="ds-tile${o.sel ? ' sel' : ''}${o.locked ? ' locked' : ''}">
    ${o.badge ? `<span class="ds-badge">${o.badge}</span>` : ''}${o.locked ? `<span class="ds-lockchip">${icon('lock', 16).outerHTML}</span>` : ''}
    <div class="thumb"><img src="${thumb(type)}" alt=""></div>
    <b>${CATALOG[type].label}</b>
    <small class="${o.price ? 'price' : ''}">${sub}</small>
  </div>`;
const tabs = (items: Array<[string, string]>, on = 0) => `<div class="ds-tabs">${items.map(([ic, label], i) => `<div class="ds-tab${i === on ? ' on' : ''}">${icon(ic, 22).outerHTML}${i === on ? label : ''}</div>`).join('')}</div>`;

// ── Schermate ──────────────────────────────────────────────────────────

function hud() {
  const p = phone(nightUrl, false);
  const face = npcPortrait('custode', DEFAULT_LOOK);
  p.append(frag(`<div class="ds-hud">
    <div class="ds-player wood nails"><i class="n2"></i>
      <div class="face"><img src="${face}" alt=""><span class="lvl">5</span></div>
      <div><div class="name">Custode</div><div class="meta"><div class="xp"><i></i></div><span class="ds-price">${wispIcon(15)}2.965</span></div></div>
      <span class="deco">${icon('pumpkin', 30).outerHTML}</span>
    </div>
    <div class="ds-sign"><div class="ropes"></div><div class="board wood nails"><b>00:05</b>${icon('sky-night-clear', 30).outerHTML}</div></div>
    <div class="ds-round big" style="left:14px;bottom:118px">${icon('coffin', 34).outerHTML}</div>
    <div class="ds-round" style="left:20px;bottom:36px">${icon('menu', 28).outerHTML}</div>
    <div class="ds-round" style="right:20px;bottom:36px">${icon('target', 28).outerHTML}</div>
    <div class="ds-round" style="right:20px;bottom:118px">${icon('bike', 30).outerHTML}</div>
  </div>`));
  // la notifica dei personaggi nello stesso materiale: tavola di legno, ritratto che esce dal bordo
  const crow = npcPortrait('crow');
  p.append(frag(`<div style="position:absolute;left:10px;right:10px;top:104px;height:70px;border-radius:14px;padding:9px 40px 8px 68px" class="wood nails"><i class="n2"></i>
    <img src="${crow}" style="position:absolute;left:4px;bottom:2px;width:58px" alt="">
    <div style="display:flex;align-items:center;gap:8px"><b style="font:700 19px var(--f-display);color:var(--gold-100)">Cra! Cra!</b><span class="t-label" style="font-size:10px;color:var(--parch-200)">Corvo</span><span class="ds-pill" style="padding:2px 8px 2px 5px">${wispIcon(12)}+1</span></div>
    <div class="t-body" style="font-size:13.5px;color:var(--parch-100);margin-top:3px">Il corvo lascia cadere un fuoco fatuo.</div>
    <span style="position:absolute;right:10px;top:10px">${icon('close', 16).outerHTML}</span>
  </div>`));
}

function inventory() {
  const p = phone(nightUrl);
  const body = modal(p, 'Inventario', registryHeader({ settled: true }).el);
  const items: Array<[string, string, object?]> = [['path_stone', '93 posati', { badge: 2, sel: true }], ['fence_iron', 'in magazzino', { badge: 5 }], ['arch_stone', '1 posato'],
    ['lamp_post_gothic', '2 posati', { badge: 1 }], ['well', '1 posato'], ['memory_tree', '1 posato'], ['pet_house_rabbit', '1 posato'], ['vase', '3 posati', { badge: 3 }], ['brain_farm', '1 posato']];
  body.innerHTML = `${tabs([['bag', 'Tutto'], ['lightOn', ''], ['flower', ''], ['fence', ''], ['tree', '']])}
    <div class="ds-grid">${items.map(([t, sub, o]) => tile(t, sub, o as object)).join('')}</div>
    <div class="ds-dock"><div class="mini recess"><img src="${thumb('path_stone')}" alt=""></div>
      <h3>Sentiero in pietra</h3><p class="t-muted">Un classico. Resiste al tempo (e ai fantasmi). · Ne hai 2</p>
      <div class="actions"><button class="ds-btn ghost" style="flex-direction:column;gap:2px;min-width:96px"><span>Vendi</span><small class="ds-price">+4${wispIcon(12)}</small></button><button class="ds-btn">${icon('edit', 22).outerHTML}Posiziona</button></div>
    </div>`;
}

function shop() {
  const p = phone(nightUrl);
  const body = modal(p, 'Bottega', shopHeader().el, { balance: 2965 });
  const items: Array<[string, number, object?]> = [['candle_tree', 24, { sel: true }], ['pet_house_rabbit', 80], ['fence_wood', 2], ['arch_lights', 60], ['fountain', 150, { locked: true }], ['angel_statue', 200, { locked: true }],
    ['spectral_tree', 90], ['lovers_bench', 120, { locked: true }], ['urn', 30]];
  body.innerHTML = `${tabs([['shop', 'Tutto'], ['lightOn', ''], ['flower', ''], ['fence', ''], ['house', '']])}
    <div class="ds-grid">${items.map(([t, c, o]) => tile(t, `${wispIcon(13)}${c}`, { price: true, ...(o ?? {}) })).join('')}</div>
    <div class="ds-dock">${candle('position:absolute;left:-18px;top:-62px', '', 40)}<div class="mini recess"><img src="${thumb('candle_tree')}" alt=""></div>
      <h3>Albero con candele</h3><p class="t-muted">Luci · ne puoi comprare 3<br>Un albero morto che ha deciso di fare luce sugli altri.</p>
      <div class="actions" style="grid-template-columns:1fr"><button class="ds-btn">Acquista <span class="gain">${wispIcon(14)}24</span></button></div>
    </div>`;
}

function locked() {
  const p = phone(nightUrl);
  const host = frag('<div style="position:absolute;inset:0"></div>');
  p.append(host);
  const m = frag(`<div class="ds-modal center" style="padding-bottom:16px">
    ${ivy('tl', 5)}${ivy('br', 2)}${candle('left:-14px;top:150px', '', 44)}
    <div class="ds-close wood" style="top:14px;right:14px">${icon('close', 20).outerHTML}</div>
    <div style="height:210px;display:grid;place-items:center;background:radial-gradient(closest-side, rgba(255,196,96,.28), rgba(255,196,96,0));margin-top:6px"><img src="${thumb('candle_tree')}" style="width:220px;height:220px;object-fit:contain" alt=""></div>
    <div style="text-align:center;padding:0 18px;display:grid;gap:6px">
      <h1>Albero con candele</h1><div class="t-muted">Luci · ne puoi comprare 3</div>
      <div class="t-body" style="color:var(--parch-200)">Un albero morto che ha deciso di fare luce sugli altri.</div>
    </div>
    <div class="ds-lock recess" style="margin:14px 16px 0">
      <div class="t-label" style="display:flex;gap:8px;align-items:center">${icon('lock', 16).outerHTML}Per sbloccarlo</div>
      <div class="row">${icon('trophy', 20).outerHTML}<span>Si sblocca al rango 4, «Tristo Mietitore Quotidiano».</span></div>
      <div class="row">${icon('skull', 20).outerHTML}<span>Sei al rango 3: mancano 1451 punti Necro.</span></div>
      <div class="ds-progress"><i style="width:64%"></i></div>
      <div class="legend"><span>2549 / 4000</span><span>1451 mancanti</span></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:10px;margin:16px 16px 0"><button class="ds-btn wood">Chiudi</button><button class="ds-btn off" style="font-size:16px">Serve il rango 4</button></div>
  </div>`);
  host.append(m);
}

function grave() {
  const p = phone(nightUrl);
  const g = s.graves.find((x) => x.legacy)!;
  const m = frag(`<div class="ds-modal" style="inset:56px 10px 12px">
    ${ivy('tl', 4)}${ivy('br', 9)}
    <div class="ds-close wood">${icon('close', 20).outerHTML}</div>
    <div style="position:relative;height:230px;margin:10px 10px 0;border-radius:14px;overflow:hidden;border:2px solid var(--wood-800);background:radial-gradient(70% 70% at 50% 60%, #3a2d44, #1a1420);box-shadow:inset 0 0 26px rgba(10,6,12,.8)">
      <img src="${graveThumb(g.graveType, 'lowpoly', 'flowers', 1)}" style="position:absolute;left:50%;top:50%;width:236px;translate:-50% -50%" alt="">
      ${candle('left:46px;top:118px', '', 34)}${candle('right:52px;top:96px', '', 30)}
    </div>
    <div class="body" style="overflow:hidden;gap:8px;padding-top:10px">
      <div style="text-align:center;display:grid;gap:6px;justify-items:center">
        <h1>${g.name}</h1>
        <span class="ds-pill">${icon('book', 15).outerHTML}Lascito del vecchio custode</span>
        <div class="t-epitaph">“${g.epitaph}”</div>
      </div>
      <div class="ds-facts">
        <div><span class="ico">${icon('house', 18).outerHTML}</span><span>Categoria</span><b>Casalinghi</b></div>
        <div><span class="ico">${icon('calendar', 18).outerHTML}</span><span>Vissuto</span><b>Morto il 22 giu 2025</b></div>
        <div><span class="ico">${icon('skull', 18).outerHTML}</span><span>Causa</span><b>Caduta fatale</b></div>
        <div><span class="ico">${icon('bury', 18).outerHTML}</span><span>Lapide</span><b>Lapide gotica</b></div>
        <div><span class="ico">${icon('flower', 18).outerHTML}</span><span>Stato</span><b>Ricordata con fiori</b></div>
      </div>
      <div class="divider">${icon('pumpkin', 16).outerHTML}</div>
      <div class="t-label">Cronologia</div>
      <div class="ds-log">
        <div>${icon('flower', 18).outerHTML}<span>Fiori</span><time>25 ott 2026</time></div>
        <div>${icon('ghost', 18).outerHTML}<span>Apparizione</span><time>23 ott 2026</time></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:10px;padding:12px 14px 14px"><button class="ds-btn ghost" style="width:58px;padding:0">${icon('more', 24).outerHTML}</button><button class="ds-btn">${icon('flower', 22).outerHTML}Rinnova fiori</button></div>
  </div>`);
  p.append(m);
}

function memories(): EntrustedMemory[] {
  return s.graves.slice(0, 5).map((g, i) => ({ grave: g, entrustedAt: new Date(now.getTime() - (i + 1) * 3 * 864e5).toISOString(), ghostVisits: [0, 2, 1, 0, 0][i] }));
}

function tree(flip = -1) {
  const p = phone(nightUrl);
  const list = memories();
  const body = modal(p, 'Albero dei ricordi', treeHeader(list.length).el);
  body.style.overflow = 'hidden';
  body.append(frag(`<div class="t-muted" style="text-align:center">${list.length} ricordi affidati · uno per ogni frutto acceso</div>`));
  const tags = memoryTags(list, fruitImg(), () => undefined);
  tags.style.marginTop = '-4px';
  body.append(tags);
  if (flip < 0) return;
  // il cartellino toccato si stacca dal ramo, si avvicina e si gira: dietro, la sua storia
  const e = list[1], g = e.grave;
  p.append(frag('<div class="ds-scrim" style="z-index:19;background:rgba(10,6,12,.72)"></div>'));
  const angle = [0, 92, 180][flip];
  p.append(frag(`<div class="ds-flip"><div class="card3d" style="transform:rotateY(${angle}deg)${flip === 0 ? ' scale(.96)' : ''}">
    <div class="face front parch"><span class="string"></span><span class="hole"></span>
      <img src="${fruitImg()}" style="width:150px;height:150px;margin-top:22px;filter:drop-shadow(0 0 12px rgba(240,170,60,.7))" alt="">
      <div class="name">${g.name}</div>
      <div class="sub">Elettronica · affidato il 20 ott 2026</div>
      <div class="ds-pill" style="background:rgba(58,42,28,.1);box-shadow:none;color:#8a5a18">${icon('ghost', 14).outerHTML}È tornato 2 volte</div>
      <div style="font:italic 700 15px var(--f-body);color:var(--ink-soft);margin-top:10px">“${g.epitaph}”</div>
      <div style="margin-top:auto;font:800 12px var(--f-body);color:var(--ink-soft);display:flex;gap:6px;align-items:center">${icon('variant', 14).outerHTML}Tocca per girarlo</div>
    </div>
    <div class="face back parch"><span class="string"></span><span class="hole"></span>
      <div style="text-align:center;display:grid;gap:4px;justify-items:center;margin-top:6px">
        <div class="name" style="font-size:26px">${g.name}</div>
        <div style="font:italic 700 14px var(--f-body);color:var(--ink-soft)">“${g.epitaph}”</div>
        <span class="ds-pill" style="background:rgba(201,147,64,.18);box-shadow:none;color:#7a4d12">${icon('tree', 14).outerHTML}Sull’albero dal 20 ott 2026</span>
      </div>
      <dl class="kv" style="margin:8px 0 0">
        <dt>Categoria</dt><dd>Elettronica</dd><dt>Vissuto</dt><dd>Morto il 2 giu 2025</dd><dt>Causa</dt><dd>Tradimento della batteria</dd>
        <dt>Lapide</dt><dd>Croce celtica (fino al 20 ott)</dd><dt>Apparizioni</dt><dd>Il suo fantasma è passato 2 volte</dd>
      </dl>
      <div class="log" style="margin-top:6px">
        <div>${icon('ghost', 16).outerHTML}<span>Apparizione vicino all’albero</span><time>25 ott</time></div>
        <div>${icon('tree', 16).outerHTML}<span>Affidato all’albero</span><time>20 ott</time></div>
        <div>${icon('coffin', 16).outerHTML}<span>Sepoltura</span><time>3 set</time></div>
      </div>
      <div style="margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <span class="tagbtn dark">${icon('postcard', 18).outerHTML}Cartolina</span><span class="tagbtn free">${icon('shovel', 18).outerHTML}Libera</span>
      </div>
    </div>
  </div></div>`));
}

function sheet() {
  root.style.width = '1180px';
  // il CSS del gioco blocca lo scorrimento della pagina: qui serve tutta l'altezza
  for (const el of [document.documentElement, document.body]) Object.assign(el.style, { height: 'auto', overflow: 'visible', position: 'static' });
  const sw = (name: string, v: string) => `<div class="sw"><i style="background:${v}"></i>${name}<br>${v}</div>`;
  root.append(frag(`<div class="ds ds-sheet">
    <div><h1 style="font-size:44px">Lumini · design system di Necrothing</h1>
      <p class="note">La UI come oggetti del cimitero: tavole di legno coi chiodi per tutto ciò che si tocca, notte color prugna per i fondi, oro delle candele per le azioni e i titoli, pergamena per i cartellini e le cose scritte a mano, edera agli angoli dei modali. Un solo arrotondamento per livello (6 · 10 · 14 · 20), ombre profonde e calde, niente grigi freddi.</p></div>
    <section><h2>Colori</h2>
      <div class="row">${sw('Notte', '#120e16')}${sw('Prugna 900', '#1a1420')}${sw('Prugna 800 · fondo', '#231b2a')}${sw('Prugna 700 · pannello', '#2d2436')}${sw('Prugna 600 · riquadro', '#3a2f46')}${sw('Prugna 500', '#4b3e59')}</div>
      <div class="row">${sw('Legno 800', '#332115')}${sw('Legno 700 · bordo', '#4a2f1d')}${sw('Legno 600', '#613f27')}${sw('Legno 500', '#7a5233')}${sw('Legno chiaro', '#a97b4e')}${sw('Pergamena', '#ecdbb5')}${sw('Inchiostro', '#3a2a1c')}</div>
      <div class="row">${sw('Oro 200 · titoli', '#ffe2a8')}${sw('Oro 300 · azione', '#f2c66d')}${sw('Oro 500', '#c99340')}${sw('Spettrale · fuochi fatui', '#9ff0d6')}${sw('Brace', '#ff9a5a')}${sw('Pericolo', '#ff8a75')}${sw('Foglia', '#7da35a')}${sw('Testo', '#f3ecdf')}${sw('Testo tenue', '#b5a998')}</div>
    </section>
    <section><h2>Caratteri</h2>
      <div class="row" style="gap:40px;align-items:flex-end">
        <div><h1 style="font-size:40px">Grenze Gotisch</h1><div class="t-muted">Titoli, nomi dei defunti e degli oggetti · 40 / 30 / 26 / 22</div></div>
        <div><div class="t-label" style="font-size:18px">Cinzel maiuscolo</div><div class="t-muted">Etichette di sezione, piccole · 12–14, spaziatura 0.14em</div></div>
        <div><div class="t-body" style="font-size:18px;font-weight:800">Nunito 800 / 600</div><div class="t-muted">Testo, numeri, pulsanti · 18 / 15 / 13</div></div>
        <div><div class="t-epitaph" style="font-size:18px">“Si è rovesciato per l’ultima volta.”</div><div class="t-muted">Epitaffi · Nunito corsivo, pergamena</div></div>
      </div>
    </section>
    <section><h2>Materiali e cornici</h2>
      <div class="row" style="gap:20px">
        <div class="wood nails" style="width:220px;height:90px;border-radius:14px;display:grid;place-items:center"><i class="n2"></i><span class="t-label" style="color:var(--parch-100);text-align:center">Legno<br>coi chiodi</span></div>
        <div class="recess" style="width:220px;height:90px;display:grid;place-items:center"><span class="t-muted">Incavo (campi, barre, tab)</span></div>
        <div class="parch" style="width:180px;height:90px;border-radius:8px 8px 18px 18px;display:grid;place-items:center;font:700 22px var(--f-display)">Pergamena</div>
        <div style="position:relative;width:240px;height:140px;border-radius:20px;background:var(--plum-800);border:3px solid var(--wood-700);box-shadow:inset 0 0 0 1.5px rgba(242,198,109,.35),inset 0 0 0 5px rgba(0,0,0,.25)">${ivy('tl', 3)}${ivy('br', 7)}<span class="t-muted" style="position:absolute;left:58px;top:58px">Cornice dei modali</span></div>
        <div style="position:relative;width:60px;height:110px">${candle('left:8px;top:0', '', 48)}</div>
        <div class="ds-plaque wood nails flat"><i class="n2"></i>Targa del titolo</div>
      </div>
    </section>
    <section><h2>Pulsanti</h2>
      <div class="row">
        <button class="ds-btn">${icon('flower', 22).outerHTML}Azione principale</button>
        <button class="ds-btn">Acquista <span class="gain">${wispIcon(14)}24</span></button>
        <button class="ds-btn wood">Secondario di legno</button>
        <button class="ds-btn ghost" style="flex-direction:column;gap:2px;min-width:96px"><span>Vendi</span><small class="ds-price">+4${wispIcon(12)}</small></button>
        <button class="ds-btn off" style="font-size:16px">Serve il rango 4</button>
        <span class="ds-iconbtn wood">${icon('close', 20).outerHTML}</span>
        <span class="ds-round" style="position:relative">${icon('menu', 26).outerHTML}</span>
      </div>
    </section>
    <section><h2>Schede, riquadri, pillole</h2>
      <div style="width:360px">${tabs([['bag', 'Tutto'], ['lightOn', ''], ['flower', ''], ['fence', ''], ['tree', '']])}</div>
      <div class="ds-grid" style="width:360px">${tile('lamp_post_gothic', `${wispIcon(13)}30`, { price: true })}${tile('candle_tree', `${wispIcon(13)}24`, { price: true, sel: true })}${tile('angel_statue', `${wispIcon(13)}200`, { price: true, locked: true })}</div>
      <div class="row"><span class="ds-pill">${icon('bury', 15).outerHTML}Riposa nel cimitero</span><span class="ds-pill gold">${icon('tree', 15).outerHTML}Sull’albero dei ricordi</span><span class="ds-price">${wispIcon(16)}2.965</span><span class="ds-badge" style="position:relative;top:0;right:0;width:26px">3</span><div class="ds-progress" style="width:220px"><i style="width:64%"></i></div></div>
    </section>
    <section><h2>Regole</h2>
      <p class="note">• Tutti i pannelli sono modali con la cornice: quasi a tutta pagina quelli con elenchi (Bottega, Inventario, Registro, Albero), con la testata 3D dentro una cornice e la targa del titolo a cavallo; centrati i dettagli e le conferme.<br>
      • Un’azione principale per schermata, in oro; le altre di legno o «fantasma».<br>
      • Le icone sono quelle low-poly del gioco; le miniature 3D poggiano su un’ombra ellittica.<br>
      • Ornamenti (edera, candele, zucche) solo agli angoli e mai sopra i testi; si possono esportare in PNG per Capacitor.<br>
      • Pergamena solo per ciò che è «scritto a mano»: cartellini dell’albero, cartolina, epitaffi.</p>
    </section>
  </div>`));
}

const SCREENS: Record<string, () => void> = { ds: sheet, hud, inv: inventory, shop, lock: locked, grave, tree: () => tree(), flip0: () => tree(0), flip1: () => tree(1), flip2: () => tree(2) };
(SCREENS[screen] ?? sheet)();
