// 0.8.6 · Pestaña 11, «Entiende tu cartera»: las pantallas y la progresión (sesión 6 del plan), según la maqueta 11X
// aprobada el 8 nov. Solo en básico. Ordenador: la tira baja, el índice estrecho y la lección grande (17 px). Móvil: la
// tira, el índice y la lección en su pantalla con volver. Progresión sobria, guardada con la cartera cifrada.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, tocar } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function abrir(page) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async () => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); ponerModo('basico'); location.hash = 'av-entiende'; });
  await expect(page.locator('#panelAv[data-p="entiende"]:not([aria-busy]) .ent-tira')).toBeVisible({ timeout: 20_000 });
  await quitarCapas(page);
}
const SIN_CELEBRAR = /\b(racha|medalla|enhorabuena|felicidades|¡bien|trofeo|nivel \d)\b/i;

test('en Cartera, junto a Posiciones, y solo en básico', async ({ page }, info) => {
  await abrir(page);
  if (info.project.name === 'pc') await expect(page.locator('.k2-lista a')).toHaveText(['Posiciones', 'Entiende tu cartera', 'Movimientos']);
  else {
    expect((await page.locator('.pest-av a').allTextContents()).slice(0, 3)).toEqual(['Posiciones', 'Entiende tu cartera', 'Rentabilidad']);
    await expect(page.locator('.pest-av a[aria-current="page"]')).toHaveText('Entiende tu cartera');
  }
  await page.evaluate(() => ponerModo('avanzado'));
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => paginasDe('cartera').map((p) => p.id))).not.toContain('entiende');
  expect(await page.locator('.pest-av a, .k2-lista a').allTextContents()).not.toContain('Entiende tu cartera');
});

test('ordenador: la tira de una línea, el índice estrecho y la lección grande con letra de 17 px', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'la forma del ordenador');
  await abrir(page);
  const panel = page.locator('#panelAv');
  // la tira, baja: «Para ti ahora» y el avance en una línea
  const tira = await panel.locator('.ent-tira-s').boundingBox();
  expect(tira.height).toBeLessThan(130);
  await expect(panel.locator('.ent-tira-a')).toContainText('0 de 20');
  // el índice (c3) a la izquierda y la lección (c9) a la derecha, en la misma fila
  const [ix, lec] = await Promise.all([panel.locator('.pav-c3').boundingBox(), panel.locator('.pav-c9').boundingBox()]);
  expect(lec.x).toBeGreaterThan(ix.x + ix.width - 2);
  expect(Math.abs(lec.y - ix.y)).toBeLessThan(4);
  expect(lec.width).toBeGreaterThan(ix.width * 2.5);
  expect(await panel.locator('.ent-pag > p').first().evaluate((p) => getComputedStyle(p).fontSize)).toBe('17px');
  // la que se abre es la de «Para ti ahora»
  const para = await page.evaluate(() => entiendeParaTi(calcular()).t);
  await expect(panel.locator('.ent-pag h3')).toHaveText(para);
  // «Con tus números» en una fila
  const tops = await panel.locator('.ent-tus .pav-kpi').evaluateAll((xs) => xs.map((x) => Math.round(x.getBoundingClientRect().top)));
  if (tops.length) expect(new Set(tops).size).toBe(1);
  // cinco capítulos; uno abierto con sus lecciones
  await expect(panel.locator('.ent-ixf')).toHaveCount(5);
  await expect(panel.locator('.ent-ixf[aria-expanded="true"]')).toHaveCount(1);
  expect(await panel.innerText()).not.toMatch(SIN_CELEBRAR);
});

test('la progresión: «Ya la he leído», la siguiente, el avance por capítulo y en total; se guarda cifrada y vuelve al recargar', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'basta con el ordenador (el móvil, en la siguiente)');
  await abrir(page);
  const panel = page.locator('#panelAv');
  // abrir la primera del capítulo I desde el índice
  await tocar(page, '#panelAv [data-ent-cap="tienes"]');
  await tocar(page, '#panelAv .ent-sub[data-ent-abrir="indexado"]');
  await expect(panel.locator('.ent-pag')).toHaveAttribute('data-leccion', 'indexado');
  await tocar(page, '#panelAv [data-ent-leida="1"]');
  await expect(panel.locator('.ent-pag .ent-leida')).toBeVisible();
  await expect(panel.locator('.ent-tira-a')).toContainText('1 de 20');
  await expect(panel.locator('.ent-ixf[data-ent-cap="tienes"] em')).toHaveText('1 / 3');
  // «Siguiente» pasa a la siguiente y da por leída la de ahora (ya lo estaba: sigue en 1)
  await tocar(page, '#panelAv [data-ent-sig]');
  await expect(panel.locator('.ent-pag')).toHaveAttribute('data-leccion', 'etc');
  await tocar(page, '#panelAv [data-ent-sig]');
  await expect(panel.locator('.ent-pag')).toHaveAttribute('data-leccion', 'acciones');
  await expect(panel.locator('.ent-tira-a')).toContainText('2 de 20');
  // con algo leído y «Para ti ahora» en otra, el enlace «Sigue donde lo dejaste» lleva a la siguiente sin leer
  const sigue = panel.locator('.ent-tira-a a');
  if (await sigue.count()) await expect(sigue).toHaveAttribute('data-ent-abrir', await page.evaluate(() => entiendeSigue()));
  await expect(panel.locator('.ent-pag-av')).toContainText('2 de 3 leídas en este capítulo');
  // se puede desmarcar
  await tocar(page, '#panelAv [data-ent-leida="1"]');
  await expect(panel.locator('.ent-ixf[data-ent-cap="tienes"]')).toHaveClass(/lleno/);
  await tocar(page, '#panelAv [data-ent-leida="0"]');
  await expect(panel.locator('.ent-ixf[data-ent-cap="tienes"] em')).toHaveText('2 / 3');
  // va dentro de la cartera (cifrada), no en el navegador suelto
  const [enCartera, enLS] = await page.evaluate(() => [Object.keys(S.cartera.entiende.leidas).sort(), Object.keys(localStorage).filter((k) => /entiende|leidas/i.test(k))]);
  expect(enCartera).toEqual(['etc', 'indexado']);
  expect(enLS).toEqual([]);
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForFunction(() => { try { return S.M && S.M.filas.length > 0; } catch (e) { return false; } }, null, { timeout: 30_000 });
  expect(await page.evaluate(() => Object.keys((S.cartera.entiende || {}).leidas || {}).sort())).toEqual(['etc', 'indexado']);
});

test('móvil: la tira, los capítulos y la lección en su pantalla con volver y la letra grande', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'la forma del móvil');
  await abrir(page);
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.pab-cab')).toHaveText(['Capítulos']);
  await expect(panel.locator('.ent-ixf small').first()).toBeVisible();
  // una lección abre su pantalla, sin el índice
  await tocar(page, '#panelAv [data-ent-cap="cuesta"]');
  await tocar(page, '#panelAv .ent-sub[data-ent-abrir="ter"]');
  await expect(panel.locator('.ent-pag')).toHaveAttribute('data-leccion', 'ter');
  await expect(panel.locator('.ent-ix')).toHaveCount(0);
  expect(await panel.locator('.ent-pag > p').first().evaluate((p) => getComputedStyle(p).fontSize)).toBe('17px');
  await tocar(page, '#panelAv [data-ent-leida="1"]');
  await expect(panel.locator('.ent-pag .ent-leida')).toBeVisible();
  // volver, al índice, con el capítulo marcado
  await tocar(page, '#panelAv .ent-volver');
  await expect(panel.locator('.ent-ix')).toBeVisible();
  await expect(panel.locator('.ent-ixf[data-ent-cap="cuesta"] em')).toHaveText('1 / 3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await panel.innerText()).not.toMatch(SIN_CELEBRAR);
});
