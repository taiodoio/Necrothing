// Mappa navigabile a griglia fitta, scrollabile (stile GBA). Oggetti con
// footprint multi-cella posizionati in pixel; meteo come overlay sul viewport.

import { useRef, type CSSProperties } from 'react';
import {
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  GRAVE_FOOTPRINT,
  type Decoration,
  type Grave,
  type LooseWisp,
} from '@/shared/domain/types';
import { PLACEABLES } from '@/shared/domain/placeables';
import { GraveSprite } from '@/shared/assets/GraveSprite';
import { PlaceableSprite } from '@/shared/assets/PlaceableSprite';
import { WispSprite } from '@/shared/assets/WispSprite';
import { WeatherOverlay } from './WeatherOverlay';
import type { DayPhase, Weather } from '@/shared/domain/enums';

interface Props {
  graves: Grave[];
  placeables: Decoration[];
  looseWisps: LooseWisp[];
  weather: Weather;
  dayPhase: DayPhase;
  onSelectEmpty: (gridX: number, gridY: number) => void;
  onSelectGrave: (grave: Grave) => void;
  onSelectPlaceable: (placeable: Decoration) => void;
  onCollectWisp: (id: string) => void;
}

export function CemeteryScene({
  graves,
  placeables,
  looseWisps,
  weather,
  dayPhase,
  onSelectEmpty,
  onSelectGrave,
  onSelectPlaceable,
  onCollectWisp,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  const handleMapClick = (e: React.MouseEvent) => {
    const el = mapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return;
    onSelectEmpty(x, y);
  };

  const mapStyle: CSSProperties = {
    width: MAP_COLS * TILE_SIZE,
    height: MAP_ROWS * TILE_SIZE,
    ['--tile' as string]: `${TILE_SIZE}px`,
  };

  const cell = (x: number, y: number, w: number, h: number): CSSProperties => ({
    position: 'absolute',
    left: x * TILE_SIZE,
    top: y * TILE_SIZE,
    width: w * TILE_SIZE,
    height: h * TILE_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  return (
    <div className="map-wrap">
      <div className="map-scroll">
        <div className="map" ref={mapRef} style={mapStyle} onClick={handleMapClick}>
          {/* Tombe (2×2) */}
          {graves.map((g) => (
            <button
              key={g.id}
              className="map-object"
              style={cell(g.gridX, g.gridY, GRAVE_FOOTPRINT[0], GRAVE_FOOTPRINT[1])}
              aria-label={`Tomba di ${g.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectGrave(g);
              }}
            >
              <GraveSprite
                type={g.graveType}
                hasFlowers={g.hasFlowers}
                hasWeeds={g.hasWeeds}
                size={TILE_SIZE * 2 * 0.92}
                title={g.name}
              />
              {g.hasWeeds && <span className="badge badge-tl">🌿</span>}
              {g.hasFlowers && <span className="badge badge-tr">💐</span>}
            </button>
          ))}

          {/* Placeable (decorazioni + strutture) */}
          {placeables.map((p) => {
            const [w, h] = PLACEABLES[p.type].footprint;
            return (
              <button
                key={p.id}
                className="map-object"
                style={cell(p.gridX, p.gridY, w, h)}
                aria-label={PLACEABLES[p.type].label}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlaceable(p);
                }}
              >
                <PlaceableSprite type={p.type} size={Math.min(w, h) * TILE_SIZE * 0.96} />
              </button>
            );
          })}

          {/* Fuochi fatui raccoglibili */}
          {looseWisps.map((wsp) => (
            <button
              key={wsp.id}
              className="map-object wisp"
              style={cell(wsp.gridX, wsp.gridY, 1, 1)}
              aria-label="Raccogli fuoco fatuo"
              onClick={(e) => {
                e.stopPropagation();
                onCollectWisp(wsp.id);
              }}
            >
              <WispSprite size={TILE_SIZE * 0.8} />
            </button>
          ))}
        </div>
      </div>

      <WeatherOverlay weather={weather} dayPhase={dayPhase} />
    </div>
  );
}
