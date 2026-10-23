/* ---------- señales: qué hacer con cada posición ----------
   Resumen automático con reglas a la vista: consenso de analistas, potencial hasta su precio objetivo,
   tendencia (precio frente a su media de 200 sesiones), tus reglas de salida y el peso en la cartera. */
const SENALES = {
  comprar: 'Comprar más', aportar: 'Seguir aportando', mantener: 'Mantener', vigilar: 'Vigilar',
  recoger: 'Recoger beneficios', reducir: 'Reducir peso', vender: 'Vender',
};
/* 0.5, modo estándar: la etiqueta de cada posición es lo que opinan los analistas (Yahoo Finance), no un consejo de
   GrowFolio: es su opinión y es la misma para cualquiera que tenga esa acción. Sin analistas (fondos, ETF, oro,
   cripto) no lleva etiqueta. Debajo, sus datos: cuántos dicen qué, su precio objetivo y la tendencia, sin veredicto */
function senalAnalistas(f) {
  const p = f.p || {}, a = p.analistas || {}, v = votosResumen(a.votos && a.votos.ahora), pr = f.precio, motivos = [];
  if (!v) return { nivel: 'nada', txt: '', motivos: [L('No hay analistas que la sigan (los fondos, los ETF, el oro y la cripto no los tienen).', 'No analysts cover it (funds, ETFs, gold and crypto have none).')], analistas: true };
  const vv = (a.votos && a.votos.ahora) || {};
  const media = (1 * (vv.strongBuy || 0) + 2 * (vv.buy || 0) + 3 * (vv.hold || 0) + 4 * (vv.sell || 0) + 5 * (vv.strongSell || 0)) / v.n;
  const nivel = media <= 2.5 ? 'comprar' : media <= 3.5 ? 'mantener' : 'vender';
  const palabra = { comprar: L('comprar', 'buy'), mantener: L('mantener', 'hold'), vender: L('vender', 'sell') }[nivel];
  motivos.push(L(`De ${v.n} analistas, ${v.compra} dicen comprar, ${v.mantener} mantener y ${v.venta} vender (Yahoo Finance).`, `Of ${v.n} analysts, ${v.compra} say buy, ${v.mantener} hold and ${v.venta} sell (Yahoo Finance).`));
  const antes = votosResumen(a.votos.hace3m);
  if (antes) { const dif = v.compra / v.n - antes.compra / antes.n; if (dif >= 0.08) motivos.push(L('Hay más analistas a favor que hace 3 meses.', 'More analysts in favour than 3 months ago.')); if (dif <= -0.08) motivos.push(L('Hay menos analistas a favor que hace 3 meses.', 'Fewer analysts in favour than 3 months ago.')); }
  const pot = a.objetivo && pr ? (a.objetivo / pr - 1) * 100 : null;
  if (pot != null) motivos.push(pot >= 0 ? L(`Su precio objetivo medio (${precioFmt(a.objetivo)}) está un ${fmtNum(pot, 1)} % por encima del de hoy.`, `Their average target (${precioFmt(a.objetivo)}) is ${fmtNum(pot, 1)} % above today's price.`) : L(`Cotiza un ${fmtNum(-pot, 1)} % por encima de su precio objetivo medio (${precioFmt(a.objetivo)}).`, `It trades ${fmtNum(-pot, 1)} % above their average target (${precioFmt(a.objetivo)}).`));
  const t = p.tecnico || {};
  if (t.tendencia === 'alcista' && t.vs_media200 != null) motivos.push(L(`Cotiza un ${fmtNum(t.vs_media200, 1)} % por encima de su media de 200 sesiones.`, `It trades ${fmtNum(t.vs_media200, 1)} % above its 200-session average.`));
  if (t.tendencia === 'bajista' && t.vs_media200 != null) motivos.push(L(`Cotiza un ${fmtNum(Math.abs(t.vs_media200), 1)} % por debajo de su media de 200 sesiones.`, `It trades ${fmtNum(Math.abs(t.vs_media200), 1)} % below its 200-session average.`));
  return { nivel, txt: `${L('Analistas', 'Analysts')}: ${palabra} · ${v.n}`, motivos, analistas: true };
}
function votosResumen(v) {
  if (!v) return null;
  const n = v.strongBuy + v.buy + v.hold + v.sell + v.strongSell;
  return n ? { n, compra: v.strongBuy + v.buy, mantener: v.hold, venta: v.sell + v.strongSell } : null;
}
/* 0.3: las señales no cambian de un día para otro. Cada posición recuerda su señal y desde cuándo la tiene (en tu
   cartera, igual en todos tus dispositivos). Una nueva solo entra si no puede esperar (tu precio de salida o tu
   objetivo), si la de antes lleva al menos 7 días y la nueva se ha visto dos días distintos (no un roce del umbral),
   o si la de antes lleva un mes. Mientras, se queda la de antes y se dice por qué. */
function estabilizarSenales(filas) {
  if (!S.cartera) return;
  const E = S.cartera.senales = S.cartera.senales || {}, hoy = hoyIso();
  let cambio = false;
  for (const f of filas) {
    const id = f.pos.id, nueva = f.senal.nivel, e = E[id];
    if (!e || !SENALES[e.n]) { E[id] = { n: nueva, d: hoy }; cambio = true; continue; }
    if (e.n === nueva) { if (e.p) { delete e.p; delete e.pd; cambio = true; } continue; }
    if (e.p !== nueva) { e.p = nueva; e.pd = [hoy]; cambio = true; } else if (!e.pd.includes(hoy)) { e.pd = [...e.pd, hoy].slice(-5); cambio = true; }
    const dias = diasEntre(e.d, hoy);
    if (f.senal.urgente || (dias >= 7 && e.pd.length >= 2) || dias >= 30) { E[id] = { n: nueva, d: hoy, antes: e.n }; cambio = true; continue; }
    const cuandoCambia = dias >= 7 ? L('mañana', 'tomorrow') : L(`el ${fechaCorta(sumarDias(e.d, 7))}`, `on ${fechaCorta(sumarDias(e.d, 7))}`);
    f.senal = { nivel: e.n, txt: SENALES[e.n], cruda: nueva, motivos: [L(`Sigue en «${SENALES[e.n]}». Los datos de estos días apuntan a «${SENALES[nueva].toLowerCase()}» (es lo de abajo), pero GrowFolio no cambia de opinión por unos días: si sigue igual, cambiará ${cuandoCambia}.`, `Still «${SENALES[e.n]}». This week's data points to «${SENALES[nueva].toLowerCase()}» (below), but GrowFolio doesn't change its mind over a few days: if it holds, it changes ${cuandoCambia}.`), ...f.senal.motivos] };
  }
  for (const id of Object.keys(E)) if (!filas.some((f) => f.pos.id === id)) { delete E[id]; cambio = true; }
  if (cambio) S.senalesSucias = true;
}
/* los límites que se puso cada uno en Objetivos (o los de siempre): los usan la señal y el plan de venta */
// 0.3.9: medio punto de margen sobre cada límite antes de proponer vender, y el mismo en Objetivos y en las barras
// (antes la señal vendía al pasar de 5,0 a 5,3 % mientras Objetivos decía «rozando»)
const MARGEN_LIM = 0.5;
// con acciones fraccionadas (2,5 acciones), los decimales; si es entero, sin ellos
const esEntero = (x) => Math.abs(+x - Math.round(+x)) < 1e-6;
const grupoLim = (f) => (f.inst.clase === 'Cripto' ? 'cripto' : ['Oro', 'Materias primas'].includes(f.inst.clase) ? 'oro' : 'i:' + f.inst.id);
const pesoLim = (f, M) => (M && M.pesoLim && M.pesoLim[grupoLim(f)]) || f.peso;
const variosLim = (f, M) => !!(M && M.nLim && M.nLim[grupoLim(f)] > 1);
function limiteDe(k) {
  const p = (S.cartera && S.cartera.perfil) || {};
  const v = k === 'empresa' ? p.limite_empresa : k === 'cripto' ? p.limite_cripto : k === 'oro' ? p.limite_oro : null;
  const def = { empresa: 10, cripto: 5, oro: 10 }[k];
  return v != null && v !== '' && isFinite(+v) && +v >= 0 ? +v : def;
}
function senal(f, M) {
  const p = f.p || {}, i = f.inst, motivos = [];
  const pr = f.precio;
  const stop = +f.pos.stop, obj = +f.pos.objetivo;
  const fin = (nivel) => ({ nivel, txt: SENALES[nivel], motivos });
  if (stop && pr && pr <= stop) { motivos.push(L(`Ha bajado de tu precio de salida (${precioFmt(stop)}). Es lo que te dijiste que harías.`, `It has fallen below your exit price (${precioFmt(stop)}). It's what you told yourself you'd do.`)); return { ...fin('vender'), urgente: true }; }
  if (obj && pr && pr >= obj) { motivos.push(L(`Ha llegado a tu objetivo de ${precioFmt(obj)}: decide si vendes todo, una parte o subes el objetivo.`, `It has reached your target of ${precioFmt(obj)}: decide whether to sell it all, sell part or raise the target.`)); return { ...fin('recoger'), urgente: true }; }

  if (i.tipo === 'Acción') {
    let score = 0;
    const a = p.analistas || {};
    const v = votosResumen(a.votos && a.votos.ahora);
    if (v) {
      if (v.compra / v.n >= 0.7) { score += 1; motivos.push(`${v.compra} de ${v.n} analistas recomiendan comprar.`); }
      else if (v.venta / v.n >= 0.25) { score -= 1; motivos.push(`${v.venta} de ${v.n} analistas recomiendan vender.`); }
      else motivos.push(`Analistas divididos: ${v.compra} comprar, ${v.mantener} mantener y ${v.venta} vender.`);
      const antes = votosResumen(a.votos.hace3m);
      if (antes) {
        const dif = v.compra / v.n - antes.compra / antes.n;
        if (dif >= 0.08) motivos.push('Hay más analistas a favor que hace 3 meses.');
        if (dif <= -0.08) motivos.push('Hay menos analistas a favor que hace 3 meses.');
      }
    }
    const pot = a.objetivo && pr ? (a.objetivo / pr - 1) * 100 : null;
    if (pot != null) {
      if (pot >= 15) { score += 1; motivos.push(`Su precio objetivo medio (${precioFmt(a.objetivo)}) está un ${fmtNum(pot, 1)} % por encima.`); }
      else if (pot < 0) { score -= 1; motivos.push(`Ya cotiza por encima del precio objetivo medio (${precioFmt(a.objetivo)}).`); }
      else if (pot < 5) { score -= 1; motivos.push(`Le queda poco hasta el precio objetivo medio: un ${fmtNum(pot, 1)} %.`); }
      else motivos.push(`Potencial del ${fmtNum(pot, 1)} % hasta el precio objetivo medio.`);
    }
    const t = p.tecnico || {};
    if (t.tendencia === 'alcista') motivos.push(`Tendencia alcista: cotiza un ${fmtNum(t.vs_media200, 1)} % por encima de su media de 200 sesiones.`);
    if (t.tendencia === 'bajista') { score -= 1; motivos.push(`Tendencia bajista: cotiza un ${fmtNum(Math.abs(t.vs_media200), 1)} % por debajo de su media de 200 sesiones.`); }
    if (t.rsi >= 72) motivos.push(`Ha subido rápido en las últimas semanas (RSI ${fmtNum(t.rsi, 0)}): puede corregir a corto plazo.`);
    if (t.rsi && t.rsi <= 30) motivos.push(`Ha caído rápido en las últimas semanas (RSI ${fmtNum(t.rsi, 0)}): suele rebotar a corto plazo.`);
    if (stop && pr) motivos.push(`Tu salida está a ${precioFmt(stop)}, un ${fmtNum((1 - stop / pr) * 100, 1)} % por debajo.`);
    const tp0 = tiempoPos(f);
    if (tp0 && !(f.plPct > 60 && pot != null && pot < 8)) motivos.push(`La tienes desde hace ${duracion(tp0.dias)}: ${pctS(f.plPct, 0)} en total, un ${pctS(tp0.anual, 1)} al año (la bolsa suele dar un ${fmtNum(bolsaAnual(), 0)} %).`);
    if (f.plPct > 60 && pot != null && pot < 8) {
      const ya = (S.cartera.movimientos || []).filter((m) => m.tipo === 'venta' && m.instrumento === i.id && (m.resultado || 0) > 0 && diasEntre(m.fecha, hoyIso()) <= 90);
      if (!ya.length) {
        const tp = tiempoPos(f), b = bolsaAnual();
        motivos.unshift(tp
          ? `Ganas un ${fmtNum(f.plPct, 0)} % en ${duracion(tp.dias)}: un ${fmtNum(tp.anual, 0)} % al año${tp.anual > 2 * b ? `, ${tp.anual > 10 * b ? 'más de diez veces' : `unas ${fmtNum(tp.anual / b, 0)} veces`} lo que suele dar la bolsa` : ''}. Los analistas ven poco recorrido: plantéate vender una parte y asegurar.`
          : `Ganas un ${fmtNum(f.plPct, 0)} % y los analistas creen que ya le queda poco por subir: plantéate vender una parte y asegurar lo ganado.`);
        return fin('recoger');
      }
      motivos.unshift(`Ya recogiste beneficios el ${fechaLarga(ya[ya.length - 1].fecha)}: lo que queda es ganancia. Protégela con una orden stop en su media de 50 sesiones.`);
    }
    if (pesoLim(f, M) > limiteDe('empresa') + MARGEN_LIM) { motivos.unshift(`${variosLim(f, M) ? 'Sumando tus brókers, pesa' : 'Pesa'} un ${fmtNum(pesoLim(f, M), 1)} % de tu cartera: más del ${fmtNum(limiteDe('empresa'), 0)} % que te pusiste como máximo en una sola empresa.`); return fin('reducir'); }
    if (score >= 2) {
      // tu regla: las acciones sueltas no pasan del límite; si ya estás cerca, no se añade
      const sueltas = M.total ? (sum(M.filas.filter((x) => x.inst.tipo === 'Acción'), (x) => x.valor) / M.total) * 100 : 0;
      const lim = +(S.cartera.limite_acciones ?? 20);
      if (sueltas >= lim - 3) {
        const plan = (S.cartera.aportaciones || []).some((x) => x.instrumento === i.id && +x.importe && (!x.hasta || x.hasta >= hoyIso()));
        motivos.unshift(`Los analistas la ven para comprar, pero tus acciones sueltas ya pesan un ${fmtNum(sueltas, 1)} % y tu límite es el ${fmtNum(lim, 0)} %: ${plan ? 'deja que la compre tu plan mensual y no metas extra' : 'no añadas hasta que vendas parte de otra'}.`);
        return fin(plan ? 'aportar' : 'mantener');
      }
      return fin('comprar');
    }
    if (score <= -2) return fin('vender');
    if (score === -1) return fin('vigilar');
    return fin('mantener');
  }
  // los apalancados (2x, 3x) pierden con el tiempo aunque el precio vuelva a donde estaba: se vigilan siempre
  if (i.tipo !== 'Acción' && /\b[23]x\b|leveraged|apalancad/i.test(`${i.nombre || ''} ${i.corto || ''}`)) {
    motivos.push('Es un producto apalancado: multiplica lo que se mueve cada día. Con el tiempo puede perder aunque el precio acabe donde empezó, así que es para días o semanas, no para tenerlo años.');
    const lim = limiteDe(i.clase === 'Cripto' ? 'cripto' : ['Oro', 'Materias primas'].includes(i.clase) ? 'oro' : 'empresa');
    if (f.peso > lim) { motivos.unshift(`Pesa un ${fmtNum(f.peso, 1)} % de tu cartera, más del ${fmtNum(lim, 0)} % que te pusiste como máximo.`); return fin('reducir'); }
    return fin('vigilar');
  }
  const aporta = (S.cartera.aportaciones || []).filter((x) => x.instrumento === i.id && +x.importe && (!x.hasta || x.hasta >= hoyIso()));
  if (i.clase === 'Renta variable' && /^Fondo/.test(i.tipo || '')) {
    if (i.ter != null) motivos.push(`Indexado con gastos del ${fmtNum(i.ter, 2)} % al año.`);
    const est = p.fondo && p.fondo.morningstar;
    if (est) motivos.push(`Morningstar le da ${est} de 5 estrellas.`);
    if (p.rent && p.rent['5a_anual'] != null) motivos.push(`Ha dado un ${fmtNum(p.rent['5a_anual'], 1)} % al año en los últimos 5 años.`);
    if (aporta.length) {
      // «el motor» solo es el que más recibe; los demás, una de tus bases
      const mio = sum(aporta, (x) => x.importe), porInst = {};
      for (const x of S.cartera.aportaciones || []) if (+x.importe && (!x.hasta || x.hasta >= hoyIso())) porInst[x.instrumento] = (porInst[x.instrumento] || 0) + +x.importe;
      const mayor = Math.max(0, ...Object.values(porInst));
      motivos.unshift(`Le metes ${eur(mio, 0)} al mes: ${mio >= mayor - 0.5 ? 'es el motor de tu cartera' : 'es una de tus bases'}.`); return fin('aportar');
    }
    return fin('mantener');
  }
  if (i.clase === 'Renta fija') {
    motivos.push('Es tu parte segura: se mueve poco y sacas el dinero en unos días.');
    if (p.rent && p.rent['1a'] != null) motivos.push(`Ha dado un ${fmtNum(p.rent['1a'], 1)} % en el último año.`);
    return fin('mantener');
  }
  if (i.clase === 'Oro') {
    if (pesoLim(f, M) > limiteDe('oro') + MARGEN_LIM) { motivos.push(`${variosLim(f, M) ? 'Con tu otro oro y materias primas, pesa' : 'Pesa'} un ${fmtNum(pesoLim(f, M), 1)} %: más del ${fmtNum(limiteDe('oro'), 0)} % que te pusiste como máximo en oro.`); return fin('reducir'); }
    motivos.push('Diversifica: suele aguantar cuando caen las bolsas.');
    if (p.rent && p.rent['1a'] != null) motivos.push(`${pctS(p.rent['1a'], 1)} en el último año.`);
    return fin('mantener');
  }
  // plata, platino, paladio, cobre o una cesta de materias primas: cuentan en el límite del oro
  if (i.clase === 'Materias primas') {
    if (pesoLim(f, M) > limiteDe('oro') + MARGEN_LIM) { motivos.push(`${variosLim(f, M) ? 'Con tu otro oro y materias primas, pesa' : 'Pesa'} un ${fmtNum(pesoLim(f, M), 1)} %: más del ${fmtNum(limiteDe('oro'), 0)} % que te pusiste como máximo en oro y materias primas.`); return fin('reducir'); }
    motivos.push('Es una materia prima: no da dividendos ni intereses y se mueve con la industria, el dólar y la oferta. Más brusca que el oro.');
    if (p.rent && p.rent['1a'] != null) motivos.push(`${pctS(p.rent['1a'], 1)} en el último año.`);
    return fin('mantener');
  }
  if (i.clase === 'Cripto') {
    if (p.volatilidad) motivos.push(`Volatilidad del ${fmtNum(p.volatilidad, 0)} % al año: puede caer a la mitad en meses.`);
    if (pesoLim(f, M) > limiteDe('cripto') + MARGEN_LIM) { motivos.unshift(`${variosLim(f, M) ? 'Tu cripto, sumada, pesa' : 'Pesa'} un ${fmtNum(pesoLim(f, M), 1)} % de tu cartera, más del ${fmtNum(limiteDe('cripto'), 0)} % que te pusiste como máximo en cripto: con esa volatilidad es mucho.`); return fin('reducir'); }
    if (p.tecnico && p.tecnico.dist_max52 != null) motivos.push(`Está un ${fmtNum(Math.abs(p.tecnico.dist_max52), 0)} % por debajo de su máximo del último año.`);
    return fin('mantener');
  }
  return fin('mantener');
}

/* ---------- qué empresas hay de verdad dentro de tus fondos ---------- */
function empresasPorDentro(M) {
  const acc = new Map();
  const add = (n, v, directa) => { const k = n.replace(/\s+(Class [A-C]|Ordinary Shares.*|Participating Preferred|Registered Shares|Ordinary Shares new)$/i, '').replace(/\s+(Inc|Corp|PLC|NV|SA|AG|Ltd|Co Ltd|Holding.*)\.?$/i, '').trim(); const o = acc.get(k) || { n: k, v: 0, directa: false }; o.v += v; o.directa = o.directa || directa; acc.set(k, o); };
  const part = (S.precios && S.precios.participaciones_etf) || {};
  let cubierto = 0;
  for (const f of M.filas) {
    if (f.inst.tipo === 'Acción') { add(f.inst.nombre || f.inst.corto, f.valor, true); cubierto += f.valor; continue; }
    if (!f.inst.sector_etf) continue;
    for (const [etf, w] of Object.entries(f.inst.sector_etf)) {
      for (const h of part[etf] || []) { const v = (f.valor * w * h.w) / 100; add(h.n, v, false); cubierto += v; }
    }
  }
  return { filas: [...acc.values()].sort((a, b) => b.v - a.v), cubierto };
}
