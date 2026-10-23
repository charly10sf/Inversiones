/* ---------- aportaciones periódicas ---------- */
function aportacionesActivas() { const hoy = hoyIso(); return (S.cartera.aportaciones || []).map((a, k) => ({ a, k })).filter(({ a }) => !a.hasta || a.hasta >= hoy); }
function yaHaAportado(a) {
  // ¿ha generado ya alguna aportación que esté sumada en una posición?
  return (S.cartera.posiciones || []).some((p) => p.instrumento === a.instrumento && (!a.plataforma || a.plataforma === p.plataforma) && fechasAportacion(a, p.fecha || hoyIso(), hoyIso()).length > 0);
}
function editarAportacion(k) {
  const orig = k != null ? S.cartera.aportaciones[k] : null;
  const a = orig ? { ...orig } : { instrumento: S.instOrden[0], plataforma: 'MyInvestor', importe: null, dia: 1, desde: hoyIso() };
  const h = hoja(orig ? 'Editar aportación' : 'Añadir aportación', `
    <form id="fAp" novalidate>
      <div class="form-grid">
        <label class="campo">Destino<select name="instrumento">${opcionesInst(a.instrumento, false)}</select></label>
        <label class="campo">Plataforma<select name="plataforma">${opcionesPlat(a.plataforma)}</select></label>
        <label class="campo">Importe al mes (€)<input name="importe" inputmode="decimal" value="${val(a.importe)}"></label>
        <label class="campo">Día del mes<input name="dia" type="number" min="1" max="31" value="${val(a.dia)}"></label>
        <label class="campo">Desde<input name="desde" type="date" value="${val(orig ? hoyIso() : a.desde)}"><small>${orig ? 'Las aportaciones anteriores se quedan como estaban.' : 'La primera se suma en la primera fecha que caiga a partir de aquí.'}</small></label>
      </div>
      <div class="error" id="errAp"></div>
      <div class="fila-btns">${orig ? `<button type="button" class="btn peligro izq" id="bQuitarAp">${ICONOS.papelera}Dejar de aportar</button>` : ''}<button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
    </form>`);
  const fm = $('#fAp', h.el), g = (n) => fm.querySelector(`[name="${n}"]`).value;
  const ayer = iso(new Date(Date.now() - 86400000));
  if (orig) dosPasos($('#bQuitarAp', h.el), 'Pulsa otra vez para dejar de aportar', async () => {
    if (yaHaAportado(orig)) orig.hasta = ayer; else S.cartera.aportaciones.splice(k, 1);
    await guardarYPintar('Quitar aportación', h);
  });
  fm.onsubmit = async (ev) => {
    ev.preventDefault();
    const importe = numero(g('importe')), dia = Math.round(+g('dia'));
    if (!(importe > 0)) { $('#errAp', h.el).textContent = 'Pon un importe.'; return; }
    if (!(dia >= 1 && dia <= 31)) { $('#errAp', h.el).textContent = 'El día va del 1 al 31.'; return; }
    const nueva = { instrumento: g('instrumento'), plataforma: g('plataforma'), importe, dia, desde: g('desde') || hoyIso() };
    if (orig && yaHaAportado(orig)) {
      // la anterior termina ayer y la nueva empieza hoy: así no se recalculan las aportaciones pasadas
      orig.hasta = nueva.desde > ayer ? sumarDias(nueva.desde, -1) : ayer;
      S.cartera.aportaciones.push(nueva);
    } else if (orig) Object.assign(orig, nueva);
    else (S.cartera.aportaciones = S.cartera.aportaciones || []).push(nueva);
    await guardarYPintar(orig ? 'Cambiar aportación' : 'Añadir aportación', h);
  };
}

