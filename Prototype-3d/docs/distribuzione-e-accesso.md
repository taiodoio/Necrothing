# Distribuzione e accesso commerciale

La roadmap ha due traguardi:
- **Milestone 1 — Beta Full** (adesso): TestFlight e beta del Play Store, tutto il gioco, nessun acquisto in-app, nessun codice promozionale.
- **Milestone 2 — Release pubblica**: Demo gratuita, Full con un acquisto in-app permanente, ripristino degli acquisti, progressi conservati.

Qui c'è quello che serve alla prima e la struttura pronta per la seconda.

Tre cose restano sempre separate:
- **accesso commerciale**: Demo o Full;
- **progressione**: XP, rango, stagioni, traguardi, tombe;
- **possesso**: oggetti comprati o piazzati.

Nella beta tutto è commercialmente accessibile, ma si sblocca giocando come qualsiasi giocatore.

## Profili di distribuzione

Il profilo si sceglie con `src/config/distribution.ts` e la variabile `VITE_DISTRIBUTION`. È una cosa diversa dalla modalità di Vite: una build di produzione **non** significa Demo.

| Profilo | Quando | Accesso iniziale | Acquisti in-app | Limiti Demo | Simulazione Demo/Full |
|---|---|---|---|---|---|
| `beta-full` | `npm run build` / `npm run build:beta` (sito, TestFlight, beta Play Store) | Full, dalla distribuzione | no | no | no |
| `store-release` | futura release pubblica: la build si rifiuta senza `ALLOW_STORE_RELEASE=1` | Demo (poi Full dagli store) | no (Milestone 2) | sì, con accesso Demo | no |
| `development` | `npm run dev` | Full | no | sì, solo se si simula la Demo | sì: `?access=demo` o `?access=full` |

- Un nome di profilo sbagliato fa fallire la build (`vite.config.ts`).
- Il profilo attivo si vede in Impostazioni › Info, accanto alla versione.
- Oggi l'unico profilo distribuito è `beta-full`.

## Servizio entitlement

Il servizio sta in `src/game/entitlement.ts`.
- `entitlement()` restituisce `{ access: 'demo' | 'full', source: 'distribution' | 'store' | 'simulated' }`.
- `hasAccess(required)`: `demo` vale per tutti, `full` solo con la Full.
- `demoLimitsActive()` e `personalGraveLimit()` dicono se valgono i limiti della Demo. Nella beta non valgono mai.
- `receiveStoreAccess(access)` riceverà l'accesso riconosciuto dagli store. Lo accetta solo `store-release`; nella beta viene ignorato.
- `simulateAccess(access)` funziona solo in `development`; altrove viene ignorato.
- `StoreAccessProvider` descrive la forma di chi leggerà gli acquisti (StoreKit, Play Billing). Non c'è nessun pagamento, nemmeno finto.

Le schermate non decidono mai da sole cosa si può comprare. Usano i risultati delle regole (`rules.ts`), che chiedono l'accesso al servizio:
- `shopAvailability` e `unlockRequirements` per gli oggetti;
- `houseAvailability` e `houseRequirements` per la Casa;
- `graveTypeAvailability` per le lapidi;
- `lookOptionAvailability` per l'aspetto;
- `canStartBurial` e `personalGraves` per il limite delle tombe.

L'ordine dei controlli è sempre lo stesso: prima l'accesso commerciale, poi lo sblocco, poi il prezzo.

**L'accesso non si salva**: non sta nel salvataggio né nel backup, e non tocca XP, rango, fuochi fatui o possesso. Il salvataggio tiene solo `meta.firstDistribution` e `meta.lastDistribution`, a titolo informativo: non danno e non tolgono accesso.

## Limiti della Demo futura

I valori stanno in `DEMO_LIMITS` (`src/config/distribution.ts`) e valgono solo con accesso Demo in `store-release` (o in `development` con la Demo simulata). Mai nella beta.

- **Tombe narrative.** Le 10 tombe del vecchio custode della partita nuova sono escluse dal limite. La roadmap ne indicava 3; per ora restano 10, come deciso. Tre di queste sono le tombe dell'introduzione (`docs/primo-ingresso.md`).
- **Tombe personali.** Al massimo **5**, cioè le tombe del giocatore nel cimitero (`personalGraves`). Non contano i ricordi affidati all'albero, che è Full.
- **Catalogo limitato.** Si compra solo quello classificato `demo` (vedi sotto).
- **Progressi.** XP, rango e fuochi fatui restano e non si azzerano passando alla Full.

## Progressione nella beta

I blocchi di prova (`RELEASE_LOCKS`, `EARLY_ACCESS`) sono stati tolti: rango, stagione, traguardi e numero di tombe valgono per tutti.

Prima, 34 oggetti si compravano a qualsiasi rango e fuori stagione, l'Albero dei ricordi non chiedeva le 20 tombe e il cappello da strega era libero. **Chi li ha già li tiene**:
- oggetti in inventario o piazzati restano;
- il cappello da strega indossato resta finché non lo si cambia;
- nessun dato viene toccato.

Due elementi sono stati ribilanciati come sblocchi:
- **Bicicletta:** rango 2, 60 fuochi fatui (prima 50). Classificata Demo.
- **Albero dei ricordi:** rango 3 (prima 1), 150 fuochi fatui, 20 sepolture. Le tombe del vecchio custode contano, quindi in pratica servono 10 sepolture del giocatore. Classificato Full.

## Classificazione del catalogo

**Criterio approvato:**
- **Demo:** oggetti di rango 1–2 non unici e non stagionali, più quello che c'è nella partita nuova;
- **Full:** il resto.

Eccezioni decise:
- i 6 stagionali con una finestra di date sono Full, ma nella beta si comprano nella loro stagione;
- Albero dei ricordi: Full;
- bicicletta: Demo;
- Lampione gotico e Statua dell'angelo (rango 3) sono nella mappa iniziale: Demo.

Le classi stanno:
- per gli oggetti, in `ACCESS` in `src/game/catalog.ts`, che riempie il campo `access` di ogni oggetto;
- per tetti e aggiunte, nel campo `access` in `house.ts`;
- per le lapidi, in `GRAVE_TYPE_ACCESS` in `graves.ts`;
- per l'aspetto, in `LOOK_ACCESS` in `look.ts`;
- per le funzionalità, in `FEATURES` in `features.ts`.

I test controllano che ogni oggetto abbia una sola classe e che le eccezioni siano solo queste.

### Scelte ancora aperte

| Elemento | Classe provvisoria | Nota |
|---|---|---|
| `cat_shelter` (Rifugio dei gatti, rango 2, unico) | full | Unico: fuori dal criterio Demo. Messo con le altre presenze. Da confermare. |
| `xmas_tree` (Albero di Natale, rango 1, solo dicembre) | demo | Stagionale per mese, non per finestra di date: non era tra i 6. Da confermare. |
| Teste speciali (zucca, teschio, zombie) e altre scelte d'aspetto | demo | Oggi tutte libere. Solo il cappello da strega è Full (viene con l'Angolo della strega). |
| Ampliamento del recinto (`expansion`) | demo | Si sblocca col prestigio. Per la Demo manca una decisione (fermarlo a un livello?). |
| Tombe del vecchio custode con lapidi Full (angelo, obelisco, memoriale, monumento) | — | Nelle partite nuove ora hanno lapidi della Demo. Nei salvataggi esistenti restano come sono. |

### Funzionalità

| ID | Accesso | Arriva con |
|---|---|---|
| sepoltura, foto, cartoline, registro, aspetto del Custode, Casa, backup, promemoria | demo | — |
| `bike` | demo | `bike` |
| `memoryTree` | full | `memory_tree` |
| `businesses` (bar, orto) | full | `zombie_bar` (e `brain_farm`) |
| `gravedigger` | full | `gravedigger_house` |
| `vampireBite` | full | `vampire_crypt` |
| `broomFlight` | full | `broom` |
| `mysticStaff` | full | `mystic_staff` |
| `expansion` | demo (aperta) | prestigio |

### Elenco completo

Generato dal codice il 27/10/2026.

**Luci**

| ID | Accesso | Rango | Costo | Prerequisiti |
|---|---|---|---|---|
| `lamp_post` | demo | 1 | 8 | — |
| `lamp_post_double` | demo | 2 | 12 | — |
| `lamp_post_gothic` | demo | 3 | 16 | — |
| `lantern` | demo | 1 | 5 | — |
| `lantern_pole` | demo | 1 | 7 | — |
| `lantern_stone` | demo | 2 | 9 | — |
| `ghost_lantern` | demo | 2 | 9 | — |
| `glow_pumpkin` | demo | 1 | 4 | — |
| `skull_candle` | demo | 2 | 5 | — |
| `torch` | demo | 2 | 6 | — |
| `bonfire` | full | 3 | 14 | — |
| `candelabra` | demo | 2 | 14 | — |
| `spirit_lantern` | full | 3 | 18 | — |
| `skull_garland` | full | 3 | 26 | — |
| `keeper_lamp` | full | 3 | 30 | unico, traguardo: lightsRepaired 25 |
| `candle_tree` | full | 4 | 24 | — |
| `fence_lights` | full | 1 | 3 | stagione: dic – gen |

**Decorazioni**

| ID | Accesso | Rango | Costo | Prerequisiti |
|---|---|---|---|---|
| `wreath` | demo | 1 | 4 | — |
| `sign` | demo | 1 | 4 | — |
| `angel_statue` | demo | 3 | 22 | — |
| `votive_statue` | demo | 2 | 18 | — |
| `open_coffin` | demo | 2 | 10 | — |
| `bones` | demo | 1 | 3 | — |
| `vase` | demo | 1 | 3 | — |
| `book_pile` | demo | 1 | 6 | — |
| `stuffed_crow` | demo | 2 | 10 | — |
| `gargoyle` | full | 3 | 24 | — |
| `reaper_statue` | full | 4 | 50 | — |
| `keeper_statue` | full | 5 | 100 | unico |
| `urn` | demo | 2 | 5 | — |
| `giant_web` | full | 1 | 12 | stagione: ottobre |
| `dead_altar` | full | 1 | 25 | stagione: 31 ott – 2 nov |
| `skeleton_snowman` | full | 1 | 15 | stagione: dic – gen |

**Costruzioni**

| ID | Accesso | Rango | Costo | Prerequisiti |
|---|---|---|---|---|
| `shop` | demo | 1 | 0 | unico |
| `keeper_house` | demo | 1 | 0 | unico |
| `gravedigger_house` | full | 3 | 60 | unico |
| `shrine` | full | 3 | 55 | unico |
| `zombie_bar` | full | 3 | 45 | unico |
| `brain_farm` | full | 3 | 35 | unico |
| `mausoleum` | full | 4 | 80 | unico |
| `open_grave` | demo | 2 | 12 | — |
| `wall_stone` | demo | 1 | 3 | — |
| `fence_wood` | demo | 1 | 2 | — |
| `fence_iron` | demo | 2 | 4 | — |
| `arch_stone` | demo | 2 | 20 | — |
| `arch_lights` | full | 3 | 28 | — |
| `arch_gothic` | full | 3 | 32 | — |
| `path_stone` | demo | 1 | 1 | — |
| `path_dirt` | demo | 1 | 1 | — |
| `well` | demo | 2 | 25 | unico |
| `fountain` | full | 3 | 40 | unico |
| `hell_hole` | full | 4 | 45 | unico |
| `memory_tree` | full | 3 | 150 | unico, 20 tombe |
| `soul_bell` | full | 4 | 60 | unico |
| `soul_gazebo` | full | 4 | 70 | unico |
| `pet_house` | demo | 2 | 20 | — |
| `pet_house_cat` | demo | 2 | 22 | — |
| `pet_house_rabbit` | full | 3 | 24 | — |
| `pet_house_duck` | full | 3 | 24 | — |
| `pet_house_crow` | full | 3 | 28 | — |

**Ambiente**

| ID | Accesso | Rango | Costo | Prerequisiti |
|---|---|---|---|---|
| `pond` | demo | 2 | 30 | — |
| `dead_tree` | demo | 1 | 8 | — |
| `spectral_tree` | full | 3 | 26 | — |
| `half_pine` | demo | 1 | 10 | — |
| `xmas_tree` | demo | 1 | 15 | solo dicembre |
| `toxic_puddle` | demo | 1 | 5 | — |
| `monster_rocks` | demo | 2 | 9 | — |
| `flowerbed` | demo | 1 | 6 | — |
| `poison_shrooms` | demo | 1 | 3 | — |
| `bushes` | demo | 1 | 4 | — |
| `hillock` | demo | 1 | 6 | — |
| `tall_grass` | demo | 1 | 1 | — |
| `cypress` | demo | 1 | 6 | — |
| `glow_shrooms` | demo | 2 | 12 | — |
| `witch_apple` | demo | 2 | 14 | — |
| `swing_tree` | full | 3 | 28 | — |
| `stone_circle` | full | 3 | 30 | — |
| `hand_swamp` | full | 3 | 35 | unico |
| `hell_crack` | full | 5 | 60 | unico |
| `mud` | demo | 1 | 1 | — |
| `pumpkin_patch` | full | 1 | 20 | stagione: ottobre |

**Presenze**

| ID | Accesso | Rango | Costo | Prerequisiti |
|---|---|---|---|---|
| `zombies_play` | full | 3 | 30 | — |
| `zombies_dance` | full | 3 | 30 | — |
| `scarecrow` | full | 3 | 26 | — |
| `gardener_corner` | full | 3 | 28 | — |
| `ghosts_ball` | full | 4 | 34 | — |
| `cat_shelter` | full | 2 | 25 | unico |
| `ghost_picnic` | full | 3 | 40 | unico |
| `witch_corner` | full | 4 | 55 | unico |
| `skeleton_band` | full | 4 | 65 | unico |
| `vampire_crypt` | full | 5 | 90 | unico |
| `lovers_bench` | full | 1 | 30 | stagione: febbraio |

**Extra**

| ID | Accesso | Rango | Costo | Prerequisiti |
|---|---|---|---|---|
| `mystic_staff` | full | 4 | 0 | unico, traguardo: wispsEarned 500 |
| `broom` | full | 5 | 120 | unico |
| `bike` | demo | 2 | 60 | unico |

**Casa del Custode**

| ID | Tipo | Accesso | Rango | Costo |
|---|---|---|---|---|
| `slate` | tetto | demo | 1 | 0 |
| `moss` | tetto | demo | 1 | 12 |
| `tiles` | tetto | demo | 2 | 25 |
| `thatch` | tetto | full | 3 | 40 |
| `lantern` | aggiunta | demo | 1 | 6 |
| `flowerbox` | aggiunta | demo | 1 | 8 |
| `toolbench` | aggiunta | demo | 1 | 8 |
| `smoke` | aggiunta | demo | 2 | 12 |
| `picket` | aggiunta | demo | 2 | 15 |
| `pumpkins` | aggiunta | demo | 2 | 10 |
| `garden` | aggiunta | demo | 2 | 30 |
| `beehive` | aggiunta | full | 3 | 20 |
| `fruit` | aggiunta | full | 3 | 45 |
| `veggie` | aggiunta | full | 3 | 60 |

**Lapidi**

| ID | Accesso | Rango |
|---|---|---|
| `stone_simple` | demo | 1 |
| `rectangular` | demo | 1 |
| `gothic` | demo | 1 |
| `celtic_cross` | demo | 2 |
| `marble_cross` | demo | 2 |
| `angel` | full | 3 |
| `obelisk` | full | 3 |
| `family_memorial` | full | 4 |
| `decorated_monument` | full | 4 |
| `victorian` | demo | 2 |

## Salvataggi

**Schema.** `SaveData` (`src/game/state.ts`) sta in localStorage (`necrothing3d.save.v1`); le foto stanno in IndexedDB.

**Versione 4.** `SAVE_VERSION = 4`, con `MIGRATIONS` numerate e applicate in ordine solo oltre la versione salvata:
- v2: mappa 64×64 (spostamento di 8 celle);
- v3: il registro `meta` delle distribuzioni;
- v4: lo stato del primo ingresso (`onboarding`). I salvataggi esistenti lo hanno già finito (`docs/primo-ingresso.md`).

Le altre correzioni (tipi rinominati, rimborsi, valori mancanti) restano riparazioni ripetibili, valide per salvataggi di qualsiasi età.

**Mai distruttive.** XP, fuochi fatui, inventario, tombe, ricordi, posizioni, Casa, aspetto e preferenze passano intatti. I test lo verificano su due salvataggi campione (`tests/fixtures/save-v1.json`, `save-v2.json`) creati col codice di prima.

**Copie di sicurezza** accanto al salvataggio, che il gioco non cancella mai:
- `….pre-vN`: com'era prima della migrazione alla versione N;
- `….newer`: una partita di una versione più nuova del gioco (per esempio dopo il ritorno a una build TestFlight precedente). Si apre senza abbassarne la versione e senza perdere campi sconosciuti;
- `….unreadable`: un salvataggio che non si legge. Prima veniva sovrascritto subito da una partita nuova; ora viene tenuto da parte e il giocatore viene avvisato.

**Export/import.** Il formato ZIP `.necro3d` non cambia. I backup vecchi si importano e vengono migrati; un backup di una versione più nuova del gioco viene rifiutato con un messaggio chiaro.

## Politica per la release pubblica (Milestone 2, non applicata ora)

Riguarda chi ha giocato la beta (o una Full) e si ritrova con accesso Demo.

- **Nessun dato viene cancellato.** Quello che è nei dati resta nei dati.
- **Oggetti Full già piazzati:** restano dove sono e continuano a funzionare. Si possono spostare e riporre, ma non ricomprare né piazzare di nuovo dall'inventario finché non torna la Full.
- **Oggetti Full in inventario:** restano nell'inventario, visibili, ma non si piazzano.
- **Tombe oltre il limite:** restano tutte; non se ne aggiungono di nuove finché le tombe personali sono 5 o più.
- **Aspetto Full già indossato:** resta finché non lo si cambia.
- **Casa:** le aggiunte Full già comprate restano visibili con i loro vantaggi; non se ne comprano altre.
- **Progressi:** XP, rango e fuochi fatui non cambiano.

**Ai beta tester non si promette** il mantenimento dell'accesso Full dopo la pubblicazione. Il registro `meta` dice da dove viene una partita, ma non concede nulla.

## Rinviato alla Milestone 2

- Plugin degli acquisti in-app (StoreKit 2, Google Play Billing) e un `StoreAccessProvider` reale.
- Ripristino degli acquisti; cache locale della ricevuta, verificata a ogni avvio.
- Attivazione di `store-release` (togliere il blocco `ALLOW_STORE_RELEASE`) e i limiti Demo in produzione.
- Applicazione della politica qui sopra:
  - oggetti Full non piazzabili dall'inventario;
  - aggiunte Full non comprabili;
  - eccetera.
- Testi e schermate commerciali (cosa include la Full, acquisto, ripristino), oggi assenti: c'è solo il lucchetto «Versione completa».
- Decisioni aperte: le voci della tabella qui sopra e le 3 tombe narrative della roadmap (oggi 10).
- Progetti Capacitor iOS/Android (vedi `docs/capacitor-todo.md`), con il salvataggio spostato fuori da localStorage.
- Gestione dei beta tester alla pubblicazione (comunicazione, eventuali omaggi: da decidere, nessuna promessa ora).
