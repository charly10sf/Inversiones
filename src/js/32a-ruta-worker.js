/* =====================================================================
   0.8.3d · Cómo se llega al Worker (la IA, el banco, la búsqueda por ISIN y los correos).

   Durante los partidos de LaLiga, los operadores españoles bloquean IP compartidas de Cloudflare, y entre ellas caen las
   del Worker (8 nov: desde el wifi de Carlos llegaban cloudflare.com y workers.dev, pero no el Worker). Dos cosas:

   1. El relevo (relevo/servidor.mjs, en Google Cloud Run): reenvía al Worker desde Google (entre servidores no hay
      bloqueo) y devuelve la respuesta en directo. Por dónde ir lo decide un sondeo barato (GET /salud, sin cuerpo ni
      token), nunca cortando una petición de verdad a mitad: así una petición lenta no se manda dos veces (el código de un
      solo uso del banco, un correo, una ronda de la IA). Si el Worker llega, se recuerda 10 minutos; si no, se va por el
      relevo media hora. Con RELEVO vacío, todo iría al Worker como antes.
   2. El aviso claro: si al final no se llega, se mira si llega nuestra propia página (version.json, fuera de Cloudflare).
      Si llega la página y no el Worker (ni el relevo), se dice que no llega al servidor y, en España, que puede ser el
      bloqueo del fútbol, con qué hacer.
   ===================================================================== */
// la dirección del relevo en Cloud Run (proyecto toison-relevo, Madrid; relevo/LEEME.md). Vacía: no hay relevo
const RELEVO = 'https://toison-relevo-538254811177.europe-southwest1.run.app';
// en pruebas (?dev, o RELEVO_PRUEBA desde Playwright) se puede apuntar a otro; las pruebas van sin relevo
// (inv-sin-relevo, que pone tests/ayuda.js) salvo las que lo prueban
let RELEVO_PRUEBA = '';
const urlRelevo = () => (CFG.dev && LS.get('inv-relevo-dev', '')) || RELEVO_PRUEBA || (LS.get('inv-sin-relevo', false) ? '' : RELEVO);
const LS_RUTA_WORKER = 'inv-ruta-worker';
const RUTA_MS = { relevo: 30 * 6e4, worker: 10 * 6e4 };
// lo que espera el sondeo de la ruta (GET /salud) antes de dar el Worker por no llegado
const ESPERA_WORKER = { sondeo: 5000 };
function rutaGuardada() {
  if (!urlRelevo()) return 'worker';
  const r = LS.get(LS_RUTA_WORKER, null);
  return r && r.hasta > Date.now() && (r.via === 'relevo' || r.via === 'worker') ? r.via : null;
}
const porRelevo = () => rutaGuardada() === 'relevo';
function guardarRuta(via, motivo) {
  try { LS.set(LS_RUTA_WORKER, { via, hasta: Date.now() + RUTA_MS[via], motivo }); } catch (e) {}
  if (via === 'relevo') try { diarioIA(`El Worker no llega (${motivo}): va por el relevo media hora`); } catch (e) {}
}
const irPorRelevo = (motivo) => guardarRuta('relevo', motivo);
function volverAlWorker() { try { LS.del(LS_RUTA_WORKER); } catch (e) {} }
// un fallo de la conexión (no una respuesta con error, ni que lo pares tú)
const falloConexion = (e) => !!e && e.name !== 'AbortError' && (e instanceof TypeError || /Failed to fetch|NetworkError|network error|Load failed|ERR_/i.test(e.message || ''));
// por dónde fue la última petición al Worker (para el registro de la IA y las pruebas)
let VIA_WORKER = 'worker';

/* ¿llega? Una petición sin cuerpo ni token. Con no-cors, una respuesta opaca ya cuenta (no depende de la lista de sitios
   del Worker); con HEAD, el service worker no guarda nada */
async function llega(url, ms, init = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { await fetch(url, { cache: 'no-store', mode: 'no-cors', credentials: 'omit', ...init, signal: ctl.signal }); return true; }
  catch (e) { return false; }
  finally { clearTimeout(t); }
}
/* por dónde ir ahora: lo guardado o, si no hay nada (o con «dudar»), el sondeo. Varias peticiones a la vez esperan al
   mismo sondeo */
let SONDEO_RUTA = null;
async function rutaWorker(dudar = false) {
  if (!urlRelevo()) return 'worker';
  const g = dudar ? null : rutaGuardada();
  if (g) return g;
  if (!SONDEO_RUTA) SONDEO_RUTA = (async () => {
    const si = await llega(urlWorker() + '/salud', ESPERA_WORKER.sondeo);
    if (si) guardarRuta('worker'); else irPorRelevo('sondeo');
    return si ? 'worker' : 'relevo';
  })().finally(() => { SONDEO_RUTA = null; });
  return SONDEO_RUTA;
}
// tras un fallo sin respuesta: la próxima vez se vuelve a mirar por dónde ir
function dudarDelWorker() { if (rutaGuardada() === 'worker') volverAlWorker(); }

/* fetch al Worker con el relevo detrás. ruta: '/claude', '/isin?c=…'… init: lo de fetch (el cuerpo, en texto).
   repetible: si la petición se queda sin respuesta (conexión cortada), se puede mandar otra vez por el otro camino. Solo
   en lo que no pasa nada por repetir: las lecturas (GET) y la IA, que ya se repetía tras un corte y el Worker cuenta por
   id de pregunta; no en el código del banco ni en los correos (esos, la próxima vez ya van por el camino bueno) */
async function fetchWorker(ruta, init = {}, { repetible = (init.method || 'GET') === 'GET' } = {}) {
  const relevo = urlRelevo(), signal = init.signal || null;
  const por = async (quien) => {
    const r = await fetch((quien === 'relevo' ? relevo : urlWorker()) + ruta, init);
    VIA_WORKER = quien;
    return r;
  };
  if (!relevo) return por('worker');
  const via = await rutaWorker();
  if (signal && signal.aborted) throw new DOMException('Parado', 'AbortError');
  try { return await por(via); }
  catch (e) {
    if (!falloConexion(e) || (signal && signal.aborted)) throw e;
    if (via === 'relevo') {
      // el relevo no llega: ¿y el Worker? (quizá ya acabó el partido)
      volverAlWorker();
      if (!(await llega(urlWorker() + '/salud', ESPERA_WORKER.sondeo))) throw e;
      guardarRuta('worker');
      if (!repetible) throw e;
      return por('worker');
    }
    // el Worker no llega: si el sondeo lo confirma, por el relevo (esta misma, si se puede repetir; si no, la próxima)
    if ((await rutaWorker(true)) !== 'relevo' || !repetible) throw e;
    return por('relevo');
  }
}

/* el aviso claro (opción 1): ¿es el bloqueo? Sí si llega nuestra página (fuera de Cloudflare) y no llegan ni el Worker
   ni, si lo hay, el relevo. Se recuerda un minuto */
let BLOQUEO_VISTO = null;
async function esBloqueoWorker() {
  if (BLOQUEO_VISTO && Date.now() - BLOQUEO_VISTO.t < 6e4) return BLOQUEO_VISTO.si;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const relevo = urlRelevo();
  const [pagina, worker, porElRelevo] = await Promise.all([
    llega(new URL('version.json', location.href).href, 4000, { method: 'HEAD', mode: 'same-origin' }),
    llega(urlWorker() + '/salud', 5000),
    relevo ? llega(relevo + '/salud', 5000) : Promise.resolve(false),
  ]);
  const si = pagina && !worker && !porElRelevo;
  BLOQUEO_VISTO = { t: Date.now(), si };
  if (!worker) dudarDelWorker();
  try { if (si) diarioIA('Llega Toisón pero no el Worker: bloqueo de la red'); } catch (e) {}
  return si;
}
// en España (por la zona horaria del dispositivo) se nombra el fútbol; fuera, solo que la red no deja llegar
function enEspana() { try { return /^(Europe\/Madrid|Atlantic\/Canary|Africa\/Ceuta)$/.test(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); } catch (e) { return false; } }
const TXT_BLOQUEO = () => (enEspana()
  ? L('No llega al servidor de la IA, aunque tienes internet. Si hay partido de LaLiga, puede ser el bloqueo que hacen algunos operadores durante los partidos: vuelve a probar al acabar el partido o con los datos de otro operador.', "Can't reach the AI server, although you're online. If there's a LaLiga match on, it may be the blocking some Spanish providers apply during matches: try again after the match or using another provider's mobile data.")
  : L('No llega al servidor de la IA, aunque tienes internet: puede que tu red lo esté bloqueando. Vuelve a probar en un rato o con otra conexión.', "Can't reach the AI server, although you're online: your network may be blocking it. Try again in a while or on another connection."));
