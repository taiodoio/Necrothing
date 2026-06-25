# ADR 0002: Rendering SVG/DOM (sostituisce PixiJS)

Data: 2026-06-25
Stato: Accettata
Sostituisce parzialmente: ADR 0001 (solo per la scelta del motore di rendering)

## Contesto

L'ADR 0001 e l'architettura iniziale prevedevano PixiJS con pixel art raster.
Gli asset finali saranno invece **SVG animati**, e l'app è mobile-first con
forte attenzione ad accessibilità e semplicità della pipeline placeholder→finale.

## Decisione

Usare **SVG/DOM con React** come motore di rendering della scena cimitero,
al posto di PixiJS, almeno per MVP e prima release.

## Motivazioni

- Asset finali in SVG animati: nessuna conversione a texture.
- Placeholder banali (forme SVG inline come componenti React).
- Animazioni native via CSS/SMIL, con supporto a `prefers-reduced-motion`.
- Migliore accessibilità (testo, ruoli ARIA, contrasto) rispetto a canvas.
- Pipeline più semplice e ottima integrazione con AI coding tools.

## Conseguenze

Positive:

- Sostituzione asset = cambio di componenti, senza toccare la logica.
- Meno dipendenze, bundle più leggero per l'MVP.
- DOM ispezionabile e testabile con Testing Library.

Negative:

- Con un numero molto alto di tombe animate, il DOM/SVG può costare più di WebGL.
  Mitigazioni: virtualizzazione celle, `content-visibility`, animazioni limitate
  agli elementi in viewport, pausa animazioni in background.
- Se in futuro servisse densità/effetti estremi, si potrà valutare un ritorno a
  canvas/WebGL per la sola scena, mantenendo l'astrazione del renderer.
