# Cripte — laboratorio Necrothing

Apri **index.html** con un doppio clic. Il file contiene Three.js, gli stili e tutti i generatori: funziona anche senza connessione e senza avviare un server. Richiede un browser con WebGL.

## I modelli

Cinque famiglie, ciascuna con tre varianti e tre stati: integra, sporca e rotta, per 45 combinazioni. Le varianti condividono l'identità della famiglia, ma hanno volumi, tetti e silhouette differenti. La revisione 5 ha allineato il dettaglio al gioco; il peso è misurato e confrontato con i generatori della Production. La vista **Forme** permette di confrontare le cinque architetture alla stessa scala. Le revisioni precedenti sono conservate nelle cartelle `archivio-v1` fino a `archivio-v6`.

| Famiglia | Architettura |
| --- | --- |
| Zombie | Casetta asimmetrica: tetto storto a fasce ampie, frontone in legno e feritoia laterale |
| Fantasmi | Cubo compatto di pietra chiara, con copertura terrazzata e falce di luna |
| Scheletri | Torre stretta con ali ossarie basse, cella campanaria aperta e coronamento d’ossa |
| Natura | Dolmen basso: tre megaliti, fianchi aperti e lastra irregolare inclinata, avvolta dalle radici |
| Soprannaturale | Reliquiario ottagonale con copertura piramidale a otto facce e cuspide rituale |

| Famiglia | Elementi distintivi |
| --- | --- |
| Zombie | Lavanderia fangosa: bucato solo qui, tinozza con asse per lavare, carriola carica di terra, stivali e pala; percorso sconnesso tra le chiazze di fango |
| Fantasmi | Giardino del ricordo: vasca lunare circolare, panca curva, albero di sonagli, fiori pallidi e candele; sentiero che aggira l’acqua, ingresso senza personaggio |
| Scheletri | Sala prove: marimba d’ossa, batteria, piatto, leggio con spartito e cesta di ricambi; palco a scacchi |
| Natura | Orto spontaneo: aiuola irregolare, cerchio di grandi funghi, tronco cavo, arnia, traliccio vivo e annaffiatoio; percorso di sezioni di legno |
| Soprannaturale | Cortile rituale: sigillo grande al centro, cristallo sospeso, tre menhir incisi, calderone, leggio con libro e pozioni; pedana ottagonale |

Le superfici sporche mostrano umidità, muschio, erbacce, foglie e ragnatele. Ogni cortile si deteriora secondo il suo contenuto: carriola e bucato danneggiati, vasca vuota e panca spezzata, strumenti incompleti, funghi caduti oppure cristallo a terra. Restano i crolli della cripta, le macerie, i recinti spezzati e le luci spente.

Le cripte integre e sporche hanno due ancore di luce, con gli stessi campi e unità di `LightAnchor` del gioco (coordinate in unità di design, portata in unità mondo). Le versioni rotte non hanno sorgenti accese. Nel laboratorio la notte usa `LightMapPainter`, il materiale con mappa di luce, `FireFlicker` e la texture di alone della Production; è una scena di anteprima, non la completa simulazione di `Atmosphere`. Le icone usano le luci puntiformi e l'illuminazione di `bake.ts`, come le anteprime della bottega. Gli ancoraggi sono anche nei metadati del GLB, ma per l'uso nel gioco i generatori devono ancora essere integrati nel catalogo e nel flusso `LPModel.lights`.

La palette deriva da `Production/src/render/lowpoly/palette.ts`: colori desaturati, materiali opachi, colori per faccia, irregolarità deterministiche e geometrie sfaccettate. La varietà delle sagome è intenzionale; il modello degli zombie interpreta una piccola casa funeraria, mentre le altre famiglie hanno volumi differenti.

## Il visualizzatore

- **Quartiere:** le cinque famiglie sullo stesso terreno, collegate da percorsi di pietra. Clicca una cripta nella scena per selezionarla; il pulsante ↻ la ruota di 90°.
- **Forme:** le cinque architetture affiancate alla stessa scala, senza cortili, per confrontarne le sagome. L’esportazione in questa vista comprende solo l’edificio selezionato.
- **Modello:** ispezione della famiglia selezionata. I pulsanti 1–3 selezionano la variante; Integra, Sporca e Rotta cambiano lo stato.
- **Confronto:** i tre stati della famiglia affiancati nella stessa luce e scala.
- **Confronta le 3 varianti:** le tre varianti affiancate nello stato selezionato. Si possono scegliere varianti diverse per le famiglie anche nel quartiere.
- **Giorno / Notte:** cambia la luce della scena.
- **Esporta GLB:** scarica la famiglia, la variante e lo stato selezionati. In Confronto viene esportato lo stato selezionato prima di aprire il confronto. Il file esportato è centrato e senza la rotazione di presentazione.
- Trascina per ruotare la vista, usa la rotella o i tasti +/− per lo zoom. OrbitControls permette anche lo spostamento della camera con il pulsante destro o con due dita.

## Moduli riutilizzabili

Tutti i lotti hanno un ingombro di **4 × 5 celle**, compreso il cortile, con 1 unità Three.js = 1 cella. La cripta occupa la metà posteriore; nella metà anteriore ogni famiglia ha un cortile e un percorso propri, raccordati al cancelletto. Origine al centro del lotto a livello del suolo, fronte verso **+Z**. Le basi possono essere disposte su una griglia, ruotate a multipli di 90° e raccordate con sentieri. Sono proposte autonome: non sono ancora registrate nel catalogo del gioco.

Il generatore esportato da `models.js` è:

```js
import { createCrypt } from './models.js';

const model = createCrypt('zombie', 'dirty');
scene.add(model);

// Seconda variante della stessa famiglia:
const variant = createCrypt('zombie', 'dirty', { variant: 2 });

// Per intervenire sulle singole parti nominate invece che sulle mesh unite:
const editable = createCrypt('skeleton', 'broken', { merge: false });

// Solo l’architettura, senza terreno, recinto e cortile:
const building = createCrypt('zombie', 'clean', { buildingOnly: true });
```

ID famiglie: `zombie`, `ghost`, `skeleton`, `nature`, `supernatural`.
ID stati: `clean`, `dirty`, `broken`.

I modelli condividono i materiali e uniscono le geometrie per ridurre le draw call. Nessuna texture esterna. La versione rotta è un generatore distinto dello stesso modello, non una semplice tinta o una rotazione dell’edificio integro.

## File e rigenerazione

- `index.html`: pagina autonoma pronta da aprire.
- `models.js`: generatori procedurali e terreno modulare.
- `app.js`: scena, controlli, confronto, selezione ed esportazione.
- `styles.css`, `template.html`: sorgenti della pagina.
- `immagini/`: rendering effettivi WebGL, tavole dei tre stati e confronti delle varianti.
- `icone-bottega/`: 15 anteprime WebP 320 × 320 con trasparenza, luce notturna e zolla, una per variante integra. I prototipi e le icone non sono ancora integrati nel catalogo del gioco.
- `verification.json`: risultati delle verifiche sui modelli e sul visualizzatore.
- `polygon-report.md`: confronto prima/dopo e con Bottega, case e mausoleo del gioco, inclusi tutti gli stati e le componenti.
- `polygon-report.json`, `polygon-report.csv`: conteggi di triangoli, vertici, buffer e draw call per analisi successive.
- `polygon-baseline.json`: misure della revisione 4 prima della semplificazione.
- `polygon-audit.mjs`: ripete il conteggio dai generatori effettivi, leggendo la Production senza modificarla.
- `THREE-LICENSE.txt`: licenza MIT di Three.js, incluso nella pagina.

Per rigenerare l’HTML dalle sorgenti, dalla radice del repository:

```sh
node Cripte-Lab/build.mjs
node Cripte-Lab/polygon-audit.mjs
```

Il solo processo di rigenerazione usa le dipendenze già installate in `Production/node_modules`; non installa pacchetti e non modifica `Production`. L’HTML risultante funziona da solo. `render-previews.mjs` rigenera le immagini; `render-shop-icons.mjs` genera le icone; `verify.mjs` verifica geometrie, ingombri, controlli, esportazione e viewport mobile usando Playwright già presente nel repository.
