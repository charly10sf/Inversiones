// 0.7f: GrowIA en segundo plano. Lo vio Carlos el 30 oct: salió de la app mientras contestaba y acabó en «Se ha cortado
// la conexión con Google tres veces seguidas (Failed to fetch)». Un corte con GrowFolio fuera de la vista no es un fallo:
// espera a que vuelvas y sigue sola. En la app de Android (que se queda viva mientras contesta), reintenta sin esperarte
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

const sse = (parts) => `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }], usageMetadata: {} })}\r\n\r\n`;

// GrowFolio a la vista o no (como al cambiar de app en el móvil)
async function conVista(page) {
  await page.evaluate(() => {
    window.__fuera = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__fuera });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__fuera ? 'hidden' : 'visible') });
  });
  return (fuera) => page.evaluate((f) => { window.__fuera = f; document.dispatchEvent(new Event('visibilitychange')); }, fuera);
}

// Gemini de imitación: las primeras «cortar» peticiones se cortan con GrowFolio ya fuera de la vista; luego contesta
async function gemini(context, salir, cortar) {
  const modelos = [];
  await context.route('https://generativelanguage.googleapis.com/**', async (r) => {
    const url = r.request().url();
    if (/:streamGenerateContent/.test(url)) {
      modelos.push(/models\/([^:]+):/.exec(url)[1]);
      if (modelos.length <= cortar) { await salir(true); return r.abort('failed'); }
      return r.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([{ text: 'Tu cartera va bien: sigue con tus aportaciones.' }]) });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [] }) });
  });
  return modelos;
}

async function preguntar(page) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { guardarCfgAsesor({ auto: 'manual' }); AS.clave = 'AQ.prueba-de-growfolio'; });
}

test('en el navegador: el corte al salir no es un fallo; espera a que vuelvas y sigue con el mismo modelo', async ({ page, context, errores }) => {
  await preguntar(page);
  const fuera = await conVista(page);
  const modelos = await gemini(context, fuera, 1);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('sigo en cuanto vuelvas', { timeout: 15_000 });
  // fuera de la vista no lo vuelve a pedir (se cortaría otra vez y gastaría cupo)
  await page.waitForTimeout(2500);
  expect(modelos.length).toBe(1);
  await fuera(false);
  await expect(cuerpo).toContainText('sigue con tus aportaciones', { timeout: 15_000 });
  await expect(cuerpo).toContainText('he seguido al volver');
  await expect(cuerpo).not.toContainText('tres veces');
  await expect(cuerpo).not.toContainText('rápida');
  expect(modelos.length).toBe(2);
  expect(modelos[1], 'sigue con el mismo modelo').toBe(modelos[0]);
});

// 0.7l: con la app viva, los cortes fuera de la vista se repiten con esperas que crecen (2, 4, 8, 15 y 30 s) y solo
// cuando se acaban espera a que vuelvas. En la prueba, esperas cortas
test('en la app de Android: se queda viva, reintenta sin esperarte y, si no hay manera, espera a que vuelvas', async ({ page, context, errores }) => {
  await preguntar(page);
  const fuera = await conVista(page);
  // la app nueva: growiaEmpieza y growiaTermina (version alta para que no salga el aviso de actualizar)
  await page.evaluate(() => {
    window.__app = [];
    window.InversionesApp = {
      version: () => 99999, nombreVersion: () => '9.9',
      growiaEmpieza: (t) => window.__app.push(['empieza', t, document.hidden]),
      growiaTermina: (t, x) => window.__app.push(['termina', t, x]),
    };
    RED_IA.esperas = [0.2, 0.2, 0.2, 0.2, 0.2];
  });
  // seis cortes seguidos fuera de la vista: cinco reintentos sin esperar y, al sexto, a esperar a que vuelvas
  const modelos = await gemini(context, fuera, 6);
  const app = () => page.evaluate(() => window.__app);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  await expect.poll(() => modelos.length, { timeout: 20_000 }).toBe(6);
  await expect.poll(async () => (await app()).length, { timeout: 15_000 }).toBe(2);
  let a = await app();
  expect(a[0]).toEqual(['empieza', 'GrowIA está contestando…', false]);
  expect(a[1][0]).toBe('termina');
  expect(a[1][1]).toBe('GrowIA se ha quedado a medias');
  await page.waitForTimeout(1500);
  expect(modelos.length, 'agotados los reintentos, ya no lo pide fuera de la vista').toBe(6);
  await fuera(false);
  await expect(page.locator('#asCuerpo')).toContainText('sigue con tus aportaciones', { timeout: 15_000 });
  await expect(page.locator('#asCuerpo')).not.toContainText('veces seguidas');
  a = await app();
  expect(a.map((x) => x[0])).toEqual(['empieza', 'termina', 'empieza', 'termina']);
  expect(a[3][1]).toBe('GrowIA ya te ha contestado');
  expect(a[3][2]).not.toMatch(/cartera va bien/);   // el aviso no lleva nada de la respuesta
  expect(new Set(modelos).size, 'siempre el mismo modelo').toBe(1);
});

test('en la app de Android, unos cuantos cortes fuera de la vista se arreglan solos, sin esperarte', async ({ page, context, errores }) => {
  await preguntar(page);
  const fuera = await conVista(page);
  await page.evaluate(() => {
    window.__app = [];
    window.InversionesApp = { version: () => 99999, nombreVersion: () => '9.9', growiaEmpieza: (t) => window.__app.push(['empieza', t]), growiaTermina: (t) => window.__app.push(['termina', t]) };
    RED_IA.esperas = [0.2, 0.2, 0.2, 0.2, 0.2];
  });
  const modelos = await gemini(context, fuera, 3);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  await expect.poll(() => page.evaluate(() => window.__app.map((x) => x[0]).join()), { timeout: 20_000 }).toBe('empieza,termina');
  expect(await page.evaluate(() => document.hidden)).toBe(true);
  expect((await page.evaluate(() => window.__app))[1][1]).toBe('GrowIA ya te ha contestado');
  expect(modelos.length).toBe(4);
  expect(new Set(modelos).size, 'un corte de red no hace cambiar de modelo').toBe(1);
  await fuera(false);
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('sigue con tus aportaciones');
  // un solo aviso del corte, que dice lo que pasó
  await expect(cuerpo.locator('.as-paso')).toHaveCount(1);
  await expect(cuerpo).toContainText('Se cortó la conexión con Google: lo he repetido');
});

test('con la app viva, un corte fuera de la vista se reintenta solo y acaba sin esperarte', async ({ page, context, errores }) => {
  await preguntar(page);
  const fuera = await conVista(page);
  await page.evaluate(() => {
    window.__app = [];
    window.InversionesApp = { version: () => 99999, nombreVersion: () => '9.9', growiaEmpieza: (t) => window.__app.push(['empieza', t]), growiaTermina: (t) => window.__app.push(['termina', t]) };
  });
  const modelos = await gemini(context, fuera, 1);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  // contesta con GrowFolio aún fuera de la vista
  await expect.poll(() => page.evaluate(() => window.__app.map((x) => x[0]).join()), { timeout: 20_000 }).toBe('empieza,termina');
  expect(await page.evaluate(() => document.hidden)).toBe(true);
  expect((await page.evaluate(() => window.__app))[1][1]).toBe('GrowIA ya te ha contestado');
  expect(modelos.length).toBe(2);
  await fuera(false);
  await expect(page.locator('#asCuerpo')).toContainText('sigue con tus aportaciones');
});

// 0.7o: en la app de Android, al salir con GrowIA contestando, la página ya no se da por oculta (si se ocultara, Chrome la
// congelaría al minuto: el registro de Carlos del 1 nov, 120 s sin saltar el límite). La app lo dice con appFuera: fuera,
// los reintentos van solos y, si se acaban, espera a que vuelvas (appFuera(false)), aunque document.hidden siga en false
test('en la app de Android, al salir con GrowIA contestando la página sigue despierta: reintenta sola y, si no hay manera, sigue al volver', async ({ page, context, errores }) => {
  await preguntar(page);
  await page.evaluate(() => {
    window.__app = [];
    window.InversionesApp = { version: () => 99999, nombreVersion: () => '9.9', growiaViva: () => true, growiaEmpieza: (t) => window.__app.push(['empieza', t]), growiaTermina: (t) => window.__app.push(['termina', t]) };
    RED_IA.esperas = [0.2, 0.2, 0.2, 0.2, 0.2];
  });
  const modelos = [];
  await context.route('https://generativelanguage.googleapis.com/**', async (r) => {
    const url = r.request().url();
    if (!/:streamGenerateContent/.test(url)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [] }) });
    modelos.push(/models\/([^:]+):/.exec(url)[1]);
    if (modelos.length === 1) await page.evaluate(() => appFuera(true));
    if (modelos.length <= 6) return r.abort('failed');
    return r.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([{ text: 'Tu cartera va bien: sigue con tus aportaciones.' }]) });
  });
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  await expect.poll(() => modelos.length, { timeout: 20_000 }).toBe(6);
  await expect.poll(() => page.evaluate(() => window.__app.map((x) => x[0]).join()), { timeout: 15_000 }).toBe('empieza,termina');
  expect(await page.evaluate(() => document.hidden), 'la página no se ha ocultado').toBe(false);
  expect((await page.evaluate(() => window.__app))[1][1]).toBe('GrowIA se ha quedado a medias');
  await page.waitForTimeout(1000);
  expect(modelos.length, 'agotados los reintentos, ya no lo pide con la app fuera').toBe(6);
  await page.evaluate(() => appFuera(false));
  await expect(page.locator('#asCuerpo')).toContainText('sigue con tus aportaciones', { timeout: 15_000 });
  const diario = await page.evaluate(() => diarioIATodo().map((x) => x.x).join('\n'));
  expect(diario).toContain('Sales de GrowFolio (la app la mantiene despierta)');
  expect(diario).toContain('GrowFolio fuera (despierta)');
  expect(diario).toContain('Vuelves a GrowFolio');
  expect(new Set(modelos).size, 'siempre el mismo modelo').toBe(1);
});

// 0.7l: Gemini de imitación dentro de la página (fetch), para lo que no se puede imitar con route: una respuesta que
// se queda parada a mitad o que no llega nunca. guion: lo que hace cada petición ('parada', 'nunca' o 'bien')
async function geminiFetch(page, guion) {
  await page.evaluate((g) => {
    const real = window.fetch, enc = new TextEncoder();
    window.__pet = [];
    const trozo = (parts, fin) => `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts }, ...(fin ? { finishReason: 'STOP' } : {}) }], usageMetadata: {} })}\n\n`;
    const abortar = (o, c) => o.signal && o.signal.addEventListener('abort', () => c(new DOMException('The user aborted a request.', 'AbortError')), { once: true });
    window.fetch = (url, o = {}) => {
      if (!/generativelanguage/.test(String(url))) return real(url, o);
      const n = window.__pet.push(/models\/([^:]+):/.exec(String(url))[1]);
      const paso = g[n - 1] || 'bien';
      if (paso === 'nunca') return new Promise((_, no) => abortar(o, no));
      if (paso === 'parada') {
        const body = new ReadableStream({ start(c) { c.enqueue(enc.encode(trozo([{ text: 'Empiezo a mirar tu' }]))); abortar(o, (e) => c.error(e)); } });
        return Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
      }
      return Promise.resolve(new Response(trozo([{ text: 'Tu cartera va bien: sigue con tus aportaciones.' }], true), { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    };
  }, guion);
  return () => page.evaluate(() => window.__pet);
}

test('una respuesta que se queda parada a mitad se corta y se repite (antes se quedaba pensando para siempre)', async ({ page, errores }) => {
  await preguntar(page);
  await page.evaluate(() => { RED_IA.hilo = 1500; RED_IA.esperas = [0.2, 0.2, 0.2, 0.2, 0.2]; });
  const pet = await geminiFetch(page, ['parada', 'bien']);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('sigue con tus aportaciones', { timeout: 15_000 });
  await expect(cuerpo).not.toContainText('Empiezo a mirar tu');
  await expect(cuerpo).toContainText('lo he repetido');
  const p = await pet();
  expect(p.length).toBe(2);
  expect(p[1], 'con el mismo modelo').toBe(p[0]);
  // el registro lo apunta, sin la pregunta ni la respuesta
  const diario = await page.evaluate(() => textoDiarioIA());
  expect(diario).toMatch(/corte \(conexión\) a los \d+ s con la respuesta llegando/);
  expect(diario).toMatch(/Contesta en \d+ s/);
  expect(diario).not.toMatch(/cartera va bien|Cómo va mi cartera/);
});

test('si Google no contesta, lo repite una vez y luego pasa al 3.6, sin la rápida', async ({ page, errores }) => {
  await preguntar(page);
  // 5 s de espera: da tiempo a ver los segundos que lleva (salen a partir de los 3)
  await page.evaluate(() => { RED_IA.espera = 5000; });
  const pet = await geminiFetch(page, ['nunca', 'nunca', 'bien']);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  const cuerpo = page.locator('#asCuerpo');
  // mientras espera, los segundos que lleva
  await expect(cuerpo.locator('.as-seg')).toHaveText(/^\d+ s$/, { timeout: 10_000 });
  await expect(cuerpo).toContainText('sigue con tus aportaciones', { timeout: 30_000 });
  expect(await pet()).toEqual(['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.6-flash']);
  await expect(cuerpo).not.toContainText('rápida');
});

test('si se pierde la red por la que iba (de wifi a datos), lo repite enseguida por la nueva', async ({ page, errores }) => {
  await preguntar(page);
  await page.evaluate(() => { RED_IA.cambio = 400; });
  const pet = await geminiFetch(page, ['nunca', 'bien']);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  await expect.poll(async () => (await pet()).length).toBe(1);
  // una red nueva sin perder la vieja (de datos a wifi: Android mantiene la vieja un rato) no corta nada
  await page.evaluate(() => redCambiada('nueva', Date.now()));
  await page.waitForTimeout(1200);
  expect((await pet()).length).toBe(1);
  // lo que empieza después de perderla ya va por la nueva: no se toca
  await page.evaluate(() => redCambiada('perdida', Date.now() - 600000));
  await page.waitForTimeout(1200);
  expect((await pet()).length).toBe(1);
  const t0 = Date.now();
  await page.evaluate(() => redCambiada('perdida', Date.now()));
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('sigue con tus aportaciones', { timeout: 10_000 });
  expect(Date.now() - t0, 'sin esperar los 120 s').toBeLessThan(8000);
  await expect(cuerpo).toContainText('Cambió tu conexión: lo he repetido');
  expect((await pet()).length).toBe(2);
});

test('«Parar» corta también una respuesta que ya está llegando', async ({ page, errores }) => {
  await preguntar(page);
  await geminiFetch(page, ['parada']);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('Empiezo a mirar tu', { timeout: 10_000 });
  // el botón de enviar, que mientras contesta es «Parar» (sin el ratón: a ratos sale encima la guía)
  await expect(page.locator('#asEnviar')).toHaveAttribute('aria-label', 'Parar');
  await page.evaluate(() => document.querySelector('#asEnviar').click());
  await expect(cuerpo).toContainText('Parado.', { timeout: 5_000 });
  expect(await page.evaluate(() => AS.cargando)).toBe(false);
});

test('el registro de GrowIA se ve en Ajustes, con el aviso de la batería restringida en la app', async ({ page, context, errores }) => {
  await preguntar(page);
  await page.evaluate(() => {
    window.InversionesApp = {
      version: () => 99999, nombreVersion: () => '9.9', growiaEmpieza: () => {}, growiaTermina: () => {},
      red: () => 'wifi', bateriaRestringida: () => true, growiaViva: () => true,
      diarioApp: () => JSON.stringify([{ t: Date.now() - 500, x: 'Servicio en marcha' }]),
    };
  });
  await gemini(context, async () => {}, 0);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  await expect(page.locator('#asCuerpo')).toContainText('sigue con tus aportaciones', { timeout: 15_000 });
  await page.evaluate(() => { AS.vista = 'ajustes'; pintarAsesor(); document.querySelector('.as-detalle').open = true; });
  const reg = page.locator('.as-diario');
  await expect(reg).toContainText('Pregunta · 3.8 Flash · wifi');
  await expect(reg).toContainText('Servicio en marcha');
  await expect(reg).toContainText(/Contesta en \d+ s con 3\.8 Flash/);
  await expect(page.locator('.as-aviso-bateria')).toContainText('batería restringida');
  await expect(reg).not.toContainText('Cómo va mi cartera');
});

test('la revisión automática no empieza mientras GrowIA contesta una pregunta', async ({ page, errores }) => {
  await preguntar(page);
  const r = await page.evaluate(async () => {
    guardarCfgAsesor({ auto: 'diario' }); S.iaPropio = null;
    const pedidas = []; window.generarAnalisisIA = (m) => pedidas.push(m);
    IA.ultimoIntento = 0; AS.cargando = true; await revisarAnalisisIA();
    const durante = pedidas.length;
    IA.ultimoIntento = 0; AS.cargando = false; await revisarAnalisisIA();
    return [durante, pedidas.length];
  });
  expect(r, 'mientras contesta, nada; al acabar, sí').toEqual([0, 1]);
});
