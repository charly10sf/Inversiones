/* ---------- cifrado local con la clave de la cartera (para la clave de la API y la conversación) ---------- */
async function cifrarLocal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, S.key, TE.encode(JSON.stringify(obj))));
  return { iv: b64.enc(iv), ct: b64.enc(ct) };
}
async function descifrarLocal(o) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(o.iv) }, S.key, b64.dec(o.ct));
  return JSON.parse(TD.decode(pt));
}
async function cargarAsesor() {
  if (AS.cargada || !S.key) return;
  AS.cargada = true;
  // 0.8.2b: la clave de Google ya no se usa (la IA va con Claude): no se carga. La que hubiera guardada se borra en la
  // limpieza de la sesión 5 de «Todo con Claude»
  const h = LS.get('inv-asesor-conv');
  if (h) { try { const o = await descifrarLocal(h); AS.conv = o.conv || []; AS.api = o.api || []; AS.gasto = o.gasto || 0; AS.convId = o.id || null; } catch (e) { LS.del('inv-asesor-conv'); } }
  await cargarConvs();
  // si la app se cerró antes de pasar la conversación abierta a la lista (se pasa con retraso, ver archivarLuego), se pasa ahora
  if (AS.conv.some((t) => t.rol === 'yo')) {
    const c = (AS.convs || []).find((x) => x.id === AS.convId);
    if (!c || c.n !== AS.conv.filter((t) => t.rol === 'yo').length) await archivarConv();
  }
}
async function guardarConv() {
  if (!S.key || S.demo) return;
  try { if (AS.conv.some((t) => t.rol === 'yo')) AS.convId = AS.convId || nuevoIdConv(); LS.set('inv-asesor-conv', await cifrarLocal({ id: AS.convId || null, conv: AS.conv.slice(-60).map(({ adj, ...t }, k, v) => (t.mini && v.slice(k + 1).filter((y) => y.mini).length >= 4 ? { ...t, mini: undefined } : t)), api: AS.api.slice(-24), gasto: AS.gasto })); } catch (e) {}
  archivarLuego();
}
function olvidarAsesor() { Object.assign(AS, { conv: [], api: [], foto: null, claves: { google: null }, cargada: false, gasto: 0, convs: null, convId: null, aFondo: false }); }

/* 0.8.2 · las conversaciones guardadas: hasta 20, cifradas con la clave de la cartera en este dispositivo (no salen de él),
   sin los recortes de pantalla. La que tienes abierta se guarda en la lista según la usas; se abren, se siguen y se borran
   desde el panel de la IA */
const LS_CONVS = 'inv-asesor-convs', MAX_CONVS = 20;
const nuevoIdConv = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// los recortes (imágenes) no se guardan en la lista: ocupan mucho y se pueden volver a hacer
const apiSinImagenes = (api) => api.map((m) => (Array.isArray(m.content) ? { ...m, content: m.content.filter((p) => !p.inlineData) } : m)).filter((m) => typeof m.content === 'string' || m.content.length);
let CONVS_P = null;   // la carga en curso: dos llamadas a la vez esperan la misma (no se ve una lista vacía a medias)
function cargarConvs() {
  if (AS.convs) return Promise.resolve(AS.convs);
  // sin la clave de la cartera no se puede leer: no se guarda en caché una lista vacía (la siguiente escritura borraría las de antes)
  if (!S.key) return Promise.resolve([]);
  if (CONVS_P) return CONVS_P;
  // (sin nada guardado, la función de dentro acaba sin esperar a nada: si borrara CONVS_P dentro, lo haría antes de que
  // se asigne y se quedaría para siempre una carga vieja; tras cerrar sesión, la lista se quedaba en null)
  const p = (async () => {
    let l = [];
    const h = LS.get(LS_CONVS);
    if (h && S.key) { try { l = (await descifrarLocal(h)).lista || []; } catch (e) { LS.del(LS_CONVS); } }
    AS.convs = AS.convs || l;
    return AS.convs;
  })();
  CONVS_P = p; p.finally(() => { if (CONVS_P === p) CONVS_P = null; });
  return p;
}
// con tope de tamaño (unos 600 KB en texto): si no cabe, fuera las más viejas; la cartera manda sobre las conversaciones
const MAX_CONVS_TXT = 600e3;
async function guardarConvs() {
  if (!S.key || S.demo) return;
  try {
    const l = (AS.convs || []).slice(0, MAX_CONVS);
    while (l.length > 1 && JSON.stringify(l).length > MAX_CONVS_TXT) l.pop();
    if (l.length) LS.set(LS_CONVS, await cifrarLocal({ lista: l })); else LS.del(LS_CONVS);
  } catch (e) {}
}
async function archivarConv() {
  if (!S.key || S.demo) return;
  const yo = AS.conv.find((t) => t.rol === 'yo'); if (!yo) return;
  // la foto se hace antes de esperar a nada: si mientras tanto abres otra o empiezas una nueva, se guarda la de ahora
  AS.convId = AS.convId || nuevoIdConv();
  const c = { id: AS.convId, t: Date.now(), titulo: String(yo.texto || '').slice(0, 90), n: AS.conv.filter((t) => t.rol === 'yo').length, conv: AS.conv.slice(-60).map(({ adj, mini, ...t }) => t), api: apiSinImagenes(AS.api.slice(-24)) };
  await cargarConvs();
  AS.convs = [c, ...(AS.convs || []).filter((x) => x.id !== c.id)].slice(0, MAX_CONVS);
  await guardarConvs();
}
/* 0.8.2: la lista entera (hasta 20 conversaciones, unos 600 KB) ya no se cifra en cada respuesta. La conversación abierta
   se guarda al momento (guardarConv, poca cosa) y pasa a la lista 20 s después de la última respuesta, o antes si
   cierras el panel, empiezas otra, abres otra o sales de la app. Si la app se cierra antes, la pasa cargarAsesor. */
let ARCHIVO_T = null;
function archivarLuego() { clearTimeout(ARCHIVO_T); ARCHIVO_T = setTimeout(() => { ARCHIVO_T = null; archivarConv(); }, 20e3); }
function archivarYa(siempre = false) {
  if (!ARCHIVO_T && !siempre) return Promise.resolve();
  clearTimeout(ARCHIVO_T); ARCHIVO_T = null;
  return archivarConv();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) archivarYa(); });
addEventListener('pagehide', () => { archivarYa(); });
function abrirConv(id) {
  const c = (AS.convs || []).find((x) => x.id === id); if (!c) return false;
  if (AS.ctrl) AS.ctrl.abort();
  archivarYa();
  AS.conv = c.conv.map((t) => ({ ...t })); AS.api = c.api.slice(); AS.convId = c.id; AS.foto = null; AS.aFondo = false; AS.vista = 'chat';
  guardarConv();
  return true;
}
async function borrarConv(id) {
  // si borras la que tienes abierta (o todas), se para y se vacía antes de nada (una respuesta que acabe ahora no la recupera)
  if (!id || id === AS.convId) { clearTimeout(ARCHIVO_T); ARCHIVO_T = null; if (AS.ctrl) AS.ctrl.abort(); AS.conv = []; AS.api = []; AS.foto = null; AS.convId = null; LS.del('inv-asesor-conv'); }
  await cargarConvs();
  AS.convs = id ? (AS.convs || []).filter((x) => x.id !== id) : [];
  await guardarConvs();
}

/* guarda la cartera sin avisos ni descargas (para lo que hace la web sola, como el análisis diario) */
async function guardarCarteraCallada(mensaje) {
  if (!S.key || !S.cartera || S.demo) return false;
  if (PERFIL_LOCAL) return guardarLocal();
  S.cartera.actualizado = new Date().toISOString();
  const texto = await cifrar(S.cartera);
  if (CFG.dev) { LS.set('inv-dev-enc', texto); S.enc = { texto, sha: null }; return true; }
  LS.set('inv-cache-enc', texto);
  if (!GH.token()) { LS.set('inv-pend-enc', texto); return false; }
  try { const sha = await GH.escribir('cartera.enc.json', texto, mensaje); S.enc = { texto, sha }; LS.del('inv-pend-enc'); return true; } catch (e) { console.warn(e); LS.set('inv-pend-enc', texto); return false; }
}
/* cambios que no se pudieron subir (sin token o sin conexión): si son más nuevos que lo de GitHub, mandan,
   y en cuanto hay token se suben solos */
async function aplicarPendiente() {
  const t = LS.get('inv-pend-enc');
  if (!t || !S.key || PERFIL_LOCAL || CFG.dev) return;
  try {
    const c = await descifrar(t, S.key);
    if (S.cartera && (c.actualizado || '') <= (S.cartera.actualizado || '')) { LS.del('inv-pend-enc'); return; }
    S.cartera = c;
    if (GH.token() && await guardarCarteraCallada('Cambios hechos sin conexión')) toast('Subidos a GitHub los cambios que hiciste sin conexión', 5000);
  } catch (e) { console.warn('Cambios pendientes que no se pueden leer', e); }
}

