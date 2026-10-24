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

