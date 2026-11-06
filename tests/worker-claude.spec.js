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

// 0.8.2b: cualquiera con el correo verificado; la lista (CLAUDE_EMAILS) es la del tope alto
test('pregunta quien tiene sesión y el correo verificado; la lista decide el nivel', async () => {
  await con(ok, async (vistas) => {
    // sin sesión
    let r = await worker.fetch(new Request('https://w.prueba/claude', { method: 'POST', body: JSON.stringify(PEDIDO) }), ENV, { waitUntil() {} });
    expect(r.status).toBe(401);
    // con el correo sin verificar, no
    r = await pedir('uid-b', PEDIDO, ENV, { verificado: false });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: 'no-permitido', motivo: 'verificar' });
    // sin la clave de Claude puesta en el Worker
    r = await pedir('uid-c', PEDIDO, { ...ENV, ANTHROPIC_API_KEY: '' });
    expect(r.status).toBe(503);
    // nada de eso llegó a Claude
    expect(vistas.length).toBe(0);
    // la lista vale en mayúsculas y con varios correos: tope alto
    r = await pedir('uid-d', PEDIDO, { ...ENV, CLAUDE_EMAILS: 'x@y.com, Amigo@Prueba.com' });
    expect(r.status).toBe(200);
    expect(r.headers.get('x-nivel')).toBe('alto');
    expect(r.headers.get('x-quedan-fondo')).toBeNull();
    // fuera de la lista también pregunta, con el tope reducido
    r = await pedir('uid-a', PEDIDO, ENV, { email: 'otro@prueba.com' });
    expect(r.status).toBe(200);
    expect(r.headers.get('x-nivel')).toBe('reducido');
    expect(r.headers.get('access-control-expose-headers')).toContain('X-Nivel');
    expect(vistas.length).toBe(2);
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
        if (!objetos.has(id)) { const m = new Map(); objetos.set(id, { o: new Cuotas({ storage: { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); } } }), cola: Promise.resolve() }); }
        // de una en una, como Cloudflare (sus «input gates» no dejan entrar otra petición mientras una lee o escribe)
        const x = objetos.get(id), r = x.cola.then(() => x.o.fetch(new Request(url, op)));
        x.cola = r.catch(() => {});
        return r;
      },
    }),
  };
}

test('tope de preguntas al día por correo, y si el contador falla no se pregunta', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: '3' };
    // 0.8.2: cada respuesta dice cuántas preguntas le quedan hoy, y la app puede leerlo (CORS)
    for (let i = 0; i < 3; i++) { const x = await pedir('uid-l', PEDIDO, env); expect(x.status).toBe(200); expect(x.headers.get('x-quedan')).toBe(String(2 - i)); expect(x.headers.get('access-control-expose-headers')).toContain('X-Quedan'); }
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

// 0.8.2: las preguntas que quedan no pasan de las peticiones que quedan (cada pregunta gasta al menos una)
test('X-Quedan cuenta también el tope de peticiones del día', async () => {
  await con(ok, async () => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: '10', CLAUDE_RONDAS_POR_DIA: '3' };
    const r = await pedir('uid-q', { ...PEDIDO, ronda: 1 }, env);
    expect(r.status).toBe(200);
    expect(r.headers.get('x-quedan')).toBe('2');
  });
});

test('0.9: con id de pregunta, una pregunta por id (rondas y reintentos no gastan más) y tope de peticiones por id', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: '2', CLAUDE_RONDAS_POR_DIA: '100', CLAUDE_RONDAS_POR_PREGUNTA: '4' };
    const P = (pregunta, ronda = 1) => ({ ...PEDIDO, ronda, pregunta });
    // la primera pregunta: su ronda 1, un reintento de la ronda 1 (la app manda ronda 2) y dos rondas más: una sola pregunta
    for (const ronda of [1, 2, 2, 3]) expect((await pedir('uid-id', P('aaaaaaaaaaaa', ronda), env)).status).toBe(200);
    // la quinta petición de ese id pasa de su tope (0.8.2: con su propio motivo, no el del día)
    const tp = await pedir('uid-id', P('aaaaaaaaaaaa', 4), env);
    expect(tp.status).toBe(429);
    expect(await tp.json()).toEqual({ error: 'tope-pregunta' });
    // un id nuevo es otra pregunta aunque diga «ronda 2» (no se puede falsear)
    expect((await pedir('uid-id', P('bbbbbbbbbbbb', 2), env)).status).toBe(200);
    // y la tercera pregunta del día ya no entra
    const td = await pedir('uid-id', P('cccccccccccc', 1), env);
    expect(td.status).toBe(429);
    expect(await td.json()).toEqual({ error: 'tope-diario' });
    // un id que es un nombre de Object («constructor») no se salta su tope (en otro correo, con su día limpio)
    for (let i = 0; i < 4; i++) expect((await pedir('uid-id2', P('constructor', i ? 2 : 1), env, { email: 'otra@prueba.com' })).status).toBe(200);
    expect((await pedir('uid-id2', P('constructor', 2), env, { email: 'otra@prueba.com' })).status).toBe(429);
    // un id con caracteres raros no vale como id: se trata como una app de antes
    expect((await pedir('uid-id', { ...PEDIDO, ronda: 1, pregunta: '../x' }, env)).status).toBe(429);
    expect(vistas.length).toBe(9);
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
    // 0.8.2b: quien no está en la lista también puede (nivel reducido); sin el correo verificado, un 403 antes de leer el cuerpo
    r = await pedir('uid-s2', '{}', env, { email: 'otro@prueba.com' });
    expect(r.status).toBe(400);
    r = await pedir('uid-s3', '{}', env, { email: 'otro@prueba.com', verificado: false });
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

// 0.8.2b: el nivel reducido. Menos preguntas, pocas «A fondo» y un techo de gasto al día para todos juntos
const SONNET = { ...PEDIDO, model: 'claude-sonnet-5-5' }, HAIKU = { ...PEDIDO, model: 'claude-haiku-5-5' };
const RED = { email: 'nuevo@prueba.com' };
// 0.8.2d (sesión 4): una tarea bien hecha de cada tipo, como la manda la app: la noticia con Haiku y la búsqueda; importar,
// con un archivo (aquí, uno pasado a texto, que no hace contar tokens); la revisión, como una pregunta
const ARCHIVO = [{ type: 'text', text: 'Archivo «movimientos.csv»:\nfecha;nombre;importe' }, { type: 'text', text: 'Devuelve solo el JSON.' }];
const BUSCAR = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };
const tareaDe = (id, tipo = 'noticia', m = HAIKU) => ({ ...m, pregunta: id, ronda: 1, tarea: tipo, ...(tipo === 'importar' ? { messages: [{ role: 'user', content: ARCHIVO }] } : tipo === 'noticia' ? { tools: [BUSCAR] } : {}) });
// una respuesta con lo que cobra Anthropic: `uso` en el JSON o, en directo, en message_start y message_delta
const conUso = (uso, enDirecto = false) => () => enDirecto
  ? new Response([
    `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'm', usage: { input_tokens: uso.input_tokens, cache_read_input_tokens: uso.cache_read_input_tokens || 0, output_tokens: 1 } } })}\n\n`,
    `event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: uso.output_tokens, ...(uso.server_tool_use ? { server_tool_use: uso.server_tool_use } : {}) } })}\n\n`,
    'event: message_stop\ndata: {"type":"message_stop"}\n\n'].join(''), { headers: { 'content-type': 'text/event-stream' } })
  : new Response(JSON.stringify({ id: 'm', content: [{ type: 'text', text: 'hola' }], usage: uso }), { headers: { 'content-type': 'application/json' } });
// pide y espera a lo que el Worker deja para después (cerrar el techo con lo gastado)
async function pedirYCerrar(uid, cuerpo, env, extra) {
  const espera = [];
  const r = await worker.fetch(new Request('https://w.prueba/claude', { method: 'POST', body: JSON.stringify(cuerpo), headers: { Authorization: `Bearer ${token(uid, extra.email, extra.verificado)}`, 'Content-Type': 'application/json', Origin: 'https://charly10sf.github.io' } }), env, { waitUntil: (p) => espera.push(p) });
  await r.text();
  await Promise.all(espera);
  return r;
}
const gastado = async (env) => (await env.CUOTAS.get(env.CUOTAS.idFromName(' techo-reducido')).fetch('https://x/', { method: 'POST', body: JSON.stringify({ op: 'ver', dia: new Date().toISOString().slice(0, 10) }) }).then((r) => r.json()));

test('0.8.2b: el nivel reducido tiene 5 preguntas y 3 «A fondo» al día; el alto, 20 y sin tope de «A fondo»', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: undefined, CLAUDE_RONDAS_POR_DIA: undefined };
    const P = (m, id) => ({ ...m, pregunta: id, ronda: 1 });
    // tres «A fondo»: la cuarta no (con su motivo, para que la app conteste con Haiku)
    for (let i = 0; i < 3; i++) { const r = await pedir('uid-f', P(SONNET, `fondo${i}aaaa`), env, RED); expect(r.status).toBe(200); expect(r.headers.get('x-quedan-fondo')).toBe(String(2 - i)); }
    let r = await pedir('uid-f', P(SONNET, 'fondo3aaaa'), env, RED);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'tope-fondo' });
    // la misma pregunta con Haiku sí entra (la rechazada no gastó pregunta)
    r = await pedir('uid-f', P(HAIKU, 'fondo3aaaa'), env, RED);
    expect(r.status).toBe(200);
    expect(r.headers.get('x-quedan')).toBe('1');
    // las rondas de una «A fondo» no gastan más «A fondo», pero empezar con Haiku y seguir con Sonnet sí gasta (y aquí ya no quedan)
    r = await pedir('uid-f', { ...SONNET, pregunta: 'fondo0aaaa', ronda: 2 }, env, RED);
    expect(r.status).toBe(200);
    r = await pedir('uid-f', { ...SONNET, pregunta: 'fondo3aaaa', ronda: 2 }, env, RED);
    expect(await r.json()).toEqual({ error: 'tope-fondo' });
    // sin id, cada petición con Sonnet gasta «A fondo»
    r = await pedir('uid-f', SONNET, env, RED);
    expect(r.status).toBe(429);
    // hasta 5 preguntas en total
    expect((await pedir('uid-f', P(HAIKU, 'haiku5aaaa'), env, RED)).status).toBe(200);
    r = await pedir('uid-f', P(HAIKU, 'haiku99aaaa'), env, RED);
    expect(await r.json()).toEqual({ error: 'tope-diario' });
    // el nivel alto: Sonnet sin tope propio (solo el del día) y sin X-Quedan-Fondo
    for (let i = 0; i < 5; i++) { const x = await pedir('uid-g', P(SONNET, `alto${i}aaaaa`), env); expect(x.status).toBe(200); expect(x.headers.get('x-quedan-fondo')).toBeNull(); expect(x.headers.get('x-quedan')).toBe(String(19 - i)); }
    expect(vistas.length).toBe(3 + 1 + 1 + 1 + 5);
  });
});

test('0.8.2b: el techo de gasto del nivel reducido cuenta lo que cobra Anthropic y para a todos los del nivel', async () => {
  const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_TECHO_REDUCIDO: '0.5', CLAUDE_POR_DIA_REDUCIDO: '1000', CLAUDE_RONDAS_REDUCIDO: '1000' };
  // una pregunta de Sonnet con 20.000 de entrada, 5.000 de caché leída, 4.000 de salida y 2 búsquedas: 0,04 + 0,0005 + 0,04 + 0,02 = 0,1005 $
  const uso = { input_tokens: 20000, cache_read_input_tokens: 5000, output_tokens: 4000, server_tool_use: { web_search_requests: 2 } };
  await con(conUso(uso, true), async (vistas) => {
    const r = await pedirYCerrar('uid-h', { ...SONNET, stream: true, pregunta: 'techo1aaaa' }, env, RED);
    expect(r.status).toBe(200);
    let t = await gastado(env);
    expect(t.g).toBeCloseTo(0.1005, 6);
    expect(t.p).toBe(0);
    // otros cuatro del nivel reducido, cada uno con su correo: el techo es de todos juntos
    for (let i = 0; i < 4; i++) await pedirYCerrar(`uid-h${i}`, { ...HAIKU, stream: true, pregunta: `techo2${i}aaaa` }, env, { email: `n${i}@prueba.com` }).then((x) => expect(x.status).toBe(200));
    t = await gastado(env);
    expect(t.g).toBeGreaterThan(0.1005);
    // Haiku: 20.000 × 0,10 + 5.000 × 0,01 + 4.000 × 0,50 = 0,00405 $ + 0,02 de búsquedas
    expect(t.g).toBeCloseTo(0.1005 + 4 * 0.02405, 6);
  });
  await con(conUso({ input_tokens: 2000000, output_tokens: 1 }), async (vistas) => {
    // una que se pasa (Haiku con más de 100.000 de entrada cobra más: 1 $): la siguiente ya no entra, para nadie del nivel
    expect((await pedirYCerrar('uid-i', { ...HAIKU, pregunta: 'grande1aaaa' }, env, RED)).status).toBe(200);
    const r = await pedir('uid-j', { ...HAIKU, pregunta: 'grande2aaaa' }, env, { email: 'otro2@prueba.com' });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'techo' });
    // los del nivel alto siguen
    expect((await pedir('uid-k', { ...HAIKU, pregunta: 'alto1aaaaa' }, env)).status).toBe(200);
    expect(vistas.length).toBe(2);
  });
});

test('0.8.2b: lo apartado del techo vuelve si la pregunta no llega a Claude o Claude falla', async () => {
  const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_TECHO_REDUCIDO: '0.2', CLAUDE_FONDO_REDUCIDO: '0' };
  await con(() => new Response(JSON.stringify({ error: { type: 'overloaded_error', message: 'Overloaded' } }), { status: 529 }), async () => {
    // Claude falla: no queda nada apartado ni gastado
    expect((await pedirYCerrar('uid-l', { ...HAIKU, pregunta: 'falla1aaaa' }, env, RED)).status).toBe(502);
    // la «A fondo» rechazada por su tope (0 hoy): tampoco
    expect((await pedirYCerrar('uid-l', { ...SONNET, pregunta: 'falla2aaaa' }, env, RED)).status).toBe(429);
    expect(await gastado(env)).toMatchObject({ g: 0, p: 0 });
  });
  // varias a la vez: lo apartado (lo más que puede costar cada una) frena antes de saber lo que cuestan
  // (con esta petición corta, lo más que puede costar una de Sonnet es ~0,041 $: casi todo, los 4.096 de salida)
  const env2 = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_TECHO_REDUCIDO: '0.07' };
  await con(async () => { await new Promise((r) => setTimeout(r, 300)); return ok(); }, async () => {
    const [a, b] = await Promise.all([pedir('uid-m1', { ...SONNET, pregunta: 'junta1aaaa' }, env2, { email: 'j1@prueba.com' }), pedir('uid-m2', { ...SONNET, pregunta: 'junta2aaaa' }, env2, { email: 'j2@prueba.com' })]);
    expect([a.status, b.status].sort()).toEqual([200, 429]);
  });
  // el contador del techo roto: no se pregunta
  const roto = { idFromName: (n) => n, get: (n) => ({ fetch: async () => { throw new Error('caído'); } }) };
  await con(ok, async (vistas) => {
    const r = await pedir('uid-n2', HAIKU, { ...ENV, CUOTAS: roto }, RED);
    expect(r.status).toBe(503);
    expect(vistas.length).toBe(0);
  });
});

// revisión aparte del 6 nov
test('0.8.2b: una respuesta cortada se queda con lo apartado (lo más que podía costar), y uno solo no se lleva el techo', async () => {
  const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_TECHO_REDUCIDO: '5', CLAUDE_GASTO_REDUCIDO: '0.1' };
  // en directo, sin message_stop: no se sabe lo que ha cobrado Anthropic
  const cortada = () => new Response(`event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'm', usage: { input_tokens: 5, output_tokens: 1 } } })}\n\n`, { headers: { 'content-type': 'text/event-stream' } });
  await con(cortada, async () => {
    const r = await pedirYCerrar('uid-o', { ...HAIKU, stream: true, pregunta: 'corta1aaaa' }, env, RED);
    expect(r.status).toBe(200);
    const t = await gastado(env);
    // lo apartado: la entrada (en bytes, como mucho) a precio de escribir caché y los 4.096 de salida de Haiku
    expect(t.g).toBeGreaterThan(4096 * 0.5 / 1e6);
    expect(t.p).toBe(0);
  });
  // el tope de gasto del correo (0,1 $ aquí): una «A fondo» que ya no cabe se dice como «sin A fondo» (la app sigue con Haiku)
  await con(conUso({ input_tokens: 1000, output_tokens: 9000 }), async () => {
    expect((await pedirYCerrar('uid-p', { ...SONNET, pregunta: 'gasto1aaaa' }, env, { email: 'gasta@prueba.com' })).status).toBe(200);
    const r = await pedir('uid-p', { ...SONNET, pregunta: 'gasto2aaaa' }, env, { email: 'gasta@prueba.com' });
    expect(await r.json()).toEqual({ error: 'tope-fondo' });
    // con Haiku aún cabe
    expect((await pedirYCerrar('uid-p', { ...HAIKU, pregunta: 'gasto3aaaa' }, env, { email: 'gasta@prueba.com' })).status).toBe(200);
    // y otro del nivel reducido sigue teniendo lo suyo
    expect((await pedir('uid-q2', { ...SONNET, pregunta: 'gasto4aaaa' }, env, { email: 'otra-persona@prueba.com' })).status).toBe(200);
  });
});

test('0.8.2b: los alias del mismo buzón cuentan juntos y el cierre de ayer no borra lo de hoy', async () => {
  await con(ok, async () => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA_REDUCIDO: '2' };
    expect((await pedir('uid-r1', { ...HAIKU, pregunta: 'alias1aaaa' }, env, { email: 'nombre@gmail.com' })).status).toBe(200);
    expect((await pedir('uid-r2', { ...HAIKU, pregunta: 'alias2aaaa' }, env, { email: 'nom.bre+toison@gmail.com' })).status).toBe(200);
    const r = await pedir('uid-r3', { ...HAIKU, pregunta: 'alias3aaaa' }, env, { email: 'Nombre+2@googlemail.com' });
    expect(await r.json()).toEqual({ error: 'tope-diario' });
    // en otros dominios los puntos sí cuentan (son buzones distintos)
    expect((await pedir('uid-r4', { ...HAIKU, pregunta: 'alias4aaaa' }, env, { email: 'nom.bre@prueba.com' })).status).toBe(200);
  });
  // el techo: un cierre con el día de ayer no toca el de hoy
  const o = new Cuotas({ storage: (() => { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); } }; })() });
  const op = (x) => o.fetch(new Request('https://x/', { method: 'POST', body: JSON.stringify(x) })).then((r) => r.json());
  await op({ op: 'reservar', dia: '2026-11-07', techo: 5, reserva: 1 });
  await op({ op: 'cerrar', dia: '2026-11-07', reserva: 1, coste: 4.8 });
  expect(await op({ op: 'cerrar', dia: '2026-11-06', reserva: 0.3, coste: 0.2 })).toMatchObject({ g: 4.8 });
  expect(await op({ op: 'reservar', dia: '2026-11-07', techo: 5, reserva: 0.3 })).toMatchObject({ ok: false, g: 4.8 });
  // y el día siguiente empieza de cero
  expect(await op({ op: 'reservar', dia: '2026-11-08', techo: 5, reserva: 0.3 })).toMatchObject({ ok: true, g: 0 });
});

test('0.8.2b: en el reducido, menos salida y búsquedas, una sola búsqueda, sin caché de una hora y solo modelos con precio', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_MODELOS: 'claude-haiku-5-5, claude-sonnet-5-5, claude-otro-1' };
    const busq = (n) => ({ type: 'web_search_20250305', name: 'web_search', max_uses: n });
    const pedido = { ...HAIKU, max_tokens: 30000, pregunta: 'recorte1aaa', tools: [busq(5)], system: [{ type: 'text', text: 'x', cache_control: { type: 'ephemeral', ttl: '1h' } }] };
    expect((await pedir('uid-s1', pedido, env, RED)).status).toBe(200);
    const v = vistas.at(-1).cuerpo;
    expect(v.max_tokens).toBe(16000);
    expect(v.tools[0].max_uses).toBe(3);
    expect(v.system[1].cache_control).toEqual({ type: 'ephemeral' });
    // el nivel alto: la salida que pida (hasta el tope de siempre) y sus 5 búsquedas
    expect((await pedir('uid-s2', { ...pedido, pregunta: 'recorte2aaa' }, env)).status).toBe(200);
    expect([vistas.at(-1).cuerpo.max_tokens, vistas.at(-1).cuerpo.tools[0].max_uses]).toEqual([30000, 5]);
    // dos búsquedas en una petición, para nadie
    expect((await pedir('uid-s3', { ...pedido, pregunta: 'recorte3aaa', tools: [busq(1), busq(1)] }, env)).status).toBe(400);
    // un modelo sin precio: el reducido no (el techo no sabría contarlo); el alto, sí
    expect((await pedir('uid-s4', { ...pedido, model: 'claude-otro-1', pregunta: 'recorte4aaa' }, env, RED)).status).toBe(400);
    expect((await pedir('uid-s5', { ...pedido, model: 'claude-otro-1', pregunta: 'recorte5aaa' }, env)).status).toBe(200);
  });
});

// 0.8.2d: la revisión de la cartera, el resumen de una noticia e importar van con «tarea»: su propio contador, que no se come
// las preguntas del chat; el dinero, en los mismos topes
test('0.8.2d: las tareas (revisión, noticia, importar) tienen su contador y no gastan preguntas', async () => {
  await con(ok, async () => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: undefined, CLAUDE_RONDAS_POR_DIA: undefined };
    const T = tareaDe;
    // nivel reducido: 10 tareas al día; ninguna gasta de las 5 preguntas (dos revisiones: más no caben en el día)
    const tipos = ['revision', 'noticia', 'importar', 'noticia', 'importar', 'revision', 'noticia', 'importar', 'noticia', 'importar'];
    for (let i = 0; i < 10; i++) {
      const r = await pedir('uid-t', T(`tarea${i}aaaa`, tipos[i]), env, RED);
      expect(r.status).toBe(200);
      expect(r.headers.get('x-quedan-tareas')).toBe(String(9 - i));
      expect(r.headers.get('x-quedan')).toBe('5');
    }
    let r = await pedir('uid-t', T('tarea99aaaa'), env, RED);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'tope-tareas' });
    // otra ronda de una tarea ya empezada sí entra (su id ya contó)
    expect((await pedir('uid-t', { ...T('tarea0aaaa'), ronda: 2 }, env, RED)).status).toBe(200);
    // las preguntas siguen enteras, y una pregunta no lleva X-Quedan-Tareas
    r = await pedir('uid-t', { ...HAIKU, pregunta: 'preg1aaaa', ronda: 1 }, env, RED);
    expect(r.status).toBe(200);
    expect(r.headers.get('x-quedan')).toBe('4');
    expect(r.headers.get('x-quedan-tareas')).toBeNull();
    // un valor de tarea que no es de la lista cuenta como pregunta
    r = await pedir('uid-t', { ...HAIKU, pregunta: 'preg2aaaa', ronda: 1, tarea: 'chat' }, env, RED);
    expect(r.headers.get('x-quedan')).toBe('3');
    // el mismo id como tarea y como pregunta no se cruza: la pregunta gasta la suya
    r = await pedir('uid-t', { ...HAIKU, pregunta: 'tarea1aaaa', ronda: 1 }, env, RED);
    expect(r.headers.get('x-quedan')).toBe('2');
    // una tarea con Sonnet en el reducido gasta «A fondo», como una pregunta
    r = await pedir('uid-t2', T('fondoTaaaa', 'importar', SONNET), env, { email: 'fondo-t@prueba.com' });
    expect(r.status).toBe(200);
    expect(r.headers.get('x-quedan-fondo')).toBe('2');
    // una tarea sin id no vale (no se sabría cuándo empieza otra)
    r = await pedir('uid-t3', { ...HAIKU, ronda: 2, tarea: 'noticia' }, env, { email: 'sinid@prueba.com' });
    expect(r.status).toBe(400);
    // una tarea que no cabe en el tope de gasto de su correo: «sin tareas», no «sin preguntas»
    r = await pedir('uid-t4', T('gastoTaaaa', 'revision'), { ...env, CLAUDE_GASTO_REDUCIDO: '0.0001' }, { email: 'gasto-t@prueba.com' });
    expect(await r.json()).toEqual({ error: 'tope-tareas' });
    // nivel alto: 40 tareas
    for (let i = 0; i < 3; i++) { const x = await pedir('uid-ta', T(`alto${i}taaaa`, i ? 'noticia' : 'revision'), env); expect(x.headers.get('x-quedan-tareas')).toBe(String(39 - i)); expect(x.headers.get('x-quedan')).toBe('20'); }
  });
});

test('0.8.2d: las tareas cuentan en el techo de gasto del reducido como las preguntas', async () => {
  await con(conUso({ input_tokens: 1000, output_tokens: 1000 }), async () => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_TECHO_REDUCIDO: '0.0001' };
    const r = await pedir('uid-tt', { ...HAIKU, pregunta: 'techoTaaaa', ronda: 1, tarea: 'revision' }, env, { email: 'tt@prueba.com' });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'techo' });
  });
});

// 0.8.2d (sesión 4): «tarea» no es una puerta para preguntar sin gastar preguntas. Cada tarea tiene que ser lo que dice ser
test('0.8.2d: la noticia va con Haiku, sin herramientas de la app, en un solo mensaje y con la salida corta', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira() };
    let n = 0;
    const mal = async (cuerpo, motivo) => { const r = await pedir('uid-tn', { ...cuerpo, pregunta: `noticiaMal${++n}x`, ronda: 1, tarea: 'noticia' }, env, RED); expect(r.status).toBe(400); expect(await r.json()).toEqual({ error: 'peticion', motivo }); };
    await mal({ ...SONNET, tools: [BUSCAR] }, 'modelo');
    await mal({ ...HAIKU, tools: [BUSCAR, { name: 'cartera', description: 'd', input_schema: { type: 'object' } }] }, 'tools');
    await mal({ ...HAIKU, tool_choice: { type: 'auto' } }, 'tools');
    // una conversación (pregunta, respuesta y otra pregunta) no es un resumen
    await mal({ ...HAIKU, messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: 'hola' }, { role: 'user', content: '¿y Repsol?' }] }, 'mensajes');
    await mal({ ...HAIKU, messages: [{ role: 'assistant', content: 'hola' }] }, 'mensajes');
    // ni los resultados de una herramienta de la app
    await mal({ ...HAIKU, messages: [{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '{}' }] }] }, 'tools');
    await mal({ ...HAIKU, messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'cartera', input: {} }] }] }, 'tools');
    // ni capturas
    await mal({ ...HAIKU, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } }, { type: 'text', text: 'resume' }] }] }, 'adjuntos');
    expect(vistas.length).toBe(0);
    // la buena pasa con la salida recortada y 2 búsquedas como mucho
    let r = await pedir('uid-tn', { ...HAIKU, max_tokens: 12000, tools: [{ ...BUSCAR, max_uses: 5 }], pregunta: 'noticiaBien1', ronda: 1, tarea: 'noticia' }, env);
    expect(r.status).toBe(200);
    expect(vistas[0].cuerpo.max_tokens).toBe(4096);
    expect(vistas[0].cuerpo.tools).toEqual([{ ...BUSCAR, max_uses: 2 }]);
    expect(vistas[0].cuerpo.tarea).toBeUndefined();
    // y si la búsqueda se alarga (pause_turn), la app devuelve lo que llevaba Claude para que siga: eso sí vale
    r = await pedir('uid-tn', { ...HAIKU, tools: [BUSCAR], pregunta: 'noticiaBien1', ronda: 2, tarea: 'noticia', messages: [{ role: 'user', content: 'resume' }, { role: 'assistant', content: [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'repsol' } }, { type: 'web_search_tool_result', tool_use_id: 's1', content: [] }] }] }, env);
    expect(r.status).toBe(200);
    // sin búsqueda también vale
    expect((await pedir('uid-tn', { ...HAIKU, pregunta: 'noticiaBien2', ronda: 1, tarea: 'noticia' }, env, RED)).status).toBe(200);
  });
});

test('0.8.2d: importar lleva al menos una captura, un PDF o un archivo, y sin herramientas', async () => {
  await con(ok, async (vistas) => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira() };
    let r = await pedir('uid-ti', { ...SONNET, pregunta: 'importarMal1', ronda: 1, tarea: 'importar' }, env, RED);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'peticion', motivo: 'adjuntos' });
    // un texto que solo dice «Archivo» en medio no es un archivo
    r = await pedir('uid-ti', { ...HAIKU, messages: [{ role: 'user', content: [{ type: 'text', text: 'Mi pregunta: ¿vendo? Archivo «x»' }] }], pregunta: 'importarMal2', ronda: 1, tarea: 'importar' }, env, RED);
    expect(await r.json()).toEqual({ error: 'peticion', motivo: 'adjuntos' });
    r = await pedir('uid-ti', { ...tareaDe('importarMal3', 'importar'), tools: [BUSCAR] }, env, RED);
    expect(await r.json()).toEqual({ error: 'peticion', motivo: 'tools' });
    r = await pedir('uid-ti', { ...tareaDe('importarMal4', 'importar'), messages: [{ role: 'user', content: ARCHIVO }, { role: 'assistant', content: '{}' }, { role: 'user', content: 'y ahora dime qué compro' }] }, env, RED);
    expect(await r.json()).toEqual({ error: 'peticion', motivo: 'mensajes' });
    expect(vistas.length).toBe(0);
    // un archivo pasado a texto, una captura o un PDF, sí
    expect((await pedir('uid-ti', tareaDe('importarBien1', 'importar', SONNET), env, RED)).status).toBe(200);
    const img = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } };
    expect((await pedir('uid-ti', { ...HAIKU, messages: [{ role: 'user', content: [img, { type: 'text', text: 'Devuelve solo el JSON.' }] }], pregunta: 'importarBien2', ronda: 1, tarea: 'importar' }, env)).status).toBe(200);
    expect(vistas.length).toBe(2);
  });
});

test('0.8.2d: la revisión de la cartera, 2 al día por correo en los dos niveles; las demás tareas siguen', async () => {
  await con(ok, async () => {
    const env = { ...ENV, CUOTAS: cuotasDeMentira(), CLAUDE_POR_DIA: undefined, CLAUDE_RONDAS_POR_DIA: undefined };
    const herr = { tools: [{ name: 'cartera', description: 'd', input_schema: { type: 'object' } }, BUSCAR] };
    for (const [uid, extra] of [['uid-rv1', RED], ['uid-rv2', {}]]) {
      let r = await pedir(uid, { ...tareaDe(`${uid.slice(4)}revisionA`, 'revision'), ...herr }, env, extra);
      expect(r.status).toBe(200);
      expect(r.headers.get('x-quedan-revisiones')).toBe('1');
      expect(r.headers.get('access-control-expose-headers')).toContain('X-Quedan-Revisiones');
      r = await pedir(uid, tareaDe(`${uid.slice(4)}revisionB`, 'revision'), env, extra);
      expect(r.headers.get('x-quedan-revisiones')).toBe('0');
      r = await pedir(uid, tareaDe(`${uid.slice(4)}revisionC`, 'revision'), env, extra);
      expect(r.status).toBe(429);
      expect(await r.json()).toEqual({ error: 'tope-revision' });
      // otra ronda de una revisión ya empezada sigue (sus herramientas), y las noticias e importar también
      r = await pedir(uid, { ...tareaDe(`${uid.slice(4)}revisionA`, 'revision'), ...herr, ronda: 2 }, env, extra);
      expect(r.status).toBe(200);
      expect((await pedir(uid, tareaDe(`${uid.slice(4)}noticiaZ`, 'noticia'), env, extra)).status).toBe(200);
      // la revisión rechazada no gastó tarea: quedan todas menos las dos revisiones que entraron
      expect(r.headers.get('x-quedan-tareas')).toBe(String((extra.email ? 10 : 40) - 2));
    }
    // una pregunta del chat no lleva X-Quedan-Revisiones
    const r = await pedir('uid-rv1', { ...HAIKU, pregunta: 'chatNormal1', ronda: 1 }, env, RED);
    expect(r.headers.get('x-quedan-revisiones')).toBeNull();
  });
});
