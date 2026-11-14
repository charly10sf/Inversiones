// Las gráficas de 1D y 1S de lo que no está en instrumentos.json (WDC, del radar) salían iguales: sin precios por horas,
// la ficha dibujaba 9 días de cierres en las dos. Ahora la web pide esos precios al Worker (/intradia) y, si no hay
// (un fondo, sin red), 1S enseña los cierres de la semana y 1D lo dice. Aquí: el Worker con fetch de imitación, y la web
// con el Worker imitado.
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

// velas de 30 minutos de los últimos 5 días, como las da Yahoo (segundos) o Bitvavo (milisegundos, de la más nueva a la más vieja)
const ahoraS = Math.floor(Date.now() / 1800e3) * 1800;
const velas = (n, f) => Array.from({ length: n }, (_, k) => [ahoraS - (n - 1 - k) * 1800, f(k)]);
const grafico = (moneda, pares) => ({ chart: { result: [{ meta: { currency: moneda }, timestamp: pares.map((x) => x[0]), indicators: { quote: [{ close: pares.map((x) => x[1]) }] } }] } });

function cacheDeMentira() {
  const m = new Map();
  return { m, default: { match: async (r) => (m.has(r.url) ? new Response(m.get(r.url)) : undefined), put: async (r, res) => { m.set(r.url, await res.text()); } } };
}

test('el Worker da precios cada 30 minutos en euros, con caché y con límite', async () => {
  const pedidas = [];
  const fetchAntes = globalThis.fetch, cachesAntes = globalThis.caches;
  const cache = cacheDeMentira();
  globalThis.caches = cache;
  globalThis.fetch = async (url) => {
    url = String(url); pedidas.push(url);
    const sim = decodeURIComponent((url.match(/chart\/([^?]+)/) || [])[1] || '');
    if (sim === 'WDC') return new Response(JSON.stringify(grafico('USD', velas(4, (k) => 100 + k))));
    // 1 EUR = 1,25 USD siempre: 100 $ son 80 €
    if (sim === 'EURUSD=X') return new Response(JSON.stringify(grafico('USD', velas(6, () => 1.25))));
    // Londres, en peniques: 5000 p = 50 £; 1 EUR = 0,8 GBP → 62,5 €
    if (sim === 'BATS.L') return new Response(JSON.stringify(grafico('GBp', velas(3, () => 5000))));
    if (sim === 'EURGBP=X') return new Response(JSON.stringify(grafico('GBP', velas(6, () => 0.8))));
    if (sim === 'REP.MC') return new Response(JSON.stringify(grafico('EUR', velas(3, () => 14.5))));
    // una cripto que Yahoo no tiene: Bitvavo
    if (sim === 'RARA-EUR') return new Response('{}', { status: 404 });
    if (url.startsWith('https://api.bitvavo.com/v2/RARA-EUR/candles')) return new Response(JSON.stringify(velas(3, (k) => 2 + k).reverse().map(([t, v]) => [t * 1000, '1', '1', '1', String(v), '10'])));
    if (sim === 'NOEXISTE') return new Response('{}', { status: 404 });
    if (sim === 'ROTO') return new Response('', { status: 500 });
    throw new Error('fuera de la prueba: ' + url);
  };
  try {
    const pedir = (q, origen = 'https://charly10sf.github.io') => worker.fetch(new Request(`https://w.prueba/intradia?s=${q}`, { headers: { Origin: origen } }), {}, { waitUntil() {} });

    let r = await pedir('wdc,BATS.L,REP.MC,RARA-EUR,NOEXISTE,ROTO');
    expect(r.status).toBe(200);
    let j = await r.json();
    expect(j.ok).toBe(true);
    // el formato de intradia.json, en euros
    expect(j.p.WDC.length).toBe(4);
    expect(j.p.WDC[0][0]).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\dZ$/);
    expect(j.p.WDC.map((x) => x[1])).toEqual([80, 80.8, 81.6, 82.4]);
    expect(j.p['BATS.L'][0][1]).toBeCloseTo(62.5, 6);
    expect(j.p['REP.MC'][0][1]).toBe(14.5);
    expect(j.p['RARA-EUR'].map((x) => x[1])).toEqual([2, 3, 4]);
    // sin datos no es un fallo; un error de Yahoo, sí (y no se guarda)
    expect(j.p.NOEXISTE).toEqual([]);
    expect(j.fallos).toEqual(['ROTO']);

    // la segunda vez, de la caché: a Yahoo solo se le vuelve a preguntar por el que falló
    pedidas.length = 0;
    j = await (await pedir('WDC,BATS.L,ROTO')).json();
    expect(j.p.WDC.length).toBe(4);
    expect(pedidas.every((u) => u.includes('/ROTO'))).toBe(true);

    // como mucho 12 por llamada; lo mal escrito, fuera
    pedidas.length = 0;
    const muchos = Array.from({ length: 15 }, (_, k) => `X${k}`);
    globalThis.fetch = async (url) => { pedidas.push(String(url)); return new Response('{}', { status: 404 }); };
    j = await (await pedir([...muchos, 'MAL%20ESCRITO'].join(','))).json();
    expect(Object.keys(j.p).length).toBe(12);
    expect(j.fuera.length).toBe(4);

    // sin símbolos, 400; desde otro sitio y sin sesión, 403
    expect((await pedir('')).status).toBe(400);
    expect((await pedir('WDC', 'https://otra.web')).status).toBe(403);
  } finally {
    globalThis.fetch = fetchAntes; globalThis.caches = cachesAntes;
  }
});

/* la web, con el Worker imitado: WDC (del radar, no está en instrumentos.json) sube un poco en cada vela de 30 minutos */
async function conWDC(page, context, { falla = false } = {}) {
  const pedidos = [];
  await context.route('https://*.workers.dev/intradia**', (r) => {
    const s = new URL(r.request().url()).searchParams.get('s') || '';
    pedidos.push(s);
    if (falla) return r.fulfill({ status: 502, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":false,"error":"yahoo"}' });
    const p = {};
    for (const sim of s.split(',')) {
      // 5 días seguidos, cada 30 minutos (como la cripto: así siempre hay un día anterior al último)
      if (sim === 'WDC') p[sim] = Array.from({ length: 240 }, (_, k) => [new Date((ahoraS - (239 - k) * 1800) * 1000).toISOString().slice(0, 16) + 'Z', +(80 + k * 0.1).toFixed(2)]);
      else p[sim] = [];
    }
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, p, fallos: [], fuera: [] }) });
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
const caminoGraf = (page) => page.locator('#fichaGraf svg').first().evaluate((s) => s.innerHTML);

test('una acción del radar tiene su gráfica de 1D y de 1S, distintas, con los precios del Worker', async ({ page, context, errores }) => {
  const { pedidos, id } = await conWDC(page, context);
  await page.evaluate(() => { S.fichaRango = '1D'; abrirFicha('pwdc', 'resumen'); });
  await page.waitForFunction((id) => intraDe(id) && intraDe(id).length > 100, id, { timeout: 10000 });
  await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
  await expect(page.locator('#fichaCab')).toContainText('desde el último cierre');
  const d1 = await caminoGraf(page);
  // solo lo que no está en intradia.json: WDC sí, Repsol (que lo trae la Action) no
  expect(pedidos.join(',')).toContain('WDC');
  expect(pedidos.join(',')).not.toContain('REP.MC');

  await tocar(page, '#fichaFondo [data-frango="1S"]');
  await expect(page.locator('#fichaCab')).not.toContainText('desde el último cierre');
  const d7 = await caminoGraf(page);
  expect(d1.length).toBeGreaterThan(0);
  expect(d7, 'la de 1S no puede ser la misma que la de 1D').not.toBe(d1);
  // no se vuelve a pedir lo que ya está en memoria
  expect(pedidos.filter((s) => s.includes('WDC')).length).toBe(1);

  // la cartera en 1S se mueve también con WDC: sin sus precios por horas la serie sería otra
  const r = await page.evaluate((id) => {
    const M = calcular(), con = serieIntradia(M, '1S');
    const guardado = INTRA_MAS[id]; delete INTRA_MAS[id];
    const sin = serieIntradia(M, '1S'); INTRA_MAS[id] = guardado;
    const dif = Math.max(...con.slice(0, -1).map((x, k) => { const y = sin.find((z) => z.d === x.d); return y ? Math.abs(x.v - y.v) : 0; }));
    return { n: con.length, dif };
  }, id);
  expect(r.n).toBeGreaterThan(20);
  expect(r.dif, 'WDC tiene que mover la serie de la cartera').toBeGreaterThan(5);
});

test('sin precios por horas: 1D lo dice y 1S enseña los cierres de la semana (un fondo, y una acción si falla el Worker)', async ({ page, context, errores }) => {
  await conWDC(page, context, { falla: true });
  // un fondo: no cotiza durante el día
  await page.evaluate(() => { S.fichaRango = '1D'; const p = S.cartera.posiciones.find((x) => x.instrumento === 'ishares-us'); abrirFicha(p.id, 'resumen'); });
  await expect(page.locator('#fichaGraf .sin-horas')).toContainText('Los fondos tienen un solo precio al día');
  await tocar(page, '#fichaFondo [data-frango="1S"]');
  await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
  // empieza como mucho en el último cierre de antes de la semana (no 9 días como antes)
  const ini = await page.evaluate(() => { const f = filaFicha(), desde = iso(new Date(Date.now() - 7 * 864e5)), h = f.hist || [], k = h.findIndex(([d]) => d >= desde); return { desde, previo: k > 0 ? h[k - 1][0] : null }; });
  await expect(page.locator('#fichaCab')).toContainText('desde el');
  expect(ini.previo === null || ini.previo < ini.desde).toBe(true);

  // WDC con el Worker caído: el mismo aviso en 1D (sin días haciéndose pasar por el día) y los cierres en 1S
  await page.evaluate(() => { cerrarFicha(true); S.fichaRango = '1D'; abrirFicha('pwdc', 'resumen'); });
  await expect(page.locator('#fichaGraf .sin-horas')).toContainText('No hay precios por horas', { timeout: 10000 });
  await tocar(page, '#fichaFondo [data-frango="1S"]');
  await expect(page.locator('#fichaGraf svg').first()).toBeVisible();
});
