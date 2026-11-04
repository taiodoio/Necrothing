// Sincronizza le traduzioni col workbook Excel mantenendo intatto l'originale.
// Uso: node scripts/i18n-xlsx.mjs sync [input.xlsx] [output.xlsx]
//      node scripts/i18n-xlsx.mjs check [input.xlsx]
//      node scripts/i18n-xlsx.mjs apply testi.json [workbook.xlsx]
// «apply» scrive nel workbook (quello del CMS, sul posto) le traduzioni di un file
// { chiave: { en, de, fr, es, pt, zh-Hans, zh-Hant, ja, ko } }: l'italiano lo prende
// dal codice (src/i18n/it). Aggiorna le righe che ci sono e aggiunge quelle nuove
// (sezione e gruppo come la chiave più simile). Dopo, «sync» rigenera i dizionari.
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
  // la Cripta Soprannaturale è diventata la Cripta della Strega
  'item.cryptSupernatural.label', 'item.cryptSupernatural.desc',
  'game.debug.style', 'demo.grave.name', 'demo.grave.epitaph', 'page.bench.title', 'look.ui.styleNote',
  'settings.assetGallery', 'settings.info', 'settings.build.dev', 'settings.build.version', 'settings.build.distribution',
  'settings.section.onboarding', 'game.pet.freeOld', 'shop.intro.classic#one', 'shop.intro.classic#other',
  'inventory.sell#one', 'inventory.sell#other',
  // tolto l'interruttore Mappa/Sposta (gesti unici in Disegno, Posizionamento e Modifica)
  'hud.tools.pan', 'hud.tools.move', 'hud.tools.draw', 'hud.tools.drawGuide', 'hud.tools.moveGuide', 'hud.tools.panShort',
  'hud.tools.moveShort', 'hud.tools.drawShort', 'hud.tools.panHintPlace', 'hud.tools.panHint',
  'onboarding.yard.editPan', 'onboarding.yard.editWork',
  // niente più luci vere: la riga di debug non dice più se sono vere o finte
  'game.debug.lightsFake', 'game.debug.lightsReal',
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
  'hud.tools.undo': { it: 'Annulla ultima modifica', en: 'Undo last change', de: 'Letzte Änderung rückgängig', fr: 'Annuler la dernière modification', es: 'Deshacer último cambio', pt: 'Desfazer última alteração', 'zh-Hans': '撤销上一步', 'zh-Hant': '復原上一步', ja: '直前の変更を元に戻す', ko: '마지막 변경 취소' },
  // onboarding.yard.place e onboarding.yard.edit, i suggerimenti degli strumenti e edit.intro.text: tolti, ora i testi li dà il workbook (CMS)
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

/** Scrive (o crea) la cella `col` (0 = A) della riga `n` nel foglio, in ordine di colonna. */
function setCell(xml, n, col, text) {
  const ref = `${colName(col + 1)}${n}`;
  const html = text === '' ? '' : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${encode(text)}</t></is></c>`;
  const rowRe = new RegExp(`(<row\\b(?=[^>]*\\br="${n}")[^>]*>)([\\s\\S]*?)(<\\/row>)`);
  const m = rowRe.exec(xml);
  if (!m) return xml.replace('</sheetData>', `<row r="${n}">${html}</row></sheetData>`);
  const cells = [...m[2].matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)].map((c) => ({ col: [...c[1]].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1, xml: c[0] }));
  const others = cells.filter((c) => c.col !== col);
  if (html) others.push({ col, xml: html });
  others.sort((a, b) => a.col - b.col);
  return xml.replace(rowRe, `${m[1]}${others.map((c) => c.xml).join('')}${m[3]}`);
}

function applyTranslations(zip, sheetPath, xml, rows, italian, file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rowNums = new Map(Array.from(rows.slice(1), (r, i) => [String(r?.[0] ?? '').trim(), i + 2]).filter(([key]) => key));
  let last = Math.max(...[...xml.matchAll(/<row\b[^>]*\br="(\d+)"/g)].map((m) => Number(m[1])));
  let updated = 0, added = 0;
  // la riga esistente più simile (stesso prefisso più lungo) per sezione e gruppo
  const like = (key) => {
    const parts = key.split('.');
    for (let k = parts.length - 1; k > 0; k--) {
      const pre = parts.slice(0, k).join('.') + '.';
      const r = rows.slice(1).find((row) => String(row?.[0] ?? '').startsWith(pre));
      if (r) return r;
    }
    return null;
  };
  for (const [key, byLang] of Object.entries(data)) {
    const it = italian.get(key);
    if (!it) throw new Error(`«${key}» non c'è nei testi italiani (src/i18n/it)`);
    let n = rowNums.get(key);
    if (!n) {
      n = ++last;
      const near = like(key);
      xml = setCell(xml, n, 0, key);
      xml = setCell(xml, n, 1, String(near?.[1] ?? 'Schermate'));
      xml = setCell(xml, n, 2, String(near?.[2] ?? ''));
      rowNums.set(key, n);
      added++;
    } else updated++;
    xml = setCell(xml, n, 4, String(it.length));
    xml = setCell(xml, n, 5, it);
    for (const [code] of LANGS.slice(1)) {
      const v = byLang[code];
      if (v === undefined) continue;
      xml = setCell(xml, n, LANGS.findIndex(([c]) => c === code) + 5, v);
    }
  }
  xml = xml.replace(/<dimension ref="A1:([A-Z]+)\d+"\/>/, `<dimension ref="A1:$1${last}"/>`);
  zip[sheetPath] = strToU8(xml);
  return { updated, added };
}

const [cmd = 'sync', inputArg, outputArg] = process.argv.slice(2);
if (cmd === 'apply') {
  // apply testi.json [workbook]: sul posto
  const file = path.resolve(inputArg);
  const book = path.resolve(outputArg ?? DEFAULT_INPUT);
  const z = unzipSync(fs.readFileSync(book));
  const sp = findTextSheet(z);
  const sx = strFromU8(z[sp]);
  const sh = z['xl/sharedStrings.xml'] ? strFromU8(z['xl/sharedStrings.xml']) : '';
  const sharedStrings = [...sh.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decode(t[1])).join(''));
  const { updated, added } = applyTranslations(z, sp, sx, parseSheet(sx, sharedStrings), parseItalian(), file);
  fs.writeFileSync(book, zipSync(z, { level: 6 }));
  console.log(`${book}: ${updated} righe aggiornate, ${added} aggiunte. Ora: node scripts/i18n-xlsx.mjs sync "${book}"`);
  process.exit(0);
}
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
