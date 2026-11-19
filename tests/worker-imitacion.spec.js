// Mejorar la IA, parte 2 (19 nov 2026): la imitación del Worker de los bancos de la IA (tests/banco/worker-imitacion.js)
// usa el código del Worker y aplica lo mismo que él: tope del cuerpo (2,5 MB), de salida, de búsquedas, de tokens de
// entrada (el doble en las rondas siguientes) y de peticiones por pregunta; y el coste con costeUso, con Haiku más caro
// por encima de 100.000 tokens. Sin red: el count_tokens y la API, de imitación.
import { test, expect } from '@playwright/test';
import { delWorker, prepararComoWorker, imitarWorker, FUENTE_WORKER } from './banco/worker-imitacion.js';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez, en el móvil'));

const pide = (x) => JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 1000, messages: [{ role: 'user', content: 'hola' }], ...x });

test('lee del Worker sus topes y su precio, y cuenta Haiku por encima de 100.000 tokens como él', () => {
  const W = delWorker();
  expect(W.CLAUDE_MAX_CUERPO).toBe(2.5e6);
  expect(W.CLAUDE_MAX_SALIDA).toBeGreaterThan(1000);
  expect(W.CLAUDE_NOTA_FUNDADOR.endsWith('.')).toBe(true);
  // 150.000 tokens de entrada con Haiku: al precio grande (0,5 $ el millón), no al normal (0,1)
  expect(W.costeUso('claude-haiku-5-5', { input_tokens: 150000 })).toBeCloseTo(150000 * W.PRECIO_HAIKU_GRANDE[0] / 1e6, 6);
  expect(W.costeUso('claude-haiku-5-5', { input_tokens: 90000 })).toBeCloseTo(90000 * W.PRECIOS_CLAUDE['claude-haiku-5-5'][0] / 1e6, 6);
  // la caché cuenta para el umbral
  expect(W.costeUso('claude-haiku-5-5', { input_tokens: 2000, cache_read_input_tokens: 99000 })).toBeCloseTo((2000 * 0.5 + 99000 * 0.05) / 1e6, 6);
  // y el Worker sigue haciendo estas comprobaciones en su manejador (si cambian, hay que revisar la imitación)
  for (const t of ['texto.length > CLAUDE_MAX_CUERPO', 'c.max_tokens > maxSalida', 'max_uses: Math.max(1, Math.min(Number(h.max_uses) || maxBusquedas, maxBusquedas))', 'c.ronda > 1 && sigue ? 2 : 1', 'costeUso(modelo, uso)', "cuerpo.system = [{ type: 'text', text: conFundador ? CLAUDE_NOTA_FUNDADOR : CLAUDE_NOTA }"]) expect(FUENTE_WORKER, t).toContain(t);
});

test('rechaza y recorta lo mismo que el Worker', async () => {
  const W = delWorker();
  expect((await prepararComoWorker('x'.repeat(2.5e6 + 1), { W })).estado).toBe(413);
  expect(await prepararComoWorker(pide({ max_tokens: W.CLAUDE_MAX_SALIDA + 1 }), { W })).toMatchObject({ estado: 400, motivo: 'max_tokens' });
  expect(await prepararComoWorker(pide({ model: 'claude-opus-5-5' }), { W })).toMatchObject({ estado: 400, motivo: 'modelo' });
  expect(await prepararComoWorker(pide({ reglas: 'otra' }), { W })).toMatchObject({ estado: 400, motivo: 'reglas' });
  expect(await prepararComoWorker('{}', { W })).toMatchObject({ estado: 400, motivo: 'modelo' });
  const ok = await prepararComoWorker(pide({ reglas: 'fundador', loquesea: 1, system: [{ type: 'text', text: 'foto', cache_control: { type: 'ephemeral', ttl: '1h' } }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 9 }] }), { W });
  expect(Object.keys(ok.cuerpo).sort()).toEqual(['max_tokens', 'messages', 'model', 'system', 'tools']);
  expect(ok.cuerpo.tools[0].max_uses).toBe(W.CLAUDE_MAX_BUSQUEDAS);
  expect(ok.cuerpo.system[0].text).toBe(W.CLAUDE_NOTA_FUNDADOR);
  expect(ok.cuerpo.system[1].cache_control).toEqual({ type: 'ephemeral' });
  // tokens de entrada: por encima del tope, fuera; en una ronda siguiente de herramientas, el doble
  const grande = 'a'.repeat(W.CLAUDE_CONTAR_DESDE + 10), contar = async () => W.CLAUDE_MAX_ENTRADA + 5000;
  expect((await prepararComoWorker(pide({ messages: [{ role: 'user', content: grande }] }), { W, contar })).estado).toBe(413);
  const sigue = [{ role: 'user', content: grande }, { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'radar', input: {} }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'x' }] }];
  const r2 = await prepararComoWorker(pide({ ronda: 2, messages: sigue }), { W, contar });
  expect(r2.estado).toBeUndefined();
  expect(r2.entrada).toBe(W.CLAUDE_MAX_ENTRADA + 5000);
  // 16 peticiones por pregunta como mucho
  const rondasDe = new Map();
  for (let i = 0; i < W.CLAUDE_RONDAS_POR_PREGUNTA; i++) expect((await prepararComoWorker(pide({ pregunta: 'abcd1234' }), { W, rondasDe })).estado).toBeUndefined();
  expect(await prepararComoWorker(pide({ pregunta: 'abcd1234' }), { W, rondasDe })).toMatchObject({ estado: 429, error: 'tope-pregunta' });
});

test('el manejador suma lo que cuesta cada respuesta con costeUso del Worker', async () => {
  const W = delWorker(), gasto = {}, fetch0 = globalThis.fetch;
  const sse = 'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":3000,"cache_read_input_tokens":110000,"cache_creation_input_tokens":0,"output_tokens":1}}}\n\nevent: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":800}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n';
  let mandado = null;
  globalThis.fetch = async (url, o) => { mandado = JSON.parse(o.body); return new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } }); };
  try {
    const h = imitarWorker({ clave: 'x', gasto, cors: {}, W });
    let respuesta = null;
    await h({ request: () => ({ method: () => 'POST', postData: () => pide({ reglas: 'fundador' }) }), fulfill: (x) => { respuesta = x; } });
    expect(mandado.system[0].text).toBe(W.CLAUDE_NOTA_FUNDADOR);
    expect(respuesta.headers['X-Reglas']).toBe('fundador');
    // 113.000 de entrada: Haiku al precio grande
    const g = W.PRECIO_HAIKU_GRANDE;
    expect(gasto.dolares).toBeCloseTo((3000 * g[0] + 800 * g[1] + 110000 * g[2]) / 1e6, 8);
    expect(gasto.cache_lee).toBe(110000);
    expect(gasto.salida).toBe(800);
    // lo que el Worker rechaza no llega a Anthropic ni cuesta
    mandado = null;
    await h({ request: () => ({ method: () => 'POST', postData: () => pide({ max_tokens: 99999 }) }), fulfill: (x) => { respuesta = x; } });
    expect(mandado).toBeNull();
    expect(respuesta.status).toBe(400);
    expect(gasto.rechazadas).toBe(1);
  } finally { globalThis.fetch = fetch0; }
});
