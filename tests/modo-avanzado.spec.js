// 0.9 (sesión 2) · El modo básico y el avanzado, y el ordenador con el menú a la izquierda y la IA al lado.
// Básico: un «¿Qué es?» en cada bloque de Hoy y sin pestañas. Avanzado: trece pestañas encima de Hoy; las que ya tienen
// datos (Rentabilidad, Riesgo, Hacienda, Reparto) se llenan con los cálculos de la app, las demás dicen qué llevarán.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const lista = async (page) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { location.hash = 'cartera'; });
  await page.waitForTimeout(600); await quitarCapas(page);
};
const pest = (page, p) => page.evaluate((x) => document.querySelector(`[data-pest-av="${x}"]`).click(), p);

test('avanzado: Análisis lleva todas las pestañas y las de datos se llenan con tu cartera; Hoy, sin pestañas', async ({ page }, info) => {
  test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');
  await lista(page);
  await page.evaluate(() => ponerModo('avanzado'));
  await expect(page.locator('#vista .pest-av')).toHaveCount(0);
  await expect(page.locator('.car-plan')).toBeVisible();
  await page.evaluate(() => { location.hash = 'posiciones'; });
  await expect(page.locator('.ts-tit')).toHaveText('Análisis');
  await expect(page.locator('.ts-total')).toHaveCount(0);
  await expect(page.locator('.pest-av a')).toHaveCount(13);
  await expect(page.locator('.pest-av a[href="#posiciones"]')).toHaveAttribute('aria-current', 'page');
  for (const [p, texto] of [['rentab', 'Por periodo'], ['riesgo', 'Medidas de riesgo'], ['reparto', 'Por clase de activo'], ['div', 'Tus números'], ['costes', 'Lo que pagas']]) {
    await pest(page, p);
    await expect(page.locator('#panelAv')).toContainText(texto, { timeout: 15_000 });
    await expect(page.locator('#panelAv .pav-como').first()).toContainText('Cómo se calcula');
    await expect(page.locator(`.pest-av [data-pest-av="${p}"]`)).toHaveAttribute('aria-current', 'page');
  }
  // cada tarjeta lleva su «Pregúntale»
  await expect(page.locator('#panelAv .pav-et .preg-ia').first()).toBeVisible();
  // el riesgo y la caída salen de verdad (no «—»)
  await pest(page, 'riesgo');
  await expect(page.locator('#panelAv .pav-kpi').first().locator('b')).toHaveText(/\d/, { timeout: 15_000 });
  await expect(page.locator('#pavCaida svg')).toHaveCount(1, { timeout: 10_000 });
  // las que aún no tienen sus datos dicen qué llevarán y adónde ir mientras
  // las cinco que faltaban ya se llenan (noche del 3 nov): tests/pestanas-nuevas.spec.js las prueba una a una
  await pest(page, 'rebal');
  await expect(page.locator('#panelAv')).toContainText('Tu reparto objetivo', { timeout: 15_000 });
  expect(await page.evaluate(() => LS.get('inv-pest-av'))).toBe('rebal');
  // Hacienda y La IA opina son las pantallas de siempre
  await page.locator('.pest-av a[href="#fiscal"]').evaluate((a) => a.click());
  await expect(page.locator('.pest-av a[href="#fiscal"]')).toHaveAttribute('aria-current', 'page');
});

test('básico: sin pestañas y con un «¿Qué es?» en cada bloque; se elige en Tú y se recuerda', async ({ page }, info) => {
  test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');
  await lista(page);
  await page.evaluate(() => { location.hash = 'tu'; });
  await page.waitForTimeout(500);
  await page.locator('#vista [data-modo="basico"]').click();
  expect(await page.evaluate(() => LS.get('inv-modo'))).toBe('basico');
  await page.evaluate(() => { location.hash = 'cartera'; });
  await page.waitForTimeout(600);
  await expect(page.locator('.car-patrimonio .que-es')).toContainText('¿Qué es?');
  expect(await page.locator('#vista .que-es').count()).toBeGreaterThan(2);
  // dentro de su bloque y detrás de su cabecera, no suelto
  expect(await page.evaluate(() => [...document.querySelectorAll('#vista .que-es')].every((p) => p.closest('section, .car-pos, .car-hero')))).toBe(true);
  // en básico, Análisis solo con las de siempre
  await page.evaluate(() => { location.hash = 'posiciones'; });
  await expect(page.locator('.pest-av a')).toHaveText(['Posiciones', 'Reparto y X-Ray', 'Hacienda', 'La IA opina']);
});

test('sin elegir: empezando sale básico y, si no, avanzado', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await lista(page);
  expect(await page.evaluate(() => { LS.del('inv-modo'); LS.set('inv-nivel', 'nov'); return modoApp(); })).toBe('basico');
  expect(await page.evaluate(() => { LS.set('inv-nivel', 'exp'); return modoApp(); })).toBe('avanzado');
  expect(await page.evaluate(() => { LS.del('inv-nivel'); return modoApp(); })).toBe('avanzado');
});

test('en el ordenador: el menú a la izquierda y la IA se abre al lado sin tapar Hoy', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await lista(page);
  await expect(page.locator('.riel')).toBeVisible();
  await expect(page.locator('.top .nav')).toBeHidden();
  await expect(page.locator('.riel [data-ir="cartera"]')).toHaveAttribute('aria-current', 'page');
  const caja = await page.locator('#vista').boundingBox();
  expect(caja.x).toBeGreaterThanOrEqual(232);
  await page.locator('.riel-ia').click();
  await expect(page.locator('#asesorFondo .asesor')).toBeVisible({ timeout: 10_000 });
  expect(await page.evaluate(() => [document.body.classList.contains('ia-lado'), document.body.style.overflow])).toEqual([true, '']);
  // Hoy sigue a la vista, a la izquierda de la IA, y se puede tocar
  const ia = await page.locator('#asesorFondo').boundingBox(), v = await page.locator('#vista').boundingBox();
  expect(v.x + v.width).toBeLessThanOrEqual(ia.x + 1);
  await expect(page.locator('.riel-ia')).toHaveAttribute('aria-expanded', 'true');
  // el mismo botón la cierra
  await page.locator('.riel-ia').click();
  await expect(page.locator('#asesorFondo')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.classList.contains('ia-lado'))).toBe(false);
  // el modo, también desde el menú
  await page.locator('.riel [data-modo="basico"]').click();
  await expect(page.locator('.car-patrimonio .que-es')).toBeVisible();
});
