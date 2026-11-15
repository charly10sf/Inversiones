// 0.9 · El Paso a paso del modo fundador (maqueta del 15 nov, claude/decisiones-15nov-maqueta-paso-hoy.md): el botón en el
// hueco de GTA VI, la página del mes con los pasos plegados y su dibujo, la confianza y los datos de cada paso, las doce
// opciones y los siete casos de datos que faltan o fallan. En el modo estándar no existe ni se puede encender desde fuera.
import { test as base, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { preparar, crearCuenta, meterCartera, quitarCapas, tocar } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

// una cuenta en fundador con la cartera de prueba, Repsol por encima de su límite (8 %) y un reparto objetivo por fondo
async function fundador(page, { reparto = true, limite = 5 } = {}) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async ([reparto, limite]) => {
    // la hoja de «Primeros pasos» sale sola al rato de crear la cuenta (en la Action, a veces encima de un botón)
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false;
    S.acceso = 'privado';
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_empresa: limite };
    if (reparto) S.cartera.perfil.reparto_fondos = { 'ishares-us': 30, 'amundi-europe': 40 };
    await guardarCarteraCallada('prueba');
    S.M = calcular(); pintar();
  }, [reparto, limite]);
  // el cálculo del mes está en el trozo «paso»: en fundador se baja solo al pintar
  await page.waitForFunction(() => typeof window.PASO_MES === 'function', null, { timeout: 20_000 });
  await page.evaluate(() => { cacheDe(S.M, '__ruta').delete('r'); pintar(); });
  await page.waitForTimeout(300); await quitarCapas(page);
}
async function abrirPaso(page) {
  await page.evaluate(() => { location.hash = 'ruta'; });
  await expect(page.locator('#panelPaso .pp-mes, #panelPaso .pp-vacio').first()).toBeVisible({ timeout: 20_000 });
}

test('el botón de arriba cuenta lo que queda y la página enseña el mes con los pasos plegados', async ({ page }) => {
  await fundador(page);
  const boton = page.locator('#pasoTop .pb');
  await expect(boton).toBeVisible();
  const n = await page.evaluate(() => pendientesMes(mesRuta(S.M)));
  expect(n).toBeGreaterThan(0);
  await expect(boton.locator('.pb-n')).toHaveText(String(n));
  await boton.click();
  await expect(page.locator('#panelPaso .pp-mes')).toBeVisible();
  await expect(page.locator('#pasoTop .pb')).toHaveClass(/aqui/);
  // el aro dice cuántos quedan; todos los pasos, plegados
  await expect(page.locator('.pp-aro b')).toHaveText(String(n));
  const pasos = page.locator('.pp-rcol .tarea.pp-paso');
  expect(await pasos.count()).toBeGreaterThan(0);
  for (const d of await page.locator('.pp-rcol .pp-det').all()) await expect(d).toBeHidden();
  // la venta de Repsol: su dibujo (el peso frente a tu límite) y lo de Hacienda, en la fila
  const venta = page.locator('.tarea.pp-paso[data-id^="venta:"]').first();
  await expect(venta.locator('.pp-vf .pp-bar-m')).toBeAttached();
  await expect(venta.locator('.pp-vf-v')).toContainText('límite 5 %');
  await expect(venta.locator('.pp-hc')).toContainText('Hacienda');
  await expect(venta.locator('.pp-conf-s')).toBeVisible();
  // al tocarla se abre: el porqué, la confianza con sus datos y las cuentas comprobadas
  await venta.locator('.pp-fila').click();
  await expect(venta.locator('.pp-det')).toBeVisible();
  await venta.locator('.pp-conf').click();
  await expect(venta.locator('.pp-datos li').first()).toBeVisible();
  await expect(venta.locator('.pp-compr li').first()).toContainText('×');
  await expect(venta.locator('.pp-base-d')).toContainText('Cuándo cambia');
});

test('«Tu mes» en Hoy: los pasos de «Haz esto» con su confianza, y lo de decidir aparte', async ({ page }) => {
  await fundador(page);
  await page.evaluate(() => { location.hash = 'cartera'; });
  const der = page.locator('#vista .toca .iac-der');
  await expect(der).toBeVisible();
  await expect(der.locator('h3')).toHaveText('Tu mes');
  await expect(der.locator('li .pp-med').first()).toBeAttached();
  const r = await page.evaluate(() => { const R = mesRuta(S.M); return { primero: R.hacer.find((x) => !x.hecho).t.replace(/<[^>]+>/g, ''), decidir: R.decidir.length }; });
  await expect(der.locator('li b').first()).toHaveText(r.primero.replace(/ €/g, '\u00a0€'));
  if (r.decidir) await expect(der.locator('.iac-pie')).toHaveText(`y ${r.decidir} para decidir tú`);
});

test('marcar un paso hecho baja el número del botón y llena el aro', async ({ page }) => {
  await fundador(page); await abrirPaso(page);
  const antes = await page.evaluate(() => pendientesMes(mesRuta(S.M)));
  await page.locator('.pp-rcol .tarea.pp-paso:not(.pp-decidir) .t-check').first().click();
  await expect(page.locator('#pasoTop .pb-n')).toHaveText(antes - 1 ? String(antes - 1) : '✓');
  await expect(page.locator('.pp-aro')).not.toHaveAttribute('style', /--p:0\b/);
});

test('la confianza sale de la regla: tus datos y precios, alta; analistas, media; un dato viejo, un escalón menos', async ({ page }) => {
  await fundador(page);
  const r = await page.evaluate(() => ({
    alta: confDe([['a', '', '', 'ok', 'tuyo'], ['b', '', '', 'ok', 'precio']]),
    media: confDe([['a', '', '', 'ok', 'tuyo'], ['b', '', '', 'ok', 'analistas']]),
    baja: confDe([['a', '', '', 'flojo', 'prensa']]),
    contradice: confDe([['a', '', '', 'ok', 'tuyo']], true),
    viejo: confDe([['a', '', '', 'viejo', 'precio']]),
    vieja2: confDe([['a', '', '', 'viejo', 'precio'], ['b', '', '', 'ok', 'analistas']]),
  }));
  expect(r).toEqual({ alta: 'alta', media: 'media', baja: 'baja', contradice: 'baja', viejo: 'media', vieja2: 'baja' });
});

test('la aportación va al fondo más lejos de su objetivo, con su dibujo y sus cuentas', async ({ page }) => {
  await fundador(page); await abrirPaso(page);
  const ap = page.locator('.tarea.pp-paso[data-id^="aportd:"]');
  await expect(ap).toHaveCount(1);
  await expect(ap.locator('.t-t')).toContainText('MSCI Europe');
  await expect(ap.locator('.pp-hc')).toHaveText(/Sin impuestos/);
  await expect(ap.locator('.pp-vf')).toHaveCount(2);
  await expect(ap.locator('.pp-chip.pp-nuevo')).toBeVisible();
  // sin reparto objetivo, no sale
  await page.evaluate(async () => { delete S.cartera.perfil.reparto_fondos; cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); pintar(); });
  await expect(page.locator('.tarea.pp-paso[data-id^="aportd:"]')).toHaveCount(0);
});

test('«Qué mira cada mes»: doce opciones, diez encendidas, el umbral del 10 % y apagar una quita sus pasos', async ({ page }) => {
  await fundador(page); await abrirPaso(page);
  await tocar(page, '[data-pp-sub="opciones"]');
  await expect(page.locator('.pp-op')).toHaveCount(12);
  await expect(page.locator('.pp-sw[aria-checked="true"]')).toHaveCount(10);
  await expect(page.locator('.pp-sw[data-pp-op="oport"]')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.pp-sw[data-pp-op="cripto"]')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('[data-pp-caida="10"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.pp-sw[data-pp-op="aport"]').click();
  await expect(page.locator('.pp-sw[data-pp-op="aport"]')).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => S.cartera.ruta.ops.aport)).toBe(false);
  await page.locator('[data-pp-caida="15"]').click();
  expect(await page.evaluate(() => umbralCaida())).toBe(15);
  await page.locator('[data-pp-sub="mes"]').first().click();
  await expect(page.locator('.tarea.pp-paso[data-id^="aportd:"]')).toHaveCount(0);
  // el reparto por fondo se pone en la misma hoja
  await tocar(page, '[data-pp-sub="opciones"]');
  await page.locator('[data-pp-rep="amundi-europe"]').fill('35');
  await page.locator('[data-pp-rep="amundi-europe"]').dispatchEvent('change');
  expect(await page.evaluate(() => S.cartera.perfil.reparto_fondos['amundi-europe'])).toBe(35);
});

test('lo de confianza baja va a «Para decidir tú» con sus salidas y no cuenta como pendiente', async ({ page }) => {
  await fundador(page);
  const r = await page.evaluate(() => {
    const R = mesRuta(S.M);
    return { decidirBaja: R.decidir.filter((x) => x.conf === 'baja').length, hacerBaja: R.hacer.filter((x) => x.conf === 'baja').length, pend: pendientesMes(R), hacer: R.hacer.filter((x) => !x.hecho).length };
  });
  expect(r.hacerBaja).toBe(0);
  expect(r.pend).toBe(r.hacer);
  // una idea del radar con señales que se contradicen (cae mucho por debajo de su media): baja, aparte y con salidas
  await page.evaluate(() => {
    const t = radarVals().find((x) => x.m50 > 0 && x.p > 0);
    t.m50 = t.p * 1.4; t.mx = t.p * 2.7; t.pot = 108;
    const x = { id: 'compra:prueba', t: 'Comprar algo', ref: { top: t } };
    window.__f = fichaPaso(x, S.M);
  });
  expect(await page.evaluate(() => window.__f.conf)).toBe('baja');
  expect(await page.evaluate(() => window.__f.pist.some((p) => p[1] === 'mal'))).toBe(true);
});

test('un paso cuya cuenta no cuadra se aparta entero y los demás siguen', async ({ page }) => {
  await fundador(page);
  await page.evaluate(() => {
    const pv = planVenta;
    window.planVenta = (f, M) => { const p = pv(f, M); return p && f.inst.id === 'repsol' ? { ...p, importe: p.importe + 412 } : p; };
    cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); cacheDe(S.M, '__plan').clear();
  });
  await abrirPaso(page);
  await expect(page.locator('.pp-fallo')).toHaveCount(1);
  await expect(page.locator('.pp-fallo')).toContainText('no ha pasado sus comprobaciones');
  await expect(page.locator('.tarea.pp-paso[data-id^="venta:"]', { hasText: 'Repsol' })).toHaveCount(0);
  await expect(page.locator('.pp-fallo')).toContainText('Repsol');
  await expect(page.locator('.pp-r-datos b')).toHaveText(/apartado/);
});

test('los casos de datos: falta un dato tuyo (rango), un dato viejo, sin conexión y la IA sin repasar', async ({ page, context }) => {
  await fundador(page); await abrirPaso(page);
  // sin tus datos fiscales: el impuesto de la venta es un rango y sale el aviso
  const venta = page.locator('.tarea.pp-paso[data-id^="venta:"]').first();
  await expect(page.locator('.pp-aviso[data-k="faltadato"]')).toBeVisible();
  await expect(venta.locator('.pp-hc')).toHaveText(/\d a \d/);
  // con ellos apuntados, una cifra
  await page.evaluate(() => { const a = new Date().getFullYear(); S.cartera.fiscal = { ...(S.cartera.fiscal || {}), [a]: { otras: 0.01, rcm: 50 } }; S.M = calcular(); pintar(); });
  await expect(page.locator('.pp-aviso[data-k="faltadato"]')).toHaveCount(0);
  // un precio de hace una semana: aviso arriba y el paso baja un escalón
  const antes = await page.evaluate(() => (() => { const R = mesRuta(S.M); return [...R.hacer, ...R.decidir].find((x) => /^venta:/.test(x.id) && x.ref.pl.f.inst.id === 'repsol').conf; })());
  await page.evaluate(() => { const f = S.M.filas.find((x) => x.inst.id === 'repsol'); f.p.fecha = sumarDias(hoyIso(), -9); cacheDe(S.M, '__mes').delete('m'); pintar(); });
  await expect(page.locator('.pp-aviso[data-k="viejo"]')).toBeVisible();
  const despues = await page.evaluate(() => (() => { const R = mesRuta(S.M); return [...R.hacer, ...R.decidir].find((x) => /^venta:/.test(x.id) && x.ref.pl.f.inst.id === 'repsol').conf; })());
  expect(CONF[despues]).toBe(CONF[antes] - 1);
  // la IA y el radar sin repasar
  await page.evaluate(() => { S.precios.radar_generado = sumarDias(hoyIso(), -4) + 'T08:00:00Z'; cacheDe(S.M, '__mes').delete('m'); pintar(); });
  await expect(page.locator('.pp-aviso[data-k="iacaida"]')).toBeVisible();
  // sin conexión: lo último calculado, con su hora
  await context.setOffline(true);
  await page.evaluate(() => { cacheDe(S.M, '__mes').delete('m'); pintar(); });
  await expect(page.locator('.pp-aviso[data-k="sinred"]')).toBeVisible();
  await expect(page.locator('.pp-r-datos b')).toHaveText('Sin actualizar');
  await context.setOffline(false);
});
const CONF = { baja: 1, media: 2, alta: 3 };

test('nada este mes: la página lo dice y el botón enseña una marca', async ({ page }) => {
  await fundador(page, { reparto: false, limite: 30 });
  await page.evaluate(async () => {
    // nada que hacer: sin aportaciones, todo dentro de tus límites y lo que quede, hecho
    S.cartera.aportaciones = []; S.cartera.efectivo = [];
    S.cartera.ruta = { ops: Object.fromEntries(['limite', 'efectivo', 'idea', 'fiscal', 'fechas', 'tesis', 'reinv', 'caida', 'costes'].map((k) => [k, false])) };
    S.M = calcular();
    const R = mesRuta(S.M); for (const x of R.hacer) S.cartera.ruta.hechos = { ...(S.cartera.ruta.hechos || {}), [x.id]: hoyIso() };
    for (const x of R.apartados) S.cartera.ruta.pospuestos = { ...(S.cartera.ruta.pospuestos || {}), [x.x.id]: '2999-01' };
    S.cartera.ruta.hechos = S.cartera.ruta.hechos || {};
    cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); pintar();
  });
  await expect(page.locator('#pasoTop .pb-n')).toHaveText('✓');
  await abrirPaso(page);
  await expect(page.locator('.pp-frase')).toContainText(/nada|todo hecho/);
});

test('en estándar no existe: ni botón, ni página, ni «Tu mes»; con el modo sin leer, tampoco', async ({ page }) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  expect(await page.evaluate(() => S.acceso)).toBe('publico');
  await expect(page.locator('#pasoTop')).toBeHidden();
  await page.evaluate(() => { location.hash = 'ruta'; });
  await expect(page.locator('#vista .vista-cab h1')).toHaveText('Tu plan');
  await expect(page.locator('#panelPaso')).toHaveCount(0);
  expect(await page.evaluate(() => pasosRuta(S.M).mes.length + mesRuta(S.M).hacer.length)).toBe(0);
  // en estándar el trozo del Paso a paso ni se baja
  expect(await page.evaluate(() => typeof window.PASO_MES)).toBe('undefined');
  // fundador guardado pero provisional (dispositivo nuevo, sin haber leído la cuenta): no se enseña
  await page.evaluate(() => { S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: null, t: Date.now(), provisional: true }); pintar(); });
  await expect(page.locator('#pasoTop')).toBeHidden();
  await expect(page.locator('#vista .vista-cab h1')).toHaveText('Tu plan');
});

// ?dev pone el modo fundador sin cuenta: solo vale en este ordenador. En otra dirección (como toison.es), no
test('desde fuera no se enciende: con ?dev en otra dirección, «Tu plan»', async ({ page }) => {
  const dist = join(process.cwd(), 'dist');
  await page.route('http://toison.prueba/**', (r) => {
    let p = new URL(r.request().url()).pathname.replace(/^\/app\//, '/'); if (p.endsWith('/')) p += 'index.html';
    const f = join(dist, p); if (!f.startsWith(dist) || !existsSync(f)) return r.fulfill({ status: 404, body: '' });
    const t = p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.json') ? 'application/json' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream';
    return r.fulfill({ status: 200, contentType: t, body: readFileSync(f) });
  });
  await page.goto('http://toison.prueba/app/?dev#ruta');
  await page.waitForFunction(() => typeof pasoVisible === 'function', null, { timeout: 30_000 });
  expect(await page.evaluate(() => ({ dev: CFG.dev, visible: pasoVisible() }))).toEqual({ dev: true, visible: false });
});
