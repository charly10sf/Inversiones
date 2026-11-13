// Hacienda › Tu renta, fase 2, sesión 3 (13 nov 2026): el móvil (una casilla por pantalla, «Todas las casillas» en
// una hoja y deslizar entre casillas), sin Toisón Dorado (lo que pagas arriba, candados y la llamada a Dorado) y, en
// el ordenador, sin los dos botones de arriba (están en el menú). Con la cartera de la maqueta (hzConVentas).
import { test as base, expect } from '@playwright/test';
import { preparar, hzConVentas, hzLista } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

// un gesto con el dedo encima de la casilla: dx a los lados, dy hacia abajo
const deslizar = (page, dx, dy = 0) => page.evaluate(([dx, dy]) => {
  const el = document.querySelector('#hzTit'), y = el.getBoundingClientRect().top + 10, x = 220;
  const t = (cx, cy) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy });
  el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x, y)], changedTouches: [t(x, y)], bubbles: true }));
  el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx, y + dy)], bubbles: true }));
}, [dx, dy]);

test('en el móvil: una casilla por pantalla, todas en una hoja y deslizar para pasar', async ({ page, errores }, info) => {
  test.skip(info.project.name === 'pc', 'solo en el móvil');
  await hzConVentas(page);
  const hz = page.locator('#hz');
  // sin la lista entera: arriba en qué paso vas, y la casilla (el oro, que es la primera por mirar)
  await expect(hz.locator('.hz-lista')).toHaveCount(0);
  await expect(hz.locator('#hzTit')).toHaveText('Oro (ETC)');
  await expect(hz.locator('.hz-mtop')).toContainText('Paso 5 de 11');
  await expect(hz.locator('.hz-mtop')).toContainText('desliza para pasar');
  expect(await hz.locator('.hz-seg.z-m i').evaluateAll((is) => is.findIndex((i) => i.classList.contains('z-aqui')))).toBe(4);
  // el apartado en corto, y Anterior y Siguiente a secas, pegados encima de la barra de abajo
  await expect(hz.locator('.hz-panel .hz-ey')).toHaveText('Capital mobiliario · casilla 0031');
  await expect(hz.locator('.hz-panel-pie .btn')).toHaveText(['Anterior', 'Siguiente']);
  await expect(hz.locator('.hz-panel-pie .btn.pri')).toHaveAttribute('aria-label', 'Siguiente: Ventas de acciones');
  expect(await hz.locator('.hz-panel-pie').evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
  // nada se sale por los lados
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  // deslizar a la izquierda: la siguiente (salta lo que no te toca); a la derecha, la de antes
  await deslizar(page, -120);
  await expect(hz.locator('#hzTit')).toHaveText('Ventas de acciones');
  await expect(hz.locator('.hz-mtop')).toContainText('Paso 6 de 11');
  await deslizar(page, 120);
  await expect(hz.locator('#hzTit')).toHaveText('Oro (ETC)');
  // un gesto corto o casi vertical no cambia de casilla (es para bajar)
  await deslizar(page, -40);
  await deslizar(page, -80, 90);
  await expect(hz.locator('#hzTit')).toHaveText('Oro (ETC)');

  // «Todas las casillas»: la tira y la lista, con los filtros; al tocar una se cierra y se abre esa
  const lista = await hzLista(page);
  await expect(lista.locator('.hz-tira.z-enhoja')).toContainText('falta 1 dato');
  await expect(lista.locator('.hz-paso.z-on')).toContainText('Oro (ETC)');
  await lista.locator('.hz-filtro [data-f="mira"]').click();
  await expect(lista.locator('button.hz-paso')).toHaveText([/Oro \(ETC\)/, /Ventas de acciones/]);
  await lista.locator('button.hz-paso', { hasText: 'Ventas de acciones' }).click();
  await expect(page.locator('#hzTodas')).toHaveCount(0);
  await expect(hz.locator('#hzTit')).toHaveText('Ventas de acciones');
  // y «Paso X de Y» queda a la vista, debajo de «Tu renta / Cómo tributa», que en el móvil se queda pegado arriba
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ paso: document.querySelector('#hz .hz-mtop').getBoundingClientRect().top, tabs: document.querySelector('#fisTabs').getBoundingClientRect().bottom }));
  expect(r.paso).toBeGreaterThanOrEqual(r.tabs - 1);
  expect(r.paso).toBeLessThan(400);
});

test('sin Toisón Dorado: lo que pagas arriba, tus datos abiertos y lo demás con candado', async ({ page, errores }, info) => {
  await hzConVentas(page, { dorado: false });
  const hz = page.locator('#hz'), pc = info.project.name === 'pc';
  // arriba, lo de todos: 134 − 54 = 80 € a pagar por tus inversiones; sin la tira de casillas
  await expect(page.locator('#hzGratis')).toContainText('80');
  await expect(hz.locator('.hz-tira')).toHaveCount(0);
  // abierta, la primera: tus datos y tus informes, aunque hubieras dejado otra
  await expect(hz.locator('#hzTit')).toHaveText('Tus datos y tus informes');
  await expect(hz.locator('.hz-panel')).toContainText('Los informes de tus brókeres');
  await expect(hz.locator('.hz-recuerda')).toHaveCount(0);
  if (pc) {
    // la lista: sin filtros ni cifras, las casillas con candado y lo que no te toca, en gris
    const lista = hz.locator('.hz-lista');
    await expect(lista.locator('.hz-filtro')).toHaveCount(0);
    await expect(lista.locator('[data-hz="ir"]')).toHaveCount(1);
    await expect(lista.locator('.hz-paso.z-cerrado', { hasText: 'Ventas de acciones' })).toHaveCount(1);
    await expect(lista.locator('.hz-paso em')).toHaveCount(0);
    await expect(lista.locator('.hz-paso.z-gris', { hasText: 'Fondos de inversión' })).toHaveCount(1);
    await lista.locator('.hz-paso.z-cerrado', { hasText: 'Monedas virtuales' }).click();
  } else {
    await expect(hz.locator('.hz-mtop')).toContainText('Paso 1 de 11');
    await expect(hz.locator('.hz-mtop')).not.toContainText('desliza');
    await expect(hz.locator('.hz-seg.z-m i.z-cerrado')).toHaveCount(10);
    // deslizar tampoco pasa: sale lo de Dorado
    await deslizar(page, -120);
  }
  await expect(page.locator('.hoja-fondo .et-dorado-g')).toBeVisible();
  await expect(page.locator('.hoja-fondo')).toContainText('Será parte de Toisón Dorado, el plan de pago');
  await page.keyboard.press('Escape');
  await expect(hz.locator('#hzTit')).toHaveText('Tus datos y tus informes');
  // Siguiente lleva candado y abre lo mismo
  await expect(hz.locator('.hz-panel-pie .btn.z-cerrado')).toHaveAttribute('aria-label', 'Siguiente: Tu sueldo, con Toisón Dorado');
  await hz.locator('.hz-panel-pie .btn.z-cerrado').click();
  await expect(page.locator('.hoja-fondo .et-dorado-g')).toBeVisible();
  await page.keyboard.press('Escape');
  // la tarjeta de Dorado y el enlace a lo de todos, que lleva a Cómo tributa y calendario
  await expect(hz.locator('.hz-cta')).toContainText('El resto, casilla a casilla, con tus cifras');
  await hz.locator('.hz-lect').click();
  await expect(page.locator('#panelHz[data-hz-pag="tu"] #hzGratis')).toBeVisible();
  await expect(page.locator('#vista')).toContainText('Calendario fiscal');
});

test('en el ordenador, «Tu renta» y «Cómo tributa» van en el menú, no arriba de la página', async ({ page, errores }, info) => {
  await hzConVentas(page);
  if (info.project.name === 'pc') {
    await expect(page.locator('#fisTabs')).toBeHidden();
    await expect(page.locator('.k2-lista a', { hasText: 'Cómo tributa y calendario' })).toBeVisible();
    await page.locator('.k2-lista a', { hasText: 'Cómo tributa y calendario' }).click();
    await expect(page.locator('#panelHz[data-hz-pag="tu"]')).toBeVisible();
  } else {
    await expect(page.locator('#fisTabs')).toBeVisible();
    await page.locator('#fisTabs [data-fis="tu"]').click();
    await expect(page.locator('#panelHz[data-hz-pag="tu"]')).toBeVisible();
  }
});

// en inglés: lo de Tu renta sale traducido (en.json, y L() donde van nombres o fechas dentro)
base('Tu renta en inglés, en el móvil y en el ordenador', async ({ context, page }, info) => {
  const errores = await preparar(context, { idioma: 'en' });
  await hzConVentas(page);
  const hz = page.locator('#hz'), pc = info.project.name === 'pc';
  await expect(hz.locator('#hzTit')).toHaveText('Gold (ETC)');
  await expect(hz.locator('.hz-falta')).toContainText('Did MyInvestor withhold anything when you sold?');
  await expect(hz.locator('.hz-panel .hz-ey')).toHaveText(/^Investment income · box 0031$/i);
  const lista = await hzLista(page);
  await expect(lista).toContainText('Capital gains and losses');
  await expect(pc ? hz.locator('.hz-tira') : lista).toContainText(/\d of \d boxes ready/);
  if (pc) await expect(hz.locator('.hz-panel-pie .btn.pri')).toHaveText('Next: Sales of stocks');
  else {
    await expect(page.locator('.hoja-fondo h2')).toHaveText('Your tax return, in Renta Web’s order');
    await expect(hz.locator('.hz-mtop')).toContainText('Step 5 of 11');
    await page.keyboard.press('Escape');
    await expect(hz.locator('.hz-panel-pie .btn')).toHaveText(['Previous', 'Next']);
  }
  // nada de lo de siempre en español
  const t = await page.locator('#panelHz').innerText() + (pc ? await page.locator('.hz-lista').innerText() : '');
  expect(t).not.toMatch(/casilla|Lo trae el borrador|Siguiente|Anterior|Falta un dato|Venta a venta|Lo tuyo|¿Qué pone tu borrador\?/);
  expect(errores).toEqual([]);
});
