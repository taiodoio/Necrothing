# Piano di migrazione visiva — Necrothing "Stylized Gothic Low-Poly"

## 1. Audit del repository (stato reale, non presunto)

| Domanda del prompt | Risposta nel repository |
|---|---|
| Struttura | `necrothing-docs/` (documentazione + **PWA React/SVG originale**, la vera resa "pixel" 2D) e `Prototype-3d/` (gioco 3D attuale). La PWA **non è stata toccata**. |
| Renderer esistente | `Prototype-3d` usa già **Three.js 0.180 + WebGLRenderer**, camera ortografica, ombre, luci a pool. Gli stili erano due: `voxel` (mesher a cubetti) e `miniature` (mesher sfaccettato derivato dalle stesse primitive). |
| Framework e build | TypeScript + Vite 5 (multi-pagina: `index.html`, `gallery.html`), nessun framework UI (DOM vanilla, `src/ui/dom.ts`). Test con `node --test` (strip-types). |
| Mappa e celle | `src/game/world.ts` (area recintata, occupazione, piazzabilità), `src/game/balance.ts` (dimensioni), `src/view/terrain.ts` (chunk di terreno). |
| Stato e persistenza | `src/game/state.ts` (SaveData), `src/app/persistence.ts` (localStorage + IndexedDB per le foto, backup `.necro3d`). |
| Movimento | `src/view/Actors.ts` + `src/view/pathfinding.ts` (A* sul grid), presenze erranti "a torre", corteo funebre. |
| Interazioni | `src/app/Game.ts` (`act()`, selezione, menù contestuale, modifica, posa), `src/app/Input.ts` (tap/drag/pinch/tastiera), raycast su hitbox. |
| Asset | Modelli procedurali come liste di primitive (`src/render/shape.ts`, `src/render/models/*`), cache per (chiave, stile) in `src/render/modelCache.ts`. |
| UI | HUD, bolla azioni, drawer, menù contestuale in HTML/CSS sopra il canvas (`src/ui/*`, `src/styles/main.css`). |
| Luci ed effetti | `src/view/Atmosphere.ts` (fasi giorno/notte, nebbia, ombra che segue la camera, pool di PointLight assegnate alle sorgenti più vicine), `src/view/Effects.ts` (pioggia, polveri), `src/view/PostFX.ts` (tilt-shift). |

**Conseguenza.** Il prompt presupponeva un gioco 2D pixel-art da affiancare a un
nuovo layer Three.js. Qui il layer Three.js esiste già: la migrazione è quindi un
**terzo stile di resa** dentro lo stesso renderer, non un secondo motore. Il
"renderer legacy" del prompt corrisponde agli stili `voxel`/`miniature` (e, a monte,
alla PWA SVG che resta intatta).

## 2. Architettura della migrazione (non distruttiva)

```
SaveData (unico stato) ──► WorldView / Actors (presentazione)
                              │
                              ▼
               getModel(chiave, stile, buildPrimitive)
                 ├── 'voxel'     → meshVoxels(primitive)
                 ├── 'miniature' → meshLowpoly(primitive)
                 └── 'lowpoly'   → resolveLowpoly(chiave)?  ──► generatore dedicato
                                        └─ null ──► meshLowpoly(primitive)  (fallback)
```

- **Un solo stato di gioco.** Lo stile è solo `settings.style`; cambiarlo ricostruisce
  le mesh, mai lo stato (testato). Nessuna simulazione duplicata.
- **Adapter per chiave.** `src/render/lowpoly/index.ts` traduce le chiavi esistenti
  (`g:<tipo>:<stato>:<seme>`, `p:<id>:<variante>:<seme>:<sporco><rotto><acceso>`,
  `fseg:*`, `char:<tipo>:<parte>`, …) nel generatore low-poly. Gli id non cambiano.
- **Materiali per stile.** `materialsFor(style)`: voxel/miniatura usano Lambert con
  rumore per voxel; low-poly usa `MeshStandardMaterial` opaco (roughness 0.9,
  flat shading). Emissivi (`glow`) e fantasmi (`ghost`) sono condivisi.
- **Flag di sviluppo.** `?style=lowpoly|voxel|miniature` oppure
  `?renderer=lowpoly|legacy`; in gioco: Impostazioni → Stile, oppure tasto `V`.
- **Personaggi.** Stesse parti e perni del rig esistente (`body`, `head`, `armL`…):
  animazioni, pathfinding e logica delle presenze non sono stati toccati.

## 3. Toolkit e generatori

| File | Contenuto |
|---|---|
| `render/lowpoly/kit.ts` | `LP`: push/pop di trasformazioni, `box` smussato (Extrude con bevel), `cyl` a pochi segmenti, `lathe`, `blob` (icosaedro irregolare), `extrude` di profili 2D, `plate`, `light`. Spostamento deterministico dei vertici (niente crepe), colore per faccia con variazione, finto AO verso la base, tinta "muschio" sulle facce rivolte in alto. Profili: rettangolo smussato, testa tonda, **arco gotico a sesto acuto**, poligono irregolare. |
| `render/lowpoly/palette.ts` | Palette centralizzata (quella del prompt, desaturata). |
| `render/lowpoly/details.ts` | Decorazioni modulari: erba, erbacce, fiori, mazzi, vasi, corone, candele, lumini, foglie, muschio, sassi, crepe, epigrafi. |
| `render/lowpoly/graves.ts` | 5 famiglie di lapidi × 10 tipi × 4 stati, varianti per seme. |
| `render/lowpoly/architecture.ts` | Componenti: finestra gotica, porta ad arco, tetto a falde con lastre, timpano, cantonali, colonna tornita, inferriata. Edifici: recinto, pilastro, cancello, bottega, casa del becchino, mausoleo, pozzo, statua votiva, angelo. |
| `render/lowpoly/lights.ts` | Lampioni (3 varianti), lanterne (3), torcia; stati acceso/spento/sporco/rotto. |
| `render/lowpoly/nature.ts` | Selciato a pietre poligonali, sentiero in terra, alberi morti, pini, cespugli, erba alta, funghi, aiuola, stagno; scenografia (ciuffi, felci, fiori, rocce). |
| `render/lowpoly/characters.ts` | Custode, becchino, prete, dolente, zombie, scheletro, fantasmi. |
| `view/FireFlicker.ts` | Tremolio riutilizzabile, deterministico e indipendente per sorgente (aloni e PointLight). |
| `view/terrain.ts` | Altezze (colline, pad piani sotto gli oggetti), terreno low-poly morbido: griglia indicizzata con normali e colori per vertice (i bordi dei sentieri sfumano nel prato). |

## 4. Mondo: proporzioni e terreno

- Mappa 64×64, recinto iniziale **34×34** (prima 22×22) fino a 58×58; il bosco è una
  cornice di 12 celle e la camera ne mostra solo una fascia sottile (zoom massimo =
  recinto + ~7 celle, pan = recinto + 3).
- Nuovo cimitero iniziale: 10 tombe di tutte le famiglie e in tutti gli stati, viali
  in selciato, bottega, statue, pozzo, stagno, aiuola, lampioni e lanterne.
- **Dislivelli**: collinette deterministiche (una ogni ~9 celle, profilo morbido),
  ondulazioni leggere, terreno piatto vicino al recinto, che sale nel bosco.
  Sotto ogni oggetto c'è un **pad** piano: tombe ed edifici non pendono, i sentieri
  seguono il terreno a gradini/rampe. Personaggi, fuochi fatui e picking del tocco
  usano la quota reale del suolo (raycast iterativo).

## 5. Fasi

| Fase | Stato |
|---|---|
| 1 Audit | ✅ (questo documento) |
| 2 Integrazione 3D | ✅ già presente; aggiunti stile, materiali, adapter, flag |
| 3 Prima tomba (stati, selezione) | ✅ tutte le 10, 4 stati, selezione con accento emissivo |
| 4 Terreno | ✅ low-poly con colline e pad, shading morbido, sentieri sfumati con erba bassa e sassolini ai bordi |
| 5 Luci dinamiche | ✅ lampioni/lanterne/candele con PointLight a pool e FireFlicker |
| 6 Espansione asset | ✅ recinto, vegetazione, decorazioni |
| 7 Edifici | ✅ bottega, casa del becchino, mausoleo, pozzo |
| 8 Personaggi | ✅ Custode, scheletro, fantasma e umanoidi |
| 9 Scena completa | ✅ il cimitero iniziale è l'area rappresentativa |
| 10 Ottimizzazione | 🟡 misure in SwiftShader (vedi README); da profilare su telefoni reali |

## 6. Valutazione della strada (domanda dell'utente)

- **Voxel**: il dettaglio cresce col cubo della risoluzione; erba e sassi non possono
  scendere sotto un voxel (≈6 cm a qualità media) senza far esplodere i triangoli.
  Per questo erba e ciottolato voxel restano "grossi" anche dopo i ritocchi.
- **Low-poly procedurale (nuovo stile)**: dettaglio dove serve (fili d'erba sottili,
  pietre poligonali, archi gotici, ali estruse) a parità o meno di triangoli
  (~0,5M sulla scena desktop contro ~0,9M del voxel). È la strada consigliata e ora
  è lo stile predefinito; voxel e miniatura restano selezionabili.
- **Passo successivo per la qualità "da gioco commerciale"**: modellare in Blender i
  pochi asset eroi (Custode, bottega, mausoleo, 2–3 lapidi) ed esportarli in GLB,
  caricati da `GLTFLoader` dentro lo stesso adapter (la chiave del modello resta la
  stessa). I personaggi guadagnerebbero animazioni scheletriche (`AnimationMixer`).

## 7. Seconda passata: edifici "cozy spooky" e catalogo completo

- Edifici contestualizzati: case un po' storte con zoccolo di pietre irregolari,
  intonaco caldo e travi a vista (o assi di legno), tetti ripidi con lastre e muschio,
  comignoli storti, oblò nel timpano, persiane, fioriere, lanterne alle porte, edera,
  zucche intagliate accese, ragnatele; casa del becchino con portico, bara appoggiata,
  legna e attrezzi; mausoleo con cancello in ferro su un interno che brilla, gargoyle,
  edera, candele e corona; pozzo con tettuccio storto e lanterna.
- Statue leggibili: la statua votiva è un'**edicola votiva** (nicchia ad arco con
  Madonnina e aureola illuminate da un lumino, tettuccio con croce, ex-voto, fiori);
  l'angelo è un **angelo piangente** con veste a pieghe, volto tra le mani e ali di piume.
- Catalogo completo: luci speciali, santuario con campaniletto, fontana, archi (pietra,
  con luci, gotico), muretti, staccionate, inferriate, tomba dissotterrata, buco
  infernale, casetta per animali, bara aperta, albero spettrale, albero di Natale morto,
  pozzanghera tossica, rocce mostruose, collinetta, fango, le "case" delle presenze e gli
  animali (gatto, topo, corvo e animali scheletro).

## 8. Prossimi passi

1. Fiamme con leggera deformazione nel vertex shader del materiale `glow` e scintille
   sulle torce (solo qualità alta); fumo dai comignoli.
2. Profilazione su iOS/Android; eventuale LOD per il sottobosco low-poly.
3. Pipeline GLB opzionale per gli asset eroi (vedi §6).

## 9. Terza passata: correzioni, decorazioni leggibili, prototipi "kawaii"

- **Tetti**: `gableRoof` riscritto (le falde ora si incontrano sul colmo senza
  sporgere, opzione `alongZ`) e nuovo `frontGable` per chiudere i timpani.
  Mausoleo, santuario, edicola votiva e casetta degli animali hanno tetto
  orientato correttamente e timpani davanti e dietro; la tettoia del portico
  della casa del becchino parte sotto la gronda e non attraversa più il tetto.
- **Decorazioni da 1 cella** più grandi e leggibili in gioco: vaso su piedistallo
  (anfora o urna di terracotta), corona su cavalletto alto con nastro, ossa su
  terra smossa (scala 2), zucca grande con zucchette, teschio con candela
  (scala 1,7), lanterna da terra (×1,8, cerchio di sassi) e su pietra.
- **Personaggi kawaii (prototipo, non ancora in gioco)**: `render/lowpoly/kawaii.ts`
  e la pagina `lab.html` (confronto prima/dopo, pose, ora del giorno, scena del
  funerale). Testa grande e squadrata a spigoli morbidi, corpo piccolo, arti
  tozzi con spalle e anche sferiche dentro il busto (non si staccano mai),
  occhi grandi con riflesso, guance rosa. Stesse parti del rig e stesse
  animazioni; cambiano solo i perni, dichiarati per tipo. Per l'integrazione
  basterà far scegliere a `buildRig` perni e geometrie kawaii quando lo stile è
  `lowpoly`.
