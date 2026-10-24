/* =====================================================================
   0.6d · La cartera de prueba (Ajustes): para enseñar GrowFolio a alguien sin que vea lo tuyo.
   Va aparte de tu sesión: al entrar, GrowFolio se vuelve a abrir en esta pestaña sin abrir tu cartera (no se lee ni
   se descifra: ni está en memoria) y con una inventada, de fondos, acciones del radar y cripto a precios de hoy.
   - Lo que se escribe en el dispositivo durante la prueba se queda en memoria (LS_DEMO, 01-base.js) y se tira al
     salir; y nada se cifra ni se sube (cifrarCon y los guardados se niegan con S.demo).
   - GrowIA contesta con tu clave de Google: al entrar se cifra con una clave de un solo uso que vive en esta pestaña
     (sessionStorage) y se borra al salir.
   - Al salir (o si se cierra y se vuelve a abrir), con PIN se pide el PIN; sin PIN, la contraseña (y antes de entrar
     se comprueba que la sabes). Recargar, cambiar de idioma o actualizar no sacan de la prueba: siguen en ella.
   - De lo tuyo del dispositivo solo se lee lo que no dice nada de ti (LS_DEMO_LEE): ni tu nombre ni tu PIN.
   ===================================================================== */
function demoActiva() { try { return !!sessionStorage.getItem('inv-demo'); } catch (e) { return false; } }
function carteraDemo() {
  // lo que lleva: del catálogo, del radar o de instrumentos.json; plataforma, euros de hoy, lo ganado en % y desde
  const POS = [
    { cat: 'c-ie00b03hd191', c: 'MSCI World', pl: 'MyInvestor', eur: 9200, g: 14, d: '2023-03-06' },
    { cat: 'c-ie0031786696', c: 'Emergentes', pl: 'MyInvestor', eur: 2100, g: 6, d: '2023-09-04' },
    { cat: 'c-ie00b18gc888', c: 'Renta fija global', pl: 'MyInvestor', eur: 2600, g: 1.5, d: '2024-02-05' },
    { sim: 'ITX.MC', c: 'Inditex', pl: 'Trade Republic', eur: 1500, g: 22, d: '2024-05-13' },
    { sim: 'IBE.MC', c: 'Iberdrola', pl: 'Trade Republic', eur: 1250, g: 18, d: '2024-06-10' },
    { sim: 'AAPL', c: 'Apple', pl: 'Trade Republic', eur: 1100, g: 9, d: '2025-01-15' },
    { sim: 'ASML.AS', c: 'ASML', pl: 'Trade Republic', eur: 950, g: -7, d: '2025-03-12' },
    { inst: 'btc', pl: 'Bitvavo', eur: 900, g: 35, d: '2024-01-22' },
    { cat: 'c-eth-eur', c: 'Ethereum', pl: 'Bitvavo', eur: 450, g: -12, d: '2024-11-18' },
  ];
  const posiciones = [];
  for (const x of POS) {
    let id = null;
    try { id = x.inst && S.inst[x.inst] ? x.inst : x.cat ? instDeCatalogo(x.cat) : x.sim ? instDeRadar(x.sim) : null; } catch (e) { id = null; }
    const p = id && precioInst(id);
    if (!id || !p || !(p > 0)) continue;
    const cantidad = Math.round((x.eur / p) * 10000) / 10000;
    if (!(cantidad > 0)) continue;
    if (x.c && S.inst[id]) S.inst[id].corto = x.c;  // «Inditex» y no «Industria de Diseño»
    posiciones.push({ id: 'demo' + (posiciones.length + 1), instrumento: id, plataforma: x.pl, cantidad, coste: Math.round((cantidad * p) / (1 + x.g / 100) * 100) / 100, fecha: x.d });
  }
  const fondo = posiciones[0] && posiciones[0].instrumento, h = new Date();
  // la aportación, desde el mes que viene: si no, GrowFolio sumaría las de los meses de atrás a lo que ya tiene
  const proximoMes = `${h.getMonth() === 11 ? h.getFullYear() + 1 : h.getFullYear()}-${String((h.getMonth() + 1) % 12 + 1).padStart(2, '0')}-01`;
  return {
    demo: true, version: 1, posiciones,
    efectivo: [{ plataforma: 'Trade Republic', importe: 350 }],
    aportaciones: fondo ? [{ id: 'demo-a1', instrumento: fondo, plataforma: 'MyInvestor', importe: 200, dia: 5, desde: proximoMes }] : [],
    limite_acciones: 25,
    perfil: { nombre: 'Marta', edad: 31, horizonte: 15, riesgo: 'medio', inicio_inversion: '2023-03' },
    metas: [{ id: 'demo-m1', n: 'Entrada del piso', importe: 30000, anio: h.getFullYear() + 4 }],
    inicio: { v03: true, v07: true, bloques: ['patrimonio', 'mapa', 'posiciones', 'ia', 'reparto', 'agenda'] },
  };
}
/* desde tu sesión: lo tuyo pendiente se guarda, la clave de Google pasa cifrada a esta pestaña, se marca que al volver
   hay que pedir el PIN (o la contraseña) y se vuelve a abrir GrowFolio en la prueba */
async function entrarDemo() {
  if (S.demo || demoActiva()) return;
  const pin = !!(cfgBloqueo() && cfgBloqueo().pin);
  // sin PIN, al salir se pide la contraseña: antes de entrar se comprueba que la sabes (si no, te quedarías fuera)
  if (!pin && S.kv) {
    const ok = await claveConContrasena(L('Al salir de la cartera de prueba te la pediré para volver a la tuya. Escríbela para comprobar que la tienes (o pon un PIN en Ajustes).', "When you leave the demo portfolio I'll ask for it to bring yours back. Type it to check you have it (or set a PIN in Settings)."));
    if (!ok) return;
  }
  // lo tuyo que esté a medio guardar, ahora (si no hay nada, no se toca)
  if (S.senalesSucias || ceGuardarT || S.guardandoSenales) { clearTimeout(ceGuardarT); ceGuardarT = 0; S.senalesSucias = false; try { await conTiempo(guardarCarteraCallada('Antes de la cartera de prueba'), 8000); } catch (e) {} }
  if (PERFIL_CUENTA && LS.get('inv-pend-cuenta')) { try { await conTiempo(sincronizarCuenta(), 8000); } catch (e) {} }
  let g = null;
  try {
    await cargarAsesor();
    if (AS.clave) {
      const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, TE.encode(AS.clave)));
      localStorage.setItem('inv-demo-g', JSON.stringify({ iv: b64.enc(iv), ct: b64.enc(ct), t: Date.now() }));
      g = b64.enc(new Uint8Array(await crypto.subtle.exportKey('raw', k)));
    }
  } catch (e) { g = null; }
  try { sessionStorage.setItem('inv-demo', JSON.stringify({ g, t: Date.now() })); } catch (e) { toast(L('Este navegador no deja abrir la cartera de prueba.', "This browser can't open the demo portfolio.")); return; }
  // las demás pestañas abiertas con tu cartera la cierran (ver abajo), y con PIN se pedirá aunque desbloquearas hace poco
  LS.set('inv-demo-salida', true);
  if (pin) LS.del('inv-bloqueo-t');
  // el widget de Android, con las cifras tapadas mientras dure la prueba
  const o = S.oculto; S.oculto = true; try { enviarWidget(true); } catch (e) {} S.oculto = o;
  // al cerrar Ajustes se vuelve atrás en el historial: si se recarga a la vez, el navegador se queda con lo de atrás
  await dormir(600);
  location.reload();
}
// al arrancar en la prueba (62-arranque.js): sin abrir tu cartera
async function arrancarDemo() {
  S.demo = true; S.key = null; S.enc = null; S.kv = null; S.iaPropio = null; S.iaRemoto = null; S.iaListo = true;
  let c = carteraDemo();
  // los precios del radar o del catálogo pueden tardar un poco: se espera hasta 6 s
  for (let i = 0; i < 6 && c.posiciones.length < 5; i++) { await dormir(1000); c = carteraDemo(); }
  S.cartera = c;
  // GrowIA: con tu clave de Google, si la tenías
  try {
    const d = JSON.parse(sessionStorage.getItem('inv-demo') || '{}'), x = JSON.parse(localStorage.getItem('inv-demo-g') || 'null');
    // la clave de Google vale 24 horas en la prueba; después, sin GrowIA hasta que salgas y vuelvas a entrar
    if (d.g && x && Date.now() - (x.t || d.t || 0) < 864e5) {
      const k = await crypto.subtle.importKey('raw', b64.dec(d.g), 'AES-GCM', false, ['decrypt']);
      AS.claves.google = TD.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(x.iv) }, k, b64.dec(x.ct)));
    }
  } catch (e) { console.warn('GrowIA en la prueba', e); }
  AS.cargada = true;
  S.vista = 'cartera';
  setTimeout(() => cargarHistCatalogo().then((n) => { if (n) pintar(); }), 50);
  montar();
  pintar();
  LIVE.iniciar();
  clearInterval(tickPrecios); clearInterval(tickEstado);
  tickPrecios = setInterval(() => { if (!document.hidden) recargarPrecios(); }, 120000);
  tickEstado = setInterval(programarParche, 30000);
  if (!$('#demoBanda')) document.body.insertAdjacentHTML('beforeend', `<div class="demo-banda" id="demoBanda" role="status"><span>${ICONOS.ojo}${L('Cartera de prueba: nada es tuyo y nada se guarda', 'Demo portfolio: nothing is yours and nothing is saved')}</span><button type="button" class="btn peq" data-accion="demo-salir">${L('Salir', 'Exit')}</button></div>`);
}
function salirDemo() {
  try {
    sessionStorage.removeItem('inv-demo'); localStorage.removeItem('inv-demo-g');
    // aunque otra pestaña haya vuelto a la suya mientras: al salir, siempre el PIN (o la contraseña)
    localStorage.setItem('inv-demo-salida', 'true'); localStorage.removeItem(LS.k('inv-bloqueo-t'));
  } catch (e) {}
  location.reload();
}
/* las demás pestañas: si en una se abre la prueba, las que tienen tu cartera abierta la cierran y piden el PIN o la
   contraseña. Y si el navegador vuelve a enseñar una página guardada (atrás/adelante), se vuelve a abrir. */
window.addEventListener('storage', (e) => {
  if (e.key !== 'inv-demo-salida' || e.newValue !== 'true' || S.demo || !S.cartera) return;
  S.cartera = null; S.key = null; location.reload();
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted && (S.demo ? !demoActiva() : demoActiva() || LS.get('inv-demo-salida', false))) location.reload();
});
// lo que quede de una prueba cerrada sin salir (la clave cifrada de GrowIA, sin su clave ya): fuera al día siguiente
try { const x = JSON.parse(localStorage.getItem('inv-demo-g') || 'null'); if (x && !(Date.now() - (x.t || 0) < 864e5)) localStorage.removeItem('inv-demo-g'); } catch (e) {}
// en la prueba, Ajustes solo enseña cómo salir y el tutorial: nada de tu cuenta, tu PIN, tu código ni tu copia
function ajustesDemo() {
  const h = hoja(L('Cartera de prueba', 'Demo portfolio'), `<div class="aj-caja">
    <div class="seccion-ed"><p>${L('Estás enseñando GrowFolio con una cartera inventada. Tu cartera no está abierta: nada de lo que se haga aquí se guarda ni la toca.', "You're showing GrowFolio with a made-up portfolio. Yours isn't open: nothing done here is saved or touches it.")}</p></div>
    <button class="aj-fila" id="aDemoSalir">${ICONOS.ojo}<span><b>${L('Salir de la cartera de prueba', 'Exit the demo portfolio')}</b><small>${L('Vuelve tu cartera: te pedirá tu PIN o tu contraseña. En la app de Android, el widget tapa las cifras mientras tanto.', 'Your portfolio comes back: it will ask for your PIN or password. On the Android app, the widget hides the figures meanwhile.')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
    <button class="aj-fila" id="aDemoTour" data-cerrar>${ICONOS.ruta}<span><b>${L('Ver el tutorial', 'See the tutorial')}</b><small>${L('Un repaso de un minuto por cada pestaña.', 'A one-minute tour of each tab.')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
  </div>`);
  $('#aDemoSalir', h.el).onclick = () => salirDemo();
  $('#aDemoTour', h.el).onclick = () => setTimeout(() => iniciarTour(0), 0);
}
