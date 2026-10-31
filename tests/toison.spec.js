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

test('el estreno de Toisón sale una vez: la marca en relieve y, al bajar, la O áurea, las medidas y el mármol', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); window.__siguio = 0; avisoToison(() => window.__siguio++); });
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  // primero se despide GrowFolio; luego, Toisón
  await expect(e.locator('.ts-adios')).toContainText('tiene los días contados');
  await expect(e.locator('.ts-t')).toHaveText('GrowFolio tiene los días contados');
  await expect(e.locator('.ts-hero')).toContainText('pasa a llamarse Toisón');
  const logo = e.locator('.ts-hero img[alt="Toisón"]');
  await expect.poll(() => logo.evaluate((i) => i.complete && i.naturalWidth)).toBe(1120);
  await expect(e.locator('.ts-baja')).toHaveCSS('opacity', '1', { timeout: 8000 });
  // al bajar, cada sección se dibuja: --p de 0 a 1
  const secs = e.locator('[data-ts-p]');
  await expect(secs).toHaveCount(4);
  expect(await secs.first().evaluate((s) => +s.style.getPropertyValue('--p'))).toBe(0);
  await e.evaluate((el) => el.scrollTo(0, el.querySelector('[data-ts-p]').offsetTop - el.clientHeight * 0.5));
  await expect.poll(() => secs.first().evaluate((s) => +s.style.getPropertyValue('--p'))).toBeGreaterThan(0);
  await expect(secs.first()).toContainText('1,618 de ancho por 1 de alto');
  await expect(secs.nth(1).locator('.ts-cotas')).toContainText('161,8 × 100 u');
  await expect(secs.nth(1).locator('.ts-cotas')).toContainText('122,3 u');
  for (let i = 0; i < 4; i++) {
    await secs.nth(i).evaluate((s) => s.closest('.estreno').scrollTo(0, s.offsetTop));
    await expect.poll(() => secs.nth(i).evaluate((s) => +s.style.getPropertyValue('--p'))).toBe(1);
  }
  const marmol = e.locator('img[src="toison-marmol.webp"]');
  await expect.poll(() => marmol.evaluate((i) => i.complete && i.naturalWidth)).toBe(1120);
  const fin = secs.nth(3);
  await expect(fin.locator('.ts-hechos')).toContainText('toison.es');
  await expect(fin.locator('.ts-hechos')).toContainText('toisonapp.com');
  await expect(fin.locator('.ts-hechos')).toContainText('Marca TOISÓN solicitada en la Oficina Española de Patentes y Marcas');
  await expect(e).not.toContainText(/compra|vende/i);
  const ok = fin.getByRole('button', { name: 'Tengo ganas de verlo' });
  await expect(ok).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => window.__siguio)).toBe(0);
  await ok.click();
  await expect(e).toHaveCount(0);
  expect(await page.evaluate(() => window.__siguio)).toBe(1);
  // la segunda vez, nada
  await page.evaluate(() => avisoToison(() => window.__siguio++));
  expect(await page.evaluate(() => window.__siguio)).toBe(2);
  await expect(page.locator('.estreno.ts')).toHaveCount(0);
});

test('con las animaciones quitadas, el estreno de Toisón sale entero y quieto', async ({ page, errores }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); avisoToison(() => {}); });
  const e = page.locator('.estreno.ts.quieta');
  await expect(e).toBeVisible();
  for (const s of await e.locator('[data-ts-p]').all()) expect(await s.evaluate((x) => x.style.getPropertyValue('--p'))).toBe('1.000');
  await expect(e.getByRole('button', { name: 'Tengo ganas de verlo' })).toHaveCSS('opacity', '1');
});

test('al entrar, también quien acaba de llegar ve el estreno de Toisón antes que nada', async ({ page, errores }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('__ts')) { sessionStorage.setItem('__ts', '1'); localStorage.removeItem('inv-toison-avance'); } });
  await crearCuenta(page);
  await expect(page.locator('.estreno.ts')).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.estreno.ts')).toHaveCount(0);
  expect(await page.evaluate(() => !!LS.get('inv-toison-avance'))).toBe(true);
});

test('en Inicio, la tarjeta de Toisón abre el estreno entero aunque ya lo hayas visto; con la × se quita', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-tarjeta'); location.hash = 'cartera'; pintar(); });
  const t = page.locator('.ts-tarjeta');
  await expect(t).toBeVisible();
  await expect(t).toContainText('GrowFolio pasa a llamarse Toisón');
  expect(await page.evaluate(() => !!LS.get('inv-toison-avance'))).toBe(true);
  // sin el ratón: a ratos sale encima la guía de Inicio
  await page.evaluate(() => document.querySelector('.ts-tarjeta [data-accion="toison"]').click());
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  await expect(e.locator('.ts-t')).toHaveText('GrowFolio tiene los días contados');
  await page.keyboard.press('Escape');
  await expect(e).toHaveCount(0);
  await page.evaluate(() => document.querySelector('.ts-tarjeta [data-accion="toison-fuera"]').click());
  await expect(page.locator('.ts-tarjeta')).toHaveCount(0);
  await page.evaluate(() => pintar());
  await expect(page.locator('.ts-tarjeta')).toHaveCount(0);
});
