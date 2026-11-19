// Mejorar la IA (19 nov 2026): en el móvil, una tabla de la IA que no cabe se difumina por el lado al que queda algo, y
// deja de hacerlo al llegar al final (antes, la última columna se cortaba sin pista de que había más)
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

test('la tabla ancha de la IA avisa de que hay más a la derecha y, al desplazarla, a la izquierda', async ({ page }) => {
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  await page.evaluate(async () => {
    await abrirAsesor();
    const fila = (a) => `| ${a.join(' | ')} |`;
    const cab = ['Posición', 'Valor', 'Ganancia', 'Impuesto si vendes', 'Peso', 'Qué hacer', 'Cuándo'];
    const tabla = [fila(cab), fila(cab.map(() => '---')), fila(['MSCI Europe', '23.193 €', '+6.293 €', '1.169 €', '26,1 %', 'Mantener y seguir', 'Sin prisa']), fila(['Repsol', '6.557 €', '+3.656 €', '664 €', '7,4 %', 'Mantener', 'Antes del 12 ene'])].join('\n');
    AS.conv = [{ rol: 'yo', texto: 'Hazme una tabla' }, { rol: 'ia', partes: [{ tipo: 'texto', texto: `Aquí la tienes:\n\n${tabla}\n\nY ya.` }], citas: [], resultados: [] }];
    pintarAsesor();
  });
  const t = page.locator('#asCuerpo .as-tabla').first();
  await expect(t).toBeVisible();
  expect(await t.evaluate((x) => x.scrollWidth > x.clientWidth)).toBe(true);
  await expect(t).toHaveClass(/as-tabla-der/);
  await expect(t).not.toHaveClass(/as-tabla-izq/);
  expect(await t.evaluate((x) => getComputedStyle(x).maskImage || getComputedStyle(x).webkitMaskImage)).toContain('linear-gradient');
  await t.evaluate((x) => { x.scrollLeft = x.scrollWidth; });
  await expect(t).toHaveClass(/as-tabla-izq/);
  await expect(t).not.toHaveClass(/as-tabla-der/);
});
