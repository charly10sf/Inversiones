/* =====================================================================
   Lo nuevo de cada versión, a la vista. El botón de la barra de la sección donde está lo más importante lleva «Nuevo»
   y late hasta que lo ves de verdad (un rato en pantalla), y un globo encima ofrece la guía: te lleva, paso a paso, a
   cada sitio donde ha cambiado algo. La guía también está arriba en las novedades y en Ajustes.
   ===================================================================== */
/* Solo las versiones con novedades (0.4, 0.5…) tienen guía, «Nuevo» en la barra y presentación. Las de letra (0.4a,
   0.4b…) son arreglos: se suman a su versión y se avisan con un mensaje corto. La guía es la de la versión de número
   en la que estás (en la 0.4b, la de la 0.4) y sale hasta que la haces o ves lo nuevo */
const esParche = (v) => /[a-z]$/.test(String(v || ''));
const baseVer = (v) => String(v || '').replace(/[a-z]+$/, '');
/* Tres niveles desde la 0.8.2 (regla de Carlos del 4 nov; claude/cerrar-version.md): gorda (dos números: 0.9, 1.0), con
   presentación de lo nuevo bajando, guía y «Nuevo» en la barra; intermedia (tres números: 0.8.2, 0.9.1), con una hoja
   corta al abrirla y sin guía ni «Nuevo»; y letra (0.9a, 0.9.1b), los arreglos de siempre. Antes de la 0.8.2 toda versión
   sin letra contaba como de número (la 0.3.11 o la 0.8.1 tuvieron su guía), así que siguen siendo gordas. La guía es la
   de la gorda en la que estás: en la 0.9.1b, la de la 0.9 */
const NIVELES_DESDE = '0.8.2';
const esGorda = (v) => !esParche(v) && (/^\d+\.\d+$/.test(String(v || '')) || cmpVer(v, NIVELES_DESDE) < 0);
const esIntermedia = (v) => !esParche(v) && !esGorda(v);
// la gorda de una versión: sus dos primeros números (0.9.1a → 0.9), salvo en la 0.8, donde la última gorda es la 0.8.1
// (0.8.2 → 0.8.1). Lo de antes de la 0.8.2 sin letra ya es gorda
function gordaDe(v) {
  const b = baseVer(v), dos = b.replace(/^(\d+\.\d+).*$/, '$1');
  if (esGorda(b)) return b;
  return dos === '0.8' ? '0.8.1' : dos;
}
const GUIA_ID = () => gordaDe(VERSION);
// qué se enseña al abrir una versión que no habías visto: sus arreglos (misma versión de número: de la 0.9 a la 0.9a), la
// hoja corta (una intermedia sin haberte saltado ninguna gorda: de la 0.9 a la 0.9.1) o lo nuevo contado bajando (el resto)
function caminoNovedades(visto, v = VERSION) {
  if (!visto) return 'gorda';
  if (cmpVer(visto, v) >= 0) return null;
  if (baseVer(visto) === baseVer(v)) return 'letra';
  if (esIntermedia(baseVer(v)) && gordaDe(visto) === gordaDe(v)) return 'corta';
  return 'gorda';
}
/* Novedades para todos o solo para el dueño (0.8a; lo pidió Carlos el 3 nov): a los demás solo les sale lo que de verdad
   es nuevo para ellos. Una cosa con «solo: 'dueno'», o un arreglo escrito como { t: '…', solo: 'dueno' }, lo ve el dueño
   y nadie más. Una versión de letra que se queda sin nada para ti no sale (ni su mensaje corto ni en el historial).
   El dueño se sabe al comprobar el acceso (comprobarAcceso, 42-modos.js) y se recuerda en el dispositivo (inv-dueno)
   para que la próxima vez no haya que esperar. Todo lo que enseña novedades lee novVisibles(), no NOVEDADES */
const veDueno = () => !!S.esDueno || (!S.noDueno && !!LS.get('inv-dueno', 0));
const soloDueno = (x) => !!x && typeof x === 'object' && x.solo === 'dueno';
function novVisibles() {
  const yo = veDueno(), vale = (x) => yo || !soloDueno(x);
  return NOVEDADES.map((n) => {
    const cosas = n.cosas && n.cosas.filter(vale), arreglos = n.arreglos && n.arreglos.filter(vale).map((a) => (typeof a === 'string' ? a : a.t));
    return { ...n, cosas: cosas && cosas.length ? cosas : undefined, arreglos: arreglos && arreglos.length ? arreglos : undefined };
  }).filter((n) => !esParche(n.v) || n.cosas || n.arreglos);
}
// la versión de número en la que estás (la del aviso de Inicio) y la gorda de la que es la guía
const novBase = () => { const ns = novVisibles(); return ns.find((n) => n.v === baseVer(VERSION)) || ns.find((n) => !esParche(n.v)) || ns[0]; };
const novGorda = () => { const ns = novVisibles(); return ns.find((n) => n.v === GUIA_ID()) || ns.find((n) => esGorda(n.v)) || ns[0]; };
// los pasos de la guía de una novedad: «ir» puede ser uno o varios (cada uno con su título y su texto si los trae)
const pasosDeCosa = (c, v) => (Array.isArray(c.ir) ? c.ir : [c.ir]).map((ir) => ({ t: c.t, x: c.g || c.x, dib: c.d, ...ir, nuevo: v }));
const pasosGuia = (ns = [novGorda()]) => ns.filter((n) => n && esGorda(n.v)).flatMap((n) => (n.cosas || []).filter((c) => c.ir).flatMap((c) => pasosDeCosa(c, n.v)));
// la versión cuyas novedades has visto: con un arreglo de la misma versión se queda el día en que la viste
function marcarNovVista() {
  const pv = LS.get('inv-nov-vista') || {};
  if (pv.v !== VERSION) LS.set('inv-nov-vista', { v: VERSION, d: pv.d && baseVer(pv.v) === baseVer(VERSION) ? pv.d : hoyIso() });
}
function guiaNuevo(alAcabar, pasos = pasosGuia()) {
  if (!pasos.length) return;
  LS.set('inv-guia-globo', GUIA_ID());
  quitarGloboNuevo();
  iniciarTour(0, () => { LS.set('inv-guia', GUIA_ID()); pintarNavNuevo(); if (alAcabar) alAcabar(); }, pasos);
}
// la sección con «Nuevo»: la de la primera novedad con sitio, mientras no la hayas visto, y solo si ya usabas GrowFolio
// antes de esta versión (a quien acaba de llegar le sobra: para eso tiene el tutorial)
// 0.8 (paso 5p): encendida, con la guía de la 0.8 (la de las novedades: de GrowFolio a Toisón y dónde quedó cada cosa)
const GUIA_NUEVO = true;
function grupoNuevo() {
  if (!GUIA_NUEVO) return null;
  if (LS.get('inv-guia', '') === GUIA_ID() || gordaDe((LS.get('inv-nov-vista') || {}).v) !== GUIA_ID()) return null;
  const ps = pasosGuia(), p = ps.find((x) => x.nav) || ps[0];
  return p ? grupoDe(p.v).k : null;
}
function pintarNavNuevo() {
  const k = grupoNuevo();
  for (const a of $$('.nav [data-ir], .navbar [data-ir], .riel [data-ir]')) {
    const on = a.dataset.ir === k;
    a.classList.toggle('nuevo', on);
    if (on) { a.dataset.nuevo = L('Nuevo', 'New'); a.setAttribute('aria-label', `${a.textContent.trim()} (${L('hay algo nuevo', 'something new')})`); }
    else if (a.dataset.nuevo != null) { delete a.dataset.nuevo; a.removeAttribute('aria-label'); }
  }
  if (k && grupoDe(S.vista).k === k && S.navego) { vigilarNuevo(); quitarGloboNuevo(); }
}
// estando en esa sección: cuando lo nuevo lleva un segundo y medio en pantalla, ya está visto
function vigilarNuevo() {
  if (S.nuevoT) return;
  let visto = 0;
  S.nuevoT = setInterval(() => {
    const k = grupoNuevo();
    if (!k || grupoDe(S.vista).k !== k) { clearInterval(S.nuevoT); S.nuevoT = 0; return; }
    if (document.hidden || document.querySelector('.tour, .intro, .hoja-fondo')) return;
    const p = pasosGuia().find((x) => grupoDe(x.v).k === k), el = p && p.sel && document.querySelector(p.sel), r = el && el.getBoundingClientRect();
    const dentro = r && r.height && Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) > Math.min(r.height, innerHeight) * 0.4;
    visto = dentro ? visto + 500 : 0;
    if (visto >= 1500) { LS.set('inv-guia', GUIA_ID()); clearInterval(S.nuevoT); S.nuevoT = 0; pintarNavNuevo(); quitarGloboNuevo(); }
  }, 500);
}
function quitarGloboNuevo() { clearTimeout(S.globoT); for (const g of $$('.globo-nuevo')) g.remove(); }
// el globo, una vez por versión: encima del botón con «Nuevo» (en el ordenador, debajo), con la guía a un toque
function globoNuevo(intento = 0) {
  const k = grupoNuevo(), pasos = pasosGuia();
  if (!k || !pasos.length || !S.cartera || LS.get('inv-guia-globo', '') === GUIA_ID()) return;
  clearTimeout(S.globoT);
  if (opiOcupado() || grupoDe(S.vista).k === k) { if (intento < 30) S.globoT = setTimeout(() => globoNuevo(intento + 1), 6000); return; }
  const a = [...$$(`.navbar [data-ir="${k}"], .nav [data-ir="${k}"], .riel [data-ir="${k}"]`)].find((x) => x.offsetParent);
  if (!a) return;
  LS.set('inv-guia-globo', GUIA_ID());
  const g = document.createElement('div'), bv = esc(pasos[0].nuevo);
  g.className = 'globo-nuevo';
  g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', L(`Nuevo en la ${bv}`, `New in ${bv}`));
  const mas = pasos.length - 1;
  g.innerHTML = `<button type="button" class="globo-x" data-globo="x" aria-label="${L('Cerrar', 'Close')}">${ICONOS.cerrar}</button>
    <span class="globo-eti">${ICONOS.chispa}${L(`Nuevo en la ${bv}`, `New in ${bv}`)}</span>
    <b>${esc(trad(pasos[0].t))}</b>
    <p>${mas ? L(`Está aquí, en ${esc(GRUPOS.find((x) => x.k === k).t)}, y hay ${mas} ${mas === 1 ? 'cosa más' : 'cosas más'}. Te las enseñamos una a una.`, `It's right here, in ${esc(L(GRUPOS.find((x) => x.k === k).t, GRUPOS.find((x) => x.k === k).en))}, and there ${mas === 1 ? 'is 1 more thing' : `are ${mas} more things`}. We'll show you each one.`) : L('Está aquí. Te lo enseñamos.', "It's right here. We'll show you.")}</p>
    <button type="button" class="btn pri peq" data-globo="guia">${L('Guíame', 'Show me')}</button>
    <i class="globo-pico" aria-hidden="true"></i>`;
  document.body.appendChild(g);
  const r = a.getBoundingClientRect(), w = g.offsetWidth, abajo = r.top < innerHeight / 2;
  const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12));
  g.style.left = `${left}px`;
  // por encima de la pastilla de «Nuevo», que se siga viendo
  if (abajo) { g.style.top = `${r.bottom + 12}px`; g.classList.add('abajo'); } else g.style.bottom = `${innerHeight - r.top + 22}px`;
  g.style.setProperty('--pico', `${r.left + r.width / 2 - left}px`);
  g.addEventListener('click', (e) => {
    const b = e.target.closest('[data-globo]');
    if (!b) return;
    if (b.dataset.globo === 'guia') guiaNuevo(); else quitarGloboNuevo();
  });
  S.globoT = setTimeout(quitarGloboNuevo, 20000);
}
addEventListener('resize', () => { if ($('.globo-nuevo')) quitarGloboNuevo(); });

// lo que cuenta como hecho en un paso que se toca: el botón de la barra, un selector o el que se calcula al empezar el paso
const objetivoTour = (p) => (!p ? null : p.toca ? navSel(p.toca) : p.hecho && p.hecho.mueve ? p.hecho.mueve : typeof p.hecho === 'string' ? p.hecho : TOURE && TOURE.hechoSel);
const DEDO_TOUR = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="currentColor"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".55"/></svg>';
function iniciarTour(paso = 0, alAcabar, pasos, fin = null) {
  cerrarTour();
  if (pasos && pasos.length === 1 && pasos[0].tour) pasos = TOUR;
  const nov = !!pasos;
  // sin con qué enseñarlo (una cartera vacía no tiene gráfica ni fichas), el paso no sale
  pasos = (pasos || TOUR).filter((p) => !p.si || p.si());
  if (S.ficha) cerrarFicha(true);
  document.querySelectorAll('.hoja-fondo').forEach((x) => x.remove());
  const capa = document.createElement('div');
  capa.className = 'tour'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-label', trad('Tutorial de Toisón'));
  // el aro de oro que se dibuja alrededor de lo que se explica
  capa.innerHTML = '<div class="tour-foco"><svg class="tour-aro" aria-hidden="true"><rect x="0" y="0" width="100%" height="100%" rx="19" pathLength="1"/></svg></div><div class="tour-caja" tabindex="-1" aria-live="polite"></div>';
  document.body.appendChild(capa);
  document.body.classList.add('en-tour');
  const reubicar = () => colocarTour();
  const tecla = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); cerrarTour(true); }
    else if (e.key === 'ArrowRight') irPasoTour(1);
    else if (e.key === 'ArrowLeft') irPasoTour(-1);
  };
  // la capa deja pasar el dedo (para que se pueda tocar lo que pide cada paso), pero solo cuenta lo que pide: lo demás
  // no hace nada mientras dura el tutorial
  const filtro = (e) => {
    if (!TOURE || TOURE.capa !== capa) return;
    const t = e.target && e.target.closest ? e.target : null;
    if (t && t.closest('.tour-caja')) return;
    const p = TOURE.pasos[TOURE.i], obj = TOURE.hecho && !p.toca && !p.abre ? (p.conFicha ? '.ficha-fondo' : null) : objetivoTour(p);
    if (t && obj && t.closest(obj)) { if (!TOURE.hecho) setTimeout(() => hechoTour(p), 0); return; }
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  };
  // deslizar el dedo (o el ratón) por la gráfica
  const mueve = (e) => {
    const p = TOURE && TOURE.capa === capa && TOURE.pasos[TOURE.i];
    if (!p || TOURE.hecho || !p.hecho || !p.hecho.mueve || !e.target.closest || !e.target.closest(p.hecho.mueve)) return;
    if (++TOURE.mov > 8) hechoTour(p);
  };
  window.addEventListener('resize', reubicar); window.addEventListener('scroll', reubicar, true); document.addEventListener('keydown', tecla, true);
  document.addEventListener('click', filtro, true); document.addEventListener('pointermove', mueve, true); document.addEventListener('touchmove', mueve, { capture: true, passive: true });
  // si algo aparece encima a mitad de un paso (el aviso del código de recuperación, una tarjeta que llega tarde), la página
  // cambia de alto sin que haya scroll: la tarjeta y el foco lo siguen un momento
  const ro = window.ResizeObserver ? new ResizeObserver(() => { if (TOURE && TOURE.capa === capa) seguirTour(700); }) : null;
  if (ro) ro.observe(document.body);
  TOURE = { capa, i: paso, el: null, alAcabar, pasos, nov, fin, mov: 0, off: () => { window.removeEventListener('resize', reubicar); window.removeEventListener('scroll', reubicar, true); document.removeEventListener('keydown', tecla, true); document.removeEventListener('click', filtro, true); document.removeEventListener('pointermove', mueve, true); document.removeEventListener('touchmove', mueve, { capture: true }); if (ro) ro.disconnect(); } };
  // en el móvil, deslizar la tarjeta pasa de paso
  let x0 = null, y0 = null;
  capa.addEventListener('touchstart', (e) => { if (!e.target.closest('.tour-caja')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  capa.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) irPasoTour(dx < 0 ? 1 : -1);
  }, { passive: true });
  capa.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const a = b.dataset.t;
    if (a === 'sig') irPasoTour(1);
    else if (a === 'ant') irPasoTour(-1);
    else if (a === 'fin') cerrarTour(true);
  });
  $('.tour-caja', capa).classList.add('pop');
  pasoTour();
}
// hecho lo que pedía el paso: «¡Eso es!» en verde y, si era un botón de la barra o la IA, sigue solo
function hechoTour(p) {
  if (!TOURE || TOURE.hecho || TOURE.pasos[TOURE.i] !== p) return;
  TOURE.hecho = true;
  const caja = $('.tour-caja', TOURE.capa), pr = $('.tour-prueba', caja), sig = $('[data-t="sig"]', caja);
  if (pr) { pr.classList.add('ok'); $('span', pr).textContent = trad('¡Eso es!'); }
  if (sig) { sig.classList.add('pri'); sig.textContent = trad('Siguiente'); }
  $('.tour-foco', TOURE.capa).classList.remove('pulsa');
  if (p.conFicha) { TOURE.capa.classList.add('libre'); seguirTour(900); }
  if (p.toca || p.abre) setTimeout(() => { if (TOURE && TOURE.pasos[TOURE.i] === p) irPasoTour(1); }, p.abre ? 750 : 550);
}
function salirPasoTour() {
  const p = TOURE && TOURE.pasos[TOURE.i];
  if (p && p.salir) try { p.salir(); } catch (e) { console.warn(e); }
}
function cerrarTour(hecho, sinVolver, desdeAtras) {
  if (!TOURE) return;
  salirPasoTour();
  const { alAcabar, nov, atras } = TOURE;
  cancelAnimationFrame(TOURE.raf);
  TOURE.off(); TOURE.capa.remove(); TOURE = null;
  document.body.classList.remove('en-tour');
  if (atras && desdeAtras !== true) atras();
  document.body.classList.remove('tour-ola');
  if (S.ficha) cerrarFicha(true);
  if (nov) { if (alAcabar) alAcabar(); return; }
  if (!hecho) return;
  LS.set('inv-tour', VERSION);
  if (sinVolver) return;
  if (S.vista !== 'cartera') location.hash = '#cartera';
  if (alAcabar) alAcabar();
}
function irPasoTour(d) {
  if (!TOURE) return;
  const n = TOURE.i + d;
  if (n < 0) return;
  const p0 = TOURE.pasos[TOURE.i];
  if (n >= TOURE.pasos.length) return cerrarTour(true);
  salirPasoTour();
  // hacia atrás desde la IA abierta: se cierra
  if (d < 0 && p0 && p0.ia) cerrarAsesor();
  TOURE.i = n; pasoTour(d);
}
// la barra de capítulos: cada uno se llena según sus pasos (en la guía de lo nuevo, una sola, paso a paso)
function capsTour(P, i) {
  const p = P[i];
  if (TOURE.nov || p.c == null && !p.fin) return `<div class="tour-caps" aria-hidden="true"><i style="--f:${((i + 1) / P.length).toFixed(3)}"></i></div>`;
  return `<div class="tour-caps" aria-hidden="true">${TOUR_CAP.map((_, c) => { const de = P.filter((q) => q.c === c && !q.fin); if (!de.length) return ''; const ya = de.filter((q) => P.indexOf(q) <= i).length; return `<i style="--f:${(p.fin || c < p.c ? 1 : c > p.c ? 0 : ya / de.length).toFixed(3)}"></i>`; }).join('')}</div>`;
}
const estallidoTour = () => `<span class="tour-estallido" aria-hidden="true">${Array.from({ length: 22 }, (_, j) => { const a = j / 22 * Math.PI * 2, d = 60 + (j % 3) * 26; return `<i style="--x:${(Math.cos(a) * d).toFixed(0)}px;--y:${(Math.sin(a) * d).toFixed(0)}px;--d:${(j % 4) * 60}ms"></i>`; }).join('')}</span>`;
function pasoTour(dir = 1) {
  const P = TOURE.pasos, p = P[TOURE.i], cambia = p.v && S.vista !== p.v;
  TOURE.hecho = false; TOURE.mov = 0; TOURE.capa.classList.remove('libre');
  TOURE.hechoSel = typeof p.hecho === 'function' ? p.hecho() : null;
  if (S.ficha && !p.conFicha) cerrarFicha(true);
  if (p.antes) try { p.antes(); } catch (e) { console.warn(e); }
  if (cambia) location.hash = '#' + p.v;
  if (p.pos && S.carTab === 'plan') { S.carTab = 'pos'; LS.set('inv-car', 'pos'); if (!cambia) pintar(); }
  if (p.plan && S.carTab !== 'plan') { S.carTab = 'plan'; LS.set('inv-car', 'plan'); if (!cambia) pintar(); }
  const ultimo = TOURE.i === P.length - 1;
  const caja = $('.tour-caja', TOURE.capa), x = typeof p.x === 'function' ? p.x() : p.x, prueba = typeof p.prueba === 'function' ? p.prueba() : p.prueba;
  document.body.classList.toggle('tour-ola', !!p.ola);
  const foco = $('.tour-foco', TOURE.capa);
  foco.classList.toggle('suave', !!p.suave);
  foco.classList.toggle('pulsa', !!prueba);
  foco.classList.remove('traza'); void foco.offsetWidth; foco.classList.add('traza');
  const de = p.c != null ? P.filter((q) => q.c === p.c && !q.fin) : P, n = de.indexOf(p) + 1;
  const kicker = p.fin ? `<div class="tour-medalla">${simboloTs()}${matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : estallidoTour()}</div>`
    : TOURE.nov || p.c == null ? `<div class="tour-kk"><p class="tour-k">${p.nuevo ? esc(L(`Lo nuevo de la ${p.nuevo}`, `New in ${p.nuevo}`)) : esc(trad('Toisón'))}</p><small class="tour-n">${TOURE.i + 1} de ${P.length}</small></div>`
    : `<div class="tour-kk"><p class="tour-k"><span class="rom" data-no-trad>${ROMANOS[p.c]}</span>${esc(TOUR_CAP[p.c])}</p><small class="tour-n">${n} de ${de.length}</small></div>`;
  const indice = p.indice ? `<div class="tour-indice">${TOUR_CAP.map((c, j) => `<span><b data-no-trad>${ROMANOS[j]}</b>${esc(c)}</span>`).join('')}</div>` : '';
  const items = p.empezar ? itemsEmpezar() : [], prim = items.find((y) => !y.ok);
  const lista = p.empezar ? `<ol class="tour-pp">${items.filter((y) => !y.opcional || !y.ok).slice(0, 4).map((y, k) => `<li class="${y.ok ? 'ok' : ''}"><span class="n" aria-hidden="true">${y.ok ? ICONOS.ok : k + 1}</span><span><b>${esc(y.t)}</b><small>${esc(y.ok ? trad('Hecho') : y.min)}</small></span></li>`).join('')}</ol>` : '';
  const izq = !TOURE.i ? `<button class="btn peq" data-t="fin">${P.length === 1 ? 'Cerrar' : 'Ahora no'}</button>` : ultimo && p.empezar ? (prim ? '<button class="btn peq" data-t="fin">Luego</button>' : '') : '<button class="btn peq" data-t="ant">Atrás</button>';
  const der = ultimo ? (p.empezar && prim ? `<button class="btn peq pri" data-emp="${esc(prim.k)}">Empezar por el primero</button>` : `<button class="btn peq pri" data-t="fin">${TOURE.fin ? esc(TOURE.fin) : TOURE.nov ? 'Listo' : 'Terminar'}</button>`)
    : `<button class="btn peq${prueba ? '' : ' pri'}" data-t="sig">${prueba ? 'Saltar este' : TOURE.i ? 'Siguiente' : 'Empezar'}</button>`;
  caja.classList.toggle('fin', !!p.fin);
  caja.innerHTML = `<button type="button" class="ib tour-x" data-t="fin" aria-label="${TOURE.fin ? esc(TOURE.fin) : 'Cerrar'}" title="${TOURE.fin ? esc(TOURE.fin) : 'Cerrar'}">${ICONOS.cerrar}</button>${P.length > 1 ? capsTour(P, TOURE.i) : ''}
    <div class="tour-txt">${kicker}${p.logo ? simboloTs('tour-logo') : ''}${p.dib ? `<div class="tour-dib">${dibujo(p.dib)}</div>` : ''}<h3>${esc(p.t)}</h3><p>${esc(x)}</p>${indice}${prueba ? `<div class="tour-prueba">${DEDO_TOUR}<span>${esc(prueba)}</span></div>` : ''}${lista}</div>
    <div class="tour-btns">${izq}<span class="tour-esp"></span>${der}</div>`;
  caja.classList.remove('justa');
  const txt = $('.tour-txt', caja);
  if (txt) { txt.classList.remove('entra-d', 'entra-i'); void txt.offsetWidth; txt.classList.add(dir < 0 ? 'entra-i' : 'entra-d'); }
  // el foco y la tarjeta se quedan donde estaban hasta saber adónde van y, entonces, se deslizan hasta allí
  // (antes pasaban por el centro de la pantalla entre un paso y otro)
  const k = (TOURE.n = (TOURE.n || 0) + 1);
  const busca = () => {
    if (!TOURE || TOURE.n !== k) return;
    const el = p.sel ? elVisible(p.sel) : null;
    TOURE.el = el; TOURE.vigila = performance.now() + 4000; TOURE.dt0 = null;
    if (el) encuadrarTour(el, caja, p.lado);
    seguirTour(4000);
    caja.focus({ preventScroll: true });
  };
  // al cambiar de pestaña, se espera a que esté pintada y quieta (si no, el deslizamiento iría a trompicones)
  if (cambia) { seguirTour(80); setTimeout(() => (window.requestIdleCallback || ((f) => setTimeout(f, 120)))(busca, { timeout: 260 }), 40); }
  else busca();
}
/* durante un rato, la tarjeta y el foco siguen a lo resaltado cada fotograma (mientras la pestaña entra o algo se recoloca) */
function seguirTour(ms) {
  if (!TOURE) return;
  const hasta = performance.now() + ms;
  cancelAnimationFrame(TOURE.raf);
  const f = () => { if (!TOURE) return; colocarTour(); if (performance.now() < hasta) TOURE.raf = requestAnimationFrame(f); };
  f();
}
function colocarTour() {
  if (!TOURE) return;
  const foco = $('.tour-foco', TOURE.capa), caja = $('.tour-caja', TOURE.capa);
  const paso = TOURE.pasos[TOURE.i] || {};
  let el = TOURE.el;
  if (el && !el.isConnected) el = TOURE.el = elVisible(paso.sel);
  // los primeros segundos de cada paso: si lo resaltado aún no estaba (el mapa tarda en cargar) o se ha movido porque
  // algo de encima ha terminado de pintarse, la página se vuelve a encuadrar
  if (TOURE.vigila > performance.now() && paso.sel) {
    if (!el && (el = TOURE.el = elVisible(paso.sel))) { TOURE.dt0 = null; encuadrarTour(el, caja, paso.lado); }
    if (el) {
      const dt = rectTour(el).top + scrollY;
      if (TOURE.dt0 != null && Math.abs(dt - TOURE.dt0) > 24) encuadrarTour(el, caja, paso.lado);
      TOURE.dt0 = dt;
    }
  }
  const hc = caja.offsetHeight;
  foco.classList.toggle('suave', !!paso.suave);
  if (TOURE.capa.classList.contains('libre')) {
    caja.classList.remove('con-flecha', 'abajo', 'arriba', 'centro');
    caja.style.left = '';
    caja.style.top = `${Math.max(16, Math.round(innerHeight - hc - 16))}px`;
    return;
  }
  if (!el) {
    // nada que señalar: el foco se cierra sobre su propio centro y la tarjeta se desliza al centro de la pantalla
    if (!foco.classList.contains('sin')) {
      const f = foco.getBoundingClientRect();
      const cx = f.width ? f.left + f.width / 2 : innerWidth / 2, cy = f.height ? f.top + f.height / 2 : innerHeight * 0.4;
      foco.style.cssText = `left:${cx.toFixed(1)}px;top:${cy.toFixed(1)}px;width:0px;height:0px`;
      foco.classList.add('sin');
    }
    caja.classList.remove('con-flecha', 'abajo', 'arriba');
    caja.classList.add('centro');
    caja.style.left = '';
    caja.style.top = `${Math.max(16, Math.round((innerHeight - hc) / 2))}px`;
    return;
  }
  const r = rectTour(el), B = bordesTour(el), m = TOUR_M, g = TOUR_G;
  // lo redondo (el ojo, el botón de la IA), con el foco y el aro redondos
  const redondo = /50%|999/.test(getComputedStyle(el).borderRadius) && Math.abs(r.width - r.height) < 6;
  foco.classList.toggle('redondo', redondo);
  $('rect', foco).setAttribute('rx', redondo ? '50%' : '19');
  // lo que se ve de lo resaltado: no cuenta lo que queda bajo la cabecera o la barra de abajo
  let ft = B.fijo ? r.top - m : Math.max(r.top - m, B.arriba + 2), fb = B.fijo ? r.bottom + m : Math.min(r.bottom + m, B.abajo - 2);
  ft = Math.max(1, ft); fb = Math.min(innerHeight - 1, fb);
  if (fb < ft + 24) fb = ft + 24;
  // la tarjeta, al lado donde cabe entera sin pisarlo (primero debajo si está arriba y encima si está abajo). Si no cabe
  // en ninguno, va debajo (encima si es la barra) y el foco se queda con la parte de arriba, la que se ve: la tarjeta
  // nunca tapa lo que señala
  const da = ft - g - B.techo, db = B.suelo - (fb + g), pref = paso.lado ? paso.lado === 'abajo' : (ft + fb) / 2 < innerHeight / 2;
  const cabeB = db >= hc, cabeA = da >= hc, abajo = cabeB && cabeA ? pref : cabeB || (!cabeA && !B.nav);
  let top;
  if (abajo) { top = fb + g; if (top + hc > B.suelo) { top = Math.max(B.techo, B.suelo - hc); fb = Math.max(ft + 24, top - g); } }
  else { top = ft - g - hc; if (top < B.techo) { top = B.techo; ft = Math.min(fb - 24, top + hc + g); } }
  foco.classList.remove('sin');
  foco.style.cssText = `left:${(r.left - m).toFixed(1)}px;top:${ft.toFixed(1)}px;width:${(r.width + 2 * m).toFixed(1)}px;height:${(fb - ft).toFixed(1)}px`;
  caja.classList.remove('centro');
  caja.classList.toggle('abajo', abajo);
  caja.classList.toggle('arriba', !abajo);
  caja.style.bottom = 'auto';
  caja.style.top = `${Math.round(top)}px`;
  // en pantallas anchas, la tarjeta se va hacia lo resaltado en vez de quedarse en el centro; la flechita apunta a lo
  // resaltado (con la posición a la que va, no la de mitad de camino)
  const cw = caja.offsetWidth, dw = document.documentElement.clientWidth, mg = Math.min(16, (dw - cw) / 2);
  const cl = Math.max(mg, Math.min(dw - cw - mg, r.left + r.width / 2 - cw / 2));
  caja.style.left = `${(cl + cw / 2).toFixed(1)}px`;
  caja.style.setProperty('--fx', `${Math.max(22, Math.min(cw - 22, r.left + r.width / 2 - cl)).toFixed(0)}px`);
  caja.classList.add('con-flecha');
}
/* los bordes de la pantalla para el tutorial: lo resaltado se ve entre la cabecera y la barra de abajo (salvo que esté
   en ellas, que no se mueven) y la tarjeta va entre el borde de arriba y la barra */
const TOUR_M = 6, TOUR_G = 10;
// lo resaltado puede ser dos cosas juntas (el mapa y el país elegido debajo): el recuadro que las abarca
function rectTour(el) {
  const r = el.getBoundingClientRect(), p = TOURE && TOURE.pasos[TOURE.i], o = p && p.con ? elVisible(p.con) : null;
  if (!o) return r;
  const q = o.getBoundingClientRect(), left = Math.min(r.left, q.left), top = Math.min(r.top, q.top), right = Math.max(r.right, q.right), bottom = Math.max(r.bottom, q.bottom);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}
function bordesTour(el) {
  const tb = document.querySelector('.top'), nb = document.querySelector('.navbar');
  const enTop = !!(tb && tb.contains(el)), enNav = !!(nb && nb.contains(el));
  const barra = nb && nb.offsetHeight ? Math.min(innerHeight, nb.getBoundingClientRect().top) : innerHeight;
  let arriba = enTop || !tb ? 0 : Math.max(0, tb.getBoundingClientRect().bottom);
  // en el móvil, las pestañas de Análisis o de Hacienda se quedan pegadas bajo la cabecera: lo que va después, bajo ellas
  if (!enTop) for (const x of document.querySelectorAll('.subvistas, .plazos')) {
    if (!x.offsetHeight || x.contains(el) || !(x.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    const cs = getComputedStyle(x);
    if (cs.position === 'sticky') arriba = Math.max(arriba, (parseFloat(cs.top) || 0) + x.offsetHeight + 5);
  }
  return { fijo: enTop || enNav, nav: enNav, arriba, abajo: enNav ? innerHeight : barra, techo: 12, suelo: barra - 12 };
}
/* al empezar cada paso: si lo resaltado y la tarjeta no caben juntos, la tarjeta se queda sin dibujo y, si aún hace falta,
   su texto se acorta con barra; luego la página se mueve lo justo para ver lo resaltado (entero si cabe, si no desde
   arriba) con sitio para la tarjeta al lado */
function encuadrarTour(el, caja, lado) {
  const B = bordesTour(el), txt = $('.tour-txt', caja);
  caja.classList.remove('justa');
  if (txt) txt.style.maxHeight = '';
  const r = rectTour(el), alto = r.height + 2 * TOUR_M, arriba = B.fijo ? B.techo : Math.max(B.arriba + 8, B.techo);
  const sitio = B.suelo - arriba - TOUR_G;
  let hc = caja.offsetHeight;
  if (alto + hc > sitio) {
    caja.classList.add('justa'); hc = caja.offsetHeight;
    const ver = Math.min(alto, Math.max(150, sitio * 0.42));
    if (txt && ver + hc > sitio) { txt.style.maxHeight = `${Math.max(96, txt.offsetHeight - (ver + hc - sitio))}px`; hc = caja.offsetHeight; }
  }
  if (B.fijo) return;
  const entero = r.top - TOUR_M >= arriba && r.bottom + TOUR_M <= B.abajo - 8;
  const cabeAb = B.suelo - (r.bottom + TOUR_M + TOUR_G) >= hc, cabeAr = r.top - TOUR_M - TOUR_G - B.techo >= hc;
  if (entero && (lado === 'abajo' ? cabeAb : cabeAb || cabeAr)) return;
  // con la tarjeta debajo a la fuerza (el paso quiere que se vea lo que hay encima), todo lo más abajo posible
  const libre = B.suelo - arriba - alto - TOUR_G - hc;
  const y = libre >= 0 ? arriba + (lado === 'abajo' ? libre : libre / 2) : arriba;
  const d = r.top - TOUR_M - y;
  if (Math.abs(d) > 2) window.scrollBy(0, d);
}

