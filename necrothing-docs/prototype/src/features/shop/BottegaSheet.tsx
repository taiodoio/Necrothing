import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { PlaceableSprite } from '@/shared/assets/PlaceableSprite';
import {
  PLACEABLE_TYPES,
  PLACEABLE_CATEGORIES,
  PLACEABLE_CATEGORY_LABELS,
  isSeasonallyAvailable,
  type PlaceableType,
} from '@/shared/domain/enums';
import { PLACEABLES, isUnique } from '@/shared/domain/placeables';
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
  const [selected, setSelected] = useState<PlaceableType | null>(null);
  const [qty, setQty] = useState(1);

  const selectedDef = selected ? PLACEABLES[selected] : null;
  const maxAffordable = selectedDef ? Math.max(0, Math.floor(wisps / selectedDef.cost)) : 0;
  const maxQty = selected && isUnique(selected) ? 1 : Math.min(maxAffordable, 9);

  const handleSelect = (type: PlaceableType) => {
    if (selected === type) {
      setSelected(null);
    } else {
      setSelected(type);
      setQty(1);
    }
  };

  const handleBuy = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      for (let i = 0; i < qty; i++) {
        await buyItem(selected);
      }
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setBusy(false);
    }
  };

  const month = new Date().getMonth();

  const group = (title: string, types: readonly PlaceableType[]) => {
    if (types.length === 0) return null;
    return (
      <>
        <h3 style={{ marginTop: 14 }}>{title}</h3>
        <div className="chips" style={{ gap: 10 }}>
          {types.map((type) => {
            const def = PLACEABLES[type];
            const locked = def.minRank > rankLevel;
            const tooPoor = !locked && wisps < def.cost;
            const owned = inventory[type] ?? 0;
            const unique = isUnique(type);
            const alreadyOwned = unique && owned >= 1;
            const isSelected = selected === type;
            return (
              <button
                key={type}
                className="chip"
                disabled={locked || (tooPoor && !alreadyOwned) || busy}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: 'auto',
                  padding: '8px 10px',
                  opacity: locked || tooPoor ? 0.5 : 1,
                  width: 100,
                  outline: isSelected ? '2px solid #9af5dd' : undefined,
                  outlineOffset: isSelected ? 2 : undefined,
                }}
                onClick={() => handleSelect(type)}
              >
                <PlaceableSprite type={type} size={42} />
                <span style={{ fontSize: 11, textAlign: 'center' }}>{def.label}</span>
                <span style={{ fontSize: 11, color: '#9af5dd' }}>
                  {locked
                    ? `🔒 Rango ${def.minRank}`
                    : alreadyOwned
                    ? '✓ Già posseduta'
                    : `✦ ${def.cost}`}
                </span>
                {owned > 0 && !unique && (
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
  };

  return (
    <Sheet title="Bottega" onClose={onClose}>
      <p className="muted" style={{ fontSize: 13 }}>
        Hai <span style={{ color: '#9af5dd' }}>✦ {wisps}</span> fuochi fatui. Acquista →
        va in <strong>Inventario</strong>, poi lo posizioni dalla mappa.
      </p>

      {PLACEABLE_CATEGORIES.map((cat) => (
        <div key={cat}>
          {group(
            PLACEABLE_CATEGORY_LABELS[cat],
            PLACEABLE_TYPES.filter(
              (t) => PLACEABLES[t].category === cat && isSeasonallyAvailable(t, month),
            ),
          )}
        </div>
      ))}

      {error && (
        <div className="error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}

      {/* Barra di acquisto: compare quando si seleziona un elemento */}
      {selected && selectedDef && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'var(--bg-elev)',
            borderTop: '1px solid var(--line)',
            padding: '12px 0 4px',
            marginTop: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <PlaceableSprite type={selected} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedDef.label}</div>
              <div style={{ fontSize: 12, color: '#9af5dd' }}>
                ✦ {selectedDef.cost} × {qty} = {selectedDef.cost * qty}
              </div>
            </div>
            {!isUnique(selected) && maxAffordable > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: 18, lineHeight: 1 }}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || busy}
                >
                  −
                </button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                <button
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: 18, lineHeight: 1 }}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty || busy}
                >
                  +
                </button>
              </div>
            )}
          </div>
          <div className="wizard-nav" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setSelected(null)} disabled={busy}>
              Annulla
            </button>
            <button
              className="btn btn--primary"
              onClick={handleBuy}
              disabled={busy || maxAffordable === 0}
            >
              {busy ? 'Acquisto…' : qty > 1 ? `Acquista (${qty})` : 'Acquista'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
