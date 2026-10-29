function bienvenida(intento = 0) {
  if (!S.cartera) return;
  // primero el aviso de la app, si lo hay; las novedades, después
  if (appEnCurso || (window.InversionesApp && !appRevisadaT) || document.querySelector('.hoja-fondo, .tour, #asesorFondo')) { if (intento < 40) setTimeout(() => bienvenida(intento + 1), intento ? 1500 : 800); return; }
  let visto = LS.get('inv-version', null);
  if (!LS.get('inv-vnum') && /^0\.[2-9]\.0$/.test(visto || '')) visto = '0.1.' + visto.split('.')[1];  // numeración de antes: 0.9.0 es la 0.1.9
  const nuevo = S.recienCreada || (!(S.cartera.posiciones || []).length && !LS.get('inv-tour', null));
  S.recienCreada = false;
  const fin = () => { if (Date.now() - appRevisadaT > 600000) setTimeout(() => revisarApp(), 400); };
  // si te falta el perfil, primero eso (y esa vez nada más: el resto, la próxima)
  // con una cartera de antes por recuperar en este dispositivo, eso va primero y lo demás espera a la próxima vez
  const despues = () => (copiaViejaPendiente() ? fin() : pedirPerfil(fin, () => avisoGTA(() => resumenDelDia(() => mostrarPreguntaIA(fin)))));
  // quien acaba de llegar: sus primeros pasos (y desde ahí, si quiere, el tutorial)
  if (nuevo) { LS.set('inv-version', VERSION); LS.set('inv-vnum', 2); if (!LS.get('inv-empezar', 0)) LS.set('inv-empezar', Date.now()); return guiaPrimerosPasos(fin); }
  // la 0.2 llega con su propia pantalla de estreno, una vez
  // la presentación de la 0.2 (la nueva, más completa): una vez a todos los que ya usaban GrowFolio
  if (visto && cmpVer(VERSION, '0.2.0') >= 0 && !LS.get('inv-estreno-02b')) return estreno02(visto, despues);
  if (/^0\.3\./.test(visto || '') && !LS.get('inv-nov-030')) return mostrarNovedades('0.2.3b', despues);
  // la 0.4d rehízo la presentación y la guía de la 0.4: quien ya iba por la 0.4 (0.4, 0.4a, 0.4b o 0.4c) las ve otra
  // vez, una sola, con la guía y el «Nuevo» de Mercados como si acabara de llegar
  if (visto && baseVer(visto) === '0.4' && !LS.get('inv-nov-04')) { LS.del('inv-guia'); LS.del('inv-guia-globo'); return mostrarNovedades('0.3.11e', despues); }
  if (visto && cmpVer(visto, VERSION) < 0 && baseVer(visto) === baseVer(VERSION)) return arreglosVistos(visto, despues);
  if (!visto || cmpVer(visto, VERSION) < 0) return mostrarNovedades(visto, despues);
  // la 0.2.3b estuvo unos minutos sin sus bugs corregidos: a quien la abrió entonces se le enseña otra vez, una sola
  if (visto === '0.2.3b' && !LS.get('inv-023b-arr')) return mostrarNovedades('0.2.3', despues);
  despues();
}

/* la web se renueva sola al abrirla; si llevas rato con ella abierta (la app la deja viva días) y hay
   versión nueva, un aviso con botón para recargar */
let firmaWeb = null, firmaT = 0;
async function revisarWeb() {
  if (CFG.dev || Date.now() - firmaT < 1800000) return;
  firmaT = Date.now();
  try {
    const r = await fetch(location.pathname, { method: 'HEAD', cache: 'no-store' });
    const f = r.ok && (r.headers.get('etag') || r.headers.get('last-modified'));
    if (!f) return;
    if (firmaWeb && f !== firmaWeb) avisoWebNueva(); else firmaWeb = f;
  } catch (e) {}
}
function avisoWebNueva() {
  if ($('#avisoWeb')) return;
  const d = document.createElement('div');
  d.id = 'avisoWeb'; d.className = 'aviso-web'; d.setAttribute('role', 'status');
  d.innerHTML = `${ICONOS.chispa}<span>${L('Hay una versión nueva de GrowFolio. Se actualiza en un segundo, sin perder nada.', 'A new version of GrowFolio is ready. It updates in a second and you lose nothing.')}</span><button class="btn peq pri">${L('Actualizar', 'Update')}</button><button class="ib" aria-label="${L('Cerrar el aviso', 'Close')}">${ICONOS.cerrar}</button>`;
  d.querySelector('.btn').onclick = () => { d.querySelector('.btn').textContent = L('Poniéndola…', 'Updating…'); location.reload(); };
  d.querySelector('.ib').onclick = () => d.remove();
  document.body.appendChild(d);
}

/* en el iPhone no hace falta bajar nada: desde Safari se pone en la pantalla de inicio y se abre como una app */
const ICO_COMPARTIR = SVG('<path d="M12 15V3.5M8 7.5l4-4 4 4"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16"/>', 1.8);
const htmlPasosIOS = () => `<ol class="ios-pasos">
  <li><span class="ios-n">1</span><span>${trad('Ábrela en Safari y toca')} <b class="ios-ico">${ICO_COMPARTIR}</b> ${trad('Compartir (abajo en el iPhone, arriba en el iPad).')}</span></li>
  <li><span class="ios-n">2</span><span>${trad('Baja y elige')} <b>${trad('Añadir a pantalla de inicio')}</b>${trad('. Si no sale, toca «Editar acciones» y añádelo.')}</span></li>
  <li><span class="ios-n">3</span><span>${trad('Toca')} <b>${trad('Añadir')}</b>${trad('. GrowFolio queda con su icono, como cualquier app.')}</span></li>
</ol>`;
function avisoIOS() {
  if (!ES_IOS || COMO_APP || LS.get('inv-ios-aviso')) return;
  if (document.querySelector('.hoja-fondo, #asesorFondo, .tour, .estreno, .bloqueo')) { setTimeout(avisoIOS, 5000); return; }
  LS.set('inv-ios-aviso', true);
  const h = hoja(trad('Ponla en tu pantalla de inicio'), `<div class="ios-aviso">${dibujo('movil')}<p>${trad('En el iPhone, GrowFolio funciona como una app sin pasar por la App Store: a pantalla completa, con su icono y sin las barras de Safari.')}</p>${htmlPasosIOS()}<div class="fila-btns"><button class="btn pri" data-cerrar>${trad('Entendido')}</button></div></div>`);
  h.el.classList.add('hoja-ios');
}
/* la app de Android: dónde bajarla, qué versión tienes y cómo pasarle el token sin escribirlo */
async function pintarAjustesApp(el) {
  if (!el) return;
  let ult = null;
  try { const r = await fetch(GH.raw('app.json', 'main') + '?v=' + Date.now(), { cache: 'no-store' }); if (r.ok) ult = await r.json(); } catch (e) {}
  const app = window.InversionesApp;
  const tengo = app ? versionApp() : 0;
  const apk = (ult && ult.apk) || `https://github.com/${CFG.owner}/${CFG.repo}/releases/download/app/growfolio.apk`;
  const android = /Android/i.test(navigator.userAgent);
  const tok = GH.token();
  if (ES_IOS) {
    el.closest('.seccion-ed').querySelector('h3').innerHTML = `${ICONOS.cartera}${trad('GrowFolio en tu iPhone')}`;
    el.innerHTML = COMO_APP ? `<p class="nota" style="margin:0">${trad('Ya la tienes en la pantalla de inicio: se abre como una app, a pantalla completa. El widget, por ahora, solo está en Android.')}</p>`
      : `${htmlPasosIOS()}<p class="nota" style="margin:0">${trad('Se abre como una app, a pantalla completa y sin las barras de Safari. El widget, por ahora, solo está en Android.')}</p>`;
    return;
  }
  if (app) {
    el.innerHTML = `<p class="nota" style="margin:0">Estás en la app (${esc(nombreApp())}). Para el widget: mantén pulsado un hueco de la pantalla de inicio > Widgets > GrowFolio y arrastra «Tu cartera». Se puede estirar o encoger.</p>
      ${ult && ult.version > tengo ? `<div class="fila-btns" style="justify-content:flex-start"><button class="btn peq pri" id="aActApp" data-cerrar>Actualizar la app</button></div>` : '<p class="nota" style="margin:0">Tienes la última versión de la app.</p>'}`;
    const b = $('#aActApp', el); if (b) b.onclick = () => avisoApp(ult);
    return;
  }
  el.innerHTML = `<p class="nota" style="margin:0">GrowFolio como app de Android, con un widget para la pantalla de inicio: tu patrimonio, lo que ganas o pierdes hoy y lo que toca hacer. ${ult ? '' : 'Todavía no hay ninguna versión publicada.'}</p>
    ${ult ? `<ol class="as-pasos-clave"><li>Descarga la app${android ? '' : ' desde el móvil'} e instálala: Android te pedirá permiso para instalar apps de Chrome la primera vez.</li><li>Ábrela y entra con tu contraseña de siempre.</li>${tok && android ? '<li>Pulsa «Pasar el token a la app» para que pueda guardar cambios sin escribirlo (necesita la versión 3 de la app o posterior).</li>' : ''}<li>Mantén pulsado un hueco de la pantalla de inicio > Widgets > GrowFolio.</li></ol>
    <div class="fila-btns" style="justify-content:flex-start"><a class="btn peq pri" href="${esc(apk)}">Descargar la app de Android</a>${tok && android ? `<a class="btn peq" href="intent://token#Intent;scheme=inversiones;package=es.inversiones.app;S.t=${encodeURIComponent(tok)};S.browser_fallback_url=${encodeURIComponent(apk)};end">Pasar el token a la app</a>` : ''}</div>` : ''}`;
}
/* Carteras de antes (0.1) que no llegaron a la cuenta. Al crear la cuenta se sube la del dispositivo donde la
   creas; pero si usabas GrowFolio en más sitios (el móvil y el ordenador, cada uno con su copia) o la copia de
   ese dispositivo era más vieja que la de GitHub, lo de los otros no estaba. Al abrir la cartera en cada
   dispositivo se mira su copia de antes (y la de GitHub, la del dueño de la web) y, si tiene compras, ventas o
   posiciones que no están en tu cuenta, se ofrece añadir lo que falta o usar esa copia.
   Solo se abre sin preguntar si es de la misma contraseña que tu cuenta; si no, pide la contraseña de esa
   copia: así nadie que entre en este dispositivo con otra cuenta puede quedarse con la cartera de otro. */
function difCarteras(vieja, cuenta) {
  const k = (p) => p.instrumento + '|' + p.plataforma;
  const ids = new Set((cuenta.movimientos || []).map((m) => m.id)), pos = new Map((cuenta.posiciones || []).map((p) => [k(p), p]));
  return {
    movs: (vieja.movimientos || []).filter((m) => m.id && !ids.has(m.id)),
    nuevas: (vieja.posiciones || []).filter((p) => !pos.has(k(p))),
    distintas: (vieja.posiciones || []).filter((p) => pos.has(k(p)) && Math.abs((+p.cantidad || 0) - (+pos.get(k(p)).cantidad || 0)) > 1e-6),
  };
}
async function revisarCarteraVieja(forzar) {
  if (!PERFIL_CUENTA || !S.cartera || !S.key || !S.salt) return;
  if (forzar) { LS.del('inv-gh-rev2'); LS.del('inv-disp-rev2'); }
  if (!forzar && document.querySelector('.hoja-fondo, #asesorFondo, .tour, .estreno, .bloqueo')) { setTimeout(revisarCarteraVieja, 4000); return; }
  const mia = b64.enc(S.salt);
  // 1) la de GitHub (solo la del dueño: se abre con su clave)
  if (!LS.get('inv-gh-rev2')) {
    let f = null; try { f = await GH.leer('cartera.enc.json'); } catch (e) { f = undefined; }
    if (f !== undefined) {
      let v = null; try { if (f && JSON.parse(f.texto).salt === mia) v = await descifrar(f.texto, S.key); } catch (e) {}
      if (v && hayDif(difCarteras(v, S.cartera))) return ofrecerCopia(v, 'github');
      if (!v && f && forzar) return pedirPassCopia(f.texto, 'github');
      LS.set('inv-gh-rev2', true);
    }
  }
  // 2) la de este dispositivo
  if (LS.get('inv-disp-rev2')) return;
  // la de este dispositivo en la 0.1 (inv-local-enc); la copia en caché de GitHub (inv-cache-enc) solo si es de tu
  // misma contraseña: en el móvil de un amigo esa copia es la del dueño de la web, y no hay que preguntarle por ella
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const sal = (t) => { try { return JSON.parse(t).salt; } catch (e) { return null; } };
  const local = leer('inv-local-enc'), cache = leer('inv-cache-enc');
  const texto = local || (cache && sal(cache) === mia ? cache : null);
  if (!texto || (S.enc && texto === S.enc.texto)) { LS.set('inv-disp-rev2', true); return; }
  let f; try { f = JSON.parse(texto); } catch (e) { LS.set('inv-disp-rev2', true); return; }
  if (f.salt === mia) { let v = null; try { v = await descifrar(texto, S.key); } catch (e) {} if (v && hayDif(difCarteras(v, S.cartera))) return ofrecerCopia(v, 'dispositivo'); LS.set('inv-disp-rev2', true); return; }
  // otra contraseña: se pregunta antes de abrirla
  return pedirPassCopia(texto, 'dispositivo');
}
function pedirPassCopia(texto, fuente) {
  const f = JSON.parse(texto), marca = fuente === 'github' ? 'inv-gh-rev2' : 'inv-disp-rev2';
  const h = hoja(fuente === 'github' ? 'Tu cartera de GitHub' : 'Hay otra cartera en este dispositivo', `<form class="cv" id="fCv" novalidate>
    <p>${fuente === 'github' ? 'La copia de la cartera que había en GitHub (la de la 0.1) usa otra contraseña que la de tu cuenta. Si es tuya, escríbela para ver qué tiene que no esté en tu cuenta.' : 'Este dispositivo tiene una cartera de antes de la 0.2 que no se ha subido a tu cuenta. Si es tuya y la usabas aquí, puede tener cosas que no están en tu cuenta.'}</p>
    <label class="campo">Contraseña de esa cartera<input type="password" id="cvPass" autocomplete="current-password"><small>${fuente === 'github' ? 'La que usabas antes de tener cuenta.' : 'La que usabas en este dispositivo antes de tener cuenta.'}</small></label>
    <div class="error" id="errCv"></div>
    <div class="fila-btns"><button type="button" class="btn" data-no>No es mía o no hace falta</button><button type="submit" class="btn pri">Revisarla</button></div>
  </form>`, () => LS.set(marca, true));
  $('[data-no]', h.el).onclick = () => h.cerrar();
  $('#fCv', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const pw = $('#cvPass', h.el).value; if (!pw) return;
    const b = $('#fCv .btn.pri', h.el); b.disabled = true; b.textContent = 'Comprobando…';
    try {
      const key = await derivarClave(pw, b64.dec(f.salt), f.iter || 600000), v = await descifrar(texto, key);
      h.cerrar(true);
      if (hayDif(difCarteras(v, S.cartera))) ofrecerCopia(v, fuente);
      else { LS.set(marca, true); toast('Esa cartera no tiene nada que no esté ya en tu cuenta', 5000); }
    } catch (e) { b.disabled = false; b.textContent = 'Revisarla'; $('#errCv', h.el).textContent = 'Esa contraseña no abre esa cartera.'; }
  };
}
const hayDif = (d) => d.movs.length || d.nuevas.length || d.distintas.length;
function ofrecerCopia(vieja, fuente) {
  const d = difCarteras(vieja, S.cartera), marca = fuente === 'github' ? 'inv-gh-rev2' : 'inv-disp-rev2';
  const n = (id) => esc(nombreInst(id));
  const li = [
    ...d.movs.slice(-8).map((m) => `<li>${m.tipo === 'venta' ? 'Venta' : 'Compra'} de ${n(m.instrumento)}, ${esc(fechaCorta(m.fecha))}</li>`),
    ...d.nuevas.slice(0, 8).map((p) => `<li>${n(p.instrumento)} en ${esc(p.plataforma || '')}${p.cantidad != null ? `: ${fmtNum(p.cantidad, 4)}` : ''}</li>`),
    ...d.distintas.slice(0, 8).map((p) => `<li>${n(p.instrumento)} en ${esc(p.plataforma || '')}: ${fmtNum(p.cantidad, 4)} en esta copia</li>`),
  ].join('');
  const h = hoja('Tu cartera de antes tiene más', `<div class="cv">
    <p>${fuente === 'github' ? 'La copia de tu cartera que había en GitHub (la de la 0.1)' : 'La cartera que usabas en este dispositivo antes de la 0.2'} tiene cosas que no están en tu cuenta:</p>
    <ul class="cv-l">${li}</ul>
    <p class="nota"><b>Añadir lo que falta</b> suma a tu cuenta esas compras, ventas y posiciones sin tocar lo que ya tienes. <b>Usar esta copia</b> deja tu cuenta igual que ella (con tu nombre y tu perfil de ahora): mejor si esta es la más reciente. Lo que hay ahora en tu cuenta se guarda aparte en este dispositivo.</p>
    <div class="fila-btns cv-btns"><button type="button" class="btn" data-no>Dejar mi cuenta como está</button><button type="button" class="btn" data-anadir>Añadir lo que falta</button><button type="button" class="btn pri" data-usar>Usar esta copia</button></div>
  </div>`, () => LS.set(marca, true));
  $('[data-no]', h.el).onclick = () => h.cerrar();
  const aplicar = async (nueva, aviso) => {
    LS.set('inv-cuenta-descartada', { texto: S.enc && S.enc.texto, cuando: new Date().toISOString(), por: fuente });
    S.cartera = { ...nueva, kit: S.cartera.kit }; sumarInstPropios();
    h.cerrar(true); LS.set(marca, true); LS.set('inv-aviso-rec-ok', true);
    await guardarCartera(fuente === 'github' ? 'Traer la cartera de GitHub' : 'Traer la cartera de este dispositivo'); pintar();
    toast(aviso, 6000);
    setTimeout(revisarCarteraVieja, 1500);
  };
  $('[data-usar]', h.el).onclick = () => aplicar({ ...vieja, perfil: { ...(vieja.perfil || {}), ...(S.cartera.perfil || {}) } }, 'Tu cuenta tiene ya esa copia, con tu nombre y tu perfil de ahora');
  $('[data-anadir]', h.el).onclick = () => {
    const c = JSON.parse(JSON.stringify(S.cartera)), kp = (p) => p.instrumento + '|' + p.plataforma;
    c.movimientos = [...(c.movimientos || []), ...d.movs];
    c.posiciones = [...(c.posiciones || []), ...d.nuevas.map((p) => ({ ...p, id: (c.posiciones || []).some((x) => x.id === p.id) ? nuevoId('p-') : p.id }))];
    const pl = new Set((c.efectivo || []).map((e) => e.plataforma)); c.efectivo = [...(c.efectivo || []), ...(vieja.efectivo || []).filter((e) => !pl.has(e.plataforma))];
    const ka = (a) => a.instrumento + '|' + a.plataforma + '|' + a.dia, ap = new Set((c.aportaciones || []).map(ka)); c.aportaciones = [...(c.aportaciones || []), ...(vieja.aportaciones || []).filter((a) => !ap.has(ka(a)))];
    const ip = new Set((c.inst_propios || []).map((i) => i.id)); c.inst_propios = [...(c.inst_propios || []), ...(vieja.inst_propios || []).filter((i) => !ip.has(i.id))];
    void kp;
    aplicar(c, 'Añadido a tu cuenta lo que faltaba');
  };
}
/* cómo quieres que te llame GrowFolio: va en tu perfil cifrado (el mismo en todos tus dispositivos) */
function cambiarNombre() {
  if (S.demo) { toast(L('Es la cartera de prueba: el nombre no se cambia.', "It's the demo portfolio: the name isn't changed.")); return; }
  const h = hoja('Tu nombre', `<form id="fNom" novalidate>
    <label class="campo">Cómo quieres que te llame<input name="nombre" maxlength="40" autocomplete="given-name" value="${esc(nombreUsuario())}" placeholder="Tu nombre"></label>
    <p class="nota" style="margin:0">Para saludarte al entrar. Es el mismo en el móvil, en el ordenador y en la app.</p>
    <div class="error" id="errNom"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
  </form>`);
  const i = $('[name=nombre]', h.el); setTimeout(() => { i.focus(); i.select(); }, 60);
  $('#fNom', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const n = i.value.trim().slice(0, 40);
    if (!n) { $('#errNom', h.el).textContent = 'Escribe un nombre.'; return; }
    LS.set('inv-nombre', n);
    try { if (FB.user) await FB.au.updateProfile(FB.user, { displayName: n }); } catch (e) {}
    h.cerrar(true);
    if (S.cartera) { S.cartera.perfil = { ...(S.cartera.perfil || {}), nombre: n }; await guardarCartera('Nombre'); pintar(); }
    toast(`${trad('Ahora te llamo')} ${n}`, 3500);
  };
}
function abrirAjustes() {
  if (S.demo) return ajustesDemo();
  const tok = GH.token();
  const h = hoja('Ajustes', `
    <div class="aj-cab"><img src="favicon.svg" alt=""><div><img class="aj-nom" src="growfolio-nombre.svg" alt="GrowFolio"><small>Versión ${VERSION} alfa, ${PERFIL_CUENTA ? 'con la cartera guardada en tu cuenta' : PERFIL_LOCAL ? 'con la cartera guardada en este dispositivo' : 'con la cartera guardada en GitHub'}</small></div><button class="btn peq" id="aNov" data-cerrar>${ICONOS.chispa}Novedades</button></div>
    ${PERFIL_CUENTA ? `<h2 class="aj-grupo">Tu cuenta</h2><div class="aj-caja">
      <div class="seccion-ed"><h3>${ICONOS.perfil}${esc(nombreUsuario() || 'Tu cuenta')}</h3><p class="nota" style="margin:0">${FB.user && FB.user.email ? `${esc(FB.user.email)}, ` : ''}${FB.user && (FB.user.providerData || []).some((x) => x.providerId === 'google.com') ? 'con Google' : 'con correo y contraseña'}. Tu cartera se guarda cifrada en tu cuenta y se sincroniza sola entre tus dispositivos.</p>
      <div class="fila-btns" style="justify-content:flex-start"><button class="btn peq" id="aNombre">${ICONOS.perfil}Cambiar nombre</button><button class="btn peq" id="aSalir">Cerrar sesión</button></div></div>
      <div id="aOpis"></div>
      <div id="aAcceso"></div>
</div>`
    : `<h2 class="aj-grupo">Tu cuenta</h2><div class="aj-caja"><button class="aj-fila" id="aCuenta">${ICONOS.perfil}<span><b>Guarda tu cartera en una cuenta</b><small>Con Google o con tu correo: la tendrás en el móvil, en el ordenador y en la app, cifrada igual que ahora.</small></span><i class="aj-flecha" aria-hidden="true"></i></button></div>`}
    <h2 class="aj-grupo">General</h2>
    <div class="aj-caja">
      <div class="seccion-ed aj-idioma"><h3>${ICONOS.mercados}Idioma</h3>${selectorIdioma()}<small>${IDIOMA === 'en' ? 'English is still in progress: some texts are in Spanish.' : 'El inglés está en pruebas: parte de los textos siguen en español.'}</small></div>
      <button class="aj-fila" id="aTour" data-cerrar>${ICONOS.ruta}<span><b>Ver el tutorial</b><small>Un repaso de un minuto por cada pestaña.</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
      <button class="aj-fila" id="aOrdenar" data-cerrar>${ICONOS.cartera}<span><b>Inicio a tu gusto</b><small>Ordena, quita y añade lo que sale en Inicio.</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
      <button class="aj-fila" id="aDemo" data-cerrar>${ICONOS.ojo}<span><b>${L('Enseñar la app con una cartera de prueba', 'Show the app with a demo portfolio')}</b><small>${L('Para enseñársela a alguien sin que vea lo tuyo: una cartera inventada. La tuya ni se abre; al salir te pide tu PIN o tu contraseña.', "To show it to someone without them seeing yours: a made-up portfolio. Yours isn't even opened; when you exit it asks for your PIN or password.")}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
      <button class="aj-fila" id="aIntro" data-cerrar><img src="favicon.svg" alt=""><span><b>Ver la presentación</b><small>Qué es GrowFolio y qué puedes hacer con él.</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
    </div>
    ${PERFIL_LOCAL && !PERFIL_CUENTA ? `<h2 class="aj-grupo">Tu cartera</h2><div class="aj-caja"><div class="seccion-ed"><h3>${ICONOS.cartera}Guardada en este dispositivo</h3>
      <p class="nota" style="margin:0">Cifrada con tu contraseña. Si borras los datos del navegador o desinstalas la app, se pierde: descarga una copia de vez en cuando (en Avanzado, Copias).</p>
      <div class="fila-btns" style="justify-content:flex-start"><button class="btn peq" id="aPerfil">Abrir la cartera de GitHub</button></div></div></div>` : ''}
    <h2 class="aj-grupo">Seguridad</h2>
    <div class="aj-caja">
    ${htmlAjustesBloqueo()}
    ${conKit() ? `<button class="aj-fila" id="aKit">${ICONOS.candado}<span><b>${L('Código de recuperación', 'Recovery code')}</b><small>${!S.kv ? L('Créalo: con él recuperas la cartera si olvidas su contraseña.', 'Create it: it gets your portfolio back if you forget its password.') : S.cartera && S.cartera.kit && S.cartera.kit.guardado ? L(`Guardado el ${esc(fechaLarga(S.cartera.kit.guardado.slice(0, 10)))}. Por si olvidas la contraseña de tu cartera.`, `Saved on ${esc(S.cartera.kit.guardado.slice(0, 10))}. In case you forget your portfolio password.`) : L('Sin guardar todavía: con él recuperas la cartera si olvidas su contraseña.', 'Not saved yet: it gets your portfolio back if you forget its password.')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>` : ''}
    ${conKit() ? `<button class="aj-fila" id="aCopia">${ICONOS.descargar || ICONOS.cartera}<span><b>${L('Copia de seguridad', 'Backup')}</b><small>${L('Tu cartera en un archivo cifrado, para guardarla donde quieras y cargarla si algún día hace falta.', 'Your portfolio in an encrypted file, to keep wherever you like and load it if you ever need to.')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>` : ''}
    <details class="seccion-ed aj-plegable"><summary><h3>${ICONOS.candado}${L('Cambiar la contraseña de tu cartera', 'Change your portfolio password')}</h3><i class="aj-flecha" aria-hidden="true"></i></summary>
      <form id="fCambiarPw" novalidate>
      <input type="text" name="username" value="${esc(PERFIL_CUENTA && FB.user && FB.user.email ? FB.user.email + ' (cartera)' : '')}" autocomplete="username" hidden>
      <label class="campo">${L('Contraseña de ahora', 'Current password')}<input type="password" id="aP0" autocomplete="current-password">${S.kv ? `<small>${L('¿No la recuerdas? Escribe aquí tu código de recuperación.', "Don't remember it? Type your recovery code here.")}</small>` : ''}</label>
      <div class="form-grid"><label class="campo">Nueva contraseña<input type="password" id="aP1" autocomplete="new-password"></label><label class="campo">Repítela<input type="password" id="aP2" autocomplete="new-password"></label></div>
      <div class="fila-btns" style="justify-content:flex-start"><button type="submit" class="btn peq" id="aCambiar">Cambiar contraseña</button></div>
      </form>
    </details>
    <div class="seccion-ed"><h3>${ICONOS.perfil}Este dispositivo</h3>
      <p class="nota" style="margin:0">${cfgBloqueo() ? 'Bloquear te pedirá el PIN o la huella ahora mismo.' : 'Bloquear te pedirá la contraseña la próxima vez.'} ${PERFIL_CUENTA ? 'Olvidar cierra la sesión y borra de aquí la clave y la copia: tu cartera sigue en tu cuenta.' : PERFIL_LOCAL ? 'Olvidar borra tu cartera de este dispositivo: descarga antes una copia.' : 'Olvidar borra también el token y la copia local.'}</p>
      <div class="fila-btns" style="justify-content:flex-start"><button class="btn peq" id="aBloq">${ICONOS.candado.replace('<svg', '<svg width="15" height="15" style="vertical-align:-2px;margin-right:6px"')}Bloquear</button><button class="btn peq peligro" id="aOlvidar">Olvidar este dispositivo</button></div>
    </div>
    </div>
    <h2 class="aj-grupo" data-no-trad>${conIA('GrowIA y la app', 'GrowIA and the app')}</h2>
    <div class="aj-caja">
      <button class="aj-fila" data-accion="asesor-ajustes" data-cerrar>${ICONOS.growia}<span><b data-no-trad>${conIA('Ajustes de GrowIA', 'GrowIA settings')}</b><small>Gratis con una clave tuya de Google: responde a lo que le preguntes y revisa tu cartera cada día.</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
      <div class="seccion-ed"><h3>${ICONOS.cartera}App de Android con widget</h3><div id="aApp"><p class="nota" style="margin:0">Mirando la última versión…</p></div></div>
    </div>
    <h2 class="aj-grupo">Avisos y resumen</h2>
    <div class="aj-caja">
      <button class="aj-fila" id="aResumen" data-cerrar>${ICONOS.agenda}<span><b>El resumen de hoy</b><small>Cómo va tu cartera, lo que mueve los mercados y las noticias de lo tuyo.</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
      <label class="aj-fila aj-check"><input type="checkbox" id="aResumenAuto"${LS.get('inv-resumen-off', false) ? '' : ' checked'}><span><b>Enseñarme el resumen al abrir</b><small>La primera vez que abres GrowFolio cada día, desde las 6 de la mañana.</small></span></label>
      <div class="seccion-ed" id="aAvisos">${htmlAjAvisos()}</div>
    </div>
    <h2 class="aj-grupo">Ayuda</h2>
    <div class="aj-caja">
      <button class="aj-fila" data-accion="opinion" data-cerrar>${ICONOS.globo}<span><b>Avisar de un fallo o una idea</b><small>Algo que se ve mal, que no funciona o una idea: llega a quien hace GrowFolio.</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
      <button class="aj-fila" id="aInvita">${ICONOS.enviar}<span><b>Invita a alguien</b><small>Le llega por WhatsApp el enlace y los pasos para empezar, con su propia cuenta: su cartera va cifrada y nadie más la ve, ni tú.</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
    </div>
    <details class="aj-avanzado"><summary>Avanzado: copias y archivos${PERFIL_LOCAL ? '' : ', GitHub'}</summary>
    <div class="seccion-ed"><h3>Copias</h3>
      <p class="nota" style="margin:0">La copia sin cifrar contiene todas tus cantidades: guárdala solo en tu ordenador.</p>
      <div class="fila-btns" style="justify-content:flex-start"><button class="btn peq" id="aExp">Descargar copia sin cifrar</button><label class="btn peq" style="display:inline-flex;align-items:center">Importar copia o JSON<input type="file" id="aImp" accept=".json,application/json" hidden></label><button class="btn peq" id="aEjemplo">Ejemplo de JSON</button></div>
      <p class="nota" style="margin:0">El JSON puede llevar el ISIN, el ticker o el nombre de cada cosa con su cantidad, lo que pagaste (o el precio medio), el bróker y la fecha: GrowFolio busca cada valor solo.</p>
    </div>
    <div class="seccion-ed" style="display:grid;gap:12px"${PERFIL_LOCAL ? ' hidden' : ''}><h3>GitHub</h3>
      <div class="campo">Repositorio<div style="color:var(--text)">${esc(CFG.owner)}/${esc(CFG.repo)}</div></div>
      <label class="campo">Token de GitHub<input type="password" id="aTok" value="${esc(tok || '')}" autocomplete="off" placeholder="github_pat_…"><small>Token "fine-grained" con permiso <b>Contents: Read and write</b> solo para este repositorio. Se guarda en este navegador.</small></label>
      <div class="fila-btns" style="justify-content:flex-start"><button class="btn peq" id="aProbar">Guardar y probar</button><button class="btn peq" id="aQR"${tok ? '' : ' disabled'}>Vincular el móvil</button></div>
      <div id="aQRbox"></div>
    </div>
    </details>`);
  pintarAjustesApp($('#aApp', h.el));
  const recargarBloq = () => { const x = $('#ajBloqueo', h.el); if (!x || !h.el.isConnected) return; x.outerHTML = htmlAjustesBloqueo(); enlazarAjustesBloqueo(h.el, recargarBloq); };
  enlazarAjustesBloqueo(h.el, recargarBloq);
  $('#aNov', h.el).onclick = () => setTimeout(() => mostrarNovedades(null), 0);
  for (const b of $$('#aTour, #aTour2', h.el)) b.onclick = () => setTimeout(() => iniciarTour(0), 0);
  $('#aIntro', h.el).onclick = () => setTimeout(() => pantallaIntro(() => { montar(); pintar(); }), 0);
  $('#aDemo', h.el).onclick = () => setTimeout(() => entrarDemo(), 0);
  $('#aResumen', h.el).onclick = () => setTimeout(() => resumenDelDia(() => {}, true), 0);
  $('#aResumenAuto', h.el).onchange = (e) => LS.set('inv-resumen-off', !e.target.checked);
  enlazarAjAvisos($('#aAvisos', h.el));
  $('#aOrdenar', h.el).onclick = () => setTimeout(() => { if (S.vista !== 'cartera') location.hash = '#cartera'; setTimeout(abrirCarEdit, 120); }, 0);
  $('#aInvita', h.el).onclick = () => {
    const url = (CFG.dev ? CFG.pages : location.origin + location.pathname) + '#mia';
    const t = `Te paso GrowFolio, para llevar todas tus inversiones en un sitio (fondos, acciones, ETF, oro y cripto de cualquier bróker), con lo que toca hacer cada mes y lo que supone en la renta.\n\n${url}\n\nEntra con Google o con tu correo y la app te guía paso a paso: en unos minutos tienes tu cartera lista. Tus cifras van cifradas con una contraseña tuya: nadie más las ve.\n\nEs una alfa: si algo falla, dale al bichito de arriba.`;
    const a = document.createElement('a'); a.href = 'https://wa.me/?text=' + encodeURIComponent(t); a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  };
  if ($('#aPerfil', h.el)) $('#aPerfil', h.el).onclick = () => cambiarPerfil(false);
  $('#aProbar', h.el).onclick = async () => {
    const t = $('#aTok', h.el).value.trim();
    if (t) LS.set('inv-token', t); else LS.del('inv-token');
    if (!t) { toast('Token borrado'); return; }
    try { const r = await GH.probar(); toast('Token correcto: puede escribir en ' + r); $('#aQR', h.el).disabled = false; }
    catch (e) { toast(e.message, 6000); }
  };
  $('#aQR', h.el).onclick = async () => {
    const url = CFG.pages + '#t=' + encodeURIComponent(GH.token() || '');
    const box = $('#aQRbox', h.el);
    box.innerHTML = '<div class="vacio">Generando…</div>';
    try {
      if (!window.qrcode) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
      box.innerHTML = `<div class="qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div><p class="nota" style="text-align:center">Escanéalo con el móvil: abrirá GrowFolio con el token ya puesto. La contraseña te la pedirá igual. No compartas esta imagen.</p>`;
    } catch (e) { box.innerHTML = '<div class="vacio">No se pudo cargar el generador de QR.</div>'; }
  };
  $('#fCambiarPw', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const ahora = $('#aP0', h.el).value, a = $('#aP1', h.el).value, b = $('#aP2', h.el).value;
    const limpiar = () => { for (const id of ['#aP0', '#aP1', '#aP2']) $(id, h.el).value = ''; };
    // 0.7d: siempre con la contraseña de ahora (o el código): con la cartera abierta en un dispositivo no basta
    if (!ahora) { toast(L('Escribe primero la contraseña de ahora de tu cartera', 'First type your current portfolio password')); $('#aP0', h.el).focus(); return; }
    if (a.length < 8) return toast('La contraseña necesita al menos 8 caracteres');
    if (a !== b) return toast('Las contraseñas no coinciden');
    const bt = $('#aCambiar', h.el); bt.disabled = true;
    // el sobre con el que se comprueba: si mientras tanto llega otro (otro dispositivo cambió la cartera), no se toca nada
    let kid0 = S.kv && S.kv.kid;
    try {
      let raw = S.kv ? await claveConActual(ahora) : null;
      if (S.kv ? !raw : !(await esContrasenaV1(ahora))) {
        toast(S.kv ? L('Esa no es la contraseña de tu cartera ni tu código de recuperación.', "That isn't your portfolio password or your recovery code.") : L('Esa no es la contraseña de tu cartera.', "That isn't your portfolio password."), 5000);
        $('#aP0', h.el).select(); return;
      }
      // 0.5: una cartera aún en el formato 1 pasa antes al 2 (con la contraseña de ahora y la transacción de siempre); si no
      // se puede (sin conexión), no se cambia nada
      if (!conKit()) {
        // sin código de recuperación (la cartera de GitHub, solo para pruebas): como hasta la 0.4, se vuelve a cifrar con la nueva
        const vieja = S.key, salt = crypto.getRandomValues(new Uint8Array(16)), iter = S.iter || 600000, kek = await derivarClave(a, salt, iter);
        if (!vieja || S.key !== vieja) return;
        S.key = kek; S.kek = kek; S.salt = salt; S.iter = iter; S.kv = null;
        await recifrarLocales(vieja, kek); if (await IDB.get(IDB_CLAVE)) await recordarClave();
        await guardarCartera('Cambiar contraseña'); limpiar();
        return;
      }
      if (!S.kv) { await pasarAV2(true); kid0 = S.kv && S.kv.kid; raw = await claveConActual(ahora); }
      if (!confirmadoV2()) return toast(L('Ahora no se puede cambiar la contraseña: hace falta conexión. Prueba en un momento.', "The password can't be changed right now: it needs a connection. Try again in a moment."), 6000);
      // solo cambia el cierre de la contraseña: la cartera y los otros dispositivos siguen con la misma clave de datos
      if (!raw) return toast(L('No se ha podido cambiar la contraseña. Vuelve a intentarlo.', "The password couldn't be changed. Try again."), 5000);
      const cambiada = () => toast(L('Tu cartera acaba de cambiar en otro dispositivo. Vuelve a intentarlo.', 'Your portfolio just changed on another device. Try again.'), 5000);
      if (!S.kv || S.kv.kid !== kid0) return cambiada();
      const kid = kid0, salt = crypto.getRandomValues(new Uint8Array(16)), iter = S.iter || 600000, kek = await derivarClave(a, salt, iter);
      const pass = await cierreDe(kek, raw, salt, iter, (+S.kv.k.pass.n || 0) + 1);
      // lo de la sesión se lee después de cerrar (con el PBKDF2 por medio pudo llegar otro sobre); otra clave de datos: no se toca
      if (!S.kv || S.kv.kid !== kid) return cambiada();
      S.kv = { kid, k: { ...S.kv.k, pass } }; S.salt = salt; S.iter = iter; S.kek = kek;
      await guardarCartera('Cambiar contraseña');
      limpiar();
    } finally { bt.disabled = false; $('#aP0', h.el).value = ''; }
  };
  if ($('#aKit', h.el)) $('#aKit', h.el).onclick = () => { h.cerrar(true); verKit(); };
  if ($('#aCopia', h.el)) $('#aCopia', h.el).onclick = () => { h.cerrar(true); copiaSeguridad(); };
  // la copia sin cifrar va sin el código de recuperación (ese abre la cartera de tu cuenta)
  $('#aExp', h.el).onclick = () => { const { kit, ...resto } = S.cartera; descargar(`cartera-${hoyIso()}.json`, JSON.stringify(resto, null, 2)); };
  $('#aEjemplo', h.el).onclick = () => descargar('cartera-ejemplo.json', JSON.stringify(EJEMPLO_CARTERA, null, 2));
  $('#aImp', h.el).onchange = async (ev) => {
    let r;
    try { r = normalizarCartera(JSON.parse(await ev.target.files[0].text())); }
    catch (e) { toast(`Ese archivo no parece una cartera: ${e instanceof SyntaxError ? 'el JSON tiene un error de formato' : e.message || 'falta la lista "posiciones"'}`, 6000); ev.target.value = ''; return; }
    ev.target.value = '';
    if (!confirm(`¿Sustituir tu cartera por la del archivo? ${resumenImport(r)}`)) return;
    S.cartera = { ...r.cartera, kit: S.cartera.kit }; sumarInstPropios(); await guardarCartera('Importar copia'); h.cerrar(); pintar();
    cargarHistCatalogo().then((x) => { if (x) pintar(); });
    toast(resumenImport(r), 6000);
  };
  $('#aBloq', h.el).onclick = async () => {
    if (cfgBloqueo()) { LS.del('inv-bloqueo-t'); h.cerrar(); return pantallaBloqueo(() => {}, () => { S.cartera = null; S.key = null; pantallaDesbloqueo(); }); }
    await IDB.del(IDB_CLAVE); cerrarAsesor(); olvidarAsesor(); S.iaPropio = null; S.key = null; S.cartera = null; S.kitAbierto = null; S.kitSesion = null; S.puente = null; h.cerrar(); pantallaDesbloqueo(); };
  if ($('#aSalir', h.el)) $('#aSalir', h.el).onclick = () => cerrarSesion();
  filaOpiniones(h);   // solo sale si eres el dueño (las reglas no dejan leerlas a nadie más)
  filaAcceso(h);
  if ($('#aNombre', h.el)) $('#aNombre', h.el).onclick = () => { h.cerrar(true); cambiarNombre(); };
  if ($('#aVieja', h.el)) $('#aVieja', h.el).onclick = async () => { h.cerrar(true); const antes = document.querySelectorAll('.hoja').length; await revisarCarteraVieja(true); setTimeout(() => { if (document.querySelectorAll('.hoja').length <= antes) toast('No hay ninguna cartera de antes con cosas que falten en tu cuenta', 5000); }, 2500); };
  if ($('#aCuenta', h.el)) $('#aCuenta', h.el).onclick = () => cambiarPerfil('cuenta');
  $('#aOlvidar', h.el).onclick = async () => {
    if (PERFIL_CUENTA) { if (confirm('¿Cerrar la sesión y borrar de este dispositivo la clave y la copia? Tu cartera sigue en tu cuenta.')) cerrarSesion(); return; }
    if (!confirm(PERFIL_LOCAL ? '¿Borrar tu cartera de este dispositivo? Sin una copia descargada no se puede recuperar.' : '¿Borrar la clave, el token y las copias locales de este navegador?')) return;
    await IDB.del(IDB_CLAVE);
    guardarBloqueo(null); LS.del('inv-bloqueo-t');
    if (PERFIL_LOCAL) { LS.del('inv-local-enc'); LS.del('inv-perfil'); }
    for (const k of ['inv-token', 'inv-cache-enc', 'inv-pend-enc', 'inv-cache-precios', 'inv-cache-inst', 'inv-dev-enc', 'inv-cache-radar', 'inv-asesor-clave', 'inv-asesor-clave-g', 'inv-asesor-conv', 'inv-ia-propio', 'inv-dev-ia-enc']) LS.del(k);
    location.reload();
  };
}

