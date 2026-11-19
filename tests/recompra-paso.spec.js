// Mejorar la IA, parte 0 (19 nov 2026, claude/sesion-mejorar-ia.md): la regla de recompra con lo comprado ANTES de la
// venta (art. 33.5 LIRPF) en el Paso a paso y en el plan de venta, con la misma cuenta que usa la IA (recompraDeVenta).
// Lo que se aplaza es la parte de la pérdida que corresponde a lo comprado en el plazo que SIGUE en la cartera tras vender:
// - una venta parcial con pérdidas (Recortar) deja lo de hace 3 semanas: esa parte no resta este año;
// - vender la posición entera se lleva también lo de hace 3 semanas: resta todo;
// - un fondo con más participaciones en otra cuenta compradas hace 6 meses (un año de plazo): esa parte no resta, y si
//   lo de la otra cuenta cubre todo, el paso de vender con pérdidas no sale.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

async function fundador(page) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async () => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false;
    S.acceso = 'privado';
    // ganancias ya hechas este año, para que una pérdida ahorre algo en la renta
    S.cartera.fiscal = { [String(new Date().getFullYear())]: { otras: 20000, rcm: 0 } };
    await guardarCarteraCallada('prueba');
    S.M = calcular();
  });
}

test('Recortar una acción con pérdidas y una compra de hace 3 semanas que se queda: esa parte no resta este año', async ({ page }) => {
  await fundador(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso(), anio = new Date().getFullYear();
    const pos = S.cartera.posiciones.find((x) => x.instrumento === 'iag');
    const pr = S.M.filas.find((x) => x.pos === pos).precio;
    const montar = (fReciente) => {
      pos.cantidad = 652.53;
      pos.lotes = [{ f: '2024-03-01', u: 552.53, c: 552.53 * pr * 1.5 }, { f: fReciente, u: 100, c: 100 * pr }];
      pos.coste = pos.lotes[0].c + pos.lotes[1].c;
      S.M = calcular();
      const f = S.M.filas.find((x) => x.pos === pos);
      // el límite de empresa a la mitad de su peso (+2: planVenta deja 2 puntos de margen): Recortar vende la mitad
      S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_empresa: f.peso / 2 + 2 };
      const pl = planVenta0({ ...f, senal: { ...f.senal, nivel: 'reducir' } }, S.M);
      return { uds: pl.uds, ganancia: pl.ganancia, computa: pl.computa, impuesto: pl.impuesto, recompra: pl.fiscal.recompra,
        html: htmlFiscalVenta(pl).replace(/<[^>]+>/g, ' '), cuota: impuestoDeVenta(pl.computa, anio, f.inst).impuesto };
    };
    const dentro = montar(sumarDias(hoy, -21));
    const fuera = montar(sumarDias(hoy, -90));
    // vendiendo la posición entera, lo de hace 3 semanas sale también: no se aplaza nada
    montar(sumarDias(hoy, -21));
    const entera = restoEnPerdidas(S.M, []).find((y) => y.f.pos === pos);
    return { meses: reglaRecompra(S.inst.iag).meses, hace21: sumarDias(hoy, -21), dentro, fuera, entera: entera && { g: entera.g, cuenta: entera.cuenta, noResta: entera.noResta } };
  });
  expect(r.meses).toBe(2);
  const d = r.dentro;
  expect(d.uds).toBeLessThan(552.53); // todo sale del lote viejo: el de hace 3 semanas se queda
  expect(d.ganancia).toBeLessThan(-100);
  expect(d.recompra).toBeTruthy();
  expect(d.recompra.primera).toBe(r.hace21);
  // la parte de lo que se queda (100 de las vendidas) no resta: cuenta el resto
  const parte = Math.min(1, 100 / d.uds);
  expect(d.recompra.porAntes).toBeCloseTo(-d.ganancia * parte, 1);
  expect(d.computa).toBeCloseTo(d.ganancia * (1 - parte), 1);
  expect(d.html).toMatch(/De esa pérdida, unos [\d.]+\s€ no restan este año/);
  expect(d.html).toContain('regla de recompra');
  // fuera del plazo (90 días), la pérdida entera
  expect(r.fuera.recompra).toBeNull();
  expect(r.fuera.computa).toBeCloseTo(r.fuera.ganancia, 6);
  expect(r.fuera.html).not.toContain('no restan este año');
  // y vendiendo todo, resta todo
  expect(r.entera).toBeTruthy();
  expect(r.entera.noResta).toBe(0);
  expect(r.entera.cuenta).toBeCloseTo(r.entera.g, 6);
});

test('fondo con pérdidas y más participaciones en otra cuenta compradas hace 6 meses: el Paso a paso lo dice con su cifra', async ({ page }) => {
  test.skip(new Date().getMonth() < 6, 'de enero a junio el Paso a paso no propone vender con pérdidas');
  await fundador(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso();
    const pos = S.cartera.posiciones.find((x) => x.instrumento === 'amundi-europe');
    const pr = S.M.filas.find((x) => x.pos === pos).precio;
    pos.cantidad = 60; pos.lotes = [{ f: '2024-02-01', u: 60, c: 60 * pr * 1.4 }]; pos.coste = pos.lotes[0].c;
    const otra = { id: 'p-otra', instrumento: 'amundi-europe', plataforma: 'Openbank', cantidad: 5, coste: 5 * pr, fecha: sumarMeses(hoy, -6), lotes: [{ f: sumarMeses(hoy, -6), u: 5, c: 5 * pr }] };
    S.cartera.posiciones.push(otra);
    const mirar = () => {
      S.M = calcular();
      const planes = S.M.filas.map((f) => planVenta(f, S.M)).filter(Boolean);
      const x = restoEnPerdidas(S.M, planes).find((y) => y.f.pos === pos);
      const P = pasosRuta0(S.M), paso = [...P.mes, ...P.seis].find((y) => y.id.startsWith(`perdida:${pos.id}:`));
      return { x: x && { g: x.g, cuenta: x.cuenta, noResta: x.noResta }, paso: paso && { pq: paso.pq.replace(/<[^>]+>/g, ''), ahorro: paso.ref.ahorro } };
    };
    const seis = mirar();
    // la misma cuenta, comprada hace 13 meses (fuera del año): resta todo
    otra.fecha = sumarMeses(hoy, -13); otra.lotes[0].f = otra.fecha;
    const trece = mirar();
    // y si lo de la otra cuenta (de hace 6 meses) es tanto como lo que vende, no resta nada: el paso no sale
    otra.fecha = sumarMeses(hoy, -6); otra.cantidad = 60; otra.lotes = [{ f: otra.fecha, u: 60, c: 60 * pr }]; otra.coste = 60 * pr;
    const todo = mirar();
    return { plazo: reglaRecompra(S.inst['amundi-europe']).plazo, seis, trece, todo };
  });
  expect(r.plazo).toBe('un año');
  const s = r.seis;
  expect(s.x).toBeTruthy();
  expect(s.x.noResta).toBeCloseTo(-s.x.g * 5 / 60, 1);
  expect(s.x.cuenta).toBeCloseTo(s.x.g * 55 / 60, 1);
  expect(s.paso).toBeTruthy();
  expect(s.paso.pq).toMatch(/De eso, unos [\d.]+\s€ no restan este año por la regla de recompra/);
  expect(r.trece.x.noResta).toBe(0);
  expect(r.trece.paso.pq).not.toContain('no restan este año');
  // el ahorro baja al no restar esa parte
  expect(r.trece.paso.ahorro).toBeGreaterThan(s.paso.ahorro);
  expect(r.todo.x).toBeFalsy();
  expect(r.todo.paso).toBeFalsy();
});

// revisión aparte (19 nov): con «resto» (Toisón ya propone vender una parte), la pérdida del resto va por FIFO; antes, a
// precio medio, y la diferencia salía como una regla de recompra que no existía
test('el resto de una posición sin otra cuenta no inventa una regla de recompra; si libera la pérdida aplazada del plan, lo dice', async ({ page }) => {
  await fundador(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso();
    const pos = S.cartera.posiciones.find((x) => x.instrumento === 'iag');
    const pr = S.M.filas.find((x) => x.pos === pos).precio;
    const caso = (fReciente, cViejo, cNuevo) => {
      pos.cantidad = 600; pos.lotes = [{ f: '2024-03-01', u: 300, c: 300 * pr * cViejo }, { f: fReciente, u: 300, c: 300 * pr * cNuevo }]; pos.coste = pos.lotes[0].c + pos.lotes[1].c;
      S.M = calcular();
      const f = S.M.filas.find((x) => x.pos === pos);
      // el plan: vende las 300 viejas (como planVenta0 con Recortar)
      const ganancia = 300 * pr - pos.lotes[0].c, rv = recompraDeVenta(f, 300, ganancia);
      const pl = { f, queda: 300, ganancia, computa: ganancia + (rv ? rv.aplazada + rv.liberada : 0) };
      const x = restoEnPerdidas(S.M, [pl]).find((y) => y.f.pos === pos);
      return { pl: { ganancia: pl.ganancia, computa: pl.computa }, x: x && { g: x.g, cuenta: x.cuenta, noResta: x.noResta, libera: x.libera } };
    };
    return { a: caso(sumarMeses(hoy, -6), 1.6, 1.1), b: caso(sumarDias(hoy, -21), 1.5, 1.2) };
  });
  // A: el lote nuevo es de hace 6 meses (fuera de los dos meses): nada se aplaza
  expect(r.a.x.noResta).toBe(0);
  expect(r.a.x.libera).toBe(0);
  expect(r.a.x.cuenta).toBeCloseTo(r.a.x.g, 1);
  // B: el de hace 3 semanas aplaza la pérdida del plan; vender el resto la hace contar
  expect(r.b.pl.computa).toBeCloseTo(0, 1);
  expect(r.b.x.noResta).toBe(0);
  expect(r.b.x.libera).toBeCloseTo(-r.b.pl.ganancia, 0);
  expect(r.b.x.cuenta).toBeCloseTo(r.b.x.g + r.b.pl.ganancia, 0);
});
