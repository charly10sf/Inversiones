// 0.7v · Los diseños de Toisón (paso 1 del rediseño): data-tema en <html> puesto antes de pintar, los tokens de cada
// diseño con los nombres de GrowFolio apuntando a ellos, las letras de la casa, el color de la barra y el selector,
// que solo ve el dueño. Sin diseño elegido, todo sigue como en GrowFolio.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  ajustes: [{}, { option: true }],
  errores: [async ({ context, ajustes }, use) => {
    const errores = await preparar(context, { ajustes });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

const FONDO = { marmol: '#151817', marfil: '#f2e7d5', borgona: '#2a0e14' };
const rgb = (h) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`;

async function leer(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const cs = getComputedStyle(document.body), r = getComputedStyle(document.documentElement);
    return {
      tema: document.documentElement.getAttribute('data-tema'),
      fondo: cs.backgroundColor, letra: cs.fontFamily, bg: r.getPropertyValue('--bg').trim(), texto: r.getPropertyValue('--text').trim(),
      barra: document.querySelector('meta[name="theme-color"]').getAttribute('content'),
      // se bajan de la casa (assets/), no de Google
      inter: (await document.fonts.load('16px Inter')).length > 0, ibarra: (await document.fonts.load('italic 16px "Ibarra Real Nova"')).length > 0,
    };
  });
}

test.describe('sin diseño elegido', () => {
  test('todo sigue como en GrowFolio', async ({ page }) => {
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    const x = await leer(page);
    expect(x.tema).toBeNull();
    expect(x.fondo).toBe('rgb(0, 0, 0)');
    expect(x.barra).toBe('#000000');
    expect(x.letra).toContain('Plus Jakarta Sans');
  });
});

for (const t of Object.keys(FONDO)) {
  test.describe(`diseño ${t}`, () => {
    test.use({ ajustes: { 'inv-tema': JSON.stringify(t), 'stub-dueno': 'lucia@prueba.com' } });
    test('se pone antes de pintar, con sus tokens, su letra y su barra', async ({ page }) => {
      // el atributo ya está cuando llega el primer CSS (lo pone el script de index.html)
      await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__temaAlEmpezar = document.documentElement.getAttribute('data-tema'); }));
      await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
      expect(await page.evaluate(() => window.__temaAlEmpezar)).toBe(t);
      const x = await leer(page);
      expect(x.tema).toBe(t);
      expect(x.fondo).toBe(rgb(FONDO[t]));
      expect(x.barra).toBe(FONDO[t]);
      expect(x.letra.startsWith('Inter')).toBe(true);
      expect(x.inter).toBe(true);
      expect(x.ibarra).toBe(true);
      // los nombres de GrowFolio apuntan a los tokens: el texto de la app es el --texto del diseño
      expect(x.texto).not.toBe('#F7F2E8');
      await page.screenshot({ path: test.info().outputPath(`inicio-${t}.png`) });
    });
  });
}

test.describe('otra cuenta con un diseño guardado', () => {
  test.use({ ajustes: { 'inv-tema': JSON.stringify('marfil') } });
  test('vuelve a GrowFolio en cuanto se sabe que no es el dueño', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'una vez basta');
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    await expect.poll(() => page.evaluate(() => [document.documentElement.getAttribute('data-tema'), localStorage.getItem('inv-tema')])).toEqual([null, null]);
  });
});

test('el selector de diseño solo lo ve el dueño, y cambia el diseño al momento', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  // otra cuenta: no hay selector
  await page.evaluate(() => { S.esDueno = false; abrirAjustes(); });
  await expect(page.locator('#aAcceso')).toBeAttached();
  await expect(page.locator('[data-elige-tema]')).toHaveCount(0);
  await page.evaluate(() => { for (const b of document.querySelectorAll('[data-cerrar], .hoja-cerrar')) { if (b.closest('.hoja-fondo')) { b.click(); break; } } });
  await page.evaluate(() => document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()));
  // el dueño: cuatro botones (GrowFolio y los tres diseños)
  await page.evaluate(() => { S.esDueno = true; abrirAjustes(); });
  await expect(page.locator('[data-elige-tema]')).toHaveCount(4);
  await expect(page.locator('[data-elige-tema=""]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-elige-tema="borgona"]').evaluate((b) => b.click());
  expect(await page.evaluate(() => [document.documentElement.getAttribute('data-tema'), localStorage.getItem('inv-tema'), document.querySelector('meta[name="theme-color"]').content])).toEqual(['borgona', '"borgona"', '#2a0e14']);
  await expect(page.locator('[data-elige-tema="borgona"]')).toHaveAttribute('aria-pressed', 'true');
  // cada muestra lleva los colores de su diseño
  expect(await page.locator('.tema-muestra[data-tema="marfil"]').evaluate((i) => getComputedStyle(i).backgroundColor)).toBe(rgb(FONDO.marfil));
  // y de vuelta a GrowFolio
  await page.locator('[data-elige-tema=""]').evaluate((b) => b.click());
  expect(await page.evaluate(() => [document.documentElement.getAttribute('data-tema'), localStorage.getItem('inv-tema'), document.querySelector('meta[name="theme-color"]').content])).toEqual([null, null, '#000000']);
});
