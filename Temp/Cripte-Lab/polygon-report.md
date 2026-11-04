# Cripte — geometrie e confronto con il gioco

Conteggi dei generatori effettivi, espressi in **triangoli**. I lotti delle cripte sono 4 × 5 celle e comprendono terreno, recinto e oggetti. La colonna «edificio» li esclude. Il confronto usa le geometrie statiche della Production attuale, variante 0 e semi 0/1; include il degrado standard.

## Riferimenti del gioco

| Modello | Celle | Integro, triangoli | Sporco, triangoli | Rotto, triangoli | Draw stimati, integro |
| --- | --- | ---: | ---: | ---: | ---: |
| Bottega | 3 × 3 | 6.089–6.197 | 8.318–8.327 | 9.537–9.546 | 2 |
| Casa del Custode | 4 × 4 | 4.171–4.362 | 4.171–4.362 | 4.171–4.362 | 2 |
| Casa del becchino | 4 × 3 | 4.751–4.785 | 7.759–7.785 | 8.885–9.053 | 2 |
| Mausoleo | 3 × 3 | 5.196–5.200 | 6.633–6.691 | 6.951–7.041 | 2 |

## Cripte integre: prima e dopo, variante 1

| Famiglia | Edificio attuale | Lotto prima | Lotto dopo | Riduzione | Draw prima → dopo |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cripta degli Zombie | 1.740 | 6.604 | 4.458 | 32.5% | 8 → 2 |
| Cripta dei Fantasmi | 944 | 6.288 | 3.453 | 45.1% | 10 → 2 |
| Cripta degli Scheletri | 2.174 | 11.474 | 6.198 | 46.0% | 7 → 2 |
| Cripta della Natura | 1.520 | 7.182 | 4.952 | 31.0% | 7 → 2 |
| Cripta Soprannaturale | 1.088 | 5.708 | 3.366 | 41.0% | 8 → 2 |

## Tutte le varianti, gli stati e le componenti

| Famiglia | Variante | Stato | Edificio | Recinto | Oggetti | Terreno e percorsi | Degrado aggiunto | Lotto | Vertici nei buffer | Buffer KiB |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cripta degli Zombie | 1: Casetta storta | clean | 1.740 | 984 | 1.066 | 668 | 0 | 4.458 | 13.374 | 470.2 |
| Cripta degli Zombie | 1: Casetta storta | dirty | 1.740 | 984 | 1.066 | 668 | 1.748 | 6.206 | 18.618 | 654.5 |
| Cripta degli Zombie | 1: Casetta storta | broken | 1.696 | 928 | 1.062 | 668 | 2.056 | 6.410 | 19.230 | 676.1 |
| Cripta degli Zombie | 2: Portico e comignolo | clean | 1.848 | 984 | 1.102 | 740 | 0 | 4.674 | 14.022 | 493.0 |
| Cripta degli Zombie | 2: Portico e comignolo | dirty | 1.848 | 984 | 1.102 | 740 | 1.748 | 6.422 | 19.266 | 677.3 |
| Cripta degli Zombie | 2: Portico e comignolo | broken | 1.816 | 928 | 1.098 | 740 | 2.056 | 6.638 | 19.914 | 700.1 |
| Cripta degli Zombie | 3: Ala laterale | clean | 1.936 | 984 | 1.114 | 716 | 0 | 4.750 | 14.250 | 501.0 |
| Cripta degli Zombie | 3: Ala laterale | dirty | 1.936 | 984 | 1.114 | 716 | 1.748 | 6.498 | 19.494 | 685.3 |
| Cripta degli Zombie | 3: Ala laterale | broken | 1.892 | 928 | 1.110 | 716 | 2.056 | 6.702 | 20.106 | 706.9 |
| Cripta dei Fantasmi | 1: Cubo lunare | clean | 944 | 1.048 | 989 | 472 | 0 | 3.453 | 10.359 | 364.2 |
| Cripta dei Fantasmi | 1: Cubo lunare | dirty | 944 | 1.048 | 989 | 472 | 1.748 | 5.201 | 15.603 | 548.5 |
| Cripta dei Fantasmi | 1: Cubo lunare | broken | 876 | 976 | 905 | 472 | 2.056 | 5.285 | 15.855 | 557.4 |
| Cripta dei Fantasmi | 2: Torre del ricordo | clean | 1.084 | 1.048 | 1.061 | 424 | 0 | 3.617 | 10.851 | 381.5 |
| Cripta dei Fantasmi | 2: Torre del ricordo | dirty | 1.084 | 1.048 | 1.061 | 424 | 1.748 | 5.365 | 16.095 | 565.8 |
| Cripta dei Fantasmi | 2: Torre del ricordo | broken | 956 | 976 | 969 | 424 | 2.056 | 5.381 | 16.143 | 567.5 |
| Cripta dei Fantasmi | 3: Loggia degli spiriti | clean | 1.204 | 1.048 | 1.065 | 448 | 0 | 3.765 | 11.295 | 397.1 |
| Cripta dei Fantasmi | 3: Loggia degli spiriti | dirty | 1.204 | 1.048 | 1.065 | 448 | 1.748 | 5.513 | 16.539 | 581.4 |
| Cripta dei Fantasmi | 3: Loggia degli spiriti | broken | 1.100 | 976 | 981 | 448 | 2.056 | 5.561 | 16.683 | 586.5 |
| Cripta degli Scheletri | 1: Campanile aperto | clean | 2.174 | 1.456 | 1.872 | 696 | 0 | 6.198 | 18.594 | 653.7 |
| Cripta degli Scheletri | 1: Campanile aperto | dirty | 2.174 | 1.456 | 1.872 | 696 | 1.708 | 7.906 | 23.718 | 833.8 |
| Cripta degli Scheletri | 1: Campanile aperto | broken | 2.106 | 1.344 | 1.756 | 668 | 2.016 | 7.890 | 23.670 | 832.1 |
| Cripta degli Scheletri | 2: Tetto a timpano | clean | 2.086 | 1.456 | 1.928 | 600 | 0 | 6.070 | 18.210 | 640.2 |
| Cripta degli Scheletri | 2: Tetto a timpano | dirty | 2.086 | 1.456 | 1.928 | 600 | 1.708 | 7.778 | 23.334 | 820.3 |
| Cripta degli Scheletri | 2: Tetto a timpano | broken | 2.046 | 1.344 | 1.812 | 572 | 2.016 | 7.790 | 23.370 | 821.6 |
| Cripta degli Scheletri | 3: Torre merlata | clean | 2.236 | 1.456 | 1.928 | 720 | 0 | 6.340 | 19.020 | 668.7 |
| Cripta degli Scheletri | 3: Torre merlata | dirty | 2.236 | 1.456 | 1.928 | 720 | 1.708 | 8.048 | 24.144 | 848.8 |
| Cripta degli Scheletri | 3: Torre merlata | broken | 2.156 | 1.344 | 1.812 | 692 | 2.016 | 8.020 | 24.060 | 845.9 |
| Cripta della Natura | 1: Dolmen frondoso | clean | 1.520 | 1.272 | 1.568 | 592 | 0 | 4.952 | 14.856 | 522.3 |
| Cripta della Natura | 1: Dolmen frondoso | dirty | 1.520 | 1.272 | 1.568 | 592 | 1.788 | 6.740 | 20.220 | 710.9 |
| Cripta della Natura | 1: Dolmen frondoso | broken | 1.344 | 1.168 | 1.524 | 592 | 2.064 | 6.692 | 20.076 | 705.8 |
| Cripta della Natura | 2: Arco di pietra | clean | 1.772 | 1.272 | 1.664 | 616 | 0 | 5.324 | 15.972 | 561.5 |
| Cripta della Natura | 2: Arco di pietra | dirty | 1.772 | 1.272 | 1.664 | 616 | 1.788 | 7.112 | 21.336 | 750.1 |
| Cripta della Natura | 2: Arco di pietra | broken | 1.544 | 1.168 | 1.620 | 616 | 2.064 | 7.012 | 21.036 | 739.5 |
| Cripta della Natura | 3: Dolmen dei funghi | clean | 1.804 | 1.272 | 1.712 | 664 | 0 | 5.452 | 16.356 | 575.0 |
| Cripta della Natura | 3: Dolmen dei funghi | dirty | 1.804 | 1.272 | 1.712 | 664 | 1.788 | 7.240 | 21.720 | 763.6 |
| Cripta della Natura | 3: Dolmen dei funghi | broken | 1.496 | 1.168 | 1.668 | 664 | 2.064 | 7.060 | 21.180 | 744.6 |
| Cripta Soprannaturale | 1: Reliquiario a punta | clean | 1.088 | 1.120 | 674 | 484 | 0 | 3.366 | 10.098 | 355.0 |
| Cripta Soprannaturale | 1: Reliquiario a punta | dirty | 1.088 | 1.120 | 674 | 484 | 1.708 | 5.074 | 15.222 | 535.1 |
| Cripta Soprannaturale | 1: Reliquiario a punta | broken | 880 | 1.048 | 590 | 484 | 1.976 | 4.978 | 14.934 | 525.0 |
| Cripta Soprannaturale | 2: Tempio a gradoni | clean | 916 | 1.120 | 770 | 412 | 0 | 3.218 | 9.654 | 339.4 |
| Cripta Soprannaturale | 2: Tempio a gradoni | dirty | 916 | 1.120 | 770 | 412 | 1.708 | 4.926 | 14.778 | 519.5 |
| Cripta Soprannaturale | 2: Tempio a gradoni | broken | 792 | 1.048 | 678 | 412 | 1.976 | 4.906 | 14.718 | 517.4 |
| Cripta Soprannaturale | 3: Guglie rituali | clean | 1.120 | 1.120 | 706 | 364 | 0 | 3.310 | 9.930 | 349.1 |
| Cripta Soprannaturale | 3: Guglie rituali | dirty | 1.120 | 1.120 | 706 | 364 | 1.708 | 5.018 | 15.054 | 529.2 |
| Cripta Soprannaturale | 3: Guglie rituali | broken | 896 | 1.048 | 622 | 364 | 1.976 | 4.906 | 14.718 | 517.4 |

## Lettura dei numeri

- Un quadrilatero normalmente diventa due triangoli. Qui non si sommano «facce» di tipo diverso.
- Il numero di vertici è quello realmente conservato nei buffer, comprese le duplicazioni necessarie per normali piatte e colori per faccia.
- I draw sono stimati per il passaggio colore, a modello interamente visibile: non includono ombre, effetti aggiunti dal gioco, personaggi o terreno del quartiere. Il batching della scena può cambiare il totale.
- Buffer KiB conta position, normal, color e indici delle geometrie; esclude materiali, texture, temporanei del generatore e copie interne al driver.
- Questi valori misurano geometria e invii di disegno, non gli FPS su un telefono.

La verifica in Chromium/WebGL, con ogni lotto isolato e ombre disattivate, conferma i conteggi: **2 draw call** per i lotti integri e sporchi, **1** per quelli rotti. Ogni triangolo del modello viene inviato una volta nel passaggio colore. I risultati sono anche in `verification.json`.
