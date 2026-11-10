// 0.8.6 · Tu año en Toisón: las pantallas (sesión 8 del plan), según la maqueta aprobada el 10 nov. Una página de Hoy:
// en el ordenador, las siete tarjetas en rejilla; en el móvil, una tarjeta por pantalla con las barras arriba y
// «Anterior / Siguiente». Textos de la CNMV, sin candados de Dorado.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, quitarCapas } from './ayuda.js';
import { meterCarteraTuAno } from './tuano-cartera.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const TITULOS = ['Tu estilo de inversor', 'Lo que aportaste', 'La edad de tu dinero', 'Dónde está tu dinero', 'Lo que te costó', 'Dividendos', 'Meses sin sacar dinero'];

async function abrir(page, modo) {
  await crearCuenta(page); await meterCarteraTuAno(page); await quitarCapas(page);
  await page.evaluate((m) => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); ponerModo(m); location.hash = 'av-tuano'; }, modo);
  await expect(page.locator('#panelAv[data-p="tuano"]:not([aria-busy]) .ta-t')).toHaveCount(7, { timeout: 20_000 });
  await page.waitForTimeout(300); await quitarCapas(page);
}

test('ordenador: una página de Hoy con las siete tarjetas en rejilla, la gráfica con escala y sin candados', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'es la forma del ordenador');
  await abrir(page, 'avanzado');
  const panel = page.locator('#panelAv');
  expect((await panel.locator('.ta-t .pab-cab span:last-child').allTextContents()).map((t) => t.trim())).toEqual(TITULOS);
  // en la lista de Hoy, «Tu año 2026» marcado; la cabecera, con la vuelta a Hoy
  await expect(page.locator('#k2Pags [aria-current="page"]')).toHaveText(/^Tu año \d{4}$/);
  await expect(page.locator('.ta-grupo .vista-volver')).toHaveAttribute('href', '#hoy');
  await expect(page.locator('.ta-grupo .ts-tit')).toHaveText('Tu año en Toisón');
  // la rejilla: el estilo de todo el ancho; aportaciones y edad, una al lado de la otra y de la misma altura
  const caja = (k) => panel.locator(`.ta-t[data-ta="${k}"]`).boundingBox();
  const [p, est, apo, edad, pai, cos] = await Promise.all([panel.boundingBox(), caja('estilo'), caja('aport'), caja('edad'), caja('paises'), caja('costes')]);
  expect(est.width).toBeGreaterThan(p.width * 0.95);
  expect(Math.abs(apo.y - edad.y)).toBeLessThan(2); expect(edad.x).toBeGreaterThan(apo.x + apo.width);
  expect(Math.abs(apo.height - edad.height)).toBeLessThan(2);
  expect(pai.width).toBeGreaterThan(cos.width * 1.5);
  // lo del móvil no se ve
  for (const s of ['.ta-hbarra', '.ta-hcab', '.ta-hpie']) await expect(panel.locator(s)).toBeHidden();
  await expect(panel.locator('.ta-cab')).toBeVisible();
  // el calendario de 12 casillas; la gráfica del año, con rótulos en el eje
  await expect(panel.locator('.ta-cal .ta-mes')).toHaveCount(12);
  expect(await page.locator('#taMovido svg text').count()).toBeGreaterThan(3);
  const t = await panel.innerText();
  expect(t).not.toMatch(/\b(compra|vende|comprar|vender|compres|vendas|deberías|te recomendamos)\b/i);
  expect(await panel.locator('.et-dorado, .sello-d, .fr-cand').count()).toBe(0);
  // nada se sale de su tarjeta
  const sale = await page.evaluate(() => [...document.querySelectorAll('#panelAv .ta-t')].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.dataset.ta));
  expect(sale).toEqual([]);
});

test('móvil: una tarjeta por pantalla, con las barras, «Anterior / Siguiente» y la vuelta a Hoy', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'es la forma del móvil');
  await abrir(page, 'basico');
  const pag = page.locator('#panelAv .ta-pag');
  // ocupa la pantalla entera, por encima de la barra de abajo
  const vp = page.viewportSize(), b = await pag.boundingBox();
  expect(b.width).toBeCloseTo(vp.width, 0); expect(b.height).toBeCloseTo(vp.height, 0);
  await expect(page.locator('.ta-hbarra i')).toHaveCount(7);
  await expect(page.locator('.ta-cab')).toBeHidden();
  // Hoy marcado abajo (es una página de Hoy)
  expect(await page.evaluate(() => grupoDe(S.vista).k)).toBe('cartera');
  const ant = page.locator('[data-ta-ir="-1"]'), sig = page.locator('[data-ta-ir="1"]');
  await expect(ant).toBeDisabled();
  for (let i = 0; i < 7; i++) {
    await expect(page.locator('.ta-t:visible')).toHaveCount(1);
    await expect(page.locator('.ta-t:visible .pab-cab span:last-child')).toHaveText(TITULOS[i]);
    await expect(page.locator('.ta-hnum')).toHaveText(String(i + 1));
    await expect(page.locator('.ta-hbarra i.aqui')).toHaveCount(1);
    // la tarjeta cabe a lo ancho y entre la cabecera y los botones
    await expect(async () => {
      const r = await page.evaluate(() => { const c = document.querySelector('.ta-t.ta-aqui'), p = document.querySelector('.ta-hpie'); const a = c.getBoundingClientRect(), b = p.getBoundingClientRect(); return { x: a.x, d: a.right, abajo: a.bottom, pie: b.top, ancho: c.scrollWidth <= c.clientWidth + 1 }; });
      expect(r.x).toBeGreaterThanOrEqual(0); expect(r.d).toBeLessThanOrEqual(vp.width + 1);
      expect(r.abajo).toBeLessThanOrEqual(r.pie + 1); expect(r.ancho).toBe(true);
    }).toPass({ timeout: 10_000 });
    if (i === 6) { await expect(sig).toHaveText('Volver a Hoy'); expect(await page.locator('#taMovido svg text').count()).toBeGreaterThan(3); }
    else await sig.click();
  }
  await ant.click(); await expect(page.locator('.ta-hnum')).toHaveText('6');
  await sig.click(); await sig.click();
  await expect(page).toHaveURL(/#hoy$/);
  await expect(page.locator('#panelAv .ta-pag')).toHaveCount(0);
});

test('móvil: la cruz vuelve a Hoy y, al volver, empieza por la primera', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'basta con un tamaño');
  await abrir(page, 'avanzado');
  await page.locator('[data-ta-ir="1"]').click(); await page.locator('[data-ta-ir="1"]').click();
  await page.locator('.ta-cerrar').click();
  await expect(page).toHaveURL(/#hoy$/);
  await page.evaluate(() => { location.hash = 'av-tuano'; });
  await expect(page.locator('.ta-hnum')).toHaveText('1', { timeout: 20_000 });
  const t = await page.locator('#panelAv').innerText();
  expect(t).not.toMatch(/\b(compra|vende|comprar|vender|compres|vendas|deberías|te recomendamos)\b/i);
});
