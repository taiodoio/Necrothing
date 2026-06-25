// Scena cimitero: griglia di celle SVG, mobile-first. Tap su cella.

import { useMemo } from 'react';
import { GRID_COLS, GRID_ROWS, type Decoration, type Grave } from '@/shared/domain/types';
import { GraveSprite } from '@/shared/assets/GraveSprite';
import { EmptyPlotSprite } from '@/shared/assets/EmptyPlotSprite';
import { DecorationSprite } from '@/shared/assets/DecorationSprite';
import { DECORATION_LABELS } from '@/shared/domain/enums';

interface Props {
  graves: Grave[];
  decorations: Decoration[];
  onSelectEmpty: (gridX: number, gridY: number) => void;
  onSelectGrave: (grave: Grave) => void;
  onSelectDecoration: (decoration: Decoration) => void;
}

export function CemeteryScene({
  graves,
  decorations,
  onSelectEmpty,
  onSelectGrave,
  onSelectDecoration,
}: Props) {
  const byCell = useMemo(() => {
    const map = new Map<string, Grave>();
    for (const g of graves) map.set(`${g.gridX},${g.gridY}`, g);
    return map;
  }, [graves]);

  const decoByCell = useMemo(() => {
    const map = new Map<string, Decoration>();
    for (const d of decorations) map.set(`${d.gridX},${d.gridY}`, d);
    return map;
  }, [decorations]);

  const cells = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const grave = byCell.get(`${x},${y}`);
      const deco = decoByCell.get(`${x},${y}`);
      const label = grave
        ? `Tomba di ${grave.name}`
        : deco
          ? `Decorazione: ${DECORATION_LABELS[deco.type]}`
          : `Zolla libera ${x + 1},${y + 1}`;
      cells.push(
        <button
          key={`${x},${y}`}
          className="cell"
          onClick={() =>
            grave
              ? onSelectGrave(grave)
              : deco
                ? onSelectDecoration(deco)
                : onSelectEmpty(x, y)
          }
          aria-label={label}
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
          ) : deco ? (
            <DecorationSprite type={deco.type} size={46} title={DECORATION_LABELS[deco.type]} />
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
