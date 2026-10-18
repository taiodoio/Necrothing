import { defineConfig } from 'vite';

declare const process: { env: Record<string, string | undefined> };

// Versione visibile nelle Impostazioni: commit (da Vercel, se c'è) e data della build,
// per capire a colpo d'occhio se il sito pubblicato è aggiornato.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'locale').slice(0, 7);
const build = { commit, built: new Date().toISOString() };

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
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
});
