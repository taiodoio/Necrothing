// Pagina di misura (bench.html): il gioco vero su un cimitero pieno generato
// al volo, senza leggere né scrivere il salvataggio. Si sceglie il livello di
// qualità (Bassa, Media, Alta: gli stessi del gioco) e la fluidità (30 o 60
// FPS), col rallentamento da fermo acceso come nel gioco; si può girare nel
// cimitero con le statistiche dal vivo, oppure lanciare il test automatico
// che misura tutto e prepara i risultati da copiare. Gli shader dei tre
// livelli si preparano all'inizio, così cambiare livello non blocca il frame.

import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/jacquard-24/400.css';
import './styles/main.css';
import * as THREE from 'three';
import { Game } from './app/Game.ts';
import { PROFILES, QUALITY_LABELS } from './app/AutoQuality.ts';
import { setPersistence } from './app/persistence.ts';
import { setUiNext } from './app/uiNext.ts';
import type { FpsSetting, Quality } from './game/state.ts';
import { fullCemetery } from './game/fullCemetery.ts';
import { areaForLevel } from './game/world.ts';
import { cellCenter } from './view/WorldView.ts';

setPersistence(false);
// interfaccia nuova in prova (interazioni, menù a icone, menù verticale): per ora solo qui
setUiNext(true);

interface Inner {
  renderer: THREE.WebGLRenderer;
  rig: { follow: THREE.Vector3 | null; camera: THREE.Camera; setView(h: number): void; jumpTo(p: THREE.Vector3): void };
  tick(time?: number): void;
}

const LEVELS: Quality[] = ['low', 'medium', 'high'];
const NOTES: Record<Quality, string> = { low: 'telefoni deboli', medium: 'telefoni medi', high: 'telefoni forti' };
/** Frame al secondo da fermo (come nel gioco). */
const IDLE_FPS = 15;

const panel = document.getElementById('bench')!;
const style = document.createElement('style');
style.textContent = `
  .bench { position: fixed; z-index: 50; left: 8px; right: 8px; top: calc(8px + env(safe-area-inset-top)); max-height: 72vh; overflow: auto;
    background: rgba(10,12,16,0.93); color: #e8dcc4; font: 13px/1.35 system-ui, sans-serif; padding: 10px 12px; border: 2px solid #d8b26a; }
  .bench.mini { left: auto; right: 8px; top: calc(84px + env(safe-area-inset-top)); bottom: auto; padding: 4px 6px; max-width: 62vw; font-size: 11px; }
  .bench.mini .live { font-size: 11px; }
  .bench.mini button { padding: 5px 8px; font-size: 12px; }
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
state.settings.fps = 'auto';
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
inner.renderer.setAnimationLoop((time) => { const s = performance.now(); inner.tick(time); work += performance.now() - s; });

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

// ── Livello, fluidità, rallentamento ────────────────────────────────────

let level: Quality = 'high', fps: FpsSetting = 'auto', idle = true;

function apply(q: Quality, f: FpsSetting, i: boolean) {
  level = q; fps = f; idle = i;
  if (game.state.settings.quality !== q) game.setQuality(q);
  game.setFps(f);
  game.setIdleSaver(i);
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/** Prepara gli shader dei tre livelli (dopo, passare dall'uno all'altro non ricompila niente). */
async function prepare() {
  for (const [i, q] of LEVELS.entries()) {
    say(`<h1>Preparo gli shader ${i + 1}/${LEVELS.length}</h1><p class="muted">Una volta sola.</p>`);
    apply(q, fps, idle);
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
const FPS_LABELS: Record<FpsSetting, string> = { auto: 'Auto', '30': '30 FPS', '60': '60 FPS' };
const fpsOf = (q: Quality, f: FpsSetting) => (f === 'auto' ? PROFILES[q].fps : Number(f));

function render() {
  if (testing) return;
  const options = `${QUALITY_LABELS[level]} · ${fpsOf(level, fps)} FPS${idle ? ' · rallenta da fermo' : ''}`;
  if (mini) {
    panel.className = 'bench mini';
    say(`<div class="live" id="live" style="margin:0">${liveText()}</div><div class="muted">${options}</div><button id="open">Apri il pannello</button>`);
    document.getElementById('open')!.onclick = () => { mini = false; render(); };
    return;
  }
  panel.className = 'bench';
  say(`<h1>Misura delle prestazioni</h1>
    <div class="muted">Cimitero pieno: ${state.graves.length} tombe, ${state.placeables.length} oggetti · ${device.gpu} · dpr ${device.dpr}</div>
    <div>${LEVELS.map((q) => `<button data-q="${q}" class="${q === level ? 'on' : ''}">${QUALITY_LABELS[q]}<br><small>${NOTES[q]}</small></button>`).join('')}</div>
    <div>${(['auto', '30', '60'] as FpsSetting[]).map((f) => `<button data-f="${f}" class="${f === fps ? 'on' : ''}">${FPS_LABELS[f]}</button>`).join('')}<button id="idle" class="${idle ? 'on' : ''}">Rallenta da fermo</button></div>
    <div class="muted">Fluidità Auto: 60 FPS in Alta, 30 in Media e Bassa.</div>
    <div class="live" id="live">${liveText()}</div>
    <div><button class="cta" id="go">Avvia il test</button><button id="hide">Nascondi e gira</button></div>
    ${results}`);
  panel.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((b) => { b.onclick = () => { apply(b.dataset.q as Quality, fps, idle); render(); }; });
  panel.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => { b.onclick = () => { apply(level, b.dataset.f as FpsSetting, idle); render(); }; });
  document.getElementById('idle')!.onclick = () => { apply(level, fps, !idle); render(); };
  document.getElementById('hide')!.onclick = () => { mini = true; render(); };
  document.getElementById('go')!.onclick = runTest;
  const copy = document.getElementById('copy');
  if (copy) copy.onclick = async () => {
    try { await navigator.clipboard.writeText(lastOut); copy.textContent = 'Copiato ✓'; } catch { copy.textContent = 'Seleziona il testo qui sotto'; }
  };
}

// ── Test automatico ─────────────────────────────────────────────────────

interface Run { label: string; q: Quality; fps: FpsSetting; idle: boolean }
interface Result { r: Run; fps: number; p95: number; slow: number; work: number; calls: number; tris: number }
// ogni livello: a 30 e a 60 FPS con la camera che gira, poi fermo senza tocchi (con la sua fluidità)
const RUNS: Run[] = LEVELS.flatMap((q) => [
  { label: `${QUALITY_LABELS[q]} · 30 FPS`, q, fps: '30' as const, idle: false },
  { label: `${QUALITY_LABELS[q]} · 60 FPS`, q, fps: '60' as const, idle: false },
  { label: `${QUALITY_LABELS[q]} · da fermo`, q, fps: 'auto' as const, idle: true },
]);
const WARM = 2000, MEASURE = 7000;
/** Da fermo si comincia a misurare quando il gioco ha già rallentato (4 s senza tocchi). */
const IDLE_WARM = 5000;

function measure(r: Run): Promise<Result> {
  apply(r.q, r.fps, r.idle);
  inner.rig.follow = null;
  inner.rig.setView(18);
  inner.rig.jumpTo(center.clone());
  const warm = r.idle ? IDLE_WARM : WARM;
  // un frame è lento se arriva ben dopo il ritmo atteso
  const late = 1000 / (r.idle ? IDLE_FPS : fpsOf(r.q, r.fps)) + 8;
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
  const keep = { level, fps, idle };
  const rs: Result[] = [];
  const total = Math.round(RUNS.reduce((t, x) => t + (x.idle ? IDLE_WARM : WARM) + MEASURE, 0) / 60000 * 10) / 10;
  for (const [i, r] of RUNS.entries()) {
    say(`<h1>Test ${i + 1}/${RUNS.length}</h1><p>${r.label}</p><p class="muted">Non toccare lo schermo: circa ${total} minuti in tutto.</p>${rs.length ? table(rs) : ''}`);
    rs.push(await measure(r));
  }
  testing = false;
  lastOut = [
    'NECROTHING · misura prestazioni (livelli)',
    `GPU: ${device.gpu}`,
    `UA: ${device.ua}`,
    `schermo ${device.screen} · dpr ${device.dpr} · core ${device.cores} · mem ${device.memory}`,
    `scena: ${state.graves.length} tombe · ${state.placeables.length} oggetti · generazione ${fmt(genMs, 0)} ms · costruzione ${fmt(buildMs, 0)} ms · shader ${fmt(prepMs, 0)} ms`,
    '',
    'prova | FPS | ms 95% | frame lenti | lavoro ms/s | draw call | triangoli',
    ...rs.map((x) => `${x.r.label} | ${fmt(x.fps)} | ${fmt(x.p95)} | ${x.slow} | ${fmt(x.work, 0)} | ${x.calls} | ${x.tris}`),
  ].join('\n');
  (window as unknown as { benchResult: string }).benchResult = lastOut;
  apply(keep.level, keep.fps, keep.idle);
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
  apply('high', 'auto', true);
  render();
  if (new URLSearchParams(location.search).has('auto')) runTest();
}, 1200);
