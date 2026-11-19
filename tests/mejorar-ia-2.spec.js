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
  // lo que le queda de las de años anteriores tras cada venta (la que gana las gasta enteras; la que pierde, ninguna)
  expect(r.gan.perdidas_de_anios_anteriores).toMatchObject({ pendientes: 300, usadas_con_esta_venta: 300, le_quedan_despues_de_esta_venta: 0 });
  expect(r.f.renta.perdidas_de_anios_anteriores).toMatchObject({ pendientes: 300, usadas_con_esta_venta: 0, le_quedan_despues_de_esta_venta: 300 });
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
  expect(Object.keys(r.juntas)[0]).toBe('todas_juntas'); // delante: es lo que hay que dar
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
  // con 60 € más no cabe, y dice cómo quedaría
  expect(r.pasa.cabe_como_mucho.este_importe.con_dinero_nuevo).toMatch(/^no cabe: quedaría en el 20,0\d % \(su límite, 20 %\); como mucho, [\d.]+ €$/);
  // con el máximo, después ya no cabe casi nada
  expect(r.justo.cabe_como_mucho.este_importe.despues_aun_cabrian.si_era_dinero_nuevo.con_dinero_nuevo_eur).toBeLessThanOrEqual(1);
  expect(r.sin.precio_aprox_eur).toBeUndefined(); // sin importe, solo el máximo
  expect(r.justo.total_a_pagar).toBeGreaterThan(0);
  // el estándar, como estaba: sin importe es un error y con importe no lleva el máximo; un fondo tampoco
  expect(r.est.error).toBe('Falta el importe en euros.');
  expect(r.estCon.cabe_como_mucho).toBeUndefined();
  expect(r.fondo.cabe_como_mucho).toBeUndefined();
});

test('simular_compra sin freno: dinero suyo y dinero nuevo mezclados, el hueco que queda después y el límite de cripto', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    S.cartera.limite_acciones = 20; S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_empresa: 10, limite_cripto: 5 };
    S.M = calcular();
    const T = S.M.total, sueltas = S.M.filas.filter((y) => y.inst.tipo === 'Acción').reduce((a, y) => a + y.valor, 0);
    const c0 = ejecutarHerramienta('simular_compra', { empresa: 'iag' }, false).cabe_como_mucho;
    // 240 € suyos más dinero nuevo hasta el máximo «con dinero nuevo»: con la mezcla no cabe (los dos máximos no se suman)
    const mezcla = ejecutarHerramienta('simular_compra', { empresa: 'iag', importe: c0.con_dinero_nuevo_eur, dinero_nuevo: c0.con_dinero_nuevo_eur - 240 }, false).cabe_como_mucho.este_importe;
    // lo más que cabe con 240 € suyos: x nuevo con (sueltas + 240 + x) ≤ 0,2 (T + x)
    const xMax = Math.floor((0.2 * T - sueltas - 240) / 0.8);
    const justo = ejecutarHerramienta('simular_compra', { empresa: 'iag', importe: 240 + xMax, dinero_nuevo: xMax }, false).cabe_como_mucho.este_importe;
    const btc = S.M.filas.find((x) => x.inst.clase === 'Cripto'), vB = btc ? btc.valor : 0;
    const cr = btc ? ejecutarHerramienta('simular_compra', { empresa: btc.pos.id, importe: 300 }, false).cabe_como_mucho : null;
    return { T, sueltas, mezcla, justo, xMax, vB, cr, crEst: btc ? ejecutarHerramienta('simular_compra', { empresa: btc.pos.id, importe: 300 }, true).cabe_como_mucho : undefined };
  });
  expect(r.mezcla.resultado).toMatch(/^no cabe: quedaría en el 20,\d\d % \(su límite, 20 %\)$/);
  expect(r.mezcla.asi_quedaria.acciones_sueltas_pct).toBeGreaterThan(20);
  expect(r.justo.resultado).toBe('cabe');
  expect(r.justo.asi_quedaria.acciones_sueltas_pct).toBeLessThanOrEqual(20);
  expect(r.justo.despues_aun_cabrian.con_dinero_nuevo_eur).toBeLessThanOrEqual(1);
  // cripto: su límite del 5 %, y lo que cabría después de meter 300 €
  expect(r.cr).toBeTruthy();
  const maxT = Math.max(0, Math.floor(0.05 * r.T - r.vB));
  expect(r.cr.con_dinero_que_ya_tiene_eur).toBe(maxT);
  expect(r.cr.por_acciones_sueltas).toBeUndefined();
  expect(r.cr.lo_que_frena).toContain('cripto');
  if (maxT >= 300) expect(r.cr.este_importe.despues_aun_cabrian.si_era_dinero_que_ya_tiene.con_dinero_que_ya_tiene_eur).toBe(maxT - 300);
  expect(r.crEst).toBeUndefined();
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
  for (const t of ['una sola llamada a simular_venta con «ventas»', 'cabe_como_mucho de simular_compra', 'orden_de_compensar de simular_venta', 'va con su fuente y su enlace al lado', 'una aerolínea no es una petrolera', 'un horizonte largo no se contradicen', 'Di de qué es cada porcentaje', 'le_quedan_despues_de_esta_venta de simular_venta', 'por traspaso desde uno de ellos sin tributar', 'dile además que lo apunte en la app como efectivo', 'Su colchón es la cifra de sus datos']) {
    expect(r.ins, t).toContain(t);
    expect(r.insE, t).not.toContain(t);
  }
});

// Parte D: la revisión diaria del fundador. Lo que seguía fallando en su banco (0 de 7) va en su pedido; el del estándar no cambia
// (su huella está en tests/mejorar-ia.spec.js)
test('el pedido de la revisión del fundador lleva lo de Hacienda, las monedas, el relleno y la constancia; el del estándar, no', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => ({ f: pedidoAnalisis(['repsol'], 'prueba', false, true, false), e: pedidoAnalisisPublico(['repsol'], 'prueba', false, true) }));
  for (const t of ['no pongas el 19 % de España como la retención en origen de una extranjera', 'un fondo de inversión, un año; una acción o un ETF de una bolsa de la UE, dos meses', 'es de una venta que no ha hecho', 'no los pases a libras, peniques ni dólares', 'Sus metas y su colchón, solo si algo de hoy los cambia', 'Cada "por_que" lleva al menos una cifra', 'copia de la anterior el "nivel" de cada posición', '«Hoy corta dividendo»', 'son las del ex-dividendo', 'está por debajo (di el hueco que queda)', 'cada aportación es una compra', 'ninguna frase dirigida a ti', 'nunca «$» en un precio suyo']) {
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

test('sin freno, cada posición en pérdidas lleva su plazo de recompra; con las reglas del estándar, no', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    const pos = S.cartera.posiciones.find((x) => /^Fondo/.test(S.inst[x.instrumento].tipo || '')), iag = S.cartera.posiciones.find((x) => x.instrumento === 'iag');
    S.M = calcular();
    for (const p of [pos, iag]) { const f = S.M.filas.find((x) => x.pos === p); p.lotes = [{ f: '2024-01-10', u: f.uds, c: f.valor + 1000 }]; p.coste = f.valor + 1000; }
    S.M = calcular();
    const bloque = (t, f) => { const i = t.indexOf(`### ${f.inst.corto} (id "${f.pos.id}")`); return t.slice(i, t.indexOf('\n### ', i + 5) > 0 ? t.indexOf('\n### ', i + 5) : i + 4000); };
    const ff = S.M.filas.find((x) => x.pos === pos), fi = S.M.filas.find((x) => x.pos === iag), gana = S.M.filas.find((x) => x.valor - x.coste > 500);
    const f = contextoAsesor(S.M, 'chat', false), e = contextoAsesor(S.M, 'chat', true);
    return { fondo: bloque(f, ff), iag: bloque(f, fi), gana: bloque(f, gana), e };
  });
  expect(r.fondo).toContain('Si vende con pérdidas: el plazo de recompra de esta posición es de un año (es un fondo)');
  expect(r.iag).toContain('Si vende con pérdidas: el plazo de recompra de esta posición es de dos meses, antes y después de vender');
  expect(r.gana).not.toContain('Si vende con pérdidas');
  expect(r.e).not.toContain('Si vende con pérdidas');
});

// Revisión aparte (19 nov): I4, I5 y los menores de las herramientas
test('revisión aparte: un ETC con pérdidas dice lo que guarda en su saldo, el País Vasco no cruza, y un límite del 100 % no da Infinity', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    const anio = String(new Date().getFullYear());
    S.cartera.fiscal = { [anio]: { otras: 120, rcm: 85, pendientes: 300 } };
    S.cartera.movimientos = []; S.cartera.aportaciones = [];
    S.M = calcular();
    const etc = S.M.filas.find((x) => x.inst.tipo === 'ETC'), iag = S.M.filas.find((x) => x.inst.id === 'iag');
    for (const f of [etc, iag]) { f.pos.lotes = [{ f: '2024-01-10', u: f.uds, c: f.valor + 1500 }]; f.pos.coste = f.valor + 1500; }
    S.M = calcular();
    const vEtc = ejecutarHerramienta('simular_venta', { posicion: etc.pos.id }, false).renta;
    const motor = fiscalAnio(+anio, 0, -(1500 + 0));
    S.cartera.perfil = { ...(S.cartera.perfil || {}), comunidad: 'paisvasco' };
    const vasco = ejecutarHerramienta('simular_venta', { posicion: iag.pos.id }, false).renta.orden_de_compensar;
    S.cartera.perfil = { ...S.cartera.perfil, comunidad: 'madrid', limite_empresa: 100 }; S.cartera.limite_acciones = 100;
    const sinTope = JSON.stringify(ejecutarHerramienta('simular_compra', { empresa: 'iag', importe: 500 }, false));
    return { vEtc, sobraRCM: motor.sobraRCM, vasco, sinTope };
  });
  // el ETC: lo que pasa a años siguientes va en su saldo de rendimientos negativos, y cuadra con el orden
  const o = r.vEtc.orden_de_compensar;
  expect(o.primero_resta_de_sus_rendimientos_del_anio).toBe(85);
  expect(o.despues_de_sus_ganancias_hasta_el_25_pct).toBeCloseTo(30, 2);
  expect(r.vEtc.rendimientos_negativos_para_anios_siguientes).toBeCloseTo(o.pasa_a_los_4_anios_siguientes, 1);
  expect(r.vEtc.rendimientos_negativos_para_anios_siguientes).toBeGreaterThan(1000);
  // País Vasco: no se cruza con dividendos, y la nota no lo dice como si sí
  expect(r.vasco.despues_de_sus_dividendos_e_intereses_hasta_el_25_pct).toBe(0);
  expect(r.vasco.nota).not.toContain('hasta el 25 %');
  expect(r.vasco.nota).toContain('en su territorio foral no se cruza');
  // con los límites al 100 %: «sin límite», nunca null ni Infinity
  expect(r.sinTope).toContain('"con_dinero_nuevo_eur":"sin límite"');
  expect(r.sinTope).not.toMatch(/Infinity|NaN|"con_dinero_(nuevo|que_ya_tiene)_eur":null/);
});
