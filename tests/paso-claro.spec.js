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
const perdida = (page, id) => page.evaluate((id) => { const P = pasosRuta0(S.M); const x = [...P.mes, ...P.seis].find((y) => y.id.startsWith('perdida:' + id + ':')); return x && { t: x.t.replace(/<[^>]+>/g, ''), pasos: x.pasos.map((p) => p.replace(/<[^>]+>/g, '')), imp: x.imp, lim: x.lim, libre: x.libre, cuando: x.cuando, uds: x.uds, hoy: hoyIso(), librePrev: libreRecompra(S.inst[x.ref.f.inst.id], hoyIso()) }; }, id);

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
