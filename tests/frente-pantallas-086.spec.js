// 0.8.6 · Pestaña 2, «Frente a un indexado»: las pantallas (sesión 5 del plan), según la maqueta 2X aprobada el 8 nov.
// Ordenador en avanzado: la tarjeta grande de todo el ancho, filas de la misma altura, las medidas en una fila y los
// tres candados de Dorado juntos. Móvil (y básico): tres tarjetas, todas las gráficas con escala. Textos de la CNMV.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function abrir(page, modo) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async (m) => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true);
    for (const p of S.cartera.posiciones) p.desde = '2021-03-01';
    await guardarCartera('prueba'); ponerModo(m); location.hash = 'av-frente';
  }, modo);
  await expect(page.locator('#panelAv[data-p="frente"]:not([aria-busy]) .pav-t').first()).toBeAttached({ timeout: 20_000 });
  await expect(page.locator('#frGraf svg')).toBeAttached();
  await page.waitForTimeout(300); await quitarCapas(page);
}
// lo de la CNMV: sin órdenes ni «compra»/«vende», y que lo de antes no dice lo que pasará
async function textosCnmv(panel) {
  const t = await panel.innerText();
  expect(t).not.toMatch(/\b(compra|vende|comprar|vender|compres|vendas|deberías|te recomendamos)\b/i);
  expect(t).toContain('no es un indicador fiable de lo que pasará');
  expect(t).toMatch(/habría pasado/);
}

test('ordenador, avanzado: la tarjeta grande, las filas a la misma altura, las medidas en una fila y los tres candados', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'es la forma del ordenador');
  await abrir(page, 'avanzado');
  const panel = page.locator('#panelAv');
  const tits = await panel.locator('.pav-et h2').allTextContents();
  expect(tits.map((t) => t.replace(/\s*Dorado\s*$/i, '').trim())).toEqual(['Frente a un indexado · mismas aportaciones y fechas', 'La diferencia en el tiempo', 'Los momentos', 'A final de cada año', 'Año a año, por tiempo (TWR)', 'Medidas frente a la referencia', 'Otras referencias', 'De dónde sale la diferencia', 'Captura en subidas y bajadas']);
  // la tarjeta grande ocupa todo el ancho; la bolita y las cifras, al lado de la gráfica
  const [c12, lado, graf] = await Promise.all([panel.locator('.pav-c12').first().boundingBox(), panel.locator('.fr-hero-lado').boundingBox(), panel.locator('#frGraf').boundingBox()]);
  expect(lado.x).toBeGreaterThan(graf.x + graf.width - 2);
  expect(Math.abs(lado.y - graf.y)).toBeLessThan(140);
  const ancho = await panel.boundingBox();
  expect(c12.width).toBeGreaterThan(ancho.width * 0.95);
  // las dos gráficas, con escala (rótulos en el eje)
  for (const id of ['#frGraf', '#frDif']) expect(await page.locator(`${id} svg text`).count()).toBeGreaterThan(3);
  // la bolita dice la diferencia de hoy, la misma que el cálculo
  const dif = await page.evaluate(() => eurS(frenteCartera(calcular()).dif, 0));
  await expect(panel.locator('.fr-bola b')).toHaveText(dif);
  await expect(panel.locator('.fr-hitos span').last()).toContainText('Hoy');
  // filas de la misma altura: diferencia y momentos; final de cada año y TWR; los tres candados
  const alturas = async (sel) => (await panel.locator(sel).evaluateAll((xs) => xs.map((x) => Math.round(x.getBoundingClientRect().height))));
  const fila = await alturas('.fr-igual');
  expect(fila).toHaveLength(7);
  expect(fila[0]).toBe(fila[1]); expect(fila[2]).toBe(fila[3]); expect(new Set(fila.slice(4)).size).toBe(1);
  const tops = await panel.locator('.fr-igual').evaluateAll((xs) => xs.map((x) => Math.round(x.getBoundingClientRect().top)));
  expect(new Set(tops.slice(4)).size).toBe(1);
  // las seis medidas en una fila
  const kt = await panel.locator('.pav-c12').nth(1).locator('.pav-kpi').evaluateAll((xs) => xs.map((x) => Math.round(x.getBoundingClientRect().top)));
  expect(kt).toHaveLength(6); expect(new Set(kt).size).toBe(1);
  await textosCnmv(panel);
  // sin Dorado: tres candados con su botón, y las otras referencias con candado llevan a lo mismo
  await expect(panel.locator('.fr-bloq')).toHaveCount(3);
  await expect(panel.locator('.fr-ref .fr-cand')).toHaveCount(4);
  await panel.locator('[data-fr-ref="ishares-us"]').click();
  await expect(page.locator('.hoja-escr')).toContainText('Toisón Dorado');
  await page.keyboard.press('Escape');
  await expect(panel.locator('[data-fr-ref="fidelity-world"]')).toHaveAttribute('aria-pressed', 'true');
});

test('ordenador con Dorado: otras referencias, de dónde sale la diferencia (suma lo de arriba) y la captura; se elige la referencia', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'es la forma del ordenador');
  await abrir(page, 'avanzado');
  await page.evaluate(() => { S.esDueno = true; LS.set('inv-dorado-ver', 1); repintarAv(); });
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.fr-bloq')).toHaveCount(0);
  await expect(panel.locator('.fr-ref .fr-cand')).toHaveCount(0);
  // otras referencias, en el orden de la lista y sin la elegida
  const refs = await panel.locator('.pav-c4').filter({ hasText: 'Otras referencias' }).locator('tbody tr td:first-child').allInnerTexts();
  expect(refs).toEqual(['S&P 500', 'MSCI Europe', 'Emergentes', '60/40']);
  expect(await panel.locator('.pav-c4').filter({ hasText: 'De dónde sale' }).locator('.pav-fila').count()).toBeGreaterThan(2);
  await expect(panel.locator('.pav-c4').filter({ hasText: 'Captura' }).locator('.pav-kpi b').first()).toContainText('%');
  // con el S&P 500, la frase y la bolita cambian; se recuerda
  await panel.locator('[data-fr-ref="ishares-us"]').click();
  await expect(panel.locator('[data-fr-ref="ishares-us"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('.fr-frase')).toContainText('S&P 500');
  const [b, esp, ls] = await page.evaluate(() => [document.querySelector('.fr-bola b').textContent, eurS(frenteCartera(calcular(), 'ishares-us').dif, 0), LS.get('inv-frente-ref')]);
  expect(b).toBe(esp); expect(ls).toBe('ishares-us');
  const refs2 = await panel.locator('.pav-c4').filter({ hasText: 'Otras referencias' }).locator('tbody tr td:first-child').allInnerTexts();
  expect(refs2).toEqual(['MSCI World', 'MSCI Europe', 'Emergentes', '60/40']);
});

test('móvil (y básico): tres tarjetas, primero tu cartera y el indexado, todas las gráficas con escala y la tabla a un toque', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'es la forma del móvil (el básico del ordenador va en la siguiente)');
  await abrir(page, 'avanzado');
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.pab-cab')).toHaveText(['Tu cartera y el indexado', '¿Por encima o por debajo?', 'A final de cada año', 'Pregúntale a la IA']);
  // la bolita y las cifras arriba, las dos líneas debajo
  const [bola, graf] = await Promise.all([panel.locator('.fr-bola').boundingBox(), panel.locator('#frGraf').boundingBox()]);
  expect(graf.y).toBeGreaterThan(bola.y + bola.height - 2);
  for (const id of ['#frGraf', '#frDif']) expect(await page.locator(`${id} svg text`).count()).toBeGreaterThan(3);
  // en el móvil, como mucho cuatro años de barras (la cartera empieza en 2021: seis); todos, en la tabla, a un toque
  await expect(panel.locator('.fr-par')).toHaveCount(4);
  await expect(panel.locator('.fr-tabla-d tbody tr')).toHaveCount(6);
  await expect(panel.locator('.fr-tabla-d table')).toBeHidden();
  await panel.locator('.fr-tabla-d summary').click();
  await expect(panel.locator('.fr-tabla-d table')).toBeVisible();
  // en Análisis › Rentabilidad, el apartado «Frente a un indexado» (el otro se llama Resumen)
  await expect(page.locator('.apartados a')).toHaveText(['Resumen', 'Frente a un indexado']);
  await expect(page.locator('.apartados a[aria-current="page"]')).toHaveText('Frente a un indexado');
  await expect(page.locator('.pest-av a[aria-current="page"]')).toHaveText('Rentabilidad');
  await textosCnmv(panel);
  // nada se sale de la pantalla
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('básico en el ordenador: las tres tarjetas, sin siglas, y desde Rentabilidad se llega con «Verlo mes a mes»', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'el básico del ordenador');
  await abrir(page, 'basico');
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.pab-cab')).toHaveText(['Tu cartera y el indexado', '¿Por encima o por debajo?', 'A final de cada año', 'Pregúntale a la IA']);
  expect(await panel.innerText()).not.toMatch(/\b(TWR|TIR|Beta|Alfa|Tracking)\b/);
  await page.evaluate(() => { location.hash = 'av-rentab'; });
  await expect(page.locator('#panelAv[data-p="rentab"] .fr-ir')).toBeVisible({ timeout: 20_000 });
  await page.locator('#panelAv .fr-ir').click();
  await expect(page.locator('#panelAv[data-p="frente"]:not([aria-busy]) .fr-bola')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.k2-lista a[aria-current="page"]')).toHaveText('Frente a un indexado');
});

test('sin la fecha de compra, lo dice y no pinta nada inventado', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'basta con uno');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { location.hash = 'av-frente'; });
  await expect(page.locator('#panelAv[data-p="frente"]:not([aria-busy]) .pav-t')).toContainText('hace falta la fecha de compra', { timeout: 20_000 });
  await expect(page.locator('#frGraf')).toHaveCount(0);
});
