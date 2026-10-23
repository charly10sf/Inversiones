/* ---------- buscar posiciones, empresas e índices por nombre ---------- */
function buscarFila(q) {
  const M = S.M || calcular();
  const n = normTxt(q), c = n.replace(/ /g, '');
  if (!c) return null;
  const claves = (f) => [f.pos.id, f.inst.id, f.inst.corto, f.inst.nombre, f.inst.yahoo, f.inst.isin, f.p && f.p.simbolo].filter(Boolean).map((k) => normTxt(k).replace(/ /g, ''));
  return M.filas.find((f) => claves(f).includes(c))
    || M.filas.find((f) => claves(f).some((k) => k.length > 2 && (k.startsWith(c) || (c.length > 3 && c.startsWith(k)))))
    || null;
}
function buscarRadar(q) {
  const r = radarVals();
  const n = normTxt(q), c = n.replace(/ /g, '');
  if (!c) return null;
  const tk = (x) => normTxt(x.s).replace(/ /g, ''), base = (x) => normTxt(String(x.s).split('.')[0]).replace(/ /g, '');
  return r.find((x) => tk(x) === c || base(x) === c)
    || r.find((x) => { const nn = normTxt(x.n); return nn === n || nn.startsWith(n + ' ') || nn.replace(/ /g, '').startsWith(c); })
    || (c.length >= 4 ? r.find((x) => normTxt(x.n).includes(n)) : null)
    || null;
}

/* ---------- la foto de la cartera que recibe la IA ---------- */
function fichaTexto(f, corto = false) {
  const i = f.inst, p = f.p || {}, a = p.analistas || {}, fu = p.fundamentales || {}, r = p.rent || {}, t = p.tecnico || {};
  const L = [];
  L.push(`### ${i.corto || i.nombre} (id "${f.pos.id}")`);
  L.push(`${i.nombre || ''}. ${i.tipo || ''}, ${i.clase || ''}${i.pais ? `, ${PAISES[i.pais] || i.pais}` : ''}, en ${f.pos.plataforma || '?'}. ${[i.yahoo && 'Ticker ' + i.yahoo, i.isin && 'ISIN ' + i.isin].filter(Boolean).join(', ')}.`);
  L.push(`Tiene ${f.uds != null ? fmtNum(f.uds, f.uds < 10 ? 6 : 4) : '?'} ${i.tipo === 'Acción' ? 'acciones' : 'participaciones'}${f.estimada ? ' (cantidad estimada por GrowFolio, no exacta)' : ''} a ${f.precio != null ? fmtNum(f.precio, 4) + ' €' : 'sin precio'} (hoy ${P1(f.varDia)}${p.fecha ? `, último cierre ${p.fecha}` : ''}${f.vivo ? ', precio en directo' : ''}). Valor ${E2(f.valor)}, el ${fmtNum(f.peso, 1)} % del total. Coste ${E2(f.coste)}${f.uds ? `, precio medio ${fmtNum(f.coste / f.uds, 4)} €` : ''}. Ganancia latente ${eurP(f.pl)} (${P1(f.plPct)}).`);
  L.push(f.senal.analistas ? `Lo que opinan los analistas: ${f.senal.txt || 'no la sigue ninguno'}. ${f.senal.motivos.join(' ')}` : `Señal automática de GrowFolio: ${f.senal.txt}. ${f.senal.motivos.join(' ')}`);
  if (a.num) {
    const v = a.votos && a.votos.ahora, v3 = a.votos && a.votos.hace3m;
    L.push(`Analistas: ${a.num}, consenso ${a.recomendacion || '?'} (nota media ${a.media != null ? fmtNum(a.media, 2) : '?'}, de 1 compra fuerte a 5 venta fuerte)${v ? `; ahora ${v.strongBuy} compra fuerte, ${v.buy} comprar, ${v.hold} mantener, ${v.sell} vender, ${v.strongSell} venta fuerte` : ''}${v3 ? `; hace 3 meses ${v3.strongBuy}/${v3.buy}/${v3.hold}/${v3.sell}/${v3.strongSell}` : ''}. Objetivo medio ${fmtNum(a.objetivo, 2)} € (${P1(f.precio ? (a.objetivo / f.precio - 1) * 100 : null)}), rango ${fmtNum(a.objetivo_bajo, 2)} a ${fmtNum(a.objetivo_alto, 2)} €.`);
    try {
      const e = esperadaPos(f), q = e && e.prin;
      if (q) L.push(`Lo que esperan (lo mismo que ve él en GrowFolio): ${q === e.ia ? 'GrowIA estima' : 'el objetivo medio de los analistas da'} ${P1(q.subida)} en ${plazoTxt(q.meses)}, hasta ${fmtNum(q.obj, 2)} €${q === e.ia && e.ana ? ` (los analistas, ${P1(e.ana.subida)} a 12 meses)` : ''}. Si se cumple y vende entonces, se queda un ${P1(q.netoP)} neto de impuestos${q.divP > 0 ? ' contando el dividendo' : ''}: ${eurP(q.netoE, 0)} con lo que tiene.`);
    } catch (e) {}
    if (a.cambios && a.cambios.length) L.push('Cambios recientes de analistas: ' + a.cambios.slice(0, corto ? 3 : 5).map((c) => [c.fecha, c.firma, c.accion, c.de && c.a ? `${c.de} → ${c.a}` : c.a, c.objetivo ? `objetivo ${fmtNum(c.objetivo, 2)} €` : ''].filter(Boolean).join(' ')).join('; ') + '.');
  }
  const val = [fu.per && `PER ${fmtNum(fu.per, 1)}`, (fu.per_futuro || p.per_futuro) && `PER futuro ${fmtNum(fu.per_futuro || p.per_futuro, 1)}`, fu.peg && `PEG ${fmtNum(fu.peg, 2)}`, fu.ev_ebitda && `EV/EBITDA ${fmtNum(fu.ev_ebitda, 1)}`, fu.pvc && `precio/valor contable ${fmtNum(fu.pvc, 2)}`, p.dividendo_pct && `dividendo ${fmtNum(p.dividendo_pct, 2)} %`, fu.payout && `payout ${fmtNum(fu.payout, 0)} %`, fu.capitalizacion && `capitalización ${fmtNum(fu.capitalizacion / 1e9, 1)} mil millones`, fu.deuda_capital && `deuda/capital ${fmtNum(fu.deuda_capital, 0)} %`, fu.roe && `ROE ${fmtNum(fu.roe, 1)} %`, fu.margen && `margen ${fmtNum(fu.margen, 1)} %`, fu.crec_ingresos != null && `ingresos ${P1(fu.crec_ingresos)} interanual`, fu.crec_beneficio != null && `beneficio ${P1(fu.crec_beneficio)} interanual`, fu.beta != null && `beta ${fmtNum(fu.beta, 2)}`].filter(Boolean);
  if (val.length) L.push('Valoración y cuentas: ' + val.join(', ') + '.');
  if (p.estimaciones) { const e = p.estimaciones; L.push(`Beneficio por acción que esperan los analistas: este año ${P1(e.este_anio && e.este_anio.crec)}, el que viene ${P1(e.siguiente && e.siguiente.crec)}.`); }
  const re = [['1m', '1 mes'], ['3m', '3 meses'], ['ytd', 'en el año'], ['1a', '1 año'], ['3a_anual', '3 años, anual'], ['5a_anual', '5 años, anual'], ['10a_anual', '10 años, anual']].filter(([k]) => r[k] != null).map(([k, tt]) => `${tt} ${P1(r[k])}`);
  if (re.length) L.push('Rentabilidad: ' + re.join(', ') + '.');
  const tec = [t.tendencia && `tendencia ${t.tendencia}`, t.media50 && `media de 50 sesiones ${fmtNum(t.media50, 2)} €`, t.media200 && `media de 200 sesiones ${fmtNum(t.media200, 2)} € (${P1(t.vs_media200)} sobre ella)`, t.rsi && `RSI ${fmtNum(t.rsi, 0)}`, t.dist_max52 != null && `${P1(t.dist_max52)} desde el máximo de 52 semanas`, p.max52 && `rango de 52 semanas ${fmtNum(p.min52, 2)} a ${fmtNum(p.max52, 2)}`, t.caida_max_1a != null && `peor caída del año ${P1(t.caida_max_1a)}`, p.volatilidad && `volatilidad ${fmtNum(p.volatilidad, 0)} %`, p.riesgo && `riesgo ${p.riesgo} de 7`].filter(Boolean);
  if (tec.length) L.push('Precio y técnico: ' + tec.join(', ') + '.');
  if (i.ter != null) L.push(`Gastos corrientes (TER) ${fmtNum(i.ter, 2)} %.${p.fondo && p.fondo.morningstar ? ` Morningstar ${p.fondo.morningstar} de 5.` : ''}`);
  const fechas = [p.proximos_resultados && `próximos resultados el ${p.proximos_resultados}`, p.ex_dividendo && `ex-dividendo el ${p.ex_dividendo}`].filter(Boolean);
  if (fechas.length) L.push('Fechas: ' + fechas.join(', ') + '.');
  const reglas = [+f.pos.stop && `precio de salida (stop) ${fmtNum(+f.pos.stop, 2)} €`, +f.pos.objetivo && `objetivo de venta ${fmtNum(+f.pos.objetivo, 2)} €`].filter(Boolean);
  if (reglas.length) L.push('Sus reglas para esta posición: ' + reglas.join(', ') + '.');
  if (f.pos.notas) L.push('Sus notas: ' + String(f.pos.notas).replace(/\s+/g, ' ').slice(0, 500));
  const ap = aportacionesActivas().filter(({ a }) => a.instrumento === i.id && (!a.plataforma || a.plataforma === f.pos.plataforma));
  if (ap.length) L.push(`Aportación automática: ${ap.map(({ a }) => `${a.importe} € al mes, el día ${a.dia || 1}`).join(', ')}.`);
  try { const lotes = lotesDe(f.pos); if (lotes.length) L.push(`Lotes de compra para FIFO: ${lotes.length}${lotes.some((l) => l.mezcla) ? ' (el primero es lo que tenía al empezar a usar GrowFolio, a precio medio)' : ''}; el más antiguo del ${lotes[0].f}.`); } catch (e) {}
  return L.join('\n');
}

/* La foto que recibe GrowIA. En el chat va lo que hace falta para contestar bien y se queda fuera lo que se puede
   pedir con las herramientas (el radar entero y la prensa de cada empresa): así gasta menos y no se pierde entre
   cientos de líneas que no tocan a la pregunta. El análisis (elige ideas entre todo el radar) y «copiar para otra
   IA» (sin herramientas) llevan la foto completa. */
function contextoAsesor(M, modo = 'chat') {
  const chat = modo === 'chat';
  const oc0 = S.oculto; S.oculto = false;
  try {
    const ahora = new Date(), anio = ahora.getFullYear();
    const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const L = [];
    L.push(`# Su cartera, foto del ${DIAS[ahora.getDay()]} ${fechaLarga(hoyIso())} a las ${hora}`);
    L.push(`Precios: ${estadoDirecto().txt.toLowerCase()}. Datos de GrowFolio generados ${haceCuanto(S.precios && S.precios.generado)}.`);
    L.push('', '## Resumen');
    L.push(`Patrimonio ${E2(M.total)}. Coste de lo que tiene ${E2(M.invertido)}. Ganancia latente ${eurP(M.pl)} (${P1(M.plPct)}). Hoy ${eurP(M.dia)} (${P1(M.diaPct)}).`);
    L.push('Por plataforma: ' + porPlataforma(M).map(([k, o]) => `${k} ${E0(o.v)}`).join(', ') + '.');
    try {
      const R = rentabilidadCartera(M);
      if (R.sinFecha.length) L.push(`Rentabilidad real: no se puede calcular hasta que diga desde cuándo tiene ${R.sinFecha.join(', ')} (o cuándo empezó a invertir).`);
      else if (R.flujos.length) {
        const bw = benchMismoDinero(R, 'fidelity-world');
        L.push(`Rentabilidad real (con sus compras y ventas y sus fechas, sin dividendos cobrados, desde el ${R.desde}${R.mezcla ? '; lo que tenía antes de GrowFolio, con fechas supuestas que cuadran con su precio medio' : ''}): metió ${E0(R.metido)}, sacó ${E0(R.sacado)}, hoy vale ${E0(R.valor)}. ${R.corto ? 'Lleva menos de mes y medio: no tiene sentido pasarlo a «al año».' : `TIR ${P1(R.tir)} al año; TWR ${R.twr ? `${P1(R.twr.total)}${R.twr.anual != null ? ` (${P1(R.twr.anual)} al año)` : ''}` : '—'}.`}${bw && !bw.sinDatos ? ` Con el mismo dinero los mismos días en el MSCI World tendría ${E0(bw.valor)}${!R.corto && bw.tir != null ? ` (TIR ${P1(bw.tir)})` : ''}.` : ''}`);
      }
    } catch (e) {}
    if (M.efectivo.length) L.push('Efectivo: ' + M.efectivo.map((e) => `${e.plataforma} ${E2(e.importe)}`).join(', ') + '.');
    for (const [dim, t, base] of [['clase', 'Por tipo de activo', 'todo'], ['region', 'Renta variable por región', 'rv'], ['sector', 'Renta variable por sector', 'rv'], ['riesgo', 'Por nivel de riesgo (1 a 7)', 'todo']]) {
      const r = reparto(M, dim, base);
      L.push(`${t}: ` + r.filas.slice(0, 10).map((x) => `${x.k} ${fmtNum(x.pct, 1)} %`).join(', ') + '.');
    }
    const sueltas = M.total ? (sum(M.filas.filter((f) => f.inst.tipo === 'Acción'), (f) => f.valor) / M.total) * 100 : 0;
    L.push(`Acciones sueltas: ${fmtNum(sueltas, 1)} % del total. Su límite propio: ${fmtNum(+(S.cartera.limite_acciones ?? 20), 0)} %.`);
    try { L.push('', '## Su perfil y sus objetivos (ajusta todos tus consejos a esto)', ...textoPerfil(M), ''); } catch (e) {}
    const conTer = M.filas.filter((f) => f.inst.ter != null), base = sum(conTer, (f) => f.valor), coste = sum(conTer, (f) => (f.valor * f.inst.ter) / 100);
    try {
      const D = dividendosMeses(M);
      if (D.bruto) L.push(`Dividendos de los próximos 12 meses (repitiendo lo de los últimos 12, mes del ex-dividendo): ${E0(D.neto)} netos de ${E0(D.bruto)} brutos; ${D.meses.filter((m) => m.bruto).map((m) => `${m.k}: ${E0(m.neto)} (${m.de.map((x) => x.n).join(', ')})`).join('; ')}.`);
      const SO = solapamientos(M);
      if (SO.pares.length) L.push('Fondos que se pisan (llevan las mismas grandes empresas de una zona): ' + SO.pares.map((x) => `${x.a.inst.corto} y ${x.b.inst.corto} en un ${fmtNum(x.pct, 0)} %`).join('; ') + '.');
      const sg = siguiendo();
      if (sg.length) L.push('Empresas que sigue sin tenerlas: ' + sg.map((it) => { const pr = precioSeguido(it); return `${it.n} (${it.s}${pr && pr.eur ? `, ${fmtNum(pr.eur, 2)} €` : ''}${pr && pr.eur && it.p0 ? `, ${P1((pr.eur / it.p0 - 1) * 100)} desde que la sigue el ${it.desde}` : ''}${it.baja ? `, aviso si baja de ${fmtNum(it.baja, 2)} €` : ''}${it.sube ? `, aviso si sube de ${fmtNum(it.sube, 2)} €` : ''})`; }).join('; ') + '.');
    } catch (e) {}
    L.push(`Dividendos brutos estimados al año ${E0(M.dividendos)}. Gastos de sus fondos ${E0(coste)} al año (TER medio ${fmtNum(base ? (coste / base) * 100 : 0, 2)} %).`);
    const ed = empresasPorDentro(M).filas.slice(0, chat ? 10 : 15);
    if (ed.length) L.push('Empresas que más pesan contando lo que hay dentro de sus fondos: ' + ed.map((e) => `${e.n} ${E0(e.v)}${e.directa ? ' (comprada directamente)' : ''}`).join(', ') + '.');
    L.push('', '## Posiciones');
    for (const f of M.filas) L.push(fichaTexto(f, chat), '');
    const act = aportacionesActivas();
    L.push('## Aportaciones automáticas');
    L.push(act.length ? act.map(({ a }) => `- ${a.importe} € al mes a ${nombreInst(a.instrumento)} en ${a.plataforma || '?'}, el día ${a.dia || 1}${a.desde ? `, desde ${a.desde}` : ''}${a.hasta ? `, hasta ${a.hasta}` : ''}`).join('\n') + `\nTotal ${E0(aportacionActual())} al mes.` : 'Ninguna.');
    const movs = (S.cartera.movimientos || []).slice(-15);
    if (movs.length) {
      L.push('', '## Compras y ventas registradas en GrowFolio');
      for (const m of movs) L.push(`- ${m.fecha}: ${m.tipo} de ${fmtNum(m.uds, 4)} ${nombreInst(m.instrumento)} a ${fmtNum(m.precio, 4)} € en ${m.plataforma}${m.tipo === 'venta' ? `; cobrado ${E2(m.importe || 0)}, valor de compra FIFO ${E2(m.coste_vendido || 0)}, resultado ${eurP(m.resultado || 0)}` : `; pagado ${E2(m.importe || 0)}${m.tasa ? `, tasa ${E2(m.tasa)}` : ''}`}`);
    }
    const fa = fiscalAnio(anio);
    L.push('', `## Impuestos de ${anio} (renta que se presenta entre abril y junio de ${anio + 1})`);
    L.push(`Ventas del año ${eurP(fa.gp)} (${fa.ventas.length} registradas en GrowFolio por ${eurP(fa.gpWeb)}; fuera de GrowFolio ${eurP(fa.otras)}). Dividendos e intereses apuntados ${E2(fa.rcm)}. Retenciones ya hechas ${E2(fa.retenido)}. Pérdidas de años anteriores pendientes ${E2(fa.pendientes)}. Base del ahorro ${E2(fa.base)}, cuota estimada ${E2(fa.cuota)}, tipo marginal ${pctTramo(fa.marginal)} %. Pérdidas que pasarían a años siguientes ${E2(fa.sobra)}.`);
    if (!fa.otras && !fa.rcm) L.push('Aviso: no ha apuntado en GrowFolio sus dividendos ni ventas hechas fuera de ella, así que el impuesto calculado puede salir alto.');
    L.push('Si vendiera hoy cada posición entera (ganancia, e impuesto extra con lo que ya lleva): ' + M.filas.map((f) => { const g = f.valor - f.coste - (f.pos.plataforma === 'Trade Republic' ? 1 : 0); return `${f.inst.corto} ${eurP(g, 0)}${g > 0 ? `, impuesto ${E0(impuestoDeVenta(g, anio).impuesto)}` : ''}`; }).join('; ') + '.');
    const planes = M.filas.map((f) => planVenta(f, M)).filter(Boolean);
    L.push('', '## Planes de venta que propone GrowFolio ahora');
    if (!planes.length) L.push('Ninguno: ninguna posición pide vender.');
    for (const pl of planes) L.push(`- ${pl.f.inst.corto} (${pl.f.senal.txt.toLowerCase()}): vender ${fmtNum(pl.uds, pl.accion && esEntero(pl.uds) ? 0 : 4)} por unos ${E0(pl.importe)} y quedarse ${fmtNum(pl.queda, pl.accion && esEntero(pl.queda) ? 0 : 4)}. Ganancia que se declara ${eurP(pl.ganancia, 0)}, impuesto ${E0(pl.impuesto)}. Cuándo: ${pl.cuando.join(' ')} Destino: ${pl.aColchon > 0.5 ? `${E0(pl.aColchon)} a su colchón (le falta), ` : ''}${pl.aIdea > 0 && pl.ideas[0] ? `${E0(pl.aIdea)} a ${pl.ideas[0].n} y ` : ''}${E0(pl.aNucleo)} ${nucleo(S.M || calcular()).a}; ${E0(pl.impuesto)} apartados para Hacienda.`);
    const ideas = mejoresIdeas(M).slice(0, chat ? 5 : 8);
    if (ideas.length) {
      L.push('', '## Las ideas de compra que mejor encajan con su cartera según GrowFolio');
      for (const x of ideas) L.push(`- ${x.n} (${x.s}, ${x.z}${x.sector ? ', ' + x.sector : ''}): ${!chat && noticiasIdea(x.s).length ? `[titulares: ${noticiasIdea(x.s).slice(0, 3).map((n) => `${n.d ? n.d.slice(0, 10) + ' ' : ''}${n.t} (${n.f || ''})`).join(' / ')}] ` : ''}${x.motivos.join(', ')}${x.pegas.length ? `. Pegas: ${x.pegas.join('; ')}` : ''}. Contraste: ${x.ctr.favor} de ${x.ctr.total} señales a favor (${x.ctr.checks.filter((c) => c.ok).map((c) => c.k.toLowerCase()).join(', ')})${x.ctr.contra ? `, ${x.ctr.contra} en contra (${x.ctr.checks.filter((c) => c.ok === -1).map((c) => c.k.toLowerCase()).join(', ')})` : ''}.`);
    }
    // del radar entran las mejor contrastadas (20 en el chat, 120 en el análisis); el resto, con las herramientas radar y buscar_empresa
    const todasR = radarVals();
    const rad = todasR.filter((x) => x.pot != null && (x.na || 0) >= 5).map((x) => ({ x, c: contraste(x) })).sort((a, b) => (b.c.favor - b.c.contra) - (a.c.favor - a.c.contra) || (b.x.pot || 0) - (a.x.pot || 0)).slice(0, chat ? 10 : 120).map((o) => o.x);
    if (rad.length) {
      L.push('', `## Radar de GrowFolio: las ${rad.length} mejor contrastadas de ${todasR.length} empresas; ${chat ? 'para buscar entre todas (por sector, zona, dividendo, potencial o prensa) usa la herramienta radar, y para los datos completos de una, buscar_empresa' : 'del resto, pide los datos con buscar_empresa'} (nombre | ticker | zona | sector | precio | potencial hasta el objetivo medio | rango de objetivos | consenso y nº de analistas | PER futuro | crecimiento esperado del beneficio | dividendo | 1 año | sobre la media de 200 sesiones)`);
      for (const x of rad) L.push([x.n, x.s, x.z, x.sector || '', `${fmtNum(x.p, 2)} ${x.m}`, P1(x.pot), x.tb && x.ta ? `${fmtNum(x.tb, 2)}-${fmtNum(x.ta, 2)}` : '—', `${CONSENSO[x.r] || '—'} ${x.na || 0}`, x.perf > 0 ? fmtNum(x.perf, 1) : '—', P1(x.epsg ?? x.eg), x.div ? fmtNum(x.div, 1) + ' %' : '—', P1(x.c1a), x.m200 && x.p ? P1((x.p / x.m200 - 1) * 100) : '—'].join(' | '));
    }
    L.push('', '## Mercados');
    // 0.7: en el chat, más corto (hoy, un mes y en el año)
    for (const [sym, m] of Object.entries((S.precios && S.precios.mercados) || {})) { const d = datoMerc(sym), r = m.rent || {}; L.push(chat ? `- ${m.nombre} ${fmtMerc(sym, d.precio)}: hoy ${P1(d.var)}, 1 mes ${P1(r['1m'])}, año ${P1(r.ytd)}` : `- ${m.grupo ? `[${m.grupo}] ` : ''}${m.nombre}: ${fmtMerc(sym, d.precio)} (hoy ${P1(d.var)}; 1 mes ${P1(r['1m'])}; en el año ${P1(r.ytd)}; 1 año ${P1(r['1a'])})`); }
    try {
      const pr = proyeccion(M), c = pr.cfg;
      L.push('', `## Proyección de GrowFolio (2.000 escenarios aportando ${E0(c.aport)} al mes${c.subida ? `, subiendo un ${c.subida} % cada año` : ''}, bolsa al ${c.bolsa} % anual)`);
      for (const a of [5, 10, 20, 30]) L.push(`- ${a} años: si va mal ${E0(pr.p10[a * 12])}, lo probable ${E0(pr.p50[a * 12])}, si va bien ${E0(pr.p90[a * 12])}; habrá puesto ${E0(pr.aportado[a * 12])}.`);
    } catch (e) {}
    // 0.7: de sus acciones, la ficha de GrowIA (lo que pesa en cada factor) en vez de titulares sueltos; los temas de la
    // semana que tocan a muchas empresas; y los titulares, con su marca (factor, bueno o malo, cuánto importa)
    const N = (S.precios && S.precios.noticias) || {};
    const tit = (arr, n) => ordenarNoticias(arr || []).slice(0, n).map(({ n: x, m }) => `- ${titularGrowIA(x, m)}`).join('\n');
    const conFicha = new Set();
    const fichasPos = [];
    for (const f of M.filas) {
      if (f.inst.tipo !== 'Acción' || conFicha.has(f.inst.id)) continue;
      const fi = fichaGrowIA((f.p && f.p.simbolo) || f.inst.yahoo, chat ? 2 : 4);
      if (fi && fi.factores.length) { conFicha.add(f.inst.id); fichasPos.push(`${nombreInst(f.inst.id)} (leída el ${fi.leida}):`, ...fi.factores.map((x) => `- ${x}`), ...fi.temas.map((x) => `- Tema: ${x}`)); }
    }
    if (fichasPos.length) L.push('', `## Lo que pesa ahora en sus acciones, según la prensa (fichas de GrowIA, factor por factor: negocio, sector, economía, política y leyes, sociedad y mercado)${chat ? '; la de cualquier otra empresa viene con buscar_empresa' : ''}`, ...fichasPos);
    const temas = temasGrowIA(chat ? 5 : 10);
    if (temas.length) L.push('', '## Temas de la semana que tocan a muchas empresas (con a quién y si es bueno o malo para ellas)', ...temas.map((x) => `- ${x}`));
    L.push('', '## Titulares recientes (Google Noticias)');
    if (N.mercado) L.push('Mercado:\n' + tit(N.mercado, chat ? 6 : 10));
    for (const id of new Set(M.filas.map((f) => f.inst.id))) if (N[id] && N[id].length && !(chat && conFicha.has(id))) L.push(`${nombreInst(id)}:\n` + tit(N[id], chat ? 2 : 5));
    const inf = informeVisible();
    if (inf && (inf.resumen || (inf.mercado || []).length)) {
      L.push('', `## Informe de prensa de GrowIA (${cabInforme(inf)}; ${inf.busqueda_google ? 'con búsqueda en Google' : 'con titulares de Google Noticias y Yahoo Finance'})`, inf.resumen ? `Resumen: ${inf.resumen}` : 'Solo lo del mercado y lo de sus posiciones.');
      for (const m of inf.mercado || []) L.push(`- Mercado${m.zona ? ` ${m.zona}` : ''} (${m.impacto}): ${m.t}. ${m.detalle || ''}${m.implica ? ` Para la cartera: ${m.implica}` : ''}`);
      for (const x of inf.macro || []) L.push(`- Macro: ${x.t}: ${x.dato}. ${x.lectura || ''}`);
      const suyas = new Set(M.filas.map((f) => f.inst.id));
      for (const [id, x] of Object.entries(inf.posiciones || {})) if (suyas.has(id)) L.push(`- ${nombreInst(id)} (${x.impacto}): ${x.novedades || ''} Contraste: ${x.contraste || '—'}. Vigilar: ${x.vigilar || '—'}.${chat ? '' : ` Fuentes: ${(x.fuentes || []).map((f) => f.f || '').filter(Boolean).join(', ') || '—'}`}`);
      if (!chat) for (const [s0, x] of Object.entries(inf.ideas || {})) L.push(`- Idea ${s0} (${x.impacto}): ${x.novedades || ''} Contraste: ${x.contraste || '—'}. Riesgo: ${x.riesgo || '—'}.`);
      for (const a of inf.alertas || []) L.push(`- Alerta (${a.urgencia}): ${a.t}`);
    }
    const esc0 = S.escaneo;
    if (esc0 && esc0.decision) {
      const d = esc0.decision;
      L.push('', `## Lo que ha elegido GrowIA tras escanear la prensa de ${Object.keys(esc0.lectura || {}).length} empresas (${haceCuanto(d.generado)})`, d.comentario || '');
      for (const i of d.ideas || []) L.push(`- Comprar ${i.n || ''} (${i.s}), confianza ${i.confianza}: ${i.tesis || ''} Catalizador: ${i.catalizador || '—'}. Riesgo: ${i.riesgo || '—'}.${chat ? '' : ` Contraste: ${i.contraste || '—'}.`}`);
      for (const v of d.evitar || []) L.push(`- Evitar ${v.n || ''} (${v.s}): ${v.motivo || ''}`);
    }
    if (esc0 && esc0.lectura) {
      const hace7 = Date.now() - 7 * 864e5;
      const imp = Object.entries(esc0.lectura).filter(([, l]) => l.rel >= 2 && new Date(l.d).getTime() > hace7).sort((a, b) => b[1].rel - a[1].rel).slice(0, chat ? 6 : 80);
      const corta = (t) => (chat && String(t || '').length > 240 ? String(t).slice(0, 237).replace(/\s+\S*$/, '') + '…' : t || '');
      if (imp.length) L.push('', `## Prensa importante de la última semana en el radar (escaneo de GrowIA)${chat ? ': las 6 noticias más relevantes; la de cualquier otra empresa, con buscar_empresa o radar' : ''}`, ...imp.map(([s0, l]) => `- ${s0} (${l.imp}, relevancia ${l.rel}): ${corta(l.txt)}${l.cat && !chat ? ` Catalizador: ${l.cat}.` : ''}`));
    }
    const ia = iaActual();
    if (ia) {
      const v = valoresIA(M);
      const T = (t) => String(t || '').replace(/\{([a-z0-9_]+)(?::([a-z0-9-]+))?\}/g, (mm, k, id) => { const x = id ? v[k] && v[k][id] : v[k]; return x != null && typeof x !== 'object' ? x : '—'; }).replace(/\*\*/g, '');
      L.push('', `## ${ia.publicado ? 'Análisis de partida publicado' : 'Tu último análisis'} (${ia.fecha ? fechaLarga(String(ia.fecha).length > 10 ? iso(new Date(ia.fecha)) : String(ia.fecha).slice(0, 10)) : ''})`);
      L.push(T(ia.titular)); for (const p of ia.resumen || []) L.push(T(p));
      if (ia.mejorar) L.push('Qué mejorar: ' + ia.mejorar.map((x) => T(x.titulo)).join('; ') + '.');
      if (ia.riesgos) L.push('Riesgos: ' + ia.riesgos.map((x) => T(x.titulo)).join('; ') + '.');
      // lo que dijo de cada posición y su hoja de ruta: para que no cambie de opinión sin motivo
      const nv = Object.entries(ia.posiciones || {}).filter(([, x]) => x && x.nivel).map(([k, x]) => `${nombreInst(k)}: ${x.nivel}${x.veredicto ? ` («${T(x.veredicto)}»)` : ''}`);
      if (nv.length) L.push('Nivel que diste a cada posición: ' + nv.join('; ') + '.');
      const hrA = ia.hoja_de_ruta && ia.hoja_de_ruta.mes;
      if (hrA && hrA.length) L.push('Tu hoja de ruta de este mes: ' + hrA.map((x) => T(x.t)).join('; ') + '.');
      if (Array.isArray(ia.ideas) && ia.ideas.length) L.push('Ideas de compra que propusiste: ' + ia.ideas.map((x) => `${x.nombre}${x.ticker ? ` (${x.ticker})` : ''}`).join('; ') + '.');
      const est = S.cartera.senales || {};
      const cambiosW = Object.entries(est).filter(([, x]) => x.antes && x.d >= sumarDias(hoyIso(), -14)).map(([k, x]) => { const f = M.filas.find((y) => y.pos.id === k); return f ? `${f.inst.corto}: de ${x.antes} a ${x.n} el ${fechaCorta(x.d)}` : ''; }).filter(Boolean);
      if (cambiosW.length) L.push('Cambios de señal de GrowFolio en las dos últimas semanas: ' + cambiosW.join('; ') + '.');
    }
    try {
      const P = pasosRuta(M), limpio = (t) => String(t || '').replace(/<[^>]+>/g, '');
      L.push('', '## Su hoja de ruta en GrowFolio (pasos que ya calcula GrowFolio; los marcados como hechos ya los ha hecho)');
      for (const [k, t] of PLAZOS) { const xs = P[k].filter((x) => x.fuente === 'web'); if (xs.length) L.push(`${t}:`, ...xs.map((x) => `- ${x.hecho ? '[hecho] ' : ''}${x.cuando ? x.cuando + ': ' : ''}${limpio(x.t)}. ${limpio(x.det)}`)); }
      // lo que ya ha hecho de lo que le propuso GrowIA: no se lo vuelvas a proponer
      const r = S.cartera.ruta || {}, hIA = Object.entries(r.hechos || {}).filter(([k]) => k.startsWith('ia:')).sort((a, b) => (b[1] > a[1] ? 1 : -1)).slice(0, 15);
      if (hIA.length) L.push('', '## Pasos que le propusiste y ya ha hecho (no los vuelvas a proponer; si hace falta algo distinto, di qué ha cambiado)', ...hIA.map(([k, d]) => `- ${fechaCorta(d)}: ${limpio((r.hechosIA && r.hechosIA[k] && r.hechosIA[k].t) || k.slice(3))}`));
    } catch (e) {}
    const reglas = (S.ia && S.ia.reglas) || [];
    if (reglas.length) L.push('', '## Sus reglas de inversión', ...reglas.map((r) => '- ' + r));
    const yo = S.cartera.asesor && S.cartera.asesor.sobre_mi;
    if (yo) L.push('', '## Lo que cuenta de sí mismo', String(yo).slice(0, 3000));
    return L.join('\n');
  } finally { S.oculto = oc0; }
}

/* 0.5, modo público: GrowIA explica, compara y calcula, pero no recomienda comprar, vender ni mantener valores concretos */
const INSTR_PUBLICAS = `Eres GrowIA, el asistente de GrowFolio, y hablas con el dueño de esta cartera. Tienes delante su cartera real con cifras al céntimo y herramientas que calculan con el mismo motor que GrowFolio.

Lo que no haces, aunque te lo pida: decirle que compre, venda, mantenga o traspase un valor, un fondo o una cripto concretos, cuánto meter en cada uno o a qué precio entrar o salir. Tampoco ordenas las opciones de mejor a peor para él ni dices cuál elegirías tú. Eso es asesoramiento personalizado y GrowFolio no está autorizado para darlo. Si te lo pide («¿vendo Repsol?», «¿qué compro con 1.000 €?», «¿meto más en el S&P 500?»), díselo en una frase, sin sermones, y ayúdale a decidir él: qué mirar, qué opciones hay y qué supone cada una en números.

Lo que sí haces:
- Explicar cómo funciona algo (un fondo, una orden, un impuesto, un índice) y qué significa una cifra de su cartera.
- Contar qué ha pasado con una empresa o un mercado y qué dicen los analistas (su consenso y su rango de objetivos), como opinión de ellos y no tuya.
- Comparar con datos: costes, rentabilidad pasada, riesgo, reparto por países y sectores, lo que se repite entre sus fondos.
- Hacer cuentas con las herramientas: simular_venta para la ganancia que se declara y el impuesto de una venta que plantee él; simular_compra para la tasa, la comisión y cómo queda su límite de acciones sueltas; proyectar con otra aportación.
- Recordarle sus propias reglas y límites (los pone él y vienen abajo) y decirle si algo de su cartera se sale de ellos, sin convertirlo en una orden de comprar o vender.

Cómo respondes:
- En español de España, tuteando, con tono cercano y directo.
- Primero la respuesta; después el porqué, con números de su cartera.
- Contrasta: no te apoyes en una sola fuente. Si buscas en internet, al menos dos fuentes distintas, y di si coinciden.
- Usa solo datos que tengas: los de abajo, los de las herramientas o los de internet. Si algo no se puede saber, dilo.
- Si compara dos acciones del mismo negocio (dos aerolíneas, dos petroleras…), dile que dependen de lo mismo y subirían y caerían a la vez.
- El plazo importa: un 50 % en 3 meses no es lo mismo que en 3 años. Cuando compares, pásalo a «al año».
- Cuando compares opciones, di lo que cuesta cada una en impuestos (al vender, la tasa al comprar, la retención de los dividendos) y si un traspaso entre fondos evita pagar.
- Formato: frases cortas, números en formato español (1.234,56 €), negrita solo para la cifra clave, listas cuando ayuden y tablas solo para comparar. Breve salvo que pida detalle.
- Sigue el hilo: si la pregunta es corta o depende de lo anterior, entiéndela sobre lo último que habéis hablado.
- Lenguaje llano: no es experto. Si usas una palabra técnica, explícala en la misma frase.
- Si te manda un recorte de la pantalla, explica lo que se ve en él con sus datos.`;
function instruccionesAsesor() {
  const anio = new Date().getFullYear();
  // lo de sus brókeres sale de lo que tiene de verdad (no de la cartera del creador de GrowFolio)
  const plats = [...new Set([...((S.M && S.M.filas) || []).map((f) => f.pos.plataforma), ...((S.M && S.M.efectivo) || []).map((e) => e.plataforma)].filter(Boolean))];
  const fuera = plats.filter(esDeFuera), conFondos = ((S.M && S.M.filas) || []).some((f) => /^Fondo/.test(f.inst.tipo || ''));
  const COMIS = { 'Trade Republic': 'Trade Republic, 1 € por operación', MyInvestor: 'MyInvestor, sin comisión en fondos indexados', Bitvavo: 'Bitvavo, alrededor del 0,25 %', Revolut: 'Revolut, según su plan', 'Interactive Brokers': 'Interactive Brokers, desde unos 3 € por operación en Europa' };
  const comis = plats.map((p2) => COMIS[p2]).filter(Boolean);
  const fiscal = `Fiscalidad en España en ${anio}:
- Ventas: ganancia o pérdida = lo cobrado (menos comisiones) menos lo que costó (más comisiones y tasas), por FIFO. Tributa en la base del ahorro: ${textoTramos()}${TRAMOS_FORAL[comunidadUsuario()] ? ` (escala foral de ${nombreComunidad(comunidadUsuario())}, donde vive)` : ''}.
- Las pérdidas se compensan con las ganancias del año; si sobran, con hasta el 25 % de dividendos e intereses; el resto, durante los 4 años siguientes.
- Regla de recompra: si vende con pérdidas y recompra lo mismo en los dos meses anteriores o posteriores (acciones y ETF de bolsas de la UE) o en el año anterior o posterior (fondos de inversión, también con aportaciones automáticas, y acciones y ETF que cotizan fuera de la UE), se aplaza la parte de la pérdida que corresponde a lo recomprado. En cripto no se aplica, aunque hay quien defiende un plazo de un año.
- Traspasos entre fondos de inversión: no tributan. Entre ETF sí.
- Dividendos e intereses: tributan en la base del ahorro; los españoles llegan con el 19 % retenido. Los extranjeros traen la retención del país de la sede: EEUU 15 % (con el W-8BEN que hace el bróker), Países Bajos 15 %, Francia 12,8 %, Reino Unido 0 %; Suiza 35 %, Alemania 26,4 %, Italia 26 %, Dinamarca 27 %, Suecia 30 %, Finlandia 35 %, Bélgica 30 %, Austria 27,5 %, Irlanda 25 %, Noruega 25 %, Portugal 25 %. En la renta recupera con la deducción por doble imposición internacional hasta el tipo del convenio (casi siempre el 15 %): lo que pase se pierde salvo que lo reclame a ese país.
- Fondos de acumulación${conFondos ? ' (mira en sus datos si los suyos lo son)' : ''}: no reparten, así que no pagan nada hasta que venda.
- Tasas al comprar acciones: 0,2 % en España y 0,4 % en Francia (empresas de más de 1.000 millones de capitalización), 0,1 % en Italia y 0,5 % de timbre en Reino Unido. Fondos y ETF no la pagan.
- Modelos 720 y 721: solo si lo que tiene en brókeres de fuera de España${fuera.length ? ` (${fuera.join(', ')})` : ''} o la cripto fuera de España pasan de 50.000 €.
- Sus brókeres: ${plats.length ? plats.join(', ') : 'aún no ha metido ninguno'}.${comis.length ? ` Comisiones aproximadas: ${comis.join('; ')}.` : ''} Si no sabes la comisión de uno, dilo y no la inventes.`;
  if (esPublico()) return `${INSTR_PUBLICAS}

${fiscal}`;
  return `Eres GrowIA, el asesor de inversiones de GrowFolio, y hablas con el dueño de esta cartera. Tienes delante su cartera real con cifras al céntimo y herramientas que calculan con el mismo motor que GrowFolio.

Cómo respondes:
- En español de España, tuteando, con tono cercano y directo: como un amigo que sabe mucho de inversión y de impuestos.
- Primero la respuesta o la recomendación concreta (qué hacer, cuánto, cuándo y dónde). Después el porqué, con números de su cartera.
- Nada de avisos de que no eres asesor financiero ni de "consulta a un profesional": no los quiere. Los riesgos concretos sí, cuando importen.
- Antes de recomendar vender, usa simular_venta para dar la ganancia que se declara y el impuesto (FIFO y escala del ahorro con lo que ya lleva en el año). Antes de recomendar comprar una acción, usa simular_compra para la tasa del país, la comisión y cómo queda su límite de acciones sueltas.
- Contrasta: no recomiendes nada apoyándote en una sola fuente. Cruza el consenso y el rango de objetivos de los analistas, las cuentas (valoración, crecimiento, deuda), la tendencia del precio y las noticias. Si buscas en internet, busca al menos dos fuentes distintas y di si coinciden o no. Si las fuentes chocan, dilo. Si no puedes buscar, contrasta con los titulares que tienes en los datos y dilo.
- Usa solo datos que tengas: los de abajo, los de las herramientas o los de internet. Si te falta algo de hoy, búscalo y di de dónde sale. Si algo no se puede saber, dilo.
- Respeta sus reglas: el límite de acciones sueltas, su colchón (si lo tiene), sus aportaciones automáticas y las reglas que se haya puesto para sus acciones sueltas.
- Antes de recomendar una acción, mira si ya tiene otra suelta del mismo negocio (dos aerolíneas, dos petroleras…): sería repetir la misma apuesta. Dilo claro y, si aun así compensa, explica qué añade que no tenga ya.
- Formato: frases cortas, números en formato español (1.234,56 €), negrita solo para la cifra o la acción clave, listas cuando ayuden a seguir pasos y tablas solo para comparar opciones. Breve salvo que pida detalle.
- Sigue el hilo de la conversación. Si la pregunta es corta o depende de lo anterior («¿y si compro más?», «¿de dónde lo saco?», «¿y la otra?»), entiéndela sobre lo último que habéis hablado (la empresa, la cifra o el plan de tu respuesta anterior) y empieza nombrándolo: «Para comprar más HBX…». Si aun así es ambigua, contesta la interpretación más útil y di cuál has tomado.
- Lo de abajo es un resumen. Del radar solo van las mejor contrastadas y de la prensa, lo más relevante: si la respuesta depende de una empresa, un sector o una noticia que no está ahí, pídelo con las herramientas (buscar_empresa, radar) antes de contestar en general. No inventes datos que podrías consultar.
- Lenguaje llano: no es experto. Nada de jerga sin explicar (catalizador, capex, amplitud de mercado, soportes, recorrido, múltiplos, TER, beta…): dilo con palabras normales o explícalo en la misma frase. En los textos cortos que salen en tarjetas (motivos, vigilar, titulares, qué supone), una o dos frases y empieza por lo que significa para él.
- Ajusta cada consejo a su perfil y sus metas (vienen abajo): no se le recomienda lo mismo a alguien de 24 años que empieza que a alguien de 60 que va a necesitar el dinero. Si te falta algo de su vida o de sus planes que cambie la respuesta (edad, cuándo necesita el dinero, cuánto riesgo aguanta, si tiene colchón o deudas), pregúntaselo en una frase al final, o antes de recomendar si sin eso no puedes.
- El plazo importa: no es lo mismo ganar un 50 % en 3 meses que en 3 años. Cuando compares inversiones o recomiendes una, di en cuánto tiempo esperas la subida (el objetivo de los analistas es a 12 meses; si hay un catalizador con fecha, puede ser antes) y pásalo a "al año" y neto de impuestos. Compáralo con su fondo indexado (un 7 % al año a largo plazo). En sus posiciones, usa lo que llevan ganado al año desde que las compró, no solo el total.
- Toda recomendación lleva su coste fiscal: lo que paga al vender, la tasa al comprar, la retención de los dividendos que no recupera y si un traspaso entre fondos le ahorra pagar. Si dos opciones dan parecido, gana la que paga menos impuestos o los paga más tarde.
- Si te manda un recorte de la pantalla, explica lo que se ve en él con sus datos: qué significa cada cifra, de dónde sale y qué haría él con eso.

${fiscal}`;
}

/* ---------- herramientas: el motor de la web al servicio de la IA ---------- */
const HERRAMIENTAS = [
  { name: 'simular_venta', description: 'Calcula una venta de una de sus posiciones con el motor de GrowFolio: unidades, importe, comisión, valor de compra por FIFO, ganancia o pérdida y el impuesto extra en la renta de este año contando lo que ya lleva. Úsala siempre antes de recomendar vender.', input_schema: { type: 'object', properties: { posicion: { type: 'string', description: 'id o nombre de la posición, por ejemplo "repsol" o "S&P 500"' }, unidades: { type: 'number' }, importe: { type: 'number', description: 'euros a vender, en vez de unidades' }, porcentaje: { type: 'number', description: 'porcentaje de la posición a vender, en vez de unidades' }, precio: { type: 'number', description: 'precio de venta en euros; si no se pone, el actual' } }, required: ['posicion'] } },
  { name: 'simular_compra', description: 'Calcula la compra de una acción o fondo (de su cartera o del radar de GrowFolio, con cientos de empresas de EEUU y Europa): tasa del país, comisión, unidades, cómo queda su límite de acciones sueltas, cuánto pesa ya ese sector y cuánto tiene ya de esa empresa dentro de sus fondos.', input_schema: { type: 'object', properties: { empresa: { type: 'string', description: 'ticker o nombre' }, importe: { type: 'number', description: 'euros a invertir' }, plataforma: { type: 'string', description: 'Trade Republic, MyInvestor o Bitvavo' } }, required: ['empresa', 'importe'] } },
  { name: 'buscar_empresa', description: 'Todos los datos que tiene GrowFolio de una empresa o fondo: precio, analistas y su evolución, rango de objetivos, valoración, crecimiento, deuda, tendencia, el contraste de señales, cuánto tiene ya dentro de sus fondos y la ficha de GrowIA (lo que pesa ahora en su prensa, factor por factor, y los temas que le tocan). Busca en su cartera y en el radar de GrowFolio (cientos de empresas de EEUU y Europa); si no está, usa la búsqueda web.', input_schema: { type: 'object', properties: { consulta: { type: 'string', description: 'ticker o nombre' } }, required: ['consulta'] } },
  { name: 'radar', description: 'Busca en el radar de GrowFolio (cientos de empresas de EEUU y Europa) con filtros y devuelve las mejores según el orden que pidas, con su potencial, consenso, PER futuro, dividendo, señales a favor y lo que ha leído GrowIA de su prensa esta semana. Úsala para buscar candidatas (por sector, zona, dividendo…) o noticias de empresas que no están en el resumen.', input_schema: { type: 'object', properties: { sector: { type: 'string', description: 'sector o industria, en español o inglés: salud, tecnología, bancos, energía, semiconductores…' }, zona: { type: 'string', description: 'EEUU, Europa, España, Alemania, Reino Unido…' }, potencial_min: { type: 'number', description: '% mínimo hasta el objetivo medio de los analistas' }, dividendo_min: { type: 'number', description: '% mínimo de dividendo' }, orden: { type: 'string', enum: ['contraste', 'potencial', 'dividendo', 'barata', 'prensa'], description: 'contraste (por defecto): más señales a favor; barata: menor PER futuro; prensa: mejores noticias de la semana' }, cuantas: { type: 'integer', description: 'de 1 a 25, por defecto 12' } } } },
  { name: 'proyectar', description: 'Simula 2.000 escenarios de su cartera con otra aportación mensual, subida anual de la aportación o rentabilidad de la bolsa.', input_schema: { type: 'object', properties: { aportacion_mensual: { type: 'number' }, anios: { type: 'integer', description: 'de 1 a 30' }, subida_anual_aportacion: { type: 'number', description: '% al año' }, rentabilidad_bolsa: { type: 'number', description: '% anual a largo plazo, por defecto 7' } }, required: ['aportacion_mensual'] } },
  { name: 'historico', description: 'Evolución de una de sus posiciones o de un índice entre dos fechas: precio inicial y final, cambio, máximo, mínimo y peor caída. Índices: Ibex 35, Euro Stoxx 50, DAX, S&P 500, Nasdaq 100, Nikkei 225, Brent, Oro, Bitcoin, Euro/dólar, VIX, Bono EEUU 10 años.', input_schema: { type: 'object', properties: { activo: { type: 'string' }, desde: { type: 'string', description: 'AAAA-MM-DD' }, hasta: { type: 'string', description: 'AAAA-MM-DD, por defecto hoy' } }, required: ['activo', 'desde'] } },
];

function hSimularVenta(q) {
  const f = buscarFila(q.posicion);
  if (!f) return { error: `No encuentro "${q.posicion}" en su cartera. Tiene: ${S.M.filas.map((x) => `${x.inst.corto} (id "${x.pos.id}")`).join(', ')}.` };
  if (!f.uds || !f.precio) return { error: 'Esa posición no tiene unidades o precio.' };
  const pr = +q.precio > 0 ? +q.precio : f.precio;
  let u = +q.unidades > 0 ? +q.unidades : +q.importe > 0 ? q.importe / pr : +q.porcentaje > 0 ? (f.uds * q.porcentaje) / 100 : f.uds;
  u = Math.min(u, f.uds);
  const gastos = f.pos.plataforma === 'Trade Republic' ? 1 : f.inst.clase === 'Cripto' ? 0.0025 * u * pr : 0;
  const bruto = u * pr, neto = bruto - gastos;
  const r = fifo(lotesDe(f.pos), u);
  const gan = neto - r.coste;
  const anio = new Date().getFullYear();
  const iv = impuestoDeVenta(gan, anio);
  return {
    posicion: f.inst.corto, plataforma: f.pos.plataforma, unidades: R2(u, 6), de_un_total_de: R2(f.uds, 6), precio: R2(pr, 4),
    importe_bruto: R2(bruto), comision: R2(gastos), cobras: R2(neto), valor_de_compra_fifo: R2(r.coste),
    lotes_usados: r.usados.map((l) => ({ fecha: l.f, unidades: R2(l.u, 6), coste: R2(l.c) })),
    ganancia_o_perdida: R2(gan), impuesto_extra_en_la_renta: R2(Math.max(0, iv.impuesto)), ahorro_en_la_renta: R2(Math.max(0, -iv.impuesto)),
    tipo_efectivo_pct: gan > 0 ? R2((iv.impuesto / gan) * 100, 1) : 0,
    renta: { anio, cuota_antes: R2(iv.antes.cuota), cuota_despues: R2(iv.despues.cuota), base_despues: R2(iv.despues.base), perdidas_para_anios_siguientes: R2(iv.despues.sobra) },
    te_quedan: R2(f.uds - u, 6), valor_que_te_queda: R2((f.uds - u) * f.precio),
    notas: [/^Fondo/.test(f.inst.tipo || '') ? 'Es un fondo: si en vez de venderlo lo traspasa a otro fondo, no paga nada ahora.' : '', r.mezcla ? 'Lo que tenía antes de usar GrowFolio cuenta como un solo lote a su precio medio; el informe fiscal del bróker lo afina compra a compra.' : '', f.estimada ? 'La cantidad de esta posición es estimada.' : ''].filter(Boolean).join(' ') || undefined,
  };
}
function hSimularCompra(q) {
  const imp = +q.importe;
  if (!(imp > 0)) return { error: 'Falta el importe en euros.' };
  const M = S.M;
  const f = buscarFila(q.empresa), x = f ? null : buscarRadar(q.empresa);
  if (!f && !x) return { error: `"${q.empresa}" no está en su cartera ni en el radar de GrowFolio. Busca sus datos en internet. Tasa de compra por país: España 0,2 % y Francia 0,4 % (empresas de más de 1.000 millones), Italia 0,1 %, Reino Unido 0,5 %; fondos y ETF no pagan.` };
  const nombre = f ? f.inst.corto : x.n, precio = f ? f.precio : x.pe || x.p;
  const pais = f ? f.inst.pais : PAIS_DE_NOMBRE[x.pais], tipo = f ? f.inst.tipo : 'Acción';
  const cap = f ? f.p && f.p.fundamentales && f.p.fundamentales.capitalizacion : x.cap;
  const sector = f ? f.p && f.p.sector : x.sector, moneda = f ? 'EUR' : x.m;
  const plat = q.plataforma || (f ? f.pos.plataforma : 'Trade Republic');
  const tasa = f ? tasaCompra(pais, tipo, cap) : tasaRadar(x);
  const comision = plat === 'Trade Republic' ? 1 : plat === 'Bitvavo' ? 0.0025 * imp : 0;
  const t = tasa ? imp * tasa.tipo : 0;
  const sueltas = sum(M.filas.filter((y) => y.inst.tipo === 'Acción'), (y) => y.valor);
  const lim = +(S.cartera.limite_acciones ?? 20);
  const sect = sector ? (reparto(M, 'sector', 'rv').filas.find((s) => s.k === sector) || {}).pct || 0 : null;
  return {
    empresa: nombre, plataforma: plat, precio_aprox_eur: R2(precio, 4), unidades_aprox: precio ? R2(imp / precio, 4) : null,
    importe: R2(imp), comision: R2(comision), tasa_de_compra: tasa ? { tipo_pct: tasa.tipo * 100, nombre: tasa.nombre, importe: R2(t) } : 'no paga',
    total_a_pagar: R2(imp + comision + t), nota_fiscal: 'La comisión y la tasa suman al precio de compra para Hacienda.',
    acciones_sueltas: tipo === 'Acción' ? { ahora_pct: R2((sueltas / M.total) * 100, 1), con_dinero_nuevo_pct: R2(((sueltas + imp) / (M.total + imp)) * 100, 1), con_dinero_que_ya_tiene_pct: R2(((sueltas + imp) / M.total) * 100, 1), limite_pct: lim } : null,
    peso_de_su_sector_en_su_bolsa_pct: sect != null ? R2(sect, 1) : null,
    ya_tiene_dentro_de_sus_fondos_eur: R2(dentroDeFondos(M)(nombre), 0),
    divisa: moneda && moneda !== 'EUR' ? `Cotiza en ${moneda}: el cambio con el euro también cuenta.` : undefined,
    dividendos: (() => { const fis = fiscalidadSede(x ? origenRadar(x).sede : pais, tipo); return { retencion_en_origen_pct: fis.ret, se_pierde_pct: fis.pierde, nota: fis.txt }; })(),
    si_llega_al_objetivo_de_los_analistas: (() => { if (!x) return undefined; const e = rentaEsperada(x, x.pot, 12); return e ? { subida_pct: R2(e.subida, 1), en_meses: 12, neto_de_impuestos_pct: R2(e.netoP, 1), neto_al_anio_pct: R2(e.netoAnual, 1), su_tramo_del_ahorro_pct: R2(e.t * 100, 0) } : undefined; })(),
    sede: x ? origenRadar(x).sedeNombre : undefined, cotiza_en: x ? origenRadar(x).ciudad : undefined,
    ya_la_tiene: !!f,
  };
}
function hBuscarEmpresa(q) {
  const f = buscarFila(q.consulta);
  if (f) {
    const sim = (f.p && f.p.simbolo) || f.inst.yahoo, le = sim ? lecturaDe(sim) : null, inf = informeDe(f.inst.id);
    const N = ((S.precios && S.precios.noticias) || {})[f.inst.id] || (sim ? noticiasIdea(sim) : []);
    return { en_su_cartera: true, datos: fichaTexto(f),
      prensa_segun_growia: inf ? { impacto: inf.impacto, novedades: inf.novedades, contraste: inf.contraste, vigilar: inf.vigilar } : le ? { impacto: le.imp, relevancia: le.rel, resumen: le.txt, catalizador: le.cat, fecha: le.d } : 'sin leer todavía',
      ficha_growia: (sim && fichaGrowIA(sim, 4)) || 'sin ficha todavía',
      titulares_recientes: ordenarNoticias(N).slice(0, 6).map(({ n, m }) => titularGrowIA(n, m)) };
  }
  const x = buscarRadar(q.consulta);
  const M = S.M;
  if (!x) return { error: `No está en su cartera ni en el radar de ${radarVals().length} empresas de GrowFolio. Usa la búsqueda en internet.` };
  const ideas = mejoresIdeas(M), k = ideas.findIndex((y) => y.s === x.s);
  const ctr = contraste(x);
  const tasa = tasaRadar(x);
  return {
    en_su_cartera: false, nombre: x.n, ticker: x.s, zona: x.z, pais: PAISES[PAIS_DE_NOMBRE[x.pais]] || x.pais, sector: x.sector, industria: x.ind,
    precio: `${fmtNum(x.p, 2)} ${x.m}`, precio_eur: R2(x.pe, 2), hoy_pct: x.v, en_directo: !!x.vivo,
    analistas: { consenso: CONSENSO[x.r] || null, nota_media_1_a_5: x.rm, numero: x.na, votos_ahora: x.v0, votos_hace_3_meses: x.v3, objetivo_medio: x.obj, objetivo_bajo: x.tb, objetivo_alto: x.ta, potencial_pct: R2(x.pot, 1) },
    valoracion: { per: x.per, per_futuro: x.perf, crecimiento_beneficio_esperado_pct: x.epsg, crecimiento_beneficio_pct: x.eg, crecimiento_ingresos_pct: x.rg, roe_pct: x.roe, margen_pct: x.mg, deuda_capital_pct: x.de, dividendo_pct: x.div, capitalizacion_eur: x.cap, beta: x.beta },
    precio_y_tendencia: { cambio_1_anio_pct: x.c1a, media_50: x.m50, media_200: x.m200, sobre_media_200_pct: x.m200 && x.p ? R2((x.p / x.m200 - 1) * 100, 1) : null, maximo_52s: x.mx, minimo_52s: x.mn },
    contraste: { a_favor: ctr.favor, en_contra: ctr.contra, de: ctr.total, detalle: ctr.checks.map((c) => `${c.k}: ${c.ok === 1 ? 'a favor' : c.ok === -1 ? 'en contra' : 'neutral'} (${c.txt})`) },
    tasa_de_compra: tasa ? `${fmtNum(tasa.tipo * 100, 1)} % (${tasa.nombre})` : 'no paga',
    ya_tiene_dentro_de_sus_fondos_eur: R2(dentroDeFondos(M)(x.n), 0),
    valoracion_de_la_web: k >= 0 ? { puesto: k + 1, de: ideas.length, motivos: ideas[k].motivos, pegas: ideas[k].pegas } : 'No pasa el filtro de ideas de GrowFolio (potencial de al menos un 10 %, 8 analistas o más, consenso de compra, 3 señales a favor y no haber caído más de un 35 % en un año).',
    ficha_growia: fichaGrowIA(x.s, 4) || 'sin ficha todavía: lo leído de su prensa viene en prensa_leida_por_gemini',
    titulares_recientes: ordenarNoticias(noticiasIdea(x.s)).slice(0, 5).map(({ n, m }) => titularGrowIA(n, m)),
    prensa_leida_por_gemini: lecturaDe(x.s) ? { impacto: lecturaDe(x.s).imp, relevancia: lecturaDe(x.s).rel, resumen: lecturaDe(x.s).txt, catalizador: lecturaDe(x.s).cat, fecha: lecturaDe(x.s).d } : 'sin leer todavía',
    datos_de: x.f || (S.radar && S.radar.generado),
  };
}
function hRadar(q) {
  const todas = radarVals();
  const nt = (t) => normTxt(String(t || ''));
  let xs = todas.filter((x) => x && x.s);
  if (q.sector) { const k = nt(q.sector); xs = xs.filter((x) => nt(x.sector).includes(k) || nt(x.ind).includes(k) || nt(INDUSTRIA_ES[x.ind] || '').includes(k)); }
  if (q.zona) { const k = nt(q.zona); xs = xs.filter((x) => [x.z, x.pais, PAISES[PAIS_DE_NOMBRE[x.pais]], origenRadar(x).ciudad].some((v) => nt(v).includes(k))); }
  if (q.potencial_min != null) xs = xs.filter((x) => x.pot != null && x.pot >= +q.potencial_min);
  if (q.dividendo_min != null) xs = xs.filter((x) => (x.div || 0) >= +q.dividendo_min);
  const ctr = new Map(xs.map((x) => [x.s, contraste(x)]));
  const tono = (l) => (l ? l.rel * (l.imp === 'positivo' ? 1 : l.imp === 'negativo' ? -1 : 0.2) : -99);
  const ORD = { contraste: (x) => ctr.get(x.s).favor - ctr.get(x.s).contra + (x.pot || 0) / 1000, potencial: (x) => x.pot ?? -999, dividendo: (x) => x.div || 0, barata: (x) => (x.perf > 0 ? -x.perf : -999), prensa: (x) => tono(lecturaDe(x.s)) };
  const ord = ORD[q.orden] ? q.orden : 'contraste';
  // las que siguen menos de 3 analistas, al final: su potencial o su dividendo dicen poco
  const flojas = (x) => ((x.na || 0) < 3 ? 1 : 0);
  xs.sort((a, b) => flojas(a) - flojas(b) || ORD[ord](b) - ORD[ord](a));
  const n = Math.max(1, Math.min(25, Math.round(+q.cuantas || 12)));
  return {
    en_el_radar: todas.length, cumplen_los_filtros: xs.length, orden: ord,
    empresas: xs.slice(0, n).map((x) => { const c = ctr.get(x.s), l = lecturaDe(x.s); return {
      nombre: x.n, ticker: x.s, zona: x.z, sector: x.sector || null, precio: `${fmtNum(x.p, 2)} ${x.m}`, potencial_pct: R2(x.pot, 1),
      consenso: CONSENSO[x.r] || null, analistas: x.na || 0, per_futuro: x.perf || null, dividendo_pct: x.div || 0, senales_a_favor: `${c.favor} de ${c.total}${c.contra ? `, ${c.contra} en contra` : ''}`,
      prensa_de_la_semana: l && l.txt && l.rel >= 1 ? `${l.imp}, relevancia ${l.rel}: ${l.txt}` : null }; }),
    nota: xs.length ? 'Para todos sus datos o simular la compra, usa buscar_empresa o simular_compra con el ticker.' : 'Ninguna cumple esos filtros: prueba con otros más amplios.',
  };
}
function hProyectar(q) {
  const M = S.M;
  const aport = Math.max(0, +q.aportacion_mensual || 0);
  const anios = Math.max(1, Math.min(30, Math.round(+q.anios || 10)));
  const prev = S.proy, prevC = S.proyCache;
  try {
    const c0 = cfgProy();
    S.proy = { ...(S.proy || {}), aport, subida: q.subida_anual_aportacion != null ? +q.subida_anual_aportacion : c0.subida, bolsa: q.rentabilidad_bolsa != null ? +q.rentabilidad_bolsa : c0.bolsa, real: false };
    S.proyCache = null;
    const pr = proyeccion(M, cfgProy());
    const at = (a) => ({ anios: a, si_va_mal_p10: R2(pr.p10[a * 12], 0), probable_p50: R2(pr.p50[a * 12], 0), si_va_bien_p90: R2(pr.p90[a * 12], 0), habra_puesto: R2(pr.aportado[a * 12], 0) });
    const hitos = META_HITOS.map((m) => { const i = pr.p50.findIndex((x) => x >= m); return { meta: m, lo_probable_en: i < 0 ? 'más de 30 años' : pr.fechas[i].slice(0, 7) }; });
    return { supuestos: { aportacion_mensual: aport, subida_anual_aportacion_pct: S.proy.subida, bolsa_anual_pct: S.proy.bolsa, rentabilidad_esperada_hoy_pct: R2(pr.mu, 1), volatilidad_hoy_pct: R2(pr.sd, 1) }, resultado: [...new Set([anios, 5, 10, 20])].sort((a, b) => a - b).map(at), hitos };
  } finally { S.proy = prev; S.proyCache = prevC; }
}
function hHistorico(q) {
  let serie = null, nombre = q.activo, moneda = 'EUR';
  const merc = (S.precios && S.precios.mercados) || {};
  const n = normTxt(q.activo).replace(/ /g, '');
  const ALIAS = { ibex: '^IBEX', ibex35: '^IBEX', eurostoxx: '^STOXX50E', eurostoxx50: '^STOXX50E', dax: '^GDAXI', sp500indice: '^GSPC', indicesp500: '^GSPC', nasdaq: '^NDX', nasdaq100: '^NDX', nikkei: '^N225', nikkei225: '^N225', brent: 'BZ=F', petroleo: 'BZ=F', crudo: 'BZ=F', orospot: 'GC=F', bitcoinindice: 'BTC-EUR', eurodolar: 'EURUSD=X', eurusd: 'EURUSD=X', vix: '^VIX', bono: '^TNX', bonoeeuu: '^TNX', bonoeeuu10anos: '^TNX' };
  const sym = ALIAS[n] || Object.keys(merc).find((s) => normTxt(merc[s].nombre).replace(/ /g, '') === n || normTxt(s).replace(/ /g, '') === n);
  const f = sym ? null : buscarFila(q.activo);
  if (f) { serie = histDe(f.inst.id); nombre = f.inst.corto; }
  else if (sym) { serie = histMercado(sym); nombre = merc[sym] ? merc[sym].nombre : sym; moneda = (merc[sym] && merc[sym].moneda) || ''; }
  if (!serie || !serie.length) return { error: 'No tengo histórico de eso. Prueba con una de sus posiciones o con un índice: Ibex 35, Euro Stoxx 50, DAX, S&P 500 índice, Nasdaq 100, Nikkei 225, Brent, Oro, Bitcoin, Euro/dólar, VIX o Bono EEUU.' };
  const desde = String(q.desde || '').slice(0, 10), hasta = String(q.hasta || hoyIso()).slice(0, 10);
  const tramo = serie.filter(([d]) => d >= desde && d <= hasta);
  if (tramo.length < 2) return { error: `Sin datos entre ${desde} y ${hasta}. El histórico empieza el ${serie[0][0]}.` };
  let max = -Infinity, min = Infinity, pico = -Infinity, peor = 0, fMax, fMin;
  for (const [d, p] of tramo) { if (p > max) { max = p; fMax = d; } if (p < min) { min = p; fMin = d; } pico = Math.max(pico, p); peor = Math.min(peor, p / pico - 1); }
  const [d0, p0] = tramo[0], [d1, p1] = tramo[tramo.length - 1];
  return { activo: nombre, moneda, desde: d0, hasta: d1, precio_inicial: R2(p0, 4), precio_final: R2(p1, 4), cambio_pct: R2((p1 / p0 - 1) * 100, 2), maximo: { precio: R2(max, 4), fecha: fMax }, minimo: { precio: R2(min, 4), fecha: fMin }, peor_caida_pct: R2(peor * 100, 1), puntos: tramo.length };
}
function ejecutarHerramienta(nombre, input) {
  try {
    const fn = { simular_venta: hSimularVenta, simular_compra: hSimularCompra, buscar_empresa: hBuscarEmpresa, radar: hRadar, proyectar: hProyectar, historico: hHistorico }[nombre];
    if (!fn) return { error: 'Herramienta desconocida: ' + nombre };
    S.M = S.M || calcular();
    return fn(input || {});
  } catch (e) { console.warn(e); return { error: 'Falló el cálculo: ' + e.message }; }
}
function pasoTxt(nombre, q = {}) {
  if (nombre === 'simular_venta') return `Calcula la venta${q.unidades ? ` de ${fmtNum(q.unidades, 0)}` : q.porcentaje ? ` del ${fmtNum(q.porcentaje, 0)} %` : q.importe ? ` de ${E0(q.importe)}` : ''}${q.posicion ? ` de ${q.posicion}` : ''}, con FIFO e impuestos`;
  if (nombre === 'simular_compra') return `Calcula una compra${q.importe ? ` de ${E0(q.importe)}` : ''}${q.empresa ? ` en ${q.empresa}` : ''}, con su tasa`;
  if (nombre === 'buscar_empresa') return `Mira los datos de ${q.consulta || 'una empresa'}`;
  if (nombre === 'radar') return `Busca en el radar${q.sector ? ` empresas de ${q.sector}` : ''}${q.zona ? ` en ${q.zona}` : ''}`;
  if (nombre === 'proyectar') return `Proyecta tu cartera${q.aportacion_mensual != null ? ` aportando ${E0(q.aportacion_mensual)} al mes` : ''}`;
  if (nombre === 'historico') return `Mira el histórico de ${q.activo || ''}${q.desde ? ` desde el ${fechaLarga(String(q.desde).slice(0, 10))}` : ''}`;
  if (nombre === 'web_search') return q.query ? `Busca en internet: ${q.query}` : 'Busca en internet';
  if (nombre === 'buscar_en_internet') return q.consulta ? `Busca en internet: ${q.consulta}` : 'Busca en internet';
  return 'Calcula';
}

/* Una vuelta completa: la IA responde, pide herramientas, se las damos y sigue hasta terminar */
function conversar(o) { return conversarGemini(o); }

/* ---------- Gemini (API de Google AI Studio): mismas herramientas, mismo formato de turnos ---------- */
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
let MODO_CLAVE_G = LS.get('inv-gkey-modo', 'cabecera');
async function fetchGoogle(url, opts = {}, clave = AS.clave) {
  const hacer = (modo) => fetch(modo === 'query' ? `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(clave)}` : url, { ...opts, headers: { ...(opts.headers || {}), ...(modo === 'cabecera' ? { 'x-goog-api-key': clave } : {}) } });
  const r = await hacer(MODO_CLAVE_G);
  if (r.ok) contarPeticion(url);
  if ([400, 401, 403].includes(r.status)) {
    const otro = MODO_CLAVE_G === 'cabecera' ? 'query' : 'cabecera';
    let txt = ''; try { txt = await r.clone().text(); } catch (e) {}
    if (/API key|API_KEY|ACCESS_TOKEN_TYPE|UNAUTHENTICATED|credential/i.test(txt)) {
      const r2 = await hacer(otro);
      if (r2.ok || ![400, 401, 403].includes(r2.status)) { MODO_CLAVE_G = otro; LS.set('inv-gkey-modo', otro); if (r2.ok) contarPeticion(url); return r2; }
    }
  }
  return r;
}
const dormir = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); if (signal) signal.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Parado', 'AbortError')); }, { once: true }); });
function esquemaGemini(x) {
  if (Array.isArray(x)) return x.map(esquemaGemini);
  if (!x || typeof x !== 'object') return x;
  const o = {};
  for (const [k, v] of Object.entries(x)) o[k] = k === 'type' && typeof v === 'string' ? v.toUpperCase() : k === 'properties' ? Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, esquemaGemini(vv)])) : esquemaGemini(v);
  return o;
}
const BUSCAR_GEMINI = { name: 'buscar_en_internet', description: 'Busca en internet con Google noticias y datos recientes y devuelve un resumen con sus fuentes. Antes de usarla, mira lo que ya tienes: los datos de abajo y buscar_empresa (los titulares de los últimos días y lo que GrowIA ya ha leído de su prensa). Úsala solo para lo que no esté ahí o sea de hoy, con al menos dos fuentes. Cada búsqueda gasta del cupo diario de la clave del usuario.', parameters: { type: 'OBJECT', properties: { consulta: { type: 'STRING', description: 'qué buscar: concreto, con el nombre de la empresa y el tema' } }, required: ['consulta'] } };
const herramientasGemini = (web) => [{ functionDeclarations: [...HERRAMIENTAS.map((h) => ({ name: h.name, description: h.description, parameters: esquemaGemini(h.input_schema) })), ...(web ? [BUSCAR_GEMINI] : [])] }];
function errorGoogle(estado, j) {
  const e0 = (j && j.error) || {}, m = e0.message || '', det = JSON.stringify(e0.details || '');
  let e;
  if (/API key not valid|API_KEY_INVALID/i.test(m + det)) e = new Error('Google dice que la clave no es válida. Cópiala otra vez entera desde aistudio.google.com/apikey (sin espacios al principio ni al final).');
  else if (estado === 401 || /ACCESS_TOKEN_TYPE_UNSUPPORTED|UNAUTHENTICATED/i.test(m + det)) e = new Error('Google no acepta esta clave desde GrowFolio. Crea otra en aistudio.google.com/apikey y vuelve a probar; si sigue igual, avísanos con el bichito de arriba.');
  else if (estado === 403) e = new Error('Tu clave de Google no tiene permiso para este modelo. Elige Gemini 3.8 Flash en Ajustes de GrowIA, que es gratis.');
  else if (estado === 404) e = new Error('Ese modelo de Gemini no existe para tu clave: elige otro en Ajustes de GrowIA.');
  else if (estado === 429) e = new Error(/free.?tier|limit: 0/i.test(m) && /pro|argon/i.test(m) ? 'Ese modelo no entra en el plan gratuito: elige Gemini 3.8 Flash en Ajustes de GrowIA.' : 'Has llegado al límite gratuito de tu clave de Google. Si es el de por minuto, en un momento vuelve a funcionar; si es el diario, mañana hacia las 9:00. Es el de tu clave: cada uno usa la suya.');
  else if (estado >= 500) e = new Error('Google está saturado ahora mismo. Prueba en un momento.');
  else e = new Error(m || `Error ${estado} de Google`);
  e.estado = estado; e.msg = m;
  const ri = (e0.details || []).find((d) => /RetryInfo/.test(d['@type'] || ''));
  if (ri && ri.retryDelay) e.espera = parseFloat(ri.retryDelay);
  // el cupo de por día (no el de por minuto): no merece la pena esperar
  e.diario = estado === 429 && (/PerDay|per.?day|daily/i.test(m + det) || e.espera > 60);
  return e;
}
/* 0.6c: si Google no empieza a contestar en 90 s, la petición se corta y cuenta como un corte de conexión (se reintenta).
   Con el móvil, una petición colgada tanto rato acababa en «No hay conexión» sin más */
const ESPERA_GEMINI = 90000;
const esCorteRed = (e) => e && e.name !== 'AbortError' && (e.corte || /Failed to fetch|NetworkError|network error|Load failed|ERR_/i.test(e.message || ''));
async function llamarGemini(clave, modelo, cuerpo, turno, signal, alCambiar) {
  const ctl = new AbortController(); let tarde = false;
  const reloj = setTimeout(() => { tarde = true; ctl.abort(); }, ESPERA_GEMINI);
  const parar = () => ctl.abort();
  if (signal) { if (signal.aborted) ctl.abort(); else signal.addEventListener('abort', parar, { once: true }); }
  let r;
  try { r = await fetchGoogle(`${GEMINI}/models/${modelo}:streamGenerateContent?alt=sse`, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }, clave); }
  catch (e) { if (tarde) { const t = new Error(`Google no ha contestado en ${ESPERA_GEMINI / 1000} s`); t.corte = true; throw t; } throw e; }
  finally { clearTimeout(reloj); if (signal) signal.removeEventListener('abort', parar); }
  if (!r.ok) { let j = null; try { j = await r.json(); } catch (e) {} throw errorGoogle(r.status, j); }
  const lector = r.body.getReader(), dec = new TextDecoder();
  let buf = '', fin = null, uso = {}, bloqueo = null, texto = null, vista = null;
  const partes = [];
  const procesar = (ch) => {
    if (ch.error) throw errorGoogle(ch.error.code || 500, ch);
    if (ch.usageMetadata) uso = ch.usageMetadata;
    if (ch.promptFeedback && ch.promptFeedback.blockReason) bloqueo = ch.promptFeedback.blockReason;
    const c = (ch.candidates || [])[0];
    if (!c) return;
    if (c.finishReason) fin = c.finishReason;
    for (const pt of (c.content && c.content.parts) || []) {
      if (pt.thought) { if (pt.thoughtSignature) partes.push({ ...pt }); continue; }
      if (pt.functionCall) {
        partes.push(JSON.parse(JSON.stringify(pt))); texto = null;
        const fc = pt.functionCall;
        turno.partes.push({ tipo: 'paso', web: fc.name === 'buscar_en_internet', txt: pasoTxt(fc.name, fc.args || {}) });
      } else if (typeof pt.text === 'string') {
        if (!texto) { texto = { text: '' }; partes.push(texto); vista = { tipo: 'texto', texto: '' }; turno.partes.push(vista); }
        texto.text += pt.text; vista.texto = texto.text;
        if (pt.thoughtSignature) texto.thoughtSignature = pt.thoughtSignature;
      } else partes.push(JSON.parse(JSON.stringify(pt)));
    }
    alCambiar();
  };
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    buf += dec.decode(value, { stream: true }).replace(/\r/g, '');
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const trozo = buf.slice(0, i); buf = buf.slice(i + 2);
      const datos = trozo.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
      if (!datos) continue;
      let ch; try { ch = JSON.parse(datos); } catch (e) { continue; }
      procesar(ch);
    }
  }
  if (buf.trim().startsWith('data:')) { try { procesar(JSON.parse(buf.trim().slice(5))); } catch (e) {} }
  turno.partes = turno.partes.filter((p) => p.tipo !== 'texto' || p.texto);
  return { contenido: partes.filter((p) => !(typeof p.text === 'string' && !p.text && !p.thoughtSignature)), fin, uso, bloqueo };
}
/* búsqueda con Google: una llamada aparte con la herramienta de búsqueda de Gemini */
/* 0.5b: cada búsqueda es una petición más a Google con la clave del usuario. Va con Flash-Lite, el modelo con más cupo gratis,
   y no con el de la conversación (el 3.8 Flash tiene muy poco cupo diario y las búsquedas lo agotaban). Si Flash-Lite no puede
   (sin cupo hoy o sin búsqueda en ese modelo), con el de la conversación, como antes. */
async function buscarGoogle(consulta, turno, signal) {
  if (!consulta) return { error: 'Falta qué buscar.' };
  const vivo = AS.modeloVivo || modeloVivo(), fuera = agotadosIA();
  const modelos = [MODELO_RAPIDO, vivo].filter((m, k, v) => MODELOS[m] && v.indexOf(m) === k && (m === vivo || !fuera.includes(m)));
  let r, modelo;
  for (let k = 0; k < modelos.length; k++) {
    modelo = modelos[k];
    try {
      r = await fetchGoogle(`${GEMINI}/models/${modelo}:generateContent`, { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Busca en internet y resume en español de España, con fechas y cifras, lo más reciente sobre: ${consulta}. Usa varias fuentes y di si coinciden o no.` }] }], tools: [{ google_search: {} }] }) });
    } catch (e) { if (e.name === 'AbortError') throw e; return { error: 'No se pudo conectar para buscar.' }; }
    if (r.ok || k === modelos.length - 1) break;
    // no ha podido el de más cupo: se apunta si es que se le ha acabado y se prueba con el de la conversación
    let j0 = null; try { j0 = await r.json(); } catch (e) {}
    if (errorGoogle(r.status, j0).diario) marcarAgotado(modelo);
  }
  if (!r.ok) {
    let j = null; try { j = await r.json(); } catch (e) {}
    const e = errorGoogle(r.status, j);
    if (e.diario) marcarAgotado(modelo);
    if (r.status !== 429 && r.status < 500) { guardarCfgAsesor({ web_falla: Date.now() }); AS.sinWeb = true; turno.partes.push({ tipo: 'paso', web: true, txt: 'Tu plan de Google no incluye la búsqueda en internet: sigo con los titulares de GrowFolio' }); }
    return { error: `No se pudo buscar en internet (${e.message}). Contrasta con los titulares que tienes en los datos.` };
  }
  const j = await r.json(), c = (j.candidates || [])[0] || {};
  const texto = ((c.content && c.content.parts) || []).map((x) => x.text || '').join('').trim();
  const fuentes = ((c.groundingMetadata && c.groundingMetadata.groundingChunks) || []).map((g) => g.web).filter((w) => w && w.uri).map((w) => ({ t: w.title || w.uri, u: w.uri, d: w.title }));
  turno.resultados.push(...fuentes); turno.citas.push(...fuentes);
  return { resumen: texto || 'Sin resultados.', fuentes: fuentes.map((f) => f.t).slice(0, 10) };
}
async function mejorFlash(clave) {
  try {
    const r = await fetchGoogle(`${GEMINI}/models?pageSize=200`, {}, clave);
    if (!r.ok) return null;
    const j = await r.json();
    const v = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace(/^models\//, '')).filter((n) => /^gemini-[\d.]+-flash$/.test(n));
    v.sort((a, b) => parseFloat(b.split('-')[1]) - parseFloat(a.split('-')[1]));
    return v[0] || null;
  } catch (e) { return null; }
}
async function conversarGemini({ mensajes, turno, sistema, maxTokens = 4096, alCambiar = () => {}, signal, web, modelo: pedido, herramientas = true }) {
  let cfg = cfgAsesor();
  if (pedido && MODELOS[pedido]) cfg = { ...cfg, modelo: pedido };
  const clave = AS.clave;
  const contents = mensajes.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: typeof m.content === 'string' ? [{ text: m.content }] : m.content }));
  const sysTexto = (Array.isArray(sistema) ? sistema.map((b) => b.text) : [String(sistema || '')]).join('\n\n');
  const usarWeb = web !== false && cfg.web && !AS.sinWeb;
  let reintentos = 0, conPensar = true, cambiado = false;
  let modelo = modeloVivo(cfg);
  const inicio = contents.length, probados = new Set([modelo]);
  AS.modeloVivo = modelo;
  if (modelo !== cfg.modelo) turno.partes.push({ tipo: 'paso', txt: `${MODELOS[cfg.modelo].n} ya ha gastado su cupo de hoy: contesta ${MODELOS[modelo].n}` });
  // si el modelo se agota a mitad, se empieza la respuesta de nuevo con el siguiente
  const saltar = (porque) => {
    const fuera = agotadosIA(), otro = ordenIA(cfg.modelo).find((x) => !probados.has(x) && !fuera.includes(x));
    if (!otro) return false;
    turno.partes = turno.partes.filter((x) => x.tipo === 'paso');
    turno.partes.push({ tipo: 'paso', txt: `${MODELOS[modelo].n} ${porque}: sigo con ${MODELOS[otro].n}` });
    modelo = otro; probados.add(otro); AS.modeloVivo = otro; contents.length = inicio; reintentos = 0; conPensar = true;
    alCambiar(); return true;
  };
  let cortes = 0, busquedas = 0;
  for (let vuelta = 0; vuelta < 14; vuelta++) {
    const m = MODELOS[modelo] || {};
    const pasosAntes = turno.partes.length;
    const cuerpo = {
      systemInstruction: { parts: [{ text: sysTexto }] }, contents, ...(herramientas ? { tools: herramientasGemini(usarWeb) } : {}),
      generationConfig: { maxOutputTokens: Math.max(maxTokens * 2, 16384), ...(conPensar && m.pensar ? { thinkingConfig: { thinkingLevel: m.pensar } } : {}) },
    };
    let r;
    try { r = await llamarGemini(clave, modelo, cuerpo, turno, signal, alCambiar); }
    catch (e) {
      if (e.name === 'AbortError') throw e;
      // 0.6c: un corte de la conexión (o Google sin contestar) a mitad de la conversación: se repite esa misma petición,
      // hasta dos veces, quitando lo que hubiera empezado a escribir; a la tercera, con otro modelo si lo hay
      if (esCorteRed(e) && cortes < 2) { cortes++; turno.partes.length = pasosAntes; turno.partes.push({ tipo: 'paso', txt: `Se ha cortado la conexión con Google: lo intento otra vez${cortes > 1 ? ` (${cortes}.ª)` : ''}` }); alCambiar(); await dormir(1500 * cortes, signal); vuelta--; continue; }
      if (esCorteRed(e) && saltar('no contesta')) { cortes = 0; vuelta--; continue; }
      if (esCorteRed(e)) { const t = new Error(`Se ha cortado la conexión con Google tres veces seguidas (${e.message}). Mira tu conexión y vuelve a preguntar.`); t.corte = true; throw t; }
      if (e.estado === 400 && conPensar && /thinking/i.test(e.msg || '')) { conPensar = false; vuelta--; continue; }
      if (e.estado === 404 && (pedido || modelo !== cfg.modelo) && saltar('no está disponible con tu clave')) { vuelta--; continue; }
      if (e.estado === 404 && !pedido && !cambiado && modelo === cfg.modelo) { const nuevo = await mejorFlash(clave); if (nuevo && nuevo !== cfg.modelo) { guardarCfgAsesor({ modelo: nuevo }); cfg = cfgAsesor(); modelo = nuevo; AS.modeloVivo = nuevo; probados.add(nuevo); cambiado = true; vuelta--; continue; } }
      if (e.estado === 429 && e.diario) { marcarAgotado(modelo); if (saltar('ha gastado su cupo de hoy')) { vuelta--; continue; } }
      if (e.estado === 429 && reintentos >= 3 && saltar('sigue pidiendo esperar')) { vuelta--; continue; }
      if (e.estado === 429 && reintentos < 3 && !(e.espera > 60)) { reintentos++; const seg = Math.ceil(e.espera || 15 * reintentos); turno.partes.push({ tipo: 'paso', txt: `Google pide esperar ${seg} s (límite gratuito por minuto)` }); alCambiar(); await dormir(seg * 1000, signal); vuelta--; continue; }
      if (e.estado >= 500 && reintentos < 2) { reintentos++; const seg = 4 * reintentos; turno.partes.push({ tipo: 'paso', txt: `${MODELOS[modelo] ? MODELOS[modelo].n : 'Gemini'} está saturado: lo intento otra vez en ${seg} s` }); alCambiar(); await dormir(seg * 1000, signal); vuelta--; continue; }
      if (e.estado >= 500 && saltar('está saturado')) { vuelta--; continue; }
      if (e.estado === 429 && e.diario) e.message = 'Tu clave gratis de Google ha gastado hoy el cupo de sus modelos. Se renueva hacia las 9:00 de la mañana. Es el cupo de tu clave, no de GrowFolio: cada uno usa la suya.';
      throw e;
    }
    const pm = MODELOS[modelo] || {};
    if (pm.in) turno.coste = (turno.coste || 0) + ((r.uso.promptTokenCount || 0) * pm.in + ((r.uso.candidatesTokenCount || 0) + (r.uso.thoughtsTokenCount || 0)) * pm.out) / 1e6;
    if (r.bloqueo) throw new Error('Google ha bloqueado la pregunta por sus filtros. Prueba a decirlo de otra forma.');
    if (!r.contenido.length) {
      if (reintentos < 2) { reintentos++; vuelta--; continue; }
      throw new Error('Google no ha devuelto respuesta. Vuelve a preguntar.');
    }
    contents.push({ role: 'model', parts: r.contenido });
    const llamadas = r.contenido.filter((p) => p.functionCall);
    if (llamadas.length) {
      const respuestas = [];
      for (const pt of llamadas) {
        const fc = pt.functionCall;
        // 0.7: una búsqueda en internet por pregunta como mucho (cada una gasta del cupo de su clave); para lo demás,
        // las fichas de GrowIA y los titulares que ya tiene
        const out = fc.name === 'buscar_en_internet' ? (busquedas++ ? { error: 'Ya has buscado en internet una vez en esta pregunta: contesta con lo que tienes (la búsqueda, las fichas de GrowIA y los titulares de los datos) y di qué no has podido comprobar.' } : await buscarGoogle(fc.args && fc.args.consulta, turno, signal)) : ejecutarHerramienta(fc.name, fc.args || {});
        respuestas.push({ functionResponse: { name: fc.name, ...(fc.id ? { id: fc.id } : {}), response: out && typeof out === 'object' && !Array.isArray(out) ? out : { resultado: out } } });
      }
      contents.push({ role: 'user', parts: respuestas });
      alCambiar();
      continue;
    }
    turno.modelo = modelo;
    if (r.fin === 'MAX_TOKENS') turno.partes.push({ tipo: 'paso', txt: 'La respuesta se ha cortado por larga. Pídele que siga.' });
    else if (/SAFETY|RECITATION|PROHIBITED|BLOCKLIST/.test(r.fin || '')) turno.partes.push({ tipo: 'paso', txt: 'Google ha cortado la respuesta por sus filtros.' });
    break;
  }
  return contents;
}
const sistemaAsesor = () => [{ type: 'text', text: instruccionesAsesor() }, { type: 'text', text: AS.foto }];
function refrescarFoto(forzar) {
  if (forzar || !AS.foto || Date.now() - AS.fotoT > 10 * 60000) { S.M = S.M || calcular(); AS.foto = contextoAsesor(S.M); AS.fotoT = Date.now(); AS.fotoFichas = S.fichasId; }
}

async function preguntarAsesor(texto) {
  texto = String(texto || '').trim();
  if (!texto || AS.cargando) return;
  if (!AS.clave) { AS.vista = 'clave'; pintarAsesor(); return; }
  // 0.7: las fichas de GrowIA van en la foto: si no están, se bajan antes (y si llegan nuevas, la foto se rehace)
  if (!S.fichas || S.fichasId !== ((S.precios && S.precios.fichas_id) || '')) await cargarFichas().catch(() => null);
  refrescarFoto(!AS.api.length || AS.fotoFichas !== S.fichasId);
  const turno = { rol: 'ia', partes: [], citas: [], resultados: [], t: Date.now() };
  const adj = AS.adjunto; AS.adjunto = null; pintarAdjunto();
  const textoApi = adj ? `${texto}\n\n[Te mando un recorte de la pantalla de GrowFolio, de ${adj.donde}. ${adj.img ? 'Va en la imagen. ' : ''}El texto que se lee en esa zona es: «${adj.texto || 'sin texto'}». Respóndeme sobre lo que se ve ahí, con mis datos y tus herramientas si hace falta, y explica lo que haga falta para entenderlo.]` : texto;
  const contenido = adj && adj.img ? [{ inlineData: { mimeType: 'image/jpeg', data: adj.img.split(',')[1] } }, { text: textoApi }] : textoApi;
  AS.conv.push({ rol: 'yo', texto, mini: adj && adj.mini, donde: adj && adj.donde, adj: adj || undefined }, turno);
  AS.cargando = true; AS.ctrl = new AbortController();
  pintarAsesor(true);
  let marco = 0;
  const alCambiar = () => { if (!marco) marco = requestAnimationFrame(() => { marco = 0; pintarTurno(AS.conv.length - 1); }); };
  try {
    await conversar({ mensajes: [...AS.api, { role: 'user', content: contenido }], turno, sistema: [].concat(sistemaAsesor()).map((x) => (typeof x === 'string' ? { text: x } : x)).concat(IDIOMA === 'en' ? [{ text: notaIdiomaIA() }] : []), alCambiar, signal: AS.ctrl.signal });
  } catch (e) {
    turno.error = e.name === 'AbortError' ? 'Parado.' : !e.corte && /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? `No hay conexión con ${PROV[cfgAsesor().prov].n}. Mira tu conexión y vuelve a probar.` : e.message;
  }
  AS.cargando = false; AS.ctrl = null;
  const final = turno.partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join('\n\n').trim();
  if (final) { AS.api.push({ role: 'user', content: textoApi }, { role: 'assistant', content: final }); AS.api = AS.api.slice(-24); }
  AS.gasto += turno.coste || 0;
  guardarConv();
  pintarAsesor();
}

