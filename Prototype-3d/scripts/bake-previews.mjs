// Salva le immagini statiche dell'interfaccia (src/render/bake.ts), in WebP:
// l'anteprima di ogni oggetto del catalogo in src/assets/previews/<id>.webp,
// quella di tetti e aggiunte della casa in src/assets/previews/house-<id>.webp e
// la terra in fondo alle schede in src/assets/deco/ground.webp. Vite le
// pubblica col nome che cambia col contenuto (si possono tenere in cache per
// sempre). Si rifà quando cambia un modello. Serve il server di sviluppo acceso (npx vite --port 5173) e
// Playwright con Chromium: node scripts/bake-previews.mjs [id …]
import fs from 'node:fs';
import path from 'node:path';

const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const URL_DEV = process.env.DEV_URL ?? 'http://localhost:5173/';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(600000);
const ready = async () => { await page.waitForFunction(() => !!window.necro, null, { timeout: 600000 }); };
await page.goto(URL_DEV);
await ready();
/** page.evaluate che regge un ricaricamento della pagina (il server di sviluppo la ricarica se cambia un file). */
const ev = async (fn, arg) => {
  for (let i = 0; ; i++) {
    try { return await page.evaluate(fn, arg); } catch (e) {
      if (i > 3 || !/context was destroyed|navigation/.test(String(e))) throw e;
      await page.waitForLoadState('load'); await ready();
    }
  }
};
const only = process.argv.slice(2);
const ids = only.length ? only : await ev(async () => (await import('/src/game/catalog.ts')).CATALOG_LIST.map((d) => d.id));
// si scrive tutto alla fine: un file nuovo in src/assets fa ricaricare la pagina al server di sviluppo
const out = new Map();
const save = (rel, url) => out.set(rel, url);
for (const id of ids) {
  save(`previews/${id}.webp`, await ev(async (id) => (await import('/src/render/bake.ts')).renderItemPreview(id), id));
  console.log('anteprima', id);
}
if (!only.length) {
  const house = await ev(async () => { const H = await import('/src/game/house.ts'); return [...H.HOUSE_ROOFS.filter((r) => r.cost > 0), ...H.HOUSE_PARTS].map((x) => x.id); });
  for (const id of house) { save(`previews/house-${id}.webp`, await ev(async (id) => (await import('/src/render/bake.ts')).renderHousePreview(id), id)); console.log('casa', id); }
  save('deco/ground.webp', await ev(async () => (await import('/src/render/bake.ts')).renderGround()));
  console.log('terra');
}
await browser.close();
for (const [rel, url] of out) {
  const file = path.join(root, 'src', 'assets', rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
}
