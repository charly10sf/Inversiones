// 0.7h: el patrimonio que escribe GrowIA es el de ahora, el mismo que sale al lado.
// Lo vio Carlos el 30 oct en el resumen del día: «Tu cartera hoy 81.215 €» y, debajo, «Tu patrimonio alcanza 80.853,80 €»
// (el de cuando GrowIA revisó la cartera)
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

for (const conTotal of [true, false]) {
  test(`el total que escribe GrowIA es el de ahora (${conTotal ? 'revisión con el total guardado' : 'revisión de antes de la 0.7h'})`, async ({ page, errores }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    // una revisión escrita hace 3 horas, cuando la cartera valía 361,20 € menos, con el total como lo escribe GrowIA
    const r = await page.evaluate((conTotal) => {
      S.M = calcular();
      const antes = Math.round((S.M.total - 361.2) * 100) / 100;
      S.iaPropio = {
        fecha: new Date(Date.now() - 3 * 36e5).toISOString(), modelo: 'gemini-3.6-flash', motivo: 'revisión diaria',
        ...(conTotal ? { total: antes } : {}),
        json: {
          publico: true, posiciones: {},
          titular: `Tu patrimonio alcanza **${fmtNum(antes, 2)} €** impulsado por el subidón de Repsol, mientras el bitcoin frena.`,
          resumen: [`Tienes ${fmtNum(antes, 2)} € (unos ${fmtNum(Math.round(antes / 100) * 100, 0)} €), con **+1.234 €** de ganancia; has puesto ${fmtNum(antes * 0.8, 0)} €. Hoy **+${fmtNum(antes, 0)} €** no es el total.`],
        },
      };
      return { ahora: eur(S.M.total, 0), antes: fmtNum(antes, 2), antes0: fmtNum(antes, 0), puesto: fmtNum(antes * 0.8, 0) };
    }, conTotal);

    // el resumen del día: arriba y en lo que dice GrowIA, la misma cifra
    await page.evaluate(() => resumenDelDia(() => {}, true));
    const hoja = page.locator('.hoja-rdia');
    await expect(hoja.locator('.rdia-tot')).toHaveText(r.ahora);
    const tit = hoja.locator('.rdia-ia > p').first();
    await expect(tit).toContainText(`Tu patrimonio alcanza ${r.ahora} impulsado`);
    await expect(tit).not.toContainText(r.antes);
    await page.evaluate(() => document.querySelector('.hoja-rdia [data-cerrar]').click());

    // el análisis: el titular y el párrafo, con el de ahora; lo demás (lo puesto, lo ganado, lo que sube) sin tocar
    await page.evaluate(() => { location.hash = '#analisis'; });
    const vista = page.locator('#vista');
    await expect(vista.locator('.ia-titular')).toContainText(`alcanza ${r.ahora}`);
    const parr = vista.locator('.ia-p').first();
    await expect(parr).toContainText(`Tienes ${r.ahora} (unos ${r.ahora})`);
    await expect(parr).toContainText(`has puesto ${r.puesto} €`);
    await expect(parr).toContainText('+1.234 €');
    await expect(parr).toContainText(`+${r.antes0} €`);
    await expect(vista).not.toContainText(r.antes);

    // con las cifras ocultas, también oculta
    await page.evaluate(() => { S.oculto = true; pintar(); });
    await expect(vista.locator('.ia-titular')).toContainText('alcanza ••••');
    await page.evaluate(() => { S.oculto = false; pintar(); });
  });
}
