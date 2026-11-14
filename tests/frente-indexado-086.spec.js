// 0.8.6 · Pestaña 2, «Frente a un indexado»: el cálculo (sesión 4 del plan). frenteCalc es una función pura: se prueba
// con históricos hechos a mano, cuyas cifras se saben de antemano por otro camino (la TIR de un precio que crece a un
// ritmo fijo es ese ritmo; la beta de una cartera que es 0,8 veces el fondo es 0,8), y con la cartera de ejemplo.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'pc', 'el cálculo es el mismo en todos los tamaños'));

// la cuenta y el trozo «avanzado» (donde está frenteCalc) ya bajado
async function conTrozo(page, cartera = false) {
  await crearCuenta(page);
  if (cartera) {
    await meterCartera(page); await quitarCapas(page);
    await page.evaluate(async () => { for (const p of S.cartera.posiciones) p.desde = '2021-03-01'; await guardarCartera('prueba'); });
  }
  await page.evaluate(() => { location.hash = 'av-rentab'; });
  await page.waitForFunction(() => typeof frenteCalc === 'function', null, { timeout: 20_000 });
  await page.evaluate(() => { window.masDias = (d, n) => { const x = deIso(d); return iso(new Date(x.getFullYear(), x.getMonth(), x.getDate() + n)); }; });
}

test('la cartera de prueba: 19.900 € metidos, 23.380 € tú y 24.150 € el indexado, con su TIR y su TWR de cada año', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => {
    // 6.700 € el 1 de marzo de 2023 y 300 € el día 1 de cada mes hasta noviembre de 2026
    const flujos = [{ d: '2023-03-01', imp: -6700, id: 'x' }];
    for (let d = '2023-04-01'; d <= '2026-11-01'; d = sumarMeses(d, 1)) flujos.push({ d, imp: -300, id: 'x' });
    const hoy = '2026-11-10', t = (d) => diasEntre('2023-01-02', d) / 365.25;
    // el ritmo al año que hace que esas aportaciones valgan lo que se pide hoy (por bisección, sin la app)
    const ritmo = (meta) => { let lo = -0.5, hi = 1; for (let i = 0; i < 200; i++) { const g = (lo + hi) / 2, v = flujos.reduce((s, x) => s - x.imp * Math.pow(1 + g, t(hoy) - t(x.d)), 0); if (v > meta) hi = g; else lo = g; } return (lo + hi) / 2; };
    const gI = ritmo(24150), gT = ritmo(23380);
    const dias = []; for (let d = '2023-01-02'; d <= hoy; d = masDias(d, 1)) dias.push(d);
    const h = dias.map((d) => [d, 10 * Math.pow(1 + gI, t(d))]);
    const idx = (d) => Math.pow(1 + gT, t(d) - t('2023-03-01'));
    const serie = dias.filter((d) => d >= '2023-03-01').map((d) => ({ d, idx: idx(d), v: flujos.filter((x) => x.d <= d).reduce((s, x) => s - x.imp * idx(d) / idx(x.d), 0) }));
    const R = frenteCalc({ flujos, serie, h, pHoy: h[h.length - 1][1] * Math.pow(1 + gI, t(hoy) - t(h[h.length - 1][0])), hoy, valorHoy: 23380, valores: { x: 23380 } });
    const a24 = R.anios.find((a) => a.anio === 2024);
    return { gI, gT, ix: R.ixHoy, tu: R.tuHoy, dif: R.dif, difPct: R.difPct, metido: R.metido, tirIx: R.tirIx, tirTu: R.tirTu, twrIx24: a24.twrIx, twrTu24: a24.twrTu, esp24I: (Math.pow(1 + gI, 366 / 365.25) - 1) * 100, esp24T: (Math.pow(1 + gT, 366 / 365.25) - 1) * 100,
      meses: R.mensual.length, anios: R.anios.map((a) => a.anio), semanas: R.medidas.semanas, quieto: frenteMedidas(Array(30).fill(0.004), Array(30).fill(0.005)).quieto, mom: R.momentos.map((m) => m.tipo), mom0: R.momentos[0].metido, reparto: R.reparto[0].dif };
  });
  expect(r.metido).toBe(19900);
  expect(r.ix).toBeCloseTo(24150, 1);
  expect(r.tu).toBe(23380);
  expect(r.dif).toBeCloseTo(-770, 1);
  expect(r.difPct).toBeCloseTo(-3.19, 2);
  // la TIR de un precio que sube a un ritmo fijo es ese ritmo; la TWR de 2024 (366 días), la de ese ritmo en 366 días
  expect(r.tirIx).toBeCloseTo(r.gI * 100, 3);
  expect(r.tirTu).toBeCloseTo(r.gT * 100, 3);
  expect(r.twrIx24).toBeCloseTo(r.esp24I, 3);
  expect(r.twrTu24).toBeCloseTo(r.esp24T, 3);
  // de marzo de 2023 a noviembre de 2026, 45 meses; los años, de 2023 a hoy
  expect(r.meses).toBe(45);
  expect(r.anios).toEqual([2023, 2024, 2025, 2026]);
  // una semana por cada siete días desde el 1 de marzo de 2023; si el fondo hace lo mismo todas las semanas, no hay
  // beta que sacar: lo dice en vez de dividir por cero
  expect(r.semanas).toBeGreaterThan(188);
  expect(r.semanas).toBeLessThan(194);
  expect(r.quieto).toBe(true);
  // siempre por debajo y cada vez más: el comienzo (con lo que metió ese día), cómo empezó el año y hoy, sin «mejor
  // momento» ni cruces
  expect(r.mom).toEqual(['inicio', 'enero', 'hoy']);
  expect(r.mom0).toBe(6700);
  expect(r.reparto).toBeCloseTo(-770, 1);
});

test('alfa, beta, tracking error, ratio de información y captura, con lo de cada semana (no con el fin de semana)', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => {
    // el fondo, los viernes y algún miércoles; tu cartera, 0,8 veces el fondo más 0,05 puntos a la semana, y los sábados
    // (la cripto) con un salto que el lunes se deshace: no debe contar
    const h = [], serie = [];
    let p = 100, i = 1, d = '2024-01-05';
    const rb = [], rp = [];
    for (let w = 0; w < 60; w++) {
      if (w) { const b = 0.002 + 0.02 * Math.sin(w * 1.3), a = 0.0005 + 0.8 * b; rb.push(b); rp.push(a); p *= 1 + b; i *= 1 + a; }
      h.push([d, p]); serie.push({ d, idx: i, v: 1000 * i });
      const sab = masDias(d, 1), mie = masDias(d, 5);
      serie.push({ d: sab, idx: i * 1.07, v: 1070 * i });
      if (w < 59) h.push([mie, p * 0.97]);
      d = masDias(d, 7);
    }
    const hoy = h[h.length - 1][0];
    serie.splice(serie.length - 1);
    const R = frenteCalc({ flujos: [{ d: '2024-01-05', imp: -1000, id: 'x' }], serie, h, hoy, valorHoy: 1000 * i });
    const med = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length, sd = (xs) => { const m = med(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
    const act = rp.map((x, k) => x - rb[k]);
    const cap = (f) => { const ks = rb.map((x, k) => (f(x) ? k : -1)).filter((k) => k >= 0); return (med(ks.map((k) => rp[k])) / med(ks.map((k) => rb[k]))) * 100; };
    return { m: R.medidas, te: sd(act) * Math.sqrt(52) * 100, ir: (med(act) * Math.sqrt(52)) / sd(act), up: cap((x) => x > 0), dn: cap((x) => x < 0), n: rb.length };
  });
  expect(r.m.semanas).toBe(r.n);
  expect(r.m.beta).toBeCloseTo(0.8, 9);
  expect(r.m.alfa).toBeCloseTo(0.0005 * 52 * 100, 6);
  expect(r.m.te).toBeCloseTo(r.te, 9);
  expect(r.m.ir).toBeCloseTo(r.ir, 9);
  expect(r.m.corr).toBeCloseTo(1, 9);
  expect(r.m.capSube).toBeCloseTo(r.up, 6);
  expect(r.m.capBaja).toBeCloseTo(r.dn, 6);
});

test('pocos meses: lo de hoy sí, pero sin «al año» ni medidas (y dice cuántas semanas faltan)', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => {
    const h = [['2026-09-25', 10], ['2026-10-02', 10.2], ['2026-10-09', 10.1], ['2026-10-16', 10.4], ['2026-10-23', 10.3], ['2026-10-30', 10.6], ['2026-11-06', 10.5]];
    const serie = h.filter(([d]) => d >= '2026-10-01').map(([d, p], k) => ({ d, idx: 1 + k * 0.01, v: 500 * (1 + k * 0.01) }));
    return frenteCalc({ flujos: [{ d: '2026-10-01', imp: -500, id: 'x' }], serie, h, hoy: '2026-11-10', valorHoy: 530 });
  });
  expect(r.corto).toBe(true);
  expect(r.tirTu).toBeNull();
  expect(r.tirIx).toBeNull();
  expect(r.ixHoy).toBeCloseTo((500 / 10) * 10.5, 9);
  expect(r.medidas.faltan).toBeGreaterThan(20);
  expect(r.anios).toHaveLength(1);
  expect(r.anios[0].parcialIni).toBe(true);
});

test('aportaciones a mitad de mes y en domingo, y una venta: cada una al precio de su día', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => {
    // el fondo pasa de 10 € a 20 € el sábado 15 de marzo de 2025: lo del 15 y lo del domingo 16 compran a 20, no a 10
    const h = [['2025-03-03', 10], ['2025-03-14', 10], ['2025-03-15', 20], ['2025-03-21', 20], ['2025-04-04', 22], ['2025-05-02', 24]];
    const flujos = [{ d: '2025-03-15', imp: -1000, id: 'a' }, { d: '2025-03-16', imp: -500, id: 'b' }, { d: '2025-04-04', imp: 330, id: 'a' }];
    return frenteCalc({ flujos, h, pHoy: 25, hoy: '2025-05-10', valorHoy: 1300, valores: { a: 800, b: 500 } });
  });
  expect(r.compras.map((c) => c.p)).toEqual([20, 20, 22]);
  expect(r.uds).toBeCloseTo(50 + 25 - 15, 9);
  expect(r.ixHoy).toBeCloseTo(60 * 25, 9);
  expect(r.metido).toBe(1500);
  expect(r.sacado).toBe(330);
  // sin serie de tu cartera (lo que pasa con algo sin precios pasados): lo de hoy sí; las líneas y las medidas, no
  expect(r.dif).toBeCloseTo(1300 - 1500, 9);
  expect(r.medidas).toBeNull();
  expect(r.diario.every((x) => x.tu == null && x.ix != null)).toBe(true);
  // el reparto suma la diferencia
  expect(r.reparto.reduce((s, x) => s + x.dif, 0)).toBeCloseTo(r.dif, 9);
  expect(r.reparto.find((x) => x.id === 'a').ix).toBeCloseTo((50 - 15) * 25, 9);
});

test('el fondo de la referencia empieza después de tu primera compra: lo dice, sin inventarse nada', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => frenteCalc({ flujos: [{ d: '2017-01-10', imp: -100, id: 'x' }], h: [['2018-03-23', 5], ['2018-03-30', 5.1]], hoy: '2026-11-10', valorHoy: 300 }));
  expect(r).toEqual({ sinDatos: true, desdeDatos: '2018-03-23' });
});

test('con la cartera de ejemplo: cuadra con Rentabilidad, con una cuenta a mano y consigo misma; el efectivo no entra', async ({ page }) => {
  await conTrozo(page, true);
  const r = await page.evaluate(() => {
    const M = calcular(), R = rentabilidadCartera(M), F = frenteCartera(M);
    // el indexado, a mano: participaciones al último cierre de cada fecha, con el histórico tal cual
    const h = S.hist.instrumentos['fidelity-world'];
    const p = (d) => { let x = null; for (const [f, v] of h) { if (f <= d) x = v; else break; } return x; };
    const aMano = R.flujos.reduce((u, x) => u - x.imp / p(x.d), 0) * precioBenchHoy('fidelity-world');
    const bm = benchMismoDinero(R, 'fidelity-world');
    const cadena = (k) => F.anios.reduce((a, y) => a * (1 + y[k] / 100), 1) * 100 - 100;
    // con mucho más efectivo, lo mismo
    const ef = S.cartera.efectivo; S.cartera.efectivo = [{ plataforma: 'MyInvestor', importe: 50000 }];
    frenteCache.k = ''; const F2 = frenteCartera(calcular()); S.cartera.efectivo = ef; frenteCache.k = '';
    return { F: { dudosas: F.dudosas, ix: F.ixHoy, tu: F.tuHoy, dif: F.dif, med: F.medidas, sinHist: F.sinHist, sinSerie: F.sinSerie, efectivo: F.efectivo, rep: F.reparto.reduce((s, x) => s + x.dif, 0), n: F.mensual.length, mom: F.momentos.length },
      valor: R.valor, aMano, bm: bm.valor, twr: R.twr.total, cadTu: cadena('twrTu'), cadIx: cadena('twrIx'), totIx: (precioBenchHoy('fidelity-world') / p(R.desde) - 1) * 100, F2: { ix: F2.ixHoy, tu: F2.tuHoy, ef: F2.efectivo } };
  });
  expect(r.F.tu).toBe(r.valor);
  expect(r.F.ix).toBeCloseTo(r.aMano, 6);
  expect(r.F.ix).toBeCloseTo(r.bm, 6);
  expect(r.F.dif).toBeCloseTo(r.F.tu - r.F.ix, 6);
  expect(r.F.rep).toBeCloseTo(r.F.dif, 4);
  // la TWR de cada año, encadenada, es la de todo el periodo (la tuya y la del fondo)
  expect(r.cadTu).toBeCloseTo(r.twr, 4);
  expect(r.cadIx).toBeCloseTo(r.totIx, 4);
  expect(r.F.med.semanas).toBeGreaterThan(200);
  expect(r.F.med.beta).toBeGreaterThan(0.2);
  expect(r.F.med.beta).toBeLessThan(1.5);
  expect(r.F.med.te).toBeGreaterThan(0);
  expect(r.F.sinHist).toEqual([]);
  // en la cartera de ejemplo, el S&P 500 cuesta 21.800 € por 1.000 participaciones que nunca valieron más de 12,14 €:
  // las compras supuestas pagan unas tres veces el mercado, y la diferencia con el indexado sale de ahí. Se avisa.
  expect(r.F.dudosas).toContain('S&P 500');
  expect(r.F.dudosas).not.toContain('Repsol');
  expect(r.F.sinSerie).toBe(false);
  expect(r.F.n).toBeGreaterThan(60);
  expect(r.F.mom).toBeGreaterThanOrEqual(2);
  expect(r.F.efectivo).toBeCloseTo(240.8, 6);
  expect(r.F2.ix).toBeCloseTo(r.F.ix, 6);
  expect(r.F2.tu).toBeCloseTo(r.F.tu, 6);
  expect(r.F2.ef).toBe(50000);
});

test('un fondo sin precios pasados: el resultado de hoy sale; la serie, no, y dice cuál es', async ({ page }) => {
  await conTrozo(page, true);
  const r = await page.evaluate(() => {
    delete S.hist.instrumentos.repsol;
    if (S.precios.instrumentos.repsol) delete S.precios.instrumentos.repsol.historico;
    if (S.catHist) delete S.catHist.repsol; if (S.histRadar) delete S.histRadar.repsol;
    rentCache.k = ''; frenteCache.k = '';
    const F = frenteCartera(calcular());
    return { sinSerie: F.sinSerie, sinHist: F.sinHist, dif: F.dif, ix: F.ixHoy, med: F.medidas, tu: F.diario.some((x) => x.tu != null) };
  });
  expect(r.sinSerie).toBe(true);
  expect(r.sinHist).toEqual(['Repsol']);
  expect(r.ix).toBeGreaterThan(0);
  expect(Number.isFinite(r.dif)).toBe(true);
  expect(r.med).toBeNull();
  expect(r.tu).toBe(false);
});
