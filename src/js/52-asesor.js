/* =====================================================================
   Asesor: Gemini dentro de la web
   Habla con la API de Gemini (Google AI Studio) directamente desde tu navegador y con tu propia clave:
   no pasa por GitHub ni por ningún servidor intermedio. La clave se guarda cifrada con la misma clave
   que tu cartera. Al empezar cada conversación recibe una foto de tu cartera y usa herramientas que
   calculan con el motor de la web: ventas con FIFO e IRPF, compras con su tasa, empresas del radar,
   proyecciones e histórico.
   ===================================================================== */
/* La IA de la web es Gemini, de Google, con una clave gratuita de Google AI Studio. */
const MODELOS = {
  'gemini-3.8-flash': { n: 'Gemini 3.8 Flash', corto: '3.8 Flash', prov: 'google', gratis: true, pensar: 'high', txt: 'El más listo de los gratuitos: piensa a fondo, pero su cupo diario es el que antes se acaba.' },
  'gemini-3.6-flash': { n: 'Gemini 3.6 Flash', corto: '3.6 Flash', prov: 'google', gratis: true, pensar: 'high', txt: 'Casi igual de bueno y con su propio cupo. Si el 3.8 se agota, GrowFolio salta a este solo.' },
  'gemini-3.5-flash-lite': { n: 'Gemini 3.5 Flash-Lite', corto: 'Flash-Lite', prov: 'google', gratis: true, txt: 'El rápido: contesta en segundos, no piensa tanto y su cupo diario es mucho más amplio. Para el día a día.' },
};
const MODELO_DEF = 'gemini-3.8-flash', MODELO_RAPIDO = 'gemini-3.5-flash-lite';
/* Cada modelo gratuito tiene su propio cupo diario, que Google renueva a medianoche de California (las 9:00
   en España en verano). Cuando uno se agota, la web lo apunta y sigue con el siguiente de esta lista. */
const CADENA_IA = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
const diaGoogle = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const agotadosIA = () => { const a = LS.get('inv-ia-agotados', {}), d = diaGoogle(); return Object.keys(a).filter((k) => a[k] === d); };
/* 0.7: cuántas peticiones lleva hoy cada modelo desde este dispositivo. El cupo es de la clave (si la usas en otro
   sitio, también gasta): es una cuenta aproximada, para que se vea cuánto queda */
const CUPO_DIA = { 'gemini-3.8-flash': 20, 'gemini-3.6-flash': 20 };
function contarPeticion(url) {
  const m = /\/models\/([^:/?]+):(?:streamGenerateContent|generateContent)/.exec(String(url || ''));
  if (!m) return;
  const d = diaGoogle(), u = LS.get('inv-ia-uso', {}), hoy = u && u.d === d ? u : { d, m: {} };
  hoy.m[m[1]] = (hoy.m[m[1]] || 0) + 1;
  LS.set('inv-ia-uso', hoy);
}
/* 0.7: un fallo de GrowIA que no se ha arreglado solo, apuntado para el dueño (Firestore fallos_ia): de qué tipo, con
   qué modelo, dónde y el código de Google. Sin la pregunta, sin la respuesta y sin nada de la cartera. Como mucho 5 al
   día desde cada dispositivo; sin cuenta o sin red, nada */
function tipoFalloIA(e) {
  const m = String((e && e.message) || '');
  if (e && e.corte) return 'corte';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'red';
  if (e && e.estado === 429) return e.diario ? 'cupo' : 'espera';
  if (e && e.estado >= 500) return 'google';
  // un 400 es una clave mal copiada solo si Google lo dice; si no, es la petición (demasiado larga, una herramienta…)
  if (e && ([401, 403, 404].includes(e.estado) || (e.estado === 400 && /API.?key|clave no es válida/i.test(`${e.msg || ''} ${m}`)))) return 'clave';
  if (e && e.estado === 400) return 'peticion';
  if (/bloqueado|filtros/i.test(m)) return 'bloqueo';
  if (/no ha devuelto respuesta|no ha llegado completa/i.test(m)) return /completa/.test(m) ? 'formato' : 'vacia';
  return 'otro';
}
/* Revisión aparte de la 0.7: el tope de 5 al día lo ponen las reglas de Firestore, no solo este dispositivo. Cada
   aviso es el documento «<uid>_<AAAAMMDD>_<0 a 4>» (día de UTC) y no se puede reescribir: el sexto del día no entra.
   La hora la pone el servidor y se borra solo a los 30 días (TTL de Firestore sobre «caduca») */
async function avisarFalloIA(e, donde = 'chat', modelo = null) {
  try {
    if (!e || e.name === 'AbortError' || !PERFIL_CUENTA || !FB.user || !FB.fs || CFG.dev) return;
    const dia = new Date().toISOString().slice(0, 10), c = LS.get('inv-fallos-ia', {});
    let n = c && c.d === dia ? c.n || 0 : 0;
    const f = FB.fs, mod = modelo || AS.modeloVivo || null;
    const datos = { t: f.serverTimestamp(), caduca: new Date(Date.now() + 30 * 864e5), tipo: tipoFalloIA(e), estado: Number.isInteger(e.estado) ? e.estado : null, modelo: /^gemini-[0-9a-z.-]{1,32}$/.test(mod || '') ? mod : null, donde, v: String(VERSION).slice(0, 12) };
    // si otro dispositivo de la misma cuenta ya ha usado ese número, las reglas lo rechazan: se prueba con el siguiente
    for (; n < 5; n++) {
      LS.set('inv-fallos-ia', { d: dia, n: n + 1 });
      try { await conTiempo(f.setDoc(f.doc(FB.db, 'fallos_ia', `${FB.user.uid}_${dia.replace(/-/g, '')}_${n}`), datos), 10000); return; }
      catch (x) { if (!/permission/i.test(String((x && (x.code || x.message)) || ''))) return; }
    }
  } catch (x) { /* sin red o sin permiso: nada */ }
}
/* a qué hora de aquí se renueva el cupo gratis: a medianoche de California (las 9:00 en España casi todo el año; las
   8:00 las semanas en que uno ha cambiado la hora y el otro no) */
function horaRenuevaIA() {
  try {
    const ahora = new Date();
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(ahora).map((x) => [x.type, x.value]));
    const pasado = ((+p.hour % 24) * 3600 + +p.minute * 60 + +p.second) * 1000;
    return new Date(ahora.getTime() + 864e5 - pasado).toLocaleTimeString(IDIOMA === 'en' ? 'en-GB' : 'es-ES', { hour: 'numeric', minute: '2-digit' });
  } catch (e) { return '9:00'; }
}
/* lo gastado hoy de un modelo con cupo conocido: «7 de 20»; si pasa de 20 sin agotarse (una clave de pago, o Google
   da más), solo la cuenta */
function cupoTxt(k, u = usoIAHoy()[k] || 0) {
  if (!CUPO_DIA[k]) return String(u);
  return u > CUPO_DIA[k] && !agotadosIA().includes(k) ? L(`${u} hoy`, `${u} today`) : L(`${Math.min(u, CUPO_DIA[k])} de ${CUPO_DIA[k]} hoy`, `${Math.min(u, CUPO_DIA[k])} of ${CUPO_DIA[k]} today`);
}
function usoIAHoy() { const u = LS.get('inv-ia-uso', {}); return u && u.d === diaGoogle() ? u.m || {} : {}; }
const marcarAgotado = (m) => { const d = diaGoogle(), a = Object.fromEntries(Object.entries(LS.get('inv-ia-agotados', {})).filter(([, v]) => v === d)); a[m] = d; LS.set('inv-ia-agotados', a); };
// la elegida y, detrás, las demás: primero las más baratas que ella y luego las más caras
function ordenIA(elegido) {
  const i = CADENA_IA.indexOf(elegido);
  return [elegido, ...(i < 0 ? CADENA_IA : [...CADENA_IA.slice(i + 1), ...CADENA_IA.slice(0, i).reverse()])].filter((m, k, v) => MODELOS[m] && v.indexOf(m) === k);
}
const modeloVivo = (cfg = cfgAsesor()) => { const fuera = agotadosIA(); return ordenIA(cfg.modelo).find((m) => !fuera.includes(m)) || cfg.modelo; };
const PROV = { google: { n: 'Google', ia: 'Gemini' } };
const AS = { conv: [], api: [], foto: null, fotoT: 0, claves: { google: null }, cargando: false, ctrl: null, vista: 'chat', cargada: false, sinWeb: false, gasto: 0 };
Object.defineProperty(AS, 'clave', { get() { return AS.claves[cfgAsesor().prov]; }, set(v) { AS.claves[cfgAsesor().prov] = v; } });
function cfgAsesor() {
  const c = LS.get('inv-asesor-cfg2', {});
  if (c.modelo && !MODELOS[c.modelo] && /^gemini-[\w.-]+$/.test(c.modelo)) MODELOS[c.modelo] = { n: c.modelo.replace(/^gemini-/, 'Gemini ').replace(/-/g, ' '), prov: 'google', gratis: true, txt: 'El Flash más nuevo que tiene tu clave.' };
  const modelo = MODELOS[c.modelo] ? c.modelo : MODELO_DEF;
  const prov = MODELOS[modelo].prov;
  const webFalla = prov === 'google' && !!c.web_falla && Date.now() - c.web_falla < 7 * 864e5;
  return { modelo, prov, web: c.web !== false && !webFalla, webPedida: c.web !== false, webFalla, auto: ['diario', 'semanal', 'manual'].includes(c.auto) ? c.auto : 'diario' };
}
const guardarCfgAsesor = (o) => LS.set('inv-asesor-cfg2', { ...LS.get('inv-asesor-cfg2', {}), ...o });
const nombreIA = () => 'GrowIA';
const LS_CLAVE = { google: 'inv-asesor-clave-g' }, CAMPO_CLAVE = { google: 'clave_g' };
const R2 = (n, d = 2) => (n == null || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
const E0 = (n) => fmtNum(n, 0) + ' €', E2 = (n) => fmtNum(n, 2) + ' €';
const eurP = (n, d = 2) => (n > 0 ? '+' : '') + fmtNum(n, d) + ' €';
const P1 = (n) => (n == null || !isFinite(n) ? '—' : pctS(n, 1));
const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const nombreInst = (id) => (S.inst[id] && (S.inst[id].corto || S.inst[id].nombre)) || id;

