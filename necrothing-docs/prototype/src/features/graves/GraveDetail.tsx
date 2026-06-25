// Dettaglio tomba: info, timeline memory events, azioni commemorazione/manutenzione.

import { useEffect, useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { GraveSprite } from '@/shared/assets/GraveSprite';
import type { Grave, GraveMemoryEvent } from '@/shared/domain/types';
import { CATEGORY_LABELS, DEATH_CAUSE_LABELS } from '@/shared/domain/enums';
import type { DeathCause } from '@/shared/domain/enums';
import type { MemoryEventType } from '@/shared/domain/enums';

const EVENT_LABELS: Record<MemoryEventType, string> = {
  burial: '⚰️ Sepoltura',
  flower: '💐 Fiori portati',
  weed_cleaned: '🌿 Erbacce rimosse',
  anniversary: '🕯️ Anniversario',
  ghost: '👻 Apparizione',
  blessing: '✝️ Benedizione',
};

interface Props {
  graveId: string;
  onClose: () => void;
}

function deathCauseLabel(cause: string): string {
  return (DEATH_CAUSE_LABELS as Record<string, string>)[cause as DeathCause] ?? cause;
}

export function GraveDetail({ graveId, onClose }: Props) {
  const grave = useGameStore((s) => s.graves.find((g) => g.id === graveId)) as Grave | undefined;
  const bringFlowers = useGameStore((s) => s.bringFlowers);
  const cleanWeeds = useGameStore((s) => s.cleanWeeds);
  const loadEvents = useGameStore((s) => s.loadEvents);
  const [events, setEvents] = useState<GraveMemoryEvent[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadEvents(graveId).then((e) => active && setEvents(e));
    return () => {
      active = false;
    };
  }, [graveId, loadEvents, grave?.updatedAt]);

  if (!grave) {
    onClose();
    return null;
  }

  const doAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={grave.name} onClose={onClose}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <GraveSprite
          type={grave.graveType}
          hasFlowers={grave.hasFlowers}
          hasWeeds={grave.hasWeeds}
          size={84}
        />
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div>{CATEGORY_LABELS[grave.category]}</div>
          <div>Morte: {grave.deathDate}</div>
          {grave.birthDate && <div>Nascita: {grave.birthDate}</div>}
          <div>Causa: {deathCauseLabel(grave.deathCause)}</div>
        </div>
      </div>

      {grave.epitaph && (
        <p style={{ fontStyle: 'italic', marginTop: 12 }}>&laquo;{grave.epitaph}&raquo;</p>
      )}

      <div className="wizard-nav">
        <button
          className="btn btn--primary"
          disabled={busy}
          onClick={() => doAction(() => bringFlowers(grave.id))}
        >
          💐 Porta fiori
        </button>
        {grave.hasWeeds && (
          <button
            className="btn"
            disabled={busy}
            onClick={() => doAction(() => cleanWeeds(grave.id))}
          >
            🌿 Pulisci erbacce
          </button>
        )}
      </div>

      <h3 style={{ marginTop: 18 }}>Memoria della tomba</h3>
      <ul className="timeline">
        {events.length === 0 && <li className="muted">Nessun evento ancora.</li>}
        {[...events].reverse().map((e) => (
          <li key={e.id}>
            <span>{EVENT_LABELS[e.type]}</span>
            <span className="when" style={{ marginLeft: 'auto' }}>
              {new Date(e.occurredAt).toLocaleDateString('it-IT')}
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
