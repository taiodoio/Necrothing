// Mappa navigabile a griglia fitta, scrollabile (stile GBA). Oggetti con
// footprint multi-cella posizionati in pixel; meteo come overlay sul viewport.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { spriteUrl } from '@/shared/assets/Sprite';
import { TILE_GRASS_ASSET_ID } from '@/shared/assets/assetKeys';
import { WeatherOverlay } from './WeatherOverlay';
import type { DayPhase, Weather } from '@/shared/domain/enums';

interface Props {
  graves: Grave[];
  placeables: Decoration[];
  looseWisps: LooseWisp[];
  weather: Weather;
  dayPhase: DayPhase;
  movingId?: string | null;
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
  movingId,
  onSelectEmpty,
  onSelectGrave,
  onSelectPlaceable,
  onCollectWisp,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ sl: 0, st: 0, cw: 0, ch: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) setView((v) => ({ ...v, cw: el.clientWidth, ch: el.clientHeight }));
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setView({ sl: el.scrollLeft, st: el.scrollTop, cw: el.clientWidth, ch: el.clientHeight });
  };

  const mapW = MAP_COLS * TILE_SIZE;
  const mapH = MAP_ROWS * TILE_SIZE;
  const MINI_W = 78;
  const mini = MINI_W / mapW;
  const miniH = mapH * mini;

  const jumpTo = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / mini;
    const py = (e.clientY - r.top) / mini;
    scrollRef.current?.scrollTo({
      left: px - view.cw / 2,
      top: py - view.ch / 2,
      behavior: 'smooth',
    });
  };

  const handleMapClick = (e: React.MouseEvent) => {
    const el = mapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return;
    onSelectEmpty(x, y);
  };

  const grassUrl = spriteUrl(TILE_GRASS_ASSET_ID);
  const mapStyle: CSSProperties = {
    width: MAP_COLS * TILE_SIZE,
    height: MAP_ROWS * TILE_SIZE,
    ['--tile' as string]: `${TILE_SIZE}px`,
    ...(grassUrl
      ? {
          backgroundImage: `url(${grassUrl})`,
          backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
          imageRendering: 'pixelated',
        }
      : null),
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
      <div className="map-scroll" ref={scrollRef} onScroll={onScroll}>
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
                className={`map-object${movingId === p.id ? ' moving' : ''}`}
                style={cell(p.gridX, p.gridY, w, h)}
                aria-label={PLACEABLES[p.type].label}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlaceable(p);
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    transform: p.rotation ? `rotate(${p.rotation}deg)` : undefined,
                  }}
                >
                  <PlaceableSprite type={p.type} size={Math.min(w, h) * TILE_SIZE * 0.96} />
                </span>
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

      {/* Minimappa: posizione del viewport sulla mappa */}
      <div
        className="minimap"
        style={{ width: MINI_W, height: miniH }}
        onClick={jumpTo}
        aria-label="Minimappa"
      >
        {graves.map((g) => (
          <span
            key={g.id}
            className="mm-dot mm-grave"
            style={{
              left: g.gridX * TILE_SIZE * mini,
              top: g.gridY * TILE_SIZE * mini,
              width: Math.max(2, GRAVE_FOOTPRINT[0] * TILE_SIZE * mini),
              height: Math.max(2, GRAVE_FOOTPRINT[1] * TILE_SIZE * mini),
            }}
          />
        ))}
        {placeables.map((p) => (
          <span
            key={p.id}
            className="mm-dot mm-deco"
            style={{ left: p.gridX * TILE_SIZE * mini, top: p.gridY * TILE_SIZE * mini }}
          />
        ))}
        {view.cw > 0 && (
          <span
            className="mm-view"
            style={{
              left: view.sl * mini,
              top: view.st * mini,
              width: view.cw * mini,
              height: view.ch * mini,
            }}
          />
        )}
      </div>
    </div>
  );
}
