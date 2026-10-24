/* =====================================================================
   Bloqueo con PIN o huella. Encima de "Recordar en este dispositivo" (y, cuando lleguen las cuentas,
   encima de la sesión de Google): la app se abre sola, pero una vez cada 72 horas pide el PIN de 4
   cifras o la huella. Cinco PIN mal seguidos olvidan la clave del dispositivo y piden la contraseña.
   Huella: en la app de Android, la del sistema (BiometricPrompt, por el puente); en el navegador,
   WebAuthn con el lector del dispositivo (huella, cara o Windows Hello).
   Es un candado de uso diario frente a quien coja el móvil, no sustituye al cifrado con la contraseña.
   ===================================================================== */
const BLOQUEO_H = 72, BLOQUEO_FALLOS = 5;
const cfgBloqueo = () => LS.get('inv-bloqueo', null);
const guardarBloqueo = (c) => (c ? LS.set('inv-bloqueo', c) : LS.del('inv-bloqueo'));
const marcarDesbloqueo = () => LS.set('inv-bloqueo-t', Date.now());
function necesitaBloqueo() {
  const c = cfgBloqueo();
  return !!(c && c.pin) && Date.now() - (+LS.get('inv-bloqueo-t', 0) || 0) > BLOQUEO_H * 3600000;
}
async function hashPin(pin, salt) {
  const base = await crypto.subtle.importKey('raw', TE.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64.enc(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, base, 256)));
}
// ¿qué huella hay en este dispositivo? 'app' (Android), 'web' (WebAuthn) o null
async function huellaPosible() {
  const a = window.InversionesApp;
  if (a && typeof a.huellaDisponible === 'function') { try { return a.huellaDisponible() ? 'app' : null; } catch (e) { return null; } }
  if (a) return null;  // app antigua: el WebView no tiene WebAuthn
  try { return window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) ? 'web' : null; } catch (e) { return null; }
}
let huellaEspera = null;
window.resultadoHuella = (ok, motivo) => { const r = huellaEspera; huellaEspera = null; if (r) r({ ok: !!ok, motivo: motivo || '' }); };
function huellaApp() {
  return new Promise((res) => {
    huellaEspera = res;
    try { window.InversionesApp.pedirHuella(IDIOMA === 'en' ? 'Unlock GrowFolio' : 'Desbloquea GrowFolio', IDIOMA === 'en' ? 'Use PIN' : 'Usar el PIN'); } catch (e) { huellaEspera = null; res({ ok: false, motivo: 'sin puente' }); }
  });
}
async function registrarHuellaWeb() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'GrowFolio' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'GrowFolio', displayName: 'GrowFolio' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000,
  } });
  return b64.enc(new Uint8Array(cred.rawId));
}
async function huellaWeb(id) {
  try {
    const r = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: b64.dec(id) }], userVerification: 'required', timeout: 60000 } });
    const flags = new Uint8Array(r.response.authenticatorData)[32];
    return { ok: !!(flags & 0x04) };  // el lector comprobó que eres tú (huella, cara o PIN del sistema)
  } catch (e) { return { ok: false, motivo: e.name }; }
}
const pedirHuella = (c) => (c.huella && c.huella.tipo === 'app' ? huellaApp() : c.huella && c.huella.tipo === 'web' ? huellaWeb(c.huella.id) : Promise.resolve({ ok: false }));

/* la pantalla: cuatro puntos, teclado numérico grande y, si la hay, la huella */
function pantallaBloqueo(alAbrir, conContrasena) {
  if (S.demo) return;  // 0.6d: en la cartera de prueba no hay nada tuyo que bloquear (el PIN se pide al salir)
  S.kitAbierto = null;
  const c = cfgBloqueo(); if (!c) return alAbrir();
  $$('.bloqueo').forEach((x) => x.remove());
  const el = document.createElement('div');
  el.className = 'bloqueo'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'GrowFolio bloqueado');
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', c.huella ? 'huella' : '', '0', 'borrar'];
  el.innerHTML = `<div class="bq-caja">
    <img class="logo" src="favicon.svg" alt="">
    <h1>Hola de nuevo</h1>
    <p class="bq-txt">${c.huella ? 'Pon tu huella o tu PIN para ver tu cartera.' : 'Pon tu PIN para ver tu cartera.'}</p>
    <div class="bq-puntos" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <p class="bq-error" role="alert"></p>
    <div class="bq-teclado">${teclas.map((t) => (!t ? '<span></span>' : t === 'huella' ? `<button type="button" data-t="huella" aria-label="Usar la huella">${ICONOS.huella}</button>` : t === 'borrar' ? `<button type="button" data-t="borrar" aria-label="Borrar">${ICONOS.borrarTecla}</button>` : `<button type="button" data-t="${t}">${t}</button>`)).join('')}</div>
    <button type="button" class="enlace bq-pass">Usar la contraseña</button>
  </div>`;
  document.body.appendChild(el);
  let pin = '', ocupado = false;
  const puntos = $$('.bq-puntos i', el), err = $('.bq-error', el);
  const pintarPuntos = () => puntos.forEach((p, i) => p.classList.toggle('on', i < pin.length));
  const abrir = () => { marcarDesbloqueo(); const cc = cfgBloqueo(); if (cc && cc.fallos) { cc.fallos = 0; guardarBloqueo(cc); } document.removeEventListener('keydown', tecla, true); el.classList.add('sale'); setTimeout(() => el.remove(), 220); alAbrir(); };
  const aContrasena = () => { document.removeEventListener('keydown', tecla, true); el.remove(); conContrasena(); };
  const comprobar = async () => {
    ocupado = true;
    const cc = cfgBloqueo();
    const ok = (await hashPin(pin, b64.dec(cc.salt))) === cc.pin;
    if (ok) return abrir();
    cc.fallos = (cc.fallos || 0) + 1; guardarBloqueo(cc);
    pin = ''; pintarPuntos(); ocupado = false;
    el.querySelector('.bq-puntos').classList.remove('mal'); void el.offsetWidth; el.querySelector('.bq-puntos').classList.add('mal');
    const quedan = BLOQUEO_FALLOS - cc.fallos;
    if (quedan <= 0) {
      cc.fallos = 0; guardarBloqueo(cc);
      await IDB.del(IDB_CLAVE);
      toast('Demasiados intentos: entra con tu contraseña.');
      return aContrasena();
    }
    err.textContent = `PIN incorrecto. ${quedan === 1 ? 'Te queda 1 intento' : `Te quedan ${quedan} intentos`} antes de pedirte la contraseña.`;
  };
  const pulsar = (t) => {
    if (ocupado) return;
    if (t === 'huella') return probarHuella();
    if (t === 'borrar') { pin = pin.slice(0, -1); return pintarPuntos(); }
    if (pin.length >= 4) return;
    pin += t; err.textContent = ''; pintarPuntos();
    if (pin.length === 4) setTimeout(comprobar, 120);
  };
  const probarHuella = async () => {
    if (ocupado) return;
    ocupado = true;
    const r = await pedirHuella(cfgBloqueo());
    ocupado = false;
    if (r.ok) return abrir();
    if (r.motivo && !/cancel|pin|NotAllowed|AbortError/i.test(r.motivo)) err.textContent = 'No se pudo leer la huella. Prueba otra vez o usa el PIN.';
  };
  const tecla = (e) => {
    if (/^\d$/.test(e.key)) { e.preventDefault(); pulsar(e.key); } else if (e.key === 'Backspace') { e.preventDefault(); pulsar('borrar'); }
  };
  document.addEventListener('keydown', tecla, true);
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) pulsar(b.dataset.t); });
  $('.bq-pass', el).onclick = aContrasena;
  if (c.huella) setTimeout(probarHuella, 350);
}

/* al volver a la app después de 72 horas fuera, también */
document.addEventListener('visibilitychange', () => {
  if (document.hidden || S.demo || !S.cartera || $('.bloqueo') || !necesitaBloqueo()) return;
  pantallaBloqueo(() => {}, () => { S.cartera = null; S.key = null; pantallaDesbloqueo(); });
});

/* Ajustes: poner, cambiar o quitar el PIN y la huella */
function htmlAjustesBloqueo() {
  const c = cfgBloqueo();
  return `<div class="seccion-ed" id="ajBloqueo"><h3>${ICONOS.huella}Bloqueo con PIN o huella</h3>
    ${c ? `<p class="nota" style="margin:0">Activado${c.huella ? ', con PIN y huella' : ', con PIN'}. GrowFolio se abre sin contraseña, pero te pide ${c.huella ? 'la huella o el PIN' : 'el PIN'} una vez cada ${BLOQUEO_H} horas.</p>
      <div class="fila-btns" style="justify-content:flex-start"><button class="btn peq" id="aPin">Cambiar el PIN</button><button class="btn peq" id="aHuella" hidden></button><button class="btn peq" id="aSinPin">Quitar el bloqueo</button></div>`
    : `<p class="nota" style="margin:0">Pon un PIN de 4 cifras y, si tu móvil u ordenador tiene lector, la huella. GrowFolio se abre sin escribir la contraseña y te pide el PIN o la huella una vez cada ${BLOQUEO_H} horas.</p>
      <div class="fila-btns" style="justify-content:flex-start"><button class="btn peq pri" id="aPin">Poner un PIN</button></div>`}
  </div>`;
}
async function enlazarAjustesBloqueo(raiz, recargar) {
  const c = cfgBloqueo();
  const bPin = $('#aPin', raiz), bHuella = $('#aHuella', raiz), bQuitar = $('#aSinPin', raiz);
  if (bPin) bPin.onclick = () => ponerPin(recargar);
  if (bQuitar) dosPasos(bQuitar, '¿Seguro? Pulsa otra vez', () => { guardarBloqueo(null); LS.del('inv-bloqueo-t'); toast('Bloqueo quitado.'); recargar(); });
  if (c && bHuella) {
    const tipo = await huellaPosible();
    if (c.huella) { bHuella.hidden = false; bHuella.textContent = 'Quitar la huella'; bHuella.onclick = () => { const cc = cfgBloqueo(); delete cc.huella; guardarBloqueo(cc); toast('Ahora solo con PIN.'); recargar(); }; }
    else if (tipo) { bHuella.hidden = false; bHuella.textContent = 'Usar también la huella'; bHuella.onclick = () => activarHuella(tipo, recargar); }
    else if (window.InversionesApp && typeof window.InversionesApp.huellaDisponible !== 'function') { bHuella.hidden = false; bHuella.disabled = true; bHuella.textContent = 'Huella: actualiza la app'; }
  }
}
async function activarHuella(tipo, recargar) {
  try {
    let huella;
    if (tipo === 'app') { const r = await huellaApp(); if (!r.ok) return toast('No se activó la huella.'); huella = { tipo: 'app' }; }
    else huella = { tipo: 'web', id: await registrarHuellaWeb() };
    const cc = cfgBloqueo(); cc.huella = huella; guardarBloqueo(cc);
    toast('Huella activada.'); recargar();
  } catch (e) { console.warn(e); toast('No se activó la huella.'); }
}
function ponerPin(recargar) {
  const h = hoja('Tu PIN', `<form id="fPin">
    <p class="nota" style="margin:0">Cuatro cifras que recuerdes y que no sean obvias (nada de 1234 o tu año de nacimiento). Con él abres GrowFolio en este dispositivo; tu contraseña sigue siendo la llave de verdad.</p>
    <label class="campo">PIN nuevo<input type="password" id="pin1" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="new-password" required></label>
    <label class="campo">Repítelo<input type="password" id="pin2" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="new-password" required></label>
    <div class="error" id="pinErr"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar el PIN</button></div>
  </form>`);
  $('#fPin', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const a = $('#pin1', h.el).value.trim(), b = $('#pin2', h.el).value.trim();
    if (!/^\d{4}$/.test(a)) return ($('#pinErr', h.el).textContent = 'Tienen que ser 4 cifras.');
    if (a !== b) return ($('#pinErr', h.el).textContent = 'No coinciden. Escríbelo igual las dos veces.');
    if (/^(\d)\1{3}$/.test(a) || '0123456789'.includes(a) || '9876543210'.includes(a)) return ($('#pinErr', h.el).textContent = 'Es demasiado fácil de adivinar. Prueba con otro.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const antes = cfgBloqueo();
    guardarBloqueo({ pin: await hashPin(a, salt), salt: b64.enc(salt), fallos: 0, ...(antes && antes.huella ? { huella: antes.huella } : {}) });
    marcarDesbloqueo();
    // el PIN solo tiene sentido si la clave se recuerda en el dispositivo
    if (S.key && (S.kv || S.salt)) await recordarClave();
    h.cerrar();
    const tipo = !antes && (await huellaPosible());
    toast(antes ? 'PIN cambiado.' : 'PIN puesto.');
    if (tipo) return ofrecerHuella(tipo, recargar);
    recargar();
  };
}
function ofrecerHuella(tipo, recargar) {
  const h = hoja('¿También con la huella?', `<p class="nota" style="margin:0">${tipo === 'app' ? 'Tu móvil tiene lector de huella o de cara.' : 'Este dispositivo tiene lector (huella, cara o Windows Hello).'} Con él desbloqueas sin escribir el PIN; el PIN sigue valiendo por si acaso.</p>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Solo PIN</button><button type="button" class="btn pri" id="bSiHuella">Usar la huella</button></div>`, recargar);
  $('#bSiHuella', h.el).onclick = () => { h.el.remove(); activarHuella(tipo, recargar); };
}

