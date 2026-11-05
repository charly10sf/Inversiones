// 0.8.3 (Carlos, 5 nov): en la versión de Google Play de la app de Android no sale nada de GTA VI (ni la cuenta atrás de
// arriba, ni el bloque de Inicio, ni el día de salida en el calendario, ni en Personalizar). La app de Play lo dice con
// InversionesApp.canal() === 'play'; la de GitHub y la web siguen como siempre
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

test('en la app de Google Play no sale nada de GTA', async ({ page }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const gta = () => page.evaluate(() => ({
    activo: gtaActivo(),
    arriba: document.querySelectorAll('.gta-top').length,
    calendario: agendaLista(S.M || calcular(), 400).some((e) => e.id === 'gta6'),
    personalizar: fueraDeHoy('gta'),
  }));
  // la web y la app de GitHub: como siempre (mientras dure la cuenta atrás)
  const dentro = await page.evaluate(() => Date.now() < GTA.hasta.getTime());
  const antes = await gta();
  expect(antes.activo).toBe(dentro);
  expect(antes.personalizar).toBe(!dentro);
  expect(antes.calendario).toBe(dentro);
  expect(antes.arriba > 0).toBe(dentro);
  // la de Play
  await page.evaluate(() => { window.InversionesApp = { canal: () => 'play' }; location.hash = 'hoy'; pintar(); });
  await page.waitForTimeout(400);
  expect(await gta()).toEqual({ activo: false, arriba: 0, calendario: false, personalizar: true });
});
