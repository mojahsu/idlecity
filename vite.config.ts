import { defineConfig } from 'vite';

// Relative base so the built files also work when loaded from disk
// (needed for a future Electron/Tauri Steam wrapper).
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
});
