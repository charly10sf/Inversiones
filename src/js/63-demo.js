/* =====================================================================
   0.6d · La cartera de prueba (Ajustes): para enseñar GrowFolio a alguien sin que vea lo tuyo. Una cartera inventada,
   con fondos, acciones del radar y cripto a precios de hoy, que solo vive en la memoria de esta pestaña:
   - nada se guarda (cifrarCon se niega a cifrar una cartera con demo: true, y guardarLocal, guardarCartera,
     guardarCarteraCallada, guardarConv y guardarAnalisisPropio no hacen nada);
   - lo que llega de tu cuenta desde otro dispositivo no entra mientras dura;
   - al salir (o al recargar) se vuelve a abrir tu cartera de siempre, y si tienes PIN, lo pide.
   ===================================================================== */
// lo que lleva: { catálogo o radar, plataforma, euros de hoy, lo que lleva ganado en %, desde }
const DEMO_POS = [
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
function carteraDemo() {
  const posiciones = [];
  for (const x of DEMO_POS) {
    let id = null;
    try { id = x.inst && S.inst[x.inst] ? x.inst : x.cat ? instDeCatalogo(x.cat) : x.sim ? instDeRadar(x.sim) : null; } catch (e) { id = null; }
    const p = id && precioInst(id);
    if (!id || !p || !(p > 0)) continue;
    const cantidad = Math.round((x.eur / p) * 10000) / 10000;
    if (!(cantidad > 0)) continue;
    // el nombre corto, el de siempre («Inditex» y no «Industria de Diseño»); solo en memoria, como todo lo de la prueba
    if (x.c && S.inst[id]) S.inst[id].corto = x.c;
    posiciones.push({ id: 'demo' + (posiciones.length + 1), instrumento: id, plataforma: x.pl, cantidad, coste: Math.round((cantidad * p) / (1 + x.g / 100) * 100) / 100, fecha: x.d });
  }
  const fondo = posiciones[0] && posiciones[0].instrumento, h = new Date();
  const proximoMes = `${h.getMonth() === 11 ? h.getFullYear() + 1 : h.getFullYear()}-${String((h.getMonth() + 1) % 12 + 1).padStart(2, '0')}-01`;
  return {
    demo: true, version: 1, posiciones,
    efectivo: [{ plataforma: 'Trade Republic', importe: 350 }],
    // desde el mes que viene: si no, GrowFolio sumaría las de los meses de atrás (desde la compra) a lo que ya tiene
    aportaciones: fondo ? [{ id: 'demo-a1', instrumento: fondo, plataforma: 'MyInvestor', importe: 200, dia: 5, desde: proximoMes }] : [],
    limite_acciones: 25,
    perfil: { nombre: 'Marta', edad: 31, horizonte: 15, riesgo: 'medio', inicio_inversion: '2023-03' },
    metas: [{ id: 'demo-m1', n: 'Entrada del piso', importe: 30000, anio: new Date().getFullYear() + 4 }],
    inicio: { v03: true, v07: true, bloques: ['patrimonio', 'mapa', 'posiciones', 'ia', 'reparto', 'agenda'] },
  };
}
function entrarDemo() {
  if (S.demo || !S.cartera) return;
  const c = carteraDemo();
  if (c.posiciones.length < 3) { toast(L('Ahora no se puede: faltan los precios de hoy. Prueba en un momento.', "Can't right now: today's prices are missing. Try again in a moment."), 5000); return; }
  // desde aquí, nada de lo tuyo en memoria: la cartera, GrowIA (su conversación, su foto y su análisis) y el modo
  S.demo = true;
  S.cartera = c; S.M = null; S.mcSel = null; S.ficha = null;
  S.iaPropio = null; S.senalesSucias = false;
  if (typeof AS !== 'undefined') Object.assign(AS, { conv: [], api: [], foto: null, fotoT: 0 });
  if (typeof IA !== 'undefined') { clearTimeout(IA.reintentoT); IA.error = null; }
  document.body.classList.add('en-demo');
  if (!$('#demoBanda')) document.body.insertAdjacentHTML('beforeend', `<div class="demo-banda" id="demoBanda" role="status"><span>${ICONOS.ojo || ''}${L('Cartera de prueba: nada es tuyo y nada se guarda', 'Demo portfolio: nothing is yours and nothing is saved')}</span><button type="button" class="btn peq" data-accion="demo-salir">${L('Salir', 'Exit')}</button></div>`);
  location.hash = '#cartera';
  pintar();
  toast(L('Cartera de prueba puesta. Tu cartera no se toca: al salir, vuelve.', 'Demo portfolio on. Yours is untouched: it comes back when you exit.'), 5000);
}
// al salir se vuelve a abrir todo desde lo guardado (que no ha cambiado); con PIN, se pide antes de enseñarlo
function salirDemo() {
  if (!S.demo) return;
  if (typeof cfgBloqueo === 'function' && cfgBloqueo() && cfgBloqueo().pin) LS.del('inv-bloqueo-t');
  location.reload();
}
