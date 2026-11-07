// 0.8.3 · cuenta.html, la página propia de los enlaces de los correos de la cuenta (en lugar de la de Firebase): confirmar
// el correo, poner una contraseña nueva y deshacer un cambio de correo, con errores claros, en español e inglés, con el
// diseño elegido y el botón para volver a Toisón (en Android, la app). Firebase de imitación (tests/stub).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar, BASE } from './ayuda.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORREO = 'ana@prueba.com';
const cuentas = { [CORREO]: { pass: 'vieja123', u: { uid: 'e-ana', email: CORREO, proveedor: 'password', emailVerified: false } } };
const abrir = (page, q) => page.goto(BASE + 'cuenta.html' + q);
const leerLS = (page, k) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);

test('la configuración de Firebase es la misma que la de la app', () => {
  const app = readFileSync(join(RAIZ, 'src/js/02-cuentas.js'), 'utf8'), pag = readFileSync(join(RAIZ, 'cuenta.html'), 'utf8');
  expect(pag).toContain(app.match(/const FB_CFG = \{[^\n]+\};/)[0]);
  expect(pag).toContain(app.match(/const FB_VER = '[^']+';/)[0]);
  // y el logo, el de la app
  const ajustes = readFileSync(join(RAIZ, 'src/js/49-avisos-y-ajustes.js'), 'utf8');
  for (const k of ['TS_O_D', 'TS_T_D']) expect(pag).toContain(ajustes.match(new RegExp(`const ${k} = '([^']+)'`))[1]);
});

test('confirmar el correo: lo confirma, quita el código de la dirección y lleva a Toisón', async ({ page, context }) => {
  const errores = await preparar(context, { ajustes: { 'stub-auth-cuentas': cuentas, 'stub-oob': { abc: { mode: 'verifyEmail', email: CORREO } } } });
  await abrir(page, '?mode=verifyEmail&oobCode=abc&apiKey=x&lang=es');
  await expect(page.locator('h1')).toHaveText('Correo confirmado');
  expect((await leerLS(page, 'stub-auth-cuentas'))[CORREO].u.emailVerified).toBe(true);
  expect(page.url()).not.toContain('oobCode');
  expect(await page.getAttribute('#bAbrir', 'href')).toBe(BASE);
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'marmol');
  // otra vez el mismo enlace: ya no vale, y dice cómo pedir otro
  await abrir(page, '?mode=verifyEmail&oobCode=abc&lang=es');
  await expect(page.locator('h1')).toHaveText('Este enlace ya no vale');
  await expect(page.locator('main')).toContainText('Confirma tu correo');
  expect(errores).toEqual([]);
});

test('caducado, sin código y en inglés', async ({ page, context }) => {
  await preparar(context, { ajustes: { 'inv-tema': '"marfil"', 'stub-oob': { viejo: { mode: 'resetPassword', email: CORREO, caducado: true }, ok: { mode: 'verifyEmail', email: CORREO } } } });
  await abrir(page, '?mode=resetPassword&oobCode=viejo&lang=es');
  await expect(page.locator('h1')).toHaveText('Este enlace ya no vale');
  await expect(page.locator('main')).toContainText('¿Has olvidado la contraseña?');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'marfil');
  await abrir(page, '?mode=verifyEmail');
  await expect(page.locator('h1')).toHaveText('Enlace incompleto');
  await abrir(page, '?mode=verifyEmail&oobCode=ok&lang=en');
  await expect(page.locator('h1')).toHaveText('Email confirmed');
  await expect(page.locator('#bAbrir')).toHaveText('Open Toisón');
});

test('contraseña nueva: comprueba las dos, la guarda y recuerda que la de la cartera no cambia', async ({ page, context }) => {
  const errores = await preparar(context, { ajustes: { 'stub-auth-cuentas': cuentas, 'stub-oob': { r1: { mode: 'resetPassword', email: CORREO } } } });
  await abrir(page, '?mode=resetPassword&oobCode=r1&lang=es');
  await expect(page.locator('h1')).toHaveText('Contraseña nueva');
  await expect(page.locator('main')).toContainText(CORREO);
  await expect(page.locator('main')).toContainText('La contraseña de tu cartera no cambia');
  await page.fill('#c1', 'abc'); await page.fill('#c2', 'abc'); await page.click('#bGuardar');
  await expect(page.locator('#err')).toContainText('al menos 6');
  await page.fill('#c1', 'nueva1234'); await page.fill('#c2', 'nueva12345'); await page.click('#bGuardar');
  await expect(page.locator('#err')).toContainText('no son iguales');
  expect((await leerLS(page, 'stub-auth-cuentas'))[CORREO].pass).toBe('vieja123');
  await page.fill('#c2', 'nueva1234'); await page.click('#bGuardar');
  await expect(page.locator('h1')).toHaveText('Contraseña cambiada');
  expect((await leerLS(page, 'stub-auth-cuentas'))[CORREO].pass).toBe('nueva1234');
  expect(page.url()).not.toContain('oobCode');
  expect(errores).toEqual([]);
});

test('deshacer un cambio de correo y pedir otra contraseña', async ({ page, context }) => {
  await preparar(context, { ajustes: { 'stub-oob': { rc: { mode: 'recoverEmail', email: CORREO, previo: 'otro@prueba.com' } } } });
  await abrir(page, '?mode=recoverEmail&oobCode=rc&lang=es');
  await expect(page.locator('h1')).toHaveText('Correo recuperado');
  await expect(page.locator('main')).toContainText(CORREO);
  await page.click('#bClave');
  await expect(page.locator('#bClave')).toContainText('Te lo he mandado');
  expect(await page.evaluate(() => window.__correosClave)).toEqual([CORREO]);
});

test('en el navegador de Android, «Abrir Toisón» abre la app y si no la hay, la web', async ({ page, context }) => {
  await preparar(context, { ajustes: { 'stub-oob': { a: { mode: 'verifyEmail', email: CORREO } } } });
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Linux; Android 15; Pixel 8) Chrome/130 Mobile' }));
  await abrir(page, '?mode=verifyEmail&oobCode=a');
  await expect(page.locator('h1')).toHaveText('Correo confirmado');
  const href = await page.getAttribute('#bAbrir', 'href');
  expect(href).toMatch(/^intent:\/\/token#Intent;scheme=inversiones;S\.browser_fallback_url=/);
  expect(decodeURIComponent(href.split('browser_fallback_url=')[1].split(';')[0])).toBe(BASE);
  await expect(page.locator('main a.btn:not(.pri)')).toHaveText('Seguir en la web');
});
