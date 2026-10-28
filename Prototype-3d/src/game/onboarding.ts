// Il percorso del primo ingresso, nel salvataggio (si riprende dove ci si era
// fermati; una partita nuova lo rifà da capo): la pergamena di benvenuto, il
// nome, una breve introduzione e il cortile del Custode, una mappa piccola a
// parte (game/yard.ts) dove si prova tutto con azioni vere. Ogni fase si può
// saltare; si può rivedere dalle Impostazioni senza toccare la partita. Quello
// che si guadagna nel cortile resta nel cortile: alla fine c'è un dono di
// benvenuto. Dopo, nel cimitero vero, il primo obiettivo (la prima sepoltura)
// e i consigli al momento giusto (game/tips.ts). Le schermate: ui/onboarding.ts.

export type OnboardingStage = 'welcome' | 'name' | 'intro' | 'yard' | 'done';
export const ONBOARDING_STAGES: readonly OnboardingStage[] = ['welcome', 'name', 'intro', 'yard', 'done'];

/** I passi del cortile: ognuno si completa facendo davvero l'azione. */
export const YARD_STEPS = ['walk', 'wisp', 'clean', 'flowers', 'light', 'shop', 'place', 'edit', 'ghost', 'sheet'] as const;
export type YardStep = (typeof YARD_STEPS)[number];

/** Cosa succede nel gioco (lo segnalano Game e le schermate). */
export type YardSignal =
  | 'walked' | 'wispCollected' | 'graveCleaned' | 'flowersBrought' | 'lightToggled'
  | 'itemBought' | 'itemPlaced' | 'editDone' | 'presenceMet' | 'graveOpened';
const COMPLETES: Record<YardStep, YardSignal> = {
  walk: 'walked', wisp: 'wispCollected', clean: 'graveCleaned', flowers: 'flowersBrought', light: 'lightToggled',
  shop: 'itemBought', place: 'itemPlaced', edit: 'editDone', ghost: 'presenceMet', sheet: 'graveOpened',
};

/** I consigli al momento giusto: ognuno una volta sola (game/tips.ts). */
export const TIP_IDS = ['graveBroken', 'itemBroken', 'pet', 'memoryTree', 'photo'] as const;
export type TipId = (typeof TIP_IDS)[number];

export interface OnboardingState {
  stage: OnboardingStage;
  /** Il passo del cortile in corso (indice in YARD_STEPS; uguale alla lunghezza: finito, manca la chiusura). */
  step: number;
  /** Il primo obiettivo nel cimitero vero (la prima sepoltura): da proporre, o fatto. */
  goal: 'pending' | 'done';
  /** I consigli al momento giusto già dati. */
  tips: TipId[];
}

export const newOnboarding = (): OnboardingState => ({ stage: 'welcome', step: 0, goal: 'pending', tips: [] });
/** Le partite di prima di questo percorso: già fatto, obiettivo e consigli compresi (si può rivedere dalle Impostazioni). */
export const finishedOnboarding = (): OnboardingState => ({ stage: 'done', step: 0, goal: 'done', tips: [...TIP_IDS] });

/** Le fasi di prima del cortile (tutorial sulla mappa e giro dell'interfaccia): si riprende dal cortile. */
const OLD_STAGES = ['tutorial', 'tour'];

/** Uno stato letto da un salvataggio: solo valori noti. */
export function normalizeOnboarding(raw: Partial<OnboardingState> | undefined): OnboardingState {
  if (!raw) return finishedOnboarding();
  const stage = OLD_STAGES.includes(raw.stage as string) ? 'yard' : raw.stage;
  if (!ONBOARDING_STAGES.includes(stage as OnboardingStage)) return finishedOnboarding();
  const old = stage !== raw.stage;
  const step = !old && Number.isInteger(raw.step) ? Math.max(0, Math.min(YARD_STEPS.length, raw.step!)) : 0; // un passo che c'è
  // salvataggi di prima dell'obiettivo e dei consigli: chi aveva finito li ha già (non si ripete niente)
  const done = stage === 'done';
  const goal = raw.goal === 'pending' || raw.goal === 'done' ? raw.goal : done ? 'done' : 'pending';
  const tips = Array.isArray(raw.tips) ? TIP_IDS.filter((id) => raw.tips!.includes(id)) : done ? [...TIP_IDS] : [];
  return { stage: stage as OnboardingStage, step, goal, tips };
}

/** La fase dopo `stage` (o `done`). */
export function nextStage(stage: OnboardingStage): OnboardingStage {
  const i = ONBOARDING_STAGES.indexOf(stage);
  return ONBOARDING_STAGES[Math.min(ONBOARDING_STAGES.length - 1, i + 1)];
}

/** Il passo del cortile in corso, o null se il cortile non è in corso o è finito. */
export function currentStep(o: OnboardingState): YardStep | null {
  return o.stage === 'yard' ? YARD_STEPS[o.step] ?? null : null;
}

/** Tutti i passi del cortile fatti: manca solo la chiusura. */
export const yardFinished = (o: OnboardingState) => o.stage === 'yard' && o.step >= YARD_STEPS.length;

/**
 * Qualcosa è successo nel gioco: se è quello che chiede il passo in corso, il
 * passo è fatto. Ritorna true se il passo è avanzato. Le altre azioni non
 * contano (né premiano).
 */
export function yardSignal(o: OnboardingState, signal: YardSignal): boolean {
  const step = currentStep(o);
  if (!step || COMPLETES[step] !== signal) return false;
  o.step++;
  return true;
}
