// Pruebas de GrowFolio (npm test). Sirven la raíz del repositorio o, con GF_DIST=1, lo que sale del build (dist/).
// Antes hace falta: npm ci, npx playwright install chromium y sh tests/traer-datos.sh (los datos de las ramas).
import { defineConfig, devices } from '@playwright/test';

const dist = !!process.env.GF_DIST;
const puerto = dist ? 8766 : 8765;

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.js$/,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${puerto}/`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'movil', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'movil-pequeno', use: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'pc', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `node tests/servidor.js ${dist ? 'dist' : '.'} ${puerto}`,
    port: puerto,
    reuseExistingServer: !process.env.CI,
  },
});
