// 0.7l: el avance de Toisón. Lo pidió Carlos el 31 oct: un aviso, una vez, a quien abre GrowFolio, de que tiene los días
// contados (en diciembre pasa a llamarse Toisón), con el logo nuevo
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

test('el avance de Toisón sale una vez, con el logo, y luego sigue con lo demás', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); window.__siguio = 0; avisoToison(() => window.__siguio++); });
  const h = page.locator('.hoja').filter({ hasText: 'GrowFolio tiene los días contados' });
  await expect(h).toBeVisible();
  await expect(h).toContainText('pasa a llamarse Toisón');
  await expect(h).not.toContainText(/compra|vende/i);
  const logo = h.locator('img[alt="Toisón"]');
  await expect.poll(() => logo.evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__siguio)).toBe(0);
  await h.getByRole('button', { name: 'Tengo ganas de verlo' }).click();
  await expect(h).toBeHidden();
  expect(await page.evaluate(() => window.__siguio)).toBe(1);
  // la segunda vez, nada: sigue sin enseñarlo
  await page.evaluate(() => avisoToison(() => window.__siguio++));
  expect(await page.evaluate(() => window.__siguio)).toBe(2);
  await expect(page.locator('.hoja').filter({ hasText: 'días contados' })).toHaveCount(0);
});
