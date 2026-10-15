// Qualità «Auto»: stima la fascia del dispositivo all'avvio e, mentre si
// gioca, regola risoluzione, ombre, sfocatura e antialiasing guardando gli
// FPS. Logica pura (niente three/DOM): Game applica i gradini.
//
// - fascia (economico / medio / top): fissa le scelte costose da cambiare
//   (densità di bosco e prato, numero di luci reali: cambiarli ricostruisce
//   la scena o ricompila gli shader), la densità del bosco, il prato a due
//   versioni (ricco al centro, leggero nelle fasce sfocate) e il gradino di
//   partenza; in tutte le fasce gli oggetti fermi sono fusi per zona;
// - gradini: dal più leggero al più ricco, cambiano solo cose economiche da
//   cambiare (pixel ratio, mappa ombre, sfocatura, MSAA);
// - regolatore: scende subito se si resta sotto i 30 FPS per qualche
//   secondo, risale solo dopo un lungo periodo con margine; un gradino che
//   ha appena fatto crollare gli FPS non viene più ritentato (tetto).

import type { Quality } from '../game/state.ts';

export type Tier = 'low' | 'mid' | 'high';

export interface AutoStep {
  /** Pixel per punto (limitato dal dispositivo). */
  dpr: number;
  shadow: number;
  blur: boolean;
  /** Campioni MSAA della scena (con la sfocatura attiva). */
  msaa: number;
}

export const AUTO_STEPS: readonly AutoStep[] = [
  { dpr: 1, shadow: 1024, blur: false, msaa: 0 },
  { dpr: 1, shadow: 1024, blur: true, msaa: 0 },
  { dpr: 1.25, shadow: 1024, blur: true, msaa: 2 },
  { dpr: 1.5, shadow: 1536, blur: true, msaa: 2 },
  { dpr: 1.75, shadow: 2048, blur: true, msaa: 4 },
  { dpr: 2, shadow: 2048, blur: true, msaa: 4 },
];

export interface TierSpec {
  /** Densità di bosco e prato (come i livelli manuali). */
  bake: Quality;
  /** Luci puntiformi reali nella scena (le altre sorgenti hanno solo l'alone). */
  lights: number;
  startStep: number;
  maxStep: number;
  /** Ombre della scena ridisegnate solo quando cambia qualcosa; i personaggi hanno un'ombra a disco. */
  staticShadows: boolean;
  /** Densità del bosco attorno al recinto rispetto al livello `bake`. */
  forest: number;
  /** Prato [ricco nella fascia nitida, leggero in quelle sfocate]. */
  decor: [Quality, Quality];
}

export const TIERS: Record<Tier, TierSpec> = {
  low: { bake: 'low', lights: 4, startStep: 1, maxStep: 3, staticShadows: true, forest: 1, decor: ['medium', 'low'] },
  mid: { bake: 'medium', lights: 7, startStep: 3, maxStep: 4, staticShadows: true, forest: 2, decor: ['medium', 'low'] },
  high: { bake: 'high', lights: 10, startStep: 5, maxStep: 5, staticShadows: false, forest: 2, decor: ['high', 'medium'] },
};

export const TIER_LABELS: Record<Tier, string> = { low: 'economico', mid: 'medio', high: 'top' };

export interface DeviceInfo {
  /** Stringa del renderer WebGL (UNMASKED_RENDERER_WEBGL se disponibile). */
  gpu: string;
  /** navigator.deviceMemory (GB), se noto. */
  memory?: number;
  cores?: number;
  mobile: boolean;
}

/**
 * Fascia del dispositivo, a grandi linee: il regolatore poi corregge. Nel
 * dubbio si parte da «medio» (si sale o si scende in pochi secondi).
 */
export function detectTier(d: DeviceInfo): Tier {
  const g = d.gpu.toLowerCase();
  if (d.memory !== undefined && d.memory <= 3) return 'low';
  if (!d.mobile) return /swiftshader|llvmpipe|software|basic render/.test(g) ? 'low' : 'high';
  // Apple: Safari non dice quale chip; gli iPhone recenti reggono l'Alta
  if (g.includes('apple')) return (d.cores ?? 6) >= 6 ? 'high' : 'mid';
  const adreno = /adreno[^0-9]*(\d{3})/.exec(g);
  if (adreno) {
    const n = Number(adreno[1]);
    return n >= 650 ? 'high' : n >= 616 ? 'mid' : 'low';
  }
  const mali = /mali-?g(\d{2,3})/.exec(g);
  if (mali) {
    const n = Number(mali[1]);
    if (n >= 700) return n >= 710 ? 'high' : 'mid'; // G710, G715, G720…
    return n >= 76 ? 'mid' : 'low'; // G76/G77/G78 medio; G52/G57/G31… economico
  }
  if (/xclipse|immortalis/.test(g)) return 'high';
  if (/powervr|mali-t|mali-4/.test(g)) return 'low';
  return (d.cores ?? 4) >= 8 && (d.memory ?? 4) >= 6 ? 'mid' : 'low';
}

export interface AutoProfile { tier: Tier; step: number; ceiling: number }

export type AutoDecision = 'up' | 'down' | 'tierDown' | null;

/** Regolatore a finestre di un secondo, con isteresi e tetto per i gradini che non reggono. */
export class AutoGovernor {
  tier: Tier;
  step: number;
  /** Gradino massimo che ha dimostrato di reggere su questo dispositivo. */
  ceiling: number;
  private winFrames = 0;
  private winTime = 0;
  private history: number[] = [];
  /** Secondi da attendere prima di giudicare (dopo un cambio la scena si assesta). */
  private settle = 3;
  /** Secondi prima di poter risalire. */
  private cooldown = 0;
  /** Da quanto tempo si è saliti (per capire se la salita ha fatto crollare gli FPS). */
  private sinceUp = Infinity;

  static readonly LOW_FPS = 28;
  static readonly HIGH_FPS = 50;

  constructor(p: AutoProfile) {
    this.tier = p.tier;
    this.ceiling = Math.min(p.ceiling, TIERS[p.tier].maxStep);
    this.step = Math.max(0, Math.min(p.step, this.ceiling));
  }

  profile(): AutoProfile { return { tier: this.tier, step: this.step, ceiling: this.ceiling }; }

  /** Un frame; ritorna la decisione quando c'è da cambiare qualcosa. */
  frame(dt: number): AutoDecision {
    if (dt <= 0 || dt > 0.25) return null; // pause, schede in background, caricamenti
    this.sinceUp += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.settle > 0) { this.settle -= dt; return null; }
    this.winFrames++;
    this.winTime += dt;
    if (this.winTime < 1) return null;
    const fps = this.winFrames / this.winTime;
    this.winFrames = 0;
    this.winTime = 0;
    this.history.push(fps);
    if (this.history.length > 10) this.history.shift();
    const last = (n: number) => this.history.slice(-n);
    // sotto i 30 per due secondi di fila: si scende subito
    if (this.history.length >= 2 && last(2).every((f) => f < AutoGovernor.LOW_FPS)) {
      if (this.step > 0) {
        // la salita di poco fa non ha retto: quel gradino non si ritenta più
        if (this.sinceUp < 12) this.ceiling = this.step - 1;
        this.change(this.step - 1, 30);
        return 'down';
      }
      if (this.history.length >= 5 && last(5).every((f) => f < AutoGovernor.LOW_FPS - 3) && this.tier !== 'low') {
        this.tier = this.tier === 'high' ? 'mid' : 'low';
        this.ceiling = TIERS[this.tier].maxStep;
        this.change(Math.min(TIERS[this.tier].startStep, this.ceiling), 30);
        return 'tierDown';
      }
      return null;
    }
    // con margine per otto secondi: si prova a salire di un gradino
    if (this.cooldown <= 0 && this.step < this.ceiling && this.history.length >= 8 && last(8).every((f) => f >= AutoGovernor.HIGH_FPS)) {
      this.change(this.step + 1, 20);
      this.sinceUp = 0;
      return 'up';
    }
    return null;
  }

  private change(step: number, cooldown: number) {
    this.step = step;
    this.history = [];
    this.winFrames = 0;
    this.winTime = 0;
    this.settle = 3;
    this.cooldown = cooldown;
  }
}
