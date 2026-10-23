/* =====================================================================
   Ficha de una posición (panel lateral en el PC, pantalla completa en el móvil)
   ===================================================================== */
const FTABS = [['resumen', 'Resumen'], ['expertos', 'Expertos'], ['noticias', 'Noticias'], ['datos', 'Datos']];

function abrirFicha(posId, tab) {
  if (S.ficha) cerrarFicha(true);
  S.ficha = { id: posId, tab: tab || 'resumen' };
  const f = document.createElement('div');
  f.className = 'ficha-fondo'; f.id = 'fichaFondo';
  f.innerHTML = '<div class="ficha" role="dialog" aria-modal="true" aria-labelledby="fichaTit"></div>';
  f.addEventListener('click', (e) => { if (e.target === f) cerrarFicha(); });
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';
  S.fichaAtras = conAtras(() => cerrarFicha(true), f);
  refrescarFicha();
  const b = $('#fichaFondo [data-accion="cerrar-ficha"]'); if (b) b.focus();
}
function cerrarFicha(desdeHistorial) {
  const f = $('#fichaFondo'); if (f) f.remove();
  document.body.style.overflow = '';
  const id = S.ficha && S.ficha.id;
  S.ficha = null;
  if (!desdeHistorial && S.fichaAtras) S.fichaAtras();
  S.fichaAtras = null;
  const vuelta = id && $(`[data-pos="${CSS.escape(id)}"]`); if (vuelta) vuelta.focus({ preventScroll: true });
}


function filaFicha() { return S.ficha && S.M && S.M.filas.find((x) => x.pos.id === S.ficha.id); }
function refrescarFicha() {
  const cont = $('#fichaFondo .ficha'); if (!cont) return;
  const f = filaFicha();
  if (!f) { cerrarFicha(); return; }
  const top = cont.scrollTop;
  cont.innerHTML = sinCortes(htmlFicha(f));
  // las pestañas se quedan fijas justo debajo de la barra de arriba; el precio pequeño sale cuando el grande se va
  const cab = $('.ficha-cab', cont);
  cont.style.setProperty('--ficha-cab-h', `${cab ? cab.offsetHeight : 64}px`);
  const mira = () => { const pr = $('.ficha-precio', cont); if (pr && cab) cont.classList.toggle('enrollada', pr.getBoundingClientRect().bottom < cab.getBoundingClientRect().bottom + 4); };
  cont.onscroll = mira;
  cont.scrollTop = top;
  mira();
  dibujarFicha();
}

function htmlFicha(f) {
  const id = f.pos.id, i = f.inst, p = f.p || {};
  const tipo = i.tipo === 'ETC' ? (i.clase === 'Oro' ? 'ETC de oro físico' : i.clase === 'Materias primas' ? 'ETC de materias primas' : 'ETC') : { 'Acción': 'Acción', 'Fondo indexado': 'Fondo indexado', 'Fondo de renta fija': 'Fondo de renta fija', Cripto: 'Criptomoneda' }[i.tipo] || i.tipo || '';
  let cuerpo = '';
  if (S.ficha.tab === 'resumen') cuerpo = fichaResumen(f);
  else if (S.ficha.tab === 'expertos') cuerpo = fichaExpertos(f);
  else if (S.ficha.tab === 'noticias') cuerpo = !(((S.precios && S.precios.noticias) || {})[i.id] || []).length && p.radar ? fichaNoticiasRadar(f) : `${informeDe(i.id) && informeDe(i.id).novedades ? `<section class="informe"><div class="sec-cab"><h3 style="margin:0;font-size:15px" data-no-trad>${conIA('Lo que dice la prensa, según GrowIA', 'What the press says, according to GrowIA')}</h3><span class="k">${cabInforme(S.informe)}</span></div>${htmlPrensaIA(informeDe(i.id), false).replace('class="prensa-ia"', 'class="prensa-ia" style="border:0;margin:0;padding:0"')}</section>` : ''}<section>${(((S.precios && S.precios.noticias) || {})[i.id] || []).length ? `${htmlNoticias(((S.precios && S.precios.noticias) || {})[i.id] || [], false, 20)}<p class="nota">Titulares de Google Noticias de los últimos 30 días.</p>` : `<div class="vacio">${L('Google Noticias no tiene titulares de esto en los últimos 30 días.', 'Google News has no headlines on this in the last 30 days.')}</div>`}</section>`;
  else cuerpo = fichaDatos(f);
  // arriba, fija, solo una barra fina (y el precio pequeño al bajar); el resto se va con el scroll hasta las pestañas,
  // que se quedan fijas debajo de la barra
  return `<div class="ficha-cab">
    <div class="ficha-tit">${logo(i.dominio, i.corto || i.nombre)}<div class="ft-n"><h2 id="fichaTit" title="${esc(i.nombre || '')}">${esc(i.corto || i.nombre)}</h2><small title="${esc(donde(i))}">${origen(i)}<span>${esc(tipo)}</span><span>${esc(f.pos.plataforma || '')}</span></small></div>
      <div class="ficha-mini" aria-hidden="true">${B('pp:' + id)}${B('pdF:' + id)}</div>
      <button class="ib ib-bicho" data-accion="opinion" title="Avisar de un fallo o mandar una idea" aria-label="Avisar de un fallo">${ICONOS.bicho}</button><button class="ib" data-accion="cerrar-ficha" aria-label="Cerrar">${ICONOS.cerrar}</button></div>
  </div>
  <div class="ficha-top">
    <div class="ficha-precio"><span class="p">${B('pp:' + id)}</span>${B('pdF:' + id)}<span class="k">${f.vivo && S.live[i.id] ? `hoy, ${esc(S.live[i.id].fuente)}` : /^Fondo/.test(i.tipo || '') && p.fecha ? `precio del ${fechaCorta(p.fecha)}: los fondos tienen uno al día` : p.fecha ? (p.fecha === hoyIso() && p.hora_mercado ? `hoy a las ${new Date(p.hora_mercado).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : `cierre del ${fechaCorta(p.fecha)}`) : 'hoy'}</span></div>
    <div class="ficha-precio" style="margin-top:-6px;font-size:15px"><span class="k">Tienes</span>${B('pv:' + id, 'valor')}${B('pg:' + id)}${B('pt:' + id)}</div>
    ${(() => { if (i.clase === 'Efectivo') return ''; const tp = tiempoPos(f); return tp ? `<div class="ficha-anual k">Desde hace ${duracion(tp.dias)}: <b class="${cls(tp.anual)}">${pctS(tp.anual, 1)} al año</b> (la bolsa suele dar un ${fmtNum(bolsaAnual(), 0)} %)</div>` : `<div class="ficha-anual k">¿Cuánto ganas al año? <button class="enlace acento" data-accion="editar-pos" data-id="${esc(id)}">Pon desde cuándo la tienes</button></div>`; })()}
    <div class="ficha-botones">
      <button class="btn compra" data-accion="operacion" data-tipo="compra" data-id="${esc(id)}">${ICONOS.compra}Comprar</button>
      <button class="btn venta" data-accion="operacion" data-tipo="venta" data-id="${esc(id)}">${ICONOS.venta}Vender</button>
      <button class="btn" data-accion="editar-pos" data-id="${esc(id)}">${ICONOS.lapiz}Editar</button>
      <button class="btn" data-accion="asesor" data-q="${esc(esPublico() ? `¿Qué está pasando con ${i.corto || i.nombre}? Contrasta su situación con las noticias de esta semana y lo que dicen los analistas.` : `¿Qué hago con ${i.corto || i.nombre}? Contrasta su situación con las noticias de esta semana y dime cuánto y cuándo.`)}">${ICONOS.growia}Pregúntale</button>
    </div>
  </div>
  <div class="tabs ficha-tabs" role="group" aria-label="Apartados">${FTABS.map(([k, t]) => `<button data-ftab="${k}" aria-pressed="${S.ficha.tab === k}">${t}</button>`).join('')}</div>
  <div class="ficha-cuerpo">${cuerpo}</div>`;
}

// quién gestiona el fondo, por la web de la gestora o por la primera palabra del nombre
const GESTORAS_DOM = { 'ishares.com': 'BlackRock (iShares)', 'vanguard.com': 'Vanguard', 'amundi.com': 'Amundi', 'fidelity.es': 'Fidelity', 'dws.com': 'DWS (Xtrackers)', 'ssga.com': 'State Street (SPDR)', 'invesco.com': 'Invesco', 'wisdomtree.eu': 'WisdomTree', 'nb.com': 'Neuberger Berman', 'myinvestor.es': 'MyInvestor', 'cobasam.com': 'Cobas', 'azvalor.com': 'Azvalor', 'magallanesvalue.com': 'Magallanes', 'bestinver.es': 'Bestinver', 'vaneck.com': 'VanEck', 'groupama-am.com': 'Groupama', 'truevalue.es': 'True Value' };
function gestoraDe(i, p) {
  if (i.dominio && GESTORAS_DOM[i.dominio]) return GESTORAS_DOM[i.dominio];
  const n = String((p && p.nombre_largo) || i.nombre || '').trim();
  return n.split(/\s+/)[0] || '—';
}
function fichaResumen(f) {
  const p = f.p || {}, i = f.inst, r = p.rent || {};
  // sin contar la aportación que aún no tiene precio (está en el coste pero no en las participaciones)
  const medio = f.uds && f.coste ? (f.coste - (f.pendiente || 0)) / f.uds : null;
  const kv = (filas) => `<dl class="kv">${filas.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const rg = p.max52 && p.min52 && f.precio ? Math.max(0, Math.min(100, ((f.precio - p.min52) / (p.max52 - p.min52 || 1)) * 100)) : null;
  // desde que la compraste: precio medio frente a ahora, lo ganado, desde cuándo y al año
  let dc = '';
  if (f.coste > 0 && f.valor > 0) {
    let desde = null; try { const l = lotesDe(f.pos); if (l.length) desde = l[0].mezcla ? f.pos.desde || null : l[0].f; } catch (e) {}
    const tp = tiempoPos(f);
    const ud = i.tipo === 'Acción' ? 'acciones' : i.clase === 'Cripto' || i.tipo === 'ETC' ? 'unidades' : 'participaciones';
    dc = `<section class="desde-compra" aria-label="Desde que la compraste">
      <div class="dc-fila">
        <div><span class="k">${medio ? 'Compraste a' : 'Invertido'}</span><b>${medio ? precioFmt(medio) : eur(f.coste, 0)}</b></div><span class="dc-flecha" aria-hidden="true">→</span>
        <div><span class="k">${medio ? 'Ahora' : 'Vale'}</span><b>${medio ? precioFmt(f.precio) : eur(f.valor, 0)}</b></div>
        <div class="dc-res ${cls(f.pl)}"><span class="k">${f.pl >= 0 ? 'Llevas ganado' : 'Llevas perdido'}</span><b>${eurS(f.pl, 0)}</b><span>${pctS(f.plPct, 1)}</span></div>
      </div>
      <p>${L(`${f.uds != null ? `${oc(fmtNum(f.uds, f.uds < 10 ? 4 : 2))} ${ud}, ` : ''}${eur(f.coste, 0)} invertidos${desde ? ` desde el ${fechaLarga(desde)}` : ''}${tp ? ` (${duracion(tp.dias)} de media): un <b class="${cls(tp.anual)}">${pctS(tp.anual, 1)} al año</b>` : ''}. ${f.estimada ? 'La cantidad es estimada: ponla exacta en Editar.' : 'Incluye comisiones y tasas de compra.'}${!desde ? ' Pon en Editar desde cuándo la tienes y verás cuánto te da al año.' : ''}`, `${f.uds != null ? `${oc(fmtNum(f.uds, f.uds < 10 ? 4 : 2))} ${i.tipo === 'Acción' ? 'shares' : i.clase === 'Cripto' || i.tipo === 'ETC' ? 'units' : 'fund units'}, ` : ''}${eur(f.coste, 0)} invested${desde ? ` since ${fechaCortaL(desde)} ${desde.slice(0, 4)}` : ''}${tp ? ` (${trad(duracion(tp.dias))} on average): <b class="${cls(tp.anual)}">${pctS(tp.anual, 1)} a year</b>` : ''}. ${f.estimada ? 'The quantity is estimated: enter the exact one in Edit.' : 'Includes fees and purchase taxes.'}${!desde ? ' Enter in Edit since when you have held it and you will see how much it gives you a year.' : ''}`)}</p>
    </section>`;
  }
  const raro = precioCompraRaro(f);
  return `${raro ? (() => { const a = avisoPrecioRaro(raro); return `<div class="aviso-ficha">${a.i}<div><b>${esc(a.t)}</b><span>${esc(a.d)}</span><div class="aviso-acc">${a.acc}</div></div></div>`; })() : ''}${dc}${htmlEsperaPos(f)}
  <section>
    <div class="evo-cab"><div class="datos" id="fichaCab"></div><div class="tabs" role="group" aria-label="Periodo">${Object.keys(RANGOS).filter((k) => k !== 'Inicio').map((k) => `<button data-frango="${k}" aria-pressed="${S.fichaRango === k}">${k}</button>`).join('')}</div></div>
    <div class="chart" id="fichaGraf"></div>
    ${medio ? `<div class="leyenda-graf"><span><i class="disc" style="border-color:var(--warn)"></i>Tu precio medio, ${precioFmt(medio)}</span></div>` : ''}
    ${p.proxy ? `<p class="nota">Hasta el ${fechaLarga(p.proxy_hasta)} es el precio de ${esc(p.proxy)}, un ETF del mismo índice, porque el fondo no existía.</p>` : ''}
  </section>
  <section class="tarjeta" style="background:var(--plane)">
    <h3>${f.senal.analistas ? L('Analistas', 'Analysts') : 'Señal'} <span class="senal ${f.senal.nivel}" style="margin-left:auto">${f.senal.analistas ? esc(f.senal.txt.replace(/^[^:]+:\s*/, '')) : f.senal.txt}</span></h3>
    <ul class="motivos">${f.senal.motivos.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
  </section>
  ${htmlPlanVenta(planVenta(f, S.M), true)}
  <div class="kv-2">
    <div class="bloque"><h3>Tu posición</h3>${kv([
      [i.tipo === 'Acción' || i.tipo === 'Cripto' || i.tipo === 'ETC' ? 'Unidades' : 'Participaciones', f.uds != null ? oc(fmtNum(f.uds, 6)) + (f.estimada ? ' <span class="chip warn">aproximada</span>' : '') : '—'],
      medio && ['Precio medio', precioFmt(medio)],
      ['Invertido', eur(f.coste)],
      ['Ganancia', `<span class="${cls(f.pl)}">${eurS(f.pl)}</span>`],
      ['Peso en tu cartera', pct(f.peso, 1)],
      f.aportes.length && ['Aportaciones sumadas', `${f.aportes.filter((a) => a.precio).length} de ${eur(f.aportes[0].importe, 0)}`],
      f.pendiente && ['Aportación en camino', eur(f.pendiente)],
      f.pos.stop && ['Tu salida', precioFmt(+f.pos.stop)],
      f.pos.objetivo && ['Tu objetivo', precioFmt(+f.pos.objetivo)],
    ])}</div>
    <div class="bloque"><h3>Rentabilidad del precio</h3>${kv([
      ['1 mes', `<span class="${cls(r['1m'])}">${pctS(r['1m'])}</span>`],
      ['3 meses', `<span class="${cls(r['3m'])}">${pctS(r['3m'])}</span>`],
      ['En el año', `<span class="${cls(r.ytd)}">${pctS(r.ytd)}</span>`],
      ['1 año', `<span class="${cls(r['1a'])}">${pctS(r['1a'])}</span>`],
      r['3a_anual'] != null && ['3 años, al año', `<span class="${cls(r['3a_anual'])}">${pctS(r['3a_anual'])}</span>`],
      r['5a_anual'] != null && ['5 años, al año', `<span class="${cls(r['5a_anual'])}">${pctS(r['5a_anual'])}</span>`],
      r['10a_anual'] != null && ['10 años, al año', `<span class="${cls(r['10a_anual'])}">${pctS(r['10a_anual'])}</span>`],
    ])}</div>
  </div>
  ${rg != null ? `<div class="bloque rango52"><h3>Rango de las últimas 52 semanas</h3><div class="pista"><div class="punto" style="left:${rg.toFixed(1)}%"></div></div><div class="ext"><span>${precioFmt(p.min52)}</span><span>${precioFmt(p.max52)}</span></div></div>` : ''}
  ${f.pos.notas ? `<div class="bloque"><h3>Tus notas</h3><p class="notas">${esc(f.pos.notas)}</p></div>` : ''}`;
}

/* las noticias de una empresa que la Action no sigue: lo que ha leído GrowIA de su prensa en el escaneo de todo el
   radar, los titulares que tenga y, siempre, el enlace a Google Noticias */
function fichaNoticiasRadar(f) {
  const i = f.inst, sim = (f.p && f.p.simbolo) || i.yahoo, le = sim ? lecturaDe(sim) : null;
  const vistos = new Set(), lista = [];
  for (const n of [...(sim ? noticiasIdea(sim) : []), ...((le && le.fuentes) || [])]) if (n && n.u && !vistos.has(n.u)) { vistos.add(n.u); lista.push(n); }
  const gnews = `https://news.google.com/search?q=${encodeURIComponent(i.nombre || i.corto)}&hl=es&gl=ES&ceid=ES:es`;
  return `${le && le.txt ? `<section class="informe"><div class="sec-cab"><h3 style="margin:0;font-size:15px" data-no-trad>${conIA('Lo que dice la prensa, según GrowIA', 'What the press says, according to GrowIA')}</h3><span class="k">${haceCuanto(le.d)}</span></div><p class="informe-res" style="font-size:15px">${chipImpacto(le.imp)} ${escIA(le.txt)}</p></section>` : ''}
    <section>${lista.length ? htmlNoticias(lista, false, 12) : ''}<p class="nota"><a class="enlace acento" href="${esc(gnews)}" target="_blank" rel="noopener noreferrer">${L(`Ver las noticias de ${esc(i.corto || i.nombre)} en Google Noticias`, `See ${esc(i.corto || i.nombre)} news on Google News`)}</a></p></section>`;
}
/* cuando Yahoo da los votos pero no el consenso (BAT): el consenso, de los votos (1 compra fuerte … 5 venta fuerte) */
function consensoVotos(v) {
  if (!v) return null;
  const xs = [v.strongBuy, v.buy, v.hold, v.sell, v.strongSell].map((x) => +x || 0), n = xs.reduce((a, b) => a + b, 0);
  if (n < 3) return null;
  const m = xs.reduce((a, x, k) => a + (k + 1) * x, 0) / n;
  return CONSENSO[m <= 1.5 ? 'strong_buy' : m <= 2.5 ? 'buy' : m <= 3.5 ? 'hold' : m <= 4.5 ? 'underperform' : 'sell'];
}
function fichaExpertos(f) {
  const p = f.p || {}, i = f.inst, a = p.analistas, fu = p.fundamentales || {};
  const kv = (filas) => `<dl class="kv">${filas.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const prensa = ((S.precios && S.precios.noticias) || {})[i.id] || [];
  const prensaA = prensa.filter((n) => RE_ANALISTA.test(n.t));
  if (i.tipo === 'Acción') {
    const v3 = a && a.votos && a.votos.hace3m;
    const est = p.estimaciones || {};
    return `
    ${htmlEsperaPos(f)}
    ${a ? `<section class="bloque"><h3>${(() => { const vv = a.votos && a.votos.ahora, nv = vv ? ['strongBuy', 'buy', 'hold', 'sell', 'strongSell'].reduce((t, k) => t + (+vv[k] || 0), 0) : 0; return `${nv || a.num || ''} analistas, consenso ${esc((consensoVotos(vv) || a.recomendacion || '—').toLowerCase())}`; })()}</h3>${htmlVotos(a.votos && a.votos.ahora)}
      ${v3 ? `<div style="margin-top:14px"><div class="k" style="font-size:13px;margin-bottom:6px">Hace 3 meses</div>${htmlVotos(v3, false)}</div>` : ''}</section>
    <section class="bloque"><h3>Precio objetivo a 12 meses</h3>${htmlObjetivo(a, f.precio) || '<div class="vacio">Sin precio objetivo.</div>'}</section>` : '<div class="vacio">Yahoo Finance no tiene analistas para esta acción.</div>'}
    <div class="kv-2">
      <div class="bloque"><h3>Valoración</h3>${kv([
        fu.capitalizacion && ['Capitalización', capital(fu.capitalizacion)],
        ['PER', fu.per ? fmtNum(fu.per, 1) : '—'],
        ['PER con beneficios futuros', fu.per_futuro ? fmtNum(fu.per_futuro, 1) : '—'],
        fu.peg && ['PEG', fmtNum(fu.peg, 2)],
        fu.pvc && ['Precio / valor contable', fmtNum(fu.pvc, 2)],
        fu.ev_ebitda && ['EV / EBITDA', fmtNum(fu.ev_ebitda, 1)],
        ['Dividendo', p.dividendo_pct ? pct(p.dividendo_pct, 2) : '—'],
        fu.payout != null && ['Reparte de su beneficio', pct(fu.payout, 0)],
      ])}</div>
      <div class="bloque"><h3>Negocio</h3>${kv([
        fu.crec_ingresos != null && ['Ventas, último año', `<span class="${cls(fu.crec_ingresos)}">${pctS(fu.crec_ingresos, 1)}</span>`],
        fu.crec_beneficio != null && ['Beneficio, último año', `<span class="${cls(fu.crec_beneficio)}">${pctS(fu.crec_beneficio, 1)}</span>`],
        est.este_anio && ['Beneficio esperado este año', `<span class="${cls(est.este_anio.crec)}">${pctS(est.este_anio.crec, 1)}</span>`],
        est.siguiente && ['Beneficio esperado el que viene', `<span class="${cls(est.siguiente.crec)}">${pctS(est.siguiente.crec, 1)}</span>`],
        fu.margen != null && ['Margen neto', pct(fu.margen, 1)],
        fu.roe != null && ['Rentabilidad sobre fondos propios', pct(fu.roe, 1)],
        fu.deuda_capital != null && ['Deuda / fondos propios', pct(fu.deuda_capital, 0)],
        fu.beta != null && ['Beta', fmtNum(fu.beta, 2)],
      ])}</div>
    </div>
    <details class="paso-mas"><summary>Qué significa cada dato</summary><dl class="glosa">
      <dt>PER</dt><dd>Cuántos años de beneficio pagas al precio de hoy. Más bajo es más barato, pero compáralo con empresas del mismo sector: una tecnológica que crece mucho suele tenerlo alto.</dd>
      <dt>PEG</dt><dd>El PER dividido entre lo que crece el beneficio. Cerca de 1 es razonable; muy por encima, pagas mucho por ese crecimiento.</dd>
      <dt>Precio / valor contable</dt><dd>El precio frente a lo que vale en sus libros. Útil sobre todo en bancos y aseguradoras.</dd>
      <dt>EV / EBITDA</dt><dd>Lo que costaría la empresa entera, deuda incluida, frente a lo que gana con su negocio antes de impuestos e intereses.</dd>
      <dt>Rentabilidad sobre fondos propios</dt><dd>Lo que gana por cada euro de sus accionistas (ROE). Por encima del 15 % es un buen negocio.</dd>
      <dt>Beta</dt><dd>Cuánto se mueve frente a la bolsa: 1 es lo mismo, 1,5 se mueve la mitad más y 0,5 la mitad.</dd>
    </dl></details>
    ${a && a.cambios && a.cambios.length ? `<section class="bloque"><h3>Cambios de recomendación</h3><ul class="noticias">${a.cambios.map((c) => `<li><span>${esc(c.firma)}: ${esc(c.accion || '')} ${c.de ? `de ${esc(c.de)} ` : ''}${c.a ? `a ${esc(c.a)}` : ''}${c.objetivo ? `, objetivo ${precioFmt(c.objetivo)}` : ''}</span><small>${fechaLarga(c.fecha)}</small></li>`).join('')}</ul></section>` : ''}
    <section class="bloque"><h3>Analistas en prensa</h3>${htmlNoticias(prensaA.length ? prensaA : prensa, false, 8)}</section>
    <p class="nota">Datos de Yahoo Finance${p.lento ? `, consultados ${haceCuanto(p.lento)}` : p.radar ? `, del radar de GrowFolio${p.fecha ? ` (${fechaCorta(p.fecha)})` : ''}` : ''}.</p>`;
  }
  if (/^Fondo/.test(i.tipo || '')) {
    const fo = p.fondo || {};
    const etfs = Object.entries(i.sector_etf || {});
    const part = (S.precios && S.precios.participaciones_etf) || {};
    const sect = Object.entries(pesosSector(f)).sort((x, y) => y[1] - x[1]).slice(0, 8);
    return `
    <div class="kv-2">
      <div class="bloque"><h3>El fondo</h3>${kv([
        ['Morningstar', fo.morningstar ? `<span class="estrellas">${'★'.repeat(fo.morningstar)}<span class="k">${'★'.repeat(5 - fo.morningstar)}</span></span>` : '<span class="k">sin calificar</span>'],
        i.ter != null && ['Comisión al año', `${pct(i.ter, 2)}, unos ${eur((f.valor * i.ter) / 100, 0)} con lo que tienes`],
        fo.per_cartera && ['Lo caro que está (PER medio de sus empresas)', fmtNum(fo.per_cartera, 1)],
        ['Gestora', esc(gestoraDe(i, p))],
        ['Nombre completo', esc(p.nombre_largo || i.nombre)],
      ])}</div>
      ${sect.length && sect[0][0] !== 'Sin datos' ? `<div class="bloque"><h3>Sectores</h3>${kv(sect.map(([k, v]) => [esc(k), pct(v, 1)]))}</div>` : ''}
    </div>
    ${etfs.length ? `<section class="bloque"><h3>Las mayores empresas que lleva</h3>${etfs.map(([etf, w]) => (part[etf] || []).length ? `<ul class="barras">${part[etf].map((h) => `<li><span class="n">${esc(h.n)}</span><span class="b"><i style="width:${Math.min(100, (h.w / part[etf][0].w) * 100).toFixed(1)}%"></i></span><span class="r">${pct(h.w, 1)}<small class="k" style="display:block;font-size:12px">${eur((f.valor * w * h.w) / 100, 0)}</small></span></li>`).join('')}</ul><p class="nota">Según ${esc(etf)}, un ETF del mismo índice${etfs.length > 1 ? ` (pesa un ${fmtNum(w * 100, 0)} % en este fondo)` : ''}. Debajo de cada porcentaje, cuánto de tu dinero va a esa empresa.</p>` : '').join('')}</section>` : ''}
    <p class="nota">En un fondo indexado no hay analistas que opinen: lo que importa son los gastos y que siga bien al índice.</p>`;
  }
  const t = p.tecnico || {};
  return `<div class="vacio">No hay analistas para ${esc(i.corto)}: no es una empresa. Lo que más pesa es la tendencia y la volatilidad.</div>
    <div class="bloque"><h3>Cómo va el precio</h3>${kv([
      t.tendencia && ['Tendencia', esc(t.tendencia)],
      t.vs_media200 != null && ['Frente a su media de 200 sesiones', `<span class="${cls(t.vs_media200)}">${pctS(t.vs_media200, 1)}</span>`],
      t.dist_max52 != null && ['Desde su máximo del año', `<span class="${cls(t.dist_max52)}">${pctS(t.dist_max52, 1)}</span>`],
      p.volatilidad && ['Volatilidad', pct(p.volatilidad, 1)],
    ])}</div>
    <section class="bloque"><h3>En prensa</h3>${htmlNoticias(prensa, false, 8)}</section>`;
}

/* lo básico del precio sacado de su histórico, para lo que no trae análisis técnico (fondos del catálogo, lo que añade cada uno) */
function tecnicoDeHist(h) {
  if (!h || h.length < 30) return {};
  const desde = iso(new Date(Date.now() - 366 * 864e5)), pts = h.filter(([d, v]) => d >= desde && +v > 0), a = pts.map(([, v]) => +v);
  if (a.length < 30) return {};
  // los puntos que hay de verdad en un año (la cripto cotiza también en fin de semana: 365, no 252)
  const porAnio = (a.length - 1) * 365 / (diasEntre(pts[0][0], pts[pts.length - 1][0]) || 365);
  const ult = a[a.length - 1], max = Math.max(...a);
  let pico = a[0], caida = 0; for (const v of a) { if (v > pico) pico = v; caida = Math.min(caida, (v / pico - 1) * 100); }
  const rs = a.slice(1).map((v, k) => Math.log(v / a[k])), m = rs.reduce((x, y) => x + y, 0) / rs.length;
  const vol = Math.sqrt(rs.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, rs.length - 1)) * Math.sqrt(porAnio) * 100;
  const m200 = a.slice(-200).reduce((x, y) => x + y, 0) / Math.min(200, a.length), vs = (ult / m200 - 1) * 100;
  return { tendencia: vs > 3 ? 'alcista' : vs < -3 ? 'bajista' : 'lateral', dist_max52: (ult / max - 1) * 100, caida_max_1a: caida, volatilidad: vol, r1a: (ult / a[0] - 1) * 100 };
}
function fichaDatos(f) {
  const p = f.p || {}, i = f.inst, ce = catDe(i) || {};
  const th = p.tecnico ? {} : tecnicoDeHist(f.hist), t = p.tecnico || th;
  const vol = p.volatilidad || th.volatilidad, r1a = ce.r1a != null ? ce.r1a : th.r1a, moneda = p.moneda || ce.m;
  const kv = (filas) => `<dl class="kv">${filas.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const anios = Object.entries(p.anios || {});
  const zonas = Object.entries(i.region || {}).filter(([, v]) => v > 0).sort((x, y) => (x[0] === 'Otros') - (y[0] === 'Otros') || y[1] - x[1]);
  return `
  <div class="kv-2">
    <div class="bloque"><h3>Cómo va el precio</h3>${kv([
      (t.tendencia || !(r1a != null || vol)) && ['Tendencia', t.tendencia ? esc(t.tendencia) : '—'],
      !p.tecnico && r1a != null && ['En el último año', `<span class="${cls(r1a)}">${pctS(r1a, 1)}</span>`],
      t.dist_max52 != null && ['Desde su máximo del año', `<span class="${cls(t.dist_max52)}">${pctS(t.dist_max52, 1)}</span>`],
      t.caida_max_1a != null && ['Peor caída del año', `<span class="down">${pct(t.caida_max_1a, 1)}</span>`],
      vol && ['Cuánto se mueve (volatilidad del último año)', pct(vol, 1)],
      p.riesgo && ['Riesgo (de 1 a 7)', `${p.riesgo}, ${RIESGO_TXT[p.riesgo].toLowerCase()}`],
    ])}${t.media50 || t.media200 || t.rsi != null ? `<details class="paso-mas"><summary>Para curiosos: medias y RSI</summary>${kv([
      t.media50 && ['Media de 50 sesiones', precioFmt(t.media50)],
      t.media200 && ['Media de 200 sesiones', precioFmt(t.media200)],
      t.vs_media200 != null && ['Precio frente a la de 200', `<span class="${cls(t.vs_media200)}">${pctS(t.vs_media200, 1)}</span>`],
      t.rsi != null && ['RSI (14 sesiones): por encima de 70 ha subido muy deprisa; por debajo de 30, ha caído muy deprisa', fmtNum(t.rsi, 0) + (t.rsi >= 70 ? ' <span class="chip warn">sobrecompra</span>' : t.rsi <= 30 ? ' <span class="chip info">sobreventa</span>' : '')],
    ])}</details>` : ''}</div>
    <div class="bloque"><h3>Identificación</h3>${kv([
      i.isin && ['ISIN', esc(i.isin)],
      (p.simbolo || i.yahoo) && ['Símbolo en Yahoo', esc(p.simbolo || i.yahoo)],
      i.tipo && !p.sector && ['Tipo', esc(i.tipo)],
      moneda && ['Cotiza en', esc(moneda === 'GBp' ? 'peniques de libra (100 = 1 £)' : moneda)],
      !p.fecha && ce.f && ['Último valor publicado', fechaLarga(ce.f)],
      !p.sector && zonas.length > 1 && ['Dónde invierte', esc(zonas.map(([z, v]) => `${trad(z)}\u00a0${fmtNum(v, 0)}\u00a0%`).join(', '))],
      p.moneda && p.moneda !== 'EUR' && ['Precio en su moneda', fmtNum(p.precio_local, 2)],
      p.historico_desde && ['Histórico desde', fechaLarga(p.historico_desde)],
      p.sector && ['Sector', esc(p.sector)],
      p.industria && INDUSTRIA_ES[p.industria] && ['Industria', esc(IDIOMA === 'en' ? p.industria : INDUSTRIA_ES[p.industria])],
      f.pos.entrada && f.pos.entrada.fecha && ['Cuándo y a cuánto entraste', `${fechaCorta(f.pos.entrada.fecha)} a ${precioFmt(+f.pos.entrada.precio)}`],
    ])}</div>
  </div>
  ${anios.length ? `<section class="bloque"><h3>Año a año</h3><div class="anios">${anios.map(([y, v]) => `<div><span class="k">${y}</span><span class="${cls(v)}">${pctS(v, 1)}</span></div>`).join('')}</div><p class="nota">Rentabilidad del precio en euros de cada año natural. El último va hasta hoy.</p></section>` : ''}`;
}

function dibujarFicha() {
  const g = $('#fichaGraf'); if (!g) return;
  const f = filaFicha(); if (!f) return;
  const dias = RANGOS[S.fichaRango] || 366;
  const pi = INTRADIA.has(S.fichaRango) && S.intra && S.intra.p && S.intra.p[f.inst.id];
  let h;
  if (pi && pi.length > 1) {
    const dia = pi[pi.length - 1][0].slice(0, 10), antes = pi.filter(([t]) => t.slice(0, 10) < dia);
    const lim = S.fichaRango === '1D' ? (antes.length ? antes[antes.length - 1][0] : pi[0][0]) : new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 16) + 'Z';
    h = pi.filter(([t]) => t >= lim).map(([d, v]) => ({ d, v }));
    if (f.precio && h.length) h.push({ d: new Date().toISOString().slice(0, 16) + 'Z', v: f.precio });
  } else {
    const desde = iso(new Date(Date.now() - Math.max(dias, INTRADIA.has(S.fichaRango) ? 9 : 0) * 86400000));
    h = (f.hist || []).filter(([d]) => d >= desde).map(([d, v]) => ({ d, v }));
    if (h.length && f.precio) { const hoy = hoyIso(); if (h[h.length - 1].d === hoy) h[h.length - 1].v = f.precio; else h.push({ d: hoy, v: f.precio }); }
  }
  const cab = $('#fichaCab');
  if (cab && h.length > 1) { const p = (h[h.length - 1].v / h[0].v - 1) * 100; cab.innerHTML = `<span class="${cls(p)}">${pctS(p)}</span><span class="k">${S.fichaRango === '1D' && pi ? 'desde el último cierre' : `desde el ${fechaPunto(h[0].d)}`}</span>`; }
  // sin contar la aportación que aún no tiene precio (está en el coste pero no en las participaciones)
  const medio = f.uds && f.coste ? (f.coste - (f.pendiente || 0)) / f.uds : null;
  grafLinea(g, [{ datos: h }], { titulo: 'Precio', fmt: (v) => precioFmt(v), ejeFmt: (v) => fmtNum(v, Number.isInteger(v) || v >= 100 ? 0 : 2), cambio: true, alto: 240, linea: medio ? { v: medio, etiqueta: '' } : null });
}

