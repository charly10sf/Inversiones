/* =====================================================================
   Noticias (9 nov 2026, rama «noticias»). Carlos: «una pestaña de noticias mejor de la que ya hay, más extensa, más
   detallada; un amigo usa Investing para las noticias, te puedes basar en algo de eso». Lo que se toma de Investing:
   la cinta de índices arriba, lo importante del día, los titulares por temas y por horas (última hora, hoy, ayer),
   las noticias de cada empresa con su tono y la agenda de lo que viene. Lo que pone Toisón: lo tuyo primero, las cifras
   con su día (lo que no es de hoy lo dice) y cada titular se puede leer dentro, resumido por la IA (a.noti).
   El tono es el de la noticia, leído por la IA (campo imp del escaneo): no dice qué hacer.
   ===================================================================== */
const NT_TONO = { positivo: ['up', '▲', 'Buena', 'Good'], negativo: ['down', '▼', 'Negativa', 'Negative'], mixto: ['neu', '◆', 'Mixta', 'Mixed'], neutral: ['neu', '●', 'Neutral', 'Neutral'] };
const ntTono = (imp) => { const t = NT_TONO[imp] || NT_TONO.neutral; return `<i class="nt-tono ${t[0]}">${t[1]} ${L(t[2], t[3])}</i>`; };
// la cinta de arriba: las bolsas, el oro, el petróleo, el euro y el bitcoin, como en Investing
const NT_INDICES = [['^IBEX', 'Ibex 35'], ['^STOXX50E', 'Euro Stoxx 50'], ['^GDAXI', 'DAX'], ['^GSPC', 'S&P 500'], ['^NDX', 'Nasdaq 100'], ['^N225', 'Nikkei 225'], ['GC=F', L('Oro', 'Gold')], ['BZ=F', 'Brent'], ['EURUSD=X', L('Euro/dólar', 'EUR/USD')], ['BTC-EUR', 'Bitcoin']];
const ntNum = (p) => (p == null || !isFinite(p) ? '—' : (+p).toLocaleString(IDIOMA === 'en' ? 'en-GB' : 'es-ES', { minimumFractionDigits: p < 10 ? 4 : p < 1000 ? 2 : 0, maximumFractionDigits: p < 10 ? 4 : p < 1000 ? 2 : 0 }));
const ntNorm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// el escaneo guarda el texto con un tope: si acaba a medias, con sus puntos suspensivos
const ntEntero = (t) => { const x = String(t || '').trim(); return /[.!?)»"]$/.test(x) ? x : x.replace(/[\s,;:–-]+\S{0,12}$/, '') + '…'; };
// los nombres del radar en mayúsculas («BAYERISCHE MOTOREN WERKE»), como se escriben
const ntNombre = (n) => (n && n === n.toUpperCase() && /[A-Z]{4}/.test(n) ? n.toLowerCase().replace(/(^|[\s.&/-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Sa|Ag|Se|Nv|Plc|Spa|Ab|Asa)\b/g, (m) => m.toUpperCase()) : n);
const ntSinFuentes = (t) => String(t || '').replace(/\s*\((?:fuentes?|source)s?\s[\d,\sy-]+\)/gi, '');
function ntNombreTema(k) {
  if (k === 'region') { const c = comunidadUsuario(), n = c ? nombreComunidad(c) : ''; return n || L('Tu comunidad', 'Your region'); }
  const t = NOT_TEMAS.find(([x]) => x === k) || NOT_TEMAS[0];
  return L(t[1], t[2]);
}
// la hora de un titular: «14:05» si es de hoy; si no, el día y la hora
function ntHora(d) {
  const x = new Date(d); if (!isFinite(x)) return '';
  const h = x.toLocaleTimeString(IDIOMA === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' });
  return iso(x) === hoyIso() ? h : `${diaSemL(x.getDay()).slice(0, 3)} ${h}`;
}
const ntGrupo = (d) => { if (edadHoras(d) <= 2) return 'ultima'; const k = iso(new Date(d)); return k === hoyIso() ? 'hoy' : k === ayerIso() ? 'ayer' : 'antes'; };
const NT_GRUPOS = { ultima: ['Última hora', 'Breaking'], hoy: ['Hoy', 'Today'], ayer: ['Ayer', 'Yesterday'], antes: ['Esta semana', 'This week'] };

function ntCinta() {
  const MK = (S.precios && S.precios.mercados) || {};
  const fichas = NT_INDICES.filter(([k]) => MK[k] && MK[k].precio != null).map(([k, n]) => {
    const m = MK[k], v = m.variacion_dia, dc = diaCifra(m.fecha);
    return `<a class="nt-ind ${v == null ? '' : v >= 0 ? 'up' : 'down'}" href="#mercados"><span class="nt-ind-n">${esc(n)}${dc ? `<small title="${esc(L('Último cierre', 'Last close'))}">${esc(dc)}</small>` : ''}</span><b data-no-trad>${ntNum(m.precio)}</b><span class="nt-ind-v">${v == null ? '' : `${v >= 0 ? '▲' : '▼'} ${pctS(v, 2)}`}</span></a>`;
  });
  return fichas.length ? `<div class="nt-cinta" role="list" aria-label="${esc(L('Cómo van los mercados', 'How markets are doing'))}">${fichas.join('')}</div>` : '';
}
// lo importante del día: los temas del informe de la IA (los mismos para todos), con lo que supone para lo tuyo
function ntImportante() {
  const inf = informeVisible(), ms = ((inf && inf.mercado) || []).slice(0, 6);
  if (!ms.length) return '';
  const cuando = inf.generado ? haceCuanto(inf.generado) : '';
  // en el ordenador ancho, las tres primeras abiertas (una fila); en el móvil, solo la primera, para llegar antes a los titulares
  const abiertas = matchMedia('(min-width: 1180px)').matches ? 3 : 1;
  return `<section class="nt-imp" aria-labelledby="hNtImp"><div class="sec-cab"><h2 id="hNtImp">${conIA('Lo importante hoy, según la IA', 'Today’s big stories, by GrowIA')}</h2>${cuando ? `<span class="k">${esc(L(`leído ${cuando}`, `read ${cuando}`))}</span>` : ''}</div>
    <div class="nt-imp-l">${ms.map((m, k) => `<details class="nt-imp-c"${k < abiertas ? ' open' : ''}><summary>${chipImpacto(m.impacto)}${m.zona ? `<span class="zona-ia">${bandera(ZONA_BANDERA[m.zona])}${esc(m.zona)}</span>` : ''}<b>${escIA(m.t)}</b></summary>
      <p>${esc(ntSinFuentes(limpiaIA(m.detalle)))}</p>${m.implica ? `<p class="ia-implica"><b>${L('Para tu cartera:', 'For your portfolio:')}</b> ${escIA(m.implica)}</p>` : ''}${enlacesFuentes(m.fuentes, 3)}</details>`).join('')}</div>
    ${(inf.macro || []).length ? `<div class="macro-ia nt-macro">${inf.macro.slice(0, 4).map((x) => `<div><small>${escIA(x.t)}</small><b>${esc(datoIA(x.dato))}</b><p>${escIA(x.lectura)}</p></div>`).join('')}</div>` : ''}</section>`;
}
function ntFiltradas(M) {
  const todas = noticiasTodas(M), tema = S.notTema || 'todo', q = ntNorm(S.notBusca).trim();
  return todas.filter((n) => (tema === 'todo' || n.tema === tema) && (!q || ntNorm(`${n.t} ${n.f || ''} ${n.inst ? n.inst.corto || n.inst.nombre : ''}`).includes(q)));
}
function ntItem(n, grande) {
  const i = n.inst, v = n.varDia, dc = n.fechaMov ? diaCifra(n.fechaMov) : '';
  return `<li class="nt-i${grande ? ' grande' : ''}"><span class="nt-h" data-no-trad>${esc(ntHora(n.d))}</span><div class="nt-c">
    <p class="nt-src">${logo(webMedio(n), n.f || '?', 'not-logo')}<span data-no-trad>${esc(n.f || n.w || '')}</span><span class="nt-tema">${esc(ntNombreTema(n.tema))}</span></p>
    <a class="nt-t noti" data-no-trad href="${esc(urlSegura(n.u))}" target="_blank" rel="noopener noreferrer" data-nf="${esc(n.f || '')}" data-nd="${esc(n.d || '')}" data-nw="${esc(n.w || '')}">${esc(n.t)}</a>
    ${i ? `<p class="nt-pie"><span class="chip">${esc(i.corto || i.nombre)}</span>${v != null && isFinite(v) ? `<span class="${v >= 0 ? 'up' : 'down'}">${dc ? esc(dc) : L('hoy', 'today')} ${pctS(v, 2)}</span>` : ''}</p>` : ''}</div></li>`;
}
function htmlListaNt(M) {
  const lista = ntFiltradas(M), n = S.notN || 30;
  if (!lista.length) return `<div class="vacio">${S.notBusca ? L('Ningún titular con esas palabras.', 'No headlines with those words.') : L('No hay titulares de este tema en los últimos días.', 'No headlines on this topic in the last few days.')}</div>`;
  const vis = lista.slice(0, n), grupos = [];
  for (const x of vis) { const g = ntGrupo(x.d); let u = grupos[grupos.length - 1]; if (!u || u.k !== g) { u = { k: g, l: [] }; grupos.push(u); } u.l.push(x); }
  return `${grupos.map((g, gi) => `<section class="nt-g nt-g-${g.k}"><h3>${g.k === 'ultima' ? '<i class="nt-vivo" aria-hidden="true"></i>' : ''}${esc(L(...NT_GRUPOS[g.k]))}<small>${g.l.length}</small></h3><ul class="nt-l">${g.l.map((x, k) => ntItem(x, gi === 0 && k === 0 && !S.notBusca)).join('')}</ul></section>`).join('')}
    ${lista.length > n ? `<button type="button" class="btn peq nt-mas" data-nt-mas>${L(`Ver ${Math.min(30, lista.length - n)} titulares más`, `Show ${Math.min(30, lista.length - n)} more headlines`)}</button>` : ''}`;
}
// lo que ha leído la IA de cada empresa (el escaneo recorre las del radar): las tuyas primero, luego las que más pesan
function ntEmpresas(M) {
  const lect = (S.escaneo && S.escaneo.lectura) || {}, h = horasRecientes(30), tono = S.notEmpTono || 'todo';
  const mias = new Set(M.filas.map((f) => String(f.inst.yahoo || '').toUpperCase()).filter(Boolean));
  const out = [];
  for (const [s, l] of Object.entries(lect)) {
    if (!l || !l.txt || edadHoras(l.d) > h) continue;
    if (tono !== 'todo' && l.imp !== tono) continue;
    const r = radarPorSim(s), mia = mias.has(s.toUpperCase());
    const i = mia ? M.filas.find((f) => String(f.inst.yahoo || '').toUpperCase() === s.toUpperCase()).inst : null;
    out.push({ s, l, r, mia, n: i ? i.corto || i.nombre : r && r.n ? ntNombre(nombreCorto(r.n)) : s });
  }
  return out.sort((a, b) => b.mia - a.mia || (b.l.rel || 0) - (a.l.rel || 0) || (String(b.l.d) > String(a.l.d) ? 1 : -1));
}
function ntSeccionEmpresas(M) {
  const lect = S.escaneo && S.escaneo.lectura;
  if (!lect) return `<section class="nt-emp" aria-labelledby="hNtEmp"><div class="sec-cab"><h2 id="hNtEmp">${L('Empresas: lo que ha pasado', 'Companies: what happened')}</h2></div><p class="nota">${L('Bajando lo que ha leído la IA de cada empresa…', 'Loading what the AI read about each company…')}</p></section>`;
  const lista = ntEmpresas(M), n = S.notEmpN || 8, tono = S.notEmpTono || 'todo';
  const tonos = [['todo', 'Todas', 'All'], ['positivo', '▲ Buenas', '▲ Good'], ['negativo', '▼ Negativas', '▼ Negative']];
  return `<section class="nt-emp" aria-labelledby="hNtEmp"><div class="sec-cab"><h2 id="hNtEmp">${L('Empresas: lo que ha pasado', 'Companies: what happened')}</h2><span class="k">${L(`${S.escaneo.leidas_24h || Object.keys(lect).length} leídas por la IA en 24 h`, `${S.escaneo.leidas_24h || Object.keys(lect).length} read by the AI in 24 h`)}</span></div>
    <div class="tabs nt-tonos" role="group" aria-label="${esc(L('Tono', 'Tone'))}">${tonos.map(([k, es, en]) => `<button type="button" data-nt-tono="${k}" aria-pressed="${tono === k}">${L(es, en)}</button>`).join('')}</div>
    ${lista.length ? `<ul class="nt-emp-l">${lista.slice(0, n).map(({ s, l, r, mia, n: nom }) => `<li><div class="nt-emp-cab">${logo(r && r.w, nom)}<button type="button" class="nt-emp-n" data-consulta="${esc(s)}">${esc(nom)}</button><small data-no-trad>${esc(s)}</small>${mia ? `<span class="chip">${L('Tuya', 'Yours')}</span>` : ''}${ntTono(l.imp)}</div>
      <p>${esc(ntEntero(limpiaIA(l.txt)))}</p>${l.cat ? `<p class="nt-vig"><b>${L('Qué vigilar:', 'What to watch:')}</b> ${esc(ntEntero(limpiaIA(l.cat)))}</p>` : ''}<div class="nt-emp-pie"><span>${esc(haceCuanto(l.d))}</span>${enlacesFuentes(l.fuentes, 2)}</div></li>`).join('')}</ul>
      ${lista.length > n ? `<button type="button" class="btn peq nt-mas" data-nt-emp>${L(`Ver ${Math.min(12, lista.length - n)} empresas más`, `Show ${Math.min(12, lista.length - n)} more companies`)}</button>` : ''}`
    : `<div class="vacio">${L('Nada con ese tono en las últimas horas.', 'Nothing with that tone in the last few hours.')}</div>`}
    <p class="nota">${L('El tono es el de la noticia, leído por la IA: no dice qué hacer.', 'The tone is the news item’s, read by the AI: it doesn’t say what to do.')}</p></section>`;
}
// la agenda de hoy y mañana: bancos centrales, resultados y dividendos (lo de Investing de «calendario económico»)
function ntAgenda(M) {
  let ev = [];
  try { ev = agendaLista(M, 3).filter((e) => ['banco', 'resultados', 'dividendo', 'fondo', 'hacienda'].includes(e.tipo) || e.mio).slice(0, 6); } catch (e) { ev = []; }
  return `<section class="nt-ag" aria-labelledby="hNtAg"><div class="sec-cab"><h2 id="hNtAg">${L('En la agenda', 'On the agenda')}</h2><div class="der"><a class="enlace acento" href="#agenda">${L('Calendario', 'Calendar')}</a></div></div>
    ${ev.length ? `<ul class="rdia-prox">${ev.map((e) => `<li><span class="ag-cd">${faltan(e.d, true)}</span><span class="ag-ic">${iconoAg(e)}</span><span><b>${tituloAg(e)}</b><small>${esc(e.s || '')}</small></span></li>`).join('')}</ul>` : `<p class="nota">${L('Nada importante hoy ni en los dos próximos días.', 'Nothing big today or in the next two days.')}</p>`}</section>`;
}
function htmlNoticiasPag(M) {
  const todas = noticiasTodas(M), tema = NOT_TEMAS.some(([k]) => k === S.notTema) ? S.notTema : (S.notTema = 'todo');
  const cuenta = (k) => (k === 'todo' ? todas.length : todas.filter((n) => n.tema === k).length);
  const temas = NOT_TEMAS.filter(([k]) => k === 'todo' || k === tema || cuenta(k) > 0);
  const gen = S.precios && S.precios.noticias_generado;
  return `<a class="vista-volver" href="#cartera">${SVG('<path d="M15 18l-6-6 6-6"/>', 2)}${L('Inicio', 'Home')}</a>
  <div class="vista-cab"><h1>${L('Noticias', 'News')}</h1><p>${L('Lo que mueve los mercados y lo tuyo: los titulares de la prensa española e internacional, por temas y por horas.', 'What moves markets and your holdings: Spanish and international headlines, by topic and by time.')}${gen ? ` <span class="nt-act">${esc(L(`Titulares de ${haceCuanto(gen)}; precios de las ${horaPrecios()}.`, `Headlines from ${haceCuanto(gen)}; prices at ${horaPrecios()}.`))}</span>` : ''}</p></div>
  ${ntCinta()}
  ${ntImportante()}
  <div class="nt-cols"><div class="nt-main">
    <section class="nt-tit" aria-labelledby="hNtTit"><div class="sec-cab"><h2 id="hNtTit">${L('Titulares', 'Headlines')}</h2><span class="k">${L('Toca uno y la IA te lo resume aquí', 'Tap one and the AI sums it up here')}</span></div>
      <div class="nt-filtros"><div class="tabs nt-temas" role="group" aria-label="${esc(L('Temas', 'Topics'))}">${temas.map(([k]) => `<button type="button" data-nt-tema="${k}" aria-pressed="${tema === k}">${esc(ntNombreTema(k))}<small>${cuenta(k)}</small></button>`).join('')}</div>
        <label class="nt-busca">${ICO_BUSCA}<input id="ntBusca" type="search" value="${esc(S.notBusca || '')}" placeholder="${esc(L('Buscar en los titulares', 'Search headlines'))}" aria-label="${esc(L('Buscar en los titulares', 'Search headlines'))}" autocomplete="off"></label></div>
      <div id="ntLista">${htmlListaNt(M)}</div></section>
  </div><aside class="nt-lado">
    ${ntSeccionEmpresas(M)}
    ${ntAgenda(M)}
  </aside></div>
  <p class="nota nt-pie-n">${L('Titulares de Google Noticias (medios españoles e internacionales), cada dos horas; los de lo tuyo, de tus posiciones y de lo que más pesa en tus fondos. Los resúmenes y el tono, de la IA. Las bolsas, con 15 minutos de retraso; lo que lleva un día al lado es su último cierre. Nada de esto es una recomendación.', 'Headlines from Google News (Spanish and international media), every two hours; yours, from your holdings. Summaries and tone, by the AI. Stocks delayed 15 minutes; a figure with a day next to it is its last close. None of this is a recommendation.')}</p>`;
}
function pintarNoticias() {
  const el = $('#panelNot'); if (!el || !S.M) return;
  if (S.notTema == null) S.notTema = LS.get('inv-not-tema', 'todo');
  // el escaneo (lo de cada empresa) no hace falta para abrir: se baja al entrar y se vuelve a pintar
  const id = S.precios && S.precios.escaneo_id;
  if ((!S.escaneo || S.escaneoId !== id) && S.ntEscPedido !== id) {
    S.ntEscPedido = id;
    escaneoDeCache().then(() => cargarEscaneo()).then(() => { if (S.vista === 'noticias' && $('#panelNot')) pintarNoticias(); }).catch(() => {});
  }
  el.innerHTML = htmlNoticiasPag(S.M);
  el.removeAttribute('aria-busy');
  marcarCifras(el);
}
document.addEventListener('click', (e) => {
  if (S.vista !== 'noticias') return;
  const t = e.target.closest('[data-nt-tema],[data-nt-mas],[data-nt-emp],[data-nt-tono]'); if (!t || !t.closest('#panelNot')) return;
  if (t.dataset.ntTema) { S.notTema = t.dataset.ntTema; S.notN = 30; LS.set('inv-not-tema', S.notTema); }
  else if (t.hasAttribute('data-nt-mas')) S.notN = (S.notN || 30) + 30;
  else if (t.hasAttribute('data-nt-emp')) S.notEmpN = (S.notEmpN || 8) + 12;
  else if (t.dataset.ntTono) { S.notEmpTono = t.dataset.ntTono; S.notEmpN = 8; }
  pintarNoticias();
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'ntBusca' || S.vista !== 'noticias') return;
  S.notBusca = e.target.value; S.notN = 30;
  const l = $('#ntLista'); if (l) l.innerHTML = htmlListaNt(S.M);
});
