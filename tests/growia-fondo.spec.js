// 0.7f: la IA en segundo plano. Lo vio Carlos el 30 oct: salió de la app mientras contestaba y acabó en «Se ha cortado
// la conexión… tres veces seguidas (Failed to fetch)». Un corte con Toisón fuera de la vista no es un fallo: espera a que
// vuelvas y sigue sola. 0.8.2b: el chat solo va con Claude (por el Worker), así que estas pruebas van con Claude; las de
// los modelos de Gemini (3.8, 3.6, Flash-Lite) se han ido con él.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const ev = (tipo, datos) => `event: ${tipo}\ndata: ${JSON.stringify({ type: tipo, ...datos })}\n\n`;
const respuesta = (texto) => ev('message_start', { message: { id: 'm', usage: { input_tokens: 100, output_tokens: 1 } } })
  + ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) + ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: texto } })
  + ev('content_block_stop', { index: 0 }) + ev('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 20 } }) + ev('message_stop', {});

// Toisón a la vista o no (como al cambiar de app en el móvil)
async function conVista(page) {
  await page.evaluate(() => {
    window.__fuera = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__fuera });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__fuera ? 'hidden' : 'visible') });
  });
  return (fuera) => page.evaluate((f) => { window.__fuera = f; document.dispatchEvent(new Event('visibilitychange')); }, fuera);
}

// el Worker de imitación: el sondeo («{}») dice que sí; las primeras «cortar» preguntas se cortan con Toisón ya fuera de la
// vista; luego contesta
async function worker(context, salir, cortar) {
  const modelos = [];
  await context.route(WORKER, async (r) => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    if ((q.postData() || '') === '{}') return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'peticion' }) });
    modelos.push(JSON.parse(q.postData()).model);
    if (modelos.length <= cortar) { await salir(true); return r.abort('failed'); }
    return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream' }, body: respuesta('Tu cartera va bien: sigue con tus aportaciones.') });
  });
  return modelos;
}

async function preguntar(page) {
  page.on('dialog', (d) => d.accept());
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); guardarCfgAsesor({ auto: 'manual' }); });
}

test('en el navegador: el corte al salir no es un fallo; espera a que vuelvas y sigue con el mismo modelo', async ({ page, context, errores }) => {
  await preguntar(page);
  const fuera = await conVista(page);
  const modelos = await worker(context, fuera, 1);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('sigo en cuanto vuelvas', { timeout: 15_000 });
  // fuera de la vista no lo vuelve a pedir (se cortaría otra vez)
  await page.waitForTimeout(2500);
  expect(modelos.length).toBe(1);
  await fuera(false);
  await expect(cuerpo).toContainText('sigue con tus aportaciones', { timeout: 15_000 });
  await expect(cuerpo).not.toContainText('sigo en cuanto vuelvas');
  await expect(cuerpo.locator('.as-error')).toHaveCount(0);
  expect(modelos).toEqual(['claude-haiku-5-5', 'claude-haiku-5-5']);
});

// el Worker de imitación dentro de la página (fetch), para lo que no se puede imitar con route: una respuesta que se queda
// parada a mitad
async function workerFetch(page) {
  await page.evaluate(() => {
    const real = window.fetch, enc = new TextEncoder();
    const abortar = (o, c) => o.signal && o.signal.addEventListener('abort', () => c(new DOMException('The user aborted a request.', 'AbortError')), { once: true });
    window.fetch = (url, o = {}) => {
      if (!/\/claude$/.test(String(url))) return real(url, o);
      if (o.body === '{}') return Promise.resolve(new Response(JSON.stringify({ error: 'peticion' }), { status: 400, headers: { 'content-type': 'application/json' } }));
      const ini = `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'm', usage: { input_tokens: 10 } } })}\n\nevent: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\nevent: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Empiezo a mirar tu' } })}\n\n`;
      const body = new ReadableStream({ start(c) { c.enqueue(enc.encode(ini)); abortar(o, (e) => c.error(e)); } });
      return Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    };
  });
}

test('«Parar» corta también una respuesta que ya está llegando', async ({ page, errores }) => {
  await preguntar(page);
  await workerFetch(page);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('Empiezo a mirar tu', { timeout: 10_000 });
  // el botón de enviar, que mientras contesta es «Parar» (sin el ratón: a ratos sale encima la guía)
  await expect(page.locator('#asEnviar')).toHaveAttribute('aria-label', 'Parar');
  await page.evaluate(() => document.querySelector('#asEnviar').click());
  await expect(cuerpo).toContainText('Parado.', { timeout: 5_000 });
  expect(await page.evaluate(() => AS.cargando)).toBe(false);
});

test('el registro de la IA se ve en Ajustes, con el aviso de la batería restringida en la app', async ({ page, context, errores }) => {
  await preguntar(page);
  await page.evaluate(() => {
    window.InversionesApp = {
      version: () => 99999, nombreVersion: () => '9.9', growiaEmpieza: () => {}, growiaTermina: () => {},
      red: () => 'wifi', bateriaRestringida: () => true, growiaViva: () => true,
      diarioApp: () => JSON.stringify([{ t: Date.now() - 500, x: 'Servicio en marcha' }]),
    };
  });
  await worker(context, async () => {}, 0);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  await expect(page.locator('#asCuerpo')).toContainText('sigue con tus aportaciones', { timeout: 15_000 });
  await page.evaluate(() => { AS.vista = 'ajustes'; pintarAsesor(); document.querySelector('.as-detalle').open = true; });
  const reg = page.locator('.as-diario');
  await expect(reg).toContainText('Pregunta · Haiku 5.5 · wifi');
  await expect(reg).toContainText('Servicio en marcha');
  await expect(reg).toContainText(/Haiku 5\.5 · ronda 1: primer dato/);
  await expect(page.locator('.as-aviso-bateria')).toContainText('batería restringida');
  await expect(reg).not.toContainText('Cómo va mi cartera');
});

test('la revisión automática no empieza mientras la IA contesta una pregunta', async ({ page, context, errores }) => {
  await preguntar(page);
  await worker(context, async () => {}, 0);
  const r = await page.evaluate(async () => {
    LS.set(LS_CLAUDE_OK, true); guardarCfgAsesor({ auto: 'diario' }); S.iaPropio = null;
    const pedidas = []; window.generarAnalisisIA = (m) => pedidas.push(m);
    IA.ultimoIntento = 0; AS.cargando = true; await revisarAnalisisIA();
    const durante = pedidas.length;
    IA.ultimoIntento = 0; AS.cargando = false; await revisarAnalisisIA();
    return [durante, pedidas.length];
  });
  expect(r, 'mientras contesta, nada; al acabar, sí').toEqual([0, 1]);
});
