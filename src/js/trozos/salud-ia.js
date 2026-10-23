/* =====================================================================
   0.7 · Cómo va GrowIA, para el dueño (Ajustes)
   El banco de preguntas de cada noche (banco.json, con Flash-Lite) y la muestra de los domingos (banco-muestra.json,
   con el 3.6), que escribe la Action «Banco de GrowIA» en la rama datos; el cupo que ha gastado hoy la Action
   (escaneo.json → gemini.uso); y los fallos de GrowIA que no se arreglaron solos (Firestore fallos_ia, sin preguntas
   ni carteras).
   ===================================================================== */
const TIPOS_FALLO = () => ({ corte: L('Se cortó la conexión tres veces', 'Connection dropped three times'), red: L('Sin conexión', 'No connection'), cupo: L('Cupo diario agotado', 'Daily quota used up'),
  espera: L('Google pidió esperar', 'Google asked to wait'), google: L('Google saturado', 'Google overloaded'), clave: L('Clave o modelo no válido', 'Key or model not valid'),
  bloqueo: L('Filtros de Google', "Google's filters"), vacia: L('Respuesta vacía', 'Empty answer'), formato: L('Revisión incompleta', 'Incomplete review'), otro: L('Otro', 'Other') });
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
    return r.docs.map((d) => d.data());
  } catch (e) { return { error: e.message }; }
}
function htmlBancoIA(b, titulo) {
  if (!b) return `<section><h3>${titulo}</h3><p class="nota">${L('Todavía no hay resultados: la Action los escribe cada noche.', 'No results yet: the Action writes them every night.')}</p></section>`;
  const mal = (b.preguntas || []).filter((x) => !x.ok);
  return `<section><h3>${titulo}</h3>
    <p class="salud-num"><b>${b.bien} ${L('de', 'of')} ${b.total}</b> ${L('bien', 'right')} (${b.pct} %) · ${fmtNum(b.peticiones_media, 1)} ${L('peticiones por pregunta', 'requests per question')} · ${esc(MODELOS[b.modelo] ? MODELOS[b.modelo].n : b.modelo)} · ${haceCuanto(b.generado)}</p>
    ${mal.length ? `<ul class="lista salud-mal">${mal.map((x) => `<li><details><summary><b>${esc(x.id)}</b> ${esc(x.mal.join(' · '))}</summary><p class="k">${esc(x.q)}</p><p class="nota" data-no-trad>${esc(x.respuesta || '')}</p></details></li>`).join('')}</ul>` : ''}</section>`;
}
function htmlCupoAction() {
  const uso = ((S.escaneo && S.escaneo.gemini && S.escaneo.gemini.uso) || []);
  const dia = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const hoy = diaGoogle(), m = {};
  for (const x of uso) if (x.t && dia(x.t) === hoy) m[x.m] = (m[x.m] || 0) + 1;
  const pensar = uso.filter((x) => /3\.8/.test(x.m) && x.pensar).map((x) => x.pensar);
  return `<section><h3>${L('Lo que ha gastado hoy la Action', 'What the Action has used today')}</h3>
    <p>${Object.keys(MODELOS).map((k) => `${esc(MODELOS[k].corto || MODELOS[k].n)}: <b>${m[k] || 0}</b>${CUPO_DIA[k] ? ` ${L('de', 'of')} ${CUPO_DIA[k]}` : ''}`).join(' · ')}</p>
    <p class="nota">${pensar.length ? L(`El 3.8 ha razonado de media ${fmtNum(pensar.reduce((a, b) => a + b, 0) / pensar.length, 0)} tokens por llamada (${pensar.length} llamadas en 48 h).`, `The 3.8 reasoned ${fmtNum(pensar.reduce((a, b) => a + b, 0) / pensar.length, 0)} tokens per call on average (${pensar.length} calls in 48 h).`) : L('Aún no hay llamadas del 3.8 apuntadas en 48 h.', 'No 3.8 calls logged in 48 h yet.')} ${L('Es su propio proyecto de Google: no gasta el cupo de tu GrowIA.', "It's its own Google project: it doesn't use your GrowIA quota.")}</p></section>`;
}
function htmlFallosIA(fs) {
  if (!fs || fs.error) return `<section><h3>${L('Fallos de GrowIA', 'GrowIA failures')}</h3><p class="nota">${L('No se han podido leer ahora.', "Couldn't read them now.")}</p></section>`;
  const T = TIPOS_FALLO(), hace7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const sem = fs.filter((x) => String(x.t) >= hace7), cuenta = {};
  for (const x of sem) cuenta[x.tipo] = (cuenta[x.tipo] || 0) + 1;
  return `<section><h3>${L('Fallos de GrowIA que no se arreglaron solos', "GrowIA failures that didn't fix themselves")}</h3>
    <p>${sem.length ? `${L('Últimos 7 días', 'Last 7 days')}: ${Object.entries(cuenta).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(T[k] || k)} <b>${n}</b>`).join(' · ')}` : L('Ninguno en los últimos 7 días.', 'None in the last 7 days.')}</p>
    ${fs.length ? `<ul class="lista salud-fallos">${fs.slice(0, 20).map((x) => `<li><span>${esc(T[x.tipo] || x.tipo)}${x.estado ? ` (${x.estado})` : ''}</span><small>${haceCuanto(x.t)} · ${esc(x.donde || '')} · ${esc(MODELOS[x.modelo] ? MODELOS[x.modelo].corto : x.modelo || '—')} · ${esc(x.v || '')}</small></li>`).join('')}</ul>` : ''}
    <p class="nota">${L('Sin preguntas ni carteras: solo el tipo, el modelo, dónde y la versión.', 'No questions or portfolios: only the type, model, where and version.')}</p></section>`;
}
async function verSaludIA() {
  const h = hoja(L('Cómo va GrowIA', 'How GrowIA is doing'), `<div class="salud-ia"><p class="nota">${L('Cargando…', 'Loading…')}</p></div>`);
  const [banco, muestra, fallos] = await Promise.all([leerDatosRama('banco.json'), leerDatosRama('banco-muestra.json'), leerFallosIA(), cargarEscaneo().catch(() => null)]);
  const cont = $('.salud-ia', h.el); if (!cont) return;
  cont.innerHTML = `${htmlBancoIA(banco, L('Banco de preguntas de cada noche', 'Nightly question bank'))}${htmlBancoIA(muestra, L('Muestra de los domingos, con el modelo bueno', 'Sunday sample, with the better model'))}${htmlCupoAction()}${htmlFallosIA(fallos)}`;
}
