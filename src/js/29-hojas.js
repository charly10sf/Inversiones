/* =====================================================================
   Hojas: formularios para cambiar la cartera
   ===================================================================== */
/* en el móvil, arrastrar la hoja hacia abajo desde arriba (su cabecera o el asa) la cierra */
function arrastrarParaCerrar(h, cerrar) {
  if (!h || !('ontouchstart' in window)) return;
  let y0 = null, dy = 0;
  h.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (e.touches.length !== 1 || h.scrollTop > 0 || window.innerWidth >= 720) return;
    if (!e.target.closest('.hoja-cab') && t.clientY - h.getBoundingClientRect().top > 44) return;
    y0 = t.clientY; dy = 0;
  }, { passive: true });
  h.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (dy < 0) { y0 = null; h.style.transform = ''; return; }
    h.style.transition = 'none'; h.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  const fin = () => {
    if (y0 == null) return;
    y0 = null; h.style.transition = '';
    if (dy > 110) { h.style.transform = 'translateY(100%)'; vibra(); setTimeout(cerrar, 180); } else h.style.transform = '';
  };
  h.addEventListener('touchend', fin); h.addEventListener('touchcancel', fin);
}
/* en la app de Android, un toque suave al cambiar de pestaña o elegir algo (si el móvil lo tiene activado) */
function vibra() { try { const a = window.InversionesApp; if (a && a.toque) a.toque(); } catch (e) {} }
document.addEventListener('click', (e) => { if (e.target.closest('.navbar a, .navbar .nav-mas, .tabs button, .subvistas button, [data-agm], [data-ag-mes], .agc, .ag-f, .mas-t, .gta-chip, .gta-top')) vibra(); }, true);
/* «Atrás» (el del móvil, el gesto o el del navegador) cierra lo que esté encima: una hoja, la ficha, el asesor o el GTA,
   en vez de salir de la app. Cada capa abierta deja una entrada en el historial; si la cierras tú (la ×, el fondo,
   Escape), se quita su entrada sin cerrar nada más. */
const ATRAS = { pila: [], ignorar: 0 };
function conAtras(cerrar, el) {
  const e = { cerrar, el, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  try { history.pushState({ capa: e.id }, ''); } catch (x) { return () => {}; }
  ATRAS.pila.push(e);
  return () => {
    const k = ATRAS.pila.indexOf(e); if (k < 0) return;
    ATRAS.pila.splice(k, 1);
    // se mira justo después: si al cerrar has ido a otra pestaña (un enlace de la hoja), su entrada se queda y no se
    // deshace ese paso
    setTimeout(() => {
      if (!history.state || history.state.capa !== e.id) return;
      ATRAS.ignorar++;
      try { history.back(); } catch (x) { ATRAS.ignorar--; }
    }, 0);
  };
}
window.addEventListener('popstate', () => {
  if (ATRAS.ignorar > 0) { ATRAS.ignorar--; return; }
  let e = ATRAS.pila.pop();
  while (e && e.el && !e.el.isConnected) e = ATRAS.pila.pop();   // las que ya se quitaron por otro lado
  if (e) e.cerrar();
  // si caes en la entrada de una capa que ya estaba cerrada (se cerró y se abrió otra en el mismo momento), se salta
  const st = history.state;
  if (st && st.capa && !ATRAS.pila.some((x) => x.id === st.capa)) { ATRAS.ignorar++; try { history.back(); } catch (x) { ATRAS.ignorar--; } }
});
/* 0.3.9: el «%», el «€» y el «$» nunca empiezan línea solos («un 21» / «% de lo ganado»): espacio que no parte */
const sinCortes = (h) => String(h).replace(/(\d) (%|€|\$)/g, '$1\u00a0$2');
function hoja(titulo, html, alCerrar, ancha) {
  const f = document.createElement('div');
  f.className = 'hoja-fondo';
  f.innerHTML = `<div class="hoja${ancha ? ' ancha' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="hoja-cab"><h2>${esc(titulo)}</h2><button class="ib" data-cerrar aria-label="Cerrar">${ICONOS.cerrar}</button></div>${sinCortes(html)}</div>`;
  let quitarAtras = () => {};
  const cerrar = (sinAviso, desdeAtras) => { if (!f.isConnected) return; f.remove(); document.removeEventListener('keydown', tecla, true); if (desdeAtras !== true) quitarAtras(); if (alCerrar && sinAviso !== true) alCerrar(); };
  // con dos hojas apiladas, Escape cierra solo la de arriba (las de abajo esperan su turno)
  const tecla = (e) => { if (e.key !== 'Escape') return; const hs = document.querySelectorAll('.hoja-fondo'); if (hs[hs.length - 1] !== f) return; e.stopImmediatePropagation(); cerrar(); };
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-cerrar]')) cerrar(); });
  document.addEventListener('keydown', tecla, true);
  document.body.appendChild(f);
  quitarAtras = conAtras(() => cerrar(false, true), f);
  arrastrarParaCerrar(f.querySelector('.hoja'), () => cerrar());
  const primero = f.querySelector('input:not([type=hidden]):not([type=checkbox]), select'); if (primero && window.innerWidth > 720) primero.focus();
  return { el: f, cerrar };
}

const PLATAFORMAS = ['MyInvestor', 'Trade Republic', 'Bitvavo'];
/* una pregunta corta en una hoja (en vez del prompt() del navegador, que en la app se ve de otra época) */
function pedirTexto(titulo, etiqueta, ejemplo, alOk) {
  const h = hoja(titulo, `<form id="fTxt" novalidate><label class="campo">${esc(etiqueta)}<input name="t" autocomplete="off" maxlength="40" placeholder="${esc(ejemplo || '')}"></label><div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Vale</button></div></form>`);
  const i = $('[name=t]', h.el); setTimeout(() => i.focus(), 60);
  $('#fTxt', h.el).onsubmit = (ev) => { ev.preventDefault(); const v = i.value.trim(); if (!v) return; h.cerrar(true); alOk(v); };
}
const etiquetaInst = (i) => { const c = i.corto || i.nombre || '', g = String(i.nombre || '').split(' ')[0]; return /^Fondo|ETF|ETC/.test(i.tipo || '') && g && !normTxt(c).includes(normTxt(g)) ? `${c} (${g})` : c; };
const opcionesInst = (sel, conNuevo = true) => S.instOrden.map((id) => `<option value="${esc(id)}"${id === sel ? ' selected' : ''}>${esc(etiquetaInst(S.inst[id]))}</option>`).join('') + (conNuevo ? '<option value="__nuevo">+ Nuevo instrumento…</option>' : '');
const opcionesPlat = (sel) => [...new Set([...PLATAFORMAS, sel].filter(Boolean))].map((p) => `<option${p === sel ? ' selected' : ''}>${esc(p)}</option>`).join('');
const val = (v) => (v == null ? '' : typeof v === 'number' ? String(+v.toFixed(8)).replace('.', ',') : esc(v));
/* lo que escribe la persona: «1.234,56», «1234,56», «40.000» (punto de miles, como se escribe en España) o «12.5».
   En unidades y precios (decimal = true) un solo punto es decimal: «40.048» participaciones son 40,048, no 40.048;
   con dos puntos o más («1.234.567») sí son miles. */
const numero = (s, decimal = false) => {
  if (s == null) return null;
  const t = String(s).trim().replace(/[\s\u00a0]/g, '').replace('€', '');
  if (!t) return null;
  const miles = !t.includes(',') && IDIOMA !== 'en' && (decimal ? /^-?[1-9]\d{0,2}(\.\d{3}){2,}$/ : /^-?[1-9]\d{0,2}(\.\d{3})+$/).test(t);
  const n = Number(t.includes(',') || miles ? t.replace(/\./g, '').replace(',', '.') : t);
  return isFinite(n) ? n : NaN;
};
const nuevoId = (pre) => pre + Math.random().toString(36).slice(2, 8);

/* botón de borrar en dos pasos: el primer toque pide confirmación en el propio botón */
function dosPasos(boton, texto, accion) {
  boton.onclick = () => {
    if (boton.dataset.listo) return accion();
    boton.dataset.listo = '1'; const antes = boton.innerHTML; boton.textContent = texto;
    setTimeout(() => { delete boton.dataset.listo; boton.innerHTML = antes; }, 3500);
  };
}

async function guardarYPintar(mensaje, h) {
  const b = h && h.el.querySelector('button[type=submit]'); if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
  await guardarCartera(mensaje);
  if (h) h.cerrar();
  LIVE.mapas(); LIVE.resuscribir();
  pintar();
  cargarHistCatalogo().then((n) => { if (n) pintar(); });
}

/* ---------- editar o añadir una posición ---------- */
function editarPosicion(id) {
  const orig = id ? S.cartera.posiciones.find((p) => p.id === id) : null;
  const p = orig ? JSON.parse(JSON.stringify(orig)) : { instrumento: S.instOrden[0], plataforma: 'MyInvestor', cantidad: null, fecha: hoyIso(), coste: null };
  const f = orig && S.M ? S.M.filas.find((x) => x.pos.id === id) : null;
  const h = hoja(orig ? `Editar ${(S.inst[p.instrumento] && S.inst[p.instrumento].corto) || ''}` : 'Añadir posición', `
    <form id="fPos" novalidate>
      <div class="form-grid">
        <label class="campo">Instrumento<select name="instrumento">${opcionesInst(p.instrumento)}</select></label>
        <label class="campo">Plataforma<select name="plataforma">${opcionesPlat(p.plataforma)}</select></label>
        <label class="campo">Cantidad<input name="cantidad" inputmode="decimal" value="${val(p.cantidad)}" placeholder="${f && f.uds != null ? 'ahora ' + fmtNum(f.uds, 4) + ' (estimado)' : 'participaciones o acciones'}"><small>Lo que pone tu bróker. Admite coma decimal.</small></label>
        <label class="campo">A fecha de<input name="fecha" type="date" value="${val(p.fecha || hoyIso())}"><small>Las aportaciones automáticas se suman después de esta fecha.</small></label>
        <label class="campo">Invertido (€)<input name="coste" inputmode="decimal" value="${val(p.coste)}"><small>Lo que has puesto en total, con comisiones.</small></label>
        <label class="campo">Desde cuándo la tienes<input name="desde" type="date" value="${val(p.desde || ((p.lotes || [])[0] || {}).f)}"><small>Más o menos, la fecha de tu primera compra. Con ella GrowFolio calcula cuánto ganas al año.</small></label>
      </div>
      <details class="mas"${p.valor_ref || p.stop || p.objetivo || p.entrada || p.notas ? ' open' : ''}><summary>Reglas, apuesta y notas</summary>
        <div class="form-grid">
          <label class="campo">Valor en esa fecha (€)<input name="valor_ref" inputmode="decimal" value="${val(p.valor_ref)}"><small>Solo si no sabes la cantidad: GrowFolio la calcula.</small></label>
          <label class="campo">Salida si baja de (€)<input name="stop" inputmode="decimal" value="${val(p.stop)}"></label>
          <label class="campo">Revisar si llega a (€)<input name="objetivo" inputmode="decimal" value="${val(p.objetivo)}"></label>
          <label class="campo">Fecha de entrada<input name="entrada_fecha" type="date" value="${val(p.entrada && p.entrada.fecha)}"><small>Para compararla con el S&P 500.</small></label>
          <label class="campo">Precio de entrada (€)<input name="entrada_precio" inputmode="decimal" value="${val(p.entrada && p.entrada.precio)}"></label>
        </div>
        <label class="campo" style="margin-top:12px">Notas<textarea name="notas" rows="3">${esc(p.notas || '')}</textarea></label>
      </details>
      <div class="error" id="errPos"></div>
      <div class="fila-btns">${orig ? `<button type="button" class="btn peligro izq" id="bQuitar">${ICONOS.papelera}Quitar posición</button>` : ''}<button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
    </form>`);
  const fm = $('#fPos', h.el);
  const g = (n) => fm.querySelector(`[name="${n}"]`).value;
  fm.querySelector('[name=instrumento]').onchange = (e) => { if (e.target.value === '__nuevo') nuevoInstrumento((nid) => { e.target.innerHTML = opcionesInst(nid || p.instrumento); }); };
  if (orig) dosPasos($('#bQuitar', h.el), 'Pulsa otra vez para quitarla', async () => {
    S.cartera.posiciones = S.cartera.posiciones.filter((x) => x.id !== id);
    if (S.ficha && S.ficha.id === id) cerrarFicha();
    await guardarYPintar('Quitar posición', h);
  });
  fm.onsubmit = async (ev) => {
    ev.preventDefault();
    const err = (t) => { $('#errPos', h.el).textContent = t; };
    const o = { ...p, id: p.id || nuevoId('p-'), instrumento: g('instrumento'), plataforma: g('plataforma'), fecha: g('fecha') || hoyIso() };
    if (o.instrumento === '__nuevo') return err('Elige un instrumento.');
    if (o.fecha > hoyIso()) return err('La fecha no puede ser futura.');
    for (const k of ['cantidad', 'coste', 'valor_ref', 'stop', 'objetivo']) {
      const n = numero(g(k), k === 'cantidad' || k === 'stop' || k === 'objetivo');
      const nombre = () => fm.querySelector(`[name="${k}"]`).closest('label').firstChild.textContent.trim();
      if (Number.isNaN(n)) return err(`"${nombre()}" no es un número.`);
      if (n != null && n < 0) return err(`"${nombre()}" no puede ser negativo.`);
      if (n == null) delete o[k]; else o[k] = n;
    }
    if (o.cantidad == null && o.valor_ref == null) return err('Pon la cantidad (o el valor en esa fecha si no la sabes).');
    if (o.cantidad != null) { delete o.valor_ref; if (!orig || orig.cantidad == null || orig.cantidad !== o.cantidad) delete o.estimada; } else o.cantidad = null;
    if (orig && (orig.cantidad !== o.cantidad || +orig.coste !== +o.coste || orig.fecha !== o.fecha)) delete o.lotes;
    if (o.coste == null) o.coste = 0;
    const ef = g('entrada_fecha'), ep = numero(g('entrada_precio'), true);
    if (ef && ep) o.entrada = { fecha: ef, precio: ep }; else delete o.entrada;
    const de = g('desde'); if (de && de <= hoyIso()) o.desde = de; else delete o.desde;
    const nt = g('notas').trim(); if (nt) o.notas = nt; else delete o.notas;
    if (orig) Object.keys(orig).forEach((k) => delete orig[k]), Object.assign(orig, o);
    else S.cartera.posiciones.push(o);
    await guardarYPintar(orig ? 'Editar posición' : 'Añadir posición', h);
  };
}

/* ---------- registrar una compra o una venta ---------- */
/* Fija en la posición las unidades y el coste de hoy (estimados o con aportaciones ya sumadas)
   para poder sumar o restar la operación encima. */
function fijarPosicion(pos) {
  const f = calcularPos(pos, hoyIso());
  if (f.uds == null) throw new Error('No sé cuántas unidades tienes de esta posición: ponlas en Editar.');
  const sumadas = f.aportes.filter((a) => a.precio);
  const lotes = lotesDe(pos);
  pos.lotes = lotes.map((l) => ({ ...l, u: +l.u.toFixed(8), c: +l.c.toFixed(2) }));
  pos.cantidad = +sum(lotes, (l) => l.u).toFixed(8);
  pos.coste = +sum(lotes, (l) => l.c).toFixed(2);
  if (sumadas.length) pos.fecha = sumadas[sumadas.length - 1].f;
  if (f.estimada) pos.estimada = true;
  delete pos.valor_ref;
}

/* Compra, venta o "ya la tenía" (lo que tienes de antes, sin tocar el efectivo ni el historial).
   Un solo formulario: eliges el modo, buscas la empresa o el fondo y pones cuántas y a qué precio. */
function operacion(tipo, id, sim, cand) {
  let t = ['venta', 'tengo'].includes(tipo) ? tipo : 'compra';
  const instsAntes = new Set(S.instOrden), cambiadosAntes = S.instCambiados;
  let registrada = false;
  const pos0 = id ? S.cartera.posiciones.find((p) => p.id === id) : null;
  let inst = pos0 ? pos0.instrumento : null, plat = pos0 ? pos0.plataforma : null, posSel = pos0;
  if (sim) { const nid = instDeRadar(sim); if (nid) inst = nid; }
  if (cand) { const nid = idDeCandidato(cand); if (nid) inst = nid; }
  // la plataforma: donde ya la tienes; si no, donde tienes cosas parecidas (cripto, fondos, el resto); si no, la de siempre
  const platPor = (iid) => { const i = S.inst[iid] || {}; const ya = S.cartera.posiciones.find((p) => p.instrumento === iid); if (ya) return ya.plataforma; const tipoDe = (x) => (x.clase === 'Cripto' ? 'c' : /^Fondo/.test(x.tipo || '') ? 'f' : 'o'); const par = S.cartera.posiciones.find((p) => p.plataforma && tipoDe(S.inst[p.instrumento] || {}) === tipoDe(i)); if (par) return par.plataforma; return i.clase === 'Cripto' ? 'Bitvavo' : /^Fondo/.test(i.tipo || '') ? 'MyInvestor' : 'Trade Republic'; };
  if (inst && !plat) plat = platPor(inst);
  const plats = [...new Set([...PLATAFORMAS, ...(S.cartera.posiciones || []).map((p) => p.plataforma), ...(S.cartera.efectivo || []).map((e) => e.plataforma)].filter(Boolean))];
  const h = hoja('Compra, venta o lo que ya tienes', `
    <form id="fOp" novalidate>
      <div class="op-modo" role="group" aria-label="Qué quieres apuntar"><button type="button" data-t="compra">${ICONOS.compra}${L('Compra', 'Buy')}</button><button type="button" data-t="venta">${ICONOS.venta}${L('Venta', 'Sell')}</button><button type="button" data-t="tengo">${ICONOS.cartera}${L('Ya la tenías', 'Already had it')}</button></div>
      <button type="button" class="op-imp" id="opImp" data-accion="importar" hidden><span class="op-imp-ic">${ICONOS.recorte}</span><span class="op-imp-t"><b>Importar todo de tu bróker o banco</b><small>Capturas, el PDF de un extracto o los movimientos en CSV o Excel. GrowIA lo lee y tú lo revisas: mucho más rápido que meterlas una a una.</small></span><span class="op-imp-ir" aria-hidden="true">›</span></button>
      <p class="op-ayuda" id="opAyuda"></p>
      <div class="op-paso"><span class="op-lbl">Qué</span><div id="opQue"></div></div>
      <div class="op-paso" id="cPlat"><span class="op-lbl">Dónde</span><div class="op-plats" id="opPlat" role="group" aria-label="Plataforma"></div></div>
      <div class="form-grid op-num">
        <label class="campo"><span id="lImp">Cuánto pagaste en total (€)</span><input name="importe" inputmode="decimal" placeholder="por ejemplo, 1.000"><small id="sImp">Sin la comisión.</small></label>
        <label class="campo"><span id="lFecha">Fecha</span><input name="fecha" type="date" value="${hoyIso()}" max="${hoyIso()}"><small id="sFecha"></small></label>
        <label class="campo"><span id="lPrecio">Precio de cada una (€)</span><input name="precio" inputmode="decimal"><small id="sPrecio"></small></label>
        <label class="campo"><span id="lUds">Cuántas</span><input name="uds" inputmode="decimal" placeholder="se calcula sola"><small>Sale sola con el total y el precio. Si pones el total y cuántas, sale el precio.</small></label>
        <label class="campo" id="cGastos">Comisión (€)<input name="gastos" inputmode="decimal" placeholder="0"><small id="sGastos"></small></label>
      </div>
      <label class="check" id="cEf"><input type="checkbox" name="efectivo"><span id="tEf"></span></label>
      <div class="calculo" id="calc"></div>
      <div class="error" id="errOp"></div>
      <div class="fila-btns"><button type="button" class="btn izq enlace-imp" data-accion="importar">${ICONOS.recorte}Importar de tu bróker</button><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri" id="bOp">Apuntar</button></div>
    </form>`, () => {
    if (registrada) return;
    const usados = new Set((S.cartera.posiciones || []).map((p) => p.instrumento));
    const sobran = S.instOrden.filter((x) => !instsAntes.has(x) && !usados.has(x));
    if (!sobran.length) return;
    for (const x of sobran) delete S.inst[x];
    S.instOrden = S.instOrden.filter((x) => !sobran.includes(x));
    S.instCambiados = cambiadosAntes;
  });
  const fm = $('#fOp', h.el);
  const q = (n) => fm.querySelector(`[name="${n}"]`);
  const err = (x) => { $('#errOp', h.el).textContent = x; };
  const posDe = () => (t === 'venta' ? posSel : inst && plat ? S.cartera.posiciones.find((p) => p.instrumento === inst && p.plataforma === plat) : null);
  const tasaDe = (instId) => { const i = S.inst[instId] || {}; if (i.bolsa && i.bolsa !== i.pais) return null; const pp = S.precios && S.precios.instrumentos && S.precios.instrumentos[instId]; return tasaCompra(i.pais, i.tipo, pp && pp.fundamentales && pp.fundamentales.capitalizacion); };
  const unidad = () => { const i = S.inst[inst] || {}; return i.tipo === 'Acción' ? 'acciones' : i.clase === 'Cripto' ? 'unidades' : /^Fondo/.test(i.tipo || '') ? 'participaciones' : 'unidades'; };
  // el precio que se propone es el del día de la operación (el de hoy si es hoy); si lo cambias tú, se respeta
  // los dos últimos que escribe la persona (de total, cuántas y precio): el tercero sale de ellos
  let precioTocado = false, ultimos = [], efTocado = false;
  const toca = (k) => { ultimos = [k, ...ultimos.filter((x) => x !== k)].slice(0, 2); };
  const precioSale = () => ultimos.includes('importe') && ultimos.includes('uds');
  const precioDia = () => {
    if (!inst) return null;
    const fch = q('fecha').value || hoyIso();
    if (fch < hoyIso()) { const h0 = histDe(inst), r = h0 && precioEn(h0, fch, 'antes'); if (r) return r; }
    return precioInst(inst);
  };
  const ponerPrecio = () => { if (t === 'tengo' || precioTocado || precioSale()) return; const pr = precioDia(); if (pr) q('precio').value = String(+pr.toFixed(pr >= 100 ? 2 : Math.max(4, decPrecio(pr) + 1))).replace('.', ','); recuadrar(); };
  // con el total y el precio salen las participaciones; con las participaciones y el precio, el total; y con el total y
  // las participaciones, el precio (lo que te dice el bróker: «pagaste 1.000 € por 114,279»)
  const recuadrar = () => {
    const imp = numero(q('importe').value), u = numero(q('uds').value, true), pr = numero(q('precio').value, true);
    if (precioSale()) { if (imp > 0 && u > 0) { const x = imp / u; q('precio').value = String(+x.toFixed(x >= 100 ? 2 : Math.max(4, decPrecio(x) + 1))).replace('.', ','); } return; }
    if (!(pr > 0)) return;
    if (ultimos.includes('uds')) q('importe').value = u > 0 ? String(+(u * pr).toFixed(2)).replace('.', ',') : '';
    else q('uds').value = imp > 0 ? String(+(imp / pr).toFixed(6)).replace('.', ',') : '';
  };
  const efectivoDe = (pl) => { const e = (S.cartera.efectivo || []).find((x) => x.plataforma === pl); return e ? +e.importe || 0 : 0; };
  // lo que tenías ese día (los lotes sin fecha segura cuentan siempre)
  const tenidasEn = (lotes, f) => sum(lotes.filter((l) => l.mezcla || !l.f || l.f <= f), (l) => l.u);
  const noTenias = (lotes, f, uds) => {
    const ya = tenidasEn(lotes, f);
    if (ya >= uds - 1e-6) return '';
    const primera = lotes.map((l) => l.f).filter(Boolean).sort()[0];
    return ya <= 1e-8 ? `El ${fechaLarga(f)} aún no tenías ninguna${primera ? ` (en GrowFolio la tienes desde el ${fechaLarga(primera)})` : ''}. Si es de antes, cambia la fecha en Editar.` : `El ${fechaLarga(f)} solo tenías ${fmtNum(ya, 4)}.`;
  };
  const pintarQue = () => {
    const c = $('#opQue', h.el);
    if (t === 'venta') {
      const ps = S.cartera.posiciones.filter((p) => calcularPos(p, hoyIso()).uds > 0);
      c.innerHTML = ps.length ? `<div class="op-lista">${ps.map((p) => { const i = S.inst[p.instrumento] || { corto: p.instrumento }; const f = calcularPos(p, hoyIso()); return `<button type="button" class="op-pos" data-pid="${esc(p.id)}" aria-pressed="${posSel && posSel.id === p.id}">${logo(i.dominio, i.corto || i.nombre)}<span><b>${esc(i.corto || i.nombre)}</b><small>${esc(p.plataforma || '')}, ${oc(fmtNum(f.uds, f.uds < 10 ? 4 : 2))} ${/^Fondo/.test(i.tipo || '') ? 'participaciones' : i.clase === 'Cripto' ? (i.corto || '') : i.tipo === 'Acción' ? (f.uds === 1 ? 'acción' : 'acciones') : 'unidades'}</small></span></button>`; }).join('')}</div>` : '<div class="vacio">No tienes nada que vender todavía.</div>';
      for (const b of $$('[data-pid]', c)) b.onclick = () => { posSel = S.cartera.posiciones.find((p) => p.id === b.dataset.pid); inst = posSel.instrumento; plat = posSel.plataforma; precioTocado = false; if (!q('gastos').dataset.tocado) q('gastos').value = plat === 'Trade Republic' ? '1' : ''; ponerPrecio(); pintarTodo(); };
      return;
    }
    if (inst) {
      const i = S.inst[inst] || {}, pr = precioInst(inst), ya = S.cartera.posiciones.filter((p) => p.instrumento === inst);
      c.innerHTML = `<div class="op-elegido">${logo(i.dominio, i.corto || i.nombre)}<span class="busca-t"><b>${esc(i.corto || i.nombre)}</b><small>${chipCotiza(i)}${i.isin ? ` · ${esc(i.isin)}` : i.yahoo && !/^0P/.test(i.yahoo) ? ` · ${esc(i.yahoo)}` : ''}${ya.length ? ` · ya tienes en ${esc(ya.map((p) => p.plataforma).join(' y '))}` : ''}</small></span><span class="busca-p">${pr ? precioFmt(pr) : ''}</span><button type="button" class="enlace acento" id="opCambiar">Cambiar</button></div>`;
      $('#opCambiar', h.el).onclick = () => { inst = null; pintarTodo(); const b = $('#opQue input', h.el); if (b) b.focus({ preventScroll: true }); };
    } else buscador(c, (nid) => {
      inst = nid; plat = platPor(nid); precioTocado = false;
      if (!q('gastos').dataset.tocado) q('gastos').value = plat === 'Trade Republic' && t !== 'tengo' ? '1' : '';
      ponerPrecio(); pintarTodo();
      // en el ordenador, al importe; en el móvil no (el teclado empujaba la hoja hacia abajo y perdías lo elegido)
      if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => q('importe').focus({ preventScroll: true }), 50);
    }, { foco: !matchMedia('(pointer: coarse)').matches });
  };
  const pintarPlat = () => {
    const c = $('#opPlat', h.el);
    if (t === 'venta') { $('#cPlat', h.el).hidden = true; return; }
    $('#cPlat', h.el).hidden = false;
    c.innerHTML = plats.map((p) => `<button type="button" data-plat="${esc(p)}" aria-pressed="${plat === p}">${esc(p)}</button>`).join('') + '<button type="button" data-plat="__otra">Otra…</button>';
    for (const b of $$('[data-plat]', c)) b.onclick = () => {
      if (b.dataset.plat === '__otra') {
        pedirTexto('Otra plataforma', '¿Cómo se llama?', 'por ejemplo, Degiro', (n) => { if (!plats.includes(n)) plats.push(n); plat = n; if (!q('gastos').dataset.tocado) q('gastos').value = ''; pintarTodo(); });
        return;
      }
      plat = b.dataset.plat;
      if (!q('gastos').dataset.tocado) q('gastos').value = plat === 'Trade Republic' && t !== 'tengo' ? '1' : '';
      pintarTodo();
    };
  };
  const recalcular = () => {
    const uds = numero(q('uds').value, true), pr = numero(q('precio').value, true), gastos = t === 'tengo' ? 0 : numero(q('gastos').value) || 0;
    const c = $('#calc', h.el);
    if (!inst) { c.innerHTML = '<div><span class="k">Elige primero qué.</span></div>'; return; }
    if (!(uds > 0) || !(pr > 0)) { c.innerHTML = `<div><span class="k">${t === 'tengo' ? 'Pon cuántas tienes y tu precio medio (o lo invertido).' : 'Rellena dos de estos tres: el total, el precio o cuántas. El tercero sale solo.'}</span></div>`; return; }
    const bruto = uds * pr;
    // ¿cuadra el precio con lo que valía ese día? Si no, casi seguro que es otro fondo u otra clase
    const h0 = histDe(inst), fch = q('fecha').value || hoyIso(), real = h0 && fch < hoyIso() ? precioEn(h0, fch, 'antes') : null;
    const raro = real && (pr / real > 1.25 || pr / real < 0.8) ? `<div class="op-raro">${ICONOS.alerta}<span>El ${fechaLarga(fch)} ${esc((S.inst[inst] || {}).nombre || '')} valía ${precioFmt(real)} y tú pones ${precioFmt(pr)}. Si no cuadra, seguramente el tuyo es otro fondo u otra clase: búscalo por su ISIN (sale en tu bróker).</span></div>` : '';
    if (t === 'tengo') {
      const ahora = precioInst(inst), vale = ahora ? uds * ahora : null, g = vale != null ? vale - bruto : null;
      c.innerHTML = `${raro}<div><span>Invertido</span><span>${eur(bruto)}</span></div>${vale != null ? `<div><span>Vale hoy</span><span>${eur(vale)}</span></div><div><b>${g >= 0 ? 'Llevas ganado' : 'Llevas perdido'}</b><b class="${cls(g)}">${eurS(g)} (${pctS((g / bruto) * 100, 1)})</b></div>` : ''}`;
      return;
    }
    if (t === 'compra') {
      const ta = tasaDe(inst); const tasa = ta ? bruto * ta.tipo : 0;
      c.innerHTML = `${raro}<div><span>Importe</span><span>${eur(bruto)}</span></div><div><span>Comisión</span><span>${eur(gastos)}</span></div>${ta ? `<div><span>Tasa de compra (${fmtNum(ta.tipo * 100, 1)} %, ${esc(ta.nombre)})</span><span>${eur(tasa)}</span></div>` : ''}<div><b>Total pagado</b><b>${eur(bruto + gastos + tasa)}</b></div>`;
      return;
    }
    const p = posSel; let extra = '';
    if (p) {
      try {
        const copia = JSON.parse(JSON.stringify(p)); fijarPosicion(copia);
        const nt = noTenias(copia.lotes, q('fecha').value || hoyIso(), Math.min(uds, copia.cantidad));
        if (nt) throw new Error(nt);
        const r = fifo(copia.lotes, Math.min(uds, copia.cantidad));
        const res = bruto - gastos - r.coste;
        const imp = res > 0 ? impuestoDeVenta(res).impuesto : 0;
        extra = `<div><span>Lo que te costaron (FIFO)</span><span>${eur(r.coste)}</span></div><div><b>${res >= 0 ? 'Ganas' : 'Pierdes'}</b><b class="${cls(res)}">${eurS(res)}</b></div>${res > 0 ? `<div><span>Impuesto estimado en la renta</span><span>${eur(imp)}</span></div>` : res < 0 ? `<div><span class="k">Esa pérdida resta de tus ganancias del año (y si sobra, de los 4 siguientes).${(() => { const ins = S.inst[copia.instrumento], l = libreRecompra(ins, q('fecha').value || hoyIso()); return l ? ` Para que cuente, no la recompres hasta el ${fechaLarga(l)}: es la regla de ${reglaRecompra(ins).plazo} de Hacienda.` : ''; })()}</span></div>` : ''}${uds > copia.cantidad + 1e-6 ? '<div><span class="down">Vendes más de lo que tienes.</span></div>' : ''}`;
      } catch (e) { extra = `<div><span class="down">${esc(e.message)}</span></div>`; }
    }
    c.innerHTML = `<div><span>Importe</span><span>${eur(bruto)}</span></div><div><span>Comisión</span><span>${eur(gastos)}</span></div><div><b>Cobras</b><b>${eur(bruto - gastos)}</b></div>${extra}`;
  };
  const pintarTodo = () => {
    for (const b of $$('[data-t]', fm)) b.setAttribute('aria-pressed', b.dataset.t === t);
    const tengo = t === 'tengo';
    // en «Ya la tenía», importar va arriba y bien grande; en compra y venta, abajo como siempre
    $('#opImp', h.el).hidden = t !== 'tengo'; $('.enlace-imp', h.el).hidden = t === 'tengo';
    $('#opAyuda', h.el).textContent = t === 'tengo' ? 'O mete una a mano: pon cuántas tienes y tu precio medio (sale en tu bróker). No toca el efectivo ni el historial.' : t === 'compra' ? 'Una compra que acabas de hacer: suma a tu posición y, si quieres, resta del efectivo.' : t === 'venta' ? 'Elige qué vendiste: GrowFolio calcula lo que ganas o pierdes para Hacienda.' : 'Lo que ya tenías antes de usar GrowFolio: pon cuántas tienes y tu precio medio (sale en tu bróker). No toca el efectivo ni el historial.';
    $('#lUds', h.el).textContent = `Cuántas ${inst ? unidad() : ''}${tengo ? ' tienes' : t === 'venta' ? ' vendiste' : ''}`.replace(/\s+/g, ' ');
    $('#lPrecio', h.el).textContent = tengo ? 'Tu precio medio (€)' : 'Precio de cada una (€)';
    $('#sPrecio', h.el).textContent = tengo ? 'Sale en tu bróker. Si pones lo invertido y cuántas, no hace falta.' : 'El de ese día. Si tu justificante dice otro, cámbialo.';
    $('#lImp', h.el).textContent = tengo ? 'Lo invertido en total (€)' : t === 'venta' ? 'Cuánto cobraste en total (€)' : 'Cuánto pagaste en total (€)';
    $('#sImp', h.el).textContent = tengo ? 'Lo que pagaste por todas: sale en tu bróker.' : t === 'venta' ? 'Antes de restar la comisión.' : 'Sin contar la comisión.';
    // la fecha también es "desde cuándo la tienes": con ella sale cuánto te da al año, así que se pide ya aquí
    $('#lFecha', h.el).textContent = tengo ? 'Desde cuándo la tienes (más o menos)' : t === 'venta' ? 'Cuándo la vendiste' : 'Cuándo la compraste';
    $('#sFecha', h.el).textContent = tengo ? 'El día de tu primera compra, más o menos. Con él GrowFolio calcula cuánto te da al año.' : t === 'venta' ? 'Cuenta para la renta de ese año.' : 'Si es de hace tiempo, pon ese día: el precio y lo que te da al año salen solos.';
    if (!efTocado) q('efectivo').checked = !tengo && !!plat && (t === 'venta' || efectivoDe(plat) > 0);
    // pagar con efectivo solo si hay efectivo en esa plataforma (con 0 € no tenía sentido ofrecerlo)
    const sinEf = t === 'compra' && !!plat && !(efectivoDe(plat) > 0);
    $('#cGastos', h.el).hidden = tengo; $('#cEf', h.el).hidden = tengo || sinEf; if (sinEf) q('efectivo').checked = false;
    $('#sGastos', h.el).textContent = plat === 'Trade Republic' ? 'En Trade Republic, 1 € por operación.' : '';
    $('#tEf', h.el).textContent = t === 'compra' ? `Pagar con el efectivo de ${plat || 'la plataforma'}${plat ? ` (tienes ${eur(efectivoDe(plat), 0)})` : ''}` : `Sumar lo cobrado al efectivo de ${plat || 'la plataforma'}`;
    $('#bOp', h.el).textContent = t === 'compra' ? 'Apuntar la compra' : t === 'venta' ? 'Apuntar la venta' : 'Añadir a mi cartera';
    pintarQue(); pintarPlat(); recalcular();
  };
  for (const b of $$('[data-t]', fm)) b.onclick = () => { if (t === b.dataset.t) return; t = b.dataset.t; precioTocado = false; if (t === 'venta') { posSel = posSel || S.cartera.posiciones.find((p) => p.instrumento === inst) || null; if (posSel) { inst = posSel.instrumento; plat = posSel.plataforma; } } if (t === 'tengo') q('precio').value = ''; else ponerPrecio(); if (!q('gastos').dataset.tocado) q('gastos').value = plat === 'Trade Republic' && t !== 'tengo' ? '1' : ''; pintarTodo(); };
  q('importe').oninput = () => { toca('importe'); recuadrar(); recalcular(); };
  q('uds').oninput = () => { toca('uds'); recuadrar(); recalcular(); };
  q('precio').oninput = () => { precioTocado = true; toca('precio'); recuadrar(); recalcular(); };
  q('gastos').oninput = () => { q('gastos').dataset.tocado = '1'; recalcular(); };
  // si es de otro día y aún no tenemos su histórico (fondos del catálogo), se baja y se pone el precio de ese día
  q('fecha').onchange = () => { ponerPrecio(); recalcular(); if (inst && (q('fecha').value || hoyIso()) < hoyIso() && !histDe(inst)) cargarHistCatalogo([inst]).then(() => { ponerPrecio(); recalcular(); }).catch(() => {}); };
  q('efectivo').onchange = () => { efTocado = true; };
  if (!q('gastos').dataset.tocado) q('gastos').value = plat === 'Trade Republic' && t !== 'tengo' ? '1' : '';
  if (t === 'venta' && !posSel && inst) posSel = S.cartera.posiciones.find((p) => p.instrumento === inst) || null;
  ponerPrecio(); pintarTodo();
  // en el ordenador, el cursor al total; en el móvil no, que abría el teclado nada más entrar
  if (inst && t !== 'venta' && !matchMedia('(pointer: coarse)').matches) setTimeout(() => q('importe').focus({ preventScroll: true }), 80);
  fm.onsubmit = async (ev) => {
    ev.preventDefault();
    let uds = numero(q('uds').value, true), pr = numero(q('precio').value, true);
    const gastos = t === 'tengo' ? 0 : numero(q('gastos').value) || 0;
    if (!inst) return err('Elige qué.');
    if (t !== 'venta' && !plat) return err('Elige dónde la tienes.');
    if (t === 'tengo' && !(pr > 0) && numero(q('importe').value) > 0 && uds > 0) pr = numero(q('importe').value) / uds;
    if (!(uds > 0)) return err('Pon cuántas.');
    if (!(pr > 0)) return err(t === 'tengo' ? 'Pon tu precio medio o lo invertido en total.' : 'Pon el precio por unidad.');
    if (Number.isNaN(gastos) || gastos < 0) return err('La comisión no es un número.');
    // un precio muy distinto al de ese día casi siempre es el total puesto en el precio (o es otro fondo)
    const ref = precioDia(), lim = t === 'tengo' ? 2.5 : 1.5;
    if (ref && (pr / ref > lim || pr / ref < 1 / lim) && fm.dataset.confirmado !== String(pr)) {
      fm.dataset.confirmado = String(pr);
      const nom = (S.inst[inst] && S.inst[inst].corto) || inst, cuando = (q('fecha').value || hoyIso()) < hoyIso() ? 'ese día' : 'hoy';
      return err(t === 'tengo'
        ? `Ojo: tu precio medio (${precioFmt(pr)}) está muy lejos de lo que valía ${nom} ${cuando} (${precioFmt(ref)}). Si has puesto lo que pagaste en total, va en «Lo invertido en total». Si está bien, pulsa otra vez el botón.`
        : `Ojo: ${nom} valía ${precioFmt(ref)} cada una ${cuando} y has puesto ${precioFmt(pr)}. Si ${eur(pr, 0)} es lo que ${t === 'venta' ? 'cobraste' : 'pagaste'} en total, ponlo arriba, en «Cuánto ${t === 'venta' ? 'cobraste' : 'pagaste'}», y deja el precio que salía. Si está bien (otra clase del fondo, por ejemplo), pulsa otra vez el botón.`);
    }
    const fecha = q('fecha').value || hoyIso();
    if (fecha > hoyIso()) return err('La fecha no puede ser futura.');
    let pos = posDe();
    const nombre = (S.inst[inst] && S.inst[inst].corto) || inst;
    if (t === 'tengo') {
      const lote = { f: fecha, u: uds, c: +(uds * pr).toFixed(2) };
      if (pos) { fijarPosicion(pos); pos.lotes = [...(pos.lotes || []), lote].sort((a, b) => (a.f < b.f ? -1 : 1)); pos.cantidad = +(pos.cantidad + uds).toFixed(8); pos.coste = +(pos.coste + lote.c).toFixed(2); }
      else { pos = { id: nuevoId('p-'), instrumento: inst, plataforma: plat, cantidad: uds, fecha: hoyIso(), coste: lote.c, lotes: [lote] }; if (fecha < hoyIso()) pos.desde = fecha; S.cartera.posiciones.push(pos); }
      registrada = true;
      await guardarYPintar(`Añadir ${nombre}`, h);
      toast(`${nombre} añadida a tu cartera`, 3500);
      return;
    }
    const mov = { id: nuevoId('m-'), fecha, tipo: t, instrumento: inst, plataforma: plat, uds, precio: pr, gastos };
    if (t === 'compra' && q('efectivo').checked) {
      const ta0 = tasaDe(inst), total = uds * pr + gastos + (ta0 ? uds * pr * ta0.tipo : 0), hay = efectivoDe(plat);
      if (hay < total - 0.005 && fm.dataset.efConf !== String(total)) {
        fm.dataset.efConf = String(total);
        return err(`En ${plat} tienes ${eur(hay)} de efectivo y la compra son ${eur(total)}. Si pagaste el resto con dinero de fuera, pulsa otra vez: el efectivo se quedará en 0. Si no, quita la casilla de pagar con el efectivo.`);
      }
    }
    try {
      if (t === 'compra') {
        const ta = tasaDe(inst);
        mov.tasa = ta ? +(uds * pr * ta.tipo).toFixed(2) : 0;
        mov.importe = +(uds * pr + gastos + mov.tasa).toFixed(2);
        const lote = { f: fecha, u: uds, c: mov.importe };
        if (pos) { fijarPosicion(pos); pos.lotes = [...(pos.lotes || []), lote]; pos.cantidad = +(pos.cantidad + uds).toFixed(8); pos.coste = +(pos.coste + mov.importe).toFixed(2); }
        else { pos = { id: nuevoId('p-'), instrumento: inst, plataforma: plat, cantidad: uds, fecha, coste: mov.importe, lotes: [lote] }; S.cartera.posiciones.push(pos); }
      } else {
        if (!pos) return err('Elige qué vendiste.');
        fijarPosicion(pos);
        if (uds > pos.cantidad + 1e-6) return err(`Solo tienes ${fmtNum(pos.cantidad, 4)}.`);
        const nt = noTenias(pos.lotes, fecha, uds); if (nt) return err(nt);
        const r = fifo(pos.lotes, uds);
        mov.importe = +(uds * pr - gastos).toFixed(2);
        mov.coste_vendido = +r.coste.toFixed(2);
        mov.resultado = +(mov.importe - mov.coste_vendido).toFixed(2);
        mov.fifo = r.usados.map((l) => ({ f: l.f, u: +l.u.toFixed(8), c: +l.c.toFixed(2) }));
        if (r.mezcla) mov.mezcla = true;
        pos.lotes = r.quedan.map((l) => ({ ...l, u: +l.u.toFixed(8), c: +l.c.toFixed(2) }));
        pos.cantidad = +sum(pos.lotes, (l) => l.u).toFixed(8);
        pos.coste = +sum(pos.lotes, (l) => l.c).toFixed(2);
        if (pos.cantidad <= 1e-8) { S.cartera.posiciones = S.cartera.posiciones.filter((x) => x !== pos); if (S.ficha && S.ficha.id === pos.id) cerrarFicha(); }
      }
    } catch (e) { return err(e.message); }
    mov.posicion = pos.id;
    registrada = true;
    if (q('efectivo').checked) {
      S.cartera.efectivo = S.cartera.efectivo || [];
      let e = S.cartera.efectivo.find((x) => x.plataforma === plat);
      if (!e) { e = { plataforma: plat, importe: 0 }; S.cartera.efectivo.push(e); }
      e.importe = Math.max(0, +((+e.importe || 0) + (t === 'compra' ? -mov.importe : mov.importe)).toFixed(2));
    }
    (S.cartera.movimientos = S.cartera.movimientos || []).push(mov);
    await guardarYPintar(`${t === 'compra' ? 'Compra' : 'Venta'} de ${nombre}`, h);
    celebrarOperacion(t, nombre, mov, pos.id);
  };
}

/* 0.3: al apuntar una compra o una venta, una tarjeta que aparece con su animación (un anillo que se cierra, el
   importe que cuenta y unas chispas; verde si compras, dorado si vendes) y, detrás, la posición se ilumina */
function celebrarOperacion(t, nombre, mov, posId) {
  const compra = t === 'compra', quieta = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d = document.createElement('div');
  d.className = `celebra ${compra ? 'compra' : 'venta'}${quieta ? ' quieta' : ''}`; d.setAttribute('role', 'status');
  const chispas = quieta ? '' : Array.from({ length: 14 }, (_, k) => `<i style="--a:${(k / 14) * 360 + Math.random() * 14}deg;--d:${60 + Math.random() * 46}px;--r:${(Math.random() * 0.5 + 0.6).toFixed(2)}"></i>`).join('');
  const res = !compra && mov.resultado != null ? `<span class="cel-res ${cls(mov.resultado)}">${esc(eurS(mov.resultado))} ${L('de resultado', 'result')}</span>` : '';
  d.innerHTML = `<div class="cel-caja"><div class="cel-ic"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="cel-ar" cx="32" cy="32" r="28" pathLength="1"/><path class="cel-ok" d="M21 33l7.5 7.5L44 25" pathLength="1"/></svg><span class="cel-ch">${chispas}</span></div>
    <b>${compra ? L('Compra apuntada', 'Purchase recorded') : L('Venta apuntada', 'Sale recorded')}</b><span class="cel-n">${esc(nombre)}</span><span class="cel-imp" data-to="${+mov.importe || 0}">${S.oculto ? '••••' : eur(+mov.importe || 0, 0)}</span>${res}</div>`;
  document.body.appendChild(d);
  vibra();
  const imp = d.querySelector('.cel-imp');
  if (!quieta && !S.oculto && +mov.importe) { const to = +mov.importe, t0 = performance.now(); const paso = (tt) => { const k = Math.min(1, (tt - t0) / 700), e = 1 - Math.pow(1 - k, 3); imp.textContent = eur(to * e, 0); if (k < 1) requestAnimationFrame(paso); }; requestAnimationFrame(paso); }
  const cerrar = () => { d.classList.add('sale'); setTimeout(() => d.remove(), quieta ? 0 : 260); };
  d.addEventListener('click', cerrar);
  setTimeout(cerrar, 2200);
  // la posición, iluminada en la lista
  setTimeout(() => { const el = document.querySelector(`[data-pos="${CSS.escape(posId)}"]`); const fila = el && (el.closest('tr, li, .fila, article') || el); if (fila) { fila.classList.remove('destello'); void fila.offsetWidth; fila.classList.add('destello'); } }, 400);
}

