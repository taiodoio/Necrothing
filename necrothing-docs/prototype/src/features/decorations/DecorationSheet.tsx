import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { DecorationSprite } from '@/shared/assets/DecorationSprite';
import { DECORATION_LABELS } from '@/shared/domain/enums';
import type { Decoration } from '@/shared/domain/types';

interface Props {
  decoration: Decoration;
  onClose: () => void;
}

export function DecorationSheet({ decoration, onClose }: Props) {
  const remove = useGameStore((s) => s.removeDecoration);
  const [busy, setBusy] = useState(false);

  return (
    <Sheet title={DECORATION_LABELS[decoration.type]} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <DecorationSprite type={decoration.type} size={96} />
      </div>
      <div className="wizard-nav">
        <button className="btn btn--ghost" onClick={onClose} disabled={busy}>
          Chiudi
        </button>
        <button
          className="btn btn--danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await remove(decoration.id);
            onClose();
          }}
        >
          🗑 Rimuovi
        </button>
      </div>
    </Sheet>
  );
}
