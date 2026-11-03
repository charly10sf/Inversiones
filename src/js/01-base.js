'use strict';
/* =====================================================================
   GrowFolio (antes Inversiones) — web estática (GitHub Pages).
   - instrumentos.json (público): qué instrumentos hay, sin cantidades.
   - rama "datos" / precios.json (público): precios que baja la GitHub Action.
   - cartera.enc.json (público pero cifrado): cantidades, costes y notas, con
     AES-GCM y una clave que sale de tu contraseña (PBKDF2, 600.000 vueltas).
     La contraseña nunca sale del navegador ni se guarda.
   ===================================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + (+f(x) || 0), 0);

/* ---------- almacenamiento local (siempre con try/catch) ---------- */
/* Tres formas de guardar la cartera, siempre cifrada con la contraseña de cada uno:
   - cuenta (desde la 0.2): entras con Google o con tu correo y la cartera cifrada va a tu cuenta (Firestore),
     así que la ves igual en el móvil, en el ordenador y en la app. Es la de todo el que llega nuevo.
   - local: solo en este dispositivo, sin cuenta (las de antes de la 0.2; se pueden pasar a una cuenta).
   - github: la del dueño de la web, en cartera.enc.json del repositorio.
   Cada una guarda aparte su clave, su asesor y su análisis, así que pueden convivir en el mismo móvil.
   #cuenta, #mia y #github en la dirección eligen una; si no, se recuerda la última. */
const MODO = (() => {
  try {
    let m = null; try { m = JSON.parse(localStorage.getItem('inv-perfil') || 'null'); } catch (e) {}
    const h = location.hash, limpia = () => history.replaceState(null, '', location.pathname + location.search);
    const dev = /[?&]dev\b/.test(location.search);
    // desde la 0.2, todo el mundo con cuenta (también el dueño): la cartera de este dispositivo o la de GitHub
    // se sube a la cuenta en la bienvenida. #github (una vez) y ?dev quedan solo para pruebas.
    if (/[#&]github(?:&|$)/.test(h)) { m = 'github'; limpia(); }
    else if (/[#&](?:mia|cuenta)(?:&|$)/.test(h)) { m = 'cuenta'; limpia(); }
    else if (!dev) m = 'cuenta';
    else if (!['cuenta', 'local', 'github'].includes(m)) m = 'github';
    localStorage.setItem('inv-perfil', JSON.stringify(m));
    return m;
  } catch (e) { return 'github'; }
})();
const PERFIL_LOCAL = MODO !== 'github', PERFIL_CUENTA = MODO === 'cuenta';
const PRIVADAS = new Set(['inv-bloqueo', 'inv-bloqueo-t', 'inv-cache-enc', 'inv-pend-enc', 'inv-cuenta-enc', 'inv-pend-cuenta', 'inv-token', 'inv-asesor-clave', 'inv-asesor-clave-g', 'inv-asesor-conv', 'inv-asesor-cfg2', 'inv-ia-propio', 'inv-ia-agotados', 'inv-gkey-modo', 'inv-cache-ia', 'inv-oculto', 'inv-proy']);
const IDB_CLAVE = PERFIL_CUENTA ? 'clave-cuenta' : PERFIL_LOCAL ? 'clave-local' : 'clave';
const LS_SOBRA = ['inv-cache-tren', 'inv-cache-escaneo', 'inv-cache-hist', 'inv-cache-radar', 'inv-cache-informe', 'inv-cache-precios', 'inv-cache-cat', 'inv-cache-inst'];
/* 0.6d: con la cartera de prueba, lo que se escribe se queda en esta capa en memoria y se tira al salir: lo tuyo del
   dispositivo (ajustes, GrowIA, avisos vistos…) ni se lee si se ha cambiado en la prueba ni se toca */
let LS_DEMO = null;
/* y de lo tuyo, en la prueba solo se lee lo que no dice nada de ti: idioma, avisos vistos, cómo tienes cada pestaña y
   las copias de los datos públicos. Tu nombre, tu PIN, GrowIA, tus notas o tus avisos, no: como si no hubiera nada. */
const LS_DEMO_LEE = new Set([...LS_SOBRA, 'inv-version', 'inv-vnum', 'inv-idioma', 'inv-acceso', 'inv-asesor-cfg2', 'inv-ia-agotados', 'inv-gta', 'inv-gta-son', 'inv-resumen-off', 'inv-intro2', 'inv-estreno-02b', 'inv-ya-entro', 'inv-vista', 'inv-rango', 'inv-proy', 'inv-horizonte', 'inv-comparar', 'inv-bench', 'inv-mc', 'inv-mapa', 'inv-mapa-gesto', 'inv-mgrupo', 'inv-zona', 'inv-orden2', 'inv-orden-pos', 'inv-radar-solidas', 'inv-radar-min', 'inv-exp', 'inv-futtab', 'inv-frango', 'inv-fistab', 'inv-dim', 'inv-base', 'inv-car', 'inv-calif3', 'inv-ruta-plazo', 'inv-agmodo', 'inv-movil-ok', 'inv-guia', 'inv-guia-globo', 'inv-tour', 'inv-nov-vista', 'inv-nov-cerrada', 'inv-nov-04', 'inv-nov-030', 'inv-entrada-dia', 'inv-worker-dev', 'inv-repo', 'inv-gkey-modo', 'inv-023b-arr', 'inv-demo-salida']);
const LS = {
  k(k) { return PERFIL_LOCAL && PRIVADAS.has(k) ? (PERFIL_CUENTA ? 'invC-' : 'invL-') + k.slice(4) : k; },
  get(k, d = null) {
    if (LS_DEMO && LS_DEMO.has(k)) { const v = LS_DEMO.get(k); return v == null ? d : JSON.parse(v); }
    if (LS_DEMO && !LS_DEMO_LEE.has(k)) return d;
    try { const v = localStorage.getItem(this.k(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  },
  set(k, v) {
    if (LS_DEMO) { LS_DEMO.set(k, JSON.stringify(v)); return; }
    const kk = this.k(k), s = JSON.stringify(v);
    try { localStorage.setItem(kk, s); } catch (e) {
      // sin sitio (Safari da unos 5 MB): fuera las copias de datos públicos, que se vuelven a bajar, y otra vez. Así
      // nunca se queda sin guardar la cartera por culpa de una caché.
      try { for (const x of LS_SOBRA) if (x !== kk) localStorage.removeItem(x); localStorage.setItem(kk, s); } catch (e2) {}
    }
  },
  del(k) { if (LS_DEMO) { LS_DEMO.set(k, null); return; } try { localStorage.removeItem(this.k(k)); } catch (e) {} },
};
/* 0.7v: los diseños de Toisón (src/css/00-temas.css). El elegido va en data-tema de <html> y en localStorage
   «inv-tema» (fuera de LS: lo lee también el script de index.html antes de pintar). Sin elegir, Mármol (Carlos, 3 nov:
   en la 0.8 GrowFolio desaparece y cualquiera elige el suyo en Tú). El color de la barra del navegador sale del token
   --fondo del diseño, no de un color escrito aquí */
const TEMAS = ['marmol', 'marfil', 'borgona'];
const TEMA_BASE = 'marmol';
const temaActual = () => { const t = document.documentElement.getAttribute('data-tema'); return TEMAS.includes(t) ? t : TEMA_BASE; };
function colorBarraTema() {
  const m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
  const f = getComputedStyle(document.documentElement).getPropertyValue('--fondo').trim();
  if (f) m.setAttribute('content', f);
}
function ponerTema(t) {
  t = TEMAS.includes(t) ? t : TEMA_BASE;
  document.documentElement.setAttribute('data-tema', t);
  try { localStorage.setItem('inv-tema', JSON.stringify(t)); } catch (e) {}
  colorBarraTema();
  acabadoTema();
  temaApp();
}
/* 0.8: la app de Android pinta con el diseño elegido el widget, los avisos y las barras del móvil (Puente.tema; una
   app de antes no tiene esa función y no pasa nada) */
function temaApp() {
  try { if (window.InversionesApp && typeof InversionesApp.tema === 'function') InversionesApp.tema(temaActual()); } catch (e) {}
}
colorBarraTema();
temaApp();
/* el acabado de fondo de los diseños de Toisón (maqueta aprobada): un grano fino del color del texto (en Marfil, como
   de papel; cuánto se ve lo dice el token --grano) y, solo en Mármol, vetas finas con alguna de oro. Una capa fija
   detrás de todo, que no se toca ni se anima */
function acabadoTema() {
  if (!document.body) { document.addEventListener('DOMContentLoaded', acabadoTema, { once: true }); return; }
  const t = temaActual();
  let capa = document.getElementById('acabadoTema');
  if (capa && capa.dataset.t === t) return;
  if (!capa) { capa = document.createElement('div'); capa.id = 'acabadoTema'; capa.setAttribute('aria-hidden', 'true'); document.body.prepend(capa); }
  capa.dataset.t = t;
  let grano = '';
  try {
    const m = /^#([0-9a-f]{6})$/i.exec(getComputedStyle(document.documentElement).getPropertyValue('--texto').trim());
    const rgb = m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
    if (rgb) {
      const px = 96 * Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
      const c = document.createElement('canvas'); c.width = c.height = px;
      const x = c.getContext('2d'), im = x.createImageData(px, px), d = im.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = Math.random() < 0.5 ? Math.round(Math.random() * 255) : 0; }
      x.putImageData(im, 0, 0); grano = c.toDataURL('image/png');
    }
  } catch (e) {}
  // las vetas, siempre las mismas (semilla fija): cada una cruza la pantalla de lado a lado con curvas suaves
  let vetas = '';
  if (t === 'marmol') {
    let sem = 1430; const r = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
    const linea = (cls) => { let y0 = r() * 900, d = `M-20 ${y0.toFixed(0)}`; for (let x = 0; x < 420; x += 105) { const y1 = y0 + (r() - 0.45) * 260; d += `C${(x + 35).toFixed(0)} ${(y0 + (r() - 0.5) * 120).toFixed(0)} ${(x + 70).toFixed(0)} ${(y1 + (r() - 0.5) * 120).toFixed(0)} ${x + 105} ${y1.toFixed(0)}`; y0 = y1; } return `<path class="${cls}" d="${d}"/>`; };
    vetas = `<svg viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice">${['vb', 'vb', 'vb', 'vf', 'vf', 'vf', 'vf', 'vo', 'vo'].map(linea).join('')}</svg>`;
  }
  capa.innerHTML = `${grano ? `<i class="grano" style="background-image:url(${grano})"></i>` : ''}${vetas}`;
}
acabadoTema();
function cambiarPerfil(modo) {
  const m = modo === true ? 'local' : modo === false ? 'github' : modo;
  try { localStorage.setItem('inv-perfil', JSON.stringify(m)); } catch (e) {}
  location.replace(location.pathname + location.search);
}

/* ---------- configuración: usuario y repo salen de la propia dirección ---------- */
const CFG = (() => {
  const q = new URLSearchParams(location.search);
  let owner = 'charly10sf', repo = 'inversiones';
  if (location.hostname.endsWith('.github.io')) {
    owner = location.hostname.split('.')[0];
    repo = location.pathname.split('/').filter(Boolean)[0] || `${owner}.github.io`;
  } else {
    const c = LS.get('inv-repo');
    if (c && c.owner && c.repo) { owner = c.owner; repo = c.repo; }
  }
  return { dev: q.has('dev'), owner, repo, pages: `https://${owner}.github.io/${repo}/` };
})();

