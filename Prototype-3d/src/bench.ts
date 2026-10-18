// Pagina di misura (bench.html): il gioco vero su un cimitero pieno generato
// al volo, senza leggere né scrivere il salvataggio. Si sceglie uno dei tre
// profili che poi la qualità Auto userà da sola in base al telefono
// (Leggera, Media, Piena) e le opzioni per la batteria (30 FPS, rallenta da
// fermo); si può girare nel cimitero con le statistiche dal vivo, oppure
// lanciare il test automatico che misura tutto e prepara i risultati da
// copiare. Gli shader dei tre profili si preparano all'inizio, così cambiare
// profilo non blocca il frame.

import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/jacquard-24/400.css';
import './styles/main.css';
import * as THREE from 'three';
import { Game } from './app/Game.ts';
import { setPersistence } from './app/persistence.ts';
import { setLiteMaterials } from './render/modelCache.ts';
import type { Quality, SaveData } from './game/state.ts';
import { fullCemetery } from './game/fullCemetery.ts';
import { areaForLevel } from './game/world.ts';
import { cellCenter } from './view/WorldView.ts';
import { setFlatTerrain } from './view/terrain.ts';

setPersistence(false);
// terreno piatto nel recinto: le colline confondono la lettura e sporcano le ombre (solo qui, non nel gioco)
setFlatTerrain(true);

interface Inner {
  renderer: THREE.WebGLRenderer;
  rig: { follow: THREE.Vector3 | null; camera: THREE.Camera; setView(h: number): void; jumpTo(p: THREE.Vector3): void };
  atmosphere: { setLightBudget(n: number | null): void; setFakeLights(on: boolean): void };
  actors: { setBlobShadows(on: boolean): void };
  world: { setLite(on: boolean, state: SaveData): void; setMergeStatic(on: boolean): void; setStyle(style: SaveData['settings']['style'], state: SaveData, force: boolean): void; staticShadows: boolean };
  postfx: { setSamples(n: number): void };
  tick(): void;
  resize(): void;
}

/** I tre profili che la qualità Auto sceglierà da sola in base al telefono. */
interface Profile {
  id: string; label: string; note: string; quality: Quality;
  /** Mondo con meno triangoli, luci finte a terra, materiale semplice (Lambert). */
  lite: boolean; fake: boolean; liteMat: boolean;
  /** Ombre: niente (disco sotto i piedi), ferme (ridisegnate solo se cambia la vista) o vive. */
  shadows: 'off' | 'still' | 'live';
  /** Tetto alla risoluzione e campioni di antialiasing della sfocatura. */
  dpr: number; msaa: number;
}
const PROFILES: Profile[] = [
  { id: 'light', label: 'Leggera', note: 'telefoni deboli', quality: 'medium', lite: true, fake: true, liteMat: true, shadows: 'off', dpr: 1, msaa: 0 },
  { id: 'medium', label: 'Media', note: 'telefoni medi', quality: 'medium', lite: false, fake: true, liteMat: true, shadows: 'still', dpr: 1.5, msaa: 2 },
  { id: 'full', label: 'Piena', note: 'telefoni forti', quality: 'high', lite: false, fake: false, liteMat: false, shadows: 'live', dpr: 2, msaa: 4 },
];
/** Frame al secondo da fermo (sotto i menù ne bastano ancora meno: lo decide il gioco). */
const IDLE_FPS = 15;

const panel = document.getElementById('bench')!;
const style = document.createElement('style');
style.textContent = `
  .bench { position: fixed; z-index: 50; left: 8px; right: 8px; top: calc(8px + env(safe-area-inset-top)); max-height: 72vh; overflow: auto;
    background: rgba(10,12,16,0.93); color: #e8dcc4; font: 13px/1.35 system-ui, sans-serif; padding: 10px 12px; border: 2px solid #d8b26a; }
  .bench.mini { left: 8px; right: auto; top: auto; bottom: calc(96px + env(safe-area-inset-bottom)); padding: 6px 8px; }
  .bench h1 { margin: 0 0 6px; font: 600 16px system-ui, sans-serif; color: #f1d39c; }
  .bench button { font: 600 14px system-ui, sans-serif; padding: 9px 12px; margin: 6px 6px 0 0; background: #2a2e36; color: #e8dcc4; border: 0; }
  .bench button.on, .bench button.cta { background: #d8b26a; color: #1a140b; }
  .bench button small { font-weight: 400; opacity: 0.8; }
  .bench .live { font: 600 13px ui-monospace, monospace; color: #f1d39c; margin: 8px 0 0; }
  .bench table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 12px; }
  .bench td, .bench th { padding: 3px 4px; border-bottom: 1px solid #333; text-align: right; }
  .bench td:first-child, .bench th:first-child { text-align: left; }
  .bench .muted { color: #9a8f7c; }
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
// antialiasing dello schermo spento: lo decide la sfocatura (col suo MSAA, come nel gioco)
const game = new Game(canvas, { state, prewarm: false, antialias: false });
const buildMs = performance.now() - t1;
(window as unknown as { necro: Game }).necro = game;
const inner = game as unknown as Inner;

// il loop del gioco, cronometrato: il tempo speso a preparare e mandare i frame
// (sul telefono è la cosa più vicina alla batteria che una pagina possa misurare)
let work = 0;
inner.renderer.setAnimationLoop(() => { const s = performance.now(); inner.tick(); work += performance.now() - s; });

// dispositivo
const gl = inner.renderer.getContext();
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
const gpu = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER));
const device = {
  ua: navigator.userAgent, gpu, dpr: window.devicePixelRatio,
  screen: `${window.innerWidth}×${window.innerHeight}`,
  cores: navigator.hardwareConcurrency ?? '?', memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? '?',
};

const area = areaForLevel(state.world.expansionLevel);
const center = cellCenter(area.x + area.w / 2, area.y + area.h / 2, [1, 1]);

// ── Profili e batteria ──────────────────────────────────────────────────

let profile = PROFILES[2];
let cap30 = false, idle = false;

function applyProfile(p: Profile) {
  profile = p;
  game.setQuality(p.quality);
  game.setTimeOverride('night');
  inner.world.setLite(p.lite, state); // rifà erba e bosco se cambia
  inner.world.setMergeStatic(true); // oggetti fermi fusi per zona, come in Auto
  const still = p.shadows === 'still';
  if (inner.world.staticShadows !== still) { inner.world.staticShadows = still; inner.world.setStyle(state.settings.style, state, true); }
  inner.actors.setBlobShadows(p.shadows !== 'live');
  inner.renderer.shadowMap.enabled = p.shadows !== 'off';
  inner.renderer.shadowMap.autoUpdate = p.shadows === 'live';
  inner.renderer.shadowMap.needsUpdate = true;
  inner.atmosphere.setFakeLights(p.fake);
  if (!p.fake) inner.atmosphere.setLightBudget(null);
  setLiteMaterials(p.liteMat, game.scene);
  inner.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.dpr));
  inner.resize();
  inner.postfx.setSamples(p.msaa);
  applyBattery();
}

function applyBattery() { game.setFrameCap(cap30 ? 30 : null, idle ? IDLE_FPS : null); }

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/** Prepara gli shader dei tre profili (come farebbe il gioco al caricamento). */
async function prepare() {
  for (const [i, p] of PROFILES.entries()) {
    say(`<h1>Preparo gli shader ${i + 1}/${PROFILES.length}</h1><p class="muted">Una volta sola, come farebbe il gioco al caricamento.</p>`);
    applyProfile(p);
    await nextFrame();
    inner.renderer.compile(game.scene, inner.rig.camera);
    await nextFrame();
  }
}

// ── Statistiche dal vivo ────────────────────────────────────────────────

const live = { fps: 0, work: 0, calls: 0, tris: 0 };
let seenFrames = 0, seenWork = 0, seenAt = performance.now();
const liveText = () => `${live.fps.toFixed(0)} FPS · lavoro ${live.work.toFixed(0)} ms/s · ${live.calls} draw · ${(live.tris / 1000).toFixed(0)}k tri`;
setInterval(() => {
  const now = performance.now(), secs = (now - seenAt) / 1000;
  live.fps = (game.framesDrawn - seenFrames) / secs;
  live.work = (work - seenWork) / secs;
  live.calls = inner.renderer.info.render.calls;
  live.tris = inner.renderer.info.render.triangles;
  seenFrames = game.framesDrawn; seenWork = work; seenAt = now;
  const el = document.getElementById('live');
  if (el) el.textContent = liveText();
}, 500);

// ── Pannello ────────────────────────────────────────────────────────────

let mini = false, testing = false, results = '';

function render() {
  if (testing) return;
  const options = `${profile.label}${cap30 ? ' · 30 FPS' : ''}${idle ? ' · rallenta da fermo' : ''}`;
  if (mini) {
    panel.className = 'bench mini';
    say(`<div class="live" id="live" style="margin:0">${liveText()}</div><div class="muted">${options}</div><button id="open">Apri il pannello</button>`);
    document.getElementById('open')!.onclick = () => { mini = false; render(); };
    return;
  }
  panel.className = 'bench';
  say(`<h1>Misura delle prestazioni</h1>
    <div class="muted">Cimitero pieno: ${state.graves.length} tombe, ${state.placeables.length} oggetti · ${device.gpu} · dpr ${device.dpr}</div>
    <div>${PROFILES.map((p) => `<button data-p="${p.id}" class="${p === profile ? 'on' : ''}">${p.label}<br><small>${p.note}</small></button>`).join('')}</div>
    <div><button id="cap" class="${cap30 ? 'on' : ''}">30 FPS</button><button id="idle" class="${idle ? 'on' : ''}">Rallenta da fermo</button></div>
    <div class="live" id="live">${liveText()}</div>
    <div><button class="cta" id="go">Avvia il test</button><button id="hide">Nascondi e gira</button></div>
    ${results}`);
  panel.querySelectorAll<HTMLButtonElement>('[data-p]').forEach((b) => { b.onclick = () => { applyProfile(PROFILES.find((p) => p.id === b.dataset.p)!); render(); }; });
  document.getElementById('cap')!.onclick = () => { cap30 = !cap30; applyBattery(); render(); };
  document.getElementById('idle')!.onclick = () => { idle = !idle; applyBattery(); render(); };
  document.getElementById('hide')!.onclick = () => { mini = true; render(); };
  document.getElementById('go')!.onclick = runTest;
  const copy = document.getElementById('copy');
  if (copy) copy.onclick = async () => {
    try { await navigator.clipboard.writeText(lastOut); copy.textContent = 'Copiato ✓'; } catch { copy.textContent = 'Seleziona il testo qui sotto'; }
  };
}

// ── Test automatico ─────────────────────────────────────────────────────

interface Run { label: string; p: Profile; cap: number | null; idle: boolean }
interface Result { r: Run; fps: number; p95: number; slow: number; work: number; calls: number; tris: number }
// ogni profilo: libero e a 30 FPS con la camera che gira, poi fermo senza tocchi (rallenta da fermo)
const RUNS: Run[] = PROFILES.flatMap((p) => [
  { label: `${p.label} · libero`, p, cap: null, idle: false },
  { label: `${p.label} · 30 FPS`, p, cap: 30, idle: false },
  { label: `${p.label} · da fermo`, p, cap: 30, idle: true },
]);
const WARM = 2000, MEASURE = 7000;
/** Da fermo si comincia a misurare quando il gioco ha già rallentato (4 s senza tocchi). */
const IDLE_WARM = 5000;

function measure(r: Run): Promise<Result> {
  applyProfile(r.p);
  game.setFrameCap(r.cap, r.idle ? IDLE_FPS : null);
  inner.rig.follow = null;
  inner.rig.setView(18);
  inner.rig.jumpTo(center.clone());
  const warm = r.idle ? IDLE_WARM : WARM;
  // un frame è lento se arriva ben dopo il ritmo atteso
  const late = 1000 / (r.idle ? IDLE_FPS : r.cap ?? 30) + 8;
  return new Promise((resolve) => {
    const start = performance.now();
    let w0 = 0, f0 = 0, lastFrames = 0, lastAt = 0, calls = 0, tris = 0, n = 0;
    const gaps: number[] = [];
    const step = (now: number) => {
      const el = now - start;
      // la camera gira piano sul cimitero; da fermo resta dov'è
      if (!r.idle) { const a = (el / 20000) * Math.PI * 2; inner.rig.jumpTo(center.clone().add(new THREE.Vector3(Math.cos(a) * 9, 0, Math.sin(a) * 9))); }
      if (el >= warm) {
        if (!lastAt) { w0 = work; f0 = game.framesDrawn; lastFrames = f0; lastAt = now; }
        else if (game.framesDrawn !== lastFrames) {
          gaps.push(now - lastAt);
          lastAt = now; lastFrames = game.framesDrawn;
          calls += inner.renderer.info.render.calls; tris += inner.renderer.info.render.triangles; n++;
        }
      }
      if (el < warm + MEASURE) { requestAnimationFrame(step); return; }
      const secs = (now - start - warm) / 1000;
      const s = [...gaps].sort((x, y) => x - y);
      resolve({
        r, fps: (game.framesDrawn - f0) / secs, p95: s[Math.min(s.length - 1, Math.floor(0.95 * s.length))] ?? 0,
        slow: gaps.filter((g) => g > late).length, work: (work - w0) / secs,
        calls: Math.round(calls / Math.max(1, n)), tris: Math.round(tris / Math.max(1, n)),
      });
    };
    requestAnimationFrame(step);
  });
}

const fmt = (x: number, d = 1) => x.toFixed(d);
let lastOut = '', prepMs = 0;

async function runTest() {
  testing = true;
  panel.className = 'bench';
  const keep = { profile, cap30, idle };
  const rs: Result[] = [];
  for (const [i, r] of RUNS.entries()) {
    say(`<h1>Test ${i + 1}/${RUNS.length}</h1><p>${r.label}</p><p class="muted">Non toccare lo schermo: circa ${Math.round(RUNS.reduce((t, x) => t + (x.idle ? IDLE_WARM : WARM) + MEASURE, 0) / 60000 * 10) / 10} minuti in tutto.</p>${rs.length ? table(rs) : ''}`);
    rs.push(await measure(r));
  }
  testing = false;
  lastOut = [
    'NECROTHING · misura prestazioni (profili)',
    `GPU: ${device.gpu}`,
    `UA: ${device.ua}`,
    `schermo ${device.screen} · dpr ${device.dpr} · core ${device.cores} · mem ${device.memory}`,
    `scena: ${state.graves.length} tombe · ${state.placeables.length} oggetti · generazione ${fmt(genMs, 0)} ms · costruzione ${fmt(buildMs, 0)} ms · shader ${fmt(prepMs, 0)} ms`,
    '',
    'prova | FPS | ms 95% | frame lenti | lavoro ms/s | draw call | triangoli',
    ...rs.map((x) => `${x.r.label} | ${fmt(x.fps)} | ${fmt(x.p95)} | ${x.slow} | ${fmt(x.work, 0)} | ${x.calls} | ${x.tris}`),
  ].join('\n');
  (window as unknown as { benchResult: string }).benchResult = lastOut;
  ({ cap30, idle } = keep);
  applyProfile(keep.profile);
  results = `${table(rs)}
    <p class="muted" style="margin:6px 0 0">«lavoro» = millisecondi al secondo spesi a preparare e mandare i frame: meno lavoro, meno batteria. «lenti» = frame arrivati in ritardo sul ritmo atteso.</p>
    <button class="cta" id="copy">Copia risultati</button>
    <pre class="muted" style="white-space:pre-wrap;font-size:11px">${lastOut.replace(/</g, '&lt;')}</pre>`;
  render();
}

function table(rs: Result[]) {
  return `<table><tr><th></th><th>FPS</th><th>ms 95%</th><th>lenti</th><th>lavoro</th><th>draw</th><th>tri</th></tr>${rs.map((x) => `<tr><td>${x.r.label}</td><td>${fmt(x.fps)}</td><td>${fmt(x.p95)}</td><td>${x.slow}</td><td>${fmt(x.work, 0)}</td><td>${x.calls}</td><td>${(x.tris / 1000).toFixed(0)}k</td></tr>`).join('')}</table>`;
}

// si parte quando la scena ha disegnato qualche frame
setTimeout(async () => {
  const tp = performance.now();
  await prepare();
  prepMs = performance.now() - tp;
  applyProfile(PROFILES[2]);
  render();
  if (new URLSearchParams(location.search).has('auto')) runTest();
}, 1200);
// per le prove dalla console: benchProfile('light' | 'medium' | 'full')
(window as unknown as { benchProfile: (id: string) => void }).benchProfile = (id) => { const p = PROFILES.find((x) => x.id === id); if (p) { applyProfile(p); render(); } };
