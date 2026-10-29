# Progressione ed economia

Il gioco deve dare una crescita iniziale gratificante, che poi rallenta e lascia spazio alla personalizzazione del cimitero e ai ricordi. Valgono tre regole:
- niente tetti giornalieri di XP;
- niente bisogno di giocare ogni giorno;
- niente dinamiche aggressive per far tornare il giocatore.

**Dove sono i numeri.** Tutti in `src/game/balance.ts`.

**Il foglio.** Il foglio «Necrothing – Game Dynamics» raccoglie l'analisi completa:
- l'audit;
- la matrice delle ricompense;
- la matrice di costi e sblocchi;
- i sistemi;
- le simulazioni;
- i problemi e le decisioni.

**Il simulatore.** `npm run sim:economy` (`scripts/sim-economy.mjs`) rifà le stime con le regole vere del gioco e un giocatore modello. Le ipotesi sono scritte nello script (`HYPOTHESES`): sono stime, non dati reali, e vanno riviste con i dati della beta. `tests/economy.test.mjs` controlla che gli obiettivi qui sotto restino veri.

## Curva dei ranghi (`RANKS`)

| Rango | XP | Obiettivo (stima) |
|---|---|---|
| 2 | 200 | Nella prima sessione: circa 2 minuti (una sepoltura e la cura delle tombe del vecchio custode) |
| 3 | 800 | A fine della prima settimana di gioco occasionale |
| 4 | 2.200 | In circa un mese di gioco occasionale |
| 5 | 5.000 | In circa due mesi e mezzo |

Prima le soglie erano 500, 1.500, 3.500 e 7.000.

## Ricompense che non si sfruttano

**Riesumazione.** Riesumare una tomba entro 24 ore dalla sepoltura ne annulla la ricompensa (`ECONOMY.exhumeRefundHours`):
- vengono tolti XP e fuochi fatui, mai sotto zero;
- la sepoltura non conta più per gli sblocchi;
- il dialogo di conferma lo dice prima.

Dopo le 24 ore riesumare è gratis. Prima, seppellire e riesumare a ripetizione dava 9.000 XP in un'ora.

**Animale.** Porta un regalo dopo 3–6 coccole o giochi, scelti a caso. Ne porta al massimo 2 per ogni apertura del gioco (`PET_GIFT.perOpening`, `game/petGifts.ts`), poi è sazio fino alla prossima apertura. Prima, coccolandolo, si facevano circa 1.200 fuochi fatui l'ora.

**Albero dei ricordi.** Affidargli una tomba è un rito, non una nuova sepoltura: dà 30 XP e nessun fuoco fatuo (`XP.entrust`).

**Prestigio.** Contano solo gli oggetti da almeno 3 fuochi fatui (`ECONOMY.prestigeMinCost`), così il recinto non si allarga spargendo erba alta.

## Cura del cimitero

**Mentre si gioca** non cambia niente:
- i fiori appassiscono in 3 giorni;
- erbacce e sporco arrivano a caso;
- una tomba trascurata per 10 giorni si rompe e ripararla costa 6 fuochi fatui.

**A gioco chiuso** il tempo conta al massimo 7 giorni (`DECAY.maxAbsenceDays`). Gli orologi dell'incuria (sporca da, fiori del, ultima cura) vanno avanti di quanto si è stati via in più.
- Dopo un mese il cimitero si ritrova come dopo una settimana: erbacce, sporco, fiori secchi.
- Non ci sono tombe rotte né debiti di riparazione, e si risistema pulendo, che dà anche qualcosa.
- Anniversari e meteo restano quelli veri.

**Promemoria.** Gli anniversari si premiano solo il giorno stesso, come deciso. Per il resto c'è una sola notifica, alle 18, il giorno in cui si prevede che più della metà delle tombe sarà sporca o rotta (`REMINDERS.neglectShare`, `game/reminders.ts`). Non ci sono più avvisi per ogni tomba che sta per rompersi.

## Cosa resta separato

Restano distinti, come dalla Milestone 1 (vedi `docs/distribuzione-e-accesso.md`):
- accesso Demo/Full;
- rango;
- fuochi fatui;
- possesso;
- prerequisiti.

Nella beta l'accesso è Full e la progressione vale per tutti.
