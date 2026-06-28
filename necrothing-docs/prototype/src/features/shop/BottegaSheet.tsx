import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { PlaceableSprite } from '@/shared/assets/PlaceableSprite';
import { DECORATION_TYPES, STRUCTURE_TYPES, type PlaceableType } from '@/shared/domain/enums';
import { PLACEABLES } from '@/shared/domain/placeables';
import { rankForXp } from '@/shared/services/progressionService';

interface Props {
  onClose: () => void;
}

export function BottegaSheet({ onClose }: Props) {
  const buyItem = useGameStore((s) => s.buyItem);
  const wisps = useGameStore((s) => s.progression.wisps);
  const xp = useGameStore((s) => s.progression.xp);
  const inventory = useGameStore((s) => s.inventory);
  const rankLevel = rankForXp(xp).level;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async (type: PlaceableType) => {
    setBusy(true);
    setError(null);
    try {
      await buyItem(type);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setBusy(false);
    }
  };

  const group = (title: string, types: readonly PlaceableType[]) => (
    <>
      <h3 style={{ marginTop: 14 }}>{title}</h3>
      <div className="chips" style={{ gap: 10 }}>
        {types.map((type) => {
          const def = PLACEABLES[type];
          const locked = def.minRank > rankLevel;
          const tooPoor = !locked && wisps < def.cost;
          const owned = inventory[type] ?? 0;
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
                opacity: locked || tooPoor ? 0.5 : 1,
                width: 100,
              }}
              onClick={() => buy(type)}
            >
              <PlaceableSprite type={type} size={42} />
              <span style={{ fontSize: 11, textAlign: 'center' }}>{def.label}</span>
              <span style={{ fontSize: 11, color: '#9af5dd' }}>
                {locked ? `🔒 Rango ${def.minRank}` : `Compra ✦ ${def.cost}`}
              </span>
              {owned > 0 && (
                <span style={{ fontSize: 10 }} className="muted">
                  posseduti: {owned}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <Sheet title="Bottega" onClose={onClose}>
      <p className="muted" style={{ fontSize: 13 }}>
        Hai <span style={{ color: '#9af5dd' }}>✦ {wisps}</span> fuochi fatui. Compri una volta →
        l'oggetto va in <strong>Inventario</strong>, poi lo posizioni da lì.
      </p>
      {group('Decorazioni', DECORATION_TYPES)}
      {group('Strutture', STRUCTURE_TYPES)}
      {error && (
        <div className="error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </Sheet>
  );
}
