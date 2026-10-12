# Audit di fattibilità: personaggi nello stile "v2" (concept del Custode)

Il concept del Custode ha:
- una testa tonda e grande;
- capelli voluminosi a ciocche che escono dalla sagoma;
- una barba a maschera con la treccia e baffi a manubrio grandi;
- brillantini a stella e occhi grandi e lucidi con il riflesso a stella;
- una giacca con cappuccio e cintura, e stivali tondi.

Ho costruito un **prototipo separato**, fuori dal gioco, per valutarne la fattibilità; al posto della borsa del concept tiene la lanterna.

- Pagina: `proto-custode.html`, solo con `npm run dev`. Non è nella build né collegata al gioco.
- Codice: `src/proto/custodeV2.ts` (modello) e `src/proto/turnaround.ts` (tavola).
- Confronto: `proto-custode.html?v=attuale` mostra il Custode di oggi, con un aspetto simile al concept, nella stessa tavola e con la stessa luce.

![Prototipo v2](../screenshots/proto/custode-v2.png)
![Custode attuale, stessa tavola](../screenshots/proto/custode-attuale.png)

## Verdetto

**Fattibile con la pipeline attuale.** Il prototipo usa lo stesso kit low-poly del gioco: `LP`, materiali a colori per vertice, bucket `glow`, `instantiate`. Usa le stesse primitive, più `RoundedBoxGeometry` di three (già nelle dipendenze). Non servono asset esterni, modellazione in un software 3D né nuove librerie.

Il lavoro vero è **rifare le opzioni di personalizzazione** nel nuovo stile, cioè 8 tagli, 4 cappelli, barbe e vestiti, e **rendere coerenti i PNG** (becchino, prete, dolenti, ecc.). Il motore non è il problema.

## Cosa cambia rispetto a oggi

| Elemento | Oggi | Stile v2 (prototipo) | Impatto |
|---|---|---|---|
| Testa | box arrotondato | ellissoide più tondo e grande | Facile: anzi semplifica, perché la superficie è analitica e non serve la ricerca per bisezione. |
| Capelli | veli aderenti e ciocche sottili | ciocche "a lente" chiuse e gonfie che escono dalla sagoma, a strati (nuca interna/esterna, lati, frangia, ciuffi) | Medio: 8 tagli da rifare. Con il cappello servono varianti "schiacciate". |
| Occhi | iride con riflessi bianchi | grande ovale lucido con riflesso a stella | Facile: un materiale lucido a parte (+1 draw call). |
| Brillantini | stelline a 4 punte e scintille | stelle a 5 punte pastello più grandi | Facile: quasi già pronto. |
| Barba e baffi | velo aderente, manubrio sottile | maschera fino alle orecchie, manubrio grosso con ricciolo | Facile: stessa tecnica, sulla nuova testa. |
| Corpo e vestiti | busto squadrato, braccia sottili | giacca morbida con cappuccio e cintura, braccia a capsula, stivali tondi | Medio: 4 vestiti da rifare. |
| Rig e animazioni | parti separate con perni | uguale, con perni da ricalibrare (testa più pesante, braccia corte) | Basso: verificare camminata, lavoro, preghiera, seduto. |

## Numeri (misurati)

| | Triangoli | Draw call | Tempo di costruzione |
|---|---|---|---|
| Custode attuale, look base | 7.450 | 7 | — |
| Custode attuale, look ricco (ricci lunghi, treccia, manubrio, monocolo, brillantini) | 17.370 | 9 | ~126 ms |
| Prototipo v2 (completo, con lanterna) | 15.600 | 8 | ~38 ms |

Il v2 costa più o meno quanto un look ricco di oggi, ed è più veloce da generare perché la testa è un ellissoide. Diviso nelle parti del rig resterebbe a circa 8–10 draw call. Per il solo Custode non ci sono problemi di prestazioni.

Se anche i PNG passassero al v2 (6–8 in scena, ~10–15k triangoli ciascuno) si arriverebbe a ~100k triangoli di personaggi. Va bene su telefoni medi, ma per quelli economici converrebbe una versione semplificata dei capelli in qualità «Bassa».

## Rischi

1. **Leggibilità alla distanza di gioco.** In gioco la camera è isometrica e lontana: su telefono il Custode è alto pochi decine di pixel. Stelline, riflesso negli occhi e ricciolo dei baffi rischiano di sparire o sfarfallare. Il concept funziona molto in primo piano. *Da verificare con un'opzione sperimentale nel gioco vero, prima di investire su tutte le opzioni.*
2. **Luce.** Gran parte del fascino del concept viene dalla luce da studio: chiave calda, controluce freddo, ombre morbide. In gioco c'è l'atmosfera (giorno, notte, nebbia) e di notte molti dettagli si appiattiscono.
3. **Cappelli e capelli voluminosi.** Più volume vuol dire più conflitti con tesa, cilindro e berretto. Ogni taglio ha bisogno di una variante sotto il cappello, e anche i cappelli vanno ridisegnati per la testa tonda.
4. **Coerenza con il mondo.** Il v2 è più morbido e "giocattolo" del resto (tombe ed edifici gotici low-poly). Insieme probabilmente funziona, ma va guardato in scena.
5. **PNG.** Se cambia solo il Custode, gli altri personaggi sembrano di un altro gioco: il passaggio va pianificato anche per loro.

## Piano proposto (a passi, ognuno valutabile)

1. **Prova in gioco** (1 giro): solo il Custode v2 con il look di base, attivabile con un'opzione sperimentale (es. `?stile=v2`), per vederlo alla distanza vera, di giorno e di notte.
2. **Testa e volto** (1 giro): occhi, bocca, orecchie, barbe, baffi, occhiali, cerotto, lentiggini e brillantini sulla testa tonda.
3. **Capelli** (2–3 giri): gli 8 tagli a ciocche-volume, le varianti sotto il cappello e i 3 cappelli rifatti, con il test "niente capelli sopra la tesa".
4. **Vestiti e corpo** (1–2 giri): cappotto (o giacca con cappuccio), mantella, salopette, maglione, stivali e mani; ricalibrare perni e animazioni.
5. **PNG** (1–2 giri): becchino, prete, dolenti e zombie nello stesso stile; fantasmi e animali solo se serve.

In totale sono 6–9 giri, più o meno quanto la personalizzazione fatta finora. Il passo 1 basta già per decidere se proseguire.

## Cosa del concept non è (ancora) nel prototipo

- L'ombreggiatura morbida "da render", con occlusione ambientale e leggero sottosuolo: nel gioco usiamo facce piatte.
- La borsa: sostituita dalla lanterna, come richiesto.
- Proporzioni e lunghezze delle ciocche sono a occhio e si possono ritoccare.
