// 0.7l: el estreno de Toisón. Lo pidió Carlos el 31 oct: a todos los que entran (nuevos o no, en el móvil, la app y el
// ordenador), una vez, que GrowFolio tiene los días contados, por algo bueno: en diciembre pasa a llamarse Toisón. Con
// la marca en relieve, los dominios registrados y la marca solicitada en la OEPM
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'en el móvil y en el ordenador'));

test('el estreno de Toisón sale una vez, con la marca en relieve, y luego sigue con lo demás', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); window.__siguio = 0; avisoToison(() => window.__siguio++); });
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  // primero se despide GrowFolio; luego, Toisón
  await expect(e.locator('.ts-adios')).toContainText('tiene los días contados');
  await expect(e.locator('.ts-t')).toHaveText('GrowFolio tiene los días contados');
  await expect(e).toContainText('pasa a llamarse Toisón');
  await expect(e.locator('.ts-hechos')).toContainText('toison.es');
  await expect(e.locator('.ts-hechos')).toContainText('toisonapp.com');
  await expect(e.locator('.ts-hechos')).toContainText('Marca TOISÓN solicitada en la Oficina Española de Patentes y Marcas');
  await expect(e).not.toContainText(/compra|vende/i);
  const logo = e.locator('img[alt="Toisón"]');
  await expect.poll(() => logo.evaluate((i) => i.complete && i.naturalWidth)).toBe(1120);
  // el botón llega al final de la animación
  const ok = e.getByRole('button', { name: 'Tengo ganas de verlo' });
  await expect(ok).toHaveCSS('opacity', '1', { timeout: 8000 });
  expect(await page.evaluate(() => window.__siguio)).toBe(0);
  await ok.click();
  await expect(e).toHaveCount(0);
  expect(await page.evaluate(() => window.__siguio)).toBe(1);
  // la segunda vez, nada
  await page.evaluate(() => avisoToison(() => window.__siguio++));
  expect(await page.evaluate(() => window.__siguio)).toBe(2);
  await expect(page.locator('.estreno.ts')).toHaveCount(0);
});

test('al entrar, también quien acaba de llegar ve el estreno de Toisón antes que nada', async ({ page, errores }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('__ts')) { sessionStorage.setItem('__ts', '1'); localStorage.removeItem('inv-toison-avance'); } });
  await crearCuenta(page);
  await expect(page.locator('.estreno.ts')).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.estreno.ts')).toHaveCount(0);
  expect(await page.evaluate(() => !!LS.get('inv-toison-avance'))).toBe(true);
});
