// 0.8.3a (sesión 4) · Toisón Dorado, lo visual (claude/sesion-temas-toison-dorado.md del Proyecto). Aún no hay plan de
// pago: lo ve el dueño (tieneDorado, 42-modos.js), que puede ponerse «Como los demás». Con Mármol: el Mármol dorado, el
// borde #4f3f20 y la marca entera (sello + TOISÓN + DORADO) en la cabecera del móvil y arriba de la K2; con Marfil, la
// marca con el sello de filo #5e4210, la crema con vetas de oro y el borde #d4b580 (8 nov). Sin él, todo como siempre, salvo los candados del plan con el sello pequeño.
// Y las novedades de la 0.8.3a: una de letra con cosas sale en la hoja corta, con la guía de Más y la K2.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const conCuenta = (ajustes) => base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const omitir = (info) => test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');
const test = base;

const lista = async (page) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); });
  await quitarCapas(page);
};
// lo que se ve de la marca de arriba (la cabecera en el móvil; la K2 en el ordenador) y del fondo
const mira = (page, pc) => page.evaluate((pc) => {
  const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
  const marca = document.querySelector(pc ? '.riel .k2-marca' : '.top .marca-ts');
  const dor = document.querySelector(pc ? '.riel .k2-marca-tx .marca-dor' : '.top .marca-ts .marca-dor');
  const sello = marca.querySelector('.sello-d'), simb = marca.querySelector(':scope > i:not(.sello-d)');
  const tarjeta = document.querySelector('.card, .tarjeta, .hero');
  return {
    dorado: document.documentElement.hasAttribute('data-dorado'),
    dor: vis(dor), dorTexto: dor ? dor.textContent : '', sello: vis(sello), simb: vis(simb),
    filo: sello ? getComputedStyle(sello).backgroundImage + ' ' + getComputedStyle(sello).backgroundColor : '',
    borde: getComputedStyle(document.documentElement).getPropertyValue('--borde').trim().toLowerCase(),
    fondo: getComputedStyle(document.getElementById('acabadoTema')).backgroundImage,
    tarjeta: !!tarjeta,
  };
}, pc);

test.describe('sin Toisón Dorado', () => {
  const t = conCuenta({});
  t('todo como siempre; los candados del plan, con el sello pequeño', async ({ page }, info) => {
    omitir(info);
    const pc = info.project.name === 'pc';
    await lista(page);
    const x = await mira(page, pc);
    expect(x.dorado).toBe(false);
    expect(x.dor).toBe(false);
    expect(x.sello).toBe(false);
    expect(x.simb).toBe(true);
    expect(x.borde).toBe('#313131');
    expect(x.fondo).toContain('marmol-g');
    expect(x.fondo).not.toContain('dorado');
    // la textura dorada ni se pide
    const pedidas = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('dorado')));
    expect(pedidas).toEqual([]);
    // en Tú no sale el interruptor del dueño
    await page.evaluate(() => { location.hash = 'tu'; });
    await expect(page.locator('.temas')).toBeVisible();
    await expect(page.locator('[data-dorado-ver]')).toHaveCount(0);
    if (pc) {
      // la etiqueta Dorado de Escritorios y su hoja, con el sello pequeño en vez del candado
      await expect(page.locator('.k2-escr .et-dorado .sello-d')).toBeVisible();
      await page.evaluate(() => document.querySelector('[data-accion="escritorios"]').click());
      await expect(page.locator('.hoja-escr .et-dorado-g .sello-d')).toBeVisible();
      await expect(page.locator('.hoja-escr')).toContainText('Todavía no está disponible');
    }
  });
});

test.describe('con Toisón Dorado (el dueño)', () => {
  const t = conCuenta({ 'stub-dueno': 'lucia@prueba.com' });
  t('Mármol dorado, borde en oro suave y la marca entera arriba; «Como los demás» lo quita', async ({ page }, info) => {
    omitir(info);
    const pc = info.project.name === 'pc';
    await lista(page);
    await expect(page.locator('html[data-dorado]')).toBeAttached({ timeout: 20_000 });
    const x = await mira(page, pc);
    expect(x.dor).toBe(true);
    expect(x.dorTexto).toBe('DORADO');
    expect(x.sello).toBe(true);
    expect(x.simb).toBe(false);
    expect(x.borde).toBe('#4f3f20');
    // la textura dorada: en el móvil, la alta; en el ordenador, la ancha (con huella del build)
    if (pc) expect(x.fondo).toContain('marmol-dorado-pc');
    else { expect(x.fondo).toContain('marmol-dorado'); expect(x.fondo).not.toContain('marmol-dorado-pc'); }
    const url = /url\("?([^")]+)"?\)/.exec(x.fondo)[1];
    expect((await page.request.get(url)).status()).toBe(200);
    // el filete del sello, en oro pulido (un degradado)
    expect(x.filo).toContain('gradient');
    if (pc) {
      // arriba de la K2, TOISÓN y DORADO: DORADO del mismo ancho que TOISÓN
      const [a, b] = await page.evaluate(() => ['.k2-marca-tx b', '.k2-marca-tx .marca-dor'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().width)));
      expect(Math.abs(a - b)).toBeLessThanOrEqual(2);
      await expect(page.locator('.k2-escr .et-dorado')).toHaveCSS('background-image', /gradient/);
      await page.evaluate(() => document.querySelector('[data-accion="escritorios"]').click());
      await expect(page.locator('.hoja-escr')).toContainText('Ya tienes Toisón Dorado');
      await page.evaluate(() => document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()));
    }
    // en Tú › Diseño, el dueño puede verla como los demás (y se recuerda)
    await page.evaluate(() => { location.hash = 'tu'; });
    await expect(page.locator('[data-dorado-ver]')).toHaveCount(2);
    await page.evaluate(() => document.querySelector('[data-dorado-ver="0"]').click());
    await expect(page.locator('html:not([data-dorado])')).toBeAttached();
    expect((await mira(page, pc)).borde).toBe('#313131');
    await page.reload();
    await page.waitForFunction(() => S.accesoVisto && document.querySelector('.top .marca-ts'), null, { timeout: 30_000 }).catch(() => {});
    await expect(page.locator('html:not([data-dorado])')).toBeAttached();
    await page.evaluate(() => { LS.set('inv-dorado-ver', 1); ponerDorado(); });
    await expect(page.locator('html[data-dorado]')).toBeAttached();
  });

  t('en Marfil: sello con filo #5e4210, la crema con vetas de oro y el borde #d4b580 (8 nov)', async ({ page }, info) => {
    omitir(info);
    const pc = info.project.name === 'pc';
    await lista(page);
    await page.evaluate(() => ponerTema('marfil'));
    await expect(page.locator('html[data-dorado][data-tema="marfil"]')).toBeAttached({ timeout: 20_000 });
    const x = await mira(page, pc);
    expect(x.dor).toBe(true);
    expect(x.sello).toBe(true);
    expect(x.filo).toContain('rgb(94, 66, 16)');
    expect(x.borde).toBe('#d4b580');
    expect(x.fondo).not.toContain('marmol');
    if (pc) expect(x.fondo).toContain('marfil-dorado-pc');
    else { expect(x.fondo).toContain('marfil-dorado'); expect(x.fondo).not.toContain('marfil-dorado-pc'); }
    const url = /url\("?([^")]+)"?\)/.exec(x.fondo)[1];
    expect((await page.request.get(url)).status()).toBe(200);
    // «Como los demás»: el Marfil de siempre, sin vetas ni borde dorado
    await page.evaluate(() => { LS.set('inv-dorado-ver', 0); ponerDorado(); });
    await expect(page.locator('html:not([data-dorado])')).toBeAttached();
    const y = await mira(page, pc);
    expect(y.borde).toBe('#dccbb0');
    expect(y.fondo).not.toContain('dorado');
  });
});

test.describe('novedades de la 0.8.3a', () => {
  const t = conCuenta({});
  t('una de letra con novedades sale en la hoja corta, y «Ir» enseña Más y la K2', async ({ page }, info) => {
    omitir(info);
    const pc = info.project.name === 'pc';
    await lista(page);
    const r = await page.evaluate(() => ({
      v: VERSION, primera: NOVEDADES[0].v,
      camino: caminoNovedades('0.8.3', '0.8.3a'), desde082: caminoNovedades('0.8.2e', '0.8.3a'),
      // las de letra de antes de la 0.8.2 con cosas siguen como siempre
      vieja: caminoNovedades('0.4', '0.4b'),
    }));
    expect(r).toEqual({ v: '0.8.3d', primera: '0.8.3d', camino: 'corta', desde082: 'corta', vieja: 'letra' });
    await page.evaluate(async () => { await cargarTrozo('novedades'); document.querySelectorAll('.hoja-fondo, .tour, .aviso-arr').forEach((x) => x.remove()); hojaIntermedia('0.8.3', () => { window.__cerrada = true; }, '0.8.3a'); });
    const h = page.locator('.hoja-corta');
    await expect(h).toBeVisible();
    await expect(h.locator('.hoja-t, h2').first()).toContainText('0.8.3a');
    await expect(h.locator('.nov-lista li')).toHaveCount(4);   // la de Toisón Dorado es solo del dueño
    await expect(h).toContainText('Más, y un menú nuevo en el ordenador');
    await expect(h).toContainText('Tú, más claro');
    await expect(h).toContainText('Rentabilidad y Riesgo, en sencillo');
    await expect(h).toContainText('Un acabado de cristal');
    await expect(h).not.toContainText('Toisón Dorado');
    // «Ir» de Más: la guía señala Más en el móvil y la barra de iconos en el ordenador
    await page.evaluate(() => document.querySelector('.hoja-corta [data-corta-ir="0"]').click());
    await expect(page.locator('.tour')).toBeVisible();
    await expect(page.locator('.tour')).toContainText('Más, y el menú del ordenador');
    await expect.poll(() => page.evaluate(() => (TOURE && TOURE.el ? TOURE.el.matches('.navbar [data-mas]') ? 'mas' : TOURE.el.matches('.riel .k2-iconos') ? 'k2' : TOURE.el.className : null)), { timeout: 10_000 }).toBe(pc ? 'k2' : 'mas');
    await page.evaluate(() => cerrarTour(true));
    await expect(page.locator('.hoja-corta')).toBeVisible();
  });
});
