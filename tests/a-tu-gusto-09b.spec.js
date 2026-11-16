// 0.9b (Carlos, 16 nov, con captura): «¿Dónde está en el móvil lo de cambiar de Marfil a Mármol? ¿Y el modo avanzado y
// básico? Tiene que ser más fácil encontrarlo. Y la i entre el 57 y Valor queda fatal ahí sola.» Diseño y Básico/Avanzado
// van arriba del todo en Más y en Tú («A tu gusto»), y la ⓘ de la pastilla del periodo no se queda sola en otra línea.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
async function abrir(page) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false; location.hash = 'cartera'; });
  await quitarCapas(page);
  await expect(page.locator('#heroNum')).toBeVisible();
}

test('móvil: en Más, lo primero es «A tu gusto», con el diseño y Básico o Avanzado, y funcionan', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'Más es la hoja del móvil');
  await abrir(page);
  await page.evaluate(() => { document.querySelectorAll('.hoja-fondo, .tour').forEach((x) => x.remove()); abrirMas(); });
  const h = page.locator('.hoja-mas');
  await expect(h.locator('.mas-g').first()).toHaveText('A tu gusto');
  const g = h.locator('.mas-gusto');
  await expect(g.locator('li')).toHaveCount(2);
  await expect(g.locator('[data-elige-tema]')).toHaveText(['Mármol', 'Marfil']);
  await expect(g.locator('[data-modo]')).toHaveText(['Básico', 'Avanzado']);
  await g.locator('[data-elige-tema="marfil"]').evaluate((b) => b.click());
  expect(await page.evaluate(() => [temaActual(), document.querySelector('[data-elige-tema="marfil"]').getAttribute('aria-pressed')])).toEqual(['marfil', 'true']);
  await g.locator('[data-elige-tema="marmol"]').evaluate((b) => b.click());
  expect(await page.evaluate(() => temaActual())).toBe('marmol');
  const otro = await page.evaluate(() => (modoApp() === 'basico' ? 'avanzado' : 'basico'));
  await g.locator(`[data-modo="${otro}"]`).evaluate((b) => b.click());
  expect(await page.evaluate(() => modoApp())).toBe(otro);
  // «Cómo la ves» ya no se repite abajo, en «La app»
  await expect(h.locator('.mas-app:not(.mas-gusto) [data-modo]')).toHaveCount(0);
});

test('en Tú, lo primero después de la cuenta es «A tu gusto»: diseño, cómo la ves y acabado', async ({ page }) => {
  await abrir(page);
  await page.evaluate(() => { location.hash = 'tu'; });
  await expect(page.locator('.tu .aj-grupo').first()).toHaveText('A tu gusto');
  const c = page.locator('.tu .aj-gusto');
  await expect(c.locator('.temas [data-elige-tema]')).toHaveCount(2);
  await expect(c.locator('.seg-modo [data-modo]')).toHaveCount(2);
  await expect(c.locator('[data-acabado-b]').first()).toBeAttached();
});

test('la ⓘ de la pastilla del periodo va en la misma línea que la pastilla, también a 360 px', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#evoCab .hv-p')).toBeVisible();
  const r = await page.evaluate(() => {
    const p = document.querySelector('#evoCab .hv-p').getBoundingClientRect(), i = document.querySelector('.hero-var .hv-info').getBoundingClientRect();
    return { mismaFila: i.top < p.bottom && i.bottom > p.top, aLaDerecha: i.left >= p.right };
  });
  expect(r).toEqual({ mismaFila: true, aLaDerecha: true });
});
