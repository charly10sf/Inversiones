// 0.9 · «Explícame una cifra»: tocar una cifra (el patrimonio, las de Hoy, las de las pestañas de Análisis) abre un globo
// con lo que es y «Explícamela», que abre la IA con la pregunta sobre esa cifra. Con las cifras ocultas, sin el valor.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

test('tocar una cifra la explica', async ({ page }, info) => {
  test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { location.hash = 'cartera'; ponerModo('avanzado'); });
  await page.waitForTimeout(800); await quitarCapas(page);

  // el patrimonio
  const hero = page.locator('#heroNum');
  await expect(hero).toHaveAttribute('data-cifra', /Patrimonio/);
  await hero.evaluate((h) => h.click());
  const g = page.locator('#globoCifra');
  await expect(g).toBeVisible();
  await expect(g.locator('.gc-et')).toHaveText('Patrimonio');
  await expect(g.locator('.gc-v')).toContainText('€');
  // dentro de la pantalla
  const caja = await g.boundingBox(), vp = page.viewportSize();
  expect(caja.x).toBeGreaterThanOrEqual(0); expect(caja.x + caja.width).toBeLessThanOrEqual(vp.width);
  // Escape lo cierra; con el teclado se vuelve a abrir
  await page.keyboard.press('Escape');
  await expect(g).toHaveCount(0);
  await hero.focus(); await page.keyboard.press('Enter');
  await expect(g).toBeVisible();
  // fuera lo cierra
  await page.mouse.click(5, vp.height - 5);
  await expect(g).toHaveCount(0);

  // una cifra de una pestaña de Análisis: abre la IA con la pregunta
  await page.evaluate(() => { location.hash = 'posiciones'; });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-pest-av="riesgo"]').click());
  const k = page.locator('#panelAv .pav-kpi b[data-cifra]').first();
  await expect(k).toBeVisible({ timeout: 15_000 });
  const et = await k.getAttribute('data-cifra');
  await k.evaluate((x) => x.click());
  await expect(g.locator('.gc-et')).toHaveText(et);
  await expect(g.locator('.gc-cab small')).toContainText('Riesgo');
  const q = await g.locator('.gc-ia').getAttribute('data-q');
  expect(q).toContain(`«${et}»`);
  expect(q).toContain('Sin decirme qué hacer');
  // la IA se abre con esa pregunta (aquí sin clave saldría la pantalla de la clave: se mira la llamada)
  await page.evaluate(() => { window.__abrir = abrirAsesor; window.abrirAsesor = (q, enviar) => { window.__q = [q, enviar]; }; });
  await g.locator('.gc-ia').evaluate((b) => b.click());
  await expect(g).toHaveCount(0);
  const [qq, enviar] = await page.evaluate(() => window.__q);
  expect(qq).toBe(q); expect(enviar).toBe(true);
  await page.evaluate(() => { window.abrirAsesor = window.__abrir; });

  // con las cifras ocultas, la pregunta no lleva el valor
  await page.evaluate(() => { S.oculto = true; pintar(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('[data-pest-av="riesgo"]').click());
  await expect(page.locator('#panelAv .pav-kpi b[data-cifra]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('#panelAv .pav-kpi b[data-cifra]').first().evaluate((x) => x.click());
  await expect(g.locator('.gc-v')).toHaveCount(0);
  expect(await g.locator('.gc-ia').getAttribute('data-q')).not.toMatch(/» \(/);
});
