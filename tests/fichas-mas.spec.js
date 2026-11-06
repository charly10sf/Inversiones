// 0.8.3: las fichas de la IA en dos archivos. fichas.json trae los temas y las empresas del núcleo (radar.json y las
// carteras); fichas-mas.json, las otras ~1.900 del radar, y solo se baja al abrir una de ellas. Aquí se parten las
// fichas de verdad (tests/.datos) como lo haría scripts/fichas.py.
import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const DATOS = join(dirname(fileURLToPath(import.meta.url)), '.datos', 'datos');
const leer = (f) => JSON.parse(readFileSync(join(DATOS, f), 'utf-8'));

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

test('fichas-mas.json se baja solo al abrir una empresa de fuera del núcleo', async ({ page, context }) => {
  const todas = leer('fichas.json');
  const nucleo = new Set(leer('radar.json').valores.map((x) => x.s));
  const e = todas.e || {};
  const principal = { ...todas, e: Object.fromEntries(Object.entries(e).filter(([s]) => nucleo.has(s))) };
  const resto = { v: 1, generado: todas.generado, e: Object.fromEntries(Object.entries(e).filter(([s]) => !nucleo.has(s))) };
  principal.mas = Object.keys(resto.e).length;
  // una de radar-mas.json con factores (solo está en el resto) y una del núcleo con factores
  const fuera = leer('radar-mas.json').valores.map((x) => x.s).find((s) => resto.e[s] && Object.keys(resto.e[s].fa || {}).length);
  const dentro = [...nucleo].find((s) => principal.e[s] && Object.keys(principal.e[s].fa || {}).length);
  expect(fuera && dentro).toBeTruthy();

  const pedidas = { fichas: 0, mas: 0 };
  const json = (body) => ({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
  await context.route('https://raw.githubusercontent.com/**/datos/fichas.json*', (r) => { pedidas.fichas++; r.fulfill(json(principal)); });
  await context.route('https://raw.githubusercontent.com/**/datos/fichas-mas.json*', (r) => { pedidas.mas++; r.fulfill(json(resto)); });

  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.waitForFunction(() => S.radar && S.radar.valores && S.radar.valores.length > 2000, null, { timeout: 45_000 });
  const ficha = (sim) => page.evaluate(async (sim) => {
    document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove());
    abrirConsulta(candidatoDeSim(sim));
    for (let i = 0; i < 60 && !document.querySelector('.hoja-fondo .ficha-ia'); i++) await new Promise((r) => setTimeout(r, 100));
    return !!document.querySelector('.hoja-fondo .ficha-ia');
  }, sim);

  // una del núcleo: su ficha sale sin bajar el resto
  expect(await ficha(dentro)).toBe(true);
  expect(pedidas.fichas).toBeGreaterThan(0);
  expect(pedidas.mas).toBe(0);
  // una de fuera: se baja el resto una vez y la ficha aparece en su sitio
  expect(await ficha(fuera)).toBe(true);
  expect(pedidas.mas).toBe(1);
  const r = await page.evaluate((s) => ({ ok: S.fichasMasOk, tiene: !!S.fichas.e[s], n: Object.keys(S.fichas.e).length }), fuera);
  expect(r.ok).toBe(true);
  expect(r.tiene).toBe(true);
  expect(r.n).toBe(Object.keys(e).length);
  // otra de fuera ya no vuelve a bajarlo
  const otra = Object.keys(resto.e).find((s) => s !== fuera && Object.keys(resto.e[s].fa || {}).length && leer('radar-mas.json').valores.some((x) => x.s === s));
  expect(await ficha(otra)).toBe(true);
  expect(pedidas.mas).toBe(1);
});
