// Pagina principale: scena + top/bottom bar + wizard + dettaglio + toast.

import { useEffect, useState } from 'react';
import { useGameStore } from '@/shared/store/gameStore';
import { CemeteryScene } from './CemeteryScene';
import { TopBar } from './TopBar';
import { CellActionSheet } from './CellActionSheet';
import { BurialWizard } from '@/features/burial/BurialWizard';
import { GraveDetail } from '@/features/graves/GraveDetail';
import { PlaceablePicker } from '@/features/decorations/PlaceablePicker';
import { DecorationSheet } from '@/features/decorations/DecorationSheet';
import { FuneralScene } from '@/features/funeral/FuneralScene';
import { GRAVE_FOOTPRINT, MAP_COLS, MAP_ROWS, type Decoration, type Grave } from '@/shared/domain/types';
import { buildOccupancy, canPlace } from '@/shared/domain/placeables';

export function CemeteryPage() {
  const graves = useGameStore((s) => s.graves);
  const decorations = useGameStore((s) => s.decorations);
  const world = useGameStore((s) => s.world);
  const collectWisp = useGameStore((s) => s.collectWisp);
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
        placeables={decorations}
        looseWisps={world?.looseWisps ?? []}
        weather={world?.currentWeather ?? 'gloomy_clear'}
        dayPhase={world?.currentDayPhase ?? 'day'}
        onSelectEmpty={(x, y) => setActionCell({ x, y })}
        onSelectGrave={(g: Grave) => setDetailId(g.id)}
        onSelectPlaceable={(d: Decoration) => setDecorationSel(d)}
        onCollectWisp={(id) => collectWisp(id)}
      />

      <div className="bottombar">
        <button
          className="btn btn--primary"
          onClick={() => {
            // trova il primo spazio 2×2 libero per la CTA rapida
            const occ = buildOccupancy(graves, decorations);
            for (let y = 0; y < MAP_ROWS; y++) {
              for (let x = 0; x < MAP_COLS; x++) {
                if (canPlace(x, y, GRAVE_FOOTPRINT, occ, MAP_COLS, MAP_ROWS)) {
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
        <PlaceablePicker
          gridX={decorateCell.x}
          gridY={decorateCell.y}
          onClose={() => setDecorateCell(null)}
          onPlaced={() => {
            setDecorateCell(null);
            setToast('Elemento posizionato.');
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
