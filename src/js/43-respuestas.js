/* =====================================================================
   Las respuestas a lo que mandaste (0.4). Quien hace GrowFolio puede contestar cada opinión o fallo desde
   Ajustes > Opiniones recibidas; a quien la mandó le sale la respuesta en pantalla al abrir GrowFolio (o al volver a
   ella), una vez: al cerrarla queda como leída y el dueño lo ve. Las reglas de Firestore solo dejan que cada cuenta lea
   las suyas y que lo único que pueda cambiar en ellas sea marcarlas como leídas.
   ===================================================================== */
async function misOpiniones() {
  if (!PERFIL_CUENTA) return null;
  await fbCargar(); if (!FB.user) return null;
  const f = FB.fs;
  try {
    // sin orderBy: con un solo «where» Firestore no necesita un índice compuesto; se ordenan aquí
    const r = await conTiempo(f.getDocs(f.query(f.collection(FB.db, 'opiniones'), f.where('uid', '==', FB.user.uid), f.limit(100))), 10000);
    return r.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (fechaOpi(b) || 0) - (fechaOpi(a) || 0));
  } catch (e) { console.warn('opiniones', e); return null; }
}
const opiOcupado = () => document.hidden || !!document.querySelector('.hoja-fondo, .tour, .estreno, .intro, .ficha-fondo') || !!S.ficha;
/* 0.4d: en vivo. Una suscripción a lo que has mandado: en cuanto te contestan (o cambian la respuesta), sale en
   pantalla; si estás con otra cosa (una hoja, la guía, una presentación), en cuanto acabas. Antes se miraba al abrir
   y, al volver a la app, como mucho cada diez minutos: una respuesta podía quedarse sin salir */
async function vigilarRespuestas() {
  if (!PERFIL_CUENTA || S.vigilaResp || S.mirandoResp) return;
  S.mirandoResp = true;
  try { await fbCargar(); } finally { S.mirandoResp = false; }
  if (!FB.user || !FB.fs || S.vigilaResp) return;
  const f = FB.fs;
  try {
    S.vigilaResp = f.onSnapshot(f.query(f.collection(FB.db, 'opiniones'), f.where('uid', '==', FB.user.uid), f.limit(100)), (snap) => {
      S.misOpis = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (fechaOpi(b) || 0) - (fechaOpi(a) || 0));
      S.respMirado = Date.now();
      respuestasPendientes();
    }, (e) => { console.warn('opiniones', e); S.vigilaResp = null; });
  } catch (e) { console.warn('opiniones', e); S.vigilaResp = null; }
}
function respuestasPendientes() {
  clearTimeout(S.respLuego);
  // una respuesta ya enseñada en esta sesión no vuelve (si marcarla como leída fallara, saldría en bucle)
  const vistas = S.respVistas || (S.respVistas = new Set());
  const l = (S.misOpis || []).filter((o) => o.respuesta && o.vista !== true && !vistas.has(o.id + '|' + o.respuesta));
  if (!l.length || !S.cartera || document.querySelector('.hoja-resp')) return;
  if (opiOcupado()) { S.respLuego = setTimeout(respuestasPendientes, 3000); return; }
  for (const o of l) vistas.add(o.id + '|' + o.respuesta);
  verRespuestas(l, true);
}
async function revisarRespuestas() {
  if (!PERFIL_CUENTA || !S.cartera) return;
  if (S.vigilaResp) return respuestasPendientes();
  await vigilarRespuestas();
}
// al volver a GrowFolio (la app se queda abierta en segundo plano): si la suscripción se cayó, otra; si no, lo pendiente
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.cartera) revisarRespuestas(); });
/* l: las que enseñar; nuevas: si son respuestas sin leer (al cerrar quedan leídas) o el historial que se abre a mano */
function verRespuestas(l, nuevas) {
  const tuyo = (o) => {
    const t = textoOpi(o);
    const est = o.nota != null ? `<span class="resp-est" aria-label="${L(`${o.nota} de 5`, `${o.nota} out of 5`)}">${'★'.repeat(o.nota)}${'☆'.repeat(Math.max(0, 5 - o.nota))}</span>` : '';
    return `<div class="resp-tuyo"><div class="resp-meta">${L('Tú', 'You')}${o.tipo && o.tipo !== 'puntuacion' ? `, ${esc(trad(o.tipo).toLowerCase())}` : ''}${o.sitio && o.sitio !== 'La app en general' && o.tipo !== 'puntuacion' ? ` ${L('en', 'in')} ${esc(trad(o.sitio))}` : ''}<time>${esc(cuandoOpi(fechaOpi(o)))}</time></div>${est}${t ? `<p>${esc(t.length > 600 ? t.slice(0, 600) + '…' : t)}</p>` : ''}</div>`;
  };
  const suyo = (o) => o.respuesta ? `<div class="resp-suya">
      <div class="resp-meta">${svgMarca('resp-marca')}<b>${esc(o.por ? L(`${o.por}, de GrowFolio`, `${o.por}, from GrowFolio`) : 'GrowFolio')}</b><time>${esc(cuandoOpi(fechaOpi({ cuando: o.respondida })))}</time></div>
      <p>${esc(o.respuesta)}</p>
    </div>` : `<p class="resp-espera">${L('Sin respuesta todavía.', 'No reply yet.')}</p>`;
  const titulo = nuevas ? (l.length === 1 ? L('Te han respondido', 'You have a reply') : L(`Tienes ${l.length} respuestas`, `You have ${l.length} replies`)) : L('Lo que has mandado', 'What you have sent');
  const h = hoja(titulo, `<div class="resp-hoja">
      ${nuevas ? `<p class="nota">${l.length === 1 ? L('A lo que mandaste a GrowFolio:', 'To what you sent to GrowFolio:') : L('A lo que mandaste a GrowFolio, de lo más nuevo a lo más antiguo:', 'To what you sent to GrowFolio, newest first:')}</p>` : ''}
      <ul class="resp-lista">${l.map((o) => `<li class="resp">${tuyo(o)}${suyo(o)}</li>`).join('')}</ul>
      <div class="fila-btns"><button type="button" class="btn" id="bRespOtra">${L('Escribir otra vez', 'Write again')}</button><button type="button" class="btn pri" data-cerrar>${nuevas ? L('Entendido', 'Got it') : L('Cerrar', 'Close')}</button></div>
    </div>`, () => { if (nuevas) marcarLeidas(l); });
  h.el.classList.add('hoja-resp');
  $('#bRespOtra', h.el).onclick = () => { h.cerrar(); abrirOpinion(); };
}
async function marcarLeidas(l) {
  const f = FB.fs; if (!f || !FB.user) return;
  await Promise.all(l.filter((o) => o.respuesta && o.vista !== true).map((o) => conTiempo(f.updateDoc(f.doc(FB.db, 'opiniones', o.id), { vista: true }), 10000).then(() => { o.vista = true; }).catch((e) => console.warn('opiniones', e))));
}
/* ¿Qué te parece GrowFolio? Cuando alguien la ha usado 5 días distintos (no hace falta seguidos), un rato después de
   abrirla le sale una vez: de 1 a 5 estrellas y, si quiere, un comentario (con 3 o menos, qué mejoraría). Llega como
   las opiniones, con la nota. Si la cierra sin contestar, vuelve al mes, y como mucho dos veces. */
function apuntarDiaUso() {
  const d = LS.get('inv-dias-uso', []), h = hoyIso();
  if (!d.includes(h)) LS.set('inv-dias-uso', [...d, h].slice(-60));
}
function tocaNota() {
  if (!S.cartera || LS.get('inv-nota', null) || !PERFIL_CUENTA) return false;
  if (LS.get('inv-dias-uso', []).length < 5) return false;
  const l = LS.get('inv-nota-luego', null);
  return !l || (l.n < 2 && Date.now() - l.t > 30 * 864e5);
}
async function pedirNota(intento = 0) {
  if (!tocaNota()) return;
  if (document.hidden || document.querySelector('.hoja-fondo, .tour, .estreno, .intro, .ficha-fondo') || S.ficha) { if (intento < 8) setTimeout(() => pedirNota(intento + 1), 60000); return; }
  const est = (n) => `<button type="button" class="nota-est" data-nota="${n}" aria-label="${n} de 5"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/></svg></button>`;
  const dias = LS.get('inv-dias-uso', []).length;
  let nota = 0, enviada = false;
  const h = hoja('¿Qué te parece GrowFolio?', `<form class="nota-f" novalidate>
      <p class="nota-intro">${L(`Llevas ${dias} días usándola. ¿Cuántas estrellas le das?`, `You've used it on ${dias} days. How many stars would you give it?`)}</p>
      <div class="nota-ests" role="radiogroup" aria-label="Tu nota">${[1, 2, 3, 4, 5].map(est).join('')}</div>
      <p class="nota-dice" aria-live="polite"></p>
      <label class="campo nota-com" hidden><span class="nota-q"></span><textarea name="txt" rows="4" maxlength="2000"></textarea></label>
      <div class="error nota-err"></div>
      <div class="fila-btns"><button type="button" class="btn" data-cerrar>Ahora no</button><button type="submit" class="btn pri" disabled>Enviar</button></div>
    </form>`, () => { if (!enviada) { const l = LS.get('inv-nota-luego', null) || { n: 0 }; LS.set('inv-nota-luego', { n: (l.n || 0) + 1, t: Date.now() }); } });
  h.el.classList.add('hoja-nota');
  const f = $('.nota-f', h.el), DICE = ['', 'Vaya, lo sentimos.', 'Mejorable, entendido.', 'Bien, sin más.', '¡Gracias!', '¡Gracias! Nos alegra que te guste.'];
  const marcar = (n) => {
    nota = n;
    for (const b of $$('.nota-est', h.el)) { const on = +b.dataset.nota <= n; b.classList.toggle('on', on); b.setAttribute('aria-pressed', +b.dataset.nota === n); }
    $('.nota-dice', h.el).textContent = DICE[n];
    const c = $('.nota-com', h.el); c.hidden = false;
    $('.nota-q', h.el).textContent = n <= 3 ? '¿Qué mejorarías? (opcional)' : 'Lo que más te gusta o lo que añadirías (opcional)';
    f.txt.placeholder = n <= 3 ? 'Lo que no te convence, lo que echas en falta o lo que te cuesta entender' : 'Por ejemplo: el Paso a paso, el widget, que GrowIA me pregunte…';
    $('button[type=submit]', f).disabled = false;
  };
  h.el.addEventListener('click', (e) => { const b = e.target.closest('[data-nota]'); if (b) marcar(+b.dataset.nota); });
  f.onsubmit = async (e) => {
    e.preventDefault(); if (!nota) return;
    const b = $('button[type=submit]', f); b.disabled = true; b.textContent = 'Enviando…';
    try {
      await mandarOpinion({ tipo: 'puntuacion', sitio: 'general', nota, texto: `${'★'.repeat(nota)}${'☆'.repeat(5 - nota)} (${nota}/5)${f.txt.value.trim() ? '\n' + f.txt.value.trim() : ''}`, quien: nombreUsuario() || null, info: `${dias} días de uso · ${window.InversionesApp ? 'app' : 'web'}` });
      enviada = true; LS.set('inv-nota', { n: nota, v: VERSION, t: Date.now() });
      h.cerrar(true);
      toast(nota >= 4 ? '¡Gracias! Si se lo pasas a alguien, mejor aún.' : 'Gracias. Lo leemos y lo intentamos arreglar en la siguiente versión.', 4500);
    } catch (er) { $('.nota-err', h.el).textContent = 'No se ha podido enviar. Mira la conexión y prueba otra vez.'; b.disabled = false; b.textContent = 'Enviar'; }
  };
}
async function abrirOpinion() {
  const sitio = document.getElementById('asesorFondo') ? 'asesor' : S.ficha ? 'ficha' : S.vista === 'cartera' && S.carTab === 'plan' ? 'plan' : S.vista || 'general';
  const directa = PERFIL_CUENTA, hist = LS.get('inv-opi-hist', []);
  const h = hoja('Avisar de un fallo o una idea', `<form id="fOpi" class="pf-form" novalidate>
    <fieldset class="opciones"><legend>Qué es</legend><div class="opc-fila">${TIPOS_OP.map(([k, t], i) => `<label class="opc"><input type="radio" name="tipo" value="${k}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
    <label class="campo">Dónde<select name="sitio">${SITIOS_OP.map(([k, t]) => `<option value="${k}"${k === sitio ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo">Cuéntalo<textarea name="txt" rows="5" placeholder="Qué ves, qué esperabas o qué se te ha ocurrido. Si es algo que falla, qué estabas haciendo."></textarea>${directa ? '' : '<small>Si es algo visual, manda también una captura en el mismo chat.</small>'}</label>
    ${directa ? `<label class="campo">Tu nombre<input name="quien" maxlength="40" value="${esc(LS.get('inv-opi-nombre', '') || '')}" placeholder="Opcional, para saber quién lo dice"></label>` : ''}
    <p class="nota" style="margin:0">${directa ? L('Llega directamente a quien hace GrowFolio, que te puede contestar aquí mismo.', 'It goes straight to the people who make GrowFolio, who can reply to you right here.') : L('Se abre WhatsApp con el mensaje escrito: elige el chat de quien te pasó GrowFolio.', 'WhatsApp opens with the message written: pick the chat of whoever shared GrowFolio with you.')} ${L('Solo va lo que escribes, la sección y la versión, nada de tu cartera.', 'Only what you write, the section and the version are sent, nothing from your portfolio.')}${hist.length ? ' ' + (hist.length === 1 ? L('Llevas 1 enviada: gracias.', "You've sent 1 so far: thanks.") : L(`Llevas ${hist.length} enviadas: gracias.`, `You've sent ${hist.length} so far: thanks.`)) : ''}</p>
    ${directa ? '<div id="opiMias"></div>' : ''}
    <div class="error" id="errOpi"></div>
    <div class="fila-btns">${directa ? '' : `<button type="button" class="btn" id="bOpiCopiar">Copiar</button>${navigator.share ? '<button type="button" class="btn" id="bOpiComp">Compartir…</button>' : ''}`}<button type="submit" class="btn pri" id="bOpiEnviar">${ICONOS.globo}${directa ? 'Enviar' : 'Enviar por WhatsApp'}</button></div>
  </form>`);
  const f = $('#fOpi', h.el);
  if (directa) misOpiniones().then((l) => {
    const w = $('#opiMias', h.el); if (!l || !l.length || !w) return;
    const r = l.filter((o) => o.respuesta).length;
    w.innerHTML = `<button type="button" class="opi-mias">${ICONOS.globo}<span>${L(`Lo que has mandado (${l.length})`, `What you have sent (${l.length})`)}<small>${r ? (r === 1 ? L('1 con respuesta', '1 with a reply') : L(`${r} con respuesta`, `${r} with a reply`)) : L('Sin respuestas todavía', 'No replies yet')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>`;
    $('.opi-mias', w).onclick = () => { h.cerrar(true); verRespuestas(l, false); };
  });
  const texto = () => {
    const tipo = (f.querySelector('[name=tipo]:checked') || {}).value || 'otra', sitio = f.sitio.value, t = f.txt.value.trim();
    if (!t) { $('#errOpi', h.el).textContent = 'Escribe qué pasa o qué se te ocurre.'; return null; }
    const tt = (TIPOS_OP.find(([k]) => k === tipo) || [])[1], st = (SITIOS_OP.find(([k]) => k === sitio) || [])[1];
    const disp = [`web ${VERSION}`, window.InversionesApp ? `app ${(() => { try { return window.InversionesApp.nombreVersion() || versionApp(); } catch (e) { return versionApp(); } })()}` : null, /Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone' : 'ordenador', `${innerWidth} px`, PERFIL_CUENTA ? `cuenta ${(FB.user && FB.user.providerData && FB.user.providerData[0] && FB.user.providerData[0].providerId === 'google.com') ? 'Google' : 'correo'}` : PERFIL_LOCAL ? 'cartera en el móvil' : null].filter(Boolean).join(', ');
    return `GrowFolio, ${String(tt).toLowerCase()} en ${st}:\n\n${t}\n\n(${disp})`;
  };
  if ($('#bOpiCopiar', h.el)) $('#bOpiCopiar', h.el).onclick = async () => { const t = texto(); if (!t) return; try { await navigator.clipboard.writeText(t); toast('Copiado: pégalo donde quieras'); } catch (e) { toast('No se pudo copiar'); } };
  if ($('#bOpiComp', h.el)) $('#bOpiComp', h.el).onclick = async () => { const t = texto(); if (!t) return; try { await navigator.share({ text: t }); h.cerrar(); } catch (e) {} };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const t = texto(); if (!t) return;
    if (directa) {
      const tipo = (f.querySelector('[name=tipo]:checked') || {}).value || 'otra', st = f.sitio.value;
      const quien = (f.quien && f.quien.value.trim()) || '';
      LS.set('inv-opi-nombre', quien);
      const b = $('#bOpiEnviar', h.el); b.disabled = true; b.textContent = 'Enviando…';
      try {
        await mandarOpinion({ tipo: (TIPOS_OP.find(([k]) => k === tipo) || [])[1], sitio: (SITIOS_OP.find(([k]) => k === st) || [])[1], texto: f.txt.value.trim(), quien: quien || (PERFIL_LOCAL ? 'amigo sin nombre' : 'el dueño'), info: t.split('\n').pop().replace(/^\(|\)$/g, '') });
        LS.set('inv-opi-hist', [...hist, { f: hoyIso(), tipo, sitio: st }].slice(-30));
        h.el.querySelector('.hoja').innerHTML = `<div class="opi-ok">${dibujo('logo')}<h2>Recibido, gracias</h2><p>Con lo que mandáis se arregla y se mejora GrowFolio. Si te contestan, te saldrá la respuesta al abrir la app. Si es algo visual, manda también una captura por WhatsApp.</p><div class="fila-btns"><button class="btn pri" data-cerrar>Cerrar</button></div></div>`;
      } catch (e) {
        b.disabled = false; b.innerHTML = ICONOS.globo + 'Enviar';
        $('#errOpi', h.el).textContent = 'No se ha podido enviar (¿sin conexión?). Prueba otra vez en un rato.';
      }
      return;
    }
    const a = document.createElement('a'); a.href = 'https://wa.me/?text=' + encodeURIComponent(t); a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    h.cerrar(); toast('Gracias: ahora elige el chat en WhatsApp', 4000);
  };
}

