# Feature & Gameplay Registry

Versione: `v1.0`
Data: 2026-06-28
Tipo: documento vivo (aggiornare a ogni feature)

## A cosa serve

Registro **unico** di tutte le caratteristiche e meccaniche del gioco: per
ciascuna trovi stato, dove vive nel codice e le leve di bilanciamento. Serve a
vedere a colpo d'occhio cosa esiste e a modificare/implementare in fretta senza
ricostruire la mappa mentale del progetto.

> Convenzione percorsi: tutti relativi a `prototype/src/`.

### Legenda stato

- ✅ Fatto e verificato · 🟡 Parziale · ⬜ Non implementato · 💤 Out of scope MVP

### Dove si cambia cosa (scorciatoie di tuning)

| Voglio cambiare… | File |
|---|---|
| Probabilità eventi, durate, cap, spawn NPC, bonus prestigio | [`shared/domain/balance.ts`](../../prototype/src/shared/domain/balance.ts) |
| XP / fuochi fatui per azione, soglie ranghi | [`shared/services/progressionService.ts`](../../prototype/src/shared/services/progressionService.ts) |
| Costi / footprint / rank di sblocco dei placeable | [`shared/domain/placeables.ts`](../../prototype/src/shared/domain/placeables.ts) |
| Catalogo achievement e criteri | [`shared/services/achievementService.ts`](../../prototype/src/shared/services/achievementService.ts) |
| Enum di dominio (categorie, cause morte, lapidi, temi zona…) | [`shared/domain/enums.ts`](../../prototype/src/shared/domain/enums.ts) |
| Comportamenti/velocità/vita delle entità erranti | [`shared/domain/balance.ts`](../../prototype/src/shared/domain/balance.ts) (`ROAMING_DEFS`) |
| Sprite / asset | [`shared/assets/`](../../prototype/src/shared/assets/) + PNG in `assets/generated/` |
| Tileset mappa (erba + cornice 9-slice) e spessore anello (`FRAME_MARGIN`) | [`shared/assets/mapTiles.ts`](../../prototype/src/shared/assets/mapTiles.ts), [`shared/domain/types.ts`](../../prototype/src/shared/domain/types.ts) + PNG in [`shared/assets/tiles/`](../../prototype/src/shared/assets/tiles/) |
| Dimensioni sprite piazzabili / tile (regole di generazione) | vedi §10 · [`shared/assets/generated/README.md`](../../prototype/src/shared/assets/generated/README.md) |

### Strumenti di playtest

- **DevPanel** (solo dev, tasto **`** o pulsante 🛠): innesca a comando fantasma
  `G`, gatto `C`, corvo `R`, becchino `E`, prete `P`, topo `T`, fuoco fatuo `F`,
  sporca lapide `D`, meteo `W`, benedizione `B`.
  File: [`features/cemetery/DevPanel.tsx`](../../prototype/src/features/cemetery/DevPanel.tsx).

---

## 1. Core loop & mondo

| Feature | Stato | Codice | Tuning / note |
|---|---|---|---|
| Sepoltura (wizard multi-step) | ✅ | `features/burial/BurialWizard.tsx`, `services/graveService.ts` | XP in `progressionService` |
| Foto pixelata B/N | ✅ | `shared/utils/image.ts` | `PIXEL_COLS`, `OUT_MAX` nel file |
| Funerale (animazione) | ✅ | `features/funeral/FuneralScene.tsx` | — |
| World simulation (meteo, stagioni, giorno/notte) | ✅ | `services/simulationService.ts` | `SIM` in `balance.ts` |
| Anniversari | ✅ | `simulationService.ts` (`isAnniversaryToday`) | XP `anniversary` |
| Meteo (7 tipi) + overlay | ✅ | `features/cemetery/WeatherOverlay.tsx`, `enums.ts` `WEATHER` | `fullMoonChance` |
| Notifiche + preferenze | ✅ | `services/notificationService.ts` | quiet hours, per-categoria |
| Backup/restore `.necro` | ✅ | `services/backupService.ts` | `BACKUP_VERSION` |

## 2. Mappa & interazione

| Feature | Stato | Codice | Note |
|---|---|---|---|
| Tilemap navigabile + minimappa | ✅ | `features/cemetery/CemeteryScene.tsx` | `MAP_COLS/ROWS/TILE_SIZE` in `types.ts` |
| Tileset mappa PNG a 2 layer (terreno + cornice recinto) | 🟡 | `shared/assets/mapTiles.ts`, `CemeteryScene.tsx`, `shared/assets/tiles/` | vedi §9; non ancora committato |
| Drag & drop oggetti (snap-to-grid) | ✅ | `CemeteryScene.tsx` (`startDrag/moveDrag/endDrag`) | soglia 6px |
| Posizionamento al centro vista | ✅ | `CemeteryPage.tsx` (`freeCellNearCenter`) | — |
| Overlay rosso collisione | ✅ | `CemeteryScene.tsx` (`drop-ghost.invalid`) | `placeables.ts` `canPlace` |
| Popup contestuale (icone azione) | ✅ | `features/cemetery/ObjectPopup.tsx` | azioni in `CemeteryPage` |
| Drawer dettaglio tomba | ✅ | `features/graves/GraveDetail.tsx` | fiori/pulisci/sposta/elimina |

## 3. Commemorazione & manutenzione

| Feature | Stato | Codice | Tuning |
|---|---|---|---|
| Porta fiori (limite 1/giorno) | ✅ | `graveService.bringFlowers` | XP `flowers`, wisp `flowers` |
| Erbacce (crescita nel tempo) | ✅ | `simulationService.ts` | `SIM.weedProbPerDay/Max` |
| Sporcizia lapidi (muschio/polvere) | ✅ | `simulationService.ts`, stato `isDirty` | `SIM.dirtProbPerDay/Max` |
| Pulizia (erbacce + sporco) | ✅ | `graveService.cleanWeeds` | XP/wisp `weedCleaned` |
| Appassimento fiori | ✅ | `simulationService.ts` | `SIM.flowerWitherDays` |

## 4. Entità erranti & NPC

| Entità | Stato | Comportamento | Ricompensa al tap |
|---|---|---|---|
| Fantasma 👻 | ✅ | wander | +40 XP, +2 ✦ |
| Fantasma-oggetto 👻✨ | ✅ | wander (raro, legato a tomba) | +70 XP, +5 ✦ |
| Gatto nero 🐈‍⬛ | ✅ | wander | +2 ✦ |
| Corvo 🐦‍⬛ | ✅ | perch (si posa) | +1 ✦ |
| Becchino ⛏️ | ✅ | path | pulisce gratis le tombe vicine (raggio `GRAVEDIGGER.cleanRadius`) + XP/✦ |
| Prete ✝️ | ✅ | path | +20 XP, +3 ✦ (benedizione) |
| Topo 🐀 | ✅ | skitter | +1 ✦ |
| Zombie 🧟 | ✅ | wander (lento) | +25 XP, +4 ✦ — spawn da bare aperte |

Codice: `features/cemetery/useRoamingEntities.ts`, sprite `shared/assets/*Sprite.tsx`,
calcolo spawn puro in `services/spawnService.ts` (con modificatori da edifici) →
`simulationService.ts` → `pendingSpawns` → `CemeteryPage`. Tuning: `ROAMING_DEFS`,
`SPAWN_CHANCE`, `SPAWN_MODIFIERS`, `GRAVEDIGGER` in `balance.ts`.

> **Modificatori di spawn (Fase G)**: gli edifici piazzati cambiano le
> probabilità — **mausoleo** +10% eventi soprannaturali, **casa del becchino**
> ↑becchino, **santuario** ↑prete, **bare aperte** attirano gli zombie.

## 5. Economia & decorazioni

| Feature | Stato | Codice | Tuning |
|---|---|---|---|
| Fuochi fatui (moneta): spawn/raccolta | ✅ | `simulationService.ts`, `gameStore.collectWisp` | `SIM.wispCap/wispSpawnMax` |
| Economia buy-to-own (Bottega → Inventario → posa) | ✅ | `inventoryService.ts`, `BottegaSheet.tsx`, `InventarioSheet.tsx` | `ECONOMY.sellRefund` (rivendita 70%) |
| Catalogo esteso (luci/deco/costruzioni/ambiente/presenze) | ✅ | `enums.ts` (`EXTRA_PLACEABLE_*`), `placeables.ts` | `EXTRA_DEFAULTS`, gate stagionale (albero di Natale) |
| Decorazioni (candela, corona, funghi…) | ✅ | `placeables.ts`, `DecorationSprite` | costi/rank in `placeables.ts` |
| Strutture (sentieri, recinzioni, lampione) | ✅ | `placeables.ts`, `StructureSprite` | idem |
| Stati oggetti + riparazione (pulito→sporco→rotto) | ✅ | `simulationService.ts`, `graveService.repair`, `gameStore` | `DECAY` (`graveBreakDays`, `repairCost`) |
| Luci accese/spente | ✅ | `decorationService.toggleLight`, `CemeteryScene` | `Decoration.lit` |
| Modalità Modifica esplicita (drag solo in edit) | ✅ | `CemeteryPage.tsx`, `CemeteryScene.tsx` | elimina → torna in Inventario |
| Ruota / cambia / sposta / elimina placeable | ✅ | `decorationService.ts`, `DecorationSheet.tsx` | `ROTATABLE` |
| Cartello con testo personalizzato | ✅ | `decorationService.setText`, `DecorationSheet.tsx` | `Decoration.text` |

## 6. Spazio: zone & landmark

| Feature | Stato | Codice | Note |
|---|---|---|---|
| Mausoleo centrale (unico, 3×3, rank 5) | ✅ | `placeables.ts` (`UNIQUE_PLACEABLES`), `StructureSprite` | +`MAUSOLEUM_PRESTIGE` |
| Distretti tematici **auto-rilevati** | ✅ | `zoneService.detectDistricts`, derivati in `gameStore` | soglia `DISTRICT` in `balance.ts` |
| Bonus prestigio dai distretti | ✅ | `zoneService.zoneScore`, `computePrestige` | `graveFitsTheme` |

> **Modello distretti**: non si disegnano a mano e **non hanno overlay sulla
> mappa**. Quando ≥`DISTRICT.minGraves` (4) tombe coerenti dello stesso tema
> sono vicine (≤`DISTRICT.adjacency`), si forma un distretto: scattano
> achievement e prestigio, ma **visivamente la mappa non cambia**. Le zone sono
> stato **derivato** da `graves` (nessuna persistenza, nessun rendering).

## 7. Progressione & meta

| Feature | Stato | Codice | Note |
|---|---|---|---|
| XP & ranghi (5 livelli) | ✅ | `progressionService.ts` (`RANKS`) | sblocchi per `minRank` |
| Prestigio qualitativo | ✅ | `progressionService.computePrestige` | +mausoleo +zone |
| Achievement (24, a tier + progresso) | ✅ | `achievementService.ts`, `AchievementsPage.tsx` | include mausoleo + 4 distretti |
| Contatori cumulativi | ✅ | `gameStore.ts` | `flowersBrought`, `cleanups`, ecc. |
| Condivisione certificato | ✅ | `services/shareService.ts` | XP `share` 1/giorno |
| Espansione del cimitero (terreno per prestigio) | ✅ | `expansionService.ts`, `CemeteryScene` (frontiera) | `EXPANSION.tiers` in `balance.ts` |
| Target di longevità (commenti di taratura) | ✅ | `balance.ts` (`BALANCE_TARGETS`) | tabella tempi di completamento |
| Foto del cimitero (cattura + ritaglio + pixel-art B/N) | ✅ | `features/photo/PhotoCapture.tsx`, `utils/image.ts` | — |
| Galleria foto (griglia, condividi, elimina) | ✅ | `features/gallery/GalleryPage.tsx`, `galleryService.ts` | store `photos` (DB v6), backup v4 |

## 8. Da fare / aperto (Fase 12+)

| Feature | Stato | Note |
|---|---|---|
| Audio (ambient + SFX) | ⬜ | rispettare mute + `prefers-reduced-motion` |
| Sharing PNG avanzato (foto + meteo) | 🟡 | base in `shareService` |
| Onboarding primo avvio | ⬜ | guida alla prima sepoltura |
| Preset bilanciamento dal DevPanel | ⬜ | slider "denso/calmo" su `balance.ts` |
| Capacitor native (iOS/Android, SQLite) | 💤 | struttura pronta (ADR 0001) |

## 9. Tileset grafico della mappa

> **Stato: 🟡 implementato, non ancora committato** (working tree al 2026-07-17).
> Restyling visivo della mappa col set d'arte **"New Border"**: erba a tile
> grandi + cornice decorativa (recinto + alberi) a 9-slice attorno al perimetro.
> Non tocca la griglia di gioco (collisioni, drag&drop restano a `TILE_SIZE` =
> 40px): la cornice **restringe** l'area giocabile all'interno dell'anello.

**Due layer**, calcolati una sola volta con `useMemo` in
[`CemeteryScene.tsx`](../../prototype/src/features/cemetery/CemeteryScene.tsx),
disegnati da [`shared/assets/mapTiles.ts`](../../prototype/src/shared/assets/mapTiles.ts):

- **Terreno** (`.map-ground`): erba uniforme (`grass`) a tile grandi
  (`FRAME_TILE` = 160px = 4 celle) che riempie tutta la mappa, sotto a tutto.
  Il tile è grande per non schiacciare la trama pixel-art (a 40px si riduceva a
  puntini). `buildGround(mapW, mapH)`.
- **Cornice** (`.map-tiles`): anello **9-slice** (4 angoli + 4 lati) attorno al
  perimetro, spesso `FRAME_MARGIN` = 4 celle. Ogni pezzo è una "scena" quadrata
  che include alberi/terra all'esterno ed erba all'interno; l'erba interna
  combacia con `grass` perché è lo **stesso asset alla stessa scala**
  (FRAME_TILE su 782px sorgente). `buildFrame(mapW, mapH)`.

**Area giocabile ristretta.** L'anello di cornice non è piazzabile. La logica di
dominio (`buildOccupancy`/`canPlace`) resta **pura** (geometria); il vincolo è
applicato ai path di piazzamento tramite gli helper in
[`types.ts`](../../prototype/src/shared/domain/types.ts):
- `FRAME_MARGIN` (celle), `isFrameCell(x,y)`, `footprintTouchesFrame(x,y,w,h)`.
- Enforcement: drag (`CemeteryScene.moveDrag`), posa da inventario/sepoltura
  (`CemeteryPage.freeCellNearCenter`), spawn fuochi fatui (`gameStore`).
- Con `FRAME_MARGIN` = 4 → area utile **16×24** celle (interno `[4,20)×[4,28)`).
- La Bottega pre-piazzata parte a `shopGridY = FRAME_MARGIN` (prima riga interna).

> **Tuning spessore cornice**: `FRAME_MARGIN` in `types.ts`. Deve **dividere**
> sia `MAP_COLS` (24) sia `MAP_ROWS` (32) perché i lati tilino senza cuciture →
> valori validi **2** o **4** (2 = più campo, cornice sottile; 4 = attuale).

**Fallback**: `HAS_TILES` è `false` se i PNG mancano → nessuna cornice/erba a
tile (sfondo CSS scuro), senza rompere nulla.

**Asset** (9 PNG in [`shared/assets/tiles/`](../../prototype/src/shared/assets/tiles/),
generati a 256px dal set `New Border`, individuati da Vite con `import.meta.glob`):
`grass`; `corner_tl/tr/bl/br`; `edge_top/bottom/left/right`.
Sorgenti in [`assets/Asset_map/New Border/`](../../assets/Asset_map/) (782px).

**Aperto / da fare**:
- Committare il lavoro (nuovi `mapTiles.ts` + `tiles/` non ancora in git) e
  decidere il `.gitignore` per i **44 MB** di sorgenti in `assets/Asset_map/`.
- Verificare cuciture dei lati ripetuti su DPR frazionari (mitigate col +1px).

---

## 10. Linee guida dimensioni asset (sprite piazzabili)

Ogni oggetto occupa un **footprint** in celle; la cella è `TILE_SIZE` = **40px**.
Lo sprite è renderizzato quadrato dentro il box del footprint, con un piccolo
fattore di margine. Regola per generare i PNG: **lato_celle × 40 × 2** (retina),
canvas **quadrato 1:1**, **sfondo trasparente**, pixel-art (render `pixelated`).

| Oggetto | Footprint | Box logico | Sprite reso | Genera a | Fattore |
|---|---|---|---|---|---|
| **Tomba / croce** | 2×2 | 80×80px | 73.6px | **160×160** | `×2×0.92` |
| Placeable 1×1 | 1×1 | 40×40px | ~38px | **80×80** | `×0.96` |
| Placeable 2×2 | 2×2 | 80×80px | ~77px | **160×160** | `×0.96` |
| Placeable 3×3 (mausoleo/bottega) | 3×3 | 120×120px | ~115px | **256×256** | `×0.96` |

- Fattori reali: tombe `TILE_SIZE*2*0.92` ([`CemeteryScene.tsx`](../../prototype/src/features/cemetery/CemeteryScene.tsx)),
  altri placeable `min(w,h)*TILE_SIZE*0.96`. Il fattore <1 lascia margine tra
  celle adiacenti: disegna l'arte quasi a pieno canvas (il margine è già dato dal
  render).
- **Nome file = ID asset**, in [`shared/assets/generated/`](../../prototype/src/shared/assets/generated/):
  `grave_<tipo>`, `deco_<tipo>`, `env_<tipo>` / `tile_<tipo>` (strutture),
  `currency_wisp`, `npc_<tipo>`. Vedi `assetKeys.ts`.
- **Varianti di stato** col suffisso `__stato`: `grave_gothic__flowers.png`,
  `..__weeds`, `..__dirty`, `..__broken`, `..__flowers_weeds`, `deco_candle__lit`.
- Trascinato un PNG in `generated/`, sostituisce automaticamente il fallback SVG
  (nessuna modifica al codice).
- **Tile mappa** (§9): quadrati, generati a **256px** dal sorgente 782px, resi a
  `FRAME_TILE` = 160px. Erba e cornice condividono la scala per fondersi.

---

## Come aggiungere una feature (checklist rapida)

1. **Dominio**: tipo/enum in `shared/domain/` (+ migrazione DB in `db/schema.ts` se persistente).
2. **Numeri**: ogni costante di bilanciamento in `shared/domain/balance.ts`.
3. **Servizio**: logica pura + `*.test.ts`.
4. **Store**: azione in `gameStore.ts` (orchestrazione, nessuna logica nei componenti).
5. **UI**: componente in `features/…`; stili in `app/styles.css`.
6. **Playtest**: aggiungi un trigger nel **DevPanel** se è un evento.
7. **Verifica**: `npm run typecheck && npm test && npm run build` verdi.
8. **Traccia**: aggiorna questo registro e la [roadmap](./06-gameplay-roadmap.md).
