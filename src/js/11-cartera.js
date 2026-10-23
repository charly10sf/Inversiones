/* =========================== Cartera =========================== */
const RANGOS = { '1D': 1, '1S': 7, '1M': 31, '3M': 92, '6M': 183, '1A': 366, '3A': 1097, '5A': 1827, 'Máx': 3660, 'Inicio': 0 };
// el día de tu primera compra (o desde cuándo dices que tienes cada cosa): el periodo «Inicio» de la gráfica
// cuándo empezaste a invertir, si lo has dicho («AAAA-MM»); «auto» si prefieres que cuente tu primera compra apuntada
const inicioDicho = () => { const v = ((S.cartera && S.cartera.perfil) || {}).inicio_inversion; return /^\d{4}-\d{2}/.test(v || '') ? String(v).slice(0, 7) + '-01' : null; };
function inicioCartera() {
  const dicho = inicioDicho();
  const fs = dicho ? [dicho] : [];
  for (const p of (S.cartera && S.cartera.posiciones) || []) { if (p.desde) fs.push(p.desde); for (const l of p.lotes || []) if (l.f) fs.push(l.f); }
  for (const m of (S.cartera && S.cartera.movimientos) || []) if (m.fecha && m.tipo === 'compra') fs.push(m.fecha);
  return fs.map((x) => String(x).slice(0, 10)).filter((x) => /^\d{4}-\d\d-\d\d$/.test(x) && x <= hoyIso()).sort()[0] || null;
}
const diasRango = (r) => (r === 'Inicio' ? (inicioCartera() ? Math.max(8, diasEntre(inicioCartera(), hoyIso())) : 366) : RANGOS[r] || 366);
const INTRADIA = new Set(['1D', '1S']);
/* fechas con hora (las de la gráfica de 1 día y 1 semana vienen así: 2026-10-19T14:30Z) */
const tiempoDe = (d) => (String(d).length > 10 ? new Date(d).getTime() : deIso(d).getTime());
const DIAS_SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const fechaHora = (d) => { const x = new Date(d); return `${DIAS_SEM[x.getDay()]} ${x.getDate()} ${MESES[x.getMonth()]}, ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
const fechaPunto = (d) => (String(d).length > 10 ? fechaHora(d) : fechaLarga(d));

/* Precios cada 30 minutos de los últimos 5 días (intradia.json, de la Action) */
async function cargarIntradia() {
  try {
    const url = CFG.dev ? 'dev/intradia.json' : GH.raw('intradia.json', 'datos') + '?v=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) { S.intra = await r.json(); return; }
  } catch (e) { console.warn(e); }
}
/* El valor de la cartera en el día (desde el cierre anterior) o en la semana, con los precios cada 30
   minutos; los fondos, con su valor liquidativo del día. Lo que no tiene cantidad y el efectivo, fijos. */
function serieIntradia(M, rango) {
  const P = (S.intra && S.intra.p) || {};
  const items = M.filas.filter((f) => f.uds != null && f.valor > 0);
  const ts = new Set();
  for (const f of items) for (const [t] of P[f.inst.id] || []) ts.add(t);
  let orden = [...ts].sort();
  if (orden.length < 2) return [];
  let inicio;
  if (rango === '1D') { const dia = orden[orden.length - 1].slice(0, 10); const antes = orden.filter((t) => t.slice(0, 10) < dia); inicio = antes.length ? antes[antes.length - 1] : orden[0]; }
  else { const lim = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 16) + 'Z'; inicio = orden.find((t) => t >= lim) || orden[0]; }
  const extra = M.total - sum(items, (f) => f.valor);
  const idx = items.map(() => 0), ult = items.map(() => null), out = [];
  for (const t of orden) {
    let v = extra;
    items.forEach((f, k) => {
      const h = P[f.inst.id];
      if (h) while (idx[k] < h.length && h[idx[k]][0] <= t) { ult[k] = h[idx[k]][1]; idx[k]++; }
      let pr = ult[k];
      if (pr == null && f.hist) pr = precioEn(f.hist, t.slice(0, 10), 'antes');
      if (pr == null) pr = f.precio;
      v += f.uds * (pr || 0);
    });
    if (t >= inicio) out.push({ d: t, v });
  }
  const ahora = new Date().toISOString().slice(0, 16) + 'Z';
  if (out.length && ahora > out[out.length - 1].d) out.push({ d: ahora, v: M.total });
  return out;
}

/* Cartera a tu gusto (0.2.2): la pestaña está hecha de bloques que se ordenan, se quitan y se añaden (lo eliges en
   «Ordenar Cartera», abajo del todo o en Ajustes, y se guarda en tu cartera, igual en todos tus dispositivos).
   En el móvil van uno debajo de otro, en tu orden. En el ordenador, cada bloque tiene su anchura: los estrechos se
   ponen al lado del grande que tengan justo delante o detrás (el patrimonio junto a la gráfica; el reparto y lo que
   viene junto a tus posiciones), los de lado a lado ocupan la fila y, si quedan estrechos sueltos, van en columnas. */
const BLOQUES_CAR = {
  patrimonio: { n: 'Patrimonio y gráfica', d: 'Cuánto tienes, lo de hoy, lo ganado y cómo se ha movido', w: 'lleno', fijo: true },
  cifras: { n: 'Tus cifras', d: 'Por plataforma, lo invertido, los dividendos, en 10 años y las ventas del año', w: 'estrecho' },
  gta: { n: 'GTA VI', d: 'La cuenta atrás y tu cartera en copias del juego', w: 'estrecho' },
  ia: { n: 'GrowIA y lo que toca', d: 'Su diagnóstico, sus notas y lo que toca hacer', w: 'grande' },
  posiciones: { n: 'Tus posiciones', d: 'Lo que tienes, tu plan y tus movimientos', w: 'grande', fijo: true },
  reparto: { n: 'Reparto', d: 'Por países, sectores, monedas y tipo', w: 'estrecho' },
  agenda: { n: 'Lo que viene', d: 'Resultados, dividendos y fechas de lo tuyo', w: 'estrecho' },
  mapa: { n: 'Tu cartera de un vistazo', d: 'Cada posición, del tamaño de lo que vale y del color de cómo va', w: 'grande' },
  vistazo: { n: 'Señales de un vistazo', d: 'Qué dicen los números y GrowIA de cada posición', w: 'estrecho' },
  informe: { n: 'Lo último, según GrowIA', d: 'Su resumen de las noticias del día', w: 'estrecho' },
  noticias: { n: 'Noticias de lo tuyo', d: 'Los últimos titulares de lo que tienes', w: 'grande' },
  movidas: { n: 'Lo que más se mueve', d: 'Las empresas que más suben y bajan', w: 'grande' },
  futuro: { n: 'Tu futuro', d: 'Lo que podrías tener en 5, 10 y 20 años', w: 'estrecho' },
  metas: { n: 'Tus metas', d: 'Si llegas a cada una con lo que aportas', w: 'estrecho' },
  renta: { n: 'Hacienda de este año', d: 'Lo que llevas ganado y lo que pagarías', w: 'estrecho' },
};
// 0.3: tus posiciones, justo debajo del patrimonio; GrowIA, después y más corta
const CAR_DEFECTO = ['patrimonio', 'posiciones', 'ia', 'reparto', 'agenda'];
const ANCHO_CAR = { grande: 'Ancho', estrecho: 'Estrecho', lleno: 'De lado a lado' };
function bloquesCartera() {
  const ini = S.cartera && S.cartera.inicio;
  const g = ini && Array.isArray(ini.bloques) ? ini.bloques : null;
  // una vez, al pasar a la 0.3: si tenías un orden guardado con tus posiciones por debajo de GrowIA, suben bajo el patrimonio
  if (g && !ini.v03) {
    ini.v03 = true;
    const ip = g.indexOf('posiciones'), ia = g.indexOf('ia');
    if (ip > -1 && ia > -1 && ia < ip) { g.splice(ip, 1); g.splice(Math.max(0, g.indexOf('patrimonio')) + 1, 0, 'posiciones'); }
    S.senalesSucias = true;
  }
  const v = (g || CAR_DEFECTO).filter((k, i, a) => BLOQUES_CAR[k] && a.indexOf(k) === i);
  // los que no se pueden quitar vuelven a su sitio si faltan (por ejemplo, tras juntar dos dispositivos)
  for (const k of Object.keys(BLOQUES_CAR)) if (BLOQUES_CAR[k].fijo && !v.includes(k)) v.splice(Math.min(v.length, CAR_DEFECTO.indexOf(k)), 0, k);
  return v;
}
const anchoCar = (k) => (k === 'posiciones' && S.carTab === 'plan' ? 'lleno' : BLOQUES_CAR[k].w);
/* los cuatro días siguientes a una versión nueva, arriba en Inicio: qué versión es, su título y «Ver en detalle»
   (las notas completas). Se quita con la x o sola pasados esos días. */
function htmlAvisoNovedades() {
  const vista = LS.get('inv-nov-vista'), n = novBase(), cerrada = LS.get('inv-nov-cerrada');
  if (!vista || !n || baseVer(vista.v) !== baseVer(VERSION) || (cerrada && baseVer(cerrada) === n.v)) return '';
  if (diasEntre(vista.d, hoyIso()) > 3) return '';
  return `<div class="nov-aviso" role="note"><span class="nov-aviso-ic" aria-hidden="true">${ICONOS.chispa}</span>
    <button type="button" class="nov-aviso-t" data-accion="novedades-detalle"><small data-no-trad>${L(`Novedades de la ${esc(n.v)}`, `What's new in ${esc(n.v)}`)}</small><b>${esc(n.t)}</b></button>
    <span class="nov-aviso-b">${pasosGuia().length ? `<button type="button" class="btn peq pri" data-accion="novedades-guia">${L('Guíame', 'Show me')}</button>` : ''}<button type="button" class="btn peq" data-accion="novedades-detalle">${L('Ver en detalle', 'See details')}</button></span>
    <button type="button" class="ib nov-aviso-x" data-accion="novedades-ocultar" aria-label="${L('Quitar el aviso', 'Dismiss')}">${ICONOS.cerrar}</button></div>`;
}
function htmlBloqueCar(k, M) {
  const anio = new Date().getFullYear();
  try {
    if (k === 'patrimonio') {
      return `<section class="car-patrimonio car-hero" aria-label="Patrimonio">
      ${htmlAvisoNovedades()}
      <div class="hero-top">${nombreUsuario() ? `<p class="hero-hola">${esc(saludoHora())}, <button type="button" class="hola-nom" data-accion="nombre" title="Cambiar nombre">${esc(nombreUsuario())}</button></p>` : ''}<a class="btn peq car-agenda-mini" href="#agenda" title="${esc(L('Calendario: resultados, dividendos, tus aportaciones, la Fed y la renta', 'Calendar: earnings, dividends, your contributions, the Fed and taxes'))}" aria-label="${esc(L('Calendario', 'Calendar'))}">${ICONOS.agenda}<span>${L('Calendario', 'Calendar')}</span></a><button type="button" class="btn peq car-ordenar-mini" data-accion="ordenar-cartera" title="Personalizar Inicio: qué sale y en qué orden" aria-label="Personalizar Inicio">${ICONOS.ordenar}<span>Personalizar</span></button></div>
      <div class="hero-panel">
        <div class="hero-cifra">
          <div class="hero-lbl"><span id="heroLbl">${L('Patrimonio', 'Net worth')}</span><button type="button" class="hero-ojo" data-accion="ocultar" aria-pressed="${!!S.oculto}" title="${S.oculto ? L('Mostrar importes', 'Show amounts') : L('Ocultar importes', 'Hide amounts')}" aria-label="${S.oculto ? L('Mostrar importes', 'Show amounts') : L('Ocultar importes', 'Hide amounts')}">${S.oculto ? ICONOS.ojoNo : ICONOS.ojo}</button></div>
          <div class="hero-num" id="heroNum" aria-label="${L('Patrimonio', 'Net worth')}">${B('totalE')}${B('totalD', 'dec')}</div>
          <div class="hero-var"><span class="hv-in" id="evoCab" aria-live="off"></span><button type="button" class="hv-info" data-accion="info-grafica" title="${L('Qué enseña la gráfica', 'What the chart shows')}" aria-label="${L('Qué enseña la gráfica', 'What the chart shows')}">${ICONOS.info}</button></div>
          <div class="hero-sub">
            ${S.rango === '1D' ? '' : `<div class="hs"><span class="k">${L('Hoy', 'Today')}</span>${B('dia')}</div>`}
            <div class="hs"><span class="k">${L('Ganado desde que compraste', 'Gained since you bought')}</span>${B('pl')}</div>
          </div>
        </div>
        ${!M.filas.length ? `<p class="hero-vacia">${L('La gráfica de tu patrimonio sale en cuanto metas lo que tienes.', 'Your net worth chart shows up as soon as you add what you own.')}</p>` : `<div class="tabs hero-rangos" role="group" aria-label="${L('Periodo', 'Period')}">${Object.keys(RANGOS).map((r) => `<button data-rango="${r}" aria-pressed="${S.rango === r}"${r === 'Inicio' ? ` title="${L('Desde tu primera compra', 'Since your first purchase')}"` : ''}>${r === 'Inicio' ? L('Total', 'Total') : r}</button>`).join('')}</div>
        ${INTRADIA.has(S.rango) ? '' : `<div class="hero-pie"><button type="button" class="hp-cmp" data-accion="comparar" aria-pressed="${!!S.comparar}"><i aria-hidden="true"></i>${S.comparar ? L('Comparado con', 'Compared with') : L(`Comparar con el ${nombreBench(benchDe(S.bench))}`, `Compare with the ${nombreBench(benchDe(S.bench))}`)}</button>${S.comparar ? `<select class="hp-sel" id="hpBench" aria-label="${L('Índice con el que comparar', 'Index to compare with')}">${BENCH.map((b) => `<option value="${b.id}"${b.id === S.bench ? ' selected' : ''}>${esc(nombreBench(b))}</option>`).join('')}</select>` : ''}</div>`}
        <div class="chart gh" id="grafEvo"></div>`}
        <div class="movers hero-movers">${B('movers')}</div>
      </div>
      ${((pr) => (pr ? `<div class="hero-bajo">${pr}</div>` : ''))(htmlPreguntasIA(true))}
    </section>`;
    }
    if (k === 'cifras') {
      const plats = porPlataforma(M).map(([x]) => `<div class="kpi"><span class="k">${esc(x)}</span><span class="v">${B('plat:' + x)}</span></div>`).join('');
      return `<section class="car-cifras" aria-labelledby="hCifras"><div class="sec-cab"><h2 id="hCifras">Tus cifras</h2></div>
      <div class="kpis">
        ${plats}
        <div class="kpi"><span class="k">Invertido</span><span class="v">${eur(M.invertido, 0)}</span></div>
        <div class="kpi"><span class="k">Dividendos al año</span><span class="v">${eur(M.dividendos, 0)}<small>brutos</small></span></div>
        ${(() => { try { const pr = proyeccion(M); return `<a class="kpi" href="#proyeccion"><span class="k">En 10 años, lo probable</span><span class="v acento">${euCorto(pr.p50[120])}</span></a>`; } catch (e) { return ''; } })()}
        ${M.realizado ? `<div class="kpi"><span class="k">Ventas de ${anio}</span><span class="v ${cls(M.realizado)}">${eurS(M.realizado, 0)}</span></div>` : ''}
      </div></section>`;
    }
    if (k === 'gta') return gtaActivo() ? `<section class="car-gta" aria-label="GTA VI">${chipGTA()}<p class="k">La cuenta atrás y tu cartera en copias del juego.</p></section>` : '';
    if (k === 'ia') return htmlToca(M);
    if (k === 'posiciones') return `<div class="car-pos">
      <div class="subvistas dos-op car-tabs" id="carTabs" role="group" aria-label="Qué ver"><button data-car="pos" aria-pressed="${S.carTab !== 'plan'}">${ICONOS.cartera}Tus posiciones</button><button data-car="plan" aria-pressed="${S.carTab === 'plan'}">${ICONOS.plan}Plan y movimientos</button></div>
      ${S.carTab === 'plan' ? htmlPlan(M) : `<div class="pila">${htmlAvisosGraves(M)}${htmlPosiciones(M)}${htmlAvisos(M)}</div>`}</div>`;
    if (k === 'reparto') return htmlReparto(M);
    if (k === 'agenda') return htmlAgenda(M);
    if (k === 'mapa') return htmlMapaCartera(M, true);
    if (k === 'vistazo') return M.filas.length ? htmlVistazo(M, iaActual()).replace(/<button class="enlace acento ver-mas" data-exp="posiciones">([^<]*)<\/button>/, '<a class="enlace acento ver-mas" href="#expertos">$1</a>') : '';
    if (k === 'informe') return htmlResumenInforme(true);
    if (k === 'movidas') return htmlMovidas();
    if (k === 'noticias') {
      const n = pasadoAg('mio');
      return n.html ? `<section aria-labelledby="hNotC"><div class="sec-cab"><h2 id="hNotC">Noticias de lo tuyo</h2><div class="der"><a class="enlace acento" href="#agenda">Ver más</a></div></div><div class="agp-lista">${n.html}</div></section>` : '';
    }
    if (k === 'futuro') {
      const pr = proyeccion(M), fila = (m, t) => (pr.p50[m] != null ? `<div class="car-fut-f"><span class="k">${t}</span><b>${euCorto(pr.p50[m])}</b><small>entre ${euCorto(pr.p10[m])} y ${euCorto(pr.p90[m])}</small></div>` : '');
      return `<section aria-labelledby="hFutC"><div class="sec-cab"><h2 id="hFutC">Tu futuro</h2><div class="der"><a class="enlace acento" href="#proyeccion">Ver la proyección</a></div></div>
        <div class="car-fut">${fila(60, 'En 5 años')}${fila(120, 'En 10 años')}${fila(240, 'En 20 años')}</div>
        <p class="nota">Lo probable si sigues aportando como ahora; entre lo que pasaría si va mal y si va bien.</p></section>`;
    }
    if (k === 'metas') {
      const metas = estadoPerfil(M).metas || [];
      return `<section aria-labelledby="hMetC"><div class="sec-cab"><h2 id="hMetC">Tus metas</h2><div class="der"><a class="enlace acento" href="#objetivos">${metas.length ? 'Verlas' : 'Añadir una'}</a></div></div>
        ${metas.length ? `<ul class="metas car-metas">${metas.slice(0, 4).map((m) => `<li class="${m.ok === false ? 'falta' : 'ok'}"><div class="meta-cab"><b>${esc(m.n)}</b><span class="k">${eur(m.importe, 0)}${m.anio ? ` en ${m.anio}` : ''}</span></div><div class="pf-barra ok"><i style="width:${(+m.pct || 0).toFixed(0)}%"></i></div></li>`).join('')}</ul>` : '<p class="k">Algo con cifra y fecha: la entrada de un piso, un coche, llegar a 100.000 €… GrowFolio calcula si llegas.</p>'}</section>`;
    }
    if (k === 'renta') {
      const fa = fiscalAnio(anio);
      return `<section aria-labelledby="hRenC"><div class="sec-cab"><h2 id="hRenC">Hacienda de ${anio}</h2><div class="der"><a class="enlace acento" href="#fiscal">Ver Hacienda</a></div></div>
        <div class="kpis car-renta"><div class="kpi"><span class="k">Ganancias y pérdidas</span><span class="v ${cls(fa.gp || 0)}">${eurS(fa.gp || 0, 0)}</span></div><div class="kpi"><span class="k">Dividendos e intereses</span><span class="v">${eur(fa.rcm || 0, 0)}</span></div><div class="kpi"><span class="k">Te tocaría pagar</span><span class="v">${eur(fa.cuota || 0, 0)}</span></div></div>
        <p class="nota">Con lo que llevas vendido y cobrado este año, antes de restar lo que ya te han retenido.</p></section>`;
    }
  } catch (e) { console.warn('bloque de Cartera', k, e); }
  return '';
}
function vistaCartera(M) {
  if (S.carEdit) return vistaCarteraEditar(M);
  const lista = bloquesCartera().map((k) => ({ k, w: anchoCar(k), html: htmlBloqueCar(k, M) })).filter((b) => b.html);
  // filas: los estrechos seguidos se ponen al lado de los grandes que vengan detrás (el patrimonio, junto a la
  // gráfica y GrowIA), menos del grande que tenga sus propios estrechos detrás, que hace su fila con ellos (tus
  // posiciones con el reparto y lo que viene)
  const filas = [], w = (i) => lista[i] && lista[i].w;
  for (let i = 0; i < lista.length;) {
    const b = lista[i];
    if (b.w === 'lleno') { filas.push({ t: 'sola', a: [b] }); i++; continue; }
    if (b.w === 'grande') {
      let j = i + 1; const lado = []; while (w(j) === 'estrecho') lado.push(lista[j++]);
      filas.push(lado.length ? { t: 'par-der', a: [b], b: lado } : { t: 'sola', a: [b] }); i = j; continue;
    }
    let j = i; const pila = []; while (w(j) === 'estrecho') pila.push(lista[j++]);
    const gr = [];
    while (w(j) === 'grande' && !(gr.length && w(j + 1) === 'estrecho')) { gr.push(lista[j++]); if (w(j) === 'grande' && w(j + 1) === 'estrecho') break; }
    if (gr.length) filas.push({ t: 'par-izq', a: pila, b: gr }); else filas.push({ t: 'suelta', a: pila });
    i = j;
  }
  const col = (xs, cls = '') => `<div class="car-col${cls}">${xs.map((x) => x.html).join('')}</div>`;
  const empezar = htmlEmpezar();
  const aviso = empezar || (perfilIncompleto() && Date.now() - (LS.get('inv-perfil-aviso', 0) || 0) > 3 * 864e5
    ? `<div class="pf-recuerda" role="note"><span class="pf-r-ic">${ICONOS.perfil}</span><span class="pf-r-t"><b>${perfilVacio() ? 'Te falta tu perfil de inversor' : 'Tu perfil de inversor está a medias'}</b><small>Sin tu edad, tu plazo y el riesgo que aguantas, GrowIA te aconseja como a cualquiera. Es un minuto.</small></span><button type="button" class="btn peq pri" data-accion="perfil-guiado">${perfilVacio() ? 'Hacerlo ahora' : 'Terminarlo'}</button><button type="button" class="ib" data-accion="perfil-aviso-no" aria-label="Ahora no" title="Ahora no (vuelve en unos días)">${ICONOS.cerrar}</button></div>` : '');
  return `<div class="car">${aviso}${filas.map((f) => (f.t === 'sola' ? `<div class="car-fila">${f.a[0].html}</div>`
    : f.t === 'suelta' ? `<div class="car-fila suelta">${f.a.map((x) => `<div class="car-col">${x.html}</div>`).join('')}</div>`
    : `<div class="car-fila ${f.t}">${f.t === 'par-izq' ? col(f.a) + col(f.b) : col(f.a) + col(f.b, ' lado')}</div>`)).join('')}
    <div class="car-pie"><button type="button" class="btn peq car-ordenar" data-accion="ordenar-cartera">${ICONOS.ordenar}Personalizar Inicio</button></div></div>`;
}
/* 0.3: Personalizar, sobre la propia página. Cada bloque se ve como es (en pequeño, sin poder tocarlo) con su barra
   arriba: se arrastra por ella a donde quieras (con el dedo o el ratón), las flechas lo suben o bajan, la × lo quita,
   y abajo está lo que puedes añadir. Se guarda al momento en tu cartera, igual en todos tus dispositivos */
const ASA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
const flechaCE = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
function vistaCarteraEditar(M) {
  const v = bloquesCartera(), fuera = Object.keys(BLOQUES_CAR).filter((k) => !v.includes(k));
  return `<div class="ce">
    <div class="ce-cab"><h1>${L('Tu Inicio, a tu gusto', 'Your Home, your way')}</h1><p>${L('Arrastra cada bloque por su barra a donde quieras. Con la × lo quitas; abajo tienes lo que puedes añadir.', 'Drag each block by its bar to wherever you want. The × removes it; below is what you can add.')}</p></div>
    <ol class="ce-l" id="ceL">${v.map((k, i) => { const b = BLOQUES_CAR[k]; return `<li class="ce-b" data-k="${k}">
      <div class="ce-barra-b"><span class="ce-asa" aria-hidden="true">${ASA_SVG}</span><span class="ce-t"><b>${esc(b.n)}</b><small class="ce-w">${esc(ANCHO_CAR[b.w])}</small></span>
        <button type="button" class="ib" data-ce="sube" aria-label="${L('Subir', 'Move up')} ${esc(trad(b.n))}"${i ? '' : ' disabled'}>${flechaCE('M6 15l6-6 6 6')}</button><button type="button" class="ib" data-ce="baja" aria-label="${L('Bajar', 'Move down')} ${esc(trad(b.n))}"${i < v.length - 1 ? '' : ' disabled'}>${flechaCE('M6 9l6 6 6-6')}</button>
        ${b.fijo ? `<span class="ce-fijo" title="${esc(L('Este bloque va siempre en Inicio', 'This block is always on Home'))}">${L('Fijo', 'Fixed')}</span>` : `<button type="button" class="ib ce-quita" data-ce="quita" aria-label="${L('Quitar', 'Remove')} ${esc(trad(b.n))}">${ICONOS.cerrar}</button>`}</div>
      <div class="ce-prev" aria-hidden="true" inert>${htmlBloqueCar(k, M) || `<p class="nota">${esc(b.d)}</p>`}</div></li>`; }).join('')}</ol>
    ${fuera.length ? `<h2 class="ce-h">${L('Puedes añadir', 'You can add')}</h2><div class="ce-mas">${fuera.map((k) => { const b = BLOQUES_CAR[k]; return `<button type="button" class="ce-add" data-ce-add="${k}">${ICONOS.mas}<span><b>${esc(b.n)}</b><small>${esc(b.d)}</small></span></button>`; }).join('')}</div>` : ''}
    <div class="ce-pie"><button type="button" class="btn" data-ce="cancelar">${L('Cancelar', 'Cancel')}</button><button type="button" class="btn" data-ce="defecto">${L('Por defecto', 'Default')}</button><button type="button" class="btn pri" data-ce="listo">${ICONOS.ok}${L('Listo', 'Done')}</button></div>
  </div>`;
}
let ceGuardarT = 0, ceAntes = null, ceQuitarAtras = null;
function ceGuardar(v, repintar = true) {
  S.cartera.inicio = { bloques: v, v03: true };
  if (repintar) pintar();
  clearTimeout(ceGuardarT); ceGuardarT = setTimeout(() => { ceGuardarT = 0; guardarCarteraCallada('Inicio a tu gusto'); }, 900);
}
// Personalizar deja su entrada en el historial (Atrás lo cierra, guardando) y «Cancelar» deja Inicio como estaba al entrar
function abrirCarEdit() {
  if (S.carEdit) return;
  ceAntes = [...bloquesCartera()];
  S.carEdit = true; S.vista = 'cartera'; S.scrollTop = true; pintar();
  ceQuitarAtras = conAtras(() => cerrarCarEdit(true, true), null);
}
function cerrarCarEdit(guardar = true, desdeAtras = false) {
  if (!S.carEdit) return;
  S.carEdit = false;
  const cambiado = !guardar && ceAntes && ceAntes.join() !== bloquesCartera().join();
  if (cambiado) S.cartera.inicio = { bloques: ceAntes, v03: true };
  if (ceGuardarT || cambiado) { clearTimeout(ceGuardarT); ceGuardarT = 0; guardarCarteraCallada('Inicio a tu gusto'); }
  const q = ceQuitarAtras; ceQuitarAtras = null; if (!desdeAtras && q) q();
  S.scrollTop = true; pintar();
}
document.addEventListener('visibilitychange', () => { if (document.hidden && ceGuardarT) { clearTimeout(ceGuardarT); ceGuardarT = 0; guardarCarteraCallada('Inicio a tu gusto'); } });
// mover un bloque con su animación: los de al lado se deslizan a su sitio nuevo (FLIP)
function ceFlip(ul, cambio) {
  const antes = new Map([...ul.children].map((li) => [li, li.getBoundingClientRect().top]));
  cambio();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const li of ul.children) {
    if (li.classList.contains('arrastra')) continue;
    const d = antes.get(li) - li.getBoundingClientRect().top; if (!d) continue;
    li.animate([{ transform: `translateY(${d}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)' });
  }
}
document.addEventListener('click', (e) => {
  if (!S.carEdit) return;
  const b = e.target.closest('[data-ce], [data-ce-add]'); if (!b || b.disabled) return;
  const v = bloquesCartera();
  if (b.dataset.ceAdd) { const k = b.dataset.ceAdd; if (!v.includes(k)) { v.push(k); ceGuardar(v); setTimeout(() => { const li = document.querySelector(`.ce-b[data-k="${k}"]`); if (li) { li.scrollIntoView({ block: 'center', behavior: 'smooth' }); li.classList.add('nuevo'); } }, 30); vibra(); } return; }
  const a = b.dataset.ce, li = b.closest('.ce-b'), k = li && li.dataset.k, i = v.indexOf(k), ul = $('#ceL');
  if (a === 'listo') { cerrarCarEdit(true); toast(L('Inicio guardado a tu gusto', 'Home saved your way'), 2500); return; }
  if (a === 'cancelar') { cerrarCarEdit(false); return; }
  if (a === 'defecto') { ceGuardar([...CAR_DEFECTO]); toast(L('Inicio como venía', 'Home reset'), 2500); return; }
  if (a === 'sube' && i > 0) { ceFlip(ul, () => ul.insertBefore(li, li.previousElementSibling)); v.splice(i, 1); v.splice(i - 1, 0, k); ceGuardar(v, false); ceFlechas(); }
  else if (a === 'baja' && i >= 0 && i < v.length - 1) { ceFlip(ul, () => ul.insertBefore(li.nextElementSibling, li)); v.splice(i, 1); v.splice(i + 1, 0, k); ceGuardar(v, false); ceFlechas(); }
  else if (a === 'quita' && i >= 0 && !BLOQUES_CAR[k].fijo) {
    li.classList.add('se-va'); v.splice(i, 1);
    setTimeout(() => { ceGuardar(v); toast(L(`Quitado: ${BLOQUES_CAR[k].n}. Lo tienes abajo para volver a añadirlo.`, `Removed: ${BLOQUES_CAR[k].n}. It’s below if you want it back.`), 3500); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 230);
  }
});
// las flechas de arriba y abajo, encendidas o no según el sitio de cada uno (tras mover sin repintar)
function ceFlechas() { const ls = $$('#ceL > .ce-b'); ls.forEach((li, i) => { const s1 = li.querySelector('[data-ce="sube"]'), b1 = li.querySelector('[data-ce="baja"]'); if (s1) s1.disabled = !i; if (b1) b1.disabled = i === ls.length - 1; }); }
// arrastrar por la barra: el bloque sigue al dedo y, al pasar la mitad del de al lado, se cambian; cerca del borde
// de la pantalla, la página se desplaza sola
document.addEventListener('pointerdown', (e) => {
  if (!S.carEdit) return;
  const barra = e.target.closest('.ce-barra-b'); if (!barra || e.target.closest('button') || e.button) return;
  const li = barra.closest('.ce-b'), ul = li.parentElement;
  e.preventDefault();
  let y0 = e.clientY, yA = e.clientY, raf = 0, vivo = true;
  li.classList.add('arrastra'); document.body.classList.add('ce-arrastrando'); vibra();
  try { barra.setPointerCapture(e.pointerId); } catch (er) {}
  const coloca = () => {
    const ant = li.previousElementSibling, sig = li.nextElementSibling, dy = yA - y0;
    if (dy < 0 && ant && -dy > ant.offsetHeight / 2) { const h0 = ant.offsetHeight; ceFlip(ul, () => ul.insertBefore(li, ant)); y0 -= h0 + 12; }
    else if (dy > 0 && sig && dy > sig.offsetHeight / 2) { const h0 = sig.offsetHeight; ceFlip(ul, () => ul.insertBefore(sig, li)); y0 += h0 + 12; }
    li.style.transform = `translateY(${yA - y0}px)`;
  };
  const borde = () => {
    raf = 0; if (!vivo) return;
    const v = yA < 110 ? -Math.min(16, (110 - yA) / 4) : yA > innerHeight - 140 ? Math.min(16, (yA - innerHeight + 140) / 4) : 0;
    if (v) { const antes = scrollY; scrollBy(0, v); const hecho = scrollY - antes; if (hecho) { y0 -= hecho; coloca(); } raf = requestAnimationFrame(borde); }
  };
  const mueve = (ev) => { yA = ev.clientY; coloca(); if (!raf) raf = requestAnimationFrame(borde); };
  const fin = () => {
    vivo = false; cancelAnimationFrame(raf);
    removeEventListener('pointermove', mueve); removeEventListener('pointerup', fin); removeEventListener('pointercancel', fin);
    li.classList.remove('arrastra'); document.body.classList.remove('ce-arrastrando');
    const dy = yA - y0; li.style.transform = '';
    if (dy && !matchMedia('(prefers-reduced-motion: reduce)').matches) li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: 200, easing: 'cubic-bezier(.2,.7,.3,1)' });
    const v = [...ul.children].map((x) => x.dataset.k);
    if (v.join() !== bloquesCartera().join()) { ceGuardar(v, false); ceFlechas(); }
  };
  addEventListener('pointermove', mueve); addEventListener('pointerup', fin); addEventListener('pointercancel', fin);
});
function refrescarToca() {
  if (S.vista !== 'cartera' || !S.cartera) return;
  let html; try { html = htmlToca(S.M || calcular()); } catch (e) { return; }
  for (const el of $$('#vista .toca')) {
    const t = document.createElement('div'); t.innerHTML = html;
    if (t.firstElementChild) el.replaceWith(t.firstElementChild); else el.remove();
  }
}
/* Lo primero de Cartera, debajo del patrimonio: lo que dice GrowIA (su diagnóstico de una frase y sus notas)
   y lo que toca hacer ahora, sacado del paso a paso, con su botón para marcarlo hecho sin salir de aquí */
function htmlToca(M) {
  let P; try { P = pasosRuta(M); } catch (e) { P = { mes: [], seis: [] }; }
  const hoy = hoyIso(), hechos = (S.cartera.ruta && S.cartera.ruta.hechos) || {};
  // solo las tareas, como en el Paso a paso (las fechas que vigilar no se «hacen»; antes salían «Ver los 17» frente a 14)
  const todos = [...P.mes, ...P.seis].filter((x) => !x.auto && claseRuta(x) === 'tarea');
  const pend = todos.filter((x) => !x.hecho);
  // lo que acabas de marcar se queda tachado hasta mañana, para que veas que se ha guardado
  const recien = todos.filter((x) => x.hecho && hechos[x.hechoK] === hoy);
  const v = [...pend.filter((x) => x.urgente), ...pend.filter((x) => !x.urgente)].slice(0, innerWidth < 760 ? 2 : 3).concat(recien.slice(0, 1));
  const ia = iaActual();
  let cab = '', notas = '', tit = '';
  if (ia) {
    const vIA = valoresIA(M), f = String(ia.fecha || ''), d = new Date(f.length > 10 ? f : f + 'T12:00:00'), dias = diasEntre(iso(d), hoy);
    const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const cuando = ia.propio ? (dias === 0 ? `Hoy a las ${hora}` : dias === 1 ? `Ayer a las ${hora}` : `El ${fechaLarga(iso(d))}`) : 'Análisis de partida';
    cab = `<div class="iac-cab"><span class="iac-ico ia-av">${AVATAR_IA}</span><div><h2 id="hToca" data-no-trad>${NOM_IA}</h2><small>${esc(cuando)}${IA.generando ? ' · revisándolo ahora' : ''}</small></div><a class="enlace acento" href="#analisis">Ver el análisis</a></div>`;
    tit = ia.titular ? `<p class="iac-tit">${rellenarIA(ia.titular, vIA)}</p>` : '';
    const res = (ia.resumen || [])[0];
    tit += res ? `<p class="iac-res">${rellenarIA(res, vIA)}</p>` : '';
    notas = (ia.puntuaciones || []).length ? `<div class="iac-notas">${ia.puntuaciones.slice(0, 5).map((x) => { const n = Math.max(0, Math.min(5, +x.nota || 0)); return `<span class="iac-nota" title="${esc(x.k)}: ${n} de 5"><small>${esc(/^riesgo$/i.test(x.k) ? 'Riesgo' : x.k)}</small><span class="ia-puntos" role="img" aria-label="${n} de 5">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span></span>`; }).join('')}</div>` : '';
  } else if (!S.iaListo) {
    cab = `<div class="iac-cab"><span class="iac-ico ia-av">${AVATAR_IA}</span><div><h2 id="hToca" data-no-trad>${NOM_IA}</h2><small>Cargando lo que dice de tu cartera…</small></div></div>`;
  } else if (AS.clave) {
    cab = `<div class="iac-cab"><span class="iac-ico ia-av">${AVATAR_IA}</span><div><h2 id="hToca" data-no-trad>${NOM_IA}</h2><small>${IA.generando ? 'Revisando tu cartera ahora' : 'Todavía no ha revisado tu cartera'}</small></div></div>
      ${IA.generando ? '' : `<button type="button" class="btn peq pri iac-boton" data-accion="ia-actualizar">${ICONOS.growia}Que la revise ahora</button>`}`;
  } else {
    cab = `<div class="iac-cab"><span class="iac-ico ia-av">${AVATAR_IA}</span><div><h2 id="hToca" data-no-trad>${NOM_IA}</h2><small>Aún sin activar en este dispositivo</small></div></div>
      <p class="iac-tit iac-act">${esPublico() ? L('Analiza tu cartera cada día, te explica lo que pasa y contesta lo que le preguntes. Es gratis con una clave de Google.', 'It analyses your portfolio every day, explains what is going on and answers your questions. Free with a Google key.') : 'Analiza tu cartera cada día, te dice qué hacer y contesta lo que le preguntes. Es gratis con una clave de Google.'}</p>
      <button type="button" class="btn peq pri iac-boton" data-accion="asesor">${ICONOS.growia}Activar GrowIA</button>`;
  }
  const lista = v.length ? `<div class="iac-sub"><h3>Lo que toca ahora</h3><button class="enlace acento" data-calif="ruta">${pend.length > v.length ? `Ver los ${pend.length}` : 'Ver el paso a paso'}</button></div>
    <ul>${v.map((x) => `<li class="${x.urgente && !x.hecho ? 'urgente' : ''}${x.hecho ? ' hecho' : ''}">${checkRuta(x, '')}<span class="iac-paso"><span class="toca-c">${esc(x.hecho ? 'Hecho hoy' : x.cuando || (x.fuente === 'ia' ? 'según GrowIA' : ''))}</span><b>${x.t.replace(/ €/g, ' €')}</b></span></li>`).join('')}</ul>` : '';
  // en el ordenador, a lo ancho debajo de la gráfica: el diagnóstico a la izquierda y lo que toca a la derecha
  return `<section class="toca iac" aria-labelledby="hToca"><div class="iac-in${lista ? ' con-lista' : ''}"><div class="iac-izq">${cab}${tit}${notas}</div>${lista ? `<div class="iac-der">${lista}</div>` : ''}</div></section>`;
}
/* el nombre completo del fondo o la empresa, cuando dice algo más que el corto ("S&P 500" → "iShares US Index Fund (IE) S Acc EUR") */
function nombreReal(i) {
  const n = String((i && i.nombre) || '').trim(), c = String((i && i.corto) || '').trim();
  if (!n || !c) return '';
  const a = normTxt(n), b = normTxt(c);
  return !b || a.startsWith(b) ? '' : n;
}
function chipsPos(f) {
  const c = [];
  if (f.estimada) c.push('<span class="chip warn" title="No sabemos las participaciones exactas: ponlas en su ficha, Editar, para que el valor cuadre al céntimo">Cantidad estimada</span>');
  if (f.p && f.p.estado === 'antiguo') c.push('<span class="chip warn">precio antiguo</span>');
  return c.join('');
}

function htmlPosiciones(M) {
  const filas = ordenarPos(M.filas).map((f) => {
    const id = f.pos.id;
    return `<button class="fila" data-pos="${esc(id)}" aria-label="Abrir la ficha de ${esc(f.inst.corto || f.inst.nombre)}">
        <span class="activo-l">${logo(f.inst.dominio, f.inst.corto || f.inst.nombre)}<span class="activo"><b>${esc(f.inst.corto || f.inst.nombre)}</b>${nombreReal(f.inst) ? `<span class="nombre-real" title="${esc(nombreReal(f.inst))}">${esc(nombreReal(f.inst))}</span>` : ''}<small class="pos-donde">${origen(f.inst)}<span class="pos-pl">${esc(f.pos.plataforma || '')}</span></small>${(() => { const ch = chipsPos(f) + (['mantener', 'aportar'].includes(f.senal.nivel) ? '' : `<span class="senal ${f.senal.nivel} solo-movil">${f.senal.txt}</span>`); return ch ? `<small class="pos-chips">${ch}</small>` : ''; })()}</span></span>
        <span class="r c-precio">${B('pp:' + id)}</span>
        <span class="r c-hoy"><span class="k hoy-l">hoy </span>${B('pdE:' + id)}<small class="hoy-pct">${B('pd:' + id)}</small></span>
        <span class="r valor c-val">${B('pv:' + id)}</span>
        <span class="r c-desde" title="Lo que llevas ganado o perdido desde que la compraste">${B('pgd:' + id)}</span>
        <span class="r c-peso k">${B('pw:' + id)}</span>
        <span class="r c-gan">${B('pg:' + id)}<small class="gan-pct">${B('pt:' + id)}</small></span>
        <span class="r c-pct">${B('pt:' + id)}</span>
        <span class="c-senal"><span class="senal ${f.senal.nivel}">${f.senal.txt}</span></span>
      </button>`;
  }).join('');
  const ef = M.efectivo.map((e) => `<button class="fila efectivo" data-accion="efectivo" data-plat="${esc(e.plataforma)}" aria-label="Cambiar el efectivo de ${esc(e.plataforma)}"><span class="activo-l">${logo(null, '€')}<span class="activo"><b>Efectivo</b><small>${esc(e.plataforma)}</small></span></span><span class="c-precio"></span><span class="c-hoy"></span><span class="r valor num c-val">${eur(e.importe)}</span><span class="r c-peso k num">${pct(M.total ? (e.importe / M.total) * 100 : 0, 1)}</span><span class="c-gan"></span><span class="c-pct"></span><span class="c-senal"></span></button>`).join('');
  return `<section aria-labelledby="hPos">
    <div class="sec-cab pos-cab"><h2 id="hPos">Posiciones</h2><span class="k">${M.filas.length}<span class="pos-act"> activos</span></span>
      <div class="der">${M.filas.length > 1 ? `<label class="orden-chip" title="Ordenar">${ICONOS.orden}<span>${tituloCol(ORDEN_CORTO[S.ordenPos.k] || 'Valor')}</span><i>${S.ordenPos.k === 'activo' ? (S.ordenPos.dir === 'asc' ? 'A-Z' : 'Z-A') : S.ordenPos.dir === 'asc' ? '↑' : '↓'}</i><select data-orden-pos-sel aria-label="Ordenar las posiciones">` + COLS_POS.map(([k, t]) => [[k, 'desc'], [k, 'asc']].map(([kk, d]) => `<option value="${kk}|${d}"${S.ordenPos.k === kk && S.ordenPos.dir === d ? ' selected' : ''}>${t === '%' ? 'Ganancia en %' : tituloCol(t)} ${kk === 'activo' ? (d === 'asc' ? 'A-Z' : 'Z-A') : kk === 'senal' ? (esPublico() ? (d === 'asc' ? L('vender primero', 'sell first') : L('comprar primero', 'buy first')) : d === 'asc' ? 'más urgente' : 'menos urgente') : d === 'desc' ? 'mayor a menor' : 'menor a mayor'}</option>`).join('')).join('') + '</select></label>' : ''}<button class="btn peq btn-op" data-accion="operacion" title="Apuntar una compra o una venta" aria-label="Compra o venta">${ICONOS.compraVenta}<span class="txt-pc">Apuntar compra o venta</span></button><button class="btn peq btn-ya" data-accion="nueva-pos" title="Añadir lo que ya tenías antes de GrowFolio" aria-label="Lo que ya tenías">${ICONOS.mas}<span class="txt-pc">Añadir lo que ya tenía</span></button></div></div>

    <div class="tabla-pos">
      <div class="fila cab">${COLS_POS.map(([k, t0, c]) => { const t = tituloCol(t0), on = S.ordenPos && S.ordenPos.k === k; return `<span class="${c}"><button class="th" data-orden-pos="${k}" aria-pressed="${on}" title="Ordenar por ${t.toLowerCase()}">${t}${on ? `<span class="fl">${S.ordenPos.dir === 'asc' ? '↑' : '↓'}</span>` : ''}</button></span>`; }).join('')}</div>
      ${filas || '<div class="vacio">Todavía no hay nada. Pulsa «+» (Añadir lo que ya tenías) y busca cada inversión por su nombre o su ISIN.</div>'}${ef}
    </div>
  </section>`;
}

const DIMS = [['clase', 'Tipo'], ['region', 'Región'], ['sector', 'Sector'], ['plataforma', 'Plataforma'], ['producto', 'Producto'], ['riesgo', 'Riesgo']];
const GRIS = new Set(['Efectivo', 'Sin datos', 'Otros']);
function htmlReparto(M) {
  // con la cartera vacía no hay nada que repartir: una frase en vez de las barras vacías
  if (!M.filas.length && !(M.liquidez > 0)) return `<section aria-labelledby="hRep"><div class="sec-cab"><h2 id="hRep">Reparto</h2></div><div class="vacio">${L('Cuando metas lo que tienes, aquí verás cómo se reparte: por tipo, región, sector, plataforma y producto.', 'Once you add what you own, you will see here how it splits: by type, region, sector, platform and product.')}</div></section>`;
  const r = reparto(M, S.dim, S.base);
  const conBase = S.dim === 'region' || S.dim === 'sector';
  let slot = 0;
  const color = (x) => {
    if (S.dim === 'riesgo') { const n = parseInt(x.k, 10); return n ? `rgba(237, 187, 69,${(0.22 + (n / 7) * 0.78).toFixed(2)})` : 'var(--c0)'; }
    if (GRIS.has(x.k) || slot >= 5) return 'var(--c0)';
    slot += 1; return `var(--c${slot})`;
  };
  const filas = r.filas.map((x) => ({ ...x, col: color(x) }));
  const notas = {
    sector: 'En los fondos, el reparto es el de un ETF que sigue el mismo índice: IVV para el S&P 500, IEUR para Europa, EEM para emergentes, y VB y SCZ para las small caps.',
    region: 'Las small caps globales se reparten según la ficha de Vanguard.',
    riesgo: 'Escala oficial de 1 a 7 según la volatilidad del último año. El efectivo cuenta como 1.',
  };
  return `<section aria-labelledby="hRep">
    <div class="sec-cab"><h2 id="hRep">Reparto</h2><span class="k">${conBase && S.base === 'rv' ? 'solo renta variable' : 'todo el patrimonio'}</span></div>
    <div class="tabs-fila"><div class="tabs" role="group" aria-label="Clasificar por">${DIMS.map(([k, t]) => `<button data-dim="${k}" aria-pressed="${S.dim === k}">${t}</button>`).join('')}</div>
    ${conBase ? `<div class="tabs" role="group" aria-label="Sobre qué"><button data-base="todo" aria-pressed="${S.base !== 'rv'}">Todo</button><button data-base="rv" aria-pressed="${S.base === 'rv'}">Renta variable</button></div>` : ''}</div>
    <div class="apilada" role="img" aria-label="${esc(filas.map((x) => `${x.k} ${fmtNum(x.pct, 1)} %`).join(', '))}">${filas.filter((x) => x.pct >= 0.4).map((x) => `<i style="flex:${x.pct.toFixed(3)};background:${x.col}" title="${esc(x.k)} ${fmtNum(x.pct, 1)} %"></i>`).join('')}</div>
    <ul class="leyenda">${filas.map((x) => `<li><i style="background:${x.col}"></i><span class="n">${esc(x.k)}</span><span class="p">${pct(x.pct, 1)}</span><span class="e">${eur(x.v, 0)}</span></li>`).join('') || '<li class="vacio">Sin datos</li>'}</ul>
    ${notas[S.dim] ? `<p class="nota">${notas[S.dim]}</p>` : ''}
  </section>`;
}

