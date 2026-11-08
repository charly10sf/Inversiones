// 0.8.3b · Revisión del diseño de la 0.8.3 (8 nov): lo que se arregló en src/css/27-revision-083b.css y alrededores.
// Móvil (390 y 360) y ordenador (1.440, y 1.200 para Tu plan), en Mármol y Marfil.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const conTema = (tema) => base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema) } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const lista = async (page) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); });
  await quitarCapas(page);
};
const ir = async (page, h) => { await page.evaluate((x) => { location.hash = x; scrollTo(0, 0); }, h); await page.waitForTimeout(700); await quitarCapas(page); };
// contraste WCAG entre dos colores CSS (pasados por un canvas, que entiende color-mix y color(srgb …))
const CONTRASTE = `(a, b) => {
  const rgb = (c) => { const x = document.createElement('canvas').getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  const lum = (c) => rgb(c).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05);
}`;

conTema('marfil')('Marfil: el calendario se lee (tipos oscurecidos, la lista sin el estilo de Hoy) y Posiciones cabe', async ({ page }, info) => {
  const pc = info.project.name === 'pc';
  await lista(page);
  await ir(page, 'agenda');
  const cats = await page.evaluate(`(() => { const c = ${CONTRASTE}; const fondo = getComputedStyle(document.documentElement).getPropertyValue('--superficie');
    return [...document.querySelectorAll('.agc-cat')].map((e) => Math.round(c(getComputedStyle(e).color, fondo) * 10) / 10); })()`);
  expect(cats.length).toBeGreaterThan(0);
  for (const r of cats) expect(r).toBeGreaterThanOrEqual(4.5);
  // «Más adelante»: el título a 14,5 px y lo de debajo sin versalitas (el día de «Lo que viene» ya no se cuela)
  const lt = await page.evaluate(() => { const b = document.querySelector('div.ag-dia .ag-tx b'), s = document.querySelector('div.ag-dia .ag-tx small'); return b && [getComputedStyle(b).fontSize, getComputedStyle(s).textTransform]; });
  if (lt) expect(lt).toEqual(['14.5px', 'none']);
  if (!pc) {
    // la cabecera de Posiciones no se sale por la derecha (390 y 360)
    await ir(page, 'posiciones');
    const der = await page.evaluate(() => Math.round(document.querySelector('.pos-cab .preg-ia').getBoundingClientRect().right));
    expect(der).toBeLessThanOrEqual(page.viewportSize().width - 8);
    // Tú: nada más ancho que la pantalla
    await ir(page, 'tu');
    const ancho = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.tu > *')].map((e) => Math.round(e.getBoundingClientRect().right))));
    expect(ancho).toBeLessThanOrEqual(page.viewportSize().width);
  }
});

conTema('marmol')('Mármol: el sello y el buscador en el ordenador; Hoy, Mercados, Día a día y las tablas en el móvil', async ({ page }, info) => {
  const pc = info.project.name === 'pc';
  await lista(page);
  if (pc) {
    // el sello, al centro de la barra de iconos (64 px), no pegado al borde
    const c = await page.evaluate(() => { const r = document.querySelector('.riel .k2-marca > i').getBoundingClientRect(); return r.left + r.width / 2; });
    expect(Math.abs(c - 32)).toBeLessThanOrEqual(2);
    // el buscador: al escribir, un solo recuadro (sin el halo de los campos dentro)
    await page.evaluate(() => document.querySelector('[data-accion="buscar-funciones"]').click());
    await expect(page.locator('.hoja .busca-caja input')).toBeVisible();
    const halo = await page.evaluate(() => { const i = document.querySelector('.hoja .busca-caja input'); i.focus(); return getComputedStyle(i).boxShadow; });
    await page.evaluate(() => document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()));
    expect(halo === 'none' || /0px 0px 0px 0px/.test(halo)).toBe(true);
    // Tu plan en 1.200 px: el panel de la derecha no se sale
    await page.setViewportSize({ width: 1200, height: 800 });
    for (const h of ['proyeccion', 'tu-limites']) {
      await ir(page, h);
      // (lo de dentro de una tabla que se desliza no cuenta: se desliza)
      const r = await page.evaluate(() => Math.round(Math.max(...[...document.querySelectorAll('#tuPanel, #tuPanel > *, #tuPanel .tlm-fila > *, #tuPanel .proy-controles > *')].map((e) => e.getBoundingClientRect().right))));
      expect(r, h).toBeLessThanOrEqual(1200);
    }
    return;
  }
  // Hoy: el aviso del perfil y la fecha ya no se tocan
  const hueco = await page.evaluate(() => { const a = document.querySelector('.car > .pf-recuerda'), f = document.querySelector('.hola-fecha'); return a && f ? f.getBoundingClientRect().top - a.getBoundingClientRect().bottom : null; });
  if (hueco != null) expect(hueco).toBeGreaterThanOrEqual(12);
  // Mercados: El mundo, del mismo ancho que el buscador
  await ir(page, 'mercados');
  const [a, b] = await page.evaluate(() => ['.merc-busca', '.mapa-w'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }));
  expect(b).toEqual(a);
  // Día a día: la cifra y el % de cada casilla caben (sin la flecha ni el € en el móvil)
  await page.evaluate(() => ponerModo('avanzado'));
  await ir(page, 'av-pnl');
  // (lo de dentro de cada casilla no puede ser más ancho que la casilla menos su relleno)
  const cortadas = await page.evaluate(() => [...document.querySelectorAll('.pnl-d:not(.vacio)')].filter((d) => { const cs = getComputedStyle(d); const libre = d.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return [...d.children].some((k) => k.scrollWidth > libre + 0.5); }).length);
  expect(cortadas).toBe(0);
  // X-Ray: la tabla que se desliza se difumina por el lado que sigue
  await ir(page, 'av-reparto');
  await expect(page.locator('.pav-tabla[data-desb~="d"]').first()).toBeAttached();
});

conTema('marmol')('Herramientas: la fecha del último precio, en palabras', async ({ page }, info) => {
  base.skip(info.project.name !== 'movil', 'una vez basta');
  await lista(page);
  await page.evaluate(() => ponerModo('avanzado'));
  await ir(page, 'av-grafico');
  await expect(page.locator('#vista')).not.toContainText(/\b20\d\d-\d\d-\d\d\b/);
});
