import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { PlaceableSprite } from '@/shared/assets/PlaceableSprite';
import { PLACEABLES } from '@/shared/domain/placeables';
import type { Decoration } from '@/shared/domain/types';

interface Props {
  decoration: Decoration;
  onClose: () => void;
}

export function DecorationSheet({ decoration, onClose }: Props) {
  const remove = useGameStore((s) => s.removeDecoration);
  const [busy, setBusy] = useState(false);
  const def = PLACEABLES[decoration.type];

  return (
    <Sheet title={def.label} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <PlaceableSprite type={decoration.type} size={96} />
      </div>
      <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
        {def.kind === 'structure' ? 'Struttura' : 'Decorazione'} · {def.footprint[0]}×
        {def.footprint[1]}
      </p>
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
