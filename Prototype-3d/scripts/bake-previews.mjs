// Salva in PNG le immagini statiche dell'interfaccia (src/render/bake.ts):
// l'anteprima di ogni oggetto del catalogo in public/previews/<id>.png e la
// terra in fondo alle schede in public/deco/ground.png. Si rifà quando cambia
// un modello. Serve il server di sviluppo acceso (npx vite --port 5173) e
// Playwright con Chromium: node scripts/bake-previews.mjs [id …]
import fs from 'node:fs';
import path from 'node:path';

const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const URL_DEV = process.env.DEV_URL ?? 'http://localhost:5173/';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(600000);
await page.goto(URL_DEV);
await page.waitForFunction(() => !!window.necro, null, { timeout: 600000 });
const only = process.argv.slice(2);
const ids = only.length ? only : await page.evaluate(async () => (await import('/src/game/catalog.ts')).CATALOG_LIST.map((d) => d.id));
const save = (rel, url) => {
  const file = path.join(root, 'public', rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
};
for (const id of ids) {
  save(`previews/${id}.png`, await page.evaluate(async (id) => (await import('/src/render/bake.ts')).renderItemPreview(id), id));
  console.log('anteprima', id);
}
if (!only.length) { save('deco/ground.png', await page.evaluate(async () => (await import('/src/render/bake.ts')).renderGround())); console.log('terra'); }
await browser.close();
