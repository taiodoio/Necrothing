# Mappa, Economia e Meteo

Versione: `v0.1`

Questo documento descrive tre evoluzioni del design rispetto alla v0.1 iniziale.

## 1. Mappa navigabile (tilemap)

Il cimitero non è più una griglia rigida 6×8, ma una **mappa erbosa navigabile
scrollando** (stile gestionale/GBA), con una **griglia fitta** di celle dove
posizionare tombe, decorazioni e strutture.

- Dimensione corrente: **24×32 celle**, tile da **40px** (configurabile).
- Scroll su entrambi gli assi; la mappa è più grande del viewport.
- Sfondo erboso con griglia leggera visibile come guida al posizionamento.

### Footprint multi-cella

Ogni oggetto occupa un **footprint** (larghezza×altezza in celle):

| Oggetto | Footprint |
|---|---|
| Tomba | 2×2 |
| Mausoleo | 3×3 |
| Salice / fontana | 2×2 |
| Decorazione standard | 1×1 |
| Struttura (sentiero, staccionata, muretto, lampione) | 1×1 |
| Fuoco fatuo (moneta) | 1×1 |

Il posizionamento valida che **tutte** le celle del footprint siano libere e
dentro i bordi (vedi `shared/domain/placeables.ts`: `buildOccupancy`,
`canPlace`).

### Interazione

- Tap su cella libera → scelta: **Seppellisci** oppure **Decora/Costruisci**.
- Tap su tomba → dettaglio. Tap su decorazione/struttura → rimozione.
- Tap su fuoco fatuo → raccolta (moneta).

## 2. Economia: Fuochi Fatui (moneta)

I **Fuochi Fatui** sono la **valuta** del gioco, distinti dai Punti Necro (XP):

- **XP / ranghi**: progressione del custode; **sbloccano i tipi** di elemento.
- **Fuochi Fatui**: si **spendono** per **piazzare** decorazioni e strutture.

### Come si guadagnano

| Fonte | Fuochi Fatui |
|---|---:|
| Raccolta sulla mappa (spawn casuale) | 1 ciascuno |
| Sepoltura | 5 |
| Pulizia erbacce | 3 |
| Portare fiori | 1 |
| Anniversario | 5 |
| Benedizione del prete | 3 |

### Spawn e raccolta

- Durante la simulazione (apertura/foreground) compaiono **casualmente**
  fuochi fatui su celle libere, fino a un tetto (8).
- Restano sulla mappa finché non vengono raccolti col tap.
- Sono salvati in `WorldState.looseWisps`.

### Spesa

Ogni elemento piazzabile ha un **costo** (oltre al rango minimo). Esempi:

| Elemento | Rango | Costo |
|---|---|---:|
| Candela | 1 | 3 |
| Corona | 1 | 5 |
| Sentiero in terra | 1 | 2 |
| Staccionata legno | 1 | 3 |
| Salice (2×2) | 2 | 12 |
| Lampione | 3 | 8 |

## 3. Meteo visibile sulla mappa

Il meteo non è più solo un'icona: è un **overlay visivo** sopra la mappa,
coerente con `currentWeather` e con la **fase del giorno** (`currentDayPhase`).

| Stato | Resa visiva |
|---|---|
| Sereno cupo | nessun overlay particellare; tinta neutra |
| Nebbia | banchi grigi semitrasparenti che scorrono |
| Pioggia | linee diagonali animate, tinta bluastra |
| Temporale | pioggia fitta + lampi |
| Vento | particelle/folate laterali |
| Neve | fiocchi che scendono |
| Luna piena | alone bluastro notturno |
| Notte/Tramonto | velo scuro che imbruna la mappa |

L'overlay è **non interattivo** (`pointer-events: none`) e rispetta
`prefers-reduced-motion`. Implementazione: `features/cemetery/WeatherOverlay`.

## Impatti su dati e codice

- `UserProgression.wisps`, `WorldState.looseWisps` (migrazione soft a 0/[]).
- Registry unificato placeable (decorazioni + strutture) con footprint/costo/rango.
- Scena riscritta come tilemap (`CemeteryScene`) con oggetti multi-cella.
