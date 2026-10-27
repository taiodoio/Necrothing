# Primo ingresso e onboarding

Come entra in Necrothing chi gioca per la prima volta. Il percorso ha sei fasi:
splash, pergamena, nome, introduzione, tutorial e giro dell'interfaccia. Ogni fase
si può saltare, e il percorso si può rivedere dalle Impostazioni.

## Le fasi

| Fase (`stage`) | Cosa succede | Codice |
| --- | --- | --- |
| `welcome` | Splash di caricamento con «Entra in Necrothing», poi la pergamena | `app/boot.ts` (`finish({ cta })`), `ui/onboarding.ts` (`showLetter`) |
| `name` | Il Custode accoglie e chiede il nome | `showName`, `game/playerName.ts` |
| `intro` | Quattro schede brevi: fuochi fatui, cura, presenze, ricordi | `showIntro` |
| `tutorial` | Cinque azioni vere nella scena | `showStep`, `targetOf`, `game/onboarding.ts` |
| `tour` | Quattro tappe: profilo, Seppellisci, Bottega, menu | `showTour` |
| `done` | Si gioca | — |

- **Splash.** È quello di sempre. Solo al primo ingresso (`stage === 'welcome'`) mostra il pulsante «Entra in Necrothing», con una sfumatura scura in basso perché si legga. Nessun contenuto commerciale. Agli avvii successivi lo splash sparisce da solo come prima.
- **Pergamena.** La carta ha già la sua misura e viene scoperta dall'alto (`clip-path`) mentre il rullo di sotto scende: un'animazione di 1,8 s. Un tocco la apre subito. Con il movimento ridotto è aperta fin da subito. Il testo scorre dentro la carta; «Salta» e «Continua» passano al nome.
- **Nome.** È il nome del Custode, senza registrazione, salvato nella partita. Si cambia in qualsiasi momento dal profilo, con le stesse regole. Le regole (`checkName`):
  - forma NFC, spazi ripetuti ridotti a uno;
  - da 1 a 24 caratteri (contati come grafemi);
  - lettere di ogni alfabeto, numeri, spazi, apostrofi, punto e trattino, con almeno una lettera;
  - niente emoji né simboli.

  Se si salta, il nome resta «Custode».
- **Introduzione.** Quattro schede con la voce del Custode: raccogliere i fuochi fatui; fiori, pulizia e riparazioni; apparizioni e presenze; creare ricordi e personalizzare.
- **Tutorial.** Un consiglio in alto e un segno sulla scena che segue la camera. Quando l'oggetto è selezionato, il segno passa al pulsante giusto del suo menu. Ogni passo si completa con l'azione vera, segnalata dal gioco (`signalOnboarding`):

  | Passo | Azione | Segnale |
  | --- | --- | --- |
  | `wisp` | raccogliere il fuoco fatuo più vicino | `wispCollected` (Game) |
  | `visit` | aprire la scheda di «La cena di classe» | `graveOpened` (`openDeceased`) |
  | `light` | accendere o spegnere la lanterna vicina a «Da lunedì vado in palestra» | `lightToggled` (Game) |
  | `clean` | pulire una tomba sporca, di preferenza «Da lunedì vado in palestra» | `graveCleaned` (Game) |
  | `bury` | toccare Seppellisci | `burialOpened` (`openBurial`) |

  Le azioni fuori ordine non contano. Un passo senza bersaglio viene saltato, per esempio quando non c'è nessun fuoco fatuo o nessuna tomba sporca. Il tutorial non dà ricompense proprie: si ricevono solo quelle delle azioni vere, come sempre.
- **Giro.** Una luce su ogni tappa e una scheda: profilo e statistiche, con l'aspetto del Custode; Seppellisci; Bottega e Inventario; il menu con tutte le voci in una tappa, comprese le Impostazioni. Parte quando la sepoltura aperta nell'ultimo passo viene chiusa.

## Stato e salvataggio

`SaveData.onboarding = { stage, step }` è la versione 4 del salvataggio (`game/onboarding.ts`).
- **Partita nuova:** comincia da `welcome`. Anche «Nuova partita» rifà tutto il percorso.
- **Salvataggi esistenti:** la migrazione v4 li segna come `done`, così chi gioca già non vede niente.
- **Ripresa:** ogni fase e ogni passo si salvano subito. Chiudendo il gioco a metà, si riprende da lì, senza il pulsante dello splash se si era già oltre `welcome`.
- **Valori sbagliati:** con `normalizeOnboarding`, una fase sconosciuta diventa `done` e un passo fuori misura torna dentro i limiti.

## Rivedere

Impostazioni › Gioco › Introduzione › «Rivedi l'introduzione» rifà tutte le fasi dalla pergamena. Lo stato del rivedere sta solo in memoria: non viene salvato e non cambia la partita. Le azioni vere fatte nel frattempo danno le loro ricompense normali. Ricaricando a metà si torna al gioco.

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

Le anteprime del Custode e delle miniature (`warmHeroes`, `warmThumbs`) vengono preparate prima di chiudere lo splash. Il resto delle anteprime (`warmAllPreviews`) si prepara in sottofondo durante pergamena, nome e tutorial: quando si apre Bottega o Seppellisci, le immagini ci sono già.

## Interfaccia

- **Stile:** `styles/ui-onboarding.css` riusa pannelli, pulsanti e caratteri del gioco (`.dialog.modal`, `.big-btn`, gotico) e i colori del tema.
- **Scena sotto i livelli:** mentre pergamena, nome, introduzione e giro sono aperti, la scena si ferma come sotto un pannello (`setUiBlocking`).
- **Consiglio del tutorial:** messaggi e note delle presenze scendono sotto il consiglio, così non si coprono.
- **Prove:** a 390×844 e 375×667, anche con il movimento ridotto.
