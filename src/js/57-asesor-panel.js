/* ---------- markdown mínimo y seguro para las respuestas ---------- */
function md(src) {
  const inline = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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

/* ---------- el panel ---------- */
function sugerencias(M) {
  const s = [], anio = new Date().getFullYear();
  // 0.5, modo público: preguntas que GrowIA sí contesta (explicar, comparar, calcular)
  if (esPublico()) {
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
  if (pl) { const res = pl.f.p && pl.f.p.proximos_resultados; s.push(`¿Vendo ya ${pl.f.inst.corto} o espero${res && res >= hoyIso() ? ` a sus resultados del ${fechaCorta(res)}` : ''}?`); }
  s.push('Este mes me sobran 500 €: ¿dónde los meto?');
  const top = M.filas.filter((f) => f.inst.tipo === 'Acción' && f.plPct > 40).sort((a, b) => b.plPct - a.plPct)[0];
  s.push(top ? `Búscame otra jugada como la de ${top.inst.corto}, bien contrastada` : 'Búscame una acción con un motor claro y bien contrastada');
  s.push(`¿Cuánto voy a pagar en la renta de ${anio}?`);
  s.push('¿Qué ha pasado hoy en los mercados que me afecte?');
  s.push('Si la bolsa cae un 30 %, ¿cuánto pierdo y qué hago?');
  return s.slice(0, 6);
}
function htmlTurno(t, k) {
  if (t.rol === 'yo') return `<div class="as-yo">${t.mini || t.donde ? `<div class="as-yo-rec">${t.mini ? `<img src="${esc(t.mini)}" alt="Recorte de la pantalla">` : ''}<small>Recorte de ${esc(t.donde || 'la pantalla')}</small></div>` : ''}${esc(t.texto)}</div>`;
  const vivo = AS.cargando && k === AS.conv.length - 1;
  const ult = t.partes[t.partes.length - 1];
  const partes = t.partes.map((p) => (p.tipo === 'texto' ? `<div class="as-md">${md(p.texto)}</div>` : `<div class="as-paso">${p.web ? ICONOS.mercados : ICONOS.calc}<span>${esc(p.txt)}</span></div>`)).join('');
  const vistas = new Set();
  const fuentes = (t.citas.length ? t.citas : t.resultados.slice(0, 5)).filter((x) => !vistas.has(x.u) && vistas.add(x.u)).slice(0, 8);
  const dom = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
  return `<div class="as-ia${vivo ? ' vivo' : ''}" id="asT${k}">${partes}
    ${vivo && !(ult && ult.tipo === 'texto' && ult.texto) ? '<div class="as-pensando" aria-label="Pensando"><i></i><i></i><i></i></div>' : ''}
    ${t.error ? `<div class="as-error">${esc(t.error)} <button class="enlace" data-as="reintentar">Volver a preguntar</button></div>` : ''}
    ${!vivo && fuentes.length ? `<div class="as-fuentes"><span class="k">Fuentes</span>${fuentes.map((x) => `<a href="${esc(x.u)}" target="_blank" rel="noopener noreferrer" title="${esc(x.t)}">${esc(x.d || dom(x.u))}</a>`).join('')}</div>` : ''}
    ${!vivo && t.modelo && MODELOS[t.modelo] && !t.error ? `<small class="as-modelo-de">${L('Con', 'With')} ${esc(MODELOS[t.modelo].n)}</small>` : ''}
  </div>`;
}
/* 0.7: lo gastado hoy de cada modelo desde este dispositivo */
function htmlCupoIA() {
  const u = usoIAHoy();
  const partes = Object.keys(MODELOS).map((k) => `${esc(MODELOS[k].corto || MODELOS[k].n)} ${CUPO_DIA[k] ? `${Math.min(u[k] || 0, CUPO_DIA[k])} ${L('de', 'of')} ${CUPO_DIA[k]}` : u[k] || 0}${agotadosIA().includes(k) ? ` (${L('agotado', 'used up')})` : ''}`);
  return `${L('Hoy, desde este dispositivo', 'Today, from this device')}: ${partes.join(' · ')}. ${L('Se renueva a medianoche de California (las 9:00 en España). Si usas la clave en otro sitio, también gasta.', 'It resets at midnight California time (9:00 in Spain). Using the key elsewhere also counts.')}`;
}
function htmlClaveAsesor() {
  const cfg = cfgAsesor();
  return `<div class="as-config">
    <h3 data-no-trad>${conIA('Activa GrowIA, gratis', 'Turn on GrowIA, for free')}</h3>
    <p>GrowIA funciona con ${esc(MODELOS[cfg.modelo].n)}, la IA de Google, con una clave gratuita de Google AI Studio. No hace falta tarjeta.</p>
    <ol class="as-pasos-clave">
      <li>Entra en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/apikey</a> con tu cuenta de Google.</li>
      <li>Pulsa «Create API key» y copia la clave entera: empieza por <code>AQ.</code> (o por <code>AIza</code> si es de las antiguas).</li>
      <li>Pégala aquí. Se guarda cifrada con la clave de tu cartera y solo viaja de tu navegador a Google.</li>
    </ol>
    <label class="campo">Clave de Google<input type="password" id="asClave" placeholder="AQ.… o AIza…" autocomplete="off" spellcheck="false"></label>
    <label class="check"><input type="checkbox" id="asSync"> Guardarla también en tu cartera cifrada, para no tener que ponerla en el móvil</label>
    <div class="error" id="asErr"></div>
    <div class="fila-btns" style="justify-content:flex-start"><button class="btn pri" data-as="guardar-clave">Guardar y probar</button>${AS.clave ? '<button class="btn" data-as="chat">Volver</button>' : ''}</div>
    <p class="nota" style="margin:0">El plan gratuito tiene un tope de preguntas por minuto y por día (los tuyos, en aistudio.google.com/rate-limit); si lo pasas, GrowIA espera o te avisa. No actives la facturación en ese proyecto o empezará a cobrarte. Desde España, por las condiciones de Google para la UE, lo que mandas con la clave gratuita no se usa para mejorar sus productos.</p>
    <div class="as-sin-clave">
      <b>Sin clave</b>
      <p>Copia tu cartera de ahora mismo junto con tu pregunta y pégala en un chat de Gemini. No hace los cálculos de GrowFolio en directo, pero tiene todos tus datos.</p>
      <button class="btn" data-as="copiar">${ICONOS.copiar}Copiar mi cartera para Gemini</button>
    </div>
  </div>`;
}
function htmlAjustesAsesor() {
  const cfg = cfgAsesor();
  const yo = (S.cartera.asesor && S.cartera.asesor.sobre_mi) || '';
  return `<div class="as-config">
    <h3>Ajustes de GrowIA</h3>
    <fieldset class="as-modelos"><legend>Modelo de Gemini (todos gratis con tu clave)</legend>${Object.entries(MODELOS).map(([k, m]) => `<label class="as-modelo"><input type="radio" name="asModelo" value="${k}"${cfg.modelo === k ? ' checked' : ''}><span><b>${m.n}</b><small>${m.txt}</small></span></label>`).join('')}</fieldset>
    <label class="check"><input type="checkbox" id="asWeb"${cfg.webPedida ? ' checked' : ''}> Puede buscar en internet con Google</label>
    ${cfg.webFalla ? '<p class="nota" style="margin:-6px 0 0">Tu plan de Google no incluye la búsqueda en internet: de momento GrowIA contrasta con los titulares que baja GrowFolio. Lo vuelve a intentar dentro de unos días.</p>' : ''}
    <label class="campo">Análisis automático de tu cartera<select id="asAuto"><option value="diario"${cfg.auto === 'diario' ? ' selected' : ''}>Cada día y cuando cambie una señal</option><option value="semanal"${cfg.auto === 'semanal' ? ' selected' : ''}>Cada semana</option><option value="manual"${cfg.auto === 'manual' ? ' selected' : ''}>Solo cuando yo lo pida</option></select><small>Lo escribe GrowIA con tus cifras y las noticias del día, en Análisis, Expertos y Paso a paso. Gratis.</small></label>
    <label class="campo">Lo que quieres que sepa de ti<textarea id="asYo" rows="6" placeholder="Por ejemplo: tu edad, para qué inviertes, si piensas comprar casa y cuándo, cuánto riesgo aguantas, tus reglas para las acciones sueltas…">${esc(yo)}</textarea><small>Va dentro de tu cartera cifrada y lo lee al empezar cada conversación.</small></label>
    <div class="fila-btns" style="justify-content:flex-start"><button class="btn pri" data-as="guardar-ajustes">Guardar</button><button class="btn" data-as="chat">Volver</button></div>
    <div class="seccion-ed"><h3>Clave de Google</h3>
      <p class="nota" style="margin:0">${AS.clave ? `Guardada${S.cartera.asesor && S.cartera.asesor[CAMPO_CLAVE[cfg.prov]] ? ', también en tu cartera cifrada' : ' en este dispositivo'}, termina en …${esc(AS.clave.slice(-4))}.` : 'Sin clave.'}</p>
      ${AS.clave ? `<p class="nota as-cupo" style="margin:0">${htmlCupoIA()}</p>` : ''}
      <div class="fila-btns" style="justify-content:flex-start"><button class="btn peq" data-as="cambiar-clave">${AS.clave ? 'Cambiar clave' : 'Poner clave'}</button>${AS.clave ? '<button class="btn peq peligro" data-as="borrar-clave">Borrar clave</button>' : ''}</div>
    </div>
  </div>`;
}
function pintarAsesor(alFinal) {
  const fondo = $('#asesorFondo'); if (!fondo) return;
  const cfg = cfgAsesor();
  const cuerpo = $('#asCuerpo', fondo), pie = $('#asPie', fondo);
  const vivo = modeloVivo(cfg);
  const usados = usoIAHoy()[vivo] || 0;
  $('#asSub', fondo).textContent = `${MODELOS[vivo].n}${vivo !== cfg.modelo ? ` (el ${MODELOS[cfg.modelo].corto || MODELOS[cfg.modelo].n} ha gastado su cupo de hoy)` : ''}${CUPO_DIA[vivo] ? ` · ${L(`${Math.min(usados, CUPO_DIA[vivo])} de ${CUPO_DIA[vivo]} hoy`, `${Math.min(usados, CUPO_DIA[vivo])} of ${CUPO_DIA[vivo]} today`)}` : ''}${cfg.web && !AS.sinWeb ? ', con búsqueda en internet' : ''}`;
  const rapida = cfg.modelo === MODELO_RAPIDO;
  $('#asModo', fondo).innerHTML = `<span>Respuesta</span><div class="seg" role="group" aria-label="Tipo de respuesta"><button type="button" data-as="modo" data-m="normal" aria-pressed="${!rapida}">Normal</button><button type="button" data-as="modo" data-m="rapida" aria-pressed="${rapida}">Rápida</button></div><small>${rapida ? 'Contesta en segundos y gasta mucho menos cupo' : 'Piensa más a fondo; si se agota, salta sola a otro modelo'}</small>`;
  const vista = !AS.clave && AS.vista !== 'ajustes' ? 'clave' : AS.vista;
  if (vista === 'clave') cuerpo.innerHTML = htmlClaveAsesor();
  else if (vista === 'ajustes') cuerpo.innerHTML = htmlAjustesAsesor();
  else if (!AS.conv.length) cuerpo.innerHTML = `<div class="as-vacio"><h3>¿Qué quieres saber?</h3><p>Tiene delante tu cartera de ahora mismo: lo que tienes y lo que te costó, tus aportaciones, lo que llevas de renta este año, los analistas, cientos de empresas de EEUU y Europa para buscar ideas y las noticias. Calcula ventas con FIFO e impuestos${cfg.web ? ' y busca en internet lo que le falte' : ''}.</p><div class="as-sug">${sugerencias(S.M || calcular()).map((q) => `<button data-as-q="${esc(q)}">${esc(q)}</button>`).join('')}<button type="button" class="as-sug-rec" data-as="recorte">${ICONOS.recorte}<span>Recorta un trozo de la pantalla y pregúntale por él</span></button></div></div>`;
  else cuerpo.innerHTML = AS.conv.map(htmlTurno).join('');
  pie.hidden = vista !== 'chat';
  const b = $('#asEnviar', fondo);
  b.classList.toggle('parar', AS.cargando); b.innerHTML = AS.cargando ? ICONOS.parar : ICONOS.enviar;
  b.setAttribute('aria-label', AS.cargando ? 'Parar' : 'Enviar'); b.disabled = false;
  pintarAdjunto();
  $('#asNota', fondo).textContent = 'Gratis con tu clave de Google. Tus datos van de tu navegador a Google, cifrados en el camino; no pasan por GrowFolio.';
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
        <button class="ib" data-as="ajustes" title="Ajustes de GrowIA" aria-label="Ajustes de GrowIA">${ICONOS.ajustes}</button>
        <button class="ib ib-bicho" data-accion="opinion" title="Avisar de un fallo o mandar una idea" aria-label="Avisar de un fallo">${ICONOS.bicho}</button>
        <button class="ib" data-as="cerrar" aria-label="Cerrar">${ICONOS.cerrar}</button></header>
      <div class="as-cuerpo" id="asCuerpo" aria-live="polite"></div>
      <footer class="as-pie" id="asPie"><div class="as-modo" id="asModo"></div><div id="asAdjunto"></div><form class="as-form" id="asForm"><button type="button" class="as-adj" data-as="recorte" title="Recorta un trozo de la pantalla para preguntar por él" aria-label="Recortar la pantalla">${ICONOS.recorte}</button><textarea id="asTexto" rows="1" placeholder="Pregunta lo que quieras de tu cartera" aria-label="Tu pregunta"></textarea>${dictadoPosible() ? `<button type="button" class="as-adj as-voz" data-as="voz" title="Dictar la pregunta" aria-label="Dictar la pregunta" aria-pressed="false">${ICONOS.micro}</button>` : ''}<button class="as-enviar" id="asEnviar" type="submit" aria-label="Enviar">${ICONOS.enviar}</button></form><small id="asNota"></small></footer>
    </section>`;
    fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrarAsesor(); else clicAsesor(e); });
    document.body.appendChild(fondo);
    document.body.style.overflow = 'hidden';
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
  if (AS.vista !== 'chat' && AS.clave) AS.vista = 'chat';
  pintarAsesor(true);
  const ta = $('#asTexto', fondo);
  if (pregunta && enviar && AS.clave) preguntarAsesor(pregunta);
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
  if (desdeAtras !== true && S.asesorAtras) S.asesorAtras();
  S.asesorAtras = null;
  const b = $('#bAsesor'); if (b) b.focus({ preventScroll: true });
}
async function probarClave(clave) {
  const cfg = cfgAsesor();
  const r = await fetchGoogle(`${GEMINI}/models/${cfg.modelo}`, {}, clave);
  if (r.ok) return;
  let j = null; try { j = await r.json(); } catch (e) {}
  if (r.status === 404) { const m = await mejorFlash(clave); if (m) { guardarCfgAsesor({ modelo: m }); return; } }
  throw errorGoogle(r.status, j);
}
async function copiarCartera() {
  refrescarFoto(true);
  const q = ($('#asTexto') && $('#asTexto').value.trim()) || '';
  const ia = 'Gemini';
  const texto = `${instruccionesAsesor()}\n\n${contextoAsesor(S.M || calcular(), 'completo')}\n\n${q ? `Mi pregunta: ${q}` : 'Mi pregunta: '}`;
  try { await navigator.clipboard.writeText(texto); toast(`Copiado. Pégalo en un chat de ${ia} y escribe tu pregunta al final.`, 6000); }
  catch (e) { descargar(`cartera-para-la-ia-${hoyIso()}.txt`, texto); toast('No se pudo copiar: te lo he descargado como texto.', 6000); }
  window.open('https://gemini.google.com/app', '_blank', 'noopener');
}
async function clicAsesor(e) {
  const t = e.target.closest('[data-as],[data-as-q]'); if (!t) return;
  if (t.dataset.asQ) return preguntarAsesor(t.dataset.asQ);
  const a = t.dataset.as, fondo = $('#asesorFondo');
  if (a === 'cerrar') cerrarAsesor();
  else if (a === 'modo') {
    const cfg = cfgAsesor(), c = LS.get('inv-asesor-cfg2', {});
    if (t.dataset.m === 'rapida' && cfg.modelo !== MODELO_RAPIDO) guardarCfgAsesor({ modelo: MODELO_RAPIDO, normal: cfg.modelo });
    else if (t.dataset.m === 'normal' && cfg.modelo === MODELO_RAPIDO) guardarCfgAsesor({ modelo: c.normal && c.normal !== MODELO_RAPIDO && MODELOS[c.normal] ? c.normal : MODELO_DEF });
    pintarAsesor();
  }
  else if (a === 'nueva') { if (AS.ctrl) AS.ctrl.abort(); AS.conv = []; AS.api = []; AS.foto = null; AS.vista = 'chat'; LS.del('inv-asesor-conv'); pintarAsesor(); }
  else if (a === 'ajustes') { AS.vista = AS.vista === 'ajustes' ? 'chat' : 'ajustes'; pintarAsesor(); }
  else if (a === 'chat') { AS.vista = 'chat'; pintarAsesor(true); }
  else if (a === 'cambiar-clave') { AS.vista = 'clave'; pintarAsesor(); $('#asCuerpo').innerHTML = htmlClaveAsesor(); }
  else if (a === 'copiar') copiarCartera();
  else if (a === 'recorte') iniciarRecorte();
  else if (a === 'voz') dictar();
  else if (a === 'quitar-adjunto') { AS.adjunto = null; pintarAdjunto(); }
  else if (a === 'reintentar') {
    let k = AS.conv.length - 1; while (k >= 0 && AS.conv[k].rol !== 'yo') k--;
    if (k < 0) return;
    const q = AS.conv[k].texto; if (AS.conv[k].adj) AS.adjunto = AS.conv[k].adj; AS.conv.splice(k); preguntarAsesor(q);
  } else if (a === 'borrar-clave') {
    const pv = cfgAsesor().prov;
    AS.clave = null; LS.del(LS_CLAVE[pv]);
    if (S.cartera.asesor && S.cartera.asesor[CAMPO_CLAVE[pv]]) { delete S.cartera.asesor[CAMPO_CLAVE[pv]]; await guardarCartera('Asesor: borrar clave'); }
    AS.vista = 'clave'; pintarAsesor();
  } else if (a === 'guardar-clave') {
    const c = $('#asClave', fondo).value.trim(), err = $('#asErr', fondo), pv = cfgAsesor().prov;
    if (pv === 'google' && !/^[\w.-]{30,}$/.test(c)) { err.textContent = 'Eso no parece una clave de Google AI Studio: son una sola línea larga, sin espacios, que empieza por «AQ.» o por «AIza».'; return; }
    t.disabled = true; t.textContent = 'Probando…'; err.textContent = '';
    try {
      await probarClave(c);
      AS.clave = c; LS.set(LS_CLAVE[pv], await cifrarLocal(c));
      if ($('#asSync', fondo).checked) { S.cartera.asesor = { ...(S.cartera.asesor || {}), [CAMPO_CLAVE[pv]]: c }; await guardarCartera('Asesor: clave'); }
      AS.vista = 'chat'; toast('Clave guardada: ya puedes preguntar'); pintarAsesor(); revisarAnalisisIA();
    } catch (x) { err.textContent = /Failed to fetch|NetworkError|Load failed/i.test(x.message) ? `No se pudo conectar con ${PROV[pv].n}.` : x.message; t.disabled = false; t.textContent = 'Guardar y probar'; }
  } else if (a === 'guardar-ajustes') {
    const modelo = (fondo.querySelector('input[name="asModelo"]:checked') || {}).value;
    const web = $('#asWeb', fondo).checked, antesWeb = cfgAsesor().webPedida;
    guardarCfgAsesor({ modelo, web, auto: $('#asAuto', fondo).value, ...(web && !antesWeb ? { web_falla: null } : {}) });
    const yo = $('#asYo', fondo).value.trim(), antes = (S.cartera.asesor && S.cartera.asesor.sobre_mi) || '';
    if (yo !== antes) { S.cartera.asesor = { ...(S.cartera.asesor || {}), sobre_mi: yo }; await guardarCartera('Asesor: sobre ti'); AS.foto = null; }
    else toast('Guardado');
    AS.sinWeb = false; AS.vista = 'chat'; pintarAsesor();
  }
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#asesorFondo') && !$('.hoja-fondo')) { e.stopPropagation(); cerrarAsesor(); } }, true);

