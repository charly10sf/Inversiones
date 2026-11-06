/* =====================================================================
   0.7 · Cómo va la IA, para el dueño (Ajustes)
   El banco de preguntas (banco.json, los martes con Haiku, y banco-muestra.json, la muestra de los viernes con Sonnet,
   que escribe la Action del banco en la rama datos); lo que ha gastado la Action en 24 h (escaneo.json → ia.uso y
   ia.coste_24h; con un escaneo de antes, claude.uso o gemini.uso); y los fallos de la IA que no se arreglaron solos
   (Firestore fallos_ia, sin preguntas ni carteras).
   0.8.2d: sin Gemini (sus cupos de Google y lo que razonaba el 3.8); un banco de Gemini que quede, no se enseña.
   ===================================================================== */
// «red» y «cupo» son del lado de quien pregunta (su conexión, su tope del día), no de la IA: se cuentan, pero aparte.
// Los tipos son los de siempre (las reglas de Firestore solo aceptan esos); «google» es hoy el servidor de la IA
const TIPOS_FALLO = () => ({ corte: L('Se cortó la conexión tres veces', 'Connection dropped three times'), red: L('Sin conexión (la suya)', 'No connection (theirs)'), cupo: L('Tope del día agotado', 'Daily limit used up'),
  espera: L('El servidor pidió esperar', 'The server asked to wait'), google: L('Servidor de la IA saturado o caído', 'AI server overloaded or down'), clave: L('Sin permiso o modelo no válido', 'No permission or model not valid'), peticion: L('Petición rechazada', 'Request rejected'),
  bloqueo: L('Filtros de la IA', "The AI's filters"), vacia: L('Respuesta vacía', 'Empty answer'), formato: L('Revisión incompleta', 'Incomplete review'), otro: L('Otro', 'Other') });
const nombreModSalud = (m, corto) => { const x = MODELOS_CLAUDE[m]; return x ? (corto ? x.corto : x.n) : m || '—'; };
async function leerDatosRama(f) {
  try {
    const r = await fetch(CFG.dev ? `dev/${f}` : `${GH.raw(f, 'datos')}?v=${Math.floor(Date.now() / 600000)}`, { cache: 'no-cache' });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}
async function leerFallosIA() {
  try {
    await fbCargar();
    const f = FB.fs;
    const r = await conTiempo(f.getDocs(f.query(f.collection(FB.db, 'fallos_ia'), f.orderBy('t', 'desc'), f.limit(100))), 10000);
    // la hora la pone el servidor (un Timestamp de Firestore)
    return r.docs.map((d) => { const x = d.data() || {}; return { ...x, t: x.t && typeof x.t.toDate === 'function' ? x.t.toDate().toISOString() : String(x.t || '') }; });
  } catch (e) { return { error: e.message }; }
}
function htmlBancoIA(b, titulo) {
  // 0.8.2d: uno de Gemini que quede en la rama datos (de antes de que el banco pasara a Claude) ya no se enseña
  if (b && !/^claude-/.test(String(b.modelo || ''))) return `<section><h3>${titulo}</h3><p class="nota">${L('El último guardado es de antes de Claude: el siguiente sale con la próxima pasada del banco.', 'The last one saved is from before Claude: the next one comes with the next bank run.')}</p></section>`;
  if (!b) return `<section><h3>${titulo}</h3><p class="nota">${L('Todavía no hay resultados del banco.', 'No question bank results yet.')}</p></section>`;
  const mal = (Array.isArray(b.preguntas) ? b.preguntas : []).filter((x) => x && !x.ok);
  const N = (v) => Number(v) || 0;
  return `<section><h3>${titulo}</h3>
    <p class="salud-num"><b>${N(b.bien)} ${L('de', 'of')} ${N(b.total)}</b> ${L('bien', 'right')} (${fmtNum(N(b.pct), 1)} %) · ${fmtNum(N(b.peticiones_media), 1)} ${L('peticiones por pregunta', 'requests per question')} · ${esc(nombreModSalud(b.modelo))} · ${haceCuanto(b.generado)}${b.parcial ? ` · <b>${L(`a medias: ${N(b.total)} de ${N(b.de)}`, `partial: ${N(b.total)} of ${N(b.de)}`)}</b>` : ''}</p>
    ${mal.length ? `<ul class="lista salud-mal">${mal.map((x) => `<li><details><summary><b>${esc(x.id)}</b> ${esc((Array.isArray(x.mal) ? x.mal : [x.mal]).filter(Boolean).join(' · '))}</summary><p class="k">${esc(x.q)}</p><p class="nota" data-no-trad>${esc(x.respuesta || '')}</p></details></li>`).join('')}</ul>` : ''}</section>`;
}
// las llamadas a Claude de la Action en las últimas 24 h, por modelo: cuántas, cuántas por lotes y los tokens
function htmlGastoAction() {
  const e = S.escaneo || {}, de = (x) => (x && Array.isArray(x.uso) ? x.uso.filter((y) => y && typeof y === 'object') : []);
  // la misma llamada puede venir en dos campos mientras la Action cambia de formato: la de gemini.uso que ya esté en
  // claude.uso o ia.uso no cuenta otra vez (dentro de un mismo campo, todas: las de un lote pueden ser iguales)
  const id = (x) => `${x.t}|${x.m}|${x.que}|${x.in}|${x.out}`, nuevos = [...de(e.claude), ...de(e.ia)], ya = new Set(nuevos.map(id));
  const uso = [...nuevos, ...de(e.gemini).filter((x) => !ya.has(id(x)))];
  const hace24 = Date.now() - 864e5, m = {};
  for (const x of uso) {
    if (!/^claude-/.test(String(x.m || '')) || !(new Date(x.t).getTime() > hace24)) continue;
    const y = m[x.m] = m[x.m] || { n: 0, lote: 0, e: 0, s: 0 };
    y.n++; if (x.lote) y.lote++; y.e += +x.in || 0; y.s += +x.out || 0;
  }
  const ms = Object.keys(m), coste = e.ia && typeof e.ia.coste_24h === 'number' && isFinite(e.ia.coste_24h) ? e.ia.coste_24h : null;
  return `<section><h3>${L('Lo que ha gastado la Action en 24 h', 'What the Action has used in 24 h')}</h3>
    <p>${ms.length ? ms.map((k) => `${esc(nombreModSalud(k, true))}: <b>${m[k].n}</b> ${m[k].n === 1 ? L('llamada', 'call') : L('llamadas', 'calls')}${m[k].lote ? ` (${m[k].lote} ${L('por lotes', 'batched')})` : ''} · ${L('entrada', 'input')} ${fmtNum(m[k].e, 0)} · ${L('salida', 'output')} ${fmtNum(m[k].s, 0)}`).join('<br>') : L('Ninguna llamada a Claude apuntada en 24 h.', 'No Claude calls logged in 24 h.')}</p>
    ${coste != null ? `<p>${L('Coste en 24 h', 'Cost in 24 h')}: <b>${fmtNum(coste, 2)} US$</b></p>` : ''}
    <p class="nota">${L('Es la clave del radar (su propio espacio en Anthropic): no gasta de los topes de la app.', "It's the radar key (its own Anthropic workspace): it doesn't use the app's limits.")}</p></section>`;
}
function htmlFallosIA(fs) {
  if (!fs || fs.error) return `<section><h3>${L('Fallos de la IA', 'GrowIA failures')}</h3><p class="nota">${L('No se han podido leer ahora.', "Couldn't read them now.")}</p></section>`;
  const T = TIPOS_FALLO(), hace7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const sem = fs.filter((x) => String(x.t) >= hace7), cuenta = {};
  for (const x of sem) cuenta[x.tipo] = (cuenta[x.tipo] || 0) + 1;
  return `<section><h3>${L('Fallos de la IA que no se arreglaron solos', "GrowIA failures that didn't fix themselves")}</h3>
    <p>${sem.length ? `${L('Últimos 7 días', 'Last 7 days')}: ${Object.entries(cuenta).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(T[k] || k)} <b>${n}</b>`).join(' · ')}` : L('Ninguno en los últimos 7 días.', 'None in the last 7 days.')}</p>
    ${fs.length ? `<ul class="lista salud-fallos">${fs.slice(0, 20).map((x) => `<li><span>${esc(T[x.tipo] || x.tipo)}${Number(x.estado) ? ` (${Number(x.estado)})` : ''}</span><small>${haceCuanto(x.t)} · ${esc(x.donde || '')} · ${esc(nombreModSalud(x.modelo, true))} · ${esc(x.v || '')}</small></li>`).join('')}</ul>` : ''}
    <p class="nota">${L('Sin preguntas ni carteras: solo el tipo, el modelo, dónde y la versión.', 'No questions or portfolios: only the type, model, where and version.')}</p></section>`;
}
async function verSaludIA() {
  const h = hoja(L('Cómo va la IA', 'How GrowIA is doing'), `<div class="salud-ia"><p class="nota">${L('Cargando…', 'Loading…')}</p></div>`);
  const cont = $('.salud-ia', h.el);
  try {
    const [banco, muestra, fallos] = await Promise.all([leerDatosRama('banco.json'), leerDatosRama('banco-muestra.json'), leerFallosIA(), cargarEscaneo().catch(() => null)]);
    if (cont) cont.innerHTML = `${htmlBancoIA(banco, L('Banco de preguntas de los martes, con Haiku', 'Tuesday question bank, with Haiku'))}${htmlBancoIA(muestra, L('Muestra de los viernes, con Sonnet', 'Friday sample, with Sonnet'))}${htmlGastoAction()}${htmlFallosIA(fallos)}`;
  } catch (e) {
    console.warn(e);
    if (cont) cont.innerHTML = `<p class="nota">${L('No se ha podido cargar ahora. Vuelve a abrirla en un momento.', "Couldn't load it now. Open it again in a moment.")}</p>`;
  }
}
