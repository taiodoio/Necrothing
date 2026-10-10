import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: 'index.html',
        gallery: 'gallery.html',
        lab: 'lab.html',
      },
      output: { manualChunks: { three: ['three'] } },
    },
  },
});
