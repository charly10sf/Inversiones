// Vite para GrowFolio (0.6): ver build/growfolio-vite.js.
import { defineConfig } from 'vite';
import growfolio from './build/growfolio-vite.js';

export default defineConfig({
  root: '.',
  base: './',
  publicDir: false,
  plugins: [growfolio()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: { input: 'index.html' },
  },
  server: { port: 5173, host: true },
});
