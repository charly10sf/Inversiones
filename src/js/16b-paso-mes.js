/* =====================================================================
   0.9 · El Paso a paso del modo fundador (maqueta del 15 nov, decidida entera: claude/decisiones-15nov-maqueta-paso-hoy.md)
   En el núcleo, solo lo pequeño: quién lo ve (pasoVisible), las doce opciones (qué paso sale de cuál), el mes ya repartido
   (mesRuta, con su caché) y el botón de arriba, en el hueco de GTA VI. El cálculo de cada paso (sus datos, su confianza por
   regla y sus cuentas comprobadas), los pasos de las opciones nuevas y la página van en el trozo «paso» (trozos/paso.js),
   que solo se baja en fundador: en estándar no pesa nada.
   La regla de la confianza: alta, solo con tus datos y precios al día; media, si depende de analistas, de la IA o de una
   noticia con dos fuentes; baja, con una fuente floja o con señales que se contradicen. Un dato viejo o que falta la baja
   un escalón (lo que falta de Hacienda, no: solo hace que el impuesto salga como un rango). Lo de confianza baja va aparte,
   en «Para decidir tú», y no cuenta como pendiente. Si una cuenta de un paso no cuadra, el paso se aparta entero.
   ===================================================================== */

// el Paso a paso solo existe en el modo fundador, con el modo de la cuenta ya leído (en un dispositivo nuevo, hasta leerla,
// no se enseña), y no se puede encender desde fuera: ?dev y #github valen solo en este ordenador (localhost)
// (function, no const: la usa también accesoInicial, 42-modos.js, que puede correr antes de llegar a esta línea)
function enEsteOrdenador() { return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }
function pasoVisible() {
  if (esPublico()) return false;
  if (!PERFIL_CUENTA || CFG.dev) return enEsteOrdenador();
  const a = LS.get('inv-acceso');
  return !(a && a.provisional);
}

/* ---------- las doce opciones: qué mira cada mes ---------- */
const OPC_APAGADAS = new Set(['oport', 'cripto']);
const opsRuta = () => (S.cartera && S.cartera.ruta && S.cartera.ruta.ops) || {};
const opRuta = (k) => { const o = opsRuta(); return o[k] != null ? !!o[k] : !OPC_APAGADAS.has(k); };
const umbralCaida = () => { const v = +((S.cartera && S.cartera.ruta) || {}).caida; return [10, 15, 20].includes(v) ? v : 10; };
// la opción de la que sale cada paso (por su id); los que no son de ninguna salen siempre
function opcionDe(o) {
  const id = String(o.id || '');
  if (/^venta:/.test(id)) return o.ref && o.ref.pl && o.ref.pl.nivel === 'reducir' ? 'limite' : null;
  const m = id.match(/^(limcripto|colchon|efectivo|compra|idea|perdida|res|div|aportd|reinv|caida|tesis|oport|cripto|costes):/);
  return m ? { limcripto: 'limite', colchon: 'efectivo', compra: 'idea', perdida: 'fiscal', res: 'fechas', div: 'fechas', aportd: 'aport' }[m[1]] || m[1] : null;
}
// «sin apuntar» es no haber escrito nada en Hacienda › Datos fiscales: un 0 escrito cuenta como apuntado (revisión del 15 nov:
// con «!otras && !rcm», quien no tiene otras ventas ni dividendos no podía quitar nunca el aviso, el rango ni el paso)
function fiscalSinApuntar(anio) { try { const d = datosFiscales(anio); return !(d.otras != null || d.rcm != null); } catch (e) { return true; } }
const CONF_N = { alta: 3, media: 2, baja: 1 };
const sinRed = () => navigator.onLine === false;
/* el mes del Paso a paso, ya repartido: lo que haces, lo que decides tú, lo apartado, las fechas y lo que va solo */
function mesRuta(M) {
  const vacio = { hacer: [], decidir: [], apartados: [], fechas: [], solos: [], espera: null, flujo: { sale: [], va: [] }, hac: 0, avisos: [], datosN: 0, P: { mes: [], seis: [], anio: [], largo: [] } };
  if (!M || !pasoVisible()) return vacio;
  // el cálculo está en el trozo «paso» (en estándar no se baja nunca); hasta que llega, nada, y al llegar se repinta
  if (typeof window.PASO_MES !== 'function') {
    if (!S.pasoBajando && typeof cargarTrozo === 'function') {
      S.pasoBajando = true;
      // al llegar no se repinta todo (borraría lo que otros trozos acaban de poner): el botón, «Tu mes» o la página
      cargarTrozo('paso').then(() => {
        cacheDe(M, '__ruta').delete('r'); if (S.M) cacheDe(S.M, '__ruta').delete('r');
        if (!S.cartera || !S.M) return;
        pintarPasoTop();
        const t = S.vista === 'cartera' && $('#vista .toca.iac');
        if (t) { t.outerHTML = htmlToca(S.M); if ($('[data-que-es]')) ponerQueEs($('#vista')); }
        if (S.vista === 'ruta' && $('#panelPaso')) pintarPasoMes();
      }, () => { S.pasoBajando = false; });
    }
    return vacio;
  }
  // se pinta en cada pintar() (el botón de arriba): se guarda mientras no cambie lo que lo decide
  const r = S.cartera.ruta || {}, ia = iaActual();
  const k = JSON.stringify([hoyIso(), sinRed(), r.hechos, r.ops, r.caida, r.pospuestos, S.cartera.perfil, S.cartera.fiscal, S.cartera.aportaciones, S.cartera.efectivo, S.precios && S.precios.radar_generado, ia && ia.fecha, S.escaneo && S.escaneo.generado]);
  const c = cacheDe(M, '__mes'), y = c.get('m');
  if (y && y.k === k) return y.v;
  const v = window.PASO_MES(M); c.set('m', { v, k });
  return v;
}
const pendientesMes = (R) => R.hacer.filter((x) => !x.hecho).length;

/* ---------- el botón, en el hueco de GTA VI: cuántos pasos quedan este mes ---------- */
const ICO_PASO_TOP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19h4.5v-4.7H13V9.6h4.5V5H21"/><path d="M4 19v-2.2"/></svg>';
function pintarPasoTop() {
  let w = $('#pasoTop');
  if (!w) return;
  const k = $('.k2-der'), fila = $('.top .fila-top');
  // en el ordenador va en la barra de la K2 (la cabecera de siempre se esconde); en el móvil, en la cabecera
  if (k && iaAlLado()) { if (w.parentElement !== k) k.prepend(w); } else if (fila && w.parentElement !== fila) fila.insertBefore(w, $('#estadoW'));
  if (!S.cartera || !pasoVisible()) { w.hidden = true; w.innerHTML = ''; return; }
  let R; try { R = mesRuta(S.M || calcular()); } catch (e) { w.hidden = true; return; }
  const n = pendientesMes(R), aqui = S.vista === 'ruta';
  const tit = n ? `Paso a paso: ${n} por hacer este mes` : 'Paso a paso: nada pendiente este mes';
  w.hidden = false;
  w.innerHTML = `<a class="pb${aqui ? ' aqui' : ''}" href="#ruta" data-ir="ruta" title="${tit}" aria-label="${tit}"${aqui ? ' aria-current="page"' : ''}>${ICO_PASO_TOP}<span class="pb-t">Paso a paso</span><b class="pb-n${n ? '' : ' fin'}">${n || '✓'}</b></a>`;
}
