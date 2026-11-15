/* =====================================================================
   0.9 · El movimiento del rediseño (tokens --mov-* y --curva-* en 00-temas.css; las animaciones, en 34-sistema.css).
   Aquí solo lo que el CSS no puede hacer solo: saber si hay transición entre páginas y la cifra que cuenta hasta su valor.
   Con «reducir movimiento» no se mueve nada. En las pruebas automáticas (navigator.webdriver) tampoco, salvo que la
   prueba lo pida con inv-mov-prueba: una cifra a medio contar o una página a medio entrar hacen fallar pruebas que
   miran otra cosa.
   ===================================================================== */
let movMq = null;   // la consulta se guarda una vez: se pregunta en cada movimiento del ratón
const movQuieto = () => { try { movMq = movMq || matchMedia('(prefers-reduced-motion: reduce)'); return movMq.matches; } catch (e) { return true; } };
const movEnPrueba = () => !!navigator.webdriver && !LS.get('inv-mov-prueba', false);
const conMovimiento = () => !movQuieto() && !movEnPrueba();
const conTransicion = () => conMovimiento() && typeof document.startViewTransition === 'function' && !document.querySelector('.hoja-fondo, #fichaFondo, .tour');

/* 0.9a · el paso de página en el móvil (Carlos, 15 nov: «la barra de abajo liquid que se quita al cambiar»). Sin la View
   Transitions API: con ella el navegador enseña fotos mientras dura el cambio, y la barra de cristal iba en la foto de la
   raíz (se veía plana, sin el cristal de verdad), con la pantalla congelada mientras se pintaba la página nueva dentro de
   la transición. Aquí la barra sigue viva: el botón tocado se marca en el mismo fotograma, la página vieja se apaga un poco
   (en el compositor, aunque pintar tarde), la nueva se pinta un fotograma después y entra con opacidad y un desplazamiento
   corto (solo compositor) en --mov-pagina, sin espera. Mientras entra, ni escalera de tarjetas ni rueda: van después
   (trasPagina), para que no coincidan en el mismo fotograma. Medido en tests/fluidez.spec.js (npm run fluidez). */
const pasoMovil = () => conMovimiento() && typeof Element.prototype.animate === 'function' && !document.querySelector('.hoja-fondo, #fichaFondo, .tour') && matchMedia('(max-width: 960px)').matches;
let pasoFin = 0, pasoPend = null, pasoAni = null, pasoMs = null;
const pasandoPagina = () => !!pasoPend || performance.now() < pasoFin;
/* lo que se mueve después de que entre la página (o ya, si no está entrando ninguna) */
function trasPagina(f) { if (!pasandoPagina()) return f(); setTimeout(() => trasPagina(f), Math.max(16, pasoFin - performance.now() + 16)); }
function msToken(n, d) { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(), x = parseFloat(v); return isFinite(x) ? (/ms$/.test(v) ? x : /s$/.test(v) ? x * 1000 : x) : d; }
function pasarPagina(cambiar, dx, k) {
  for (const a of $$('[data-ir]')) a.setAttribute('aria-current', a.dataset.ir === k ? 'page' : 'false');
  // la duración se lee una vez (leerla en cada toque obliga a recalcular los estilos justo antes de pintar)
  if (pasoMs == null) pasoMs = msToken('--mov-pagina', 200);
  const dur = pasoMs, vi = $('#vista');
  if (pasoPend) { cancelAnimationFrame(pasoPend.raf); clearTimeout(pasoPend.t); }
  else if (vi) { if (pasoAni) pasoAni.cancel(); pasoAni = vi.animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: Math.round(dur * 0.6), easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }); }
  const p = pasoPend = { raf: 0, t: 0 };
  // un fotograma para que se vea el toque (el botón marcado y la página apagándose) antes de pintar, que es lo que tarda
  p.raf = requestAnimationFrame(() => { p.t = setTimeout(() => {
    if (pasoPend !== p) return;
    pasoFin = performance.now() + dur + 400;   // mientras se pinta, lo de después espera
    try { cambiar(); } finally {
      pasoPend = null; pasoFin = performance.now() + dur;
      const v2 = $('#vista');
      if (pasoAni) { pasoAni.cancel(); pasoAni = null; }
      if (v2) {
        const a = v2.animate([{ opacity: 0.4, transform: dx ? `translate3d(${Math.round(dx)}px, 0, 0)` : 'translate3d(0, 8px, 0)' }, { opacity: 1, transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.16, 1, .3, 1)' });
        pasoAni = a; a.onfinish = a.oncancel = () => { if (pasoAni === a) pasoAni = null; };
      }
    }
  }, 0); });
}

/* 0.9a · cerrar una hoja o la ficha: se quitan ya (lo que mira si están abiertas ve que no) y en su sitio queda un momento
   una copia muda que baja un poco y se apaga en el compositor (antes desaparecían de golpe). Sin movimiento, nada */
function despedirCapa(f) {
  if (!f || !f.isConnected || !conMovimiento() || typeof f.animate !== 'function') return;
  const panel = f.firstElementChild; if (!panel) return;
  const cs = getComputedStyle(f), pt = getComputedStyle(panel).transform, sy = panel.scrollTop;
  const c = f.cloneNode(true); c.className = 'capa-sale'; c.removeAttribute('id'); c.setAttribute('aria-hidden', 'true'); c.inert = true;
  for (const x of c.querySelectorAll('[id]')) x.removeAttribute('id');
  for (const k of ['position', 'top', 'right', 'bottom', 'left', 'zIndex', 'display', 'flexDirection', 'justifyContent', 'alignItems', 'backgroundColor', 'backgroundImage', 'padding']) c.style[k] = cs[k];
  c.style.pointerEvents = 'none';
  document.body.appendChild(c);
  const p2 = c.firstElementChild; if (sy) p2.scrollTop = sy;
  const dur = Math.round(msToken('--mov-corto', 180) * 0.9), cur = pt && pt !== 'none' ? pt + ' ' : '';
  p2.animate([{ transform: `${cur}translate3d(0, 28px, 0)`, opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' });
  const a = c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'linear', fill: 'forwards' });
  const quita = () => c.remove(); a.onfinish = a.oncancel = quita; setTimeout(quita, dur + 400);
}

/* una cifra que cuenta hasta su valor: el[data-n] lleva el número y fmt lo escribe. Si mientras tanto llega un precio
   nuevo y alguien cambia el texto, se deja lo nuevo y se para */
function cifraCuenta(el, hasta, fmt, ms = 700, desde = null) {
  if (!el || !isFinite(hasta) || !conMovimiento()) return;
  const a = desde == null ? hasta * 0.94 : desde, t0 = performance.now(), fin = el.textContent;
  let ultimo = null;
  const paso = (t) => {
    if (!el.isConnected || (ultimo != null && el.textContent !== ultimo)) return;
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4);
    ultimo = k >= 1 ? fin : fmt(a + (hasta - a) * e);
    el.textContent = ultimo;
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
/* la cifra del patrimonio cuenta al abrir Hoy (una vez por visita a Hoy, no en cada repintado con precios nuevos) */
let movHeroVisto = '';
function animarHero() {
  const h = $('#heroNum'); if (!h) { movHeroVisto = ''; return; }
  const clave = `${S.vista}|${S.oculto ? 1 : 0}`;
  if (S.oculto) return;
  const primera = movHeroVisto !== clave;   // la página se repinta entera con cada dato que llega: la rueda se vuelve a montar, sin rodar
  movHeroVisto = clave;
  const e = $('[data-b="totalE"]', h), n = e ? parseFloat(e.dataset.n) : NaN;
  if (!e || !isFinite(n) || !/\d/.test(e.textContent)) return;
  if (conMovimiento()) ruedaCifra(e, e.textContent, primera);   // 0.9 (15 nov): la rueda de dígitos (65-3d.js); antes contaba desde un poco menos
}
/* las cifras de una pestaña (.pav-kpi b, .cifra-xl) no cuentan: son muchas y marea. Solo la protagonista (.cifra-cuenta) */
function animarCifras(raiz) {
  for (const el of $$('.cifra-cuenta[data-n]', raiz || document)) {
    if (el.dataset.visto) continue; el.dataset.visto = '1';
    const n = parseFloat(el.dataset.n), dec = +(el.dataset.dec || 0), suf = el.dataset.suf || '', sig = el.dataset.signo === '1';
    cifraCuenta(el, n, (v) => `${sig && v > 0 ? '+' : ''}${fmtNum(v, dec)}${suf}`, 700, el.dataset.desde != null ? +el.dataset.desde : 0);
  }
}

/* la luz que sigue al ratón sobre una tarjeta (solo con ratón de verdad): un reflejo dorado muy suave, como piedra pulida.
   No mueve nada de sitio: solo cambia --mx y --my de la tarjeta, que usa 34-sistema.css */
let luzRaf = 0, luzEv = null;
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || movQuieto()) return;
  luzEv = e;
  if (luzRaf) return;
  luzRaf = requestAnimationFrame(() => {
    luzRaf = 0;
    const t = luzEv && luzEv.target && luzEv.target.closest ? luzEv.target.closest('#vista .pav-t, #vista .hero-panel') : null;
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', `${Math.round(luzEv.clientX - r.left)}px`); t.style.setProperty('--my', `${Math.round(luzEv.clientY - r.top)}px`);
  });
}, { passive: true });

/* 0.9 · el acabado: «piedra» (las vetas y las tarjetas de siempre), «híbrido» (fondo plano y cada bloque en su tarjeta;
   38-hibrido.css) o «liso» (fondo plano y sin cajas; 35-liso.css). Lo pidió Carlos el 12 nov para verlos lado a lado; se
   guarda en este dispositivo (inv-acabado) y vale para Mármol y para Marfil. Sin elegir: tarjetas en el móvil y, desde el
   15 nov (maqueta del Paso a paso y de Hoy, B4), el híbrido en el ordenador, con el corte de la K2 (1.180 px, desde donde
   sale la barra de 232 px); antes era el liso, que sigue en Ajustes. El primer pintado lo pone el script de index.html,
   igual, para que no salte de uno a otro al abrir. «Según la pantalla» borra lo elegido y vuelve a esto. */
const ACABADOS = ['piedra', 'hibrido', 'liso'];
const acabadoPorAncho = () => (innerWidth >= 1180 ? 'hibrido' : 'piedra');
function acabadoElegido() { const a = LS.get('inv-acabado', null); return ACABADOS.includes(a) ? a : null; }
function acabadoApp() { return acabadoElegido() || acabadoPorAncho(); }
function marcarAcabado() {
  const a = acabadoApp(), b = acabadoElegido() || 'auto';
  if (a !== 'piedra') document.documentElement.setAttribute('data-acabado', a); else document.documentElement.removeAttribute('data-acabado');
  for (const x of $$('[data-acabado-b]')) x.setAttribute('aria-pressed', String(x.dataset.acabadoB === b));
  return a;
}
function ponerAcabado(a) {
  if (ACABADOS.includes(a)) LS.set('inv-acabado', a); else LS.del('inv-acabado');
  marcarAcabado();
  // las gráficas dibujadas con los colores del fondo se rehacen
  const ev = new Event('resize'); ev.k2 = true; dispatchEvent(ev);
}
const htmlSelectorAcabado = () => { const b = acabadoElegido() || 'auto', bt = (v, t) => `<button type="button" data-acabado-b="${v}" aria-pressed="${b === v}">${t}</button>`;
  return `<div class="seccion-ed aj-idioma"><h3>${ICONOS_PL.ver}${L('Acabado', 'Finish')}</h3>
  <div class="idiomas seg-modo" role="group" aria-label="${L('Acabado', 'Finish')}">${bt('auto', L('Según la pantalla', 'By screen'))}${bt('piedra', L('Tarjetas', 'Cards'))}${bt('hibrido', L('Híbrido', 'Hybrid'))}${bt('liso', L('Liso', 'Plain'))}</div>
  <small>${L('Tarjetas: el fondo con vetas y cada bloque en su caja. Híbrido: fondo plano y cada bloque en su caja. Liso: fondo plano y sin cajas. Según la pantalla: tarjetas en el móvil e híbrido en el ordenador. Se guarda en este dispositivo.', 'Cards: the veined background and each block in its box. Hybrid: flat background and each block in its box. Plain: flat background and no boxes. By screen: cards on the phone and hybrid on the computer. Saved on this device.')}</small>
  <div class="idiomas seg-modo aj-volumen" role="group" aria-label="${L('Relieve, en 3D', '3D depth')}">${[[1, L('Con volumen', 'With depth')], [0, L('Plano', 'Flat')]].map(([v, t]) => `<button type="button" data-volumen-b="${v}" aria-pressed="${!LS.get('inv-sin-3d', false) === !!v}">${t}</button>`).join('')}</div>
  <small>${L('Con volumen: la moneda de Hoy y el anillo del reparto, en 3D. Plano: los dibujos de siempre, por si en este dispositivo va lento o gasta batería.', 'With depth: the Today coin and the allocation ring in 3D. Flat: the usual drawings, in case it runs slowly or drains the battery on this device.')}</small></div>`; };
// 0.9 (revisión del 15 nov): el 3D se puede quitar en este dispositivo, en Tú, debajo del acabado (inv-sin-3d, que ya miraba tresDSi, 65-3d.js). Si ya
// está puesto, se queda hasta volver a abrir Toisón (el trozo no sabe quitarse) y se dice
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-volumen-b]'); if (!b) return;
  const con = b.dataset.volumenB === '1';
  if (con) LS.del('inv-sin-3d'); else LS.set('inv-sin-3d', true);
  for (const x of $$('[data-volumen-b]')) x.setAttribute('aria-pressed', String((x.dataset.volumenB === '1') === con));
  if (con) { if (typeof pedir3D === 'function') pedir3D(true); } else if (window.T3D) toast(L('Plano desde la próxima vez que abras Toisón.', 'Flat from the next time you open Toisón.'));
});
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-acabado-b]'); if (b) ponerAcabado(b.dataset.acabadoB); });
// sin elegir, al cruzar el corte (girar una tableta, estrechar la ventana) cambia con la pantalla
addEventListener('resize', (e) => { if (!e.k2 && !acabadoElegido() && (document.documentElement.getAttribute('data-acabado') || 'piedra') !== acabadoPorAncho()) marcarAcabado(); }, { passive: true });
marcarAcabado();
