# Piano di Implementazione — Implementation_Note

Versione: `v1.0`
Data: 2026-06-28
Fonte: [`Implementation_Note.md`](../../../Implementation_Note.md) (root repo)
Stato corrente di riferimento: [`07-feature-registry.md`](./07-feature-registry.md)

## A cosa serve

Traduce la `Implementation_Note` (visione UX/gameplay) in **fasi implementabili**,
ordinate per dipendenza. Per ogni fase: obiettivo, cosa cambia per layer
(dominio → store → servizio → UI), nuovi file, leve di bilanciamento, effort e
criteri di accettazione.

> Convenzione percorsi: relativi a `prototype/src/` salvo diversa indicazione.
> Effort: **S** = ~mezza giornata · **M** = 1–2 giorni · **L** = 3–5 giorni.

---

## Quadro: cosa esiste vs cosa chiede la Note

| Area | Oggi | Note chiede | Δ |
|---|---|---|---|
| **Economia** | Paghi fuochi fatui **ogni volta** che piazzi | Compri in Bottega (una volta) → va in **Inventario** → piazzi da lì; **rivendi al 70%**; il venduto non si ricompra | 🔴 Rifondazione |
| **Navigazione** | 2 bottoni in basso (Seppellisci/Decora) | **Bolla FAB** in basso-sx che si espande: Seppellisci, Edit, Inventario, Bottega, Foto, Galleria | 🔴 Nuova shell |
| **Edit** | Drag&drop sempre attivo | **Modalità Edit** esplicita (tap=evidenzia, hold=sposta, menù rotazione/elimina/conferma); fuori da Edit il tap è interazione | 🟠 Refactor |
| **Catalogo** | 7 deco + 7 strutture | ~50 oggetti (luci, deco, costruzioni, ambiente, **NPC piazzabili**) | 🟠 Espansione |
| **Stati oggetti** | Tomba: erbacce + sporco | Tomba/luce/struttura: pulito → **sporco** → **rotto**; **riparazione**; luci **on/off** | 🟠 Macchina a stati |
| **Foto/Galleria** | — | Cattura fotocamera (rettangolo ridimensionabile) → salva/elimina/condividi → **Galleria** | 🔴 Nuovo |
| **TopBar** | Rango + XP + fuochi fatui | + **nome giocatore**, + **ora**, tap apre Player | 🟢 Estensione |
| **NPC** | 6 erranti (atmosfera/punti) | Becchino pulisce gratis le tombe vicine; fantasmi-oggetto rari; zombie legati a tombe dissotterrate; ricompense fuochi fatui | 🟠 Profondità |

🔴 fondante · 🟠 sostanziale · 🟢 incrementale

---

## Ordine consigliato (catena di dipendenze)

```
A. Economia (Inventario + Bottega)  ──┬──> C. Edit mode (elimina→inventario)
                                      └──> D. Catalogo esteso
B. Shell UI (bolla FAB + TopBar)  ───────> (apre Inventario/Bottega/Foto/Galleria)
E. Stati + Riparazione  (indipendente, su sim)
F. Foto + Galleria      (indipendente)
G. NPC interattivi      (dopo D per NPC piazzabili)
H. Bilanciamento longevità (ultimo, taratura)
```

**A** e **B** sbloccano la maggior parte del resto e vanno per prime.

---

## FASE A — Rifondazione economia: Inventario + Bottega · **L**

Il cambiamento più profondo: dal modello *pay-per-place* a *buy-to-own*.

**Modello nuovo**
- La **Bottega** mostra tutto il catalogo con costo; comprare scala i fuochi
  fatui **una sola volta** e aggiunge l'oggetto all'**Inventario**.
- Si **piazza dall'Inventario** (non si ri-paga); piazzare scala la quantità
  posseduta.
- **Eliminare** un oggetto piazzato lo **restituisce all'Inventario**.
- **Vendere** dall'Inventario restituisce il **70%** del costo; un tipo
  "venduto/posseduto" resta sbloccato (non va ricomprato per ri-vederlo in
  Bottega, ma serve ricomprare l'unità per ri-piazzarla).

**Dominio** (`shared/domain/`)
- `types.ts`: `InventoryItem { type: PlaceableType; owned: number }` (o mappa
  `Record<PlaceableType, number>`).
- `balance.ts`: `ECONOMY = { sellRefund: 0.7 }`.

**DB** (`db/schema.ts`)
- `DB_VERSION` → 5; nuovo store `inventory` (chiave = `PlaceableType`).
- Repository `inventoryRepository`.

**Servizio** (`services/inventoryService.ts` + test)
- `buy(type)`: valida fondi/rank → −costo fuochi fatui, +1 owned.
- `sell(type)`: owned>0 → −1 owned, +round(costo·0.7) fuochi fatui.
- `consumeForPlacement(type)` / `returnFromRemoval(type)`.

**Store** (`gameStore.ts`)
- Stato `inventory`; azioni `buyItem`, `sellItem`.
- `placeDecoration` **non** scala più i fuochi fatui: verifica `owned>0` e
  consuma; `removeDecoration` restituisce in inventario.

**UI**
- `features/shop/BottegaSheet.tsx`: griglia per categoria, costo, grigiato se
  fondi/rank insufficienti, CTA "Compra".
- `features/inventory/InventarioSheet.tsx`: schede per categoria; posseduti in
  evidenza, esauriti grigiati; selezione → CTA **Inserisci** / **Vendi**;
  hold&drag chiude lo sheet ed evidenzia l'elemento (aggancio a Fase C).
- `PlaceablePicker` attuale → assorbito da Bottega+Inventario (o riusato in
  `replaceMode`).

**Accettazione**: compro lampione → −fuochi fatui una volta → compare in
Inventario → lo piazzo (owned −1) → lo elimino (owned +1) → lo vendo (+70%).
`npm run typecheck && npm test && npm run build` verdi.

---

## FASE B — Shell UI: bolla FAB + TopBar giocatore · **M**

**Bolla FAB** (basso-sx) che si espande in orizzontale con le azioni:
Seppellisci · Edit · Inventario · Bottega · Foto · Galleria.
- `features/cemetery/ActionBubble.tsx` (stato aperto/chiuso, animazione
  espansione, chiusura su tap-fuori).
- Sostituisce i due bottoni attuali in `CemeteryPage`.

**TopBar** (`features/cemetery/TopBar.tsx`)
- Aggiungi **nome giocatore** (nuovo campo in `progression`/settings; default
  modificabile in Settings o al primo avvio).
- Top-left (nome + rango + barra + fuochi fatui) diventa **tappabile** →
  `/achievements` (sezione Player).
- Top-right: **orologio** (ora di gioco), meteo, ⚙️ Settings.

**Accettazione**: la home mostra bolla in basso-sx funzionante e TopBar con nome
+ ora; tap sul blocco giocatore apre Player.

---

## FASE C — Modalità Edit esplicita · **M**

**Comportamento**
- Toggle **Edit** dalla bolla. Popup introduttivo con spunta "non mostrare più"
  (flag in settings).
- Edit ON: tap su elemento → evidenziato + menù contestuale (ruota / elimina /
  conferma spostamento); tap&hold → drag&drop snap-to-grid (già in
  `CemeteryScene`).
- Edit OFF: il tap è **interazione semplice** (menù contestuale leggero o
  raccolta/cattura) — niente spostamenti accidentali.
- **Elimina** → ritorna in Inventario (dipende da Fase A).

**Codice**
- Stato `editMode` in `CemeteryPage`; il drag&drop in `CemeteryScene` si attiva
  solo se `editMode`.
- Riusa `ObjectPopup`/`DecorationSheet` per il menù contestuale.

**Accettazione**: senza Edit i tap non spostano nulla; con Edit sposto/ruoto/
elimino e l'eliminato torna in Inventario.

---

## FASE D — Catalogo esteso · **L** (incrementale)

Aggiunta degli oggetti della Note. Lavoro **per lotti** (un commit per gruppo).
Per ogni nuovo tipo: enum + label + def in `placeables.ts` (footprint/costo/rank)
+ sprite (SVG fallback in `shared/assets/`, PNG opzionale in `assets/generated/`).

**Gruppi**
- **Luci**: lanterna fantasma, zucca luminosa, teschio con candela, torcia,
  falò esoterico, albero con candele. *(predispone on/off — Fase E)*
- **Decorazioni**: statua angelo, statua votiva, bara aperta, ossa, vaso (×2),
  **Cartello personalizzabile** → richiede campo testo (`label` per-istanza,
  nuovo dato su `Decoration`; mostra il testo nel dettaglio/tap).
- **Costruzioni**: tomba generica dissotterrata, archi (pietra / pietra+luci /
  gotico), pozzo, fontana, buco infernale, **casetta animale** (animale dentro
  la tana in modo casuale all'apertura), **casa del becchino** (↑prob. becchino),
  **santuario** (↑prob. prete). I tre "edifici-evento" → modificatori di spawn
  (Fase G).
- **Ambiente**: lago con pesci morti, albero spettrale, pino mezzo morto,
  pozzanghere avvelenate, rocce, aiuola fiorita, cespugli, collinetta, erba alta,
  terreno fangoso, **albero di Natale** (solo dicembre → gate stagionale).
- **NPC piazzabili**: zombie che giocano/ballano, fantasmi che girano, animale
  scheletro (cane/gatto/coniglio/papera/corvo) che gira nell'area piazzata.
  *(comportamento "roam locale" — nuovo `behavior` in `useRoamingEntities`.)*

**Accettazione**: ogni gruppo compare in Bottega/Inventario, si piazza, ha
sprite; cartello mostra il testo; albero di Natale visibile solo a dicembre.

---

## FASE E — Stati oggetti + Riparazione · **L**

Estende la simulazione (`simulationService.ts`) a una macchina a stati comune.

**Stati**
- **Tombe**: pulito → **sporco** → **rotto** (se non pulita per ~10 giorni).
- **Luci/Costruzioni**: pulito → **sporco** (~3 giorni) → **rotto** (~7 giorni).

**Regole**
- **Riparare** è obbligatorio prima di pulire (`riparare` pulisce anche). Ha un
  costo in fuochi fatui.
- I **fiori** aumentano di +1 giorno la soglia prima di sporco/rotto; quando la
  tomba si rompe **i fiori spariscono**.
- **Luci on/off**: accese di notte; azione "Accendi/Spegni" nel menù contestuale.

**Dominio/Servizio**
- `types.ts`: stato item esteso (es. `condition: 'clean'|'dirty'|'broken'`,
  `lit?: boolean`) su `Grave` e `Decoration`.
- `balance.ts`: `DECAY = { dirtDays:3, breakDays:7, graveBreakDays:10, repairCost:… }`.
- `simulationService.ts`: avanzamento condizione per età; fiori prolungano.
- `graveService` / nuovo `placeableConditionService`: `repair`, `clean`,
  `toggleLight`.

**UI**: sprite per stato (sporco/rotto/luce on); menù contestuale mostra
**Ripara** quando serve, **Pulisci** solo se pulibile, **Accendi/Spegni** per le
luci.

**Accettazione**: una tomba trascurata si sporca, poi si rompe e perde i fiori;
ripararla la rimette a posto; le luci si accendono di notte e si possono spegnere.

---

## FASE F — Foto + Galleria · **M**

**Cattura**
- Popup spiegazione → overlay con **rettangolo ridimensionabile** (maniglie agli
  angoli) sopra la scena; pulsante rotondo di scatto.
- Scatto = render dell'area su canvas → `pixelateGrayscale` (riuso
  `shared/utils/image.ts`).
- Popup risultato: **Salva** / **Elimina** / **Condividi** (condividi salva auto).

**Galleria**
- `features/gallery/GalleryPage.tsx`: griglia delle foto salvate, condivisibili.
- Persistenza: store `photos` (blob via `imageStorageService` + metadati).

**Codice**: `features/photo/PhotoCapture.tsx`, `services/galleryService.ts`,
voce in DB schema (`DB_VERSION` +1).

**Accettazione**: scatto, regolo il rettangolo, salvo → la foto compare in
Galleria e si può condividere.

---

## FASE G — NPC interattivi (profondità) · **M**

Rende gli NPC meccaniche, non solo atmosfera.

- **Becchino**: al tap pulisce **gratis tutte le tombe vicine** (raggio) e dà
  punti. *(oggi: solo passaggio.)*
- **Fantasmi-oggetto**: oltre ai generici, fantasmi della cosa sepolta — più
  rari, più difficili da catturare, **più punti/fuochi fatui**.
- **Zombie**: probabilità ↑ in funzione delle **tombe generiche dissotterrate**
  piazzate (lega Fase D ↔ spawn).
- **Ricompense fuochi fatui** all'interazione con corvo/fantasma/gatto/topo/
  zombie (oggi il corvo è solo atmosfera).
- **Modificatori di spawn** da edifici: mausoleo +10% eventi, casa becchino
  ↑becchino, santuario ↑prete.

**Codice**: `balance.ts` (`SPAWN_CHANCE`, modificatori), `simulationService`
(calcolo prob. con bonus edifici), handler tap in `CemeteryPage` +
`gameStore` (becchino → pulizia multipla).

**Accettazione**: il becchino pulisce le tombe vicine e dà punti; un santuario
piazzato aumenta la comparsa del prete; il corvo dà fuochi fatui.

---

## FASE H — Bilanciamento & longevità · **M** (taratura continua)

Risponde alla domanda aperta della Note ("dopo quanto i giocatori completano
tutto?").

- Definire **% di comparsa** eventi e **curva di accumulo** fuochi fatui in
  `balance.ts` con commenti sui target (vedi stima sotto).
- Hook di **espansione**: sblocco nuovo terreno/oggetti a soglie di rango o
  prestigio (evita il "tutto completato").
- (Opz.) **Preset bilanciamento** dal DevPanel (slider denso/calmo).
- Aggiornare `06-gameplay-roadmap.md` e `07-feature-registry.md`.

**Stima tempo di completamento** (da validare in playtest):
| Profilo | Achievement principali | Cimitero pieno | Completo (anniversari) |
|---|---|---|---|
| Casual (5–10 min/g) | 2–3 mesi | 4–6 mesi | 2+ anni |
| Engaged (20–30 min/g) | 4–6 sett. | 2–3 mesi | 1–2 anni |
| Hardcore | 3–4 sett. | ~1 mese | ~1 anno |

> Vincolo dominante: **tempo reale** (erbacce, decadimento, anniversari a 1 anno
> dalla sepoltura). Gli anniversari sono l'end-game naturale; decidere se
> tenerli come traguardo o introdurre obiettivi intermedi più frequenti.

---

## Riepilogo effort & dipendenze

| Fase | Titolo | Effort | Dipende da |
|---|---|---|---|
| A | Economia: Inventario + Bottega | L | — |
| B | Shell UI: bolla FAB + TopBar | M | — |
| C | Modalità Edit | M | A |
| D | Catalogo esteso | L | A |
| E | Stati + Riparazione | L | — |
| F | Foto + Galleria | M | — |
| G | NPC interattivi | M | D (per NPC piazzabili) |
| H | Bilanciamento & longevità | M | A,D,E,G |

**Totale grezzo**: ~4–6 settimane-uomo. A/B in parallelo per primi.

## Rischi & note

- **Migrazioni DB**: A, E, F bumpano `DB_VERSION`. Mantenere `backupService`
  retro-compatibile e testare restore da versioni precedenti.
- **Fotocamera**: `getUserMedia` richiede HTTPS e permessi; prevedere fallback
  "carica da galleria" (già usato in sepoltura).
- **Performance**: con catalogo ×7 e stati per-oggetto, verificare il rendering
  della scena su mobile (memoizzazione sprite, culling fuori-viewport).
- **Cartello/NPC piazzabili**: dati per-istanza (testo, comportamento) escono dal
  modello "tipo → def" attuale; valutare campo libero su `Decoration`.

## Checklist per fase (ricorda)

1. Dominio/enum + migrazione DB se persistente.
2. Costanti in `balance.ts`.
3. Servizio puro + `*.test.ts`.
4. Azione nello store (niente logica nei componenti).
5. UI + stili in `app/styles.css`.
6. Trigger nel **DevPanel** se è un evento.
7. `npm run typecheck && npm test && npm run build` verdi.
8. Aggiorna `07-feature-registry.md`.
