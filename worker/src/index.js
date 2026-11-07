/* GrowFolio: el servidor pequeño (un Cloudflare Worker).

   Hace tres cosas: buscar en Yahoo un ISIN que no está en el catálogo (/isin, más abajo), leer el saldo de tus cuentas de dinero con Enable Banking (open banking, solo lectura),
   para que el efectivo de GrowFolio cuadre con el del banco, y reenviar a Claude las preguntas de GrowIA (/claude, más abajo). Está aquí y no en la web porque Enable Banking firma cada
   petición con una clave privada que no puede ir en una página pública.

   - Solo atiende a quien entra con su cuenta de GrowFolio (el token de Firebase, comprobado con las claves públicas de
     Google) y está en la lista BANCO_EMAILS.
   - No guarda nada: la sesión del banco y las cuentas las guarda la app, cifradas dentro de tu cartera.
   - Secretos (los pone la GitHub Action, nunca están en el repositorio): EB_CLAVE (la clave .pem de la aplicación de
     Enable Banking), EB_APP (su Application ID), BANCO_EMAILS (quién puede usarlo) y ESTADO (para firmar la vuelta). */

import { correoRuta } from './correo.js';
const EB_API = 'https://api.enablebanking.com';
const FB_PROYECTO = 'growfolio-a79a9';
const FB_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
// 0.8.3: también toison.es, la casa nueva de la app (toison.es/app, Firebase Hosting)
const ORIGENES = ['https://charly10sf.github.io', 'https://toison.es'];
// la primera es la de por defecto; la web manda la suya (la de GrowFolio, en cuanto el repositorio se renombre)
const VUELTAS = ['https://charly10sf.github.io/Inversiones/', 'https://charly10sf.github.io/GrowFolio/', 'https://toison.es/app/'];
// el saldo que vale para «tu efectivo»: el disponible si lo dan; si no, el contable
const ORDEN_SALDO = ['ITAV', 'CLAV', 'ITBD', 'CLBD', 'XPCD', 'OPAV', 'OPBD', 'PRCD', 'FWAV', 'INFO', 'OTHR'];

const te = new TextEncoder(), td = new TextDecoder();
const b64u = (bytes) => { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const desB64u = (s) => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const json64 = (o) => b64u(te.encode(JSON.stringify(o)));
const lista = (s) => String(s || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);

/* ---------- la clave de Enable Banking ---------- */
const pemADer = (pem) => Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
const largo = (n) => { if (n < 0x80) return [n]; const b = []; while (n) { b.unshift(n & 0xff); n >>= 8; } return [0x80 | b.length, ...b]; };
// una clave «RSA PRIVATE KEY» (PKCS#1) se envuelve en PKCS#8, que es lo que entiende WebCrypto
function pkcs1a8(der) {
  const cuerpo = [0x02, 0x01, 0x00, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x04, ...largo(der.length), ...der];
  return Uint8Array.from([0x30, ...largo(cuerpo.length), ...cuerpo]);
}
let claveEB = null, claveEBde = '';
async function tokenEB(env) {
  if (!claveEB || claveEBde !== env.EB_CLAVE) {
    let der = pemADer(env.EB_CLAVE);
    if (/BEGIN RSA PRIVATE KEY/.test(env.EB_CLAVE)) der = pkcs1a8(der);
    claveEB = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    claveEBde = env.EB_CLAVE;
  }
  const iat = Math.floor(Date.now() / 1000);
  const firmado = `${json64({ typ: 'JWT', alg: 'RS256', kid: String(env.EB_APP).trim() })}.${json64({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat, exp: iat + 3600 })}`;
  return `${firmado}.${b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', claveEB, te.encode(firmado)))}`;
}
async function eb(env, metodo, ruta, cuerpo, extra) {
  const r = await fetch((env.EB_API || EB_API) + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${await tokenEB(env)}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(extra || {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const txt = await r.text();
  let j = null; try { j = JSON.parse(txt); } catch (e) { /* sin cuerpo */ }
  return { ok: r.ok, status: r.status, j: j || {} };
}
const motivoEB = (r) => String((r.j && (r.j.message || r.j.detail || r.j.error)) || '').slice(0, 160);
/* 0.7d: con la app abierta delante (al abrirla o al pulsar «Actualizar»), la lectura del saldo lleva las cabeceras PSU
   de tu navegador. Así cuenta como pedida por ti y el banco no aplica su tope de unas 4 lecturas al día cuando no estás
   (lo que se pide solo, cada 4 horas, va sin ellas). No se guarda nada: van del navegador a Enable Banking y al banco.
   Sin la ubicación (Psu-Geo-Location): no la tenemos ni hace falta. */
const PSU_DE = [['User-Agent', 'Psu-User-Agent'], ['Referer', 'Psu-Referer'], ['Accept', 'Psu-Accept'], ['Accept-Charset', 'Psu-Accept-Charset'], ['Accept-Encoding', 'Psu-Accept-Encoding'], ['Accept-Language', 'Psu-Accept-language']];
function cabecerasPsu(req) {
  const ip = req.headers.get('CF-Connecting-IP');
  if (!ip) return null;
  const o = { 'Psu-Ip-Address': ip };
  for (const [de, a] of PSU_DE) { const v = req.headers.get(de); if (v) o[a] = v.slice(0, 400); }
  return o;
}
// con las cabeceras PSU, el banco dice que la petición está mal (pide alguna que no tenemos, todas o ninguna, o no le
// gusta una): se lee como siempre, sin ellas, antes de pensar que el permiso ha caducado
const fallaConPsu = (r) => !r.ok && ([400, 422].includes(r.status) || /PSU_HEADER/i.test(JSON.stringify(r.j || {})));
// 0.7d: el código HTTP no basta para saber si el permiso ha caducado: se mira el estado de la sesión en Enable Banking
const SESION_TERMINADA = ['EXPIRED', 'REVOKED', 'CLOSED', 'CANCELLED', 'INVALID'];
async function sesionTerminada(env, sesion) {
  const r = await eb(env, 'GET', `/sessions/${encodeURIComponent(sesion)}`);
  if (r.status === 404) return true;
  return r.ok && SESION_TERMINADA.includes(String(r.j.status || '').toUpperCase());
}

/* ---------- quién llama: el token de Firebase de su cuenta de GrowFolio ---------- */
let jwks = null, jwksT = 0, jwksRebajado = 0;
// con un kid que no conocemos se vuelve a pedir la lista (Google la rota), pero como mucho una vez cada 30 s: un token
// inventado no hace que el Worker baje las claves en cada petición, y un kid nuevo de verdad entra como mucho a los 30 s.
// Una respuesta mala de Google no pisa las claves buenas (auditoría del 4 nov)
async function claveFB(env, kid) {
  for (let intento = 0; intento < 2; intento++) {
    const vieja = !jwks || Date.now() - jwksT > 3600e3;
    if (vieja || (intento && Date.now() - jwksRebajado > 30e3)) {
      if (intento) jwksRebajado = Date.now();
      try {
        const r = await fetch(env.FB_JWKS || FB_JWKS), keys = r.ok ? ((await r.json()) || {}).keys : null;
        if (Array.isArray(keys) && keys.length) { jwks = keys; jwksT = Date.now(); }
      } catch (e) { /* se queda con las que había */ }
      if (!jwks) jwks = [];
    }
    const k = jwks.find((x) => x.kid === kid);
    if (k) return k;
  }
  return null;
}
async function quienEs(req, env) {
  const [h, p, s] = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').split('.');
  if (!s) return null;
  let cab, cue;
  try { cab = JSON.parse(td.decode(desB64u(h))); cue = JSON.parse(td.decode(desB64u(p))); } catch (e) { return null; }
  const proyecto = env.FB_PROYECTO || FB_PROYECTO, ahora = Date.now() / 1000;
  if (cab.alg !== 'RS256' || cue.aud !== proyecto || cue.iss !== `https://securetoken.google.com/${proyecto}` || !(cue.exp > ahora) || !(cue.iat <= ahora + 300) || !cue.sub) return null;
  const jwk = await claveFB(env, cab.kid);
  if (!jwk) return null;
  const k = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, desB64u(s), te.encode(`${h}.${p}`)))) return null;
  return { uid: cue.sub, email: String(cue.email || '').toLowerCase(), verificado: !!cue.email_verified };
}
const puedeBanco = (u, env) => !!u && u.verificado && !!u.email && lista(env.BANCO_EMAILS).includes(u.email);

/* ---------- la vuelta del banco: el «state» va firmado y lleva tu uid y a qué plataforma de GrowFolio va la cuenta
   (así la vuelta funciona aunque el banco te devuelva a otro navegador, por ejemplo desde la app de Android) ---------- */
async function hmac(env, txt) {
  const k = await crypto.subtle.importKey('raw', te.encode(env.ESTADO || env.EB_APP || 'growfolio'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, te.encode(txt)));
}
async function firmarEstado(env, uid, pl) {
  const n = new Uint8Array(12); crypto.getRandomValues(n);
  const d = json64({ u: uid, t: Date.now(), n: b64u(n), pl: String(pl || '').slice(0, 60) });
  return `${d}.${await hmac(env, d)}`;
}
async function leerEstado(env, estado, uid) {
  const [d, f] = String(estado || '').split('.');
  if (!d || !f || f !== (await hmac(env, d))) return null;
  try { const o = JSON.parse(td.decode(desB64u(d))); return o.u === uid && Date.now() - o.t < 30 * 60e3 ? o : null; } catch (e) { return null; }
}

function elegirSaldo(saldos) {
  const v = (saldos || []).filter((b) => b && b.balance_amount && isFinite(+b.balance_amount.amount));
  v.sort((a, b) => (ORDEN_SALDO.indexOf(a.balance_type) + 1 || 99) - (ORDEN_SALDO.indexOf(b.balance_type) + 1 || 99));
  return v[0] || null;
}
const idValido = (x) => typeof x === 'string' && /^[\w-]{4,100}$/.test(x);

async function banco(ruta, url, req, env, res) {
  const u = await quienEs(req, env);
  if (!u) return res({ error: 'sin-sesion' }, 401);
  const listo = !!(env.EB_CLAVE && env.EB_APP);
  if (ruta === 'estado') return res({ permitido: puedeBanco(u, env), listo });
  if (!puedeBanco(u, env)) return res({ error: 'no-permitido' }, 403);
  if (!listo) return res({ error: 'sin-configurar' }, 503);
  const datos = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  // los bancos de un país (nombre, logo y cuánto puede durar el permiso)
  if (ruta === 'bancos') {
    const pais = /^[A-Z]{2}$/.test(url.searchParams.get('pais') || '') ? url.searchParams.get('pais') : 'ES';
    const r = await eb(env, 'GET', `/aspsps?country=${pais}&psu_type=personal&service=AIS`);
    if (!r.ok) return res({ error: 'banco', status: r.status, motivo: motivoEB(r) }, 502);
    return res({ bancos: (r.j.aspsps || []).map((a) => ({ n: a.name, p: a.country, logo: a.logo || '', max: a.maximum_consent_validity || null })) });
  }
  // empezar: Enable Banking da la dirección del banco donde das permiso
  if (ruta === 'conectar') {
    const n = String(datos.banco || '').slice(0, 120), p = /^[A-Z]{2}$/.test(datos.pais || '') ? datos.pais : 'ES';
    if (!n) return res({ error: 'falta-banco' }, 400);
    const vueltas = [...VUELTAS, ...String(env.VUELTAS_EXTRA || '').split(',').map((x) => x.trim()).filter(Boolean)];
    const vuelta = vueltas.includes(datos.vuelta) ? datos.vuelta : VUELTAS[0];
    const segundos = Math.min(180 * 86400, Math.max(86400, +datos.max || 180 * 86400));
    const r = await eb(env, 'POST', '/auth', {
      access: { valid_until: new Date(Date.now() + segundos * 1000 - 60e3).toISOString() },
      aspsp: { name: n, country: p }, state: await firmarEstado(env, u.uid, datos.plataforma), redirect_url: vuelta, psu_type: 'personal',
    });
    if (!r.ok || !r.j.url) return res({ error: 'banco', status: r.status, motivo: motivoEB(r) }, 502);
    return res({ url: r.j.url });
  }
  // a la vuelta del banco: el código se cambia por la sesión y sus cuentas
  if (ruta === 'sesion') {
    const est = await leerEstado(env, datos.estado, u.uid);
    if (!est) return res({ error: 'estado' }, 400);
    const r = await eb(env, 'POST', '/sessions', { code: String(datos.code || '').slice(0, 400) });
    if (!r.ok) return res({ error: 'banco', status: r.status, motivo: motivoEB(r) }, 502);
    const cuentas = (r.j.accounts || []).map((a) => {
      const iban = String((a.account_id && (a.account_id.iban || (a.account_id.other && a.account_id.other.identification))) || '');
      return { uid: a.uid, nombre: String(a.name || a.product || a.details || '').slice(0, 60), fin: iban.slice(-4), moneda: a.currency || 'EUR' };
    }).filter((c) => idValido(c.uid));
    return res({ sesion: r.j.session_id, hasta: (r.j.access && r.j.access.valid_until) || null, banco: (r.j.aspsp && r.j.aspsp.name) || '', pais: (r.j.aspsp && r.j.aspsp.country) || '', plataforma: est.pl || '', cuentas });
  }
  // el saldo de cada cuenta
  if (ruta === 'saldos') {
    const ids = (Array.isArray(datos.cuentas) ? datos.cuentas : []).filter(idValido).slice(0, 12);
    const saldos = {}, psu = datos.presente === true ? cabecerasPsu(req) : null;
    // la sesión de cada cuenta (la app desde la 0.7d): con ella se comprueba si el permiso ha caducado de verdad
    const sesiones = datos.sesiones && typeof datos.sesiones === 'object' ? datos.sesiones : {};
    const vistas = new Map();
    let sinPsu = false;   // alguna se ha tenido que leer sin las cabeceras: esa lectura gasta del tope del banco
    await Promise.all(ids.map(async (id) => {
      const camino = `/accounts/${encodeURIComponent(id)}/balances`;
      let r = await eb(env, 'GET', camino, null, psu);
      if (psu && fallaConPsu(r)) { r = await eb(env, 'GET', camino); sinPsu = true; }
      if (!r.ok) {
        let caducada;
        if (r.status === 429 || r.status >= 500) caducada = false;
        else if (idValido(sesiones[id])) {
          const ses = sesiones[id];
          if (!vistas.has(ses)) vistas.set(ses, sesionTerminada(env, ses).catch(() => false));
          caducada = await vistas.get(ses);
        } else caducada = [401, 403, 404, 422].includes(r.status);   // una app de antes, sin la sesión: como siempre
        saldos[id] = { error: caducada ? 'caducada' : 'fallo', status: r.status, motivo: motivoEB(r) };
        return;
      }
      const b = elegirSaldo(r.j.balances);
      saldos[id] = b ? { importe: +b.balance_amount.amount, moneda: b.balance_amount.currency || 'EUR', tipo: b.balance_type || '', fecha: b.reference_date || b.last_change_date_time || null } : { error: 'sin-saldo' };
    }));
    return res({ saldos, presente: !!psu && !sinPsu });
  }
  // desconectar: se borra la sesión en Enable Banking (el permiso deja de valer)
  if (ruta === 'borrar') {
    if (!idValido(datos.sesion)) return res({ error: 'sesion' }, 400);
    const r = await eb(env, 'DELETE', `/sessions/${encodeURIComponent(datos.sesion)}`);
    return res({ ok: r.ok || r.status === 404 });
  }
  return res({ error: 'no-existe' }, 404);
}

// La actualización de precios. GitHub se salta casi todas sus tareas programadas (un día normal lanza 2 o 3 de las 48 que
// tocan), así que las lanza este Worker con su cron, que sí se cumple (los horarios están en wrangler.toml). Necesita el
// secreto PRECIOS_TOKEN: un token de grano fino solo de este repositorio con Actions en lectura y escritura, que sirve
// para lanzar Actions y nada más. Sin él, el cron no hace nada.
// el repositorio por su número, que no cambia aunque cambie su nombre (Inversiones → GrowFolio): así el Worker sigue
// lanzando las Actions el día del cambio sin tener que tocarlo
const REPO_ID = 1423240718;
const CRON_CATALOGO = '23 5 * * *';
async function lanzarAction(env, flujo) {
  // por su número y, si GitHub no lo encontrara así, por sus dos nombres
  let r = null;
  for (const base of [`repositories/${REPO_ID}`, 'repos/charly10sf/GrowFolio', 'repos/charly10sf/Inversiones']) {
    r = await fetch(`https://api.github.com/${base}/actions/workflows/${flujo}/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.PRECIOS_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'growfolio-worker', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (r.status !== 404) break;
  }
  if (r.status !== 204) console.log(`No se ha podido lanzar ${flujo}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status;
}

/* ---------- «Añadir con su ISIN»: lo que no está en el catálogo se busca en Yahoo en el momento ----------
   Devuelve su nombre, el símbolo con histórico de verdad (primero el del fondo, 0P…, y las bolsas en euros), la
   moneda y el último año de cierres, para que la app lo añada ya con precio y gráfica. Con «pedir=1» y la sesión de
   GrowFolio, además lanza el catálogo para que en unos minutos lo tengan todos (la app ya lo ha dejado pedido en
   Firestore). Lo que se encuentra se guarda 6 horas en la caché de Cloudflare: no se le pregunta a Yahoo dos veces. */
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
function isinValido(c) {
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(c)) return false;
  const d = c.slice(0, 11).split('').map((x) => (/[0-9]/.test(x) ? x : String(x.charCodeAt(0) - 55))).join('');
  let s = 0, doble = true;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (doble) { n *= 2; if (n > 9) n -= 9; } s += n; doble = !doble; }
  return (10 - (s % 10)) % 10 === +c[11];
}
// el del fondo (0P…), luego las bolsas grandes en euros, luego Londres, Suiza o Fráncfort, luego EEUU; al final las regionales alemanas
const ordenSim = (s) => (s.startsWith('0P') ? 0 : /\.(DE|AS|PA|MI|MC)$/.test(s) ? 1 : /\.(L|SW|F|VI|BR|LS|IR)$/.test(s) ? 2 : !s.includes('.') ? 3 : 4);
async function yahoo(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`yahoo ${r.status}`);
  return r.json();
}
async function buscarIsin(isin) {
  const j = await yahoo(`https://query2.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=10&newsCount=0&listsCount=0`);
  const vistos = new Map();
  for (const q of (j && j.quotes) || []) if (q && q.symbol && !vistos.has(q.symbol)) vistos.set(q.symbol, q);
  const cands = [...vistos.values()].sort((a, b) => ordenSim(a.symbol) - ordenSim(b.symbol)).slice(0, 6);
  for (const q of cands) {
    try {
      const c = await yahoo(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(q.symbol)}?range=1y&interval=1d`);
      const r = c && c.chart && c.chart.result && c.chart.result[0];
      if (!r) continue;
      const ts = r.timestamp || [], cl = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [];
      const dias = new Map();
      ts.forEach((t, k) => { const v = cl[k]; if (v != null && isFinite(v) && v > 0) dias.set(new Date(t * 1000).toISOString().slice(0, 10), +(+v).toFixed(6)); });
      const h = [...dias.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
      if (h.length < 20) continue;
      const m = r.meta || {};
      return { isin, s: q.symbol, n: String(m.longName || q.longname || m.shortName || q.shortname || '').trim().slice(0, 120), tipo: q.quoteType || m.instrumentType || '', m: m.currency || '', bolsa: q.exchDisp || q.exchange || '', h };
    } catch (e) { /* el siguiente símbolo */ }
  }
  return null;
}
let ultimoCatalogo = 0;
async function isinRuta(url, req, env, ctx, res, deFuera) {
  const c = String(url.searchParams.get('c') || '').toUpperCase().replace(/\s+/g, '');
  if (!isinValido(c)) return res({ error: 'isin' }, 400);
  const u = req.headers.get('Authorization') ? await quienEs(req, env) : null;
  if (deFuera && !u) return res({ error: 'no-permitido' }, 403);
  const cache = caches.default, clave = new Request(`https://growfolio.cache/isin/${c}`);
  let d = null;
  const hit = await cache.match(clave);
  if (hit) d = await hit.json().catch(() => null);
  if (!d) {
    let r = null, fallo = '';
    try { r = await buscarIsin(c); } catch (e) { fallo = String((e && e.message) || e).slice(0, 80); }
    d = { r, fallo };
    if (!fallo) ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${r ? 21600 : 1800}` } })));
  }
  // el catálogo se lanza como mucho una vez cada 10 minutos por instancia (y GitHub deja una sola en cola)
  if (url.searchParams.get('pedir') === '1' && u && env.PRECIOS_TOKEN && Date.now() - ultimoCatalogo > 10 * 60e3) {
    ultimoCatalogo = Date.now();
    ctx.waitUntil(lanzarAction(env, 'catalogo.yml'));
  }
  if (d.fallo) return res({ ok: false, error: 'yahoo', motivo: d.fallo }, 502);
  return res(d.r ? { ok: true, ...d.r } : { ok: false, error: 'no-esta' });
}

/* ---------- La IA (antes GrowIA) con Claude (0.7s): el Worker guarda la clave de la API de Claude y reenvía las preguntas ----------
   La clave no puede ir en la web (es estática). La app manda aquí la misma petición que mandaría a la API de Mensajes
   de Claude, con el token de Firebase de quien pregunta; el Worker comprueba quién es, la limpia y la reenvía con la
   clave. No guarda ni apunta nada de lo que pasa (ni la cartera ni las respuestas): lo devuelve tal cual, también en
   directo (stream). Lo que decide el Worker, no la app, para que nadie gaste de más:
   - 0.8.2b (todo con Claude): cualquiera con el correo verificado, en dos niveles. Los de CLAUDE_EMAILS (Carlos y los amigos
     del principio) tienen el tope alto; el resto, el reducido (menos preguntas, pocas «A fondo» con Sonnet y, entre todos
     ellos, un techo de gasto al día: CLAUDE_TECHO_REDUCIDO dólares, contados con lo que de verdad cobra Anthropic);
   - solo los modelos de CLAUDE_MODELOS, un máximo de salida y un máximo de búsquedas en internet por pregunta;
   - como mucho CLAUDE_POR_DIA preguntas al día por correo y CLAUDE_RONDAS_POR_DIA peticiones en total (una pregunta de
     la IA son varias peticiones: una por cada ronda de herramientas; la app manda un id por pregunta y solo el primero
     cuenta como pregunta; el tope de peticiones es el que impide que alguien se salte el de preguntas). El contador vive
     en un Durable Object, el mismo para todas las instancias del Worker; si falla, no se pregunta) y CLAUDE_POR_MINUTO
     por minuto (este se cuenta por instancia del Worker: solo frena rachas; el tope de verdad es el límite de gasto del
     workspace en la Console de Anthropic);
   - solo pasan los campos de la API que la app usa; el resto se quita, y solo valen las herramientas propias de la app y
     la búsqueda en internet (nada de web_fetch ni de ejecutar código) y los adjuntos en base64 (no por URL: los bajaría
     Anthropic y no contarían en el tamaño). */
const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODELOS = ['claude-haiku-5-5', 'claude-sonnet-5-5'];
const CLAUDE_CAMPOS = ['model', 'max_tokens', 'system', 'messages', 'tools', 'tool_choice', 'thinking', 'output_config', 'stream', 'temperature'];
const CLAUDE_MAX_SALIDA = 32000, CLAUDE_MAX_CUERPO = 600e3, CLAUDE_MAX_BUSQUEDAS = 5, CLAUDE_POR_MINUTO = 10, CLAUDE_POR_DIA = 20, CLAUDE_RONDAS_POR_DIA = 60;
// 0.8.2b: el nivel reducido (todo el que no está en CLAUDE_EMAILS). Cifras de Carlos (6 nov, 18:15): 5 preguntas al día para
// el resto, 20 para el nivel alto (arriba) y 4 US$ al día de techo para todo el reducido. Se cambian aquí o con la variable
// del mismo nombre en el Worker
const CLAUDE_POR_DIA_REDUCIDO = 5, CLAUDE_RONDAS_REDUCIDO = 15, CLAUDE_FONDO_REDUCIDO = 3, CLAUDE_TECHO_REDUCIDO = 4;
// revisión aparte del 6 nov: en el nivel reducido, además, un tope de gasto por correo y día (así uno solo no se lleva el
// techo de todos), menos salida y menos búsquedas por petición (para que el peor caso de cada una sea pequeño), y sin el
// doble de entrada en las rondas siguientes
// la única herramienta que se deja pasar: la búsqueda de la web en esta versión (la que usan la app y las Actions); otra versión, rechazada
const BUSQUEDA = 'web_search_20250305';
const CLAUDE_GASTO_REDUCIDO = 0.5, CLAUDE_SALIDA_REDUCIDO = 16000, CLAUDE_BUSQUEDAS_REDUCIDO = 3;
// 0.8.2d (sesión 3 de «todo con Claude»): lo que no es una pregunta del chat (la revisión de la cartera, el resumen de una
// noticia, leer capturas o un PDF al importar) va en su propio contador, para que no se coma las preguntas del día: «tarea»
// en la petición. Tareas al día y sus peticiones, por nivel (cifras confirmadas por Carlos el 6 nov, 21:00: 40 para los de
// CLAUDE_EMAILS, 10 para el resto). El gasto sigue contando en los mismos topes de dinero
const CLAUDE_TAREAS_POR_DIA = 40, CLAUDE_TAREAS_RONDAS = 120, CLAUDE_TAREAS_REDUCIDO = 10, CLAUDE_TAREAS_RONDAS_REDUCIDO = 30;
const TAREAS_CLAUDE = ['revision', 'noticia', 'importar'];
// 0.8.2d (sesión 4): una tarea tiene que ser lo que dice ser; si no, una pregunta del chat marcada a mano como «tarea» no
// gastaría preguntas. El resumen de una noticia: Haiku, sin las herramientas de la app (solo la búsqueda, 2 como mucho), un
// solo mensaje y salida corta. Importar: al menos una captura, un PDF o un archivo. La revisión de la cartera: 2 al día por
// correo, en los dos niveles (Carlos, 6 nov, 21:10: «2 al día»; cada una con Haiku cuesta 0,04-0,12 US$)
const CLAUDE_SALIDA_NOTICIA = 4096, CLAUDE_BUSQUEDAS_NOTICIA = 2, CLAUDE_REVISIONES_POR_DIA = 2;
// revisión aparte de la sesión 4: importar, con la salida de la app (16.000) en los dos niveles; una noticia, 6 peticiones
// por id como mucho (solo hacen falta para seguir tras una pausa o repetir); y en el nivel alto, que no tiene tope de dinero
// para el chat, uno de 2 US$ al día por correo para las tareas (importar no se puede comprobar por dentro: una captura
// cualquiera con una pregunta pasa; esta es la red que de verdad frena el gasto)
const CLAUDE_SALIDA_IMPORTAR = 16000, CLAUDE_RONDAS_NOTICIA = 6, CLAUDE_GASTO_TAREAS_ALTO = 2;
// la letra de cada tarea en la clave de su id: el mismo id no vale para dos tareas distintas (una noticia no se convierte
// en una revisión a mitad para saltarse su tope)
const LETRA_TAREA = { revision: 'r', noticia: 'n', importar: 'i' };
// la huella del primer mensaje de una tarea (sin las marcas de caché, que la app mueve de una ronda a otra): las rondas
// siguientes de la revisión y de la noticia tienen que seguir la misma petición, no traer otra pregunta con el mismo id
async function huellaTarea(msgs) {
  const sin = (x) => (Array.isArray(x) ? x.map(sin) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'cache_control').map(([k, v]) => [k, sin(v)])) : x);
  const h = await crypto.subtle.digest('SHA-256', te.encode(JSON.stringify(sin(msgs[0]))));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// por qué esta petición no es la tarea que dice ser (null si lo es)
function tareaMal(tipo, cuerpo, modelo) {
  if (tipo === 'revision') return null;
  const msgs = cuerpo.messages;
  // un solo mensaje del usuario, el primero; detrás, solo lo que ya ha escrito Claude (si una búsqueda se alarga, la
  // respuesta llega con pause_turn y la app la devuelve tal cual para que siga)
  if (!msgs[0] || msgs[0].role !== 'user' || msgs.slice(1).some((m) => !m || m.role !== 'assistant')) return 'mensajes';
  // sin las herramientas de la app: ni ofrecidas ni usadas antes
  if ((cuerpo.tools || []).some((h) => String(h.type || '') !== BUSQUEDA) || cuerpo.tool_choice !== undefined) return 'tools';
  if (contarBloques(msgs, 'tool_use') || contarBloques(msgs, 'tool_result')) return 'tools';
  const adjuntos = contarBloques(msgs, 'image') + contarBloques(msgs, 'document');
  if (tipo === 'noticia') {
    if (modelo !== 'claude-haiku-5-5') return 'modelo';
    return adjuntos ? 'adjuntos' : null;
  }
  // importar: sin búsqueda, y con algo que leer (una captura, un PDF o un archivo que la app ha pasado a texto, «Archivo «…»»)
  if (cuerpo.tools && cuerpo.tools.length) return 'tools';
  const primero = msgs[0].content, archivo = Array.isArray(primero) && primero.some((b) => b && b.type === 'text' && /^Archivo «/.test(String(b.text || '')));
  return adjuntos || archivo ? null : 'adjuntos';
}
const MODELO_FONDO = 'claude-sonnet-5-5';
// el precio de Anthropic por millón de tokens (entrada, salida, leer caché, escribir caché), el mismo que usa la app
// (MODELOS_CLAUDE en 55-asesor-contexto.js); Haiku cobra más cuando una petición pasa de 100.000 tokens de entrada.
// La búsqueda en internet, 1 céntimo cada una
const PRECIOS_CLAUDE = { 'claude-haiku-5-5': [0.10, 0.50, 0.01, 0.125], 'claude-sonnet-5-5': [2, 10, 0.10, 2.5] }, PRECIO_HAIKU_GRANDE = [0.5, 2.5, 0.05, 0.625];
// lo que se aparta del techo mientras la respuesta llega: lo MÁS que puede costar esa petición (toda la entrada al precio de
// escribir caché, toda la salida permitida y cada búsqueda con lo que trae, unos 8.000 tokens). Al acabar se cambia por lo
// que ha costado de verdad; si no se sabe (la respuesta se cortó), se queda lo apartado. Así, por muchas que vayan a la vez,
// el techo no se pasa
const TOKENS_POR_BUSQUEDA = 8000;
function reservaMax(modelo, entrada, salida, busquedas) {
  const p = PRECIOS_CLAUDE[modelo]; if (!p) return Infinity;
  const ent = entrada + busquedas * TOKENS_POR_BUSQUEDA;
  const [pi, po, , pe] = modelo === 'claude-haiku-5-5' && ent > 1e5 ? PRECIO_HAIKU_GRANDE : p;
  return Math.ceil(((ent * Math.max(pi, pe) + salida * po) / 1e6 + busquedas * 0.01) * 1e6) / 1e6;
}
// el correo con el que se cuentan los topes: sin la «+etiqueta» y, en Gmail, sin puntos (nombre+1@gmail.com y
// n.ombre@gmail.com son el mismo buzón: no valen para tener más preguntas)
function claveCorreo(email) {
  const e = String(email || '').toLowerCase(), i = e.lastIndexOf('@');
  if (i < 1) return e;
  let local = e.slice(0, i).split('+')[0], dom = e.slice(i + 1);
  if (dom === 'googlemail.com') dom = 'gmail.com';
  if (dom === 'gmail.com') local = local.replace(/\./g, '');
  return `${local || e.slice(0, i)}@${dom}`;
}
// el caché de una hora cobra el doble: aquí solo vale el de cinco minutos (el de la app)
function sinTtl(x) {
  if (Array.isArray(x)) return x.map(sinTtl);
  if (!x || typeof x !== 'object') return x;
  const o = {};
  for (const [k, v] of Object.entries(x)) o[k] = k === 'cache_control' && v && typeof v === 'object' ? { type: 'ephemeral' } : sinTtl(v);
  return o;
}
// el nombre del contador del techo: con un espacio delante no puede ser un correo
const NOMBRE_TECHO = ' techo-reducido';
// 0.9 (auditoría del 4 nov): el tamaño en caracteres no frena el gasto (un PDF comprimido trae cientos de páginas). Tope de
// tokens de entrada, contados gratis con /v1/messages/count_tokens solo cuando la petición es grande o lleva adjuntos, y
// tope de adjuntos por petición
const CLAUDE_MAX_ENTRADA = 120000, CLAUDE_MAX_PDF = 2, CLAUDE_MAX_IMAGENES = 12, CLAUDE_CONTAR_DESDE = 120e3, CLAUDE_RONDAS_POR_PREGUNTA = 16;
// las reglas de uso, puestas por el Worker y no por la app: quien llame a /claude con su propio «system» no se las salta
// 0.8: «GrowIA» pasa a «la IA de Toisón», como en la app (NOTA_CLAUDE de 55-asesor-contexto.js)
const CLAUDE_NOTA = 'La IA de Toisón es una IA (funciona con Claude, de Anthropic) y debe decirlo si se lo preguntan. No da asesoramiento personalizado de inversión ni de impuestos: no dice a nadie que compre, venda o mantenga un valor concreto, ni cuánto meter ni a qué precio. Explica, compara y calcula; las decisiones son de cada persona.';
const rafagas = new Map();
const puedeClaude = (u) => !!u && u.verificado && !!u.email;
// 0.8.2b: el tope alto, para los de CLAUDE_EMAILS; el resto, el reducido
const nivelClaude = (u, env) => (lista(env.CLAUDE_EMAILS).includes(u.email) ? 'alto' : 'reducido');
const numEnv = (v, d) => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? n : d; };
function topesClaude(nivel, env) {
  if (nivel === 'alto') return { dia: numEnv(env.CLAUDE_POR_DIA, CLAUDE_POR_DIA), rondas: numEnv(env.CLAUDE_RONDAS_POR_DIA, CLAUDE_RONDAS_POR_DIA), fondo: null, techo: null, tareas: numEnv(env.CLAUDE_TAREAS_POR_DIA, CLAUDE_TAREAS_POR_DIA), rondasTareas: numEnv(env.CLAUDE_TAREAS_RONDAS, CLAUDE_TAREAS_RONDAS) };
  return { dia: numEnv(env.CLAUDE_POR_DIA_REDUCIDO, CLAUDE_POR_DIA_REDUCIDO), rondas: numEnv(env.CLAUDE_RONDAS_REDUCIDO, CLAUDE_RONDAS_REDUCIDO), fondo: numEnv(env.CLAUDE_FONDO_REDUCIDO, CLAUDE_FONDO_REDUCIDO), techo: numEnv(env.CLAUDE_TECHO_REDUCIDO, CLAUDE_TECHO_REDUCIDO), tareas: numEnv(env.CLAUDE_TAREAS_REDUCIDO, CLAUDE_TAREAS_REDUCIDO), rondasTareas: numEnv(env.CLAUDE_TAREAS_RONDAS_REDUCIDO, CLAUDE_TAREAS_RONDAS_REDUCIDO) };
}
// lo que ha costado una petición, en dólares, con su «usage»
function costeUso(modelo, uso) {
  const p = PRECIOS_CLAUDE[modelo]; if (!p || !uso) return 0;
  const n = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);
  const ent = n(uso.input_tokens), cr = n(uso.cache_read_input_tokens), cw = n(uso.cache_creation_input_tokens), sal = n(uso.output_tokens);
  const [pi, po, pl, pe] = modelo === 'claude-haiku-5-5' && ent + cr + cw > 1e5 ? PRECIO_HAIKU_GRANDE : p;
  return (ent * pi + sal * po + cr * pl + cw * pe) / 1e6 + n(uso.server_tool_use && uso.server_tool_use.web_search_requests) * 0.01;
}
// el «usage» de una respuesta: en directo, el de message_start más el de los message_delta; si no, el del JSON. Si se corta
// a mitad, lo que haya llegado
async function leerUso(cuerpo, enDirecto) {
  let uso = {}, completo = false;
  try {
    if (!enDirecto) { const j = JSON.parse(await new Response(cuerpo).text()); return { uso: (j && j.usage) || {}, completo: !!(j && j.usage) }; }
    const lector = cuerpo.getReader(), dec = new TextDecoder();
    let buf = '';
    const linea = (l) => {
      if (!l.startsWith('data:')) return;
      let ev; try { ev = JSON.parse(l.slice(5).trim()); } catch (e) { return; }
      if (ev && ev.type === 'message_start' && ev.message && ev.message.usage) uso = { ...uso, ...ev.message.usage };
      else if (ev && ev.type === 'message_delta' && ev.usage) uso = { ...uso, ...ev.usage };
      else if (ev && ev.type === 'message_stop') completo = true;
    };
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let k;
      while ((k = buf.indexOf('\n')) >= 0) { linea(buf.slice(0, k).replace(/\r$/, '')); buf = buf.slice(k + 1); }
    }
    linea(buf);
  } catch (e) { /* cortada: lo que haya */ }
  return { uso, completo };
}
// un contador de gasto: el techo del nivel reducido (un solo Durable Object para todos) o el de un correo (en su objeto)
async function techo(env, op, datos, nombre = NOMBRE_TECHO) {
  const rc = await env.CUOTAS.get(env.CUOTAS.idFromName(nombre)).fetch('https://cuotas.interno/techo', { method: 'POST', body: JSON.stringify({ op, ...datos }) });
  return rc.json();
}
// un adjunto que no va dentro de la petición (una URL, un archivo ya subido) lo baja Anthropic: no lo dejamos pasar
function adjuntoFuera(x) {
  if (Array.isArray(x)) return x.some(adjuntoFuera);
  if (!x || typeof x !== 'object') return false;
  if (x.source && typeof x.source === 'object' && !['base64', 'text'].includes(x.source.type)) return true;
  return adjuntoFuera(x.content);
}
// cuántos adjuntos de un tipo lleva la petición (en los mensajes, a cualquier profundidad)
function contarBloques(x, tipo) {
  if (Array.isArray(x)) return x.reduce((t, y) => t + contarBloques(y, tipo), 0);
  if (!x || typeof x !== 'object') return 0;
  return (x.type === tipo ? 1 : 0) + contarBloques(x.content, tipo);
}
// el contador de cada correo (día UTC): n, las preguntas que lleva hoy (peticiones «primera»), r, todas las peticiones,
// rondas de herramientas incluidas, y f, las preguntas «A fondo» (Sonnet; solo cuentan en el nivel reducido). Un Durable
// Object por correo, con su almacén propio. 0.8.2b: el mismo tipo de objeto lleva, con otro nombre, el techo de gasto del
// día del nivel reducido (op «techo»). 0.8.2d: t y rt, las tareas (revisión, noticia, importar) y sus peticiones, aparte;
// rv, las revisiones de la cartera (sesión 4)
export class Cuotas {
  constructor(estado) { this.estado = estado; }
  async fetch(req) {
    const datos = await req.json();
    if (datos.op === 'limite' || datos.op === 'una' || datos.op === 'desmarcar') return new Response(JSON.stringify(await this.correo(datos)));
    if (datos.op) return new Response(JSON.stringify(await this.techo(datos)));
    const { dia, tope, topeRondas, primera: primeraApp = true, pregunta = null, topePregunta = 16, fondo = false, topeFondo = null, tarea = false, topeTareas = 0, topeRondasTareas = 0, revision = false, topeRevisiones = 0, letra = '', huella = null } = datos;
    let c = (await this.estado.storage.get('c')) || { dia, n: 0, r: 0 };
    if (c.dia !== dia) c = { dia, n: 0, r: 0 };
    c.r = c.r || 0; c.f = c.f || 0; c.t = c.t || 0; c.rt = c.rt || 0; c.rv = c.rv || 0; c.ids = c.ids || {}; c.fi = c.fi || {}; c.hu = c.hu || {};
    // con id de pregunta (0.9): un id nuevo gasta pregunta; uno conocido, no, pero con su tope de peticiones. Sin id, lo de
    // antes: manda «ronda»
    // las claves llevan delante «p»: un id como «constructor» no puede leer nada heredado de Object
    // 0.8.2d: una tarea lleva «t» delante: su id no se cruza con el de una pregunta
    // sesión 4: y la letra de su tipo (tr…, tn…, ti…): el mismo id no sirve para dos tareas distintas
    const k = pregunta ? (tarea ? 't' + letra : 'p') + pregunta : null, conocida = !!k && Object.prototype.hasOwnProperty.call(c.ids, k), previas = conocida ? Number(c.ids[k]) || 0 : 0;
    const primera = pregunta ? !conocida : primeraApp;
    // 0.8.2b: una pregunta «A fondo» gasta una de las suyas la primera vez que su id va con Sonnet (sin id, cada petición:
    // así no se puede empezar con Haiku y seguir con Sonnet sin gastarla)
    const usaFondo = !!fondo && topeFondo != null && (k ? !Object.prototype.hasOwnProperty.call(c.fi, k) : true);
    // 0.8.2: con el motivo, para que la app no diga «sin preguntas hasta mañana» cuando solo se ha agotado una pregunta
    // una tarea no gasta preguntas ni peticiones del chat: las suyas (sin tope de tareas, ninguna)
    // 0.8.2d (sesión 4): y una revisión de la cartera nueva, como mucho topeRevisiones al día (rv)
    const motivo = tarea ? (primera && c.t >= topeTareas ? 'tareas' : c.rt >= topeRondasTareas ? 'tareas' : revision && primera && c.rv >= topeRevisiones ? 'revisiones' : conocida && previas >= topePregunta ? 'pregunta' : usaFondo && c.f >= topeFondo ? 'fondo' : null)
      : primera && c.n >= tope ? 'dia' : topeRondas && c.r >= topeRondas ? 'rondas' : conocida && previas >= topePregunta ? 'pregunta' : usaFondo && c.f >= topeFondo ? 'fondo' : null;
    if (motivo) return new Response(JSON.stringify({ ok: false, n: c.n, r: c.r, f: c.f, t: c.t, rt: c.rt, rv: c.rv, motivo }));
    // sesión 4: las rondas siguientes de una tarea con huella (revisión, noticia) siguen su primera petición
    if (k && huella) {
      if (conocida && Object.prototype.hasOwnProperty.call(c.hu, k) && c.hu[k] !== huella) return new Response(JSON.stringify({ ok: false, n: c.n, r: c.r, t: c.t, rt: c.rt, rv: c.rv, motivo: 'huella' }));
      c.hu[k] = huella;
    }
    if (primera) { if (tarea) c.t += 1; else c.n += 1; if (revision) c.rv += 1; }
    if (k) c.ids[k] = previas + 1;
    if (usaFondo) { c.f += 1; if (k) c.fi[k] = 1; }
    if (tarea) c.rt += 1; else c.r += 1;
    await this.estado.storage.put('c', c);
    return new Response(JSON.stringify({ ok: true, n: c.n, r: c.r, f: c.f, t: c.t, rt: c.rt, rv: c.rv }));
  }
  // 0.8.3 · los topes de los correos (src/correo.js). «limite»: cabe si en cada ventana [ms, cuántos] hay menos de «cuántos»
  // envíos; si cabe, lo apunta. «una»: la primera vez sí y luego no (la bienvenida); «desmarcar» la deja otra vez libre
  async correo({ op, ventanas = [], ahora = Date.now() }) {
    if (op === 'una') { if (await this.estado.storage.get('u')) return { ok: false }; await this.estado.storage.put('u', 1); return { ok: true }; }
    if (op === 'desmarcar') { await this.estado.storage.delete('u'); return { ok: true }; }
    const vs = (Array.isArray(ventanas) ? ventanas : []).map(([ms, n]) => [Number(ms) || 0, Number(n) || 0]).filter(([ms, n]) => ms > 0 && n > 0);
    const largo = Math.max(0, ...vs.map(([ms]) => ms));
    let l = ((await this.estado.storage.get('l')) || []).filter((t) => ahora - t < largo);
    let espera = 0;
    for (const [ms, n] of vs) {
      const dentro = l.filter((t) => ahora - t < ms);
      if (dentro.length >= n) espera = Math.max(espera, Math.ceil((dentro[dentro.length - n] + ms - ahora) / 1000));
    }
    if (espera > 0) { await this.estado.storage.put('l', l); return { ok: false, espera }; }
    l.push(ahora); if (l.length > 200) l = l.slice(-200);
    await this.estado.storage.put('l', l);
    // pasada la ventana más larga, el objeto se borra solo (si no, cada IP o correo dejaría su contador para siempre)
    if (this.estado.storage.setAlarm) await this.estado.storage.setAlarm(ahora + largo + 60e3);
    return { ok: true };
  }
  async alarm() {
    const l = (await this.estado.storage.get('l')) || [];
    if (!(await this.estado.storage.get('u')) && !(await this.estado.storage.get('c')) && !(await this.estado.storage.get('t')) && !l.some((t) => Date.now() - t < 2 * 864e5)) await this.estado.storage.deleteAll();
  }
  // el techo: g, lo gastado hoy (lo que han costado de verdad las respuestas acabadas), y p, lo apartado para las que
  // aún llegan. «reservar» aparta (si cabe); «cerrar» cambia lo apartado por lo que ha costado (0 si no llegó a Claude)
  async techo({ op, dia, techo: tope = 0, reserva = 0, coste = 0 }) {
    let t = (await this.estado.storage.get('t')) || { dia, g: 0, p: 0 };
    // el cierre de una petición de ayer (acabó pasada la medianoche) no toca el día de hoy; solo un día más nuevo empieza de cero
    if (op === 'cerrar' && t.dia !== dia) return { ok: true, g: t.g, p: t.p };
    if (t.dia < dia) t = { dia, g: 0, p: 0 };
    const r6 = (x) => Math.round(x * 1e6) / 1e6, num = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);
    if (op === 'reservar') {
      if (t.g + t.p + num(reserva) > tope) return { ok: false, g: t.g, p: t.p };
      t.p = r6(t.p + num(reserva));
    } else if (op === 'cerrar') {
      t.p = r6(Math.max(0, t.p - num(reserva)));
      t.g = r6(t.g + num(coste));
    }
    if (op === 'reservar' || op === 'cerrar') await this.estado.storage.put('t', t);
    return { ok: true, g: t.g, p: t.p, dia: t.dia };
  }
}

async function claude(req, env, cors, res, ctx) {
  if (req.method !== 'POST') return res({ error: 'metodo' }, 405);
  if (!env.ANTHROPIC_API_KEY) return res({ error: 'sin-clave' }, 503);
  const u = await quienEs(req, env);
  if (!u) return res({ error: 'sin-sesion' }, 401);
  // 0.8.2b: cualquiera con el correo verificado; sin verificar, no (cualquiera podría abrir cuentas con correos inventados)
  if (!puedeClaude(u)) return res({ error: 'no-permitido', motivo: 'verificar' }, 403);
  const nivel = nivelClaude(u, env), topes = topesClaude(nivel, env), reducido = nivel === 'reducido';
  // los límites se cuentan por correo, no por uid: una misma persona podría tener varias cuentas con el mismo correo (0.8.2b:
  // y con el correo sin «+etiqueta» ni puntos de Gmail)
  const correo = claveCorreo(u.email);
  const ahora = Date.now(), tope = Number(env.CLAUDE_POR_MINUTO) || CLAUDE_POR_MINUTO;
  const recientes = (rafagas.get(correo) || []).filter((t) => ahora - t < 60e3);
  if (recientes.length >= tope) return res({ error: 'demasiadas' }, 429);
  recientes.push(ahora);
  if (rafagas.size > 500) for (const [k, v] of rafagas) if (!v.some((t) => ahora - t < 60e3)) rafagas.delete(k);
  rafagas.set(correo, recientes);
  const texto = await req.text();
  if (texto.length > CLAUDE_MAX_CUERPO) return res({ error: 'grande' }, 413);
  let c;
  try { c = JSON.parse(texto); } catch (e) { return res({ error: 'json' }, 400); }
  if (!c || typeof c !== 'object' || Array.isArray(c)) return res({ error: 'json' }, 400);
  const modelos = lista(env.CLAUDE_MODELOS).length ? lista(env.CLAUDE_MODELOS) : CLAUDE_MODELOS;
  if (!modelos.includes(String(c.model || '').toLowerCase())) return res({ error: 'peticion', motivo: 'modelo' }, 400);
  // revisión aparte de la sesión 4: el que se comprueba es el que se manda
  c.model = String(c.model).toLowerCase();
  // 0.8.2b: en el nivel reducido, solo los modelos con precio conocido (sin él, el techo no sabría contarlos)
  if (reducido && !PRECIOS_CLAUDE[String(c.model).toLowerCase()]) return res({ error: 'peticion', motivo: 'modelo' }, 400);
  const maxSalida = Number(env.CLAUDE_MAX_SALIDA) || CLAUDE_MAX_SALIDA;
  if (!Number.isInteger(c.max_tokens) || c.max_tokens < 1 || c.max_tokens > maxSalida) return res({ error: 'peticion', motivo: 'max_tokens' }, 400);
  if (!Array.isArray(c.messages) || !c.messages.length) return res({ error: 'peticion', motivo: 'messages' }, 400);
  const cuerpo = {};
  for (const k of CLAUDE_CAMPOS) if (c[k] !== undefined) cuerpo[k] = sinTtl(c[k]);
  // en el reducido, la salida se recorta (no se rechaza: la app pide de más por si acaso)
  if (reducido) cuerpo.max_tokens = Math.min(cuerpo.max_tokens, numEnv(env.CLAUDE_SALIDA_REDUCIDO, CLAUDE_SALIDA_REDUCIDO));
  const maxBusquedas = reducido ? Math.min(Number(env.CLAUDE_MAX_BUSQUEDAS) || CLAUDE_MAX_BUSQUEDAS, numEnv(env.CLAUDE_BUSQUEDAS_REDUCIDO, CLAUDE_BUSQUEDAS_REDUCIDO)) : Number(env.CLAUDE_MAX_BUSQUEDAS) || CLAUDE_MAX_BUSQUEDAS;
  let busquedas = 0;
  if (cuerpo.tools !== undefined) {
    // solo herramientas propias de la app (sin type, o «custom») y una búsqueda en internet, con su tope de usos
    if (!Array.isArray(cuerpo.tools) || cuerpo.tools.some((h) => !h || typeof h !== 'object' || (h.type && h.type !== 'custom' && String(h.type) !== BUSQUEDA))) return res({ error: 'peticion', motivo: 'tools' }, 400);
    if (cuerpo.tools.filter((h) => String(h.type || '') === BUSQUEDA).length > 1) return res({ error: 'peticion', motivo: 'tools' }, 400);
    cuerpo.tools = cuerpo.tools.map((h) => (String(h.type || '') === BUSQUEDA ? { ...h, max_uses: Math.max(1, Math.min(Number(h.max_uses) || maxBusquedas, maxBusquedas)) } : h));
    busquedas = cuerpo.tools.reduce((t, h) => t + (String(h.type || '') === BUSQUEDA ? h.max_uses : 0), 0);
  }
  if (adjuntoFuera(cuerpo.messages) || adjuntoFuera(cuerpo.system)) return res({ error: 'peticion', motivo: 'adjunto' }, 400);
  const pdfs = contarBloques(cuerpo.messages, 'document'), imgs = contarBloques(cuerpo.messages, 'image');
  if (pdfs > (Number(env.CLAUDE_MAX_PDF) || CLAUDE_MAX_PDF) || imgs > (Number(env.CLAUDE_MAX_IMAGENES) || CLAUDE_MAX_IMAGENES)) return res({ error: 'peticion', motivo: 'adjuntos' }, 400);
  if (cuerpo.system !== undefined && typeof cuerpo.system !== 'string' && !Array.isArray(cuerpo.system)) return res({ error: 'peticion', motivo: 'system' }, 400);
  cuerpo.system = [{ type: 'text', text: CLAUDE_NOTA }, ...(typeof cuerpo.system === 'string' ? (cuerpo.system ? [{ type: 'text', text: cuerpo.system }] : []) : cuerpo.system || [])];
  const idPreg = typeof c.pregunta === 'string' && /^[a-z0-9]{8,64}$/i.test(c.pregunta) ? c.pregunta : null;
  // 0.8.2d: una tarea (revisión, noticia, importar) va con su contador; cualquier otro valor, como una pregunta. Una tarea
  // tiene que llevar su id (la app siempre lo manda): sin él no se sabría cuándo empieza una nueva y no contaría
  const tarea = TAREAS_CLAUDE.includes(c.tarea), revision = c.tarea === 'revision';
  if (tarea && !idPreg) return res({ error: 'peticion', motivo: 'pregunta' }, 400);
  // 0.8.2d (sesión 4): y que sea lo que dice ser (antes de contar tokens y de apartar nada: lo rechazado no gasta)
  if (tarea) {
    const mal = tareaMal(c.tarea, cuerpo, String(cuerpo.model).toLowerCase());
    if (mal) return res({ error: 'peticion', motivo: mal }, 400);
  }
  if (c.tarea === 'importar') cuerpo.max_tokens = Math.min(cuerpo.max_tokens, numEnv(env.CLAUDE_SALIDA_IMPORTAR, CLAUDE_SALIDA_IMPORTAR));
  const huella = c.tarea === 'revision' || c.tarea === 'noticia' ? await huellaTarea(cuerpo.messages) : null;
  // la noticia, con la salida corta y 2 búsquedas como mucho (se recorta, no se rechaza, como en el nivel reducido)
  if (c.tarea === 'noticia') {
    cuerpo.max_tokens = Math.min(cuerpo.max_tokens, numEnv(env.CLAUDE_SALIDA_NOTICIA, CLAUDE_SALIDA_NOTICIA));
    if (cuerpo.tools) {
      const tope = Math.max(1, numEnv(env.CLAUDE_BUSQUEDAS_NOTICIA, CLAUDE_BUSQUEDAS_NOTICIA));
      cuerpo.tools = cuerpo.tools.map((h) => ({ ...h, max_uses: Math.min(h.max_uses, tope) }));
      busquedas = cuerpo.tools.reduce((t, h) => t + h.max_uses, 0);
    }
  }
  // los tokens de entrada, solo si es grande o lleva adjuntos (contar es gratis pero añade una vuelta). Si el conteo falla,
  // se sigue: siguen valiendo el tope del día y el límite de gasto del workspace
  // por bytes, no por caracteres: los tokens nunca pasan de los bytes, así que por debajo del umbral no hace falta contar
  const bytes = te.encode(texto).length;
  let entrada = bytes;
  if (bytes > (Number(env.CLAUDE_CONTAR_DESDE) || CLAUDE_CONTAR_DESDE) || pdfs || imgs) {
    let n = null;
    try {
      const { model, system, messages, tools, tool_choice, thinking } = cuerpo;
      const rc = await fetch(`${env.CLAUDE_API || CLAUDE_API}/count_tokens`, { method: 'POST', signal: req.signal, headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, system, messages, ...(tools ? { tools } : {}), ...(tool_choice ? { tool_choice } : {}), ...(thinking ? { thinking } : {}) }) });
      const jc = rc.ok ? await rc.json() : null;
      if (jc && Number.isFinite(jc.input_tokens) && jc.input_tokens >= 0) n = jc.input_tokens;
    } catch (e) { /* sin conteo */ }
    // las rondas siguientes de una pregunta crecen con lo que ha buscado: el doble de margen para no cortar a mitad
    // (solo si de verdad sigue a Claude: el último mensaje es suyo o lleva los resultados de sus herramientas)
    const ult = cuerpo.messages[cuerpo.messages.length - 1] || {}, sigue = ult.role === 'assistant' || (Array.isArray(ult.content) && ult.content.some((b) => b && b.type === 'tool_result'));
    // 0.8.2b: en el reducido, sin el doble
    const tope = (Number(env.CLAUDE_MAX_ENTRADA) || CLAUDE_MAX_ENTRADA) * (!reducido && Number.isInteger(c.ronda) && c.ronda > 1 && sigue ? 2 : 1);
    if (n != null && n > tope) return res({ error: 'grande', tokens: n }, 413);
    // con un PDF, sin conteo no se pasa (es justo lo que puede salir caro); con texto o imágenes, sí. 0.8.2b: en el reducido,
    // sin conteo no se pasa nunca
    if (n == null && (pdfs || reducido)) return res({ error: 'cuenta' }, 503);
    if (n != null) entrada = n;
  }
  // el tope del día, al final de las comprobaciones de la petición: lo que se rechaza arriba no gasta pregunta
  // 0.8.2: las que le quedan hoy van en la respuesta (X-Quedan) para que la app lo diga; 0.8.2b, también las «A fondo»
  // que le quedan (X-Quedan-Fondo, solo en el nivel reducido) y el nivel (X-Nivel)
  // al acabar, lo apartado se cambia por lo que ha costado de verdad (sin esperar: la respuesta ya ha salido)
  let quedan = null, quedanFondo = null, quedanTareas = null, quedanRevisiones = null, reserva = 0, cerrarTecho = () => null;
  const dia = new Date(ahora).toISOString().slice(0, 10), modelo = String(cuerpo.model).toLowerCase();
  {
    // sin el contador no hay tope diario: no se pregunta
    if (!env.CUOTAS) return res({ error: 'cuotas' }, 503);
    // 0.8.2b: en el reducido, antes del contador de preguntas (si no cabe, no gasta pregunta), se aparta lo más que puede
    // costar la petición en el tope de gasto de su correo y en el techo de todos. Si lo que no cabe es una «A fondo» en el
    // tope de su correo, se dice como «sin A fondo» (la app la repite con Haiku, que cuesta mucho menos)
    // cada apartado, con el día en que quedó (revisión aparte de la sesión 4: si la petición llega justo al cambiar de día y
    // el contador ya va por el siguiente, se suelta en ese)
    const apartados = [];
    const soltar = () => Promise.all(apartados.map(([x, d]) => techo(env, 'cerrar', { dia: d, reserva, coste: 0 }, x).catch(() => {})));
    // 0.8.2d: una tarea que no cabe en el tope de su correo se dice como «sin tareas» (no como «sin preguntas»: una pregunta
    // corta aún puede caber, y la app apartaría la IA hasta mañana); en el reducido, si era con Sonnet, «sin A fondo» (la app
    // la repite con Haiku, que cuesta mucho menos)
    const limites = topes.techo != null
      ? [[correo, numEnv(env.CLAUDE_GASTO_REDUCIDO, CLAUDE_GASTO_REDUCIDO), modelo === MODELO_FONDO ? 'tope-fondo' : tarea ? 'tope-tareas' : 'tope-diario'], [NOMBRE_TECHO, topes.techo, 'techo']]
      : tarea ? [[correo, numEnv(env.CLAUDE_GASTO_TAREAS_ALTO, CLAUDE_GASTO_TAREAS_ALTO), 'tope-tareas']] : [];
    if (limites.length) {
      reserva = reservaMax(modelo, entrada, cuerpo.max_tokens, busquedas);
      for (const [nombre, tp, err] of limites) {
        let t;
        try { t = await techo(env, 'reservar', { dia, techo: tp, reserva }, nombre); } catch (e) { await soltar(); return res({ error: 'cuotas' }, 503); }
        if (!t || !t.ok) { await soltar(); return res({ error: err }, 429); }
        apartados.push([nombre, t.dia || dia]);
      }
    }
    let q;
    try {
      // «ronda»: 1 (o sin ponerla) es una pregunta nueva; 2 o más, otra ronda de herramientas de la misma pregunta
      // 0.9: la app manda «pregunta», un id igual en todas las rondas y reintentos de una pregunta; el contador gasta una
      // pregunta por id nuevo. Las apps de antes (sin id) siguen con «ronda», limitadas por el tope de peticiones
      const primera = !(Number.isInteger(c.ronda) && c.ronda > 1);
      const rc = await env.CUOTAS.get(env.CUOTAS.idFromName(correo)).fetch('https://cuotas.interno/', { method: 'POST', body: JSON.stringify({ dia, tope: topes.dia, topeRondas: topes.rondas, primera, pregunta: idPreg, topePregunta: c.tarea === 'noticia' ? numEnv(env.CLAUDE_RONDAS_NOTICIA, CLAUDE_RONDAS_NOTICIA) : Number(env.CLAUDE_RONDAS_POR_PREGUNTA) || CLAUDE_RONDAS_POR_PREGUNTA, fondo: modelo === MODELO_FONDO, topeFondo: topes.fondo, tarea, topeTareas: topes.tareas, topeRondasTareas: topes.rondasTareas, revision, topeRevisiones: numEnv(env.CLAUDE_REVISIONES_POR_DIA, CLAUDE_REVISIONES_POR_DIA), letra: tarea ? LETRA_TAREA[c.tarea] : '', huella }) });
      q = await rc.json();
    } catch (e) { await soltar(); return res({ error: 'cuotas' }, 503); }
    if (q && q.motivo === 'huella') { await soltar(); return res({ error: 'peticion', motivo: 'tarea' }, 400); }
    if (!q || !q.ok) { await soltar(); return res({ error: q && q.motivo === 'pregunta' ? 'tope-pregunta' : q && q.motivo === 'fondo' ? 'tope-fondo' : q && q.motivo === 'tareas' ? 'tope-tareas' : q && q.motivo === 'revisiones' ? 'tope-revision' : 'tope-diario' }, 429); }
    // cada pregunta gasta al menos una petición: no quedan más preguntas que peticiones (auditoría del 5 nov)
    quedan = Math.max(0, Math.min(topes.dia - (Number(q.n) || 0), topes.rondas - (Number(q.r) || 0)));
    if (topes.fondo != null) quedanFondo = Math.max(0, Math.min(topes.fondo - (Number(q.f) || 0), quedan));
    if (tarea) quedanTareas = Math.max(0, Math.min(topes.tareas - (Number(q.t) || 0), topes.rondasTareas - (Number(q.rt) || 0)));
    if (revision) quedanRevisiones = Math.max(0, Math.min(numEnv(env.CLAUDE_REVISIONES_POR_DIA, CLAUDE_REVISIONES_POR_DIA) - (Number(q.rv) || 0), quedanTareas));
    cerrarTecho = (coste) => { const p = Promise.all(apartados.map(([x, d]) => techo(env, 'cerrar', { dia: d, reserva, coste }, x).catch(() => {}))); if (ctx && ctx.waitUntil) ctx.waitUntil(p); return p; };
  }
  let r;
  try {
    r = await fetch(env.CLAUDE_API || CLAUDE_API, {
      method: 'POST', signal: req.signal,
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  } catch (e) {
    cerrarTecho(0);
    return res({ error: 'sin-conexion', motivo: String((e && e.message) || e).slice(0, 120) }, 502);
  }
  if (r.ok) {
    let cuerpoApp = r.body;
    // en el nivel reducido, una copia de la respuesta se lee aquí para saber cuánto ha costado
    if (reserva && r.body) {
      const [a, b] = r.body.tee(), enDirecto = /event-stream/i.test(r.headers.get('content-type') || '') || cuerpo.stream === true;
      cuerpoApp = a;
      // si no se ha visto el final (se cortó, o la app la paró), no se sabe lo que ha cobrado Anthropic: se queda lo apartado
      const p = leerUso(b, enDirecto).then(({ uso, completo }) => cerrarTecho(completo ? costeUso(modelo, uso) : reserva));
      if (ctx && ctx.waitUntil) ctx.waitUntil(p);
    } else cerrarTecho(0);
    const extra = { 'X-Nivel': nivel, ...(quedan != null ? { 'X-Quedan': String(quedan) } : {}), ...(quedanFondo != null ? { 'X-Quedan-Fondo': String(quedanFondo) } : {}), ...(quedanTareas != null ? { 'X-Quedan-Tareas': String(quedanTareas) } : {}), ...(quedanRevisiones != null ? { 'X-Quedan-Revisiones': String(quedanRevisiones) } : {}) };
    return new Response(cuerpoApp, { status: r.status, headers: { ...cors, 'Content-Type': r.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', ...extra, 'Access-Control-Expose-Headers': Object.keys(extra).join(', ') } });
  }
  // lo que no ha llegado a contestar Claude no gasta del techo
  cerrarTecho(0);
  // un fallo de Claude: la app lo necesita claro para decirlo (y, si era Sonnet, probar con Haiku)
  const fallo = await r.json().catch(() => ({})), e = (fallo && fallo.error) || {}, msg = String(e.message || '');
  // sin saldo, o tope de gasto del workspace alcanzado (según el caso llega como 400 o como 429): hasta que se renueve, nada
  if ((r.status === 400 || r.status === 429) && /credit balance|usage limits?|spend(ing)? limit/i.test(msg)) return res({ error: 'sin-creditos' }, 402);
  if (r.status === 401 || r.status === 403) return res({ error: 'clave', estado: r.status }, 502);
  return res({ error: 'claude', estado: r.status, tipo: String(e.type || ''), motivo: msg.slice(0, 200) }, r.status >= 500 ? 502 : r.status);
}

export default {
  async scheduled(ev, env, ctx) {
    if (!env.PRECIOS_TOKEN) return;
    ctx.waitUntil(lanzarAction(env, ev.cron === CRON_CATALOGO ? 'catalogo.yml' : 'precios.yml'));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origen = req.headers.get('Origin') || '';
    const origenes = [...ORIGENES, ...String(env.ORIGENES_EXTRA || '').split(',').map((x) => x.trim()).filter(Boolean)];
    const cors = { 'Access-Control-Allow-Origin': origenes.includes(origen) ? origen : ORIGENES[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
    const res = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // el Worker de pruebas de los correos (growfolio-correos, SOLO_PRUEBA=1): solo su ruta de pruebas y las imágenes
    if (env.SOLO_PRUEBA && !(url.pathname === '/correo/prueba' || url.pathname.startsWith('/correo/img/') || url.pathname === '/salud')) return res({ error: 'no-existe' }, 404);
    try {
      if (url.pathname === '/' || url.pathname === '/salud') return res({ ok: true, banco: !!(env.EB_CLAVE && env.EB_APP), precios: !!env.PRECIOS_TOKEN, isin: true, claude: !!env.ANTHROPIC_API_KEY, cuotas: !!env.CUOTAS, correo: !!(env.RESEND_API_KEY && env.FIREBASE_CORREO) });
      if (url.pathname.startsWith('/banco/')) return await banco(url.pathname.slice(7), url, req, env, res);
      if (url.pathname === '/claude') return await claude(req, env, cors, res, ctx);
      if (url.pathname === '/correo' || url.pathname.startsWith('/correo/')) return await correoRuta(req, env, ctx, res, { quienEs, claveCorreo, origenes });
      // desde la web (o la app, que la carga) no hace falta sesión para buscar; desde otro sitio, sí
      if (url.pathname === '/isin') return await isinRuta(url, req, env, ctx, res, !origenes.includes(origen));
      return res({ error: 'no-existe' }, 404);
    } catch (e) {
      return res({ error: 'fallo', motivo: String((e && e.message) || e).slice(0, 160) }, 500);
    }
  },
};
