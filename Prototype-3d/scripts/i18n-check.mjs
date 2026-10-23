// Controllo dei testi: trova le frasi scritte a mano nel codice (dovrebbero
// stare in src/i18n/it/) e le chiavi usate con t() che non esistono.
//
//   node scripts/i18n-check.mjs            elenco di quello che non va
//   node scripts/i18n-check.mjs --count    solo il numero per file
//
// Una riga col commento «i18n-ok» si salta (testi tecnici che sembrano frasi).
// Lo usa anche il test tests/i18n.test.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
// pagine di prova e strumenti di misura: non sono il gioco
const SKIP = [/^i18n\//, /^proto\//, /^bench\.ts$/, /^lab\.ts$/, /^gallery\.ts$/, /\.d\.ts$/];

const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
});

const TECH = new Set(['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Shift', 'Control', 'Meta', 'Alt', 'Tab', 'Infinity', 'NaN', 'Capacitor', 'Plugins', 'Necrothing', 'Grenze Gotisch', 'Silkscreen']);

/** Sembra una frase per il giocatore? */
export function looksLikeText(s) {
  // ⟨⟩ = dove nel template c'è un'espressione
  const v = s.replaceAll('⟨⟩', ' ').replace(/\s+/g, ' ').trim();
  if (v.length < 2 || TECH.has(v)) return false;
  if (/^(https?:|data:|url\(|#[0-9a-f]{3,8}$|rgba?\(|hsl)/i.test(v)) return false;
  if (/^[.#[]/.test(v) || v.includes(':scope') || /^[a-z]+\[/.test(v)) return false; // selettori
  if (v.startsWith('<')) return false; // SVG e HTML di servizio
  if (/[;{}]/.test(v) && /:/.test(v)) return false; // CSS
  if (/^\d+(\.\d+)?(px|%|em|rem|s|ms|deg)?( |$)/.test(v)) return false; // misure, font
  if (/^[a-z0-9_\-:./ ]+$/.test(v) && !/[à-ú]/.test(v)) return false; // classi, chiavi, percorsi
  if (/[à-úÀ-Ú’«»…]/.test(v)) return true; // accenti, apostrofo tipografico, caporali: italiano
  if (/[A-Za-z]{2,}[,.;:!?']?\s+[^]*[A-Za-z]{2,}/.test(v)) return true; // più parole separate da spazi
  if (/^[A-Z][a-z']{2,}[.!?]?$/.test(v)) return true; // una parola con la maiuscola: «Bottega», «Chiudi»
  return false;
}

const IGNORED_CALLS = /^(console\.\w+|t|tList|hasT|querySelector|querySelectorAll|getElementById|addEventListener|removeEventListener|setAttribute|getAttribute|removeAttribute|toggleAttribute|classList\.\w+|matchMedia|getItem|setItem|removeItem|import|require|createElement|getContext|getExtension|dispatchEvent|Symbol|postMessage|fetch|getPropertyValue|setProperty)$/;

function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) {
    const obj = ts.isIdentifier(e.expression) ? e.expression.text : ts.isPropertyAccessExpression(e.expression) ? e.expression.name.text : '';
    return obj === 'console' || obj === 'classList' ? `${obj}.${e.name.text}` : e.name.text;
  }
  return '';
}

export function scan() {
  const found = [];
  const keysUsed = [];
  for (const file of files(SRC)) {
    const rel = path.relative(SRC, file).replaceAll(path.sep, '/');
    if (SKIP.some((r) => r.test(rel))) continue;
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
    const visit = (node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
      if (ts.isCallExpression(node)) {
        const name = calleeName(node);
        if ((name === 't' || name === 'tList' || name === 'hasT') && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
          keysUsed.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, key: node.arguments[0].text });
        }
        if (IGNORED_CALLS.test(name)) { if (name !== 't' && name !== 'tList') node.arguments.slice(1).forEach(visit); return; }
      }
      // chiavi di oggetti e confronti con stringhe tecniche non sono testi
      if (ts.isPropertyAssignment(node) && (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name))) { visit(node.initializer); return; }
      let value = null;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
      else if (ts.isTemplateExpression(node)) value = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ⟨⟩ ');
      if (value !== null) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart()).line;
        if (looksLikeText(value) && !/i18n-ok/.test(lines[line] ?? '')) found.push({ file: rel, line: line + 1, text: value.replace(/\s+/g, ' ').slice(0, 120) });
        if (ts.isTemplateExpression(node)) node.templateSpans.forEach((s) => visit(s.expression));
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { found, keysUsed };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { found } = scan();
  if (process.argv.includes('--count')) {
    const by = new Map();
    for (const f of found) by.set(f.file, (by.get(f.file) ?? 0) + 1);
    for (const [f, n] of [...by].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), f);
    console.log(String(found.length).padStart(4), 'in tutto');
  } else {
    for (const f of found) console.log(`${f.file}:${f.line}  ${f.text}`);
  }
}
