// 0.8 (rediseño) · La navegación de Toisón: con un diseño de Toisón, abajo Cartera · Mercados · Hoy (medallón) · Ideas · Tú
// y la IA arriba solo con su logo; Hoy sin tus posiciones (están en Cartera); Ajustes y «avisar de un fallo», en Tú.
// Con GrowFolio, la de siempre, también si estabas en una pestaña que solo tiene Toisón.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify('borgona'), 'stub-dueno': 'lucia@prueba.com' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const ir = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(400); };
const barra = (page) => page.evaluate(() => [...document.querySelectorAll('.navbar a')].map((a) => `${a.dataset.ir}${a.getAttribute('aria-current') === 'page' ? '*' : ''}`).join());

test('cinco abajo con Hoy en el medallón, la IA arriba y cada cosa en su pestaña', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await ir(page, 'cartera');
  expect(await barra(page)).toBe('posiciones,mercados,cartera*,expertos,tu');
  await expect(page.locator('.navbar .nav-centro svg.nav-med')).toBeVisible();
  // arriba: la IA sin texto; los ajustes y el bicho ya no
  await expect(page.locator('#bAsesor.as-ts')).toBeVisible();
  expect((await page.locator('#bAsesor').innerText()).trim()).toBe('');
  await expect(page.locator('#bAjustes')).toBeHidden();
  await expect(page.locator('#bFallo')).toBeHidden();
  // Hoy: el patrimonio, sin tus posiciones
  await expect(page.locator('#vista .car-patrimonio')).toBeVisible();
  await expect(page.locator('#vista .car-pos')).toHaveCount(0);
  // Cartera: el total en pequeño, las tres subpestañas y tus posiciones
  await ir(page, 'posiciones');
  expect(await barra(page)).toBe('posiciones*,mercados,cartera,expertos,tu');
  await expect(page.locator('.ts-total')).toBeVisible();
  expect(await page.locator('.grupo-tabs a').allInnerTexts()).toEqual(['Posiciones', 'Análisis', 'Hacienda']);
  await expect(page.locator('#vista .car-pos')).toBeVisible();
  // las direcciones de siempre siguen valiendo: Análisis y Hacienda están en Cartera; Objetivos, en Tú
  await ir(page, 'fiscal');
  expect(await barra(page)).toBe('posiciones*,mercados,cartera,expertos,tu');
  await ir(page, 'objetivos');
  expect(await barra(page)).toBe('posiciones,mercados,cartera,expertos,tu*');
  // Ideas es lo de Expertos
  await ir(page, 'ideas');
  expect(await page.evaluate(() => S.vista)).toBe('expertos');
  await expect(page.locator('.vista-cab h1')).toHaveText('Ideas');
  // Tú: lo tuyo, el diseño y los ajustes (que abren la hoja de siempre)
  await ir(page, 'tu');
  await expect(page.locator('.tu-cab')).toBeVisible();
  await expect(page.locator('#vista [data-elige-tema]')).toHaveCount(4);
  await page.locator('#vista .aj-fila[data-accion="ajustes"]').evaluate((b) => b.click());
  await expect(page.locator('.hoja-fondo #aAcceso')).toBeAttached();
});

test('de vuelta a GrowFolio desde una pestaña que solo tiene Toisón, la barra de siempre', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await ir(page, 'tu');
  await page.locator('#vista [data-elige-tema=""]').evaluate((b) => b.click());
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => S.vista)).toBe('futuro');
  expect(await barra(page)).toBe('ruta,analisis*,cartera,expertos,mercados');
  await expect(page.locator('#bAjustes')).toBeVisible();
  // y otra vez a Toisón: vuelve la de Toisón sin recargar
  await page.evaluate(() => { ponerTema('marmol'); pintar(); });
  expect(await barra(page)).toBe('posiciones,mercados,cartera,expertos,tu*');
});
