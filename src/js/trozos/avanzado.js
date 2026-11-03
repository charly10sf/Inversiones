/* =========================== 0.9 · las pestañas del modo avanzado (trozo «avanzado») ===========================
   Se baja la primera vez que abres una pestaña que no es el Resumen. Todo con los cálculos que ya tiene la app:
   rentabilidadCartera (TWR y TIR), serieCartera, volatilidadSerie, caidaDetalle, fiscalAnio, lotesDe, reparto,
   empresasPorDentro… Cada tarjeta dice cómo se calcula. Sin «compra» ni «vende»: lo que supondría, y lo decide el
   usuario. Las pestañas que aún no tienen sus datos dicen qué llevarán y dónde está hoy esa información. */
const pavT = (c, titulo, cuerpo, como = '', enlace = '') => `<section class="pav-t pav-${c}"><h2 class="pav-et">${titulo}${enlace}</h2>${cuerpo}${como ? `<p class="pav-como"><b>${L('Cómo se calcula', 'How it is worked out')} ·</b> ${como}</p>` : ''}</section>`;
const pavKpis = (xs, cols = 2) => `<div class="pav-kpis" style="--cols:${cols}">${xs.filter(Boolean).map(([k, v, c = '', s = '']) => `<div class="pav-kpi"><small>${k}</small><b class="${c}">${v}</b>${s ? `<span>${s}</span>` : ''}</div>`).join('')}</div>`;
const pavTabla = (cab, filas, clase = '') => `<div class="pav-tabla"><table class="${clase}"><thead><tr>${cab.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const pavIr = (href, t) => `<a href="${href}">${t}</a>`;
const pavNom = (f) => esc(f.inst.corto || f.inst.nombre);
const pavColor = (v, max = 6) => { const k = Math.min(1, Math.abs(v) / max); return `background: color-mix(in srgb, var(--${v >= 0 ? 'sube' : 'baja'}) ${Math.round(10 + k * 45)}%, transparent)`; };
// una barra de reparto (de 0 al máximo) o una que va a los dos lados del cero (ganado y perdido)
const pavFila = (n, v, max, col, txt) => `<div class="pav-fila"><span title="${esc(n)}">${esc(n)}</span><span class="pav-pista"><i style="left:0;width:${Math.max(0.5, Math.min(100, (v / (max || 1)) * 100)).toFixed(1)}%;background:${col}"></i></span><span>${txt}</span></div>`;
const pavDos = (n, v, max) => `<div class="pav-fila"><span title="${esc(n)}">${esc(n)}</span><span class="pav-pista"><i style="${v >= 0 ? 'left:50%' : `left:${(50 - (Math.abs(v) / (max || 1)) * 50).toFixed(1)}%`};width:${((Math.abs(v) / (max || 1)) * 50).toFixed(1)}%;background:var(--${v >= 0 ? 'sube' : 'baja'})"></i><i class="pav-cero"></i></span><span class="${cls(v)}">${eurS(v, 0)}</span></div>`;
const PAV_COL = ['var(--reparto-1)', 'var(--reparto-2)', 'var(--reparto-3)', 'var(--reparto-4)', 'var(--reparto-5)', 'var(--reparto-6)'];
const PAV_CSS = `
/* el panel de una pestaña: 12 columnas en el ordenador, una en el móvil */
.panel-av { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--e3); align-items: start; margin-bottom: var(--e5); }
.panel-av > * { grid-column: 1 / -1; }
.pav-carga { grid-column: 1 / -1; }
@media (min-width: 900px) {
  .pav-c3 { grid-column: span 3; } .pav-c4 { grid-column: span 4; } .pav-c5 { grid-column: span 5; } .pav-c6 { grid-column: span 6; }
  .pav-c7 { grid-column: span 7; } .pav-c8 { grid-column: span 8; } .pav-c9 { grid-column: span 9; } .pav-c12 { grid-column: span 12; }
}
.pav-t { position: relative; min-width: 0; padding: 18px 18px 16px; border-radius: var(--r-l); background: var(--superficie); border: 1px solid var(--borde); }
.pav-et { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 12px; font: 600 11px/14px var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--texto-2); }
[data-tema="marfil"] .pav-et { font: 600 13px/16px var(--marca); color: var(--texto); border-bottom: 1px solid var(--texto); padding-bottom: 7px; }
[data-tema="borgona"] .pav-et { font: italic 500 18px/20px var(--marca); letter-spacing: .01em; text-transform: none; color: var(--oro-texto); }
.pav-et a, .pav-et button { font: 600 12.5px/1 var(--ui); letter-spacing: 0; text-transform: none; font-style: normal; color: var(--oro-texto); text-decoration: none; background: none; border: 0; padding: 0; cursor: pointer; }
.pav-como { margin: 12px 0 0; font-size: 12px; line-height: 1.45; color: var(--tenue); }
.pav-como b { font-weight: 650; color: var(--texto-2); }
.pav-kpis { display: grid; grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr)); gap: 14px 18px; }
@media (max-width: 760px) { .pav-kpis { --cols: 2 !important; } }
.pav-kpi small { display: block; font: 500 12px/1.3 var(--ui); color: var(--tenue); }
.pav-kpi b { display: block; margin-top: 2px; font: 600 20px/1.2 var(--ui); font-variant-numeric: tabular-nums; letter-spacing: -.01em; white-space: nowrap; }
.pav-kpi span { font-size: 12px; color: var(--texto-2); }
.pav-tabla { overflow-x: auto; }
.pav-tabla table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: 13px; }
.pav-tabla th { text-align: right; font: 600 10.5px/1.2 var(--ui); letter-spacing: .08em; text-transform: uppercase; color: var(--tenue); padding: 0 8px 10px; border-bottom: 1px solid var(--sep); white-space: nowrap; }
.pav-tabla td { text-align: right; padding: 9px 8px; border-bottom: 1px solid var(--sep); white-space: nowrap; }
.pav-tabla :is(th, td):first-child { text-align: left; padding-left: 0; }
.pav-tabla td small { display: block; font-size: 11.5px; color: var(--tenue); }
.pav-calor td { text-align: center; font-weight: 600; font-size: 12px; padding: 7px 4px; border: 2px solid var(--superficie); border-radius: 6px; }
.pav-calor th { text-align: center; }
.pav-fila { display: grid; grid-template-columns: minmax(96px, 170px) minmax(0, 1fr) minmax(72px, auto); gap: 10px; align-items: center; min-height: 32px; font-size: 13px; }
.pav-fila > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pav-fila > span:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.pav-pista { position: relative; height: 8px; border-radius: 9px; background: var(--sep); overflow: hidden; }
.pav-pista i { position: absolute; top: 0; bottom: 0; border-radius: 9px; }
.pav-pista .pav-cero { position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: var(--aro); }
.pav-matriz td { text-align: center; font-size: 12px; font-weight: 600; padding: 8px 4px; border: 2px solid var(--superficie); border-radius: 6px; }
.pav-matriz th { font-size: 10px; text-align: center; }
.pav-vacio { padding: 26px 20px; text-align: center; color: var(--texto-2); }
.pav-vacio h2 { margin: 0 0 8px; font: var(--titulo-estilo) var(--titulo-peso, 500) 22px/1.2 var(--titulo); letter-spacing: var(--titulo-espacio); color: var(--texto); }
.pav-vacio p { margin: 0 auto 14px; max-width: 56ch; }
.pav-lista { list-style: none; margin: 0; padding: 0; }
.pav-lista li { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 10px; padding: 9px 0; font-size: 13px; }
.pav-lista li + li { border-top: 1px solid var(--sep); }
.pav-lista b { font-weight: 650; }
.panel-av .chart { margin-top: 6px; }

.pav-kpi b.warn { color: var(--aviso); }
`;
const ponerCssAv = () => { if (!$('#pavCss')) { const s = document.createElement('style'); s.id = 'pavCss'; s.textContent = PAV_CSS; document.head.appendChild(s); } };

/* Básico: «¿Qué es?» de cada bloque de Hoy, solo en básico. Va detrás del título del bloque (o al principio si no tiene) */
const QUE_ES = {
  patrimonio: ['Todo lo que tienes sumado, con el precio de ahora. La línea es cómo ha ido cambiando.', 'Everything you own added up, at today\'s price. The line is how it has changed.'],
  posiciones: ['Cada cosa en la que tienes dinero, lo que vale hoy y lo que has ganado o perdido desde que la compraste.', 'Each thing you have money in, what it is worth today and what you have gained or lost since you bought it.'],
  reparto: ['Dónde está tu dinero. Repartido entre muchos sitios, un mal año de uno pesa menos.', 'Where your money is. Spread across many places, a bad year in one weighs less.'],
  agenda: ['Lo que pasa estas semanas con lo tuyo. Lo que hagas lo decides tú.', 'What is coming up for what you own. What you do is up to you.'],
  ia: ['La IA lee tu cartera y las noticias, explica y hace cuentas. No te dice qué comprar ni vender.', 'The AI reads your portfolio and the news, explains and does the maths. It does not tell you what to buy or sell.'],
  cifras: ['Tus números de un vistazo: por plataforma, lo que metiste y lo que cobras.', 'Your numbers at a glance: by platform, what you put in and what you collect.'],
  mapa: ['Cada cuadro es una posición: más grande cuanto más vale, verde si sube y rojo si baja.', 'Each box is a holding: bigger the more it is worth, green if it rises and red if it falls.'],
  informe: ['Un resumen de las noticias del día de lo que tienes, escrito por la IA.', 'A summary of today\'s news about what you own, written by the AI.'],
  noticias: ['Los últimos titulares de las empresas y fondos que tienes.', 'The latest headlines about the companies and funds you own.'],
  movidas: ['Las empresas que más suben y bajan hoy en las bolsas.', 'The companies rising and falling most today.'],
  futuro: ['Lo que podrías tener si sigues aportando y los mercados se portan como de media. No es una promesa.', 'What you could have if you keep investing and markets behave as on average. Not a promise.'],
  metas: ['Si llegas a cada meta que te has puesto con lo que aportas.', 'Whether you reach each goal you set with what you put in.'],
  renta: ['Lo que llevas ganado este año con lo que has vendido y lo que pagarías en la renta.', 'What you have made this year from sales and what you would pay in tax.'],
  vistazo: ['Lo que dicen los números y los analistas de cada posición, en una línea.', 'What the numbers and analysts say about each holding, in one line.'],
};
function ponerQueEs(raiz) {
  for (const m of $$('[data-que-es]', raiz)) {
    const k = m.dataset.queEs, q = QUE_ES[k], blk = m.nextElementSibling; m.remove();
    if (!q || !blk) continue;
    const p = document.createElement('p'); p.className = 'que-es';
    p.innerHTML = `<b>${L('¿Qué es?', 'What is it?')}</b> ${esc(L(q[0], q[1]))}`;
    const cab = k === 'patrimonio' ? blk.querySelector('.hero-sub') : blk.querySelector('.sec-cab, .car-tabs, .iac-cab');
    if (k === 'patrimonio' && cab) cab.before(p);
    else if (cab) cab.after(p);
    else blk.prepend(p);
  }
}

const diasAtras = (n) => iso(new Date(Date.now() - n * 864e5));

function pintarPanelAv() {
  const el = $('#panelAv'); if (!el) return;
  ponerCssAv();
  const p = el.dataset.p, M = S.M || calcular();
  const f = { rentab: pavRentab, riesgo: pavRiesgo, hacienda: pavHacienda, reparto: pavReparto, div: pavDiv, costes: pavCostes }[p];
  let html;
  try { html = !M.filas.length ? pavSinCartera() : f ? f(M) : pavLuego(p); }
  catch (e) { console.warn(e); html = pavT('c12', L('No se ha podido calcular', 'Could not work it out'), `<p class="nota" style="margin:0">${esc(e.message || '')}</p>`); }
  el.innerHTML = html; el.removeAttribute('aria-busy'); ponerPreguntale(el);
  requestAnimationFrame(() => dibujarPanelAv(p, M));
}
const pavSinCartera = () => `<section class="pav-t pav-c12 pav-vacio"><h2>${L('Aquí salen tus números', 'Your numbers show up here')}</h2><p>${L('En cuanto metas lo que tienes, esta pestaña se llena con tus datos.', 'As soon as you add what you own, this tab fills up with your data.')}</p><button type="button" class="btn pri" data-accion="nueva-pos">${ICONOS.mas}${L('Meter lo que tengo', 'Add what I own')}</button></section>`;

/* ---------- Lo que aún llega en las sesiones siguientes ---------- */
const PAV_LUEGO = {
  pos: [L('Todas tus posiciones en una tabla, con hasta 22 columnas a elegir (coste medio, peso frente a tu objetivo, TWR, TIR, dividendos, TER, PER, divisa…) y filtros por tipo y por bróker.', 'All your holdings in one table, with up to 22 columns to choose from and filters by type and broker.'), '#posiciones', L('Tus posiciones', 'Your holdings')],
  pnl: [L('Un calendario con lo que ganó o perdió tu cartera cada día de bolsa, la ganancia acumulada del mes, tu mejor y tu peor día y lo que más ha ganado y perdido.', 'A calendar with what your portfolio made or lost each trading day, the month so far, your best and worst day.'), '#cartera', L('La gráfica de Hoy', 'The Today chart')],
  grafico: [L('El gráfico de velas de cada posición con medias de 20, 50 y 200 días, volumen, RSI y MACD, y tus avisos de precio.', 'The candlestick chart of each holding with 20, 50 and 200-day averages, volume, RSI and MACD, and your price alerts.'), '#posiciones', L('La ficha de cada posición', 'Each holding\'s page')],
  divX: [L('Lo cobrado y lo previsto mes a mes, la rentabilidad por dividendo y sobre lo que pagaste, los próximos cobros y la retención en origen.', 'What you have collected and what is expected month by month, yield, yield on cost, upcoming payments and withholding.'), '#analisis', L('Tus números, en Análisis', 'Your numbers, in Analysis')],
  costesX: [L('La comisión de cada fondo y lo que se lleva al año y en 20 años, el más barato de su índice y lo que pagas en cada bróker.', 'Each fund\'s fee and what it takes per year and over 20 years, the cheapest of its index and what each broker charges.'), '#analisis', L('Tus números, en Análisis', 'Your numbers, in Analysis')],
  mov: [L('Todas tus operaciones con filtros (compras, ventas, dividendos, aportaciones, comisiones) y el dinero que has metido mes a mes.', 'All your transactions with filters and the money you have put in month by month.'), '#posiciones', L('Tus posiciones', 'Your holdings')],
  rebal: [L('Tu reparto objetivo frente a lo que tienes, y el cálculo de cómo quedaría con tu próxima aportación programada. Lo decides tú.', 'Your target mix against what you hold, and how it would look after your next scheduled contribution. Your call.'), '#futuro', L('Tus objetivos', 'Your goals')],
  lab: [L('¿Y si…? (aportar más, jubilarte antes, cambiar de fondo) y la prueba con el pasado de tu reparto de hoy.', 'What if…? (invest more, retire earlier, switch funds) and a backtest of your current mix.'), '#futuro', L('Lo que podrías tener', 'What you could have')],
};
function pavLuego(p) {
  const x = PAV_LUEGO[p] || [''], nom = (PEST_AV.find(([k]) => k === p) || [])[1] || '';
  return `<section class="pav-t pav-c12 pav-vacio"><h2>${esc(L(nom, (PEST_AV.find(([k]) => k === p) || [])[2] || nom))}</h2><p>${x[0]}</p><p class="nota">${L('Esta pestaña se llena en las próximas versiones. Mientras, lo tienes aquí:', 'This tab fills up in the next versions. Meanwhile, you have it here:')}</p>${x[1] ? `<a class="btn" href="${x[1]}">${x[2]}</a>` : ''}</section>`;
}

/* ---------- Rentabilidad ---------- */
// lo que ha hecho una serie de índices (idx) desde una fecha: null si la serie empieza después
function pavDesde(serie, desde, campo = 'idx') {
  if (!serie || serie.length < 2 || serie[0].d > desde) return null;
  let a = serie[0];
  for (const x of serie) { if (x.d > desde) break; a = x; }
  const z = serie[serie.length - 1];
  return a[campo] > 0 ? (z[campo] / a[campo] - 1) * 100 : null;
}
function pavBenchSerie(id, desde) {
  const h = histBench(id); if (!h || !h.length) return null;
  const s = h.filter(([d]) => d >= desde).map(([d, v]) => ({ d, idx: v }));
  const hoy = precioBenchHoy(id); if (hoy && s.length && s[s.length - 1].d < hoyIso()) s.push({ d: hoyIso(), idx: hoy });
  const antes = precioEn(h, desde, 'antes'); if (antes) s.unshift({ d: desde, idx: antes });
  return s;
}
function pavRentab(M) {
  const R = rentabilidadCartera(M), tw = R.twr, s = tw && tw.serie;
  const anio = new Date().getFullYear(), ini = `${anio}-01-01`;
  const per = [[L('1 mes', '1 month'), diasAtras(30)], [L('3 meses', '3 months'), diasAtras(91)], [L('Este año', 'This year'), ini], [L('1 año', '1 year'), diasAtras(365)]];
  const desde = R.desde || (s && s[0].d);
  const b = desde ? pavBenchSerie('fidelity-world', per.map(([, d]) => d).concat(desde).sort()[0]) : null;
  const fila = (nom, ser) => [nom, ...per.map(([, d]) => { const v = pavDesde(ser, d); return v == null ? '—' : `<b class="${cls(v)}">${pctS(v, 1)}</b>`; }), (() => { const v = desde ? pavDesde(ser, desde) : null; return v == null ? '—' : `<b class="${cls(v)}">${pctS(v, 1)}</b>`; })()];
  const filas = [];
  if (s) filas.push(fila(L('Tu cartera (TWR)', 'Your portfolio (TWR)'), s));
  if (b) filas.push(fila('MSCI World (EUR)', b));
  if (s && b) filas.push([L('Diferencia, en puntos', 'Difference, in points'), ...per.map(([, d]) => d).concat(desde).map((d) => { const x = pavDesde(s, d), y = pavDesde(b, d); return x == null || y == null ? '—' : `<span class="${cls(x - y)}">${masSi(x - y, 1)}${fmtNum(x - y, 1)}</span>`; })]);
  const cab = ['', ...per.map(([n]) => n), L('Desde el inicio', 'Since start')];
  const porQue = !s ? `<p class="nota" style="margin:12px 0 0">${R.sinFecha && R.sinFecha.length ? L(`La de tu cartera necesita la fecha de compra de ${esc(R.sinFecha.slice(0, 4).join(', '))}${R.sinFecha.length > 4 ? '…' : ''}: ponla en su ficha o importa tus movimientos.`, `Your portfolio's needs the purchase date of ${esc(R.sinFecha.slice(0, 4).join(', '))}.`) : L('La de tu cartera sale en cuanto haya historial suficiente.', 'Yours shows up once there is enough history.')}</p>` : '';
  const tablaPer = filas.length ? pavTabla(cab, filas) : `<p class="nota" style="margin:0">${R.sinFecha && R.sinFecha.length ? L(`Para calcularla hace falta la fecha de compra de: ${esc(R.sinFecha.slice(0, 4).join(', '))}. Ponla en su ficha.`, `It needs the purchase date of: ${esc(R.sinFecha.slice(0, 4).join(', '))}. Add it on its page.`) : L('Aún no hay historial suficiente para calcularla.', 'Not enough history yet to work it out.')}</p>`;
  const tir = R.tir != null && !R.corto ? pctS(R.tir, 1) : '—';
  const ventas = sum((S.cartera.movimientos || []).filter((m) => m.tipo === 'venta'), (m) => m.resultado || 0);
  const rcm = sum(Object.values(S.cartera.fiscal || {}), (d) => +d.rcm || 0);
  const kpis = pavKpis([
    [L('Rentabilidad por tiempo (TWR)', 'Time-weighted return (TWR)'), tw ? pctS(tw.total, 1) : '—', tw ? cls(tw.total) : '', tw && tw.anual != null ? L(`${pctS(tw.anual, 1)} al año`, `${pctS(tw.anual, 1)} a year`) : ''],
    [L('Con tus aportaciones (TIR)', 'Money-weighted (IRR)'), tir, R.tir != null ? cls(R.tir) : '', L('al año', 'a year')],
    [L('Aportado', 'Put in'), eur(R.metido || M.invertido, 0)],
    [L('Sacado', 'Taken out'), eur(R.sacado || 0, 0)],
  ], 4);
  const lado = pavKpis([
    [L('Subida de precios sin vender', 'Unrealised price gains'), eurS(M.pl, 0), cls(M.pl)],
    [L('Ventas ya hechas', 'Realised sales'), eurS(ventas, 0), cls(ventas)],
    rcm ? [L('Dividendos e intereses apuntados', 'Dividends and interest recorded'), eurS(rcm, 0), cls(rcm)] : null,
    [L('Total', 'Total'), eurS(M.pl + ventas + rcm, 0), cls(M.pl + ventas + rcm)],
  ], 2);
  // mes a mes, con la TWR: el índice a fin de cada mes frente al del mes anterior
  let calor = '';
  if (s && s.length > 20) {
    const fin = new Map(); for (const x of s) fin.set(x.d.slice(0, 7), x.idx);
    const meses = [...fin.keys()].sort(), anios = [...new Set(meses.map((m) => m.slice(0, 4)))].slice(-4);
    const prev = (m) => { const i = meses.indexOf(m); return i > 0 ? fin.get(meses[i - 1]) : s[0].idx; };
    const MS = IDIOMA === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    calor = `<div class="pav-tabla"><table class="pav-calor"><thead><tr><th></th>${MS.map((m) => `<th>${m}</th>`).join('')}<th>${L('Año', 'Year')}</th></tr></thead><tbody>${anios.map((a) => {
      let acc = 1;
      const tds = MS.map((_, i) => { const m = `${a}-${String(i + 1).padStart(2, '0')}`; if (!fin.has(m)) return '<td></td>'; const v = (fin.get(m) / prev(m) - 1) * 100; acc *= 1 + v / 100; return `<td style="${pavColor(v)}">${pctS(v, 1)}</td>`; }).join('');
      const ya = (acc - 1) * 100;
      return `<tr><th style="text-align:left">${a}</th>${tds}<td style="${pavColor(ya, 20)}"><b>${pctS(ya, 1)}</b></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  const pos = M.filas.filter((f) => f.coste > 0).map((f) => [f.inst.corto || f.inst.nombre, f.valor - f.coste]).sort((a, b) => b[1] - a[1]);
  const maxP = Math.max(1, ...pos.map(([, v]) => Math.abs(v)));
  return [
    pavT('c12', L('Por periodo', 'By period'), kpis + `<div style="margin-top:16px">${tablaPer}</div>${porQue}`, L('La <b>TWR</b> (rentabilidad por tiempo) quita el efecto de cuándo aportas: es la que se compara con un índice. La <b>TIR</b> sí lo cuenta: lo que ha ganado tu dinero de verdad, al año. El MSCI World es su fondo indexado en euros, con los dividendos dentro. Sale «—» si aún no hay tanto historial.', '<b>TWR</b> removes the effect of when you invest: it is the one to compare with an index. <b>IRR</b> includes it: what your money really made, per year.')),
    pavT('c4', L('De dónde sale lo ganado', 'Where the gain comes from'), lado, L('Lo de las ventas sale de tus ventas apuntadas; los dividendos, de lo que pusiste en Hacienda.', 'Sales come from your recorded sales; dividends, from what you entered in Taxes.')),
    pavT('c8', L('Lo que ha aportado cada posición', 'What each holding has contributed'), pos.map(([n, v]) => pavDos(n, v, maxP)).join(''), L('Lo que vale hoy menos lo que te costó, sin lo ya vendido.', 'Value today minus cost, without what you already sold.')),
    calor ? pavT('c6', L('Mes a mes', 'Month by month'), calor, L('La rentabilidad por tiempo de cada mes; el color, más intenso cuanto más se movió.', 'The time-weighted return of each month; the stronger the colour, the bigger the move.')) : '',
    s && b ? pavT('c6', L('Contra el MSCI World', 'Against the MSCI World'), '<div class="chart" id="pavBench"></div>', L('Las dos desde tu primera compra, en %. Tu cartera, con la TWR.', 'Both since your first purchase, in %. Your portfolio, with TWR.')) : '',
  ].join('');
}

/* ---------- Riesgo ---------- */
function pavRetornos(serie) { const r = []; for (let i = 1; i < serie.length; i++) if (serie[i - 1].v > 0) r.push(serie[i].v / serie[i - 1].v - 1); return r; }
function pavCorr(a, b) {
  const n = Math.min(a.length, b.length); if (n < 20) return null;
  const ma = sum(a.slice(0, n)) / n, mb = sum(b.slice(0, n)) / n;
  let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
  return va && vb ? c / Math.sqrt(va * vb) : null;
}
// los precios de algo en las mismas fechas que la serie de tu cartera
const pavEnFechas = (h, serie) => serie.map((x) => ({ d: x.d, v: precioEn(h, x.d, 'antes') })).filter((x) => x.v);
function pavRiesgo(M) {
  const s = serieCartera(M, 366);
  if (s.length < 30) return pavT('c12', L('Riesgo', 'Risk'), `<p class="nota" style="margin:0">${L('Faltan precios del último año para calcularlo.', 'Prices for the last year are missing.')}</p>`);
  const vol = volatilidadSerie(s), r1 = (s[s.length - 1].v / s[0].v - 1) * 100, rr = pavRetornos(s);
  const dias = diasEntre(s[0].d, s[s.length - 1].d) || 365, k = Math.sqrt((rr.length * 365) / dias);
  const neg = rr.filter((x) => x < 0), dDown = neg.length ? Math.sqrt(sum(neg, (x) => x * x) / rr.length) * k * 100 : null;
  const sharpe = vol ? r1 / vol : null, sortino = dDown ? r1 / dDown : null;
  const hb = histBench('fidelity-world'), sb = hb ? pavEnFechas(hb, s) : [];
  let beta = null;
  if (sb.length === s.length) { const rb = pavRetornos(sb), n = Math.min(rr.length, rb.length), mb = sum(rb) / n, mr = sum(rr) / n; let cv = 0, vb = 0; for (let i = 0; i < n; i++) { cv += (rr[i] - mr) * (rb[i] - mb); vb += (rb[i] - mb) ** 2; } beta = vb ? cv / vb : null; }
  const var95 = vol ? 1.645 * (vol / 100) / Math.sqrt(12) * M.total : null;
  const peor1 = caidaMaxima(s), c10 = caidaDetalle(serieCartera(M, 3650));
  const top = M.filas.find((f) => f.inst.tipo === 'Acción') || M.filas[0], top5 = sum(M.filas.slice(0, 5), (f) => f.peso);
  const cr = claseRiesgo(vol);
  const kp = pavKpis([
    [L('Volatilidad (1 año)', 'Volatility (1 year)'), pct(vol, 1), '', cr ? L(`riesgo ${cr} de 7`, `risk ${cr} of 7`) : ''],
    [L('Rentabilidad (1 año)', 'Return (1 year)'), pctS(r1, 1), cls(r1)],
    ['Sharpe', sharpe == null ? '—' : fmtNum(sharpe, 2)],
    ['Sortino', sortino == null ? '—' : fmtNum(sortino, 2)],
    [L('Beta frente al MSCI World', 'Beta vs MSCI World'), beta == null ? '—' : fmtNum(beta, 2)],
    [L('Peor caída en 1 año', 'Worst drop in 1 year'), pct(peor1, 1), 'down'],
    [L('VaR 95 % (1 mes)', 'VaR 95% (1 month)'), var95 == null ? '—' : eurS(-var95, 0), 'down'],
    [top.inst.tipo === 'Acción' ? L('En una sola empresa, como mucho', 'Largest single company') : L('En una sola posición, como mucho', 'Largest single holding'), pct(top.peso, 1), top.inst.tipo === 'Acción' && top.peso > 10 ? 'warn' : '', pavNom(top)],
  ], 4);
  // si la bolsa mundial cayera un 20 %: con tu beta
  const esc20 = beta != null ? -0.2 * beta * M.totalPos : null;
  // correlación entre tus cinco mayores posiciones con precios
  const cinco = M.filas.filter((f) => histDe(f.inst.id)).slice(0, 5);
  const rets = cinco.map((f) => { const x = pavEnFechas(histDe(f.inst.id), s); return x.length === s.length ? pavRetornos(x) : null; });
  const matriz = cinco.length > 1 ? `<div class="pav-tabla"><table class="pav-matriz"><thead><tr><th></th>${cinco.map((f) => `<th title="${pavNom(f)}">${pavNom(f).slice(0, 10)}</th>`).join('')}</tr></thead><tbody>${cinco.map((f, i) => `<tr><th style="text-align:left">${pavNom(f)}</th>${cinco.map((g, j) => { if (i === j) return '<td>—</td>'; const c = rets[i] && rets[j] ? pavCorr(rets[i], rets[j]) : null; return c == null ? '<td>·</td>' : `<td style="background: color-mix(in srgb, var(--grafica) ${Math.round(Math.max(0, c) * 55)}%, transparent)">${fmtNum(c, 2)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const porPos = pavTabla([L('Posición', 'Holding'), L('Peso', 'Weight'), L('Riesgo', 'Risk'), L('Volatilidad', 'Volatility'), 'Beta'], M.filas.map((f) => [`<b>${pavNom(f)}</b>`, pct(f.peso, 1), f.p && f.p.riesgo ? `${f.p.riesgo} / 7` : '—', f.p && f.p.volatilidad != null ? pct(f.p.volatilidad, 1) : '—', f.p && f.p.fundamentales && f.p.fundamentales.beta != null ? fmtNum(f.p.fundamentales.beta, 2) : '—']));
  const caidaTxt = c10 && c10.peor ? L(`La peor de los últimos años: <b class="down">${pctS(c10.peor.pct, 1)}</b>, del ${fechaConAnio(c10.peor.desde)} al ${fechaConAnio(c10.peor.hasta)}${c10.peor.vuelve ? `; volvió a su máximo el ${fechaConAnio(c10.peor.vuelve)}` : '; todavía no ha vuelto a su máximo'}.`, `The worst in recent years: <b class="down">${pctS(c10.peor.pct, 1)}</b>.`) : '';
  return [
    pavT('c12', L('Medidas de riesgo', 'Risk measures'), kp, L('Con tus posiciones de hoy y los precios del último año. <b>Volatilidad</b>: cuánto se mueve al año. <b>Sharpe</b> y <b>Sortino</b>: lo ganado por cada punto de riesgo (Sortino solo cuenta las bajadas; aquí sin restar el tipo sin riesgo). <b>Beta</b>: cuánto se mueve cuando se mueve el MSCI World (1 = igual). <b>VaR</b>: en 19 de cada 20 meses no perderías más que eso, suponiendo que se mueve como hasta ahora.', 'With today\'s holdings and last year\'s prices.')),
    pavT('c6', L('Si pasara…', 'If it happened…'), pavKpis([
      esc20 != null ? [L('La bolsa mundial cae un 20 %', 'World stocks fall 20%'), eurS(esc20, 0), 'down', L(`con tu beta de ${fmtNum(beta, 2)}`, `with your beta of ${fmtNum(beta, 2)}`)] : null,
      c10 && c10.peor ? [L('Tu peor caída otra vez', 'Your worst drop again'), eurS(M.total * c10.peor.pct / 100, 0), 'down', pctS(c10.peor.pct, 1)] : null,
      [L('Las 5 mayores posiciones', 'Your 5 largest holdings'), pct(top5, 1), '', L('del total', 'of the total')],
    ], 1), L('Lo que supondría en tu cartera de hoy. No es una previsión.', 'What it would mean for your portfolio today. Not a forecast.')),
    matriz ? pavT('c6', L('Cómo se mueven juntas', 'How they move together'), matriz, L('Correlación del último año, de −1 a 1: cuanto más cerca de 1, más suben y bajan a la vez.', 'Last year\'s correlation, from −1 to 1.')) : '',
    pavT('c12', L('Caída desde el máximo', 'Drop from the high'), `${caidaTxt ? `<p style="margin:0 0 8px">${caidaTxt}</p>` : ''}<div class="chart" id="pavCaida"></div>`, L('Cada día, lo lejos que estaba tu cartera de su máximo hasta entonces, con tus posiciones de hoy (hasta 10 años atrás).', 'Each day, how far your portfolio was from its high so far, with today\'s holdings.')),
    pavT('c12', L('Posición a posición', 'Holding by holding'), porPos, L('Riesgo: la escala oficial de 1 a 7. Volatilidad y beta, del último año.', 'Risk: the official 1–7 scale.')),
  ].join('');
}

/* ---------- Hacienda ---------- */
const PAV_FUERA = /trade ?republic|interactive|revolut|degiro|scalable|etoro|xtb|freedom|lightyear|trading ?212|bitvavo|binance|coinbase|kraken/i;
function pavHacienda(M) {
  const anio = new Date().getFullYear(), fa = fiscalAnio(anio);
  const pagar = Math.max(0, fa.cuota - fa.retenido);
  // lotes y lo que supondría venderlos hoy (FIFO, con tu tramo de ahora)
  const lotes = [];
  for (const f of M.filas) {
    if (!f.precio || f.inst.tipo === 'Efectivo') continue;
    for (const l of lotesDe(f.pos)) { if (!(l.u > 1e-9)) continue; const v = l.u * f.precio; lotes.push({ f, l, v, g: v - l.c }); }
  }
  const gTotal = sum(lotes, (x) => x.g), siTodo = impuestoDeVenta(gTotal).impuesto;
  lotes.sort((a, b) => Math.abs(b.g) - Math.abs(a.g));
  const tabla = pavTabla([L('Posición', 'Holding'), L('Compra', 'Bought'), L('Coste → hoy', 'Cost → today'), L('Ganancia', 'Gain'), L('Si lo vendieras', 'If you sold it')], lotes.slice(0, 14).map(({ f, l, v, g }) => [`<b>${pavNom(f)}</b>`, `${l.f ? fechaConAnio(l.f) : '—'}<small>${fmtNum(l.u, l.u < 10 ? 4 : 2)} ${L('uds.', 'units')}${l.mezcla ? L(' · coste medio', ' · average cost') : ''}</small>`, `${eur(l.c, 0)}<small>${eur(v, 0)}</small>`, `<span class="${cls(g)}">${eurS(g, 0)}</span>`, g > 0 ? `≈ ${eur(impuestoDeVenta(g).impuesto, 0)}` : `<small>${L('compensaría', 'would offset')}</small>`]))
    + (lotes.length > 14 ? `<p class="pav-como" style="margin-top:8px">${L(`Y ${lotes.length - 14} lotes más, más pequeños.`, `And ${lotes.length - 14} smaller lots.`)}</p>` : '');
  const fuera = (pred) => sum(M.filas.filter((f) => PAV_FUERA.test(f.pos.plataforma || '') && pred(f)), (f) => f.valor);
  const cripto = fuera((f) => f.inst.clase === 'Cripto'), valores = fuera((f) => f.inst.clase !== 'Cripto');
  const aviso = (cuanto, mod, que) => L(`${que}: hoy ${eur(cuanto, 0)}. El modelo ${mod} (informativo) toca por encima de 50.000 € a 31 de diciembre. ${cuanto > 50000 ? '<b>Con lo de hoy, lo superarías.</b>' : 'Con lo de hoy, no te toca.'}`, `${que}: ${eur(cuanto, 0)} today. Form ${mod} applies above €50,000 on 31 December.`);
  const avisos = [
    ['31 dic', L(`Cierra el año fiscal: lo que vendas después cuenta para la renta de ${anio + 1}.`, `The tax year ends: what you sell afterwards counts for ${anio + 1}.`)],
    [L('Fondos', 'Funds'), L('El traspaso entre fondos no paga impuestos; vender un ETF o una acción, sí.', 'Switching between funds is tax-free; selling an ETF or a share is not.')],
    [L('2 meses', '2 months'), L('Si vendes con pérdidas y recompras lo mismo en los dos meses de antes o de después, esa pérdida se aplaza.', 'If you sell at a loss and buy the same back within two months, that loss is deferred.')],
    ['721', aviso(cripto, '721', L('Cripto en exchanges de fuera de España', 'Crypto on exchanges outside Spain'))],
    ['720', aviso(valores, '720', L('Valores en brókers de fuera de España', 'Securities at brokers outside Spain'))],
  ];
  return [
    pavT('c12', L(`Renta de ${anio} (se presenta entre abril y junio de ${anio + 1})`, `${anio} tax return`), pavKpis([
      [L('Ganancias y pérdidas por ventas', 'Gains and losses from sales'), eurS(fa.gp, 0), cls(fa.gp)],
      [L('Dividendos e intereses', 'Dividends and interest'), eur(fa.rcm, 0)],
      [L('Pérdidas de años anteriores', 'Losses from earlier years'), eur(fa.pendientes, 0), '', fa.usadas ? L(`usas ${eur(fa.usadas, 0)}`, `using ${eur(fa.usadas, 0)}`) : ''],
      [L('Base del ahorro', 'Savings tax base'), eur(fa.base, 0)],
      [L('Impuesto', 'Tax'), eur(fa.cuota, 0), '', L(`tramo del ${pctTramo(fa.marginal)} %`, `${pctTramo(fa.marginal)}% bracket`)],
      [L('Ya retenido', 'Already withheld'), eur(fa.retenido, 0)],
      [L('Te saldría a pagar', 'You would owe'), `≈ ${eur(pagar, 0)}`, pagar > 0 ? 'warn' : ''],
      [L('Para compensar más adelante', 'To offset later'), eur(fa.sobra, 0)],
    ], 4), L(`Con tus ventas apuntadas y lo que pusiste en Hacienda (dividendos, retenciones, pérdidas de otros años). Tramos del ahorro: ${textoTramos()}. Es un cálculo, no asesoramiento fiscal.`, 'With your recorded sales and what you entered in Taxes. It is a calculation, not tax advice.'), pavIr('#fiscal', L('Hacienda', 'Taxes'))),
    pavT('c8', L('Tus lotes y lo que supondría vender cada uno', 'Your lots and what selling each would mean'), (lotes.length ? tabla : `<p class="nota" style="margin:0">${L('Sin lotes con precio.', 'No priced lots.')}</p>`) + `<p class="pav-como" style="margin-top:10px">${L(`Si vendieras todo hoy: ganancia de ${eurS(gTotal, 0)} e impuesto de ≈ ${eur(siTodo, 0)} (sumado a lo que ya llevas este año).`, `If you sold everything today: a gain of ${eurS(gTotal, 0)} and tax of ≈ ${eur(siTodo, 0)}.`)}</p>`, L('FIFO: al vender, sale primero lo que compraste antes. Cada lote, como si lo vendieras solo, con lo que llevas este año. Lo decides tú.', 'FIFO: what you bought first goes first. Each lot as if sold on its own. Your call.')),
    pavT('c4', L('Avisos', 'Reminders'), `<ul class="pav-lista">${avisos.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul>`, L('Los de fuera se miran por el nombre del bróker o del exchange que pusiste en cada posición. Es información, no asesoramiento fiscal.', 'Foreign ones are detected from the broker name on each holding.')),
  ].join('');
}

/* ---------- Reparto y X-Ray ---------- */
function pavReparto(M) {
  const g = (titulo, dim, base) => {
    const r = reparto(M, dim, base).filas; if (!r.length) return '';
    const top = r.slice(0, 6), resto = r.slice(6), filas = resto.length ? [...top.slice(0, 5), { k: L('Otros', 'Other'), pct: sum(resto, (x) => x.pct) + top[5].pct }] : top;
    const max = Math.max(...filas.map((x) => x.pct));
    return pavT('c4', titulo, filas.map((x, i) => pavFila(String(x.k), x.pct, max, PAV_COL[i % 6], pct(x.pct, 1))).join(''));
  };
  const d = empresasPorDentro(M), emp = d.filas.slice(0, 12);
  const top5 = sum(M.filas.slice(0, 5), (f) => f.peso);
  const xray = emp.length ? pavTabla([L('Empresa', 'Company'), L('Cómo la tienes', 'How you hold it'), L('Valor', 'Value'), L('Del total', 'Of total')], emp.map((x) => [`<b>${esc(x.n)}</b>`, x.directa ? L('Directa', 'Direct') : L('Dentro de tus fondos', 'Inside your funds'), eur(x.v, 0), pct(M.total ? (x.v / M.total) * 100 : 0, 1)])) : '';
  const sol = htmlSolapes(M);
  return [
    g(L('Por clase de activo', 'By asset class'), 'clase'),
    g(L('Por región', 'By region'), 'region'),
    g(L('Por sector (renta variable)', 'By sector (equities)'), 'sector', 'rv'),
    g(L('Por tipo de producto', 'By product type'), 'producto'),
    g(L('Por bróker', 'By broker'), 'plataforma'),
    pavT('c4', L('Concentración', 'Concentration'), pavKpis([
      [L('Posiciones', 'Holdings'), String(M.filas.length)],
      ...(() => { const a = M.filas.find((f) => f.inst.tipo === 'Acción'); return [[L('La mayor posición', 'Largest holding'), pct(M.filas[0].peso, 1), '', pavNom(M.filas[0])], a ? [L('La mayor empresa suelta', 'Largest single company'), pct(a.peso, 1), a.peso > 10 ? 'warn' : '', pavNom(a)] : null]; })(),
      [L('Las 5 mayores', 'The 5 largest'), pct(top5, 1)],
      [L('Empresas contadas', 'Companies counted'), String(d.filas.length), '', L('con las 10 mayores de cada fondo', 'with the top 10 of each fund')],
    ], 2), L('Un fondo indexado ya va repartido por dentro; por encima del 10 % en una sola empresa, una mala noticia suya se nota en toda la cartera.', 'Above 10% in one holding, its bad news shows across the portfolio.')),
    xray ? pavT('c8', L('X-Ray: las empresas que tienes de verdad', 'X-Ray: the companies you really own'), xray, L('Suma las acciones que tienes sueltas y las que van dentro de tus fondos indexados (las 10 mayores de cada uno, con sus pesos de Yahoo Finance).', 'Adds your direct shares and those inside your index funds (top 10 of each).')) : '',
    sol ? pavT('c4', L('¿Se pisan tus fondos?', 'Do your funds overlap?'), sol.replace(/<h3[^>]*>.*?<\/h3>/, '')) : '',
  ].join('');
}

/* ---------- Dividendos ---------- */
function pavDiv(M) {
  const D = dividendosMeses(M), hoy = hoyIso();
  const con = M.filas.filter((f) => f.p && f.p.dividendo_pct);
  const prox = con.filter((f) => f.p.ex_dividendo && f.p.ex_dividendo >= hoy).sort((a, b) => (a.p.ex_dividendo < b.p.ex_dividendo ? -1 : 1));
  const rcm = fiscalAnio(new Date().getFullYear()).rcm;
  const kp = pavKpis([
    [L('Previsto los próximos 12 meses', 'Expected next 12 months'), eur(D.bruto, 0), '', L(`${eur(D.neto, 0)} netos`, `${eur(D.neto, 0)} net`)],
    [L('Al año, con el precio de hoy', 'Per year, at today\'s price'), eur(M.dividendos, 0), '', L('brutos', 'gross')],
    [L('Rentabilidad por dividendo', 'Dividend yield'), pct(M.total ? (M.dividendos / M.total) * 100 : 0, 2)],
    [L('Sobre lo que pagaste', 'Yield on cost'), pct(M.invertido ? (M.dividendos / M.invertido) * 100 : 0, 2)],
    [L('Cobrado este año (apuntado)', 'Collected this year (recorded)'), eur(rcm, 0), '', L('en Hacienda', 'in Taxes')],
    [L('Posiciones que reparten', 'Holdings that pay'), `${con.length} de ${M.filas.length}`],
  ], 2);
  const d12 = htmlDividendos12(M);
  const tabla = con.length ? pavTabla([L('Posición', 'Holding'), L('Dividendo', 'Yield'), L('Al año', 'Per year'), L('Próximo', 'Next ex-date')], con.sort((a, b) => b.valor * b.p.dividendo_pct - a.valor * a.p.dividendo_pct).map((f) => [`<b>${pavNom(f)}</b>`, pct(f.p.dividendo_pct, 1), eur((f.valor * f.p.dividendo_pct) / 100, 0), f.p.ex_dividendo && f.p.ex_dividendo >= hoy ? fechaConAnio(f.p.ex_dividendo) : '—'])) : `<p class="nota" style="margin:0">${L('Ninguna de tus posiciones reparte dividendo (los fondos de acumulación lo reinvierten dentro).', 'None of your holdings pays a dividend (accumulating funds reinvest it).')}</p>`;
  return [
    pavT('c4', L('Tus números', 'Your numbers'), kp, L('Dividendos brutos de los últimos 12 meses de cada posición sobre su precio de hoy. Lo cobrado sale de lo que pusiste en Hacienda.', 'Gross dividends of the last 12 months on today\'s price.')),
    pavT('c8', L('Mes a mes, lo previsto', 'Month by month, expected'), d12 || `<p class="nota" style="margin:0">${L('Sin cobros previstos.', 'No expected payments.')}</p>`, L('Con las fechas de pago del año pasado y lo anunciado. Ni prometido ni seguro: lo decide cada empresa. Lo neto descuenta la retención española (19 %) y la del país de origen que no se recupera.', 'Based on last year\'s dates and what has been announced. Not guaranteed.')),
    pavT('c12', L('Posición a posición', 'Holding by holding'), tabla + (prox.length ? `<p class="pav-como" style="margin-top:10px">${L(`El próximo: ${pavNom(prox[0])}, el ${fechaConAnio(prox[0].p.ex_dividendo)} (fecha ex-dividendo: hay que tenerla el día antes).`, `Next: ${pavNom(prox[0])}, on ${fechaConAnio(prox[0].p.ex_dividendo)}.`)}</p>` : '')),
  ].join('');
}

/* ---------- Costes ---------- */
function pavCostes(M) {
  const conTer = M.filas.filter((f) => f.inst.ter != null);
  const anual = sum(conTer, (f) => (f.valor * f.inst.ter) / 100), base = sum(conTer, (f) => f.valor);
  let r = 7; try { r = cfgProy().bolsa; } catch (e) {}
  // lo que se llevaría la comisión en 20 años si lo de hoy creciera a la rentabilidad media que usas en la proyección
  const en20 = (v, ter) => { let x = v, c = 0; for (let i = 0; i < 20; i++) { const g = x * ter / 100; c += g; x = x * (1 + r / 100) - g; } return c; };
  const total20 = sum(conTer, (f) => en20(f.valor, f.inst.ter));
  const comis = sum((S.cartera.movimientos || []).filter((m) => String(m.fecha || '').startsWith(String(new Date().getFullYear()))), (m) => +m.gastos || +m.comision || 0);
  const tabla = conTer.length ? pavTabla([L('Fondo', 'Fund'), 'TER', L('Al año', 'Per year'), L('En 20 años*', 'Over 20 years*')], [...conTer].sort((a, b) => b.valor * b.inst.ter - a.valor * a.inst.ter).map((f) => [`<b>${pavNom(f)}</b>`, pct(f.inst.ter, 2), eur((f.valor * f.inst.ter) / 100, 2), `≈ ${eur(en20(f.valor, f.inst.ter), 0)}`])) : `<p class="nota" style="margin:0">${L('No tienes fondos con comisión conocida.', 'No funds with a known fee.')}</p>`;
  const sinTer = M.filas.filter((f) => f.inst.ter == null && f.inst.tipo !== 'Acción' && f.inst.clase !== 'Cripto');
  return [
    pavT('c4', L('Lo que pagas', 'What you pay'), pavKpis([
      [L('Comisión media de tus fondos (TER)', 'Average fund fee (TER)'), pct(base ? (anual / base) * 100 : 0, 2)],
      [L('Al año, en euros', 'Per year, in euros'), eur(anual, 0)],
      [L('En 20 años', 'Over 20 years'), `≈ ${eur(total20, 0)}`, 'warn'],
      comis ? [L('Comisiones de compra y venta este año', 'Trading fees this year'), eur(comis, 2), '', L('apuntadas', 'recorded')] : null,
    ], 1), L(`La TER ya va descontada del precio del fondo: no te la cobran aparte. En 20 años, con lo de hoy creciendo un ${fmtNum(r, 1)} % al año (la media de tu proyección).`, `The TER is already taken from the fund price. Over 20 years, with today's value growing ${fmtNum(r, 1)}% a year.`)),
    pavT('c8', L('Fondo a fondo', 'Fund by fund'), tabla + (sinTer.length ? `<p class="pav-como" style="margin-top:10px">${L(`Sin comisión conocida: ${sinTer.map(pavNom).join(', ')}.`, `Fee unknown: ${sinTer.map(pavNom).join(', ')}.`)}</p>` : ''), L('*Lo que se llevaría la comisión si lo de hoy siguiera ahí 20 años. Cambiar de fondo puede tener coste en Hacienda: el traspaso entre fondos no paga impuestos; entre ETF, sí. Lo decides tú.', '*What the fee would take if today\'s amount stayed 20 years. Your call.')),
  ].join('');
}

/* ---------- Las gráficas, una vez pintado (con su ancho de verdad) ---------- */
function dibujarPanelAv(p, M) {
  if (p === 'rentab') {
    const el = $('#pavBench'), R = rentabilidadCartera(M), s = R.twr && R.twr.serie; if (!el || !s) return;
    const b = pavBenchSerie('fidelity-world', s[0].d); if (!b) return;
    const b0 = b[0].idx;
    grafLinea(el, [{ datos: s.map((x) => ({ d: x.d, v: (x.idx - 1) * 100 })), color: 'var(--grafica)' }, { datos: b.map((x) => ({ d: x.d, v: (x.idx / b0 - 1) * 100 })), color: 'var(--reparto-2)' }], { alto: 220, sinRef: true, titulo: L('Tu cartera frente al MSCI World', 'Your portfolio vs the MSCI World'), fmt: (v) => pctS(v, 1), ejeFmt: (t) => `${fmtNum(t, 0)} %` });
  }
  if (p === 'riesgo') {
    const el = $('#pavCaida'), c = caidaDetalle(serieCartera(M, 3650)); if (!el || !c) return;
    grafLinea(el, c.dd, { alto: innerWidth < 560 ? 150 : 180, color: 'var(--baja)', rellenoA: 0, sinRef: true, titulo: L('Distancia al máximo', 'Distance from the high'), fmt: (v) => pctS(v, 1), ejeFmt: (t) => `${fmtNum(t, 0)} %`, marca: c.peor ? { d: c.peor.hasta, txt: pctS(c.peor.pct, 1) } : null });
  }
}
