# Fase 5 — Report performance e caricamento

## Strumenti e risultati disponibili

La build beta web è stata compilata con successo (`npm run build:beta`) e sincronizzata nei progetti Capacitor. Il report diagnostico in gioco mostra FPS, frame p95, draw calls, triangoli, geometrie, texture, programmi shader e profilo qualità. I profili Bassa, Media e Alta restano disponibili; il selettore automatico e le ottimizzazioni esistenti sono conservati.

I contatori sono diagnostica runtime, non una misurazione raccolta su un dispositivo: in questa sessione non sono disponibili valori FPS, tempi di caricamento o memoria GPU rappresentativi dell'iPhone 17 Pro o di Android. Non si propone quindi una modifica grafica basata su numeri inventati.

## Strategia di caricamento attuale

| Classe operativa | Contenuti | Comportamento attuale |
|---|---|---|
| Critici | UI e font base, terreno/ambiente iniziale, avatar, tombe della partita, contenuti onboarding | Cache IndexedDB degli asset geometrici low-poly ripristinata a tranche; modelli del cimitero e del cortile tutorial preparati e persistiti prima del gioco |
| Secondari | Eroi UI, miniature mancanti, anteprime negozio | Avviati dopo il primo frame; anteprime negozio differite durante onboarding/tutorial |
| Differibili | Anteprime non aperte e oggetti non visibili/immediatamente necessari | Warm-up differito; il cortile tutorial usa una scena compatta preparata sotto lo splash e viene scambiato con quella vera al termine del tutorial |

La cache contiene geometrie CPU derivate dai generatori, con revisione calcolata dai sorgenti e limite di 24 MB; la GPU ricarica comunque i buffer quando crea il contesto. La cache può essere cancellata dal sistema e viene rigenerata senza toccare il salvataggio. Il cortile viene preparato in una scena temporanea compatta; quando il tutorial finisce, la scena reale già pronta torna visibile e quella temporanea viene liberata.

Il caricamento iniziale resta composto da fasi: ripristino cache, generazione e salvataggio dei modelli mancanti, costruzione del mondo reale e preparazione del cortile. Terreno, bosco, decorazioni ed entità vengono costruiti in stadi con un aggiornamento della barra e un frame ceduto tra gli stadi; il singolo stadio è ancora sincrono e può fermare temporaneamente l'animazione. La suddivisione più fine e la misurazione su dispositivi fisici restano da completare prima di considerare risolti gli scatti.

## Protocollo per misure ripetibili

Per ogni device annotare build, OS, profilo, temperatura/batteria, risoluzione e stato partita; fare tre avvii a freddo e tre sessioni di 60 secondi nella stessa area. Registrare tempo fino al primo frame e interattività, FPS medio e p95 frame, draw calls, triangoli, geometrie, texture, shader e memoria app/GPU disponibile dal profiler di sistema. Ripetere con i tre profili qualità. Fare inoltre una sessione di 10 minuti, apertura/chiusura pannelli, background/foreground e rotazione per verificare cali e crescita dei contatori.

## Stato verifiche piattaforma

- Build web beta: completata.
- `npx cap sync`: completato per iOS e Android con i cinque plugin attesi.
- Compilazione iOS arm64 senza firma: completata con `xcodebuild` usando iOS SDK 27.1; il bundle è `com.taiodoio.necrothing`.
- Build Android debug: completata con `./gradlew assembleDebug` (Gradle 8.14.3, compile/target SDK 36). APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Smoke test Android emulator API 36.1: APK installato e avviato; processo rimasto attivo, schermata iniziale e percorso fino al modulo nome e alla prima schermata tutorial visibili. Il renderer dell'emulatore usa SwiftShader: non è adatto a trarre conclusioni sugli FPS di un telefono.
- Run/build iOS simulator: non verificata. CoreSimulator 1171.7.0 è più vecchio del build 1174.9.2 richiesto da Xcode; non è stato possibile avviare un runtime simulato.
- iPhone 17 Pro fisico e Android fisico: misure ancora da eseguire.

Nessuna modifica a nebbia, post-processing, particelle, animazioni o geometrie è stata applicata senza misurazioni di dispositivo.
