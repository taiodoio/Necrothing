import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { PlaceableSprite } from '@/shared/assets/PlaceableSprite';
import { DECORATION_TYPES, STRUCTURE_TYPES, type PlaceableType } from '@/shared/domain/enums';
import { PLACEABLES } from '@/shared/domain/placeables';
import { rankForXp } from '@/shared/services/progressionService';

interface Props {
  gridX: number;
  gridY: number;
  onClose: () => void;
  onPlaced: () => void;
  // modalità "cambia": sostituisce un elemento esistente con footprint compatibile
  replaceMode?: boolean;
  footprintFilter?: [number, number];
  onReplace?: (type: PlaceableType) => Promise<void> | void;
}

export function PlaceablePicker({
  gridX,
  gridY,
  onClose,
  onPlaced,
  replaceMode = false,
  footprintFilter,
  onReplace,
}: Props) {
  const place = useGameStore((s) => s.placeDecoration);
  const xp = useGameStore((s) => s.progression.xp);
  const wisps = useGameStore((s) => s.progression.wisps);
  const rankLevel = rankForXp(xp).level;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tryPlace = async (type: PlaceableType) => {
    setBusy(true);
    setError(null);
    try {
      if (replaceMode && onReplace) {
        await onReplace(type);
      } else {
        await place(type, gridX, gridY);
      }
      onPlaced();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
      setBusy(false);
    }
  };

  const footprintMatches = (type: PlaceableType) => {
    if (!replaceMode || !footprintFilter) return true;
    const [w, h] = PLACEABLES[type].footprint;
    return w === footprintFilter[0] && h === footprintFilter[1];
  };

  const renderGroup = (title: string, allTypes: readonly PlaceableType[]) => {
    const types = allTypes.filter(footprintMatches);
    if (types.length === 0) return null;
    return (
      <>
        <h3 style={{ marginTop: 14 }}>{title}</h3>
        <div className="chips" style={{ gap: 10 }}>
          {types.map((type) => {
            const def = PLACEABLES[type];
            const locked = def.minRank > rankLevel;
            const tooPoor = !replaceMode && !locked && wisps < def.cost;
            const [w, h] = def.footprint;
            return (
              <button
                key={type}
                className="chip"
                disabled={locked || tooPoor || busy}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: 'auto',
                  padding: '8px 10px',
                  opacity: locked || tooPoor ? 0.45 : 1,
                  width: 96,
                }}
                onClick={() => tryPlace(type)}
              >
                <PlaceableSprite type={type} size={42} />
                <span style={{ fontSize: 11, textAlign: 'center' }}>{def.label}</span>
                <span style={{ fontSize: 11, color: '#9af5dd' }}>
                  {locked ? `🔒 Rango ${def.minRank}` : replaceMode ? `${w}×${h}` : `✦ ${def.cost}`}
                  {!replaceMode && (w > 1 || h > 1) ? ` · ${w}×${h}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <Sheet title={replaceMode ? 'Cambia elemento' : 'Decora / Costruisci'} onClose={onClose}>
      <p className="muted" style={{ fontSize: 13 }}>
        {replaceMode ? (
          'Scegli un elemento dello stesso ingombro con cui sostituire.'
        ) : (
          <>
            Hai <span style={{ color: '#9af5dd' }}>✦ {wisps}</span> fuochi fatui. I tipi si
            sbloccano col rango; il piazzamento costa fuochi fatui.
          </>
        )}
      </p>
      {renderGroup('Decorazioni', DECORATION_TYPES)}
      {renderGroup('Strutture', STRUCTURE_TYPES)}
      {error && (
        <div className="error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </Sheet>
  );
}
