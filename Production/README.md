# Necrothing

Necrothing è un piccolo gioco mobile-first in cui si costruisce e si cura un cimitero per gli oggetti dimenticati. La scena è 3D low-poly; i progressi e le foto restano sul dispositivo.

## Avvio e controlli

Richiede Node.js 22.6 o superiore.

```sh
npm install
npm run dev
npm run build
npm run build:beta
npm test
npm run typecheck
```

`npm run dev` avvia il profilo di sviluppo. Le build normali e beta usano il profilo Full della beta; i profili e le regole d'accesso sono descritti in [docs/distribuzione-e-accesso.md](docs/distribuzione-e-accesso.md).

## Aggiornamenti Android e salvataggi

L’application ID Android è `com.taiodoio.necrothing` e deve restare stabile. La versione corrente è `0.2.1` (`versionCode 4`); aumenta il `versionCode` per ogni aggiornamento distribuito. `android:allowBackup` è attivo e il salvataggio nativo usa Capacitor Preferences, con recupero della vecchia copia WebView. Build e `cap sync` aggiornano le risorse dell’app senza cancellare Preferences, localStorage o IndexedDB.

Per conservare i dati durante l’aggiornamento, installa sopra l’app esistente usando la stessa chiave di firma. Se la firma non coincide, Android rifiuta l’installazione lasciando intatti i dati. Non disinstallare l’app per risolvere un errore di firma: la disinstallazione elimina i dati locali.

## Struttura

- `src/app/`: avvio, ciclo di gioco, input, salvataggio e piattaforma.
- `src/game/`: stato, regole, catalogo, simulazione e percorso iniziale.
- `src/render/`, `src/view/`: generazione low-poly e scena Three.js.
- `src/ui/`, `src/styles/`: interfaccia e fogli di stile.
- `src/i18n/`: localizzazione, font per lingua e dizionari generati.
- `scripts/`: sincronizzazione testi, licenze e strumenti di build.
- `design-system.html`: catalogo interattivo dei componenti usati nel gioco.
- `asset-guide.html`: guida per creare icone, medaglie, oggetti 3D e personaggi nello stile del gioco (con i campioni veri e le ricette passo per passo).

Ogni nuova interfaccia deve seguire i principi e i componenti di `design-system.html`, aggiornando la pagina con esempi e markup quando introduce un nuovo pattern. Ogni nuovo asset (icona, medaglia, oggetto, personaggio) segue `asset-guide.html`.

## Testi e traduzioni

Il workbook locale `../CMS/Necrothing CMS - traduzioni.xlsx` è la fonte delle traduzioni. `node scripts/i18n-xlsx.mjs sync` genera i dizionari in `src/i18n/generated/`, aggiorna `src/i18n/langs.ts` e salva una copia aggiornata in `docs/(Fase 4).xlsx`; l'originale non viene modificato. Le frasi italiane nuove si aggiungono a `src/i18n/it/`, quelle inglesi non ancora nel workbook a `src/i18n/en-extra.ts`.

## Distribuzione

Il profilo beta dà accesso Full senza acquisti in-app o limiti della Demo. La futura release pubblica e i controlli degli store sono preparati, ma non attivi. `npm run build:beta` genera la build beta; `npm run build` genera la build di produzione standard. Le licenze delle dipendenze e dei font vengono raccolte in `public/third-party-licenses.json` prima della build.
