import { defineConfig } from 'vite';

declare const process: { env: Record<string, string | undefined> };

// Versione visibile nelle Impostazioni: commit (da Vercel, se c'è) e data della build,
// per capire a colpo d'occhio se il sito pubblicato è aggiornato.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'locale').slice(0, 7);
const build = { commit, built: new Date().toISOString() };

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
      input: {
        main: 'index.html',
        gallery: 'gallery.html',
        lab: 'lab.html',
        bench: 'bench.html',
      },
      output: { manualChunks: { three: ['three'] } },
    },
  },
}));
