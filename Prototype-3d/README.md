# Necrothing — Prototype 3D

Versione giocabile di Necrothing in 3D, mobile-first, con le stesse dinamiche della
PWA React (`necrothing-docs/prototype/`). È tutto generato dal codice (TypeScript +
Three.js + Vite): non ci sono modelli, texture o immagini esterne.

Tre stili di resa sugli **stessi dati di gioco**: **Gothic Low-Poly** (predefinito,
sfaccettato, materiali opachi e luci calde), **Gothic Voxel** (la resa precedente) e
**Miniatura**. Si cambiano da Impostazioni → Stile, col tasto `V` o con
`?style=lowpoly|voxel|miniature` (alias `?renderer=lowpoly|legacy`).

| Low-Poly · giorno | Low-Poly · notte |
|---|---|
| ![](screenshots/A-lowpoly-giorno.jpg) | ![](screenshots/B-lowpoly-notte.jpg) |

| Low-Poly · dall'alto | Voxel (legacy) · stessa scena | Miniatura · stessa scena |
|---|---|---|
| ![](screenshots/C-lowpoly-dallalto.jpg) | ![](screenshots/D-voxel-legacy.jpg) | ![](screenshots/E-miniatura.jpg) |

| Telefono · notte | Telefono · giorno | Telefono · UI e menù contestuale |
|---|---|---|
| ![](screenshots/mobile-notte.jpg) | ![](screenshots/mobile-giorno.jpg) | ![](screenshots/mobile-ui.jpg) |

| Zoom massimo: il cimitero è il protagonista | Dettaglio notturno |
|---|---|
| ![](screenshots/F-zoom-massimo.jpg) | ![](screenshots/dettaglio-notte.jpg) |

| Stagno animato (pesci a pancia in su, ninfee, rana, cerchi nell'acqua) | Presenze animate (carte, ballo col grammofono, palla-teschio) |
|---|---|
| ![](screenshots/stagno.jpg) | ![](screenshots/presenze-animate.jpg) |

| Nebbia in movimento nel bosco (notte) | Custode personalizzabile |
|---|---|
| ![](screenshots/nebbia-notte.jpg) | ![](screenshots/custode-personalizzato.png) |

Documentazione della migrazione allo stile low-poly:
[`docs/visual-migration-plan.md`](docs/visual-migration-plan.md) (audit, architettura,
fasi, valutazione voxel vs low-poly vs GLB) e
[`docs/asset-migration-catalog.md`](docs/asset-migration-catalog.md) (stato di ogni asset).

## Avvio

```bash
npm install
npm run dev        # http://localhost:5173  (galleria asset: /gallery.html, personaggi: /lab.html)
npm test           # 36 test (dominio, rendering voxel, adapter e generatori low-poly)
npm run build      # typecheck + build di produzione in dist/
```

Richiede Node ≥ 22.6 (i test usano `--experimental-strip-types`).
`?seed=717` nell'URL crea una nuova partita con seme fisso (utile per confronti e test);
il salvataggio esistente in `localStorage` ha la precedenza.

## Come si gioca

Sei il **Custode**: un omino col cappello a tesa larga, la pala e una lanterna che
illumina la notte. Tocchi il terreno e cammina lì (A* sulla griglia); tocchi una tomba
o un oggetto e si avvicina, mentre si apre il menù contestuale. Le azioni di cura le
esegue fisicamente (cammina, lavora, poi arriva la ricompensa).

| Dove | Cosa (da `Implementation_Note.md`) |
|---|---|
| In alto a sinistra | Nome, rango con barra di progresso, fuochi fatui → profilo e achievement |
| In alto a destra | Ora reale, fase del giorno e meteo, impostazioni |
| In basso a sinistra | Pala → barra a slot (stile hotbar) che si apre in orizzontale: Seppellisci, Modifica, Inventario, Bottega (centra la mappa sulla bottega), Foto, Galleria |
| In basso a destra | Bastone mistico, scopa volante e bicicletta (ognuno solo se lo possiedi; dorato quando è in uso), ricentra sul Custode |
| Drawer dal basso | Tutte le pagine, con ✕ in alto a sinistra; la bolla sparisce mentre sono aperte |

**Controlli** — Touch: tocca per camminare/selezionare, trascina per spostare la mappa,
pizzica per lo zoom. Desktop: WASD/frecce muovono il Custode, rotella zoom, `E`
interagisci, `B` sali/scendi dalla bici, `F` sali/scendi dalla scopa, `V` cambia stile (low-poly → voxel → miniatura), `Esc` chiude.

### Dinamiche (portate dalla PWA, regole in `src/game/`)

- **Sepoltura** in 5 passi (nome+categoria, date+causa, epitaffio, lapide, anteprima),
  poi scegli il posto sulla mappa e arriva il **corteo funebre** (prete, dolenti,
  becchino). Una sola cosa astratta al giorno. Lapidi più ricche sbloccate dal rango.
- **Ciclo delle tombe** (esclusivo): pulita → fiori → dopo 3 giorni appassiscono e la
  tomba è sporca → dopo 10 giorni sporca si **rompe** (riparare costa 6 ✦ e pulisce).
  I fiori si portano solo su una tomba pulita.
- **Luci e costruzioni** si sporcano dopo 3 giorni senza cure e si rompono dopo 7
  (dal foglio Excel); le luci si accendono/spengono, quelle rotte sono spente.
- **Bottega** (pre-piazzata, tutorial al primo avvio, non eliminabile ma spostabile):
  acquisto con quantità, pezzi unici, sblocchi per rango, albero di Natale solo a
  dicembre. **Inventario** per categorie con *Inserisci* / *Vendi* (70%).
- **Varianti come oggetti a sé**: ogni variante si compra per conto suo, con prezzo e
  rango propri (comprare l'oggetto base non sblocca più le altre forme). Lampione 8 (R1),
  a doppio braccio 12 (R2), gotico 16 (R3); lanterna da terra 5 (R1), su paletto 7 (R1),
  su pietra 9 (R2); anfora 3 (R1), urna 5 (R2); cuccia del cane 20 (R2), del gatto 22
  (R2), casetta del coniglio, della papera 24 (R3) e del corvo 28 (R3). Nel catalogo una
  variante ha `family`/`look`: usa il modello della famiglia. I salvataggi vecchi
  trasformano le varianti posate negli oggetti nuovi.
- **Modifica**: tocca un elemento, trascinalo (anteprima verde/rossa), ruota, riponi in
  inventario; popup introduttivo con "non mostrare più".
- **Fuochi fatui**: compaiono sulla mappa in funzione di tombe, cure e fiori (la
  benedizione del prete li aumenta per 24 ore); il Custode li raccoglie passandoci.
- **Presenze erranti** dalla matrice di spawn (fantasma, fantasma-oggetto raro, gatto,
  corvo che si posa sulle lapidi, prete, becchino, topo, zombie): si muovono "a torre"
  sugli assi X/Z e cambiano direzione sugli ostacoli; i fantasmi attraversano tutto.
  Toccarle dà XP/✦; il becchino pulisce gratis le tombe vicine. Mausoleo, santuario,
  casa del becchino, bare aperte e buco infernale modificano le probabilità.
- **Presenze piazzabili**: zombie che giocano a carte o ballano, zombie errante,
  fantasmi in girotondo o a palla con un teschio, e l'**animale
  domestico**: la casetta per animali (cane, gatto, coniglio, papera, corvo scheletro) porta con sé
  il suo animaletto. Libero gira per il cimitero e ogni tanto torna a dormire in tana (si vedono
  gli occhietti nel buio dell'arco e salgono le "z"); ogni animale ha il suo menù (toccandolo,
  o toccando la sua casetta quando dorme): raggiungi il Custode (ti segue), libera, a cuccia,
  accarezza, lancia l'osso (che riporta). Le voci che in quel momento non servono restano visibili
  ma disattivate; con più casette si gestisce ogni animale per conto suo. Quello che fa (libero, al seguito, a
  cuccia) è salvato nella sua casetta e alla riapertura riprende da lì.
- **Extra** (nuova categoria della Bottega: oggetti che non si posano ma si usano): la
  **bicicletta** (rango 2, 50 ✦, pezzo unico) porta il Custode al doppio della velocità.
  Si sale e si scende con l'icona sopra il mirino (al posto di quella della vista: la vista
  dall'alto non c'è più, i salvataggi tornano alla vista obliqua); in sella ruote e pedali
  girano con la strada fatta, i piedi seguono i pedali, il fanalino illumina la notte.
  Scendendo la bici sparisce.
  *In prova*: bici, bar e orto si comprano già a qualsiasi rango (il prezzo resta); il
  vincolo di rango torna con `RELEASE_LOCKS.earlyRank` in `src/game/balance.ts`.
- **Bar degli zombie** e **Orto dei cervelli** (Costruzioni, rango 3, 45 e 35 ✦, pezzi
  unici, 3×2 e 4×3): il bar ha bancone, bara-frigo con le bottiglie, lavagna a lapide e
  pipistrelli, con barista, avventori che brindano coi boccali e un ballerino; nell'orto uno
  zombie zappa i cervelli e un altro li vende alla bancarella. Quante presenze li animano
  dipende dalla fascia del dispositivo (bar 2/3/4, orto 1/2/2). Ogni giorno incassano fuochi
  fatui casuali ma contenuti (bar 3–6, orto 2–5, stabili nel giorno) che si accumulano fino a
  15 e 12: un'etichetta con la fiammella e «+N» compare sopra e toccandola si riscuote.
  Entrambi attirano zombie anche senza tombe aperte (+6% e +3% a ogni giro); rotti non
  incassano e restano chiusi finché non li ripari.
- **Nuovi sbloccabili** (rango, prezzo e modo di sblocco in `src/game/catalog.ts`):
  - *Luci*: candelabro gotico, lanterna degli spiriti, ghirlanda di teschi (3×1, si passa sotto)
    e il **Lampione del Custode** (pezzo unico, si sblocca riparando 25 luci): il suo bastone
    col ricciolo, la lanterna a petrolio, il cappello appeso. Le luci nel suo raggio (4 celle)
    si sporcano ma non si rompono mai; in Modifica e mentre lo si posa si vede l'area.
  - *Decorazioni*: pila di libri, corvo impagliato, gargoyle, **Mietitore di pietra**
    (occhi accesi sotto il cappuccio) e la **Statua del Custode** (rango 5, col suo aspetto
    in pietra: se il Custode cambia aspetto, la statua cambia con lui).
  - *Costruzioni*: **Campana delle anime** (si suona una volta al giorno dal menù: accorrono
    tre fantasmi da toccare) e **Gazebo delle anime** (di notte ci ballano i fantasmi).
  - *Ambiente*: cipresso, melo stregato, funghi luminosi sul tronco, albero dell'altalena,
    cerchio di pietre, palude con le mani, crepa infernale (come il buco infernale, chiama fantasmi).
  - *Presenze*: rifugio dei gatti, picnic dei fantasmi, banda di scheletri che suona,
    **Angolo della strega** (vende pozioni: incassa 3–6 ✦ al giorno fino a 15, come bar e orto)
    e **Cripta del vampiro** (di giorno dorme, di notte passeggia).
  - *Stagionali* (si comprano solo nel loro periodo, poi restano): campo di zucche e ragnatela
    gigante a ottobre, altare dei morti dal 31 ottobre al 2 novembre, pupazzo scheletrico e luci
    di Natale sul recinto a dicembre e gennaio, panchina dei fantasmi innamorati a febbraio.
  - *Extra*: **Scopa volante** (rango 5, 120 ✦: si vola sopra tombe e oggetti, più veloci della
    bici) e **Bastone mistico** (gratis, si sblocca guadagnando 500 ✦: impugnato, i fuochi fatui
    accorrono da 3,5 celle). Il **cappello da strega** del Custode si sblocca quando la strega ha
    venduto 30 pozioni.
  - *In prova* sono tutti già comprabili (rango, stagione e traguardo saltati, il prezzo resta).
- **Zombie e fango**: uno zombie che passa accanto a una tomba (solo mentre si gioca) con
  una certa probabilità la sporca, al massimo una per zombie, e ci lascia le impronte di fango;
  se era già sporca la rottura si avvicina di un giorno (ma non la rompe mai). Le tombe appena
  pulite o coi fiori freschi sono al riparo per 6 ore; pulendo spariscono anche le impronte.
- **Simulazione a tempo reale** all'apertura e al ritorno in primo piano (erbacce,
  sporco, rotture, anniversari, meteo giornaliero) + tick "vivo" ogni 40 s mentre si gioca.
- **Progressione**: 5 ranghi, 27 achievement, prestigio, distretti tematici
  auto-rilevati e **espansione del recinto a scelta**: il prestigio sblocca 5 ampiezze
  (34→58 celle su una mappa di 64; lo sblocco non torna indietro), un avviso propone di
  ampliare e in *Impostazioni › Terreno* uno slider sceglie l'ampiezza (i livelli non
  sbloccati sono col lucchetto). Per stringere, se qualcosa resta fuori, un avviso porta
  sulla mappa con l'area scelta in oro e gli elementi da sistemare in rosso: si spostano
  in Modifica (o si rimettono in inventario) e poi si salva.
- **Foto**: rettangolo ridimensionabile dagli angoli + otturatore, scatto in bianco e
  nero della scena, *Salva / Condividi / Elimina*; **Galleria** in IndexedDB.
- **Impostazioni**: stile, qualità (auto/bassa/media/alta), ora del giorno (reale o
  forzata), sfocatura ai bordi, effetti meteo, statistiche tecniche, backup `.necro3d`,
  nuova partita.
- **Qualità Auto** (predefinita per le nuove partite; i tre livelli manuali restano
  invariati), `src/app/AutoQuality.ts`: all'avvio stima la fascia del dispositivo
  (economico / medio / top, dalla GPU e dalla memoria) che fissa densità di bosco e prato e
  luci reali nella scena (4/7/10: le altre sorgenti tengono solo l'alone e lo shader non le
  calcola). Poi un regolatore a finestre di 1 s sceglie il gradino (pixel ratio 1→2, mappa
  ombre 1024→2048, sfocatura, MSAA): scende se resta sotto 28 FPS per 2 s, risale dopo 8 s
  sopra 50 FPS, e un gradino che appena salito fa crollare gli FPS non si ritenta (tetto);
  al gradino più basso ancora lento scende di fascia. Il profilo è ricordato per dispositivo
  (localStorage). Nelle fasce economica e media le ombre della scena si ridisegnano solo
  quando cambia qualcosa (camera, sole, scena) e i personaggi hanno un'ombra a disco.
  In tutte le fasce (fase 2): tombe e oggetti fermi sono fusi per zona di 8×8 celle (una
  mesh per materiale: stesso disegno, circa metà delle draw call); un oggetto esce dalla
  fusione quando va visto da solo (selezionato, segnato in rosso, nascosto, trascinato,
  animato) e la sua zona si ricompone. Il prato ha due versioni, ricca nella fascia nitida
  e leggera in quelle sfocate; nelle fasce media e top il bosco è due volte più fitto.
  In *Statistiche tecniche* compaiono fascia e gradino.

### Mondo, camera e resa

- **Gothic Low-Poly** (`src/render/lowpoly/`): generatori dedicati con geometrie vere —
  profili estrusi (lapidi, archi gotici, ali), torniti (vasi, urne, colonne, lampioni),
  box smussati, coni e cilindri a pochi segmenti, icosaedri irregolari — con lievi
  irregolarità deterministiche, colore per faccia e finto AO. Cinque famiglie di lapidi
  sui 10 tipi del gioco, ognuna con varianti per seme e decorazioni modulari per stato
  (fiori, vasi, corone, candele accese, muschio, erbacce, foglie, crepe, frammenti).
  Edifici con finestre gotiche illuminate, porte ad arco, tetti a lastre, cantonali;
  recinto con inferriata a lance; selciato fitto a pietre poligonali con bordi sfumati
  nel prato (erba bassa e sassolini); terreno morbido senza poligoni a vista; sassi e rocce sparsi; personaggi nello
  stile "v2" (`src/render/lowpoly/v2/`): testa grande a superellissoide, capelli a casco di
  ciocche, barba disegnata per contorni, corpo a pera, occhi lucidi con la stella; animali
  e animaletti-scheletro sullo stesso schema. Ogni personaggio è diviso nelle parti del rig
  (testa, busto, braccia, gambe) con il perno all'articolazione, quindi usa le stesse
  animazioni. Tavole di prototipo: `/proto-custode.html`, `/proto-looks.html`
  (`?set=umani` | `?set=animali`).
  Edifici in chiave "cozy spooky" (case storte con travi a vista, tetti muschiati,
  lanterne, edera, zucche intagliate), edicola votiva e angelo piangente, e **tutto il
  catalogo** (50 oggetti) più gli animali con un generatore dedicato.
  Materiali `MeshStandardMaterial` opachi a flat shading; il fallback *miniatura* resta
  come rete di sicurezza per asset futuri. Ogni luce tremola con un
  `FireFlicker` indipendente e deterministico.

- **Il cimitero è il protagonista**: mappa logica 64×64, recinto iniziale **34×34** che
  cresce fino a 58×58; il bosco è solo una cornice (12 celle oltre la mappa) e la camera
  ne mostra una fascia sottile: zoom massimo = recinto + ~7 celle, pan = recinto + 3.
  Il cimitero iniziale ha 10 tombe di tutte le famiglie e in tutti gli stati, viali in
  selciato, bottega, statue, pozzo, stagno, aiuola, lampioni e lanterne.
- **Dislivelli e collinette**: colline morbide deterministiche dentro il recinto
  (piatte lungo il muro di cinta), terreno che sale nel bosco; sotto ogni oggetto un
  **pad** piano, così tombe ed edifici non pendono e i sentieri seguono il terreno.
  Personaggi, fuochi fatui e tocco sul terreno usano la quota reale del suolo.
- **Niente terreno "flottante"**: la camera calcola l'impronta inquadrata (ortografica,
  40° di elevazione, ruotata) e limita zoom massimo e pan perché il bordo del terreno non
  entri mai nello schermo.
- **Sfocatura tilt-shift ai bordi** (qualità media/alta, disattivabile): due passate
  separabili a raggio variabile; la fascia nitida segue il Custode o l'oggetto selezionato,
  il resto sfuma come in un diorama fotografato da vicino.
- **Voxel più fini**: 16 voxel per cella a qualità media (10 in bassa, 20 in alta) invece
  di 10, con greedy meshing (facce coplanari fuse) e variazione di colore per singolo voxel
  nello shader. Erba a fili sottili, fiorellini, acciottolato irregolare con fughe e
  muschio, licheni ed erba alla base delle lapidi.
- **UI nello stile del gioco**: cornici pixel con angoli a gradino (SVG generati, nitidi a
  ogni scala), icone pixel-art 12×12 disegnate con la stessa palette dei voxel (anche i
  badge 3D 🧹/🛠 sono diventati targhette pixel), *Pixelify Sans* per il testo e
  *Jacquard 24* (gotico pixelato) per titoli e nomi; ombre nette e animazioni a scatti.
  I font sono inclusi via `@fontsource` (funzionano offline).

## Architettura

```text
src/
├── game/        dominio puro (nessun three/DOM): stato, regole, simulazione, spawn,
│                catalogo (dall'Excel), progressione, mondo/occupazione — testato
├── render/      DSL di forme + due mesher + cache + modelli procedurali
│   ├── shape.ts           primitive in unità voxel (box, cilindro/cono, ellissoide,
│   │                      prisma-tetto, arco, scavo) con trasformazioni
│   ├── voxelMesher.ts     griglia di voxel → facce visibili + AO per vertice
│   ├── lowpolyMesher.ts   stesse primitive → solidi sfaccettati irregolari
│   ├── modelCache.ts      geometrie condivise per (modello, stato, stile)
│   └── models/            tombe, luci, decorazioni, costruzioni, natura, recinto
├── view/        scena: WorldView (sync con lo stato), terreno a chunk con texture,
│                ChunkBaker (bosco/sottobosco cotti per chunk), Atmosphere (fasi del
│                giorno, meteo, ombre, pool di luci), CameraRig (vincoli sul bordo del
│                mondo), PostFX (tilt-shift), Actors (Custode, presenze, funerale, A*),
│                personaggi a parti, effetti
├── ui/          HUD, bolla, menù contestuale, drawer e schermate, miniature 3D,
│                icons.ts (icone pixel-art e cornici a 9 fette)
└── app/         Game (controller), Input (gesti/tastiera), persistenza
```

- **Una definizione, due rese.** Ogni asset è una lista di primitive in voxel
  (`ModelBuilder`). Il mesher voxel le rasterizza in cubetti con occlusione ambientale
  (rasterizzazione conservativa per sbarre e aste sottili); il mesher *miniatura* le
  trasforma in solidi low-poly con vertici irregolari e colore per faccia. Dimensioni e
  pivot coincidono (testato). Cambiare stile (`V`) ricostruisce solo le mesh: posizioni,
  stati, selezione e Custode restano dove sono.
- **Camere ortografiche vere**: obliqua a 40° di elevazione; *dall'alto* esattamente
  lungo −Y (testato). Per la leggibilità dall'alto ci sono targhette pixel (scopa/martello)
  sugli oggetti da curare, cornice di selezione e aloni delle luci.
- **Luci**: ogni sorgente ha voxel emissivi e un alone additivo (economici); un pool
  fisso di PointLight (4/7/10 per qualità) viene assegnato alle sorgenti più vicine al
  centro della vista, senza ricompilare gli shader. Una sola luce direzionale con ombra
  che segue la camera.
- **Prestazioni** (SwiftShader, qualità media, stessa scena): low-poly ~600k triangoli
  e ~320 draw call su desktop, ~520k su telefono; voxel ~790k; miniatura ~410k.
- **Ottimizzazioni**: geometrie condivise e cache; recinto in `InstancedMesh`; bosco e
  sottobosco *cotti* in una geometria per chunk 12×12 (frustum culling per zona) con LOD
  (alberi lontani a risoluzione voxel ridotta); terreno a chunk con greedy meshing delle
  sommità. Misure nel browser headless con rendering software (SwiftShader, FPS non
  indicativi), qualità media: telefono 390×844 ~190 draw call e ~630k triangoli in voxel;
  desktop 1280×800 ~250 draw call, ~930k triangoli in voxel e ~410k in miniatura; allo
  zoom massimo ~1,3M triangoli. La qualità bassa riduce voxel, densità del bosco e
  sottobosco, e spegne la sfocatura.

## Asset dall'Excel

Il catalogo (`src/game/catalog.ts`) segue il foglio *Asset for Necrothing con
dimensioni Procreate*: 8 luci, 7 decorazioni, 17 costruzioni, 13 elementi
d'ambiente, 6 presenze, più le 10 lapidi della PWA. L'ingombro dell'Excel era quello
dello sprite 2D top-down; in 3D è stato convertito in **ingombro a terra** (es.
lampione 2×3 → 1×1 alto, albero con candele 4×4 → 3×3). Le varianti "(x 3)", "(x 2)"
e gli animali sono oggetti a sé in Bottega. Stati gestiti: acceso/spento,
sporco, rotto, luci notturne; tombe pulite/con fiori/sporche/rotte.

### Aggiungere un asset

1. Aggiungi la voce in `src/game/catalog.ts` (id, categoria, ingombro, costo, rango,
   flag `decays`/`light`/`rotatable`/`walkable`/`variants`).
2. Scrivi il modello in `src/render/models/*.ts` con `ModelBuilder` (misure in voxel:
   10 per cella, origine al centro dell'ingombro a terra, fronte verso +z) e usa
   `decay()` per gli stati sporco/rotto; `b.light(...)` per le sorgenti luminose.
3. Registralo in `BUILDERS` (`src/render/models/registry.ts`).
4. (Low-poly) scrivi il generatore in `src/render/lowpoly/*` con `LP` e registralo in
   `LP_PLACEABLES` (`src/render/lowpoly/index.ts`); senza generatore l'oggetto usa la
   resa miniatura.
5. Controllalo in `/gallery.html?style=lowpoly` (anche `voxel`, `miniature`); `npm test`
   verifica che stia nell'ingombro e che le luci spente non emettano.

## Test

`npm test` — 36 test: nuova partita valida, migrazione dei salvataggi v1, sepoltura e limite astratto, ciclo
fiori/sporco/rotto, decadimento 3/7 giorni, bottega e vendita, modifica/rotazione/
riponi, becchino, modificatori di spawn, determinismo, espansione monotona,
achievement, distretti, catalogo; determinismo del mesher, parità dimensioni
voxel/miniatura, tutte le lapidi × stati, ogni voce del catalogo in ogni stato,
rasterizzazione conservativa, camera perpendicolare, stato invariato al cambio stile;
**low-poly**: adapter chiave → generatore per ogni lapide × stato, determinismo e
varianti per seme, stati che cambiano la geometria, ingombri degli oggetti migrati,
luci accese/spente, fallback e materiali per stile, parti dei personaggi, scenografia,
terreno (colline, pad piani, continuità), limiti della camera, FireFlicker.
Inoltre gli scenari di interazione sono stati verificati con Playwright (tap → menù →
pulizia, sepoltura + funerale, bottega, inventario → posa, trascinamento in Modifica,
foto → galleria).

## Rapporto con il resto del repository

- `necrothing-docs/prototype/` (PWA React/SVG) resta intatta: è la fonte delle regole.
  Qui le regole sono **riscritte come funzioni pure** (nessuna dipendenza da IndexedDB/
  React), con gli stessi numeri (`src/game/balance.ts`).
- Il salvataggio è locale (`localStorage` + IndexedDB per le foto), separato dalla PWA.

## Limiti noti

- Prestazioni misurate solo con rendering software: vanno verificate su telefoni reali
  (i voxel più fini e il bosco esteso hanno alzato il conto dei triangoli; se serve, la
  qualità bassa o un LOD più aggressivo per il sottobosco lo riducono).
- In voxel gli alberi lontani usano una risoluzione ridotta, ed erba e ciottolato non
  possono scendere sotto la dimensione di un voxel: è il limite della resa voxel, per
  questo lo stile predefinito è ora il low-poly.
- Le notifiche push sono rimandate all'app nativa (Capacitor); nel browser la
  simulazione recupera il tempo trascorso alla riapertura.
- Nessun audio. La pathfinding è su griglia (niente evitamento dinamico tra personaggi).
- Lo stile *Miniatura* è derivato dalle stesse primitive: alcune incisioni diventano
  lastre scure e i tagli strutturali (scheggiature) non vengono resi.

## Prossimi passi

1. Fumo dai comignoli, scintille e fiamme animate; valutare asset eroi in GLB (vedi
   piano di migrazione).
2. Profilazione su iOS/Android e taratura delle soglie di qualità.
3. Audio (ambiente notturno, campane, corvi) con rispetto del mute.
4. Capacitor: notifiche native per anniversari/erbacce, salvataggio su SQLite.
