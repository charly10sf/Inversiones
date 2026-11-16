// 16 nov 2026 (revisión de menos-yahoo): lo mismo que usuario-nuevo-isin.spec.js con un ETF y una cripto. Un usuario nuevo
// busca por ISIN un ETF y un ETP de bitcoin (la cripto que tiene ISIN) que no están en ningún catálogo: el Worker los busca
// en el momento (/isin), salen con precio de hoy en euros (el ETP cotiza en dólares) y la gráfica del año, la espera es la
// de la búsqueda y quedan pedidos para que la Action los siga desde la pasada siguiente.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

const ANIO = Array.from({ length: 252 }, (_, k) => [new Date(Date.now() - (251 - k) * 1.45 * 864e5).toISOString().slice(0, 10), 50 + k / 7]);
const ENCONTRADOS = {
  // inventados: no pueden estar en ningún catálogo
  IE9999999993: { isin: 'IE9999999993', s: 'PRUEBAW.DE', n: 'Prueba MSCI World UCITS ETF USD (Acc)', tipo: 'ETF', m: 'EUR', bolsa: 'XETRA', h: ANIO },
  CH9999999996: { isin: 'CH9999999996', s: 'PRUBTC.SW', n: 'Prueba Bitcoin ETP', tipo: 'ETF', m: 'USD', bolsa: 'Swiss', h: ANIO },
};

async function abrir(page, context, pedidas) {
  await context.route('https://*.workers.dev/isin**', async (r) => {
    const u = new URL(r.request().url()), c = u.searchParams.get('c');
    if (u.searchParams.get('pedir')) pedidas.push(c);
    const d = ENCONTRADOS[c];
    await new Promise((ok) => setTimeout(ok, 300));  // lo que tarda el Worker en preguntar a Yahoo
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(d ? { ok: true, ...d } : { ok: false, error: 'no-esta' }) });
  });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
}

async function buscarYAnadir(page, isin) {
  return page.evaluate((isin) => new Promise((ok) => {
    const t0 = performance.now();
    let espera = null;
    anadirPorIsin('', (cid) => ok({ cid, espera, x: S.cat.v[cid], inst: typeof instDeCatalogo === 'function' ? instDeCatalogo(cid) : null }));
    const f = document.querySelector('#fIsin');
    f.isin.value = isin;
    f.requestSubmit();
    const mirar = setInterval(() => {
      if (document.querySelector('#fIsin .isin-ok-p')) {
        clearInterval(mirar);
        espera = Math.round(performance.now() - t0);
        f.requestSubmit();
      }
    }, 20);
  }), isin);
}

test('un ETF y una cripto por ISIN que nadie había pedido salen con precio en euros y gráfica, y quedan pedidos', async ({ page, context }) => {
  const pedidas = [];
  await abrir(page, context, pedidas);
  // cuántos euros vale un dólar con los cambios de hoy (los de precios.json)
  const usd = await page.evaluate(() => eurPor('USD'));
  expect(usd).toBeGreaterThan(0);
  for (const [isin, d] of Object.entries(ENCONTRADOS)) {
    const r = await buscarYAnadir(page, isin);
    expect(r.cid).toBe(`c-${isin.toLowerCase()}`);
    const f = d.m === 'USD' ? usd : 1;
    // con precio de hoy en euros, el cierre anterior y el año entero para la gráfica
    expect(r.x.p).toBeCloseTo(ANIO[ANIO.length - 1][1] * f, 4);
    expect(r.x.pa).toBeCloseTo(ANIO[ANIO.length - 2][1] * f, 4);
    expect(r.x.h.length).toBe(ANIO.length);
    expect(r.x.r1a).toBeCloseTo((ANIO[ANIO.length - 1][1] / ANIO[0][1] - 1) * 100, 1);
    expect(r.espera).toBeLessThan(2500);
    expect(r.inst).toBeTruthy();
  }
  // el ETF, como ETF de bolsa; el ETP de bitcoin, como cripto (y, en la renta, como lo que es: un ETP)
  const v = await page.evaluate(() => [S.cat.v['c-ie9999999993'], S.cat.v['c-ch9999999996']].map((x) => [x.t, x.cl]));
  expect(v[0]).toEqual(['ETF', 'Renta variable']);
  expect(v[1]).toEqual(['ETC', 'Cripto']);
  await expect.poll(() => [...pedidas].sort().join(',')).toBe('CH9999999996,IE9999999993');
});
