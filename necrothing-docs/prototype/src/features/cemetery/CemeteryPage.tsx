// Pagina principale: scena + top/bottom bar + wizard + dettaglio + toast.
// Hub d'interazione: selezione con popup contestuale, drag&drop, posizionamento
// al centro vista, entità erranti ed eventi (con pannello dev).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PhotoCapture } from '@/features/photo/PhotoCapture';
import { FuneralScene } from '@/features/funeral/FuneralScene';
import { Sheet } from '@/shared/components/Sheet';
import type { PlaceableType } from '@/shared/domain/enums';
import {
  FRAME_MARGIN,
  GRAVE_FOOTPRINT,
  MAP_COLS,
  footprintTouchesFrame,
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
import { usableRows as usableRowsFor } from '@/shared/services/expansionService';
import type { PopupAction } from './ObjectPopup';

const isDev = import.meta.env.DEV;

export function CemeteryPage() {
  const graves = useGameStore((s) => s.graves);
  const decorations = useGameStore((s) => s.decorations);
  const world = useGameStore((s) => s.world);
  const prestige = useGameStore((s) => s.prestige());
  const pendingSpawns = useGameStore((s) => s.pendingSpawns);
  const collectWisp = useGameStore((s) => s.collectWisp);
  const moveGrave = useGameStore((s) => s.moveGrave);
  const movePlaceable = useGameStore((s) => s.movePlaceable);
  const removeGrave = useGameStore((s) => s.removeGrave);
  const removeDecoration = useGameStore((s) => s.removeDecoration);
  const bringFlowers = useGameStore((s) => s.bringFlowers);
  const cleanWeeds = useGameStore((s) => s.cleanWeeds);
  const repairGrave = useGameStore((s) => s.repairGrave);
  const toggleLight = useGameStore((s) => s.toggleLight);
  const rotatePlaceable = useGameStore((s) => s.rotatePlaceable);
  const changePlaceable = useGameStore((s) => s.changePlaceable);
  const placeDecoration = useGameStore((s) => s.placeDecoration);
  const witnessGhost = useGameStore((s) => s.witnessGhost);
  const petCat = useGameStore((s) => s.petCat);
  const blessFromPriest = useGameStore((s) => s.blessFromPriest);
  const shooRat = useGameStore((s) => s.shooRat);
  const witnessCrow = useGameStore((s) => s.witnessCrow);
  const fightZombie = useGameStore((s) => s.fightZombie);
  const gravediggerSweep = useGameStore((s) => s.gravediggerSweep);
  const consumeSpawns = useGameStore((s) => s.consumeSpawns);
  const editIntroSeen = useGameStore((s) => s.editIntroSeen);
  const markEditIntroSeen = useGameStore((s) => s.markEditIntroSeen);
  const shopTutorialDone = useGameStore((s) => s.shopTutorialDone);
  const moveShop = useGameStore((s) => s.moveShop);
  const markShopTutorialDone = useGameStore((s) => s.markShopTutorialDone);
  const lastSimMessage = useGameStore((s) => s.lastSimMessage);
  const lastUnlockedAchievement = useGameStore((s) => s.lastUnlockedAchievement);
  // azioni dev
  const devSpawnWisp = useGameStore((s) => s.devSpawnWisp);
  const devDirtyRandomGrave = useGameStore((s) => s.devDirtyRandomGrave);
  const devSetWeather = useGameStore((s) => s.devSetWeather);
  const devBlessing = useGameStore((s) => s.devBlessing);

  // Occupazione della griglia (tombe + strutture + Bottega): gli NPC la usano
  // per cambiare direzione davanti agli ostacoli.
  const roamingOccupancy = useMemo(() => {
    const occ = buildOccupancy(graves, decorations);
    if (world?.shopGridX != null && world?.shopGridY != null) {
      for (let dx = 0; dx < 3; dx++) {
        for (let dy = 0; dy < 3; dy++) {
          occ.add(`${world.shopGridX + dx},${world.shopGridY + dy}`);
        }
      }
    }
    return occ;
  }, [graves, decorations, world?.shopGridX, world?.shopGridY]);

  const roaming = useRoamingEntities(roamingOccupancy);
  const navigate = useNavigate();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editIntro, setEditIntro] = useState(false);
  const [editIntroDontShow, setEditIntroDontShow] = useState(true);
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
  const [shopTutorialOpen, setShopTutorialOpen] = useState(!shopTutorialDone);

  const viewCenter = useRef({ x: 0, y: 0 });
  const [centerShopSignal, setCenterShopSignal] = useState(0);

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
      roaming.spawn(s.kind, g ? { x: g.gridX, y: g.gridY } : undefined, {
        rare: s.rare,
        graveId: s.graveId,
      });
    }
    consumeSpawns();
  }, [pendingSpawns, graves, roaming, consumeSpawns]);

  const maxRows = usableRowsFor(prestige);

  /** Trova una cella libera vicino al centro vista per un dato ingombro. */
  const freeCellNearCenter = (footprint: Footprint): { x: number; y: number } => {
    const occ = buildOccupancy(graves, decorations);
    const c = viewCenter.current;
    // Parte dall'interno dell'anello di cornice (non piazzabile).
    const cx = Math.min(Math.max(FRAME_MARGIN, c.x), MAP_COLS - FRAME_MARGIN - footprint[0]);
    const cy = Math.min(Math.max(FRAME_MARGIN, c.y), maxRows - FRAME_MARGIN - footprint[1]);
    // Libera = né occupata né dentro l'anello di cornice.
    const isFree = (x: number, y: number) =>
      canPlace(x, y, footprint, occ, MAP_COLS, maxRows) &&
      !footprintTouchesFrame(x, y, footprint[0], footprint[1]);
    if (isFree(cx, cy)) return { x: cx, y: cy };
    // ricerca a spirale crescente attorno al centro
    for (let r = 1; r < Math.max(MAP_COLS, maxRows); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x > MAP_COLS - footprint[0] || y > maxRows - footprint[1]) continue;
          if (isFree(x, y)) return { x, y };
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
      setEditMode(true);
      setSelection({ id: created.id, kind: 'placeable' });
      setPlacing(true);
      showToast('Trascina per posizionare, poi conferma.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Errore.');
    }
  };

  // Azioni del popup contestuale: dipendono dalla modalità Modifica.
  // Fuori da Edit → interazione semplice. In Edit → strumenti di editing.
  const popupActions: PopupAction[] = (() => {
    if (!selection) return [];
    if (selection.kind === 'shop') {
      // In piazzamento (primo avvio): conferma la posizione.
      if (editMode && placing) {
        return [{ key: 'confirm', icon: '✓', label: 'Conferma posizione', primary: true }];
      }
      // In Modifica (riposizionamento): si trascina, nessuna azione.
      if (editMode) return [];
      // Interazione semplice: unica azione = entrare nella Bottega.
      return [{ key: 'enter', icon: '🛒', label: 'Entra nella bottega' }];
    }
    if (selection.kind === 'grave') {
      const g = graves.find((x) => x.id === selection.id);
      if (!g) return [];
      if (editMode) {
        const acts: PopupAction[] = [
          { key: 'examine', icon: '🔍', label: 'Esamina' },
          { key: 'delete', icon: '🗑', label: 'Elimina', danger: true },
        ];
        if (placing) acts.push({ key: 'confirm', icon: '✓', label: 'Conferma', primary: true });
        return acts;
      }
      const acts: PopupAction[] = [{ key: 'examine', icon: '🔍', label: 'Esamina' }];
      if (g.broken) {
        acts.push({ key: 'repair', icon: '🛠️', label: 'Ripara' });
      } else {
        acts.push({ key: 'flowers', icon: '💐', label: 'Porta fiori' });
        if (g.hasWeeds || g.isDirty) acts.push({ key: 'clean', icon: '🧹', label: 'Pulisci' });
      }
      return acts;
    }
    const p = decorations.find((x) => x.id === selection.id);
    if (!p) return [];
    if (editMode) {
      const acts: PopupAction[] = [{ key: 'examine', icon: '🔍', label: 'Dettagli' }];
      if (isRotatable(p.type)) acts.push({ key: 'rotate', icon: '⟳', label: 'Ruota' });
      acts.push({ key: 'change', icon: '🔁', label: 'Cambia' });
      acts.push({ key: 'delete', icon: '🗑', label: 'Elimina', danger: true });
      if (placing) acts.push({ key: 'confirm', icon: '✓', label: 'Conferma', primary: true });
      return acts;
    }
    // Fuori da Edit: interazione semplice. Le luci si accendono/spengono.
    const acts: PopupAction[] = [{ key: 'examine', icon: '🔍', label: 'Dettagli' }];
    if (PLACEABLES[p.type].category === 'light') {
      acts.push({ key: 'light', icon: p.lit === false ? '💡' : '🌑', label: p.lit === false ? 'Accendi' : 'Spegni' });
    }
    return acts;
  })();

  // Entra in modalità Modifica (con popup introduttivo la prima volta).
  const enterEdit = () => {
    if (!editIntroSeen) {
      setEditIntro(true);
      return;
    }
    setEditMode(true);
  };
  const exitEdit = () => {
    setEditMode(false);
    clearSelection();
  };

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
        case 'repair':
          await repairGrave(id);
          showToast('Tomba riparata. 🛠️');
          break;
        case 'light':
          await toggleLight(id);
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
        case 'enter':
          // Unica azione del menù contestuale della Bottega.
          clearSelection();
          setBottegaOpen(true);
          break;
        case 'confirm':
          if (kind === 'shop') {
            // Conferma il piazzamento iniziale della Bottega.
            setEditMode(false);
            clearSelection();
            if (!shopTutorialDone) {
              await markShopTutorialDone();
              showToast('Bottega posizionata! Toccala per acquistare. 🛒');
            } else {
              showToast('Bottega spostata.');
            }
          } else {
            clearSelection();
            showToast('Posizionato. Riposi in pace.');
          }
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
        await witnessGhost(ent.graveId ?? null, ent.rare);
        showToast(
          ent.rare
            ? 'Il fantasma dellʼoggetto sepolto si manifesta! 👻✨ +70 XP'
            : 'Hai assistito a unʼapparizione! 👻 +40 XP',
        );
        break;
      case 'cat':
        await petCat();
        showToast('Il gatto nero ti porta fortuna. 🐈‍⬛ +2 fuochi fatui');
        break;
      case 'priest':
        await blessFromPriest(ent.graveId ?? null);
        showToast('Il prete impartisce una benedizione. ✝️ +20 XP, +3 fuochi');
        break;
      case 'rat':
        await shooRat();
        showToast('Hai scacciato un topo. 🐀 +1 fuoco fatuo');
        break;
      case 'crow':
        await witnessCrow();
        showToast('Il corvo lascia cadere un fuoco fatuo. 🐦‍⬛ +1');
        break;
      case 'zombie':
        await fightZombie(ent.graveId ?? null);
        showToast('Hai ricacciato lo zombie nella fossa. 🧟 +25 XP, +4 fuochi');
        break;
      case 'gravedigger': {
        const n = await gravediggerSweep(Math.round(ent.x), Math.round(ent.y));
        showToast(
          n > 0
            ? `Il becchino ripulisce ${n} ${n === 1 ? 'tomba' : 'tombe'} qui intorno. ⛏️`
            : 'Il becchino prosegue il suo lavoro. ⛏️',
        );
        break;
      }
    }
  };

  const devActions = {
    ghost: () => roaming.spawn('ghost'),
    cat: () => roaming.spawn('cat'),
    crow: () => roaming.spawn('crow'),
    gravedigger: () => roaming.spawn('gravedigger'),
    priest: () => roaming.spawn('priest'),
    rat: () => roaming.spawn('rat'),
    zombie: () => roaming.spawn('zombie'),
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
    {
      key: 'shop',
      icon: '🛒',
      label: 'Bottega',
      onClick: () => {
        // Shortcut: centra la vista sulla Bottega e la seleziona (popup "Entra").
        setCenterShopSignal((n) => n + 1);
        if (!editMode) setSelection({ id: '__shop__', kind: 'shop' });
      },
    },
    { key: 'inv', icon: '🎒', label: 'Inventario', onClick: () => setInventarioOpen(true) },
    {
      key: 'edit',
      icon: editMode ? '✅' : '✏️',
      label: editMode ? 'Fine modifica' : 'Modifica',
      onClick: () => (editMode ? exitEdit() : enterEdit()),
    },
    { key: 'photo', icon: '📷', label: 'Foto', onClick: () => setPhotoOpen(true) },
    { key: 'gallery', icon: '🖼️', label: 'Galleria', onClick: () => navigate('/gallery') },
  ];

  return (
    <div className="app-shell">
      <TopBar />

      {editMode && (
        <div className="edit-banner">
          <span>✏️ Modifica: trascina per spostare, tocca per il menù</span>
          <button className="btn btn--ghost" onClick={exitEdit}>
            Fine
          </button>
        </div>
      )}

      <CemeteryScene
        graves={graves}
        placeables={decorations}
        looseWisps={world?.looseWisps ?? []}
        roaming={roaming.entities}
        roamingTickMs={roaming.tickMs}
        weather={world?.currentWeather ?? 'gloomy_clear'}
        dayPhase={world?.currentDayPhase ?? 'day'}
        editMode={editMode}
        usableRows={maxRows}
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
            if (id === '__shop__') {
              await moveShop(x, y);
            } else if (kind === 'grave') {
              await moveGrave(id, x, y);
            } else {
              await movePlaceable(id, x, y);
            }
          } catch (e) {
            showToast(e instanceof Error ? e.message : 'Spazio occupato.');
          }
        }}
        onMoveInvalid={() => showToast('Spazio occupato: scegli una zona libera.')}
        onViewportCenter={(x, y) => {
          viewCenter.current = { x, y };
        }}
        shopGridX={world?.shopGridX}
        shopGridY={world?.shopGridY}
        onSelectShop={() => {
          setSelection({ id: '__shop__', kind: 'shop' });
        }}
        centerShopSignal={centerShopSignal}
      />

      <ActionBubble
        actions={bubbleActions}
        hidden={
          burialOpen ||
          photoOpen ||
          bottegaOpen ||
          inventarioOpen ||
          !!detailId ||
          !!decorationSelId ||
          !!replaceTarget ||
          !!funeralGrave ||
          editIntro ||
          shopTutorialOpen
        }
      />

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

      {photoOpen && (
        <PhotoCapture
          onClose={() => setPhotoOpen(false)}
          onSaved={() => {
            setPhotoOpen(false);
            showToast('Ricordo salvato in Galleria. 🖼️');
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
            setEditMode(true);
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
            setEditMode(true);
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
            setEditMode(true);
            setSelection({ id: g.id, kind: 'grave' });
            setPlacing(true);
            // Il becchino fa la sua comparsa dopo una sepoltura.
            roaming.spawn('gravedigger', { x: g.gridX, y: g.gridY });
            showToast('Trascina per posizionare la lapide, poi conferma.');
          }}
        />
      )}

      {editIntro && (
        <Sheet title="Modalità Modifica" onClose={() => setEditIntro(false)}>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
            In <strong>Modifica</strong> puoi <strong>trascinare</strong> gli elementi per
            spostarli e, toccandoli, aprire il menù per <strong>ruotare</strong>,{' '}
            <strong>cambiare</strong> o <strong>eliminare</strong> (gli elementi eliminati tornano
            in Inventario). Fuori da Modifica il tocco è solo interazione.
          </p>
          <label className="switch-row" style={{ borderBottom: 0 }}>
            <span>Non mostrare più</span>
            <input
              type="checkbox"
              checked={editIntroDontShow}
              onChange={(e) => setEditIntroDontShow(e.target.checked)}
              style={{ width: 22, height: 22 }}
            />
          </label>
          <div className="wizard-nav">
            <button className="btn" onClick={() => setEditIntro(false)}>
              Annulla
            </button>
            <button
              className="btn btn--primary"
              onClick={async () => {
                if (editIntroDontShow) await markEditIntroSeen();
                setEditIntro(false);
                setEditMode(true);
              }}
            >
              Inizia
            </button>
          </div>
        </Sheet>
      )}

      {shopTutorialOpen && !shopTutorialDone && (
        <Sheet title="Benvenuto nella Bottega!" onClose={() => setShopTutorialOpen(false)}>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Questa è la tua <strong>Bottega</strong>: il cuore del cimitero. Per prima cosa,{' '}
            <strong>posizionala</strong> dove preferisci — trascinala sulla mappa, poi tocca{' '}
            <strong>✓ Conferma</strong>. In seguito potrai entrarci toccandola e il pulsante 🛒 nel
            menù la riporterà sempre al centro.
          </p>
          <div className="wizard-nav">
            <button
              className="btn btn--primary"
              onClick={() => {
                setShopTutorialOpen(false);
                setEditMode(true);
                setSelection({ id: '__shop__', kind: 'shop' });
                setPlacing(true);
                showToast('Trascina la Bottega dove vuoi, poi tocca ✓ Conferma.');
              }}
            >
              Posiziona la Bottega
            </button>
          </div>
        </Sheet>
      )}

      {toast && <div className="toast">{toast}</div>}

      {isDev && <DevPanel actions={devActions} />}
    </div>
  );
}
