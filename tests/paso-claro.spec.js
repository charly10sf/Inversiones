// 16 nov · El Paso a paso «todo comido» (claude/encargo-paso-a-paso-claro.md), solo en el modo fundador: vender con pérdidas
// con la cantidad, los pasos numerados, el día límite y desde cuándo se puede recomprar; el mismo molde en cada tarjeta (qué
// hago, dónde, cuándo y qué pasa después); las opciones aparte con «¿Lo hago o no?»; la confianza en palabras y las fechas
// con qué hacer ese día. En el modo estándar no hay Paso a paso.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

// fundador con la cartera de prueba; IAG en pérdidas (la acción), además del fondo de renta fija y el bitcoin
async function fundador(page) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async () => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false;
    S.acceso = 'privado';
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_empresa: 5, reparto_fondos: { 'ishares-us': 30, 'amundi-europe': 40 } };
    S.cartera.posiciones.find((x) => x.instrumento === 'iag').coste = 4200;
    await guardarCarteraCallada('prueba');
    S.M = calcular(); pintar();
  });
  await page.waitForFunction(() => typeof window.PASO_MES === 'function', null, { timeout: 20_000 });
  await page.evaluate(() => { cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); pintar(); });
  await page.waitForTimeout(300); await quitarCapas(page);
}
async function abrirPaso(page) {
  await page.evaluate(() => { location.hash = 'ruta'; });
  await expect(page.locator('#panelPaso .pp-mes').first()).toBeVisible({ timeout: 20_000 });
}
const perdida = (page, id) => page.evaluate((id) => { const P = pasosRuta0(S.M); const x = [...P.mes, ...P.seis].find((y) => y.id.startsWith('perdida:' + id + ':')); return x && { t: x.t.replace(/<[^>]+>/g, ''), pasos: x.pasos.map((p) => p.replace(/<[^>]+>/g, '')), imp: x.imp, lim: x.lim, libre: x.recompra, cuando: x.cuando, uds: x.uds, hoy: hoyIso(), librePrev: libreRecompra(S.inst[x.ref.f.inst.id], hoyIso()) }; }, id);

test('vender con pérdidas: cantidad, pasos numerados, día límite, recompra con fecha y lo que cambia en la renta', async ({ page }) => {
  test.skip(new Date().getMonth() < 6, 'de enero a junio el Paso a paso no propone vender con pérdidas');
  await fundador(page);
  // la acción (IAG, cotiza en Madrid): acciones, orden limitada, horario de la bolsa, dos meses
  const a = await perdida(page, 'p8');
  expect(a.t).toMatch(/^Vender tus 652,53 acciones de IAG \(unos [\d.]+\s€\)$/);
  expect(a.pasos).toHaveLength(5);
  expect(a.pasos[1]).toContain('orden limitada');
  expect(a.pasos[2]).toContain('9:00 a 17:30');
  expect(a.lim >= a.hoy && a.lim <= `${a.hoy.slice(0, 4)}-12-23`).toBe(true);
  expect(new Date(a.lim + 'T12:00').getDay() % 6).not.toBe(0);                    // un día de bolsa
  expect(a.libre).toBe(a.librePrev);                                              // la fecha concreta de recompra
  expect(a.pasos[4]).toMatch(/hasta el \d+ \w+ \d{4}/);
  expect(a.imp).toMatch(/baja de [\d.]+\s€ a [\d.]+\s€: [\d.]+\s€ menos/);
  // el fondo: reembolso, no traspaso; un año para recomprar
  const f = await perdida(page, 'p4');
  expect(f.t).toContain('participaciones de Renta fija corto plazo');
  expect(f.pasos[0]).toContain('reembolso'); expect(f.pasos[0]).toContain('traspaso');
  expect(f.libre.slice(0, 4)).toBe(String(+f.hoy.slice(0, 4) + 1));
  // la cripto: unidades, no cierra, sin regla de los dos meses
  const c = await perdida(page, 'p9');
  expect(c.t).toContain('unidades de Bitcoin');
  expect(c.pasos[2]).toContain('no cierra');
  expect(c.pasos[4]).toContain('no se aplica la regla de los dos meses');
  // en la página: la tarjeta con su molde y, al abrirla, los cinco pasos a la vista
  await abrirPaso(page);
  const li = page.locator('.tarea.pp-paso[data-id^="perdida:p8:"]');
  await expect(li.locator('.pp-molde')).toContainText('Trade Republic');
  await expect(li.locator('.pp-molde')).toContainText('hasta el');
  await li.locator('.pp-fila').click();
  await expect(li.locator('.t-pasos li')).toHaveCount(5);
  await expect(li.locator('.t-imp')).toContainText('Qué cambia en la renta');
});

test('vender con pérdidas el resto de una posición: la cantidad es lo que queda tras la venta que ya propone', async ({ page }) => {
  test.skip(new Date().getMonth() < 6, 'de enero a junio el Paso a paso no propone vender con pérdidas');
  await fundador(page);
  const r = await page.evaluate(() => {
    const planes = S.M.filas.map((f) => planVenta(f, S.M)).filter(Boolean);
    const pl = planes[0]; const f = pl.f;
    const x = restoEnPerdidas(S.M, planes).find((y) => y.f.pos.id === f.pos.id);
    return { queda: +pl.queda, sinPlan: restoEnPerdidas(S.M, []).find((y) => y.f.inst.id === 'iag'), x: x && { uds: x.uds, resto: x.resto } };
  });
  expect(r.sinPlan.uds).toBeCloseTo(652.53, 2);
  if (r.x) { expect(r.x.resto).toBe(true); expect(r.x.uds).toBeCloseTo(r.queda, 6); }
});

test('el mismo molde en cada tarjeta de «Haz esto»: dónde, cuándo con su día y qué pasa después; la venta, en pasos', async ({ page }) => {
  await fundador(page); await abrirPaso(page);
  const tarjetas = page.locator('.pp-rcol ol.tareas > .tarea.pp-paso');
  const n = await tarjetas.count();
  expect(n).toBeGreaterThan(2);
  for (let i = 0; i < n; i++) await expect(tarjetas.nth(i).locator('.pp-molde .pp-mk').filter({ hasText: 'Cuándo' })).toHaveCount(1);
  const venta = page.locator('.tarea.pp-paso[data-id^="venta:"]').first();
  const m = venta.locator('.pp-molde');
  await expect(m).toContainText('Dónde'); await expect(m).toContainText('Trade Republic');
  await expect(m).toContainText(/(lun|mar|mié|jue|vie) \d+ (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/);
  await expect(m).toContainText('Después');
  await venta.locator('.pp-fila').click();
  await expect(venta.locator('.t-pasos li').first()).toContainText('pulsa Vender');
  await expect(venta.locator('.t-pasos li').nth(1)).toContainText('acciones');
  // sin el «cuándo» repetido en la cabecera de la tarjeta
  await expect(venta.locator('.t-meta .t-cuando')).toHaveCount(0);
});

test('«¿Lo hago o no?»: las opciones aparte; sí las pasa a «Haz esto», no las aparta, y las dos cosas se deshacen', async ({ page }) => {
  test.skip(new Date().getMonth() < 6 || new Date() < new Date(new Date().getFullYear(), 10, 1), 'la venta con pérdidas sale en el mes desde noviembre');
  await fundador(page); await abrirPaso(page);
  await expect(page.locator('#panelPaso')).not.toContainText('Para decidir tú');
  await expect(page.locator('#panelPaso h3.rh').filter({ hasText: '¿Lo hago o no?' })).toBeVisible();
  const id = await page.evaluate(() => mesRuta(S.M).decidir.find((x) => /^perdida:p8:/.test(x.id)).id);
  const antes = await page.evaluate(() => pendientesMes(mesRuta(S.M)));
  const op = page.locator(`.tarea.pp-paso[data-id="${id}"]`);
  await expect(op.locator('.pp-sino button')).toHaveText(['Sí, lo hago', 'No']);
  await expect(op.locator('.t-hecho')).toHaveCount(0);
  // sí: pasa a «Haz esto», con su número, y cuenta como pendiente
  await op.locator('.pp-sino [data-v="si"]').click();
  const hecha = page.locator(`ol.tareas > .tarea.pp-paso[data-id="${id}"]`);
  await expect(hecha).toBeVisible();
  await expect(hecha.locator('.pp-decid')).toHaveText('Dijiste que sí');
  expect(await page.evaluate(() => pendientesMes(mesRuta(S.M)))).toBe(antes + 1);
  expect(await page.evaluate((id) => S.cartera.ruta.decide[id].v, id)).toBe('si');
  // al final no: vuelve a las opciones
  await hecha.locator('.pp-fila').click();
  await hecha.locator('[data-pp-dec][data-v=""]').click();
  await expect(page.locator(`ul.tareas > .tarea.pp-paso[data-id="${id}"] .pp-sino`)).toBeVisible();
  // no: se aparta, con una línea para recuperarla
  await page.locator(`.tarea.pp-paso[data-id="${id}"] .pp-sino [data-v="no"]`).click();
  await expect(page.locator(`.tarea.pp-paso[data-id="${id}"]`)).toHaveCount(0);
  await expect(page.locator('.pp-desc')).toContainText('dijiste que no');
  expect(await page.evaluate(() => pendientesMes(mesRuta(S.M)))).toBe(antes);
  await page.locator('.pp-desc [data-pp-dec]').first().click();
  await expect(page.locator(`.tarea.pp-paso[data-id="${id}"] .pp-sino`)).toBeVisible();
});

test('la confianza va en palabras y las fechas dicen qué hacer ese día', async ({ page }) => {
  await fundador(page);
  await page.evaluate(() => { const f = S.M.filas.find((y) => y.inst.id === 'bat'); f.p.proximos_resultados = sumarDias(hoyIso(), 9); cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); });
  await abrirPaso(page);
  const chips = await page.locator('#panelPaso .pp-conf-s').allTextContents();
  expect(chips.length).toBeGreaterThan(0);
  for (const c of chips) expect(['Muy fiable', 'Fiable a medias', 'Poco fiable']).toContain(c.trim());
  await expect(page.locator('#panelPaso .pp-med')).toHaveCount(0);
  const venta = page.locator('.tarea.pp-paso[data-id^="venta:"]').first();
  await venta.locator('.pp-fila').click();
  await expect(venta.locator('.pp-conf')).toContainText(/Fiable a medias|Muy fiable|Poco fiable/);
  // los resultados de BAT: qué hacer ese día, con el día y la hora del cierre
  const res = page.locator('.rfecha').filter({ hasText: 'Resultados de BAT' });
  await expect(res.locator('.rf-que')).toContainText('Qué hacer ese día');
  await expect(res.locator('.rf-que')).toContainText('al cerrar la bolsa (17:30)');
  await expect(res.locator('.rf-que')).toContainText(/no hagas nada/);
});

test('en inglés, el molde y las opciones salen traducidos', async ({ page, context }) => {
  await context.addInitScript(() => { try { localStorage.setItem('inv-idioma', JSON.stringify('en')); } catch (e) {} });
  await fundador(page); await abrirPaso(page);
  const venta = page.locator('.tarea.pp-paso[data-id^="venta:"]').first();
  await expect(venta.locator('.pp-molde')).toContainText('Where');
  await expect(venta.locator('.pp-molde')).toContainText('When');
  await expect(venta.locator('.pp-molde')).toContainText('Then');
  await expect(venta.locator('.pp-conf-s')).toHaveText(/^(Very reliable|Fairly reliable|Not very reliable)$/);
  if (await page.locator('.pp-sino').count()) await expect(page.locator('.pp-sino button').first()).toHaveText('Yes, do it');
});
