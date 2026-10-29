# Necrothing — Fase 4: piano operativo per chi prosegue

Risultato dell'implementazione e verifiche: [docs/fase-4-risultato.md](fase-4-risultato.md).

Documento di passaggio. Chi lo legge non ha visto la conversazione: qui ci sono lo stato esatto, le decisioni già prese, i passi da fare in ordine, i file da toccare, i criteri per dire «fatto» e le trappole già incontrate.

- Cartella di lavoro: `/Users/flaviomontagner/Documents/Apps/Necrothing/Production` (i percorsi sotto sono relativi a questa, salvo dove indicato).
- Lingua del progetto: italiano (commenti, testi, documenti). Il codice segue lo stile esistente: TypeScript, niente framework UI, helper `h()` in `src/ui/dom.ts`.
- Fonte dei testi: `../CMS/Necrothing CMS - traduzioni.xlsx` (locale, aggiornato, 9 lingue) e il foglio Google `1-jT8PuPoTiGtl89hk6bXg3AVp1XBtq4u61cece4H5_w` (lettura via `…/export?format=csv|xlsx`; ha solo 5 lingue e nessuna traduzione compilata: **non è la versione aggiornata**; la colonna Italiano è corretta e senza errori).
- Reference del design system: `design-system.html` (+ `src/designSystem.ts`, `src/styles/design-system.css`). Va letta per intero prima di costruire qualsiasi elemento nuovo: contiene i «Principi» e la lista «Prima di consegnare un elemento nuovo».
- Obiettivo della Fase 4 (dal brief dell'utente): completare le interfacce secondarie per la beta Full — pagina Info, lingua (rilevamento, scelta manuale, persistenza), tutorial/introduzione riapribili senza azzerare progressi né riassegnare ricompense, interfaccia beta senza elementi commerciali, contatto via `mailto:`, coerenza con le regole UI già adottate.

---

## 0. Come lavorare (trappole già incontrate)

1. **Terminale.** I comandi lunghi o su più righe (heredoc `<<'EOF'`, `python3 -`, `node -e` con virgolette annidate) restano spesso in coda e non producono output (compare «The user chose to proceed while the command is starting…» e l'output va in un file di log). Soluzione affidabile: scrivere lo script in un file (`/tmp/x.py`, `/tmp/x.mjs`) con lo strumento di editing e lanciarlo con un comando corto; se un comando va in log, leggere il file di log indicato.
2. **Dimensione delle scritture.** Lo strumento di editing rifiuta testi sopra ~6000 caratteri: scrivere i file grandi in parti e unirle con `cat`.
3. **zsh.** `grep -rn pattern dir --include=*.ts` fallisce («no matches found»): usare `grep -rn pattern dir` oppure la ricerca nel codice.
4. **macOS.** `sed -i` vuole un suffisso (`sed -i.bak`), poi rimuovere i `.bak`. Meglio script Python con sostituzioni esatte che stampano `MANCA:` quando il testo da sostituire non si trova.
5. **Excel.** In `../CMS/` c'è `~$Necrothing CMS - traduzioni.xlsx`: il file è aperto da chi lo usa. **Non scrivere nel file originale**; lavorare su una copia (passo B4).
6. **Git.** Nessun commit fatto. `Production/` e `CMS/` non sono tracciate. `origin/main` è stato scaricato (`git fetch`): contiene il design system, portato a mano in `Production/`. Non fare commit/push senza richiesta.
7. **File temporanei.** Gli script in `/tmp` usati finora spariranno: non dipendere da loro (gli algoritmi utili sono descritti qui).
8. **Verifica a ogni passo.** Dopo ogni gruppo di modifiche: `npx tsc --noEmit` (0 errori), `node scripts/i18n-check.mjs --count` (`0 in tutto`), `npm test` (tutto verde, 7-40 s). `tsc` **non** segnala gli import inutilizzati: cercarli a mano.
9. **Niente promesse sui dispositivi.** I test su iOS/Android li fa l'utente. Nel documento finale distinguere sempre: *automatizzato*, *manuale eseguito dall'assistente (browser desktop)*, *da fare su dispositivo*.

---

## 1. Decisioni già prese (non riaprirle)

| Tema | Decisione |
|---|---|
| Lingue | `it`, `en`, `de`, `fr`, `es`, `pt`, `zh-Hans`, `zh-Hant`, `ja`, `ko` (10). Il portoghese del foglio è quello europeo: va bene. |
| Lingua di ripiego | **Inglese** (non italiano) se la lingua del dispositivo non è supportata. |
| Cambio lingua | **Ricarica dell'app**; conferma richiesta **solo se c'è lavoro in corso** (C3). Nessuna perdita di progressi. |
| Selettore lingua | **Dropdown** nelle Impostazioni (scheda Gioco), secondo il design system. Il design system non ha un dropdown: va aggiunto lì (markup + snippet) prima o insieme all'uso. |
| Font CJK | Noto Serif (titoli) + Noto Sans (testi/pulsanti) per `zh-Hans`, `ja`, `ko` **e `zh-Hant`**. Font **variabili** `@fontsource-variable/*`, caricamento selettivo, offline (file locali WOFF2). Nessun CDN a runtime. |
| Subset | Niente subset fissi che taglino caratteri: i pacchetti Fontsource sono già divisi per `unicode-range`, il browser prende solo le porzioni che servono. Così anche i caratteri scritti dal giocatore sono coperti. |
| Pulizia | Prima della Fase 4. Si toglie tutto il vecchio stile pixel/voxel. I «9 oggetti legati al voxel» erano un falso allarme (varianti di famiglie con generatore low-poly). |
| Pagine di prova | Eliminate (galleria, lab, bench, proto-*). `design-system.html` resta nel repo e col server di sviluppo, **non** nella build pubblicata. |
| Tombe del vecchio custode | Vanno tradotte (nome ed epitaffio), derivandole all'avvio (C5). |
| Crediti | Nessun credito personale. Solo le licenze di librerie e font. |
| Contatto | `taio.doio@gmail.com`, apre il client email con `mailto:`. Testo beta: «Hai trovato un problema o vuoi condividere un suggerimento? Scrivimi.» Configurazione per cambiare in futuro il testo (accesso anticipato alla Full). |
| Versione mostrata | Resta `0.2.0` (da `package.json`) con etichetta «Beta» e codice del commit. Niente nome del profilo né data. |
| Privacy | Frase breve nell'app («nessun account, nessuna analisi, i dati restano sul dispositivo»), vera perché il codice non fa richieste di rete. Campo per un indirizzo di informativa, vuoto finché non esiste. |
| Test su dispositivo | Li fa l'utente. |

---

## 2. Stato attuale (verificato)

### Misure di riferimento

| Misura | Prima della pulizia | Dopo il primo passo di pulizia |
|---|---|---|
| `npm test` | 145/145 | **144/144** (uno in meno: rimosso quello sul voxel; uno nuovo: «nessun ripiego») |
| `tsc --noEmit` | 0 errori | 0 errori |
| `i18n-check --count` | 0 | 0 |
| `dist/` totale | 3896 KB | **3696 KB** |
| `dist/assets/` | 3556 KB (111 webp, 34 woff, 31 woff2, 12 js, 5 css) | 3428 KB (stessi webp/font; `main-*.js` 889 kB / gzip 311 kB; `three-*.js` 538 kB / gzip 137 kB; `main-*.css` 144 kB / gzip 38 kB) |
| Righe `src/**/*.ts` | — | 31 839 |

Questi numeri servono per il confronto finale «prima/dopo i font».

### Già fatto (non rifarlo)

- Portato in `Production/` il design system dal remoto (`design-system.html`, `src/designSystem.ts`, `src/styles/design-system.css`, `LP_ICON_NAMES` in `lpIcons.ts`).
- **Eliminati:** `bench.html`, `gallery.html`, `lab.html`, `proto-*.html` (7), `src/bench.ts`, `src/gallery.ts`, `src/lab.ts`, `src/proto/`, `src/tools/`, `src/game/fullCemetery.ts` (spostato in `tests/helpers/fullCemetery.ts`, usato da due test), `screenshots/` (70 MB), `shots/`, `vite.log`.
- **Eliminati dal rendering:** `src/render/voxelMesher.ts`, `lowpolyMesher.ts`, `shape.ts`, `palette.ts`, `src/render/models/*` (modelli a primitive).
- **Nuovi file:** `src/render/types.ts` (`VOX`, `Bucket`, `BucketGeometries`, `LightAnchor`, `PVis`), `src/render/keys.ts` (`placeableKey`, `placeableSeed`, `seedCount`).
- **API cambiate (tenerne conto):**
  - `getModel(key)`: un solo argomento; lancia `Nessun modello per <chiave>` se manca il generatore. `CachedModel = { geometries, lights, height }`. Resolver: `setModelResolver`.
  - `LOWPOLY_MATERIALS` è l'unico set di materiali (anche `Atmosphere` regola `LOWPOLY_MATERIALS.glow`).
  - `buildRig(kind, look?)`; `new Actors(scene, atmosphere, start, look?)` con `rebuild()` al posto di `setStyle`; `new WorldView(scene, atmosphere)` con `rebuild(state)`; `modelJobs(state)`.
  - `placeableThumb(type, variant?)`, `graveThumb(type, state?, seed?, size?)`, `addPresences(group, vis)`.
  - `surfaceHeight(input, wx, wz)`, `buildChunk(input, cx, cy)` (solo terreno low-poly, nessuna texture).
  - `ArtStyle` e `Settings.style` non esistono più. `normalizeSave` scarta `style` e `theme` dai salvataggi vecchi (riparazione ripetibile; **`SAVE_VERSION` resta 4**).
  - Chiavi di testo tolte dall'italiano: `game.debug.style`, `demo.grave.name`, `demo.grave.epitaph`, `page.bench.title`.
- **Test:** `tests/render.test.mjs` riscritto sui generatori low-poly; `tests/lowpoly.test.mjs` aggiornato; nuovo test «nessun ripiego sul vecchio stile» (95 oggetti × 3 stati, 10 lapidi × 4 stati × 4 semi, ogni parte dei 20 personaggi); `tests/distribution.test.mjs` verifica che `style` e `theme` spariscano dal salvataggio migrato.
- `vite.config.ts`: `rollupOptions.input = { main: 'index.html' }`.

### Difetti noti da correggere

1. **Link rotto:** in `src/ui/screens.ts` la scheda Info delle Impostazioni ha `info: h('a', { href: './gallery.html' … t('settings.assetGallery')`: la pagina non esiste più. Si toglie nel passo D1.
2. **`index.html`**: la meta `description` (chiave `page.description`) dice «in voxel»: correggere il testo italiano **e** le 9 traduzioni nel CMS.
3. **Chiavi di testo ormai inutili** da togliere dal CMS e dal codice: `game.debug.style`, `demo.grave.name`, `demo.grave.epitaph`, `page.bench.title`, `look.ui.styleNote` (il ramo che la usava è stato tolto), `settings.assetGallery`, `settings.info`, `settings.build.distribution`, e quelle dei rami «vecchia interfaccia» quando verranno rimossi (es. `shop.intro.classic`, `game.pet.freeOld`, `inventory.sell`).
4. Possibili import inutilizzati dopo il refactor (es. in `src/ui/screens.ts`, `WorldView.ts`): cercarli a mano.
5. Altri file possono avere variabili ormai inutili: `tsc` non le segnala.

---

## 3. Piano, in ordine

Ogni passo ha obiettivo, file, istruzioni e criterio di fine. Non passare al successivo se i controlli del §0.8 non sono verdi.

### PASSO A — Completare la pulizia

Obiettivo: nel repository non deve restare nulla del vecchio stile pixel/voxel né dei rami «vecchia interfaccia».

**A0. Foto «prima» (regressione visiva).** *Prima di toccare A1*, installare Playwright (appendice H1) e scattare screenshot a 390×844 e 390×664 di: HUD, menù di gioco, menù contestuale, barra di Modifica, Impostazioni (4 schede), Bottega (ogni scheda, dettaglio, modale di acquisto), Inventario, Sepoltura (ogni passo), Profilo e traguardi, Registro, Casa, Albero dei ricordi, scheda del defunto, cartolina, foto/galleria, onboarding (lettera, nome, introduzione, un passo del cortile). Il gioco espone `window.necro` (istanza `Game`) per pilotare lo stato. Salvare in `/tmp/shots-before/` (non nel repo).

**A1. Interruttori `uiNext()` / `uiPlay()` / `uiPreview()`** (`src/app/uiNext.ts`). Sono sempre accesi (`main.ts`: `setUiNext(true); setUiPlay(true); setUiPreview(true);`), quindi ogni ramo `else` è codice morto. Punti di chiamata: `screens.ts` 23, `UI.ts` 14, `Game.ts` 13, `WorldView.ts` 6, `house.ts` 3, `memoryTree.ts` 3, `customize.ts` 2, `icons.ts` 2, `memorial.ts` 2, `deceased.ts` 1, `parchment.ts` 1.
- Procedura, un file alla volta: sostituire la chiamata con `true`, semplificare il ramo, togliere ciò che diventa irraggiungibile, poi `tsc` + test.
- **Non togliere le classi CSS `ui-next` e `ui-play`**: tutto il CSS (`ui-next.css`, `ui-play.css`, `ui-house.css`, `ui-onboarding.css`, `ui-moments.css`, design system) è scritto con quei selettori. Metterle staticamente in `index.html` (`<html class="ui-next ui-play" data-theme="dark">`) e togliere i setter. `design-system.html` e `designSystem.ts` chiamano `setUiNext/Play/Preview(true)` e `applyTheme()`: aggiornarli e verificare che `/design-system.html` si apra ancora (`npm run dev`).
- Rami «vecchi» già individuati: `screens.ts` (Bottega «classica» con `shop.intro.classic`, inventario con `inventory.sell`, `openDetail` vecchio sotto `if (g && uiNext())`, `startPhoto` senza overlay), `UI.ts` (`fabIcon`, HUD classico, `runButton`), `Game.ts` (`game.pet.freeOld`, `say()` con `toast`, `announceAnniversaries`, `startItemPlacement`), `WorldView.ts` (`softPlate`, `earnMaterial` con `Pixelify Sans`, `NearestFilter`), `memoryTree.ts`, `memorial.ts`.
- Dopo A1: eliminare `src/app/uiNext.ts` (resta ciò che serve davvero, di solito niente).
- Chiavi di testo rese inutili: script che, per ogni chiave base di `src/i18n/it/*.ts` (senza `#one/#other`), controlla che compaia come stringa letterale o come prefisso di un template (`` `prefisso.${x}` ``) nel codice. Al momento risultavano non citate solo `player.wisps.value` (da verificare: potrebbe essere dinamica) e `page.bench.title` (già tolta).

**A2. Icone pixel.** `src/ui/icons.ts` (≈700 righe) ha la tabella `ICONS` di icone pixel-art 12×12; `iconUrl()` la usa quando `hasLpIcon(name)` è falso. Elencare i nomi usati (`icon('nome'`, `data-icon="nome"`, `icon: 'nome'`) **senza** versione colorata in `src/ui/lpIcons.ts` (`hasLpIcon`). Se non ce ne sono: eliminare `ICONS`, `PAL` e il rendering pixel, lasciando `icon()`, `iconUrl()`, `drawIcon()`, `hydrateIcons()`, `ACH_ICONS`, `ACH_COUNT`. Se ce ne sono: **chiedere all'utente** come devono apparire prima di disegnarle in `lpIcons.ts`. `installFrames()` (in fondo a `icons.ts`) genera le cornici pixel `--frame*`: toglierla insieme alle regole `border-image`.

**A3. CSS e caratteri vecchi.**
- `src/styles/main.css`: circa 17 regole `border-image` (cornici pixel), `--pixel`/`--gothic` con `Pixelify Sans`/`Jacquard 24`, `image-rendering: pixelated`. `ui-next.css`: 4 regole `border-image` + `.ui-next * { border-image: none !important }`. Togliere ciò che il tema attuale annulla comunque. **Prima di cancellare**, confrontare con gli screenshot A0.
- Nel design system `--gothic` = Grenze Gotisch (titoli) e `--pixel` = Nunito (testo; «il nome è rimasto dal vecchio stile»). Un'eventuale rinomina (`--serif`/`--sans`) va fatta in un passo a parte, con sostituzione globale e design system aggiornato.
- `src/view/WorldView.ts`: `g.font = … "Jacquard 24"` per il testo dei cartelli e `'800 46px "Nunito"'` per i numeri. Nel passo E il font dei canvas viene centralizzato: usare lì le costanti di `fonts.ts`.
- `src/main.ts`: togliere gli import `@fontsource/pixelify-sans/*` e `@fontsource/jacquard-24`. `package.json`: togliere quelle due dipendenze (poi `npm install` per aggiornare `package-lock.json`). `Cinzel` resta (sottotitolo sulla targa in `index.html`) finché il passo E non decide altrimenti.
- Consigliato: Fontsource emette sia `.woff` sia `.woff2` per i caratteri latini (34 + 31 file in `dist`). Importare solo i CSS con woff2 (iOS ≥ 10 e Android WebView moderni lo supportano) risparmia spazio.
- Opzionale: `CameraMode` ha ancora `'top'` (la vista dall'alto è stata tolta: lo stato forza `'angled'`); si può semplificare `CameraRig`.

**A4. Documenti e README.**
- Eliminare (restano nella cronologia del remoto): `docs/asset-migration-catalog.md`, `docs/visual-migration-plan.md`, `docs/audit-stile-custode-v2.md`.
- Riscrivere `README.md`: oggi cita Three.js, voxel, pagine di prova (`/gallery.html`, `/bench.html`, `/proto-*.html`), «Gothic Voxel». Deve descrivere: cos'è; `npm run dev|build|build:beta|test|typecheck`; struttura `src/`; profili di distribuzione; flusso dei testi (CMS → `scripts/i18n-*`); regola «ogni elemento nuovo segue `design-system.html`».
- Aggiornare `docs/distribuzione-e-accesso.md` (la riga «Il profilo attivo si vede in Impostazioni › Info» cambia: la versione mostra solo numero + «Beta» + commit) e `docs/primo-ingresso.md` (sezione «Rivedere»: nuovi pulsanti nella pagina Info e «Rivedi le spiegazioni»).
- `package.json`: `name` è ancora `necrothing-prototype-3d`; chiedere all'utente se rinominarlo.
- `scripts/i18n-check.mjs`: la lista `SKIP` cita ancora `bench`, `lab`, `gallery`, `proto`: ripulirla.

**Criterio di fine A:** `grep -rniE "voxel|pixelify|jacquard|miniatur|bench|gallery.html|proto-|uiNext|uiPlay|uiPreview" src index.html README.md docs scripts tests package.json vite.config.ts` non trova nulla di pertinente al vecchio stile (ammessi: «Galleria» delle foto del giocatore, `persistence.gallery`, `menu.gallery`, e i commenti storici dei test di migrazione). Build ok; screenshot «dopo» identici o con differenze spiegate; test verdi.

---

### PASSO B — Pipeline dei testi (CMS → codice)

Obiettivo: riportare nel codice le 9 lingue del CMS in modo ripetibile e sicuro.

**Fatti verificati**
- Foglio «Testi», intestazione: `Chiave | Sezione | Gruppo | Note | Caratteri | Italiano | English | Deutsch | Français | Español | Português | Chinese (Simplified) | Chinese (Traditional) | Japanese | Korean`. 1460 righe, una per chiave di `src/i18n/it/*.ts`; nessuna chiave in più o in meno (verificato). Il foglio «Leggimi» ha le regole per i traduttori: segnaposto `{n}`, plurali `#one/#other`, separatore `|`, apostrofo davanti ai testi che iniziano con `+ = - @`.
- Nel `.xlsx` locale le celle di testo sono `inlineStr` (nessun `sharedStrings.xml`); le celle in errore hanno `t="e"`. Il lettore deve gestire `t="s"` (shared string), `t="inlineStr"`, `t="str"` (formula stringa), `t="e"` (errore → valore `#ERR:…`).
- Il file locale ha ancora **3 celle italiane in errore**, e le loro 9 traduzioni sono vuote:
  - `detail.business.ready#one` → `+{n} pronto da riscuotere ({min}–{max} fuochi fatui al giorno, fino a {cap})`
  - `detail.business.ready#other` → `+{n} pronti da riscuotere ({min}–{max} fuochi fatui al giorno, fino a {cap})`
  - `inventory.sellGain` → `+{n}`
  (testi giusti: quelli del foglio online e del codice.)
- 5 frasi italiane del foglio sono più recenti del codice e vanno riportate nel codice (l'import lo fa se `Italiano` differisce): `boot.webglFailed`, `backup.invalidImage`, `backup.unknownFile`, `backup.corrupt`, `game.contextRestoring`. Nota: la nuova `boot.webglFailed` finisce con `?).` (punto dopo la parentesi); chiedere o valutare.
- Francese: `num.thousandsSep` = `U+202F` (spazio sottile), ok; `anniv.ago#one/#other` completi.
- Controlli già fatti sul file locale: segnaposto `{…}` identici all'italiano in tutte le celle; numero di `|` identico; nessuna cella vuota oltre le 3 sopra.

**B1. Lettore `.xlsx`** — `scripts/i18n-xlsx.mjs`: legge il file con `fflate` (già in `package.json`, `unzipSync`) e un parser XML minimo a regex (`<row>/<c>/<v>/<is><t>`; in Node non c'è `DOMParser`), risolve `workbook.xml` e `_rels` per trovare il foglio «Testi», produce lo stesso JSON di righe che `scripts/i18n-sheet.mjs import` già accetta (array di righe, la prima è l'intestazione). Uso: `node scripts/i18n-xlsx.mjs "../CMS/….xlsx" /tmp/righe.json`.

**B2. Correggere `scripts/i18n-sheet.mjs`**
- `LANG_COLUMNS`: aggiungere `'Chinese (Simplified)': 'zh-Hans'`, `'Chinese (Traditional)': 'zh-Hant'`, `Japanese: 'ja'`, `Korean: 'ko'`.
- `writeLangs()` genera `import ${code} from './${code}.ts'`: `zh-Hans` non è un identificatore valido. Generare identificatori sicuri (`zhHans`) e nomi **scritti nella lingua stessa** (`Italiano`, `English`, `Deutsch`, `Français`, `Español`, `Português`, `简体中文`, `繁體中文`, `日本語`, `한국어`), non le intestazioni del foglio.
- **Caricamento pigro:** `src/i18n/langs.ts` deve esportare, per ogni lingua tranne l'italiano, un caricatore `() => import('./xx.ts')` e i nomi; non importare tutti i dizionari staticamente (+circa 1 MB nel bundle). `src/i18n/index.ts` ha oggi `DICTS` sincrono: `t()` resta **sincrono**, ma il dizionario attivo si carica **prima** dell'avvio (`await initI18n()` in `main.ts`, vedi C1). I test (Node con `--experimental-strip-types`) importano i `.ts` direttamente: `import()` dinamico funziona.
- Generare anche l'insieme `DEFAULT_PLAYER_NAMES` (le 10 traduzioni di `state.player.defaultName`) in `langs.ts`: serve a C5.
- **Celle in errore:** se una cella (italiano o traduzione) contiene `#ERROR!`, `#NAME?`, `#VALUE!`, `#REF!`, `#N/A`, `#DIV/0!`, `#NULL!` o il prefisso `#ERR:`, **ignorarla** (resta il testo del codice / cella vuota) e stampare un avviso con la chiave. Mai scrivere un valore di errore nei file.
- Apostrofo iniziale: nel `.xlsx` è un attributo di stile, non è nel testo; nel CSV di Google il testo arriva senza apostrofo. Se comparisse, toglierlo.
- Il formato dei file generati non cambia: `'chiave': 'testo',` una per riga; `// …` sopra = nota; `// ── Gruppo ──` apre un gruppo.
- L'import stampa già «Chiavi nel foglio che non esistono nel codice»: serve a elencare le chiavi tolte (§2, difetto 3).

**B3. Test nuovi** in `tests/i18n.test.mjs`: ogni lingua generata ha tutte le chiavi dell'italiano (o l'elenco esplicito delle eccezioni); per ogni traduzione stessi segnaposto `{x}` dell'italiano (per le forme `#one` basta un sottoinsieme, come nel test esistente) e stesso numero di `|`; nessun valore che somigli a un errore di formula; i plurali hanno `#other` in ogni lingua.

**B4. CMS: copia nuova.** Creare `../CMS/Necrothing CMS - traduzioni (Fase 4).xlsx` (copia dell'originale, mai l'originale) con: le 3 celle italiane ripristinate (come testo, con apostrofo iniziale) e le loro 9 traduzioni; le righe nuove dei passi C, D, E (elenco in C4, D9); la rimozione delle chiavi tolte; le 5 frasi riscritte già allineate al codice. Serve uno script che modifica un `.xlsx` con `fflate` (leggere lo zip, aggiungere `<row>` con `inlineStr` in `xl/worksheets/sheetN.xml`, riscrivere lo zip). L'utente poi importa la copia nel foglio Google (File › Importa › Sostituisci foglio): l'assistente **non** può scrivere su Google.

**Criterio di fine B:** `node scripts/i18n-xlsx.mjs … && node scripts/i18n-sheet.mjs import …` genera `src/i18n/{en,de,fr,es,pt,zh-Hans,zh-Hant,ja,ko}.ts` e `langs.ts` validi; `npm test` verde (compresi i test B3); l'app in italiano è invariata; con `localStorage.setItem('necro.lang','ja')` e ricarica i testi cambiano.

---

### PASSO C — Lingua

**C1. Rilevamento e caricamento** — `src/i18n/index.ts`. Oggi `startLang()` legge `localStorage['necro.lang']` oppure `navigator.language.slice(0,2)` con ripiego `it`. Cambiare in:
1. preferenza salvata valida;
2. altrimenti scorrere `navigator.languages` (poi `navigator.language`) e mappare: codice esatto; `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant*` → `zh-Hant`; altri `zh*` → `zh-Hans`; poi la lingua base (`pt-BR` → `pt`, `de-AT` → `de`);
3. se nessuna è supportata → **`en`**.

- Preferenza: `necro.lang` in `localStorage`, **fuori dal salvataggio** (sopravvive a «Nuova partita» e al backup). Assente = «Lingua del dispositivo»; valore esplicito = scelta manuale.
- `async function initI18n()`: determina la lingua, carica il dizionario con `import()`, imposta `Intl.PluralRules` e `document.documentElement.lang` (BCP-47: `zh-Hans`, `zh-Hant`, `ja`, `ko`…). `main.ts` la attende **prima** di costruire boot e interfaccia (oggi `boot.ts` usa `t()` subito). `toLocaleString('zh-Hans')` è valido.
- `t()` resta sincrono; fallback all'italiano per chiavi mancanti (invariato).

**C2. Dropdown** (Impostazioni › scheda Gioco, al posto del `seg(...)` di `screens.ts` che oggi fa `setLang(v); location.reload()`).
- **Prima** aggiungerlo al design system: `design-system.html`, sezione «Campi e controlli» (`id="campi"`), nuovo `.ds-example` con markup e snippet (la pagina crea da sola i `<details>` Markup). Stile in `src/styles/ui-next.css` con i token esistenti (`--r-s`, `--panel-2`, `--primary`…). Rispettare i «Principi»: niente contorni (stati con `box-shadow`), una sola azione oro per schermata, selezione = anello oro 2,5 px, animazioni solo `transform`/`opacity` 0,2-0,5 s con `cubic-bezier(0.2, 1.2, 0.35, 1)` in entrata, spente con `html[data-quality="low"]` e `prefers-reduced-motion`, bersagli ≥ 44 px (usare 48), testo ≥ 12 px, nessuna sfocatura sulla scena.
- Accessibilità: pulsante con `aria-haspopup="listbox"` e `aria-expanded`; lista `role="listbox"` con `role="option"` e `aria-selected`; frecce, Home, End, Invio, Esc, lettere. **Esc chiude il dropdown e non il pannello**: pattern di `src/ui/dom.ts` (`keydown` in cattura con `stopPropagation()` + `preventDefault()`, come `openModal`). Chiusura al tocco fuori. Apertura verso l'alto se sotto manca spazio; rispettare `--safe-b`. Ogni voce ha l'attributo `lang` della propria lingua e il nome scritto nella lingua stessa. In cima: «Lingua del dispositivo» (con la lingua rilevata tra parentesi).
- Dopo la scelta: feedback immediato (voce evidenziata + spunta), poi C3.

**C3. Cambio lingua senza perdere nulla**
- `Game.languageChangeBlockers()` restituisce i motivi per cui la ricarica farebbe perdere lavoro non salvato: posizionamento in corso (`game.placement`), modalità Modifica (`game.editMode`), sepoltura aperta con bozza (drawer `kind: 'burial'`), overlay foto (`#photo-layer` attivo), percorso d'ingresso in corso o rivisto (`ui.onboarding.running`), cortile (`game.inYard`), dialoghi aperti. Se l'elenco è **vuoto**: nessuna conferma. Altrimenti `confirmDialog` («Il gioco si ricarica per cambiare lingua. Quello che stai facendo va perso; i progressi restano.»).
- Sequenza: `saveNow(state)` (`src/app/persistence.ts`; nel cortile `setSaveInstead` salva già la partita vera) → `setLang(code)` → `sessionStorage.setItem('necro.afterLang', JSON.stringify({ tab: 'game' }))` → `location.reload()`.
- All'avvio, se c'è `necro.afterLang`: riaprire `openSettings(ui)` sulla stessa scheda (`settingsTab` è una variabile di modulo in `screens.ts`), mostrare un toast nella nuova lingua («Lingua cambiata: {name}»), rimuovere la chiave.
- Il salvataggio debounced (`scheduleSave`, 250 ms) è la possibile fonte di perdita: coperta da `saveNow` prima del reload.
- **Non tradurre** i contenuti del giocatore (nomi/epitaffi delle sue tombe, testo dei cartelli, nome del Custode se personalizzato).

**C4. Righe nuove per il CMS** (tradurre in tutte le 9 lingue; tono del Custode, leggero, termini neutri, «tu» informale): `settings.language.auto` («Lingua del dispositivo»), `settings.language.changed` («Lingua cambiata: {name}»), `settings.language.confirm.title`, `settings.language.confirm.text`, `settings.language.confirm.ok`, `settings.language.listLabel` (etichetta aria del dropdown).

**C5. Tombe del vecchio custode e nome «Custode» tradotti** (nessun nuovo `SAVE_VERSION`).
- Oggi `createNewGame()` (`src/game/state.ts`, array `legacy`) salva nome ed epitaffio **già tradotti** nella lingua del momento: `story-cactus`, `story-dinner`, `story-gym`, `legacy-4` … `legacy-10` (chiavi `state.story.*` e `state.legacy.*`); idem `player.name` = `t('state.player.defaultName')`.
- Una funzione `localizeStatic(state)` chiamata **alla fine di `normalizeSave`** (gira al caricamento e all'import dei backup) e dopo `createNewGame`:
  - per ogni tomba con `legacy: true` e `id` nella mappa fissa id → chiavi, riscrive `name`/`epitaph` con `t(chiave)` nella lingua corrente. Le tombe del vecchio custode non sono modificabili dal giocatore (da riverificare: `grep -n "name =" src/game/rules.ts`), quindi si può derivare sempre;
  - se `player.name` è uno dei `DEFAULT_PLAYER_NAMES` (B2), lo riscrive col default della lingua corrente. Un nome scelto dal giocatore non coincide e non si tocca.
- Poiché il cambio lingua ricarica l'app, basta questo: non servono modifiche ai circa 38 punti che leggono `g.name`.
- Test: partita in `it`, `setLang('en')`, `normalizeSave(JSON)`: le 10 tombe e il nome sono in inglese; una tomba creata dal giocatore resta invariata; un nome personalizzato resta; l'operazione è idempotente.
- `src/game/yard.ts` (cortile) costruisce tombe e testi a ogni avvio con `t()`: già corretto.

**Criterio di fine C:** lingua del dispositivo non supportata → inglese; `zh-TW` → cinese tradizionale; scelta manuale persistente tra riavvii e dopo «Nuova partita»; cambio lingua senza lavoro in corso → nessuna conferma e ritorno alla stessa scheda; con un posizionamento in corso → conferma; progressi identici prima/dopo (`JSON.stringify(state)` identico, escluse le sole stringhe tradotte); tombe del vecchio custode in lingua; dropdown nel design system e usato; test verdi.

---

### PASSO D — Pagina Info, tutorial, contatti, Beta

Codice di partenza: `src/ui/screens.ts` (`openSettings`, schede `game | graphics | save | info`, `settingsTab`, `buildLabel`), `src/ui/onboarding.ts` (`replayLetter`, `replayTutorial`, `replay`, `go`, `finale`, `leaveYard`), `src/config/distribution.ts`.

**D1. Scheda Info (nelle Impostazioni).** Sezioni nello stile delle altre schede (`.section-title`, `.setting`, `.big-btn.ghost`, `.row`); CTA con gerarchia chiara (tutte secondarie: la pagina è informativa, nessuna oro):
1. **Intestazione:** logo (`public/boot/logo.webp`) o titolo gotico «Necrothing», frase breve (`info.about.title`, `info.about.text`) e pastiglia **Beta** (D5).
2. **Introduzione e tutorial** (spostare qui la sezione oggi nella scheda Gioco; chiavi esistenti `settings.section.onboarding`, `settings.onboarding.hint`, `settings.onboarding.letter`, `settings.onboarding.tutorial`): «Rileggi la lettera» (`ui.onboarding.replayLetter()`), **«Rivedi le spiegazioni»** (nuovo, D2), «Rifai il tutorial» (`replayTutorial()`).
3. **Guida ai comandi** → modale compatto (`openModal`).
4. **Versione** (D4).
5. **Contatto** (D3).
6. **Note legali e licenze** → modale compatto (D6).
- Togliere dalla scheda: il testo `settings.info` (cita «prototipo procedurale (Three.js)» e scorciatoie `C vista`/`V stile` inesistenti), il link alla galleria asset, la riga «Distribuzione: {profile}», la data di build.
- «Statistiche tecniche» (`settings.debug`, scheda Grafica): visibile solo con `distribution().id === 'development'`.
- Navigazione prevedibile: X in alto a destra, Esc e tocco sul velo chiudono; i modali compatti tornano alla scheda Info (il drawer resta aperto sotto).

**D2. «Rivedi le spiegazioni»** = le 4 schede dell'introduzione (`showIntro`, `INTRO`: fuochi fatui, cura, presenze, ricordi), senza nome, senza cortile, senza dono.
- In `Onboarding` aggiungere `replayIntro()` accanto a `replayLetter()`: `this.replay({ stage: 'intro', step: 0, goal: 'done', tips: [] }, …)` con un flag `introOnly` (come `letterOnly`) così che, dall'ultima scheda, «Continua»/«Salta» tornino a `done` invece di avviare il cortile, e «Indietro» dalla prima scheda esca invece di andare a `name`.
- Lo stato dei replay è **solo in memoria** (`this.replaying`), mai salvato. Verificare che `save()` sia disattivato (`if (!this.replaying)`), che `go('done')` non imposti `settings.shopTutorialDone` durante un replay, che `finale()`/`leaveYard()` con `replay` non chiamino `applyYardGift`.
- **Requisito:** la ripetizione non azzera progressi né riassegna ricompense. Test automatico: dopo un replay completo di lettera, spiegazioni e cortile, `xp`, `wisps`, `inventory`, `onboarding` (stage/goal/tips) e `settings` della partita vera sono **identici**. La prova di integrazione col cortile (azioni vere) è manuale (Playwright con `window.necro`).
- Il «giro dell'interfaccia» come funzione a sé non esiste più dal commit `b65afc1` (sostituito dal cortile): «ripetere il walkthrough» = rifare il cortile.

**D3. Contatto**
- `src/config/contact.ts` (nuovo): `CONTACT = { email: 'taio.doio@gmail.com', stage: 'beta' | 'earlyAccess', texts: { beta: 'info.contact.beta', earlyAccess: 'info.contact.earlyAccess' } }` e `PRIVACY_URL = ''`. Il testo mostrato è `t(CONTACT.texts[CONTACT.stage])`: per l'accesso anticipato alla Full basta cambiare `stage` (o legarlo al profilo) e il testo nel CMS. Nessun testo duro nel codice.
- UI: testo + `<a class="big-btn ghost" href="mailto:taio.doio@gmail.com?subject=…">` (vero collegamento: il sistema apre il client email), con oggetto precompilato `Necrothing {versione} ({lingua})` (`encodeURIComponent`; testo come chiave `info.contact.subject`). Sotto: indirizzo visibile e «Copia indirizzo» (`navigator.clipboard.writeText` con ripiego `execCommand('copy')` e toast di conferma) per chi non ha un'app di posta.
- Testo beta (it): «Hai trovato un problema o vuoi condividere un suggerimento? Scrivimi.» Traduzioni proposte (da far rivedere a un madrelingua):
  - en: «Found a problem or want to share a suggestion? Write to me.»
  - de: «Ein Problem gefunden oder einen Vorschlag? Schreib mir.»
  - fr: «Un problème ou une suggestion à partager ? Écris-moi.»
  - es: «¿Has encontrado un problema o quieres compartir una sugerencia? Escríbeme.»
  - pt: «Encontraste um problema ou queres partilhar uma sugestão? Escreve-me.»
  - zh-Hans: «发现了问题，或想分享建议？欢迎给我写信。»
  - zh-Hant: «發現了問題，或想分享建議？歡迎寫信給我。»
  - ja: «不具合を見つけた、または提案があれば、ぜひご連絡ください。»
  - ko: «문제를 발견했거나 제안하고 싶은 점이 있나요? 저에게 메일 보내 주세요.»
- `info.contact.earlyAccess` (accesso anticipato alla Full) **non è ancora scritto**: creare la chiave con un segnaposto sensato e chiedere all'utente il testo definitivo; poi tradurlo.
- Da verificare su dispositivo (utente): `mailto:` in WKWebView (Capacitor iOS) e Android WebView; altrimenti `window.open(url, '_system')` o un plugin App Launcher.

**D4. Versione.** `vite.config.ts` inietta `__BUILD__ = { commit, built, distribution }`. Aggiungere `version` letta da `package.json` e aggiornare `src/build.d.ts`. `buildLabel()` in `screens.ts` mostra `{version} · Beta · {commit}` e, in sviluppo, «Versione di sviluppo». Niente data, niente nome del profilo.

**D5. Etichetta «Beta».** In `ProfileConfig` (`src/config/distribution.ts`) aggiungere `betaLabel: boolean` (`beta-full` e `development` veri, `store-release` falso): attenzione a `tests/distribution.test.mjs`, che confronta i profili. Pastiglia piccola nel design system (riusare `.wisp-pill`/`.pill` o un `.badge` esistente: cercare in `design-system.html`; se manca, aggiungerlo lì) nell'intestazione della scheda Info e, se l'utente lo vuole, in un punto discreto della schermata iniziale. **Non** deve comparire nel gameplay (HUD, scena) né coprire altro. Chiave: `info.beta` («Beta»).

**D6. Note legali e licenze** (modale compatto, scorrevole):
- Sezioni: **Informazioni** (© Necrothing, tutti i diritti riservati; solo «Necrothing», senza inventare nomi propri), **Privacy** («Nessun account, nessuna analisi. La partita e le foto restano sul tuo dispositivo. L'email serve solo se mi scrivi.» + collegamento «Informativa sulla privacy» se `PRIVACY_URL` è valorizzato), **Licenze di terze parti**.
- Licenze: Three.js (MIT), fflate (MIT), Nunito, Grenze Gotisch, Cinzel (SIL OFL 1.1) e, dopo il passo E, Noto Serif/Sans (SIL OFL 1.1). La OFL chiede di distribuire testo della licenza e copyright **insieme ai file dei font**. Soluzione: `scripts/collect-licenses.mjs` copia i `LICENSE`/`OFL.txt` dei pacchetti usati in `public/licenses.txt`, eseguito in `prebuild`; il modale mostra nome e licenza e apre il testo con `fetch('./licenses.txt')` (funziona offline in Capacitor perché il file è nel pacchetto).
- Nessun dettaglio tecnico superfluo: niente «Three.js» nella frase di presentazione né nell'intestazione; compare solo nell'elenco delle licenze.

**D7. Guida ai comandi** (modale compatto). Contenuto verificato dal codice (`src/app/Input.ts`, `Game.onKey`, `steerFromKeys`): ricontrollare i tasti in `Game.onKey` prima di scrivere.
- Al tocco: toccare il prato = il Custode ci va; toccare un oggetto o una tomba = il Custode ci va e compare il menù; trascinare = muovere la vista (in Modifica, trascinare un oggetto lo sposta); pizzicare = zoom.
- Con tastiera/mouse (mostrare **solo** se `matchMedia('(hover: hover) and (pointer: fine)')`): WASD o frecce = muoversi; E = interagire con ciò che è vicino; B = bicicletta; F = scopa (se la si possiede); rotella = zoom; Esc = chiudere/tornare indietro. (I tasti C e V del vecchio testo **non esistono più**.)
- Chiavi nuove: `info.controls.title`, `info.controls.touch.*`, `info.controls.keys.*`.

**D8. Nessun elemento commerciale nella beta.** Verificato: nessun acquisto in-app, nessun codice promozionale, nessun «Coming soon», nessun ripristino acquisti nel codice; con `beta-full` nessuna regola restituisce `'full'`. Restano **internamente** i testi `shop.lock.full`, `shop.need.full.*`, `shop.buy.full`, `rules.access.full` per la Demo futura (visibili solo con accesso `demo`, che nella beta non esiste). Da fare:
- Test in `tests/distribution.test.mjs`: con `beta-full`, per tutto il catalogo, le lapidi, le opzioni d'aspetto e la Casa, `shopAvailability`, `graveTypeAvailability`, `lookOptionAvailability`, `houseAvailability` non restituiscono mai `'full'`; `unlockRequirements` e `houseRequirements` non contengono `kind: 'full'`.
- Test di scansione dei testi: nessuna chiave italiana con «in-app», «codice promozionale», «Ripristina acquisti», «Coming soon», «Prossimamente» (le «Acquista · {n} fuochi fatui» sono la valuta del gioco: ammesse).
- Il catalogo continua a distinguere Demo e Full internamente (`ACCESS` in `catalog.ts`, ecc.): **non modificare**.

**D9. Righe nuove per il CMS** (da compilare in 10 lingue): `info.about.title`, `info.about.text`, `info.beta`, `info.section.intro`, `info.intro.replay` («Rivedi le spiegazioni»), `info.controls.*`, `info.contact.title`, `info.contact.beta`, `info.contact.earlyAccess`, `info.contact.send`, `info.contact.copy`, `info.contact.copied`, `info.contact.subject`, `info.version`, `info.legal.title`, `info.legal.about`, `info.legal.privacy`, `info.legal.privacyLink`, `info.legal.licenses`, `info.legal.openLicense`. Riusare le chiavi esistenti invece di duplicare: `settings.onboarding.*`, `settings.title`, `settings.tab.info`, `dialog.close`.

**Criterio di fine D:** la scheda Info ha informazioni su Necrothing, rileggi la lettera, rivedi le spiegazioni, rifai il tutorial, guida ai comandi, versione, contatto, note legali; nessun riferimento a Three.js/framework/galleria asset nelle schermate (solo nell'elenco licenze); l'`href` `mailto:` è corretto (l'apertura del client la prova l'utente); i replay non cambiano la partita (test); coerenza con safe area, bersagli ≥ 44 px, animazioni riducibili.

---

### PASSO E — Font CJK e tipografia centralizzata

Prima di scrivere codice **leggere**: `index.html` (stile `#boot`, `.boot-sub` con `Cinzel`), `src/main.ts` (import `@fontsource/*`, attesa `document.fonts.load('700 20px Cinzel')`), `src/app/boot.ts` (`showTagline`), `src/styles/*.css` (`--pixel`, `--gothic`), `src/ui/postcard.ts` (costanti `GOTHIC`, `SANS` per il canvas), `src/view/WorldView.ts` (testo dei cartelli e numeri sul canvas), `src/designSystem.ts`.

**Fatti verificati**
- Font attuali del tema: titoli **Grenze Gotisch** (600, 700), testo **Nunito** (600, 700, 800), splash **Cinzel** 700. (Pixelify e Jacquard sono residui da togliere in A3.)
- Caratteri presenti nel CMS: `zh-Hans` 1332 unici (1252 CJK + 20 simboli/punteggiatura), `zh-Hant` 1365, `ja` 1014 (929 kana/kanji), `ko` 776 (701 hangul/hanja). Simboli non CJK usati anche nelle lingue latine: `· × – — “ ” „ … › → − ★ ✦ ✨`; in cinese/giapponese anche punteggiatura full-width (`、。！（），：；？「」々〜～`). `★ ✦ ✨ →` possono **non** essere nei Noto CJK: cadono su un font di sistema (verificare l'assenza di `□` su iOS/Android: rischio da dispositivo).
- Pacchetti `@fontsource-variable/*` (dimensione spacchettata, un solo set copre tutti i pesi): `noto-sans-sc` 4,87 MB, `noto-serif-sc` 6,40 MB, `noto-serif-jp` 7,84 MB, `noto-sans-kr` 3,81 MB. **Non misurati**: `noto-sans-jp`, `noto-sans-tc`, `noto-serif-tc`, `noto-serif-kr` (verificare con `npm view @fontsource-variable/<nome> version dist.unpackedSize`). I pacchetti statici costano circa 3,3-4,1 MB **per peso** per famiglia (102-125 file per peso, già divisi per `unicode-range`). Stima per le quattro lingue con i variabili: circa 40-45 MB installati (stima: misurare).
- Pesi realmente usati: Serif (titoli) solo 700; Sans 600, 700, 800.

**E1. Un solo punto di configurazione** — `src/i18n/fonts.ts` (nuovo), richiamato dal sistema di localizzazione:
- Per lingua: `{ serif, sans, load }`. Lingue latine: `Grenze Gotisch` / `Nunito`, nessun caricamento aggiuntivo. `zh-Hans` → Noto Serif SC / Noto Sans SC; `zh-Hant` → TC; `ja` → JP; `ko` → KR. Coda dello stack con font di sistema CJK (`"PingFang SC"`, `"Hiragino Sans"`, `"Apple SD Gothic Neo"`, `"Noto Sans CJK …"`, `sans-serif`) come rete di sicurezza.
- `applyFonts(lang)`: imposta `--gothic` e `--pixel` su `document.documentElement.style` (l'inline batte `.ui-next.ui-play { --gothic: … }` di `ui-play.css`) e `html[lang]`. Esporre `fontFamilies()` (`{ serif, sans }` come stringhe per il canvas) usata da `postcard.ts` e `WorldView.ts` al posto delle costanti.
- **Caricamento selettivo:** nessun `import '@fontsource-variable/noto-*'` statico. In `load()` usare import dinamici (`import('@fontsource-variable/noto-sans-sc/wght.css')`): Vite crea un chunk CSS caricato solo allora e risolve i `url()` dei woff2. Verificare nella build che nessun CSS/woff2 CJK sia referenziato dalla pagina principale e che i file escano con hash in `assets/` (cache `immutable` già in `vercel.json`).
- **Niente FOUT né layout shift:** prima di costruire l'interfaccia attendere `await Promise.all([load(), document.fonts.load('700 20px "<serif>"', campione), document.fonts.load('600 16px "<sans>"', campione)])`, con `campione` = tutti i caratteri del dizionario attivo (il browser scarica le porzioni `unicode-range` giuste). Per le lingue CJK caricare i font prima di `boot.showTagline()` (il sottotitolo sulla targa usa Cinzel/Nunito).
- **Canvas:** `document.fonts.load()` prima di disegnare cartolina e cartelli. La cartolina è il solo testo con lingua; il cambio lingua ricarica, quindi nessuna cache da invalidare.
- **Caratteri dell'utente** (nomi, epitaffi in qualsiasi alfabeto): coperti dalle porzioni `unicode-range` caricate a richiesta (online) o locali (Capacitor); in coda alla `font-family` i font di sistema.

**E2. Test**
- *Automatici (Node):* test su `fonts.ts` (mappa lingua → famiglie; lingue latine invariate; ogni lingua supportata ha una voce); test di copertura: per ogni lingua CJK, ogni carattere del dizionario è coperto da almeno uno degli `unicode-range` dei CSS Fontsource corrispondenti (leggere i `.css` in `node_modules/@fontsource-variable/noto-*/` ed espandere i range `U+…`), escluso l'elenco esplicito dei simboli non CJK che usano il fallback.
- *Browser (Playwright, H1):* per `zh-Hans`, `zh-Hant`, `ja`, `ko`: `getComputedStyle(elemento).fontFamily` e `document.fonts.check()` corretti per titoli e testi; **richieste di rete**: all'avvio in giapponese nessun `.woff2` cinese/coreano (intercettare `page.on('request')` e filtrare `noto-(sans|serif)-(sc|tc|kr)`); idem per cinese e coreano; cambiando lingua solo i font necessari; seconda visita servita da cache.
- *Offline:* `context.setOffline(true)` dopo il primo caricamento della build di produzione (`npm run build && npm run preview`), poi ricaricare e cambiare tra le lingue: nessun errore di rete. (Capacitor reale: dall'utente.)
- *Stabilità visiva:* screenshot a 390×844 e tablet (820×1180) in `de` (testi lunghi: «Morgendämmerung», «Überspringen»), `fr`, `ja`, `ko`, `zh-Hans` per HUD, menù, Impostazioni, Info, Bottega, sepoltura, modali, notifiche, cartolina; controllare troncamenti nei pulsanti e sovrapposizioni. Rapporti di lunghezza: mediana tedesco/francese ≈ 1,02 dell'italiano, ma i casi brevi arrivano a 3,8× (`time.phase.dawn`) e 3,0× (`house.part.veggie.label`); il giapponese è ≈ 0,43.
- *Misure da registrare nel documento finale:* dimensioni della build prima/dopo (asset compressi e installati; confronto con la tabella del §2); tempo di cambio lingua con font in cache (obiettivo 300 ms dal comando alla nuova UI: **la ricarica pesa**; misurare e, se non rispettato, documentare e proporre ottimizzazioni senza ridurre la copertura); memoria dopo cambi ripetuti (con la ricarica si azzera: documentarlo).
- *Da fare su dispositivo (utente):* Android WebView e iOS WKWebView, avvio senza rete, tempi reali, memoria, framerate.

**Criterio di fine E:** i criteri automatizzabili passano (selezione font, caricamento selettivo, offline in browser, copertura); misure registrate; elenco esplicito di ciò che resta da provare su dispositivo.

---

### PASSO F — Verifica finale, documenti, consegna

1. `npx tsc --noEmit` = 0; `npm test` tutto verde; `node scripts/i18n-check.mjs --count` = 0; `npm run build` e `npm run build:beta` (`VITE_DISTRIBUTION=beta-full`) ok.
2. Controllo «nessun elemento commerciale» (D8) e «nessun dettaglio tecnico superfluo»: `grep -rniE "three\.?js|webgl|vite|voxel|framework" src/i18n` deve trovare solo ciò che è ammesso (`boot.webglFailed` con «WebGL» è un errore tecnico visto dall'utente: valutare se riformularlo; le licenze possono citare Three.js).
3. Regressione visiva: screenshot «dopo» confrontati con A0 (lingua `it`).
4. Aggiornare `docs/primo-ingresso.md`, `docs/distribuzione-e-accesso.md`, `docs/capacitor-todo.md` (font locali, `mailto:`, licenze), `README.md` e il design system (`design-system.html`: dropdown, eventuale pastiglia Beta, tabella «Dove sta cosa» se cambiano file come `uiNext.ts`).
5. Documento finale per l'utente: cosa è stato fatto; tabella PASS/FAIL dei criteri di accettazione (Impostazioni funzionanti, Lingua persistente, Tutorial riapribile, Contatti funzionanti, Nessun elemento commerciale, Nessun dettaglio tecnico superfluo, Nessuna regressione); misure; **elenco di ciò che l'utente deve provare su dispositivo**; rischi residui.
6. Consegnare la copia del CMS (B4) e l'elenco delle righe nuove da importare nel foglio Google.

---

## 4. Appendice

### H1. Playwright (per E2 e per le foto A0/F)
`npm i -D playwright` poi `npx playwright install chromium` (circa 150-250 MB, fuori dal progetto; non finisce nell'app). `scripts/bake-previews.mjs` lo usa già (e cerca `playwright` anche in `/opt/node22/lib/node_modules/playwright/index.mjs`). Per pilotare lo stato il gioco espone `window.necro`; server di sviluppo `npx vite --port 5173`; build `npm run preview`. WebGL headless: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` (come in `bake-previews.mjs`).

### H2. Mappa dei file principali
- Testi: `src/i18n/index.ts` (`t`, `tList`, `hasT`, `setLang`, `currentLang`, `LANGS`), `src/i18n/it/{catalog,game,screens,app,ui}.ts`, `src/i18n/langs.ts` (generato), `scripts/i18n-sheet.mjs`, `scripts/i18n-check.mjs`, `tests/i18n.test.mjs`, `src/ui/dom.ts` (`applyPageTexts`, attributi `data-i18n*` in `index.html`).
- Impostazioni e Info: `src/ui/screens.ts` (`openSettings`, `settingsTab`, `buildLabel`, `importSave`, `exportSave`).
- Onboarding: `src/ui/onboarding.ts`, `src/game/onboarding.ts`, `src/game/yard.ts`, `src/game/tips.ts`, `docs/primo-ingresso.md`.
- Distribuzione: `src/config/distribution.ts`, `src/game/entitlement.ts`, `src/game/rules.ts` (`*Availability`, `*Requirements`), `vite.config.ts`, `docs/distribuzione-e-accesso.md`.
- Salvataggio: `src/game/state.ts` (`SAVE_VERSION = 4`, `MIGRATIONS`, `normalizeSave`, `createNewGame`), `src/app/persistence.ts` (`saveNow`, `scheduleSave`, `setSaveInstead`).
- UI di base: `src/ui/dom.ts` (`h`, `openDrawer`, `openModal`, `confirmDialog`, `progressDialog`, `toast`, `closeDrawer`), `src/ui/UI.ts` (`escape()`), `src/styles/*.css`.
- Test: `tests/*.test.mjs`, `tests/helpers/fullCemetery.ts`, `tests/fixtures/save-v{1,2}.json`.

### H3. Rischi residui e mitigazioni
| Rischio | Mitigazione |
|---|---|
| Togliere i rami `uiNext/uiPlay/uiPreview` rompe una schermata | Un file alla volta, test a ogni passo, screenshot prima/dopo (A0) |
| Dimensione dell'app con 4 famiglie CJK (stima 40-45 MB) | Font variabili, caricamento a `unicode-range`, misurare; se troppo, subset statico dei soli caratteri del CMS (circa 1000-1300 per lingua) + porzioni a richiesta |
| Simboli `★ ✦ ✨ →` senza glifo nei Noto | Fallback di sistema in coda alla `font-family`; verifica su dispositivo; eventuale sostituzione con icone SVG |
| Cambio lingua con ricarica oltre i 300 ms | Misurare, documentare, ottimizzare (precaricare i font della lingua scelta prima della ricarica); la soglia nasce da un requisito che confligge con la ricarica scelta dall'utente |
| Traduzioni da rivedere da madrelingua (lo dichiara il foglio) | Segnalarlo nel documento finale, soprattutto lettera, introduzione, battute dei personaggi |
| `mailto:` non apre il client in WKWebView/Android WebView | «Copia indirizzo» come alternativa; prova su dispositivo dall'utente |
| Tombe/nome tradotti sovrascrivono scelte dell'utente | Solo tombe `legacy` con id fisso e nomi uguali a un default; test di non regressione |
| Perdita di progressi al cambio lingua | `saveNow` prima della ricarica; conferma se c'è lavoro in corso; test di uguaglianza dello stato |
| Il foglio Google resta indietro rispetto al CMS locale | Fornire la copia xlsx pronta da importare; avvisare l'utente |
| `Prototype-3d/` e `Prototype-3d_old/` restano con il vecchio codice | Fuori ambito; chiedere all'utente se archiviarle quando `Production/` sostituisce `Prototype-3d` |

### H4. Verifiche già fatte (non rifarle)
- Allineamento chiavi CMS/codice: 1460/1460.
- Nel file locale nessun segnaposto o separatore `|` sbagliato.
- I 95 oggetti del catalogo hanno un generatore low-poly (diretto o tramite famiglia): `lamp_post_double/gothic` → `lamp_post` (variante 1/2), `lantern_pole/stone` → `lantern`, `urn` → `vase`, `pet_house_*` → `pet_house`. `petHouseLP` ignora la variante: le quattro casette hanno lo stesso modello, cambia solo l'animale.
- Il codice non fa richieste di rete a runtime (l'unico `fetch(url)` è su data-URL per convertire una foto in blob).
