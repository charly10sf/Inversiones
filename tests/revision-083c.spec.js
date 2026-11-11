// 0.8.3c · Arreglos que pidió Carlos el 8 nov viendo Herramientas en su ordenador (2560 px): la segunda barra de la K2 se
// ensancha arrastrando su borde (y la IA abierta con ella); la caja de preguntar a la IA ya no se sale por la derecha ni
// enseña una barra de scroll; y las vetas del fondo se dibujan a más resolución (2880 × 1800 en el ordenador, 1170 × 2535
// en el móvil) en vez de estirarse.
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
const tocar = async (page, sel) => { await quitarCapas(page); await page.locator(sel).first().evaluate((e) => e.click()); };
// sin Worker la IA no puede contestar y no sale la caja: se hace como si estuviera lista (como en cabecera-ia.spec.js)
const abrirIA = async (page, sel = '.riel-ia') => {
  await page.evaluate(() => { window.iaLista = () => true; AS.vista = 'chat'; });
  await tocar(page, sel);
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
};
// 0.9: la columna que se ensancha es la de la IA (al lado de la barra de 232 px); su ancho, el que guarda la app
const NAV = 232;
const anchoCol = (page) => page.evaluate(() => Math.round(anchoK2Ahora()));
// arrastra el borde de la segunda barra hasta x (en px de la ventana)
const arrastrar = async (page, x) => {
  const b = await page.locator('#k2Tirador').boundingBox();
  await page.mouse.move(b.x + b.width / 2, 400);
  await page.mouse.down();
  await page.mouse.move(x, 420, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
};
// lo que hace la caja de preguntar: si algo se sale del panel, si el cuadro enseña barra y si va en dos filas
const caja = (page) => page.evaluate(() => {
  const panel = document.querySelector('#asesorFondo .asesor').getBoundingClientRect();
  const fuera = [...document.querySelectorAll('#asesorFondo .as-pie *')].filter((e) => e.getBoundingClientRect().width && e.getBoundingClientRect().right > panel.right + 0.5).map((e) => e.className || e.tagName);
  const ta = document.getElementById('asTexto'), env = document.getElementById('asEnviar');
  return { fuera, barra: ta.scrollHeight > ta.clientHeight + 1 && getComputedStyle(ta).overflowY !== 'hidden', dosFilas: env.getBoundingClientRect().top > ta.getBoundingClientRect().bottom - 1, ejemplo: ta.placeholder };
});

test('ordenador: el borde de la segunda barra se arrastra, la IA crece con ella y el ancho se guarda', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await lista(page);
  await ir(page, 'av-grafico');
  const t = page.locator('#k2Tirador');
  // 0.9: sin la IA abierta no hay nada que ensanchar; el borde sale con ella
  await expect(t).toBeHidden();
  await abrirIA(page);
  await expect(t).toBeVisible();
  await expect(t).toHaveAttribute('role', 'separator');
  expect(await anchoCol(page)).toBe(360);
  // más ancha: la barra, la IA y la página se mueven a la vez
  await arrastrar(page, NAV + 400);
  expect(await anchoCol(page)).toBe(400);
  expect(Math.round((await page.locator('#asesorFondo').boundingBox()).width)).toBe(400);
  await expect.poll(async () => Math.round((await page.locator('#vista').boundingBox()).x)).toBeGreaterThanOrEqual(NAV + 400);
  await expect(t).toHaveAttribute('aria-valuenow', '400');
  expect(await page.evaluate(() => LS.get('inv-k2-ancho'))).toEqual({ n: 400 });
  // la IA sigue pegada a la barra, de arriba abajo
  const ia = await page.locator('#asesorFondo').boundingBox();
  expect([Math.round(ia.x), Math.round(ia.y)]).toEqual([NAV, 0]);
  // no pasa del máximo (560) ni del mínimo (300)
  await arrastrar(page, 1300);
  expect(await anchoCol(page)).toBe(560);
  await arrastrar(page, 100);
  expect(await anchoCol(page)).toBe(300);
  // al soltar encima de la IA no se toca nada de ella (antes salía una de sus sugerencias o la hoja del perfil)
  expect(await page.evaluate(() => [AS.conv.length, document.querySelectorAll('.hoja-fondo').length])).toEqual([0, 0]);
  // con el teclado: las flechas lo mueven de 16 en 16
  await page.evaluate(() => document.querySelectorAll('.hoja-fondo, .tour, .ixn, .intro').forEach((x) => x.remove()));
  await t.press('ArrowRight');
  await expect.poll(() => anchoCol(page)).toBe(316);
  // al volver a abrir la app, sigue igual
  await page.reload();
  await quitarCapas(page);
  await expect(page.locator('.riel.k2')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => anchoCol(page)).toBe(316);
  // doble clic: el de siempre (sin la hoja de la guía que puede salir al volver a abrir)
  await page.evaluate(() => document.querySelectorAll('.hoja-fondo, .tour, .ixn, .intro').forEach((x) => x.remove()));
  await page.evaluate(() => document.querySelector('#k2Tirador').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
  await expect.poll(() => anchoCol(page)).toBe(360);
  expect(await page.evaluate(() => LS.get('inv-k2-ancho'))).toEqual({});
});

test('ordenador: con la IA agrandada se guarda otro ancho', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await lista(page);
  await abrirIA(page);
  await page.locator('[data-as="agrandar"]').click();
  await expect.poll(() => anchoCol(page)).toBe(520);
  // la página se queda siempre con 640 px: a 1.440, la IA agrandada llega como mucho a 568
  await arrastrar(page, NAV + 560);
  expect(await anchoCol(page)).toBe(560);
  expect(Math.round((await page.locator('#asesorFondo').boundingBox()).width)).toBe(560);
  // reducida, vuelve a la suya
  await page.locator('[data-as="agrandar"]').click();
  await expect.poll(() => anchoCol(page)).toBe(360);
  expect(await page.evaluate(() => LS.get('inv-k2-ancho'))).toEqual({ g: 560 });
});

test('ordenador: la caja de preguntar cabe en la IA estrecha y sin barra; ancha, en una fila', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await lista(page);
  await ir(page, 'av-grafico');
  await abrirIA(page);
  // 0.9: la IA abre con 360 px; la más estrecha es de 300 (se arrastra hasta el mínimo)
  await arrastrar(page, 100);
  let c = await caja(page);
  expect(c.fuera).toEqual([]);
  expect(c.barra).toBe(false);
  expect(c.dosFilas).toBe(true);
  // (el texto de ejemplo corto era para la barra de 252 px de antes; con 300, en dos filas, cabe el largo)
  // debajo de «Respuesta» ya no va la línea «Con Haiku: rápida y al grano» (queda al pasar el ratón por cada botón)
  await expect(page.locator('#asModo small')).toHaveCount(0);
  await expect(page.locator('#asModo [data-m="normal"]')).toHaveAttribute('title', 'Con Haiku: rápida y al grano');
  // un texto largo crece hasta 160 px y solo entonces sale la barra
  await page.locator('#asTexto').fill('una pregunta muy larga '.repeat(30));
  await expect.poll(async () => (await caja(page)).barra).toBe(true);
  expect((await page.locator('#asTexto').boundingBox()).height).toBeLessThanOrEqual(161);
  await page.locator('#asTexto').fill('');
  // más ancha, todo en una fila y con el texto de ejemplo entero
  await arrastrar(page, NAV + 480);
  await expect.poll(async () => (await caja(page)).dosFilas).toBe(false);
  c = await caja(page);
  expect(c.fuera).toEqual([]);
  expect(c.ejemplo).toBe('Pregunta lo que quieras de tu cartera');
});

test('móvil: sin borde que arrastrar; la caja de preguntar, en una fila', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'en el móvil');
  await lista(page);
  await expect(page.locator('#k2Tirador')).toBeHidden();
  await abrirIA(page, '[data-accion="asesor"]');
  const c = await caja(page);
  expect(c.fuera).toEqual([]);
  expect(c.barra).toBe(false);
  expect(c.dosFilas).toBe(false);
});

test('las vetas del fondo, a su resolución: 2880 de ancho en el ordenador y 1170 en el móvil', async ({ page }, info) => {
  test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');
  await lista(page);
  const url = await page.evaluate(() => /url\("?([^")]+)"?\)/.exec(getComputedStyle(document.getElementById('acabadoTema')).backgroundImage)[1]);
  const ancho = await page.evaluate((u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i.naturalWidth); i.onerror = () => ok(0); i.src = u; }), url);
  expect(ancho).toBe(info.project.name === 'pc' ? 2880 : 1170);
});

test('la IA que no contesta: al dueño, el motivo técnico junto al fallo; el tope por minuto, dicho claro', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'una vez basta');
  await lista(page);
  await abrirIA(page);
  const pinta = (dueno) => page.evaluate((dueno) => {
    S.esDueno = dueno; S.noDueno = !dueno; LS.set('inv-dueno', dueno ? 1 : 0);
    const e = errorSinIA({ codigo: 'demasiadas', estado: 429 });
    AS.conv = [{ rol: 'yo', texto: 'Explícame «Gráfico técnico» con mi cartera' }, { rol: 'ia', partes: [], citas: [], resultados: [], t: Date.now(), error: e.message, codigo: e.codigo, estadoErr: e.estado }];
    pintarAsesor(true);
    const x = document.querySelector('#asesorFondo .as-error');
    return { txt: x.textContent, cod: (x.querySelector('.as-err-cod') || {}).textContent || '' };
  }, dueno);
  let x = await pinta(true);
  expect(x.txt).toContain('Espera un minuto y vuelve a preguntar');
  expect(x.cod).toBe('[demasiadas · 429]');
  x = await pinta(false);
  expect(x.cod).toBe('');
});
