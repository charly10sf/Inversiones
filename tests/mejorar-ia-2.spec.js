// Mejorar la IA, segunda vuelta (19 nov 2026, claude/sesion-mejorar-ia-2.md), parte C: lo que seguía fallando en el banco
// del fundador se arregla en las herramientas, no con más frases en el prompt:
// - simular_venta devuelve el orden de compensar una pérdida con sus cifras (Haiku lo contaba al revés: f05, f47);
// - simular_venta calcula varias ventas juntas (Sonnet sumaba a mano el impuesto de venderlo todo: f33);
// - simular_compra da lo máximo que cabe en sus límites (3.900 € «justo bajo el 20 %» quedaban en el 20,05 %: f21).
// Todo solo con las reglas del fundador: las herramientas del estándar no cambian.
import { test as base, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

async function conCartera(page) { await crearCuenta(page); await quitarCapas(page); await meterCartera(page); }

test('simular_venta sin freno: el orden de compensar una pérdida, con sus cifras; con las reglas del estándar, no', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    const anio = String(new Date().getFullYear());
    // 120 € de ganancias del año, 85 € de dividendos y 300 € de pérdidas de años anteriores (como la cartera del banco)
    S.cartera.fiscal = { [anio]: { otras: 120, rcm: 85, pendientes: 300 } };
    S.cartera.movimientos = []; S.cartera.aportaciones = [];
    const pos = S.cartera.posiciones.find((x) => x.instrumento === 'iag');
    S.M = calcular();
    const f0 = S.M.filas.find((x) => x.pos === pos);
    pos.lotes = [{ f: '2024-01-10', u: f0.uds, c: f0.valor + 1000 }]; pos.coste = f0.valor + 1000;
    S.M = calcular();
    const f = ejecutarHerramienta('simular_venta', { posicion: pos.id }, false), e = ejecutarHerramienta('simular_venta', { posicion: pos.id }, true);
    // una venta con ganancia no lleva orden
    const g = S.M.filas.find((x) => x.valor - x.coste > 500);
    return { f, e, gan: ejecutarHerramienta('simular_venta', { posicion: g.pos.id }, false).renta };
  });
  const P = -r.f.ganancia_o_perdida;
  expect(P).toBeGreaterThan(990);
  const o = r.f.renta.orden_de_compensar;
  expect(o).toBeTruthy();
  expect(o.perdida_que_cuenta_este_anio).toBeCloseTo(P, 2);
  expect(o.primero_resta_de_sus_ganancias_del_anio).toBe(120);
  expect(o.despues_de_sus_dividendos_e_intereses_hasta_el_25_pct).toBeCloseTo(21.25, 2);
  expect(o.pasa_a_los_4_anios_siguientes).toBeCloseTo(P - 120 - 21.25, 2);
  // las de años anteriores van después: sin la venta se usaban contra los 120 € (y el 25 % de los dividendos); con ella, ninguna
  expect(o.perdidas_de_anios_anteriores).toEqual({ pendientes: 300, se_usaban_sin_esta_venta: 141.25, se_usan_con_esta_venta: 0, quedan_para_despues: 300 });
  expect(o.nota).toContain('van DESPUÉS de las de este año');
  expect(o.nota).toContain('quedan 300 € para años siguientes');
  // cuadra con lo demás: lo que pasa a años siguientes es lo de esta pérdida más las pendientes
  expect(r.f.renta.perdidas_para_anios_siguientes).toBeCloseTo(o.pasa_a_los_4_anios_siguientes + 300, 2);
  expect(r.e.renta.orden_de_compensar).toBeUndefined();
  expect(r.gan.orden_de_compensar).toBeUndefined();
});

test('simular_venta sin freno: varias ventas juntas dan el impuesto de todas a la vez, no la suma', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    const anio = new Date().getFullYear();
    S.cartera.fiscal = { [String(anio)]: { otras: 0, rcm: 0 } };
    S.cartera.movimientos = []; S.cartera.aportaciones = [];
    const pos = S.cartera.posiciones.find((x) => x.instrumento === 'iag');
    S.M = calcular();
    const f0 = S.M.filas.find((x) => x.pos === pos);
    pos.lotes = [{ f: '2024-01-10', u: f0.uds, c: f0.valor + 1000 }]; pos.coste = f0.valor + 1000;
    S.M = calcular();
    const g = S.M.filas.filter((x) => !esRCMVenta(x.inst) && x.inst.clase !== 'Cripto').sort((a, b) => (b.valor - b.coste) - (a.valor - a.coste))[0];
    const una = ejecutarHerramienta('simular_venta', { posicion: g.pos.id }, false), otra = ejecutarHerramienta('simular_venta', { posicion: pos.id }, false);
    const juntas = ejecutarHerramienta('simular_venta', { ventas: [{ posicion: g.pos.id }, { posicion: pos.id }] }, false);
    const motor = impuestoDeVentas([{ g: una.ganancia_o_perdida, inst: g.inst }, { g: otra.ganancia_o_perdida, inst: S.inst.iag }], anio).impuesto;
    const todas = ejecutarHerramienta('simular_venta', { todas: true }, false);
    const dos = ejecutarHerramienta('simular_venta', { ventas: [{ posicion: pos.id, porcentaje: 50 }, { posicion: 'iag' }] }, false);
    const est = ejecutarHerramienta('simular_venta', { ventas: [{ posicion: g.pos.id }] }, true);
    return { una, otra, juntas, motor, nTodas: todas.ventas && todas.ventas.length, nFilas: S.M.filas.filter((x) => x.uds && x.precio).length, todasImp: todas.todas_juntas, dos, est, paso: [pasoTxt('simular_venta', { ventas: [{ posicion: 'Repsol' }, { posicion: 'BAT' }] }), pasoTxt('simular_venta', { todas: true }), pasoTxt('simular_compra', { empresa: 'IAG' })] };
  });
  expect(r.una.impuesto_extra_en_la_renta).toBeGreaterThan(50);
  expect(r.otra.ganancia_o_perdida).toBeLessThan(-990);
  const j = r.juntas.todas_juntas;
  expect(r.juntas.ventas).toHaveLength(2);
  expect(j.ganancia_o_perdida).toBeCloseTo(r.una.ganancia_o_perdida + r.otra.ganancia_o_perdida, 1);
  expect(j.impuesto_extra_en_la_renta).toBeCloseTo(Math.max(0, r.motor), 2);
  // la pérdida de una resta de la ganancia de la otra: menos que el impuesto de la que gana, sola
  expect(j.impuesto_extra_en_la_renta).toBeLessThan(r.una.impuesto_extra_en_la_renta - 100);
  expect(r.juntas.ventas[0].si_solo_vendiera_esta.impuesto_extra).toBeCloseTo(r.una.impuesto_extra_en_la_renta, 2);
  expect(j.queda_tras_apartar_el_impuesto).toBeCloseTo(j.cobras - j.impuesto_extra_en_la_renta, 2);
  expect(j.nota).toContain('no sumes los de cada una');
  expect(r.nTodas).toBe(r.nFilas);
  expect(r.todasImp.impuesto_extra_en_la_renta).toBeGreaterThanOrEqual(0);
  expect(r.dos.error).toContain('sale dos veces');
  // con las reglas del estándar, «ventas» no existe: sin «posicion» no encuentra nada
  expect(r.est.error).toBeTruthy();
  expect(r.paso).toEqual(['Calcula las 2 ventas juntas de Repsol y BAT, con FIFO e impuestos', 'Calcula la venta de todo, con FIFO e impuestos', 'Calcula cuánto cabe de IAG en tus límites']);
});

test('simular_compra sin freno: lo máximo que cabe en sus límites, con dinero nuevo y con el que ya tiene', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    S.cartera.limite_acciones = 20; S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_empresa: 10 };
    S.M = calcular();
    const T = S.M.total, sueltas = S.M.filas.filter((y) => y.inst.tipo === 'Acción').reduce((a, y) => a + y.valor, 0);
    const iag = S.M.filas.find((x) => x.inst.id === 'iag'), vIag = (pesoLim(iag, S.M) / 100) * T;
    const sin = ejecutarHerramienta('simular_compra', { empresa: 'iag' }, false);
    const c = sin.cabe_como_mucho, justo = ejecutarHerramienta('simular_compra', { empresa: 'iag', importe: c.con_dinero_nuevo_eur }, false), pasa = ejecutarHerramienta('simular_compra', { empresa: 'iag', importe: c.con_dinero_nuevo_eur + 60 }, false);
    const fondo = S.M.filas.find((x) => /^Fondo/.test(x.inst.tipo));
    return { T, sueltas, vIag, sin, justo, pasa, est: ejecutarHerramienta('simular_compra', { empresa: 'iag' }, true), estCon: ejecutarHerramienta('simular_compra', { empresa: 'iag', importe: 500 }, true), fondo: ejecutarHerramienta('simular_compra', { empresa: fondo.pos.id, importe: 500 }, false) };
  });
  const c = r.sin.cabe_como_mucho, { T, sueltas, vIag } = r;
  expect(sueltas / T).toBeLessThan(0.2); // la cartera de prueba deja hueco
  // con dinero nuevo: el mayor x entero con (v + x) / (T + x) ≤ L, en los dos límites
  const maxN = (L, v) => Math.max(0, Math.floor((L * T - v) / (1 - L))), maxT = (L, v) => Math.max(0, Math.floor(L * T - v));
  expect(c.por_acciones_sueltas.con_dinero_nuevo_eur).toBe(maxN(0.2, sueltas));
  expect(c.por_acciones_sueltas.con_dinero_que_ya_tiene_eur).toBe(maxT(0.2, sueltas));
  expect(c.por_empresa.con_dinero_nuevo_eur).toBe(maxN(0.1, vIag));
  expect(c.con_dinero_nuevo_eur).toBe(Math.min(maxN(0.2, sueltas), maxN(0.1, vIag)));
  expect(c.con_dinero_que_ya_tiene_eur).toBe(Math.min(maxT(0.2, sueltas), maxT(0.1, vIag)));
  expect(c.con_dinero_nuevo_eur).toBeGreaterThan(c.con_dinero_que_ya_tiene_eur);
  // con el máximo no se pasa ninguno; con 60 € más, sí
  const q = c.asi_quedaria_con_el_maximo.con_dinero_nuevo;
  expect(q.acciones_sueltas_pct).toBeLessThanOrEqual(20); expect(q.esta_empresa_pct).toBeLessThanOrEqual(10);
  expect(r.justo.cabe_como_mucho.este_importe.con_dinero_nuevo).toBe('cabe');
  expect(r.pasa.cabe_como_mucho.este_importe.con_dinero_nuevo).toMatch(/^no cabe: se pasa por 60 €/);
  expect(r.sin.precio_aprox_eur).toBeUndefined(); // sin importe, solo el máximo
  expect(r.justo.total_a_pagar).toBeGreaterThan(0);
  // el estándar, como estaba: sin importe es un error y con importe no lleva el máximo; un fondo tampoco
  expect(r.est.error).toBe('Falta el importe en euros.');
  expect(r.estCon.cabe_como_mucho).toBeUndefined();
  expect(r.fondo.cabe_como_mucho).toBeUndefined();
});

test('las herramientas del estándar no cambian; las del fundador llevan las ventas juntas y el máximo que cabe', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => ({ e: JSON.stringify(herramientasPara(false)), base: JSON.stringify(HERRAMIENTAS.map((h) => ({ name: h.name, description: h.description, input_schema: h.input_schema }))), f: herramientasPara(true), ins: instruccionesAsesor(false), insE: instruccionesAsesor(true) }));
  expect(r.e).toBe(r.base);
  expect(createHash('sha256').update(r.e).digest('hex').slice(0, 16)).toBe('a8fb38af1ac846ec');
  const v = r.f.find((h) => h.name === 'simular_venta'), c = r.f.find((h) => h.name === 'simular_compra');
  expect(Object.keys(v.input_schema.properties)).toEqual(expect.arrayContaining(['ventas', 'todas']));
  expect(v.input_schema.required).toBeUndefined();
  expect(c.input_schema.required).toEqual(['empresa']);
  expect(c.description).toContain('cabe_como_mucho');
  expect(r.f.map((h) => h.name)).toEqual(JSON.parse(r.e).map((h) => h.name));
  for (const t of ['una sola llamada a simular_venta con «ventas»', 'cabe_como_mucho de simular_compra', 'orden_de_compensar de simular_venta', 'va con su fuente y su enlace al lado']) {
    expect(r.ins, t).toContain(t);
    expect(r.insE, t).not.toContain(t);
  }
});

// Parte D: la revisión diaria del fundador. Lo que seguía fallando en su banco (0 de 7) va en su pedido; el del estándar no cambia
// (su huella está en tests/mejorar-ia.spec.js)
test('el pedido de la revisión del fundador lleva lo de Hacienda, las monedas, el relleno y la constancia; el del estándar, no', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => ({ f: pedidoAnalisis(['repsol'], 'prueba', false, true, false), e: pedidoAnalisisPublico(['repsol'], 'prueba', false, true) }));
  for (const t of ['el 19 % retenido es solo de las españolas', 'un fondo de inversión, un año; una acción o un ETF de una bolsa de la UE, dos meses', 'es de una venta que no ha hecho', 'no los pases a libras, peniques ni dólares', 'Sus metas y su colchón, solo si algo de hoy los cambia', 'Cada "por_que" lleva al menos una cifra', 'copia de la anterior el "nivel" de cada posición', '«Hoy corta dividendo»']) {
    expect(r.f, t).toContain(t);
    expect(r.e, t).not.toContain(t);
  }
});

// Parte F (menores): la foto sin freno enseña como mucho 6 posiciones en «lo que más mueve»; si hay más con precio de hoy, dice cuántas quedan fuera y lo que suman
test('sin freno, «lo que más mueve» dice cuántas posiciones con precio de hoy quedan fuera de la lista', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso(), I = S.precios.instrumentos;
    // todas las posiciones con precio de hoy y un movimiento distinto
    S.cartera.posiciones.forEach((p, k) => { const x = I[p.instrumento]; if (x && x.precio) I[p.instrumento] = { ...x, fecha: hoy, cierre_anterior: x.precio / (1 + (k + 1) / 100) }; });
    S.M = calcular();
    const con = S.M.filas.filter((f) => f.varDia != null && Math.abs(f.dia) >= 0.5).sort((a, b) => Math.abs(b.dia) - Math.abs(a.dia));
    return { n: con.length, resto: Math.round(con.slice(6).reduce((a, f) => a + f.dia, 0)), f: contextoAsesor(S.M, 'chat', false), e: contextoAsesor(S.M, 'chat', true) };
  });
  expect(r.n).toBeGreaterThan(6);
  const m = r.f.match(/y (\d+) (posición|posiciones) más con precio de hoy, que suman ([+−-][\d.]+) €/);
  expect(m, r.f.slice(r.f.indexOf('Lo de hoy sale solo'), r.f.indexOf('Lo de hoy sale solo') + 500)).toBeTruthy();
  expect(+m[1]).toBe(r.n - 6);
  expect(Math.abs(+m[3].replace('−', '-').replace(/\./g, '') - r.resto)).toBeLessThanOrEqual(1);
  expect(r.e).not.toContain('más con precio de hoy');
});
