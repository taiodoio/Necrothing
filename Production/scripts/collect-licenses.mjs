// Crea l'elenco locale delle licenze incluso nella scheda Info.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = path.join(ROOT, 'node_modules');
const OUT = path.join(ROOT, 'public/third-party-licenses.json');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const records = [];
for (const name of Object.keys(manifest.dependencies ?? {})) {
  const file = path.join(MODULES, ...name.split('/'), 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!pkg.name || !pkg.license) continue;
    const dir = path.dirname(file);
    const licenseFile = fs.readdirSync(dir).find((name) => /^(license|licence|copying|notice)(\.|$)/i.test(name));
    const text = licenseFile ? fs.readFileSync(path.join(dir, licenseFile), 'utf8') : '';
    records.push({ name: pkg.name, version: pkg.version ?? '', license: typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license), text });
  } catch { /* un pacchetto incompleto non blocca la build */ }
}
records.sort((a, b) => a.name.localeCompare(b.name));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(records)}\n`);
console.log(`${records.length} licenze raccolte in public/third-party-licenses.json.`);
