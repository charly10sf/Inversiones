/* =====================================================================
   Primeros pasos (0.3.8): lo que tiene que hacer quien acaba de llegar, en orden y con lo que tarda cada cosa, para
   que nadie necesite instrucciones por WhatsApp. Sale arriba en Inicio hasta que lo termina (o lo quita); el paso que
   toca va abierto, con su botón; los demás, en una línea. Al crear la cartera, una hoja de bienvenida los enseña.
   ===================================================================== */
const enElMovil = () => !!window.InversionesApp || COMO_APP || LS.get('inv-movil-ok', false);
function itemsEmpezar() {
  const android = /Android/i.test(navigator.userAgent);
  return [
    { k: 'tengo', ok: ((S.cartera && S.cartera.posiciones) || []).length > 0, t: 'Mete lo que tienes', min: '2-5 min', b: 'Añadir',
      x: `Busca cada fondo, acción o cripto por su nombre, su ticker o su ISIN (sale en tu bróker) y pon cuántas tienes y a qué precio medio. O hazlo de golpe <button type="button" class="enlace" data-emp="importar">${esc(trad('con capturas de tu bróker'))}</button>.` },
    { k: 'perfil', ok: !perfilIncompleto(), t: 'Cuéntale quién eres', min: '1 min', b: 'Contestar', x: 'Tu edad, para cuándo quieres el dinero y cuánto riesgo aguantas. Con eso, los consejos son para ti y no para cualquiera.' },
    { k: 'clave', ok: hayClaveIA(), t: 'Activa GrowIA, gratis', min: '2 min', b: 'Activar', x: 'La IA de GrowFolio lee las noticias, revisa tu cartera cada día y contesta lo que le preguntes. Necesita una clave gratuita de Google: al abrirlo te dice cómo sacarla, en tres pasos.' },
    { k: 'movil', ok: enElMovil(), t: ES_IOS ? 'Ponla en tu pantalla de inicio' : 'Llévala en el móvil', min: '1 min', b: 'Ver cómo',
      x: ES_IOS ? 'En el iPhone se instala desde Safari y se abre como una app, a pantalla completa.' : android ? 'Instala la app de Android: con widget en la pantalla de inicio y avisos cuando algo se mueve.' : 'Abre GrowFolio en el móvil con tu misma cuenta: tu cartera está en los dos sitios.' },
    { k: 'aporta', ok: ((S.cartera && S.cartera.aportaciones) || []).length > 0 || LS.get('inv-aporto-no', false), opcional: true, t: '¿Aportas cada mes?', min: '1 min', b: 'Apuntar', x: 'Apunta lo que metes cada mes y en qué: GrowFolio lo suma solo a tu cartera y lo tiene en cuenta en la proyección.', no: 'No aporto' },
  ];
}
// la lista: lo hecho, tachado en verde; el paso que toca, abierto con su botón; lo que viene, en una línea
function htmlListaEmpezar() {
  const it = itemsEmpezar(), prim = it.findIndex((x) => !x.ok);
  return `<ol class="empezar-l">${it.map((x, i) => {
    const toca = i === prim, estado = x.ok ? 'ok' : toca ? 'ahora' : 'luego';
    return `<li class="${estado}"><span class="emp-n" aria-hidden="true">${x.ok ? ICONOS.ok : i + 1}</span><span class="emp-t"><b>${esc(x.t)}${x.opcional ? ` <em>${esc(trad('opcional'))}</em>` : ''}</b>${x.ok ? `<small>${esc(trad('Hecho'))}</small>` : toca ? `<small>${x.k === 'tengo' ? x.x : esc(x.x)}</small><small class="emp-min">${esc(x.min)}</small>` : `<small class="emp-min">${esc(x.min)}</small>`}</span>${x.ok ? '' : `<span class="emp-b">${toca && x.no ? `<button type="button" class="btn peq" data-emp="${x.k}-no">${esc(x.no)}</button>` : ''}<button type="button" class="btn peq${toca ? ' pri' : ''}" data-emp="${x.k}">${esc(x.b)}</button></span>`}</li>`;
  }).join('')}</ol>`;
}
function htmlEmpezar() {
  if (!S.cartera || LS.get('inv-empezar-no', false)) return '';
  const it = itemsEmpezar(), hechas = it.filter((x) => x.ok).length, tengo = it.find((x) => x.k === 'tengo');
  const desde = LS.get('inv-empezar', 0);
  // a quien ya usaba GrowFolio antes de los primeros pasos no se le enseñan: solo a quien llega (o aún no ha metido nada)
  if (tengo.ok && !(desde && Date.now() - desde < 30 * 864e5)) return '';
  if (hechas === it.length) {
    if (LS.get('inv-empezar-fin', false)) return '';
    return `<section class="empezar listo" aria-labelledby="hEmpezar"><div class="empezar-cab"><span class="emp-listo" aria-hidden="true">${ICONOS.ok}</span><h2 id="hEmpezar">${esc(trad('Tu cartera está lista'))}</h2><button type="button" class="ib" data-emp="fin" aria-label="${L('Cerrar', 'Close')}">${ICONOS.cerrar}</button></div>
      <p class="emp-fin">${esc(esPublico() ? L('A partir de ahora GrowIA revisa tu cartera cada día con las noticias y te explica lo que pasa. Y antes de vender, ves lo que pagarías en la renta.', 'From now on GrowIA reviews your portfolio every day with the news and explains what is going on. And before selling, you see what you would pay in tax.') : trad('A partir de ahora, Paso a paso te dice qué toca cada mes (comprar, vender, aportar) y cuánto supone en la renta, y GrowIA lo revisa cada día con las noticias.'))}</p>
      <div class="fila-btns" style="justify-content:flex-start"><a class="btn peq pri" href="${esPublico() ? '#analisis' : '#ruta'}" data-emp="fin">${esc(esPublico() ? L('Ver tu análisis', 'See your analysis') : trad('Ver Paso a paso'))}</a></div></section>`;
  }
  return `<section class="empezar" aria-labelledby="hEmpezar"><div class="empezar-cab"><h2 id="hEmpezar">${esc(trad('Primeros pasos'))}</h2><span class="k">${hechas} ${esc(trad('de'))} ${it.length}</span><button type="button" class="ib" data-emp="no" aria-label="${L('Quitar', 'Remove')}" title="${L('Quitar (lo tienes en Ajustes, en el tutorial)', 'Remove (the tutorial in Settings has it too)')}">${ICONOS.cerrar}</button></div>
    <div class="emp-barra" aria-hidden="true"><i style="width:${Math.round((hechas / it.length) * 100)}%"></i></div>${htmlListaEmpezar()}</section>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-emp]'); if (!b) return;
  const a = b.dataset.emp;
  if (a === 'no') { LS.set('inv-empezar-no', true); pintar(); toast(L('Quitado. El tutorial sigue en Ajustes', 'Removed. The tutorial is still in Settings'), 3000); return; }
  if (a === 'fin') { LS.set('inv-empezar-fin', true); if (b.tagName !== 'A') pintar(); return; }
  if (a === 'aporta-no') { LS.set('inv-aporto-no', true); pintar(); return; }
  if (TOURE) cerrarTour(true, true);
  document.querySelectorAll('.hoja-fondo').forEach((x) => { if (x.querySelector('.guia')) x.remove(); });
  if (a === 'perfil') perfilGuiado();
  else if (a === 'tengo') operacion('tengo');
  else if (a === 'importar') importarCapturas();
  else if (a === 'clave') abrirAsesor();
  else if (a === 'movil') abrirEnMovil();
  else if (a === 'aporta') { if (!(S.cartera.posiciones || []).length) { toast(L('Primero mete lo que tienes: la aportación va a uno de tus fondos', 'First add what you own: the contribution goes into one of your funds'), 4000); operacion('tengo'); } else editarAportacion(null); }
});
/* la hoja de bienvenida, al crear la cartera: los pasos de un vistazo y por dónde empezar */
function guiaPrimerosPasos(despues = () => {}) {
  const it = itemsEmpezar(), nom = nombreUsuario();
  const h = hoja(trad('Primeros pasos'), `<div class="guia">
    <div class="guia-cab">${logoEntero()}<h2>${esc(nom ? L(`Hola, ${nom}. Tu cartera, lista en unos minutos`, `Hi, ${nom}. Your portfolio, ready in a few minutes`) : L('Tu cartera, lista en unos minutos', 'Your portfolio, ready in a few minutes'))}</h2>
      <p>${esc(trad('Son estos pasos (el último, solo si aportas cada mes). Los tienes arriba en Inicio hasta que acabes, así que puedes dejarlo a medias y seguir otro día.'))}</p></div>
    <ol class="guia-l">${it.map((x, i) => `<li class="${x.ok ? 'ok' : ''}"><span class="emp-n" aria-hidden="true">${x.ok ? ICONOS.ok : i + 1}</span><span><b>${esc(x.t)}${x.opcional ? ` <em>${esc(trad('opcional'))}</em>` : ''}</b><small>${esc(x.min)}</small></span></li>`).join('')}</ol>
    <div class="guia-btns"><button type="button" class="btn pri" data-guia="tengo">${esc(trad('Empezar: meter lo que tengo'))}</button><button type="button" class="btn" data-guia="tour">${esc(trad('Antes, enséñame la app (1 min)'))}</button></div>
    <button type="button" class="enlace guia-luego" data-cerrar>${esc(trad('Más tarde'))}</button>
  </div>`, () => despues(), true);
  h.el.classList.add('hoja-guia');
  h.el.querySelector('[data-guia="tengo"]').onclick = () => { h.cerrar(true); operacion('tengo'); };
  h.el.querySelector('[data-guia="tour"]').onclick = () => { h.cerrar(true); iniciarTour(0, despues); };
}
/* llevarla en el móvil: la app de Android, la pantalla de inicio del iPhone o, desde el ordenador, la dirección y su QR */
async function abrirEnMovil() {
  const android = /Android/i.test(navigator.userAgent), app = !!window.InversionesApp;
  const url = CFG.dev ? CFG.pages : location.origin + location.pathname;
  let apk = `https://github.com/${CFG.owner}/${CFG.repo}/releases/download/app/growfolio.apk`;
  let cuerpo, ya = app || COMO_APP;
  if (ya) cuerpo = `<p>${esc(app ? trad('Ya estás en la app de Android. Para el widget: mantén pulsado un hueco de la pantalla de inicio > Widgets > GrowFolio y arrastra «Tu cartera».') : trad('Ya la tienes en la pantalla de inicio: se abre como una app.'))}</p>`;
  else if (ES_IOS) cuerpo = `<p>${esc(trad('En el iPhone, GrowFolio funciona como una app sin pasar por la App Store: a pantalla completa, con su icono y sin las barras de Safari.'))}</p>${htmlPasosIOS()}`;
  else if (android) cuerpo = `<p>${esc(trad('La app de Android tiene un widget para la pantalla de inicio (tu patrimonio y lo de hoy, sin abrir nada) y te avisa cuando algo se mueve o sale una versión nueva.'))}</p>
    <ol class="as-pasos-clave"><li>${esc(trad('Toca «Descargar la app».'))}</li><li>${esc(trad('Abre el archivo que se descarga. La primera vez, Android te pide permiso para instalar apps de Chrome: toca Configuración, activa «Permitir de esta fuente» y vuelve atrás.'))}</li><li>${esc(trad('Ábrela y entra con tu cuenta y la contraseña de tu cartera.'))}</li></ol>
    <a class="btn pri movil-apk" id="bApk" href="${esc(apk)}">${ICONOS.descargar || ''}${esc(trad('Descargar la app'))}</a>`;
  else cuerpo = `<p>${esc(trad('Abre esta dirección en el móvil y entra con tu misma cuenta: tu cartera se ve igual en los dos.'))}</p>
    <div class="movil-url"><code>${esc(url)}</code><button type="button" class="btn peq" id="bCopiarUrl">${esc(trad('Copiar'))}</button></div>
    <div class="movil-qr" id="qrMovil"></div>
    <p class="nota" style="margin:0" id="qrNota">${esc(trad('O escanea el código con la cámara del móvil. Desde ahí, en Android puedes instalar la app (con widget) y en iPhone ponerla en la pantalla de inicio.'))}</p>`;
  // 0.3.9: con la cartera solo en este dispositivo, en el móvil no aparecería: primero hay que pasarla a una cuenta
  const soloAqui = PERFIL_LOCAL && !PERFIL_CUENTA && !ya;
  if (soloAqui) cuerpo = `<div class="aviso-cuenta"><p><b>${esc(trad('Tu cartera ahora solo está en este dispositivo.'))}</b> ${esc(trad('Para verla también en el móvil, pásala antes a una cuenta: sigue cifrada con tu contraseña.'))}</p><button type="button" class="btn pri" id="bMovilCuenta">${esc(trad('Pasar mi cartera a una cuenta'))}</button></div>` + cuerpo;
  const h = hoja(trad(ES_IOS ? 'Ponla en tu pantalla de inicio' : 'Llévala en el móvil'), `<div class="movil">${dibujo('movil')}${cuerpo}
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${esc(trad('Cerrar'))}</button>${ya ? '' : `<button type="button" class="btn${android || ES_IOS ? '' : ' pri'}" id="bMovilOk">${esc(trad('Ya la tengo'))}</button>`}</div></div>`);
  const bc = $('#bMovilCuenta', h.el); if (bc) bc.onclick = () => { h.cerrar(true); cambiarPerfil('cuenta'); };
  const ok = $('#bMovilOk', h.el); if (ok) ok.onclick = () => { LS.set('inv-movil-ok', true); h.cerrar(true); pintar(); toast(trad('Hecho: ya la tienes en el móvil'), 2500); };
  if (ya && !LS.get('inv-movil-ok', false)) { LS.set('inv-movil-ok', true); }
  const cp = $('#bCopiarUrl', h.el); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(url); toast(trad('Dirección copiada'), 2000); } catch (e) { toast(url, 5000); } };
  // la versión publicada de la app (app.json) y el QR, sin hacer esperar a que se abra la hoja
  if (android && !ya) { try { const r = await fetch(GH.raw('app.json', 'main') + '?v=' + Date.now(), { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (j && j.apk) { const a = $('#bApk', h.el); if (a) a.href = j.apk; } } } catch (e) {} }
  const box = $('#qrMovil', h.el);
  if (box) {
    try {
      if (!window.qrcode) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
      const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch (e) { box.remove(); const n = $('#qrNota', h.el); if (n) n.textContent = trad('Desde ahí, en Android puedes instalar la app (con widget) y en iPhone ponerla en la pantalla de inicio.'); }
  }
}

let TOURE = null;
const elVisible = (sel) => { if (!sel) return null; for (const el of document.querySelectorAll(sel)) { const r = el.getBoundingClientRect(); if (r.width && r.height) return el; } return null; };
/* «Más» en la barra del móvil: Calendario, Mercados, Fiscalidad y Objetivos en tarjetas (Ajustes está arriba, en la rueda) */
function abrirMas() {
  const h = hoja('Más', `<div class="mas-g">${EN_MAS.map(([k, x]) => { const v = VISTAS.find(([kk]) => kk === k); const falta = k === 'futuro' && perfilIncompleto(); return `<a class="mas-t${S.vista === k ? ' on' : ''}${falta ? ' falta' : ''}" href="#${k}" data-cerrar>${ICONOS[k]}<span><b>${esc(v[1])}${falta ? '<em class="mas-falta">Te falta tu perfil</em>' : ''}</b><small>${esc(x)}</small></span></a>`; }).join('')}</div>`);
  h.el.classList.add('hoja-mas');
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-mas]')) abrirMas(); });

