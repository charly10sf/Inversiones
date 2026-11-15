/* =====================================================================
   El relevo de Toisón (0.8.3d): un servicio mínimo para Cloud Run que solo reenvía al Worker de Cloudflare lo que le
   llega de la app y devuelve la respuesta en directo, trozo a trozo.

   Por qué existe: durante los partidos de LaLiga, los operadores españoles bloquean IP compartidas de Cloudflare, entre
   ellas las del Worker. El bloqueo es entre el operador y su cliente; entre servidores no hay bloqueo. Así que cuando la
   app no llega al Worker, va por aquí (Google), y desde aquí sí se llega. Las cuentas, los topes, las claves y el contador
   (Durable Object) se quedan en el Worker tal cual: el relevo no decide nada.

   Lo que ve y lo que no guarda: pasan por aquí el token de la cuenta (Authorization) y el cuerpo de la petición (la
   pregunta y lo que la IA necesita de la cartera). El relevo NO los guarda, NO los escribe en ningún registro y NO los
   mira: los copia de un lado a otro según llegan. Su propio registro solo apunta método, ruta (sin lo que va detrás de
   «?»), estado y tiempo. Ojo: Cloud Run apunta por su cuenta cada petición (dirección entera, IP, navegador, estado):
   eso se puede quitar con una exclusión en Cloud Logging (ver relevo/LEEME.md).

   Sin dependencias: Node 22 (http y fetch de serie). Lo arranca `node servidor.mjs`; Cloud Run le da PORT.
   ===================================================================== */
import { createServer } from 'node:http';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const DESTINO_POR_DEFECTO = 'https://growfolio.growfolio-web-app.workers.dev';
// las rutas del Worker que usa la app (lo demás no se reenvía: el relevo no es un proxy abierto)
const RUTAS = [/^\/salud$/, /^\/claude$/, /^\/isin$/, /^\/intradia$/, /^\/historico$/, /^\/banco\/[a-z0-9-]{1,40}$/, /^\/correo$/, /^\/correo\/[a-z0-9-]{1,40}$/];
// lo que se copia de la petición al Worker. User-Agent, Accept, Accept-Language, Accept-Charset y Referer los usa el
// banco (cabeceras PSU); Origin, para que el Worker aplique su lista de sitios. Nada más (ni cookies ni IP)
const CABECERAS_IDA = ['authorization', 'content-type', 'origin', 'user-agent', 'accept', 'accept-language', 'accept-charset', 'referer'];
// lo que se devuelve del Worker: el tipo, la caché, cuándo volver a probar y las propias (x-quedan…). Lo demás (las de
// Cloudflare, cookies, compresión, que fetch ya deshace) se queda fuera
const CABECERAS_VUELTA = (k) => k === 'content-type' || k === 'cache-control' || k === 'retry-after' || (k.startsWith('x-') && k !== 'x-powered-by');
const MB = 1024 * 1024;

// la clave de cada IP para los topes: la IPv4 tal cual; la IPv6, su /64 (los primeros cuatro grupos), porque quien
// tiene una IPv6 tiene a mano todas las de su /64
export function claveIp(ip) {
  ip = String(ip || '').trim().toLowerCase();
  const v4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) return v4[1];
  if (!ip.includes(':')) return ip;
  ip = ip.split('%')[0];
  const [izq, der] = ip.split('::');
  const a = izq ? izq.split(':') : [], b = der != null ? (der ? der.split(':') : []) : [];
  const todo = der != null ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a;
  return todo.slice(0, 4).map((g) => (g || '0').replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

export function crearRelevo({
  destino = process.env.DESTINO || DESTINO_POR_DEFECTO,
  // los sitios desde los que se acepta (los mismos que el Worker); vacío, cualquiera (lo decide el Worker)
  origenes = (process.env.ORIGENES || 'https://charly10sf.github.io,https://toison.es').split(',').map((x) => x.trim()).filter(Boolean),
  maxCuerpo = Number(process.env.MAX_CUERPO_MB || 20) * MB,
  // si el Worker no contesta nada en este tiempo, se corta (la IA tarda en empezar unos segundos, no minutos)
  esperaCabeceras = Number(process.env.ESPERA_CABECERAS_S || 45) * 1000,
  // sin un solo byte nuevo en este tiempo, se corta (la app corta a los 60 s)
  esperaHilo = Number(process.env.ESPERA_HILO_S || 75) * 1000,
  // cuántas peticiones por minuto deja a cada IP (en cada instancia; las IPv6, por su /64): frena que alguien lo use
  // para gastar (la salida a internet de Cloud Run se paga)
  porMinuto = Number(process.env.POR_MINUTO || 60),
  // y cuántas abiertas a la vez (una respuesta de la IA dura 60–100 s): que pocas conexiones lentas no lo llenen
  aLaVez = Number(process.env.A_LA_VEZ || 8),
  // para terminar de subir el cuerpo (una pregunta con la cartera, o capturas, en segundos)
  esperaSubida = Number(process.env.ESPERA_SUBIDA_S || 20) * 1000,
  registrar = (linea) => console.log(linea),
} = {}) {
  const base = String(destino).replace(/\/+$/, '');
  const cuentas = new Map();
  let limpiado = Date.now();
  const deMas = (ip) => {
    const ahora = Date.now();
    if (ahora - limpiado > 6e4) { for (const [k, v] of cuentas) if (ahora - v.t > 6e4) cuentas.delete(k); limpiado = ahora; }
    const c = cuentas.get(ip);
    if (!c || ahora - c.t > 6e4) { cuentas.set(ip, { t: ahora, n: 1 }); return false; }
    c.n++;
    return c.n > porMinuto;
  };
  const abiertas = new Map();
  // la IP solo para el límite de arriba (en memoria, un minuto); no se manda al Worker ni se apunta
  const ipDe = (req) => claveIp(String(req.headers['x-forwarded-for'] || '').split(',').map((x) => x.trim()).filter(Boolean).pop() || req.socket.remoteAddress || '');
  const cors = (req) => {
    const o = req.headers.origin || '';
    return { 'Access-Control-Allow-Origin': !origenes.length || origenes.includes(o) ? o || '*' : origenes[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
  };
  const responder = (req, res, status, cuerpo) => {
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(status, { ...cors(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(cuerpo));
  };

  return createServer(async (req, res) => {
    const t0 = Date.now();
    let ruta = '/', estado = 0;
    const fin = () => registrar(`${req.method} ${ruta} ${estado || res.statusCode} ${Date.now() - t0} ms`);
    // un solo «close» con todo lo que hay que recoger al acabar (o al irse la app)
    const alCerrar = [() => { if (!res.writableFinished) registrar(`${req.method} ${ruta} cortada ${Date.now() - t0} ms`); }];
    res.on('finish', fin);
    res.on('close', () => { for (const f of alCerrar) try { f(); } catch (e) { /* nada */ } });
    // una subida que se corta a medias: que no tumbe el proceso
    req.on('error', () => { /* lo recoge «close» */ });
    try {
      const url = new URL(req.url, 'http://relevo');
      ruta = url.pathname;
      // la salud del propio relevo (para Cloud Run), sin tocar el Worker
      if (ruta === '/_relevo') return responder(req, res, 200, { ok: true });
      if (req.method === 'OPTIONS') { res.writeHead(204, cors(req)); return res.end(); }
      if (!['GET', 'POST'].includes(req.method) || !RUTAS.some((r) => r.test(ruta))) return responder(req, res, 404, { error: 'no-existe' });
      const o = req.headers.origin || '';
      if (origenes.length && o && !origenes.includes(o)) return responder(req, res, 403, { error: 'origen' });
      const ip = ipDe(req);
      if (deMas(ip) || (abiertas.get(ip) || 0) >= aLaVez) return responder(req, res, 429, { error: 'demasiadas', motivo: 'relevo' });
      abiertas.set(ip, (abiertas.get(ip) || 0) + 1);
      alCerrar.push(() => { const n = (abiertas.get(ip) || 1) - 1; if (n > 0) abiertas.set(ip, n); else abiertas.delete(ip); });
      const largo = Number(req.headers['content-length'] || 0);
      if (largo > maxCuerpo) return responder(req, res, 413, { error: 'grande' });

      const cab = {};
      for (const k of CABECERAS_IDA) if (req.headers[k]) cab[k] = String(req.headers[k]);
      // el Worker sabe así que viene del relevo: no usa esta IP (la de Google) como la tuya para el banco
      cab['x-toison-relevo'] = '1';
      // sin comprimir: que nada en medio junte la respuesta en directo para comprimirla
      cab['accept-encoding'] = 'identity';

      const ctl = new AbortController();
      let motivo = '';
      const cortar = (m) => { if (!motivo) motivo = m; ctl.abort(); };
      // si la app se va (cierra, corta), se corta también hacia el Worker: no se sigue gastando
      alCerrar.push(() => { if (!res.writableFinished) cortar('cliente'); });
      let reloj = setTimeout(() => cortar('cabeceras'), esperaCabeceras);

      let cuerpo;
      if (req.method === 'POST') {
        const subida = setTimeout(() => cortar('subida'), esperaSubida);
        req.on('end', () => clearTimeout(subida)); alCerrar.push(() => clearTimeout(subida));
        let n = 0;
        const contar = new Transform({ transform(trozo, _c, hecho) { n += trozo.length; if (n > maxCuerpo) { cortar('grande'); hecho(new Error('grande')); } else hecho(null, trozo); } });
        cuerpo = Readable.toWeb(req.pipe(contar));
      }
      let r;
      try {
        r = await fetch(base + ruta + url.search, { method: req.method, headers: cab, body: cuerpo, duplex: cuerpo ? 'half' : undefined, signal: ctl.signal, redirect: 'manual' });
      } catch (e) {
        clearTimeout(reloj);
        if (motivo === 'cliente') return;
        if (motivo === 'grande') return responder(req, res, 413, { error: 'grande' });
        if (motivo === 'subida') return responder(req, res, 408, { error: 'relevo', motivo: 'subida lenta' });
        estado = 502;
        return responder(req, res, 502, { error: 'relevo', motivo: motivo === 'cabeceras' ? 'el Worker no contesta' : 'no llega al Worker' });
      }
      clearTimeout(reloj);
      const vuelta = { ...cors(req) };
      r.headers.forEach((v, k) => { if (CABECERAS_VUELTA(k)) vuelta[k] = v; });
      // que nada en medio guarde ni junte la respuesta en directo
      vuelta['cache-control'] = r.headers.get('cache-control') || 'no-store';
      vuelta['x-accel-buffering'] = 'no';
      // las cabeceras que la app lee de la IA (x-quedan…) solo se ven si se exponen
      const propias = [...r.headers.keys()].filter((k) => k.startsWith('x-'));
      if (propias.length) vuelta['access-control-expose-headers'] = propias.join(', ');
      res.writeHead(r.status, vuelta);
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      if (!r.body) return res.end();
      // trozo a trozo, sin juntar: cada trozo se manda en cuanto llega (la IA se ve escribir igual que sin relevo)
      const vigia = new Transform({ transform(trozo, _c, hecho) { clearTimeout(reloj); reloj = setTimeout(() => cortar('hilo'), esperaHilo); hecho(null, trozo); } });
      reloj = setTimeout(() => cortar('hilo'), esperaHilo);
      try { await pipeline(Readable.fromWeb(r.body), vigia, res); }
      catch (e) { if (!res.destroyed) res.destroy(); }
      finally { clearTimeout(reloj); }
    } catch (e) {
      // sin el mensaje: podría llevar algo de la petición
      estado = 500;
      responder(req, res, 500, { error: 'relevo', motivo: 'fallo' });
    }
  });
}

// arranque en Cloud Run (o a mano): node servidor.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const puerto = Number(process.env.PORT || 8080);
  const s = crearRelevo();
  // Cloud Run corta a los «timeout» del servicio (300 s); aquí, algo más para que corte él y no Node
  s.requestTimeout = 0; s.headersTimeout = 30_000; s.keepAliveTimeout = 65_000;
  s.listen(puerto, () => console.log(`relevo en ${puerto} → ${process.env.DESTINO || DESTINO_POR_DEFECTO}`));
  process.on('SIGTERM', () => s.close(() => process.exit(0)));
}
