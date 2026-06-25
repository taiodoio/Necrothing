// Pagina principale: scena + top/bottom bar + wizard + dettaglio + toast.

import { useEffect, useState } from 'react';
import { useGameStore } from '@/shared/store/gameStore';
import { CemeteryScene } from './CemeteryScene';
import { TopBar } from './TopBar';
import { BurialWizard } from '@/features/burial/BurialWizard';
import { GraveDetail } from '@/features/graves/GraveDetail';
import type { Grave } from '@/shared/domain/types';

export function CemeteryPage() {
  const graves = useGameStore((s) => s.graves);
  const lastSimMessage = useGameStore((s) => s.lastSimMessage);

  const [burialCell, setBurialCell] = useState<{ x: number; y: number } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (lastSimMessage) {
      setToast(lastSimMessage);
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [lastSimMessage]);

  return (
    <div className="app-shell">
      <TopBar />

      <CemeteryScene
        graves={graves}
        onSelectEmpty={(x, y) => setBurialCell({ x, y })}
        onSelectGrave={(g: Grave) => setDetailId(g.id)}
      />

      <div className="bottombar">
        <button
          className="btn btn--primary"
          onClick={() => {
            // trova la prima cella libera per la CTA rapida
            const occupied = new Set(graves.map((g) => `${g.gridX},${g.gridY}`));
            for (let y = 0; y < 8; y++) {
              for (let x = 0; x < 6; x++) {
                if (!occupied.has(`${x},${y}`)) {
                  setBurialCell({ x, y });
                  return;
                }
              }
            }
          }}
        >
          ⚰️ Seppellisci un oggetto
        </button>
      </div>

      {burialCell && (
        <BurialWizard
          gridX={burialCell.x}
          gridY={burialCell.y}
          onClose={() => setBurialCell(null)}
          onBuried={() => {
            setBurialCell(null);
            setToast('Sepoltura completata. Riposi in pace.');
            setTimeout(() => setToast(null), 4000);
          }}
        />
      )}

      {detailId && <GraveDetail graveId={detailId} onClose={() => setDetailId(null)} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
