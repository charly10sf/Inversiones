// 0.7g: lo que ve una cuenta del modo estándar (la de cualquiera que no sea fundador)
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

// Lo vio Claude el 30 oct haciendo capturas para las redes: en estándar, Hacienda seguía con «Lo que cuesta lo que te
// recomienda GrowFolio» (y, de julio en adelante, puede llevar «Vender … con pérdidas»). En estándar GrowFolio no recomienda
test('en estándar, Hacienda no habla de lo que recomienda GrowFolio; en fundador, sí', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  expect(await page.evaluate(() => S.acceso)).toBe('publico');
  // una aportación al mes: en fundador sale como fila de esa tabla
  await page.evaluate(async () => {
    S.cartera.aportaciones = [{ id: 'a1', instrumento: 'ishares-us', plataforma: 'MyInvestor', importe: 300, dia: 1, desde: '2025-01-01' }];
    await guardarCarteraCallada('prueba');
    S.M = calcular();
    location.hash = '#impuestos';
  });
  const vista = page.locator('#vista');
  await expect(vista).toContainText('Lo que pagas');
  await expect(vista).not.toContainText('recomienda GrowFolio');
  await expect(vista).not.toContainText('cuesta cada recomendación');
  await expect(page.locator('#hFisR')).toHaveCount(0);
  // «Para pagar menos»: la regla, sin decir qué vender, y los nombres con «&» sin escapar dos veces
  await expect(vista).not.toContainText('vender también estas');
  await expect(vista).not.toContainText('&amp;');
  // la Guía de la renta, en estándar, sin «el Paso a paso te lo propone»
  await page.evaluate(() => { S.fisTab = 'renta'; pintar(); });
  await expect(vista).toContainText('Guía de la renta');
  await expect(vista).not.toContainText('te lo propone');
  await page.evaluate(() => { S.fisTab = 'tu'; pintar(); });

  await page.evaluate(() => { S.acceso = 'privado'; pintar(); });
  await expect(page.locator('#hFisR')).toBeVisible();
  await expect(vista).toContainText('Aportar 300 € al mes');
  await expect(vista).toContainText('cuesta cada recomendación');
  await expect(vista).toContainText('Más abajo, lo que pagarías');
});

// Carlos, 30 oct: la letra pequeña de Google debajo de la caja de GrowIA le quitaba seriedad. Lo de adónde van los datos
// sigue donde se pone la clave
test('GrowIA, sin la letra pequeña de Google debajo de la caja; la explicación sigue al poner la clave', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await page.evaluate(() => { guardarCfgAsesor({ auto: 'manual' }); AS.clave = 'AQ.prueba-de-growfolio'; abrirAsesor(''); });
  await expect(page.locator('#asTexto')).toBeVisible();
  await expect(page.locator('#asNota')).toHaveCount(0);
  await expect(page.locator('#asPie')).not.toContainText('cifrados en el camino');
  await page.evaluate(() => { cerrarAsesor(); AS.clave = null; abrirAsesor(''); });
  await expect(page.locator('#asCuerpo')).toContainText('no pasan por GrowFolio');
  // y con la clave ya puesta, en Ajustes de GrowIA
  await page.evaluate(() => { cerrarAsesor(); AS.clave = 'AQ.prueba-de-growfolio'; AS.vista = 'ajustes'; abrirAsesor(''); });
  await page.evaluate(() => { AS.vista = 'ajustes'; pintarAsesor(); });
  await expect(page.locator('#asCuerpo')).toContainText('no pasan por GrowFolio');
});
