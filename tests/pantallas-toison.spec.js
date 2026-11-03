// 0.8 (rediseño, paso 3) · Las pantallas con un diseño de Toisón: la IA se llama «la IA» (sin el logo ni el nombre de
// GrowIA), los iconos de dentro de las pantallas son de plumilla, Hoy lleva «Hoy» y «Ganado» en pastillas y «Lo que viene»
// con el día en un recuadro, y el pie de cada pestaña (avisar de un fallo, tutorial) ya no sale: está en Tú.
// Con GrowFolio, todo como siempre.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const conTema = (tema) => base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { ...(tema ? { 'inv-tema': JSON.stringify(tema) } : {}), 'stub-dueno': 'lucia@prueba.com' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const ir = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(500); };
const visibleConGrowIA = (page) => page.evaluate(() => {
  const w = document.createTreeWalker(document.querySelector('#vista'), NodeFilter.SHOW_TEXT);
  const out = []; for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.includes('GrowIA') && n.parentElement.offsetParent) out.push(n.nodeValue.trim());
  return out;
});

conTema('marfil')('con Toisón: la IA sin nombre, iconos de plumilla, pastillas y el día en su recuadro', async ({ page }, info) => {
  base.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await ir(page, 'cartera');
  // Hoy: el ojo y la «i» de la gráfica, de plumilla; Hoy y Ganado con su pastilla; el pie, escondido
  await expect(page.locator('.hero-ojo svg.ic-pl')).toHaveCount(1);
  await expect(page.locator('.hv-info svg.ic-pl')).toHaveCount(1);
  expect(await page.locator('.hero-sub .hs .k').allInnerTexts()).toEqual(['Hoy', 'Ganado']);
  await expect(page.locator('.pie-btns')).toBeHidden();
  if (await page.locator('.ag-card').count()) await expect(page.locator('.ag-card .ag-dia').first()).toBeVisible();
  expect(await visibleConGrowIA(page)).toEqual([]);
  // Análisis: «La IA opina», sin la imagen del nombre de GrowIA
  await ir(page, 'analisis');
  await expect(page.locator('#vista .subvistas button').first()).toHaveText('La IA opina');
  await expect(page.locator('#vista img.gia-nom')).toHaveCount(0);
  expect(await visibleConGrowIA(page)).toEqual([]);
  // Ideas: las pestañas de dentro dicen de dónde sale cada idea
  await ir(page, 'ideas');
  expect((await page.locator('.exp-tabs button').allInnerTexts()).map((t) => t.split('\n')[0])).toEqual(['Lo tuyo', 'Del radar', 'Siguiendo']);
  // el panel de la IA: su nombre y su bocadillo de metal
  await page.locator('#bAsesor').evaluate((b) => b.click());
  await expect(page.locator('#asTit .ia-nom')).toHaveText('La IA');
  await expect(page.locator('.as-ico .ia-av-ts svg.ic-pl')).toHaveCount(1);
});

conTema('')('con GrowFolio, como siempre: GrowIA con su logo y los iconos de trazo', async ({ page }, info) => {
  base.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await ir(page, 'cartera');
  await expect(page.locator('.hero-ojo svg.ic-pl')).toHaveCount(0);
  await expect(page.locator('.hero-ojo svg[stroke="currentColor"]')).toHaveCount(1);
  await expect(page.locator('.hero-sub .hs .k').last()).toHaveText('Ganado desde que compraste');
  await ir(page, 'analisis');
  await expect(page.locator('#vista .subvistas button img.gia-nom')).toHaveCount(1);
});
