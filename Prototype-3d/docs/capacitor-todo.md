# Capacitor: cosa preparare per l'app

Il gioco è pensato per essere impacchettato con Capacitor (iOS e Android); il
browser serve solo per il debug. Questa è la lista delle cose da fare (o da
verificare) quando si crea il progetto Capacitor.

## Già pronto nel codice

- **Ciclo di vita** (`src/app/platform.ts`):
  - **In pausa** (eventi `pause`/`resume` di Capacitor, `appStateChange` del plugin App, `visibilitychange`): si salva, si ripianificano i promemoria e il loop dei frame si ferma del tutto.
  - **Al rientro:** riparte e si recupera il tempo passato.
  - **Visibile senza focus:** 5 FPS.
  - I plugin nativi si leggono da `window.Capacitor` solo dentro l'app.
- **Promemoria** (`src/game/reminders.ts`, `src/app/reminders.ts`):
  - **Quando partono:** il giorno di ogni anniversario alle 10; una volta sola, alle 18, il giorno in cui più della metà delle tombe sarà sporca o rotta (`REMINDERS.neglectShare`).
  - **Limiti:** uno al giorno per tipo, al più 48 in attesa (iOS ne tiene 64).
  - **Permesso:** il gioco lo chiede dopo la prima sepoltura, con un suo dialogo; interruttore «Promemoria» in Impostazioni.
  - **Nel browser:** non partono; il bench mostra quelli che pianificherebbe.
- **Tempo a gioco chiuso:** recupero per giorni interi, anniversari persi registrati nei ricordi.

## Da installare

- [ ] `@capacitor/core`, `@capacitor/cli`, piattaforme `@capacitor/ios` e `@capacitor/android`.
- [ ] `@capacitor/app` (ciclo di vita, tasto indietro).
- [ ] `@capacitor/local-notifications`:
  - icona piccola delle notifiche su Android;
  - canale di notifica;
  - testi del permesso su iOS.

## Da implementare

1. **Salvataggio (priorità alta).**
   - **Oggi:** la partita sta in `localStorage`, le foto in IndexedDB.
   - **Il rischio:** iOS (e a volte Android) può svuotarli quando manca spazio.
   - **Da fare:** spostare la partita su `@capacitor/preferences` (o su un file con `@capacitor/filesystem`) e le foto su file, aggiungendo un backup automatico (per esempio l'ultimo salvataggio buono più uno giornaliero).
   - **Migrazione:** al primo avvio dell'app si leggono i dati vecchi da `localStorage` e IndexedDB.
2. **Tasto indietro di Android** (plugin App, evento `backButton`). Chiude, in ordine:
   1. dialogo;
   2. pannello (drawer);
   3. menù contestuale;
   4. modalità Modifica o posizionamento.
   Solo dopo esce dal gioco (o chiede conferma).
3. **Barra di stato e splash** (`@capacitor/status-bar`, `@capacitor/splash-screen`).
   - Barra di stato col colore del tema (scuro grigio-violetto / chiaro).
   - Lo splash resta finché la scena 3D non ha disegnato il primo frame, poi si chiude.
   - Gli inset di notch e barra di navigazione sono già gestiti in CSS (`env(safe-area-inset-*)`): verificarli sui dispositivi.
4. **Vibrazione** (`@capacitor/haptics`). Leggera alla sepoltura, al morso del vampiro, alla riscossione degli incassi, all'acquisto in Bottega. Da rendere disattivabile in Impostazioni.
5. **Contesto WebGL perso al rientro.** Il ripristino è già gestito (`webglcontextlost` / `webglcontextrestored`): va provato su dispositivi veri dopo molto tempo in background e con poca memoria.

## Da verificare sui dispositivi

- Eventi di pausa e rientro su iOS e Android:
  - il loop si ferma davvero;
  - la batteria non scende in background;
  - la pausa salva sempre.
- Le notifiche arrivano all'ora giusta (fuso orario, ora legale) e non si duplicano ripianificando (gli id sono stabili per giorno e tipo).
- Prove A/B nel bench, prima di portarle nel gioco: nebbia del bosco ottimizzata e sfocatura ai bordi a mezza risoluzione, confrontando FPS e «lavoro ms/s».
