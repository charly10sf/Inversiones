// 0.7d: el saldo del banco, como pedido por ti al abrir GrowFolio, al volver a ella y al pulsar «Actualizar» (sin el
// tope de unas 4 lecturas al día que ponen los bancos cuando no estás); solo, sin ti delante, cada 4 horas
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

test('el saldo se pide como tuyo al abrir y al volver, y solo cada 4 horas sin ti', async ({ page, context, errores }) => {
  const pedidas = [];
  // el Worker de imitación: tu cuenta puede usar el banco y la cuenta tiene 1.234,56 €
  await context.route('https://growfolio.growfolio-web-app.workers.dev/**', async (r) => {
    const url = r.request().url(), cors = { 'Access-Control-Allow-Origin': '*' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { ...cors, 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } });
    if (url.endsWith('/banco/estado')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ permitido: true, listo: true }) });
    if (url.endsWith('/banco/saldos')) {
      pedidas.push(JSON.parse(r.request().postData() || '{}'));
      return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ saldos: { 'acc-0001': { importe: 1234.56, moneda: 'EUR', tipo: 'ITAV' } }, presente: true }) });
    }
    return r.fulfill({ status: 404, headers: cors, body: '{}' });
  });
  await crearCuenta(page);
  await quitarCapas(page);
  // lo que mira el banco a los 9 s de abrir ya ha pasado (sin cuentas conectadas, no hace nada): no se cruza con la prueba
  await page.waitForTimeout(9500);
  await page.evaluate(async () => {
    S.cartera.bancos = [{ id: 'bk-acc-0001', plataforma: 'MyInvestor', banco: 'Banco de prueba', pais: 'ES', sesion: 'ses-0001', cuenta: 'acc-0001', nombre: 'Cuenta', hasta: new Date(Date.now() + 90 * 864e5).toISOString() }];
    await guardarCarteraCallada('Banco de prueba');
  });
  const efectivo = () => page.evaluate(() => ((S.cartera.efectivo || []).find((e) => e.plataforma === 'MyInvestor') || {}).importe);
  const atrasar = (min) => page.evaluate((min) => {
    BANCO.sincT -= min * 60e3;
    for (const b of S.cartera.bancos) if (b.ultimo) b.ultimo.t -= min * 60e3;
  }, min);

  // al abrir: como pedido por ti
  await page.evaluate(() => sincronizarBancos(false, false, true));
  await expect.poll(() => pedidas.length).toBe(1);
  expect(pedidas[0]).toMatchObject({ cuentas: ['acc-0001'], presente: true });
  await expect.poll(efectivo).toBe(1234.56);

  // otra vez enseguida: nada (como mucho, cada 10 minutos)
  await page.evaluate(() => sincronizarBancos(false, false, true));
  expect(pedidas.length).toBe(1);

  // pasados 11 minutos, solo y sin ti: nada todavía (cada 4 horas)
  await atrasar(11);
  await page.evaluate(() => sincronizarBancos(false));
  expect(pedidas.length).toBe(1);

  // al volver a GrowFolio pasados esos 11 minutos: sí, como tuyo
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(() => pedidas.length).toBe(2);
  expect(pedidas[1].presente).toBe(true);

  // pasadas 5 horas, solo: sí, pero sin ti
  await atrasar(5 * 60);
  await page.evaluate(() => sincronizarBancos(false));
  await expect.poll(() => pedidas.length).toBe(3);
  expect(pedidas[2].presente).toBe(false);

  // «Actualizar»: al momento y como tuyo
  await page.evaluate(() => sincronizarBancos(true, true));
  await expect.poll(() => pedidas.length).toBe(4);
  expect(pedidas[3].presente).toBe(true);
});
