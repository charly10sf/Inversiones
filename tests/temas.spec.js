// Los diseños de Toisón: data-tema en <html> puesto antes de pintar, los tokens de cada diseño con los nombres de
// GrowFolio apuntando a ellos, las letras de la casa, el color de la barra y el selector. 0.8: sin diseño elegido,
// Mármol; el selector lo ve cualquiera en Tú y ya no hay GrowFolio.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  ajustes: [{}, { option: true }],
  errores: [async ({ context, ajustes }, use) => {
    const errores = await preparar(context, { ajustes });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

const FONDO = { marmol: '#151817', marfil: '#f2e7d5', borgona: '#2a0e14' };
const rgb = (h) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`;

async function leer(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const cs = getComputedStyle(document.body), r = getComputedStyle(document.documentElement);
    return {
      tema: document.documentElement.getAttribute('data-tema'),
      fondo: cs.backgroundColor, letra: cs.fontFamily, viejos: ['--bg', '--text', '--accent', '--plane', '--c1'].map((v) => r.getPropertyValue(v).trim()).join(''),
      barra: document.querySelector('meta[name="theme-color"]').getAttribute('content'),
      esquema: [document.querySelector('meta[name="color-scheme"]').getAttribute('content'), r.colorScheme],
      // se bajan de la casa (assets/), no de Google
      inter: (await document.fonts.load('16px Inter')).length > 0, ibarra: (await document.fonts.load('italic 16px "Ibarra Real Nova"')).length > 0,
    };
  });
}

test.describe('sin diseño elegido', () => {
  test('se abre en Mármol, sin nada de GrowFolio', async ({ page }) => {
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    const x = await leer(page);
    expect(x.tema).toBe('marmol');
    expect(x.fondo).toBe(rgb(FONDO.marmol));
    expect(x.barra).toBe(FONDO.marmol);
    expect(x.letra.startsWith('Inter')).toBe(true);
    await expect(page.locator(':is(.top, .riel) .marca-ts svg:visible').first()).toBeVisible();
    expect(await page.evaluate(() => [document.title, document.querySelector('link[rel="manifest"]') && 1, !!document.querySelector('link[href*="fonts.googleapis"]')])).toEqual(['Toisón', 1, false]);
    // ni la tarjeta «Muy pronto» ni el estreno de Toisón
    await expect(page.locator('.ts-tarjeta, .estreno.ts')).toHaveCount(0);
  });
});

for (const t of Object.keys(FONDO)) {
  test.describe(`diseño ${t}`, () => {
    test.use({ ajustes: { 'inv-tema': JSON.stringify(t), 'stub-dueno': 'lucia@prueba.com' } });
    test('se pone antes de pintar, con sus tokens, su letra y su barra', async ({ page }) => {
      // el atributo ya está cuando llega el primer CSS (lo pone el script de index.html)
      await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__temaAlEmpezar = document.documentElement.getAttribute('data-tema'); }));
      await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
      expect(await page.evaluate(() => window.__temaAlEmpezar)).toBe(t);
      const x = await leer(page);
      expect(x.tema).toBe(t);
      expect(x.fondo).toBe(rgb(FONDO[t]));
      expect(x.barra).toBe(FONDO[t]);
      // 4 nov: el esquema de color dicho en la <meta> y en el CSS, para que el modo oscuro del móvil no repinte nada
      // 5 nov: Marfil, «light dark» (Samsung Internet no hacía caso de «only light»)
      expect(x.esquema).toEqual(t === 'marfil' ? ['light dark', 'light dark'] : ['dark', 'dark']);
      expect(x.letra.startsWith('Inter')).toBe(true);
      expect(x.inter).toBe(true);
      expect(x.ibarra).toBe(true);
      // 0.8 (5b): los nombres de GrowFolio (--bg, --text, --accent…) ya no existen: todo usa los tokens
      expect(x.viejos).toBe('');
      // la carcasa: el símbolo de Toisón en la cabecera y la cabecera sin cortar (encajarCabecera)
      await expect(page.locator(':is(.top, .riel) .marca-ts svg:visible').first()).toBeVisible();
      expect(await page.evaluate(() => { const f = document.querySelector('.fila-top'); return f.scrollWidth <= f.clientWidth + 1; })).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`inicio-${t}.png`) });
    });
  });
}

test.describe('otra cuenta con un diseño guardado', () => {
  test.use({ ajustes: { 'inv-tema': JSON.stringify('marfil') } });
  test('se queda con el suyo aunque no sea el dueño', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'una vez basta');
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => [document.documentElement.getAttribute('data-tema'), localStorage.getItem('inv-tema')])).toEqual(['marfil', '"marfil"']);
  });
});

test('el selector de diseño, en Tú para cualquiera, cambia el diseño al momento', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { S.esDueno = false; location.hash = 'tu'; pintar(); });
  // tres botones (ni rastro del de GrowFolio), con Mármol marcado
  await expect(page.locator('#vista [data-elige-tema]')).toHaveCount(3);
  await expect(page.locator('#vista [data-elige-tema=""]')).toHaveCount(0);
  await expect(page.locator('#vista [data-elige-tema="marmol"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#vista [data-elige-tema="borgona"]').evaluate((b) => b.click());
  expect(await page.evaluate(() => [document.documentElement.getAttribute('data-tema'), localStorage.getItem('inv-tema'), document.querySelector('meta[name="theme-color"]').content])).toEqual(['borgona', '"borgona"', '#2a0e14']);
  await expect(page.locator('#vista [data-elige-tema="borgona"]')).toHaveAttribute('aria-pressed', 'true');
  // 4 nov: la <meta name="color-scheme"> sigue al diseño (Marfil, claro y sin dejarse oscurecer)
  const esquema = () => page.evaluate(() => document.querySelector('meta[name="color-scheme"]').content);
  expect(await esquema()).toBe('dark');
  await page.locator('#vista [data-elige-tema="marfil"]').evaluate((b) => b.click());
  expect(await esquema()).toBe('light dark');
  await page.locator('#vista [data-elige-tema="borgona"]').evaluate((b) => b.click());
  // cada muestra lleva los colores de su diseño
  expect(await page.locator('.tema-muestra[data-tema="marfil"]').evaluate((i) => getComputedStyle(i).backgroundColor)).toBe(rgb(FONDO.marfil));
  // en Ajustes, el dueño ya no tiene selector aparte
  await page.evaluate(() => { S.esDueno = true; abrirAjustes(); });
  await expect(page.locator('#aAcceso')).toBeAttached();
  await expect(page.locator('.hoja-fondo [data-elige-tema]')).toHaveCount(0);
});

// 0.8 (paso 4b): la app de Android pinta el widget, los avisos y las barras con el diseño elegido. La web se lo dice
// por el puente (InversionesApp.tema) al abrir y cada vez que cambia; aquí, un puente de imitación apunta lo que recibe
test.describe('la app de Android sabe el diseño', () => {
  test.use({ ajustes: { 'inv-tema': JSON.stringify('marmol'), 'stub-dueno': 'lucia@prueba.com' } });
  test('al abrir y al cambiarlo', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'una vez basta');
    await page.addInitScript(() => { window.__temas = []; window.InversionesApp = { tema: (t) => window.__temas.push(t) }; });
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    expect((await page.evaluate(() => window.__temas))[0]).toBe('marmol');
    await page.evaluate(() => { location.hash = 'tu'; pintar(); });
    await page.locator('#vista [data-elige-tema="marfil"]').evaluate((b) => b.click());
    await page.locator('#vista [data-elige-tema="marmol"]').evaluate((b) => b.click());
    expect((await page.evaluate(() => window.__temas)).slice(-2)).toEqual(['marfil', 'marmol']);
  });
});
