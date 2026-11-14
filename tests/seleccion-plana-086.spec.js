// 0.8.6 · Lo elegido en pestañas y segmentos, plano (Carlos, 10 nov: «quitar ese 3D raro que tiene cada pestaña
// seleccionada»; src/css/32-seleccion-plana.css): en Mármol y en Marfil, sin degradado ni sombra, y que se siga viendo
// cuál está elegida (un fondo que no es el de las demás).
import { test, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const estilo = (page, sel) => page.locator(sel).first().evaluate((el) => {
  const cs = getComputedStyle(el), otro = [...el.parentElement.children].find((x) => x !== el && x.tagName === el.tagName);
  return { img: cs.backgroundImage, sombra: cs.boxShadow, fondo: cs.backgroundColor, fondoOtro: otro ? getComputedStyle(otro).backgroundColor : null };
});
const plano = (e) => {
  expect(e.img, 'sin degradado').toBe('none');
  // sin sombra ni brillo; en Marfil del ordenador, la raya de oro de abajo (una línea lisa por dentro, sin difuminar)
  expect(e.sombra, 'sin sombra ni brillo').toMatch(/^(none|rgb\([\d, ]+\) 0px -3px 0px 0px inset)$/);
  expect(e.fondo, 'con fondo propio').not.toBe('rgba(0, 0, 0, 0)');
  if (e.fondoOtro) expect(e.fondo, 'distinto de las demás').not.toBe(e.fondoOtro);
};

for (const tema of ['marmol', 'marfil']) {
  test(`${tema}: la pestaña elegida de Ideas, la de Análisis y el Básico/Avanzado, planas`, async ({ page, context }, info) => {
    const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema) } });
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); ponerModo('avanzado'); location.hash = '#expertos'; });
    await page.waitForSelector('.exp-tabs [aria-pressed="true"]'); await quitarCapas(page);
    plano(await estilo(page, '.exp-tabs [aria-pressed="true"]'));
    if (info.project.name === 'pc') {
      // el Básico / Avanzado de la columna de la barra lateral (en Marfil, el oro liso sobre el vino)
      await page.waitForSelector('.k2-col .seg-modo [aria-pressed="true"]');
      plano(await estilo(page, '.k2-col .seg-modo [aria-pressed="true"]'));
    } else {
      await page.evaluate(() => { location.hash = 'av-rentab'; });
      await page.waitForSelector('.pest-tira .pest-av a[aria-current="page"]'); await quitarCapas(page);
      plano(await estilo(page, '.pest-tira .pest-av a[aria-current="page"]'));
    }
    expect(errores).toEqual([]);
  });
}
