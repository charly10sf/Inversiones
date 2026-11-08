// 0.8.3d · La IA sin depender de Cloudflare. Durante los partidos de LaLiga los operadores españoles bloquean IP de
// Cloudflare, y con ellas el Worker. Se comprueba: (1) el aviso claro cuando llega Toisón pero no el Worker, y el aviso de
// siempre cuando no llega nada; (2) con el relevo (Cloud Run), que la app prueba el Worker, si no llega va por el relevo,
// lo recuerda media hora, vuelve al Worker si el relevo cae, y que el banco, el ISIN y los correos van igual; y que sin
// relevo configurado todo va al Worker como siempre. Por dónde ir lo decide un sondeo de /salud: una petición de verdad
// nunca se corta a mitad para mandarla otra vez.
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
// con tiempos medidos: una a una, para que la carga de las demás no las falsee
test.describe.configure({ mode: 'serial' });
const BLOQUEO = 'puede ser el bloqueo que hacen algunos operadores durante los partidos';

const WORKER = 'https://growfolio.growfolio-web-app.workers.dev';
const RELEVO = 'https://relevo-prueba.a.run.app';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const ev = (tipo, datos) => `event: ${tipo}\ndata: ${JSON.stringify({ type: tipo, ...datos })}\n\n`;
const respuesta = (texto) => ev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', content: [], model: 'claude-haiku-5-5', stop_reason: null, usage: { input_tokens: 10, output_tokens: 1 } } })
  + ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) + ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: texto } })
  + ev('content_block_stop', { index: 0 }) + ev('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } }) + ev('message_stop', {});

/* Un servidor (el Worker o el relevo) de imitación en /claude y /salud: el sondeo «{}» contesta 400 «peticion», lo demás
   contesta `texto` en directo. Devuelve cuántas peticiones le han llegado. */
async function servidor(context, base, texto, { lento = 0 } = {}) {
  const v = { sondeos: 0, preguntas: 0, salud: 0, otras: [] };
  await context.route(`${base}/**`, async (r) => {
    const q = r.request(), u = new URL(q.url());
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    if (u.pathname === '/salud') { v.salud++; return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: '{"ok":true}' }); }
    if (u.pathname === '/claude') {
      if ((q.postData() || '') === '{}') { v.sondeos++; return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'peticion', motivo: 'modelo' }) }); }
      v.preguntas++;
      return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream' }, body: respuesta(texto) });
    }
    v.otras.push(u.pathname + u.search);
    if (lento) await new Promise((ok) => setTimeout(ok, lento));
    return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: base }) });
  });
  return v;
}
// el Worker bloqueado: no contesta nunca (como el «agujero negro» de Movistar) o corta la conexión
const bloquear = (context, base, como = 'cuelga') => context.route(`${base}/**`, (r) => (como === 'cuelga' ? new Promise(() => {}) : r.abort('failed')));

async function preparada(page) {
  page.on('dialog', (d) => d.accept());
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); guardarCfgAsesor({ auto: 'manual' }); marcarClaudeOk(); });
}
const preguntar = (page, q = '¿Qué tal va mi cartera?') => page.evaluate((x) => abrirAsesor(x, true), q);
const conRelevo = (page) => page.evaluate((u) => { RELEVO_PRUEBA = u; }, RELEVO);

test('opción 1: llega Toisón pero no el Worker: se dice que es el bloqueo del fútbol y qué hacer', async ({ page, context }) => {
  await preparada(page);
  await bloquear(context, WORKER, 'corta');
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asCuerpo')).toContainText(BLOQUEO, { timeout: 20_000 });
  await expect(page.locator('#asCuerpo')).toContainText('vuelve a probar al acabar el partido o con los datos de otro operador');
  expect((await page.evaluate(() => claudePausado())).motivo).toBe('bloqueo');
  // es una pausa por la red: al preguntar tú, se quita y se vuelve a intentar
  expect(await page.evaluate(() => PAUSAS_DE_RED.includes('bloqueo'))).toBe(true);
  expect(await page.evaluate(() => textoDiarioIA())).toContain('bloqueo de la red');
});

test('opción 1: una pregunta que no llega nunca al Worker, con Toisón llegando, acaba en el aviso del bloqueo', async ({ page, context }) => {
  await preparada(page);
  // el sondeo ya hecho antes del partido (vale 6 horas)
  await page.evaluate(() => LS.set('inv-claude-sondeo', { ok: true, hasta: Date.now() + 36e5, uid: FB.user.uid }));
  await bloquear(context, WORKER, 'corta');
  await preguntar(page);
  await expect(page.locator('#asCuerpo .as-error').last()).toContainText(BLOQUEO, { timeout: 40_000 });
});

test('opción 1: si tampoco llega Toisón (sin internet), no se habla del fútbol', async ({ page, context }) => {
  await preparada(page);
  await bloquear(context, WORKER, 'corta');
  await context.route(/\/version\.json/, (r) => r.abort('failed'));
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asCuerpo')).toContainText('La IA no está disponible ahora mismo', { timeout: 20_000 });
  await expect(page.locator('#asCuerpo')).not.toContainText('LaLiga');
});

test('sin relevo configurado, todo va al Worker como siempre (ni se espera ni se prueba otra cosa)', async ({ page, context }) => {
  await preparada(page);
  const w = await servidor(context, WORKER, 'Contesta el Worker.');
  let alRelevo = 0;
  await context.route(`${RELEVO}/**`, (r) => { alRelevo++; return r.abort(); });
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Contesta el Worker.', { timeout: 20_000 });
  expect(w.preguntas).toBe(1);
  expect(alRelevo).toBe(0);
  expect(await page.evaluate(() => [VIA_WORKER, porRelevo()])).toEqual(['worker', false]);
});

test('opción 2: con el Worker colgado, la pregunta va por el relevo, contesta y se recuerda media hora', async ({ page, context }) => {
  await preparada(page);
  await conRelevo(page);
  await bloquear(context, WORKER, 'cuelga');
  const rel = await servidor(context, RELEVO, 'Contesto por el relevo.');
  // el sondeo de la ruta, más corto que en la app (5 s), para no esperar en la prueba
  await page.evaluate(() => { ESPERA_WORKER.sondeo = 1500; });
  const t0 = Date.now();
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Contesto por el relevo.', { timeout: 30_000 });
  expect(Date.now() - t0, 'sin esperar los 30 s del primer dato').toBeLessThan(15_000);
  expect(rel.preguntas).toBe(1);
  expect(await page.evaluate(() => [VIA_WORKER, porRelevo(), LS.get(LS_RUTA_WORKER).hasta - Date.now() > 25 * 6e4])).toEqual(['relevo', true, true]);
  expect(await page.evaluate(() => textoDiarioIA())).toContain('va por el relevo media hora');
  // la siguiente va directa por el relevo, sin volver a mirar el Worker
  await page.evaluate(() => { AS.cargando = false; ESPERA_WORKER.sondeo = 60000; });
  const t1 = Date.now();
  await page.evaluate(() => preguntarAsesor('¿Y ahora?'));
  await expect(page.locator('#asCuerpo .as-ia').last()).toContainText('Contesto por el relevo.', { timeout: 20_000 });
  expect(Date.now() - t1).toBeLessThan(10_000);
  expect(rel.preguntas).toBe(2);
});

test('opción 2: si el Worker corta la conexión al momento, se pasa al relevo sin esperar', async ({ page, context }) => {
  await preparada(page);
  await conRelevo(page);
  await bloquear(context, WORKER, 'corta');
  const rel = await servidor(context, RELEVO, 'Relevo al momento.');
  const t0 = Date.now();
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Relevo al momento.', { timeout: 20_000 });
  expect(Date.now() - t0).toBeLessThan(10_000);
  expect(rel.sondeos + rel.preguntas).toBeGreaterThanOrEqual(2);
});

test('opción 2: si el relevo cae mientras se iba por él, se vuelve al Worker', async ({ page, context }) => {
  await preparada(page);
  await conRelevo(page);
  const w = await servidor(context, WORKER, 'Ya ha acabado el partido.');
  await context.route(`${RELEVO}/**`, (r) => r.abort('failed'));
  await page.evaluate(() => irPorRelevo('prueba'));
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Ya ha acabado el partido.', { timeout: 20_000 });
  expect(w.preguntas).toBe(1);
  expect(await page.evaluate(() => [VIA_WORKER, porRelevo()])).toEqual(['worker', false]);
});

test('opción 2: con el Worker y el relevo sin llegar y Toisón llegando, el aviso del bloqueo', async ({ page, context }) => {
  await preparada(page);
  await conRelevo(page);
  await bloquear(context, WORKER, 'corta');
  await context.route(`${RELEVO}/**`, (r) => r.abort('failed'));
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asCuerpo')).toContainText(BLOQUEO, { timeout: 20_000 });
});

test('opción 2: el ISIN, el banco y los correos también van por el relevo, con lo mismo detrás', async ({ page, context }) => {
  await preparada(page);
  await conRelevo(page);
  await bloquear(context, WORKER, 'corta');
  const rel = await servidor(context, RELEVO, '');
  const r = await page.evaluate(async () => {
    const isin = await buscarIsinWorker('IE00B4L5Y983', false);
    const r1 = await fetchWorker('/banco/estado', { headers: { Authorization: 'Bearer x' } }).then((x) => x.json());
    const r2 = await fetchWorker('/correo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"tipo":"clave"}' }).then((x) => x.json());
    return { isin, r1, r2, via: VIA_WORKER };
  });
  expect(r.isin.via).toBe(RELEVO);
  expect(r.r1.via).toBe(RELEVO);
  expect(r.r2.via).toBe(RELEVO);
  expect(r.via).toBe('relevo');
  expect(rel.otras).toEqual(['/isin?c=IE00B4L5Y983', '/banco/estado', '/correo']);
});

test('opción 2: «parar» corta también la petición por el relevo y no deja la pausa del bloqueo', async ({ page, context }) => {
  await preparada(page);
  await conRelevo(page);
  await page.evaluate(() => irPorRelevo('prueba'));
  await context.route(`${RELEVO}/**`, () => new Promise(() => {}));
  const r = await page.evaluate(async () => {
    const ctl = new AbortController();
    setTimeout(() => ctl.abort(), 300);
    try { await fetchWorker('/claude', { method: 'POST', body: '{"x":1}', signal: ctl.signal }); return 'contestó'; }
    catch (e) { return e.name; }
  });
  expect(r).toBe('AbortError');
  expect(await page.evaluate(() => porRelevo())).toBe(true);
});

test('opción 2: una petición lenta del banco no se manda dos veces (nada la corta por tiempo)', async ({ page, context }) => {
  await preparada(page);
  await conRelevo(page);
  const w = await servidor(context, WORKER, '', { lento: 4000 });
  let alRelevo = 0;
  await context.route(`${RELEVO}/**`, (r) => { alRelevo++; return r.abort(); });
  const r = await page.evaluate(() => fetchWorker('/banco/sesion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"code":"un-solo-uso"}' }).then((x) => x.json()));
  expect(r.via).toBe(WORKER);
  expect(w.otras).toEqual(['/banco/sesion']);
  expect(w.salud).toBe(1);
  expect(alRelevo).toBe(0);
});

test('opción 2: lo que no se puede repetir (el código del banco, un correo) no se repite por el relevo; la siguiente ya va por él', async ({ page, context }) => {
  await preparada(page);
  await conRelevo(page);
  // la ruta, guardada como buena antes del partido; luego el Worker deja de llegar
  await page.evaluate(() => guardarRuta('worker'));
  await bloquear(context, WORKER, 'corta');
  const rel = await servidor(context, RELEVO, '');
  const r = await page.evaluate(async () => {
    let primera;
    try { await fetchWorker('/correo', { method: 'POST', body: '{"tipo":"clave"}' }); primera = 'contestó'; } catch (e) { primera = e.name; }
    const segunda = await fetchWorker('/correo', { method: 'POST', body: '{"tipo":"clave"}' }).then((x) => x.json());
    return { primera, segunda, ruta: rutaGuardada() };
  });
  expect(r.primera).toBe('TypeError');
  expect(r.segunda.via).toBe(RELEVO);
  expect(r.ruta).toBe('relevo');
  expect(rel.otras).toEqual(['/correo']);
});

test.describe('fuera de España', () => {
  test.use({ timezoneId: 'America/New_York' });
  test('opción 1: fuera de España no se habla del fútbol, solo de que la red no deja llegar', async ({ page, context }) => {
    await preparada(page);
    await bloquear(context, WORKER, 'corta');
    await page.evaluate(() => abrirAsesor());
    await expect(page.locator('#asCuerpo')).toContainText('puede que tu red lo esté bloqueando', { timeout: 20_000 });
    await expect(page.locator('#asCuerpo')).not.toContainText('LaLiga');
  });
});
