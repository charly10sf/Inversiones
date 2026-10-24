// 0.6d · La cartera de prueba (Ajustes): se ve una cartera inventada, nada se guarda (ni en el dispositivo ni en la
// cuenta) y al salir vuelve la tuya tal cual.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

// lo que hay guardado de la cartera: en el dispositivo y en la cuenta (Firestore de imitación)
const guardado = (page) => page.evaluate(() => {
  const cuenta = Object.keys(localStorage).filter((k) => k.startsWith('stub-fs:usuarios/')).map((k) => localStorage.getItem(k)).join('|');
  return { local: localStorage.getItem('inv-cuenta-enc'), cuenta, nombre: localStorage.getItem('inv-nombre') };
});

test('la cartera de prueba no guarda nada y al salir vuelve la tuya', async ({ page, errores, viewport }) => {
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  await page.waitForTimeout(1500);
  const antes = await guardado(page);
  const tuyas = await page.evaluate(() => S.cartera.posiciones.map((p) => p.instrumento).sort());
  expect(tuyas).toContain('repsol');

  // desde Ajustes
  await page.evaluate(() => abrirAjustes());
  await page.locator('#aDemo').click();
  await expect(page.locator('#demoBanda')).toBeVisible();
  const demo = await page.evaluate(() => ({ demo: S.cartera.demo, pos: S.cartera.posiciones.map((p) => p.instrumento), total: (S.M || calcular()).total, nombre: nombreUsuario(), conv: AS.conv.length, ia: S.iaPropio }));
  expect(demo.demo).toBe(true);
  expect(demo.pos.length).toBeGreaterThanOrEqual(5);
  expect(demo.pos).not.toContain('repsol');
  // unos 20.000 € (lo que dice la lista de la prueba, a precios de hoy)
  expect(demo.total).toBeGreaterThan(15000);
  expect(demo.total).toBeLessThan(25000);
  expect(demo.nombre).toBe('Marta');
  expect([demo.conv, demo.ia]).toEqual([0, null]);
  await expect(page.locator('.hero-movers, .car-patrimonio').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);

  // apuntar algo, guardar a mano, lo que hace la app sola: nada llega a lo guardado; cifrarla, imposible
  await page.evaluate(async () => {
    S.cartera.posiciones[0].cantidad += 1;
    await guardarCartera('prueba');
    await guardarCarteraCallada('prueba');
    await guardarLocal(true);
  });
  expect(await page.evaluate(() => cifrar(S.cartera).then(() => 'cifrada', (e) => e.message))).toContain('no se guarda');
  await page.waitForTimeout(800);
  expect(await guardado(page)).toEqual(antes);

  // salir: vuelve la tuya, tal cual
  await page.locator('#demoBanda button').click();
  await page.waitForLoadState('load');
  await expect(page.locator('.hero-num')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => ({ demo: !!S.demo || !!S.cartera.demo, pos: S.cartera.posiciones.map((p) => p.instrumento).sort() }))).toEqual({ demo: false, pos: tuyas });
  await expect(page.locator('#demoBanda')).toHaveCount(0);
});
