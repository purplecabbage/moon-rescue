import { defineConfig } from 'vite';
import { resolve } from 'path';

// Served from https://purplecabbage.github.io/moon-rescue/ on GitHub Pages,
// so production builds need that subpath as the base — but local dev
// (`pnpm run dev`) should stay at the site root like always.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/moon-rescue/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html')
      }
    }
  }
}));
