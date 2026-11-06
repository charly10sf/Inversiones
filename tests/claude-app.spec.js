// 0.8: la IA con Claude. La app habla con la ruta /claude del Worker (aquí, de imitación). Desde la 0.8.2b es el único motor:
// sin Gemini de reserva, si Sonnet falla contesta Haiku y, si no, se dice claro. Se comprueba: qué se manda (modelo,
// herramientas, búsqueda en internet, caché, ronda), que la respuesta en directo y las herramientas se pintan, los tokens en
// el registro, cada fallo (sin créditos, error a mitad de la respuesta, Worker caído, topes) y que ni la cartera ni nada sale
// si no puede usarse Claude. Gemini se sigue vigilando (gemini()) para comprobar que nunca se llama.
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
    return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream', ...(res.cabeceras || {}) }, body: res.sse });
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
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); guardarCfgAsesor({ auto: 'manual' }); });
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
  // 0.8.2: una pregunta va con Haiku (Sonnet, con «A fondo»), con el razonamiento en medio, en directo y sin cosas que Claude 5.5 no admite
  expect(r1).toMatchObject({ model: 'claude-haiku-5-5', stream: true, output_config: { effort: 'medium' }, ronda: 1 });
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
  expect(t.m['claude-haiku-5-5']).toMatchObject({ e: 1200 + 30000 + 400 + 31000 + 900, c: 31000, w: 30900, s: 60 + 200, n: 2, b: 1 });
  const registro = await page.evaluate(() => textoDiarioIA());
  expect(registro).toMatch(/Haiku 5\.5.*ronda 2.*caché 31\.000/);
  expect(registro).toMatch(/Tokens de la pregunta · Haiku 5\.5: entrada .*\(caché 31\.000\).*· salida 260 \(2 rondas, 1 búsqueda\)/);
  expect(registro).toMatch(/Contesta en \d+ s con Haiku 5\.5/);
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

test('si Claude no tiene créditos se dice claro, se aparta y la pregunta siguiente lo dice sin tocar el Worker', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ json: { error: 'sin-creditos' }, estado: 402 }));
  await preguntar(page);
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('La IA no está disponible ahora mismo', { timeout: 20_000 });
  await expect(cuerpo.locator('[data-as="reintentar"]')).toHaveCount(1);
  await expect(cuerpo).not.toContainText('Google');
  expect(w.peticiones.length).toBe(1);
  expect(await page.evaluate(() => claudePausado().motivo)).toBe('sin-creditos');
  expect(await page.evaluate(() => textoDiarioIA())).toMatch(/Claude no ha podido \(sin-creditos\), se aparta 3 h/);
  // la siguiente no toca el Worker (ni el sondeo)
  await page.evaluate(() => { AS.cargando = false; });
  await page.evaluate(() => preguntarAsesor('¿Y qué pasa con IAG?'));
  await expect(cuerpo.locator('.as-error')).toHaveCount(2, { timeout: 20_000 });
  expect(w.peticiones.length).toBe(1);
  expect(w.sondeos).toBe(1);
  expect(g.n).toBe(0);
});

// 0.8.2b: sin Gemini de reserva, si falla Sonnet («A fondo») contesta Haiku; lo escrito por Sonnet no queda
test('un error de Sonnet en mitad de la respuesta (saturado) pasa a Haiku y lo escrito no queda', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, (c) => (c.model === 'claude-sonnet-5-5'
    ? { sse: stream([{ tipo: 'texto', texto: 'Empiezo a contestar y' }], 'end_turn', usoIni, 5, { error: { type: 'overloaded_error', message: 'Overloaded' } }) }
    : { sse: stream([{ tipo: 'texto', texto: 'Contesta Haiku: tu cartera sigue su curso.' }]) }));
  await page.evaluate(() => { AS.aFondo = true; });
  await preguntar(page);
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('Contesta Haiku', { timeout: 20_000 });
  await expect(cuerpo).toContainText('contesta la normal');
  await expect(cuerpo).not.toContainText('Empiezo a contestar');
  expect(w.peticiones.map((p) => p.cuerpo.model)).toEqual(['claude-sonnet-5-5', 'claude-haiku-5-5']);
  // la misma pregunta para el Worker (no gasta otra)
  expect(w.peticiones[1].cuerpo.pregunta).toBe(w.peticiones[0].cuerpo.pregunta);
  expect(g.n).toBe(0);
  // un saturado puntual no aparta a Claude
  expect(await page.evaluate(() => claudePausado())).toBeNull();
  expect(await page.evaluate(() => textoDiarioIA())).toMatch(/Sonnet 5\.5 no ha podido \(overloaded_error\): sigue Haiku/);
});

test('sin «A fondo» hoy (nivel reducido) contesta Haiku, se apaga «A fondo» y la siguiente va directa con Haiku', async ({ page, context }) => {
  await preparada(page);
  const w = await worker(context, (c) => (c.model === 'claude-sonnet-5-5'
    ? { json: { error: 'tope-fondo' }, estado: 429 }
    : { sse: stream([{ tipo: 'texto', texto: 'Contesta Haiku.' }]), cabeceras: { 'X-Quedan': '9', 'X-Nivel': 'reducido', 'Access-Control-Expose-Headers': 'X-Quedan, X-Quedan-Fondo, X-Nivel' } }));
  await page.evaluate(() => { AS.aFondo = true; });
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Contesta Haiku.', { timeout: 20_000 });
  await expect(page.locator('#asCuerpo')).toContainText('ya no te quedan respuestas «A fondo»');
  expect(await page.evaluate(() => [AS.aFondo, quedanFondoClaude(), quedanClaude(), claudePausado()])).toEqual([false, 0, 9, null]);
  // eligiendo otra vez «A fondo» hoy: Haiku sin pasar por Sonnet, y arriba se dice
  await page.evaluate(() => { AS.aFondo = true; AS.cargando = false; pintarAsesor(); });
  await expect(page.locator('#asSub')).toHaveText('Sin «A fondo» hasta mañana');
  await page.evaluate(() => preguntarAsesor('¿Y otra?'));
  await expect.poll(() => w.peticiones.length, { timeout: 20_000 }).toBe(3);
  expect(w.peticiones.map((p) => p.cuerpo.model)).toEqual(['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-haiku-5-5']);
});

test('con el tope del día o el techo de todos, la IA dice que vuelva mañana y no lo intenta hasta entonces', async ({ page, context }) => {
  await preparada(page);
  let error = 'techo';
  const w = await worker(context, () => ({ json: { error }, estado: 429 }));
  await page.evaluate(() => { AS.aFondo = true; });
  await preguntar(page);
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('Hoy la IA ha llegado a su tope de uso. Vuelve a probar en un rato o', { timeout: 20_000 });
  // en España, en invierno, el día del Worker (UTC) empieza a la 1:00
  expect(await page.evaluate(() => cuandoVuelveClaude())).toMatch(/^(hoy|mañana) a partir de la 1:00$/);
  // el techo no es de Sonnet: no se prueba con Haiku
  expect(w.peticiones.length).toBe(1);
  expect(await page.evaluate(() => claudePausado().motivo)).toBe('techo');
  // el tope de cada uno
  await page.evaluate(() => { LS.del(LS_CLAUDE_PAUSA); AS.cargando = false; AS.aFondo = false; });
  error = 'tope-diario';
  await page.evaluate(() => preguntarAsesor('¿Y hoy?'));
  await expect(cuerpo).toContainText('Has llegado al tope de hoy. Puedes volver a preguntar', { timeout: 20_000 });
  await expect(page.locator('#asSub')).toHaveText('Sin preguntas hasta mañana');
  expect(w.peticiones.length).toBe(2);
});

test('con el Worker sin alcanzar (bloqueado o caído) se dice claro sin esperar y se aparta unos minutos', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  await context.route(WORKER, (r) => r.abort('failed'));
  const t0 = Date.now();
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asCuerpo')).toContainText('La IA no está disponible ahora mismo', { timeout: 20_000 });
  expect(Date.now() - t0, 'sin esperas largas').toBeLessThan(15_000);
  await expect(page.locator('[data-as="reprobar"]')).toHaveCount(1);
  await expect(page.locator('#asCuerpo')).toContainText('Copiar mi cartera para otra IA');
  expect(g.n).toBe(0);
  expect((await page.evaluate(() => claudePausado())).motivo).toBeTruthy();
});

// 0.8.2 (opción B): el fundador también va con Claude, pero con las reglas del estándar; con Gemini, el asesor de siempre
const fundador = (page) => page.evaluate(() => { S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); });
test('en modo fundador contesta Claude con las reglas del estándar', async ({ page, context }) => {
  await preparada(page);
  await fundador(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Según las reglas que escribiste, esto supondría vender 10 acciones.' }]) }));
  await preguntar(page);
  await expect(page.locator('#asCuerpo')).toContainText('Según las reglas que escribiste', { timeout: 20_000 });
  expect(g.n).toBe(0);
  expect(w.peticiones.length).toBe(1);
  const sis = w.peticiones[0].cuerpo.system.map((b) => b.text).join('\n');
  // el prompt del estándar (sin recomendaciones) y la nota del Paso a paso del fundador; nada del asesor de siempre
  expect(sis).toContain('Lo que no haces');
  expect(sis).toContain('Su Paso a paso lo calcula Toisón con reglas fijas');
  expect(sis).not.toContain('Primero la respuesta o la recomendación concreta');
  expect(sis).not.toContain('Nada de avisos de que no eres asesor');
  expect(sis).not.toContain('## Planes de venta que propone Toisón');
  expect(sis).not.toContain('Las ideas de compra que mejor encajan');
  expect(sis).not.toMatch(/^- (Comprar|Evitar) /m);
  // la respuesta queda marcada como hecha con las reglas del estándar y con su modelo, sin ningún aviso debajo
  expect(await page.evaluate(() => AS.conv.at(-1).estandar)).toBe(true);
  expect(await page.evaluate(() => AS.conv.at(-1).modelo)).toBe('claude-haiku-5-5');
  await expect(page.locator('#asCuerpo .as-pie-ia')).toHaveCount(0);
  // 0.8.2b: quien tuviera elegido «solo Gemini» pasa a Claude
  await page.evaluate(() => { LS.set('inv-ia-motor', 'gemini'); AS.cargando = false; });
  expect(await page.evaluate(() => [motorElegido(), modeloClaudeParaIA('pregunta')])).toEqual(['auto', 'claude-haiku-5-5']);
});

test('con el modo todavía provisional (dispositivo sin leer la cuenta) no se usa Claude ni sale nada', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Claude' }]) }));
  await page.evaluate(() => LS.set('inv-acceso', { a: 'publico', uid: null, t: Date.now(), provisional: true }));
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asCuerpo')).toContainText('La IA no está disponible ahora mismo', { timeout: 20_000 });
  expect(w.sondeos + w.peticiones.length).toBe(0);
  expect(g.n).toBe(0);
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
test('en Ajustes de la IA se puede elegir quién contesta (sin Gemini) y se dice adónde van los datos', async ({ page, context }) => {
  await preparada(page);
  const g = await gemini(context);
  await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Hecho.' }]) }));
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
  await clic(page, '[data-as="ajustes"]');
  await expect(page.locator('#asCuerpo')).toContainText('Ajustes de la IA');
  const motor = page.locator('#asMotor');
  await expect(motor).toHaveCount(1);
  await expect(motor.locator('option')).toHaveCount(3);
  await expect(motor.locator('option[value="gemini"]')).toHaveCount(0);
  await expect(page.locator('#asesorFondo')).toContainText('Anthropic');
  await expect(page.locator('#asesorFondo')).toContainText('fuera de la Unión Europea');
  // nada de la clave de Google
  await expect(page.locator('#asesorFondo')).not.toContainText('Clave de Google');
  await expect(page.locator('#asClave')).toHaveCount(0);
  await motor.selectOption('haiku');
  await clic(page, '[data-as="guardar-ajustes"]');
  expect(await page.evaluate(() => LS.get('inv-ia-motor'))).toBe('haiku');
  expect(await page.evaluate(() => modeloClaudeParaIA('pregunta'))).toBe('claude-haiku-5-5');
  await page.evaluate(() => preguntarAsesor('¿Cómo voy?'));
  await expect(page.locator('#asCuerpo')).toContainText('Hecho.', { timeout: 20_000 });
  expect(g.n).toBe(0);
});

// 0.8.2b: nadie pone clave de Google. Si Claude no puede, se dice claro y qué hacer
async function sinClave(page) {
  await preparada(page);
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
  await expect(page.locator('#asCuerpo')).toContainText('La IA no está disponible ahora mismo', { timeout: 20_000 });
  await expect(page.locator('#asCuerpo')).not.toContainText('clave');
  expect(g.n).toBe(0);
});
test('si el Worker no deja (correo sin confirmar), la IA lo dice y no sale nada de la cartera', async ({ page, context }) => {
  await sinClave(page);
  const w = await worker(context, () => ({ sse: '' }), { puede: false });
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asCuerpo')).toContainText('confirma tu correo', { timeout: 15_000 });
  expect(await page.evaluate(() => iaLista())).toBe(false);
  await expect(page.locator('#asCuerpo')).not.toContainText('Clave de Google');
  expect(w.peticiones.length).toBe(0);
});
test('sin clave de Google, decir que no al aviso no deja la IA sin salida: se explica y la siguiente vuelve a preguntar', async ({ page, context }) => {
  page.on('dialog', (d) => d.dismiss());
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); guardarCfgAsesor({ auto: 'manual' }); });
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
test('en modo fundador contesta Claude (opción B); con el modo provisional no se toca el Worker', async ({ page, context }) => {
  await sinClave(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Claude' }]) }));
  await fundador(page);
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => iaLista())).toBe(true);
  expect(w.sondeos).toBe(1);
  await page.evaluate(() => { cerrarAsesor(); LS.del('inv-claude-sondeo'); });
  const s0 = w.sondeos;
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: null, t: Date.now(), provisional: true }); });
  await page.evaluate(() => abrirAsesor());
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => iaLista())).toBe(false);
  await expect(page.locator('#asCuerpo')).toContainText('no está disponible');
  expect(w.sondeos).toBe(s0);
  expect(w.peticiones.length).toBe(0);
  expect(g.n).toBe(0);
});
test('sin clave de Google, si Claude se corta a mitad, lo escrito queda marcado como incompleto junto al error', async ({ page, context }) => {
  await sinClave(page);
  const g = await gemini(context);
  // la primera ronda escribe algo y pide una herramienta; la segunda se corta (lo de la ronda que falla ya se quita solo)
  await worker(context, (c, n) => (n === 1
    ? { sse: stream([{ tipo: 'texto', texto: 'Empiezo a contestar y miro tus datos.' }, { tipo: 'herramienta', id: 'toolu_1', nombre: 'buscar_empresa', entrada: { consulta: 'Repsol' } }], 'tool_use', usoIni, 60) }
    : { sse: stream([{ tipo: 'texto', texto: 'Sigo y' }], 'end_turn', usoIni, 5, { error: { type: 'overloaded_error', message: 'Overloaded' } }) }));
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
  await preguntar(page, '¿Cómo va hoy?');
  const cuerpo = page.locator('#asCuerpo');
  await expect(cuerpo).toContainText('La respuesta se ha cortado a mitad', { timeout: 20_000 });
  await expect(cuerpo).toContainText('Empiezo a contestar');
  await expect(cuerpo).not.toContainText('Sigo y');
  await expect(cuerpo.locator('.as-corte')).toContainText('está a medias');
  expect(g.n).toBe(0);
});
test('con Claude en la cuenta, la noticia la resume Claude (con búsqueda) y no se toca Gemini', async ({ page, context }) => {
  await sinClave(page);
  const g = await gemini(context);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Repsol ha subido un 3 % tras presentar resultados.' }]) }));
  await page.evaluate(() => sondearClaude());
  expect(await page.evaluate(() => claudeParaTodo())).toBe(true);
  await page.evaluate(() => abrirNoticia({ t: 'Repsol sube', f: 'Expansión', d: '', u: 'https://example.com/n', w: '' }));
  await expect(page.locator('.hoja-not')).toContainText('Repsol ha subido un 3 %', { timeout: 15_000 });
  await expect(page.locator('.hoja-not [data-not-ia]')).toHaveCount(0);
  expect(w.peticiones.length).toBe(1);
  expect(w.peticiones[0].cuerpo.model).toBe('claude-haiku-5-5');
  expect(JSON.stringify(w.peticiones[0].cuerpo.tools || [])).toContain('web_search');
  expect(g.n).toBe(0);
});
test('con Claude en la cuenta, Importar lee con Claude (Sonnet) y una captura va como imagen', async ({ page, context }) => {
  await sinClave(page);
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: '{"plataforma":"MyInvestor","posiciones":[{"nombre":"Fondo X","cantidad":3}],"operaciones":[]}' }]) }));
  await page.evaluate(() => sondearClaude());
  const o = await page.evaluate(async () => { await cargarTrozo('importar'); LS.set(LS_CLAUDE_OK, true); return leerUnaVez([{ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }, { text: 'lee esto' }], () => {}); });
  expect(o.posiciones[0].nombre).toBe('Fondo X');
  const c = w.peticiones[0].cuerpo;
  expect(c.model).toBe('claude-sonnet-5-5');
  expect(c.messages[0].content[0].type).toBe('image');
});

// 0.8.2 · opción B en la revisión de la cartera: con Claude, el fundador recibe la del estándar (sin comprar ni vender),
// queda marcada como hecha con esas reglas y no se rehace en bucle por «otro modo»
test('en modo fundador, la revisión con Claude va con las reglas del estándar y no se rehace por el modo', async ({ page, context }) => {
  await preparada(page);
  await fundador(page);
  await page.evaluate(() => LS.set('inv-claude-ok', true));
  await gemini(context);
  const ids = await page.evaluate(() => [...new Set((S.M || calcular()).filas.map((f) => f.inst.id))]);
  const json = { titular: 'Tu cartera sigue en orden.', resumen: ['Sube un 1 %.'], posiciones: Object.fromEntries(ids.map((k) => [k, { texto: 'Sin cambios.' }])) };
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: '```json\n' + JSON.stringify(json) + '\n```' }]) }));
  await page.evaluate(() => generarAnalisisIA('la pides tú'));
  await expect.poll(() => page.evaluate(() => !!(S.iaPropio && S.iaPropio.json)), { timeout: 20_000 }).toBe(true);
  const c = w.peticiones[0].cuerpo;
  expect(JSON.stringify(c.messages[0].content)).toContain('No me digas que compre, venda, mantenga ni traspase');
  const sis = c.system.map((b) => b.text).join('\n');
  expect(sis).toContain('Lo que no haces');
  expect(sis).not.toContain('Las ideas de compra que mejor encajan');
  expect(await page.evaluate(() => ({ p: S.iaPropio.json.publico, m: S.iaPropio.json.modo }))).toEqual({ p: true, m: 'privado' });
  // sigue en el fundador: no hay «otro modo» y no se vuelve a pedir
  const n = w.peticiones.length;
  await page.evaluate(() => { IA.ultimoIntento = 0; guardarCfgAsesor({ auto: 'diario' }); return revisarAnalisisIA(); });
  await page.waitForTimeout(800);
  expect(w.peticiones.length).toBe(n);
});

// 0.8.2 · arriba del panel, siempre: que es una IA, cuál, que puede equivocarse y qué hace y qué no
test('el panel no lleva aviso fijo ni línea de IA debajo de las respuestas', async ({ page, context }) => {
  await preparada(page);
  await gemini(context);
  await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Hecho.' }]) }));
  // la respuesta guarda su modelo pero no lo dice
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#asAviso')).toHaveCount(0);
  await page.evaluate(() => preguntarAsesor('¿Cómo voy?'));
  await expect(page.locator('#asCuerpo')).toContainText('Hecho.', { timeout: 20_000 });
  expect(await page.evaluate(() => AS.conv.at(-1).modelo)).toBe('claude-haiku-5-5');
  await expect(page.locator('#asCuerpo .as-pie-ia')).toHaveCount(0);
  await expect(page.locator('#asAviso')).toHaveCount(0);
});

// 0.8.2 · lo que entra en los datos con cada juego de reglas, en el fundador
test('en el fundador, los datos con las reglas del estándar no llevan planes de venta, ideas de compra ni la señal de Toisón, y el historial del asesor de siempre no se manda', async ({ page }) => {
  await preparada(page);
  await fundador(page);
  const r = await page.evaluate(() => { const M = S.M || calcular(); return { est: contextoAsesor(M, 'chat', true), fund: contextoAsesor(M, 'chat', false), iEst: instruccionesAsesor(true), iFund: instruccionesAsesor(false) }; });
  expect(r.fund).toContain('## Planes de venta que propone Toisón ahora');
  expect(r.est).not.toContain('## Planes de venta que propone Toisón');
  expect(r.est).not.toContain('ajusta todos tus consejos');
  expect(r.est).toContain('no para decirle qué le encaja');
  if (r.fund.includes('## Su hoja de ruta en Toisón')) expect(r.est).toContain('## Lo que calcula su Paso a paso en Toisón');
  // la señal de cada posición: la de los analistas, no la de Toisón (auditoría del 5 nov)
  expect(r.est).not.toContain('Señal automática de Toisón');
  // buscar_empresa, con las reglas del estándar, sin puesto entre las ideas
  const b = await page.evaluate(() => { const x = mejoresIdeas(S.M || calcular())[0]; return x ? { est: JSON.stringify(ejecutarHerramienta('buscar_empresa', { consulta: x.s }, true)), fund: JSON.stringify(ejecutarHerramienta('buscar_empresa', { consulta: x.s }, false)) } : null; });
  if (b) { expect(b.est).not.toContain('"puesto"'); expect(b.fund).toContain('"puesto"'); }
  // el historial: con las reglas del estándar, lo que escribió el asesor de siempre (Gemini) no se manda
  const h = await page.evaluate(() => historialPara([{ role: 'user', content: '¿Vendo Repsol?' }, { role: 'assistant', content: 'Vende 10 Repsol.', est: false }, { role: 'user', content: '¿Y IAG?' }, { role: 'assistant', content: 'IAG está así.', est: true }], true));
  expect(JSON.stringify(h)).not.toContain('Vende 10 Repsol');
  expect(h[1].content).toContain('No se repite');
  expect(h[3].content).toBe('IAG está así.');
  expect(h.some((m) => 'est' in m)).toBe(false);
  expect(r.iEst).toContain('Lo que no haces');
  expect(r.iEst).toContain('Su Paso a paso lo calcula Toisón con reglas fijas');
  expect(r.iFund).toContain('Primero la respuesta o la recomendación concreta');
});

// 0.8.2 · Haiku por defecto; «A fondo» (Sonnet) para las preguntas que elijas, hasta la conversación nueva; y las preguntas
// que te quedan hoy, a la vista (las dice el Worker en X-Quedan)
test('con Claude, Normal es Haiku y «A fondo» es Sonnet; arriba, las preguntas que te quedan hoy', async ({ page, context }) => {
  await preparada(page);
  await gemini(context);
  let quedan = 29;
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Hecho.' }]), cabeceras: { 'X-Quedan': String(quedan--), 'Access-Control-Expose-Headers': 'X-Quedan' } }));
  await preguntar(page, '¿Cómo voy?');
  await expect(page.locator('#asCuerpo')).toContainText('Hecho.', { timeout: 20_000 });
  expect(w.peticiones[0].cuerpo.model).toBe('claude-haiku-5-5');
  await expect(page.locator('#asSub')).toHaveText('29 preguntas más hoy');
  // el botón de la respuesta: Normal (Haiku) o A fondo (Sonnet)
  const fondoB = page.locator('#asModo [data-as="fondo"][data-m="fondo"]');
  await expect(fondoB).toHaveAttribute('aria-pressed', 'false');
  await fondoB.evaluate((el) => el.click());
  await expect(fondoB).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#asModo')).toContainText('Sonnet');
  await page.evaluate(() => preguntarAsesor('¿Y a fondo?'));
  await expect.poll(() => w.peticiones.length, { timeout: 20_000 }).toBe(2);
  expect(w.peticiones[1].cuerpo.model).toBe('claude-sonnet-5-5');
  await expect(page.locator('#asSub')).toHaveText('28 preguntas más hoy');
  // las revisiones siguen con Haiku aunque elijas «A fondo»
  expect(await page.evaluate(() => modeloClaudeParaIA('análisis'))).toBe('claude-haiku-5-5');
  // conversación nueva: vuelve a Normal
  await clic(page, '[data-as="nueva"]');
  await expect(page.locator('#asModo [data-as="fondo"][data-m="normal"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => modeloClaudeParaIA('pregunta'))).toBe('claude-haiku-5-5');
  // con el tope del día, lo dice
  await page.evaluate(() => { apuntarQuedanClaude(0); pintarAsesor(); });
  await expect(page.locator('#asSub')).toHaveText('Sin preguntas hasta mañana');
  // con un modelo fijo elegido en Ajustes no hay botón
  await page.evaluate(() => { LS.set('inv-ia-motor', 'haiku'); pintarAsesor(); });
  await expect(page.locator('#asModo [data-as="fondo"]')).toHaveCount(0);
});

// 0.8.2 · tus conversaciones: se guardan cifradas en el dispositivo, se abren, se siguen y se borran
test('las conversaciones se guardan cifradas, se abren desde el panel y se borran', async ({ page, context }) => {
  await preparada(page);
  await gemini(context);
  await worker(context, (c) => ({ sse: stream([{ tipo: 'texto', texto: `Respuesta a ${JSON.stringify(c.messages.at(-1).content).includes('Repsol') ? 'Repsol' : 'IAG'}.` }]) }));
  await preguntar(page, '¿Qué ha pasado con Repsol?');
  await expect(page.locator('#asCuerpo')).toContainText('Respuesta a Repsol.', { timeout: 20_000 });
  await clic(page, '[data-as="nueva"]');
  const lista = page.locator('#asCuerpo .as-convs');
  await expect(lista).toContainText('¿Qué ha pasado con Repsol?');
  await page.evaluate(() => preguntarAsesor('¿Y con IAG?'));
  await expect(page.locator('#asCuerpo')).toContainText('Respuesta a IAG.', { timeout: 20_000 });
  await clic(page, '[data-as="nueva"]');
  await expect(lista.locator('li')).toHaveCount(2);
  await expect(lista.locator('li').first()).toContainText('¿Y con IAG?');
  // cifradas: en el almacén no se lee nada de lo hablado
  const crudo = await page.evaluate(() => localStorage.getItem(LS.k('inv-asesor-convs')));
  expect(crudo).toContain('"ct"');
  expect(crudo).not.toContain('Repsol');
  // abrir la primera la trae entera y se puede seguir
  await lista.locator('[data-as="abrir-conv"]').last().evaluate((el) => el.click());
  await expect(page.locator('#asCuerpo')).toContainText('Respuesta a Repsol.');
  expect(await page.evaluate(() => AS.api.length)).toBe(2);
  // borrar una y luego todas
  await clic(page, '[data-as="nueva"]');
  await lista.locator('[data-as="borrar-conv"]').first().evaluate((el) => el.click());
  await expect(lista.locator('li')).toHaveCount(1);
  await page.evaluate(() => { AS.vista = 'convs'; pintarAsesor(); });
  await clic(page, '[data-as="borrar-convs"]');
  await expect(page.locator('#asCuerpo .as-convs')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem(LS.k('inv-asesor-convs')))).toBeNull();
});

// 0.8.2d · la revisión de la cartera e importar van como «tarea» (su propio contador en el Worker, no gastan preguntas); en el
// nivel reducido la revisión automática no se rehace a cada cambio de señal o noticia; y en la cartera de prueba contesta
// Claude con tu cuenta, sobre la cartera inventada
test('la revisión va como tarea; en el nivel reducido la automática no se rehace por señales ni noticias; sin tareas, no reintenta', async ({ page }) => {
  await preparada(page);
  await page.evaluate(() => LS.set('inv-claude-ok', true));
  const ids = await page.evaluate(() => [...new Set((S.M || calcular()).filas.map((f) => f.inst.id))]);
  const json = { titular: 'Tu cartera sigue en orden.', resumen: ['Sube un 1 %.'], posiciones: Object.fromEntries(ids.map((k) => [k, { texto: 'Sin cambios.' }])) };
  let tope = false;
  const w = await worker(page.context(), () => (tope ? { json: { error: 'tope-tareas' }, estado: 429 } : { sse: stream([{ tipo: 'texto', texto: '```json\n' + JSON.stringify(json) + '\n```' }]), cabeceras: { 'X-Nivel': 'reducido', 'X-Quedan': '5', 'X-Quedan-Tareas': '9', 'Access-Control-Expose-Headers': 'X-Nivel, X-Quedan, X-Quedan-Tareas' } }));
  await page.evaluate(() => generarAnalisisIA('la pides tú'));
  await expect.poll(() => page.evaluate(() => !!(S.iaPropio && S.iaPropio.json)), { timeout: 20_000 }).toBe(true);
  expect(w.peticiones[0].cuerpo.tarea).toBe('revision');
  expect(await page.evaluate(() => [nivelClaudeApp(), quedanTareasClaude(), quedanClaude()])).toEqual(['reducido', 9, 5]);
  // hecha hace 4 horas y con una señal cambiada: en el reducido, no se rehace (una vez al día como mucho)
  const vieja = () => page.evaluate(() => { S.iaPropio.fecha = new Date(Date.now() - 4 * 36e5).toISOString(); S.iaPropio.firma = 'otra'; IA.ultimoIntento = 0; guardarCfgAsesor({ auto: 'diario' }); return revisarAnalisisIA(); });
  await vieja();
  await page.waitForTimeout(800);
  expect(w.peticiones.length).toBe(1);
  // en el nivel alto, sí
  await page.evaluate(() => { const q = LS.get('inv-claude-quedan'); LS.set('inv-claude-quedan', { ...q, nivel: 'alto' }); });
  await vieja();
  await expect.poll(() => w.peticiones.length, { timeout: 15_000 }).toBe(2);
  await expect.poll(() => page.evaluate(() => IA.generando), { timeout: 15_000 }).toBe(false);
  // sin tareas hoy: lo dice y no se reintenta sola
  tope = true;
  await page.evaluate(() => generarAnalisisIA('la pides tú'));
  expect(await page.evaluate(() => [IA.error, IA.reintento, quedanTareasClaude(), claudePausado()])).toEqual([expect.stringContaining('Hoy ya no quedan revisiones'), 0, 0, null]);
  // y la automática ya ni lo intenta
  const n = w.peticiones.length;
  await page.evaluate(() => { IA.ultimoIntento = 0; S.iaPropio.fecha = new Date(Date.now() - 30 * 36e5).toISOString(); return revisarAnalisisIA(); });
  await page.waitForTimeout(500);
  expect(w.peticiones.length).toBe(n);
});

test('importar varias capturas es una sola tarea (el mismo id); sin «A fondo» hoy lee Haiku', async ({ page, context }) => {
  await preparada(page);
  const w = await worker(context, (c) => (c.model === 'claude-sonnet-5-5' && c.pregunta && w.peticiones.length > 1 ? { json: { error: 'tope-fondo' }, estado: 429 } : { sse: stream([{ tipo: 'texto', texto: '{"plataforma":"MyInvestor","posiciones":[{"nombre":"Fondo X","cantidad":3}],"operaciones":[]}' }]) }));
  await page.evaluate(() => sondearClaude());
  const o = await page.evaluate(async () => {
    await cargarTrozo('importar'); LS.set(LS_CLAUDE_IMP, FB.user.uid);
    const a = { mime: 'image/jpeg', data: 'AAAA', nombre: 'a.jpg' };
    return leerCapturas([a, { ...a, nombre: 'b.jpg' }], () => {});
  });
  expect(o.posiciones[0].nombre).toBe('Fondo X');
  const p = w.peticiones.map((x) => x.cuerpo);
  // la primera con Sonnet; la segunda, Sonnet sin «A fondo» y luego Haiku; todas con el mismo id y como tarea «importar»
  expect(p.map((c) => c.model)).toEqual(['claude-sonnet-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
  expect(new Set(p.map((c) => c.pregunta)).size).toBe(1);
  expect(p.every((c) => c.tarea === 'importar')).toBe(true);
});

test('en la cartera de prueba contesta Claude con tu cuenta y sobre la cartera inventada', async ({ page, context }) => {
  await preparada(page);
  await page.evaluate(() => LS.set('inv-claude-ok', FB.user.uid));
  const w = await worker(context, () => ({ sse: stream([{ tipo: 'texto', texto: 'Tu cartera de prueba va bien.' }]) }));
  await page.evaluate(() => sondearClaude());
  await page.evaluate(() => { entrarDemo(); });
  await expect(page.locator('#pAct')).toBeVisible({ timeout: 10_000 });
  await page.fill('#pAct', 'cartera-123');
  await page.locator('#fPAct button[type=submit]').click();
  await expect(page.locator('#demoBanda')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => !!FB.user && iaLista()), { timeout: 15_000 }).toBe(true);
  await page.evaluate(() => abrirAsesor('¿Cómo va?', true));
  await expect(page.locator('#asCuerpo')).toContainText('Tu cartera de prueba va bien', { timeout: 20_000 });
  const c = w.peticiones.at(-1);
  expect(c.auth).toMatch(/^Bearer /);
  const datos = c.cuerpo.system.map((b) => b.text).join('\n');
  // la inventada (Inditex, ASML…), no la tuya (Repsol, IAG) ni tu nombre
  expect(datos).toContain('(id "demo1")');
  expect(datos).toContain('ASML');
  expect(datos).not.toContain('(id "repsol")');
  expect(datos).not.toContain('Lucía');
  // y nada se guarda: ni la conversación ni lo de la IA en el dispositivo
  expect(await page.evaluate(() => localStorage.getItem('inv-asesor-conv'))).toBeNull();
});
