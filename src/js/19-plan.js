/* =========================== Plan (dentro de Cartera) =========================== */
/* dónde cotiza: la bolsa por el sufijo del ticker; los fondos, su país; la cripto, en todas partes */
function cotiza(inst) {
  const y = String((inst && inst.yahoo) || ''), suf = y.includes('.') ? y.split('.').pop().toUpperCase() : '';
  if (inst && inst.clase === 'Cripto') return { cod: null, txt: 'cripto, 24 h' };
  if (/^Fondo/.test((inst && inst.tipo) || '')) return { cod: inst.pais || null, txt: inst.pais ? `fondo de ${PAISES[inst.pais] || inst.pais}` : 'fondo' };
  if (suf && BOLSA_SUFIJO[suf]) return { cod: BOLSA_SUFIJO[suf][0], txt: 'bolsa de ' + BOLSA_SUFIJO[suf][1] };
  if (y && !suf && inst.tipo === 'Acción') return { cod: 'US', txt: 'bolsa de EEUU' };
  return { cod: inst && inst.pais, txt: (inst && inst.pais && (PAISES[inst.pais] || inst.pais)) || 'global' };
}
const chipCotiza = (inst) => { const c = cotiza(inst); return `<span class="origen">${bandera(c.cod)}${esc(c.txt)}</span>`; };
function activoMini(inst, extra = '') {
  const i = inst || {};
  return `<span class="activo-l mini">${logo(i.dominio, i.corto || i.nombre || '?')}<span class="activo"><b>${esc(i.corto || i.nombre || '?')}</b><small>${chipCotiza(i)}${extra}</small></span></span>`;
}
function htmlPlan(M) {
  const ap = aportacionesActivas();
  const total = sum(ap, ({ a }) => +a.importe || 0);
  // los tres próximos meses enteros (el último no sale cortado)
  const ev0 = eventos(M, 130).filter((e) => e.tipo === 'aportacion');
  const meses3 = [...new Set(ev0.map((e) => e.d.slice(0, 7)))].sort().slice(0, 3);
  const ev = ev0.filter((e) => meses3.includes(e.d.slice(0, 7)));
  const porMes = new Map();
  for (const e of ev) { const k = e.d.slice(0, 7); porMes.set(k, (porMes.get(k) || 0) + e.importe); }
  const movs = [...(S.cartera.movimientos || [])].sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
  const nombreI = (id) => esc((S.inst[id] && S.inst[id].corto) || id);
  return `
  <div class="dos">
    <div class="pila">
      <section aria-labelledby="hAp">
        <div class="sec-cab"><h2 id="hAp">Aportaciones periódicas</h2><div class="der"><button class="btn peq" data-accion="nueva-ap" aria-label="Añadir aportación" title="Añadir aportación">${ICONOS.mas}Añadir</button></div></div>
        ${ap.length ? `<p class="plan-sub">${eur(total, 0)} al mes, ${eur(total * 12, 0)} al año</p>
        <ul class="plan-l">${ap.map(({ a, k }) => {
          const prox = fechasAportacion({ ...a, desde: a.desde > hoyIso() ? a.desde : hoyIso() }, iso(new Date(Date.now() - 86400000)), iso(new Date(Date.now() + 70 * 86400000)))[0];
          const i = S.inst[a.instrumento] || { corto: a.instrumento };
          return `<li>${logo(i.dominio, i.corto || i.nombre || '?')}<div class="pl-t"><b>${esc(i.corto || i.nombre || a.instrumento)}</b><small>${[esc(a.plataforma || ''), L(`el día ${esc(a.dia)}`, `on day ${esc(a.dia)}`), prox ? L(`próxima ${fechaCorta(prox)}`, `next ${fechaCorta(prox)}`) : ''].filter(Boolean).join(' · ')}</small></div>
            <div class="pl-n"><b>${eur(+a.importe, 0)}</b><small>${L('al mes', 'a month')}</small></div><button class="ib" data-accion="editar-ap" data-k="${k}" aria-label="${L('Editar', 'Edit')} ${esc(i.corto || '')}" title="${L('Editar', 'Edit')}">${ICONOS.lapiz}</button></li>`;
        }).join('')}</ul>` : '<div class="vacio">No tienes aportaciones automáticas. Añade las que tengas programadas en tu bróker y GrowFolio las irá sumando sola.</div>'}
        <p class="nota">Cada aportación se suma sola a su posición con el precio del primer día después de la fecha (el que usa el fondo). Si cambias el importe o el día en tu bróker, cámbialo aquí también.</p>
      </section>
      <section aria-labelledby="hMov">
        <div class="sec-cab"><h2 id="hMov">Compras y ventas</h2><div class="der"><button class="btn peq compra" data-accion="operacion" data-tipo="compra" aria-label="Apuntar compra" title="Apuntar compra">${ICONOS.compra}Compra</button><button class="btn peq venta" data-accion="operacion" data-tipo="venta" aria-label="Apuntar venta" title="Apuntar venta">${ICONOS.venta}Venta</button></div></div>
        ${movs.length ? `<ul class="plan-l">${movs.map((m) => {
          const i = S.inst[m.instrumento] || {}, compra = m.tipo === 'compra';
          return `<li>${logo(i.dominio, nombreI(m.instrumento))}<div class="pl-t"><b><span class="${compra ? 'up' : 'down'}">${compra ? 'Compra' : 'Venta'}</span> ${nombreI(m.instrumento)}</b><small>${[fechaLarga(m.fecha), esc(m.plataforma || ''), `${oc(fmtNum(m.uds, 4))} ${L('a', 'at')} ${precioFmt(m.precio)}`].filter(Boolean).join(' · ')}</small></div>
            <div class="pl-n"><b>${eur(m.importe, 0)}</b><small class="${compra ? '' : cls(m.resultado)}">${compra ? (m.gastos ? `${L('gastos', 'fees')} ${eur(m.gastos)}` : '') : eurS(m.resultado || 0, 0)}</small></div><button class="ib peligro" data-accion="borrar-mov" data-id="${esc(m.id)}" aria-label="Borrar del historial" title="Borrar del historial">${ICONOS.papelera}</button></li>`;
        }).join('')}</ul><p class="nota">Borrar una operación del historial no deshace su efecto en la posición: para eso, edita la posición.</p>` : '<div class="vacio">Aquí saldrán las compras y ventas que registres. Al registrarlas se actualizan solas la posición, el efectivo y el resultado para la renta.</div>'}
      </section>
      <section aria-labelledby="hPosE">
        <div class="sec-cab"><h2 id="hPosE">Posiciones</h2><div class="der"><button class="btn peq" data-accion="nueva-pos">${ICONOS.mas}Lo que ya tenías</button></div></div>
        <ul class="plan-l">${M.filas.map((f) => `<li>${logo(f.inst.dominio, f.inst.corto || f.inst.nombre || '?')}<div class="pl-t"><b>${esc(f.inst.corto || f.inst.nombre || '?')}</b><small>${[esc(f.pos.plataforma || ''), f.uds != null ? `${f.estimada ? '≈' : ''}${oc(fmtNum(f.uds, f.uds >= 1 ? 2 : 4))} ${L('uds.', 'units')}` : ''].filter(Boolean).join(' · ')}</small></div>
          <div class="pl-n"><b>${eur(f.valor, 0)}</b><small>${L('invertido', 'invested')} ${eur(f.coste, 0)}</small></div><button class="ib" data-accion="editar-pos" data-id="${esc(f.pos.id)}" aria-label="${L('Editar', 'Edit')} ${esc(f.inst.corto || '')}" title="${L('Editar', 'Edit')}">${ICONOS.lapiz}</button></li>`).join('')}</ul>
      </section>
    </div>
    <aside class="pila lateral">
      <section aria-labelledby="hCal"><div class="sec-cab"><h2 id="hCal">Próximas aportaciones</h2></div>
        ${porMes.size ? `<ul class="lista agenda">${[...porMes.entries()].map(([k, v]) => { const d = deIso(k + '-01'); return `<li><div class="dia"><b>${MESES[d.getMonth()]}</b><br><span class="k">${d.getFullYear()}</span></div><div><b>${eur(v, 0)}</b><span class="logos-fila">${ev.filter((e) => e.d.startsWith(k)).map((e) => { const varias = !!e.varias; const n = e.nombresAp || e.t; return `<span>${varias ? '' : logo((S.inst[e.inst] || {}).dominio, n, 'peq')}${esc(n)}${IDIOMA === 'en' ? ', day ' : ' el '}${deIso(e.d).getDate()}</span>`; }).join('')}</span></div><span></span></li>`; }).join('')}</ul>` : '<div class="vacio">Sin aportaciones programadas.</div>'}
      </section>
      <section aria-labelledby="hEf"><div class="sec-cab"><h2 id="hEf">Efectivo</h2><span class="k">${eur(M.liquidez, 0)}</span><div class="der"><button class="btn peq" data-accion="efectivo">${ICONOS.lapiz}Cambiar</button></div></div>
        <ul class="leyenda">${(S.cartera.efectivo || []).map((e) => `<li style="grid-template-columns:minmax(0,1fr) auto"><span class="n">${esc(e.plataforma)}${bancosDe(e.plataforma).some((b) => !b.caducada) ? ` <small class="ef-dbk" title="${esc(L('Saldo del banco', 'Bank balance'))}">${ICONOS.banco}</small>` : ''}</span><span class="p">${eur(+e.importe || 0)}</span></li>`).join('') || '<li class="vacio">Sin efectivo</li>'}</ul>
      </section>
      <a class="ir-objetivos" href="#objetivos">${ICONOS.futuro}<span><b>Tus límites, tu perfil y tus metas</b><small>están en Análisis > Tus objetivos</small></span></a>
    </aside>
  </div>`;
}

