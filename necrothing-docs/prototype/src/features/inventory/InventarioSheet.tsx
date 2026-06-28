import { useState } from 'react';
import { Sheet } from '@/shared/components/Sheet';
import { useGameStore } from '@/shared/store/gameStore';
import { PlaceableSprite } from '@/shared/assets/PlaceableSprite';
import { PLACEABLE_TYPES, type PlaceableType } from '@/shared/domain/enums';
import { PLACEABLES } from '@/shared/domain/placeables';
import { sellPrice } from '@/shared/services/inventoryService';

interface Props {
  onClose: () => void;
  /** Richiesta di posizionamento del tipo selezionato (gestita dalla pagina). */
  onPlace: (type: PlaceableType) => void;
}

export function InventarioSheet({ onClose, onPlace }: Props) {
  const inventory = useGameStore((s) => s.inventory);
  const sellItem = useGameStore((s) => s.sellItem);
  const [busy, setBusy] = useState(false);

  const owned = PLACEABLE_TYPES.filter((t) => (inventory[t] ?? 0) > 0);

  return (
    <Sheet title="Inventario" onClose={onClose}>
      {owned.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>
          Inventario vuoto. Compra elementi nella <strong>Bottega</strong>.
        </p>
      ) : (
        <ul className="timeline">
          {owned.map((type) => {
            const def = PLACEABLES[type];
            const count = inventory[type] ?? 0;
            return (
              <li key={type} style={{ alignItems: 'center' }}>
                <PlaceableSprite type={type} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{def.label}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    posseduti: {count} · vendita +✦ {sellPrice(type)}
                  </div>
                </div>
                <button
                  className="btn btn--primary"
                  style={{ minHeight: 36, padding: '0 12px', flex: 'none' }}
                  disabled={busy}
                  onClick={() => onPlace(type)}
                >
                  Inserisci
                </button>
                <button
                  className="btn"
                  style={{ minHeight: 36, padding: '0 10px', flex: 'none', marginLeft: 6 }}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await sellItem(type);
                    setBusy(false);
                  }}
                >
                  Vendi
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
