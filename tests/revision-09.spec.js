// 0.9 · La revisión aparte de v0.9-rediseno (15 nov, claude/sesion-revision-09.md): una prueba por cada fallo arreglado.
// Hacienda en el Paso a paso (los datos fiscales con un 0, el impuesto de varias ventas juntas, los ETC, la regla de
// recompra de cada cosa), los pasos que se quedaban huérfanos, los textos, el modo fundador con ?dev fuera de este
// ordenador, la rueda de la cifra para quien usa lector de pantalla y el 3D que se puede quitar en Tú.
import { test as base, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

// una cuenta en fundador con la cartera de prueba, Repsol y BAT por encima de su límite (5 %). BAT va doblada: con sus
// cifras de siempre rondaba el 5,5 % y, según el precio del día, no pasaba del margen y el mes solo traía una venta
async function fundador(page) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async () => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false;
    S.acceso = 'privado';
    const bat = S.cartera.posiciones.find((p) => p.instrumento === 'bat');
    if (bat) { bat.cantidad *= 2; bat.coste *= 2; bat.lotes = (bat.lotes || []).map((l) => ({ ...l, u: l.u * 2, c: l.c * 2 })); }
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_empresa: 5 };
    await guardarCarteraCallada('prueba');
    S.M = calcular(); pintar();
  });
  await page.waitForFunction(() => typeof window.PASO_MES === 'function', null, { timeout: 20_000 });
  await page.evaluate(() => { cacheDe(S.M, '__ruta').delete('r'); pintar(); });
  await page.waitForTimeout(300); await quitarCapas(page);
}
const abrirPaso = async (page) => {
  await page.evaluate(() => { location.hash = 'ruta'; });
  await expect(page.locator('#panelPaso .pp-mes, #panelPaso .pp-vacio').first()).toBeVisible({ timeout: 20_000 });
};
// vuelve a calcular el mes desde cero (lo que cambia la prueba no siempre está en la clave de la caché)
const recalcular = (page) => page.evaluate(() => { S.M = calcular(); cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); cacheDe(S.M, '__plan').clear(); pintar(); });
const ventasDelMes = (page) => page.evaluate(() => { const R = mesRuta(S.M); return { hac: R.hac, hacHi: R.hacHi, av: R.avisos, ventas: R.hacer.filter((x) => /^venta:/.test(x.id)).map((x) => ({ g: x.ref.pl.ganancia, imp: x.ref.pl.impuesto, rango: x.rango || null, hc: x.hc[0] })) }; });

test('un 0 apuntado en tus datos fiscales cuenta como apuntado: fuera el aviso y el rango', async ({ page }) => {
  await fundador(page); await abrirPaso(page);
  await expect(page.locator('.pp-aviso[data-k="faltadato"]')).toBeVisible();
  // quien no tiene otras ventas ni dividendos escribe 0 y guarda: antes el aviso y el rango no se iban nunca
  await page.evaluate(() => { const a = new Date().getFullYear(); S.cartera.fiscal = { ...(S.cartera.fiscal || {}), [a]: { otras: 0, rcm: 0 } }; });
  await recalcular(page);
  await expect(page.locator('.pp-aviso[data-k="faltadato"]')).toHaveCount(0);
  const r = await ventasDelMes(page);
  expect(r.ventas.length).toBeGreaterThan(0);
  for (const v of r.ventas) { expect(v.rango).toBeNull(); expect(v.hc).not.toMatch(/\d a \d/); }
  expect(r.hacHi).toBeCloseTo(r.hac, 2);
  // y el paso «Apunta tus datos fiscales» se va de «Haz esto» (y del número del botón de arriba)
  const hayPaso = () => page.evaluate(() => pasosRuta0(S.M).mes.some((x) => /^fiscal:/.test(x.id)));
  expect(await hayPaso()).toBe(false);
  // sin nada escrito (lo guardado antes de la 0.9 con el formulario en blanco), sigue faltando
  await page.evaluate(() => { const a = new Date().getFullYear(); S.cartera.fiscal = { [a]: {} }; });
  await recalcular(page);
  await expect(page.locator('.pp-aviso[data-k="faltadato"]')).toBeVisible();
  expect(await hayPaso()).toBe(true);
  // desde la 0.9, guardar el formulario con las ventas y los dividendos en blanco los apunta como 0 (el campo enseña un 0)
  await page.evaluate(() => editarFiscal());
  await expect(page.locator('#fFis')).toBeVisible();
  await page.locator('#fFis button[type="submit"]').evaluate((b) => b.click());
  await expect(page.locator('#fFis')).toHaveCount(0);
  expect(await page.evaluate(() => { const d = datosFiscales(new Date().getFullYear()); return [d.otras, d.rcm, fiscalSinApuntar(new Date().getFullYear())]; })).toEqual([0, 0, false]);
  await recalcular(page);
  await expect(page.locator('.pp-aviso[data-k="faltadato"]')).toHaveCount(0);
});

test('Hacienda del mes es el impuesto de las ventas juntas, no la suma de cada una por separado', async ({ page }) => {
  await fundador(page);
  // 5.000 € de ganancias ya apuntadas este año: entre las dos ventas del mes se cruza el tramo de 6.000 € (del 19 al 21 %)
  await page.evaluate(() => { const a = new Date().getFullYear(); S.cartera.fiscal = { [a]: { otras: 5000, rcm: 0 } }; });
  await recalcular(page);
  const r = await ventasDelMes(page);
  expect(r.ventas.length).toBe(2);
  const G = r.ventas[0].g + r.ventas[1].g;
  expect(G).toBeGreaterThan(1000);   // si no, no se cruza el tramo y la prueba no prueba nada
  // a mano: los primeros 1.000 € al 19 % y el resto al 21 %
  const juntas = 1000 * 0.19 + (G - 1000) * 0.21, sueltas = r.ventas[0].imp + r.ventas[1].imp;
  expect(r.hac).toBeCloseTo(juntas, 1);
  expect(juntas - sueltas).toBeGreaterThan(5);
  await abrirPaso(page);
  const fmt = await page.evaluate((v) => eur(v, 0), juntas);
  await expect(page.locator('.pp-mes-c b').first()).toHaveText('+' + fmt);
  // cada paso sigue dando su impuesto como si fuera la única venta: el mes dice que la suya es la de las dos juntas
  await expect(page.locator('.pp-mes-c > div').first()).toContainText('juntas');
  // y la cuenta suelta, con números redondos: dos ventas de 4.000 € sin nada más son 1.560 €, no 760 + 760
  const j = await page.evaluate(() => { const a = new Date().getFullYear(); S.cartera.fiscal = { [a]: { otras: 0, rcm: 0 } }; S.M = calcular(); return { j: impuestoRangoJuntas([{ g: 4000 }, { g: 4000 }], a), u: impuestoRango(4000, a) }; });
  expect(j.j.lo).toBeCloseTo(6000 * 0.19 + 2000 * 0.21, 2); expect(j.j.hi).toBeCloseTo(j.j.lo, 2); expect(j.u.lo).toBeCloseTo(760, 2);
  // sin tus datos, el rango de las dos juntas: por arriba, todo al 21 %
  const s = await page.evaluate(() => { const a = new Date().getFullYear(); S.cartera.fiscal = {}; S.M = calcular(); return impuestoRangoJuntas([{ g: 4000 }, { g: 4000 }], a); });
  expect(s.lo).toBeCloseTo(1560, 2); expect(s.hi).toBeCloseTo(8000 * 0.21, 2);
});

test('el rango del impuesto de un ETC se calcula como rendimiento del capital, no como ganancia', async ({ page }) => {
  await fundador(page);
  const r = await page.evaluate(() => {
    const a = new Date().getFullYear();
    // una venta ya hecha este año con 1.000 € de pérdida (acciones) y nada apuntado en Datos fiscales
    S.cartera.fiscal = {}; S.cartera.movimientos = [...(S.cartera.movimientos || []), { id: 'mv-rev', tipo: 'venta', instrumento: 'repsol', fecha: `${a}-02-03`, resultado: -1000 }];
    S.M = calcular();
    return { etc: impuestoRango(500, a, { tipo: 'ETC' }), accion: impuestoRango(500, a, { tipo: 'Acción' }) };
  });
  // a mano: de los 500 € del ETC, la pérdida de las acciones solo quita el 25 % (125 €): 375 € al 19 % = 71,25 €
  expect(r.etc.lo).toBeCloseTo(71.25, 2);
  // por arriba, si ya llevaras 6.000 € de ganancias: los 500 € enteros al 19 % (los rendimientos empiezan su escala), 95 €
  expect(r.etc.hi).toBeCloseTo(95, 2);
  // y la ficha de una venta le pasa su instrumento a la cuenta (un ETC de la cartera, si lo hay)
  const ficha = await page.evaluate(() => { const a = new Date().getFullYear(), f = S.M.filas.find((x) => esRCMVenta(x.inst)); if (!f) return null; const pl = planVenta(f, S.M); return pl && pl.ganancia > 0 ? { lo: impuestoRango(pl.ganancia, a, f.inst).lo, imp: Math.max(0, pl.impuesto) } : null; });
  if (ficha) expect(ficha.lo).toBeCloseTo(ficha.imp, 1);
  // la misma ganancia en una acción sí se compensa entera con la pérdida: 0 €
  expect(r.accion.lo).toBeCloseTo(0, 2);
});

test('vender con pérdidas: la regla de recompra es la de cada cosa (un año en fondos, ninguna en cripto) y solo aplaza lo mismo en otra posición', async ({ page }) => {
  // el paso de vender con pérdidas solo existe de julio a diciembre (pasosRuta0): el resto del año no hay qué probar
  test.skip(new Date().getMonth() < 6, 'de enero a junio el Paso a paso no propone vender con pérdidas');
  await fundador(page);
  // la ficha del paso, directamente (en «Para decidir tú» solo sale cuando quedan menos de dos meses para el 31 dic)
  const dato = (id) => page.evaluate((id) => { const P = pasosRuta0(S.M), x = [...P.mes, ...P.seis].find((y) => y.id.startsWith('perdida:' + id + ':')); if (!x) return null; const fi = fichaPaso(x, S.M), d = fi.datos.find((q) => /recompra/i.test(q[0])); return { conf: fi.conf, d }; }, id);
  // el fondo de renta fija (p4): un año; lo vendes entero, así que la pérdida cuenta entera
  let f = await dato('p4');
  expect(f.d[0]).toBe('Regla de recompra: un año'); expect(f.d[3]).toBe('ok'); expect(f.conf).toBe('alta');
  // la cripto (p9): no se aplica
  const c = await dato('p9');
  expect(c.d[1]).toContain('no se aplica'); expect(c.d[3]).toBe('ok');
  // una compra de ese mismo fondo hace cinco meses, dentro de la posición que vendes: sale con ella, no aplaza nada
  await page.evaluate(() => { const p = S.cartera.posiciones.find((x) => x.id === 'p4'); p.lotes = [{ f: '2025-01-10', u: 20, c: 2513 }, { f: sumarMeses(hoyIso(), -5), u: 10, c: 1257 }]; });
  await recalcular(page);
  f = await dato('p4');
  expect(f.d[3]).toBe('ok'); expect(f.conf).toBe('alta');
  // el mismo fondo en otro bróker, comprado hace cinco meses (dentro del año, fuera de los dos meses): esa parte se aplaza
  await page.evaluate(() => { const p = S.cartera.posiciones.find((x) => x.id === 'p4'); delete p.lotes; S.cartera.posiciones.push({ id: 'p4b', instrumento: 'nb-short', plataforma: 'Otro bróker', cantidad: 2, coste: 236, fecha: sumarMeses(hoyIso(), -5), lotes: [{ f: sumarMeses(hoyIso(), -5), u: 2, c: 236 }] }); });
  await recalcular(page);
  f = await dato('p4');
  expect(f.d[3]).toBe('flojo'); expect(f.d[1]).toContain('otra posición'); expect(f.d[1]).toContain('se aplaza'); expect(f.conf).toBe('baja');
  // esa otra posición, comprada hace catorce meses: fuera del año, otra vez en regla
  await page.evaluate(() => { const p = S.cartera.posiciones.find((x) => x.id === 'p4b'); p.fecha = sumarMeses(hoyIso(), -14); p.lotes = [{ f: p.fecha, u: 2, c: 236 }]; });
  await recalcular(page);
  f = await dato('p4');
  expect(f.d[3]).toBe('ok'); expect(f.conf).toBe('alta');
});

test('con «Recortar lo que pasa de tu límite» apagada no quedan pasos huérfanos de esa venta', async ({ page }) => {
  await fundador(page);
  const ids = () => page.evaluate(() => { const P = pasosRuta0(S.M); return [...P.mes, ...P.seis].map((x) => x.id); });
  const antes = await ids();
  const recortes = await page.evaluate(() => S.M.filas.map((f) => planVenta(f, S.M)).filter((pl) => pl && pl.nivel === 'reducir').map((pl) => pl.f.pos.id));
  expect(recortes.length).toBeGreaterThan(0);
  const cuelga = (l, p) => l.filter((id) => new RegExp(`^(venta|colchonv|nucleo):${p}:`).test(id));
  expect(cuelga(antes, recortes[0]).length).toBeGreaterThan(1);   // la venta y, al menos, a dónde va lo que cobras
  await page.evaluate(() => { S.cartera.ruta = { ...(S.cartera.ruta || {}), ops: { limite: false } }; });
  await recalcular(page);
  const despues = await ids();
  for (const p of recortes) expect(cuelga(despues, p)).toEqual([]);
});

test('textos del Paso a paso: «no cuadra», sin «Cuándo cambia.» vacío, las acciones que tienes con decimales y lo de reinvertir', async ({ page }) => {
  await fundador(page); await abrirPaso(page);
  // ningún «Cuándo cambia.» sin nada detrás (salía en «Meter … en tu fondo»)
  const vacias = await page.evaluate(() => [...document.querySelectorAll('#panelPaso .pp-nota')].filter((p) => /^Cuándo cambia\.\s*$/.test(p.textContent.trim())).length);
  expect(vacias).toBe(0);
  // Repsol: tienes 228,61 acciones, no «229»
  const compr = await page.evaluate(() => { const R = mesRuta(S.M), x = R.hacer.find((y) => /^venta:/.test(y.id) && y.ref.pl.f.inst.id === 'repsol'); return x.compr.join(' | '); });
  expect(compr).toContain('228,61'); expect(compr).not.toContain('las 229 que');
  // reinvertir lo cobrado: no dice que los dividendos «ya tributaron» con la retención
  const imp = await page.evaluate(() => {
    const da = dividendosAnio; window.dividendosAnio = (M) => ({ ...da(M), de: [{ d: sumarDias(hoyIso(), -5), bruto: 100, n: 'IAG' }] });
    cacheDe(S.M, '__ruta').delete('r'); const x = pasosRuta0(S.M).mes.find((y) => /^reinv:/.test(y.id)); window.dividendosAnio = da; return x && x.imp;
  });
  expect(imp).toBeTruthy(); expect(imp).not.toContain('ya tributaron'); expect(imp).toContain('pago a cuenta');
  // un paso apartado: el texto dice «no cuadra», no el nombre de una función
  await page.evaluate(() => {
    const pv = planVenta;
    window.planVenta = (f, M) => { const p = pv(f, M); return p && f.inst.id === 'repsol' ? { ...p, importe: p.importe + 412 } : p; };
    cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); cacheDe(S.M, '__plan').clear(); pintar();
  });
  await expect(page.locator('.pp-fallo')).toHaveCount(1);
  const fallo = await page.locator('.pp-fallo').textContent();
  expect(fallo).toContain('no cuadra'); expect(fallo).not.toContain('ppCuadra');
});

test('en estándar, «Tu plan» ya no promete nada «en la 0.9»', async ({ page }) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  expect(await page.evaluate(() => S.acceso)).toBe('publico');
  await page.evaluate(() => { location.hash = 'ruta'; });
  await expect(page.locator('#vista .vista-cab h1')).toHaveText('Tu plan');
  await expect(page.locator('#vista')).not.toContainText('0.9');
  await expect(page.locator('#hTpLlega')).toHaveText('Llegará más adelante');
});

// ?dev y #github son para probar en este ordenador. En otra dirección (como toison.es) no dan el modo fundador a nadie:
// antes, una cuenta estándar que añadía ?dev abría su cartera en fundador (con ?dev no se lee el modo de la cuenta)
test('el modo fundador no se enciende desde fuera: con ?dev o #github en otra dirección, estándar', async ({ page }) => {
  const dist = join(process.cwd(), 'dist');
  await page.route('http://toison.prueba/**', (r) => {
    let p = new URL(r.request().url()).pathname.replace(/^\/app\//, '/'); if (p.endsWith('/')) p += 'index.html';
    const f = join(dist, p); if (!f.startsWith(dist) || !existsSync(f)) return r.fulfill({ status: 404, body: '' });
    const t = p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.json') ? 'application/json' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream';
    return r.fulfill({ status: 200, contentType: t, body: readFileSync(f) });
  });
  for (const cola of ['?dev', '?dev#cuenta', '#github']) {
    await page.goto('about:blank');
    await page.goto('http://toison.prueba/app/' + cola);
    await page.waitForFunction(() => typeof esPublico === 'function' && typeof pasoVisible === 'function', null, { timeout: 30_000 });
    expect(await page.evaluate(() => ({ publico: esPublico(), paso: pasoVisible() })), cola).toEqual({ publico: true, paso: false });
  }
  // en este ordenador (localhost) ?dev sigue dando el fundador para probar, y ?dev&publico, el estándar
  await page.goto('about:blank'); await page.goto('http://localhost:8766/?dev');
  await page.waitForFunction(() => typeof esPublico === 'function', null, { timeout: 30_000 });
  expect(await page.evaluate(() => esPublico())).toBe(false);
  await page.goto('about:blank'); await page.goto('http://localhost:8766/?dev&publico');
  await page.waitForFunction(() => typeof esPublico === 'function', null, { timeout: 30_000 });
  expect(await page.evaluate(() => esPublico())).toBe(true);
});

test('la rueda de la cifra no lee en voz alta la tira del 0 al 9: solo el dígito de verdad', async ({ page }) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false; LS.set('inv-mov-prueba', true); location.hash = 'posiciones'; });
  await expect(page.locator('#heroNum')).toHaveCount(0);
  await page.evaluate(() => { location.hash = 'cartera'; });
  const rd = page.locator('#heroNum [data-b="totalE"] .rd').first();
  await expect(rd).toBeVisible();
  // la tira es contenido de CSS con texto alternativo vacío (content: "…" / ""): el lector de pantalla se la salta
  // 0.9a: la página se repinta entera con cada dato que llega; se lee la rueda que está puesta en ese momento (antes se
  // leía la de la primera búsqueda, que a veces ya se había quitado, y daba vacío: fallaba a ratos en la Action)
  await expect.poll(() => page.evaluate(() => { const el = document.querySelector('#heroNum [data-b="totalE"] .rd'); return el ? getComputedStyle(el, '::before').content : ''; })).toMatch(/^.{10,}\/\s*""\s*$/s);
  // y el texto de verdad sigue dentro
  expect(await page.locator('#heroNum [data-b="totalE"]').textContent()).toMatch(/^\d{1,3}(\.\d{3})*$/);
});

test('el 3D se puede quitar en Tú, junto al acabado: «Plano» y no se vuelve a bajar', async ({ page }) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false; location.hash = 'tu'; });
  await expect(page.locator('[data-acabado-b="auto"]')).toBeVisible();
  const plano = page.locator('[data-volumen-b="0"]'), con = page.locator('[data-volumen-b="1"]');
  await expect(con).toHaveAttribute('aria-pressed', 'true');
  await plano.evaluate((b) => b.click());
  await expect(plano).toHaveAttribute('aria-pressed', 'true');
  await expect(con).toHaveAttribute('aria-pressed', 'false');
  // en las pruebas el 3D solo se baja si se pide (inv-3d-prueba): pedido y todo, con «Plano» no se baja
  await page.evaluate(() => LS.set('inv-3d-prueba', true));
  expect(await page.evaluate(() => ({ si: tresDSi(), ls: LS.get('inv-sin-3d', false) }))).toEqual({ si: false, ls: true });
  const pedidos = []; page.on('request', (r) => { if (/assets\/3d-/.test(r.url())) pedidos.push(r.url()); });
  await page.evaluate(() => { pintar(); pedir3D(true); }); await page.waitForTimeout(800);
  expect(pedidos).toEqual([]); expect(await page.evaluate(() => !!window.T3D)).toBe(false);
  // y se vuelve a poner: se baja al momento
  await con.evaluate((b) => b.click());
  await expect(con).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => ({ si: tresDSi(), ls: LS.get('inv-sin-3d', false) }))).toEqual({ si: true, ls: false });
  await page.waitForFunction(() => !!window.T3D, null, { timeout: 30_000 });
});
