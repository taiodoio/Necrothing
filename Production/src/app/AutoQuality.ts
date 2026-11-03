// Livelli di qualità (Bassa, Media, Alta) e qualità «Auto». Logica pura
// (niente three/DOM): Game applica i profili.
//
// - ogni livello è un profilo misurato sui telefoni:
//   Bassa per i telefoni deboli (mondo alleggerito, luci finte, materiale
//   semplice, niente ombre), Media per i medi (luci finte, materiale
//   semplice, ombre ferme), Alta per i forti (luci vere, ombre vive);
// - Auto sceglie il livello dal dispositivo e parte dalla risoluzione più alta
//   di quel livello; nel gioco (AUTO_POLICY) il livello non cambia più e scende
//   solo la risoluzione, come rete di sicurezza: dopo 25 secondi di gioco
//   attivo e con gli FPS sotto il ritmo per 8 secondi di fila. Da fermo
//   (risparmio batteria) e sotto i menù il gioco rallenta apposta: quei frame
//   non si giudicano. Ogni apertura riparte dal livello stimato.
// - il regolatore giudica rispetto al ritmo atteso (30 o 60 FPS) e risale
//   (fino alla risoluzione più alta del livello) solo dopo un periodo pieno; un
//   gradino che ha appena fatto crollare gli FPS non viene più ritentato (tetto).
//   EAGER_POLICY è il comportamento di prima (scende presto, anche di livello).

import type { Quality } from '../game/state.ts';
import { t } from '../i18n/index.ts';

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

export const QUALITY_LABELS: Record<Quality, string> = { low: t('quality.low'), medium: t('quality.medium'), high: t('quality.high') };
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
  // Apple: Safari non dice quale chip né quanti core (hardwareConcurrency è finto, di solito 2):
  // si parte da Alta, che gli iPhone recenti reggono, e sui più vecchi il regolatore scende da sé
  if (g.includes('apple')) return 'high';
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
  // La stima del dispositivo sceglie subito la risoluzione più alta della
  // fascia. Il regolatore interviene solo se il carico reale non la sostiene.
  return { tier, step: max, ceiling: max, top: tier };
}

/** Il livello cambia (si ricostruisce la scena) o solo la risoluzione. */
export type AutoDecision = 'step' | 'tier' | null;

/**
 * Secondi senza giudizio all'avvio: la scena finisce di comporsi, gli shader si
 * compilano, le anteprime si scaldano. Erano i frame lenti di questi secondi a
 * far scendere anche i telefoni forti (un iPhone recente finiva sempre in Media).
 */
export const START_SETTLE = 5;
/** Dopo un cambio di livello: la scena si ricostruisce e gli shader nuovi si compilano (un blocco che non dice nulla sul telefono). */
export const TIER_SETTLE = 4;
/** Un frame singolo più lungo di così, in mezzo a frame veloci, è uno scatto isolato (un modello generato, un salvataggio): non conta. */
export const HITCH = 0.25;
/** Come può scendere il regolatore. */
export interface AutoPolicy {
  /** Se può scendere (di risoluzione e, con `tierDown`, di livello). */
  downgrade: boolean;
  /** Se, alla risoluzione minima, può scendere anche di livello (ricostruisce parte della scena). */
  tierDown: boolean;
  /** Secondi di gioco attivo, a ritmo pieno, prima di poter scendere (da fermo e sotto i menù non contano). */
  warmup: number;
  /** Finestre di un secondo consecutive sotto il ritmo per scendere di un gradino. */
  sustain: number;
}

/** Il regolatore di prima (i test lo usano così): scende presto, anche di livello. */
export const EAGER_POLICY: AutoPolicy = { downgrade: true, tierDown: true, warmup: 0, sustain: 2 };

/**
 * Quello del gioco: rete di sicurezza prudente. Auto parte dal livello stimato
 * per il dispositivo, alla risoluzione più alta, e il livello non cambia più;
 * scende solo di risoluzione, dopo almeno 25 secondi di gioco attivo e se gli
 * FPS restano sotto il ritmo per 8 secondi di fila (mai nei primi secondi,
 * mai da fermo o sotto un menù: lì il gioco rallenta apposta).
 */
export const AUTO_POLICY: AutoPolicy = { downgrade: true, tierDown: false, warmup: 25, sustain: 8 };

/** Regolatore a finestre di un secondo, con isteresi e tetti per ciò che non regge. */
export class AutoGovernor {
  tier: Quality;
  step: number;
  ceiling: number;
  top: Quality;
  private winFrames = 0;
  private winTime = 0;
  private history: number[] = [];
  /** Secondi da attendere prima di giudicare (all'avvio e dopo un cambio la scena si assesta). */
  private settle = START_SETTLE;
  /** Durata del frame prima (per riconoscere gli scatti isolati). */
  private lastDt = 0;
  /** Secondi prima di poter risalire. */
  private cooldown = 0;
  /** Da quanto si è saliti di gradino e di livello (per capire se la salita ha fatto crollare gli FPS). */
  private sinceUp = Infinity;
  private sinceTierUp = Infinity;
  /** Come può scendere (vedi AUTO_POLICY). */
  private readonly policy: AutoPolicy;
  /** Secondi giudicati (gioco attivo a ritmo pieno, dopo l'assestamento). */
  private active = 0;

  constructor(p: AutoProfile, policy: Partial<AutoPolicy> = {}) {
    this.policy = { ...EAGER_POLICY, ...policy };
    this.tier = p.tier;
    this.top = ORDER.indexOf(p.top) >= ORDER.indexOf(p.tier) ? p.top : p.tier;
    const max = PROFILES[p.tier].dpr.length - 1;
    this.ceiling = Math.max(0, Math.min(p.ceiling, max));
    this.step = Math.max(0, Math.min(p.step, this.ceiling));
  }

  profile(): AutoProfile { return { tier: this.tier, step: this.step, ceiling: this.ceiling, top: this.top }; }

  /** Sotto quanti FPS si scende di risoluzione: 45 se si punta a 60, 24 se si punta a 30. */
  static low(target: number) { return target >= 60 ? 45 : 24; }
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
    if (dt <= 0 || dt > 2) return null; // pausa lunga; i blocchi visibili sotto i 2 s contano come frame lenti
    // uno scatto isolato in mezzo a frame veloci non dice che il telefono non regge; una serie di frame lenti sì
    const isolated = dt > HITCH && this.lastDt < 0.1;
    this.lastDt = dt;
    if (isolated) return null;
    this.sinceUp += dt;
    this.sinceTierUp += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.settle > 0) { this.settle -= dt; return null; }
    this.active += dt;
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
    // Sotto il ritmo per `sustain` finestre consecutive (e dopo `warmup` secondi di gioco) si riduce la risoluzione.
    const pol = this.policy;
    const slow = last(pol.sustain);
    if (slow && slow.every((f) => f < low)) {
      if (!pol.downgrade || this.active < pol.warmup) return null; // si resta dove si è (e non si sale)
      if (this.step > 0) {
        // la salita di poco fa non ha retto: quel gradino non si ritenta più
        if (this.sinceUp < 12) this.ceiling = this.step - 1;
        this.change(this.step - 1, 30);
        return 'step';
      }
      // Se anche alla risoluzione minima restiamo sotto il ritmo per tre
      // finestre, si riducono ombre, luci e densità della scena.
      const slower = last(pol.sustain + 1);
      const i = ORDER.indexOf(this.tier);
      if (pol.tierDown && slower && slower.every((f) => f < low) && i > 0) {
        // il livello raggiunto da poco non regge: non ci si torna più
        if (this.sinceTierUp < 40) this.top = ORDER[i - 1];
        this.tier = ORDER[i - 1];
        this.step = 0;
        this.ceiling = PROFILES[this.tier].dpr.length - 1;
        this.change(this.step, 0, TIER_SETTLE);
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
      this.change(0, 30, TIER_SETTLE);
      this.sinceTierUp = 0;
      return 'tier';
    }
    return null;
  }

  private change(step: number, cooldown: number, settle = 1) {
    this.step = step;
    this.history = [];
    this.winFrames = 0;
    this.winTime = 0;
    this.settle = settle;
    this.cooldown = cooldown;
  }
}
