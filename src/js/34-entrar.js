/* =====================================================================
   Entrar con tu cuenta: Google (en la web y en Chrome) o correo y contraseña (en todas partes; en la app de
   Android, Google no deja iniciar sesión dentro de una app web, así que ahí va con el correo).
   ===================================================================== */
function pantallaCuenta(errorTxt = '') {
  const app = !!window.InversionesApp;
  // en la app, Google va por el selector de cuentas de Android (desde la app 0.2; las de antes, solo correo)
  const nativo = app && !!FB_GOOGLE_WEB && (() => { try { return !!window.InversionesApp.googleDisponible(); } catch (e) { return false; } })();
  let modo = 'entrar';
  // quien llega por primera vez (con el enlace que le pasan) ve «Crea tu cuenta», paso 1 de 2
  const primeraVez = !LS.get('inv-ya-entro', false) && !(() => { try { return localStorage.getItem('inv-local-enc') || localStorage.getItem('inv-cache-enc'); } catch (e) { return null; } })();
  $('#app').innerHTML = `<div class="pantalla"><div class="caja caja-cuenta">
    <img class="logo" src="icon-192.png" alt="">
    ${primeraVez ? `<p class="paso-chip">${esc(trad('Paso 1 de 2: tu cuenta'))}</p>` : ''}
    <h1>${primeraVez ? 'Crea tu cuenta' : 'Entra en GrowFolio'}</h1>
    <p>Con tu cuenta, tu cartera se guarda cifrada y la ves igual en el móvil, en el ordenador y en la app.${(() => { try { return localStorage.getItem('inv-local-enc') || localStorage.getItem('inv-cache-enc'); } catch (e) { return null; } })() ? ' Si ya usabas GrowFolio aquí, después de entrar te ofrece subir tu cartera tal cual.' : ''}</p>
    ${app && !nativo ? '<p class="nota" style="margin:0">En la app, de momento, se entra con el correo. Con Google puedes entrar desde la web o desde Chrome.</p>' : `<button type="button" class="btn btn-google" id="bGoogle"><svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"/></svg><span>Continuar con Google</span></button>${FB_APPLE ? `<button type="button" class="btn btn-apple" id="bApple"><svg class="g-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.6zM14.2 5.6c.6-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.3z"/></svg><span>Continuar con Apple</span></button>` : ''}<div class="cuenta-o"><span>o con tu correo</span></div>`}
    <form id="fCorreo" class="cuenta-f" novalidate>
      <div class="cuenta-modo" role="group" aria-label="Entrar o crear cuenta"><button type="button" data-m="entrar" aria-pressed="true">Entrar</button><button type="button" data-m="crear" aria-pressed="false">Crear cuenta</button></div>
      <label class="campo" id="cNombreL" hidden>Tu nombre<input id="cNombre" autocomplete="given-name" maxlength="40" placeholder="Para saludarte al entrar"></label>
      <label class="campo">Correo<input type="email" id="cEmail" autocomplete="email" inputmode="email" required></label>
      <label class="campo">Contraseña de la cuenta<input type="password" id="cPass" autocomplete="current-password" minlength="6" required></label>
      <div class="error" id="err">${esc(errorTxt)}</div>
      <button class="btn pri" type="submit" id="bCorreo">Entrar</button>
      <button type="button" class="enlace" id="bOlvido">${L('He olvidado la contraseña de la cuenta', 'I forgot my account password')}</button>
    </form>
    <p class="nota cuenta-priv">${L('La contraseña de la cuenta solo sirve para entrar. Tus cifras van cifradas con otra, la de tu cartera, que no sale de tu dispositivo: ni GrowFolio ni Google pueden leerlas. Si la que has olvidado es la de tu cartera, entra con tu cuenta: te la pide después, y ahí puedes usar tu código de recuperación.', "The account password is only for signing in. Your figures are encrypted with another one, your portfolio password, which never leaves your device: neither GrowFolio nor Google can read them. If the one you forgot is your portfolio password, sign in with your account: it's asked for next, and there you can use your recovery code.")}</p>
    <button type="button" class="enlace ver-intro" id="bIntro">¿Qué es GrowFolio?</button>
    ${selectorIdioma('pie')}
  </div></div>`;
  const err = (t) => { $('#err').textContent = t || ''; };
  const dentro = async () => {
    // ya con sesión: tu cartera de la cuenta (o, si es nueva, la bienvenida)
    S.enc = await cargarDeCuenta(); S.iaRemoto = S.iaCuenta || null;
    LS.set('inv-ya-entro', true);
    if (FB.user && FB.user.displayName && !LS.get('inv-nombre', '')) LS.set('inv-nombre', FB.user.displayName.split(' ')[0]);
    entrar();
  };
  $('#bIntro').onclick = () => pantallaIntro(() => pantallaCuenta());
  for (const b of $$('.cuenta-modo button')) b.onclick = () => {
    modo = b.dataset.m;
    for (const x of $$('.cuenta-modo button')) x.setAttribute('aria-pressed', x === b);
    $('#cNombreL').hidden = modo !== 'crear';
    $('#bCorreo').textContent = modo === 'crear' ? 'Crear cuenta' : 'Entrar';
    $('#cPass').autocomplete = modo === 'crear' ? 'new-password' : 'current-password';
    $('#bOlvido').hidden = modo === 'crear'; err('');
  };
  if (primeraVez) { const bc = $('.cuenta-modo button[data-m="crear"]'); if (bc) bc.click(); }
  if ($('#bGoogle')) $('#bGoogle').onclick = async () => {
    const b = $('#bGoogle'); err(''); b.disabled = true;
    if (nativo) {
      // el botón dice en qué paso va y nunca se queda colgado: si Google no contesta, se suelta y lo explica
      const tx = b.querySelector('span'), orig = tx.textContent;
      let paso = 'app';
      const fin = (m) => { clearTimeout(S.googleT); b.disabled = false; tx.textContent = orig; if (m) err(m); };
      window.pasoGoogle = (p) => { paso = p; tx.textContent = trad('Abriendo Google…'); };
      clearTimeout(S.googleT);
      S.googleT = setTimeout(() => fin(`${trad('Google no ha contestado. Vuelve a probar o entra con tu correo.')} (${paso})`), 45000);
      window.resultadoGoogle = async (ok, x) => {
        clearTimeout(S.googleT);
        if (!ok) { fin(/CANCEL/i.test(x || '') ? '' : /NO_CREDENTIAL/i.test(x || '') ? 'No hay ninguna cuenta de Google en este móvil: añádela en Ajustes de Android o entra con tu correo.' : /codigo 10$/.test(x || '') ? `${trad('Google no reconoce esta app: falta su huella (SHA-1) en Firebase.')} (${x})` : `No se pudo entrar con Google (${x}).`); return; }
        tx.textContent = trad('Entrando…');
        try {
          paso = 'firebase'; await conTiempo(fbCargar(), 20000);
          paso = 'credencial'; await conTiempo(FB.au.signInWithCredential(FB.auth, FB.au.GoogleAuthProvider.credential(x)), 20000);
          FB.user = FB.auth.currentUser; paso = 'cuenta'; await dentro();
        } catch (e) { console.warn(e); fin(e && e.message === 'tiempo' ? `${trad('Google ha contestado, pero no se ha podido terminar de entrar. Vuelve a probar.')} (${paso})` : errorFb(e)); }
      };
      // el selector clásico de Google Play (app 0.2.0 compilación 19 en adelante) y, si no lo hay, Credential Manager
      const clasico = (() => { try { return !!window.InversionesApp.googleClasico(); } catch (e) { return false; } })();
      try { if (clasico) window.InversionesApp.entrarGoogleClasico(FB_GOOGLE_WEB); else window.InversionesApp.entrarGoogle(FB_GOOGLE_WEB); } catch (e) { fin('Esta versión de la app no sabe entrar con Google: actualízala desde Ajustes.'); }
      return;
    }
    try {
      await fbCargar();
      const pr = new FB.au.GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
      try { await FB.au.signInWithPopup(FB.auth, pr); }
      catch (e) {
        // en el iPhone, con GrowFolio en la pantalla de inicio, la ventanita de Google a veces no vuelve: mejor el correo
        if (ES_IOS && COMO_APP && /popup|cancelled|operation-not-supported|web-storage/.test(e.code || '')) throw Object.assign(new Error('ios'), { code: 'ios-app' });
        if (/popup-blocked|operation-not-supported/.test(e.code || '')) { await FB.au.signInWithRedirect(FB.auth, pr); return; }
        throw e;
      }
      FB.user = FB.auth.currentUser; await dentro();
    } catch (e) { console.warn(e); b.disabled = false; err(e.code === 'ios-app' ? trad('En la app del iPhone, Google no siempre deja entrar. Prueba desde Safari o entra con tu correo.') : errorFb(e)); }
  };
  if ($('#bApple')) $('#bApple').onclick = async () => {
    const b = $('#bApple'); err(''); b.disabled = true;
    try {
      await fbCargar();
      const pr = new FB.au.OAuthProvider('apple.com'); pr.addScope('email'); pr.addScope('name'); pr.setCustomParameters({ locale: IDIOMA === 'en' ? 'en' : 'es' });
      await FB.au.signInWithPopup(FB.auth, pr);
      FB.user = FB.auth.currentUser; await dentro();
    } catch (e) { console.warn(e); b.disabled = false; err(errorFb(e)); }
  };
  $('#fCorreo').onsubmit = async (ev) => {
    ev.preventDefault();
    const email = $('#cEmail').value.trim(), pass = $('#cPass').value, b = $('#bCorreo');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('Ese correo no parece válido.');
    if (pass.length < 6) return err('La contraseña tiene que tener al menos 6 caracteres.');
    err(''); b.disabled = true; b.textContent = modo === 'crear' ? 'Creando…' : 'Entrando…';
    try {
      await fbCargar();
      if (modo === 'crear') {
        const r = await FB.au.createUserWithEmailAndPassword(FB.auth, email, pass);
        const nom = $('#cNombre').value.trim();
        if (nom) { LS.set('inv-nombre', nom); try { await FB.au.updateProfile(r.user, { displayName: nom }); } catch (e) {} }
      } else await FB.au.signInWithEmailAndPassword(FB.auth, email, pass);
      FB.user = FB.auth.currentUser; await dentro();
    } catch (e) { console.warn(e); b.disabled = false; b.textContent = modo === 'crear' ? 'Crear cuenta' : 'Entrar'; err(errorFb(e)); }
  };
  $('#bOlvido').onclick = async () => {
    const email = $('#cEmail').value.trim();
    if (!email) { err('Escribe arriba tu correo y vuelve a pulsar aquí.'); $('#cEmail').focus(); return; }
    try { await fbCargar(); await FB.au.sendPasswordResetEmail(FB.auth, email); err(''); toast(L(`Te he mandado un correo a ${email} para poner una contraseña nueva a tu cuenta. La de tu cartera no cambia.`, `I've sent an email to ${email} to set a new account password. Your portfolio password doesn't change.`), 7000); }
    catch (e) { err(errorFb(e)); }
  };
}
/* la primera vez con una cuenta nueva: cómo te llamas y, si ya tenías una cartera en este dispositivo, subirla */
async function bienvenidaCuenta() {
  const sugerido = nombreUsuario();
  // la cartera de antes de las cuentas que hubiera en este dispositivo (la propia o la copia de la de GitHub);
  // una vez que se ha ofrecido a una cuenta, no se vuelve a ofrecer a otra
  let local = LS.get('inv-local-ofrecida', false) ? null : (() => { try { const l = JSON.parse(localStorage.getItem('inv-local-enc') || 'null'); if (l) return { texto: l, clave: 'clave-local', de: 'la de este dispositivo' }; const g = JSON.parse(localStorage.getItem('inv-cache-enc') || 'null'); if (g) return { texto: g, clave: 'clave', de: 'la de GitHub' }; } catch (e) {} return null; })();
  // la copia de la cartera de GitHub solo es tuya si este dispositivo recuerda su clave (los amigos que abrieron
  // la web en ese modo tienen la del dueño, que no pueden abrir): sin clave, ni se ofrece
  if (local && local.clave === 'clave') { try { const g = await IDB.get('clave'); if (!(g && g.key && g.salt === JSON.parse(local.texto).salt)) local = null; } catch (e) { local = null; } }
  $('#app').innerHTML = `<div class="pantalla"><form class="caja caja-cuenta" id="fBien" novalidate>
    <img class="logo" src="icon-192.png" alt="">
    <h1>${sugerido ? `¡Hola, ${esc(sugerido)}!` : '¡Hola!'}</h1>
    <p>Tu cuenta está lista${FB.user && FB.user.email ? ` (${esc(FB.user.email)})` : ''}. Antes de empezar, dos cosas.</p>
    <label class="campo">¿Cómo quieres que te llame?<input id="bNombre" maxlength="40" autocomplete="given-name" value="${esc(sugerido)}" placeholder="Tu nombre"><small>Para saludarte al entrar. Lo puedes cambiar en tu perfil.</small></label>
    ${local ? `<fieldset class="opciones"><legend>Ya tienes una cartera en este dispositivo</legend><div class="opc-fila">
        <label class="opc"><input type="radio" name="que" value="subir" checked><span><b>Subirla a mi cuenta</b><small>${esc(local.de)}, con la contraseña que ya tiene</small></span></label>
        <label class="opc"><input type="radio" name="que" value="nueva"><span><b>Empezar una nueva</b><small>la de este dispositivo no se sube</small></span></label></div>
        <label class="campo" id="bPassL" hidden>Contraseña de esa cartera<input type="password" id="bPass" autocomplete="current-password"><small>Para comprobar que es tuya antes de subirla.</small></label></fieldset>` : ''}
    <div class="error" id="err"></div>
    <button class="btn pri" type="submit" id="bSeguir">Seguir</button>
    <button type="button" class="enlace" id="bSalir">Entrar con otra cuenta</button>
  </form></div>`;
  $('#bSalir').onclick = () => cerrarSesion();
  $('#fBien').onsubmit = async (ev) => {
    ev.preventDefault();
    const nom = $('#bNombre').value.trim(), b = $('#bSeguir');
    if (nom) { LS.set('inv-nombre', nom); if (FB.user && !FB.user.displayName) try { await FB.au.updateProfile(FB.user, { displayName: nom }); } catch (e) {} }
    const que = (document.querySelector('[name=que]:checked') || {}).value;
    if (!local || que !== 'subir') { if (local) LS.set('inv-local-ofrecida', true); return pantallaCrear(); }
    b.disabled = true; b.textContent = 'Comprobando…'; $('#err').textContent = '';
    try {
      // antes de subirla, abrirla: con la clave que recuerda este dispositivo o con su contraseña
      const f = JSON.parse(local.texto), g = await IDB.get(local.clave);
      let key = g && g.key && g.salt === f.salt ? g.key : null, c = null;
      if (key) { try { c = await descifrar(local.texto, key); } catch (e) { key = null; } }
      if (!c) {
        const pw = $('#bPass').value;
        if (!pw) { LS.del('inv-local-ofrecida'); S.pidePassLocal = true; $('#bPassL').hidden = false; $('#bPass').focus(); b.disabled = false; b.textContent = 'Subirla'; $('#err').textContent = 'Este dispositivo no recuerda la contraseña de esa cartera: escríbela para comprobar que es tuya.'; return; }
        try { key = await derivarClave(pw, b64.dec(f.salt), f.iter || 600000); c = await descifrar(local.texto, key); }
        catch (e) { LS.del('inv-local-ofrecida'); b.disabled = false; b.textContent = 'Subirla'; $('#err').textContent = 'Esa contraseña no abre esa cartera. Si no es tuya, elige «Empezar una nueva».'; return; }
      }
      b.textContent = 'Subiendo…';
      // la cuenta tiene que estar vacía de verdad (la transacción lo comprueba en el servidor)
      let rev;
      try { rev = await conTiempo(escribirCuenta(local.texto, 0), 15000); }
      catch (e) { if (e && e.conflicto) { location.reload(); return; } throw e; }
      S.cuentaLeida = true; S.cuentaNueva = false; fijarBase(rev, local.texto); cacheCuenta.set(local.texto); LS.del('inv-pend-cuenta');
      LS.set('inv-local-ofrecida', true);
      S.enc = { texto: local.texto, sha: null };
      S.cartera = c; S.key = key; S.salt = b64.dec(f.salt); S.iter = f.iter || 600000;
      await IDB.set(IDB_CLAVE, { salt: f.salt, key });
      // lo de antes ya vive en la cuenta: fuera del dispositivo, para que no se le ofrezca a nadie más; la clave
      // de Gemini y la conversación del asesor pasan a la cuenta
      for (const k of ['asesor-clave', 'asesor-clave-g', 'asesor-conv', 'ia-propio']) { const v = localStorage.getItem((local.clave === 'clave' ? 'inv-' : 'invL-') + k); if (v != null && localStorage.getItem('invC-' + k) == null) localStorage.setItem('invC-' + k, v); }
      for (const k of ['inv-local-enc', 'inv-cache-enc', 'inv-pend-enc', 'invL-pend-enc', 'invL-cache-enc']) localStorage.removeItem(k);
      try { await IDB.del('clave-local'); await IDB.del('clave'); } catch (e) {}
      if (nom) { S.cartera.perfil = { ...(S.cartera.perfil || {}), nombre: nom }; }
      toast('Tu cartera ya está en tu cuenta', 5000); S.recienCuenta = true;
      return arrancar();
    } catch (e) { console.warn(e); b.disabled = false; b.textContent = 'Seguir'; $('#err').textContent = e.message === 'tiempo' ? 'Sin conexión: no se ha subido nada. Vuelve a probar.' : errorFb(e); }
  };
  // la contraseña solo se pide si hace falta (el dispositivo no la recuerda) y con «Subirla» elegido
  for (const r of $$('[name=que]')) r.onchange = () => { const x = $('#bPassL'); if (x) x.hidden = !(r.checked && r.value === 'subir' && S.pidePassLocal); };
}
async function cerrarSesion() {
  if (S.demo) return salirDemo();
  if (LS.get('inv-pend-cuenta')) {
    if (navigator.onLine !== false && !S.subidaParada) try { await conTiempo(sincronizarCuenta(), 8000); } catch (e) {}
    if (LS.get('inv-pend-cuenta') && !confirm(trad('Hay cambios de este dispositivo que aún no han llegado a tu cuenta (falta conexión). Si cierras la sesión ahora, se pierden. ¿Cerrarla igualmente?'))) return;
  }
  try { await fbCargar(); await FB.au.signOut(FB.auth); } catch (e) { console.warn(e); }
  try { await IDB.del(IDB_CLAVE); await IDB.del('clave-local'); await IDB.del('clave'); } catch (e) {}
  for (const k of ['inv-cuenta-enc', 'inv-pend-cuenta', 'inv-cuenta-descartada', 'inv-bloqueo', 'inv-bloqueo-t', 'inv-asesor-clave', 'inv-asesor-clave-g', 'inv-asesor-conv', 'inv-ia-propio', 'inv-asesor-cfg2', 'inv-cache-ia', 'inv-oculto', 'inv-proy', 'inv-token', 'inv-gkey-modo', 'inv-ia-agotados']) LS.del(k);
  try { localStorage.removeItem('inv-token'); } catch (e) {}
  LS.del('inv-nombre');
  // el widget de Android no puede seguir enseñando la cartera de quien se ha ido
  try { if (window.InversionesApp && window.InversionesApp.borrarWidget) window.InversionesApp.borrarWidget(); } catch (e) {}
  location.reload();
}
/* con la cartera abierta: si cambia en otro dispositivo, se actualiza aquí sola */
function vigilarCuenta() {
  if (!PERFIL_CUENTA || !FB.user || !FB.fs) return;
  // siempre una suscripción nueva: la primera respuesta trae el estado de ahora (lo que llegara con la app bloqueada)
  if (S.vigilaCuenta) { try { S.vigilaCuenta(); } catch (e) {} S.vigilaCuenta = null; }
  try {
    S.vigilaCuenta = FB.fs.onSnapshot(docCuenta(), async (d) => {
      // con la cartera de prueba, lo que llegue de tu cuenta espera: al salir se vuelve a abrir todo
      if (d.metadata.hasPendingWrites || S.demo) return;
      const x = d.data();
      if (!d.metadata.fromCache) S.cuentaLeida = true;
      if (!S.key || !S.cartera || !x || !x.enc) return;
      const rev = revDe(x);
      if (S.enc && x.enc === S.enc.texto) { if (rev > (S.baseRev || 0)) fijarBase(rev, x.enc); return nombreEnCuenta(); }
      // una revisión que no es más nueva que la que ya tienes (llegan desordenadas a veces): nada
      if (rev <= (S.baseRev || 0)) return;
      // con cambios de aquí sin subir, decide la sincronización (con su transacción), no esto
      if (LS.get('inv-pend-cuenta')) { if (!d.metadata.fromCache) sincronizarCuenta(); return; }
      await aplicarRemoto(x.enc, rev);
      nombreEnCuenta();
    }, (e) => console.warn(e));
  } catch (e) { console.warn(e); }
}
/* el nombre de la bienvenida, dentro de tu perfil cifrado: solo con la cuenta ya leída, para no pisar nada */
function nombreEnCuenta() {
  if (S.demo) return;
  const nom = LS.get('inv-nombre', ''), suyo = S.cartera && S.cartera.perfil && S.cartera.perfil.nombre;
  // el de tu perfil (el mismo en todos tus dispositivos) pasa a este dispositivo, para saludarte al abrir
  if (suyo) { if (suyo !== nom) LS.set('inv-nombre', suyo); return; }
  if (!S.cuentaLeida || !nom || !S.cartera) return;
  S.cartera.perfil = { ...(S.cartera.perfil || {}), nombre: nom }; guardarCarteraCallada('Nombre');
}
/* llega una versión de la cuenta: si estás editando algo, espera a que cierres; si ya no abre con tu clave
   (cambiaste la contraseña en otro dispositivo), se bloquea y pide la nueva */
async function aplicarRemoto(enc, rev) {
  if (S.demo) return;
  if (document.querySelector('.hoja-fondo form, .ficha')) {
    // se aplica al cerrar; si mientras tanto guardas, manda lo tuyo (es lo último que has hecho) y esta se descarta
    const antes = S.enc && S.enc.texto;
    S.remotoEnEspera = { enc, rev, antes }; clearTimeout(S.remotoT);
    const reintenta = () => { const r = S.remotoEnEspera; if (!r) return; if (document.querySelector('.hoja-fondo form, .ficha')) { S.remotoT = setTimeout(reintenta, 1500); return; } S.remotoEnEspera = null; if (S.enc && S.enc.texto !== r.antes) return; if (!S.enc || r.enc !== S.enc.texto) aplicarRemoto(r.enc, r.rev); };
    S.remotoT = setTimeout(reintenta, 1500); return;
  }
  if (rev && rev <= (S.baseRev || 0)) return;
  let c, volverAV2 = false;
  try { c = await descifrar(enc, S.key); }
  catch (e) {
    // 0.5: otro dispositivo pasó la cartera al formato 2 y aquí aún se tiene la clave de la contraseña: con ella se
    // abre su sobre y este dispositivo pasa a la clave de datos sin pedir nada
    const pu = puenteV1();
    const gg = !S.kv && S.key ? { salt: S.salt ? b64.enc(S.salt) : null, key: S.key } : S.kv && pu ? { salt: pu.salt, key: pu.kek } : null;
    const r = gg ? await claveRecordada(enc, gg) : null;
    if (r && r.adoptada) {
      try {
        c = await descifrar(enc, r.key);
        const g = await IDB.get(IDB_CLAVE), vieja = S.key;
        fijarSesion({ ...r, cartera: c }); await recifrarLocales(vieja, r.key); if (g) await recordarClave();
      } catch (e5) { c = null; }
    }
    // al revés: aquí ya en el formato 2 y la cuenta otra vez en el 1 con la misma contraseña (lo guardó una versión de
    // antes): se lee con la clave de la contraseña y se vuelve a subir en el 2
    const fr = formatoDe(enc);
    if (!c && S.kv && pu && fr && fr.v !== 2 && fr.salt === pu.salt) { try { c = await descifrar(enc, pu.kek); volverAV2 = true; } catch (e7) { c = null; } }
    const otraSal = !c && idClave(enc) !== idClave(S.enc && S.enc.texto);
    if (!c && !otraSal) { console.warn('No se pudo leer el cambio de otro dispositivo', e); return; }
  }
  if (!c) {
    if (S.vigilaCuenta) { try { S.vigilaCuenta(); } catch (e3) {} S.vigilaCuenta = null; }
    S.enc = { texto: enc, sha: null }; fijarBase(rev, enc); cacheCuenta.set(enc); LS.del('inv-pend-cuenta');
    // la clave de ahora se queda en memoria hasta que escribas la nueva: con ella se pasa a la nueva lo cifrado en este
    // dispositivo (la clave de Gemini, la conversación del asesor)
    if (S.key) { S.keyVieja = S.key; try { await IDB.set('clave-vieja', { key: S.key }); } catch (e8) {} }
    S.cartera = null; S.key = null; S.puente = null; try { await IDB.del(IDB_CLAVE); } catch (e4) {}
    return pantallaDesbloqueo('', 'La contraseña de tu cartera ha cambiado en otro dispositivo. Escribe la nueva para seguir.');
  }
  if (!volverAV2) tomarSobre(enc);
  else if (S.kv) c.kit = kitDelSobre(S.kv.k, S.cartera, c) || c.kit;
  S.cartera = c; S.enc = { texto: enc, sha: null }; fijarBase(rev, enc); cacheCuenta.set(enc); LS.del('inv-pend-cuenta');
  sumarInstPropios(); pintar();
  if (volverAV2) guardarCarteraCallada('Volver al formato 2').catch(() => {});
  toast(S.avisoConflicto ? 'Tu cuenta tenía cambios más recientes de otro dispositivo: se ha quedado esa versión' : 'Tu cartera se ha actualizado con lo que cambiaste en otro dispositivo', 6000);
  S.avisoConflicto = false;
}

function pantallaDesbloqueo(errorTxt = '', texto = '') {
  if (S.demo) return salirDemo();
  const n = nombreUsuario();
  $('#app').innerHTML = `<div class="pantalla"><form class="caja" id="fDesb" autocomplete="on">
    <img class="logo" src="icon-192.png" alt="">
    <h1>${PERFIL_CUENTA && n ? `${esc(saludoHora())}, ${esc(n)}` : '<img class="h1-nom" src="growfolio-nombre.svg" alt="GrowFolio">'}</h1>
    <p>${texto ? esc(texto) : PERFIL_CUENTA ? 'Tu cartera está cifrada en tu cuenta. Escribe la contraseña de tu cartera para verla en este dispositivo.' : PERFIL_LOCAL ? 'Tu cartera de este dispositivo está cifrada. Escribe tu contraseña para verla.' : 'Tu cartera está cifrada. Escribe tu contraseña para verla.'}</p>
    <input type="text" name="username" value="${esc(PERFIL_CUENTA && FB.user && FB.user.email ? FB.user.email + ' (cartera)' : CFG.owner)}" autocomplete="username" hidden>
    <label class="campo">${PERFIL_CUENTA ? 'Contraseña de tu cartera' : 'Contraseña'}<input type="password" id="pass" autocomplete="current-password" required autofocus></label>
    <label class="check"><input type="checkbox" id="recordar" checked> Recordar en este dispositivo</label>
    <div class="error" id="err">${esc(errorTxt)}</div>
    <button class="btn pri" type="submit" id="bEntrar">Entrar</button>
    ${htmlOtroPerfil()}
    ${formatoDe(S.enc && S.enc.texto) && formatoDe(S.enc.texto).v === 2 ? `<button type="button" class="enlace" id="bOlvido">${L('He olvidado la contraseña de mi cartera', 'I forgot my portfolio password')}</button>` : PERFIL_CUENTA && FB.user ? '<button type="button" class="enlace cero" id="bCero">No recuerdo esa contraseña: empezar de cero en esta cuenta</button>' : ''}
    <button type="button" class="enlace ver-intro" id="bIntro">¿Qué es GrowFolio?</button>
    ${selectorIdioma('pie')}
  </form></div>`;
  enlazarOtroPerfil();
  if ($('#bCero')) $('#bCero').onclick = () => {
    if (!confirm(trad('Se borrará la cartera guardada en esta cuenta y empezarás una vacía. Sin su contraseña nadie puede recuperarla. ¿Empezar de cero?'))) return;
    S.enc = null; S.cuentaNueva = false; S.cuentaLeida = true; LS.del('inv-cuenta-enc'); LS.del('inv-pend-cuenta');
    pantallaCrear();
  };
  $('#bIntro').onclick = () => pantallaIntro(() => pantallaDesbloqueo());
  if ($('#bOlvido')) $('#bOlvido').onclick = () => pantallaRecuperar();
  $('#fDesb').onsubmit = async (ev) => {
    ev.preventDefault();
    const b = $('#bEntrar'); b.disabled = true; b.textContent = 'Descifrando…'; $('#err').textContent = '';
    try {
      const r = await abrirConContrasena(S.enc.texto, $('#pass').value);
      // si este dispositivo tenía lo de la cartera cifrado con otra clave (la de la contraseña, antes de pasar al
      // formato 2 en otro dispositivo), se pasa a la de datos
      await pasarLocalesA(r.key, r.kek);
      fijarSesion(r);
      if ($('#recordar').checked) await recordarClave();
      else await IDB.del(IDB_CLAVE);
      marcarDesbloqueo();
      arrancar();
    } catch (e) {
      console.warn(e);
      b.disabled = false; b.textContent = 'Entrar';
      $('#err').textContent = 'Contraseña incorrecta.';
      $('#pass').select();
    }
  };
}

/* 0.5: «He olvidado la contraseña»: con el código de recuperación se abre la clave de datos y se cierra con una
   contraseña nueva. La cartera no se vuelve a cifrar y el código sigue valiendo (se puede cambiar luego en Ajustes) */
function pantallaRecuperar() {
  const f = formatoDe(S.enc && S.enc.texto);
  if (!f || f.v !== 2) return pantallaDesbloqueo();
  $('#app').innerHTML = `<div class="pantalla"><form class="caja" id="fRec" novalidate>
    <img class="logo" src="icon-192.png" alt="">
    <h1>${L('Recuperar tu cartera', 'Recover your portfolio')}</h1>
    <p>${L('Escribe el código de recuperación que guardaste (24 letras y números; los guiones dan igual) y elige una contraseña nueva para tu cartera.', 'Type the recovery code you saved (24 letters and numbers; dashes don\'t matter) and choose a new password for your portfolio.')}</p>
    <input type="text" name="username" value="${esc(PERFIL_CUENTA && FB.user && FB.user.email ? FB.user.email + ' (cartera)' : '')}" autocomplete="username" hidden>
    <label class="campo">${L('Código de recuperación', 'Recovery code')}<input id="rCod" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" data-no-trad></label>
    <label class="campo">${L('Contraseña nueva', 'New password')}<input type="password" id="rP1" autocomplete="new-password" minlength="8"><small>${L('Al menos 8 caracteres.', 'At least 8 characters.')}</small></label>
    <label class="campo">${L('Repítela', 'Repeat it')}<input type="password" id="rP2" autocomplete="new-password" minlength="8"></label>
    <label class="check"><input type="checkbox" id="recordar" checked> ${L('Recordar en este dispositivo', 'Remember on this device')}</label>
    <div class="error" id="err"></div>
    <button class="btn pri" type="submit" id="bRec">${L('Recuperar', 'Recover')}</button>
    <button type="button" class="enlace" id="bVolver">${L('Volver', 'Back')}</button>
    ${PERFIL_CUENTA && FB.user ? `<button type="button" class="enlace cero" id="bCero">${L('No tengo el código: empezar de cero en esta cuenta', "I don't have the code: start from scratch in this account")}</button>` : ''}
  </form></div>`;
  $('#bVolver').onclick = () => pantallaDesbloqueo();
  if ($('#bCero')) $('#bCero').onclick = () => {
    if (!confirm(L('Se borrará la cartera guardada en esta cuenta y empezarás una vacía. Sin su contraseña ni su código nadie puede recuperarla. ¿Empezar de cero?', 'The portfolio saved in this account will be deleted and you will start an empty one. Without its password or its code nobody can recover it. Start from scratch?'))) return;
    S.enc = null; S.cuentaNueva = false; S.cuentaLeida = true; LS.del('inv-cuenta-enc'); LS.del('inv-pend-cuenta');
    pantallaCrear();
  };
  $('#rCod').focus();
  $('#fRec').onsubmit = async (ev) => {
    ev.preventDefault();
    const cod = $('#rCod').value, p1 = $('#rP1').value, p2 = $('#rP2').value, err = (t) => { $('#err').textContent = t; };
    if (!codigoValido(cod)) return err(L('El código tiene 24 letras y números (sin I, O, 0 ni 1). Revísalo.', 'The code has 24 letters and numbers (no I, O, 0 or 1). Check it.'));
    if (p1.length < 8) return err(L('La contraseña necesita al menos 8 caracteres.', 'The password needs at least 8 characters.'));
    if (p1 !== p2) return err(L('Las contraseñas no coinciden.', "The passwords don't match."));
    const b = $('#bRec'); b.disabled = true; b.textContent = L('Comprobando…', 'Checking…'); err('');
    try {
      const g = formatoDe(S.enc.texto);
      let raw;
      try { raw = await abrirClave(await claveCodigo(cod, b64.dec(g.k.rec.salt), g.k.rec.iter), g.k.rec); }
      catch (e) { b.disabled = false; b.textContent = L('Recuperar', 'Recover'); return err(L('Ese código no abre esta cartera. Comprueba que es el último que guardaste.', "That code doesn't open this portfolio. Check it's the latest one you saved.")); }
      const key = await importarDatos(raw), cartera = await descifrar(S.enc.texto, key);
      const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 600000, kek = await derivarClave(p1, salt, iter);
      const pass = await cierreDe(kek, raw, salt, iter, (+g.k.pass.n || 0) + 1), kv = { kid: g.kid, k: { ...g.k, pass } };
      await pasarLocalesA(key);
      fijarSesion({ cartera, key, kv, kek, salt, iter });
      // el código sigue dentro de la cartera; si faltara (no debería), se pone el que acabas de escribir
      if (!S.cartera.kit || S.cartera.kit.salt !== g.k.rec.salt) S.cartera.kit = { codigo: normCodigo(cod).match(/.{4}/g).join('-'), salt: g.k.rec.salt, creado: new Date().toISOString(), guardado: new Date().toISOString() };
      if ($('#recordar').checked) await recordarClave(); else await IDB.del(IDB_CLAVE);
      await guardarCartera('Recuperar con el código');
      marcarDesbloqueo();
      toast(L('Contraseña nueva puesta. Tu código de recuperación sigue valiendo.', 'New password set. Your recovery code still works.'), 6000);
      arrancar();
    } catch (e) { console.warn(e); b.disabled = false; b.textContent = L('Recuperar', 'Recover'); err(L('No se ha podido recuperar (¿sin conexión?). Prueba otra vez.', "Couldn't recover it (offline?). Try again.")); }
  };
}

/* para que otra persona use la web con su propia cartera, sin GitHub (o para volver a la del repositorio) */
function htmlOtroPerfil() {
  if (PERFIL_CUENTA) return `<div class="otro-perfil"><span>${FB.user && FB.user.email ? esc(FB.user.email) : 'Tu cuenta'}</span><button type="button" class="enlace" id="bPerfil">Entrar con otra cuenta</button></div>`;
  return PERFIL_LOCAL
    ? `<button type="button" class="enlace otro-perfil" id="bPerfil">Abrir la cartera guardada en GitHub</button>`
    : `<div class="otro-perfil"><span>¿Eres otra persona?</span><button type="button" class="enlace" id="bPerfil">Crea tu propia cartera en este dispositivo</button></div>`;
}
function enlazarOtroPerfil() { const b = $('#bPerfil'); if (b) b.onclick = () => (PERFIL_CUENTA ? cerrarSesion() : cambiarPerfil(!PERFIL_LOCAL)); }
function pantallaCrear() {
  $('#app').innerHTML = `<div class="pantalla"><form class="caja" id="fCrear">
    <img class="logo" src="icon-192.png" alt="">
    ${PERFIL_CUENTA ? `<p class="paso-chip">${esc(trad('Paso 2 de 2: tu contraseña'))}</p>` : ''}
    <h1>${PERFIL_CUENTA ? 'La contraseña de tu cartera' : 'Crear tu cartera'}</h1>
    ${PERFIL_CUENTA ? '<p>Es distinta de la de entrar. Con ella se cifran tus cifras en este dispositivo antes de subirlas, así que ni GrowFolio ni Google pueden verlas.</p><p class="crear-aviso"><b>Apúntala en un sitio seguro.</b> Si la pierdes, nadie puede recuperar tus datos.</p>' : PERFIL_LOCAL
      ? '<p>Tu cartera se guarda solo en este dispositivo, cifrada con tu contraseña: nadie más la ve, ni quien te pasó GrowFolio ni GitHub. Los precios, el radar, las noticias y las ideas son los mismos para todos.</p><p class="nota" style="margin:0">Para pasarla a otro móvil o tener copia: Ajustes, Descargar copia, y en el otro, Importar copia.</p>'
      : `<p>Todavía no hay ninguna cartera guardada en <b>${esc(CFG.owner)}/${esc(CFG.repo)}</b>. Importa tu copia de la cartera o empieza de cero.</p>`}
    ${PERFIL_CUENTA ? '<details class="crear-copia"><summary>¿Tienes una copia de GrowFolio (.json)?</summary>' : ''}<label class="campo">Archivo de cartera (.json)<input type="file" id="archivo" accept=".json,application/json"><small id="archivoInfo">Opcional: una copia de GrowFolio o un JSON con el ISIN o el ticker de cada cosa (<a href="#" id="bEjemplo">descarga un ejemplo</a>). Si no subes nada, empiezas con la cartera vacía y la llenas dentro.</small></label>${PERFIL_CUENTA ? '</details>' : ''}
    <label class="campo">${PERFIL_CUENTA ? 'Contraseña de tu cartera' : 'Contraseña nueva'}<input type="password" id="p1" autocomplete="new-password" minlength="8" required><small>Al menos 8 caracteres. Si la pierdes, no hay forma de recuperar los datos.</small></label>
    <label class="campo">Repite la contraseña<input type="password" id="p2" autocomplete="new-password" minlength="8" required></label>
    ${PERFIL_LOCAL ? '' : `<label class="campo">Token de GitHub<input type="password" id="tok" value="${esc(GH.token() || '')}" autocomplete="off" placeholder="github_pat_…"><small>Para guardar desde GrowFolio. Si no lo pones, se descarga el archivo cifrado y lo subes tú al repositorio.</small></label>`}
    <label class="check"><input type="checkbox" id="recordar" checked> Recordar en este dispositivo</label>
    <div class="error" id="err"></div>
    <button class="btn pri" type="submit" id="bCrear">${PERFIL_CUENTA ? 'Crear mi cartera' : 'Cifrar y guardar'}</button>
    ${PERFIL_LOCAL ? htmlOtroPerfil() : ''}
    <button type="button" class="enlace ver-intro" id="bIntro">¿Qué es GrowFolio?</button>
    ${selectorIdioma('pie')}
  </form></div>`;
  enlazarOtroPerfil();
  $('#bIntro').onclick = () => pantallaIntro(pantallaCrear);
  let importada = null;
  $('#bEjemplo').onclick = (e) => { e.preventDefault(); descargar('cartera-ejemplo.json', JSON.stringify(EJEMPLO_CARTERA, null, 2)); };
  $('#archivo').onchange = async (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    try {
      const r = normalizarCartera(JSON.parse(await file.text()));
      importada = r.cartera;
      $('#archivoInfo').textContent = resumenImport(r);
    } catch (e) { importada = null; $('#archivoInfo').textContent = `Ese archivo no parece una cartera: ${e instanceof SyntaxError ? 'el JSON tiene un error de formato (una coma o unas comillas de más o de menos).' : e.message || 'falta la lista "posiciones".'}`; }
  };
  $('#fCrear').onsubmit = async (ev) => {
    ev.preventDefault();
    const p1 = $('#p1').value, p2 = $('#p2').value;
    if (p1 !== p2) { $('#err').textContent = 'Las contraseñas no coinciden.'; return; }
    if (p1.length < 8) { $('#err').textContent = 'La contraseña necesita al menos 8 caracteres.'; return; }
    const tok = $('#tok') ? $('#tok').value.trim() : '';
    if (tok) LS.set('inv-token', tok);
    const b = $('#bCrear'); b.disabled = true; b.textContent = 'Cifrando…';
    S.salt = crypto.getRandomValues(new Uint8Array(16)); S.iter = 600000;
    const kek = await derivarClave(p1, S.salt, S.iter);
    S.cartera = importada || { version: 1, posiciones: [], efectivo: [], aportaciones: [], limite_acciones: 20 };
    // 0.5: la cartera nueva ya nace en el formato 2, con su código de recuperación (se enseña al entrar)
    if (PERFIL_CUENTA || PERFIL_LOCAL || CFG.dev) { const sb = await sobreNuevo(kek, S.salt, S.iter); S.key = sb.key; S.kv = sb.kv; S.kek = kek; S.cartera.kit = sb.kit; S.kitRecien = sb.kv.kid; }
    else { S.key = kek; S.kv = null; }
    if ($('#recordar').checked) await recordarClave();
    const ok = await guardarCartera('Crear cartera cifrada');
    if (ok) { S.recienCreada = true; arrancar(); } else { b.disabled = false; b.textContent = PERFIL_CUENTA ? 'Crear mi cartera' : 'Cifrar y guardar'; }
  };
}

