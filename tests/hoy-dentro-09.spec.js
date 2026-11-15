// 0.9 · Hoy por dentro (maqueta del 15 nov, claude/decisiones-15nov-maqueta-paso-hoy.md, B2 y B3): la gráfica con cuatro
// pestañas (Valor, Rendimiento, Caída y Cobros), el marcador de Rendimiento (tu %, el del índice y la diferencia, con el
// dato al final de cada línea) y lo del día debajo de la gráfica. La cifra grande es siempre el patrimonio (B1).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, tocar } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function hoy(page) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false; S.rango = '1A'; location.hash = 'cartera'; pintar(); });
  await quitarCapas(page);
  await expect(page.locator('#grafEvo svg')).toBeVisible();
}
const K = { Valor: 'valor', Rendimiento: 'rend', 'Caída': 'caida', Cobros: 'cobros' };
const pestana = (page, t) => page.locator(`.hoy-pest [data-hpest="${K[t]}"]`);
const abrir = (page, t) => tocar(page, `.hoy-pest [data-hpest="${K[t]}"]`);

test('cuatro pestañas: Valor es la de siempre y la cifra grande sigue siendo el patrimonio', async ({ page }) => {
  await hoy(page);
  await expect(page.locator('.hoy-pest [role="tab"]')).toHaveText(['Valor', 'Rendimiento', 'Caída', 'Cobros']);
  await expect(pestana(page, 'Valor')).toHaveAttribute('aria-selected', 'true');
  for (const t of ['Rendimiento', 'Caída', 'Cobros']) {
    await abrir(page, t);
    await expect(pestana(page, t)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#grafEvo svg.hg')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#heroLbl')).toHaveText('Patrimonio');
    // la de Valor (los precios en directo la mueven: se compara con la de ese momento)
    const n = Number((await page.locator('#heroNum').innerText()).replace(/[^\d,]/g, '').replace(',', '.'));
    expect(Math.abs(n - (await page.evaluate(() => S.M.total)))).toBeLessThan(100);
  }
  // se acuerda de la pestaña
  await page.evaluate(() => { S.hpest = null; pintar(); });
  await expect(pestana(page, 'Cobros')).toHaveAttribute('aria-selected', 'true');
  await abrir(page, 'Valor');
  await expect(page.locator('#grafEvo svg:not(.hg)')).toBeVisible();
});

test('los periodos que no tienen sentido se apagan y el elegido no se pierde', async ({ page }) => {
  await hoy(page);
  await tocar(page, '.hero-rangos [data-rango="1D"]');
  await abrir(page, 'Rendimiento');
  await expect(page.locator('.hero-rangos [data-rango="1D"]')).toBeDisabled();
  // en 1D no hay rendimiento: se enseña el año
  await expect(page.locator('.hero-rangos [data-rango="1A"]')).toHaveAttribute('aria-pressed', 'true');
  await abrir(page, 'Cobros');
  for (const r of ['1D', '1S', '1M', '3M']) await expect(page.locator(`.hero-rangos [data-rango="${r}"]`)).toBeDisabled();
  await expect(page.locator('.hero-rangos [data-rango="6M"]')).toBeEnabled();
  await abrir(page, 'Caída');
  await expect(page.locator('.hero-rangos [data-rango="1S"]')).toBeDisabled();
  await expect(page.locator('.hero-rangos [data-rango="1M"]')).toBeEnabled();
  await abrir(page, 'Valor');
  await expect(page.locator('.hero-rangos [data-rango="1D"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Rendimiento: el marcador cuadra con la gráfica y con el índice', async ({ page }) => {
  await hoy(page);
  await abrir(page, 'Rendimiento');
  const marc = page.locator('#hoyMarc');
  await expect(marc.locator('.hm-tu b')).toContainText('%', { timeout: 20_000 });
  // lo mismo que sale de la serie: lo que tienes hoy con los precios de cada día, sin aportaciones
  const cuenta = await page.evaluate(() => {
    const s = serieCartera(S.M, diasRango('1A')), b = serieComparada(s, S.bench);
    const p = (s[s.length - 1].v / s[0].v - 1) * 100, q = (b[b.length - 1].v / s[0].v - 1) * 100;
    return { tu: pctS(p, 2), ref: pctS(q, 2), dif: Math.round((p - q) * 10) / 10, nombre: nombreBench(benchDe(S.bench)) };
  });
  await expect(marc.locator('.hm-tu b')).toHaveText(cuenta.tu);
  await expect(marc.locator('.hm-ref b')).toHaveText(cuenta.ref);
  await expect(marc.locator('.hm-ref span')).toContainText(cuenta.nombre);
  await expect(marc.locator('.hm-dif')).toContainText(cuenta.dif >= 0 ? 'le ganas al índice' : 'te gana el índice');
  await expect(marc).toContainText('sin contar lo que has aportado');
  // el dato al final de cada línea
  await expect(page.locator('#grafEvo .hg-fin.tu .v')).toHaveText(cuenta.tu);
  await expect(page.locator('#grafEvo .hg-fin.ref .v')).toHaveText(cuenta.ref);
  // sin comparar, solo el tuyo
  await tocar(page, '[data-accion="comparar-rend"]');
  await expect(marc.locator('.hm-ref')).toHaveCount(0);
  await expect(page.locator('#grafEvo .hg-fin.ref')).toHaveCount(0);
  await tocar(page, '[data-accion="comparar-rend"]');
  await expect(marc.locator('.hm-ref')).toHaveCount(1);
  // al pasar el ratón o el dedo, la fecha y los dos datos
  const box = await page.locator('#grafEvo svg').boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await expect(page.locator('#grafEvo .gh-fecha')).toContainText(' · tú ');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
});

test('Caída y Cobros dicen la peor caída y lo cobrado, ya con la retención', async ({ page }) => {
  await hoy(page);
  await abrir(page, 'Caída');
  const cab = page.locator('#evoCab');
  await expect(cab).toContainText(/En máximos|desde tu máximo/, { timeout: 20_000 });
  await expect(cab).toContainText(/la peor del último año|sin caídas que contar/);
  await abrir(page, 'Cobros');
  await expect(cab).toContainText('cobrados en el último año, ya con la retención');
  await expect(cab).toContainText('al mes');
  await expect(page.locator('#grafEvo .hg-barra').first()).toBeVisible();
});

test('lo del día: qué ha pasado, el último día de bolsa y lo que más mueve hoy, con su motivo', async ({ page }) => {
  await hoy(page);
  const dia = page.locator('.hoy-dia');
  await expect(dia).toBeVisible();
  await expect(dia.locator('.hd-tit')).toContainText(/^Hoy, /);
  // con la bolsa cerrada no hay nada «de hoy»: dos precios en directo, para no depender de la hora
  const mueven = await page.evaluate(() => {
    const fs = S.M.filas.filter((x) => x.precio > 0 && x.uds > 0).slice(0, 2);
    for (const f of fs) S.live[f.inst.id] = { precio: f.precio * 1.03, var: 3, t: Date.now(), fuente: 'en directo' };
    pintar(); return S.M.filas.filter((f) => Math.abs(f.dia) >= 1).length;
  });
  expect(mueven).toBeGreaterThan(0);
  await expect(dia.locator('.hd-frase')).toContainText(/^Subes [\d.]+\s€/);
  await expect(dia.locator('.hd-mv li')).toHaveCount(Math.min(5, mueven));
  await expect(dia.locator('.hd-mv li small').first()).not.toBeEmpty();
  // la cifra de la frase es la de «Hoy»
  const hoyE = await page.evaluate(() => eur(Math.abs(S.M.dia), 0));
  await expect(dia.locator('.hd-frase b')).toHaveText(hoyE);
  // tocar una abre su ficha
  await tocar(page, '.hoy-dia .hd-mv button');
  await expect(page.locator('.hoja, .ficha').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
});
