/* =====================================================================
   0.8.3d · Cómo se llega al Worker (la IA, el banco, la búsqueda por ISIN y los correos).

   Durante los partidos de LaLiga, los operadores españoles bloquean IP compartidas de Cloudflare, y entre ellas caen las
   del Worker (8 nov: desde el wifi de Carlos llegaban cloudflare.com y workers.dev, pero no el Worker). Dos cosas:

   1. El relevo (relevo/servidor.mjs, en Google Cloud Run): si el Worker no llega, la misma petición va por el relevo, que
      la reenvía al Worker desde Google (entre servidores no hay bloqueo) y devuelve la respuesta en directo. Se prueba
      primero el Worker; si no llega, se va por el relevo media hora sin volver a probar. Mientras RELEVO esté vacío (aún
      no existe el servicio), todo va al Worker como siempre.
   2. El aviso claro: si al final no se llega, se mira si llega nuestra propia página (version.json, que no está en
      Cloudflare). Si llega la página y no el Worker (ni el relevo), es el bloqueo: se dice tal cual, con qué hacer.
   ===================================================================== */
// la dirección del relevo en Cloud Run (…run.app), cuando exista. Vacía: no hay relevo
const RELEVO = '';
// en pruebas (?dev, o RELEVO_PRUEBA desde Playwright) se puede apuntar a otro
let RELEVO_PRUEBA = '';
const urlRelevo = () => (CFG.dev && LS.get('inv-relevo-dev', '')) || RELEVO_PRUEBA || RELEVO;
const LS_RUTA_WORKER = 'inv-ruta-worker';
const RUTA_RELEVO_MS = 30 * 6e4;
// sin cabeceras del Worker en este tiempo, se da por no llegado y se va por el relevo (solo si hay relevo). La IA empieza
// a contestar (las cabeceras) en 1–3 s; un Worker bloqueado no contesta nunca
const ESPERA_WORKER = { normal: 12000, sondeo: 6000 };
function porRelevo() {
  if (!urlRelevo()) return false;
  const r = LS.get(LS_RUTA_WORKER, null);
  return !!(r && r.hasta > Date.now());
}
function irPorRelevo(motivo) {
  try { LS.set(LS_RUTA_WORKER, { hasta: Date.now() + RUTA_RELEVO_MS, motivo }); } catch (e) {}
  try { diarioIA(`El Worker no llega (${motivo}): va por el relevo media hora`); } catch (e) {}
}
function volverAlWorker() { try { LS.del(LS_RUTA_WORKER); } catch (e) {} }
// un fallo de la conexión (no una respuesta con error, ni que lo pares tú)
const falloConexion = (e) => !!e && e.name !== 'AbortError' && (e instanceof TypeError || !!e.sinRespuesta || /Failed to fetch|NetworkError|network error|Load failed|ERR_/i.test(e.message || ''));
// por dónde fue la última petición al Worker (para el registro de la IA y las pruebas)
let VIA_WORKER = 'worker';

/* fetch al Worker con el relevo detrás. ruta: '/claude', '/isin?c=…'… init: lo de fetch (el cuerpo, en texto, para
   poder mandarlo otra vez). espera: cuánto se espera a las cabeceras del Worker antes de ir por el relevo */
async function fetchWorker(ruta, init = {}, { espera = ESPERA_WORKER.normal } = {}) {
  const relevo = urlRelevo(), signal = init.signal || null;
  const por = async (base, quien, ms) => {
    const ctl = new AbortController(); let porTiempo = false;
    // tu «parar» corta también la respuesta que ya llega (por eso no se quita al llegar las cabeceras)
    if (signal) { if (signal.aborted) ctl.abort(); else signal.addEventListener('abort', () => ctl.abort(), { once: true }); }
    const t = ms ? setTimeout(() => { porTiempo = true; ctl.abort(); }, ms) : 0;
    try {
      const r = await fetch(base + ruta, { ...init, signal: ctl.signal });
      VIA_WORKER = quien;
      return r;
    } catch (e) {
      if (porTiempo && !(signal && signal.aborted)) { const x = new TypeError(`Failed to fetch (sin respuesta en ${Math.round(ms / 1000)} s)`); x.sinRespuesta = true; throw x; }
      throw e;
    } finally { clearTimeout(t); }
  };
  if (!relevo) return por(urlWorker(), 'worker', 0);
  if (porRelevo()) {
    try { return await por(relevo, 'relevo', 0); }
    catch (e) {
      // el relevo tampoco: se vuelve a probar el Worker (quizá ya acabó el partido)
      if (!falloConexion(e) || (signal && signal.aborted)) throw e;
      volverAlWorker();
      return por(urlWorker(), 'worker', 0);
    }
  }
  try { return await por(urlWorker(), 'worker', espera); }
  catch (e) {
    if (!falloConexion(e) || (signal && signal.aborted)) throw e;
    irPorRelevo(e.sinRespuesta ? 'sin respuesta' : 'conexión');
    return por(relevo, 'relevo', 0);
  }
}

/* el aviso claro (opción 1): ¿es el bloqueo? Sí si llega nuestra página (fuera de Cloudflare) y no llegan ni el Worker
   ni, si lo hay, el relevo. Con HEAD (el service worker no la guarda) y sin caché. Se recuerda un minuto */
let BLOQUEO_VISTO = null;
async function llega(url, ms, init = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { await fetch(url, { cache: 'no-store', ...init, signal: ctl.signal }); return true; }
  catch (e) { return false; }
  finally { clearTimeout(t); }
}
async function esBloqueoWorker() {
  if (BLOQUEO_VISTO && Date.now() - BLOQUEO_VISTO.t < 6e4) return BLOQUEO_VISTO.si;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const relevo = urlRelevo();
  const [pagina, worker, porElRelevo] = await Promise.all([
    llega(new URL('version.json', location.href).href, 4000, { method: 'HEAD' }),
    llega(urlWorker() + '/salud', 5000),
    relevo ? llega(relevo + '/salud', 5000) : Promise.resolve(false),
  ]);
  const si = pagina && !worker && !porElRelevo;
  BLOQUEO_VISTO = { t: Date.now(), si };
  try { if (si) diarioIA('Llega Toisón pero no el Worker: bloqueo de la red (fútbol)'); } catch (e) {}
  return si;
}
const TXT_BLOQUEO = () => L('No llega al servidor de la IA. En España, durante los partidos de LaLiga, algunos operadores bloquean parte de internet. Vuelve a probar al acabar el partido o con los datos de otro operador.', "Can't reach the AI server. In Spain, during LaLiga football matches, some internet providers block part of the internet. Try again after the match or using another provider's mobile data.");
