// Livelli di qualità (Bassa, Media, Alta) e qualità «Auto». Logica pura
// (niente three/DOM): Game applica i profili.
//
// - ogni livello è un profilo misurato sui telefoni (pagina bench.html):
//   Bassa per i telefoni deboli (mondo alleggerito, luci finte, materiale
//   semplice, niente ombre), Media per i medi (luci finte, materiale
//   semplice, ombre ferme), Alta per i forti (luci vere, ombre vive);
// - Auto sceglie il livello dal dispositivo (mai più su di quello stimato),
//   dentro al livello regola solo la risoluzione, e se anche la risoluzione
//   più bassa non regge scende di livello (cambiarlo ricostruisce parte
//   della scena: mezzo secondo di blocco). Può risalire fino al livello
//   stimato; un livello che appena raggiunto non ha retto non si ritenta.
// - il regolatore giudica rispetto al ritmo atteso (30 o 60 FPS): scende
//   subito se resta sotto per qualche secondo, risale solo dopo un lungo
//   periodo pieno; un gradino che ha appena fatto crollare gli FPS non viene
//   più ritentato (tetto).

import type { Quality } from '../game/state.ts';

export interface QualityProfile {
  /** Livello «di costruzione»: densità di bosco e prato, nebbia, particelle, mappa delle ombre. */
  bake: Quality;
  /** Mondo alleggerito: un terzo di prato e decorazioni, metà bosco con alberi semplici. */
  lite: boolean;
  /** Luci delle lanterne finte (chiazze di luce a terra) invece delle luci vere. */
  fakeLights: boolean;
  /** Materiale semplice (Lambert) invece del PBR. */
  liteMaterials: boolean;
  /** Ombre: nessuna (disco sotto i personaggi), ferme (ridisegnate solo se cambia la vista) o vive. */
  shadows: 'off' | 'still' | 'live';
  /** Risoluzioni (pixel per punto) che Auto può usare, dalla più bassa: un livello scelto a mano usa l'ultima. */
  dpr: readonly number[];
  /** Campioni di antialiasing della sfocatura ai bordi. */
  msaa: number;
  blurRadius: number;
  /** Frame al secondo con la fluidità «Auto». */
  fps: 30 | 60;
  /** Quante presenze al bar e all'orto. */
  presences: 'low' | 'mid' | 'high';
}

export const PROFILES: Record<Quality, QualityProfile> = {
  low: { bake: 'medium', lite: true, fakeLights: true, liteMaterials: true, shadows: 'off', dpr: [0.85, 1], msaa: 0, blurRadius: 3.5, fps: 30, presences: 'mid' },
  medium: { bake: 'medium', lite: false, fakeLights: true, liteMaterials: true, shadows: 'still', dpr: [1.25, 1.5], msaa: 2, blurRadius: 3.5, fps: 30, presences: 'mid' },
  high: { bake: 'high', lite: false, fakeLights: false, liteMaterials: false, shadows: 'live', dpr: [1.5, 1.75, 2], msaa: 4, blurRadius: 5, fps: 60, presences: 'high' },
};

export const QUALITY_LABELS: Record<Quality, string> = { low: 'Bassa', medium: 'Media', high: 'Alta' };
const ORDER: readonly Quality[] = ['low', 'medium', 'high'];

export interface DeviceInfo {
  /** Stringa del renderer WebGL (UNMASKED_RENDERER_WEBGL se disponibile). */
  gpu: string;
  /** navigator.deviceMemory (GB), se noto. */
  memory?: number;
  cores?: number;
  mobile: boolean;
}

/** Livello adatto al dispositivo, a grandi linee: il regolatore poi corregge. */
export function detectTier(d: DeviceInfo): Quality {
  const g = d.gpu.toLowerCase();
  if (d.memory !== undefined && d.memory <= 3) return 'low';
  if (!d.mobile) return /swiftshader|llvmpipe|software|basic render/.test(g) ? 'low' : 'high';
  // Apple: Safari non dice quale chip; gli iPhone recenti reggono l'Alta
  if (g.includes('apple')) return (d.cores ?? 6) >= 6 ? 'high' : 'medium';
  const adreno = /adreno[^0-9]*(\d{3})/.exec(g);
  if (adreno) {
    const n = Number(adreno[1]);
    return n >= 650 ? 'high' : n >= 616 ? 'medium' : 'low';
  }
  const mali = /mali-?g(\d{2,3})/.exec(g);
  if (mali) {
    const n = Number(mali[1]);
    if (n >= 700) return n >= 710 ? 'high' : 'medium'; // G710, G715, G720…
    return n >= 76 ? 'medium' : 'low'; // G76/G77/G78 medio; G52/G57/G31… economico
  }
  if (/xclipse|immortalis/.test(g)) return 'high';
  if (/powervr|mali-t|mali-4/.test(g)) return 'low';
  return (d.cores ?? 4) >= 8 && (d.memory ?? 4) >= 6 ? 'medium' : 'low';
}

/** Cosa ricorda Auto per un dispositivo (nel browser, non nel salvataggio). */
export interface AutoProfile {
  /** Livello in uso. */
  tier: Quality;
  /** Gradino di risoluzione dentro al livello (indice in `dpr`). */
  step: number;
  /** Gradino più alto che ha retto. */
  ceiling: number;
  /** Livello più alto a cui si può tornare (all'inizio quello stimato). */
  top: Quality;
}

export function newAutoProfile(tier: Quality): AutoProfile {
  const max = PROFILES[tier].dpr.length - 1;
  return { tier, step: max, ceiling: max, top: tier };
}

/** Il livello cambia (si ricostruisce la scena) o solo la risoluzione. */
export type AutoDecision = 'step' | 'tier' | null;

/** Regolatore a finestre di un secondo, con isteresi e tetti per ciò che non regge. */
export class AutoGovernor {
  tier: Quality;
  step: number;
  ceiling: number;
  top: Quality;
  private winFrames = 0;
  private winTime = 0;
  private history: number[] = [];
  /** Secondi da attendere prima di giudicare (dopo un cambio la scena si assesta). */
  private settle = 3;
  /** Secondi prima di poter risalire. */
  private cooldown = 0;
  /** Da quanto si è saliti di gradino e di livello (per capire se la salita ha fatto crollare gli FPS). */
  private sinceUp = Infinity;
  private sinceTierUp = Infinity;

  constructor(p: AutoProfile) {
    this.tier = p.tier;
    this.top = ORDER.indexOf(p.top) >= ORDER.indexOf(p.tier) ? p.top : p.tier;
    const max = PROFILES[p.tier].dpr.length - 1;
    this.ceiling = Math.max(0, Math.min(p.ceiling, max));
    this.step = Math.max(0, Math.min(p.step, this.ceiling));
  }

  profile(): AutoProfile { return { tier: this.tier, step: this.step, ceiling: this.ceiling, top: this.top }; }

  /** Sotto quanti FPS si scende: un po' sotto il ritmo atteso (a 60 basta restare sopra i 28). */
  static low(target: number) { return Math.min(28, target * 0.8); }
  /** Sopra quanti FPS c'è margine per salire. */
  static high(target: number) { return target * 0.83; }

  /** Niente giudizi per un po' (il gioco ha rallentato da solo, da fermo o sotto un menù). */
  hold() {
    this.winFrames = 0;
    this.winTime = 0;
    this.history = [];
    this.settle = Math.max(this.settle, 1.5);
  }

  /** Un frame disegnato, col ritmo atteso; ritorna la decisione quando c'è da cambiare qualcosa. */
  frame(dt: number, target: number): AutoDecision {
    if (dt <= 0 || dt > 0.25) return null; // pause, schede in background, caricamenti
    this.sinceUp += dt;
    this.sinceTierUp += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.settle > 0) { this.settle -= dt; return null; }
    this.winFrames++;
    this.winTime += dt;
    if (this.winTime < 1) return null;
    const fps = this.winFrames / this.winTime;
    this.winFrames = 0;
    this.winTime = 0;
    this.history.push(fps);
    if (this.history.length > 30) this.history.shift();
    const last = (n: number) => this.history.length >= n && this.history.slice(-n);
    const low = AutoGovernor.low(target), high = AutoGovernor.high(target);
    // sotto il ritmo per due secondi di fila: si scende subito
    const slow = last(2);
    if (slow && slow.every((f) => f < low)) {
      if (this.step > 0) {
        // la salita di poco fa non ha retto: quel gradino non si ritenta più
        if (this.sinceUp < 12) this.ceiling = this.step - 1;
        this.change(this.step - 1, 30);
        return 'step';
      }
      const slower = last(5);
      const i = ORDER.indexOf(this.tier);
      if (slower && slower.every((f) => f < low - 3) && i > 0) {
        // il livello raggiunto da poco non regge: non ci si torna più
        if (this.sinceTierUp < 40) this.top = ORDER[i - 1];
        this.tier = ORDER[i - 1];
        this.ceiling = this.step = PROFILES[this.tier].dpr.length - 1;
        this.change(this.step, 40);
        return 'tier';
      }
      return null;
    }
    if (this.cooldown > 0) return null;
    // con margine per otto secondi: si prova il gradino sopra
    const good = last(8);
    if (this.step < this.ceiling && good && good.every((f) => f >= high)) {
      this.change(this.step + 1, 20);
      this.sinceUp = 0;
      return 'step';
    }
    // al gradino più alto e pieno per mezzo minuto: si prova il livello sopra (fino a quello stimato)
    const long = last(30);
    const i = ORDER.indexOf(this.tier);
    if (this.step === PROFILES[this.tier].dpr.length - 1 && i < ORDER.indexOf(this.top) && long && long.every((f) => f >= high)) {
      this.tier = ORDER[i + 1];
      this.step = 0;
      this.ceiling = PROFILES[this.tier].dpr.length - 1;
      this.change(0, 30);
      this.sinceTierUp = 0;
      return 'tier';
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
