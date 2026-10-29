/* ---------- 0.5: el código de recuperación, en pantalla ----------
   Sale solo la primera vez (al crear la cartera o al pasar al formato 2), una vez al día mientras no lo guardes, y
   siempre en Ajustes, Seguridad. Para darlo por guardado hay que escribir uno de sus grupos: así se comprueba que lo
   tienes apuntado de verdad. «Generar uno nuevo» deja sin valor el anterior. */
const conKit = () => !!(S.kv || PERFIL_LOCAL || CFG.dev);
async function verKit() {
  if (!S.cartera || !conKit()) return;
  // una cartera aún en el formato 1: se pasa ahora (el código nace con ella)
  if (!S.kv) { toast(L('Creando tu código de recuperación…', 'Creating your recovery code…'), 3000); await pasarAV2(true); }
  if (!S.kv) return toast(L('Ahora no se puede crear: hace falta conexión. Prueba en un momento.', "It can't be created right now: it needs a connection. Try again in a moment."), 6000);
  // creado aquí, pero aún sin llegar a tu cuenta: se enseña en cuanto llegue (si no llegara, no valdría)
  if (!confirmadoV2()) { toast(L('Tu código está listo: te lo enseño en cuanto llegue a tu cuenta.', 'Your code is ready: I will show it as soon as it reaches your account.'), 5000); setTimeout(() => revisarKit(), 3000); return; }
  const kit = S.cartera.kit;
  // el código de dentro no es el que abre la cartera (si se cambió a la vez en dos dispositivos): uno nuevo
  if (!kit || !kit.codigo || kit.salt !== S.kv.k.rec.salt) return nuevoCodigo(L('Tu cartera no tiene un código de recuperación que la abra (pasa si se cambió a la vez en dos dispositivos).', "Your portfolio has no recovery code that opens it (it happens if it was changed on two devices at once)."));
  // ya guardado: para volver a verlo, la contraseña (una vez por sesión)
  if (kit.guardado && S.kitAbierto !== S.kv.kid) {
    if (!(await claveConContrasena(L('Para ver tu código de recuperación, escribe la contraseña de tu cartera.', 'To see your recovery code, type your portfolio password.')))) return;
    S.kitAbierto = S.kv.kid;
  }
  const grupos = kit.codigo.split('-'), n = crypto.getRandomValues(new Uint8Array(1))[0] % grupos.length, app = !!window.InversionesApp;
  const correo = FB.user && FB.user.email ? FB.user.email : '';
  const h = hoja(L('Tu código de recuperación', 'Your recovery code'), `<div class="kit">
    <p>${L('Si olvidas la contraseña de tu cartera, con este código la recuperas. Guárdalo fuera de este dispositivo: en tu gestor de contraseñas, en un papel o en una foto que no esté en este móvil.', 'If you forget your portfolio password, this code gets it back. Keep it away from this device: in your password manager, on paper or in a photo stored elsewhere.')}</p>
    <div class="kit-cod" data-no-trad aria-label="${esc(L('Código', 'Code'))}">${grupos.map((g, i) => `<span${i === n && !kit.guardado ? ' class="kit-g"' : ''}>${esc(g)}</span>`).join('')}</div>
    <div class="fila-btns kit-btns"><button type="button" class="btn" id="kCopiar">${L('Copiar', 'Copy')}</button>${app ? '' : `<button type="button" class="btn" id="kBajar">${L('Descargar', 'Download')}</button>`}</div>
    <p class="nota">${L('Quien tenga este código y pueda entrar en tu cuenta puede abrir tu cartera. No lo mandes por WhatsApp ni lo guardes junto a la contraseña.', 'Anyone with this code who can sign in to your account can open your portfolio. Don\'t send it by WhatsApp or keep it next to the password.')}${app ? ' ' + L('En la app, cópialo a tu gestor de contraseñas o apúntalo.', 'In the app, copy it to your password manager or write it down.') : ''}</p>
    ${kit.guardado ? `<p class="kit-ok">${ICONOS.ok}${L(`Lo guardaste el ${esc(fechaLarga(kit.guardado.slice(0, 10)))}.`, `You saved it on ${esc(kit.guardado.slice(0, 10))}.`)}</p>
      <div class="fila-btns"><button type="button" class="enlace" id="kNuevo">${L('Generar un código nuevo', 'Generate a new code')}</button><button type="button" class="btn pri" data-cerrar>${L('Cerrar', 'Close')}</button></div>`
      : `<form class="kit-comp" id="kComp" novalidate><label class="campo">${L(`Para comprobar que lo tienes, escribe el grupo ${n + 1} (el marcado)`, `To check you have it, type group ${n + 1} (the highlighted one)`)}<input id="kGrupo" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text"></label>
        <div class="error" id="kErr"></div>
        <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Luego', 'Later')}</button><button type="submit" class="btn pri">${L('Ya lo he guardado', "I've saved it")}</button></div></form>`}
  </div>`);
  h.el.classList.add('hoja-kit');
  LS.set('inv-kit-visto', hoyIso());
  $('#kCopiar', h.el).onclick = async () => { try { await navigator.clipboard.writeText(kit.codigo); toast(L('Código copiado', 'Code copied')); } catch (e) { toast(kit.codigo, 8000); } };
  if ($('#kBajar', h.el)) $('#kBajar', h.el).onclick = () => descargarTexto(`growfolio-codigo-recuperacion.txt`, [L('GrowFolio · Código de recuperación de tu cartera', 'GrowFolio · Your portfolio recovery code'), '', kit.codigo, '', correo ? L(`Cuenta: ${correo}`, `Account: ${correo}`) : '', L(`Creado: ${kit.creado.slice(0, 10)}`, `Created: ${kit.creado.slice(0, 10)}`), '', L('Si olvidas la contraseña de tu cartera: entra con tu cuenta y, en la pantalla «Contraseña de tu cartera», toca «He olvidado la contraseña de mi cartera» y escribe este código.', 'If you forget your portfolio password: sign in with your account and, on the «Portfolio password» screen, tap «I forgot my portfolio password» and type this code.')].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n'));
  const comp = $('#kComp', h.el);
  if (comp) comp.onsubmit = async (ev) => {
    ev.preventDefault();
    if (normCodigo($('#kGrupo', h.el).value) !== grupos[n]) { $('#kErr', h.el).textContent = L(`No coincide con el grupo ${n + 1}. Míralo en lo que has guardado.`, `It doesn't match group ${n + 1}. Check what you saved.`); return; }
    S.cartera.kit = { ...S.cartera.kit, guardado: new Date().toISOString() };
    await guardarCarteraCallada('Código de recuperación guardado');
    h.cerrar(true); pintar(); toast(L('Hecho: tu cartera ya tiene salida si olvidas la contraseña', 'Done: your portfolio is safe if you forget the password'), 5000);
  };
  const nv = $('#kNuevo', h.el);
  if (nv) nv.onclick = () => { h.cerrar(true); nuevoCodigo(); };
}
// un código nuevo: cierra la misma clave de datos con otro código. El de antes deja de abrir tu cartera (las copias de
// seguridad que descargaste antes se siguen abriendo con lo de entonces)
async function nuevoCodigo(motivo) {
  if (!S.kv || !S.cartera) return;
  if (!confirmadoV2()) return toast(L('Ahora no se puede: hace falta conexión. Prueba en un momento.', "Not right now: it needs a connection. Try again in a moment."), 5000);
  if (!confirm(motivo ? `${motivo} ${L('¿Generar uno nuevo ahora?', 'Generate a new one now?')}` : L('El código que tienes guardado dejará de abrir tu cartera y tendrás que guardar el nuevo. Las copias de seguridad que descargaste antes se siguen abriendo con él. ¿Generar uno nuevo?', 'The code you saved will stop opening your portfolio and you will have to save the new one. Backups you downloaded before still open with it. Generate a new one?'))) return;
  const raw = await claveDatosEnClaro(L('Para generar un código nuevo, escribe la contraseña de tu cartera.', 'To generate a new code, type your portfolio password.'));
  if (!raw) return;
  const kid = S.kv.kid, codigo = codigoNuevo(), rsalt = crypto.getRandomValues(new Uint8Array(16));
  const rec = await cierreDe(await claveCodigo(codigo, rsalt), raw, rsalt, ITER_COD, (+S.kv.k.rec.n || 0) + 1);
  // lo de la sesión se lee después de cerrar: si mientras tanto llegó otra clave de datos, no se toca
  if (!S.kv || S.kv.kid !== kid || !S.cartera) return toast(L('Tu cartera acaba de cambiar en otro dispositivo. Vuelve a intentarlo.', 'Your portfolio just changed on another device. Try again.'), 5000);
  S.kv = { kid, k: { ...S.kv.k, rec } };
  S.cartera.kit = { codigo, salt: rec.salt, creado: new Date().toISOString() };
  S.kitAbierto = kid;
  await guardarCarteraCallada('Código de recuperación nuevo');
  verKit();
}
/* 0.5: copia de seguridad cifrada. Es la cartera tal cual va a tu cuenta (formato 2): se abre con su contraseña o con
   su código de recuperación, también los de entonces si luego los cambiaste. Al cargarla, sustituye a la cartera de
   ahora (que antes se guarda en este dispositivo) y se cifra con tus claves de hoy */
function copiaSeguridad() {
  const app = !!window.InversionesApp, ult = LS.get('inv-copia-hecha');
  const h = hoja(L('Copia de seguridad', 'Backup'), `<div class="copia">
    <p>${L('Un archivo con toda tu cartera, cifrado igual que en tu cuenta: sin su contraseña o su código de recuperación no se puede abrir. Guárdalo en tu ordenador, en un pendrive o en tu nube.', 'A file with your whole portfolio, encrypted just like in your account: it cannot be opened without its password or recovery code. Keep it on your computer, a USB stick or your cloud.')}</p>
    ${ult ? `<p class="nota">${L(`La última la descargaste el ${esc(fechaLarga(ult))} en este dispositivo.`, `You last downloaded one on ${esc(ult)} on this device.`)}</p>` : ''}
    <div class="fila-btns copia-btns">${app ? '' : `<button type="button" class="btn pri" id="cBajar">${L('Descargar la copia', 'Download the backup')}</button>`}<label class="btn">${L('Cargar una copia', 'Load a backup')}<input type="file" id="cSubir" accept=".growfolio,.json,application/json" hidden></label></div>
    ${app ? `<p class="nota">${L('La app de Android no puede guardar archivos: descárgala desde GrowFolio en el navegador del móvil o del ordenador.', 'The Android app cannot save files: download it from GrowFolio in the phone or computer browser.')}</p>` : ''}
  </div>`);
  h.el.classList.add('hoja-copia');
  if ($('#cBajar', h.el)) $('#cBajar', h.el).onclick = async () => {
    if (!S.kv && !(await pasarAV2(true))) return toast(L('Ahora no se puede: hace falta conexión. Prueba en un momento.', "Not right now: it needs a connection. Try again in a moment."), 5000);
    if (!S.enc || !S.enc.texto || formatoDe(S.enc.texto).v !== 2) return toast(L('Aún no se puede: tu cartera todavía no ha pasado al formato nuevo. Prueba en un momento.', "Not yet: your portfolio hasn't moved to the new format. Try again in a moment."), 5000);
    descargarTexto(`growfolio-copia-${hoyIso()}.growfolio`, S.enc.texto);
    LS.set('inv-copia-hecha', hoyIso());
    toast(L('Copia descargada. Guárdala fuera de este dispositivo.', 'Backup downloaded. Keep it off this device.'), 5000);
  };
  $('#cSubir', h.el).onchange = async (ev) => {
    const file = ev.target.files[0]; ev.target.value = '';
    if (!file) return;
    let texto, f;
    try { texto = await file.text(); f = JSON.parse(texto); } catch (e) { return toast(L('Ese archivo no es una copia de GrowFolio.', "That file isn't a GrowFolio backup."), 5000); }
    if (!f || !f.ct || !f.iv || !(f.v === 2 || f.salt)) return toast(L('Ese archivo no es una copia cifrada. Las copias sin cifrar (.json) se cargan en Ajustes, Avanzado.', "That file isn't an encrypted backup. Unencrypted copies (.json) are loaded in Settings, Advanced."), 6000);
    h.cerrar(true); abrirCopia(texto, f);
  };
}
function abrirCopia(texto, f) {
  const h = hoja(L('Cargar una copia', 'Load a backup'), `<form class="copia" id="fCopia" novalidate>
    <p>${L('Escribe la contraseña que tenía tu cartera cuando hiciste la copia, o su código de recuperación.', 'Type the password your portfolio had when you made the backup, or its recovery code.')}</p>
    <label class="campo">${L('Contraseña o código', 'Password or code')}<input type="password" id="cPass" autocomplete="off"></label>
    <div class="error" id="cErr"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri">${L('Abrir la copia', 'Open the backup')}</button></div>
  </form>`);
  $('#cPass', h.el).focus();
  $('#fCopia', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const x = $('#cPass', h.el).value, b = $('#fCopia .btn.pri', h.el);
    if (!x) return;
    b.disabled = true; b.textContent = L('Abriendo…', 'Opening…'); $('#cErr', h.el).textContent = '';
    let copia = null;
    try { copia = (await abrirConContrasena(texto, x)).cartera; } catch (e) {}
    if (!copia && f.v === 2 && codigoValido(x)) { try { copia = await descifrar(texto, await importarDatos(await abrirClave(await claveCodigo(x, b64.dec(f.k.rec.salt), f.k.rec.iter), f.k.rec))); } catch (e) {} }
    if (!copia) { b.disabled = false; b.textContent = L('Abrir la copia', 'Open the backup'); $('#cErr', h.el).textContent = L('No abre esta copia. Prueba con la contraseña de cuando la hiciste o con su código.', "It doesn't open this backup. Try the password from when you made it, or its code."); return; }
    const n = (copia.posiciones || []).length, cuando = copia.actualizado ? fechaLarga(String(copia.actualizado).slice(0, 10)) : '';
    if (!confirm(L(`¿Sustituir tu cartera de ahora por la de la copia${cuando ? ` (del ${cuando})` : ''}, con ${n} posiciones? La de ahora se guarda antes en este dispositivo.`, `Replace your current portfolio with the backup${copia.actualizado ? ` (from ${String(copia.actualizado).slice(0, 10)})` : ''}, with ${n} holdings? The current one is saved on this device first.`))) { h.cerrar(true); return; }
    if (S.enc && S.enc.texto) LS.set('inv-copia-anterior', { texto: S.enc.texto, cuando: new Date().toISOString() });
    S.cartera = { ...copia, kit: S.cartera.kit };
    sumarInstPropios(); await guardarCartera(L('Cargar copia de seguridad', 'Load backup'));
    h.cerrar(true); pintar();
    toast(L(`Cartera cargada de la copia: ${n} posiciones.`, `Portfolio loaded from the backup: ${n} holdings.`), 6000);
  };
}
function descargarTexto(nombre, texto) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
  a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
// al abrir: la cartera pasa al formato 2 si aún no lo está (a los días, ver pasarAV2) y, mientras el código no esté
// guardado, se enseña (una vez al día), siempre después de que el paso haya llegado a la cuenta
async function revisarKit(intento = 0) {
  if (!S.cartera || !S.key) return;
  if (!LS.get('inv-05-desde')) LS.set('inv-05-desde', hoyIso());
  if (!S.kv) { await pasarAV2(); if (!S.kv) { if (intento < 8 && conKit()) setTimeout(() => revisarKit(intento + 1), 8000); return; } }
  const kit = S.cartera.kit;
  if (!kit || kit.guardado || !kit.codigo) return;
  if (S.kitRecien !== S.kv.kid && LS.get('inv-kit-visto') === hoyIso()) return;
  const ocupado = document.querySelector('.hoja-fondo, #asesorFondo, .tour, .intro, .estreno, .bloqueo, .ficha-fondo') || document.hidden || !confirmadoV2();
  if (ocupado) { if (intento < 30) setTimeout(() => revisarKit(intento + 1), 5000); return; }
  S.kitRecien = null;
  verKit();
}
/* Formato 1 → 2: un sobre nuevo con la clave de la contraseña que ya se tiene (no hace falta escribirla). La sesión pasa
   a la clave de datos de golpe, sin esperas entre comprobar y cambiar, y se guarda por el camino de siempre (la cola de
   subidas, con su transacción): si no sube ahora, sube luego, y mientras tanto la cartera se abre igual con la contraseña.
   Solo con la cuenta leída, sin cambios por subir y con conexión. Solo (sin «ya»), a los DIAS_PASO_V2 días de tener la
   0.5 en este dispositivo: para entonces los otros dispositivos también la tienen (una 0.4 abierta no sabe abrir el
   formato 2). Con «ya» (crear el código, cambiar la contraseña, descargar una copia), al momento. */
const DIAS_PASO_V2 = 3;
function pasarAV2(ya) {
  if (S.kv) return Promise.resolve(true);
  if (S.pasoV2) return S.pasoV2;
  if (!S.key || !S.cartera || !S.salt || !S.enc || !conKit()) return Promise.resolve(false);
  if (PERFIL_CUENTA && (!S.cuentaLeida || LS.get('inv-pend-cuenta') || navigator.onLine === false)) return Promise.resolve(false);
  if (!ya) { const d = LS.get('inv-05-desde'); if (!d || diasEntre(d, hoyIso()) < DIAS_PASO_V2) return Promise.resolve(false); }
  S.pasoV2 = (async () => {
    const kek = S.key, salt = S.salt, iter = S.iter || 600000;
    const sb = await sobreNuevo(kek, salt, iter), recuerda = !!(await IDB.get(IDB_CLAVE));
    // mientras se hacía el sobre: bloqueada, otra contraseña o ya en el formato 2 → nada
    if (S.key !== kek || S.kv || !S.cartera) return confirmadoV2();
    S.key = sb.key; S.kv = sb.kv; S.kek = kek; S.iter = iter; S.cartera.kit = sb.kit; S.kitRecien = sb.kv.kid;
    if (PERFIL_CUENTA && !CFG.dev) S.puente = { salt: b64.enc(salt), kek };
    await guardarCarteraCallada('Formato 2');
    // lo del dispositivo, solo si de verdad se ha guardado el formato 2 (si se bloqueó en medio, se queda como estaba)
    if (S.enc && idClave(S.enc.texto) === 'k:' + sb.kv.kid) {
      if (recuerda && S.key === sb.key) await recordarClave();
      await recifrarLocales(kek, sb.key);
    }
    return confirmadoV2();
  })().catch((e) => { console.warn('La cartera no ha pasado al formato 2 todavía', e); return confirmadoV2(); }).finally(() => { S.pasoV2 = null; });
  return S.pasoV2;
}

