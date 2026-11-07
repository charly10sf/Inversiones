/* 0.8.3: cuánto tarda en abrir, por partes (Carlos, 6 nov: la app cerrada del todo tardaba unos 10 s). Al pintar Inicio
   se apunta una línea en el registro de Ajustes de GrowIA, con la hora de cada paso desde que empezó (en la app, desde que
   arrancó el proceso; en el navegador, desde que se pidió la página) y lo que más tardó de la red. Los últimos 10, también
   en inv-arranques. Solo tiempos y nombres de archivo: nada de la cartera. Funciones y no const: 05 y 02 las llaman antes */
function marcaArr(k, nota) {
  const m = marcaArr.t || (marcaArr.t = {});
  if (!(k in m)) m[k] = { t: performance.now(), nota };
}
function apuntarArranque(fin) {
  const m = marcaArr.t || {};
  // solo cuando entra sola (con la clave recordada): si escribes la contraseña, lo que tardas tú no es del arranque
  if (marcaArr.hecho || !m.js || !m.clave) return;
  marcaArr.hecho = true;
  try {
    let app = null; try { app = JSON.parse(deApp('arranqueApp') || 'null'); } catch (e) {}
    // en la app, todo desde que arrancó el proceso (si es de esta vez: en frío); si no, desde que se pidió la página
    const frio = !!(app && app.proceso && app.crear && app.crear - app.proceso < 15000 && app.crear <= performance.timeOrigin + 1000);
    const base = frio ? app.proceso : app && app.crear && app.crear <= performance.timeOrigin + 1000 ? app.crear : performance.timeOrigin;
    const des = performance.timeOrigin - base, s = (ms) => (Math.max(0, ms) / 1000).toFixed(1).replace('.', ',');
    const partes = [];
    if (app && app.crear) {
      if (frio) partes.push(`Android ${s(app.crear - base)}`);
      if (app.cargar) partes.push(`WebView ${s(app.cargar - base)}`);
    }
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (nav) partes.push(`página ${s(des + nav.responseStart)}${nav.responseStart - (nav.workerStart || nav.fetchStart) > 2800 ? ' (copia tras 3 s)' : ''}`);
    const nombres = { js: 'JS', inst: 'instrumentos', precios: 'precios', datos: 'histórico y radar', firebase: 'Firebase', cuenta: 'cuenta', ia: 'IA', listo: 'todo cargado', entrada: 'logo', clave: 'clave', pin: 'PIN', inicio: 'Inicio' };
    const orden = Object.keys(m).sort((a, b) => m[a].t - m[b].t);
    for (const k of orden) partes.push(`${nombres[k] || k} ${s(des + m[k].t)}${m[k].nota ? ` (${m[k].nota})` : ''}`);
    // lo que más tardó de la red hasta pintar Inicio (los tres más largos)
    const lentos = (performance.getEntriesByType ? performance.getEntriesByType('resource') : [])
      .filter((r) => r.startTime < m[fin].t).sort((a, b) => b.duration - a.duration).slice(0, 3)
      .map((r) => { let n = r.name; try { const u = new URL(r.name); n = u.hostname.split('.').slice(-2, -1)[0] + ':' + (u.pathname.split('/').pop() || u.pathname); } catch (e) {} return `${n} ${s(r.duration)}`; });
    const pin = m.pin && m.inicio ? m.inicio.t - m.pin.t : 0;
    const total = des + m[fin].t - pin;
    const linea = `Arranque ${s(total)} s${frio ? ' en frío' : app ? ' (app ya abierta)' : ''}${pin ? ` sin contar ${s(pin)} s del PIN` : ''} · ${partes.join(' · ')}${lentos.length ? ' · lo más lento: ' + lentos.join(', ') : ''}${redIA()}`;
    // el registro guarda 200 letras por línea: se parte por los «·»
    let trozo = '';
    for (const p of linea.split(' · ')) { if (trozo && (trozo + ' · ' + p).length > 195) { diarioIA(trozo); trozo = '… ' + p; } else trozo = trozo ? trozo + ' · ' + p : p; }
    if (trozo) diarioIA(trozo);
    const v = LS.get('inv-arranques', []); (Array.isArray(v) ? v : []).push({ t: Date.now(), x: linea }); LS.set('inv-arranques', (Array.isArray(v) ? v : []).slice(-10));
  } catch (e) { console.warn('arranque', e); }
}
async function iniciar() {
  marcaArr('js');
  // 0.6d: en la cartera de prueba, lo que se escriba en el dispositivo se queda en memoria desde el primer momento
  const demo = demoActiva();
  if (demo) LS_DEMO = new Map();
  cargarIdioma();
  try { if (sessionStorage.getItem('toison-cuenta-borrada')) { sessionStorage.removeItem('toison-cuenta-borrada'); setTimeout(() => toast(trad('Tu cuenta y tu cartera se han borrado de Toisón y de este dispositivo.'), 7000), 900); } } catch (e) {}
  if (bancoALaApp()) return;
  // el enlace del estreno de Toisón (#toison, 0.7n) ya no abre nada: se quita de la dirección
  if (location.hash === '#toison') try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
  try { if (window.InversionesApp && typeof InversionesApp.versionVista === 'function') InversionesApp.versionVista(VERSION); } catch (e) {}
  try { if (window.InversionesApp && typeof InversionesApp.idioma === 'function') InversionesApp.idioma(IDIOMA); } catch (e) {}
  // quien llega nuevo ve la presentación general, no la de la 0.2; quien venía de la 0.1, se apunta
  if (!LS.get('inv-version', null)) LS.set('inv-estreno-02b', true);
  else if (cmpVer(LS.get('inv-version'), '0.2.0') < 0 || localStorage.getItem('inv-local-enc') || localStorage.getItem('inv-cache-enc')) LS.set('inv-vino-01', true);
  // en la app de Android, lo primero de todo: ¿hay versión nueva de la app?
  if (window.InversionesApp) setTimeout(() => revisarApp(), 900);
  $('#app').innerHTML = '';
  const t0 = mostrarEntrada();
  try {
    const [, , enc, iaRem] = await Promise.all([cargarInstrumentos().then(() => marcaArr('inst')), cargarPrecios().then(() => { marcaArr('precios'); return Promise.all([cargarHistorico(), cargarIntradia(), cargarRadar(), cargarInforme(), escaneoDeCache(), cargarCatalogo()]); }).then(() => { marcaArr('datos'); return escaneoLuego(); }), demo ? null : cargarCifrada(), demo ? null : leerAnalisisRemoto().then((x) => { marcaArr('ia'); return x; })]);
    S.enc = enc; S.iaRemoto = iaRem || S.iaCuenta || null;
    // 0.6: cuándo está todo lo de arrancar (lo mide la prueba de rendimiento)
    try { performance.mark('gf-listo'); } catch (e) {}
    marcaArr('listo');
  } catch (e) {
    console.error(e);
    quitarEntrada();
    $('#app').innerHTML = `<div class="pantalla"><div class="caja"><h1>No se pudo cargar</h1><p>${esc(e.message)}</p><button class="btn pri" onclick="location.reload()">Reintentar</button></div></div>`;
    return;
  }
  await esperarEntrada(t0);
  marcaArr('entrada');
  // en la prueba, ni se lee ni se abre tu cartera: la inventada y adentro
  if (demo) { await arrancarDemo(); quitarEntrada(); return; }
  await entrar();
  quitarEntrada();
}
/* ---------- la entrada (0.8, paso 4): el símbolo de Toisón, que aparece con la luz del diseño, y TOISÓN letra a letra
   (solo opacity y transform). Sale mientras carga todo; dura lo que la animación o hasta que la tocas, y se funde con lo
   que venga. 0.6: entera, la primera vez de cada día en cada dispositivo; las demás, corta (dentro en cuanto ha cargado) */
const FIN_ENTRADA = 1900, FIN_CORTA = 750;
const saludoHora = () => { const h = new Date().getHours(); return h >= 6 && h < 14 ? L('Buenos días', 'Good morning') : h >= 14 && h < 21 ? L('Buenas tardes', 'Good afternoon') : L('Buenas noches', 'Good evening'); };
function mostrarEntrada() {
  const quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const corta = !quieto && LS.get('inv-entrada-dia', '') === hoyIso();
  if (!quieto && !corta) LS.set('inv-entrada-dia', hoyIso());
  const n = nombreUsuario(), d = document.createElement('div');
  d.className = 'entrada entrada-ts' + (quieto ? ' quieta' : corta ? ' corta' : ''); d.id = 'entrada'; d.setAttribute('role', 'status'); d.setAttribute('aria-label', 'Toisón');
  d.innerHTML = `<div class="en-c"><span class="ets-simb">${simboloTs()}</span><b class="ets-nom" aria-hidden="true">${[...'TOISÓN'].map((c, k) => `<span style="--k:${k}">${c}</span>`).join('')}</b><p class="en-saludo">${esc(saludoHora())}${n ? `, <b>${esc(n)}</b>` : ''}</p><div class="en-barra" aria-hidden="true"><i></i></div></div>`;
  document.body.appendChild(d);
  const t0 = { t: performance.now(), min: quieto ? 0 : corta ? FIN_CORTA : FIN_ENTRADA, saltar: null };
  d.addEventListener('click', () => { d.classList.add('quieta'); t0.min = 0; if (t0.saltar) t0.saltar(); });
  return t0;
}
const esperarEntrada = (t0) => new Promise((r) => { t0.saltar = r; setTimeout(r, Math.max(0, t0.min - (performance.now() - t0.t))); });
function quitarEntrada() {
  const d = $('#entrada'); if (!d || d.classList.contains('fuera')) return;
  d.classList.add('fuera'); setTimeout(() => d.remove(), 650);
}
/* después de cargar: la cuenta (si toca), crear la cartera o abrirla con la clave guardada */
async function entrar() {
  if (PERFIL_CUENTA && !FB.user && !S.cuentaSinRed) {
    const visto = LS.get('inv-version', null);
    if (visto && !LS.get('inv-estreno-02b')) return estreno02(visto, () => pantallaCuenta());
    // la primera vez en este dispositivo, la presentación antes de entrar
    if (!LS.get('inv-intro2', false)) return pantallaIntro(() => pantallaCuenta());
    return pantallaCuenta();
  }
  // la primera vez en este dispositivo, antes de crear la cartera o entrar, la presentación
  // la presentación nueva (0.2.1, la que se cuenta bajando): una vez a todos, también a quien ya vio la de antes
  const intro = !LS.get('inv-intro2', false);
  // no se pudo leer la cuenta y aquí no hay copia: nunca se da por vacía
  if (!S.enc && PERFIL_CUENTA && (S.cuentaSinRed || !S.cuentaLeida)) return pantallaSinCuenta();
  if (!S.enc && PERFIL_CUENTA) { S.cuentaNueva = true; if (intro) return void pantallaIntro(bienvenidaCuenta); return bienvenidaCuenta(); }
  if (!S.enc) { if (intro) return void pantallaIntro(pantallaCrear); return pantallaCrear(); }
  try {
    // 0.6d: al volver de la cartera de prueba, sin PIN puesto se pide la contraseña (con PIN, ya se pide el PIN)
    const trasPrueba = LS.get('inv-demo-salida', false) && !(cfgBloqueo() && cfgBloqueo().pin);
    const r = trasPrueba ? null : await claveRecordada(S.enc.texto, await IDB.get(IDB_CLAVE));
    if (r) {
      r.cartera = await descifrar(S.enc.texto, r.key);
      if (r.adoptada) { await recifrarLocales(r.kek, r.key); fijarSesion(r); await recordarClave(); } else fijarSesion(r);
      marcaArr('clave');
      // con PIN o huella puestos, una vez cada 72 h los pide antes de enseñar nada
      const seguir = () => (necesitaBloqueo() ? (marcaArr('pin'), pantallaBloqueo(arrancar, () => { S.cartera = null; S.key = null; pantallaDesbloqueo(); })) : arrancar());
      // también a quien ya entra solo: la presentación, una vez en cada dispositivo
      if (intro) return void pantallaIntro(seguir); return seguir();
    }
  } catch (e) { console.warn('La clave guardada no sirve', e); }
  if (intro) pantallaIntro(() => pantallaDesbloqueo()); else pantallaDesbloqueo();
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'inv-actualizada') avisoWebNueva();
    // al tocar un aviso con GrowFolio ya abierto: a lo que dice, sin recargar
    if (e.data && e.data.type === 'inv-ir' && /^#[a-z]+$/.test(e.data.hash || '')) location.hash = e.data.hash;
  });
}
/* 0.3.11d: el proyecto pasa de llamarse Inversiones a GrowFolio (también la dirección: charly10sf.github.io/GrowFolio/).
   Desde la dirección vieja, en cuanto la nueva existe, se salta a ella con lo mismo detrás (#cartera…). Tus datos del
   navegador siguen ahí: es el mismo sitio. La copia guardada de la vieja se borra para que no se quede anclada. Dentro
   de la app de Android no: la app nueva cambia sola y la de antes no sabe abrir la dirección nueva (hay que actualizarla) */
(async () => {
  try {
    if (!/\.github\.io$/.test(location.hostname) || !/^\/inversiones(\/|$)/i.test(location.pathname)) return;
    const r = await fetch('/GrowFolio/version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    if (window.InversionesApp) {
      if (typeof window.InversionesApp.repo !== 'function') setTimeout(() => toast(L('Toisón ha cambiado de dirección: actualiza la app de Android (Ajustes > App de Android) para seguir al día.', 'Toisón has moved: update the Android app (Settings > Android app) to stay up to date.'), 9000), 2500);
      return;
    }
    if (navigator.serviceWorker) for (const rg of await navigator.serviceWorker.getRegistrations()) if (/\/inversiones\//i.test(rg.scope)) await rg.unregister();
    location.replace('/GrowFolio/' + location.search + location.hash);
  } catch (e) { /* sin red: a la próxima */ }
})();
iniciar();
/* cuántas visitas tiene GrowFolio (el número, el país y si es móvil u ordenador): Cloudflare Web Analytics, sin cookies y sin
   nada tuyo ni de tu cartera. Solo en la web publicada (las pruebas no cuentan) y cuando el enlace ya no lleva el token */
if (location.hostname === 'charly10sf.github.io' && !/[#&]t=/.test(location.hash)) {
  setTimeout(() => {
    try {
      const sc = document.createElement('script');
      sc.defer = true; sc.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      sc.setAttribute('data-cf-beacon', '{"token": "5bd37d4ab757416a8dfbf5a56f505c23"}');
      document.body.appendChild(sc);
    } catch (e) { /* sin estadística: no pasa nada */ }
  }, 1500);
}
