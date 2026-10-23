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
const GUIA_ID = () => baseVer(VERSION);
const novBase = () => NOVEDADES.find((n) => n.v === baseVer(VERSION)) || NOVEDADES.find((n) => !esParche(n.v)) || NOVEDADES[0];
const pasosGuia = (ns = [novBase()]) => ns.filter((n) => !esParche(n.v)).flatMap((n) => (n.cosas || []).filter((c) => c.ir).map((c) => ({ ...c.ir, t: c.t, x: c.g || c.x, dib: c.d, nuevo: n.v })));
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
function grupoNuevo() {
  if (LS.get('inv-guia', '') === GUIA_ID() || baseVer((LS.get('inv-nov-vista') || {}).v) !== baseVer(VERSION)) return null;
  const p = pasosGuia()[0];
  return p ? grupoDe(p.v).k : null;
}
function pintarNavNuevo() {
  const k = grupoNuevo();
  for (const a of $$('.nav [data-ir], .navbar [data-ir]')) {
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
  const a = [...$$(`.navbar [data-ir="${k}"], .nav [data-ir="${k}"]`)].find((x) => x.offsetParent);
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

function iniciarTour(paso = 0, alAcabar, pasos, fin = null) {
  cerrarTour();
  if (pasos && pasos.length === 1 && pasos[0].tour) pasos = TOUR;
  if (S.ficha) cerrarFicha(true);
  document.querySelectorAll('.hoja-fondo').forEach((x) => x.remove());
  const capa = document.createElement('div');
  capa.className = 'tour'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-label', 'Tour por la app');
  capa.innerHTML = '<div class="tour-foco"></div><div class="tour-caja" tabindex="-1" aria-live="polite"></div>';
  document.body.appendChild(capa);
  document.body.classList.add('en-tour');
  const reubicar = () => colocarTour();
  const tecla = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); cerrarTour(true); }
    else if (e.key === 'ArrowRight') irPasoTour(1);
    else if (e.key === 'ArrowLeft') irPasoTour(-1);
  };
  window.addEventListener('resize', reubicar); window.addEventListener('scroll', reubicar, true); document.addEventListener('keydown', tecla, true);
  TOURE = { capa, i: paso, el: null, alAcabar, pasos: pasos || TOUR, nov: !!pasos, fin, off: () => { window.removeEventListener('resize', reubicar); window.removeEventListener('scroll', reubicar, true); document.removeEventListener('keydown', tecla, true); } };
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
    else if (a === 'tengo') { cerrarTour(true, true); operacion('tengo'); }
    else if (a === 'importar') { cerrarTour(true, true); importarCapturas(); }
  });
  $('.tour-caja', capa).classList.add('pop');
  pasoTour();
}
function cerrarTour(hecho, sinVolver, desdeAtras) {
  if (!TOURE) return;
  const { alAcabar, nov, atras } = TOURE;
  cancelAnimationFrame(TOURE.raf);
  TOURE.off(); TOURE.capa.remove(); TOURE = null;
  document.body.classList.remove('en-tour');
  if (atras && desdeAtras !== true) atras();
  document.body.classList.remove('tour-ola');
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
  if (n >= TOURE.pasos.length) return cerrarTour(true);
  TOURE.i = n; pasoTour(d);
}
function pasoTour(dir = 1) {
  const P = TOURE.pasos, p = P[TOURE.i], cambia = p.v && S.vista !== p.v;
  if (p.antes) try { p.antes(); } catch (e) { console.warn(e); }
  if (cambia) location.hash = '#' + p.v;
  if (p.pos && S.carTab === 'plan') { S.carTab = 'pos'; LS.set('inv-car', 'pos'); if (!cambia) pintar(); }
  if (p.plan && S.carTab !== 'plan') { S.carTab = 'plan'; LS.set('inv-car', 'plan'); if (!cambia) pintar(); }
  const ultimo = TOURE.i === P.length - 1, vacia = !TOURE.nov && !p.empezar && !((S.cartera && S.cartera.posiciones) || []).length;
  const caja = $('.tour-caja', TOURE.capa), x = typeof p.x === 'function' ? p.x() : p.x;
  document.body.classList.toggle('tour-ola', !!p.ola);
  $('.tour-foco', TOURE.capa).classList.toggle('suave', !!p.suave);
  const solo = P.length === 1;
  caja.innerHTML = `<button type="button" class="ib tour-x" data-t="fin" aria-label="${TOURE.fin ? esc(TOURE.fin) : 'Cerrar'}" title="${TOURE.fin ? esc(TOURE.fin) : 'Cerrar'}">${ICONOS.cerrar}</button>${solo ? '' : `<div class="tour-prog" aria-hidden="true">${P.map((_, i) => `<i class="${i === TOURE.i ? 'on' : i < TOURE.i ? 'ya' : ''}"></i>`).join('')}</div>`}
    <div class="tour-txt">${p.logo ? '<img class="tour-logo" src="favicon.svg" alt="">' : ''}${p.dib ? `<div class="tour-dib">${dibujo(p.dib)}</div>` : ''}${p.nuevo ? `<span class="tour-nuevo">Nuevo en la ${esc(p.nuevo)}</span>` : ''}<h3>${esc(p.t)}</h3><p>${esc(x)}</p>${p.empezar ? htmlListaEmpezar() : ''}</div>
    <div class="tour-btns">${solo ? '<span class="tour-n"></span>' : `<small class="tour-n">${TOURE.i + 1} de ${P.length}</small>
      ${TOURE.i ? '<button class="btn peq" data-t="ant">Atrás</button>' : '<button class="btn peq" data-t="fin">Saltar</button>'}`}
      ${ultimo ? (vacia ? '<button class="btn peq" data-t="importar">Importar de tu bróker</button><button class="btn peq pri" data-t="tengo">Meter lo que tengo</button>' : `<button class="btn peq${p.empezar && itemsEmpezar().some((y) => !y.ok) ? '' : ' pri'}" data-t="fin">${TOURE.fin ? esc(TOURE.fin) : TOURE.nov ? 'Listo' : 'Terminar'}</button>`) : `<button class="btn peq pri" data-t="sig">${TOURE.i || TOURE.nov ? 'Siguiente' : 'Empezar'}</button>`}
    </div>`;
  caja.classList.remove('justa');
  const txt = $('.tour-txt', caja);
  if (txt) { txt.classList.remove('entra-d', 'entra-i'); void txt.offsetWidth; txt.classList.add(dir < 0 ? 'entra-i' : 'entra-d'); }
  // el foco y la tarjeta se quedan donde estaban hasta saber adónde van y, entonces, se deslizan hasta allí
  // (antes pasaban por el centro de la pantalla entre un paso y otro)
  const n = (TOURE.n = (TOURE.n || 0) + 1);
  const busca = () => {
    if (!TOURE || TOURE.n !== n) return;
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

