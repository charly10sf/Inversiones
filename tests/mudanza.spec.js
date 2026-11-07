// 0.8.3 · La mudanza a toison.es/app (62a-mudanza.js). Para el navegador, 127.0.0.1 y localhost son dos direcciones
// distintas, cada una con su localStorage: aquí 127.0.0.1 hace de la vieja (charly10sf.github.io) y localhost de la nueva
// (toison.es/app). Lo de la vieja llega a la nueva sin pisar lo que ya tuviera, sin las copias de los datos públicos, y
// desde entonces la vieja salta a la nueva; el aviso solo sale cuando la nueva contesta con su version.json.
import { test, expect } from '@playwright/test';
import { preparar } from './ayuda.js';

const VIEJA = 'http://127.0.0.1:8766', NUEVA = 'http://localhost:8766/';

async function contexto(browser, info) {
  const ctx = await browser.newContext({ ...info.project.use, baseURL: undefined });
  const errores = await preparar(ctx);
  await ctx.addInitScript(({ nueva, viejo }) => { window.MUDANZA_PRUEBA = { nueva, viejo, espera: 8000, auto: false }; }, { nueva: NUEVA, viejo: VIEJA });
  return { ctx, errores };
}

test('la mudanza: lo de la dirección vieja llega a la nueva, sin pisar nada ni las copias de datos', async ({ browser }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  const { ctx, errores } = await contexto(browser, info);
  const vieja = await ctx.newPage();
  await vieja.goto(VIEJA + '/');
  await vieja.waitForFunction(() => typeof mandarMudanza === 'function');
  await vieja.evaluate(() => {
    localStorage.setItem('inv-local-enc', JSON.stringify({ c: 'cartera-cifrada-de-prueba' }));
    localStorage.setItem('inv-tema', JSON.stringify('marfil'));
    localStorage.setItem('inv-cache-precios', JSON.stringify({ mucho: 'no viaja' }));
  });
  // la nueva ya tenía su diseño: no se pisa
  const antes = await ctx.newPage();
  await antes.goto(NUEVA);
  await antes.evaluate(() => localStorage.setItem('inv-tema', JSON.stringify('marmol')));
  await antes.close();

  const nuevaP = ctx.waitForEvent('page');
  await vieja.evaluate(() => mandarMudanza((n) => { window.__mudada = n; }));
  const nueva = await nuevaP;
  await vieja.waitForFunction(() => window.__mudada > 0, null, { timeout: 15000 });
  // la nueva se recarga limpia, sin #mudanza
  await nueva.waitForURL((u) => u.href === NUEVA, { timeout: 15000 });
  const enNueva = await nueva.evaluate(() => ({ enc: localStorage.getItem('inv-local-enc'), tema: localStorage.getItem('inv-tema'), cache: localStorage.getItem('inv-cache-precios') === JSON.stringify({ mucho: 'no viaja' }), traida: !!localStorage.getItem('inv-mudanza-traida'), mudada: localStorage.getItem('inv-mudada') }));
  expect(enNueva.enc).toBe(JSON.stringify({ c: 'cartera-cifrada-de-prueba' }));
  expect(enNueva.tema).toBe(JSON.stringify('marmol'));
  expect(enNueva.cache).toBe(false);   // la copia de los precios no viaja (la nueva baja la suya)
  expect(enNueva.traida).toBe(true);
  expect(enNueva.mudada).toBeNull();
  expect(await vieja.evaluate(() => !!LS.get('inv-mudada'))).toBe(true);
  expect(errores).toEqual([]);
  await ctx.close();
});

test('la mudanza: una página de otra dirección no puede mandar datos a la nueva', async ({ browser }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  const { ctx } = await contexto(browser, info);
  // la nueva solo acepta datos de http://otra.prueba: lo que manda 127.0.0.1 es, para ella, de un extraño
  await ctx.addInitScript(() => { if (location.hostname === 'localhost') window.MUDANZA_PRUEBA.viejo = 'http://otra.prueba'; });
  const mala = await ctx.newPage();
  await mala.goto(VIEJA + '/');
  await mala.waitForFunction(() => typeof datosMudanza === 'function');
  await mala.evaluate(() => localStorage.setItem('inv-local-enc', JSON.stringify({ c: 'de-un-extrano' })));
  const nuevaP = ctx.waitForEvent('page');
  // sin esperar a que la nueva diga «lista» (a un extraño no se lo dice), le manda los datos una y otra vez
  await mala.evaluate((u) => { const w = window.open(u + '#mudanza'); let n = 0; const t = setInterval(() => { try { w.postMessage({ t: 'toison-mudanza-datos', d: datosMudanza() }, '*'); } catch (e) {} if (++n > 12) clearInterval(t); }, 250); }, NUEVA);
  const nueva = await nuevaP;
  await nueva.waitForSelector('.mudanza-caja');
  await nueva.waitForTimeout(3500);
  expect(await nueva.evaluate(() => localStorage.getItem('inv-local-enc'))).toBeNull();
  await ctx.close();
});

test('la mudanza: el aviso solo con la casa nueva lista; y ya mudado, la vieja salta a la nueva', async ({ browser }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  const { ctx, errores } = await contexto(browser, info);
  let lista = false;
  await ctx.route(/^http:\/\/localhost:8766\/version\.json/, (r) => (lista
    ? r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': VIEJA }, body: '{"v":"0.8.3"}' })
    : r.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': VIEJA }, body: '' })));
  const vieja = await ctx.newPage();
  await vieja.goto(VIEJA + '/');
  await vieja.waitForFunction(() => typeof revisarMudanza === 'function');
  await vieja.evaluate(() => { document.querySelectorAll('.hoja-fondo, .intro').forEach((x) => x.remove()); LS.set('inv-mudanza-aviso', ''); return revisarMudanza(); });
  await expect(vieja.locator('[data-mud-ir]')).toHaveCount(0);
  lista = true;
  await vieja.evaluate(() => { document.querySelectorAll('.hoja-fondo, .intro').forEach((x) => x.remove()); LS.set('inv-mudanza-aviso', ''); return revisarMudanza(); });
  await expect(vieja.locator('[data-mud-ir]')).toHaveText('Llevar mis datos');
  // una vez al día
  await vieja.evaluate(() => { document.querySelectorAll('.hoja-fondo').forEach((x) => x.remove()); return revisarMudanza(); });
  await expect(vieja.locator('[data-mud-ir]')).toHaveCount(0);
  // ya mudado: a la nueva, con lo que lleve detrás
  await vieja.evaluate(() => { LS.set('inv-mudada', '2026-11-29'); location.hash = '#ideas'; return revisarMudanza(); });
  await vieja.waitForURL(NUEVA + '#ideas');
  expect(errores).toEqual([]);
  await ctx.close();
});
