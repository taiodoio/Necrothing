// Il percorso del primo ingresso, nel salvataggio (si riprende dove ci si era
// fermati; una partita nuova lo rifà da capo): la pergamena di benvenuto, il
// nome, una breve introduzione, il tutorial con azioni vere nella scena, il
// giro dell'interfaccia. Ogni fase si può saltare; si può rivedere dalle
// Impostazioni senza toccare la partita. Il tutorial non dà ricompense sue:
// le azioni vere danno le loro, come sempre. Le schermate: ui/onboarding.ts.

export type OnboardingStage = 'welcome' | 'name' | 'intro' | 'tutorial' | 'tour' | 'done';
export const ONBOARDING_STAGES: readonly OnboardingStage[] = ['welcome', 'name', 'intro', 'tutorial', 'tour', 'done'];

/** I passi del tutorial: ognuno si completa facendo davvero l'azione. */
export const TUTORIAL_STEPS = ['wisp', 'visit', 'light', 'clean', 'bury'] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** Cosa succede nel gioco (lo segnalano Game e le schermate). */
export type TutorialSignal = 'wispCollected' | 'graveOpened' | 'lightToggled' | 'graveCleaned' | 'burialOpened';
const COMPLETES: Record<TutorialStep, TutorialSignal> = {
  wisp: 'wispCollected', visit: 'graveOpened', light: 'lightToggled', clean: 'graveCleaned', bury: 'burialOpened',
};

export interface OnboardingState {
  stage: OnboardingStage;
  /** Il passo del tutorial in corso (indice in TUTORIAL_STEPS). */
  step: number;
}

export const newOnboarding = (): OnboardingState => ({ stage: 'welcome', step: 0 });
/** Le partite di prima di questo percorso: già fatto (si può rivedere dalle Impostazioni). */
export const finishedOnboarding = (): OnboardingState => ({ stage: 'done', step: 0 });

/** Uno stato letto da un salvataggio: solo valori noti. */
export function normalizeOnboarding(raw: Partial<OnboardingState> | undefined): OnboardingState {
  if (!raw || !ONBOARDING_STAGES.includes(raw.stage as OnboardingStage)) return finishedOnboarding();
  const step = Number.isInteger(raw.step) ? Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, raw.step!)) : 0; // un passo che c'è
  return { stage: raw.stage as OnboardingStage, step };
}

/** La fase dopo `stage` (o `done`). */
export function nextStage(stage: OnboardingStage): OnboardingStage {
  const i = ONBOARDING_STAGES.indexOf(stage);
  return ONBOARDING_STAGES[Math.min(ONBOARDING_STAGES.length - 1, i + 1)];
}

/** Il passo del tutorial in corso, o null se il tutorial non è in corso o è finito. */
export function currentStep(o: OnboardingState): TutorialStep | null {
  return o.stage === 'tutorial' ? TUTORIAL_STEPS[o.step] ?? null : null;
}

/**
 * Qualcosa è successo nel gioco: se è quello che chiede il passo in corso, il
 * passo è fatto (e, dopo l'ultimo, si passa al giro dell'interfaccia). Ritorna
 * true se il passo è avanzato. Le altre azioni non contano (né premiano).
 */
export function tutorialSignal(o: OnboardingState, signal: TutorialSignal): boolean {
  const step = currentStep(o);
  if (!step || COMPLETES[step] !== signal) return false;
  o.step++;
  if (o.step >= TUTORIAL_STEPS.length) { o.stage = 'tour'; o.step = 0; }
  return true;
}
