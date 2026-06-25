// Pagina principale: scena + top/bottom bar + wizard + dettaglio + toast.

import { useEffect, useState } from 'react';
import { useGameStore } from '@/shared/store/gameStore';
import { CemeteryScene } from './CemeteryScene';
import { TopBar } from './TopBar';
import { CellActionSheet } from './CellActionSheet';
import { BurialWizard } from '@/features/burial/BurialWizard';
import { GraveDetail } from '@/features/graves/GraveDetail';
import { DecorationPicker } from '@/features/decorations/DecorationPicker';
import { DecorationSheet } from '@/features/decorations/DecorationSheet';
import { FuneralScene } from '@/features/funeral/FuneralScene';
import type { Decoration, Grave } from '@/shared/domain/types';

export function CemeteryPage() {
  const graves = useGameStore((s) => s.graves);
  const decorations = useGameStore((s) => s.decorations);
  const lastSimMessage = useGameStore((s) => s.lastSimMessage);
  const lastUnlockedAchievement = useGameStore((s) => s.lastUnlockedAchievement);

  const [actionCell, setActionCell] = useState<{ x: number; y: number } | null>(null);
  const [burialCell, setBurialCell] = useState<{ x: number; y: number } | null>(null);
  const [decorateCell, setDecorateCell] = useState<{ x: number; y: number } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decorationSel, setDecorationSel] = useState<Decoration | null>(null);
  const [funeralGrave, setFuneralGrave] = useState<Grave | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (lastSimMessage) {
      setToast(lastSimMessage);
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [lastSimMessage]);

  useEffect(() => {
    if (lastUnlockedAchievement) {
      setToast(`🏆 Achievement sbloccato: ${lastUnlockedAchievement}`);
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [lastUnlockedAchievement]);

  return (
    <div className="app-shell">
      <TopBar />

      <CemeteryScene
        graves={graves}
        decorations={decorations}
        onSelectEmpty={(x, y) => setActionCell({ x, y })}
        onSelectGrave={(g: Grave) => setDetailId(g.id)}
        onSelectDecoration={(d: Decoration) => setDecorationSel(d)}
      />

      <div className="bottombar">
        <button
          className="btn btn--primary"
          onClick={() => {
            // trova la prima cella libera per la CTA rapida
            const occupied = new Set([
              ...graves.map((g) => `${g.gridX},${g.gridY}`),
              ...decorations.map((d) => `${d.gridX},${d.gridY}`),
            ]);
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

      {actionCell && (
        <CellActionSheet
          onClose={() => setActionCell(null)}
          onBury={() => {
            setBurialCell(actionCell);
            setActionCell(null);
          }}
          onDecorate={() => {
            setDecorateCell(actionCell);
            setActionCell(null);
          }}
        />
      )}

      {burialCell && (
        <BurialWizard
          gridX={burialCell.x}
          gridY={burialCell.y}
          onClose={() => setBurialCell(null)}
          onBuried={(grave) => {
            setBurialCell(null);
            setFuneralGrave(grave);
          }}
        />
      )}

      {decorateCell && (
        <DecorationPicker
          gridX={decorateCell.x}
          gridY={decorateCell.y}
          onClose={() => setDecorateCell(null)}
          onPlaced={() => {
            setDecorateCell(null);
            setToast('Decorazione posizionata.');
            setTimeout(() => setToast(null), 4000);
          }}
        />
      )}

      {detailId && <GraveDetail graveId={detailId} onClose={() => setDetailId(null)} />}

      {decorationSel && (
        <DecorationSheet decoration={decorationSel} onClose={() => setDecorationSel(null)} />
      )}

      {funeralGrave && (
        <FuneralScene
          grave={funeralGrave}
          onDone={() => {
            setFuneralGrave(null);
            setToast('Sepoltura completata. Riposi in pace.');
            setTimeout(() => setToast(null), 4000);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
