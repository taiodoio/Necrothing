# Catalogo di migrazione degli asset — Stylized Gothic Low-Poly

Stato della migrazione di ogni asset allo stile `lowpoly`. Gli id sono quelli
già usati dal gioco (`src/game/catalog.ts`, `src/game/graves.ts`,
`src/view/characters.ts`): **nessun id è cambiato**. L'adapter
(`src/render/lowpoly/index.ts`) traduce la chiave del modello nel generatore
dedicato; se non esiste ancora, la cache usa il mesher *miniatura* sulle
stesse primitive (stesse dimensioni e pivot), così il gioco resta completo.

Legenda: ✅ generatore low-poly dedicato · ✅ low-poly dedicato (da migrare).
Unità: 1 u = 1 cella = 1 unità mondo. "Altezza" = altezza visiva del modello
pulito, variante 0.

## Lapidi (10 tipi × 4 stati)

Ingombro 2×2, calpestabilità: blocca. Selezione: hitbox dell'ingombro, cornice
e accento emissivo. Animazione: nessuna (le candele hanno il tremolio della luce).

| Tipo (id) | Famiglia geometrica | Varianti per seme | Stati | Stato |
|---|---|---|---|---|
| `rectangular` | 1 · rettangolare (cimasa, pannello incassato, croce in rilievo) | larghezza, altezza, cimasa | pulita · fiori · trascurata · rotta | ✅ |
| `family_memorial` | 1 · rettangolare larga con pilastri e frontone | larghezza, altezza | idem | ✅ |
| `stone_simple` | 2 · arrotondata (bordo in rilievo, epigrafe) | larghezza, altezza, rilievo | idem | ✅ |
| `victorian` | 2 · arrotondata alta con volute e urna | larghezza, altezza | idem | ✅ |
| `gothic` | 3 · arco acuto con nicchia, pinnacoli, finale, teschio | larghezza, altezza, finale, teschio | idem | ✅ |
| `celtic_cross` | 4 · croce con anello celtico (corona estrusa con foro) | altezza | idem | ✅ |
| `marble_cross` | 4 · croce latina in marmo su basamento a 3 gradini | altezza | idem | ✅ |
| `decorated_monument` | 5 · piedistallo con colonnine e urna velata | larghezza, altezza | idem | ✅ |
| `obelisk` | 5 · piedistallo + obelisco a 4 facce con pyramidion | altezza | idem | ✅ |
| `angel` | 5 · piedistallo + angelo (veste tornita, ali estruse) | aureola | idem | ✅ |

Decorazioni modulari per stato (`src/render/lowpoly/details.ts`): tumulo con
erba o terra smossa, cordolo in pietra (incompleto e storto se trascurato),
muschio sulle facce rivolte in alto, toppe di muschio, erbacce secche, foglie
morte, lumino rovesciato; fiori: vasi torniti con mazzi, corona d'alloro,
candela accesa e lumino rosso con luce; rotta: lapide inclinata, crepe incise,
frammento caduto, calcinacci.

## Oggetti del catalogo

| id | Nome | Categoria | Ingombro | Altezza | Stati | Collisione | Animazione | Stato |
|---|---|---|---|---|---|---|---|---|
| `lamp_post` | Lampione | Luci | 1×1 | 3.0 u | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `lantern` | Lanterna | Luci | 1×1 | 0.5 u | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `ghost_lantern` | Lanterna fantasma | Luci | 1×1 | — | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `glow_pumpkin` | Zucca luminosa | Luci | 1×1 | — | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `skull_candle` | Teschio con candela | Luci | 1×1 | — | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `torch` | Torcia in fiamme | Luci | 1×1 | 1.2 u | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `bonfire` | Falò esoterico | Luci | 2×2 | — | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `candle_tree` | Albero con candele | Luci | 3×3 | — | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `wreath` | Corona di fiori | Decorazioni | 1×1 | 0.9 u | unico | blocca | — | ✅ low-poly dedicato |
| `sign` | Cartello | Decorazioni | 1×1 | 1.4 u | unico | blocca | — | ✅ low-poly dedicato |
| `angel_statue` | Statua angelo | Decorazioni | 2×2 | 2.2 u | unico | blocca | — | ✅ low-poly dedicato |
| `votive_statue` | Statua votiva | Decorazioni | 2×2 | 2.0 u | unico | blocca | — | ✅ low-poly dedicato |
| `open_coffin` | Bara aperta | Decorazioni | 1×2 | — | unico | blocca | — | ✅ low-poly dedicato |
| `bones` | Ossa | Decorazioni | 1×1 | 0.2 u | unico | calpestabile | — | ✅ low-poly dedicato |
| `vase` | Vaso | Decorazioni | 1×1 | 0.6 u | unico | blocca | — | ✅ low-poly dedicato |
| `shop` | Bottega | Costruzioni | 3×3 | 2.5 u | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `gravedigger_house` | Casa del becchino | Costruzioni | 4×3 | 2.3 u | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `shrine` | Santuario | Costruzioni | 3×3 | — | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `mausoleum` | Mausoleo | Costruzioni | 3×3 | 2.8 u | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `open_grave` | Tomba dissotterrata | Costruzioni | 2×2 | — | pulito/sporco/rotto | blocca | — | ✅ low-poly dedicato |
| `wall_stone` | Muretto in pietra | Costruzioni | 1×1 | — | pulito/sporco/rotto | blocca | — | ✅ low-poly dedicato |
| `fence_wood` | Staccionata di legno | Costruzioni | 1×1 | — | pulito/sporco/rotto | blocca | — | ✅ low-poly dedicato |
| `fence_iron` | Inferriata di ferro | Costruzioni | 1×1 | — | pulito/sporco/rotto | blocca | — | ✅ low-poly dedicato |
| `arch_stone` | Arco in pietra | Costruzioni | 3×1 | — | pulito/sporco/rotto | calpestabile | — | ✅ low-poly dedicato |
| `arch_lights` | Arco con luci | Costruzioni | 3×1 | — | pulito/sporco/rotto, acceso/spento | calpestabile | tremolio luce | ✅ low-poly dedicato |
| `arch_gothic` | Arco gotico | Costruzioni | 3×1 | — | pulito/sporco/rotto | calpestabile | — | ✅ low-poly dedicato |
| `path_stone` | Sentiero in pietra | Costruzioni | 1×1 | 0.1 u | pulito/sporco/rotto | calpestabile | — | ✅ low-poly dedicato |
| `path_dirt` | Sentiero in terra | Costruzioni | 1×1 | 0.0 u | pulito/sporco/rotto | calpestabile | — | ✅ low-poly dedicato |
| `well` | Pozzo | Costruzioni | 2×2 | 1.6 u | pulito/sporco/rotto | blocca | — | ✅ low-poly dedicato |
| `fountain` | Fontana | Costruzioni | 3×3 | — | pulito/sporco/rotto | blocca | — | ✅ low-poly dedicato |
| `hell_hole` | Buco infernale | Costruzioni | 2×2 | — | pulito/sporco/rotto, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `pet_house` | Casetta per animale | Costruzioni | 2×2 | — | pulito/sporco/rotto | blocca | — | ✅ low-poly dedicato |
| `pond` | Lago con pesci morti | Ambiente | 4×3 | 0.7 u | unico | blocca | — | ✅ low-poly dedicato |
| `dead_tree` | Albero morto | Ambiente | 2×2 | 3.0 u | unico | blocca | — | ✅ low-poly dedicato |
| `spectral_tree` | Albero spettrale | Ambiente | 3×3 | — | unico, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `half_pine` | Pino mezzo morto | Ambiente | 2×2 | 2.4 u | unico | blocca | — | ✅ low-poly dedicato |
| `xmas_tree` | Albero di Natale morto | Ambiente | 2×2 | — | unico, acceso/spento | blocca | tremolio luce | ✅ low-poly dedicato |
| `toxic_puddle` | Pozzanghera avvelenata | Ambiente | 2×1 | — | unico | calpestabile | — | ✅ low-poly dedicato |
| `monster_rocks` | Rocce mostruose | Ambiente | 2×2 | — | unico | blocca | — | ✅ low-poly dedicato |
| `flowerbed` | Aiuola fiorita | Ambiente | 2×2 | 0.3 u | unico | blocca | — | ✅ low-poly dedicato |
| `poison_shrooms` | Funghi velenosi | Ambiente | 1×1 | 0.2 u | unico | calpestabile | — | ✅ low-poly dedicato |
| `bushes` | Cespugli | Ambiente | 2×2 | 0.7 u | unico | blocca | — | ✅ low-poly dedicato |
| `hillock` | Collinetta | Ambiente | 2×2 | — | unico | blocca | — | ✅ low-poly dedicato |
| `tall_grass` | Erba alta | Ambiente | 1×1 | 0.4 u | unico | calpestabile | — | ✅ low-poly dedicato |
| `mud` | Terreno fangoso | Ambiente | 1×1 | — | unico | calpestabile | — | ✅ low-poly dedicato |
| `zombies_play` | Zombie che giocano | Presenze | 2×2 | — | unico | calpestabile | presenze animate (rig) | ✅ low-poly dedicato |
| `zombies_dance` | Zombie che ballano | Presenze | 2×2 | — | unico | calpestabile | presenze animate (rig) | ✅ low-poly dedicato |
| `zombie_walker` | Zombie errante | Presenze | 1×1 | — | unico | calpestabile | presenze animate (rig) | ✅ low-poly dedicato |
| `ghosts_roam` | Fantasmi erranti | Presenze | 1×1 | — | unico | calpestabile | presenze animate (rig) | ✅ low-poly dedicato |
| `ghosts_ball` | Fantasmi a palla | Presenze | 2×2 | — | unico | calpestabile | presenze animate (rig) | ✅ low-poly dedicato |
| `skeleton_pet` | Animale scheletro | Presenze | 1×1 | — | unico | calpestabile | presenze animate (rig) | ✅ low-poly dedicato |

## Scenografia (non selezionabile)

| Chiave | Uso | Rappresentazione low-poly | Stato |
|---|---|---|---|
| `fseg:*` | segmento di recinto (instancing lungo il perimetro) | muretto a blocchi irregolari, copertina, inferriata a lance con riccioli | ✅ |
| `fpil:*` | pilastro del recinto | fusto con ricorsi, cappello, cuspide e sfera | ✅ |
| `gate:lit/off` | cancello d'ingresso | pilastri con cantonali e teschi, ante aperte, arco in ferro con targa, 2 lanterne | ✅ |
| `wpine:*`, `wdead:*`, `wrock:*` | bosco oltre il recinto (cotto per chunk) | pini a palchi, alberi morti con foglie autunnali, massi muschiati | ✅ |
| `tuft:*`, `wgrass:*`, `flowers:*`, `fern:*`, `bush:*`, `shroom:*`, `leaves:*`, `pebbles:*` | sottobosco e prato (cotti per chunk) | fili d'erba sottili, felci a raggiera, fiori, funghi, foglie, sassi | ✅ |
| terreno | suolo dell'intera mappa | superficie sfaccettata (4 triangoli per cella), colline, pad piani sotto gli oggetti | ✅ |

## Personaggi (stesse parti e perni del rig esistente)

| Tipo | Rappresentazione low-poly | Animazione | Stato |
|---|---|---|---|
| `custode` | cappello a tesa larga, cappotto svasato, borsa, stivali, pala, lanterna accesa | idle, camminata, lavoro (rig a parti) | ✅ |
| `skeleton` | teschio con orbite e denti, costole ad arco, ossa lunghe | idle, camminata, ballo | ✅ |
| `ghost`, `ghostRare` | lenzuolo tornito con orlo frastagliato, semitrasparente | fluttuazione | ✅ |
| `gravedigger`, `priest`, `mourner`, `zombie` | umanoide parametrico (berretto/barba, tonaca e stola, velo, pelle verdastra) | come sopra | ✅ |
| `cat`, `rat`, `crow` | gatto nero con occhi verdi luminosi, topo con coda lunga, corvo con ali di penne e occhi rossi | camminata, volo (rig a parti) | ✅ |
| `petDog`, `petCat`, `petRabbit`, `petCrow`, `petDuck` | animali scheletro: colonna, costole, teschio, zampe d'osso (anatra con becco dorato) | come sopra | ✅ |
