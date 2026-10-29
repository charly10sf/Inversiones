/* ---------- 0.5: el kit de recuperación (la cartera, con una clave de datos en un sobre) ----------
   Formato 1 (hasta la 0.4): la cartera cifrada con la clave que sale de tu contraseña. Olvidarla era perderla, y
   cambiarla obligaba a volver a cifrar todo y a escribir la nueva en cada dispositivo.
   Formato 2: la cartera va cifrada con una clave de datos aleatoria, que se guarda dos veces, cerrada: con la clave
   de tu contraseña (la misma sal y las mismas vueltas que tenía la cartera) y con la de tu código de recuperación
   (24 caracteres al azar, 120 bits). Con cualquiera de las dos se abre; cambiar la contraseña solo cambia su
   cierre, así que la cartera no se vuelve a cifrar y los otros dispositivos siguen abriendo. El código también va
   dentro de la cartera cifrada (cartera.kit), para enseñártelo en cualquier dispositivo y para volver a cerrar la
   clave de datos sin pedirte nada: quien puede leerlo ya tiene la clave de datos.
   El dispositivo recuerda la clave de datos (no exportable). Una cartera en formato 1 pasa al 2 sola al abrirla, y
   un dispositivo que aún recuerda la clave de la contraseña abre el formato 2 con ella sin pedirte nada. */
const ITER_COD = 100000, ABC_COD = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const formatoDe = (t) => { try { return typeof t === 'string' ? JSON.parse(t) : t; } catch (e) { return null; } };
// lo que identifica la clave que abre un texto cifrado: la de datos (formato 2) o la sal de la contraseña (1)
const idClave = (t) => { const f = formatoDe(t); return !f ? null : f.v === 2 ? 'k:' + f.kid : 's:' + f.salt; };
const importarDatos = (raw) => crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
async function cerrarClave(kek, raw) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv: b64.enc(iv), ct: b64.enc(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, raw))) };
}
async function abrirClave(kek, w) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(w.iv) }, kek, b64.dec(w.ct))); }
// 24 caracteres sin los que se confunden (ni I, O, 0 ni 1), en seis grupos de cuatro; 256 es múltiplo de 32: sin sesgo
function codigoNuevo() {
  const r = crypto.getRandomValues(new Uint8Array(24));
  return Array.from({ length: 6 }, (_, g) => Array.from(r.subarray(g * 4, g * 4 + 4), (x) => ABC_COD[x & 31]).join('')).join('-');
}
const normCodigo = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const codigoValido = (c) => { const n = normCodigo(c); return n.length === 24 && [...n].every((x) => ABC_COD.includes(x)); };
const claveCodigo = (codigo, salt, iter = ITER_COD) => derivarClave(normCodigo(codigo), salt, iter);
// cada cierre lleva un número que sube con cada cambio (n): si dos dispositivos cambian el mismo a la vez, gana el de
// número más alto, sin depender del reloj de cada uno
const cierreDe = async (kek, raw, salt, iter, n = 1) => ({ kdf: 'PBKDF2-SHA256', iter, salt: b64.enc(salt), n, ...(await cerrarClave(kek, raw)) });
// un sobre nuevo: clave de datos al azar, cerrada con la clave de la contraseña (kek) y con un código nuevo
async function sobreNuevo(kek, salt, iter) {
  const raw = crypto.getRandomValues(new Uint8Array(32)), codigo = codigoNuevo(), rsalt = crypto.getRandomValues(new Uint8Array(16));
  const k = { pass: await cierreDe(kek, raw, salt, iter), rec: await cierreDe(await claveCodigo(codigo, rsalt), raw, rsalt, ITER_COD) };
  return { key: await importarDatos(raw), kv: { kid: b64.enc(crypto.getRandomValues(new Uint8Array(9))), k }, codigo, kit: { codigo, salt: k.rec.salt, creado: new Date().toISOString() } };
}
// abrir un texto con la contraseña: formato 2 (abre el cierre de la contraseña) o 1 (la clave de la contraseña es la de la cartera)
async function abrirConContrasena(texto, pass) {
  const f = JSON.parse(texto);
  if (f.v === 2) {
    const salt = b64.dec(f.k.pass.salt), iter = f.k.pass.iter, kek = await derivarClave(pass, salt, iter);
    const key = await importarDatos(await abrirClave(kek, f.k.pass));
    return { cartera: await descifrar(texto, key), key, kv: { kid: f.kid, k: f.k }, kek, salt, iter };
  }
  const salt = b64.dec(f.salt), iter = f.iter || 600000, kek = await derivarClave(pass, salt, iter);
  return { cartera: await descifrar(texto, kek), key: kek, kv: null, kek, salt, iter };
}
// lo que este dispositivo recuerda (IndexedDB), si abre ese texto: la clave de datos del mismo sobre, o la clave de la
// contraseña de antes (formato 1, o un formato 2 recién pasado en otro dispositivo, que se abre con ella)
async function claveRecordada(texto, g) {
  const f = formatoDe(texto);
  if (!f || !g || !g.key) return null;
  if (f.v !== 2) return g.salt && g.salt === f.salt ? { key: g.key, kv: null, kek: g.key, salt: b64.dec(f.salt), iter: f.iter || 600000 } : null;
  const base = { kv: { kid: f.kid, k: f.k }, salt: b64.dec(f.k.pass.salt), iter: f.k.pass.iter };
  if (g.kid && g.kid === f.kid) return { ...base, key: g.key, puente: g.puente || null };
  if (g.salt && g.salt === f.k.pass.salt) {
    try { return { ...base, key: await importarDatos(await abrirClave(g.key, f.k.pass)), kek: g.key, adoptada: true }; } catch (e) { return null; }
  }
  return null;
}
// al abrir con la contraseña o el código: lo cifrado en este dispositivo con cualquier clave de antes (la recordada, la
// de antes de un cambio de contraseña en otro dispositivo, la de la contraseña) pasa a la de ahora
async function pasarLocalesA(nueva, ...otras) {
  const g = await IDB.get(IDB_CLAVE), gv = await IDB.get('clave-vieja');
  for (const k of new Set([g && g.key, gv && gv.key, S.keyVieja, ...otras].filter(Boolean))) if (k !== nueva) await recifrarLocales(k, nueva);
  S.keyVieja = null; IDB.del('clave-vieja');
}
// la sesión con lo que se ha abierto
function fijarSesion(r) { S.cartera = r.cartera || S.cartera; S.key = r.key; S.kv = r.kv || null; S.kek = r.kek || null; S.salt = r.salt; S.iter = r.iter; S.puente = r.puente || null; }
// con el paso al formato 2 aún sin llegar a la cuenta, también el puente (la sal y la clave de la contraseña del formato 1)
const recordarClave = () => IDB.set(IDB_CLAVE, S.kv ? { kid: S.kv.kid, key: S.key, ...(S.puente ? { puente: S.puente } : {}) } : { salt: b64.enc(S.salt), key: S.key });
/* El puente: desde que este dispositivo pasa al formato 2 hasta que la cuenta lo tiene, se guarda la sal y la clave de la
   contraseña del formato 1. Con él se entiende lo que llegue de la cuenta aún en el formato 1 (lo guardó otro dispositivo
   entretanto) y el formato 2 de otro dispositivo que pasó a la vez, con la misma contraseña. Se suelta al confirmarse. */
const puenteV1 = () => S.puente || (S.kv && S.kek ? { salt: S.kv.k.pass.salt, kek: S.kek } : null);
// la cuenta ya tiene el formato 2 de esta clave de datos (en modo local o de pruebas, al guardar)
const confirmadoV2 = () => !!S.kv && (!PERFIL_CUENTA || CFG.dev || idClave(S.baseTexto) === 'k:' + S.kv.kid);
function soltarPuente() { S.puente = null; IDB.get(IDB_CLAVE).then((g) => { if (g && g.puente && S.kv && g.kid === S.kv.kid && S.key) recordarClave(); }).catch(() => {}); }
// lo que llega de la cuenta sin cambios de aquí por subir manda entero, también su sobre (otro dispositivo cambió la
// contraseña o el código). Si cambió el cierre de la contraseña, la clave de la de antes ya no sirve
function tomarSobre(texto) {
  const f = formatoDe(texto);
  if (!S.kv || !f || f.v !== 2 || f.kid !== S.kv.kid || !f.k || !f.k.pass || !f.k.rec) return;
  if (!igualJ(f.k.pass, S.kv.k.pass)) S.kek = null;
  S.kv = { kid: f.kid, k: f.k }; S.salt = b64.dec(f.k.pass.salt); S.iter = f.k.pass.iter;
}
// dos dispositivos cambiaron la cartera a la vez: cada cierre por separado, el que haya cambiado respecto a la base; si
// cambiaron los dos, el de número más alto (y si empatan, siempre el mismo, para que todos acaben igual)
function juntarSobre(b, m, t) {
  const uno = (x) => {
    const bb = b && b[x], mm = m && m[x], tt = t && t[x];
    if (!tt || igualJ(mm, tt)) return mm;
    if (!mm) return tt;
    if (bb && igualJ(mm, bb)) return tt;
    if (bb && igualJ(tt, bb)) return mm;
    const nm = +mm.n || 0, nt = +tt.n || 0;
    return nm !== nt ? (nm > nt ? mm : tt) : (String(mm.ct) > String(tt.ct) ? mm : tt);
  };
  return { pass: uno('pass'), rec: uno('rec') };
}
// el código que va dentro de la cartera tiene que ser el del cierre que manda: de las carteras que se juntan, el que
// coincide (y mejor el que ya diste por guardado)
function kitDelSobre(k, ...carteras) {
  const ok = carteras.map((c) => c && c.kit).filter((x) => x && x.codigo && k && k.rec && x.salt === k.rec.salt);
  return ok.find((x) => x.guardado) || ok[0] || null;
}
// lo que va cifrado con la clave de la cartera en este dispositivo (la clave de Gemini, la conversación del asesor, el
// análisis propio): al cambiar de clave, se descifra con la vieja y se cifra con la nueva
const LS_CIFRADAS = () => ['inv-ia-propio', 'inv-asesor-conv', 'inv-asesor-clave', ...Object.values(LS_CLAVE)];
async function recifrarLocales(vieja, nueva) {
  for (const k of new Set(LS_CIFRADAS())) {
    const o = LS.get(k);
    if (!o || !o.iv || !o.ct) continue;
    try {
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(o.iv) }, vieja, b64.dec(o.ct));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      LS.set(k, { iv: b64.enc(iv), ct: b64.enc(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, nueva, pt))) });
    } catch (e) { /* ya estaba con la nueva, o no se puede: se queda como está */ }
  }
}
// comprobar que eres tú: la contraseña de ahora abre su cierre. Devuelve la clave de datos en claro (o null). 0.7d: ya
// no hay un camino que la dé sin pedir nada (claveDatosEnClaro, que tiraba del código guardado dentro o de la sesión)
async function claveConContrasena(texto) {
  if (!S.kv) return null;
  const pass = S.kv.k.pass, p = await pedirContrasenaActual(texto); if (!p) return null;
  try { const kek = await derivarClave(p, b64.dec(pass.salt), pass.iter), raw = await abrirClave(kek, pass); if (S.kv && S.kv.k.pass === pass) S.kek = kek; return raw; }
  catch (e) { toast(L('Esa no es la contraseña de tu cartera.', "That isn't your portfolio password."), 5000); return null; }
}
// 0.7d: para cambiar la contraseña no vale con tener la cartera abierta: hay que escribir la de ahora o el código de
// recuperación. Devuelve la clave de datos en claro si lo escrito abre uno de los dos cierres (o null)
async function claveConActual(x) {
  if (!S.kv || !x) return null;
  const { pass, rec } = S.kv.k;
  if (rec && codigoValido(x)) { try { return await abrirClave(await claveCodigo(x, b64.dec(rec.salt), rec.iter), rec); } catch (e) { /* no era el código: se prueba como contraseña */ } }
  try { return await abrirClave(await derivarClave(x, b64.dec(pass.salt), pass.iter), pass); } catch (e) { return null; }
}
// lo mismo con una cartera aún en el formato 1: la contraseña de ahora tiene que abrir lo último guardado
async function esContrasenaV1(x) {
  const t = S.enc && S.enc.texto, f = formatoDe(t);
  if (!x || !f || f.v === 2) return false;
  try { await abrirConContrasena(t, x); return true; } catch (e) { return false; }
}
// la contraseña de ahora, en una hoja (para enseñar el código o cambiarlo cuando no hay otra forma de comprobar que eres tú)
function pedirContrasenaActual(texto) {
  return new Promise((res) => {
    let dado = null;
    const h = hoja(L('Contraseña de tu cartera', 'Portfolio password'), `<form id="fPAct" novalidate><p>${esc(texto || L('Escríbela para seguir.', 'Type it to continue.'))}</p>
      <input type="text" name="username" value="${esc(PERFIL_CUENTA && FB.user && FB.user.email ? FB.user.email + ' (cartera)' : '')}" autocomplete="username" hidden>
      <label class="campo">${L('Contraseña', 'Password')}<input type="password" id="pAct" autocomplete="current-password"></label>
      <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri">${L('Seguir', 'Continue')}</button></div></form>`, () => res(dado));
    const i = $('#pAct', h.el); setTimeout(() => i.focus(), 60);
    $('#fPAct', h.el).onsubmit = (ev) => { ev.preventDefault(); if (!i.value) return; dado = i.value; h.cerrar(); };
  });
}

/* la clave (no la contraseña) se puede recordar en este dispositivo: IndexedDB guarda la CryptoKey no exportable */
const IDB = {
  abrir() { return new Promise((res, rej) => { const r = indexedDB.open('inversiones', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async op(modo, fn) { const db = await this.abrir(); return new Promise((res, rej) => { const t = db.transaction('kv', modo); const r = fn(t.objectStore('kv')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); },
  get(k) { return this.op('readonly', (s) => s.get(k)).catch(() => null); },
  set(k, v) { return this.op('readwrite', (s) => s.put(v, k)).catch(() => null); },
  del(k) { return this.op('readwrite', (s) => s.delete(k)).catch(() => null); },
};

