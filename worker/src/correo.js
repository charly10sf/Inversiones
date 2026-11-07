/* ---------- 0.8.3 · los correos propios de Toisón (desde noreply@toison.es, con Resend) ----------
   POST /correo { tipo, lang, base, correo }
   · confirmar  — con sesión: el correo de confirmación de ESA cuenta (sin confirmar). 1 por minuto y 5 al día por cuenta.
   · bienvenida — con sesión y el correo ya confirmado: una sola vez por cuenta.
   · clave      — SIN sesión, por correo: contraseña nueva. Tope por IP y por correo; la respuesta es la misma exista o no
                  la cuenta (no dice quién está dado de alta) y el envío va aparte, para que el tiempo tampoco lo diga.
   Los enlaces los da Firebase (accounts:sendOobCode con returnOobLink, firmado con la cuenta de servicio del proyecto) y
   aquí se monta el nuestro: <app>/cuenta.html?mode=…&oobCode=…&lang=… (no depende de «Personalizar URL de acción»).
   Si falta algo (clave de Resend, cuenta de servicio) o el día se ha llenado, contesta un motivo y la app manda el correo
   de Firebase de siempre: nadie se queda sin correo.
   GET /correo/img/<nombre> — las imágenes de los correos (en src/correo-imagenes.js).
   No se guardan correos en claro: los contadores van por la huella (SHA-256) del correo, del uid o de la IP. */
import { render } from './correo-plantillas.js';
import { IMAGENES } from './correo-imagenes.js';

const te = new TextEncoder();
const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const json64 = (o) => b64u(te.encode(JSON.stringify(o)));

export const DE = 'Toisón <noreply@toison.es>';
export const RESPONDER = 'hola@toison.es';
// dónde vive la app (la página de los enlaces, cuenta.html, está en la misma carpeta). La primera, si no se sabe otra
export const BASES_APP = ['https://charly10sf.github.io/Inversiones/', 'https://toison.es/app/'];
const BASE_DE_ORIGEN = { 'https://charly10sf.github.io': BASES_APP[0], 'https://toison.es': BASES_APP[1] };
const MODO = { confirmar: 'verifyEmail', clave: 'resetPassword' };
const PEDIDO_FB = { confirmar: 'VERIFY_EMAIL', clave: 'PASSWORD_RESET' };
// los topes ([ventana en ms, cuántos]); el del día entero cuida el plan gratis de Resend (100 al día)
const TOPE_CONFIRMAR = [[60e3, 1], [864e5, 5]];
const TOPE_CLAVE_CORREO = [[36e5, 3], [864e5, 6]];
const TOPE_CLAVE_IP = [[36e5, 10], [864e5, 30]];
const POR_DIA = 90;
// la ruta de pruebas (solo en el Worker de pruebas, el que tiene PRUEBA_TOKEN): solo a estas direcciones
export const CORREOS_PRUEBA = ['toison.web.app+revision@gmail.com'];
const CORREO_RE = /^[^\s@<>()",;:]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

async function huella(txt) {
  const h = await crypto.subtle.digest('SHA-256', te.encode('toison-correo:' + txt));
  return b64u(h).slice(0, 32);
}

/* ---------- el permiso de Google con la cuenta de servicio (JWT RS256 firmado con WebCrypto) ---------- */
let tokenG = null, tokenGHasta = 0, tokenGDe = '';
const pemADer = (pem) => Uint8Array.from(atob(String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
function cuentaServicio(env) {
  try {
    const sa = JSON.parse(env.FIREBASE_CORREO || '');
    return sa && sa.client_email && sa.private_key ? sa : null;
  } catch (e) { return null; }
}
async function tokenGoogle(env, sa) {
  if (tokenG && tokenGDe === sa.client_email && Date.now() < tokenGHasta) return tokenG;
  const ahora = Math.floor(Date.now() / 1000), aud = env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
  const cab = json64({ alg: 'RS256', typ: 'JWT', ...(sa.private_key_id ? { kid: sa.private_key_id } : {}) });
  const cue = json64({ iss: sa.client_email, sub: sa.client_email, aud, iat: ahora, exp: ahora + 3600, scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit' });
  const k = await crypto.subtle.importKey('pkcs8', pemADer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const firma = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', k, te.encode(`${cab}.${cue}`)));
  const r = await fetch(aud, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${cab}.${cue}.${firma}` });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('google-token ' + r.status + ' ' + String(j.error || '').slice(0, 60));
  tokenG = j.access_token; tokenGDe = sa.client_email; tokenGHasta = Date.now() + Math.max(60, (Number(j.expires_in) || 3600) - 300) * 1000;
  return tokenG;
}
// el enlace de Firebase para ese correo; sin cuenta con ese correo, null. conLink=false: que lo mande Firebase (el plan B)
async function oob(env, sa, tipo, correo, conLink = true) {
  const proyecto = env.FB_PROYECTO || 'growfolio-a79a9';
  const url = (env.IDTK_URL || 'https://identitytoolkit.googleapis.com') + `/v1/projects/${proyecto}/accounts:sendOobCode`;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${await tokenGoogle(env, sa)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: PEDIDO_FB[tipo], email: correo, ...(conLink ? { returnOobLink: true } : {}) }) });
  const j = await r.json().catch(() => ({}));
  const msg = String((j.error && j.error.message) || '');
  if (/EMAIL_NOT_FOUND|USER_NOT_FOUND|USER_DISABLED/.test(msg)) return null;
  if (!r.ok) throw new Error('firebase ' + r.status + ' ' + msg.slice(0, 60));
  if (!conLink) return 'mandado';
  const codigo = j.oobLink ? new URL(j.oobLink).searchParams.get('oobCode') : null;
  if (!codigo) throw new Error('firebase sin enlace');
  return codigo;
}

function baseApp(cuerpoBase, origen) {
  const b = typeof cuerpoBase === 'string' ? cuerpoBase : '';
  if (BASES_APP.includes(b)) return b;
  return BASE_DE_ORIGEN[origen] || BASES_APP[0];
}
export function enlaceCuenta(base, tipo, codigo, lang) {
  return `${base}cuenta.html?mode=${MODO[tipo]}&oobCode=${encodeURIComponent(codigo)}&lang=${lang}`;
}

async function mandar(env, workerUrl, tipo, lang, correo, enlace) {
  const img = (n) => (IMAGENES[n] ? `${workerUrl}/correo/img/${n}.${IMAGENES[n][0] === 'image/jpeg' ? 'jpg' : 'png'}?v=1` : '');
  const m = render(tipo, lang, { correo, enlace, img });
  const r = await fetch(env.RESEND_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.CORREO_DE || DE, to: [correo], reply_to: RESPONDER, subject: m.asunto, html: m.html, text: m.texto, tags: [{ name: 'tipo', value: tipo }] }),
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('resend ' + r.status + ' ' + t.slice(0, 80)); }
  return true;
}

// los contadores, en el Durable Object de los topes (clase Cuotas, op «limite» y «una»). Nombres con un espacio delante:
// no pueden cruzarse con los de las preguntas a la IA, que son correos
async function limite(env, nombre, ventanas) {
  const r = await env.CUOTAS.get(env.CUOTAS.idFromName(' correo ' + nombre)).fetch('https://cuotas/', { method: 'POST', body: JSON.stringify({ op: 'limite', ventanas, ahora: Date.now() }) });
  return r.json();
}
async function unaVez(env, nombre, op) {
  const r = await env.CUOTAS.get(env.CUOTAS.idFromName(' correo ' + nombre)).fetch('https://cuotas/', { method: 'POST', body: JSON.stringify({ op }) });
  return r.json();
}
const porDia = (env) => [[864e5, Math.max(1, Number(env.CORREO_POR_DIA) || POR_DIA)]];

export async function correoRuta(req, env, ctx, res, { quienEs, claveCorreo, origenes }) {
  const url = new URL(req.url), workerUrl = url.origin;
  // las imágenes: públicas, para siempre en caché
  if (url.pathname.startsWith('/correo/img/')) {
    const n = url.pathname.slice(12).replace(/\.(png|jpg)$/, ''), im = Object.prototype.hasOwnProperty.call(IMAGENES, n) ? IMAGENES[n] : null;
    if (!im || req.method !== 'GET') return res({ error: 'no-existe' }, 404);
    return new Response(Uint8Array.from(atob(im[1]), (c) => c.charCodeAt(0)), { headers: { 'Content-Type': im[0], 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } });
  }
  if (req.method !== 'POST') return res({ error: 'metodo' }, 405);
  const prueba = url.pathname === '/correo/prueba';
  if (url.pathname !== '/correo' && !prueba) return res({ error: 'no-existe' }, 404);
  if (prueba && !(env.PRUEBA_TOKEN && String(env.PRUEBA_TOKEN).length >= 32 && req.headers.get('X-Prueba') === env.PRUEBA_TOKEN)) return res({ error: 'no-existe' }, 404);
  const txt = await req.text();
  if (txt.length > 2000) return res({ ok: false, motivo: 'pedido' }, 400);
  let d; try { d = JSON.parse(txt); } catch (e) { return res({ ok: false, motivo: 'pedido' }, 400); }
  if (!d || typeof d !== 'object') return res({ ok: false, motivo: 'pedido' }, 400);
  const tipo = d.tipo, lang = d.lang === 'en' ? 'en' : 'es', origen = req.headers.get('Origin') || '';
  if (!['confirmar', 'clave', 'bienvenida'].includes(tipo)) return res({ ok: false, motivo: 'pedido' }, 400);
  const sa = cuentaServicio(env);
  if (!env.RESEND_API_KEY || !sa || !env.CUOTAS) return res({ ok: false, motivo: 'sin-config' }, 503);
  const base = baseApp(d.base, origen);

  // ---- el Worker de pruebas: los tres correos, solo a las direcciones de prueba
  if (prueba) {
    const correo = String(d.correo || CORREOS_PRUEBA[0]).toLowerCase();
    if (!CORREOS_PRUEBA.includes(correo)) return res({ ok: false, motivo: 'pedido' }, 400);
    const codigo = tipo === 'bienvenida' ? null : await oob(env, sa, tipo, correo);
    if (tipo !== 'bienvenida' && !codigo) return res({ ok: false, motivo: 'sin-cuenta' });
    await mandar(env, workerUrl, tipo, lang, correo, tipo === 'bienvenida' ? base : enlaceCuenta(base, tipo, codigo, lang));
    return res({ ok: true, tipo, lang });
  }

  // ---- contraseña nueva: sin sesión
  if (tipo === 'clave') {
    if (!origenes.includes(origen)) return res({ ok: false, motivo: 'origen' }, 403);
    const correo = String(d.correo || '').trim().toLowerCase();
    if (correo.length > 254 || !CORREO_RE.test(correo)) return res({ ok: false, motivo: 'correo' }, 400);
    const ip = req.headers.get('CF-Connecting-IP') || 'sin-ip';
    const li = await limite(env, 'ip ' + (await huella(ip)), TOPE_CLAVE_IP);
    if (!li.ok) return res({ ok: false, motivo: 'espera', espera: li.espera }, 429);
    const lc = await limite(env, 'clave ' + (await huella(claveCorreo(correo))), TOPE_CLAVE_CORREO);
    if (!lc.ok) return res({ ok: false, motivo: 'espera', espera: lc.espera }, 429);
    const lg = await limite(env, 'dia', porDia(env));
    if (!lg.ok) return res({ ok: false, motivo: 'cupo' }, 503);
    let codigo;
    try { codigo = await oob(env, sa, 'clave', correo); } catch (e) { console.log('correo clave: firebase', String(e.message || e).slice(0, 80)); return res({ ok: false, motivo: 'fallo' }, 502); }
    // exista o no la cuenta, la misma respuesta y en el mismo tiempo: el envío sigue aparte. Si Resend falla, que lo mande Firebase
    if (codigo) {
      const envio = mandar(env, workerUrl, 'clave', lang, correo, enlaceCuenta(base, 'clave', codigo, lang))
        .catch(async (e) => { console.log('correo clave: resend', String(e.message || e).slice(0, 80)); try { await oob(env, sa, 'clave', correo, false); } catch (e2) { console.log('correo clave: plan B', String(e2.message || e2).slice(0, 80)); } });
      ctx.waitUntil(envio);
    }
    return res({ ok: true });
  }

  // ---- con sesión: confirmar y bienvenida
  const u = await quienEs(req, env);
  if (!u) return res({ ok: false, motivo: 'sesion' }, 401);
  if (!u.email || u.email.length > 254) return res({ ok: false, motivo: 'correo' }, 400);
  const yo = await huella(u.uid);
  if (tipo === 'confirmar') {
    if (u.verificado) return res({ ok: false, motivo: 'ya' });
    const l = await limite(env, 'confirmar ' + yo, TOPE_CONFIRMAR);
    if (!l.ok) return res({ ok: false, motivo: 'espera', espera: l.espera }, 429);
  } else {
    if (!u.verificado) return res({ ok: false, motivo: 'verificar' }, 403);
    const una = await unaVez(env, 'bienvenida ' + yo, 'una');
    if (!una.ok) return res({ ok: false, motivo: 'ya' });
  }
  const lg = await limite(env, 'dia', porDia(env));
  if (!lg.ok) { if (tipo === 'bienvenida') await unaVez(env, 'bienvenida ' + yo, 'desmarcar'); return res({ ok: false, motivo: 'cupo' }, 503); }
  try {
    let enlace = base;
    if (tipo === 'confirmar') {
      const codigo = await oob(env, sa, 'confirmar', u.email);
      if (!codigo) return res({ ok: false, motivo: 'sin-cuenta' }, 404);
      enlace = enlaceCuenta(base, 'confirmar', codigo, lang);
    }
    await mandar(env, workerUrl, tipo, lang, u.email, enlace);
    return res({ ok: true });
  } catch (e) {
    console.log('correo ' + tipo + ':', String(e.message || e).slice(0, 80));
    if (tipo === 'bienvenida') await unaVez(env, 'bienvenida ' + yo, 'desmarcar');
    return res({ ok: false, motivo: 'fallo' }, 502);
  }
}
