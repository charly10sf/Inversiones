/* =========================== 0.4: la peor caída de la cartera =========================== */
/* Con lo que tienes hoy, hacia atrás (hasta 10 años): la mayor caída desde un máximo, cuánto duró y cuánto tardó en
   volver a donde estaba; y a cuánto está ahora de su máximo. La gráfica es la distancia al máximo de cada día */
function caidaDetalle(serie) {
  if (!serie || serie.length < 30) return null;
  let pico = 0, peor = null;
  const dd = [];
  for (let i = 0; i < serie.length; i++) {
    if (serie[i].v > serie[pico].v) pico = i;
    const x = (serie[i].v / serie[pico].v - 1) * 100;
    dd.push({ d: serie[i].d, v: x });
    if (!peor || x < peor.pct) peor = { pct: x, pico, valle: i };
  }
  if (!peor || peor.pct > -0.5) return { dd, peor: null, ahora: dd[dd.length - 1].v, maximo: serie[pico].d };
  let rec = null;
  for (let i = peor.valle + 1; i < serie.length; i++) if (serie[i].v >= serie[peor.pico].v) { rec = i; break; }
  return { dd, peor: { pct: peor.pct, desde: serie[peor.pico].d, hasta: serie[peor.valle].d, vuelve: rec != null ? serie[rec].d : null }, ahora: dd[dd.length - 1].v, maximo: serie[pico].d, inicio: serie[0].d };
}
const fechaConAnio = (d) => `${fechaCortaL(d)}${d.slice(0, 4) !== hoyIso().slice(0, 4) ? ` ${d.slice(0, 4)}` : ''}`;
function htmlCaida(M) {
  const c = caidaDetalle(serieCartera(M, 3650));
  if (!c) return '';
  const p = c.peor, dias = (a, b) => Math.round((tiempoDe(b) - tiempoDe(a)) / 864e5);
  const anios = dias(c.inicio || c.dd[0].d, hoyIso()) / 365;
  const frase = p
    ? L(`Con lo que tienes hoy, la peor caída de los últimos ${anios >= 1.5 ? `${fmtNum(anios, 0)} años` : duracion(anios * 365)} habría sido del <b class="down">${pctS(p.pct, 1)}</b>: del ${fechaConAnio(p.desde)} al ${fechaConAnio(p.hasta)}, en ${duracion(dias(p.desde, p.hasta))}. ${p.vuelve ? `Tardó ${duracion(dias(p.hasta, p.vuelve))} en volver a donde estaba (el ${fechaConAnio(p.vuelve)}).` : 'Todavía no ha vuelto a donde estaba.'}`, `With what you hold today, the worst drop of the last ${anios >= 1.5 ? `${fmtNum(anios, 0)} years` : `${Math.round(anios * 12)} months`} would have been <b class="down">${pctS(p.pct, 1)}</b>: from ${fechaConAnio(p.desde)} to ${fechaConAnio(p.hasta)}. ${p.vuelve ? `It took until ${fechaConAnio(p.vuelve)} to get back.` : "It hasn't got back yet."}`)
    : L('Con lo que tienes hoy, no ha tenido caídas que contar.', 'With what you hold today, there have been no drops worth mentioning.');
  const ahora = c.ahora > -0.3 ? L('Ahora está en máximos.', "It's at its high now.") : L(`Ahora está un <b>${pct(-c.ahora, 1)}</b> por debajo de su máximo, del ${fechaConAnio(c.maximo)}.`, `It's now <b>${pct(-c.ahora, 1)}</b> below its high of ${fechaConAnio(c.maximo)}.`);
  return `<div class="caida-w"><h3 class="caida-t">${L('Tu peor caída', 'Your worst drop')}</h3><p class="caida-txt">${frase} ${ahora}</p><div class="chart" id="grafCaida"></div><p class="nota">${L('Cada día, lo lejos que estaba tu cartera de su máximo hasta entonces. Es una simulación con tus posiciones de hoy: no cuenta cuándo compraste ni vendiste.', 'Each day, how far your portfolio was from its high up to then. A simulation with your holdings of today: it ignores when you bought or sold.')}</p></div>`;
}
function dibujarCaida(el, M) {
  const c = caidaDetalle(serieCartera(M, 3650));
  if (!c) return;
  grafLinea(el, c.dd, { alto: innerWidth < 560 ? 150 : 190, color: 'var(--down)', rellenoA: 0, sinRef: true, titulo: L('Distancia al máximo', 'Distance from the high'), fmt: (v) => pctS(v, 1), ejeFmt: (t) => `${fmtNum(t, 0)} %`, marca: c.peor ? { d: c.peor.hasta, txt: pctS(c.peor.pct, 1) } : null });
}

function htmlNumeros(M) {
  const serie = serieCartera(M, 366), vol = volatilidadSerie(serie), cr = claseRiesgo(vol);
  const conTer = M.filas.filter((f) => f.inst.ter != null), costeAnual = sum(conTer, (f) => (f.valor * f.inst.ter) / 100), baseTer = sum(conTer, (f) => f.valor);
  const rent1a = (() => { const v = serie.length > 1 ? (serie[serie.length - 1].v / serie[0].v - 1) * 100 : null; return v; })();
  return `<div class="resumen-fila">
      ${rent1a != null ? `<div><span class="k">Tu cartera, último año</span><span class="v ${cls(rent1a)}">${pctS(rent1a, 1)}</span><small class="k">con tus posiciones de hoy</small></div>` : ''}
      ${cr ? `<div><span class="k">Riesgo</span><span class="v">${cr} de 7</span><small class="k">volatilidad ${pct(vol, 1)}, peor caída ${pct(caidaMaxima(serie), 1)}</small></div>` : ''}
      <div><span class="k">Gastos de fondos</span><span class="v">${eur(costeAnual, 0)} al año</span><small class="k">comisión media del ${pct(baseTer ? (costeAnual / baseTer) * 100 : 0, 2)}</small></div>
      <button type="button" class="rf-btn" data-accion="ver-div12"><span class="k">Dividendos</span><span class="v">${eur(M.dividendos, 0)} al año</span><small class="k">brutos, con el precio de hoy; ${L('mes a mes', 'month by month')} ›</small></button>
    </div>
    ${htmlMapaCartera(M)}
    ${htmlRentReal(M)}
    ${htmlDividendos12(M)}
    <div class="num-secs">${NUMEROS.map((k) => `<details class="num-sec" id="num-${k}"${S.numAbierto === k ? ' open' : ''}><summary><span><b>${NUM_T[k][0]}</b><small>${NUM_T[k][1]}</small></span></summary><div class="num-cuerpo">${cuerpoNum(k, M)}</div></details>`).join('')}</div>`;
}
function vistaAnalisis(M) {
  if (NUMEROS.includes(S.califTab)) { S.numAbierto = S.califTab; S.califTab = 'numeros'; }
  if (!ANALISIS_P.some(([k]) => k === S.califTab)) S.califTab = 'ia';
  const cuerpo = S.califTab === 'ia' ? htmlAnalisisIA(M) : htmlNumeros(M);
  return `
  <div class="vista-cab"><h1>Análisis</h1><p>Lo que opina GrowIA de tu cartera, tus números (rentabilidad, riesgo, costes y qué hay por dentro) y si va hacia lo que quieres.</p></div>
  <div class="subvistas dos-op" role="group" aria-label="Qué ver">${ANALISIS_P.map(([k, t]) => `<button data-calif="${k}" aria-pressed="${S.califTab === k}">${k === 'ia' ? `<span data-no-trad>${conIA('GrowIA opina', "GrowIA's view")}</span>` : t}</button>`).join('')}</div>
  ${cuerpo}
  <div class="ana-obj">${perfilVacio() ? '' : htmlComoVas(M)}${htmlObjetivosVs(M)}</div>
`;
}

