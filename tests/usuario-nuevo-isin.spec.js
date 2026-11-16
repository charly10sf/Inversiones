// 16 nov 2026 (menos peticiones a Yahoo): lo que nadie había pedido nunca sale igual que antes. Un usuario nuevo busca por
// ISIN un fondo y una acción que no están en el catálogo: el Worker los busca en el momento (/isin), salen con precio y
// gráfica del año, la espera es la de la búsqueda (no hay nada más por medio) y quedan pedidos para que la Action los
// siga desde la pasada siguiente (la acción, por su símbolo, al radar; el fondo, por su ISIN, al catálogo).
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

const ANIO = Array.from({ length: 252 }, (_, k) => [new Date(Date.now() - (251 - k) * 1.45 * 864e5).toISOString().slice(0, 10), 100 + k / 10]);
const ENCONTRADOS = {
  // un fondo y una acción inventados: no pueden estar en ningún catálogo
  LU9999999998: { isin: 'LU9999999998', s: '0P9999999X.F', n: 'Fondo Prueba Global Index Fund A Acc EUR', tipo: 'MUTUALFUND', m: 'EUR', bolsa: 'Frankfurt', h: ANIO },
  ES9999999991: { isin: 'ES9999999991', s: 'PRUEBA.MC', n: 'Empresa de Prueba, S.A.', tipo: 'EQUITY', m: 'EUR', bolsa: 'MCE', h: ANIO },
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
    // cuando sale el resultado de la búsqueda, se añade (el segundo «Añadir»)
    const mirar = setInterval(() => {
      if (document.querySelector('#fIsin .isin-ok-p')) {
        clearInterval(mirar);
        espera = Math.round(performance.now() - t0);
        f.requestSubmit();
      }
    }, 20);
  }), isin);
}

test('un fondo y una acción que nadie había pedido salen con precio y gráfica, y quedan pedidos', async ({ page, context }) => {
  const pedidas = [];
  await abrir(page, context, pedidas);
  for (const isin of Object.keys(ENCONTRADOS)) {
    const r = await buscarYAnadir(page, isin);
    expect(r.cid).toBe(`c-${isin.toLowerCase()}`);
    // con precio de hoy en euros y el año entero para la gráfica
    expect(r.x.p).toBeCloseTo(ANIO[ANIO.length - 1][1], 4);
    expect(r.x.h.length).toBe(ANIO.length);
    expect(r.x.r1a).not.toBeNull();
    // la espera es la de la búsqueda del Worker (300 ms en la prueba) y poco más
    expect(r.espera).toBeLessThan(2500);
    expect(r.inst).toBeTruthy();
  }
  // la acción, como acción (irá al radar por su símbolo); el fondo, como fondo
  const tipos = await page.evaluate(() => [S.cat.v['c-lu9999999998'].t, S.cat.v['c-es9999999991'].t]);
  expect(tipos[0]).toMatch(/Fondo/);
  expect(tipos[1]).toBe('Acción');
  // los dos quedan pedidos para que la Action los siga (con la sesión, el Worker lanza el catálogo)
  await expect.poll(() => [...pedidas].sort().join(',')).toBe('ES9999999991,LU9999999998');
});
