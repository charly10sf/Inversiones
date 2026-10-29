/* GrowFolio: el servidor pequeño (un Cloudflare Worker).

   Hace dos cosas: buscar en Yahoo un ISIN que no está en el catálogo (/isin, más abajo) y leer el saldo de tus cuentas de dinero con Enable Banking (open banking, solo lectura),
   para que el efectivo de GrowFolio cuadre con el del banco. Está aquí y no en la web porque Enable Banking firma cada
   petición con una clave privada que no puede ir en una página pública.

   - Solo atiende a quien entra con su cuenta de GrowFolio (el token de Firebase, comprobado con las claves públicas de
     Google) y está en la lista BANCO_EMAILS.
   - No guarda nada: la sesión del banco y las cuentas las guarda la app, cifradas dentro de tu cartera.
   - Secretos (los pone la GitHub Action, nunca están en el repositorio): EB_CLAVE (la clave .pem de la aplicación de
     Enable Banking), EB_APP (su Application ID), BANCO_EMAILS (quién puede usarlo) y ESTADO (para firmar la vuelta). */

const EB_API = 'https://api.enablebanking.com';
const FB_PROYECTO = 'growfolio-a79a9';
const FB_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const ORIGENES = ['https://charly10sf.github.io'];
// la primera es la de por defecto; la web manda la suya (la de GrowFolio, en cuanto el repositorio se renombre)
const VUELTAS = ['https://charly10sf.github.io/Inversiones/', 'https://charly10sf.github.io/GrowFolio/'];
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
// el banco pide cabeceras PSU que no tenemos (todas o ninguna): se lee como siempre, sin ellas
const faltaPsu = (r) => !r.ok && /PSU_HEADER/i.test(JSON.stringify(r.j || {}));

/* ---------- quién llama: el token de Firebase de su cuenta de GrowFolio ---------- */
let jwks = null, jwksT = 0;
async function claveFB(env, kid) {
  for (let intento = 0; intento < 2; intento++) {
    if (!jwks || Date.now() - jwksT > 3600e3 || intento) {
      const r = await fetch(env.FB_JWKS || FB_JWKS);
      jwks = ((await r.json()) || {}).keys || []; jwksT = Date.now();
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
    await Promise.all(ids.map(async (id) => {
      const camino = `/accounts/${encodeURIComponent(id)}/balances`;
      let r = await eb(env, 'GET', camino, null, psu);
      if (psu && faltaPsu(r)) r = await eb(env, 'GET', camino);
      if (!r.ok) { saldos[id] = { error: [401, 403, 404, 422].includes(r.status) ? 'caducada' : 'fallo', status: r.status }; return; }
      const b = elegirSaldo(r.j.balances);
      saldos[id] = b ? { importe: +b.balance_amount.amount, moneda: b.balance_amount.currency || 'EUR', tipo: b.balance_type || '', fecha: b.reference_date || b.last_change_date_time || null } : { error: 'sin-saldo' };
    }));
    return res({ saldos, presente: !!psu });
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
    try {
      if (url.pathname === '/' || url.pathname === '/salud') return res({ ok: true, banco: !!(env.EB_CLAVE && env.EB_APP), precios: !!env.PRECIOS_TOKEN, isin: true });
      if (url.pathname.startsWith('/banco/')) return await banco(url.pathname.slice(7), url, req, env, res);
      // desde la web (o la app, que la carga) no hace falta sesión para buscar; desde otro sitio, sí
      if (url.pathname === '/isin') return await isinRuta(url, req, env, ctx, res, !origenes.includes(origen));
      return res({ error: 'no-existe' }, 404);
    } catch (e) {
      return res({ error: 'fallo', motivo: String((e && e.message) || e).slice(0, 160) }, 500);
    }
  },
};
