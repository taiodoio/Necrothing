# ADR 0003: Asset pixel-art via PixelLab (raster) su rendering DOM

Data: 2026-06-26
Stato: Accettata
Aggiorna: ADR 0002 (rendering SVG/DOM)

## Contesto

I placeholder attuali sono componenti SVG vettoriali (ADR 0002). Per la veste
grafica definitiva si è scelto di usare **PixelLab** (generazione AI di
**pixel-art raster**) per asset, UI e tileset della mappa.

## Decisione

- Gli asset finali sono **PNG pixel-art** generati con PixelLab.
- Si **mantiene il renderer DOM** esistente (tilemap navigabile): gli sprite
  sono `<img>` con `image-rendering: pixelated`. **Niente PixiJS** per ora.
- I componenti SVG attuali restano come **fallback automatico**: finché manca
  il PNG corrispondente, si vede il vettoriale; appena il PNG è presente in
  `prototype/src/shared/assets/generated/`, sostituisce il placeholder senza
  modifiche al codice.
- Il **terreno** si genera come **tileset Wang** (auto-connesso), non come
  immagine "cotta": la mappa resta editabile cella per cella.

## Motivazioni

- Coerenza estetica gothic pixel-art desiderata.
- Transizione graduale e senza rischi (fallback SVG).
- La mappa è già DOM: i PNG si inseriscono come immagini, nessuna riscrittura.
- PWA/offline preservati: gli asset sono **bundlati in locale** (nessuna
  chiamata di rete a runtime).

## Conseguenze

Positive:
- Sostituzione incrementale per priorità (P0 → P1…).
- Filename = ID asset del manifest → l'Excel resta l'unica fonte dei nomi.

Negative / da gestire:
- Raster ⇒ attenzione a dimensioni tile e scaling intero per nitidezza.
- Animazioni: spritesheet + CSS `steps()`; se diventano molte/pesanti si
  potrà rivalutare un renderer canvas (PixiJS) solo per la scena.
- Coerenza tra asset: usare stile/palette/immagine di riferimento fissi.
