/* =====================================================================
   Eventos: un solo oyente para toda la página (las vistas se vuelven a pintar a menudo)
   ===================================================================== */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-bench],[data-car],[data-rango],[data-frango],[data-dim],[data-base],[data-calif],[data-pos],[data-accion],[data-zona],[data-orden],[data-radar-todo],[data-ftab],[data-horizonte],[data-proy-reset],[data-orden-pos],[data-ruta],[data-exp],[data-plazo],[data-fut],[data-resp],[data-fis]');
  if (!t || !S.cartera) return;
  const d = t.dataset;
  if (d.rango) {
    // la primera vez que tocas «Inicio», te pregunta desde cuándo inviertes (no desde que usas GrowFolio)
    if (d.rango === 'Inicio' && !((S.cartera.perfil || {}).inicio_inversion)) preguntarInicio(() => { S.rango = 'Inicio'; LS.set('inv-rango', S.rango); pintar(); });
    else { S.rango = d.rango; LS.set('inv-rango', S.rango); pintar(); }
  }
  else if (d.bench) { S.bench = benchDe(d.bench).id; LS.set('inv-bench', S.bench); pintar(); }
  else if (d.ruta) marcarRuta(d.ruta);
  else if (d.exp) { S.expTab = d.exp; LS.set('inv-exp', S.expTab); if (S.vista !== 'expertos') { e.preventDefault(); location.hash = 'expertos'; return; } pintar(); if (!t.closest('.subvistas')) irArriba('.subvistas'); }
  else if (d.plazo) { S.rutaPlazo = d.plazo; LS.set('inv-ruta-plazo', S.rutaPlazo); for (const b of $$('[data-plazo]')) b.setAttribute('aria-pressed', b.dataset.plazo === S.rutaPlazo); const r = $('.ruta'); if (r) r.dataset.sel = S.rutaPlazo; }
  else if (d.ordenPos) cambiarOrden(d.ordenPos);
  else if ('proyReset' in d) { const c = { ...(S.proy || {}) }; delete c.aport; S.proy = c; LS.set('inv-proy', c); pintar(); }
  else if (d.horizonte) { S.horizonte = +d.horizonte; LS.set('inv-horizonte', S.horizonte); pintar(); }
  else if (d.frango) { S.fichaRango = d.frango; LS.set('inv-frango', S.fichaRango); refrescarFicha(); }
  else if (d.ftab) { S.ficha.tab = d.ftab; refrescarFicha(); const c = $('#fichaFondo .ficha'); if (c) c.scrollTop = 0; }
  else if (d.dim) { S.dim = d.dim; LS.set('inv-dim', S.dim); pintar(); }
  else if (d.base) { S.base = d.base; LS.set('inv-base', S.base); pintar(); }
  else if (d.calif) {
    if (d.calif === 'ruta' || d.calif === 'impuestos') { e.preventDefault(); location.hash = d.calif === 'ruta' ? 'ruta' : 'fiscal'; return; }
    if (NUMEROS.includes(d.calif)) { S.numAbierto = d.calif; S.califTab = 'numeros'; } else S.califTab = d.calif;
    LS.set('inv-calif3', S.califTab);
    if (S.vista !== 'analisis') { e.preventDefault(); S.vista = 'analisis'; location.hash = 'analisis'; }
    pintar();
    if (S.numAbierto) setTimeout(() => { const el = $(`#num-${S.numAbierto}`); if (el) { el.open = true; el.scrollIntoView({ block: 'start' }); } }, 60);
  }
  else if (d.car) { S.carTab = d.car; LS.set('inv-car', S.carTab); pintar(); irArriba('#carTabs'); }
  else if (d.fis) { S.fisTab = d.fis; LS.set('inv-fistab', S.fisTab); pintar(); irArriba('#fisTabs'); }
  else if (d.fut) { S.futTab = d.fut; LS.set('inv-futtab', S.futTab); pintar(); irArriba('#futTabs'); }
  else if ('resp' in d) { const q = t.closest('[data-preg]'); if (q) responderIA(q.dataset.q ? { q: q.dataset.q } : +q.dataset.preg, d.resp); }
  else if (d.zona) { S.radarZona = d.zona; S.radarTodo = false; LS.set('inv-zona', S.radarZona); pintar(); }
  else if (d.orden) { S.radarOrden = d.orden; LS.set('inv-orden2', S.radarOrden); pintar(); }
  else if ('radarTodo' in d) { S.radarTodo = !S.radarTodo; pintar(); }
  else if (d.pos) abrirFicha(d.pos);
  else if (d.accion) {
    const a = d.accion;
    if (a === 'ocultar') { S.oculto = !S.oculto; LS.set('inv-oculto', S.oculto); pintar(); }
    else if (a === 'comparar') { S.comparar = !S.comparar; LS.set('inv-comparar', S.comparar); pintar(); }
    else if (a === 'inicio-inv') preguntarInicio(() => pintar());
    else if (a === 'ver-div12') { const x = $('#hDiv12'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'info-grafica') infoGrafica();
    else if (a === 'ajustes') abrirAjustes();
    else if (a === 'novedades') mostrarNovedades(null);
    else if (a === 'opinion') abrirOpinion();
    else if (a === 'tour') iniciarTour(0);
    else if (a === 'cerrar-ficha') cerrarFicha();
    else if (a === 'operacion') operacion(d.tipo || 'compra', d.id, d.sim);
    else if (a === 'editar-pos') editarPosicion(d.id);
    else if (a === 'cambiar-inst') {
      if (String(d.inst).startsWith('cat:')) d.inst = instDeCatalogo(d.inst.slice(4)) || '';
      const pos = S.cartera.posiciones.find((p) => p.id === d.id), nuevo = S.inst[d.inst];
      if (pos && nuevo) {
        const antes = (S.inst[pos.instrumento] || {}).corto || pos.instrumento;
        pos.instrumento = d.inst; delete pos.estimada;
        for (const m of S.cartera.movimientos || []) if (m.posicion === pos.id) m.instrumento = d.inst;
        if (S.ficha && S.ficha.id === pos.id) cerrarFicha(true);
        guardarYPintar(`Cambiar ${antes} por ${nuevo.corto}`).then(() => toast(`Hecho: ahora es ${nuevo.nombre || nuevo.corto}`, 4500));
      }
    }
    else if (a === 'nueva-pos') operacion('tengo');
    else if (a === 'nombre') cambiarNombre();
    else if (a === 'recuperar-vieja') { const antes = document.querySelectorAll('.hoja').length; revisarCarteraVieja(true); setTimeout(() => { if (document.querySelectorAll('.hoja').length <= antes) toast(trad('No hay ninguna cartera de antes con cosas que falten en tu cuenta'), 5000); }, 2500); }
    else if (a === 'aviso-rec-ok') { LS.set('inv-aviso-rec-ok', true); pintar(); }
    else if (a === 'ver-kit') verKit();
    else if (a === 'importar') importarCapturas();
    else if (a === 'nueva-ap') editarAportacion(null);
    else if (a === 'editar-ap') editarAportacion(+d.k);
    else if (a === 'efectivo') editarEfectivo(d.plat);
    else if (a === 'perfil-guiado') perfilGuiado();
    else if (a === 'ccaa-cambiar') cambiarComunidad();
    else if (a === 'perfil-aviso-no') { LS.set('inv-perfil-aviso', Date.now()); pintar(); }
    else if (a === 'limites' || a === 'perfil') editarPerfil();
    else if (a === 'perfil-ia') editarSobreMi();
    else if (a === 'meta') editarMeta(d.id || null);
    else if (a === 'fiscal') editarFiscal();
    else if (a === 'asesor') abrirAsesor(d.q || '', !!d.q);
    else if (a === 'recorte') iniciarRecorte();
    else if (a === 'idioma') menuIdioma(t);
    else if (a === 'novedades-detalle') mostrarNovedades(null, () => {}, true);
    else if (a === 'novedades-guia') guiaNuevo();
    else if (a === 'novedades-ocultar') { LS.set('inv-nov-cerrada', baseVer(VERSION)); const x = t.closest('.nov-aviso'); if (x) x.remove(); }
    else if (a === 'ordenar-cartera') abrirCarEdit();
    else if (a === 'demo-salir') salirDemo();
    else if (a === 'ia-actualizar') generarAnalisisIA('la pides tú');
    else if (a === 'asesor-ajustes') { AS.vista = 'ajustes'; abrirAsesor().then(() => { AS.vista = 'ajustes'; pintarAsesor(); }); }
    else if (a === 'borrar-mov') borrarMovimiento(d.id, t);
  }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest && e.target.closest('.pf-otra'); if (!f) return;
  e.preventDefault();
  const q = f.closest('[data-preg]'), v = f.querySelector('input').value;
  if (q && v.trim()) responderIA(q.dataset.q ? { q: q.dataset.q } : +q.dataset.preg, v);
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!S.cartera) return;
  if (t.matches('[data-comparar]')) { S.comparar = t.checked; LS.set('inv-comparar', S.comparar); pintar(); }
  else if (t.id === 'hpBench') { S.bench = benchDe(t.value).id; LS.set('inv-bench', S.bench); pintar(); }
  else if (t.matches('[data-orden-pos-sel]')) { const [k, dir] = t.value.split('|'); S.ordenPos = { k, dir }; LS.set('inv-orden-pos', S.ordenPos); pintar(); }
  else if (t.matches('[data-radar-min]')) { S.radarMin = t.checked; LS.set('inv-radar-min', S.radarMin); pintar(); }
  else if (t.matches('[data-radar-solidas]')) { S.radarSolidas = t.checked; LS.set('inv-radar-solidas', S.radarSolidas); pintar(); }
  else if (t.matches('[data-proy]')) {
    const k = t.dataset.proy, c = { ...(S.proy || {}) };
    if (k === 'real') c.real = t.checked;
    else if (k === 'aport') { const n = numero(t.value); if (!(n >= 0) || n > 1e6) { t.value = cfgProy().aport; return; } c.aport = Math.round(n); }
    else c[k] = +t.value;
    S.proy = c; LS.set('inv-proy', c); pintar();
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.ficha && !$('.hoja-fondo')) cerrarFicha(); });
function irArriba(sel) {
  const el = $(sel); if (!el) return;
  const alto = ($('.top') && $('.top').offsetHeight) || 0;
  const y = el.getBoundingClientRect().top + window.scrollY - alto - 12;
  if (window.scrollY > y) window.scrollTo(0, y);
}
function vistaDeHash() {
  const v = location.hash.slice(1);
  if (v === 'plan') { S.carTab = 'plan'; LS.set('inv-car', 'plan'); return 'cartera'; }
  if (v === 'impuestos') { S.fisTab = 'tu'; return 'fiscal'; }
  if (v === 'renta') { S.fisTab = 'renta'; return 'fiscal'; }
  if (v === 'objetivos') { S.futTab = 'perfil'; return 'futuro'; }
  if (v === 'proyeccion') { S.futTab = 'proy'; return 'futuro'; }
  return esVista(v) ? v : null;
}
window.addEventListener('hashchange', () => {
  const v = vistaDeHash(); if (!v || !S.cartera) return;
  S.navego = true;
  if (S.ficha) cerrarFicha(true);
  if (S.carEdit && v !== 'cartera') cerrarCarEdit(true);
  if (v !== S.vista || /^(renta|impuestos|objetivos|proyeccion|plan)$/.test(location.hash.slice(1))) {
    const k = history.state && history.state.k, y = k ? SCROLLS[k] : null;
    S.vista = v; S.scrollTop = !(y > 0); S.scrollA = y > 0 ? y : null; LS.set('inv-vista', v); pintar();
    const vi = $('#vista'); if (vi) { vi.classList.remove('entra'); void vi.offsetWidth; vi.classList.add('entra'); }
  }
});
/* «Atrás» vuelve al punto exacto de cada pestaña: cada entrada del historial lleva su clave y se apunta hasta dónde
   has bajado en ella; al volver a esa entrada, se recupera (ir a una pestaña nueva sigue empezando arriba) */
const SCROLLS = {};
try { history.scrollRestoration = 'manual'; } catch (e) {}
function claveEntrada() {
  let st = history.state;
  if (st && st.k) return st.k;
  st = { ...(st && typeof st === 'object' ? st : {}), k: Math.random().toString(36).slice(2, 10) };
  try { history.replaceState(st, ''); } catch (e) { return null; }
  return st.k;
}
addEventListener('scroll', () => { if (!S.cartera || document.querySelector('#fichaFondo, .hoja-fondo, #asesorFondo')) return; const k = claveEntrada(); if (k) SCROLLS[k] = window.scrollY; }, { passive: true });
/* la cabecera gana una sombra fina en cuanto bajas */
addEventListener('scroll', () => { const t = document.querySelector('.top'); if (t) t.classList.toggle('bajado', scrollY > 8); }, { passive: true });
/* la cinta se para al tocarla en el móvil y sigue al volver a tocar */
document.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch' && e.target.closest('#ticker')) $('#ticker').classList.toggle('pausa'); });

