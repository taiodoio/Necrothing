// Pagina principale: scena + top/bottom bar + wizard + dettaglio + toast.
// Hub d'interazione: selezione con popup contestuale, drag&drop, posizionamento
// al centro vista, entità erranti ed eventi (con pannello dev).

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/shared/store/gameStore';
import { CemeteryScene, type Selection } from './CemeteryScene';
import { TopBar } from './TopBar';
import { ActionBubble, type BubbleAction } from './ActionBubble';
import { DevPanel } from './DevPanel';
import { useRoamingEntities, type RoamingEntity } from './useRoamingEntities';
import { BurialWizard } from '@/features/burial/BurialWizard';
import { GraveDetail } from '@/features/graves/GraveDetail';
import { PlaceablePicker } from '@/features/decorations/PlaceablePicker';
import { DecorationSheet } from '@/features/decorations/DecorationSheet';
import { BottegaSheet } from '@/features/shop/BottegaSheet';
import { InventarioSheet } from '@/features/inventory/InventarioSheet';
import { FuneralScene } from '@/features/funeral/FuneralScene';
import type { PlaceableType } from '@/shared/domain/enums';
import {
  GRAVE_FOOTPRINT,
  MAP_COLS,
  MAP_ROWS,
  type Grave,
} from '@/shared/domain/types';
import {
  buildOccupancy,
  canPlace,
  isRotatable,
  PLACEABLES,
  type Footprint,
} from '@/shared/domain/placeables';
import { WEATHER } from '@/shared/domain/enums';
import type { PopupAction } from './ObjectPopup';

const isDev = import.meta.env.DEV;

export function CemeteryPage() {
  const graves = useGameStore((s) => s.graves);
  const decorations = useGameStore((s) => s.decorations);
  const world = useGameStore((s) => s.world);
  const pendingSpawns = useGameStore((s) => s.pendingSpawns);
  const collectWisp = useGameStore((s) => s.collectWisp);
  const moveGrave = useGameStore((s) => s.moveGrave);
  const movePlaceable = useGameStore((s) => s.movePlaceable);
  const removeGrave = useGameStore((s) => s.removeGrave);
  const removeDecoration = useGameStore((s) => s.removeDecoration);
  const bringFlowers = useGameStore((s) => s.bringFlowers);
  const cleanWeeds = useGameStore((s) => s.cleanWeeds);
  const rotatePlaceable = useGameStore((s) => s.rotatePlaceable);
  const changePlaceable = useGameStore((s) => s.changePlaceable);
  const placeDecoration = useGameStore((s) => s.placeDecoration);
  const witnessGhost = useGameStore((s) => s.witnessGhost);
  const petCat = useGameStore((s) => s.petCat);
  const blessFromPriest = useGameStore((s) => s.blessFromPriest);
  const shooRat = useGameStore((s) => s.shooRat);
  const consumeSpawns = useGameStore((s) => s.consumeSpawns);
  const lastSimMessage = useGameStore((s) => s.lastSimMessage);
  const lastUnlockedAchievement = useGameStore((s) => s.lastUnlockedAchievement);
  // azioni dev
  const devSpawnWisp = useGameStore((s) => s.devSpawnWisp);
  const devDirtyRandomGrave = useGameStore((s) => s.devDirtyRandomGrave);
  const devSetWeather = useGameStore((s) => s.devSetWeather);
  const devBlessing = useGameStore((s) => s.devBlessing);

  const roaming = useRoamingEntities();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [placing, setPlacing] = useState(false);
  const [burialOpen, setBurialOpen] = useState(false);
  const [bottegaOpen, setBottegaOpen] = useState(false);
  const [inventarioOpen, setInventarioOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decorationSelId, setDecorationSelId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ id: string; footprint: Footprint } | null>(
    null,
  );
  const [funeralGrave, setFuneralGrave] = useState<Grave | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const viewCenter = useRef({ x: 0, y: 0 });

  const showToast = (msg: string) => setToast(msg);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (lastSimMessage) showToast(lastSimMessage);
  }, [lastSimMessage]);

  useEffect(() => {
    if (lastUnlockedAchievement) showToast(`🏆 Achievement: ${lastUnlockedAchievement}`);
  }, [lastUnlockedAchievement]);

  // La simulazione segnala entità erranti: le facciamo comparire sulla mappa.
  useEffect(() => {
    if (pendingSpawns.length === 0) return;
    for (const s of pendingSpawns) {
      const g = s.graveId ? graves.find((x) => x.id === s.graveId) : undefined;
      roaming.spawn(s.kind, g ? { x: g.gridX, y: g.gridY } : undefined);
    }
    consumeSpawns();
  }, [pendingSpawns, graves, roaming, consumeSpawns]);

  /** Trova una cella libera vicino al centro vista per un dato ingombro. */
  const freeCellNearCenter = (footprint: Footprint): { x: number; y: number } => {
    const occ = buildOccupancy(graves, decorations);
    const c = viewCenter.current;
    const cx = Math.min(Math.max(0, c.x), MAP_COLS - footprint[0]);
    const cy = Math.min(Math.max(0, c.y), MAP_ROWS - footprint[1]);
    if (canPlace(cx, cy, footprint, occ, MAP_COLS, MAP_ROWS)) return { x: cx, y: cy };
    // ricerca a spirale crescente attorno al centro
    for (let r = 1; r < Math.max(MAP_COLS, MAP_ROWS); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x > MAP_COLS - footprint[0] || y > MAP_ROWS - footprint[1]) continue;
          if (canPlace(x, y, footprint, occ, MAP_COLS, MAP_ROWS)) return { x, y };
        }
      }
    }
    return { x: cx, y: cy };
  };

  const burialCell = burialOpen ? freeCellNearCenter(GRAVE_FOOTPRINT) : null;

  // Posiziona un oggetto preso dall'Inventario al centro vista, poi entra in
  // modalità posizionamento (trascina + conferma).
  const placeFromInventory = async (type: PlaceableType) => {
    setInventarioOpen(false);
    const cell = freeCellNearCenter(PLACEABLES[type].footprint);
    try {
      const created = await placeDecoration(type, cell.x, cell.y);
      setSelection({ id: created.id, kind: 'placeable' });
      setPlacing(true);
      showToast('Trascina per posizionare, poi conferma.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Errore.');
    }
  };

  // Azioni del popup contestuale in base alla selezione.
  const popupActions: PopupAction[] = (() => {
    if (!selection) return [];
    if (selection.kind === 'grave') {
      const g = graves.find((x) => x.id === selection.id);
      if (!g) return [];
      const acts: PopupAction[] = [
        { key: 'examine', icon: '🔍', label: 'Esamina' },
        { key: 'flowers', icon: '💐', label: 'Porta fiori' },
      ];
      if (g.hasWeeds || g.isDirty) acts.push({ key: 'clean', icon: '🧹', label: 'Pulisci' });
      acts.push({ key: 'delete', icon: '🗑', label: 'Elimina', danger: true });
      if (placing) acts.push({ key: 'confirm', icon: '✓', label: 'Conferma', primary: true });
      return acts;
    }
    const p = decorations.find((x) => x.id === selection.id);
    if (!p) return [];
    const acts: PopupAction[] = [{ key: 'examine', icon: '🔍', label: 'Dettagli' }];
    if (isRotatable(p.type)) acts.push({ key: 'rotate', icon: '⟳', label: 'Ruota' });
    acts.push({ key: 'change', icon: '🔁', label: 'Cambia' });
    acts.push({ key: 'delete', icon: '🗑', label: 'Elimina', danger: true });
    if (placing) acts.push({ key: 'confirm', icon: '✓', label: 'Conferma', primary: true });
    return acts;
  })();

  const clearSelection = () => {
    setSelection(null);
    setPlacing(false);
  };

  const onPopupAction = async (key: string) => {
    if (!selection) return;
    const { id, kind } = selection;
    try {
      switch (key) {
        case 'examine':
          if (kind === 'grave') setDetailId(id);
          else setDecorationSelId(id);
          break;
        case 'flowers':
          await bringFlowers(id);
          showToast('Hai portato fiori. 💐');
          break;
        case 'clean':
          await cleanWeeds(id);
          showToast('Lapide pulita. ✨');
          break;
        case 'rotate':
          await rotatePlaceable(id);
          break;
        case 'change': {
          const p = decorations.find((x) => x.id === id);
          if (p) setReplaceTarget({ id, footprint: PLACEABLES[p.type].footprint });
          break;
        }
        case 'delete':
          if (kind === 'grave') await removeGrave(id);
          else await removeDecoration(id);
          clearSelection();
          showToast('Eliminato.');
          break;
        case 'confirm':
          clearSelection();
          showToast('Posizionato. Riposi in pace.');
          break;
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Errore.');
    }
  };

  const onTapRoaming = async (ent: RoamingEntity) => {
    roaming.remove(ent.id);
    switch (ent.kind) {
      case 'ghost':
        await witnessGhost(null);
        showToast('Hai assistito a unʼapparizione! 👻 +40 XP');
        break;
      case 'cat':
        await petCat();
        showToast('Il gatto nero ti porta fortuna. 🐈‍⬛ +2 fuochi fatui');
        break;
      case 'priest':
        await blessFromPriest(null);
        showToast('Il prete impartisce una benedizione. ✝️ +20 XP, +3 fuochi');
        break;
      case 'rat':
        await shooRat();
        showToast('Hai scacciato un topo. 🐀 +1 fuoco fatuo');
        break;
      case 'crow':
        showToast('Un corvo gracchia nel silenzio. 🐦‍⬛');
        break;
      case 'gravedigger':
        showToast('Il becchino prosegue il suo lavoro. ⛏️');
        break;
    }
  };

  const devActions = {
    ghost: () => roaming.spawn('ghost'),
    cat: () => roaming.spawn('cat'),
    crow: () => roaming.spawn('crow'),
    gravedigger: () => roaming.spawn('gravedigger'),
    priest: () => roaming.spawn('priest'),
    rat: () => roaming.spawn('rat'),
    wisp: () => devSpawnWisp(),
    dirty: () => devDirtyRandomGrave(),
    weather: () => {
      const cur = world?.currentWeather ?? 'gloomy_clear';
      const i = WEATHER.indexOf(cur);
      devSetWeather(WEATHER[(i + 1) % WEATHER.length]);
    },
    blessing: () => devBlessing(),
  };

  const bubbleActions: BubbleAction[] = [
    { key: 'bury', icon: '⚰️', label: 'Seppellisci', onClick: () => setBurialOpen(true) },
    { key: 'shop', icon: '🛒', label: 'Bottega', onClick: () => setBottegaOpen(true) },
    { key: 'inv', icon: '🎒', label: 'Inventario', onClick: () => setInventarioOpen(true) },
    { key: 'edit', icon: '✏️', label: 'Modifica', onClick: () => showToast('Modalità Modifica in arrivo.') },
    { key: 'photo', icon: '📷', label: 'Foto', onClick: () => showToast('Fotocamera in arrivo.') },
    { key: 'gallery', icon: '🖼️', label: 'Galleria', onClick: () => showToast('Galleria in arrivo.') },
  ];

  return (
    <div className="app-shell">
      <TopBar />

      <CemeteryScene
        graves={graves}
        placeables={decorations}
        looseWisps={world?.looseWisps ?? []}
        roaming={roaming.entities}
        roamingTickMs={roaming.tickMs}
        weather={world?.currentWeather ?? 'gloomy_clear'}
        dayPhase={world?.currentDayPhase ?? 'day'}
        selection={selection}
        popupActions={popupActions}
        onPopupAction={onPopupAction}
        onSelectEmpty={clearSelection}
        onSelectGrave={(g) => {
          setSelection({ id: g.id, kind: 'grave' });
          setPlacing(false);
        }}
        onSelectPlaceable={(d) => {
          setSelection({ id: d.id, kind: 'placeable' });
          setPlacing(false);
        }}
        onCollectWisp={(id) => collectWisp(id)}
        onTapRoaming={onTapRoaming}
        onMoveCommit={async (kind, id, x, y) => {
          try {
            if (kind === 'grave') await moveGrave(id, x, y);
            else await movePlaceable(id, x, y);
          } catch (e) {
            showToast(e instanceof Error ? e.message : 'Spazio occupato.');
          }
        }}
        onMoveInvalid={() => showToast('Spazio occupato: scegli una zona libera.')}
        onViewportCenter={(x, y) => {
          viewCenter.current = { x, y };
        }}
      />

      <ActionBubble actions={bubbleActions} />

      {burialCell && (
        <BurialWizard
          gridX={burialCell.x}
          gridY={burialCell.y}
          onClose={() => setBurialOpen(false)}
          onBuried={(grave) => {
            setBurialOpen(false);
            setFuneralGrave(grave);
          }}
        />
      )}

      {bottegaOpen && <BottegaSheet onClose={() => setBottegaOpen(false)} />}

      {inventarioOpen && (
        <InventarioSheet
          onClose={() => setInventarioOpen(false)}
          onPlace={(type: PlaceableType) => placeFromInventory(type)}
        />
      )}

      {detailId && (
        <GraveDetail
          graveId={detailId}
          onClose={() => setDetailId(null)}
          onDeleted={() => {
            setDetailId(null);
            clearSelection();
            showToast('Tomba rimossa.');
          }}
          onMoveHint={() => {
            setDetailId(null);
            showToast('Trascina la lapide per spostarla.');
          }}
        />
      )}

      {decorationSelId && (
        <DecorationSheet
          id={decorationSelId}
          onClose={() => setDecorationSelId(null)}
          onMove={() => {
            setDecorationSelId(null);
            showToast('Trascina lʼelemento per spostarlo.');
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
            const g = funeralGrave;
            setFuneralGrave(null);
            setSelection({ id: g.id, kind: 'grave' });
            setPlacing(true);
            // Il becchino fa la sua comparsa dopo una sepoltura.
            roaming.spawn('gravedigger', { x: g.gridX, y: g.gridY });
            showToast('Trascina per posizionare la lapide, poi conferma.');
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      {isDev && <DevPanel actions={devActions} />}
    </div>
  );
}
