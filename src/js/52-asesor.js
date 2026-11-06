/* =====================================================================
   La IA de Toisón (antes el asesor con Gemini)
   Desde la 0.8.2b contesta Claude, de Anthropic, por el Worker de Toisón (55-asesor-contexto.js): nadie pone
   clave. Al empezar cada conversación recibe una foto de tu cartera y usa herramientas que calculan con el motor
   de la web: ventas con FIFO e IRPF, compras con su tasa, empresas del radar, proyecciones e histórico.
   0.8.2d: fuera lo que quedaba de Gemini (sus modelos, los cupos diarios de Google y la clave de cada uno).
   ===================================================================== */
/* 0.7: un fallo de GrowIA que no se ha arreglado solo, apuntado para el dueño (Firestore fallos_ia): de qué tipo, con
   qué modelo, dónde y el código de error. Sin la pregunta, sin la respuesta y sin nada de la cartera. Como mucho 5 al
   día desde cada dispositivo; sin cuenta o sin red, nada */
function tipoFalloIA(e) {
  const m = String((e && e.message) || '');
  if (e && e.corte) return 'corte';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'red';
  if (e && e.estado === 429) return e.diario ? 'cupo' : 'espera';
  if (e && e.estado >= 500) return 'google';
  // un 400 es una clave mal copiada solo si el servidor lo dice; si no, es la petición (demasiado larga, una herramienta…)
  if (e && ([401, 403, 404].includes(e.estado) || (e.estado === 400 && /API.?key|clave no es válida/i.test(`${e.msg || ''} ${m}`)))) return 'clave';
  if (e && e.estado === 400) return 'peticion';
  if (/bloqueado|filtros/i.test(m)) return 'bloqueo';
  if (/no ha devuelto respuesta|no ha llegado completa/i.test(m)) return /completa/.test(m) ? 'formato' : 'vacia';
  return 'otro';
}
/* Revisión aparte de la 0.7: el tope de 5 al día lo ponen las reglas de Firestore, no solo este dispositivo. Cada
   aviso es el documento «<uid>_<AAAAMMDD>_<0 a 4>» (día de UTC) y no se puede reescribir: el sexto del día no entra.
   La hora la pone el servidor y a los 30 días caduca: lo borra el dueño al abrir la app (limpiarFallosIA, en 42-modos.js) */
async function avisarFalloIA(e, donde = 'chat', modelo = null) {
  try {
    // «red» es la conexión de quien pregunta (y su aviso llegaría tarde, quizá ya en otro día); lo previsto (la
    // revisión automática que se deja para mañana sin cupo) no es un fallo
    if (!e || S.demo || e.name === 'AbortError' || e.previsto || !PERFIL_CUENTA || !FB.user || !FB.fs || CFG.dev) return;
    const tipo = tipoFalloIA(e), v = String(VERSION);
    if (tipo === 'red' || !/^[0-9]{1,2}([.][0-9]{1,2}){1,2}[a-z]?$/.test(v)) return;
    const dia = new Date().toISOString().slice(0, 10), c = LS.get('inv-fallos-ia', {}) || {};
    if (c.pausa && Date.now() < c.pausa) return;
    const n0 = c.d === dia ? c.n || 0 : 0;
    const f = FB.fs, mod = modelo || null;
    // el modelo: las reglas de Firestore solo aceptan los nombres de Gemini de antes, así que con Claude va vacío
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
/* 0.7l: el registro de GrowIA. Qué hace cada respuesta (con qué modelo, cuánto tarda en llegar el primer dato y en
   acabar, cada corte y por qué, si GrowFolio estaba a la vista) y, en la app de Android, el servicio y la red. Sin la
   pregunta, la respuesta ni nada de la cartera. Solo en este dispositivo (los últimos 80); se ve y se copia en Ajustes
   de GrowIA, para saber dónde falla cuando algo va mal en un móvil que no se puede probar desde aquí */
const DIARIO_IA = 'inv-ia-diario';
function diarioIA(x) {
  try { const d = LS.get(DIARIO_IA, []); const v = Array.isArray(d) ? d : []; v.push({ t: Date.now(), x: String(x).slice(0, 200) }); LS.set(DIARIO_IA, v.slice(-80)); } catch (e) {}
}
const deApp = (m, ...a) => { try { const p = window.InversionesApp; return p && typeof p[m] === 'function' ? p[m](...a) : null; } catch (e) { return null; } };
function diarioIATodo() {
  let app = []; try { app = JSON.parse(deApp('diarioApp') || '[]') || []; } catch (e) {}
  const web = LS.get(DIARIO_IA, []);
  return [...(Array.isArray(web) ? web : []), ...(Array.isArray(app) ? app : []).map((x) => ({ ...x, app: true }))].filter((x) => x && x.t && x.x).sort((a, b) => a.t - b.t).slice(-60);
}
function textoDiarioIA() {
  const h = (t) => new Date(t).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  // 0.7r: arriba, los tokens por pregunta (55-asesor-contexto)
  const tiempos = typeof resumenTokensIA === 'function' ? resumenTokensIA() : '';
  return (tiempos ? `${tiempos}\n\n` : '') + diarioIATodo().map((x) => `${h(x.t)} ${x.app ? '[app] ' : ''}${x.x}`).join('\n');
}
// la red y el servicio de la app, para el registro (en el navegador, nada)
const redIA = () => { const r = deApp('red'); return r ? ` · ${r}` : navigator.onLine === false ? ' · sin red' : ''; };
/* debajo del nombre de la IA, solo lo que sirve: cuántas preguntas te quedan hoy (lo dice el Worker) y, con «A fondo»
   elegido en el nivel reducido, cuántas «A fondo»; si no, una frase fija. Corto: en un móvil de 360 px no da para más */
function subtituloIA() {
  const n = quedanClaude(), f = quedanFondoClaude();
  if (n === 0) return L('Sin preguntas hasta mañana', 'No more questions until tomorrow');
  if (AS.aFondo && f === 0) return L('Sin «A fondo» hasta mañana', 'No "In depth" until tomorrow');
  if (AS.aFondo && f != null) return f === 1 ? L('1 «A fondo» más hoy', '1 more "In depth" today') : L(`${f} «A fondo» más hoy`, `${f} more "In depth" today`);
  if (n != null) return n === 1 ? L('1 pregunta más hoy', '1 more question today') : L(`${n} preguntas más hoy`, `${n} more questions today`);
  return L('Con tu cartera y las noticias de hoy', "With your portfolio and today's news");
}
const AS = { conv: [], api: [], foto: null, fotoT: 0, cargando: false, ctrl: null, vista: 'chat', cargada: false, sinWeb: false, gasto: 0 };
// lo que eliges en Ajustes de la IA: si puede buscar en internet y cada cuánto revisa tu cartera
function cfgAsesor() {
  const c = LS.get('inv-asesor-cfg2', {});
  return { web: c.web !== false, webPedida: c.web !== false, auto: ['diario', 'semanal', 'manual'].includes(c.auto) ? c.auto : 'diario' };
}
const guardarCfgAsesor = (o) => LS.set('inv-asesor-cfg2', { ...LS.get('inv-asesor-cfg2', {}), ...o });
const nombreIA = () => 'La IA';
/* 0.8.2d: lo que guardaba cada uno de Gemini en este dispositivo (la clave de Google cifrada, los cupos del día y los
   tiempos de cada modelo), fuera. Con cualquier perfil (inv-, invL-, invC-); en la cartera de prueba no se toca nada */
const LS_GEMINI_VIEJO = ['asesor-clave', 'asesor-clave-g', 'ia-agotados', 'ia-uso', 'ia-lento', 'ia-tiempos'];
function borrarGeminiViejo() {
  if (LS_DEMO) return;
  try { for (const p of ['inv-', 'invL-', 'invC-']) for (const k of LS_GEMINI_VIEJO) localStorage.removeItem(p + k); } catch (e) {}
}
const R2 = (n, d = 2) => (n == null || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
const E0 = (n) => fmtNum(n, 0) + ' €', E2 = (n) => fmtNum(n, 2) + ' €';
const eurP = (n, d = 2) => (n > 0 ? '+' : '') + fmtNum(n, d) + ' €';
const P1 = (n) => (n == null || !isFinite(n) ? '—' : pctS(n, 1));
const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const nombreInst = (id) => (S.inst[id] && (S.inst[id].corto || S.inst[id].nombre)) || id;

