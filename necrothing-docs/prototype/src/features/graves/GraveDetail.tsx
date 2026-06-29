// Dettaglio tomba: info, timeline memory events, azioni commemorazione/manutenzione.

import { useEffect, useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { GraveSprite } from '@/shared/assets/GraveSprite';
import { imageStorageService } from '@/shared/services/imageStorageService';
import { shareOrDownloadCard } from '@/shared/services/shareService';
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
  onDeleted?: () => void;
  onMoveHint?: () => void;
}

function deathCauseLabel(cause: string): string {
  return (DEATH_CAUSE_LABELS as Record<string, string>)[cause as DeathCause] ?? cause;
}

export function GraveDetail({ graveId, onClose, onDeleted, onMoveHint }: Props) {
  const grave = useGameStore((s) => s.graves.find((g) => g.id === graveId)) as Grave | undefined;
  const bringFlowers = useGameStore((s) => s.bringFlowers);
  const cleanWeeds = useGameStore((s) => s.cleanWeeds);
  const repairGrave = useGameStore((s) => s.repairGrave);
  const removeGrave = useGameStore((s) => s.removeGrave);
  const shareGrave = useGameStore((s) => s.shareGrave);
  const loadEvents = useGameStore((s) => s.loadEvents);
  const [events, setEvents] = useState<GraveMemoryEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadEvents(graveId).then((e) => active && setEvents(e));
    return () => {
      active = false;
    };
  }, [graveId, loadEvents, grave?.updatedAt]);

  const photoId = grave?.photoId ?? null;
  useEffect(() => {
    let url: string | null = null;
    let active = true;
    if (photoId) {
      imageStorageService.getBlob(photoId).then((blob) => {
        if (active && blob) {
          url = URL.createObjectURL(blob);
          setPhotoUrl(url);
        }
      });
    } else {
      setPhotoUrl(null);
    }
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photoId]);

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
          isDirty={grave.isDirty}
          broken={grave.broken}
          size={84}
        />
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div>{CATEGORY_LABELS[grave.category]}</div>
          <div>Morte: {grave.deathDate}</div>
          {grave.birthDate && <div>Nascita: {grave.birthDate}</div>}
          <div>Causa: {deathCauseLabel(grave.deathCause)}</div>
        </div>
      </div>

      {photoUrl && (
        <img
          src={photoUrl}
          alt={`Foto di ${grave.name}`}
          style={{
            width: '100%',
            maxHeight: 240,
            objectFit: 'cover',
            borderRadius: 12,
            marginTop: 12,
            imageRendering: 'pixelated',
          }}
        />
      )}

      {grave.epitaph && (
        <p style={{ fontStyle: 'italic', marginTop: 12 }}>&laquo;{grave.epitaph}&raquo;</p>
      )}

      <div className="wizard-nav">
        {grave.broken ? (
          <button
            className="btn btn--primary"
            disabled={busy}
            onClick={() => doAction(() => repairGrave(grave.id))}
          >
            🛠️ Ripara
          </button>
        ) : (
          <>
            <button
              className="btn btn--primary"
              disabled={busy}
              onClick={() => doAction(() => bringFlowers(grave.id))}
            >
              💐 Porta fiori
            </button>
            {(grave.hasWeeds || grave.isDirty) && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => doAction(() => cleanWeeds(grave.id))}
              >
                🧹 Pulisci
              </button>
            )}
          </>
        )}
      </div>

      <div className="wizard-nav">
        {onMoveHint && (
          <button className="btn" disabled={busy} onClick={onMoveHint}>
            ✋ Sposta
          </button>
        )}
        <button
          className="btn"
          disabled={busy}
          onClick={() =>
            doAction(async () => {
              await shareOrDownloadCard(grave);
              await shareGrave(grave.id);
            })
          }
        >
          📜 Condividi
        </button>
        <button
          className="btn btn--danger"
          disabled={busy}
          onClick={() =>
            doAction(async () => {
              await removeGrave(grave.id);
              if (onDeleted) onDeleted();
              else onClose();
            })
          }
        >
          🗑 Elimina
        </button>
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
