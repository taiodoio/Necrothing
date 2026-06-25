// Burial Wizard (FEATURE-001). Flusso a step, mobile-first, validazione inline.

import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import {
  emptyDraft,
  validateDates,
  validateEpitaph,
  validateName,
  type BurialDraft,
} from './validation';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEATH_CAUSES,
  DEATH_CAUSE_LABELS,
  GRAVE_TYPES,
  GRAVE_TYPE_LABELS,
} from '@/shared/domain/enums';
import { toIsoDate } from '@/shared/utils/date';

interface Props {
  gridX: number;
  gridY: number;
  onClose: () => void;
  onBuried: () => void;
}

const STEPS = ['Nome', 'Categoria', 'Date', 'Causa', 'Epitaffio', 'Lapide', 'Conferma'];

export function BurialWizard({ gridX, gridY, onClose, onBuried }: Props) {
  const bury = useGameStore((s) => s.bury);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BurialDraft>(() => ({
    ...emptyDraft(),
    gridX,
    gridY,
    deathDate: toIsoDate(new Date()),
  }));

  const patch = (p: Partial<BurialDraft>) => setDraft((d) => ({ ...d, ...p }));

  const now = new Date();
  const stepValid = (): boolean => {
    switch (step) {
      case 0:
        return !validateName(draft.name);
      case 1:
        return !!draft.category;
      case 2: {
        const e = validateDates(draft.birthDate, draft.deathDate, now);
        return !e.birthDate && !e.deathDate && !!draft.deathDate;
      }
      case 3:
        return !!draft.deathCause || !!draft.deathCauseCustom?.trim();
      case 4:
        return !validateEpitaph(draft.epitaph);
      case 5:
        return !!draft.graveType;
      default:
        return true;
    }
  };

  const last = step === STEPS.length - 1;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await bury(draft);
      onBuried();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante la sepoltura.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Nuova sepoltura" onClose={onClose}>
      <div className="wizard-steps">
        Passo {step + 1} di {STEPS.length} — {STEPS[step]}
      </div>

      {step === 0 && (
        <div className="field">
          <label htmlFor="b-name">Nome dell'oggetto morto</label>
          <input
            id="b-name"
            autoFocus
            maxLength={80}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Es. Caricatore Eterno"
          />
          {draft.name.length > 0 && validateName(draft.name) && (
            <div className="error">{validateName(draft.name)}</div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="field">
          <label>Categoria</label>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className="chip"
                aria-pressed={draft.category === c}
                onClick={() => patch({ category: c })}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="field">
            <label htmlFor="b-death">Data di morte</label>
            <input
              id="b-death"
              type="date"
              max={toIsoDate(now)}
              value={draft.deathDate ?? ''}
              onChange={(e) => patch({ deathDate: e.target.value })}
            />
            {validateDates(draft.birthDate, draft.deathDate, now).deathDate && (
              <div className="error">
                {validateDates(draft.birthDate, draft.deathDate, now).deathDate}
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="b-birth">Data di nascita (opzionale)</label>
            <input
              id="b-birth"
              type="date"
              max={draft.deathDate ?? toIsoDate(now)}
              value={draft.birthDate ?? ''}
              onChange={(e) => patch({ birthDate: e.target.value || null })}
            />
            {validateDates(draft.birthDate, draft.deathDate, now).birthDate && (
              <div className="error">
                {validateDates(draft.birthDate, draft.deathDate, now).birthDate}
              </div>
            )}
          </div>
        </>
      )}

      {step === 3 && (
        <div className="field">
          <label>Causa della morte</label>
          <div className="chips">
            {DEATH_CAUSES.map((c) => (
              <button
                key={c}
                className="chip"
                aria-pressed={draft.deathCause === c}
                onClick={() => patch({ deathCause: c, deathCauseCustom: null })}
              >
                {DEATH_CAUSE_LABELS[c]}
              </button>
            ))}
          </div>
          <input
            style={{ marginTop: 10 }}
            placeholder="…oppure scrivi una causa personalizzata"
            value={draft.deathCauseCustom ?? ''}
            onChange={(e) => patch({ deathCauseCustom: e.target.value || null, deathCause: null })}
          />
        </div>
      )}

      {step === 4 && (
        <div className="field">
          <label htmlFor="b-epi">Epitaffio (opzionale)</label>
          <textarea
            id="b-epi"
            maxLength={240}
            value={draft.epitaph ?? ''}
            onChange={(e) => patch({ epitaph: e.target.value || null })}
            placeholder="Riposa in pace, vecchio amico…"
          />
          <div className="muted" style={{ fontSize: 12 }}>
            {(draft.epitaph ?? '').length}/240
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="field">
          <label>Tipo di lapide</label>
          <div className="chips">
            {GRAVE_TYPES.map((t) => (
              <button
                key={t}
                className="chip"
                aria-pressed={draft.graveType === t}
                onClick={() => patch({ graveType: t })}
              >
                {GRAVE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <div>
          <h3>Riepilogo</h3>
          <p>
            <strong>{draft.name}</strong>
            <br />
            <span className="muted">
              {draft.category && CATEGORY_LABELS[draft.category]} · morte il {draft.deathDate}
            </span>
          </p>
          {draft.epitaph && <p className="muted">&laquo;{draft.epitaph}&raquo;</p>}
          {error && <div className="error">{error}</div>}
        </div>
      )}

      <div className="wizard-nav">
        {step > 0 ? (
          <button className="btn" onClick={() => setStep((s) => s - 1)} disabled={busy}>
            Indietro
          </button>
        ) : (
          <button className="btn" onClick={onClose} disabled={busy}>
            Annulla
          </button>
        )}
        {!last ? (
          <button
            className="btn btn--primary"
            disabled={!stepValid()}
            onClick={() => setStep((s) => s + 1)}
          >
            Avanti
          </button>
        ) : (
          <button className="btn btn--primary" disabled={busy} onClick={confirm}>
            {busy ? 'Sepoltura…' : 'Seppellisci'}
          </button>
        )}
      </div>
    </Sheet>
  );
}
