// Testi italiani: game.

export default {
  // ── Regole: errori comuni ──
  'rules.grave.missing': 'Tomba inesistente.',
  'rules.placeable.missing': 'Oggetto inesistente.',
  'rules.grave.broken': 'La tomba è rotta: va prima riparata.',

  // ── Regole: recinto ──
  'rules.expansion.invalid': 'Ampiezza non valida.',
  // {area}: nome dell'ampiezza del recinto (es. «Ala orientale»)
  'rules.expansion.locked': '«{area}» si sblocca con {prestige} di prestigio.',
  'rules.expansion.outsideOne': 'C’è ancora un elemento fuori dall\'area: spostali o rimettili in inventario.',
  'rules.expansion.outsideMany': 'Ci sono ancora {n} elementi fuori dall\'area: spostali o rimettili in inventario.',
  // {w}×{h}: misure del recinto in celle
  'rules.expansion.grow': 'Il recinto si allarga: {area}, {w}×{h}.',
  'rules.expansion.shrink': 'Il recinto si stringe: {area}, {w}×{h}.',

  // ── Regole: modulo di sepoltura ──
  // sotto i campi del modulo di sepoltura
  'rules.draft.nameMissing': 'Dai un nome al defunto.',
  'rules.draft.maxChars': 'Massimo {max} caratteri.',
  'rules.draft.categoryMissing': 'Scegli una categoria.',
  'rules.draft.deathDateMissing': 'Indica la data del trapasso.',
  'rules.draft.deathDateFuture': 'Non si seppellisce il futuro.',
  // nascita dopo la morte: tono ironico
  'rules.draft.bornAfterDeath': 'Nato dopo essere morto? Sospetto.',
  'rules.draft.customCauseMissing': 'Scrivi la causa del decesso.',
  'rules.draft.causeMissing': 'Scegli una causa.',
  'rules.draft.graveTypeMissing': 'Scegli una lapide.',

  // ── Regole: sepoltura ──
  'rules.bury.abstractToday': 'Hai già seppellito una cosa astratta oggi. Torna domani.',
  'rules.bury.rankTooLow': 'Questa lapide richiede un rango più alto.',
  // limite della Demo (versione gratuita futura; mai nella beta): {n} tombe proprie, quelle del vecchio custode non contano
  'rules.bury.demoLimit': 'In questa versione il cimitero accoglie fino a {n} tombe tue.',
  'rules.bury.noSpace': 'Spazio non disponibile: servono 2×2 celle libere.',
  // {name}: nome dell'oggetto sepolto
  'rules.bury.done': '{name} riposa in pace.',

  // ── Regole: cura delle tombe ──
  'rules.flowers.dirty': 'La tomba è sporca: va prima pulita.',
  'rules.flowers.fresh': 'I fiori sono ancora freschi.',
  'rules.flowers.done': 'Hai portato fiori.',
  'rules.clean.already': 'È già in ordine.',
  'rules.clean.done': 'Lapide pulita.',
  'rules.repair.nothing': 'Non c’è nulla da riparare.',
  'rules.repair.noFunds': 'Servono {amount} fuochi fatui per riparare.',
  'rules.repair.graveDone': 'Tomba riparata: torna come nuova.',
  // dopo la riesumazione (dal dettaglio, col becchino): la tomba sparisce col suo registro
  'rules.exhume.done': '{name} è stato riesumato: il posto è di nuovo libero.',
  // riesumata subito dopo la sepoltura: la ricompensa della sepoltura torna indietro ({xp} XP, {wisps} fuochi fatui)
  'rules.exhume.doneRevoked': '{name} è stato riesumato appena sepolto: il posto è libero e la sepoltura non conta (−{xp} XP, −{wisps} fuochi fatui).',
  'rules.exhume.memoryDone': '{name} non riposa più tra le radici dell’Albero dei ricordi.',

  // ── Regole: becchino, prete, albero dei ricordi ──
  'rules.priest.blessRound': 'Il prete benedice il cimitero: più fuochi fatui fino a domani.',
  'rules.entrust.noTree': 'Serve l’Albero dei ricordi.',
  'rules.entrust.done': '{name} riposa ora tra le radici dell’Albero dei ricordi.',

  // ── Regole: cura degli oggetti ──
  'rules.cleanItem.broken': 'È rotto: va prima riparato.',
  'rules.cleanItem.already': 'Già lucidato a dovere.',
  'rules.cleanItem.done': 'Ripulito da polvere e ragnatele.',
  'rules.repairItem.done': 'Riparato.',
  'rules.light.notLight': 'Non è una luce.',
  'rules.light.broken': 'È rotto: non si accende.',
  'rules.light.on': 'Acceso.',
  'rules.light.off': 'Spento.',
  'rules.text.notEditable': 'Qui non si scrive.',
  'rules.text.done': 'Scritta aggiornata.',

  // ── Regole: Bottega e inventario ──
  'rules.buy.season': 'Non è la stagione giusta.',
  'rules.buy.rank': 'Serve il rango {rank}.',
  // {feat}: descrizione del traguardo, in minuscolo (es. «la strega deve vendere 30 pozioni»)
  'rules.buy.feat': 'Si sblocca con un traguardo: {feat}.',
  'rules.buy.owned': 'Ne possiedi già uno: è un pezzo unico.',
  // l'oggetto fa parte della versione completa del gioco (accesso commerciale, non lo sblocco col rango)
  'rules.access.full': 'Fa parte della versione completa.',
  // {n}: tombe che servono (contano anche quelle affidate all'albero e riesumate)
  'rules.buy.graves': 'Si sblocca con {n} tombe.',
  'rules.buy.funds': 'Fuochi fatui insufficienti.',
  'rules.buy.noFunds': 'Servono {amount} fuochi fatui per comprarlo.',
  // {item}: nome dell'oggetto comprato
  'rules.buy.done': '{item} nell’inventario.',
  // più pezzi comprati insieme
  'rules.buy.doneMany': '{item} ×{n} nell’inventario.',
  'rules.sell.permanent': 'La Bottega non si vende.',
  'rules.sell.none': 'Non ne possiedi.',
  'rules.sell.done': 'Venduto: +{gain} fuochi fatui.',

  // ── Regole: piazzamento (modalità Modifica) ──
  'rules.place.extra': 'Non si piazza: si usa.',
  'rules.place.noneOwned': 'Non ne hai in inventario.',
  'rules.place.busy': 'Spazio occupato.',
  // scritta iniziale di cartelli e targhe appena posati (il giocatore può cambiarla, max 60 caratteri)
  'rules.place.defaultText': 'Riposa in pace',
  'rules.trace.allBusy': 'Il tracciato passa solo su spazi occupati.',
  // {item}: nome del pezzo in serie (sentiero, staccionata…)
  'rules.trace.done#one': '{item}: {n} posato.',
  'rules.trace.done#other': '{item}: {n} posati.',
  'rules.move.graveDone': 'Tomba spostata.',
  'rules.move.done': 'Spostato.',
  'rules.rotate.no': 'Non si può ruotare.',
  'rules.store.permanent': 'La Bottega si può solo spostare.',
  'rules.store.done': '{item} riposto nell’inventario.',

  // ── Regole: incassi e campana ──
  'rules.collect.nothing': 'Oggi non c’è ancora niente da riscuotere.',
  'rules.collect.witch#one': 'La strega ha venduto {n} pozione: +{n} fuochi fatui.',
  'rules.collect.witch#other': 'La strega ha venduto {n} pozioni: +{n} fuochi fatui.',
  'rules.collect.done': 'Incasso: +{n} fuochi fatui.',
  'rules.bell.notBell': 'Non è una campana.',
  'rules.bell.broken': 'È rotta: va prima riparata.',
  'rules.bell.already': 'La campana ha già suonato oggi: le anime tornano domani.',
  'rules.bell.rung': 'Din… don… Le anime del cimitero accorrono.',

  // ── Regole: raccolta e presenze ──
  // breve: compare accanto al fuoco fatuo raccolto
  'rules.wisp.collected': '+1 fuoco fatuo',
  'rules.ghost.memory': 'Il fantasma di {name} è tornato a trovarti.',
  'rules.ghost.named': 'Il fantasma di {name} ti saluta.',
  'rules.ghost.anon': 'Un’apparizione si dissolve nella nebbia.',
  'rules.cat.met': 'Il gatto nero ti porta fortuna.',
  'rules.rat.met': 'Hai scacciato un topo.',
  'rules.crow.met': 'Il corvo lascia cadere un fuoco fatuo.',
  'rules.zombie.met': 'Hai ricacciato lo zombie nella fossa.',
  'rules.priest.met': 'Il prete benedice il cimitero: più fuochi fatui per un giorno.',
  'rules.gravedigger.cleaned#one': 'Il becchino ripulisce {n} tomba qui intorno.',
  'rules.gravedigger.cleaned#other': 'Il becchino ripulisce {n} tombe qui intorno.',
  'rules.gravedigger.idle': 'Il becchino borbotta e prosegue.',
  'rules.photo.saved': 'Foto salvata in galleria.',

  // ── Regole: casa del Custode ──
  'rules.house.missing': 'Non esiste.',
  'rules.house.owned': 'Ce l’hai già.',
  'rules.house.rank': 'Serve il rango {rank}.',
  'rules.house.funds': 'Servono {cost} fuochi fatui.',
  // {item}: tetto o aggiunta della casa appena comprata
  'rules.house.done': '{item}: fatto!',
  'rules.house.roofNotOwned': 'Questo tetto non ce l’hai.',
  'rules.house.partNotOwned': 'Questa aggiunta non ce l’hai.',

  // ── Traguardi ──
  'ach.firstBurial.name': 'Primo Inquilino',
  'ach.firstBurial.desc': 'Seppellisci il tuo primo oggetto.',
  'ach.fiveGraves.name': 'Piccolo Camposanto',
  'ach.fiveGraves.desc': 'Raggiungi 5 tombe.',
  'ach.tenGraves.name': 'Necropoli in Crescita',
  'ach.tenGraves.desc': 'Raggiungi 10 tombe.',
  'ach.twentyfiveGraves.name': 'Città dei Morti',
  'ach.twentyfiveGraves.desc': 'Raggiungi 25 tombe.',
  'ach.abstractGrief.name': 'Filosofo del Lutto',
  'ach.abstractGrief.desc': 'Seppellisci una cosa astratta.',
  'ach.variety5.name': 'Collezionista di Defunti',
  'ach.variety5.desc': 'Seppellisci oggetti di 5 categorie diverse.',
  'ach.allCategories.name': 'Tuttofare del Trapasso',
  'ach.allCategories.desc': 'Copri tutte le 10 categorie.',
  'ach.florist.name': 'Mano di Fiori',
  'ach.florist.desc': 'Porta fiori su una tomba.',
  'ach.greenThumb.name': 'Pollice Verde',
  'ach.greenThumb.desc': 'Porta fiori 10 volte.',
  'ach.gardenerMaster.name': 'Giardiniere dell’Aldilà',
  'ach.gardenerMaster.desc': 'Porta fiori 50 volte.',
  'ach.caretaker.name': 'Custode Diligente',
  'ach.caretaker.desc': 'Pulisci una lapide.',
  'ach.caretakerSilver.name': 'Mani Operose',
  'ach.caretakerSilver.desc': 'Pulisci 15 volte.',
  'ach.fixer.name': 'Scalpellino',
  'ach.fixer.desc': 'Ripara 5 cose rotte.',
  'ach.haunted.name': 'Notte Infestata',
  'ach.haunted.desc': 'Assisti a un’apparizione.',
  'ach.ghostWhisperer.name': 'Sussurratore di Spettri',
  'ach.ghostWhisperer.desc': 'Assisti a 5 apparizioni.',
  'ach.socialite.name': 'Anima Socievole',
  'ach.socialite.desc': 'Interagisci con 10 presenze erranti.',
  'ach.decorator.name': 'Arredatore Funebre',
  'ach.decorator.desc': 'Posiziona 5 elementi.',
  'ach.spender.name': 'Mecenate dei Morti',
  'ach.spender.desc': 'Spendi 50 fuochi fatui.',
  'ach.photographer.name': 'Ritrattista d’Ombre',
  'ach.photographer.desc': 'Scatta 3 foto del cimitero.',
  'ach.mausoleumBuilt.name': 'Cuore del Cimitero',
  'ach.mausoleumBuilt.desc': 'Costruisci il mausoleo.',
  'ach.districtGothic.name': 'Quartiere Gotico',
  'ach.districtGothic.desc': 'Raggruppa 4 lapidi gotiche vicine.',
  'ach.districtNatural.name': 'Boschetto degli Addii',
  'ach.districtNatural.desc': 'Forma un distretto naturale.',
  'ach.districtTech.name': 'Settore Obsoleto',
  'ach.districtTech.desc': 'Forma un distretto tecnologico.',
  'ach.masterPlanner.name': 'Urbanista del Trapasso',
  'ach.masterPlanner.desc': 'Possiedi i tre distretti insieme.',
  'ach.expansion.name': 'Terra Consacrata',
  'ach.expansion.desc': 'Allarga il recinto per la prima volta.',
  // stesso nome del rango 3
  'ach.rank3.name': 'Becchino del Silicio',
  'ach.rank3.desc': 'Raggiungi il rango 3.',
  // stesso nome del rango 5 (in inglese anche nell'originale)
  'ach.rank5.name': 'Lord of Decay',
  'ach.rank5.desc': 'Raggiungi il rango massimo.',

  // ── Tombe: categorie ──
  'grave.category.electronics': 'Elettronica',
  'grave.category.plants': 'Piante',
  'grave.category.clothing': 'Abbigliamento',
  'grave.category.household': 'Casalinghi',
  'grave.category.toys': 'Giocattoli',
  'grave.category.tools': 'Strumenti',
  'grave.category.vehicles': 'Veicoli',
  'grave.category.expensive': 'Oggetti costosi',
  'grave.category.abstract': 'Cose astratte',
  'grave.category.other': 'Altro',

  // ── Tombe: cause di morte ──
  'grave.cause.plannedObsolescence': 'Obsolescenza programmata',
  'grave.cause.fatalFall': 'Caduta fatale',
  'grave.cause.waterDamage': 'Acqua dove non doveva esserci acqua',
  'grave.cause.purifyingFire': 'Fuoco purificatore',
  'grave.cause.ownerNegligence': 'Negligenza del padrone',
  'grave.cause.catIntervention': 'Intervento del gatto',
  'grave.cause.unsupervisedChild': 'Bambino non supervisionato',
  'grave.cause.mystery': 'Mistero della fede',
  'grave.cause.naturalWear': 'Usura naturale',
  'grave.cause.batteryBetrayal': 'Tradimento della batteria',
  'grave.cause.finalUpdate': 'Aggiornamento software finale',
  'grave.cause.brokenCable': 'Cavo spezzato',
  'grave.cause.eternalBlackScreen': 'Schermo nero eterno',

  // ── Tombe: tipi di lapide ──
  'grave.type.stoneSimple': 'Lapide arrotondata',
  'grave.type.rectangular': 'Lapide rettangolare',
  'grave.type.gothic': 'Lapide gotica',
  'grave.type.celticCross': 'Croce celtica',
  'grave.type.marbleCross': 'Croce in marmo',
  'grave.type.angel': 'Monumento con angelo',
  'grave.type.obelisk': 'Obelisco',
  'grave.type.familyMemorial': 'Memoriale di famiglia',
  'grave.type.decoratedMonument': 'Monumento decorato',
  'grave.type.victorian': 'Lapide vittoriana',

  // ── Tombe: stati ──
  'grave.state.clean': 'In ordine',
  'grave.state.flowers': 'Ricordata con fiori',
  'grave.state.dirty': 'Trascurata',
  'grave.state.broken': 'Rotta: va riparata',

  // ── Fasi del giorno ──
  'time.phase.dawn': 'Alba',
  'time.phase.day': 'Giorno',
  'time.phase.dusk': 'Crepuscolo',
  'time.phase.night': 'Notte',

  // ── Rientro nel gioco (messaggio dopo l'assenza) ──
  'sim.anniversary.todayOne': 'Oggi ricorre l’anniversario di {name}.',
  'sim.anniversary.todayMany': 'Oggi ricorrono {n} anniversari funebri.',
  'sim.anniversary.missedOne': 'Mentre eri via è passato l’anniversario di {name}.',
  'sim.anniversary.missedMany': 'Mentre eri via sono passati {n} anniversari.',
  'sim.gravesBroken#one': '{n} tomba si è rotta: vanno riparate.',
  'sim.gravesBroken#other': '{n} tombe si sono rotte: vanno riparate.',
  'sim.itemsBroken#one': '{n} oggetto si è rotto per l’incuria.',
  'sim.itemsBroken#other': '{n} oggetti si sono rotti per l’incuria.',
  'sim.blessing': 'Il prete è passato a benedire {name}.',
  'sim.flowersWithered': 'Alcuni fiori sono ormai cenere.',
  'sim.gravesDirty#one': '{n} lapide si è sporcata: serve una pulita.',
  'sim.gravesDirty#other': '{n} lapidi si sono sporcate: serve una pulita.',
  'sim.itemsDirty': 'Polvere e ragnatele sugli oggetti del cimitero.',
  'sim.wispsAdded': 'Mentre eri via sono comparsi {n} fuochi fatui.',

  // ── Promemoria (notifiche locali) ──
  // elenco di nomi nel testo delle notifiche: due nomi
  'reminder.list.two': '{a} e {b}',
  // elenco di nomi: i primi due e quanti altri
  'reminder.list.more': '{a}, {b} e altri {n}',
  // breve: titolo di notifica
  'reminder.anniversary.titleOne': 'Oggi è l’anniversario di {name}',
  // breve: titolo di notifica
  'reminder.anniversary.titleMany': 'Oggi ricorrono {n} anniversari',
  'reminder.anniversary.bodyOne': 'Passa al cimitero a ricordarlo: solo oggi.',
  // {names}: elenco dei nomi (reminder.list.*)
  'reminder.anniversary.bodyMany': '{names}: passa al cimitero a ricordarli, solo oggi.',
  // notifica (una sola): più della metà delle tombe è sporca, con le erbacce o rotta; tono gentile, nessuna urgenza
  'reminder.neglect.title': 'Il cimitero ti aspetta',
  'reminder.neglect.body': 'Più della metà delle tombe ha bisogno di una pulita. Quando vuoi, passa a sistemarle.',

  // ── Nuova partita ──
  // nome di default del giocatore
  'state.player.defaultName': 'Custode',
  // le tre tombe narrative dell'introduzione (partita nuova): nome della tomba ed epitaffio
  'state.story.cactus.name': 'Ernesto, il cactus indistruttibile',
  'state.story.cactus.epitaph': 'Va bene che necessitava di poca acqua, però…',
  'state.story.dinner.name': 'La cena di classe',
  'state.story.dinner.epitaph': 'Oh, poi organizziamo. Per me va bene qualsiasi giorno!',
  'state.story.gym.name': 'Da lunedì vado in palestra',
  'state.story.gym.epitaph': 'Ogni domenica risorgeva. Ogni lunedì moriva di nuovo.',
  // lascito del vecchio custode: tombe già presenti a inizio partita (nome dell'oggetto ed epitaffio)
  'state.legacy.walkman.name': 'Walkman',
  'state.legacy.walkman.epitaph': 'Il nastro si è fermato a metà canzone.',
  'state.legacy.succulent.name': 'Pianta grassa',
  'state.legacy.succulent.epitaph': 'Troppo amore, troppa acqua.',
  'state.legacy.phoneBooth.name': 'Cabina telefonica',
  'state.legacy.phoneBooth.epitaph': 'Chiamava. Nessuno rispondeva più.',
  'state.legacy.bike.name': 'Bicicletta rossa',
  'state.legacy.bike.epitaph': 'Ha imparato a stare in equilibrio. Poi più nulla.',
  'state.legacy.moka.name': 'Caffettiera',
  'state.legacy.moka.epitaph': 'Borbottava ogni mattina. Ora tace.',
  'state.legacy.dvdPlayer.name': 'Lettore DVD',
  'state.legacy.dvdPlayer.epitaph': 'Leggeva tutto tranne il nostro cuore.',
  'state.legacy.bunny.name': 'Peluche di coniglio',
  'state.legacy.bunny.epitaph': 'Ha ascoltato ogni segreto.',

  // ── Aspetto del Custode: colori ──
  // colore della pelle
  'look.skin.porcelain': 'Porcellana',
  'look.skin.peach': 'Pesca',
  'look.skin.honey': 'Miele',
  'look.skin.amber': 'Ambra',
  'look.skin.cocoa': 'Cacao',
  'look.skin.ebony': 'Ebano',
  'look.skin.spectral': 'Spettrale',
  'look.skin.lilac': 'Lilla',
  // colore dei capelli (maschile plurale: «capelli neri»)
  'look.hairColor.black': 'Nero',
  'look.hairColor.brown': 'Castano',
  'look.hairColor.copper': 'Rame',
  'look.hairColor.blond': 'Biondo',
  'look.hairColor.white': 'Bianco',
  'look.hairColor.purple': 'Viola',
  'look.hairColor.blue': 'Blu',
  'look.hairColor.pink': 'Rosa',
  // colore di barba e baffi
  'look.beardColor.black': 'Nero',
  'look.beardColor.brown': 'Castano',
  'look.beardColor.copper': 'Rame',
  'look.beardColor.blond': 'Biondo',
  'look.beardColor.grey': 'Grigio',
  'look.beardColor.white': 'Bianco',
  'look.beardColor.purple': 'Viola',
  'look.beardColor.blue': 'Blu',
  'look.beardColor.pink': 'Rosa',
  // colore degli occhi
  'look.eyes.black': 'Nero',
  'look.eyes.brown': 'Castano',
  'look.eyes.blue': 'Blu',
  'look.eyes.green': 'Verde',
  'look.eyes.purple': 'Viola',
  'look.eyes.ruby': 'Rubino',
  // colore del cappello
  'look.hatColor.leather': 'Cuoio',
  'look.hatColor.black': 'Nero',
  'look.hatColor.wine': 'Vinaccia',
  'look.hatColor.moss': 'Muschio',
  'look.hatColor.mud': 'Fango',
  'look.hatColor.night': 'Notte',
  // colore dei vestiti
  'look.outfitColor.leather': 'Cuoio',
  'look.outfitColor.slate': 'Ardesia',
  'look.outfitColor.moss': 'Muschio',
  'look.outfitColor.wine': 'Vinaccia',
  'look.outfitColor.plum': 'Prugna',
  'look.outfitColor.black': 'Nero',
  'look.outfitColor.sand': 'Sabbia',
  // colore dei dettagli (bottoni, sciarpa…)
  'look.accentColor.rust': 'Ruggine',
  'look.accentColor.cream': 'Panna',
  'look.accentColor.cornflower': 'Fiordaliso',
  'look.accentColor.sage': 'Salvia',
  'look.accentColor.mustard': 'Senape',
  'look.accentColor.wisteria': 'Glicine',

  // ── Aspetto del Custode: forme ──
  // tipo di testa (femminile: «testa umana»)
  'look.head.human': 'Umana',
  'look.head.pumpkin': 'Zucca',
  'look.head.skull': 'Teschio',
  'look.head.zombie': 'Zombie',
  // capelli (maschile plurale: «capelli ricci»)
  'look.hair.tufts': 'Ciuffi',
  'look.hair.spiky': 'Spettinati',
  'look.hair.buzz': 'Rasati',
  'look.hair.bob': 'Caschetto',
  'look.hair.long': 'Lunghi',
  'look.hair.fringe': 'Frangia corta',
  'look.hair.fringeLong': 'Frangia lunga',
  'look.hair.side': 'Di lato corti',
  'look.hair.sideLong': 'Di lato lunghi',
  'look.hair.wavy': 'Mossi corti',
  'look.hair.wavyLong': 'Mossi lunghi',
  'look.hair.curly': 'Ricci',
  'look.hair.longcurly': 'Ricci lunghi',
  'look.hair.bun': 'Chignon',
  'look.hair.none': 'Nessuno',
  // cappello
  'look.hat.wide': 'Tesa larga',
  'look.hat.top': 'Cilindro',
  'look.hat.beanie': 'Berretto',
  'look.hat.witch': 'Da strega',
  'look.hat.none': 'Nessuno',
  // vestiti
  'look.outfit.coat': 'Cappotto',
  'look.outfit.cloak': 'Mantella',
  'look.outfit.overalls': 'Salopette',
  'look.outfit.sweater': 'Maglione',
  // occhiali (maschile plurale: «occhiali tondi»)
  'look.glasses.none': 'Nessuno',
  'look.glasses.round': 'Tondi',
  'look.glasses.square': 'Squadrati',
  'look.glasses.monocle': 'Monocolo',
  // barba (femminile)
  'look.beard.none': 'Nessuna',
  'look.beard.short': 'Corta',
  'look.beard.full': 'Folta',
  'look.beard.braid': 'Con treccia',
  // baffi (maschile plurale)
  'look.mustache.none': 'Nessuno',
  'look.mustache.thin': 'Sottili',
  'look.mustache.handlebar': 'A manubrio',
  'look.mustache.bushy': 'Folti',
} satisfies Record<string, string>;
