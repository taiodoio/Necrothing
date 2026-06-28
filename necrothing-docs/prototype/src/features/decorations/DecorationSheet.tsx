import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { PlaceableSprite } from '@/shared/assets/PlaceableSprite';
import { PLACEABLES, isRotatable } from '@/shared/domain/placeables';

interface Props {
  id: string;
  onClose: () => void;
  onMove: (id: string) => void;
  onChange: (id: string) => void;
}

export function DecorationSheet({ id, onClose, onMove, onChange }: Props) {
  const placeable = useGameStore((s) => s.decorations.find((d) => d.id === id));
  const remove = useGameStore((s) => s.removeDecoration);
  const rotate = useGameStore((s) => s.rotatePlaceable);
  const setText = useGameStore((s) => s.setPlaceableText);
  const [busy, setBusy] = useState(false);
  const [text, setTextLocal] = useState(placeable?.text ?? '');

  if (!placeable) {
    onClose();
    return null;
  }
  const def = PLACEABLES[placeable.type];
  const isSign = placeable.type === 'sign';

  return (
    <Sheet title={def.label} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <span
          style={{
            display: 'flex',
            transform: placeable.rotation ? `rotate(${placeable.rotation}deg)` : undefined,
          }}
        >
          <PlaceableSprite type={placeable.type} size={96} />
        </span>
      </div>
      <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
        {def.kind === 'structure' ? 'Struttura' : 'Decorazione'} · {def.footprint[0]}×
        {def.footprint[1]}
        {placeable.rotation === 90 ? ' · ruotata' : ''}
      </p>

      {isSign && (
        <div className="field">
          <label htmlFor="sign-text">Testo del cartello</label>
          <input
            id="sign-text"
            value={text}
            maxLength={60}
            placeholder="Es. Qui giace…"
            onChange={(e) => setTextLocal(e.target.value)}
            onBlur={() => setText(placeable.id, text)}
          />
        </div>
      )}
      {!isSign && placeable.text && (
        <p style={{ fontStyle: 'italic', textAlign: 'center' }}>«{placeable.text}»</p>
      )}

      <div className="wizard-nav">
        <button className="btn" disabled={busy} onClick={() => onMove(placeable.id)}>
          ✋ Sposta
        </button>
        {isRotatable(placeable.type) && (
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await rotate(placeable.id);
              setBusy(false);
            }}
          >
            ⟳ Ruota
          </button>
        )}
      </div>
      <div className="wizard-nav">
        <button className="btn" disabled={busy} onClick={() => onChange(placeable.id)}>
          🔁 Cambia
        </button>
        <button
          className="btn btn--danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await remove(placeable.id);
            onClose();
          }}
        >
          🗑 Rimuovi
        </button>
      </div>
    </Sheet>
  );
}
