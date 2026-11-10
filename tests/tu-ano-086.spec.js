// 0.8.6 · Tu año en Toisón: los cálculos (sesión 8 del plan). Las funciones ta… son puras: se prueban con flujos y
// posiciones hechos a mano, cuyas cifras se saben de antemano, y al final con la cartera de prueba de la maqueta.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, quitarCapas } from './ayuda.js';
import { meterCarteraTuAno } from './tuano-cartera.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'pc', 'el cálculo es el mismo en todos los tamaños'));

// la cuenta y el trozo «avanzado» (donde está tuAnoCalc) ya bajado; F(): 6.700 € en marzo de 2023 y 300 € cada mes
async function conTrozo(page) {
  await crearCuenta(page);
  await page.evaluate(() => { location.hash = 'av-rentab'; });
  await page.waitForFunction(() => typeof tuAnoCalc === 'function', null, { timeout: 20_000 });
  await page.evaluate(() => {
    window.F = (hasta = '2026-11-01', id = 'x') => { const f = [{ d: '2023-03-01', imp: -6700, id }]; for (let d = '2023-04-01'; d <= hasta; d = sumarMeses(d, 1)) f.push({ d, imp: -300, id }); return f; };
  });
}

test('el periodo: de enero al mes de hoy, como mucho noviembre; en enero, el año anterior', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => ['2026-11-10', '2026-12-05', '2027-01-15', '2026-06-15'].map((h) => periodoTuAno(h)));
  expect(r[0]).toEqual({ anio: 2026, desde: '2026-01-01', hasta: '2026-11-10', mesFin: 11, cerrado: false });
  expect(r[1]).toEqual({ anio: 2026, desde: '2026-01-01', hasta: '2026-11-30', mesFin: 11, cerrado: true });
  expect(r[2]).toMatchObject({ anio: 2026, hasta: '2026-11-30', cerrado: true });
  expect(r[3]).toMatchObject({ anio: 2026, hasta: '2026-06-15', mesFin: 6 });
  expect(await page.evaluate(() => PAG.tuano.t)).toBe(`Tu año ${await page.evaluate(() => periodoTuAno().anio)}`);
});

test('300 € cada mes: 11 de 11 meses, 3.300 €, 44 meses sin sacar dinero desde marzo de 2023 y estilo Constante', async ({ page }) => {
  await conTrozo(page);
  const T = await page.evaluate(() => tuAnoCalc({ hoy: '2026-11-10', flujos: F() }));
  expect(T.apo.si).toBe(11); expect(T.apo.den).toBe(11);
  expect(T.apo.total).toBe(3300); expect(T.apo.cada).toBe(300);
  expect(T.apo.meses.map((m) => m.st)).toEqual([...Array(11).fill('si'), 'pendiente']);
  expect(T.apo.metido).toBe(19900); expect(T.apo.inicio).toBe('2023-03');
  expect(T.sinSacar.n).toBe(44); expect(T.sinSacar.desde).toBe('2023-03');
  expect(T.estilo.k).toBe('constante'); expect(T.ventas).toBe(0);
  // en diciembre, noviembre ya ha terminado: un mes más en el contador
  expect((await page.evaluate(() => tuAnoCalc({ hoy: '2026-12-05', flujos: F('2026-12-01') }))).sinSacar.n).toBe(45);
  // el mes en curso sin aportar todavía: pendiente, y no cuenta
  const T2 = await page.evaluate(() => tuAnoCalc({ hoy: '2026-11-10', flujos: F('2026-10-01') }));
  expect(T2.apo.meses[10].st).toBe('pendiente'); expect(T2.apo.den).toBe(10); expect(T2.apo.si).toBe(10);
});

test('reequilibrar o traspasar no rompe el contador; sacar dinero sí, y ese mes no hay aportación', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => {
    // vender una cosa y meterlo en otra a los 4 días; y un traspaso que cruza de abril a mayo
    const cambio = [...F(), { d: '2026-03-10', imp: 1000, id: 'x' }, { d: '2026-03-14', imp: -1000, id: 'y' }, { d: '2026-04-29', imp: 2000, id: 'x' }, { d: '2026-05-03', imp: -2000, id: 'z' }];
    // vender 2.000 € en junio y no volver a meterlo
    const sale = [...F(), { d: '2026-06-15', imp: 2000, id: 'x' }];
    // lo mismo dentro del mes, a más de 7 días: entra lo mismo que sale, no hay salida neta
    const mes = [...F(), { d: '2026-08-03', imp: 900, id: 'x' }, { d: '2026-08-25', imp: -900, id: 'y' }];
    const a = tuAnoCalc({ hoy: '2026-11-10', flujos: cambio }), b = tuAnoCalc({ hoy: '2026-11-10', flujos: sale }), c = tuAnoCalc({ hoy: '2026-11-10', flujos: mes });
    return { a: { n: a.sinSacar.n, ap: a.apo.meses.map((m) => m.imp), ventas: a.ventas, cambios: a.sinSacar.cambiosAno }, b: { n: b.sinSacar.n, desde: b.sinSacar.desde, jun: b.apo.meses[5].st, si: b.apo.si, roturas: b.sinSacar.roturasAno }, c: { n: c.sinSacar.n, ago: c.apo.meses[7] } };
  });
  expect(r.a.n).toBe(44);
  expect(r.a.ap.slice(0, 11)).toEqual(Array(11).fill(300));
  expect(r.a.ventas).toBe(2); expect(r.a.cambios).toBe(2);
  expect(r.b.roturas).toEqual(['2026-06']);
  expect(r.b.desde).toBe('2026-07'); expect(r.b.n).toBe(4);
  expect(r.b.jun).toBe('no'); expect(r.b.si).toBe(10);
  expect(r.c.n).toBe(44); expect(r.c.ago).toMatchObject({ st: 'si', imp: 300 });
});

test('el estilo: Paciente, Explorador y Diversificador; y operar más no sube ninguno', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => {
    const pos = (n, tipos) => Array.from({ length: n }, (_, i) => ({ n: 'p' + i, valor: 1000, tipo: tipos[i % tipos.length] }));
    // 5.000 € en enero de 2024 y nada más: no aporta, no vende
    const pac = tuAnoCalc({ hoy: '2026-11-10', flujos: [{ d: '2024-01-10', imp: -5000, id: 'a' }], posiciones: pos(1, ['Fondo']) });
    // tres posiciones nuevas este año y una venta
    const fl = [{ d: '2024-01-10', imp: -5000, id: 'a' }, { d: '2026-02-10', imp: -500, id: 'b' }, { d: '2026-05-10', imp: -500, id: 'c' }, { d: '2026-08-10', imp: -500, id: 'd' }, { d: '2026-09-20', imp: 1000, id: 'a' }];
    const exp = tuAnoCalc({ hoy: '2026-11-10', flujos: fl, posiciones: pos(4, ['Fondo', 'Acción']) });
    // ocho posiciones iguales de cinco tipos, sin nada nuevo este año y con una venta
    const div = tuAnoCalc({ hoy: '2026-11-10', flujos: [{ d: '2024-01-10', imp: -8000, id: 'a' }, { d: '2026-03-20', imp: 500, id: 'a' }], posiciones: pos(8, ['Fondo', 'Acción', 'ETF', 'ETC', 'Cripto']) });
    // la misma cartera de 300 € al mes con diez cambios de una posición a otra en el año
    const base = tuAnoCalc({ hoy: '2026-11-10', flujos: F(), posiciones: pos(3, ['Fondo', 'Acción']) });
    const mucho = [...F()]; for (let m = 1; m <= 10; m++) { const d = `2026-${String(m).padStart(2, '0')}-15`; mucho.push({ d, imp: 400, id: 'x' }, { d, imp: -400, id: 'x' }); }
    const op = tuAnoCalc({ hoy: '2026-11-10', flujos: mucho, posiciones: pos(3, ['Fondo', 'Acción']) });
    return { pac: pac.estilo.k, exp: exp.estilo.k, expNuevas: exp.nuevas, div: div.estilo.k, base: base.estilo.rasgos, op: op.estilo.rasgos, opK: op.estilo.k };
  });
  expect(r.pac).toBe('paciente');
  expect(r.exp).toBe('explorador'); expect(r.expNuevas).toBe(3);
  expect(r.div).toBe('diversificador');
  for (const k of ['constante', 'diversificador', 'explorador']) expect(r.op[k]).toBeLessThanOrEqual(r.base[k] + 1e-9);
  expect(r.op.paciente).toBeLessThan(r.base.paciente);
  expect(r.opK).toBe('constante');
});

test('la edad de tu dinero, por posición y la media pesada por lo que vale; costes de cada 100 €; solo dividendos cobrados', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => {
    const E = taEdad([{ n: 'A', valor: 1000, lotes: [{ f: '2024-11-10', u: 1 }] }, { n: 'B', valor: 3000, lotes: [{ f: '2025-11-10', u: 1 }, { f: '2026-11-10', u: 1 }] }, { n: 'C', valor: 500, lotes: [] }], '2026-11-10');
    const C = taCostes({ fondos: [{ n: 'MSCI', ter: 0.12, valor: 10000 }, { n: 'Oro', ter: 0.39, valor: 2000 }, { n: 'Repsol', ter: null, valor: 4000 }], comis: 3, total: 20000, meses: 11 });
    const D = taDividendos([{ n: 'Repsol', d: '2026-01-12', bruto: 140, ret: 19 }, { n: 'Repsol', d: '2026-07-06', bruto: 140, ret: 19 }, { n: 'Repsol', d: '2025-12-01', bruto: 100, ret: 19 }, { n: 'Repsol', d: '2026-11-20', bruto: 150, ret: 19 }], periodoTuAno('2026-11-10'));
    return { E: { filas: E.filas.map((f) => [f.n, +f.meses.toFixed(2)]), media: E.media, sin: E.sinFecha }, dur: [taDur(30.7), taDur(12), taDur(0.2), taDur(7), taDurC(30.7)], C, D: { bruto: D.bruto, ret: D.ret, neto: D.neto, tipo: D.tipoUnico, n: D.pagos.length, ene: D.meses[0].bruto, jul: D.meses[6].bruto } };
  });
  // A: 730 días; B: 365 y 0 días, la media de sus dos participaciones
  expect(r.E.filas).toEqual([['B', +(365 / 30.4375 / 2).toFixed(2)], ['A', +(730 / 30.4375).toFixed(2)]]);
  expect(r.E.media).toBeCloseTo((1000 * 730 / 30.4375 + 3000 * 365 / 30.4375 / 2) / 4000, 6);
  expect(r.E.sin).toEqual(['C']);
  expect(r.dur).toEqual(['2 años y 7 meses', '1 año', 'menos de un mes', '7 meses', '2 a 7 m']);
  expect(r.C.anual).toBeCloseTo(19.8, 6);
  expect(r.C.centimos).toBeCloseTo(9.9, 6);
  expect(r.C.periodo).toBeCloseTo(19.8 * 11 / 12 + 3, 6);
  expect(r.C.fondos.map((f) => f.n)).toEqual(['MSCI', 'Oro']);
  expect(r.D).toMatchObject({ bruto: 280, tipo: 19, n: 2, ene: 140, jul: 140 });
  expect(r.D.ret).toBeCloseTo(53.2, 6); expect(r.D.neto).toBeCloseTo(226.8, 6);
});

test('el mes más movido: el que más llegó a bajar desde el máximo del año, con la TWR', async ({ page }) => {
  await conTrozo(page);
  const r = await page.evaluate(() => {
    const s = []; let idx = 1;
    for (let d = '2026-01-01'; d <= '2026-11-10'; d = sumarDias(d, 1)) {
      const m = +d.slice(5, 7), dia = +d.slice(8, 10);
      idx *= m === 3 && dia <= 10 ? 0.9917 : m === 3 ? 1.004 : 1.0005;
      // lo que vale sube con las aportaciones aunque la TWR baje: el cálculo mira la TWR
      s.push({ d, idx, v: idx * 10000 + m * 300 });
    }
    return taMovido(s, periodoTuAno('2026-11-10'));
  });
  expect(r.k).toBe('2026-03');
  expect(r.dd).toBeCloseTo((Math.pow(0.9917, 10) - 1) * 100, 6);
  expect(await page.evaluate(() => taMovido([{ d: '2026-02-01', idx: 1, v: 1 }], periodoTuAno('2026-11-10')))).toBeNull();
});

test('con la cartera de prueba: las siete cifras salen de sus datos y los textos no dan órdenes', async ({ page }) => {
  await crearCuenta(page); await meterCarteraTuAno(page); await quitarCapas(page);
  await page.evaluate(() => { location.hash = 'av-tuano'; });
  await expect(page.locator('#panelAv[data-p="tuano"]:not([aria-busy]) .ta-t')).toHaveCount(7, { timeout: 20_000 });
  const T = await page.evaluate(() => { const T = S.taDatos; return { apo: T.apo, estilo: T.estilo.k, edad: T.edad.media, nEdad: T.edad.filas.length, divid: T.divid.de, costes: T.costes.fondos.map((f) => f.n), n: T.sinSacar.n, desde: T.sinSacar.desde, periodo: T.P }; });
  expect(T.apo.cada).toBe(300);
  expect(T.apo.si).toBe(T.apo.den);
  expect(T.estilo).toBe('constante');
  expect(T.nEdad).toBe(5);
  expect(T.edad).toBeGreaterThan(12);
  // solo cobra Repsol: los fondos de acumulación no reparten
  expect(T.divid).toEqual(['Repsol']);
  expect(T.costes).toEqual(expect.arrayContaining(['MSCI World Fidelity']));
  expect(T.desde).toBe('2023-03');
  expect(T.n).toBeGreaterThanOrEqual(44);
  const txt = await page.locator('#panelAv').innerText();
  expect(txt).not.toMatch(/\b(compra|vende|comprar|vender|compres|vendas|deberías|te recomendamos)\b/i);
  expect(txt).toContain('Rendimiento › Dividendos');
  expect(txt).toContain('Cambiar de una posición a otra o traspasar un fondo no cuenta');
  // sin candados de Dorado
  expect(await page.locator('#panelAv .et-dorado, #panelAv .sello-d, #panelAv .fr-cand').count()).toBe(0);
});
