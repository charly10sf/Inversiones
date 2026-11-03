// 0.9 (noche del 3 nov) · Las cinco pestañas de Análisis que faltaban: Día a día, Movimientos, Gráfico técnico, Tu reparto
// objetivo y Laboratorio. Con la cartera de prueba, cada una se llena con números de verdad y responde a sus mandos.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const pest = (page, p) => page.evaluate((x) => document.querySelector(`[data-pest-av="${x}"]`).click(), p);
const panel = (page) => page.locator('#panelAv');

test('las cinco pestañas nuevas se llenan y responden', async ({ page }, info) => {
  test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');
  test.setTimeout(120_000);
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { ponerModo('avanzado'); location.hash = 'posiciones'; });
  await page.waitForTimeout(600); await quitarCapas(page);

  // Día a día: el calendario del mes, con días de color, y se puede ir al mes anterior
  await pest(page, 'pnl');
  await expect(panel(page)).toContainText('Tu cartera, día a día', { timeout: 15_000 });
  expect(await panel(page).locator('.pnl-d:not(.vacio)').count()).toBeGreaterThan(0);
  const mes = await panel(page).locator('.pnl-cab b').textContent();
  await panel(page).locator('.pnl-cab [data-pnl-mes]').first().evaluate((b) => b.click());
  await expect(panel(page).locator('.pnl-cab b')).not.toHaveText(mes);
  await expect(panel(page).locator('.pav-kpi b').first()).toHaveText(/\d/);

  // Movimientos: la tabla con las compras y el filtro
  await pest(page, 'mov');
  await expect(panel(page)).toContainText('Tus operaciones', { timeout: 15_000 });
  expect(await panel(page).locator('table.pav-mov tbody tr').count()).toBeGreaterThan(0);
  await panel(page).locator('[data-mov-f="venta"]').evaluate((b) => b.click());
  await expect(panel(page).locator('[data-mov-f="venta"]')).toHaveAttribute('aria-pressed', 'true');

  // Gráfico técnico: la gráfica, las medias y el RSI; cambiar de posición y de plazo
  await pest(page, 'grafico');
  await expect(panel(page)).toContainText('Media de 200 días', { timeout: 15_000 });
  await expect(page.locator('#pavGraf svg')).toHaveCount(1, { timeout: 10_000 });
  await expect(panel(page)).toContainText('no una señal para comprar ni vender');
  const opciones = await panel(page).locator('[data-graf-pos] option').count();
  if (opciones > 1) {
    const segunda = await panel(page).locator('[data-graf-pos] option').nth(1).getAttribute('value');
    await panel(page).locator('[data-graf-pos]').selectOption(segunda);
    await expect(panel(page).locator('[data-graf-pos]')).toHaveValue(segunda);
  }
  await panel(page).locator('[data-graf-r="5A"]').evaluate((b) => b.click());
  await expect(panel(page).locator('[data-graf-r="5A"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#pavGraf svg')).toHaveCount(1, { timeout: 10_000 });

  // Tu reparto objetivo: sin poner, es lo de hoy; al cambiarlo se guarda y la suma avisa si no da 100
  await pest(page, 'rebal');
  await expect(panel(page)).toContainText('Tu reparto objetivo', { timeout: 15_000 });
  await expect(panel(page)).toContainText('Sin poner');
  const campo = panel(page).locator('[data-obj-k]').first();
  const k = await campo.getAttribute('data-obj-k');
  await campo.fill('99'); await campo.dispatchEvent('change');
  await expect(panel(page)).toContainText('Puesto por ti');
  expect(await page.evaluate((x) => LS.get('inv-reparto-obj')[x], k)).toBe(99);
  await expect(panel(page).locator('.pav-warn')).toContainText('tiene que sumar 100');
  await expect(panel(page)).toContainText('no una recomendación');

  // Laboratorio: cambiar lo que aportas cambia el resultado sin repintar la pestaña
  await pest(page, 'lab');
  await expect(panel(page)).toContainText('¿Y si…?', { timeout: 15_000 });
  const antes = await page.locator('#labRes .pav-kpi b').nth(1).textContent();
  await panel(page).locator('[data-lab="mes"]').fill('2000');
  await expect(page.locator('#labRes .pav-kpi b').nth(1)).not.toHaveText(antes);
  await expect(panel(page)).toContainText('Lo de hoy, con el pasado');

  // ninguna cifra rota
  for (const p of ['pnl', 'mov', 'grafico', 'rebal', 'lab']) {
    await pest(page, p);
    await page.waitForTimeout(300);
    expect(await panel(page).innerText()).not.toMatch(/NaN|undefined|Infinity/);
  }
});
