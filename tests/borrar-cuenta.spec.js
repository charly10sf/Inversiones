// 0.8.2 · Borrar la cuenta desde Ajustes (Google Play lo pide a toda app con cuentas): con la contraseña otra vez y
// «BORRAR», se van la copia cifrada, la ficha de la cuenta, las opiniones, la cuenta y lo de este dispositivo, y queda el
// aviso al dueño en bajas/{uid}. Sin la contraseña buena no se borra nada.
import { test, expect } from '@playwright/test';
import { preparar, crearCuenta } from './ayuda.js';

const fs = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('stub-fs:')).map((k) => k.slice(8)));

async function hastaBorrar(page) {
  await crearCuenta(page);
  // una opinión suya y la ficha de la cuenta, como las deja la app
  await page.evaluate(async () => {
    const f = FB.fs;
    await f.addDoc(f.collection(FB.db, 'opiniones'), { uid: FB.user.uid, texto: 'Me gusta', cuando: f.serverTimestamp() });
    await f.setDoc(f.doc(FB.db, 'cuentas', FB.user.uid), { correo: FB.user.email, alta: '' });
    await f.setDoc(f.doc(FB.db, 'usuarios', FB.user.uid), { enc: 'x', rev: 1 }, { merge: true });
  });
  await page.evaluate(() => abrirAjustes());
  await page.click('#aBorrarCuenta');
  await page.waitForSelector('#fBorrar');
}

test('borrar la cuenta se lo lleva todo y deja el aviso al dueño', async ({ page, context }) => {
  await preparar(context);
  await hastaBorrar(page);
  const uid = await page.evaluate(() => FB.user.uid);
  expect((await fs(page)).some((r) => r.startsWith('opiniones/'))).toBe(true);
  // sin escribir BORRAR, nada
  await page.fill('#fBorrar [name=p]', 'secreta1');
  await page.click('#bcBorrar');
  await expect(page.locator('#bcErr')).toContainText('BORRAR');
  // con la contraseña mal, tampoco
  await page.fill('#fBorrar [name=c]', 'borrar');
  await page.fill('#fBorrar [name=p]', 'otra');
  await page.click('#bcBorrar');
  await expect(page.locator('#bcErr')).toContainText('no son correctos');
  expect(await page.evaluate(() => window.__cuentasBorradas || 0)).toBe(0);
  expect((await fs(page)).includes('usuarios/' + uid)).toBe(true);
  // con todo bien, se borra
  await page.fill('#fBorrar [name=p]', 'secreta1');
  await page.click('#bcBorrar');
  await page.waitForSelector('#bcFin', { timeout: 20000 });
  const quedan = await fs(page);
  expect(quedan.filter((r) => r.startsWith('opiniones/') || r === 'cuentas/' + uid || r === 'usuarios/' + uid)).toEqual([]);
  expect(quedan).toContain('bajas/' + uid);
  expect(await page.evaluate(() => window.__cuentasBorradas)).toBe(1);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('inv-')))).toEqual([]);
  // y la cuenta ya no existe: con esa contraseña no se entra
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('stub-auth-cuentas') || '{}')['lucia@prueba.com'] || null)).toBeNull();
  await page.click('#bcFin');
  await page.waitForSelector('#fCorreo, .intro', { timeout: 20000 });
  expect(context.__errores).toEqual([]);
});

test('la hoja de borrar la cuenta, en inglés', async ({ page, context }) => {
  await preparar(context, { idioma: 'en' });
  await hastaBorrar(page);
  await expect(page.locator('.hoja h2')).toHaveText('Delete account');
  await expect(page.locator('#fBorrar')).toContainText('within 30 days');
  // en inglés vale DELETE
  await page.fill('#fBorrar [name=c]', 'delete');
  await page.fill('#fBorrar [name=p]', 'secreta1');
  await page.click('#bcBorrar');
  await page.waitForSelector('#bcFin', { timeout: 20000 });
  await expect(page.locator('.caja-cuenta h1')).toHaveText('Account deleted');
});
