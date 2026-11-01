# Fase 5 — Checklist QA

Legenda: **Automatizzato** = coperto da test locali; **Da eseguire** = prova manuale su build; **Bloccato ambiente** = non eseguibile con gli strumenti locali disponibili in questa sessione.

| Caso | Stato | Dispositivo/evidenza |
|---|---|---|
| Test di dominio, economia, onboarding, render, lingue, distribuzione e lifecycle | Automatizzato — 149 pass, 0 fail | Node locale |
| Typecheck e build beta web | Completato | locale |
| Sincronizzazione Capacitor iOS/Android | Completato | `npx cap sync`, cinque plugin ciascuna |
| Nuova installazione: boot, schermata iniziale, lettera, nome e prima pagina tutorial | Smoke test completato | Android API 36.1 emulator; processo vivo e nessun errore AndroidRuntime nel log filtrato |
| Nuova partita fino al cimitero e prima sepoltura | Da eseguire | iPhone 17 Pro fisico e Android |
| Partita preesistente e migrazione da localStorage a Preferences | Da eseguire | iPhone 17 Pro; Android fisico/emulatore |
| Tutorial completamente saltato e tutorial ripetuto | Da eseguire | iPhone 17 Pro fisico e Android; smoke test ha raggiunto la prima pagina del tutorial |
| Tombe iniziali, progressione, economia e inventario | Da eseguire | iPhone 17 Pro fisico; Android |
| Cambio lingua e riavvio | Da eseguire | iOS e Android |
| Export/import completo, lingua, foto e memoriali | Da eseguire | iOS e Android |
| Pausa, ripresa, chiusura forzata durante gioco e riapertura | Da eseguire | iPhone 17 Pro e Android fisico |
| Caricamento lungo e memoria dopo sessione estesa | Da eseguire | iPhone 17 Pro fisico; Android |
| Assenza simulata e orologio futuro/malformato | Test data anomali automatizzati; decay manuale da eseguire | test locali + device |
| Simulazione Demo e contenuti Full nel save | Da eseguire | build beta; verificare che i dati Full non spariscano |
| Contesto WebGL perso/ripristinato | Da eseguire | iPhone e Android fisici |
| Notifiche locali: permessi, fuso, ora legale e deduplicazione | Da eseguire | iPhone e Android fisici |
| Compilazione iOS arm64 senza firma | Completata | Xcode 27.1, iOS SDK 27.1 |
| Build Android debug | Completata | APK `android/app/build/outputs/apk/debug/app-debug.apk`; Gradle 8.14.3, SDK 36 |
| Installazione e run Android emulator | Smoke test completato | API 36.1, APK installato e avviato; non sostituisce la prova su device fisico |
| Run/build iOS simulator | Bloccato ambiente | CoreSimulator 1171.7.0 è più vecchio del build 1174.9.2 richiesto da Xcode |
| Firma e distribuzione TestFlight | Da eseguire | richiede bundle ID e certificati definitivi |

## Rischi beta

1. Le foto sono ancora su IndexedDB, separata dal save Preferences: testare import/export e chiusure forzate prima della beta.
2. ID bundle, firma, icone native e configurazione TestFlight non sono ancora convalidati.
3. Le misure performance e il ripristino WebGL richiedono hardware reale; il report attuale non certifica FPS o memoria.
4. La build Android dipende dal download iniziale di Gradle e dai repository Android; registrare il risultato della compilazione autorizzata.
5. Una verifica npm ha segnalato 3 vulnerabilità (2 moderate, 1 high). Da valutare con `npm audit` e una revisione delle dipendenze prima di distribuire; non applicare aggiornamenti automatici alla cieca.
