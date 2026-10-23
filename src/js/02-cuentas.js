/* =====================================================================
   Cuentas (desde la 0.2): Firebase Authentication, con Google o con correo, y la cartera cifrada en Firestore
   (usuarios/{uid}). A Firebase solo llega el texto cifrado: la clave sale de la contraseña de tu cartera y no
   sale del dispositivo. Esta configuración es pública (toda web con Firebase la lleva a la vista); lo que
   protege los datos son las reglas de Firestore (cada cuenta solo lee y escribe lo suyo) y los dominios
   autorizados. El SDK se carga solo en el modo cuenta.
   ===================================================================== */
const FB_CFG = {"apiKey": "AIzaSyAECqndaNt3kRC6HBLnWehTmvEWVpuIJbM", "authDomain": "growfolio-a79a9.firebaseapp.com", "projectId": "growfolio-a79a9", "storageBucket": "growfolio-a79a9.firebasestorage.app", "messagingSenderId": "316596282728", "appId": "1:316596282728:web:7c79fcf3dfb4e2b29b62dd"};
const FB_VER = '10.12.2';
// «ID de cliente web» del proveedor Google de Firebase: lo usa la app de Android para entrar con Google nativo
const FB_GOOGLE_WEB = '316596282728-9u4mt8al9c3f54cllrmr1b47tf6qemcb.apps.googleusercontent.com';
// Entrar con Apple: necesita la cuenta de desarrollador de Apple (Services ID, Team ID y clave en Firebase).
// Mientras sea false, el botón no sale.
const FB_APPLE = false;
// iPhone y iPad (el iPad moderno dice que es un Mac con pantalla táctil) y si GrowFolio ya está en la pantalla de inicio
const ES_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const COMO_APP = !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
const FB = { user: null };
let fbPromesa = null;
function fbCargar() {
  if (fbPromesa) return fbPromesa;
  fbPromesa = (async () => {
    const b = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [a, au, fs] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map((m) => import(b + m)));
    FB.au = au; FB.fs = fs;
    FB.app = a.initializeApp(FB_CFG);
    FB.auth = au.getAuth(FB.app);
    try { FB.auth.languageCode = IDIOMA; } catch (e) {}
    FB.db = fs.getFirestore(FB.app);
    FB.user = await new Promise((res) => { const off = au.onAuthStateChanged(FB.auth, (u) => { off(); res(u); }); });
    au.onAuthStateChanged(FB.auth, (u) => { FB.user = u; });
    return FB;
  })();
  fbPromesa.catch(() => { fbPromesa = null; });
  return fbPromesa;
}
const docCuenta = () => FB.fs.doc(FB.db, 'usuarios', FB.user.uid);
async function leerCuenta() { const d = await FB.fs.getDoc(docCuenta()); return d.exists() ? d.data() : null; }
/* Sincronizar sin perder nada (0.2). En la cuenta, la cartera cifrada (enc) lleva un número de revisión (rev)
   que sube en cada escritura. La copia del dispositivo guarda sobre qué revisión se hicieron sus cambios
   (baseRev), y solo se sube con una transacción que comprueba en el servidor que la cuenta sigue en esa
   revisión: si otro dispositivo la cambió entretanto, no se pisa nada (si lo acabas de editar tú, te pregunta;
   si no, se queda la cuenta y lo de aquí se guarda aparte). Las transacciones no se quedan en cola sin
   conexión: fallan, y lo de aquí queda pendiente y se reintenta con esperas cada vez más largas; ante un error
   que no se arregla solo (permisos, tamaño, cuota), se para y se avisa. No depende del reloj de cada móvil.
   Nunca se escribe sin haber leído la cuenta en esta sesión, ni se da por vacía si la lectura falla. */
const revDe = (d) => !d ? 0 : (+d.rev || (d.enc ? 1 : 0));
async function escribirCuenta(texto, baseRev, forzar) {
  const ref = docCuenta(), actualizado = new Date().toISOString();
  // lo que este dispositivo ya intentó subir no cuenta como cambio de otro (una subida que tardó y llegó igual)
  const mios = S.intentos || (S.intentos = []);
  mios.push(texto); if (mios.length > 8) mios.shift();
  return FB.fs.runTransaction(FB.db, async (tx) => {
    const s0 = await tx.get(ref), d = s0.exists() ? s0.data() : null, rev = revDe(d);
    if (d && d.enc && d.enc === texto) return rev;
    if (!forzar && d && d.enc && rev !== (baseRev || 0) && !mios.includes(d.enc)) { const e = new Error('conflicto'); e.conflicto = true; e.d = d; throw e; }
    tx.set(ref, { enc: texto, actualizado, rev: rev + 1, v: VERSION, desde: window.InversionesApp ? 'app' : 'web' }, { merge: true });
    return rev + 1;
  });
}
const conTiempo = (pr, ms) => Promise.race([pr, new Promise((_, no) => setTimeout(() => no(new Error('tiempo')), ms))]);
// copia en el dispositivo de lo último de tu cuenta, para abrir sin conexión y para lo que aún no se ha subido
const cacheCuenta = {
  get() { const c = LS.get('inv-cuenta-enc'); return c && (!FB.user || c.uid === FB.user.uid) ? c : null; },
  set(texto, baseRev, base) {
    if (baseRev == null) baseRev = S.baseRev || 0;
    if (base == null) base = S.baseTexto || null;
    LS.set('inv-cuenta-enc', { uid: FB.user ? FB.user.uid : null, texto, actualizado: new Date().toISOString(), baseRev, base: base && base !== texto ? base : undefined });
  },
};
// lo último que se sabe que hay en la cuenta (revisión y texto): sobre eso se hacen los cambios de aquí
function fijarBase(rev, texto) { S.baseRev = rev || 0; S.baseTexto = texto || null; if (S.puente && S.kv && idClave(texto) === 'k:' + S.kv.kid) soltarPuente(); }
/* sube lo último del dispositivo; nunca dos a la vez (si cambias algo mientras, se sube después) */
let subidaEnCurso = null;
function subirPendiente() {
  if (subidaEnCurso) { S.otraSubida = true; return subidaEnCurso; }
  subidaEnCurso = (async () => {
    try {
      do {
        S.otraSubida = false;
        const c = cacheCuenta.get();
        if (!c || !LS.get('inv-pend-cuenta') || !FB.user || !S.cuentaLeida) return;
        const rev = await conTiempo(escribirCuenta(c.texto, c.baseRev || 0, S.forzarSubida), 15000);
        S.forzarSubida = false; fijarBase(rev, c.texto); S.cuentaOk = true; S.fallosSubir = 0; S.subidaParada = false;
        const c2 = cacheCuenta.get();
        if (c2 && c2.texto === c.texto) { cacheCuenta.set(c.texto, rev, c.texto); LS.del('inv-pend-cuenta'); }
        else if (c2) cacheCuenta.set(c2.texto, rev, c.texto);
        if (S.toastPend) { S.toastPend = false; toast('Subidos a tu cuenta los cambios que hiciste sin conexión', 5000); }
      } while (S.otraSubida);
    } catch (e) {
      S.forzarSubida = false;
      if (e && e.conflicto) await resolverConflicto(e);
      else falloSubida(e);
    } finally { subidaEnCurso = null; }
  })();
  return subidaEnCurso;
}
/* Juntar dos versiones de la cartera que han cambiado a la vez a partir de la misma (base): lo que solo ha
   cambiado en un lado se queda; las listas se juntan elemento a elemento (por su id, por plataforma o por
   instrumento y plataforma, o por posición si ninguna cambia de largo); si los dos lados han apuntado
   compras o ventas, el efectivo, las unidades, el coste y los lotes de una misma posición se suman (dos
   compras del mismo valor cuentan las dos); si los dos han cambiado lo mismo de otra forma, gana «gana»
   ('mio' o 'suyo') y se apunta en choques. */
const igualJ = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const claveDe = (e) => !esObj(e) ? null : e.id != null ? 'id:' + e.id : e.instrumento != null && e.plataforma != null ? 'ip:' + e.instrumento + '|' + e.plataforma : e.plataforma != null ? 'p:' + e.plataforma : null;
const conClaves = (...xs) => xs.every((x) => x == null || (Array.isArray(x) && x.every((e) => claveDe(e) != null) && new Set(x.map(claveDe)).size === x.length));
const SUMABLE = /^\.(efectivo\/[^/]+\.importe|posiciones\/[^/]+\.(cantidad|coste))$/;
// lotes de una posición con compras o ventas en los dos lados: lo que cada lado quitó o añadió respecto a la base
function juntarLotes(b, m, t) {
  const k = (l) => JSON.stringify(l), cuenta = (xs) => { const c = new Map(); for (const x of xs) c.set(k(x), (c.get(k(x)) || 0) + 1); return c; };
  const M = cuenta(m), T = cuenta(t);
  // sin lotes en la base (posición de antes), la base son los que comparten los dos
  const B = Array.isArray(b) ? cuenta(b) : new Map([...M].filter(([x]) => T.has(x)).map(([x, n]) => [x, Math.min(n, T.get(x))]));
  const todos = new Map(); for (const x of [...(Array.isArray(b) ? b : []), ...m, ...t]) todos.set(k(x), x);
  const out = [];
  for (const [x, l] of todos) { const nb = B.get(x) || 0, n = Math.max(0, (M.get(x) || 0) + (T.get(x) || 0) - nb); for (let i = 0; i < n; i++) out.push({ ...l }); }
  return out.sort((a, c) => (a.f < c.f ? -1 : a.f > c.f ? 1 : 0));
}
function juntar3(b, m, t, gana, choques, ruta, suma) {
  if (igualJ(m, t)) return m;
  if (igualJ(m, b)) return t;
  if (igualJ(t, b)) return m;
  // los dos lados han cambiado esto
  if (suma && typeof b === 'number' && typeof m === 'number' && typeof t === 'number' && SUMABLE.test(ruta)) return Math.round((m + t - b) * 1e8) / 1e8;
  if (suma && /^\.posiciones\/[^/]+\.lotes$/.test(ruta) && Array.isArray(m) && Array.isArray(t)) return juntarLotes(b, m, t);
  if (Array.isArray(m) && Array.isArray(t)) {
    const bl = Array.isArray(b) ? b : null;
    if (conClaves(bl, m, t)) {
      const B = new Map((bl || []).map((e) => [claveDe(e), e])), M = new Map(m.map((e) => [claveDe(e), e])), T = new Map(t.map((e) => [claveDe(e), e]));
      const out = [];
      for (const id of [...t.map(claveDe), ...m.map(claveDe).filter((id) => !T.has(id))]) {
        const be = B.get(id), me = M.get(id), te = T.get(id);
        if (me && te) { out.push(juntar3(be, me, te, gana, choques, ruta + '/' + id, suma)); continue; }
        const queda = me || te;
        if (!be) { out.push(queda); continue; }          // nuevo en un lado
        if (igualJ(queda, be)) continue;                  // borrado en el otro lado sin tocarlo aquí
        choques.push(ruta + '/' + id);                    // borrado en un lado y cambiado en el otro
        if ((gana === 'mio') === !!me) out.push(queda);
      }
      return out;
    }
    if (bl && bl.length === m.length && m.length === t.length) return m.map((_, i) => juntar3(bl[i], m[i], t[i], gana, choques, ruta + '/' + i, suma));
  }
  if (esObj(m) && esObj(t)) {
    const bb = esObj(b) ? b : {}, out = {};
    for (const k of new Set([...Object.keys(t), ...Object.keys(m)])) {
      const v = juntar3(bb[k], m[k], t[k], gana, choques, ruta + '.' + k, suma);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  choques.push(ruta);
  return gana === 'mio' ? m : t;
}
function juntarCarteras(base, mio, suyo, gana, choques) {
  const sin = (x) => { if (!x) return x; const { actualizado, ...r } = x; return r; };
  // ¿han apuntado compras o ventas los dos lados? Entonces efectivo, unidades y coste se suman
  const idsB = new Set(((base && base.movimientos) || []).map((x) => x.id));
  const nuevos = (x) => ((x && x.movimientos) || []).some((mv) => !idsB.has(mv.id));
  const suma = !!base && nuevos(mio) && nuevos(suyo);
  const r = juntar3(base ? sin(base) : undefined, sin(mio), sin(suyo), gana, choques, '', suma);
  r.actualizado = new Date().toISOString();
  return r;
}
/* otro dispositivo cambió la cuenta mientras aquí había cambios sin subir: se juntan los dos */
async function resolverConflicto(e) {
  const d = e.d, c = cacheCuenta.get();
  if (!c) { LS.del('inv-pend-cuenta'); return; }
  // con la cartera bloqueada no se puede leer: se queda pendiente hasta que la abras
  if (!S.key) return;
  // con un formulario abierto, al cerrarlo (no se cambia la cartera debajo de lo que estás editando)
  if (!S.preguntarConflicto && document.querySelector('.hoja-fondo form, .ficha')) { clearTimeout(S.subidaT); S.subidaT = setTimeout(() => sincronizarCuenta(), 2000); return; }
  let mio, suyo, base, sobre = null;
  try {
    let keySuya = S.key;
    const fs = formatoDe(d.enc);
    if (idClave(d.enc) !== idClave(c.texto)) {
      const pu = puenteV1();
      if (S.kv && pu && fs && fs.v !== 2 && fs.salt === pu.salt) {
        // 0.5: aquí ya se pasó al formato 2 y la cuenta sigue en el 1 (otro dispositivo guardó antes de que llegara): se
        // abre con la clave de la contraseña, se junta y se sube en el 2
        keySuya = pu.kek;
      } else {
        // la cuenta ya está en el formato 2 de otro dispositivo (aquí en el 1, o en un 2 propio que aún no había llegado):
        // se abre su sobre con la clave de la contraseña de aquí, se junta y este dispositivo se queda con su clave de datos
        const g = !S.kv ? { salt: S.salt ? b64.enc(S.salt) : null, key: S.key } : pu ? { salt: pu.salt, key: pu.kek } : null;
        const r = g && g.key ? await claveRecordada(d.enc, g) : null;
        if (!r || !r.adoptada) throw new Error('otra contraseña');
        keySuya = r.key; S.adoptarTras = r;
      }
    }
    [mio, suyo] = await Promise.all([descifrar(c.texto, S.key), descifrar(d.enc, keySuya)]);
    if (c.base) for (const k of [S.key, S.kek, S.puente && S.puente.kek]) { if (!k) continue; try { base = await descifrar(c.base, k); break; } catch (e2) {} }
    if (S.adoptarTras) { const r = S.adoptarTras, g = await IDB.get(IDB_CLAVE), vieja = S.key; S.adoptarTras = null; fijarSesion({ ...r, cartera: S.cartera }); await recifrarLocales(vieja, r.key); if (g) await recordarClave(); }
    else if (S.kv && fs && fs.v === 2 && fs.kid === S.kv.kid && fs.k) {
      // los dos con la misma clave de datos: cada cierre (contraseña y código) por separado
      const fb = formatoDe(c.base);
      sobre = juntarSobre(fb && fb.v === 2 && fb.kid === S.kv.kid ? fb.k : null, S.kv.k, fs.k);
    }
  } catch (e1) {
    S.adoptarTras = null;
    // no se puede juntar (otra contraseña): manda la cuenta; lo de aquí, aparte en el dispositivo
    LS.set('inv-cuenta-descartada', { texto: c.texto, cuando: new Date().toISOString() });
    LS.del('inv-pend-cuenta'); S.avisoConflicto = true;
    if (S.cartera) return aplicarRemoto(d.enc, revDe(d));
    fijarBase(revDe(d), d.enc); cacheCuenta.set(d.enc); S.enc = { texto: d.enc, sha: null }; return;
  }
  let choques = [], junto = juntarCarteras(base, mio, suyo, 'suyo', choques), gana = 'suyo';
  if (choques.length && S.preguntarConflicto && confirm(trad('Has cambiado lo mismo también en otro dispositivo. ¿Te quedas con lo de aquí? Aceptar: lo de este dispositivo. Cancelar: lo del otro. El resto de cambios de los dos se junta.'))) {
    choques = []; junto = juntarCarteras(base, mio, suyo, 'mio', choques); gana = 'mio';
  }
  if (choques.length) LS.set('inv-cuenta-descartada', { texto: c.texto, cuando: new Date().toISOString() });
  // lo juntado pasa a ser lo de aquí, sobre la revisión que hay en la cuenta, y se sube
  fijarBase(revDe(d), d.enc);
  if (sobre) { if (!igualJ(sobre.pass, S.kv.k.pass)) S.kek = null; S.kv = { kid: S.kv.kid, k: sobre }; S.salt = b64.dec(sobre.pass.salt); S.iter = sobre.pass.iter; }
  // el código de dentro de la cartera, el del cierre que se ha quedado
  if (S.kv) { const kit = kitDelSobre(S.kv.k, mio, suyo, junto); if (kit) junto.kit = kit; }
  S.cartera = junto; sumarInstPropios();
  const texto = await cifrar(junto);
  cacheCuenta.set(texto); S.enc = { texto, sha: null }; LS.set('inv-pend-cuenta', true);
  if (!document.querySelector('.hoja-fondo form, .ficha')) pintar();
  toast(!choques.length && gana === 'suyo' ? 'Tu cartera había cambiado también en otro dispositivo: se han juntado los cambios de los dos'
    : gana === 'mio' ? 'Guardado: en lo que coincidía se queda lo de aquí y el resto se ha juntado con lo del otro dispositivo'
    : 'Habías cambiado lo mismo en otro dispositivo: en eso se queda lo del otro y el resto se ha juntado', 7000);
  S.preguntarConflicto = false; S.toastPend = false; subidaEnCurso = null;
  return subirPendiente();
}
/* sin conexión, se reintenta cada vez más espaciado; con un error que no se arregla solo, se para y se avisa */
function falloSubida(e) {
  S.cuentaOk = false; S.toastPend = true;
  const code = String((e && e.code) || '');
  if (/permission-denied|invalid-argument|resource-exhausted|unauthenticated/.test(code)) {
    if (!S.subidaParada) { S.subidaParada = true; toast(trad(code === 'resource-exhausted' ? 'Hoy no se puede guardar más en tu cuenta (límite de Firebase). Lo tienes en este dispositivo y se subirá mañana al abrir.' : 'No se ha podido guardar en tu cuenta. Lo tienes en este dispositivo; si sigue pasando, avisa a quien te pasó GrowFolio.') + ` (${code})`, 9000); }
    return;
  }
  S.fallosSubir = (S.fallosSubir || 0) + 1;
  reintentarSubida();
}
function reintentarSubida() {
  clearTimeout(S.subidaT);
  if (!LS.get('inv-pend-cuenta') || S.subidaParada) return;
  const espera = [5, 15, 30, 60, 120, 300, 600][Math.min(S.fallosSubir || 0, 6)] * 1000;
  S.subidaT = setTimeout(() => sincronizarCuenta(), espera);
}
// el nombre para saludarte: el que pusiste al crear la cuenta (o en tu perfil) o, si no, el de Google
const nombreUsuario = () => String((S.cartera && S.cartera.perfil && S.cartera.perfil.nombre) || LS.get('inv-nombre', '') || (FB.user && FB.user.displayName) || '').trim().split(/\s+/)[0] || '';
const ERR_FB = {
  'auth/invalid-credential': 'El correo o la contraseña no son correctos.', 'auth/wrong-password': 'El correo o la contraseña no son correctos.', 'auth/user-not-found': 'No hay ninguna cuenta con ese correo: créala con «Crear cuenta».',
  'auth/email-already-in-use': 'Ya hay una cuenta con ese correo: entra con «Entrar».', 'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.', 'auth/invalid-email': 'Ese correo no parece válido.',
  'auth/too-many-requests': 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.', 'auth/network-request-failed': 'Sin conexión: comprueba internet y vuelve a probar.',
  'auth/popup-closed-by-user': 'Has cerrado la ventana de Google antes de terminar.', 'auth/cancelled-popup-request': 'Has cerrado la ventana de Google antes de terminar.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication, Configuración, Dominios autorizados).', 'auth/operation-not-allowed': 'Ese modo de entrar no está activado en Firebase.',
};
const errorFb = (e) => ERR_FB[e && e.code] || `No se pudo: ${(e && (e.code || e.message)) || 'error desconocido'}.`;

/* el token puede llegar desde otro dispositivo en el enlace (#t=...): se guarda y se borra de la dirección */
function tokenDesdeEnlace() {
  const m = /[#&]t=([^&]+)/.exec(location.hash);
  if (!m) return false;
  const t = decodeURIComponent(m[1]).trim();
  if (t.length > 20) LS.set('inv-token', t);
  try { history.replaceState(null, '', location.pathname + location.search + (typeof S !== 'undefined' && S.vista ? '#' + S.vista : '')); } catch (e) {}
  return t.length > 20;
}
tokenDesdeEnlace();
/* también si llega con la web ya abierta (la app, cuando Chrome le pasa el token) */
window.addEventListener('hashchange', () => { if (tokenDesdeEnlace()) setTimeout(() => toast('Token de GitHub guardado: ya puedes guardar cambios desde aquí', 5000), 50); });

