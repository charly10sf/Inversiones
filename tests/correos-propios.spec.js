// 0.8.3 · Los correos propios: la app pide al Worker (/correo) el de confirmación, el de contraseña nueva y la bienvenida,
// y si el Worker no puede (sin configurar, caído, sin red) manda el de Firebase de siempre. «espera» no cae a Firebase.
import { test, expect } from '@playwright/test';
import { preparar, BASE, quitarCapas } from './ayuda.js';

const W = 'https://growfolio.growfolio-web-app.workers.dev/correo';
const CORREO = 'lucia@prueba.com';
const confirmacionesFb = (page) => page.evaluate(() => window.__correosConfirmacion || 0);
const clavesFb = (page) => page.evaluate(() => window.__correosClave || []);

// el Worker de imitación: apunta lo que le llega y contesta lo que diga `respuesta(tipo)`
async function workerDeMentira(page, respuesta) {
  const vistos = [];
  await page.route(W, (r) => {
    const c = JSON.parse(r.request().postData() || '{}');
    vistos.push({ ...c, auth: r.request().headers().authorization || '' });
    const [status, cuerpo] = respuesta(c.tipo);
    return r.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(cuerpo) });
  });
  return vistos;
}
async function irACuenta(page, modo) {
  await page.goto(BASE + '#cuenta');
  await page.waitForSelector('.intro, #fCorreo', { timeout: 30000 });
  if (await page.$('.intro')) await page.click('.intro-saltar');
  await page.waitForSelector('#fCorreo', { timeout: 15000 });
  if (await page.$(`.cuenta-modo [data-m="${modo}"][aria-pressed="false"]`)) await page.click(`.cuenta-modo [data-m="${modo}"]`);
}
async function crearSinConfirmar(page) {
  await irACuenta(page, 'crear');
  if (await page.$('#cNombre')) await page.fill('#cNombre', 'Lucía');
  await page.fill('#cEmail', CORREO);
  await page.fill('#cPass', 'secreta1');
  await page.click('#bCorreo');
  await page.waitForSelector('#fBien', { timeout: 20000 });
}

test('al crear la cuenta, el correo de confirmación sale del Worker (con sesión, idioma y la dirección de la app)', async ({ page, context }) => {
  const errores = await preparar(context);
  const vistos = await workerDeMentira(page, () => [200, { ok: true }]);
  await crearSinConfirmar(page);
  expect(vistos.length).toBe(1);
  expect(vistos[0].tipo).toBe('confirmar');
  expect(vistos[0].lang).toBe('es');
  expect(vistos[0].base).toBe(BASE);
  expect(vistos[0].auth).toMatch(/^Bearer .+/);
  expect(await confirmacionesFb(page)).toBe(0);
  await expect(page.locator('#fBien .aviso-confirmar')).toContainText(CORREO);
  expect(errores).toEqual([]);
});

test('si el Worker no puede (sin configurar o caído), sale el de Firebase', async ({ page, context }) => {
  await preparar(context);
  const vistos = await workerDeMentira(page, () => [503, { ok: false, motivo: 'sin-config' }]);
  await crearSinConfirmar(page);
  expect(vistos.length).toBe(1);
  expect(await confirmacionesFb(page)).toBe(1);
});

test('sin red con el Worker (cortado), también sale el de Firebase', async ({ page, context }) => {
  await preparar(context);
  await crearSinConfirmar(page);
  expect(await confirmacionesFb(page)).toBe(1);
});

test('contraseña olvidada: del Worker; con «espera» no cae a Firebase; si el Worker falla, Firebase', async ({ page, context }) => {
  const errores = await preparar(context);
  let modo = 'ok';
  const vistos = await workerDeMentira(page, () => (modo === 'ok' ? [200, { ok: true }] : modo === 'espera' ? [429, { ok: false, motivo: 'espera', espera: 900 }] : [502, { ok: false, motivo: 'fallo' }]));
  await irACuenta(page, 'entrar');
  await page.fill('#cEmail', CORREO);
  await page.click('#bOlvido');
  await expect(page.locator('#toast')).toContainText('mira en spam');
  expect(vistos[0]).toMatchObject({ tipo: 'clave', correo: CORREO, lang: 'es', auth: '' });
  expect(await clavesFb(page)).toEqual([]);
  modo = 'espera';
  await page.click('#bOlvido');
  await expect(page.locator('#fCorreo')).toContainText('Demasiados intentos');
  expect(await clavesFb(page)).toEqual([]);
  modo = 'fallo';
  await page.click('#bOlvido');
  await expect.poll(() => clavesFb(page)).toEqual([CORREO]);
  expect(vistos.length).toBe(3);
  expect(errores).toEqual([]);
});

test('al notar que el correo ya está confirmado, pide la bienvenida una vez', async ({ page, context }) => {
  const errores = await preparar(context);
  const vistos = await workerDeMentira(page, () => [200, { ok: true }]);
  await crearSinConfirmar(page);
  await page.click('#bSeguir');
  await page.waitForSelector('#fCrear', { timeout: 15000 });
  await page.fill('#p1', 'cartera-123');
  await page.fill('#p2', 'cartera-123');
  await page.click('#bCrear');
  await page.waitForSelector('.hero-num', { timeout: 30000 });
  await quitarCapas(page);
  await page.evaluate((c) => { window.__stubConfirmar(c); VERIF_MIRADO = 0; document.dispatchEvent(new Event('visibilitychange')); }, CORREO);
  await expect(page.locator('#toast')).toContainText('Correo confirmado');
  await expect.poll(() => vistos.filter((v) => v.tipo === 'bienvenida').length).toBe(1);
  // con el token ya confirmado
  const b = vistos.find((v) => v.tipo === 'bienvenida');
  expect(b.auth).toMatch(/^Bearer .+/);
  // y no se vuelve a pedir en esta cuenta
  expect(await page.evaluate(() => LS.get(LS_BIENVENIDA, []).includes(FB.user.uid))).toBe(true);
  expect(errores).toEqual([]);
});

test('cuenta.html: «Mandarme un correo para cambiar la contraseña» va por el Worker y, si falla, por Firebase', async ({ page, context }) => {
  await preparar(context, { ajustes: { 'stub-oob': { rc: { mode: 'recoverEmail', email: CORREO, previo: 'otro@prueba.com' }, rc2: { mode: 'recoverEmail', email: CORREO, previo: 'otro@prueba.com' } } } });
  let falla = false;
  const vistos = await workerDeMentira(page, () => (falla ? [503, { ok: false, motivo: 'cupo' }] : [200, { ok: true }]));
  await page.goto(BASE + 'cuenta.html?mode=recoverEmail&oobCode=rc&lang=es');
  await page.click('#bClave');
  await expect(page.locator('#bClave')).toContainText('Te lo he mandado');
  expect(vistos[0]).toMatchObject({ tipo: 'clave', correo: CORREO, lang: 'es' });
  expect(await clavesFb(page)).toEqual([]);
  falla = true;
  await page.goto(BASE + 'cuenta.html?mode=recoverEmail&oobCode=rc2&lang=es');
  await page.click('#bClave');
  await expect(page.locator('#bClave')).toContainText('Te lo he mandado');
  expect(await clavesFb(page)).toEqual([CORREO]);
});
