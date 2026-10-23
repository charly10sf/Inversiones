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
    // «red» es la conexión de quien pregunta (y su aviso llegaría tarde, quizá ya en otro día); lo previsto (la
    // revisión automática que se deja para mañana sin cupo) no es un fallo
    if (!e || e.name === 'AbortError' || e.previsto || !PERFIL_CUENTA || !FB.user || !FB.fs || CFG.dev) return;
    const tipo = tipoFalloIA(e), v = String(VERSION);
    if (tipo === 'red' || !/^[0-9]{1,2}([.][0-9]{1,2}){1,2}[a-z]?$/.test(v)) return;
    const dia = new Date().toISOString().slice(0, 10), c = LS.get('inv-fallos-ia', {}) || {};
    if (c.pausa && Date.now() < c.pausa) return;
    const n0 = c.d === dia ? c.n || 0 : 0;
    const f = FB.fs, mod = modelo || AS.modeloVivo || null;
    const datos = { t: f.serverTimestamp(), caduca: new Date(Date.now() + 30 * 864e5), tipo, estado: Number.isInteger(e.estado) ? e.estado : null, modelo: /^gemini-[0-9a-z.-]{1,32}$/.test(mod || '') ? mod : null, donde, v };
    // si otro dispositivo de la misma cuenta ya ha usado ese número, las reglas lo rechazan: se prueba con el siguiente.
    // El contador solo avanza con lo que entra; si no entra ninguno (el reloj de este dispositivo no va con el del
    // servidor, o ya van 5 hoy), una hora de pausa
    for (let n = n0; n < 5; n++) {
      try { await conTiempo(f.setDoc(f.doc(FB.db, 'fallos_ia', `${FB.user.uid}_${dia.replace(/-/g, '')}_${n}`), datos), 10000); LS.set('inv-fallos-ia', { d: dia, n: n + 1 }); return; }
      catch (x) { if (!/permission/i.test(String((x && (x.code || x.message)) || ''))) return; }
    }
    LS.set('inv-fallos-ia', { d: dia, n: n0, pausa: Date.now() + 36e5 });
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
/* 0.7: lo que ve la persona es GrowIA, normal o rápida; los modelos de Google, en Ajustes de GrowIA (y en la
   privacidad). La normal es el 3.8 y, cuando se le acaba el cupo, el 3.6: los dos piensan a fondo, así que su cupo
   se cuenta junto (20 + 20) */
const esRapida = (m) => m === MODELO_RAPIDO;
function cupoNormalTxt(u = usoIAHoy()) {
  const ks = Object.keys(CUPO_DIA), n = ks.reduce((a, k) => a + (u[k] || 0), 0), tot = ks.reduce((a, k) => a + CUPO_DIA[k], 0);
  return n > tot && !ks.every((k) => agotadosIA().includes(k)) ? L(`${n} hoy`, `${n} today`) : L(`${Math.min(n, tot)} de ${tot} hoy`, `${Math.min(n, tot)} of ${tot} today`);
}
/* debajo del nombre de GrowIA, solo lo que sirve: si contesta la rápida porque la normal se ha quedado sin cupo, o
   si a la normal le quedan 5 o menos hoy; si no, una frase fija */
function subtituloIA(cfg = cfgAsesor()) {
  const vivo = modeloVivo(cfg);
  if (esRapida(vivo) && !esRapida(cfg.modelo)) return L('La respuesta normal ha gastado su cupo de hoy: contesta la rápida', "The normal answer has used up today's quota: the fast one replies");
  if (!esRapida(vivo)) {
    const u = usoIAHoy(), ks = Object.keys(CUPO_DIA), n = ks.reduce((a, k) => a + (u[k] || 0), 0), tot = ks.reduce((a, k) => a + CUPO_DIA[k], 0);
    const quedan = tot - n;
    if (quedan >= 0 && quedan <= 5) return quedan === 1 ? L('Te queda 1 respuesta normal hoy', 'You have 1 normal answer left today') : L(`Te quedan ${quedan} respuestas normales hoy`, `You have ${quedan} normal answers left today`);
  }
  return L('Con tu cartera y las noticias de hoy', "With your portfolio and today's news");
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

