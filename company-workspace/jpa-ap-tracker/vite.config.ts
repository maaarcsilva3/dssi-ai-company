import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * URL path the app is served under in production (behind nginx).
 * Override at build time, e.g. BASE_PATH=/ npm run build to serve from the domain root.
 */
const BASE_PATH = process.env.BASE_PATH ?? '/dev/ap-tracker/';

export default defineConfig(({ command }) => ({
  root: 'client',
  base: command === 'build' ? (BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`) : '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
}));
