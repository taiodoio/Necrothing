# Fase 5 — Report salvataggi

## Stato e copertura

Il salvataggio versionato è `SaveData` (`SAVE_VERSION = 4`) e `normalizeSave` gestisce la lettura/migrazione. Comprende profilo e nome, livelli/XP, monete, tombe, ricordi, decorazioni, inventario, progressione, preferenze, tutorial e dati di gioco. Le foto della galleria e dei memoriali sono record IndexedDB separati; le miniature sono una cache ricostruibile.

| Dato | Persistenza | Export/import |
|---|---|---|
| Profilo, nome, progressione, tombe, ricordi, oggetti, preferenze e tutorial | JSON `SaveData` versionato; Capacitor Preferences su iOS/Android, localStorage sul web | Incluso nello ZIP |
| Lingua (`it`, `en`, `auto`) | Preferenza nativa Capacitor, con mirror legacy WebView | Inclusa nei nuovi ZIP v3; import dei backup più vecchi compatibile |
| Foto galleria e memoriali | IndexedDB (`photos`, `memorials`) | Incluse nello ZIP |
| Miniature | IndexedDB (`thumbs`), ricostruibili | Rigenerate se necessario |

## Modifiche effettuate

- L'app nativa legge Preferences prima di avviare il gioco e migra il vecchio JSON da localStorage senza cancellare l'origine.
- Le scritture native sono serializzate; pausa e import attendono la coda con `flushPersistence()`.
- Se il JSON nativo è illeggibile, il caricamento può recuperare la copia WebView; prima di creare una partita vuota le copie illeggibili sono conservate.
- L'import di foto e memoriali avviene in un'unica transazione IndexedDB e si considera riuscito solo a transazione completata.
- Nuovi backup ZIP v3 conservano anche la lingua; sono mantenuti i percorsi d'import precedenti.
- Catch-up ignora timestamp malformati, futuri o oltre dieci anni nel futuro e reimposta i riferimenti temporali interessati, senza applicare penalità.
- Il catch-up continua a limitare il degrado offline al tetto esistente di sette giorni.

## Garanzie e limiti

La migrazione lascia una copia locale WebView e il backup esportato è il percorso di recupero completo. Preferences non rende atomici insieme il JSON e i record foto: immagini e miniature restano in IndexedDB e possono essere eliminate separatamente dal sistema o da una reinstallazione. Non è ancora implementato un backup automatico giornaliero né una copia di sicurezza nativa rotante. Prima della beta va verificato su device che background, chiusura forzata, upgrade app e ripristino export/import conservino JSON e foto.

Non si dichiara una garanzia di crash-consistency completa: i dati di gioco sono una singola stringa scritta tramite Preferences e IndexedDB usa transazioni per l'import, ma non c'è un journal comune tra i due archivi.

## Verifiche automatizzate eseguite

- Test unitari al momento dell'implementazione: 149 superati, 0 falliti.
- TypeScript: `npm run typecheck` superato.
- Casi aggiunti: timestamp anomali e lingua nei backup; gate lifecycle idempotente.

Restano da verificare su iOS e Android fisici chiusura forzata durante scrittura, aggiornamento da save preesistente, foto IndexedDB, backup completo e migrazione del salvataggio WebView.
