# Gameplay Roadmap — Post-MVP

Versione: `v0.1`
Data: 2026-06-28
Stato: pianificazione

## Scopo

Pianificare gli elementi di gameplay **non ancora implementati** dopo il
completamento dell'MVP (fasi 0–7 in [Implementation Plan](../technical/04-implementation-plan.md))
e del blocco di interazione recente (drag&drop, popup contestuale, entità
erranti, pulizia lapidi, foto pixelata). Ogni voce è ancorata all'architettura
esistente del prototipo (`prototype/src/`) per essere subito implementabile.

### Legenda stato

- ✅ Fatto · 🟡 Parziale · ⬜ Da fare

### Baseline già implementata (riferimento)

| Area | Stato | Note |
|---|---|---|
| Burial flow + progressione (XP/ranghi/prestigio) | ✅ | `features/burial`, `progressionService` |
| Commemorazione (fiori) + manutenzione (erbacce + sporco) | ✅ | `graveService`, stato `isDirty` |
| World simulation (meteo, stagioni, giorno/notte, anniversari, benedizioni) | ✅ | `simulationService` |
| Economia fuochi fatui (spawn/raccolta/spesa) | ✅ | `WISP_VALUES`, `looseWisps` |
| Drag&drop, popup contestuale, posizionamento al centro, overlay collisione | ✅ | `CemeteryScene`, `ObjectPopup` |
| Entità erranti tappabili (fantasma, gatto) + DevPanel | ✅ | `useRoamingEntities`, `DevPanel` |
| Foto pixelata B/N | ✅ | `utils/image.ts` |
| Notifiche web + preferenze | ✅ | `notificationService` |
| Achievement (catalogo a tier + contatori + UI) | ✅ | `achievementService`, 19 achievement |
| NPC viventi (corvo, becchino, prete, topo) | ✅ | `useRoamingEntities` generalizzato |
| Zone tematiche / mausoleo centrale | ✅ | `zoneService`, placeable `mausoleum` |
| Bilanciamento centralizzato (tuning) | ✅ | `shared/domain/balance.ts` |

> **Stato fasi 8–11: completate** (28-06-2026). La sezione 12 (rifiniture) resta
> aperta. Le fasi sotto restano come riferimento di design.

---

## Principi guida per queste fasi

1. **Estendere, non riscrivere.** Le entità viventi riusano
   `useRoamingEntities`; gli sblocchi riusano `minRank`; gli eventi riusano la
   pipeline di `simulationService`.
2. **Niente azioni forzate.** Coerente con il world-sim: ogni evento è
   osservabile/opzionale, mai bloccante (vedi `04-world-simulation.md`).
3. **Deterministico e testabile.** Le probabilità passano dall'RNG seedato;
   ogni nuova regola ha un unit test in `*.test.ts`.
4. **Config prima del contenuto.** Spawn-rate ed economia vivono in un unico
   file di bilanciamento, così il tuning non tocca la logica.

---

## Fase 8 — NPC viventi ed eventi sul campo

**Obiettivo.** Popolare il cimitero di NPC che camminano, con comportamenti e
ricompense distinte, generalizzando il sistema di entità erranti già usato per
fantasma e gatto.

### 8.1 Generalizzare le entità erranti

- Estendere `RoamingKind` in
  [`features/cemetery/useRoamingEntities.ts`](../../prototype/src/features/cemetery/useRoamingEntities.ts):
  `'ghost' | 'cat' | 'crow' | 'gravedigger' | 'priest' | 'rat'`.
- Spostare i parametri per-tipo (`LIFESPAN`, `SPEED`, comportamento di
  movimento) in una tabella `ROAMING_DEFS: Record<RoamingKind, RoamingDef>`.
- Aggiungere comportamenti di movimento oltre al "wander":
  - `perch` (corvo): vola fino a un bersaglio (albero secco/lampione) e si posa.
  - `path` (becchino/prete): attraversa la mappa da bordo a bordo e svanisce.
  - `skitter` (topo): scatti rapidi e cambi di direzione frequenti.

### 8.2 Sprite

- Nuovi componenti in `shared/assets/`: `CrowSprite`, `RatSprite` (fallback SVG
  + supporto PNG via `spriteUrl('npc_crow')` ecc.). `PriestSprite` esiste già;
  serve `GravediggerSprite` (o riuso di `MournerSprite`).
- Asset id attesi (manifest): `npc_crow`, `npc_rat`, `npc_gravedigger`.

### 8.3 Ricompense e timeline

| NPC | Innesco | Tap / effetto | Ricompensa | Memory event |
|---|---|---|---|---|
| Corvo 🐦‍⬛ | sim, di giorno | si posa, gracchia | nessuna (atmosfera) | — |
| Becchino ⛏️ | sim, dopo sepoltura (rank ≥ 3) | osservabile | — | — |
| Prete ✝️ | sim, raro | tap → benedizione | +20 XP, +3 fuochi | `blessing` |
| Topo 🐀 | sim, di notte | tap → scaccia | +1 fuoco | — |

- Le ricompense passano da nuove voci in `XP_VALUES` / `WISP_VALUES`
  (`progressionService`) e da azioni store dedicate (modello: `witnessGhost`,
  `petCat`).
- Il **prete viandante** sostituisce/affianca l'attuale benedizione astratta
  della simulazione, rendendola un evento visibile sulla mappa.

### 8.4 Innesco dalla simulazione

- `simulationService.run` ritorna già segnali singoli (`ghostGraveId`). Generalizzare
  a `spawns: { kind: RoamingKind; near?: {x;y} }[]` con probabilità per fascia
  oraria/stagione.
- Lo store espone `pendingSpawns`; `CemeteryPage` le consuma con `roaming.spawn`
  (estende l'effetto `pendingGhost` attuale).

**File coinvolti.** `useRoamingEntities.ts`, `CemeteryScene.tsx`,
`CemeteryPage.tsx`, `simulationService.ts`, `progressionService.ts`,
`gameStore.ts`, nuovi sprite, `DevPanel.tsx` (trigger per ogni NPC).

**Criteri di accettazione.**
- Ogni NPC compare, si muove col proprio comportamento e svanisce.
- Prete e topo danno ricompensa al tap; corvo e becchino sono puramente
  atmosferici.
- DevPanel può innescare ciascun NPC; unit test sulle probabilità di spawn.

**Stima.** M (≈ mezza giornata). **Dipende da.** nulla (sistema erranti pronto).

---

## Fase 9 — Sistema achievement completo

**Obiettivo.** Trasformare il motore base (`achievementService`) in un catalogo
ricco con criteri, progressione e UI dedicata.

### 9.1 Catalogo

- Definire `ACHIEVEMENTS: AchievementDef[]` con `id`, `name`, `description`,
  `icon`, `tier` (bronzo/argento/oro), e `predicate(stats)`.
- `stats` aggregato derivato da graves + progression + eventi (n. sepolture,
  pulizie totali, fiori portati, fantasmi visti, varietà categorie, fuochi
  spesi, NPC incontrati…). Richiede contatori cumulativi.

### 9.2 Contatori persistenti

- Estendere `UserProgression` (o nuova entità `Stats` singleton) con contatori:
  `totalCleanups`, `totalFlowers`, `ghostsWitnessed`, `npcEncountered`,
  `wispsSpent`, ecc. Aggiornati nelle azioni store relative.
- Migrazione soft come per `wisps`/`isDirty` (default a 0 sui salvataggi vecchi).

### 9.3 UI

- `features/achievements/AchievementsPage` esiste: arricchirla con griglia per
  tier, stato locked/unlocked, barra di progresso per quelli "a soglia".
- Toast di sblocco già presente (`lastUnlockedAchievement`).

**File coinvolti.** `achievementService.ts`, `gameStore.ts`, `types.ts`,
`AchievementsPage.tsx`, repository progression/stats, `achievementService.test.ts`.

**Criteri di accettazione.**
- ≥ 15 achievement con criteri verificabili e test unitari del predicate.
- Sblocco persistente; nessun doppio sblocco; progress bar corretta.

**Stima.** M. **Dipende da.** Fase 8 per gli achievement legati agli NPC.

---

## Fase 10 — Zone tematiche e mausoleo centrale

**Obiettivo.** Dare struttura allo spazio (ranghi 4–5) con zone a tema e un
landmark centrale, aumentando il prestigio e gli obiettivi a lungo termine.

### 10.1 Mausoleo centrale

- Nuovo placeable struttura grande (es. `mausoleum`, footprint `[3,3]` o
  `[4,4]`) in `domain/enums.ts` + `placeables.ts` (`PLACEABLES`, costo, `minRank`
  alto). Sprite `StructureSprite` / asset `env_mausoleum`.
- Unico per cimitero (vincolo: max 1) — validazione in `decorationService`.
- Bonus prestigio dedicato in `computePrestige`.

### 10.2 Zone tematiche

- Concetto `Zone`: regione rettangolare con `theme` (es. gotica, naturale,
  tech-cimitero) che applica un overlay/tinta e dà bonus prestigio se le tombe
  al suo interno rispettano un tema (categoria/tipo lapide coerenti).
- Modello dati: nuova entità `Zone { id, theme, x, y, w, h }` + repository.
- Rendering: layer sotto le tombe in `CemeteryScene` (tinte/bordi per zona).
- Strumento di creazione zona: modalità "disegna area" (drag su griglia) sbloccata
  al rank 5.

### 10.3 Prestigio per varietà di zona

- Estendere `computePrestige` con `zoneScore` (coerenza tema × dimensione).

**File coinvolti.** `enums.ts`, `placeables.ts`, `types.ts`, nuovo
`zonesRepository`, `decorationService.ts`/nuovo `zoneService`, `CemeteryScene.tsx`,
`progressionService.ts`, `gameStore.ts`.

**Criteri di accettazione.**
- Mausoleo piazzabile una sola volta, con bonus prestigio.
- Creazione/eliminazione zone via drag; overlay visivo; bonus coerenza.
- Test su `computePrestige` con zone.

**Stima.** L (1–2 giornate). **Dipende da.** sistema drag esistente.

---

## Fase 11 — Bilanciamento e configurazione centralizzata

**Obiettivo.** Raccogliere tutti i numeri di gioco in un unico punto per il
tuning, senza toccare la logica.

- Nuovo `shared/domain/balance.ts` con: probabilità spawn (erbacce, sporco,
  fantasma, NPC per fascia oraria/stagione), cap fuochi fatui, soglie ranghi,
  durate vita entità, prezzi placeable.
- Refactor di `simulationService`, `useRoamingEntities`, `progressionService`,
  `placeables` per leggere da `balance.ts`.
- Documentare in tabella i valori e il razionale; esporre override dal DevPanel
  (slider/preset "denso", "calmo") per playtest.

**Criteri di accettazione.**
- Nessuna costante di bilanciamento hardcoded fuori da `balance.ts`.
- Cambiare un valore non rompe i test (i test leggono dalla config).

**Stima.** S–M. **Dipende da.** Fasi 8–10 (consolidano i numeri da centralizzare).

---

## Fase 12 — Rifiniture (nice-to-have)

- **Audio**: ambient loop + SFX per tap/sepoltura/eventi (rispetta mute e
  `prefers-reduced-motion` come gating UX).
- **Sharing avanzato**: certificato PNG con foto pixelata + stagione/meteo.
- **Capacitor native**: build iOS/Android, SQLite adapter, notifiche native
  (struttura già predisposta — vedi ADR 0001).
- **Onboarding**: primo avvio guidato (prima sepoltura).

**Stima.** variabile. **Dipende da.** stabilizzazione gameplay (8–11).

---

## Sequenza consigliata

```text
Fase 8 (NPC viventi)  →  Fase 9 (Achievement)  →  Fase 10 (Zone/Mausoleo)
                                                  ↘  Fase 11 (Bilanciamento)
                                                          ↘  Fase 12 (Rifiniture)
```

Le fasi 8 e 9 sono indipendenti e parallelizzabili; la 11 va eseguita **dopo**
aver consolidato i numeri introdotti da 8–10.

## Definizione di "fatto" trasversale

- `npm run typecheck`, `npm test`, `npm run build` verdi.
- Ogni nuova meccanica innescabile dal **DevPanel** per il playtest.
- Nessuna regressione su drag&drop, popup, simulazione esistenti.
