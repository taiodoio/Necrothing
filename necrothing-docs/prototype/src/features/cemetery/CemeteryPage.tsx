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
import { GRAVE_FOOTPRINT, MAP_COLS, MAP_ROWS, type Grave } from '@/shared/domain/types';
import { buildOccupancy, canPlace, PLACEABLES } from '@/shared/domain/placeables';

export function CemeteryPage() {
  const graves = useGameStore((s) => s.graves);
  const decorations = useGameStore((s) => s.decorations);
  const world = useGameStore((s) => s.world);
  const collectWisp = useGameStore((s) => s.collectWisp);
  const movePlaceable = useGameStore((s) => s.movePlaceable);
  const changePlaceable = useGameStore((s) => s.changePlaceable);
  const lastSimMessage = useGameStore((s) => s.lastSimMessage);
  const lastUnlockedAchievement = useGameStore((s) => s.lastUnlockedAchievement);

  const [actionCell, setActionCell] = useState<{ x: number; y: number } | null>(null);
  const [burialCell, setBurialCell] = useState<{ x: number; y: number } | null>(null);
  const [decorateCell, setDecorateCell] = useState<{ x: number; y: number } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decorationSelId, setDecorationSelId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ id: string; footprint: [number, number] } | null>(null);
  const [funeralGrave, setFuneralGrave] = useState<Grave | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

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
        movingId={movingId}
        onSelectEmpty={(x, y) => {
          if (movingId) {
            movePlaceable(movingId, x, y)
              .then(() => {
                setMovingId(null);
                showToast('Elemento spostato.');
              })
              .catch((e) => showToast(e instanceof Error ? e.message : 'Errore.'));
            return;
          }
          setActionCell({ x, y });
        }}
        onSelectGrave={(g: Grave) => setDetailId(g.id)}
        onSelectPlaceable={(d) => {
          if (movingId) return;
          setDecorationSelId(d.id);
        }}
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

      {decorationSelId && (
        <DecorationSheet
          id={decorationSelId}
          onClose={() => setDecorationSelId(null)}
          onMove={(id) => {
            setDecorationSelId(null);
            setMovingId(id);
          }}
          onChange={(id) => {
            const p = decorations.find((d) => d.id === id);
            if (!p) return;
            setDecorationSelId(null);
            setReplaceTarget({ id, footprint: PLACEABLES[p.type].footprint });
          }}
        />
      )}

      {replaceTarget && (
        <PlaceablePicker
          gridX={0}
          gridY={0}
          replaceMode
          footprintFilter={replaceTarget.footprint}
          onReplace={(type) => changePlaceable(replaceTarget.id, type)}
          onClose={() => setReplaceTarget(null)}
          onPlaced={() => {
            setReplaceTarget(null);
            showToast('Elemento cambiato.');
          }}
        />
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

      {movingId && (
        <div className="move-banner">
          ✋ Tocca la cella di destinazione
          <button className="btn btn--ghost" onClick={() => setMovingId(null)}>
            Annulla
          </button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
