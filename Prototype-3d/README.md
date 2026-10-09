# Necrothing — Prototype 3D

Prototype browser isolato per esplorare una seconda direzione visiva per Necrothing. Il progetto usa TypeScript, Three.js e Vite; non modifica la PWA React/SVG in necrothing-docs/prototype/ né il progetto Godot in necrothing-godot/.

## Avvio

    npm install
    npm run dev

Apri l’indirizzo mostrato da Vite. Per una build locale: npm run build.
Per eseguire i test di generazione usa npm test (richiede Node 22.6 o successivo).

## Controlli

- Touch: trascina per spostare la mappa, pizzica per zoomare, tocca una tomba per selezionarla.
- Desktop: trascina per esplorare, rotella o pulsanti laterali per zoomare, clicca una tomba.
- Barra inferiore: cambia resa miniatura/voxel e vista obliqua/dall’alto.
- Pulsante con la luna: alterna alba, crepuscolo e notte.
- V e C: scorciatoie opzionali da tastiera.

Non c’è un avatar da guidare: l’esplorazione muove la visuale, mentre il mondo resta fermo. Le tombe partono da definizioni logiche con seme, posizione, tipo e condizione. Cambiare stile o camera conserva il mondo e lo stato delle tombe.

## Implementazione presente

- Cimitero generato a partire da un seme fisso, con 24 tombe, ingresso gotico, casa, mausoleo, pozzo, stagno, lapide aperta, alberi, vialetti e recinto.
- Fabbrica condivisa con generatori geometrici distinti per i due stili.
- Cinque profili di lapidi con plinti, incisioni, teschi, muschio, fiori e candele; tre condizioni e variazioni deterministiche.
- Archi scolpiti, gargoyle, ferri battuti, pietre di passaggio e dettagli di terreno generati via geometria e instancing.
- Due viste con OrthographicCamera; quella dall’alto guarda esattamente lungo l’asse verticale.
- Panning della camera, pinch/scroll e pulsanti zoom, selezione e azioni sulle tombe.
- UI pensata prima per telefoni, safe area iOS, controlli touch ampi e layout anche in orizzontale.
- Luci atmosferiche, ottimizzazione delle mesh statiche e pannello statistiche.
- Test per generazione deterministica, dimensioni delle tombe e persistenza dello stato logico tra stili.

## Limiti della tranche

I generatori sono ancora una prima passata e non coprono l’intero catalogo del prompt. Non ci sono ancora seed selezionabile, inventario, salvataggio o posizionamento libero. La risposta dei gesti e le prestazioni vanno ancora controllate su dispositivi reali; il progetto non è stato verificato con Safari iOS/Android.

## Prossime tranche

1. Confrontare la scena sui telefoni di riferimento e rifinire scala, leggibilità e prestazioni.
2. Estendere il catalogo procedurale con statue, recinzioni e decorazioni variabili.
3. Aggiungere layout deterministici alternativi, placement/occupazione e salvataggio.
4. Integrare test di generazione/stati e verificare le quattro combinazioni in un browser reale.
