/* =====================================================================
   0.5: modo fundador y modo estándar
   Fundador: todo GrowFolio, también el Paso a paso y GrowIA cuando dice qué comprar o vender. Lo tienen el dueño (los
   correos de BANCO_EMAILS), las cuentas creadas antes de la 0.5 y las que el dueño ponga en fundador.
   Estándar: el resto de GrowFolio, sin recomendaciones personalizadas sobre valores concretos (eso es asesoramiento y
   necesita autorización de la CNMV). En el sitio del Paso a paso sale «Tu plan», que llega completo en la 0.9.
   El dueño puede poner cualquier cuenta (también la suya) en un modo u otro desde Ajustes, con una nota que esa persona
   ve al abrir: modos/{correo}. Para que vea todas las cuentas, cada una apunta su correo en cuentas/{uid}.
   Se comprueba al entrar. El último modo se guarda en el dispositivo para no parpadear y para cuando no hay red; sin
   nada guardado, quien ya usaba GrowFolio antes de la 0.5 empieza en fundador y quien llega nuevo, en estándar.
   (Por dentro: 'privado' es fundador y 'publico' es estándar.)
   ===================================================================== */
const VENIA_DE_ANTES = (() => { try { return /^0\.[0-4](\D|$)/.test(String(LS.get('inv-version', '') || '')); } catch (e) { return false; } })();
function accesoInicial() {
  if (CFG.dev) return /[?&]publico\b/.test(location.search) ? 'publico' : 'privado';
  if (!PERFIL_CUENTA) return 'privado';
  const a = LS.get('inv-acceso');
  if (a && (a.a === 'privado' || a.a === 'publico') && (!a.uid || !FB.user || a.uid === FB.user.uid)) return a.a;
  const ini = VENIA_DE_ANTES ? 'privado' : 'publico';
  LS.set('inv-acceso', { a: ini, uid: null, t: Date.now(), provisional: true });
  return ini;
}
function esPublico() {
  if (!S.acceso) S.acceso = accesoInicial();
  return S.acceso === 'publico';
}
const nombreModo = (a) => (a === 'publico' ? L('modo estándar', 'standard mode') : L('modo fundador', 'founder mode'));
const errPermiso = (e) => /permission/i.test(String((e && e.code) || e));
// con correo y contraseña, el correo hay que confirmarlo (las reglas solo dejan leer tu modo con el correo confirmado)
const correoSinConfirmar = () => !!(FB.user && !FB.user.emailVerified && (FB.user.providerData || []).some((x) => x.providerId === 'password'));
/* Fundadores: las cuentas creadas antes del día que salió la 0.5 (los amigos que ya usaban GrowFolio). La fecha de alta
   la pone Firebase. Las que se creen después empiezan en estándar; el dueño las pasa a fundador en Ajustes */
const ALTA_FUNDADORES = '2026-10-23';
const altaDe = (u) => { const t = Date.parse((u && u.metadata && u.metadata.creationTime) || ''); return isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null; };
const esFundadorPorAlta = (alta) => !!alta && alta < ALTA_FUNDADORES;
async function comprobarAcceso() {
  if (!PERFIL_CUENTA || CFG.dev) return;
  try {
    await fbCargar(); const u = FB.user; if (!u) return;
    // si lo acaba de confirmar, la sesión aún no lo sabe: se refresca (solo con correo y contraseña sin confirmar)
    if (correoSinConfirmar()) { try { await conTiempo(u.reload(), 8000); if (u.emailVerified) await conTiempo(u.getIdToken(true), 8000); } catch (e) {} }
    const f = FB.fs, correo = String(u.email || '').trim().toLowerCase(), alta = altaDe(u);
    apuntarCuenta(u, correo, alta);
    // lo que haya puesto el dueño para esta cuenta manda
    let puesto = null;
    if (correo) {
      try { const d = await conTiempo(f.getDoc(f.doc(FB.db, 'modos', correo)), 10000); if (d.exists()) puesto = d.data(); }
      catch (e) { if (!errPermiso(e)) return; }
    }
    // el dueño: puede leer todas las opiniones (las reglas de siempre)
    try { await conTiempo(f.getDocs(f.query(f.collection(FB.db, 'opiniones'), f.limit(1))), 10000); S.esDueno = true; S.noDueno = false; }
    catch (e) { if (errPermiso(e)) S.noDueno = true; else if (!puesto && !esFundadorPorAlta(alta)) return; }
    const a = puesto && (puesto.modo === 'fundador' || puesto.modo === 'estandar') ? (puesto.modo === 'fundador' ? 'privado' : 'publico')
      : S.esDueno || esFundadorPorAlta(alta) ? 'privado' : 'publico';
    fijarAcceso(a, u.uid, puesto);
  } catch (e) { console.warn('No se ha podido comprobar el modo', e); }
}
// tu correo y tu fecha de alta, para que el dueño vea todas las cuentas en Ajustes (una vez por dispositivo)
async function apuntarCuenta(u, correo, alta) {
  if (!correo || LS.get('inv-cuenta-apuntada') === u.uid) return;
  try { const f = FB.fs; await conTiempo(f.setDoc(f.doc(FB.db, 'cuentas', u.uid), { correo, alta: alta || '' }), 10000); LS.set('inv-cuenta-apuntada', u.uid); }
  catch (e) { /* sin las reglas nuevas o sin red: a la próxima */ }
}
function fijarAcceso(a, uid, puesto) {
  const ant = LS.get('inv-acceso'), antes = esPublico();
  S.acceso = a; LS.set('inv-acceso', { a, uid: uid || null, t: Date.now() });
  if (esPublico() !== antes) cambioDeAcceso();
  // si el modo de esta cuenta ha cambiado (no la primera vez en este dispositivo), se le cuenta, con la nota del dueño
  if (ant && !ant.provisional && ant.uid === uid && ant.a !== a) setTimeout(() => avisoCambioModo(a, puesto), 1200);
}
function avisoCambioModo(a, puesto, intento = 0) {
  if (document.querySelector('.hoja-fondo, .tour, .intro, .estreno, .bloqueo')) { if (intento < 20) setTimeout(() => avisoCambioModo(a, puesto, intento + 1), 4000); return; }
  const nota = puesto && puesto.nota ? String(puesto.nota) : '';
  hoja(L(`Tu cuenta está ahora en ${nombreModo(a)}`, `Your account is now in ${nombreModo(a)}`), `<div class="priv">
    ${nota ? `<p class="modo-nota">«${esc(nota)}»</p>` : ''}
    <p>${a === 'publico' ? L('Ves GrowFolio sin recomendaciones personalizadas: en el sitio del Paso a paso está «Tu plan», GrowIA te explica y calcula pero no te dice qué comprar o vender, y en cada posición sale lo que opinan los analistas. Tu cartera y todo lo demás siguen igual.', 'You see GrowFolio without personalised recommendations: Your plan replaces Steps, GrowIA explains and calculates but does not tell you what to buy or sell, and each holding shows what analysts think. Your portfolio and everything else stay the same.') : L('Vuelves a ver GrowFolio entero: el Paso a paso, las señales de cada posición y GrowIA cuando dice qué comprar o vender.', 'You see all of GrowFolio again: Steps, the signal on each holding and GrowIA when it says what to buy or sell.')}</p>
    <div class="fila-btns"><button type="button" class="btn pri" data-cerrar>${L('Entendido', 'Got it')}</button></div></div>`);
}
// los nombres de la barra (Paso a paso o Tu plan) y la pestaña de ahora, con el modo nuevo
function cambioDeAcceso() {
  const g = GRUPOS.find((x) => x.k === 'ruta');
  for (const a of $$('.nav [data-ir="ruta"]')) a.textContent = L(g.t, g.en);
  for (const sp of $$('.navbar [data-ir="ruta"] span')) sp.textContent = L(g.c || g.t, g.en);
  if (S.M) { cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__ideas').clear(); cacheDe(S.M, '__plan').clear(); }
  if (S.cartera && $('#vista') && !document.querySelector('.hoja-fondo form, .ficha')) pintar();
}
/* En Ajustes: el dueño, los modos de las cuentas; quien entró con correo y contraseña sin confirmarlo, el botón para
   confirmarlo; los demás, en qué modo están */
async function filaAcceso(h) {
  const w = $('#aAcceso', h.el); if (!w || !PERFIL_CUENTA) return;
  if (S.esDueno) {
    w.innerHTML = `<button class="aj-fila" id="aPriv">${ICONOS.candado}<span><b>${L('Modo de cada cuenta', 'Each account\'s mode')}</b><small>${L(`Fundador o estándar, también la tuya (ahora, ${nombreModo(S.acceso)}). Solo lo ves tú.`, `Founder or standard, yours too (now ${nombreModo(S.acceso)}). Only you see this.`)}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>`;
    $('#aPriv', h.el).onclick = () => { h.cerrar(true); verModos(); };
  } else if (correoSinConfirmar()) {
    w.innerHTML = `<button class="aj-fila" id="aVerif">${ICONOS.alerta}<span><b>${L('Confirma tu correo', 'Confirm your email')}</b><small>${L('Te mandamos un enlace a tu correo. Hace falta, por ejemplo, para el modo fundador si te lo han dado.', 'We send a link to your email. It is needed, for example, for founder mode if you have been given it.')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>`;
    $('#aVerif', h.el).onclick = async () => {
      try { await fbCargar(); await FB.au.sendEmailVerification(FB.user); toast(L(`Te he mandado un correo a ${FB.user.email}. Cuando lo confirmes, vuelve a abrir GrowFolio.`, `I've sent an email to ${FB.user.email}. Once you confirm it, open GrowFolio again.`), 7000); }
      catch (e) { toast(L('No se ha podido mandar ahora. Prueba en un rato.', "Couldn't send it now. Try again later."), 5000); }
    };
  } else {
    w.innerHTML = `<div class="aj-fila aj-info">${ICONOS.candado}<span><b>${L('Tu modo', 'Your mode')}: ${esc(nombreModo(S.acceso))}</b><small>${esPublico() ? L('Sin recomendaciones personalizadas: «Tu plan» en lugar del Paso a paso.', 'No personalised recommendations: Your plan instead of Steps.') : L('GrowFolio entero, con el Paso a paso.', 'All of GrowFolio, with Steps.')}</small></span></div>`;
  }
}
// las cuentas que conoce GrowFolio (las que han abierto la 0.5) y lo que les ha puesto el dueño
async function leerModos() {
  await fbCargar(); const f = FB.fs;
  const [rc, rm] = await Promise.all([conTiempo(f.getDocs(f.collection(FB.db, 'cuentas')), 10000), conTiempo(f.getDocs(f.collection(FB.db, 'modos')), 10000)]);
  const m = new Map();
  for (const d of rc.docs) { const x = d.data(); if (x.correo) m.set(x.correo, { correo: x.correo, alta: x.alta || null }); }
  for (const d of rm.docs) m.set(d.id, { ...(m.get(d.id) || { correo: d.id, alta: null }), puesto: d.data() });
  return [...m.values()].map((x) => ({ ...x, modo: x.puesto && x.puesto.modo ? x.puesto.modo : esFundadorPorAlta(x.alta) ? 'fundador' : 'estandar' }))
    .sort((a, b) => (a.correo === yoCorreo() ? -1 : b.correo === yoCorreo() ? 1 : String(a.alta || '9').localeCompare(String(b.alta || '9')) || a.correo.localeCompare(b.correo)));
}
const yoCorreo = () => String((FB.user && FB.user.email) || '').toLowerCase();
async function verModos() {
  let l;
  try { l = await leerModos(); }
  catch (e) { return toast(errPermiso(e) ? L('Aún no se pueden leer: faltan las reglas nuevas de Firestore, que se publican con la 0.5.', "Can't read them yet: the new Firestore rules, published with 0.5, are missing.") : L('No se ha podido leer (¿sin conexión?).', "Couldn't read them (offline?)."), 7000); }
  const yo = yoCorreo();
  if (yo && !l.some((x) => x.correo === yo)) l.unshift({ correo: yo, alta: altaDe(FB.user), modo: S.acceso === 'publico' ? 'estandar' : 'fundador' });
  const fila = (x) => `<li data-correo="${esc(x.correo)}"><div class="modo-t"><b data-no-trad>${esc(x.correo)}${x.correo === yo ? ` <em>${L('(tú)', '(you)')}</em>` : ''}</b><small>${x.alta ? L(`Cuenta del ${esc(fechaLarga(x.alta))}`, `Account from ${esc(x.alta)}`) : L('Aún no ha entrado con la 0.5', 'Not signed in with 0.5 yet')}${x.puesto ? ` · ${L('lo pusiste tú', 'set by you')}` : esFundadorPorAlta(x.alta) ? ` · ${L('fundador por fecha', 'founder by date')}` : ''}</small></div>
      <div class="dos-op modo-op" role="group" aria-label="${esc(L('Modo', 'Mode'))}"><button type="button" data-modo="fundador" aria-pressed="${x.modo === 'fundador'}">${L('Fundador', 'Founder')}</button><button type="button" data-modo="estandar" aria-pressed="${x.modo === 'estandar'}">${L('Estándar', 'Standard')}</button></div></li>`;
  const h = hoja(L('Modo de cada cuenta', "Each account's mode"), `<div class="priv">
    <p>${L('Fundador: GrowFolio entero, con el Paso a paso y GrowIA cuando dice qué comprar o vender. Estándar: sin recomendaciones personalizadas («Tu plan» en lugar del Paso a paso y lo que opinan los analistas en cada posición). Las cuentas creadas antes de la 0.5 son fundador; las nuevas, estándar, salvo que lo cambies aquí.', 'Founder: all of GrowFolio, with Steps and GrowIA when it says what to buy or sell. Standard: no personalised recommendations (Your plan instead of Steps and what analysts think on each holding). Accounts created before 0.5 are founders; new ones, standard, unless you change it here.')}</p>
    <ul class="priv-l modo-l">${l.map(fila).join('')}</ul>
    <form id="pvF" class="priv-add" novalidate><label class="campo">${L('Otra cuenta, por su correo', 'Another account, by email')}<input id="pvC" type="email" autocomplete="off" inputmode="email" placeholder="${L('amigo@gmail.com', 'friend@gmail.com')}"></label><button class="btn" type="submit">${L('Añadir', 'Add')}</button></form>
    <div class="error" id="pvErr"></div>
    <p class="nota">${L('Las cuentas salen aquí cuando abren la 0.5. El cambio le llega al volver a abrir GrowFolio, con tu nota si le dejas una. Con Google o Apple vale al momento; con correo y contraseña, tiene que confirmar su correo.', 'Accounts show up here once they open 0.5. The change reaches them when they next open GrowFolio, with your note if you leave one. With Google or Apple it works straight away; with email and password, they must confirm their email.')}</p>
  </div>`);
  h.el.classList.add('hoja-priv');
  const f = FB.fs, err = (t) => { $('#pvErr', h.el).textContent = t; };
  const poner = (correo, modo) => {
    const n = hoja(L(`${correo}: ${modo === 'fundador' ? 'modo fundador' : 'modo estándar'}`, `${correo}: ${modo === 'fundador' ? 'founder mode' : 'standard mode'}`), `<form id="mdF" class="priv" novalidate>
      <label class="campo">${L('Nota para esa persona (opcional; la ve al abrir GrowFolio)', 'Note for them (optional; they see it when opening GrowFolio)')}<textarea id="mdN" rows="3" maxlength="140" placeholder="${esc(modo === 'estandar' ? L('Te he puesto en estándar unos días: pruébalo y me dices qué tal.', "I've put you on standard for a few days: try it and tell me how it goes.") : '')}"></textarea></label>
      <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri">${L('Cambiar', 'Change')}</button></div></form>`);
    $('#mdF', n.el).onsubmit = async (ev) => {
      ev.preventDefault();
      const nota = $('#mdN', n.el).value.trim().slice(0, 140), b = $('#mdF .btn.pri', n.el); b.disabled = true;
      try {
        await conTiempo(f.setDoc(f.doc(FB.db, 'modos', correo), { modo, por: yoCorreo(), cuando: f.serverTimestamp(), ...(nota ? { nota } : {}) }), 10000);
        n.cerrar(true); h.cerrar(true);
        toast(L(`${correo}: ${modo === 'fundador' ? 'modo fundador' : 'modo estándar'}. Le llega al volver a abrir GrowFolio.`, `${correo}: ${modo === 'fundador' ? 'founder mode' : 'standard mode'}. It reaches them when they next open GrowFolio.`), 5000);
        if (correo === yoCorreo()) comprobarAcceso(); else verModos();
      } catch (e) { b.disabled = false; toast(errPermiso(e) ? L('Firestore no lo deja guardar: faltan las reglas nuevas.', "Firestore won't save it: the new rules are missing.") : L('No se ha podido guardar (¿sin conexión?).', "Couldn't save it (offline?)."), 6000); }
    };
  };
  for (const b of $$('[data-modo]', h.el)) b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; poner(b.closest('li').dataset.correo, b.dataset.modo); };
  $('#pvF', h.el).onsubmit = (ev) => {
    ev.preventDefault();
    const c = $('#pvC', h.el).value.trim().toLowerCase();
    if (!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(c)) return err(L('Ese correo no parece válido.', "That email doesn't look valid."));
    if (l.some((x) => x.correo === c)) return err(L('Ya está en la lista: cámbialo ahí.', 'Already on the list: change it there.'));
    poner(c, 'fundador');
  };
}
async function filaOpiniones(h) {
  const w = $('#aOpis', h.el); if (!w) return;
  const l = await leerOpiniones(); if (!l || !document.body.contains(w)) return;
  const visto = LS.get('inv-opis-vistas', 0), ult = fechaOpi(l[0] || {});
  const nuevas = l.filter((o) => (fechaOpi(o) || 0) > visto).length;
  const sin = l.filter((o) => !o.respuesta && o.uid).length;
  w.innerHTML = `<button class="aj-fila" id="aOpisB">${ICONOS.globo}<span><b>${L('Opiniones recibidas', 'Feedback received')}${nuevas ? ` <em class="aj-nuevas">${nuevas} ${nuevas === 1 ? L('nueva', 'new') : L('nuevas', 'new')}</em>` : ''}</b><small>${l.length ? `${L(`${l.length}${l.length >= 200 ? ' o más' : ''} en total, la última ${ult ? haceCuanto(ult.toISOString()) : 'sin fecha'}`, `${l.length}${l.length >= 200 ? ' or more' : ''} in total, the latest ${ult ? haceCuanto(ult.toISOString()) : 'undated'}`)}${sin ? L(`, ${sin} sin responder`, `, ${sin} not answered`) : ''}. ${L('Solo las ves tú.', 'Only you can see them.')}` : L('Todavía no ha llegado ninguna. Solo las ves tú.', 'Nothing has come in yet. Only you can see them.')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>`;
  $('#aOpisB', h.el).onclick = () => { h.cerrar(true); verOpiniones(l, visto); };
}
function verOpiniones(l, visto) {
  LS.set('inv-opis-vistas', Date.now());
  const item = (o) => {
    const d = fechaOpi(o), quien = quienOpi(o);
    const estrellas = o.nota != null ? `<span class="opr-nota" aria-label="${L(`${o.nota} de 5`, `${o.nota} out of 5`)}">${'★'.repeat(o.nota)}${'☆'.repeat(Math.max(0, 5 - o.nota))}</span>` : '';
    // las de las estrellas llegan como tipo «puntuacion» y con las estrellas también en el texto: se enseñan una vez
    const nota = o.tipo === 'puntuacion', texto = textoOpi(o);
    return `<li class="opr${d && d > visto ? ' nueva' : ''}" data-opr="${esc(o.id)}">
      <div class="opr-cab">${o.tipo ? `<span class="opr-tipo">${nota ? L('Nota', 'Rating') : esc(trad(o.tipo))}</span>` : ''}${o.sitio && !/^(general|La app en general)$/.test(o.sitio) ? `<span class="opr-sitio">${esc(trad(o.sitio))}</span>` : ''}${estrellas}<time>${esc(cuandoOpi(d))}</time></div>
      ${texto ? `<p>${esc(texto)}</p>` : ''}
      <small>${esc(quien)}${o.v ? `, ${L('versión', 'version')} ${esc(o.v)}` : ''}</small>
      <div class="opr-r">${htmlRespOpr(o)}</div>
    </li>`;
  };
  const sin = l.filter((o) => !o.respuesta && o.uid).length;
  const h = hoja(L('Opiniones recibidas', 'Feedback received'), `<div class="opr-hoja">
    ${l.length ? `<p class="nota opr-intro"><span class="opr-sin">${textoSinResp(sin)}</span>${L('Lo que respondas le sale en pantalla a quien la mandó la próxima vez que abra GrowFolio, y aquí ves si ya lo ha leído.', 'Whatever you reply shows up on screen for the sender the next time they open GrowFolio, and you can see here whether they have read it.')}</p>` : ''}
    ${l.length ? `<ul class="opr-lista">${l.map(item).join('')}</ul>` : `<p class="nota">${L('Todavía no ha llegado ninguna.', 'Nothing has come in yet.')}</p>`}
    <div class="fila-btns"><button class="btn" data-cerrar>${L('Cerrar', 'Close')}</button></div></div>`, () => abrirAjustes());
  const porId = new Map(l.map((o) => [o.id, o]));
  h.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-opr-resp], [data-opr-cancelar]'); if (!b) return;
    const li = b.closest('[data-opr]'), o = li && porId.get(li.dataset.opr); if (!o) return;
    const caja = $('.opr-r', li);
    if (b.hasAttribute('data-opr-cancelar')) { caja.innerHTML = htmlRespOpr(o); return; }
    caja.innerHTML = `<form class="opr-f" novalidate>
      <label class="campo">${L(`Tu respuesta a ${esc(quienOpi(o, true))}`, `Your reply to ${esc(quienOpi(o, true))}`)}<textarea name="r" rows="4" maxlength="2000" placeholder="${L('Gracias por avisar: ya está arreglado en la versión…', 'Thanks for letting me know: it is fixed in version…')}">${esc(o.respuesta || '')}</textarea></label>
      <small class="opr-f-nota">${L('Le saldrá en pantalla cuando abra GrowFolio.', 'It will show up on their screen when they open GrowFolio.')}</small>
      <div class="error"></div>
      <div class="fila-btns"><button type="button" class="btn" data-opr-cancelar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri">${ICONOS.enviar}${o.respuesta ? L('Guardar', 'Save') : L('Responder', 'Reply')}</button></div>
    </form>`;
    const f = $('.opr-f', caja), t = f.r; t.focus(); t.setSelectionRange(t.value.length, t.value.length);
    t.oninput = () => { $('.error', f).textContent = ''; };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const r = t.value.trim(); if (!r) { $('.error', f).textContent = L('Escribe la respuesta.', 'Write your reply.'); return; }
      const bt = $('button[type=submit]', f); bt.disabled = true; bt.textContent = L('Enviando…', 'Sending…');
      try {
        const por = nombreUsuario() || null;
        await conTiempo(FB.fs.updateDoc(FB.fs.doc(FB.db, 'opiniones', o.id), { respuesta: r, respondida: FB.fs.serverTimestamp(), por, vista: false }), 10000);
        Object.assign(o, { respuesta: r, respondida: { toDate: () => new Date() }, por, vista: false });
        caja.innerHTML = htmlRespOpr(o);
        const sp = $('.opr-sin', h.el); if (sp) sp.textContent = textoSinResp(l.filter((x) => !x.respuesta && x.uid).length);
        toast(L('Respuesta enviada: la verá al abrir GrowFolio.', 'Reply sent: they will see it when they open GrowFolio.'));
      } catch (er) {
        console.warn(er);
        bt.disabled = false; bt.innerHTML = ICONOS.enviar + (o.respuesta ? L('Guardar', 'Save') : L('Responder', 'Reply'));
        $('.error', f).textContent = /permission/i.test(String((er && er.code) || er))
          ? L('Firestore no deja responder todavía: hay que publicar las reglas nuevas (la Action «Reglas de Firestore» o a mano en la consola).', 'Firestore does not allow replies yet: the new rules have to be published (the «Firestore rules» Action or by hand in the console).')
          : L('No se ha podido enviar (¿sin conexión?). Prueba otra vez.', 'Could not send it (offline?). Try again.');
      }
    };
  });
}
const textoSinResp = (n) => (n ? (n === 1 ? L('1 sin responder. ', '1 not answered yet. ') : L(`${n} sin responder. `, `${n} not answered yet. `)) : '');
const textoOpi = (o) => String(o.texto || '').replace(o.tipo === 'puntuacion' ? /^[★☆]+ \(\d\/5\)\n?/ : /^$/, '').trim();
/* a quién se le contesta: el nombre que puso o, si no, su correo */
function quienOpi(o, corto) {
  const n = o.quien && !/^(amigo sin nombre|el dueño)$/.test(o.quien) ? o.quien : '';
  if (corto) return n || o.correo || L('quien la mandó', 'the sender');
  return [n, o.correo || ''].filter(Boolean).join(', ') || L('sin nombre', 'no name');
}
const cuandoOpi = (d) => (d ? d.toLocaleString(IDIOMA === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : L('sin fecha', 'no date'));
/* lo que ve el dueño debajo de cada opinión: su respuesta (con si ya la ha leído) o el botón para responder. Las que
   no tienen cuenta detrás (las de antes, sin uid) no se pueden contestar: no hay a quién enseñárselo. */
function htmlRespOpr(o) {
  if (o.respuesta) {
    const d = fechaOpi({ cuando: o.respondida });
    return `<div class="opr-resp">
      <div class="opr-resp-cab"><b>${L('Tu respuesta', 'Your reply')}</b>${d ? `<time>${esc(cuandoOpi(d))}</time>` : ''}<span class="opr-leida${o.vista ? ' si' : ''}">${o.vista ? ICONOS.ok + L('La ha leído', 'Read') : L('Aún no la ha leído', 'Not read yet')}</span></div>
      <p>${esc(o.respuesta)}</p>
      <button type="button" class="enlace acento" data-opr-resp>${L('Cambiar la respuesta', 'Edit the reply')}</button>
    </div>`;
  }
  return o.uid ? `<button type="button" class="btn opr-responder" data-opr-resp>${ICONOS.enviar}${L('Responder', 'Reply')}</button>` : '';
}

