// Hacienda > Tu renta (fase 2 del rediseño, sesión 1, 13 nov 2026): el recorrido casilla a casilla en el orden de Renta
// Web, sacado de lo que sabe Toisón. Con las cifras de la maqueta: Repsol +240 e IAG −95 (acciones, Trade Republic), el
// oro +118 (ETC, va en la 0031), bitcoin +276 (Bitvavo, lo metes tú), 286 € de dividendos e intereses (6 de intereses),
// 54,34 € retenidos y 120 € de pérdidas de 2024. Base del ahorro 705, cuota 133,95.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, hzLista, hzCerrarLista, hzIrA, hzTextoTira, hzConVentas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

const conVentas = hzConVentas;

test('las casillas salen de tus datos, en el orden de Renta Web, con lo que no te toca en gris', async ({ page, errores }) => {
  await conVentas(page);
  const r = await page.evaluate(() => {
    const R = hzCasillas(anioRenta(), S.M), c = Object.fromEntries(R.L.map((x) => [x.k, x]));
    return { orden: R.L.map((x) => x.k), v: Object.fromEntries(R.L.filter((x) => x.v != null).map((x) => [x.k, +x.v.toFixed(2)])), e: Object.fromEntries(R.L.map((x) => [x.k, x.e])), o: { c0328: c.c0328.o, cripto: c.cripto.o, c0031: c.c0031.o }, base: R.fa.base, cuota: +R.fa.cuota.toFixed(2) };
  });
  expect(r.orden).toEqual(['datos', 'sueldo', 'c0027', 'c0029', 'c0031', 'fondos', 'etf', 'c0328', 'cripto', 'perd', 'c0588', 'm720', 'res', 'hoja']);
  expect(r.v).toMatchObject({ c0027: 6, c0029: 280, c0031: 118, c0328: 145, cripto: 276, perd: -120 });
  // el ETC no va con las acciones; las acciones de Trade Republic se miran en el borrador; la cripto de Bitvavo la metes tú
  expect(r.e).toMatchObject({ c0031: 'falta', fondos: 'no', etf: 'no', c0328: 'comprueba', cripto: 'listo', c0588: 'listo', m720: 'no' });
  expect(r.o).toEqual({ c0328: 'borrador', cripto: 'tu', c0031: 'borrador' });
  expect(r.base).toBe(705);
  expect(r.cuota).toBe(133.95);

  const hz = page.locator('#hz');
  // la tira: las casillas que te tocan y lo que sale por tus inversiones (134 − 54 = 80)
  expect(await hzTextoTira(page)).toContain('casillas listas');
  expect(await hzTextoTira(page)).toContain('80');
  // al abrir sin nada guardado: la primera casilla por mirar (el oro, al que le falta saber si te retuvieron)
  await expect(hz.locator('#hzTit')).toHaveText('Oro (ETC)');
  expect(await hzTextoTira(page)).toContain('falta 1 dato');
  // la lista por apartados de Renta Web, con lo que no te toca en gris y sin botón (en el móvil, en su hoja)
  const lista = await hzLista(page);
  await expect(lista.locator('.hz-pg').first()).toHaveText('Antes de empezar');
  await expect(lista).toContainText('Ganancias y pérdidas patrimoniales');
  await expect(lista.locator('.hz-paso.z-gris', { hasText: 'Fondos cotizados (ETF)' })).toHaveCount(1);
  await expect(lista.locator('button.hz-paso', { hasText: 'Fondos de inversión' })).toHaveCount(0);
  await hzIrA(page, 'Ventas de acciones');
  await expect(hz.locator('.hz-panel')).toContainText('Trade Republic a veces manda las ventas de acciones');
});

test('Anterior y Siguiente, venta a venta con copiar y «Lo dejaste aquí» al volver', async ({ page, errores }) => {
  await conVentas(page);
  const hz = page.locator('#hz');
  await hzIrA(page, 'Monedas virtuales');
  await expect(hz.locator('#hzTit')).toHaveText('Monedas virtuales');
  await expect(hz.locator('.hz-ptu')).toContainText('Lo metes tú');
  // venta a venta: se abre y enseña lo que hay que teclear
  await hz.locator('.hz-venta-cab').first().click();
  await expect(hz.locator('.hz-campos')).toContainText('Valor de transmisión');
  await expect(hz.locator('.hz-campo', { hasText: 'Valor de transmisión' }).locator('[data-hz="copia"]')).toHaveAttribute('data-v', '1020,00');
  // Siguiente salta lo que no te toca
  await hz.locator('.hz-panel-pie .btn.pri').click();
  await expect(hz.locator('#hzTit')).toHaveText('Pérdidas de años anteriores');
  // British American Tobacco paga dividendos desde fuera: la doble imposición la metes tú
  await hz.locator('.hz-panel-pie .btn.pri').click();
  await expect(hz.locator('#hzTit')).toHaveText('Dividendos de fuera');
  await expect(hz.locator('.hz-panel')).toContainText('para no pagar dos veces');
  await hz.locator('.hz-panel-pie .btn.pri').click();
  await expect(hz.locator('#hzTit')).toHaveText('Lo que pagas por tus inversiones');
  await expect(hz.locator('.hz-panel')).toContainText('Es una estimación');
  await expect(hz.locator('.hz-panel .hz-res')).toContainText('80');
  // filtros: «Metes tú» deja la cripto y los dividendos de fuera
  const lista = await hzLista(page);
  await lista.locator('.hz-filtro [data-f="tu"]').click();
  await expect(lista.locator('button.hz-paso')).toHaveText([/Monedas virtuales/, /Dividendos de fuera/]);
  await hzCerrarLista(page);
  await hz.locator('.hz-panel-pie .btn.pri').click();
  await expect(hz.locator('#hzTit')).toHaveText('Tu hoja para Renta Web');
  await hz.locator('.hz-panel-pie .btn').first().click();
  // al volver otro día, donde lo dejaste
  await page.evaluate(() => { const g = LS.get('inv-hz-donde'); g.t -= 864e5; LS.set('inv-hz-donde', g); S.hzR = null; pintar(); });
  await expect(hz.locator('#hzTit')).toHaveText('Lo que pagas por tus inversiones');
  await expect(hz.locator('.hz-recuerda')).toHaveText('Lo dejaste aquí ayer');
  await hz.locator('.hz-panel-pie .btn').first().click();
  await expect(hz.locator('.hz-recuerda')).toHaveCount(0);
});

test('sin separar los intereses, falta un dato; Datos fiscales los separa sin perder lo de Tu renta', async ({ page, errores }) => {
  await conVentas(page, { intereses: null });
  const hz = page.locator('#hz');
  expect(await hzTextoTira(page)).toContain('faltan 2 datos');
  await hzIrA(page, 'Intereses y dividendos');
  await expect(hz.locator('.hz-falta')).toContainText('¿Cuánto es de intereses?');
  await page.evaluate(() => { S.cartera.fiscal[anioRenta()].hzPrueba = 1; });
  await hz.locator('.hz-falta [data-hz="datos"]').click();
  await page.fill('#fFis [name="intereses"]', '6');
  await page.click('#fFis [type="submit"]');
  await expect((await hzLista(page)).locator('button.hz-paso', { hasText: 'Intereses de cuentas' })).toBeVisible();
  await hzCerrarLista(page);
  expect(await hzTextoTira(page)).toContain('falta 1 dato');
  expect(await page.evaluate(() => S.cartera.fiscal[anioRenta()])).toMatchObject({ rcm: 286, intereses: 6, hzPrueba: 1 });
  // más intereses que el total: no se guarda
  await hzIrA(page, 'Tus datos');
  await hz.locator('.hz-panel [data-hz="datos"]').click();
  await page.fill('#fFis [name="intereses"]', '300');
  await page.click('#fFis [type="submit"]');
  await expect(page.locator('#errFis')).toContainText('no pueden pasar');
});

test('el oro: la pregunta de la retención entra en la cuenta y se guarda cifrada', async ({ page, errores }) => {
  await conVentas(page);
  const hz = page.locator('#hz');
  await expect(hz.locator('#hzTit')).toHaveText('Oro (ETC)');
  await expect(hz.locator('.hz-falta')).toContainText('¿MyInvestor te retuvo algo al vender?');
  // nada se sale por los lados, tampoco en 360
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await hz.locator('.hz-falta [data-r="22.42"]').click();
  await expect(hz.locator('.hz-falta.z-hecho')).toContainText('te retuvieron 22,42');
  await expect(hz.locator('.hz-campos')).toContainText('Retenciones');
  // 134 − 54,34 − 22,42 = 57,19: la tira lo dice y ya no falta nada
  await expect.poll(() => hzTextoTira(page)).toContain('57');
  expect(await hzTextoTira(page)).not.toContain('falta');
  expect(await page.evaluate(() => S.cartera.fiscal[anioRenta()].hzRetEtc)).toBe(22.42);
  // «Otra cifra»
  await hz.locator('.hz-falta [data-r="borrar"]').click();
  await hz.locator('.hz-falta [data-r="otra"]').click();
  await page.fill('#hzEtcOtra', '10,5');
  await page.press('#hzEtcOtra', 'Enter');
  await expect(hz.locator('.hz-falta.z-hecho')).toContainText('10,50');
  // y no lo borra guardar Datos fiscales
  await page.evaluate(() => editarFiscal(anioRenta()));
  await page.click('#fFis [type="submit"]');
  await expect(hz.locator('.hz-falta.z-hecho')).toContainText('10,50');
});

test('¿qué pone tu borrador? y la hoja: marcar, copiar todo y para tener al lado', async ({ page, errores }, info) => {
  await conVentas(page);
  const hz = page.locator('#hz');
  await hzIrA(page, 'Ventas de acciones');
  await page.fill('#hzCmp-c0328', '0');
  await hz.locator('[data-hz="cmp"][data-k="c0328"]').click();
  await expect(hz.locator('.hz-cmp-r.z-mal')).toContainText('Lo más probable: tu bróker las puso en la 0031');
  await page.fill('#hzCmp-c0328', '145,00');
  await page.press('#hzCmp-c0328', 'Enter');
  await expect(hz.locator('.hz-cmp-r.z-ok')).toHaveText('Cuadra con lo tuyo.');
  // la hoja
  if (info.project.name === 'pc') await hz.locator('.hz-tira [data-k="hoja"]').click(); else await hzIrA(page, 'Tu hoja para Renta Web');
  await expect(hz.locator('#hzTit')).toHaveText('Tu hoja para Renta Web');
  const hoja = hz.locator('#hzHoja');
  await expect(hoja).toContainText('Ganancias y pérdidas patrimoniales');
  await expect(hoja.locator('.hz-hs', { hasText: 'Repsol · transmisión' }).locator('[data-hz="copia"]')).toHaveAttribute('data-v', '630,00');
  await expect(hoja.locator('.hz-hg.z-no').first()).toContainText('Fondos de inversión');
  await expect(hoja.locator('.hz-hoja-p')).toContainText('0 de 8 hechas');
  await hoja.locator('[data-hz-hecho="c0328"]').check({ force: true });
  await expect(hoja.locator('.hz-hoja-p')).toContainText('1 de 8 hechas');
  const t = await page.evaluate(() => hzTextoHoja(S.hzUlt));
  expect(t).toContain('0328 Ventas de acciones: 145,00');
  expect(t).toContain('  Bitcoin · adquisición: 744,00');
  const d = await page.evaluate(() => S.cartera.fiscal[anioRenta()]);
  expect(d.hzHechos).toEqual(['c0328']);
  expect(d.hzBorr).toEqual({ c0328: '145,00' });
  if (info.project.name === 'pc') {
    await hoja.locator('[data-hz="lado"]').click();
    await expect(hz.locator('.hz-B-hoja .hz-hoja.z-lado')).toBeVisible();
    expect(await hz.locator('.hz-hoja.z-lado').evaluate((e) => Math.round(e.getBoundingClientRect().width))).toBe(420);
    await expect(hz.locator('.hz-renta-web a')).toHaveAttribute('href', /agenciatributaria\.gob\.es/);
    await hz.locator('.hz-volver').click();
    await expect(hz.locator('.hz-lista')).toBeVisible();
  }
});
