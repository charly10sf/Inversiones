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

test('en la app de Android: se queda viva, reintenta sin esperarte y te avisa al acabar', async ({ page, context, errores }) => {
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
  });
  // tres cortes seguidos fuera de la vista: dos reintentos sin esperar y, al tercero, a esperar a que vuelvas
  const modelos = await gemini(context, fuera, 3);
  const app = () => page.evaluate(() => window.__app);
  await page.evaluate(() => abrirAsesor('¿Cómo va mi cartera?', true));
  await expect.poll(() => modelos.length, { timeout: 20_000 }).toBe(3);
  await expect.poll(async () => (await app()).length, { timeout: 15_000 }).toBe(2);
  let a = await app();
  expect(a[0]).toEqual(['empieza', 'GrowIA está contestando…', false]);
  expect(a[1][0]).toBe('termina');
  expect(a[1][1]).toBe('GrowIA se ha quedado a medias');
  await page.waitForTimeout(1500);
  expect(modelos.length, 'al tercero ya no reintenta fuera de la vista').toBe(3);
  await fuera(false);
  await expect(page.locator('#asCuerpo')).toContainText('sigue con tus aportaciones', { timeout: 15_000 });
  await expect(page.locator('#asCuerpo')).not.toContainText('tres veces');
  a = await app();
  expect(a.map((x) => x[0])).toEqual(['empieza', 'termina', 'empieza', 'termina']);
  expect(a[3][1]).toBe('GrowIA ya te ha contestado');
  expect(a[3][2]).not.toMatch(/cartera va bien/);   // el aviso no lleva nada de la respuesta
  expect(new Set(modelos).size, 'siempre el mismo modelo').toBe(1);
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
