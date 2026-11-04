// 0.7s: la ruta /claude del Worker. Sin navegador: el Worker de verdad, con fetch de imitación (ni Firebase ni Anthropic reales).
// Comprueba quién puede preguntar, qué se reenvía a Claude (modelo, salida, búsquedas, campos) y cómo se devuelven los fallos.
import { test, expect } from '@playwright/test';
import { generateKeyPairSync, createSign } from 'node:crypto';
import worker, { Cuotas } from '../worker/src/index.js';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

const b64u = (b) => Buffer.from(b).toString('base64url');
const PROYECTO = 'growfolio-a79a9';
const fb = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...fb.publicKey.export({ format: 'jwk' }), kid: 'k-claude', alg: 'RS256', use: 'sig' };

// el token de Firebase de alguien (cada prueba usa un uid distinto: el aviso de ráfagas se cuenta por persona)
function token(uid, email = 'amigo@prueba.com', verificado = true) {
  const ahora = Math.floor(Date.now() / 1000);
  const cab = b64u(JSON.stringify({ alg: 'RS256', kid: 'k-claude', typ: 'JWT' }));
  const cue = b64u(JSON.stringify({ aud: PROYECTO, iss: `https://securetoken.google.com/${PROYECTO}`, sub: uid, iat: ahora - 10, exp: ahora + 3600, email, email_verified: verificado }));
  return `${cab}.${cue}.${b64u(createSign('RSA-SHA256').update(`${cab}.${cue}`).sign(fb.privateKey))}`;
}
// el aviso por minuto se sube aquí para que las pruebas no se estorben entre sí (la de ráfagas lo baja)
const ENV = { ANTHROPIC_API_KEY: 'sk-ant-de-prueba', CLAUDE_EMAILS: 'amigo@prueba.com, otra@prueba.com', CLAUDE_POR_MINUTO: '1000', CLAUDE_POR_DIA: '100000', CLAUDE_RONDAS_POR_DIA: '100000', CUOTAS: cuotasDeMentira(), FB_JWKS: 'https://jwks.prueba', CLAUDE_API: 'https://claude.prueba/v1/messages' };
const PEDIDO = { model: 'claude-sonnet-5-5', max_tokens: 4096, messages: [{ role: 'user', content: 'hola' }] };

// pone un fetch de imitación; `claude` decide qué contesta Claude y devuelve lo que le llegó en `vistas`
async function con(claude, prueba) {
  const vistas = [], antes = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    url = String(url);
    if (url === ENV.FB_JWKS) return new Response(JSON.stringify({ keys: [jwk] }));
    if (url === ENV.CLAUDE_API) {
      const h = Object.fromEntries(Object.entries(op.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
      vistas.push({ h, cuerpo: JSON.parse(op.body) });
      return claude(vistas[vistas.length - 1]);
    }
    throw new Error('fuera de la prueba: ' + url);
  };
  try { await prueba(vistas); } finally { globalThis.fetch = antes; }
}
const pedir = (uid, cuerpo, env = ENV, extra = {}) => worker.fetch(new Request('https://w.prueba/claude', {
  method: 'POST', body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  headers: { Authorization: `Bearer ${token(uid, extra.email, extra.verificado)}`, 'Content-Type': 'application/json', Origin: 'https://charly10sf.github.io' },
}), env, { waitUntil() {} });
const ok = () => new Response(JSON.stringify({ id: 'msg_1', content: [{ type: 'text', text: 'hola' }], usage: { input_tokens: 10, output_tokens: 2 } }), { headers: { 'content-type': 'application/json' } });

test('solo pregunta quien tiene sesión, correo verificado y está en la lista', async () => {
  await con(ok, async (vistas) => {
    // sin sesión
    let r = await worker.fetch(new Request('https://w.prueba/claude', { method: 'POST', body: JSON.stringify(PEDIDO) }), ENV, { waitUntil() {} });
    expect(r.status).toBe(401);
    // con sesión pero fuera de la lista, o con el correo sin verificar
    r = await pedir('uid-a', PEDIDO, ENV, { email: 'otro@prueba.com' });
    expect(r.status).toBe(403);
    r = await pedir('uid-b', PEDIDO, ENV, { verificado: false });
    expect(r.status).toBe(403);
    // sin la clave de Claude puesta en el Worker
    r = await pedir('uid-c', PEDIDO, { ...ENV, ANTHROPIC_API_KEY: '' });
    expect(r.status).toBe(503);
    // nada de eso llegó a Claude
    expect(vistas.length).toBe(0);
    // la lista vale en mayúsculas y con varios correos
    r = await pedir('uid-d', PEDIDO, { ...ENV, CLAUDE_EMAILS: 'x@y.com, Amigo@Prueba.com' });
    expect(r.status).toBe(200);
    expect(vistas.length).toBe(1);
  });
});

test('reenvía a Claude con la clave y limpia la petición', async () => {
  await con(ok, async (vistas) => {
    const r = await pedir('uid-e', {
      ...PEDIDO, stream: false, metadata: { user_id: 'x' }, mcp_servers: [{ url: 'https://malo.prueba' }], container: 'c1',
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 50 }, { name: 'cartera', description: 'd', input_schema: { type: 'object' } }],
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: 'msg_1', usage: { input_tokens: 10 } });
    const v = vistas[0];
    expect(v.h['x-api-key']).toBe('sk-ant-de-prueba');
    expect(v.h['anthropic-version']).toBe('2023-06-01');
    // solo los campos de la lista; las búsquedas se bajan al máximo del Worker; las herramientas de la app, intactas
    expect(Object.keys(v.cuerpo).sort()).toEqual(['max_tokens', 'messages', 'model', 'stream', 'system', 'tools']);
    expect(v.cuerpo.tools[0].max_uses).toBe(5);
    expect(v.cuerpo.tools[1]).toEqual({ name: 'cartera', description: 'd', input_schema: { type: 'object' } });
    // una búsqueda sin tope pedido sale con el del Worker
    await pedir('uid-e', { ...PEDIDO, tools: [{ type: 'web_search_20260209', name: 'web_search' }] });
    expect(vistas[1].cuerpo.tools[0].max_uses).toBe(5);
    // y el tope se puede cambiar sin tocar el código
    await pedir('uid-e', { ...PEDIDO, tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }] }, { ...ENV, CLAUDE_MAX_BUSQUEDAS: '2' });
    expect(vistas[2].cuerpo.tools[0].max_uses).toBe(2);
  });
});

test('rechaza lo que gastaría de más o no es una pregunta', async () => {
  await con(ok, async (vistas) => {
    const casos = [
      [{ ...PEDIDO, model: 'claude-fable-5-1' }, 'modelo'],
      [{ ...PEDIDO, model: undefined }, 'modelo'],
      [{ ...PEDIDO, max_tokens: 32001 }, 'max_tokens'],
      [{ ...PEDIDO, max_tokens: 0 }, 'max_tokens'],
      [{ ...PEDIDO, max_tokens: 'mucho' }, 'max_tokens'],
      [{ ...PEDIDO, messages: [] }, 'messages'],
    ];
    for (const [cuerpo, motivo] of casos) {
      const r = await pedir('uid-f', cuerpo);
      expect(r.status).toBe(400);
      expect(await r.json()).toMatchObject({ error: 'peticion', motivo });
    }
    expect((await pedir('uid-f', '{no es json')).status).toBe(400);
    expect((await pedir('uid-f', '[1,2]')).status).toBe(400);
    expect((await pedir('uid-f', { ...PEDIDO, messages: [{ role: 'user', content: 'x'.repeat(600e3) }] })).status).toBe(413);
    expect((await worker.fetch(new Request('https://w.prueba/claude'), ENV, { waitUntil() {} })).status).toBe(405);
    expect(vistas.length).toBe(0);
    // el Haiku vale, y la lista de modelos se puede cambiar
    expect((await pedir('uid-f', { ...PEDIDO, model: 'claude-haiku-5-5' })).status).toBe(200);
    expect((await pedir('uid-f', { ...PEDIDO, model: 'claude-haiku-5-5' }, { ...ENV, CLAUDE_MODELOS: 'claude-sonnet-5-5' })).status).toBe(400);
  });
});

test('la respuesta en directo pasa tal cual', async () => {
  const sse = 'event: message_start\ndata: {"type":"message_start"}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n';
  await con(() => new Response(sse, { headers: { 'content-type': 'text/event-stream' } }), async () => {
    const r = await pedir('uid-g', { ...PEDIDO, stream: true });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/event-stream');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('access-control-allow-origin')).toBe('https://charly10sf.github.io');
    expect(await r.text()).toBe(sse);
  });
});

test('los fallos de Claude llegan a la app claros', async () => {
  const falla = (estado, tipo, message) => () => new Response(JSON.stringify({ type: 'error', error: { type: tipo, message } }), { status: estado, headers: { 'content-type': 'application/json' } });
  const probar = async (estado, tipo, message, uid) => {
    let r;
    await con(falla(estado, tipo, message), async () => { r = await pedir(uid, PEDIDO); });
    return [r.status, await r.json()];
  };
  // sin crédito: la app pasa a Gemini sin esperar
  expect(await probar(400, 'invalid_request_error', 'Your credit balance is too low to access the Anthropic API.', 'uid-h1')).toEqual([402, { error: 'sin-creditos' }]);
  // el tope de gasto del workspace llega como 400 o como 429, según el caso: las dos son «sin créditos»
  expect(await probar(429, 'rate_limit_error', 'You have reached your specified API usage limits. You will regain access on 2026-12-01 at 00:00 UTC.', 'uid-h0')).toEqual([402, { error: 'sin-creditos' }]);
  expect(await probar(400, 'invalid_request_error', 'You have reached your specified workspace API usage limit.', 'uid-h0b')).toEqual([402, { error: 'sin-creditos' }]);
  // un límite de ritmo normal no lo es
  expect((await probar(429, 'rate_limit_error', 'This request would exceed your organization rate limit of 50 requests per minute.', 'uid-h0c'))[1].error).toBe('claude');
  // la clave del Worker mal puesta no se confunde con «no tienes sesión» (401)
  expect(await probar(401, 'authentication_error', 'invalid x-api-key', 'uid-h2')).toEqual([502, { error: 'clave', estado: 401 }]);
  // límite de Anthropic y servidor saturado
  expect(await probar(429, 'rate_limit_error', 'Rate limited', 'uid-h3')).toEqual([429, { error: 'claude', estado: 429, tipo: 'rate_limit_error', motivo: 'Rate limited' }]);
  expect(await probar(529, 'overloaded_error', 'Overloaded', 'uid-h4')).toEqual([502, { error: 'claude', estado: 529, tipo: 'overloaded_error', motivo: 'Overloaded' }]);
  // sin red hacia Claude
  let r;
  await con(() => { throw new Error('sin red'); }, async () => { r = await pedir('uid-h5', PEDIDO); });
  expect(r.status).toBe(502);
  expect(await r.json()).toMatchObject({ error: 'sin-conexion' });
});

test('avisa si alguien pregunta demasiado seguido', async () => {
  await con(ok, async (vistas) => {
    // correos que ninguna otra prueba usa: la cuenta de ráfagas se guarda en el Worker entre pruebas
    const a = { email: 'rafaga1@prueba.com' }, b = { email: 'rafaga2@prueba.com' };
    const env = { ...ENV, CLAUDE_EMAILS: 'rafaga1@prueba.com, rafaga2@prueba.com', CLAUDE_POR_MINUTO: '3' };
    for (let i = 0; i < 3; i++) expect((await pedir('uid-i', PEDIDO, env, a)).status).toBe(200);
    const r = await pedir('uid-i', PEDIDO, env, a);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'demasiadas' });
    // el mismo correo con otra cuenta (otro uid) cuenta igual; otra persona no se ve afectada
    expect((await pedir('uid-i2', PEDIDO, env, a)).status).toBe(429);
    expect((await pedir('uid-j', PEDIDO, env, b)).status).toBe(200);
    expect(vistas.length).toBe(4);
  });
});

test('solo pasan las herramientas de la app y la búsqueda; los adjuntos, dentro de la petición', async () => {
  await con(ok, async (vistas) => {
    const propia = { name: 'cartera', description: 'd', input_schema: { type: 'object' } };
    const malas = [
      [{ type: 'web_fetch_20260209', name: 'web_fetch', max_content_tokens: 100000 }, 'tools'],
      [{ type: 'code_execution_20260120', name: 'code_execution' }, 'tools'],
      [{ type: 'mcp_toolset', mcp_server_name: 'x' }, 'tools'],
    ];
    for (const [h, motivo] of malas) {
      const r = await pedir('uid-k', { ...PEDIDO, tools: [propia, h] });
      expect(r.status).toBe(400);
      expect(await r.json()).toMatchObject({ error: 'peticion', motivo });
    }
    expect((await pedir('uid-k', { ...PEDIDO, tools: 'web' })).status).toBe(400);
    expect((await pedir('uid-k', { ...PEDIDO, tools: [null] })).status).toBe(400);
    // adjuntos que baja Anthropic: por URL, por archivo ya subido, y también dentro del resultado de una herramienta
    const url = { type: 'document', source: { type: 'url', url: 'https://x.prueba/100-paginas.pdf' } };
    const archivo = { type: 'image', source: { type: 'file', file_id: 'file_1' } };
    for (const bloque of [url, archivo]) {
      for (const contenido of [[bloque], [{ type: 'tool_result', tool_use_id: 't1', content: [bloque] }]]) {
        const r = await pedir('uid-k', { ...PEDIDO, messages: [{ role: 'user', content: contenido }] });
        expect(r.status).toBe(400);
        expect(await r.json()).toMatchObject({ error: 'peticion', motivo: 'adjunto' });
      }
    }
    expect(vistas.length).toBe(0);
    // lo que sí vale: tu herramienta, la búsqueda, texto, una imagen en base64 y un resultado con texto
    const bueno = { ...PEDIDO, tools: [propia, { type: 'custom', name: 'otra', input_schema: { type: 'object' } }, { type: 'web_search_20260209', name: 'web_search' }], messages: [
      { role: 'user', content: [{ type: 'text', text: 'mira' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }] },
      { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'cartera', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: '{}' }] }] }] };
    expect((await pedir('uid-k', bueno)).status).toBe(200);
    expect(vistas.length).toBe(1);
  });
});

// el contador de cada correo, como lo hace Cloudflare: un objeto por nombre, con su almacén (aquí, en memoria)
function cuotasDeMentira() {
  const objetos = new Map();
  return {
    idFromName: (nombre) => nombre,
    get: (id) => ({
      fetch: (url, op) => {
        if (!objetos.has(id)) { const m = new Map(); objetos.set(id, new Cuotas({ storage: { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); } } })); }
        return objetos.get(id).fetch(new Request(url, op));
      },
    }),
  };
}

test('tope de preguntas al día por correo, y si el contador falla no se pregunta', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: '3' };
    for (let i = 0; i < 3; i++) expect((await pedir('uid-l', PEDIDO, env)).status).toBe(200);
    let r = await pedir('uid-l', PEDIDO, env);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'tope-diario' });
    // con otra cuenta (otro uid) del mismo correo sigue sin dejar: se cuenta por correo
    expect((await pedir('uid-l2', PEDIDO, env)).status).toBe(429);
    // otra persona tiene su propio tope
    expect((await pedir('uid-m', PEDIDO, env, { email: 'otra@prueba.com' })).status).toBe(200);
    // una petición mala no gasta pregunta del día
    for (let i = 0; i < 5; i++) await pedir('uid-m', { ...PEDIDO, model: 'otro' }, env, { email: 'otra@prueba.com' });
    expect((await pedir('uid-m', PEDIDO, env, { email: 'otra@prueba.com' })).status).toBe(200);
    expect(vistas.length).toBe(5);
    // mañana, de nuevo
    const real = Date.now;
    Date.now = () => real() + 24 * 3600e3;
    try { expect((await pedir('uid-l', PEDIDO, env)).status).toBe(200); } finally { Date.now = real; }
    // el contador roto: no se pregunta (la app pasa a Gemini)
    const roto = { idFromName: (n) => n, get: () => ({ fetch: async () => { throw new Error('caído'); } }) };
    r = await pedir('uid-n', PEDIDO, { ...ENV, CUOTAS: roto }, { email: 'otra@prueba.com' });
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'cuotas' });
    expect(vistas.length).toBe(6);
  });
});

// 0.8: una pregunta de GrowIA son varias peticiones (una por ronda de herramientas); la app dice en «ronda» cuál es
test('las rondas de herramientas de una misma pregunta no gastan preguntas, pero tienen su propio tope', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: '2', CLAUDE_RONDAS_POR_DIA: '7' };
    // dos preguntas de tres rondas: 2 preguntas y 6 peticiones
    for (let q = 0; q < 2; q++) for (let ronda = 1; ronda <= 3; ronda++) expect((await pedir('uid-r', { ...PEDIDO, ronda }, env)).status).toBe(200);
    // una tercera pregunta no entra
    let r = await pedir('uid-r', { ...PEDIDO, ronda: 1 }, env);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'tope-diario' });
    // sin «ronda» cuenta como pregunta nueva
    expect((await pedir('uid-r', PEDIDO, env)).status).toBe(429);
    // otra ronda de la última sí entra (7.ª petición)...
    expect((await pedir('uid-r', { ...PEDIDO, ronda: 2 }, env)).status).toBe(200);
    // ...y la 8.ª no: el tope de peticiones impide saltarse el de preguntas diciendo siempre «ronda 2»
    r = await pedir('uid-r', { ...PEDIDO, ronda: 2 }, env);
    expect(r.status).toBe(429);
    // «ronda» es de la app y del Worker: no llega a Claude
    expect(vistas.length).toBe(7);
    for (const v of vistas) expect(v.cuerpo).not.toHaveProperty('ronda');
  });
});

test('0.9: con id de pregunta, una pregunta por id (rondas y reintentos no gastan más) y tope de peticiones por id', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: '2', CLAUDE_RONDAS_POR_DIA: '100', CLAUDE_RONDAS_POR_PREGUNTA: '4' };
    const P = (pregunta, ronda = 1) => ({ ...PEDIDO, ronda, pregunta });
    // la primera pregunta: su ronda 1, un reintento de la ronda 1 (la app manda ronda 2) y dos rondas más: una sola pregunta
    for (const ronda of [1, 2, 2, 3]) expect((await pedir('uid-id', P('aaaaaaaaaaaa', ronda), env)).status).toBe(200);
    // la quinta petición de ese id pasa de su tope
    expect((await pedir('uid-id', P('aaaaaaaaaaaa', 4), env)).status).toBe(429);
    // un id nuevo es otra pregunta aunque diga «ronda 2» (no se puede falsear)
    expect((await pedir('uid-id', P('bbbbbbbbbbbb', 2), env)).status).toBe(200);
    // y la tercera pregunta del día ya no entra
    expect((await pedir('uid-id', P('cccccccccccc', 1), env)).status).toBe(429);
    // un id con caracteres raros no vale como id: se trata como una app de antes
    expect((await pedir('uid-id', { ...PEDIDO, ronda: 1, pregunta: '../x' }, env)).status).toBe(429);
    expect(vistas.length).toBe(5);
    for (const v of vistas) expect(v.cuerpo).not.toHaveProperty('pregunta');
  });
});

test('0.9: tope de adjuntos y de tokens de entrada, contados antes de gastar pregunta', async () => {
  const antes = globalThis.fetch, cuentas = [], vistas = [];
  let tokens = 1000;
  globalThis.fetch = async (url, op = {}) => {
    url = String(url);
    if (url === ENV.FB_JWKS) return new Response(JSON.stringify({ keys: [jwk] }));
    if (url === ENV.CLAUDE_API + '/count_tokens') { cuentas.push(JSON.parse(op.body)); return new Response(JSON.stringify({ input_tokens: tokens })); }
    if (url === ENV.CLAUDE_API) { vistas.push(JSON.parse(op.body)); return ok(); }
    throw new Error('fuera de la prueba: ' + url);
  };
  try {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: '3' };
    const pdf = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' } };
    // tres PDF en una petición: no
    let r = await pedir('uid-t', { ...PEDIDO, messages: [{ role: 'user', content: [pdf, pdf, pdf, { type: 'text', text: 'lee' }] }] }, env);
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ motivo: 'adjuntos' });
    // un PDF con muchos tokens: se cuenta y se rechaza sin llegar a Claude ni gastar pregunta
    tokens = 500000;
    r = await pedir('uid-t', { ...PEDIDO, messages: [{ role: 'user', content: [pdf, { type: 'text', text: 'lee' }] }] }, env);
    expect(r.status).toBe(413);
    expect(cuentas.length).toBe(1);
    expect(cuentas[0].model).toBe(PEDIDO.model);
    // uno normal: se cuenta y pasa
    tokens = 3000;
    r = await pedir('uid-t', { ...PEDIDO, messages: [{ role: 'user', content: [pdf, { type: 'text', text: 'lee' }] }] }, env);
    expect(r.status).toBe(200);
    // si el conteo no contesta y hay un PDF, no se pasa (y no gasta pregunta)
    tokens = null;
    r = await pedir('uid-t', { ...PEDIDO, messages: [{ role: 'user', content: [pdf, { type: 'text', text: 'lee' }] }] }, env);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'cuenta' });
    // una pregunta de texto corta no se cuenta (no hace falta la vuelta de más)
    expect((await pedir('uid-t', PEDIDO, env)).status).toBe(200);
    expect(cuentas.length).toBe(3);
    expect(vistas.length).toBe(2);
    for (const k of Object.keys(cuentas[0])) expect(['model', 'system', 'messages', 'tools', 'tool_choice', 'thinking']).toContain(k);
    // las dos que se rechazaron no gastaron pregunta: queda una de tres
    expect((await pedir('uid-t', PEDIDO, env)).status).toBe(200);
    expect((await pedir('uid-t', PEDIDO, env)).status).toBe(429);
  } finally { globalThis.fetch = antes; }
});

// 0.8: la app pregunta «¿puedo?» con una petición vacía antes de mandar nada de la cartera
test('una petición vacía dice si el correo puede usar Claude sin gastar nada ni leer cartera', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: '1' };
    let r = await pedir('uid-s', '{}', env);
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ error: 'peticion' });
    // quien no está en la lista recibe un 403 antes de leer el cuerpo
    r = await pedir('uid-s2', '{}', env, { email: 'otro@prueba.com' });
    expect(r.status).toBe(403);
    // ni lo uno ni lo otro ha gastado la pregunta del día ni ha llegado a Claude
    expect((await pedir('uid-s', PEDIDO, env)).status).toBe(200);
    expect(vistas.length).toBe(1);
  });
});

// 0.8: las reglas de uso las pone el Worker (no la app) y sin contador no se pregunta
test('el Worker pone delante la nota de que la IA de Toisón es una IA y no da consejos personalizados, y sin contador no pregunta', async () => {
  await con(ok, async (vistas) => {
    // con un «system» de la app, o con texto suelto, o sin nada: la nota va siempre la primera y lo demás se conserva
    await pedir('uid-y1', { ...PEDIDO, system: [{ type: 'text', text: 'de la app', cache_control: { type: 'ephemeral' } }] });
    await pedir('uid-y2', { ...PEDIDO, system: 'suelto' });
    await pedir('uid-y3', PEDIDO);
    const [a, b, c] = vistas.map((v) => v.cuerpo.system);
    for (const x of [a, b, c]) { expect(x[0].text).toMatch(/^La IA de Toisón es una IA/); expect(x[0].text).not.toContain('GrowIA'); expect(x[0].text).toContain('No da asesoramiento personalizado'); }
    expect(a[1]).toEqual({ type: 'text', text: 'de la app', cache_control: { type: 'ephemeral' } });
    expect(b[1].text).toBe('suelto');
    expect(c.length).toBe(1);
    expect((await pedir('uid-y4', { ...PEDIDO, system: 5 })).status).toBe(400);
    // sin el contador de preguntas (Durable Object) no hay tope diario: no se pregunta
    const r = await pedir('uid-y5', PEDIDO, { ...ENV, CUOTAS: undefined });
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'cuotas' });
    expect(vistas.length).toBe(3);
  });
});

test('/salud dice si Claude está listo, sin enseñar la clave', async () => {
  const salud = async (env) => worker.fetch(new Request('https://w.prueba/salud'), env, { waitUntil() {} }).then((r) => r.text());
  expect(JSON.parse(await salud({ ...ENV, CUOTAS: undefined }))).toMatchObject({ claude: true, cuotas: false });
  expect(JSON.parse(await salud({ ...ENV, CUOTAS: cuotasDeMentira() }))).toMatchObject({ claude: true, cuotas: true });
  expect(JSON.parse(await salud({})).claude).toBe(false);
  expect(await salud(ENV)).not.toContain('sk-ant');
});
