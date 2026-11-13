// Hacienda > Tu renta (fase 2 del rediseño, sesión 1, 13 nov 2026): el recorrido casilla a casilla en el orden de Renta
// Web, sacado de lo que sabe Toisón. Con las cifras de la maqueta: Repsol +240 e IAG −95 (acciones, Trade Republic), el
// oro +118 (ETC, va en la 0031), bitcoin +276 (Bitvavo, lo metes tú), 286 € de dividendos e intereses (6 de intereses),
// 54,34 € retenidos y 120 € de pérdidas de 2024. Base del ahorro 705, cuota 133,95.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

async function conVentas(page, { intereses = 6 } = {}) {
  await crearCuenta(page);
  // la guía de primeros pasos de una cuenta recién creada sale una vez, al rato: se espera a que salga y se quita
  await page.waitForSelector('.hoja-guia', { timeout: 10_000 }).catch(() => {});
  await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); });
  await page.evaluate(async (intereses) => {
    const a = anioRenta();
    const v = (id, instrumento, plataforma, fecha, uds, importe, coste) => ({ id, tipo: 'venta', fecha: `${a}-${fecha}`, instrumento, plataforma, uds, importe, coste_vendido: coste, resultado: +(importe - coste).toFixed(2) });
    S.cartera.movimientos = [v('v1', 'repsol', 'Trade Republic', '03-12', 30, 630, 390), v('v2', 'iag', 'Trade Republic', '06-04', 200, 665, 760),
      v('v3', 'phau', 'MyInvestor', '09-09', 2, 530, 412), v('v4', 'btc', 'Bitvavo', '10-21', 0.012, 1020, 744)];
    // sin recompras dentro de plazo: las posiciones de prueba son de enero de 2025
    S.cartera.fiscal = { [a]: { rcm: 286, ...(intereses != null ? { intereses } : {}), retenido: 54.34, pendientes: 120 } };
    S.cartera.perfil = { ...(S.cartera.perfil || {}), comunidad: 'madrid' };
    await guardarCartera('prueba');
    LS.set('inv-hz-donde', null);
    S.vista = 'fiscal'; S.fisTab = 'renta'; S.hzR = null; pintar();
  }, intereses);
  await page.waitForSelector('#hz .hz-panel');
}

test('las casillas salen de tus datos, en el orden de Renta Web, con lo que no te toca en gris', async ({ page, errores }) => {
  await conVentas(page);
  const r = await page.evaluate(() => {
    const R = hzCasillas(anioRenta(), S.M), c = Object.fromEntries(R.L.map((x) => [x.k, x]));
    return { orden: R.L.map((x) => x.k), v: Object.fromEntries(R.L.filter((x) => x.v != null).map((x) => [x.k, +x.v.toFixed(2)])), e: Object.fromEntries(R.L.map((x) => [x.k, x.e])), o: { c0328: c.c0328.o, cripto: c.cripto.o, c0031: c.c0031.o }, base: R.fa.base, cuota: +R.fa.cuota.toFixed(2) };
  });
  expect(r.orden).toEqual(['datos', 'sueldo', 'c0027', 'c0029', 'c0031', 'fondos', 'etf', 'c0328', 'cripto', 'perd', 'c0588', 'm720', 'res']);
  expect(r.v).toMatchObject({ c0027: 6, c0029: 280, c0031: 118, c0328: 145, cripto: 276, perd: -120 });
  // el ETC no va con las acciones; las acciones de Trade Republic se miran en el borrador; la cripto de Bitvavo la metes tú
  expect(r.e).toMatchObject({ fondos: 'no', etf: 'no', c0328: 'comprueba', cripto: 'listo', c0588: 'listo', m720: 'no' });
  expect(r.o).toEqual({ c0328: 'borrador', cripto: 'tu', c0031: 'borrador' });
  expect(r.base).toBe(705);
  expect(r.cuota).toBe(133.95);

  const hz = page.locator('#hz');
  // la tira: las casillas que te tocan y lo que sale por tus inversiones (134 − 54 = 80)
  await expect(hz.locator('.hz-tira')).toContainText('casillas listas');
  await expect(hz.locator('.hz-tira')).toContainText('80');
  // la lista por apartados de Renta Web, con lo que no te toca en gris y sin botón
  await expect(hz.locator('.hz-pg').first()).toHaveText('Antes de empezar');
  await expect(hz.locator('.hz-lista')).toContainText('Ganancias y pérdidas patrimoniales');
  await expect(hz.locator('.hz-paso.z-gris', { hasText: 'Fondos cotizados (ETF)' })).toHaveCount(1);
  await expect(hz.locator('button.hz-paso', { hasText: 'Fondos de inversión' })).toHaveCount(0);
  // al abrir sin nada guardado: la primera casilla por mirar (las acciones de Trade Republic)
  await expect(hz.locator('#hzTit')).toHaveText('Ventas de acciones');
  await expect(hz.locator('.hz-panel')).toContainText('Trade Republic a veces manda las ventas de acciones');
});

test('Anterior y Siguiente, venta a venta con copiar y «Lo dejaste aquí» al volver', async ({ page, errores }) => {
  await conVentas(page);
  const hz = page.locator('#hz');
  await hz.locator('button.hz-paso', { hasText: 'Monedas virtuales' }).click();
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
  await hz.locator('.hz-filtro [data-f="tu"]').click();
  await expect(hz.locator('button.hz-paso')).toHaveText([/Monedas virtuales/, /Dividendos de fuera/]);
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
  await expect(hz.locator('.hz-tira')).toContainText('falta 1 dato');
  await hz.locator('button.hz-paso', { hasText: 'Intereses y dividendos' }).click();
  await expect(hz.locator('.hz-falta')).toContainText('¿Cuánto es de intereses?');
  await page.evaluate(() => { S.cartera.fiscal[anioRenta()].hzPrueba = 1; });
  await hz.locator('.hz-falta [data-hz="datos"]').click();
  await page.fill('#fFis [name="intereses"]', '6');
  await page.click('#fFis [type="submit"]');
  await expect(hz.locator('button.hz-paso', { hasText: 'Intereses de cuentas' })).toBeVisible();
  await expect(hz.locator('.hz-tira')).not.toContainText('falta');
  expect(await page.evaluate(() => S.cartera.fiscal[anioRenta()])).toMatchObject({ rcm: 286, intereses: 6, hzPrueba: 1 });
  // más intereses que el total: no se guarda
  await hz.locator('button.hz-paso', { hasText: 'Tus datos' }).click();
  await hz.locator('.hz-panel [data-hz="datos"]').click();
  await page.fill('#fFis [name="intereses"]', '300');
  await page.click('#fFis [type="submit"]');
  await expect(page.locator('#errFis')).toContainText('no pueden pasar');
});
