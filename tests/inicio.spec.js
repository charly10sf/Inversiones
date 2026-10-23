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
  const chips = page.locator('.hero-movers .mv-c');
  const n = await chips.count();
  test.skip(!n, 'hoy no se ha movido nada en los datos de prueba');
  await expect(page.locator('.hero-movers .mv-c .mv-logo')).toHaveCount(n);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
});

test('en el ordenador, el mapa va más bajo y con el informe al lado', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'pc', 'en el ordenador');
  // quien tenía el mapa solo en su fila: una vez, «Lo último, según GrowIA» se pone a su lado
  await inicio(page, ['patrimonio', 'mapa', 'posiciones', 'ia', 'reparto', 'agenda']);
  expect(await page.evaluate(() => bloquesCartera())).toEqual(['patrimonio', 'mapa', 'informe', 'posiciones', 'ia', 'reparto', 'agenda']);
  const fila = page.locator('.car-fila.par-der', { has: page.locator('.mc-caja') });
  await expect(fila.locator('.informe')).toBeVisible();
  // y en él, lo que más se ha movido hoy de lo tuyo y por qué (del informe de la prensa)
  expect(await fila.locator('.ini-hoy li').count()).toBeGreaterThan(0);
  const alto = await page.locator('.mc-caja').evaluate((el) => el.getBoundingClientRect().height);
  expect(alto).toBeLessThanOrEqual(440);
  expect(alto).toBeGreaterThanOrEqual(300);
  // si lo quitas, no vuelve
  await page.evaluate(() => { S.cartera.inicio.bloques = S.cartera.inicio.bloques.filter((k) => k !== 'informe'); });
  expect(await page.evaluate(() => bloquesCartera().includes('informe'))).toBe(false);
});

test('en el ordenador, sin hueco bajo GrowIA: lo que viene pasa debajo si la columna de al lado es más larga', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'pc', 'en el ordenador');
  await inicio(page, ['patrimonio', 'posiciones', 'ia', 'reparto', 'agenda']);
  await page.waitForTimeout(500);
  const fila = page.locator('.car-fila.par-der', { has: page.locator('.iac, .toca') }).first();
  const [a, b] = await fila.evaluate((f) => [...f.children].map((c) => c.getBoundingClientRect().height));
  // «Lo que viene» pasa debajo de GrowIA y las dos columnas quedan parejas (antes, la de la derecha le sacaba unos 500 px)
  await expect(fila.locator('.car-col').first().getByRole('heading', { name: 'Lo que viene' })).toHaveCount(1);
  expect(Math.abs(a - b)).toBeLessThan(300);
});
