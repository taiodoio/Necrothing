// Ponte tra i file dei testi (src/i18n/it/*.ts) e il foglio Google di revisione
// e traduzione. Il foglio si legge e si scrive dal connettore Google Sheets;
// questo script prepara le righe e rimette nei file quello che arriva.
//
//   node scripts/i18n-sheet.mjs export <righe.json>
//       righe per il foglio: intestazione + una riga per chiave
//       [Chiave, Sezione, Gruppo, Note, Caratteri, Italiano, <altre lingue…>]
//   node scripts/i18n-sheet.mjs import <righe.json>
//       righe lette dal foglio (stessa forma): aggiorna i testi italiani
//       cambiati nei file e scrive le altre lingue in src/i18n/<lingua>.ts
//
// Formato dei file dei testi (lo tengono così anche gli import): una chiave
// per riga, `'chiave': 'testo',`; un commento `// …` sulla riga sopra è la
// nota per chi rivede; `// ── Gruppo ──` apre un gruppo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IT_DIR = path.join(ROOT, 'src/i18n/it');
const SECTIONS = { catalog: 'Catalogo e Bottega', game: 'Regole e progressione', screens: 'Schermate', app: 'Gioco e personaggi', ui: 'HUD, casa e notifiche' };
/** Lingue conosciute: intestazione della colonna nel foglio → codice. */
const LANG_COLUMNS = { Italiano: 'it', English: 'en', Deutsch: 'de', Français: 'fr', Español: 'es', Português: 'pt' };

const ENTRY = /^(\s*)(['"])((?:\\.|(?!\2).)+)\2:\s*(['"`])((?:\\.|(?!\4).)*)\4,?\s*(\/\/.*)?$/;
const unquote = (s) => s.replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c));
const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

/** Le voci di un file dei testi, con gruppo e nota. */
function readArea(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out = [];
  let group = '', note = [];
  lines.forEach((line, i) => {
    const g = /^\s*\/\/\s*──\s*(.*?)\s*─*\s*$/.exec(line);
    if (g) { group = g[1]; note = []; return; }
    const c = /^\s*\/\/\s?(.*)$/.exec(line);
    if (c) { note.push(c[1]); return; }
    const m = ENTRY.exec(line);
    if (m) { out.push({ key: unquote(m[3]), value: unquote(m[5]), group, note: note.join(' '), line: i }); note = []; return; }
    if (line.trim()) note = [];
  });
  return { lines, entries: out };
}

const areas = () => fs.readdirSync(IT_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.slice(0, -3));

function exportRows(outFile) {
  const langs = Object.keys(LANG_COLUMNS).filter((h) => h !== 'Italiano');
  const header = ['Chiave', 'Sezione', 'Gruppo', 'Note', 'Caratteri', 'Italiano', ...langs];
  const rows = [header];
  for (const a of areas()) {
    for (const e of readArea(path.join(IT_DIR, `${a}.ts`)).entries) {
      rows.push([e.key, SECTIONS[a] ?? a, e.group, e.note, e.value.length, e.value, ...langs.map((h) => readLang(LANG_COLUMNS[h])[e.key] ?? '')]);
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(rows));
  console.log(`${rows.length - 1} testi → ${outFile}`);
}

function readLang(code) {
  const f = path.join(ROOT, 'src/i18n', `${code}.ts`);
  if (!fs.existsSync(f)) return {};
  const out = {};
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) { const m = ENTRY.exec(line); if (m) out[unquote(m[3])] = unquote(m[5]); }
  return out;
}

function importRows(inFile) {
  const rows = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const header = rows[0].map(String);
  const col = (name) => header.indexOf(name);
  const kCol = col('Chiave'), itCol = col('Italiano');
  if (kCol < 0 || itCol < 0) throw new Error('Mancano le colonne «Chiave» o «Italiano».');
  const sheet = new Map(rows.slice(1).filter((r) => r[kCol]).map((r) => [String(r[kCol]).trim(), r]));
  let changed = 0, unknown = [...sheet.keys()];
  for (const a of areas()) {
    const file = path.join(IT_DIR, `${a}.ts`);
    const { lines, entries } = readArea(file);
    let dirty = false;
    for (const e of entries) {
      unknown = unknown.filter((k) => k !== e.key);
      const r = sheet.get(e.key);
      const v = r ? String(r[itCol] ?? '') : null;
      if (v === null || v === '' || v === e.value) continue;
      const m = ENTRY.exec(lines[e.line]);
      lines[e.line] = `${m[1]}${quote(e.key)}: ${quote(v)},${m[6] ? ` ${m[6]}` : ''}`;
      dirty = true; changed++;
    }
    if (dirty) fs.writeFileSync(file, lines.join('\n'));
  }
  // le altre lingue: un file per lingua, solo le chiavi compilate
  for (const [h, code] of Object.entries(LANG_COLUMNS)) {
    if (code === 'it' || col(h) < 0) continue;
    const entries = [...sheet].map(([k, r]) => [k, String(r[col(h)] ?? '').trim()]).filter(([, v]) => v);
    if (!entries.length) continue;
    const body = entries.map(([k, v]) => `  ${quote(k)}: ${quote(v)},`).join('\n');
    fs.writeFileSync(path.join(ROOT, 'src/i18n', `${code}.ts`), `// Testi in ${h}: generato da scripts/i18n-sheet.mjs dal foglio di traduzione (non modificare a mano).\n\nexport default {\n${body}\n} satisfies Record<string, string>;\n`);
    console.log(`${h}: ${entries.length} testi → src/i18n/${code}.ts`);
  }
  writeLangs();
  console.log(`${changed} testi italiani aggiornati.`);
  if (unknown.length) console.log(`Chiavi nel foglio che non esistono nel codice (${unknown.length}): ${unknown.slice(0, 20).join(', ')}${unknown.length > 20 ? '…' : ''}`);
}

/** src/i18n/langs.ts: le lingue che hanno un file di testi, così compaiono nel gioco (e nelle Impostazioni). */
function writeLangs() {
  const langs = Object.entries(LANG_COLUMNS).filter(([, code]) => code !== 'it' && fs.existsSync(path.join(ROOT, 'src/i18n', `${code}.ts`)));
  const imports = langs.map(([, code]) => `import ${code} from './${code}.ts';\n`).join('');
  const body = langs.map(([name, code]) => `  ${code}: { name: ${quote(name)}, dict: ${code} },\n`).join('');
  fs.writeFileSync(path.join(ROOT, 'src/i18n/langs.ts'), `// Lingue tradotte: generato da scripts/i18n-sheet.mjs dal foglio di traduzione (non modificare a mano).\n\n${imports}${imports ? '\n' : ''}export const TRANSLATIONS: Record<string, { name: string; dict: Record<string, string> }> = {\n${body}};\n`);
}

const [cmd, file] = process.argv.slice(2);
if (cmd === 'export' && file) exportRows(file);
else if (cmd === 'import' && file) importRows(file);
else { console.log('uso: node scripts/i18n-sheet.mjs export|import <righe.json>'); process.exit(1); }
