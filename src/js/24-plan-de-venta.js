/* =====================================================================
   Plan de venta: cuánto vender, cuándo, qué se lleva Hacienda y adónde mover el dinero
   ===================================================================== */

/* adónde va lo que no va a una acción nueva: el fondo indexado de bolsa en el que más tiene cada uno (entre fondos se
   cambia sin pagar con un traspaso); si no tiene ninguno, un fondo indexado global */
function nucleo(M) {
  const fs = ((M && M.filas) || []).filter((f) => f.inst.tipo === 'Fondo indexado' && f.inst.clase === 'Renta variable').sort((a, b) => b.valor - a.valor);
  const f = fs[0];
  if (f) return { n: f.inst.corto, a: L(`a tu fondo ${f.inst.corto}`, `to your ${f.inst.corto} fund`), d: f.inst.dominio || 'ishares.com',
    txt: L(`Mejor en tu fondo indexado ${f.inst.corto}${f.pos.plataforma ? ` de ${f.pos.plataforma}` : ''}: entre fondos podrás cambiar más adelante sin pagar impuestos con un traspaso.`, `Best in your ${f.inst.corto} index fund${f.pos.plataforma ? ` at ${f.pos.plataforma}` : ''}: between funds you can switch later without paying tax, with a transfer.`) };
  return { n: L('un fondo indexado global', 'a global index fund'), a: L('a un fondo indexado global', 'to a global index fund'), d: 'ishares.com',
    txt: L('Mejor en un fondo indexado de todo el mundo (un MSCI World o un S&P 500, con comisión baja): entre fondos podrás cambiar más adelante sin pagar impuestos con un traspaso.', 'Best in a global index fund (an MSCI World or an S&P 500, low cost): between funds you can switch later without paying tax, with a transfer.') };
}

function planVenta(f, M) {
  // 0.5, modo público: sin planes de venta (qué vender y adónde mover el dinero es una recomendación personalizada)
  if (esPublico()) return null;
  const c = cacheDe(M, '__plan');
  if (!c.has(f)) c.set(f, planVenta0(f, M));
  return c.get(f);
}
/* lo que te falta para tu colchón (los meses de gastos de tu perfil), y lo que ya cubren las ventas de las posiciones
   que van antes que esta */
function faltaColchon(M) {
  const c = cacheDe(M, '__colchon');
  if (!c.has('f')) { let x = 0; try { const e = estadoPerfil(M); if (e.colchon) x = Math.max(0, e.colchon - e.seguro); } catch (er) {} c.set('f', x); }
  return c.get('f');
}
function colchonYaCubierto(f, M) {
  let y = 0;
  for (const g of M.filas) { if (g === f) break; const pl = planVenta(g, M); if (pl) y += pl.aColchon || 0; }
  return y;
}
function planVenta0(f, M) {
  const nivel = f.senal.nivel;
  if (!['vender', 'recoger', 'reducir'].includes(nivel) || !f.uds || !f.precio) return null;
  const p = f.p || {}, a = p.analistas || {}, t = p.tecnico || {};
  const pr = f.precio, medio = (f.coste - (f.pendiente || 0)) / f.uds;
  const accion = f.inst.tipo === 'Acción';
  const redondea = (u) => (accion ? Math.min(f.uds, Math.ceil(u - 1e-9)) : u);
  let uds, cuanto;
  if (nivel === 'vender') { uds = f.uds; cuanto = 'Toda la posición.'; }
  else if (nivel === 'recoger') {
    uds = redondea(f.coste / pr);
    cuanto = L(`Lo que pusiste (${eur(f.coste, 0)}): recuperas tu dinero y lo que te quedas es ganancia que sigue trabajando.`, `What you put in (${eur(f.coste, 0)}): you get your money back and what you keep is profit that keeps working.`);
  } else {
    // hasta quedar algo por debajo de su límite (el de empresa, cripto u oro que se puso cada uno)
    const k = f.inst.clase === 'Cripto' ? 'cripto' : ['Oro', 'Materias primas'].includes(f.inst.clase) ? 'oro' : 'empresa', obj = Math.max(0, limiteDe(k) - 2);
    const pg = pesoLim(f, M) || f.peso;
    uds = redondea(Math.max(0, ((pg - obj) / 100) * M.total * (f.peso / pg)) / pr);
    cuanto = k === 'empresa' ? `Lo que pasa del ${fmtNum(obj, 0)} % de tu cartera: la deja con margen por debajo de tu máximo del ${fmtNum(limiteDe(k), 0)} %, para que una sola empresa no mande en tus resultados ni vuelva a pasarse con la próxima subida.` : `Lo que pasa del ${fmtNum(obj, 0)} % de tu cartera: lo deja con margen por debajo de tu máximo del ${fmtNum(limiteDe(k), 0)} % en ${k === 'cripto' ? 'cripto' : 'oro'}, para no volver a pasarte con la próxima subida.`;
  }
  if (!(uds > 0)) return null;
  const queda = f.uds - uds;
  const gastos = f.pos.plataforma === 'Trade Republic' ? 1 : 0;
  const importe = uds * pr, neto = importe - gastos;
  let r;
  try { r = fifo(lotesDe(f.pos), uds); } catch (e) { r = { coste: medio * uds, mezcla: true, usados: [] }; }
  const ganancia = neto - r.coste;
  const anio = new Date().getFullYear();
  const iv = impuestoDeVenta(ganancia, anio);
  const impuesto = Math.max(0, iv.impuesto);
  const mover = Math.max(0, neto - impuesto);
  const fiscal = { coste: r.coste, mezcla: r.mezcla, lotes: r.usados.length, antes: iv.antes, despues: iv.despues, anio, finDeAnio: new Date().getMonth() >= 10 };

  // cuándo
  const cuando = [];
  const hoy = hoyIso();
  const res = p.proximos_resultados && p.proximos_resultados >= hoy ? p.proximos_resultados : null;
  const diasRes = res ? diasEntre(hoy, res) : null;
  const pot = a.objetivo ? (a.objetivo / pr - 1) * 100 : null;
  if (nivel === 'vender' && +f.pos.stop && pr <= +f.pos.stop) cuando.push(L(`Ya: ha roto tu precio de salida (${precioFmt(+f.pos.stop)}). Cada día que esperas te expones a que siga cayendo.`, `Now: it has broken your exit price (${precioFmt(+f.pos.stop)}). Every day you wait you risk it falling further.`));
  else if (pot != null && pot < 3) cuando.push(L(`Ya: está en el precio objetivo medio de los analistas (${precioFmt(a.objetivo)}). En ${esc(f.pos.plataforma || 'tu bróker')}, pon una orden limitada de venta a ${precioCorto(pr)} (el precio de ahora).`, `Now: it's at the analysts' average price target (${precioFmt(a.objetivo)}). In ${esc(f.pos.plataforma || 'your broker')}, place a limit sell order at ${precioCorto(pr)} (the current price).`));
  else if (pot != null && nivel !== 'vender') cuando.push(`Con una orden limitada a ${precioCorto(a.objetivo)}, el precio objetivo medio: es donde los analistas ven su techo a 12 meses. Si no llega en unas semanas, vende igualmente.`);
  else cuando.push('En los próximos días, sin esperar a un rebote.');
  if (diasRes != null && diasRes <= 21) cuando.push(`Mejor antes de sus resultados del ${fechaLarga(res)} (en ${diasRes} días): con lo que lleva subido, lo bueno ya está en el precio y un mal dato puede tumbarla en una sesión.`);
  if (p.ex_dividendo && p.ex_dividendo >= hoy && diasEntre(hoy, p.ex_dividendo) <= 30 && p.dividendo_pct) cuando.push(`Si quieres cobrar el próximo dividendo, tienes que tenerla al cierre del día anterior al ${fechaLarga(p.ex_dividendo)}: ese día el precio baja más o menos lo que paga, así que no compensa esperar solo por eso.`);
  const ref = [+f.pos.stop || 0, t.media50 || 0].filter((x) => x > 0 && x < pr);
  const salidaResto = ref.length ? Math.max(...ref) : null;
  if (queda > 0 && salidaResto) {
    const st = +f.pos.stop, ud = accion ? 'acciones' : f.inst.clase === 'Cripto' || f.inst.tipo === 'ETC' ? 'unidades' : 'participaciones';
    const sube = st && Math.abs(st - salidaResto) > 0.005 && salidaResto > st;
    cuando.push(L(`Para las ${oc(fmtNum(queda, Math.abs(queda - Math.round(queda)) < 0.005 ? 0 : 2))} ${ud} que te quedas: ${sube ? `sube tu salida de ${precioCorto(st)} a ${precioCorto(salidaResto)}` : `orden stop a ${precioCorto(salidaResto)}`}${salidaResto === t.media50 ? ' (su media de 50 sesiones)' : sube ? '' : ' (tu precio de salida)'}. Si cierra por debajo, la subida se ha acabado y vendes el resto.`, `For the ${oc(fmtNum(queda, Math.abs(queda - Math.round(queda)) < 0.005 ? 0 : 2))} ${trad(ud)} you keep: ${sube ? `raise your exit from ${precioCorto(st)} to ${precioCorto(salidaResto)}` : `stop order at ${precioCorto(salidaResto)}`}${salidaResto === t.media50 ? ' (its 50-day average)' : sube ? '' : ' (your exit price)'}. If it closes below, the rise is over and you sell the rest.`));
  }

  // adónde
  const sueltas = sum(M.filas.filter((x) => x.inst.tipo === 'Acción'), (x) => x.valor);
  const lim = (+(S.cartera.limite_acciones ?? 20) / 100) * M.total;
  const hueco = Math.max(0, lim - (sueltas - (accion ? importe : 0)));
  const ideas = mejoresIdeas(M, { sector: p.sector });
  // 0.3.9: si te falta colchón, lo que sacas va primero ahí (antes, el Paso a paso decía «completa tu colchón antes de
  // meter más en bolsa» y, en el mismo mes, metía todo lo de la venta en bolsa). Se reparte en el orden de tus posiciones.
  const aColchon = Math.min(mover, Math.max(0, faltaColchon(M) - colchonYaCubierto(f, M)));
  const resto = mover - aColchon;
  let aIdea = 0;
  if (nivel === 'recoger') aIdea = Math.min(resto, hueco);
  else if (nivel === 'vender') aIdea = Math.min(resto * 0.5, hueco);
  // una acción nueva por menos de 300 € no compensa (comisiones, seguimiento): eso va al fondo
  if (!ideas.length || aIdea < 300) aIdea = 0;
  const aNucleo = resto - aIdea;
  return { f, nivel, uds, queda, cuanto, importe, neto, ganancia, impuesto, mover, cuando, ideas: ideas.slice(0, 3), aIdea, aNucleo, aColchon, salidaResto, accion, fiscal };
}

/* qué declaras con esta venta y cuánto pagas, con todo lo que ya llevas en el año */
function htmlFiscalVenta(pl) {
  const fs = pl.fiscal, a = fs.antes;
  const lineas = [];
  lineas.push(`Vendes por ${eur(pl.neto)} (comisión restada) lo que te costó ${eur(fs.coste)}${fs.lotes > 1 ? `, sacando primero las ${fs.lotes} compras más antiguas (FIFO)` : ''}.`);
  if (fs.mezcla) lineas.push('Lo que tenías antes de usar GrowFolio cuenta como una sola compra a tu precio medio. Si lo compraste en varias veces, Hacienda usa primero las más antiguas: el informe fiscal del bróker te da la cifra exacta.');
  const yaLlevas = [];
  if (a.gp) yaLlevas.push(`${eurS(a.gp, 0)} en otras ventas`);
  if (a.rcm) yaLlevas.push(`${eur(a.rcm, 0)} en dividendos e intereses`);
  if (a.pendientes) yaLlevas.push(`${eur(a.pendientes, 0)} de pérdidas de años anteriores`);
  if (pl.ganancia > 0) {
    lineas.push(yaLlevas.length ? `Este año ya llevas ${yaLlevas.join(', ')}: con esta venta tu base del ahorro queda en ${eur(fs.despues.base, 0)} y tu tramo en el ${pctTramo(fs.despues.marginal)} %.` : `Es lo único que declaras este año por ahora. Si tienes pérdidas de otras ventas o dividendos, apúntalos en Análisis > Hacienda > Datos fiscales, y este cálculo se ajusta.`);
    lineas.push(`Coste fiscal de mover el dinero: ${eur(pl.impuesto, 0)}. La inversión nueva tiene que ganar al menos eso más que ${esc(pl.f.inst.corto)} para que el cambio compense.`);
    if (fs.finDeAnio) lineas.push(`Si esperas a enero, el impuesto se paga un año más tarde (en la renta de ${fs.anio + 1}).`);
  } else {
    lineas.push(`Esa pérdida resta de tus ganancias de ${fs.anio}; si sobra, ${comunidadUsuario() === 'paisvasco' ? '' : 'de hasta un 25 % de tus dividendos e intereses y '}el resto en los 4 años siguientes. ${(() => { const r = reglaRecompra(pl.f.inst); return r && r.meses ? `No vuelvas a comprar ${esc(pl.f.inst.corto)} en ${r.plazo} (ni antes ni después de vender) o la pérdida no cuenta hasta que la vendas.` : 'En cripto la norma no está clara: para ir sobre seguro, no la recompres en un año.'; })()}`);
  }
  return `<b>${pl.ganancia > 0 ? `Declaras una ganancia de ${eur(pl.ganancia, 0)}: unos ${eur(pl.impuesto, 0)} de impuesto` : `Declaras una pérdida de ${eur(-pl.ganancia, 0)}: no pagas y te ahorra impuestos`}</b><details class="mas"><summary>Cómo se calcula</summary><ul class="motivos">${lineas.map((l) => `<li>${l}</li>`).join('')}</ul></details>`;
}
function htmlPlanVenta(pl, compacto) {
  if (!pl) return '';
  const f = pl.f, i = f.inst;
  const nombre = esc(i.corto || i.nombre);
  const top = pl.ideas[0];
  const idea = (x, k) => `<li><div class="idea-cab">${logo(x.w, x.n, 'peq')}<b title="${esc(x.n)}">${esc(nombreRadar(x))}</b><span class="k">${esc(trad(x.sector || ''))}${x.sector ? ', ' : ''}${esc(trad(x.z || ''))}</span></div>
    <span>${esc(x.motivos.slice(0, 4).join(', '))}.${x.pegas.length ? ` Pega: ${esc(x.pegas.join('; '))}.` : ''}</span></li>`;
  const destino = [];
  const tasaTop = top ? tasaRadar(top) : null;
  const pegaTop = top && top.pegas.find((x) => !x.startsWith('al comprar pagas'));
  if (pl.aIdea > 0 && top) destino.push(`<div class="pv-dest">${logo(top.w, top.n)}<div><b>${eur(pl.aIdea, 0)} a ${esc(nombreRadar(top))}</b><span>${L(`De las ${radarVals().length} empresas que sigue GrowFolio, la mejor contrastada para una acción nueva que no repita lo que ya tienes: ${top.ctr.favor} de ${top.ctr.total} señales a favor`, `Of the ${radarVals().length} companies GrowFolio follows, the best-backed new stock that doesn't repeat what you hold: ${top.ctr.favor} of ${top.ctr.total} signals in favour`)}: ${esc(top.motivos.slice(0, 3).join(', '))}.${pegaTop ? ` ${L('Pega', 'Drawback')}: ${esc(pegaTop)}.` : ''}${tasaTop ? ` Al comprar pagas el ${fmtNum(tasaTop.tipo * 100, 1)} % de ${esc(tasaTop.nombre)}: unos ${eur(pl.aIdea * tasaTop.tipo, 0)}, que suman a tu precio de compra.` : ''} ${(() => { const e = esperadaRadar(top), an = f.p && f.p.analistas, queda = an && an.objetivo ? (an.objetivo / f.precio - 1) * 100 : null; return e ? ` ${planTxt(e)}${queda != null ? ` A ${esc(i.corto)} le queda un ${pct(queda, 1)} hasta su objetivo.` : ''}` : ''; })()} ${esc(fiscalidadSede(origenRadar(top).sede).txt)}</span></div></div>`);
  const nu = nucleo(S.M);
  if (pl.aNucleo > 0.5) destino.push(`<div class="pv-dest">${logo(nu.d, nu.n)}<div><b>${eur(pl.aNucleo, 0)} ${esc(nu.a)}</b><span>${pl.nivel === 'reducir' ? L('Para bajar riesgo sin dejar de estar invertido. ', 'To lower risk without stopping being invested. ') : pl.aIdea > 0 ? L('La otra mitad, a lo seguro. ', 'The other half, somewhere safe. ') : L('Tus acciones sueltas no tienen más hueco dentro de tu límite. ', 'Your individual stocks have no more room within your limit. ')}${esc(nu.txt)}</span></div></div>`);
  if (pl.aColchon > 0.5) destino.push(`<div class="pv-dest">${logo(null, 'C')}<div><b>${eur(pl.aColchon, 0)} ${L('a tu colchón', 'to your cushion')}</b><span>${L(`Te faltan ${eur(faltaColchon(S.M || calcular()), 0)} para los meses de gastos que te pusiste. Déjalo en el efectivo remunerado o en un fondo monetario antes de meter más en bolsa.`, `You're ${eur(faltaColchon(S.M || calcular()), 0)} short of the months of expenses you set. Keep it in interest-bearing cash or a money-market fund before putting more into stocks.`)}</span></div></div>`);
  if (pl.impuesto > 0) destino.push(`<div class="pv-dest">${logo(null, '€')}<div><b>${eur(pl.impuesto, 0)} aparte para Hacienda</b><span>Se paga en la renta de ${pl.fiscal.anio}, entre abril y junio de ${pl.fiscal.anio + 1}. Déjalo en efectivo o en tu colchón hasta entonces: no lo inviertas en bolsa.</span></div></div>`);
  const plegado = compacto === 'plegado';
  if (plegado) compacto = false;
  const resP = f.p && f.p.proximos_resultados && f.p.proximos_resultados >= hoyIso() && diasEntre(hoyIso(), f.p.proximos_resultados) <= 21 ? f.p.proximos_resultados : null;
  const pasos = [
    `<b>Vende ${oc(fmtNum(pl.uds, pl.accion && esEntero(pl.uds) ? 0 : f.inst.clase === 'Cripto' ? 4 : 2))} ${pl.accion ? 'acciones' : f.inst.clase === 'Cripto' || f.inst.tipo === 'ETC' ? 'unidades' : 'participaciones'}, unos ${eur(pl.importe, 0)}</b>${resP ? `, antes del ${fechaCorta(resP)}` : ''}`,
    pl.aIdea > 0 && top ? `<b>Compra ${eur(pl.aIdea, 0)} de ${esc(nombreRadar(top))}</b>${(() => { const e = esperadaRadar(top); return e ? `<small>${esc(planTxt(e).replace(/^Plazo: /, ''))}</small>` : ''; })()}` : '',
    pl.aColchon > 0.5 ? `<b>Pon ${eur(pl.aColchon, 0)} en tu colchón</b><small>${L('te falta para tus meses de gastos', 'you are short of your months of expenses')}</small>` : '',
    pl.aNucleo > 0.5 ? `<b>${L(`Mete ${eur(pl.aNucleo, 0)} ${esc(nucleo(S.M).a.replace(/^a /, 'en '))}`, `Put ${eur(pl.aNucleo, 0)} ${esc(nucleo(S.M).a.replace(/^to /, 'into '))}`)}</b>` : '',
    pl.impuesto > 0 ? `<b>Aparta ${eur(pl.impuesto, 0)} para Hacienda</b><small>la renta de ${pl.fiscal.anio}, entre abril y junio de ${pl.fiscal.anio + 1}</small>` : '',
  ].filter(Boolean);
  return `<article class="plan-venta${compacto ? ' compacto' : ''}">
    <header>${logo(i.dominio, i.corto)}<div><h3>${nombre}</h3><span class="k">${esc(f.pos.plataforma || '')}, ahora ${precioFmt(f.precio)}</span></div><span class="senal ${f.senal.nivel}">${esc(f.senal.txt)}</span>${compacto ? '' : `<button class="btn peq" data-accion="asesor" data-q="${esc(`Explícame el plan de venta de ${i.corto}: ¿por qué ahora, por qué ese destino y qué alternativas bien contrastadas hay? Mira las noticias de esta semana.`)}">${ICONOS.growia}Pregúntale</button>`}</header>
    ${plegado ? `<p class="pv-porque">${esc(f.senal.motivos[0] || '')}${pl.nivel === 'reducir' && S.M && S.M.total ? ` ${esc(L(`Vendiendo esto, baja al ${pct(Math.max(0, f.valor - pl.importe) / S.M.total * 100, 1)} de tu cartera.`, `Selling this brings it down to ${pct(Math.max(0, f.valor - pl.importe) / S.M.total * 100, 1)} of your portfolio.`))}` : ''}</p><ol class="pv-resumen">${pasos.map((x) => `<li>${x}</li>`).join('')}</ol><details class="mas pv-mas"><summary>${pl.aIdea > 0 && top ? 'El plan completo: cuándo, a qué precio, Hacienda y por qué esa empresa' : 'El plan completo: cuándo, a qué precio, Hacienda y adónde va el dinero'}</summary>` : ''}
    <div class="pv-grid">
      <div class="pv-col">
        <div class="pv-paso"><span class="pv-n">Cuánto</span><div><b>Vende ${oc(fmtNum(pl.uds, pl.accion && esEntero(pl.uds) ? 0 : 4))} ${pl.accion ? 'acciones' : f.inst.clase === 'Cripto' || f.inst.tipo === 'ETC' ? 'unidades' : 'participaciones'}, unos ${eur(pl.importe, 0)}</b><span>${pl.cuanto}${pl.queda > 0 ? L(` Te quedas ${oc(fmtNum(pl.queda, Math.abs(pl.queda - Math.round(pl.queda)) < 0.005 ? 0 : 2))} ${pl.accion ? 'acciones' : f.inst.clase === 'Cripto' || f.inst.tipo === 'ETC' ? 'unidades' : 'participaciones'}, unos ${eur(pl.queda * f.precio, 0)}.`, ` You keep ${oc(fmtNum(pl.queda, Math.abs(pl.queda - Math.round(pl.queda)) < 0.005 ? 0 : 2))} ${pl.accion ? 'shares' : f.inst.clase === 'Cripto' || f.inst.tipo === 'ETC' ? 'units' : 'fund units'}, about ${eur(pl.queda * f.precio, 0)}.`) : ''}</span></div></div>
        <div class="pv-paso"><span class="pv-n">Cuándo</span><div><ul class="motivos">${pl.cuando.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
        <div class="pv-paso"><span class="pv-n">Hacienda</span><div>${htmlFiscalVenta(pl)}</div></div>
      </div>
      <div class="pv-col">
        <div class="pv-paso"><span class="pv-n">Adónde</span><div class="pv-destinos">${destino.join('') || '<span class="k">Déjalo en efectivo hasta tener una idea clara.</span>'}</div></div>
        ${!compacto && pl.ideas.length > 1 ? `<details class="mas"><summary>Por qué esa y no otra: las ${pl.ideas.length} mejores</summary><ol class="ideas-top">${pl.ideas.map(idea).join('')}</ol>
          <p class="nota">Cómo se puntúan: cuánto creen los analistas que puede subir, cuántos la recomiendan, si está barata frente a lo que gana (PER), cómo ha ido el último año, el dividendo y si te ayuda a repartir el riesgo. Se quedan fuera las que ya tienes, las del mismo sector que vendes, las que siguen menos de 8 analistas y las que han caído más de un 35 % en un año.</p></details>` : ''}
      </div>
    </div>${plegado ? '</details>' : ''}
  </article>`;
}

