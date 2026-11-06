// 0.8.3 (Carlos, 6 nov 2026): la cifra del patrimonio va con la letra de los títulos de cada estilo, en negrita, y la
// línea de la gráfica acaba en su mismo color (antes el último tramo se iba a un dorado claro fijo, #F8DC9C).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

test('la cifra del patrimonio, con la letra de cada estilo y en negrita; la línea, de un solo color', async ({ page }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const esperado = { marmol: [/^Inter/, 'normal'], marfil: [/^"?Ibarra Real Nova/, 'normal'], borgona: [/^"?Ibarra Real Nova/, 'italic'] };
  for (const [t, [familia, estilo]] of Object.entries(esperado)) {
    await page.evaluate((t) => { document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()); ponerTema(t); pintar(); }, t);
    await page.waitForSelector('#heroNum');
    const r = await page.evaluate(() => {
      const c = getComputedStyle(document.querySelector('#heroNum'));
      // el degradado del trazo: todas sus paradas, del mismo color
      const g = [...document.querySelectorAll('linearGradient[id$="t"]')].find((x) => document.querySelector(`.gh-trazo[stroke="url(#${x.id})"]`));
      const colores = g ? [...g.querySelectorAll('stop')].map((s) => s.style.stopColor) : [];
      return { familia: c.fontFamily, peso: c.fontWeight, estilo: c.fontStyle, colores };
    });
    expect(r.familia, t).toMatch(familia);
    expect(r.peso, t).toBe('700');
    expect(r.estilo, t).toBe(estilo);
    expect(r.colores.length, `${t}: hay gráfica`).toBeGreaterThan(1);
    expect(new Set(r.colores).size, `${t}: ${r.colores.join(', ')}`).toBe(1);
  }
});
