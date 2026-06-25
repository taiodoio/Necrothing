# Asset List — Completa e Generation-Ready

Versione: `v0.2`

Questo documento elenca **tutti** gli asset necessari a NECROTHING, con
varianti, stati, animazioni, dimensioni e mappatura al codice. È pensato per
generare gli asset in modo sistematico (formato finale: **SVG**, eventualmente
animati). Vedi anche `01-asset-bible.md` (versione iniziale) e il manifest
machine-readable `asset-manifest.json`.

## Convenzioni

- **Formato**: SVG, `viewBox="0 0 100 100"` salvo diversa indicazione.
- **Pixel-perfect non richiesto**: stile gothic vettoriale, coerente col tema.
- **Palette base** (token):
  - sfondo `#0d0b12`, superficie `#16131f` / `#1f1a2e`, linee `#2a2640`
  - testo `#e7e2f0` / dim `#a79fc0`
  - accenti: viola spettrale `#9b87c4`, verde muschio `#4f6b3a`/`#789a4d`,
    ambra candela `#e0a34a`/`#fff1c2`, pietra `#5d5678`, legno `#6b4a2b`
- **Priorità**: `P0` (MVP), `P1` (prima release), `P2` (polish), `P3` (espansione).
- **`mapsTo`**: componente React esistente o pianificato.

## Vocabolario degli STATI (modificatori riutilizzabili)

Gli stati sono **overlay** combinabili applicati a un asset base, così da non
duplicare ogni combinazione. Un asset dichiara quali stati supporta.

| Stato | ID | Descrizione | Reso come |
|---|---|---|---|
| Pulito | `clean` | Base, nessun degrado | base |
| Impolverato | `dusty` | Velo di polvere/sporco | overlay grigio a bassa opacità |
| Muschioso | `mossy` | Chiazze di muschio | overlay verde alla base |
| Crepato | `cracked` | Crepe sottili | linee scure |
| Ragnatele | `cobweb` | Ragnatele agli angoli | linee bianche sottili |
| Innevato | `snowy` | Cappello di neve | overlay bianco superiore |
| Foglie | `leafy` | Foglie d'autunno | overlay foglie alla base |
| Con fiori | `flowers` | Fiori freschi deposti | overlay fiori |
| Fiori appassiti | `withered` | Fiori secchi | overlay marrone |
| Con erbacce | `weeds` | Erbacce | overlay verde irregolare |
| Acceso | `lit` | Fiamma/luce attiva | fiamma + glow |
| Spento | `unlit` | Senza fiamma | base |
| Bagliore anniversario | `anniversaryGlow` | Aura nei giorni di anniversario | glow ambra pulsante |
| Notturno | `night` | Variante notte | toni più freddi + luci |

---

## 1. Terreno (Ground tiles)

Tile quadrate componibili. `viewBox 0 0 64 64`.

| ID | Nome | Priorità | Varianti | Stati | Anim | mapsTo |
|---|---|---|---|---|---|---|
| `tile_grass` | Erba cimiteriale | P0 | 4 ciuffi | dusty, snowy, leafy, dry(summer) | — | TileSprite (planned) |
| `tile_dirt` | Terra smossa | P0 | 3 | snowy | — | TileSprite |
| `tile_mound_fresh` | Tumulo fresco | P0 | 1 | — | settle (sepoltura) | EmptyPlot→grave |
| `tile_plot_empty` | Zolla libera | P0 | 2 | dusty | hover | EmptyPlotSprite ✅ |
| `tile_path_dirt` | Sentiero terra | P0 | 4 direzioni + incrocio | snowy | — | TileSprite |
| `tile_path_stone` | Sentiero pietra | P1 | 4 direzioni + incrocio | mossy, snowy | — | TileSprite |
| `tile_mud` | Fango | P2 | 2 | — | — | TileSprite |
| `tile_snow` | Neve | P2 | 3 | — | — | TileSprite |
| `tile_leaves` | Foglie a terra | P2 | 3 | — | drift | TileSprite |
| `tile_gravel` | Ghiaia | P3 | 2 | — | — | TileSprite |

## 2. Ambiente e sfondo (Environment)

Elementi di scena a tutta larghezza o silhouette, dietro la griglia.

| ID | Nome | Priorità | Varianti | Stati | Anim | mapsTo |
|---|---|---|---|---|---|---|
| `bg_sky` | Cielo gradiente | P1 | dawn, day, dusk, night | — | transizione fase | SkyLayer (planned) |
| `bg_stars` | Stelle | P1 | 1 | night | twinkle | StarsLayer |
| `bg_moon` | Luna | P1 | full, crescent, gibbous | night | glow pulse | MoonSprite |
| `bg_hills` | Colline lontane | P2 | 2 | snowy | — | HillsLayer |
| `bg_treeline` | Linea di alberi | P2 | 2 | leafy(autunno), snowy | sway | TreelineLayer |
| `bg_church` | Chiesa/cripta lontana | P2 | 1 | night(finestre accese) | — | ChurchSilhouette |
| `env_gate` | Cancello cimitero | P1 | closed, open | rusty, snowy | open/close | GateSprite |
| `env_fence_wood` | Staccionata legno marcio | P0 | dritta, angolo, fine, cancello | mossy, snowy | — | FenceSprite |
| `env_fence_iron` | Ferro battuto arrugginito | P1 | dritta, angolo, fine, cancello | snowy | — | FenceSprite |
| `env_wall_stone` | Muretto gotico | P1 | dritta, angolo, T, cancello | mossy, snowy | — | WallSprite |
| `env_lamp_post` | Lampione cimiteriale | P2 | 1 | lit, unlit | flicker | LampPostSprite |
| `env_arch` | Arco d'ingresso | P3 | 1 | mossy | — | ArchSprite |

## 3. Meteo (Weather overlays) — enum `WEATHER`

Overlay a tutto schermo sopra la scena. Coerenti con `currentWeather`.

| ID | Nome | Priorità | Stati | Anim | mapsTo |
|---|---|---|---|---|---|
| `wx_gloomy_clear` | Sereno cupo | P0 | day/night | nuvole lente | WeatherLayer (planned) |
| `wx_fog` | Nebbia | P0 | — | banchi che scorrono | FogLayer |
| `wx_rain` | Pioggia | P1 | — | gocce cadenti | RainLayer |
| `wx_storm` | Temporale | P1 | — | pioggia + lampi | StormLayer |
| `wx_wind` | Vento | P1 | — | particelle/foglie laterali | WindLayer |
| `wx_snow` | Neve | P1 | — | fiocchi cadenti | SnowLayer |
| `wx_full_moon` | Luna piena | P1 | night | glow + nebbia tenue | MoonGlowLayer |

## 4. Stagioni (Seasonal layers) — enum `SEASONS`

Modificano palette terreno e props ambientali.

| ID | Nome | Priorità | Props aggiuntive | mapsTo |
|---|---|---|---|---|
| `season_spring` | Primavera | P2 | fiori sparsi, erba viva | SeasonLayer |
| `season_summer` | Estate | P2 | erba secca, terra screpolata | SeasonLayer |
| `season_autumn` | Autunno | P2 | foglie, zucche (Halloween) | SeasonLayer |
| `season_winter` | Inverno | P2 | neve, candele festive | SeasonLayer |

## 5. Lapidi (Graves) — enum `GRAVE_TYPES`

Base + stati combinabili. `viewBox 0 0 100 100`.

| ID | Nome | Priorità | Stati supportati | Anim | mapsTo |
|---|---|---|---|---|---|
| `grave_wood_cross` | Croce in legno | P0 | clean, dusty, mossy, snowy, flowers, weeds, anniversaryGlow | — | GraveSprite ✅ |
| `grave_stone_simple` | Lapide semplice | P0 | clean, dusty, mossy, cracked, snowy, flowers, weeds | — | GraveSprite ✅ |
| `grave_gothic` | Lapide gotica | P1 | clean, mossy, cracked, cobweb, snowy, flowers, weeds, lit(candela) | candela | GraveSprite ✅ |
| `grave_broken` | Lapide spezzata | P1 | clean(2 rotture), mossy | — | GraveSprite ✅ |
| `grave_angel` | Lapide con angelo | P2 | clean, mossy, snowy, weeds | — | GraveSprite ✅ |
| `grave_obelisk` | Obelisco | P2 | clean, cracked, snowy | — | GraveSprite ✅ |
| `grave_sarcophagus` | Sarcofago | P2 | clean, decorated | — | GraveSprite (new) |
| `maus_small` | Mausoleo piccolo | P1 | stone, gothic | — | MausoleumSprite (new) |
| `maus_tech` | Cripta tecnologica | P2 | neon_off, neon_on | neon flicker | MausoleumSprite |
| `maus_luxury` | Mausoleo di lusso | P2 | marble, gold | — | MausoleumSprite |
| `maus_central` | Monumento centrale | P3 | fountain, statue | fontana | MausoleumSprite |

### Overlay di stato lapide (asset separati combinabili)

| ID | Nome | Priorità | mapsTo |
|---|---|---|---|
| `ov_flowers_fresh` | Fiori freschi | P0 | GraveSprite overlay ✅ |
| `ov_flowers_withered` | Fiori appassiti | P1 | overlay |
| `ov_weeds` | Erbacce | P0 | GraveSprite overlay ✅ |
| `ov_moss` | Muschio | P1 | overlay |
| `ov_snow_cap` | Neve superiore | P1 | overlay |
| `ov_cobweb` | Ragnatele | P2 | overlay |
| `ov_dust` | Polvere | P1 | overlay |
| `ov_candle_small` | Candela su lapide | P1 | overlay (lit) |
| `ov_anniversary_glow` | Bagliore anniversario | P2 | overlay (anim) |

## 6. Decorazioni — enum `DECORATION_TYPES`

| ID | Nome | Priorità | Stati | Anim | mapsTo |
|---|---|---|---|---|---|
| `deco_candle` | Candela | P0 | lit, unlit, consumed | fiamma | DecorationSprite ✅ |
| `deco_wreath` | Corona funebre | P0 | fresh, withered | — | DecorationSprite ✅ |
| `deco_mushroom` | Funghi | P2 | clean, glowing(night) | glow | DecorationSprite ✅ |
| `deco_dead_tree` | Albero secco | P2 | clean, snowy, crow | sway | DecorationSprite ✅ |
| `deco_skull` | Teschio | P2 | clean, mossy, candle | — | DecorationSprite ✅ |
| `deco_lantern` | Lanterna | P3 | lit, unlit | flicker | DecorationSprite ✅ |
| `deco_willow` | Salice piangente | P2 | clean, autumn | sway | DecorationSprite (new) |
| `deco_fountain_tears` | Fontana che piange | P3 | on | gocce | DecorationSprite (new) |
| `deco_flower_bed` | Aiuola | P2 | spring, withered | — | DecorationSprite (new) |
| `deco_statue` | Statua | P3 | clean, mossy | — | DecorationSprite (new) |

## 7. NPC e personaggi

Sprite con set di animazioni. Usati per simulazione ambientale **e** per il
funerale (sezione 8). `viewBox 0 0 64 96` (figure verticali).

| ID | Nome | Priorità | Animazioni | mapsTo |
|---|---|---|---|---|
| `npc_priest` | Prete | P1 | idle, walk, bless, read, bow | PriestSprite (new) |
| `npc_gravedigger` | Becchino | P1 | idle, walk, dig, sweep, talk | GravediggerSprite (new) |
| `npc_mourner_a` | Persona in lutto (adulto) | P1 | walk, stand, mourn(cry), leave | MournerSprite (new) |
| `npc_mourner_b` | Persona in lutto (alt.) | P1 | walk, stand, mourn, leave | MournerSprite (new) |
| `npc_mourner_child` | Bambino | P2 | walk, stand, leave | MournerSprite (new) |
| `npc_widow` | Vedova velata | P2 | walk, mourn, leave | MournerSprite (new) |
| `npc_ghost` | Fantasma | P1 | appear, float, vanish | GhostSprite (new) |
| `npc_crow` | Corvo | P0 | idle, hop, caw, fly | CrowSprite (new) |
| `npc_black_cat` | Gatto nero | P1 | walk, sit, stare, vanish | CatSprite (new) |
| `npc_rat` | Topo | P1 | emerge, run, hide | RatSprite (new) |
| `npc_bat` | Pipistrello | P2 | fly | BatSprite (new) |

## 8. Set Funerale (animazione sepoltura)

Asset per la scena di sepoltura (vedi feature `FuneralScene`). Stage orizzontale.

| ID | Nome | Priorità | Anim | mapsTo |
|---|---|---|---|---|
| `fun_coffin` | Bara | P1 | lower(calata) | CoffinSprite (new) |
| `fun_dirt_pile` | Cumulo di terra | P1 | shrink (mentre si riempie) | DirtPileSprite |
| `fun_shovel` | Pala | P2 | dig | ShovelSprite |
| `fun_procession` | Corteo (gruppo) | P1 | walk-in, gather, walk-out | FuneralScene (composito) |
| `fun_flowers_laid` | Fiori deposti | P1 | appear | overlay |
| `fun_banner` | Manifesto funebre | P3 | — | BannerSprite |

**Sequenza animazione** (fasi): `enter` (prete + 2–3 persone entrano da un lato)
→ `ceremony` (si dispongono attorno alla fossa, prete benedice, candele si
accendono, "R.I.P." compare) → `lower` (bara/terra) → `leave` (le persone
escono) → `reveal` (resta la nuova tomba).

## 9. Effetti e particelle (FX)

| ID | Nome | Priorità | Anim | mapsTo |
|---|---|---|---|---|
| `fx_candle_flame` | Fiamma candela | P0 | flicker | inline (DecorationSprite/Grave) |
| `fx_flame_glow` | Alone fiamma | P1 | pulse | glow |
| `fx_fog_puff` | Banco di nebbia | P0 | drift | FogLayer |
| `fx_rain_drop` | Goccia | P1 | fall | RainLayer |
| `fx_snowflake` | Fiocco | P1 | fall+sway | SnowLayer |
| `fx_leaf` | Foglia che cade | P2 | fall+spin | LeafLayer |
| `fx_ghost_wisp` | Fuoco fatuo | P1 | float+fade | WispSprite |
| `fx_dust_motes` | Pulviscolo | P2 | float | DustLayer |
| `fx_red_eyes` | Occhi rossi (notte) | P2 | blink | EyesSprite |
| `fx_blessing_light` | Luce benedizione | P2 | rays | BlessingFX |
| `fx_xp_sparkle` | Scintilla XP | P1 | burst | XpSparkle |
| `fx_soul` | Animina che sale | P2 | rise+fade | SoulSprite |

## 10. Icone categoria — enum `CATEGORIES`

Piccole icone per lo step categoria e il tag tomba. `viewBox 0 0 24 24`.

| ID | Categoria | Priorità |
|---|---|---|
| `cat_electronics` | Elettronica | P1 |
| `cat_plants` | Piante | P1 |
| `cat_clothing` | Abbigliamento | P1 |
| `cat_household` | Casalinghi | P1 |
| `cat_toys` | Giocattoli | P1 |
| `cat_tools` | Strumenti | P1 |
| `cat_vehicles` | Veicoli | P1 |
| `cat_expensive` | Oggetti costosi | P1 |
| `cat_abstract` | Cose astratte | P1 |
| `cat_other` | Altro | P1 |

## 11. UI

| ID | Nome | Priorità | Varianti | mapsTo |
|---|---|---|---|---|
| `ui_btn_primary` | Bottone primario | P0 | normal, pressed, disabled | CSS ✅ |
| `ui_btn_ghost` | Bottone ghost | P0 | — | CSS ✅ |
| `ui_btn_danger` | Bottone pericolo | P1 | — | CSS ✅ |
| `ui_sheet_frame` | Cornice bottom sheet | P0 | — | CSS ✅ |
| `ui_xp_bar` | Barra XP | P0 | — | XpBar ✅ |
| `ui_rank_badge` | Badge rango | P0 | 5 ranghi | RankBadge (new) |
| `ui_weather_icon` | Icone meteo | P0 | 7 (enum) | emoji→SVG |
| `ui_season_icon` | Icone stagione | P1 | 4 | SVG |
| `ui_notif_icons` | Icone notifiche | P0 | per categoria | SVG |
| `ui_backup_icon` | Icona backup | P0 | — | SVG |
| `ui_share_icon` | Icona condivisione | P1 | — | SVG |
| `ui_achievement_trophy` | Trofeo / lucchetto | P1 | unlocked, locked | emoji→SVG |
| `ui_toast_frame` | Cornice toast | P1 | — | CSS ✅ |
| `ui_settings_icons` | Icone hub impostazioni | P1 | 4 | emoji→SVG |

## 12. Card / Condivisione

| ID | Nome | Priorità | mapsTo |
|---|---|---|---|
| `card_certificate_frame` | Cornice certificato | P1 | shareService ✅ (base) |
| `card_ornament_border` | Bordo ornamentale | P2 | shareService |
| `card_seal` | Sigillo/timbro | P2 | shareService |
| `card_logo` | Logo NECROTHING | P1 | LogoSprite (new) |

## 13. App / PWA

| ID | Nome | Priorità | Dimensioni | mapsTo |
|---|---|---|---|---|
| `app_icon` | Icona app | P0 | 192, 512, maskable 512 | public/icons ⚠️ placeholder |
| `app_favicon` | Favicon | P0 | SVG | public/favicon.svg ✅ (placeholder) |
| `app_splash` | Splash screen | P2 | varie | (planned) |
| `app_logo_wordmark` | Logotipo testuale | P1 | SVG | (planned) |

---

## Riepilogo priorità (per pianificare la generazione)

- **P0 (MVP visivo)**: ground base, zolla, 2 lapidi + overlay fiori/erbacce,
  candela, corvo, icone meteo, UI base, icona app definitiva, set funerale base.
- **P1**: ambiente (cielo/luna/cancello/fence), meteo principale, lapidi gotica/
  spezzata, NPC funerale (prete, becchino, persone), fantasma, badge ranghi,
  certificato.
- **P2**: stagioni, decorazioni extra, FX avanzati, mausolei.
- **P3**: monumento centrale, fontana, espansioni.

## Note di generazione SVG

- Mantenere ogni asset come **componente isolato** con props `variant`/`state`/
  `size`, così da combinare gli overlay senza duplicare file.
- Animazioni: preferire **CSS/SMIL**; rispettare `prefers-reduced-motion`.
- Esportare con `currentColor` dove utile per ricolorare via CSS (stagioni).
