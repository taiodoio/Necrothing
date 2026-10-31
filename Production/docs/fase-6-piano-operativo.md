# Necrothing — Fase 6: piano operativo beta

## Ordine di lavoro

Distribuiremo prima un APK Android firmato per installazione diretta e prova controllata. Dopo aver chiuso i problemi emersi, prepareremo l'archivio iOS e lo distribuiremo tramite TestFlight. La beta sarà `beta-full`, senza pagamenti o UI per acquisti reali.

## Stato di partenza

- I progetti Capacitor esistono già: `Production/android` e `Production/ios/App/App.xcodeproj`. Non serve crearli da zero in Android Studio o Xcode; quando serve ti guido ad aprire e configurare questi progetti.
- Capacitor è alla versione 8. `npm run cap:sync` esegue la build `beta-full` e sincronizza i due progetti.
- La build Android debug è già riuscita ed è stata avviata nell'emulatore API 36.1. Quell'APK è solo una build di verifica, non quella da distribuire.
- La compilazione iOS arm64 senza firma è riuscita. Firma, archivio, installazione su iPhone 17 Pro e TestFlight sono ancora da fare.
- Il profilo `beta-full` concede Full, non attiva limiti Demo, IAP o simulazione di accesso. `development` è il solo profilo con simulazione Demo/Full. Lo shop di gioco con valuta virtuale resta parte del gameplay; non verranno aggiunti pagamenti reali.
- Bundle ID iOS/Android attuale: `com.taiodoio.necrothing`, provvisorio finché non verificato negli account sviluppatore.
- La versione web è `0.2.0`; il primo APK Android era `versionName 0.2.0` / `versionCode 1`; la prossima build di prova usa `versionCode 2` per consentire l’aggiornamento in place. iOS è ancora `1.0` build `1`. Prima della distribuzione iOS verificare il numero build disponibile nell’account Apple.

## Avanzamento — 29 ottobre 2026

- Confermato per questa beta l’application ID Android attuale `com.taiodoio.necrothing`; prima della pubblicazione su Play va verificato che non sia già associato a un’altra app.
- Android configurato per portrait, `versionName 0.2.0`, tema scuro e barre native impostate trasparenti. Su emulatore API 36 la scena, HUD e tutorial si sono disegnati; lo screenshot mostra ancora fondi di sistema visibili, perciò la trasparenza e il contrasto delle icone vanno ricontrollati su un dispositivo Android fisico.
- Icone e schermate di avvio native generate dai sorgenti in `Necrothing_Capacitor_Assets/assets`; la build beta è stata sincronizzata con Capacitor e `assembleDebug` è riuscito. L’APK debug non è distribuibile.
- `npm run typecheck` e `npm test`: superati, 149 test su 149. L’emulatore ha mostrato rallentamenti/ANR di System UI; non li attribuisco all’app, ma questo limita il valore della prova prestazionale.
- APK release generato in `android/app/release/app-release.apk`, firmato con la chiave `necrothing-release`; `apksigner` conferma firma v2 valida. Il pacchetto è `com.taiodoio.necrothing`, versione `0.2.0` / versionCode `1`, target SDK 36 e portrait. L’APK è circa 62 MB e viene escluso da Git.
- Da completare: installazione pulita e aggiornamento in place, prova offline/notifiche/salvataggi su dispositivo Android fisico. L’unico dispositivo collegato è l’emulatore con la build debug: la firma diversa impedisce l’aggiornamento diretto; rimuoverla cancellerebbe i dati locali dell’emulatore.
- Correzioni dai feedback sul Galaxy Android: Auto parte alla risoluzione massima della fascia stimata, conta i frame bloccati e riduce risoluzione/fascia solo se il carico reale lo richiede; geometrie low-poly persistite in IndexedDB con chiave derivata dai generatori; modelli del cimitero e del tutorial preparati prima del primo ingresso; il cortile tutorial viene costruito in una scena temporanea compatta, poi liberata quando si riattiva la scena reale già pronta. Restano gli indicatori di caricamento e il blocco degli input durante le transizioni; il passaggio dalla schermata del nome aspetta che tastiera e viewport si stabilizzino.
- Caricamento asset comune alle build Capacitor iOS/Android: cache locale best effort, rigenerabile e separata dai salvataggi. Il primo avvio prepara e salva i modelli; agli avvii successivi li ripristina a tranche. Le fasi di costruzione della scena 3D sono ancora in parte sincrone e vanno misurate/suddivise ulteriormente se il loading continua a bloccarsi.
- Dopo le correzioni: `npm run typecheck` superato; `npm test` superato, 150/150; `npm run cap:sync` e `android/gradlew assembleDebug` riusciti. `versionCode` Android aggiornato a `2` per poter installare questa build sopra la beta firmata precedente. Firma della nuova release e retest sul Galaxy fisico ancora da fare.

## Fase A — APK Android

1. Aprire in Android Studio il progetto esistente `Production/android`; verificare SDK 36, Gradle JDK, sincronizzazione Gradle e che non compaiano modifiche non salvate inattese.
2. Ricostruire con `npm run cap:sync`, quindi controllare che l'APK contenga la build beta offline e non un URL/server di sviluppo.
3. Verificare application ID, `versionName` e `versionCode`. Mantenere `com.taiodoio.necrothing` solo se sarà l'identificatore definitivo anche nell'eventuale distribuzione Play.
4. Da **Build > Generate Signed Bundle / APK**, generare un APK release firmato. Creare o selezionare il keystore sul Mac, custodire file e password fuori da Git e dal pacchetto condiviso. Annotare fingerprint e percorso nel password manager/archivio sicuro.
5. Installare l'APK release su emulatore e dispositivo Android, avviarlo anche in modalità aereo e verificare primo avvio, onboarding, gameplay, Full, notifiche, save/restart e rotazione bloccata in portrait.
6. Distribuire l'APK ai tester Android con istruzioni per installazione manuale; raccogliere modello, versione Android, esito e log dei problemi.

**Assunzione:** per questa prima prova Android useremo un APK firmato installato direttamente. Se la destinazione fosse invece Google Play testing, cambieremmo il deliverable in AAB e seguiremmo Play App Signing. Le chiavi sono rilevanti per gli aggiornamenti: Android Studio/Android richiede una firma per distribuire l'app, e Play App Signing ha un flusso distinto per upload key e app signing key ([documentazione Android](https://developer.android.com/studio/publish/app-signing)).

## Fase B — hardening comune prima di iOS

1. Bloccare il gioco in portrait: iOS supporta oggi anche landscape e Android non dichiara `screenOrientation`.
2. Rendere stabile la modalità scura: il documento web è già `data-theme="dark"` e i CSS dichiarano `color-scheme: dark`; controllare tema `DayNight` Android e schermata di lancio iOS, evitando flash chiari.
3. Valutare barre di stato e gesture trasparenti con safe-area. Oggi il codice imposta uno sfondo opaco per la status bar iOS/Android; provare l'overlay nativo, gli inset e il contrasto sui device prima di adottarlo.
4. Generare le icone native dai sorgenti `Necrothing_Capacitor_Assets/assets` e controllare gli splash per entrambe le piattaforme. La scena splash web è locale; le immagini native sono ancora da convalidare.
5. Verificare i permessi effettivamente richiesti dal manifest iOS/Android. Per le notifiche: prompt nel momento previsto, pianificazione dopo l'evento, preferenza disattiva, deduplicazione e orari locali con cambio fuso/ora legale.
6. Eseguire una build `beta-full` e verificare che non siano raggiungibili simulazioni Demo/Full, pannelli o statistiche debug, codice promozionale, IAP o schermate di acquisto reale. Aggiungere controlli automatici sul profilo compilato e sui percorsi accessibili.
7. Controllare risorse locali, offline, save Preferences, IndexedDB foto, export/import, riavvio e assenza di richieste a un server di sviluppo. Le foto restano su IndexedDB: non dichiarare che un backup sistema automatico le protegga; l'export ZIP resta il backup portabile.

## Fase C — iPhone e TestFlight

1. Prima di toccare identificatori/versioni, verificare App Store Connect e Developer Team: app già registrata, Bundle ID, titolarità, certificati e ruolo dell'account. Non rinominare un Bundle ID associato a una app esistente.
2. Aprire il progetto esistente con `npm run cap:open:ios` o Xcode. Selezionare Team e signing automatico; impostare la versione marketing e build number successivo disponibile.
3. Limitare `UISupportedInterfaceOrientations` a portrait su iPhone e iPad, convalidare safe area, splash, icone, status bar e home indicator.
4. Collegare l'iPhone 17 Pro, autorizzare il Mac e avviare la beta firmata direttamente da Xcode. Completare i casi della checklist del dispositivo prima dell'archivio.
5. In Xcode creare l'Archive `Any iOS Device`, validare e caricare su App Store Connect. Il CoreSimulator locale è disallineato a Xcode, ma la compilazione arm64 è già riuscita; la prova prioritaria sarà sul telefono reale.
6. Inserire le informazioni beta, assegnare il build a un gruppo interno e raccogliere i primi feedback. Solo dopo il controllo interno scegliere se invitare tester esterni.
7. Apple richiede informazioni di test e upload del build; il build TestFlight è utilizzabile fino a 90 giorni. Il primo build condiviso con tester esterni può richiedere Beta App Review ([TestFlight overview Apple](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)).

## Checklist iPhone 17 Pro

- Installazione pulita: splash, primo avvio, pergamena, nome e tutorial, in portrait e con safe area corretta.
- Partita completa: prima sepoltura, tombe, Shop di gioco, inventario, progressione e contenuti Full.
- Lingua; chiusura/ripresa da background; riavvio forzato; sessione offline.
- Salvataggio persistente, export/import ZIP con foto e lingua; reinstallazione da trattare come scenario a rischio perdita, non come migrazione garantita.
- Notifiche: richiesta permesso dopo il trigger previsto, ricezione, disattivazione e nessun duplicato.
- Performance/memoria: avvio a freddo, sessione prolungata, cambio schermate, ritorno da background e comportamento dopo perdita del contesto WebGL.
- Nessuna rotazione landscape; status bar e home indicator leggibili e sovrapposti correttamente alla scena.

FPS, memoria, lifecycle nativo, notifiche reali, import da file e perdita WebGL non sono certificabili dai test unitari: richiedono test manuale su telefono. I test Android emulator/desktop sono solo copertura aggiuntiva.

## Metadati beta da predisporre

- Nome: **Necrothing Beta**.
- Descrizione: beta completa per provare il cimitero, le sepolture, i ricordi, la bottega di gioco, le decorazioni e la progressione.
- Funzionalità da provare: primo avvio/tutorial; sepoltura; cura e decorazioni; economia e progressione; lingua; notifiche; salvataggi e backup; background/foreground.
- Limitazioni note da comunicare: dati memorizzati sul dispositivo; esportare un backup prima di cambiare o reinstallare la build; possibili problemi di performance o ripresa da background da segnalare con modello e versione OS.
- Contatto: usare l'indirizzo di supporto già configurato nella scheda Info e verificare che riceva messaggi prima dell'invito.
- Versione: allineare a `0.2.0` solo se non esiste una versione/build precedente in App Store Connect; incrementare sempre il build number per ogni upload.
- Note di rilascio: «Prima beta completa di Necrothing. Prova il tutorial, prenditi cura del cimitero, raccogli ricordi e decorazioni e inviaci feedback su stabilità, prestazioni e salvataggi.»

## Compatibilità salvataggi e passaggio futuro

- TestFlight → TestFlight: aggiornamento sullo stesso Bundle ID normalmente aggiorna l'app mantenendo il contenitore; verificare comunque il save e tenere un export prima della prova.
- TestFlight → App Store: stessa app/Bundle ID e schema compatibile; non cambiare versione dello schema senza migrazione e test export/import.
- Beta Full → Demo futura: il profilo cambia da `beta-full` a `store-release`, ma il salvataggio resta sul dispositivo. Provare partita Full con più tombe del limite Demo, accesso ai contenuti già posseduti, economia e progressione. Definire la regola per i contenuti Full già presenti prima di distribuire una Demo.
- Reinstallazione, cambio dispositivo o pulizia dati possono perdere i dati locali: non presumere una sincronizzazione cloud. Provare export/import e istruire i tester a esportare prima di reinstallare.
- Non distribuire update firmati con chiavi/bundle ID differenti dai precedenti se si desidera un aggiornamento in-place.

## Gate di rilascio

**Gate Android:** APK release firmato, avvio su device, Full senza modalità debug, portrait, offline, notifiche e persistenza verificate. Poi passiamo all'archivio iOS.

**Gate TestFlight:** Bundle ID e team verificati, build/versione, icone e orientamento definitivi, test su iPhone completati, archive validato, build caricato e stato TestFlight disponibile. Solo l'ultimo stato permette di dire che la beta è distribuita.
