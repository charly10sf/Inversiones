// Las gráficas de 1M a Máx de lo que no trae la Action (10 nov). WDC (del radar) solo tenía un año de cierres semanales:
// la ficha en 1M enseñaba 4 o 5 puntos, en 3A, 5A y Máx no pasaba de un año y en la cartera iba a saltos. Ahora la web
// pide el histórico diario largo al Worker (/historico); si un periodo pide más de lo que hay, lo dice; y si el Worker no
// responde, dibuja lo que hay y avisa de que solo son cierres semanales. Aquí: el Worker con fetch de imitación, y la
// web con el Worker imitado.
import { test as base, expect } from '@playwright/test';
import worker from '../worker/src/index.js';
import { preparar, crearCuenta, meterCartera, quitarCapas, tocar } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

const DIA = 864e5;
const hoy0 = Math.floor(Date.now() / DIA) * DIA;
// días de diario (sin fines de semana) hacia atrás desde hoy, como los da Yahoo (segundos, a la apertura de Nueva York)
const diasHabiles = (n) => { const out = []; for (let t = hoy0; out.length < n; t -= DIA) { const d = new Date(t).getUTCDay(); if (d && d < 6) out.unshift(t / 1000 + 14.5 * 3600); } return out; };
// semanas hacia atrás, fechadas en lunes (como Yahoo)
const lunes = (n) => { let t = hoy0; while (new Date(t).getUTCDay() !== 1) t -= DIA; return Array.from({ length: n }, (_, k) => (t - (n - 1 - k) * 7 * DIA) / 1000 + 14.5 * 3600); };
const grafico = (moneda, ts, f) => ({ chart: { result: [{ meta: { currency: moneda, gmtoffset: -18000 }, timestamp: ts, indicators: { quote: [{ close: ts.map((_, k) => f(k)) }] } }] } });

function cacheDeMentira() {
  const m = new Map();
  return { m, default: { match: async (r) => (m.has(r.url) ? new Response(m.get(r.url)) : undefined), put: async (r, res) => { m.set(r.url, await res.text()); } } };
}

test('el Worker da el histórico diario de 2 años y semanal hasta 10, en euros, con caché y con límite', async () => {
  const pedidas = [];
  const fetchAntes = globalThis.fetch, cachesAntes = globalThis.caches;
  globalThis.caches = cacheDeMentira();
  globalThis.fetch = async (url) => {
    url = String(url); pedidas.push(url);
    const sim = decodeURIComponent((url.match(/chart\/([^?]+)/) || [])[1] || ''), sem = /interval=1wk/.test(url);
    if (sim === 'WDC') return new Response(JSON.stringify(sem ? grafico('USD', lunes(520), (k) => 40 + k * 0.1) : grafico('USD', diasHabiles(500), (k) => 100 + k)));
    // 1 EUR = 1,25 USD siempre: 100 $ son 80 €
    if (sim === 'EURUSD=X') return new Response(JSON.stringify(sem ? grafico('USD', lunes(520), () => 1.25) : grafico('USD', diasHabiles(500), () => 1.25)));
    // un fondo de la CNMV, en euros: sin el semanal no pasa nada (se queda con los 2 años)
    if (sim === '0P0000TEST.F') return sem ? new Response('', { status: 500 }) : new Response(JSON.stringify(grafico('EUR', diasHabiles(500), (k) => 10 + k / 100)));
    if (sim === 'RARA-EUR') return new Response('{}', { status: 404 });
    if (url.startsWith('https://api.bitvavo.com/v2/RARA-EUR/candles')) return new Response(JSON.stringify(Array.from({ length: 30 }, (_, k) => [hoy0 - k * DIA, '1', '1', '1', String(30 - k), '10'])));
    if (sim === 'NOEXISTE') return new Response('{}', { status: 404 });
    if (sim === 'ROTO') return new Response('', { status: 500 });
    throw new Error('fuera de la prueba: ' + url);
  };
  try {
    const pedir = (q, origen = 'https://charly10sf.github.io') => worker.fetch(new Request(`https://w.prueba/historico?s=${q}`, { headers: { Origin: origen } }), {}, { waitUntil() {} });
    let j = await (await pedir('wdc,0P0000TEST.F,RARA-EUR,NOEXISTE,ROTO')).json();
    expect(j.ok).toBe(true);
    const w = j.h.WDC;
    // en orden, sin repetidos, con fechas de día
    expect(w.every((x, k) => /^\d{4}-\d\d-\d\d$/.test(x[0]) && (!k || w[k - 1][0] < x[0]))).toBe(true);
    // los 2 últimos años, diarios y en euros (el último: 599 $ / 1,25)
    expect(w[w.length - 1][1]).toBeCloseTo(599 / 1.25, 3);
    const dosAnios = new Date(Date.now() - 700 * DIA).toISOString().slice(0, 10);
    expect(w.filter(([d]) => d >= dosAnios).length).toBeGreaterThan(450);
    // antes, semanal en viernes, hasta 10 años
    const viejo = w.filter(([d]) => d < new Date(Date.now() - 740 * DIA).toISOString().slice(0, 10));
    expect(viejo.length).toBeGreaterThan(350);
    expect(viejo.every(([d]) => new Date(d + 'T12:00:00Z').getUTCDay() === 5)).toBe(true);
    expect(w[0][0] < new Date(Date.now() - 9.5 * 365 * DIA).toISOString().slice(0, 10)).toBe(true);
    expect(j.h['0P0000TEST.F'].length).toBe(500);
    expect(j.h['RARA-EUR'].length).toBe(30);
    expect(j.h['RARA-EUR'][29][1]).toBe(30);
    expect(j.h.NOEXISTE).toEqual([]);
    expect(j.fallos).toEqual(['ROTO']);

    // la segunda vez, de la caché: a Yahoo solo se le vuelve a preguntar por el que falló
    pedidas.length = 0;
    j = await (await pedir('WDC,ROTO')).json();
    expect(j.h.WDC.length).toBe(w.length);
    expect(pedidas.every((u) => u.includes('/ROTO'))).toBe(true);

    // como mucho 8 por llamada
    globalThis.fetch = async () => new Response('{}', { status: 404 });
    j = await (await pedir(Array.from({ length: 11 }, (_, k) => `X${k}`).join(','))).json();
    expect(Object.keys(j.h).length).toBe(8);
    expect(j.fuera.length).toBe(3);
    expect((await pedir('')).status).toBe(400);
    expect((await pedir('WDC', 'https://otra.web')).status).toBe(403);
    expect((await (await worker.fetch(new Request('https://w.prueba/salud'), {}, { waitUntil() {} })).json()).historico).toBe(true);
  } finally {
    globalThis.fetch = fetchAntes; globalThis.caches = cachesAntes;
  }
});

/* la web, con el Worker imitado: WDC (del radar) con 10 años (diario los 2 últimos); NUEVA, una que salió hace 200 días */
const isoDe = (t) => new Date(t).toISOString().slice(0, 10);
function serieLarga() {
  const out = [];
  for (let t = hoy0 - 3650 * DIA; t <= hoy0; t += DIA) {
    const d = new Date(t).getUTCDay(), viejo = t < hoy0 - 730 * DIA;
    if ((viejo && d !== 5) || (!viejo && (!d || d === 6))) continue;
    const k = (t - (hoy0 - 3650 * DIA)) / DIA;
    out.push([isoDe(t), +(40 + k * 0.06 + 8 * Math.sin(k / 40)).toFixed(2)]);
  }
  return out;
}
async function conWDC(page, context, { falla = false } = {}) {
  const pedidos = [];
  await context.route('https://*.workers.dev/historico**', (r) => {
    const s = new URL(r.request().url()).searchParams.get('s') || '';
    pedidos.push(s);
    if (falla) return r.fulfill({ status: 502, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":false,"error":"yahoo"}' });
    const h = {};
    for (const sim of s.split(',')) h[sim] = sim === 'WDC' ? serieLarga() : sim === 'NUEVA' ? serieLarga().slice(-140) : [];
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, h, fallos: [], fuera: [] }) });
  });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.waitForFunction(() => typeof radarPorSim === 'function' && !!radarPorSim('WDC'), null, { timeout: 20000 });
  const id = await page.evaluate(async () => {
    const inst = instDeRadar('WDC');
    S.cartera.posiciones.push({ id: 'pwdc', instrumento: inst, plataforma: 'Trade Republic', cantidad: 10, coste: 800, fecha: '2025-01-10' });
    await guardarCartera('prueba');
    pintar();
    return inst;
  });
  return { pedidos, id };
}
// cuántos cierres de la ficha caen en el periodo
const puntosFicha = (page, dias) => page.evaluate((dias) => { const f = filaFicha(), desde = iso(new Date(Date.now() - dias * 864e5)); return (f.hist || []).filter(([d]) => d >= desde).length; }, dias);
const caminoGraf = (page) => page.locator('#fichaGraf svg').first().evaluate((s) => s.innerHTML);

test('una acción del radar tiene sus gráficas de 1M a Máx con cierres de cada día, y la cartera también', async ({ page, context, errores }) => {
  const { pedidos, id } = await conWDC(page, context);
  await page.evaluate(() => { S.fichaRango = '1M'; abrirFicha('pwdc', 'resumen'); });
  await page.waitForFunction((id) => HIST_MAS[id] && HIST_MAS[id].h.length > 800, id, { timeout: 15000 });
  await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
  // 1M: unas 21 sesiones, no 4 o 5 cierres semanales
  expect(await puntosFicha(page, 31)).toBeGreaterThanOrEqual(20);
  expect(await puntosFicha(page, 366)).toBeGreaterThan(240);
  await expect(page.locator('#fichaNotaGraf')).toBeHidden();
  // solo se pide lo que no trae la Action
  expect(pedidos.join(',')).toContain('WDC');
  expect(pedidos.join(',')).not.toContain('REP.MC');

  // 1A, 3A, 5A y Máx dibujan cosas distintas (antes, de 1A en adelante era siempre el mismo año)
  const caminos = {};
  for (const r of ['1A', '3A', '5A', 'Máx']) {
    await tocar(page, `#fichaFondo .tabs [data-frango="${r}"]`);
    await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
    caminos[r] = await caminoGraf(page);
  }
  expect(new Set(Object.values(caminos)).size).toBe(4);
  await expect(page.locator('#fichaCab')).toContainText(new Date(Date.now() - 3650 * DIA).getFullYear().toString());
  // no se vuelve a pedir lo que ya está en memoria
  expect(pedidos.filter((s) => s.includes('WDC')).length).toBe(1);

  // la cartera en 1M se mueve con WDC cada día (sin el histórico diario, iba a saltos de semana en semana)
  const r = await page.evaluate((id) => {
    const M = calcular(), con = serieCartera(M, 31);
    const guardado = HIST_MAS[id]; delete HIST_MAS[id]; HIST_PEND.add(id);
    const sin = serieCartera(calcular(), 31); HIST_PEND.delete(id); HIST_MAS[id] = guardado;
    const f = M.filas.find((x) => x.inst.id === id);
    return { n: con.length, dias: f.hist.filter(([d]) => d >= iso(new Date(Date.now() - 31 * 864e5))).length, cambia: con.some((x, k) => { const y = sin.find((z) => z.d === x.d); return y && Math.abs(x.v - y.v) > 1; }) };
  }, id);
  expect(r.dias).toBeGreaterThanOrEqual(20);
  expect(r.n).toBeGreaterThanOrEqual(20);
  expect(r.cambia).toBe(true);
});

test('si un periodo pide más de lo que hay, lo dice en vez de dibujar lo mismo, y Máx lo enseña todo', async ({ page, context, errores }) => {
  const { id } = await conWDC(page, context);
  // una acción que salió a bolsa hace unos 200 días (140 sesiones)
  await page.evaluate(async () => {
    const i = { id: 'nueva', nombre: 'Nueva SA', corto: 'Nueva', tipo: 'Acción', clase: 'Renta variable', region: { EEUU: 100 }, yahoo: 'NUEVA' };
    S.inst.nueva = i; S.instOrden.push('nueva');
    S.cartera.posiciones.push({ id: 'pnueva', instrumento: 'nueva', plataforma: 'Trade Republic', cantidad: 5, coste: 500, fecha: '2026-06-01' });
    await guardarCartera('prueba'); pintar();
  });
  await page.waitForFunction(() => HIST_MAS.nueva && HIST_MAS.nueva.h.length > 100, null, { timeout: 15000 });
  await page.evaluate(() => { S.fichaRango = '3A'; abrirFicha('pnueva', 'resumen'); });
  await expect(page.locator('#fichaGraf .sin-horas')).toContainText('Solo hay precios desde el');
  await expect(page.locator('#fichaGraf .sin-horas')).toContainText('no llega a 3 años');
  // el botón lleva a Máx, que sí dibuja todo lo que hay
  await tocar(page, '#fichaGraf [data-frango="Máx"]');
  await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
  await tocar(page, '#fichaFondo .tabs [data-frango="6M"]');
  await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
  void id;
});

test('con el Worker caído, WDC dibuja lo que hay y dice que solo son cierres semanales', async ({ page, context, errores }) => {
  const { pedidos } = await conWDC(page, context, { falla: true });
  await page.waitForFunction(() => Object.keys(HIST_MAS).length > 0 && !HIST_PEND.size, null, { timeout: 15000 });
  expect(pedidos.length).toBeGreaterThan(0);
  await page.evaluate(() => { S.fichaRango = '1M'; abrirFicha('pwdc', 'resumen'); });
  await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
  await expect(page.locator('#fichaNotaGraf')).toContainText('solo hay un precio por semana');
  await tocar(page, '#fichaFondo .tabs [data-frango="5A"]');
  await expect(page.locator('#fichaGraf .sin-horas')).toContainText('no se ha podido traer más');
  await tocar(page, '#fichaFondo .tabs [data-frango="Máx"]');
  await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
});
