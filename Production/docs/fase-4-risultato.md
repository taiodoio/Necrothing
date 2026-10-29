# Fase 4 — risultato e verifiche

Aggiornato il 29 ottobre 2026. Nuovi elementi UI allineati al catalogo e ai principi di `design-system.html`; l'HTML vive in sviluppo, non entra nella build pubblicata.

## Completato

- Pagina Info con presentazione, badge Beta, accesso alla lettera e ai replay, guida ai comandi, versione/commit, contatto e licenze.
- Ripristinata l'inizializzazione delle icone statiche dell'HTML aggiungendo la classe che ne imposta le dimensioni: HUD, menu, tab e X di chiusura tornano visibili. In Info resta il solo logo, con il badge Beta sovrapposto in basso a destra; la freccia del selettore lingua è centrata.
- Rifiniture successive: logo centrato, focus dei pulsanti con anello continuo, lingua sotto Terreno e Notifiche con tipografia da titolo. Il pulsante del menu mantiene l'icona corretta dopo la galleria.
- Selettore accessibile con lingua del dispositivo, nomi nativi, navigazione da tastiera e scelta salvata fuori dal salvataggio. Il cambio lingua salva prima di ricaricare e avvisa solo se c'è lavoro in corso.
- Dizionari caricati prima dell'avvio, dieci lingue, font Noto CJK locali caricati per la lingua attiva. Le tombe narrative e il nome predefinito del Custode seguono la lingua; i testi scelti dal giocatore restano invariati.
- Replay della lettera, delle spiegazioni e del tutorial senza cambiare la partita o ridare ricompense.
- Eliminati gli interruttori dell'interfaccia precedente, il relativo modulo, le icone pixel di riserva, le cornici `border-image` e i pacchetti Pixelify/Jacquard. Le classi richieste dal tema sono statiche in `index.html` e `design-system.html`.
- Aggiornati README, documenti di distribuzione, ingresso e Capacitor. La sincronizzazione del CMS non modifica l'originale: la copia aggiornata è `docs/(Fase 4).xlsx`.

## Esito verifiche

| Controllo | Esito |
|---|---|
| `npm run typecheck` | PASS |
| `npm test` | PASS — 146/146 |
| `node scripts/i18n-check.mjs --count` | PASS — 0 |
| `npm run build` | PASS |
| `npm run build:beta` | PASS |
| Browser desktop: scheda Info, testo email, `mailto:` con versione e lingua, finestra licenze | PASS — nessun errore JavaScript; 13 licenze runtime caricate |
| Browser desktop: icone statiche, logo/Beta e allineamento della freccia lingua | PASS — icone dimensionate; il nome testuale è rimosso; badge sovrapposto; freccia centrata |
| Browser desktop: ultime rifiniture | PASS — logo centrato; ordine Terreno, Notifiche, Lingua; icona menu invariata chiudendo Galleria |
| Browser desktop: pagina `design-system.html` in sviluppo | PASS — caricamento senza errori e campione dropdown presente |
| Browser desktop: avvio giapponese e caricamento dei font locali | PASS — lingua `ja`; 11 file richiesti, tutti subset giapponesi o latino; nessun errore |
| Confronto visivo sistematico con tutte le schermate A0 | Non completato pixel per pixel; le schermate di riferimento sono in `/tmp/shots-before/` |
| iOS/Android, WKWebView/Android WebView | Da provare sul dispositivo |

## Misure e limiti

- `dist/`: circa **48 MB**, contro i circa 3,7 MB prima di aggiungere i font CJK. I caratteri sono locali e offline; per coprire tutte e quattro le lingue si distribuiscono tutti i pacchetti Noto, poi il browser carica quelli della lingua attiva. Questa è la principale crescita del pacchetto.
- Il browser ha verificato il collegamento `mailto:` e la schermata delle licenze. L'apertura dell'app email, gli appunti nativi e il funzionamento senza rete in Capacitor dipendono dalla verifica su iOS e Android.
- Le traduzioni nuove non ancora presenti nel workbook usano il fallback inglese; il file Fase 4 elenca le righe nuove da tradurre nel foglio condiviso. Le traduzioni esistenti non sono state riviste da madrelingua.
- Il testo beta dei contatti resta esattamente: «Hai trovato un problema o vuoi condividere un suggerimento? Scrivimi.» Nessun invito commerciale è mostrato.

## Prove da fare su dispositivo

1. In modalità aereo, avviare l'app in italiano, giapponese, cinese semplificato, cinese tradizionale e coreano; controllare glifi, splash, pulsanti e testo scritto dal giocatore.
2. Cambiare lingua senza azioni in corso e verificare che il gioco torni alle Impostazioni; riprovare durante Modifica, posizionamento, cortile e modalità foto e confermare che i progressi restino intatti.
3. Aprire Contatti: verificare `mailto:` e copia email negli appunti, poi Note legali e licenze senza rete.
4. Con notch e barre di sistema, controllare gli spazi sicuri, i bersagli touch e lo scorrimento della pagina Info e dei modali.
5. Ripetere lettera, spiegazioni e tutorial; controllare che XP, fuochi fatui, inventario e stato della partita non cambino.
