// Mappa navigabile a griglia fitta, scrollabile (stile GBA). Oggetti con
// footprint multi-cella posizionati in pixel; meteo come overlay sul viewport.
// Interazione: tap = seleziona (popup contestuale), drag = sposta (con
// validazione collisioni e overlay rosso). Entità erranti tappabili.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import {
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  GRAVE_FOOTPRINT,
  footprintTouchesFrame,
  type Decoration,
  type Grave,
  type LooseWisp,
} from '@/shared/domain/types';
import { PLACEABLES, buildOccupancy, canPlace, type Footprint } from '@/shared/domain/placeables';
import { GraveSprite } from '@/shared/assets/GraveSprite';
import { PlaceableSprite } from '@/shared/assets/PlaceableSprite';
import { WispSprite } from '@/shared/assets/WispSprite';
import { RoamerSprite } from '@/shared/assets/RoamerSprite';
import { ROAMING_LABELS } from '@/shared/domain/roaming';
import { HAS_TILES, buildFrame, buildGround } from '@/shared/assets/mapTiles';
import { WeatherOverlay } from './WeatherOverlay';
import { ObjectPopup, type PopupAction } from './ObjectPopup';
import type { RoamingEntity } from './useRoamingEntities';
import type { DayPhase, Weather } from '@/shared/domain/enums';

export type SelKind = 'grave' | 'placeable' | 'shop';
export interface Selection {
  id: string;
  kind: SelKind;
}

interface Props {
  graves: Grave[];
  placeables: Decoration[];
  looseWisps: LooseWisp[];
  roaming: RoamingEntity[];
  roamingTickMs: number;
  weather: Weather;
  dayPhase: DayPhase;
  editMode: boolean;
  /** Righe della mappa utilizzabili (espansione da prestigio, Fase H). */
  usableRows: number;
  selection: Selection | null;
  popupActions: PopupAction[];
  onPopupAction: (key: string) => void;
  onSelectEmpty: () => void;
  onSelectGrave: (grave: Grave) => void;
  onSelectPlaceable: (placeable: Decoration) => void;
  onCollectWisp: (id: string) => void;
  onTapRoaming: (entity: RoamingEntity) => void;
  onMoveCommit: (kind: SelKind, id: string, gridX: number, gridY: number) => void;
  onMoveInvalid: () => void;
  onViewportCenter: (gridX: number, gridY: number) => void;
  /** Posizione della Bottega sulla mappa. */
  shopGridX?: number;
  shopGridY?: number;
  /** Selezione della Bottega (apre il menù contestuale). */
  onSelectShop?: () => void;
  /** Contatore: a ogni incremento centra la vista sulla Bottega. */
  centerShopSignal?: number;
}

interface DragSession {
  kind: SelKind;
  id: string;
  w: number;
  h: number;
  startX: number;
  startY: number;
  moved: boolean;
  gx: number;
  gy: number;
  valid: boolean;
  pointerId: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function CemeteryScene({
  graves,
  placeables,
  looseWisps,
  roaming,
  roamingTickMs,
  weather,
  dayPhase,
  editMode,
  usableRows,
  selection,
  popupActions,
  onPopupAction,
  onSelectEmpty,
  onSelectGrave,
  onSelectPlaceable,
  onCollectWisp,
  onTapRoaming,
  onMoveCommit,
  onMoveInvalid,
  onViewportCenter,
  shopGridX,
  shopGridY,
  onSelectShop,
  centerShopSignal,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ sl: 0, st: 0, cw: 0, ch: 0 });
  const dragRef = useRef<DragSession | null>(null);
  const [drag, setDrag] = useState<DragSession | null>(null);

  const reportCenter = (sl: number, st: number, cw: number, ch: number) => {
    if (cw === 0) return;
    const gx = clamp(Math.round((sl + cw / 2) / TILE_SIZE - GRAVE_FOOTPRINT[0] / 2), 0, MAP_COLS - GRAVE_FOOTPRINT[0]);
    const gy = clamp(Math.round((st + ch / 2) / TILE_SIZE - GRAVE_FOOTPRINT[1] / 2), 0, MAP_ROWS - GRAVE_FOOTPRINT[1]);
    onViewportCenter(gx, gy);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      setView((v) => ({ ...v, cw: el.clientWidth, ch: el.clientHeight }));
      reportCenter(el.scrollLeft, el.scrollTop, el.clientWidth, el.clientHeight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Centra la vista sulla Bottega quando il segnale cambia (shortcut dal menù).
  useEffect(() => {
    if (!centerShopSignal || shopGridX == null || shopGridY == null) return;
    const el = scrollRef.current;
    if (!el) return;
    const px = (shopGridX + 1.5) * TILE_SIZE; // centro della Bottega 3×3
    const py = (shopGridY + 1.5) * TILE_SIZE;
    el.scrollTo({
      left: px - el.clientWidth / 2,
      top: py - el.clientHeight / 2,
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerShopSignal]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setView({ sl: el.scrollLeft, st: el.scrollTop, cw: el.clientWidth, ch: el.clientHeight });
    reportCenter(el.scrollLeft, el.scrollTop, el.clientWidth, el.clientHeight);
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

  // ---- Drag & drop oggetti ----
  function occExcluding(kind: SelKind, id: string): Set<string> {
    const gs = kind === 'grave' ? graves.filter((g) => g.id !== id) : graves;
    const ps = kind === 'placeable' ? placeables.filter((p) => p.id !== id) : placeables;
    return buildOccupancy(gs, ps);
  }

  function startDrag(e: PointerEvent, kind: SelKind, id: string, fp: Footprint) {
    e.stopPropagation();
    dragRef.current = {
      kind,
      id,
      w: fp[0],
      h: fp[1],
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      gx: 0,
      gy: 0,
      valid: true,
      pointerId: e.pointerId,
    };
    // Solo in modalità Modifica catturiamo il puntatore per il drag; fuori da
    // Edit lasciamo scorrere la mappa e gestiamo solo il tap.
    if (editMode) (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  function moveDrag(e: PointerEvent) {
    if (!editMode) return;
    const s = dragRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.hypot(dx, dy) < 6) return;
    s.moved = true;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const rowBound = Math.min(usableRows, MAP_ROWS);
    const gx = clamp(Math.round(lx / TILE_SIZE - s.w / 2), 0, MAP_COLS - s.w);
    const gy = clamp(Math.round(ly / TILE_SIZE - s.h / 2), 0, rowBound - s.h);
    const valid =
      canPlace(gx, gy, [s.w, s.h], occExcluding(s.kind, s.id), MAP_COLS, rowBound) &&
      !footprintTouchesFrame(gx, gy, s.w, s.h);
    s.gx = gx;
    s.gy = gy;
    s.valid = valid;
    setDrag({ ...s });
  }

  function endDrag(
    e: PointerEvent,
    tap: () => void,
  ) {
    const s = dragRef.current;
    dragRef.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setDrag(null);
    if (!s) return;
    if (!s.moved) {
      tap();
      return;
    }
    if (s.valid) onMoveCommit(s.kind, s.id, s.gx, s.gy);
    else onMoveInvalid();
  }

  const mapStyle: CSSProperties = {
    width: MAP_COLS * TILE_SIZE,
    height: MAP_ROWS * TILE_SIZE,
    ['--tile' as string]: `${TILE_SIZE}px`,
  };

  // Layer statici (dipendono solo dalle dimensioni mappa): calcolati una volta
  // sola e non ridisegnati su scroll o cambi di stato.
  // Terreno: erba a tile grandi che riempie tutta la mappa. Sotto a tutto.
  const ground = useMemo(() => (HAS_TILES ? buildGround(mapW, mapH) : null), [mapW, mapH]);
  // Cornice: anello decorativo (recinto + alberi) sul perimetro.
  const frame = useMemo(() => (HAS_TILES ? buildFrame(mapW, mapH) : null), [mapW, mapH]);

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

  // Posizione del popup (coordinate di .map-wrap), ancorato sopra l'oggetto.
  let popupPos: { x: number; y: number } | null = null;
  if (selection && !drag) {
    let ox = 0;
    let oy = 0;
    let ow = 0;
    let found = false;
    if (selection.kind === 'grave') {
      const g = graves.find((x) => x.id === selection.id);
      if (g) {
        ox = g.gridX;
        oy = g.gridY;
        ow = GRAVE_FOOTPRINT[0];
        found = true;
      }
    } else if (selection.kind === 'shop') {
      if (shopGridX != null && shopGridY != null) {
        ox = shopGridX;
        oy = shopGridY;
        ow = 3;
        found = true;
      }
    } else {
      const p = placeables.find((x) => x.id === selection.id);
      if (p) {
        ox = p.gridX;
        oy = p.gridY;
        ow = PLACEABLES[p.type].footprint[0];
        found = true;
      }
    }
    if (found) {
      const screenX = ox * TILE_SIZE + (ow * TILE_SIZE) / 2 - view.sl;
      const screenY = oy * TILE_SIZE - view.st;
      if (screenY > -10 && screenY < view.ch + 10) {
        popupPos = { x: clamp(screenX, 70, Math.max(70, view.cw - 70)), y: screenY };
      }
    }
  }

  return (
    <div className="map-wrap">
      <div className="map-scroll" ref={scrollRef} onScroll={onScroll}>
        <div
          className="map"
          ref={mapRef}
          style={mapStyle}
          onClick={(e) => {
            if (e.currentTarget === e.target) onSelectEmpty();
          }}
        >
          {/* Terreno: erba a tile grandi (clip ai bordi mappa). */}
          {ground && (
            <div className="map-ground" aria-hidden style={{ width: mapW, height: mapH }}>
              {ground.map((t) => (
                <img
                  key={t.key}
                  className="map-tile"
                  src={t.url}
                  alt=""
                  draggable={false}
                  style={{
                    left: t.left,
                    top: t.top,
                    // +1px: sovrapposizione anti-cucitura su DPR frazionari.
                    width: t.size + 1,
                    height: t.size + 1,
                  }}
                />
              ))}
            </div>
          )}

          {/* Cornice: anello decorativo (recinto + alberi) sul perimetro. */}
          {frame && (
            <div className="map-tiles" aria-hidden>
              {frame.map((t) => (
                <img
                  key={t.key}
                  className="map-tile"
                  src={t.url}
                  alt=""
                  draggable={false}
                  style={{ left: t.left, top: t.top, width: t.size + 1, height: t.size + 1 }}
                />
              ))}
            </div>
          )}

          {/* Frontiera bloccata: terra non ancora sbloccata (espansione). */}
          {usableRows < MAP_ROWS && (
            <div
              className="map-locked"
              aria-hidden
              style={{
                top: usableRows * TILE_SIZE,
                height: (MAP_ROWS - usableRows) * TILE_SIZE,
                width: MAP_COLS * TILE_SIZE,
              }}
            >
              <span className="map-locked-label">🔒 Terreno consacrato dal prestigio</span>
            </div>
          )}

          {/* Tombe (2×2) */}
          {graves.map((g) => {
            const isDragging = drag?.kind === 'grave' && drag.id === g.id;
            const x = isDragging ? drag!.gx : g.gridX;
            const y = isDragging ? drag!.gy : g.gridY;
            return (
              <button
                key={g.id}
                className={`map-object${isDragging ? (drag!.valid ? ' dragging' : ' dragging invalid') : ''}${
                  selection?.kind === 'grave' && selection.id === g.id ? ' selected' : ''
                }`}
                style={cell(x, y, GRAVE_FOOTPRINT[0], GRAVE_FOOTPRINT[1])}
                aria-label={`Tomba di ${g.name}`}
                onPointerDown={(e) => startDrag(e, 'grave', g.id, GRAVE_FOOTPRINT)}
                onPointerMove={moveDrag}
                onPointerUp={(e) => endDrag(e, () => onSelectGrave(g))}
              >
                <GraveSprite
                  type={g.graveType}
                  hasFlowers={g.hasFlowers}
                  hasWeeds={g.hasWeeds}
                  isDirty={g.isDirty}
                  broken={g.broken}
                  size={TILE_SIZE * 2 * 0.46}
                  title={g.name}
                />
                {g.broken ? (
                  <span className="badge badge-tl">🛠️</span>
                ) : (
                  (g.hasWeeds || g.isDirty) && <span className="badge badge-tl">🧹</span>
                )}
                {g.hasFlowers && <span className="badge badge-tr">💐</span>}
              </button>
            );
          })}

          {/* Placeable (decorazioni + strutture) */}
          {placeables.map((p) => {
            const [w, h] = PLACEABLES[p.type].footprint;
            const isDragging = drag?.kind === 'placeable' && drag.id === p.id;
            const x = isDragging ? drag!.gx : p.gridX;
            const y = isDragging ? drag!.gy : p.gridY;
            return (
              <button
                key={p.id}
                className={`map-object${isDragging ? (drag!.valid ? ' dragging' : ' dragging invalid') : ''}${
                  selection?.kind === 'placeable' && selection.id === p.id ? ' selected' : ''
                }`}
                style={cell(x, y, w, h)}
                aria-label={PLACEABLES[p.type].label}
                onPointerDown={(e) => startDrag(e, 'placeable', p.id, PLACEABLES[p.type].footprint)}
                onPointerMove={moveDrag}
                onPointerUp={(e) => endDrag(e, () => onSelectPlaceable(p))}
              >
                <span
                  style={{
                    display: 'flex',
                    transform: p.rotation ? `rotate(${p.rotation}deg)` : undefined,
                    ...(PLACEABLES[p.type].category === 'light'
                      ? p.lit === false
                        ? { opacity: 0.45 }
                        : { filter: 'drop-shadow(0 0 6px rgba(224,163,74,0.85))' }
                      : null),
                  }}
                >
                  <PlaceableSprite type={p.type} size={Math.min(w, h) * TILE_SIZE * 0.96} />
                </span>
              </button>
            );
          })}

          {/* Evidenziatore destinazione durante il drag */}
          {drag?.moved && (
            <div
              className={`drop-ghost${drag.valid ? '' : ' invalid'}`}
              style={cell(drag.gx, drag.gy, drag.w, drag.h)}
            />
          )}

          {/* Bottega (edificio fisso, spostabile in Edit, cliccabile per aprire il drawer) */}
          {shopGridX != null && shopGridY != null && (
            <button
              className={`map-object${selection?.kind === 'shop' ? ' selected' : ''}`}
              style={{
                ...cell(shopGridX, shopGridY, 3, 3),
                background: 'rgba(60,35,20,0.85)',
                border: '2px solid #7a5532',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                cursor: editMode ? 'grab' : 'pointer',
                zIndex: 2,
              }}
              aria-label="Bottega"
              onPointerDown={editMode ? (e) => startDrag(e, 'placeable', '__shop__', [3, 3]) : undefined}
              onPointerMove={editMode ? moveDrag : undefined}
              onPointerUp={editMode ? (e) => endDrag(e, () => onSelectShop?.()) : undefined}
              onClick={!editMode ? (e) => { e.stopPropagation(); onSelectShop?.(); } : undefined}
            >
              <span>🛒</span>
              <span style={{ fontSize: 10, color: '#c9a87a', marginTop: 4 }}>Bottega</span>
            </button>
          )}

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

          {/* Entità erranti (fantasmi, gatti) */}
          {roaming.map((ent) => (
            <button
              key={ent.id}
              className={`map-object roamer roamer-${ent.kind}`}
              style={{
                ...cell(0, 0, 1, 1),
                transform: `translate(${ent.x * TILE_SIZE}px, ${ent.y * TILE_SIZE}px)`,
                transition: `transform ${roamingTickMs}ms linear`,
                zIndex: 4,
              }}
              aria-label={ROAMING_LABELS[ent.kind]}
              onClick={(e) => {
                e.stopPropagation();
                onTapRoaming(ent);
              }}
            >
              <RoamerSprite kind={ent.kind} size={TILE_SIZE * 0.92} facing={ent.facing} />
            </button>
          ))}
        </div>
      </div>

      <WeatherOverlay weather={weather} dayPhase={dayPhase} />

      {popupPos && popupActions.length > 0 && (
        <ObjectPopup x={popupPos.x} y={popupPos.y} actions={popupActions} onAction={onPopupAction} />
      )}

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
