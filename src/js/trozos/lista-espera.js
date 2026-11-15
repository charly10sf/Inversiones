/* =====================================================================
   0.8.3 (15 nov) · La lista de espera de toison.es, para el dueño (Ajustes)
   Las solicitudes de «Pedir acceso» (Firestore acceso/{id}: correo, cuando, idioma, desde) con su estado. «Dar acceso»
   pide al Worker el correo «Ya tienes acceso» (POST /correo, tipo «acceso», que comprueba con el token que es el dueño)
   y, si sale, marca la solicitud (dado y dadoCuando, lo único que dejan tocar las reglas). La app sigue abierta: el
   correo es la invitación, no una puerta.
   ===================================================================== */
async function leerListaEspera() {
  await fbCargar(); const f = FB.fs;
  // con tope: crear solicitudes está abierto, así que la lista no se lee entera (revisión aparte del 15 nov)
  const r = await conTiempo(f.getDocs(f.query(f.collection(FB.db, 'acceso'), f.orderBy('cuando', 'desc'), f.limit(300))), 10000);
  return r.docs.map((d) => {
    const x = d.data() || {}, dc = x.dadoCuando && typeof x.dadoCuando.toDate === 'function' ? x.dadoCuando.toDate().toISOString() : null;
    return { id: d.id, correo: String(x.correo || '').toLowerCase(), cuando: String(x.cuando || ''), idioma: x.idioma === 'en' ? 'en' : 'es', dado: x.dado === true, dadoCuando: dc };
  }).filter((x) => x.correo)
    // primero las que esperan, y en cada grupo la más reciente arriba
    .sort((a, b) => (a.dado - b.dado) || String(b.cuando).localeCompare(String(a.cuando)));
}
const txtFallaAcceso = (m) => ({
  dueno: L('El Worker no reconoce tu cuenta como la del dueño (mira BANCO_EMAILS y que tu correo esté confirmado).', "The Worker doesn't recognise your account as the owner's (check BANCO_EMAILS and that your email is confirmed)."),
  cupo: L('Hoy ya se ha llenado el cupo de correos. Prueba mañana.', "Today's email quota is used up. Try tomorrow."),
  espera: L('Has mandado muchos seguidos. Espera un minuto.', "You've sent a lot in a row. Wait a minute."),
  'sin-config': L('Los correos propios no están configurados en el Worker.', 'Own emails are not set up in the Worker.'),
  pedido: L('El Worker aún no tiene este correo: falta publicar la versión nueva.', "The Worker doesn't have this email yet: the new version isn't published."),
  sesion: L('Tu sesión ha caducado. Vuelve a entrar.', 'Your session expired. Sign in again.'),
  correo: L('El Worker no acepta esa dirección (caracteres raros): escríbele desde tu correo.', "The Worker won't accept that address (odd characters): write to them from your own email."),
  origen: L('El Worker no acepta peticiones desde esta dirección de la app.', "The Worker doesn't accept requests from this app address."),
  fallo: L('Resend no lo ha aceptado. Prueba en un rato.', "Resend didn't accept it. Try again later."),
}[m] || L('No se ha podido mandar (¿sin conexión?).', "Couldn't send it (offline?)."));
async function darAcceso(x) {
  const w = CFG.dev ? { ok: true } : await correoToison('acceso', { correo: x.correo, lang: x.idioma });
  if (!w.ok) return { ok: false, motivo: w.motivo };
  try {
    const f = FB.fs;
    await conTiempo(f.updateDoc(f.doc(FB.db, 'acceso', x.id), { dado: true, dadoCuando: f.serverTimestamp() }), 10000);
    return { ok: true };
  } catch (e) { return { ok: true, sinMarcar: true }; }
}
async function verListaEspera() {
  let l;
  try { l = await leerListaEspera(); }
  catch (e) { return toast(errPermiso(e) ? L('Firestore no deja leer la lista de espera con esta cuenta.', "Firestore won't let this account read the waiting list.") : L('No se ha podido leer (¿sin conexión?).', "Couldn't read it (offline?)."), 7000); }
  const espera = l.filter((x) => !x.dado).length;
  const estado = (x) => (x.dado
    ? L(`Acceso dado${x.dadoCuando ? ' ' + haceCuanto(x.dadoCuando) : ''}`, `Access given${x.dadoCuando ? ' ' + haceCuanto(x.dadoCuando) : ''}`)
    : L('Esperando', 'Waiting'));
  const fila = (x) => `<li data-id="${esc(x.id)}" class="${x.dado ? 'esp-dado' : ''}"><div class="modo-t"><b data-no-trad>${esc(x.correo)}</b><small>${x.cuando ? L(`Pidió acceso el ${esc(fechaLarga(x.cuando.slice(0, 10)))}`, `Asked on ${esc(x.cuando.slice(0, 10))}`) : L('Sin fecha', 'Undated')} · ${x.idioma === 'en' ? 'EN' : 'ES'} · <span class="esp-estado">${esc(estado(x))}</span></small></div>
      <button type="button" class="btn peq${x.dado ? '' : ' pri'}" data-dar>${x.dado ? L('Volver a mandar', 'Send again') : L('Dar acceso', 'Give access')}</button></li>`;
  const h = hoja(L('Lista de espera', 'Waiting list'), `<div class="priv">
    <p>${L('Quien pide acceso en toison.es. «Dar acceso» le manda el correo «Ya tienes acceso», con un botón que abre Toisón en «Crear cuenta», en su idioma. La app sigue abierta: el correo es la invitación.', 'People who asked for access on toison.es. «Give access» sends them the «You now have access» email, with a button that opens Toisón on «Create account», in their language. The app stays open: the email is the invitation.')}</p>
    ${l.length ? `<p class="nota">${L(`${l.length} en total, ${espera} esperando.`, `${l.length} in total, ${espera} waiting.`)}</p><ul class="priv-l modo-l esp-l">${l.map(fila).join('')}</ul>` : `<ul class="priv-l"><li class="vacio">${L('Todavía no se ha apuntado nadie.', 'Nobody has signed up yet.')}</li></ul>`}
    <p class="nota">${L('Solo lo ves tú.', 'Only you see this.')}</p>
  </div>`);
  h.el.classList.add('hoja-priv');
  const mandar = async (x, b) => {
    const antes = b.textContent; b.disabled = true; b.textContent = L('Mandando…', 'Sending…');
    const r = await darAcceso(x);
    if (!r.ok) { b.disabled = false; b.textContent = antes; return toast(txtFallaAcceso(r.motivo), 7000); }
    x.dado = true; x.dadoCuando = new Date().toISOString();
    const li = b.closest('li'); li.classList.add('esp-dado'); $('.esp-estado', li).textContent = estado(x);
    b.disabled = false; b.classList.remove('pri'); b.textContent = L('Volver a mandar', 'Send again');
    toast(r.sinMarcar ? L(`Correo mandado a ${x.correo}, pero no se ha podido marcar en la lista (¿faltan las reglas nuevas de Firestore?).`, `Email sent to ${x.correo}, but it couldn't be marked on the list (are the new Firestore rules missing?).`) : L(`Correo «Ya tienes acceso» mandado a ${x.correo}.`, `«You now have access» email sent to ${x.correo}.`), 6000);
  };
  for (const b of $$('[data-dar]', h.el)) b.onclick = () => {
    const x = l.find((y) => y.id === b.closest('li').dataset.id); if (!x || b.disabled) return;
    if (!x.dado) return mandar(x, b);
    // ya se le dio: no se repite sin querer
    const n = hoja(L('¿Volver a mandarlo?', 'Send it again?'), `<div class="priv"><p>${L(`A ${esc(x.correo)} ya le mandaste «Ya tienes acceso»${x.dadoCuando ? ' ' + esc(haceCuanto(x.dadoCuando)) : ''}. ¿Se lo mandas otra vez?`, `You already sent «You now have access» to ${esc(x.correo)}${x.dadoCuando ? ' ' + esc(haceCuanto(x.dadoCuando)) : ''}. Send it again?`)}</p>
      <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="button" class="btn pri" id="espOtra">${L('Volver a mandar', 'Send again')}</button></div></div>`);
    $('#espOtra', n.el).onclick = () => { n.cerrar(true); mandar(x, b); };
  };
}
