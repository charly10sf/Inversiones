// Revisión de noche del 19 nov (claude/sesion-revision-noche-19nov.md): lo que recibe la IA.
// - simular_venta aplica la regla de recompra (antes daba la pérdida entera aunque hubiera compras en el plazo)
// - la foto dice qué pérdida de una venta apuntada no resta este año por una recompra
// - la foto marca el fondo con el valor liquidativo atascado
// - sin freno (el fundador con sus reglas), el Paso a paso entra con su motivo y sus impuestos
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

async function conCartera(page) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
}

test('simular_venta: con aportación automática al fondo, la pérdida de lo recomprado no resta este año', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    S.M = calcular();
    const f = buscarFila('ishares-us');
    const v = ejecutarHerramienta('simular_venta', { posicion: f.pos.id, porcentaje: 50 }, false);
    // la cuenta de antes: la pérdida entera
    const ingenua = impuestoDeVenta(v.ganancia_o_perdida, new Date().getFullYear(), f.inst);
    return { v, ingenua: { sobra: ingenua.despues.sobra } };
  });
  expect(r.v.ganancia_o_perdida).toBeLessThan(0);
  expect(r.v.regla_de_recompra).toBeTruthy();
  expect(r.v.regla_de_recompra.plazo).toBe('un año');
  expect(r.v.regla_de_recompra.perdida_que_no_resta_este_anio).toBeLessThan(0);
  expect(r.v.regla_de_recompra.nota).toContain('aportación automática');
  // lo que pasa a años siguientes ya no es la pérdida entera
  expect(r.v.renta.perdidas_para_anios_siguientes).toBeLessThan(r.ingenua.sobra - 1);
  expect(Math.abs(r.v.renta.perdidas_para_anios_siguientes - r.v.regla_de_recompra.perdida_que_no_resta_este_anio - r.ingenua.sobra)).toBeLessThan(0.05);
});

test('simular_venta: una cripto con pérdidas no lleva regla de recompra y una venta con ganancias tampoco', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    S.M = calcular();
    const out = {};
    for (const id of ['btc', 'phau']) { const f = buscarFila(id); out[id] = ejecutarHerramienta('simular_venta', { posicion: f.pos.id, porcentaje: 10 }, false); }
    return out;
  });
  expect(r.btc.regla_de_recompra).toBeUndefined();
  if (r.phau.ganancia_o_perdida > 0) expect(r.phau.regla_de_recompra).toBeUndefined();
});

test('simular_venta: una venta con ganancias no lleva regla de recompra; un ETC con pérdidas, la de dos meses', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    const p0 = S.precios.instrumentos.phau.precio;
    S.precios.instrumentos.phau = { ...S.precios.instrumentos.phau, precio: 400 };
    S.M = calcular();
    const gana = ejecutarHerramienta('simular_venta', { posicion: buscarFila('phau').pos.id, porcentaje: 10 }, false);
    S.precios.instrumentos.phau = { ...S.precios.instrumentos.phau, precio: 100 };
    S.M = calcular();
    const pierde = ejecutarHerramienta('simular_venta', { posicion: buscarFila('phau').pos.id, porcentaje: 10 }, false);
    S.precios.instrumentos.phau = { ...S.precios.instrumentos.phau, precio: p0 };
    return { gana, pierde };
  });
  expect(r.gana.ganancia_o_perdida).toBeGreaterThan(0);
  expect(r.gana.regla_de_recompra).toBeUndefined();
  expect(r.pierde.ganancia_o_perdida).toBeLessThan(0);
  expect(r.pierde.regla_de_recompra.plazo).toBe('dos meses');
  expect(r.pierde.tributa_como).toMatch(/capital mobiliario/);
});

test('simular_venta del fondo entero: aplaza lo que comprará la aportación automática y libera la pérdida aplazada de una venta anterior', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    (S.cartera.movimientos = S.cartera.movimientos || []).push({ id: 'm-y', fecha: sumarDias(hoyIso(), -60), tipo: 'venta', instrumento: 'ishares-us', plataforma: 'MyInvestor', uds: 80, precio: 12.6, importe: 1008, coste_vendido: 1658, resultado: -650 });
    S.M = calcular();
    const f = buscarFila('ishares-us');
    const v = ejecutarHerramienta('simular_venta', { posicion: f.pos.id }, false);
    const foto = contextoAsesor(S.M, 'chat', false);
    return { v, linea: foto.split('\n').find((l) => l.startsWith('Si vendiera hoy cada posición entera')), aplazadaAntes: perdidaAplazada(S.cartera.movimientos.at(-1)) };
  });
  const rr = r.v.regla_de_recompra;
  expect(r.aplazadaAntes.importe).toBeLessThan(0);
  // vendiéndolo todo no queda nada de antes: solo lo que comprará la aportación en un año (unos 7.200 €, una parte)
  expect(rr.por_compras_de_antes).toBeUndefined();
  expect(rr.por_la_aportacion_automatica_de_los_proximos_meses).toBeLessThan(0);
  expect(-rr.perdida_que_no_resta_este_anio).toBeLessThan(-r.v.ganancia_o_perdida * 0.5);
  // y los 650 € de la venta anterior vuelven a restar
  expect(rr.perdida_aplazada_de_ventas_anteriores_que_vuelve_a_restar).toBeCloseTo(r.aplazadaAntes.importe, 1);
  expect(r.linea).toMatch(/S&P 500 −[\d.]+ € \(con su aportación automática activa, unos [\d.]+ € de esa pérdida no restarían este año/);
});

test('la foto dice que la pérdida de una venta apuntada no resta este año si hubo recompra', async ({ page }) => {
  await conCartera(page);
  const t = await page.evaluate(() => {
    const hoy = hoyIso(), f0 = sumarDias(hoy, -10);
    (S.cartera.movimientos = S.cartera.movimientos || []).push({ id: 'm-x', fecha: f0, tipo: 'venta', instrumento: 'ishares-us', plataforma: 'MyInvestor', uds: 50, precio: 12, importe: 600, coste_vendido: 1090, resultado: -490 });
    S.M = calcular();
    return contextoAsesor(S.M, 'chat', false);
  });
  expect(t).toMatch(/resultado [^;\n]*490[^;\n]*; de esa pérdida, [^;\n]+ no restan este año por la regla de recompra/);
});

test('la foto marca el fondo con el valor liquidativo atascado (y no el que va con su día de retraso)', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    const viejo = habilAntes(habilAntes(habilAntes(hoyIso())));
    S.precios.instrumentos['nb-short'] = { ...S.precios.instrumentos['nb-short'], fecha: viejo };
    // (revisión aparte M5: el de emergentes, con su día normal de retraso, fijo: no dependa de los datos ni de los festivos)
    S.precios.instrumentos['vanguard-em'] = { ...S.precios.instrumentos['vanguard-em'], fecha: habilAntes(hoyIso()) };
    S.M = calcular();
    const t = contextoAsesor(S.M, 'chat', false);
    const trozo = (id) => { const i = t.indexOf(`### ${S.inst[id].corto}`); return t.slice(i, t.indexOf('\n###', i + 4)); };
    return { nb: trozo('nb-short'), em: trozo('vanguard-em') };
  });
  expect(r.nb).toContain('valor liquidativo atascado');
  expect(r.em).not.toContain('atascado');
});

test('sin freno, el Paso a paso entra en la foto con su motivo y sus impuestos; con las del estándar, igual que antes', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    S.M = calcular();
    const P = pasosRuta(S.M), limpio = (t) => String(t || '').replace(/<[^>]+>/g, '');
    const conPq = PLAZOS.flatMap(([k]) => P[k]).filter((x) => x.fuente === 'web' && x.pq).map((x) => limpio(x.pq).slice(0, 40));
    return { fund: contextoAsesor(S.M, 'chat', false), conPq };
  });
  expect(r.fund).toContain('## Su Paso a paso en Toisón');
  expect(r.fund).toContain('si recomiendas algo distinto, dilo y explica por qué');
  for (const pq of r.conPq) expect(r.fund).toContain(pq);
});

test('la foto: vender todo un fondo con aportación automática avisa de la recompra; sin entidades HTML ni análisis vacío', async ({ page }) => {
  await conCartera(page);
  const t = await page.evaluate(() => {
    S.ia = { reglas: ['No meto más del 20 % en acciones sueltas'] };
    S.M = calcular();
    return contextoAsesor(S.M, 'chat', false);
  });
  const linea = t.split('\n').find((l) => l.startsWith('Si vendiera hoy cada posición entera'));
  expect(linea).toMatch(/S&P 500 −[\d.]+ € \(con su aportación automática activa, unos [\d.]+ € de esa pérdida no restarían este año/);
  expect(t).not.toMatch(/&amp;|&nbsp;|&lt;|&gt;/);
  expect(t).not.toContain('## Análisis de partida publicado ()');
  expect(t).toContain('## Sus reglas de inversión');
});

test('al pasar de sin freno a las reglas del estándar (el «no» del Worker) se repintan los botones «Pregúntale»', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(async () => {
    S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); LS.del('inv-ia-fundador-no');
    const antes = preguntasDelEstandar();
    let n = 0; const orig = window.pintar; window.pintar = (...a) => { n++; return orig(...a); };
    marcarSinFreno(false);
    await new Promise((res) => setTimeout(res, 50));
    const tras = preguntasDelEstandar(), nNo = n;
    marcarSinFreno(false);   // otro «no» seguido: nada cambia, no se repinta
    await new Promise((res) => setTimeout(res, 50));
    const nOtra = n;
    marcarSinFreno(true);
    await new Promise((res) => setTimeout(res, 50));
    window.pintar = orig;
    return { antes, tras, nNo, nOtra, nSi: n, ahora: preguntasDelEstandar() };
  });
  expect(r.antes).toBe(false);
  expect(r.tras).toBe(true);
  expect(r.nNo).toBe(1);
  expect(r.nOtra).toBe(1);
  expect(r.nSi).toBe(2);
  expect(r.ahora).toBe(false);
});

test('sin freno, si le escribe en inglés contesta en inglés; las instrucciones del estándar no cambian', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => ({ f: instruccionesAsesor(false), e: instruccionesAsesor(true), nf: NOTA_CLAUDE_FUNDADOR, ne: NOTA_CLAUDE }));
  expect(r.f).toContain('Si te escribe en otro idioma (en inglés, por ejemplo), contesta entero en ese idioma.');
  // y delante de todo, en la nota del fundador (Haiku no lo hacía con la regla solo en las instrucciones)
  expect(r.nf).toContain('Contesta en el idioma de su último mensaje');
  expect(r.ne).not.toContain('Contesta en el idioma de su último mensaje');
  expect(r.e).not.toContain('contesta entero en ese idioma');
});

test('sin freno, las instrucciones llevan las cuentas que se confundían en el banco; el estándar no', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => ({ f: instruccionesAsesor(false), e: instruccionesAsesor(true) }));
  for (const t of ['Cuentas que se confunden', 'ahorro_en_la_renta de simular_venta', 'el mismo ISIN', 'con_dinero_que_ya_tiene_pct', 'cada cifra de la lista es un pago', 'valor liquidativo está atascado', 'no se libera al pasar el plazo', 'No multipliques la pérdida por el tipo', 'En un traspaso entre fondos no cuenta ni la ganancia ni la pérdida']) {
    expect(r.f).toContain(t);
    expect(r.e).not.toContain(t);
  }
});

test('la foto no cambia de un minuto a otro (va en la caché de Claude): hora al cuarto de hora y la de los datos, fija', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-18T22:31:10') });
  await conCartera(page);
  // la foto entera y sin el directo (revisión aparte I3: sin él decía «Precios: hace 2 h», y el escaneo, «(hace 17 h)»)
  await page.evaluate(async () => { await cargarEscaneo().catch(() => {}); await cargarFichas().catch(() => {}); LIVE.yahoo = 'off'; LIVE.bitvavo = 'off'; });
  const foto = () => page.evaluate(() => { LIVE.yahoo = 'off'; LIVE.bitvavo = 'off'; S.M = calcular(); return contextoAsesor(S.M, 'chat', false); });
  // antes, que termine de cargar lo que se baja después de abrir (el radar entero pasa de unas 900 a unas 2.800 empresas)
  for (let k = 0; k < 3; k++) { await page.clock.runFor(20_000); await page.waitForTimeout(1500); }
  const a = await foto();
  await page.clock.runFor(4 * 60_000);
  await page.waitForTimeout(1500);
  const b = await foto();
  // (la página puede ir en otra zona horaria que la prueba: solo se mira que va al cuarto de hora; son y 31, así que y media)
  expect(a.split('\n')[0]).toMatch(/hacia las \d{2}:30$/);
  expect(a).not.toMatch(/\bhace \d+ (min|h)\b|ahora mismo/);
  expect(b).toBe(a);
});
