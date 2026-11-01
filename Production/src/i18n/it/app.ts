// Testi italiani: app.

export default {
  // ── Avvio ──
  // si legge al posto del gioco quando la scena 3D non parte
  'boot.webglFailed': 'La scena non si è aperta. (WebGL non disponibile?).',
  // schermata di caricamento: sulla targa sotto il logo (in maiuscolo; se è lunga si rimpicciolisce per starci)
  'boot.tagline': 'il cimitero degli oggetti',
  // sotto la barra di caricamento
  'boot.percent': '{n}%',
  // per chi usa il lettore di schermo
  'boot.aria': 'Caricamento del cimitero',
  // sotto la barra: una frase per ogni fase del caricamento (aprire, modelli, terreno, luci, fine)
  'boot.step.gate': 'Si apre il cancello…',
  'boot.step.stones': 'Il Custode conta le lapidi…',
  'boot.step.ground': 'Si rastrella il prato…',
  'boot.step.lanterns': 'Si accendono le lanterne…',
  'boot.step.ready': 'Buona veglia, Custode.',

  // ── Backup ──
  'backup.invalidImage': 'Nope! Immagine non valida.',
  'backup.unknownFile': 'Ops! File non riconosciuto come backup Necrothing',
  'backup.corrupt': 'Caspita! Backup corrotto.',
  // il backup viene da una versione del gioco più nuova di questa: importarlo perderebbe dati
  'backup.newer': 'Questo backup viene da una versione più nuova del gioco: aggiorna il gioco e riprova.',
  // all'avvio: il salvataggio non si leggeva; una copia resta da parte, non viene cancellata
  'save.recovered': 'Il salvataggio non si leggeva: ne ho tenuto una copia da parte e si riparte da una partita nuova.',

  // ── Qualità ──
  // breve: livello di qualità grafica (pulsante delle Impostazioni)
  'quality.low': 'Bassa',
  // breve: livello di qualità grafica (pulsante delle Impostazioni)
  'quality.medium': 'Media',
  // breve: livello di qualità grafica (pulsante delle Impostazioni)
  'quality.high': 'Alta',

  // ── Messaggi generali ──
  // la scena 3D si è persa (scheda in background, GPU) e si sta ricaricando
  'game.contextRestoring': 'Solo un attimo, la scena si sta ripristinando…',
  'game.error.generic': 'Qualcosa è andato storto.',
  // breve: numero che vola sul posto dopo un’azione
  'game.reward.xp': '+{n} XP',
  // celebrazione (finestra al centro) di un traguardo o di un nuovo rango
  'celebrate.ach.kicker': 'Traguardo raggiunto',
  'celebrate.rank.kicker': 'Nuovo rango',
  // {n}: il numero del rango
  'celebrate.rank.text': 'Sei salito al rango {n}. Il cimitero ti riconosce un po’ di più.',
  // {what}: «12 oggetti in Bottega e 2 lapidi»
  'celebrate.rank.unlocks': 'Si sbloccano {what}.',
  'celebrate.rank.items#one': '{n} oggetto in Bottega',
  'celebrate.rank.items#other': '{n} oggetti in Bottega',
  'celebrate.rank.stones#one': '{n} lapide',
  'celebrate.rank.stones#other': '{n} lapidi',
  'celebrate.rank.and': ' e ',
  // breve: chiude la celebrazione
  'celebrate.ok': 'Evviva!',
  'game.locate.missing': 'Non si trova più sulla mappa.',
  'game.interact.none': 'Avvicinati a una tomba o a un oggetto.',

  // ── Promemoria ──
  // titolo della finestra dopo la prima sepoltura
  'game.reminders.title': 'Promemoria',
  // {name}: nome dell’oggetto appena sepolto
  'game.reminders.message': 'Vuoi che ti avvisi il giorno dell’anniversario di {name}, e quando una tomba sta per rompersi?',
  // breve: pulsante
  'game.reminders.ok': 'Sì, avvisami',
  // breve: pulsante
  'game.reminders.cancel': 'No, grazie',
  'game.reminders.off': 'Le notifiche sono spente nelle impostazioni del telefono.',

  // ── Recinto e posizionamento ──
  // stringendo il recinto: elementi ancora fuori dall’area scelta
  'game.shrink.missing#one': 'Manca ancora un elemento: quelli in rosso sono fuori dall\'area.',
  'game.shrink.missing#other': 'Mancano ancora {n} elementi: quelli in rosso sono fuori dall\'area.',
  'game.noSpace.grave': 'Non c’è più spazio: allarga il recinto con il prestigio.',
  'game.noSpace.item': 'Non c’è spazio libero per questo oggetto.',
  'game.place.busy': 'Spazio occupato: scegli un punto libero.',
  // in Modifica: l’oggetto trascinato su uno spazio occupato torna dov’era
  'game.move.busy': 'Spazio occupato: torna al suo posto.',
  // conferma della posizione di una tomba o di un oggetto
  'game.place.confirmed': 'Posizionato. Riposi in pace.',
  // {item}: nome dell’oggetto della Bottega
  'game.place.item': '{item} posizionato.',
  // {n}: quanti ne restano in inventario; «Inserisci» è il pulsante dell’inventario
  'game.place.left': 'Te ne restano {n}: “Inserisci” dall’inventario per posarne altri.',
  'game.burial.failed': 'Sepoltura non riuscita.',

  // ── Rito dell’Albero dei ricordi ──
  'game.rite.wait': 'Aspetta che il corteo finisca il rito.',
  'game.rite.needTree': 'Serve l’Albero dei ricordi.',
  'game.rite.busy': 'Aspetta che finisca il rito in corso.',
  // breve: pulsante nella notifica del fantasma di un ricordo
  'game.memory.see': 'Vedi il ricordo',
  // pulsante nelle notifiche (fantasma con nome, anniversario): porta alla scheda della tomba
  'note.seeGrave': 'Vedi la tomba',

  // ── Animali di casa (menù) ──
  // breve: voce del menù dell’animale
  'game.pet.call': 'Raggiungi il Custode',
  // breve: voce del menù dell’animale (interfaccia nuova)
  'game.pet.free': 'Lascialo girare',
  // breve: voce del menù dell’animale
  'game.pet.home': 'A cuccia',
  // breve: voce del menù dell’animale
  'game.pet.pet': 'Accarezza',
  // breve: voce del menù dell’animale
  'game.pet.throw': 'Lancia l’osso',
  'game.pet.throwNoSpace': 'Qui non c’è spazio per lanciare l’osso.',
  // breve: stato dell’animale sotto il nome
  'game.pet.status.free': 'Gira libero',
  // breve: stato dell’animale sotto il nome
  'game.pet.status.follow': 'Ti segue',
  // breve: stato dell’animale sotto il nome
  'game.pet.status.home': 'A cuccia',
  // breve: stato dell’animale sotto il nome
  'game.pet.status.broken': 'Casetta rotta: riparala per farlo uscire',
  // breve: stato dell’animale sotto il nome
  'game.pet.status.homeSleeping': 'A cuccia, dorme',
  // breve: stato dell’animale sotto il nome
  'game.pet.status.denSleeping': 'Dorme in tana',

  // ── Vampiro (menù) ──
  // breve: stato sotto il nome del vampiro
  'game.vampire.status': 'Ha sete, ma è un gentiluomo',
  // breve: stato sotto il nome del vampiro (si vola già)
  'game.vampire.statusBat': 'Sei già un pipistrello',
  // breve: pulsante
  'game.vampire.bite': 'Fatti mordere',

  // ── Extra (bici, scopa, bastone) ──
  'game.bike.notOwned': 'Prima compra la bicicletta in Bottega (Extra).',
  'game.broom.notOwned': 'Prima compra la scopa volante in Bottega (Extra).',
  'game.staff.notOwned': 'Il bastone mistico si sblocca raccogliendo 500 fuochi fatui.',
  // breve: pulsante
  'game.extra.broomOff': 'Scendi dalla scopa',
  // breve: pulsante
  'game.extra.broomOn': 'Sali sulla scopa',
  // breve: pulsante
  'game.extra.staffOff': 'Posa il bastone',
  // breve: pulsante
  'game.extra.staffOn': 'Impugna il bastone',
  // breve: pulsante (scendere dalla bici)
  'game.extra.bikeOff': 'Scendi',
  // breve: pulsante (salire in bici)
  'game.extra.bikeOn': 'Sali in sella',

  // ── Statistiche tecniche (Impostazioni → Statistiche tecniche) ──
  // {fps}: frame disegnati al secondo; {calls}: quante volte il browser chiama il disegno
  'game.debug.fps': 'FPS {fps} · il browser ne offre {calls}/s',
  'game.debug.frameP95': 'tempo frame p95 {ms} ms',
  'game.debug.draw': 'draw calls {calls} · tri {tris}',
  'game.debug.gpuObjects': 'GPU · geometrie {geometries} · texture {textures} · shader {programs}',
  'backup.photos.writeFailed': 'Non è stato possibile aggiornare le foto del backup.',
  'backup.photos.aborted': 'Aggiornamento delle foto del backup interrotto.',
  'game.debug.seed': 'seed {seed} · fase {phase} · meteo {weather}',
  'game.debug.counts': 'tombe {graves} · oggetti {items}',
  'game.debug.presences': 'presenze {roamers}+{presences} · modelli {models}',
  // livello scelto da Auto: {tier} livello attuale, {top} il più alto, {step}/{steps} gradino di risoluzione
  'game.debug.auto': 'auto · {tier} (max {top}) · gradino {step}/{steps}',
  // {extras}: «materiale semplice» e «mondo leggero», se ci sono
  'game.debug.quality': 'qualità {level} · dpr {dpr} · tetto {cap}/{max} FPS · ombre {shadows} · luci {lights}{extras}',
  'game.debug.shadowsOff': 'no',
  'game.debug.shadowsStill': 'ferme',
  'game.debug.shadowsLive': 'vive',
  'game.debug.lightsFake': 'finte',
  'game.debug.lightsReal': 'vere',
  'game.debug.liteMaterials': ' · materiale semplice',
  'game.debug.liteWorld': ' · mondo leggero',

  // ── Il Custode commenta (battuta in grande, frase sotto) ──
  // breve: battuta
  'say.custode.funeral.say': 'Silenzio…',
  'say.custode.funeral.text': 'Il corteo funebre arriva…',
  // breve: battuta (la frase è il messaggio della sepoltura)
  'say.custode.buried.say': 'Riposa in pace.',
  // breve: battuta
  'say.custode.rite.say': 'Addio…',
  'say.custode.rite.text': 'Il corteo arriva per accompagnarlo all’albero…',
  // breve: battuta (la frase è il messaggio dell’affidamento)
  'say.custode.riteDone.say': 'Riposa tra le radici.',
  // breve: battuta, il pipistrello torna Custode
  'say.custode.batEnd.say': 'Puff!',
  'say.custode.batEnd.text': 'Torni Custode. Per volare ancora serve un altro morso.',
  'say.custode.batTimeout.text': 'Il minuto è passato: torni Custode.',
  // breve: battuta
  'say.custode.bikeOn.say': 'Si parte!',
  'say.custode.bikeOn.text': 'In sella: si va al doppio della velocità.',
  // breve: battuta
  'say.custode.bikeOff.say': 'Ecco fatto.',
  'say.custode.bikeOff.text': 'Il Custode scende dalla bici.',
  // breve: battuta
  'say.custode.broomOn.say': 'Si vola!',
  'say.custode.broomOn.text': 'A cavalcioni della scopa: si vola sopra tombe e recinti.',
  // breve: battuta
  'say.custode.broomOff.say': 'Terra!',
  'say.custode.broomOff.text': 'Il Custode atterra e scende dalla scopa.',
  // breve: battuta
  'say.custode.staffOn.say': 'A me!',
  'say.custode.staffOn.text': 'Bastone impugnato: i fuochi fatui accorrono da lontano.',
  // breve: battuta
  'say.custode.staffOff.say': 'Riposo.',
  'say.custode.staffOff.text': 'Bastone posato.',
  // breve: battuta, incasso dell’orto dietro casa
  'say.custode.veggie.say': 'Che raccolto!',
  'say.custode.veggie.text#one': 'L’orto dietro casa rende {n} fuoco fatuo.',
  'say.custode.veggie.text#other': 'L’orto dietro casa rende {n} fuochi fatui.',

  // ── Scheletro giardiniere ──
  // breve: nome nella notifica
  'say.gardener.name': 'Scheletro giardiniere',
  // battute a caso quando lo si tocca (una per voce, separate da |)
  'say.gardener.lines': 'Rastrello le stesse foglie da trent’anni. Non ho fretta.|Queste foglie non finiscono mai… e meno male.|Attento a dove metti i piedi: ho appena rastrellato.|Un tempo avevo i calli. Adesso solo le ossa.',

  // ── Vampiro ──
  // breve: nome nella notifica e nel menù
  'say.vampire.name': 'Vampiro',
  // breve: battuta
  'say.vampire.gone.say': 'Hmpf.',
  'say.vampire.gone.text': 'Il vampiro si è allontanato. Riprova.',
  'say.vampire.bite.text': 'Il vampiro ti morde: ti trasformi in un pipistrello!',

  // ── Becchino in visita ──
  // breve: nome nella notifica
  'say.gravedigger.name': 'Becchino',
  // toccandolo a fine giro; «.home»: torna alla sua casa, «.away»: non ha casa e torna da dove è venuto. {done}: cose ripulite
  'say.gravedigger.done.home': 'Il becchino ha finito il giro ({done} cose ripulite) e torna a casa.',
  'say.gravedigger.done.away': 'Il becchino ha finito il giro ({done} cose ripulite) e torna da dove è venuto.',
  'say.gravedigger.nothing.home': 'Il becchino ha controllato: niente da pulire. Torna a casa.',
  'say.gravedigger.nothing.away': 'Il becchino ha controllato: niente da pulire. Torna da dove è venuto.',
  // toccandolo durante il giro: {done} cose fatte, {left} ancora da fare
  'say.gravedigger.round.home': 'Il becchino fa il giro e ripulisce metà delle cose sporche del cimitero: {done} fatte, ancora {left}. Poi torna a casa.',
  'say.gravedigger.round.away': 'Il becchino fa il giro e ripulisce metà delle cose sporche del cimitero: {done} fatte, ancora {left}. Poi torna da dove è venuto.',
  // notifica a fine giro
  'say.gravedigger.finished#one': 'Ha finito il giro: {n} cosa ripulita.',
  'say.gravedigger.finished#other': 'Ha finito il giro: {n} cose ripulite.',
  // riesumazione: arriva con la carriola, scava e se ne va (la frase sotto è rules.exhume.*)
  'say.gravedigger.exhume.say': 'Al lavoro!',
  'say.gravedigger.exhumed.say': 'Fatto!',

  // ── Prete in visita ──
  // breve: nome nella notifica
  'say.priest.name': 'Prete',
  // toccandolo a fine giro; «.home»: torna al santuario, «.away»: non c’è santuario e torna da dove è venuto
  'say.priest.done.home': 'Il prete ha benedetto il cimitero (più fuochi fatui fino a domani) e torna al santuario.',
  'say.priest.done.away': 'Il prete ha benedetto il cimitero (più fuochi fatui fino a domani) e torna da dove è venuto.',
  // toccandolo durante il giro: {n} tombe che restano
  'say.priest.round.home#one': 'Il prete prega sulle tombe e benedice il cimitero: più fuochi fatui fino a domani. Ancora {n} tomba, poi torna al santuario.',
  'say.priest.round.home#other': 'Il prete prega sulle tombe e benedice il cimitero: più fuochi fatui fino a domani. Ancora {n} tombe, poi torna al santuario.',
  'say.priest.round.away#one': 'Il prete prega sulle tombe e benedice il cimitero: più fuochi fatui fino a domani. Ancora {n} tomba, poi torna da dove è venuto.',
  'say.priest.round.away#other': 'Il prete prega sulle tombe e benedice il cimitero: più fuochi fatui fino a domani. Ancora {n} tombe, poi torna da dove è venuto.',

  // ── Campana delle anime ──
  // breve: nome nella notifica
  'say.souls.name': 'Anime',
  // breve: battuta (rintocchi della campana)
  'say.souls.bell.say': 'Din… don…',
  'say.souls.bell.text': 'Le anime del cimitero accorrono alla campana.',

  // ── Incassi (strega, bar, orto dei cervelli) ──
  // breve: nome nella notifica
  'say.witch.name': 'Strega',
  'say.witch.sold#one': 'Ha venduto {n} pozione ai visitatori.',
  'say.witch.sold#other': 'Ha venduto {n} pozioni ai visitatori.',
  // breve: nome nella notifica
  'say.zombieBar.name': 'Bar degli zombie',
  // breve: battuta (brindisi)
  'say.zombieBar.say': 'Salute!',
  'say.zombieBar.text#one': 'Al bar si è brindato alla tua: {n} fuoco fatuo di incasso.',
  'say.zombieBar.text#other': 'Al bar si è brindato alla tua: {n} fuochi fatui di incasso.',
  // breve: nome nella notifica
  'say.brainFarm.name': 'Orto dei cervelli',
  // breve: battuta
  'say.brainFarm.say': 'Gnam!',
  'say.brainFarm.text#one': 'Gli zombie hanno raccolto cervelli per {n} fuoco fatuo.',
  'say.brainFarm.text#other': 'Gli zombie hanno raccolto cervelli per {n} fuochi fatui.',

  // ── Animali di casa (nome e frasi, una per animale) ──
  // breve: nome dell’animale (sopra il suo menù e nella notifica)
  'pet.dog.label': 'Cane',
  'pet.dog.broken': 'La casetta è rotta: riparala e il cane tornerà fuori.',
  'pet.dog.call': 'Il cane ti raggiunge e ti segue.',
  'pet.dog.home': 'Il cane va a cuccia.',
  'pet.dog.wake': 'Il cane esce a fare un giro.',
  'pet.dog.free': 'Il cane va a zonzo per il cimitero.',
  // l'animale contento porta qualche fuoco fatuo (notifica)
  'pet.dog.gift#one': 'Il cane è super felice! Ti porta un fuoco fatuo.',
  'pet.dog.gift#other': 'Il cane è super felice! Ti porta {n} fuochi fatui.',
  // breve: nome dell’animale
  'pet.cat.label': 'Gatto',
  'pet.cat.broken': 'La casetta è rotta: riparala e il gatto tornerà fuori.',
  'pet.cat.call': 'Il gatto ti raggiunge e ti segue.',
  'pet.cat.home': 'Il gatto va a cuccia.',
  'pet.cat.wake': 'Il gatto esce a fare un giro.',
  'pet.cat.free': 'Il gatto va a zonzo per il cimitero.',
  'pet.cat.gift#one': 'Il gatto fa le fusa, contento: ti porta un fuoco fatuo.',
  'pet.cat.gift#other': 'Il gatto fa le fusa, contento: ti porta {n} fuochi fatui.',
  // breve: nome dell’animale
  'pet.rabbit.label': 'Coniglio',
  'pet.rabbit.broken': 'La casetta è rotta: riparala e il coniglio tornerà fuori.',
  'pet.rabbit.call': 'Il coniglio ti raggiunge e ti segue.',
  'pet.rabbit.home': 'Il coniglio va a cuccia.',
  'pet.rabbit.wake': 'Il coniglio esce a fare un giro.',
  'pet.rabbit.free': 'Il coniglio va a zonzo per il cimitero.',
  'pet.rabbit.gift#one': 'Il coniglio è al settimo cielo! Ti porta un fuoco fatuo.',
  'pet.rabbit.gift#other': 'Il coniglio è al settimo cielo! Ti porta {n} fuochi fatui.',
  // breve: nome dell’animale
  'pet.duck.label': 'Papera',
  'pet.duck.broken': 'La casetta è rotta: riparala e la papera tornerà fuori.',
  'pet.duck.call': 'La papera ti raggiunge e ti segue.',
  'pet.duck.home': 'La papera va a cuccia.',
  'pet.duck.wake': 'La papera esce a fare un giro.',
  'pet.duck.free': 'La papera va a zonzo per il cimitero.',
  'pet.duck.gift#one': 'La papera è felicissima! Ti porta un fuoco fatuo.',
  'pet.duck.gift#other': 'La papera è felicissima! Ti porta {n} fuochi fatui.',
  // breve: nome dell’animale
  'pet.crow.label': 'Corvo',
  'pet.crow.broken': 'La casetta è rotta: riparala e il corvo tornerà fuori.',
  'pet.crow.call': 'Il corvo ti raggiunge e ti segue.',
  'pet.crow.home': 'Il corvo va a cuccia.',
  'pet.crow.wake': 'Il corvo esce a fare un giro.',
  'pet.crow.free': 'Il corvo va a zonzo per il cimitero.',
  'pet.crow.gift#one': 'Il corvo è tutto contento! Ti porta un fuoco fatuo luccicante.',
  'pet.crow.gift#other': 'Il corvo è tutto contento! Ti porta {n} fuochi fatui luccicanti.',
} satisfies Record<string, string>;
