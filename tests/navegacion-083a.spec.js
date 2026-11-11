// 0.8.3a · La navegación nueva. En el móvil, la A: Análisis · Mercados · Hoy · Ideas · Más, y Más abre una hoja con el
// buscador, Lo tuyo, tus fijados y todas las funciones por grupos. En el ordenador, la K2: iconos con las 10 secciones,
// una segunda barra con las páginas arriba y la IA abajo (se agranda a 440 px), y arriba el buscador (Ctrl K), los
// fijados, Escritorios, los avisos y tu cuenta. Las direcciones de siempre siguen valiendo y las pestañas del trozo tienen
// la suya (#av-rentab…).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'inv-modo': JSON.stringify('avanzado'), 'inv-empezar-no': 'true', 'inv-empezar-fin': 'true' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const ir = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(400); };
const lista = async (page) => { await crearCuenta(page); await meterCartera(page); await quitarCapas(page); await ir(page, 'cartera'); await quitarCapas(page); };
// con la máquina cargada, una hoja de la guía puede salir encima a mitad: se quita antes de tocar y se toca con un clic de la página
const tocar = async (page, sel) => { await quitarCapas(page); await page.locator(sel).first().evaluate((e) => e.click()); };
const barra = (page) => page.evaluate(() => [...document.querySelectorAll('.navbar a')].map((a) => `${a.innerText.trim()}${a.getAttribute('aria-current') === 'page' ? '*' : ''}`).join(','));

test('móvil: Más en el sitio de Tú abre la hoja con el buscador, Lo tuyo, los fijados y los grupos', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'en el ordenador va la K2');
  await lista(page);
  expect(await barra(page)).toBe('Análisis,Mercados,Hoy*,Ideas,Más');
  await tocar(page, '.navbar [data-mas]');
  const h = page.locator('.hoja-mas');
  await expect(h).toBeVisible();
  // no se ha ido a Tú: la hoja se abre encima de Hoy
  expect(await page.evaluate(() => S.vista)).toBe('cartera');
  await expect(h.locator('.mas-g')).toHaveText(['Lo tuyo', 'Tus fijados', 'Tu cartera', 'Riesgo y rentabilidad', 'Hacienda', 'Mercados e ideas', 'Herramientas', 'La app']);
  await expect(h.locator('.mas-tuyo a')).toHaveText(['Tu cuenta', 'Objetivos', /Paso a paso|Tu plan/]);
  // el buscador: escribe y salen las páginas; la primera se abre con Intro
  await h.locator('.busca-fun').fill('divid');
  await expect(h.locator('.busca-res .busca-it').first()).toContainText('Dividendos');
  await expect(h.locator('.mas-cuerpo')).toBeHidden();
  await h.locator('.busca-fun').press('Enter');
  await expect(page.locator('.hoja-mas')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => [S.vista, pestAv(), location.hash].join())).toBe('av,div,#av-div');
  // Ingresos y costes: la pestaña marcada y sus dos apartados
  await expect(page.locator('.pest-av a[aria-current="page"]')).toHaveText('Ingresos y costes');
  await expect(page.locator('.apartados a')).toHaveText(['Dividendos', 'Costes']);
  // «Atrás» vuelve a donde estabas
  await page.goBack();
  await expect.poll(() => page.evaluate(() => S.vista)).toBe('cartera');
});

test('móvil: los fijados salen en Más y en Hoy; Tú y Herramientas vuelven a Más', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await lista(page);
  await expect(page.locator('#vista .fijados-hoy')).toHaveCount(0);
  await tocar(page, '.navbar [data-mas]');
  await page.locator('.hoja-mas [data-fijar="riesgo"]').click();
  await expect(page.locator('.hoja-mas [data-fijar="riesgo"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hoja-mas .mas-fij .chip-fij')).toHaveText('Riesgo');
  await page.keyboard.press('Escape');
  await expect(page.locator('#vista .fijados-hoy .chip-fij')).toHaveText('Riesgo');
  await tocar(page, '#vista .fijados-hoy .chip-fij');
  await expect.poll(() => page.evaluate(() => [S.vista, pestAv()].join())).toBe('av,riesgo');
  expect(await page.evaluate(() => LS.get('inv-fijados'))).toEqual(['riesgo']);
  // en Tú y en Herramientas, la barra marca Más y arriba está «‹ Más»
  await ir(page, 'objetivos');
  expect(await barra(page)).toBe('Análisis,Mercados,Hoy,Ideas,Más*');
  await ir(page, 'av-lab');
  expect(await barra(page)).toBe('Análisis,Mercados,Hoy,Ideas,Más*');
  await expect(page.locator('#vista .ts-tit')).toHaveText('Herramientas');
  await expect(page.locator('#vista .apartados a')).toHaveText(['Gráfico técnico', 'Laboratorio']);
  await tocar(page, '#vista .volver-mas');
  await expect(page.locator('.hoja-mas')).toBeVisible();
});

test('básico: lo del avanzado no sale en la rejilla y el buscador dice «está en el avanzado: verlo»', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await lista(page);
  await page.evaluate(() => ponerModo('basico'));
  await tocar(page, '.navbar [data-mas]');
  await expect(page.locator('.hoja-mas .mas-rejilla a', { hasText: 'Laboratorio' })).toHaveCount(0);
  await expect(page.locator('.hoja-mas .mas-g', { hasText: 'Herramientas' })).toHaveCount(0);
  await page.locator('.hoja-mas .busca-fun').fill('labor');
  await expect(page.locator('.hoja-mas [data-ver-av="lab"]')).toContainText('Está en el avanzado');
  await page.locator('.hoja-mas [data-ver-av="lab"]').click();
  await expect.poll(() => page.evaluate(() => [modoApp(), S.vista, pestAv()].join())).toBe('avanzado,av,lab');
});

test('ordenador: diez secciones a la izquierda y las páginas de la abierta al lado', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await lista(page);
  await expect(page.locator('.k2-iconos [data-sec]')).toHaveCount(10);
  expect(await page.locator('.k2-iconos [data-sec]').evaluateAll((as) => as.map((a) => a.title))).toEqual(['Hoy', 'Cartera', 'Rendimiento', 'Riesgo', 'Reparto', 'Hacienda', 'Mercados', 'Ideas', 'Tu plan', 'Herramientas']);
  // 0.9 (rediseño): una sola barra de 232 px con los nombres a la vista; la página empieza justo después
  const b1 = await page.locator('.riel.k2').boundingBox();
  expect(Math.round(b1.width)).toBe(232);
  await expect(page.locator('.k2-iconos [data-sec="rendimiento"] .k2-nom')).toBeVisible();
  expect(Math.round((await page.locator('#vista').boundingBox()).x)).toBeGreaterThanOrEqual(232);
  expect(Math.round((await page.locator('#vista').boundingBox()).x)).toBeLessThan(300);
  // Rendimiento: sus páginas, y al tocar una se marca y se abre
  await tocar(page, '.k2-iconos [data-sec="rendimiento"]');
  await expect(page.locator('.k2-tit')).toHaveText('Rendimiento');
  await expect(page.locator('.k2-lista a')).toHaveText(['Rentabilidad', 'Frente a un indexado', 'Dividendos', 'Costes', 'La IA explica']); // 0.8.6: la pestaña 2
  await quitarCapas(page); await page.locator('.k2-lista a', { hasText: 'Costes' }).evaluate((e) => e.click());
  await expect(page.locator('.k2-lista a[aria-current="page"]')).toHaveText('Costes');
  await expect(page.locator('.k2-iconos [data-sec="rendimiento"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#panelAv')).toContainText('Lo que pagas', { timeout: 15_000 });
  // en el ordenador no se repiten las pestañas del móvil, y el título es el de la sección
  await expect(page.locator('#vista .pest-av')).toBeHidden();
  // las direcciones de siempre caen en su sección
  await ir(page, 'renta');
  await expect(page.locator('.k2-tit')).toHaveText('Hacienda');
  await expect(page.locator('.k2-lista a[aria-current="page"]')).toHaveText('Guía de la renta');
  await ir(page, 'objetivos');
  await expect(page.locator('.k2-iconos [data-sec="tuplan"]')).toHaveAttribute('aria-current', 'page');
  // 0.9: en básico, Herramientas no sale en la barra (antes salía vacía con «Está en el modo avanzado»)
  await page.evaluate(() => ponerModo('basico'));
  await expect(page.locator('.k2-iconos [data-sec="herramientas"]')).toBeHidden();
  await expect(page.locator('.k2-iconos [data-sec]:visible')).toHaveCount(9);
  // las páginas de la sección abierta cuelgan de ella, dentro de la misma barra
  await page.evaluate(() => ponerModo('avanzado'));
  await ir(page, 'av-riesgo');
  expect(await page.evaluate(() => document.querySelector('#k2Pags').previousElementSibling.dataset.sec)).toBe('riesgo');
  // plegada (su botón o la tecla «[»): un riel de 72 px y las páginas suben a pestañas; se guarda
  await ir(page, 'posiciones');
  await page.locator('[data-k2-plegar]').click();
  await expect.poll(async () => Math.round((await page.locator('.riel.k2').boundingBox()).width)).toBe(72);
  await expect(page.locator('#vista .k2-pest a')).toHaveText(['Posiciones', 'Movimientos', 'Día a día']);
  await expect(page.locator('.k2-iconos [data-sec="cartera"]')).toHaveAccessibleName('Cartera');
  expect(await page.evaluate(() => LS.get('inv-k2-plegada'))).toBe(true);
  await page.keyboard.press('[');
  await expect.poll(async () => Math.round((await page.locator('.riel.k2').boundingBox()).width)).toBe(232);
  await expect(page.locator('#vista .k2-pest')).toBeHidden();
});

test('ordenador: la IA se agranda a toda la barra y las páginas suben a pestañas', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await lista(page);
  await ir(page, 'posiciones');
  await tocar(page, '.riel-ia');
  await expect(page.locator('#asesorFondo .asesor')).toBeVisible({ timeout: 10_000 });
  // 0.9: la IA abierta es una columna entera al lado de la barra (de 232 a 592 px), de arriba abajo
  const ia = await page.locator('#asesorFondo').boundingBox();
  expect([Math.round(ia.x), Math.round(ia.y), Math.round(ia.width)]).toEqual([232, 0, 360]);
  // ningún texto se sale de ella
  expect(await page.evaluate(() => [...document.querySelectorAll('#asesorFondo .as-cuerpo *')].every((e) => e.getBoundingClientRect().right <= 593))).toBe(true);
  await expect(page.locator('#vista .k2-pest')).toBeHidden();
  await page.locator('[data-as="agrandar"]').click();
  expect(await page.evaluate(() => document.body.classList.contains('ia-grande'))).toBe(true);
  const g = await page.locator('#asesorFondo').boundingBox();
  expect(Math.round(g.width)).toBe(520); expect(Math.round(g.y)).toBe(0);
  await expect(page.locator('#vista .k2-pest a')).toHaveText(['Posiciones', 'Movimientos', 'Día a día']);
  await expect.poll(async () => (await page.locator('#vista').boundingBox()).x).toBeGreaterThanOrEqual(752);
  // al cerrarla, todo vuelve
  await page.locator('[data-as="cerrar"]').click();
  expect(await page.evaluate(() => document.body.classList.contains('ia-grande'))).toBe(false);
  await expect(page.locator('#vista .k2-pest')).toBeHidden();
});

test('ordenador: Ctrl K abre el buscador; arriba, fijados, Escritorios, avisos y cuenta', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await lista(page);
  await expect(page.locator('.k2-top .k2-busca')).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.locator('.hoja-busca .busca-fun')).toBeFocused();
  await page.keyboard.type('volatil');
  await expect(page.locator('.hoja-busca .busca-it').first()).toContainText('Riesgo');
  await page.locator('.hoja-busca [data-fijar="riesgo"]').click();
  await page.locator('.hoja-busca .busca-fun').press('Enter');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#av-riesgo');
  // la estrella: tus fijados y lo reciente
  await tocar(page, '.k2-top [data-accion="fijados"]');
  await expect(page.locator('.hoja-fij .mas-fij').first()).toContainText('Riesgo');
  await page.keyboard.press('Escape');
  // Escritorios es de Toisón Dorado (aún no está)
  await expect(page.locator('.k2-escr .et-dorado')).toHaveText('Dorado');
  await tocar(page, '.k2-escr');
  await expect(page.locator('.hoja-escr')).toContainText('Toisón Dorado');
  await page.keyboard.press('Escape');
  // los avisos abren Ajustes por los avisos; la cuenta lleva a Tú
  await tocar(page, '.k2-top [data-accion="avisos"]');
  await expect(page.locator('.hoja-fondo [data-av="on"]')).toBeAttached();
  await page.keyboard.press('Escape');
  await tocar(page, '.k2-cuenta');
  await expect.poll(() => page.evaluate(() => S.vista)).toBe('tu');
});

// 8 nov (Carlos): arriba a la izquierda salían dos símbolos seguidos (la marca y Hoy). Ahora, una sola marca como en el
// móvil, el sello con TOISÓN al lado y más grande, a la altura de la barra de arriba; Hoy lleva una casa
test('ordenador: una sola marca arriba, el sello con TOISÓN al lado, y Hoy con su icono', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await lista(page);
  // (el sello de Toisón Dorado está escondido: 26-dorado.css)
  await expect(page.locator('.riel svg path.s-o:visible')).toHaveCount(1);
  await expect(page.locator('.k2-iconos [data-sec="hoy"] svg.ic-pl')).toHaveCount(1);
  const sello = await page.locator('.k2-marca i:visible').boundingBox(), nombre = await page.locator('.k2-marca-tx b').boundingBox(), arriba = await page.locator('.k2-top').boundingBox();
  await expect(page.locator('.k2-marca-tx b')).toHaveText('TOISÓN');
  // en la misma fila que la barra de arriba, el nombre a la derecha del sello y más grande que en el móvil (17 px)
  expect(Math.abs((sello.y + sello.height / 2) - (nombre.y + nombre.height / 2))).toBeLessThan(4);
  expect(Math.abs((sello.y + sello.height / 2) - (arriba.y + arriba.height / 2))).toBeLessThan(4);
  expect(nombre.x).toBeGreaterThan(sello.x + sello.width);
  expect(await page.locator('.k2-marca-tx b').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThan(17);
});
