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
| Gatto nero 🐈‍⬛ | ✅ | wander | +2 ✦ |
| Corvo 🐦‍⬛ | ✅ | perch (si posa) | atmosfera |
| Becchino ⛏️ | ✅ | path (post-sepoltura) | atmosfera |
| Prete ✝️ | ✅ | path | +20 XP, +3 ✦ (benedizione) |
| Topo 🐀 | ✅ | skitter | +1 ✦ |

Codice: `features/cemetery/useRoamingEntities.ts`, sprite `shared/assets/*Sprite.tsx`,
spawn da `simulationService.ts` → `pendingSpawns` → `CemeteryPage`. Tuning:
`ROAMING_DEFS` e `SPAWN_CHANCE` in `balance.ts`.

## 5. Economia & decorazioni

| Feature | Stato | Codice | Tuning |
|---|---|---|---|
| Fuochi fatui (moneta): spawn/raccolta | ✅ | `simulationService.ts`, `gameStore.collectWisp` | `SIM.wispCap/wispSpawnMax` |
| Decorazioni (candela, corona, funghi…) | ✅ | `placeables.ts`, `DecorationSprite` | costi/rank in `placeables.ts` |
| Strutture (sentieri, recinzioni, lampione) | ✅ | `placeables.ts`, `StructureSprite` | idem |
| Ruota / cambia / sposta / elimina placeable | ✅ | `decorationService.ts`, `DecorationSheet.tsx` | `ROTATABLE` |

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

## 8. Da fare / aperto (Fase 12+)

| Feature | Stato | Note |
|---|---|---|
| Audio (ambient + SFX) | ⬜ | rispettare mute + `prefers-reduced-motion` |
| Sharing PNG avanzato (foto + meteo) | 🟡 | base in `shareService` |
| Onboarding primo avvio | ⬜ | guida alla prima sepoltura |
| Preset bilanciamento dal DevPanel | ⬜ | slider "denso/calmo" su `balance.ts` |
| Capacitor native (iOS/Android, SQLite) | 💤 | struttura pronta (ADR 0001) |

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
