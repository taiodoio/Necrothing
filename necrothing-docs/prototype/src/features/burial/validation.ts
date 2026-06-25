// Validazioni del Burial Wizard (FEATURE-001).

import type { Category, DeathCause, GraveType } from '@/shared/domain/enums';
import { isFutureDate, toIsoDate } from '@/shared/utils/date';

export interface BurialDraft {
  name: string;
  category: Category | null;
  birthDate: string | null;
  deathDate: string | null;
  deathCause: DeathCause | null;
  deathCauseCustom: string | null;
  epitaph: string | null;
  photoId: string | null;
  graveType: GraveType | null;
  gridX: number | null;
  gridY: number | null;
}

export type BurialErrors = Partial<Record<keyof BurialDraft, string>>;

export function emptyDraft(): BurialDraft {
  return {
    name: '',
    category: null,
    birthDate: null,
    deathDate: null,
    deathCause: null,
    deathCauseCustom: null,
    epitaph: null,
    photoId: null,
    graveType: 'wood_cross',
    gridX: null,
    gridY: null,
  };
}

export function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length < 1) return 'Il nome è obbligatorio.';
  if (trimmed.length > 80) return 'Massimo 80 caratteri.';
  return undefined;
}

export function validateEpitaph(epitaph: string | null): string | undefined {
  if (epitaph && epitaph.length > 240) return 'Massimo 240 caratteri.';
  return undefined;
}

export function validateDates(
  birthDate: string | null,
  deathDate: string | null,
  now: Date,
): { birthDate?: string; deathDate?: string } {
  const errors: { birthDate?: string; deathDate?: string } = {};
  if (!deathDate) {
    errors.deathDate = 'La data di morte è obbligatoria.';
  } else if (isFutureDate(deathDate, now)) {
    errors.deathDate = 'La data di morte non può essere futura.';
  }
  if (birthDate && deathDate && birthDate > deathDate) {
    errors.birthDate = 'La nascita deve precedere la morte.';
  }
  return errors;
}

/** Validazione completa del draft. Ritorna mappa errori (vuota se valido). */
export function validateBurial(draft: BurialDraft, now: Date): BurialErrors {
  const errors: BurialErrors = {};
  const nameErr = validateName(draft.name);
  if (nameErr) errors.name = nameErr;
  if (!draft.category) errors.category = 'Scegli una categoria.';
  const dateErrs = validateDates(draft.birthDate, draft.deathDate ?? toIsoDate(now), now);
  if (!draft.deathDate) errors.deathDate = 'La data di morte è obbligatoria.';
  else Object.assign(errors, dateErrs);
  if (!draft.deathCause && !draft.deathCauseCustom?.trim()) {
    errors.deathCause = 'Indica una causa di morte.';
  }
  const epiErr = validateEpitaph(draft.epitaph);
  if (epiErr) errors.epitaph = epiErr;
  if (!draft.graveType) errors.graveType = 'Scegli una lapide.';
  if (draft.gridX === null || draft.gridY === null) {
    errors.gridX = 'Seleziona una cella libera.';
  }
  return errors;
}

export function isValidBurial(draft: BurialDraft, now: Date): boolean {
  return Object.keys(validateBurial(draft, now)).length === 0;
}
