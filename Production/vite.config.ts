import { defineConfig } from 'vite';
import packageJson from './package.json';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

declare const process: { env: Record<string, string | undefined> };

// Versione pubblica dal manifest e commit per riconoscere la build distribuita.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'locale').slice(0, 7);
const version = packageJson.version;
const build = { commit, version };

// La cache IndexedDB è derivata dai generatori: cambia chiave quando cambiano
// i modelli o le regole che ne determinano le chiavi, anche nelle build locali.
const assetRoots = ['src/render/lowpoly', 'src/render/modelCache.ts', 'src/render/keys.ts', 'src/game/catalog.ts', 'src/game/graves.ts', 'src/view/WorldView.ts', 'src/view/baker.ts', 'src/view/terrain.ts', 'src/view/vegetationCache.ts'];
const assetHash = createHash('sha256');
assetHash.update(`three:${packageJson.dependencies.three}\0`);
for (const root of assetRoots) {
  const add = (file: string) => {
    assetHash.update(`${relative('.', file)}\0`);
    assetHash.update(readFileSync(file));
  };
  if (statSync(root).isFile()) add(root);
  else {
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.(ts|js)$/.test(entry.name)) add(file);
      }
    };
    walk(root);
  }
}
const assetRevision = assetHash.digest('hex').slice(0, 16);

// Profilo di distribuzione (src/config/distribution.ts): non è la modalità di Vite.
// Il server di sviluppo è `development`; una build senza indicazioni è la beta
// (`beta-full`, accesso Full). `store-release` (la futura release con la Demo)
// va chiesto apposta: VITE_DISTRIBUTION=store-release ALLOW_STORE_RELEASE=1.
const PROFILES = ['beta-full', 'store-release', 'development'];
function distribution(command: string): string {
  const asked = process.env.VITE_DISTRIBUTION;
  const profile = asked ?? (command === 'serve' ? 'development' : 'beta-full');
  if (!PROFILES.includes(profile)) throw new Error(`VITE_DISTRIBUTION sconosciuto: ${profile} (validi: ${PROFILES.join(', ')})`);
  if (profile === 'store-release' && process.env.ALLOW_STORE_RELEASE !== '1') throw new Error('Il profilo store-release non è ancora attivo (Milestone 2): serve ALLOW_STORE_RELEASE=1.');
  return profile;
}

export default defineConfig(({ command }) => ({
  base: './',
  define: { __BUILD__: JSON.stringify({ ...build, distribution: distribution(command) }), __DISTRIBUTION__: JSON.stringify(distribution(command)), __ASSET_CACHE_REVISION__: JSON.stringify(assetRevision) },
  server: { host: '0.0.0.0' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // il design system (design-system.html) è una pagina di lavoro: c'è col server di sviluppo, non nella build pubblicata
      input: { main: 'index.html' },
      output: { manualChunks: { three: ['three'] } },
    },
  },
}));
