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

// mejorar-ia-2 (19 nov): al cambiar el tamaño (o girar el móvil) se vuelve a medir, y repintar un turno no mide las tablas de los demás
test('la tabla se vuelve a medir al cambiar el tamaño de la ventana; repintar un turno no toca las tablas de otro', async ({ page }) => {
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  await page.evaluate(async () => {
    await abrirAsesor();
    const fila = (a) => `| ${a.join(' | ')} |`;
    const cab = ['Posición', 'Valor', 'Ganancia', 'Impuesto si vendes', 'Peso', 'Qué hacer', 'Cuándo'];
    const tabla = [fila(cab), fila(cab.map(() => '---')), fila(['MSCI Europe', '23.193 €', '+6.293 €', '1.169 €', '26,1 %', 'Mantener y seguir', 'Sin prisa'])].join('\n');
    const turno = () => ({ rol: 'ia', partes: [{ tipo: 'texto', texto: `Aquí la tienes:\n\n${tabla}\n\nY ya.` }], citas: [], resultados: [] });
    AS.conv = [{ rol: 'yo', texto: 'Hazme una tabla' }, turno(), { rol: 'yo', texto: 'Otra' }, turno()];
    pintarAsesor();
  });
  const t0 = page.locator('#asT1 .as-tabla'), t1 = page.locator('#asT3 .as-tabla');
  await expect(t0).toHaveClass(/as-tabla-der/);
  await expect(t1).toHaveClass(/as-tabla-der/);
  // repintar el último turno (como hace mientras la IA escribe) no vuelve a medir la tabla del primero
  await page.evaluate(() => { document.querySelector('#asT1 .as-tabla').classList.remove('as-tabla-der'); pintarTurno(3); });
  await expect(page.locator('#asT3 .as-tabla')).toHaveClass(/as-tabla-der/);
  await expect(t0).not.toHaveClass(/as-tabla-der/);
  // al cambiar el tamaño (o girar el móvil) se miden todas otra vez: la del primer turno recupera su marca
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(t0).toHaveClass(/as-tabla-der/);
  await expect(t1).toHaveClass(/as-tabla-der/);
  await page.evaluate(() => { document.querySelector('#asT1 .as-tabla').classList.remove('as-tabla-der'); window.dispatchEvent(new Event('orientationchange')); });
  await expect(t0).toHaveClass(/as-tabla-der/);
});
