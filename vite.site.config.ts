import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  publicDir: 'public',
  build: {
    outDir: '../dist/site',
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'site/index.html'),
        privacy: resolve(import.meta.dirname, 'site/privacy/index.html'),
        terms: resolve(import.meta.dirname, 'site/terms/index.html')
      }
    }
  }
});
