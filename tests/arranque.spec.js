// 0.8.3 · Cuánto tarda en abrir (62-arranque.js): al entrar sola con la clave recordada, una línea en el registro de la IA
// con cada paso (JS, Firebase, cuenta, clave, Inicio…) y lo más lento de la red, y las últimas 10 en inv-arranques. Sin
// nada de la cartera. Si escribes la contraseña, no se apunta (lo que tardas tú no es del arranque).
import { test, expect } from '@playwright/test';
import { preparar, crearCuenta, quitarCapas } from './ayuda.js';

const arranques = (page) => page.evaluate(() => (LS.get('inv-arranques', []) || []).map((x) => x.x));
const diario = (page) => page.evaluate(() => (LS.get('inv-ia-diario', []) || []).map((x) => x.x));

test('al entrar sola, la línea del arranque va al registro; con la contraseña escrita, no', async ({ page, context }) => {
  const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
  await crearCuenta(page);
  await quitarCapas(page);
  // al crearla se escribe la contraseña: nada
  expect(await arranques(page)).toEqual([]);

  await page.reload();
  await expect(page.locator('.hero-num')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => arranques(page).then((a) => a.length)).toBe(1);
  const [linea] = await arranques(page);
  expect(linea).toMatch(/^Arranque \d+,\d s/);
  for (const paso of ['JS ', 'Firebase ', 'cuenta ', 'clave ', 'Inicio ']) expect(linea).toContain(paso);
  // nada de la cartera: ni el correo ni importes
  expect(linea).not.toContain('@');
  expect(linea).not.toMatch(/€/);
  // en el registro, partida en trozos de menos de 200 letras
  const reg = (await diario(page)).filter((x) => x.startsWith('Arranque') || x.startsWith('… '));
  expect(reg.length).toBeGreaterThan(0);
  for (const x of reg) expect(x.length).toBeLessThanOrEqual(200);

  // sin la clave recordada pide la contraseña: al escribirla, no se apunta otra
  await page.evaluate(async () => { await IDB.del(IDB_CLAVE); guardarBloqueo(null); LS.del('inv-bloqueo-t'); });
  await page.reload();
  await page.waitForSelector('#pass', { timeout: 30_000 });
  await page.fill('#pass', 'cartera-123');
  await page.locator('#pass').press('Enter');
  await expect(page.locator('.hero-num')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  expect((await arranques(page)).length).toBe(1);
  expect(errores).toEqual([]);
});
