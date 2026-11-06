// 0.8.3 (Carlos, 6 nov 2026): «Todo el radar» se filtra por país (la sede), sector y tamaño (capitalización en euros:
// grandes desde 10.000 millones, medianas de 2.000 a 10.000, pequeñas por debajo). Cada filtro es una pastilla con un
// select encima; las opciones dicen cuántas hay. En el móvil, la fila es más baja (antes ~163 px) y, al filtrar o al
// pedir 50 más, cada cifra sigue con su etiqueta («Precio», «Puede subir»…). Con los datos de verdad (tests/.datos).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function abrirRadar(page) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.waitForFunction(() => S.radar && S.radar.valores && S.radar.valores.length > 2000, null, { timeout: 45_000 });
  await page.waitForFunction(() => S.escaneo, null, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove());
    S.acceso = 'privado'; S.expTab = 'ideas'; S.radarN = 0; S.radarMin = true; S.radarSolidas = false; S.radarZona = 'Todas'; S.radarOrden = 'cap';
    S.radarPais = ''; S.radarSector = ''; S.radarTam = '';
    location.hash = '#expertos'; pintar();
  });
  await page.waitForSelector('#radarCuerpo tr[data-consulta]');
}
// elige una opción como lo haría la persona: cambia el select y lanza «change»
const elegir = (page, k, v) => page.evaluate(([k, v]) => {
  const s = document.querySelector(`[data-radar-filtro="${k}"]`);
  s.value = v; s.dispatchEvent(new Event('change', { bubbles: true }));
}, [k, v]);
const filas = (page) => page.evaluate(() => [...document.querySelectorAll('#radarCuerpo tr[data-consulta]')].map((tr) => {
  const x = radarVals().find((r) => r.s === tr.dataset.consulta);
  return { s: x.s, pais: x.pais, sector: x.sector, cap: x.cap, z: x.z };
}));

test('país, sector y tamaño filtran la lista y se pueden juntar', async ({ page }) => {
  await abrirRadar(page);
  const ops = await page.evaluate(() => Object.fromEntries(['pais', 'sector', 'tam'].map((k) => [k, [...document.querySelectorAll(`[data-radar-filtro="${k}"] option`)].map((o) => [o.value, o.textContent])])));
  // la primera opción es «todos»; las de país, de más a menos empresas, con el nombre en español y cuántas hay
  expect(ops.pais[0][0]).toBe('');
  expect(ops.pais[1][0]).toBe('United States');
  expect(ops.pais[1][1]).toMatch(/^EEUU \([\d.]+\)$/);
  expect(ops.pais.map((o) => o[1]).join('|')).toMatch(/Suecia \(\d+\)/);
  expect(ops.sector.map((o) => o[0])).toContain('Tecnología');
  expect(ops.tam.map((o) => o[0])).toEqual(['', 'g', 'm', 'p']);
  expect(ops.tam[1][1]).toMatch(/^Grandes, más de 10\.000 M € \([\d.]+\)$/);

  await elegir(page, 'pais', 'Sweden');
  let f = await filas(page);
  expect(f.length).toBeGreaterThan(5);
  expect(f.every((x) => x.pais === 'Sweden')).toBe(true);
  await expect(page.locator('#radarPie .radar-cuenta')).toContainText('Suecia');
  // la pastilla dice lo elegido y se resalta
  await expect(page.locator('.filtro-chip.on')).toHaveCount(1);
  await expect(page.locator('.filtro-chip.on')).toContainText('Suecia');

  await elegir(page, 'pais', '');
  await elegir(page, 'sector', 'Tecnología');
  await elegir(page, 'tam', 'g');
  f = await filas(page);
  expect(f.length).toBeGreaterThan(5);
  expect(f.every((x) => x.sector === 'Tecnología' && x.cap >= 1e10)).toBe(true);
  // sigue ordenada por tamaño
  for (let i = 1; i < f.length; i++) expect(f[i - 1].cap).toBeGreaterThanOrEqual(f[i].cap);
  // y la cuenta de abajo coincide con lo que dicen los datos
  const esperado = await page.evaluate(() => radarVals().filter((x) => x.pot != null && (x.na || 0) >= 5 && x.sector === 'Tecnología' && x.cap >= 1e10).length);
  await expect(page.locator('#radarPie .radar-cuenta')).toContainText(`de ${esperado.toLocaleString('es-ES')}`);

  await elegir(page, 'tam', 'p');
  f = await filas(page);
  expect(f.every((x) => x.cap < 2e9)).toBe(true);
  await elegir(page, 'tam', 'm');
  f = await filas(page);
  expect(f.every((x) => x.cap >= 2e9 && x.cap < 1e10)).toBe(true);

  // se guardan para la próxima vez
  const guardado = await page.evaluate(() => [LS.get('inv-radar-sector', ''), LS.get('inv-radar-tam', '')]);
  expect(guardado).toEqual(['Tecnología', 'm']);
});

test('al cambiar a una zona donde no hay empresas de ese país, el país se quita', async ({ page }) => {
  await abrirRadar(page);
  await elegir(page, 'pais', 'Sweden');
  await page.evaluate(() => document.querySelector('[data-zona="España"]').click());
  const r = await page.evaluate(() => ({ pais: S.radarPais, filas: document.querySelectorAll('#radarCuerpo tr[data-consulta]').length }));
  expect(r.pais).toBe('');
  expect(r.filas).toBeGreaterThan(0);
  // las opciones de país ya son solo las de España
  const ops = await page.evaluate(() => [...document.querySelectorAll('[data-radar-filtro="pais"] option')].map((o) => o.value));
  expect(ops).not.toContain('Sweden');
});

test('en el móvil, filas más bajas y con sus etiquetas tras filtrar y tras «Ver 50 más»', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'la fila apilada es solo del móvil');
  await abrirRadar(page);
  const mira = () => page.evaluate(() => {
    const trs = [...document.querySelectorAll('#radarCuerpo tr[data-consulta]')];
    const altos = trs.map((tr) => tr.getBoundingClientRect().height);
    const sinEtiqueta = trs.filter((tr) => !tr.children[1].dataset.l || !tr.children[3].dataset.l || !tr.children[4].dataset.l).length;
    // el nombre no se monta encima de la prensa
    const pisa = trs.filter((tr) => { const n = tr.querySelector('.radar-n').getBoundingClientRect(), p = tr.children[6].getBoundingClientRect(); return p.width && n.right > p.left + 1 && n.bottom > p.top && n.top < p.bottom; }).length;
    return { n: trs.length, max: Math.max(...altos), sinEtiqueta, pisa };
  });
  let r = await mira();
  expect(r.max).toBeLessThan(130);
  expect(r.sinEtiqueta).toBe(0);
  expect(r.pisa).toBe(0);
  await elegir(page, 'sector', 'Salud');
  r = await mira();
  expect(r.sinEtiqueta).toBe(0);
  await page.evaluate(() => document.querySelector('[data-radar-mas]').click());
  r = await mira();
  expect(r.n).toBeGreaterThan(20);
  expect(r.sinEtiqueta).toBe(0);
  expect(r.max).toBeLessThan(130);
  // el orden y los tres filtros, en una sola fila
  const fila = await page.evaluate(() => [...document.querySelectorAll('.filtros-radar > label')].map((l) => Math.round(l.getBoundingClientRect().top)));
  expect(fila.length).toBe(4);
  expect(new Set(fila).size).toBe(1);
});
