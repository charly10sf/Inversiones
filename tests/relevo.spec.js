// 0.8.3d · El relevo (relevo/servidor.mjs), sin navegador: un Worker de imitación detrás y el relevo de verdad delante.
// Se comprueba que reenvía en directo (trozo a trozo), con las cabeceras justas, el cuerpo tal cual y sin guardar ni
// apuntar el token, el cuerpo ni lo que va detrás de «?»; que no es un proxy abierto (solo las rutas de la app, los
// sitios de la lista y un tope por minuto); que corta hacia el Worker si la app se va; y que dice claro cuando no llega.
import { test, expect } from '@playwright/test';
import { createServer, request as pedirHttp } from 'node:http';
import { gzipSync } from 'node:zlib';
import { crearRelevo, claveIp } from '../relevo/servidor.mjs';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

const escuchar = (s) => new Promise((ok) => s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${s.address().port}`)));
const ORIGEN = 'https://charly10sf.github.io';

// el Worker de imitación: apunta lo que le llega y contesta según la ruta
function workerFalso() {
  const visto = [];
  const s = createServer(async (req, res) => {
    const trozos = []; try { for await (const t of req) trozos.push(t); } catch (e) { return; }
    const v = { metodo: req.method, url: req.url, cab: req.headers, cuerpo: Buffer.concat(trozos), cerrada: false };
    visto.push(v);
    req.on('close', () => {}); res.on('close', () => { if (!res.writableFinished) v.cerrada = true; });
    if (req.url === '/claude') {
      // en directo: tres trozos con pausas (la app tiene que ver el primero antes de que acabe)
      res.writeHead(200, { 'content-type': 'text/event-stream', 'x-quedan': '7', 'access-control-allow-origin': '*', 'set-cookie': 'no=1', 'cf-ray': 'abc' });
      res.write('data: {"type":"message_start"}\n\n');
      await new Promise((ok) => setTimeout(ok, 400));
      res.write('data: {"type":"content_block_delta"}\n\n');
      await new Promise((ok) => setTimeout(ok, 400));
      return res.end('data: {"type":"message_stop"}\n\n');
    }
    if (req.url === '/correo/lento') { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.write('data: 1\n\n'); return; }
    if (req.url.startsWith('/isin')) { const z = gzipSync(JSON.stringify({ ok: true, eco: v.cuerpo.length })); res.writeHead(200, { 'content-type': 'application/json', 'content-encoding': 'gzip', 'content-length': z.length }); return res.end(z); }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, largo: v.cuerpo.length }));
  });
  return { s, visto };
}

async function montar(opciones = {}) {
  const w = workerFalso();
  const destino = await escuchar(w.s);
  const lineas = [];
  const relevo = crearRelevo({ destino, registrar: (x) => lineas.push(x), ...opciones });
  const url = await escuchar(relevo);
  return { w, url, lineas, cerrar: () => { w.s.closeAllConnections?.(); relevo.closeAllConnections?.(); w.s.close(); relevo.close(); } };
}

test('reenvía la respuesta de la IA en directo, con las cabeceras justas, y no apunta el token, el cuerpo ni la consulta', async () => {
  const m = await montar();
  try {
    const cuerpo = JSON.stringify({ model: 'claude-haiku-5-5', messages: [{ role: 'user', content: 'Mi cartera: 12.345 € en VWCE' }] });
    const t0 = Date.now();
    const r = await fetch(`${m.url}/claude`, { method: 'POST', body: cuerpo, headers: { Authorization: 'Bearer token-secreto', 'Content-Type': 'application/json', Origin: ORIGEN, 'User-Agent': 'Navegador/1.0', Cookie: 'sesion=1', 'CF-Connecting-IP': '1.2.3.4', 'X-Forwarded-For': '9.9.9.9', 'Accept-Language': 'es-ES' } });
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGEN);
    expect(r.headers.get('access-control-expose-headers')).toContain('x-quedan');
    expect(r.headers.get('x-quedan')).toBe('7');
    expect(r.headers.get('set-cookie')).toBeNull();
    expect(r.headers.get('cf-ray')).toBeNull();
    const lector = r.body.getReader();
    const primero = await lector.read();
    const tPrimero = Date.now() - t0;
    expect(new TextDecoder().decode(primero.value)).toContain('message_start');
    let resto = ''; for (;;) { const { done, value } = await lector.read(); if (done) break; resto += new TextDecoder().decode(value); }
    const tFin = Date.now() - t0;
    expect(resto).toContain('message_stop');
    expect(tFin - tPrimero, 'el primer trozo llega antes de que acabe (no se junta)').toBeGreaterThan(500);
    // lo que le llegó al Worker: lo mismo, y solo lo que hace falta
    const v = m.w.visto[0];
    expect(v.cuerpo.toString()).toBe(cuerpo);
    expect(v.cab.authorization).toBe('Bearer token-secreto');
    expect(v.cab.origin).toBe(ORIGEN);
    expect(v.cab['user-agent']).toBe('Navegador/1.0');
    expect(v.cab['accept-language']).toBe('es-ES');
    expect(v.cab['x-toison-relevo']).toBe('1');
    expect(v.cab['accept-encoding']).toBe('identity');
    expect(v.cab.cookie).toBeUndefined();
    expect(v.cab['cf-connecting-ip']).toBeUndefined();
    expect(v.cab['x-forwarded-for']).toBeUndefined();
    // el registro: método, ruta, estado y tiempo; nada del token ni de la cartera
    await new Promise((ok) => setTimeout(ok, 50));
    const reg = m.lineas.join('\n');
    expect(reg).toMatch(/^POST \/claude 200 \d+ ms$/m);
    expect(reg).not.toContain('token-secreto');
    expect(reg).not.toContain('12.345');
    // la consulta (?c=ISIN) tampoco se apunta; y lo que llega comprimido sale bien (sin la marca de comprimido)
    const i = await fetch(`${m.url}/isin?c=IE00B4L5Y983`, { headers: { Origin: ORIGEN } });
    expect(i.headers.get('content-encoding')).toBeNull();
    expect(await i.json()).toEqual({ ok: true, eco: 0 });
    expect(m.w.visto[1].url).toBe('/isin?c=IE00B4L5Y983');
    await new Promise((ok) => setTimeout(ok, 50));
    expect(m.lineas.join('\n')).not.toContain('IE00B4L5Y983');
  } finally { m.cerrar(); }
});

test('no es un proxy abierto: solo las rutas de la app, con GET y POST, y los sitios de la lista', async () => {
  const m = await montar();
  try {
    for (const [ruta, op] of [['/otra', {}], ['/claude/../../x', {}], ['/banco/estado', { method: 'PUT' }], ['/', {}]]) {
      const r = await fetch(m.url + ruta, { ...op, headers: { Origin: ORIGEN } });
      expect(r.status, ruta).toBe(404);
    }
    const r = await fetch(`${m.url}/claude`, { method: 'POST', body: '{}', headers: { Origin: 'https://malo.example' } });
    expect(r.status).toBe(403);
    expect(m.w.visto.length, 'nada de eso llega al Worker').toBe(0);
    // el preflight del navegador lo contesta el relevo
    const o = await fetch(`${m.url}/claude`, { method: 'OPTIONS', headers: { Origin: ORIGEN, 'Access-Control-Request-Method': 'POST' } });
    expect(o.status).toBe(204);
    expect(o.headers.get('access-control-allow-headers')).toContain('Authorization');
    // las rutas buenas sí
    expect((await fetch(`${m.url}/banco/estado`, { headers: { Origin: ORIGEN } })).status).toBe(200);
    // las gráficas (10 nov): /intradia y /historico, con su consulta
    expect((await fetch(`${m.url}/intradia?s=WDC`, { headers: { Origin: ORIGEN } })).status).toBe(200);
    expect((await fetch(`${m.url}/historico?s=WDC,SAP.DE`, { headers: { Origin: ORIGEN } })).status).toBe(200);
    expect(m.w.visto.map((v) => v.url)).toEqual(expect.arrayContaining(['/intradia?s=WDC', '/historico?s=WDC,SAP.DE']));
    expect((await fetch(`${m.url}/salud`)).status).toBe(200);
    expect((await fetch(`${m.url}/_relevo`)).status).toBe(200);
  } finally { m.cerrar(); }
});

test('el cuerpo grande pasa entero; el que pasa del tope, no', async () => {
  const m = await montar({ maxCuerpo: 3 * 1024 * 1024 });
  try {
    const grande = 'x'.repeat(2 * 1024 * 1024);
    const r = await fetch(`${m.url}/correo`, { method: 'POST', body: grande, headers: { Origin: ORIGEN, 'Content-Type': 'application/json' } });
    expect(await r.json()).toEqual({ ok: true, largo: grande.length });
    const r2 = await fetch(`${m.url}/correo`, { method: 'POST', body: 'x'.repeat(4 * 1024 * 1024), headers: { Origin: ORIGEN } });
    expect(r2.status).toBe(413);
  } finally { m.cerrar(); }
});

test('si la app se va a mitad, el relevo corta también hacia el Worker', async () => {
  const m = await montar({ esperaHilo: 60_000 });
  try {
    await new Promise((ok, mal) => {
      const q = pedirHttp(`${m.url}/claude`, { method: 'POST', headers: { Origin: ORIGEN, 'content-type': 'application/json' } });
      q.on('error', () => ok());
      q.on('response', (res) => { res.once('data', () => { q.destroy(); setTimeout(ok, 300); }); });
      q.end('{}');
      setTimeout(() => mal(new Error('sin respuesta')), 5000);
    });
    // /claude del falso tarda ~800 ms en acabar: al irse la app tras el primer trozo, el Worker ve la conexión cortada
    await new Promise((ok) => setTimeout(ok, 900));
    expect(m.w.visto[0].cerrada).toBe(true);
    expect(m.lineas.join('\n')).toMatch(/POST \/claude cortada/);
  } finally { m.cerrar(); }
});

test('sin llegar al Worker dice 502 «relevo»; el Worker callado corta a su tiempo; demasiadas por minuto, 429', async () => {
  const caido = crearRelevo({ destino: 'http://127.0.0.1:9', registrar: () => {} });
  const url = await escuchar(caido);
  try {
    const r = await fetch(`${url}/claude`, { method: 'POST', body: '{}', headers: { Origin: ORIGEN } });
    expect(r.status).toBe(502);
    expect((await r.json()).error).toBe('relevo');
  } finally { caido.close(); }
  const m = await montar({ esperaHilo: 500, porMinuto: 3 });
  try {
    // el Worker manda un trozo y se calla: a los 0,5 s sin nada nuevo, el relevo corta
    const t0 = Date.now();
    const r = await fetch(`${m.url}/correo/lento`, { method: 'POST', body: '{}', headers: { Origin: ORIGEN } });
    expect(r.status).toBe(200);
    await r.text().catch(() => '');
    expect(Date.now() - t0).toBeLessThan(5000);
    await fetch(`${m.url}/salud`); await fetch(`${m.url}/salud`);
    const r4 = await fetch(`${m.url}/salud`);
    expect(r4.status).toBe(429);
    expect((await r4.json()).motivo).toBe('relevo');
  } finally { m.cerrar(); }
});

test('pocas conexiones lentas no lo llenan: tope de abiertas a la vez por IP; la subida lenta se corta', async () => {
  const m = await montar({ aLaVez: 2, esperaSubida: 400 });
  try {
    // dos respuestas largas abiertas a la vez (las de /correo/lento no acaban): la tercera, 429
    const abiertas = [];
    for (let i = 0; i < 2; i++) { const ctl = new AbortController(); abiertas.push(ctl); await fetch(`${m.url}/correo/lento`, { method: 'POST', body: '{}', headers: { Origin: ORIGEN }, signal: ctl.signal }); }
    const r = await fetch(`${m.url}/salud`);
    expect(r.status).toBe(429);
    abiertas.forEach((c) => c.abort());
    await new Promise((ok) => setTimeout(ok, 200));
    expect((await fetch(`${m.url}/salud`)).status).toBe(200);
    // una subida que no acaba: a los 0,4 s, 408
    const codigo = await new Promise((ok) => {
      const q = pedirHttp(`${m.url}/claude`, { method: 'POST', headers: { Origin: ORIGEN, 'content-type': 'application/json', 'transfer-encoding': 'chunked' } });
      q.on('response', (res) => ok(res.statusCode)); q.on('error', () => ok('error'));
      q.write('{"a":');
    });
    expect(codigo).toBe(408);
  } finally { m.cerrar(); }
});

test('los topes por IP cuentan las IPv6 por su /64 (cambiar de IP dentro de su red no sirve para gastar)', async () => {
  expect(claveIp('2a01:4f8:0:1::5')).toBe(claveIp('2a01:04f8:0000:0001:aaaa:bbbb:cccc:dddd'));
  expect(claveIp('2a01:4f8:0:2::5')).not.toBe(claveIp('2a01:4f8:0:1::5'));
  expect(claveIp('::ffff:1.2.3.4')).toBe('1.2.3.4');
  const m = await montar({ porMinuto: 2 });
  try {
    const pedir = (ip) => fetch(`${m.url}/salud`, { headers: { 'X-Forwarded-For': ip } }).then((r) => r.status);
    expect(await pedir('2a01:4f8:0:1::1')).toBe(200);
    expect(await pedir('2a01:4f8:0:1::2')).toBe(200);
    expect(await pedir('2a01:4f8:0:1::3'), 'la tercera de la misma /64').toBe(429);
    expect(await pedir('2a01:4f8:0:9::1'), 'otra /64, sí').toBe(200);
  } finally { m.cerrar(); }
});
