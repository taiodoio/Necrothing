# Labs · Case del villaggio

Proposta da revisionare, separata dal gioco. Aprire **index.html** in un browser: il confronto mostra originale e proposta alla stessa scala, con griglia, vista dall'alto, giorno/notte, stato integro/sporco/rotto e tre edifici esistenti come riferimento. Il bordo chiaro della griglia indica il fronte (+Z). Trascinare sulla scena per ruotare la vista e usare la rotella per ingrandire. Il pulsante «Ruota proposta» usa l'icona di rotazione del gioco e gira modello e lotto di 90° per volta.

Sono presenti sette proposte, in due misure selezionabili: tre varianti della casa infestata e una per ciascuna delle quattro case del villaggio. Il corpo è stato allargato, il colmo principale corre parallelamente alla facciata e il cortile è stato ridotto in profondità. Le geometrie, i colori, gli annessi e gli oggetti derivano dai generatori esistenti. Le case hanno finestre sul retro e sui lati esposti, oltre ad abbaini posteriori. Gli abbaini frontali ospitano la finestra del fantasma e l'orologio del Mietitore; il campaniletto è sul nuovo colmo della canonica.

Le due finestre a destra della porta del fioraio, del lampionaio e delle prime due case infestate sono accoppiate e hanno un davanzale comune. L'edera cresce sul fronte delle tre case infestate e della canonica, e sul retro della canonica, della prima casa infestata, del Mietitore e del fioraio; piccoli pipistrelli e la falce del Mietitore completano i dettagli ispirati al cimitero. La vegetazione e gli oggetti rispettano anche lo stato rotto.

Gli stati e le sorgenti luminose sono generati con gli stessi componenti del gioco: di notte finestre e lanterne si accendono, mentre le costruzioni rotte restano spente. L'anteprima Labs usa un renderer semplificato, con al massimo quattro luci puntiformi per modello, senza gli aloni e il tremolio dell'Atmosfera del gioco. Il numero di lanterne può variare rispetto all'originale quando il cortile viene ridotto.

Per rendere visibile lo sporco anche a distanza, le proposte aggiungono macchie di umidità, muschio ed edera sui muri e sulle porzioni di tetto presenti. Gli stessi segni sono applicati anche nello stato rotto, insieme ai danni e alle macerie. La tavola `immagini/tavola-case-giorno-notte.png` mostra i tre stati di giorno e di notte per il lotto compatto.

La prova **compatta da 4 × 3 celle** usa lo stesso ingombro della casa del becchino: i corpi principali sono larghi circa 2,05–2,15 unità, come le case di riferimento, con annessi ravvicinati e una selezione degli elementi originali del cortile, adattati allo spazio disponibile. I vialetti di pietra sono stati rimossi da entrambe le proposte. È possibile tornare alla proposta precedente **5 × 4 celle**, che riusa il cortile originale riducendone la profondità al 74%. Entrambe sono proposte visuali; non cambiano catalogo o piazzamento nel gioco. L'anteprima dei riferimenti mostra lo stato integro; gli stati modificabili riguardano le costruzioni a confronto.

`src/cryptBuildings.ts`, `src/villageHouses.ts` e `src/villageHousesCompact.ts` sono copie di lavoro dei generatori, con modifiche locali; `src/models.ts` e `src/compact.ts` costruiscono le proposte. Importano il kit e gli altri componenti da `Production`, senza cambiarli. `app.js` è già compilato; per rigenerarlo servono le dipendenze installate in `Production/node_modules`:

```sh
node Labs/build.mjs
```

Per rigenerare le immagini in `immagini` e verificare le interazioni e gli ingombri (sette modelli, tre stati, due lotti, seed 1):

```sh
node Labs/verify.mjs
```

La verifica dell'ingombro considera le geometrie nello stato e con il seed indicati. Prima di un'eventuale integrazione occorrerebbe verificare anche rotazioni, altri seed, ancoraggi, collisioni e compatibilità con i salvataggi esistenti.

La rotazione è una prova in Labs: nel gioco le cinque costruzioni attuali non sono rotabili. In caso di integrazione si può abilitare `rotatable` sul catalogo per usare l'azione e l'icona `rotate` già adottate dagli archi; vanno verificati ingombri, collisioni e salvataggi.
