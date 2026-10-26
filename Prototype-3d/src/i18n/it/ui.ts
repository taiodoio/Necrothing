// Testi italiani: ui.

export default {
  // ── Pagina (testi fissi dell'HTML) ──
  // titolo della scheda del browser
  'page.title': 'Necrothing — Cimitero degli oggetti',
  // titolo della pagina di misura delle prestazioni (solo per sviluppo)
  'page.bench.title': 'Necrothing — misura delle prestazioni',
  // descrizione per i motori di ricerca e le anteprime dei link
  'page.description': 'Necrothing — il cimitero degli oggetti morti, in voxel.',
  // per i lettori di schermo: tutta l'area di gioco
  'page.main.aria': 'Cimitero di Necrothing',
  // per i lettori di schermo: la scena 3D
  'page.world.aria': 'Scena di gioco 3D',
  // per i lettori di schermo: il riquadro in alto a sinistra col nome del Custode
  'page.player.aria': 'Profilo del custode',
  // segnaposto del nome prima che il gioco carichi
  'page.hud.name': 'Custode',
  // segnaposto del rango prima che il gioco carichi
  'page.hud.rank': 'Rango 1',
  // segnaposto sotto l'orologio prima che il gioco carichi
  'page.hud.weather': 'Notte',
  // banner in alto in modalità Modifica (interfaccia classica)
  'page.edit.banner': 'Modifica — tocca un elemento, trascinalo per spostarlo',
  // breve: pulsante del banner di Modifica
  'page.edit.done': 'Fine',
  // per i lettori di schermo: pulsante che centra la vista sul Custode
  'page.recenter.aria': 'Centra sul custode',
  // per i lettori di schermo: il menù di gioco in basso
  'page.bubble.aria': 'Azioni',
  // per i lettori di schermo: il pulsante tondo che apre il menù (interfaccia classica)
  'page.fab.aria': 'Apri azioni',
  // per i lettori di schermo: il pulsante di scatto della foto
  'page.photo.shoot': 'Scatta',
  // breve: suggerimento nella barra della foto
  'page.photo.hint': 'Sposta gli angoli',

  // ── Menù di gioco ──
  // breve: voce del menù (sotto l'icona)
  'menu.bury': 'Seppellisci',
  // breve: voce del menù (sotto l'icona)
  'menu.edit': 'Modifica',
  // breve: voce del menù (sotto l'icona)
  'menu.inventory': 'Inventario',
  // breve: voce del menù (sotto l'icona)
  'menu.shop': 'Bottega',
  // breve: voce del menù (sotto l'icona)
  'menu.photo': 'Foto',
  // breve: voce del menù (sotto l'icona)
  'menu.gallery': 'Galleria',
  // breve: voce del menù (sotto l'icona); anche il nome dell'ingranaggio
  'menu.settings': 'Impostazioni',
  // per i lettori di schermo: il pulsante che apre il menù (interfaccia nuova)
  'menu.fab.aria': 'Menù',

  // ── HUD ──
  // sotto il nome del Custode
  'hud.rank': 'Rango {level} · {name}',
  // sotto il nome del Custode, all'ultimo rango
  'hud.rankMax': 'Rango {level} · {name} ★',
  // per i lettori di schermo: il saldo
  'hud.wispsAria': '{n} fuochi fatui',
  // sotto l'orologio: fase del giorno e meteo
  'hud.phaseWeather': '{phase} · {weather}',
  'hud.weather.clear': 'Sereno',
  'hud.weather.fog': 'Nebbia',
  'hud.weather.rain': 'Pioggia',
  'hud.weather.storm': 'Temporale',
  // unisce due pezzi di una riga (stato · altro stato, guadagni…)
  'hud.join': '{a} · {b}',
  // per i lettori di schermo: pulsante per tornare umano quando il Custode è un pipistrello
  'hud.bat.aria': 'Torna Custode',
  // per i lettori di schermo: pulsante della bicicletta
  'hud.bike.dismount': 'Scendi dalla bici',
  'hud.bike.mount': 'Sali in bici',
  // per i lettori di schermo: pulsante della scopa volante
  'hud.broom.dismount': 'Scendi dalla scopa',
  'hud.broom.mount': 'Sali sulla scopa',
  // per i lettori di schermo: pulsante del bastone mistico
  'hud.staff.put': 'Posa il bastone mistico',
  'hud.staff.take': 'Impugna il bastone mistico',
  // banner di Modifica, interfaccia nuova (breve: deve stare intero sul telefono)
  'hud.edit.banner': 'Tocca un elemento e trascinalo',

  // ── Barra di posizionamento ──
  // tracciando sentieri e recinti, prima di cominciare
  'hud.trace.hint': 'Trascina il dito sul terreno per tracciare: quando giri, il tracciato piega da solo. Due dita spostano la vista.',
  // tracciando: pezzi pronti da posare
  'hud.trace.ok': '{n} da posare',
  // tracciando: pezzi che non si hanno
  'hud.trace.short': 'ne mancano {n}',
  // tracciando: pezzi su caselle già occupate
  'hud.trace.busy': '{n} su spazi occupati',
  // {what}: cosa c'è (es. «Fango, Lanterna»)
  'hud.trace.busyBy': '{n} su spazi occupati ({what})',
  // breve: pulsante; {cost} è il prezzo in fuochi fatui (segue l'icona)
  'hud.trace.buyShort': 'Compra i {n} mancanti · {cost}',
  // breve: pulsante
  'hud.trace.undo': 'Annulla ultimo tratto',
  // per i lettori di schermo: la X che esce dal tracciamento
  'hud.place.exit': 'Esci',
  // breve: pulsante
  'hud.place.confirm': 'Conferma',
  // breve: pulsante
  'hud.place.rotate': 'Ruota',
  // breve: pulsante, conferma il punto della tomba
  'hud.place.bury': 'Seppellisci qui',
  // titolo della barra quando si sceglie dove seppellire
  'hud.place.graveTitle': 'Dove riposerà {name}?',
  'hud.place.hint': 'Tocca il terreno o trascina per spostare, poi conferma.',
  'hud.place.busy': 'Spazio occupato: scegli un punto libero.',
  // {what}: cosa c'è (es. «Fango»)
  'hud.place.busyBy': 'Qui c’è già: {what}. Scegli un punto libero.',

  // ── Primo avvio ──
  'hud.tutorial.title': 'Benvenuto, Custode.',
  'hud.tutorial.shop': 'Questa è la Bottega: qui compri lampioni, statue, presenze e tutto ciò che serve al cimitero, pagando in fuochi fatui. Toccala per entrare; in Modifica puoi spostarla dove vuoi.',
  'hud.tutorial.graves': 'Il vecchio custode ha lasciato tre tombe trascurate: puliscile e porta loro dei fiori. Tocca il terreno per camminare.',
  // breve: pulsante
  'hud.tutorial.ok': 'Ho capito',

  // ── Menù contestuale (sopra l'oggetto toccato) ──
  // breve: pulsante (nell'interfaccia nuova è solo un'icona, il testo va ai lettori di schermo)
  'ctx.detail': 'Dettagli',
  'ctx.done': 'Fatto',
  'ctx.entrust': 'Affida all’albero',
  'ctx.repair': 'Ripara',
  'ctx.clean': 'Pulisci',
  'ctx.flowers': 'Porta fiori',
  'ctx.flowersRenew': 'Rinnova fiori',
  'ctx.rotate': 'Ruota',
  // rimette l'oggetto nell'inventario
  'ctx.store': 'Riponi',
  'ctx.shop': 'Entra in bottega',
  'ctx.registry': 'Registro delle sepolture',
  'ctx.house': 'Personalizza la casa',
  // l'Albero dei ricordi: apre l'elenco dei ricordi
  'ctx.memories': 'Ricordi',
  'ctx.bell.ring': 'Suona la campana',
  'ctx.light.off': 'Spegni',
  'ctx.light.on': 'Accendi',
  // menù e scheda di bar, orto, angolo della strega: l'incasso pronto
  'ctx.collect#one': 'Riscuoti {n} fuoco fatuo',
  'ctx.collect#other': 'Riscuoti {n} fuochi fatui',
  // per i lettori di schermo: azione con un costo
  'ctx.costAria': '{label} ({cost} fuochi fatui)',
  // sotto il nome della tomba: tipo di lapide e stato
  'ctx.grave.sub': '{type} · {state}',
  // stato di un oggetto, sotto il suo nome
  'ctx.state.broken': 'Rotto',
  'ctx.state.dirty': 'Sporco',
  'ctx.state.lit': 'Acceso',
  'ctx.state.off': 'Spento',
  // stato di una presenza (personaggio comprato in Bottega)
  'ctx.state.presence': 'Presenza',
  'ctx.state.ok': 'In ordine',
  // sotto «Casa del Custode»
  'ctx.registry.sub': '{n} nel registro',
  // sotto «Albero dei ricordi»
  'ctx.tree.sub#one': '{n} ricordo',
  'ctx.tree.sub#other': '{n} ricordi',
  // stato della campana delle anime
  'ctx.bell.ready': 'Pronta a suonare',
  'ctx.bell.rung': 'Ha già suonato oggi',

  // ── Dialoghi ──
  // breve: pulsante di conferma predefinito
  'dialog.ok': 'Conferma',
  // breve: pulsante
  'dialog.cancel': 'Annulla',
  // breve: pulsante che chiude un avviso (es. «Backup esportato»)
  'dialog.gotIt': 'Ok',
  // breve: pulsante; anche per i lettori di schermo sulla X
  'dialog.close': 'Chiudi',

  // ── Numeri abbreviati (saldo nell'HUD) ──
  // separatore delle migliaia (1.250)
  'num.thousandsSep': '.',
  // separatore dei decimali (1,2 mln)
  'num.decimalSep': ',',
  // migliaia abbreviate: 125k (breve)
  'num.thousand': '{n}k',
  // milioni abbreviati: 1,2 mln (breve)
  'num.million': '{n} mln',

  // ── Notifiche dei personaggi ──
  // versi a caso, uno per notifica (breve: una parola o due)
  'note.verse.crow': 'Cra! Cra!|Craaa!',
  'note.verse.petCrow': 'Cra!|Cra cra?',
  'note.verse.cat': 'Miao!|Mrrr-miao!|Purr…',
  'note.verse.petCat': 'Miao!|Purr…',
  'note.verse.rat': 'Squit!|Squit squit!',
  'note.verse.zombie': 'Grrraaah!|Uuurgh…|Brrrainz…',
  'note.verse.ghost': 'Uuuuh…|Bu!|Ooooh…',
  'note.verse.ghostRare': 'Uuuuh…|Ooooh…',
  'note.verse.priest': 'Amen.|Pace a voi!',
  'note.verse.gravedigger': 'Ehm…|Mmh, mmh.|Al lavoro!',
  'note.verse.vampire': 'Slurp!|Gnam!',
  'note.verse.witch': 'Eh eh eh!|Abracadabra!',
  'note.verse.gardener': 'Scricch…|Ehilà!|Mmh?',
  'note.verse.petDog': 'Bau!|Bau bau!',
  'note.verse.petRabbit': 'Snif snif!|Hop!',
  'note.verse.petDuck': 'Qua qua!|Quaaa!',
  // il verso di chi non ne ha uno suo
  'note.verse.default': '…',
  // breve: punti guadagnati, accanto al nome
  'note.gainXp': '+{v} XP',

  // ── Registro delle sepolture ──
  'house.ui.registry.title': 'Registro delle sepolture',
  'house.ui.registry.intro': 'Ogni nome che il Custode ha scritto nel libro: dove riposa e da quando.',
  // breve: schede del registro
  'house.ui.registry.tab.all': 'Tutte',
  'house.ui.registry.tab.graves': 'Nel cimitero',
  'house.ui.registry.tab.tree': 'Nell’albero',
  // riga del registro, sotto il nome; {sub} è la categoria
  'house.ui.registry.row.buried': 'sepolto il {date} · {sub}',
  'house.ui.registry.row.legacy': 'lascito del vecchio custode · {sub}',
  'house.ui.registry.row.tree': 'affidato all’albero il {date}',
  // breve: pulsante accanto a ogni riga; anche il titolo della conferma
  'house.ui.registry.locate': 'Localizza',
  // per i lettori di schermo
  'house.ui.registry.locateAria': 'Localizza {name}',
  'house.ui.registry.locate.tree': 'Riposa nell’Albero dei ricordi. Vuoi andarci?',
  'house.ui.registry.locate.grave': 'Vuoi andare al luogo di sepoltura?',
  // breve: pulsanti della conferma
  'house.ui.registry.locate.ok': 'Andiamo',
  'house.ui.registry.locate.cancel': 'Resta qui',
  'house.ui.registry.empty.tree': 'All’albero non hai ancora affidato nessuno.',
  'house.ui.registry.empty.all': 'Il libro è ancora bianco: la prima sepoltura la scriverai tu.',

  // ── Casa del Custode ──
  'house.ui.title': 'Casa del Custode',
  'house.ui.hint': 'Tocca un tetto per cambiarlo, un’aggiunta per toglierla o rimetterla. I vantaggi valgono solo per le aggiunte in vista.',
  'house.ui.perks.on': 'Vantaggi attivi',
  'house.ui.perks.none': 'Nessun vantaggio attivo',
  'house.ui.perks.hint': 'Ogni aggiunta del cortile aiuta un po’ nel gioco: fiori che durano, meno erbacce, riparazioni che costano meno…',
  // breve: sotto la carta di un'aggiunta
  'house.ui.card.shown': 'In vista',
  'house.ui.card.hidden': 'Tolto',
  'house.ui.roof': 'Tetto',
  'house.ui.yard': 'Cortile e casa',
  // notifica: {label} è il nome dell'aggiunta (femminile: «la lanterna»)
  'house.ui.partHidden': '{label} tolta: il suo vantaggio si ferma finché non la rimetti.',
  // notifica: {perk} è la frase del vantaggio
  'house.ui.partShown': '{label} di nuovo in vista. {perk}',
  'house.ui.empty.parts': 'Nessuna aggiunta ancora: lanterne, fioriere, orto e il resto li trovi in Bottega, nella scheda «Casa».',
  'house.ui.empty.all': 'Per ora c’è solo la casa: tetti, lanterne, fioriere, orto e il resto li trovi in Bottega, nella scheda «Casa».',
  // breve: pulsante, apre la Bottega
  'house.ui.more': 'Altre aggiunte',

  // ── Bottega, scheda «Casa» ──
  // breve: carta della Bottega, cosa manca
  'house.ui.need.rankShort': 'Rango {rank}',
  'house.ui.need.rank': 'Si sblocca al rango {rank}, «{name}». Sei al rango {now}: mancano {xp} punti Necro.',
  // breve: carta della Bottega, fuochi fatui che mancano
  'house.ui.need.wispsShort': 'Mancano {n}',
  'house.ui.need.wisps': 'Costa {cost} fuochi fatui: te ne mancano {n}.',
  // breve: carta della Bottega, già comprato
  'house.ui.shop.owned': 'Tuo',
  'house.ui.shop.kindRoof': 'Tetto',
  'house.ui.shop.kindPart': 'Aggiunta della casa',
  // {kind} è «Tetto» o «Aggiunta della casa»
  'house.ui.shop.sub': '{kind} · rango {rank}',
  // l'orto
  'house.ui.shop.subVeggie': '{kind} · rango {rank} · rende fuochi fatui ogni giorno',
  // in grassetto, prima della frase del vantaggio
  'house.ui.shop.perkLabel': 'Vantaggio:',
  // dopo la frase del vantaggio
  'house.ui.shop.perkNote': 'Vale finché l’aggiunta è in vista.',
  'house.ui.shop.cosmetic': 'Solo estetico: cambia l’aspetto della casa.',
  'house.ui.shop.after': 'Dopo l’acquisto te ne restano {n}',
  // breve: pulsante
  'house.ui.shop.has': 'Già tuo',
  'house.ui.shop.notYet': 'Non ancora',
  // breve: pulsante; segue l'icona dei fuochi fatui
  'house.ui.shop.buy': 'Compra · {cost}',
  'house.ui.bought.text': 'È tua: la vedi già sulla casa.',
  // breve: pulsanti dopo l'acquisto
  'house.ui.bought.continue': 'Continua',
  'house.ui.bought.go': 'Vai alla casa',

  // ── Albero dei ricordi ──
  'tree.title': 'Albero dei ricordi',
  'tree.entrust.noTree': 'Per affidare una tomba serve l’Albero dei ricordi (in Bottega, tra le Costruzioni).',
  'tree.entrust.title': 'Affidare all’albero?',
  'tree.entrust.text': 'Il corteo solleverà la bara e la porterà all’Albero dei ricordi, dove la terra la accoglierà tra le radici.',
  'tree.entrust.step1': '✦ La tomba viene tolta: lo spazio torna libero.',
  'tree.entrust.step2': '✦ Il ricordo resta nell’albero, con la sua scheda e la sua storia.',
  'tree.entrust.step3': '✦ Ogni tanto il suo fantasma tornerà a passeggiare vicino all’albero.',
  'tree.entrust.reward': '✦ Come per una sepoltura: +{wisps} fuochi fatui, +{xp} punti Necro.',
  'tree.entrust.final': 'Non si torna indietro: dall’albero non si dissotterra.',
  // breve: pulsante
  'tree.entrust.ok': 'Affida',
  'tree.list.count#one': '{n} ricordo affidato · uno per ogni frutto acceso',
  'tree.list.count#other': '{n} ricordi affidati · uno per ogni frutto acceso',
  'tree.list.none': 'Non gli hai ancora affidato nulla.',
  'tree.list.hint': 'Apri la scheda di una tomba e scegli «Affida all’albero»: il corteo porterà qui la bara e la terra la accoglierà. Lo spazio della tomba si libera, il ricordo resta.',
  // cartellino appeso al ramo: {category} è la categoria dell'oggetto, {date} il giorno in cui è stato affidato
  'tree.list.tag': '{category} · {date}',
  // sul cartellino: quante volte il suo fantasma è tornato
  'tree.list.returned#one': 'tornato una volta',
  'tree.list.returned#other': 'tornato {n} volte',
  'tree.memory.title': 'Ricordo',
  'tree.memory.visit': 'Il fantasma di {name} è tornato a trovarti',
  'tree.memory.visitWisps': '+{n} fuochi fatui',
  'tree.memory.visitXp': '+{n} punti Necro',
  // l'epitaffio tra virgolette
  'tree.memory.epitaph': '“{text}”',
  'tree.memory.rest': 'Riposa tra le radici dell’Albero dei ricordi dal {date}.',
  // scheda del ricordo: etichette a sinistra
  'tree.memory.category': 'Categoria',
  'tree.memory.lived': 'Vissuto',
  'tree.memory.cause': 'Causa',
  'tree.memory.stone': 'Lapide',
  'tree.memory.apparitions': 'Apparizioni',
  // {type} è il tipo di lapide
  'tree.memory.stoneValue': '{type} (nel cimitero fino al {date})',
  // il fantasma è apparso una volta sola
  'tree.memory.visitedOnce': 'Il suo fantasma è passato una volta',
  // il fantasma è apparso più volte (per 1 si usa tree.memory.visitedOnce)
  'tree.memory.visited#other': 'Il suo fantasma è passato {n} volte',
  'tree.memory.notSeen': 'Il suo fantasma non si è ancora visto',
  // titolo della cronologia
  'tree.memory.log': 'Ricordi',
  'tree.memory.ghostNear': 'Apparizione vicino all’albero',
  // breve: pulsante principale della scheda del ricordo, torna alla lista
  'tree.memory.back': 'Indietro',
  // breve: voce di «Altro» nella scheda del ricordo (come «Riesuma» per le tombe: arriva il becchino)
  'tree.memory.free': 'Libera ricordo',

  // ── Personalizzazione del Custode ──
  'look.ui.title': 'Personaggio',
  // notifica
  'look.ui.saved': 'Aspetto salvato.',
  // breve: pulsante
  'look.ui.save': 'Salva',
  // breve: pulsante, torna all'aspetto iniziale
  'look.ui.reset': 'Originale',
  // breve: schede del pannello
  'look.ui.tab.aspetto': 'Aspetto',
  'look.ui.tab.capelli': 'Capelli',
  'look.ui.tab.vestiti': 'Vestiti',
  // titoli delle sezioni
  'look.ui.head': 'Testa',
  'look.ui.skin': 'Pelle',
  'look.ui.eyes': 'Occhi',
  'look.ui.glasses': 'Occhiali',
  'look.ui.cut': 'Taglio',
  'look.ui.beardTitle': 'Barba e baffi',
  'look.ui.outfit': 'Vestito',
  'look.ui.hat': 'Cappello',
  // sottotitoli
  'look.ui.color': 'Colore',
  'look.ui.beard': 'Barba',
  'look.ui.mustache': 'Baffi',
  'look.ui.beardColor': 'Colore di barba e baffi',
  'look.ui.accentColor': 'Colore dei dettagli (sciarpa, righe, toppe)',
  // interruttori: «hoa-boa-hoa» è un gioco di parole, la pelle che brilla
  'look.ui.sparkle': 'Pelle hoa-boa-hoa ✨',
  'look.ui.freckles': 'Lentiggini',
  'look.ui.bandaid': 'Cerotto',
  // suggerimento su un cappello bloccato: {label} è l'impresa, poi il progresso
  'look.ui.hatLocked': '{label} ({have}/{goal})',
  'look.ui.bald.pumpkin': 'Con la testa a zucca capelli, barba, baffi, pelle e occhi non si usano: tornano scegliendo un’altra testa.',
  'look.ui.bald.skull': 'Con la testa a teschio capelli, barba, baffi, pelle e occhi non si usano: tornano scegliendo un’altra testa.',
  'look.ui.styleNote': 'L’aspetto personalizzato si vede nello stile Low-Poly (Impostazioni → Stile).',
  'look.ui.unsaved.title': 'Modifiche non salvate',
  'look.ui.unsaved.text': 'Hai cambiato l’aspetto del Custode senza salvare. Chiudere e perdere le modifiche?',
  // breve: pulsante
  'look.ui.unsaved.stay': 'Resta',

  // ── Ampiezza del recinto ──
  // dimensione del terreno in caselle: 24×24
  'area.size': '{n}×{n}',
  'area.offer.title': 'Nuova area sbloccata',
  'area.offer.grow': 'Il recinto può allargarsi a {size} (ora è {now}).',
  'area.offer.text': 'Il prestigio del tuo cimitero ha guadagnato nuova terra consacrata. Puoi ampliare il recinto adesso, oppure più tardi da Impostazioni › Terreno, dove puoi anche tornare a un recinto più raccolto.',
  // breve: pulsanti
  'area.offer.later': 'Più tardi',
  'area.offer.expand': 'Amplia',
  // per i lettori di schermo: lo slider nelle Impostazioni
  'area.slider.aria': 'Ampiezza del terreno',
  // sopra lo slider: nome dell'area e dimensione
  'area.slider.title': '{label} · {size}',
  'area.next': 'Prossima area: «{label}» con {prestige} di prestigio (ora {now}).',
  'area.all': 'Hai sbloccato tutto il cimitero.',
  'area.release.grow': 'Rilascia per ampliare il recinto.',
  'area.release.shrink': 'Rilascia per stringere il recinto.',
  'area.locked': '«{label}» ({size}) si sblocca con {prestige} di prestigio.',
  'area.shrink.title': 'Elementi fuori dall’area',
  // pezzi di area.shrink.text: le tombe e gli oggetti che restano fuori
  'area.shrink.graves#one': '{n} tomba',
  'area.shrink.graves#other': '{n} tombe',
  'area.shrink.items#one': '{n} oggetto',
  'area.shrink.items#other': '{n} oggetti',
  // tombe e oggetti insieme
  'area.shrink.both': '{graves} e {items}',
  // {what} è «2 tombe», «1 oggetto» o «2 tombe e 1 oggetto»
  'area.shrink.text': 'Nell’area «{label}» ({size}) non entrano {what}. Per stringere il recinto vanno prima spostati dentro l’area o rimessi in inventario.',
  // in fondo all'elenco (mostra solo i primi 8)
  'area.shrink.more': '…e altri {n}',
  'area.shrink.hint': 'Con «OK» torni sulla mappa: l’area scelta è segnata in oro e gli elementi da sistemare sono in rosso. Attiva Modifica per spostarli (le tombe si spostano, gli oggetti si possono anche rimettere in inventario), poi Salva.',
  // breve: pulsante (citato in area.shrink.hint)
  'area.shrink.ok': 'OK',
  // banner in alto durante la riduzione
  'area.banner.title': 'Stringi a «{label}» · {size}',
  'area.banner.leftOne': 'Un elemento è ancora fuori dall’area (in rosso): «Mostra» li trova.',
  // più elementi (per 1 si usa area.banner.leftOne)
  'area.banner.left#other': '{n} elementi sono ancora fuori dall’area (in rosso): «Mostra» li trova.',
  'area.banner.done': 'Tutto dentro: puoi salvare.',
  // breve: pulsanti del banner («Mostra» è citato in area.banner.left)
  'area.banner.edit': 'Modifica',
  'area.banner.show': 'Mostra',
  'area.banner.save': 'Salva',
} satisfies Record<string, string>;
