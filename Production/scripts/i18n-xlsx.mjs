// Sincronizza le traduzioni col workbook Excel mantenendo intatto l'originale.
// Uso: node scripts/i18n-xlsx.mjs sync [input.xlsx] [output.xlsx]
//      node scripts/i18n-xlsx.mjs check [input.xlsx]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INPUT = path.resolve(ROOT, '../CMS/Necrothing CMS - traduzioni.xlsx');
const DEFAULT_OUTPUT = path.join(ROOT, 'docs/(Fase 4).xlsx');
const IT_DIR = path.join(ROOT, 'src/i18n/it');
const EN_EXTRA_FILE = path.join(ROOT, 'src/i18n/en-extra.ts');
const LANGS = [
  ['it', 'Italiano'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'],
  ['es', 'Español'], ['pt', 'Português'], ['zh-Hans', 'Chinese (Simplified)'],
  ['zh-Hant', 'Chinese (Traditional)'], ['ja', 'Japanese'], ['ko', 'Korean'],
];
const NATIVE_NAMES = { it: 'Italiano', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', pt: 'Português', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文', ja: '日本語', ko: '한국어' };
const REMOVED_KEYS = [
  'game.debug.style', 'demo.grave.name', 'demo.grave.epitaph', 'page.bench.title', 'look.ui.styleNote',
  'settings.assetGallery', 'settings.info', 'settings.build.dev', 'settings.build.version', 'settings.build.distribution',
  'settings.section.onboarding', 'game.pet.freeOld', 'shop.intro.classic#one', 'shop.intro.classic#other',
  'inventory.sell#one', 'inventory.sell#other',
];
const RECOVERED = {
  it: { 'detail.business.ready#one': '+{n} pronto da riscuotere ({min}–{max} fuochi fatui al giorno, fino a {cap})', 'detail.business.ready#other': '+{n} pronti da riscuotere ({min}–{max} fuochi fatui al giorno, fino a {cap})', 'inventory.sellGain': '+{n}' },
  en: { 'detail.business.ready#one': '+{n} ready to collect ({min}–{max} wisps per day, up to {cap})', 'detail.business.ready#other': '+{n} ready to collect ({min}–{max} wisps per day, up to {cap})', 'inventory.sellGain': '+{n}' },
  de: { 'detail.business.ready#one': '+{n} abholbereit ({min}–{max} Irrlichter pro Tag, bis zu {cap})', 'detail.business.ready#other': '+{n} abholbereit ({min}–{max} Irrlichter pro Tag, bis zu {cap})', 'inventory.sellGain': '+{n}' },
  fr: { 'detail.business.ready#one': '+{n} prêt à récupérer ({min}–{max} feux follets par jour, jusqu’à {cap})', 'detail.business.ready#other': '+{n} prêts à récupérer ({min}–{max} feux follets par jour, jusqu’à {cap})', 'inventory.sellGain': '+{n}' },
  es: { 'detail.business.ready#one': '+{n} listo para recoger ({min}–{max} fuegos fatuos al día, hasta {cap})', 'detail.business.ready#other': '+{n} listos para recoger ({min}–{max} fuegos fatuos al día, hasta {cap})', 'inventory.sellGain': '+{n}' },
  pt: { 'detail.business.ready#one': '+{n} pronto a recolher ({min}–{max} fogos-fátuos por dia, até {cap})', 'detail.business.ready#other': '+{n} prontos a recolher ({min}–{max} fogos-fátuos por dia, até {cap})', 'inventory.sellGain': '+{n}' },
  'zh-Hans': { 'detail.business.ready#one': '+{n} 可领取（每天 {min}–{max} 个鬼火，上限 {cap}）', 'detail.business.ready#other': '+{n} 可领取（每天 {min}–{max} 个鬼火，上限 {cap}）', 'inventory.sellGain': '+{n}' },
  'zh-Hant': { 'detail.business.ready#one': '+{n} 可領取（每天 {min}–{max} 個鬼火，上限 {cap}）', 'detail.business.ready#other': '+{n} 可領取（每天 {min}–{max} 個鬼火，上限 {cap}）', 'inventory.sellGain': '+{n}' },
  ja: { 'detail.business.ready#one': '+{n}受け取り可能（1日あたり鬼火{min}～{max}、上限{cap}）', 'detail.business.ready#other': '+{n}受け取り可能（1日あたり鬼火{min}～{max}、上限{cap}）', 'inventory.sellGain': '+{n}' },
  ko: { 'detail.business.ready#one': '+{n}개 수령 가능 (하루 위스프 {min}~{max}개, 최대 {cap}개)', 'detail.business.ready#other': '+{n}개 수령 가능 (하루 위스프 {min}~{max}개, 최대 {cap}개)', 'inventory.sellGain': '+{n}' },
};
const TEXT_OVERRIDES = {
  'hud.tools.pan': { it: 'Sposta la vista', en: 'Pan view', de: 'Ansicht verschieben', fr: 'Déplacer la vue', es: 'Mover vista', pt: 'Mover vista', 'zh-Hans': '移动视角', 'zh-Hant': '移動視角', ja: '視点を移動', ko: '시점 이동' },
  'hud.tools.move': { it: 'Sposta elemento', en: 'Move item', de: 'Objekt verschieben', fr: 'Déplacer l’objet', es: 'Mover objeto', pt: 'Mover objeto', 'zh-Hans': '移动物品', 'zh-Hant': '移動物件', ja: 'アイテムを移動', ko: '물건 이동' },
  'hud.tools.draw': { it: 'Disegna', en: 'Draw', de: 'Zeichnen', fr: 'Tracer', es: 'Dibujar', pt: 'Desenhar', 'zh-Hans': '绘制', 'zh-Hant': '繪製', ja: '描く', ko: '그리기' },
  'hud.tools.undo': { it: 'Annulla ultima modifica', en: 'Undo last change', de: 'Letzte Änderung rückgängig', fr: 'Annuler la dernière modification', es: 'Deshacer último cambio', pt: 'Desfazer última alteração', 'zh-Hans': '撤销上一步', 'zh-Hant': '復原上一步', ja: '直前の変更を元に戻す', ko: '마지막 변경 취소' },
  'hud.tools.drawGuide': {
    it: 'Tocca {hand} per spostarti sulla mappa. Tocca {tool} per disegnare.',
    en: 'Tap {hand} to move around the map. Tap {tool} to draw.',
    de: 'Tippe auf {hand}, um die Karte zu bewegen. Tippe auf {tool}, um zu zeichnen.',
    fr: 'Touche {hand} pour te déplacer sur la carte. Touche {tool} pour tracer.',
    es: 'Toca {hand} para moverte por el mapa. Toca {tool} para dibujar.',
    pt: 'Toca em {hand} para te moveres pelo mapa. Toca em {tool} para desenhar.',
    'zh-Hans': '点击{hand}移动地图。点击{tool}绘制。',
    'zh-Hant': '點擊{hand}移動地圖。點擊{tool}繪製。',
    ja: '{hand}をタップしてマップを移動。{tool}をタップして描きます。',
    ko: '{hand}을 눌러 지도를 이동하고 {tool}을 눌러 그리세요.',
  },
  'hud.tools.moveGuide': {
    it: 'Tocca {hand} per spostarti sulla mappa. Tocca {tool} per selezionare e spostare un oggetto.',
    en: 'Tap {hand} to move around the map. Tap {tool} to select and move an object.',
    de: 'Tippe auf {hand}, um die Karte zu bewegen. Tippe auf {tool}, um ein Objekt auszuwählen und zu verschieben.',
    fr: 'Touche {hand} pour te déplacer sur la carte. Touche {tool} pour sélectionner et déplacer un objet.',
    es: 'Toca {hand} para moverte por el mapa. Toca {tool} para seleccionar y mover un objeto.',
    pt: 'Toca em {hand} para te moveres pelo mapa. Toca em {tool} para selecionar e mover um objeto.',
    'zh-Hans': '点击{hand}移动地图。点击{tool}选择并移动物品。',
    'zh-Hant': '點擊{hand}移動地圖。點擊{tool}選取並移動物件。',
    ja: '{hand}をタップしてマップを移動。{tool}をタップしてアイテムを選び、移動します。',
    ko: '{hand}을 눌러 지도를 이동하고 {tool}을 눌러 물건을 선택하고 이동하세요.',
  },
  'hud.tools.panHint': {
    it: 'Trascina la mappa per spostarti; usa due dita per zoomare. Tocca un elemento per i dettagli.', en: 'Drag the map to move around; pinch to zoom. Tap an item for details.', de: 'Ziehe die Karte zum Bewegen und zoome mit zwei Fingern. Tippe auf ein Objekt für Details.', fr: 'Fais glisser la carte pour te déplacer et pince pour zoomer. Touche un objet pour ses détails.', es: 'Arrastra el mapa para desplazarte y pellizca para ampliar. Toca un objeto para ver sus detalles.', pt: 'Arrasta o mapa para te moveres e usa dois dedos para ampliar. Toca num objeto para ver os detalhes.', 'zh-Hans': '拖动地图移动视角，双指缩放。点击物品查看详情。', 'zh-Hant': '拖動地圖移動視角，雙指縮放。點擊物件查看詳情。', ja: 'マップをドラッグして移動、ピンチで拡大縮小。アイテムをタップすると詳細を表示。', ko: '지도를 드래그해 이동하고 두 손가락으로 확대하세요. 물건을 눌러 상세 정보를 보세요.',
  },
  'hud.tools.moveHint': { it: 'Tocca un elemento per i dettagli o trascinalo per spostarlo.', en: 'Tap an item for details or drag it to move it.', de: 'Tippe auf ein Objekt für Details oder ziehe es zum Verschieben.', fr: 'Touche un objet pour ses détails ou fais-le glisser pour le déplacer.', es: 'Toca un objeto para ver sus detalles o arrástralo para moverlo.', pt: 'Toca num objeto para ver os detalhes ou arrasta-o para o mover.', 'zh-Hans': '点击物品查看详情，或拖动以移动。', 'zh-Hant': '點擊物件查看詳情，或拖動以移動。', ja: 'アイテムをタップで詳細表示、ドラッグで移動。', ko: '물건을 누르면 상세 정보가 보이고 드래그하면 이동해요.' },
  'hud.tools.drawHint': { it: 'Tocca la mappa per aggiungere o togliere un elemento. Trascina sulla mappa per tracciare: il percorso curva automaticamente.', en: 'Tap the map to add or remove an item. Drag across the map to draw: the path turns automatically.', de: 'Tippe auf die Karte, um ein Element hinzuzufügen oder zu entfernen. Ziehe über die Karte zum Zeichnen: Der Weg biegt automatisch ab.', fr: 'Touche la carte pour ajouter ou retirer un élément. Fais glisser sur la carte pour tracer : le chemin tourne automatiquement.', es: 'Toca el mapa para añadir o quitar un elemento. Arrastra sobre el mapa para trazar: el camino gira solo.', pt: 'Toca no mapa para adicionar ou remover um elemento. Arrasta no mapa para traçar: o percurso curva automaticamente.', 'zh-Hans': '点击地图添加或移除一格。拖动地图绘制路径，转弯会自动完成。', 'zh-Hant': '點擊地圖新增或移除一格。拖動地圖繪製路徑，轉彎會自動完成。', ja: 'マップをタップして追加・削除。マップをドラッグして描くと、道は自動で曲がります。', ko: '지도를 눌러 추가하거나 제거하세요. 지도를 드래그해 그리면 길이 자동으로 꺾여요.' },
  'edit.intro.text': { it: 'In Modifica scegli la mano per spostare la vista o le frecce per trascinare un elemento. Tocca la lente per i dettagli, la freccia circolare per annullare e la spunta per confermare.', en: 'In Edit, choose the hand to move the view or the arrows to drag an item. Tap the magnifier for details, the curved arrow to undo and the checkmark to confirm.', de: 'Wähle im Bearbeitungsmodus die Hand zum Bewegen der Ansicht oder die Pfeile zum Verschieben eines Objekts. Die Lupe zeigt Details, der runde Pfeil macht rückgängig und der Haken bestätigt.', fr: 'En mode modification, choisis la main pour déplacer la vue ou les flèches pour déplacer un objet. La loupe affiche les détails, la flèche annule et la coche confirme.', es: 'En edición, elige la mano para mover la vista o las flechas para mover un objeto. La lupa muestra detalles, la flecha deshace y la marca confirma.', pt: 'Em edição, escolhe a mão para mover a vista ou as setas para mover um objeto. A lupa mostra detalhes, a seta desfaz e o visto confirma.', 'zh-Hans': '在编辑模式中，选择手形移动视角，或选择箭头拖动物品。点击放大镜查看详情、弯箭头撤销、对勾确认。', 'zh-Hant': '在編輯模式中，選擇手形移動視角，或選擇箭頭拖動物件。點擊放大鏡查看詳情、彎箭頭復原、勾號確認。', ja: '編集では手で視点を動かし、矢印でアイテムを移動します。虫眼鏡で詳細、曲がった矢印で取り消し、チェックで確定します。', ko: '편집에서 손을 선택해 시점을, 화살표를 선택해 물건을 이동하세요. 돋보기는 상세 정보, 굽은 화살표는 취소, 체크 표시는 확인이에요.' },
  'onboarding.yard.place': {
    it: 'Fatto! Sposta la lanterna dove vuoi e tocca la spunta per posarla. Quello che compri e non posi aspetta nell’Inventario, nel menu: da lì puoi anche rivenderlo.',
    en: 'Done! Move the lantern wherever you like and tap the checkmark to place it. Anything you buy but do not place stays in the Inventory in the menu, where you can also sell it.',
    de: 'Geschafft! Verschiebe die Laterne an den gewünschten Ort und tippe auf den Haken. Gekaufte, nicht platzierte Gegenstände bleiben im Inventar im Menü und können dort verkauft werden.',
    fr: 'C’est fait ! Déplace la lanterne où tu veux et touche la coche pour la placer. Les objets achetés mais non placés restent dans l’Inventaire du menu, où tu peux aussi les revendre.',
    es: '¡Listo! Mueve la linterna donde quieras y toca la marca para colocarla. Lo que compres y no coloques queda en el Inventario del menú, donde también puedes venderlo.',
    pt: 'Feito! Move a lanterna para onde quiseres e toca no visto para a colocar. O que comprares e não colocares fica no Inventário do menu, onde também o podes vender.',
    'zh-Hans': '买好了！将灯笼移到喜欢的位置，点击对勾放置。购买后尚未放置的物品会留在菜单的背包中，也可以在那里转卖。',
    'zh-Hant': '買好了！將燈籠移到喜歡的位置，點擊勾號放置。購買後尚未放置的物品會留在選單的背包中，也可以在那裡轉賣。',
    ja: '買えました！ランタンを好きな場所へ動かし、チェックをタップして置きましょう。購入後に置いていないアイテムはメニューのインベントリに残り、そこで売ることもできます。',
    ko: '잘했어요! 등불을 원하는 곳으로 옮기고 체크 표시를 눌러 배치하세요. 구매 후 배치하지 않은 물건은 메뉴의 보관함에 남으며 거기서 판매할 수도 있어요.',
  },
  'onboarding.yard.edit': { it: 'Apri il menu e scegli Modifica, poi trascina la lanterna dove preferisci. Quando hai finito, tocca la spunta.', en: 'Open the menu and choose Edit, then drag the lantern wherever you like. When finished, tap the checkmark.', de: 'Öffne das Menü und wähle Bearbeiten. Ziehe die Laterne an den gewünschten Ort und tippe auf den Haken.', fr: 'Ouvre le menu et choisis Modifier, puis fais glisser la lanterne. Une fois terminé, touche la coche.', es: 'Abre el menú y elige Editar; arrastra la linterna donde quieras. Al terminar, toca la marca.', pt: 'Abre o menu e escolhe Editar, depois arrasta a lanterna para onde quiseres. Ao terminar, toca no visto.', 'zh-Hans': '打开菜单并选择编辑，将灯笼拖到喜欢的位置。完成后点击对勾。', 'zh-Hant': '開啟選單並選擇編輯，將燈籠拖到喜歡的位置。完成後點擊勾號。', ja: 'メニューで編集を選び、ランタンを好きな場所にドラッグ。終わったらチェックをタップ。', ko: '메뉴에서 편집을 선택하고 등불을 원하는 곳으로 드래그하세요. 끝나면 체크 표시를 누르세요.' },
  'tree.memory.free': {
    it: 'Libera ricordo', en: 'Release Memory', de: 'Erinnerung freigeben', fr: 'Libérer le souvenir', es: 'Liberar recuerdo', pt: 'Libertar memória',
    'zh-Hans': '放下回忆', 'zh-Hant': '放下回憶', ja: '思い出を手放す', ko: '추억 놓아주기',
  },
  'look.ui.sparkle': {
    it: 'Pelle hoa hoa hoa ✨', en: 'Hoa hoa hoa skin ✨', de: 'Hoa-hoa-hoa-Haut ✨', fr: 'Peau hoa hoa hoa ✨', es: 'Piel hoa hoa hoa ✨', pt: 'Pele hoa hoa hoa ✨',
    'zh-Hans': '花哇花哇花哇皮肤 ✨', 'zh-Hant': '花哇花哇花哇皮膚 ✨', ja: 'ホアホアホア肌 ✨', ko: '호아 호아 호아 피부 ✨',
  },
  'ctx.undoMove': {
    it: 'Annulla spostamento', en: 'Undo move', de: 'Verschieben rückgängig', fr: 'Annuler le déplacement', es: 'Deshacer movimiento', pt: 'Desfazer movimento',
    'zh-Hans': '撤销移动', 'zh-Hant': '復原移動', ja: '移動を元に戻す', ko: '이동 취소',
  },
  'page.description': {
    it: 'Necrothing — un piccolo cimitero per gli oggetti dimenticati.',
    en: 'Necrothing — a little cemetery for forgotten things.',
    de: 'Necrothing — ein kleiner Friedhof für vergessene Dinge.',
    fr: 'Necrothing — un petit cimetière pour les objets oubliés.',
    es: 'Necrothing — un pequeño cementerio para objetos olvidados.',
    pt: 'Necrothing — um pequeno cemitério para objetos esquecidos.',
    'zh-Hans': 'Necrothing——一个安放被遗忘之物的小小墓园。',
    'zh-Hant': 'Necrothing——一個安放被遺忘之物的小小墓園。',
    ja: 'Necrothing — 忘れられたもののための、小さな墓地。',
    ko: 'Necrothing — 잊힌 물건들을 위한 작은 묘지.',
  },
};
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const encode = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (n) => { let s = ''; while (n) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); } return s; };

function parseSheet(xml, shared = []) {
  const rows = [];
  for (const rm of xml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(cm[1])?.[1];
      if (!ref) continue;
      const col = ref.match(/[A-Z]+/)[0];
      const type = /\bt="([^"]+)"/.exec(cm[1])?.[1];
      const inline = /<is>([\s\S]*?)<\/is>/.exec(cm[2])?.[1];
      const value = inline ? [...inline.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('') : /<v>([\s\S]*?)<\/v>/.exec(cm[2])?.[1] ?? '';
      const idx = [...col].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
      row[idx] = type === 'e' ? '' : type === 's' ? (shared[Number(value)] ?? '') : decode(value);
    }
    rows[Number(rm[1]) - 1] = row;
  }
  return rows;
}

function parseItalian() {
  const out = new Map();
  const re = /^\s*(['"])((?:\\.|(?!\1).)+)\1:\s*(['"`])((?:\\.|(?!\3).)*)\3,?/;
  for (const f of fs.readdirSync(IT_DIR).filter((n) => n.endsWith('.ts') && n !== 'index.ts')) {
    for (const line of fs.readFileSync(path.join(IT_DIR, f), 'utf8').split('\n')) {
      const m = re.exec(line);
      if (m) out.set(m[2].replace(/\\(.)/g, '$1'), m[4].replace(/\\n/g, '\n').replace(/\\(.)/g, '$1'));
    }
  }
  return out;
}

function parseEnExtra() {
  const out = new Map();
  const re = /^\s*'((?:\\.|[^'])*)':\s*'((?:\\.|[^'])*)',?\s*$/;
  for (const line of fs.readFileSync(EN_EXTRA_FILE, 'utf8').split('\n')) {
    const m = re.exec(line);
    if (m) out.set(m[1].replace(/\\(.)/g, '$1'), m[2].replace(/\\n/g, '\n').replace(/\\(.)/g, '$1'));
  }
  return out;
}

function addNewRows(rows, italian, english) {
  const present = new Set(rows.slice(1).map((r) => String(r?.[0] ?? '').trim()));
  const added = [];
  for (const [key, value] of italian) {
    if (present.has(key)) continue;
    const row = Array(15).fill('');
    row[0] = key; row[1] = 'Schermate'; row[2] = 'Lingua e Info'; row[4] = String(value.length); row[5] = value;
    row[6] = english.get(key) ?? '';
    rows.push(row);
    added.push(row);
  }
  return added;
}

function appendRows(zip, sheetPath, oldXml, added) {
  if (!added.length) return oldXml;
  let xml = oldXml;
  const lastRow = Math.max(...[...xml.matchAll(/<row\b[^>]*\br="(\d+)"/g)].map((m) => Number(m[1])));
  const cell = (col, row, value) => `<c r="${col}${row}" t="inlineStr"><is><t xml:space="preserve">${encode(value)}</t></is></c>`;
  const extra = added.map((values, i) => {
    const n = lastRow + i + 1;
    return `<row r="${n}">${values.map((v, j) => v === '' ? '' : cell(colName(j + 1), n, v)).join('')}</row>`;
  }).join('');
  xml = xml.replace('</sheetData>', `${extra}</sheetData>`);
  xml = xml.replace(/<dimension ref="A1:([A-Z]+)\d+"\/>/, `<dimension ref="A1:Z${lastRow + added.length}"/>`);
  zip[sheetPath] = strToU8(xml);
  return xml;
}

function setItalianInCode(sheetRows, keys) {
  const byKey = new Map(Array.from(sheetRows.slice(1), (r) => [String(r?.[0] ?? '').trim(), r]).filter(([key]) => key));
  let changed = 0;
  const codeOwned = parseEnExtra();
  for (const [key, value] of keys) {
    if (codeOwned.has(key) || key === 'settings.language.changed') continue;
    const row = byKey.get(key);
    const fromSheet = TEXT_OVERRIDES[key]?.it ?? String(row?.[5] ?? '');
    if (!row || !fromSheet || fromSheet === value) continue;
    for (const file of fs.readdirSync(IT_DIR).filter((n) => n.endsWith('.ts') && n !== 'index.ts')) {
      const p = path.join(IT_DIR, file), src = fs.readFileSync(p, 'utf8');
      const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
      const entry = new RegExp(`(^\\s*)(['"])${key.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\2:.*$`, 'm');
      if (!entry.test(src)) continue;
      fs.writeFileSync(p, src.replace(entry, (_m, indent) => `${indent}${q(key)}: ${q(fromSheet)},`));
      changed++;
      break;
    }
  }
  return changed;
}

function generateBundles(rows, header) {
  const col = new Map(LANGS.map(([code, name]) => [code, header.indexOf(name)]));
  const dicts = Object.fromEntries(LANGS.slice(1).map(([code]) => [code, {}]));
  const defaultNames = {};
  for (const row of rows.slice(1)) {
    const key = String(row?.[0] ?? '').trim();
    if (!key) continue;
    if (key === 'state.player.defaultName') for (const [code] of LANGS) { const i = col.get(code) ?? header.indexOf('Italiano'); defaultNames[code] = String(row?.[i] ?? '').trim(); }
    for (const [code] of LANGS.slice(1)) {
      const i = col.get(code);
      const raw = i < 0 ? '' : String(row?.[i] ?? '');
      const value = raw !== '' ? raw : RECOVERED[code]?.[key] || '';
      // Excel error cells are deliberately blanked by parseSheet; do not ship formula errors.
      if (value) dicts[code][key] = value;
    }
  }
  for (const dict of Object.values(dicts)) for (const key of REMOVED_KEYS) delete dict[key];
  const out = path.join(ROOT, 'src/i18n/generated');
  fs.mkdirSync(out, { recursive: true });
  for (const [code, dict] of Object.entries(dicts)) fs.writeFileSync(path.join(out, `${code}.ts`), `// Generato dal workbook locale.\nexport default ${JSON.stringify(dict, null, 2)} satisfies Record<string, string>;\n`);
  const loaders = LANGS.slice(1).map(([code]) => `  '${code}': () => import('./generated/${code}.ts'),`).join('\n');
  fs.writeFileSync(path.join(ROOT, 'src/i18n/langs.ts'), `// Lingue e nomi predefiniti del workbook; i dizionari vengono caricati dinamicamente da i18n/index.ts.\nexport const LANGS = ${JSON.stringify(Object.fromEntries(LANGS.map(([code]) => [code, NATIVE_NAMES[code]])), null, 2)} as const;\nexport type Lang = keyof typeof LANGS;\nexport const DEFAULT_PLAYER_NAMES: Record<Lang, string> = ${JSON.stringify(defaultNames, null, 2)};\nexport const LOADERS = {\n${loaders}\n} as const;\n`);
  return Object.fromEntries(Object.entries(dicts).map(([code, d]) => [code, Object.keys(d).length]));
}

function updateWorkbook(zip, sheetPath, xml, rows, italian) {
  const rowNums = new Map(Array.from(rows.slice(1), (r, i) => [String(r?.[0] ?? '').trim(), i + 2]).filter(([key]) => key));
  let updated = xml;
  for (const [key, value] of italian) {
    const n = rowNums.get(key);
    if (!n) continue;
    const replacement = (ref, text) => {
      const cell = new RegExp(`<c\\b([^>]*\\br="${ref}"[^>]*)>([\\s\\S]*?)<\\/c>`);
      const match = cell.exec(updated);
      if (match) {
        const attrs = match[1].replace(/\s+t="[^"]+"/, '');
        const html = `<c${attrs} t="inlineStr"><is><t xml:space="preserve">${encode(text)}</t></is></c>`;
        updated = updated.replace(cell, html);
      }
    };
    replacement(`F${n}`, value);
    for (const [code] of LANGS.slice(1)) {
      const row = rows[n - 1];
      const ci = LANGS.findIndex(([c]) => c === code) + 5;
      const translated = TEXT_OVERRIDES[key]?.[code] ?? RECOVERED[code]?.[key];
      if (translated) replacement(`${colName(ci + 1)}${n}`, translated);
    }
  }
  zip[sheetPath] = strToU8(updated);
}

function findTextSheet(zip) {
  const workbook = strFromU8(zip['xl/workbook.xml']);
  const relationId = /<sheet\b[^>]*\bname="Testi"[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  if (!relationId) throw new Error('Nel workbook manca il foglio «Testi».');
  const rels = strFromU8(zip['xl/_rels/workbook.xml.rels']);
  const target = new RegExp(`<Relationship\\b(?=[^>]*\\bId="${relationId}")(?=[^>]*\\bTarget="([^"]+)")[^>]*/>`).exec(rels)?.[1];
  if (!target) throw new Error('Non trovo il foglio «Testi» nelle relazioni Excel.');
  return target.replace(/^\//, '').replace(/^xl\//, 'xl/');
}

const [cmd = 'sync', inputArg, outputArg] = process.argv.slice(2);
const input = path.resolve(inputArg ?? DEFAULT_INPUT);
const output = path.resolve(outputArg ?? DEFAULT_OUTPUT);
const zip = unzipSync(fs.readFileSync(input));
const sheetPath = findTextSheet(zip);
const xml = strFromU8(zip[sheetPath]);
const sharedXml = zip['xl/sharedStrings.xml'] ? strFromU8(zip['xl/sharedStrings.xml']) : '';
const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decode(t[1])).join(''));
const rows = parseSheet(xml, shared);
const header = rows[0] ?? [];
const keys = parseItalian();
const enExtra = parseEnExtra();
const originalKeySet = new Set(rows.slice(1).map((r) => String(r?.[0] ?? '').trim()));
const addedRows = addNewRows(rows, keys, enExtra);
// Recupera le 3 celle formule in errore dal codice italiano e dal glossario approvato nel piano.
for (const row of rows.slice(1)) {
  const key = String(row?.[0] ?? '').trim();
  if (!key) continue;
  if ((!String(row[5] ?? '').trim() || String(row[5]).trim().startsWith('#')) && keys.has(key)) row[5] = RECOVERED.it?.[key] ?? keys.get(key);
  for (const [code] of LANGS.slice(1)) {
    const col = LANGS.findIndex(([c]) => c === code) + 5;
    if (!String(row[col] ?? '').trim() && RECOVERED[code]?.[key]) row[col] = RECOVERED[code][key];
  }
  for (const [overrideKey, byLanguage] of Object.entries(TEXT_OVERRIDES)) {
    if (key !== overrideKey) continue;
    row[5] = byLanguage.it;
    for (const [code] of LANGS.slice(1)) row[LANGS.findIndex(([c]) => c === code) + 5] = byLanguage[code];
  }
}
const removedRowNumbers = rows.slice(1).flatMap((row, index) => REMOVED_KEYS.includes(String(row?.[0] ?? '').trim()) ? [index + 2] : []);
let workbookXml = xml;
for (const n of removedRowNumbers) workbookXml = workbookXml.replace(new RegExp(`<row\\b(?=[^>]*\\br="${n}")[^>]*>[\\s\\S]*?<\\/row>`), '');
const missing = [...keys.keys()].filter((key) => !originalKeySet.has(key) && !enExtra.has(key));
if (cmd === 'check') {
  console.log(`${keys.size} chiavi nel codice; ${rows.length - 1} righe nel workbook; ${missing.length} chiavi non presenti.`);
  if (missing.length) { console.error(missing.slice(0, 30).join('\n')); process.exitCode = 1; }
} else if (cmd === 'sync') {
  const changed = setItalianInCode(rows, keys);
  if (changed) console.log(`${changed} testi italiani sincronizzati dal workbook.`);
  const freshKeys = parseItalian();
  const counts = generateBundles(rows, header);
  const extended = appendRows(zip, sheetPath, workbookXml, addedRows);
  updateWorkbook(zip, sheetPath, extended, rows, freshKeys);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, zipSync(zip, { level: 6 }));
  console.log(`Workbook copiato in ${output}; dizionari generati: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ')}.`);
} else {
  console.error('Uso: node scripts/i18n-xlsx.mjs sync|check [input.xlsx] [output.xlsx]');
  process.exitCode = 2;
}
