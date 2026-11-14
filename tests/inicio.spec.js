// 0.7 · Inicio: lo que más ha movido hoy, con el logo de cada cosa; en el ordenador, el mapa de la cartera más bajo y
// con «Lo último, según GrowIA» al lado, y sin el hueco negro bajo «GrowIA y lo que toca».
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

async function inicio(page, bloques) {
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  if (bloques) await page.evaluate((b) => { S.cartera.inicio = { bloques: b }; location.hash = 'cartera'; pintar(); }, bloques);
  await quitarCapas(page);
}

test('lo que más ha movido hoy lleva el logo de cada cosa', async ({ page, errores, viewport }) => {
  await inicio(page);
  // con la bolsa cerrada no hay nada «de hoy» (0.8.6c): dos precios en directo, para que la prueba no dependa de la hora
  await page.evaluate(() => { for (const f of S.M.filas.filter((x) => x.precio > 0).slice(0, 2)) S.live[f.inst.id] = { precio: f.precio * 1.02, var: 2, t: Date.now(), fuente: 'en directo' }; pintar(); });
  const chips = page.locator('.hero-movers .mv-c');
  await expect(chips.first()).toBeVisible();
  const n = await chips.count();
  await expect(page.locator('.hero-movers .mv-c .mv-logo')).toHaveCount(n);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
});

test('en el ordenador, el mapa va más bajo y con el informe al lado', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'pc', 'en el ordenador');
  // quien tenía el mapa solo en su fila: una vez, «Lo último, según GrowIA» se pone a su lado
  await inicio(page, ['patrimonio', 'mapa', 'posiciones', 'ia', 'reparto', 'agenda']);
  expect(await page.evaluate(() => bloquesCartera())).toEqual(['patrimonio', 'mapa', 'informe', 'posiciones', 'ia', 'reparto', 'agenda', 'plan']);
  const fila = page.locator('.car-fila.par-der', { has: page.locator('.mc-caja') });
  await expect(fila.locator('.informe')).toBeVisible();
  // y en él, lo que más se ha movido hoy de lo tuyo y por qué (del informe de la prensa). Desde la 0.8.6c «hoy es hoy»:
  // de madrugada y en fin de semana no hay nada con precio de hoy y el bloque no sale (14 nov: la prueba fallaba fuera
  // del horario de bolsa). Aquí no se mira el reloj: se quita lo de hoy y se pone a mano.
  const con = await page.evaluate(() => {
    const P = (informeVisible() || {}).posiciones || {};
    for (const p of Object.values(S.precios.instrumentos)) if (p.fecha >= hoyIso()) p.fecha = sumarDias(hoyIso(), -1);
    S.live = {}; pintar();
    return S.M.filas.filter((f) => P[f.inst.id] && P[f.inst.id].novedades && f.precio > 0).map((f) => [f.inst.id, f.precio]).slice(0, 2);
  });
  expect(con.length, 'el informe de los datos de prueba habla de alguna posición').toBeGreaterThan(0);
  // sin nada de hoy (la bolsa cerrada): sin el bloque, y el informe sigue en su sitio
  await expect(fila.locator('.informe')).toBeVisible();
  await expect(fila.locator('.ini-hoy')).toHaveCount(0);
  // con precio de hoy (en directo): sale, con su porcentaje de hoy
  await page.evaluate((con) => { for (const [id, precio] of con) S.live[id] = { precio: precio * 1.02, var: 2, t: Date.now(), fuente: 'en directo' }; pintar(); }, con);
  await expect(fila.locator('.ini-hoy li')).toHaveCount(con.length);
  await expect(fila.locator('.ini-hoy li .ini-hoy-v').first()).toContainText('%');
  const alto = await page.locator('.mc-caja').evaluate((el) => el.getBoundingClientRect().height);
  expect(alto).toBeLessThanOrEqual(440);
  expect(alto).toBeGreaterThanOrEqual(300);
  // si lo quitas, no vuelve
  await page.evaluate(() => { S.cartera.inicio.bloques = S.cartera.inicio.bloques.filter((k) => k !== 'informe'); });
  expect(await page.evaluate(() => bloquesCartera().includes('informe'))).toBe(false);
});

test('en el ordenador, sin hueco bajo GrowIA: lo que viene pasa debajo si la columna de al lado es más larga', async ({ page, errores }, info) => {
  // 0.8: con Toisón, Hoy no lleva posiciones ni reparto (están en Cartera) y el ordenador se rehará más completo (idea de Carlos, 3 nov)
  test.skip(true, 'el Inicio de GrowFolio en el ordenador ya no existe');
  await inicio(page, ['patrimonio', 'posiciones', 'ia', 'reparto', 'agenda']);
  await page.waitForTimeout(500);
  const fila = page.locator('.car-fila.par-der', { has: page.locator('.iac, .toca') }).first();
  const [a, b] = await fila.evaluate((f) => [...f.children].map((c) => c.getBoundingClientRect().height));
  // «Lo que viene» pasa debajo de GrowIA y las dos columnas quedan parejas (antes, la de la derecha le sacaba unos 500 px)
  await expect(fila.locator('.car-col').first().getByRole('heading', { name: 'Lo que viene' })).toHaveCount(1);
  expect(Math.abs(a - b)).toBeLessThan(300);
});
