/* =====================================================================
   0.6d · La cartera de prueba (Ajustes): para enseñar GrowFolio a alguien sin que vea lo tuyo.
   Va aparte de tu sesión: al entrar, GrowFolio se vuelve a abrir en esta pestaña sin abrir tu cartera (no se lee ni
   se descifra: ni está en memoria) y con una inventada, de fondos, acciones del radar y cripto a precios de hoy.
   - Lo que se escribe en el dispositivo durante la prueba se queda en memoria (LS_DEMO, 01-base.js) y se tira al
     salir; y nada se cifra ni se sube (cifrarCon y los guardados se niegan con S.demo).
   - GrowIA contesta con tu clave de Google: al entrar se cifra con una clave de un solo uso que vive en esta pestaña
     (sessionStorage) y se borra al salir.
   - Al salir (o si se cierra y se vuelve a abrir), con PIN se pide el PIN; sin PIN, la contraseña. Recargar, cambiar
     de idioma o actualizar no sacan de la prueba: siguen en ella.
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
  try { await conTiempo(guardarCarteraCallada('Antes de la cartera de prueba'), 8000); } catch (e) {}
  let g = null;
  try {
    await cargarAsesor();
    if (AS.clave) {
      const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, TE.encode(AS.clave)));
      localStorage.setItem('inv-demo-g', JSON.stringify({ iv: b64.enc(iv), ct: b64.enc(ct) }));
      g = b64.enc(new Uint8Array(await crypto.subtle.exportKey('raw', k)));
    }
  } catch (e) { g = null; }
  LS.set('inv-demo-salida', true);
  if (cfgBloqueo() && cfgBloqueo().pin) LS.del('inv-bloqueo-t');
  try { sessionStorage.setItem('inv-demo', JSON.stringify({ g, t: Date.now() })); } catch (e) { toast(L('Este navegador no deja abrir la cartera de prueba.', "This browser can't open the demo portfolio.")); return; }
  // al cerrar Ajustes se vuelve atrás en el historial: si se recarga a la vez, el navegador se queda con lo de atrás
  await dormir(600);
  location.reload();
}
// al arrancar en la prueba (62-arranque.js): sin abrir tu cartera
async function arrancarDemo() {
  S.demo = true; S.key = null; S.enc = null; S.iaPropio = null; S.iaRemoto = null;
  let c = carteraDemo();
  // los precios del radar o del catálogo pueden tardar un poco: se espera hasta 6 s
  for (let i = 0; i < 6 && c.posiciones.length < 5; i++) { await dormir(1000); c = carteraDemo(); }
  S.cartera = c;
  // GrowIA: con tu clave de Google, si la tenías
  try {
    const d = JSON.parse(sessionStorage.getItem('inv-demo') || '{}'), x = JSON.parse(localStorage.getItem('inv-demo-g') || 'null');
    if (d.g && x) {
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
  try { sessionStorage.removeItem('inv-demo'); localStorage.removeItem('inv-demo-g'); } catch (e) {}
  location.reload();
}
// en la prueba, Ajustes solo enseña cómo salir y el tutorial: nada de tu cuenta, tu PIN, tu código ni tu copia
function ajustesDemo() {
  const h = hoja(L('Cartera de prueba', 'Demo portfolio'), `<div class="aj-caja">
    <div class="seccion-ed"><p>${L('Estás enseñando GrowFolio con una cartera inventada. Tu cartera no está abierta: nada de lo que se haga aquí se guarda ni la toca.', "You're showing GrowFolio with a made-up portfolio. Yours isn't open: nothing done here is saved or touches it.")}</p></div>
    <button class="aj-fila" id="aDemoSalir">${ICONOS.ojo}<span><b>${L('Salir de la cartera de prueba', 'Exit the demo portfolio')}</b><small>${L('Vuelve tu cartera: te pedirá tu PIN o tu contraseña.', 'Your portfolio comes back: it will ask for your PIN or password.')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
    <button class="aj-fila" id="aDemoTour" data-cerrar>${ICONOS.ruta}<span><b>${L('Ver el tutorial', 'See the tutorial')}</b><small>${L('Un repaso de un minuto por cada pestaña.', 'A one-minute tour of each tab.')}</small></span><i class="aj-flecha" aria-hidden="true"></i></button>
  </div>`);
  $('#aDemoSalir', h.el).onclick = () => salirDemo();
  $('#aDemoTour', h.el).onclick = () => setTimeout(() => iniciarTour(0), 0);
}
