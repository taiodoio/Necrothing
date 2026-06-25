# Asset Bible

Versione: `v0.1`

## Convenzioni

Ogni asset deve avere:

- ID univoco;
- nome;
- categoria;
- priorità;
- dimensione target;
- varianti;
- animazioni;
- note tecniche.

## Priorità

| Priorità | Significato |
|---|---|
| P0 | Necessario per MVP |
| P1 | Necessario per prima release completa |
| P2 | Polish |
| P3 | Espansione futura |

## Tiles terreno

| ID | Nome | Priorità | Varianti |
|---|---|---|---|
| TILE_GRASS_01 | Erba cimiteriale base | P0 | 4 |
| TILE_DIRT_01 | Terra smossa | P0 | 3 |
| TILE_PATH_DIRT_01 | Sentiero in terra | P0 | 4 direzioni |
| TILE_PATH_STONE_01 | Sentiero in pietra | P1 | 4 direzioni |
| TILE_MUD_01 | Fango | P2 | 2 |
| TILE_SNOW_01 | Neve | P2 | 3 |

## Lapidi

| ID | Nome | Priorità | Varianti |
|---|---|---|---|
| GRAVE_WOOD_CROSS_01 | Croce in legno semplice | P0 | pulita, sporca, fiori |
| GRAVE_STONE_SIMPLE_01 | Lapide semplice | P0 | pulita, muschio, neve |
| GRAVE_GOTHIC_01 | Lapide gotica | P1 | pulita, crepa, candela |
| GRAVE_BROKEN_01 | Lapide spezzata | P1 | 2 rotture |
| GRAVE_ANGEL_01 | Lapide con angelo | P2 | muschio, neve |
| GRAVE_OBELISK_01 | Obelisco | P2 | normale, crepato |
| GRAVE_SARCOPHAGUS_01 | Sarcofago | P2 | chiuso, decorato |

## Mausolei

| ID | Nome | Priorità | Varianti |
|---|---|---|---|
| MAUS_SMALL_01 | Mausoleo piccolo | P1 | pietra, gotico |
| MAUS_TECH_01 | Cripta tecnologica | P2 | neon spento, neon acceso |
| MAUS_LUXURY_01 | Mausoleo di lusso | P2 | marmo, oro spento |
| MAUS_CENTRAL_01 | Monumento centrale | P3 | fontana, statua |

## Recinzioni

| ID | Nome | Priorità | Pezzi |
|---|---|---|---|
| FENCE_WOOD_ROTTEN | Staccionata legno marcio | P0 | dritta, angolo, fine, cancello |
| FENCE_IRON_RUST | Ferro battuto arrugginito | P1 | dritta, angolo, fine, cancello |
| WALL_STONE_GOTHIC | Muretto gotico | P1 | dritta, angolo, T, cancello |
| CHAIN_FENCE_01 | Catena funeraria | P2 | paletto, catena, angolo |

## NPC

| ID | Nome | Priorità | Animazioni |
|---|---|---|---|
| NPC_GRAVEDIGGER | Becchino | P1 | idle, walk, sweep, talk, dig |
| NPC_PRIEST | Prete | P2 | idle, walk, bless, read, bow |
| NPC_GHOST_GENERIC | Fantasma generico | P1 | appear, float, vanish |
| NPC_CROW | Corvo | P0 | idle, hop, caw, fly |
| NPC_BLACK_CAT | Gatto nero | P1 | walk, sit, stare, scratch, vanish |
| NPC_RAT | Topo | P1 | emerge, run, hide |

## Decorazioni

| ID | Nome | Priorità |
|---|---|---|
| DECO_CANDLE_01 | Candela consumata | P0 |
| DECO_FLOWERS_01 | Mazzo fiori appassibili | P0 |
| DECO_WREATH_01 | Corona funebre | P1 |
| DECO_TREE_DEAD_01 | Albero secco | P1 |
| DECO_WILLOW_01 | Salice piangente | P2 |
| DECO_MUSHROOM_01 | Funghi pixelati | P2 |
| DECO_SKULL_01 | Teschio decorativo | P2 |
| DECO_FOUNTAIN_TEARS | Fontana che piange pixel | P3 |

## UI

| ID | Nome | Priorità |
|---|---|---|
| UI_BUTTON_PRIMARY | Bottone primario gothic pixel | P0 |
| UI_MODAL_FRAME | Cornice modale | P0 |
| UI_XP_BAR | Barra XP | P0 |
| UI_RANK_BADGE | Badge rango | P0 |
| UI_NOTIFICATION_SETTINGS | Icone impostazioni notifiche | P0 |
| UI_BACKUP_ICON | Icona backup | P0 |
| UI_SHARE_CARD_FRAME | Cornice card share | P1 |
