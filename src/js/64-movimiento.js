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
  if (movHeroVisto === clave || S.oculto) return;
  movHeroVisto = clave;
  const e = $('[data-b="totalE"]', h), n = e ? parseFloat(e.dataset.n) : NaN;
  if (!e || !isFinite(n) || !/\d/.test(e.textContent)) return;
  if (conMovimiento()) contarHasta(e, Math.trunc(n * 0.94), n, e.textContent);   // el contarHasta de 10-pintado.js, el mismo de los precios en directo
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
