/* =========================== 0.9 · Las pestañas nuevas del rediseño (trozo «avanzado») ===========================
   De las 12 propuestas del 7 nov (claude/sesion-pestanas-competencia.md): la prueba de estrés con crisis reales, tu semana
   y tus cobros, y el efecto divisa. Van en este trozo porque usan sus cálculos (PAB_CRISIS, pabCrisis, pavRiesgoBase…).
   El mismo dato, dos profundidades: en básico, una cifra y una frase; en avanzado, además, la tabla y cómo se calcula.
   Toisón informa y calcula: nada de «compra» ni «vende», y ninguna de estas cifras es una previsión. */

/* ---------- Prueba de estrés ---------- */
// La burbuja puntocom no cabe en los 10 años de precios que guarda la app: va con lo que cayó cada tipo de inversión, en
// euros. Bolsa mundial (MSCI World): −54 % en 31 meses, y no volvió a su máximo de septiembre de 2000 hasta noviembre de
// 2013 (Finanztip y Stiftung Warentest, mirado el 11 nov 2026). La renta fija y el oro no cayeron en ese periodo: 0.
const ES_PUNTOCOM = { t: 'Burbuja puntocom', en: 'Dot-com bubble', c: ['2000 a 2003', '2000 to 2003'], ini: '2000-03-27', fin: '2003-03-12', cl: { rv: -54, rf: 0, oro: 0, mp: 0, cripto: -70 } };
// lo que se sabe de cada una, en una frase y dos datos (la bolsa mundial en euros; fuentes en «Cómo se calcula»)
const ES_DATOS = {
  '2000-03-27': { que: ['Las empresas de internet habían subido sin ganar dinero y se desinflaron durante casi tres años. La bolsa mundial perdió más de la mitad.', 'Internet companies had soared without earning money and deflated for almost three years. World stocks lost more than half.'], dura: ['31 meses cayendo', '31 months falling'], vuelve: ['La bolsa mundial no volvió a su máximo hasta noviembre de 2013', 'World stocks did not regain their high until November 2013'] },
  '2007-10-09': { que: ['Las hipotecas basura de Estados Unidos tumbaron bancos en medio mundo. La bolsa mundial perdió la mitad en año y medio.', 'US subprime mortgages brought down banks around the world. World stocks lost half in a year and a half.'], dura: ['16 meses cayendo', '16 months falling'], vuelve: ['Enlazó con la puntocom: el máximo de 2000 no se recuperó hasta 2013', 'It followed the dot-com crash: the 2000 high was not regained until 2013'] },
  '2020-02-19': { que: ['El confinamiento paró la economía de golpe. La bolsa mundial cayó un tercio en cinco semanas y se recuperó ese mismo año.', 'Lockdowns stopped the economy overnight. World stocks fell a third in five weeks and recovered that same year.'], dura: ['5 semanas cayendo', '5 weeks falling'], vuelve: ['Recuperada en 2020', 'Recovered in 2020'] },
  '2022-01-03': { que: ['La inflación obligó a subir los tipos de interés y cayeron a la vez la bolsa y la renta fija, que casi nunca pasa.', 'Inflation forced interest rates up and stocks and bonds fell together, which almost never happens.'], dura: ['9 meses cayendo', '9 months falling'], vuelve: ['Recuperada en 2023', 'Recovered in 2023'] },
};
const esCrisis = () => [ES_PUNTOCOM, ...PAB_CRISIS];
const ES_MEDIDA = [10, 20, 30, 40, 50];
function esEstado() { const e = S.estres || (S.estres = { k: 1, pct: 30 }); if (e.k !== 'm' && !(e.k >= 0 && e.k < esCrisis().length)) e.k = 1; return e; }
// lo que cae cada posición en una crisis: con sus precios de entonces si los hay; si no, lo de su tipo de inversión
function estresFilas(M, x) {
  const filas = [];
  for (const f of M.filas) {
    if (!(f.valor > 0)) continue;
    const h = histDe(f.inst.id);
    let pc = null, real = false;
    if (h && h.length && h[0][0] <= x.ini) {
      const p0 = precioEn(h, x.ini, 'antes');
      if (p0) { let min = p0; for (const [d, v] of h) { if (d > x.fin) break; if (d >= x.ini && v != null && v < min) min = v; } pc = (min / p0 - 1) * 100; real = true; }
    }
    const k = pabClase(f);
    if (pc == null) pc = k ? x.cl[k] : 0;
    filas.push({ f, pc, real, cambio: (f.valor * pc) / 100, clase: k });
  }
  return filas.sort((a, b) => a.cambio - b.cambio);
}
// a tu medida: la parte de bolsa cae lo que digas; lo demás se queda como está
function estresMedida(M, pct) {
  return M.filas.filter((f) => f.valor > 0).map((f) => { const k = pabClase(f), pc = k === 'rv' ? -pct : 0; return { f, pc, real: false, cambio: (f.valor * pc) / 100, clase: k }; }).sort((a, b) => a.cambio - b.cambio);
}
function estresCalc(M) {
  const E = esEstado(), medida = E.k === 'm', x = medida ? null : esCrisis()[E.k];
  const filas = medida ? estresMedida(M, E.pct) : estresFilas(M, x);
  const cambio = sum(filas, (r) => r.cambio), pct = M.total ? (cambio / M.total) * 100 : 0;
  const reales = sum(filas.filter((r) => r.real), (r) => r.f.valor);
  return { E, medida, x, filas, cambio, pct, queda: M.total + cambio, reales, pctReal: M.total ? (reales / M.total) * 100 : 0 };
}
const esSeg = (E) => `<div class="seg2 es-seg" role="group" aria-label="${L('Qué crisis', 'Which crisis')}">${esCrisis().map((c, i) => `<button type="button" data-estres="${i}" aria-pressed="${E.k === i}">${L(c.t, c.en)}</button>`).join('')}<button type="button" data-estres="m" aria-pressed="${E.k === 'm'}">${L('A tu medida', 'Your own')}</button></div>`;
function esCifra(R) {
  const n = Math.round(R.cambio);
  return `<div class="es-cifra"><span class="rotulo">${R.medida ? L(`Si la bolsa cayera un ${R.E.pct} %`, `If stocks fell ${R.E.pct}%`) : L(`${R.x.t} · ${R.x.c[0]}`, `${R.x.en} · ${R.x.c[1]}`)}</span>
    <b class="cifra-xl ${n < 0 ? 'down' : ''}"><span class="cifra-cuenta" data-n="${n}" data-suf=" €">${eurS(R.cambio, 0)}</span></b>
    <div class="cifra-datos"><div><small>${L('De tu cartera', 'Of your portfolio')}</small><b class="${R.pct < 0 ? 'down' : ''}">${pctS(R.pct, 1)}</b></div><div><small>${L('Te quedaría', 'You would be left with')}</small><b>${eur(R.queda, 0)}</b></div><div><small>${L('Hoy tienes', 'Today you have')}</small><b>${eur(S.M ? S.M.total : R.queda - R.cambio, 0)}</b></div></div></div>`;
}
function esFrase(R) {
  if (R.medida) return `<p class="frase">${L(`Solo cae la parte de bolsa de tu cartera; la renta fija, el oro, la cripto y el efectivo se quedan como están. Sirve para ver cuánto depende tu cartera de la bolsa.`, `Only the stock part of your portfolio falls; bonds, gold, crypto and cash stay as they are. It shows how much your portfolio depends on stocks.`)}</p>`;
  const d = ES_DATOS[R.x.ini];
  return `<p class="frase">${L(d.que[0], d.que[1])}</p><div class="es-hechos"><span>${L(d.dura[0], d.dura[1])}</span><span>${L(d.vuelve[0], d.vuelve[1])}</span></div>`;
}
const esMedidaSeg = (E) => `<div class="es-medida"><span class="rotulo">${L('Cuánto cae la bolsa', 'How far stocks fall')}</span><div class="seg2" role="group" aria-label="${L('Cuánto cae la bolsa', 'How far stocks fall')}">${ES_MEDIDA.map((p) => `<button type="button" data-estres-pct="${p}" aria-pressed="${E.pct === p}">−${p} %</button>`).join('')}</div></div>`;
const ES_FUENTE = () => L('Con los precios de entonces de lo que tienes cuando la app los guarda (hasta 10 años atrás); si no, con lo que cayó su tipo de inversión, en euros: la bolsa mundial, la renta fija, el oro o las materias primas. La cripto no existía en 2000 ni en 2008: cuenta como en 2022. La bolsa mundial es el índice MSCI World en euros: −54 % en la puntocom y cerca de −50 % en la crisis financiera (Finanztip da −54 % y −48 %); el máximo de 2000 no se recuperó hasta noviembre de 2013 (Stiftung Warentest). No es una previsión: la próxima crisis será distinta.', 'With the prices back then of what you hold when the app has them (up to 10 years back); otherwise with what its kind of investment fell, in euros. Crypto did not exist in 2000 or 2008: it counts as in 2022. World stocks are the MSCI World index in euros. Not a forecast: the next crisis will be different.');
function pavEstres(M) {
  const R = estresCalc(M), bas = modoApp() === 'basico';
  const max = Math.max(1, ...R.filas.map((r) => Math.abs(r.cambio)));
  const cab = `${esSeg(R.E)}${R.medida ? esMedidaSeg(R.E) : ''}<div class="es-hero">${esCifra(R)}<div class="es-txt">${esFrase(R)}</div></div>`;
  const porPos = R.filas.map((r) => `<div class="pav-fila es-fila"><span title="${pavNom(r.f)}">${pavNom(r.f)}${r.real ? '' : `<i class="es-tipo" title="${L('Con la caída de su tipo de inversión', 'With the drop of its kind of investment')}">${L('por su tipo', 'by its kind')}</i>`}</span><span class="pav-pista"><i style="right:0;left:auto;width:${Math.max(r.cambio ? 0.8 : 0, (Math.abs(r.cambio) / max) * 100).toFixed(1)}%;background:var(--baja)"></i></span><span class="${r.cambio < 0 ? 'down' : ''}">${eurS(r.cambio, 0)} <small>${pctS(r.pc, 0)}</small></span></div>`).join('');
  if (bas) {
    return [
      `<section class="pav-t pab pav-c12 es-t"><h2 class="pab-cab">${L('Si pasara otra vez', 'If it happened again')}</h2>${cab}<p class="pab-que"><b>${L('¿Qué es?', 'What is it?')}</b> ${L('Lo que habría bajado tu cartera de hoy en una crisis de verdad, en su peor momento. No es dinero perdido si no vendes: las cuatro se recuperaron, unas en meses y otras en años.', 'What your portfolio of today would have dropped in a real crisis, at its worst point. It is not money lost unless you sell: all four recovered, some in months and some in years.')}</p></section>`,
      pabT('c8', L('Qué caería más', 'What would fall most'), `<div class="es-lista">${porPos}</div>`, L('Cada inversión con lo que cayó entonces. «Por su tipo» quiere decir que no hay precios suyos de esas fechas y se usa lo que cayó su clase (la bolsa, la renta fija, el oro…).', 'Each investment with what it fell back then. "By its kind" means there are no prices of its own for those dates.')),
      pabPreguntas([L('¿Qué hago si mi cartera cae así?', 'What do I do if my portfolio falls like that?'), L('¿Cuánto tardó en recuperarse cada crisis?', 'How long did each crisis take to recover?'), L('¿Por qué mi cartera cae menos que la bolsa?', 'Why does my portfolio fall less than the market?')], 'c4'),
    ].join('');
  }
  const todas = esCrisis().map((c) => { const fs = estresFilas(M, c), ch = sum(fs, (r) => r.cambio); return [`<b>${L(c.t, c.en)}</b><small>${L(c.c[0], c.c[1])}</small>`, eurS(ch, 0), pctS(M.total ? (ch / M.total) * 100 : 0, 1), pctS(c.cl.rv, 0), pctS(c.cl.rf, 0), pctS(c.cl.oro, 0), `${fmtNum(M.total ? (sum(fs.filter((r) => r.real), (r) => r.f.valor) / M.total) * 100 : 0, 0)} %`]; });
  const B = pavRiesgoBase(M), c10 = B && B.c10 && B.c10.peor;
  return [
    `<section class="pav-t pav-c12 es-t"><div class="pav-et"><h2>${L('Prueba de estrés', 'Stress test')}</h2></div>${cab}<p class="pav-como"><b>${L('Cómo se calcula', 'How it is worked out')} ·</b> ${ES_FUENTE()}</p></section>`,
    pavT('c7', L('Posición a posición', 'Holding by holding'), `<div class="es-lista">${porPos}</div>`, R.medida ? L('Solo cae la renta variable.', 'Only stocks fall.') : L(`Con precios reales de esas fechas: el ${fmtNum(R.pctReal, 0)} % de tu cartera. El resto, con la caída de su tipo de inversión.`, `With real prices from those dates: ${fmtNum(R.pctReal, 0)}% of your portfolio.`)),
    pavT('c5', L('Tu peor caída de verdad', 'Your real worst drop'), c10 ? pavKpis([
      [L('La peor de los últimos 10 años', 'The worst in the last 10 years'), pctS(c10.pct, 1), 'down', L(`del ${fechaConAnio(c10.desde)} al ${fechaConAnio(c10.hasta)}`, `${c10.desde} to ${c10.hasta}`)],
      [L('En euros de hoy', 'In today\'s euros'), eurS(B.enSerie * c10.pct / 100, 0), 'down'],
      [L('Volvió a su máximo', 'Back at its high'), c10.vuelve ? fechaConAnio(c10.vuelve) : L('Todavía no', 'Not yet')],
    ], 1) : `<p class="nota" style="margin:0">${L('Faltan precios para calcularla.', 'Prices are missing.')}</p>`, L('Con tus posiciones de hoy recompuestas hacia atrás. La gráfica entera, en Riesgo.', 'With today\'s holdings recomposed backwards. The full chart is in Risk.'), pavIr('#av-riesgo', L('Ver Riesgo', 'See Risk'))),
    pavT('c12', L('Las cuatro, lado a lado', 'All four, side by side'), pavTabla([L('Crisis', 'Crisis'), L('Tu cartera', 'Your portfolio'), '%', L('Bolsa', 'Stocks'), L('Renta fija', 'Bonds'), L('Oro', 'Gold'), L('Con precios reales', 'With real prices')], todas), L('Bolsa, Renta fija y Oro: lo que cayó cada tipo de inversión en euros, que es lo que se usa cuando no hay precios de lo tuyo de esas fechas.', 'Stocks, Bonds and Gold: what each kind of investment fell in euros, used when there are no prices of your own for those dates.')),
  ].join('');
}

/* ---------- Tu semana y tus cobros ---------- */
const SEM_TIPO = { resultados: ['Resultados', 'Earnings'], dividendo: ['Dividendo', 'Dividend'], cobro: ['Cobro', 'Payment'], aportacion: ['Aportación', 'Contribution'], fondo: ['Dentro de tus fondos', 'Inside your funds'], hacienda: ['Hacienda', 'Taxes'], festivo: ['Bolsa cerrada', 'Market closed'], media: ['Media sesión', 'Half day'], banco: ['Bancos centrales', 'Central banks'] };
function semanaCalc(M) {
  const hoy = hoyIso(), ev = agendaLista(M, 60).filter((e) => e.tipo !== 'otro' && e.tipo !== 'fiesta' && e.tipo !== 'ia');
  const fin7 = iso(new Date(Date.now() + 7 * 86400000));
  const semana = ev.filter((e) => e.d <= fin7);
  const cobros = ev.filter((e) => (e.tipo === 'dividendo' || e.tipo === 'cobro') && e.importe > 0);
  const bruto = sum(cobros, (e) => e.importe), ret = retencionCobros();
  // lo que se movió cada posición en los últimos 7 días, con sus cierres
  const desde = diasAtras(7), mov = [];
  for (const f of M.filas) {
    if (!(f.valor > 0)) continue;
    const h = histDe(f.inst.id); if (!h || h.length < 2) continue;
    const p0 = precioEn(h, desde, 'antes'), p1 = h[h.length - 1][1];
    if (!p0 || !p1) continue;
    const pc = (p1 / p0 - 1) * 100; mov.push({ f, pc, eur: f.valor - f.valor / (1 + pc / 100) });
  }
  mov.sort((a, b) => b.eur - a.eur);
  const cambio = sum(mov, (m) => m.eur), base = sum(mov, (m) => m.f.valor) - cambio;
  return { hoy, semana, cobros, bruto, neto: bruto * (1 - ret / 100), ret, mov, cambio, pct: base > 0 ? (cambio / base) * 100 : 0 };
}
// la retención española sobre dividendos e intereses (19 %): la misma que usa Dividendos
function retencionCobros() { return 19; }
const semDia = (d) => { const x = deIso(d), n = diasEntre(hoyIso(), d); return `<span class="sm-dia${n <= 1 ? ' pronto' : ''}"><b>${x.getDate()}</b><small>${L(MESES[x.getMonth()], MESES_EN[x.getMonth()].slice(0, 3))}</small></span>`; };
const semCuando = (d) => { const n = diasEntre(hoyIso(), d); return n <= 0 ? L('hoy', 'today') : n === 1 ? L('mañana', 'tomorrow') : n <= 6 ? L(DIAS_SEM_L[deIso(d).getDay()], `in ${n} days`) : n < 14 ? L(`en ${n} días`, `in ${n} days`) : L(`en ${Math.round(n / 7)} semanas`, `in ${Math.round(n / 7)} weeks`); };
const DIAS_SEM_L = ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'];
const semFila = (e) => `<li class="sm-ev">${semDia(e.d)}<div><b>${tituloAg(e)}</b><small>${[e.tipo === 'fondo' || e.tipo === 'dividendo' ? '' : esc((SEM_TIPO[e.tipo] || ['', ''])[IDIOMA === 'en' ? 1 : 0]), e.s ? esc(e.s) : '', semCuando(e.d)].filter(Boolean).join(' · ')}</small></div>${e.importe != null && isFinite(e.importe) ? `<span class="sm-imp${e.tipo === 'aportacion' ? '' : ' up'}">${e.tipo === 'aportacion' ? '' : '+'}${e.aprox ? '≈ ' : ''}${eur(e.importe, e.importe < 10 ? 2 : 0)}</span>` : ''}</li>`;
function pavSemana(M) {
  const R = semanaCalc(M), bas = modoApp() === 'basico';
  const n = R.semana.length;
  const hero = `<div class="es-hero"><div class="es-cifra"><span class="rotulo">${L('Dividendos previstos en 60 días', 'Dividends expected in 60 days')}</span>
      <b class="cifra-xl"><span class="cifra-cuenta" data-n="${Math.round(R.bruto)}" data-suf=" €">${eur(R.bruto, 0)}</span></b>
      <div class="cifra-datos"><div><small>${L('Netos, tras la retención', 'Net, after withholding')}</small><b>${eur(R.neto, 0)}</b></div><div><small>${L('Dividendos', 'Dividends')}</small><b>${R.cobros.length}</b></div><div><small>${L('Tu cartera, en 7 días', 'Your portfolio, in 7 days')}</small><b class="${cls(R.cambio)}">${eurS(R.cambio, 0)}</b></div></div></div>
    <div class="es-txt"><p class="frase">${n ? L(`Esta semana hay <b>${n} ${n === 1 ? 'cosa' : 'cosas'}</b> que te ${n === 1 ? 'toca' : 'tocan'}: ${yLista(R.semana.slice(0, 3).map((e) => tituloAg(e)))}${n > 3 ? L(` y ${n - 3} más`, ` and ${n - 3} more`) : ''}.`, `This week there ${n === 1 ? 'is' : 'are'} <b>${n}</b> thing${n === 1 ? '' : 's'} that concern${n === 1 ? 's' : ''} you.`) : L('Esta semana no hay nada apuntado que toque a lo tuyo.', 'Nothing that concerns your holdings this week.')}</p></div></div>`;
  const lista = n ? `<ul class="sm-lista">${R.semana.map(semFila).join('')}</ul>` : `<p class="nota" style="margin:0">${L('Semana tranquila: ni resultados, ni cobros, ni aportaciones.', 'A quiet week: no earnings, payments or contributions.')}</p>`;
  const cobros = R.cobros.length ? `<ul class="sm-lista">${R.cobros.map(semFila).join('')}</ul>` : `<p class="nota" style="margin:0">${L('Sin dividendos previstos en los próximos 60 días.', 'No dividends expected in the next 60 days.')}</p>`;
  const max = Math.max(1, ...R.mov.map((m) => Math.abs(m.eur)));
  const movs = R.mov.length ? R.mov.map((m) => pavDos(m.f.inst.corto || m.f.inst.nombre, m.eur, max).replace('</span></div>', ` <small>${pctS(m.pc, 1)}</small></span></div>`)).join('') : `<p class="nota" style="margin:0">${L('Faltan precios de la última semana.', 'Last week\'s prices are missing.')}</p>`;
  const comoCobros = L(`La fecha que sale es la de corte: hay que tener la acción el día antes, y el dinero llega unos días o semanas después. El importe, con el último dividendo de cada empresa sobre lo que tienes hoy. La retención española es del ${R.ret} %; si la empresa es de fuera, su país puede retener antes. Ni prometido ni seguro: lo decide cada empresa.`, `With the announced ex-date and each company's last dividend on what you hold today. Spanish withholding is ${R.ret}%. Neither promised nor certain.`);
  if (bas) {
    return [
      `<section class="pav-t pab pav-c12 es-t"><h2 class="pab-cab">${L('Tu semana', 'Your week')}</h2>${hero}<p class="pab-que"><b>${L('¿Qué es?', 'What is it?')}</b> ${L('Lo que pasa estos días en lo que tienes (resultados de tus empresas, aportaciones, fechas de Hacienda) y el dinero que esperas cobrar en dividendos.', 'What happens these days in what you hold and the money you expect to collect in dividends.')}</p></section>`,
      pabT('c6', L('Estos siete días', 'These seven days'), lista),
      pabT('c6', L('Lo que vas a cobrar', 'What you will collect'), cobros, comoCobros),
    ].join('');
  }
  return [
    `<section class="pav-t pav-c12 es-t"><div class="pav-et"><h2>${L('Tu semana y tus cobros', 'Your week and your payments')}</h2>${pavIr('#agenda', L('Ver el calendario', 'See the calendar'))}</div>${hero}</section>`,
    pavT('c6', L('Estos siete días', 'These seven days'), lista, L('Lo mismo que el Calendario, solo lo de esta semana y solo lo que toca a tus posiciones.', 'Same as the Calendar, only this week and only what concerns your holdings.')),
    pavT('c6', L('Dividendos de los próximos 60 días', 'Dividends in the next 60 days'), cobros, comoCobros),
    pavT('c12', L('Lo que se movió en los últimos 7 días', 'What moved in the last 7 days'), `<div class="cifra-datos" style="margin:0 0 14px"><div><small>${L('Tu cartera', 'Your portfolio')}</small><b class="${cls(R.cambio)}">${eurS(R.cambio, 0)}</b></div><div><small>%</small><b class="${cls(R.pct)}">${pctS(R.pct, 2)}</b></div></div>${movs}`, L('Con los cierres de hace siete días y los últimos, sobre lo que tienes hoy. El efectivo no se mueve.', 'With the closes of seven days ago and the latest ones, on what you hold today.')),
  ].join('');
}

/* ---------- Efecto divisa ---------- */
// qué par de Yahoo mide cada moneda frente al euro y si va al revés (JPY=X es yenes por dólar: no sirve para el euro)
const DV_PAR = { USD: 'EURUSD=X', GBP: 'EURGBP=X' };
const DV_NOM = { USD: ['Dólar', 'US dollar'], GBP: ['Libra', 'Pound'], CHF: ['Franco suizo', 'Swiss franc'], JPY: ['Yen', 'Yen'], OTRAS: ['Otras monedas', 'Other currencies'], EUR: ['Euro', 'Euro'], CRIPTO: ['Cripto', 'Crypto'] };
const dvMoneda = (m) => { const x = String(m || 'EUR'); return x === 'GBp' || x === 'GBX' ? 'GBP' : x.toUpperCase(); };
// cuánto ha subido o bajado una moneda frente al euro en el último año (los pares son «cuánta moneda por un euro»)
function dvCambio(mon) {
  const h = histMercado(DV_PAR[mon]); if (!h || h.length < 2) return null;
  const a = h[0][1], b = h[h.length - 1][1]; if (!a || !b) return null;
  return { pct: (a / b - 1) * 100, desde: h[0][0], hasta: h[h.length - 1][0], a, b, serie: h.filter((x) => x[1]).map(([d, v]) => ({ d, v })) };
}
function divisaCalc(M) {
  const por = new Map(), filas = [];
  const add = (mon, v) => por.set(mon, (por.get(mon) || 0) + v);
  for (const f of M.filas) {
    if (!(f.valor > 0)) continue;
    const mon = dvMoneda(f.p && f.p.moneda), k = pabClase(f);
    if (!k) { add('EUR', f.valor); continue; }   // el efectivo y los monetarios
    if (k === 'cripto') { add('CRIPTO', f.valor); continue; }   // no es la moneda de ningún país: va aparte y sin efecto
    // un fondo o ETF en euros que invierte fuera lleva la divisa por dentro: se mira su reparto por regiones
    // (EEUU → dólar; Global, Emergentes, Japón y Pacífico, Canadá y Otros → varias monedas; Europa → euro)
    const reg = f.inst.region && typeof f.inst.region === 'object' ? f.inst.region : null;
    if (mon === 'EUR' && reg && f.inst.tipo !== 'Acción') {
      const tot = Object.values(reg).reduce((x, y) => x + (+y || 0), 0) || 100;
      const usd = ((+reg.EEUU || 0) / tot) * f.valor, eu = ((+reg.Europa || 0) / tot) * f.valor, otras = f.valor - usd - eu;
      if (eu > 0) add('EUR', eu);
      if (usd > 0.5) { add('USD', usd); filas.push({ f, mon: 'USD', como: 'dentro', v: usd }); }
      if (otras > 0.5) { add('OTRAS', otras); filas.push({ f, mon: 'OTRAS', como: 'dentro', v: otras }); }
      continue;
    }
    // el oro y las materias primas cotizan en dólares en todo el mundo, aunque el ETC se compre en euros
    if (mon === 'EUR' && (f.inst.clase === 'Oro' || f.inst.clase === 'Materias primas')) { add('USD', f.valor); filas.push({ f, mon: 'USD', como: 'dentro', v: f.valor }); continue; }
    add(mon, f.valor);
    if (mon !== 'EUR') filas.push({ f, mon, como: 'directa', v: f.valor });
  }
  // el efectivo no va en las filas: es euro
  const efectivo = M.total - sum(M.filas.filter((f) => f.valor > 0), (f) => f.valor);
  if (efectivo > 0.005) add('EUR', efectivo);
  const mons = [...por.entries()].map(([mon, v]) => { const c = dvCambio(mon); return { mon, v, peso: M.total ? (v / M.total) * 100 : 0, c, efecto: c ? v - v / (1 + c.pct / 100) : null }; }).sort((a, b) => b.v - a.v);
  const conDato = mons.filter((x) => x.efecto != null), efecto = sum(conDato, (x) => x.efecto);
  const fuera = sum(mons.filter((x) => x.mon !== 'EUR' && x.mon !== 'CRIPTO'), (x) => x.v);
  return { mons, filas: filas.sort((a, b) => b.v - a.v), efecto, fuera, pesoFuera: M.total ? (fuera / M.total) * 100 : 0, usd: dvCambio('USD') };
}
const dvNom = (m) => L(...(DV_NOM[m] || [m, m]));
function pavDivisa(M) {
  const R = divisaCalc(M), bas = modoApp() === 'basico', u = R.usd;
  const hero = `<div class="es-hero"><div class="es-cifra"><span class="rotulo">${L('Las divisas, en el último año', 'Currencies, over the last year')}</span>
      <b class="cifra-xl ${cls(R.efecto)}"><span class="cifra-cuenta" data-n="${Math.round(R.efecto)}" data-suf=" €" data-signo="1">≈ ${eurS(R.efecto, 0)}</span></b>
      <div class="cifra-datos"><div><small>${L('Fuera del euro', 'Outside the euro')}</small><b>${pct(R.pesoFuera, 0)}</b></div>${u ? `<div><small>${L('El dólar frente al euro', 'The dollar against the euro')}</small><b class="${cls(u.pct)}">${pctS(u.pct, 1)}</b></div>` : ''}<div><small>${L('En euros', 'In euros')}</small><b>${eur(R.fuera, 0)}</b></div></div></div>
    <div class="es-txt"><p class="frase">${R.fuera > 0 ? L(`El <b>${fmtNum(R.pesoFuera, 0)} %</b> de lo que tienes depende de otras monedas. Cuando el dólar sube frente al euro, eso vale más euros aunque su precio no cambie; cuando baja, al revés.`, `<b>${fmtNum(R.pesoFuera, 0)}%</b> of what you hold depends on other currencies. When the dollar rises against the euro, it is worth more euros even if its price does not change.`) : L('Todo lo que tienes está en euros: las divisas no te afectan.', 'Everything you hold is in euros: currencies do not affect you.')}</p></div></div>`;
  const max = Math.max(1, ...R.mons.map((x) => x.peso));
  const barras = R.mons.map((x, i) => pavFila(dvNom(x.mon), x.peso, max, PAV_COL[i % 6], `${pct(x.peso, 1)}`)).join('');
  const como = L('Aproximado: toma lo que tienes hoy en cada moneda y lo que esa moneda ha cambiado frente al euro en el último año, como si hubieras tenido lo mismo todo el año. Un fondo en euros que invierte en Estados Unidos lleva el dólar por dentro (se mira su reparto por regiones); la parte global, de emergentes y de Asia lleva varias monedas y aquí va junta, sin efecto calculado. El oro cotiza en dólares en todo el mundo. La cripto va aparte: no es la moneda de ningún país.', 'Approximate: it takes what you hold today in each currency and how that currency changed against the euro over the last year, as if you had held the same all year. A euro fund investing in the US carries the dollar inside; global and emerging funds carry several currencies and are not broken down here. Gold is priced in dollars worldwide.');
  if (bas) {
    return [
      `<section class="pav-t pab pav-c12 es-t"><h2 class="pab-cab">${L('Efecto divisa', 'Currency effect')}</h2>${hero}<p class="pab-que"><b>${L('¿Qué es?', 'What is it?')}</b> ${L('Parte de lo que ganas o pierdes no viene de tus inversiones, sino de que su moneda sube o baja frente al euro. Esto es lo que te ha sumado o restado en el último año, más o menos.', 'Part of what you gain or lose does not come from your investments, but from their currency rising or falling against the euro.')}</p></section>`,
      pabT('c6', L('En qué monedas estás', 'Which currencies you are in'), barras, como),
      pabPreguntas([L('¿Me conviene cubrir la divisa?', 'Should I hedge the currency?'), L('¿Por qué mi fondo en euros depende del dólar?', 'Why does my euro fund depend on the dollar?'), L('¿Qué pasa con mi cartera si el dólar baja un 10 %?', 'What happens to my portfolio if the dollar falls 10%?')], 'c6'),
    ].join('');
  }
  const tabla = R.filas.length ? pavTabla([L('Posición', 'Holding'), L('Moneda', 'Currency'), L('Cómo', 'How'), L('Valor', 'Value'), L('Efecto en un año', 'Effect in a year')], R.filas.map((r) => { const c = dvCambio(r.mon); return [`<b>${pavNom(r.f)}</b>`, dvNom(r.mon), r.como === 'directa' ? L('Cotiza en esa moneda', 'Priced in it') : L('Por dentro', 'Inside'), eur(r.v, 0), c ? `<span class="${cls(c.pct)}">≈ ${eurS(r.v - r.v / (1 + c.pct / 100), 0)}</span>` : '—']; })) : `<p class="nota" style="margin:0">${L('Nada fuera del euro.', 'Nothing outside the euro.')}</p>`;
  const porMon = pavTabla([L('Moneda', 'Currency'), L('Lo que tienes', 'What you hold'), L('Peso', 'Weight'), L('Frente al euro, 1 año', 'Against the euro, 1 year'), L('Efecto', 'Effect')], R.mons.map((x) => [`<b>${dvNom(x.mon)}</b>`, eur(x.v, 0), pct(x.peso, 1), x.mon === 'EUR' || x.mon === 'CRIPTO' ? '—' : x.c ? `<span class="${cls(x.c.pct)}">${pctS(x.c.pct, 1)}</span>` : L('sin dato', 'no data'), x.efecto != null ? `<span class="${cls(x.efecto)}">≈ ${eurS(x.efecto, 0)}</span>` : '—']));
  return [
    `<section class="pav-t pav-c12 es-t"><div class="pav-et"><h2>${L('Efecto divisa', 'Currency effect')}</h2></div>${hero}<p class="pav-como"><b>${L('Cómo se calcula', 'How it is worked out')} ·</b> ${como}</p></section>`,
    pavT('c5', L('En qué monedas estás', 'Which currencies you are in'), barras),
    pavT('c7', L('El euro frente al dólar, un año', 'The euro against the dollar, one year'), u ? `<div class="chart" id="dvGraf"></div>` : `<p class="nota" style="margin:0">${L('Faltan precios del cambio.', 'Exchange rate prices are missing.')}</p>`, u ? L(`Dólares por un euro: de ${fmtNum(u.a, 4)} a ${fmtNum(u.b, 4)}. Si la línea baja, el dólar sube y lo que tienes en dólares vale más euros.`, `Dollars per euro: from ${fmtNum(u.a, 4)} to ${fmtNum(u.b, 4)}. If the line falls, the dollar rises.`) : ''),
    pavT('c12', L('Moneda a moneda', 'Currency by currency'), porMon),
    pavT('c12', L('Posición a posición', 'Holding by holding'), tabla),
  ].join('');
}
function dibujarNuevas(p, M) {
  animarCifras($('#panelAv'));
  if (p === 'divisa') { const el = $('#dvGraf'), u = dvCambio('USD'); if (el && u) grafLinea(el, [{ datos: u.serie, color: 'var(--grafica)', nombre: 'EUR/USD' }], { alto: innerWidth < 560 ? 170 : 210, sinRef: true, titulo: L('Dólares por un euro', 'Dollars per euro'), fmt: (v) => fmtNum(v, 4), ejeFmt: (t) => fmtNum(t, 2) }); }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-estres], [data-estres-pct]'); if (!b || !$('#panelAv')) return;
  const E = esEstado();
  if (b.dataset.estresPct) E.pct = +b.dataset.estresPct; else E.k = b.dataset.estres === 'm' ? 'm' : +b.dataset.estres;
  pintarPanelAv();
});
const NUEVAS_CSS = `
.es-seg { margin-bottom: 18px; }
.es-medida { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin: -6px 0 18px; }
.es-hero { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px 40px; align-items: end; }
@media (min-width: 900px) { .es-hero { grid-template-columns: minmax(0, auto) minmax(0, 1fr); } .es-txt { padding-bottom: 6px; } }
.es-cifra .rotulo { display: block; margin-bottom: 10px; }
.es-cifra .cifra-xl.down { color: var(--baja); } .es-cifra .cifra-xl.up { color: var(--sube); }
.es-hechos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.es-hechos span { padding: 7px 12px; border-radius: 999px; background: var(--capa-hueco); box-shadow: inset 0 0 0 1px var(--filo-suave); font: var(--nota-s); color: var(--texto-2); }
.es-lista .pav-fila { grid-template-columns: minmax(110px, 240px) minmax(0, 1fr) minmax(104px, auto); }
.es-fila > span:first-child { display: flex; align-items: baseline; gap: 8px; }
.es-tipo { flex: none; font: 500 11px/1 var(--ui); font-style: normal; color: var(--tenue); }
.es-fila small, .sm-ev small, .pav-fila small { font-weight: 500; color: var(--tenue); }
.pav-tabla td b + small { margin-top: 2px; }
.sm-lista { list-style: none; margin: 0; padding: 0; }
.sm-ev { display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 12px 0; }
.sm-ev + .sm-ev { border-top: 1px solid var(--sep); }
.sm-dia { display: grid; place-items: center; width: 46px; height: 50px; border-radius: 12px; background: var(--capa-hueco); box-shadow: inset 0 0 0 1px var(--filo-suave); }
.sm-dia.pronto { box-shadow: inset 0 0 0 1px var(--hilo); }
.sm-dia b { font: 600 18px/1 var(--ui); font-variant-numeric: tabular-nums; } .sm-dia small { font: 600 9.5px/1 var(--ui); letter-spacing: .1em; text-transform: uppercase; color: var(--oro-texto); }
.sm-ev div b { display: block; font: 600 14.5px/1.3 var(--ui); } .sm-ev div small { display: block; margin-top: 2px; font: 400 12.5px/1.35 var(--ui); }
.sm-imp { font: 600 15px/1 var(--ui); font-variant-numeric: tabular-nums; white-space: nowrap; }
@media (max-width: 560px) { .es-lista .pav-fila { grid-template-columns: minmax(90px, 1fr) 60px auto; } .es-tipo { display: none; } }
`;
