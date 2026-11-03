// 0.8: GrowIA con Claude. La app habla con la ruta /claude del Worker (aquí, de imitación) y, si Claude no puede, sigue con
// Gemini y la clave del usuario. Se comprueba: qué se manda (modelo, herramientas, búsqueda en internet, caché, ronda), que
// la respuesta en directo y las herramientas se pintan, los tokens en el registro, y cada camino a Gemini (sin permiso,
// sin créditos, error a mitad de la respuesta, Worker caído) y que ni la cartera ni nada sale si no puede usarse Claude.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  // auto: se prepara el contexto (Firebase de imitación, nada de internet) y se vigilan los errores en todas las pruebas
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const ev = (tipo, datos) => `event: ${tipo}\ndata: ${JSON.stringify({ type: tipo, ...datos })}\n\n`;
const usoIni = { input_tokens: 1200, cache_read_input_tokens: 0, cache_creation_input_tokens: 30000, output_tokens: 1 };
// una respuesta de Claude en directo: bloques = [{ tipo: 'texto', texto } | { tipo: 'herramienta', id, nombre, entrada } | { tipo: 'busqueda', consulta, fuentes }]
function stream(bloques, stop = 'end_turn', uso = usoIni, salida = 120, extra = {}) {
  let s = ev('message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', content: [], model: 'claude-sonnet-5-5', stop_reason: null, usage: uso } });
  bloques.forEach((b, i) => {
    if (b.tipo === 'texto') {
      s += ev('content_block_start', { index: i, content_block: { type: 'text', text: '' } });
      for (const t of b.texto.match(/.{1,12}/gs)) s += ev('content_block_delta', { index: i, delta: { type: 'text_delta', text: t } });
    } else if (b.tipo === 'herramienta') {
      s += ev('content_block_start', { index: i, content_block: { type: 'tool_use', id: b.id, name: b.nombre, input: {} } });
      const j = JSON.stringify(b.entrada);
      s += ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: j.slice(0, 5) } });
      s += ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: j.slice(5) } });
    } else if (b.tipo === 'busqueda') {
      s += ev('content_block_start', { index: i, content_block: { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: {} } });
      s += ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: JSON.stringify({ query: b.consulta }) } });
      s += ev('content_block_stop', { index: i });
      s += ev('content_block_start', { index: i + 100, content_block: { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: b.fuentes.map((u) => ({ type: 'web_search_result', url: u, title: 'Fuente ' + u, encrypted_content: 'xxx' })) } });
      s += ev('content_block_stop', { index: i + 100 });
      return;
    }
    s += ev('content_block_stop', { index: i });
  });
  if (extra.error) return s + ev('error', { error: extra.error });
  s += ev('message_delta', { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: salida, ...(extra.uso || {}) } });
  return s + ev('message_stop', {});
}
const sseGemini = (texto) => `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: texto }] }, finishReason: 'STOP' }], usageMetadata: {} })}\r\n\r\n`;

/* El Worker de imitación: `responder(cuerpo, n)` decide qué contesta a cada petición con cuerpo (la de sondeo, «{}», va
   aparte: 400 «peticion» si puede, y 403 si no). Devuelve lo que le ha llegado. */
async function worker(context, responder, { puede = true } = {}) {
  const visto = { sondeos: 0, peticiones: [] };
  await context.route(WORKER, async (r) => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const texto = q.postData() || '';
    const json = (cuerpo, status) => r.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
    if (texto === '{}') { visto.sondeos++; return puede ? json({ error: 'peticion', motivo: 'modelo' }, 400) : json({ error: 'no-permitido' }, 403); }
    const cuerpo = JSON.parse(texto);
    visto.peticiones.push({ cuerpo, auth: q.headers().authorization, bytes: texto.length });
    const res = responder(cuerpo, visto.peticiones.length);
    if (res.json) return json(res.json, res.estado || 200);
    return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream' }, body: res.sse });
  });
  return visto;
}
async function gemini(context) {
  const v = { n: 0 };
  await context.route('https://generativelanguage.googleapis.com/**', (r) => {
    if (/:streamGenerateContent/.test(r.request().url())) { v.n++; return r.fulfill({ status: 200, contentType: 'text/event-stream', body: sseGemini('Contesta Gemini: tu cartera sigue su curso.') }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [] }) });
  });
  return v;
}
// el aviso de privacidad de la primera vez (confirm): se guarda lo que dice y se contesta lo que toque
async function preparada(page, { acepta = true } = {}) {
  page.dialogos = [];
  page.on('dialog', (d) => { page.dialogos.push(d.message()); return acepta ? d.accept() : d.dismiss(); });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  // el modo, ya definitivo (como cuando se ha leído de la cuenta)
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); guardarCfgAsesor({ auto: 'manual' }); AS.clave = 'AQ.prueba-de-growfolio'; });
}
const preguntar = (page, q = '¿Qué ha pasado con Repsol este mes?') => page.evaluate((x) => abrirAsesor(x, true), q);

test('en modo estándar contesta Claude: manda lo que debe, pinta el directo, usa herramientas y apunta los tokens', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, (c, n) => (n === 1
    ? { sse: stream([{ tipo: 'texto', texto: 'Miro los datos.' }, { tipo: 'herramienta', id: 'toolu_1', nombre: 'buscar_empresa', entrada: { consulta: 'Repsol' } }], 'tool_use', usoIni, 60) }
    : { sse: stream([{ tipo: 'busqueda', consulta: 'Repsol resultados', fuentes: ['https://a.es/x', 'https://b.es/y'] }, { tipo: 'texto', texto: 'Repsol ha subido este mes y los analistas lo ven razonable.' }], 'end_turn', { input_tokens: 400, cache_read_input_tokens: 31000, cache_creation_input_tokens: 900, output_tokens: 1 }, 200, { uso: { server_tool_use: { web_search_requests: 1 } } }) }));
  await preguntar(page);
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('Repsol ha subido este mes', { timeout: 20_000 });
  await expect(cuerpo).toContainText('Mira los datos de Repsol');
  await expect(cuerpo).toContainText('Busca en internet: Repsol resultados');
  expect(g.n, 'Gemini no se ha usado').toBe(0);
  // la primera vez se dijo adónde van los datos, antes de mandar nada
  expect(page.dialogos.length).toBe(1);
  expect(page.dialogos[0]).toContain('Anthropic');
  expect(page.dialogos[0]).toContain('fuera de la Unión Europea');
  expect(w.sondeos).toBe(1);
  expect(w.peticiones.length).toBe(2);
  const [r1, r2] = w.peticiones.map((p) => p.cuerpo);
  expect(w.peticiones[0].auth).toBe('Bearer stub-token-' + (await page.evaluate(() => FB.user.uid)));
  // una pregunta va con Sonnet, con el razonamiento en medio, en directo y sin cosas que Claude 5.5 no admite
  expect(r1).toMatchObject({ model: 'claude-sonnet-5-5', stream: true, output_config: { effort: 'medium' }, ronda: 1 });
  expect(r2.ronda).toBe(2);
  for (const k of ['temperature', 'top_p', 'top_k', 'thinking']) expect(r1).not.toHaveProperty(k);
  expect(r1.max_tokens).toBeLessThanOrEqual(16000);
  // la nota de «soy una IA y no doy consejos personalizados» va primero; la caché, en el último bloque del sistema
  expect(r1.system[0].text).toContain('eres una IA');
  expect(r1.system[0].text).toContain('No das asesoramiento personalizado');
  expect(r1.system.at(-1).cache_control).toEqual({ type: 'ephemeral' });
  expect(r1.system.map((b) => b.text).join('\n')).toContain('Lo que no haces');   // el prompt del modo estándar, sin «compra» ni «vende»
  // las herramientas de la cartera y la búsqueda de Claude, con tope
  const nombres = r1.tools.map((t) => t.name);
  expect(nombres).toEqual(expect.arrayContaining(['simular_venta', 'simular_compra', 'buscar_empresa', 'radar', 'proyectar', 'historico', 'web_search']));
  expect(r1.tools.find((t) => t.name === 'web_search')).toMatchObject({ type: 'web_search_20250305', max_uses: 1 });
  // la segunda ronda devuelve el bloque de la herramienta y su resultado, y el último mensaje lleva el punto de caché
  const ult = r2.messages.at(-1), pen = r2.messages.at(-2);
  expect(pen.role).toBe('assistant');
  expect(pen.content.map((b) => b.type)).toEqual(['text', 'tool_use']);
  expect(pen.content[1]).toMatchObject({ id: 'toolu_1', name: 'buscar_empresa', input: { consulta: 'Repsol' } });
  expect(ult.role).toBe('user');
  expect(ult.content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'toolu_1' });
  expect(ult.content.at(-1).cache_control).toEqual({ type: 'ephemeral' });
  expect(() => JSON.parse(ult.content[0].content)).not.toThrow();
  // las fuentes de la búsqueda
  expect(await page.evaluate(() => AS.conv.at(-1).citas.map((c) => c.u))).toEqual(['https://a.es/x', 'https://b.es/y']);
  // tokens: la entrada es todo lo que se leyó (con la caché) y la salida ya lleva lo que piensa; el registro lo dice
  const t = await page.evaluate(() => LS.get('inv-ia-tokens', []).at(-1));
  expect(t.m['claude-sonnet-5-5']).toMatchObject({ e: 1200 + 30000 + 400 + 31000 + 900, c: 31000, w: 30900, s: 60 + 200, n: 2, b: 1 });
  const registro = await page.evaluate(() => textoDiarioIA());
  expect(registro).toMatch(/Sonnet 5\.5.*ronda 2.*caché 31\.000/);
  expect(registro).toMatch(/Tokens de la pregunta · Sonnet 5\.5: entrada .*\(caché 31\.000\).*· salida 260 \(2 rondas, 1 búsqueda\)/);
  expect(registro).toMatch(/Contesta en \d+ s con Sonnet 5\.5/);
  // y lo que cuenta de pregunta para la historia (la siguiente se manda con lo contestado)
  expect(await page.evaluate(() => AS.api.at(-1).content)).toContain('Repsol ha subido este mes');
});

test('la revisión automática va con Haiku, sin herramientas ni búsqueda; la que pides tú, con herramientas y búsqueda', async ({ page }) => {
  await preparada(page);
  await page.evaluate(() => LS.set('inv-claude-ok', true));   // una revisión automática no puede preguntar: va después de aceptar
  const w = await worker(page.context(), () => ({ sse: stream([{ tipo: 'texto', texto: '{"titular":"ok"}' }]) }));
  const pedir = (extra) => page.evaluate(async (x) => {
    const turno = { rol: 'ia', partes: [], citas: [], resultados: [] };
    await conversar({ tipo: 'análisis', mensajes: [{ role: 'user', content: 'Revisa mi cartera' }], turno, sistema: [{ type: 'text', text: 'Instrucciones' }, { type: 'text', text: 'Datos' }], maxTokens: 12000, alCambiar() {}, ...x });
    return turno.partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join('');
  }, extra);
  expect(await pedir({ herramientas: false, web: false, maxBusquedas: 0 })).toBe('{"titular":"ok"}');
  const auto = w.peticiones[0].cuerpo;
  expect(auto).toMatchObject({ model: 'claude-haiku-5-5', output_config: { effort: 'medium' }, max_tokens: 24000 });
  expect(auto).not.toHaveProperty('tools');
  // la que pide el usuario: con herramientas y búsqueda (3 como mucho) y más esfuerzo
  await pedir({ herramientas: true, web: true, maxBusquedas: 3 });
  const pedida = w.peticiones[1].cuerpo;
  expect(pedida.output_config.effort).toBe('medium');
  expect(pedida.tools.find((t) => t.name === 'web_search').max_uses).toBe(3);
  // el modelo se puede elegir en Ajustes de GrowIA
  await page.evaluate(() => LS.set('inv-ia-motor', 'sonnet'));
  await pedir({ herramientas: false, web: false, maxBusquedas: 0 });
  expect(w.peticiones[2].cuerpo.model).toBe('claude-sonnet-5-5');
});

test('un análisis que se queda sin espacio (max_tokens) se repite con esfuerzo bajo y sin búsqueda, y no sale cortado', async ({ page }) => {
  await preparada(page);
  await page.evaluate(() => LS.set('inv-claude-ok', true));
  const w = await worker(page.context(), (c, n) => (n === 1
    ? { sse: stream([{ tipo: 'busqueda', consulta: 'cartera', fuentes: ['https://a.es/x'] }, { tipo: 'texto', texto: '{"titular":"cortado' }], 'max_tokens', usoIni, 16731) }
    : { sse: stream([{ tipo: 'texto', texto: '{"titular":"entero","posiciones":{}}' }]) }));
  const texto = await page.evaluate(async () => {
    const turno = { rol: 'ia', partes: [], citas: [], resultados: [] };
    await conversar({ tipo: 'análisis', mensajes: [{ role: 'user', content: 'Revisa' }], turno, sistema: [{ type: 'text', text: 'I' }, { type: 'text', text: 'D' }], maxTokens: 12000, alCambiar() {}, herramientas: true, web: true, maxBusquedas: 3 });
    return [turno.partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join(''), turno.citas.length];
  });
  expect(texto).toEqual(['{"titular":"entero","posiciones":{}}', 0]);
  expect(w.peticiones.length).toBe(2);
  const [a, b] = w.peticiones.map((p) => p.cuerpo);
  expect(a.output_config.effort).toBe('medium');
  expect(a.tools.some((t) => t.name === 'web_search')).toBe(true);
  expect(b.output_config.effort).toBe('low');
  expect(b.tools.some((t) => t.name === 'web_search')).toBe(false);
  expect(await page.evaluate(() => textoDiarioIA())).toMatch(/se ha quedado sin espacio \(16\.731 de salida\)/);
  // dos intentos: se cuentan los dos en los tokens (se han gastado)
  expect(await page.evaluate(() => LS.get('inv-ia-tokens', []).at(-1).m['claude-haiku-5-5'].n)).toBe(2);
});

test('si Claude no tiene créditos pasa a Gemini, se aparta y la pregunta siguiente va directa a Gemini', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ json: { error: 'sin-creditos' }, estado: 402 }));
  await preguntar(page);
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('Contesta Gemini', { timeout: 20_000 });
  await expect(cuerpo).toContainText('Claude no está disponible ahora');
  expect(w.peticiones.length).toBe(1);
  expect(g.n).toBe(1);
  expect(await page.evaluate(() => claudePausado().motivo)).toBe('sin-creditos');
  expect(await page.evaluate(() => textoDiarioIA())).toMatch(/Claude no ha podido \(sin-creditos\).*se aparta 3 h: sigue Gemini/);
  // la siguiente no toca el Worker (ni el sondeo)
  await page.evaluate(() => { AS.cargando = false; });
  await preguntar(page, '¿Y qué pasa con IAG?');
  await expect.poll(() => g.n, { timeout: 20_000 }).toBe(2);
  expect(w.peticiones.length).toBe(1);
  expect(w.sondeos).toBe(1);
});

test('quien no está en la lista de Claude no manda nada de su cartera: el sondeo dice que no y contesta Gemini', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ json: { error: 'no debería llegar' }, estado: 500 }), { puede: false });
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Contesta Gemini', { timeout: 20_000 });
  expect(w.sondeos).toBe(1);
  expect(w.peticiones.length, 'nada de la cartera llegó al Worker').toBe(0);
  expect(await page.evaluate(() => claudePausado().motivo)).toBe('no-permitido');
  // sin Claude no se enseña lo de Claude en los ajustes
  expect(await page.evaluate(() => LS.get('inv-claude-ok', false))).toBe(false);
});

test('un error en mitad de la respuesta (saturado) pasa a Gemini y lo escrito por Claude no queda', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Empiezo a contestar y' }], 'end_turn', usoIni, 5, { error: { type: 'overloaded_error', message: 'Overloaded' } }) }));
  await preguntar(page);
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('Contesta Gemini', { timeout: 20_000 });
  await expect(cuerpo).not.toContainText('Empiezo a contestar');
  expect(w.peticiones.length).toBe(1);
  expect(g.n).toBe(1);
  // un saturado puntual no aparta a Claude: la pregunta siguiente lo vuelve a probar
  expect(await page.evaluate(() => claudePausado())).toBeNull();
  expect(await page.evaluate(() => textoDiarioIA())).toMatch(/Claude no ha podido \(overloaded_error: Overloaded\): sigue Gemini/);
});

test('con el Worker sin alcanzar (bloqueado o caído) contesta Gemini sin esperar y se aparta unos minutos', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  await context.route(WORKER, (r) => r.abort('failed'));
  const t0 = Date.now();
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Contesta Gemini', { timeout: 20_000 });
  expect(Date.now() - t0, 'sin esperas largas').toBeLessThan(15_000);
  expect(g.n).toBe(1);
  expect((await page.evaluate(() => claudePausado())).motivo).toBeTruthy();
});

test('en modo fundador, o con Claude apartado por el usuario, no se toca el Worker', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Claude' }]) }));
  await page.evaluate(() => { S.acceso = 'privado'; });
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Contesta Gemini', { timeout: 20_000 });
  expect(w.sondeos + w.peticiones.length).toBe(0);
  // estándar, pero eligiendo «solo Gemini»
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-ia-motor', 'gemini'); AS.cargando = false; });
  await preguntar(page, '¿Y IAG?');
  await expect.poll(() => g.n, { timeout: 20_000 }).toBe(2);
  expect(w.sondeos + w.peticiones.length).toBe(0);
});

test('sin aceptar el aviso de privacidad no se manda nada de la cartera: contesta Gemini y no vuelve a preguntar', async ({ page, context }) => {
  await preparada(page, { acepta: false });
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Claude' }]) }));
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Contesta Gemini', { timeout: 20_000 });
  expect(page.dialogos.length).toBe(1);
  expect(w.peticiones.length).toBe(0);
  expect(await page.evaluate(() => [motorElegido(), LS.get('inv-claude-ok', false)])).toEqual(['gemini', false]);
  await page.evaluate(() => { AS.cargando = false; });
  await preguntar(page, '¿Y IAG?');
  await expect.poll(() => g.n, { timeout: 20_000 }).toBe(2);
  expect(page.dialogos.length, 'no se vuelve a preguntar').toBe(1);
});

test('con el modo todavía provisional (dispositivo sin leer la cuenta) no se usa Claude', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Claude' }]) }));
  await page.evaluate(() => LS.set('inv-acceso', { a: 'publico', uid: null, t: Date.now(), provisional: true }));
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Contesta Gemini', { timeout: 20_000 });
  expect(w.sondeos + w.peticiones.length).toBe(0);
  expect(g.n).toBe(1);
});

test('con la búsqueda en internet las citas parten el texto en bloques seguidos: se pinta y se guarda como un solo texto', async ({ page, context }) => {
  await preparada(page);
  await gemini(context);
  await worker(context, () => ({ sse: stream([
    { tipo: 'texto', texto: 'Busco.' },
    { tipo: 'busqueda', consulta: 'Repsol hoy', fuentes: ['https://a.es/x'] },
    { tipo: 'texto', texto: 'Repsol ' }, { tipo: 'texto', texto: 'ha subido ' }, { tipo: 'texto', texto: 'un 3 % esta semana.' },
  ]) }));
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('un 3 % esta semana.', { timeout: 20_000 });
  const partes = await page.evaluate(() => AS.conv.at(-1).partes.filter((p) => p.tipo === 'texto').map((p) => p.texto));
  expect(partes).toEqual(['Busco.', 'Repsol ha subido un 3 % esta semana.']);
});

// el clic va por JavaScript: a veces sale encima una hoja de guía (primeros pasos) que se come los clics y no es lo que se prueba aquí
const clic = (page, selector) => page.locator(selector).evaluate((el) => el.click());
test('en Ajustes de GrowIA, una vez que Claude ha contestado, se puede elegir quién contesta y se dice adónde van los datos', async ({ page, context }) => {
  await preparada(page);
  await gemini(context);
  await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Hecho.' }]) }));
  await page.evaluate(() => abrirAsesor());
  await clic(page, '[data-as="ajustes"]');
  // antes de usar Claude no hay nada de Claude
  await expect(page.locator('#asCuerpo')).toContainText('Ajustes de la IA');
  await expect(page.locator('#asMotor')).toHaveCount(0);
  await expect(page.locator('#asesorFondo')).not.toContainText('Anthropic');
  await clic(page, '[data-as="chat"]');
  await page.evaluate(() => preguntarAsesor('¿Cómo voy?'));
  await expect(page.locator('#asCuerpo')).toContainText('Hecho.', { timeout: 20_000 });
  await clic(page, '[data-as="ajustes"]');
  const motor = page.locator('#asMotor');
  await expect(motor).toHaveCount(1);
  await expect(page.locator('#asesorFondo')).toContainText('Anthropic');
  await expect(page.locator('#asesorFondo')).toContainText('fuera de la Unión Europea');
  await motor.selectOption('haiku');
  await clic(page, '[data-as="guardar-ajustes"]');
  expect(await page.evaluate(() => LS.get('inv-ia-motor'))).toBe('haiku');
  expect(await page.evaluate(() => modeloClaudeParaIA('pregunta'))).toBe('claude-haiku-5-5');
  await clic(page, '[data-as="ajustes"]');
  await page.locator('#asMotor').selectOption('gemini');
  await clic(page, '[data-as="guardar-ajustes"]');
  expect(await page.evaluate(() => modeloClaudeParaIA('pregunta'))).toBeNull();
  await clic(page, '[data-as="ajustes"]');
  await expect(page.locator('#asesorFondo')).not.toContainText('Anthropic');
});

// 0.9: la IA sin clave de Google. Con Claude, quien está en la lista puede preguntar sin poner su clave; sin ella no hay
// Gemini de reserva, así que si Claude no puede se dice claro. Quien no está en la lista sigue viendo dónde poner la clave.
async function sinClave(page) {
  await preparada(page);
  await page.evaluate(() => { AS.claves = {}; LS.del(LS_CLAVE.google); if (S.cartera.asesor) delete S.cartera.asesor[CAMPO_CLAVE.google]; });
}
test('sin clave de Google, con Claude en la cuenta, la IA abre el chat y contesta Claude sin tocar Gemini', async ({ page, context }) => {
  await sinClave(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Tu cartera sube un poco hoy.' }]) }));
  await page.evaluate(() => abrirAsesor());
  // el sondeo vacío dice que sí y el panel pasa de «pon tu clave» al chat
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => iaLista())).toBe(true);
  await preguntar(page, '¿Cómo va hoy?');
  await expect(page.locator('#asCuerpo')).toContainText('Tu cartera sube un poco hoy.', { timeout: 20_000 });
  expect(g.n).toBe(0);
  expect(w.peticiones.length).toBe(1);
  expect(w.sondeos).toBe(1);
});
test('sin clave de Google, si Claude no puede (sin créditos) se dice claro y no se llama a Gemini', async ({ page, context }) => {
  await sinClave(page);
  const g = await gemini(context);
  await worker(context, () => ({ json: { error: 'sin-creditos' }, estado: 402 }));
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
  await preguntar(page, '¿Cómo va hoy?');
  await expect(page.locator('#asCuerpo')).toContainText('Claude no está disponible ahora', { timeout: 20_000 });
  await expect(page.locator('#asCuerpo')).toContainText('clave gratis de Google');
  expect(g.n).toBe(0);
});
test('sin clave de Google y fuera de la lista de Claude, la IA sigue pidiendo la clave y no sale nada de la cartera', async ({ page, context }) => {
  await sinClave(page);
  const w = await worker(context, () => ({ sse: '' }), { puede: false });
  await page.evaluate(() => abrirAsesor());
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => iaLista())).toBe(false);
  await expect(page.locator('#asCuerpo')).toContainText('Clave de Google');
  expect(w.peticiones.length).toBe(0);
});
test('sin clave de Google, decir que no al aviso no deja la IA sin salida: se explica y la siguiente vuelve a preguntar', async ({ page, context }) => {
  page.on('dialog', (d) => d.dismiss());
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); guardarCfgAsesor({ auto: 'manual' }); AS.claves = {}; LS.del(LS_CLAVE.google); });
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'no debería llegar' }]) }));
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
  await preguntar(page, '¿Cómo va hoy?');
  await expect(page.locator('#asCuerpo')).toContainText('Sin tu sí', { timeout: 20_000 });
  expect(await page.evaluate(() => LS.get(LS_MOTOR, null))).not.toBe('gemini');
  expect(w.peticiones.length).toBe(0);
  expect(g.n).toBe(0);
});
test('sin clave de Google, si el sondeo no llega al Worker se aparta unos minutos y no se repite en cada recarga', async ({ page, context }) => {
  await sinClave(page);
  let sondeos = 0;
  await context.route(WORKER, (r) => { sondeos++; return r.abort(); });
  await page.evaluate(() => sondearClaude());
  await page.evaluate(() => sondearClaude());
  await page.evaluate(() => sondearClaude());
  expect(sondeos).toBe(1);
  expect(await page.evaluate(() => !!claudePausado())).toBe(true);
});
