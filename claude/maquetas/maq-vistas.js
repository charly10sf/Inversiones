/* Maquetas de las pestañas 2, 1 y 11 (8 nov). Se inyecta en la app de verdad, encima de #av-rentab. */
(() => {
const IC = (k) => (ICONOS_PL && ICONOS_PL[k]) || '';
const SELLO = () => `<i class="et-dorado">${selloDorado('sd-peq')}Dorado</i>`;
const CAND = `<span class="mq-cand" title="Toisón Dorado">${IC('candado')}</span>`;
const e = (n, d = 0) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
const eur = (n, d = 0) => e(n, d) + ' €';
const sg = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + e(Math.abs(n), d);
const cl = (n) => (n >= 0 ? 'up' : 'down');
const pill = (n, suf = ' %', d = 1) => `<span class="mq-pill ${cl(n)}">${n >= 0 ? '▲' : '▼'} ${e(Math.abs(n), d)}${suf}</span>`;

/* ---------- las cifras de la cuenta de prueba (5 posiciones) ---------- */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const N = 45; // mar 2023 → nov 2026
const apor = [], tu = [], idx = [];
for (let i = 0; i < N; i++) {
  const a = 6700 + 300 * i; apor.push(a);
  const t = i / (N - 1);
  const ondaI = 0.06 * Math.sin(i / 3.1) + 0.03 * Math.sin(i / 1.7) - (i >= 23 && i <= 27 ? 0.09 * Math.sin(((i - 23) / 4) * Math.PI) : 0);
  const ondaT = 0.055 * Math.sin(i / 3.1 + 0.4) + 0.035 * Math.sin(i / 1.5) - (i >= 23 && i <= 27 ? 0.07 * Math.sin(((i - 23) / 4) * Math.PI) : 0);
  idx.push(a * (1 + 0.2136 * t + ondaI * Math.min(1, t * 3) * (1 - t * 0.6)));
  tu.push(a * (1 + 0.1749 * t + ondaT * Math.min(1, t * 3) * (1 - t * 0.6)));
}
tu[N - 1] = 23380; idx[N - 1] = 24150; apor[N - 1] = 19900;
const CTRL = [[0, 0], [5, -60], [9, -160], [12, 150], [15, 410], [19, 180], [22, -80], [25, -520], [29, -260], [33, -150], [37, -380], [41, -520], [44, -770]];
const dif = Array.from({ length: N }, (_, i) => { let k = 0; while (CTRL[k + 1][0] < i) k++; const [x0, y0] = CTRL[k], [x1, y1] = CTRL[k + 1], t = (i - x0) / (x1 - x0), s = t * t * (3 - 2 * t); return y0 + (y1 - y0) * s; });
for (let i = 0; i < N; i++) tu[i] = idx[i] + dif[i];
const TU = 23380, IX = 24150, AP = 19900;
const ANIOS = [['2023', 'desde marzo', 9.4, 11.8, 9920, 10080], ['2024', '', 19.6, 26.6, 15340, 15960], ['2025', '', 7.9, 6.2, 20110, 20540], ['2026', 'hasta hoy', 4.1, 5.3, TU, IX]];

/* ---------- gráficas en SVG con los colores del tema ---------- */
function lineas(series, { h = 220, base = null, cero = false, min = null, max = null, escala = null } = {}) {
  if (escala) { const todos0 = series.flatMap((s) => s.v); let a0 = min ?? Math.min(...todos0), b0 = max ?? Math.max(...todos0); const p0 = (b0 - a0) * 0.08; a0 -= p0; b0 += p0;
    const marcas = [0, 1, 2, 3, 4].map((k) => `<span style="top:${(h * k) / 4}px">${escala(b0 - ((b0 - a0) * k) / 4)}</span>`).join('');
    return `<div class="mq-esc-w"><div class="mq-esc" style="height:${h}px">${marcas}</div>${lineas(series, { h, base, cero, min, max })}</div>`; }
  const W = 1000, todos = series.flatMap((s) => s.v);
  let mn = min ?? Math.min(...todos), mx = max ?? Math.max(...todos);
  const pad = (mx - mn) * 0.08; mn -= pad; mx += pad;
  const X = (i, n) => (i / (n - 1)) * W, Y = (v) => h - ((v - mn) / (mx - mn)) * h;
  const d = (v, esc) => v.map((y, i) => (i ? (esc ? `H${X(i, v.length).toFixed(1)}V` : 'L') : 'M') + (esc && i ? Y(y).toFixed(1) : `${X(i, v.length).toFixed(1)} ${Y(y).toFixed(1)}`)).join('');
  let out = `<svg class="mq-svg" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" style="height:${h}px">`;
  for (let k = 1; k < 4; k++) out += `<line x1="0" x2="${W}" y1="${(h * k) / 4}" y2="${(h * k) / 4}" stroke="var(--sep)" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  if (cero) {
    const y0 = Y(0), v = series[0].v, p = d(v);
    out += `<defs><clipPath id="mqArr"><rect x="0" y="0" width="${W}" height="${y0}"/></clipPath><clipPath id="mqAba"><rect x="0" y="${y0}" width="${W}" height="${h - y0}"/></clipPath></defs>`;
    out += `<path d="${p}L${W} ${y0}L0 ${y0}Z" fill="color-mix(in srgb, var(--sube) 26%, transparent)" clip-path="url(#mqArr)"/>`;
    out += `<path d="${p}L${W} ${y0}L0 ${y0}Z" fill="color-mix(in srgb, var(--baja) 26%, transparent)" clip-path="url(#mqAba)"/>`;
    out += `<line x1="0" x2="${W}" y1="${y0}" y2="${y0}" stroke="var(--texto-2)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;
    out += `<path d="${p}" fill="none" stroke="var(--texto)" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    return out + '</svg>';
  }
  for (const s of series) {
    if (s.relleno) out += `<path d="${d(s.v)}L${W} ${h}L0 ${h}Z" fill="${s.relleno}"/>`;
    out += `<path d="${d(s.v, s.esc)}" fill="none" stroke="${s.col}" stroke-width="${s.g || 2.2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  }
  return out + '</svg>';
}
const ejeX = (marcas) => `<div class="mq-eje">${marcas.map((m) => `<span>${m}</span>`).join('')}</div>`;
const EJE = ejeX(['mar 2023', 'ene 2024', 'ene 2025', 'ene 2026', 'hoy']);
const ley = (xs) => `<p class="mq-ley">${xs.map(([c, t, dash]) => `<span><i style="background:${c}${dash ? ';height:0;border-top:2px dashed ' + c + ';background:none' : ''}"></i>${t}</span>`).join('')}</p>`;
const spark = (seed, sube, w = 120, h = 34) => {
  let s = seed, v = 50, p = [];
  for (let i = 0; i < 30; i++) { s = (s * 9301 + 49297) % 233280; v += (s / 233280 - 0.5) * 6 + (sube ? 0.35 : -0.35); p.push(v); }
  const mn = Math.min(...p), mx = Math.max(...p);
  const d = p.map((y, i) => (i ? 'L' : 'M') + ((i / 29) * w).toFixed(1) + ' ' + (h - 3 - ((y - mn) / (mx - mn)) * (h - 6)).toFixed(1)).join('');
  return `<svg class="mq-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${d}" fill="none" stroke="var(--${sube ? 'sube' : 'baja'})" stroke-width="1.6"/></svg>`;
};

/* ---------- tarjetas (las de la app: pav-t en avanzado, pab en básico) ---------- */
const T = (c, tit, cuerpo, como = '', extra = '') => `<section class="pav-t pav-${c} ${extra}"><div class="pav-et"><h2>${tit}</h2></div>${cuerpo}${como ? `<p class="pav-como"><b>Cómo se calcula ·</b> ${como}</p>` : ''}</section>`;
const B = (c, tit, cuerpo, que = '', extra = '') => `<section class="pav-t pab pav-${c} ${extra}"><h2 class="pab-cab">${tit}</h2>${cuerpo}${que ? `<p class="pab-que"><b>¿Qué es?</b> ${que}</p>` : ''}</section>`;
const lead = (t) => `<p class="pab-lead">${t}</p>`;
const pregs = (qs, c = 'c12') => `<section class="pav-t pab pab-ia pav-${c}"><h2 class="pab-cab">${IC('asistente')}<span>Pregúntale a la IA</span></h2><div class="pab-pregs">${qs.map((q) => `<button type="button" class="pab-preg">${q}</button>`).join('')}</div></section>`;
const bloq = (html, txt = 'Ver Toisón Dorado') => `<div class="mq-bloq"><div class="mq-bloq-in" aria-hidden="true">${html}</div><div class="mq-bloq-cta">${selloDorado('sd-peq')}<b>Con Toisón Dorado</b><button type="button" class="btn pri">${txt}</button></div></div>`;
const AVISO = 'Lo que habría pasado con el mismo dinero, en las mismas fechas. Lo de antes no es un indicador fiable de lo que pasará.';
const REFS = (act = 0) => `<div class="mq-refs">${[['MSCI World', 0], ['S&P 500', 1], ['Stoxx Europe 600', 1], ['60/40', 1], ['Tu propio fondo…', 1]].map(([n, d], i) => `<button type="button" class="mq-ref${i === act ? ' on' : ''}">${n}${d ? CAND : ''}</button>`).join('')}</div>`;

/* ================= 2 · TU CARTERA FRENTE A UN INDEXADO ================= */
const kpisAv = () => pavKpis([
  ['Tu cartera, con tus aportaciones (TIR)', '+6,7 %', 'up', 'al año'],
  ['El indexado, mismas fechas (TIR)', '+8,1 %', 'up', 'al año'],
  ['Alfa', '−1,3 pts', 'down', 'al año, frente a la referencia'],
  ['Beta', '0,91', '', 'se mueve un 9 % menos'],
  ['Tracking error', '6,8 %', '', 'cuánto se separa cada año'],
  ['Ratio de información', '−0,19', 'down', 'la diferencia, por cada punto que se separa'],
], 3);
const tablaAnios = (eurs, mov) => pavTabla(mov ? ['', 'Tú · indexado', 'Diferencia'] : ['', 'Tu cartera', 'Indexado', eurs ? 'Diferencia, €' : 'Diferencia, pts'],
  ANIOS.map(([a, s, t, i, et, ei]) => [`${a}${s ? `<small>${s}</small>` : ''}`, ...(mov ? [`${eur(et)}<small>${eur(ei)}</small>`] : [eurs ? eur(et) : `<b class="${cl(t)}">${sg(t)} %</b>`, eurs ? eur(ei) : `<b class="${cl(i)}">${sg(i)} %</b>`]), eurs ? `<b class="${cl(et - ei)}">${sg(et - ei, 0)} €</b>` : `<b class="${cl(t - i)}">${sg(t - i)}</b>`]));
const RIBBON_IX = (movil) => `<div class="mq-cifras3"><div><small>Has metido</small><b>${eur(AP)}</b></div><div><small>Tu cartera hoy</small><b>${eur(TU)}</b></div><div><small>Mismo dinero en el indexado</small><b>${eur(IX)}</b></div></div>`;

function v2A({ modo, movil }) {
  const graf = lineas([
    { v: apor, col: 'var(--texto-2)', g: 1.4, dash: '5 5', esc: true },
    { v: idx, col: 'var(--texto)', g: 1.8 },
    { v: tu, col: 'var(--grafica)', g: 2.6, relleno: 'color-mix(in srgb, var(--grafica) 14%, transparent)' },
  ], { h: movil ? 190 : 300 });
  const L = ley([['var(--grafica)', 'Tu cartera'], ['var(--texto)', 'Indexado del MSCI World'], ['var(--texto-2)', 'Lo que has metido', 1]]);
  const hero = (modo === 'basico' ? B : T)('c12', modo === 'basico' ? 'Tu cartera y un indexado, con el mismo dinero' : 'Frente a un indexado · mismas aportaciones y fechas',
    `<p class="pab-frase">Con tus mismas aportaciones, un indexado de la bolsa mundial tendría <b>${eur(IX)}</b>. Lo tuyo vale <b>${eur(TU)}</b>: <b class="down">770 € menos</b>.</p>
     ${modo === 'avanzado' ? REFS(0) : ''}<div class="mq-graf">${graf}${EJE}</div>${L}`,
    modo === 'basico' ? `Cada euro que metiste, el mismo día, en un fondo indexado del MSCI World en euros, con su comisión descontada. ${AVISO}` : `Cada aportación y cada retirada, con su fecha, en el ETF de la referencia en euros (dividendos dentro, TER descontada). ${AVISO}`);
  if (modo === 'basico') return [lead('¿Te habría dado lo mismo meterlo todo en un indexado? Con tus fechas y tus euros.'), hero,
    B('c6', 'Año a año', tablaAnios(true, movil), 'Lo que valía cada cosa a final de año.'),
    B('c6', 'Al año', `<p class="pab-grande">+6,7 % <small>tú</small> · +8,1 % <small>indexado</small></p><p class="pab-sub">Contando cuándo entró cada euro. Un año bueno o malo de una sola acción mueve mucho esta cifra.</p>`),
    pregs(['¿Por qué mi cartera va por debajo?', '¿Qué es un indexado?', '¿Qué parte de la diferencia viene de Bitcoin?'])].join('');
  return [hero,
    T('c7', 'Medidas frente a la referencia', kpisAv(), 'Con la serie diaria de los dos desde la primera aportación. Alfa y beta, por regresión; tracking error, la desviación anual de la diferencia; ratio de información, la diferencia anual entre el tracking error.'),
    T('c5', 'Año a año, por tiempo (TWR)', tablaAnios(false), 'La TWR quita el efecto de cuándo aportas: es la que se compara entre años.'),
    T('c12', `Otras referencias ${SELLO()}`, bloq(pavTabla(['Referencia', 'Con tu dinero', 'TIR', 'Diferencia'], [['S&P 500', '25.020 €', '+9,6 %', '−1.640 €'], ['Stoxx Europe 600', '22.310 €', '+4,8 %', '+1.070 €'], ['60/40', '22.040 €', '+4,2 %', '+1.340 €']])), 'Sin ordenar por cuál gana: el orden es el de la lista.')].join('');
}

function v2B({ modo, movil }) {
  // cara a cara: dos columnas grandes y la diferencia en medio
  const cara = `<div class="mq-cara">
    <div class="mq-lado"><small>Tu cartera</small><b class="mq-num">${eur(TU)}</b><span>${pill(17.5)} sobre lo metido · TIR +6,7 % al año</span>
      <div class="mq-barra"><i style="width:${(TU / 25000 * 100).toFixed(1)}%;background:var(--grafica)"></i></div></div>
    <div class="mq-vs"><span>Diferencia</span><b class="down">−770 €</b><small>−3,2 %</small></div>
    <div class="mq-lado"><small>Mismo dinero en un indexado</small><b class="mq-num">${eur(IX)}</b><span>${pill(21.4)} sobre lo metido · TIR +8,1 % al año</span>
      <div class="mq-barra"><i style="width:${(IX / 25000 * 100).toFixed(1)}%;background:var(--texto)"></i></div></div>
  </div><p class="mq-nota-fina">Has metido ${eur(AP)} en 45 meses: ${eur(6700)} al empezar y 300 € al mes desde marzo de 2023.</p>`;
  const barras = `<div class="mq-pares">${ANIOS.map(([a, s, t, i, et, ei]) => {
    const mx = 25000; return `<div class="mq-par"><div class="mq-par-b"><i style="height:${(et / mx * 100).toFixed(1)}%;background:var(--grafica)"><em>${e(et / 1000, 1)}k</em></i><i style="height:${(ei / mx * 100).toFixed(1)}%;background:var(--texto-2)"><em>${e(ei / 1000, 1)}k</em></i></div><b>${a}</b><small class="${cl(et - ei)}">${sg(et - ei, 0)} €</small></div>`;
  }).join('')}</div>${ley([['var(--grafica)', 'Tu cartera'], ['var(--texto-2)', 'Indexado']])}`;
  if (modo === 'basico') return [lead('Lo tuyo frente al mismo dinero en un indexado, cara a cara.'),
    B('c12', 'Cara a cara', cara, `Cada euro que metiste, el mismo día, en un fondo indexado del MSCI World en euros. ${AVISO}`),
    B('c12', 'A final de cada año', barras, 'Lo que valía cada cosa el 31 de diciembre; el último, hoy.'),
    pregs(['¿De dónde sale la diferencia?', '¿Es mucho 770 €?', '¿Qué hay dentro de un MSCI World?'])].join('');
  return [T('c12', 'Frente a un indexado · cara a cara', REFS(0) + cara, `Cada aportación y retirada en el ETF de la referencia, con su fecha. ${AVISO}`),
    T('c6', 'A final de cada año', barras),
    T('c6', 'Medidas frente a la referencia', kpisAv()),
    T('c12', `De dónde sale la diferencia ${SELLO()}`, bloq(`<div>${pavFila('MSCI World Fidelity', 40, 300, 'var(--sube)', '+40 €')}${pavFila('Emergentes', 210, 300, 'var(--baja)', '−210 €')}${pavFila('Oro', 120, 300, 'var(--sube)', '+120 €')}${pavFila('Repsol', 380, 300, 'var(--baja)', '−380 €')}${pavFila('Bitcoin', 340, 300, 'var(--baja)', '−340 €')}</div>`), 'Lo que aporta cada posición a la diferencia, frente a haber tenido ese dinero en la referencia.')].join('');
}

function v2C({ modo, movil }) {
  const area = lineas([{ v: dif }], { h: movil ? 170 : 240, cero: true });
  const marcas = `<div class="mq-hitos"><span style="left:27%">Te adelantas<br><b class="up">+410 €</b></span><span style="left:56%">Caída de abril<br><b class="down">−520 €</b></span><span style="left:94%">Hoy<br><b class="down">−770 €</b></span></div>`;
  const cabeza = `<div class="mq-dif-cab"><div><small>Hoy vas</small><b class="mq-num down">−770 €</b><span>por debajo del indexado</span></div><div class="mq-dif-mini"><span><small>Tú</small><b>${eur(TU)}</b></span><span><small>Indexado</small><b>${eur(IX)}</b></span><span><small>Metido</small><b>${eur(AP)}</b></span></div></div>`;
  const cuerpo = `${cabeza}<div class="mq-graf mq-graf-dif">${marcas}${area}${EJE}</div>${ley([['color-mix(in srgb, var(--sube) 60%, transparent)', 'Por encima del indexado'], ['color-mix(in srgb, var(--baja) 60%, transparent)', 'Por debajo']])}`;
  const lineaT = `<ol class="mq-tl">${[['mar 2023', 'Empiezas con 6.700 € y 300 € al mes', ''], ['dic 2023', 'Vas 160 € por debajo', 'baja'], ['jun 2024', 'Te adelantas: 410 € por encima', 'sube'], ['abr 2025', 'La caída de abril: 520 € por debajo', 'baja'], ['hoy', '770 € por debajo', 'baja']].map(([f, t, c]) => `<li><time>${f}</time><span class="${c}">${t}</span></li>`).join('')}</ol>`;
  if (modo === 'basico') return [lead('La distancia entre lo tuyo y un indexado, mes a mes.'),
    B('c12', '¿Por encima o por debajo?', cuerpo, `Cada mes, lo que valía lo tuyo menos lo que valdría el mismo dinero en un indexado del MSCI World. ${AVISO}`),
    B('c12', 'Los momentos', lineaT),
    pregs(['¿Por qué me adelanté en 2024?', '¿Qué pasó en abril de 2025?', '¿Cómo lo calculas?'])].join('');
  return [T('c8', 'Frente a un indexado · la diferencia en el tiempo', REFS(0) + cuerpo, `Cada mes, valor de tu cartera menos el de las mismas aportaciones en el ETF de la referencia. ${AVISO}`),
    T('c4', 'Los momentos', lineaT),
    T('c7', 'Medidas frente a la referencia', kpisAv()),
    T('c5', `Captura en subidas y bajadas ${SELLO()}`, bloq(pavKpis([['En los meses de subida', '88 %', '', 'de lo que sube la referencia'], ['En los meses de bajada', '79 %', '', 'de lo que baja']], 2)))].join('');
}

/* ================= 1 · LISTA DE SEGUIMIENTO ================= */
const SIG = [
  ['IBE', 'Iberdrola', 'Acción · Madrid', 16.42, 0.8, 'España', 'Eléctricas', '0,1 %', 17.8, 16, -3, 11],
  ['ITX', 'Inditex', 'Acción · Madrid', 49.86, -0.6, 'España', 'Consumo', '0 %', 24.1, 22, -11, 23],
  ['ASML', 'ASML', 'Acción · Ámsterdam', 712.4, 1.9, 'Países Bajos', 'Tecnología', '0,4 %', 31.5, 38, -24, 37],
  ['CSPX', 'iShares Core S&P 500', 'ETF · Ámsterdam', 598.3, 0.4, 'EE. UU.', 'Varios', '71 %', null, 15, -2, 41],
  ['WLDS', 'Vanguard Global Small-Cap', 'Fondo · MyInvestor', 312.15, -0.3, 'Mundo', 'Varios', '8 %', null, 18, -6, 52],
  ['MEUD', 'Amundi Stoxx Europe 600', 'ETF · París', 268.9, 0.2, 'Europa', 'Varios', '15 %', null, 13, -1, 64],
  ['MSFT', 'Microsoft', 'Acción · Nasdaq', 412.3, -1.1, 'EE. UU.', 'Tecnología', '4,6 %', 33.2, 24, -9, 75],
];
const logo = (s) => `<span class="mq-logo">${s.slice(0, 2)}</span>`;
const EVENTOS = [['10', 'dic', 'Inditex', 'Resultados del tercer trimestre'], ['9', 'ene', 'Iberdrola', 'Fecha ex-dividendo · 0,25 € por acción'], ['21', 'ene', 'ASML', 'Resultados del cuarto trimestre'], ['28', 'ene', 'Microsoft', 'Resultados']];
const supondria = (i = 3) => {
  const x = SIG[i];
  return `<div class="mq-sup"><p class="mq-sup-t">Si metieras 1.000 € en <b>${x[1]}</b></p>
  ${pavKpis([['Pesaría', '4,1 %', '', 'de tu cartera'], ['Se solapa con lo que tienes', x[7], '', x[0] === 'CSPX' ? 'con MSCI World Fidelity' : 'de forma indirecta'], ['País', x[5]], ['Sector', x[6]]], 2)}
  ${x[0] === 'CSPX' ? '<p class="mq-nota-fina">Un ETF del S&P 500 se solapa casi entero con un MSCI World: unas 500 empresas son las mismas.</p>' : ''}</div>`;
};
const contador = (n = 7) => `<span class="mq-cont">${n} de 10 ${CAND}<small>sin límite con Dorado</small></span>`;
const LISTAS = (av) => `<div class="mq-listas"><button class="mq-ref on">Mi lista</button>${av ? `<button class="mq-ref">Dividendos${CAND}</button><button class="mq-ref">Por si baja${CAND}</button>` : ''}<button class="mq-ref mq-nueva">${IC('suma')}Nueva lista${av ? CAND : ''}</button></div>`;

function v1A({ modo, movil }) {
  const av = modo === 'avanzado';
  const cab = movil ? ['Nombre', 'Precio · hoy'] : av ? ['Nombre', 'Precio', 'Hoy', '1 mes', `PER ${CAND}`, 'Volatilidad', 'Del máximo'] : ['Nombre', 'Precio', 'Hoy'];
  const filas = SIG.map((x, i) => `<tr class="${i === 3 && !movil ? 'mq-sel' : ''}"><td><div class="mq-nom">${logo(x[0])}<span><b>${x[1]}</b><small>${x[2]}</small></span></div></td>${movil ? `<td><b>${eur(x[3], 2)}</b><br>${pill(x[4])}</td>` : `<td>${eur(x[3], 2)}</td><td>${pill(x[4])}</td>`}${av && !movil ? `<td>${spark(x[11], x[4] >= 0, 90, 26)}</td><td class="mq-difu">${x[8] ? e(x[8], 1) : '—'}</td><td>${x[9]} %</td><td class="down">${x[10]} %</td>` : ''}</tr>`).join('');
  const tabla = `<div class="pav-tabla mq-tabla-sig"><table><thead><tr>${cab.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;
  const cabecera = `<div class="mq-sig-cab">${LISTAS(av)}${contador()}</div>`;
  if (movil) return [lead('Lo que sigues sin tenerlo: su precio y lo que supondría en tu cartera.'),
    B('c12', 'Mi lista', cabecera + tabla, 'Lo que sigues no es una recomendación: es tu lista. Los precios, con 15 minutos de retraso.'),
    B('c12', 'Lo que supondría: iShares Core S&P 500', supondria(3)), pregs(['¿Qué ha pasado hoy con lo que sigo?', '¿Se parece algo de mi lista a lo que ya tengo?'])].join('');
  return [T('c12', 'Mi lista', cabecera + tabla, av ? 'Elige las columnas con «Columnas». Los múltiplos salen de datos con licencia: van con Toisón Dorado.' : ''),
    T('c5', 'Lo que supondría en tu cartera', supondria(3) + `<div class="mq-ev-mini"><small>Lo que viene</small><p><b>No hay fechas</b> de este ETF en los próximos 30 días.</p></div>`),
    T('c7', 'Lo que la IA ha leído hoy de lo que sigues', `<ul class="pav-lista">${[['ASML', 'El sector de chips en Europa, al alza hoy. Tres noticias de la mañana, resumidas.'], ['Inditex', 'Antes de sus resultados del 10 de diciembre: lo que se espera, sin opinión.'], ['Microsoft', 'Sin noticias que muevan hoy el precio.']].map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul>`)].join('');
}

function v1B({ modo, movil }) {
  const av = modo === 'avanzado';
  const tarj = SIG.map((x, i) => `<article class="mq-tj">
    <header>${logo(x[0])}<span><b>${x[1]}</b><small>${x[2]}</small></span></header>
    <div class="mq-tj-p"><b class="mq-num-m">${eur(x[3], 2)}</b>${pill(x[4])}</div>${spark(x[11], x[4] >= 0, 260, 44)}
    <footer><span><small>Pesaría</small>${i === 3 ? '4,1 %' : '4,1 %'}</span><span><small>Solape</small>${x[7]}</span>${av ? `<span><small>Volat.</small>${x[9]} %</span><span><small>Del máx.</small><em class="down">${x[10]} %</em></span>` : `<span><small>País</small>${x[5]}</span>`}</footer></article>`).join('');
  const nueva = `<article class="mq-tj mq-tj-nueva"><span>${IC('suma')}</span><b>Seguir otra</b><small>Quedan 3 de 10 · sin límite con Dorado ${CAND}</small></article>`;
  const cuerpo = `<div class="mq-sig-cab">${LISTAS(av)}${contador()}</div><div class="mq-rejilla">${tarj}${nueva}</div>`;
  if (movil) return [lead('Lo que sigues sin tenerlo, en tarjetas.'), B('c12', 'Mi lista', cuerpo, '«Pesaría» es lo que sería en tu cartera si metieras 1.000 €; «solape», cuánto se repite con lo que ya tienes. No es una recomendación.')].join('');
  return [T('c12', 'Mi lista · en tarjetas', cuerpo, '«Pesaría»: lo que sería en tu cartera con 1.000 €. «Solape»: cuánto de su contenido ya tienes por tus fondos.')].join('');
}

function v1C({ modo, movil }) {
  const av = modo === 'avanzado';
  const lista = `<div class="mq-compacta">${SIG.map((x) => `<div class="mq-c-fila">${logo(x[0])}<span class="mq-c-n"><b>${x[1]}</b><small>${x[5]} · ${x[6]}</small></span>${spark(x[11], x[4] >= 0, 70, 22)}<span class="mq-c-p"><b>${eur(x[3], 2)}</b>${pill(x[4])}</span></div>`).join('')}</div>`;
  const cal = `<div class="mq-cal">${EVENTOS.map(([d, m, q, t]) => `<div class="mq-ev"><div class="mq-dia"><b>${d}</b><small>${m}</small></div><div><b>${q}</b><span>${t}</span></div></div>`).join('')}</div>`;
  const ia = `<div class="mq-ia-caja"><div class="mq-ia-cab">${IC('asistente')}<b>La IA, sobre tu lista</b><small>hace 20 min</small></div><p>De lo que sigues, hoy se mueve sobre todo <b>ASML</b> (${pill(1.9)}), con el resto del sector de chips en Europa. <b>Inditex</b> presenta resultados en dos días. Del <b>S&P 500</b>: un 71 % de lo que lleva ya lo tienes por tu fondo del MSCI World.</p></div>`;
  if (movil) return [lead('Lo que sigues, lo que viene y lo que ha pasado.'), B('c12', 'Hoy en tu lista', ia), B('c12', `Mi lista ${contador()}`, lista), B('c12', 'Lo que viene', cal, 'Resultados y dividendos de lo que sigues; también salen en el Calendario.')].join('');
  return [T('c5', `Mi lista ${contador()}`, `${LISTAS(av)}${lista}`), T('c7', 'Hoy en tu lista', ia + `<div class="mq-sep"></div><div class="pav-et" style="margin-top:14px"><h2>Lo que viene · próximos 90 días</h2></div>${cal}`)].join('');
}

/* ================= 11 · ENTIENDE TU CARTERA (solo básico) ================= */
const FRASES = [
  ['Tienes <b>23.380 €</b> en 5 cosas. Casi la mitad, el <b>48 %</b>, está en un solo fondo: el MSCI World Fidelity, que reparte ese dinero entre unas 1.400 empresas.', 'Qué es un fondo indexado'],
  ['Unos <b>dos tercios</b> de tu dinero están en empresas de <b>Estados Unidos</b>, sobre todo a través de ese fondo.', 'Por qué un fondo «mundial» es tan de EE. UU.'],
  ['Pagas unos <b>31 € al año</b> en comisiones de fondos. No te los cobran aparte: van descontados del precio.', 'Qué es la TER'],
  ['Si lo vendieras todo hoy ganarías <b>3.480 €</b>, y Hacienda se quedaría con unos <b>660 €</b>.', 'Cómo tributa lo que ganas'],
  ['Lo que más se mueve es <b>Bitcoin</b>: es el 9 % de lo que tienes y explica casi un tercio de los vaivenes.', 'Qué es la volatilidad'],
];
const LECC = [
  ['Qué es la TER', 'Tu MSCI World cobra un 0,12 %: unos 13 € al año con lo que tienes.', 'Costes', 1],
  ['Acumulación o reparto', 'Tus dos fondos acumulan: los dividendos se quedan dentro y no tributan hasta que vendas.', 'Fondos', 1],
  ['Traspasar sin pagar impuestos', 'Tus fondos de MyInvestor se pueden traspasar; el oro, Repsol y Bitcoin no.', 'Hacienda', 0],
  ['Qué es un ETC', 'Tu oro es un ETC: sigue el precio del oro sin que tengas lingotes.', 'Productos', 0],
  ['Dividendos y retención', 'Repsol te paga dos veces al año; Hacienda se queda un 19 % al cobrarlo.', 'Hacienda', 1],
  ['La regla de los dos meses', 'Si vendes con pérdidas y recompras antes de dos meses, esa pérdida espera.', 'Hacienda', 0],
  ['Volatilidad', 'Bitcoin se mueve unas cinco veces más que tu fondo.', 'Riesgo', 0],
  ['La divisa dentro de un fondo en euros', 'Tu MSCI World está en euros, pero compra en dólares.', 'Riesgo', 0],
  ['TWR y TIR', 'Por qué tu «+17,5 %» y tu «+6,7 % al año» son las dos ciertas.', 'Rentabilidad', 1],
];
const lecTj = ([t, d, g, vista], dest) => `<article class="mq-lec${dest ? ' mq-lec-dest' : ''}"><small>${g}${vista ? ' · leída' : ''}</small><b>${t}</b><p>${d}</p><span class="mq-lec-ir">${vista ? 'Repasar' : 'Leer · 2 min'} ›</span></article>`;
const ROM = ['I', 'II', 'III', 'IV', 'V'];

function v11A({ movil }) {
  const frases = `<ol class="mq-frases">${FRASES.map(([f, l], i) => `<li><span class="mq-rom">${ROM[i]}</span><div><p>${f}</p><a class="mq-enl">${l} ›</a></div></li>`).join('')}</ol>`;
  return [lead('Tu cartera, en cinco frases. Cada una lleva a una explicación corta con tus números.'),
    B(movil ? 'c12' : 'c7', 'Tu cartera, explicada', frases, 'Se rehace cada vez que cambia tu cartera. Es formación general: no te dice qué hacer.'),
    B(movil ? 'c12' : 'c5', 'Para seguir', `<div class="mq-lecs-col">${LECC.slice(0, movil ? 3 : 4).map((x) => lecTj(x)).join('')}</div><p class="mq-nota-fina">4 de 20 leídas</p>`)].join('');
}
function v11B({ movil }) {
  const grupos = ['Todas', 'Costes', 'Fondos', 'Hacienda', 'Riesgo', 'Rentabilidad'];
  const filtros = `<div class="mq-listas">${grupos.map((g, i) => `<button class="mq-ref${i ? '' : ' on'}">${g}</button>`).join('')}</div>`;
  const dest = `<div class="mq-dest"><small>Para ti ahora</small><b>Traspasar sin pagar impuestos</b><p>Tienes 14.420 € en dos fondos de MyInvestor. Si un día quieres cambiar de fondo, se puede pasar el dinero de uno a otro sin vender y sin pasar por Hacienda. Con el oro, Repsol o Bitcoin no se puede.</p><button class="btn pri">Leer · 2 min</button></div>`;
  const prog = `<div class="mq-prog"><div class="mq-prog-b"><i style="width:20%"></i></div><span>4 de 20 leídas</span></div>`;
  return [lead('Lecciones cortas que salen cuando tu cartera las toca, con tus cifras.'),
    B('c12', 'Entiende tu cartera', `${prog}${dest}${filtros}<div class="mq-rejilla mq-rej-lec">${LECC.slice(0, movil ? 4 : 9).map((x) => lecTj(x)).join('')}</div>`, 'Formación general con los números de tu cartera. No te dice qué comprar ni qué vender.')].join('');
}
function v11C({ movil }) {
  const caps = [['I', 'Lo que tienes', 'Fondos, acciones, oro y cripto', 3, 3], ['II', 'Lo que te cuesta', 'TER, comisiones y divisa', 1, 3], ['III', 'Lo que ganas', 'TWR, TIR y por qué no coinciden', 0, 4], ['IV', 'Hacienda', 'Ventas, dividendos y traspasos', 0, 5], ['V', 'El riesgo', 'Vaivenes, caídas y diversificar', 0, 5]];
  const indice = `<ol class="mq-indice">${caps.map(([r, t, d, h, n], i) => `<li class="${i === 1 ? 'on' : ''}"><span class="mq-rom">${r}</span><div><b>${t}</b><small>${d}</small></div><em>${h} / ${n}</em></li>`).join('')}</ol>`;
  const pag = `<article class="mq-pag"><small>II · Lo que te cuesta · 2 de 3</small><h3>Qué es la TER</h3>
    <p>Cada fondo se cobra un tanto por ciento al año por gestionarlo: la TER. No llega como un cargo aparte; se descuenta poco a poco del precio, por eso no la ves.</p>
    <div class="mq-pag-tus"><small>Con tus números</small>${pavKpis([['MSCI World Fidelity', '0,12 %', '', '≈ 13 € al año'], ['Emergentes', '0,58 %', '', '≈ 18 € al año'], ['Tus fondos, en total', '≈ 31 €', '', 'al año'], ['En 20 años, si no cambia', '≈ 900 €', '', 'contando lo que dejan de ganar']], 2)}</div>
    <p>El de emergentes cobra casi cinco veces más que el del MSCI World por cada euro: es normal en fondos de países emergentes, que son más caros de llevar.</p>
    <div class="mq-pag-pie"><button class="btn">‹ Anterior</button><button class="btn pri">Siguiente: comisiones del bróker ›</button></div></article>`;
  if (movil) return [lead('Un pequeño libro de tu cartera, por capítulos.'), B('c12', 'Índice', indice), `<section class="pav-t pab pav-c12">${pag}</section>`].join('');
  return [lead('Un pequeño libro de tu cartera, por capítulos. Cada página usa tus números.'), B('c4', 'Índice', indice + `<p class="mq-nota-fina">4 de 20 páginas leídas</p>`), `<section class="pav-t pab pav-c8">${pag}</section>`].join('');
}

/* ================= VERSIONES FINALES (8 nov, noche; 2.ª vuelta con lo que dijo Carlos a las 20:04): 2X, 1X y 11X ================= */
const OK = () => IC('ok') || '✓';
const kEur = (v) => e(Math.round(v / 1000), 0) + 'k';
const dEur = (v) => sg(Math.round(v / 10) * 10, 0) + ' €';
const EJE_E = `<div class="mq-eje mq-eje-esc">${['mar 2023', 'ene 2024', 'ene 2025', 'ene 2026', 'hoy'].map((m) => `<span>${m}</span>`).join('')}</div>`;

/* ---- 2X: ordenador con una tarjeta grande de todo el ancho; móvil en tres tarjetas ---- */
const X_GRAF2 = (h) => lineas([
  { v: apor, col: 'var(--texto-2)', g: 1.4, dash: '5 5', esc: true },
  { v: idx, col: 'var(--texto)', g: 1.8 },
  { v: tu, col: 'var(--grafica)', g: 2.6, relleno: 'color-mix(in srgb, var(--grafica) 14%, transparent)' },
], { h, escala: kEur, min: 5655.17, max: 26344.83 }) + EJE_E + ley([['var(--grafica)', 'Tu cartera'], ['var(--texto)', 'Indexado del MSCI World'], ['var(--texto-2)', 'Lo que has metido', 1]]);
const X_HITOS = `<div class="mq-hitos mq-hitos-esc"><span style="left:27%">Te adelantas<br><b class="up">+410 €</b></span><span style="left:56%">Caída de abril<br><b class="down">−520 €</b></span><span style="left:94%">Hoy<br><b class="down">−770 €</b></span></div>`;
const X_DIFG = (h) => `<div class="mq-graf mq-graf-dif">${X_HITOS}${lineas([{ v: dif }], { h, cero: true, escala: dEur, min: -889.655, max: 489.655 })}${EJE_E}</div>${ley([['color-mix(in srgb, var(--sube) 60%, transparent)', 'Por encima del indexado'], ['color-mix(in srgb, var(--baja) 60%, transparent)', 'Por debajo']])}`;
const BOLA = (grande) => `<div class="mq-vs mq-bola${grande ? ' g' : ''}"><span>Diferencia</span><b class="down">−770 €</b><small>−3,2 %</small></div>`;
const X_CIFRAS = `<dl class="mq-cifl"><div><dt>Has metido</dt><dd>${eur(AP)}</dd></div><div><dt>Tu cartera</dt><dd>${eur(TU)}</dd></div><div><dt>Mismo dinero en el indexado</dt><dd>${eur(IX)}</dd></div><div><dt>Al año, contando cuándo entró cada euro</dt><dd>+6,7 % <small>tú</small> · +8,1 % <small>indexado</small></dd></div></dl>`;
const X_BARRAS = () => `<div class="mq-pares">${ANIOS.map(([a, s, t, i, et, ei]) => `<div class="mq-par"><div class="mq-par-b"><i style="height:${(et / 25000 * 100).toFixed(1)}%;background:var(--grafica)"><em>${e(et / 1000, 1)}k</em></i><i style="height:${(ei / 25000 * 100).toFixed(1)}%;background:var(--texto-2)"><em>${e(ei / 1000, 1)}k</em></i></div><b>${a}</b><small class="${cl(et - ei)}">${sg(et - ei, 0)} €</small></div>`).join('')}</div>${ley([['var(--grafica)', 'Tu cartera'], ['var(--texto-2)', 'Indexado']])}`;
const X_MOMENTOS = () => `<ol class="mq-tl">${[['mar 2023', 'Empiezas con 6.700 € y 300 € al mes', ''], ['dic 2023', 'Vas 160 € por debajo: Repsol y los emergentes suben menos', 'down'], ['jun 2024', 'Te adelantas 410 €: el oro y Bitcoin tiran de lo tuyo', 'up'], ['abr 2025', 'La caída de abril: 520 € por debajo; Bitcoin cae más que la bolsa', 'down'], ['ene 2026', 'Casi a la par: 150 € por debajo', 'down'], ['hoy', '770 € por debajo', 'down']].map(([f, t, c]) => `<li><time>${f}</time><span class="${c}">${t}</span></li>`).join('')}</ol>`;

function v2X({ modo, movil }) {
  if (movil || modo === 'basico') return [lead('¿Te habría dado lo mismo meterlo todo en un indexado? Con tus fechas y tus euros.'),
    B('c12', '¿Por encima o por debajo?', `<div class="mq-bola-fila">${BOLA(true)}<div class="mq-dif-mini mq-dif-col"><span><small>Tú</small><b>${eur(TU)}</b></span><span><small>Indexado</small><b>${eur(IX)}</b></span><span><small>Has metido</small><b>${eur(AP)}</b></span></div></div>${X_DIFG(180)}`, `Cada mes, lo tuyo menos lo que valdría el mismo dinero, en las mismas fechas, en un fondo indexado del MSCI World en euros. ${AVISO}`),
    B('c12', 'Tu cartera y el indexado', `<div class="mq-graf">${X_GRAF2(190)}</div>`, 'La línea de puntos es lo que has ido metiendo; las otras dos, lo que valía cada cosa.'),
    B('c12', 'A final de cada año', X_BARRAS() + '<p class="mq-nota-fina"><a class="mq-enl">Verlo en tabla ›</a></p>', 'Lo que valía cada cosa el 31 de diciembre; el último, hoy.'),
    pregs(['¿Por qué mi cartera va por debajo?', '¿Qué pasó en abril de 2025?'])].join('');
  return [
    T('c12', 'Frente a un indexado · mismas aportaciones y fechas', `${REFS(0)}<div class="mq-hero"><div><p class="mq-hero-frase">Con tus mismas aportaciones, un indexado de la bolsa mundial tendría <b>${eur(IX)}</b>. Lo tuyo vale <b>${eur(TU)}</b>: <b class="down">770 € menos</b>.</p><div class="mq-graf">${X_GRAF2(300)}</div></div><aside class="mq-hero-lado">${BOLA(true)}${X_CIFRAS}</aside></div>`, `Cada aportación y cada retirada, con su fecha, en el ETF de la referencia en euros (dividendos dentro, TER descontada). ${AVISO}`),
    T('c8', 'La diferencia en el tiempo', `<div class="mq-dif-cab"><div><small>Hoy vas</small><b class="mq-num down">−770 €</b><span>por debajo del indexado, con el mismo dinero</span></div></div>${X_DIFG(220)}`, 'Cada mes, valor de tu cartera menos el de las mismas aportaciones en la referencia.', 'mq-igual'),
    T('c4', 'Los momentos', X_MOMENTOS(), '', 'mq-igual'),
    T('c6', 'A final de cada año', X_BARRAS(), 'Lo que valía cada cosa el 31 de diciembre; el último, hoy.', 'mq-igual'),
    T('c6', 'Año a año, por tiempo (TWR)', tablaAnios(false), 'La TWR quita el efecto de cuándo aportas: es la que se compara entre años.', 'mq-igual'),
    T('c12', 'Medidas frente a la referencia', pavKpis([
      ['Tu cartera (TIR)', '+6,7 %', 'up', 'al año, con tus aportaciones'], ['El indexado (TIR)', '+8,1 %', 'up', 'mismas fechas'],
      ['Alfa', '−1,3 pts', 'down', 'al año, frente a la referencia'], ['Beta', '0,91', '', 'se mueve un 9 % menos'],
      ['Tracking error', '6,8 %', '', 'cuánto se separa cada año'], ['Ratio de información', '−0,19', 'down', 'la diferencia por punto que se separa']], 6),
      'Con la serie diaria de los dos desde la primera aportación. Alfa y beta, por regresión; tracking error, la desviación anual de la diferencia.'),
    T('c4', `Otras referencias ${SELLO()}`, bloq(pavTabla(['Referencia', 'Con tu dinero', 'Diferencia'], [['S&P 500', '25.020 €', '−1.640 €'], ['Stoxx Europe 600', '22.310 €', '+1.070 €'], ['60/40', '22.040 €', '+1.340 €']])), 'Sin ordenar por cuál gana.', 'mq-igual'),
    T('c4', `De dónde sale la diferencia ${SELLO()}`, bloq(`<div>${pavFila('MSCI World Fidelity', 40, 300, 'var(--sube)', '+40 €')}${pavFila('Emergentes', 210, 300, 'var(--baja)', '−210 €')}${pavFila('Repsol', 380, 300, 'var(--baja)', '−380 €')}${pavFila('Bitcoin', 340, 300, 'var(--baja)', '−340 €')}</div>`), 'Lo que aporta cada posición.', 'mq-igual'),
    T('c4', `Captura en subidas y bajadas ${SELLO()}`, bloq(pavKpis([['En los meses de subida', '88 %', '', 'de lo que sube'], ['En los de bajada', '79 %', '', 'de lo que baja']], 2)), '', 'mq-igual'),
  ].join('');
}

/* ---- 1X: en el ordenador, conmutador Tabla | Tarjetas y los dos paneles de abajo a la par; en el móvil, solo tabla ---- */
const CONM = (act) => `<div class="mq-conm" role="group" aria-label="Vista"><span>Vista</span><button type="button" aria-pressed="${act === 'tabla'}">Tabla</button><button type="button" aria-pressed="${act === 'tarjetas'}">Tarjetas</button></div>`;
function v1X({ modo, movil }, vista = 'tabla') {
  if (movil) return v1A({ modo, movil });
  const av = modo === 'avanzado';
  const der = `<div class="mq-sig-der">${CONM(vista)}${vista === 'tabla' && av ? `<button type="button" class="mq-ref">${IC('ajustes')}Columnas</button>` : ''}${contador()}</div>`;
  const cabecera = `<div class="mq-sig-cab">${LISTAS(av)}${der}</div>`;
  let cuerpo;
  if (vista === 'tabla') {
    const cab = av ? ['Nombre', 'Precio', 'Hoy', '1 mes', `PER ${CAND}`, 'Volatilidad', 'Del máximo'] : ['Nombre', 'Precio', 'Hoy'];
    const filas = SIG.map((x, i) => `<tr class="${i === 3 ? 'mq-sel' : ''}"><td><div class="mq-nom">${logo(x[0])}<span><b>${x[1]}</b><small>${x[2]}</small></span></div></td><td>${eur(x[3], 2)}</td><td>${pill(x[4])}</td>${av ? `<td>${spark(x[11], x[4] >= 0, 90, 26)}</td><td class="mq-difu">${x[8] ? e(x[8], 1) : '—'}</td><td>${x[9]} %</td><td class="down">${x[10]} %</td>` : ''}</tr>`).join('');
    cuerpo = `<div class="pav-tabla mq-tabla-sig"><table><thead><tr>${cab.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;
  } else {
    const tarj = SIG.map((x, i) => `<article class="mq-tj${i === 3 ? ' mq-sel' : ''}">
      <header>${logo(x[0])}<span><b>${x[1]}</b><small>${x[2]}</small></span></header>
      <div class="mq-tj-p"><b class="mq-num-m">${eur(x[3], 2)}</b>${pill(x[4])}</div>${spark(x[11], x[4] >= 0, 260, 44)}
      <footer><span><small>Pesaría</small>4,1 %</span><span><small>Solape</small>${x[7]}</span>${av ? `<span><small>Volat.</small>${x[9]} %</span><span><small>Del máx.</small><em class="down">${x[10]} %</em></span>` : `<span><small>País</small>${x[5]}</span>`}</footer></article>`).join('');
    const nueva = `<article class="mq-tj mq-tj-nueva"><span>${IC('suma')}</span><b>Seguir otra</b><small>Quedan 3 de 10 · sin límite con Dorado ${CAND}</small></article>`;
    cuerpo = `<div class="mq-rejilla">${tarj}${nueva}</div>`;
  }
  const como = vista === 'tabla'
    ? 'Tabla o tarjetas: se queda la que elijas. «Columnas» elige lo que ves; los múltiplos salen de datos con licencia y van con Toisón Dorado.'
    : 'Tabla o tarjetas: se queda la que elijas. «Pesaría»: lo que sería en tu cartera con 1.000 €. «Solape»: cuánto de su contenido ya tienes por tus fondos.';
  const x = SIG[3];
  const sup = `<p class="mq-sup-t">Si metieras 1.000 € en <b>${x[1]}</b></p>${pavKpis([['Pesaría', '4,1 %', '', 'de tu cartera'], ['Solape', x[7], '', 'con tu MSCI World'], ['País', x[5]], ['Sector', x[6]]], 4)}<p class="mq-nota-fina">Un ETF del S&P 500 se solapa casi entero con un MSCI World: unas 500 empresas son las mismas. No hay fechas de este ETF en los próximos 30 días.</p>`;
  const ia = `<ul class="pav-lista">${[['ASML', 'El sector de chips en Europa, al alza hoy. Tres noticias de la mañana, resumidas.'], ['Inditex', 'Antes de sus resultados del 10 de diciembre: lo que se espera, sin opinión.'], ['Microsoft', 'Sin noticias que muevan hoy el precio.']].map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul><div class="mq-ev-mini"><small>Lo que viene</small><p><b>10 dic</b> · resultados de Inditex &nbsp;·&nbsp; <b>9 ene</b> · ex-dividendo de Iberdrola</p></div>`;
  return [T('c12', 'Mi lista', cabecera + cuerpo, como),
    T('c6', 'Lo que supondría en tu cartera', sup, '', 'mq-igual'),
    T('c6', 'Lo que la IA ha leído hoy de lo que sigues', ia, '', 'mq-igual')].join('');
}

/* ---- 11X: libro, con «Para ti ahora» y el avance en una tira pequeña, y la lección más grande ---- */
const CAPS = [
  ['I', 'Lo que tienes', 'Fondos, acciones, oro y cripto', [['Qué es un fondo indexado', 1], ['Qué es un ETC', 1], ['Acciones y cripto', 1]]],
  ['II', 'Lo que te cuesta', 'TER, comisiones y divisa', [['Qué es la TER', 1], ['Comisiones del bróker', 0], ['La divisa dentro de un fondo', 0]]],
  ['III', 'Lo que ganas', 'TWR, TIR y por qué no coinciden', [['TWR y TIR', 0], ['Lo ganado y lo cobrado', 0], ['Dividendos', 0], ['Frente a un indexado', 0]]],
  ['IV', 'Hacienda', 'Ventas, dividendos y traspasos', [['Cómo tributa lo que ganas', 0], ['Traspasar sin pagar impuestos', 0], ['Dividendos y retención', 0], ['La regla de los dos meses', 0], ['La renta, paso a paso', 0]]],
  ['V', 'El riesgo', 'Vaivenes, caídas y diversificar', [['Volatilidad', 0], ['Las caídas', 0], ['Diversificar', 0], ['Mucho en un solo sitio', 0], ['El dinero que puedes necesitar', 0]]],
];
const LEIDAS = CAPS.reduce((s, c) => s + c[3].filter((x) => x[1]).length, 0), TOTAL = CAPS.reduce((s, c) => s + c[3].length, 0);
const X_TIRA = (movil) => `<div class="mq-tira">
  <div class="mq-tira-d"><small>Para ti ahora</small><b>Traspasar sin pagar impuestos</b>${movil ? '' : '<span>Tus dos fondos de MyInvestor se pueden traspasar sin pasar por Hacienda.</span>'}</div>
  <button class="btn pri">Leer · 2 min</button>
  <div class="mq-tira-a"><span><b>${LEIDAS} de ${TOTAL}</b> lecciones</span><div class="mq-prog-b"><i style="width:${(LEIDAS / TOTAL * 100).toFixed(0)}%"></i></div><a>Sigue: comisiones del bróker ›</a></div>
</div>`;
const X_INDICE = (movil, abierto = 1, aqui = 0) => `<div class="mq-ix${movil ? ' mq-ixm' : ''}">${CAPS.map(([r, t, d, ls], i) => {
  const h = ls.filter((x) => x[1]).length, n = ls.length;
  const fila = `<div class="mq-ixf${i === abierto ? ' on' : ''}${h === n ? ' lleno' : ''}"><span class="mq-rom">${r}</span><div class="mq-ixt"><b>${t}</b>${movil ? `<small>${d}</small>` : ''}<span class="mq-capb"><i style="width:${(h / n * 100).toFixed(0)}%"></i></span></div><em>${h === n ? OK() : ''}${h} / ${n}${movil ? '<span class="mq-chev">' + (i === abierto ? '⌄' : '›') + '</span>' : ''}</em></div>`;
  const subs = i === abierto ? `<div class="mq-subs">${ls.map(([lt, si], k) => `<div class="mq-sub${!movil && k === aqui ? ' on' : ''}"><span class="mq-ck${si ? ' si' : ''}">${si ? OK() : ''}</span><span class="mq-subt">${lt}</span>${movil ? `<em>${si ? 'leída' : (k === 1 ? '3 min' : '2 min')}</em>` : ''}</div>`).join('')}</div>` : '';
  return fila + subs;
}).join('')}</div>`;
const X_PAG = (movil) => `<article class="mq-pag mq-pag-g"><div class="mq-pag-cab"><small>II · Lo que te cuesta · 1 de 3</small><span class="mq-leida">${OK()}Leída</span></div><h3>Qué es la TER</h3>
    <p>Cada fondo se cobra un tanto por ciento al año por gestionarlo: la TER. No llega como un cargo aparte; se descuenta poco a poco del precio del fondo, día a día, y por eso no la ves en ningún extracto.</p>
    <div class="mq-pag-tus"><small>Con tus números</small>${pavKpis([['MSCI World Fidelity', '0,12 %', '', '≈ 13 € al año'], ['Emergentes', '0,58 %', '', '≈ 18 € al año'], ['Tus fondos, en total', '≈ 31 €', '', 'al año'], ['En 20 años, si no cambia', '≈ 900 €', '', 'contando lo que dejan de ganar']], movil ? 2 : 4)}</div>
    <p>El de emergentes cobra casi cinco veces más que el del MSCI World por cada euro. Es normal en fondos de países emergentes, que son más caros de llevar, pero conviene saberlo: con la misma cantidad, uno te cuesta 0,12 € de cada 100 y el otro 0,58 €.</p>
    <p class="mq-pag-ej"><b>Un ejemplo.</b> Si tu fondo sube un 8 % en un año y su TER es del 0,12 %, lo que ves en la app ya es el 8 % con la comisión quitada. No tienes que restarla tú.</p>
    <div class="mq-pag-av"><span class="mq-puntos"><i class="si aqui"></i><i></i><i></i></span><span>1 de 3 leídas en este capítulo · ${LEIDAS} de ${TOTAL} en total</span></div>
    <div class="mq-pag-pie"><button class="btn">${movil ? '‹ Volver al índice' : '‹ Capítulo I'}</button><button class="btn pri">Siguiente: comisiones del bróker ›</button></div></article>`;

function v11X({ movil }, vista = 'indice') {
  if (movil && vista === 'leccion') return [`<section class="pav-t pab pav-c12 mq-leccion">${X_PAG(true)}</section>`,
    pregs(['¿Cuánto me cuesta a mí en total?', '¿Es cara la TER de mis emergentes?'])].join('');
  if (movil) return [lead('Un pequeño libro de tu cartera, por capítulos. Cada lección usa tus números.'),
    `<section class="pav-t pab pav-c12 mq-tira-s">${X_TIRA(true)}</section>`,
    B('c12', 'Capítulos', X_INDICE(true, 1) + '<p class="mq-nota-fina">Toca un capítulo para ver sus lecciones y una lección para leerla. Formación general con tus números: no te dice qué hacer.</p>')].join('');
  return [`<section class="pav-t pab pav-c12 mq-tira-s">${X_TIRA(false)}</section>`,
    B('c3', 'Índice', X_INDICE(false, 1, 0) + '<p class="mq-nota-fina">Formación general con tus números: no te dice qué hacer.</p>'),
    `<section class="pav-t pab pav-c9">${X_PAG(false)}</section>`].join('');
}

/* ---------- la navegación de cada pestaña ---------- */
const NAV = {
  '2': { sec: 'Rendimiento', riel: 'Rendimiento', k2: ['Rentabilidad', 'Frente a un indexado', 'Dividendos', 'Costes', 'La IA explica'], k2act: 1, pc: 'Frente a un indexado', movil: 'Análisis', sub: 'Todo el detalle de tu cartera, por dentro.', pest: ['Posiciones', 'Rentabilidad', 'Riesgo', 'Reparto'], pestAct: 1, ap: ['Resumen', 'Frente a un indexado'], apAct: 1, bar: 0 },
  '1': { sec: 'Ideas', riel: 'Ideas', k2: ['Lo tuyo', 'Del radar', 'Lista de seguimiento'], k2act: 2, pc: 'Lista de seguimiento', movil: 'Ideas', sub: 'Lo que sigues, lo tuyo y lo que encuentra el radar.', pest: ['Lo tuyo', 'Del radar', 'Siguiendo'], pestAct: 2, ap: null, bar: 3 },
  '11': { sec: 'Cartera', riel: 'Cartera', k2: ['Posiciones', 'Entiende tu cartera', 'Movimientos'], k2act: 1, pc: 'Entiende tu cartera', movil: 'Análisis', sub: 'Todo el detalle de tu cartera, por dentro.', pest: ['Posiciones', 'Entiende tu cartera', 'Rentabilidad', 'Riesgo'], pestAct: 1, ap: null, bar: 0 },
};
const VARIANTES = { '2A': v2A, '2B': v2B, '2C': v2C, '1A': v1A, '1B': v1B, '1C': v1C, '11A': v11A, '11B': v11B, '11C': v11C,
  '2X': v2X, '1X-tabla': (o) => v1X(o, 'tabla'), '1X-tarjetas': (o) => v1X(o, 'tarjetas'), '11X': (o) => v11X(o, 'indice'), '11X-indice': (o) => v11X(o, 'indice'), '11X-leccion': (o) => v11X(o, 'leccion') };

window.montarMaqueta = (id, modo) => {
  const movil = innerWidth < 600, n = NAV[id.match(/^\d+/)[0]];
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const anc = (xs, act, extra = '') => xs.map((t, i) => `<a href="#" ${extra} aria-current="${i === act ? 'page' : 'false'}">${t}</a>`).join('');
  // barra de iconos (riel K2) y barra de abajo del móvil
  for (const a of $$('.riel-nav a')) { const t = (a.textContent || '').trim(); a.setAttribute('aria-current', t === n.riel ? 'page' : 'false'); a.classList.toggle('on', t === n.riel); }
  const k2 = $('#k2Pags'); if (k2) k2.innerHTML = `<h2 class="k2-tit">${n.sec}</h2><nav class="k2-lista">${anc(n.k2, n.k2act)}</nav>`;
  $$('.navbar > a').forEach((a, i) => a.setAttribute('aria-current', i === n.bar ? 'page' : 'false'));
  const kp = $('nav.k2-pest'); if (kp) kp.innerHTML = anc(n.k2, n.k2act);
  const g = $('.ts-grupo');
  if (id === '11X-leccion') g.innerHTML = `<a class="vista-volver" href="#">‹ Entiende tu cartera</a><h1 class="ts-tit">Lo que te cuesta</h1><p class="ts-sub">Capítulo II · 3 lecciones</p>`;
  else g.innerHTML = `<h1 class="ts-tit"><span class="t-movil">${n.movil}</span><span class="t-pc">${n.pc}</span></h1><p class="ts-sub t-movil">${n.sub}</p><div class="pest-tira"><nav class="pest-av">${anc(n.pest, n.pestAct)}</nav></div>${n.ap ? `<nav class="apartados">${anc(n.ap, n.apAct)}</nav>` : ''}`;
  const p = $('#panelAv'); p.innerHTML = VARIANTES[id]({ modo, movil });
  try { ponerPreguntale(p); } catch (err) {}
  const t = $('#toast'); if (t) t.remove();
  scrollTo(0, 0);
};
})();
