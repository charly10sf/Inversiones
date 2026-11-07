/* ---------- 0.8.3: la mudanza a toison.es/app ----------
   La app vivía en charly10sf.github.io/Inversiones/ y pasa a toison.es/app/ (Firebase Hosting; GitHub Pages no admite un
   negocio). Cada dirección guarda lo suyo en el navegador (localStorage: la cartera cifrada si no hay cuenta, lo pendiente
   de subir, el diseño, el idioma, el PIN…), así que lo de este dispositivo se lleva una vez:
   - En el navegador: en la dirección vieja sale un aviso con «Llevar mis datos». Abre la nueva en otra pestaña
     (#mudanza); la nueva le dice «lista» a la vieja (postMessage, solo a su origen), la vieja le manda lo suyo y la nueva
     lo guarda sin pisar nada de lo que ya tuviera. Nada viaja por la dirección (no queda en el historial) ni pasa por
     ningún servidor. Desde entonces la vieja salta sola a la nueva.
   - En la app de Android (desde la compilación que trae InversionesApp.mudanza): la vieja le da sus datos a la app, la app
     se cambia a la dirección nueva y la nueva los recoge (InversionesApp.mudanzaDatos). Con una app de antes, un aviso de
     que hay que actualizarla.
   No empieza hasta que toison.es/app contesta con su version.json (es decir, hasta que Carlos la publique allí).
   Lo que no viaja: la clave recordada (IndexedDB guarda una CryptoKey que no se puede sacar, a propósito) y la sesión de
   la cuenta (Firebase la guarda por dirección): en la nueva se entra una vez con la contraseña.
   Las pruebas la hacen entre 127.0.0.1 (la vieja) y localhost (la nueva) con window.MUDANZA_PRUEBA (tests/mudanza.spec.js). */
const MUDANZA = {
  nueva: 'https://toison.es/app/',
  viejo: 'https://charly10sf.github.io',
  // lo que no se lleva: las copias de los datos públicos (se vuelven a bajar), la sesión de Firebase y las marcas de la mudanza
  fuera: (k) => LS_SOBRA.includes(k) || /^(firebase|inv-mudada$|inv-mudanza-)/.test(k),
  espera: 15000,
  auto: true,   // revisarMudanza al abrir (62-arranque.js); las pruebas la llaman ellas
};
// en las pruebas (solo en localhost) se hace entre localhost y 127.0.0.1, que son dos direcciones distintas para el navegador
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && window.MUDANZA_PRUEBA && typeof window.MUDANZA_PRUEBA.nueva === 'string') Object.assign(MUDANZA, window.MUDANZA_PRUEBA);
const origenDe = (url) => { try { return new URL(url).origin; } catch (e) { return ''; } };
const enCasaVieja = () => location.origin === MUDANZA.viejo;

/* todo lo de este dispositivo, tal cual (textos de localStorage) */
function datosMudanza() {
  const d = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && !MUDANZA.fuera(k)) d[k] = localStorage.getItem(k);
  }
  return d;
}

/* en la dirección nueva: guarda lo que llega sin pisar lo que ya hubiera. Devuelve cuántas cosas ha guardado */
function guardarMudanza(d) {
  let n = 0;
  if (!d || typeof d !== 'object') return 0;
  for (const [k, v] of Object.entries(d)) {
    if (typeof k !== 'string' || typeof v !== 'string' || MUDANZA.fuera(k)) continue;
    try { if (localStorage.getItem(k) === null) { localStorage.setItem(k, v); n++; } } catch (e) { /* sin sitio: lo demás sí */ }
  }
  try { localStorage.setItem('inv-mudanza-traida', JSON.stringify(new Date().toISOString())); } catch (e) {}
  return n;
}

/* ¿ya está la casa nueva? (su version.json, que en Firebase Hosting lleva permiso para que lo lea la dirección vieja) */
async function casaNuevaLista() {
  try {
    const r = await fetch(MUDANZA.nueva + 'version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return false;
    const v = await r.json();
    return !!(v && v.v);
  } catch (e) { return false; }
}

/* ---- en la dirección nueva, al abrir con #mudanza: recoger. Devuelve true si se encarga ella del arranque ---- */
function recibirMudanza() {
  if (enCasaVieja()) return false;
  const limpia = () => { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} };
  const seguir = () => { limpia(); location.replace(location.pathname + location.search); };
  // la app de Android ya trae los datos (también si se cerró antes de recogerlos: se miran en cada arranque hasta que llegan)
  try {
    if (window.InversionesApp && typeof InversionesApp.mudanzaDatos === 'function') {
      const j = InversionesApp.mudanzaDatos();
      if (j) { guardarMudanza(JSON.parse(j)); try { InversionesApp.mudanzaHecha(); } catch (e) {} seguir(); return true; }
    }
  } catch (e) { console.warn('mudanza (app)', e); }
  if (!/^#mudanza\b/.test(location.hash)) return false;
  const viejo = window.opener;
  if (!viejo) { limpia(); return false; }
  $('#app').innerHTML = `<div class="pantalla"><div class="caja mudanza-caja" role="status" aria-live="polite"><div class="mudanza-simb">${simboloTs()}</div><h1>${L('Trayendo tus datos', 'Bringing your data over')}</h1><p data-mud>${L('Toisón se muda a toison.es. Estamos pasando lo de este dispositivo desde la dirección de antes; tarda un momento.', 'Toisón is moving to toison.es. We are bringing this device’s data over from the old address; it takes a moment.')}</p></div></div>`;
  let hecho = false;
  const fallo = setTimeout(() => {
    if (hecho) return;
    const p = $('[data-mud]');
    if (p) p.outerHTML = `<p>${L('No han llegado los datos de la dirección de antes. Vuelve a esa pestaña y toca otra vez «Llevar mis datos», o sigue sin ellos (si tienes cuenta, tu cartera está en ella).', 'The data from the old address did not arrive. Go back to that tab and tap “Bring my data” again, or continue without it (if you have an account, your portfolio is in it).')}</p><button class="btn pri" type="button" data-mud-seguir>${L('Seguir sin ellos', 'Continue without it')}</button>`;
    const b = $('[data-mud-seguir]'); if (b) b.onclick = seguir;
  }, MUDANZA.espera);
  window.addEventListener('message', (e) => {
    if (hecho || e.origin !== MUDANZA.viejo || e.source !== viejo || !e.data || e.data.t !== 'toison-mudanza-datos') return;
    hecho = true; clearTimeout(fallo);
    const n = guardarMudanza(e.data.d);
    try { viejo.postMessage({ t: 'toison-mudanza-ok', n }, MUDANZA.viejo); } catch (er) {}
    seguir();
  });
  try { viejo.postMessage({ t: 'toison-mudanza-lista' }, MUDANZA.viejo); } catch (e) { console.warn('mudanza', e); }
  return true;
}

/* ---- en la dirección vieja: mandar ---- */
function mandarMudanza(alAcabar) {
  // la app de Android que ya sabe mudarse: le da los datos y ella carga la dirección nueva
  if (window.InversionesApp && typeof InversionesApp.mudanza === 'function') {
    LS.set('inv-mudada', new Date().toISOString());
    try { InversionesApp.mudanza(JSON.stringify(datosMudanza())); } catch (e) { toast(L('No se ha podido llevar: inténtalo otra vez.', 'It could not be moved: try again.')); }
    return;
  }
  const w = window.open(MUDANZA.nueva + '#mudanza', '_blank');
  if (!w) { toast(L('El navegador no ha dejado abrir la pestaña nueva: permite las ventanas emergentes de esta web y vuelve a tocar.', 'The browser blocked the new tab: allow pop-ups for this site and tap again.'), 7000); return; }
  const nuevo = origenDe(MUDANZA.nueva);
  const oir = (e) => {
    if (e.origin !== nuevo || e.source !== w || !e.data) return;
    if (e.data.t === 'toison-mudanza-lista') w.postMessage({ t: 'toison-mudanza-datos', d: datosMudanza(), v: VERSION }, nuevo);
    else if (e.data.t === 'toison-mudanza-ok') {
      window.removeEventListener('message', oir);
      LS.set('inv-mudada', new Date().toISOString());
      if (alAcabar) alAcabar(e.data.n);
    }
  };
  window.addEventListener('message', oir);
}

/* el aviso, en la dirección vieja */
function hojaMudanza() {
  const h = hoja(L('Toisón se muda a toison.es', 'Toisón is moving to toison.es'), `<p>${L('La app pasa a <b>toison.es/app</b>. Es la misma Toisón, en su casa. Lo que tienes en este dispositivo (la cartera, si no tienes cuenta, el diseño, los ajustes) se queda en esta dirección hasta que lo lleves.', 'The app is moving to <b>toison.es/app</b>. Same Toisón, in its own home. What you have on this device (your portfolio if you have no account, the design, your settings) stays at this address until you bring it over.')}</p>
    <p>${L('Al tocar el botón se abre la dirección nueva y se lleva todo en un momento, sin pasar por ningún servidor. Allí entrarás una vez con tu contraseña.', 'Tapping the button opens the new address and brings everything over in a moment, without going through any server. There you will sign in once with your password.')}</p>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Luego', 'Later')}</button><button type="button" class="btn pri" data-mud-ir>${L('Llevar mis datos', 'Bring my data')}</button></div>`);
  $('[data-mud-ir]', h.el).onclick = () => mandarMudanza(() => {
    h.cerrar(true);
    toast(L('Ya está: Toisón sigue en toison.es.', 'Done: Toisón continues at toison.es.'), 4000);
    setTimeout(() => location.replace(MUDANZA.nueva + location.hash), 1200);
  });
}

/* al abrir la dirección vieja: si ya te mudaste, a la nueva; si la nueva ya existe, el aviso (una vez al día) */
async function revisarMudanza() {
  if (!enCasaVieja() || CFG.dev) return;
  const app = window.InversionesApp;
  if (LS.get('inv-mudada', null) && !app) { location.replace(MUDANZA.nueva + location.hash); return; }
  if (!(await casaNuevaLista())) return;
  if (app && typeof app.mudanza !== 'function') {
    toast(L('Toisón se muda a toison.es: actualiza la app de Android (Ajustes > App de Android) para llevarte tus datos.', 'Toisón is moving to toison.es: update the Android app (Settings > Android app) to bring your data over.'), 9000);
    return;
  }
  if (app) return void mandarMudanza();   // en la app nueva no hace falta preguntar: es la misma app, cambia de dirección
  if (LS.get('inv-mudanza-aviso', '') === hoyIso()) return;
  LS.set('inv-mudanza-aviso', hoyIso());
  if (document.querySelector('.hoja-fondo, .intro, .tour')) return;   // ya hay algo delante: mañana
  hojaMudanza();
}
