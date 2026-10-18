// Pagina di misura (bench.html): il gioco vero su un cimitero pieno generato
// al volo, senza leggere né scrivere il salvataggio. Una serie di prove da
// qualche secondo ciascuna, con la camera che gira piano sul cimitero, e per
// ognuna FPS medi, frame lenti, draw call e triangoli. Alla fine una tabella
// da copiare.

import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/jacquard-24/400.css';
import './styles/main.css';
import * as THREE from 'three';
import { Game } from './app/Game.ts';
import { setPersistence } from './app/persistence.ts';
import { fullCemetery } from './game/fullCemetery.ts';
import { areaForLevel } from './game/world.ts';
import { cellCenter } from './view/WorldView.ts';
import type { QualitySetting } from './game/state.ts';

setPersistence(false);

interface Inner {
  renderer: THREE.WebGLRenderer;
  rig: { follow: THREE.Vector3 | null; viewHeight: number; setView(h: number): void; jumpTo(p: THREE.Vector3): void; snap?(): void };
  atmosphere: { setLightBudget(n: number | null): void };
  actors: { group?: THREE.Object3D; stats(): { roamers: number; presences: number } };
}

interface Variant { id: string; label: string; night: boolean; quality: QualitySetting; shadows?: boolean; blur?: boolean; lights?: boolean; actors?: boolean; view?: number }
const VARIANTS: Variant[] = [
  { id: 'A', label: 'Notte · Alta · tutto', night: true, quality: 'high' },
  { id: 'B', label: 'Notte · Alta · senza ombre', night: true, quality: 'high', shadows: false },
  { id: 'C', label: 'Notte · Alta · senza sfocatura', night: true, quality: 'high', blur: false },
  { id: 'D', label: 'Notte · Alta · senza luci', night: true, quality: 'high', lights: false },
  { id: 'E', label: 'Notte · Alta · senza personaggi', night: true, quality: 'high', actors: false },
  { id: 'F', label: 'Notte · Alta · zoom lontano', night: true, quality: 'high', view: 30 },
  { id: 'G', label: 'Giorno · Alta · tutto', night: false, quality: 'high' },
  { id: 'H', label: 'Notte · Bassa · tutto', night: true, quality: 'low' },
];
const WARM = 3000, MEASURE = 10000;

const panel = document.getElementById('bench')!;
const style = document.createElement('style');
style.textContent = `
  .bench { position: fixed; z-index: 50; left: 8px; right: 8px; top: calc(8px + env(safe-area-inset-top)); max-height: 70vh; overflow: auto;
    background: rgba(10,12,16,0.92); color: #e8dcc4; font: 13px/1.35 system-ui, sans-serif; padding: 10px 12px; border: 2px solid #d8b26a; }
  .bench h1 { margin: 0 0 6px; font: 600 16px system-ui, sans-serif; color: #f1d39c; }
  .bench button { font: 600 15px system-ui, sans-serif; padding: 10px 14px; margin: 6px 6px 0 0; background: #d8b26a; color: #1a140b; border: 0; }
  .bench button.ghost { background: #2a2e36; color: #e8dcc4; }
  .bench table { border-collapse: collapse; width: 100%; margin-top: 6px; font-size: 12px; }
  .bench td, .bench th { padding: 3px 4px; border-bottom: 1px solid #333; text-align: right; }
  .bench td:first-child, .bench th:first-child { text-align: left; }
  .bench .muted { color: #9a8f7c; }
  .bench.min { max-height: none; bottom: auto; }
`;
document.head.append(style);
const say = (html: string) => { panel.innerHTML = html; };

say('<h1>Misura delle prestazioni</h1><p>Preparo il cimitero pieno…</p>');

const t0 = performance.now();
const state = fullCemetery(4242, new Date());
state.settings.quality = 'high';
state.settings.edgeBlur = true;
state.settings.timeOverride = 'night';
state.settings.shopTutorialDone = true; // niente benvenuto sopra alla scena
const genMs = performance.now() - t0;
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const t1 = performance.now();
const game = new Game(canvas, { state, prewarm: false });
const buildMs = performance.now() - t1;
(window as unknown as { necro: Game }).necro = game;
game.start();
const inner = game as unknown as Inner;

// dispositivo
const gl = inner.renderer.getContext();
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
const gpu = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER));
const device = {
  ua: navigator.userAgent, gpu, dpr: window.devicePixelRatio,
  screen: `${window.innerWidth}×${window.innerHeight}`,
  canvas: `${canvas.width}×${canvas.height}`,
  cores: navigator.hardwareConcurrency ?? '?', memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? '?',
};

const area = areaForLevel(state.world.expansionLevel);
const center = cellCenter(area.x + area.w / 2, area.y + area.h / 2, [1, 1]);
const actorsGroup = (): THREE.Object3D | null => {
  const g = inner.actors.group;
  if (g) return g;
  // ripiego: il gruppo che contiene il rig del Custode
  let found: THREE.Object3D | null = null;
  game.scene.traverse((o) => { if (!found && o.name === 'actors') found = o; });
  return found;
};

function apply(v: Variant) {
  game.setQuality(v.quality);
  game.setTimeOverride(v.night ? 'night' : 'day');
  game.setEdgeBlur(v.blur !== false);
  inner.renderer.shadowMap.enabled = v.shadows !== false;
  inner.atmosphere.setLightBudget(v.lights === false ? 0 : null);
  const ag = actorsGroup();
  if (ag) ag.visible = v.actors !== false;
  inner.rig.follow = null;
  inner.rig.setView(v.view ?? 18);
}

interface Result { v: Variant; fps: number; median: number; p95: number; worst: number; slow: number; calls: number; tris: number; frames: number }

function run(v: Variant): Promise<Result> {
  apply(v);
  return new Promise((resolve) => {
    const start = performance.now();
    let last = start;
    const dts: number[] = [];
    let calls = 0, tris = 0, n = 0;
    const frame = (now: number) => {
      const el = now - start;
      // la camera gira piano sul cimitero (così si misura anche quello che entra e esce dalla vista)
      const a = (el / 20000) * Math.PI * 2;
      inner.rig.jumpTo(center.clone().add(new THREE.Vector3(Math.cos(a) * 9, 0, Math.sin(a) * 9)));
      if (el > WARM) {
        dts.push(now - last);
        const info = inner.renderer.info.render;
        calls += info.calls; tris += info.triangles; n++;
      }
      last = now;
      if (el < WARM + MEASURE) { requestAnimationFrame(frame); return; }
      const s = [...dts].sort((x, y) => x - y);
      const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
      const total = dts.reduce((x, y) => x + y, 0);
      resolve({ v, frames: dts.length, fps: (dts.length / total) * 1000, median: q(0.5), p95: q(0.95), worst: s[s.length - 1], slow: dts.filter((d) => d > 33.4).length, calls: Math.round(calls / Math.max(1, n)), tris: Math.round(tris / Math.max(1, n)) });
    };
    requestAnimationFrame(frame);
  });
}

const fmt = (x: number, d = 1) => x.toFixed(d);
function table(rs: Result[]) {
  return `<table><tr><th></th><th>FPS</th><th>ms 95%</th><th>&gt;33ms</th><th>draw</th><th>tri</th></tr>${rs.map((r) => `<tr><td>${r.v.id}</td><td>${fmt(r.fps)}</td><td>${fmt(r.p95)}</td><td>${r.slow}</td><td>${r.calls}</td><td>${(r.tris / 1000).toFixed(0)}k</td></tr>`).join('')}</table>
    <p class="muted" style="margin:6px 0 0">${VARIANTS.map((v) => `<b>${v.id}</b> ${v.label}`).join(' · ')}</p>`;
}
function text(rs: Result[]) {
  const st = inner.actors.stats();
  return [
    'NECROTHING · misura prestazioni',
    `GPU: ${device.gpu}`,
    `UA: ${device.ua}`,
    `schermo ${device.screen} · dpr ${device.dpr} · canvas ${device.canvas} · core ${device.cores} · mem ${device.memory}`,
    `scena: ${state.graves.length} tombe · ${state.placeables.length} oggetti · presenze ${st.roamers}+${st.presences}`,
    `generazione ${fmt(genMs, 0)} ms · costruzione scena ${fmt(buildMs, 0)} ms`,
    '',
    'prova | FPS | ms mediano | ms 95% | peggiore | frame >33ms | draw call | triangoli',
    ...rs.map((r) => `${r.v.id} ${r.v.label} | ${fmt(r.fps)} | ${fmt(r.median)} | ${fmt(r.p95)} | ${fmt(r.worst, 0)} | ${r.slow}/${r.frames} | ${r.calls} | ${r.tris}`),
  ].join('\n');
}

function intro() {
  const st = inner.actors.stats();
  panel.classList.remove('min');
  say(`<h1>Misura delle prestazioni</h1>
    <p>Cimitero pieno: <b>${state.graves.length}</b> tombe, <b>${state.placeables.length}</b> oggetti, presenze ${st.roamers}+${st.presences}.
    Generato in ${fmt(genMs, 0)} ms, scena costruita in ${fmt(buildMs, 0)} ms.</p>
    <p class="muted">${VARIANTS.length} prove da ${(WARM + MEASURE) / 1000} s (circa ${Math.round(VARIANTS.length * (WARM + MEASURE) / 1000 / 60 * 10) / 10} minuti). Tieni il telefono fermo, schermo acceso, niente altre app. Il tuo salvataggio non viene toccato.</p>
    <button id="go">Avvia</button>`);
  document.getElementById('go')!.onclick = start;
}

async function start() {
  const rs: Result[] = [];
  panel.classList.add('min');
  for (const [i, v] of VARIANTS.entries()) {
    say(`<h1>Misura ${i + 1}/${VARIANTS.length}</h1><p>${v.label}</p>${rs.length ? table(rs) : ''}`);
    rs.push(await run(v));
  }
  apply(VARIANTS[0]);
  const out = text(rs);
  panel.classList.remove('min');
  say(`<h1>Fatto</h1>${table(rs)}<p class="muted">GPU: ${device.gpu} · schermo ${device.screen} · dpr ${device.dpr}</p>
    <button id="copy">Copia risultati</button><button class="ghost" id="again">Ripeti</button>
    <pre class="muted" style="white-space:pre-wrap;font-size:11px">${out.replace(/</g, '&lt;')}</pre>`);
  document.getElementById('copy')!.onclick = async () => {
    try { await navigator.clipboard.writeText(out); (document.getElementById('copy') as HTMLButtonElement).textContent = 'Copiato ✓'; }
    catch { (document.getElementById('copy') as HTMLButtonElement).textContent = 'Seleziona il testo qui sotto'; }
  };
  document.getElementById('again')!.onclick = start;
  (window as unknown as { benchResult: string }).benchResult = out;
}

// si parte quando la scena ha disegnato qualche frame
setTimeout(intro, 1500);
if (new URLSearchParams(location.search).has('auto')) setTimeout(start, 2500);
