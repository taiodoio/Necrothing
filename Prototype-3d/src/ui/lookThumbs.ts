// Miniature del selettore della personalizzazione: una testa senza viso con
// il taglio (o la barba, i baffi, gli occhiali, il cappello), la testa intera
// per il tipo di testa e il solo corpo per i vestiti. Colori neutri, così
// ogni miniatura si disegna una volta sola per sessione; si preparano una
// alla volta (un renderer fuori schermo condiviso) senza bloccare il pannello.

import * as THREE from 'three';
import { LP } from '../render/lowpoly/kit.ts';
import { instantiate, LOWPOLY_MATERIALS } from '../render/modelCache.ts';
import { HUMAN_PIVOTS, humanSpec, type KPart } from '../render/lowpoly/v2/custode.ts';
import type { CustodeLook } from '../game/look.ts';

export type ThumbKind = 'head' | 'hair' | 'beard' | 'mustache' | 'glasses' | 'hat' | 'outfit';

const SIZE = 144;
const NEUTRAL: Partial<CustodeLook> = {
  head: 'human', skin: '#d8c6b2', hair: 'none', hairColor: '#6b4a33', beard: 'none', mustache: 'none', beardColor: '#6b4a33', eyes: '#2f5a32',
  glasses: 'none', hat: 'none', hatColor: '#4a3326', outfit: 'coat', outfitColor: '#4f5a3e', accentColor: '#d9b48a', sparkle: false, freckles: false, bandaid: false,
};
const HEAD: KPart[] = ['head'];
const BODY: KPart[] = ['body', 'armL', 'armR', 'legL', 'legR'];

/** Cosa mostra ogni tipo di miniatura e come la inquadra (rotazione, ingrandimento, spostamento in giù, camera dall'alto). */
const KINDS: Record<ThumbKind, { look: (v: string) => Partial<CustodeLook>; bare: boolean; parts: KPart[]; yaw: number; zoom?: number; dy?: number; pitch?: number }> = {
  head: { look: (v) => ({ head: v as CustodeLook['head'], skin: '#f2cfb0' }), bare: false, parts: HEAD, yaw: 0.45 },
  hair: { look: (v) => ({ hair: v as CustodeLook['hair'] }), bare: true, parts: HEAD, yaw: 0.5 },
  beard: { look: (v) => ({ beard: v as CustodeLook['beard'] }), bare: true, parts: HEAD, yaw: 0.2, zoom: 0.85, dy: -0.08 },
  mustache: { look: (v) => ({ mustache: v as CustodeLook['mustache'] }), bare: true, parts: HEAD, yaw: 0.1, zoom: 0.6, dy: -0.2, pitch: 0.04 },
  glasses: { look: (v) => ({ glasses: v as CustodeLook['glasses'] }), bare: true, parts: HEAD, yaw: 0.15, zoom: 0.75, dy: -0.05 },
  hat: { look: (v) => ({ hat: v as CustodeLook['hat'] }), bare: true, parts: HEAD, yaw: 0.5 },
  outfit: { look: (v) => ({ outfit: v as CustodeLook['outfit'] }), bare: false, parts: BODY, yaw: 0.5 },
};

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
const camera = new THREE.PerspectiveCamera(22, 1, 0.05, 50);
const done = new Map<string, string>();
const queue: Array<{ key: string; kind: ThumbKind; value: string; resolve: (url: string) => void }> = [];
const waiting = new Map<string, Promise<string>>();
let running = false;

function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#e9eff0', '#3b342a', 1.3));
  const key = new THREE.DirectionalLight('#fff0da', 2.4);
  key.position.set(-1.6, 2.6, 2.4);
  const rim = new THREE.DirectionalLight('#bcd2ff', 1.3);
  rim.position.set(1.9, 1.7, -2.3);
  const fill = new THREE.DirectionalLight('#ffe6d0', 0.5);
  fill.position.set(2.2, 0.8, 1.5);
  scene.add(key, rim, fill);
}

/** Disegna una miniatura e la restituisce come immagine (data URL). */
function draw(kind: ThumbKind, value: string): string {
  if (!renderer) setup();
  const k = KINDS[kind];
  const spec = humanSpec({ ...NEUTRAL, ...k.look(value) }, { held: [], bare: k.bare });
  const g = new THREE.Group();
  for (const part of k.parts) {
    const lp = new LP(`miniatura:${part}`);
    spec.parts[part]?.(lp);
    const m = lp.build();
    const o = instantiate({ geometries: m.geometries, lights: [], height: 1, mats: LOWPOLY_MATERIALS, dedicated: true }, { castShadow: false });
    o.position.set(...HUMAN_PIVOTS[part]);
    g.add(o);
  }
  g.rotation.y = k.yaw;
  scene!.add(g);
  // inquadratura: tutto il modello nel riquadro (più stretto sul viso per barba, baffi, occhiali)
  const box = new THREE.Box3().setFromObject(g);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  center.y += (k.dy ?? 0) * size.y;
  const r = Math.max(size.y, size.x) * 0.5 * 1.12 * (k.zoom ?? 1);
  const dist = r / Math.tan((camera.fov / 2) * Math.PI / 180);
  camera.position.copy(center).addScaledVector(new THREE.Vector3(0.08, k.pitch ?? 0.22, 1).normalize(), dist + size.z * 0.5);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  renderer!.render(scene!, camera);
  const url = renderer!.domElement.toDataURL('image/png');
  scene!.remove(g);
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); // i materiali sono condivisi
  return url;
}

function pump() {
  const job = queue.shift();
  if (!job) { running = false; return; }
  let url = '';
  try { url = draw(job.kind, job.value); } catch { url = ''; } // senza WebGL: niente miniatura, resta il nome
  done.set(job.key, url);
  waiting.delete(job.key);
  job.resolve(url);
  setTimeout(pump, 0); // una per volta: il pannello resta reattivo
}

/** Miniatura di una scelta (subito se già pronta, altrimenti appena disegnata). */
export function lookThumb(kind: ThumbKind, value: string): Promise<string> {
  const key = `${kind}:${value}`;
  const ready = done.get(key);
  if (ready !== undefined) return Promise.resolve(ready);
  const pending = waiting.get(key);
  if (pending) return pending;
  const p = new Promise<string>((resolve) => queue.push({ key, kind, value, resolve }));
  waiting.set(key, p);
  if (!running) { running = true; setTimeout(pump, 0); }
  return p;
}
