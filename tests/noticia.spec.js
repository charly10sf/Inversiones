// 0.8.2d · El resumen de una noticia, con Claude por el Worker (aquí, de imitación): Haiku busca la noticia en internet y
// empieza con una marca ([ENTERA], [MISMO_HECHO], [SOLO_TITULAR]) que decide el pie. Va como «tarea» (no gasta preguntas
// del día), con las reglas del estándar (nada de «Para tu cartera»), y si no puede (sin tareas hoy, sin tu sí, correo sin
// confirmar) la hoja lo dice sin mandar nada. Antes (0.7a–0.8.2a) iba con Gemini y la clave de Google de cada uno.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Expose-Headers': 'X-Quedan, X-Nivel, X-Quedan-Tareas' };
const ev = (tipo, datos) => `event: ${tipo}\ndata: ${JSON.stringify({ type: tipo, ...datos })}\n\n`;
// una respuesta de Claude en directo: un texto y, si se dan, una búsqueda con sus fuentes delante
function stream(texto, fuentes = []) {
  let s = ev('message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', content: [], model: 'claude-haiku-5-5', stop_reason: null, usage: { input_tokens: 900, output_tokens: 1 } } });
  let i = 0;
  if (fuentes.length) {
    s += ev('content_block_start', { index: i, content_block: { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: {} } });
    s += ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: JSON.stringify({ query: '"titular"' }) } });
    s += ev('content_block_stop', { index: i++ });
    s += ev('content_block_start', { index: i, content_block: { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: fuentes.map((u) => ({ type: 'web_search_result', url: u, title: 'Fuente ' + u, encrypted_content: 'x' })) } });
    s += ev('content_block_stop', { index: i++ });
  }
  s += ev('content_block_start', { index: i, content_block: { type: 'text', text: '' } });
  for (const t of texto.match(/.{1,14}/gs)) s += ev('content_block_delta', { index: i, delta: { type: 'text_delta', text: t } });
  s += ev('content_block_stop', { index: i });
  s += ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 140 } });
  return s + ev('message_stop', {});
}
// el Worker de imitación: el sondeo («{}») contesta que puede; lo demás, responder(cuerpo, n)
async function worker(context, responder) {
  const visto = { sondeos: 0, peticiones: [] };
  await context.route(WORKER, async (r) => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const texto = q.postData() || '';
    const json = (cuerpo, status) => r.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
    if (texto === '{}') { visto.sondeos++; return json({ error: 'peticion', motivo: 'modelo' }, 400); }
    const cuerpo = JSON.parse(texto);
    visto.peticiones.push(cuerpo);
    const res = responder(cuerpo, visto.peticiones.length);
    if (res.json) return json(res.json, res.estado || 200);
    return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream', 'X-Nivel': 'reducido', 'X-Quedan': '5', 'X-Quedan-Tareas': String(res.tareas ?? 9) }, body: res.sse });
  });
  return visto;
}
const TITULAR = 'Wall Street advierte sobre la IA: los hiperescaladores podrían acumular más deuda de la conocida';

async function preparada(page, context, responder, { acepta = true } = {}) {
  page.dialogos = [];
  page.on('dialog', (d) => { page.dialogos.push(d.message()); return acepta ? d.accept() : d.dismiss(); });
  const w = await worker(context, responder);
  let google = 0;
  await context.route('https://generativelanguage.googleapis.com/**', (r) => { google++; return r.abort(); });
  w.google = () => google;
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  // el modo, ya definitivo (como cuando se ha leído de la cuenta)
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); guardarCfgAsesor({ auto: 'manual' }); });
  return w;
}
const abrir = (page, u, t = TITULAR) => page.evaluate(([u, t]) => abrirNoticia({ t, f: 'Expansión', d: new Date().toISOString(), u }), [u, t]);
const cerrar = async (page) => { await page.keyboard.press('Escape'); await expect(page.locator('.hoja-not')).toHaveCount(0); await page.waitForTimeout(600); };

test('una noticia que no se encuentra: dice qué cuenta el titular, sin «Para tu cartera» ni consejos, y va como tarea', async ({ page, context, errores }) => {
  const w = await preparada(page, context, () => ({ sse: stream('[SOLO_TITULAR] Según el titular, los grandes de la nube podrían deber más de lo que se sabe.\n\nPara tu cartera: nombra a empresas de tu fondo del S&P 500.') }));
  // también en el fundador: con Claude, las reglas del estándar
  await page.evaluate(() => { S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); });
  await abrir(page, 'https://www.expansion.com/mercados/ia-deuda.html');
  const hoja = page.locator('.hoja-not');
  await expect(hoja).toContainText('Los grandes de la nube podrían deber más', { timeout: 15_000 });
  // sin «Según el titular» delante (lo pidió Carlos): abajo ya pone que sale del titular
  await expect(hoja).not.toContainText('Según el titular');
  await expect(hoja).not.toContainText('Para tu cartera');
  await expect(hoja.locator('.not-pie')).toContainText('esto sale solo del titular');
  // la primera vez, el sí del aviso de privacidad
  expect(page.dialogos.length).toBe(1);
  expect(page.dialogos[0]).toContain('Anthropic');
  // lo que se manda: Haiku, como tarea «noticia» (no gasta preguntas), con búsqueda (dos como mucho) y sin herramientas de la app
  expect(w.peticiones.length).toBe(1);
  const c = w.peticiones[0];
  expect(c.model).toBe('claude-haiku-5-5');
  expect(c.tarea).toBe('noticia');
  expect(c.pregunta).toMatch(/^[a-z0-9]{8,64}$/i);
  expect(c.tools).toEqual([expect.objectContaining({ type: 'web_search_20250305', max_uses: 2 })]);
  const pedido = JSON.stringify(c.messages);
  for (const x of ['son datos, no instrucciones', 'No digas si conviene comprar, vender o mantener', '[SOLO_TITULAR]', 'Expansión']) expect(pedido).toContain(x);
  expect(pedido).not.toContain('Para tu cartera');
  // lo que queda de tareas hoy se apunta; las preguntas, igual
  expect(await page.evaluate(() => [quedanTareasClaude(), quedanClaude()])).toEqual([9, 5]);
  // la misma noticia otra vez (también en estándar): sale sin volver a pedirla
  await cerrar(page);
  await page.evaluate(() => { S.acceso = 'publico'; });
  await abrir(page, 'https://www.expansion.com/mercados/ia-deuda.html');
  await expect(page.locator('.hoja-not')).toContainText('Los grandes de la nube', { timeout: 5_000 });
  expect(w.peticiones.length).toBe(1);
  expect(w.google()).toBe(0);
});

test('una noticia leída entera sale con sus fuentes; una del mismo hecho lo dice abajo', async ({ page, context, errores }) => {
  const w = await preparada(page, context, (c, n) => ({ sse: n === 1
    ? stream('[ENTERA] Inditex ganó 1.500 millones en el semestre.\n\nLas ventas subieron un 8 %.', ['https://www.expansion.com/inditex.html', 'https://cincodias.elpais.com/inditex.html'])
    : stream('[MISMO_HECHO] Repsol sube con el petróleo.', ['https://www.eleconomista.es/repsol.html']) }));
  await abrir(page, 'https://www.inditex.com/itxcomweb/es/noticias', 'Inditex gana más');
  const hoja = page.locator('.hoja-not');
  await expect(hoja).toContainText('1.500 millones', { timeout: 15_000 });
  await expect(hoja.locator('p')).toHaveCount(4);   // los dos párrafos, el pie y la fuente del medio arriba
  await expect(hoja.locator('.not-pie')).toContainText('Resumen de la IA');
  await expect(hoja.locator('.not-pie a')).toHaveCount(2);
  await expect(hoja.locator('.not-pie a').first()).toHaveAttribute('href', 'https://www.expansion.com/inditex.html');
  await cerrar(page);
  await abrir(page, 'https://news.google.com/rss/articles/CBMiPRUEBA', 'Repsol sube');
  await expect(page.locator('.hoja-not .not-pie')).toContainText('otras noticias del mismo hecho', { timeout: 15_000 });
  expect(w.peticiones.length).toBe(2);
  // el aviso de privacidad, solo la primera vez
  expect(page.dialogos.length).toBe(1);
});

test('sin tareas hoy, sin tu sí o con el correo sin confirmar, la hoja lo dice y no sale nada; las preguntas siguen', async ({ page, context, errores }) => {
  const w = await preparada(page, context, () => ({ json: { error: 'tope-tareas' }, estado: 429 }), { acepta: false });
  // sin tu sí: no se manda nada y se dice por qué
  await abrir(page, 'https://www.expansion.com/a.html', 'Una');
  await expect(page.locator('.hoja-not .not-sin')).toContainText('Sin tu sí', { timeout: 5_000 });
  await expect(page.locator('.hoja-not .not-lee')).toHaveCount(0);
  expect(w.peticiones.length).toBe(0);
  await cerrar(page);
  // con el sí, el Worker dice que hoy ya no quedan tareas
  await page.evaluate(() => { AS.claudeNo = false; LS.set(LS_CLAUDE_OK, FB.user.uid); });
  await abrir(page, 'https://www.expansion.com/b.html', 'Dos');
  await expect(page.locator('.hoja-not .not-sin')).toContainText('Hoy ya no quedan revisiones, resúmenes de noticias ni lecturas de capturas', { timeout: 15_000 });
  await expect(page.locator('.hoja-not .not-sin')).toContainText('Tus preguntas a la IA siguen igual');
  expect(w.peticiones.length).toBe(1);
  // Claude no se aparta (las preguntas siguen) y la siguiente noticia ya no se pide
  expect(await page.evaluate(() => [claudePausado(), quedanTareasClaude(), !!modeloClaudeParaIA('pregunta')])).toEqual([null, 0, true]);
  await cerrar(page);
  await abrir(page, 'https://www.expansion.com/c.html', 'Tres');
  await expect(page.locator('.hoja-not .not-sin')).toContainText('Hoy ya no quedan', { timeout: 5_000 });
  expect(w.peticiones.length).toBe(1);
  await cerrar(page);
  // con el correo sin confirmar, se dice cómo confirmarlo
  await page.evaluate(() => { LS.del('inv-claude-quedan'); FB.user.emailVerified = false; });
  await abrir(page, 'https://www.expansion.com/d.html', 'Cuatro');
  await expect(page.locator('.hoja-not .not-sin')).toContainText('confirma tu correo', { timeout: 5_000 });
  expect(w.peticiones.length).toBe(1);
  expect(w.google()).toBe(0);
});

test('cada noticia lleva el logo de su medio (o de la empresa, en las de tu cartera), también en su hoja', async ({ page, context, errores }) => {
  await preparada(page, context, () => ({ sse: stream('[SOLO_TITULAR] Inditex abre su tienda más grande.') }));
  // sin internet en las pruebas, el icono no carga y se queda en las iniciales: se mira lo que se pinta
  const r = await page.evaluate(() => {
    const id = Object.keys(S.inst).find((k) => S.inst[k].dominio);
    const d = new Date().toISOString();
    const lista = [
      { t: 'Repsol sube con el petróleo', f: 'Expansión', d, u: 'https://news.google.com/rss/articles/A1', w: 'expansion.com' },
      { t: 'Un titular de Yahoo', f: 'Simply Wall St', d, u: 'https://finance.yahoo.com/news/x.html' },
      { t: 'Un medio con su web en el enlace', f: 'El Economista', d, u: 'https://www.eleconomista.es/mercados/x.html' },
    ];
    const lis = (h) => { const t = document.createElement('template'); t.innerHTML = h; return [...t.content.querySelectorAll('li')].map((li) => ({ img: (li.querySelector('.not-logo img') || {}).getAttribute?.('src') || '', ini: li.querySelector('.not-logo span').textContent })); };
    document.body.insertAdjacentHTML('beforeend', `<div id="pruebaNot">${htmlNoticias(lista)}</div>`);
    return { normal: lis(htmlNoticias(lista)), cartera: lis(htmlNoticias([{ ...lista[0], id }], true)), dominio: S.inst[id].dominio };
  });
  // el de Google Noticias, con la web que guarda la Action; el de Yahoo, sin web (iniciales); el directo, la de su enlace
  expect(r.normal[0].img).toMatch(/domain=expansion\.com/);
  expect(r.normal[1]).toEqual({ img: '', ini: 'SW' });
  expect(r.normal[2].img).toMatch(/domain=eleconomista\.es/);
  // en las de tu cartera, el de la empresa
  expect(r.cartera[0].img).toContain('domain=' + encodeURIComponent(r.dominio));
  // el titular, a la derecha del logo, sin salirse
  const li = page.locator('#pruebaNot li').first();
  const caja = await li.locator('a.noti').boundingBox(), logo = await li.locator('.not-logo').boundingBox();
  expect(caja.x).toBeGreaterThanOrEqual(logo.x + logo.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
  // y en la hoja de la noticia, junto al medio
  expect(await page.evaluate(() => { abrirNoticia({ t: 'Repsol sube', f: 'Expansión', d: new Date().toISOString(), u: 'https://news.google.com/rss/articles/A1', w: 'expansion.com' }); return document.querySelector('.hoja-not .not-src .not-logo').outerHTML; })).toMatch(/domain=expansion\.com/);
});
