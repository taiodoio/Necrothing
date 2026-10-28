# Primo ingresso e onboarding

Come entra in Necrothing chi gioca per la prima volta. Il percorso ha cinque fasi:
splash, lettera, nome, introduzione e il cortile del Custode, una mappa piccola
dove si prova tutto. Ogni fase si può saltare con «Salta», in alto a destra; nelle schede c'è «Indietro», che torna alla scheda o alla pagina di prima. Dopo il cortile, nel cimitero vero, arrivano il primo obiettivo (la prima sepoltura) e i consigli al momento giusto. Dalle Impostazioni si rivede la lettera o si rifà il cortile.

Passando da una fase a schermo pieno all'altra (lettera, nome, introduzione) lo sfondo resta, con le lapidi e le lucciole, e cambiano solo le schede, sfumando. Sotto lo stesso sfondo si prepara il cortile, poi lo sfondo sfuma e il cortile compare.

## Le fasi

| Fase (`stage`) | Cosa succede | Codice |
| --- | --- | --- |
| `welcome` | Splash di caricamento con «Entra in Necrothing», poi la lettera | `app/boot.ts` (`finish({ cta })`), `ui/onboarding.ts` (`showLetter`) |
| `name` | Il Custode accoglie e chiede il nome | `showName`, `game/playerName.ts` |
| `intro` | Quattro schede brevi: fuochi fatui, cura, presenze, ricordi | `showIntro` |
| `yard` | Il cortile del Custode: dieci azioni vere | `game/yard.ts`, `startYard`, `showStep`, `targetsOf` |
| `done` | Si gioca; il primo obiettivo e i consigli | `showGoal`, `tipTick`, `game/tips.ts` |

- **Splash.** La scena notturna del cimitero (`public/boot/scena.webp`) con logo e veli scuri sopra e sotto. Solo al primo ingresso (`stage === 'welcome'`) mostra «Entra in Necrothing», col pulsante oro del gioco (`.big-btn`) e una sfumatura scura in basso perché si legga. Nessun contenuto commerciale. Agli avvii successivi lo splash sparisce da solo come prima.
- **Sfondo.** Fino al cortile la scena non si vede. Lettera, nome e introduzione stanno su uno sfondo loro (`.ob-solid`): i pannelli del gioco più scuri, con pattern tono su tono, bagliore caldo al centro ed edera in alto. In fondo ci sono, più scure, le lapidi con la terra e la pala del dettaglio delle tombe. Lo sfondo è già sotto lo splash prima che sparisca (`cover()`).
- **Lucciole.** Punti caldi che vagano e si accendono e spengono; si animano solo con trasformazioni e opacità. Il numero dipende dal livello grafico: 16 in alta, 8 in media, nessuna in bassa né con il movimento ridotto.
- **Lettera.** È un foglio di carta logora: bordi strappati (una maschera), macchie e grana. Le pieghe sono appena accennate, ondulate e sfocate, con qualche grinza.
  - In alta e media qualità, in 3,4 secondi e in un movimento solo, senza soste: il foglio arriva piegato in quattro ondeggiando, davanti a una luce calda che tremola. Mentre rallenta si apre la metà di sotto, e prima che finisca comincia ad aprirsi di lato; ogni apertura chiude con un filo di rimbalzo. Poi compare il testo. Arrivo e spostamenti stanno su involucri separati (`.ob-fold`, `.ob-fy`, `.ob-fx`), così le fasi si sovrappongono.
  - In bassa qualità non c'è la piega in 3D né il rumore della carta: il foglio sale e appare.
  - La lettera finisce con un timbro, dopo la firma e a destra, così non copre il testo. È il fuoco fatuo monocromatico in un cerchio d'inchiostro rovinato, ruotato di 30°. Si imprime quando, a lettera aperta, lo si raggiunge scorrendo.
  - Un tocco la apre subito; con il movimento ridotto è già aperta. «Salta» passa al nome; «Continua» compare a lettera aperta.
- **Nome.** È il nome del Custode, senza registrazione, salvato nella partita. Si cambia in qualsiasi momento dal profilo, con le stesse regole. Le regole (`checkName`):
  - forma NFC, spazi ripetuti ridotti a uno;
  - da 1 a 24 caratteri (contati come grafemi);
  - lettere di ogni alfabeto, numeri, spazi, apostrofi, punto e trattino, con almeno una lettera;
  - niente emoji né simboli.

  Se si salta, il nome resta «Custode».
- **Introduzione.** Quattro schede: raccogliere i fuochi fatui; fiori, pulizia e riparazioni; apparizioni e presenze; creare ricordi e personalizzare. Nella prima parla il fuoco fatuo, che si presenta, con il modello della scena (fiammella, cuore, occhietti: `wispPortrait`). L'inquadratura è fissa, sul centro della fiammella: il riquadro calcolato dal modello, condiviso con i fuochi fatui del gioco, a volte lo spostava di lato. Nella terza c'è il fantasma della scena.

## Il cortile del Custode

Una mappa piccola, costruita in memoria al posto della partita (`buildYard`, `Game.enterYard`). Dentro c'è solo quel che serve, tutto a pochi passi e chiuso da uno steccato:
- la Casa, col tetto e le aggiunte della partita vera, ma sempre allo stesso posto (nella partita vera può stare ovunque, anche fuori dal cortile), e la Bottega;
- una tomba trascurata, «Da lunedì vado in palestra»;
- una lanterna spenta, due celle più in là: accanto alla tomba la si toccava e veniva selezionata la tomba;
- due fuochi fatui, lontani dalla strada del primo passo, così non si raccolgono per sbaglio.

**Una partita a parte.** La partita vera resta da parte, intatta, e si salva al posto del cortile (`setSaveInstead`): il cortile non finisce mai nel salvataggio. Le due partite hanno in comune lo stato del percorso, quindi i passi fatti restano. Nel cortile:
- il tempo è fermo: niente presenze a caso, niente fuochi fatui nuovi, niente recupero del tempo passato;
- niente celebrazioni di rango e traguardi;
- quello che si guadagna (fuochi fatui, esperienza) resta lì;
- Seppellisci non si apre: la prima sepoltura si fa nel cimitero vero.

**I passi.** Un consiglio in cima allo schermo (l'HUD sotto è comunque spento dall'occhio di bue), con il Custode che esce dal riquadro, «n di 10» e «Salta il cortile ›». Entrando e uscendo dal cortile la camera va subito sul Custode: prima restava dove guardava nella partita vera, e i primi bersagli finivano fuori dallo schermo. Ogni passo si completa con l'azione vera, segnalata dal gioco (`signalOnboarding`); le azioni fuori ordine non contano.

| Passo | Azione | Segnale |
| --- | --- | --- |
| `walk` | toccare il prato: il Custode ci va | `walked` (Game) |
| `wisp` | raccogliere un fuoco fatuo | `wispCollected` (Game) |
| `clean` | pulire la tomba | `graveCleaned` (Game) |
| `flowers` | portarle i fiori | `flowersBrought` (Game) |
| `light` | accendere la lanterna | `lightToggled` (Game) |
| `shop` | comprare una lanterna in Bottega | `itemBought` (Bottega) |
| `place` | posarla (subito, o dall'Inventario) | `itemPlaced` (Game) |
| `edit` | in Modifica spostarla, poi «Fine» | `editDone` (Game) |
| `ghost` | toccare il fantasma che arriva | `presenceMet` (Game) |
| `sheet` | aprire la scheda della tomba | `graveOpened` (scheda) |

Con la scheda aperta il consiglio spiega «Altro» (riesumare, affidare all'albero); chiudendola il cortile è finito. I fuochi fatui come moneta non si spiegano di nuovo: lo fa già la prima scheda dell'introduzione. Nel cortile si impara il gesto, e in Bottega si vede a cosa servono.

**L'occhio di bue.** Per ogni passo c'è una catena di bersagli, dal più vicino alla fine al più lontano, e il segno va sul primo che si vede. Per comprare, per esempio: «Compra» nel modale, la lanterna nella Bottega aperta, «Bottega» nel menu dell'oggetto, la Bottega nella scena. Altri dettagli:
- **Pannelli:** sopra un pannello la scena non conta, e il buio attorno è più leggero, perché il pannello si deve leggere.
- **Camera:** se quel che va toccato (o il menu che gli compare sopra) sta per finire sotto il consiglio, la scena scende piano.
- **Fuori dallo schermo:** se un bersaglio della scena è fuori dallo schermo, la camera ci va (una volta per passo).
- **Pannelli che scorrono:** se il bersaglio sta più in basso in un pannello o in un modale (la lanterna in Bottega, «Compra» su uno schermo basso), il pannello scorre fin lì.
- **Fantasma:** se se ne va senza essere toccato, ne arriva un altro.

**Posare.** Quel che si posa (oggetti e tombe, anche fuori dal cortile) parte da due celle a destra del Custode, non sopra di lui.

**Modifica.** La barra di Modifica, con «Fine», scende sotto il consiglio, come i messaggi, e sta sopra il buio dell'occhio di bue; il consiglio dice «Quando hai finito, tocca «Fine»». La prima volta Modifica si presenta con la sua scheda: il segno va su «Inizia», poi sulla lanterna, e quando la si è spostata su «Fine».

**I pannelli sotto il consiglio.** Bottega, Inventario, scheda della tomba e dialoghi si aprono sotto il consiglio, che resta sopra, così non si coprono a vicenda. Messaggi e notifiche ricevuti intanto stanno sopra il buio dell'occhio di bue. Aprendo la scheda della tomba il consiglio nuovo c'è già, così la scheda si apre al suo posto (comparendo dopo la spostava di colpo); se il consiglio cambia altezza, pannelli e dialoghi scivolano piano.

**La fine.** La finestra delle celebrazioni, «Pronto, {nome}?», con il dono di benvenuto: la lanterna comprata e 20 fuochi fatui (`applyYardGift`), e «Inizia il gioco». Saltando il cortile il dono arriva lo stesso, con un messaggio. Poi lo sfondo del percorso, con «Il cimitero si sveglia…», copre il cambio di scena (almeno 0,9 secondi, perché sia un passaggio e non un lampo), e il cimitero vero compare. I modelli del cimitero sono già caricati dall'avvio, quindi il cambio è un ridisegno sotto lo sfondo: non serve rimettere la schermata di caricamento.

## Dopo il cortile

- **Il primo obiettivo.** «Il tuo primo addio», nello stile del consiglio, con l'occhio di bue sul pulsante della sepoltura. «Seppellisci ›» la apre, «Più tardi» la rimanda alla prossima apertura del gioco. Si chiude per sempre alla prima sepoltura (`onboarding.goal`).
- **I consigli al momento giusto** (`game/tips.ts`). Una notifica del Custode, una volta sola ciascuno, con «Mostrami» quando parla di qualcosa nella scena:
  - una tomba rotta;
  - un oggetto rovinato;
  - un animale con la sua casetta;
  - l'Albero dei ricordi;
  - le foto, dopo la prima sepoltura se non se n'è ancora fatta una.

  Arrivano solo quando il giocatore è libero (niente pannelli, dialoghi, Modifica, scelta del posto, notifiche), almeno un minuto l'uno dall'altro. Il primo arriva non prima di mezzo minuto dall'apertura.

## Stato e salvataggio

`SaveData.onboarding = { stage, step, goal, tips }` (`game/onboarding.ts`); il salvataggio resta alla versione 4, perché i campi nuovi li completa `normalizeOnboarding`.
- **Partita nuova:** comincia da `welcome`. Anche «Nuova partita» rifà tutto il percorso.
- **Salvataggi esistenti:** la migrazione v4 li segna come `done`, così chi gioca già non vede niente. Chi aveva già finito non riceve neanche il primo obiettivo né i consigli.
- **Il percorso di prima:** chi era a metà del vecchio tutorial o del giro riprende dal cortile.
- **Ripresa:** ogni fase e ogni passo si salvano subito. Chiudendo il gioco a metà, si riprende da lì, senza il pulsante dello splash se si era già oltre `welcome`. Il cortile si ricostruisce com'era a quel passo: tomba pulita, lanterna accesa, lanterna comprata o posata.
- **Valori sbagliati:** con `normalizeOnboarding`, una fase sconosciuta diventa `done` e un passo fuori misura torna dentro i limiti.

## Rivedere

Impostazioni › Gioco › Introduzione ha due pulsanti:
- **«Rivedi la lettera»:** solo la lettera; con «Continua» o «Salta» si torna al gioco.
- **«Rifai il tutorial»:** il cortile, senza lettera né nome e senza dono; alla fine «Torna al cimitero».

Lo stato del rivedere sta solo in memoria: non viene salvato e non cambia la partita, perché il cortile è sempre una partita a parte. Ricaricando a metà si torna al gioco.

## Le tombe narrative

La partita nuova ha sempre 10 tombe del vecchio custode. Tre sono quelle dell'introduzione, con id fissi:

| Id | Tomba | Epitaffio | Lapide | Stato iniziale |
| --- | --- | --- | --- | --- |
| `story-cactus` | Ernesto, il cactus indistruttibile | «Va bene che necessitava di poca acqua, però…» | semplice | con i fiori |
| `story-dinner` | La cena di classe | «Oh, poi organizziamo. Per me va bene qualsiasi giorno!» | rettangolare | pulita |
| `story-gym` | Da lunedì vado in palestra | «Ogni domenica risorgeva. Ogni lunedì moriva di nuovo.» | gotica | sporca |

Prendono il posto di Floppy, Tamagotchi e Ombrello, ma solo nelle partite nuove: i salvataggi esistenti non cambiano.
- **Lapidi:** nelle partite nuove tutte e 10 hanno lapidi della Demo. Le quattro che erano Full sono diventate croce celtica, croce di marmo, vittoriana e rettangolare.
- **Decorazioni:** accanto alle tre ci sono un vaso, una lanterna e una corona, tutti della Demo e spostabili.
- **Limite della Demo:** le tombe narrative non contano (`personalGraves` esclude le `legacy`).
- **Riesumare e affidare:** si possono riesumare e affidare all'albero come le altre. Una volta tolte non tornano: gli id sono fissi e `normalizeSave` non le ricrea.

## Caricamento progressivo

Le anteprime del Custode e delle miniature (`warmHeroes`, `warmThumbs`) vengono preparate prima di chiudere lo splash. Il resto delle anteprime (`warmAllPreviews`) si prepara in sottofondo durante pergamena, nome e cortile: quando si apre Bottega o Seppellisci, le immagini ci sono già.

## Interfaccia

- **Stile:** `styles/ui-onboarding.css` riusa pannelli, pulsanti e caratteri del gioco (`.dialog.modal`, `.big-btn`, gotico, i pannelli «natura e luce» del tema scuro). Niente contorni.
- **Il Custode che parla:** nella scheda del nome, nei consigli del cortile e nel primo obiettivo il suo mezzobusto esce dal riquadro per circa un terzo, come nell'HUD. Non sta dentro una forma; sotto ha una linea da cui parte.
- **Consiglio del cortile:** ha lo sfondo e i rametti delle notifiche dei personaggi. «Salta il cortile ›» ha lo stile delle loro CTA.
- **Occhio di bue:** nel cortile e nel primo obiettivo tutto si spegne attorno al bersaglio con una sfumatura, con una luce calda al centro e senza decorazioni. È un elemento grande tre schermi col buco al centro: segue il bersaglio con `translate`, quindi non si ridisegna, e pulsa piano; in qualità bassa sta fermo.
- **Scena sotto i livelli:** mentre pergamena, nome e introduzione sono aperti, e durante i cambi di scena, la scena si ferma come sotto un pannello (`setUiBlocking`).
- **Niente si copre:** messaggi, note delle presenze, la barra di Modifica e i pannelli scendono sotto il consiglio.
- **Livello grafico:** il cortile pesa meno della mappa piena (pochi oggetti, simulazione ferma). In qualità bassa valgono le regole di sempre: niente lucciole, niente scintille nella finestra finale, niente animazioni dei pannelli.
- **Prove:** a 390×844 e 375×667, anche con il movimento ridotto.

## I pannelli del gioco

Insieme al percorso, due correzioni che valgono per tutti i pannelli:
- **Scorrimento:** un pannello si apre sempre dall'alto. Prima, aprendone uno dopo averne scorso un altro, ci si trovava alla posizione di prima: il browser ignora l'azzeramento a pannello nascosto.
- **Apertura:** il pannello sale e si allarga mentre il velo sfuma, e i dialoghi fanno lo stesso. In qualità bassa e con il movimento ridotto niente animazione. Il livello grafico arriva alla pagina come `data-quality` su `<html>`.
