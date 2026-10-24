// 0.6d · La cartera de prueba (Ajustes): GrowFolio se vuelve a abrir sin abrir tu cartera y con una inventada; nada de
// lo que se hace se guarda (ni la cartera ni lo del dispositivo); GrowIA, con tu clave; Ajustes, solo para salir; y al
// salir pide la contraseña (o el PIN) antes de enseñar la tuya.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

// lo que hay guardado en el dispositivo y en la cuenta (Firestore de imitación), menos lo que cambia solo (cachés)
const guardado = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => !/^inv-cache-|^inv-ultimo|^inv-version|^inv-dia|^inv-entrada|^inv-demo/.test(k)).sort().map((k) => [k, localStorage.getItem(k)])));
const CLAVE = 'AQ.prueba-de-la-cartera-de-prueba-1234567890';

test('la cartera de prueba: aparte de la tuya, sin guardar nada y con contraseña para volver', async ({ page, errores, viewport }) => {
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  // con GrowIA activada (su clave, cifrada con la de la cartera)
  await page.evaluate(async (c) => { await cargarAsesor(); AS.clave = c; LS.set(LS_CLAVE.google, await cifrarLocal(c)); }, CLAVE);
  await page.waitForTimeout(1500);
  const tuyas = await page.evaluate(() => S.cartera.posiciones.map((p) => p.instrumento).sort());
  expect(tuyas).toContain('repsol');

  // desde Ajustes: se vuelve a abrir GrowFolio, en la prueba
  await page.evaluate(() => abrirAjustes());
  await page.locator('#aDemo').click();
  // sin PIN: antes de entrar, que sabes la contraseña (al salir se pedirá). Mal, no entra; bien, sí
  await expect(page.locator('#pAct')).toBeVisible({ timeout: 10_000 });
  await page.fill('#pAct', 'otra-cosa');
  await page.locator('#fPAct button[type=submit]').click();
  await expect(page.locator('#pAct')).toHaveCount(0);
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => !!S.demo)).toBe(false);
  await page.evaluate(() => { entrarDemo(); });
  await expect(page.locator('#pAct')).toBeVisible({ timeout: 10_000 });
  await page.fill('#pAct', 'cartera-123');
  await page.locator('#fPAct button[type=submit]').click();
  await expect(page.locator('#demoBanda')).toBeVisible({ timeout: 30_000 });
  // de lo tuyo del dispositivo, nada que diga quién eres: ni tu nombre (tampoco en la pantalla de entrada) ni tu PIN
  expect(await page.evaluate(() => [LS.get('inv-nombre'), LS.get('inv-bloqueo'), LS.get('inv-asesor-conv'), memoriaIdeas()])).toEqual([null, null, null, {}]);
  await expect(page.locator('body')).not.toContainText('Lucía');
  const antes = await guardado(page);
  const demo = await page.evaluate(() => ({ demo: S.demo, key: S.key, enc: S.enc, marca: S.cartera.demo, pos: S.cartera.posiciones.map((p) => p.instrumento), total: (S.M || calcular()).total, nombre: nombreUsuario(), clave: AS.clave }));
  // tu cartera ni se ha abierto: sin su clave ni su texto cifrado en memoria
  expect([demo.demo, demo.key, demo.enc, demo.marca]).toEqual([true, null, null, true]);
  expect(demo.pos.length).toBeGreaterThanOrEqual(5);
  expect(demo.pos).not.toContain('repsol');
  expect(demo.total).toBeGreaterThan(15000);
  expect(demo.total).toBeLessThan(25000);
  expect(demo.nombre).toBe('Marta');
  expect(demo.clave).toBe(CLAVE);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);

  // lo que se haga no se guarda: ni la cartera ni lo del dispositivo (ocultar cifras, la conversación de GrowIA…)
  await page.evaluate(async () => {
    S.cartera.posiciones[0].cantidad += 1;
    await guardarCartera('prueba'); await guardarCarteraCallada('prueba'); await guardarLocal(true);
    LS.set('inv-oculto', true); LS.del('inv-asesor-conv'); LS.set('inv-nombre', 'Otra');
  });
  expect(await page.evaluate(() => LS.get('inv-oculto'))).toBe(true);
  expect(await page.evaluate(() => cifrar(S.cartera).then(() => 'cifrada', (e) => e.message))).toContain('no se guarda');
  expect(await guardado(page)).toEqual(antes);

  // Ajustes, solo para salir (nada de tu cuenta, tu PIN, tu código ni tu copia)
  await page.evaluate(() => abrirAjustes());
  await expect(page.locator('#aDemoSalir')).toBeVisible();
  await expect(page.locator('#aCuenta, #aKit, #aCopia, #aDemo')).toHaveCount(0);
  await page.keyboard.press('Escape');
  // al cerrar la hoja se vuelve atrás en el historial: se espera a que termine antes de recargar
  await expect(page.locator('#aDemoSalir')).toHaveCount(0);
  await page.waitForTimeout(600);

  // recargar no saca de la prueba
  await page.reload();
  await expect(page.locator('#demoBanda')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => S.key)).toBe(null);

  // salir: sin PIN, la contraseña de la cartera antes de enseñar nada; y vuelve la tuya, tal cual
  await page.locator('#demoBanda button').click();
  await expect(page.locator('#pass')).toBeVisible({ timeout: 30_000 });
  await page.fill('#pass', 'cartera-123');
  await page.click('#bEntrar');
  await expect(page.locator('.hero-num')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => ({ demo: !!S.demo, pos: S.cartera.posiciones.map((p) => p.instrumento).sort(), salida: LS.get('inv-demo-salida', false), oculto: LS.get('inv-oculto', false), demoG: localStorage.getItem('inv-demo-g') }))).toEqual({ demo: false, pos: tuyas, salida: false, oculto: false, demoG: null });
  await expect(page.locator('#demoBanda')).toHaveCount(0);
});

test('con PIN, al salir de la cartera de prueba se pide el PIN aunque se hubiera desbloqueado hace poco', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'en el móvil');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  // un PIN puesto y recién desbloqueado (sin la prueba, no lo volvería a pedir en 72 horas)
  await page.evaluate(async () => { const salt = crypto.getRandomValues(new Uint8Array(16)); guardarBloqueo({ pin: await hashPin('2468', salt), salt: b64.enc(salt), fallos: 0 }); marcarDesbloqueo(); });
  await page.evaluate(() => entrarDemo());
  await expect(page.locator('#demoBanda')).toBeVisible({ timeout: 30_000 });
  // dentro de la prueba no salta el bloqueo (no hay nada tuyo que bloquear: desde ahí se llegaría a lo tuyo)
  await page.evaluate(() => { localStorage.removeItem(LS.k('inv-bloqueo-t')); document.dispatchEvent(new Event('visibilitychange')); pantallaBloqueo(() => {}, () => {}); });
  await page.waitForTimeout(500);
  await expect(page.locator('.bq-caja')).toHaveCount(0);
  await page.locator('#demoBanda button').click();
  await expect(page.locator('.bq-caja')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.hero-num')).toHaveCount(0);
});

test('si se abre la prueba en una pestaña, las demás con tu cartera la cierran y piden la contraseña', async ({ page, context, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'en el móvil');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const otra = await context.newPage();
  await otra.goto(page.url());
  await expect(otra.locator('.hero-num')).toBeVisible({ timeout: 30_000 });
  // en la otra, sin PIN: la contraseña antes de entrar en la prueba
  await otra.evaluate(() => { entrarDemo(); });
  await expect(otra.locator('#pAct')).toBeVisible({ timeout: 10_000 });
  await otra.fill('#pAct', 'cartera-123');
  await otra.locator('#fPAct button[type=submit]').click();
  await expect(otra.locator('#demoBanda')).toBeVisible({ timeout: 30_000 });
  // y esta, que tenía tu cartera abierta, se ha cerrado
  await expect(page.locator('#pass')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.hero-num')).toHaveCount(0);
  await otra.close();
});
