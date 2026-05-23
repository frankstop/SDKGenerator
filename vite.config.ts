import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative assets resolution for GitHub Pages subfolders
  build: {
    outDir: 'dist/playground',
    emptyOutDir: true
  }
});
