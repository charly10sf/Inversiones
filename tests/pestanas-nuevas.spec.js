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
  // el resultado de lo vendido se abre: lo que suma y lo que resta (4 nov)
  await page.evaluate(() => {
    const id = S.cartera.posiciones[0].instrumento;
    S.cartera.movimientos = [...(S.cartera.movimientos || []), { id: 'm-t1', fecha: '2026-10-19', tipo: 'venta', instrumento: id, uds: 1, importe: 1000, coste_vendido: 800, resultado: 200 }, { id: 'm-t2', fecha: '2026-10-20', tipo: 'venta', instrumento: id, uds: 1, importe: 500, coste_vendido: 600, resultado: -100 }];
    pintarPanelAv();
  });
  const bRes = panel(page).locator('[data-mov-res]');
  await expect(bRes).toHaveAttribute('aria-expanded', 'false');
  await bRes.evaluate((b) => b.click());
  await expect(panel(page).locator('#movDesg')).toContainText('Lo que suma');
  await expect(panel(page).locator('#movDesg')).toContainText('Lo que resta');
  await expect(panel(page).locator('#movDesg')).toContainText('te costó 800');
  await expect(panel(page).locator('[data-mov-res]')).toHaveAttribute('aria-expanded', 'true');

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

  // Tu reparto objetivo (rehecho el 4 nov): sin poner, es lo de hoy y suma 100; entre todos no pasan de 100; − y + se
  // paran en los topes; si falta por repartir, se dice
  await pest(page, 'rebal');
  await expect(panel(page)).toContainText('Tu reparto objetivo', { timeout: 15_000 });
  await expect(panel(page)).toContainText('De momento sale lo que tienes hoy');
  await expect(panel(page).locator('.ro-total')).toContainText('Repartido el 100');
  const campo = panel(page).locator('[data-obj-k]').first();
  const k = await campo.getAttribute('data-obj-k');
  await campo.fill('150'); await campo.dispatchEvent('change');
  await expect(panel(page)).not.toContainText('De momento sale lo que tienes hoy');
  const obj = await page.evaluate(() => LS.get('inv-reparto-obj'));
  expect(obj[k]).toBeLessThan(100.01);
  expect(Object.values(obj).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1);
  await expect(panel(page).locator(`[data-obj-mas="${k}"]`)).toBeDisabled();
  await panel(page).locator(`[data-obj-menos="${k}"]`).evaluate((b) => b.click());
  await expect(panel(page).locator('.ro-total .pav-warn')).toContainText('por repartir');
  await expect(panel(page)).toContainText('Cuando tu objetivo sume 100 %');
  await panel(page).locator(`[data-obj-mas="${k}"]`).evaluate((b) => b.click());
  await expect(panel(page).locator('.ro-total')).toContainText('Repartido el 100');
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
