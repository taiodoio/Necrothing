// Scena cimitero: griglia di celle SVG, mobile-first. Tap su cella.

import { useMemo } from 'react';
import { GRID_COLS, GRID_ROWS, type Grave } from '@/shared/domain/types';
import { GraveSprite } from '@/shared/assets/GraveSprite';
import { EmptyPlotSprite } from '@/shared/assets/EmptyPlotSprite';

interface Props {
  graves: Grave[];
  onSelectEmpty: (gridX: number, gridY: number) => void;
  onSelectGrave: (grave: Grave) => void;
}

export function CemeteryScene({ graves, onSelectEmpty, onSelectGrave }: Props) {
  const byCell = useMemo(() => {
    const map = new Map<string, Grave>();
    for (const g of graves) map.set(`${g.gridX},${g.gridY}`, g);
    return map;
  }, [graves]);

  const cells = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const grave = byCell.get(`${x},${y}`);
      cells.push(
        <button
          key={`${x},${y}`}
          className="cell"
          onClick={() =>
            grave ? onSelectGrave(grave) : onSelectEmpty(x, y)
          }
          aria-label={grave ? `Tomba di ${grave.name}` : `Zolla libera ${x + 1},${y + 1}`}
        >
          {grave ? (
            <>
              <GraveSprite
                type={grave.graveType}
                hasFlowers={grave.hasFlowers}
                hasWeeds={grave.hasWeeds}
                size={52}
                title={grave.name}
              />
              {grave.hasWeeds && <span className="badge" title="Erbacce">🌿</span>}
              {grave.hasFlowers && <span className="badge" title="Fiori">💐</span>}
              <span className="grave-name">{grave.name}</span>
            </>
          ) : (
            <EmptyPlotSprite size={48} />
          )}
        </button>,
      );
    }
  }

  return (
    <div className="scene-wrap">
      <div
        className="cemetery-grid"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>
    </div>
  );
}
