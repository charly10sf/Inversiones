// Catálogo ampliado (0.8.1d, 5 nov 2026): los ETF de Xetra y los fondos españoles de la CNMV van en catalogo-mas.json,
// que no se baja al abrir: se baja al buscar (o al añadir con su ISIN) y no se guarda en el dispositivo. Lo que se
// añade de ahí sí se guarda (como lo añadido con su ISIN) y se pide, para que pase a catalogo-precios.json
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

const COLS = ['isin', 'n', 'c', 's', 't', 'cl', 'r', 'm', 'dom', 'p', 'pa', 'f', 'r1a'];
const MAS = {
  generado: '2026-11-05T05:00:00+00:00', cols: COLS,
  v: [
    ['ES0114675004', 'Bestinver Renta FI, clase R', 'Bestinver Renta', '0P0000ZZZ1.F', 'Fondo de renta fija', 'Renta fija', null, 'EUR', 'bestinver.es', 9.5, 9.48, '2026-11-04', 3.1],
    ['BG9000011163', 'Expat Bulgaria SOFIX UCITS ETF', 'Expat Bulgaria SOFIX', 'BGX.DE', 'ETF', 'Renta variable', { Europa: 100 }, 'EUR', 'expat.bg', 1.21, 1.2, '2026-11-05', 14.2],
  ],
};

async function abrir(page, context, contar) {
  await context.route('https://raw.githubusercontent.com/**/catalogo-mas.json*', (r) => { contar.mas++; return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(MAS) }); });
  await context.route('https://raw.githubusercontent.com/**/cat/c-es0114675004.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ sem: 1, h: Array.from({ length: 53 }, (_, k) => [new Date(Date.now() - (52 - k) * 7 * 864e5).toISOString().slice(0, 10), 9 + k / 100]) }) }));
  await context.route('https://*.workers.dev/isin**', (r) => { contar.worker++; return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":false,"error":"no-esta"}' }); });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { S.cat.mas = { id: 'prueba-1', n: 2 }; });
}

test('se baja al buscar, una vez, sin guardarse, y lo añadido se guarda y se pide', async ({ page, context }) => {
  const contar = { mas: 0, worker: 0 };
  await abrir(page, context, contar);
  expect(contar.mas).toBe(0);   // al abrir, no
  const r = await page.evaluate(async () => {
    const antes = candidatosBusqueda().length;
    const llego = await cargarCatalogoMas();
    const otraVez = await cargarCatalogoMas();
    const cands = candidatosBusqueda();
    const porIsin = buscarEn(cands, 'ES0114675004')[0];
    const porNombre = buscarEn(cands, 'expat bulgaria').map((c) => c.k);
    const guardado = Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes('BG9000011163'));
    // añadirlo (como al elegirlo en el buscador)
    const id = idDeCandidato(porIsin);
    const inst = S.inst[id];
    const local = JSON.parse(localStorage.getItem('inv-cat-local') || '{}')['c-es0114675004'];
    return { antes, despues: cands.length, llego, otraVez, porIsin: porIsin && porIsin.k, porNombre, guardado, id, nombre: inst && inst.nombre, tipo: inst && inst.tipo, clase: inst && inst.clase,
      local: !!(local && local.local && local.p === 9.5), enCat: !!(S.cat.v['c-es0114675004'] && S.cat.v['c-es0114675004'].local), precio: precioInst(id) };
  });
  expect(r.llego).toBe(true);
  expect(r.otraVez).toBe(false);
  expect(contar.mas).toBe(1);
  expect(r.despues).toBe(r.antes + 2);
  expect(r.porIsin).toBe('cat:c-es0114675004');
  expect(r.porNombre).toContain('cat:c-bg9000011163');
  expect(r.guardado).toBe(false);
  expect(r.id).toBe('c-es0114675004');
  expect(r.nombre).toBe('Bestinver Renta FI, clase R');
  expect(r.tipo).toBe('Fondo de renta fija');
  expect(r.clase).toBe('Renta fija');
  expect(r.local && r.enCat).toBe(true);
  expect(r.precio).toBe(9.5);
  // al volver a abrir, sigue (de la copia del dispositivo) sin bajar catalogo-mas.json
  await page.reload();
  await quitarCapas(page);
  const tras = await page.evaluate(() => ({ p: S.cat && S.cat.v['c-es0114675004'] && S.cat.v['c-es0114675004'].p, mas: !!S.catMas }));
  expect(tras).toEqual({ p: 9.5, mas: false });
  expect(contar.mas).toBe(1);
});

test('en Mercados: escribir su nombre lo encuentra, con su gráfica del año', async ({ page, context }) => {
  const contar = { mas: 0, worker: 0 };
  await abrir(page, context, contar);
  await page.evaluate(() => { location.hash = '#mercados'; });
  const inp = page.locator('#mercBusca input');
  await inp.waitFor();
  await inp.focus();
  await inp.fill('bestinver renta');
  await expect(page.locator('#mercBusca .busca-res li', { hasText: 'Bestinver Renta' }).first()).toBeVisible();
  expect(contar.mas).toBe(1);
  // (la hoja de bienvenida puede salir encima en cualquier momento: el clic, desde la página)
  await quitarCapas(page);
  await page.evaluate(() => [...document.querySelectorAll('#mercBusca .busca-res li')].find((li) => li.textContent.includes('Bestinver Renta')).click());
  await expect(page.locator('#consGraf .cons-graf')).toBeVisible();
  // solo mirarlo no lo añade ni lo guarda
  const g = await page.evaluate(() => ({ cat: !!S.cat.v['c-es0114675004'], ls: (localStorage.getItem('inv-cat-local') || '').includes('ES0114675004') }));
  expect(g).toEqual({ cat: false, ls: false });
});

test('añadir con su ISIN: si está en el catálogo ampliado, sin preguntar a Yahoo', async ({ page, context }) => {
  const contar = { mas: 0, worker: 0 };
  await abrir(page, context, contar);
  const r = await page.evaluate(() => new Promise((ok) => {
    anadirPorIsin('', (cid) => ok({ cid, inst: instDeCatalogo(cid) }));
    const f = document.querySelector('#fIsin');
    f.isin.value = 'BG9000011163';
    f.requestSubmit();
  }));
  expect(r).toEqual({ cid: 'c-bg9000011163', inst: 'c-bg9000011163' });
  expect(contar.worker).toBe(0);
  expect(contar.mas).toBe(1);
});

test('sin catálogo ampliado (los datos de antes) o si no llega, se busca como siempre', async ({ page, context }) => {
  await context.route('https://raw.githubusercontent.com/**/catalogo-mas.json*', (r) => r.fulfill({ status: 404, body: '' }));
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(async () => {
    const n = candidatosBusqueda().length;
    delete S.cat.mas;
    const sinId = await cargarCatalogoMas();
    S.cat.mas = { id: 'no-llega', n: 5 };
    const noLlega = await cargarCatalogoMas();
    return { sinId, noLlega, igual: candidatosBusqueda().length === n, n };
  });
  expect(r).toEqual({ sinId: false, noLlega: false, igual: true, n: r.n });
  expect(r.n).toBeGreaterThan(100);
});
