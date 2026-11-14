// 14 nov 2026 · auditoría (claude/auditoria-noche-14nov.md): lo de la web.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

test('en Mercados, el bitcoin de Bitvavo dice lo de hoy y no lo de las últimas 24 horas', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    const m = S.precios.mercados['BTC-EUR'];
    LIVE.mapas();
    const tick = { market: 'BTC-EUR', last: '63000', open: '70000', timestamp: Date.now() };   // 24 horas: −10 %
    // el dato de precios.json es de hoy: se mide desde su cierre anterior
    Object.assign(m, { fecha: hoyIso(), precio: 61000, cierre_anterior: 60000 });
    LIVE.alTickerBitvavo(tick);
    const deHoy = datoMerc('BTC-EUR').var;
    // el dato es de ayer (de madrugada, antes de la primera pasada): desde ese último precio
    Object.assign(m, { fecha: sumarDias(hoyIso(), -1), precio: 61000, cierre_anterior: 60000 });
    LIVE.alTickerBitvavo(tick);
    const deAyer = datoMerc('BTC-EUR').var;
    return { deHoy, deAyer, precio: datoMerc('BTC-EUR').precio, pos: S.live.btc && S.live.btc.precio, ctx: contextoAsesor(S.M, 'revision', true).split('\n').find((l) => /\] Bitcoin:/.test(l)) };
  });
  expect(r.deHoy).toBeCloseTo(5, 5);
  expect(r.deAyer).toBeCloseTo((63000 / 61000 - 1) * 100, 5);
  expect(r.precio).toBe(63000);
  expect(r.pos).toBe(63000);   // la posición sigue recibiendo su precio en directo
  expect(r.ctx).toMatch(/hoy \+3,3/);   // y es lo que lee la IA
});

test('lo que lee la IA no llama «hoy» a un dato que es de otro día', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    const ayer = sumarDias(hoyIso(), -1), lineas = () => contextoAsesor(S.M, 'revision', true).split('\n');
    S.live = {}; S.liveM = {};
    // todo con fecha de ayer: la bolsa cerrada
    for (const p of Object.values(S.precios.instrumentos)) p.fecha = ayer;
    for (const m of Object.values(S.precios.mercados)) m.fecha = ayer;
    pintar();
    const a = lineas();
    // y con el S&P 500 y Repsol de hoy
    S.precios.mercados['^GSPC'].fecha = hoyIso();
    S.precios.instrumentos.repsol.fecha = hoyIso();
    pintar();
    const b = lineas();
    const de = (l, re) => l.find((x) => re.test(x)) || '';
    return { div: de(a, /^Dividendos de los próximos 12 meses/), ayer: fechaCorta(ayer), spA: de(a, /\] S&P 500:/), spB: de(b, /\] S&P 500:/), ibexB: de(b, /\] Ibex 35:/), repA: de(a, /acciones a .*€ \(/), repB: de(b, /acciones a .*€ \(hoy/), btc: de(a, /^Tiene .* unidades a /), chat: contextoAsesor(S.M, 'chat', true).split('\n').find((x) => /^- Ibex 35 /.test(x)) };
  });
  expect(r.spA).toContain(`(el ${r.ayer}, su última sesión,`);
  expect(r.spA).not.toContain('(hoy');
  expect(r.spB).toContain('(hoy');
  expect(r.ibexB).toContain(`(el ${r.ayer}, su última sesión,`);
  expect(r.chat).toContain(`: el ${r.ayer}, su última sesión,`);
  // las posiciones: sin precio de hoy, el último movimiento con su fecha; con precio de hoy, «hoy»
  expect(r.repA).toMatch(/\(hoy no ha cotizado: su último precio es del \d{4}-\d\d-\d\d y ese día se movió /);
  expect(r.repB).toContain('(hoy');
  expect(r.btc).not.toBe('');   // de bitcoin se tienen unidades, no participaciones
  // los dividendos, pago a pago: fecha, de quién y cuánto (antes, el total del mes con los nombres detrás)
  expect(r.div).toMatch(/Pago a pago, por fecha del ex-dividendo: \d{4}-\d\d-\d\d \S.*? \d+\s€ netos \(\d+\s€ brutos\); \d{4}-/);
  expect(r.div).toContain('no por acción');
});

test('las notas de la revisión van siempre de 1 a 5', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  const r = await page.evaluate(() => ({
    de10: notasDe5([{ k: 'Diversificación', nota: 6 }, { k: 'Costes', nota: 8 }, { k: 'Riesgo', nota: 5 }, { k: 'Disciplina', nota: 7 }, { k: 'Impuestos', nota: 4 }]).map((x) => x.nota),
    de5: notasDe5([{ k: 'a', nota: 4 }, { k: 'b', nota: 5 }, { k: 'c', nota: 2 }, { k: 'd', nota: '3' }, null, { k: 'e' }]).map((x) => x.nota),
    nada: notasDe5(undefined),
  }));
  expect(r.de10).toEqual([3, 4, 3, 4, 2]);   // antes: 5, 5, 5, 5 y 4 puntos en Inicio, y «8 de 5» en la pestaña de la IA
  expect(r.de5).toEqual([4, 5, 2, 3, 0]);
  expect(r.nada).toEqual([]);
});
