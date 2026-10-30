/* =====================================================================
   App de Android: si hay versión nueva, aviso grande con un botón que la baja y la instala encima.
   Las apps hasta la compilación 7 no saben instalar solas: a esas se les abre la descarga en Chrome.
   ===================================================================== */
const versionApp = () => { try { return window.InversionesApp.version(); } catch (e) { return 0; } };
const nombreApp = () => { try { const n = window.InversionesApp.nombreVersion(); if (n) return `${L('versión', 'version')} ${n}`; } catch (e) {} return L('versión anterior a la 0.1.10', 'version older than 0.1.10'); };
const nombreUlt = (ult) => (ult && ult.nombre ? `${L('versión', 'version')} ${ult.nombre}` : L('versión nueva', 'new version'));
async function ultimaApp() {
  try { const r = await fetch(GH.raw('app.json', 'main') + '?v=' + Date.now(), { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (e) {}
  return null;
}
let appRevisadaT = 0, appLuego = null, appEnCurso = false;
async function revisarApp(forzar) {
  if (!window.InversionesApp) return false;
  appRevisadaT = Date.now(); appEnCurso = true;
  let ult = null;
  try { ult = await ultimaApp(); } finally { appEnCurso = false; }
  if (!ult || !(ult.version > versionApp())) return false;
  // "Luego" vale hasta la próxima vez que abras la app
  if (!forzar && appLuego === ult.version) return true;
  if (document.querySelector('.hoja-act')) return true;
  avisoApp(ult);
  return true;
}
function avisoApp(ult, ya) {
  const app = window.InversionesApp;
  const sola = app && typeof app.actualizar === 'function';
  const nueva = nombreUlt(ult);
  for (const x of $$('.hoja-act')) x.remove();
  const h = hoja(L('Actualiza la app', 'Update the app'), `<div class="act-app">
    ${dibujo('app')}
    <p>${L(`Hay una <b>${esc(nueva)}</b> (tienes la ${esc(nombreApp())}). Se instala encima en unos segundos y no pierdes nada: ni la cartera, ni la contraseña, ni el widget.`, `There's a <b>${esc(nueva)}</b> (you have ${esc(nombreApp())}). It installs over this one in a few seconds and you lose nothing: not your portfolio, your password or the widget.`)}</p>
    <div class="act-prog" hidden><div class="act-barra"><i></i></div><small></small></div>
    <div class="fila-btns"><button class="btn" data-luego>${L('Luego', 'Later')}</button>${sola ? `<button class="btn pri" data-act>${L('Actualizar ahora', 'Update now')}</button>` : `<a class="btn pri" href="${esc(ult.apk)}" data-cerrar>${L('Descargar la actualización', 'Download the update')}</a>`}</div>
    <p class="nota act-nota">${sola ? L('Se baja aquí mismo. Al acabar, Android te enseña su ventana: toca Instalar. La primera vez te pide además permiso para instalar desde GrowFolio.', 'It downloads right here. When it finishes, Android shows its window: tap Install. The first time it also asks for permission to install from GrowFolio.') : L('Se abre en Chrome: cuando acabe de bajar, ábrela e instálala encima. Desde esa versión, la app se actualiza sola.', 'It opens in Chrome: when it finishes, open it and install it over this one. From that version on, the app updates itself.')}</p>
  </div>`, () => { appLuego = ult.version; });
  h.el.classList.add('hoja-act');
  $('[data-luego]', h.el).onclick = () => h.cerrar();
  const b = $('[data-act]', h.el); if (!b) return;
  const prog = $('.act-prog', h.el), bar = $('.act-barra i', h.el), txt = $('.act-prog small', h.el);
  const bajar = () => {
    b.disabled = true; b.textContent = L('Bajando…', 'Downloading…'); prog.hidden = false; bar.style.width = '0%'; txt.textContent = L('Empezando a bajar la versión nueva…', 'Starting the download…');
    try { app.actualizar(ult.apk); } catch (e) { window.progresoApp(-1, e.message); }
  };
  window.progresoApp = (pct, estado) => {
    if (!h.el.isConnected) return;
    if (pct < 0) {
      txt.innerHTML = L(`No se ha podido bajar${estado ? ` (${esc(estado)})` : ''}. Mira la conexión y prueba otra vez, o <a href="${esc(ult.apk)}">bájala con Chrome</a>.`, `Couldn't download it${estado ? ` (${esc(estado)})` : ''}. Check your connection and try again, or <a href="${esc(ult.apk)}">get it with Chrome</a>.`);
      b.disabled = false; b.textContent = L('Reintentar', 'Try again'); b.onclick = bajar; return;
    }
    bar.style.width = Math.min(100, pct) + '%';
    if (estado === 'permiso') { txt.textContent = L('Falta un permiso: en la pantalla que se ha abierto, activa «Permitir de esta fuente» y vuelve con la flecha de atrás. Luego toca Instalar.', 'One permission missing: on the screen that opened, turn on «Allow from this source» and go back. Then tap Install.'); b.disabled = false; b.textContent = L('Instalar', 'Install'); b.onclick = () => app.instalar(); }
    else if (estado === 'instalar') { txt.textContent = L('Bajada. Toca Instalar en la ventana de Android (si no la ves, toca Instalar aquí).', 'Downloaded. Tap Install in the Android window (if you don\'t see it, tap Install here).'); b.disabled = false; b.textContent = L('Instalar', 'Install'); b.onclick = () => app.instalar(); }
    else txt.textContent = L(`Bajando la versión nueva… ${pct} %`, `Downloading the new version… ${pct}%`);
  };
  b.onclick = bajar;
  // desde «Actualizar» en el aviso del móvil: sin tocar nada más, empieza a bajar
  if (ya) bajar();
}
/* lo que llama la app al tocar «Actualizar» en su aviso: el aviso de aquí, ya bajando (o, si ya la tienes, que lo diga) */
window.actualizarAppYa = async () => {
  const ult = await ultimaApp();
  if (ult && ult.version > versionApp()) avisoApp(ult, true);
  else toast(L('Ya tienes la última versión de la app.', 'You already have the latest version of the app.'), 4000);
};


/* 0.7f: mientras GrowIA contesta, la app de Android se queda viva en segundo plano (un servicio con su notificación
   discreta) y, si no la estás mirando cuando acaba, te avisa. Sin él, Android congela la app al poco de salir y se corta
   la conexión con Google. Las apps de antes no tienen growiaEmpieza: con ellas no hace nada.
   Con dos cosas a la vez (una pregunta y la revisión de la cartera), el servicio sigue hasta que acaba la última */
const GROWIA_APP = { n: 0 };
const puenteGrowia = (m) => { const a = window.InversionesApp; return a && typeof a[m] === 'function' ? a : null; };
// la app se queda viva en segundo plano mientras GrowIA trabaja (solo se puede empezar con GrowFolio a la vista)
const appSigueEnFondo = () => !!puenteGrowia('growiaEmpieza');
function appGrowiaEmpieza(nueva = true) {
  if (nueva) GROWIA_APP.n++;
  const a = puenteGrowia('growiaEmpieza');
  if (!a || document.hidden) return;
  try { a.growiaEmpieza(L('GrowIA está contestando…', 'GrowIA is answering…')); } catch (e) {}
}
// pausa: se ha cortado y GrowIA espera a que vuelvas (se cierra el servicio, pero la tarea sigue pendiente)
function appGrowiaTermina(titulo = '', texto = '', pausa = false) {
  if (!pausa) { GROWIA_APP.n = Math.max(0, GROWIA_APP.n - 1); if (GROWIA_APP.n) return; }
  const a = puenteGrowia('growiaTermina');
  if (!a) return;
  try { a.growiaTermina(titulo, texto); } catch (e) {}
}
