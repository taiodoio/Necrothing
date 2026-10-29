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

## Struttura

- `src/app/`: avvio, ciclo di gioco, input, salvataggio e piattaforma.
- `src/game/`: stato, regole, catalogo, simulazione e percorso iniziale.
- `src/render/`, `src/view/`: generazione low-poly e scena Three.js.
- `src/ui/`, `src/styles/`: interfaccia e fogli di stile.
- `src/i18n/`: localizzazione, font per lingua e dizionari generati.
- `scripts/`: sincronizzazione testi, licenze e strumenti di build.
- `design-system.html`: catalogo interattivo dei componenti usati nel gioco.

Ogni nuova interfaccia deve seguire i principi e i componenti di `design-system.html`, aggiornando la pagina con esempi e markup quando introduce un nuovo pattern.

## Testi e traduzioni

Il workbook locale `../CMS/Necrothing CMS - traduzioni.xlsx` è la fonte delle traduzioni. `node scripts/i18n-xlsx.mjs sync` genera i dizionari in `src/i18n/generated/`, aggiorna `src/i18n/langs.ts` e salva una copia aggiornata in `docs/(Fase 4).xlsx`; l'originale non viene modificato. Le frasi italiane nuove si aggiungono a `src/i18n/it/`, quelle inglesi non ancora nel workbook a `src/i18n/en-extra.ts`.

## Distribuzione

Il profilo beta dà accesso Full senza acquisti in-app o limiti della Demo. La futura release pubblica e i controlli degli store sono preparati, ma non attivi. `npm run build:beta` genera la build beta; `npm run build` genera la build di produzione standard. Le licenze delle dipendenze e dei font vengono raccolte in `public/third-party-licenses.json` prima della build.
