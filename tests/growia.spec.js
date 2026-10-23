// 0.7 · GrowIA fiable: lee las fichas (en la foto de su cartera y en buscar_empresa), busca en internet una vez por
// pregunta como mucho, la revisión automática es una sola llamada sin herramientas y se ve el cupo gastado hoy.
// Gemini de imitación; las fichas, las de prueba (ayuda.js).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, fichasDePrueba } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

const sse = (parts) => `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 50 } })}\r\n\r\n`;

async function preparada(page, context, gemini) {
  const { fichas } = fichasDePrueba();
  await context.route('https://raw.githubusercontent.com/**/datos/fichas.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(fichas) }));
  await context.route('https://generativelanguage.googleapis.com/**', gemini);
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  // la revisión diaria, a mano (si no, empezaría sola al poner la clave)
  await page.evaluate(() => { guardarCfgAsesor({ auto: 'manual' }); AS.clave = 'AQ.prueba-de-growfolio'; LS.del('inv-ia-agotados'); LS.del('inv-ia-uso'); });
}

test('GrowIA lee las fichas y busca en internet una vez por pregunta como mucho', async ({ page, context, errores }) => {
  const peticiones = [];
  let busquedas = 0;
  await preparada(page, context, (r) => {
    const url = r.request().url(), cuerpo = r.request().postData() || '';
    if (/:streamGenerateContent/.test(url)) {
      peticiones.push(cuerpo);
      // pide buscar una y otra vez hasta que GrowFolio le dice que ya ha buscado; entonces contesta
      const parts = /Ya has buscado en internet una vez/.test(cuerpo) ? [{ text: 'Repsol: recompra acciones. Lo demás no lo he podido comprobar.' }] : [{ functionCall: { name: 'buscar_en_internet', args: { consulta: `Repsol ${peticiones.length}` } } }];
      return r.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(parts) });
    }
    if (/:generateContent/.test(url) && /Busca en internet/.test(cuerpo)) {
      busquedas++;
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Repsol cae un 3 % hoy.' }] } }] }) });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [], candidates: [{ content: { parts: [{ text: '{}' }] } }] }) });
  });

  await page.evaluate(() => abrirAsesor('¿Qué pasa con Repsol?', true));
  await expect(page.locator('#asCuerpo')).toContainText('Lo demás no lo he podido comprobar', { timeout: 30_000 });
  expect(busquedas).toBe(1);
  expect(peticiones.length).toBe(3);
  // en la foto de su cartera va la ficha de Repsol y los temas, no sus titulares sueltos
  const foto = JSON.parse(peticiones[0]).systemInstruction.parts[0].text;
  expect(foto).toContain('Lo que pesa ahora en sus acciones');
  expect(foto).toContain('Recompra acciones y prepara más dinero para el accionista.');
  expect(foto).toContain('Temas de la semana');
  expect(foto).toContain('Italia sopesa subir impuestos');
  // buscar_empresa también trae la ficha
  const be = await page.evaluate(() => ejecutarHerramienta('buscar_empresa', { consulta: 'Repsol' }));
  expect(be.ficha_growia.factores[0]).toContain('Recompra acciones');
  // el cupo de hoy, a la vista, y el modelo de la respuesta
  expect(await page.evaluate(() => usoIAHoy()['gemini-3.8-flash'])).toBe(3);
  await expect(page.locator('#asSub')).toContainText('3 de 20 hoy');
  await expect(page.locator('.as-modelo-de')).toContainText('Gemini 3.8 Flash');
});

test('la revisión automática va en una sola llamada, sin herramientas, con el 3.6 y las fichas', async ({ page, context, errores }) => {
  const peticiones = [];
  await preparada(page, context, (r) => {
    const url = r.request().url(), cuerpo = r.request().postData() || '';
    if (/:streamGenerateContent/.test(url)) {
      peticiones.push({ url, cuerpo });
      const j = { titular: 'Tu cartera va bien.', resumen: ['Todo en orden.'], posiciones: {} };
      return r.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([{ text: '```json\n' + JSON.stringify(j) + '\n```' }]) });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [], candidates: [{ content: { parts: [{ text: '{}' }] } }] }) });
  });
  await page.evaluate(() => generarAnalisisIA('automática de hoy'));
  await expect.poll(() => page.evaluate(() => !IA.generando && !!(iaActual() && iaActual().titular))).toBe(true);
  expect(peticiones.length).toBe(1);
  expect(peticiones[0].url).toContain('gemini-3.6-flash');
  const c = JSON.parse(peticiones[0].cuerpo);
  expect(c.tools).toBeUndefined();
  expect(c.contents[0].parts[0].text).toContain('No puedes buscar en internet ni usar herramientas: usa las fichas de GrowIA');
  expect(c.systemInstruction.parts[0].text).toContain('Lo que pesa ahora en sus acciones');
});
