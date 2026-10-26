// Testi italiani: screens.

export default {
  // ── Sepoltura ──
  // titolo del pannello
  'burial.title': 'Seppellisci',
  // epitaffi suggeriti (pulsanti sotto il campo), voci separate da «|»
  'burial.epitaph.suggestions': 'Ha dato tutto. Anche la garanzia.|Riposa in pezzi.|Non era rotto: era stanco.|Qui giace, finalmente scollegato.|Ci mancherai, più o meno.|Sei stato utile. A volte.',
  'burial.intro': 'Ogni oggetto merita un addio. Chi seppelliamo oggi?',
  'burial.name.label': 'Nome del defunto',
  'burial.name.placeholder': 'es. Caricatore del 2014',
  'burial.category.label': 'Categoria',
  'burial.abstractLimit': 'Hai già seppellito una cosa astratta oggi: torna domani.',
  'burial.birthDate.label': 'Nato il (facoltativo)',
  'burial.deathDate.label': 'Morto il',
  'burial.cause.label': 'Causa del decesso',
  // breve: pulsante tra le cause, per scriverne una a mano
  'burial.cause.custom': 'Personalizza…',
  'burial.cause.customPlaceholder': 'es. Morso dal criceto',
  'burial.cause.customLabel': 'La tua causa',
  'burial.epitaph.placeholder': 'Un ultimo pensiero…',
  'burial.epitaph.label': 'Epitaffio (facoltativo)',
  // l'epitaffio tra virgolette, nel riepilogo
  'burial.epitaph.quoted': '“{text}”',
  'burial.graveType.intro': 'Scegli la lapide. Le più ricche si sbloccano salendo di rango.',
  // breve: lucchetto sulla lapide, «R» sta per rango
  'burial.graveType.rankShort': 'R{n}',
  'burial.summary.category': 'Categoria',
  'burial.summary.lived': 'Vissuto',
  'burial.summary.cause': 'Causa',
  'burial.summary.graveType': 'Lapide',
  'burial.summary.next': 'Dopo la conferma scegli il posto nel cimitero: arriverà il corteo funebre.',
  // breve: pulsante
  'burial.back': 'Indietro',
  // breve: pulsante
  'burial.cancel': 'Annulla',
  // notifica quando si va avanti con campi mancanti
  'burial.incomplete': 'Completa i campi.',
  // breve: pulsante (passo «Foto» senza foto)
  'burial.skip': 'Salta',
  // breve: pulsante
  'burial.next': 'Avanti',
  // breve: pulsante
  'burial.postcard': 'Cartolina',
  // breve: pulsante
  'burial.choosePlace': 'Scegli il posto',

  // ── Modalità Modifica ──
  'edit.intro.title': 'Modalità Modifica',
  'edit.intro.text': 'In Modifica tocchi un elemento per selezionarlo e lo trascini per spostarlo. Dal menù puoi ruotarlo o riporlo nell’inventario. Fuori da Modifica, il tocco è solo interazione.',
  'edit.intro.dontShow': 'Non mostrare più',
  // breve: pulsante
  'edit.intro.start': 'Inizia',

  // ── Bottega: lucchetti sulle carte ──
  // breve: carta della Bottega
  'shop.lock.rank': 'rango',
  // breve: carta della Bottega
  'shop.lock.season': 'stagione',
  // breve: carta della Bottega
  'shop.lock.feat': 'traguardo',
  // breve: carta della Bottega
  'shop.lock.owned': 'posseduto',
  // breve: carta della Bottega
  'shop.lock.graves': 'tombe',
  // breve: carta della Bottega, «R» sta per rango
  'shop.lock.rankShort': 'R{n}',
  // breve: carta della Bottega (oggi la forma è «tombe» anche per 1)
  'shop.lock.gravesCount#one': '{n} tombe',
  'shop.lock.gravesCount#other': '{n} tombe',

  // ── Bottega: cosa serve per sbloccare (breve: pillola sulla carta; lungo: riga nel dettaglio) ──
  // {when} è una data o un periodo (es. «1–15 nov»)
  'shop.need.season.short.date': 'Solo {when}',
  // {when} è il nome di una festa o stagione (es. «Halloween»)
  'shop.need.season.short.named': 'Solo a {when}',
  'shop.need.season.long.date': 'Si compra solo {when}: poi resta tuo per sempre.',
  'shop.need.season.long.named': 'Si compra solo a {when}: poi resta tuo per sempre.',
  'shop.need.rank.short': 'Rango {n}',
  // {xp} è il numero già formattato dei punti che mancano (oggi «mancano» anche per 1)
  'shop.need.rank.long#one': 'Si sblocca al rango {rank}, «{name}». Sei al rango {level}: mancano {xp} punti Necro.',
  'shop.need.rank.long#other': 'Si sblocca al rango {rank}, «{name}». Sei al rango {level}: mancano {xp} punti Necro.',
  // {label} è il nome del traguardo
  'shop.need.feat.short': '{label} · {n}/{goal}',
  // {label} è il nome del traguardo, in minuscolo
  'shop.need.feat.long': 'Traguardo: {label} ({n} su {goal}).',
  'shop.need.graves.short': 'Seppellisci {goal} · {n}/{goal}',
  'shop.need.graves.long#one': 'Si sblocca con {n} sepolture (contano anche quelle affidate all’albero): ne hai {have}.',
  'shop.need.graves.long#other': 'Si sblocca con {n} sepolture (contano anche quelle affidate all’albero): ne hai {have}.',
  // fuochi fatui che mancano (oggi «Mancano» anche per 1)
  'shop.need.wisps.short#one': 'Mancano {n}',
  'shop.need.wisps.short#other': 'Mancano {n}',
  'shop.need.wisps.long#one': 'Costa {cost} fuochi fatui: te ne mancano {n}.',
  'shop.need.wisps.long#other': 'Costa {cost} fuochi fatui: te ne mancano {n}.',
  // titolo sopra l'elenco dei requisiti (più di uno)
  'shop.needs.titleMany': 'Per sbloccarlo serve:',
  // titolo sopra un requisito solo
  'shop.needs.titleOne': 'Per sbloccarlo',

  // ── Bottega: pulsante d'acquisto ──
  // breve: pulsante
  'shop.buy.cta#one': 'Acquista · {n} fuochi fatui',
  'shop.buy.cta#other': 'Acquista · {n} fuochi fatui',
  // breve: pulsante (oggetto gratuito)
  'shop.buy.free': 'Prendilo: è tuo',
  // breve: pulsante spento
  'shop.buy.noFunds': 'Fuochi fatui insufficienti',
  // breve: pulsante spento
  'shop.buy.needRank': 'Serve il rango {n}',
  // breve: pulsante spento
  'shop.buy.needGraves#one': 'Servono {n} tombe (ne hai {have})',
  'shop.buy.needGraves#other': 'Servono {n} tombe (ne hai {have})',
  // breve: pulsante spento
  'shop.buy.owned': 'Già posseduto',
  // breve: pulsante spento, {label} è il nome del traguardo
  'shop.buy.feat': '{label} ({n}/{goal})',
  // breve: pulsante spento, {season} è il periodo in cui si compra
  'shop.buy.season': 'Solo {season}',
  // breve: pulsante, seguito dall'icona del fuoco fatuo
  'shop.buy.ctaShort': 'Compra · {n}',

  // ── Bottega ──
  'shop.title': 'Bottega',
  // etichetta per i lettori di schermo del modale d'acquisto
  'shop.modal.label': 'Acquisto',
  // breve: scheda della Bottega
  'shop.tab.house': 'Casa',
  'shop.house.intro': 'Tetti e aggiunte compaiono subito sulla casa; dalla casa li togli e li rimetti quando vuoi.',
  // {amount} è il saldo già formattato
  'shop.house.introWisps#one': 'Hai {amount} fuochi fatui. Tetti e aggiunte compaiono subito sulla casa; dalla casa li togli e li rimetti quando vuoi.',
  'shop.house.introWisps#other': 'Hai {amount} fuochi fatui. Tetti e aggiunte compaiono subito sulla casa; dalla casa li togli e li rimetti quando vuoi.',
  'shop.intro.preview': 'Sotto ogni oggetto bloccato c’è cosa serve per averlo.',
  'shop.intro.previewWisps#one': 'Hai {amount} fuochi fatui. Sotto ogni oggetto bloccato c’è cosa serve per averlo.',
  'shop.intro.previewWisps#other': 'Hai {amount} fuochi fatui. Sotto ogni oggetto bloccato c’è cosa serve per averlo.',
  'shop.intro.classic#one': 'Hai {amount} fuochi fatui. Gli oggetti grigi richiedono rango, stagione o più fuochi fatui.',
  'shop.intro.classic#other': 'Hai {amount} fuochi fatui. Gli oggetti grigi richiedono rango, stagione o più fuochi fatui.',
  // breve: carta della Bottega, oggetto già tuo
  'shop.card.owned': 'Tuo',
  // riga sotto il nome nel dettaglio: categoria e quanti se ne possono comprare
  'shop.detail.meta.unique': '{category} · pezzo unico',
  'shop.detail.meta.max': '{category} · ne puoi comprare {max}',
  'shop.detail.meta.uniqueOwned': '{category} · pezzo unico · ne hai {owned}',
  'shop.detail.meta.maxOwned': '{category} · ne puoi comprare {max} · ne hai {owned}',
  'shop.detail.unique': 'Pezzo unico',
  'shop.detail.max': 'Max {max}',
  // {season} è il periodo in cui si compra
  'shop.detail.seasonal': 'Stagionale: si compra solo {season}, poi resta tuo per sempre.',
  // {feat} è il nome del traguardo, in minuscolo
  'shop.detail.feat': 'Traguardo: {feat}.',
  'shop.detail.seasonalFeat': 'Stagionale: si compra solo {season}, poi resta tuo per sempre. Traguardo: {feat}.',
  // {amount} sono i fuochi fatui che restano, già formattati
  'shop.detail.afterBuy#one': 'Dopo l’acquisto te ne restano {amount}',
  'shop.detail.afterBuy#other': 'Dopo l’acquisto te ne restano {amount}',
  // breve: pulsante
  'shop.detail.close': 'Chiudi',
  // breve: pulsante
  'shop.detail.cancel': 'Annulla',
  // dopo l'acquisto di un Extra: dove si usa
  'shop.bought.bike': 'È tua! Per salire e scendere tocca l’icona della bici sulla mappa, sopra il mirino.',
  'shop.bought.broom': 'È tua! Per salire e scendere tocca l’icona della scopa sulla mappa, sopra la bici.',
  'shop.bought.mysticStaff': 'È tuo! Per impugnarlo o posarlo tocca l’icona del bastone sulla mappa, in cima alle altre.',
  'shop.bought.item': 'Acquistato: è nell’inventario.',
  // breve: pulsante
  'shop.bought.place': 'Inserisci ora',
  // breve: pulsante
  'shop.bought.continue': 'Continua',

  // ── Inventario ──
  'inventory.title': 'Inventario',
  // breve: scheda
  'inventory.tab.all': 'Tutto',
  // notifica: {item} è il nome dell'oggetto
  'inventory.allPlaced': '{item}: già tutto posato nel cimitero.',
  // breve: sotto la carta, quanti sono nel cimitero
  'inventory.placed#one': '{n} posato',
  'inventory.placed#other': '{n} posati',
  // breve: sotto la carta
  'inventory.stored': 'in magazzino',
  'inventory.empty': 'Niente qui. Passa dalla Bottega!',
  'inventory.owned': 'Ne hai {n}',
  // breve: pulsante
  'inventory.sell#one': 'Vendi · +{n} fuochi fatui',
  'inventory.sell#other': 'Vendi · +{n} fuochi fatui',
  // breve: pulsante
  'inventory.place': 'Inserisci',
  // breve: pulsante (sotto, in piccolo, il guadagno: inventory.sellGain)
  'inventory.sellLabel': 'Vendi',
  // sotto «Vendi», accanto all'icona del fuoco fatuo
  'inventory.sellGain': '+{n}',

  // ── Scheda della tomba ──
  // ricordi nella cronologia della tomba
  'detail.memory.burial': 'Sepoltura',
  'detail.memory.flower': 'Fiori',
  'detail.memory.cleaned': 'Pulizia',
  'detail.memory.repaired': 'Riparazione',
  'detail.memory.anniversary': 'Anniversario',
  'detail.memory.ghost': 'Apparizione',
  'detail.memory.blessing': 'Benedizione',
  'detail.memory.zombie': 'Zombie',
  'detail.memory.entrusted': 'Affidato all’albero',
  'detail.grave.title': 'Memoria',
  // titolo per le tombe trovate all'inizio del gioco
  'detail.grave.legacyTitle': 'Lascito del vecchio custode',
  // l'epitaffio tra virgolette
  'detail.epitaph.quoted': '“{text}”',
  // breve: pulsante, {price} è il costo in fuochi fatui
  'detail.grave.repair': 'Ripara ({price})',
  // breve: pulsante
  'detail.grave.clean': 'Pulisci',
  // breve: pulsante
  'detail.grave.renewFlowers': 'Rinnova fiori',
  // breve: pulsante
  'detail.grave.bringFlowers': 'Porta fiori',
  'detail.grave.category': 'Categoria',
  'detail.grave.lived': 'Vissuto',
  'detail.grave.cause': 'Causa',
  'detail.grave.graveType': 'Lapide',
  'detail.grave.state': 'Stato',
  // {state} è lo stato della tomba (es. «Rotta»)
  'detail.grave.stateBroken#one': '{state} (riparare costa {n} fuochi fatui)',
  'detail.grave.stateBroken#other': '{state} (riparare costa {n} fuochi fatui)',
  'detail.grave.memories': 'Ricordi',
  // breve: pulsante che apre le azioni secondarie del dettaglio (fisarmonica)
  'detail.more': 'Altro',
  // breve: voci di «Altro» nel dettaglio della tomba, con l'icona
  'detail.grave.postcard': 'Manda una cartolina',
  'detail.grave.entrust': 'Affida all’albero',
  // in rosso (azione distruttiva)
  'detail.exhume': 'Riesuma',
  // conferma della riesumazione: {name} è l'oggetto sepolto
  'exhume.confirm.title': 'Riesumare {name}?',
  'exhume.confirm.grave': 'Arriva il becchino con la carriola: scava, porta via tutto e il terreno torna libero. La tomba sparisce anche dal registro delle sepolture e non si torna indietro.',
  'exhume.confirm.memory': 'Arriva il becchino con la carriola e lo dissotterra tra le radici. Il ricordo lascia l’albero e il registro delle sepolture, e non si torna indietro.',
  // breve: pulsante della conferma
  'exhume.confirm.ok': 'Riesuma',
  // conferma di «Libera ricordo» (ricordo dell'Albero dei ricordi); il testo è exhume.confirm.memory
  'exhume.free.title': 'Liberare il ricordo di {name}?',
  // breve: pulsante della conferma
  'exhume.free.ok': 'Libera',

  // ── Scheda dell'oggetto ──
  'detail.item.category': 'Categoria',
  'detail.item.condition': 'Condizione',
  'detail.item.broken#one': 'Rotto (riparare: {n} fuochi fatui)',
  'detail.item.broken#other': 'Rotto (riparare: {n} fuochi fatui)',
  'detail.item.dirty': 'Sporco: va pulito',
  'detail.item.ok': 'In ordine — prima o poi avrà bisogno di una pulita',
  'detail.item.light': 'Luce',
  // stato della luce: lampione o lanterna
  'detail.item.lightBroken': 'Guasta',
  'detail.item.lightOn': 'Accesa',
  'detail.item.lightOff': 'Spenta',
  // bar e orto: guadagno di fuochi fatui
  'detail.item.business': 'Incasso',
  'detail.business.closed': 'Chiuso finché non lo ripari',
  // {n} fuochi fatui pronti da riscuotere; tra parentesi quanto rende al giorno e il massimo accumulabile
  'detail.business.ready#one': '+{n} pronto da riscuotere ({min}–{max} fuochi fatui al giorno, fino a {cap})',
  'detail.business.ready#other': '+{n} pronti da riscuotere ({min}–{max} fuochi fatui al giorno, fino a {cap})',
  'detail.business.tomorrow': 'Il prossimo incasso arriva domani ({min}–{max} fuochi fatui al giorno, fino a {cap})',
  'detail.sign.placeholder': 'Scrivi qualcosa…',
  'detail.sign.label': 'Scritta del cartello',
  // breve: pulsante
  'detail.sign.save': 'Salva scritta',

  // ── Profilo e traguardi ──
  'player.title': 'Il Custode',
  // schede della pagina del Custode
  'player.tab.keeper': 'Custode',
  'player.tab.achievements': 'Traguardi',
  // per i lettori di schermo: la matita accanto al nome
  'player.editName': 'Cambia nome',
  // per i lettori di schermo: la spunta che conferma il nome e chiude la tastiera
  'player.saveName': 'Conferma nome',
  // sezione sotto i dati: lo stato del cimitero (recinto e distretti)
  'player.section.cemetery': 'Il tuo cimitero',
  // nome del giocatore se il campo resta vuoto
  'player.defaultName': 'Custode',
  'player.name': 'Nome',
  // breve: pulsante
  'player.customize': 'Modifica aspetto',
  'player.rank': 'Rango',
  // numero e nome del rango
  'player.rank.value': '{level} · {name}',
  'player.xp': 'Punti Necro',
  'player.wisps': 'Fuochi fatui',
  'player.wisps.value#one': '{n} fuochi fatui',
  'player.wisps.value#other': '{n} fuochi fatui',
  'player.prestige': 'Prestigio',
  'player.fence': 'Recinto',
  // {label} è il nome dell'area, {size} il lato in caselle
  'player.fence.value': '{label} · {size}×{size}',
  'player.fence.unlocked': '{label} · {size}×{size} — sbloccato fino a {max}×{max}: si amplia da Impostazioni › Terreno',
  // {n} è il prestigio che manca
  'player.fence.next#one': '{label} · {size}×{size} — prossima area a {prestige} di prestigio (mancano {n})',
  'player.fence.next#other': '{label} · {size}×{size} — prossima area a {prestige} di prestigio (mancano {n})',
  'player.districts': 'Distretti',
  'player.districts.none': 'Nessuno (4 tombe coerenti vicine)',
  // in testa alla scheda dei traguardi
  'player.achievements': '{got} traguardi su {total}',
  'player.tier.gold': 'Oro',
  'player.tier.silver': 'Argento',
  'player.tier.bronze': 'Bronzo',

  // ── Impostazioni ──
  'settings.title': 'Impostazioni',
  // schede delle Impostazioni
  'settings.tab.game': 'Gioco',
  'settings.tab.graphics': 'Grafica',
  'settings.tab.save': 'Dati',
  'settings.tab.info': 'Info',
  // compare solo quando c'è almeno una traduzione; i nomi delle lingue restano nella loro lingua
  'settings.language': 'Lingua',
  'settings.section.terrain': 'Terreno',
  'settings.quality': 'Qualità',
  // breve: pulsanti della qualità grafica
  'settings.quality.auto': 'Auto',
  'settings.quality.low': 'Bassa',
  'settings.quality.medium': 'Media',
  'settings.quality.high': 'Alta',
  'settings.quality.autoHint': 'Auto sceglie Bassa, Media o Alta in base al dispositivo, e scende di livello se il gioco rallenta.',
  'settings.theme': 'Tema',
  // breve: pulsanti del tema
  'settings.theme.auto': 'Auto',
  'settings.theme.light': 'Chiaro',
  'settings.theme.dark': 'Scuro',
  'settings.fps': 'Fluidità',
  // breve: pulsanti della fluidità
  'settings.fps.auto': 'Auto',
  'settings.fps.30': '30 FPS',
  'settings.fps.60': '60 FPS',
  'settings.fps.autoHint': 'Auto: 60 FPS in Alta, 30 in Media e Bassa. A 30 il telefono consuma meno batteria.',
  'settings.fps.30Hint': 'Consuma meno batteria e scalda meno il telefono.',
  'settings.fps.60Hint': 'Più fluido, ma consuma più batteria.',
  'settings.time': 'Ora del giorno',
  // breve: pulsanti dell'ora del giorno («Reale» = l'ora del telefono)
  'settings.time.auto': 'Reale',
  'settings.time.day': 'Giorno',
  'settings.time.dusk': 'Sera',
  'settings.time.night': 'Notte',
  'settings.edgeBlur': 'Sfocatura ai bordi',
  'settings.weather': 'Effetti meteo',
  'settings.debug': 'Statistiche tecniche',
  'settings.section.notifications': 'Notifiche',
  'settings.reminders': 'Promemoria',
  'settings.reminders.app': 'Un avviso il giorno di ogni anniversario (si festeggia solo aprendo il gioco quel giorno) e la sera prima che una tomba trascurata si rompa.',
  'settings.reminders.browser': 'Nel browser niente notifiche: nell’app arriva un avviso il giorno di ogni anniversario e la sera prima che una tomba trascurata si rompa. Il cimitero si aggiorna comunque quando lo riapri.',
  'settings.section.backup': 'Backup',
  // breve: pulsante
  'settings.backup.export': 'Esporta',
  // breve: pulsante
  'settings.backup.import': 'Importa',
  // titolo della finestra mentre si prepara il file
  'settings.backup.exporting': 'Preparo il backup…',
  'settings.backup.exportingText': 'Raccolgo il cimitero e le foto in un unico file.',
  // titolo: il file è pronto
  'settings.backup.exported': 'Backup esportato',
  // {file} è il nome del file, {size} il peso (es. «28 kB»)
  'settings.backup.exportedText': 'Ho salvato {file} ({size}) nei download del browser. Conservalo: serve per riprendere la partita su un altro dispositivo.',
  // titolo
  'settings.backup.exportFailed': 'Esportazione non riuscita',
  // titolo della finestra mentre si legge il file scelto
  'settings.backup.reading': 'Leggo il backup…',
  // {file} è il nome del file scelto
  'settings.backup.readingText': 'Controllo {file}.',
  // titolo della conferma prima di sostituire la partita
  'settings.backup.confirm.title': 'Caricare questo backup?',
  // {name} è il nome del Custode nel backup, {date} il giorno dell'esportazione
  'settings.backup.confirm.textDate': 'È il cimitero di {name}, esportato il {date}. La partita attuale verrà sostituita: se ti serve, esportala prima.',
  // {name} è il nome del Custode nel backup (backup vecchi, senza data)
  'settings.backup.confirm.text': 'È il cimitero di {name}. La partita attuale verrà sostituita: se ti serve, esportala prima.',
  // breve: pulsante
  'settings.backup.confirm.ok': 'Carica',
  // titolo della finestra mentre si carica
  'settings.backup.importing': 'Carico il backup…',
  'settings.backup.importingText': 'Ripristino il cimitero e le foto.',
  // titolo: caricamento riuscito
  'settings.backup.restored': 'Backup caricato',
  // {name} è il nome del Custode
  'settings.backup.restoredText': 'Bentornato, {name}: il tuo cimitero è com’era al momento del backup.',
  // titolo: il file non si è potuto caricare
  'settings.backup.importFailed': 'Il backup non si carica',
  // segue il motivo dell'errore
  'settings.backup.importHint': 'Scegli il file .necro3d esportato da Necrothing (va bene anche dentro uno zip).',
  // quando l'errore non ha un messaggio
  'settings.backup.error': 'Si è verificato un errore.',
  'settings.info': 'Necrothing 3D · prototipo procedurale (Three.js). Tutti i modelli sono generati dal codice. Scorciatoie: WASD muovi · E interagisci · C vista · V stile.',
  // breve: pulsante (pagina di prova con tutti i modelli)
  'settings.assetGallery': 'Galleria asset',
  // breve: pulsante, e titolo della conferma
  'settings.newGame': 'Nuova partita',
  'settings.newGame.confirm': 'Ricominciare da capo? Il cimitero attuale andrà perso.',
  // breve: pulsante della conferma
  'settings.newGame.ok': 'Ricomincia',
  // notifica
  'settings.newGame.done': 'Un nuovo cimitero ti aspetta.',
  // versione del gioco in fondo alle impostazioni
  'settings.build.dev': 'Versione di sviluppo',
  // {commit} è il codice della versione, {when} data e ora già formattate
  'settings.build.version': 'Versione {commit} · {when}',

  // ── Foto del cimitero ──
  'photo.title': 'Foto del cimitero',
  'photo.intro': 'Inquadra la scena con il rettangolo: trascina gli angoli per allargarlo o stringerlo, trascina l’interno per spostarlo. Il pulsante tondo scatta. La foto è in bianco e nero, come i ricordi migliori.',
  // breve: pulsante
  'photo.start': 'Inizia',
  // notifica
  'photo.galleryUnavailable': 'Galleria non disponibile in questo browser.',
  'photo.result.title': 'La tua foto',
  // testo alternativo dell'immagine
  'photo.result.alt': 'Foto del cimitero',
  // notifica
  'photo.deleted': 'Foto eliminata.',
  // breve: pulsante
  'photo.delete': 'Elimina',
  // breve: pulsante
  'photo.share': 'Condividi',
  // breve: pulsante
  'photo.save': 'Salva',

  // ── Galleria ──
  'gallery.title': 'Galleria',
  'gallery.empty': 'Nessuna foto, per ora. Usa “Foto” dalla bolla delle azioni.',
  // breve: pulsante
  'gallery.back': 'Indietro',
  // breve: pulsante
  'gallery.delete': 'Elimina',
  // breve: pulsante
  'gallery.share': 'Condividi',

  // ── Foto dell'oggetto (passo «Foto» della sepoltura) ──
  // notifica
  'memorial.saveFailed': 'Non riesco a salvare la foto in questo browser.',
  // dentro la cornice vuota
  'memorial.noPhoto': 'Nessuna foto',
  // notifica
  'memorial.badImage': 'Questa immagine non si apre.',
  'memorial.hint.swipe': 'Scorri sulla foto per cambiare filtro.',
  'memorial.hint.optional': 'Una foto dell’oggetto, per ricordarlo com’era. È facoltativa.',
  // etichette per i lettori di schermo delle frecce
  'memorial.filter.prev': 'Filtro precedente',
  'memorial.filter.next': 'Filtro successivo',
  // breve: pulsante (c'è già una foto)
  'memorial.retake': 'Rifai',
  // breve: pulsante
  'memorial.take': 'Scatta',
  // breve: pulsante (c'è già una foto)
  'memorial.another': 'Altra foto',
  // breve: pulsante
  'memorial.fromGallery': 'Dalla galleria',

  // ── Filtri della foto ──
  // breve: nome del filtro sotto la foto
  'filter.none': 'Originale',
  'filter.sepia': 'Seppia',
  // bianco e nero
  'filter.bw': 'B/N',
  'filter.worn': 'Rovinata',

  // ── Cartolina funebre ──
  'postcard.dialog.title': 'Cartolina funebre',
  // testo alternativo dell'immagine
  'postcard.dialog.alt': 'Cartolina per {name}',
  // breve: pulsante
  // breve: pulsante
  'postcard.share': 'Condividi',
  // notifica (dove non si può condividere, la cartolina si scarica)
  'postcard.saved': 'Cartolina salvata.',
  // sulla cartolina, sopra il nome
  'postcard.inMemoryOf': 'In memoria di',
  // sulla cartolina: causa e categoria
  'postcard.causeCategory': '{cause} · {category}',
  // sulla cartolina: l'epitaffio tra virgolette
  'postcard.epitaph': '“{text}”',
  // sulla cartolina, in fondo, in caratteri gotici
  'postcard.restsAt': 'Riposa a Necrothing',
  // sulla cartolina, sotto «Riposa a Necrothing»
  'postcard.tagline': 'il cimitero degli oggetti',
  // testo che accompagna la cartolina condivisa
  // ── Scheda del defunto (tomba, ricordo, Registro) ──
  // pillola sotto il nome: dove riposa
  'deceased.where.grave': 'Riposa nel cimitero',
  'deceased.where.legacy': 'Lascito del vecchio custode',
  'deceased.where.tree': 'Sull’albero dei ricordi dal {date}',
  'deceased.category': 'Categoria',
  'deceased.lived': 'Vissuto',
  // senza data di nascita
  'deceased.died': 'Morto il {date}',
  'deceased.cause': 'Causa',
  'deceased.buried': 'Sepolto',
  'deceased.buriedLegacy': 'Prima del tuo arrivo',
  'deceased.stone': 'Lapide',
  'deceased.stoneGone': '{type} (fino al {date})',
  'deceased.state': 'Stato',
  'deceased.ghosts': 'Apparizioni',
  'deceased.ghostsSeen#one': 'Il suo fantasma è passato una volta',
  'deceased.ghostsSeen#other': 'Il suo fantasma è passato {n} volte',
  'deceased.ghostsNone': 'Il suo fantasma non si è ancora visto',
  'deceased.log': 'Cronologia',
  'deceased.logMore#one': 'e un ricordo più vecchio',
  'deceased.logMore#other': 'e altri {n} ricordi più vecchi',
  // breve: pulsante
  'deceased.goGrave': 'Vai alla tomba',
  // breve: pulsante
  'deceased.goTree': 'Vai all’albero',
  // ── Anniversario della morte: corona nella scheda e notifica ──
  // sul nastro della corona: «3° anniversario»
  'anniv.ordinal': '{n}° anniversario',
  'anniv.ago#one': 'Oggi, un anno fa',
  'anniv.ago#other': 'Oggi, {n} anni fa',
  // notifica: chi parla (al posto del nome del personaggio)
  'anniv.note.name': 'Anniversario',
  // notifica: la frase in grande
  'anniv.note.say': 'In memoria',
  'anniv.note.text#one': 'Un anno fa ci lasciava {name}.',
  'anniv.note.text#other': '{n} anni fa ci lasciava {name}.',
  'postcard.shareText': 'In memoria di {name}. Sepolto a Necrothing, il cimitero degli oggetti.',
  'postcard.shareTitle': 'In memoria di {name}',
  // nome del file se il nome dell'oggetto non ha lettere utili (minuscolo, senza spazi)
  'postcard.file.fallback': 'cartolina',
} satisfies Record<string, string>;
