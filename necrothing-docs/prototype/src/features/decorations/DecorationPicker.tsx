import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { DecorationSprite } from '@/shared/assets/DecorationSprite';
import {
  DECORATION_LABELS,
  DECORATION_MIN_RANK,
  DECORATION_TYPES,
} from '@/shared/domain/enums';
import { rankForXp } from '@/shared/services/progressionService';

interface Props {
  gridX: number;
  gridY: number;
  onClose: () => void;
  onPlaced: () => void;
}

export function DecorationPicker({ gridX, gridY, onClose, onPlaced }: Props) {
  const place = useGameStore((s) => s.placeDecoration);
  const xp = useGameStore((s) => s.progression.xp);
  const rankLevel = rankForXp(xp).level;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Sheet title="Decora la zolla" onClose={onClose}>
      <p className="muted" style={{ fontSize: 13 }}>
        Le decorazioni si sbloccano salendo di rango.
      </p>
      <div className="chips" style={{ gap: 12 }}>
        {DECORATION_TYPES.map((type) => {
          const locked = DECORATION_MIN_RANK[type] > rankLevel;
          return (
            <button
              key={type}
              className="chip"
              disabled={locked || busy}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: 'auto',
                padding: '8px 10px',
                opacity: locked ? 0.45 : 1,
              }}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await place(type, gridX, gridY);
                  onPlaced();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Errore.');
                  setBusy(false);
                }
              }}
            >
              <DecorationSprite type={type} size={44} />
              <span style={{ fontSize: 12 }}>
                {locked ? `🔒 Rango ${DECORATION_MIN_RANK[type]}` : DECORATION_LABELS[type]}
              </span>
            </button>
          );
        })}
      </div>
      {error && <div className="error">{error}</div>}
    </Sheet>
  );
}
