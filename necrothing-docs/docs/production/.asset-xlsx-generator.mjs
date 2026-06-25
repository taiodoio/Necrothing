import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');

const manifest = JSON.parse(
  readFileSync(
    '/home/user/Necrothing/necrothing-docs/docs/production/asset-manifest.json',
    'utf8',
  ),
);

const CAT_LABEL = {
  ground: 'Terreno',
  environment: 'Ambiente',
  weather: 'Meteo',
  season: 'Stagioni',
  grave: 'Lapidi',
  graveOverlay: 'Overlay lapidi',
  decoration: 'Decorazioni',
  npc: 'NPC / Personaggi',
  funeral: 'Funerale',
  fx: 'Effetti / Particelle',
  categoryIcon: 'Icone categoria',
  ui: 'UI',
  card: 'Card / Condivisione',
  app: 'App / PWA',
  currency: 'Moneta',
};
const CAT_ORDER = Object.keys(CAT_LABEL);

const NAMES = {
  tile_grass: 'Erba cimiteriale', tile_dirt: 'Terra smossa', tile_mound_fresh: 'Tumulo fresco',
  tile_plot_empty: 'Zolla libera', tile_path_dirt: 'Sentiero in terra', tile_path_stone: 'Sentiero in pietra',
  tile_mud: 'Fango', tile_snow: 'Neve (tile)', tile_leaves: 'Foglie a terra',
  bg_sky: 'Cielo (gradiente)', bg_stars: 'Stelle', bg_moon: 'Luna', bg_hills: 'Colline lontane',
  bg_treeline: 'Linea di alberi', bg_church: 'Chiesa / cripta lontana', env_gate: 'Cancello del cimitero',
  env_fence_wood: 'Staccionata in legno marcio', env_fence_iron: 'Recinzione in ferro arrugginito',
  env_wall_stone: 'Muretto gotico in pietra', env_lamp_post: 'Lampione cimiteriale',
  wx_gloomy_clear: 'Sereno cupo', wx_fog: 'Nebbia', wx_rain: 'Pioggia', wx_storm: 'Temporale',
  wx_wind: 'Vento', wx_snow: 'Neve (meteo)', wx_full_moon: 'Luna piena',
  season_spring: 'Primavera', season_summer: 'Estate', season_autumn: 'Autunno', season_winter: 'Inverno',
  grave_wood_cross: 'Croce in legno', grave_stone_simple: 'Lapide semplice', grave_gothic: 'Lapide gotica',
  grave_broken: 'Lapide spezzata', grave_angel: 'Lapide con angelo', grave_obelisk: 'Obelisco',
  grave_sarcophagus: 'Sarcofago', maus_small: 'Mausoleo piccolo', maus_tech: 'Cripta tecnologica',
  maus_luxury: 'Mausoleo di lusso', maus_central: 'Monumento centrale',
  ov_flowers_fresh: 'Fiori freschi (overlay)', ov_flowers_withered: 'Fiori appassiti (overlay)',
  ov_weeds: 'Erbacce (overlay)', ov_moss: 'Muschio (overlay)', ov_snow_cap: 'Cappello di neve (overlay)',
  ov_cobweb: 'Ragnatele (overlay)', ov_dust: 'Polvere (overlay)', ov_candle_small: 'Candela su lapide (overlay)',
  ov_anniversary_glow: 'Bagliore anniversario (overlay)',
  deco_candle: 'Candela', deco_wreath: 'Corona funebre', deco_mushroom: 'Funghi', deco_dead_tree: 'Albero secco',
  deco_skull: 'Teschio', deco_lantern: 'Lanterna', deco_willow: 'Salice piangente',
  deco_fountain_tears: 'Fontana che piange', deco_flower_bed: 'Aiuola', deco_statue: 'Statua',
  npc_priest: 'Prete', npc_gravedigger: 'Becchino', npc_mourner_a: 'Persona in lutto (A)',
  npc_mourner_b: 'Persona in lutto (B)', npc_mourner_child: 'Bambino in lutto', npc_widow: 'Vedova velata',
  npc_ghost: 'Fantasma', npc_crow: 'Corvo', npc_black_cat: 'Gatto nero', npc_rat: 'Topo', npc_bat: 'Pipistrello',
  fun_coffin: 'Bara', fun_dirt_pile: 'Cumulo di terra', fun_shovel: 'Pala', fun_flowers_laid: 'Fiori deposti',
  fun_banner: 'Manifesto funebre',
  fx_candle_flame: 'Fiamma di candela', fx_flame_glow: 'Alone della fiamma', fx_fog_puff: 'Banco di nebbia',
  fx_rain_drop: 'Goccia di pioggia', fx_snowflake: 'Fiocco di neve', fx_leaf: 'Foglia che cade',
  fx_ghost_wisp: 'Fuoco fatuo', fx_dust_motes: 'Pulviscolo', fx_red_eyes: 'Occhi rossi (notte)',
  fx_blessing_light: 'Luce della benedizione', fx_xp_sparkle: 'Scintilla XP', fx_soul: 'Animina che sale',
  cat_electronics: 'Icona: Elettronica', cat_plants: 'Icona: Piante', cat_clothing: 'Icona: Abbigliamento',
  cat_household: 'Icona: Casalinghi', cat_toys: 'Icona: Giocattoli', cat_tools: 'Icona: Strumenti',
  cat_vehicles: 'Icona: Veicoli', cat_expensive: 'Icona: Oggetti costosi', cat_abstract: 'Icona: Cose astratte',
  cat_other: 'Icona: Altro',
  ui_rank_badge: 'Badge rango', ui_weather_icon: 'Icone meteo', ui_season_icon: 'Icone stagione',
  ui_backup_icon: 'Icona backup', ui_share_icon: 'Icona condivisione', ui_achievement_trophy: 'Trofeo / lucchetto',
  card_certificate_frame: 'Cornice certificato', card_ornament_border: 'Bordo ornamentale',
  card_seal: 'Sigillo / timbro', card_logo: 'Logo (card)',
  app_icon: 'Icona app', app_favicon: 'Favicon', app_splash: 'Splash screen', app_logo_wordmark: 'Logotipo testuale',
  currency_wisp: 'Fuoco fatuo (moneta)',
};

// Brief di disegno (forma, palette, dettagli) per la creazione a mano.
const DESC = {
  tile_grass: 'Tile erba scura cimiteriale, ciuffi sparsi, leggera variazione tonale; bordo che si fonde coi vicini.',
  tile_dirt: 'Terra smossa marrone, zolle e piccoli sassi; tono più caldo dell’erba.',
  tile_mound_fresh: 'Tumulo bombato di terra fresca scura, forma ovale, ombra sotto.',
  tile_plot_empty: 'Rettangolo di terra liscia con due solchi, invito a seppellire; più scura dell’erba.',
  tile_path_dirt: 'Sentiero in terra battuta chiara con bordi irregolari; varianti per direzione e incrocio.',
  tile_path_stone: 'Lastre di pietra grigio-viola con fughe scure; muschio negli interstizi.',
  tile_mud: 'Fango lucido marrone con pozze; riflessi scuri.',
  tile_snow: 'Neve azzurrina con piccole impronte/ombre.',
  tile_leaves: 'Foglie secche autunnali sparse (ambra, ruggine) su erba.',
  bg_sky: 'Gradiente verticale: alba rosata, giorno grigio cupo, tramonto viola, notte blu-nero.',
  bg_stars: 'Puntini stellari su trasparente, densità media; alcune più luminose.',
  bg_moon: 'Disco luna pallido con crateri; alone soft; varianti piena/falce.',
  bg_hills: 'Silhouette di colline scure stratificate sull’orizzonte.',
  bg_treeline: 'Sagome di alberi spogli neri in fila; chiome irregolari.',
  bg_church: 'Silhouette gotica di chiesetta/cripta con campanile; finestre fioche di notte.',
  env_gate: 'Cancello in ferro battuto a due ante con arco e croce; versione aperta/chiusa, ruggine.',
  env_fence_wood: 'Assi verticali di legno marcio storte, traversa orizzontale; pezzi dritto/angolo/fine/cancello.',
  env_fence_iron: 'Sbarre verticali appuntite in ferro arrugginito con traversa; pezzi modulari.',
  env_wall_stone: 'Muretto gotico di blocchi di pietra muschiati; pezzi dritto/angolo/T/cancello.',
  env_lamp_post: 'Lampione nero alto con lanterna; alone ambra acceso, spento neutro.',
  wx_gloomy_clear: 'Cielo coperto cupo, nuvole grigie lente; nessuna pioggia.',
  wx_fog: 'Banchi di nebbia grigio-azzurra semitrasparenti che scorrono orizzontali.',
  wx_rain: 'Linee di pioggia diagonali sottili, tinta bluastra; gocce sul terreno.',
  wx_storm: 'Pioggia fitta + lampi bianchi improvvisi; cielo molto scuro.',
  wx_wind: 'Folate con particelle/foglie che attraversano lo schermo.',
  wx_snow: 'Fiocchi bianchi che scendono ondeggiando; tinta fredda.',
  wx_full_moon: 'Notte rischiarata: alone bluastro dalla luna, ombre nette.',
  season_spring: 'Tocco primaverile: fiorellini sparsi, erba più viva.',
  season_summer: 'Erba secca giallastra, terra screpolata.',
  season_autumn: 'Foglie ambrate a terra, zucche di Halloween.',
  season_winter: 'Manto di neve, candele festive, rami spogli.',
  grave_wood_cross: 'Croce di legno semplice piantata in un tumulo; venature, leggermente storta (2×2).',
  grave_stone_simple: 'Lapide arrotondata in pietra grigia, base nel terreno; sobria (2×2).',
  grave_gothic: 'Lapide gotica ad arco a sesto acuto, croce incisa, candela alla base (2×2).',
  grave_broken: 'Lapide spezzata a metà, frammento a terra; trascurata (2×2).',
  grave_angel: 'Lapide sormontata da statuetta d’angelo dolente (2×2).',
  grave_obelisk: 'Obelisco affusolato su basamento; elegante (2×2).',
  grave_sarcophagus: 'Sarcofago in pietra con coperchio decorato (2×2).',
  maus_small: 'Piccolo mausoleo con porta e tettuccio; pietra o gotico (3×3).',
  maus_tech: 'Cripta tech con insegne al neon; spento/acceso (3×3).',
  maus_luxury: 'Mausoleo di lusso in marmo con dettagli dorati (3×3).',
  maus_central: 'Monumento centrale imponente con fontana/statua (3×3+).',
  ov_flowers_fresh: 'Mazzetto di fiori freschi colorati deposto alla base della lapide.',
  ov_flowers_withered: 'Fiori secchi marroni, steli piegati.',
  ov_weeds: 'Ciuffi di erbacce verdi disordinate attorno alla base.',
  ov_moss: 'Chiazze di muschio verde su pietra, lato in ombra.',
  ov_snow_cap: 'Strato di neve sul bordo superiore della lapide.',
  ov_cobweb: 'Ragnatele sottili negli angoli con ragnetto.',
  ov_dust: 'Velo di polvere/sporco grigiastro semitrasparente.',
  ov_candle_small: 'Candelina accesa appoggiata sulla lapide, fiammella.',
  ov_anniversary_glow: 'Aura ambra pulsante attorno alla lapide.',
  deco_candle: 'Candela bianca consumata con fiamma ambra e piccolo alone (1×1).',
  deco_wreath: 'Corona funebre circolare di rami verdi con fiori (1×1).',
  deco_mushroom: 'Gruppetto di funghi pixel; di notte leggermente luminescenti (1×1).',
  deco_dead_tree: 'Alberello secco contorto, rami spogli; possibile corvo (1×1).',
  deco_skull: 'Teschio bianco a terra, orbite scure (1×1).',
  deco_lantern: 'Lanterna da posa con vetro ambra e fiammella (1×1).',
  deco_willow: 'Salice piangente con chioma cadente che ondeggia (2×2).',
  deco_fountain_tears: 'Fontanella che gocciola “lacrime”; pietra muschiata (2×2).',
  deco_flower_bed: 'Aiuola rettangolare con fiori; appassita in inverno.',
  deco_statue: 'Statua dolente in pietra su piedistallo (1×1).',
  npc_priest: 'Figura in tonaca nera con stola viola e collare bianco, croce in mano; animazioni idle/cammina/benedice/legge/inchino.',
  npc_gravedigger: 'Becchino tozzo con pala e cappello; idle/cammina/scava/spazza/parla.',
  npc_mourner_a: 'Persona in lutto in cappotto scuro, testa china; cammina/sta/piange/va via.',
  npc_mourner_b: 'Variante in lutto (colore/corporatura diversi).',
  npc_mourner_child: 'Bambino in lutto, più piccolo; cammina/sta/va via.',
  npc_widow: 'Vedova con velo nero sul volto; cammina/piange/va via.',
  npc_ghost: 'Spettro traslucido azzurrino fluttuante; appare/galleggia/svanisce.',
  npc_crow: 'Corvo nero lucido; idle/saltella/gracchia/vola.',
  npc_black_cat: 'Gatto nero con occhi gialli; cammina/siede/fissa/svanisce.',
  npc_rat: 'Topo grigio piccolo; emerge/corre/si nasconde.',
  npc_bat: 'Pipistrello scuro in volo a zig-zag.',
  fun_coffin: 'Bara di legno scuro con maniglie; animazione di calata.',
  fun_dirt_pile: 'Cumulo di terra con pala piantata; si riduce mentre si riempie.',
  fun_shovel: 'Pala da becchino, manico in legno, lama metallica.',
  fun_flowers_laid: 'Fiori deposti sul tumulo dopo la cerimonia.',
  fun_banner: 'Manifesto funebre stile necrologio con cornice nera.',
  fx_candle_flame: 'Piccola fiamma ambra a goccia che tremola.',
  fx_flame_glow: 'Alone caldo morbido attorno alla fiamma, pulsa.',
  fx_fog_puff: 'Sbuffo di nebbia ovale sfumato semitrasparente.',
  fx_rain_drop: 'Singola goccia/striscia di pioggia.',
  fx_snowflake: 'Fiocco di neve bianco semplice.',
  fx_leaf: 'Foglia ambrata che cade ruotando.',
  fx_ghost_wisp: 'Fuoco fatuo spettrale azzurro fluttuante (effetto ambientale).',
  fx_dust_motes: 'Pulviscolo luminoso sospeso che fluttua piano.',
  fx_red_eyes: 'Coppia di occhi rossi nel buio che sbattono.',
  fx_blessing_light: 'Raggi di luce divina dorati dall’alto.',
  fx_xp_sparkle: 'Scintille che esplodono brevemente (feedback XP).',
  fx_soul: 'Animina luminosa che sale e svanisce.',
  cat_electronics: 'Icona: spina/chip stilizzato.',
  cat_plants: 'Icona: vaso con piantina.',
  cat_clothing: 'Icona: maglietta.',
  cat_household: 'Icona: tazza/utensile casa.',
  cat_toys: 'Icona: orsetto/giocattolo.',
  cat_tools: 'Icona: chiave inglese/martello.',
  cat_vehicles: 'Icona: auto/ruota.',
  cat_expensive: 'Icona: gemma/sacchetto di soldi.',
  cat_abstract: 'Icona: nuvoletta/spirale concettuale.',
  cat_other: 'Icona: punto interrogativo/scatola.',
  ui_rank_badge: 'Distintivo araldico per rango (5 livelli, dal semplice all’ornato).',
  ui_weather_icon: 'Set icone meteo coerenti (sole cupo, nebbia, pioggia, ecc.).',
  ui_season_icon: 'Set icone stagioni (fiore, sole, foglia, fiocco).',
  ui_backup_icon: 'Icona dischetto/salvataggio in stile gotico.',
  ui_share_icon: 'Icona condivisione (pergamena/frecce).',
  ui_achievement_trophy: 'Trofeo per sbloccato e lucchetto per bloccato.',
  card_certificate_frame: 'Cornice ornata da “Certificato di Morte”, decori funebri.',
  card_ornament_border: 'Bordo decorativo gotico per la card.',
  card_seal: 'Sigillo in ceralacca/timbro del cimitero.',
  card_logo: 'Logo NECROTHING per la card.',
  app_icon: 'Icona app: lapide stilizzata su sfondo scuro, leggibile a piccole dimensioni.',
  app_favicon: 'Favicon: lapide minimale.',
  app_splash: 'Schermata di avvio: titolo + cancello del cimitero al chiaro di luna.',
  app_logo_wordmark: 'Logotipo testuale “NECROTHING” gotico.',
  currency_wisp: 'Fuoco fatuo: fiammella verde-acqua con alone, fluttua e pulsa; è la moneta da raccogliere (1×1).',
};

function footprintFor(a) {
  if (a.footprint) return a.footprint;
  if (a.category === 'grave') return a.id.startsWith('maus') ? '3×3' : '2×2';
  if (a.id === 'deco_willow' || a.id === 'deco_fountain_tears') return '2×2';
  if (a.category === 'decoration' || a.category === 'currency') return '1×1';
  return '';
}

const STATE_DESC = {
  clean: 'Pulito / base, nessun degrado',
  dusty: 'Impolverato: velo di polvere/sporco',
  mossy: 'Muschioso: chiazze di muschio alla base',
  cracked: 'Crepato: crepe sottili',
  cobweb: 'Con ragnatele agli angoli',
  snowy: 'Innevato: cappello di neve',
  leafy: 'Con foglie d’autunno',
  flowers: 'Con fiori freschi deposti',
  withered: 'Con fiori appassiti / secchi',
  weeds: 'Con erbacce',
  lit: 'Acceso: fiamma/luce attiva',
  unlit: 'Spento: senza fiamma',
  anniversaryGlow: 'Bagliore pulsante nei giorni di anniversario',
  night: 'Variante notturna (toni freddi + luci)',
  dry: 'Erba/terreno secco (estate)',
  decorated: 'Versione decorata',
  neon_off: 'Neon spento',
  neon_on: 'Neon acceso',
  marble: 'Marmo',
  gold: 'Oro',
  fresh: 'Fresco',
  consumed: 'Consumato',
  glowing: 'Luminescente (notte)',
  crow: 'Con corvo posato',
  autumn: 'Versione autunnale',
  on: 'Attivo',
  spring: 'Versione primaverile',
};

const ANIM_DESC = {
  settle: 'Assestamento del tumulo dopo la sepoltura',
  hover: 'Leggero evidenziamento al passaggio/selezione',
  drift: 'Scorrimento lento (nebbia/foglie)',
  phaseTransition: 'Transizione tra fasi del giorno (alba→notte)',
  twinkle: 'Scintillio',
  glowPulse: 'Alone pulsante',
  sway: 'Oscillazione (vento)',
  openClose: 'Apertura / chiusura',
  flicker: 'Tremolio (luce)',
  cloudsDrift: 'Nuvole che scorrono',
  fall: 'Caduta (pioggia / neve)',
  lightning: 'Lampo',
  lateralDrift: 'Spostamento laterale (vento)',
  glow: 'Bagliore',
  leafFall: 'Foglie che cadono',
  snow: 'Nevicata',
  candle: 'Candela accesa che tremola',
  flame: 'Fiamma viva',
  pulse: 'Pulsazione',
  fountain: 'Getto / gocce della fontana',
  idle: 'Posa a riposo',
  walk: 'Camminata',
  bless: 'Benedizione (prete)',
  read: 'Lettura',
  bow: 'Inchino',
  dig: 'Scavo',
  sweep: 'Spazzata',
  talk: 'Parlato',
  stand: 'In piedi (statico)',
  mourn: 'Cordoglio (testa china, pianto)',
  leave: 'Allontanamento',
  appear: 'Comparsa',
  float: 'Fluttuazione',
  vanish: 'Dissolvenza / sparizione',
  hop: 'Saltello',
  caw: 'Gracchio (apertura becco)',
  fly: 'Volo',
  emerge: 'Emergere dal terreno',
  run: 'Corsa',
  hide: 'Nascondersi',
  lower: 'Calata (bara)',
  shrink: 'Riduzione progressiva',
  drip: 'Gocciolamento',
  spin: 'Rotazione',
  fade: 'Dissolvenza',
  blink: 'Ammiccare (occhi)',
  rays: 'Raggi di luce',
  burst: 'Scoppio / esplosione',
  rise: 'Salita verso l’alto',
};

function statoLavorazione(a) {
  if (a.done) return '✅ Fatto';
  if (a.placeholder) return '⚠️ Placeholder';
  return '⬜ Da creare';
}

const PRIO_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
const assets = [...manifest.assets].sort((a, b) => {
  const c = CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category);
  if (c !== 0) return c;
  return (PRIO_ORDER[a.priority] ?? 9) - (PRIO_ORDER[b.priority] ?? 9);
});

const wb = new ExcelJS.Workbook();
wb.creator = 'NECROTHING';
wb.created = new Date(0);

// ---------- Foglio principale ----------
const ws = wb.addWorksheet('Asset', { views: [{ state: 'frozen', ySplit: 1 }] });
const COLS = [
  { header: 'ID', key: 'id', width: 20 },
  { header: 'Nome', key: 'nome', width: 26 },
  { header: 'Descrizione visiva', key: 'desc', width: 58 },
  { header: 'Categoria', key: 'categoria', width: 16 },
  { header: 'Priorità', key: 'priorita', width: 9 },
  { header: 'Footprint', key: 'footprint', width: 10 },
  { header: 'Varianti', key: 'varianti', width: 26 },
  { header: 'Stati', key: 'stati', width: 34 },
  { header: 'Animazioni', key: 'animazioni', width: 30 },
  { header: 'Dimensione (viewBox)', key: 'dim', width: 16 },
  { header: 'Stato lavorazione', key: 'stato', width: 16 },
  { header: 'Componente', key: 'componente', width: 18 },
  { header: 'Fatto da te', key: 'fattoda', width: 12 },
  { header: 'Note', key: 'note', width: 36 },
];
ws.columns = COLS;

for (const a of assets) {
  ws.addRow({
    id: a.id,
    nome: NAMES[a.id] ?? a.id,
    desc: DESC[a.id] ?? '',
    categoria: CAT_LABEL[a.category] ?? a.category,
    priorita: a.priority ?? '',
    footprint: footprintFor(a),
    varianti: (a.variants ?? []).join(', '),
    stati: (a.states ?? []).join(', '),
    animazioni: (a.animations ?? []).join(', '),
    dim: a.viewBox ?? '',
    stato: statoLavorazione(a),
    componente: a.mapsTo ?? '',
    fattoda: '',
    note: '',
  });
}

// stile header
const header = ws.getRow(1);
header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A2640' } };
header.alignment = { vertical: 'middle' };
header.height = 22;
ws.autoFilter = { from: 'A1', to: 'N1' };

// wrap + bordi leggeri + zebra
ws.eachRow((row, n) => {
  row.alignment = { vertical: 'top', wrapText: true };
  if (n > 1 && n % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F1F8' } };
    });
  }
});

// ---------- Riepilogo ----------
const sum = wb.addWorksheet('Riepilogo');
sum.columns = [
  { header: 'Categoria', key: 'cat', width: 22 },
  { header: 'Totale', key: 'tot', width: 10 },
  { header: 'P0', key: 'p0', width: 8 },
  { header: 'P1', key: 'p1', width: 8 },
  { header: 'P2', key: 'p2', width: 8 },
  { header: 'P3', key: 'p3', width: 8 },
  { header: 'Già fatti', key: 'done', width: 12 },
];
for (const c of CAT_ORDER) {
  const items = assets.filter((a) => a.category === c);
  if (!items.length) continue;
  sum.addRow({
    cat: CAT_LABEL[c],
    tot: items.length,
    p0: items.filter((a) => a.priority === 'P0').length,
    p1: items.filter((a) => a.priority === 'P1').length,
    p2: items.filter((a) => a.priority === 'P2').length,
    p3: items.filter((a) => a.priority === 'P3').length,
    done: items.filter((a) => a.done).length,
  });
}
sum.addRow({});
sum.addRow({
  cat: 'TOTALE',
  tot: assets.length,
  p0: assets.filter((a) => a.priority === 'P0').length,
  p1: assets.filter((a) => a.priority === 'P1').length,
  p2: assets.filter((a) => a.priority === 'P2').length,
  p3: assets.filter((a) => a.priority === 'P3').length,
  done: assets.filter((a) => a.done).length,
});
sum.getRow(1).font = { bold: true };
sum.lastRow.font = { bold: true };

// ---------- Legenda stati ----------
const ls = wb.addWorksheet('Legenda stati');
ls.columns = [
  { header: 'Stato', key: 's', width: 20 },
  { header: 'Descrizione', key: 'd', width: 60 },
];
const usedStates = new Set();
assets.forEach((a) => (a.states ?? []).forEach((s) => usedStates.add(s)));
for (const s of [...usedStates].sort()) {
  ls.addRow({ s, d: STATE_DESC[s] ?? '(variante specifica)' });
}
ls.getRow(1).font = { bold: true };

// ---------- Legenda animazioni ----------
const la = wb.addWorksheet('Legenda animazioni');
la.columns = [
  { header: 'Animazione', key: 'a', width: 20 },
  { header: 'Descrizione', key: 'd', width: 60 },
];
const usedAnims = new Set();
assets.forEach((a) => (a.animations ?? []).forEach((x) => usedAnims.add(x)));
for (const x of [...usedAnims].sort()) {
  la.addRow({ a: x, d: ANIM_DESC[x] ?? '' });
}
la.getRow(1).font = { bold: true };

const out = '/home/user/Necrothing/necrothing-docs/docs/production/asset-list.xlsx';
await wb.xlsx.writeFile(out);
console.log('written', out, '| righe asset:', assets.length);
