// Toisón Dorado cuenta a cuenta (13 nov 2026): hasta que haya plan de pago, el dueño se lo pone a quien quiera en
// Ajustes › Modo de cada cuenta (dorado: true en modos/{correo}, como el modo). La cuenta lo lee al abrir y ve lo de
// Dorado con sus propios datos (Tu renta casilla a casilla, sin candados). Cambiar el modo no se lo quita.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, quitarCapas, meterCartera, hzConVentas } from './ayuda.js';

const test = base.extend({
  ajustes: [{}, { option: true }],
  errores: async ({ context, ajustes }, use) => {
    const errores = await preparar(context, { ajustes });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'en 390 y 1440'));
const doc = (page, ruta) => page.evaluate((r) => JSON.parse(localStorage.getItem('stub-fs:' + r) || 'null'), ruta);

test.describe('el dueño', () => {
  test.use({ ajustes: { 'stub-dueno': 'lucia@prueba.com' } });
  test('pone y quita Dorado a una cuenta, y cambiarle el modo no se lo quita', async ({ page, errores }) => {
    await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
    await expect.poll(() => page.evaluate(() => S.esDueno)).toBe(true);
    // otra cuenta que ya abrió Toisón
    await page.evaluate(() => localStorage.setItem('stub-fs:cuentas/uid-amigo', JSON.stringify({ correo: 'amigo@prueba.com', alta: '2026-11-01' })));
    await page.evaluate(() => verModos());
    const fila = page.locator('.modo-l li[data-correo="amigo@prueba.com"]');
    await expect(fila.locator('[data-dorado-cta]')).toHaveAttribute('aria-pressed', 'false');
    // la tuya no lleva el botón: tú lo tienes siempre
    await expect(page.locator('.modo-l li[data-correo="lucia@prueba.com"] [data-dorado-cta]')).toHaveCount(0);
    await fila.locator('[data-dorado-cta]').click();
    await expect(fila.locator('[data-dorado-cta]')).toHaveAttribute('aria-pressed', 'true');
    expect(await doc(page, 'modos/amigo@prueba.com')).toMatchObject({ modo: 'estandar', dorado: true });
    // cambiarle el modo (con nota) no le quita el Dorado
    await fila.locator('[data-modo="fundador"]').click();
    await page.fill('#mdN', 'Prueba lo nuevo de Hacienda');
    await page.click('#mdF .btn.pri');
    await expect.poll(() => doc(page, 'modos/amigo@prueba.com')).toMatchObject({ modo: 'fundador', dorado: true, nota: 'Prueba lo nuevo de Hacienda' });
    // y quitarlo deja el modo y la nota
    await page.locator('.modo-l li[data-correo="amigo@prueba.com"] [data-dorado-cta]').click();
    await expect.poll(() => doc(page, 'modos/amigo@prueba.com')).toMatchObject({ modo: 'fundador', dorado: false, nota: 'Prueba lo nuevo de Hacienda' });
  });
});

test.describe('un amigo', () => {
  test.use({ ajustes: { 'stub-dueno': 'carlos@prueba.com' } });
  test('con Dorado puesto, lo recibe al abrir y ve su Tu renta sin candados; sin él, con candados', async ({ page, errores }) => {
    await hzConVentas(page, { dorado: false });
    const yo = await page.evaluate(() => FB.user.email.toLowerCase());
    expect(await page.evaluate(() => S.esDueno)).toBeFalsy();
    await expect(page.locator('#hz .hz-cta')).toBeVisible();
    // el dueño le pone Dorado (en Firestore) y la app lo lee al comprobar el modo, como al abrir
    await page.evaluate((c) => {
      localStorage.setItem('stub-fs:modos/' + c, JSON.stringify({ modo: 'fundador', dorado: true }));
      const u = JSON.parse(localStorage.getItem('stub-auth-user')); u.emailVerified = true; localStorage.setItem('stub-auth-user', JSON.stringify(u));
      FB.user.emailVerified = true;
    }, yo);
    await page.evaluate(() => comprobarAcceso());
    await expect.poll(() => page.evaluate(() => tieneDorado())).toBe(true);
    expect(await page.evaluate(() => S.acceso)).toBe('privado');
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-dorado'))).toBe(true);
    // su Tu renta, abierta: la tira, sin la tarjeta de Dorado y en la casilla que toca
    await page.evaluate(() => { S.hzR = null; pintar(); });
    await expect(page.locator('#hz .hz-cta')).toHaveCount(0);
    await expect(page.locator('#hzTit')).toHaveText('Oro (ETC)');
    // en otra cuenta del mismo dispositivo no vale
    await page.evaluate(() => { const a = LS.get('inv-acceso'); LS.set('inv-acceso', { ...a, uid: 'otra' }); });
    expect(await page.evaluate(() => tieneDorado())).toBe(false);
    await page.evaluate((c) => { const a = LS.get('inv-acceso'); LS.set('inv-acceso', { ...a, uid: FB.user.uid }); localStorage.setItem('stub-fs:modos/' + c, JSON.stringify({ modo: 'fundador' })); }, yo);
    // se lo quita: al volver a comprobar, vuelve a «sin Dorado» y se le dice
    await page.evaluate(() => comprobarAcceso());
    await expect.poll(() => page.evaluate(() => tieneDorado())).toBe(false);
    await expect(page.locator('.toast, #toast').filter({ hasText: 'ya no tiene Toisón Dorado' })).toBeVisible();
  });
});
