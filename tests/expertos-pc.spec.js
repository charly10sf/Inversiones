// 0.7i: Expertos en el ordenador. Lo vio Carlos el 30 oct: «está todo a lo ancho», las que GrowIA evitaría no llevaban
// a ninguna parte y, de paso, las tablas «resp» tenían los títulos descuadrados de sus columnas
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

async function abrirIdeas(page) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  // una de las que evitaría, con una empresa del radar que no sea idea (los datos de verdad cambian cada día). Después de
  // que llegue el escaneo, que se pide al rato de abrir: si no, lo pisa
  await page.waitForFunction(() => S.escaneo && S.escaneo.decision && radarVals().length, null, { timeout: 45_000 });
  const sim = await page.evaluate(() => {
    document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove());
    S.acceso = 'privado'; S.expTab = 'ideas';
    S.escaneo = S.escaneo || {}; S.escaneo.decision = S.escaneo.decision || {};
    const ideas = new Set((S.escaneo.decision.ideas || []).map((x) => x.s));
    const r = radarVals().find((x) => !ideas.has(x.s) && x.p);
    S.escaneo.decision.evitar = [{ s: r.s, n: r.n, motivo: 'Motivo de prueba: ha recortado sus previsiones.', fuentes: [] }];
    location.hash = '#expertos'; pintar();
    return r.s;
  });
  await page.waitForSelector('.ideas-top3 .idea');
  return sim;
}

test('en el ordenador: ideas de tres en tres, la abierta en dos columnas y el radar con sus columnas cuadradas', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'pc', 'solo en el ordenador');
  await abrirIdeas(page);
  const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.ideas-top3')).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(3);
  // la idea abierta: «Qué la mueve…» abierto y a la derecha de las cifras
  await page.locator('.ideas-top3 [data-idea-toggle]').first().click();
  const idea = page.locator('.ideas-top3 .idea.abierta');
  await expect(idea.locator('details.mas')).toHaveAttribute('open', '');
  const [cif, mas] = await Promise.all([idea.locator('.idea-cifras4').boundingBox(), idea.locator('details.mas').boundingBox()]);
  expect(mas.x).toBeGreaterThan(cif.x + cif.width - 1);
  expect(mas.y).toBeLessThan(cif.y + cif.height);
  // el radar ocupa todo el ancho y cada título va encima de su columna (antes .resp lo hacía rejilla y se descuadraban)
  const r = await page.evaluate(() => {
    const t = document.querySelector('table.ideas'), th = t.querySelectorAll('thead th'), td = t.querySelectorAll('tbody tr:first-child td');
    return { disp: getComputedStyle(t).display, ancho: t.getBoundingClientRect().width, caja: t.parentElement.getBoundingClientRect().width,
      dif: [...th].map((h, i) => Math.abs(h.getBoundingClientRect().left - td[i].getBoundingClientRect().left)) };
  });
  expect(r.disp).toBe('table');
  expect(r.ancho).toBeGreaterThan(r.caja - 2);
  expect(Math.max(...r.dif)).toBeLessThan(2);
});

test('las que GrowIA evitaría y las filas del radar abren la empresa', async ({ page, errores }) => {
  const sim = await abrirIdeas(page);
  // la tarjeta entera abre la hoja de la empresa, con el motivo de GrowIA
  const ev = page.locator(`.evita[data-consulta="${sim}"]`);
  await ev.locator('header').click();
  const hoja = page.locator('.hoja-fondo .hoja').last();
  await expect(hoja.locator('.cons')).toBeVisible();
  await expect(hoja.locator('.cons-ia.ev')).toContainText('GrowIA la evitaría');
  await expect(hoja.locator('.cons-ia.ev')).toContainText('Motivo de prueba');
  await hoja.locator('[data-cerrar]').first().click();
  await expect(page.locator('.hoja-fondo')).toHaveCount(0);
  // el nombre es un botón (con el teclado también)
  await ev.locator('.ev-n').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.hoja-fondo .cons')).toBeVisible();
  await page.locator('.hoja-fondo [data-cerrar]').first().click();
  // una fila del radar
  await expect(page.locator('.hoja-fondo')).toHaveCount(0);
  await page.locator('table.ideas tbody tr[data-consulta]').first().locator('td').nth(1).click();
  await expect(page.locator('.hoja-fondo .cons')).toBeVisible();
});

test('Tus posiciones: en el ordenador, la prensa al lado; en el móvil, debajo como antes', async ({ page, errores }, info) => {
  test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil normal y el ordenador');
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()); S.acceso = 'privado'; S.expTab = 'posiciones'; location.hash = '#expertos'; pintar(); });
  const pos = page.locator('#hSen'), prensa = page.locator('.exp-lado .num-sec');
  await expect(pos).toBeVisible();
  const [a, b] = await Promise.all([pos.boundingBox(), prensa.boundingBox()]);
  if (info.project.name === 'pc') {
    expect(b.x).toBeGreaterThan(a.x + 400);
    expect(b.y).toBeLessThan(a.y + 400);
  } else {
    expect(b.y).toBeGreaterThan(a.y);
    expect(Math.abs(b.x - a.x)).toBeLessThan(40);
  }
});
