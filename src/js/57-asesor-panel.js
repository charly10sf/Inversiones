/* ---------- markdown mínimo y seguro para las respuestas ---------- */
function md(src) {
  const inline = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<i>$2</i>')
    // 0.7: cada enlace dice a qué web lleva (un texto de la prensa podría colar uno que parezca otra cosa)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m0, t, u) => { let h = ''; try { h = new URL(u.replace(/&amp;/g, '&')).hostname.replace(/^www\./, ''); } catch (e) {} return `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>${h && !t.includes(h) ? ` <small class="as-dom">(${h})</small>` : ''}`; });
  const lineas = esc(src).split('\n');
  let html = '', lista = null, tabla = null, par = [];
  const cerrarPar = () => { if (par.length) { html += `<p>${inline(par.join('<br>'))}</p>`; par = []; } };
  const cerrarLista = () => { if (lista) { html += `<${lista.t}>${lista.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${lista.t}>`; lista = null; } };
  const cerrarTabla = () => {
    if (!tabla) return;
    const celdas = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
    const filas = tabla.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l)).map(celdas);
    const [cab, ...resto] = filas;
    html += `<div class="as-tabla"><table><thead><tr>${cab.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${resto.map((f) => `<tr>${f.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    tabla = null;
  };
  const cerrar = () => { cerrarPar(); cerrarLista(); cerrarTabla(); };
  for (const l of lineas) {
    let m;
    if (/^\s*\|.*\|\s*$/.test(l)) { cerrarPar(); cerrarLista(); (tabla = tabla || []).push(l); continue; }
    if (tabla) cerrarTabla();
    if (!l.trim()) { cerrar(); continue; }
    if ((m = /^\s*#{1,6}\s+(.*)$/.exec(l))) { cerrar(); html += `<h4>${inline(m[1])}</h4>`; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { cerrar(); html += '<hr>'; continue; }
    if ((m = /^\s*[-*•]\s+(.*)$/.exec(l))) { cerrarPar(); if (!lista || lista.t !== 'ul') { cerrarLista(); lista = { t: 'ul', items: [] }; } lista.items.push(m[1]); continue; }
    if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { cerrarPar(); if (!lista || lista.t !== 'ol') { cerrarLista(); lista = { t: 'ol', items: [] }; } lista.items.push(m[1]); continue; }
    if (lista && /^\s{2,}\S/.test(l)) { lista.items[lista.items.length - 1] += ' ' + l.trim(); continue; }
    cerrarLista(); par.push(l);
  }
  cerrar();
  return html;
}

/* ---------- 0.8.2 · quién contesta ----------
   Ni arriba del panel ni debajo de cada respuesta hay aviso de qué IA contesta (6 nov, Carlos: «ya se sobreentiende, no
   quiero que diga qué IA es ni nada»); el modelo de cada respuesta se guarda igual en t.modelo. Con Claude (estándar, y el
   fundador desde la opción B) van las reglas del estándar: no da recomendaciones personalizadas. 0.8.2b: solo Claude. */
const nombreModLargo = (m) => (MODELOS_CLAUDE[m] || {}).n || m || '';

/* ---------- 0.8.2 · tus conversaciones guardadas ---------- */
const cuandoConv = (t) => { try { return haceCuanto(new Date(t).toISOString()); } catch (e) { return ''; } };
const filaConv = (c) => `<li><button type="button" class="as-conv" data-as="abrir-conv" data-id="${esc(c.id)}"><span>${esc(c.titulo)}</span><small>${esc(cuandoConv(c.t))} · ${c.n === 1 ? L('1 pregunta', '1 question') : L(`${c.n} preguntas`, `${c.n} questions`)}</small></button><button type="button" class="ib as-conv-borrar" data-as="borrar-conv" data-id="${esc(c.id)}" title="${L('Borrar esta conversación', 'Delete this conversation')}" aria-label="${L('Borrar', 'Delete')}: ${esc(c.titulo)}">${ICONOS.papelera}</button></li>`;
function htmlConvsRecientes() {
  const cs = (AS.convs || []).filter((c) => c.id !== AS.convId || AS.conv.length);
  if (!cs.length) return '';
  return `<section class="as-convs" aria-labelledby="asConvsT"><h4 id="asConvsT">${L('Tus conversaciones', 'Your conversations')}</h4><ul>${cs.slice(0, 3).map(filaConv).join('')}</ul>${cs.length > 3 ? `<button type="button" class="enlace" data-as="convs">${L(`Ver las ${cs.length}`, `See all ${cs.length}`)}</button>` : ''}</section>`;
}
function htmlConvs() {
  const cs = AS.convs || [];
  return `<div class="as-ajustes"><h3>${L('Tus conversaciones', 'Your conversations')}</h3>
    <p class="nota">${L('Se guardan las 20 últimas, cifradas con tu contraseña en este dispositivo: no salen de él. Los recortes de pantalla no se guardan.', 'The last 20 are kept, encrypted with your password on this device: they never leave it. Screen snips are not kept.')}</p>
    ${cs.length ? `<ul class="as-convs as-convs-todas">${cs.map(filaConv).join('')}</ul>` : `<p class="nota">${L('Aún no hay ninguna.', 'None yet.')}</p>`}
    <div class="fila-btns" style="justify-content:flex-start">${cs.length ? `<button class="btn" data-as="borrar-convs">${ICONOS.papelera}${L('Borrar todas', 'Delete all')}</button>` : ''}<button class="btn" data-as="chat">${L('Volver', 'Back')}</button></div></div>`;
}

/* ---------- el panel ---------- */
function sugerencias(M) {
  const s = [], anio = new Date().getFullYear();
  // 0.5, modo público: preguntas que GrowIA sí contesta (explicar, comparar, calcular). 0.8.2: también en el fundador con Claude
  if (preguntasDelEstandar()) {
    const f0 = [...M.filas].sort((a, b) => (b.valor || 0) - (a.valor || 0))[0];
    if (f0) s.push(`¿Qué ha pasado con ${f0.inst.corto} este mes y qué dicen los analistas?`);
    s.push(`¿Cuánto voy a pagar en la renta de ${anio}?`);
    s.push('¿Cuánto me cuestan al año las comisiones de mis fondos?');
    s.push('¿Qué ha pasado hoy en los mercados que me afecte?');
    s.push('Si la bolsa cae un 30 %, ¿cuánto bajaría mi cartera?');
    s.push('¿Se repiten empresas entre mis fondos?');
    return s.slice(0, 6);
  }
  const pl = M.filas.map((f) => planVenta(f, M)).filter(Boolean)[0];
  if (pl) { const res = pl.f.p && pl.f.p.proximos_resultados; s.push(`¿Qué supondría vender ya ${pl.f.inst.corto} o esperar${res && res >= hoyIso() ? ` a sus resultados del ${fechaCorta(res)}` : ''}?`); }
  s.push('Este mes me sobran 500 €: ¿qué opciones tengo?');
  const top = M.filas.filter((f) => f.inst.tipo === 'Acción' && f.plPct > 40).sort((a, b) => b.plPct - a.plPct)[0];
  s.push(top ? `Búscame otra jugada como la de ${top.inst.corto}, bien contrastada` : 'Búscame una acción con un motor claro y bien contrastada');
  s.push(`¿Cuánto voy a pagar en la renta de ${anio}?`);
  s.push('¿Qué ha pasado hoy en los mercados que me afecte?');
  s.push('Si la bolsa cae un 30 %, ¿cuánto bajaría mi cartera?');
  return s.slice(0, 6);
}
/* 0.9: seis funciones de un toque, además del chat (maqueta del 3 nov). Explican y calculan; lo que hagas lo decides tú */
const FUNCIONES_IA = [
  ['ok', 'Revisar mi cartera', 'Lo que va bien y lo que hay que vigilar', 'Revisa mi cartera punto por punto, con cifras: qué va bien, qué se sale de mis límites y metas, y qué riesgos hay que vigilar. Sin decirme qué comprar, vender o mantener: lo decido yo.'],
  ['info', 'Explícame una cifra', 'Recorta cualquier número de la app', null],
  ['analisis', '¿Y si…?', 'Una caída, aportar más, jubilarte antes', '¿Qué supondría para mi cartera que la bolsa cayera un 20 %? ¿Y aportar 200 € más al mes durante 10 años?'],
  ['calendario', 'Tu semana', 'Lo que ha pasado con lo tuyo', 'Resúmeme mi semana: qué ha pasado con lo que tengo, por qué, y qué viene la semana que viene.'],
  ['novedades', 'Noticias de lo tuyo', 'Leídas y resumidas', 'Lee las noticias de los últimos días de lo que tengo y dime en pocas líneas qué me afecta y por qué.'],
  ['fiscalidad', 'Tus números para la renta', 'El cálculo de la app, explicado', 'Explícame mis números para la renta de este año con los cálculos de la app: lo que llevo, lo que supondría y por qué.'],
];
const htmlFuncionesIA = () => `<div class="as-funcs">${FUNCIONES_IA.map(([ic, t, s, q]) => `<button type="button" class="as-func" ${q ? `data-as-q="${esc(q)}"` : 'data-as="recorte"'}>${ICONOS_PL[ic] || ''}<b>${t}</b><small>${s}</small></button>`).join('')}</div>`;
function htmlTurno(t, k) {
  if (t.rol === 'yo') return `<div class="as-yo">${t.mini || t.donde ? `<div class="as-yo-rec">${t.mini ? `<img src="${esc(t.mini)}" alt="Recorte de la pantalla">` : ''}<small>Recorte de ${esc(t.donde || 'la pantalla')}</small></div>` : ''}${esc(t.texto)}</div>`;
  const vivo = AS.cargando && k === AS.conv.length - 1;
  const ult = t.partes[t.partes.length - 1];
  const partes = t.partes.map((p) => (p.tipo === 'texto' ? `<div class="as-md">${md(p.texto)}</div>` : `<div class="as-paso${p.corte ? ' as-corte' : ''}">${p.web ? ICONOS.mercados : p.corte ? ICONOS.alerta : ICONOS.calc}<span>${esc(p.txt)}</span></div>`)).join('');
  const vistas = new Set();
  const fuentes = (t.citas.length ? t.citas : t.resultados.slice(0, 5)).filter((x) => !vistas.has(x.u) && vistas.add(x.u)).slice(0, 8);
  const dom = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
  return `<div class="as-ia${vivo ? ' vivo' : ''}" id="asT${k}">${partes}
    ${vivo && !(ult && ult.tipo === 'texto' && ult.texto) ? `<div class="as-pensando" aria-label="Pensando"><i></i><i></i><i></i><small class="as-seg">${t.t && Date.now() - t.t >= 3000 ? `${Math.round((Date.now() - t.t) / 1000)} s` : ''}</small></div>` : ''}
    ${t.error ? `<div class="as-error">${esc(t.error)} <button class="enlace" data-as="reintentar">Volver a preguntar</button></div>` : ''}
    ${!vivo && fuentes.length ? `<div class="as-fuentes"><span class="k">Fuentes</span>${fuentes.filter((x) => urlSegura(x.u)).map((x) => `<a href="${esc(x.u)}" target="_blank" rel="noopener noreferrer" title="${esc(x.t)}">${esc(x.d || dom(x.u))}</a>`).join('')}</div>` : ''}
  </div>`;
}
/* 0.7l: el registro de GrowIA (lo que ha hecho, sin preguntas ni respuestas) y, en la app de Android, si tiene la
   batería restringida, que es lo que hace que se corte al salir */
function htmlDiarioIA() {
  const d = diarioIATodo().slice(-25).reverse();
  const h = (t) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const restringida = deApp('bateriaRestringida') === true;
  return `${restringida ? `<p class="nota as-aviso-bateria">${L('Android tiene Toisón con la batería restringida: así la IA se corta cuando sales de la app. Cámbialo en los ajustes del móvil: Aplicaciones, Toisón, Batería, «Sin restricciones» u «Optimizada».', 'Android has Toisón\'s battery restricted: that\'s why GrowIA gets cut off when you leave the app. Change it in your phone settings: Apps, Toisón, Battery, "Unrestricted" or "Optimised".')}</p>` : ''}
    <div class="as-diario"><b>${L('Lo último de la IA', "GrowIA's latest activity")}</b><small>${L('Qué ha hecho cada respuesta, sin tus preguntas ni tus cifras. Si algo falla, cópialo y pásaselo a quien te dio Toisón.', "What each answer did, without your questions or figures. If something fails, copy it and send it to whoever gave you Toisón.")}</small>
    ${d.length ? `<ol>${d.map((x) => `<li><time>${h(x.t)}</time>${x.app ? '<i>app</i>' : ''}${esc(x.x)}</li>`).join('')}</ol><button class="btn peq" data-as="copiar-diario">${ICONOS.copiar}${L('Copiar', 'Copy')}</button>` : `<p class="nota">${L('Aún no hay nada.', 'Nothing yet.')}</p>`}</div>`;
}
/* 0.8.2b: cuando la IA no puede contestar (sin cuenta, con el correo sin confirmar, sin tu sí o con Claude apartado un rato),
   lo dice y qué hacer. Ya no hay clave que poner */
function htmlSinIA() {
  const p = claudePausado(), sinVerificar = FB.user && !FB.user.emailVerified, esperando = !p && !sinVerificar && !!SONDEO_EN_CURSO;
  const txt = !FB.user ? L('La IA contesta con tu cuenta de Toisón: entra en tu cuenta para usarla.', 'The AI answers with your Toisón account: sign in to use it.')
    : esperando ? L('Conectando con la IA…', 'Connecting to the AI…')
    : errorSinIA(motivoSinClaude()).message;
  return `<div class="as-config as-sin-ia">
    <h3 data-no-trad>${conIA('La IA', 'GrowIA')}</h3>
    <p>${esc(txt)}</p>
    ${esperando || !FB.user ? '' : `<div class="fila-btns" style="justify-content:flex-start"><button class="btn pri" data-as="reprobar">${L('Volver a probar', 'Try again')}</button></div>`}
    <div class="as-sin-clave">
      <b>${L('Mientras tanto', 'Meanwhile')}</b>
      <p>${L('Copia tu cartera de ahora mismo junto con tu pregunta y pégala en el chat de IA que uses. No hace los cálculos de Toisón en directo, pero tiene todos tus datos.', "Copy your current portfolio together with your question and paste it into the AI chat you use. It doesn't run Toisón's live calculations, but it has all your data.")}</p>
      <button class="btn" data-as="copiar">${ICONOS.copiar}${L('Copiar mi cartera para otra IA', 'Copy my portfolio for another AI')}</button>
    </div>
  </div>`;
}
function htmlAjustesAsesor() {
  const cfg = cfgAsesor();
  const yo = (S.cartera.asesor && S.cartera.asesor.sobre_mi) || '';
  return `<div class="as-config">
    <h3>Ajustes de la IA</h3>
    <label class="check"><input type="checkbox" id="asWeb"${cfg.webPedida ? ' checked' : ''}> ${L('Puede buscar en internet', 'It can search the internet')}</label>
    <label class="campo">${L('Quién contesta', 'Who answers')}<select id="asMotor">${[['auto', L('Claude: Haiku, y Sonnet cuando eliges «A fondo» (recomendado)', 'Claude: Haiku, and Sonnet when you choose "In depth" (recommended)')], ['sonnet', L('Claude Sonnet para todo', 'Claude Sonnet for everything')], ['haiku', L('Claude Haiku para todo', 'Claude Haiku for everything')]].map(([k, t]) => `<option value="${k}"${motorElegido() === k ? ' selected' : ''}>${t}</option>`).join('')}</select><small>${L('Sonnet piensa más y cuesta más; Haiku es más rápido y barato. Si Sonnet no puede, o se acaban tus «A fondo» de hoy, contesta Haiku.', "Sonnet thinks more and costs more; Haiku is faster and cheaper. If Sonnet can't answer, or your \"In depth\" answers for today run out, Haiku does.")}${esPublico() ? '' : ` ${L('Con el acceso de fundador, Claude va con las reglas del estándar: explica, calcula y te dice lo que implican tus reglas, sin decirte qué comprar o vender.', 'With founder access, Claude follows the standard rules: it explains, calculates and tells you what your rules imply, without telling you what to buy or sell.')}`}</small></label>
    <label class="campo">Análisis automático de tu cartera<select id="asAuto"><option value="diario"${cfg.auto === 'diario' ? ' selected' : ''}>Dos veces al día, desde las 5:00 y las 16:30</option><option value="semanal"${cfg.auto === 'semanal' ? ' selected' : ''}>Cada semana</option><option value="manual"${cfg.auto === 'manual' ? ' selected' : ''}>Solo cuando yo lo pida</option></select><small>Lo escribe la IA con tus cifras y las noticias del día, en Análisis, Expertos y Paso a paso. Sábados y domingos, una sola, desde las 5:00. Cada día hay 2 revisiones: si pides una, gasta una de las dos. Gratis.</small></label>
    <label class="campo">Lo que quieres que sepa de ti<textarea id="asYo" rows="6" placeholder="Por ejemplo: tu edad, para qué inviertes, si piensas comprar casa y cuándo, cuánto riesgo aguantas, tus reglas para las acciones sueltas…">${esc(yo)}</textarea><small>Va dentro de tu cartera cifrada y lo lee al empezar cada conversación.</small></label>
    <div class="fila-btns" style="justify-content:flex-start"><button class="btn pri" data-as="guardar-ajustes">Guardar</button><button class="btn" data-as="chat">Volver</button></div>
    <div class="seccion-ed"><h3>${L('Adónde van tus datos', 'Where your data goes')}</h3>
      <p class="nota" style="margin:0 0 8px">${L('Tus preguntas y lo que necesita de tu cartera pasan por el servidor de Toisón (que no guarda nada) hasta Anthropic, la empresa de Claude, que lo procesa fuera de la Unión Europea.', "Your questions and what it needs from your portfolio go through Toisón's server (which stores nothing) to Anthropic, the company behind Claude, which processes it outside the European Union.")} ${L('Si la IA falla y no se arregla sola, Toisón apunta con tu cuenta el tipo de fallo y la versión, sin tu pregunta ni tu cartera, para arreglarlo. Se borra a los 30 días.', "If the AI fails and doesn't recover, Toisón logs the type of failure and the version with your account, without your question or portfolio, so it can be fixed. It's deleted after 30 days.")}</p>
      <details class="as-detalle"><summary>${L('Detalles técnicos', 'Technical details')}</summary>${htmlDiarioIA()}</details>
    </div>
  </div>`;
}
function pintarAsesor(alFinal) {
  const fondo = $('#asesorFondo'); if (!fondo) return;
  const cfg = cfgAsesor();
  const cuerpo = $('#asCuerpo', fondo), pie = $('#asPie', fondo);
  $('#asSub', fondo).textContent = subtituloIA();
  // 0.8.2: Normal (Haiku) o «A fondo» (Sonnet) para tus preguntas; con un modelo fijo elegido en Ajustes, nada
  $('#asModo', fondo).innerHTML = motorElegido() !== 'auto' ? '' : `<span>${L('Respuesta', 'Answer')}</span><div class="seg" role="group" aria-label="${L('Tipo de respuesta', 'Answer type')}" aria-describedby="asModoNota"><button type="button" data-as="fondo" data-m="normal" aria-pressed="${!AS.aFondo}">${L('Normal', 'Normal')}</button><button type="button" data-as="fondo" data-m="fondo" aria-pressed="${!!AS.aFondo}">${L('A fondo', 'In depth')}</button></div><small id="asModoNota">${AS.aFondo ? L('Con Sonnet: piensa más y tarda algo más', 'With Sonnet: thinks more and takes a bit longer') : L('Con Haiku: rápida y al grano', 'With Haiku: quick and to the point')}</small>`;
  // 0.9: con una conversación empezada (p. ej. Claude acaba de decir que no puede) se queda en el chat para que se lea
  const vista = !iaLista() && AS.vista !== 'ajustes' && !AS.conv.length ? 'sin-ia' : AS.vista;
  if (vista === 'sin-ia') cuerpo.innerHTML = htmlSinIA();
  else if (vista === 'ajustes') cuerpo.innerHTML = htmlAjustesAsesor();
  else if (vista === 'convs') cuerpo.innerHTML = htmlConvs();
  else if (!AS.conv.length) cuerpo.innerHTML = `<div class="as-vacio"><h3>¿Qué quieres saber?</h3>${htmlConvsRecientes()}${htmlFuncionesIA()}<p>Tiene delante tu cartera de ahora mismo: lo que tienes y lo que te costó, tus aportaciones, lo que llevas de renta este año, los analistas, cientos de empresas de EEUU y Europa para buscar ideas y las noticias. Calcula ventas con FIFO e impuestos${cfg.web ? ' y busca en internet lo que le falte' : ''}.</p><div class="as-sug">${sugerencias(S.M || calcular()).map((q) => `<button data-as-q="${esc(q)}">${esc(q)}</button>`).join('')}<button type="button" class="as-sug-rec" data-as="recorte">${ICONOS.recorte}<span>Recorta un trozo de la pantalla y pregúntale por él</span></button></div></div>`;
  else cuerpo.innerHTML = AS.conv.map(htmlTurno).join('');
  pie.hidden = vista !== 'chat';
  if (!AS.convs && S.key) cargarConvs().then(() => { if ($('#asesorFondo') && !AS.conv.length) pintarAsesor(); });
  const b = $('#asEnviar', fondo);
  b.classList.toggle('parar', AS.cargando); b.innerHTML = AS.cargando ? ICONOS.parar : ICONOS.enviar;
  b.setAttribute('aria-label', AS.cargando ? 'Parar' : 'Enviar'); b.disabled = false;
  pintarAdjunto();
  if (vista === 'chat') cuerpo.scrollTop = cuerpo.scrollHeight; else cuerpo.scrollTop = 0;
}
function pintarTurno(k) {
  const el = document.getElementById('asT' + k), cuerpo = $('#asCuerpo');
  if (!el || !cuerpo) return;
  const abajo = cuerpo.scrollHeight - cuerpo.scrollTop - cuerpo.clientHeight < 80;
  el.outerHTML = htmlTurno(AS.conv[k], k);
  if (abajo) cuerpo.scrollTop = cuerpo.scrollHeight;
}
async function abrirAsesor(pregunta, enviar) {
  if (!S.cartera) return;
  if (S.ficha) cerrarFicha();
  let fondo = $('#asesorFondo');
  if (!fondo) {
    fondo = document.createElement('div'); fondo.className = 'asesor-fondo'; fondo.id = 'asesorFondo';
    fondo.innerHTML = `<section class="asesor" role="dialog" aria-modal="true" aria-labelledby="asTit">
      <header class="as-cab"><div class="as-tit"><span class="as-ico ia-av">${AVATAR_IA}</span><div><h2 id="asTit" data-no-trad>${NOM_IA}</h2><small id="asSub"></small></div></div>
        <button class="ib" data-as="nueva" title="Nueva conversación" aria-label="Nueva conversación">${ICONOS.nueva}</button>
        <button class="ib" data-as="ajustes" title="Ajustes de la IA" aria-label="Ajustes de la IA">${ICONOS.ajustes}</button>
        <button class="ib ib-bicho" data-accion="opinion" title="Avisar de un fallo o mandar una idea" aria-label="Avisar de un fallo">${ICONOS.bicho}</button>
        <button class="ib" data-as="cerrar" aria-label="Cerrar">${ICONOS.cerrar}</button></header>
      <div class="as-cuerpo" id="asCuerpo" aria-live="polite"></div>
      <footer class="as-pie" id="asPie"><div class="as-modo" id="asModo"></div><div id="asAdjunto"></div><form class="as-form" id="asForm"><button type="button" class="as-adj" data-as="recorte" title="Recorta un trozo de la pantalla para preguntar por él" aria-label="Recortar la pantalla">${ICONOS.recorte}</button><textarea id="asTexto" rows="1" placeholder="Pregunta lo que quieras de tu cartera" aria-label="Tu pregunta"></textarea>${dictadoPosible() ? `<button type="button" class="as-adj as-voz" data-as="voz" title="Dictar la pregunta" aria-label="Dictar la pregunta" aria-pressed="false">${ICONOS.micro}</button>` : ''}<button class="as-enviar" id="asEnviar" type="submit" aria-label="Enviar">${ICONOS.enviar}</button></form></footer>
    </section>`;
    fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrarAsesor(); else clicAsesor(e); });
    document.body.appendChild(fondo);
    // 0.9: en el ordenador la IA se abre al lado, en una columna a la derecha, y Hoy sigue a la vista y se puede mover
    if (iaAlLado()) { document.body.classList.add('ia-lado'); $('.asesor', fondo).setAttribute('aria-modal', 'false'); for (const b of $$('.riel-ia')) b.setAttribute('aria-expanded', 'true'); }
    else document.body.style.overflow = 'hidden';
    S.asesorAtras = conAtras(() => cerrarAsesor(true), fondo);
    const ta = $('#asTexto', fondo);
    const ajustar = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; };
    ta.addEventListener('input', ajustar);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#asForm').requestSubmit(); } });
    $('#asForm', fondo).onsubmit = (e) => {
      e.preventDefault();
      if (AS.cargando) { if (AS.ctrl) AS.ctrl.abort(); return; }
      const q = ta.value; if (!q.trim()) return;
      ta.value = ''; ajustar(); preguntarAsesor(q);
    };
  }
  await cargarAsesor();
  // ¿puede contestar? La petición vacía no gasta ni manda nada de la cartera; el panel dice «Conectando…» mientras tanto
  sondearClaude();
  if (AS.vista !== 'chat' && iaLista()) AS.vista = 'chat';
  pintarAsesor(true);
  const ta = $('#asTexto', fondo);
  // 0.8.2b: si el sondeo aún no ha contestado, la pregunta espera a él (preguntarAsesor)
  if (pregunta && enviar && (iaLista() || modeloClaudeParaIA('pregunta'))) preguntarAsesor(pregunta);
  else if (pregunta) { ta.value = pregunta; ta.dispatchEvent(new Event('input')); }
  if (window.innerWidth > 760 && !pie_oculto()) ta.focus();
  function pie_oculto() { return $('#asPie', fondo).hidden; }
}
/* Dictar la pregunta en vez de escribirla. En el navegador, con el reconocimiento de voz del propio navegador
   (Chrome, Edge, Safari); en la app de Android, con el dictado de Google del móvil (su ventanita del micrófono).
   El texto cae en la caja y lo envías tú, así puedes corregirlo antes. */
const RecVoz = window.SpeechRecognition || window.webkitSpeechRecognition;
const appDicta = () => { const a = window.InversionesApp; return a && typeof a.dictar === 'function' ? a : null; };
const dictadoPosible = () => !!(window.InversionesApp || RecVoz);
let dictado = null;
function dictar() {
  const ta = $('#asTexto'), b = $('[data-as="voz"]'); if (!ta) return;
  if (dictado) { try { dictado.stop(); } catch (e) {} return; }
  const base = ta.value.trim();
  const poner = (t, fin) => { ta.value = (base ? base + ' ' : '') + t; ta.dispatchEvent(new Event('input')); if (fin) ta.focus(); };
  const oye = (on) => { if (b) { b.classList.toggle('oye', on); b.setAttribute('aria-pressed', String(on)); } };
  if (window.InversionesApp) {
    const app = appDicta();
    if (!app) { toast(L('Para dictar, actualiza la app de Android (Ajustes > App de Android).', 'To dictate, update the Android app (Settings > Android app).'), 5000); return; }
    window.resultadoDictado = (t, err) => {
      oye(false);
      if (t) poner(t, true);
      else if (err === 'sin reconocimiento') toast(L('Este móvil no tiene el dictado de Google. Escríbelo o instala la app de Google.', "This phone doesn't have Google voice typing. Type it or install the Google app."), 5000);
      else if (err !== 'cancelado') toast(L('No te he entendido. Prueba otra vez o escríbelo.', "I didn't catch that. Try again or type it."), 4000);
    };
    oye(true);
    try { app.dictar(IDIOMA === 'en' ? 'en-GB' : 'es-ES'); } catch (e) { oye(false); }
    return;
  }
  if (!RecVoz) { toast(L('Este navegador no deja dictar. Prueba con Chrome.', "This browser doesn't support dictation. Try Chrome."), 4000); return; }
  const r = new RecVoz();
  r.lang = IDIOMA === 'en' ? 'en-GB' : 'es-ES'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  dictado = r; oye(true);
  r.onresult = (e) => { let t = ''; for (const x of e.results) t += x[0].transcript; poner(t.trim(), false); };
  r.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast(L('Falta el permiso del micrófono: acéptalo en el navegador (el candado de la barra de direcciones).', 'Microphone permission is missing: allow it in your browser (the padlock in the address bar).'), 5000);
    else if (e.error === 'no-speech') toast(L('No te he oído. Toca el micrófono y habla.', "I didn't hear anything. Tap the microphone and speak."), 3500);
    else if (e.error !== 'aborted') toast(L('No se ha podido dictar. Prueba otra vez o escríbelo.', "Dictation didn't work. Try again or type it."), 3500);
  };
  r.onend = () => { dictado = null; oye(false); ta.focus(); };
  try { r.start(); } catch (e) { dictado = null; oye(false); }
}
function cerrarAsesor(desdeAtras) {
  if (dictado) { try { dictado.abort(); } catch (e) {} dictado = null; }
  const f = $('#asesorFondo'); if (!f) return;
  f.remove(); document.body.style.overflow = '';
  archivarYa();   // 0.8.2: la conversación abierta pasa ya a la lista (ver archivarLuego)
  if (document.body.classList.contains('ia-lado')) { document.body.classList.remove('ia-lado'); for (const b of $$('.riel-ia')) b.setAttribute('aria-expanded', 'false'); }
  if (desdeAtras !== true && S.asesorAtras) S.asesorAtras();
  S.asesorAtras = null;
  // el foco vuelve a lo que la abrió (una cifra, un «Pregúntale»); si ya no está, al botón de la IA
  const o = S.origenIA; S.origenIA = null;
  const b = o && document.body.contains(o) ? o : iaAlLado() ? $('.riel-ia') : $('#bAsesor'); if (b) b.focus({ preventScroll: true });
}
async function clicAsesor(e) {
  const t = e.target.closest('[data-as],[data-as-q]'); if (!t) return;
  if (t.dataset.asQ) return preguntarAsesor(t.dataset.asQ);
  const a = t.dataset.as, fondo = $('#asesorFondo');
  if (a === 'cerrar') cerrarAsesor();
  else if (a === 'convs') { AS.vista = 'convs'; await cargarConvs(); pintarAsesor(); }
  else if (a === 'abrir-conv') { if (abrirConv(t.dataset.id)) pintarAsesor(true); }
  else if (a === 'borrar-conv') { if (!confirm(L('¿Borrar esta conversación de este dispositivo?', 'Delete this conversation from this device?'))) return; await borrarConv(t.dataset.id); toast(L('Conversación borrada', 'Conversation deleted'), 3000); pintarAsesor(); }
  else if (a === 'borrar-convs') { if (!confirm(L('¿Borrar todas tus conversaciones con la IA de este dispositivo?', 'Delete all your conversations with the AI on this device?'))) return; await borrarConv(null); AS.vista = 'chat'; toast(L('Conversaciones borradas', 'Conversations deleted'), 3000); pintarAsesor(); }
  else if (a === 'fondo') { AS.aFondo = t.dataset.m === 'fondo'; pintarAsesor(); }
  else if (a === 'nueva') { if (AS.ctrl) AS.ctrl.abort(); await archivarYa(true); AS.conv = []; AS.api = []; AS.foto = null; AS.convId = null; AS.aFondo = false; AS.vista = 'chat'; LS.del('inv-asesor-conv'); pintarAsesor(); }
  else if (a === 'ajustes') { AS.vista = AS.vista === 'ajustes' ? 'chat' : 'ajustes'; pintarAsesor(); }
  else if (a === 'chat') { AS.vista = 'chat'; pintarAsesor(true); }
  // 0.8.2b: volver a probar si la IA puede contestar (quita la pausa de Claude y repite el sondeo)
  else if (a === 'reprobar') { LS.del(LS_CLAUDE_PAUSA); LS.del(LS_CLAUDE_SONDEO); AS.claudeNo = false; const p = sondearClaude(); pintarAsesor(); await p; pintarAsesor(true); }
  else if (a === 'copiar') copiarCartera();
  else if (a === 'copiar-diario') {
    const txt = `Toisón ${VERSION}${deApp('version') ? ` · app ${deApp('version')}` : ''} · ${navigator.userAgent.replace(/^.*?\(([^)]*)\).*$/, '$1')}\n${textoDiarioIA()}`;
    try { await navigator.clipboard.writeText(txt); toast(L('Copiado el registro de la IA.', "GrowIA's log copied."), 3000); }
    catch (e) { descargar(`registro-growia-${hoyIso()}.txt`, txt); toast(L('No se pudo copiar: te lo he descargado como texto.', "Couldn't copy it: I've downloaded it as text."), 5000); }
  }
  else if (a === 'recorte') iniciarRecorte();
  else if (a === 'voz') dictar();
  else if (a === 'quitar-adjunto') { AS.adjunto = null; pintarAdjunto(); }
  else if (a === 'reintentar') {
    let k = AS.conv.length - 1; while (k >= 0 && AS.conv[k].rol !== 'yo') k--;
    if (k < 0) return;
    const q = AS.conv[k].texto; if (AS.conv[k].adj) AS.adjunto = AS.conv[k].adj; if (AS.conv[k].ctx) S.ctxIA = { ...AS.conv[k].ctx, q, t: Date.now() }; AS.conv.splice(k); preguntarAsesor(q);
  } else if (a === 'guardar-ajustes') {
    const web = $('#asWeb', fondo).checked, antesWeb = cfgAsesor().webPedida;
    guardarCfgAsesor({ web, auto: $('#asAuto', fondo).value, ...(web && !antesWeb ? { web_falla: null } : {}) });
    if ($('#asMotor', fondo)) { LS.set(LS_MOTOR, $('#asMotor', fondo).value); LS.del(LS_CLAUDE_PAUSA); }
    const yo = $('#asYo', fondo).value.trim(), antes = (S.cartera.asesor && S.cartera.asesor.sobre_mi) || '';
    if (yo !== antes) { S.cartera.asesor = { ...(S.cartera.asesor || {}), sobre_mi: yo }; await guardarCartera('Asesor: sobre ti'); AS.foto = null; }
    else toast('Guardado');
    AS.sinWeb = false; AS.vista = 'chat'; pintarAsesor();
  }
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#asesorFondo') && !$('.hoja-fondo') && !$('#globoCifra')) { e.stopPropagation(); cerrarAsesor(); } }, true);

