/* Maqueta de «Tu año en Toisón» (10 nov 2026, sesión 7 de la 0.8.6). Se inyecta en la app de verdad, encima de #panelAv.
   Siete tarjetas (la del MSCI World ya es la pestaña 2) y, aparte, la tarjeta para compartir. Cifras de la cartera de prueba de 5 posiciones. */
(() => {
const IC = (k) => (typeof ICONOS_PL !== 'undefined' && ICONOS_PL[k]) || '';
const e = (n, d = 0) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
const eur = (n, d = 0) => e(n, d) + ' €';
const pc = (n, d = 1) => e(n, d) + ' %';
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const kpis = (xs, cols = 3) => `<div class="pav-kpis" style="--cols:${cols}">${xs.map(([k, v, s = '']) => `<div class="pav-kpi"><small>${k}</small><b>${v}</b>${s ? `<span>${s}</span>` : ''}</div>`).join('')}</div>`;
const OK = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 8.4l2.9 2.8 6-6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COL = ['var(--reparto-1)', 'var(--reparto-2)', 'var(--reparto-3)', 'var(--reparto-4)', 'var(--reparto-5)', 'var(--reparto-6)', 'var(--tenue)'];

/* ---------- la cartera de prueba, en 2026 (de enero a noviembre) ---------- */
const POS = [['MSCI World Fidelity', 11240, 33], ['Repsol', 3960, 30], ['Emergentes Vanguard', 3180, 26], ['Oro (ETC)', 2850, 25], ['Bitcoin', 2150, 34]];
const TOTAL = 23380;
const EDAD = POS.reduce((s, p) => s + p[1] * p[2], 0) / TOTAL; // ≈ 30,7 meses
const PAISES = [['EE. UU.', 34.6], ['España', 16.9], ['China', 3.4], ['Japón', 2.6], ['India', 2.6], ['Taiwán', 2.6], ['Resto del mundo', 15.9], ['Oro y bitcoin, sin país', 21.4]];
const SECT = [['Energía', 19.5], ['Tecnología', 15.3], ['Oro', 12.2], ['Finanzas', 10.8], ['Bitcoin', 9.2], ['Industria', 6.2], ['Resto', 26.8]];
const ZONAS = [['Zona euro', 20.7, 'var(--reparto-1)'], ['Fuera de la zona euro', 57.9, 'var(--reparto-2)'], ['Sin país (oro y bitcoin)', 21.4, 'var(--reparto-4)']];
const COSTES = [['Gestión del MSCI World', '0,12 %', 12], ['Gestión de Emergentes', '0,58 %', 17], ['Gestión del ETC de oro', '0,39 %', 10], ['Comisiones de compra', '', 0], ['Cambio de divisa', '', 0]];
const COSTE = COSTES.reduce((s, c) => s + c[2], 0); // 39 €
const VAL26 = [20300, 20900, 19270, 20100, 20900, 21500, 21800, 22100, 22600, 23100, 23380];
const APOR = Array.from({ length: 45 }, (_, i) => 6700 + 300 * i); APOR[44] = 19900;

/* ---------- gráficas pequeñas en SVG ---------- */
function linea(v, { h = 120, col = 'var(--grafica)', esc = false, marca = null, relleno = true, base = null } = {}) {
  const W = 1000; let mn = Math.min(...v), mx = Math.max(...v); const p = (mx - mn) * 0.12 || 1; mn -= p; mx += p;
  if (base != null) mn = Math.min(mn, base);
  const X = (i) => (i / (v.length - 1)) * W, Y = (y) => h - ((y - mn) / (mx - mn)) * h;
  const d = v.map((y, i) => (i ? (esc ? `H${X(i).toFixed(1)}V${Y(y).toFixed(1)}` : `L${X(i).toFixed(1)} ${Y(y).toFixed(1)}`) : `M0 ${Y(y).toFixed(1)}`)).join('');
  let o = `<svg class="mq-svg" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" style="height:${h}px">`;
  for (let k = 1; k < 4; k++) o += `<line x1="0" x2="${W}" y1="${(h * k) / 4}" y2="${(h * k) / 4}" stroke="var(--sep)" vector-effect="non-scaling-stroke"/>`;
  if (relleno) o += `<path d="${d}L${W} ${h}L0 ${h}Z" fill="color-mix(in srgb, ${col} 13%, transparent)"/>`;
  o += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  o += '</svg>';
  if (marca != null) o += `<i class="ta-punto" style="left:${(marca / (v.length - 1)) * 100}%;top:${(Y(v[marca]) / h) * 100}%"></i>`;
  return `<div class="ta-graf">${o}</div>`;
}
const eje = (xs) => `<div class="mq-eje">${xs.map((m) => `<span>${m}</span>`).join('')}</div>`;
const barras = (filas, max, txt = (v) => pc(v)) => `<div class="ta-barras">${filas.map(([n, v], i) => `<div class="ta-bf"><span>${n}</span><span class="ta-pista"><i style="width:${(v / max) * 100}%;background:${COL[Math.min(i, 6)]}"></i></span><b>${txt(v)}</b></div>`).join('')}</div>`;
const apilada = (xs) => `<div class="ta-apil">${xs.map(([n, v, c]) => `<i style="width:${v}%;background:${c}" title="${n}"></i>`).join('')}</div><div class="ta-apil-ley">${xs.map(([n, v, c]) => `<span><i style="background:${c}"></i>${n}<b>${pc(v)}</b></span>`).join('')}</div>`;
const nota = (t) => `<p class="mq-nota-fina">${t}</p>`;
const grande = (n, s = '') => `<div class="ta-grande"><b>${n}</b>${s ? `<span>${s}</span>` : ''}</div>`;

/* ---------- las siete tarjetas, con sus opciones ---------- */
const TARJ = {
  estilo: { n: 1, tit: 'Tu estilo de inversor', c: 'c12', op: {
    A: () => `<div class="ta-portada"><div><small class="ta-eyebrow">Tu año 2026, en una palabra</small><h3 class="ta-nombre">Constante</h3>
      <p class="ta-frase">Aportaste todos los meses y no vendiste nada. Es lo que más pesa en tu estilo.</p></div>
      ${kpis([['Meses aportando', '11 de 11'], ['Ventas', 'Ninguna'], ['Posiciones', '5', 'de 4 tipos']], 3)}</div>
      ${nota('Sale de lo que hiciste, no de lo que ganaste. Hay cuatro estilos (Constante, Paciente, Diversificador y Explorador) y ninguno es mejor que otro.')}`,
    B: () => `<div class="ta-portada ta-portada-b"><div><small class="ta-eyebrow">Tu estilo en 2026</small><h3 class="ta-nombre ta-nombre-m">Constante</h3>
      <p class="ta-frase">Así se reparte lo que hiciste durante el año.</p></div>
      <div class="ta-rasgos">${[['Constancia', 4, 'Aportaste 11 de 11 meses'], ['Paciencia', 4, 'Ninguna venta'], ['Reparto', 3, '5 posiciones; dentro de tus fondos, más de 2.000 empresas'], ['Cosas nuevas', 1, 'Ninguna posición nueva este año']].map(([n, k, t]) => `<div class="ta-rasgo"><span>${n}</span><span class="ta-niv">${[1, 2, 3, 4].map((x) => `<i class="${x <= k ? 'si' : ''}"></i>`).join('')}</span><em>${t}</em></div>`).join('')}</div></div>
      ${nota('Cuatro rasgos medidos con tus movimientos, no con lo que ganaste. El que más destaca da nombre al estilo.')}`,
    C: () => `<div class="ta-portada"><div><small class="ta-eyebrow">Tu año 2026, en una frase</small>
      <p class="ta-frase ta-frase-g">Aportaste los 11 meses, no vendiste nada y tu dinero está repartido en 5 posiciones de 4 tipos.</p></div>
      ${kpis([['Meses aportando', '11 de 11'], ['Ventas', 'Ninguna'], ['Brókeres', '3']], 3)}</div>
      ${nota('Sin etiqueta: solo lo que hiciste.')}`,
  } },
  aport: { n: 2, tit: 'Lo que aportaste', c: 'c6', op: {
    A: () => `${grande('11 de 11 meses', '3.300 € este año · 300 € cada mes')}
      <div class="ta-cal">${MES.map((m, i) => `<div class="ta-mes${i < 11 ? ' si' : ' falta'}"><small>${m}</small>${i < 11 ? `<b>${OK}</b><span>300 €</span>` : '<b>·</b><span>pendiente</span>'}</div>`).join('')}</div>
      ${nota('Desde que empezaste, en marzo de 2023, llevas 19.900 € metidos.')}`,
    B: () => `${grande('3.300 €', 'en 11 aportaciones, de enero a noviembre')}
      ${linea(APOR, { h: 130, esc: true })}${eje(['mar 2023', '2024', '2025', '2026', 'hoy'])}
      ${kpis([['Este año', '3.300 €'], ['Desde el principio', '19.900 €'], ['Cada mes', '300 €']], 3)}`,
  } },
  edad: { n: 3, tit: 'La edad de tu dinero', c: 'c6', op: {
    A: () => `${grande('2 años y 7 meses', 'hace un año: 1 año y 10 meses')}
      <p class="ta-texto">Es el tiempo que lleva invertido, de media, cada euro que tienes. El dinero nuevo de cada mes entra con cero meses: por eso este año ha subido 9 meses y no 12.</p>
      ${linea([14, 15.2, 16.1, 17.4, 18.3, 19.1, 20.4, 21.2, 22.1, 22.9, 23.8, 24.6, 25.3, 26.2, 26.9, 27.7, 28.4, 29.1, 29.9, 30.7], { h: 90, relleno: true })}${eje(['nov 2025', '', 'hoy'])}`,
    B: () => `${grande('2 años y 7 meses', 'de media, por cada euro')}
      <div class="ta-barras ta-edades">${POS.map(([n, v, m], i) => `<div class="ta-bf"><span>${n}</span><span class="ta-pista"><i style="width:${(m / 36) * 100}%;background:${COL[i]}"></i><u style="left:${(EDAD / 36) * 100}%"></u></span><b>${Math.floor(m / 12)} a ${m % 12} m</b></div>`).join('')}</div>
      ${nota('La raya es tu media. Cuenta más lo que más pesa: el MSCI World es casi la mitad de tu cartera.')}`,
  } },
  paises: { n: 4, tit: 'Dónde está tu dinero', c: 'c8', op: {
    A: () => `<div class="ta-dos"><div><h4 class="ta-sub">Por países</h4>${barras(PAISES, 40)}</div><div><h4 class="ta-sub">Por sectores</h4>${barras(SECT, 40)}</div></div>
      ${nota('Mirando dentro de tus fondos: tu cartera entera, no solo lo que compraste tú.')}`,
    B: () => `<p class="ta-texto ta-texto-g"><b>El 58 %</b> de tu dinero está en empresas de fuera de la zona euro y otro 21 %, en oro y bitcoin.</p>
      ${apilada(ZONAS)}
      ${kpis([['País que más pesa', 'EE. UU.', '34,6 %'], ['Sector que más pesa', 'Energía', '19,5 %, casi todo Repsol'], ['Empresas dentro', 'Más de 2.000', 'en tus dos fondos']], 3)}`,
  } },
  costes: { n: 5, tit: 'Lo que te costó', c: 'c4', op: {
    A: () => `${grande('0,17 %', `≈ ${COSTE} € de enero a noviembre`)}
      <div class="ta-lista">${COSTES.map(([n, t, v]) => `<div><span>${n}${t ? ` <small>${t}</small>` : ''}</span><b>${eur(v)}</b></div>`).join('')}</div>
      ${nota('La gestión de los fondos no llega como un cargo: se descuenta del precio, día a día.')}`,
    B: () => `${grande('17 céntimos', 'de cada 100 € que tienes, en un año')}
      ${apilada([['Gestión de tus fondos', 74, 'var(--reparto-1)'], ['ETC de oro', 26, 'var(--reparto-3)']])}
      <p class="ta-texto">En total, unos ${COSTE} €. Este año no pagaste comisiones de compra: tus aportaciones fueron a fondos de MyInvestor, que no las cobran.</p>`,
  } },
  divid: { n: 6, tit: 'Dividendos', c: 'c6', op: {
    A: () => `<div class="ta-dos ta-dos-b"><div class="ta-caja"><small>Cobrados</small><b class="mq-num-m">227 €</b><span>280 € de Repsol, menos 53 € de retención (19 %)</span>
        <div class="ta-hitos"><span><b>ene</b>140 €</span><span><b>jul</b>140 €</span></div></div>
      <div class="ta-caja"><small>Dentro de tus fondos</small><b class="mq-num-m">≈ 250 €</b><span>Tus dos fondos son de acumulación: lo que reparten sus empresas se queda dentro y sube su precio. No llega a tu cuenta ni tributa hasta que vendas.</span></div></div>`,
    B: () => `${grande('227 € cobrados', '2 pagos de Repsol, ya con la retención')}
      <div class="ta-meses">${MES.map((m, i) => `<div><span class="ta-mb"><i style="height:${i === 0 || i === 6 ? 100 : 0}%"></i></span><small>${m}</small></div>`).join('')}</div>
      ${nota('Además, unos 250 € se quedaron dentro de tus fondos de acumulación: no los cobras, suben su precio.')}`,
    D: () => `<div class="ta-dos ta-dos-b"><div class="ta-caja"><small>Cobrados</small><b class="mq-num-m">227 €</b><span>280 € de Repsol, menos 53 € de retención (19 %)</span>
        <div class="ta-meses ta-meses-p">${MES.map((m, i) => `<div><span class="ta-mb"><i style="height:${i === 0 || i === 6 ? 100 : 0}%"></i></span><small>${m[0]}</small></div>`).join('')}</div></div>
      <div class="ta-caja"><small>Dentro de tus fondos</small><b class="mq-num-m">≈ 250 €</b><span>Tus dos fondos son de acumulación: lo que reparten sus empresas se queda dentro y sube su precio. No llega a tu cuenta ni tributa hasta que vendas.</span></div></div>`,
    C: () => `${grande('2 cobros', 'de Repsol, en enero y julio')}
      <p class="ta-texto">Y dentro de tus dos fondos, lo que reparten sus empresas se queda dentro y sube su precio.</p>
      <button type="button" class="btn">Ver en euros</button>
      ${nota('Las cantidades, solo si las pides.')}`,
  } },
  meses: { n: 7, tit: 'Meses sin vender', c: 'c6', op: {
    A: () => `${grande('44 meses', 'sin vender nada, desde marzo de 2023')}
      <div class="ta-movido">${linea(VAL26, { h: 110, marca: 2 })}<span class="ta-movido-t" style="left:18.2%">Marzo, tu mes más movido: llegó a bajar un 7,8 % desde su máximo. No vendiste.</span></div>${eje(MES.slice(0, 11))}`,
    B: () => `${grande('44 meses', 'sin vender nada')}
      <div class="ta-puntos">${[['2023', 10, 2], ['2024', 12, 0], ['2025', 12, 0], ['2026', 11, 0]].map(([a, n, hueco]) => `<div><small>${a}</small><span>${'<i class="no"></i>'.repeat(hueco)}${'<i></i>'.repeat(n)}${a === '2026' ? '<i class="no"></i>' : ''}</span></div>`).join('')}</div>
      <p class="ta-texto">En marzo, tu mes más movido, tu cartera llegó a bajar un 7,8 % desde su máximo. No vendiste nada.</p>`,
  } },
};
const ORDEN = ['estilo', 'aport', 'edad', 'paises', 'costes', 'divid', 'meses'];

/* ---------- la tarjeta para compartir (aparte; sin euros) ---------- */
const LOGO = () => (typeof TS_O_D !== 'undefined' ? `<svg viewBox="-82 -78 164 147" class="ta-logo"><path class="s-o" d="${TS_O_D}"/><path class="s-t" d="${TS_T_D}"/></svg>` : '');
const COMP = (forma) => `<div class="ta-comp ta-comp-${forma}"><div class="ta-comp-cab">${LOGO()}<span>TOISÓN</span><em>Tu año 2026</em></div>
  <div class="ta-comp-est"><small>Estilo</small><b>Constante</b></div>
  <div class="ta-comp-datos"><div><b>11 de 11</b><small>meses aportando</small></div><div><b>2 a 7 m</b><small>edad de tu dinero</small></div><div><b>EE. UU.</b><small>donde más está</small></div>${forma === 'v' ? '<div><b>44</b><small>meses sin vender</small></div>' : ''}</div>
  <p class="ta-comp-pie">Sin cantidades · toison.es</p></div>`;
const COMPARTIR = (forma, movil) => `<section class="pav-t pab pav-c12 mq-ta" data-ta="comp"><h2 class="pab-cab"><span>Para compartir</span></h2>
  <div class="ta-comp-w${movil ? ' m' : ''}">${COMP(forma)}<div class="ta-comp-op"><p class="ta-texto">Lo que sale en la imagen. Las cantidades en euros no salen nunca por defecto.</p>
  <div class="ta-chk">${[['Estilo', 1], ['Meses aportando', 1], ['Edad de tu dinero', 1], ['Dónde más está', 1], ['Meses sin vender', forma === 'v' ? 1 : 0], ['Cantidades en euros', 0]].map(([t, s]) => `<span class="${s ? 'si' : ''}"><i>${s ? OK : ''}</i>${t}</span>`).join('')}</div>
  <button type="button" class="btn pri">Compartir…</button></div></div></section>`;

const tarjeta = (k, L, movil) => { const t = TARJ[k], f = t.op[L] || t.op.A;
  return `<section class="pav-t pab pav-${movil ? 'c12' : t.c} mq-ta mq-igual" data-ta="${k}"><h2 class="pab-cab"><span class="ta-n">${t.n} / 7</span><span>${t.tit}</span></h2>${f()}</section>`; };

window.montarTuAno = ({ op = {}, comp = 'v', historia = null } = {}) => {
  const movil = innerWidth < 600;
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  for (const a of $$('.riel-nav a')) { const t = (a.textContent || '').trim(); a.setAttribute('aria-current', t === 'Hoy' ? 'page' : 'false'); a.classList.toggle('on', t === 'Hoy'); }
  const k2 = $('#k2Pags'); if (k2) k2.innerHTML = `<h2 class="k2-tit">Hoy</h2><nav class="k2-lista"><a href="#" aria-current="false">Resumen</a><a href="#" aria-current="page">Tu año 2026</a></nav>`;
  $$('.navbar a').forEach((a) => a.setAttribute('aria-current', (a.textContent || '').trim() === 'Hoy' ? 'page' : 'false'));
  const g = $('.ts-grupo');
  g.innerHTML = `<a class="vista-volver" href="#">‹ Hoy</a><h1 class="ts-tit">Tu año en Toisón</h1><p class="ts-sub">2026, de enero a noviembre. Lo que hiciste con tu plan.</p>`;
  const p = $('#panelAv');
  const cab = `<section class="pav-t pab pav-c12 ta-cab"><p>Siete tarjetas con lo que hiciste este año. Son tus datos, sin comparar con nadie, y no te dicen qué hacer.</p><div><button type="button" class="btn">${IC('ojo') || ''}Ocultar cantidades</button><button type="button" class="btn pri">Compartir sin cantidades</button></div></section>`;
  p.innerHTML = (movil ? '' : cab) + ORDEN.map((k) => tarjeta(k, op[k] || 'A', movil)).join('') + COMPARTIR(comp, movil);
  for (const el of $$('.ta-hist')) el.remove();
  if (historia) {
    const i = ORDEN.indexOf(historia), t = TARJ[historia], L = op[historia] || 'A';
    const h = document.createElement('div'); h.className = 'ta-hist';
    h.innerHTML = `<div class="ta-hist-barra">${ORDEN.map((_, k) => `<i class="${k < i ? 'si' : k === i ? 'aqui' : ''}"></i>`).join('')}</div>
      <div class="ta-hist-cab"><span>Tu año en Toisón · ${t.n} de 7</span><button type="button" aria-label="Cerrar">✕</button></div>
      <div class="ta-hist-c"><h2>${t.tit}</h2>${t.op[L]()}</div>
      <div class="ta-hist-pie"><button type="button" class="btn">‹ Anterior</button><button type="button" class="btn pri">Siguiente ›</button></div>`;
    document.body.appendChild(h);
  }
  const ts = $('#toast'); if (ts) ts.remove();
  scrollTo(0, 0);
};
window.TA_ORDEN = ORDEN;
window.TA_OPS = Object.fromEntries(ORDEN.map((k) => [k, Object.keys(TARJ[k].op)]));
})();
