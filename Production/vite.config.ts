import { defineConfig } from 'vite';
import packageJson from './package.json';

declare const process: { env: Record<string, string | undefined> };

// Versione pubblica dal manifest e commit per riconoscere la build distribuita.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'locale').slice(0, 7);
const version = packageJson.version;
const build = { commit, version };

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
  define: { __BUILD__: JSON.stringify({ ...build, distribution: distribution(command) }), __DISTRIBUTION__: JSON.stringify(distribution(command)) },
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
