# Capacitor: stato della preparazione mobile

Il progetto Capacitor per iOS e Android è stato creato e i plugin sono sincronizzati. La beta firmata e la validazione su dispositivi restano da completare.

## Integrato

- Capacitor 8 con plugin App, Preferences, Local Notifications, Splash Screen e Status Bar.
- Salvataggio JSON primario su Preferences nelle app native; migrazione iniziale dal localStorage senza cancellare la copia WebView. Le foto restano in IndexedDB.
- Lifecycle DOM e Capacitor deduplicato per pausa/ripresa; salvataggio e flush alla pausa; back Android chiude prima gli elementi dell'interfaccia.
- Ripristino lingua nel backup ZIP v3; i backup precedenti restano importabili.
- Controllo di date malformate, future o lontane: niente catch-up distruttivo.
- Schermata nativa tenuta visibile fino alla fine del boot della scena.
- `npm run cap:sync` costruisce la beta web e copia gli asset nei progetti nativi.

## Da chiudere prima della beta

- [ ] Verificare il bundle ID `com.taiodoio.necrothing` e le credenziali di firma Apple/Google.
- [ ] Generare e installare le icone native dagli asset in `Necrothing_Capacitor_Assets/assets`.
- [ ] Compilare e avviare iOS su iPhone 17 Pro fisico; ripetere dopo sospensione e perdita del contesto WebGL.
- [ ] Compilare e avviare Android su emulatore e su almeno un dispositivo fisico.
- [ ] Eseguire i casi di QA in `fase-5-checklist-qa.md`.
- [ ] Rivedere le vulnerabilità npm segnalate durante l'installazione e aggiornare solo dopo verifica di compatibilità.
- [ ] Decidere se le foto IndexedDB debbano migrare su Filesystem nativo: testare prima la persistenza reale, perché cambiare storage senza una migrazione verificata aumenta il rischio di perdita.

## Limiti noti

- Preferences protegge meglio lo stato su mobile, ma non è un archivio transazionale di foto. L'esportazione ZIP rimane il backup portabile completo.
- iOS Simulator presente in questo ambiente non è utilizzabile: CoreSimulator è più vecchio di Xcode installato. La build iOS va comunque compilata separatamente dal runtime simulato.
- Il caricamento differito delle anteprime e dei modelli salvati esiste già; terreno, bosco e scena iniziale vengono creati in un blocco sincrono. Non modificarlo prima di raccogliere misure su dispositivi.

Comandi locali: `npm run cap:sync`, `npm run cap:open:ios`, `npm run cap:open:android`.
