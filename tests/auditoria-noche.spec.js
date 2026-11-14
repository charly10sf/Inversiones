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
    // con un dato de hace tres días, o de hoy pero sin cierre anterior, no hay de dónde medir: sin cambio en directo (antes,
    // el de las últimas 24 horas) y Mercados enseña el de precios.json, con su día
    Object.assign(m, { fecha: sumarDias(hoyIso(), -3), precio: 61000, cierre_anterior: 60000, variacion_dia: 1.5 });
    LIVE.alTickerBitvavo(tick);
    const viejo = { vivo: S.liveM['BTC-EUR'].var, var: datoMerc('BTC-EUR').var, dia: diaDatoMerc('BTC-EUR') };
    Object.assign(m, { fecha: hoyIso(), cierre_anterior: null });
    LIVE.alTickerBitvavo(tick);
    const sinCierre = S.liveM['BTC-EUR'].var;
    Object.assign(m, { fecha: sumarDias(hoyIso(), -1), precio: 61000, cierre_anterior: 60000 });
    LIVE.alTickerBitvavo(tick);
    return { viejo, sinCierre, hace3: sumarDias(hoyIso(), -3), deHoy, deAyer, precio: datoMerc('BTC-EUR').precio, pos: S.live.btc && S.live.btc.precio, ctx: contextoAsesor(S.M, 'revision', true).split('\n').find((l) => /\] Bitcoin:/.test(l)) };
  });
  expect(r.deHoy).toBeCloseTo(5, 5);
  expect(r.deAyer).toBeCloseTo((63000 / 61000 - 1) * 100, 5);
  expect(r.viejo).toEqual({ vivo: null, var: 1.5, dia: r.hace3 });
  expect(r.sinCierre).toBeNull();
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
    const chat = contextoAsesor(S.M, 'chat', true).split('\n').find((x) => /^- Ibex 35 /.test(x));
    const rep = () => fichaTexto(S.M.filas.find((f) => f.inst.id === 'repsol'));
    // un precio en directo de ayer (una pestaña abierta desde entonces) no hace «de hoy» el dato de un índice, ni con la hora en segundos
    S.precios.mercados['^IBEX'].fecha = sumarDias(hoyIso(), -2);
    S.liveM['^IBEX'] = { precio: 1, var: 0.5, t: Math.floor((Date.now() - 864e5) / 1000), fuente: 'Yahoo' };
    const tickAyer = diaDatoMerc('^IBEX');
    S.liveM['^IBEX'] = { precio: 1, var: null, t: Date.now(), fuente: 'Yahoo' };   // y uno de hoy sin su cambio: manda la fecha de precios.json
    const tickSinVar = diaDatoMerc('^IBEX');
    S.liveM = {};
    return { tickAyer, tickSinVar, hace1: ayer, hace2: sumarDias(hoyIso(), -2), repAhora: rep(), div: de(a, /^Dividendos de los próximos 12 meses/), ayer: diaConSemana(ayer), spA: de(a, /\] S&P 500:/), spB: de(b, /\] S&P 500:/), ibexB: de(b, /\] Ibex 35:/), repA: de(a, /acciones a .*€ \(aún/), btc: de(a, /^Tiene .* unidades a /), chat };
  });
  expect(r.spA).toContain(`(el ${r.ayer}, su última sesión,`);
  expect(r.spA).not.toContain('(hoy');
  expect(r.spB).toContain('(hoy');
  expect(r.ibexB).toContain(`(el ${r.ayer}, su última sesión,`);
  expect(r.chat).toContain(`: el ${r.ayer}, su última sesión,`);
  // las posiciones: sin precio de hoy, el último movimiento con su fecha; con precio de hoy, «hoy»
  expect(r.repA).toMatch(/\(aún sin precio de hoy: el último es del \S+ \d+ \S+ y ese día se movió /);
  expect(r.repA).not.toContain('precio en directo');
  expect(r.repAhora).toMatch(/acciones a .*€ \(hoy [+−-]?\d/);   // la de Repsol, que ya tiene precio de hoy
  expect(r.repAhora).not.toContain('sin precio de hoy');
  expect(r.tickAyer).toBe(r.hace1);
  expect(r.tickSinVar).toBe(r.hace2);
  expect(r.div).toContain('las fechas son aproximadas');
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
    texto: notasDe5([{ k: 'a', nota: '8/10' }, { k: 'b', nota: '6' }]).map((x) => x.nota),
    encargos: [pedidoAnalisisPublico(['repsol'], 'prueba', false), pedidoAnalisis(['repsol'], 'prueba', false)].map((t) => [/son enteros de 1 a 5/.test(t), /Di «hoy» solo de lo que en los datos es de hoy/.test(t)]),
  }));
  expect(r.de10).toEqual([3, 4, 3, 4, 2]);   // antes: 5, 5, 5, 5 y 4 puntos en Inicio, y «8 de 5» en la pestaña de la IA
  expect(r.de5).toEqual([4, 5, 2, 3, 0]);
  expect(r.nada).toEqual([]);
  expect(r.texto).toEqual([4, 3]);
  // y los dos encargos de la revisión (el público y el del fundador) lo piden así, con la regla del «hoy»
  expect(r.encargos).toEqual([[true, true], [true, true]]);
});

test('la beta dice contra qué índice se mide', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    const p = S.precios.instrumentos.repsol, fila = () => S.M.filas.find((f) => f.inst.id === 'repsol');
    p.beta = -0.54; p.beta_ref = '^IBEX'; p.fundamentales = { ...(p.fundamentales || {}), beta: -0.54 };
    pintar();
    const con = { etiqueta: etiquetaBeta(p), ia: fichaTexto(fila()) };
    delete p.beta_ref;   // un dato viejo, sin índice: la cifra sola, sin inventarle uno
    pintar();
    return { con, sin: { etiqueta: etiquetaBeta(p), ia: fichaTexto(fila()) } };
  });
  expect(r.con.etiqueta).toBe('Beta frente al Ibex 35 (último año)');
  expect(r.con.ia).toMatch(/beta [−-]0,54 frente al Ibex 35 \(último año, semana a semana\)/);
  expect(r.sin.etiqueta).toBe('Beta');
  expect(r.sin.ia).not.toContain('frente al Ibex');
});

test('en Mercados, si el dato no es de hoy no pone «Hoy»: pone el día, y el festivo si lo hay', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    const m = S.precios.mercados['^GSPC'], hoy = hoyIso(), ayer = sumarDias(hoy, -1), viejo = sumarDias(hoy, -10);
    S.liveM = {};
    Object.assign(m, { fecha: hoy, variacion_dia: -0.4 });
    const deHoy = [rotuloMovMerc('^GSPC', false), filaMercado('^GSPC', m, S.M)];
    m.fecha = ayer;
    const deAyer = [rotuloMovMerc('^GSPC', false), rotuloMovMerc('^GSPC', true), filaMercado('^GSPC', m, S.M), tarjetaMercado('^GSPC', m, S.M)];
    m.fecha = viejo;
    const deHace10 = rotuloMovMerc('^GSPC', true);
    // hoy Wall Street cierra por festivo: lo dice; el Ibex, que abre, no
    m.fecha = ayer; S.precios.mercados['^IBEX'].fecha = ayer;
    AG_CIERRES.push([hoy, 'us', 'Acción de Gracias']);
    const festivo = [rotuloMovMerc('^GSPC', true), rotuloMovMerc('^IBEX', true)];
    AG_CIERRES.pop();
    return { deHoy, deAyer, deHace10, festivo, dia: DIAS_LARGOS[deIso(ayer).getDay()], corta: fechaCorta(viejo) };
  });
  expect(r.deHoy[0]).toBe('Hoy baja');
  expect(r.deHoy[1]).toContain('<b>Hoy baja:</b>');
  expect(r.deAyer[0]).toBe(`El ${r.dia} bajó`);
  expect(r.deAyer[1]).toBe(`El ${r.dia} subió`);
  expect(r.deAyer[2]).toContain(`<b>El ${r.dia} bajó:</b>`);
  expect(r.deAyer[2]).not.toContain('Hoy baja');
  expect(r.deAyer[3]).not.toContain('Hoy baja');
  expect(r.deHace10).toBe(`El ${r.corta} subió`);
  expect(r.festivo).toEqual([`El ${r.dia} subió (hoy no abre por Acción de Gracias)`, `El ${r.dia} subió`]);
});
