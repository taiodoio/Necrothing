#Home:
    Menù un dashboard, creare una bolla in overlay, angolo basso a sinistra. Cliccando si espande (orizzantalmente) e mostra le azioni
        Azioni dispinibili: 
            - Seppelisci (funnel di seppellimento)
            - Edit (popup con spunta "non mostrare più" - Tap to edit. Tap and hold to move. Una volta tappato l'elemento viene evidenziato. Un menu contestuale appare e permette di ruotare, eliminare o confermare lo spostamento. Drag & Drop per spostare nella mappa
            L'elemento rimosso, finisce nell'inventario nella categoria corrispondente) Se non attivo, il tap sugli elementi viene considerata una interazione semplice
            - Inventario (Diviso on top in schede, per categorie. Vedi sezione #inventario. Gli elementi già presenti vengono grigiati. Selezionando un elemento, appaiono due CTA: Inserisci o Vendi. Se vendi, vengono restituiti il 70% del prezzo. Hold&Drag, il menù si chiude e l'elemento evidenziato )
            - Bottega (sono visibili, gigiati tutti gli elementi disponibili e il loro costo. E' possiible comparli usando i fuochi fatui. Gli elementi non disponibili per mancanza fondi, sono grigiati. Quelli che sono stati venduti non hanno bisogno di essere ricomprati)
            - Foto (si apre un pop per spiegare come funziona. Un "rettangolo" compare sullo schermo, è possibile spostarne gli angoli per aumenare o diminuire l'area catturata, e un puslante rotondo subito consente la cattura. La foto viene visualizzata in un popup con possibilità di salvarla, eliminarla o condividerla. La condivisione salva automaticamente. Se salvata finisce in Galleria)
            - Galleria (sono visibili le foto scattate. E' possibile condividerle)
    In alto a destra è presente l'ora, sotto il meteo (solo giorno, notte, piogga o temporale) e allineata all'ora, l'icona di Setting.
    In alto a sinistra il nome del giocatore, il suo rango con barra di progressione ed il numero dei fuochi fatui. Cliccando su uno di questi elementi si apre la sezione Player

#Player:
    - Mostra la schermata con gli achievement raggiunti, la barra del punteggio e gli achievement da raggiungere

#Setting:
    - Notifiche
    - Backup
    - Info

#Inventario
    Luci
        - Lampione (x 3)
        - Lanterna (x 3)
        - Lanterna Fantasma
        - Zucca luminosa
        - Teschio con candela
        - Torcia in fiamme
        - Falò esoterico
        - Albero con candele

    Decorazioni
        - Corona di fiori
        - Cartello personalizzabile (è possibile inserire una scritta. Visibile aprendo il dettaglio dell'oggetto, o tapandoci sopra / interazione semplice)
        - Statua angelo
        - Statua votiva
        - Bara aperta
        - Ossa
        - Vaso (x 2)

    Costruzioni
        - Bottega (di dafault)
        - Mausoleo (Costa molto, aumenta del 10% la probabilità di vedere eventi random)
        - Tomba generica dissotterrata
        - Muretto in pietra
        - Staccionata di legno
        - Inferiate di ferro
        - Arco in pietra
        - Arco in pietra con Luci
        - Arco Gotico
        - Sentiero in pietra
        - Sentiero in terra
        - Pozzo
        - Fontana
        - Buco infernale
        - Casetta per animale domestico (randomicacamente, all'apertura l'animale è dentro la tana e non nel campo)
        - Casa del becchino (costa molto, aumenta la possibilità di vedere il becchino)
        - Santuario (costo molto, aumenta la possibilità di vedere il prete)

    Ambiente
        - lago con pesci morti
        - Albero morto
        - Albero spettrale
        - Pino mezzo morto
        - (solo natale: Albero natale morto con lucine)
        - Pozzanghere avvelenate
        - Rocce mostruose     
        - Aiuola Fiorita
        - Funghi velenosi
        - Cespugli
        - Collinetta
        - Erba alta e incolta
        - Terreno fangoso

    NPC
        - Zombie che giocano
        - Zombie che ballano
        - Fantasmi che girano per il campo
        - Animale domestico scheletro (cane, gatto, coniglio, papera, corvo) che gira per il campo
    

#Variazioni elementi:
    Tombe
     - Tombe senza fiori
     - Tomba senza fiori Sporca
     - Tomba senza fiori Rotta (non pulita per 10giorni) - Ripararlo costa
     - Tombe con fiori
     - Tomba con fiori Sporca 
    Luci
        - Accese
        - Spente
        - Sporche (si sporcano ogni 3 giorni)
        - Rotte (si rompono ogni 7 giorni se non pulite)
    Costruzioni
        - Pulite
        - Sporche (si sporcano ogni 3 giorni)
        - Rotte (si rompono ogni 7 giorni se non pulite)
        - Luci Accese (notte)



#Azioni (trasversali, ma non tutti gli items consentono tutte le azioni):
    - Pulire
    - Mettere fiori (Mettere i fiori genera maggiori probabilità di eventi casuali e fuochi fatui, e aumenta di 1 giorno la durata prima che si sporchi o si rompa la tomba. Quando la tomba si rompe, spariscono anche i fiori.)
    - Riparare (non si può pulire se non si ripara. Riparare pulisce anche)
    - Spostare
    - Ruotare
    - Eliminare (torna in inventario)
    - Raccogliere (fuochi fatui)
    - Interazione semplice (singe tap, no EDIT o altro attivo)
        - con elementi randomici: fantasmi, gatti neri, corvi, prete, becchino, etc. da i punti come definito e lo fa sparire
        - con luci, tombe e altro appare menù contestuale

#Menù contestuale:
     - dettaglio (apre popup con info, se tomba visualizza foto etc, se cartello il testo, se altro elemento una semplice descrizione simpatica)
     - Pulisci o Ripara (solo se / quando necessario)
     - Porta fiori (solo dove possibile)
     - Accendi spegni (solo per luci)

#Random Characters:
    - Corvo che vola
    - Fantasma (aumentano in funizione delle tombe. Possono essere fantasmi generici, o fantasmi delle cose seppellite. Questi più rari e difficili da "catturare" danno più punti)
    - Gatto nero che cammina, si siede, continua a camminare
    - Prete (Benedice le tombe, aumenta per un giorno in % la comparsa di fuochi fatui)
    - Becchino che attraversa (interagendo consente di pulire tutte le tombe vicine, gratis. La pulizia da punti)
    - Topo che corre
    - Zombie che cammina (aumenta probabilità di vederli in funzione di quantità di tombe generiche dissotterrate)


#Fuochi Fatui:
    - Il numero è funzione del numero di tombe nel gioco, della cura, dei fiori depositati.
    - L'interazione con Corvo, Fantasmi, Gatto, Topo e Zombie dona fuochi fatui aggiuntivi.

NOTA: da definire % di comparsa di questi eventi per aumentare longevità nel gioco. 
Dopo quanto ipoteticamente i giocatori hanno completato tutto e necessita di creare nuovi terreni o items?
=========================================

UPDATE 29/06:
- pagine si aprono in bottom drawer. Il menù scompare se una pagina è aperta. Nel bottom drawer deve esserci il pulsante chiudi in alto a sinistra
- Eventi random sembrano un pò troppo frequenti
- Foto in generale troppo pixelate. Non si capisce cosa stia vedendo. Rimuove la pixelature e lasciamo il B/N. 
- Foto - deve catturare una foto-screen del campo di gioco, non una foto a caso. 
- Meteo da definire ogni quanto cambia. Magari giornaliero. PEr ora lsciamo solo notte - giorno. Aggiungiamo dopo altri effetti.
- Movimento NPC su assi X e Y. Se incontra ostacoli, cambia direzione. Deve muoversi come la torre degli schacchi. Tranne i fantasmi. Loro possono attraversare ogni cosa, ma devono comunque muoversi solo sui due assi.
- Funnel "seppelisci" - prima di dare l'ok, una preview con tomba e foto etc. Simile alla vista "dettaglio".
- Bottega - Alcuni oggetti possono essere comprati più volte, altri no. In ambo i casi una volta selezionato un oggetto, appare una barra in fondo dove poter selezionare eventualmente la quantità (in base a disponibilità fondi e tipologia di oggetto) e CTAs acquista e sotto Annulla.
- Bottega - da ponderare se inserirla come primo elemento del gioco. Occupa un 3x3. Non può essere cancellata, ma solo spostata. Ci si accede direttamente cliccandoci sopra nella mappa. Il posizionamento serve anche come primo tutorial. La vedo piazzata sul campo, la sposto, do l'ok. Appare un banner con le istruzioni "questa è la bottega, qui potrai comprare tutti gli elementi etc..". Cliccando sopra la bottega, nella CTA dettagli, si apre il bottom drawer della bottega attuale. Il pulsante nel menù è una shortcut per centrare la mappa sulla bottega. 
