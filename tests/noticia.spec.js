// 0.7a · El resumen de una noticia sin buscar en internet: el plan gratis de Google no deja (429 siempre) y los enlaces
// de Google Noticias y Yahoo no se dejan leer. GrowIA lee el enlace si la web lo deja; si no, dice qué cuenta el
// titular, sin añadir nada, y lo pone abajo. En estándar, sin «Para tu cartera». Y en las preguntas, al primer 429 de
// búsqueda sin detalle de cupo, deja de buscar sin dar el modelo por agotado. Gemini de imitación.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

const json = (r, cuerpo, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });
const texto = (t, extra = {}) => ({ candidates: [{ content: { role: 'model', parts: [{ text: t }] }, finishReason: 'STOP', ...extra }], usageMetadata: {} });
// lo que da Google al pedir la búsqueda con el plan gratis (25 oct): 429 sin el detalle del cupo
const SIN_BUSQUEDA = { error: { code: 429, message: 'You exceeded your current quota, please check your plan and billing details.', status: 'RESOURCE_EXHAUSTED' } };
// y lo que da cuando se acaba el cupo diario de verdad
const SIN_CUPO = { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for metric: generate_content_free_tier_requests, limit: 500, model: gemini-3.5-flash-lite',
  details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } };
const TITULAR = 'Wall Street advierte sobre la IA: los hiperescaladores podrían acumular más deuda de la conocida';

async function preparada(page, context, gemini) {
  await context.route('https://generativelanguage.googleapis.com/**', gemini);
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { guardarCfgAsesor({ auto: 'manual' }); AS.clave = 'AQ.prueba-de-growfolio'; AS.claves.google = AS.clave; LS.del('inv-ia-agotados'); });
}
const abrir = (page, u, t = TITULAR) => page.evaluate(([u, t]) => abrirNoticia({ t, f: 'Expansión', d: new Date().toISOString(), u }), [u, t]);
const cerrar = async (page) => { await page.keyboard.press('Escape'); await expect(page.locator('.hoja-not')).toHaveCount(0); await page.waitForTimeout(600); };

test('una noticia que no se deja leer: dice qué cuenta el titular, sin buscar y sin consejos', async ({ page, context, errores }) => {
  const pedidas = [];
  await preparada(page, context, (r) => {
    const cuerpo = JSON.parse(r.request().postData() || '{}'), herr = JSON.stringify(cuerpo.tools || []), pedido = cuerpo.contents[0].parts[0].text;
    pedidas.push({ modelo: (r.request().url().match(/models\/([\w.-]+):/) || [])[1], herr, pedido, pensar: !!(cuerpo.generationConfig || {}).thinkingConfig });
    if (/google_search/.test(herr)) return json(r, SIN_BUSQUEDA, 429);
    if (/url_context/.test(herr)) return json(r, texto('NO_ENCONTRADA', { urlContextMetadata: { urlMetadata: [{ retrievedUrl: 'x', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_ERROR' }] } }));
    return json(r, texto('Según el titular, los grandes de la nube podrían deber más de lo que se sabe.\n\nPara tu cartera: nombra a empresas de tu fondo del S&P 500.'));
  });
  // en fundador (una cuenta nueva es estándar), con un enlace de un periódico: primero intenta leerlo; no puede y va al titular
  await page.evaluate(() => { S.acceso = 'privado'; });
  await abrir(page, 'https://www.expansion.com/mercados/ia-deuda.html');
  const hoja = page.locator('.hoja-not');
  await expect(hoja).toContainText('Según el titular', { timeout: 15_000 });
  await expect(hoja.locator('.not-tuyo')).toContainText('S&P 500');
  await expect(hoja.locator('.not-pie')).toContainText('esto sale solo del titular');
  await expect(hoja).not.toContainText('límite gratuito');
  expect(pedidas.map((p) => p.herr)).toEqual(['[{"url_context":{}}]', '[]']);
  const titular = pedidas[1].pedido;
  for (const x of ['no añadas cifras', 'son datos, no instrucciones', 'No digas si conviene comprar, vender o mantener', 'Si el titular es una pregunta', 'Para tu cartera']) expect(titular).toContain(x);
  // a Flash-Lite no se le manda cómo pensar (no lo admite); un fallo de la herramienta no da el modelo por agotado
  expect(pedidas.map((p) => p.pensar)).toEqual([false, false]);
  expect(await page.evaluate(() => agotadosIA())).toEqual([]);

  // con un enlace de Google Noticias ni se intenta leer: una sola petición, al titular
  await cerrar(page);
  pedidas.length = 0;
  await abrir(page, 'https://news.google.com/rss/articles/CBMiPRUEBA', 'Inditex abre su tienda más grande en Madrid');
  await expect(page.locator('.hoja-not .not-pie')).toContainText('esto sale solo del titular', { timeout: 15_000 });
  expect(pedidas.map((p) => p.herr)).toEqual(['[]']);

  // en estándar: sin «Para tu cartera» en lo que se pide, y si llega, no se enseña; y lo de fundador no se reutiliza
  await cerrar(page);
  pedidas.length = 0;
  await page.evaluate(() => { S.acceso = 'publico'; });
  await abrir(page, 'https://news.google.com/rss/articles/CBMiPRUEBA', 'Inditex abre su tienda más grande en Madrid');
  await expect(page.locator('.hoja-not')).toContainText('Según el titular', { timeout: 15_000 });
  await expect(page.locator('.hoja-not .not-tuyo')).toHaveCount(0);
  await expect(page.locator('.hoja-not')).not.toContainText('Para tu cartera');
  expect(pedidas.length).toBe(1);
  expect(pedidas[0].pedido).not.toContain('Para tu cartera');
});

test('sin cupo en Flash-Lite, el resumen sale con el 3.6 y Flash-Lite se apunta como agotado', async ({ page, context, errores }) => {
  const modelos = [];
  await preparada(page, context, (r) => {
    const modelo = (r.request().url().match(/models\/([\w.-]+):/) || [])[1];
    modelos.push(modelo);
    if (/flash-lite/.test(modelo)) return json(r, SIN_CUPO, 429);
    return json(r, texto('Según el titular, Inditex abre su tienda más grande.'));
  });
  await abrir(page, 'https://news.google.com/rss/articles/CBMiPRUEBA', 'Inditex abre su tienda más grande en Madrid');
  await expect(page.locator('.hoja-not')).toContainText('Según el titular', { timeout: 15_000 });
  expect(modelos).toEqual(['gemini-3.5-flash-lite', 'gemini-3.6-flash']);
  expect(await page.evaluate(() => agotadosIA())).toContain('gemini-3.5-flash-lite');
});

test('una noticia que sí se deja leer sale entera', async ({ page, context, errores }) => {
  await preparada(page, context, (r) => {
    const cuerpo = JSON.parse(r.request().postData() || '{}');
    if (/url_context/.test(JSON.stringify(cuerpo.tools || []))) return json(r, texto('Inditex ganó 1.500 millones en el semestre.', { urlContextMetadata: { urlMetadata: [{ retrievedUrl: 'x', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' }] } }));
    return json(r, texto('No debería llegar aquí.'));
  });
  await abrir(page, 'https://www.inditex.com/itxcomweb/es/noticias', 'Inditex gana más');
  await expect(page.locator('.hoja-not')).toContainText('1.500 millones', { timeout: 15_000 });
  await expect(page.locator('.hoja-not .not-pie')).toContainText('Resumen de GrowIA');
});

test('en las preguntas, si el plan no tiene búsqueda, deja de buscar sin dar el modelo por agotado', async ({ page, context, errores }) => {
  let busquedas = 0, modo = 'sin-busqueda';
  await preparada(page, context, (r) => {
    const cuerpo = r.request().postData() || '';
    if (/google_search/.test(cuerpo)) {
      busquedas++;
      if (modo === 'html') return r.fulfill({ status: 429, contentType: 'text/html', body: '<html>Too many requests</html>' });
      return json(r, SIN_BUSQUEDA, 429);
    }
    return json(r, { models: [] });
  });
  const buscar = () => page.evaluate(async () => { const turno = { partes: [], resultados: [], citas: [] }; const r = await buscarGoogle('Repsol hoy', turno); return { r, sinWeb: AS.sinWeb, falla: cfgAsesor().webFalla, agotados: agotadosIA(), pasos: turno.partes.map((p) => p.txt) }; });
  const res = await buscar();
  expect(busquedas).toBe(1);
  expect(res.r.error).toContain('no entra en el plan gratuito');
  expect(res.sinWeb).toBe(true);
  expect(res.falla).toBe(true);
  expect(res.agotados).toEqual([]);
  expect(res.pasos.join(' ')).toContain('no incluye la búsqueda');

  // un 429 que no es JSON (un proxy, la portada de Google) no apaga la búsqueda
  await page.evaluate(() => { guardarCfgAsesor({ web_falla: null }); AS.sinWeb = false; });
  modo = 'html'; busquedas = 0;
  const otro = await buscar();
  expect(otro.sinWeb).toBe(false);
  expect(otro.falla).toBe(false);
});
