// 0.8.3 · Revisión del diseño (5 nov): en ninguna pantalla se sale nada por la derecha y ninguna cifra sale cortada con
// puntos suspensivos («232.00…», «1,05 millone…»). Las filas que se deslizan de lado se difuminan por el lado que sigue.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const PANTALLAS = ['hoy', 'posiciones', 'analisis', 'fiscal', 'mercados', 'ideas', 'tu', 'objetivos', 'ruta', 'proyeccion', 'agenda'];
const test = base.extend({ errores: [async ({ context }, use) => { const e = await preparar(context); await use(e); expect(e).toEqual([]); }, { auto: true }] });

test('nada se sale de la pantalla y ninguna cifra sale cortada', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'en el móvil, que es donde aprieta');
  test.setTimeout(180_000);
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  if (process.env.CLASE) await page.evaluate(() => { window.__CLASE = 1; });
  const fallos = {};
  for (const h of PANTALLAS) {
    await page.evaluate((h) => { location.hash = h; scrollTo(0, 0); }, h);
    await page.waitForTimeout(500); await quitarCapas(page);
    const r = await page.evaluate(() => {
      const W = document.documentElement.clientWidth, mal = [];
      if (document.documentElement.scrollWidth > W + 1) mal.push(`la página mide ${document.documentElement.scrollWidth} px`);
      for (const el of document.querySelectorAll('#vista *')) {
        if (el.children.length || !/\d/.test(el.textContent)) continue;
        const cs = getComputedStyle(el);
        if (cs.textOverflow === 'ellipsis' && cs.webkitLineClamp === 'none' && el.scrollWidth > el.clientWidth + 1) mal.push(`cortada: ${el.textContent.trim().slice(0, 30)}` + (window.__CLASE ? ' .' + el.className + ' < .' + el.parentElement.className : ''));
      }
      return [...new Set(mal)].slice(0, 5);
    });
    if (r.length) fallos[h] = r;
  }
  expect(fallos).toEqual({});
});

test('las pestañas que se deslizan se difuminan por el lado que sigue', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'en el ordenador caben');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  // 0.8.3a: siete pestañas; con Riesgo, la tercera, quedan pestañas a los dos lados
  await page.evaluate(() => { ponerModo('avanzado'); location.hash = 'av-riesgo'; scrollTo(0, 0); });
  await page.waitForTimeout(600);
  const fila = page.locator('.pest-av').first();
  await expect(fila).toHaveAttribute('data-desb', 'i d');
  // al principio, solo a la derecha; al final, solo a la izquierda (marcarDesborde, que es lo que llama el desplazamiento)
  expect(await fila.evaluate((el) => { el.style.scrollBehavior = 'auto'; el.scrollLeft = 0; marcarDesborde(el); return el.getAttribute('data-desb'); })).toBe('d');
  expect(await fila.evaluate((el) => { el.scrollLeft = el.scrollWidth; marcarDesborde(el); return el.getAttribute('data-desb'); })).toBe('i');
});
